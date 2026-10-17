"""
Quarter Turn: Bach's first Goldberg variation, measured once, in show time.

Quarter Turn plays Kimiko Ishizaka's recording of Variatio 1. a 1 Clav. from the Open Goldberg Variations (2012,
CC0, from Wikimedia Commons), whole, from its first sample, so show time is the recording's time. This reads the
show's own copy and the score:

    sh scripts/shows/goldberg-cue.sh
    curl -sL -o out/goldberg/bwv-988-v01.mid \\
        https://www.mutopiaproject.org/ftp/BachJS/BWV988/bwv-988-v01/bwv-988-v01.mid
    python3 scripts/shows/goldberg-onsets.py

and writes scripts/shows/plans/goldberg-onsets.json, which the show is timed to and check:shows holds it against. The
score (the Mutopia Project's engraving, as MIDI) is read only for where its notes fall; nothing of it ships. Needs
numpy, and ffmpeg (or FFMPEG=<path>) or, on a Mac, afconvert. GOLDBERG_AUDIO=<path> reads another copy.

The variation is 32 bars of 3/4 in two halves, each played twice (she takes both repeats): 64 bars, 192 quarters,
played steadily, a little held at the end of each half. The score is unrolled to that order and followed note by note
along the recording's attacks (`follow`): each note is looked for where the last bar's tempo says it falls.

What it writes:

- `beats`: every quarter, 1 to 192, in the order played: the clock the cubes step to;
- `bars`: the downbeat of every bar, 1 to 64 (bar 17 is bar 1 again, bar 33 is the written bar 17);
- `notes`: every onset in the unrolled score, with the right hand's top pitch and the left hand's lowest (MIDI
  numbers, or null), its `bar` (1 to 64) and `beat` (0 to 3, quarters), and whether it was found on its own attack;
- `form`: the halves and their phrases (`landmarks`, in seconds);
- `rms`: loudness every quarter second, 0 to 1 against the loudest.
"""
import json
import os
import shutil
import struct
import subprocess
import tempfile
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('GOLDBERG_AUDIO', os.path.join(ROOT, 'apps/rube/src/shows/versions/goldberg/bach-goldberg-1-ishizaka.mp3'))
SCORE = os.environ.get('GOLDBERG_SCORE', os.path.join(ROOT, 'out/goldberg/bwv-988-v01.mid'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/goldberg-onsets.json')
SR = 22050
BEATS = 3
WRITTEN = 32
# The order she plays the written bars in: each half twice.
ORDER = list(range(1, 17)) * 2 + list(range(17, 33)) * 2
BARS = len(ORDER)
# The first notes of the halves as played after the first (bars 17, 33, 49), in quarters: she breathes before them.
SEAMS = {16 * BEATS, 32 * BEATS, 48 * BEATS}


def load_audio(path):
    if shutil.which(FFMPEG):
        raw = subprocess.run([FFMPEG, '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        return np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    # No ffmpeg: a Mac's own decoder, which reads the file's encoder delay the same way.
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'x.wav')
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{SR}', '-c', '1', path, out], check=True)
        w = wave.open(out)
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768


def read_midi(path):
    """Note-ons as (quarter, pitch, length in quarters, track): a small reader for the one file."""
    data = open(path, 'rb').read()
    assert data[:4] == b'MThd'
    _, ntracks, tpq = struct.unpack('>HHH', data[8:14])
    pos = 14
    notes = []
    for track in range(ntracks):
        assert data[pos:pos + 4] == b'MTrk'
        end = pos + 8 + struct.unpack('>I', data[pos + 4:pos + 8])[0]
        pos += 8
        tick = 0
        status = 0
        held = {}

        def varlen():
            nonlocal pos
            v = 0
            while True:
                b = data[pos]
                pos += 1
                v = (v << 7) | (b & 0x7F)
                if b < 0x80:
                    return v

        while pos < end:
            tick += varlen()
            b = data[pos]
            if b >= 0x80:
                status = b
                pos += 1
            if status == 0xFF:
                pos += 1
                skip = varlen()
                pos += skip
            elif status in (0xF0, 0xF7):
                skip = varlen()
                pos += skip
            else:
                kind = status & 0xF0
                if kind in (0xC0, 0xD0):
                    pos += 1
                    continue
                a, v = data[pos], data[pos + 1]
                pos += 2
                if kind == 0x90 and v > 0:
                    held.setdefault(a, []).append(tick)
                elif kind in (0x80, 0x90) and held.get(a):
                    s = held[a].pop(0)
                    notes.append((s / tpq, a, (tick - s) / tpq, track))
        pos = end
    notes.sort()
    return notes


def unroll(notes):
    """The written bars in the order played: (quarter played, pitch, length, track)."""
    out = []
    for i, written in enumerate(ORDER):
        q0 = (written - 1) * BEATS
        for b, p, d, track in notes:
            if q0 - 1e-6 <= b < q0 + BEATS - 1e-6:
                out.append((i * BEATS + (b - q0), p, d, track))
    out.sort()
    return out


def spectra(x, n, hop):
    frames = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(frames)[:, None]
    S = np.abs(np.fft.rfft(x[idx] * np.hanning(n), axis=1))
    return S, np.fft.rfftfreq(n, 1 / SR), np.arange(frames) * hop / SR + n / 2 / SR


def follow(order, at, strength):
    """
    Each score onset in turn onto an attack: where the tempo of the last bar's heard notes says it falls, the strongest
    attack near there (a sixteenth is about 145 ms, so the window is well inside one). At a half's first note, after
    her breath between the halves, the first clear attack past where it was due. A note with no attack near it keeps
    its predicted time and is marked unheard.
    """
    first = int(np.argmax(strength > 0.1 * strength.max()))
    seen = [(order[0], float(at[first]))]
    placed = {order[0]: (float(at[first]), True)}
    period = 0.58
    tempi = []
    since = order[0]
    for q in order[1:]:
        if q in SEAMS:
            # A new half: back to the tempo the last one kept, and nothing before the breath counts towards it.
            period = float(np.median(tempi)) if tempi else period
            since = q
        recent = [(a, b) for a, b in seen if a >= max(since, seen[-1][0] - 3)]
        if len(recent) >= 4:
            period = float(np.clip(np.polyfit([a for a, _ in recent], [b for _, b in recent], 1)[0], 0.4, 1.4))
            tempi.append(period)
        q0, t0 = seen[-1]
        est = t0 + (q - q0) * period
        gap = (q - q0) * period
        w = min(0.07, 0.45 * gap)
        after = at > t0 + 0.04
        if q in SEAMS or q >= BARS * BEATS - 3:
            # A breath or a held close: the first clear attack from just before it was due to well after.
            loud = 0.3 * np.median([strength[np.argmin(np.abs(at - b))] for _, b in seen[-12:]])
            near = np.where(after & (at > est - w) & (at < est + 1.5) & (strength > loud))[0]
            pick = near[0] if len(near) else None
        else:
            near = np.where(after & (np.abs(at - est) < w))[0]
            pick = near[np.argmax(strength[near] / strength[near].max() - np.abs(at[near] - est) / w * 0.5)] if len(near) else None
        if pick is None:
            placed[q] = (est, False)
        else:
            placed[q] = (float(at[pick]), True)
            seen.append((q, float(at[pick])))
    return placed


def attacks(x):
    """Every attack: a peak of spectral flux over its local mean, moved back onto the attack's start."""
    S, f, ft = spectra(x, 2048, 128)
    lS = np.log1p(1000 * S[:, (f > 40) & (f < 6000)])
    flux = np.concatenate([[0], np.maximum(0, np.diff(lS, axis=0)).sum(1)])
    w = int(SR / 128)
    kernel = np.ones(2 * w) / (2 * w)
    nov = np.maximum(0, flux - np.convolve(flux, kernel, 'same'))
    peak = np.zeros_like(nov, dtype=bool)
    peak[3:-3] = (nov[3:-3] > 0) & (nov[3:-3] >= np.max(np.stack([np.roll(nov, s)[3:-3] for s in range(-3, 4)]), axis=0))
    i = np.where(peak)[0]
    return ft[i] - 0.012, nov[i]


def main():
    x = load_audio(AUDIO)
    duration = len(x) / SR
    notes = unroll(read_midi(SCORE))
    at, strength = attacks(x)

    onsets = {}
    for b, p, _, track in notes:
        key = round(b, 4)
        o = onsets.setdefault(key, {'rh': None, 'lh': None})
        hand = 'rh' if track == 1 else 'lh'
        o[hand] = p if o[hand] is None else (max(o[hand], p) if hand == 'rh' else min(o[hand], p))
    placed = follow(sorted(onsets), at, strength)
    out = []
    for q in sorted(onsets):
        t, heard = placed[q]
        out.append({'t': t, 'q': q, 'bar': int(q // BEATS) + 1, 'beat': round(q % BEATS, 4), 'rh': onsets[q]['rh'], 'lh': onsets[q]['lh'], 'heard': heard})

    def onset_at(q):
        for o in out:
            if abs(o['q'] - q) < 1e-6:
                return o['t']
        return None

    # Every quarter has a note in this variation.
    beats = [round(onset_at(k), 3) for k in range(BARS * BEATS)]
    bars = beats[::BEATS]

    S, f, ft = spectra(x, 2048, 512)
    r = np.sqrt((S ** 2).mean(1))
    rms = [round(float(v), 3) for v in np.interp(np.arange(0, duration, 0.25), ft, r / r.max())]

    # The halves and their four-bar phrases, as played.
    form = {'a1': bars[0], 'a2': bars[16], 'b1': bars[32], 'b2': bars[48], 'last': bars[63], 'end': round(duration, 3)}
    # The last note's end: the final chord, held, and how long it sounds (loudness down to a fiftieth of the loudest).
    tail = next((i * 0.25 for i in range(len(rms) - 1, 0, -1) if rms[i] > 0.02), duration)
    form['quiet'] = round(tail, 3)

    with open(OUT, 'w') as fh:
        json.dump({
            'recording': 'Kimiko Ishizaka, J.S. Bach: Goldberg Variations, BWV 988, Variatio 1 a 1 Clav. (Open Goldberg Variations, 2012), CC0, via Wikimedia Commons',
            'duration': round(duration, 3),
            'beats': beats,
            'bars': bars,
            'form': form,
            'notes': [{k: (round(v, 3) if k == 't' else v) for k, v in o.items() if k != 'q'} for o in out],
            'rms': rms,
        }, fh, separators=(',', ':'))
    heard = sum(o['heard'] for o in out)
    gaps = np.diff(beats)
    print(f'{len(out)} onsets ({heard} on their own attack), {len(beats)} beats, bars {bars[0]}..{bars[-1]} s, {duration:.2f} s')
    print(f'beat: median {np.median(gaps):.3f} s, min {gaps.min():.3f}, max {gaps.max():.3f}; form {form}')


if __name__ == '__main__':
    main()

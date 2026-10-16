"""
Raindrop: Chopin's "Raindrop" Prelude, measured once, in show time.

Raindrop plays Ivan Ilić's recording of the Prelude in D-flat major, Op. 28 No. 15 (Paris, 2005; CC BY 3.0, from
Wikimedia Commons), whole, from its first sample, so show time is the recording's time. This reads the show's own
copy and the score:

    sh scripts/shows/raindrop-cue.sh
    curl -sL -o out/raindrop/Chop-28-15.mid \\
        https://www.mutopiaproject.org/ftp/ChopinFF/O28/Chop-28-15/Chop-28-15.mid
    python3 scripts/shows/raindrop-onsets.py

and writes scripts/shows/plans/raindrop-onsets.json, which the show is timed to and check:shows holds it against. The
score (the Mutopia Project's engraving of the 1839 text, as MIDI) is read only for where its notes fall; nothing of it
ships. Needs ffmpeg (or FFMPEG=<path>) and numpy. RAINDROP_AUDIO=<path> reads another copy of the recording.

The prelude is 89 bars of common time with an A-flat (G-sharp in the middle) struck on every eighth from the first
bar to the last, but for a bar and a half near the end where it stops. It is played freely, so there is no comb: the
score is laid on the recording by dynamic time warping (chroma, and where notes start), and every note it places is
then moved onto its own attack where one is within 90 ms. The few places the warp cannot see (the run in bar 79, the
held melody of bars 81 to 83, the last two bars, which slow to a stop) are set by hand from the attacks themselves,
each named below with its pitch.

What it writes:

- `bars`: the downbeat of every bar, 1 to 89 (bar 82's, where nothing is struck, between its neighbours' notes);
- `pulse`: every eighth on which the repeated note sounds: the drip. `bar`, `eighth` (0 to 7), and `s`, how hard
  it is struck against the eighths round it;
- `notes`: every onset in the score, with the right hand's top pitch and the left hand's lowest (MIDI numbers, or
  null), its `bar` and `beat` (0 to 4, quarters), and whether it was found on its own attack (`heard`);
- `form`: the sections the show is cut to (`landmarks`, in seconds);
- `rms`: loudness every quarter second, 0 to 1 against the loudest.
"""
import json
import os
import struct
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('RAINDROP_AUDIO', os.path.join(ROOT, 'apps/rube/src/shows/versions/raindrop/chopin-raindrop-ilic.mp3'))
SCORE = os.environ.get('RAINDROP_SCORE', os.path.join(ROOT, 'out/raindrop/Chop-28-15.mid'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/raindrop-onsets.json')
SR = 22050
BARS = 89
# Runs too quick to hear note by note: every note between the two hand-set ends goes evenly by its place in the score.
RUNS = [((79, 3.099), (79, 3.8984))]

# Set by hand, from the attacks (seconds; what is heard there). The warp places the rest.
HAND = {
    # Bar 79's run: the notes before it, its first and its last; the eleven between are spread evenly (RUNS).
    (79, 2.5): 223.700,   # the pulse, soft under the D
    (79, 2.75): 223.828,  # D
    (79, 3.0): 223.973,   # E-flat over the pulse's A-flat
    (79, 3.099): 224.258,  # F: the run's first note
    (79, 3.8984): 225.779,  # G-flat: its last
    # Bar 80, the theme again after the run, held a little on its first beat.
    (80, 0.0): 226.121,  # F over D-flat
    (80, 0.5): 226.719,  # the pulse
    (80, 0.75): 226.893,  # D-flat
    (80, 1.0): 227.126,  # A-flat over D-flat
    (80, 2.0): 227.903,
    (80, 2.5): 228.234,
    (80, 3.0): 228.583,  # B-flat
    (80, 3.5): 228.943,
    (81, 0.0): 229.320,  # C
    # Bar 81 from its third beat: the pulse stops, and the melody comes down alone over the held pedal.
    (81, 3.0): 232.466,  # B-flat, high: the pulse's last note has gone
    (82, 1.0): 234.568,  # A-flat
    (82, 2.0): 235.311,  # G-flat
    (82, 3.0): 236.135,  # C
    (83, 0.0): 236.820,  # F
    (83, 1.0): 237.737,  # E-flat
    (83, 2.0): 238.405,  # D-flat
    (83, 3.0): 239.183,  # B-flat
    (84, 0.0): 240.245,  # G-flat over the pulse, which is back
    # The last two bars, slowing to the chord.
    (88, 0.0): 252.058,
    (88, 0.5): 252.441,
    (88, 1.0): 252.807,
    (88, 1.5): 253.167,
    (88, 2.0): 253.585,
    (88, 2.5): 253.985,
    (88, 3.0): 254.450,
    (88, 3.5): 255.001,
    (89, 0.0): 255.814,  # the last chord, D-flat
}


def load_audio(path):
    raw = subprocess.run([FFMPEG, '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


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
            delta = varlen()
            tick += delta
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


def spectra(x, n, hop):
    frames = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(frames)[:, None]
    S = np.abs(np.fft.rfft(x[idx] * np.hanning(n), axis=1))
    return S, np.fft.rfftfreq(n, 1 / SR), np.arange(frames) * hop / SR + n / 2 / SR


def warp(x, notes):
    """Score quarters to recording seconds, by dynamic time warping on chroma and onsets."""
    S, f, ft = spectra(x, 4096, 1024)
    band = (f > 60) & (f < 2100)
    pc = np.round(69 + 12 * np.log2(np.maximum(f, 1) / 440)).astype(int) % 12
    logS = np.log1p(100 * S)
    C = np.stack([logS[:, band & (pc == k)].sum(1) for k in range(12)], 1)
    C /= np.linalg.norm(C, axis=1, keepdims=True) + 1e-9
    lS = np.log1p(1000 * S[:, (f > 30) & (f < 8000)])
    flux = np.concatenate([[0], np.maximum(0, np.diff(lS, axis=0)).sum(1)])
    flux = np.clip(flux / (np.percentile(flux, 98) + 1e-9), 0, 1.5)
    per = 16
    n = BARS * 4 * per + 1
    SC = np.zeros((n, 12))
    SO = np.zeros(n)
    for b, p, d, _ in notes:
        i0 = int(round(b * per))
        i1 = max(i0 + 1, int(round((b + d) * per)))
        for i in range(i0, min(i1, n)):
            SC[i, p % 12] += np.exp(-(i - i0) / per)
        SO[min(i0, n - 1)] += 1
    SC /= np.linalg.norm(SC, axis=1, keepdims=True) + 1e-9
    k5 = [0.25, 0.5, 1, 0.5, 0.25]
    SO = np.convolve(SO, k5, 'same')
    SO = np.clip(SO / np.percentile(SO[SO > 0], 80), 0, 1.5)
    on = np.where(flux > 0.3)[0]
    a0, a1 = on[0] - 1, on[-1]
    Ca, Fa = C[a0:a1 + 1], np.convolve(flux[a0:a1 + 1], k5, 'same')
    m = len(Ca)
    with np.errstate(all='ignore'):  # Accelerate's matmul warns of overflows it does not make
        D = (1 - SC @ Ca.T) + 0.4 * np.abs(SO[:, None] - Fa[None, :])
    big = 1e18
    acc = np.full((n, m), big)
    back = np.zeros((n, m), dtype=np.int8)
    acc[0, 0] = D[0, 0]
    steps = [(1, 1), (1, 2), (2, 1), (1, 3), (3, 1)]
    for i in range(1, n):
        best = np.full(m, big)
        arg = np.zeros(m, dtype=np.int8)
        for s, (di, dj) in enumerate(steps):
            if i - di < 0:
                continue
            prev = np.full(m, big)
            prev[dj:] = acc[i - di, :m - dj] if dj else acc[i - di]
            cand = prev + (1.0 if s == 0 else 1.15) * D[i] * max(di, dj)
            better = cand < best
            best[better] = cand[better]
            arg[better] = s
        acc[i] = best
        back[i] = arg
    i, j = n - 1, m - 1 - int(np.argmin(acc[n - 1, ::-1][:60]))
    path = [(i, j)]
    while i > 0:
        di, dj = steps[back[i, j]]
        i, j = i - di, j - dj
        if j < 0:
            break
        path.append((i, j))
    path.reverse()
    pi = np.array([p[0] for p in path]) / per
    pt = ft[a0 + np.array([p[1] for p in path])]
    return lambda q: float(np.interp(q, pi, pt))


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
    notes = read_midi(SCORE)
    when = warp(x, notes)
    at, strength = attacks(x)

    # Every distinct onset in the score, with the right hand's top note and the left hand's lowest.
    onsets = {}
    for b, p, _, track in notes:
        key = round(b, 4)
        o = onsets.setdefault(key, {'rh': None, 'lh': None})
        hand = 'rh' if track == 1 else 'lh'
        o[hand] = p if o[hand] is None else (max(o[hand], p) if hand == 'rh' else min(o[hand], p))
    out = []
    for q in sorted(onsets):
        bar, beat = int(q // 4) + 1, round(q % 4, 4)
        est = when(q)
        hand = HAND.get((bar, beat))
        if hand is not None:
            t, heard = hand, True
        else:
            near = np.where(np.abs(at - est) < 0.09)[0]
            if len(near):
                score = strength[near] / strength[near].max() - np.abs(at[near] - est) / 0.09 * 0.5
                t, heard = float(at[near[np.argmax(score)]]), True
            else:
                t, heard = est, False
        out.append({'t': t, 'bar': bar, 'beat': beat, 'rh': onsets[q]['rh'], 'lh': onsets[q]['lh'], 'heard': heard})
    # Between the hand-set points, an onset the warp placed is kept in order: a run's notes are spread evenly
    # between the attacks round them rather than piled on one.
    fixed = [i for i, o in enumerate(out) if (o['bar'], o['beat']) in HAND]
    for a, b in zip(fixed, fixed[1:]):
        if b - a > 1:
            ta, tb = out[a]['t'], out[b]['t']
            qa, qb = (out[a]['bar'] - 1) * 4 + out[a]['beat'], (out[b]['bar'] - 1) * 4 + out[b]['beat']
            for i in range(a + 1, b):
                q = (out[i]['bar'] - 1) * 4 + out[i]['beat']
                if not (ta < out[i]['t'] < tb):
                    out[i]['t'] = ta + (tb - ta) * (q - qa) / (qb - qa)
                    out[i]['heard'] = False
    for (ba, qa_), (bb, qb_) in RUNS:
        qa, qb = (ba - 1) * 4 + qa_, (bb - 1) * 4 + qb_
        ta, tb = HAND[(ba, qa_)], HAND[(bb, qb_)]
        for o in out:
            q = (o['bar'] - 1) * 4 + o['beat']
            if qa < q < qb:
                o['t'] = ta + (tb - ta) * (q - qa) / (qb - qa)
                o['heard'] = False
    for i in range(1, len(out)):
        if out[i]['t'] <= out[i - 1]['t'] + 0.02:
            out[i]['t'] = out[i - 1]['t'] + 0.02
            out[i]['heard'] = False

    def onset_at(bar, beat):
        for o in out:
            if o['bar'] == bar and abs(o['beat'] - beat) < 1e-6:
                return o['t']
        return None

    bars = []
    for bar in range(1, BARS + 1):
        t = onset_at(bar, 0.0)
        bars.append(round(t if t is not None else when((bar - 1) * 4), 3))

    # The pulse: every eighth with a note on it, in the bars it sounds (it stops after bar 81's sixth eighth, and is
    # back on bar 84).
    def stops(o):
        q = (o['bar'] - 1) * 4 + o['beat']
        return 80 * 4 + 3 <= q < 83 * 4

    pulse = [o for o in out if abs(o['beat'] * 2 - round(o['beat'] * 2)) < 1e-6 and not stops(o)]
    # An eighth snapped onto a neighbour's attack (a melody note's, close by) leaves a gap of a third of its fellows'
    # beside it: it goes back between its neighbours, onto an attack there if there is one.
    for _ in range(3):
        for i in range(1, len(pulse) - 1):
            o, a, b = pulse[i], pulse[i - 1], pulse[i + 1]
            if (o['bar'], o['beat']) in HAND or b['t'] - a['t'] > 1.2:
                continue
            gap = min(o['t'] - a['t'], b['t'] - o['t'])
            if gap < 0.6 * (b['t'] - a['t']) / 2:
                mid = (a['t'] + b['t']) / 2
                near = np.where(np.abs(at - mid) < 0.05)[0]
                o['t'] = float(at[near[np.argmax(strength[near])]]) if len(near) else mid
                o['heard'] = bool(len(near))
    ts = np.array([o['t'] for o in pulse])
    hard = np.array([float(np.max(strength[np.abs(at - t) < 0.03], initial=0)) for t in ts])
    local = np.array([np.median(hard[max(0, i - 8):i + 9]) + 1e-9 for i in range(len(hard))])
    pulse_out = [{'t': round(float(t), 3), 'bar': o['bar'], 'eighth': int(round(o['beat'] * 2)), 's': round(float(h / l), 2)}
                 for t, o, h, l in zip(ts, pulse, hard, local)]

    S, f, ft = spectra(x, 2048, 512)
    r = np.sqrt((S ** 2).mean(1))
    rms = [round(float(v), 3) for v in np.interp(np.arange(0, duration, 0.25), ft, r / r.max())]

    form = {
        'theme': bars[0],                # D-flat: the theme
        'minor': bars[8],                # bar 9: B-flat minor, the first turn away
        'return': bars[19],              # bar 20: the theme again
        'codetta': bars[26],             # bar 27: the pulse alone
        'chorale': bars[27],             # bar 28: C-sharp minor, sotto voce
        'rise1': bars[34],               # bar 35: the pulse up an octave, crescendo
        'peak1': bars[39],               # bar 40: fortissimo
        'chorale2': bars[43],            # bar 44
        'rise2': bars[50],               # bar 51
        'peak2': bars[55],               # bar 56: fortissimo again
        'major': bars[59],               # bar 60: the melody over the pulse, in E
        'toll': bars[63],                # bar 64: the pulse in octaves
        'major2': bars[67],              # bar 68
        'fade': bars[71],                # bar 72: the storm going over
        'home': bars[75],                # bar 76: D-flat, the theme
        'run': onset_at(79, 3.099),      # bar 79's run
        'again': bars[79],               # bar 80
        'still': onset_at(81, 3.0),      # the pulse has stopped: the high B-flat
        'drips': bars[83],               # bar 84: the pulse back
        'last': bars[88],                # bar 89: the last chord
        'end': round(duration, 3),
    }

    with open(OUT, 'w') as fh:
        json.dump({
            'recording': 'Ivan Ilić, Chopin: Prelude in D-flat major, Op. 28 No. 15 (Paris, 2005), CC BY 3.0, via Wikimedia Commons',
            'duration': round(duration, 3),
            'bars': bars,
            'form': {k: round(v, 3) for k, v in form.items()},
            'pulse': pulse_out,
            'notes': [{**o, 't': round(o['t'], 3)} for o in out],
            'rms': rms,
        }, fh, separators=(',', ':'))
    heard = sum(o['heard'] for o in out)
    print(f'{len(out)} onsets ({heard} on their own attack), {len(pulse_out)} drips, bars {bars[0]}..{bars[-1]} s, {duration:.2f} s')


if __name__ == '__main__':
    main()

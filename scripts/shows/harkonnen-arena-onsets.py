"""
Maker: the clock of Hans Zimmer's "Harkonnen Arena", measured once, in show time.

Maker plays "Harkonnen Arena" from Dune: Part Two (Original Motion Picture Soundtrack, WaterTower Music, 2024) from the
label's own upload to YouTube (UdlvgIFdNZU, on WaterTower Music's channel), from the video's first second, so show time
is the video's time. Nothing of the recording is shipped. This reads a local analysis copy that never leaves the
machine it is made on:

    yt-dlp --js-runtimes node -f 'bestaudio[ext=m4a]' -o out/dune/UdlvgIFdNZU.m4a \\
        'https://www.youtube.com/watch?v=UdlvgIFdNZU'
    /usr/bin/python3 scripts/shows/harkonnen-arena-onsets.py

and writes scripts/shows/plans/harkonnen-arena-onsets.json, which the show is timed to and check:shows holds it
against. Needs ffmpeg (or FFMPEG=<path>) and numpy. ARENA_AUDIO=<path> reads another copy.

The cue is 5:22 of drums and chant, loud nearly throughout, with one dead silence in the middle:

- `chant`    0 to 27.9: the voices and the drone alone, no blows;
- `booms`    27.9 to 44.5: a blow every 3.33 s on a slow pulse (1.666 s);
- `phrases`  44.5 to 104.2: a great blow every 13.6 s (44.5, 58.1, 71.7, 85.3, 97.5) over a slower drum (1.045 s);
- `drive`    104.2 to 127.5: a beat arrives, 95 a minute (0.633 s);
- `run`      127.5 to 164.6: harder, 100 a minute (0.598 s), the steadiest stretch of the cue;
- `fall`     164.6 to 184.3: everything goes down to nothing; silence from about 178;
- `return`   184.3 to 197.9: it comes back, low;
- `blows`    197.9 to 262.8: free, with the two hardest blows of the cue (198.0, 202.15);
- `charge`   262.8 to 314.0: the beat again, quickening from 102 to 108 a minute;
- `end`      314.0 to the end (322.2): the last chord dying.

Where the beat holds (`drive`, `run`, `charge`, and the slow pulses under `booms` and `phrases`) a comb is tracked
beat by beat: its period read from the attacks round it, each beat moved onto its own attack where one is within
40 ms. Everywhere else the show is timed to the onsets themselves.

What it measures:

- `combs`: by name, each a list of beats, `t` (on its own attack where it has one), `onset` (it has), `s` (how hard,
  against the beats round it) and `n` (its number from the comb's first, 0); with the comb's `from`, `to` and the
  period it started and ended at.
- `onsets`: every onset, a peak of spectral flux over its local median, with `s`, its strength against the 90th
  percentile of the onsets within ten seconds of it, `g`, against the 90th percentile of the whole cue (the two
  hardest blows are over 4), and the stretch it is in.
- `stretches` and `landmarks`: the moments the story is cut to.
- `rms`: loudness every quarter second, 0 to 1 against the cue's loudest.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('ARENA_AUDIO', os.path.join(ROOT, 'out/dune/UdlvgIFdNZU.m4a'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/harkonnen-arena-onsets.json')
SR = 22050
HOP = 128
WIN = 1024

STRETCHES = [
    ('chant', 0.0, 27.9),
    ('booms', 27.9, 44.5),
    ('phrases', 44.5, 104.2),
    ('drive', 104.2, 127.5),
    ('run', 127.5, 164.6),
    ('fall', 164.6, 184.3),
    ('return', 184.3, 197.9),
    ('blows', 197.9, 262.8),
    ('charge', 262.8, 314.0),
    ('end', 314.0, None),
]

# The combs: a name, the period near its start, the search window for the period, and its stretches, each from, to and
# the beat it is anchored on. The charge quickens, and a comb carried on from its first half drifts a quarter of a beat
# by its peak, so its second half is anchored on a blow of its own.
COMBS = [
    ('booms', 1.666, (1.5, 1.85), [(20.0, 44.6, 29.536)]),
    ('phrases', 1.045, (0.95, 1.15), [(55.5, 84.5, 58.131)]),
    ('drive', 0.633, (0.58, 0.69), [(104.0, 127.6, 110.533)]),
    ('run', 0.598, (0.56, 0.64), [(127.6, 164.7, 134.084)]),
    ('charge', 0.587, (0.53, 0.63), [(263.5, 288.2, 272.788), (288.2, 313.2, 292.531)]),
]


def decode():
    raw = subprocess.run([FFMPEG, '-v', 'error', '-i', AUDIO, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], check=True,
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def spectra(x):
    frames = (len(x) - WIN) // HOP
    idx = np.arange(WIN)[None, :] + HOP * np.arange(frames)[:, None]
    S = np.abs(np.fft.rfft(x[idx] * np.hanning(WIN), axis=1))
    t = (np.arange(frames) * HOP + WIN / 2) / SR
    return t, S, np.fft.rfftfreq(WIN, 1 / SR)


def flux(S, freqs, lo=30, hi=8000):
    m = (freqs >= lo) & (freqs < hi)
    L = np.log1p(S[:, m] * 20)
    return np.concatenate([[0], np.maximum(0, np.diff(L, axis=0)).sum(1)])


def running_median(v, width):
    h = width // 2
    out = np.empty_like(v)
    for i in range(len(v)):
        out[i] = np.median(v[max(0, i - h):i + h + 1])
    return out


def stretch_of(t):
    for name, a, b in STRETCHES:
        if t >= a and (b is None or t < b):
            return name
    return STRETCHES[-1][0]


def local_period(F, fps, at, lo, hi, span=6.0):
    """The beat's period round `at`: the strongest lag of the flux's autocorrelation between `lo` and `hi` seconds."""
    a = max(0, int((at - span / 2) * fps))
    b = min(len(F), int((at + span / 2) * fps))
    seg = F[a:b] - np.convolve(F[a:b], np.ones(int(fps)) / int(fps), 'same')
    ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
    ac = ac / max(ac[0], 1e-9)
    i0 = int(lo * fps)
    i1 = min(len(ac) - 2, int(hi * fps))
    i = i0 + int(np.argmax(ac[i0:i1]))
    y0, y1, y2 = ac[i - 1], ac[i], ac[i + 1]
    d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2) if (y0 - 2 * y1 + y2) != 0 else 0.0
    return (i + d) / fps


def main():
    x = decode()
    duration = len(x) / SR
    t, S, freqs = spectra(x)
    fps = SR / HOP
    F = flux(S, freqs)
    # Onsets: peaks of flux over its 2 s running median, at least 120 ms apart.
    base = running_median(F[::4], int(2 * fps / 4) | 1).repeat(4)[:len(F)]
    if len(base) < len(F):
        base = np.concatenate([base, np.full(len(F) - len(base), base[-1])])
    nov = np.maximum(0, F - base)
    w = int(0.12 * fps)
    peaks = [i for i in range(w, len(nov) - w) if nov[i] > 0 and nov[i] == nov[i - w:i + w + 1].max()]
    pt = t[peaks]
    pv = nov[peaks]
    floor = np.percentile(pv, 30)
    whole = np.percentile(pv, 90)
    onsets = []
    for j, i in enumerate(peaks):
        if pv[j] < floor:
            continue
        near = pv[(pt >= pt[j] - 10) & (pt < pt[j] + 10)]
        ref = max(np.percentile(near, 90), 1e-6)
        onsets.append({'t': round(float(pt[j]), 3), 's': round(float(min(2.0, pv[j] / ref)), 3),
                       'g': round(float(pv[j] / whole), 3), 'in': stretch_of(pt[j])})

    # The combs: from the anchor beat forwards and backwards, a beat at a time, each period read locally, each beat
    # moved onto its own attack where one is within 40 ms; the comb itself is carried on half way to the attack, so one
    # stray onset does not pull the rest after it.
    combs = {}
    for name, p0, (lo, hi), parts in COMBS:
        ts = []
        for c0, c1, anchor in parts:
            for direction in (1, -1):
                c = anchor
                while c0 <= c < c1:
                    m = (pt >= c - 0.04) & (pt <= c + 0.04)
                    if m.any():
                        k = int(np.argmax(np.where(m, pv, -1)))
                        bt, own = float(pt[k]), True
                        c = 0.5 * (c + bt)
                    else:
                        bt, own = c, False
                    ts.append((bt, own))
                    period = local_period(F, fps, c, lo, hi)
                    if abs(period - p0) > 0.12 * p0:
                        period = p0
                    c += direction * period
        # The anchor is reached from both sides, and two stretches meet: one beat where two fall together.
        kept = []
        for bt, own in sorted(set(ts)):
            if kept and bt - kept[-1][0] < 0.6 * p0:
                continue
            kept.append((bt, own))
        ts = kept
        beats = []
        for bt, own in ts:
            i = int(np.clip(np.searchsorted(t, bt), 0, len(nov) - 1))
            beats.append({'t': round(bt, 3), 'onset': own, 'v': float(nov[max(0, i - 3):i + 4].max())})
        vs = np.array([b['v'] for b in beats])
        for j, b in enumerate(beats):
            near = vs[max(0, j - 12):j + 13]
            b['s'] = round(float(min(2.0, b.pop('v') / max(np.percentile(near, 90), 1e-6))), 3)
            b['n'] = j
        gaps = np.diff([b['t'] for b in beats])
        combs[name] = {
            'from': parts[0][0], 'to': parts[-1][1],
            'start_period': round(float(np.median(gaps[:8])), 4), 'end_period': round(float(np.median(gaps[-8:])), 4),
            'beats': beats,
        }

    # Loudness every quarter second.
    q = int(0.25 * SR)
    rms = np.array([np.sqrt(np.mean(x[i:i + q] ** 2)) for i in range(0, len(x) - q, q)])
    rms = rms / rms.max()

    def attack(a, b):
        """The strongest onset between a and b."""
        cand = [o for o in onsets if a <= o['t'] <= b]
        return max(cand, key=lambda o: o['g'])['t'] if cand else round((a + b) / 2, 3)

    landmarks = {
        'first_boom': attack(27.6, 28.1),
        'phrase1': attack(44.3, 44.8),
        'phrase2': attack(57.9, 58.4),
        'phrase3': attack(71.5, 72.0),
        'phrase4': attack(85.1, 85.6),
        'phrase5': attack(97.2, 97.7),
        'drive': attack(104.0, 104.5),
        'run': attack(127.9, 128.4),
        'fall': 164.6,
        'silence': 178.0,
        'return': attack(184.0, 186.5),
        'blow1': attack(197.8, 198.2),
        'blow2': attack(201.9, 202.4),
        'charge': attack(262.6, 263.1),
        'peak': attack(288.2, 288.8),
        'end': 314.0,
    }

    out = {
        'youtube': 'UdlvgIFdNZU',
        'duration': round(duration, 3),
        'stretches': [{'name': n, 'from': a, 'to': b if b is not None else round(duration, 3)} for n, a, b in STRETCHES],
        'landmarks': landmarks,
        'combs': combs,
        'onsets': onsets,
        'rms_step': 0.25,
        'rms': [round(float(v), 3) for v in rms],
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f'{OUT}: {len(onsets)} onsets, ' + ', '.join(f'{n} {len(c["beats"])} beats ({c["start_period"]}→{c["end_period"]})' for n, c in combs.items()))
    for k, v in landmarks.items():
        print(f'  {k:>12} {v}')


if __name__ == '__main__':
    main()

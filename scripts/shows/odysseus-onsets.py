"""
Nostos: the clock of Ludwig Göransson's "Odysseus", measured once, in show time.

Nostos plays "Odysseus" from The Odyssey (Original Motion Picture Soundtrack, Back Lot Music, 2026) from the label's
own upload to YouTube (WCxx_OVOVUw, "Provided to YouTube by Back Lot Music"), from the video's first second, so show
time is the video's time. Nothing of the recording is shipped. This reads a local analysis copy that never leaves the
machine it is made on:

    yt-dlp --js-runtimes node -f 'bestaudio[ext=m4a]' -o out/odyssey/WCxx_OVOVUw.m4a \\
        'https://www.youtube.com/watch?v=WCxx_OVOVUw'
    /usr/bin/python3 scripts/shows/odysseus-onsets.py

and writes scripts/shows/plans/odysseus-onsets.json, which the show is timed to and check:shows holds it against.
Needs ffmpeg (or FFMPEG=<path>) and numpy. ODYSSEUS_AUDIO=<path> reads another copy.

The cue is 8:41 of one theme in C minor, a lament over a drone, grown from a single voice to everything and back:

- `theme`   0 to 72: the theme alone over the drone, twice (the second statement from 36), no low voices;
- `answer`  72 to 151.2: the theme answered, fuller and higher, with two held breaths (about 99.5 and 119.3);
- `ground`  151.2 to 187.2: the low voices come in under it, and swell (about 170);
- `pulse`   187.2 to 222.4: a beat arrives, 80 a minute, and everything climbs on it;
- `tutti`   222.4 to 304.6: everything, on the beat, the loudest stretch, cut off at 304.6;
- `after`   304.6 to 351: what is left after the cut; the low voices back at 323 and gone again at 342;
- `hush`    351 to 353.5: very nearly silence;
- `rise`    353.5 to 395.4: the theme again from almost nothing, building;
- `return`  395.4 to 431.5: everything again, without the beat;
- `quiet`   431.5 to 494.6: the low voices gone, the high ones slowly climbing, a breath at 494.4;
- `last`    494.6 to 512.8: the last swell;
- `fade`    512.8 to the end (521.46).

The beat is only steady through `pulse` and `tutti` (a comb fitted there stays within a few tens of ms of the attacks;
anywhere else the playing is free), so there is one comb, 0.7501 s, from 188.35: every beat of it from the pulse's
entry to the cut, each moved onto its own attack where one is within 40 ms. Its phrases are twelve beats (9 s), the
first from 188.35.

What it measures:

- `beats`: the comb's beats, each with `onset` (it has its own attack), `s` (how hard, against the beats round it)
  and `n` (its number from the first, 0), and `phrase`, `pos` (its phrase and its place in it, 0 to 11).
- `onsets`: every onset, a peak of spectral flux over its local median, with its strength `s` against the 90th
  percentile of the onsets within ten seconds of it, and the stretch it is in.
- `stretches` and `landmarks`: the moments the story is cut to.
- `rms`: loudness every quarter second, 0 to 1 against the cue's loudest.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('ODYSSEUS_AUDIO', os.path.join(ROOT, 'out/odyssey/WCxx_OVOVUw.m4a'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/odysseus-onsets.json')
SR = 22050
HOP = 128
WIN = 1024

PERIOD = 0.7501
COMB_AT = 188.35
COMB_FROM = 187.2
COMB_TO = 304.7

STRETCHES = [
    ('theme', 0.0, 72.0),
    ('answer', 72.0, 151.2),
    ('ground', 151.2, 187.2),
    ('pulse', 187.2, 222.4),
    ('tutti', 222.4, 304.6),
    ('after', 304.6, 351.0),
    ('hush', 351.0, 353.5),
    ('rise', 353.5, 395.4),
    ('return', 395.4, 431.5),
    ('quiet', 431.5, 494.6),
    ('last', 494.6, 512.8),
    ('fade', 512.8, None),
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
    onsets = []
    for j, i in enumerate(peaks):
        if pv[j] < floor:
            continue
        near = pv[(pt >= pt[j] - 10) & (pt < pt[j] + 10)]
        ref = max(np.percentile(near, 90), 1e-6)
        onsets.append({'t': round(float(pt[j]), 3), 's': round(float(min(2.0, pv[j] / ref)), 3), 'in': stretch_of(pt[j])})

    # The comb: every beat from the pulse's entry to the cut, on its own attack where one is within 40 ms.
    beats = []
    n0 = int(np.ceil((COMB_FROM - COMB_AT) / PERIOD))
    n1 = int(np.floor((COMB_TO - COMB_AT) / PERIOD))
    for n in range(n0, n1 + 1):
        c = COMB_AT + n * PERIOD
        m = (pt >= c - 0.04) & (pt <= c + 0.04)
        if m.any():
            k = np.argmax(np.where(m, pv, -1))
            bt, own = float(pt[k]), True
        else:
            bt, own = c, False
        i = int(np.clip(np.searchsorted(t, bt), 0, len(nov) - 1))
        beats.append({'t': round(bt, 3), 'onset': own, 'v': float(nov[max(0, i - 3):i + 4].max()), 'n': n - n0})
    vs = np.array([b['v'] for b in beats])
    for j, b in enumerate(beats):
        near = vs[max(0, j - 12):j + 13]
        b['s'] = round(float(min(2.0, b.pop('v') / max(np.percentile(near, 90), 1e-6))), 3)
        k = round((b['t'] - COMB_AT) / PERIOD)
        b['phrase'] = int(k // 12)
        b['pos'] = int(k % 12)

    # Loudness every quarter second.
    q = int(0.25 * SR)
    rms = np.array([np.sqrt(np.mean(x[i:i + q] ** 2)) for i in range(0, len(x) - q, q)])
    rms = rms / rms.max()

    def attack(a, b):
        """The strongest onset between a and b."""
        cand = [o for o in onsets if a <= o['t'] <= b]
        return max(cand, key=lambda o: o['s'])['t'] if cand else round((a + b) / 2, 3)

    landmarks = {
        'second_statement': attack(35.5, 36.6),
        'answer': attack(71.0, 73.5),
        'breath1': 99.5,
        'breath2': 119.3,
        'ground': attack(150.9, 151.5),
        'swell': attack(168.5, 171.5),
        'pulse': attack(187.0, 187.5),
        'tutti': 222.4,
        'cut': attack(304.3, 304.8),
        'low_back': attack(322.8, 323.8),
        'low_gone': 342.0,
        'last_attack': attack(350.0, 350.7),
        'hush': 352.6,
        'return': attack(395.3, 395.7),
        'quiet': attack(431.3, 431.7),
        'breath3': 494.45,
        'last': attack(494.6, 494.9),
        'fade': 512.8,
    }

    out = {
        'youtube': 'WCxx_OVOVUw',
        'duration': round(duration, 3),
        'period': PERIOD,
        'comb': {'at': COMB_AT, 'from': COMB_FROM, 'to': COMB_TO},
        'stretches': [{'name': n, 'from': a, 'to': b if b is not None else round(duration, 3)} for n, a, b in STRETCHES],
        'landmarks': landmarks,
        'beats': beats,
        'onsets': onsets,
        'rms_step': 0.25,
        'rms': [round(float(v), 3) for v in rms],
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f'{OUT}: {len(onsets)} onsets, {len(beats)} beats ({sum(b["onset"] for b in beats)} on their own attack), '
          f'{duration:.3f} s')
    for k, v in landmarks.items():
        print(f'  {k:18s} {v}')


if __name__ == '__main__':
    main()

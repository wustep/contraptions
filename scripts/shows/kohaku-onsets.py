"""
Kohaku: the clock of Joe Hisaishi's "One Summer's Day", measured once, in show time.

Kohaku plays "One Summer's Day" (from Spirited Away) as Joe Hisaishi recorded it with the London Symphony Orchestra
for Melodyphony (2010), from the official upload on Joe Hisaishi's own channel (TK1Ij_-mank, Universal Music / Decca
Gold), from the video's first second, so show time is the video's time. Nothing of the recording is shipped. This
reads a local analysis copy that never leaves the machine it is made on:

    yt-dlp --js-runtimes node -f 'bestaudio[ext=m4a]' -o out/spirited/TK1Ij_-mank.m4a \\
        'https://www.youtube.com/watch?v=TK1Ij_-mank'
    /usr/bin/python3 scripts/shows/kohaku-onsets.py

and writes scripts/shows/plans/kohaku-onsets.json, which the show is timed to and check:shows holds it against.
Needs ffmpeg (or FFMPEG=<path>) and numpy. KOHAKU_AUDIO=<path> reads another copy.

The cue is four minutes of one theme in C major, played freely (no click: the eighths drift between about 0.35 and
0.41 s), from a piano alone to the whole orchestra and back, three times rising to the same cadence through A-flat
and B-flat:

- `intro`    0 to 20.6: four soft chords on the piano (about 2.0, 5.1, 8.3 and 10.0), then the strings breathe in;
- `theme`    20.6 to 44: the theme, quiet, over the piano's running eighths;
- `swell`    44 to 63.9: the orchestra takes it up;
- `crest`    63.9 to 80: the first climax, through A-flat and B-flat to C;
- `settle`   80 to 94: it comes down;
- `breath`   94 to 101.5: the first quiet;
- `rise`     101.5 to 116: the theme again, building;
- `height`   116 to 137.5: the second climax, the loudest so far (about 124);
- `high`     137.5 to 147.5: high and light, nothing under it;
- `low`      147.5 to 161.5: quiet, with a swell (about 157);
- `hush`     161.5 to 167.5: the deepest quiet of the middle;
- `return`   167.5 to 193.5: the theme once more, gathering;
- `summit`   193.5 to 205.5: the last climax, the cadence at its fullest (about 202);
- `home`     205.5 to 231.5: it winds down;
- `fade`     231.5 to the end (about 241).

What it measures:

- `onsets`: every onset, a peak of spectral flux over its local median, with its strength `s` against the 90th
  percentile of the onsets within eight seconds of it, and the stretch it is in.
- `beats`: the eighths, tracked through the rubato by dynamic programming over the flux (a period that follows the
  playing, re-estimated every two seconds), each moved onto its own attack where one is within 40 ms, with `s` (how
  hard, against the beats round it) and `onset` (whether it has its own attack). The free intro has none.
- `stretches` and `landmarks`: the moments the story is cut to.
- `rms`: loudness every quarter second, 0 to 1 against the cue's loudest.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('KOHAKU_AUDIO', os.path.join(ROOT, 'out/spirited/TK1Ij_-mank.m4a'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/kohaku-onsets.json')
SR = 22050
HOP = 128
WIN = 1024

STRETCHES = [
    ('intro', 0.0, 20.6),
    ('theme', 20.6, 44.0),
    ('swell', 44.0, 63.9),
    ('crest', 63.9, 80.0),
    ('settle', 80.0, 94.0),
    ('breath', 94.0, 101.5),
    ('rise', 101.5, 116.0),
    ('height', 116.0, 137.5),
    ('high', 137.5, 147.5),
    ('low', 147.5, 161.5),
    ('hush', 161.5, 167.5),
    ('return', 167.5, 193.5),
    ('summit', 193.5, 205.5),
    ('home', 205.5, 231.5),
    ('fade', 231.5, None),
]
# The eighths are tracked from the theme on; the intro is free.
BEATS_FROM = 20.4


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


def running_mean(v, width):
    return np.convolve(v, np.ones(width) / width, 'same')


def stretch_of(t):
    for name, a, b in STRETCHES:
        if t >= a and (b is None or t < b):
            return name
    return STRETCHES[-1][0]


def track(t, F, fps, start):
    """The eighths from `start`: a dynamic-programming beat tracker whose period follows the playing."""
    env = np.maximum(0, F - running_mean(F, int(1.0 * fps)))
    env /= np.sqrt(running_mean(env ** 2, int(6 * fps))) + 1e-9
    centres, periods = [], []
    for c in np.arange(6, t[-1] - 6, 2.0):
        a, b = int((c - 6) * fps), int((c + 6) * fps)
        e = env[a:b] - env[a:b].mean()
        ac = np.correlate(e, e, 'full')[len(e) - 1:]
        lo, hi = int(0.33 * fps), int(0.43 * fps)
        centres.append(c)
        periods.append((np.argmax(ac[lo:hi]) + lo) / fps)
    periods = np.array([np.median(periods[max(0, i - 2):i + 3]) for i in range(len(periods))])
    per = np.interp(t, centres, periods)
    i0 = int(np.searchsorted(t, start))
    n = len(t)
    score = env.copy()
    back = -np.ones(n, int)
    for i in range(i0, n):
        P = per[i] * fps
        lo, hi = int(i - 2 * P), int(i - P / 2)
        if lo < i0:
            continue
        js = np.arange(lo, hi)
        cand = score[js] - 100.0 * np.log((i - js) / P) ** 2
        k = int(np.argmax(cand))
        score[i] = env[i] + cand[k]
        back[i] = js[k]
    tail = int(2 * fps)
    end = int(np.argmax(score[n - tail:])) + n - tail
    out = [end]
    while back[out[-1]] >= 0:
        out.append(back[out[-1]])
    return t[np.array(out[::-1])]


def main():
    x = decode()
    duration = len(x) / SR
    t, S, freqs = spectra(x)
    fps = SR / HOP
    F = flux(S, freqs)
    # Onsets: peaks of flux over its 2 s running median, at least 100 ms apart.
    base = running_median(F[::4], int(2 * fps / 4) | 1).repeat(4)[:len(F)]
    if len(base) < len(F):
        base = np.concatenate([base, np.full(len(F) - len(base), base[-1])])
    nov = np.maximum(0, F - base)
    w = int(0.1 * fps)
    peaks = [i for i in range(w, len(nov) - w) if nov[i] > 0 and nov[i] == nov[i - w:i + w + 1].max()]
    pt = t[peaks]
    pv = nov[peaks]
    floor = np.percentile(pv, 25)
    onsets = []
    for j in range(len(peaks)):
        if pv[j] < floor:
            continue
        near = pv[(pt >= pt[j] - 8) & (pt < pt[j] + 8)]
        ref = max(np.percentile(near, 90), 1e-6)
        onsets.append({'t': round(float(pt[j]), 3), 's': round(float(min(3.0, pv[j] / ref)), 3), 'in': stretch_of(pt[j])})

    # The eighths, each on its own attack where one is within 40 ms.
    raw_beats = track(t, F, fps, BEATS_FROM)
    beats = []
    for n, c in enumerate(raw_beats):
        m = (pt >= c - 0.04) & (pt <= c + 0.04)
        if m.any():
            k = int(np.argmax(np.where(m, pv, -1)))
            bt, own = float(pt[k]), True
        else:
            bt, own = float(c), False
        i = int(np.clip(np.searchsorted(t, bt), 0, len(nov) - 1))
        beats.append({'t': round(bt, 3), 'onset': own, 'v': float(nov[max(0, i - 3):i + 4].max()), 'n': n})
    vs = np.array([b['v'] for b in beats])
    for j, b in enumerate(beats):
        near = vs[max(0, j - 16):j + 17]
        b['s'] = round(float(min(3.0, b.pop('v') / max(np.percentile(near, 90), 1e-6))), 3)

    # Loudness every quarter second, overall and in three bands (low under 250 Hz, middle, high over 2 kHz).
    q = int(0.25 * SR)
    rms = np.array([np.sqrt(np.mean(x[i:i + q] ** 2)) for i in range(0, len(x) - q, q)])
    rms = rms / rms.max()
    fq = t[1] - t[0]
    per_q = max(1, int(round(0.25 / fq)))

    def band(lo, hi):
        m = (freqs >= lo) & (freqs < hi)
        e = (S[:, m] ** 2).sum(1)
        v = np.array([np.sqrt(e[i:i + per_q].mean()) for i in range(0, len(e) - per_q, per_q)])
        return v / max(v.max(), 1e-9)

    def attack(a, b):
        """The strongest onset between a and b."""
        cand = [o for o in onsets if a <= o['t'] <= b]
        return max(cand, key=lambda o: o['s'])['t'] if cand else round((a + b) / 2, 3)

    landmarks = {
        'chord1': attack(1.8, 2.4),
        'chord2': attack(4.9, 5.4),
        'chord3': attack(8.1, 8.7),
        'chord4': attack(9.8, 10.2),
        'theme': attack(20.3, 20.9),
        'swell': attack(43.6, 44.6),
        'crest': attack(63.5, 64.4),
        'settle': 80.0,
        'breath': 94.0,
        'rise': attack(101.3, 102.3),
        'height': attack(115.6, 116.6),
        'peak': attack(123.3, 124.6),
        'high': attack(137.3, 138.3),
        'low': 147.5,
        'swell2': attack(156.8, 158.2),
        'hush': 161.5,
        'return': attack(167.3, 168.6),
        'summit': attack(193.3, 194.3),
        'cadence': attack(201.2, 202.4),
        'home': 205.5,
        'fade': 231.5,
    }

    out = {
        'youtube': 'TK1Ij_-mank',
        'duration': round(duration, 3),
        'stretches': [{'name': n, 'from': a, 'to': b if b is not None else round(duration, 3)} for n, a, b in STRETCHES],
        'landmarks': landmarks,
        'beats': beats,
        'onsets': onsets,
        'rms_step': 0.25,
        'rms': [round(float(v), 3) for v in rms],
        'low': [round(float(v), 3) for v in band(30, 250)],
        'mid': [round(float(v), 3) for v in band(250, 2000)],
        'high': [round(float(v), 3) for v in band(2000, 8000)],
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f'{OUT}: {len(onsets)} onsets, {len(beats)} eighths ({sum(b["onset"] for b in beats)} on their own attack), '
          f'{duration:.3f} s')
    for k, v in landmarks.items():
        print(f'  {k:10s} {v}')


if __name__ == '__main__':
    main()

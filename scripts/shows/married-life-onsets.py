"""
Married Life: the recording's clock, measured once, in show time.

The show plays apps/rube/src/shows/versions/married-life/married-life-demo.mp3 (demo only; see
apps/rube/src/shows/versions/married-life/ATTRIBUTION.txt) from its first sample, so show time is
the recording's time. This reads it and writes scripts/shows/plans/married-life-onsets.json,
which the parts are timed to and check:shows holds them against. Rerun only if the file changes:

    python3 scripts/shows/married-life-onsets.py

Needs ffmpeg and numpy. Michael Giacchino's cue is a waltz that is played the way a life is
lived: it slows, stops, starts again at another pace, and ends on a piano alone. So there is
no one comb. What it measures:

- `onsets`: every onset, a peak of spectral flux over its local mean, with how strong it is
  (`s`, 1 is the 95th percentile of the peaks of its own stretch, so a quiet stretch's notes
  count as much in it as a loud one's do in theirs).
- `beats`: the pulse, tracked beat by beat (a dynamic-programming tracker whose tempo is
  allowed to drift, since the waltz ritards at the ends of its phrases and speeds up before
  the tickets), and each beat moved onto its own attack where one is within 40 ms. In the two
  waltzes each beat has its bar and its place in the bar (1, 2, 3: the oom and the two pahs);
  elsewhere it has neither, and a part strikes the stretch's onsets instead.
- `landmarks`: the moments the story is cut to, each found as the strongest onset in a
  window the ear put it in.
- `rms`: loudness every half second, to see the swells and the drops.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/married-life/married-life-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/married-life-onsets.json')
SR = 22050
N = 2048
HOP = 128

# The stretches, by ear and by the loudness curve; each edge is then put on a measured onset.
#   name, from, to, kind: 'waltz' (bars of three on the tracked beats) or 'free' (onsets only)
STRETCHES = [
    ('wedding', 0.0, 17.7, 'free'),     # a camera flash, then the Wedding March, jazzed, at a bounce
    ('waltz', 17.7, 71.3, 'waltz'),     # the waltz, whole: the house, the zoo, the clouds, the nursery
    ('loss', 71.3, 100.3, 'free'),      # it halts: the doctor's office, then Ellie alone; the piano
    ('jar', 100.3, 168.2, 'waltz'),     # it starts again, slower: the book, the jar, the years, the ties; it presses on to the tickets
    ('hill', 168.2, 201.8, 'free'),     # a held note: the hill, the fall, the hospital, the balloon
    ('alone', 201.8, 251.0, 'free'),    # the piano alone: Carl, home
]


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', MP3, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def bands(x):
    """Spectral flux in a low band (the oom) and over everything, every HOP samples."""
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    idx = np.arange(N)[None, :]
    freqs = np.fft.rfftfreq(N, 1 / SR)
    low_band = (freqs >= 30) & (freqs < 250)
    mid_band = (freqs >= 150) & (freqs < 4000)
    low = np.zeros(frames)
    mid = np.zeros(frames)
    full = np.zeros(frames)
    prev = None
    for s in range(0, frames, 3000):
        f = np.arange(s, min(frames, s + 3000))
        m = np.log1p(1000 * np.abs(np.fft.rfft(x[f[:, None] * HOP + idx] * win, axis=1)))
        if prev is not None:
            m = np.vstack([prev[None, :], m])
            d = np.maximum(0, np.diff(m, axis=0))
        else:
            d = np.vstack([np.zeros((1, m.shape[1])), np.maximum(0, np.diff(m, axis=0))])
        prev = m[-1]
        low[f] = d[:, low_band].sum(1)
        mid[f] = d[:, mid_band].sum(1)
        full[f] = d.sum(1)
    t = (np.arange(frames) * HOP + N / 2) / SR
    return t, low, mid, full


def envelope(t, x, med=0.5, smooth=3):
    fps = 1 / (t[1] - t[0])
    m = int(fps * med)
    e = np.maximum(0, x - np.convolve(x, np.ones(m) / m, 'same'))
    return np.convolve(e, np.ones(smooth) / smooth, 'same')


def peaks(t, e, a, b, spacing):
    """Local maxima of `e` in [a, b), at least `spacing` apart, each with its height over the 95th percentile of the stretch's peaks."""
    fps = 1 / (t[1] - t[0])
    gap = max(1, int(spacing * fps))
    idx = np.where((t >= a) & (t < b))[0]
    out = []
    for i in idx[1:-1]:
        if e[i] > e[i - 1] and e[i] >= e[i + 1]:
            if out and i - out[-1] < gap:
                if e[i] > e[out[-1]]:
                    out[-1] = i
                continue
            out.append(i)
    if not out:
        return []
    top = np.percentile([e[i] for i in out], 95) or 1
    return [{'t': round(float(t[i]), 3), 's': round(float(e[i] / top), 3)} for i in out]


def local_period(t, e, c, lo=0.29, hi=0.47):
    """The beat period that best gathers the flux in the 8 s round `c` (a comb, best phase, per unit of time)."""
    m = (t > c - 4) & (t < c + 4)
    tt, ee = t[m], e[m]
    best = (0.0, 0.34)
    for p in np.arange(lo, hi, 0.002):
        bs = 0.0
        for ph in np.arange(0, p, 0.006):
            d = (tt - ph) / p
            d = d - np.round(d)
            bs = max(bs, float((ee * np.exp(-(d * p) ** 2 / (2 * 0.02 ** 2))).sum()))
        if bs * p > best[0]:
            best = (bs * p, float(p))
    return best[1]


def track(t, e, duration):
    """Beats by dynamic programming (Ellis 2007) under a tempo that may drift: the local period is measured each second."""
    fps = 1 / (t[1] - t[0])
    cs = np.arange(0, duration + 1, 1.0)
    per = np.array([local_period(t, e, c) for c in cs])
    per = np.array([np.median(per[max(0, i - 2):i + 3]) for i in range(len(per))])
    tau = np.interp(t, cs, per) * fps
    o = e / (np.percentile(e, 99) or 1)
    n = len(o)
    score = np.zeros(n)
    back = -np.ones(n, dtype=int)
    for i in range(n):
        T = tau[i]
        lo = int(i - 2 * T)
        hi = int(i - T / 2)
        if lo < 0:
            score[i] = o[i]
            continue
        js = np.arange(lo, hi)
        v = score[js] - 100 * np.log((i - js) / T) ** 2
        k = int(np.argmax(v))
        score[i] = o[i] + v[k]
        back[i] = js[k]
    tail = int(2 * fps)
    i = int(np.argmax(score[-tail:])) + n - tail
    out = []
    while i >= 0:
        out.append(float(t[i]))
        i = back[i]
    return out[::-1]


def strongest(ons, a, b):
    got = [q for q in ons if a <= q['t'] < b]
    return max(got, key=lambda q: q['s'])['t'] if got else None


def main():
    x = decode()
    duration = len(x) / SR
    t, low, mid, full = bands(x)
    E = envelope(t, full + low)
    L = envelope(t, low)
    P = envelope(t, mid, smooth=5)

    # Onsets, stretch by stretch, each stretch its own scale.
    onsets = []
    for name, a, b, _ in STRETCHES:
        for q in peaks(t, E, a, min(b, duration), 0.1):
            q['in'] = name
            onsets.append(q)
    # The piano's own notes where it is alone or leads: the loss and the end (a mid band, spaced a little wider).
    piano = [q for name, a, b, _ in STRETCHES if name in ('wedding', 'loss', 'hill', 'alone') for q in peaks(t, P, a, min(b, duration), 0.14)]

    # The pulse.
    raw = track(t, E, duration)
    fps = 1 / (t[1] - t[0])
    beats = []
    for b in raw:
        # Onto its own attack, where there is one close by: the strongest flux peak within 40 ms, if it is a real one.
        m = np.where(np.abs(t - b) <= 0.04)[0]
        i = m[int(np.argmax(E[m]))]
        stretch = next((n for n, a, bb, _ in STRETCHES if a <= b < bb), STRETCHES[-1][0])
        on = [q for q in onsets if q['in'] == stretch and abs(q['t'] - t[i]) <= 0.012 and q['s'] >= 0.15]
        tt = on[0]['t'] if on else round(b, 3)
        beats.append({'t': tt, 'e': float(E[m].max()), 'onset': bool(on), 'stretch': stretch})
    clean = []
    for b in beats:
        if clean and b['t'] - clean[-1]['t'] < 0.15:
            if b['e'] > clean[-1]['e']:
                clean[-1] = b
            continue
        clean.append(b)
    beats = clean
    # A beat's strength: its flux against the 95th percentile of its stretch's beats.
    for name, a, b, _ in STRETCHES:
        inside = [bb for bb in beats if bb['stretch'] == name]
        if not inside:
            continue
        top = np.percentile([bb['e'] for bb in inside], 95) or 1
        for bb in inside:
            bb['s'] = round(min(2.0, bb['e'] / top), 3)
    for bb in beats:
        del bb['e']

    # Landmarks: each the strongest onset where the ear puts it.
    ons = onsets
    AT = {
        'flash': strongest(ons, 0.0, 1.0),
        'waltz': None,
        'halt': None,
        'loss': strongest(ons, 83.5, 85.0),
        'book': strongest(ons, 100.0, 100.8),
        'tickets': strongest(ons, 167.4, 168.0),
        'fall': strongest(ons, 174.3, 175.0),
        'hospital': strongest(ons, 180.0, 181.0),
        'church': strongest(ons, 197.4, 198.0),
        'home': strongest(ons, 201.6, 202.2),
        'last': max(q['t'] for q in ons if q['s'] >= 0.2 and q['t'] < duration - 1),
    }

    # Bars in the waltzes: the downbeat is the beat of three with the most low-band flux, counted from each waltz's
    # first loud downbeat.
    def lowat(tt):
        m = np.abs(t - tt) < 0.03
        return float(L[m].max()) if m.any() else 0.0

    report = []
    for name, a, b, kind in STRETCHES:
        inside = [bb for bb in beats if bb['stretch'] == name]
        if kind != 'waltz' or not inside:
            continue
        # The phase of the bar: which beat of three carries the oom (the low band), or, where the low band is thin,
        # the accent.
        sums = [sum(lowat(bb['t']) for bb in inside[j::3]) for j in range(3)]
        accents = [sum(bb['s'] for bb in inside[j::3]) for j in range(3)]
        j0 = int(np.argmax(sums))
        report.append((name, [round(v, 1) for v in sums], [round(v, 2) for v in accents], j0))
        for i, bb in enumerate(inside):
            k = i - j0
            bb['bar'] = k // 3 + 1
            bb['pos'] = k % 3 + 1
    firsts = [bb for bb in beats if bb['stretch'] == 'waltz' and bb.get('bar') == 1 and bb.get('pos') == 1]
    AT['waltz'] = firsts[0]['t'] if firsts else None
    # The tickets end on a cadence of three hits, the last of them the loudest thing in the second half.
    AT['cadence'] = [strongest(ons, 166.8, 167.1), strongest(ons, 167.1, 167.4), AT['tickets']]
    # Where the jar's waltz presses on, faster, toward the tickets: the first bar whose beats run under 0.35 s.
    jar = [bb for bb in beats if bb['stretch'] == 'jar' and bb.get('pos') == 1]
    AT['press'] = next(bb['t'] for i, bb in enumerate(jar[:-1]) if bb['t'] > 150 and jar[i + 1]['t'] - bb['t'] < 1.07)
    waltz_beats = [bb for bb in beats if bb['stretch'] == 'waltz']
    AT['halt'] = waltz_beats[-1]['t'] if waltz_beats else None

    rms = []
    for w0 in np.arange(0, duration, 0.5):
        seg = x[int(w0 * SR):int((w0 + 0.5) * SR)]
        if len(seg):
            rms.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))

    out = {
        'source': 'apps/rube/src/shows/versions/married-life/married-life-demo.mp3',
        'youtube': '2rn-vMbFglI',
        'duration': round(duration, 3),
        'stretches': [{'name': n, 'from': a, 'to': b, 'kind': k} for n, a, b, k in STRETCHES],
        'landmarks': AT,
        'beats': beats,
        'onsets': onsets,
        'piano': piano,
        'rms_step': 0.5,
        'rms': rms,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=0, separators=(',', ':'))
        f.write('\n')

    print(f"duration {duration:.3f}; {len(onsets)} onsets, {len(piano)} piano notes, {len(beats)} beats")
    print('landmarks', AT)
    for name, sums, accents, j0 in report:
        print(f"{name}: low flux by place in bar {sums}, accents {accents}: the downbeat is the stretch's beat {j0 + 1}")
    for name, a, b, kind in STRETCHES:
        bs = [bb for bb in beats if bb['stretch'] == name]
        if not bs:
            continue
        ibi = np.diff([bb['t'] for bb in bs])
        held = sum(1 for bb in bs if bb['onset']) / len(bs)
        bars = f"bars {bs[0].get('bar')}..{bs[-1].get('bar')}" if kind == 'waltz' else ''
        print(f"{name:8s} {a:6.1f}-{b:6.1f} {len(bs):3d} beats, median {np.median(ibi) if len(ibi) else 0:.3f}s, on an attack {held:.0%} {bars}")


if __name__ == '__main__':
    main()

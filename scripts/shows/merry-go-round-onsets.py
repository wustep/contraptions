"""
Merry-Go-Round: the recording's clock, measured once, in show time.

The show plays apps/rube/src/shows/versions/merry-go-round/merry-go-round-demo.mp3 (demo only; see
apps/rube/src/shows/versions/merry-go-round/ATTRIBUTION.txt) from its first sample, so show time is the
recording's time. This reads it and writes scripts/shows/plans/merry-go-round-onsets.json, which the parts are
timed to and check:shows holds them against. Rerun only if the file changes:

    python3 scripts/shows/merry-go-round-onsets.py

Needs ffmpeg and numpy. Joe Hisaishi's concert arrangement of the Merry-Go-Round of Life is a waltz in stretches,
each at its own pace: a music-box opening, the theme slow and alone, a fermata and a breath of silence, the waltz
proper for a hundred seconds, a stop, a flowing interlude, a slow waltz in the major, a build that quickens, the
waltz again, a breath, the climax a key higher and faster, a cadenza, the last tutti and the last chord. So there
is no one comb. What it measures:

- `onsets`: every onset, a peak of spectral flux over its local mean, with how strong it is (`s`, 1 is the 95th
  percentile of the peaks of its own stretch, so a quiet stretch's notes count as much in it as a loud one's do in
  theirs).
- `beats`: the pulse in every stretch that has one, tracked beat by beat (a dynamic-programming tracker whose tempo
  may drift inside the range the stretch is played at), each beat moved onto its own attack where one is within
  40 ms. In the waltzes each beat has its bar and its place in the bar (1, 2, 3: the oom and the two pahs), the
  downbeat being the place of three with the most low-band flux.
- `landmarks`: the moments the story is cut to, each found as the strongest onset in a window the ear and the
  loudness curve put it in.
- `rms`: loudness every half second, to see the swells and the drops.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/merry-go-round/merry-go-round-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/merry-go-round-onsets.json')
SR = 22050
N = 2048
HOP = 128

# The stretches, by the loudness curve, the key and the pulse (autocorrelation of the flux, 20 s windows).
#   name, from, to, kind, beat period range (s): 'waltz' (bars of three on tracked beats) or 'free' (onsets only)
STRETCHES = [
    ('box', 0.0, 9.6, 'free', None),                 # a music box: a rising figure every quarter second, then a few notes
    ('theme', 9.6, 38.2, 'waltz', (0.47, 0.60)),     # the theme, slow and alone, G minor, ~113 bpm
    ('hold', 38.2, 48.9, 'free', None),              # a held D, a trill over it, dying to a breath of silence (46-49)
    ('waltz', 48.9, 150.4, 'waltz', (0.34, 0.41)),   # the waltz proper, ~162 bpm: G minor, swelling at 70 and 110
    ('stop', 150.4, 151.9, 'free', None),            # it stops
    ('flow', 151.9, 177.3, 'free', None),            # a flowing interlude, D major, running notes, two waves
    ('slow', 177.3, 199.5, 'waltz', (0.58, 0.70)),   # a slow waltz in E flat major, ~95 bpm, from its one great hit
    ('build', 199.5, 219.3, 'waltz', (0.40, 0.50)),  # a build that quickens, B flat major to D minor
    ('return', 219.3, 242.4, 'waltz', (0.34, 0.41)), # the waltz again, loud, D major
    ('breath', 242.4, 243.6, 'free', None),          # a breath
    ('climax', 243.6, 285.8, 'waltz', (0.33, 0.40)), # the climax a key higher, E minor, ~166 bpm, the loudest
    ('cadenza', 285.8, 292.2, 'free', None),         # a cadenza: high, soft, free
    ('finale', 292.2, 300.3, 'waltz', (0.34, 0.41)), # the last tutti, E major
    ('last', 300.3, 311.3, 'free', None),            # a breath, the last chord, and its ring
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


def local_period(t, e, c, lo, hi):
    """The beat period in [lo, hi) that best gathers the flux in the 8 s round `c` (a comb, best phase, per unit of time)."""
    m = (t > c - 4) & (t < c + 4)
    tt, ee = t[m], e[m]
    best = (0.0, (lo + hi) / 2)
    for p in np.arange(lo, hi, 0.002):
        bs = 0.0
        for ph in np.arange(0, p, 0.006):
            d = (tt - ph) / p
            d = d - np.round(d)
            bs = max(bs, float((ee * np.exp(-(d * p) ** 2 / (2 * 0.02 ** 2))).sum()))
        if bs * p > best[0]:
            best = (bs * p, float(p))
    return best[1]


def track(t, e, a, b, lo, hi):
    """Beats in [a, b) by dynamic programming (Ellis 2007) under a tempo that may drift: the local period is measured each second."""
    fps = 1 / (t[1] - t[0])
    m = (t >= a) & (t < b)
    tt = t[m]
    ee = e[m]
    cs = np.arange(a, b + 1, 1.0)
    per = np.array([local_period(t, e, c, lo, hi) for c in cs])
    per = np.array([np.median(per[max(0, i - 2):i + 3]) for i in range(len(per))])
    tau = np.interp(tt, cs, per) * fps
    o = ee / (np.percentile(ee, 99) or 1)
    n = len(o)
    score = np.zeros(n)
    back = -np.ones(n, dtype=int)
    for i in range(n):
        T = tau[i]
        lo_i = int(i - 2 * T)
        hi_i = int(i - T / 2)
        if lo_i < 0:
            score[i] = o[i]
            continue
        js = np.arange(lo_i, hi_i)
        v = score[js] - 100 * np.log((i - js) / T) ** 2
        k = int(np.argmax(v))
        score[i] = o[i] + v[k]
        back[i] = js[k]
    tail = int(min(n, 2 * fps))
    i = int(np.argmax(score[-tail:])) + n - tail
    out = []
    while i >= 0:
        out.append(float(tt[i]))
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

    # Onsets, stretch by stretch, each stretch its own scale.
    onsets = []
    for name, a, b, _, _ in STRETCHES:
        for q in peaks(t, E, a, min(b, duration), 0.1):
            q['in'] = name
            onsets.append(q)

    def lowat(tt):
        m = np.abs(t - tt) < 0.03
        return float(L[m].max()) if m.any() else 0.0

    # The pulse, stretch by stretch, and the bars.
    beats = []
    report = []
    for name, a, b, kind, rng in STRETCHES:
        if kind != 'waltz':
            continue
        raw = track(t, E, a, min(b, duration), *rng)
        mine = []
        for bt in raw:
            m = np.where(np.abs(t - bt) <= 0.04)[0]
            i = m[int(np.argmax(E[m]))]
            on = [q for q in onsets if q['in'] == name and abs(q['t'] - t[i]) <= 0.012 and q['s'] >= 0.15]
            tt = on[0]['t'] if on else round(bt, 3)
            mine.append({'t': tt, 'e': float(E[m].max()), 'onset': bool(on), 'stretch': name})
        clean = []
        for bb in mine:
            if clean and bb['t'] - clean[-1]['t'] < rng[0] * 0.6:
                if bb['e'] > clean[-1]['e']:
                    clean[-1] = bb
                continue
            clean.append(bb)
        mine = clean
        top = np.percentile([bb['e'] for bb in mine], 95) or 1
        for bb in mine:
            bb['s'] = round(min(2.0, bb['e'] / top), 3)
        # The phase of the bar: which beat of three carries the oom (the low band).
        sums = [sum(lowat(bb['t']) for bb in mine[j::3]) for j in range(3)]
        accents = [sum(bb['s'] for bb in mine[j::3]) for j in range(3)]
        j0 = int(np.argmax(sums))
        report.append((name, [round(v, 1) for v in sums], [round(v, 2) for v in accents], j0))
        for i, bb in enumerate(mine):
            k = i - j0
            bb['bar'] = k // 3 + 1
            bb['pos'] = k % 3 + 1
            del bb['e']
        beats.extend(mine)

    ons = onsets
    AT = {
        'box': strongest(ons, 0.0, 0.6),
        'theme': strongest(ons, 10.4, 11.8),
        'silence': strongest(ons, 45.5, 48.0),
        'waltz': strongest(ons, 48.9, 49.3),
        'swell1': strongest(ons, 70.0, 71.2),
        'swell2': strongest(ons, 109.8, 110.8),
        'stop': max(q['t'] for q in ons if q['in'] == 'waltz' and q['s'] >= 0.2),
        'flow': strongest(ons, 151.9, 152.5),
        'slow': strongest(ons, 177.9, 178.3),
        'build': strongest(ons, 199.5, 200.5),
        'return': strongest(ons, 218.8, 219.2),
        'breath': max(q['t'] for q in ons if q['in'] == 'return' and q['s'] >= 0.2),
        'climax': strongest(ons, 243.5, 243.9),
        'cadenza': strongest(ons, 285.8, 290.0),
        'finale': strongest(ons, 292.1, 292.5),
        'chord': strongest(ons, 302.0, 302.8),
    }

    rms = []
    for w0 in np.arange(0, duration, 0.5):
        seg = x[int(w0 * SR):int((w0 + 0.5) * SR)]
        if len(seg):
            rms.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))

    out = {
        'source': 'apps/rube/src/shows/versions/merry-go-round/merry-go-round-demo.mp3',
        'youtube': 'f7SS57LFPco',
        'duration': round(duration, 3),
        'stretches': [{'name': n, 'from': a, 'to': b, 'kind': k} for n, a, b, k, _ in STRETCHES],
        'landmarks': AT,
        'beats': beats,
        'onsets': onsets,
        'rms_step': 0.5,
        'rms': rms,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=0, separators=(',', ':'))
        f.write('\n')

    print(f"duration {duration:.3f}; {len(onsets)} onsets, {len(beats)} beats")
    print('landmarks', AT)
    for name, sums, accents, j0 in report:
        print(f"{name}: low flux by place in bar {sums}, accents {accents}: the downbeat is the stretch's beat {j0 + 1}")
    for name, a, b, kind, _ in STRETCHES:
        bs = [bb for bb in beats if bb['stretch'] == name]
        if not bs:
            continue
        ibi = np.diff([bb['t'] for bb in bs])
        held = sum(1 for bb in bs if bb['onset']) / len(bs)
        first = next((bb['t'] for bb in bs if bb.get('pos') == 1), None)
        print(f"{name:8s} {a:6.1f}-{b:6.1f} {len(bs):3d} beats, median {np.median(ibi):.3f}s (min {ibi.min():.3f} max {ibi.max():.3f}), "
              f"on an attack {held:.0%}, bars {bs[0]['bar']}..{bs[-1]['bar']}, first downbeat {first}")


if __name__ == '__main__':
    main()

"""
Quintessence: Step Out's clock, measured once, in show time.

Quintessence plays José González's "Step Out" (from The Secret Life of Walter Mitty, 2013) from Republic Records'
own upload to YouTube (5EV9IdeU3D0), from the video's first second, so show time is the video's time. Nothing of the
recording is shipped. This reads a local analysis copy that never leaves the machine it is made on:

    yt-dlp -f 140 -o out/step-out/5EV9IdeU3D0.m4a 'https://www.youtube.com/watch?v=5EV9IdeU3D0'
    python3 scripts/shows/step-out-onsets.py

and writes scripts/shows/plans/step-out-onsets.json, which the show is timed to and check:shows holds it against.
Needs ffmpeg (or FFMPEG=<path>) and numpy. STEPOUT_AUDIO=<path> reads another copy.

The song is played, not sequenced: a band on a pulse of about 144 beats a minute that leans between 143 and 145 from
section to section (one comb fitted to the whole song is a quarter of a second out by the end). So there is no one
comb. The pulse is tracked beat by beat, and each beat moved onto its own attack. It is in four, and its phrases are
four bars long, sixteen beats, and every section starts on one.

What the song does, by the loudness and the bands (the low under 120 Hz, the hats over 6 kHz):

- `intro`   a swell out of silence; then the guitar and the bass on the pulse with no hats (3.5 s);
- `band`    the band in on a downbeat (10.4 s): the drums, the hats, the voice, nine phrases;
- `under`   at 70.4 s everything over the bass drops out, the kick and bass alone, as if heard under water;
- `band2`   the band back in on 88.6 s, eight phrases;
- `hush`    at 120.1 s it stops: a held low note and near silence;
- `pulse`   at 133.3 s a low pulse comes back under the hush;
- `build`   from 146.5 s the choir and the band come up a phrase at a time;
- `peak`    from 191.4 s the whole band and the choir, the loudest stretch, to 226.4 s;
- `tail`    the band drops away and the last chord rings out from 233 s to the video's end.

What it measures:

- `beats`: every beat from the first pulse to the last, each on its own attack where one is within 25 ms, with how
  hard it is struck (`s`, against the beats round it) and its place: `bar` and `pos` (1 to 4), counted from the
  band's first downbeat, so beat 1 of every phrase is a bar whose number is one more than a multiple of four.
- `onsets`: every onset, a peak of spectral flux over its local mean, with its strength in its own stretch.
- `stretches` and `landmarks`: the moments the story is cut to.
- `rms`: loudness every quarter second, 0 to 1 against the song's loudest.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('STEPOUT_AUDIO', os.path.join(ROOT, 'out/step-out/5EV9IdeU3D0.m4a'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/step-out-onsets.json')
YOUTUBE = '5EV9IdeU3D0'
SR = 22050
N = 2048
HOP = 128
# A frame's flux peaks while an attack is still a little ahead of the frame's centre, so every time is moved on by this
# much, onto the start of the attack. Measured on the waveform: round the 25 hardest beats of each stretch, a 1 ms
# envelope first rises 15% of the way to its peak a median 1.6 to 16 ms after the frame's centre plus 18 ms (11 ms
# over all six stretches with drums); 30 ms puts the beats on the attacks' starts.
ATTACK = 0.030

# The stretches, by the loudness and the bands; each edge is put on the tracked beat nearest it. `kind` says whether
# a part may strike the beat there ('beat') or only the onsets ('free').
STRETCHES = [
    ('intro', 0.0, 3.4, 'free'),
    ('lead', 3.4, 10.3, 'beat'),
    ('band', 10.3, 70.3, 'beat'),
    ('under', 70.3, 88.5, 'beat'),
    ('band2', 88.5, 120.0, 'beat'),
    ('hush', 120.0, 133.2, 'free'),
    ('pulse', 133.2, 146.4, 'beat'),
    ('build', 146.4, 191.3, 'beat'),
    ('peak', 191.3, 226.3, 'beat'),
    ('fall', 226.3, 233.0, 'beat'),
    ('tail', 233.0, 241.1, 'free'),
]


def decode():
    raw = subprocess.run([FFMPEG, '-loglevel', 'error', '-i', AUDIO, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def bands(x):
    """Spectral flux over everything and in the low band (the kick and the bass), every HOP samples."""
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    idx = np.arange(N)[None, :]
    freqs = np.fft.rfftfreq(N, 1 / SR)
    low_band = (freqs >= 30) & (freqs < 150)
    low = np.zeros(frames)
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
        full[f] = d.sum(1)
    t = (np.arange(frames) * HOP + N / 2) / SR + ATTACK
    return t, low, full


def envelope(t, x, med=0.25, smooth=3):
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
    return [{'t': round(float(t[i]), 3), 's': round(float(e[i] / top), 3), 'e': float(e[i])} for i in out]


def local_period(t, e, c, lo=0.405, hi=0.426):
    """The beat period that best gathers the flux in the 10 s round `c`."""
    m = (t > c - 5) & (t < c + 5)
    tt, ee = t[m], e[m]
    best = (0.0, 0.415)
    for p in np.arange(lo, hi, 0.0005):
        z = abs((ee * np.exp(2j * np.pi * tt / p)).sum())
        if z > best[0]:
            best = (z, float(p))
    return best[1]


def track(t, e, a, b):
    """Beats from a to b by dynamic programming (Ellis 2007) under a tempo that may lean: the local period every second."""
    fps = 1 / (t[1] - t[0])
    cs = np.arange(a, b + 1, 1.0)
    per = np.array([local_period(t, e, c) for c in cs])
    per = np.array([np.median(per[max(0, i - 4):i + 5]) for i in range(len(per))])
    m = (t >= a) & (t <= b)
    tt = t[m]
    tau = np.interp(tt, cs, per) * fps
    o = e[m] / (np.percentile(e[m], 99) or 1)
    n = len(o)
    score = np.zeros(n)
    back = -np.ones(n, dtype=int)
    for i in range(n):
        T = tau[i]
        lo = int(i - 1.25 * T)
        hi = int(i - 0.8 * T)
        if lo < 0:
            score[i] = o[i]
            continue
        js = np.arange(lo, hi)
        v = score[js] - 400 * np.log((i - js) / T) ** 2
        k = int(np.argmax(v))
        score[i] = o[i] + v[k]
        back[i] = js[k]
    tail = int(0.5 * fps)
    i = int(np.argmax(score[-tail:])) + n - tail
    out = []
    while i >= 0:
        out.append(float(tt[i]))
        i = back[i]
    return out[::-1]


def stretch_of(tt):
    return next((s for s in STRETCHES if s[1] <= tt < s[2]), STRETCHES[-1])


def main():
    x = decode()
    duration = len(x) / SR
    t, low, full = bands(x)
    E = envelope(t, full)
    L = envelope(t, low)

    onsets = []
    for name, a, b, _ in STRETCHES:
        for q in peaks(t, E, a, min(b, duration), 0.09):
            q['in'] = name
            onsets.append(q)

    # The pulse, from the guitar's first beat to the band's last chord.
    raw = track(t, E, 3.3, 233.2)
    beats = []
    for bt in raw:
        name = stretch_of(bt)[0]
        near = [q for q in onsets if abs(q['t'] - bt) <= 0.025 and q['s'] >= 0.12]
        if near:
            q = max(near, key=lambda q: q['e'])
            beats.append({'t': q['t'], 'onset': True, 'in': name, 'e': q['e']})
        else:
            m = np.abs(t - bt) <= 0.025
            beats.append({'t': round(bt, 3), 'onset': False, 'in': name, 'e': float(E[m].max())})
    es = np.array([b['e'] for b in beats])
    for i, b in enumerate(beats):
        top = np.percentile(es[max(0, i - 32):i + 32], 90) or 1
        b['s'] = round(min(2.0, b['e'] / top), 3)

    def lowat(tt):
        m = np.abs(t - tt) < 0.03
        return float(L[m].max()) if m.any() else 0.0

    # The bar: counted from the band's first downbeat (the beat the band comes in on).
    band_in = min(range(len(beats)), key=lambda i: abs(beats[i]['t'] - 10.39))
    for i, b in enumerate(beats):
        k = i - band_in
        b['bar'] = k // 4 + 1
        b['pos'] = k % 4 + 1
        b['low'] = round(lowat(b['t']), 2)

    # Report: the low band by place in the bar, stretch by stretch, to see the bar's phase holds.
    report = []
    for name, a, b, kind in STRETCHES:
        inside = [bb for bb in beats if bb['in'] == name]
        if not inside:
            continue
        sums = [round(float(np.mean([bb['low'] for bb in inside if bb['pos'] == p] or [0])), 2) for p in (1, 2, 3, 4)]
        ss = [round(float(np.mean([bb['s'] for bb in inside if bb['pos'] == p] or [0])), 2) for p in (1, 2, 3, 4)]
        ibi = np.diff([bb['t'] for bb in inside])
        on = sum(1 for bb in inside if bb['onset']) / len(inside)
        report.append(f"{name:6s} {a:6.1f}-{b:6.1f} {len(inside):3d} beats  {60 / np.median(ibi) if len(ibi) else 0:6.2f} bpm  on an attack {on:4.0%}  low by pos {sums}  s by pos {ss}  first bar {inside[0]['bar']}.{inside[0]['pos']}")

    for b in beats:
        del b['e']
        del b['low']
    for q in onsets:
        del q['e']

    def strongest(a, b):
        got = [q for q in onsets if a <= q['t'] < b]
        return max(got, key=lambda q: q['s'])['t'] if got else None

    def beat_near(tt):
        return min(beats, key=lambda b: abs(b['t'] - tt))['t']

    landmarks = {
        'swell': strongest(0.0, 3.3),
        'lead': beats[0]['t'],
        'band': beat_near(10.39),
        'under': beat_near(70.43),
        'band2': beat_near(88.64),
        'hush': strongest(119.8, 120.4),
        'pulse': beat_near(133.32),
        'build': beat_near(146.54),
        'peak': beat_near(191.44),
        'fall': beat_near(226.45),
        'last': strongest(232.6, 233.6),
    }

    rms = []
    for w0 in np.arange(0, duration, 0.25):
        seg = x[int(w0 * SR):int((w0 + 0.25) * SR)]
        if len(seg):
            rms.append(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)))
    top = max(rms)
    rms = [round(max(0.0, min(1.0, (r - top + 40) / 40)), 3) for r in rms]

    out = {
        'youtube': YOUTUBE,
        'duration': round(duration, 3),
        'stretches': [{'name': n, 'from': a, 'to': b, 'kind': k} for n, a, b, k in STRETCHES],
        'landmarks': landmarks,
        'beats': beats,
        'onsets': onsets,
        'rms_step': 0.25,
        'rms': rms,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    print(f'duration {duration:.3f}; {len(beats)} beats, {len(onsets)} onsets')
    for line in report:
        print(line)
    for k, v in landmarks.items():
        print(f'  {k:8s} {v}')


if __name__ == '__main__':
    main()

"""
Logogram: Heptapod B's clock, measured once, in show time.

The show plays apps/rube/src/shows/versions/heptapod-b/heptapod-b-demo.mp3 (demo only; see
apps/rube/src/shows/versions/heptapod-b/ATTRIBUTION.txt) from its first sample, so show time is the recording's time.
This reads it and writes scripts/shows/plans/heptapod-b-onsets.json, which the parts are timed to and check:shows
holds them against. Rerun only if the file changes:

    python3 scripts/shows/heptapod-b-onsets.py

Needs ffmpeg and numpy.

Jóhann Jóhannsson's "Heptapod B" is a machine made of voices. Out of near silence a few free murmurs (0 to 6.5 s),
then a pulse of short sung notes that never changes pace: one every 0.23871 s, about 251 a minute, from 6.8 s to the
last clear one near 197 s. Over the pulse the voices loop in lengths of 7, 13 and 18 pulses and phase against each
other, so there is no bar and no downbeat to find, only the pulse and how hard each one is sung. The loops pile up
(a rise to 26 s, layers coming in near 39, 66 and 90 s), the voices are fullest from 108 to 132 s, a last push runs
167 to 186 s, and then the pulse thins and stops and the held tones die away to nothing by 219 s, with one last
flutter at 208 to 212.5 s. What it measures:

- `comb`: the pulse, one period and one phase fitted to the whole of it (pulse k is at phase + k * period). It holds
  every strong pulse to about ±15 ms from start to end: the loops were laid on one grid.
- `pulses`: every pulse from the first to the last, each moved onto its own attack where one is within 35 ms, with
  how hard it is sung: `s` against the pulses round it (1 is the 90th percentile of the 30 s about it, so a quiet
  stretch's pulses count as much in it as a loud one's do in theirs) and `g` against the whole cue.
- `onsets`: every onset, a peak of spectral flux over its local mean, with how strong it is (`s`, 1 is the 95th
  percentile of the peaks of its own stretch). The murmur and the coda have no pulse, only these.
- `landmarks`: the moments the story is cut to, each a pulse or an onset the ear and the loudness put it at.
- `rms`: loudness every quarter second, to see the swells and the fall.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/heptapod-b/heptapod-b-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/heptapod-b-onsets.json')
YOUTUBE = 'KzaqrQuwr1k'
SR = 22050
N = 2048
HOP = 128

# The stretches: free murmurs, the pulse, the dying coda.
STRETCHES = [
    ('murmur', 0.0, 6.6, 'free'),
    ('pulse', 6.6, 197.2, 'pulse'),
    ('coda', 197.2, 222.1, 'free'),
]

# What the voices are doing, for staging: from the loudness, the band energies and a novelty curve of the timbre.
SECTIONS = [
    ('murmur', 0.0, 6.6),     # free murmurs out of silence
    ('rise', 6.6, 26.0),      # the pulse forms and the voices swell up to it
    ('first', 26.0, 39.0),    # the pulse whole, one layer
    ('second', 39.0, 66.0),   # a second layer of loops
    ('third', 66.0, 90.0),    # a third, brighter
    ('lift', 90.0, 108.0),    # the middle voices climb
    ('full', 108.0, 132.0),   # the voices fullest; the loudest moment is near 130
    ('held', 132.0, 167.0),   # held at full
    ('push', 167.0, 186.0),   # a last push
    ('thin', 186.0, 197.2),   # the pulse thins and stops
    ('coda', 197.2, 222.1),   # held tones dying away; a last flutter 208 to 212.5
]


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', MP3, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def flux(x):
    """Spectral flux over everything, every HOP samples."""
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    idx = np.arange(N)[None, :]
    out = np.zeros(frames)
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
        out[f] = d.sum(1)
    t = (np.arange(frames) * HOP + N / 2) / SR
    return t, out


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


def fit(t, e, a, b):
    """The comb that best gathers the flux between a and b: its period, then its phase on a narrow Gaussian."""
    m = (t > a) & (t < b)
    tt, ee = t[m], e[m]
    best = (0.0, 0.0, 0.0)
    for p in np.arange(0.2370, 0.2405, 0.000005):
        z = (ee * np.exp(2j * np.pi * tt / p)).sum()
        if abs(z) > best[0]:
            best = (abs(z), float(p), float(((np.angle(z) / (2 * np.pi)) % 1) * p))
    _, period, phase = best
    fine = (0.0, phase)
    for ph in np.arange(phase - 0.02, phase + 0.02, 0.0002):
        d = (tt - ph) / period
        d = d - np.round(d)
        s = float((ee * np.exp(-(d * period) ** 2 / (2 * 0.012 ** 2))).sum())
        if s > fine[0]:
            fine = (s, float(ph))
    return period, fine[1]


def main():
    x = decode()
    duration = len(x) / SR
    t, full = flux(x)
    E = envelope(t, full)

    onsets = []
    for name, a, b, _ in STRETCHES:
        for q in peaks(t, E, a, min(b, duration), 0.08):
            q['in'] = name
            onsets.append(q)

    period, phase = fit(t, E, 10.0, 186.0)
    first = int(np.ceil((STRETCHES[1][1] - phase) / period))
    last = int(np.floor((STRETCHES[1][2] - phase) / period))

    pulses = []
    for k in range(first, last + 1):
        g = phase + k * period
        near = [q for q in onsets if q['in'] == 'pulse' and abs(q['t'] - g) <= 0.035]
        m = np.where(np.abs(t - g) <= 0.035)[0]
        e = float(E[m].max())
        if near:
            q = max(near, key=lambda q: q['e'])
            pulses.append({'k': k, 't': q['t'], 'onset': True, 'e': max(e, q['e'])})
        else:
            pulses.append({'k': k, 't': round(g, 3), 'onset': False, 'e': e})
    es = np.array([p['e'] for p in pulses])
    gtop = np.percentile(es, 95) or 1
    for i, p in enumerate(pulses):
        lo = max(0, i - 63)
        hi = min(len(pulses), i + 63)
        ltop = np.percentile(es[lo:hi], 90) or 1
        p['s'] = round(min(2.0, p['e'] / ltop), 3)
        p['g'] = round(min(2.0, p['e'] / gtop), 3)
        del p['e']
    for q in onsets:
        del q['e']

    def pulse_near(tt):
        return min(pulses, key=lambda p: abs(p['t'] - tt))

    def loudest(a, b):
        got = [p for p in pulses if a <= p['t'] < b]
        return max(got, key=lambda p: p['g'])['t']

    def strongest(a, b):
        got = [q for q in onsets if a <= q['t'] < b]
        return max(got, key=lambda q: q['s'])['t'] if got else None

    clear = [p for p in pulses if p['onset'] and p['g'] >= 0.3]
    landmarks = {
        # The first murmur that carries, and the first click of the free voices.
        'first': strongest(1.0, 2.0),
        'click': strongest(3.4, 4.3),
        # The first pulse on the grid with an attack, and the first strong one.
        'pulse': next(p['t'] for p in pulses if p['onset'] and p['s'] >= 0.5),
        # Each section's first pulse.
        **{f'at_{name}': pulse_near(a)['t'] for name, a, _ in SECTIONS[2:-2]},
        # The loudest pulses of the lift, of the full voices, of the held stretch and of the last push.
        'lift_peak': loudest(90.0, 108.0),
        'full_peak': loudest(108.0, 132.0),
        'held_peak': loudest(132.0, 167.0),
        'push_peak': loudest(167.0, 186.0),
        # The last clear pulse (sung with an attack and a third of the cue's strong ones' weight).
        'last_pulse': clear[-1]['t'],
        # The last flutter's strongest note, in the dying coda.
        'flutter': strongest(208.0, 213.0),
    }

    rms = []
    for w0 in np.arange(0, duration, 0.25):
        seg = x[int(w0 * SR):int((w0 + 0.25) * SR)]
        if len(seg):
            rms.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))

    out = {
        'source': 'apps/rube/src/shows/versions/heptapod-b/heptapod-b-demo.mp3',
        'youtube': YOUTUBE,
        'duration': round(duration, 3),
        'comb': {'period': round(period, 6), 'phase': round(phase, 4), 'first': first, 'last': last},
        'stretches': [{'name': n, 'from': a, 'to': b, 'kind': k} for n, a, b, k in STRETCHES],
        'sections': [{'name': n, 'from': a, 'to': b} for n, a, b in SECTIONS],
        'landmarks': landmarks,
        'pulses': pulses,
        'onsets': onsets,
        'rms_step': 0.25,
        'rms': rms,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    n_on = sum(1 for p in pulses if p['onset'])
    print(f'duration {duration:.3f} s; comb {period:.6f} s from {phase:.4f} (pulses {first}..{last}, {len(pulses)}, {n_on} on an attack)')
    offs = [p['t'] - (phase + p['k'] * period) for p in pulses if p['onset'] and p['s'] >= 0.6]
    print(f'strong pulses off the comb: median {1000 * np.median(np.abs(offs)):.1f} ms, 90% within {1000 * np.percentile(np.abs(offs), 90):.1f} ms')
    print(f'{len(onsets)} onsets')
    for k, v in landmarks.items():
        print(f'  {k:12s} {v}')


if __name__ == '__main__':
    main()

"""
Magnum: Relax's clock, measured once, in show time.

The show plays apps/rube/src/shows/versions/relax/relax-demo.mp3 (demo only; see
apps/rube/src/shows/versions/relax/ATTRIBUTION.txt) from its first sample, so show time is the recording's time.
This reads it and writes scripts/shows/plans/relax-onsets.json, which the parts are timed to and check:shows holds
them against. Rerun only if the file changes:

    python3 scripts/shows/relax-onsets.py

Needs ffmpeg and numpy.

Frankie Goes to Hollywood's "Relax", the original 7" (ZTT, 1983; the song the film makes a trigger of), is a machine:
Trevor Horn's drum machine and sequencer hold one tempo from the first kick to the last, 115.40 beats a minute, every
beat within a few milliseconds of one comb. So the song's clock is that comb, and what the song does is said by where
the band comes in and drops out on it:

- a free intro out of silence (two sung calls over a pad, no drums) to 10.68 s, where the drums come in on a downbeat
  with a one-beat pickup;
- the hook, round after round (27.3, 52.3 s), a breakdown with a sung call on a downbeat (71.0), a verse (83.5 to
  102.2) and a long instrumental;
- **the break** (116.76 to 131.3): a spoken count-in and the title said over a bare groove;
- **the surge** (132.88): a wash of noise and the bass doubled, the song's biggest lift, and a ride on it to 155.8;
- a last round of the hook and a breakdown that rocks between two bars (170.8 to 182.3);
- **the drop out** (182.753): a last hit, and the whole band stops dead; a crash rings down for three and a half
  seconds to near silence; **a splash on 186.47** (a burst of noise out of the silence); **the band back in on 186.946**, the groove from the downbeat
  187.466;
- the outro, the hook again, the loudest bars of the song (220 to 229), and **the end dead on the downbeat 229.047**,
  with one last call in the tail.

What it measures:

- `comb`: the beat, one period and one phase fitted from the drums in to the end (beat k at phase + k * period; a
  bar is four beats, and beat k is a downbeat when k is a multiple of 4: every section starts on one).
- `beats`: every beat from the pickup into the drums (k 19) to the last (k 440), each moved onto its own attack where
  one is within 30 ms, with how hard it is struck: `s` against the beats round it (1 is the 90th percentile of the
  32 beats either side) and `g` against the whole song.
- `halves`: every off-beat (k + 1/2) the same way: the hats and the bass's eighths.
- `onsets`: every onset, a peak of spectral flux over its local mean, with how strong it is (`s`, 1 is the 95th
  percentile of the peaks of its own stretch). The intro, the drop out and the tail have only these.
- `sections` and `landmarks`: the moments the story is cut to.
- `rms`: loudness every quarter second.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/relax/relax-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/relax-onsets.json')
YOUTUBE = 'kpgRJSrfoic'
SR = 22050
N = 2048
HOP = 128
# A frame's flux peaks while an attack is still a little ahead of its centre (the window's weight there is rising
# fastest), so a frame's centre is early for the attack in it. Measured on the waveform (1 ms envelopes round the 35
# hardest beats: where each starts to rise), the attacks begin 15 to 21 ms after the frames that find them: every
# time here is moved on by 18 ms, onto the start of the attack.
ATTACK = 0.018

# The stretches onsets are counted in: free (no drums) or on the beat.
STRETCHES = [
    ('intro', 0.0, 10.1, 'free'),
    ('groove', 10.1, 182.6, 'beat'),
    ('drop', 182.6, 187.3, 'free'),
    ('outro', 187.3, 229.4, 'beat'),
    ('tail', 229.4, 233.7, 'free'),
]

# What the song is doing, for staging: from the band coming in and dropping out, and the timbre's novelty bar by bar.
# Each starts on a downbeat (the beat index given), but the intro (at zero) and the drop out (on its last hit).
SECTIONS = [
    ('intro', None),     # two sung calls over a pad, no drums
    ('groove', 20),      # the drums in (a pickup on beat 19), the bass's eighths
    ('hook1', 52),       # the hook, the first round
    ('hook2', 100),      # the hook, louder
    ('call', 132),       # a sung call on the downbeat of beat 136, breaks
    ('verse', 160),      # the verse
    ('bridge', 196),     # instrumental
    ('break', 224),      # the count-in and the title over a bare groove
    ('lift', 252),       # two bars up to the surge (its wash from beat 255)
    ('surge', 256),      # the biggest lift: the wash, the doubled bass
    ('ride', 264),       # riding it
    ('hook3', 300),      # the hook, a last round
    ('rock', 328),       # a breakdown rocking between two bars
    ('drop', 'stop'),    # the band stops dead; a crash rings down; the shout; the band back in
    ('outro', 360),      # the groove again
    ('finale', 388),     # the hook again, the loudest bars of the song
    ('tail', 440),       # the end on the downbeat, one last call
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
    t = (np.arange(frames) * HOP + N / 2) / SR + ATTACK
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
    for p in np.arange(0.5185, 0.5215, 0.000002):
        z = (ee * np.exp(2j * np.pi * tt / p)).sum()
        if abs(z) > best[0]:
            best = (abs(z), float(p), float(((np.angle(z) / (2 * np.pi)) % 1) * p))
    _, period, phase = best
    fine = (0.0, phase)
    for ph in np.arange(phase - 0.03, phase + 0.03, 0.0002):
        d = (tt - ph) / period
        d = d - np.round(d)
        s = float((ee * np.exp(-(d * period) ** 2 / (2 * 0.008 ** 2))).sum())
        if s > fine[0]:
            fine = (s, float(ph))
    return period, fine[1]


def grid(t, E, onsets, phase, period, ks, half):
    """The beats (or off-beats) `ks`, each on its own attack where one is within 30 ms, with its strength."""
    out = []
    for k in ks:
        g = phase + (k + (0.5 if half else 0)) * period
        near = [q for q in onsets if abs(q['t'] - g) <= 0.03]
        m = np.where(np.abs(t - g) <= 0.03)[0]
        e = float(E[m].max()) if len(m) else 0.0
        if near:
            q = max(near, key=lambda q: q['e'])
            out.append({'k': k, 't': q['t'], 'onset': True, 'e': max(e, q['e'])})
        else:
            out.append({'k': k, 't': round(g, 3), 'onset': False, 'e': e})
    es = np.array([b['e'] for b in out])
    gtop = np.percentile(es, 95) or 1
    for i, b in enumerate(out):
        lo = max(0, i - 32)
        hi = min(len(out), i + 32)
        ltop = np.percentile(es[lo:hi], 90) or 1
        b['s'] = round(min(2.0, b['e'] / ltop), 3)
        b['g'] = round(min(2.0, b['e'] / gtop), 3)
        del b['e']
    return out


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

    period, phase = fit(t, E, 10.5, 229.2)
    first, last = 19, 440
    beats = grid(t, E, onsets, phase, period, range(first, last + 1), False)
    halves = grid(t, E, onsets, phase, period, range(first, last), True)
    # The drop out has no beat: the band has stopped. Its beats stay in the list (the grid goes on under it, and the
    # band comes back in on it), but a beat there counts only if it has an attack of its own.
    for b in beats + halves:
        if 182.9 < b['t'] < 186.9 and not b['onset']:
            b['g'] = 0.0
            b['s'] = 0.0
    for q in onsets:
        del q['e']

    def beat(k):
        return next(b['t'] for b in beats if b['k'] == k)

    def strongest(a, b, min_s=0.0):
        got = [q for q in onsets if a <= q['t'] < b and q['s'] >= min_s]
        return max(got, key=lambda q: q['s'])['t'] if got else None

    landmarks = {
        # The two sung calls of the intro, over the pad.
        'call1': strongest(4.6, 6.2),
        'call2': strongest(8.4, 9.6),
        # The pickup into the drums, and the drums' first downbeat.
        'pickup': beat(19),
        'drums': beat(20),
        # Each section's first downbeat.
        # The sung call on the downbeat after the second round of the hook.
        'call': beat(136),
        # The surge's wash, on the beat before its downbeat.
        'wash': beat(255),
        # The drop out: the last hit before the band stops, the splash, the band back in, the groove's first downbeat.
        'stop': strongest(182.6, 182.9),
        'splash': strongest(186.2, 186.6),
        'back': strongest(186.8, 187.1),
        'groove': beat(360),
        # The finale's first downbeat, and the last: the end.
        'finale': beat(388),
        'end': beat(440),
    }

    starts = [0.0 if k is None else landmarks[k] if isinstance(k, str) else beat(k) for _, k in SECTIONS]
    sections = [{'name': n, 'from': a, 'to': b} for (n, _), a, b in zip(SECTIONS, starts, starts[1:] + [round(duration, 3)])]

    rms = []
    for w0 in np.arange(0, duration, 0.25):
        seg = x[int(w0 * SR):int((w0 + 0.25) * SR)]
        if len(seg):
            rms.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))

    out = {
        'source': 'apps/rube/src/shows/versions/relax/relax-demo.mp3',
        'youtube': YOUTUBE,
        'duration': round(duration, 3),
        'comb': {'period': round(period, 6), 'phase': round(phase, 4), 'first': first, 'last': last},
        'stretches': [{'name': n, 'from': a, 'to': b, 'kind': k} for n, a, b, k in STRETCHES],
        'sections': sections,
        'landmarks': landmarks,
        'beats': beats,
        'halves': halves,
        'onsets': onsets,
        'rms_step': 0.25,
        'rms': rms,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    n_on = sum(1 for b in beats if b['onset'])
    print(f'duration {duration:.3f} s; comb {period:.6f} s ({60 / period:.3f} bpm) from {phase:.4f} (beats {first}..{last}, {len(beats)}, {n_on} on an attack)')
    offs = [b['t'] - (phase + b['k'] * period) for b in beats if b['onset'] and b['s'] >= 0.6]
    print(f'strong beats off the comb: median {1000 * np.median(np.abs(offs)):.1f} ms, 90% within {1000 * np.percentile(np.abs(offs), 90):.1f} ms')
    print(f'{len(onsets)} onsets; {sum(1 for h in halves if h["onset"])} of {len(halves)} off-beats on an attack')
    for k, v in landmarks.items():
        print(f'  {k:12s} {v}')


if __name__ == '__main__':
    main()

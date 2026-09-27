"""
Kick: Time's clock, measured once, in show time.

The show plays apps/rube/src/shows/versions/time/time-demo.mp3 (demo only; see
apps/rube/src/shows/versions/time/ATTRIBUTION.txt) from its first sample, so show time is the recording's time.
This reads it and writes scripts/shows/plans/time-onsets.json, which the parts are timed to and check:shows holds
them against. Rerun only if the file changes:

    python3 scripts/shows/time-onsets.py

Needs ffmpeg and numpy.

Hans Zimmer's "Time", the last cue of Inception (2010), is one loop played eighteen times. Four chords, A minor, E
minor, G, D, a bar each at 63 beats a minute, on a click that never moves from the first note to the last: every
strong attack within a few milliseconds of one comb. What changes is only how much is stacked on the loop. Each
two turns of it another layer comes in (the pad and piano; strings; horns and the low pulse; the brass; the whole
orchestra; the drums and the guitar at the peak), until the peak's last bar, where everything is cut away but the
strings and the piano; the layers leave again two turns at a time, down to the piano alone, and one last low chord.

What it measures:

- `comb`: the beat, one period and one phase fitted to the whole cue (beat k at phase + k * period). A bar is four
  beats, and beat k is a downbeat when k is a multiple of 4; a turn of the loop is four bars (16 beats), and every
  layer comes in on a turn's first downbeat.
- `beats`: every beat from the first (k 0) to the last chord (k 288), each moved onto its own attack where one is
  within 30 ms, with how hard it is struck: `s` against the beats round it (1 is the 90th percentile of the 32 beats
  either side, so a quiet turn's beats count as much in it as a loud turn's do in theirs) and `g` against the whole
  cue.
- `halves`: every off-beat (k + 1/2) the same way: the pulse of eighths in the middle turns.
- `onsets`: every onset, a peak of spectral flux over its local mean, with how strong it is (`s`, 1 is the 95th
  percentile of the peaks of its own stretch).
- `turns`, `sections` and `landmarks`: the loop's turns, what the orchestra is doing in each pair of them, and the
  moments the story is cut to.
- `rms`: loudness every quarter second.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/time/time-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/time-onsets.json')
YOUTUBE = 'c56t7upa8Bk'
SR = 22050
N = 2048
HOP = 128
# A frame's flux peaks while an attack is still a little ahead of its centre (the window's weight there is rising
# fastest), so a frame's centre is early for the attack in it; every time here is moved on by `ATTACK`, onto where
# the waveform starts to rise. Measured on this recording's 40 hardest downbeats (1 ms envelopes round each).
ATTACK = 0.018

# Beats in a bar, bars in a turn of the loop, and the last beat: the last chord, on the downbeat after the last turn.
BAR = 4
TURN = 16
LAST = 288

# What the orchestra is doing, a pair of turns at a time (each starts on the turn's first downbeat, beat 16 * turn).
SECTIONS = [
    ('pad', 0),        # turns 1-2: a pad and the piano's chords, low and soft
    ('strings', 2),    # turns 3-4: the strings come in on the downbeat (the cue's first big attack)
    ('pulse', 4),      # turns 5-6: horns, and a low pulse under them
    ('brass', 6),      # turns 7-8: the brass take the tune
    ('swell', 8),      # turns 9-10: the whole orchestra, still rising
    ('peak', 10),      # turns 11-12: the drums and the full brass
    ('summit', 12),    # turns 13-14: the loudest; the guitar over it; it rings away over turn 15's downbeat
    ('after', 14),     # turns 15-16: the strings and the piano, falling away
    ('piano', 16),     # turns 17-18: the piano alone, very soft
    ('last', 18),      # the last chord, and its ring
]

# The stretches onsets are counted in (their strength is against their own stretch's peaks).
STRETCHES = [
    ('soft', 0.0, 30.6),
    ('build', 30.6, 152.5),
    ('peak', 152.5, 213.4),
    ('after', 213.4, 244.0),
    ('piano', 244.0, 280.0),
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
    for p in np.arange(0.9500, 0.9550, 0.000002):
        z = (ee * np.exp(2j * np.pi * tt / p)).sum()
        if abs(z) > best[0]:
            best = (abs(z), float(p), float(((np.angle(z) / (2 * np.pi)) % 1) * p))
    _, period, phase = best
    fine = (0.0, phase)
    for ph in np.arange(phase - 0.05, phase + 0.05, 0.0002):
        d = (tt - ph) / period
        d = d - np.round(d)
        s = float((ee * np.exp(-(d * period) ** 2 / (2 * 0.010 ** 2))).sum())
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
    for name, a, b in STRETCHES:
        for q in peaks(t, E, a, min(b, duration), 0.08):
            q['in'] = name
            onsets.append(q)

    period, phase = fit(t, E, 0.2, 275.0)
    beats = grid(t, E, onsets, phase, period, range(0, LAST + 1), False)
    halves = grid(t, E, onsets, phase, period, range(0, LAST), True)
    for q in onsets:
        del q['e']

    def beat(k):
        return next(b['t'] for b in beats if b['k'] == k)

    def strongest(a, b, min_s=0.0):
        got = [q for q in onsets if a <= q['t'] < b and q['s'] >= min_s]
        return max(got, key=lambda q: q['s'])['t'] if got else None

    landmarks = {
        # The strings in: the cue's first big attack, on turn 3's downbeat.
        'strings': beat(2 * TURN),
        # The peak's first downbeat (turn 11) and the summit's (turn 13).
        'peak': beat(10 * TURN),
        'summit': beat(12 * TURN),
        # The peak's last downbeat (turn 14's last bar), and the release: turn 15's downbeat, where the drums and brass
        # are gone and only the strings and the piano go on (the peak's ring falls 12 dB over the 1.5 s about it).
        'crest': beat(13 * TURN + 3 * BAR),
        'release': beat(14 * TURN),
        # The piano alone, turn 17.
        'piano': beat(16 * TURN),
        # The last chord.
        'last': strongest(beat(LAST) - 0.6, min(duration, beat(LAST) + 0.4)),
    }

    starts = [beat(turn * TURN) for _, turn in SECTIONS]
    sections = [{'name': n, 'from': a, 'to': b} for (n, _), a, b in zip(SECTIONS, starts, starts[1:] + [round(duration, 3)])]
    turns = [{'n': i + 1, 'from': beat(i * TURN), 'to': beat((i + 1) * TURN)} for i in range(LAST // TURN)]

    rms = []
    for w0 in np.arange(0, duration, 0.25):
        seg = x[int(w0 * SR):int((w0 + 0.25) * SR)]
        if len(seg):
            rms.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))

    out = {
        'source': 'apps/rube/src/shows/versions/time/time-demo.mp3',
        'youtube': YOUTUBE,
        'duration': round(duration, 3),
        'comb': {'period': round(period, 6), 'phase': round(phase, 4), 'first': 0, 'last': LAST, 'bar': BAR, 'turn': TURN},
        'stretches': [{'name': n, 'from': a, 'to': b} for n, a, b in STRETCHES],
        'turns': turns,
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
    print(f'duration {duration:.3f} s; comb {period:.6f} s ({60 / period:.3f} bpm) from {phase:.4f} (beats 0..{LAST}, {len(beats)}, {n_on} on an attack)')
    offs = [b['t'] - (phase + b['k'] * period) for b in beats if b['onset'] and b['s'] >= 0.6]
    print(f'strong beats off the comb: median {1000 * np.median(np.abs(offs)):.1f} ms, 90% within {1000 * np.percentile(np.abs(offs), 90):.1f} ms')
    print(f'{len(onsets)} onsets; {sum(1 for h in halves if h["onset"])} of {len(halves)} off-beats on an attack')
    for k, v in landmarks.items():
        print(f'  {k:12s} {v}')
    for s in sections:
        print(f'  {s["name"]:8s} {s["from"]:8.3f} -> {s["to"]:8.3f}')


if __name__ == '__main__':
    main()

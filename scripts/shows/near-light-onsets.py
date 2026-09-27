"""
Windowlight: Near Light's clock, measured once, in show time.

The show plays apps/rube/src/shows/versions/near-light/near-light-demo.mp3 (demo only; see
apps/rube/src/shows/versions/near-light/ATTRIBUTION.txt, and `near-light-loop.py`, which makes it) round and round: its
show zero is MARGIN seconds into the file, and it loops PERIOD seconds from there. This reads that file and writes
scripts/shows/plans/near-light-onsets.json, which the show is timed to and check:shows holds it against. Rerun only
if the file changes:

    python3 scripts/shows/near-light-onsets.py

Needs ffmpeg and numpy.

Ólafur Arnalds' "Near Light" (Living Room Songs, 2011) is played to one click: a felt piano, a string quartet, a
Juno and a drum loop, at 118.008 beats a minute from the first chord to the last held note. The piano's sixteenths,
the drums and the strings' changes all sit on that comb; the piano leans on it freely in the first twenty bars,
alone, and runs in time from the strings' entry. Four beats to the bar, and every section starts on a downbeat:

- **intro** (bars 0 to 20): the felt piano alone, its chords given and taken back against the click;
- **strings** (20 to 36): the quartet and the Juno in under it, a chord every two bars;
- **build** (36 to 48): the bass and the pad swelling, fuller every four bars;
- **beat** (48 to 72): the drum loop, the bass on every downbeat, the piano's sixteenths, the loudest bars and
  flat loud, twenty-four of them;
- **after** (72 to 84): the drums gone, the piano and the strings, as full as the build but still;
- **arpeggios** (84 to 96): the piano's arpeggios high up, round and round, two bars resting (87 and 93);
- **coda** (96 to 101): a last chord, and one string's held note dying on the half-bar of bar 100.

Then bar 101's downbeat is bar 0's again: the period is 101 bars, 205.409 s.

What it measures:

- `comb`: the beat, one period and one phase fitted to the piano's and the drums' sixteenths from the strings' entry
  to the coda (beat k at phase + k * period; beat 0 is bar 0's downbeat, the first chord; 404 beats a period).
- `beats`: every beat, moved onto its own attack where one is within 30 ms, with how hard it is struck (`s`, 1 is the
  90th percentile of the 32 beats either side).
- `onsets`: every onset, a peak of spectral flux over its local mean, with how strong it is (`s`, 1 is the 95th
  percentile of the peaks of its own section) and how much of it is low (`low`, the share of its flux under 180 Hz:
  the drum loop's kick and the bass, against the piano).
- `sections`: the sections above, in bars and in seconds.
- `rms` and `held`, every quarter second: loudness (dB), and how full the sustained sound is, 0 to 1 (the part of
  the spectrum that holds still over three quarters of a second, 150 Hz to 3 kHz: the strings, the pad, a pedalled
  chord; not an attack).
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/near-light/near-light-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/near-light-onsets.json')
YOUTUBE = 'ejaaxLeUQd4'
SR = 22050
N = 2048
HOP = 128
MARGIN = 2.0
BARS = 101
SECTIONS = [('intro', 0), ('strings', 20), ('build', 36), ('beat', 48), ('after', 72), ('arpeggios', 84), ('coda', 96)]


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', MP3, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def flux(x):
    """Spectral flux, all of it and under 180 Hz, every HOP samples; times are frame centres, in the file's seconds."""
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    idx = np.arange(N)[None, :]
    low = np.fft.rfftfreq(N, 1 / SR) < 180
    out = np.zeros(frames)
    out_low = np.zeros(frames)
    prev = None
    for s in range(0, frames, 3000):
        f = np.arange(s, min(frames, s + 3000))
        m = np.log1p(1000 * np.abs(np.fft.rfft(x[f[:, None] * HOP + idx] * win, axis=1)))
        stack = m if prev is None else np.vstack([prev[None, :], m])
        d = np.maximum(0, np.diff(stack, axis=0))
        if prev is None:
            d = np.vstack([np.zeros((1, m.shape[1])), d])
        prev = m[-1]
        out[f] = d.sum(1)
        out_low[f] = d[:, low].sum(1)
    t = (np.arange(frames) * HOP + N / 2) / SR
    return t, out, out_low


def envelope(t, x, med=0.25, smooth=3):
    fps = 1 / (t[1] - t[0])
    m = int(fps * med)
    e = np.maximum(0, x - np.convolve(x, np.ones(m) / m, 'same'))
    return np.convolve(e, np.ones(smooth) / smooth, 'same')


def peaks(t, e, a, b, spacing):
    """Local maxima of `e` in [a, b), at least `spacing` apart."""
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
    return out


def attack_lag(x, times, strengths):
    """
    How far after its flux frame's centre an attack starts, seconds: a frame's flux peaks while the attack is still a
    little ahead of its centre. Measured on the waveform round the hardest onsets (a 1 ms envelope; where it first
    rises through half of its climb over the 60 ms from 40 ms before), the median of them.
    """
    order = np.argsort(strengths)[::-1][:40]
    lags = []
    for i in order:
        c = times[i]
        a = int((c - 0.04) * SR)
        seg = np.abs(x[a:a + int(0.1 * SR)])
        if len(seg) < int(0.1 * SR):
            continue
        env = np.array([seg[j:j + 22].max() for j in range(0, len(seg) - 22, 22)])
        base = env[:int(len(env) * 0.25)].mean()
        top = env.max()
        if top < 2 * base:
            continue
        rise = np.argmax(env > base + (top - base) * 0.5)
        lags.append(rise * 0.001 - 0.04)
    return float(np.median(lags)) if lags else 0.0


def main():
    x = decode()
    period_s = None
    t_file, full, low = flux(x)
    E = envelope(t_file, full)
    L = envelope(t_file, low)

    # The comb, from the sixteenths: the piano's, the Juno's, the hats', from the strings' entry to the coda.
    t = t_file - MARGIN
    m = (t > 41) & (t < 195)
    best = (0.0, 0.0, 0.0)
    for P in np.arange(0.5080, 0.5090, 0.000001):
        z = (E[m] * np.exp(2j * np.pi * t[m] / (P / 4))).sum()
        if abs(z) > best[0]:
            best = (abs(z), float(P), float(((np.angle(z) / (2 * np.pi)) % 1) * P / 4))
    _, beat, sixteenth = best
    period_s = BARS * 4 * beat
    fps = 1 / (t[1] - t[0])

    def at(g, e):
        i = int(round((g - t[0]) * fps))
        return float(e[max(0, i - 3):i + 4].max())

    # Which sixteenth is the beat, and which beat the downbeat: where the flux gathers, over the whole period.
    beats_in = int(round(period_s / beat))
    offsets = [sum(at(sixteenth + j * beat / 4 + k * beat, E) for k in range(beats_in)) for j in range(4)]
    phase = sixteenth + int(np.argmax(offsets)) * beat / 4
    downs = [sum(at(phase + k * beat, E) for k in range(beats_in) if k % 4 == r) for r in range(4)]
    assert int(np.argmax(downs)) == 0, f'the downbeat is beat {int(np.argmax(downs))} of the bar, not the first chord'
    assert abs(phase - 0.146) < 0.02, f'bar 0 is at {phase:.3f} s, not the first chord'

    # Onsets, in each section, with their strength against the section's own.
    bars = lambda b: phase + b * 4 * beat  # noqa: E731
    marks = [(name, bars(b0), bars(b1)) for (name, b0), (_, b1) in zip(SECTIONS, SECTIONS[1:] + [('end', BARS)])]
    marks[0] = ('intro', 0.0, marks[0][2])
    marks[-1] = ('coda', marks[-1][1], period_s)
    raw = []
    for name, a, b in marks:
        idx = peaks(t, E, a, b, 0.07)
        if not idx:
            continue
        top = np.percentile([E[i] for i in idx], 95) or 1
        for i in idx:
            raw.append((float(t[i]), float(E[i] / top), float(L[i] / (E[i] + 1e-9)), name, float(E[i])))
    lag = attack_lag(x, [r[0] + MARGIN for r in raw], [r[4] for r in raw])
    onsets = [{'t': round(r[0] + lag, 3), 's': round(min(3.0, r[1]), 3), 'low': round(min(1.0, r[2]), 3), 'in': r[3]}
              for r in raw if 0 <= r[0] + lag < period_s]

    # Every beat, on its own attack where one is within 30 ms.
    grid = []
    for k in range(beats_in):
        g = phase + lag + k * beat
        near = [o for o in onsets if abs(o['t'] - g) <= 0.03]
        e = at(g - lag, E)
        if near:
            o = max(near, key=lambda o: o['s'])
            grid.append({'k': k, 't': o['t'], 'onset': True, 'e': e})
        else:
            grid.append({'k': k, 't': round(g, 3), 'onset': False, 'e': e})
    es = np.array([b['e'] for b in grid])
    for i, b in enumerate(grid):
        ltop = np.percentile(es[max(0, i - 32):i + 32], 90) or 1
        b['s'] = round(min(2.0, b['e'] / ltop), 3)
        del b['e']

    # Loudness, and how full the held sound is, every quarter second of the period.
    step = 0.25
    rms = []
    for w0 in np.arange(0, period_s - 1e-9, step):
        seg = x[int((w0 + MARGIN) * SR):int((w0 + MARGIN + step) * SR)]
        rms.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))
    held = sustained(x, period_s, step)

    out = {
        'source': 'apps/rube/src/shows/versions/near-light/near-light-demo.mp3',
        'youtube': YOUTUBE,
        'margin': MARGIN,
        'period': round(period_s, 6),
        'attack': round(lag, 4),
        'comb': {'period': round(beat, 6), 'phase': round(phase + lag, 4), 'beats': beats_in, 'bars': BARS},
        'sections': [{'name': n, 'from': b0, 'to': b1, 't0': round(bars(b0) + lag, 3) if b0 else 0.0,
                      't1': round(bars(b1) + lag, 3) if b1 < BARS else round(period_s, 3)}
                     for (n, b0), (_, b1) in zip(SECTIONS, SECTIONS[1:] + [('end', BARS)])],
        'beats': grid,
        'onsets': onsets,
        'step': step,
        'rms': rms,
        'held': held,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    n_on = sum(1 for b in grid if b['onset'])
    print(f'period {period_s:.4f} s; comb {beat:.6f} s ({60 / beat:.3f} bpm), bar 0 at {phase + lag:.4f} s; '
          f'{beats_in} beats, {n_on} on an attack; attacks {1000 * lag:.1f} ms after their frames')
    strong = [b for b in grid if b['onset'] and b['s'] >= 0.6]
    offs = [b['t'] - (phase + lag + b['k'] * beat) for b in strong]
    print(f'strong beats off the comb: median {1000 * np.median(np.abs(offs)):.1f} ms, 90% within {1000 * np.percentile(np.abs(offs), 90):.1f} ms')
    print(f'{len(onsets)} onsets: ' + ', '.join(f'{n} {sum(1 for o in onsets if o["in"] == n)}' for n, _ in SECTIONS))


def sustained(x, period_s, step):
    """The held part of the spectrum (a median over 0.75 s of each bin), 150 Hz to 3 kHz, 0 to 1 over the period."""
    n, hop = 2048, 512
    f = np.fft.rfftfreq(n, 1 / SR)
    band = (f >= 150) & (f <= 3000)
    win = np.hanning(n)
    a = int((MARGIN - 1) * SR)
    b = int((MARGIN + period_s + 1) * SR)
    seg = x[a:b]
    frames = (len(seg) - n) // hop
    mag = np.stack([np.abs(np.fft.rfft(seg[i * hop:i * hop + n] * win))[band] for i in range(frames)])
    w = int(round(0.75 * SR / hop)) | 1
    pad = np.pad(mag, ((w // 2, w // 2), (0, 0)), mode='edge')
    harm = np.empty_like(mag)
    for i in range(0, frames, 256):
        j = min(frames, i + 256)
        view = np.lib.stride_tricks.sliding_window_view(pad[i:j + w - 1], w, axis=0)
        harm[i:j] = np.median(view, axis=-1)
    level = 10 * np.log10((harm ** 2).sum(1) + 1e-9)
    tc = (np.arange(frames) * hop + n / 2) / SR - 1
    out = np.interp(np.arange(0, period_s - 1e-9, step), tc, level)
    lo, hi = np.percentile(out, 5), np.percentile(out, 95)
    return [round(float(v), 3) for v in np.clip((out - lo) / (hi - lo), 0, 1)]


if __name__ == '__main__':
    main()

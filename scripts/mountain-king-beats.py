"""
In the Hall of the Mountain King, Opus 5.5 one-shot: the recording's beats, measured once.

The show (`apps/rube/src/shows/versions/mountain-king/`) reads the JSON this
writes and never the audio, so the build needs no Python. Rerun only if the
recording changes:

    python3 scripts/mountain-king-beats.py

Needs ffmpeg and numpy (no scipy). What it measures:

- The march. Spectral flux, and a beat tracker (dynamic programming over the
  flux, after Ellis) that follows a tempo prior read off a local
  autocorrelation. The raw beats are then smoothed (local quadratic, a
  twelve-beat window), which is the orchestra's pulse through the
  accelerando: 290 beats from the first pizzicato at 4.37 s, 0.596 s a beat,
  down to 0.29 s by 134 s. The raw beats sit within ±13 ms of the smooth
  ones (median), ±35 ms at the 90th percentile; the misses are held notes,
  where there is no attack to find.
- The form. The grid falls into nine phrases of 32 beats (eight bars of the
  theme each), and the ninth ends where the coda's first chord begins.
- The coda, by its attacks (the steepest rise of a 10 ms loudness envelope
  near each): seven tutti chords, the eight-note run, the silence, the
  timpani roll and the last crash.
"""
import json
import os
import subprocess
import tempfile
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'docs/promo/mountain-king-musopen.mp3')
OUT = os.path.join(ROOT, 'scripts/show-plans/mountain-king-beats.json')
SR = 22050
N = 1024
HOP = 128


def decode():
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, 'mk.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', AUDIO, '-ac', '1', '-ar', str(SR), path], check=True)
        with wave.open(path) as w:
            x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return x.astype(np.float64) / 32768


def flux_of(x):
    win = np.hanning(N)
    frames = 1 + (len(x) - N) // HOP
    idx = np.arange(N)[None, :] + HOP * np.arange(frames)[:, None]
    spec = np.log1p(1000 * np.abs(np.fft.rfft(x[idx] * win, axis=1)))
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(axis=1)
    t = (np.arange(len(flux)) + 1) * HOP / SR + N / 2 / SR
    return t, flux


def normalised(t, f):
    dt = t[1] - t[0]
    k = int(1.0 / dt)
    g = np.maximum(0, f - np.convolve(f, np.ones(k) / k, 'same'))
    w = int(4 / dt)
    return g / (np.convolve(g, np.ones(w) / w, 'same') + 1e-6)


def tempo_prior(t, g):
    """
    Beat period through the piece, from a six-second autocorrelation every four seconds. Of the
    lags that stand out (a two-beat lag halved), the one nearest the last window's period and no more than 3% slower
    than it (the piece only ever speeds up), so the prior follows the beat through the
    accelerando and never jumps to the half-bar.
    """
    dt = t[1] - t[0]
    centres, periods = [], []
    prev = 0.56
    for c in np.arange(5, 134, 4):
        i0, i1 = int((c - 3) / dt), int((c + 3) / dt)
        seg = g[i0:i1] - g[i0:i1].mean()
        ac = np.correlate(seg, seg, 'full')[len(seg) - 1:]
        ac = ac / (ac[0] + 1e-9)
        lags = np.arange(len(ac)) * dt
        # A lag of two beats counts as its half: in the loud march the strong and weak beats alternate, and the one-beat lag hardly shows.
        peaks = [(lags[j] / (2 if lags[j] >= 0.5 else 1), ac[j]) for j in range(1, len(ac) - 1) if 0.24 < lags[j] < 1.4 and ac[j] > ac[j - 1] and ac[j] >= ac[j + 1]]
        strong = max(a for _, a in peaks)
        near = [lag for lag, a in peaks if a > 0.3 * strong and prev * 0.84 < lag < prev * 1.03]
        if near:
            prev = min(near, key=lambda lag: abs(lag - prev))
        centres.append(c)
        periods.append(prev)
    return np.interp(t, centres, periods)


def track(t, g, per, start, end, alpha=60):
    dt = t[1] - t[0]
    i0, i1 = int(start / dt), int(end / dt)
    G, P, T = g[i0:i1], per[i0:i1], t[i0:i1]
    n = len(G)
    score = G.copy()
    back = -np.ones(n, int)
    for i in range(n):
        p = P[i] / dt
        lo, hi = max(0, int(i - 2 * p)), int(i - p / 2)
        if hi <= lo:
            continue
        js = np.arange(lo, hi)
        c = score[js] - alpha * np.log((i - js) / p) ** 2
        j = np.argmax(c)
        score[i] = G[i] + c[j]
        back[i] = js[j]
    i = n - 1 - int(np.argmax(score[::-1][: int(P[-1] / dt)]))
    beats = []
    while i >= 0:
        beats.append(T[i])
        i = back[i]
    return np.array(beats[::-1])


def smooth(b, h=12):
    k = np.arange(len(b), dtype=float)
    out = np.zeros_like(b)
    for i in range(len(k)):
        w = np.clip(1 - (np.abs(k - k[i]) / h) ** 3, 0, None) ** 3
        A = np.stack([np.ones_like(k), k - k[i], (k - k[i]) ** 2], 1)
        W = np.diag(w)
        out[i] = np.linalg.lstsq(A.T @ W @ A, A.T @ W @ b, rcond=None)[0][0]
    return out


def attack(x, near, reach=0.12):
    """The steepest rise of a 10 ms loudness envelope within `reach` of `near`: where a chord speaks."""
    hop = int(SR * 0.005)
    i0 = int((near - reach - 0.05) * SR)
    i1 = int((near + reach) * SR)
    seg = x[i0:i1]
    env = np.sqrt(np.convolve(seg ** 2, np.ones(2 * hop) / (2 * hop), 'same'))[::hop]
    db = 20 * np.log10(env + 1e-9)
    rise = np.diff(db)
    j = int(np.argmax(rise[10:])) + 10
    return round(near - reach - 0.05 + (j + 1) * hop / SR, 3)


def main():
    x = decode()
    t, flux = flux_of(x)
    g = normalised(t, flux)
    per = tempo_prior(t, g)
    raw = track(t, g, per, 4.2, 134.3)
    grid = smooth(raw)
    residual = raw - grid
    phrases = [int(i) for i in range(0, len(grid), 32)]
    coda = {
        'chords': [attack(x, c) for c in (135.12, 136.08, 139.03, 140.0, 142.93, 143.88, 144.81)],
        'run': [attack(x, c, 0.06) for c in (145.06, 145.32, 145.58, 145.84, 146.08, 146.34, 146.59)],
        'rolls': [[137.1, 139.0], [141.0, 142.9]],
        'silence': [146.9, 147.7],
        'roll': [147.7, 149.46],
        'crash': attack(x, 149.49, 0.06),
        'quiet': 151.3,
    }
    data = {
        'recording': os.path.relpath(AUDIO, ROOT),
        'duration': round(len(x) / SR, 3),
        'beats': [round(float(b), 4) for b in grid],
        'raw': [round(float(b), 4) for b in raw],
        'residualMs': {'median': round(float(np.median(np.abs(residual)) * 1000), 1), 'p90': round(float(np.percentile(np.abs(residual), 90) * 1000), 1)},
        'phrase': 32,
        'phrases': phrases,
        'coda': coda,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(data, f, indent=1)
    print(f'{len(grid)} beats, {grid[0]:.3f}..{grid[-1]:.3f} s; residual median {data["residualMs"]["median"]} ms, p90 {data["residualMs"]["p90"]} ms')
    print('coda', coda)


if __name__ == '__main__':
    main()

"""
Everything Everywhere: "Come Recover (Empathy Fight)"'s onsets, measured once, in show time.

The show plays apps/rube/src/shows/versions/come-recover/eeaao-come-recover-demo.mp3 (built by scripts/shows/eeaao-cue.sh) from its
first sample, so show time is the recording's time. This reads it and writes
scripts/shows/plans/eeaao-onsets.json, which the parts are timed to and check:shows holds them
against. Rerun only if the file changes:

    python3 scripts/shows/eeaao-onsets.py

Needs ffmpeg and numpy. What it measures:

- Every onset: a peak of spectral flux over its local mean, with how strong it is (1 is the
  cue's 99th percentile). The first 142 s have no steady pulse, only these.
- The pulse where there is one. The cue locks to 150 bpm (0.4 s a beat) in three stretches:
  the fight (142 to 200 s), the fall and the swell after the drop (200 to 266 s), and home
  (278 to 320 s). Each gets its own comb (period and phase fitted to the flux), since the
  drop at 200 s and the break at 266 s each shift it by a fraction of a beat. Each beat and
  eighth of a comb has its own measured onset (the strongest flux peak within 40 ms) and
  strength, so the loud ones can be chosen.
- Loudness every quarter second, to find the swells and the drops.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CUE = os.path.join(ROOT, 'apps/rube/src/shows/versions/come-recover/eeaao-come-recover-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/eeaao-onsets.json')
SR = 22050
HOP = 256
N = 2048
# The stretches with a steady pulse, and a rough period to search about.
COMBS = [
    ('fight', 142.0, 200.0),
    ('fall', 200.0, 266.0),
    ('home', 278.0, 320.0),
]


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', CUE, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def flux(x):
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    idx = np.arange(N)[None, :]
    out = np.zeros(frames)
    prev = None
    for s in range(0, frames, 4000):
        f = np.arange(s, min(frames, s + 4000))
        m = np.log1p(1000 * np.abs(np.fft.rfft(x[f[:, None] * HOP + idx] * win, axis=1)))
        if prev is not None:
            m = np.vstack([prev[None, :], m])
            out[f] = np.maximum(0, np.diff(m, axis=0)).sum(1)
        else:
            out[f[1:]] = np.maximum(0, np.diff(m, axis=0)).sum(1)
        prev = m[-1]
    t = (np.arange(frames) * HOP + N / 2) / SR
    return t, out


def comb(t, e, a, b):
    """The 0.4 s comb that best fits the flux between a and b: its period and the time of a beat."""
    m = (t > a) & (t < b)
    tt, ee = t[m], e[m]
    best = (0.0, 0.0, 0.0)
    for p in np.arange(0.3985, 0.4015, 0.00002):
        # On eighths: the pulse's strong half moves between the beat and the off-beat from bar to bar.
        z = (ee * np.exp(2j * np.pi * tt / (p / 2))).sum()
        s = abs(z)
        if s > best[0]:
            best = (s, float(p), float(((np.angle(z) / (2 * np.pi)) % 1) * p / 2))
    _, period, phase = best
    # Refine the phase on a narrow Gaussian comb, then choose which eighth is the beat: the stronger.
    fine = (0.0, phase)
    for ph in np.arange(phase - 0.02, phase + 0.02, 0.0005):
        d = (tt - ph) / (period / 2)
        d = d - np.round(d)
        s = float((ee * np.exp(-(d * period / 2) ** 2 / (2 * 0.012 ** 2))).sum())
        if s > fine[0]:
            fine = (s, ph)
    phase = fine[1]
    on = off = 0.0
    for k in range(int((a - phase) / period), int((b - phase) / period) + 1):
        for half, acc in ((0, 'on'), (0.5, 'off')):
            g = phase + (k + half) * period
            if a <= g <= b:
                near = np.abs(t - g) < 0.03
                if near.any():
                    if acc == 'on':
                        on += e[near].max()
                    else:
                        off += e[near].max()
    if off > on:
        phase += period / 2
    return period, phase


def main():
    x = decode()
    duration = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', CUE],
                                    check=True, capture_output=True, text=True).stdout)
    t, d = flux(x)
    e = np.maximum(0, d - np.convolve(d, np.ones(41) / 41, 'same'))
    sm = np.convolve(e, np.ones(3) / 3, 'same')
    top = float(np.percentile(sm, 99))
    # Every onset: a local maximum over 50 ms either side, strong enough to hear.
    onsets = []
    w = int(0.05 * SR / HOP)
    for i in range(w, len(sm) - w):
        if sm[i] <= 0 or sm[i] < sm[i - w:i + w + 1].max():
            continue
        s = sm[i] / top
        if s >= 0.12:
            onsets.append({'t': round(float(t[i]), 3), 's': round(float(s), 3)})
    combs = []
    for name, a, b in COMBS:
        period, phase = comb(t, e, a, b)
        k0 = int(np.ceil((a - phase) / period))
        beats = []
        k = 0
        while True:
            for half in (0, 0.5):
                g = phase + (k0 + k + half) * period
                if g > b:
                    break
                near = np.abs(t - g) < 0.04
                i = int(np.argmax(sm[near]))
                beats.append({'beat': k + half, 't': round(float(g), 4), 'onset': round(float(t[near][i]), 3),
                              's': round(float(sm[near][i] / top), 3)})
            if phase + (k0 + k + 1) * period > b:
                break
            k += 1
        combs.append({'name': name, 'from': a, 'to': b, 'period': round(period, 5),
                      'origin': round(float(phase + k0 * period), 4), 'beats': beats})
    loud = []
    q = int(0.25 * SR)
    for i in range(0, len(x) - q, q):
        seg = x[i:i + q]
        loud.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))
    out = {
        'source': 'apps/rube/src/shows/versions/come-recover/eeaao-come-recover-demo.mp3',
        'duration': round(duration, 3),
        'onsets': onsets,
        'combs': combs,
        'loudness': {'step': 0.25, 'db': loud},
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    print(f"{len(onsets)} onsets")
    for c in combs:
        on = [b for b in c['beats'] if b['s'] > 0.3]
        dev = [1000 * (b['onset'] - b['t']) for b in on]
        print(f"{c['name']}: {c['from']}-{c['to']} s, period {c['period']:.5f}, beat 0 at {c['origin']:.4f}, "
              f"{len(c['beats'])} beats and eighths; strong ones off the comb: median {np.median(dev):.1f} ms, "
              f"p10 {np.percentile(dev, 10):.1f}, p90 {np.percentile(dev, 90):.1f}")


if __name__ == '__main__':
    main()

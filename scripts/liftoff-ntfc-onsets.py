"""
Liftoff, Act II: No Time for Caution's onsets, measured once, in show time.

The show plays docs/promo/interstellar-liftoff-mix-demo.mp3 (built by
scripts/liftoff-mix.sh): Cornfield Chase whole, then No Time for Caution
from one beat before its bar-26 accent. This reads the mix and writes
scripts/show-plans/liftoff-ntfc-onsets.json, which the parts are timed to
and check:shows holds them against. Rerun only if the mix changes:

    python3 scripts/liftoff-ntfc-onsets.py

Needs ffmpeg and numpy. What it measures:

- The organ's pulse: a comb over the second cue's span of spectral flux.
  It is 1.000 s (60 bpm), beat k of the cue at 23.5 + k s of the show, and
  every beat and eighth of it sits on that comb to a few ms.
- Each beat and eighth's own onset (the strongest flux peak within 40 ms)
  and how strong it is, so the loud ones can be chosen.
- Where the cue steps up in loudness, bar by bar: the sections to cut to.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIX = os.path.join(ROOT, 'docs/promo/interstellar-liftoff-mix-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/show-plans/liftoff-ntfc-onsets.json')
SR = 22050
HOP = 256
N = 2048
# Act II starts where the second cue does.
START = 126.5


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', MIX, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def flux(x):
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    prev = None
    out = np.zeros(frames)
    for i in range(frames):
        m = np.log1p(1000 * np.abs(np.fft.rfft(x[i * HOP:i * HOP + N] * win)))
        if prev is not None:
            out[i] = np.maximum(0, m - prev).sum()
        prev = m
    t = (np.arange(frames) * HOP + N / 2) / SR
    return t, out


def main():
    x = decode()
    duration = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MIX],
                                    check=True, capture_output=True, text=True).stdout)
    t, d = flux(x)
    e = np.maximum(0, d - np.convolve(d, np.ones(41) / 41, 'same'))
    # The comb over the second cue, from its first full beat to where it stops.
    m = (t > START + 1) & (t < START + 131)
    tt, ee = t[m], e[m]
    best = (0.0, 0.0, 0.0)
    for p in np.arange(0.9985, 1.0015, 0.0001):
        for ph in np.arange(0, p, 0.002):
            dd = (tt - ph) / p
            dd = dd - np.round(dd)
            s = float((ee * np.exp(-(dd * p) ** 2 / (2 * 0.015 ** 2))).sum())
            if s > best[0]:
                best = (s, float(p), float(ph))
    _, period, phase = best
    # Name the beats as the cue does: beat k of the cue is near 23.5 + k s of the show.
    k0 = round((START + 1 - phase) / period)
    origin = phase + (k0 - round(START + 1 - 23.5)) * period
    sm = np.convolve(e, np.ones(3) / 3, 'same')
    top = np.percentile(sm[m], 99)
    beats = []
    for k in range(104, 237):
        for half in (0, 0.5):
            g = origin + (k + half) * period
            if g < START + 0.9 or g > duration - 0.5:
                continue
            near = np.abs(t - g) < 0.04
            i = np.argmax(sm[near])
            beats.append({
                'beat': k + half,
                't': round(float(g), 4),
                'onset': round(float(t[near][i]), 3),
                's': round(float(sm[near][i] / top), 3),
            })
    # Loudness, bar by bar (four beats), to find the steps.
    bars = []
    for k in range(104, 237, 4):
        a = origin + k * period
        seg = x[int(a * SR):int((a + 4 * period) * SR)]
        if len(seg):
            bars.append({'beat': k, 't': round(float(a), 3), 'rms': round(float(np.sqrt((seg ** 2).mean())), 4)})
    out = {
        'source': 'docs/promo/interstellar-liftoff-mix-demo.mp3',
        'cue': 'docs/promo/interstellar-no-time-for-caution-demo.mp3',
        'duration': round(duration, 3),
        'start': START,
        'period': round(period, 5),
        'origin': round(float(origin), 4),
        'beats': beats,
        'bars': bars,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=1)
        f.write('\n')
    on = [b for b in beats if b['beat'] == int(b['beat'])]
    dev = [1000 * (b['onset'] - b['t']) for b in on if b['s'] > 0.3]
    print(f"period {period:.5f}s, beat k at {origin:.4f} + {period:.5f}k s; {len(beats)} beats and eighths; "
          f"strong beats off the comb: median {np.median(dev):.1f} ms, p10 {np.percentile(dev, 10):.1f}, p90 {np.percentile(dev, 90):.1f}")


if __name__ == '__main__':
    main()

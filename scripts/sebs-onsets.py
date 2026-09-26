"""
Seb's: the Epilogue's onsets, measured once, in show time.

The show plays docs/promo/la-la-land-sebs-mix-demo.mp3 (built by
scripts/sebs-mix.sh): Justin Hurwitz's Epilogue whole from zero, then The
End from 464.0 s. This reads the mix and writes
scripts/show-plans/sebs-onsets.json, which the parts are timed to and
check:shows holds them against. Rerun only if the mix changes:

    python3 scripts/sebs-onsets.py

Needs ffmpeg and numpy. What it measures:

- Every onset of the recording (spectral flux, peak-picked against its own
  neighbourhood), how strong it is against the whole cue, and a guess at the
  top voice's pitch (a MIDI number) where the texture is thin enough to have
  one: the piano's melody in the opening and at the end.
- The two stretches that hold a steady pulse, as combs: the dream's 128 bpm
  from the kiss to the Hollywood number, and the Paris club's 122.8 bpm.
  Each beat and half-beat of a comb carries its own measured onset.
- The film's landmarks, each snapped to the onset that makes it.
- Loudness every half second, for pacing.

The rest (the opening, the audition, the trumpet, the waltz, the home
movie, the end) is rubato: a strike there lands on a measured onset.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIX = os.path.join(ROOT, 'docs/promo/la-la-land-sebs-mix-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/show-plans/sebs-onsets.json')
SR = 22050
HOP = 256
N = 2048
# Where The End comes in (scripts/sebs-mix.sh).
END_AT = 464.0

# The film's landmarks, in show seconds, found by lining the recording up with
# the picture: each is snapped below to the measured onset within 80 ms.
LANDMARKS = {
    # Seb's: the first note of the theme.
    'first': 0.789,
    # The dream's first frame: Lipton's, Christmas, a few seconds before the
    # piano's phrase turns.
    'liptons': 39.648,
    # The hush before the kiss (the orchestra drops out), and the kiss itself.
    'hush': 61.777,
    'kiss': 65.515,
    # The white studio, the stage door.
    'studio': 133.352,
    # The painted Hollywood number bursts in.
    'hollywood': 143.639,
    # Its last hit, before the shadow play.
    'hollywood_out': 167.845,
    # The audition's accent.
    'audition': 187.582,
    # Paris: the jazz kicks in.
    'jazz': 214.877,
    # The trumpet's solo.
    'trumpet': 239.444,
    # Two knocks out of silence, and the waltz behind the iris.
    'knock1': 264.719,
    'knock2': 268.655,
    # The waltz's last swell, and its fall.
    'waltz_peak': 336.620,
    'waltz_out': 338.709,
    # The home movie's first bar.
    'movie': 345.095,
    # The drive.
    'drive': 396.144,
    # Back to Seb's hands: the last chord.
    'last': 453.730,
    # The End: the band.
    'band': END_AT + 14.060,
}

# Steady stretches: (name, from, to, bpm range). Beats are numbered from the
# first comb beat at or after `from`.
COMBS = [
    ('dream', 66.0, 166.5, (127.6, 128.4)),
    ('paris', 213.5, 238.0, (121.8, 123.8)),
]


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


def pitch(x, at):
    """The top voice at an onset: the highest pitch with at least 45% of the strongest salience, from what is new."""
    n = 4096
    win = np.hanning(n)
    i = int((at + 0.03) * SR)
    j = max(0, int((at - 0.12) * SR))
    if i + n > len(x):
        return None
    now = np.abs(np.fft.rfft(x[i:i + n] * win))
    before = np.abs(np.fft.rfft(x[j:j + n] * win))
    d = np.maximum(0, now - 0.7 * before)
    sal = {}
    for midi in range(52, 100):
        f0 = 440 * 2 ** ((midi - 69) / 12)
        s = 0.0
        for h, w in ((1, 1), (2, .5), (3, .33), (4, .25)):
            k = int(round(f0 * h * n / SR))
            if k + 2 < len(d):
                s += w * d[k - 1:k + 2].max()
        sal[midi] = s
    best = max(sal, key=sal.get)
    return best if sal[best] > 0 else None


def main():
    x = decode()
    duration = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MIX],
                                    check=True, capture_output=True, text=True).stdout)
    t, d = flux(x)
    e = np.maximum(0, d - np.convolve(d, np.ones(41) / 41, 'same'))
    top = np.percentile(e, 99.5)
    # Onsets: a local maximum over ±35 ms that stands well clear of its own two seconds.
    notes = []
    half = 6
    ctx = int(2.0 * SR / HOP)
    for j in range(half, len(e) - half):
        v = e[j]
        if v <= 0 or v < e[j - half:j + half + 1].max():
            continue
        local = np.median(e[max(0, j - ctx):j + ctx])
        if v < 2.5 * local + 0.02 * top:
            continue
        s = v / top
        if s < 0.05:
            continue
        notes.append([round(float(t[j]), 3), round(float(s), 3), pitch(x, t[j]) if s > 0.12 else None])
    times = np.array([n[0] for n in notes])
    strength = np.array([n[1] for n in notes])

    def nearest(g, tol=0.04):
        k = np.abs(times - g) <= tol
        if not k.any():
            return None, 0.0
        i = np.flatnonzero(k)[np.argmax(strength[k])]
        return float(times[i]), float(strength[i])

    combs = []
    for name, a, b, (lo, hi) in COMBS:
        m = (t >= a) & (t < b)
        tt, ee = t[m], e[m]
        best = (0.0, 0.0, 0.0)
        for bpm in np.arange(lo, hi, 0.01):
            p = 60 / bpm
            for ph in np.arange(0, p, 0.002):
                dd = (tt - ph) / p
                dd = dd - np.round(dd)
                s = float((ee * np.exp(-(dd * p) ** 2 / (2 * 0.015 ** 2))).sum())
                if s > best[0]:
                    best = (s, float(p), float(ph))
        _, period, phase = best
        k0 = int(np.ceil((a - phase) / period))
        origin = phase + k0 * period
        beats = []
        k = 0
        while origin + k * period < b:
            for h in (0, 0.5):
                g = origin + (k + h) * period
                on, s = nearest(g, 0.03)
                beats.append({'beat': k + h, 't': round(g, 4), 'onset': None if on is None else round(on, 3), 's': round(s, 3)})
            k += 1
        dev = [1000 * (bb['onset'] - bb['t']) for bb in beats if bb['onset'] is not None and bb['s'] > 0.3]
        combs.append({'name': name, 'from': a, 'to': b, 'period': round(period, 5), 'origin': round(origin, 4), 'beats': beats})
        print(f"{name}: {60 / period:.2f} bpm, beat 0 at {origin:.4f} s, period {period:.5f}; strong beats off the comb: "
              f"median {np.median(dev):.1f} ms, p10 {np.percentile(dev, 10):.1f}, p90 {np.percentile(dev, 90):.1f}")

    marks = {}
    for name, at in LANDMARKS.items():
        on, s = nearest(at, 0.08)
        marks[name] = round(on if on is not None else at, 3)
        if on is None:
            print(f"landmark {name} at {at}: no onset within 80 ms")

    loud = []
    for a in np.arange(0, duration, 0.5):
        seg = x[int(a * SR):int((a + 0.5) * SR)]
        loud.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1) if len(seg) else -90)

    out = {
        'source': 'docs/promo/la-la-land-sebs-mix-demo.mp3',
        'duration': round(duration, 3),
        'end_at': END_AT,
        'note': 'notes are [t, strength, midi|null]; strength is against the 99.5th percentile of the whole mix',
        'landmarks': marks,
        'combs': combs,
        'notes': notes,
        'loud': loud,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    print(f"{len(notes)} onsets, {len(marks)} landmarks, duration {duration:.3f} s -> {os.path.relpath(OUT, ROOT)}")


if __name__ == '__main__':
    main()

"""
La La Land, Epilogue: the recording's onsets, measured once.

The show plays apps/rube/src/shows/versions/la-la-land/lalaland-epilogue-demo.mp3 (demo only; see
apps/rube/src/shows/versions/la-la-land/EPILOGUE_ATTRIBUTION.txt). This reads it and writes
scripts/shows/plans/lalaland-epilogue-onsets.json, which the parts are timed
to and check:shows holds them against. Rerun only if the recording changes:

    python3 scripts/shows/lalaland-epilogue-onsets.py

Needs ffmpeg and numpy. The cue is a suite, and each stretch of it keeps time
its own way, so the file holds one measurement per stretch:

- `piano`: the opening's solo piano, rubato, note by note (mid-band flux).
- `kiss`: the orchestra's burst that ends the silence after the piano.
- `swing`: the montage at ~128 bpm: a comb fitted over its core, extended
  while the pulse holds, every beat and eighth with its own onset and strength.
- `waltz`: the musette at 64 bars a minute (3/4): bars and beats on a comb.
- `stars`, `bridge`, `home`, `look`: rubato or legato stretches, onsets only.
- `number`: the production number at 123 bpm: a comb, beats and eighths.
- `chorus`: the choral waltz that peaks the cue: bars and beats on a comb.
- `piano2`: the piano alone again, back in the club.
- `last`: the final chords, each with the silence after it.
- `rms`: loudness bar by bar of each grid, and per second overall.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/la-la-land/lalaland-epilogue-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/lalaland-epilogue-onsets.json')
SR = 22050
N = 2048


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', MP3, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def flux(x, hop, lo=0, hi=None, med=41, smooth=3):
    """Spectral flux at `hop`, between `lo` and `hi` Hz, less its running median-ish mean, lightly smoothed."""
    frames = (len(x) - N) // hop
    win = np.hanning(N)
    freqs = np.fft.rfftfreq(N, 1 / SR)
    band = (freqs >= lo) & (freqs <= (hi or SR))
    prev = None
    out = np.zeros(frames)
    for i in range(frames):
        m = np.log1p(1000 * np.abs(np.fft.rfft(x[i * hop:i * hop + N] * win)))[band]
        if prev is not None:
            out[i] = np.maximum(0, m - prev).sum()
        prev = m
    t = (np.arange(frames) * hop + N / 2) / SR
    e = np.maximum(0, out - np.convolve(out, np.ones(med) / med, 'same'))
    if smooth > 1:
        e = np.convolve(e, np.ones(smooth) / smooth, 'same')
    return t, e


def peaks_of(t, e, a, b, spacing):
    """Local maxima of `e` in [a, b), at least `spacing` s apart, each with its height as a share of the stretch's 95th percentile."""
    fps = 1 / (t[1] - t[0])
    gap = max(1, int(spacing * fps))
    m = (t >= a) & (t < b)
    idx = np.where(m)[0]
    out = []
    for i in idx[1:-1]:
        if e[i] > e[i - 1] and e[i] >= e[i + 1]:
            out.append(i)
    # Keep the taller of two peaks closer than the spacing.
    kept = []
    for i in out:
        if kept and i - kept[-1] < gap:
            if e[i] > e[kept[-1]]:
                kept[-1] = i
            continue
        kept.append(i)
    if not kept:
        return []
    top = np.percentile([e[i] for i in kept], 95) or 1
    return [{'t': round(float(t[i]), 3), 's': round(float(e[i] / top), 3)} for i in kept]


def comb(t, e, a, b, periods, sigma=0.018):
    """The period and phase in `periods` whose comb best gathers the flux in [a, b]."""
    m = (t > a) & (t < b)
    tt, ee = t[m], e[m]
    best = (0.0, 0.0, 0.0)
    for p in periods:
        for ph in np.arange(0, p, 0.003):
            d = (tt - ph) / p
            d = d - np.round(d)
            s = float((ee * np.exp(-(d * p) ** 2 / (2 * sigma ** 2))).sum())
            if s > best[0]:
                best = (s, float(p), float(ph))
    # Refine the phase finely.
    _, p, ph = best
    for f in np.arange(ph - 0.004, ph + 0.004, 0.0005):
        d = (tt - f) / p
        d = d - np.round(d)
        s = float((ee * np.exp(-(d * p) ** 2 / (2 * sigma ** 2))).sum())
        if s > best[0]:
            best = (s, p, float(f))
    return best[1], best[2]


def grid(t, e, period, phase, a, b, div=2, tol=0.04):
    """Every point of the comb in [a, b] at `div` per beat: its time, its nearest onset and how strong."""
    sm = e
    k0 = int(np.ceil((a - phase) / period * div))
    k1 = int(np.floor((b - phase) / period * div))
    out = []
    for k in range(k0, k1 + 1):
        g = phase + k * period / div
        near = np.abs(t - g) < tol
        if not near.any():
            continue
        i = np.argmax(sm[near])
        out.append({'beat': k / div, 't': round(float(g), 4), 'onset': round(float(t[near][i]), 3), 's': float(sm[near][i])})
    top = np.percentile([q['s'] for q in out], 95) or 1
    for q in out:
        q['s'] = round(q['s'] / top, 3)
    return out


def hold(t, e, period, phase, a, b, step=1.0):
    """How well the comb holds, second by second: the share of the flux in each second that sits within 25 ms of a grid point."""
    out = []
    for w0 in np.arange(a, b, step):
        m = (t >= w0) & (t < w0 + step)
        tt, ee = t[m], e[m]
        d = (tt - phase) / period
        d = d - np.round(d)
        on = np.abs(d * period) < 0.025
        out.append((float(w0), float(ee[on].sum() / (ee.sum() + 1e-9))))
    return out


def rms_per(x, a, b, step):
    out = []
    for w0 in np.arange(a, b, step):
        seg = x[int(w0 * SR):int((w0 + step) * SR)]
        if len(seg):
            out.append({'t': round(float(w0), 3), 'db': round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1)})
    return out


def main():
    x = decode()
    duration = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MP3],
                                    check=True, capture_output=True, text=True).stdout)
    t, e = flux(x, 256)
    pt, pe = flux(x, 128, 150, 4000, med=61, smooth=5)

    # The opening's piano, note by note, to the silence before the kiss.
    piano = peaks_of(pt, pe, 0.3, 63.5, 0.16)
    # The kiss: the orchestra's burst, the strongest onset in the seconds after the silence.
    m = (t > 63.5) & (t < 67)
    kiss = round(float(t[m][np.argmax(e[m])]), 3)
    # The swing, at ~128 bpm. Fitted on its core and extended while it holds.
    sp, sph = comb(t, e, 76, 112, np.arange(0.462, 0.474, 0.0002))
    swing_hold = hold(t, e, sp, sph, 64, 150)
    swing = grid(t, e, sp, sph, kiss + 0.2, 143.6, div=2)
    # The waltz, 3/4 at 64 bars a minute: a bar comb, then beats on it.
    wp, wph = comb(t, e, 144, 166, np.arange(0.930, 0.946, 0.0002))
    waltz_hold = hold(t, e, wp, wph, 136, 176)
    waltz = grid(t, e, wp, wph, 141, 169.5, div=3)
    # The production number at ~123 bpm.
    npd, nph = comb(t, e, 210, 236, np.arange(0.482, 0.494, 0.0002))
    number_hold = hold(t, e, npd, nph, 186, 246)
    number = grid(t, e, npd, nph, 188, 240, div=2)
    # The choral waltz: a bar comb between 1.2 and 2.4 s, then beats.
    cp, cph = comb(t, e, 276, 330, np.arange(1.2, 2.4, 0.0005), sigma=0.03)
    chorus_hold = hold(t, e, cp, cph, 268, 342)
    chorus = grid(t, e, cp, cph, 270, 338, div=3, tol=0.06)
    # The stretches with no grid: onsets, spaced.
    stars = peaks_of(t, e, 166, 190, 0.12)
    bridge = peaks_of(t, e, 186, 210, 0.12)
    home = peaks_of(t, e, 236, 274, 0.12)
    piano2 = peaks_of(pt, pe, 336, 345, 0.16)
    look = peaks_of(pt, pe, 344, 400, 0.14)
    last = peaks_of(pt, pe, 398, duration, 0.2)
    # Every strong onset anywhere (the safety net for a strike on something the grids miss).
    strong = [q for q in peaks_of(t, e, 0, duration, 0.1) if q['s'] >= 0.25]

    out = {
        'source': 'apps/rube/src/shows/versions/la-la-land/lalaland-epilogue-demo.mp3',
        'duration': round(duration, 3),
        'piano': piano,
        'kiss': kiss,
        'swing': {'period': round(sp, 5), 'origin': round(sph, 4), 'beats': swing},
        'waltz': {'period': round(wp, 5), 'origin': round(wph, 4), 'beats': waltz},
        'stars': stars,
        'bridge': bridge,
        'number': {'period': round(npd, 5), 'origin': round(nph, 4), 'beats': number},
        'home': home,
        'chorus': {'period': round(cp, 5), 'origin': round(cph, 4), 'beats': chorus},
        'piano2': piano2,
        'look': look,
        'last': last,
        'strong': strong,
        'rms': rms_per(x, 0, duration, 1.0),
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=1)
        f.write('\n')

    def say(name, p, ph, h, g):
        held = ' '.join(f"{int(w)}:{q:.2f}" for w, q in h)
        print(f"{name}: period {p:.4f}s ({60 / p:.2f} bpm, bar {3 * p:.3f}s), beat k at {ph:.4f} + {p:.4f}k; {len(g)} grid points")
        print(f"  hold/s: {held}")
    print(f"piano: {len(piano)} notes, first {piano[0]['t']} last {piano[-1]['t']}; kiss {kiss}")
    say('swing', sp, sph, swing_hold, swing)
    say('waltz', wp, wph, waltz_hold, waltz)
    say('number', npd, nph, number_hold, number)
    say('chorus', cp, cph, chorus_hold, chorus)
    print(f"stars {len(stars)}, bridge {len(bridge)}, home {len(home)}, piano2 {len(piano2)}, look {len(look)}, last {len(last)}: " + ' '.join(f"{q['t']}({q['s']:.1f})" for q in last))


if __name__ == '__main__':
    main()

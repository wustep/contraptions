"""
Cornfield Chase, Opus 5.5 music-sync: the recording's onsets, measured once.

The arrangement (`scripts/shows/arrange-cornfield-opus55.ts`) reads the JSON this
writes and never the audio, so the build needs no Python. Rerun only if the
recording changes:

    python3 scripts/shows/cornfield-opus55-onsets.py

Needs ffmpeg, numpy and scipy. What it measures:

- The chase pulse. A comb fitted over 42–118 s of spectral flux gives
  0.625 s (96.0 bpm), beat k at 0.008 + 0.625k s. The drop is beat 68.
  Every beat and every eighth of the chase is on that comb to a few ms.
- The piano's own notes, 1–33 s. That section is rubato; no comb fits it.
- The organ's notes, 33.1–42.4 s, including the fill into the drop, which
  pulls against the comb.
- How loud each eighth of the chase is, so the loudest land first.
"""
import json
import os
import subprocess
import tempfile

import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as sg

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/cornfield-chase/cornfield-chase-zimmer.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/cornfield-opus55-onsets.json')
SR = 22050


def decode():
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'cc.wav')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', MP3, '-ac', '1', '-ar', str(SR), wav], check=True)
        _, x = wavfile.read(wav)
    return x.astype(np.float64) / 32768


def flux(x, hop, lo=0, hi=SR / 2, med=31, smooth=1):
    f, t, z = sg.stft(x, SR, nperseg=2048, noverlap=2048 - hop, boundary=None)
    band = (f >= lo) & (f < hi)
    m = np.log1p(1000 * np.abs(z[band]))
    d = np.maximum(0, np.diff(m, axis=1)).sum(0)
    d = np.maximum(0, d - sg.medfilt(d, med))
    if smooth > 1:
        d = np.convolve(d, np.ones(smooth) / smooth, 'same')
    return t[1:], d


def comb(tt, e, a, b, periods, sigma=0.015):
    m = (tt >= a) & (tt < b)
    tt, e = tt[m], e[m]
    best = (0.0, 0.0, 0.0)
    for p in periods:
        for ph in np.arange(0, p, 0.002):
            d = (tt - ph) / p
            d = d - np.round(d)
            s = float((e * np.exp(-(d * p) ** 2 / (2 * sigma ** 2))).sum())
            if s > best[0]:
                best = (s, float(p), float(ph))
    return best[1], best[2]


def notes(tt, e, a, b, spacing):
    fps = 1 / (tt[1] - tt[0])
    peaks, _ = sg.find_peaks(e, distance=max(1, int(spacing * fps)))
    peaks = [i for i in peaks if a <= tt[i] < b]
    top = np.percentile([e[i] for i in peaks], 95)
    return [{'t': round(float(tt[i]), 3), 's': round(float(e[i] / top), 3)} for i in peaks]


def main():
    x = decode()
    # The recording's own length, as the player reports it; the decoded samples lose the encoder's priming.
    duration = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MP3],
                                    check=True, capture_output=True, text=True).stdout)

    # The chase comb, from broadband flux.
    tt, e = flux(x, 256)
    period, phase = comb(tt, e, 42.3, 118, np.arange(0.622, 0.630, 0.0002))
    # Name the beats from the drop: the beat nearest the loudest onset near 42.5 s.
    near = (tt > 42.0) & (tt < 43.0)
    drop_onset = float(tt[near][np.argmax(e[near])])
    drop_beat = int(round((drop_onset - phase) / period))
    origin = phase + (drop_beat - 68) * period  # beat k is origin + k * period, the drop is beat 68

    # Each eighth of the chase, how loud it is on the comb: the strongest onset within 40 ms.
    fps = 1 / (tt[1] - tt[0])
    sm = np.convolve(e, np.ones(3) / 3, 'same')
    peaks, _ = sg.find_peaks(sm, distance=int(0.12 * fps))
    pt, ps = tt[peaks], sm[peaks]
    eighths = []
    for half in range(68 * 2, 200 * 2):
        g = origin + half * period / 2
        if g > len(x) / SR - 1:
            break
        m = np.abs(pt - g) < 0.04
        eighths.append({
            'beat': half / 2,
            't': round(float(g), 4),
            'onset': round(float(pt[m][np.argmax(ps[m])]), 3) if m.any() else None,
            's': round(float(ps[m].max()), 4) if m.any() else 0.0,
        })
    top = np.percentile([q['s'] for q in eighths if q['s'] > 0], 95)
    for q in eighths:
        q['s'] = round(q['s'] / top, 3)

    # The piano (mid band, finer hop), and the organ's gathering.
    pt2, pe2 = flux(x, 128, 150, 4000, med=61, smooth=5)
    piano = notes(pt2, pe2, 1.0, 33.0, 0.18)
    organ = notes(tt, sm, 33.0, drop_onset - 0.15, 0.2)

    # The last hit before the decay: the strongest onset on the comb after 118 s.
    tail = [q for q in eighths if q['t'] > 118 and q['onset'] is not None]
    last = max(tail, key=lambda q: q['s'])

    out = {
        'source': 'apps/rube/src/shows/versions/cornfield-chase/cornfield-chase-zimmer.mp3',
        'duration': round(duration, 3),
        'period': round(period, 5),
        'origin': round(origin, 4),
        'drop': {'beat': 68, 't': round(drop_onset, 3)},
        'organ': round(float(organ[0]['t']), 3) if organ else None,
        'last': {'beat': last['beat'], 't': last['onset']},
        'piano': piano,
        'gather': organ,
        'eighths': eighths,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=1)
        f.write('\n')
    print(f"period {period:.5f}s ({60 / period:.2f} bpm), beat 68 at {origin + 68 * period:.3f}s, drop onset {drop_onset:.3f}s")
    print(f"piano {len(piano)} notes, gather {len(organ)} onsets, chase {len(eighths)} eighths, last hit {last['onset']}s (beat {last['beat']})")


if __name__ == '__main__':
    main()

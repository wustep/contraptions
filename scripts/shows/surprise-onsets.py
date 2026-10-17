"""
Composure: the Surprise Symphony's Andante, measured once, in show time.

Composure plays the second movement of Haydn's Symphony No. 94 in G major, "Surprise" (1791), in Herbert von Karajan's
recording with the Berlin Philharmonic (Deutsche Grammophon, 1982), from Universal Music Group's own upload to YouTube
(14G_PDZWXVE), from the video's first second, so show time is the video's time. Nothing of the recording is shipped.
This reads a local analysis copy that never leaves the machine it is made on:

    yt-dlp --js-runtimes node -f 'bestaudio[ext=m4a]' -o out/surprise/14G_PDZWXVE.m4a \\
        'https://www.youtube.com/watch?v=14G_PDZWXVE'
    python3 scripts/shows/surprise-onsets.py

and writes scripts/shows/plans/surprise-onsets.json, which the show is timed to and check:shows holds it against.
Needs ffmpeg (or FFMPEG=<path>) and numpy. SURPRISE_AUDIO=<path> reads another copy.

The movement is a theme in C major and four variations on it, in 2/4, every strain of eight bars played twice. The
orchestra is played, not clocked: a quarter is 0.85 to 0.98 s, it breathes between strains, and it stops dead twice (the
fermata before the third variation, the general pause before the fourth's last strain). So there is no one comb. Each
strain gets its own, fitted to the attacks under it from where the strain is known to begin (`FORM`: the downbeats
are set by ear, within a beat, and the fit finds them), and every beat of it is moved onto its own attack where one is
within 45 ms. The bars are numbered as they are played, repeats and all, 1 to 181.

    bars   1–16   the theme's first strain, p, and again pp; on beat 2 of bar 16 the surprise: fortissimo, timpani
    bars  17–32   its second strain, twice, a forte in its sixth bar each time
    bars  33–64   variation 1: a forte chord at the head of each first strain, the violins' semiquavers over it
    bars  65–98   variation 2, C minor: four bars fortissimo, four piano, twice; the second strain fortissimo, longer,
                  down to the violins alone and a fermata
    bars  99–130  variation 3: the oboe's repeated semiquavers, the flute with it on the repeats, piano
    bars 131–168  variation 4: fortissimo with the violins in triplets; dolce; the second strain piano, a general pause,
                  and then fortissimo to the end of it and on
    bars 169–181  the coda: the theme's head over a held C, diminished sevenths, softer, and the last chord

What it measures:

- `phrases`: each strain's first bar, its played bar number, its length in bars, and its fitted quarter.
- `beats`: every beat of every strain, on its own attack where one is within 45 ms (`heard`), with how strongly
  something starts there (`s`, spectral flux over its local mean) and how loud it is (`db`, against the loudest).
- `onsets`: every onset, a peak of spectral flux over its local mean, with the rise in loudness across it (`jump`, dB).
- `surprise` and `last`: the surprise chord, and the last chord.
- `rms`: loudness every quarter second, 0 to 1 against the loudest.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('SURPRISE_AUDIO', os.path.join(ROOT, 'out/surprise/14G_PDZWXVE.m4a'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/surprise-onsets.json')

SR = 22050
HOP = 256
N = 1024
FR = SR / HOP

# The strains, in order: a key, what it is, its first played bar, how many bars, and its first downbeat by ear
# (seconds into the video, within a beat; the fit finds it).
FORM = [
    ('theme-a', 'the theme, p', 1, 8, 1.80),
    ('theme-a2', 'the theme again, pp, and the surprise', 9, 8, 16.55),
    ('theme-b', 'the second strain', 17, 8, 30.83),
    ('theme-b2', 'the second strain again', 25, 8, 46.10),
    ('var1-a', 'variation 1, the forte chord', 33, 8, 61.10),
    ('var1-a2', 'variation 1 again, the forte chord', 41, 8, 75.17),
    ('var1-b', 'variation 1, the second strain', 49, 8, 89.42),
    ('var1-b2', 'variation 1, the second strain again', 57, 8, 103.70),
    ('var2-a', 'variation 2, C minor, fortissimo', 65, 8, 118.04),
    ('var2-a2', 'variation 2 again', 73, 8, 132.58),
    ('var2-b', 'variation 2, the second strain, fortissimo', 81, 8, 147.20),
    ('var2-b2', 'variation 2, on, to the violins alone and the fermata', 89, 10, 161.55),
    ('var3-a', 'variation 3, the oboe', 99, 8, 180.47),
    ('var3-a2', 'variation 3 again, the flute with it', 107, 8, 194.27),
    ('var3-b', 'variation 3, the second strain', 115, 8, 208.80),
    ('var3-b2', 'variation 3, the second strain again', 123, 8, 223.22),
    ('var4-a', 'variation 4, fortissimo, the violins in triplets', 131, 8, 238.38),
    ('var4-a2', 'variation 4, dolce', 139, 8, 252.50),
    ('var4-b', 'variation 4, the second strain, piano', 147, 8, 266.97),
    ('var4-b2', 'after the general pause, fortissimo', 155, 8, 284.09),
    ('var4-on', 'fortissimo, on', 163, 6, 298.90),
    ('coda', 'the coda', 169, 13, 311.27),
]


def load(path):
    raw = subprocess.run([FFMPEG, '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def main():
    x = load(AUDIO)
    duration = len(x) / SR
    frames = (len(x) - N) // HOP
    win = np.hanning(N).astype(np.float32)
    flux = np.zeros(frames)
    db = np.zeros(frames)
    prev = None
    # In blocks, so the whole spectrogram never has to be held at once.
    for start in range(0, frames, 4096):
        idx = np.arange(N)[None, :] + HOP * np.arange(start, min(frames, start + 4096))[:, None]
        seg = x[idx]
        spec = np.log1p(100 * np.abs(np.fft.rfft(seg * win, axis=1)))
        db[start:start + len(seg)] = 20 * np.log10(np.sqrt((seg ** 2).mean(1)) + 1e-6)
        d = np.diff(spec, axis=0, prepend=spec[:1] if prev is None else prev[None, :])
        flux[start:start + len(seg)] = np.maximum(0, d).sum(1)
        prev = spec[-1]
    top = db.max()
    db -= top
    # Flux over its own local mean (3 s), so a soft strain's attacks count as much as a loud one's.
    k = int(FR * 1.5)
    c = np.cumsum(np.r_[0, np.pad(flux, (k, k), mode='edge')])
    mean = ((c[2 * k + 1:] - c[:-2 * k - 1]) / (2 * k + 1))[:frames]
    nov = np.maximum(0, flux / (mean + 1e-3) - 1)

    def peak_near(t, tol=0.045):
        i = int(round(t * FR))
        w = int(tol * FR)
        lo = max(0, i - w)
        seg = nov[lo:i + w + 1]
        j = int(np.argmax(seg))
        return (lo + j) / FR, float(seg[j])

    def loud_at(t):
        i = int(t * FR)
        return float(db[i:i + int(0.12 * FR)].max())

    def fit(t0, quarters):
        # The comb whose beats sit on the strongest attacks, downbeats counted double: a period near 0.9 s and a phase
        # within 0.12 s of the downbeat heard.
        best = None
        for p in np.arange(0.80, 1.00, 0.002):
            for phi in np.arange(t0 - 0.12, t0 + 0.12, 0.004):
                score = sum(peak_near(phi + j * p, 0.035)[1] * (2 if j % 2 == 0 else 1) for j in range(quarters))
                if best is None or score > best[0]:
                    best = (score, p, phi)
        return best[1], best[2]

    phrases = []
    beats = []
    for key, what, bar, bars, t0 in FORM:
        p, phi = fit(t0, bars * 2)
        phrases.append({'key': key, 'what': what, 'bar': bar, 'bars': bars, 't': None, 'quarter': round(float(p), 4)})
        for j in range(bars * 2):
            comb = phi + j * p
            at, s = peak_near(comb)
            heard = s >= 0.25
            t = at if heard else comb
            beats.append({'t': round(float(t), 3), 'bar': bar + j // 2, 'beat': j % 2 + 1, 'heard': bool(heard),
                          's': round(s, 2), 'db': round(loud_at(t), 1)})
        phrases[-1]['t'] = beats[-bars * 2]['t']
    # A strain that slows into the next (the dolce into the fourth variation's second strain) can run its last beat
    # onto the next strain's first: such a beat goes midway between its neighbours, on an attack if one is there.
    for i in range(1, len(beats) - 1):
        if beats[i]['t'] > beats[i + 1]['t'] - 0.3:
            mid = (beats[i - 1]['t'] + beats[i + 1]['t']) / 2
            at, s = peak_near(mid)
            heard = s >= 0.25
            t = at if heard else mid
            beats[i].update({'t': round(float(t), 3), 'heard': bool(heard), 's': round(s, 2), 'db': round(loud_at(t), 1)})

    # Every onset: a local peak of the flux well over its mean, with the rise in loudness across it.
    onsets = []
    for i in range(2, frames - 2):
        if nov[i] < 0.8 or flux[i] < flux[i - 2:i + 3].max():
            continue
        pre = float(db[max(0, i - int(0.25 * FR)):max(1, i - int(0.03 * FR))].mean())
        post = float(db[i:i + int(0.15 * FR)].max())
        onsets.append({'t': round(i / FR, 3), 's': round(float(nov[i]), 2), 'jump': round(post - pre, 1), 'db': round(post, 1)})

    surprise = max((o for o in onsets if 25 < o['t'] < 35), key=lambda o: o['jump'])['t']
    # The last chord: the last onset with a real rise in it before the end's silence.
    last = [o for o in onsets if o['t'] > 330 and o['jump'] > 12][-1]['t']

    q = int(0.25 * FR)
    rms = [float(np.sqrt(np.mean(10 ** (db[i:i + q] / 10)))) for i in range(0, frames, q)]
    peak = max(rms)
    out = {
        'source': 'Haydn, Symphony No. 94 "Surprise", II. Andante · Berliner Philharmoniker, Herbert von Karajan '
                  '(DG 1982) · YouTube 14G_PDZWXVE (Universal Music Group)',
        'duration': round(duration, 3),
        'surprise': surprise,
        'last': last,
        'phrases': phrases,
        'beats': beats,
        'onsets': onsets,
        'rms': [round(v / peak, 3) for v in rms],
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    heard = sum(b['heard'] for b in beats)
    print(f'{len(beats)} beats ({heard} on their own attack), {len(onsets)} onsets, surprise {surprise}, last {last}')
    for ph in phrases:
        print(f"  bar {ph['bar']:3d}  {ph['t']:8.3f}  q {ph['quarter']:.3f}  {ph['what']}")


if __name__ == '__main__':
    main()

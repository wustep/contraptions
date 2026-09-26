"""
Grieg, "In the Hall of the Mountain King": the recording's clock, measured once.

The Mountain King show plays apps/rube/src/shows/versions/mountain-king/grieg-mountain-king-musopen.mp3 (the Czech
National Symphony Orchestra for Musopen, public domain; see ATTRIBUTION.txt beside it) whole, from its first sample,
so show time is the recording's time. This reads it and writes scripts/shows/plans/mountain-king-onsets.json, which
the parts are timed to and check:shows holds them against. Rerun only if the recording changes:

    python3 scripts/shows/mountain-king-onsets.py

Needs ffmpeg and numpy. The piece is one theme, four bars long, played eighteen times without a break, faster and
louder each time, then a coda of hammered chords, a silence, a roll and two last chords. The tempo never holds
still, so there is no comb: the beat is followed one quarter note at a time.

- `onsets`: every onset of the whole recording, a peak of spectral flux over its local mean. Its strength `s` is
  against the surrounding eight seconds (the piece grows by 25 dB, so an onset in the hush and one in the uproar
  are each measured against their own neighbours); `g` is against the whole track. `lo` (30-250 Hz: basses,
  bassoons, timpani, bass drum), `mid` (250-2000: the tune, the horns) and `hi` (2-11 kHz: cymbals, violins' bite)
  say what it is, each against that band's own local level.
- `beats`: every quarter note from the theme's first note (4.41 s) to the coda's first chord (134.26 s), 290 of
  them: tracked by dynamic programming over the flux with a tempo that may drift (a prior found by local comb fits),
  then smoothed by a local quadratic through ±6 beats, so a beat is where the orchestra's pulse is and not where
  one section of it happened to speak. `raw` keeps the tracked frames; `onset` is the strongest measured onset
  within 35 ms of each beat, where there is one.
- `eighths`: every eighth note on that grid (a beat and the midpoint to the next), with the strongest onset within
  30 ms and its strength by band: what a part picks its strikes from.
- `form`: the phrases. The theme is four bars (32 eighths): bar 1 seven notes, bar 2 two short figures, bar 3 eight
  notes, bar 4 five notes and a long one. A phrase starts every 16 beats; the eighteen of them go A A B B A A three
  times (B is the theme a fifth up), each statement faster and louder than the last. `key` is the phrase's best
  chroma match to the theme (a check that the bar lines are where the tune says).
- `coda`: from 134.26 the orchestra stops playing the tune and hammers chords: each chord's time and strength, the
  silence, the roll and the two last chords.
- `landmarks`, `loudness` (dB every tenth of a second).
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REL = 'apps/rube/src/shows/versions/mountain-king/grieg-mountain-king-musopen.mp3'
MP3 = os.path.join(ROOT, REL)
OUT = os.path.join(ROOT, 'scripts/shows/plans/mountain-king-onsets.json')
SR = 22050
HOP = 128
N = 1024
FR = SR / HOP
BANDS = {'lo': (30, 250), 'mid': (250, 2000), 'hi': (2000, 11000)}
# The theme, as scored (in B minor; the B phrases are the same shape a fifth up): each eighth of a phrase, in
# semitones over the tonic, and whether a note starts there (0 is a note held over from the one before).
THEME = [0, 2, 3, 5, 7, 3, 7, 7, 6, 2, 6, 6, 5, 1, 5, 5, 0, 2, 3, 5, 7, 3, 7, 12, 10, 7, 3, 7, 10, 10, 10, 10]
SOUNDED = [1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0]


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', MP3, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def fluxes(x):
    """Spectral flux (log magnitude, positive differences), whole band and per band, every HOP samples."""
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    idx = np.arange(N)[None, :]
    freqs = np.fft.rfftfreq(N, 1 / SR)
    masks = {k: (freqs >= a) & (freqs < b) for k, (a, b) in BANDS.items()}
    whole = np.zeros(frames)
    band = {k: np.zeros(frames) for k in BANDS}
    prev = None
    for s in range(0, frames, 4000):
        f = np.arange(s, min(frames, s + 4000))
        m = np.log1p(1000 * np.abs(np.fft.rfft(x[f[:, None] * HOP + idx] * win, axis=1)))
        if prev is not None:
            d = np.maximum(0, np.diff(np.vstack([prev[None, :], m]), axis=0))
            at = f
        else:
            d = np.maximum(0, np.diff(m, axis=0))
            at = f[1:]
        whole[at] = d.sum(1)
        for k in BANDS:
            band[k][at] = d[:, masks[k]].sum(1)
        prev = m[-1]
    t = (np.arange(frames) * HOP + N / 2) / SR
    return t, whole, band


def novelty(d, med=81):
    """The flux less its running mean over ~0.47 s, lightly smoothed: what stands out of its surroundings."""
    e = np.maximum(0, d - np.convolve(d, np.ones(med) / med, 'same'))
    return np.convolve(e, np.ones(3) / 3, 'same')


def local(sm, half=4.0):
    """Novelty over its own 95th percentile in the surrounding 2·half seconds."""
    W = int(half * FR)
    loc = np.zeros_like(sm)
    for i in range(0, len(sm), 40):
        a = max(0, i - W)
        b = min(len(sm), i + W)
        loc[i:i + 40] = np.percentile(sm[a:b], 95)
    return sm / np.maximum(loc, 1e-9)


def onsets(t, sm, loc, bands):
    top = float(np.percentile(sm, 99))
    w = int(0.04 * FR)
    out = []
    for i in range(w, len(sm) - w):
        if loc[i] < 0.25 or sm[i] < sm[i - w:i + w + 1].max() or sm[i] == sm[i - 1]:
            continue
        a, b, c = sm[i - 1], sm[i], sm[i + 1]
        den = a - 2 * b + c
        off = 0.5 * (a - c) / den if den != 0 else 0.0
        o = {'t': round(float(t[i] + off * HOP / SR), 3), 's': round(float(loc[i]), 2), 'g': round(float(sm[i] / top), 3)}
        for k, v in bands.items():
            o[k] = round(float(v[i - 2:i + 3].max()), 2)
        out.append(o)
    return out


def comb_fit(t, e, a, b, lo, hi, step):
    """The comb of period in [lo, hi) that best fits the flux between a and b, with its strength."""
    m = (t > a) & (t < b)
    tt, ee = t[m], e[m] / (e[m].max() + 1e-12)
    out = []
    for p in np.arange(lo, hi, step):
        out.append((abs((ee * np.exp(2j * np.pi * tt / p)).sum()), float(p)))
    return out


def tempo_prior(t, o, until):
    """The quarter note's length through the piece: comb fits over eight seconds every two, each the peak nearest
    the one before (the tempo drifts; it does not jump), median-smoothed."""
    centres = np.arange(8.0, until - 2.0, 2.0)
    est = []
    last = None
    for c in centres:
        fits = comb_fit(t, o, c - 4, c + 4, 0.28, 0.64, 0.002)
        if last is None:
            # The opening's quarter note is slow (a march at about 105): start from the quarter, not the eighth.
            z, p = max((z, p) for z, p in fits if p >= 0.45)
        else:
            near = [(z, p) for z, p in fits if abs(p - last) < 0.035]
            z, p = max(near)
        est.append(p)
        last = p
    est = np.array(est)
    sm = np.array([np.median(est[max(0, i - 2):i + 3]) for i in range(len(est))])
    return centres, sm


def track(t, o, centres, prior, a, b, alpha=100.0):
    """Quarter notes from a to b: dynamic programming over the flux, each step within a fifth of the prior's."""
    P = np.interp(t, centres, prior) * FR
    start = np.searchsorted(t, a)
    stop = np.searchsorted(t, b)
    score = np.full(len(o), -1e9)
    back = np.full(len(o), -1)
    for i in range(start, stop):
        p = P[i]
        lo, hi = int(i - 1.25 * p), int(i - 0.8 * p)
        best, bj = o[i], -1
        if lo >= start:
            js = np.arange(lo, hi + 1)
            cand = score[js] - alpha * np.log((i - js) / p) ** 2
            k = int(np.argmax(cand))
            if cand[k] > -1e8:
                best, bj = o[i] + cand[k], js[k]
        score[i], back[i] = best, bj
    seg = stop - int(P[stop - 1])
    i = int(np.argmax(score[seg:stop])) + seg
    beats = []
    while i >= 0:
        beats.append(i)
        i = back[i]
    return t[np.array(beats[::-1])]


def smooth_grid(raw, half=6):
    """Each beat on a quadratic through its ±half neighbours (time against beat number)."""
    n = len(raw)
    out = np.zeros(n)
    k = np.arange(n, dtype=float)
    for i in range(n):
        a, b = max(0, i - half), min(n, i + half + 1)
        c = np.polyfit(k[a:b] - i, raw[a:b], 2)
        out[i] = c[-1]
    return out


def strongest(ons, g, w):
    near = [o for o in ons if abs(o['t'] - g) <= w]
    return max(near, key=lambda o: o['s']) if near else None


def chroma_key(x, eighths, phrase):
    """Which transposition of the theme a phrase's 32 eighths match best, and how well."""
    Nc = 4096
    win = np.hanning(Nc)
    f = np.fft.rfftfreq(Nc, 1 / SR)
    band = np.where((f > 55) & (f < 1100))[0]
    pcs = np.array([int(np.round(12 * np.log2(f[k] / 261.6256))) % 12 for k in band])
    C = []
    for g in eighths[32 * phrase:32 * phrase + 32]:
        c = int((g + 0.06) * SR)
        m = np.abs(np.fft.rfft(x[c - Nc // 2:c + Nc // 2] * win))[band]
        ch = np.zeros(12)
        np.add.at(ch, pcs, m)
        ch = np.log1p(100 * ch / (ch.max() + 1e-12))
        ch -= ch.mean()
        ch /= np.linalg.norm(ch) + 1e-9
        C.append(ch)
    names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    best = max((float(np.mean([C[j][(11 + THEME[j] + s) % 12] for j in range(len(C))])), s) for s in range(12))
    return names[(11 + best[1]) % 12], round(best[0], 3)


def main():
    x = decode()
    duration = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MP3],
                                    check=True, capture_output=True, text=True).stdout)
    t, whole, band = fluxes(x)
    sm = novelty(whole)
    loc = local(sm)
    bands = {k: local(novelty(v)) for k, v in band.items()}
    ons = onsets(t, sm, loc, bands)

    # The beat: a prior from comb fits, then the quarters one by one from the theme's first note to the coda.
    o = np.minimum(loc, 3.0)
    centres, prior = tempo_prior(t, o, 134.0)
    # Tracked on to the coda's first chord (a beat after the last bar line: the chord lands on its second beat), which
    # anchors the last bars, and then that chord is left off the grid: it is the coda's.
    raw = track(t, o, centres, prior, 4.2, 134.4)
    grid = smooth_grid(raw)[:-1]
    raw = raw[:-1]
    beats = []
    for i, g in enumerate(grid):
        b = {'k': i, 't': round(float(g), 4), 'raw': round(float(raw[i]), 4)}
        s = strongest(ons, g, 0.035)
        if s:
            b.update({'onset': s['t'], 's': s['s']})
        beats.append(b)
    eighth_t = np.sort(np.concatenate([grid, (grid[:-1] + grid[1:]) / 2]))
    eighths = []
    for k, g in enumerate(eighth_t):
        e = {'k': k, 't': round(float(g), 4)}
        s = strongest(ons, g, 0.03)
        if s:
            e.update({'onset': s['t'], 's': s['s'], 'lo': s['lo'], 'mid': s['mid'], 'hi': s['hi']})
        else:
            e['s'] = 0
        eighths.append(e)

    # The form: a phrase every 16 beats, A A B B A A three times.
    labels = ['A', 'A', 'B', 'B', 'A', 'A'] * 3
    phrases = []
    for n in range(18):
        key, fit = chroma_key(x, eighth_t, n)
        phrases.append({'n': n, 't': round(float(grid[16 * n]), 4), 'part': labels[n], 'statement': n // 6 + 1, 'key': key, 'fit': fit})

    # Loudness every tenth of a second.
    step = int(0.1 * SR)
    db = []
    for i in range(0, len(x) - step, step):
        seg = x[i:i + step]
        db.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))

    def peak(a, b, key='g'):
        return max((o for o in ons if a <= o['t'] < b), key=lambda o: o[key])

    # The coda: the chords the orchestra hammers once the tune is done, every onset that stands out (s >= 0.9)
    # from the first chord to the last run of six, then the silence, the roll and the two last chords.
    first_chord = peak(134.0, 134.6)['t']
    chords = [{'t': o['t'], 's': o['s'], 'g': o['g']} for o in ons if first_chord - 1e-6 <= o['t'] < 146.9 and o['s'] >= 0.9]
    silence = next(i / 10 for i in range(1466, 1490) if db[i] < -30)
    roll = next(o['t'] for o in ons if o['t'] > silence + 0.3 and o['s'] >= 1.0)
    last1 = peak(149.3, 149.7)['t']
    last2 = peak(149.7, 150.0)['t']
    end = next(i / 10 for i in range(int(last2 * 10), len(db)) if db[i] < -45)

    first_sound = next(i / 10 for i in range(len(db)) if db[i] > -60)
    loud = next(i / 10 for i in range(950, 1100) if db[i] > -20)
    landmarks = {
        'first_sound': first_sound,
        'theme': round(float(grid[0]), 4),
        'statement2': phrases[6]['t'],
        'statement3': phrases[12]['t'],
        'ff': loud,
        'coda': first_chord,
        'silence': silence,
        'roll': roll,
        'last1': last1,
        'last2': last2,
        'end': end,
    }
    out = {
        'source': REL,
        'duration': round(duration, 3),
        'onsets': ons,
        'beats': beats,
        'eighths': eighths,
        'form': {'theme': THEME, 'sounded': SOUNDED, 'phrases': phrases},
        'coda': {'chords': chords},
        'landmarks': landmarks,
        'loudness': {'step': 0.1, 'db': db},
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')

    print(f'{len(ons)} onsets, duration {duration:.3f}')
    iv = np.diff(grid)
    print(f'{len(grid)} beats {grid[0]:.3f} → {grid[-1]:.3f}; quarter {iv[0]:.3f} s at the start, {iv[-1]:.3f} at the end')
    res = 1000 * (raw - grid)
    print(f'  tracked beats off the smooth grid: rms {np.sqrt((res ** 2).mean()):.1f} ms, max {np.abs(res).max():.1f}')
    on = [1000 * (b['onset'] - b['t']) for b in beats if 'onset' in b and b['s'] >= 1.0]
    print(f'  strong onsets on the beats: {len(on)} of {len(beats)}, median {np.median(on):.1f} ms, p10 {np.percentile(on, 10):.1f}, p90 {np.percentile(on, 90):.1f}')
    strong = [o for o in ons if 4.3 < o['t'] < 134.2 and o['s'] >= 1.0]
    hit = [o for o in strong if min(abs(o['t'] - g) for g in eighth_t) <= 0.03]
    print(f'  strong onsets (s >= 1) within 30 ms of an eighth: {len(hit)} of {len(strong)}')
    for a in range(0, 135, 10):
        m = (grid[:-1] >= a) & (grid[:-1] < a + 10)
        if m.any():
            print(f'    {a:3d}-{a + 10:3d} s: quarter {iv[m].mean():.4f} s ({60 / iv[m].mean():.1f} bpm)')
    print('phrases:', ' '.join(f"{p['t']:.2f}{p['part']}({p['key']} {p['fit']:.2f})" for p in phrases))
    print(f'coda: {len(chords)} chords:', ' '.join(f"{c['t']:.2f}" for c in chords))
    print('landmarks:', json.dumps(landmarks))


if __name__ == '__main__':
    main()

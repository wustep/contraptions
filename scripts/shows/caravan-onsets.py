"""
Whiplash, "Caravan": the recording's clock, measured once.

The show plays apps/rube/src/shows/versions/caravan/whiplash-caravan-demo.mp3 (demo only; see
apps/rube/src/shows/versions/caravan/ATTRIBUTION.txt) whole, from its first sample, so show time is the recording's
time. This reads it and writes scripts/shows/plans/caravan-onsets.json, which the parts are timed to and check:shows
holds them against. Rerun only if the recording changes:

    python3 scripts/shows/caravan-onsets.py

Needs ffmpeg and numpy. The track is John Wasson's big-band arrangement of Caravan as the film's finale plays it:
a drum intro, the band's tune, the band's last chord and cut-off, then the drummer's solo, and the band again for
one chord at the very end. It keeps time two ways, so the file holds both:

- `onsets`: every onset of the whole recording, a peak of spectral flux over its local mean, with how strong it is
  (1 is the track's 99th percentile of flux) and how much of it is low (kick, toms, bass: 30-200 Hz), middle
  (snare, horns: 200-3000 Hz) and high (cymbals, hi-hat: 5-11 kHz), each against that band's own 99th percentile.
- `tune`: the tune is on a click. From the first stroke of the drum intro to the last chorus, a quarter note is
  0.2143 s (280 bpm) to within ±17 ms everywhere. The comb's beat is the half note (0.4286 s, 140 a minute, the
  pulse you nod to), beat 0 is the intro's first stroke, and every beat, half-beat (a quarter note) and quarter-beat
  (an eighth note: the Latin sections are straight eighths) has its own nearest onset and strength. The last chorus drifts off the click by up to a tenth of a second, so it has its
  own comb (`shout`).
- `kit`: the solo's strokes band by band (270.3 s to the end): `kick` (low: kick and toms), `snare` (middle) and
  `cymbal` (high: cymbals and hi-hat), each its own peaks, so the fastest stretches (a snare stroke every 70 ms)
  are not run together as they are in the whole-band `onsets`.
- `ride`: the solo's rubato, stroke by stroke: the ride cymbal slows from a stroke every 0.17 s to one every 0.9 s,
  nearly stopping, then speeds up again to 0.14 s. Found by following the strokes one at a time.
- `landmarks`: the named moments (the bass's and the band's entrances, the tune's sections, the stop-time
  breaks, the band's held chord and its cut-off, the solo's stretches, the silence before the last chord, the last
  chord and the final cut-off).
- `loudness`: dB every tenth of a second, to drive what the music moves without striking.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REL = 'apps/rube/src/shows/versions/caravan/whiplash-caravan-demo.mp3'
MP3 = os.path.join(ROOT, REL)
OUT = os.path.join(ROOT, 'scripts/shows/plans/caravan-onsets.json')
SR = 22050
HOP = 128
N = 1024
BANDS = {'lo': (30, 200), 'mid': (200, 3000), 'hi': (5000, 11000)}


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


def onsets(t, sm, bands):
    top = float(np.percentile(sm, 99))
    btop = {k: float(np.percentile(v, 99)) for k, v in bands.items()}
    w = int(0.04 * SR / HOP)
    out = []
    for i in range(w, len(sm) - w):
        if sm[i] <= 0 or sm[i] < sm[i - w:i + w + 1].max() or sm[i] == sm[i - 1]:
            continue
        s = sm[i] / top
        if s < 0.1:
            continue
        a, b, c = sm[i - 1], sm[i], sm[i + 1]
        den = a - 2 * b + c
        off = 0.5 * (a - c) / den if den != 0 else 0.0
        o = {'t': round(float(t[i] + off * HOP / SR), 3), 's': round(float(s), 3)}
        for k, v in bands.items():
            o[k] = round(float(v[i - 2:i + 3].max() / btop[k]), 2)
        out.append(o)
    return out, top


def comb_fit(t, e, a, b, lo, hi, step):
    """The comb of period in [lo, hi) that best fits the flux between a and b, and the time of one of its teeth."""
    m = (t > a) & (t < b)
    tt, ee = t[m], e[m]
    best = (0.0, 0.0, 0.0)
    for p in np.arange(lo, hi, step):
        z = (ee * np.exp(2j * np.pi * tt / p)).sum()
        if abs(z) > best[0]:
            best = (abs(z), float(p), float(((np.angle(z) / (2 * np.pi)) % 1) * p))
    return best[1], best[2]


def strongest(ons, g, w=0.035):
    """The strongest measured onset within `w` of `g`, or None."""
    near = [o for o in ons if abs(o['t'] - g) <= w]
    return max(near, key=lambda o: o['s']) if near else None


def beats_of(ons, origin, period, k0, k1, step=0.25):
    """Every beat of a comb from k0 to k1 and its eighths (k + 1/4, 1/2, 3/4: the tune is in cut time, so a beat is
    a half note and its quarters are eighth notes), each with its nearest strong onset (or none)."""
    out = []
    k = k0
    while k <= k1 + 1e-9:
        g = origin + period * k
        o = strongest(ons, g)
        b = {'k': k, 't': round(g, 4)}
        if o:
            b.update({'onset': o['t'], 's': o['s'], 'lo': o['lo'], 'mid': o['mid'], 'hi': o['hi']})
        else:
            b['s'] = 0
        out.append(b)
        k += step
    return out


def follow(ons, start, iv, until, floor=0.25):
    """A run of strokes followed one at a time: each the strongest onset near where the last interval says."""
    first = next(o for o in ons if o['t'] >= start and o['s'] >= 0.3)
    run = [first]
    while run[-1]['t'] < until:
        last = run[-1]['t']
        exp = last + iv
        cand = [o for o in ons if last + 0.7 * iv <= o['t'] <= last + 1.4 * iv and o['s'] >= floor]
        if not cand:
            break
        best = max(cand, key=lambda o: o['s'] * np.exp(-((o['t'] - exp) / (0.25 * iv)) ** 2))
        run.append(best)
        iv = best['t'] - last
    return [{'t': o['t'], 's': o['s']} for o in run if o['t'] <= until + 1e-9]


def main():
    x = decode()
    duration = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', MP3],
                                    check=True, capture_output=True, text=True).stdout)
    t, whole, band = fluxes(x)
    sm = novelty(whole)
    bands = {k: novelty(v) for k, v in band.items()}
    ons, _ = onsets(t, sm, bands)

    # The tune's click: a quarter note, fitted over the drum intro and the band's choruses, then the half note is
    # the beat, with beat 0 on the quarter nearest the intro's first stroke.
    q, qph = comb_fit(t, sm, 0.1, 250.0, 0.2138, 0.2148, 0.000002)
    first = ons[0]['t']
    k = round((first - qph) / q)
    origin = qph + k * q
    period = 2 * q
    # How far the flux sits off the click, ten seconds at a time (for the log).
    drift = []
    for a in range(0, 270, 10):
        m = (t > a) & (t < a + 10)
        z = (sm[m] * np.exp(2j * np.pi * (t[m] - origin) / q)).sum()
        drift.append((a, round(float(np.angle(z) / (2 * np.pi) * q * 1000), 1)))
    tune_end = 250.0
    tune = beats_of(ons, origin, period, 0, int((tune_end - origin) / period))
    # The last chorus, off the click: its own comb, on the same tempo, from the stop-time breaks to the held chord.
    sq, sph = comb_fit(t, sm, 242.0, 262.2, 0.2100, 0.2180, 0.00001)
    s_origin = sph + round((242.0 - sph) / sq) * sq
    shout = beats_of(ons, s_origin, 2 * sq, 0, int((262.2 - s_origin) / (2 * sq)))

    # The solo's strokes band by band: the kick and toms (low), the snare (middle), the cymbals and hi-hat (high),
    # each its own peaks within 25 ms either side. In the solo's fastest stretches the whole-band flux runs its strokes
    # together (the snare every 70 ms, the kick every 155 ms); these keep them apart.
    kit = {}
    w2 = int(0.025 * SR / HOP)
    for name, key in (('kick', 'lo'), ('snare', 'mid'), ('cymbal', 'hi')):
        v = bands[key]
        vtop = float(np.percentile(v, 99))
        out = []
        for i in range(np.searchsorted(t, 270.3), np.searchsorted(t, 549.5)):
            if v[i] <= 0 or v[i] < v[i - w2:i + w2 + 1].max() or v[i] == v[i - 1]:
                continue
            sv = v[i] / vtop
            if sv >= 0.35:
                out.append({'t': round(float(t[i]), 3), 's': round(float(sv), 3)})
        kit[name] = out

    # The rubato: the ride's strokes, followed one at a time. Quarters to 436 s, then eighths as it slows.
    ride = follow(ons, 432.6, 0.265, 436.0) + follow(ons, 436.0, 0.18, 484.0)
    ride = [r for i, r in enumerate(ride) if i == 0 or r['t'] - ride[i - 1]['t'] > 0.05]

    # Loudness every tenth of a second.
    step = int(0.1 * SR)
    db = []
    for i in range(0, len(x) - step, step):
        seg = x[i:i + step]
        db.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))

    def quiet_after(a, b, thresh):
        """The first tenth of a second in [a, b) quieter than `thresh` dB."""
        for i in range(int(a * 10), int(b * 10)):
            if db[i] < thresh:
                return round(i / 10, 1)
        return None

    def peak(a, b, min_s=0.5):
        o = max((o for o in ons if a <= o['t'] < b and o['s'] >= min_s), key=lambda o: o['s'])
        return o['t']

    landmarks = {
        'first': first,
        # The bass comes in under the drums: the first strong low onset after 20 s.
        'bass': next(o['t'] for o in ons if o['t'] > 20.5 and o['lo'] >= 0.8 and o['s'] >= 0.2),
        # The horns come in with the tune.
        'band': peak(30.3, 31.0),
        # The tune's first chorus drops to its quiet stretch (a solo over the rhythm section), and comes back.
        'quiet': quiet_after(129.5, 131.5, -18),
        'loud': 172.2,
        # The stop-time breaks: the band's hits with the silences between.
        'breaks': [o['t'] for o in ons if 226.9 <= o['t'] <= 234.1 and o['s'] >= 1.1],
        # The last chorus's last hit, the held chord, and the conductor's cut-off (the chord's drop into silence).
        'button': peak(260.8, 261.5),
        'chord': 262.03,
        'cutoff': quiet_after(268.5, 271.0, -16),
        # The solo, from its first stroke.
        'solo': peak(270.4, 270.6, 0.8),
        'hush': peak(323.0, 323.5),
        'build': peak(369.8, 370.1),
        'rubato': 423.34,
        'ride': ride[0]['t'],
        'slowest': max(range(1, len(ride)), key=lambda i: ride[i]['t'] - ride[i - 1]['t']),
        'swell': 484.0,
        'burst': 504.0,
        'roll': 519.0,
        'last_fill': peak(539.9, 540.1),
        'break': peak(541.3, 541.6),
        'last_chord': peak(543.0, 543.5),
        'final': peak(548.3, 548.8, 0.5),
        'end': quiet_after(548.6, 552.0, -30),
    }
    landmarks['slowest'] = ride[landmarks['slowest'] - 1]['t']

    out = {
        'source': REL,
        'duration': round(duration, 3),
        'onsets': ons,
        'tune': {'period': round(period, 6), 'origin': round(origin, 4), 'from': 0.0, 'to': tune_end, 'drift_ms': drift, 'beats': tune},
        'shout': {'period': round(2 * sq, 6), 'origin': round(s_origin, 4), 'from': 242.0, 'to': 262.2, 'beats': shout},
        'ride': ride,
        'kit': kit,
        'landmarks': landmarks,
        'loudness': {'step': 0.1, 'db': db},
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    print(f'{len(ons)} onsets, duration {duration:.3f}')
    print(f'tune: half note {period:.6f} s ({60 / period:.2f} a minute), beat 0 at {origin:.4f}; drift (ms): {drift}')
    strong = [b for b in tune if b['s'] >= 0.8 and 'onset' in b]
    dev = [1000 * (b['onset'] - b['t']) for b in strong]
    print(f'  strong beats off the click: median {np.median(dev):.1f} ms, p10 {np.percentile(dev, 10):.1f}, p90 {np.percentile(dev, 90):.1f}')
    print(f'shout: half note {2 * sq:.6f} s, beat 0 at {s_origin:.4f}')
    print(f'ride: {len(ride)} strokes, {ride[0]["t"]} to {ride[-1]["t"]}')
    print('solo strokes by band:', {k: len(v) for k, v in kit.items()})
    print('landmarks:', json.dumps(landmarks))


if __name__ == '__main__':
    main()

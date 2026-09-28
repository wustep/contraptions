"""
Soft Lamp: the radio's clock, measured once, in show time.

Soft Lamp plays Lofi Girl's "Best of lofi hip hop 2021" (YouTube n61ULEU7CO0) from the video's first second, so show
time is the video's time. Nothing of the mix is shipped: the show embeds the label's own upload. This reads a local
analysis copy of the video's first forty minutes, which never leaves the machine it is made on:

    yt-dlp -f 140 --download-sections "*0-2400" -o out/soft-lamp/n61ULEU7CO0-0-2400.m4a \\
        'https://www.youtube.com/watch?v=n61ULEU7CO0'
    python3 scripts/shows/soft-lamp-onsets.py

and writes scripts/shows/plans/soft-lamp-onsets.json, which the show is timed to and check:shows holds it against.
Needs ffmpeg (or FFMPEG=<path>), numpy and scipy. SOFTLAMP_AUDIO=<path> reads another copy.

The mix is a radio's hour cut into tracks with a breath of near-silence between them (a second or so, down past
-50 dB): no crossfades. Every track is made on a grid (a whole number of beats a minute, 65 to 94, the comb never
moving), and every one has the same shape, which is the shape the show is built on:

- an intro with no drums (keys, a pad, vinyl noise, rain), four to eight bars;
- the drums come in on a downbeat, and the groove runs in phrases of four and eight bars;
- most tracks drop the drums for a break of a few bars and bring them back on a downbeat;
- the drums leave for good on a downbeat, and a short outro rings out into the gap.

What it measures, per track:

- `from` and `to`: its first and last audible moments (the gap either side is quiet).
- `bpm`, `period` and `downbeat`: the comb (beat k at `downbeat + k * period`, a downbeat when k is a multiple of 4),
  fitted to the track's spectral flux; the bar's phase is the one the drums come in and go out on.
- `bars`: every downbeat from the first bar that starts in the track to the last.
- `drums`: per bar, whether the kit is playing (the kick and bass band and the hats band, against the track's own
  loudest bars), and `level`, how full the bar is, 0 to 1.
- `kick` and `snare`: per beat, how hard the low and the crack bands are struck, 0 to 1 against the track.
- `sections`: the runs of bars with drums and without.

And for the whole span, every fifth of a second: `rms` (loudness, 0 to 1) and `held` (how full the sustained sound is,
the pad and the keys, a median over each band so an attack counts for little), for the rain and the steam.
"""
import json
import os
import subprocess

import numpy as np
from scipy.signal import butter, sosfiltfilt

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('SOFTLAMP_AUDIO', os.path.join(ROOT, 'out/soft-lamp/n61ULEU7CO0-0-2400.m4a'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/soft-lamp-onsets.json')
YOUTUBE = 'n61ULEU7CO0'
SR = 22050
# The attack functions' frame, in samples: 4 ms. (Every frame here is a whole number of samples, and every time is
# counted in samples, so nothing drifts.)
STEP = 88

# The tracks, in the order the mix plays them, with the gap searched for on either side (seconds of video), from the
# album's own tracklist (Lofi Girl, "Best of lofi hip hop 2021", 2021). The video's edit of some tracks is a few
# seconds shorter than the album's; the gaps are measured, not taken from the album. The last has no gap after it:
# Passing By fades to -41 dB by 1812.4 s and Spanish Castle comes in under it, so the show's music stops there.
TRACKS = [
    ('morning moon', 'Kanisan, Wishes and Dreams', 0, 143.3),
    ('Lavender', 'Kupla', 143.3, 292.2),
    ('Destination Unknown', 'amies', 292.2, 462.7),
    ('Overgrown', 'Tenno', 462.7, 595.5),
    ('Magical Connection', 'Peak Twilight, Prithvi', 595.5, 749.3),
    ('Blooming Dales', 'Krynoze, Diiolme', 749.3, 914.2),
    ('Exhale', 'No Spirit', 914.2, 1080.7),
    ('Stargazing', 'kyu', 1080.7, 1214.4),
    ('Breathtaking', 'Purrple Cat', 1214.4, 1401.4),
    ('takeoff', 'stream_error', 1401.4, 1530.7),
    ('Daydream', 'kyu', 1530.7, 1692.4),
    ('Passing By', 'Casiio, Sleepermane', 1692.4, 1812.4),
]
BAR = 4


def decode():
    raw = subprocess.run([FFMPEG, '-loglevel', 'error', '-i', AUDIO, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def envelope_db(y, hop):
    n = len(y) // hop
    return 20 * np.log10(np.sqrt((y[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)


def edges(x, a, b):
    """The track's first and last audible moments in [a, b]: 20 ms frames over -45 dB, from each end."""
    h = 441
    db = envelope_db(x[int(a * SR):int(b * SR)], h)
    loud = np.where(np.convolve(db > -45, np.ones(3) / 3, 'same') > 0.5)[0]
    return a + loud[0] * h / SR, a + (loud[-1] + 1) * h / SR


def attacks(y, t0, bands):
    """How sharply the kick and the crack are struck, every 4 ms: each band's rise in dB over 12 ms, less a floor."""
    h = STEP
    out = 0
    for sos in bands:
        z = sosfiltfilt(sos, y)
        n = len(z) // h
        e = 20 * np.log10(np.sqrt((z[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9)
        r = np.zeros_like(e)
        r[3:] = e[3:] - e[:-3]
        out = out + np.maximum(0, r - 4)
    t = t0 + (np.arange(len(out)) + 0.5) * STEP / SR
    return t, out


def gathered(t, r, bpm):
    """How much of the attacks a comb at `bpm` (and its off-beats) gathers."""
    p = 60 / bpm
    return abs((r * np.exp(2j * np.pi * t / p)).sum()) + abs((r * np.exp(4j * np.pi * t / p)).sum())


def comb(t, r):
    """The comb that best gathers the attacks: its tempo, 60 to 100 a minute, then its phase on a narrow Gaussian."""
    coarse = max(np.arange(60, 100, 0.02), key=lambda bpm: gathered(t, r, bpm))
    bpm = float(max(np.arange(coarse - 0.03, coarse + 0.03, 0.001), key=lambda bpm: gathered(t, r, bpm)))
    p = 60 / bpm
    phase = ((np.angle((r * np.exp(2j * np.pi * t / p)).sum()) / (2 * np.pi)) % 1) * p
    def fit(ph):
        d = (t - ph) / p
        d = d - np.round(d)
        return float((r * np.exp(-(d * p) ** 2 / (2 * 0.012 ** 2))).sum())
    return bpm, float(max(np.arange(phase - 0.06, phase + 0.06, 0.001), key=fit))


def main():
    x = decode()
    low_sos = butter(4, [35, 130], btype='band', fs=SR, output='sos')
    crack_sos = butter(4, [1500, 6000], btype='band', fs=SR, output='sos')
    kick_sos = butter(4, [35, 150], btype='band', fs=SR, output='sos')
    tracks = []
    for n, (title, artists, a, b) in enumerate(TRACKS):
        start, end = edges(x, a, b)
        y = x[int(start * SR):int(end * SR)]
        t, r = attacks(y, start, (kick_sos, crack_sos))
        bpm, phase = comb(t, r)
        period = 60 / bpm
        k0 = int(np.ceil((start - phase) / period))
        k1 = int(np.floor((end - phase) / period))
        beats = phase + np.arange(k0, k1 + 1) * period
        # Each beat's band loudness (dB over the beat) and each beat's attack in the low and crack bands.
        low = sosfiltfilt(low_sos, y)
        crack = sosfiltfilt(crack_sos, y)
        def over(sig, t0, t1):
            s = max(0, int((t0 - start) * SR))
            f = min(len(sig), int((t1 - start) * SR))
            return 20 * np.log10(np.sqrt((sig[s:f] ** 2).mean()) + 1e-9) if f > s else -120.0
        # Each beat's window opens a little before it: a kick is struck a few milliseconds ahead of the comb, and its
        # attack belongs to its own beat, not to the one before.
        EARLY = 0.05
        L = np.array([over(low, g - EARLY, g + period - EARLY) for g in beats])
        # How hard each beat's kick and crack are struck: the band's sharpest rise (dB over 10 ms, on 1 ms frames)
        # within 40 ms of the beat.
        def rises(sig):
            h = 22
            n = len(sig) // h
            e = np.convolve(20 * np.log10(np.sqrt((sig[:n * h].reshape(n, h) ** 2).mean(1)) + 1e-9), np.ones(5) / 5, 'same')
            r = np.zeros_like(e)
            r[10:] = e[10:] - e[:-10]
            return r
        def struck(r, g):
            i0 = max(0, int((g - 0.04 - start) * SR / 22))
            i1 = min(len(r), int((g + 0.04 - start) * SR / 22))
            return float(r[i0:i1].max()) if i1 > i0 else 0.0
        rl, rc = rises(low), rises(crack)
        kick = np.array([struck(rl, g) for g in beats])
        snare = np.array([struck(rc, g) for g in beats])
        # The bar's phase. The grooves here put the kick on one and the crack on two and four, so of the four phases the
        # downbeat is the one the kick hits most often (a real attack, 15 dB) while the crack keeps off it and off three
        # and on the beats between, counted over the beats where the kit is playing (Daydream's is half-time: its crack
        # is on three alone).
        playing = L > np.percentile(L, 90) - 10
        def often(v, o):
            js = [j for j in range(len(v)) if playing[j] and j % BAR == o]
            return float(np.mean([v[j] > 15 for j in js])) if js else 0.0
        K = [often(kick, o) for o in range(BAR)]
        C = [often(snare, o) for o in range(BAR)]
        # Two and four must both be struck; a crack on the downbeat counts twice against it; and a groove played
        # half-time has its crack on three alone.
        def c(o, i):
            return C[(o + i) % BAR]
        groove = [K[o] + max(2 * min(c(o, 1), c(o, 3)) - 2 * c(o, 0) - c(o, 2),
                             2 * c(o, 2) - 2 * c(o, 0) - 2 * max(c(o, 1), c(o, 3))) for o in range(BAR)]
        # And the drums come in after the intro (and back after a break) on a downbeat: an entry is a beat whose next
        # eight beats (their median, so a kick pattern's gaps count for little) stand furthest over the four before
        # it, sharpened to the steepest single-beat rise within three beats. A pickup can put an entry a beat early,
        # so an entry counts for its own beat and the one after; the entries break the tie a crack on two and four
        # leaves between a phase and the one two beats on.
        entry = np.full(len(L), -99.0)
        for i in range(BAR, len(L) - 2 * BAR):
            entry[i] = np.median(L[i:i + 2 * BAR]) - max(L[i - BAR:i])
        def sharpen(i):
            near = [j for j in range(i - 3, i + 4) if 1 <= j < len(L)]
            return max(near, key=lambda j: L[j] - L[j - 1])
        entries = []
        for i in np.argsort(-entry):
            if entry[i] <= 12:
                break
            j = sharpen(int(i))
            if all(abs(j - q) >= 2 * BAR for q in entries):
                entries.append(j)
        score = [groove[o] + 0.3 * sum(1 for j in entries if j % BAR in (o, (o - 1) % BAR)) for o in range(BAR)]
        o = int(np.argmax(score))
        print('   kick', [round(v, 2) for v in K], 'crack', [round(v, 2) for v in C], 'entries', [(round(float(beats[j]), 2), j % BAR) for j in entries], '-> phase', o)
        downbeat = phase + (k0 + o) * period
        # Bars: every downbeat from the first whose bar starts in the track (or a beat before it) to the last.
        first = int(np.ceil((start - period - downbeat) / (BAR * period)))
        last = int(np.floor((end - downbeat) / (BAR * period)))
        bars = [downbeat + i * BAR * period for i in range(first, last + 1)]
        # A bar has drums when its low band (the kick and the bass, a mean over the bar, so a kick pattern's gaps count
        # for nothing) is within 10 dB of the track's loudest bars.
        level = np.array([over(low, bt - EARLY, bt + BAR * period - EARLY) for bt in bars])
        bar_on = [bool(v > np.percentile(level, 90) - 10) for v in level]
        lo, hi = np.percentile(level, 5), np.percentile(level, 95)
        level = np.clip((level - lo) / max(1e-6, hi - lo), 0, 1)
        sections = []
        for i, d in enumerate(bar_on):
            if sections and sections[-1]['drums'] == d:
                sections[-1]['to'] = i + 1
            else:
                sections.append({'from': i, 'to': i + 1, 'drums': d})
        def norm(v):
            top = np.percentile(v, 95) or 1
            return [round(float(min(1.0, q / top)), 3) for q in v]
        tracks.append({
            'title': title,
            'artists': artists,
            'from': round(start, 3),
            'to': round(end, 3),
            'bpm': round(bpm, 3),
            'period': round(period, 6),
            'downbeat': round(downbeat, 4),
            'beat0': round(float(beats[0]), 4),
            'bars': [round(float(bt), 4) for bt in bars],
            'drums': bar_on,
            'level': [round(float(v), 3) for v in level],
            'kick': norm(kick),
            'snare': norm(snare),
            'sections': sections,
        })
        print(f"{n + 1:2d} {title:20s} {start:8.2f}-{end:8.2f}  {bpm:7.3f} bpm  downbeat {downbeat:8.3f}  bars {len(bars):3d}  "
              + ' '.join(f"{'D' if s['drums'] else '.'}{s['to'] - s['from']}" for s in sections))
    # The whole span, every fifth of a second (4410 samples): loudness, and how full the held sound is.
    span = TRACKS[-1][3]
    q = 4410
    nq = int(span * SR / q)
    rms = envelope_db(x[:nq * q], q)
    lo, hi = np.percentile(rms, 5), np.percentile(rms, 97)
    rms = np.clip((rms - lo) / (hi - lo), 0, 1)
    held_sos = butter(4, [200, 2000], btype='band', fs=SR, output='sos')
    hdb = envelope_db(sosfiltfilt(held_sos, x[:nq * q]), q // 5)
    # A median over 0.8 s of 40 ms frames: the sustained sound, not the attacks.
    w = 20
    med = np.array([np.median(hdb[max(0, i - w // 2):i + w // 2 + 1]) for i in range(len(hdb))])
    held = med[: nq * 5].reshape(nq, 5).mean(1)
    lo, hi = np.percentile(held, 5), np.percentile(held, 97)
    held = np.clip((held - lo) / (hi - lo), 0, 1)
    out = {
        'youtube': YOUTUBE,
        'album': 'Best of lofi hip hop 2021',
        'tracks': tracks,
        'step': q / SR,
        'rms': [round(float(v), 3) for v in rms],
        'held': [round(float(v), 3) for v in held],
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print('wrote', OUT)


if __name__ == '__main__':
    main()

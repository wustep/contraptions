"""
Sleeper: the clock of Hans Zimmer's "Paul's Dream", measured once, in show time.

Sleeper plays "Paul's Dream" (Dune, Original Motion Picture Soundtrack, WaterTower Music, 2021) from the label's own
upload to YouTube (BdtiYwSP9ko, "Dune Official Soundtrack | Paul's Dream - Hans Zimmer | WaterTower"), from the video's
first second, so show time is the video's time. Nothing of the recording is shipped. This reads a local analysis copy
that never leaves the machine it is made on:

    yt-dlp --js-runtimes node -f 'bestaudio[ext=m4a]' -o out/dune1/BdtiYwSP9ko.m4a \\
        'https://www.youtube.com/watch?v=BdtiYwSP9ko'
    /usr/bin/python3 scripts/shows/pauls-dream-onsets.py

and writes scripts/shows/plans/pauls-dream-onsets.json, which the show is timed to and check:shows holds it against.
Needs ffmpeg (or FFMPEG=<path>) and numpy. PAULS_DREAM_AUDIO=<path> reads another copy.

The cue is 7:03 of one long crescendo that falls and climbs again:

- `sea`     0 to 27.2: a high D held almost alone; a slow figure every five seconds (on 0.06 and 1.31 past each
            fifth second), and the first low swell (about 10);
- `lament`  27.2 to 99.5: low voices come in, a semitone rocking between A and A-flat over D, with low swells under
            them (about 45, 48, 62, 69, 83 and 90);
- `build`   99.5 to 110: the lows climb (a swell on 102.5) and hold their breath (105 to 109);
- `drums`   110 to 148: the drums, in D, each blow a swell of its own;
- `full`    148 to 270: the high voices and the brass come in over the drums, the loudest stretch, cut off by the
            cue's greatest blow (270.1);
- `fall`    270 to 288: only the low voices after it, dying to a hush (about 286);
- `voice`   288 to 312: a high voice alone over the lows, rocking A and A-flat;
- `rise`    312 to 397: everything again, under the voice, with two breaths (336, 366) and a climb from 384;
- `last`    397 to 411: the last blow (397.7) and its long decay;
- `fade`    411 to the end (423.4): to silence.

Zimmer keeps a click under all of it: a tick of 0.3125 s (192 a minute; a slow beat of four ticks, 1.25 s), which the
playing holds closely in `sea` and through `drums` and `full`, and leaves elsewhere. So:

- `ticks`: that grid where it holds, each tick moved onto its own attack where one is within 30 ms, with `n` (its
  number from the cue's first tick: a slow beat is every fourth), `onset` and `s` (how hard, against the ticks round it);
- `onsets`: every onset, a peak of spectral flux over its local median, with `s` (against the 90th percentile of the
  onsets within ten seconds of it) and `lo` (how much of it is under 200 Hz, 0 to 1 against the cue's hardest);
- `swells`: the quiet low swells before the drums, the same way, against the same greatest;
- `booms`: the low swells, each with `t` (its attack: the strongest low onset on its rise) and `peak` and `v` (its
  height, 0 to 1 against the greatest);
- `rms`: loudness every quarter second, 0 to 1 against the cue's loudest; `voice`: the high voices (1 to 3 kHz) the
  same way;
- `stretches` and `landmarks`: the moments the story is cut to.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('PAULS_DREAM_AUDIO', os.path.join(ROOT, 'out/dune1/BdtiYwSP9ko.m4a'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/pauls-dream-onsets.json')
SR = 22050
HOP = 128
WIN = 1024

STRETCHES = [
    ('sea', 0.0, 27.2),
    ('lament', 27.2, 99.5),
    ('build', 99.5, 110.0),
    ('drums', 110.0, 148.0),
    ('full', 148.0, 270.0),
    ('fall', 270.0, 288.0),
    ('voice', 288.0, 312.0),
    ('rise', 312.0, 397.0),
    ('last', 397.0, 411.0),
    ('fade', 411.0, None),
]
# Where the click is held closely enough to strike on.
GRID_SPANS = [(0.0, 41.0), (110.0, 270.5)]


def decode():
    raw = subprocess.run([FFMPEG, '-v', 'error', '-i', AUDIO, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], check=True,
                         capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def spectra(x):
    frames = (len(x) - WIN) // HOP
    idx = np.arange(WIN)[None, :] + HOP * np.arange(frames)[:, None]
    S = np.abs(np.fft.rfft(x[idx] * np.hanning(WIN), axis=1))
    t = (np.arange(frames) * HOP + WIN / 2) / SR
    return t, S, np.fft.rfftfreq(WIN, 1 / SR)


def flux(S, freqs, lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    L = np.log1p(S[:, m] * 20)
    return np.concatenate([[0], np.maximum(0, np.diff(L, axis=0)).sum(1)])


def running_median(v, width, step=8):
    n = len(v)
    h = width // 2
    coarse = np.array([np.median(v[max(0, i - h):i + h + 1]) for i in range(0, n, step)])
    out = coarse.repeat(step)[:n]
    return np.concatenate([out, np.full(n - len(out), coarse[-1])]) if len(out) < n else out


def peaks(nov, t, gap):
    out = []
    for i in range(gap, len(nov) - gap):
        if nov[i] > 0 and nov[i] == nov[i - gap:i + gap + 1].max():
            out.append(i)
    return np.array(out)


def stretch_of(t):
    for name, a, b in STRETCHES:
        if t >= a and (b is None or t < b):
            return name
    return STRETCHES[-1][0]


def main():
    x = decode()
    duration = len(x) / SR
    t, S, freqs = spectra(x)
    fps = SR / HOP

    # Onsets: peaks of flux over its 2 s running median, at least 120 ms apart; their low share from the flux under 200 Hz.
    F = flux(S, freqs, 30, 8000)
    FL = flux(S, freqs, 25, 200)
    nov = np.maximum(0, F - running_median(F, int(2 * fps) | 1))
    novl = np.maximum(0, FL - running_median(FL, int(2 * fps) | 1))
    pk = peaks(nov, t, int(0.12 * fps))
    pt = t[pk]
    pv = nov[pk]
    floor = np.percentile(pv, 30)
    lmax = novl.max()
    onsets = []
    for j, i in enumerate(pk):
        if pv[j] < floor:
            continue
        near = pv[(pt >= pt[j] - 10) & (pt < pt[j] + 10)]
        ref = max(np.percentile(near, 90), 1e-6)
        lo = novl[max(0, i - 6):i + 7].max() / lmax
        onsets.append({'t': round(float(pt[j]), 3), 's': round(float(min(3.0, pv[j] / ref)), 3), 'lo': round(float(lo), 3),
                       'in': stretch_of(pt[j])})
    ot = np.array([o['t'] for o in onsets])
    os_ = np.array([o['s'] for o in onsets])
    ol = np.array([o['lo'] for o in onsets])

    # The click: one period and phase, fitted to the strong onsets where it is held.
    held = np.zeros(len(ot), bool)
    for a, b in GRID_SPANS:
        held |= (ot >= a) & (ot < b)
    sel = held & (os_ > 0.8)
    best = None
    for P in np.arange(0.31230, 0.31280, 0.000005):
        for ph in np.arange(0, P, 0.001):
            d = ((ot[sel] - ph + P / 2) % P) - P / 2
            score = np.sum(np.exp(-(d / 0.015) ** 2) * os_[sel])
            if best is None or score > best[0]:
                best = (score, P, ph)
    _, PERIOD, PHASE = best
    ticks = []
    for a, b in GRID_SPANS:
        n0 = int(np.ceil((a - PHASE) / PERIOD))
        n1 = int(np.floor((min(b, duration) - PHASE) / PERIOD))
        for n in range(max(0, n0), n1 + 1):
            c = PHASE + n * PERIOD
            m = np.abs(ot - c) <= 0.03
            if m.any():
                k = np.argmax(np.where(m, os_, -1))
                tt, own, s = float(ot[k]), True, float(os_[k])
            else:
                tt, own, s = c, False, 0.0
            ticks.append({'t': round(tt, 3), 'n': n, 'onset': own, 's': round(s, 3)})

    # The booms: swells of the band under 110 Hz (a 4096-sample window every 50 ms), each the highest within a second
    # either side and at least 0.35 of the greatest; its attack is the strongest low onset on its rise.
    q = int(0.05 * SR)
    W2 = 4096
    fr = (len(x) - W2) // q
    idx = np.arange(W2)[None, :] + q * np.arange(fr)[:, None]
    S2 = np.abs(np.fft.rfft(x[idx] * np.hanning(W2), axis=1))
    f2 = np.fft.rfftfreq(W2, 1 / SR)
    low = np.sqrt((S2[:, (f2 > 25) & (f2 < 110)] ** 2).sum(1))
    low /= low.max()
    t2 = (np.arange(fr) * q + W2 / 2) / SR
    booms = []
    w = 20
    for i in range(w, len(low) - w):
        if low[i] != low[i - w:i + w + 1].max() or low[i] < 0.35:
            continue
        pre = low[max(0, i - 12):i - 2].min()
        j = i
        while j > 0 and low[j] > (pre + low[i]) / 2:
            j -= 1
        rise0 = t2[j] - 0.35
        cand = (ot >= rise0) & (ot <= t2[i] + 0.05)
        if cand.any():
            k = np.argmax(np.where(cand, ol + 0.15 * os_, -1))
            at = float(ot[k])
        else:
            at = float(t2[j])
        booms.append({'t': round(at, 3), 'peak': round(float(t2[i]), 3), 'v': round(float(low[i]), 3), 'in': stretch_of(at)})

    # The quiet swells before the drums, far under the booms: each the highest within two seconds either side, at least
    # twice what it rose from; its attack the strongest low onset on its rise.
    swells = []
    w = 40
    for i in range(w, len(low) - w):
        if t2[i] > 110 or low[i] != low[i - w:i + w + 1].max() or low[i] < 0.03:
            continue
        pre = low[max(0, i - 30):i - 2].min()
        if low[i] < 2 * pre:
            continue
        j = i
        while j > 0 and low[j] > (pre + low[i]) / 2:
            j -= 1
        cand = (ot >= t2[j] - 1.5) & (ot <= t2[i] + 0.05)
        at = float(ot[np.argmax(np.where(cand, ol, -1))]) if cand.any() else float(t2[j])
        swells.append({'t': round(at, 3), 'peak': round(float(t2[i]), 3), 'v': round(float(low[i]), 3), 'in': stretch_of(at)})

    # Loudness, and the high voices, every quarter second.
    qq = int(0.25 * SR)
    rms = np.array([np.sqrt(np.mean(x[i:i + qq] ** 2)) for i in range(0, len(x) - qq, qq)])
    rms = rms / rms.max()
    W3 = 4096
    voice = []
    for i in range(0, len(x) - qq, qq):
        seg = x[i:i + max(qq, W3)]
        if len(seg) < W3:
            seg = np.pad(seg, (0, W3 - len(seg)))
        sp = np.abs(np.fft.rfft(seg[:W3] * np.hanning(W3))) ** 2
        ff = np.fft.rfftfreq(W3, 1 / SR)
        voice.append(np.sqrt(sp[(ff >= 1000) & (ff < 3000)].sum()))
    voice = np.array(voice)
    voice = voice / voice.max()

    def attack(a, b, lo_weight=0.0):
        """The strongest onset between a and b (weighting its low share if asked)."""
        m = (ot >= a) & (ot <= b)
        if not m.any():
            return round((a + b) / 2, 3)
        k = np.argmax(np.where(m, os_ + lo_weight * ol, -1))
        return float(ot[k])

    def boom(a, b):
        """The greatest boom attacking between a and b."""
        c = [o for o in booms if a <= o['t'] <= b]
        return max(c, key=lambda o: o['v'])['t'] if c else round((a + b) / 2, 3)

    def voice_up(a, b, level):
        """The first quarter second between a and b where the high voices pass `level`."""
        for i in range(int(a / 0.25), int(b / 0.25)):
            if voice[i] >= level:
                return round(i * 0.25, 3)
        return a

    landmarks = {
        'first': attack(4.8, 5.3),
        'swell': min((o['t'] for o in swells if 9 <= o['peak'] <= 15), default=11.5),
        'lament': attack(26.9, 27.6),
        'call': attack(29.9, 30.4),
        'wake': attack(49.8, 50.4),
        'breath1': 75.0,
        'figure': attack(81.5, 82.0),
        'build': attack(99.0, 101.6, 1.0),
        'held': 105.0,
        'drop': attack(109.7, 110.3, 1.0),
        'choir': voice_up(146.0, 152.0, 0.55),
        'great': boom(269.5, 270.6),
        'hush': 286.0,
        'voice': attack(287.6, 288.4),
        'rise': boom(314.0, 315.0),
        'breath2': 336.0,
        'breath3': 366.0,
        'climb': 384.0,
        'last': boom(397.0, 398.2),
        'fade': 411.0,
    }

    out = {
        'youtube': 'BdtiYwSP9ko',
        'duration': round(duration, 3),
        'grid': {'period': round(float(PERIOD), 6), 'phase': round(float(PHASE), 4), 'spans': GRID_SPANS},
        'stretches': [{'name': n, 'from': a, 'to': b if b is not None else round(duration, 3)} for n, a, b in STRETCHES],
        'landmarks': {k: round(float(v), 3) for k, v in landmarks.items()},
        'ticks': ticks,
        'booms': booms,
        'swells': swells,
        'onsets': onsets,
        'step': 0.25,
        'rms': [round(float(v), 3) for v in rms],
        'voice': [round(float(v), 3) for v in voice],
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    own = sum(1 for k in ticks if k['onset'])
    print(f'{OUT}: {len(onsets)} onsets, {len(booms)} booms, {len(swells)} swells, {len(ticks)} ticks ({own} on their own attack), '
          f'period {PERIOD:.6f} phase {PHASE:.4f}, {duration:.3f} s')
    for k, v in landmarks.items():
        print(f'  {k:10s} {v}')


if __name__ == '__main__':
    main()

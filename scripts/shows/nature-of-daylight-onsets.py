"""
Palindrome: On the Nature of Daylight's clock, measured once, in show time.

The show plays apps/rube/src/shows/versions/nature-of-daylight/nature-of-daylight-demo.mp3 (demo only; see
apps/rube/src/shows/versions/nature-of-daylight/ATTRIBUTION.txt) from its first sample, so show time is the
recording's time. This reads it and writes scripts/shows/plans/nature-of-daylight-onsets.json, which the parts are
timed to and check:shows holds them against. Rerun only if the file changes:

    python3 scripts/shows/nature-of-daylight-onsets.py

Needs ffmpeg and numpy.

Max Richter's "On the Nature of Daylight" (The Blue Notebooks, 2004; the recording Arrival opens and closes on) is a
string elegy in B-flat minor over one slow ground: a chord a bar (B-flat minor, A-flat, D-flat, G-flat, F minor,
E-flat minor), four beats a bar at about 62 a minute, played freely, so a bar is anything from 3.5 to 4.8 seconds.
The low strings alone carry the line for the first hundred seconds; the double bass comes in on 102 s and the violins
take the tune up high; the bass drops out for two bars at 200.7 s and the second half begins; the loudest eight bars
run from 288.7 to 318.7 s; the high violins stop there and the rest is a long descent onto the last B-flat, which has
died by 373 s. What it measures:

- `beats`: the pulse, tracked beat by beat (a dynamic-programming tracker whose tempo may drift, since the players
  breathe with the phrase), each moved onto its own attack where one is within 40 ms, with how hard it is played
  (`s`, 1 is the 95th percentile of the beats of its section) and the chord it falls in.
- `chords`: every change of harmony, on the beat nearest it: the chord each moment is nearest (a Viterbi path over
  the major and minor triads with a price on every change, so a passing note does not count), each change put on its
  beat, and a chord held longer than six beats cut in fours. Mostly four beats each, the bar; two at a cadence. With
  the chord, how many beats it holds, how loud it is and how much the harmony changes on it (`change`, 0 to 1).
- `onsets`: every onset, a peak of spectral flux over its local mean, with how strong it is (`s`, 1 is the 95th
  percentile of the peaks of its own section). The bow changes and the tune's notes are among them.
- `landmarks`: the moments the story is cut to, each a downbeat or an onset the ear and the loudness put it at.
- `rms`: loudness every quarter second, to see the swells and the long fall.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MP3 = os.path.join(ROOT, 'apps/rube/src/shows/versions/nature-of-daylight/nature-of-daylight-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/nature-of-daylight-onsets.json')
YOUTUBE = 'rVN1B-tUpgs'
SR = 22050
N = 2048
HOP = 128

# What the strings are doing, by ear, the loudness and the bass band; each edge is a downbeat.
SECTIONS = [
    ('lament', 0.0, 102.0),      # the low strings alone: the viola's line over the ground; a second voice from 38 s,
                                 # the cellos' low notes from 72 s, a swell to 98 s and a half cadence
    ('arrival', 102.0, 200.6),   # the double bass comes in under everything and the violins take the tune up high
    ('knowing', 200.6, 288.6),   # the bass drops out for two bars, then the second half: the counter-line, higher
    ('call', 288.6, 318.7),      # the loudest eight bars
    ('daylight', 318.7, 380.0),  # the high violins stop; the long descent onto the last B-flat, and its dying
]
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', MP3, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def spectra(x):
    """Spectral flux (all), the low band's energy, every HOP samples; and a chroma on its own longer window."""
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    idx = np.arange(N)[None, :]
    freqs = np.fft.rfftfreq(N, 1 / SR)
    band = (freqs >= 30) & (freqs < 4000)
    low = (freqs >= 30) & (freqs < 90)
    flux = np.zeros(frames)
    lowe = np.zeros(frames)
    prev = None
    for s in range(0, frames, 3000):
        f = np.arange(s, min(frames, s + 3000))
        mag = np.abs(np.fft.rfft(x[f[:, None] * HOP + idx] * win, axis=1))
        m = np.log1p(1000 * mag)
        if prev is not None:
            d = np.maximum(0, np.diff(np.vstack([prev[None, :], m]), axis=0))
        else:
            d = np.vstack([np.zeros((1, m.shape[1])), np.maximum(0, np.diff(m, axis=0))])
        prev = m[-1]
        flux[f] = d[:, band].sum(1)
        lowe[f] = (mag[:, low] ** 2).sum(1)
    t = (np.arange(frames) * HOP + N / 2) / SR
    return t, flux, lowe, chroma_of(x, t)


def chroma_of(x, t):
    """The twelve pitch classes' energy (55 Hz to 2 kHz), from an 8192-sample window every 512: fine enough in pitch
    for the cellos' low notes. Laid onto the flux's frames `t`."""
    n, hop = 8192, 512
    frames = (len(x) - n) // hop
    win = np.hanning(n)
    idx = np.arange(n)[None, :]
    freqs = np.fft.rfftfreq(n, 1 / SR)
    keep = (freqs >= 55) & (freqs <= 2000)
    midi = 69 + 12 * np.log2(freqs[keep] / 440)
    pcs = np.round(midi).astype(int) % 12
    wts = np.exp(-((midi - np.round(midi)) ** 2) / (2 * 0.15 ** 2))
    out = np.zeros((frames, 12))
    for s in range(0, frames, 1000):
        f = np.arange(s, min(frames, s + 1000))
        p2 = np.abs(np.fft.rfft(x[f[:, None] * hop + idx] * win, axis=1))[:, keep] ** 2 * wts[None, :]
        for pc in range(12):
            out[f, pc] = p2[:, pcs == pc].sum(1)
    tc = (np.arange(frames) * hop + n / 2) / SR
    return np.stack([np.interp(t, tc, out[:, pc]) for pc in range(12)], axis=1)


def envelope(t, x, med=0.5, smooth=3):
    fps = 1 / (t[1] - t[0])
    m = int(fps * med)
    e = np.maximum(0, x - np.convolve(x, np.ones(m) / m, 'same'))
    return np.convolve(e, np.ones(smooth) / smooth, 'same')


def peaks(t, e, a, b, spacing):
    """Local maxima of `e` in [a, b), at least `spacing` apart, each with its height over the 95th percentile of the stretch's peaks."""
    fps = 1 / (t[1] - t[0])
    gap = max(1, int(spacing * fps))
    idx = np.where((t >= a) & (t < b))[0]
    out = []
    for i in idx[1:-1]:
        if e[i] > e[i - 1] and e[i] >= e[i + 1]:
            if out and i - out[-1] < gap:
                if e[i] > e[out[-1]]:
                    out[-1] = i
                continue
            out.append(i)
    if not out:
        return []
    top = np.percentile([e[i] for i in out], 95) or 1
    return [{'t': round(float(t[i]), 3), 's': round(float(e[i] / top), 3)} for i in out]


def local_period(t, e, c, lo=0.82, hi=1.12):
    """The beat period that best gathers the flux in the 12 s round `c` (a comb, best phase, per unit of time)."""
    m = (t > c - 6) & (t < c + 6)
    tt, ee = t[m], e[m]
    best = (0.0, 0.96)
    for p in np.arange(lo, hi, 0.004):
        ph = np.arange(0, p, 0.01)[:, None]
        d = (tt[None, :] - ph) / p
        d = d - np.round(d)
        bs = float((ee[None, :] * np.exp(-(d * p) ** 2 / (2 * 0.03 ** 2))).sum(1).max())
        if bs * p > best[0]:
            best = (bs * p, float(p))
    return best[1]


def track(t, e, duration):
    """Beats by dynamic programming (Ellis 2007) under a tempo that may drift: the local period is measured every 2 s."""
    fps = 1 / (t[1] - t[0])
    cs = np.arange(0, duration + 2, 2.0)
    per = np.array([local_period(t, e, c) for c in cs])
    per = np.array([np.median(per[max(0, i - 2):i + 3]) for i in range(len(per))])
    tau = np.interp(t, cs, per) * fps
    o = e / (np.percentile(e, 99) or 1)
    n = len(o)
    score = np.zeros(n)
    back = -np.ones(n, dtype=int)
    for i in range(n):
        T = tau[i]
        lo = int(i - 1.6 * T)
        hi = int(i - 0.6 * T)
        if lo < 0:
            score[i] = o[i]
            continue
        js = np.arange(lo, hi)
        v = score[js] - 60 * np.log((i - js) / T) ** 2
        k = int(np.argmax(v))
        score[i] = o[i] + v[k]
        back[i] = js[k]
    tail = int(2 * fps)
    i = int(np.argmax(score[-tail:])) + n - tail
    out = []
    while i >= 0:
        out.append(float(t[i]))
        i = back[i]
    return out[::-1]


def section_of(tt):
    return next((n for n, a, b in SECTIONS if a <= tt < b), SECTIONS[-1][0])


def main():
    x = decode()
    duration = len(x) / SR
    t, flux, lowe, chroma = spectra(x)
    fps = 1 / (t[1] - t[0])
    E = envelope(t, flux)

    # Onsets, section by section, each section its own scale.
    onsets = []
    for name, a, b in SECTIONS:
        for q in peaks(t, E, a, min(b, duration), 0.12):
            q['in'] = name
            onsets.append(q)

    # The pulse.
    raw = [b for b in track(t, E, duration) if b > 1.0]
    beats = []
    for b in raw:
        m = np.where(np.abs(t - b) <= 0.04)[0]
        i = m[int(np.argmax(E[m]))]
        on = [q for q in onsets if abs(q['t'] - t[i]) <= 0.012 and q['s'] >= 0.12]
        tt = on[0]['t'] if on else round(b, 3)
        beats.append({'t': tt, 'e': float(E[m].max()), 'onset': bool(on)})
    clean = []
    for b in beats:
        if clean and b['t'] - clean[-1]['t'] < 0.4:
            if b['e'] > clean[-1]['e']:
                clean[-1] = b
            continue
        clean.append(b)
    beats = clean
    for name, a, b in SECTIONS:
        inside = [bb for bb in beats if a <= bb['t'] < b]
        if not inside:
            continue
        top = np.percentile([bb['e'] for bb in inside], 95) or 1
        for bb in inside:
            bb['s'] = round(min(2.0, bb['e'] / top), 3)
    for bb in beats:
        del bb['e']
    # The last beat the pulse can be heard on: the final chord's own attack, not the dying after it.
    last_chord = max(q['t'] for q in onsets if 366 < q['t'] < 372 and q['s'] >= 0.25)
    beats = [bb for bb in beats if bb['t'] <= last_chord + 0.3]

    # The harmony's change at each beat: the chroma a little after it against the chroma a little before.
    k = int(0.25 * fps)
    cs = np.array([np.convolve(chroma[:, j], np.ones(k) / k, 'same') for j in range(12)]).T

    def unit(a, b):
        i0, i1 = max(0, int(a * fps)), min(len(t) - 1, int(b * fps))
        v = cs[i0:max(i0 + 1, i1)].mean(0)
        return v / (np.linalg.norm(v) + 1e-9)

    bt = [bb['t'] for bb in beats]
    nov = []
    for j, b in enumerate(bt):
        a0 = bt[j - 1] if j > 0 else b - 1.0
        a1 = bt[j + 1] if j + 1 < len(bt) else b + 1.0
        nov.append(float(1 - unit(a0 + 0.1, b - 0.05) @ unit(b + 0.15, a1)))
    nov = np.array(nov)

    templates = {}
    for r in range(12):
        for q, iv in (('', [0, 4, 7]), ('m', [0, 3, 7])):
            v = np.zeros(12)
            v[[(r + s) % 12 for s in iv]] = 1
            templates[NAMES[r] + q] = v / np.linalg.norm(v)
    tnames = list(templates)
    tmat = np.array([templates[k] for k in tnames])

    def chord(a, b):
        v = unit(a, b)
        return tnames[int(np.argmax(tmat @ v))]

    # The harmony, frame by frame (every 50 ms): the chord each moment is nearest, held unless the music leaves it for
    # a while (a Viterbi path with a price on every change). Its changes are where the bars begin.
    step = int(0.05 * fps)
    fr = np.arange(0, len(t), step)
    cn = cs[fr] / (np.linalg.norm(cs[fr], axis=1, keepdims=True) + 1e-9)
    emit = cn @ tmat.T
    price = 0.9
    score = emit[0].copy()
    back = np.zeros((len(fr), len(tnames)), dtype=int)
    for i in range(1, len(fr)):
        best = int(np.argmax(score))
        stay = score
        move = score[best] - price
        back[i] = np.where(stay >= move, np.arange(len(tnames)), best)
        score = np.maximum(stay, move) + emit[i]
    path = [int(np.argmax(score))]
    for i in range(len(fr) - 1, 0, -1):
        path.append(int(back[i][path[-1]]))
    path = path[::-1]
    changes = [float(t[fr[i]]) for i in range(1, len(fr)) if path[i] != path[i - 1]]

    # Each change onto the beat nearest it (within half a beat); a chord held longer than six beats is cut in bars of
    # four. The first beat is a downbeat.
    downs = {0}
    for c in changes:
        j = int(np.argmin([abs(b - c) for b in bt]))
        if abs(bt[j] - c) < 0.55:
            downs.add(j)
    downs = sorted(downs)
    full = []
    for a, b in zip(downs, downs[1:] + [len(bt)]):
        full.append(a)
        L = b - a
        k = a + 4
        while L > 6 and b - k >= 3:
            full.append(k)
            k += 4
            L -= 4
    # A bar of one beat is a wobble in the harmony, not a bar: fold it into the one before.
    downs = [d for i, d in enumerate(full) if i == 0 or d - full[i - 1] >= 2]

    energy = np.zeros(len(t))
    for s in range(0, len(t), 5000):
        f = np.arange(s, min(len(t), s + 5000))
        energy[f] = (x[f[:, None] * HOP + np.arange(N)[None, :]] ** 2).mean(1)

    def db(a, b):
        i0, i1 = int(a * fps), int(b * fps)
        return round(float(10 * np.log10(energy[i0:max(i0 + 1, i1)].mean() + 1e-12)), 1)

    bars = []
    for n_, (a, b) in enumerate(zip(downs, downs[1:] + [len(bt)])):
        ta = bt[a]
        tb = bt[b] if b < len(bt) else min(duration, ta + 4.0)
        bars.append({'n': n_, 't': ta, 'beats': int(b - a), 'chord': chord(ta + 0.2, tb - 0.1), 'db': db(ta, tb), 'change': round(float(nov[a]), 3)})
        for j in range(a, b):
            beats[j]['chord'] = n_

    # The double bass's entry: where the low band jumps.
    le = np.convolve(lowe, np.ones(int(0.1 * fps)) / int(0.1 * fps), 'same')
    ldb = 10 * np.log10(le + 1e-12)
    w = (t > 100) & (t < 104)
    jump = np.where(w)[0][int(np.argmax(np.diff(ldb[w], prepend=ldb[w][0])))]
    bass_on = min((q for q in onsets if abs(q['t'] - t[jump]) < 0.25), key=lambda q: abs(q['t'] - t[jump]))['t']

    def bar_at(tt):
        return min(bars, key=lambda b: abs(b['t'] - tt))

    AT = {
        # The first sound: the ground's first chord.
        'first': bars[0]['t'],
        # The second voice comes in over the viola (the high band lifts by 5 dB).
        'second': bar_at(38.3)['t'],
        # The cellos' low notes under the ground.
        'cello': bar_at(72.0)['t'],
        # The lament's swell, and its half cadence before the bass.
        'swell': bar_at(93.9)['t'],
        'half': bar_at(98.3)['t'],
        # The double bass: the arrival.
        'bass': bass_on,
        'arrival': bar_at(102.0)['t'],
        # The bass drops out: the turn.
        'turn': bar_at(200.7)['t'],
        # The loudest eight bars, their loudest bar, and where the high violins stop.
        'call': bar_at(288.7)['t'],
        'peak': bar_at(303.8)['t'],
        'release': bar_at(318.7)['t'],
        # The last bars: the fall onto the tonic, the last chord's attack, and when it has died.
        'fade': bar_at(349.5)['t'],
        'last': last_chord,
        'silent': None,
    }
    rms = []
    for w0 in np.arange(0, duration, 0.25):
        seg = x[int(w0 * SR):int((w0 + 0.25) * SR)]
        if len(seg):
            rms.append(round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)), 1))
    AT['silent'] = round(next(i * 0.25 for i in range(len(rms) - 1, 0, -1) if rms[i] > -50) + 0.25, 2)

    out = {
        'source': 'apps/rube/src/shows/versions/nature-of-daylight/nature-of-daylight-demo.mp3',
        'youtube': YOUTUBE,
        'duration': round(duration, 3),
        'sections': [{'name': nm, 'from': a, 'to': min(b, round(duration, 3))} for nm, a, b in SECTIONS],
        'landmarks': AT,
        'chords': bars,
        'beats': beats,
        'onsets': onsets,
        'rms_step': 0.25,
        'rms': rms,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=0, separators=(',', ':'))
        f.write('\n')

    ibi = np.diff(bt)
    held = sum(1 for bb in beats if bb['onset']) / len(beats)
    print(f"duration {duration:.3f}; {len(onsets)} onsets, {len(beats)} beats (median {np.median(ibi):.3f}s, "
          f"{held:.0%} on an attack), {len(bars)} chords (beats each {''.join(str(b['beats']) for b in bars)})")
    print('landmarks', AT)
    for b in bars:
        print(f"  chord {b['n']:2d} {b['t']:8.3f} {b['beats']}b {b['chord']:4s} {b['db']:6.1f} dB  change {b['change']:.2f}")


if __name__ == '__main__':
    main()

"""
Rally: Everybody Wants to Rule the World's clock, measured once, in show time.

Rally plays Tears for Fears' "Everybody Wants to Rule the World" (Songs from the Big Chair, 1985), the song Marty
Supreme (2025) ends on, from Universal Music Group's own upload to YouTube (awoFZaSuko4), from the video's first second,
so show time is the video's time. Nothing of the recording is shipped. This reads a local analysis copy that never
leaves the machine it is made on:

    yt-dlp --js-runtimes node -f 'bestaudio[ext=m4a]' -o out/marty-supreme/awoFZaSuko4.m4a \\
        'https://www.youtube.com/watch?v=awoFZaSuko4'
    python3 scripts/shows/rule-the-world-onsets.py

and writes scripts/shows/plans/rule-the-world-onsets.json, which the show is timed to and check:shows holds it against.
Needs ffmpeg (or FFMPEG=<path>) and numpy. RTW_AUDIO=<path> reads another copy.

The song is a shuffle on a machine-steady pulse: 112.05 beats a minute from the first bar to the fade (a comb fitted
to the whole song stays within 25 ms of the attacks everywhere), each beat cut in three, and the hats and the kick on
the beat and on its last third, the shuffle's "a". So there is one comb: every beat is the comb's, moved onto its own
attack where one is within 30 ms, and so is every "a". It is in four; its downbeats are where the chords change
(they change every two beats, on beats one and three) and where every line of the voice comes in.

What the song does, by the voice (the lines' times are the upload's) and the loudness:

- `intro`    the shuffle and the synth's riff with no bass, bars 1 to 4;
- `vamp`     the bass in, the riff over it, to bar 14;
- `verse1`   "Welcome to your life" (bar 14);
- `pre1`     "Acting on your best behaviour" (bar 21), and the band up;
- `hook1`    "Everybody wants to rule the world" (bar 25);
- `riff`     the riff again, to bar 32;
- `verse2`   "It's my own design" (bar 32); `pre2`, "Most of freedom and of pleasure" (bar 39);
- `hook2`    (bar 43);
- `bridge`   "There's a room where the light won't find you / Holding hands while the walls come tumbling down" (bar 45);
- `glad`     "So glad we've almost made it" (bar 51); `hook3` (bar 55);
- `break`    the band down: the synth alone over the shuffle, from bar 57;
- `solo`     the guitar, from bar 65, up and up;
- `verse3`   "I can't stand this indecision" (bar 79); `cut`, "Everybody wants to rule the -" broken off (bar 83);
- `never`    "Say that you'll never, never, never, never need it" (bar 85); `hook5` (bar 89);
- `turn`     the band down again, bar 91;
- `freedom`  "All for freedom and for pleasure / Nothing ever lasts forever" (bar 95); `hook6` (bar 99);
- `outro`    the guitar over the riff, and the fade, from bar 101 to the video's end.

What it measures:

- `beats`: every beat of the comb from the first downbeat to the fade, each on its own attack where one is within
  30 ms, with how hard it is struck (`s`, against the beats round it) and its place: `bar` and `pos` (1 to 4).
- `shuffle`: every beat's "a", two thirds of the way to the next, on its own attack where one is within 30 ms.
- `onsets`: every onset, a peak of spectral flux over its local mean, with its strength in its own stretch.
- `stretches` and `landmarks`: the moments the story is cut to.
- `rms`: loudness every quarter second, 0 to 1 against the song's loudest.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.environ.get('RTW_AUDIO', os.path.join(ROOT, 'out/marty-supreme/awoFZaSuko4.m4a'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
OUT = os.path.join(ROOT, 'scripts/shows/plans/rule-the-world-onsets.json')
YOUTUBE = 'awoFZaSuko4'
SR = 22050
N = 2048
HOP = 128
# A frame's flux peaks while an attack is still a little ahead of the frame's centre; every time is moved on by this
# much, onto the attack's start (as in step-out-onsets.py, measured the same way).
ATTACK = 0.030
SNAP = 0.030

# The stretches, as bars (bar, from its beat 1). `kind` says whether a part may strike the beat there ('beat') or only
# the onsets ('free'). The last runs to the video's end.
STRETCHES = [
    ('intro', 1, 'beat'),
    ('vamp', 5, 'beat'),
    ('verse1', 14, 'beat'),
    ('pre1', 21, 'beat'),
    ('hook1', 25, 'beat'),
    ('riff', 28, 'beat'),
    ('verse2', 32, 'beat'),
    ('pre2', 39, 'beat'),
    ('hook2', 43, 'beat'),
    ('bridge', 45, 'beat'),
    ('glad', 51, 'beat'),
    ('hook3', 55, 'beat'),
    ('break', 57, 'beat'),
    ('solo', 65, 'beat'),
    ('verse3', 79, 'beat'),
    ('cut', 83, 'beat'),
    ('never', 85, 'beat'),
    ('hook5', 89, 'beat'),
    ('turn', 91, 'beat'),
    ('freedom', 95, 'beat'),
    ('hook6', 99, 'beat'),
    ('outro', 101, 'beat'),
]


def decode():
    raw = subprocess.run([FFMPEG, '-loglevel', 'error', '-i', AUDIO, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def flux(x):
    """Spectral flux over everything, every HOP samples."""
    frames = (len(x) - N) // HOP
    win = np.hanning(N)
    idx = np.arange(N)[None, :]
    full = np.zeros(frames)
    prev = None
    for s in range(0, frames, 3000):
        f = np.arange(s, min(frames, s + 3000))
        m = np.log1p(1000 * np.abs(np.fft.rfft(x[f[:, None] * HOP + idx] * win, axis=1)))
        mm = np.vstack([(prev if prev is not None else m[0])[None, :], m])
        prev = m[-1]
        full[f] = np.maximum(0, np.diff(mm, axis=0)).sum(1)
    t = (np.arange(frames) * HOP + N / 2) / SR + ATTACK
    return t, full


def envelope(t, x, med=0.25, smooth=3):
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
    return [{'t': round(float(t[i]), 3), 's': round(float(e[i] / top), 3), 'e': float(e[i])} for i in out]


def comb(t, e, a, b):
    """The period of the one comb that best gathers the flux from a to b, and the phase that puts the most of it on the comb's teeth.

    The period is the comb's strongest; the phase is scanned, not read off the comb's angle, since the beat and its "a"
    pull that angle between them.
    """
    m = (t > a) & (t < b)
    best = (0.0, 0.0)
    for p in np.arange(0.5300, 0.5400, 0.00001):
        z = abs((e[m] * np.exp(2j * np.pi * t[m] / p)).sum())
        if z > best[0]:
            best = (z, float(p))
    p = best[1]
    fps = 1 / (t[1] - t[0])
    tt = t[m]
    ee = e[m]
    score = []
    phases = np.arange(0, p, 0.001)
    for ph in phases:
        teeth = np.arange(ph + np.ceil((a - ph) / p) * p, b, p)
        i = np.clip(np.searchsorted(tt, teeth), 0, len(tt) - 1)
        w = int(0.012 * fps)
        score.append(sum(float(ee[max(0, k - w):k + w + 1].max()) for k in i))
    return p, float(phases[int(np.argmax(score))])


def main():
    x = decode()
    duration = len(x) / SR
    t, full = flux(x)
    E = envelope(t, full)

    period, phase = comb(t, E, 9.0, 236.0)
    # The comb's beat: of the three thirds of a beat, the one the flux gathers on most (the beat, not its "a").
    thirds = []
    for k in range(3):
        ph = phase + k * period / 3
        q = np.arange(ph, duration, period)
        q = q[(q > 9) & (q < 236)]
        thirds.append(sum(float(E[np.abs(t - c) < 0.02].max()) for c in q))
    phase = phase + int(np.argmax(thirds)) * period / 3

    grid = np.arange(phase, duration - 0.2, period)
    # The first downbeat: the beats where the chords change and the lines come in are 1 (mod 4) of the grid from zero.
    first = next(i for i in range(len(grid)) if i % 4 == 1)
    grid = grid[first:]

    def bar_t(bar):
        return float(grid[(bar - 1) * 4])

    edges = [(name, bar_t(bar), kind) for name, bar, kind in STRETCHES]
    stretches = [{'name': n, 'from': round(a, 3), 'to': round(edges[i + 1][1], 3) if i + 1 < len(edges) else round(duration, 3), 'kind': k}
                 for i, (n, a, k) in enumerate(edges)]

    def stretch_of(tt):
        got = [s for s in stretches if s['from'] <= tt < s['to']]
        return got[0]['name'] if got else ('intro' if tt < stretches[0]['from'] else stretches[-1]['name'])

    onsets = []
    for s in stretches:
        for q in peaks(t, E, s['from'] - 0.05 if s is stretches[0] else s['from'], s['to'], 0.09):
            q['in'] = s['name']
            onsets.append(q)
    for q in peaks(t, E, 0.0, stretches[0]['from'] - 0.05, 0.09):
        q['in'] = 'intro'
        onsets.append(q)
    onsets.sort(key=lambda q: q['t'])

    def snap(c):
        near = [q for q in onsets if abs(q['t'] - c) <= SNAP and q['s'] >= 0.1]
        if near:
            q = max(near, key=lambda q: q['e'])
            return q['t'], True, q['e']
        m = np.abs(t - c) <= 0.02
        return round(float(c), 3), False, float(E[m].max()) if m.any() else 0.0

    # Up to the fade's last audible beat: the loudness is still within 30 dB of the top.
    rms = []
    for w0 in np.arange(0, duration, 0.25):
        seg = x[int(w0 * SR):int((w0 + 0.25) * SR)]
        if len(seg):
            rms.append(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)))
    top = max(rms)
    audible = max(i for i, r in enumerate(rms) if r > top - 30) * 0.25

    beats = []
    shuffle = []
    for i, c in enumerate(grid):
        if c > audible:
            break
        tt, on, e = snap(c)
        beats.append({'t': tt, 'onset': on, 'in': stretch_of(tt), 'bar': i // 4 + 1, 'pos': i % 4 + 1, 'e': e})
        a = c + 2 * period / 3
        if a <= audible:
            ta, on_a, _ = snap(a)
            shuffle.append({'t': ta, 'onset': on_a, 'bar': i // 4 + 1, 'pos': i % 4 + 1})
    es = np.array([b['e'] for b in beats])
    for i, b in enumerate(beats):
        top_e = np.percentile(es[max(0, i - 32):i + 32], 90) or 1
        b['s'] = round(min(2.0, b['e'] / top_e), 3)
        del b['e']
    for q in onsets:
        del q['e']

    rms = [round(max(0.0, min(1.0, (r - top + 40) / 40)), 3) for r in rms]

    landmarks = {s['name']: s['from'] for s in stretches}
    landmarks['first'] = round(float(grid[0]), 3)
    landmarks['audible'] = round(audible, 3)

    # How well the comb sits: the median and the 95th percentile of the distance from a comb beat to its attack.
    errs = [abs(b['t'] - grid[i]) for i, b in enumerate(beats) if b['onset']]
    out = {
        'youtube': YOUTUBE,
        'duration': round(duration, 3),
        'period': round(period, 6),
        'stretches': stretches,
        'landmarks': landmarks,
        'beats': beats,
        'shuffle': shuffle,
        'onsets': onsets,
        'rms_step': 0.25,
        'rms': rms,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    print(f'duration {duration:.3f}; period {period:.5f} ({60 / period:.2f} bpm); first downbeat {grid[0]:.3f}')
    print(f'{len(beats)} beats ({sum(b["onset"] for b in beats)} on an attack), {len(shuffle)} shuffles '
          f'({sum(a["onset"] for a in shuffle)} on an attack), {len(onsets)} onsets')
    print(f'comb to attack: median {1000 * np.median(errs):.1f} ms, 95th {1000 * np.percentile(errs, 95):.1f} ms')
    for s in stretches:
        print(f"  {s['name']:8s} {s['from']:8.3f} -> {s['to']:8.3f}")


if __name__ == '__main__':
    main()

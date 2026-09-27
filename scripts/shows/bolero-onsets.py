"""
Ravel, Boléro: the recording's clock, measured once.

The Ostinato show plays apps/rube/src/shows/versions/bolero/bolero-omega13a.mp3 (Omega13a's recording, made in
MuseScore 4 with Muse Sounds from Ravel's score, CC BY 4.0; see ATTRIBUTION.txt beside it) whole, from its first
sample, so show time is the recording's time. This reads it and writes scripts/shows/plans/bolero-onsets.json, which
the tower is timed to and check:shows holds it against. Rerun only if the recording changes:

    python3 scripts/shows/bolero-onsets.py

Needs ffmpeg and numpy. The recording is played from the score at the score's own tempo (Tempo di Bolero, moderato
assai, a quarter = 72) and never leaves it, as Ravel asked of every performance: so the whole piece is one comb, 340
bars of 3/4 at 2.5 s a bar. What is measured here is where that comb falls on the file, and that it holds:

- `comb`: the downbeat of bar 1 (`t0`) and the quarter (`beat`), fitted to the side drum's rhythm over the whole
  file (its 24 strokes to the two bars, the triplets included). `drift` is how far each stretch of 18 bars sits from
  the comb (the median of its strokes' attacks), which is the proof that it is one comb.
- `snare`: the side drum's two-bar rhythm, in quarters from the first bar's downbeat, as the score has it: an eighth
  and a triplet of sixteenths on each of the first two beats, two eighths on the third; the same in the second bar,
  with two triplets on the third. It never stops: 169 times over.
- `pizz`: the plucked strings' figure under it, from the score: violas on 1 and 2 of every bar, cellos on 1 and 3,
  and two eighths on 3 in the second bar of each pair.
- `statements`: the tune eighteen times, each 18 bars (16 of tune, the last note on the downbeat of the 17th, and two
  of drum alone), A A B B four times and then A B, each in the voices the score gives it; `db` is its loudness.
- `themes`: A and B note by note, from the score (Durand, 1929): each note's quarter from the statement's first
  downbeat and its pitch (MIDI, in the octave of the first statement to play it: the flute's A, the E-flat clarinet's
  B). Held and tied notes are one note. `heard` is, for each note, whether its pitch class is among the three
  strongest in the recording while it sounds, in the solo statements (1 to 4): the transcription's check.
- `form`: E major from bar 327 to 334, C again from 335, the collapse on 339 (trombones' glissandi, tam-tam) and the
  last chord on 340; `last` is that chord's measured attack and `ring` where it has fallen 40 dB.
- `loudness`: dB, every bar.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REL = 'apps/rube/src/shows/versions/bolero/bolero-omega13a.mp3'
MP3 = os.path.join(ROOT, REL)
OUT = os.path.join(ROOT, 'scripts/shows/plans/bolero-onsets.json')
SR = 22050
BARS = 340

# The side drum, two bars, in quarters.
SNARE = [0, 1 / 2, 2 / 3, 5 / 6, 1, 3 / 2, 5 / 3, 11 / 6, 2, 5 / 2,
         3, 7 / 2, 11 / 3, 23 / 6, 4, 9 / 2, 14 / 3, 29 / 6, 5, 31 / 6, 16 / 3, 11 / 2, 17 / 3, 35 / 6]
# The plucked strings, two bars, in quarters: [quarter, who].
PIZZ = [[0, 'low'], [1, 'mid'], [2, 'high'], [3, 'low'], [4, 'mid'], [5, 'high'], [5.5, 'high']]

# The tune, from the score: [quarter from the statement's downbeat, MIDI]. A in the flute's octave, B in the E-flat
# clarinet's. A ends on its tonic, struck on the 17th bar's downbeat; B's last C is tied into it.
THEME_A = [
    [0, 72], [1.5, 71], [1.75, 72], [2, 74], [2.25, 72], [2.5, 71], [2.75, 69],
    [3, 72], [3.5, 72], [3.75, 69], [4, 72], [5.5, 71], [5.75, 72],
    [6, 69], [6.25, 67], [6.5, 64], [6.75, 65], [7, 67],
    [9.25, 65], [9.5, 64], [9.75, 62], [10, 64], [10.25, 65], [10.5, 67], [10.75, 69], [11, 67],
    [13.25, 69], [13.5, 71], [13.75, 69], [14, 67], [14.25, 65], [14.5, 64], [14.75, 62],
    [15, 64], [15.25, 62], [15.5, 60], [16.5, 60], [16.75, 62], [17, 64], [17.5, 65],
    [18, 62], [19, 67],
    [24, 74], [25.75, 72], [26, 71], [26.25, 69], [26.5, 71], [26.75, 72],
    [27, 74], [27.25, 72], [27.5, 71], [28.25, 72], [28.5, 71], [28.75, 69], [29, 72], [29.25, 71], [29.5, 69], [29.75, 65],
    [30.5, 65], [30.75, 65], [31, 65], [31.5, 69], [32, 72], [32.25, 69], [32.5, 71], [32.75, 67],
    [33, 65], [33.5, 65], [33.75, 65], [34, 65], [34.5, 69], [35, 71], [35.25, 67], [35.5, 69], [35.75, 65],
    [36, 62], [36.5, 62], [36.75, 60], [37, 62], [38.5, 62], [38.75, 62],
    [39, 62], [39.5, 65], [40, 69], [40.25, 65], [40.5, 67], [40.75, 64], [41, 62], [41.5, 62], [41.75, 60],
    [42, 62], [43.5, 62], [43.75, 60], [44, 62], [44.5, 64], [44.75, 65],
    [45, 67], [47.25, 65], [47.5, 64], [47.75, 62],
    [48, 60],
]
THEME_B = [
    [0, 70], [1.25, 69], [1.5, 67], [1.75, 65], [2, 70], [2.25, 72], [2.5, 69], [2.75, 67],
    [3, 70], [3.5, 69], [3.75, 67], [4, 70], [5, 69], [5.25, 70], [5.5, 69], [5.75, 67],
    [7.25, 65], [7.5, 64], [7.75, 62], [8, 64],
    [10.5, 70], [11, 72], [11.5, 73],
    [12, 73], [12.5, 73], [13.5, 73], [14, 73], [14.5, 73],
    [15, 73], [15 + 1 / 3, 73], [15 + 2 / 3, 73], [16, 73], [16.5, 72], [16.75, 70], [17, 73], [17.5, 72], [17.75, 70],
    [18, 73], [18.25, 72], [18.5, 70], [18.75, 68], [19, 67], [19.25, 65], [19.5, 64],
    [24, 62], [25.5, 64], [26, 62], [26.25, 64], [26.5, 65],
    [28, 67], [28.5, 68], [29, 65], [29 + 1 / 3, 67], [29 + 2 / 3, 64],
    [30, 62], [30.25, 64], [30.5, 62], [30.75, 60], [31.5, 58],
    [33, 58], [33.25, 60], [33.5, 58], [33.75, 60], [34, 62], [34.25, 64], [34.5, 62], [34.75, 60], [35, 62], [35.25, 60], [35.5, 58], [35.75, 56],
    [36, 58], [36.25, 56], [36.5, 55], [37.5, 53],
    [39, 52], [40, 53], [40.25, 55], [40.5, 53], [40.75, 51],
    [43, 53], [43.25, 51], [43.5, 53], [43.75, 49],
    [46.25, 49], [46.5, 51], [46.75, 49], [47, 48], [47.25, 51], [47.5, 49], [47.75, 48],
]
# Who plays the tune, statement by statement (the score's voices).
VOICES = [
    'flute', 'clarinet', 'bassoon', 'E-flat clarinet', "oboe d'amore", 'flute and muted trumpet',
    'tenor saxophone', 'soprano saxophone', 'horn, celesta and two piccolos', "oboe, oboe d'amore, cor anglais and clarinets",
    'trombone', 'the woodwinds and tenor saxophone', 'first violins and woodwinds', 'violins and woodwinds',
    'violins, woodwinds and trumpet', 'violins, violas, woodwinds, saxophones and trumpet',
    'the whole orchestra but the low brass', 'the whole orchestra',
]


def decode():
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', MP3, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768


def rise(x):
    """How sharply the high band comes up, every millisecond: the side drum's attacks stand out of everything."""
    hp = np.diff(x)
    w = SR // 1000
    n = len(hp) // w
    e = np.sqrt((hp[:n * w] ** 2).reshape(n, w).mean(axis=1))
    return np.log(e + 1e-9)


def fit_comb(env, beat):
    """The downbeat of bar 1: where the side drum's strokes, all 169 times, rise most sharply."""
    strokes = np.array(SNARE)
    best = None
    for t0 in np.arange(0.0, 0.06, 0.0005):
        score = 0.0
        for cyc in range(2, BARS // 2 - 3):
            idx = ((t0 + (cyc * 6 + strokes) * beat) * 1000).astype(int)
            score += (env[idx + 3] - env[idx - 8]).mean()
        if best is None or score > best[0]:
            best = (score, t0)
    return best[1]


def stroke_offsets(env, t0, beat, bar0, bars):
    """Each stroke's attack in a stretch: the steepest rise within 30 ms of the comb. The stretch's median, in ms."""
    offs = []
    for cyc in range(bar0 // 2, (bar0 + bars) // 2):
        for s in SNARE:
            t = t0 + (cyc * 6 + s) * beat
            i = int(t * 1000)
            d = np.diff(env[i - 30:i + 31])
            offs.append(int(np.argmax(np.convolve(d, np.ones(3), 'same'))) - 30)
    return float(np.median(offs))


def salience(x, t0, t1, hop=0.01, n=4096):
    """Pitch-class strength, every `hop` seconds, by summing each semitone's first three harmonics."""
    win = np.hanning(n)
    freqs = np.fft.rfftfreq(n, 1 / SR)
    out = []
    for t in np.arange(t0, t1, hop):
        c = int(t * SR)
        seg = x[c - n // 2:c + n // 2]
        if len(seg) < n:
            out.append(np.zeros(12))
            continue
        m = np.abs(np.fft.rfft(seg * win))
        pc = np.zeros(12)
        for midi in range(48, 96):
            f = 440 * 2 ** ((midi - 69) / 12)
            s = 0
            for h in (1, 2, 3):
                b = int(round(f * h / (SR / n)))
                s += m[b - 1:b + 2].max() / h
            pc[midi % 12] += s
        out.append(pc)
    return np.array(out)


def main():
    x = decode()
    duration = len(x) / SR
    beat = 60 / 72
    env = rise(x)
    t0 = fit_comb(env, beat)
    bar = lambda b: t0 + (b - 1) * 3 * beat
    print(f'comb: bar 1 at {t0:.4f} s, a quarter {beat:.6f} s; bar 340 at {bar(340):.3f} s of {duration:.3f}')

    statements = []
    for k in range(18):
        first = 5 + 18 * k
        theme = 'AABB'[k % 4] if k < 16 else 'AB'[k - 16]
        seg = x[int(bar(first) * SR):int(bar(first + 16) * SR)]
        db = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
        drift = stroke_offsets(env, t0, beat, first - 1, 18)
        statements.append({'n': k + 1, 'bar': first, 't': round(bar(first), 4), 'theme': theme, 'voice': VOICES[k],
                           'db': round(db, 1), 'drift_ms': drift})
        print(f"  {k + 1:2d} bar {first:3d} at {bar(first):7.3f}  {theme}  {db:6.1f} dB  drift {drift:+.0f} ms  {VOICES[k]}")

    # The transcription's check: in the solo statements, is each note's pitch class among the three strongest while it sounds?
    heard = {'A': [], 'B': []}
    for theme, notes, solos in (('A', THEME_A, (0, 1)), ('B', THEME_B, (2, 3))):
        for i, (q, midi) in enumerate(notes):
            nxt = notes[i + 1][0] if i + 1 < len(notes) else q + 1
            votes = 0
            for s in solos:
                a = statements[s]['t'] + q * beat + 0.06
                b = statements[s]['t'] + min(nxt, q + 1.5) * beat - 0.02
                if b - a < 0.05:
                    b = a + 0.05
                pc = salience(x, a, b).mean(axis=0)
                votes += int(midi % 12 in np.argsort(pc)[::-1][:3])
            heard[theme].append(votes)
        ok = sum(1 for v in heard[theme] if v > 0)
        print(f'theme {theme}: {len(notes)} notes, {ok} heard in a solo statement')

    # The coda: the collapse bar and the last chord, measured.
    def attack(t, win=0.06):
        i = int(t * 1000)
        d = np.diff(env[i - int(win * 1000):i + int(win * 1000)])
        return (i - int(win * 1000) + int(np.argmax(np.convolve(d, np.ones(3), 'same')))) / 1000
    last = attack(bar(340))
    lin = np.exp(env)
    i = int(last * 1000)
    peak = lin[i:i + 300].max()
    j = i
    while j < len(lin) - 1 and lin[j] > peak * 0.01:
        j += 1
    form = {'emajor': [327, 334], 'return': 335, 'tutti': [337, 338], 'collapse': 339, 'final': 340,
            'collapse_t': round(attack(bar(339)), 4), 'last': round(last, 4), 'ring': round(j / 1000, 3)}
    print(f"coda: collapse {form['collapse_t']:.3f}, last chord {last:.3f}, rung out by {form['ring']:.3f}")

    loud = []
    for b in range(1, BARS + 1):
        seg = x[int(bar(b) * SR):int(bar(b + 1) * SR)]
        loud.append(round(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9), 1) if len(seg) else None)

    data = {
        'source': REL,
        'duration': round(duration, 4),
        'comb': {'t0': round(t0, 4), 'beat': beat, 'bar': 3 * beat, 'bars': BARS},
        'snare': SNARE,
        'pizz': PIZZ,
        'statements': statements,
        'themes': {'A': [[round(q, 4), m] for q, m in THEME_A], 'B': [[round(q, 4), m] for q, m in THEME_B]},
        'heard': heard,
        'form': form,
        'loudness': loud,
    }
    with open(OUT, 'w') as f:
        json.dump(data, f, indent=1)
    print(f'wrote {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()

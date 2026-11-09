"""
Liftoff, Act II: how loud No Time for Caution is, half a beat at a time.

From beat 155 the organ breathes: a chord struck on the second half of a bar's
third beat, held over the bar line and let go, every four beats. The onsets
(liftoff-ntfc-onsets.py) say where the pulse is, not how the sound swells and
falls away between its strikes, and the lift up the spoke and its lamps go by
the swell. This reads the same mix (see that script for how it is built; it
is not in the repository) and writes
scripts/shows/plans/liftoff-ntfc-loudness.json: the loudness of each half
beat from beat 150 to beat 234, as a share of the way from 10.5 dB under the
mix's peak (0) to 2.5 dB under it (1). `SWELL` in
apps/rube/src/shows/versions/interstellar/liftoff/music.ts is these numbers,
and check:shows holds it to this file. Rerun only if the mix changes:

    python3 scripts/shows/liftoff-ntfc-loudness.py

Needs ffmpeg and numpy. It also prints, for the bible, where the last chord
is cut off (CHORD_OFF): the first time after beat 232 that the loudness has
fallen 4 dB from the chord's level.
"""
import json
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MIX = os.path.join(ROOT, 'apps/rube/src/shows/versions/interstellar/interstellar-liftoff-mix-demo.mp3')
OUT = os.path.join(ROOT, 'scripts/shows/plans/liftoff-ntfc-loudness.json')
SR = 22050
HOP = 512
N = 2048
# The cue's comb (liftoff-ntfc-onsets.json): beat k at ORIGIN + PERIOD * k seconds of the show.
ORIGIN = 23.5177
PERIOD = 0.9999
FIRST = 150
LAST = 234
FLOOR_DB = -10.5
SPAN_DB = 8.0


def decode():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', MIX, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def main():
    x = decode()
    frames = 1 + (len(x) - N) // HOP
    idx = np.arange(N)[None, :] + HOP * np.arange(frames)[:, None]
    mag = np.abs(np.fft.rfft(x[idx] * np.hanning(N), axis=1))
    level = np.sqrt((mag ** 2).sum(axis=1))
    t = (np.arange(frames) * HOP + N / 2) / SR
    peak = 20 * np.log10(level.max())

    def db(a, b):
        m = (t >= a) & (t < b)
        return 20 * np.log10(np.sqrt((level[m] ** 2).mean())) - peak

    swell = []
    for h in range(FIRST * 2, LAST * 2 + 1):
        at = ORIGIN + PERIOD * h / 2
        swell.append(round(float(np.clip((db(at - 0.25, at + 0.25) - FLOOR_DB) / SPAN_DB, 0, 1)), 2))

    # The last chord: its level over its first second, and where it has fallen 4 dB from that.
    struck = ORIGIN + PERIOD * 232
    held = db(struck + 0.1, struck + 1.1)
    off = struck + 1.1
    while db(off, off + 0.1) > held - 4:
        off += 0.02
    with open(OUT, 'w') as f:
        json.dump({'source': os.path.relpath(MIX, ROOT), 'first': FIRST, 'last': LAST, 'floor_db': FLOOR_DB, 'span_db': SPAN_DB, 'swell': swell, 'chord_off': round(off, 2)}, f)
        f.write('\n')
    print(f'{len(swell)} half beats, {FIRST} to {LAST}; the last chord is cut off at {off:.2f} s')


if __name__ == '__main__':
    main()

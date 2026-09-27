"""
Windowlight: Near Light as one period of a circle.

Builds apps/rube/src/shows/versions/near-light/near-light-demo.mp3 (demo only; see
apps/rube/src/shows/versions/near-light/ATTRIBUTION.txt) from the recording as fetched:

    yt-dlp -f bestaudio -o near-light.%(ext)s https://www.youtube.com/watch?v=ejaaxLeUQd4
    python3 scripts/shows/near-light-loop.py near-light.webm

(Homebrew's yt-dlp gets 403s from YouTube; a scratch venv with the latest one does not.) Needs ffmpeg and numpy.

Ólafur Arnalds played Near Light to one click, 118.008 beats a minute, from the first chord to the last held tone
(`near-light-onsets.py` measures it). Its first chord is a downbeat, 0.146 s into the recording, and its last sound,
a string's held note, dies on the half-bar of bar 100, 204.5 s in. Bar 101's downbeat, a half-note later, is where
the first chord comes round again: so the loop is 101 bars of that click, from the recording's own zero, and the
first chord of the next time round falls on the beat the last bar is counting towards.

The edit is the least a circle needs. Nothing is moved and nothing is turned up or down: the period is the
recording's first 101 bars as they are, and the room the recording goes on hearing after them (its tone, a creak) is
laid back under their start, fading out over RING seconds, the way a performance played round a circle would have
it. So the seam has no silence in it that the room did not have.

The file carries MARGIN seconds of the period's own end before the show's zero and of its start after the period,
as Gymnopédie's does: the player loops [MARGIN, MARGIN + PERIOD), and a decoder that trims a few samples differently
still meets itself.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'apps/rube/src/shows/versions/near-light/near-light-demo.mp3')
SR = 44100
# The click: seconds a beat, and its first downbeat in the recording (`near-light-onsets.py` fits both).
BEAT = 0.508439
BARS = 101
PERIOD = BARS * 4 * BEAT
MARGIN = 2.0
# Seconds of the room after the period laid back under its start, fading to nothing.
RING = 1.2


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    x = decode(sys.argv[1])
    n = int(round(PERIOD * SR))
    if len(x) < n + int(RING * SR):
        sys.exit(f'the recording is {len(x) / SR:.2f} s: not Near Light as Erased Tapes uploaded it')
    loop = x[:n].copy()
    tail = x[n:n + int(RING * SR)].copy()
    # A raised-cosine fade over the ring, so the room goes as it would, not with a step.
    fade = 0.5 * (1 + np.cos(np.linspace(0, np.pi, len(tail))))
    loop[:len(tail)] += tail * fade[:, None]
    m = int(MARGIN * SR)
    padded = np.concatenate([loop[-m:], loop, loop[:m]])
    # The recording's own peaks (its loudest bars are mastered to full scale) go to the encoder as they are, in
    # floating point: nothing is clipped and nothing is turned down.
    peak = np.abs(padded).max()
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'near-light.wav')
        pcm = padded.astype('<f4')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', wav],
                       input=pcm.tobytes(), check=True)
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', OUT], check=True)
    print(f'period {PERIOD:.4f} s ({BARS} bars of {4 * BEAT:.6f} s), margin {MARGIN} s, peak {peak:.3f}: {OUT}')


if __name__ == '__main__':
    main()

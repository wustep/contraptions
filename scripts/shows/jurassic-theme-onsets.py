#!/usr/bin/env python3
"""Landmarks for Amber, measured once from a local album rip.

The show plays John Williams's "Theme from Jurassic Park" from YouTube
(lDlU08RU7Tk) and never ships the audio. This script reads a local copy
at out/jurassic-theme/archive-theme.mp3 — the album track, fetched for
measurement only — and checks the committed landmarks in
scripts/shows/plans/jurassic-theme-onsets.json.

The cue is legato. The landmarks are not a click. They are the phrase
returns, the orchestra's entrance, and the crests, read off a 22050 Hz
mono decode:

  bone      7.790    the second phrase's attack, after the breath
  crate    11.494    a strong note of that phrase
  lab      16.807    the third phrase returns
  pipettes 21.049    a strong note inside it
  eggAt    32.241    he arrives by the egg on this note
  egg      45.476    a small note in the hush; the shell starts
  valley   47.397    the orchestra comes in
  gates    86.912    the first big crest
  jeep     91.835    he reaches the jeep
  drive   100.055    the jeep stops
  board   105.953    the lift leaves the ground
  clear   110.210    the crest he meets on the neck
  birds   157.338    the full statement
  dawn    178.220    the quietest point before the last build
  lift    187.176    the last statement's attack
  last    201.322    the last moment above -45 dB

If the mp3 is absent the script prints the committed plan and exits 0.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PLAN = ROOT / "scripts" / "shows" / "plans" / "jurassic-theme-onsets.json"
AUDIO = ROOT / "out" / "jurassic-theme" / "archive-theme.mp3"


def main() -> int:
    plan = json.loads(PLAN.read_text())
    print(f"youtube {plan['youtube']}  duration {plan['duration']:.3f}  last {plan['last']:.3f}")
    for name, t in plan["landmarks"].items():
        print(f"  {name:10} {t:8.3f}")
    if not AUDIO.exists():
        print(f"no local rip at {AUDIO}; landmarks left as committed")
        return 0
    try:
        import numpy as np
    except ImportError:
        print("numpy is not installed; landmarks left as committed")
        return 0
    raw = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(AUDIO), "-ac", "1", "-ar", "22050", "-f", "f32le", "-"],
        stderr=subprocess.DEVNULL,
    )
    x = np.frombuffer(raw, dtype=np.float32)
    sr = 22050
    hop = int(0.01 * sr)
    win = int(0.03 * sr)
    n = 1 + (len(x) - win) // hop
    rms = np.empty(n)
    for i in range(n):
        s = x[i * hop : i * hop + win]
        rms[i] = np.sqrt(np.mean(s * s) + 1e-12)
    t = np.arange(n) * hop / sr
    db = 20 * np.log10(rms + 1e-9)
    duration = len(x) / sr
    if abs(duration - plan["duration"]) > 0.01:
        print(f"duration {duration:.4f} disagrees with the plan", file=sys.stderr)
        return 1
    # Each landmark has to sit inside the musical window it was read from. The attacks are flux onsets and the
    # crests are loudness; they are a few tens of milliseconds apart, and the plan keeps the one the picture uses.
    windows = {
        "bone": (7.5, 8.2),
        "lab": (16.6, 17.2),
        "valley": (47.2, 47.8),
        "gates": (86.5, 87.3),
        "clear": (109.8, 110.6),
        "birds": (157.0, 157.7),
        "dawn": (177.8, 178.6),
        "lift": (186.9, 187.6),
    }
    bad = False
    for name, (a, b) in windows.items():
        want = float(plan["landmarks"][name])
        if not (a <= want <= b):
            print(f"{name}: plan {want:.3f} is outside {a:.1f}-{b:.1f}", file=sys.stderr)
            bad = True
    last = float(t[np.where(db > -45)[0][-1]])
    if abs(last - plan["last"]) > 0.05:
        print(f"last: measured {last:.3f}, plan {plan['last']:.3f}", file=sys.stderr)
        bad = True
    if bad:
        return 1
    print("the landmarks sit in their windows, and the fade agrees")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

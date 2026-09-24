"""Measure attack times in the CC0 Carmen Prelude recording used by the Sol one-shot.

Run after placing the recording at docs/promo/carmen-prelude-musopen.ogg:
    python3 scripts/carmen-onsets.py
The output is a candidate list for hand-picked musical cues, not an automatic score.
Requires ffmpeg and numpy; it is not part of the app build.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/promo/carmen-prelude-musopen.ogg"
RATE = 11025
HOP = 256
WINDOW = 2048
raw = subprocess.check_output([
    "ffmpeg", "-v", "error", "-i", str(SOURCE), "-ac", "1", "-ar", str(RATE),
    "-f", "f32le", "-",
])
audio = np.frombuffer(raw, dtype="<f4")
last = np.zeros(WINDOW // 2 + 1)
flux = []
for start in range(0, len(audio) - WINDOW, HOP):
    spectrum = np.abs(np.fft.rfft(audio[start:start + WINDOW] * np.hanning(WINDOW)))
    spectrum /= max(1e-9, spectrum.sum())
    flux.append(np.maximum(0, spectrum - last).sum())
    last = spectrum
flux = np.array(flux)
smoothed = np.convolve(flux, np.ones(3) / 3, mode="same")
peaks = []
for i in range(5, len(smoothed) - 5):
    local = smoothed[i - 5:i + 6]
    if smoothed[i] != local.max():
        continue
    t = (i * HOP + WINDOW / 2) / RATE
    peaks.append((round(t, 3), round(float(smoothed[i]), 3)))
selected = []
for start in range(0, 125, 3):
    candidates = sorted((p for p in peaks if start <= p[0] < start + 3), key=lambda p: p[1], reverse=True)
    picks = []
    for peak in candidates:
        if all(abs(peak[0] - picked[0]) > .22 for picked in picks):
            picks.append(peak)
        if len(picks) == 2:
            break
    selected.extend(picks)
selected.sort()
target = ROOT / "scripts/show-plans/carmen-sol-onsets.json"
target.write_text(json.dumps({"source": "carmen-prelude-musopen.ogg", "hop": HOP / RATE, "attacks": selected}, indent=2) + "\n")
print(f"{len(selected)} attacks -> {target.relative_to(ROOT)}")

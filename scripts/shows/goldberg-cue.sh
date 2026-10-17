#!/bin/sh
# Bach's first Goldberg variation (Variatio 1. a 1 Clav., BWV 988) as the Quarter Turn show plays it: Kimiko
# Ishizaka's recording from the Open Goldberg Variations (2012), which she dedicated to the public domain (CC0) and
# which Wikimedia Commons keeps, whole, from its first sample to its last.
#
#   sh scripts/shows/goldberg-cue.sh [<source>]
#
# <source> is the recording as Wikimedia Commons keeps it (MP3, 44.1 kHz, 320 kbit/s constant, 115.47 s; fetched when
# not given):
#
#   https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_J.S._Bach-_-Open-_Goldberg_Variations,_BWV_988_(Piano)_-_02_Variatio_1_a_1_Clav.mp3
#
# It is already constant bit rate, so a seek lands where the clock says, and it is not re-encoded: only its tags (the
# album's cover picture among them) are taken off, so every sample is the recording's own. After running this,
# measure it again:
#
#   python3 scripts/shows/goldberg-onsets.py
set -e
cd "$(dirname "$0")/../.."
OUT=apps/rube/src/shows/versions/goldberg/bach-goldberg-1-ishizaka.mp3
if [ -n "$1" ]; then
  SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SRC="${TMPDIR:-/tmp}/bach-goldberg-1-ishizaka.mp3"
  curl -sL -A "contraptions-show/1.0" -o "$SRC" \
    "https://upload.wikimedia.org/wikipedia/commons/6/6c/Kimiko_Ishizaka_-_J.S._Bach-_-Open-_Goldberg_Variations%2C_BWV_988_%28Piano%29_-_02_Variatio_1_a_1_Clav.mp3"
fi
# The ID3v2 tag at the head (its size is in its header) and the 128-byte ID3v1 tag at the tail, if there is one.
python3 - "$SRC" "$OUT" <<'EOF'
import sys
d = open(sys.argv[1], 'rb').read()
head = 0
if d[:3] == b'ID3':
    head = 10 + ((d[6] << 21) | (d[7] << 14) | (d[8] << 7) | d[9])
tail = len(d) - 128 if d[-128:-125] == b'TAG' else len(d)
open(sys.argv[2], 'wb').write(d[head:tail])
print(f'{sys.argv[2]}: {tail - head} bytes of audio ({head} of tag before, {len(d) - tail} after)')
EOF

#!/bin/sh
# Chopin's "Raindrop" Prelude (Op. 28 No. 15, D-flat major) as the Raindrop show plays it: Ivan Ilić's recording
# (Paris, October 2005), which he released on IMSLP under CC BY 3.0 and which Wikimedia Commons keeps, whole, from its
# first sample to its last.
#
#   sh scripts/shows/raindrop-cue.sh [<source>]
#
# <source> is the recording as Wikimedia Commons keeps it (Ogg Vorbis, 44.1 kHz, 263.58 s; fetched when not given):
#
#   https://commons.wikimedia.org/wiki/File:Ivan_Ili%C4%87-Chopin_-_Prelude_no._15_in_D_flat_major.ogg
#
# The show plays it whole and untouched, so every onset is the recording's own: no trim, no fade, no gain. It is
# re-encoded at a constant bit rate, so a seek lands where the clock says. After running this, measure it again:
#
#   python3 scripts/shows/raindrop-onsets.py
#
# FFMPEG=<path> names an ffmpeg other than the one on the PATH.
set -e
cd "$(dirname "$0")/../.."
FF="${FFMPEG:-ffmpeg}"
OUT=apps/rube/src/shows/versions/raindrop/chopin-raindrop-ilic.mp3
if [ -n "$1" ]; then
  SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SRC="${TMPDIR:-/tmp}/chopin-raindrop-ilic.ogg"
  curl -sL -A "contraptions-show/1.0" -o "$SRC" \
    "https://upload.wikimedia.org/wikipedia/commons/d/d2/Ivan_Ili%C4%87-Chopin_-_Prelude_no._15_in_D_flat_major.ogg"
fi
"$FF" -loglevel error -y -i "$SRC" -map_metadata -1 -ac 2 -ar 44100 -c:a libmp3lame -b:a 160k "$OUT"
"$FF" -hide_banner -i "$OUT" 2>&1 | grep Duration || true

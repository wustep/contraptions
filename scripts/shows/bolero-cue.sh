#!/bin/sh
# Ravel's Boléro as the Ostinato show plays it: Omega13a's orchestral recording, made in MuseScore 4 with Muse Sounds
# from Ravel's score and released on Wikimedia Commons under CC BY 4.0, whole, from its first sample to its last.
#
#   sh scripts/shows/bolero-cue.sh [<source>]
#
# <source> is the recording as Wikimedia Commons keeps it (Ogg Opus, 48 kHz, 851.99 s; fetched when not given):
#
#   https://commons.wikimedia.org/wiki/File:Boléro_–_Maurice_Ravel.ogg
#
# The show plays it whole and untouched, so every onset is the recording's own: no trim, no fade, no gain. It is
# re-encoded at a constant bit rate, so a seek lands where the clock says. After running this, measure it again:
#
#   python3 scripts/shows/bolero-onsets.py
set -e
cd "$(dirname "$0")/../.."
OUT=apps/rube/src/shows/versions/bolero/bolero-omega13a.mp3
if [ -n "$1" ]; then
  SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SRC="${TMPDIR:-/tmp}/bolero-omega13a.ogg"
  curl -sL -A "contraptions-show/1.0" -o "$SRC" \
    "https://upload.wikimedia.org/wikipedia/commons/0/0c/Bol%C3%A9ro_%E2%80%93_Maurice_Ravel.ogg"
fi
ffmpeg -loglevel error -y -i "$SRC" -af aresample=44100 -ac 2 -c:a libmp3lame -b:a 160k "$OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"

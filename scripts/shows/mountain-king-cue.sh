#!/bin/sh
# Grieg's "In the Hall of the Mountain King" (Peer Gynt Suite No. 1, Op. 46, IV), played by the Czech National
# Symphony Orchestra for Musopen and released by Musopen into the public domain, as the Mountain King show plays it:
# the whole recording, from its first sample to its last.
#
#   sh scripts/shows/mountain-king-cue.sh [<source>]
#
# <source> is Musopen's FLAC as Wikimedia Commons keeps it (fetched when not given):
#
#   https://commons.wikimedia.org/wiki/File:Grieg_-_Peer_Gynt_Suite_No._1,_Op._46_-_IV._In_the_Hall_of_the_Mountain_King_(Musopen_Symphony).flac
#
# The same recording is on YouTube as the label's upload ("Czech National Symphony Orchestra, Prague - Topic",
# provided to YouTube by CDBaby, video k8HCJS4FflY): measured against this file, the two line up sample for sample
# (lag 0, 154.091 s both), which is why the show can play either on one clock.
#
# The show plays it whole and untouched, so every onset is the recording's own: no trim, no fade, no gain. After
# running this, measure it again:
#
#   python3 scripts/shows/mountain-king-onsets.py
set -e
cd "$(dirname "$0")/../.."
OUT=apps/rube/src/shows/versions/mountain-king/grieg-mountain-king-musopen.mp3
if [ -n "$1" ]; then
  SRC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  SRC="${TMPDIR:-/tmp}/mountain-king-musopen.flac"
  curl -sL -A "contraptions-show/1.0" -o "$SRC" \
    "https://upload.wikimedia.org/wikipedia/commons/8/84/Grieg_-_Peer_Gynt_Suite_No._1%2C_Op._46_-_IV._In_the_Hall_of_the_Mountain_King_%28Musopen_Symphony%29.flac"
fi
ffmpeg -loglevel error -y -i "$SRC" -af aresample=44100 -ac 2 -c:a libmp3lame -b:a 160k "$OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"

#!/bin/sh
# Whiplash's finale: "Caravan" (Juan Tizol, Duke Ellington, Irving Mills; arranged by John Wasson), the whole
# recording from the soundtrack, from its first sample to its last.
#
#   sh scripts/shows/caravan-cue.sh <source>
#
# <source> is the track as fetched once from the label's upload (provided to YouTube by The Orchard for Lakeshore
# Records, on the "John Wasson - Topic" channel):
#
#   yt-dlp -f bestaudio -x --audio-format wav -o caravan.%(ext)s https://www.youtube.com/watch?v=38CRu1rCaKg
#
# (Brew's yt-dlp gets 403s from YouTube; a scratch venv with the latest one does not.)
#
# The recording is copyrighted, for private demos only (see apps/rube/src/shows/versions/caravan/ATTRIBUTION.txt).
# The show plays it whole and untouched, so every onset is the recording's own: no trim, no fade, no gain. After
# running this, measure it again:
#
#   python3 scripts/shows/caravan-onsets.py
set -e
SRC="$(cd "$(dirname "${1:?the fetched track}")" && pwd)/$(basename "$1")"
cd "$(dirname "$0")/../.."
ffmpeg -loglevel error -y -i "$SRC" -af aresample=44100 -ac 2 -c:a libmp3lame -b:a 128k \
  apps/rube/src/shows/versions/caravan/whiplash-caravan-demo.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 apps/rube/src/shows/versions/caravan/whiplash-caravan-demo.mp3

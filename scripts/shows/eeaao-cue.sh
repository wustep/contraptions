#!/bin/sh
# Everything Everywhere's soundtrack: Son Lux's "Come Recover (Empathy Fight)", from its first sample, to the
# end of the credits.
#
#   sh scripts/shows/eeaao-cue.sh <source>
#
# <source> is the cue as fetched once from the official upload (Virgin Music Group for A24 Music):
#
#   yt-dlp -f bestaudio -x --audio-format wav -o come-recover.%(ext)s https://www.youtube.com/watch?v=IOh1H06Cx0w
#
# The recording is copyrighted, for private demos only (see
# apps/rube/src/shows/versions/come-recover/ATTRIBUTION.txt). The show plays it from its first sample, untouched, so every
# onset is the recording's own; it stops after the quiet tail has carried the end credits, fading over its last
# eight seconds. Gain and a fade move no onset. After running this, measure it again:
#
#   python3 scripts/shows/eeaao-onsets.py
set -e
SRC="$(cd "$(dirname "${1:?the fetched cue}")" && pwd)/$(basename "$1")"
cd "$(dirname "$0")/../.."
END=332
FADE=9
ffmpeg -loglevel error -y -i "$SRC" \
  -af "aresample=44100,atrim=0:$END,asetpts=PTS-STARTPTS,afade=t=out:st=$((END - FADE)):d=$FADE" \
  -ac 2 -c:a libmp3lame -b:a 128k \
  apps/rube/src/shows/versions/come-recover/eeaao-come-recover-demo.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 apps/rube/src/shows/versions/come-recover/eeaao-come-recover-demo.mp3

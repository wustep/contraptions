#!/bin/sh
# Seb's soundtrack: Justin Hurwitz's Epilogue whole, then The End after the nod.
#
#   sh scripts/shows/sebs-mix.sh <epilogue> <the-end>
#
# Both are the cues as fetched from the label's uploads ("Justin Hurwitz - Topic"), which are not kept:
#
#   yt-dlp -f bestaudio -x -o epilogue.%(ext)s https://www.youtube.com/watch?v=_vpCaKQXhMg
#   yt-dlp -f bestaudio -x -o the-end.%(ext)s https://www.youtube.com/watch?v=PMbrnvyLTdg
#
# Both recordings are copyrighted, for private demos only
# (see apps/rube/src/shows/versions/la-la-land/SEBS_ATTRIBUTION.txt). The mix is what the
# show plays; this rebuilds it from the two sources, as fetched.
#
# The Epilogue plays from its first sample, untouched, so the show's clock is
# the recording's own: its last chord is at 453.73 s, and it runs out at
# 460.84 s. Then the room is silent while Mia and David get up and go to the
# door, she looks back, and Seb nods. The End comes in at 464.0 s of the show,
# as she leaves, and runs whole to its last chord. No gain, no fades, no
# timing changes: the onsets are the recordings' own.
set -e
abs() { echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; }
EPILOGUE="$(abs "${1:?the Epilogue, as fetched}")"
THE_END="$(abs "${2:?The End, as fetched}")"
cd "$(dirname "$0")/../.."
ffmpeg -loglevel error -y \
  -i "$EPILOGUE" \
  -i "$THE_END" \
  -filter_complex "\
[0:a]aresample=44100,asetpts=PTS-STARTPTS[a];\
[1:a]aresample=44100,asetpts=PTS-STARTPTS,adelay=464000|464000[b];\
[a][b]amix=inputs=2:normalize=0:duration=longest[m]" \
  -map "[m]" -ac 2 -c:a libmp3lame -b:a 160k \
  apps/rube/src/shows/versions/la-la-land/la-la-land-sebs-mix-demo.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 apps/rube/src/shows/versions/la-la-land/la-la-land-sebs-mix-demo.mp3

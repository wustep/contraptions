#!/bin/sh
# Liftoff's soundtrack: Cornfield Chase whole, then No Time for Caution from bar 26.
#
#   sh scripts/shows/liftoff-mix.sh <no-time-for-caution> [<cornfield-chase>]
#
# Neither recording is kept in the repository (copyrighted audio is YouTube-only, #147). Fetch both from the official
# uploads the show plays:
#
#   yt-dlp -f bestaudio -x -o ntfc.%(ext)s https://www.youtube.com/watch?v=kpK4cDk2bRs
#   yt-dlp -f bestaudio -x -o cornfield.%(ext)s https://www.youtube.com/watch?v=JuSsvM8B4Jc
#
# <cornfield-chase> defaults to apps/rube/src/shows/versions/cornfield-chase/cornfield-chase-zimmer.mp3, where it was
# kept before. The mix is written to apps/rube/src/shows/versions/interstellar/interstellar-liftoff-mix-demo.mp3, for
# measuring (scripts/shows/liftoff-ntfc-onsets.py); it is not committed.
#
# Both recordings are copyrighted, for private demos only
# (see apps/rube/src/shows/versions/*/ATTRIBUTION.txt). The mix is what the show was timed to (the page plays the
# two uploads on its numbers, apps/rube/src/shows/versions/interstellar/liftoff/index.ts); this rebuilds it from the
# two sources. Cornfield Chase plays from its first
# sample, untouched, so Act I keeps the clock it was timed to. No Time for
# Caution comes in one beat before its bar-26 accent (103.76 s in the cue),
# fading up over that beat, so the accent (104.76 s) lands at 127.5 s of the
# show: its beat k is at 23.5 + k s. It runs to the cue's end.
#
# The cue starts much quieter than Cornfield Chase's chase (about -24 LUFS
# against -13.5) and builds to a peak that already touches 0 dBFS. So it is
# lifted on a curve, not by one gain: +7 dB to 200 s of the show, easing to
# +3.5 dB by 220 s and +1.5 dB from 245 s, which keeps its build. A limiter
# with its delay compensated catches the peak. Gain moves no onset: the
# timing is the recording's own. Cornfield Chase is untouched.
set -e
missing() { echo "liftoff-mix: no such file: $1 (fetch it first; see the top of this script)" >&2; exit 1; }
[ -f "${1:?No Time for Caution, as fetched}" ] || missing "$1"
NTFC="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
CORNFIELD=""
if [ -n "${2:-}" ]; then
  [ -f "$2" ] || missing "$2"
  CORNFIELD="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
fi
cd "$(dirname "$0")/../.."
CORNFIELD="${CORNFIELD:-apps/rube/src/shows/versions/cornfield-chase/cornfield-chase-zimmer.mp3}"
[ -f "$CORNFIELD" ] || missing "$CORNFIELD"
ffmpeg -loglevel error -y \
  -i "$CORNFIELD" \
  -i "$NTFC" \
  -filter_complex "\
[0:a]aresample=44100,atrim=0:126.984,asetpts=PTS-STARTPTS,afade=t=out:st=125.98:d=1.0[a];\
[1:a]aresample=44100,atrim=103.76:240,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.0,\
volume='pow(10,(if(lt(t,73.5),7,if(lt(t,93.5),7-3.5*(t-73.5)/20,if(lt(t,118.5),3.5-2*(t-93.5)/25,1.5))))/20)':eval=frame,\
alimiter=limit=0.93:attack=5:release=80:level=0:latency=1,adelay=126500|126500[b];\
[a][b]amix=inputs=2:normalize=0:duration=longest[m]" \
  -map "[m]" -ac 2 -c:a libmp3lame -b:a 128k \
  apps/rube/src/shows/versions/interstellar/interstellar-liftoff-mix-demo.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 apps/rube/src/shows/versions/interstellar/interstellar-liftoff-mix-demo.mp3

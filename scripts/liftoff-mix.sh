#!/bin/sh
# Liftoff's soundtrack: Cornfield Chase whole, then No Time for Caution from bar 26.
#
#   sh scripts/liftoff-mix.sh
#
# Both recordings are copyrighted and in docs/promo for private demos only
# (see docs/promo/*_ATTRIBUTION.txt). The mix is what the show plays; this
# rebuilds it from the two sources. Cornfield Chase plays from its first
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
cd "$(dirname "$0")/.."
ffmpeg -loglevel error -y \
  -i docs/promo/cornfield-chase-zimmer.mp3 \
  -i docs/promo/interstellar-no-time-for-caution-demo.mp3 \
  -filter_complex "\
[0:a]aresample=44100,atrim=0:126.984,asetpts=PTS-STARTPTS,afade=t=out:st=125.98:d=1.0[a];\
[1:a]aresample=44100,atrim=103.76:240,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.0,\
volume='pow(10,(if(lt(t,73.5),7,if(lt(t,93.5),7-3.5*(t-73.5)/20,if(lt(t,118.5),3.5-2*(t-93.5)/25,1.5))))/20)':eval=frame,\
alimiter=limit=0.93:attack=5:release=80:level=0:latency=1,adelay=126500|126500[b];\
[a][b]amix=inputs=2:normalize=0:duration=longest[m]" \
  -map "[m]" -ac 2 -c:a libmp3lame -b:a 128k \
  docs/promo/interstellar-liftoff-mix-demo.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 docs/promo/interstellar-liftoff-mix-demo.mp3

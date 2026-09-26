# Caravan

Copyrighted recording, used for a private tech demo only. Nothing here claims any right to it. Attribution is in
`apps/rube/src/shows/versions/caravan/ATTRIBUTION.txt`.

Open it at `/shows/caravan/` or `/shows/?show=caravan&take=opus55` (add `&music=file` to play the demo file instead
of the label's YouTube upload). In the picker it is **Caravan**, one take, **Opus 5.5**.

## What it is

A Rube Goldberg machine plays "Caravan" from the *Whiplash* soundtrack, the film's finale with Andrew Neiman's drum
solo. It plays the whole recording, 9:15, untouched, and the credits run on for 20 s in silence over the dark hall:
575.5 s in all, the longest show in the catalogue. It tells the film in order over the music.

- **Andrew Neiman is the yellow ball** (`#F2B233`), the thread. Every strike is his.
- **Terence Fletcher is the black ball** (`#1E1C1B`) on a conductor's rig: a black column, a chest, two long arms
  and pale hands. The hands are his instrument, in four shapes: open (hold), beat (time), point ("you") and the
  fist. He conducts small and tight at the chest, the way the film's Fletcher does; his arms go overhead only to
  hold a chord. The fist closes once, on the last stroke of the recording. His ball carries no rolling mark: it is
  a head, and the house's spin dot read as an eye.
- **Jim Neiman, his father, is the blue-grey ball** (`#8FA7BD`), at Carnegie Hall only.
- **Carl Tanner is the olive ball** (`#8C8F66`), in the band room and at the competition only.
- **Blood** is one dab on the practice kit's snare head, at night, from the stroke that makes it. Nowhere else.

There are no portals. Three universes share one set of cells and one clock (`whiplash/show.ts`): Shaffer, the road,
and Carnegie Hall. The stage changes place twice, both times on a match cut with the ball at rest. The new place
opens under the old one's darkness and wakes on the next strong hit.

## The cue

The whole recording, offset 0, one cue. I weighed a second cue ("Upswingin'" for the sabotage, Hank Levy's
"Whiplash" for the band room) and a shorter splice of Caravan, and turned both down. A splice inside Caravan would be
heard by anyone who knows the film, and a second cue makes the show 11 minutes. Caravan alone already has the film's
shape: a drummer alone, the band, a quiet stretch, the band loud again, stop-time breaks (the crash), the last
chorus, the cut-off, and then the drummer who doesn't stop.

The file comes from the label's upload (the "John Wasson - Topic" video `38CRu1rCaKg`), fetched by
`scripts/shows/caravan-cue.sh`, so the YouTube cue `[{ id: '38CRu1rCaKg' }]` runs on the same clock sample for
sample. The mp3 is the fallback and the export's audio.

## The measured structure

Measured once by `scripts/shows/caravan-onsets.py` into `scripts/shows/plans/caravan-onsets.json`. `check:shows`
holds every strike against that file.

| Show s | Music | How it keeps time |
| ---: | --- | --- |
| 0.21 to 30.65 | the drum intro alone; the bass from 21.11 | a click: quarter 0.2143 s (280 bpm), `tune(k)` = 0.2153 + 0.42856 k |
| 30.65 to 130.5 | the band, the tune | the same click |
| 130.5 to 172.07 | the quiet stretch | the same click |
| 172.07 to 242 | loud again; stop-time breaks 227.15 to 233.99 (12 hits) | the same click |
| 242 to 262.03 | the last chorus, to its last hit at 261.13 | its own comb, `shout(k)` (off the click by up to 95 ms) |
| 262.03 to 269.8 | the band's held chord, and the cut-off | |
| 270.52 to 323.27 | the solo, loud and dense | measured strokes, drum by drum (`KICKS`, `SNARES`, `CYMBALS`) |
| 323.27 to 369.98 | the hush: soft cymbals, with bursts | measured strokes |
| 369.98 to 423.34 | the build; loudest and fastest 383 to 423 (snare every 70 ms, kick every 155 ms) | measured strokes |
| 423.34 to 432.72 | the ride, soft and dense | measured strokes |
| 432.72 to 483.92 | the rubato: 162 ride strokes, 0.17 s apart slowing to 0.92 s (458.58) and back to 0.13 s | `RIDE`, one by one |
| 484 to 504 | a roll too fast to count, swelling | loudness only |
| 504.0 | the burst (the kick) | |
| 504 to 541.49 | the kick march, the long roll (519 to 535), the last fill (539.97), the last stroke | measured strokes |
| 541.8 to 543.2 | silence | |
| 543.25 to 548.56 | the band's last chord, held; the final cut-off at 548.555 | |

Tolerances: ±30 ms on a comb, ±35 ms on a measured onset, ±30 ms on a drum stroke or a ride stroke.

## The parts, in order

Each part gets a slot (when the ball arrives, when it must leave) and builds its lane from timed waypoints, so a
strike is on the music by construction (`whiplash/kit.ts`, after Liftoff's and Epilogue's kits).

| Show s | Part | File | What happens |
| ---: | --- | --- | --- |
| 0 | practice | `shaffer/practice.ts` | The film's first shot: down a long dark corridor to one lit practice room. He drops onto the kick pedal and plays the intro's groove across the old oxblood kit, a strike on every stroke; the camera goes in close on the snare and the hi-hat for the backbeat and out with him down the toms for the fill; the lamp sways on its cord. On the bass (21.11) Fletcher is black in the doorway against the corridor's light. He keeps time, points ("you"), and goes. Andrew follows him out down the corridor. |
| 30.65 | band | `shaffer/band.ts` | The studio band in its tiered room. He comes down the tiers a step a bar, Fletcher points him to the alternate's chair, and he turns Tanner's pages. Tanner plays every beat on his snare while Andrew taps the same time on his chair; on the tutti the trumpets stand; a look across at the band at work. Fletcher puts him on the kit. |
| 80.79 | tempo | `shaffer/tempo.ts` | "Not quite my tempo." Fletcher's hand keeps time on the snare's far side: rushing, dragging, the palm slammed flat. The chair thrown on a big hit (he ducks behind the snare; it hits the back wall and lies behind the kit). The counts, each its own beat: a two-shot for the count-in, close on the palm slapped down by his ear. The last trial wide and clean, one push onto the last stop. Tanner gets the kit back and Andrew goes out the far door on the band's last hit. |
| 130.5 | night | `shaffer/night.ts` | The practice room at night. He knocks the pull-cord and the lamp comes on. The drill rig (two sticks on hinged posts) against the metronome, faster and faster, framed to the tune's phrases: close on the sticks, back to the clock and the bulb, in on the red dab when it comes; a plunge into the ice water; close on the tape wound on the bleeding stick's grip. On the last stroke the bulb pops and the room goes dark round him. |
| 172.07 | folder | `road/folder.ts` | Match cut to Overbrook, backstage. Tanner leaves his folder with Andrew; Andrew goes to the vending machine; the folder is gone. Fletcher sends him to the kit and he plays the performance from memory: the core seat. Out through the loading door into the rental car. |
| 205.92 | crash | `road/crash.ts` | The drive: low and close on him at the wheel, every sodium lamp lighting on the beat as he passes under it; then long and high as the truck's high beams flash far ahead, the two of them in one frame, closing. The brakes, and the twelve stop-time breaks as the crash, one impact a hit. He drops out of his belt, crawls out from under the hood, and goes on into the dark. |
| 242.34 | sabotage | `carnegie/sabotage.ts` | Match cut to Carnegie Hall, waking on the chorus's first big hit. Fletcher flings the wrong chart, tumbling, onto Andrew's desk; his kit stays silent while the band plays past him: three tries on the chorus's beats, each smaller, and nothing. A look from the chart to Fletcher and back. He goes to the stage door and his father holds him there under the held chord. He turns back, lands on the snare as Fletcher's open hands cut the band off, and counts himself in. |
| 270.52 | solo | `carnegie/solo.ts` | The solo. A drummer's frame of chrome hardware flies in from the flies; he leaps into the cup at its top and it plays as his body: two jointed arms with sticks, a shin on the kick pedal, his head nodding down onto the accents. The camera picks a subject per key (the snare, the crash with his head, the pedal, the wide with Fletcher watching). A stick thrown end over end and caught for the biggest hit. |
| 323.27 | hush | `carnegie/hush.ts` | The hush. He lands on the crash and knocks it askew. Fletcher comes down off his podium, stops short of the bass, rises on his column, sets it straight with one hand, and leans in to look at him. The bursts round the toms, the camera close and going with him drum to drum; the crash again, and it holds. Across the dark stage to his father in the wings' light, leaning to see his son, and back. |
| 369.98 | fast | `carnegie/fast.ts` | The build. An engine rises from the stage: he rides and stomps its sprung treadle (every stomp a kick), a small flywheel spins up, and two trip-hammer sticks under a short arm, cammed, beat the snare, one stroke a stomp and then a 70 ms roll. Fletcher, on his podium, starts to conduct him. |
| 423.34 | rubato | `carnegie/rubato.ts` | The show's heart. A walnut metronome with its works exposed rises behind the kit and he rides the weight on its short arm; the long arm's bob strikes the ride's rim at one end of its swing and the crash's at the other, on every one of the 162 strokes; he climbs as it slows and sits down as it quickens, the way a real metronome's weight sets its period. The roll is a trembling rod and a blur, him held still on it, the hall's light rising; the machine crouches, flings him onto the snare on the burst, and the light slams up. |
| 504.0 | finale | `carnegie/finale.ts` | The kick march round the toms as the metronome sinks; the drummer's frame comes down again and he leaps into its cup. The long roll, low and close on the blur of both sticks. Fletcher crosses to the kit, rises to Andrew's height, leans in and nods, once, deep and held; Andrew tips toward him and nods back. Fletcher stays by the kit. The last fill; both sticks up through the silence, his hands up for the band; the band's last chord; and the cut-off: his open left hand circles up and comes down hard, closing on the last stroke, the fist between the two of them. The hall goes dark under the credits. |

## Craft notes

- **Canonical drawings.** One kit (`drums.ts`, `drawKit`), one conductor (`fletcher.ts`, `drawConductor`), one
  Carnegie Hall (`carnegie/hall.ts`). Every part that shows them draws them this way, so the kit in the practice
  room and at Carnegie is the same object in a different lacquer.
- **rectMode.** The stage draws in `rectMode(CENTER)` (`engine.ts`). The kit, the rig, the hall and every builder's
  set are laid out by corners, so each sets `CORNER` inside its own push. Before that fix every rect in the hall was
  off by half its size: the stage door floated, the back wall had a seam down the middle of the frame.
- **Cymbal seats.** p5's `rotate(+a)` dips the right edge. The first `KIT_LAND` had the sign backwards and sat the ball
  0.15 inside the crash. `path.ts` `onCymbal` turns the seat with the same angle the kit draws the cymbal at, swing
  and askew included, so a ball riding a swinging cymbal never slides through it.
- **One Carnegie frame.** Every Carnegie part enters and leaves on the snare at (-0.5, 0), and the camera is `CLOSE`
  on every seam there. Each part's machine flies in (from the flies, the stage, the trap) and out again, because
  all of them stand in one hall.
- **The director's clock.** `carnegie/conductor.ts` holds Fletcher, Jim and the crash's tilt from the solo to the end.
  The hush and the finale time Andrew to it. The hall draws Fletcher from it.
- **The roll is drawn, not struck.** Where the music runs together (the build's roll, the rubato's swell, the
  finale's long roll), nothing hits. A blur, a shimmer, a trembling head (`hall.ts` `kitSince`).
- **Fletcher's arms blend the short way round.** A linear blend from hanging to raised swings the arm across the
  chest; `fletcher.ts` `blendPose` turns each upper arm the short way, everywhere.
- **Fletcher conducts from one pattern.** `beatPose` reaches the hand to chest-height targets (two-link IK, the
  elbow low and out): the hand falls into the ictus with a flick of the wrist, rebounds, floats at chin height. The
  first version parked both arms overhead and read as "hooray". The band room's own pattern now calls it too.
- **Leaning.** `drawConductor` takes `base` (the column's foot): the head can lean off it, the chest and arms tipped
  with the column, the foot planted. The hush's look and the nod use it.
- **The fist.** Side on, 1.3 times an open hand, one rounded block with the thumb across it and a single ridge. Four
  knuckle bumps on the end read as fingertips (a wave). It is struck with his left hand, on the house's right, over
  clear wall: his right side is all the frame's arm and sticks.
- **Company without a mark.** `ShowBall.spin` (engine, opt-in): `null` draws no spin dot. Only Fletcher sets it.
- **The credits find clear wall.** From the cut-off the camera pulls back and up until the machine sits in the lower
  half of the frame; on a tall screen (a phone held upright) `credits.ts` sets the cards high in the empty band
  over the stage instead of the 16:9 box's top.
- **No outlines on the building.** The rooms' walls and ceilings are filled planes; ink contours round them ran as
  stepped hairlines at the frame's edges and as long verticals at the corridor seams.
- **The fist is checked.** `check:shows` walks `poseAt` from the solo to the end and fails if a fist shows before
  the final cut-off.
- **Traps.** A Vite reload during a shot freezes every later frame. `dev/shot.mjs` below about 900 px wide puts the
  panel back and stretches frames. Import order matters in `carnegie/rubato.ts` (its first line re-exports the
  strokes so `strokes.ts` finds them set); the hush and the finale import nothing that imports `hall.ts`.

## How to run it

```
npx vite --port 8931 --strictPort                 # then /shows/?show=caravan&take=opus55
npm run check:shows                               # the Caravan block is apps/rube/checks/caravan.ts
node dev/shot.mjs --from 323 --to 370 --n 24 --out hush.png   # contact sheets (untracked dev/ tools)
node dev/film.mjs --from 500 --to 575.4 --out end.webm        # 1x film, reports fps
node dev/caravan-card.mjs                         # this take's share card at its still (338.5 s)
```

The share card is `public/shows/caravan/opus55.png` (the still: Fletcher setting the crash straight while Andrew
keeps time on the hi-hat).

# Caravan

Copyrighted recording, used for a private tech demo only. Nothing here claims any right to it. Attribution is in
`apps/rube/src/shows/versions/caravan/ATTRIBUTION.txt`.

Open it at `/shows/caravan/` or `/shows/?show=caravan&take=opus55` (add `&music=file` to play the demo file instead
of the label's YouTube upload). In the picker it is **Caravan**, one take, **Opus 5.5**.

## What it is

A Rube Goldberg machine plays "Caravan" from the *Whiplash* soundtrack, the film's finale with Andrew Neiman's drum
solo. It plays the whole recording, 9:15, untouched, and the credits run on for 21 s in silence over the dark hall:
576 s in all, the longest show in the catalogue. It tells the film in order over the music.

- **Andrew Neiman is the yellow ball** (`#F2B233`), the thread. Every strike is his.
- **Terence Fletcher is the black ball** (`#1E1C1B`) on a conductor's rig: a black column, a chest, two long arms
  and pale hands. The hands are his instrument, in four shapes: open (hold), beat (time), point ("you") and the
  fist. The fist closes once, on the last stroke of the recording.
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
| 0 | practice | `shaffer/practice.ts` | The film's first shot: down a long dark corridor to one lit practice room. He drops onto the kick pedal and plays the intro's groove across the old oxblood kit, a strike on every stroke; the lamp sways on its cord. On the bass (21.11) Fletcher is in the doorway. He keeps time faster, points ("you"), and goes. Andrew follows him out down the corridor. |
| 30.65 | band | `shaffer/band.ts` | The studio band in its tiered room. He comes down the tiers a step a bar, Fletcher points him to the alternate's chair, and he turns Tanner's pages. On the tutti the trumpets stand. Fletcher puts him on the kit. |
| 80.79 | tempo | `shaffer/tempo.ts` | "Not quite my tempo." Fletcher's hand keeps time on the snare's far side: rushing, dragging, the palm slammed flat. The chair thrown on a big hit (he ducks behind the snare; it hits the back wall and lies behind the kit). The counted slaps by his ear. Tanner gets the kit back and Andrew goes out the far door on the band's last hit. |
| 130.5 | night | `shaffer/night.ts` | The practice room at night. He knocks the pull-cord and the lamp comes on. The drill rig (two sticks on hinged posts) against the metronome, faster and faster; the red dab on the head; a plunge into the ice water; the tape wound on the bleeding stick's grip. On the last stroke the bulb pops and the room goes dark round him. |
| 172.07 | folder | `road/folder.ts` | Match cut to Overbrook, backstage. Tanner leaves his folder with Andrew; Andrew goes to the vending machine; the folder is gone. Fletcher sends him to the kit and he plays the performance from memory: the core seat. Out through the loading door into the rental car. |
| 205.92 | crash | `road/crash.ts` | The drive: every sodium lamp lights on the beat as he passes under it. The truck's high beams, the brakes, and the twelve stop-time breaks as the crash, one impact a hit. He drops out of his belt, crawls out from under the hood, and goes on into the dark. |
| 242.34 | sabotage | `carnegie/sabotage.ts` | Match cut to Carnegie Hall, waking on the chorus's first big hit. Fletcher flings the wrong chart onto Andrew's stand; his kit stays silent while the band plays past him. He goes to the stage door and his father holds him there under the held chord. He turns back, lands on the snare as Fletcher's open hands cut the band off, and counts himself in. |
| 270.52 | solo | `carnegie/solo.ts` | The solo. A drummer's frame of chrome hardware flies in from the flies; he leaps into the cup at its top and it plays as his body: two jointed arms with sticks, a shin on the kick pedal, his head bouncing on the accents. A stick thrown end over end and caught for the biggest hit. |
| 323.27 | hush | `carnegie/hush.ts` | The hush. He lands on the crash and knocks it askew. Fletcher comes down off his podium, rises on his column, and sets it straight with one hand, and looks at him. The bursts round the toms; the crash again, and it holds. The camera finds his father at the stage door. |
| 369.98 | fast | `carnegie/fast.ts` | The build. A treadle engine rises from the stage: he stomps its lever (every stomp a kick), a flywheel spins up, a camshaft throws two sticks at the snare, one stroke a stomp and then a 70 ms roll. Fletcher, on his podium, starts to conduct him. |
| 423.34 | rubato | `carnegie/rubato.ts` | The show's heart. A walnut metronome rises behind the kit and he rides its weight. The rod strikes the ride at one end of its swing and the crash at the other, on every one of the 162 strokes; he climbs the rod as it slows and slides down as it quickens, the way a real metronome's weight sets its period. The roll is a shimmer. The rod tosses him onto the snare on the burst. |
| 504.0 | finale | `carnegie/finale.ts` | The kick march round the toms as the metronome sinks; the drummer's frame comes down again and he leaps into its cup. The long roll, both sticks a blur on the snare. Fletcher crosses to the kit, rises to Andrew's height and nods, once; Andrew nods back. The last fill; both sticks up through the silence; the band's last chord; and the fist. The hall goes dark under the credits. |

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
  chest; `conductor.ts` turns each upper arm the short way.
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
node dev/film.mjs --from 500 --to 575.8 --out end.webm        # 1x film, reports fps
node dev/caravan-card.mjs                         # this take's share card at its still (338.5 s)
```

The share card is `public/shows/caravan/opus55.png` (the still: Fletcher setting the crash straight while Andrew
keeps time on the hi-hat).

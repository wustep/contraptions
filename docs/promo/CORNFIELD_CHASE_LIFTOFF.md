# Cornfield Chase, [Opus 5.5] Liftoff

Copyrighted recording. This is a private tech demo and one-shot eval take only; do not ship this audio in a public build.
The music is Hans Zimmer, *Cornfield Chase*, from *Interstellar* (2014). Attribution is in `docs/promo/CORNFIELD_CHASE_ATTRIBUTION.txt`.
It is the same recording as the other Cornfield takes (`docs/promo/cornfield-chase-zimmer.mp3`), and no other audio is used.

Open it at `/shows/?show=cornfield-chase&take=opus55-liftoff`.

## What it is

A Rube Goldberg machine plays the whole cue across two worlds that are new for this take, and a rocket carries the ball from one to the other. There are no portals.

1. **Earth: a farm in the dust years** (0 to 83.8 s): the house, the yard, the corn, the truck, the combine, the fence line of a hidden base, and the launch tower.
2. **The rocket** (83.8 to 92.5 s): ignition when the organ's pedal comes in, up through the cloud deck, staging, and the nose opening in orbit.
3. **The dark** (92.5 to 127 s): a ring station, the sphere past Saturn, a water world, the black hole, and back home through the bookcase.

Every part is new: the pieces, the two worlds, the palettes, the sky, and the camera. Nothing comes from Machine's worlds or from the other takes. The only thing shared with the earlier [Opus 5.5] Music-sync take is the measured onset file, `scripts/show-plans/cornfield-opus55-onsets.json`, which is a measurement of the recording.

## How it keeps time

The music is the only clock.

- **Measured targets.** Each part is handed a slot: the show time the ball arrives, the time it must leave, and the onsets it has to strike in between. The part builds its lane out of timed waypoints, so a strike lands where the music is by construction, not by nudging.
- **Where the targets come from.** The strikes use the recording's measured onsets:
  - the piano's own notes in the rubato opening, within ±40 ms;
  - the organ's onsets as it gathers, within ±30 ms;
  - the 96 bpm comb from the drop onward (beat *b* at 0.008 + 0.625·*b* s), within ±26 ms.
- **What `check:shows` holds it to.** It measures every strike again against the onset file:
  - 227 strikes, every one on an onset;
  - more than 90% of the beats from the drop to the last hit struck;
  - the ball never jumps, including through the change of worlds;
  - the ball never hidden longer than 2.5 s;
  - exactly two balls while the twin is on stage.

## The machine, in order

| Time (s) | Music | Part | What happens |
| ---: | --- | --- | --- |
| 0 | piano | Murph's bookcase | In the dark, a ghost ball sits behind the top shelf. On the first clear note the model lander goes over. Then ten books drop, one per note, short and tall: S, T, A, Y in Morse. The ghost falls through the side of the case. |
| 12.3 | piano | the toy robot | It lands in the raised arm of Murph's four-slab toy robot and becomes a ball. The robot walks it across the room, a footfall per note, through the window light where the dust comes down in bands. |
| 15.7 | piano | stairs, porch | The robot lowers its arm like a ramp. The ball goes down the stairs a step per note, out onto the porch, and down the porch steps. |
| 20.2 | piano | the yard | A plank on a sawhorse flips over. The windmill's ratchet hoist lifts a tin bucket a tooth per note, and a trip bar tips the ball into the clothes basket on the loudest piano note. The basket's wheel knocks the pegs off the line, the wash drops away, and the basket throws the ball out at the pole. |
| 26.0 | piano | the corn bank | Leaves brushed on the last notes, above a sea of tassels. |
| 29.2 | piano, organ | the truck | Into the bed on a note; the door on a note. The engine turns over on the organ's first chords and catches, and the headlights come on at the strongest onset of the gather. |
| 42.48 | the drop | the truck | It floors it into the corn. A stalk on every beat, the ball kicked on every beat and landing on the eighth. It jumps a ditch on beat 76 and goes through a fence on beat 80. The drone it chases flies ahead and glints on each downbeat. |
| beat 84 | chase | the dam | It brakes at the edge, and the ball goes over the cab and off the dam. |
| beat 86 | chase | the combine | An autonomous harvester with an empty cab and its aerial lamp on the 1.25 s tick. The chain runs reel, feeder, drum, elevator, tank, then the auger swinging out, then the spout. Then a plank on a straw bale. |
| beat 100 | chase | the base's fence | A cattle grid on the eighths, a well sweep that throws, sprung dogs along the fence top, a counterweighted barrier arm, and a lever that lights the landing lamps. The drone lands on the bunker on beat 112, the drone that led them here. |
| beat 116 | chase | the gantry | The cage climbs the tower, lighting a lamp per eighth. Along the arm into the rocket's nose window on beat 124. The lamps go out one per beat while the camera pushes in on the window. |
| beat 134 | the pedal | the rocket | Ignition, then liftoff on the downbeat of 136, and a surge through the flame on each beat of the climb. On beat 142 it goes into the cloud: a flash of white with the rocket's shadow in it, and out into the dark in the other ink. Staging on 144, the second stage on 145, the turn into orbit, and on 147 the nose opens and the ball floats out. |
| beat 148 | full organ | the ring | A mass driver fires its coils on the eighths. The ball lobs to the ring station, a ring of twelve modules, and matches its spin. Clamps close on beat 156, the film's spinning dock. An airlock, a run inside the spinning ring, and a catapult that throws the ball into the sphere past a small ringed planet. |
| beat 166 | full organ | Miller | Out of the far side of the sphere onto a sheet of shallow water. The ball moves on the 1.25 s tick, two beats: a landed Ranger's legs, two buoys, and the slab robot cartwheeling one slab per tick. Up in orbit, the twin who waited laps a small station once per eighth. It cuts a tally mark each lap and goes grey. The "mountains" on the horizon are a wave, and it lifts the ball and throws it off its crest on beat 183. |
| beat 183 | climax | Gargantua | A Ranger catches the ball on a tether. The slab robot falls in first. The ball is swung down through the disk, behind the dark, up through the disk, and let go, and it falls to the centre. |
| beat 190 | climax | the tesseract | The ball lands on a rail in a lattice of bookcases and runs into a crank behind Murph's bookcase. |
| 119.409 | the last hit | the tesseract | The crank flips the last book of the row off the shelf, and the ball becomes the ghost. |
| 119.4 to 127 | the decay | home | The watch on the case twitches its hand in Morse. The lattice goes, and Murph's room comes up at dusk. The last frame is the first frame's framing, with the ghost glowing on the top shelf. |

## Interstellar nods

These are visual and mechanical only. There are no stills, no text, and no audio beyond the cue.

- **The bookcase opening and ending.** The lander model goes first; the books fall in S-T-A-Y; the dust comes down in bands; the watch sits on top of the case; and the ghost turns out to be the ball.
- **Machines from the film.** The toy robot and the slab robot on Miller walk and cartwheel the way TARS does. The combine drives itself, and there is a drone chase through the corn.
- **The space set pieces.** A ring station of twelve modules and a spinning dock. The wormhole is a sphere, with Saturn beside it.
- **Timing gags.** Miller's tick is 1.25 s, which is exactly two beats at 96 bpm. The twin ages up in orbit while the hero moves in slow motion below.
- **The black hole.** Gargantua is drawn as a flat disk with the halo lensed over and under it.

## How it is built

- **The version file.** `apps/rube/src/shows/versions/cornfield-chase/opus55-liftoff.show.ts`; everything with weight is behind `load()`.
- **The show.** `.../cornfield-chase/liftoff/`:
  - `show.ts`: a `Show` with two universes on one clock. The farm and the dark share cells, since the dark is above the farm, and the rocket is placed in both. The stage switches universe while the rocket is inside the cloud.
  - `kit.ts`: the part contract, `Slot` and `Built`, and timed `route` / `carried` lanes.
  - `camera.ts`: authored camera keys.
  - `music.ts`: the beat comb.
  - `hits.ts`: every strike, gathered for the check.
- **The parts.** They live in `earth/`, `rocket.ts` and `space/`, one file per set piece.
- **Riders.** `ShowPoint.balls` is used only while the twin is on stage.
- **Checks.** `apps/rube/check-shows.ts` has a Liftoff block, run by `npm run check:shows`.

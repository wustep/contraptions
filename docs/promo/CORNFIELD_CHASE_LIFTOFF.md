# Cornfield Chase, [Opus 5.5] Liftoff

Copyrighted recordings. This is a private tech demo and one-shot eval take only. Do not ship this audio in a public build, and nothing here claims any right to it.
The music is Hans Zimmer's *Cornfield Chase* and then *No Time for Caution*, both from *Interstellar* (2014). Attribution is in `docs/promo/CORNFIELD_CHASE_ATTRIBUTION.txt` and `docs/promo/INTERSTELLAR_NO_TIME_FOR_CAUTION_ATTRIBUTION.txt`.

Open it at `/shows/?show=cornfield-chase&take=opus55-liftoff`.

## What it is

A Rube Goldberg machine plays two cues back to back, 4:23 in all. Every world is new for this take, and there are no portals. A rocket carries the ball from Earth to the dark in Act I, and a scored hard cut on the second cue's first accent opens Act II.

**Act I, Cornfield Chase** (0 to 127 s)

1. **Earth, a farm in the dust years** (0 to 83.8 s). The house, the yard, the irrigation channel, the truck, the combine, the fence line of a hidden base, and the launch tower.
2. **The rocket** (83.8 to 92.5 s). Ignition when the organ's pedal comes in, up through the cloud deck, staging, and the nose opening in orbit.
3. **The dark** (92.5 to 127 s). A ring station, the sphere past Saturn, a water world, the black hole, and back home through the bookcase.

**Act II, No Time for Caution** (127.5 to 262.7 s)

4. **Cooper Station** (127.5 to 207.5 s). The O'Neill cylinder from the film's last reel, seen end-on from inside: the replica farmhouse on its museum plinth, a working farm on the ring, a baseball game on the ground where it stands on end, and a lift up a spoke to the Ranger in the hub.
5. **Outside** (207.5 to 262.7 s). The Ranger undocks from the spinning station, crosses Saturn, goes into the wormhole, and lands at Brand's camp on Edmunds' planet.

Every part is new: the pieces, the worlds, the palettes, the sky, and the camera. Nothing comes from Machine's worlds or from the other takes. The only thing shared with the earlier [Opus 5.5] Music-sync take is the measured onset file for Cornfield Chase, `scripts/show-plans/cornfield-opus55-onsets.json`, which is a measurement of the recording.

## The second cue

**Why No Time for Caution.** It is the docking cue, and Act II is the docking run backwards. Its organ pulse holds a steady 60 bpm, so every beat is a clean target, and it has a shape a machine can play. It starts quiet, steps up in loudness again and again, peaks, and stops dead. That gave the layout: quiet station machinery while it is soft, the undock on its biggest step, touchdown on its loudest bar, and a lamp on its last hit.

**The audio.** The cue was fetched once with yt-dlp and ffmpeg from WaterTower Music's official upload and is kept in `docs/promo/interstellar-no-time-for-caution-demo.mp3`, labelled demo only. The show plays one file, `docs/promo/interstellar-liftoff-mix-demo.mp3`, built by `scripts/liftoff-mix.sh`:

- Cornfield Chase plays whole and untouched from its first sample, so Act I keeps the clock it was timed to. It fades out over its last second, to 126.98 s.
- No Time for Caution comes in from 103.76 s into the cue, one beat before its bar-26 accent, fading up over that beat. The accent lands at 127.507 s of the show. It runs to the cue's end, 262.74 s.

Starting at bar 26 skips the cue's first 1:44. What is left is the two-minute build to the peak, which is the part a machine can drive.

**The transition.** Act I ends in Murph's room at dusk with the ghost ball glowing on the top shelf, as the piano's last note dies. The organ comes up under it for one beat. On its accent (127.507 s) the stage cuts: the same room, the same framing, now lit by the station's daylight, and the ghost is a ball again. The camera pulls back out of the window to show the room is a museum replica standing at the bottom of Cooper Station.

**Its clock.** `scripts/liftoff-ntfc-onsets.py` measured the mix once (numpy and ffmpeg) into `scripts/show-plans/liftoff-ntfc-onsets.json`. The cue's beat *k* is at 23.5177 + 0.9999·*k* s of the show (`cue(k)` in `music.ts`), and every beat and eighth sits on that comb to a few ms. The file also has each beat's measured strength and where the loudness steps up, bar by bar.

## How it keeps time

The music is the only clock.

- **Measured targets.** Each part is handed a slot: the show time the ball arrives, the time it must leave, and the onsets it has to strike in between. The part builds its lane out of timed waypoints, so a strike lands where the music is by construction, not by nudging.
- **Where the targets come from.**
  - Act I: the piano's own notes in the rubato opening (±40 ms), the organ's onsets as it gathers (±30 ms), and the 96 bpm comb from the drop onward, beat *b* at 0.008 + 0.625·*b* s (±26 ms).
  - Act II: No Time for Caution's 60 bpm pulse, beats and eighths (±30 ms).
- **What `check:shows` holds it to.**
  - 353 strikes (224 in Act I, 129 in Act II), every one on a measured onset;
  - more than 90% of Act I's beats from the drop to the last hit struck, and 121 of Act II's 129 beats;
  - the ball never jumps, through both changes of world and both cuts;
  - the ball never hidden longer than 2.5 s;
  - the mix, its length and its demo credit;
  - the stage in the station from the accent and outside from the undock;
  - exactly two balls while the twin is on stage, one everywhere else.

## Act I, in order

| Time (s) | Music | Part | What happens |
| ---: | --- | --- | --- |
| 0 | piano | Murph's bookcase | In the dark, a ghost ball sits behind the top shelf. On the first clear note the model lander goes over. Then ten books drop, one per note, short and tall: S, T, A, Y in Morse. The ghost falls through the side of the case. |
| 12.3 | piano | the toy robot | It lands in the raised arm of Murph's four-slab toy robot and becomes a ball. The robot walks it across the room, a footfall per note, through the window light where the dust comes down in bands. |
| 15.7 | piano | stairs, porch | The robot lowers its arm like a ramp. The ball goes down the stairs a step per note, out onto the porch, and down the porch steps. |
| 20.2 | piano | the yard | A plank on a sawhorse flips over. The windmill's ratchet hoist lifts a tin bucket a tooth per note, and a trip bar tips the ball into the clothes basket on the loudest piano note. The basket's wheel knocks the pegs off the line, and the basket throws the ball onto the end of the hand pump's handle. Its weight works the pump: water comes out of the spout into the irrigation channel, and the handle springs back and lobs the ball in after it. |
| 26.6 | piano | the channel | The water carries the ball along the top of the bank, under the corn. Four flap gates hang across the channel, and the ball shoulders each one open on a piano note; each slaps shut behind it. The last gate, on the strongest note, is red. At the end the channel spills over the bank, where the truck is waiting. |
| 29.2 | piano, organ | the truck | Into the bed on a note; the door on a note. The engine turns over on the organ's first chords and catches, and the headlights come on at the strongest onset of the gather. |
| 42.48 | the drop | the truck | It floors it into the corn. A stalk on every beat, the ball kicked on every beat and landing on the eighth. It jumps a ditch on beat 76 and goes through a fence on beat 80. The drone it chases flies ahead and glints on each downbeat. |
| beat 84 | chase | the dam | It brakes at the edge, and the ball goes over the cab and off the dam. |
| beat 86 | chase | the combine | An autonomous harvester with an empty cab and its aerial lamp on the 1.25 s tick. The chain runs reel, feeder, drum, elevator, tank, then the auger swinging out, then the spout. Then a plank on a straw bale. |
| beat 100 | chase | the base's fence | A cattle grid on the eighths, a well sweep that throws, sprung dogs along the fence top, a counterweighted barrier arm, and a lever that lights the landing lamps. The drone lands on the bunker on beat 112, the drone that led them here. |
| beat 116 | chase | the gantry | The cage climbs the tower, lighting a lamp per eighth. Along the arm into the rocket's nose window on beat 124. The lamps go out one per beat while the camera pushes in on the window. |
| beat 134 | the pedal | the rocket | Ignition, then liftoff on the downbeat of 136, and a surge through the flame on each beat of the climb. On beat 142 it goes into the cloud: a flash of white with the rocket's shadow in it, and out into the dark in the other ink. Staging on 144, the second stage on 145, the turn into orbit, and on 147 the nose opens and the ball floats out. |
| beat 148 | full organ | the ring | A mass driver fires its coils on the eighths. The ball lobs to the ring station, a ring of twelve modules, and matches its spin. Clamps close on beat 156, the film's spinning dock. An airlock, a run inside the spinning ring, and a catapult that throws the ball into the sphere past a small ringed planet. |
| beat 166 | full organ | Miller | Out of the far side of the sphere onto a sheet of shallow water. The ball moves on the 1.25 s tick, two beats: a landed Ranger's legs, two buoys, and the slab robot cartwheeling one slab per tick. Up in orbit, the twin who waited laps a small station once per eighth. It cuts a tally mark each lap and goes grey. The "mountains" on the horizon are a wave. The landed Ranger lifts off on beat 181 and picks the slab robot up on 182½, and the wave throws the ball off its crest on 183. |
| beat 184 | climax | Gargantua | The same Ranger, drawn away toward the hole as it climbs, catches the ball on a tether. There is one Ranger from Miller's water to the claw. The slab robot falls in first. The ball is swung down through the disk, behind the dark, up through the disk, and let go, and it falls to the centre. |
| beat 190 | climax | the tesseract | The ball lands on a rail in a lattice of bookcases and runs into a crank behind Murph's bookcase. |
| 119.409 | the last hit | the tesseract | The crank flips the last book of the row off the shelf, and the ball becomes the ghost. |
| 119.4 to 127 | the decay | home | The watch on the case twitches its hand in Morse. The lattice goes, and Murph's room comes up at dusk. The last frame is the first frame's framing, with the ghost glowing on the top shelf. |

## Act II, in order

Beats are No Time for Caution's (`cue(k)`). The station is drawn end-on, a ring of land 20 cells from the axis, and the camera sits in the ring's own frame, so the land is still and "down" is outward. The ball goes anticlockwise round the ring from the replica at the bottom, up the right-hand side, and across the axis.

| Time (s) | Beats | Part | What happens |
| ---: | --- | --- | --- |
| 127.5 | 104 | the replica | The organ's accent. The lights come up in Murph's room, the ghost on the top shelf turns solid, and the end of the shelf gives under it. Out through a flap in the side of the case into a museum dumbwaiter; the catch lets go, the car drops and its counterweight flies up; the car lands on its buffer in the kitchen. |
| 131.5 | 108 to 115 | the replica | The ball rides the tall clock's weight down a notch a tick while the pendulum swings a second a beat. The clock's side door drops, the museum's turnstile at the front door takes it through a third of a turn, and it runs off the end of the plinth onto the ring. Meanwhile the camera draws back from the room to the house on its plinth, then to the whole ring round it, and comes back in to the door. |
| 139.5 | 116 to 131 | the working ring | A farm in the sky, one machine a bar. A noria: the ball's weight drops the clutch in and a Geneva drive turns the water wheel a quarter a beat. Down a stepped channel, a flap gate falling flat on each beat. Off the spout into the tray on the front of the harvest tram, which trips a row of corn bins' gates, a bin a beat. At the end of the line the tray's gate drops, and the ball pushes the paddle under each sunlight louvre over the seed beds, so a shade flips up a beat at a time. |
| 155.5 | 132 to 144 | the ballpark | The diamond stands sideways on the ring where the ground has turned to a wall. The first-base bag is a treadle that springs a mitt open; the mitt shuts on the ball and flips it to the pitching machine. Its wheels spin up a notch at a time while a winch draws a mechanical bat back; on the eighth the gate lets the ball into the wheels, and the bat meets the pitch on the accent (140). The light tower's lamps come on, a bank a beat. |
| 168.5 | 145 to 155 | the flight | The film's gag. The ball goes up toward the axis and curves under the hub, because the ring turns under it; the camera pulls out to the whole ring while the cue gathers. It comes down on the far side through a poplar (150) and a round tree (151) and in at an attic window on the accent and step up (152). An old trunk knocks a trapdoor's latch, the door lets it down on its counterweight onto a rocking chair, and the chair pitches it into the lift car on the big step (156). |
| 179.5 | 156 to 172 | the spoke | Loud from here. The gate drops, the brake comes off, and the lift car climbs the spoke toward the axis while its counterweight comes down the other side. Each beat the car trips a landing's flag and its lamp lights, so the lit lamps climb the spoke behind it. Gravity falls away as it rises: the ball bounces a beat at a time, then a hop takes two beats, and on 170 it leaves the floor and does not come back. The sheave's brake bites on 171 and the car stops at the hub on 172. |
| 196.5 | 173 to 183 | the hub | The ball floats on into the docking bay, where the Ranger sits in its cradle. A grabber arm springs out, closes on the ball, swings it over the ship and sets it in the seat. The canopy runs forward and knocks home, the arm whips back into its catch, the cockpit lights, and the cradle's four clamps let go one a beat, tail to nose. |
| 207.5 | 184 to 194 | the undock | The cue's biggest step, and a hard cut to outside: Cooper Station seen from the side, turning a third of the way round a beat, the Ranger nosed into the port on its end cap. The port's clamps spring open, the umbilical fires out and whips back to its socket, and the nose jets back the ship off the port. Roll jets take the spin off in three equal steps and it stops dead, level, on the loudest beat. The probe snaps back, it pitches end for end, the port's collar slides home, and the engine lights. |
| 218.5 | 195 to 211 | Saturn | The burn pulses with the organ, each kick as hard as the beat it is on, out over Saturn's cloud tops and then over its rings. Engine off, the nose jets brake a beat at a time, and the nose touches the wormhole on 210. On 211 the cockpit goes in, the ball's light wrapping the sphere's rim. |
| 235.5 | 212 to 227 | Edmunds' planet | A whip pan to a desert world at dawn: a dark sky, a thin gold band, Gargantua small and high. The Ranger comes out of the far mouth on 213 and lands in the real order, one stage a beat: a pitch-up, four retro burns, the drogue mortar, the chute opening reefed and then in two steps, the heat shield dropped, the chute cut and the belly engines lit, a landing leg on each of 225 and 226, and the flare. |
| 251.5 | 228 | Edmunds' planet | Touchdown on the cue's loudest bar. |
| 252.5 | 229 to 232 | Brand's camp | The canopy swings open, the ramp slams down, the seat kicks the ball out over the nose, and it rolls down into the camp and stops at the foot of Brand's lamp. On the last hit (232) the lamp lights. |
| 255.5 to 262.7 | the stop | Brand's camp | The music stops dead. The camera draws back over the camp: a small dome, a flag, her helmet set down on a rock, a cairn for Edmunds. The sun's edge comes up behind the cairn and the dome's porthole lights. |

The unstruck beats in Act II are 113 and 116 (the ball rolling between machines), 145 to 149 (the ball in flight across the axis, while the cue gathers), and 212 (inside the wormhole).

## Interstellar nods

These are visual and mechanical only. There are no stills, no text, and no audio beyond the two cues.

- **The bookcase opening and ending.** The lander model goes first; the books fall in S-T-A-Y; the dust comes down in bands; the watch sits on top of the case; and the ghost turns out to be the ball.
- **Machines from the film.** The toy robot and the slab robot on Miller walk and cartwheel the way TARS does. The combine drives itself, and there is a drone chase through the corn.
- **The space set pieces.** A ring station of twelve modules and a spinning dock. The wormhole is a sphere, with Saturn beside it.
- **Timing gags.** Miller's tick is 1.25 s, which is exactly two beats at 96 bpm. The twin ages up in orbit while the hero moves in slow motion below.
- **The black hole.** Gargantua is drawn as a flat disk with the halo lensed over and under it.
- **Cooper Station.** Murph's room turns out to be the museum replica of the farmhouse. The ball hit in the station's baseball game crosses the axis and breaks a window on the far side of the ring.
- **The ending.** The film's docking scene played backwards, the Ranger matching the station's spin and then letting it go, and Brand's camp on Edmunds' planet with her helmet off.

## How it is built

- **The version file.** `apps/rube/src/shows/versions/cornfield-chase/opus55-liftoff.show.ts`; everything with weight is behind `load()`.
- **The show.** `.../cornfield-chase/liftoff/`:
  - `show.ts`: a `Show` with four universes on one clock: the farm, the dark, the station, and the outside. They share cells, and the stage switches universe by time: inside the cloud, on the second cue's accent, and on the undock.
  - `kit.ts`: the part contract, `Slot` and `Built`, and timed `route` / `carried` lanes.
  - `camera.ts`: authored camera keys.
  - `music.ts`: both combs, the mix's length, and the Act II landmarks (`ACT2`, `UNDOCK`, `PEAK`, `FINAL`).
  - `hits.ts`: every strike, gathered for the check.
- **The parts.** They live in `earth/`, `rocket.ts`, `space/` and `act2/`, one file per set piece. `act2/station.ts` has the station's geometry (the ring, its axis, standing things upright on it), and `act2/interior.ts` draws the ring round the parts.
- **Riders.** `ShowPoint.balls` is used only while the twin is on stage.
- **Checks.** `apps/rube/check-shows.ts` has a Liftoff block, run by `npm run check:shows`.
- **Rebuilding the audio.** `sh scripts/liftoff-mix.sh` rebuilds the mix from the two sources, and `python3 scripts/liftoff-ntfc-onsets.py` measures it again. Neither needs to run unless the mix changes.

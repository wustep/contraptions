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
- **Terence Fletcher is the black ball** (`#1E1C1B`) on a conductor's rig: a black column (his trousers), a chest,
  two long tapered arms and pale hands, all filled black with no outline, told from the wall by the light: a warm rim
  along his shoulders and arms, and a dim warm rim round his head. The hands are his instrument, in four shapes: open (hold), beat (time), point ("you") and the
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
| 0 | practice | `shaffer/practice.ts` | The film's first shot: down a long dark corridor to one lit practice room. He drops onto the kick pedal and plays the intro's groove across the old oxblood kit, a strike on every stroke. The kit is a machine from the first stroke: a pair of sprung sticks on a chrome post by the snare, and his weight on each drives its tip onto the snare or the hi-hat, with low hops between them. The camera goes in close on the snare and the hi-hat for the backbeat and out with him down the toms for the fill; the lamp sways on its cord. On the bass (21.11) Fletcher is black in the doorway against the corridor's light. He keeps time, points ("you"), and goes. Andrew follows him out down the corridor. |
| 30.65 | band | `shaffer/band.ts` | The studio band in its tiered room. He comes down the tiers a step a bar, Fletcher points him to the alternate's chair, and he turns Tanner's pages (the chart stands at the kit, beside the chair: Andrew, the chart and Tanner one group, Fletcher facing them from his podium). Tanner plays every beat on his snare while Andrew taps the same time on his chair; on the tutti the trumpets stand; a look across at the band at work. Fletcher puts him on the kit. |
| 80.79 | tempo | `shaffer/tempo.ts` | "Not quite my tempo." Fletcher stands tall at the snare's edge, a hand on his hip: rushing, dragging. Fletcher storms to the chair, knocking the chart's stand aside; the chair thrown on a big hit (he ducks behind the snare; it hits the back wall and lies behind the kit). The counts: his palm raised over Andrew on each, and slapped down flat on the hoop by his ear on four. The last trial one wide shot pushing onto the last stop. Tanner gets the kit back and Andrew goes out the far door on the band's last hit. |
| 130.5 | night | `shaffer/night.ts` | The practice room at night. He knocks the pull-cord and the lamp comes on. The drill rig (two sticks on hinged posts) against the metronome, faster and faster, framed to the tune's phrases: close on the sticks, back to the clock and the bulb, in on the red dab when it comes; a plunge into the ice water; close on the tape wound on the bleeding stick's grip. On the last stroke the bulb pops and the room goes dark round him. |
| 172.07 | folder | `road/folder.ts` | Match cut to Overbrook, backstage. Tanner leaves his folder with Andrew; Andrew goes to the vending machine; back on the cases, the same framing shows the bare lid where it lay; he rolls onto the spot, and Tanner comes after him and looks at it. Fletcher sends him to the kit and he plays the performance from memory: the core seat. Out through the loading door into the rental car. |
| 205.92 | crash | `road/crash.ts` | The drive: low and close on him at the wheel, every sodium lamp lighting on the beat as he passes under it; then long and high as the truck's high beams flash far ahead, the two of them in one frame, closing. The brakes, and the twelve stop-time breaks as the crash, one impact a hit. He drops out of his belt, crawls out from under the hood, and goes on into the dark. |
| 242.34 | sabotage | `carnegie/sabotage.ts` | Match cut to Carnegie Hall, waking on the chorus's first big hit, and held wide on the whole hall. Fletcher flings the wrong chart, tumbling, onto Andrew's desk, his finger on him; his kit stays silent while the band plays past him: three tries on the chorus's beats, each a stroke that lifts, stalls and sinks back with no answer from the head, a glance at the chart between them. He goes to the stage door and his father holds him there under the held chord. He turns back, lands on the snare as Fletcher's open hands cut the band off, and counts himself in. |
| 270.52 | solo | `carnegie/solo.ts` | The solo. A drummer's frame of dark steel flies in from the flies, slumped; he leaps into the cup at its top and it straightens and plays as his body: a steel torso behind the drums, two filled arms with fists round the sticks, a knee and a shin on the kick pedal, his head nodding down onto the accents. The camera picks a subject per key (the snare, the crash with his head, the pedal), whips across to Fletcher watching and to Jim at the stage door, and opens once on the whole hall. A stick thrown end over end and caught for the biggest hit. |
| 323.27 | hush | `carnegie/hush.ts` | The hush, played on the frame. It hangs limp over the kit while he plays soft on the snare; he leaps back into its cup and its right stick knocks the crash askew. Fletcher comes down off his podium, stops short of the bass, rises on his column and sets it straight with one hand; the frame's right arm hangs out of his way and the pulse moves to the ride. A look, the two heads either side of the crash. The bursts on both arms round the kit (close, then wide on the crash that holds now, Fletcher back on his podium watching). His father alone at the stage door under its lit window; then out across the whole stage, the frame and his son small beyond. He leaves the cup for the snare and the frame flies out as the build begins. |
| 369.98 | fast | `carnegie/fast.ts` | The build. In three stages on the music's phrases. An engine rises from the stage: he rides and stomps its sprung treadle (every stomp a kick), a small flywheel spins up, and two trip-hammer sticks under a short arm, cammed, beat the snare, one stroke a stomp and then a 70 ms roll. On the biggest kick a rack tom swings onto a post that telescopes up, and its own sticks double the accents while Fletcher conducts from his podium. The whole hall, lit wide; then the hard push in to the sticks' blur on the phrase's loudest stroke. |
| 423.34 | rubato | `carnegie/rubato.ts` | The show's heart. A walnut metronome with its works exposed rises behind the kit and he rides the weight on its short arm; the long arm's bob strikes the ride's rim at one end of its swing and the crash's at the other, on every one of the 162 strokes; he climbs as it slows and sits down as it quickens, the way a real metronome's weight sets its period. On the slowest stroke the camera trucks to Fletcher on his podium, keeping its time with a small beat of his hand, slowing with it: the conductor keeping the drummer's tempo. The swell is a strobing fan of the rod that widens with the music, the case juddering on its feet, him chattering in the cradle, the hall's light rising and the camera pushing in; the machine crouches, flings him onto the snare on the burst, and the light slams up. |
| 504.0 | finale | `carnegie/finale.ts` | The kick march round the toms as the metronome sinks; the drummer's frame comes down again and he leaps into its cup. The long roll, low and close on the blur of both sticks. Fletcher crosses to the kit, rises to Andrew's height, and bows his chest toward him in a deep, held nod; Andrew's frame dips its answer, and a second, smaller nod. Fletcher stays by the kit; the camera steps back to the whole stage and holds. The last fill; both sticks up through the silence, his hands up for the band; the band's last chord; and the cut-off: his open left hand circles up and comes down hard, closing on the last stroke, the fist by his head with clear wall between the two of them (the frame's arm is low, pinning the crash). The band and the house go dark; the spot stays on the two of them and the camera goes slowly in under the credits, and the spot closes at the end. |

## Craft notes

- **Canonical drawings.** One kit (`drums.ts`, `drawKit`), one conductor (`fletcher.ts`, `drawConductor`), one
  Carnegie Hall (`carnegie/hall.ts`). Every part that shows them draws them this way, so the kit in the practice
  room and at Carnegie is the same object in a different lacquer.
- **Light, not line.** Dark things are filled and edged in their own dark, never in the cream ink: the kit's shells
  are lit lacquer (a cylinder: dark edges, a warm band, one stripe of light), Fletcher is black with a warm rim, the
  piano, bass, podium, doors, chairs, stands and cases are filled with a lit edge only where the light falls. The
  rooms' light falls on the walls under the objects (Carnegie's `hallLight`, the band room's `glow` and its lit pit
  wall), so a black form stands against a lit wall; an additive wash laid over everything lifts every black to the
  wall's value (it did, in Carnegie, until the first polish round).
- **The frame has a body.** The drummer's frame is a torso of steel plate behind the drums (drawn by the hall before
  the kit, `drawDrummerBody`), filled tapered arms with round joints and fists round the sticks, a knee under the
  snare; slumped when it hangs empty, straightening as he lands in its cup; its fly lines only while it flies.
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
- **The fist.** Front on, 1.3 times an open hand: a short wrist, the heel of the hand, four curled fingers side by
  side with a dark crease between each (the middle two a little proud, as a fist's knuckle line is), the thumb laid
  across them. (Side on, as one rounded block, it read as a cup or a glove at 4 cells.) It is struck with his left
  hand, on the house's right, over clear wall, and the frame's right arm stays low from the nod on so nothing crosses
  between the two of them.
- **The frame stays for the hush.** The solo's frame does not fly out after the solo; the hush is played on it
  (`hush-score.ts`, read by `hush.ts` and `solo-rig.ts`), so the Carnegie act is machine all the way: the frame, the
  build's engine, the metronome, the frame again. While Fletcher's hand is on the crash the frame's right arm hangs
  out of his way.
- **A long wait rests the stick.** An arm with seconds to wait rests its stick just over the next drum and lifts it
  only for the stroke (`solo-rig.ts` `restPose`); one backswing stretched over the whole wait held a stick up high.
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
node dev/caravan-card.mjs                         # this take's share card at its still (338.6 s)
```

The share card is `public/shows/caravan/opus55.png` (the still: Fletcher setting the crash straight beside Andrew in
the drummer's frame).

# Caravan

Copyrighted recording, used for a private tech demo only. Nothing here claims any right to it. Attribution is in
`apps/rube/src/shows/versions/caravan/ATTRIBUTION.txt`.

Open it at `/shows/caravan/` (add `?music=file` to play the demo file instead of the label's YouTube upload). In the picker it is **Caravan**, one take, **Opus 5.5**.

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
- **Blood** is one dab on the practice kit's snare head, at night, from the stroke that makes it, and after the
  crash one thin dark streak across the top of Andrew's ball, from the drop out of his belt to the cut to Carnegie.
  Nowhere else.

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
| 0 | practice | `shaffer/practice.ts` | The film's first shot: down a long dark corridor to one lit practice room. He drops onto the kick pedal and plays the intro's groove across the old oxblood kit, a strike on every stroke. The kit is a machine from the first stroke: a pair of sprung sticks on a chrome post by the snare, and his weight on each drives its tip onto the snare or the hi-hat, with low hops between them. The camera goes in close on the snare and the hi-hat for the backbeat and out with him down the toms for the fill; the lamp sways on its cord. On the bass (21.11) Fletcher is black in the doorway against the corridor's light, and Andrew sees him: the next stroke tosses him up and out toward the door, and from then on every hop leans toward the doorway at its top, playing for the man keeping his time. Fletcher points ("you"); Andrew comes up off the stick toward him and hangs there, turned to him, and drops back onto it as Fletcher goes. Andrew follows him out down the corridor. |
| 30.65 | band | `shaffer/band.ts` | The studio band in its tiered room. He comes down the tiers a step a bar, Fletcher points him to the alternate's chair, and he turns Tanner's pages (the chart stands at the kit, beside the chair: Andrew, the chart and Tanner one group, Fletcher facing them from his podium) with the stand's page-turner: he drops off his seat onto a treadle at the stand's foot on a phrase's downbeat, and a sprung wire arm hinged at the top of the desk sweeps the page over by the next beat and swings back (the first turn an insert on the whole stand; the tutti's page turned on its biggest hit, over in its breath of silence). Tanner plays every beat on his snare while Andrew taps the same time on his chair; on the tutti the trumpets stand; a look across at the band at work. Fletcher walks past the chart's stand on the house side and puts him on the kit. |
| 80.79 | tempo | `shaffer/tempo.ts` | "Not quite my tempo." Fletcher stands tall at the snare's edge, a hand on his hip: rushing, dragging. Fletcher storms to the chair, knocking the chart's stand aside; the chair thrown on a big hit (he ducks behind the snare; it hits the back wall and lies behind the kit). The counts: his palm raised over Andrew on each, and slapped down flat on the hoop by his ear on four. The last trial one wide shot pushing onto the last stop. Tanner gets the kit back; Andrew looks back at it from the floor, turns away from rest and rolls out the far door under the band's last loud bars; it slams on the band's last hit. |
| 130.5 | night | `shaffer/night.ts` | The practice room at night. He knocks the pull-cord and the lamp comes on. The drill rig (two sticks on hinged posts) against the metronome, faster and faster, framed to the tune's phrases: close on the sticks, back to the clock and the bulb, in on the red dab when it comes; a plunge into the ice water; close on the tape wound on the bleeding stick's grip. On the last stroke the bulb pops and the room goes dark round him. |
| 172.07 | folder | `road/folder.ts` | Match cut to Overbrook, backstage. Tanner leaves his folder with Andrew; Andrew goes to the vending machine; back on the cases, the same framing shows the bare lid where it lay; he rolls onto the spot, and Tanner comes after him and looks at it. Fletcher sends him to the kit and he plays the performance from memory, the drummer's stand bare beside the hi-hat while every player in the band has a lit page: the core seat. Out through the loading door into the rental car. |
| 205.92 | crash | `road/crash.ts` | The drive: low and close on him at the wheel, every sodium lamp lighting on the beat as he passes under it; then long and high as the truck's high beams flash far ahead, the two of them in one frame, closing. The brakes: a still two-shot, the car and the truck's cab, for the hit and the car rearing onto its tail; then with the car, close, through the twelve stop-time breaks, one impact a hit, the post it ends on coming into view ahead of it. One held frame on the wreck and the road beside it while the lamps die from the outside in. He drops out of his belt, bloodied, crawls back through the cabin and out under the trunk (the car lies on its roof, nose back the way it came), stumbles, and goes on along the road the way he was driving, the frame going on ahead with him, into the dark as the lamp ahead of him dies; in on him for the cut. |
| 242.34 | sabotage | `carnegie/sabotage.ts` | Match cut to Carnegie Hall, waking on the chorus's first big hit, the light settling on the band and Fletcher with his silent kit at the edge of it, and held wide on the whole hall, his father in the front row of the house under the kit; then one move in to a still two-shot, Fletcher with a red-bound chart cocked, the kit with Andrew's own cream page on its desk. He flings it, tumbling, across the still frame; it slaps down square over Andrew's page and knocks it askew, half off the desk; his finger on him; his kit stays silent while the band plays past him: three tries on the chorus's beats, each a stroke that lifts, stalls and sinks back with no answer from the head, a glance at the chart between them. He goes to the stage door (his father, gone from his seat unseen, opens it) and his father holds him there under the held chord, the door's light swelling over the two of them with it and leaving as he turns. He turns back, lands on the snare as Fletcher's open hands cut the band off, and counts himself in: the band goes dark and the light finds him. The two of them held through the count-in, the drummer going on alone, Fletcher's cut-off hands frozen out where the band stopped and his head turned hard to the kit (the film's "I'll cue you"). |
| 270.52 | solo | `carnegie/solo.ts` | The solo, in a pool of light on the kit, the stage round it dark. A drummer's body flies in from the flies, empty, slumped like a marionette; he leaps onto its collar and it straightens and plays as his body: a dark shirt behind the drums, sleeves to the elbow and skin below, hands round the sticks, a trouser leg on the kick pedal, leaning into the side it plays and hunching on the accents. The camera picks a subject per key (the snare, the crash with his head), holds all of him head to foot for the kick's pulse with one short look at the boot on the pedal, whips across to Fletcher (his cut-off hands still out, coming down as the camera settles on him, drawn in to listen) and to Jim at the stage door, and opens once on the whole hall. A stick thrown end over end and caught for the biggest hit. |
| 323.27 | hush | `carnegie/hush.ts` | The hush, played on the frame, the light gone cooler and smaller round him. It hangs limp over the kit while he plays soft on the snare; he leaps back onto its collar and its right stick, the elbow up over the cymbal, knocks the crash askew. The arm drops and hangs out of the way at once and the pulse moves to the ride, so the tipped cymbal stands whole while Fletcher comes down off his podium, crosses the clear floor, rises on his column (a steel tube sliding up out of his trousers at the knee) and sets it straight with one hand. A look, the two heads either side of the crash. The bursts on both arms round the kit (close, then wide on the crash that holds now, Fletcher back on his podium watching). His father at the stage door, open again, standing in its light where he held his son, the one other warm island on the stage; then out across the whole stage, the frame and his son small beyond. He leaves it for the snare and the frame flies out as the build begins. |
| 369.98 | fast | `carnegie/fast.ts` | The build. In three stages on the music's phrases, the light warming back up with each. An engine rises from the stage: he rides and stomps its sprung treadle (every stomp a kick), a small flywheel spins up, and two trip-hammer sticks under a short arm, cammed, beat the snare, one stroke a stomp and then a 70 ms roll. On the biggest kick a rack tom swings onto a post that telescopes up, and its own sticks double the accents while Fletcher conducts from his podium. The whole hall, lit wide; then the hard push in to the sticks' blur on the phrase's loudest stroke. |
| 423.34 | rubato | `carnegie/rubato.ts` | The show's heart. A walnut metronome with its works exposed rises behind the kit and he rides the weight on its short arm; he gets onto it with a leap off the crash, crouching into it first (it gives under him and rings after he leaves); the long arm's bob strikes the ride's rim at one end of its swing and the crash's at the other, on every one of the 162 strokes; he climbs as it slows and sits down as it quickens, the way a real metronome's weight sets its period. The hall goes nearly dark round it, one narrow light from the flies on the metronome, at its lowest on the slowest stroke, when the camera trucks to Fletcher on his podium, in his own light keeping its time: his right hand alone, the left at his side, falls into every stroke as the bob strikes and rebounds high, one long slow fall a stroke at the slowest: the conductor keeping the drummer's tempo. The swell is a strobing fan of the rod that widens with the music, the case juddering on its feet, him chattering in the cradle, the hall's light rising and the camera pushing in; the machine crouches, flings him onto the snare on the burst, and the light slams up white. |
| 504.0 | finale | `carnegie/finale.ts` | The kick march round the toms in near-white light as the metronome sinks, warming back to gold over the long roll and the nod; the drummer's body comes down again, empty, and he leaps onto its collar. The long roll, low and close on the blur of both sticks. Fletcher crosses to the kit, rises on his telescoping column to Andrew's height, and bows his chest toward him in a deep, held nod, the roll's blur still in the frame below them; Andrew's frame dips its answer, and a second, smaller nod. Fletcher stays by the kit; the camera steps back to the whole stage and holds. The last fill; both sticks up through the silence, his hands up for the band; the band's last chord, blowing the frame open to the whole stage on its attack; and the cut-off: his open left hand circles up and comes down hard, closing on the last stroke, the fist by his head with clear wall between the two of them (the drummer's arm is low, its hand pinning the crash from under the cymbal, well clear of his other hand hanging at his side). He holds it, then brings it in to his chest and down to his side. On the cut-off the light cuts off too, in 0.15 s, to a spot on the two of them; under the credits it narrows and fades, evenly, to near black, the two heads last, while the camera goes slowly in. |

## The frame on the music

The strikes were always on the recording. What the craft pass (after Voyage and Everything) changed is how much of
the picture answers them. A probe that measures how much of the frame changes just after each strong onset, against
between them, put Everything's fight at 2.3 times and almost every stretch of Caravan at 1.0: the ball landed on
time, but the kit, the camera and the ball itself did nothing a viewer could see on the beat. Four things now do.

- **The kit's voice.** A struck head flares toward a warm white and its top hoop glints; a struck cymbal flares pale
  gold and shimmers along its lit edge as it rings; the hi-hat glints; the kick's front head breathes light through
  its inner band. It is all drawn light (`drums.ts` `strikeFlash`), in the one canonical kit, so every part that shows
  a kit got it at once, and no seat moved: `headDip` and `cymbalSwing`, which the ball's paths ride, are as they were.
  Where a roll runs a stroke every 70 ms the head shimmers rather than strobes.
- **Andrew gives on a blow.** A strike that turns his path (a landing on a stick, a stomp on the treadle, the
  metronome's swing reversing under him) flattens the ball along the blow, up to 16%, and it rings back through a
  slight rebound in about a fifth of a second (`show.ts` `squash`). Strikes he rides through, like the drummer's frame's
  sticks under his collar, barely turn him and leave him round. Shape only: where he is stays where the lanes put him.
- **Punches.** The camera takes 28 of the band's biggest hits in the body, a push in of up to 4.2% struck in 18 ms and
  eased back over a third of a second (`score.ts` `PUNCHES`, after All at Once's): the band's entrance, the tutti's
  peak, the chair, the slaps, the door, the vending machine, the truck and the car coming down, the chorus's hits, the
  solo's first accent and biggest hit, the knock on the crash, the build's two biggest kicks, the burst, the last fill,
  the last stroke before the silence, the fist. None in the quiet stretch or the rubato, and none on the last chord,
  whose frame blows open on its own move.
- **The drummer's shirt is lit round**, the way the kit's lacquer is (a lifted band a third of the way across from the
  house's left, the far side rolling into shadow), with its front fold down the breastbone. It is on screen for about
  a hundred seconds, and the flat cut-out read as a shape rather than a body.

The same pass fixed the worst of what a scrub of the whole show found:

- **The page-turner's insert** (46.9 to 49.1 s) had its left edge through Fletcher on his podium for 3.8 s, cutting
  him in half, while Tanner was out of shot. It is now the group the part is about: Andrew on his chair, the stand and
  its turner, Tanner on the snare keeping the time Andrew taps. The seated key before it and the tempo test's chair
  wide keep Tanner inside the frame's right edge too.
- **The corridor into the band room and the far door out to the night** are framed low. Centred on him, the section
  under the floor filled a third to half of the frame as a black slab, like a letterbox. Under the band room's
  corridor the tiers' floor mass now carries on, so the room's reveal stands on the building.

`check:shows` holds all of it: every punch within 20 ms of a measured hit and none where the frame is to be still,
the squash only just after a strike and on every hop of the practice groove, a struck head dark again within half a
second.

## Craft notes

- **Canonical drawings.** One kit (`drums.ts`, `drawKit`), one conductor (`fletcher.ts`, `drawConductor`), one
  Carnegie Hall (`carnegie/hall.ts`). Every part that shows them draws them this way, so the kit in the practice
  room and at Carnegie is the same object in a different lacquer.
- **Light, not line.** Dark things are filled and edged in their own dark, never in the cream ink: the kit's shells
  are lit lacquer (a cylinder: dark edges, a warm band, one stripe of light), Fletcher is black with a warm rim, the
  piano, podium, doors, chairs, stands and cases are filled with a lit edge only where the light falls. The
  rooms' light falls on the walls under the objects (Carnegie's `hallLight`, on its light cue, the band room's `glow`
  and its lit pit wall), so a black form stands against a lit wall; an additive wash laid over everything lifts every black to the
  wall's value (it did, in Carnegie, until the first polish round). The same in Shaffer: floors and tread tops are
  edges of lit wood, risers and ceilings their own dark, the corridor doors read by their fill (a cream line along
  the ground ran the width of every band-room frame until the second polish round).
- **One light in Carnegie.** From the wake to the credits the hall is lit by one scored cue (`carnegie/light.ts`), the
  way a lighting board runs a show: timed fades on the music, sharp on their attacks and long in their releases, for
  the wall's field, the pool, the beams, the band, the floor and house, the kit and Fletcher. Every hall light reads
  it, and so does a dark laid over the stage after the parts' machines and before the balls (`hall.ts` `hallDark`,
  on the Carnegie stage's `after`), with soft holes where the light falls: the pool, the metronome's top light,
  Fletcher's own light, Jim's warm wings. The parts carry no washes of their own (the build's swell, the metronome's
  surge and the rubato's slam are folded into it). Before it, a lit wall behind every framing made Carnegie one
  level of brown from the cut-off to the end, and the spot never read as a spot.
- **The frame is a drummer.** The solo's and the finale's frame is his body: a dark shirt warmed toward his yellow,
  flat, with a soft rim of top light in a dim of that yellow (the torso behind the drums, drawn by the hall before the
  kit, `drawDrummerBody`); a collar under his head, shoulders sloping to round deltoids over the arms' joints, the
  chest narrowing to his waist on the seat; sleeves to the elbow (the elbow a bend in the cloth), forearms and hands in
  skin, the hands round the sticks; a trouser leg and a shoe on the pedal. It leans about the waist into the side it
  plays (`TILT`, 1.2 rad a cell of lean) and hunches on the accents (`HUNCH`), hardest in the finale's march and long
  roll; the arms' joints and grips are the old frame's, so no stroke moved. Empty, it slumps like a marionette on its
  fly lines. (It was a steel torso, a yoke and hub discs: a grey bucket with robot arms, 28% of the show.)
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
- **Moves on their own curves.** A camera key can run the move to the next on its own curve instead of the monotone
  cubic (`camera.ts` `Shot.ease`), from rest to rest: `whip` (a smootherstep; the solo's whips, the sabotage's move
  in) leaves and lands with no jolt, and `hit` (the last chord's open) is sharp on the music and settles long. Keys
  strung through the cubic to fake a curve put a kink in the acceleration at every key.
- **The roll is drawn, not struck.** Where the music runs together (the build's roll, the rubato's swell, the
  finale's long roll), nothing hits. A blur, a shimmer, a trembling head (`hall.ts` `kitSince`).
- **Fletcher's arms blend the short way round, every joint.** A linear blend from hanging to raised swings the arm
  across the chest, and an unwrapped elbow or wrist angle (a reach's `atan2` jumps a whole turn as the forearm
  passes the horizontal) blended straight turned the forearm round in one frame. Every reach wraps its angles, and
  `fletcher.ts` `mixArm`/`blendPose` (the only blend) turn the shoulder, the elbow and the wrist the short way.
  `check:shows` steps every part's Fletcher at 120 Hz and fails on any joint turning half a radian in a frame.
- **Fletcher conducts from one pattern.** `beatPose` reaches the hand to chest-height targets (two-link IK, the
  elbow low and out): the hand falls into the ictus with a flick of the wrist, rebounds, floats at chin height. The
  first version parked both arms overhead and read as "hooray". The band room's own pattern now calls it too.
- **The rise is a machine.** When Fletcher's column lifts him (the hush's fix, the nod), `drawConductor`'s `rise` draws it
  telescoped: the trousers keep their length, and a slim steel tube slides up out of them at the knee under a lit
  collar. Stretched, the trouser-column read as a man on stilts.
- **The page-turner.** The band room's middle has a machine of its own (`band-plan.ts` `TURNER`, `band-motion.ts`
  `turnerAt`, drawn by `bandroom-props.ts` `drawTurner`): a treadle at the chart stand's foot, a rod up beside the
  post, and a sprung wire arm at the top of the desk. His weight on the treadle trips the arm; the page's free corner
  follows the arm's tip (`pageAt`). It goes with the stand when Fletcher shoves it aside.
- **The turn.** The seam between the sabotage and the solo is the one Carnegie seam that is not `CLOSE`: `TURN`
  (`stage.ts`), the drummer and Fletcher in one frame through the count-in, so the cut-off that did not stop him is
  seen. Fletcher's cut-off pose (`sabotage-motion.ts` `CUT`) holds from the landing to the solo's whip onto him
  (`conductor.ts` `STUNNED`).
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
- **No cream ink left.** The third polish round took the last of it: the practice pair's clamp and hinges, the night
  rig (wood, steel and tape), the room's lamp, cords, sills and panels, the band room's doors and ceiling, the kit's
  stands (rods of shadowed chrome edged in their own dark), the rental car and the truck, Overbrook's backstage, band,
  riser and stage, the road's lot, rail and lamp posts. Each is filled and edged in its own dark, lit only where the
  light falls. The charts' pages keep a pale edge.
- **Whole, or clear of the edge.** A person is in the frame whole or clear of it, hands and all; a hand crosses the
  edge only while the camera passes him. `check:shows` holds Fletcher to it from Carnegie's first frame (no hand at the
  edge for more than 1.25 s), and holds clear wall between the drummer's hand and his hands in the last image.
- **A head drawn over every set.** A person's head is a company ball, drawn over every part; his body is his part's.
  Where he walks out over the next part's set, the stage draws his body (`Stage.after`, the practice part's
  `fletcherOut`), or the next set covers it and his head goes on alone as a ring in the dark.
- **One job per prop.** The hall's upright bass, with no player, went: every trip Fletcher made between the podium and
  the kit crossed it, its neck rising out of his head.
- **The fist is checked.** `check:shows` walks `poseAt` from the solo to the end and fails if a fist shows before
  the final cut-off.
- **Traps.** A Vite reload during a shot freezes every later frame. `dev/shot.mjs` below about 900 px wide puts the
  panel back and stretches frames. Import order matters in `carnegie/rubato.ts` (its first line re-exports the
  strokes so `strokes.ts` finds them set); the hush and the finale import nothing that imports `hall.ts`.

## How to run it

```
npx vite --port 8931 --strictPort                 # then /shows/caravan/
npm run check:shows                               # the Caravan block is apps/rube/checks/caravan.ts
node dev/shot.mjs --from 323 --to 370 --n 24 --out hush.png   # contact sheets (untracked dev/ tools)
node dev/film.mjs --from 500 --to 575.4 --out end.webm        # 1x film, reports fps
node dev/caravan-card.mjs                         # this take's share card at its still (528.4 s)
node dev/couple.mjs --from 40 --to 60             # how much of the frame changes on the onsets, against between
```

The craft pass's other probes are untracked `dev/*.ts`, bundled with esbuild like the checks: `audit.ts` (strong
onsets nothing strikes, strikes on near-silence, long loud gaps), `cam.ts` (the camera's stop-starts and jolts),
`jerk.ts` (the ball's velocity jumps off the strikes), `edges.ts` (who the frame's edge cuts, and for how long),
`pace.ts` (stretches where nothing moves), `keys.ts` (every camera key against the click and the onsets).

The share card is `public/shows/caravan/opus55.png` (the still: the bow, Fletcher's chest tipped toward Andrew in the
drummer's frame over the roll's blur on the snare).

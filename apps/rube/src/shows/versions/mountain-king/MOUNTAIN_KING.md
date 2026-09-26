# Mountain King

Grieg's "In the Hall of the Mountain King" played whole by a Rube Goldberg machine. The recording is public domain
(the Czech National Symphony Orchestra for Musopen), so it ships with the show. Attribution is in
`apps/rube/src/shows/versions/mountain-king/ATTRIBUTION.txt`.

Open it at `/shows/mountain-king/` or `/shows/?show=mountain-king&take=opus55` (add `&music=file` to play the file
instead of the orchestra's YouTube upload). In the picker it is **Mountain King**, one take, **Opus 5.5**.

## What it is

The classic Rube Goldberg tune: one four-bar theme played eighteen times without a break, faster and louder each
time, then a coda of hammered chords. It moves the way a chain reaction does, from one careful tip to a runaway, so
the show is one chain reaction that grows. Peer Gynt tips a pebble at the trolls' gate. That starts something, which
starts something bigger, down through the mountain, until the mountain's own machinery runs away and the mountain
comes down. The ostinato is played by ever larger parts: a pebble on a stair, drips on stone bars, the court's
heads, the mine carts' wheels, the trolls' drum, the mountain's gears, the mountain itself.

It follows Ibsen (*Peer Gynt*, Act Two, scenes 5 to 8). Peer and the Woman in Green ride a great pig to the Dovre
King's hall. The court is assembled, the King enthroned with crown and sceptre. "Slay him!" The trolls fall on him.
Church bells ring in the valley, the trolls flee, the hall collapses, and Peer wakes on the hillside at sunrise. The
music's sneaking pianissimo is staged as the court dozing while she leads him in (a licence the music asks for),
and the noticing comes with the second statement.

- **Peer Gynt is the red ball** (`#E0533D`), the thread. Every strike is his.
- **The Woman in Green is the green ball** (`#6DBE5A`), the Mountain King's daughter. She rides in with him, leads
  him down the tunnels and into the hall, goes to her father's side, and slips out of the east door as the court
  wakes. She is never in the show after the chase goes under the hall.
- **The Mountain King and every troll are drawn**, never balls (`troll.ts`, after Kittelsen): hunched lumps of
  hillside with moss on the crown, small eyes under a heavy brow, a potato nose, pointed ears and two stubby tusks.

One place, one path, one take. The show is the Dovre mountain in cross-section: the rock is the paper, and every
room is cut into it. The mine and the heart are laid mirrored (`kit.ts` `lay`), so the levels stack under the hall
and the finale's chimney rises through all of them. There is no portal and no cut.

**The lighting rule.** Inside, everything is dark until the chain reaction reaches it (a spark, burning oil, a
troll's snort into a brazier), and it stays lit. In the finale's rise every lit room is a room he has been through.

## The cue

Edvard Grieg, "In the Hall of the Mountain King" (Peer Gynt Suite No. 1, Op. 46, IV; from the incidental music to
Ibsen's play, 1875). The Czech National Symphony Orchestra for Musopen (the 2012 Kickstarter recordings), released
into the public domain. Musopen's FLAC from Wikimedia Commons (154.091 s) is re-encoded whole and untouched to
`grieg-mountain-king-musopen.mp3` by `scripts/shows/mountain-king-cue.sh`.

The YouTube cue is the orchestra's label upload ("Czech National Symphony Orchestra, Prague - Topic", `k8HCJS4FflY`).
Cross-correlated against the file it is the same recording sample for sample (lag 0, the same length), so
`youtube: [{ id: 'k8HCJS4FflY' }]` runs on the same clock with no offset. The file is the fallback and the export's
audio. The show runs on to 176 s: the credits in silence over the dawn.

It was chosen for the arc the brief asked for: a nearly silent opening on the horns' low note; the theme in bassoons
and plucked basses, pianissimo, for 54 s; the accelerando and crescendo through a second statement; a fortissimo
third statement with cymbals on the backbeats; and a coda of hammered chords, a silence, a roll and two last chords.

## The measured structure

Measured once by `scripts/shows/mountain-king-onsets.py` into `scripts/shows/plans/mountain-king-onsets.json`.
An accelerando has no comb, so the beat is followed quarter note by quarter note: a tempo prior from comb fits over
8 s every 2 s, dynamic programming over the flux for every quarter from the theme's first note to the coda, then a
local quadratic through ±6 beats. 289 beats, 4.361 to 133.969, within 9.3 ms rms of the tracked frames.

| Show s | Music | Quarter note |
| ---: | --- | --- |
| 0 to 4.36 | the horns' low note alone | (no pulse) |
| 4.36 to 58.02 | statement 1, phrases 0 to 5 (A A B B A A), pianissimo, bassoons and plucked strings | 0.576 to 0.553 s |
| 58.02 to 101.95 | statement 2, phrases 6 to 11, the accelerando and crescendo; the fortissimo breaks at 100.8 | 0.54 to 0.37 s |
| 101.95 to 133.97 | statement 3, phrases 12 to 17, fortissimo: low band on 1 and 3, cymbals on 2 and 4 | 0.37 to 0.29 s |
| 134.25 to 147.0 | the coda: a crash, chord pairs, six hammer blows (145.34 to 146.60) | 23 measured chords |
| 147.0 to 149.8 | a silence, the roll (148.24), the two last chords (149.515, 149.815) | |
| 153.7 to 176 | the credits, in silence, once he has landed | |

The form was checked by matching each phrase's chroma against the theme: the B phrases are the theme a fifth up.
`music.ts` has `beat(k)`, `eighth(j)`, `phrase(n)`, `beatAt(t)`, the theme eighth by eighth (`THEME`, `SOUNDED`), the
onsets and the coda's chords. Tolerances: ±30 ms on an eighth of the grid, ±35 ms on a measured onset.

## The parts, in order

Each part gets a slot and builds its lane from timed waypoints, so a strike is on the music by construction
(`dovre/kit.ts`, after Liftoff's, Epilogue's and Caravan's kits). `seams.ts` is the contract between them: each
part's slot, exit, footprint, and how the ball crosses (at rest on a floor, or dropped straight down onto the next
part's entry on a phrase's downbeat).

| Show s | Part | File | What happens |
| ---: | --- | --- | --- |
| 0 | gate | `outside/gate.ts` | The whole Dovre at night on the horns' note (the west flank, the cliff with the gate at its foot, the summit over the hall, the east flank), and down to the pig by 6.5 s. A great troll-boar trots up the west flank with both balls on its back, a stride a beat. At the foot of the trolls' stair they leap off and hop up it a step a note, each stone ringing. She knocks twice at the door, a slab of iron-strapped stone, and throws her weight at it: it shakes in its slot and holds. Peer nudges a flint chip off the top step: the careful tip. It clatters down a step a note with him hopping down one note behind it, drops through a drain into the works under the path, and lands in the counterweight's pan with a spark (15.70, the phrase's strongest note) as he leans over the drain. The lamp catches, burning oil runs along the gutter, the pan sinks, and the great door grinds down into the rock, the pawl clicking on 14 notes; she rides its top down, notch by notch, while he climbs back up on the clicks. She rolls in; he follows. The pig dozes outside. |
| 22.32 | deep | `deep/deep.ts` | The tunnels. Nine stone slabs under nine stalactites: a drip lands on the slab for each sounded note of the B phrases. She leads him along a balanced beam; drips fill the cup at its end; he rolls in, the beam tips and slams onto a flint on the loudest accent (26.57), and the sparks light the oil gutter: torches catch one after another behind him. The water runs down a flume onto a waterwheel of stone buckets; they ride it down, and his bucket cocks a stone trip hammer that strikes a stone bar every half bar, the xylophone grown to machine size. The flame chases him down the stair to the hall's door. |
| 40.19 | court | `hall/court.ts`, `hall/hall.ts` | The Mountain King's hall, dark until he reaches its door, the court asleep on ledges of the living rock, braziers of banked embers glowing on their breath. He tiptoes on the run's notes and freezes on the held ones. Three times, each bigger: he lands on a sleeper's tail, it flicks him on, the sleeper snorts into its brazier, and the sparks light a torch; the third snort sets an oiled rope alight, and the fire runs up it, lantern by lantern, to the crown-lamp over the throne. The King is lit, asleep, crowned. She climbs to her father's side; Peer stands before the throne. |
| 58.02 | wake | `hall/wake.ts` | The court wakes: the elder's eyes open, then the heads turn to him a column a note, the dark gallery's eyes with them. He backs away a step with every other column of heads, up onto the dais's step on "Slay him!" (60.17) and off it as the King's eyes open; she slips out of the east door; the King rises, steps off his throne and roars, arms and sceptre high, and the roar blows Peer back a cell. The court stands and comes down after him. A grab closes on air; he runs under the roaring King between his feet. On the biggest accent (71.36) the sceptre smashes the dais behind him, a fissure runs to the trolls' hatch, and the hatch swings open under him. |
| 74.42 | mine | `under/mine.ts` (mirrored) | He drops onto the ore in a cart; the chock pops and it creeps off. Two troll miners wake in their cart up the tunnel and knock their brake off. His wheels clack over a rail joint on every sounded note (the joints are laid where the notes fall), and each torch on the timbering catches from a spark as he passes. The trolls gain and lunge; his wheel trips a lever that throws the switch behind him, and they run up the catch ramp into the buffer. His cart hits the stop block at the shaft and pitches him down it. |
| 89.23 | drum | `under/drum.ts` | He lands on an iron kettle-drum (the first stroke), which throws him to the trolls' war-drum, where drummers on timber galleries behind it swing their clubs over and down onto the skin and bounce him a beat at a time, each hop as high as the theme's note. On phrase 10's accent they throw him to the great drum on its trestle over the pit; three drummers bring both clubs down on the backbeats, his bounces rising, and hold him up under the vault for a bar while they wind up. On the fortissimo (100.83) the skin bursts under him and he falls through the barrel and down the pit. |
| 101.95 | gears | `heart/gears.ts` (mirrored) | The mountain's heart, dark (covered until he drops into it). He drops onto a cocked trip hammer and rides its head, jolted off and caught on every blow; its first blow sparks the furnace alight. From then on the hammer falls on 1 and 3 and the furnace flares on 2 and 4 (the oom-pah). Every eight bars a new mechanism engages: a near-black silhouette until the furnace's flare on its first note lights it, and the room a step brighter with each, the frame opening a step each phrase: the flywheel (107.75; he rides up its side and a tooth throws him onto the pump heads), three pumps (113.36, head to head on the beats, two chaser trolls grabbing), the great bellows (118.72, two cells long, raised into the furnace's mouth, the furnace white, the strokes doubled; he surfs the pumps' wave). |
| 124.01 | runaway | `heart/runaway.ts` (mirrored) | The keeper throws in the governor and a pump flings Peer onto its yoke, which lifts him and bucks him higher on each blow, then throws him across the machine onto the overspeeding flywheel, which whips him over its top onto the pumps and back to the yoke. The safety valve blows; the keeper sits on it and is thrown off. The governor comes apart, held in one wide shot of the whole heart (9.5 to 10 cells from the gears' last phrase on): its arms hit their stops with a clang, the weights fly off and crash to the floor, the yoke swings out from under him, and the spindle snaps and splits the flywheel as he lands at the chimney's foot on the coda's first chord: the halves tear off the axle, fall into the pit and crash in front of the furnace, which blasts out once. |
| 134.25 | fall | `finale/fall.ts` | The bells (Ibsen): a thin cold-gold shaft of light falls down the chimney's line onto the collar, and every troll in the mountain freezes and looks up. He drops into an iron standpipe and plugs it like a cork; the heart's crew bolt for their doors on the pickup and the crash. The crash blows him out on a geyser, and it rams him up through every level he came down: against each floor's underside on a chord, through it on the next, chunks thrown up and landing on either side. Each room's trolls flee on a chord as he bursts up into it: the war-drum's drummers leap off their rim (their clubs dropping on the skin), two miners bolt along the gallery, the court flees its ledges row by row as he comes up through the hall's floor. Up through the hall as it comes down round him (a wide shot of the hall: the pillars one a chord, then on the six hammer blows the throne falling in two blows, great slabs of the vault crashing down, the braziers toppling and their coals burning up on the floor as the lamps go out one a blow, him surging up into the vent's mouth over it). The last blow throws him up the dark vent (one even tilt after him); he coasts through the silence to a stop under the summit's cap, and the camera comes in on him there; the roll slams him against it and it cracks with dawn light. The first last chord blows the cap out; the second tears the crown off, great dark boulders tumbling down both flanks, and throws him east in a long arc under the last stars, the camera going with him. He lands on the east shoulder, bounces once and rocks to rest in a grassy hollow. The dawn comes up, the stave church's bell swinging in the valley, the crater's rubble drops into the vent, and over the credits the camera cranes back from him in the hollow to the whole mountain in cross-section at dawn: every place he lit on his way down still lit, the broken hall dark, the chimney he came up. |

**Strikes**: 388 in all, gathered by `dovre/hits.ts`: every part's `_HITS` in the tune (each on an eighth of the grid
or a measured onset), and the finale's and the hall's collapse in the coda (each on a measured onset). Every phrase's
first note is struck, and every coda chord but one pickup brings something down.

## Craft notes

- **The canonical drawings are the director's**: `troll.ts` (every troll), `lantern.ts` (the iron lantern, the wall
  torch, `glow`, `flame`), `rock.ts` (`hollow`, `slab`, stalactites, drips and `quake(t)`, the one shake every set
  applies), `mountain.ts` (the sky, stars, far ridges, the church, the dawn, the skyline and the crater).
- **The troll is not an elephant.** The first pass had a long drooping nose and round ear flaps, and a court of them
  read as elephants on shelves. The nose is now a potato about as long as it is wide, the ears small and pointed, the
  jaw heavier, and two stubby tusks come up from the underjaw.
- **The lantern is not a little house.** A pitched roof over four panes and a plinth read as a temple at the size
  the lanterns hang. It now has a bail (the hoop over the top), a squat cap, a glass that swells a little, two wire
  guards and a shallow dish.
- **A troll's elbow never snaps.** The canonical arm flipped its elbow bend at half-raised (a 0.4 rad jump in every
  arm that moved through it). It now eases through (`cos(πa)`).
- **Optional troll fields, guarded.** `rise` (seated to standing, for the King and the court getting up), `outward`
  and `pair` (the drummers' two-handed blows); `drawTroll` returns where the head and hands ended up, so the crown
  sits on the King's skull and the sceptre and clubs sit in fists. Unset, every troll draws as before.
- **Sets dark outside their slots.** Every part is drawn whenever its cells are in view, and the opening wide sees
  inside the mountain. The tunnels keep a rock-coloured cover over their whole room until the gate opens (the
  hollow's outline alone let the hammer's bar and the flume's trestle show through the rock).
- **Drops land in the frame.** The camera's follow averages the ball over 1.4 s, so at a drop it lags the fall and
  the landing came at the frame's foot (under Zoom, at its edge). `score.ts` reads the follow's lag at each drop seam
  and takes it out of that key, so he lands a little under the middle with what he lands on in the frame.
- **The collapse is on camera.** The hall builder's collapse (pillars one a chord, the throne and the lights on the
  hammer blows) happened below the frame while the camera followed Peer up a black vent for 3 s. The finale now holds
  a wide on the hall through the hammer blows with him surging into the vent's mouth over it, and throws him up the
  vent on the last blow, to coast through the silence.
- **The credits need a dark ground.** Cream words on a pale morning sky read weakly. The morning's high sky stays a
  deep blue (`mountain.ts` `ZENITH`), the warmth kept in a band over the far ridges, which is also truer to a dawn.
- **Trolls are masses, not line art.** A troll's outline is the hide's own shadow warmed a little by the ink, not a
  cream line: a court of cream-outlined trolls in rows read as plush toys on shelves. The court sits on ledges of the
  living rock (uneven lips, ragged ends, shorter as the vault closes over them), twelve of them, no two alike and no
  two one over another. The heart's iron has the same thin, dark edge, and its flywheel, hub and spokes are thick.
- **The King stands up.** Risen, he steps off his throne, west of its seat, so his whole silhouette is clear of it
  (standing inside the throne's tusks, the seat showing between his legs, he still read as seated).
- **No hairlines through the hall.** The first lantern hangs from an iron post on a ledge, not a chain from the vault
  (a full-height line through every wide); the oiled rope is a finger thick; the crack is a fissure, not a scribble.
- **Ibsen's flight is on camera.** The bells freeze every troll on the coda's first chord; each room's flight is on a
  chord while the camera is in that room (the heart's crew, the drummers, the miners, the court). The finale draws
  the drum room's and the mine's runners (`fall.ts` `RUNNERS`); the war-drum's pair are the drum part's until they leap.
- **The coda's seam is the one wide seam.** The machine comes apart over him (132.8-134.25) in a 10-cell frame of the
  whole heart (`seams.ts` `CODA_SHOT`), and he drops into the collar low in it; the check holds it.
- **One streak, not beads.** At the fast drops and the geyser's surges the engine's four fading discs sat more than a
  ball apart and read as more balls. Mountain King opts in to `trail: 'smear'` (one tapered streak; `engine.ts`).
- **The mountain whole, at both ends.** The film opens on the whole mountain (44 cells) and the credits crane back
  to it in cross-section (72 cells) with the summit kept under the cards; every set is dark before its slot so the
  opening wide sees only rock (the hall is covered until he reaches its door, and there is no vent before the coda).
- **Nothing ends in the air.** The governor's flung weights land and lie; the crater's rubble drops into the vent's
  throat; the sunk door is inside the rock.
- **The stave church** is after Borgund: steep tarred roofs stacked tight over a skirt roof, a wall under each, dragon
  heads on the upper gables, one spire (the first pass read as a pagoda).
- **Peer carries a key light** (`key.ts`): a soft flat-topped pool round him, warm inside the mountain and moonlight
  outside, the frame a little darker beyond four cells from him (not in the widest frames, where the story is the
  place), and a wider cream rim in wide frames. Nothing in the mountain was lit by him, and the brightest things in
  frame were the fires, the orange nearest his red: he sank into them.
- **Each mechanism is dark until it is lit.** In the heart every part stands as a near-black silhouette until the
  furnace's flare on its first note lights it, and the room steps up with each: the idle governor no longer stands
  lit for twenty seconds, and each phrase has one hero silhouette.
- **The frame grows with the music.** The heart opens a step a phrase (8, 8.5, 9.2, 9.5 cells) and never goes back in;
  across the room it travels with him (a light hold), up and down it holds (a camera key's `wy`), so its top stays
  under the drum's floor and the room above never shows.
- **The fortissimo is one tilt down.** The drop into the heart is the second wide seam (`seams.ts` `HEART_SHOT`, 8
  cells on the hammer, the anvil and the furnace's mouth): from the drum's wide on the burst the frame only tilts
  down with him, instead of diving close and pulling back out over the loudest downbeat. The heart's cover lifts
  from the top down just ahead of him, under the drum's firelight falling down the shaft, so he is seen falling into
  a place.
- **The mountain has a pulse.** From the fortissimo the rock thumps down on every hammer blow and settles (`rock.ts`
  `quake`, at most 0.03 cells, so his rides never slip on the machine), with a jolt on the fortissimo's downbeat.
- **Take-offs are on the music too.** The court's tiptoes leave on the eighth before the note they land on; the
  flywheel heaves on each blow and coasts; the yoke's arm gives under each landing and comes back slowly; the
  geyser's jet falls back from the top over the last chord's ring-out.
- **The bells have a cause on screen**: a shaft of cold light down the chimney's line on the first chord, where the
  frozen trolls look. The church is bigger, so its bell reads as the camera follows him east.
- **The crash is the biggest picture**: slabs of the vault on the hammer blows, the braziers spilling fire that lights
  the hall from below as its lamps go out, the flywheel's halves crashing into the furnace, the summit's crown torn
  off in boulders. The trail is off on the geyser (`Show.trailOff`) and never longer than 2.5 R elsewhere.
- **Credits after the landing**, a size up and in cream over the pale sky (`TitleCard.scale`, `plain`), lifted into
  a tall phone's sky (`lift`).
- **Peer is in the frame all the way, under Zoom too** (`check:shows` walks it every 20 ms).
- **Traps**: the stage's `rectMode` is CENTER (every set laid out by corners sets CORNER inside its push); a raw
  gradient leaves p5's fill cache stale (`kit.ts` `honest`); a Vite reload during `shot.mjs` or `film.mjs` freezes or
  kills the run, so never edit while filming.

## What `check:shows` holds it to

`apps/rube/checks/mountain-king.ts`: the picker's names; the whole recording from zero, credited, with its upload;
the beat followed quarter by quarter; one mountain, no portal, no cut; the parts in order; Peer never jumping (0.04
cells a millisecond) and never hidden more than 2 s; every strike on the music; the coda's first chord and the two
last chords struck; every seam struck; every phrase struck on its first note; the coda's chords struck (a pickup
may go by); Peer in the frame all the way, under Zoom too; the camera on the seam framing at every hand-off (wide into the heart and on the coda's; a seam inside one builder's room is free); every drop
falling straight down for its last quarter second and landing a little under the middle of the frame; the Woman in
Green never jumping, coming and going only out of shot, resting a cell ahead at the rest seams, and gone before the
chase goes under the hall; every ball someone, once; Peer at rest in the hollow at the end; and the credits' words.

## How to run it

```
npx vite --port 8961 --strictPort                 # then /shows/?show=mountain-king&take=opus55
npm run check:shows                               # the Mountain King block is apps/rube/checks/mountain-king.ts
node dev/shot.mjs --from 134 --to 150 --n 12 --out coda.png   # contact sheets (untracked dev/ tools)
node dev/film.mjs --from 90 --to 135 --out heart.webm --show "mountain-king&music=file"   # 1x film, reports fps
node dev/mountain-king-card.mjs                   # this take's share card at its still (64.5 s)
```

The share card is `public/shows/mountain-king/opus55.png`: the King risen off his throne, roaring with his sceptre
high, the court's arms up behind him, Peer at his feet.

## How it was made

Directed by Claude Opus 5.5 in one workflow: pre-production (the cue, the measured structure, the kit, the canonical
drawings, a stub for every part, the check's skeleton), six builders in parallel (gate, deep, hall, mine, drum,
heart, each on its own files), then integration (the finale, the seams, the camera as one take, the whole show
filmed at 1× and fixed where it was weakest, the credits, the card, this report); a fresh-eyed critic's ranked
notes; five fixers, one file each (the drum's drummers, the heart's first blow, the gate's leap, the geyser, the
summit's blow-out); a director's pass on the cross-cutting notes (the bells and the flight, the coda's wide
seam, the court, the King, the heart's iron, the mountain at both ends, the trail) with the whole film watched again
at 1×; and a second round of fixers (the gate's pebble and knocks, Peer backing away through the wake, the drummers
on their galleries, the heart's lit iron, his rides on the flywheel and the runaway); and a third round (five fixers:
the opening's push-in, the pebble and the drain, no hatch before the crack and the throne's fall, the drum's wide
burst, the machine carrying him through the heart) with a director's pass on story and staging (the key light, the
heart's mechanisms lit one a phrase and its growing frame, the flywheel's crash, the bells' shaft, the hall coming
down, the summit torn open, the arc followed, the mine's chase, her parting, the wake closer, the credits); and a
fourth round (five fixers: the pumps' wave on the beat, the flywheel's heaves, the King's roar, the mine's push, the
geyser's rams) with a director's pass on music and motion (the heart's wide seam and the fall into it, the
mountain's pulse, the frame travelling with him, the tiptoes on the grid, the geyser's ring-out, the yoke's give,
the camera's last stop-starts).

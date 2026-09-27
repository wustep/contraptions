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
  him down the tunnels and into the hall, goes to her father's side, comes to Peer's on "Slay him!" for a last
  moment, and rolls away east off the dais as the King rises. She is never in the show after the chase goes under
  the hall.
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
audio. The show runs on to 170 s: the credits in silence over the dawn.

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
| 151.8 to 170 | the credits, in silence, once he lies still in the hollow | |

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
| 58.02 | wake | `hall/wake.ts` | The court wakes: the elder's eyes open, then the heads turn to him a column a note, the dark gallery's eyes with them. He backs away a step with every other column of heads, up onto the dais's step on "Slay him!" (60.17), where she comes down to him for a last moment together, and off it as the King's eyes open; she rolls away east along the dais and off its end before the King is half risen; the King rises, steps off his throne and roars, arms and sceptre high, and the roar blows Peer back a cell. The court stands and comes down after him. A grab closes on air; he runs under the roaring King between his feet. On the biggest accent (71.36) the sceptre smashes the dais behind him, a fissure runs to the trolls' hatch, and the hatch swings open under him, the three-headed elder sprinting after him and diving belly-down at the lip, its mitt closing on air as he drops. |
| 74.42 | mine | `under/mine.ts` (mirrored) | He drops onto the ore in a cart; the chock pops and it creeps off. Two troll miners wake in their cart up the tunnel and knock their brake off. His wheels clack over a rail joint on every sounded note (the joints are laid where the notes fall), and each torch on the timbering catches from a spark as he passes. The trolls gain and lunge; his wheel trips a lever that throws the switch behind him, and they run up the catch ramp into the buffer. His cart hits the stop block at the shaft and pitches him down it. |
| 89.23 | drum | `under/drum.ts` | He lands on an iron kettle-drum (the first stroke), which throws him to the trolls' war-drum, where drummers on timber galleries behind it swing their clubs over and down onto the skin and bounce him a beat at a time, each hop as high as the theme's note. On phrase 10's accent they throw him to the great drum on its trestle over the pit; three drummers bring both clubs down on the backbeats, his bounces rising, and hold him up under the vault for a bar while they wind up. On the fortissimo (100.83) the skin bursts under him and he falls through the barrel and down the pit. |
| 101.95 | gears | `heart/gears.ts` (mirrored) | The mountain's heart, dark (covered until he drops into it). He drops onto a cocked trip hammer and rides its head, jolted off and caught on every blow; its first blow sparks the furnace alight. From then on the hammer falls on 1 and 3 and the furnace flares on 2 and 4 (the oom-pah). Every eight bars a new mechanism engages, a near-black silhouette until the furnace's flare on its first note lights it, and the forge lights the room's walls a step brighter each time. Each phrase the frame pushes in close on the new mechanism and travels with him, then pulls back on its last bar to a bigger machine: the flywheel (107.75; he hops onto its side from the hammer's head, is carried up it and over its top, and a blow kicks him down its face onto the first pump), three pumps (113.36, head to head on the beats, two chaser trolls grabbing), the great bellows (118.72, on its own stage: raised into the furnace's mouth on a trestle, the furnace white, the strokes doubled; he surfs the pumps' wave); on its last bar the frame opens out to the heart and the whole drum room over it, its drummers still beating. |
| 124.01 | runaway | `heart/runaway.ts` (mirrored) | The keeper throws in the governor and a pump flings Peer onto its yoke, which lifts him and bucks him on the blows. The safety valve blows (129.11) and bucks him off onto the racing pump heads, a head a beat, and back onto the yoke; the keeper sits on the valve and is thrown off; the frame opens to the heart and the drum room shaking over it. Then, in a frame of the whole heart, the governor comes apart: its arms hit their stops with a clang, the weights fly off and crash to the floor, the yoke swings out from under him, and the spindle snaps and splits the flywheel as he lands at the chimney's foot on the coda's first chord: the halves tear off the axle, fall into the pit and crash in front of the furnace, which blasts out once. The runaway is the brightest room under the hall. |
| 134.25 | fall | `finale/fall.ts`, `finale/fall-ruin.ts` | The bells (Ibsen): a thin thread of warm daylight falls down the chimney's line onto the collar, and every troll in the mountain freezes and looks up. He drops into an iron standpipe and plugs it like a cork; the heart's crew bolt for their doors on the pickup and the crash. The crash blows him out on a geyser, and it rams him up through every level he came down, against each floor's underside on a chord, through it on the next, in frames wide enough (11 to 13 cells) that each room's trolls are seen fleeing on its chords: the war-drum's drummers leap off their rim, two miners bolt along the gallery, the court flees its ledges row by row. Up through the hall, the frame pulls back in one move to the whole mountain in cross-section (143.2), the white jet the one line through every room; and the mountain comes down bottom up behind him, a room a chord, each one's lights going out as its roof crashes onto its floor and its dust hangs: the heart, the drum room, the mine, the hall's ledges, its throne and pillars, its vault, while he surges up the vent on every chord and is rammed against the summit's cap. The last hammer blow (146.6) blows the cap out between the summit's two rock towers and throws him out of the mountain, east. The silence holds on the fallen, dark rooms with a few embers in them, him high over the east flank, the geyser falling back; on the roll the crown's two boulders come down on the flanks and the frame pushes in to the shoulder as he comes down to it. He lands on the first of the last two chords, in the dawn, the church bell swinging in the valley; bounces into the grassy hollow on the second as the sun's rim breaks the far ridge; and rocks to rest as the chord rings out. Over the credits the camera cranes up and back to the broken summit at dawn, the valley, the church and the sun. |

**Strikes**: about 390 in all, gathered by `dovre/hits.ts`: every part's `_HITS` in the tune (each on an eighth of the grid
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
- **The collapse is the coda's picture.** The loudest chords of the piece were once its stillest, smallest pictures
  (a vent with a dot in it). Now the hammered chords are one wide of the whole mountain in cross-section, and the
  mountain comes down bottom up behind him, a room a chord (`fall-ruin.ts`): the lighting rule reversed, each room
  going dark as its roof falls (the rock's own dark laid over it, feathered so no box edge shows; a few embers left;
  dust hanging low), the white jet the one line through every room. The rooms fall on chords; he surges up the vent on
  every one. The cap blows on the last blow, so the silence is his flight, and the last two chords are his landing.
- **The credits need a dark ground.** Cream words on a pale morning sky read weakly. The morning's high sky stays a
  deep blue (`mountain.ts` `ZENITH`), the warmth kept in a band over the far ridges, which is also truer to a dawn.
- **The court is a hall of individuals** (after Kittelsen). Guarded looks on the canonical troll (`TrollLook`
  `horns`, `snout`, `hat`, `heads`, `build`, `moss`; unset, every troll is as before): ram's curls, a tall broken
  horn, a cow's pair; a long hooked nose, a pig's snout, a wart; a birch-bark cone, an iron pot, a crown of twigs, a
  wool hood (only the King wears gold); tall, squat, humped; moss as a dark ragged beard, a crest down the spine or a
  few tufts. Four more hides apart in value (bark, slate, rust, birch), and one three-headed elder. No two neighbours
  share horns, snout or hat.
- **The court plays the theme with its heads.** Asleep, one sleeper's head bobs on each note of the theme, a
  different one each time; awake, every head swings on each sounded note (down at Peer on the run, up at the King on
  the held notes, fast in, a long damped settle), the rows in canon, the gallery's eyes a quarter behind; the wake
  opens on one held frame of the whole court and the dais through "Slay him!".
- **Trolls are masses, not line art.** A troll's outline is the hide's own shadow, darker than the hide at every
  light, with no cream in it: a court of cream-outlined trolls in rows read as plush toys on shelves, and even half
  cream made the lit King cream line art with outlined sausage limbs. The court sits on ledges of the
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
- **The mountain whole, at both ends.** The film opens on the whole mountain (44 cells), pushing in on the horns'
  note, and the credits crane back to its broken crown at dawn with the summit kept under the cards; every set is dark
  before its slot so the opening wide sees only rock (the hall is covered until he reaches its door, and there is no
  vent before the coda).
- **A mountain's skyline, not a hump.** The Dovre climbs from the gate's cliff in steps of rock (a steep riser, a
  long tread) to a crown of two blunt towers either side of the summit; the blow-out breaks open between them, so
  the last image is the broken crown. A slow wisp of steam rises from the summit's smoke hole until the coda (the
  chimney the finale uses), and a thread of lamplight shows round the shut troll gate: the one warm thing in the
  opening's wide.
- **Nothing ends in the air.** The governor's flung weights land and lie; the crater's rubble drops into the vent's
  throat; the sunk door is inside the rock.
- **Every made thing is edged in its own shadow.** Timber, iron, stone works, drums, carts, lantern cages, the
  throne, the sceptre and the crown: each edge is darker than what it edges, never the page's cream (a cream edge
  made the drum room, the mine and the lanterns the palest line art in the show). Cream is kept for Peer's rim.
- **Every set is dark before its slot, even on a phone.** The mine is solid rock until the hatch opens and lifts from
  the trapdoor down; the drum room is covered until he passes its vault; the heart's standpipe comes up with the
  heart's cover; the gate's lamp and gutter burn down to embers once the door is down.
- **The stave church** is after Borgund but read first as a building: a nave wall with a dark door and one small warm
  window, a steep roof, two short tiers over it with dragon heads, a tall thin spire with a cross, and the bell house
  close by (the first pass read as a pagoda, the second as a fir tree).
- **No light round Peer, only a rim** (`key.ts`): a thin warm near-white line (about 1.3 px at 720p) just outside
  his cream outline, at every frame size, the brightest value in any frame (flame cores and lamp glass are a step
  under it). An earlier key light, a soft pool 3.4 cells across and the frame darkened round him, read as a spotlight
  following him. The places that went dark without it are lit by their own sets: the hall's firelight down the hatch,
  the drum room's embers up the mine's shaft, the drum room's banked fires as he falls into it, the heart's forge.
- **Each mechanism is dark until it is lit.** In the heart every part stands as a near-black silhouette until the
  furnace's flare on its first note lights it, and the room steps up with each: the idle governor no longer stands
  lit for twenty seconds, and each phrase has one hero silhouette.
- **The machine escalates with the music.** In the third statement each phrase pushes in close (7 to 8 cells) on
  the mechanism its first note lights and travels with him, then pulls back on its last bar to a bigger machine (9.5,
  10, 10.5 cells of the heart, then the heart and the whole drum room over it, its drummers still beating), and the
  forge lights the heart's walls a step a phrase, so the runaway is the brightest room under the hall; the governor
  comes apart in a frame of the whole heart. Every move is timed so the zoom never whips.
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
- **The bells have a cause on screen**: a thread of warm daylight down the chimney's line on the first chord, where
  the frozen trolls look (narrow and faint, drawn in soft slices: a cone of light read as a stage spotlight). The church is bigger, so its bell reads as the camera follows him east.
- **The crash is the biggest picture**: slabs of the vault on the hammer blows, the braziers spilling fire that lights
  the hall from below as its lamps go out, the flywheel's halves crashing into the furnace, the summit's crown torn
  off in boulders. The trail is off on the geyser (`Show.trailOff`) and never longer than 2.5 R elsewhere.
- **Credits once he lies still**, from 151.8 as the last chord rings out (the show is 170 s), a size up and in cream
  over the pale sky (`TitleCard.scale`, `plain`), lifted into a tall phone's sky (`lift`). The crane ends on the broken
  summit at dawn with the valley, the church and the sun (the rooms are dark now, so the frame gives the mountain the
  lower third), east and high enough that the church, on the far parallax layer, stays over the flank.
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
falling straight down for its last quarter second and landing a little under the middle of the frame; the mountain
coming down bottom up on the hammered chords with him over every room as it falls, in a frame of the whole mountain;
thrown out on the last blow, landing on the shoulder on the first last chord and bouncing into the hollow on the
second, still as it rings out; the Woman in
Green never jumping, coming and going only out of shot, resting a cell ahead at the rest seams, and gone before the
chase goes under the hall; every ball someone, once; Peer at rest in the hollow at the end; and the credits' words.

## How to run it

```
npx vite --port 8961 --strictPort                 # then /shows/?show=mountain-king&take=opus55
npm run check:shows                               # the Mountain King block is apps/rube/checks/mountain-king.ts
node dev/shot.mjs --from 134 --to 150 --n 12 --out coda.png   # contact sheets (untracked dev/ tools)
node dev/film.mjs --from 90 --to 135 --out heart.webm --show "mountain-king&music=file"   # 1x film, reports fps
node dev/mountain-king-card.mjs                   # this take's share card at its still (64.8 s)
```

The share card is `public/shows/mountain-king/opus55.png` (64.8 s): the King risen off his throne, roaring with both
arms and his sceptre high under the crown-lamp, the court pointing at Peer at his feet.

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
the camera's last stop-starts); and a fifth round (five fixers: the King whole in the frame through his roar, the
mine dark until the hatch, the pig as a heavy boar, the hall's doorway, fire-bowls and falling crown-lamp, the drum
room dark before its slot) with a director's pass on frames and detail (every troll and every made thing edged in
its own shadow, the bells' thread, the geyser's drops, the church, the credits crane, the share card); and a sixth
round (three fixers: the court sneak framed close, the heart carrying him on the machine, the chase lit and closing)
with a director's pass on the whole film (no light round Peer, only his rim; the coda's cross-section on the
hammered chords, the mountain coming down bottom up; the credits from 151.8; the third statement escalating; a court
of individuals playing the theme with their heads; a mountain's skyline and the opening's one warm thing; the drum
room seen as he falls into it).

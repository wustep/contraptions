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
audio. The show runs on to 179 s: the credits in silence over the dawn.

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
| 151.8 to 179 | the credits, in silence | |

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
| 0 | gate | `outside/gate.ts` | The mountain at night, wide and still on the horns' note. A great troll-boar trots up the west flank with both balls on its back, a stride a beat. At the foot of the trolls' stair they leap off and hop up it a step a note, each stone ringing. She knocks at the door: nothing. Peer nudges a flint chip off the top step: the careful tip. It clatters down a step a note, drops through a drain into the works under the path and lands in the counterweight's pan with a spark (15.70, the phrase's strongest note). The lamp catches, burning oil runs along the gutter, the pan sinks, and the great door grinds down into its slot, the pawl clicking on 14 notes. She rolls in; he follows. The pig dozes outside. |
| 22.32 | deep | `deep/deep.ts` | The tunnels. Nine stone slabs under nine stalactites: a drip lands on the slab for each sounded note of the B phrases. She leads him along a balanced beam; drips fill the cup at its end; he rolls in on the loudest note, the beam tips and slams onto a flint, and the sparks light the oil gutter: torches catch one after another behind him. The water runs down a flume onto a waterwheel of stone buckets; they ride it down, and his bucket cocks a stone trip hammer that strikes a stone bar every half bar, the xylophone grown to machine size. The flame chases him down the stair to the hall's door. |
| 40.19 | court | `hall/court.ts`, `hall/hall.ts` | The Mountain King's hall, dark, the court asleep on benches in tiers, braziers of banked embers glowing on their breath. He tiptoes on the run's notes and freezes on the held ones. Three times, each bigger: he lands on a sleeper's tail, it flicks him on, the sleeper snorts into its brazier, and the sparks light a torch; the third snort sets an oiled rope alight, and the fire runs up it, lantern by lantern, to the crown-lamp over the throne. The King is lit, asleep, crowned. She climbs to her father's side; Peer stands before the throne. |
| 58.02 | wake | `hall/wake.ts` | The court wakes: the elder's eyes open, then the heads turn to him a column a note, the dark gallery's eyes with them. "Slay him!" (60.17). The King's eyes open; she slips out of the east door; the King rises and roars, the sceptre high. The court stands and comes down after him. A grab closes on air; the King stoops and he goes between his feet. On the biggest accent (71.36) the sceptre smashes the dais where he stood, the crack runs to the trolls' hatch, and the hatch swings open under him. |
| 74.42 | mine | `under/mine.ts` (mirrored) | He drops onto the ore in a cart; the chock pops and it creeps off. Two troll miners wake in their cart up the tunnel and knock their brake off. His wheels clack over a rail joint on every sounded note (the joints are laid where the notes fall), and each torch on the timbering catches from a spark as he passes. The trolls gain and lunge; his wheel trips a lever that throws the switch behind him, and they run up the catch ramp into the buffer. His cart hits the stop block at the shaft and pitches him down it. |
| 89.23 | drum | `under/drum.ts` | He lands on an iron kettle-drum (the first stroke), which throws him to the trolls' war-drum, where drummers climb up club first and bounce him a beat at a time, each hop as high as the theme's note. On phrase 10's accent they throw him to the great drum on its trestle over the pit; three drummers bring both clubs down on the backbeats, his bounces rising, and hold him up under the vault for a bar while they wind up. On the fortissimo (100.83) the skin bursts under him and he falls through the barrel and down the pit. |
| 101.95 | gears | `heart/gears.ts` (mirrored) | The mountain's heart, dark. He drops onto a cocked trip hammer; its first blow sparks the furnace alight. From then on the hammer falls on 1 and 3 and the furnace flares on 2 and 4 (the oom-pah). Every eight bars a new mechanism engages: the flywheel (107.75, a tooth flicks him off it), three pumps (113.36, head to head on the beats, two chaser trolls grabbing), the great bellows (118.72, the furnace white, the strokes doubled). |
| 124.01 | runaway | `heart/runaway.ts` (mirrored) | The keeper throws in the governor and a pump flings Peer onto its yoke, which lifts him and bucks him harder on each blow. The safety valve blows; the keeper sits on it and is thrown off. The governor comes apart: its arms hit their stops, the weights fly off, the yoke swings out from under him, and the spindle snaps and splits the flywheel as he lands at the chimney's foot on the coda's first chord. |
| 134.25 | fall | `finale/fall.ts` | He drops into an iron standpipe and plugs it like a cork. The crash blows him out on a geyser, and it rams him up through every level he came down: against each floor's underside on a chord, through it on the next, chunks thrown up and landing on either side. Up through the hall as it comes down round him (a wide shot of the hall: the pillars one a chord, then on the six hammer blows the throne toppling and the lights going out one a blow, him surging up into the vent's mouth over it). The last blow throws him up the dark vent; he coasts through the silence to a stop under the summit's cap; the roll slams him against it and it cracks with dawn light. The first last chord blows the cap out; the second throws him east in a long arc under the last stars. He lands on the east shoulder, bounces once and rocks to rest in a grassy hollow. The dawn comes up, the stave church's bell swinging in the valley, and the camera cranes up and back over the credits. |

**Strikes**: 361 in all, gathered by `dovre/hits.ts`: every part's `_HITS` in the tune (each on an eighth of the grid
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
- **Peer is in the frame all the way, under Zoom too** (`check:shows` walks it every 20 ms).
- **Traps**: the stage's `rectMode` is CENTER (every set laid out by corners sets CORNER inside its push); a raw
  gradient leaves p5's fill cache stale (`kit.ts` `honest`); a Vite reload during `shot.mjs` or `film.mjs` freezes or
  kills the run, so never edit while filming.

## What `check:shows` holds it to

`apps/rube/checks/mountain-king.ts`: the picker's names; the whole recording from zero, credited, with its upload;
the beat followed quarter by quarter; one mountain, no portal, no cut; the parts in order; Peer never jumping (0.04
cells a millisecond) and never hidden more than 2 s; every strike on the music; the coda's first chord and the two
last chords struck; every seam struck; every phrase struck on its first note; the coda's chords struck (a pickup
may go by); Peer in the frame all the way, under Zoom too; the camera on the seam framing at every seam; every drop
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

The share card is `public/shows/mountain-king/opus55.png`: the King on his throne, risen, roaring with his sceptre
high, the court behind him pointing at Peer.

## How it was made

Directed by Claude Opus 5.5 in one workflow: pre-production (the cue, the measured structure, the kit, the canonical
drawings, a stub for every part, the check's skeleton), six builders in parallel (gate, deep, hall, mine, drum,
heart, each on its own files), then integration (the finale, the seams, the camera as one take, the whole show
filmed at 1× and fixed where it was weakest, the credits, the card, this report).

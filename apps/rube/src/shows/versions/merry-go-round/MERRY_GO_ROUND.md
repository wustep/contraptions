# Merry-Go-Round

Joe Hisaishi's concert arrangement of the *Merry-Go-Round of Life*, from *Howl's Moving Castle* (Hayao Miyazaki,
Studio Ghibli, 2004), played by a Rube Goldberg machine. One ball, one path, 365 strikes, every mechanism on the
music. In the picker it is **Merry-Go-Round**, one take, **Opus 5.5**. The recording is copyrighted and used as a
demo only (`ATTRIBUTION.txt`). Every piece is new.

Open it at `/shows/?show=merry-go-round&take=opus55`.

## What it is

It tells the film as machines, in the film's order. A hatter at dawn. A stranger who walks her on the air. A curse.
The hills and a scarecrow. A castle that walks, its fire demon, its door that opens on four places, and breakfast.
The flower fields, the war, the castle falling apart until it is one plank on legs, a heart given back, and the
castle made again, walking away up the sky. It runs 5:11 of music plus 25 s of credits in the quiet after it, 336 s
in all.

- **Sophie is the ball**, the thread through every machine. Her colour is her age (`howl/age.ts`), and nothing else
  says it: chestnut `#A85A3A` young, greyed a step on each accent after the curse to a dull silver `#9D99AA`, warming
  back most of the way among the flowers (she forgets herself, the film's own rule), aged again by the fleet, and
  bright silver `#E4E1EE` from the moment she gives Howl his heart: young, her hair gone silver.
- **Howl is the cornflower ball** `#4D7FD4`, company: he rides, leads and follows, and never makes a machine go.
  As the bird he goes to ink `#2C2E46` with wings under him (`drawWings`).
- **Markl is the small sage ball** `#6DAA78`, at breakfast.
- Everyone else is drawn: **Calcifer** (a flame with a face, never a disc; the castle's engine, whose size is its
  energy), **Turnip Head**, **the Witch of the Waste**, the soldiers and the blob men, the fleet, and the castle.

There are four places, and the show visits most of them more than once. The hatter's town is seen at dawn, noon,
night and at war; the wastes hold the hills, the castle walking, the collapse and the flight; the castle's room
holds breakfast and the bombing; and there are the flower fields. Every change of place is a match cut on Sophie.
The camera carries its framing across by exactly the ball's shift, so she holds still on the screen while everything
round her becomes somewhere else. Nearly every cut is a step through the castle's door, whose colour dial says where
it opens.

## The cue

Hisaishi's own concert arrangement, from the artist's official channel ("Joe Hisaishi Official", the upload linked to
*Dream Songs: The Essential Joe Hisaishi*, Decca Gold, 2020), YouTube `f7SS57LFPco`, 311.2 s, played whole from its
first sample. The film's own soundtrack cut has no official upload, and the 2:46 single is too short for the story. This one
carries the whole film's arc. It has a music box, the theme alone, a held note, the waltz for a hundred seconds, a
stop, a flowing interlude, a slow waltz in the major, a build, the waltz again loud, a breath, the climax a key
higher, a cadenza, the last tutti and a last chord struck three times.

`scripts/shows/merry-go-round-onsets.py` measures it once into `scripts/shows/plans/merry-go-round-onsets.json`
(numpy and ffmpeg). It is a waltz in stretches, each at its own pace, so there is no one comb: each stretch with a
pulse is tracked beat by beat (a DP tracker with a drifting tempo, each beat snapped to its own attack within 40 ms,
bars of three with the downbeat where the low band hits hardest), and the free stretches keep their onsets.

| s | stretch | how it keeps time |
| ---: | --- | --- |
| 0 → 9.6 | a music box: a rising figure every quarter second | measured onsets |
| 9.6 → 38.2 | the theme, slow and alone, G minor, a bar every 1.6 s | tracked beats (bar 1 = 11.349) |
| 38.28 → 48.9 | a held D, a trill over it, soft to 48.7 | measured onsets |
| 49.035 → 150.4 | the waltz, ~162 bpm, a bar every 1.1 s; the swell at 70.0; accents 99.4 → 107.5 (the strongest, 101.309); a swell at 110.1; accents 128 → 136 | tracked beats (bar 0 = 49.035) |
| 150.4 → 152 | it stops | |
| 151.998 → 177.3 | the flow: running notes, D major, two waves and a hush | measured onsets |
| 178.051 → 199.5 | a slow waltz in E flat, a bar every 1.9 s, from its great first hit | tracked beats |
| 199.639 → 219.3 | the build, quickening, B flat to D minor | tracked beats |
| 218.883 → 242.4 | the waltz again, loud, D major | tracked beats (bar 1 = 220.462) |
| 242.4 → 243.6 | a breath | |
| 243.635 → 285.8 | the climax, E minor, the loudest; accents 263.6 → 273.5 (272.37) | tracked beats (bar 1 = 244.030) |
| 285.8 → 292.2 | the cadenza, soft and high and free | measured onsets |
| 292.2 → 300.3 | the last tutti; its first clear beat 292.734 | tracked beats (bar 1 = 293.471) |
| 300.3 → 311.2 | a breath, the last chord struck three times (302.243, 302.411, 302.568), its ring | measured onsets |

Every part is handed a slot (the show time Sophie arrives and the time she must leave) and builds its lane from
timed waypoints, so a strike lands where the music is by construction. `check:shows` holds every strike to a tracked
beat (±30 ms) or a measured onset of strength 0.2 or more (±40 ms).

## The acts, in order

| Show s | Music | Part (file) | What happens |
| ---: | --- | --- | --- |
| 0 → 38.28 | the music box; the theme | shop (`town/shop.ts`) | Dawn in the dark workroom of the late hatter's shop. On the sill a music box's carousel of little hats turns, a pin plucking a tine on every note, and its drum winds Sophie up a dumbwaiter into the first light. The hat line, one machine on the theme's strong notes: a kick press seats its ram on the felt in a burst of steam; a sewing treadle she rocks once a bar draws the hat's trolley to the ribbon, which lays a band round the crown, cuts it and dabs a bow; the stand's brass column lifts the finished hat to the light. She pushes the door open on the bell and walks up the street as the shutters open ahead of her on the theme's strong notes. 48 strikes. |
| 38.28 → 49.035 | the held D | alley (`sky/alley.ts`) | Two soldiers stamp off the wall into her way; Howl comes up behind her; he nods and they jerk stiff, about-face and march off into a side passage a step a note. The Witch's blob men ooze out of the walls behind and ahead, closing in; on the waltz's first downbeat the two step up into the air and the blob men's arms fall short. |
| 49.035 → 85.8 | the waltz, the swell at 70.0 | skywalk (`sky/skywalk.ts`) | They walk on the air over the town, a step on every downbeat, her steps stiff and then loosening. Chimneys puff under their footholds, a washing line billows; on the swell her step lands over the town hall's weathercock, which spins, the clock clicks to noon, the bell's first stroke and a burst of pigeons, and the camera pulls out to the whole town (cells 20) with the parade in the square. Twelve strokes of noon, a descent onto the café's balcony, and he bows and walks off over the roofs on the air. |
| 85.8 → 107.9 | the waltz, soft; the accents | curse (`town/curse.ts`) | Cut: the same shop at night, closing. The display carousel brakes and folds its arms on the downbeats while a huge shape comes along the street outside. The bell, the door opens by itself, and the Witch of the Waste squeezes in, a heave a beat, and looms. On 101.309, the strongest note of the waltz, her glove goes out and a soft dark gust knocks Sophie back; on each accent after it she greys a step while the Witch laughs and goes. A glance in the mirror, and she walks out, old. |
| 107.9 → 121.15 | the waltz, bars 54 → 64 | hills (`wastes/hills.ts`) | Cut: out of the town's door onto the heather. A stick in a hedge: two tugs and it pops free, and it is Turnip Head, who somersaults over her and hops after her in 3/4. He hops back into a fog rolling in; thuds in the fog; giant legs; a lit eye; the castle stands hazed behind her. |
| 121.15 → 151.998 | bars 65 → 88: the accents, fading to the stop | walk (`wastes/walk.ts`) | The castle strides over the knoll past her, a footfall on every downbeat. Its telescoping stair drops; she jumps for its foot and climbs a tread a beat to the porch. Calcifer roars (fire at the chimney, two great bursts), and it strides away across the wastes into the dusk past a thorn tree on the three loudest strides; night comes and the windows light one by one; it sits down on the last note; the latch, and the door. |
| 151.998 → 178.051 | the flow | morning (`castle/morning.ts`) | Cut: the room, dark but for the grate. Calcifer wakes and drives the room's machine: a steam engine over the mantel, belted to a line shaft that works the shutters, the pump at the sink, and a trolley on a ceiling rail; a rocking chair that works the bellows. Two knocks: Markl turns the dial to blue and the door opens on Porthaven. The dial whips to black and Howl comes home; the trolley lowers the pan onto Calcifer and breakfast cooks on him, the eggs cracked on the rim on the four strong notes. The dial back to green, and the door opens on the flower fields. |
| 178.051 → 205.86 | the slow waltz; the build | field (`flowers/field.ts`) | Out onto the porch, down arm in arm into the flowers, as over the town. Behind them the castle gets up and walks off to sit across the lake. Howl's old water wheel lifts her tub up its side, a cam tips her into the flume, and she rides the aqueduct knocking three paddles that shower three beds of flowers open; a see-saw sets her down by the lake. The stillness; the fleet crosses the far sky; Howl becomes the bird and climbs away to it; the castle wades back for her, and she runs to it over stepping stones, a landing a strong note. |
| 205.86 → 237.0 | the build; the waltz again, loud | raid (`war/raid.ts`) | Cut: out of the hat shop's door into the town at night. Far bombs flash; the lights go out down the street a house a beat. Howl the bird tears through a bomber; a searchlight holds him; a bomb comes for her and he strikes it aside and it bursts down the street. The great warship slides in and drops a bomb a downbeat, walking house by house toward the shop; he goes into its bay and it blows. She hurries home on the beats. |
| 237.0 → 243.635 | the waltz's last bars; the breath | hearth (`plank/hearth.ts`) | Cut: the room, shaking; the door blown shut, dust off the beams, crockery, Calcifer cowering. In the breath she lifts him out of the grate. |
| 243.635 → 292.734 | the climax; the cadenza | plank (`plank/plank.ts`) | Cut on the climax's hit: without its fire the castle comes down round her, a piece a bar, until it is one plank on four legs. She sets Calcifer in its grate and it runs across the wastes, a pair of feet a downbeat. Howl the bird comes down onto its prow, spent, on the loudest note; she carries Calcifer to him and on 272.370 gives him back his heart: Calcifer goes into his chest, Howl's colour comes back, and Calcifer comes out free, a small star. The plank sits down and slides down the long slope to the cliff, and Turnip Head stops it at the edge. The cadenza: stillness, the star turning over them. |
| 292.734 → 336 | the last tutti; the chord; the credits | flight (`finale/flight.ts`) | The star dives back into the plank's grate on the tutti's first downbeat, a flame again, and the plank heaves up off the ledge on his fire, a beat a heave. The castle's pieces fly back out of the wreck and lock on, a piece a downbeat, the collapse backwards: the hull and its folded legs on the tutti's great note (294.934), the face (its eye lights), the cottage and the back turret, Calcifer's chimney (his smoke up it at once), the flag. In the breath the windows light, the door swings open on the warm room, the castle drifts out over the gorge and lets its legs down; on the last chord its first foot comes down on the air, three roars of fire, and it walks away up the sky into the evening, as the two of them once walked on the air over the town. The credits come over the sky. |

## The castle

The show's hero machine (`wastes/castle.ts`, the castle builder's, canonical): an iron hull, stone turrets and slate
cones, a timbered cottage, Calcifer's brick chimney, pipes and cannons, and its face at the front (a round eye under
an iron brow, a jaw of teeth, a drawbridge tongue), on four iron bird legs that bend backwards. Everything that draws
it goes through its API: `CastlePose` (step, sit, stair, roar, haze, lights, door, dial, lean, ground, travel,
modules), `onBody` and `doorAt` for riding it, `feetAt`. The collapse (`plank/plank-collapse.ts`) moves and drops
its modules; the finale brings them back the same way, each group drawn as its own castle call in flight, locking
into the whole.

## Craft notes

- **Sophie's age is colour, never text** (`age.ts`), keyed to the music: the curse greys her on exactly the accents
  after 101.309; the flowers warm her; the heart breaks it over a second and a half.
- **Calcifer is the engine.** In the room his flame drives the steam engine and its line shaft; on the plank his
  grate drives the legs; when she lifts him out, the plank falters; in the finale his return lifts the plank and
  calls the castle home, and the chimney's roar is the last chord.
- **Rhymes.** The music box's little carousel of hats and the shop's display carousel. The walk on the air over the
  town and the castle's walk up the sky. The collapse and the rebuild, a piece a bar each way. The hat shop's door at
  dawn, at the curse and in the war.
- **Doors.** Every cut but two is a step through a door. The dial turns on the music: blue for Porthaven, black for
  Howl's war, green for the fields, red for the hat shop.
- **Soft volume.** Smoke, steam, fog, dust and clouds are radial puffs, never outlined, uneven in size, never a row.
- **The credits** are words the page sets (`Performance.titles`, `credits.ts`) high and a little left of middle,
  while the castle walks away low on the right; the sky of the flight deepens at the top into the evening so the
  words read, and a light shade sits under them. A veil of the sky's own gradient takes the land away below as the
  castle climbs, so the credits come over sky and clouds.

## Chrome, credits, checks

- In the picker the work is **Merry-Go-Round** and its one take **Opus 5.5**: the Version row hides by itself. No
  byline. `about` and `still` give the share card (`public/shows/merry-go-round/opus55.png`, from
  `npm run cards`).
- The soundtrack plays the label's upload (`youtube: [{ id: 'f7SS57LFPco' }]`, `shows/youtube.ts`), the same clock
  sample for sample, with the demo mp3 as the fallback and for export.
- Credits: Directed by Claude Opus 5.5; With Sophie, Howl, Markl, Calcifer and Turnip Head, each with a swatch;
  Music, Joe Hisaishi, "Merry-Go-Round of Life" from Howl's Moving Castle (2004); After Howl's Moving Castle, a film by
  Hayao Miyazaki, Studio Ghibli, from the novel by Diana Wynne Jones; Drawn with p5.js.
- `check:shows` (`apps/rube/checks/merry-go-round.ts`) holds: every strike on a tracked beat or a measured onset;
  every part striking; 75% of the waltz's downbeats under the walk on the air, 80% of the castle's while it walks,
  75% of the climax's, every downbeat of the last tutti; the curse, the slow waltz's hit, the climax, the heart and the
  last chord struck; every seam and cut on the recording; the places in the story's order; Sophie never jumping in
  a place and holding still on the screen at every cut (1 ms steps); never hidden more than 2 s; in the frame under
  Zoom; Howl and Markl never jumping, and coming and going only out of shot or at a cut; Howl not in the town at
  dawn, the shop at night or the hills; Sophie's age story; the credits' words and timing.

## How to run and look

- The dev server: `npx vite --port 8951 --strictPort`, then `/shows/?show=merry-go-round&take=opus55`
  (`&music=file` plays the local file instead of YouTube).
- `npm run check:shows` for the checks; `npm run build` runs every check.
- The probes and the camera tools the show was made with (`dev/shot.mjs`, `dev/film.mjs`, `dev/jerk.ts`,
  `dev/cam.ts`, `dev/pace.ts`) are untracked; they are the ones Liftoff and Epilogue left.

## How it was built

The kit is Liftoff's and Epilogue's (`kit.ts`, `camera.ts`, `physics.ts`), with Everything's legs and match cuts
(`show.ts`, `score.ts`, `seams.ts`). A part is a drawing plus `build(slot)`, returning a lane from timed waypoints
and camera keys in its own frame; `lay()` checks every seam. The director measured the cue, designed the acts,
wrote a stub for every part so the show ran end to end from the first day, and wrote one brief; seven builders
built the town, the sky, the castle, the room, the flowers, the war and the plank in parallel on one dev server;
the director built the finale, wired the seams, and filmed the whole show at 1× to fix the weakest stretches.

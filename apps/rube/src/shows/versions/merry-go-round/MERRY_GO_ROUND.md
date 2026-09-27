# Merry-Go-Round

Joe Hisaishi's concert arrangement of the *Merry-Go-Round of Life*, from *Howl's Moving Castle* (Hayao Miyazaki,
Studio Ghibli, 2004), played by a Rube Goldberg machine. One ball, one path, 376 strikes, every mechanism on the
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
- **Markl is the small sage ball** `#6DAA78`, at breakfast on his own stool beside her, and home in the open door at
  the end.
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
| 0 → 38.28 | the music box; the theme | shop (`town/shop.ts`) | Dawn in the dark workroom of the late hatter's shop. On the sill a music box's carousel of little hats turns, a pin plucking a tine on every note, and its drum winds Sophie up a dumbwaiter into the first light. The hat line, one machine on the theme's strong notes: a kick press seats its ram on the felt in a burst of steam, and she rocks its treadle on the melody's notes, the ram tamping the felt again; a sewing treadle she rocks once a bar draws the hat's trolley to the ribbon, which lays a band round the crown, cuts it and dabs a bow; the stand's brass column lifts the finished hat to the light. She pushes the door open on the bell and walks up the street, hung with bunting for the parade day, at eye level: the town wakes on the theme's strong notes (shutters open, the café's striped awning and the florist's green one crank out, past the baker's pretzel and the cobbler's boot), and the night's street lamps are snuffed as she comes by them, a counterweighted cap dropping on each. The camera glides on ahead to the lane's mouth, where two soldiers lounge; on the last lamp's note their heads come round to her, and she checks, then walks on. 47 strikes. |
| 38.28 → 49.035 | the held D | alley (`sky/alley.ts`) | Out of the sun into the lane's cool shade. Two soldiers stamp off the wall into her way and she shrinks back; only then does Howl come into the frame from behind her, easing to rest at her side; he nods and they jerk stiff, about-face and march off into a side passage a step a note. The Witch's blob men ooze out of the walls behind and ahead, closing in; on the waltz's first downbeat the two step up into the air and the blob men's arms fall short. |
| 49.035 → 85.8 | the waltz, the swell at 70.0 | skywalk (`sky/skywalk.ts`) | They rise between the tall house's windows and over its eaves into the sky, and walk on the air over the town, a step on every downbeat, his arm guiding her: her steps come a little late and too high, then in step with his from bar 12, and under each of hers the air is pressed out flat in soft uneven lobes. The camera is a close two-shot a third down in open sky, only chimney tops, vanes, pigeons and puffs coming in at the foot. Under each step over the roofs something answers: a chimney's puff up to her foot, a vane spun round, pigeons bursting off a ridge, the washing billowing; on the swell her step lands over the town hall's weathercock, which spins, the clock clicks to noon, the bell's first stroke and a burst of pigeons, and a cut to the whole town below them, the two of them small and high over the weathercock, the frame drawing in; two bars on, a cut in to them past the tower. Twelve strokes of noon, a descent onto the café's balcony, and he bows and walks off up the air; the camera eases back to keep him, and the breath of his last step (84.72) sends petals off the balcony's geraniums tumbling down past her. |
| 85.8 → 107.9 | the waltz, soft; the accents | curse (`town/curse.ts`) | Cut: the same shop at night, closing, the display carousel by the counter ticking round by clockwork on the downbeats. She steps onto its pedal and it slows a tick at a time, stops, and folds its arms, while a huge shape comes along the street outside. The bell, the door opens by itself, and the Witch of the Waste squeezes in, a heave a beat, and looms. Her glove comes out and draws back; on 101.309, the strongest note of the waltz, she flings it open, her bulk heaving after it, and a soft dark gust rolls out of it through Sophie and the whole shop, the lamp guttering and the room sinking toward night; she is blown back, and finds her feet; on each accent after it she greys a step while the Witch laughs and goes. A glance in the mirror, and she walks out, old. |
| 107.9 → 121.15 | the waltz, bars 54 → 64 | hills (`wastes/hills.ts`) | Cut: out of the town's door onto the heather. A stick in a hedge: two tugs on the swell and it pops free, and it is Turnip Head, who somersaults over her as the frame opens on the sky. She climbs the hill; he hops past her to the top in 3/4 (off on the two, down on the next downbeat), looks back, and bounds back down past her into a fog rolling up the lane; thuds in the fog where he went; framed from her, low on the crest, giant legs and then the castle's face come out of the fog over her, cropped by the top of the frame, and its eye lights on her. |
| 121.15 → 151.998 | bars 65 → 88: the accents, fading to the stop | walk (`wastes/walk.ts`) | The castle strides over the knoll past her, a footfall on every downbeat, walking in three: its hull drops onto each downbeat and heaves up in two pushes on beats 2 and 3, the heap on top squashing a moment after each landing, the jaw clacking and the pipes rattling on 2 and 3 (heavier on the roar and the three great strides). Its telescoping stair drops; she jumps for its foot and climbs a tread a beat to the porch, a lantern over it lit as she comes up. Out of the fog the camera cuts in to her under the legs and climbs with her. On Calcifer's roar (128.0) a cut out to the whole castle, his fire leaping out of the chimney in tongues and two great bursts of smoke, the first time we see the engine, and back in to her on the porch on the next bar; on each of the three loudest strides a cut out to the whole castle striding into the dusk past a thorn tree, and back in to her between them; night comes, the lantern's light a pool on the planks round her feet, the windows lighting one by one; under the porch, the great legs stride under her into the dark; on the last footfall a cut out to the whole castle against the night as it sits down, and on the last note back in to her at the door, which opens on the room's light. |
| 151.998 → 178.051 | the flow | morning (`castle/morning.ts`) | Cut: the room, dark but for the grate. Calcifer wakes and drives the room's machine: a steam engine over the mantel, belted to a line shaft that works the shutters, the pump at the sink, and a trolley on a ceiling rail; a rocking chair that works the bellows. Two knocks: Markl turns the dial to blue and the door opens on Porthaven, and the camera rides the flow's swell in to it: the sea, a gull crossing on the crest, a caller on the quay bowing. The dial whips to black and Howl comes home, and she turns in her chair to the door; he pauses by her, then stands at the fire's far side as the trolley lowers the pan onto Calcifer and breakfast cooks on him, the eggs cracked on the rim on the four strong notes. At the table Markl sits on his own stool beside hers, Howl at its end beside her; he goes up to the rope, the dial back to green, and the door opens on the flower fields. |
| 178.051 → 205.86 | the slow waltz; the build | field (`flowers/field.ts`) | The door bangs wide on the slow waltz's hit and the picture opens wide on it (a scale match cut on her): the castle sat in the flower valley, the two of them small at its door, the water wheel, the lake and the snowy mountains; the wide is the hit's alone, and the camera settles straight in on them as they waltz down arm in arm into the flowers, as over the town, and stays close on her through her machine, Howl walking the bank just ahead of her. Behind them the castle gets up and walks off to sit across the lake. Howl's old water wheel lifts her tub up its side, a cam tips her into the flume, and she rides the aqueduct knocking three paddles that shower three beds of flowers open; a see-saw sets her down by the lake. The stillness; on the build's first note a cut out wide: three dark warships come over the snowy range in echelon, the lead crossing the castle's roofline, their reflection sweeping the lake under the two of them small at the water's edge. A cut back in as his wings open: he lifts off her side, banks down to her and hangs, and on the bar's strong note goes, up and away, and she takes half a step after him; then she turns to the stones. On her first stone a cut out to the castle wading back across the lake for her and letting itself down into the water at her feet; on her second, as it kneels, a cut in low on her, the door coming ajar on the war's red light; she leaps onto its porch as the door bangs open. |
| 205.86 → 237.0 | the build; the waltz again, loud | raid (`war/raid.ts`) | Cut: out of the hat shop's door into the town at night, deep indigo over the roofs. Far bombs flash; the lights go out down the street a house a beat. She pushes a hand-pumped fire engine (a banded wooden tank, a see-saw beam on an iron frame) up the street a push a beat. Four times the camera cuts up to the war over the roofs, a sky lit from below them, the ships black against it: Howl the bird tearing through a bomber, which goes down burning behind the roofs; a searchlight finding him; later the great warship opening its bay; and at the end the ship blowing. A cut in on her pushing; a bomber comes in low along the street and tosses a bomb at her, a close on Howl stooping to strike it aside, and it bursts down the street. She springs onto the pump's beam and rides it a stroke a bar, a stream of water breaking into drops over into the crater's fire, which ducks under each stroke, while the great warship slides in over the roofs and drops a bomb a downbeat (a cut out to the whole street for two bars as the stick walks house by house toward the shop); he goes into its bay; she steps down, a cut up to the ship over the hat shop's gable, and it blows. She runs home on the beats; the hat shop is dark. |
| 237.0 → 243.635 | the waltz's last bars; the breath | hearth (`plank/hearth.ts`) | Cut: the room, shaking; the door blown shut, dust shaken down from the beams in sifting clumps, crockery, Calcifer cowering. In the breath the room goes still; she reaches right into the grate and touches him on the note, his eyes fly open on her, and she lifts him out. |
| 243.635 → 292.734 | the climax; the cadenza | plank (`plank/plank.ts`) | Cut on the climax's hit: without its fire the castle comes down round her, the hearth breaking round the two of them; cut on the bars: out to the whole castle tearing apart, the hull in iron plates, the turrets snapping from their cones, a piece a bar; in to her under the torn hull; out for the cottage and the face going down, until it is one plank on four legs; what fell in its way crumbles into its own dust, and it runs on over clear ground, leaving the wreck behind. She sets Calcifer in its grate and it breaks clear of the wreck and runs across the wastes past granite tors, a pair of feet a downbeat, shedding boards off its stern and sparks off its hips, Turnip Head springing out of the dust onto the stern and riding it in 3/4; close on her on the deck, Calcifer flaring on every stride. A cut out as Howl the bird comes down out of the sky, and in to the two of them on the prow as he lands, spent, shedding feathers, on the loudest note; Calcifer, small and dim and blue now, looks up at him; a cut in to the two of them as she lifts Calcifer out of the grate, and she walks him in to Howl against the deep blue far range; she sets him before her, draws him back, and on 272.370 gives him back his heart, pushing him into Howl's breast as Howl's wings lift open to take him: Calcifer goes into his chest, a gold light spreads from him over her, Howl's colour comes back, and Calcifer comes out free, a spark at Howl's breast swelling as it rises into a small star. The plank sits down and slides down the long slope to the cliff, Turnip Head leaping over them and bounding ahead to the brink, and he stops it at the edge on his pole (a cut on the contact, the deck teetering, stones going down into the gorge). The cadenza: stillness at the brink against a dark crag of the far range, the camera coming in to the two of them for Howl's stir and the glance, the star turning over them. |
| 292.734 → 336 | the last tutti; the chord; the credits | flight (`finale/flight.ts`) | The star dives back into the plank's grate on the tutti's first downbeat, a flame again, and the plank heaves up off the ledge on his fire, a beat a heave. The castle's pieces fly back out of the wreck and lock on, a piece a downbeat, the collapse backwards, cut on the downbeats: out for the hull and its folded legs on the tutti's great note (294.934) and the face (its eye lights); in, held on the porch, as the cottage and the back turret come down over them: the porch jolts, the lantern swings, dust and slates come down past them, and they go up on their toes to look; out for Calcifer's chimney (his smoke up it at once) and the flag. On the flag a cut in, close, to the two of them on the porch as the windows light over them and the door swings open on the warm room behind them, Markl in it, home, held through the breath as it drifts out over the gorge and lets its legs down, each foot onto a small cloud; on the last chord a cut to the whole castle as its first foot comes down on the air, every window flaring, three roars of fire out of the chimney, the smoke rolling up in a column and thinning away before the words, and the frame eases out as it walks away up the sky, a cloud under every foot, into the evening, as the two of them once walked on the air over the town, while on the brink below Turnip Head hops it off, lifting his hat at the top of every hop. The credits come over the sky, and far off and low the fleet's warships cross it the other way, going home. |

## The castle

The show's hero machine (`wastes/castle.ts`, the castle builder's, canonical): a heap, not a hotel. An iron hull
patched plate by plate (a boiler's bulge under the stern, a strongbox jutting off it, rust, brass and plank patches),
stone turrets and slate cones, a timbered cottage with rooms heaped on it (a thin tower-house leaning out, a cabin
askew on the ridge, a crooked stovepipe), Calcifer's brick chimney, a tank, pipes and cannons, and its face at the front (a round eye under
an iron brow, a jaw of teeth, a drawbridge tongue), on four iron bird legs that bend backwards. Everything that draws
it goes through its API: `CastlePose` (step, sit, stair, roar, haze, lights, door, dial, lean, ground, travel,
modules), `onBody` and `doorAt` for riding it, `feetAt`. The collapse (`plank/plank-collapse.ts`) moves and drops
its modules and tears the hull along the same outline (`HULL_OUTLINE`); the finale brings them back the same way,
each group drawn as its own castle call in flight, locking into the whole. Calcifer's roar out of the chimney is one
drawing (`drawChimneyFire`), at the walk's roar and at the last chord. Walking (`CastlePose.gait`), it walks in three:
the hull drops onto the downbeat and heaves up in two pushes on beats 2 and 3, the heap above the deck squashing about
the deck line a moment after each landing (`onBody` follows it, so riders and the chimney's fire stay on it).

## Craft notes

- **Sophie's age is colour, never text** (`age.ts`), keyed to the music: the curse greys her on exactly the accents
  after 101.309; the flowers warm her; the heart breaks it over a second and a half.
- **Calcifer is the engine.** In the room his flame drives the steam engine and its line shaft; on the plank his
  grate drives the legs, and as the castle dies he goes small, dim and low, an ember cooling through a smoky brown-grey to blue (never pink or lilac); when she lifts him out, the plank falters; in the finale his return lifts the plank and
  calls the castle home, and the chimney's roar is the last chord.
- **Rhymes.** The music box's little carousel of hats and the shop's display carousel. The walk on the air over the
  town and the castle's walk up the sky. The collapse and the rebuild, a piece a bar each way. The hat shop's door at
  dawn, at the curse and in the war.
- **Blue is Howl's alone.** The soldiers are grey-green, the Porthaven fisherman in an ochre oilskin: no stranger
  near him in blue.
- **Doors.** Every cut but two is a step through a door. The dial (a flat half-disc plate on the lintel, four coloured
  notches, a lever) turns on the music: blue for Porthaven, black for Howl's war, green for the fields, red for the
  hat shop.
- **Cuts that move.** Where she walks through a cut, the camera goes through it at her speed: each leg's follow sees
  her carried on past its ends at the speed she crosses, and the leg opens on a follow offset to the carried framing.
  Where she crosses at rest, it opens on a hold. On the slow waltz's hit the cut is a scale match (`SEAMS.field.open`):
  her place on the screen holds exactly while the picture opens from the room's close to the whole valley.
- **The camera takes three hits in the body** (`score.ts` `punch`): the curse, the climax and the heart. It pushes
  in over 18 ms and eases back over seconds (τ 1 s, gone by 3.5 s): a sharp hit, a long damped recovery.
- **The camera never whips; it cuts.** Inside a place a key can be a cut (`Shot.cut`, only on a strike): the camera
  holds the key before's framing up to it and jumps on it, her place on the screen free to change. Otherwise its zoom
  stays under 0.6 of a scale a second, but for the punches and one designed knock (the floor bucking under the bombs).
  There are 44 cuts, every one on a strike, and they hold the lead's floor: she is never under 12 px across (at 640×360)
  for more than 0.3 s, but in a named establishing wide of two bars or less (the check's `WIDES`), each there for the
  size of something she is small against: the whole town under the swell, the castle out of the fog, the roar and
  the three great strides, the castle sitting down in the night, the valley's hit, the fleet, the castle wading back for her, the bombs walking down
  the roofs, the castle tearing apart and going down, the bird coming down over the running plank, the castle coming
  home, and the chord. The camera cuts out to the wide and back in to her, never a long pull. The raid also cuts up
  to the sky four times, her ball hidden below the frame's foot for under 2 s each.
- **Soft volume.** Smoke, steam, fog, dust and clouds are radial puffs, never outlined, uneven in size, never a row.
  The finale's clouds are drawn as the town's are: two heaps of uneven size on a long soft underside.
- **Fire sits in what burns.** A roof's fire comes up out of a ragged hole in its slates, lit from inside, the slates
  round it warm and the roof's edges catching the light; the town burning beyond the roofs goes down behind their line.
- **On a phone held upright** every set ends soft: the town's stone sinks into the night below the street, the land
  and the gorge go down into one mist, and the finale's veil is the sky's own gradient placed as the sky places it.
- **The credits** are words the page sets (`Performance.titles`, `credits.ts`) high and a little left of middle,
  while the castle walks away low on the right; the sky of the flight deepens into the evening, its deep blue
  coming half-way down the frame so every row of the cards (their gold fine print too) is over it, and a light shade
  sits under them. The sky's gradient and the shade are both placed from the page's
  16:9 box, so a phone held upright sees the same sky under the words. A veil of the sky's own gradient takes the land away below as the
  castle climbs, so the credits come over sky and clouds.

## Chrome, credits, checks

- In the picker the work is **Merry-Go-Round** and its one take **Opus 5.5**: the Version row hides by itself. No
  byline. `about` and `still` give the share card (`public/shows/merry-go-round/opus55.png`, from
  `npm run cards`).
- The soundtrack plays the label's upload (`youtube: [{ id: 'f7SS57LFPco' }]`, `shows/youtube.ts`), the same clock
  sample for sample, with the demo mp3 as the fallback and for export.
- Credits: Directed by Claude Opus 5.5; With Sophie, Howl, Markl, Calcifer, Turnip Head and the Witch of the Waste, each with a
  swatch;
  Music, Joe Hisaishi, "Merry-Go-Round of Life" from Howl's Moving Castle (2004), in his concert arrangement from
  *Dream Songs: The Essential Joe Hisaishi* (Decca Gold, 2020), the recording played; After Howl's Moving Castle, a film by
  Hayao Miyazaki, Studio Ghibli, from the novel by Diana Wynne Jones; Drawn with p5.js.
- `check:shows` (`apps/rube/checks/merry-go-round.ts`) holds: every strike on a tracked beat or a measured onset;
  every part striking; 75% of the waltz's downbeats under the walk on the air, 80% of the castle's while it walks,
  75% of the climax's, every downbeat of the last tutti; the curse, the slow waltz's hit, the climax, the heart and the
  last chord struck; every seam and cut on the recording; the places in the story's order; Sophie never jumping in
  a place and holding still on the screen at every cut between places (1 ms steps); the camera's own cuts only on strikes, and its zoom never faster than 0.6 of a scale a second outside the punches and the floor's knock; the whole castle inside the Zoom frame under the credits; never hidden more than 2 s; never under 12 px across for more than 0.3 s outside the named wides; in the frame under
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

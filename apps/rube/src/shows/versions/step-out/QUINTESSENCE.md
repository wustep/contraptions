# Quintessence

`/shows/step-out/opus55/` (also `/shows/step-out/`). In the Shows picker it is the work **Quintessence**, whose one take
is **Opus 5.5**, on the **Movies** shelf.

**Quintessence · after The Secret Life of Walter Mitty** (Ben Stiller, 2013).

The recording is copyrighted. It plays from Republic Records' own upload to YouTube only
([5EV9IdeU3D0](https://www.youtube.com/watch?v=5EV9IdeU3D0)); there is no audio file in the repo, beside the show, in
`public/` or in this branch's history. Nothing here claims any right to it. The attribution is in
`apps/rube/src/shows/versions/step-out/ATTRIBUTION.txt`.

## What it is

A Rube Goldberg machine plays José González's *Step Out* from its first second, 4:01, and then the end credits in the
quiet after it: 270 s in all. It is one ball on one path through the film, in the film's order. Every scene is a
machine, and every machine strikes the music.

- **Walter Mitty** is the thread. He starts **slate** (`#7D8FA3`), the grey-blue of the basement and of a man who
  daydreams. At the hinge in Nuuk, when the Cheryl he has imagined leads him out of the bar and he goes after her for
  real, he warms over two seconds to **Life's red** (`#D23A2E`) and stays it. Nothing else in the show is that red but
  the Life logo's box, which is the point: the last issue's cover is him.
- **Cheryl Melhoff** is the **marigold** ball (`#E8B04A`). She is company only in the office, in the daydream, on the
  little stage at Nuuk (imagined), and on the street at the end.
- **Sean O'Connell** is the **khaki** ball (`#9C8F6A`), only in the Himalayas, and still.
- **Drawn, never balls:** Ted Hendricks (a hard dark silhouette and his beard), the pilot, a fisherman, his mother,
  the kids with the longboard, the three-legged dog, the shark and the snow leopard. The leopard is barely there.

Every piece, place and drawing is new for this take. The only things shared with Magnum (and through it Liftoff and
Everything) are plumbing: the part kit, the camera director, the match-cut show, and the page's credits hook.

## The cue

**Why Step Out.** It is the film's own song, the longboard down the road in East Iceland: the moment Walter stops
daydreaming and goes. Its shape is the film's:

- a swell, then a guitar and a bass alone;
- the band in, on a downbeat;
- everything over the bass drops out for eleven bars, as if heard under water;
- the band back;
- a sudden hush, a held low note and soft picking;
- a low pulse under it;
- a long build, the choir coming up a phrase at a time;
- the peak, the loudest stretch;
- the fall, and one chord ringing out.

That shape gave the layout:

- the basement in the swell;
- the daydream as the band comes in;
- the sea in the bass-only stretch;
- the eruption on the band's last hit and the ash in the hush;
- his mother's piano on the pulse;
- the Himalayas on the build;
- negative 25 and the presses on the peak;
- the newsstand in the fall.

**The clock.** `scripts/shows/step-out-onsets.py` measured a local analysis copy of the video's audio once (fetched
with yt-dlp into the git-ignored `out/step-out/`, never committed) into `scripts/shows/plans/step-out-onsets.json`.

- **Played, not sequenced.** The pulse is about 144 bpm but leans between 143 and 145 from section to section. One
  comb fitted to the whole song is a quarter of a second out by the end. So the pulse is tracked beat by beat, by
  dynamic programming under a tempo allowed to drift, and every beat is moved onto its own attack where one is within
  25 ms.
- **Measured on the waveform.** Round the 25 hardest beats of each stretch, a 1 ms envelope's rise puts the frames 30 ms
  early. With that correction, the beats sit a median 3 to 10 ms from the attacks' starts.
- **In four.** Bars are counted from the band's first downbeat (bar 1, 10.363 s), and every section starts on one.
- **What it holds:** every beat with its bar, its place in the bar and its strength; every onset; the stretches;
  loudness every quarter second.

## In order

Times are show seconds. `n.p` is bar n, beat p.

### The basement (0 to 10.363)

| Time | Music | What happens |
| ---: | --- | --- |
| 0 | silence | The negative assets room under the Life building, in the dark. Walter sits on frame 20 at the near end of an unlit light table. |
| 0.088 | the swell | The tubes strike, flash, die back, stutter twice (0.343, 0.622) and catch. On the second hit (3.356) they come fully up. The strip shows frames 20 to 27, with a blank where 25 should be. |
| 3.519 to 7.780 | the lead, −3.1 to −1.3 | He rolls along the strip frame by frame. Each frame lights under him as he lands on its beat: the water with a ship, the curve, the thumb, the water again. |
| 8.639 | 0.1 | He drops into the blank where frame 25 should be. It glows whiter as he stares into it. He is zoning out. |

### The daydream (10.363 to 23.74)

| Time | Music | What happens |
| ---: | --- | --- |
| 10.363 | the band in | Match cut. He sits on the lip of a subway platform at night, the colour turned up past true. The window across the street blows out. |
| 11.222 to 12.087 | 1.3, 2.1 | He arcs off the lip, over the tracks, into the burning room. A joist comes down behind him (12.900). |
| 13.724 to 16.226 | 3.1 to 4.3 | He rolls into a dumbwaiter car beside the three-legged dog. The gate drops shut, the brake lets go, and the car goes down on his weight. The counterweight rises and the pulley turns, while the fire flares on the downbeats. |
| 16.644 to 18.757 | 4.4 to 6.1 | Out through the shop door onto the pavement. The dog lopes past him and lands its last hop at Cheryl's side, under the street lamp. |
| 22.066 | 8.1 | The fire flares once more, and everything drains to grey: the flames, the city, Cheryl, the dog. |
| 22.478 to 23.314 | 8.2 to 8.4 | He leaps back over the tracks and comes to rest on the lip exactly where he began. It was only a daydream. |

### The clues (23.74 to 37.05)

| Time | Music | What happens |
| ---: | --- | --- |
| 23.738 | 9.1 | Match cut back into the blank frame, as if he never moved. Cheryl rolls in from the right, pushing the loupe on its rail. |
| 25.833, 26.269 | 10.2, 10.3 | Ted, a dark silhouette with his beard, raises his fist to the frosted door, raps twice, and blurs away. |
| 27.075 to 32.074 | 11.1 to 14.1 | Working backwards, one frame a bar, the loupe clicking down on each: the water, the thumb, the curve, and the water again, closer, with a ship's reflection in it. |
| 33.745 to 35.411 | 15.1 to 16.1 | He goes onto the enlarger's tray, which rises up the column with a ratchet tick on each beat. The lamp comes on and throws the ship large on the far wall. |
| 36.247 | 16.3 | The focus knob turns and the picture comes sharp. He rolls into its grey water. |

### Nuuk (37.05 to 50.41)

| Time | Music | What happens |
| ---: | --- | --- |
| 37.054 | 17.1 | Match cut into a bar on the harbour at Nuuk. The door settles and the bell over it rings. |
| 38.743 to 42.923 | 18.1 to 20.3 | The helicopter pilot, hunched drunk at the bar, sets his glass down hard. His thumb comes up and its ring catches the light: the thumb from the negative. It taps the counter while Walter edges toward the door and back. He hesitates. |
| 43.747 | 21.1, the hinge | The little stage's spotlight comes on, and Cheryl is on it with a guitar. She is imagined. She sways on the beats. |
| 46.238 to 47.056 | 22.3 to 23.1 | She rolls off the stage and out of the back door, and the spotlight goes off. He goes after her. |
| 48.316 | 23.4 | He bangs the door open and turns red. A plank knocks under him (24.1), the door slams behind him (24.3), and he runs. |

### Over the sea (50.41 to 70.398)

| Time | Music | What happens |
| ---: | --- | --- |
| 50.411 | 25.1 | Match cut onto the helipad. The postal helicopter (white, a grey belly, one dark stripe) has its rotor turning once a beat. Its strobe flashes on every downbeat. |
| 51.665 to 53.732 | 25.4 to 27.1 | He leaps in through the open side door beside the parcel, and the skids leave the pad. |
| 55.41 to 63.740 | 28 to 33 | Out over the grey-green sea and the floes. The air drops from under the cabin twice (29.1, 31.1), and he floats up and lands. On 33.1 the one wide: the helicopter small in a big sky, coming down toward a trawler among the ice. |
| 65.417 to 68.749 | 34.1 to 36.1 | The pilot looks back at him. Walter steps down onto the skid with the parcel. The pilot shakes his head: he will not land. |
| 69.574 | 36.3 | He pushes off. |
| 70.398 | under | He hits the water as everything over the bass drops out. |

### The sea (70.398 to 95.23)

| Time | Music | What happens |
| ---: | --- | --- |
| 70.398 | 37.1 | Match cut under the skin. The overcast, the floes and the boat line up above the surface. Below it is cold blue-black, with shafts of light. |
| 70.4 to 77 | kick and bass | He sinks. The parcel goes on down without him, turning, into the dark: the radio is lost. A breath of bubbles goes up from him on each of thirteen strong lows. |
| 76.2 to 86.9 | 40 to 47 | A blurred shape crosses far off: a porpoise, he thinks. It comes back nearer, then in front and under him, nearest and slowest: a shark. Its menace is its shape, not its teeth. |
| 86.948, 87.784 | 47.1, 47.3 | A weighted net drops off the stern and closes round him, the shark right below. |
| 88.620 | 48.1, the band back | Hauled out through a crown of spray. The boom swings him in, and he drops onto the deck (49.1). |
| 89.3 to 93.4 | 49 to 51 | A fisherman in a dark oilskin and a knitted cap comes out round the wheelhouse holding a clementine cake. On 50.1 (91.894) he stoops and sets it down beside Walter on its paper wrapper, straightens, and stays to watch. Sean's notes are on the paper, in scribbles. |

### Iceland (95.23 to 133.278)

| Time | Music | What happens |
| ---: | --- | --- |
| 95.226 to 100.189 | 52.1 to 55.1 | Match cut to the top of a ridge road in East Iceland. He hops onto a bicycle and rolls off. Reflector posts flare as he passes. A flock wheels over and, for about a second, pulls into one round shape before it breaks up. |
| 101.826 | 56.1 | The bike hits a road sign and goes down. He tumbles past it. |
| 102.691 to 105.153 | 56.3 to 58.1 | The trade. Three kids, his stretchy toy for their longboard: the toy lands at their feet, its arms are pulled out wide, the board is swung down, and he is on it. |
| 106.807 to 118.405 | 59 to 66 | The longboard, the film's Step Out moment. Down the mountain's face in switchbacks: hairpins on 59, 61, 63 and 65, crests on 60, 62, 64 and 66. Grit flies at every turn and a post flares on every beat. From 110.4 to 115.5 the camera draws back: the whole zigzag, the cliff, the fjord, and the volcano smoking past it. |
| 119.845 | the band's last hit | He is out on the shore road. The volcano bursts: an amber flash, stones thrown, the column shooting up. |
| 120.06 to 126.06 | the hush | Silence in the picture too. He rolls to a stop. A small plane crosses toward the plume and is gone inside it: Sean, and Walter has missed him. |
| 122.54 to 133.28 | soft picking | Ash comes down, 22 flakes landing on the guitar's onsets, four of them on him. From 126.06 he holds completely still. The ash thickens over the whole frame. |

### Home (133.278 to 146.519)

| Time | Music | What happens |
| ---: | --- | --- |
| 133.278 | the pulse | The one cut under a cover: the ash lifts off his mother's new apartment at evening. There is a lamp, boxes not yet opened, and her piano. She is a soft silhouette at the bench, playing the pulse, one low note at a time. |
| 133.7 to 145.7 | 75 to 82 | He goes up beside her: the bench, a key of his own, the rim. Her notes carry him along the rim of the curved side, each struck string ending under him and its ring moving him on. |
| 146.12 | 82.4 | At the curve he touches the last negative, which hangs from the lamp turning on its thread, and stops it face on. The curve in it is the curve under him. The clue is solved without a word. |

### The Himalayas (146.519 to 191.409)

| Time | Music | What happens |
| ---: | --- | --- |
| 146.519 | 83.1, the build | Match cut to the foot of a snow face at eighteen thousand feet. A gust tears the snow off the rock over him. |
| 147.3 to 168.08 | 83 to 96 | The climb, up three legs of a switchback to a ledge. A step every other beat, then one on every beat as the choir comes up. |
| 168.08 | 96.1 | On the ledge, Sean sits behind his long lens, still. Walter stops beside him. They wait. |
| 170 to 178 | 97 to 101 | While the music builds, the picture holds its breath. Only the world round them moves on the beats: snow sifting off the rock, the camera strap knocking the tripod's leg. |
| 178.07 to 181 | 100 to 101 | Across the valley, the snow leopard comes out onto the rocks, pale on pale, one soft step a beat, and stops. |
| 182.2 | 102.3 | Sean does not take the picture. He comes back off the eyepiece to Walter's side, and the camera stands alone while they look. |
| 186 to 189.7 | 106 to 108 | The cat goes. They are left side by side on the ledge. |

### Life (191.409 to 226.384)

| Time | Music | What happens |
| ---: | --- | --- |
| 191.409 | 110.1, the peak | Match cut onto the long conference table: negative 25 lands flat beside him. This is the camera's one punch. Ted, the dark silhouette, stands at the far end and starts back (110.3). |
| 193.1 to 197.7 | 111 to 113 | He rolls off the table's end, down to the mezzanine, and down the iron stair into the press hall, a tread a beat. |
| 198.079 | 114.1 | He lands on the start treadle. The press starts and the lamps come up. The treadle throws him onto the paper web. |
| 198.5 to 203 | 114 to 117 | The last issue builds a unit at a time: the red box, the white rule, the grey photograph. Each impression is a knock on a beat at its nip, and each plate lifts to let him through. |
| 203.054 on | 117.1 | The folder: a cut every beat. Copies fall face on into the stacker, and the stack rises a copy a beat. |
| 209.3 to 217 | 120.4 to 125 | He goes off the former's nose onto the stack. The stack is fed from below and lifts him. |
| 218.04 to 220.15 | 126.1 to 127.2 | The joggers square it, the strap goes over, cinches, and the seal is crimped. |
| 220.573 | 127.3, the loudest | The pusher shoves the bundle, with him on it, out onto the conveyor. The bundle goes through the loading door's strip curtain (128.3), and he drops onto the pavement in the morning (130.1). |

### The street (226.384 to the end)

| Time | Music | What happens |
| ---: | --- | --- |
| 226.384 | 131.1, the fall | He rolls along a New York street on a pale morning, clanking over two cellar doors. |
| 228.903 | 132.3 | Cheryl comes to him from out of shot. They stop, touching, and go on together. |
| 229.873 to 232.572 | | The newsstand's shutter goes up in two hauls. The vendor's hand, up from behind the ledge, pulls three issues down onto the wire, and Life comes last. Its cover is the red box with its white rule, and a photograph: a dark room, a lit strip, a small slate dot at its near end. It is the show's first frame, and it is him. |
| 233.048 | the last chord | They stop before the cover, and the issue settles. |
| 235.3 to 245.6 | it rings out | They go on up the street side by side to the corner, and wait by the crossing signal. The camera draws back and holds on the stand, the street, the avenue's towers in the haze and the far corner. |
| 236.2 to 270 | then quiet | The end credits. |

## End credits

The words are the page's (`Performance.titles(t)`); a show's canvas sets no type. The canvas lays only a soft shade
under them.

| Role | Names | Fine print |
| --- | --- | --- |
| Directed by | Claude Opus 5.5 | |
| With | Walter Mitty, the slate ball, then the red; Cheryl Melhoff, the marigold ball; Sean O'Connell, the khaki ball | |
| Music | José González | "Step Out", written by Theodore Shapiro and Craig Wedren; Republic Records (2013) |
| After | The Secret Life of Walter Mitty | a film by Ben Stiller (2013) |
| Drawn with | p5.js | |

## What `check:shows` holds it to

`apps/rube/checks/quintessence.ts`, run by `npm run check:shows`:

- **The panel:** the work is Quintessence, one take, Opus 5.5. It has no note and no byline. Its `about` names the film.
- **The music:**
  - played from YouTube `5EV9IdeU3D0` only, from its zero, with no local file;
  - credited to José González, the song and the film;
  - the credits come after it.
- **The places:**
  - in the film's order: the negatives, the daydream, the negatives again, Nuuk, the sky, the sea, Iceland, home, the
    Himalayas, Life, the street;
  - every cut on a downbeat, and on the song's turns;
  - no portal, and no cut drawn;
  - one cut under the ash, and the ash only round it.
- **The ball:**
  - never jumps in a place;
  - holds still on the screen at every cut, so every cut is a match cut;
  - is never hidden for more than 2.5 s;
  - stays in frame under Zoom, but for the wides, which are under 12% of the show;
  - can always be found;
  - stands still in the hush.
- **His colour:** slate until he runs out of the bar at Nuuk, and red from the helipad to the end.
- **Every strike lands on the recording:**
  - 329 strikes, each within 30 ms of a tracked beat or a measured onset;
  - every place strikes;
  - the song's turns are struck: the band in, the drop under, the band back, the last hit, the pulse, the build, the
    peak, the last chord;
  - at least 75% of the downbeats where the band plays;
  - at least 70% of the peak's attacked beats.
- **The camera:** cuts inside a place only on a strike, never whips, and opens on its first frame.
- **Cheryl and Sean:**
  - never jump;
  - come and go only out of shot or at a cut;
  - there are never two of anyone;
  - Cheryl is only in the office, the daydream, the little stage and the street;
  - Sean is only in the Himalayas.
- **The end credits:**
  - after the last chord, set by the page;
  - opening on "Directed by Claude Opus 5.5";
  - with "After: The Secret Life of Walter Mitty, a film by Ben Stiller (2013)".

## How it is built

- **The version file:** `apps/rube/src/shows/versions/step-out/opus55.show.ts`. Everything with weight is behind
  `load()`.
- **The show:** `.../step-out/quintessence/`, on Magnum's kit.
  - `kit.ts`, `camera.ts`, `physics.ts`: the plumbing.
  - `show.ts`: one ball on one path through ten places, cut into eleven legs.
  - `score.ts`: the order, the legs, the cameras carried across each cut, the ash, and the punch.
  - `seams.ts`: what Walter is doing at each cut: his velocity, the camera's distance and his place in the frame.
  - `music.ts`: the clock read from the onset file.
  - `worlds.ts`: the cast's colours.
  - `credits.ts`, `hits.ts`, `wides.ts`.
- **The places:** one folder each, each with its own `theme.ts`, mostly split into a plan (times and ways) and a draw
  file. They are `negatives/` (both basement legs, and the shared hand the street also draws with), `dream/`, `nuuk/`,
  `sky/`, `sea/`, `iceland/`, `home/`, `himalaya/`, `press/` and `street/`.
- **Measuring again:** `python3 scripts/shows/step-out-onsets.py` measures again from a fresh local copy (the command
  is in its header). It only needs to run if the video changes.

## How it was made

- **Choosing and measuring.** The lead chose the song and the structure from the film and the song's measured shape.
  It wrote the clock, the plumbing, the seams, the checks and a stand-in for every part.
- **Building.** Six builders then built the places in parallel, each in its own worktree on its own dev server:
  - the basement and the street, as one design language for the bookends;
  - the daydream and Nuuk;
  - the sky and the sea;
  - Iceland;
  - home and the Himalayas;
  - the press.
- **Director's passes.** Each builder made at least two passes over frames of its whole slot before handing back.
- **Integration.** The lead brought the places together and looked at the whole. The home and Himalayas builder had
  gone three hours polishing faces without a commit, so the lead stopped it, took its work (which already passed every
  check for its slot), and finished the scene from there.
- **What the passes changed:**
  - the eruption was moved so it happens in the open, in frame;
  - the kids were scaled down to the ball;
  - Ted's beard was redrawn so it no longer read as a second head;
  - a round focus knob, which read as another ball, was made square;
  - the shark's passes were raised into the frame;
  - the press's stacker posts were taken out;
  - the dream's fire was redrawn as soft tongues in four warm values.
- **What the last polish pass changed** (from an audit of the frames):
  - the fisherman's hand, which came down from the top of the frame as a long pole through the wheelhouse, became
    a whole fisherman who walks out with the cake, stoops to set it down, and stays;
  - the street's last wide ran out of world at the corner, so the avenue, its far corner and a crossing signal
    were drawn in;
  - Sean's lifting his eye moved him 0.05 of a cell, which could not be seen, so he now comes back off the
    camera to sit beside Walter;
  - Ted's knuckles floated beside his head as a loose dot, so they now have an arm.
  - Life was flipped down second, before the third issue, though the plan has it last, on the beat before the
    chord. The flips are now in order, and the vendor's hand comes up from behind the ledge to pull each one down.

## Judgment calls

- **The title.** Sean's note calls negative 25 "the quintessence of Life". The show ends on what it was.
- **Red for Walter.** He becomes the colour of the magazine's box, so the cover is him before it is shown.
- **The ash as the one cover.** Every other cut is a match cut on him. Under the ash the world is gone for a moment, as
  it is for him.
- **Things left out on purpose:**
  - the firing, Cheryl's doorstep, the airport, the Benjamin Button daydream and the fight with Ted;
  - any lettering on the Life box, the wrapper or the road sign;
  - any red but Walter's and the magazine's.

## Known limits

- The snow leopard is meant to be barely there, and on a small screen it may not be found at all.
- In the longboard's wide (110.4 to 115.5 s) and the helicopter's wide (63.7 to 67.1 s), Walter is a few pixels across.
- Only headless Chromium has been watched. Frame rate on real hardware has not been measured for this take.

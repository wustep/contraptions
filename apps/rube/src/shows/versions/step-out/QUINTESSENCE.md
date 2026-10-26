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
  the Life logo's box, which is the point: the last issue's cover is him, and he is red on it from the first flip
  (the photograph is of who he became, so it never warms there).
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
| 0 | silence | The negative assets room under the Life building, in the dark. Walter sits on frame 20 at the near end of an unlit light table. Behind it the archive goes back in the dark as plain blocks of stacks and boxes, with rolling ladders, and high on the back wall a street-level window lets in daylight and passing feet. |
| 0.088 | the swell | The tubes strike, flash, die back, stutter twice (0.343, 0.622) and catch, and each strike lights the whole archive cool for a moment. On the second hit (3.356) they come fully up. The strip shows frames 20 to 27, with a blank where 25 should be. The camera pushes in as the light comes up. |
| 3.519 to 7.780 | the lead, −3.1 to −1.3 | He rolls along the strip frame by frame. Each frame lights under him as he lands on its beat: the water with a ship, the curve, the thumb, the water again. |
| 8.639 | 0.1 | He drops into the blank where frame 25 should be. The rest of the strip dims as he stares into it. He is zoning out. |

### The daydream (10.363 to 23.74)

| Time | Music | What happens |
| ---: | --- | --- |
| 10.363 | the band in | The blank frame he stares into opens out to the screen's edges, and he sits on the lip of a subway platform at night, the colour turned up past true. The window across the street blows out. Behind it is a quiet city under a whole moon in magenta haze: one plane of towers with a few windows lit, the near fronts, and five pigeons wheeling over the roofs in one flock. |
| 11.222 to 12.087 | 1.3, 2.1 | He arcs off the lip, over the tracks, into the burning room. A joist comes down behind him (12.900). |
| 13.724 to 16.226 | 3.1 to 4.3 | He rolls into a dumbwaiter car beside the three-legged dog. The gate drops shut, the brake lets go, and the car goes down on his weight. The counterweight rises and the pulley turns, while the fire in his room, three big tongues on its floor, flares on the downbeats. The camera draws back to the whole burning building and the city as the car goes down. |
| 16.644 to 18.757 | 4.4 to 6.1 | Out through the shop door onto the pavement. The dog lopes past him and lands its last hop at Cheryl's side, under the street lamp. |
| 22.066 | 8.1 | The fire flares once more, and everything drains to grey: the flames, the city, Cheryl, the dog. |
| 22.478 to 23.314 | 8.2 to 8.4 | He leaps back over the tracks and comes to rest on the lip exactly where he began. It was only a daydream. |

### The clues (23.74 to 37.05)

| Time | Music | What happens |
| ---: | --- | --- |
| 23.738 | 9.1 | The daydream dissolves back into the basement, and he is in the blank frame as if he never moved. Cheryl rolls in from the right, pushing the loupe on its rail. |
| 25.833, 26.269 | 10.2, 10.3 | Ted, a dark silhouette with his beard, raises his fist to the frosted door, raps twice, and blurs away. |
| 27.075 to 32.074 | 11.1 to 14.1 | Working backwards, one frame a bar, the loupe clicking down on each: the water, the thumb, the curve, and the water again, closer, with a ship's reflection in it. |
| 33.745 to 35.411 | 15.1 to 16.1 | He goes onto the enlarger's tray, which rises up the column with a ratchet tick on each beat. The lamp comes on, and the ship is large on the far wall. |
| 36.247 | 16.3 | The focus knob turns and the picture comes sharp. He rolls into its grey water. |

### Nuuk (37.05 to 50.41)

| Time | Music | What happens |
| ---: | --- | --- |
| 37.054 | 17.1 | The ship's picture dissolves into a bar on the harbour at Nuuk. The door settles and the bell over it rings. Its lamps swing on their cords, their light lying on the boards and the counter. Through the doors and the window the harbour moves on its own planes: the town's coloured houses under Sermitsiaq with three bands of low cloud across it, a trawler tied up at the quay, a boat going out with its wake, two moored boats, two gulls, and sleet falling outside. |
| 38.743 to 42.923 | 18.1 to 20.3 | The helicopter pilot, hunched drunk at the bar, sets his glass down hard. His thumb comes up into the lamp's light and its brass ring goes gold: the thumb from the negative. It taps the counter while Walter edges toward the door and back. He hesitates. |
| 43.747 | 21.1, the hinge | Cheryl drops out of the dark onto the little stage as its spotlight comes on, its light on the boards, and she has a guitar. She is imagined. She sways on the beats. |
| 46.238 to 47.056 | 22.3 to 23.1 | She rolls off the stage and out of the back door, and the spotlight goes off. He goes after her. |
| 48.316 | 23.4 | He bangs the door open and turns red. A plank knocks under him (24.1), the door slams behind him (24.3), and he runs. |

### Over the sea (50.41 to 70.398)

| Time | Music | What happens |
| ---: | --- | --- |
| 50.411 | 25.1 | The bar dissolves into the daylight on the helipad. The postal helicopter (white, a grey belly, one dark stripe) has its rotor turning once a beat. Its strobe lamp blinks on every downbeat. Gulls on the quay's end go up one after another in the rotor's wash. |
| 51.665 to 53.732 | 25.4 to 27.1 | He leaps in through the open side door beside the parcel, and the skids leave the pad. The overcast lies in three long flat layers going away to the horizon, and a cold silver sun shows in a broad break in them. |
| 55.41 to 63.740 | 28 to 33 | Out over the grey-green sea and the floes. The air drops from under the cabin twice (29.1, 31.1), and he floats up and lands. On 33.1 the one wide: the helicopter small in a big sky, coming down toward a trawler among the ice. |
| 65.417 to 68.749 | 34.1 to 36.1 | The pilot looks back at him. Walter steps down onto the skid with the parcel. The pilot shakes his head: he will not land. |
| 69.574 | 36.3 | He pushes off. |
| 70.398 | under | He hits the water as everything over the bass drops out. |

### The sea (70.398 to 95.23)

| Time | Music | What happens |
| ---: | --- | --- |
| 70.398 | 37.1 | The water rises over the frame, and he is under the skin. The overcast, the floes and the boat line up above the surface. Below it is cold teal-black in flat steps, with three broad jade shafts swaying, a few specks of marine snow, a jellyfish, a berg's keel far off, a hand line down from the hull, and one compact shoal under the hull that turns about as one on each strong low. |
| 70.4 to 77 | kick and bass | He sinks. The parcel goes on down without him, turning, into the dark: the radio is lost. A breath of bubbles goes up from him on each of thirteen strong lows. |
| 76.2 to 86.9 | 40 to 47 | A blurred shape crosses far off: a porpoise, he thinks. It comes back nearer, then in front and under him, nearest and slowest: a shark. Its menace is its shape, not its teeth. |
| 86.948, 87.784 | 47.1, 47.3 | A weighted net drops off the stern and closes round him, the shark right below. |
| 88.620 | 48.1, the band back | Hauled out through a crown of spray. The boom swings him in, and he drops onto the deck (49.1). |
| 89.3 to 93.4 | 49 to 51 | A fisherman in a dark oilskin and a knitted cap comes up out of the hatch in front of the wheelhouse holding a clementine cake. On 50.1 (91.894) he stoops and sets it down beside Walter on its paper wrapper, straightens, and stays to watch. Sean's notes are on the paper, in scribbles. |

### Iceland (95.23 to 133.278)

| Time | Music | What happens |
| ---: | --- | --- |
| 95.226 to 100.189 | 52.1 to 55.1 | The deck dissolves into the top of a ridge road in East Iceland, under a low gold sun: a few great heaps of cumulus lit gold from below, a few strokes of cirrus high over them, a glacier coming down to the fjord, sheep on the moss. He hops onto a bicycle and rolls off. The reflectors on the posts light as he passes. A flock wheels over and, for about a second, pulls into one round shape before it breaks up. |
| 101.826 | 56.1 | The bike hits a road sign and goes down. He tumbles past it. |
| 102.691 to 105.153 | 56.3 to 58.1 | The trade. Three kids, his stretchy toy for their longboard: the toy lands at their feet, its arms are pulled out wide, the board is swung down, and he is on it. |
| 106.807 to 118.405 | 59 to 66 | The longboard, the film's Step Out moment. Down the mountain's face in switchbacks: hairpins on 59, 61, 63 and 65, crests on 60, 62, 64 and 66. Grit flies at every turn and a post's reflector lights on every beat. From 110.4 to 115.5 the camera draws back: the whole zigzag, the cliff, the fjord, and the volcano smoking past it. |
| 119.845 | the band's last hit | He is out on the shore road. The volcano bursts: the land goes amber, stones are thrown, the column shoots up, lit orange from under, and the warmth fades off the land over the next seconds as the ash comes. Lava creeps down the snow, and lightning forks in the column on the guitar's onsets. |
| 120.06 to 126.06 | the hush | Silence in the picture too. He rolls to a stop. A small plane crosses toward the plume and is gone inside it: Sean, and Walter has missed him. |
| 122.54 to 133.28 | soft picking | Ash comes down in a few grey specks, 22 flakes landing on the guitar's onsets, four of them on him. From 126.06 he holds completely still. The ash's haze thickens over the whole frame. |

### Home (133.278 to 146.519)

| Time | Music | What happens |
| ---: | --- | --- |
| 133.278 | the pulse | The one cut under a cover: the ash lifts off his mother's new apartment at evening. There is a floor lamp behind the piano, its light on the wall and the rug, boxes not yet opened, and her baby grand. She is a soft silhouette at the bench, playing the pulse, one low note at a time. Through two windows the city's lights come on at dusk, a train crosses, and it snows a little. |
| 133.7 to 145.7 | 75 to 82 | He goes up beside her: the bench, a key of his own, the rim. Her notes carry him along the rim of the curved side, each struck string ending under him and its ring moving him on. |
| 146.12 | 82.4 | At the curve he touches the last negative, which hangs from the lamp turning on its thread, and stops it face on. The curve in it is the curve under him. The clue is solved without a word. |

### The Himalayas (146.519 to 191.409)

| Time | Music | What happens |
| ---: | --- | --- |
| 146.519 | 83.1, the build | The negative opens out to fill the frame, and he is at the foot of a snow face at eighteen thousand feet, in the blue hour. A gust tears the snow off the rock over him. The build is a sunrise. |
| 147.3 to 168.08 | 83 to 96 | The climb, up three legs of a switchback to a ledge, an old fixed rope clipped up the last pitch. A step every other beat, then one on every beat as the choir comes up. The range rises behind the near ridges as he climbs, the wind builds, and as the choir comes up the highest peaks take a rose-gold first light. |
| 168.08 | 96.1 | On the ledge, Sean sits behind his long lens, still. Walter stops beside him. They wait. |
| 169.74 to 174.75 | 97 to 99 | While the music builds, they hold still. The world round them moves on the beats: snow sifting off the rock, a plume off the great summit, the camera strap knocking the tripod's leg and shaking rime off it. |
| 174.75 to 176.79 | 100.1 to 101.2 | Across the valley, the snow leopard comes out onto the rocks, pale on pale, one soft step a beat, and stops. The sun's edge clears the far ridge. |
| 178.91 | 102.3 | Sean does not take the picture. He comes back off the eyepiece to Walter's side, and the camera stands alone while they look. The camera draws back until the two of them are a speck on the ledge in the whole range (183.3), then comes back in past the cat. |
| 185.15 to 188.91 | 106.2 to 108.3 | The cat goes. They are left side by side on the ledge in gold-white light, over a sea of cloud in a few big heaps, two summits' long shadows across it. |

### Life (191.409 to 226.384)

| Time | Music | What happens |
| ---: | --- | --- |
| 191.409 | 110.1, the peak | Sean's shutter closes on the mountain to a ring round him and opens on the long conference table: negative 25 lands flat beside him. This is the camera's one punch. Ted, the dark silhouette, stands at the far end against floor-to-ceiling windows on Manhattan at dawn, and starts back (110.3). |
| 193.1 to 197.7 | 111 to 113 | He rolls off the table's end, down to the mezzanine, and down the iron stair into the press hall, a tread a beat. |
| 198.079 | 114.1 | He lands on the start treadle. The press starts, and the lamps come up plane by plane, a beat apart, back into the dark, where three more press lines start under them. The treadle throws him onto the paper web. |
| 198.5 to 203 | 114 to 117 | The last issue builds a unit at a time: the red box, the white rule, the grey photograph. Each impression is a knock on a beat at its nip, and each plate lifts to let him through. |
| 203.054 on | 117.1 | The folder: a cut every beat. Copies fall face on into the stacker, and the stack rises a copy a beat. |
| 209.3 to 217 | 120.4 to 125 | He goes off the former's nose onto the stack. The stack is fed from below and lifts him. The camera draws back to the whole building: the office upstairs, the stair, every press line running, the catwalk, the paper racing under the roof, the window wall, and the street through the door. |
| 218.04 to 220.15 | 126.1 to 127.2 | The joggers square it, the strap goes over, cinches, and the seal is crimped. |
| 220.573 | 127.3, the loudest | The pusher shoves the bundle, with him on it, out onto the conveyor, and the caged lamp over it switches on. The bundle goes through the loading door's strip curtain (128.3), and he drops onto the pavement in the morning (130.1). |

### The street (226.384 to the end)

| Time | Music | What happens |
| ---: | --- | --- |
| 226.384 | 131.1, the fall | The press hall dissolves into a New York street in the morning, and he rolls along it, clanking over two cellar doors. The sun is low in the avenue's gap; the road and the near half of the pavement are in the shade of the buildings behind the camera, the fronts in the sun, and three pigeons burst off the pavement on the first clank. |
| 228.903 | 132.3 | Cheryl comes to him from out of shot. They stop, touching, and go on together. |
| 229.873 to 232.572 | | The newsstand's shutter goes up in two hauls. The vendor's hand, up from behind the ledge, pulls three issues down onto the wire, and Life comes last. Its cover is the red box with its white rule, and a photograph: a dark room, a lit strip, and at its near end, against its light, the red ball, ringed and marked as he rolls. It is the show's first frame, and it is him as he is now. |
| 233.048 | the last chord | They stop before the cover, and the issue settles. He stops right under himself: the ball on the cover and the ball on the pavement are one above the other. Five pigeons go straight up beside the stand. |
| 235.3 to 245.6 | it rings out | They go on up the street side by side to the corner, and wait by the crossing signal. The camera draws back to the stand, the street with traffic in both lanes, the avenue's towers in the haze and the far corner, and keeps drifting toward the avenue to the end. |
| 236.2 to 270 | then quiet | The end credits. The street goes on under them: a man buys a paper at the stand, a bicycle stands chained to the lamp post, the bus scares the pigeons up (254.5), a man walks down the avenue out of the haze, the traffic stops at the light (259.6), he crosses on the walk sign (260.7), and the hand flashes from 266.6. The light keeps rising. |

## End credits

The words are the page's (`Performance.titles(t)`); a show's canvas sets no type. Over the pale morning the page's
usual cream all but vanished, so they are set dark (`TitleCard.dark`): graphite, the street's own ink, at least 4.5 px
a unit on a phone. The canvas lays nothing under them: the street behind is calm enough to read them over a front or
the sky. Each card holds 3.4 to 5 s; the last is gone by 266.7 s.

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
- **The cover:** he stops on the last chord right under his own place on the last issue's cover.
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
  - `score.ts`: the order, the legs, the cameras carried across each cut, the ash, the punch, and the camera's
    breath: a slow drift and push under every framing, deeper as the song builds, from nothing on the first frame.
  - `passage.ts`: the passages. At each cut the place coming is painted into its own picture by the camera carried
    across the cut, and laid over the place going: through a shape already in the picture that opens out, or as a
    dissolve, with Walter drawn again on top, untouched.
  - `depth.ts`: the depth kit the places draw with: parallax planes (`layer`), motes and washes.
  - `seams.ts`: what Walter is doing at each cut: his velocity, the camera's distance and his place in the frame.
  - `music.ts`: the clock read from the onset file.
  - `worlds.ts`: the cast's colours.
  - `credits.ts`, `hits.ts`, `wides.ts`.
- **The places:** one folder each, each with its own `theme.ts`, mostly split into a plan (times and ways) and a draw
  file. They are `negatives/` (both basement legs, and the shared hand the street also draws with), `dream/`, `nuuk/`,
  `sky/`, `sea/`, `iceland/`, `home/`, `himalaya/`, `press/` and `street/`. Each has a set (the far planes, behind
  the machine) and a `front.ts` (the near plane, the air, the light and the grade, over the machine and under the
  balls).
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
- **What the pass after that changed** (a second audit):
  - the pilot is drawn at 0.86 of his size, and his arm and glass were placed at the counter's height and end
    before that scale, so his glass stood off the end of the counter in the air. They are placed in his own space
    now, and land on the counter;
  - at home the bench's seat was the floor's colour, so his mother seemed to sit on air beside an empty bench. The
    seat now catches the lamp, and she is plainly on its far end with Walter landing on its near end;
  - the press hall stopped at the loading door in a thin dark bar, like a cutaway. It now ends in a brick wall
    cut through at the door, with a stone lintel the strip curtain hangs from, and a threshold.
- **The cover pass** (Stephen: the last cover did not read as Walter, and the credits were hard to read):
  - on the cover he was a small slate dot on a dark photograph, though viewers had followed him red since the
    helipad. He is now the red ball as it rolls (an ink ring and his mark), about 1.6 times the size, against the lit
    strip's near end, and right over where the live ball stops: a match on the chord. He does not warm there;
  - the credits were the page's cream over a pale sky under a 9% shade, and the names all but disappeared. They are
    graphite now over a pale haze, held a little longer, with a floor on their size for phones.
- **The fullness pass** (Stephen: fill the frame, give every scene depth, never stop moving, light it like a
  colourist, build to the end, make every change of place an event, give it a camera, and raise the ceiling, at 60
  frames a second):
  - an audit of ten evenly spaced frames found every one more than a third flat or still (58% to 100%; the credits'
    hold was wholly still);
  - the lead built the passages, the camera's breath and the depth kit, and wrote a brief with a palette for each
    section: the archive's teal-black, the daydream's violet and firelight, Nuuk's tungsten, the sky's pearl, the
    sea's teal and jade, Iceland's moss and low gold, home's candle umber, the Himalayas' sunrise, the press's sodium
    and steel, the street's morning gold;
  - six builders took the places again in parallel: the basement and the daydream; Nuuk, the sky and the sea; Iceland
    and home; the Himalayas; the press; the street and the credits' hold. Each built far planes, near planes, air and
    light, and moved the camera, under a frame-time budget;
  - on the way they found hazes, ash, embers and dust drawn in parts' `over` passes, on top of Walter, and moved them
    under him; and blurs by `ctx.filter` on the projected ship, Ted and the shark, which made the show's slowest
    frame (116 ms), and drew them without;
  - the lead brought them together, put the water's light on the boat's hull (the one audited frame still over a
    third still), and measured;
  - after it, the same ten frames are 11% to 32% flat or still. Motion times detail (the share of pixels changing in
    a fifteenth of a second, times the share on an edge) went from 47 to 135 in the opening and from 47 to 392 in the
    last third, which is now 2.9 times the opening.
- **The restraint pass** (Stephen: the same eight points again with fresh eyes, cutting and refining as much as is
  added, fixing what pops or jitters, and no bloom, glow, sparkle or flourish):
  - the lead looked over the whole show at full size, and a scan of every frame at thirty a second for blocks that
    change once with calm either side found 44 pops;
  - six builders went over the places again, each from a list for its places. Every additive fill went, with the
    halos round the suns, the moon, the lamps, the windows, the pilot lights and the balls; the searchlights, the
    bokeh, the glints, the twinkle, the eruption's shock ring, the sun's rings over the Himalayas, the cones and
    shafts across the bar, the press hall and the street, and the flashes on strikes. Lamps are lit shades with their
    pools on the floor; a fire lights what is round it as one warm wash;
  - where that left a gap it was filled with things: washing, steam and pigeons in the daydream; a trawler at Nuuk's
    quay and a boat going out; gulls on the helipad's quay; shoals drawn as fish, a berg's keel and a hand line in
    the deep; the fisherman coming up through a hatch; cirrus over Iceland and a waterfall that reads as water; a
    fixed rope, altocumulus and a sea of cloud in the Himalayas; chain drives and roof steam at the press; steam as
    billows and bundles of papers in the street;
  - the bugs: the moon's halo clipped into a box; a hard vertical seam in the Himalayas; Nuuk's houses showing
    through the sea behind the helicopter; the cake there before the fisherman; a cover appearing from nowhere at the
    press's delivery on every cut; the loupe's glare going off in one frame; the shutter and the vendor's hand
    jumping; a post ghosting in on the road; Cheryl's guitar there before her; the overcast flickering by the sun; and
    a resize between two passages stopping the next one (p5's `remove` on a 2D graphics throws). Of the 44 pops, 12
    are left, all meant: the tubes striking, the enlarger coming on, the three cuts on strikes, the eruption, a
    plate on its beat;
  - the lead took the bloom out of the passages: plain edges, a burn that starts beside Walter instead of ringing
    him, doors with dark edges, and no flare, glint or glare; and the kit's glow, shaft and twinkle, which nothing
    used any more;
  - after it, the same ten frames are 16% to 30% flat or still, and the last third is 2.8 times as busy as the
    opening (370 against 134).
- **The second restraint pass** (Stephen: the same again, with fresh eyes):
  - the lead looked over the whole show at full size again. Some of what the first pass had added to fill its gaps
    now read as pattern or noise: the sea's shoals spread into a field of dashes, the Himalayas' clouds in a dozen
    parallel rows over a sea of cloud in ruled bands, the sky's overcast in polka dots, four plumes of steam at once
    in the street, a cluster of poles at the avenue's end. Six builders went over the places again from a list each,
    to cut and refine at least as much as they added, and to fix what they found;
  - fewer, clearer things: three compact shoals and one ribbon; four rows of cloud and a sea of cloud in heaps; the
    overcast in seven long rolls; one or two plumes of steam drawn as puffs; one signal and two lamps down the
    avenue; three clouds by the moon, one flock of five pigeons; the basement's dust and the enlarger's beam gone;
    the berg and the hull flat, without their nets of light; Iceland's striated bands and its curtains of ash cut;
    the lamp's cone gone at home, and its light soft-edged on the wallpaper;
  - more shine went: the only soft-focus thing left (a reel on the near desk), the tail rotor's disc, a halo round
    the pilot's head, the spotlight's cone and its pools under Cheryl, the whole-frame flash on every bolt of
    lightning, the ring round each flake of ash, the cake's glaze, the gold crystals in the Himalayan air, the knife's
    chips at the press, the helicopter's wink, the street's motes and its leaves' shadows on the paving;
  - the bugs: Cheryl appearing on the dark stage in a frame wider than 16:9 (she now drops onto it on the hinge); a
    gorge between two summits whose flanks fell straight down like posts; a bundle of posts standing one over another
    in a grid on the longboard's face; the enlarger's head drawn see-through; the first man to cross the street
    appearing at the kerb; the steam drawn in front of the traffic; the spray at the boat's bow repeating every 1.9 s;
    the light over the Himalayas pausing at a key so the top of the pull-back froze; the ash's flakes hanging in his
    mother's room after the ash had lifted;
  - after it, the show is 340 lines shorter, the same ten frames are 16% to 33% flat or still, the last third is 2.7
    times as busy as the opening (343 against 128; the middle is calmer than it was), and the pops left are the same
    twelve, all meant.
- **The less-is-more pass** (Stephen: the details overdone, the clouds at 1:40 too much, weird defects in the piano
  scene, a lot more visual noise, and odd transitions):
  - the lead scrubbed the whole show (a still a second, and every passage a tenth of a second at a time) and probed
    every frame at 60 a second for blocks that change once with calm either side, flash for one frame, or flicker
    back and forth: 1,411 events. Six builders took the places from a list each, to subtract before adding; the lead
    took the piano, Iceland, the passages and the credits;
  - the passages were each a decorated wipe: a framed rectangle round Walter, a burn with a charred, wavering rim,
    doors with bright jambs and a flare, foam, spray and bubbles on the waterline, a fold of paper with scribbles,
    sprocket bands and streaks of snow, seven gradient blades, a curtain of strips. Now the blank frame where 25
    should be opens out on the daydream, the last negative opens out on the snow, the sea's surface comes up as one
    light line, Sean's shutter is one flat iris, and the rest are plain dissolves;
  - the clouds: Iceland's 31 bands of mares' tails (about 1,500 dashes) are five strokes of cirrus, and its cumulus
    lost their cauliflower heads and small fair-weather heaps, three or four great heaps left; the sky's seven
    scalloped rolls and dome banks are three long flat layers; the Himalayas lost their altocumulus and geese, and
    the sea of cloud is six heaps instead of eighty; Nuuk's nine stacked lenses on Sermitsiaq are three bands; the
    daydream's cloud streaks went;
  - the piano: it was a picture painted once and scaled, so its keys and strings shimmered as the camera pushed in
    (74 flickers in the probe); its back leg showed only as a brass caster floating under the case; the pedals were
    brass ticks beside the front leg; the treble keys' ends showed past the cheek over the case wall; the struck
    string ran out over the wall; the floor lamp stood in front of the piano, its stem across the curve; and the
    negative's curve jumped when he stopped it. All fixed; the room lost the shadows on the wall (hers read as a
    ghost), the paper's sprigs, the plane, the blinking mast and the televisions in the windows, the boxes' lines,
    the boards' grain, the dust, and the out-of-focus box, plant and chair;
  - noise cut everywhere: the daydream's flames hanging in the sky, its glass shards, beacons, train, traffic,
    washing and fire escapes (one fire, a whole moon, one plane of towers); the archive's joists, fins, drawers and
    cans; the sea's seventy rays, three hundred specks, three jellyfish and three shoals (three shafts, a few specks,
    one jellyfish, one shoal); the bar's grain and the sleet over the room; the floes' polka dots and the rain over
    the cabin; Iceland's mottled moss and its 850 specks of ash; the Himalayan face's grain and generated rocks; the
    press's rivets, chain drives, gauges, second catwalk and far presses' detail; the street's leaf shadows over the
    stand and the cover, its striped light, its stack and plumes, half its traffic, most of its people, and the
    brick, dentils and scalloped awnings; and the haze under the end credits;
  - the bugs: the moon bitten by a tower and a lamp; a dark sliver in the burning window; the brake lever and the
    focus knob floating loose; the fisherman's hand jumping off the cake; the coast's snow reshuffling as the frame
    edge crossed a step; the sun going out for a frame from under the water; a beer tap vanishing for a frame; the
    joggers and pusher appearing in mid-air; the strip curtain jumping across the bundle; the street's windows
    losing their glass under the next front and popping back; the vendor's sleeve over the cover on the chord; the
    stand's second shadow; and the sun sitting on a signal mast like a lamp globe;
  - after it, the show's code is about 3,900 lines shorter and the probe finds about 900 events instead of 1,411
    (the piano's 157 are 49, the press's 362 are 181); the ones left are strikes, the passages, the rotors turning,
    edges moving across calm fills, and the camera's own moves. A frame paints in 1.1 ms at the median instead of
    1.4 (2560 × 1600, with the GPU), and in under half the time from the basement to the sea.
- **The polish wave** (three rounds over the whole show in the wide frame, a phone's tall frame and Zoom):
  - the phone saw past the world: the Himalayan face and the snow at its foot stopped 9 cells down, so a tall frame
    showed pale rectangles and a hard vertical edge under the climb; the daydream's platform and pavement stopped 6
    cells under the tracks, with the sky again below them. Both now run past the bottom of any frame;
  - the Himalayan rock read as boards floating on the face, with a bright white lip. The bands' snow is the slope's
    own now, their feet are broken and their tops lit, and the outcrop over the ledge is a chunk with an overhanging
    tip that the snow sifts off;
  - cut: the street's mailbox, the near plane's one thing, which stood in the near lane with the taxi behind it;
  - the lamp post outside the press stood with its foot on the conveyor and then right through him at the cut. It is
    further along the kerb. The hall's dark edges ease off over the bright pavement outside, where they lay as dirty
    lobes in the corners;
  - the daydream and the snow came up in their frames in 0.15 s and 0.12 s, a snap from near white. Each now comes up
    over its whole lead-in;
  - timing: the turns were read a tenth of a second either side (the band in, the drop under, the band back, the last
    hit, the pulse, the build, the peak, the last chord). All of them land, so nothing was retimed.
- **Polish wave 2** (the whole show again, wide and in a phone's tall frame, and a scan at 30 a second):
  - on a phone the street's road ran on to the frame's foot under the credits, the crossing's stripes down it like a
    ladder, and the man who crosses stopped where his way ended, standing in the middle of it to the end. The road now
    ends at a near kerb with the camera's own pavement in the shade past it, and he walks on along it;
  - the snow sifting onto the ledge was a tapering wedge of white that read as a beam of light. It falls as flakes now;
  - the scan found only the meant pops: the tubes, the enlarger and the cuts on strikes.

## Judgment calls

- **The title.** Sean's note calls negative 25 "the quintessence of Life". The show ends on what it was.
- **Red for Walter.** He becomes the colour of the magazine's box, so the cover is him before it is shown. On the
  cover he is red, not slate: it is the opening's picture, but viewers have known him red for two and a half minutes,
  and the payoff only lands if he is recognised at once.
- **The ash as the one cover.** Every other cut is a match cut on him. Under the ash the world is gone for a moment, as
  it is for him.
- **Walter's one colour.** He keeps his own colour exactly: no grade, haze, light or passage ever lies over him.
  Every place's grade is drawn under the balls, and the passages draw him again over the place coming. His warming
  from slate to red at Nuuk is the story, and the checks hold it, so it stays.
- **Passages, and still match cuts.** At every cut he still holds still on the screen and the camera carries across;
  the passage is the world changing round him, in the plainest way that fits: the blank frame where 25 should be
  opening out on the daydream, the last negative opening out on the snow, the sea's surface coming up past the lens,
  Sean's shutter on the peak, and a dissolve everywhere else. None has a drawn border, foam, char, sprockets or flare.
  The ash stays the one cover.
- **Light that falls on things.** A lamp is a lit shade and the pool it lays on the floor, the wall or the table; a
  sun or a moon is a plain disc; a fire lights what is round it as a plain warm wash. Nothing is added light, nothing
  has a halo, nothing sparkles or twinkles, and no strike flashes. Flat fills are also the fast path without a GPU.
- **The lightning.** In the eruption's column it flickers at most twice a second, under the three a second that is
  the line for flashing light.
- **Things left out on purpose:**
  - the firing, Cheryl's doorstep, the airport, the Benjamin Button daydream and the fight with Ted;
  - any lettering on the Life box, the wrapper or the road sign;
  - any red but Walter's and the magazine's.

## Known limits

- The snow leopard is meant to be barely there, and on a small screen it may not be found at all.
- In the wides Walter is a few pixels across: the burning building (about 15.5 to 17 s), the helicopter's (63.7 to
  67.1 s), the longboard's (110.4 to 115.5 s) and the whole range (182.5 to 185 s), 12.5 s in all.
- **Frame rate**, measured on an Apple M5 Pro in Chrome with its GPU, a 1280 × 800 window at 2× (a 2560 × 1600
  canvas), playing the whole show in real time against the video's clock: 59.9 frames a second, and of 16,184
  frames 3 came more than 20 ms after the last before the show's end (main, run straight after: 2). Repeated over
  the credits, where they fell, both builds drop 0 to 3 such frames a run, so they are the machine's, not the
  show's. The paint, timed alone at every 60th of a second with no readback, takes 1.1 ms at the median (1.4 before
  the less-is-more pass), 2.9 ms at the 95th percentile and 10.8 ms at most (20.3 before).
- **Without a GPU** (Chrome with its canvas forced to software, 1280 × 800 at 1×), measured before the less-is-more
  pass: a frame took 5.5 ms at the median, 13 to 14 ms at the 99th percentile and about 60 ms at most (the first frame
  of Iceland, which builds its pictures of the sky and the land). The builders' software timings since then are about
  half that under the water, in Nuuk and in the sky. A passage paints two places at once for about a second.

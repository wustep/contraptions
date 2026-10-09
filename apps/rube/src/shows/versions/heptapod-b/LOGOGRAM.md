# Logogram

The recording is copyrighted. This take is a private tech demo only; do not ship this audio in a public build.
Nothing here claims any right to it.

The music is Jóhann Jóhannsson's *Heptapod B*, from *Arrival* (Denis Villeneuve, 2016). The attribution is in
`apps/rube/src/shows/versions/heptapod-b/ATTRIBUTION.txt`.

Open it at `/shows/heptapod-b/opus55/` (or `/shows/?show=heptapod-b&take=opus55`). In the Shows picker it is the work
**Logogram**, whose one take is **Opus 5.5**.

## What it is

A Rube Goldberg machine plays the cue from its first sample, 3:42, and the end credits run on in the quiet after it:
4:11 in all. It is one ball on one path through four places, and it is a circle, as the film is: the last scene opens
on the show's first frame.

- **Louise Banks** is the orange ball (`#E2672C`), hazmat orange, the suit the team wears into the shell. She is the
  thread: every machine is hers to make go, and nothing else in the show is her colour.
- **Ian Donnelly** is the blue ball (`#5B84B1`). He is with her from the helicopter to the glass, and at the end.
- **Hannah** is the little peach ball (`#F4A582`), a paler Louise, her daughter. She is only ever at the lake house,
  which is the future.
- **Abbott and Costello**, the heptapods, are drawn, never balls: a tall trunk and seven heavy limbs, shapes in fog.

The places:

1. **The lake house** (the future): a long room of glass over a grey lake, firs and fog.
2. **The valley** in Montana under low cloud, fog pouring over its ridges, and the shell hanging over the meadow.
3. **The shell**: the shaft where gravity turns, and the chamber with the glass at its end.
4. **The fog** beyond the glass, where the heptapods are and where they write.

## The cue

**Why Heptapod B.** It is the language cue, the film's idea in sound, and it is a machine made of voices.
- One pulse of short sung notes that never changes pace: pulse *k* at 0.0847 + 0.238715·*k* s, from pulse 28 (6.763 s)
  to the last clear one, pulse 824 (196.783 s). The strong pulses sit within a few milliseconds of that one comb from
  start to end: the loops were laid on a grid.
- Over it the voices loop in lengths of 7, 13 and 18 pulses and phase against each other. So there is no bar and no
  downbeat: only the pulse, and how hard each one is sung.
- Its arc: free murmurs out of near silence; the pulse forming and the voices swelling up to it; layers stacking in
  (39, 66, 90 s); the fullest voices from 108 to 132 s (the loudest swell of the cue, at 130.4 s, has no attack of its
  own); a last push of hard pulse after hard pulse (167 to 186 s); the pulse thinning and stopping; held tones dying to
  nothing by 219 s, with one last flutter at 208.6 to 212.5 s.
- Measured against the other cues of the score (First Encounter, Non-Zero-Sum Game, Xenolinguistics, Hydraulic Lift,
  Kangaru, Arrival), it is the only one with a steady pulse; First Encounter has the biggest hits but is drone between
  them. One cue, whole, from its first sample.

**The audio.** Fetched once from the label's upload (the Universal Music Group topic channel, `KzaqrQuwr1k`) with a
current yt-dlp, and re-encoded to mp3 with no edit and no gain change: every onset is the recording's own. The show
also plays that same upload through the YouTube cue, on the same clock.

**Its clock.** `scripts/shows/heptapod-b-onsets.py` measured the recording once into
`scripts/shows/plans/heptapod-b-onsets.json`:
- **The comb**, one period and phase fitted to the whole pulse.
- **Every pulse**, moved onto its own attack where one is within 35 ms (720 of the 798 have one), with how hard it is
  sung against the 30 s round it and against the whole cue.
- **Every free onset**, with its strength: the murmurs and the coda have only these.
- **Loudness** every quarter second.

## How it cuts

`logogram/show.ts` is a multiverse show on Merry-Go-Round's kit: the path is cut into legs, one place a leg. At a
cut the ball moves into the next place's cells and the camera moves by exactly the same amount at the same instant,
so on the screen she holds still while everything round her becomes somewhere else: a match cut on Louise.
`seams.ts` says her velocity, the camera's distance and where Ian and Hannah are at every seam, so the parts on either
side agree without seeing each other.

- **Two white-outs** (`score.ts`, the veils): the lake house window's glare swelling into the cloud over the valley on
  the first great pulse (8.911 s), and the glass's light swelling on the cue's loudest moment (130.409 s). The place
  changes inside the white.
- **The shaft's roll.** Only there does the camera turn: a quarter turn in the shaft's mouth, so the shaft looks as it
  did from outside (a tunnel going up), and back to square as gravity turns (`rollAt`): the camera follows gravity
  round as a heavy body on a damped spring would, lagging it, carried about three degrees past square as her first
  bounce lands, and settling as the bounces die. At the cut into the mouth the carried framing is turned into the new
  roll, so her place on the screen holds.
- **The visions** are hard cuts on hard pulses (139.476, 156.177, 163.126 s), the film's flashes.
- **The circle.** The cut into the last scene is a scale match cut that opens on the show's first frame exactly
  (`FIRST`), her place on the screen carried. The valley side has her where the first frame has her from the cut back
  in (192.238): the camera only pushes in on her, and settles on the last clear pulse.
- **Three punches** (`PUNCHES` in `score.ts`): the camera pushes in a little, at once, and eases back over seconds, on
  gravity's turn (70.513), the palm meeting her on the glass (119.658) and the great logogram closing (183.182).

## In order

Times are show seconds; pulse *k* is `pulse(k)`, and a strength in brackets is how hard it is sung (1 is loud).

| Time | Music | Place | What happens |
| ---: | --- | --- | --- |
| 0 | murmurs | the lake house | Dawn. The long window over the lake, fog on the water. Louise on the bench under it; Hannah across the room. On the first murmur that carries (1.573) Hannah sets off, springs (3.582), lands on the bench's end (3.831) and touches her mother on the click (4.098). They turn to the window (5.242, 5.486); the sun catches the water on the first pulse (6.763), and the glare grows to white. |
| 8.911 | the first great pulse (1.46) | the valley | Out of the white: the helicopter hanging in the cloud, Louise and Ian in its side window. It lurches off (9.741), pushes out of the cloud bank (11.099), and the camera goes with it over the ridge, never far enough back to see over it; it tops the crest on 16.283 (1.31) and the picture cuts to the great wide, the shell first seen whole: the valley under low cloud, the fog pouring over the ridges, and the shell hanging over the meadow, the helicopter a speck against it. Nose up (18.013), and down to the pad on 22.059. |
| 22.059 | the pulse whole | the base | The door hits its stop; out onto the helideck, Ian after her. Her machine: into a bucket whose rope is wound on the generator's flywheel, which thuds down and tips her out; the engine coughs and catches (28.021), puffing on every pulse, each puff as big as the pulse is hard; a plank tipped onto the switch; the mast's lamps come on one a pulse. **The first burst (36.368 → 37.808): the slot in the shell's belly opens in six steps**, seen from under the belly, each step a flash of its light spilling down on the camp, held open until the floods answer (38.534, 38.772, 39.735). Up the steps onto the lift's deck. |
| 43.758 | a hard pulse (1.16) | the lift | The scissor lift's engine catches; its seven stages open one after another from the bottom, each surging, stopping on its ram's end and latching on a pulse. Up into the band of fog under the belly (52.849), out of it on 54.509 (1.43), the fog it dragged up flung off; the look up at the belly's dome; the deck rising into the slot. |
| 65.985 | the third layer | the shaft | Inside: the deck in the shaft's mouth, the camera turned a quarter, the valley's daylight glowing up the throat. The deck knocks home (67.431); she presses the work light's switch (68.383) and it catches (68.621), its beam going up the shaft. **On the great burst (70.513) she leaps and gravity turns under her**: her path the throw in a turning gravity, onto the wall that becomes the floor, the camera turning after gravity like a heavy body, a few degrees past square and settling, the dust turning with gravity. Landings and damped bounces on the burst's hard pulses, Ian a pulse behind; the work light tips on its yoke and knocks its bracket (71.703). Then the long shaft to the light in stone, its length shown in one breath, low floating hops over its ribs (the first leaving on 73.120), and a threshold ridge at the opening that Ian hops after her, landing on 85.786. |
| 85.786 | a hard pulse (1.04) | the chamber | Out onto the chamber's floor in the dark. The glass, dark, wakes in two steps (87.226, 87.464): a great wall of white light. The walk to it; a shadow in the fog behind it, darkening on unseen footfalls (94.128, 96.044, 97.007). **Abbott comes out of the white on 97.239 (1.17)**, more than half the way at once, each limb set down on a hard pulse; **Costello on 101.303 (1.13)**. The grand wide: the glass, two giants, the two of them tiny at its foot. Abbott's limb reaches down, its tip opens into a palm (118.700), and **presses flat on the glass on 119.658 as she reaches it**. Costello's jet of ink (121.574), and the first logogram is written in the fog on the pulse (122.061, 123.257, 124.227) as the giants sink back into it, its two ends meeting on **126.131**, the last pulse before the swell: the whole logogram in the middle of the glass, larger than the palm by far, putting out its tendrils (127.321) through the swell to the white. |
| 130.409 | the loudest swell | the fog | White. Beyond the glass she rests in the cup of Abbott's palm; Costello's jet goes down and a ring blooms from its bottom both ways round; the palm closes and she drops onto the ring as it arrives (133.573), and it closes over her (136.499), putting out its tendrils a pulse at a time. |
| 139.476 | a hard pulse | the lake house | Summer on the grass by the shore: little Hannah running ahead, Louise after her; a leap, a skip, two skips more (141.380 → 141.868), still running when the cut takes her. |
| 142.582 | | the fog | Ring to ring, framed wide so each is seen whole, each written on a pulse just before she lands on it; a bead on the ink's own inner edge in the fog's low gravity, flung on at a whip; a ring written from its top down, its arms meeting under her. |
| 156.177 | a hard pulse (1.14) | the lake house | By the window, soft day: Hannah older, leaning on her; then she goes, off the bench and out of frame. |
| 160.015 | | the fog | A crescent carries her once round. |
| 163.126 | the hardest pulse after 8.911 (1.48) | the lake house | The window at dusk, the rain running on the panes, a drop landing on each hard pulse with a glint; Louise alone on the bench. |
| 166.243 | the push | the fog | **She writes.** Flung up out of the crescent, she comes to the top of her rise where the great ring begins under her (168.136), and the frame goes back to the whole of it, both pens in it, by 170.3. It turns; she is its pen at its bottom, and Costello's front limb the pen at its top; each writes half. She works it like a ball in a turning drum: the ink carries her up the rising wall to a hang, and the first hard pulse of each group flicks her off (170.051, 173.383, and the biggest ride, from 30° up the wall, on 179.368), so she swings back down through the rest, a blot pressed where she is on every one of the push's 21 hard pulses. **The halves meet on 183.182 (1.26)** with her still at the bottom, and the frame holds the whole of it to the cut while the tendrils fling out and the ring's turn slows to rest. |
| 185.330 | the pulse thins | the valley | The meadow after, wide, Ian waiting by the trucks. The shell rises into the cloud and goes; the cloud opens, the light comes down, the fog lifts. From the cut back in (192.238) one push in on her where the first frame has her; Ian comes to her across the meadow, and they touch (195.344) and stay together. |
| 196.783 | the last clear pulse | the lake house | The first frame again. The held tones die. On the last flutter Hannah sets off (208.631), skips, dashes, springs and lands in the prologue's rhythm, and touches her on **212.312 (3.7)**. On the touch the sun catches the water, as it did on the first pulse, and comes on through the fog; as the held tones die the camera draws back, slowly, to the whole window by 219.3, the two of them small in it, for the credits in the silence over the wall above it. |

## The company

- **Ian** rides beside her in the helicopter, waits at the deck's edge while the engine starts, follows her across the
  plank, stands on the lift's deck with her, lands a pulse behind her when gravity turns, hesitates when Abbott appears,
  and stays back from the glass, watching her go: he does not go through. At the end he comes to her across the meadow.
- **Hannah** is at the lake house only: across the room at the first frame, running on the grass, older and leaning on
  her, absent at the window in the rain, and across the room again at the end, coming to her on the last flutter.
- The check holds them to it: Ian never at the lake house nor beyond the glass, Hannah only at the lake house, neither
  ever jumping, each coming and going only out of shot or at a cut, never two of anyone.

## End credits

The last flutter has rung away, the held tones have died, and the camera has drawn back to the whole window (219.3 s).
From 219.6 s, in the silence, over the wall above it the credits come, a card at a time, set by the page from
`Performance.titles(t)` (a show's canvas sets no type): Directed by Claude Opus 5.5; With Louise Banks (the orange
ball), Ian Donnelly (the blue ball), Hannah (the little peach ball), Abbott and Costello (heptapods); Music, Jóhann
Jóhannsson, "Heptapod B", with Joan La Barbara, from the soundtrack (Deutsche Grammophon, 2016); After Arrival, a film
by Denis Villeneuve, from Ted Chiang's "Story of Your Life"; Drawn with p5.js. There is no title card. As the first
card comes the room goes to dusk, the window still lit. After the last card the room holds to the end, 251 s.

## What check:shows holds

`apps/rube/checks/logogram.ts`:
- the recording whole from zero, its credit, the label's upload, and the credits after it;
- the places in order, every seam and cut on a pulse or an onset, no portal;
- the ball never jumps in a place, and every cut is a match cut (screen continuity turned by the roll);
- every strike on a pulse (±30 ms) or a measured onset (±40 ms), and every part strikes;
- the slot's burst struck, gravity's turn and its hard pulses struck, three in four of the push's hard pulses struck;
- the camera cuts inside a place only on a strike and never whips; the roll square everywhere but the shaft's mouth,
  and there following gravity round (lagging it, under 160° a second, less than 5° past square);
- the first logogram closing on a pulse and whole in the frame from then until the white, over three and a half
  seconds;
- the two white-outs white at their cuts and nowhere else;
- the last scene opening on the first frame, and the valley side pushing in on her where the first frame has her,
  never sliding her to her mark;
- Hannah in the picture the whole of the first vision, running on the level, never near the bank;
- Louise in the frame under Zoom and findable (never under 5.5 px across) outside the great wides; never hidden long;
- Ian and Hannah where the story has them;
- no two balls ever passing into each other;
- in the lake house, no ball sinking into the floor or the bench, nor through the bench's corners;
- their eyes never snapping: beyond what the ball's own roll turns it, an eye turns no more than 0.15 rad in a
  120th of a second, at cuts, at seams between parts, and where a look takes it from the roll or hands it back;
- the end credits' words, and the onset file being this recording's.

## How it is built

- **The version file:** `apps/rube/src/shows/versions/heptapod-b/opus55.show.ts`. Everything with weight is behind
  `load()`.
- **The show:** `.../heptapod-b/logogram/`, on Merry-Go-Round's kit (after Liftoff's and All at Once's): `kit.ts` (the
  part contract: each part is handed a slot and builds its lane from timed waypoints, so its strikes land where the
  music is by construction), `show.ts` (the legs), `score.ts` (the order, the cuts, the veils, the camera's
  composition), `camera.ts` (authored keys through a monotone cubic), `music.ts`, `seams.ts`, `hits.ts`, `credits.ts`.
- **The canonical drawings** (`cast.ts`): the shell (a smooth dark upright oval with a flat keel and its slot), the
  heptapods (a trunk and seven heavy limbs, fogged, a palm of seven fingers), their ink (a ring that forms both ways
  round at once, thick and thin, with blots, tendrils and drops, and `logogramAt`, its geometry, which the fog rides
  the ball on), the jet of ink, and the lift's deck (one deck across the cut into the shell).
- **The parts**: `lake/` (the house and its five scenes), `valley/` (the set, the flight, the base, the lift, the
  departure), `shell/` (the shaft, the chamber), `fog/` (the set and four stretches).
- **How it was made:** a director (Claude Opus 5.5) measured the cue, wrote the kit, the seams, the canonical drawings
  and a stub for every part so the show ran end to end, then six builders (lake, valley, lift, shaft, chamber, fog)
  built the parts in parallel from one brief, and rounds of director's notes followed.

## Director's passes

What was watched (1 fps strips of the whole film, dense sheets round every cut, the probes for velocity jumps,
camera stop-starts and parked holds, a music audit of the cue's hard pulses) and what changed because of it:
- **The heptapods** read as spiders at first: their limbs are heavy now, trunks, with a lower shoulder and a fuller
  body; a long reach bows and whitens into the fog instead of standing as a pole.
- **Their ink** left a limb as a small dark comet: it is a jet now, a thin stream widening to a billowing head that
  lingers where the ring forms.
- **The shell's belly** had its slot as a box hanging off a round bottom: it has a shallow flat keel, the slot cut
  into the hull. It **goes** by rising into a cloud deck drawn in front of it and paling as a whole, never along a line.
- **The shaft** was a pale box with a hairline outline: it is stone now, as mass, lit only where light falls, with
  the rig as silhouettes against the daylight; its length is shown in one breath, not held for six seconds.
- **The walk to the glass** was one frame for nine seconds: the camera travels with them and Abbott's shadow deepens
  in the fog on his unseen footfalls.
- **The first logogram** closed while the camera pushed in on the palm: the frame holds the whole ring on the loudest
  swell, and the push happens under the veil.
- **The fog** was bare white between rings: Costello looms at depth, the written logograms hang pale in the air, and
  the camera leads her to the next ring.
- **The push** had her still at the bottom of the turning ring through the cue's most driving stretch: she works it
  now, carried up its wall and let go on the hard pulses.
- **The end** held one frame for twelve seconds and brought the credits over the bright window: the dawn comes on
  visibly, the push goes on to the touch, and the camera draws back to the whole window before the first card.
- **Two seams** were the director's mistakes, caught by builders: the roll carried at the wrong angle into the
  shaft's mouth, and the last cut's framing not scaled to `FIRST`.
- **Every hard pulse of the cue** (strength 1 or more) is struck: 214 strikes, none on a near-silent pulse (217 after
  the polish pass below).

## Polish pass

A second director's pass (Claude Opus 5.5, from a brief naming four worst beats), then a fresh critic's whole-film
notes, then scrub, fix the worst, re-scrub. What changed, by beat:

- **Gravity's turn** (70.513): the camera's roll was its own 1.45 s ease; now it follows gravity round as a heavy
  body on a damped spring, lagging the turn, carried about three degrees past square as her first bounce lands, and
  settling as the bounces die (`rollAt`).
- **The first logogram** (122 → 130.4): it was a small ring off to one side, crossed by limbs, closing 0.7 s before
  the white. It is larger (2.6 cells) and in the middle of the glass, sentence 1014 (no tendril standing up off it
  like a thread), written on the pulses, its two ends running into each other on the last pulse before the swell
  (126.131); the limbs the heptapods stand on sink back into the fog (`limbFog`) so the ink is the one dark thing;
  the frame comes to rest on it as it closes and pushes in slowly through the swell while it grows a tenth larger to
  the white; the floor goes white with the room.
- **The Hannah flashes**: the summer vision had little Hannah going over the brow and down the bank toward the water
  and out of the picture. The bank is off the picture now and it is a child at play: she runs ahead skipping on the
  pulses, still running when the cut takes her. The rain's drops glint as they land on the dusk vision's hard
  pulses.
- **The circle** (192.2 → 196.783): the valley side rushed to its mark, zooming and sliding her a quarter of the
  frame in the last 1.4 s. From the cut back in her place on the screen is the first frame's, and the camera only
  pushes in, settling on the last clear pulse.
- **The great logogram** (183.182): the camera dived in on her as soon as it closed, so it was whole for under a
  second. It holds on the whole ring to the cut, and the valley opens wide on the meadow.
- **The push** (166 → 183): she sat still for 14 s with Costello's pen out of the picture. Both pens are framed from
  170.3; her rides up the wall are three, each flicked off on a hard pulse into a pendulum swing; her blots are pressed
  in visibly on every hard pulse; Abbott's far answer and the fading crescent are gone from the picture.
- **The shell's first sight** (16.283): it slid in cropped from the edge during a long pull; now the picture cuts to
  it whole on the crest's pulse.
- **The slot's burst** (36.368 → 38.534): the wide under the belly holds the slot open until the floods answer, each
  step flashing, the helicopter out of the picture.
- **The heptapods' entrances** (97.239, 101.303) come out of the white on the pulse, not over half a second.
- **The glass** sits dark until it wakes, not a grey slab down the shaft.
- **Fog2's rings** are framed wide enough to be seen whole; Costello stands further back in the white there.
- **The meadow**: the truck that stood cut in half by the frame's edge through the reunion is gone.
- **The coda**: a six-second draw back as the held tones die, and the credits in the silence after (219.6; the show
  is 251 s).

## Polish rounds

Forty-odd further rounds by the director (Claude Opus 5.5), each a different way of looking. The picture: the whole
film at a frame a second and at the half, quarter and three-quarter between; dense sheets either side of every cut;
full-size and 4K frames; the live stage in tall and ultrawide windows, Zoom, Overview and a phone; the share card; a
saved video's painted credits (1080p and Shorts). The motion: a 15 fps pass for anything popping, jumping or held
dead, and the cue's strongest pulses and every strike held against what the picture does on them. Fresh critics who
had never seen the film, on whole-film sheets and then four frames a second of each sequence. The acting: where every
eye looks at every still moment. Sweeps at 120 fps for eyes that snap, balls that pass into each other or into the
room's floor and bench (now held by `check:shows`). Render cost, the full build, and regression gates between. What
changed, in the order of the film, and then what runs through it:

- **Hannah's drawing** (0, 196.8 → 251): low on the wall over her corner, at her height, a child's drawing is taped:
  the two of them by the water under a crayon sun, in pencil, holding hands, each with a dot for an eye, looking at
  each other (nothing but Louise is her colour, not even a drawing of her). It is paper, edged in pencil-grey, not
  framed in ink. It is in the first frame and the last, and in the visions at the window.
- **Hannah's spring onto the bench** (3.7, 211.9): a sweep for balls sinking into the room's floor and bench found
  her passing through the slab's corner as she came up onto it, in the prologue and on the coda's strongest note:
  gravity's arc alone, in so short a hop, was still rising as she landed. Her spring rises over the end now and comes
  down onto it, on the same pulses.
- **The far camp** (24 → 62, 194): the tents and trucks up the valley were hazed as if far off but stand in front of
  the near hills, so they were paler than the land behind them, pale boxes floating on the hill. They are hazed a
  little less than that hill now, and their roofs catch only a hint of the sky: a camp in the fog.
- **The lift's start** (43.758): she comes to rest on the deck and the engine catches under her, but nothing showed
  her arrival as the cause, and the camp machine seemed to end before the lift began. The power unit now has the
  generator's run lamp, dark until that pulse and lit on it: the same signal the machine's first engine gave at
  28.021.
- **Out of the fog** (54.509, among the cue's strongest pulses): the fog the deck drags up was meant to tear off it on
  the pulse, but it was fog colour on a sky as pale as it, gone in a tenth of a second: the deck only cleared. Torn
  off, it now has a shadowed underside against the sky, and spreads off the deck and thins over half a second.
- **The chamber** (85.8 → 112): its far wall ended on a hard cut to black in the grand wide; it darkens into its
  corner. At the shaft's end its lit, ribbed floor stopped on a cut against the chamber's dark floor; its light dies
  away instead.
- **Reflections in the chamber floor** (87.2 → 130.4): the two of them stood on the polished floor with nothing under
  them, and a shadow would not show on it. Each now has a faint reflection in it, lit by the glass behind them,
  fading into the floor's dark, gone in the white.
- **The glass asleep** (to 87.226): it waited at the end of the shaft as a mid-grey slab. It is all but the dark of
  the room now, a pane only just told from the wall, so its two steps wake it out of the dark.
- **The palm** (118.700 → 133.573): its seven fingers were straight wedges to sharp points, a star or an asterisk
  more than a hand, on the show's most looked-at image. Each finger now has a full root, a long taper with a little
  curl of its own, and a soft round pad at its tip where it presses on the glass.
- **Ian at the glass** (126 → 130.4): he backed off out of shot while the first logogram was written and stayed out,
  so she went into the white with no one there, and the reunion on the meadow had nothing to answer. A fresh
  critic's notes caught it. Once the ring has closed he comes forward again, a step behind her at the edge of the
  light, and is in the picture as the glass goes white. He still never goes to the glass.
- **The white-out from the glass** (130.4): the chamber's floor was whitened less than the air over it and stood as a
  flat grey slab under a white room. It takes the light as a reflection now, one white with the glass at its edge. On
  a phone, whose stage is near square and sees far more floor, the reflection reaches the bottom of what it sees.
- **The first vision in a wide window** (141): the live stage sees more world round its 16:9 there, and the lawn
  showed the bank falling to the water at its right edge. The brow is further along the shore.
- **The ring behind her** (143 → 156): ring to ring, the one she had just left stayed the darkest, largest mass in
  the frame as she went on to the next, pulling the eye back (a fresh critic's note). Once she has left a ring and it
  has closed (its close a strike), it now draws back a little into the fog, its ink to about half, so the ring she is
  going to leads. And in the two long flights the frame is anchored a little to where she will land, so she is seen
  to travel across it toward the next ring instead of holding one place against the fog.
- **No stalk on her** (156): at the top of the ring written round her, one of its tendrils grew straight out of the
  ball, a stalk with a drop on it like an antenna. No tendril now grows where she sits on a ring: one near her draws
  back as she comes.
- **The second vision's loss** (156.177 → 160.015): Hannah leaves level along the bench, so Louise's gaze barely
  moved as she went, and at the end still looked out across the floor: nothing in the picture took the loss. She
  watches her to the bench's end now, and once Hannah is out of the room her eye goes down, bowed, held into the cut.
- **The push** (160 → 185): Costello's feet stood just above the frame, so the ends of its other limbs showed as grey
  tabs along the top edge. It stands higher; only its pen comes into the picture. In the close frames its pen ended
  in a square cut: every limb's tip is round now.
- **The crescent under the push** (170.3 → 176.7): meant to hang under the great ring as it begins and then go into
  the white, it lingered dark through the wide frame on the great ring, cut by the frame's bottom edge just under her,
  and only faded after 173. A second fresh critic caught it. It now goes into the white by 170.3, before that frame.
- **The halves meeting** (183.182, the climax): the two halves' round ends ran together well before the close, so
  from about 181.8 the great ring read as closed, and on the pulse only two hairline seams went. A fresh critic,
  shown the push at four frames a second, caught it. Each half's tail is held a little short of the other's pen while
  it is written, and on the close the tails run into the gaps: the halves are seen to meet on the pulse.
- **The light after the shell** (186.3 → 196.8): where the cloud opens the shafts of light were the floods' pale
  cream, so the reunion sat in a grey-olive wash (a fresh critic's note). They are sunlight now, warmed toward the
  camp lamps' gold and a little stronger: the first warmth the valley has, and the two of them meet in it.
- **The ink's soft edge** (118 → 185, every logogram): its haze was two flat grey copies of the ring, each wider and
  fainter, so round the film's central image stood stepped outlines like a vector offset, not ink in water; and each
  tendril was laid over the ring, so where it left it the ink was doubly dark. The ring and its tendrils are filled
  as one body now, and the haze is a true blur round the whole of it. Real playback still holds 60 fps through the fog.
  The jet that carries the ink to where a ring forms ended in a cluster of flat see-through discs, darker where they
  overlapped; its billow is soft puffs now, one cloud.
- **Her half of the great ring** (168 → 183.2): the blot pressed on each hard pulse was narrow, so her half's edge
  was a row of notches, a serrated spine next to Costello's clean arc (a fresh critic read it as a lizard). The
  blots are wider and a little shallower now, so they run together into a brushstroke that swells under her pulses.
- **The shaft's lit lips** (66 → 85.8): the glow along the floor's and the ribs' edges fell off into the stone in six
  steps; it falls off smoothly now, and the light on each rib across the far wall is a soft ridge, not three stacked
  bars. The shell's vapour as it goes is soft puffs too, not flat discs.
- **The sun's path in the floor** (212.3 → 251): the water far off is drawn with its own parallax, but the floor's
  reflection of the sun's path on it was placed in the room, so as the camera drew back the streak on the boards
  slid away from the glint it reflects (left of it in the held last frame, right of it at 214). It lies straight
  under the glint now, wherever the camera is. The window's glare as the sun comes through (7.3 → 8.9, and faintly
  at the end) is centred on the sun where the view shows it too, not on its place in the room.
- **The shadow under the bench** (the first frame and the last, and every scene at the window): a dark box under the
  slab with square ends, on the glass's foot and again in the floor's reflection. Its ends fade out within the
  slab's length now.
- **The engine catching** (27.55 → 28.5): each cough and the catch was one ball of smoke that left the stack at once
  and floated off on its own, like a smudge on the lens, and the running engine's puffs were too faint to see. Each
  is a short burst out of the stack's mouth now, rising steadily as it drifts back, and the running puffs show.
- **The heptapods as one creature** (89 → 156): each part was drawn a little see-through and each limb's soft edge
  lay over whatever had been drawn before it, so limbs showed through the body and each other, pale rims crossed
  them, and the front limb's round root sat on the body like a disc stuck to it. Every soft edge goes under now,
  every part is solid, and the body covers all the limbs' roots: the front limb comes out from under its hip. The
  palm is solid too, so the limb's end and the fingers' pads no longer show through it.
  Their soft edge was still a fainter, wider copy of each limb and of the body, which stood as outlines round them;
  it is one true blur round the whole silhouette now, drawn as a shadow alone so a heptapod deep in the fog is no
  darker for it.
- **The valley's beams** (36 → 65, 186.3 → 196.8): the floods, the slot's fall of light and the sunlight through the
  opened cloud were each a hard-edged wedge with a fainter one round it. In the wides that passed, but pushed in on
  the lift's start and on the reunion each beam was a quarter of the frame across and showed as panes of tinted
  glass, a cold stripe between two of them. They are soft across now, dense along the middle and nothing at the edge,
  from one sprite each set onto the beam; the sunlight's foot still lies level on the meadow. The sunlight's shafts
  are drawn with gradients straight onto the picture instead: pushed in on the reunion each spans most of the frame,
  and the stretched sprite's texels showed there as hairline stripes of colour over the whole background.
  The floods' beams fade out at their ends now too (they were cut square where they meet the belly, a hard line on
  its dark), and the mast lamps' fans of light down over the camp are soft, not flat triangles.
  Under the slot the shell drew a spill of its own over the valley's soft fall: a pale trapezoid with straight sides,
  which stood out as the edges of a pane on the lift's close (54). It is a soft beam too now.
- **The lamp's beam in the shaft** (69 → 85.8): fourteen stacked cones, each ending in a hard edge, so in the dark
  the beam showed as a fan of stepped bands. It is one soft cone now, from the same kind of sprite as the valley's
  beams, still coming to a point at the lens.
- **The reunion** (195.344): Ian came to a stop a sliver from her, and as her lean to him eased back a gap opened
  between them, so the meadow ended on the two of them drifting apart. He meets her on the touch now and stays against
  her as she settles back to her mark (which the circle's first frame needs): they end it together. They are grounded
  on the grass by soft contact shadows, as the lake house grounds its balls, deeper as the light comes. His braking is
  short and steady, so the gap is still seen closing into the touch, not shut to the eye half a second early.
- **The touch at the end** (212.312, the coda's loudest note): the sun came through the fog after it over seconds, a
  soft fade on the strongest note there is. Now the sun catches the water on the touch itself, quick as it caught it
  on the prologue's first pulse, and goes on coming through after: the circle closes on the same light it opened on.
- **The room for the credits** (219.6 → 251): the ceiling stood just over the window, so the coda's wide was a third
  dark ceiling, and the cast list straddled its soft edge. The room is tall now, the ceiling high over the glass on a
  clean line, and the cards sit on quiet wall. Cream type on that pale wall was faint in its fine print, so as the
  credits begin the room goes to dusk over seven seconds and stays there to the end, while the window keeps its light:
  the words read, and the last of the day is out on the water. With the dusk doing the work, the soft shade under the
  words is back to the faint one it was: stronger, it stood on the wall as a dark stain in a saved frame, which has no
  words over it.
- **The last frame** (251): Hannah's span ended at the show's end exclusively, so the frame the player holds there
  had Louise alone on the bench. Hannah stays.
- **Where they look**: in the chamber (97.5 → 130.4) her dot was only a roll mark, so as Abbott came out of the white,
  through the grand wide, on the touch and all through the first logogram it pointed wherever her roll left it, mostly
  at the floor. Wherever she is at rest she now looks: up at Abbott as he comes, up at the giants through the wide and
  down the limb as it comes to her, up at the palm on the touch, and over to the ring being written, into the white.
  On her rolls her eye rolls with her. Beyond the glass the same: in the cup of Abbott's palm she looks up at it until
  it lets her go, and on the great ring's close (183.182) she looks up through it to where the two halves meet over
  her, hers and Costello's, held to the cut; before, she looked down into the ink. Ian too, in the chamber, wherever
  he is stopped: up at Abbott as he hesitates, up at the giants through the wide, and on her as she goes into the
  white. In the valley: both up at the slot as it opens over them (36.4) and through the floods' answer; riding the
  lift, up at the belly they rise to, through the fog and the look up at its dome; in the shaft's mouth, once she has
  pressed the switch, both up the shaft the way the beam goes, until they leap; on the meadow she looks up to where
  the shell went, then at Ian as he comes, and from the touch at him and a little up, as her eye stands when the lake
  house opens on the first frame; he, at her side, at her. (The show hands each rider her roll as the stage would draw
  it, so the eye turns from where it is; elsewhere every frame is unchanged.)
- **The heptapods** had a flat cut across the crown of the body, clipped acorns in every wide, and another across the
  hip, a hard trapezoid where the limbs leave it as Abbott comes out of the white. The crown is domed and the hip
  rounded, and the highest of the body is the most fogged, so the head goes up into the white.
- **A heptapod deepest in the fog** went by paling toward the fog's white, which is whiter than the fog field in its
  greyer places, so as Abbott came up in the push (170) its far limbs stood out as white ghost legs. Past a point it
  goes by fading now, and comes out of the fog darker than it, a shape in fog.
- **No two balls pass into each other**: a 120 fps sweep found two: Louise hopping out of the helicopter's door
  through Ian on her right (23.6; her hop is shorter now, so she is high as she passes him), and Ian, a pulse behind
  her over the shaft's third rib, rolling into her before her hop (83.0; he hops it a pulse later). `check:shows`
  holds it from now on.
- **No eye ever snaps**: a 120 fps scan of every eye found five snaps of up to 2.8 rad, where a look or the carry
  across a cut turned "the short way" toward its target and flipped as the rolling eye passed its far side (97.7,
  139.7, 142.8, 166.4, 183.07), and a seam inside the shell (85.79) where the shaft's eyes handed to the chamber's.
  The way round is now chosen once, as a look or a carry begins, and held; the carry also crosses seams between
  parts, Ian's too. `check:shows` holds it from now on.
- **Her eye across the cuts**: every cut is a match cut on her, her place on the screen carried, but her eye (her
  roll, counted from each place's own origin) jumped at the vision cuts and out of the push, as much as half a turn.
  For a moment after a cut it now turns from where the last place left it to where this one has it. (Not at the
  shaft's mouth, where the camera's roll is carried and the eye already holds.)

## Arrival nods

Visual and mechanical only; no stills, no text, no audio beyond the cue.
- The film's structure: it opens on the lake house and Hannah, which we take for the past, and ends there.
- The shell hanging over the meadow in the Montana fog; the helicopter's first sight of it; the slot opening in its
  belly; the scissor lift up into it.
- Gravity turning in the shaft, and the camera turning with it.
- The chamber's wall of white; the heptapods coming out of the fog; a palm of seven fingers on the glass; their ink
  blooming into a ring, written both ways round at once.
- The flashes of Hannah in the middle of the language; the window in the rain.
- The shells going; Ian; and knowing the whole of it, the choice.

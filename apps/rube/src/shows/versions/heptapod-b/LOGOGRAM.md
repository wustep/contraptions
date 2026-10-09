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
| 185.330 | the pulse thins | the valley | The meadow after, wide, Ian waiting by the trucks. The shell rises into the cloud and goes; the cloud opens, the light comes down, the fog lifts. From the cut back in (192.238) one push in on her where the first frame has her; Ian comes to her across the meadow, and they touch (195.344). |
| 196.783 | the last clear pulse | the lake house | The first frame again. The held tones die. On the last flutter Hannah sets off (208.631), skips, dashes, springs and lands in the prologue's rhythm, and touches her on **212.312 (3.7)**. The sun comes through the fog on the water; as the held tones die the camera draws back, slowly, to the whole window by 219.3, the two of them small in it, for the credits in the silence over the wall above it. |

## The company

- **Ian** rides beside her in the helicopter, waits at the deck's edge while the engine starts, follows her across the
  plank, stands on the lift's deck with her, lands a pulse behind her when gravity turns, hesitates when Abbott appears,
  and stays back from the glass: he does not go through. At the end he comes to her across the meadow.
- **Hannah** is at the lake house only: across the room at the first frame, running on the grass, older and leaning on
  her, absent at the window in the rain, and across the room again at the end, coming to her on the last flutter.
- The check holds them to it: Ian never at the lake house nor beyond the glass, Hannah only at the lake house, neither
  ever jumping, each coming and going only out of shot or at a cut, never two of anyone.

## End credits

The last flutter has rung away, the held tones have died, and the camera has drawn back to the whole window (219.3 s). From 219.6 s, in the silence, over the wall above it the credits come, a card at a time, set by the page from
`Performance.titles(t)` (a show's canvas sets no type): Directed by Claude Opus 5.5; With Louise Banks (the orange
ball), Ian Donnelly (the blue ball), Hannah (the little peach ball), Abbott and Costello (heptapods); Music, Jóhann
Jóhannsson, "Heptapod B", with Joan La Barbara, from the soundtrack (Deutsche Grammophon, 2016); After Arrival, a film
by Denis Villeneuve, from Ted Chiang's "Story of Your Life"; Drawn with p5.js. There is no title card. As the first card comes the room goes to dusk, the window still lit. After the last
card the room holds to the end, 251 s.

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

A third director's pass (Claude Opus 5.5): the whole film at a frame a second, dense sheets either side of every
cut, and close looks at whatever caught the eye. What changed:

- **The last frame** (251): Hannah's span ended at the show's end exclusively, so the frame the player holds there
  had Louise alone on the bench. Hannah stays.
- **The white-out from the glass** (130.4): the chamber's floor was whitened less than the air over it and stood as a
  flat grey slab under a white room. It takes the light as a reflection now, one white with the glass at its edge.
- **The push** (160 → 185): Costello's feet stood just above the frame, so the ends of its other limbs showed as grey
  tabs along the top edge. It stands higher; only its pen comes into the picture. In the close frames its pen ended
  in a square cut: every limb's tip is round now.
- **The heptapods** had a flat cut across the crown of the body, clipped acorns in every wide, and another across the
  hip, a hard trapezoid where the limbs leave it as Abbott comes out of the white. The crown is domed and the hip
  rounded, and the highest of the body is the most fogged, so the head goes up into the white.
- **A heptapod deepest in the fog** went by paling toward the fog's white, which is whiter than the fog field in its
  greyer places, so as Abbott came up in the push (170) its far limbs stood out as white ghost legs. Past a point it
  goes by fading now, and comes out of the fog darker than it, a shape in fog.
- **The palm** (118.700 → 133.573): its seven fingers were straight wedges to sharp points, a star or an asterisk
  more than a hand, on the show's most looked-at image. Each finger now has a full root, a long taper with a little
  curl of its own, and a soft round pad at its tip where it presses on the glass.
- **The chamber**: its far wall ended on a hard cut to black in the grand wide; it darkens into its corner. At the
  shaft's end its lit, ribbed floor stopped on a cut against the chamber's dark floor; its light dies away instead.
- **The far camp** (24 → 62, 194): the tents and trucks up the valley were hazed as if far off but stand in front of
  the near hills, so they were paler than the land behind them, pale boxes floating on the hill. They are hazed a
  little less than that hill now, and their roofs catch only a hint of the sky: a camp in the fog.
- **The glass asleep** (to 87.226): it waited at the end of the shaft as a mid-grey slab. It is all but the dark of the
  room now, a pane only just told from the wall, so its two steps wake it out of the dark.
- **The first vision in a wide window**: the live stage sees more world round its 16:9 there, and the lawn showed the
  bank falling to the water at its right edge. The brow is further along the shore.
- **The room for the credits**: the ceiling stood just over the window, so the coda's wide was a third dark ceiling,
  and the cast list straddled its soft edge. The room is tall now, the ceiling high over the glass on a clean line,
  and the cards sit on quiet wall. Cream type on that pale wall was faint in its
  fine print, so as the credits begin the room goes to dusk over seven seconds and stays there to the end, while the
  window keeps its light: the words read, and the last of the day is out on the water. With the dusk doing the work, the soft
  shade under the words is back to the faint one it was: stronger, it stood on the wall as a dark stain in a saved frame,
  which has no words over it.
- **Hannah's drawing**: low on the wall over her corner, at her height, a child's drawing is taped: the two of them
  by the water under a crayon sun, in pencil, holding hands, each with a dot for an eye, looking at each other
  (nothing but Louise is her colour, not even a drawing of her). It is paper, edged in pencil-grey, not framed in ink. It is in
  the first frame and the last, and in the visions at the window.

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

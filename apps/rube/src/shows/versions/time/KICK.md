# Kick

The recording is copyrighted. This take is a private tech demo only; do not ship this audio in a public build.
Nothing here claims any right to it.

The music is Hans Zimmer's *Time*, the last cue of *Inception* (Christopher Nolan, 2010), from the soundtrack album. The
show is after *Inception*. The attribution is in `apps/rube/src/shows/versions/time/ATTRIBUTION.txt`.

Open it at `/shows/time/opus55/` (or `/shows/?show=time&take=opus55`). In the Shows picker it is the work **Kick**, on
the Movies shelf, whose one take is **Opus 5.5**.

## What it is

A Rube Goldberg machine plays the cue from its first sample, 4:35, and the end credits run on in the dark after it:
5:09 in all. It tells the whole film in its order: limbo's shore, where the film opens at its end; the architect's
lesson in Paris; the plane and the job; the four levels of the dream, down and back up; the waking; home; the top.

- **Dom Cobb** is the orange ball (`#E4863B`), the one warm thing in a cool dream. He is the thread: every machine is his
  to go through, and nothing else in the show is his colour.
- **Mal**, his wife, is the wine ball (`#8E2C49`): in every dream he goes down into and never in waking life; the one who
  breaks the machines (the freight train in the rain, the shot in the snow); in limbo, his counterweight.
- **Ariadne**, the architect, is the teal ball (`#358C86`): she folds Paris for him, and goes down every level with him,
  and back up.
- **Robert Fischer**, the mark, is the pale ball (`#AEB9C9`): taken down through the levels to his father's vault.
- **James and Phillipa**, his children, are two small balls: in his memory only ever seen from behind, dark against the
  light; at home, at the end, they turn round, in their own colours.
- Everyone else (the team, the passengers, the projections, the guards, the officer, Fischer's father) is a
  silhouette. The team's work is their machines: Yusuf's van, Arthur's lift, Eames's charges and paddles.

The worlds:

1. **The dream**, one world stacked four levels deep (`kick/stack.ts`), deeper lower, with the dark of sleep between
   them: **the rain** (Yusuf's: a city, a bridge, a river), **the hotel** (Arthur's), **the snow** (Eames's: a mountain
   and its fortress) and **limbo** (a grey sea, a shore, the tower they built, their city crumbling into the water).
   The show opens on limbo's shore.
2. **Paris**, the architect's lesson, a dream of its own.
3. **The plane**, Sydney to Los Angeles, and the arrivals hall at LAX: waking life.
4. **Home**, Los Angeles, a bright morning: waking life.

## The cue

**Why Time.** It is the film's own last cue, over the waking on the plane, the arrival, home and the top; and its shape
is the whole film's.

- **A click**: one tempo, 63.01 beats a minute, beat *k* at 0.4145 + 0.95226·*k* s, from the first chord (beat 0) to the
  last (beat 288), strong beats within 6 ms (median) of the one comb. One chord a bar, A minor, E minor, G, D, round and
  round: *Time* is **one four-bar loop played eighteen times**, and a last chord.
- **Its arc**: nothing changes but how much is stacked on the loop, **a layer every two turns, on the turn's first
  downbeat**: the pad and the piano (0.414), the strings (30.860), horns and a low pulse (61.342), the brass (91.824),
  the whole orchestra rising (122.294), the drums and the full brass (152.770), the summit (183.247), the loudest; then
  it rings away over 213.717, strings and piano falling, the piano alone (244.187), very soft, and a last chord
  (274.617).
- **Layers stacked on one loop are dream levels stacked on one another.** Each new layer of the orchestra is one level
  deeper (the brass, the rain into the hotel; the swell, into the snow; the peak, into limbo); the summit's four hardest
  downbeats are the four kicks, from the bottom up; the release, where the orchestra falls away, is waking on the
  plane; the piano is home; the last chord is the cut to black.
- Considered and refused: *Dream Is Collapsing* (2:23, the kick only), *Mombasa* (a chase, no arc), *Old Souls* (7:44,
  it wanders), *Waiting for a Train* (9:30, too long for a short), *Half Remembered Dream* (1:12).

**The audio.** Fetched once from the label's upload (WaterTower Music, "Hans Zimmer - Time (Official Audio)",
`c56t7upa8Bk`) with a current yt-dlp (the embedded player's client; the default was refused), the Opus stream
re-encoded to mp3 with no edit and no gain change (0 ms against the fetched stream): every onset is the recording's
own. The show also plays that same upload through the YouTube cue, on the same clock.

**Its clock.** `scripts/shows/time-onsets.py` measured the recording once into `scripts/shows/plans/time-onsets.json`:
- **The comb**, one period and phase fitted to the whole cue.
- **Every beat and every off-beat**, moved onto its own attack where one is within 30 ms (212 of the 289 beats have one),
  with how hard it is struck against the 32 beats round it and against the whole cue.
- **Every free onset**, with its strength, counted in five stretches (soft, build, peak, after, piano).
- **The turns, the sections** (a pair of turns each: pad, strings, pulse, brass, swell, peak, summit, after, piano, last)
  **and the landmarks** (the peak's crest, the release, the last chord).
- **Loudness** every quarter second.
- A frame's spectral flux peaks while an attack is still a little ahead of its middle, so every time is moved on by
  18 ms, onto where the waveform starts to rise.

## How it is cut

`kick/show.ts` is a multiverse show on Magnum's kit, with legs in four worlds. At a cut between worlds the ball moves
into the next world's cells and the camera moves by exactly the same amount at the same instant: a match cut on Cobb.

- **Between worlds, five cuts**, each on a downbeat that brings a layer in or out: into Paris on the strings (30.860);
  into the plane on the pulse (61.342, a jolt awake, Paris left upside down and the plane square); into the rain inside
  **a blink** (68.970, bar 18: the frame darkens as his eyes close and opens on the rain); into the plane on the release
  (213.717: he breaks the river's surface and wakes with a start); home through **a veil of morning** (244.187, the
  glare off the arrivals hall's glass).
- **Inside the dream there is no cut at all**: he goes down from level to level, and back up, on one path. Going under is
  a fall through the floor (the floor gone soft, `sink`); a kick is a fall that throws him up (`tear` where it throws
  him through a ceiling).
- **The great wide** (`score.ts`, `STACK_WIDES`): on the summit's first downbeat, limbo's kick (183.247), the camera cuts
  out to the whole dream at once, the four levels one under the other in the dark (the van hanging off the bridge over
  the frozen river; the lift in its shaft with Arthur's charges; the fortress on the mountain; the tower on the shore),
  the thrown ones a spark climbing through the dark; it eases in, and cuts back to the vault on the paddles (187.061).
- **The camera rolls twice**: 180° as Paris folds over (and is left upside down until the jolt), and once right round
  with the hotel's turning corridor, the room standing still on the screen while the building wheels round it.
- **The punches**: the plunge into limbo (152.770) and the four kicks, the river's the biggest.
- **The end** is a hard cut to black on the last chord (274.617), the top still wobbling.

## Time runs slower above

Twenty times slower a level (`stack.ts`, `clock`): every set animates on its own level's clock, so while he is in the
snow the rain hangs in the air over the river as streaks and beads, the hotel's sleepers hang still in its lift, and
the van hangs off the bridge's broken end with its headlight on, for the whole of the climax; when he comes back up
into the rain, the rain falls again and the van goes on down. The van (`vanAt`) flips over the deck while he is in the
hotel (the hotel's corridor turns once round with it), goes off the broken end on bar 28 (the hotel goes weightless),
hangs, and hits the river on the rain's kick.

## In order

Times are show seconds; bar *n* is `bar(n)`, beat *k* is `beat(k)`.

| Time | Music | World | What happens |
| ---: | --- | --- | --- |
| 0 | the pad | limbo | The surf at dusk on a pale shore, Cobb face down in the wash, a concrete tower rising over him. Waves on the first two chords carry him up the sand. |
| 7.556 → 15.628 | | | Into the tower's lift; a counterweight on a running block carries him up the core past the city of towers and the walled garden at its foot to their room at the top. |
| 19.436 | | | **The top**: he touches the table and it rights itself and spins, and does not slow. |
| 23.250 → 27.052 | | | The garden: two small dark shapes by the swing, their backs to us (his memory). |
| 27.052 → 30.860 | | | Back to the top, spinning; Mal comes down the ladder in the shadow behind him. |
| **30.860** | the strings | Paris | *Cut*: a café table in the sun, Ariadne across it; pigeons go up. |
| 34.668 | | | The café blows apart in slow motion and hangs in the air. |
| 38.482 → 46.586 | | | **The fold**: her weight on a lever lets a great gear pay out a strip of paving that curves up and pushes the far quai and the Bir-Hakeim bridge up and over, Haussmann fronts and all; they roll up the curve as the camera rolls 180°, and Paris hangs upside down overhead. |
| 49.912 → 55.154 | | | **The mirrors**: an endless corridor of him between two mirrors; she touches one and it shatters. |
| 57.528 → 61.342 | | | The projections stop and turn; Mal glides out of the crowd, strikes Ariadne up out of the dream, and turns to him. |
| **61.342** | the pulse | the plane | *Cut, a jolt*: first class at night, the silver case between his seat and Ariadne's, a drop in its chamber on every beat, a bead of light down every line. |
| 65.162 | | | He sinks his weight on the plunger; the drip quickens to the eighths; the lamp goes out on bar 18 as the blink comes down. |
| **68.970** | | the rain | *Through the blink*: under an awning in the rain. Fischer's taxi; he is knocked into the van. |
| 75.165 → 76.586 | | | **The freight train**: its headlight stabs up the street through the rain (Mal, still on the pavement, lit once by it), and a black wall of locomotive tears down the middle of the street, flings the waiting cars and smashes the taxi high over the van; everything near it shakes. |
| 80.388 → 88.010 | | | The van pulls away in front of the wagons and onto the bridge; the case opens. |
| 86.129 → **91.824** | the brass | down | *Close*: the three lie back in the van, the case's lines to their wrists; the bench goes soft under them (88.010) and they sink through it and the deck, fall into the river, through its bed and the dark of sleep. |
| 91.824 | | the hotel | Through the hotel's roof onto the top floor. |
| 95.632 → 103.254 | | | **The corridor turns** as the van flips: a drum of the corridor, end-on, that stands still on the screen while the building wheels round it; they run up its wall, across its ceiling and down. |
| 103.254 → 107.068 | | (the rain) | The van coming out of its flip over the deck, landing, rolling to the broken end. |
| **107.068** | | | It goes off the end: **weightless**. They drift down the corridor; a trolley's bottle knocked adrift; Arthur towing the sleepers on a line. |
| 118.498 → **122.294** | the swell | down | Drawn down through the suite's floor, the rooms under it and the lobby, into the dark. |
| 122.294 → 141.340 | | the snow | Out of the sky onto the shoulder under the summit in low cold sun; **the run**, the camera leading them down the face: over the cornice, the great air over the fortress roof (a held wide, bar 34), the hairpin, the air over the crevasse (bar 36), guards on snowmobiles behind them, to the fortress's gate. |
| 143.279 → **145.154** | | | *Cut to Mal* on the piste above in the rock's blue shadow, the rifle coming up; **the shot**; *cut back* (145.642): Fischer going down through the floor at the vault's door, Cobb in the air off the ledge. |
| 148.951 → **152.770** | the peak | down | They lie by the gate; the floor goes soft; into the dark after him. |
| 152.770 → 160.392 | the drums | limbo | They fall into limbo's sea as its city calves on the drums, tower after tower sliding into the water in white plumes; washed up on the shore **at the show's first frame** (the circle). |
| 163.719 → 168.009 | | | Up the tower in the lift, the city falling round it. |
| 168.009 | | | Their room: Mal at the table, the top still spinning; Fischer held. |
| 171.817 → **175.631** | | | **The choice**: Mal steps onto the lift's counterweight deck; the garden, the children's backs; he takes his lever and draws the bolt: she sinks away into the dark, gone, and the same rope lifts him to the roof. |
| 178.492 → 182.296 | | | On the roof Ariadne pushes Fischer off (his kick carries him up to the vault); she leaps; he steps off after her. |
| **183.247** | the summit | limbo → | **Limbo's kick**: thrown straight up. *The great wide*: the whole dream at once. |
| 185.151 → 188.965 | | the snow | Up through the fortress floor into the vault: the paddles on Fischer (187.061), the great round door rolls aside, **the pinwheel** turns in his father's last breath. |
| **190.869** | | → | **The snow's kick**: the fortress comes down and throws the three of them up. |
| 192.569 → 194.682 | | the hotel | Up the weightless shaft into the lift among the tied sleepers; Arthur's charges blow. |
| **198.485** | | → | **The hotel's kick**: the cabin slams into its pit and throws them up. |
| 199.585 → 202.304 | | the rain | Up through the riverbed and the river into the van hanging off the bridge; the rain falls again. |
| **206.107** | | | **The rain's kick**: the van into the river, the show's biggest splash. |
| 206.583 → 213.717 | the release | | Under: Ariadne and Fischer out through the burst door; Cobb last, drawn down in its wake, and up to **the surface** on 213.717. |
| **213.717** | | the plane | *Cut*: awake with a start. Morning: the lines reel home, the lid shuts; Fischer puts his own shade up into the sun. |
| 228.955 | | | The landing, the front-on wide, the wings flexing. |
| 231.840 → 244.187 | | | The jet bridge, the hall; **the stamp** on his passport on bar 63; out through the glass doors into the glare. |
| **244.187** | the piano | home | *Through the veil*: in at his own front door. |
| **247.990** | | | The loudest chord: **the top**, set spinning on the kitchen table as he touches it. He does not stay to watch. |
| 251.815 → 255.623 | | | The garden, the same as the memory's, the children dark against the sun; **they turn**, into their own colours. |
| 259.426 → 263.239 | | | They come to him. |
| 263.239 → 274.617 | | | The camera leaves them and goes back in to the top, alone, close, leaning and swinging as it slows. |
| **274.617** | the last chord | | **Cut to black**, the top still up. |
| 277 → 306 | | | The credits in the dark and the silence. |

## The company

- **Ariadne**: Paris (to her waking), the plane (both times), and every level of the dream, down and up. Never at home.
- **Fischer**: the plane, the rain (from his taxi), the hotel, the snow (to Mal's shot; he goes down first), limbo (on
  the tower's roof and in their room), the vault, and up. Never in Paris or at home.
- **Mal**: the prologue's shadow, Paris (out of the crowd), the rain (on the pavement as the train comes), the snow (on
  the piste, the shot), limbo (their room; the choice). Never in waking life; gone for good once he lets her go.
- **The children**: limbo's garden (from behind, dark) and home (turning).
- The check holds them to it: each only where the film has them, never jumping, coming and going only out of shot, at a
  cut, or across the dark of sleep at the crossings.

## End credits

The top is still turning when the picture cuts to black on the last chord; the chord rings away in the dark, and in the
silence after it the credits come, a card at a time, set by the page from `Performance.titles(t)` (a show's canvas sets
no type; a saved video has the same cards painted into its frame): Directed by Claude Opus 5.5; With Dom Cobb (the
orange ball), Mal (the wine ball), Ariadne (the teal ball), Robert Fischer (the pale ball), James and Phillipa (the two
small balls); Music, Hans Zimmer, "Time", from Inception (Music From the Motion Picture), 2010; After Inception, a film by
Christopher Nolan (2010); Drawn with p5.js. There is no title card. After the last card the dark holds to the end, 309 s.

## What check:shows holds

`apps/rube/checks/kick.ts`:
- the recording whole from zero, its credit, the label's upload, and the credits after it;
- the worlds in order; every cut between worlds on a downbeat, the layers' cuts on their turns; no portal;
- the ball never jumps in a world, the dream included, and every cut is a match cut;
- the dream: every crossing of the dark of sleep where and when the stack says (down on the brass, the swell and the
  peak; up after each kick), him always in his own level, every kick on the column and throwing him straight up;
- time: the rain's clock at its own pace while he is in it, twenty times slower from the hotel, all but stopped from the
  snow down; the van hanging off the bridge's end while he is deeper and in the river on the rain's kick; the hotel
  weightless while it falls;
- every strike on a beat or an off-beat (±30 ms) or a measured onset (±40 ms), and every part strikes;
- the cue's landmarks struck (every layer's downbeat, the four kicks, the release, the piano, the top, the last chord)
  and nine in ten of all 72 chords;
- the camera cuts inside a world only on a strike, never whips, never rolls faster than a turn in six seconds, and its
  biggest punch is the river's; the blink and the veil full at their cuts and only there; the cut to black on the last
  chord;
- Cobb in the frame under Zoom and findable outside a few declared shots (the fold's wide; limbo's garden cutaways and
  its great wide of the fall; the hotel's cutaway to the van; the snow's cut to Mal; the director's great wide of the
  stack; the top alone at the end); never hidden long;
- Ariadne, Fischer, Mal and the children where the story has them;
- the end credits' words, and the onset file being this recording's.

## How it is built

- **The version file:** `apps/rube/src/shows/versions/time/opus55.show.ts`. Everything with weight is behind `load()`.
- **The show:** `.../time/kick/`, on Magnum's kit (after Logogram's, Liftoff's, All at Once's and Merry-Go-Round's):
  `kit.ts` (the part contract: each part is handed a slot and builds its lane from timed waypoints, so its strikes land
  where the music is by construction), `show.ts` (the legs), `score.ts` (the order, the cuts, the blink and the veil,
  the punches, the roll's sum, the great wide), `camera.ts`, `music.ts`, `seams.ts`, `hits.ts`, `credits.ts` (and the
  black).
- **The stack** (`stack.ts`): the dream's bands, the dark of sleep between them (`sleep.ts` draws it), the crossings
  down and up, the kicks' column, each level's clock, the van, weightlessness and the corridor's turn: the fixed
  geometry and moments every dream builder built to.
- **The canonical drawings** (`cast.ts`): **the top** (`top`, with `dreamSpin`, which never slows, and `wakingSpin` and
  `topWobble`, which slow it and let it lean and swing), **going under** (`sink`), **the kick's tear** (`tear`), and
  light (`bloom`, `pool`, `beam`).
- **The parts:** `limbo/` (the prologue and the return), `paris/`, `plane/` (boarding and waking), `rain/` (the rain and
  the river), `hotel/` (the hotel and the lift), `snow/` (the snow and the vault), `home/`.
- **How it was made:** a director (Claude Opus 5.5) measured the cue, wrote the kit, the stack, the seams, the canonical
  drawings and a stub for every part so the show ran end to end, then seven builders (limbo, Paris, the plane, the
  rain, the hotel, the snow, home) built the parts in parallel from one brief, and rounds of director's notes followed.

## Director's passes

What was watched (contact sheets of every part at its strikes and between them, a whole-show sheet, the probes for
velocity jumps, camera stop-starts, zoom whips and parked holds, a music audit, frame rates in Chrome) and what changed
because of it:
- **The van** would have tumbled through the deck and "hung" still over it: it flips over the deck in the air and lands,
  goes off the broken end and hangs clearly in the air over the river, tilted, its headlight through the frozen rain.
- **The great wide**: the stack was never seen whole; the summit's first downbeat now cuts out to all four levels at
  once, and the thrown ones are a spark climbing the dark at that size.
- **The top at the end** was a small grey shape on a cream wall: the camera pushes in on it to the last chord, the
  sunlight on the table behind it, and it leans and swings clearly as it slows, still up.
- **Paris** folded haze: real Haussmann fronts now ride the leaf up and over and hang overhead, and after the mirrors the
  camera draws back so Paris hangs over the crowd as their sky.
- **Limbo's city** leaned faintly in the haze: three nearer towers fall into the sea on the drums in white plumes; and
  **the children**, specks in one wide, are given two garden cutaways (in the prologue and before he lets Mal go), laid
  out as home's garden is, so the end rhymes with the memory.
- **The hotel's drum** held the three of them as specks: framed closer; the cutaway to the van starts on bar 27 so its
  flip is seen.
- **The plane's hall** was pale on pale: it has depth and the morning city, and the stamp is seen to land on the page.
- **The train** was a small dark shape far off: it is a black wall bearing down the street behind its headlight, the
  impact big in the frame; **going under in the van**, invisible through its side at 5 cells, is a close-up of the
  bench going soft under the three of them.
- **The snow's run** held the three as specks on white: the camera leads them down the face, the two great airs are
  held wides; the mountain has low cold sun, blue shade, layered ranges; **Mal's shot** is a cut to her, close, on the
  piste above, and back.
- **Bar 18**, the one chord nobody struck, is the plane's lamp dying as the blink shuts.

## Polish rounds

A later pass (Opus 5.5) watched the whole show again, a frame every two seconds and then every half second through
each world, and changed:
- **The great wide** (183.2 to 187.1): at a hundred cells a ball is a pixel, and the glow at the crossing was gone in a
  quarter second, so the thrown ones could not be found for most of the shot. He is now a spark in his own colour all
  the way up, a pale streak of his climb behind him, from the tower's roof through the dark into the fortress
  (`sleep.ts`, `sparkInWides`).
- **Limbo's roof** (180 to 183): the push, her leap and his step were specks in a frame of the whole tower. Once
  Fischer is gone the camera comes in close on the two of them at the edge, and opens again as they fall to the kick.
- **Mal's rifle** in the cut to her (143.3 to 145.6) was three strokes. It is a sniper's rifle in silhouette now:
  butt, grip, magazine, scope on its mounts with a glint on its lens, the long barrel and its brake.
- **The snow's rock step** (130 to 132): its foot sat over the piste, so after the jump they ran across the face of
  the cliff. Its foot is a little up the slope now, a strip of snow between, and they run under it.
- **Home's table** (248): he came up to the table's end through the near chair. The chair stands pulled out from the
  table now, and he comes up beside it.
- **Home's terrace** (252 to 265) was a blank pale slab between the house and the lawn: it is laid stone.
- **The vault** (185 to 190.9): the snow fell inside the sealed vault and the footing under it. While the fortress
  stands, none falls in its ground floor; it falls again once the kick brings the building down.
- **Mal at the train** (75 to 76): the headlamp's catch on her was a thin rim, briefly. Its light now spills down off
  the wet street onto her for longer, a warm pool round her and a brighter rim.
- **The children in his memory** stood stock-still in limbo's garden while home's shift their weight at play. They
  play in the memory too, the same two movements on the same clock, so the gardens rhyme in motion as in layout.
- **The passport** (241): stamped, it went back to him open, on a straight line that left its pages hanging in the
  air over the booth's front. It shuts on the slope now, slides off its edge, and drops to him.
- **The cloud deck under the plane** (213.7 to 223): in a tall frame (a phone held upright, a Short) its body was one
  flat grey wash under the wings. It has deeper billows now, their tops lit, the lower ones in shade.
- **The reunion under Zoom** (255 to 265): Zoom tightens on the same point as the director's camera, and the garden's
  framings held the three of them so low that under Zoom they sat on the frame's foot, cut by it. Those framings sit a
  little lower on the lawn now: in Follow they are still in the lower third, and under Zoom they stand clear of the edge.
- **Overview in the dream** (68.9 to 213.7): Overview sees the whole stack the whole time, a hundred cells tall, where a
  ball is a pixel; he could be found only during the great wide. Whenever the frame is that far out on the dream he is
  now the same spark in his own colour, in whichever level he is.
- **The van going by Mal** (82.3 to 82.8): the van had no underside, only its body and wheels, so as it pulled away past
  her she showed through the gap between its sill and the road, a red ball between its wheels. It has a dark chassis
  and its shadow on the wet road now, the wheels over it, until the floor goes soft (bar 23), so the three are still
  seen to sink out through it.
- **Mal's shot landing** (145.15 to 146.8): on the cut back from her, Fischer was already half under the floor, and
  nothing said he had been hit. The shot strikes now: a white flash where he stands, a ring out across the floor and a
  spray of snow thrown up off it, still settling as the camera comes back to him (a fresh critic's note).
- **The reunion's hold** (259.4 to 262.5): come to him, the children sat still for three seconds before the embrace.
  They cannot keep still now: little hops on the beats, by turns, landing on the beat (a second critic's note).
- **The top at the last chord** (270.8 to 274.6): the push in goes on further, so the top stands a quarter of the
  frame's height at the cut to black, not a fifth.
- **The front door** (244.8): it swung so deep into the hall that its foot came to rest on his crown as he came in
  under it. It swings shallower now, its foot low behind him.
- **Mal out of the crowd** (57.5 to 61.3): her wine sank into the black of the projections, so she was seen only once
  she was clear of them. The light off the stone now catches her edge, a pale rim, and she is seen coming out of them
  (a third critic's note).
- **Going under in the snow** (150 to 152): the apron at the gate was snow all the way down, so as the floor went soft
  under Cobb and Ariadne they seemed to fall through white air beside the fortress. Under its snow cap the apron is now
  cut rock, darker as it goes down, and they are seen to sink into the mountain (a fourth critic's note).
- **The earth under the house** (244.8 to the end): in a tall frame (a phone held upright, a Short) the cut ground
  under the floor is near half the picture, and it was one flat brown, under the top's last shot too. It lies in
  soft bands now, darker going down, a few stones in it, and the footings go down under the walls in laid stone.
- **Off the rock step** (129.9 to 131.4): the band runs across the face toward us, so the jump flies in front of it, but
  nothing said so: each of them sat on its top edge and then seemed to sink down through the rock to its foot. Each
  throws a shadow on the band behind it now, a little east of them and lower, furthest off and softest at the top of
  the air, closing up on them as they come down, so they are seen to fly in front of the face.
- **The vault opens** (188.3 to 190.9): the bed and the pinwheel were lit in the same cold grey as the antechamber,
  so the son coming to his father's bed went by as a passing shot (a fifth critic's note). The lamp over the bed is
  warmer now, and as the door rolls aside its light spills out across the floor to the sill where Fischer stops, the
  first warm light he has stood in the whole dream, Cobb and Ariadne at its edge. It goes out with the kick.
- **Limbo's shore at the waterline** (0 to 7, 155 to 163): the seabed's skin, the sand's and the wet sand's sheen
  each stopped square at the water's edge, and the clear sea over them showed a box-shaped notch in the beach right
  where he washes up, the show's first frame. They cross-fade under the edge of the water now, and the beach runs
  down into the sea.
- **Ariadne's teal** is a little deeper (`#3E9E98` to `#358C86`): under red-green colour blindness she and Fischer
  were the closest pair of leads, told apart by lightness alone. The gap between them there is half as wide again
  now, and she is still the same teal, as findable in the café, on the plane at night and in the vault.
- **The lift in the lobby** (191.5 to 199.3): the lobby round the shaft, where the cabin with the sleepers rides down to
  the slam, was bare pale wall from pilaster to pilaster. The lift has its landing there now: a walnut surround either
  side of the shaft, a sconce each side, the call buttons, and over them a floor dial whose needle follows the cabin,
  on the top floor until the blast and swinging over to the lobby as it falls.
- **The ground under the runway** (223 to 244): in a tall frame (a phone held upright, a Short) the cut ground under
  the runway is near half the picture as the plane comes in, and it was two flat greys. The runway is laid in slabs
  now, their joints in it, on a bed of crushed stone, and under that the earth lies in soft bands, darker going down,
  a few stones in it, as under the house.
- **Down through the hotel's floors under Zoom** (117.5 to 121.8): the camera sat well below them as they fell, so they
  rode high in the frame; Zoom tightens on the same point, and under it he came through each slab on the frame's top
  edge, the three of them crowded under it all the way down. The camera now sits nearly on them, and under Zoom they
  fall through the middle of the picture.
- **Their skis across the face** (126.5 to 134.5): running left across the face, over the fortress's roof and down
  the hairpin, each of them wore their skis over their head, the tips curled back the way they had come. The skis
  were laid along the path's heading, and a heading to the left turned them over; they are laid along its line now
  (`skiLine`, as the jumps already were), under them, tips forward.
- **The hairpin's groove** (131.5 to 138.5): the groove the skis cut sat a ball's width off the path, on whichever
  side was down for its heading, so where the hairpin stands upright it jumped from one side to the other, a step in
  the turn. It lies straight down from the path now, the same arc a ball's width lower. And where one piste runs on
  into the next, their round ends overlapped in a darker blot; each kind is stroked as one path now.
- **The van's sliding door** (70.5 to 89): it opened from just behind the cab back over the rear wheel, so the open
  doorway was cut down through the wheel's arch and its edge sliced the tyre. The door is between the wheels now, as
  a van's is, and Ariadne's place on the bench is a little forward, so with the door shut all three sit in its window.
  They hop in from the pavement behind it, on the near side of it: until they land on the bench they are drawn in
  front of its body, so none of them goes behind its rear quarter mid-hop and is lost.
- **Across the face under Zoom** (127.5 to 133.5): running left over the fortress's roof and on to the hairpin, the
  camera led them by two cells, and Fischer, at the back, was a cell or two behind Cobb; Zoom tightens on the same
  point, and under it he rode off the right edge for four seconds. The camera leads them by half as much now, closer
  still after the rock step, and under Zoom all three stay in the picture, the hairpin still coming in ahead of them.
- **Fischer stirs, under Zoom** (219 to 221): the camera crosses the aisle to him as he wakes and lets the sun in, and
  it held a little too far over; Zoom tightens on the same point, and under it Ariadne was cut in half by the left
  edge for a second and a half. It holds a fifth of a cell less far over now, and under Zoom both rows are whole.
- **Overview in Paris** (30.9 to 61.3): Overview frames Paris whole, the city a strip across a great sky, and he was
  a speck in it (two pixels across in a wide frame, nothing at all in a tall one) for thirty seconds. Whenever he
  would be drawn five pixels across or less there, he is the same spark in his own colour the dream gives him
  (`sleep.ts`, `beacon`). The director's camera and Zoom are never out that far, and draw him as before.
- **Fischer's taxi** (69.2 to 72.7): it slowed to the kerb right behind Ariadne and Cobb, and later eased off it at
  about Cobb's pace, so both times two of them sat along its sill between its wheels for most of a second, a car with
  four wheels in a row (two critics' notes). It comes in later and quicker, past them in half a second, to the same
  stop on the same beat, and pulls out briskly, clear of them in a third of a second, to wait in the queue at the
  bridge for the train.
- **The cage up the shaft, under Zoom** (177 to 177.6): the camera held low on the flat as the cage rose, and under
  Zoom he went half out of the frame's top. It starts up with him sooner, and under Zoom he stays in the picture.
- **The far trees over home's wall, under Zoom** (251 to 265): their layer rides up with the camera, most under Zoom,
  and its body stopped just under its base, so a strip of sky showed between the trees and the wall's top. Its body
  runs down behind the wall now.
- **The ground of the home** (244 to the end, in a tall frame or seen whole): the house stood on cut earth, but the
  lawn and the terrace's stone on one side and the porch's stone on the other came on toward us all the way to the
  frame's foot, so in a phone-shaped frame the terrace was a pale pillar beside a green slab, and in Overview the
  porch a blank pale column (critics' notes). They end a little toward us now, cut on one line, and under the house,
  the porch and the garden is one earth: its bands and stones lie from one origin, in one shading, and the house's
  cut edge stops where theirs begins. A wide frame never sees that far down and is unchanged.
- **The sky over the terminal** (236 to 244, in a tall frame): the street beyond the landside glass had a sky of its
  own, from the frame's top down, and over the terminal's roof it met the morning's on a ruled vertical line, the
  morning's grey-green beside its warm (a critic's note). It and the glare at the end come in only from the roof's
  height down now, out of the morning's sky.
- **The wings' roots** (62 to 68, 213.7 to 236): seen head on, each wing began a little out from the hull's side, so
  sky showed between the body and the wing; started further in, its root lay over the cut ring and ended square (two
  critics' notes, close up and in a tall frame). Each wing now starts well inside the hull and is clipped to outside
  its outline: it goes in under the ring, as a wing behind a cut hull would.
- **The jet bridge's wheels** (231 to 238): docked, its leg stood right on the plane's outer main gear, the two sets of
  black wheels merged into one shape. Its leg is further back along it now, clear of the gear.
- **The picture in the hotel's corridor** (92 to 107): it hung right over a wall lamp, the lamp's shade showing under
  its frame (a critic's note). It hangs on the bare wall between that lamp and the next door now.
- **Limbo's garden on the beach** (0 to 30, 155 to 177): its lawn ran on 0.8 of a cell below the line the house and the
  tower stand on, fading out over the sand with square sides, a green patch pasted on the beach (a critic's note). It
  ends on that line now, a lip over the sand.
- **Thrown up out of a lit level** (59.05 Ariadne struck in Paris, 179.6 Fischer's kick off limbo's roof): nothing
  marked the blow, so each seemed to reverse and shoot off (a motion critic read both as teleports); Fischer's flare
  was lost on the pale sky. Each throw now flashes a ring where it lands and leaves a short streak in their colour
  behind them, gone in half a second (`cast.ts`, `streak`).
- **The hotel's skyline** (the dream stack, seen whole): its towers began a sixth of the way in from the frame's left,
  flat dark before them (a critic's note). They run on past both ends now; every tower that was there is unchanged.
- **The share card** (`public/shows/time/opus55.png`, the frame at 49.2): it was made before Ariadne's teal deepened,
  so a link to the show unfurled with her old colour. It is made again from the show as it is; nothing else in it moved.
- **Ariadne's goodbye** (234.6 to 235.2): when he dropped out of his seat and rolled away up the aisle, only her eyes
  went with him, and a viewer new to it saw him go home alone, "teal just gone" (a cold critic's note). On the next
  beat she rises off her seat toward him and stays up, leaning after him, until he is through the door, then settles
  back (a hop up and straight down was gone in half a second, and a second cold critic saw nothing there). The camera holds a
  little to her side of him until it is over, so under Zoom too she is in the picture for it.
- **His lever** (172.2 to 175.8): the lever that draws the bolt and lets Mal go was a short iron stroke on the cage's
  dark iron, so his choice had no gesture; a viewer new to it saw him simply stay with her, then be on the roof (a cold
  critic's note). It is longer now, its knob pale, catching the lamp; it is seen taken, and as it comes home on the
  let-go its knob flares where it strikes the stop. And the choice is his own gesture (a second cold critic saw him
  "sit still" while the lever moved by itself): as we come back from the children he rolls back from the door, from
  her; on the let-go he throws himself up against the lever, and lands at the door as the rope takes him.
- **The boulder in the hairpin** (131 to 138): a bare grey four-sided slab, flat-bottomed, no shade and no shadow,
  floating on the snow among pines that have both. It is a boulder now, lit on its west and in shade on its east, a
  little snow on its crown, bedded in a drift, its shadow long on the slope like theirs.
- **The hotel's beds, nightstands and desk** (92 to 122): with their pillows floated off, the beds in the suite and in
  the rooms below were cream slabs on brown boxes, the nightstands plain boxes, and the lobby's desk a flat brown block,
  beside a curtain with its folds and doors with their panels (two critics' notes). Every bed has a cover turned down
  from its foot, its fold catching the lamp, a rail in shade, legs and a shadow on the carpet (one `bed`, on both
  floors); every nightstand a top, a drawer and its pull; the desk a plinth, raised panels and its shadow on the marble.
- **Their window from outside** (whenever the room's front is closed, most plainly at the roof, 178 to 183): it was four
  blank lit panels in the concrete, beside the lift tower's siding and downpipe (a critic's note). The room shows
  through it in silhouette against the lamp, as it is inside: the lamp on its cord, the curtain at the window's end,
  the table; and the window sits deep in its frame, the reveal in shade, a transom bar, a sill standing out under it.
- **The crags under the ridge** (123 to 152, plainest in a tall frame): where the rock breaks through the snow, each
  crag ended on the face with a hard edge and read as a slab laid on it, as the hairpin's boulder did. Each throws a
  soft shadow on the face under its foot now, a little east of it. (A drift over its foot was tried first: on the
  shaded face it came out a hard white block, brighter than the snow round it.)
- **The terminal's ground floor** (236 to 244, plainest in a tall frame): near half the picture, it was a flat grey
  slab with two plain navy rectangles for doors, under a hall drawn in full (a critic's note). Its doors are glazed now
  in steel frames, a transom and their push bars, the morning on the glass, under a canopy each; the wall has its
  panels, the soffit's shade under the floor and a plinth along its foot.
- **The tower's empty floors** (0 to 30, 152 to 183, plainest in a tall frame): their windows were bare dark
  rectangles under a room drawn in full. They stay dark, the floors empty, but each has a sill, a glazing bar and the
  dusk sky caught in its top pane.
- **The guards fire on them** (131.8 to 139.5): the snowmobiles chased them down the face, and nothing they did
  touched them; to a viewer new to it the chase had "no threat that lands" (a cold critic's note). On alternate beats
  from the first jump to the ledge a rider's gun flashes (the same star of flame as Mal's, a pale glow was lost), and a tenth of a second on a spurt of snow kicks up on
  Fischer's track just ahead of him, a dark streak of the round flying in from the guard's side first (without it a
  second cold critic read the spurts as his own ski spray), so he rides into the spray (behind him, the last of the three, it fell off a
  tight frame): a dark pock and a spray in the snow's blue shade (white on white was lost). Never a hit: Mal's shot,
  four seconds later, is the one that lands.
- **The wreckage off the shore** (from the dive, 156.6 on): the return to limbo's beach is the show's first frame
  again, on purpose, and two viewers new to it read it as the opening replayed. Pieces of the city they built are
  afloat off the shore now, slabs of concrete with their window holes, tilted, riding the swell half under, so the
  circle comes back to the same place, further gone. The opening is unchanged.
- **Mal's shot at her end** (145.15 to 146.6): the flash was gone in a sixth of a second, pale on the pale snow, and
  its smoke white on white, so a viewer new to it saw her holding "something long, a rifle, ski poles or a radio".
  The flash holds a little longer, its first tenth of a second a crisp star of flame along the aim (gold, a white
  heart, a thin ink edge), and its smoke drifts off the muzzle in grey.
- **The rain street after the train** (75 to 86): the cars it flung came to rest on their roofs a little above the
  road, in the air (their crushed roofs not counted), and the train's, the taxi's and the van's headlamps were painted
  on down through the street into the ground under it, the train's lit patch on the asphalt ending square (a critic's
  note). The wrecks lie on the asphalt; the beams stop at the street's underside, and the patch fades out at both
  ends. Off the bridge, falling, the van's beam goes where it points.
- **The porch by the front door** (244 to 247): left of the door, the porch was one blank pale field, the hedge ending
  on a ruled line over it (a critic's note). It is laid stone like the garden's terrace, its courses widening toward
  us, and the hedge's shade lies on the stone at its foot.
- **The mirror's shards** (53.6 to 56): a bright one was blank white with a hairline edge, and against the pale
  facades the biggest read as a flat cut-out. A bright face is the sky in the glass now, and every shard has a firm
  edge.
- **The street's far side** (69 to 86): the street was a flat band with the building fronts down to its top line,
  but the traffic and the train run in the middle of it, set back from the near kerb, so the taxi, the waiting cars
  and the wrecks stood a little up the facades, in the air (a critic's note under Zoom). The street has its far side
  now, wet asphalt from a far kerb at the buildings' feet, and they stand on it.
- **The shop's light and awning** (68.9 to 76): its light ran into the street as a box the window's width, ending on
  hard vertical edges, and the awning's arms hung from it and stopped in the air (a critic's note under Zoom). The
  light is a soft pool fading on every side, and each arm ends in a bracket on the wall.
- **Ariadne and Fischer on the roof, under Zoom** (177.3 to 177.6): waiting on the roof as the cage brings him up,
  they were half cut by the frame's top. The camera starts up a little further, and from 177.5 they are whole.
- **The bridge's pier under the water** (89 to 92, 199 to 201, plainest in a tall frame): the bed is not drawn in the
  dark water, so the pier came down through the river and ended square in it, on its own capped foot (a critic's
  note). It goes down into the murk now, darkening, its foot lost in it.
- **The light on home's back wall** (245 to the end): a little of the morning's bounce high on the wall, over the
  table, was a box with hard top and side edges, a pale panel (a critic's note; at the last push-in it is half the
  frame). It is a soft glow now, fading on every side.
- **The engines' pylons** (62 to 68, 213.7 to 244): seen head on, each pylon ran up from its engine over the wing's
  face and on past its top edge where the wing rises, so at the gate the engine seemed to hang from the jet bridge's
  floor over it (a critic's note). The engine's top sits inside the wing's depth; its pylon is a stub inside it now,
  and the engine hangs from the wing.
- **Folded Paris's far bank, seen whole** (47 to 61): the far bank's front, past the bridge's end, was three floors
  over its shops; folded over and hung upside down at the city's far left, its mansard came down through the roofs of
  the street under it, the two drawn through each other (a critic's note in Overview). It is one floor over its shops
  now, and hangs clear of them, sky between.
- **The glass door onto the garden** (248 to 254): shut, its pane stopped a little short of the doorway's head, sky
  between; swinging open, its top rose over the cut wall above the doorway (a critic's note). Shut, it meets the head;
  swinging out, it goes behind the cut wall.
- **The vault door's rail** (186 to 191): the rail it rolls on ended a little above the floor, a dark bar floating in
  the antechamber. It stands on a sill down to the floor now.
- **The lamps' light in the wet road** (69 to 86): under each lamp its reflection was a strip with hard sides, a
  pasted-on panel. It is a narrow soft streak now, fading at its sides as well as down.
- **The van's underside** (69 to 88): the dark underside that hides Mal behind it was one flat box from bumper to
  bumper, down past the road, and read as a plinth the van stood on (a critic's note under Zoom). It is a soft
  shadow on the road the van's length now, the chassis in shade only between the wheels (still deep enough that she
  never shows under it), and the wheel wells dark.
- **The fortress's walkway** (123 to 151): the walkway out from the tower toward the mountain stood on one leg that
  stopped in the air, nothing under it (two critics' notes, in the tall frame). It is a cantilever into the mountain
  behind now, braced back to the tower under it by a strut.
- **Under the cloud deck** (222 to 225, plainest in a tall frame): coming down out of the deck, the air under the wings
  was one flat gold fill, half the picture, until the ground came up (two critics' notes). Loose wisps of lower cloud
  lie in it now, lit along their tops and cool beneath, rising past with the deck.
- **The garden door folded open** (251 to the end): it hung from the floor's back line, a third of a cell higher than its
  own doorway, so folded open against the house it stood taller than the doors beside it and rose past the wall
  (a critic's note in a tall frame). It hangs in the doorway's front plane now, the doorway's height.

## Inception nods

Visual and mechanical only; no stills, no text, no audio beyond the cue.
- Limbo's shore at the start, the film's opening, and the circle back to it; the tower they built, the city crumbling
  into the sea like glaciers.
- The top that spins and spins in a dream, and at the end wobbles, and the cut to black before it falls.
- Paris folding over itself; the café's slow explosion; the bridge of mirrors at Bir-Hakeim; the projections turning.
- The PASIV case, its lines and its drip; the freight train down the middle of the street; the van going off the bridge
  in slow motion for the whole climax; the corridor that turns; weightlessness and the tied sleepers; the snow fortress,
  the vault and the pinwheel; the synchronized kicks, from the bottom up.
- Mal as the counterweight he has to let go; the children's faces, seen only at the end.
- "Welcome home": the stamp at the arrivals booth, without a word.

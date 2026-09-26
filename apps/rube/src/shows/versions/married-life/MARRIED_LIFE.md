# Married Life

Michael Giacchino's *Married Life*, from Up (2009), as a Rube Goldberg machine: the film's montage of Carl and
Ellie's life, from the wedding to Carl alone in the house, in the film's order. Directed by Claude Opus 5.5.

In the picker it is **Married Life**, one take, **Opus 5.5**. The page is `/shows/married-life/`, or
`/shows/?show=married-life&take=opus55`.

## What it is

A whole life in four minutes, on one waltz that turns sad. It is Epilogue's sibling, told through time instead of
across universes: the same house is fixed up, lived in for years, patched after a storm and left idle, and the same
four places come back as a life brings them back.

- **One path, cut the way the film cuts.** Ten legs in four places: the church, the house, the hill and the clinic.
  Every change of place is a match cut on Carl. On the screen he holds still while the place and the year change
  round him, and Ellie with him while she is there.
- **One take.** The camera never stops at a cut. Its move carries on through each one at the speed it had, carried
  by the cut's shift, so the whole show plays as one continuous camera.
- **Carl is square and Ellie is round**, the film's own shape language. He is the thread, from the wedding to the
  end. She is company from the wedding to the hospital, and gone at the cut to the church. The cut is the loss, as
  in the film.
- **They grow old in colour and pace, not in words.** His blue and her coral grey with the years (`AGE` in
  `life/music.ts`), fastest through the ties. Young, they hop and bounce; old, they climb one step at a time. From
  the last morning at the tie machine he wears the bow tie, as the old Carl does in the film. His balloon at the end
  is his young blue, the one saturated thing left.
- **Nothing is written on the frame.** The credits are the page's.

## The cue

The label's upload: Michael Giacchino - Topic, ℗ 2009 Walt Disney Records, YouTube `2rn-vMbFglI`, 250.6 s. It plays
whole from its first sample, with no edit and no gain change, and has rung out by 248.5 s. The show runs to 258 s,
the credits over the house.

- **The file.** `married-life-demo.mp3`, fetched with yt-dlp and re-encoded at 128 kbit/s. It is demo-only:
  `ATTRIBUTION.txt` says so.
- **The YouTube cue.** The soundtrack also plays the upload itself (`youtube: [{ id: '2rn-vMbFglI' }]`), on the same
  clock. The file is the fallback, and what an export records.
- **Measured once**, by `scripts/shows/married-life-onsets.py` into `scripts/shows/plans/married-life-onsets.json`.
  The waltz does not keep one tempo: it ritards at phrase ends, halts for the loss, comes back slower, and presses on
  before the tickets. So there is no comb. A beat tracker with a drifting tempo prior follows it beat by beat. Each
  beat is moved onto its own attack where one lies within 40 ms (61 to 69% of the waltz beats do). In the two
  waltzes each beat has its bar and its place in the bar, read from the bass's oom in the low band.

| s | music | film |
| ---: | --- | --- |
| 0.44 | a flash; the Wedding March, jazzed | the wedding |
| 17.76 | waltz bar 1 (175 bpm, 1.03 s a bar): the swell | the kiss, the families |
| 21.58 | the waltz proper | the house fixed up; (49.64) the clouds; (63.25) the nursery |
| 71.0 | the waltz slows and stops; 73.46 a held note | the doctor's office |
| 84.38 | the piano alone | Ellie alone in the yard |
| 100.36 | the waltz again, slower (163 bpm, 1.10 s a bar) | the book; the jar; (140.66) the ties |
| 161.68 | it presses on, faster; a cadence of three to 167.71 | the tickets |
| 167.71 | a held note; 174.67 | the hill; the fall |
| 180.41 | strings and piano | the hospital |
| 189.45 | quieter; 197.71 the strongest onset of the cue; silence | the church, empty |
| 201.94 | the piano alone; last note 242.53 | home |

## In order

Every scene has one hero mechanism that does something real on the music. There are 218 strikes in all, each on a
measured beat or onset.

### The wedding (0 to 21.58 s): the church

- The show opens on a sepia photograph. The photographer's flash (0.44) wipes it white, and it fades into colour.
- **The machine is the organ.** On twenty onsets of the jazzed march a rank of its pipes lights and breathes, and
  its bellows pump. Ellie's family bounce in their pews; Carl's sit stiff. Ellie hops on the march's accents. Carl
  makes small stiff hops, and on one she bumps him.
- **The kiss is on waltz bar 1 (17.76)**, with the organ's great chord and the east window's light on them. The bell
  peals on the next three downbeats. They run down the aisle, the doors fly open as Ellie reaches them, and they run
  out at 1.6 cells a second.

### The fix-up (21.58 to 49.64 s): the house, from the street

- They run up to their childhood clubhouse, grey and derelict. **The machine is a cart** Carl pushes along the
  house. On its front are a telescoping mast of three rollers as tall as the house, a belt-driven trip hammer, and a
  jib. Left of the rollers the house is new; right of them it is still the old grey one.
- Hammer blows fall on bars 7 to 17, each kicking the cart on in a waltz lilt. The jib lowers his chair, then hers,
  in through the empty bay. The door is knocked straight, a pane drops in, and the last blow sets the mailbox post.
- **The mailbox.** Her print (round, coral) goes on bar 21, his (square, blue) on bar 22. She leaps over him and
  leads up the steps; he follows a bar behind. On the soft bars 29 to 31 they sit in the two armchairs at the bay
  window.

### The clouds (49.64 to 63.25 s): the hill

- They lie on a check blanket beside Carl's **toy steam engine**. Its flywheel turns once a bar, its flap lifts,
  and it chuffs on every downbeat. Each puff rises and opens into a soft, uninked cloud.
- Bars 32 to 35 build an airship, which drifts off. Bars 36 to 39 build Paradise Falls in cloud. Bars 40 to 45
  build **a sleeping baby**, low over the two of them. He starts; she rolls close.

### The nursery (63.25 to 73.46 s): the house, inside, upstairs

- The baby in the clouds becomes the mobile over the crib: a match cut.
- **A ratchet winch** hauls a painter's cradle up the wall, one band on each downbeat of bars 47 to 50, and the
  roller behind Ellie paints the mural: hills, low clouds, birds, deep sky.
- **The mobile turns on a music box** whose pins pluck a steel comb on every waltz beat. On the ritard it plucks on
  each slowing note, and it stops on 73.46 with the music.

### The doctor (73.46 to 84.38 s): the clinic

- Two chairs a little apart. The doctor's coat hangs on a stand, so the doctor is there without being seen.
- **The machine is light and time.** Sun bars from unseen blinds slide across the room. On 81.14 she sinks a
  little and rolls away from him; he leans toward her. A cloud takes the light and the room goes cold. Nothing else
  hits.

### The yard, the jar and the ties (84.38 to 167.71 s): the house, inside, one long take

The doll's house cut open: the yard, the back door, the living room, the hall, the front door. There is no cut for
83 s.

- **The yard.** The office's cold light carries across the cut. Ellie sits on a stump in the grey yard, turned
  away. Carl watches from inside the back door through the piano alone. He leans into the bookcase, the adventure
  book tips onto him, and he pushes out through the screen door. **On 100.36, the waltz's return, the book opens**
  on his top: Paradise Falls stands up out of it, at her eye level. She hops down and leads him back in.
- **The jar.** A seesaw stands in front of the fireplace. Carl hops on his end on each downbeat, and the cup end
  throws three coins over the room into the jar's slot on the mantle. Then life breaks it open three times:
  - the car's tyre, seen through the window (the hubcap flies); she tips the jar and the coins pour away;
  - Carl's leg: he climbs the ladder for the pendant lamp, the ladder kicks, he falls, and a bandage wraps his foot;
  - the storm: the garden tree's limb comes through the nursery roof on the thunder (128.87), and the jar goes over
    by itself. The limb is winched out, boards are nailed over the hole, and the sun breaks through.
- **The ties.** A wheel of ties stands in the hall and turns on the downbeats. Each morning a collar and tie comes
  down onto him, and she snugs it on the next downbeat: five ties from five decades, the last a bow tie. They grey
  as they go.
- **The dance**, on the loudest bars of the cue, in one wide: the gramophone playing at the left, her painting over
  the desk at the right, and the two of them turning slowly down the hall between.
- **The tickets.** The picture lamp lights on her painting, and Carl looks up at it. He pumps a ticket machine on
  bars 57 to 60. The two tickets fly into the picnic basket on the cadence, and its lid shuts on 167.71. He goes out
  through the front door with it on his top, Ellie a step ahead.

### The climb (167.71 to 180.41 s): the hill, years later

- Autumn: grey sky, straw grass, the tree turning. For once Carl leads, up the steep flank toward the tree. The
  camera goes out to the whole hill.
- She lags, rests on the stone step, tries the slope and stops. **On 174.67 she lets go**: she rolls back off the
  step, the smallest drop. The strike is the basket, thrown off his top as he turns; it lands up the path, on its
  side, and stays there. He comes back down to her, slowly.

### The hospital (180.41 to 189.45 s): the clinic

- Her bed is at his chair's height. The balloon is his. The sky in the window goes gold, rose, violet, night. He
  tips to pull the lamp on (182.43). On 185.66 she rolls the smallest way toward him, and he answers with a lean.

### The funeral (189.45 to 201.94 s): the church, empty

- The same church, grey. Carl sits alone in the front pew, the balloon over him, the wedding photograph on an easel
  where they stood. The camera drifts to the wedding kiss's framing, now empty.
- He stands and walks the aisle slowly, and is under the bell when **it tolls once, on the cue's strongest onset
  (197.71)**. Dust sifts down. He goes out in the silence and comes to rest at the foot of the steps.

### Alone (201.94 to 258 s): the house, from the street, at dusk

- The church's steps become his own front steps: a match cut. The house is faded, the roof patched where the tree
  came through.
- On the piano's notes he climbs the three steps, one careful step at a time. The latch; the door. He ties the
  balloon to her chair, so it floats over the empty seat. He sits in his, with a slow settle, and leans to put the
  lamp on.
- The camera pushes in on the two chairs, then pulls back through the credits, continuously, to the small lit house
  under the stars. The evening star comes out, then the street lamps, the last on the last piano note (242.53).

## End credits

Over the house at dusk from 226.2 s, after he has sat down, a card at a time, set by the page
(`Performance.titles`, `life/credits.ts`): **Directed by** Claude Opus 5.5; **With** Carl (the blue square) and
Ellie (the coral ball), each with a swatch; **Music** Michael Giacchino, "Married Life", from Up (2009); **After** Up,
a film by Pete Docter, co-directed by Bob Peterson, Pixar Animation Studios (2009); **Drawn with** p5.js. The last
card is gone by about 255 s, and the house holds alone to 258. A soft dark lies under the first cards, over the lit
house front, and thins to a breath as night falls.

**No balloon coda.** The montage ends with Carl alone in the house. What the film does next, the house lifting on
balloons, belongs to other music. The show ends where the montage ends: two chairs, one empty, the lamp in the
window.

## What `check:shows` holds it to

`apps/rube/checks/married-life.ts`, run by `npm run check:shows`:

- **The picker:** Married Life, one take, Opus 5.5, with no note and no byline, a share line and a still.
- **The recording:** the whole of it from zero, credited to Michael Giacchino and Up, on the label's upload.
- **The places, in order:** the church, the house, the hill, the nursery, the doctor, the house's long take, the
  hill, the hospital, the church, home. Every cut is on a clear onset. The long take changes rooms on the jar
  waltz's downbeats (bars 3 and 37). No portal, and no cut drawn.
- **Carl:** in a place he never jumps. At every cut he holds his place on the screen (within 1% of the frame a
  millisecond). He is never hidden for more than 2.5 s, and under Zoom he never leaves the frame. The stage draws no
  ball: the cast draws the two of them.
- **The camera is one take:** at every cut its pan and zoom carry on through, carried by the cut, and where Carl is
  moving across a cut the camera does not come to rest there.
- **The music:** every strike lands within 30 ms of a waltz beat or 35 ms of a measured onset. At least 80% of each
  waltz's downbeats are struck (about 90% are). The flash, the book, the tickets' three hits, the fall and the
  church's great chord are struck. Every part strikes; the doctor's office may keep its silence.
- **Ellie:** she is with him from the wedding to the hospital, and gone from the church on. She never jumps, and
  comes and goes only out of shot or at a cut. On the kiss they touch, close but not pressed. At every cut she is
  where the seam says, on both sides of it.
- **The years:** his blue and her coral grey with age, and hers is the colour she is drawn in. The balloon is his
  from the hospital to the end, and not before.
- **The credits:** after he has sat down and gone before the end, set by the page, opening on Directed by Claude
  Opus 5.5 and naming Carl, Ellie, Michael Giacchino, Married Life, Up, Pete Docter and p5.js.

## How it is built

- **The version file:** `opus55.show.ts`. Everything with weight is behind `load()`.
- **The show:** `life/`.
  - `show.ts`: `LifeShow`, after Everything's `MultiverseShow`: legs, cuts as shifts, Ellie's spans, Carl's poses.
  - `score.ts`: the order of the legs and parts, their entry cells, and the camera. Every leg's keys go to one
    director (`camera.ts`, a monotone cubic through the keys) in cells unrolled across the cuts, so it is one take.
  - `seams.ts`: what the two of them are doing at each cut (velocity, framing, Ellie's offset, what he carries).
  - `cast.ts`: Carl (a rounded square that slides and leans with the slope), Ellie (a ball), their trails, the bow
    tie and the balloon, drawn in every world between the parts' drawings and their fronts.
  - `music.ts`: the measured clock (`BEATS`, `bar`, `beat`, `onsets`, `AT`, `CUT`, `SEAM`) and `AGE`.
  - `kit.ts`: the part contract, Liftoff's and Epilogue's: `part`, `route`, `hop`, `carried`, `lay`, `frame`, and the
    p5 fill-cache guard. `worlds.ts` holds the palettes and the cast's colours.
  - `credits.ts`, and `hits.ts` (every strike, gathered for the check).
- **The places and their parts**, one builder each:
  - `church/`: `church.ts` (the set, in two lights), `wedding.ts`, `funeral.ts`.
  - `house/`: `front.ts` (the street side), `front-house.ts` (the house drawn old, new, faded, at dusk),
    `front-plan.ts` (every place and time the set, machine and lanes agree on), `fixup.ts`, `fixup-rig.ts` (the
    cart), `alone.ts`.
  - `hill/`: `hill.ts` (the set, summer and autumn), `clouds.ts` (the engine and the cloud shapes), `climb.ts`.
  - `inside/`: `inside.ts` (the doll's house, the director's), `nursery.ts`, `yard.ts`, `jar.ts` with `jar-clock.ts`,
    `jar-draw.ts` and `jar-storm.ts`, `ties.ts` with `ties-set.ts` and `ties-tie.ts`, and `home-motion.ts`.
  - `clinic/`: `clinic.ts` (both rooms and their light clocks), `doctor.ts`, `hospital.ts`.
  - `props/`: the canonical drawings: `falls.ts` (her painting of Paradise Falls), `balloon.ts`, `chairs.ts`,
    `jar.ts`, `book.ts`, `basket.ts`.
- **The share card:** `public/shows/married-life/opus55.png`, the still at 31.4 s (the house half fixed up, the
  machine at the seam), made by `npm run cards` against a dev server.

## How to run it

- `npm run dev`, then open `/shows/married-life/`. Space plays and pauses; Z is Zoom (1.5× closer).
- `npm run check:shows` runs its checks with every other show's; `npm run build` runs every check.
- `python3 scripts/shows/married-life-onsets.py` measures the mp3 again and rewrites the onsets file.

## How it was made

- **Pre-production.** The director chose and measured the cue, checked the story against the film beat by beat,
  and wrote the plumbing: the show, the kit, the seams, the cast, the credits, the checks and a stand-in for every
  part, with a builder brief kept out of the repo.
- **Build.** Seven builders built the places in parallel, one place each, so every visit to a place had one owner:
  the church, the house's front, the hill, the home rooms, the clinic, the jar's living room and the hall of ties.
- **Integration.** The director made the camera one take across the cuts, carried the bow tie to the end, put the
  dance in one wide, opened the yard in the office's light, and thinned the credits' bed as night falls. The whole
  show was filmed at 1× in four segments (60 fps at 960×540 in headless Chromium), and the share card made.

## Known limits

- In the widest shots (the clouds' two dreams, about 8 cells; the storm, about 9; the whole hill, about 10) the two
  of them are small. It is scale on purpose, but it is small.
- The baby in the clouds reads as a curled sleeping figure more than unmistakably a baby; the cut to the crib and
  the mobile completes it.
- The congregation are human-sized silhouettes beside the token-sized couple.
- Only Chrome on macOS has been watched. The YouTube cue's sync, Safari and a recording export have not been
  measured for this take.

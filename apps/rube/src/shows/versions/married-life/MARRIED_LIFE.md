# Married Life

Michael Giacchino's *Married Life*, from Up (2009), as a Rube Goldberg machine: the film's montage of Carl and
Ellie's life, from the wedding to Carl alone in the house, in the film's order. Directed by Claude Opus 5.5.

In the picker it is **Married Life**, one take, **Opus 5.5**. The page is `/shows/married-life/`.

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
- **They grow old in colour, bearing and pace, not in words.** His blue and her coral grey with the years (`AGE` in
  `life/music.ts`): a few years at each of life's breaks in the jar (the tyre, his leg, the tree), then a decade a
  morning in the ties, each step taken as she snugs his tie. With the years he settles (a touch shorter and wider,
  his corners softer) and stoops a little as he walks; she settles onto the floor; their trails fade. Young, they hop
  and bounce; old, they climb one step at a time. From the last morning at the tie machine he wears the bow tie, as
  the old Carl does in the film. His balloon at the end is his young blue, the one saturated thing left.
- **Nothing is written on the frame.** The credits are the page's.

## The cue

The label's upload: Michael Giacchino - Topic, ℗ 2009 Walt Disney Records, YouTube `2rn-vMbFglI`, 250.6 s. It plays
whole from its first sample, with no edit and no gain change, and has rung out by 248.5 s. The show runs to 258 s,
the credits over the house.

- **The file.** `married-life-demo.mp3` was removed from the repo (copyrighted). Live playback is YouTube only. Rebuild locally with yt-dlp if needed for measurement; it was demo-only:
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

Every scene has one hero mechanism that does something real on the music. There are 258 strikes in all, each on a
measured beat or onset. In the waltzes the two of them play the bar between them: Carl, square, keeps the oom (the
bass, on the one); Ellie, round, answers on the first pah.

### The wedding (0 to 21.58 s): the church

- The show opens on a sepia photograph (the one that stands on the funeral's easel). The photographer's flash (0.44)
  wipes it white, and it fades into colour; the tripod folds and sinks out of the frame by 2.5 s, its smoke left
  thinning in the air.
- **The machine is the organ.** On every onset of the jazzed march its speaking pipes breathe: each stretches up a
  little, goes gold and gives three soft puffs from its mouth, and the bellows pump. The families sit at the couple's
  scale, head and shoulders over the pews: his parents grey and square and still, hers warm and round in hats,
  bobbing on the beat. Ellie hops on the march's accents; Carl makes small stiff hops, and on one she bumps him; while
  she waits he shuffles two nervous steps along the altar step and back. The camera reveals the whole church and its
  bell once (landing on his startled hop, 3.45), comes in on the organ, carries past the couple to the pews, and
  closes on the two of them for the kiss, low in the frame under the lower half of the east window. As the march slows they turn to each other a step on each of its slowing
  notes (15.41, 15.95, 16.81, 17.21): she rolls closer and rises onto her toes, his lean grows, and she looks up into
  his face.
- **The kiss is on waltz bar 1 (17.76)**, her last step meeting his lean (he does not step in too: their outlines
  touch, not overlap), held through the bar, with the organ's great
  chord, a warm shaft from the east window's glass on them and a second flash from off frame, a warm wash that leaves
  them seen. The bell peals on the next three downbeats. From the kiss
  the camera pulls out over those three bars and comes to rest on bar 4's peal (20.89), the whole nave in, the bell
  swinging whole in its tower; then it runs on after them at that distance, never coming back in. They run down the
  aisle, the doors fly open as Ellie reaches them, and they run out under the bell at 1.6 cells a second.

### The fix-up (21.58 to 49.64 s): the house, from the street

- They run up to their childhood clubhouse, grey and derelict, and the camera, carrying on out from the church's wide,
  opens once onto the whole of it (the
  sagging roof, the boarded windows, the dark bay, the cart at its foot) as the mast goes up and the first paint goes
  on, then comes back in over two bars for the blows; at 35.6 it frames the house made new the same way. **The
  machine is a cart** Carl pushes along the
  house. On its front are a telescoping mast of three paint rollers as tall as the house, held in a frame with an arm
  to each drum, a belt-driven trip hammer, and a jib. The drums are wet (a deeper teal than the dry siding, the top one
  roof-red) and a seam wound round each climbs as it turns. Left of the rollers the house is new, a glossy wet band
  just behind them drying as they roll on; right of them it is still the old grey one.
- Hammer blows fall on bars 7 to 17, each kicking the cart on in a waltz lilt. After each blow the hammer lies on the
  wall a moment; the gear trips it up, quick, into the bar's third beat, where a pawl catches it with a small recoil,
  and it hangs cocked for the next downbeat. Ellie, riding the deck, is jolted up by every blow and comes down on the
  two, so the machine plays the whole bar: the blow, her landing, the pawl. The jib, a telescoping boom, reaches out to his chair
  waiting on the lawn and swings it in through the empty bay; then hers, which has ridden on the back of the cart's
  deck beside her like a moving-in-day load, glides in off it. The door is knocked straight, a pane drops in, and the last blow sets the mailbox post.
- **The mailbox.** Her handprint (a round palm) goes on bar 21, his (a square palm) on bar 22: two small hands,
  fingers up, thumbs reaching toward each other, in the box's own paint pressed darker, so they never read as two
  more of them. He has let the cart go as the mast folded, and it has rolled on past the box alone and braked on bar
  20, so the box stands clear on its post; she springs back to it off the cart's tail. She leaps over him, landing
  on 23's two (40.77, the strongest attack of the phrase and the first waltz's second-loudest swell), and leads up the
  steps; he follows a bar behind. On the soft bars 29 to 31 they sit in the two armchairs at the bay
  window, she looking at him (down at him as he crosses in front of her chair, then over at him in his).

### The clouds (49.64 to 63.25 s): the hill

- They lie on a check blanket beside Carl's **toy steam engine**. Its flywheel turns once a bar, its flap lifts,
  and it chuffs on every downbeat: the engine kicks on its bed and coughs a soft puff of steam out of its mouth, and
  out of the puff a knot of steam flies up with a trail behind it, arrives on the next downbeat and joins the shape it
  belongs to, and the whole cloud takes a breath as it does. Every downbeat lands twice, at the chimney and in the sky.
- Bars 32 to 35 build an airship (round nose, finned tail, a gondola slung under it), which sails off left. Bars 35
  to 38 build Paradise Falls in cloud: her tepui, as tall as it is wide, sheer sides of heaped billows, a flat lit
  top, lit on the left and in shadow on the right. On bar 39 three falls pour off the lip into the mist, which curls
  up where they land; the camera holds it whole, pouring, through bar 40, and then a gust takes it off. Bars 39 to 44 build **a
  baby**, sitting up in a cushion of cloud, one leg out, an arm reaching, whole over the two of them and placed where
  the mobile will be at the match cut. As far apart as the armchairs at the cut, she rolls in close to him over bar
  33 and lies by him under all of it, her face turned up to the sky (`LOOKS`); he starts at the baby, she turns her
  face from it to him, he answers with a small lean to her, and she looks back up at it for the cut (`GLANCE`): what
  they want, decided between them. She rolls the last of the way. The camera stays at most 5.5 cells.

### The nursery (63.25 to 73.46 s): the house, inside, upstairs

- The baby in the clouds becomes the mobile over the crib: a match cut. The storey below is veiled for the night
  while the nursery plays, as a doll's house lights only the room in play: its rooms and fireplace faintly there.
- **A ratchet winch** hauls a painter's cradle up the wall, one band on each downbeat of bars 47 to 50, and the
  roller behind Ellie paints the mural: hills, low clouds, birds, deep sky.
- **The mobile turns on a music box** whose pins pluck a steel comb on every waltz beat. On the ritard it plucks on
  each slowing note, and it stops on 73.46 with the music.

### The doctor (73.46 to 84.38 s): the clinic

- Two chairs a little apart, each with a low rounded backrest on two tubes, level with the sitter's top. The
  doctor's coat hangs on a stand, so the doctor is there without being seen.
- **The machine is light and time.** Sun bars from unseen blinds slide across the room: a few broad, soft bars, ends
  leaning with the sun, laid on the wall, floor and chairs under the two of them, so they keep their colour. The
  camera pushes in slowly through the held note, from the room to the two of them (the coat stand slides out of the
  frame on the way), so that on 81.14, when she sinks a little and rolls away from him and he leans toward her, the
  two of them are the whole picture (2.3 cells). It stays with them through his lean and the first soft note of the
  near silence. A cloud takes the light and the room goes cold; as he sits back the camera drifts a little left, off
  her, onto the office door, toward where the yard will be. Nothing else hits.

### The yard, the jar and the ties (84.38 to 167.71 s): the house, inside, one long take

The doll's house cut open: the yard, the back door, the living room, the hall, the front door. There is no cut for
83 s.

- **The yard.** The office's cold light carries across the cut, which opens close on Carl at the back door, the
  office door become this one, and Ellie small on a tall stump far to his left in the grey yard, turned away; the camera
  settles slowly out to hold the distance between them. Carl watches from inside the back door through the piano alone.
  Nothing strikes, but the wind gusts with the piano: each of its stronger notes is a breath of wind a moment after
  it, lifting the sheet on the line, the grass and the tree, and dying away. He leans into the bookcase, the adventure
  book tips onto him (a thick old book, a rounded spine, a strap), and he pushes out through the screen door and walks out to her at an
  even pace, round in front of the stump, the book passing under her, easing to a stop where she is looking. **On
  100.36, the waltz's return, the book opens** on his top: its top board swings over on the spine and comes down
  flat, the pages curling at the gutter, and Paradise Falls rises out of the gutter in cut paper, the camera in close
  on it and on her turning up to it and leaning in; on bar 1 she rises onto her toes and stays up on them through the
  bar, leaning in again on its two (the camera at its closest), then hops down (101.73) and is away home ahead of him,
  bumping the door in on bar 2's two. He turns for home on bar 1, the book
  open on his top, and walks after her at an even pace (about 1.3 cells a second: an old-fashioned brisk walk, never a
  run), the camera leading him at his pace; the book folds shut, slowly, on bar 2's third beat; he comes in through
  the back door on bar 3, and as he goes past the bookcase the book slides back off his top onto its shelf, on bar 4.
  It is one walk from the stump to his seesaw.
- **The jar.** A seesaw stands in front of the fireplace. Carl hops on his end on each downbeat (taking off on the
  third beat before it, the waltz's pickup), and the cup end
  throws a handful of five coins over the room, spreading and closing up again, turning and catching the light, into
  the jar's slot on the mantle on the next downbeat; each handful puts a visible notch of brass in the glass, the jar
  clinks in its cradle, and Ellie on the ladder counts each one in: up off her tread as it drops into the slot, down
  on the two. The camera is close (3.6 cells) on the
  plank, the flight and the jar for the four handfuls. The jar stands in **a brass cradle** that turns
  on a sprung knuckle at the mantle's end; under it a tin hopper feeds **a chute** down the wall to a slot, and what
  goes down the chute is gone, paid out of the house. Life breaks it open three times:
  - the tyre of their car (a round family car), seen through the window in a still frame with the jar on the mantle
    in it (the drive set high in the glass so the flat tyre is seen flat above the sill, the hubcap a ringed disc that
    flies); she pushes the jar
    over in its cradle, the coins run down the chute and out, and the cradle's spring sets it back on its feet,
    slowly. Paid for, the car drives off out of the window;
  - Carl's leg: the refill's stroke shakes the pendant lamp and it sputters out (lit, it throws a soft warm cone down
    the wall); the camera looks up with him as he climbs the ladder to it, the ladder kicks under the lamp, he falls
    (the camera in close), and her
    touch wraps a bandage round his foot; she pours the jar out again;
  - the storm: as she reaches the jar for the second pour the camera draws back to the whole house as it gathers, one
    even move (17.2 cells by 128.55: the
    house, its roof, and the garden tree's broad old crown whole over the ridge on its trunk, bending in the gusts
    and whitened by each flash), and holds, nearly still, as the tree's limb, a heavy bough in leaf, comes down
    through the roof into the nursery (128.87), bringing its plaster down in a heap, the blow throws the jar over by
    itself (129.27) and the thunder rolls (129.64). The camera
    comes in as the limb is winched out, the nursery's ceiling well inside the frame while boards are nailed over the
    hole, and the sun breaks through.
- **The ties.** A wheel of ties stands in the hall and turns on the downbeats. Each morning a collar and tie comes
  down onto him, and she snugs it on the next downbeat: five ties from five decades, the last a bow tie, and on each
  knot they are ten years older. The camera is one slow crane down and in over the five mornings, the wheel, its drop
  rod and both of them whole in every frame. Beside them a soft slanted patch of sun from the door's glass is the
  house's clock: each morning a season (a pale spring, a deep gold summer, an amber autumn, a blue-white winter, a paler
  spring), stepping to that day's evening, lower and warmer, when she knots the tie. From then on the bow tie
  sits small and dark in his collar, where the long ties' knots sat, below his top edge.
- **The dance**, on the swell of the second waltz: side by side, she at his right, rising on every downbeat and
  swaying on the two and three, across the open floor from the gramophone toward her painting. The swell crests from
  bar 51's third beat into bar 52's downbeat (156.75 to 157.5 s, the loudest of the second half; by bar 53 it is 8 to
  10 dB down). They dance in hold, her face on him throughout, and through the crest she rolls out along the floor
  to arm's length on 52's downbeat, still looking at him, as a dancer spots her partner, as the warm pool brightens and the camera, come in with the swell, is closest on the two of them
  (1.9 cells) under their wedding photograph on the hall wall, hung low under the chair rail and large enough to read
  at the close: the two of them at arm's length under the picture of them touching. The low evening sun through the front door's glass
  lays two long warm shafts down the hall (the glass's cross bar splits it, so it reads as sun through a window): it gathers with the swell and falls full on the two of them on the crest, the
  light that fell on them at the kiss, and settles as the music falls away. She rolls back in by bar 53, and as they close into each other's arms on bar 55 it cranes out to the desk
  and her painting.
- **The tickets.** The picture lamp lights on her painting, and Carl looks up at it. Ellie goes to the front door,
  opens it and stands out at it looking at the evening, her back to the hall: the tickets are his surprise, and she
  does not see them. He pumps **a red ticket press**
  (a roll of blank tickets on its top, a hand lever that throws down on each stamp, a window whose reel rolls through
  a city, the sea, mountains, to the falls) on bars 57 to 60, as the music presses on, and the camera pushes in slowly
  on the press, the basket and him until it is close (2.55 cells) on the slot and the basket as the two tickets fly
  into it on the cadence (166.93, 167.28); it draws back as the lid shuts on 167.71, on through the cut. Past the open front door the
  porch has its rail and the evening sky. He goes out after her with the basket on his top.

### The climb (167.71 to 180.41 s): the hill, years later

- Autumn: grey sky, straw grass, the town a pale roofline far off, and their tree, turned, standing at the top of the
  path up the flank: the picnic place. Over the held note the camera takes one slow breath: the draw back from the
  tickets carries on through the cut, out to the whole tree with the two of them small at the flank's foot (5.9 cells),
  and in again as she follows him up, the trunk's foot left at the corner of the close. She stands a little way ahead
  on the lane as he comes up, and comes back to follow him. For once Carl leads, up the
  steep flank toward it; he nearly gets there, and she never does. (In summer the tree stands left of the crest where
  they lie; seen from the lane years later, it stands where the climb can reach it.)
- Close on them (2.8 cells), she climbs after him, tires, rests, pushes on and stalls. **On 174.67 she gives way**:
  she sinks, and rolls back the short way she climbed onto the fieldstone's worn top, and is still. No bounce. The
  strike is the basket, thrown off his top as he lurches toward her; it lands up the path, on its side, and stays
  there, and its lid jolted open, the two tickets slip out and slide away down the straw, the surprise he never gets
  to give her, lying on the slope as he passes. He does not stop: he hurries down after her, faster than he has gone in years, the camera in close with
  them (2.4 to 1.9 cells, the basket left out of the frame), and eases to rest beside her on the stone. He leans to
  her; she answers with the smallest roll toward him, her face turning from the sky to him, and looking at him
  across the cut into the ward.

### The hospital (180.41 to 189.45 s): the clinic

- Her bed is at his chair's height and her length, its foot a cell past her; she lies in it, the blanket over her
  lower third, the sheet turned down at her and a mound where she lies (`drawCovers`, in front of her, dimmed with
  the ward). His chair's back is low and brown, so the old grey Carl stands clear of it against the pale wall. He has
  brought her the balloon, and comes in with it held close on a short string, letting it up as he reaches for the
  lamp. The sky in the window goes gold, rose, violet, night. He tips to pull the lamp on (182.43). Then he leans to
  her and gives her the balloon: at the full of his lean the string passes from his corner to her, arriving on
  184.88, tied short, and the balloon settles to float just over her. She looks up at it, then round to him. On
  185.66 she rolls the smallest way toward him, and he answers with a lean that arrives on the next strong note
  (186.53): her gesture and his each have their note. The camera opens a little from the cut in (2.7 cells) as he
  reaches for the lamp and the balloon rises whole over him (3.3 cells), then comes in and down onto the two of them
  as it settles, to 2.7 cells on her touch and his answer, the two of them two thirds down the frame (Zoom keeps its
  own, higher hold there, `hospitalZoomDrop`, so the balloon stays whole in it); then it begins to leave her, one
  slow draw back through the cut into the empty church.

### The funeral (189.45 to 201.94 s): the church, empty

- The same church, empty. It opens under the hospital's night, dim and blue, the glass dark, and the grey morning
  comes up over it in three seconds, the one pale beam and its dust last. Carl sits alone in the front pew, the
  wedding photograph on an easel where they stood: a third larger than the hall's, the two of them in it with a hint
  of the blue and coral they were that day, and a soft warm light gathering on it as the morning comes, the one warm
  thing at the altar end. Across the cut the balloon is his again: it holds its place and
  rises back over him as its string is let out. She is gone. The camera drifts slowly across the dawn to the wedding kiss's framing, now
  empty, arriving as he reaches the floor.
- As the morning comes up he lets himself down off the pew, forward to its edge and down its front in one even move
  (under half a cell a second, the seat twice his height), onto the floor on 192.05; there he turns to her picture and
  leans to it, slowly, the lean he gave her in the office and at her bedside, and holds it; then he walks the aisle at an old man's pace (about
  half a cell a second) into the porch, where the bell's rope hangs. As it is pulled the camera rises
  and widens with it, and **the bell tolls once, on the cue's strongest onset (197.71)**, the whole empty church in
  the frame from the organ to the steps, and the toll is felt through all of it: the organ's pipes ring gold with it, as they went on every note
  of the march, and fade as the bell dies away; the balloon swings aside on its string and sways back; he starts; and
  the frame itself takes the blow, a small damped drop that settles in half a second (the only one in the show).
  Dust sifts down. The answer, as the bell swings back, stirs them again, less. He goes out in the silence and comes to rest at the foot of the steps.

### Alone (201.94 to 258 s): the house, from the street, at dusk

- The church's steps become his own front steps: a match cut. The house is faded, the roof patched where the tree
  came through.
- On the piano's notes he climbs the three steps, one careful step at a time, the camera close (3.5 cells) on the
  steps, the door and the porch rail, the mailbox's faded handprints at the frame's edge. The latch; as it gives he
  draws the balloon's string in short (`GATHERS` in `life/cast.ts`), so it comes in under the lintel with him before
  the door shuts and passes the wall between the door and the bay at his side; the door, and the camera widens as he
  goes in. In the bay he lets the string out again, before he ties it. The bay's glass runs down to the room's floor, so he is seen whole through it,
  and its middle light is one pane from head to floor, so no bar crosses the balloon over her chair. He ties the
  balloon to her chair, so it floats over the empty seat. He sits in his, with a slow settle, and leans to put the
  lamp on. Tied to her chair, the balloon leans the smallest way toward him on three of the piano's phrase notes
  (219.70, 221.88, 226.20), easing over and back: her last gesture at her bedside was the same.
- The camera pushes in slowly on the two chairs through the sit, and holds the lit room for a phrase of the piano,
  him in his chair and the balloon over her empty one; then it draws back past the roof before the first card, and
  on at an even rate to the last frame (27 cells): the lit window, the house at dusk, the roof,
  the sky, the small lit house at the foot of the frame under the stars. The evening star comes out, then the street lamps, the last on the last piano note (242.53).

## End credits

Over the sky above the house from 232.7 s (the strongest piano note after the lit room's phrase), after he has sat
down and the lamp is on, a card at a time, set by the page
(`Performance.titles`, `life/credits.ts`): **Directed by** Claude Opus 5.5; **With** Carl Fredricksen (the blue
square) and Ellie Fredricksen (the coral ball), each with a swatch; **Music** Michael Giacchino, "Married Life", from
Up (2009); **After** Up, a film by Pete Docter, co-directed by Bob Peterson, Pixar Animation Studios (2009);
**Drawn with** p5.js. The last card is gone by about 256.9 s, and the house holds alone to 258. The camera has drawn
back past the roof by then, so every card lies over the sky; the canvas puts nothing under the words, and no star
comes out under a card while it is up. On a phone held
upright the stage shows more sky than the 16:9 box, and the cards go up into it (`TitleCard.lift`, a share of the
extra height, used only by this show).

**On a phone held upright** the extra picture goes mostly above the frame (`Performance.tall`, 0.85 of it, used only
by this show): every set stands on a floor or the ground, with sky, a roof or the storey above over it and only earth
under it, so a tall stage shows the church's spire, the house's roof and the hill's sky, not a slab of ground. The
cards go with the picture.

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
  millisecond). He is never hidden for more than 2.5 s. The stage draws no ball: the cast draws the two of them.
- **Zoom and distance:** under Zoom (1.5× closer, held off the middle by `zoomDrop` where the camera says) his whole
  square and her whole ball stay in the frame. No shot wider
  than 6 cells lasts more than 2.5 s, except five named reveals, each held to its window and its widest: bar 4's peal
  and the run out to the old house (the bell whole, up to 6.6 cells), the house made new (the machine as tall as it),
  the storm (the whole house and its tree, up to 17.6 cells), the one toll, and the credits (up to 27.5 cells). The
  hill's one breath out to its tree stays under 6 cells.
- **The camera is one take:** at every cut its pan and zoom carry on through, carried by the cut, and where Carl is
  moving across a cut the camera does not come to rest there.
- **The music:** every strike lands within 30 ms of a waltz beat or 35 ms of a measured onset. At least 80% of each
  waltz's downbeats are struck (about 90% are). The flash, the book, the tickets' three hits, the fall and the
  church's great chord are struck. Every part strikes; the doctor's office may keep its silence.
- **Ellie:** she is with him from the wedding to the hospital, and gone from the church on. She never jumps, and
  comes and goes only out of shot or at a cut (and across a match cut she goes on looking the way she was, turning
  to the new place's look over a second and a half: held by the cast, not a check). On the kiss they touch, close but not pressed. At every cut she is
  where the seam says, on both sides of it.
- **The years:** his blue and her coral grey with age, and hers is the colour she is drawn in.
- **The balloon:** it comes in with him to the hospital and not before; it is hers at her bedside, from his giving
  it to the cut; it is his again from the church to the end; and it never jumps in a place.
- **The toll:** the frame takes a blow only there (at most 1.5% of its height); the balloon is stirred only by the toll
  and its answer; at home it leans only on the piano's own notes, after he sits and before the credits.
- **Zoom's margins:** neither of them within an eighth of the Zoom frame's edge for 2.5 s or more, except where the
  staging fills it (the nursery, nine tenths of its width apart; the ward, the balloon over them); the balloon's crown
  never cut by more than 0.08 of its half height; and the frame's sharpest change of speed under Zoom at most twice
  the show's own.
- **Her face:** at him at the kiss, in her armchair, at the crest and on the fieldstone, and up at the clouds (each
  within 20°); never turning more than 0.15 rad a frame faster than her own roll.
- **The flank:** neither cuts into the hill's slope by more than a twentieth of R, until she gives way.
- **The credits:** after he has sat down and gone before the end, set by the page, opening on Directed by Claude
  Opus 5.5 and naming Carl and Ellie Fredricksen, Michael Giacchino, Married Life, Up, Pete Docter and p5.js.

## How it is built

- **The version file:** `opus55.show.ts`. Everything with weight is behind `load()`.
- **The show:** `life/`.
  - `show.ts`: `LifeShow`, after Everything's `MultiverseShow`: legs, cuts as shifts, Ellie's spans, Carl's poses.
  - `score.ts`: the order of the legs and parts, their entry cells, and the camera. Every leg's keys go to one
    director (`camera.ts`, a monotone cubic through the keys) in cells unrolled across the cuts, so it is one take.
    `JOLTS`: the one blow the frame takes (the toll), a damped swing added under the director's move.
  - `seams.ts`: what the two of them are doing at each cut (velocity, framing, Ellie's offset, what he carries).
  - `cast.ts`: Carl (a rounded square that slides and leans with the slope), Ellie (a ball), their trails, the bow
    tie and the balloon, drawn in every world between the parts' drawings and their fronts; the years' bearing
    (`bearingOfAge`) under every part's pose; the balloon's ties (`show.ties`: to her at the bedside, to her chair
    at the end), what stirs it (`STIRS`: the toll and its answer), its leans toward him at home (`LEANS`), and where
    he holds its string short (`GATHERS`: into the ward, and through his own door).
  - `music.ts`: the measured clock (`BEATS`, `bar`, `beat`, `onsets`, `AT`, `CUT`, `SEAM`) and `AGE`.
  - `kit.ts`: the part contract, Liftoff's and Epilogue's: `part`, `route`, `hop`, `carried`, `lay`, `frame`, and the
    p5 fill-cache guard. `worlds.ts` holds the palettes and the cast's colours.
  - `credits.ts`, and `hits.ts` (every strike, gathered for the check).
  - `index.ts`: the performance. Two framing hints the stage reads, both used only by this show: `tall` (on a phone
    held upright, 0.85 of the extra picture goes above the frame) and, on the camera's framing, `zoomDrop` (where
    Zoom holds off the frame's middle: higher on the home steps, lower through the credits; `zoomDropAt` in
    `house/alone.ts`, `hospitalZoomDrop` in `clinic/hospital.ts`, `fixupZoomDrop` in `house/fixup.ts`), and on top of
    those Zoom's own hold, `zoom.ts`: worked out once for the whole show, it keeps the two of them off the Zoom frame's
    edges (`zoomDrop` and `zoomSlide`) without pushing the topmost of them or the balloon's crown out.
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
- **The share card:** `public/shows/married-life/opus55.png`, the still at 47.3 s (the two of them in their
  armchairs in the new bay), made by `npm run cards` against a dev server.

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
- **Integration.** The director made the camera one take across the cuts, carried the bow tie to the end, opened the
  yard in the office's light, filmed the whole show at 1× in four segments (60 fps at 960×540 in headless Chromium),
  and made the share card.
- **Critics and fixers.** A fresh critic watched the whole show and ranked notes against Stephen's list; five fixers
  took one file each (the wedding's camera, the baby cloud, the ties and the dance, the climb and the fall, the
  toll).
- **Director's pass.** The notes that crossed files: stricter checks (both of them whole under Zoom, no wide shot
  lingering); the credits drawn back from the lamp with no bed under the words, and the cast named in full; push-ins
  in the doctor's office and the hospital; the funeral opened under the hospital's night; the handprints as hands;
  the jar's cradle and chute; the adventure book as a book; the ticket press and the porch; the dance close; the far
  town as one roofline.
- **Critic 2 and five fixers**: the dance side by side under a crane, and the tie wheel whole; the wedding's camera,
  the organ breathing and the tripod sinking away; the congregation at the couple's scale; the engine's steam building
  each cloud, the airship and the sitting baby; the bay's glass down to the floor.
- **Director's second pass.** The bow tie in his collar (it read as a pair of eyes); the climb's wide under 2.5 s and
  her fall a give-way onto the stone; the office's sun as soft light under them; the credits over the sky, in phone
  portrait too, with an even draw-back to the end; the steps close; the storey under the nursery unlit; the jar's
  handfuls seen; the rollers as rollers, painting; the book's close eased out of; the glass's haze halved while he is
  alone, and the bay's apron dropped (it popped at 42.0 s).
- **Critic 3, five fixers and the director's third pass.** The jar's camera a move for every event; the garden tree
  over the roof, bending in the storm, and the limb that comes through it; the mornings as one crane, and the door's
  light a season a morning; the falls cloud as her tepui, pouring; Carl hurrying down to her on the hill. Then the
  storm seen whole, house, roof and tree; the balloon given to her at her bedside, and his again in the church; the
  ward's chair low, so he stands clear of it; the years stepping on her knots, and a bearing for them (settled,
  stooping as he walks); the widower's pace slowed in the church; their car a family car, driving off once paid for;
  no lean that flips between frames (on the hill's stone, up the porch steps, at the cart, at home).
- **Polish round 2 (music and motion): five fixers and the director's fourth pass.** The kiss arrived at a step on each
  of the march's slowing notes, and the pull-out resting on the swell's crest; the trip hammer tripped into each bar's
  third beat and caught; the seesaw hops taking off on the pickup, and the jar's camera in a few long moves; the
  dance's turn-out on the swell's crest; the widower let down off the pew in one even move. Then Carl walking home
  from the book instead of sprinting; the storm landed before the limb, the crown whole; the push in on the ticket
  press for the cadence, and the hill's out-and-back wide made one breath.

- **Polish round 3 (frames and detail): five fixers and the director's fifth pass.** The office chairs' backs low
  and round, no second Carl behind him; the bay's middle light one pane, so no bar cuts the balloon; the storm's tree a
  broad old dome on its trunk, the limb a heavy bough, the plaster a heap; the hospital opened out for the balloon.
  Then the kiss under the east window's glass; the old house seen whole before it is painted; the first card on a
  later note, clear of the chimney, and no star under a card's letters; the cast swatches in scale on a phone and in a
  saved video; the share card of the two chairs; on a phone, the night road and the veiled storey under the nursery;
  the partition's doorway cased; the door's light as light; the falls' first cloud no longer a figure 8.
- **Polish round 4 (the whole film): three fixers and the director's sixth pass.** The dance's camera going in with
  the swell to the two of them; the yard closer on the two of them; the storm's draw-back an even move from her reach
  for the jar. Then their tree brought to the top of the path on the hill years later, and the hill's breath out holding
  it; the doctor's office close on her sinking and his lean, held through the first soft note, and the yard opened
  close on him; the wedding's pull-out landed on bar 4's peal and carried out through the cut, never back in; the lit
  room held a phrase before the credits (232.7); the hospital's last seconds drawn back slowly instead of parked.

- **Polish round 5 (story and staging): five fixers and the director's seventh pass.** The kiss held through bar 1
  and its flash a warm wash; the chairs moved in as on a moving-in day, hers on the cart and his off the lawn on a
  telescoping jib; the cart let go past the mailbox so the box stands alone for the prints; their wedding photograph
  over the dance, which is danced in hold with a roll-out; the book carried under her on a taller stump at an even
  walk, her rise to the pop-up, and the yard's drawings put back where their cells say. Then the lamp he climbs for
  seen going out; the tickets his secret, Ellie out at the door; the balloon tied short to her and the camera closer
  on her touch; her gaze carried across the match cuts; the parked cart out of the prints' close.

- **Craft pass (Opus 5.5, after the first seven rounds).** A pass on the coupling of picture and music, run from
  probes rather than taste alone: a music audit (strong onsets and beats with nothing on them), a visual-flux probe
  (the show sought at 30 fps, how much of the picture changes each frame against the measured onsets), and a check of
  the bar's phase against the audio (the bass moves on beat 1 in 83% of the first waltz's bars and 69% of the
  second's; beat 2 carries the chord). The worst was the toll: the cue's strongest onset landed on a bell a few pixels
  tall, and nothing else in the frame changed. Then the chuffs on the hill (none of 15 visible), the crest of the
  second waltz on a bare wall, and the pahs, strong all through both waltzes and answered by nothing. Changes: the
  toll through the whole church (the organ, the balloon, one damped blow to the frame); the engine's cough and the
  cloud's breath; the crest's shaft of evening light; Ellie on the two in the fix-up and at the jar; the yard's wind
  on the piano; his answer at her bedside on its own note; the balloon's leans at home. A search for strikes on weak
  beats beside strong unstruck ones moved four of hers onto the strong note (her leap at the mailbox, her settle on
  the ladder, her hop onto the mantle, her step off the plank). Then a fresh critic watched the whole show: the book's
  payoff held a second longer, the toll's frame moved to hold the organ, the crest's light split into two crisp
  shafts, the cloud falls held through bar 40. Tried and taken out: dust shaken from the nave's rafters at the toll
  (at the toll's width it read as speckled plaster), and a deeper veil on the storey under the nursery (the props
  that poke up at the frame's foot are not under it). Considered and kept: the fix-up's wide from 31 to 36 s, where the
  two of them are small, because it is the house made new.

- **Polish round 6 (Opus 5.5).** Contact sheets of the whole show, then stills at the moments that matter. At home
  the balloon was lost for 1.5 s behind the wall between the door and the bay as he walked in, and the door shut
  while it was still in the doorway: now he gathers the string in at the latch and lets it out in the bay, and it is
  hidden only for the half second he is. The dance's crest was a bare wall with the photograph a stamp at its top
  edge: the photograph is hung lower and larger, right over them, and the crest's two shafts are a little stronger.
  Considered and kept: Ellie at the open front door stands before its leaf, not past it against the evening; past it
  she would leave the Zoom frame at the cut into the hill.

- **Polish round 7 (Opus 5.5).** Denser sheets of the fix-up, the jar, the climb and the funeral found nothing new
  to fix; portrait stills at a phone's shape did. The stage set the 16:9 frame in the middle of a tall one, so half a
  phone's screen was flat ground under the floor line and the action sat in its top third. `Performance.tall` lets a
  show say how much of the extra goes above; this one sends most of it up, into the sky, the roofs and the storey
  above, and the credits move with the picture.

- **Polish round 8 (Opus 5.5).** The whole show filmed at 10 fps and differenced frame to frame: every jump is a
  cut, the flash, the storm's lightning or the lamp; nothing pops. Then the whole show under Zoom: through the
  credits' draw-back the house, kept low under the sky for the cards, sank off the Zoom frame's foot, the lit window
  cut from 233 s and the porch gone. Now Zoom holds a quarter of its half height lower from the lit room's draw-back
  on (`Framing.zoomDrop`, `zoomDropAt` in `house/alone.ts`), so under Zoom the house stays whole with him in the lit
  window to the end; the show's own frame is unchanged.

- **Polish round 9 (Opus 5.5).** Each cut seen frame by frame at full size (before and after): nothing the two of
  them carry, and no light, pops across one. The clouds, the jar's three breaks and the storm at full size read.
  Then the balloon's crown measured against the Zoom frame through every second it is up: on the home steps it lost up
  to half the balloon off the top for five seconds. Zoom now holds higher there, a step at a time with him
  (`zoomDropAt`, negative), the balloon whole and a tenth of the half height still under him. At the hospital's start
  it is cut too, but there is no room under them to move.

- **Polish round 10 (Opus 5.5).** The lit room and the share card at full size read. At the cut into the hospital the
  balloon's crown touched the frame's top, and under Zoom it was cut by up to half for three seconds, with no room
  under the two of them to hold Zoom higher. Now he comes into the ward with it held close on a shorter string
  (`GATHERS`), and lets it up as the camera opens and he reaches for the lamp, as he gathers it in at his own door:
  whole in the frame, under Zoom too, from the cut.

- **Polish round 11 (Opus 5.5).** The first and last seconds densely, the fix-up's cart and the ticket press, the
  nursery, the doctor's office and the yard at full size: nothing to fix. Ellie at the open front door was weighed
  again: past the leaf, against the evening, she leaves the Zoom frame through the whole push-in on the press (164.5
  to 167 s), not only at the cut, so she stays before it. The build notes now name this PR's mechanisms (`GATHERS`,
  `tall`, `zoomDrop`). Noted, not done: the player has no reduced-motion setting; the toll's 1% blow is the only
  camera shake in this show.

- **Polish round 12 (Opus 5.5).** A new lens: contact, the two of them against what they stand on. On the hill's
  flank both sank a little into the slope (up to a tenth of R where it is steepest): the climb set their centres R
  straight up from the drawn ground, which is right on the flat and short on a slope. Now `seat` in `hill/hill.ts`
  rests them R along the ground's normal, so he stands and she rolls on it, as they do on every floor. Her sink as
  she gives way is the slump the story asks for, and kept.

- **Polish round 13 (Opus 5.5).** Contact carried through the show under Zoom: the armchairs, the office chairs,
  the stump, the ladder's tread, the seesaw, the mantle, the fieldstone, the bed and his chair, the pew, the steps,
  his chair at home; each rests where it should. Then stillness from the 10 fps scan: the only near-still stretches
  are the falls held pouring (56 to 58 s) and the credits' last twelve seconds after the music rings out, both as
  meant. Nothing to change in the picture. Lenses tried so far, for the next pass: contact sheets, full-size stills,
  frame differencing for pops, each cut before and after, Zoom, a phone held upright, the balloon's crown against
  the frame, contact, stillness.

- **Polish round 14 (Opus 5.5).** A fresh critic watched the whole show through stills, with the notes in hand, and
  ranked five notes; each was checked against the frames before it was taken. Taken: at her bedside she sat on a bare
  mattress with the blanket bunched over the empty foot of the bed, so she did not read as ill; the blanket is now
  drawn in front of her (`drawCovers`, dimmed with the ward), up over her lower third, the sheet turned down at her
  and a mound where she lies. Her one dot, her face, looked at the floor through the tie mornings and at the crest;
  now, still or swaying, she looks at him there (`LOOKS` in `cast.ts`), and rolling, her dot rolls. The flat tyre was
  lost behind the window's sill under its dust: the drive and the car sit higher in the glass, so the tyre is seen
  flat, and the hubcap is twice the size, a ringed disc seen to fly. Left: Carl small at the cart's handle in the
  fix-up's reveal (a restaging of the rig), and the two of them lying apart on the blanket under the clouds (it moves
  her place at the match cut into the nursery).

- **Polish round 15 (Opus 5.5).** One of round 14's two notes left, taken up: on the blanket they lay as far apart as
  the armchairs, and her dot looked at the grass (down and right) the whole time the engine built the airship, her
  falls and the baby. Now she rolls in close over bar 33 and lies by him, as in the film, and while she lies still her
  face is turned up to the clouds, carried just across the cut onto the mobile. The look's speed is sampled inside
  the place she is in, since her cells change at a cut. Still left: Carl small at the cart's handle in the fix-up's
  reveal.

- **Polish round 16 (Opus 5.5).** Her gaze audited through the whole show from the numbers: every stretch where she
  is still and her face points down, judged against the story. Kept: her handprint on the mailbox, the yard (turned
  away from him), and the stall on the climb before she gives way. Changed: in her armchair at the new bay she looked
  at her lap for five seconds, the share card's moment; now she looks at him, following where he is (`towardHim`), and
  across the cut onto the blanket her look turns up to the clouds in one span, so it never drops back between them.
  The share card is made again at 47.3 s.

- **Polish round 17 (Opus 5.5).** Her gaze measured against where the story needs it at each beat. Already right: up
  at the balloon he brings her, then round to him through her touch; the doctor's coat before the news. Changed: at
  the kiss she looked at his middle, now up into his face; on the fieldstone her answer to his lean is her face turning
  to him with her smallest roll, held across the match cut into the ward. Then the looks' motion was scanned frame by
  frame through the show, which found a snap from round 14: as her roll passed the far side of where she was to look,
  the short way round flipped, half a turn in a frame (154.6 s), and a whip on the crest itself (157.4 s). Now the
  roll's hand-off blends as directions and each span's fade turns the short way at rest; the tie mornings and the
  dance are two spans, and in the dance she spots him through the turn-out instead of letting her roll take her face.
  No look now turns faster than an ordinary brisk turn.

- **Polish round 18 (Opus 5.5).** A second fresh critic, told what the recent rounds changed so as to look for
  regressions there too; each note checked against the frames. Taken: her bed was a grown-up's, long and empty past
  her under the covers, which these two have no bodies for; it is her length now, the foot a cell past her, the mound
  plainly her, and the covers a little lower on her. Her touch and his answer sat on the frame's foot under a wall; the
  frame comes down onto them there (two thirds down), the balloon being tied short to her, and Zoom keeps its old hold
  (`hospitalZoomDrop`). On the blanket she lies closer (0.42 from him, then 0.36 at the baby). At the kiss his step in
  pressed his leaning corner over her ball; he no longer steps, and their outlines just meet. Not taken: the tilted car
  in front of the window's bar (the pixels show the bar drawn across it), and the balloon's half second at the bay's
  post (round 6's, while he is hidden too).

- **Polish round 19 (Opus 5.5).** The critics' last open note, Carl small at the fix-up's cart, measured: at 1× it
  is the reveal's scale, as meant, and the handle barely touches his corner; under Zoom, though, he stood on the
  frame's very foot for fifteen seconds (0.89 to 0.98 of its half height under the middle), with room over the two of
  them. Zoom now holds 0.22 lower from the cut to the old house until the camera comes in at the mailbox
  (`fixupZoomDrop`): he is at most 0.77 down, the lawn and the street under him, the hammer and the house front still
  in. The show's own frame is unchanged.

- **Polish round 20 (Opus 5.5).** Last round's cart was one case of a general gap: the Zoom check holds the two of
  them inside the frame, not off its edge. Scanned through the whole show, 22 stretches of a second or more had one
  of them within an eighth of the Zoom frame's edge, among them Carl cut at the nursery's winch and at the ticket
  press, and Ellie cut on the fieldstone. Rather than hand holds part by part, Zoom now has its own (`zoom.ts`): each
  tenth of a second, how far the frame must move (down, or across: `Framing.zoomSlide`, new) to keep them within 0.8
  of its half size, never further than the topmost of them or the balloon's crown allows; held half a second either
  side, smoothed, and capped by the allowance held the same way. Seven short stretches remain, the longest the ward
  (balloon over, the two of them under, the Zoom frame full). It is built once.

- **Polish round 21 (Opus 5.5).** Zoom's hold, measured in the browser: building it stalled the start of playback by
  560 to 830 ms (a 659 ms frame gap in headless Chromium, against about 120 ms without it). Nearly all of it was the
  balloon, whose `balloonAt` averages sixty moments of its past on every call. The hold now bounds the crown instead,
  straight up over the knot on its taut string (`stringAt`, now exported), which is never lower than where it is: the
  same stretches and the same crown margins, built in a sixth of the time, and no stall left above the page's own
  frames. Then the whole show watched under Zoom: the hold reads as framing, never as drift.

- **Polish round 22 (Opus 5.5).** Each frame's render cost timed through the show: the slow outliers moved between
  runs and came on `origin/main` too, so they are headless Chromium's, not the show's. Then guards: the recent rounds'
  fixes (Zoom's margins, the balloon's crown under Zoom, her face at each beat and never snapping, resting on the
  slope) had no check, so a later edit could undo them unseen; each is now in `check:shows`, its threshold just
  outside what the show measures today, and two were proved by undoing their fix (both failed). Writing them found the
  nursery is a second place the staging fills the Zoom frame (the two of them nine tenths of its width apart).

- **Polish round 23 (Opus 5.5).** Two lenses not tried before, nothing to change. A phone held upright with Zoom on
  (the tall shift and Zoom's hold together, until now looked at only one at a time): both of them in the frame
  throughout, the sky and the roofs over them. And contrast: each of them against the background just outside their
  outline, once a second: the lowest ratios (Carl's blue on the maroon armchair, Ellie's greyed coral on the autumn
  hill) are brightness alone; the ink outline and the hue carry every one, and her greying is the years, as meant.

- **Polish round 24 (Opus 5.5).** The camera's motion, the nearest thing to real speed without a viewer: its change of
  speed sixty times a second, pan and zoom, cuts and the toll aside. The show's own is gentle (its sharpest 1.6 frame
  heights a second squared, in the tyre's push in). Under Zoom it spiked to 33, every tenth of a second: Zoom's hold
  (round 20) was read in straight lines between its samples, so the frame's speed changed at each, a small judder,
  and smoothed over too short a window. Now it is smoothed twice and read along a Catmull-Rom curve: its sharpest 2.3,
  at the show's own sharpest moment, as a frame half as close again should be; the margins and the crown hold as
  before. A check holds it to twice the show's, and fails if the straight lines come back.

- **Polish round 25 (Opus 5.5).** The checks' cost, since `check:shows` runs inside `npm run build` and the recent
  rounds added scans to it: those cost about 3 s together; the balloon's jump scan alone was 40 s of this show's 49,
  a sixth of the whole suite, each of its samples averaging 61 knot positions over again. The balloon's lag averages
  them on a fixed grid, so consecutive moments share all but one or two; they are now remembered per show
  (`anchorCached` in `cast.ts`), exact by construction (a frame at the bedside renders pixel for pixel the same).
  This show's checks take 6 s, and the whole suite 153 s instead of 249; each frame's balloon is cheaper too.

- **Polish round 26 (Opus 5.5).** The notes audited against the show, scene by scene where these rounds changed it:
  the kiss (no step in on his lean; her face up to his), the tyre (seen flat), the dance (her face on him through
  the turn-out), the fieldstone (her face turning to him), the ward (her bed her length, the covers, the gathered
  string, the lower framing) were still described as before; and a known limit described a Zoom rule the hold
  replaced. Each is rewritten, the real Zoom limits listed (the nursery, the ward, the crown's sliver on the steps),
  and the ward's camera comment told of the gathered string.

- **Polish round 27 (Opus 5.5).** A third critic, briefed only on story and feeling against the film's montage; it
  found the wedding, the fix-up, the yard, the jar, the ties, the tickets, the ward and the ending all land, and three
  beats that fall short, all taken. The funeral: her photograph was a dull card that never registered and he never
  turned to it, the only hard beat with no gesture from him; now it is larger, faintly coloured as on their wedding
  day and warmed by the dawn, and on the floor he leans to it before he walks (the aisle a touch quicker, 0.65 cells a
  second, the toll unmoved). The baby cloud: the look between them was missing; now she turns to him and he leans to
  her, and she looks back up for the match onto the mobile. The hill: the tickets, set up as his surprise, dropped out
  of the story at the fall; now they spill from the basket as it lands and lie on the slope as he hurries down.

- **Polish round 28 (Opus 5.5).** Last round's changes audited closely. The spilled tickets slid across Carl and were
  drawn in front of him for a third of a second as they came out (clearest under Zoom); they lie on the ground, so they
  are drawn behind the two of them now, in the part's own layer with the fieldstone, and he passes in front of them.
  The wedding photograph on the funeral's easel took a hint of their colours; its copy over the dance had not, though
  the notes call it the same picture: now it has too, and over the dance it reads as the two of them.

- **Polish round 29 (Opus 5.5).** The story critic re-watched its three beats after the changes: the funeral and the
  tickets land; the glance under the baby only partly, too short to catch at the show's framing. She now turns to him
  as his start ends and holds about a second (from about 0.6), looking up again for the cut; his lean answers and is
  let down over a third of a second (moving the glance's end had left it a snap before the cut, caught by measuring).
  The tickets come to rest sooner, while he is still moving, so they no longer seem to follow him down. Zoom cuts the
  baby's head there, a limit now listed. The PR's stale screenshots were re-taken.

- **Polish round 30 (Opus 5.5).** The gestures these rounds added were timed by eye, not to the music. Now each is
  on a note and a registered strike, so the music check holds it: under the baby cloud her turn to him completes on bar
  44's downbeat (it already did) and his answering lean arrives on the strongest note between (62.305); at the funeral
  his lean to her picture arrives on the piano's note at 192.569; on the hill the first ticket slips out on the fall's
  strike and the second on the next onset (174.916). 258 strikes in all.

- **Polish round 31 (Opus 5.5).** The share card still matches the show at 47.3 s pixel for pixel (checked, since her
  gaze's blending changed after it was made). Then the shared code this PR touched, reviewed against `origin/main` for
  the other shows: with `tall` and the Zoom offsets left out, every stage, card and export is as before. One hazard:
  the arithmetic from a framing to Zoom's frame was written out four times (the stage, and three of this show's
  checks), so a change to one could leave the checks measuring something other than what is drawn. It is one helper
  now, `zoomFrame` in `registry.ts`, used by all four; the stage's contract check asserts it instead of the old text.

## Known limits

- In the named reveals (the house made new, about 10 cells; the storm, about 17) the two of them are small. It is
  scale on purpose, and each is held to its window by the check.
- The tree stands in a different place on the hill in each season (left of the crest in summer, at the top of the
  path in autumn). Only one season is ever on screen, and each is framed from a different side, so it reads as their
  tree both times; a wide that held the summer place and them years later needs about 9.5 cells.
- Under Zoom (`zoom.ts`) the two of them are held off the frame's edges, but in two places the staging fills the Zoom
  frame and they come near an edge for a few seconds: the nursery (him at the winch, her on the cradle, nine tenths
  of its width apart) and the ward (the balloon over them, the two of them under it). On the home steps, as he starts
  up (203.9 s), the balloon's crown is cut by a sliver under Zoom (0.07 of the half height). Under the baby cloud
  (60 to 63 s) the baby's head is above the Zoom frame: from their feet to its head is taller than the Zoom frame, so
  Zoom keeps them; the show's own frame has it whole.
- The camera's one blow (the toll) is 1% of the frame; it is felt in motion and invisible in a still.
- Only Chrome on macOS has been watched. The YouTube cue's sync, Safari and a recording export have not been
  measured for this take.

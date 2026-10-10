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
  aisle, the doors fly open as Ellie reaches them, and they run out under the bell at 1.6 cells a second, he leaning
  into the run with half his kiss lean and skipping a little onto each of the waltz's downbeats, upright for the cut.

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
  20, so the box stands clear on its post; she springs back to it off the cart's tail. She gathers, wide, and leaps
  over him, drawn out along her flight (`leapShape`), landing wide on 23's two (40.77, the strongest attack of the
  phrase and the first waltz's second-loudest swell), and leads up the steps; he follows a bar behind. On the soft bars 29 to 31 they sit in the two armchairs at the bay
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
  third beat before it, the waltz's pickup, when the plank, held half down under his weight since the stroke, kicks
  up and throws him), and the cup end
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
  she sinks, and slides back limp the short way she climbed onto the fieldstone's worn top, her face down and not
  rolling with her (a ball that rolls back reads as play), down in a little over a second and a half, and is still,
  slumped (lower, wider: `slumpOf`), spent; and a cloud comes over the field (`overcast`). No bounce. The strike is
  the basket, thrown off his top as he lurches toward her; it lands up the path, on its side, and stays there, and
  its lid jolted open, the two tickets slip out and slide away down the straw, the surprise he never gets to give
  her, lying on the slope as he passes. Struck, he straightens up out of the slope's lean and stands still for most
  of a second, watching her go, so she is seen
  to fall first; then on the next strong note (175.409, the one the basket tips over on) he bolts down after her, faster than he has gone in years, up out of the slope's lean and
  into the run, bounding a little each stride (`RUN`, `runTilt`: tilted with the slope, a square going downhill
  read as tumbling), the camera hanging back so he is seen to cross the frame to her, in close with them (2.4 to 1.9
  cells, the basket left out of the frame), and comes onto the stone beside her three quarters of a second after she
  has come to rest, so for a moment she lies there alone. He leans to her; she answers with the smallest roll toward him, lifting
  only partly out of her slump, her face turning to him, and looking at him across the cut into the ward, where the
  slump eases out under the covers.

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
  leans to it, the lean he gave her in the office and at her bedside, taking over from the lean he got down with,
  deepening on the piano's note (192.57) and held; then he walks the aisle at an old man's pace (about 0.65 cells a
  second), his top lingering toward her as he goes, into the porch, where the bell's rope hangs. As it is pulled the camera rises
  and widens with it, and **the bell tolls once, on the cue's strongest onset (197.71)**, the whole empty church in
  the frame from the organ to the steps, and the toll is felt through all of it: the organ's pipes ring gold with it, as they went on every note
  of the march, and fade as the bell dies away; the balloon swings aside on its string and sways back; he starts; and
  the frame itself takes the blow, a small damped drop that settles in half a second (the only one in the show).
  Dust sifts down. The answer, as the bell swings back, stirs them again, less. He goes out in the silence and comes to rest at the foot of the steps.

### Alone (201.94 to 258 s): the house, from the street, at dusk

- The church's steps become his own front steps: a match cut. The house is faded, the roof patched where the tree
  came through.
- On the piano's notes he climbs the three steps, one careful step at a time (gathering himself, lifting, then
  shifting onto the tread: a climb, not a hop, `climbUp`), the camera close (3.5 cells) on the
  steps, the door and the porch rail, the mailbox's faded handprints at the frame's edge. The latch; as it gives he
  draws the balloon's string in short (`GATHERS` in `life/cast.ts`), so it comes in under the lintel with him before
  the door shuts and passes the wall between the door and the bay at his side; the door, and the camera widens as he
  goes in. In the bay he lets the string out again, before he ties it. The bay's glass runs down to the room's floor, so he is seen whole through it,
  and its middle light is one pane from head to floor, so no bar crosses the balloon over her chair. He ties the
  balloon to her chair, so it floats over the empty seat. He climbs into his, as onto the steps, and settles heavily,
  and leans to put the
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
extra height, used only by this show). There the frame is about 220px high, and at a hundredth of it the roles were
4px and the cast's lines 9: the cards keep a least unit of 4.5px (`TitleCard.least`, also only this show's), so a
role reads at 8.6px and a name at 25, and the widest card, the cast, is under three quarters of the screen.

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
- **Contact:** his square and her ball never overlap by more than 0.02 cells while she is with him.
- **The slump:** on the fieldstone, before her answer, she is drawn at most 92% of her height and at least 1.2 times
  as wide as high.
- **The hill's hurry:** while he runs flat out (175.0 to 176.2 s) he keeps moving toward her on screen, at least 3% of
  the frame's width a second, under Zoom too.
- **A phone held upright:** wherever the house's inside is on, a stage as tall as 9:21 sees only the sky and earth
  the set paints round it (`INSIDE_SPAN`), even at the storm's wide.
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
    edges (`zoomDrop` and `zoomSlide`) without pushing the topmost of them or the balloon's crown out. Before the
    credits Zoom eases back to the show's own frame (`zoomFull`, `zoomFullAt` in `house/alone.ts`), which the cards
    are set over. Each is read through `zoomFrame` in `registry.ts`, by the stage and the checks alike.
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

- **Polish rounds 6 to 38 (Opus 5.5, one director, PR #163).** Rounds of audit and fix, each logged in that PR's
  description and in git; what they left, by area (the scenes above describe the show as it now is):
  - *Story and staging.* At the funeral her photograph is larger, hand-tinted with their blue and coral (as is its
    copy over the dance), warmed by the dawn, and he leans to it before he walks. Under the baby cloud they look at
    each other (`GLANCE`); on the blanket she lies close, looking up. The tickets spill on the hill. Her bed is her
    size, the covers over her (`drawCovers`). Her face is steered where the story needs it and never snaps (`LOOKS`,
    `lookOf`). The balloon is carried short through doors and into the ward (`GATHERS`); the flat tyre is seen flat;
    at the kiss he no longer steps in on his lean; on the hill's slope they rest on it, not in it (`seat`). The new
    gestures are on measured notes and registered strikes.
  - *Framing.* On a phone held upright the extra picture goes above (`Performance.tall`). Zoom has the parts' holds
    (`zoomDropAt`, `hospitalZoomDrop`, `fixupZoomDrop`) and its own (`zoom.ts`: off the edges, the crown kept,
    smoothed twice and read along a curve), eases back to the show's frame for the credits (`zoomFullAt`), all read
    through `zoomFrame` in `registry.ts`. Overview frames the place in play (`Performance.overview`, `LifeShow.place`).
  - *Checks.* His square and her ball never overlapping; Zoom's margins, the crown under Zoom, Zoom's gentleness, her face at each beat and never snapping, and
    resting on the slope; the fragile ones proved by undoing their fix. `anchorCached` made the suite 96 s faster.
  - *Lenses tried*, so a later pass can choose a new one: contact sheets; full-size stills; frame differencing for
    pops (repeated after the motion and camera work: the same fifteen spikes, all cuts, the flash, the lightning and
    the lamp); each cut before and after; Zoom; a phone upright, and with Zoom, and again after the motion and story rounds (the cloud over the
    field covers the whole tall frame, no seam at the 16:9 edge); an ultrawide 21:9 stage, with and
    without Zoom (the sets run on past their walls into sky and floor, no voids; Zoom's vertical framing is 16:9's), and
    a 4:3 tablet; a 2x (high-DPI) screen (the stage's canvas at full density, line weights in proportion); a hidden
    tab (simulated: no frames and `document.hidden` for 10 s; YouTube plays on and the picture is in step at once
    on return), and hidden across the music's end with timers throttled to once a second: the show runs on to
    4:18 and YouTube stays quiet, also with its restart forced while hidden: with nothing asking the show, YouTube's
    own time showed it paused at its start within a second, so the player's background timer catches it; the
    keyboard with YouTube on (Space plays and pauses with the music in step; Z and O toggle Zoom and Overview while it
    plays, the music undisturbed); a drag of the scrub bar while YouTube plays (it pauses the show, as the player is
    built to; on play the music goes to the picture and they run in step); taps on the stage of an
    emulated phone with YouTube on (play, pause, play, the music in step; the panel tucked away, the stage whole); the balloon's crown; contact with floors and
    slopes; stillness; gaze, as a whole and beat by beat; strobing; the camera's acceleration; render cost; contrast;
    three fresh critics (frames, regressions, story) and a story re-watch; the notes against the code; the shared code
    against `origin/main`; the credits under Zoom; Overview; the exports, and a real video export; the console; the full `npm run build` (every suite and the bundle; Vite's chunk-size
    notice is `origin/main`'s too); the
    player's speeds; her face through the doctor's office and into the yard (up toward the coat before the news, then
    turned away from him as she rolls away, and still turned away across the cut; kept as it is: a downcast look as
    well would have to turn down and back up within three seconds to meet the cut without a snap).
  - *Considered and kept.* Ellie stands before the open front door's leaf at the tickets (past it she leaves the Zoom
    frame through the press's push-in). The balloon is hidden half a second at the bay's post, while he is too. The
    tilted car is not in front of the window's bar (a critic's false alarm, checked in the pixels). The climb is not
    restaged so he finds her far below. At the funeral he does not step toward the easel before his lean (the aisle's
    pace allows no more). The aisle is 0.65 cells a second, from 0.58, to keep the toll on its note. Render-cost
    outliers are headless Chromium's, not the show's.
  - *Motion* (a motion critic, from filmstrips at 12 to 24 frames a second). Taken: his lean to her picture held and
    let go with drag as he walks (it had been a wobble that never held); Ellie's leap at the mailbox gathered, drawn
    out along its flight and landing wide on its note (`leapShape`); old Carl climbing his steps and his chair as a
    climb (`climbUp`), with a gather before each step and a heavier settle. Then the other three: his hurry down the
    hill, a frozen beat on the strike and a burst to twice his old speed, gaining on her as she rolls, leaning into
    it with a stride's bob (`RUN`); his run down the aisle, half his kiss lean kept as a lean into the run and a
    bounce on each downbeat, upright again before the cut; the seesaw rising only half way under his weight and the
    rest as he takes off, so the reset launches him (`leaveAfter`). The critic re-watched all six: the funeral lean and
    the leap move well; the first climb popped up and hovered beside the tread (a regression), now a rise eased at
    both ends with the shift across from a tenth of the way, up and over the nose; the hill's catch-up front-loaded
    so it is seen while she rolls; a small bound before each downbeat of the aisle run; the seesaw's kick a moment
    before he leaves, so it throws him; the funeral lean deepened on its note so the arrival is felt. A third re-watch:
    the steps, the chair, the aisle and the funeral bow move well; the hill now runs flat out and arrives as she
    comes to rest (it had crept for 1.4 s, then, front-loaded, it ran into her as she settled), still beside her to
    his lean; the seesaw's kick is fast at its start and begins 0.1 s before he leaves, so the plank carries him off;
    the bow has a small settle in it. A fourth: the seesaw throws him; the hill arrives cleanly but reads as a
    determined pace more than a dash (she rolls back at nearly his speed, and the camera follows him), so his stride
    is stronger; and the camera lags his run (a key at 175.9, `LAG_X`), so he crosses a fifth of the frame toward her
    while he runs flat out, and it settles on the two of them as he eases onto the stone. (A first lag caught up at his
    own speed mid-run and stood him still on screen for 0.3 s, read as hesitating: measure on-screen speed, not only
    its sign.) Re-watched: a dash, then an arrival, in the show's frame and under Zoom. Kept: under Zoom, while the
    frame hangs back (about 175.7 to 176.4), Ellie and the stone sit near its right edge for under a second.
  - *A first-time viewer* (a fourth critic, told nothing of the changes): the show holds together, the arc builds,
    nothing jars; strongest the bedside to the lit house, weakest the grey yard. Taken: on the fieldstone she lay
    round and upright, eye up, like someone sat down for a breather; she now slumps (`slumpOf`: lower, wider), looks
    down, spent, lifts only partly to answer him, and the ward takes the slump up across the cut and lets it go under
    the covers. The yard's grey lifts from 90 s, with his walk out, instead of from 95. Re-watched by the same viewer:
    both land (the slump reads as "she can't go on", the ward takes it up naturally). Optional: dimming the
    autumn light from her fall, then tried and kept (`overcast` in `hill/climb.ts`): a cloud's shadow over the field,
    dimming and cooling over two seconds from her fall and held to the cut, leading into the ward's dusk. Re-watched:
    felt as the light going out of the place, the two of them still clear; the cut into the brighter ward reads as a
    change of place (its window's gold to night carries the fall of light on), so the overcast is not eased out before
    it, which would undo the beat; 20% is the right strength (any more reads as a grade over the shot).
  - *A viewer who has never seen Up* (a fifth critic, told nothing of the film): the whole arc reads from the
    picture alone, the wedding to him alone at the end. Its confusions were mostly the machines, which are the
    premise: the jar's mechanism (that each mishap costs coins), the doctor's office (no one there), the tie wheel,
    the ticket press (read briefly as a slot machine), the engine on the hill. Taken: his bandage, a sliver, now a
    taller band with its wraps crossing it. Considered and not taken: making the jar's losses literal, which would
    restage the show's central machine.
  - *Speeds with YouTube.* 0.25x to 2x exact; 4x ran at 2x (YouTube plays no faster, the show follows the music,
    and with the mp3 out of the repo there is no file to fall to). Now, past 2x with no file, YouTube sits out:
    silent, no say in the clock, which runs at 4x on the wall; back at 2x or slower it comes in where the picture is
    (`sittingOut` in `soundtrack.ts`; every YouTube-only show gains it).
  - *A phone held upright* (contact sheets at 9:19.5, and a scan of every second for full-width edges in the top of
    the frame). At the storm's wide the house's sky stopped 40 cells above it and a flat grey band showed over it,
    the rain falling across the join; the set now paints 160 cells up (`INSIDE_SPAN`), and a check holds a 9:21
    stage inside it. The scan's other edges are floors, ceilings and the autumn hill's cloud bands, wider than an
    upright frame, which read as strata.
  - *Lenses that found nothing.* A phone on its side (about 21:9, every second scanned for full-height edges: only
    walls, door frames, the coat stand and the porch posts). Motion, every frame at 30 fps diffed against the last:
    away from the cuts the only jumps are the wedding photograph's flash, the two lightning strikes and the lamp
    coming on at home, each on purpose. The share card (47.3 s) is pixel for pixel what the show draws now. The
    credits on a phone, upright and on its side: set in the sky, clear of the house.
  - *Determinism.* 120 times across the show drawn going forward, going back and in a shuffled order: every pixel
    the same, so a scrub, a seek or a jump draws what play would. And the live stage, after playing a stretch, paused
    and sought to 15 times, against `still` at the same times: every pixel the same, so the audits' stills are what a
    viewer sees.
  - *WebKit* (Playwright's WebKit 26.6, Safari's engine, headless). The picture: 17 frames across the show against
    Chromium's, at most 0.12% of pixels apart (edge smoothing). The player on the deployed preview: the show starts
    on its own with the sound held and the Sound button up, Space lets it in, the arrows step and pause, Space plays
    on, Home goes to the top, nothing in the console. Found: WebKit refuses sound to the YouTube player for a press
    made on the page (the player says it plays, its time stands still), and the player dropped that answer: the
    Sound button went, the show ran on silent on the wall, with nothing left to press. Now every way of letting the
    sound in (`joinSound` in `player.ts`) holds it again on a refusal, muted so YouTube still keeps the time, with the
    Sound button back (Chromium made to refuse the same way did the same before, and does the same after). Whether
    Safari itself, with a speaker and a person's press, refuses as headless WebKit does is not known.
  - *An iPhone* (WebKit with Playwright's iPhone 15 Pro: touch, its screen, upright and on its side). A tap on Sound
    is refused as on the desktop and the button is back within two seconds; speeds, taps on the stage and a seek to
    the end behave; nothing is wider than the screen. Found: on its side with the panel up, the stage is about four
    times as wide as high, the composed frame stands in its middle at full height, and the Sound button, centred low,
    covered the two of them at the altar in the opening shot. Where the world beside the frame has room (150 px or
    more), the button now stands there instead (`besideFrame` in `player.ts`, every show; an ultrawide screen too).
  - *Theater* (every show, shuffled, one after another). Out: from 252 s the credits play out, Theater moves on to
    the next show, Married Life's YouTube player is gone and the next one drives its own clock at 1x, with the sound
    held or let in. In: arrived at after 18 skips through other shows, its music comes in with it and keeps time
    from the first second. And on an ultrawide screen (2560 by 1080) the held Sound button stands beside the frame.
  - *A fresh frame critic* (told nothing of the rounds; six dense sheets and close stills). Taken: as he comes in
    at home (211.3 to 213 s) the balloon showed a slit of blue between the bay's corner post and the wall beside it
    (the wall began 0.03 cells right of the post), so it read as sliced, not hidden; the wall now meets the post.
    Kept: at the door (209 to 211 s) the jamb is the line indoors begins, and he and the balloon pass behind it
    together while what is still outside stays in front of the wall, the rule of the whole homecoming; at 200.67 s
    he is mid step down from the church's floor (0.22 cells a step); at 91.7 s the book is in front of the screen
    door's frame as he carries it out through it.
  - *Slivers*, after the post's gap: every 0.2 s through the wedding, the fix-up and from the ward to the credits,
    a scan for strips of her coral or the balloon's blue three pixels wide or less and ten or more tall (what the
    gap showed). Found only edges past a bar the thing is behind (the door's jamb, a mullion, the bay's post as the
    balloon comes into the bay) and the edges of the orange guests in the pews: no gap left.
  - *A fresh Zoom critic* (the first under Zoom). Nothing severe; kept: the balloon hidden for a moment as he goes
    from the door behind the wall into the bay, and Ellie the same at the fix-up's door (43.0 to 43.2 s), as above;
    on the hill under Zoom the basket he drops leaves the top of the frame as the camera follows the two of them down
    (174.5 to 175.2 s), the tickets it spills staying in; in the show's own frame it is whole.
  - *The credits on a phone*, measured: upright, the roles were 4px, the notes under 4 and the cast's lines 9. Floors
    for every show's credits were tried first and taken back: two other shows' cards are set off the middle, so on
    a phone they ran off the screen, and slid back on they covered Merry-Go-Round's castle and crowded Soft Lamp's
    window. Now a card may ask for a least unit (`least`), and only this show's do; every show's cards checked on a
    phone at every second still fit the screen. A colour barcode of the show (a column a half second) found the arc
    whole: no jump of light or colour inside a scene but the storm's.
  - *A fresh story critic* (contact sheets in order, the story written back beat by beat first). It told the whole arc
    back right. Taken, its first note: on the hill her give-way read as the two of them sliding back down, the picnic
    gone wrong, not as her failing; her face rolled with her down the flank (nine radians), like a ball at play. Now
    from the give her face is held down (`LOOKS`, `spot`) and she slides back limp, slumping as she goes, into the
    fieldstone's look; checked: her face turns under a fifth of a radian while her roll would turn it more than one.
    Considered and kept: the yard's long push of the book and the short pop-up (the walk is one walk on the music);
    the three takings of the jar (the premise's machine); her death told by the ward's light going (understatement);
    the ties' wheel and the slow homecoming (the years, and mourning).
  - *The fresh story critic's re-watches of the hill.* After her face was held down: the turn landed at her give-way
    at full size ("she went limp"), but he came down with her at her speed, tilted with the slope, and read as
    falling too. Taken: he stands struck still for 0.8 s watching her go, then runs upright, leaning forward with a
    bound each stride, and comes onto the stone after her; her slide is quicker (1.6 s from 2.3; she crept on), so
    she lies still and alone a moment before he comes. Re-watched: "she fell and he came after her", at full size
    and at the sheet's scale; its one note, that standing still on the slope's lean he looked stopped mid-tumble, taken
    (struck, he straightens up). The run's on-screen check moved past his stillness (175.75 to
    176.4 s); a check holds her on the stone at least half a second before him.
  - *After the hill's restaging*, under Zoom and on a phone upright: he stands struck still high in the frame while she
    goes down to the stone, then runs down to her, both whole in the frame throughout. The story critic's other
    notes, looked at again: the flat tyre is staged (the camera pushes in to the window, the tyre goes with a puff,
    the car sits tilted while the jar is spent and is level after); a sheet a frame every 1.4 s steps over the
    puff, viewing speed does not.
  - *The restaged fall, on the music.* Her coming to rest (176.272) already sat on a measured onset (176.274); his bolt
    came 60 ms after the next strong note (175.409, strength 0.71, the basket's tip). His stillness now ends on it: he
    bolts on the note, with the basket's tip (a check holds him still to it and moving after).
  - *A whole play on the deployed preview, after the player's changes* (Chrome, YouTube, real time, the clock read
    every second): 0:00 to 4:18 in 259 s of wall, never backwards, never held three seconds, within a second of the
    wall throughout (the clock's own resolution), no warning on the page, nothing in the console but YouTube's own
    start-up note; the credits over the sky, and at the end Replay under the house, over the light on its walk.
    The yard's pop-up, looked at again: the book opens on the note, she perks up and leaps to it, and they carry it in
    open as the phrase turns (about two seconds of it); the dream goes on in the jar's own picture, so it is kept.
  - *The nursery and the ward, close.* The nursery clean: the winch lifts her shelf, the mural grows sky, birds and
    hill, the two of them at the cot at the end. The ward's last seconds clean: the camera draws back as the window
    goes to night, the balloon over her. Considered and not taken: closing her eye at the end of the ward, so a first
    viewer sees the moment she dies; the film itself cuts from the ward to the funeral and never shows it, and the
    show keeps to that.
  - *A slow device* (Chrome with the CPU slowed four times, 1280 by 720 at 2x, playing; the time each frame's drawing
    takes): the storm the heaviest (11 ms a frame on average, 27 ms at the 95th), then the clouds and the ties (about
    9 ms, 20 to 23 at the 95th); the fix-up, the hill and the credits 3 to 5 ms. Unslowed, the storm is about 3 ms. So
    on a slow phone the storm may drop the odd frame, never a run of them. A profile spread the time thinly; p5's
    parsing of colour strings looked the largest single share, but a cache of parsed colours (pixel for pixel the
    same, 24 frames) bought nothing measurable, so it was not kept.
  - *A second viewer who has never seen Up*, after the hill's restaging (contact sheets, the story told back first). The
    whole arc came back from the picture alone: the wedding, the house made theirs, the baby wished for and lost
    (about 75% sure, on the cut from the nursery to the cold corridor), the dream of the falls, the savings and the
    setbacks, the years, the tickets, her failing on the hill ("she can't make the climb"), the ward, the funeral
    mirroring the wedding (its strongest beat), him alone. Its confusions were again the machines: the arm that takes
    the jar (the premise's, kept), how he came off the ladder, the tie wheel, the ticket press. One looked checkable:
    whether the jar is emptied; at full size it is (before the first taking the coins are up behind its picture,
    after it the jar is bare with new coins dropping in, and it is full again before the second), so kept.
  - *How he came off the ladder* (both viewers unsure). In the show's own frame the motive is there: the lamp goes out
    over the ladder, he climbs and reaches for it, the ladder kicks. Under Zoom it was not: the lamp stood above the
    Zoom frame the whole time, so he climbed toward nothing and fell. Now Zoom eases out to the show's own frame over
    two seconds as the lamp goes, holds it while he climbs, reaches and the ladder kicks, and comes back in over two
    as he falls; a check holds Zoom out from the lamp going to the kick.
  - *Under Zoom, every beat that turns on a thing* (fourteen, side by side with the show's own frame: the peal, the
    rollers, the pop-up, the tyre, the taking, the storm's limb, the tie wheel, the press and its painting, the
    tickets on the slope, the balloon given, her portrait, the balloon tied to her chair, the lamp at home). All whole
    but the first setbacks: the flat rear tyre went off the frame's left and the jar off its right (the beat is set so
    the tyre goes in one still frame with the jar it will cost), and the arm that tips the jar out of it. So Zoom's
    ease out now starts two seconds before the tyre and holds through the taking, the car driving off and the lamp,
    back in over two seconds as he falls (`setbacksZoomFull`, `jar.ts`); the check holds Zoom out from the tyre to the
    kick, and a 30 fps scan of the ease found no pop.
  - *The second and third takings under Zoom* (the two the beat audit left out). The second (125.2 s): Zoom comes back
    in after his fall onto the bandage, and the jar is half off its right edge as she walks the mantle to it, but it
    tips into the frame (whole by 125.4) and the arm follows it in (125.8): kept. The third is inside the storm's wide,
    the jar small but in frame.
  - *Him "dangling" from the tie wheel* (the second no-Up viewer). At full size he stands on the floor's plate under
    the wheel in the morning's collar and tie, the brass dropper over him; only at a contact sheet's scale does a blue
    square in a collar and tie look like one of the ties hung on the wheel. Kept.
  - *Slivers under Zoom* (the scan run again under Zoom, every 0.2 s through the wedding, the fix-up and the ward to the
    credits: half as close again, any gap twice as wide). Only edges past a thing in front: the balloon at the door's
    jamb and the bay's corner post (its outline whole either side), Carl behind a porch post, the mailbox's red flag,
    her trail, the orange guests. No gap.
  - *The setbacks' Zoom ease on a phone held upright*: the tyre, the jar, the arm that takes it and the lamp he climbs
    to all in the frame, the nursery and the roof in the extra picture over them.
  - *Not measured.* The YouTube cue's sync at real speed, by ear.

## Known limits

- In the named reveals (the house made new, about 10 cells; the storm, about 17) the two of them are small. It is
  scale on purpose, and each is held to its window by the check.
- The tree stands in a different place on the hill in each season (left of the crest in summer, at the top of the
  path in autumn). Only one season is ever on screen, and each is framed from a different side, so it reads as their
  tree both times; a wide that held the summer place and them years later needs about 9.5 cells.
- Under Zoom the first setbacks (the tyre, the jar's taking, the lamp he climbs to) are kept in the frame by easing Zoom
  out to the show's own frame (110.5 to 122.7 s).
- Under Zoom (`zoom.ts`) the two of them are held off the frame's edges, but in two places the staging fills the Zoom
  frame and they come near an edge for a few seconds: the nursery (him at the winch, her on the cradle, nine tenths
  of its width apart) and the ward (the balloon over them, the two of them under it). On the home steps, as he starts
  up (203.9 s), the balloon's crown is cut by a sliver under Zoom (0.07 of the half height). Under the baby cloud
  (60 to 63 s) the baby's head is above the Zoom frame: from their feet to its head is taller than the Zoom frame, so
  Zoom keeps them; the show's own frame has it whole.
- The camera's one blow (the toll) is 1% of the frame; it is felt in motion and invisible in a still.
- Only Chrome on macOS has been watched; Safari's engine has been measured headless (above), Safari itself not. The
  YouTube cue has, on the
  deployed preview in Chromium (PR #163): it loads, plays, and drives the show's clock in real time (10 s of show in
  10 s), with no fallback; whether picture and sound feel in sync to a listener is still for a person to judge.
  A full play there found that, at times, YouTube started the video again from the top as it ran out, a moment before
  the cue's end: the picture froze at 4:10 under the song heard again, and the credits' last eight seconds never
  came. `youtube.ts` now treats a time gone back more than two seconds near the end as the cue run out (forced in a
  test: before, frozen; after, the wall carries the show to 4:18 and YouTube is paused). A
  recording export has (headless Chromium, PR #163): it runs the whole 258 s with the credits painted in, silent (no
  `src`); at 1080p headless rendered 15 frames a second, a software limit, not measured on a machine with a GPU.

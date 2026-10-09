# Come Recover, All at Once

The recording is copyrighted. This take is a private tech demo only; do not ship this audio in a public build.
Nothing here claims any right to it.

The music is Son Lux's *Come Recover (Empathy Fight)*, the finale cue of *Everything Everywhere All at Once*
(Daniels, 2022). The attribution is in `apps/rube/src/shows/versions/come-recover/ATTRIBUTION.txt`.

Open it at `/shows/come-recover/`. In the Shows picker it is the work **Everything**,
whose one take is **Opus 5.5**. A work with one take has no Version row, so the panel reads "Everything · Opus 5.5".

## What it is

A Rube Goldberg machine plays the cue from its first sample, 5:32 in all, with the end credits over its quiet tail.
It is one ball on one path through many worlds.

- **Evelyn** is the vermilion ball (`#E4572E`). She is in every world, and every machine is hers to make go.
- **Joy** is the violet ball (`#8A63D2`), her daughter. She is also Jobu Tupaki.
- **Waymond** is the jade ball (`#3F9A82`), her husband. He is kind, and he wears a googly eye from the first frame.

Evelyn is given her googly eye on the cue's great hit (191.2 s), when she chooses kindness. Joy is given hers on the
peak, as her mother pulls her back (254.5 s).

The film's three parts are the show's:

1. **Everything** (0 to 58 s): the Wang family laundromat at night.
2. **Everywhere** (58 to 166 s): verse-jumps through her other lives, to Jobu and the everything bagel.
3. **All at Once** (166 s to the end):
   - every world at once;
   - kindness;
   - the rocks;
   - the pull back out of the bagel;
   - home.

Every piece, world, palette and drawing is new for this take. Nothing comes from Machine's worlds, from Liftoff, or
from any other take. The only thing shared with Liftoff is its plumbing: the part kit, the camera director, and the
page's credits and byline hooks.

## The cue

**Why Come Recover.** It is the film's own finale, the empathy fight, and it has the biggest arc on the soundtrack.
- It has a quiet, free first two minutes.
- A 150 bpm pulse arrives and builds to a fight.
- It drops to near silence.
- It swells back to the loudest passage of the cue.
- It settles into a long, quiet tail.

That shape gave the layout: the laundromat in the quiet, the jumps as it thickens, everything at once on the fight,
the rocks in the silence, the pull back on the peak, and the credits over the tail.

**The audio.**
- It was fetched once from the official upload (provided to YouTube by Virgin Music Group for A24 Music) with
  yt-dlp. Homebrew's yt-dlp got a 403; a current yt-dlp in a scratch venv worked.
- `scripts/shows/eeaao-cue.sh` cuts it to 0 to 332 s, fading over the last nine seconds. That fade is the only edit, so
  every onset is the recording's own.

**Its clock.** `scripts/shows/eeaao-onsets.py` measured the file once (numpy and ffmpeg) into
`scripts/shows/plans/eeaao-onsets.json`:
- **Every onset**, with its strength. The first 142 s have no steady pulse at all, only these.
- **Three combs** where the pulse holds, each fitted to the flux on its own phase. The drop at 200 s and the break at
  266 s each shift the pulse by a fraction of a beat. Strong beats sit on each comb within a few ms.
  - **The fight:** 142 to 200 s, beat 0 at 142.015 s, 0.39998 s a beat.
  - **The fall:** 200 to 266 s, beat 0 at 200.163 s, 0.39988 s a beat.
  - **Home:** 278 to 320 s, beat 0 at 278.205 s, 0.39986 s a beat.
- **Loudness** every quarter second. Parts use it for motion the music drives without striking: the dryer's drum turns
  faster in a swell, and the griddle's gas rises with it.

## How a jump works

`show.ts` is a `MultiverseShow`.
- The ball's path is cut into legs, one world a leg. Each leg's parts are laid from an entry cell the score chooses.
- At a jump the ball moves into the next world's cells, and the camera moves by exactly the same amount at the same
  instant.
- So on the screen the ball holds still while everything round it becomes somewhere else: a match cut on the ball.
  `seams.ts` says the ball's velocity and the camera's distance at each jump, so the parts on either side agree
  without seeing each other.

Before most jumps the next world bleeds through for a frame or two, the way the film's jumps do.
- The stage shows the next leg's world, with the ball carried into it by the jump's own offset.
- Each flicker starts 60 ms after an onset, so the leg going out is seen striking it first.
- There are two before a jump, on the last two onsets before it, so with the cut a jump stays under three flashes a
  second. Into the surf there is one: its own run of worlds, a new one on every hit, is flashing enough.
- Four jumps have none:
  - the first, which builds in the dryer's own glass instead;
  - the jump into the dark, where the surf's worlds collapse into her on their own;
  - the fold home on the great hit, where the mosaic flips its own panels;
  - the drop into the rocks' silence, which is a clean cut.

Through every jump she is moving at, the ball draws out along its way for a few frames, most at the cut itself, as if
it went through something.

The camera takes the show's ten biggest hits in the body: a push-in of about 4.5% that eases back (`PUNCHES` in
`score.ts`). There are none in the rocks.

## In order

Times are show seconds. The fight's pulse is `fight(k)` (142 to 200 s), the fall's `fall(k)` (200 to 266 s) and home's
`home(k)` (278 to 320 s).

### Everything: the laundromat (0 to 57.9 s)

| Time | Music | What happens |
| ---: | --- | --- |
| 0 | the chord | The Wang family laundromat at night, a lit box on a dark street, with a red neon washer in the window. On the chord's eight onsets the fluorescent tubes blink and catch, the one over Evelyn first. In the silence Waymond sets a slumped, googly-eyed laundry bag back on its bottom. |
| 7.93 | the entry | She rolls onto the foot lever of the washer by the door. Four quarters drop from the coin column on the next four onsets, and the washer fills, spins up and walks toward the lever. |
| 12.79 | the great hit | The washer jumps and slams onto the lever, and she is thrown across the shop into a heap of receipts. The receipts storm up and come down onto the spike, the audit letter last (16.78). |
| 19.8 to 30 | the soft run | The taxes: she works the adding machine's long keyboard, rolling to a key on the long gaps and bouncing key to key on the quick notes, twenty strokes. On each one the crank ratchets, and the tape curls down the counter's end into loops on the floor. Joy comes in on the door's bell (20.19), crosses the shop, and stops right below her mother (23.74), leaning up toward her. Her mother does not look up. Joy turns and goes on the bell (29.37), and Waymond edges after her. |
| 30.65 | two accents | The crank slams to the total and throws her into the lantern hanger's basket (31.46). It rides the garland, and a lantern pops open on each onset. |
| 34.33 | the breath | The hanger hits its stop and tips her into the big dryer. For twenty-three seconds of swells she tumbles in the drum, which turns with the music's loudness. The camera pushes in until its window fills the frame. From 46 s other worlds show in the drum's bays: a red carpet's flashbulb, a dojo's lacquer, hot dogs, a raccoon's mask, the bagel's black. |
| 57.95 | the first jump | The door bursts, and she flies out through the circle into the flashbulbs. |

### Everywhere (57.9 to 165.6 s)

| Time | Music | World | What happens |
| ---: | --- | --- | --- |
| 57.95 | louder | the premiere | The red carpet of her own premiere. Press flash guns fire as she flies in, and she lands and bounces. The marquee's spotlight hunts over the press and finds her (61.06), and a volley of flashes whites out the frame. She clips a brass stanchion and the posts go over like dominoes, one an onset (63.1 to 64.3). The theatre's doors crack and swing wide on 66.21, and a second run of posts goes. |
| 68.7 | sustained | the alley | Behind the theatre, in the rain, the film's "in another life": a neon washer in a laundromat window stutters on (71.95), and Waymond waits under a streetlamp. She floats down the stone steps and reaches him (76.46). The neon dips twice, and the camera pushes in on the two of them. The drain's iron cover knocks under her four times and gives (82.13), and she slides away from him into the lit shaft. He rolls onto the shut cover where she was, and does not follow. |
| 86.30 | the flurry | the dojo | The kung fu picture she could have lived. Four wing chun wooden men trade her down their arms, tak-tak-tak, each arm swinging into her and ringing. A bo staff on a rope bats her over their heads, and a high kick sends her up to the bronze gong (95.42). A last kick is the jump. |
| 97.15 | flurry | hot dog fingers | A pink room and a grand piano, played with the feet. Her shin is posed as the dummy's thigh was. She rides and bounces up the keys, each dipping and blushing lilac as it sounds, into a hand of floppy sausage fingers that drapes over her. On 103.56 she lands on the mustard bottle and it squirts. The index finger sags under her and snaps on 106.73. |
| 106.73 | flurry | Raccacoonie | A teppanyaki chef who is a machine, and Raccacoonie inside the toque working the levers. The cleaver chops, and the spatula flicks her into the onion volcano, where she rattles like a lid. On 112.71 it erupts, and a shrimp tail is flung into the hat's pocket (113.69). In the breath the raccoon comes out under the brim and eats it, and in the last run an egg cracks on the spatula. |
| 120.95 | six big hits | the surf | One long flight, and a new world on every hit: a piñata party, a sign spinner on a street corner, the IRS office with its trophies, karaoke under a mirror ball, then a canyon, held, where two stones sit on a ledge in the foreground, faintly vermilion and faintly violet: the rocks, before we know them. Then flashes of every world she came through, backwards, and black. |
| 127.66 | two hits | the surf's end | Out of the black, every world she flew through comes back at her as slivers, clamps into a ring round her with a flash (127.66), spins, and collapses into her, down to a point (127.79). |
| 127.79 | the hush | the dark | She drifts down through the dark, seeds and salt passing at three depths, a sliver of colossal rim catching light below. On 133.79 a beam finds Joy, sitting still on the crown of the everything bagel. On 135.64 the whole bagel is lit, and the camera draws back until Joy is tiny on it. |
| 142 | the pulse | the pull | Everything drifts in on slow spirals and goes over the lip on the beats, one thing a beat: a coat hanger, a sock, a trophy, a dog. Each time the well's violet glow flares and the bagel throbs, hardest on the loudest beats, with dust kicked off the lip. Evelyn is drawn in on a decaying orbit, a step closer each bar. The camera rides the orbit with her, close, the crust streaming past and things going over the lip beside her, with a warm catch-light under her. On beat 56 the lip brakes her to the brink, and in the held break Joy watches from the crown. On 165.62 she tips in. |

### All at Once (165.6 s to the end)

| Time | Music | World | What happens |
| ---: | --- | --- | --- |
| 165.62 | a hit, then a swell | everywhere | She breaks through into the dark in a violet flare, seeds flung out round her, and falls slowly past them, and the laundromat comes up round her, its tubes flickering on. On `fight(72)` she lands on a seesaw and the frame tears into two panels: home and the premiere. |
| 170.8 to 190 | the pumping pulse | everywhere | The frame splits into 4 panels on beat 76, 9 on 88, 16 on 96, 36 on 104 and 64 on 112. Each panel is another world with her in it, the same seesaw in its own materials: 13 worlds, no two neighbours alike. She and the weight trade throws on every beat. |
| 190 to 191.2 | the crescendo | everywhere | The wall crowds to 144 panels, and the seesaw throws her high. On 121½ every panel flips like a card to another world. On 122 they all flip to the same place, the laundromat, and on 122½ the net of frames snaps shut round her. |
| 191.22 | the great hit | home | She lands alone, home, at the party, and the googly eye slaps onto her in a burst of warm light, its pupil whirling round before it settles. Jobu's jumpers are in the room, each rearing at her in turn: a boxing glove on a spring out of a gift box (125), a steel trap (128), a mallet from the ceiling (130), a scissor arm (133). On each one's beat a copy of her own eye flies off her and lands on it, and its blow turns gentle: a nudge, a squeeze, a scoop, a cradle. The arm sets her on the dumpling steamers, and she steps down one a beat to the table, touching Waymond on the fight's last hit (199.61). |
| 200.16 | the drop | the rocks | Silence. Two stones on a ledge over a vast canyon, lumpy and flat-bottomed, the colour drained out of them: Evelyn's with her eye, Joy's beside it, where Waymond was. Pebbles fall from the lip and take forever to land. Joy's stone teeters forward on its flat underside (207.56, 208.36) and rolls out to the brink (209.96). On 213.96, the strongest note in the quiet, it goes over. Evelyn rolls to where she was (214.76), flinches back (216.36), and goes after her (219.56). |
| 220 to 241.8 | a soft swell | the rocks | The long way down, on the beats, ledge by ledge, the camera drawing back until they are specks against the canyon. At the bottom a dark ring lies in the sand: the bagel. Joy drops into it, and on 241.76 Evelyn follows. |
| 241.76 | a breath | the dark | They fall into the bagel's hole. Joy is drawn up into its dark, shrinking and dimming, and Evelyn holds her at the lip. |
| 247.35 | the peak | the dark | A line comes down from a pulley high above: Waymond's. He drops as the counterweight, and on every beat the line turns the bagel backwards, a ratchet kick of the whole crust. On 118½ Evelyn heaves back, and on 122 Joy pops out of the dark. From 123 everything the bagel swallowed bursts back out of the hole, one thing a beat, last in first out, each with a googly eye, and a spray of seeds goes out on every eighth. On 136 an eye rises out of the hole and lands on Joy. The bagel shrinks as it gives, until its hole is exactly a washer's window, and the hole fills with glass light. |
| 264.14 | the peak's end | home | Through the window: they are inside the drum of the washer by the door, where the morning started. The cycle ends, the door swings open (268.39), and they drop out. Waymond leaps the foot lever and touches Joy, and the touch runs through to Evelyn. |
| 275.2 | a hush | home | The camera closes slowly on the three of them together at the washer's foot, the window's glow behind them, and holds. Joy nestles against her mother on a soft note (279.84). |
| 282.2 | home's pulse | home | The family portrait. A wooden box camera with a bellows stands on a tripod by the door, facing them. Joy and Waymond straighten up on two small hops. Evelyn rolls to a foot switch under the window and presses it on 286.20: a string of lanterns over the family lights one a beat, and the camera draws back to take in the whole portrait. The self-timer's red lamp blinks faster and faster while she hurries back beside Joy (290.38). |
| 290.99 | the last great hit | home | The flash: the bulb bursts, the room washes white from the camera's side with their shadows thrown on the washer, and a firework fills the door's glass with gold. The photograph ejects (291.20), flutters down like a leaf and props itself against the washer beside them (292.77). It develops by 293.01: the glowing washer window with the three of them in it, eyes and all. |
| 295.01 | the last hit | home | The tubes go out in the reverse order of the opening, and the neon with them. The three of them rest in the washer window's warm glow. |
| 297 to 328 | the tail | home | The end credits, over the dark (below). The lanterns have gone down to an ember with the tubes. On the tail's two soft accents the empty drum gives a slow half-turn (305.40), and the three look up at it; the window's light swells once (312.59), and they look at one another. |

## The polish pass

After the first cut, the whole show was audited in two ways:
- against the recording, for strong accents with nothing striking them;
- frame by frame, for readability.

The notes went back to the builders who made each part, who still had their context.

- **Music.** Every strong beat of the three combs is now struck, and only two strong free onsets are not. One is the premiere-to-dojo jump itself; the other is a 0.9-strength note in the surf. New hits:
  - the dojo's catch on 96.62;
  - the surf's ring of worlds on 127.66 and its collapse on 127.79;
  - the mosaic's break into the dark on 165.62 and the net snapping shut on 191.01;
  - the peak's second kick on 248.35;
  - Waymond's bump on 273.18, and the tail's two accents under the credits.
- **The pull** got a camera that rides Evelyn's orbit instead of a single slowly tightening top-down shot. Things are aimed to pass close to her, she has a catch-light, and the heavy beats hit harder.
- **The taxes and Joy's visit** were restaged as a two-shot, with Evelyn working the keys rather than sitting still.
- **Kindness.** The jumpers threaten before they soften, the eyes visibly come from her, and the glove is a glove.
- **The peak's fountain** is fuller.
- **The mosaic's last calm field** is the laundromat itself, so the fold home is seamless.
- **A third round:**
  - the rocks are drawn as stones, lumpy and flat-bottomed, turning as they roll, with Evelyn's eye in her stone's face;
  - the surf's canyon glimpse shows the same two stones up close;
  - the finale was re-staged around the family portrait, with a close three-shot of the family before it;
  - the surf's last clear note (122.69) is struck, with a second stamp in the IRS office;
  - the ball never leaves the frame under Zoom, which is now checked;
  - the earth under the shop is a band that fades into the night.
- **A director's pass:**
  - the googly eyes now arrive with a slap and a whirl, and Evelyn's comes with a burst of light, so the great hit is the turning point it should be;
  - performance was measured at 1440×810 on a 2× display in real Chrome with the GPU. Every heavy stretch holds 58–60 fps: the pull, the mosaic, the peak and the portrait. Headless software rendering is much slower there, which is not what a viewer sees.
- **Lead changes:**
  - the first frame is the laundromat's own wide shot;
  - the zoom punches are stronger;
  - the ball draws out in a brief streak along its way through each jump;
  - the flickers before the jump into the dark were taken off, since the surf's collapse owns it;
  - the ground under the laundromat is drawn as earth, not a black band.
- **A visual pass.** The whole show was rendered at 4 fps and around every jump at 20 fps, and what read wrong was
  fixed:
  - the tail's slow draw-back framed the shop's left end wall and the dark past it for 35 s of credits; it now stays
    inside the room, with the storefront's glass as the frame's left edge, and the earth under the floor goes on
    outside the walls;
  - over the ceiling, the storey above is drawn in section, in the same tone as the earth under the floor, not as
    a black band across the top of the bright party;
  - the garland's last lantern hung over the big dryer, cut in half by its glass all through the tumble, and the
    one before it hung inside the empty hanger's basket; both are set on, between where the hanger comes to rest
    and the dryer's face;
  - the theatre's front ended in a thin post onto the alley, like a flat; it now turns the corner in stone quoins
    on a plinth;
  - the alley's culvert pours into a puddle, with rings and spray, not into nothing;
  - Raccacoonie's reach for the shrimp tail no longer crosses his face, and the close-up sits a little higher;
  - the stray net of frames left on the wall after the great hit fades as it shrinks;
  - in the mosaic, the hot-dog world's piano stands on legs, its keys over the seesaw's swing rather than
    through it, and the laundromat's tube hangs from a ceiling;
  - kindness's scissor arm keeps its lattice at full reach;
  - the rocks' pull-back after the last pebble no longer loses the two stones to specks;
  - the finale's push-in takes the lantern string whole or not at all, not by its tassels;
  - in the peak, the strand off the pulley meets the line wound round the shrinking bagel in one line, and after
    the release its free end carries its clothespin away rather than hanging as a rod in the dark.
- **A second visual pass, for craft.** The laundromat had machines and no life: bare walls wherever the camera
  looked up. It now has:
  - a wall clock over the door's washer, at ten to two in the morning when the tubes come on, its minute hand
    going round a minute a second. It is in the opening's wide shot and still there in the washer's glow under
    the credits;
  - a price board by the first bank, drawn in pictures (a shirt, a sock, a towel, and their prices in coins),
    which the garland ride passes;
  - a calendar over the party's gift box, red-headed with a fish for luck, one day ringed.
  - All three are in stretches of wall nothing passes through, and are under the room's light, so they go dark
    and come up with the tubes.
  - The family has soft contact shadows on the floor through the finale, so the three of them sit on it.
  - Raccacoonie's kitchen has a rail of tools along its back wall (ladles, a spatula, a wok, a strainer),
    dim and swaying a little, so the dark behind the chef is a kitchen's far side and not a blank.
- **A third pass, for motion and the tail.** The busiest stretches were watched at 10 fps (the press volley, the
  dojo, the piano, the surf, kindness, the peak's fountain); their motion holds.
  - The press's flashes lit the frame with a flat white sheet, so the dark under the carpet went a dead grey on
    every volley. The wash now falls off from the gun that fired it.
  - Under the credits, the night goes on outside: twice (299.6 s and 317.4 s, between the tail's two accents) a
    car goes by in the street, right to left, and its headlights sweep across the shop through the glass, by way
    of the room's light map.
- **A fourth pass, for the canyon.** On the long way down (220 to 241 s) the two stones shrank to specks against
  cliff bands of their own tone, and at about 233 s were all but lost.
  - Each stone now has a shadow on the ledge it is on, fading as it falls away from it, and never under a few
    pixels across.
  - Once a stone is only a few pixels across, a faint light of the sky's colour gathers round it, stronger the
    smaller it is. The eye finds the two of them on the canyon's face without either being drawn bigger than it
    is, and close up nothing changes.
  - The share card (243.5 s) was rendered again and compared: it is unchanged.
- **A fifth pass, for the photograph.** Its picture's glow was a bare disc. It is now the washer it leans on: the
  enamel body, the window in its steel rim, glowing, and the three of them in front of it, eyes and all. As it
  comes down it has a shadow on the floor, like the family beside it.
- **Polish round 1, the great hit and the premiere's foot.** The show was watched at 1 fps and at full size around
  its turning points.
  - The great hit (191.22) landed on a frame whose lower third was the flat earth under the floor: the mosaic's last
    calm held her high. As the net closes (from 121½) the frame now settles with her, low, so she lands with the
    floor near the bottom of the frame and the wall over her.
  - Her burst of light was a soft disc that read as a smudge on the pale tile. It is now a sunburst: fourteen rays
    thrown out from her, white-hot at her and gold to their ends, turning slightly as they fade, with a gold ring going
    out across the room on the hit. It lasts a little over a second.
  - Under the premiere's carpet the street was a dead band of dark, a fifth of the frame for ten seconds. The carpet
    now lies to a stone kerb, and the street is wet. The pilasters' gold, the poster cases, the doors' light, the
    spotlight's pool and every flash of the press show in it as long smears.
- **Polish round 2, the party and the street.** Every jump was watched again at 20 fps, and each holds its match cut.
  - Kindness happens at the new year party, but over the table the wall was bare cream, with only two lanterns. It is
    now dressed for the new year: red and gold crepe festoons hang under the ceiling from gold rosettes. A pair of red
    couplet scrolls on wooden rods flank the table, brushed down in gold. Between them a red luck card hangs on its
    point with a gold flower. The paper stirs, and stirs more when the arm rushes past (`drawPartyWall` in
    `kindness-draw.ts`).
  - The car that goes by under the credits was a toy beside the far fronts. It is half as big again, with the
    street's light along its roof.
- **Polish round 3, the peak's line and the credits.** The world-jumps were watched at full size: the alley, the
  dojo, the piano, the kitchen, the surf's worlds, the peak and the portrait.
  - In the peak, after the release, the line's free end fell with Waymond as a dead-straight stroke with its
    clothespin on top. With the camera rising, it hung in frame for a second like a stick standing up out of the
    dark. Now it streams loose, whipping most at its free end with the pin swinging, and runs away below in about
    half a second.
  - The credits stood top-centre, across the clock, the door's bell and the lantern string. They now stand left of
    middle, over the storefront's dark glass and the night street, like film credits over night. The clock, the
    lanterns and the family by the washer are clear of them. It fits at phone width too.
- **Polish round 4, the shop's walls in the opening.** The opening was watched at the viewer's own framing, not the
  share card's wider one. Through Joy's visit and the taxes (19.8 to 30.6) the top third of the two-shot was bare
  cream wall.
  - Over the counter's far end, where the taxes are done, a corkboard: a red envelope, and a crayon drawing Joy made
    when she was small, the three of them in their own colours under a sun. It hangs over
    her mother at the adding machine all through the visit she does not look up from. It sits clear of the throw up
    to the hanger, which leaves from the counter's near end.
  - High between the door's washer and the counter (higher still after a later pass), a shelf: a white lucky cat waving its paw, a money plant
    trailing over the edge, and between them an old framed photograph of the three of them by the shop's window.
    It is in the opening's wide shot and under the credits, where it sits over the finale's lantern string and
    answers the photograph the night ends by taking.
  - Both are drawn by the room (`set.ts`), under its light, so they go dark and come up with the tubes.
- **Polish round 5, the kitchen's counter, and a sweep.** In the kitchen (106.7 to 121 s) the lower fifth of every shot
  was the counter's face under the burners, a flat slate with a few seams.
  - It now carries the griddle's heat, glowing down the steel and rising with the gas. A row of gas knobs, two to a
    panel, sit over little windows of blue pilot flame that flicker. Their pointers turn up as the music swells.
  - Along its foot, below most shots, is a red lacquered apron rail with a brass edge, where diners would sit.
  - The mosaic was watched at full size at 4 and 16 panels. Its worlds read as their own, so nothing changed.
  - Then the whole show was swept again every 3.3 s, for anything the five rounds broke. Nothing had.
- **A further pass, for frame edges.** The close framings were checked for what their edges cut. Two of the cuts
  were of things added in these rounds.
  - In the finale's close shots (275 s, 293 s) the frame's top edge cut the new shelf: the lucky cat lost its head
    and the photograph its top. The shelf now hangs higher, up under the tubes, where a shop keeps its luck. It is
    still in the opening's wide shot and under the credits, and above every close framing of the finale.
  - On the fight's last hit (199.6 s) the top of the frame sliced the party's luck card in half. It now hangs lower
    on a longer cord, whole in that frame. It hangs a little to the right, so she no longer rides the arm's cradle
    across it, vermilion on red.
  - Seen and kept: the canyon floor and its bagel, the peak's opening, the photograph, the dojo's gong, and the
    hush. In the hush the two of them are specks on purpose (see Known limits).
- **A pass for Joy's eye.** The surf, its collapse and the peak were watched at 10 fps. The show's second turning
  point, Joy's eye (254.5 s), was its quietest moment. The eye came up out of the hole as a white fleck against
  the scattering seeds, and landed with only the slap.
  - It now rises in a soft violet light of its own, so it reads as something given and carried up to her.
  - It lands with a burst, in her violet lifted toward white, about three-fifths the size and strength of her
    mother's gold one. It answers the great hit without outdoing it.
  - Every burst is now drawn under every eye, and each burst has every eye-wearing ball cut out of it. Joy's light,
    beside her mother, no longer veils Evelyn's face or tints her vermilion.
- **A pass for the receipt storm.** The washer's slam, the storm and the portrait's flash were watched at 10 fps.
  The storm (13.7 to 16.7 s) goes up right across the corkboard over the counter, and the receipts pinned on the
  board made the flying ones look pinned too.
  - The board no longer has receipts. Its cork is darker, it is a little smaller, and Joy's drawing is on yellow
    construction paper. Nothing on it is white paper, so every receipt in the storm reads as flying in front of it.
  - The drawing reads better in the two-shot of her visit too.
- **A pass for the opening's first beat.** The canyon's hesitation, the alley's drain, the dojo, the piano and the
  opening chord were watched at 10 fps, and their motion holds.
  - In the cold open, Waymond setting the slumped bag back on its bottom (4.45 s) is the show's first beat, and it
    happened at the frame's right edge, half cut off.
  - The opening's wide shot now reaches a little further right, with the same left edge at the storefront. He and
    the bag are inside the frame all through it.
- **A pass for Waymond at the washer.** The crescendo's card-flips into the great hit and the washer's door home
  were watched at 10 to 16 fps.
  - Through the end of the cycle (264 to 268.4 s), Waymond waits by the foot lever for them to come out, and he sat
    at the frame's right edge, cut in half for four seconds.
  - After the match cut the close shot on the window now draws back, slowly, from 2.4 cells to about 2.75, so he is
    whole in the frame before he leaps the lever. The window is still the subject, and the jump's own framing is
    unchanged.
- **A pass for the ending.** The premiere's run into the alley, the kitchen's eruption and the peak's first tug
  were watched at 5 to 10 fps, and they hold.
  - After the last card went (325.9 s) the room held fully lit to the final frame while the recording faded to
    silence. The show cut off rather than ended.
  - Now the room goes down into the dark with the music over its last five seconds. The washer's window, the light
    the family rests in, is the last to go, the way the tubes went out at the last hit. The googly eyes go down with
    the room, so no eye-whites float on the dark. The last card is not dimmed.
- **A pass for the switch.** The dryer's tumble, the mosaic's first splits and the portrait's setup were watched at
  3 to 4 fps, and their motion holds.
  - As Evelyn pressed the foot switch (284.8 to 287.5 s) and the string lit a lantern a beat, its last lantern and
    its anchor were cut by the frame's right edge. A third of the frame was the storefront's dark glass.
  - The two framings there now hold further right and a little higher. The whole string is in, anchor to anchor,
    over the family, with her at the switch and the camera on its tripod between them.
- **A pass for the cradle.** The hush, the pull, the rocks' first silence and kindness were watched at 3 to 6 fps.
  The rocks' wide shot as Joy's stone teeters is a deliberate wide, the stones clear on the ledge, and was kept.
  - Through the cradle (194.8 to 198.6 s) the scissor arm's lattice ran straight across the party's luck card, with
    Evelyn, red on red, carried just under it, so the arm, the card and the ball read as one tangle.
  - The card now hangs between the two scrolls, over the table's left end, left of the arm's whole reach. It is
    clear of the lattice and of her all through the cradle, and whole in the frame on the fight's last hit. The
    lattice crossing the right scroll was kept: it reads as an arm in front of a wall hanging.
- **A pass at phone width.** The taxes, the dense mosaic and the peak's fountain were watched at 3 to 4 fps, and
  hold. Key moments were then watched on a 390 px-wide phone, where the stage is nearly square and the camera sees
  more above and below.
  - In the laundromat, the earth cut under the floor filled about a quarter of the phone's frame as a flat grey band,
    even on the great hit.
  - It now has what is in the ground under a shop. Stones are bedded in the earth, and a water main runs the length
    of the shop. Under the washers is the laundromat's own drain line, falling gently toward the street, with a drop
    and a U-trap up to each washer. It is all in the earth's own tones (`underground` in `set.ts`). On a wide stage
    it is a quiet strip at the frame's foot.
- **A pass for Zoom.** The other worlds held at the phone's square frame. Then key moments were watched under Zoom
  (the viewer's Z, the same middle 1.5 times closer).
  - Through the switch and the portrait (284.8 to 294 s), Zoom's bottom edge fell on the floor line, so the family
    and Evelyn at the switch sat on the frame's edge, cut in half. The photograph propped by the washer was cut off
    too.
  - Those holds now sit a little lower. Under Zoom a strip of floor shows under the three of them and the
    photograph. The normal frame still holds the lantern string whole, anchor to anchor.
  - The whole show was then swept under Zoom every 4 s. Under the credits (294.6 s to the end) the family sat on
    Zoom's bottom edge, cut in half, for the whole tail. The tail's framing now holds a little lower. Zoom keeps the
    three of them whole on a strip of floor, and the normal frame still takes in the clock and the lucky cat's
    shelf.
  - On the great hit's first wide (192 s), Evelyn landed at Zoom's left edge. It is held a little further left, and
    Waymond at the table's far end stays in the normal frame.
  - Under Zoom, the credits' longest line crosses the lantern string's near end. The words are set by the page,
    the same in every mode, and this was left.
- **A pass for Overview.** Overview (the viewer's O) frames a world's bounds, and the show kept them per world. Two
  worlds are each visited twice, far apart: the surf and the mosaic share one world, and the dark and the peak
  another. So their Overview framed both visits at once.
  - The surf's worlds were small vignettes in a huge field of their colour, the ball lost in it. The dark and the
    peak showed the bagel as a speck in the black.
  - Each leg now hands the stage its world with that leg's own bounds (`legWorlds` in `show.ts`), one object a leg,
    so what compares worlds (the trails) still can. The home legs keep the whole shop, the room every one of them
    happens in.
  - In Overview the surf's worlds now fill the frame, and the pull and the peak frame the bagel large. The normal
    view and Zoom are unchanged.
- **A pass for performance, and the credits.** After all the passes' drawing (the party wall, the bursts, the
  underground, the knobs, the end's dark), the heavy stretches were measured as before: 1440×810 on a 2× display,
  real Chrome with the GPU, against `origin/main` in fresh browsers, three runs each. Both hold 59–60 fps, with the
  same occasional 30–40 ms frame. Nothing regressed.
  - The tail's lower framing (for Zoom, above) had brought the lantern string down into the credits' band. In the
    normal view the film's title ran onto the first lantern. The cards now stand a little higher and further left,
    over the storefront's glass and above the string, and still fit at phone width. Under Zoom the longest line
    still crosses the string's near end.
- **A pass for the saved video.** The whole show was swept again every 2.5 s, and the credits were rendered as a
  saved 1080p video paints them (`shows/words.ts`): they sit where the page's do.
  - Behind the names, the window's unlit red neon washer showed through the soft dark, a ring under "Evelyn, Joy,
    Waymond". The dark under the cards is now a little deeper at its heart and a little narrower. The neon recedes
    under the words, and the lanterns and the family keep their light.
- **A pass for an ultrawide stage.** The share card was rendered again and is pixel for pixel the committed one,
  and every pre-jump flicker was watched at full size. Then the show was swept on a 21:9 stage, where the frame
  sees more world at the sides.
  - Under the credits, and in the cold open, the frame looked past the shop's left end wall onto a flat slab of
    dark.
  - The street the window looks onto now carries on past the wall: the block across the way, its fronts going on
    to the left in their own widths and heights, their lit windows, and the far lantern string. Past the wall it is
    the night street, not a void, and a car passing under the credits drives on out past the wall. On a 16:9 stage
    and on a phone nothing changes.
  - The whole show was then swept at 21:9 every 4 s. From the break into the dark (165.6 s) to the first tear
    (about 170.8 s), the mosaic drew its one panel as a 16:9 box, with the dark down both sides of a wider stage.
    Before the first tear there are no neighbours, so that one panel is now the whole stage (and the whole of a
    phone's squarer one). On the tear the sides become the neighbouring worlds, as before. The 16:9 view is unchanged.
- **A pass for colour vision and flashing.**
  - The family was checked under simulated protanopia, deuteranopia and tritanopia. The three stay distinct in each:
    olive, blue and grey for the first two, and red, grey and teal for the third. Waymond's eye, there from the
    first frame, sets him apart too. Nothing was changed.
  - The bright stretches were measured at 30 fps, as the frame's mean relative luminance. The press volley, the
    surf, the great hit and the portrait's flash are each at most two flashes a second.
  - The pre-jump flickers were not. Three flickers and the cut made seven swings of the whole frame's light in about
    half a second. Between a bright world and a dark one (the kitchen into the surf, the dark into the mosaic, the
    canyon into the bagel, the bagel into home), that was three to three and a half flashes in a second, at or over
    the three a second that is safe for a viewer sensitive to flashing.
  - Each jump now has two flickers, on the last two onsets before it, and every jump measures at most two flashes a
    second. The bleed-through still comes just before each cut. `check:shows` holds it to at most two flickers a
    jump.
  - Measured again by quarters of the frame, any 2×2 block of a 4×4 grid, since a flash need cover only a quarter of
    the view. Nearly everything stayed at two and a half a second or less. The jump into the surf reached three:
    two flickers from the dark kitchen into a bright world, and then a new world on every hit. It now has one
    flicker, and its stretch measures two at most. The jump into the piano also reaches three by quarters, but its
    swings are small, just over the threshold, between two bright worlds. It was kept.
- **A pass for a slower machine.** No colour in the show's palette is saturated red (red at most about 65% of the
  total), so the guideline's red-flash rule cannot trigger. Then the show was played in real Chrome with the CPU
  throttled 4×, like a modest laptop. Most of it held 57–60 fps, but the peak fell to 24–34 and the credits to about
  40. `origin/main` measured the same, so this was the show's own cost, not these passes'.
  - A profile of the peak put a third of each frame in finding where a ball is. A carried lane is laid at sixty
    segments a second, so the peak's is over a thousand. `laneAt` walks a lane from its start, and the googly eyes
    ask where each ball was over the last 1.2 s, at 120 steps a second, three lookups a step.
  - `show.ts` now finds the segment by halving, over cumulative times kept once per lane (`laneXY`). It hands that
    one segment to `laneAt`, so the answer is the one `laneAt` gives. `fx.ts` looks each sample up once, not three
    times. The shared `parts.ts` is untouched.
  - Seventeen frames across the show, full of eyes and long lanes, are pixel for pixel what they were. Throttled 4×,
    the peak now holds 58–60 fps and the credits 60.
  - The whole show was then swept throttled 4×, two seconds every eight. Every sample holds 56–60 fps; the softest
    are the kitchen's eruption (114 s, 57) and the peak (250 s, 56.5). Throttled 6×, the heaviest stretches hold
    58–60 except the peak, at 48–51. What is left there is the bagel's thousand seeds, already batched into one path
    a colour and brightness, and it was left.
  - The hush (128–133 s), nearly black in every sweep, was watched again at full size. The seeds drift at their
    depths and the rim comes up out of the dark, the quiet the music asks for, and it was kept.
- **A pass for Waymond's catch.** The story's beats were looked at for whether each one lands. The photograph, small
  in its Known limit, reads at normal size, about 70 px across, the glowing window and the three eyes clear.
  Waymond's catch did not land.
  - In the peak he sits on the pulley, steps off it (about 247.4 s) and catches the line taut (247.9). It is the
    moment he chooses to be the weight that pulls Joy back. All of it happened in the frame's top-left corner, half
    off its edge, and the pulley itself came into frame only at 248.3, after the catch.
  - The framing from 246.4 s now opens sooner and higher: the pulley, Waymond on it, his drop and catch, the line,
    and Evelyn and Joy in the hole below, all in one frame. It sits low enough that Zoom still keeps Evelyn and Joy
    in the hole, with Waymond on the line. Then it opens on out to the whole machine as before.
- **A pass for the beats, by name.** Every beat the table above names was watched at its moment in the viewer's own
  framing: the audit letter onto the spike, Joy's coming and going, the spotlight, the neon, the drain, the gong, the
  mustard, the eruption, the beam on Joy, Joy's stone going over and Evelyn after her, the door of the washer and
  Waymond's touch, the nestle, the switch, the flash. They read, but for one.
  - The shrimp tail's flight from the spoon into the hat's pocket (113.85–114.6 s) sets up Raccacoonie's peek and
    his meal. In the shot's wide it was a few pixels, all but unseen.
  - It now trails a fading arc of itself, and is drawn larger at the top of its flight, back to its own size as it
    drops into the pocket. The throw reads, and so does the peek it sets up.
- **A pass for the beats on a phone.** The same beats were watched on a 390 px-wide phone, where everything is about
  a quarter of its desktop size. They hold, Waymond's catch and Joy's eye included, but for the finale's payoff.
  - The photograph was about 19 px across on a phone, a blank card.
  - The print is now 1.4 times the size, an instant photo's proportion beside balls this big. It rests a little
    further left, still leaning on the washer's edge, clear of the tripod's leg and of Evelyn. It reads on a desktop
    as the glowing window with the three of them in it. On a phone its colours show.
- **A pass for the gifts.** The heart of kindness is that each jumper is given a copy of Evelyn's own eye, and its
  blow turns gentle. The jumpers read wearing their eyes, but the gifts themselves, stepped through at 10 fps, were
  white specks crossing the pale tile, all but unseen.
  - Each eye now carries the great hit's lantern gold as it flies: a soft light round it and a fading gold trail
    along its arc. It swells a little in mid-flight and lands at its own size. The kindness is seen passing from her
    to each machine, in the light she chose it in.
- **A pass for the beats in motion.** The pull was stepped through at 10 fps. Each thing goes over the lip on its
  beat, down into the hole (the spatula at 152.0 s). The alley's parting (82–86 s) was watched at full size: Waymond
  stays on the shut cover in the lamplight while she is carried away down the drain below. Both land, and nothing
  was changed.
- **A pass for Waymond's look.** In that parting his eye only swung with his own motion, so he stared off while she
  was carried away. Now he watches her go. From the cover giving under her (82.0 s) to the jump out of the alley,
  his pupil turns along the line to her and follows her down the shaft and along the drain pipe, easing in and out.
  It is an optional `gaze` on an eye (`fx.ts`), used only here. Every other eye, and his everywhere else, swings as
  before.
- **A pass for looks.** The gaze can now hold Evelyn, Joy, or a point that moves. Two more moments use it:
  - In the opening, when Joy gives up and goes (27.4–30.3 s), Waymond's eye follows her across the shop and out of
    the door, while her mother works on without looking up.
  - The portrait. From Evelyn hurrying back beside Joy (290.4 s) through the flash, all three look into the lens.
    Then, as the photograph comes out of the slot, flutters down and develops, all three eyes follow it down to the
    floor. Before, their pupils hung where their bobbing left them, so the family photo had nobody looking at the
    camera.
- **A pass for the looks between them.** The same gaze carries the story's other looks:
  - Through the empathy fight (192–200 s), Waymond, who gave her the eye, watches her the whole way to him.
  - At the brink (213.8–219.7 s), as Joy's stone goes over, Evelyn's eye follows it down over the edge while she
    flinches and then goes after her (from a later pass she looks at Joy's stone through the whole silence before).
  - In the bagel's hole (from 242 s), as she holds Joy at the lip, she looks at her.
  - Once Joy's eye has settled (255.3 s), mother and daughter look at each other.
  - At home, as Joy nestles against her (279.6 s), Joy looks up at her mother.
- **A pass for the looks in motion.** Every gaze was followed through its span from the show's own positions, and
  the closest one was stepped at 7 fps. They ease on and off without snapping or fluttering, and each target is in
  the frame until its span ends.
  - A watching pupil could sit up to 5% past its eye's rim. It is now held inside it.
  - Mother and daughter's look (from 255.3 s) began as the camera pulled back to the fountain, so it showed for
    about a third of a second. The close on them now holds to 256.0 s, then opens out.
- **A pass for the cut into the rocks.** Stepped at 10 fps, the clean cut on the silence (200.16 s) is a true match
  cut. Evelyn and Waymond side by side on the table become her stone and Joy's on the ledge, in the same place on
  the screen.
  - In the last half second before it, the push-in's top edge sliced the luck card. The card hangs a little lower
    and smaller, whole to the cut and still clear of the cradle.
- **A pass for edges, by measure.** The write-up's figures were checked against the show (434 strikes, as stated).
  Joy's and Waymond's place in the frame was then measured every twentieth of a second through the whole show,
  rather than looked for in stills.
  - Through the receipt storm (14.45–17.15 s), Waymond, watching from the floor, was cut in half by the bottom edge
    for 2.7 s. The storm's framing is now a touch wider and lower, so he and the floor are whole and the storm still
    fills the frame above.
  - Left as they are: Joy going out of the door (29 s), the camera rising with the throw to the hanger (31 s), and
    the slow pull-back after the cut home (264 s). Each is under a second, with the camera or the family on the move.
  - `check:shows` now holds Joy and Waymond to the same: never left cut by the frame's edge for more than a second.
- **A pass for edges under Zoom.** The same measure was run under Zoom, for all three. Evelyn's check had only kept
  her centre in Zoom's frame, so she could sit half off its edge and pass.
  - During Raccacoonie's peek (114.75–117.75 s), Zoom's bottom edge cut Evelyn in half on the counter for three
    seconds. The two framings there sit a little lower. Under Zoom she is whole below his face, and the normal view
    still has his face whole.
  - In the hush at home (275.45–276.45 s), Zoom cut all three at the bottom. The framing there sits a little lower,
    and in the normal view the lantern string is still whole or out of the frame.
  - Joy and Waymond under Zoom were left: Zoom is a closer look at Evelyn, and the others cropped by it is what it
    is for.
  - `check:shows` now holds Evelyn under Zoom to the same as the others: never left cut by its edge for more than a
    second.
- **A pass for the camera's motion, and the family's spacing, by measure.** Neither found anything to change.
  - The camera's on-screen pan and zoom speed was measured every sixtieth of a second within each world, for sudden
    changes. Every large one is by design: the camera carried into the next world for a pre-jump flicker, and the
    ten zoom punches on the biggest hits. The rest are under a quarter of a frame-height a second, where it follows
    a ball being batted about in the premiere and the dojo.
  - The three balls' spacing was measured every fiftieth of a second. They never draw into each other but for two
    frames at 247.5 s, as Evelyn heaves back on Joy, by 0.15 of a radius (about 2 px).
- **A pass for the tail.** The credits are thirty-five seconds of the family at rest, and the music gives them two
  soft accents that the family did not answer. Now they do, with a glance each:
  - As the empty drum gives its slow half-turn (305.40 s), all three look up at it.
  - On the window's swell (312.59 s), they look at one another: Evelyn and Joy at each other, Waymond at her.
  - Each glance lasts about two seconds and eases back.
- **A pass for father and daughter.** Joy and Waymond never once looked at each other. Now, as he leaps the foot
  lever and touches her at home (271.4–273.6 s), they do. The gaze can now hold Waymond too.
- **A pass for the opening's witness.** Waymond now watches the whole of Joy's visit:
  - Joy coming in on the bell and across the shop to her mother (20.3–23.9 s);
  - then up at her mother at the keys, who does not look up (23.7–27.6 s);
  - then Joy going out again, as before.
  - Gazes that overlap now blend by how far each has eased in, so one look hands over to the next in a smooth sweep
    rather than a snap at the midpoint. A gaze on its own is as it was.
- **A pass for the rocks' silence.** In the film the rocks are the one quiet talk between mother and daughter, two
  stones side by side. Evelyn's stone wore her eye but stared at nothing until Joy's went over. Now from the cut
  (200.7 s) she looks at Joy's stone beside her through the whole silence, and her look follows it down over the
  brink as before.
- **A pass for the looks, together.** All twenty-four looks were checked: each is live, the one looking and the one
  looked at both on the stage, for 99–100% of its span. `check:shows` now holds them to it, and a section above,
  *The looks*, lists them in one table.
- **A pass for the write-up.** Its reference sections were checked against the code. The check list now names the
  looks; the entries for `fx.ts`, `credits.ts`, `show.ts` and `score.ts` say what they now do; and Known limits
  names two trade-offs taken on purpose, Zoom's crop of Joy and Waymond and the credits' line over the string under
  Zoom.
- **A pass for the whole build.** `npm run build` was run: the typecheck, every check suite (3,064 checks) and the
  production build. It passes. The show's own chunk loads only when it is opened. It is 390 KB (143 KB gzipped)
  against `origin/main`'s 376 KB (138 KB), so every pass together added 5.4 KB on the wire. Vite's warning about
  chunks over 500 KB is for other parts of the site.
- **A pass for Waymond on the line.** In the peak he catches the line and drops as the weight that pulls Joy back out
  of the bagel, but his eye only swung with his fall. Now from his catch (247.9 s) he watches Joy, until he is
  carried down out of the frame (249.6 s).
- **A pass for whether the looks are seen.** The looks check only asked that the one looking and the one looked at
  exist. Each look was measured for how much of it is seen: its eye inside the frame and at least 7 px across on a
  720p stage. All but one were seen for 81–100% of their span. Waymond's on the line was seen 11%, from his catch
  until he goes down out of the frame. It now ends there. `check:shows` holds every look to being seen for at least
  half its span.

## The looks

The googly eyes swing with their balls, but at the story's turns they look at someone. Each look eases in and out
over a quarter second, and looks that overlap blend, so the eye sweeps from one to the next. They are listed in
`score.ts` as each eye's `gaze` (`fx.ts`). `check:shows` holds every one of them live, the one looking and the one
looked at both there, and seen: its eye in the frame and big enough to read for at least half of it.

| Time (s) | Who looks | At | The moment |
| ---: | --- | --- | --- |
| 20.3–23.9 | Waymond | Joy | she comes in on the bell and crosses to her mother |
| 23.7–27.6 | Waymond | Evelyn | her mother at the keys, not looking up |
| 27.4–30.3 | Waymond | Joy | she gives up and goes |
| 82.0–86.3 | Waymond | Evelyn | the drain carries her away from him |
| 192.1–200.2 | Waymond | Evelyn | the empathy fight, all the way to him |
| 200.7–219.7 | Evelyn | Joy | the two stones in the silence; then down over the brink after hers |
| 242.1–247.3 | Evelyn | Joy | holding her at the lip of the hole |
| 247.9–249.6 | Waymond | Joy | on the line, the weight that pulls her back, until he is carried out of the frame |
| 254.9–257.2 | Evelyn and Joy | each other | once Joy has her eye |
| 271.4–273.6 | Joy and Waymond | each other | he touches her at home: father and daughter |
| 279.6–282.3 | Joy | Evelyn | she nestles against her mother |
| 290.3–291.4 | all three | the camera's lens | the portrait |
| 291.4–293.6 | all three | the photograph | it ejects, falls and develops |
| 305.4–307.6 | all three | the drum | its slow half-turn under the credits |
| 312.5–315.2 | all three | one another | the window's swell under the credits |

## End credits

The credits come after the last hit, over the quiet tail of the cue, while the family rests in the dark by the washer's
glow. A card comes into focus, holds and goes out of focus as the next comes. The words are the page's
(`Performance.titles(t)`, as in Liftoff): a show's canvas sets no type, so a saved PNG has none; a saved video has them painted in (`shows/words.ts`).
The canvas lays only a soft dark under them. They stand left of middle, over the storefront's dark glass, so the
clock, the lanterns and the family by the washer stay clear of the words. The cards are:

| Starts (s) | Role | Names | Fine print |
| ---: | --- | --- | --- |
| 297.0 | Directed by | Claude Opus 5.5 | |
| 302.2 | With | Evelyn, the vermilion ball; Joy, the violet ball; Waymond, the jade ball | |
| 308.4 | Music | Son Lux | "Come Recover (Empathy Fight)"; Ryan Lott, Rafiq Bhatia and Ian Chang |
| 314.8 | After | Everything Everywhere All at Once | a film by Daniels (2022) |
| 320.8 | Drawn with | p5.js | |

There is no title card. After p5.js's card goes (about 325.9 s), the room goes down into the dark as the music fades
to 332, the washer's window last; the googly eyes go with it (`endDarkAt` in `credits.ts`).

## What `check:shows` holds it to

`apps/rube/checks/all-at-once.ts`, run by `npm run check:shows` for this take:

- **The recording:**
  - the whole cue from zero to its fade (332 s);
  - credited to Son Lux, the cue and the film, and linked to the official upload.
- **The worlds:** in the story's order:
  - the laundromat, the premiere, the dojo, hot dog fingers and Raccacoonie;
  - the surf, the dark, everywhere, home;
  - the rocks, the dark again, home.
  - Every jump is on a clear onset. The drop into the rocks is the exception: it comes on the silence after the
    fight's last hit, the fall's beat 0.
- **No portals, and no cuts drawn.**
- **Flickers:** only in the second before a jump, each a frame or three, and no more than two before any jump, so a
  jump never flashes more than three times a second.
- **The ball:**
  - inside a world it never jumps;
  - at every jump it holds its place on the screen, within 1% of the frame a millisecond: every jump is a match cut;
  - it is never hidden for more than 2.5 s;
  - under Zoom (1.5× closer) it never leaves the frame.
- **Every strike lands on the recording.** 434 strikes, each within 40 ms of a measured onset or 30 ms of a comb's
  beat or eighth.
  - Everywhere-at-once and the kindness after it strike at least 85% of the fight's beats from 170.8 to 199.6 s.
  - The peak strikes at least 85% of the fall's beats from 247.7 to 264.1 s.
  - Home's last three hits are struck.
- **The family:**
  - Joy and Waymond, and Evelyn under Zoom, are never left cut by the frame's edge for more than a second;
  - Joy and Waymond never jump;
  - each only comes and goes out of shot, or at a jump, when the whole world changes;
  - there are never two of anyone.
- **The googly eyes:** Evelyn's comes on the fight's beat 123, the great hit. Joy's comes after the brink and before
  home. Every look is live (the one looking and the one looked at both there for nearly all of its span) and seen (its
  eye in the frame and big enough to read for at least half of it); see *The looks*.
- **The end credits:**
  - after the last hit, and gone before the end;
  - set by the page;
  - opening on "Directed by Claude Opus 5.5", and naming Evelyn, Joy, Waymond, Son Lux, the cue, the film, Daniels and p5.js;
  - with no demo disclaimer on the frame. The attribution file keeps it.
- **The panel:** the work is Everything, one take, Opus 5.5, with no note and no byline.

## How it is built

- **The version file:** `apps/rube/src/shows/versions/come-recover/opus55-all-at-once.show.ts`. Everything with
  weight is behind `load()`.
- **The show:** `.../come-recover/all-at-once/`.
  - `show.ts`: the `MultiverseShow` (legs, jumps, flickers, the family's spans, and each leg's own bounds for
    Overview). It finds where the ball is on a long lane by halving, which is what lets the eyes' many lookups run
    on a slow machine.
  - `score.ts`: the order of the legs and parts, their entry cells, the flickers and the camera. Each leg has its own
    director, and each opens on the framing the last one closed on, carried by the jump. It also holds the zoom
    punches and every eye's looks.
  - `kit.ts`: the part contract. It is Liftoff's: `Slot` and `Built`, timed `route` and `carried` lanes, `lay`,
    `frame`, and the p5 fill-cache guard. `physics.ts` adds `throwFor` and `launch` for flights handed across a
    jump. `camera.ts` is Liftoff's director.
  - `music.ts`: the onsets, the three combs, loudness, and the jumps.
  - `seams.ts`: what the ball is doing at each jump.
  - `worlds.ts`: the eight worlds' palettes and materials, and the family's colours.
  - `fx.ts`: the googly eyes, over every world. Each is a white disc with a pupil that is a heavy bead in a round
    cage, thrown by the ball's acceleration and settling. It is worked out afresh each frame from the ball's last
    second of path, so it scrubs true. An eye can also be given looks: spans when its pupil turns to Evelyn, Joy,
    Waymond or a point (`gaze`, listed under *The looks*). In the laundromat the room's light shades it. An eye given during the show
    arrives: it slaps on oversized, squashes past its size and settles, and its pupil is flung round the rim. On the
    great hit, Evelyn's comes with a burst of lantern-gold light behind her, the turning point of the show; Joy's
    comes with a smaller, softer burst in her violet.
  - `credits.ts`: the cards, the soft dark under them, and the room's fade to dark with the music after the last
    card, the washer's window last.
  - `hits.ts`: every strike, gathered for the check.
- **The parts:** one folder a world.
  - `home/`: `set.ts` is the room and its fixtures, with a light map that the tubes, lanterns, washer glow and
    fireworks drive. The parts are `laundromat`, `dryer`, `kindness` and `finale`.
  - `star/premiere`, `dojo/dummies`, `hotdog/fingers`, `hibachi/raccacoonie`, `rocks/ledge`.
  - `multi/`: `skins.ts` is thirteen worlds as skins for one seesaw. Parts: `surf`, `mosaic`.
  - `void/`: `bagel.ts` is the everything bagel, driven by the pull and then by the peak, plus the drawings of the
    things it swallows. Parts: `pull`, `peak`.
- **The shared files.** The hooks in `registry.ts`, `main.ts`, `styles.css` and `engine.ts` came in with Liftoff
  (PR #88):
  - `Performance.titles` and the page's words layer, for the credits;
  - `Framing.angle`, the camera roll, which is unused here.
- **Rebuilding the audio.** `sh scripts/shows/eeaao-cue.sh <fetched cue>` rebuilds the file, and
  `python3 scripts/shows/eeaao-onsets.py` measures it again.

## How it was made

- **Plan.** The lead chose and measured the cue, and wrote the plumbing: the multiverse show, the kit, the seams,
  the eyes, the credits, the checks and a stand-in for every part. The builder brief (the story, the rules, the
  per-part onsets and the seams) stayed outside the repo.
- **Build.** Nine fresh builders then built the parts in parallel, one world or two each, on one dev server. The laundromat's builder landed `set.ts` early so the other home legs could use its fixtures, and the pull's
  builder landed `bagel.ts` early for the peak.
- **Review.** The lead reviewed every part in context and sent notes:
  - the peak was reworked to be kinetic and legible: the machine in a wide shot, ratchet kicks, a rope that reads
    as cord, and things bursting out on the beats;
  - the pull's hush got depth, and its ball-like clutter came out;
  - the flickers moved 60 ms after their onsets so they no longer hid the last strikes;
  - the ground under the laundromat was drawn as earth, not a black band.
- **Result.** The whole show plays at 60 fps at 960×540 in headless Chromium, worst frame 43 ms.

## Known limits

- In the widest shots of the pull (16 cells) and the canyon (about 23 cells) the balls are small. It is scale on
  purpose; in the canyon a faint sky-coloured light round each stone keeps them findable.
- At 64 and 144 panels, Evelyn in the mosaic is a red dot on each plank.
- The photograph's picture is clearest large or under Zoom; on a phone it shows its colours, not the faces.
- Zoom is a closer look at Evelyn: Joy and Waymond are cropped by it at times, which is what it is for.
- Under Zoom, the credits' longest line crosses the near end of the lantern string. The words are set by the page,
  the same in every mode.
- Only Chrome on macOS has been watched. The recording export has not been re-measured for this take.

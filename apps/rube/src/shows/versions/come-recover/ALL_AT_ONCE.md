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

The film's three parts are the show's, and each is named by a chapter card as it begins, as the film's are: the page
sets them in its own face, as it does the credits (`CHAPTERS` in `credits.ts`). *Everything* comes up over the
storefront's dark glass in the opening's wide shot, *Everywhere* in the premiere's lower widescreen bar, and *All at
Once* in the dark she breaks through into.

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

**The audio.** Playback is YouTube only.
- The page embeds the official upload (provided to YouTube by Virgin Music Group for A24 Music) through YouTube's
  privacy-enhanced player. It plays from its first second to 5:32, fading over the last nine seconds. No copy of the
  recording is in the repository or the build (`ATTRIBUTION.txt`).
- To measure it, the upload was once fetched privately with yt-dlp (Homebrew's got a 403; a current one in a scratch
  venv worked) and cut the same way by `scripts/shows/eeaao-cue.sh`. That cut was the only edit, so every onset is
  the recording's own. The cut file was then removed.

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
  second.
- Seven jumps have none:
  - into everywhere at once, whose break is its own violet flare: a flicker there showed the mosaic's full wall of
    worlds twenty seconds early;
  - the two that close in an iris, into the kitchen (the romance's heart) and into the surf (the cartoon's round):
    the iris is the jump, and a flicker of the next world whole in the middle of it broke it;
  - the first, which builds in the dryer's own glass instead;
  - the jump into the dark, where the surf's worlds collapse into her on their own;
  - the fold home on the great hit, where the mosaic flips its own panels;
  - the drop into the rocks' silence, which is a clean cut.

Through every jump she is moving at, the ball draws out along its way for a few frames, most at the cut itself, as if
it went through something.

Every life is its own picture (`film.ts`), so a jump changes the film as well as the world. At home the show is the
plain full frame. The movie star's life (the premiere and the alley) is in widescreen, 2.39:1 between black bars,
with a soft vignette and fine grain. The kung fu picture (the dojo) is an old print in scope: faded warm, blacks
lifted, heavy grain that changes 24 times a second, a scratch down the emulsion and dust. The hot dog life is a
soft-focus romance, its edges gone to a glowing pink haze. A flicker before a jump shows the next life in its own
picture. The surf's new worlds have pictures too: the IRS office is under green office tubes, and karaoke is a VHS
tape, with scanlines and a tracking band rolling down it. Everywhere at once is a wall of every kind of film at once:
each panel is in its life's picture, and on the great hit every panel flips to the laundromat's plain frame. Even the
lives in the washer's window under the credits are in theirs. Raccacoonie, Jobu's dark and the rocks are left as
they are.

The camera takes the show's nine biggest hits in the body: a push-in of about 4.5% that eases back (`PUNCHES` in
`score.ts`). There are none in the rocks. The kung fu picture has its own camera: on the dojo's five hardest blows
(the two big ricochets, both kicks and the gong) it crash-zooms, in 10–17% over a tenth of a second, holding on the
blow and letting go (`CRASHES`). The movie star's lens flares, as a widescreen lens does: each press flash throws a
long blue-white streak across the frame, and in the alley the streetlamp and the neon flare faintly. The alley, the film's
"in another life", is step-printed as Wong Kar-wai's pictures are (the film's movie-star life borrows from them): while
she floats down the steps to Waymond, and again as the drain takes her from him, the picture goes at six steps a
second, smeared. The rain falls in held steps with two fading echoes, and she and Waymond leave stepped ghosts where
they have moved from; it comes out sharp, in real time, for the touch. Nothing that strikes is moved: the ball and
every part keep real time. The romance and the
cartoon end their scenes as their pictures do: the hot dog life closes on her in a heart-shaped iris as the finger
snaps (105.85 to the jump), and Raccacoonie's kitchen opens on her in a round iris that blooms out to the frame
(106.73 to 107.4) and closes on her in one before the surf (120.3 to the jump). Each iris is centred on her, a little
smoothed, so she is always in it.

For a viewer whose system asks to reduce motion, the flickers, the punches, the crash zooms and the alley's step-printing are left out (`CALM` in `score.ts`), and
the old print's grain holds still, without its scratches and dust.

## In order

Times are show seconds. The fight's pulse is `fight(k)` (142 to 200 s), the fall's `fall(k)` (200 to 266 s) and home's
`home(k)` (278 to 320 s).

### Everything: the laundromat (0 to 57.9 s)

| Time | Music | What happens |
| ---: | --- | --- |
| 0 | the chord | The Wang family laundromat at night, a lit box on a dark street, with a red neon washer in the window. On the chord's eight onsets the fluorescent tubes blink and catch, the one over Evelyn first. In the silence Waymond sets a slumped, googly-eyed laundry bag back on its bottom. |
| 7.93 | the entry | She rolls onto the foot lever of the washer by the door. Four quarters drop from the coin column on the next four onsets, and the washer fills, spins up and walks toward the lever. |
| 12.79 | the great hit | The washer jumps and slams onto the lever, and she is thrown across the shop into a heap of receipts. The receipts storm up and come down onto the spike, the audit letter last (16.78). |
| 19.8 to 30 | the soft run | The taxes: she works the adding machine's long keyboard, rolling to a key on the long gaps and bouncing key to key on the quick notes, twenty strokes. On each one the crank ratchets, and the tape curls down the counter's end into loops on the floor. Joy comes in on the door's bell (20.19), crosses the shop, and stops right below her mother (23.74), leaning up toward her. Her mother does not look up. Joy turns and goes on the bell (29.37), and Waymond edges after her. Subtitled, high on the tile wall: *Mom? Can I —* (hers, in italic) / *Not now, Joy.* |
| 30.65 | two accents | The crank slams to the total and throws her into the lantern hanger's basket (31.46). It rides the garland, and a lantern pops open on each onset. |
| 34.33 | the breath | The hanger hits its stop and tips her into the big dryer. For twenty-three seconds of swells she tumbles in the drum, which turns with the music's loudness. The camera pushes in until its window fills the frame. From 46 s other worlds show in the drum's bays: a red carpet's flashbulb, a dojo's lacquer, hot dogs, a raccoon's mask, the bagel's black. |
| 57.95 | the first jump | The door bursts, and she flies out through the circle into the flashbulbs. |

### Everywhere (57.9 to 165.6 s)

| Time | Music | World | What happens |
| ---: | --- | --- | --- |
| 57.95 | louder | the premiere | The red carpet of her own premiere. Press flash guns fire as she flies in, and she lands and bounces. The marquee's spotlight hunts over the press and finds her (61.06), and a volley of flashes whites out the frame. She clips a brass stanchion and the posts go over like dominoes, one an onset (63.1 to 64.3). The theatre's doors crack and swing wide on 66.21, and a second run of posts goes. |
| 68.7 | sustained | the alley | Behind the theatre, in the rain, the film's "in another life": a neon washer in a laundromat window stutters on (71.95), and Waymond waits under a streetlamp. She floats down the stone steps and reaches him (76.46). The neon dips twice, and the camera pushes in on the two of them. The drain's iron cover knocks under her four times and gives (82.13), and she slides away from him into the lit shaft. He rolls onto the shut cover where she was, and does not follow. They speak, subtitled in the widescreen's lower bar: *I don't know where I am.* / *Here. With me. Stay a little.* (his, in italic) / *I can't.* |
| 86.30 | the flurry | the dojo | The kung fu picture she could have lived. Four wing chun wooden men trade her down their arms, tak-tak-tak, each arm swinging into her and ringing. A bo staff on a rope bats her over their heads, and a high kick sends her up to the bronze gong (95.42). A last kick is the jump. |
| 97.15 | flurry | hot dog fingers | A pink room and a grand piano, played with the feet. Her shin is posed as the dummy's thigh was. She rides and bounces up the keys, each dipping and blushing lilac as it sounds, into a hand of floppy sausage fingers that drapes over her. On 103.56 she lands on the mustard bottle and it squirts. The index finger sags under her and snaps on 106.73. |
| 106.73 | flurry | Raccacoonie | A teppanyaki chef who is a machine, and Raccacoonie inside the toque working the levers. The cleaver chops, and the spatula flicks her into the onion volcano, where she rattles like a lid. On 112.71 it erupts, and a shrimp tail is flung into the hat's pocket (113.69). In the breath the raccoon comes out under the brim and eats it, and in the last run an egg cracks on the spatula. |
| 120.95 | six big hits | the surf | One long flight, and a new world on every hit: a piñata party, a sign spinner on a street corner, the IRS office with its trophies, karaoke under a mirror ball, then a canyon, held, where two stones sit on a ledge in the foreground, faintly vermilion and faintly violet: the rocks, before we know them. Then flashes of every world she came through, backwards, and black. |
| 127.66 | two hits | the surf's end | Out of the black, every world she flew through comes back at her as slivers, clamps into a ring round her with a flash (127.66), spins, and collapses into her, down to a point (127.79). |
| 127.79 | the hush | the dark | She drifts down through the dark, seeds and salt passing at three depths, a sliver of colossal rim catching light below. On 133.79 a beam finds Joy, sitting still on the crown of the everything bagel. On 135.64 the whole bagel is lit, and the camera draws back until Joy is tiny on it. Joy speaks first, subtitled: *There you are.* / *Joy? What is this place?* / *Come and see.* |
| 142 | the pulse | the pull | Everything drifts in on slow spirals and goes over the lip on the beats, one thing a beat: a coat hanger, a sock, a trophy, a dog. Each time the well's violet glow flares and the bagel throbs, hardest on the loudest beats, with dust kicked off the lip. Evelyn is drawn in on a decaying orbit, a step closer each bar. The camera rides the orbit with her, close, the crust streaming past and things going over the lip beside her, with a warm catch-light under her. On beat 56 the lip brakes her to the brink, and in the held break Joy watches from the crown. On 165.62 she tips in. Each thing trails a ribbon of its own life's colour along its spiral for its last second, and as it goes over the lip the ribbon is drawn in after it and a ring of that colour flares round the lip and goes out: thing by thing the dark takes her colours, which the peak gives back. |

### All at Once (165.6 s to the end)

| Time | Music | World | What happens |
| ---: | --- | --- | --- |
| 165.62 | a hit, then a swell | everywhere | She breaks through into the dark in a violet flare, seeds flung out round her, and falls slowly past them, and the laundromat comes up round her, its tubes flickering on. On `fight(72)` she lands on a seesaw and the frame tears into two panels: home and the premiere. |
| 170.8 to 190 | the pumping pulse | everywhere | The frame splits into 4 panels on beat 76, 9 on 88, 16 on 96, 36 on 104 and 64 on 112. Each panel is another world with her in it, the same seesaw in its own materials: 13 worlds, no two neighbours alike, each in its own kind of picture (widescreen, an old print, a soft-focus haze, a VHS tape, office tubes). She and the weight trade throws on every beat. In every life she has, he is there: Waymond arrives beside her machine in more and more of the panels, on a beat each, his googly eye on her, until he is in three in four; in the last phrases Joy is there in some, without an eye yet. |
| 190 to 191.2 | the crescendo | everywhere | The wall crowds to 144 panels, and the seesaw throws her high. On 121½ every panel flips like a card to another world. On 122 they all flip to the same place, the laundromat, and on 122½ the net of frames snaps shut round her. |
| 191.22 | the great hit | home | She lands alone, home, at the party, and the googly eye slaps onto her in a burst of warm light, its pupil whirling round before it settles. Jobu's jumpers are in the room, each rearing at her in turn: a boxing glove on a spring out of a gift box (125), a steel trap (128), a mallet from the ceiling (130), a scissor arm (133). On each one's beat a copy of her own eye flies off her and lands on it, and its blow turns gentle: a nudge, a squeeze, a scoop, a cradle. The arm sets her on the dumpling steamers, and she steps down one a beat to the table, touching Waymond on the fight's last hit (199.61). |
| 200.16 | the drop | the rocks | Silence. Two stones on a ledge over a vast canyon, lumpy and flat-bottomed, the colour drained out of them: Evelyn's with her eye, Joy's beside it, where Waymond was. Pebbles fall from the lip and take forever to land. Joy's stone teeters forward on its flat underside (207.56, 208.36) and rolls out to the brink (209.96). On 213.96, the strongest note in the quiet, it goes over. Evelyn rolls to where she was (214.76), flinches back (216.36), and goes after her (219.56). The stones speak in subtitles, as the film's do, plain words low in the frame (this show's own lines, Evelyn's in roman and Joy's in italic): *It is quiet here. Nothing has to mean anything.* / *You don't have to follow me.* Nothing as she goes over; then *Joy —* and *I'm coming.* |
| 220 to 241.8 | a soft swell | the rocks | The long way down, on the beats, ledge by ledge. The camera goes over the brink after her and stays close, the wall's strata going up past. On a bench halfway down Joy is waiting, and Evelyn comes to rest against her (226.56) in a close two-shot, looking at her: where the stones touch, each one's colour comes back first and spreads over it. Joy goes on (227.76) and the camera goes down the gorge with them, Joy a bound ahead. On the long talus it draws back for a breath, the canyon most of the frame and the two of them small on the scree, then comes in again for the last bounds. At the bottom a dark ring lies in the sand: the bagel. Joy drops into it, and on 241.76 Evelyn follows. On the bench: *You came all this way.* / *Where else would I be?* |
| 241.76 | a breath | the dark | They fall into the bagel's hole. Joy is drawn up into its dark, shrinking and dimming, and Evelyn holds her at the lip. |
| 247.35 | the peak | the dark | A line comes down from a pulley high above: Waymond's. He drops as the counterweight, and on every beat the line turns the bagel backwards, a ratchet kick of the whole crust. On 118½ Evelyn heaves back, and on 122 Joy pops out of the dark. From 123 everything the bagel swallowed bursts back out of the hole, one thing a beat, last in first out, each with a googly eye, and a spray of seeds goes out on every eighth. On 136 an eye rises out of the hole and lands on Joy. The bagel shrinks as it gives, until its hole is exactly a washer's window, and the hole fills with glass light. As each thing comes out, a beam of its own life's colour shoots from the hole and stays: the carpet's red and gold, the dojo's lacquer, the hot dog's pink and mustard, the griddle's flame, the canyon's sand, the laundromat's lantern gold. Beat by beat the dark fills, until the bagel stands black in a radiance of every life she has been, wheeling slowly as it turns back. As it closes into the window, the radiance draws in and dims. Once Joy has her eye, her mother says to her what Waymond said to her in the alley: *Here. With me.* |
| 264.14 | the peak's end | home | Through the window: they are inside the drum of the washer by the door, where the morning started. The cycle ends, the door swings open (268.39), and they drop out. Waymond leaps the foot lever and touches Joy, and the touch runs through to Evelyn. |
| 275.2 | a hush | home | The camera closes slowly on the three of them together at the washer's foot, the window's glow behind them, and holds. Joy nestles against her mother on a soft note (279.84). He asks what he asked in the alley, *Stay a little?*, and this time she can: *I'm staying.* |
| 282.2 | home's pulse | home | The family portrait. A wooden box camera with a bellows stands on a tripod by the door, facing them. Joy and Waymond straighten up on two small hops. Evelyn rolls to a foot switch under the window and presses it on 286.20: a string of lanterns over the family lights one a beat, and the camera draws back to take in the whole portrait. The self-timer's red lamp blinks faster and faster while she hurries back beside Joy (290.38). |
| 290.99 | the last great hit | home | The flash: the bulb bursts, the room washes white from the camera's side with their shadows thrown on the washer, and a firework fills the door's glass with gold. The photograph ejects (291.20), flutters down like a leaf and props itself against the washer beside them (292.77). It develops by 293.01: the glowing washer window with the three of them in it, eyes and all. |
| 295.01 | the last hit | home | The tubes go out in the reverse order of the opening, and the neon with them. The three of them rest in the washer window's warm glow. |
| 297 to 328 | the tail | home | The end credits, over the dark (below). The lanterns have gone down to an ember with the tubes. The dryer's window opened the multiverse; the washer's closes it. In its lit glass the lives she went through come back once, in the order back home, about two seconds each: the bagel, the rocks, Raccacoonie's kitchen, the hot dog piano, the dojo, the red carpet. In each the three of them are there together, small, eyes and all (on the rocks, three stones on the ledge where there were two). The three look up at the window all through them, and the empty drum gives a slow half-turn among them (305.40). Then the glass is only its own warm light; it swells once (312.59), and they look at one another: of all of them, this one. |

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
  Run again after the looks, the bags and the machines: it still passes (3,065 checks, one of them new), and the
  chunk is 391.5 KB (143.7 KB gzipped), 5.7 KB gzipped over `origin/main` in all.
- **A pass for Waymond on the line.** In the peak he catches the line and drops as the weight that pulls Joy back out
  of the bagel, but his eye only swung with his fall. Now from his catch (247.9 s) he watches Joy, until he is
  carried down out of the frame (249.6 s).
- **A pass for whether the looks are seen.** The looks check only asked that the one looking and the one looked at
  exist. Each look was measured for how much of it is seen: its eye inside the frame and at least 7 px across on a
  720p stage. All but one were seen for 81–100% of their span. Waymond's on the line was seen 11%, from his catch
  until he goes down out of the frame. It now ends there. `check:shows` holds every look to being seen for at least
  half its span.
- **A regression sweep.** After the looks, the camera changes and the new dressing, the whole show was swept again in
  the viewer's framing, a frame every 2 s. Every world reads, the dressing stays out of the action, the credits sit
  over the night glass, and the end goes down to dark. Nothing had regressed, and nothing was changed.
- **A pass for the hush.** In every sweep the hush (128–133 s) was a near-black frame with one red dot. On a desktop
  screen it could read as a stalled show. The seeds and salt drifting at three depths are now about half again as
  bright, so the fall reads as depth and motion, and the frame stays dark: still the quiet the music asks for.
- **A pass for the meeting in the alley.** Waymond watched her go down the drain, but not come to him. Now from
  71.0 s, as she floats down the steps in the rain, his eye is on her. He watches her arrive and the moment they
  share, and his look runs on unbroken as the drain takes her.
- **A pass for one long playthrough.** The whole show was played straight through, once, in real time, in real
  Chrome with the GPU (1440×810 at 2×). All 19,885 frames ran at a flat 60 fps. The worst frame was 20 ms, and none
  was over 40 ms. Memory after a forced collection rose from 27 MB to 34 MB over the show. Played three times over
  its first 100 s, it rose 1 MB the first time and not at all after. That is caches filling as each stretch is first
  played, not a leak. Nothing was changed.
- **A pass for the song.** Every audit used the dev's `?music=file` override, so the real page was checked. Opened
  plainly, it reaches only for YouTube's privacy-enhanced embed of the official upload, and the music is ready. No
  audio file is requested. The production build ships none of this recording (its audio files are other shows').
  The write-up's account of the audio had still described a cut file as if the show played it. It now says that
  playback is YouTube only, and that the scripts are for measuring.
- **A pass for the sync with YouTube.** The strikes are timed to the recording within 40 ms, which holds only if the
  page keeps the show in step with the player. Played on the real page with YouTube's audio, the show's clock was
  within ±1 ms of the player's own time: from the start, after two seeks, and through 60 s of the peak. The music is
  the clock. What this cannot measure is the device's audio output latency, which is the same for any web player.
  Nothing was changed.
  Later measured at the panel's other speeds too: at 0.5× within ±3 ms and at 2× within ±19 ms, from the start and
  after seeks. Once, at 0.5×, YouTube's player failed to load after a seek and the show ran on without it. It did
  not happen again in two reruns, and the page's soundtrack code is shared, not this show's.
- **A pass for the cold open.** The first eight seconds were the one stretch where Waymond, the only one with an
  eye yet, looked at nothing. Now he looks up at the tubes as they blink and catch over him, left then right. He looks
  down at the slumped bag as he rights it, then at Evelyn before she sets the washer going. The show's first seconds
  introduce him as the one who notices. All four looks are checked at full size and seen 80–100% of their span.
- **A pass for the panel.** The panel beside the show was looked at open, on a desktop and on a phone. The title,
  the long music credit (it wraps to two lines), the YouTube player (whose terms want it seen), the transport, the
  camera modes and the export all fit and read. On a phone the panel stacks under the stage, and the stage still
  holds each world's action. The panel is the site's own and was not changed.
- **A pass for the share card.** The still a link unfurls with was 243.5 s, chosen before any of these passes: the two
  of them small and off-centre in the hole, Joy without her eye yet. It is now 255.75 s. Both have their eyes and
  look at each other, centred in the glowing hole, with everything the bagel swallowed bursting back out round them.
  That is the story in one frame. `public/shows/come-recover/opus55-all-at-once.png` was rendered by
  `scripts/shows/show-cards.mjs`. In the Shows page's four-up `public/shows/card.png`, only this show's quadrant was
  replaced, so the other shows' cards are byte for byte as they were.
  (In a later pass the four-up card's alt text in `shows/index.html` was brought up to the new picture as well:
  "Everything's mother and daughter, googly-eyed, in the glowing hole of the everything bagel".)
- **A pass for Evelyn's kindness.** She gave each of Jobu's jumpers her eye without looking at it. Now, as each eye
  leaves her (`GIFT_LOOKS` in `kindness-draw.ts`), she looks at the machine it goes to, from a breath before until
  it has landed: left to the glove's box, right to the trap, up to the mallet, up to the arm. The first waits until
  her own new eye has had its fling.
- **A pass for the end of the fight.** Waymond watched her all the way to him, but she did not look back. Now, as the
  arm sets her on the steamers and she steps down to him (from beat 140, 198.0 s), she looks at him. On the fight's
  last hit the two of them are looking at each other, before the silence of the rocks.
- **A pass for the gaps in Evelyn's looks at Joy.** Two long stretches where she is fixed on her daughter had her eye
  only swinging: the long way down the canyon (219.7–241.8 s) and the heave in the peak (247.3–254.9 s). Her looks at
  Joy now run unbroken from the rocks' cut to the brink, and from the hole to Joy's eye. On the way down Joy is mostly
  ahead and out of the shot, so Evelyn looks down the canyon after her. Both are seen for most of their span.
- **A pass for the home-coming.** Through the washer's window, the family's first moment back in one place, nobody
  looked at anybody. Now, from inside the drum, Evelyn and Joy look out at Waymond waiting by the lever. He looks
  back at them through the glass until he leaps the lever to Joy, where his look at her takes over.
- **A pass for restraint.** A googly eye's charm is its loose pupil, so the looks were measured for how much of each
  eye's time they hold. From the rocks to the peak, Evelyn's eye was held 88% of the time. The canyon look (added a
  pass before) aimed at a Joy mostly off-screen, while her stone drops ledge by ledge on the beats. It now ends as
  she goes over after Joy, and down the canyon her pupil jolts on each landing again. That stretch is held 55% now.
  Over the whole show the eyes are held 25–37% of the time, so the looks stay moments.
- **A pass for the dryer's audience.** The dryer was the longest stretch with the least in it. From 34 s to 46 s,
  before the other worlds show in its bays, it was a ball and laundry going round. Evelyn has no eye yet and
  Waymond is out of the shot, but Waymond's googly-eyed laundry bags sit on the washers either side. Now they watch
  her go round the drum, their pupils turned to her, easing in as she lands and out as the door bursts. The room
  takes a target through `BAG_WATCH` in `set.ts`, which the score sets to her. By about 45 s the camera has pushed
  in past them, and the worlds in the bays take over.
- **A pass for stillness, by measure.** The whole show was rendered at 4 fps and measured for how much of the frame
  changes from one quarter second to the next, to find stretches where attention can slip. The only ones with less
  than 0.6% of the frame changing, for three seconds or more, are under the credits (302.5–312.5, 313–317.3 and
  320.3–328.3 s). That is the intended rest, and the page's words fading over it are not even counted. Every other
  stretch keeps something moving, the rocks' silence and the hush included. Nothing was changed.
- **A pass for the gentled machines.** Each of Jobu's jumpers, once given her eye, let its pupil hang loose. Now
  each one, once its new eye has settled from its landing (0.9 s after), turns to watch her, wherever she goes,
  to the end of the fight: the glove after the push it gave her, the trap after its toss, the mallet after its
  scoop, and the arm as it cradles her. Kindness answered with fondness (`watching` in `kindness-draw.ts`).

- **A pass for reduced motion.** The site honoured `prefers-reduced-motion` only in its menus. The show now does too
  (`CALM` in `score.ts`). A viewer who asks their system to reduce motion is spared the two jolts that carry no
  story: the next world flickering through before each jump (also the show's flashing), and the camera's punch on
  the ten biggest hits. The cuts and everything else are as for anyone. It is read in the browser when the show is
  built, so the checks, share cards and everyone else see the show as made. Tested with Chrome's emulated
  preference: 13 flickers become none, and the great hit's frame follows its own move without the push-in.
  Its one side effect, on files saved by such a viewer, is under Known limits.
- **A pass for testing the calm version.** The checks run in Node, where there is no preference, so they only ever
  saw the full-motion show. `compose(calm)` now takes the mode, defaulting to the viewer's. `check:shows` builds both
  and holds the calm one to no flickers, no punch on the great hit, and every jump at the same moment. It was
  confirmed to fail when the punch ignores the mode.
- **A pass for a code review.** The branch's code was reviewed for correctness. Five findings were in this show's own
  code and were fixed:
  - At the very end the googly eyes went dark at the room's rate, while the window's light still lit the balls they
    sit on, so the eyes vanished before the faces. `endShade` now darkens with the same falloff round the window as
    the room's dark.
  - Reduced motion was read once, so turning it on mid-show did nothing until a reload. It now follows the setting
    live: the punch reads it each frame, and the show skips the flickers while it is set (a `quiet` on
    `MultiverseShow`).
  - The binary search was used by `where()` but not `at()`, which the stage, the eyes' targets and the bags all call.
    Both now use it (`seek` in `show.ts`). Seventeen frames are pixel for pixel as before.
  - A burst cut the balls' discs out with one even-odd path, which lets the overlap of two discs back in. Each disc
    is now clipped out on its own.
  - `BAG_WATCH` was rebound by every `compose()`, so a later one (in the checks or a tool) took the bags over. The
    first, the viewer's, now keeps it.
  - Five more findings were in shared code that this branch does not touch (the player, the shell and the engine),
    and were left to their owners.
- **A second code review, of the PR alone.** Ten findings came back, each checked first.
  - **Looks let go at handovers.** Each look eased out as the next eased in, so where one ended as the next began,
    the hold dipped to nothing and the eyes flopped loose for a moment (at the portrait's lens-to-photograph
    handover among others). Looks that meet now make one run, eased only at its ends, and the eye hands from one
    target to the next. A look on its own is as it was.
  - **The street's colours had shifted.** Putting the further fronts ahead of the original five in one list
    renumbered them, which changed the original block's tones and lit windows in every view through the glass. Each
    keeps its old number now, and the storefront matches `origin/main` again.
  - **The mosaic's first tear snapped** on a wider stage. The home panel now shrinks from the whole stage to its
    place in step with the tear.
  - **A machine's pupil could turn the long way round** as it began to watch her. The turn is now the short way.
  - **The rope's free end** is no longer drawn once it has run down past Waymond. It was already out of the frame by
    then.
  - Tidying: the bags' target is looked up once a frame, not once a bag; the check reuses a composed show; and
    `drawCounter` has its doc comment back.
  - Left, with reasons. In a saved 1080p video the credits' long title starts about 35 px in from the left edge, so
    it is tight but whole. `BAG_WATCH` keeps the first composed show, which in the page is the one playing. The
    eases written out in three places are each one line.
- **A pass for unintended changes.** The street's colours had shifted without anyone meaning them to, so frames were
  compared with `origin/main` where nothing was meant to change. That covered twenty frames of the dojo, the piano,
  the surf, the mosaic after its first tear, and the pull, and all twenty are pixel for pixel the same. In the
  worlds that were changed, each difference falls where it was meant to:
  - the alley: Waymond's eye, and at its first frame the premiere's kerb under the carpet's corner;
  - the kitchen: the counter's face, and the whole frame where its camera moved;
  - the rocks: Evelyn's eye.
  - This log had also gone out of order (three entries placed early) and was missing the second review's entry. Both
    are put right.
- **A third code review, of the PR.** Ten findings came back. Each was checked against the show first.
  - **The mosaic's first tear opened on one side.** While the home panel was still oversized, panels on its right
    were drawn over it and panels on its left under it. It is now drawn first, and neighbours on every side come in
    over it.
  - **On an ultrawide stage, the car under the credits vanished** past the shop's end wall, where the street now
    shows. It drives on out of the frame now. The lantern string across the street runs on in more spans, so it
    never ends in the air.
  - **The credits' long title** started about 35 px from the left edge of a 1920 px frame, so a wider fallback font
    could clip it. The cards stand at 30% of the width now, which doubles that margin and still clears the lantern
    string.
  - **The bags' target** had been a module-global, kept by the first composed show. It is now the room's own
    state (`RoomState`), one per composed show and filled by that show's score, the way the eyes get their show.
  - **Smaller things.** A pupil whose history begins after `t` hangs at rest rather than taking a step. Looks merge
    into a run only when they touch or overlap, not across a gap. The scrolls use the kit's `hash`, and every
    hand-written ease uses the kit's `smooth`. The end's dark is one set of stops, used by both the dark and the eyes.
  - Frames are pixel for pixel as before except the scrolls' brush strokes.
  - Left as it is: making `laneAt` itself fast belongs in the shared `parts.ts`, which this PR does not touch.
- **A pass for the full build, after the reviews.** `npm run build` passes again: the typecheck, all 3,066 checks
  (one more, the reduced-motion check), and the production bundle. The show's chunk is 392.3 KB (144.1 KB gzipped),
  6.1 KB gzipped over `origin/main` in all. The machine was heavily loaded by other work at the time. The shows'
  checks took 638 s on the clock, but only 272 s of processor time, of which this show's own checks are about 7 s.
  So the slowness was the load, not this show.
- **A regression sweep after the reviews.** The three code reviews changed visible things: the tear, the street past
  the wall, the credits' place and the looks' handovers. So the whole show was swept again at the viewer's framing, a
  frame every 2 s. Every world reads, the credits sit whole over the night glass, and the end goes down to dark.
  Nothing had regressed, and nothing was changed.
- **A pass for Safari.** Twelve key frames were rendered in WebKit, Safari's engine (26.6, in a throwaway install),
  and compared with Chrome: the great hit's sunburst, Joy's violet burst, the bursts' clipping, the end's dark and
  the reduced-motion listener. They match, apart from the edges of type and lines, and the page reports no errors.
- **A director's pass: the long way down, and every life in the window.** Small passes had stopped finding much, so
  the show was watched whole again for what it most lacked, and two things were rebuilt.
  - **The rocks' long way down** (219.6 to 241.8 s) is the film's most moving scene, and it was the show's emptiest
    stretch: the camera drew back to 23 cells and held there, so for twenty seconds the two of them were specks on a
    beige canyon, and their meeting on the bench, the moment their colour starts to come back, was two dots
    touching. Now the camera goes over the brink after her and stays close, 3.3 to 4.8 cells, down the wall, the
    long drop and the gorge, with room below her for where she is going. The meeting is a close two-shot (2.25
    cells, pushing in to 2.05), and Evelyn looks at Joy through it. Where the stones touch, each one's own colour
    comes back first: a round of it spreads over the stone from the touching side, turning with the stone as it
    rolls, ahead of the slow return of the whole (`flushOf` in `ledge.ts`). The canyon's scale is kept for one
    breath, on the long talus (about 9 cells), and the camera comes in again for the last bounds and the ring.
    `check:shows` caught Evelyn leaving the Zoom frame for 0.1 s in a bound at 239.2 s; the framing there was
    eased, and the worst is now 0.94 of the half-frame.
  - **The tail** was thirty seconds of a still room under the credits. The show opened the multiverse in a window,
    the big dryer's, at 46 s; now a window closes it. In the washer's lit glass the lives she went through come back
    once, in the order back home, with the three of them together in each (`home/finale-lives.ts`): the bagel's
    crown, three stones on the ledge, the griddle under the toque, the piano's keys, the dojo, the red carpet. The
    family look up at the window all through them. Each comes and goes over three quarters of a second, and the
    carpet's far flashbulb glints slowly, so nothing in the window flashes. After the carpet the glass is its own
    light again, and on the swell they look at one another.
- **A director's pass: every life its own picture.** Every world was drawn in the same clean full frame, so a jump
  changed the set but never the film. Now the lives are pictures of their own kinds (`film.ts`): the movie star's in
  widescreen, the kung fu picture an old scope print, the hot dog life a soft-focus romance, and home the plain full
  frame. Coming home from the dojo's bars into the hot dog life's open frame, and from everywhere at once into the
  laundromat, the picture opens up.
  - The bars hid what the old framings left at the frame's edges. The checks for Zoom, for the family cut at the edge
    and for the looks being seen now measure against the band between the bars. Under Zoom they found Evelyn out of
    it for 6 s in the alley and on the carpet, because the camera stood well above her. The premiere's and the
    alley's framings now keep her nearer the band's middle, with the carpet and the alley's floor low in it. Two of
    the dojo's held shots follow her a little more as the kick sends her up to the gong. Under Zoom no cut by the
    band lasts as long as a second.
  - Nothing in the pictures flashes. The print's brightness does not flicker, and its grain is fine and dim. With
    reduced motion asked for, the grain holds still and the scratches and dust are left out.
  - Seen and kept: the jumps into each picture and out of it, the flickers (each shows the next life in its own
    picture), Overview (where the bars stay, as the picture's own), Zoom, and ultrawide (a stage wider than 2.39:1
    has no bars). On a tall phone stage the widescreen lives are a band across its middle, as a widescreen film is on
    a phone, with black above and below where the full frame showed more world (see Known limits).
- **A director's pass: every film at once.** The pictures were only the lives' own legs, so everywhere at once, the
  climax, was still a wall of one kind of picture. Now each panel carries its life's look: the movie star's carpet and
  alley between bars, the dojo an old print, the piano in its haze. The surf's new worlds gain looks of their own
  (karaoke a VHS tape with a tracking band, the IRS office green under its tubes), and the surf's glimpses of the
  lives carry theirs too. On the great hit every panel flips to the laundromat's plain frame, and the net snaps shut.
  - In a tall panel (the two-way split at 170.8 s) the bars took half the height; a panel keeps at least 60% of it
    between its bars.
  - Measured in Chrome at 1440×810, scrubbing a frame at a time: with a look in every panel the 16- to 64-panel walls
    took 23–27 ms a frame, against 16–17 ms without. So the many small panels get a light version (the grade, the
    bars and the tape's scanlines, without grain, wear or vignette), and the walls are back at 16–17 ms, as before.
    A panel drawn at the skins' finest detail (34 px a cell or more, so the first splits on a large stage) keeps the
    whole look.
  - The checks' band for widescreen now covers the surf's glimpses of the movie star's and the dojo's lives.
- **A director's pass: the dark fills with every colour.** The peak is the loudest passage of the cue, and it was the
  darkest picture in the show: the black bagel in the black, the same frame for 17 s. Now everything the bagel gives
  back comes out with a beam of its life's colour behind it (`void/radiance.ts`, by `THING_WORLD`), round the whole
  circle a golden step apart, so the radiance fills on every side and not only where things are thrown. Each beam
  flares as it comes and settles to a glow that stays, and they wheel with a fifth of the bagel's turn. When the line
  runs out they draw in and dim, and the hole's window light takes over for the cut home.
  - They rise one a beat, each a narrow share of the frame, so the frame's light never swings as a flash does.
  - Measured in Chrome at 1440×810: in the peak's close shots (252 s) the beams reached far past the frame and cost
    14 ms a frame. They are clipped to the frame now, and every stretch of the peak is at 16.5–16.8 ms.
- **A director's pass: the dark takes her colours first.** The peak's radiance gives back every life's colour, but
  nothing had shown them being taken. Now in the pull each thing trails a ribbon of its life's colour for its last
  second, which is drawn into the hole after it, and a ring of that colour flares round the lip and goes out
  (`drain` in `void/radiance.ts`). The ribbons are in each life's first colour, never the carpet's or the dojo's red,
  which beside Evelyn read as her own trail; the peak's beams keep both. Their pieces meet butt-ended, as round ends
  overlapping beaded them. The pull holds 16–17 ms a frame with them.
  - A whole-show sheet of 80 frames, after this and the passes before it: every world reads, and nothing has
    regressed.
- **A director's pass: each picture its own camera.** The lives had their own looks but one camera. Now the kung fu
  picture crash-zooms on its five hardest blows, as a Shaw Brothers picture does, the gong's the deepest (it had a
  punch of its own, which the crash replaces). The movie star's widescreen lens flares: every press flash and gun
  throws a horizontal blue-white streak, and the alley's lamp and neon flare faintly (`flare` in
  `star/premiere-light.ts`). Under Zoom, in the dojo's band, no cut lasts as long as a second with the crashes in.
- **A director's pass: the romance and the cartoon end their scenes in their own way.** The hot dog life's soft-focus
  romance now closes on her in a heart, and Raccacoonie's clean cartoon picture opens on her in a round iris and
  closes on her in one, as a cartoon ends (`IRISES` in `film.ts`). Each fills the frame with black round a hole that
  rides on her, smoothed over a fifth of a second; each takes most of a second, once, so none of them flashes. The
  flickers before the jump into the kitchen still show it whole.
- **A director's pass: the chapters.** The show is built on the film's three parts, but nothing told the viewer so.
  Now each is named as it begins, as the film names its chapters: *Part one, Everything* over the storefront's dark
  glass as the tubes come on (it was moved in off the bright wall and a light sign in the door), *Part two,
  Everywhere* set in the premiere's lower widescreen bar as a film sets a title in its letterbox, and *Part three, All
  at Once* in the dark before the laundromat comes up round her. `check:shows` holds the three to their names and
  their parts (692 checks).
- **An audit across the modes, after the director's passes.** The pictures, irises, crash zooms, chapters, beams and
  ribbons were each checked where they change what a viewer sees:
  - **Zoom:** the whole show swept at 48 frames; every world reads and she is in every frame.
  - **The saved video:** its frames paint the page's words themselves (`shows/words.ts`), and that painter ignored a
    card's `scale` and `plain`, which the page honours. A saved video would have set *Everywhere* at 1.6 times its
    size, out of the widescreen bar it is set in. It now sizes and colours cards as the page does (a fix in the
    shared file, which Boléro's and Soft Lamp's scaled credits needed too). A painted frame of each chapter and of
    the first credit was compared with the page's.
  - **Reduced motion:** rendered with the preference emulated, the dojo has no crash zoom and the print's grain holds
    still; the irises, as cuts, stay.
  - **Safari's engine:** nine frames of the new work (the bars, the print, the haze, the heart iris, the tape, the
    pull's ribbons, everywhere at once, the radiance, the lives in the window) rendered in WebKit as in Chrome. Its
    one failed request is the analytics' debug script, not the show.
- **A director's pass: the alley step-printed.** The movie star's life borrows from Wong Kar-wai, and his signature,
  step-printing, was missing from the alley it borrows him for. Now the descent to Waymond (70.6 to 76.3) and the
  drain taking her (82.2 to 85.0) are held at six steps a second and smeared: the rain is drawn at the held step and
  the two before it, fading (`stepPrint` in `star/premiere-alley.ts`), and the two of them leave stepped ghosts behind
  them (`paintGhosts` in `film.ts`). A ghost shows only where its ball has moved from, so Waymond, waiting still, is
  not veiled. All of it is worked out from the show's clock, so a scrubbed frame is the frame that played; the ball
  and everything it strikes keep real time. Measured in Chrome at 1440×810, the alley holds 16.6–16.8 ms a frame with
  the rain drawn three times over.
- **The alley's step-printing, watched in motion, and the first glimpses of the lives.**
  - A filmstrip at 30 fps through the descent showed the step-printing all but unseen: she floats slowly, the camera
    rides with her, and her ghosts were only an eighth of a second behind her, where they were faded out as not having
    moved. The steps are now six a second, the ghosts a step and a half and three steps behind (to half a second),
    and a ghost fades only where it is within 0.7 of a radius of its ball. Her trail down the steps and her held steps
    down the drain's shaft now read; Waymond, waiting still, is still clear.
  - The big dryer's glass, where the lives are first seen (46 to 57 s), now shows each in its picture's colour: the
    dojo's wedge an old print, the hot dogs' soft. Not the bars: in a wedge of the drum they read as black chunks.
- **A director's pass: the rocks speak.** The rim's silence was the plainest stretch of the show, and the film's is
  famous for one thing: its two stones talk in subtitles. Now these do (`SUBTITLES` in `credits.ts`, set by the page as
  the chapters and credits are). The lines are the show's own, not the film's, eight in all, each on a note the stones
  already move on. Evelyn's are in roman and Joy's in italic, so who speaks is told without a name, and a soft dark
  low in the frame (`ledge.ts`) keeps the cream readable on the pale canyon. Nothing is said as Joy goes over. A new
  check holds them to the canyon, one at a time, and silent at the brink (693 checks). A saved video's frame of each
  kind matches the page's.
  - The full `check:shows` run of the last pass, which an outside SIGTERM had cut short twice on a loaded machine,
    finished: all 692 passed.
- **A director's pass: the three conversations.** The rocks' subtitles made one scene speak; the show has three
  conversations, and now all three do. In the alley, the film's "in another life", she and Waymond speak in the
  widescreen's lower bar, as a Wong Kar-wai picture is subtitled, and in the hush Joy speaks first from the crown of
  the bagel. Evelyn is always in roman and the other in italic. The rocks' soft dark is now one piece
  (`subtitleBed` in `credits.ts`) under the hush's lines too, where the middle one sat over the bagel's seeds. The
  check now holds every line to its own scene, one at a time, none over a jump. The lines are the show's own.
- **The subtitles on a phone.** On an upright phone the 16:9 frame the page sets words in is about 220 px tall, and
  the subtitles came out 7 px high, unreadable. A card can now set the least its type may be on the page
  (`TitleCard.least`, a shared addition the page honours); the subtitles are never under 13 px, and the soft dark
  under them grows and centres to match. The alley's still sit in its bar. On a desktop nothing changes.
- **A director's pass: the callback.** In the alley Waymond asks her to *stay a little* and she says *I can't*. Home,
  the three of them together at the washer's foot, he asks again, and she answers *I'm staying.* A fourth
  conversation, two lines, and the subtitles' arc: the only lines the show says twice. The soft dark is under them in
  the laundromat too. The check holds them to home, before the credits.
- **A director's pass: the wound the conversations answer.** The subtitles had answers and no question. Now, at the
  taxes, Joy comes to her mother and says *Mom? Can I —*, and her mother, not looking up, says *Not now, Joy.*
  Everything said after answers it: Joy's *There you are.* in the hush, her mother's *Where else would I be?* on the
  bench, and *I'm staying.* at home. The close two-shot has the family along the frame's foot, where the words covered
  Joy and the counter's red, so this scene's subtitles sit high on the plain tile wall, left of the corkboard, and the
  soft dark follows each scene's place. The check holds every line to its scene, the taxes now one of five.
- **A director's pass: she learns his words, and the words together.** At the peak, once Joy has her eye and mother
  and daughter look at each other, Evelyn says to her what Waymond said in the alley, *Here. With me.* It comes at
  255.8 s, on the close shot, as the camera opens onto the radiance. That is after the share card's frame (255.75),
  whose picture was rendered again and is pixel for pixel the committed one.
  - Every stretch with words was then screenshotted on the real page together (the chapters, all six conversations,
    the credits). Joy's and the others' lines, in italic, which the page sets a little faded, were faint on the
    canyon; the soft dark under them is deeper now.
- **The chapters and credits on a phone.** On an upright phone their fine print (*Part one*, each credit's role, the
  cast's "as" lines, the notes) was 4–5 px high. They now set a floor of their own (`least`, 4.2 px a unit), and the
  page keeps a card that grows past the stage's width inside it (a shared change: such a card is shrunk to fit and
  kept within the edges). *Part one, Everything*, grown, would have crossed the bright washer, so on a tall stage it
  lifts into the dark storey above the shop, as a title card. On a 1280×720 desktop nothing changes; at 960×540 the
  chapters are a little larger, *Everywhere* still in its bar.
- **A pass for frame time, after the director's passes.** They added drawing all through the show (the pictures,
  irises, crash zooms, beams, ribbons, step-printing, the lives in the window), so the whole show was played at 1×
  in real Chrome at 1440×810 on a 2× display: 19,816 frames, a mean of 16.7 ms (59.9 fps), but with ten frames over
  33 ms, the worst 150 ms, on a machine at a load of 10 to 20 from other work. To tell the show from the machine, the
  four heaviest stretches (the dryer's glimpses, the surf, everywhere at once, the peak's radiance) were played
  alternately in this branch and in the show as it was before the director's passes (`7f5f9dd3`, in a scratch
  worktree), twice each. Both hold 16.7 ms a frame, with the odd 20 to 48 ms frame in either as the load moves: no
  regression. The spikes did not come back in either once the load fell.
- **Considered and left:** a last drift of the washer's window to another life after the credits, as the film's
  Evelyn drifts and comes back. The window already shows the red carpet last at 308.9 s, so it would have repeated a
  beat rather than added one.
- **A director's pass: kindness, up close.** The great hit's turn, the film's thesis, was shot at 4 to 6.3 cells:
  at 1280×720, Evelyn 30 to 47 px across, but the eyes she gives each jumper small, and nothing framing the giving. The camera now comes in on each kindness (2.6 to
  3.1 cells), framed between her and the jumper so her eye is seen to fly to it and land: the glove's punch going
  soft, the trap's bite a toss, the mallet's blow a scoop. It opens out for the lob under the ceiling (4.3 to 4.7
  cells, keyed from the throw, so she is never at the frame's top), comes in again on the claw, holds the cradle as
  a two-shot with Waymond watching across the table, and closes to 2.2 cells as she steps down to him. Under Zoom her
  worst is 0.88 of the half-frame.
- **A pass for size, by measure.** The kindness pass's first account said Evelyn was "about 10 px" in the fight's
  wide shots. That was measured from a contact sheet's thumbnail: at 1280×720 she was 30 to 47 px across. It is
  corrected above. Measured properly over the whole show, Evelyn, and Joy and Waymond while in the frame, are at
  least 14 px across everywhere but the hush (down to 11 px, small against the bagel on purpose). `check:shows` now
  holds it (694 checks); at a 30 px threshold the check fails where it should, on the opening's wide shot, the
  pull, the canyon's breath and the peak's wide shots.
- **Overview, after the pictures.** The bars, the old print, the heart and the cartoon iris, karaoke's tracking
  band and the wall of films all frame the whole world as the picture's own, and she is in each.
- **A pass for motion at the jumps.** The film language is mostly in its transitions, so four jumps were rendered as
  filmstrips at 30 fps. Into the kitchen and into the surf, the flickers before the jump showed the next world whole
  in the middle of the iris closing on her: the romance's heart broken by two frames of a dark kitchen, and the
  cartoon's iris by a bright piñata, each a large swing of light. Those two jumps now have no flickers (the iris is
  the jump, as the dryer's glass and the mosaic's panels are theirs), and `check:shows` holds it. Into the dojo the
  flickers show it in its own print, and the bars hold through the cut; into the hot dog life they show it in its
  haze. Ten flickers in all, from thirteen.
- **The rest of the jumps in motion.** The other five jumps were rendered as 30 fps filmstrips too. Out of the dryer,
  into the dark, the great hit home and back through the washer's window all read cleanly. Into everywhere at once,
  the two flickers showed the mosaic's full wall of 64 bright worlds over the dark bagel, a wall the show does not
  reach until 184 s, and the largest swing of light in the show. That jump now has none; its violet flare is its
  break. Eight flickers in all.
- **An audit after the director's passes, in two more modes.** The whole show was swept with reduced motion asked
  for, at 48 frames: every world, picture and line is there, the crash zooms, step-printing and grain left out as
  they should be. Firefox was tried again and would not start (see Known limits).
- **A director's pass: he is in every life.** Everywhere at once was the one long stretch with no story beat of its
  own: a wall of her lives, and in none of them anyone she loves. Now Waymond is beside her machine in more and more
  of them as the wall multiplies (`family` in `multi/mosaic.ts`): each panel's Waymond drops in on a beat of his own,
  from beat 77, until about three panels in four have him by the crescendo, his googly eye turned to her. From beat
  105 Joy is in about a third, on her side, without an eye, since hers comes at the peak. The home panel has neither,
  and from the turn on 122 they are gone with every other world, so the fold brings her home to him waiting at the
  table. The first placement stood them at the panels' edges, cut in the 2×2 views; they stand just past the
  plank's ends now.
  - Frame time could not be told from the machine's load in playback; measured by direct renders in the next pass.
- **The mosaic's family, measured, and the last two jumps.** On a loaded machine playback could not tell the family's
  cost from noise, so frames were rendered directly instead, in this commit and the one before it, interleaved:
  at 182, 186.5 and 189.5 s, 1440×810 at 2× with the PNG's encode, a median of 57.7 ms with the family and 61.7 ms
  without, over 36 each. The cost is below the noise. The drop into the rocks and the brink were watched at 30 fps
  too, so all eleven jumps have been: the rocks a hard cut into the silence, the brink its two flickers and the cut.
- **The full build, after the director's passes.** They changed three shared files (`words.ts`, `registry.ts`,
  `player.ts`), and until now only the typecheck and `check:shows` had been run. `npm run build` passes: the
  typecheck, every check suite (3,069 checks, three more than before: the chapters, the subtitles, the family's
  size) and the production bundle. The show's chunk is 415.9 KB (152.5 KB gzipped), 23.6 KB (8.4 KB) more than
  before the passes. The portrait and the photograph (290 to 296 s) were looked at again and are as they were.
- **A trim pass.** The director's passes added a great deal, so the whole show was read again for what to take
  out. Two lines went. The hush's last, *Everything. All of it, at once.*, said the show's title 24 s before its
  chapter card does; Joy now says *Come and see.*, and the pull takes her mother in. On the rocks, four lines ran
  nearly back to back through what the music plays as silence; *Somewhere nothing ever happened.* is cut, so *Where
  are we?* is answered, after four seconds of quiet, by *It is quiet here. Nothing has to mean anything.* The film
  looks, flares, crash zooms and step-printing were each looked at for whether they crowd their scene, and are kept:
  each is in one life only, and each goes where that life ends.
- **A second trim, of the script as a whole.** Read straight through, Evelyn asked where she was three times: *I don't
  know where I am.* in the alley, *What is this place?* in the hush, *Where are we?* on the rocks. The third is cut.
  The drop into the rocks is now silent for eight seconds, as the music is, and Joy speaks first there, as she does in
  the hush. Fifteen lines in all.

## The looks

The googly eyes swing with their balls, but at the story's turns they look at someone. Each look eases in and out
over a quarter second. Looks that meet or overlap make one run, eased only at its ends, so the eye hands from one
target to the next without letting go. They are listed in
`score.ts` as each eye's `gaze` (`fx.ts`). `check:shows` holds every one of them live, the one looking and the one
looked at both there, and seen: its eye in the frame and big enough to read for at least half of it.

| Time (s) | Who looks | At | The moment |
| ---: | --- | --- | --- |
| 0.5–2.3 | Waymond | the tubes | up at each as it blinks and catches over him, left then right |
| 3.9–5.1 | Waymond | the slumped bag | as he sets it back on its bottom |
| 6.3–8.3 | Waymond | Evelyn | before she sets the first machine going |
| 20.3–23.9 | Waymond | Joy | she comes in on the bell and crosses to her mother |
| 23.7–27.6 | Waymond | Evelyn | her mother at the keys, not looking up |
| 27.4–30.3 | Waymond | Joy | she gives up and goes |
| 71.0–82.1 | Waymond | Evelyn | she comes down the steps to him in the rain, and they meet |
| 82.0–86.3 | Waymond | Evelyn | the drain carries her away from him |
| 192.1–200.2 | Waymond | Evelyn | the empathy fight, all the way to him |
| 191.7–195.5 | Evelyn | each jumper in turn | as she gives it her eye: the glove, the trap, the mallet, the arm |
| 198.0–200.2 | Evelyn | Waymond | set down on the steamers, she steps down to him: on the last hit they look at each other |
| 200.7–220.2 | Evelyn | Joy | the two stones in the silence, and over the brink after hers |
| 225.9–228.4 | Evelyn | Joy | down on the bench, she rolls up against her and rests there |
| 242.1–257.2 | Evelyn | Joy | holding her at the lip of the hole, heaving her back, and into her eyes once she has hers |
| 247.9–249.6 | Waymond | Joy | on the line, the weight that pulls her back, until he is carried out of the frame |
| 255.3–257.2 | Joy | Evelyn | once she has her eye, looking back into her mother's |
| 264.4–268.9 | Evelyn and Joy | Waymond | from inside the washer's window, out at him waiting by the lever |
| 264.4–271.5 | Waymond | Evelyn | back at them through the glass, until he leaps the lever |
| 271.4–273.6 | Joy and Waymond | each other | he touches her at home: father and daughter |
| 279.6–282.3 | Joy | Evelyn | she nestles against her mother |
| 290.3–291.4 | all three | the camera's lens | the portrait |
| 291.4–293.6 | all three | the photograph | it ejects, falls and develops |
| 298.9–311.4 | all three | the washer's window | their other lives passing through it under the credits, and the drum's half-turn among them |
| 312.5–315.2 | all three | one another | the window's swell under the credits |

Two other kinds of eye watch her too, drawn by the room and the kindness part rather than as the family's gazes, so
the checks above do not cover them:

- **Waymond's googly-eyed laundry bags** on the washers either side of the big dryer watch her go round the drum
  (34.6–57.9 s; each composed show's `RoomState` in `set.ts`, filled by the score). They ease in and out like the
  family's looks.
- **Jobu's jumpers**, once given her eye, watch her from 0.9 s after it lands to the end of the fight (`watching` in
  `kindness-draw.ts`). Their pupils turn to her while the machines go on waving, bobbing and swaying.

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
- **Reduced motion:** the calm version has no flickers and no punch, and the same jumps.
- **Flickers:** only in the second before a jump, each a frame or three, and no more than two before any jump, so a
  jump never flashes more than three times a second; none into the two irises (the kitchen, the surf) or into
  everywhere at once; at least eight in all.
- **The ball:**
  - inside a world it never jumps;
  - at every jump it holds its place on the screen, within 1% of the frame a millisecond: every jump is a match cut;
  - it is never hidden for more than 2.5 s;
  - under Zoom (1.5× closer) it never leaves the frame.
- **The pictures.** In the lives in widescreen the frame is the band between the bars: the checks for the ball under
  Zoom, for the family cut by the frame's edge and for the looks being seen all measure against it there (`keepIn`
  in `film.ts`).
- **Every strike lands on the recording.** 434 strikes, each within 40 ms of a measured onset or 30 ms of a comb's
  beat or eighth.
  - Everywhere-at-once and the kindness after it strike at least 85% of the fight's beats from 170.8 to 199.6 s.
  - The peak strikes at least 85% of the fall's beats from 247.7 to 264.1 s.
  - Home's last three hits are struck.
- **The family:**
  - Joy and Waymond, and Evelyn under Zoom, are never left cut by the frame's edge for more than a second;
  - none of the three is under 14 px across at 1280×720 for more than 2 s, but in the hush;
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
  - `home/finale-lives.ts`: the lives in the washer's window under the credits.
  - `film.ts`: the picture each life is in (widescreen, the old print, the soft-focus romance, the tape, the office
    tubes), painted over a world's whole frame, a panel of everywhere at once, the surf, or the washer's window.
  - `credits.ts`: the cards, the soft dark under them, and the room's fade to dark with the music after the last
    card, the washer's window last.
  - `hits.ts`: every strike, gathered for the check.
- **The parts:** one folder a world.
  - `home/`: `set.ts` is the room and its fixtures, with a light map that the tubes, lanterns, washer glow and
    fireworks drive. The parts are `laundromat`, `dryer`, `kindness` and `finale`.
  - `star/premiere`, `dojo/dummies`, `hotdog/fingers`, `hibachi/raccacoonie`, `rocks/ledge`.
  - `multi/`: `skins.ts` is thirteen worlds as skins for one seesaw. Parts: `surf`, `mosaic`.
  - `void/`: `radiance.ts` is the pull's ribbons of colour drawn into the hole, over the bagel, and the peak's beams
    of every life's colour given back, behind it. `bagel.ts` is the everything bagel, driven by the pull and then by the peak, plus the drawings of the
    things it swallows. Parts: `pull`, `peak`.
- **The shared files.** The hooks in `registry.ts`, `main.ts`, `styles.css` and `engine.ts` came in with Liftoff
  (PR #88):
  - `Performance.titles` and the page's words layer, for the credits;
  - `Framing.angle`, the camera roll, which is unused here.
- **Shared files this take changed**, each in its own commit:
  - `shows/words.ts`: a saved video sets a card at its `scale`, and a `plain` card's accents in cream, as the page
    does (for the chapters; Boléro's and Soft Lamp's scaled credits needed it too);
  - `shows/registry.ts` and `shows/player.ts`: `TitleCard.least`, a floor on a card's type on the page, for words
    read on a phone, and a card it grows kept within the stage. Cards without it are set as before.
- **Measuring the audio again.** For authoring only: `sh scripts/shows/eeaao-cue.sh <fetched cue>` cuts a private
  copy, and `python3 scripts/shows/eeaao-onsets.py` measures it. The copy is not to be committed or shipped; the
  show plays from YouTube.

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

- In the widest shots of the pull (16 cells) the balls are small. It is scale on purpose. The canyon's widest is now
  the breath on the long talus (about 9 cells), where a faint sky-coloured light round each stone keeps them findable.
- At 64 and 144 panels, Evelyn in the mosaic is a red dot on each plank.
- The photograph's picture, and the lives in the washer's window under the credits, are clearest large or under
  Zoom; on a phone they show their colours, not the faces. The words are kept readable there by a floor on their size.
- On a tall stage (a phone held upright) the widescreen lives are a band across its middle, between deep bars,
  where the other lives fill the stage with more world round them.
- Zoom is a closer look at Evelyn: Joy and Waymond are cropped by it at times, which is what it is for.
- Under Zoom, the credits' longest line crosses the near end of the lantern string. The words are set by the page,
  the same in every mode.
- The reduced-motion preference is followed live, and the page's Save PNG and Save video paint from the same show. So a viewer with it set saves a file without the flickers and punches. Telling the show that a frame is
  for a file would take a change to the shared stage and recorder, and that viewer has asked for the calmer show.
- Only Chrome on macOS has been watched playing. Twelve key frames were rendered in WebKit (Safari's engine, 26.6) as
  well, and match Chrome's, with no errors. Firefox has not been tried. Its engine would not start in the sandbox the
  passes ran in, and a later attempt with Playwright's matching Firefox 156 build, outside the sandbox too, exited
  at once ("Could not find profile folder") on this macOS. The recording export has not been re-measured for this take.

# Come Recover, All at Once

The recording is copyrighted. This take is a private tech demo only; do not ship this audio in a public build.
Nothing here claims any right to it.

The music is Son Lux's *Come Recover (Empathy Fight)*, the finale cue of *Everything Everywhere All at Once*
(Daniels, 2022). The attribution is in `docs/promo/EEAAO_COME_RECOVER_ATTRIBUTION.txt`.

Open it at `/shows/?show=come-recover&take=opus55-all-at-once`. In the Shows picker it is the work **Everything**,
whose one take is **Opus**. A work with one take has no Version row, so the panel reads "Everything · Opus".

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
- `scripts/eeaao-cue.sh` cuts it to 0 to 332 s, fading over the last nine seconds. That fade is the only edit, so
  every onset is the recording's own.

**Its clock.** `scripts/eeaao-onsets.py` measured the file once (numpy and ffmpeg) into
`scripts/show-plans/eeaao-onsets.json`:
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
| 297 to 328 | the tail | home | The end credits, over the dark (below). The lanterns have gone down to an ember with the tubes. On the tail's two soft accents the empty drum gives a slow half-turn (305.40) and the window's light swells once (312.59). |

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

## End credits

The credits come after the last hit, over the quiet tail of the cue, while the family rests in the dark by the washer's
glow. A card comes into focus, holds and goes out of focus as the next comes. The words are the page's
(`Performance.titles(t)`, as in Liftoff): a show's canvas sets no type, so a saved frame or a recorded video has none.
The canvas lays only a soft dark under them. The cards are:

| Starts (s) | Role | Names | Fine print |
| ---: | --- | --- | --- |
| 297.0 | Directed by | Claude Opus 5.5 | |
| 302.2 | With | Evelyn, the vermilion ball; Joy, the violet ball; Waymond, the jade ball | |
| 308.4 | Music | Son Lux | "Come Recover (Empathy Fight)"; Ryan Lott, Rafiq Bhatia and Ian Chang |
| 314.8 | After | Everything Everywhere All at Once | a film by Daniels (2022) |
| 320.8 | Drawn with | p5.js | |

There is no title card. After p5.js's card goes (about 325.9 s), the room holds alone in the dark as the music fades
to 332.

## What `check:shows` holds it to

`apps/rube/check-shows-all-at-once.ts`, run by `npm run check:shows` for this take:

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
- **Flickers:** only in the second before a jump, each a frame or three.
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
  - Joy and Waymond never jump;
  - each only comes and goes out of shot, or at a jump, when the whole world changes;
  - there are never two of anyone.
- **The googly eyes:** Evelyn's comes on the fight's beat 123, the great hit. Joy's comes after the brink and before
  home.
- **The end credits:**
  - after the last hit, and gone before the end;
  - set by the page;
  - opening on "Directed by Claude Opus 5.5", and naming Evelyn, Joy, Waymond, Son Lux, the cue, the film, Daniels and p5.js;
  - with no demo disclaimer on the frame. The attribution file keeps it.
- **The panel:** the work is Everything, one take, Opus, with no note and no byline.

## How it is built

- **The version file:** `apps/rube/src/shows/versions/come-recover/opus55-all-at-once.show.ts`. Everything with
  weight is behind `load()`.
- **The show:** `.../come-recover/all-at-once/`.
  - `show.ts`: the `MultiverseShow` (legs, jumps, flickers, the family's spans).
  - `score.ts`: the order of the legs and parts, their entry cells, the flickers and the camera. Each leg has its own
    director, and each opens on the framing the last one closed on, carried by the jump. It also holds the zoom
    punches.
  - `kit.ts`: the part contract. It is Liftoff's: `Slot` and `Built`, timed `route` and `carried` lanes, `lay`,
    `frame`, and the p5 fill-cache guard. `physics.ts` adds `throwFor` and `launch` for flights handed across a
    jump. `camera.ts` is Liftoff's director.
  - `music.ts`: the onsets, the three combs, loudness, and the jumps.
  - `seams.ts`: what the ball is doing at each jump.
  - `worlds.ts`: the eight worlds' palettes and materials, and the family's colours.
  - `fx.ts`: the googly eyes, over every world. Each is a white disc with a pupil that is a heavy bead in a round
    cage, thrown by the ball's acceleration and settling. It is worked out afresh each frame from the ball's last
    second of path, so it scrubs true. In the laundromat the room's light shades it. An eye given during the show
    arrives: it slaps on oversized, squashes past its size and settles, and its pupil is flung round the rim. On the
    great hit, Evelyn's comes with a burst of lantern-gold light behind her, the turning point of the show.
  - `credits.ts`: the cards, and the soft dark under them.
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
- **Rebuilding the audio.** `sh scripts/eeaao-cue.sh <fetched cue>` rebuilds the file, and
  `python3 scripts/eeaao-onsets.py` measures it again.

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
  purpose, but it is small.
- At 64 and 144 panels, Evelyn in the mosaic is a red dot on each plank.
- The photograph's picture is only legible large or under Zoom.
- Only Chrome on macOS has been watched. The recording export has not been re-measured for this take.

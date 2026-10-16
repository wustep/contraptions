# Raindrop

Chopin's Prelude in D-flat major, Op. 28 No. 15, the "Raindrop", whole, as a machine the rain runs. The recording is
Ivan Ilić's (Paris, 2005), which he released under CC BY 3.0, so it ships with the show. Attribution is in
`apps/rube/src/shows/versions/raindrop/ATTRIBUTION.txt`.

Open it at `/shows/raindrop/` or `/shows/raindrop/opus55/` (`/shows/?show=raindrop&take=opus55` works too). In the picker
it is **Raindrop**, on the **Machine** shelf with Clair de Lune, Cornfield Chase and Première Arabesque: one take,
**Opus 5.5**. The work's folder is `raindrop` (the music); the code is `raindrop/charterhouse/`.

## What it is

Chopin finished the preludes at the charterhouse of Valldemossa, on Mallorca, in the winter of 1838. The story told of
this one (George Sand's) is that she and her son Maurice were caught on the road in a storm, coming back up from
Palma, and came in late to find him at the piano, playing it. So the show is that night, and the prelude's repeated
A-flat, struck on every eighth from the first bar to the last but for a bar and a half near the end, is the drip.

- **The rain is the motor.** Under the eave of a monk's cell the end tile drips on every eighth into a glass jar hung
  from a lever. Eight bars of drops fill it; on bar 9's downbeat it outweighs the latch, and the ball is let go.
- **Down the cell and the garden** (bars 9 to 19): along the gutter, down the pipe (each length of pipe knocked as the
  ball goes down inside it), along the rill under the lemon tree, and across a chime of five roof tiles, each on a pin,
  the ball rocking in each tile's hollow and tipping it on a melody note. The last tile tosses it into the well's bucket.
- **The road** (bars 20 to 23): two people walking up the far bank's ridge in the rain, a woman with a lantern and a boy
  with a bundle. She has an arm round him.
- **Down the well** (bars 24 to 27): the bucket fills from drops running down its rope, inches down, and on bar 27, the
  pulse alone, takes the windlass round and goes down into the dark.
- **The cistern** (bars 28 to 34, the C-sharp minor, sotto voce): seen through a hole broken in the garden wall's face,
  a vaulted room of black water. The bucket meets it on the minor's first downbeat and tips; the ball floats out and
  drifts east, the vault dripping round it on the pulse; over the weir's lip and down three steps, one a bar.
- **Into the storm** (bars 35 to 39, louder): out of an outlet in the wall's face onto the first terrace, along a stone
  runnel to the first of three water hammers.
- **The road** (bars 40 to 43, fortissimo): the gust. She draws the lantern in and covers it; it goes out on bar 41.
- **The hammers** (bars 44 to 50, sotto voce again): troughs on trestles at each terrace's edge. The runnel pours into
  each; full, it goes over on a downbeat and pours the ball down the wall to the next terrace, and knocks back onto its
  stone two beats later.
- **The wheel** (bars 51 to 55, the second crescendo): a chute down the gully's wall into the lowest pot of a noria
  turned by the torrent. The wheel quickens with the crescendo and carries the ball up to the top, where it spills
  into the spoon of a sling whose counterweight the wheel has been filling all along.
- **Over the gully** (bar 56, fortissimo): the latch goes on the downbeat, and the ball is thrown across the gully to
  the gate on the far bank, landing on its roof on the second beat.
- **The lantern** (bars 60 to 63, the melody in E): the ball drops into a catch that lets the gate's lantern down on its
  rope to the candle kept in the niche under it. The wick takes on bar 61, and the lantern goes back up lit.
- **The bell** (bars 64 to 67, the octaves): the catch tips the ball down a chute into the cup on the bell's rope, and
  its weight rings the bell, a stroke at each end of each swing, on every high A-flat. Then it drops to the doorstep.
- **The road** (bars 68 to 75): in the dark they look up, and the light is there. She points at it. They climb.
- **The gate** (bars 76 to 81): they come to the door under the lantern. On bar 79's run she pushes it open; the ball,
  waiting against it, goes in first; they go in after it, and it shuts on bar 81.
- **The rain stops** (bar 81, the high B-flat, where the pulse stops): a cut to the whole mountainside, clearing, a moon.
- **The last drops** (bars 84 to 89, the pulse back, softly): the eave again. The last drops fall into the full jar, and
  in the lit window she comes in from the room's door and stands by him at the piano, her hand on his shoulder, the
  boy after her. The last chord is the last drop. The credits come up in the night beside the cell.

One ball, one path, one place. The camera cuts (17 times, each on a phrase), but there is no portal and no iris.

## The cue

Frédéric Chopin, Prelude in D-flat major, Op. 28 No. 15 (1838 to 1839), public domain. The recording is Ivan Ilić's on
Wikimedia Commons, first released by him on IMSLP under CC BY 3.0; it is re-encoded whole and untouched
(`scripts/shows/raindrop-cue.sh`; 263.6 s, constant bit rate, so a seek lands where the clock says). It was chosen over
the other two free recordings on Commons (Musopen's CC0 performance, whose file clips, and a CC BY-SA one) for its
clean sound, its named performer and its plain licence.

## The measured clock

Measured once by `scripts/shows/raindrop-onsets.py` into `scripts/shows/plans/raindrop-onsets.json`. The prelude is played
freely, so there is no comb: the score (the Mutopia Project's engraving, read as MIDI, never shipped) is laid on the
recording by dynamic time warping on chroma and onsets, and every note it places is moved onto its own attack where one
is within 90 ms. 720 of 742 onsets are on their own attack. The few places the warp cannot see are set by hand from the
attacks themselves, each named in the script with its pitch: the run in bar 79, the held melody of bars 81 to 83 where
the pulse stops, and the last two bars, which slow to the chord. 687 drips: every eighth the repeated note sounds on.

| Show s | Bars | Music | Picture |
| ---: | --- | --- | --- |
| 1.0 | 1–8 | the theme, D-flat | the eave and the jar; the mountainside, wide |
| 25.9 | 9–19 | B-flat minor, the first turn away | the tip; the gutter, the pipe, the rill, the chime |
| 59.7 | 20–23 | the theme again | the road |
| 72.6 | 24–27 | the theme; the pulse alone | the bucket filling; down the well |
| 84.7 | 28–34 | C-sharp minor, sotto voce | the cistern |
| 103.9 | 35–39 | the pulse up an octave, louder | out into the storm, the first terrace |
| 117.2 | 40–43 | fortissimo | the road: the gust, the lantern out |
| 127.8 | 44–50 | sotto voce again | the hammers |
| 145.7 | 51–55 | louder again | the wheel |
| 158.8 | 56–59 | fortissimo | the sling; over the gully onto the gate's roof |
| 169.5 | 60–63 | the melody over the pulse, in E | the lantern lit |
| 180.1 | 64–67 | the pulse in octaves | the bell |
| 190.4 | 68–75 | the melody again; the storm going over | the road: they see it, and climb |
| 212.9 | 76–81 | D-flat, the theme | the gate: the door, and in |
| 232.5 | 81–83 | the pulse stops: the high B-flat | the rain stops: the mountainside, wide |
| 240.2 | 84–89 | the pulse back, softly; the last chord at 255.8 | the eave: the last drops; the window |
| 258.2 | | the chord's ring | the credits |

## Craft notes

- **Every arrival is on a note.** The ball's path is a list of moves pinned to the clock at both ends (`path.ts`,
  `route.ts`): rolls whose pace is a cubic between the speeds either side, flights under gravity that land exactly when
  asked, rides on moving parts (a tile, a bucket, a trough, a pot, a spoon, a catch, a cup). All 28 landings are on an
  onset, and so is every tip, knock, stroke and cut; `checks/raindrop.ts` holds each to the measured file.
- **The drawing.** Flat fills in a few values; the machine's parts carry a line of ink so they read against the
  painted world, the world none. The terraces are blocks of field held up by dry-stone walls that face us, their stones
  fixed in the world so a wall panned across is always the same wall. Three lights over the whole night (the dusk,
  the storm, the clear night after it) are worked from one set of named colours (`look.ts`); the lights themselves (a
  window, a candle, two lanterns, an open door) are never darkened.
- **No shine.** Light is where it lands: a lantern's light falls down the wall and pools on the ground in two flat
  shapes; the rain is drawn again in the light's warmth where it falls past a lit window, a lantern or an open door; a
  puddle by the gate holds the lantern. No bloom, no glow, no radial gradient anywhere; the only gradients are the sky's
  and the rain's far veil.
- **The rain.** Two depths of streaks, sized by the frame so they read the same close and wide, thickening into the
  fortissimos, slanting with a wind that gusts, and gone on the high B-flat. The drip is seen wherever the camera is: the
  jar's tile, the well's rope, the cistern's vault, the gate's roof.
- **The people.** Silhouettes: the night does not show faces. What they feel is in what they do with their arms.
- **The sky is weather.** Faint bands of the rain's cloud drift across every frame, so a close shot's patch of sky is
  never a flat wall; the Serra's ridges stand behind at three depths and slide with the camera.

## Measured

In Chrome (headed, vsync, 3024 × 1800, the whole show at 1×), with the stage painted on every animation frame at
wall-clock show time: 16,553 frames at 60 Hz, 3 intervals over 20 ms (a single 140 ms hitch at 204.6 s, which does
not come again when that stretch is run once more), the paint on the main thread 0.94 ms a frame on average, 3.0 ms at
the 95th percentile and 8.3 ms at worst. (The page's own play was not used for the timing: in an automated Chrome the
muted file played at a quarter of real time, which is the session's audio and not the show; painting at wall-clock
time measures the same work.)

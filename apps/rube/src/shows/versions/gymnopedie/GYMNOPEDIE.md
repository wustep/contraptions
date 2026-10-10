# Gymnopédie (Opus 5.5)

`/shows/gymnopedie/`, in the picker as **Gymnopédie**, one take, **Opus 5.5**.

Satie's Gymnopédie No. 1, Gnossienne No. 1 and Gnossienne No. 3, one after the other, round a small sea planet once
a period, as a loop with no seam: 634.8 s, and then the same 634.8 s again.

## The music

Played for the show by `scripts/shows/satie-render.py`, not taken from a record. It reads the Mutopia Project's engravings
(Gymnopédie No. 1 unfolded to the 78 bars Satie wrote out) and plays them on the Salamander Grand Piano's samples:
a tempo for each piece (70, 84 and 72 to the crotchet), breaths into the long notes and a ritardando at each end, the
melody over the chords, the chords rolled a little from the bottom, the grace notes just ahead of their beat, and a
legato pedal changed with each bass note. Each sample is trimmed to its own attack, so a note's hammer lands on its
time to the sample. The room is a synthetic hall, convolved circularly.

The render is one period of a circle: whatever rings past the end of the period (the last Gnossienne's resonance, the
hall) wraps round into its start. The file carries two seconds of its own end before the show's zero and two of its
start after the period, so a decoder that trims a few samples differently still meets itself.

Every note is written down as it lands (`scripts/shows/plans/satie-performance.json`): time, pitch, velocity, and role
(melody, bass, chord, grace). The show is timed to that file. Measured back off the mp3 with a spectral-flux onset
detector, every melody and bass note has an onset within 35 ms (the detector's own window bias is about −10 ms), there
are no clicks, and the two copies of the loop's edge agree to the mp3's coding noise.

Licences: `apps/rube/src/shows/versions/gymnopedie/ATTRIBUTION.txt`. Composition public domain; engravings public domain and
CC BY-SA 4.0; samples CC BY 3.0 (Alexander Holm); the recording CC BY-SA 4.0.

## The loop

- The player learns loops. `Performance.loop` and `SoundtrackSpec.loop` say a show goes round; `Transport` takes time
  round the circle and never ends; the tick does not stop at the end. The soundtrack decodes a looping recording whole
  and plays it from an `AudioBufferSourceNode` looping on the sample between `offset` and `offset + loop`. The element
  is kept for 2× (time-stretched; a looped buffer would only play an octave up), for the seconds before the decode, and
  for a visit the browser will only let play muted; wherever it plays a loop it is sent back a period at the end.
- The picture is a function of time taken round the circle. The ball's way round the planet (`path.ts`) is a monotone
  cubic through its landings, closed round the period, and the planet's radius is whatever makes one period one orbit;
  so at the end the ball is where it began, on the same stone, going the same way at the same speed. The camera turns a
  whole turn with it. Every shimmer runs on a whole number of cycles a period (`osc`). The day's colours are keyed to
  show time with the last key equal to the first. The ball's spin is rounded to whole turns a period.
- At the seam the camera is all the way out: the planet small in the dark, ringed with what the ball did in the night,
  the last resonance going. The title comes up over it as the Gymnopédie's first bars begin, and the camera goes down
  to the ball on the first column as the melody enters. On the way out and back in it keeps the ball's horizon in the
  picture, curving away under the stars, and slides to the planet's middle only once the planet is nearly all in the
  frame (`slideAt`), so the planet's dark face never fills it.

## The machine

The melody is the landscape. Each run of one pitch is a stone standing out of the sea, as high as the note; the ball
lands on it as its note is struck, rides it, and leaves it for the next just before that one sounds, in a slow,
low-gravity arc. A second quick note on the same stone is a small bounce (the third Gnossienne's paired notes); a held
note whose key the chords strike again answers with a pulse. The ball goes as the music does: quick through the
eighths, slow over the long notes, never stopping.

One material a piece: the Gymnopédie at dawn and through the day, slender columns and lintels in the sea; the first
Gnossienne from dusk into the night, bronze beams on dark posts, each with a lamp the ball lights as it lands; the
third Gnossienne under the moon, lotus leaves on stems, floating, the long ones with a bud that opens into a flower
when the ball comes. Between the pieces the camera goes out over the curve of the planet to the sun going down, the
lamps, the moon.

## The ball, in its light

The stage draws the ball a flat disc. Over it, clipped to its outline as the stage drew it (squashed as it lands), it
is lit as a sphere by whatever light it is in: from the sun's side by day, warm low in the morning and the evening,
pale from overhead at noon; from the moon's under the moon; and through the first Gnossienne by its own flame, all
round (`shadeBall`). Under it, the stone's face darkens softly where it touches, by day, and thins as it leaves; and
through the first Gnossienne the flame lays a warm pool there instead (`underBall`).

## The cadences

Each piece's last note runs back along the way the ball came (`CADENCES`): a slow wave of light going back through
the piece's stones as the camera draws out. After the Gymnopédie it is a glint running back along the columns' tops in
the sunset; after the first Gnossienne, a flare running back through the lamps over the wide between the pieces; and
after the third, faster, a light running back round the whole planet through the flowers and then the lamps, the
night's way once more, seen from afar as the period comes round and the title comes up. It is the night's light, so it shines only where a
lamp still burns or a flower is still open: it goes out where it meets the dawn coming round the other way.

## The story

A lamplighter's round, one day long. By day the ball walks the colonnade under the sun. At dusk it lights a lamp on
every stone it comes down on, and under the moon it opens the flowers; what it does at night stays done, so behind it
the lamps burn and the flowers are open, and ahead of it the lamps are dark and the flowers are buds. From far off the
lamps are a thread of lights over the curve of the planet (the wide between the Gnossiennes), and at the seam the
whole planet is ringed with them and, fainter, with the flowers: the night's way round, and dark on the day's side.
Then dawn comes round: in the wide shot, as the title comes up, the lamps go out and the flowers close in a sweep
round the planet from the sun's side to the far side (1 to about 5.5 s, while the planet is still the picture; `dawnAt`), so the night's ring of light is
seen to end; and the camera goes down to the ball as it sets off again.

## The music, answered

One job to a voice, each answering its own notes from `satie-performance.json`:

- The melody: the stones and the landings. Coming down on a note the ball gives up a little of its height, as far as
  the note was played hard, and gets it back with a small rebound (`squash`); the stone sinks under it the same way.
- The bass: the sea. Each bass note raises a swell under the ball that parts into two crests running out along the
  sea either way at twice the ball's pace, dying over a few seconds; the crests catch the light, and the third
  Gnossienne's leaves ride them (`swell`, `crest`, `float`).
- The chords: the light on the water. Under the sun, under each lit lamp and under the moon lies a path of short
  strokes of light on the sea, and each chord (its rolled notes heard as one) sets a different few of them flashing, as
  hard as it was played, dying over half a second (`waterLight`).
- The melody on the pond: in the third Gnossienne each landing and bounce on a leaf sends two or three soft rings out
  on the water from its stem, as wide and as clear as the note was played, smoothing away over three seconds
  (`leafRings`).
- A grace note: a spark where the ball is about to land, a breath (75 ms) before it does; in the first Gnossienne, at
  the lamp's wick, which then catches. Since the ball comes down right on it, the spark is a small four-point twinkle
  and glow wider than the ball, drawn over it, so it is seen round the ball as it lands (`SPARKS`).
- The phrasing: the camera. It drifts out on a held note, more on a longer one, and in again as the next phrase
  begins, following the melody like a slow spring, so a run of quick notes stays close and a run of long ones eases
  back (`breath`). Its keys shape each piece: close as the first Gnossienne climbs to its top note, back over the thread
  of lamps as it comes down; lower over the pond in the third, where the water and the moon's path are more of the
  picture.
- The inner voice: the stars. The Gnossiennes' quiet counter-line in the middle of the chords comes in figures of a
  few notes a breath apart, and each figure draws a constellation high in the night sky: a star brightening as each
  note sounds (higher for a higher note, a step along each time, flaring as hard as it was played), a faint line drawn
  to it from the last, the whole figure lingering a few seconds after its last note and going back into the sky. Clear
  of the moon, decided once for each figure; in the dusk, before the sky is dark enough, not drawn (`FIGURES`).
- Loudness: the render's own level barely moves (a soft, pedalled piano), so the show answers how full the music is,
  worked out from the notes (every note's weight, dying away, smoothed over a few seconds; `loudness`). It sets how
  high the swells stand and how bright the light on the water is: calm in the Gymnopédie's long notes, fullest where the
  Gnossiennes run on.

## The air and the water

The planet has weather, at depths behind the stones (`air.ts`):

- Clouds in two layers: a long, low bank on the horizon, far off, and cumulus over the stones, nearer. Each is lit
  from wherever the sun or the moon is in the frame: white with a sky-blue shade by day, warm from the side and the
  horizon's colour under them at dawn and dusk, dim and edged silver under the moon. How much of the sky is cloud
  moves through the day (`coverAt`): most of it by day, thinning at night for the stars and the Milky Way, more again
  under the moon; a cloud gathers and thins as the cover comes over its share.
- Rays from the low sun: at dawn through the morning's mist, and through the afternoon into the sunset, soft
  feathered wedges of warm light fanning across the sky behind the columns, each breathing slowly; held back while the
  shower's cloud is over, so they come as it clears (`raysAt`).
- The sun lights the colonnade from its side of the sky: each column's shade is on its west face in the morning,
  narrows to noon, and crosses to the east face through the afternoon.
- Sailboats far out on the horizon from mid-morning on into the dusk, hidden in the shower's haze, each lighting a
  lantern at its masthead as the colonnade's lamps are lit, its sails dimming into the dusk, and going home into the
  dark as the first Gnossienne gets under way (`lanternAt`): small sloops
  sitting low in the water, the sail on the sun's side lit, beating home against the ball's way, so each crosses the
  frame slowly in half a minute or so (`SAILS`, `BOATS`).
- Gulls perched on the colonnade, at the far end of a long stone (a held note) here and there, fifteen in all.
  As the ball comes down on their stone they lift off on its note, startled up first and then away ahead of it,
  white wings beating and then easier, climbing until they are gone, well clear of the ball; they are back on their perches, roosting, by the time the ball comes
  round again. They are in the sea's reflection too (`PERCHED`).
- Gulls by day, a few small flocks overtaking the ball along the colonnade, beating a while and gliding a while.
- A sun-glint on the Gymnopédie's top note (the F♯ its melody climbs to six times): as the ball lands on it a soft
  star of sunlight catches the edge of the column's slab on the sun's side and fades, and the sixth, in the shower, is where
  the cloud breaks: the sun comes through on it while the rain still falls, a sun shower that lights the bow
  (`SUN_GLINTS`, `BREAK`). The day's high notes are answered by the sun, as the night's are by the stars.
- The Milky Way at night, turning with the stars; and a shooting star on the top note of each of the first
  Gnossienne's four high phrases and the third's two, a melody's peak answered in the sky; each falls clear above the ball, which over the pond rides high in the frame.
- Mist on the water at dawn, a little at dusk, and under the moon; fireflies over the pond in the third Gnossienne.

Six things happen once a day:

- A comet over the third Gnossienne (`comet.ts`): it rises in the east while the moon is up, crosses the sky a little
  ahead of it (0.8 rad west of it), and sets in the west before the piece ends, fading into the horizon's haze as the
  stars do. Its tail points away from the sun, under the planet through the night, so it swings as the comet goes over:
  a soft dust tail of round puffs of light along a curving spine, each wider and fainter than the last, with a faint
  grain of strands, and a fainter, straight ion tail, blue. A little brighter where the music is fuller. Drawn once as an
  image, on the first frame, and laid on the sky turned and scaled.
- Dolphins, once, in the morning (`dolphins.ts`): a pod of three in the near water in front of the colonnade, from
  1:18 to 1:41. Each bass note of that passage sends one of them up out of the water, in turn, so each leaps every
  third bar, as high as the note was played: an arc a body and a half long, nose up as it rises and down as it dives,
  its shape seen under the water a moment before, spray and two spreading rings where it breaks the surface. They swim
  against the ball's way, as the boats do, so the pod crosses the frame slowly from right to left. Nearer water is
  further down the frame, so the nearer dolphins are drawn larger.
- An afternoon shower over the Gymnopédie's second statement. The cloud gathers and greys from 138 s, the sky and the
  sea go grey with it and the sun pales behind it. A soft rain falls from 152 s, with each drop's ring spreading on the
  water, and stops by 182 s. As it clears, a bow stands opposite the low sun for the piece's last bars: a pale
  watercolour band, a fainter second bow outside it with its colours turned round, and lighter sky inside. It fades
  as the camera draws back into the dusk (`rainAt`, `overcastAt`, `bowAt`).
- At night the sea has its own light. A bass note's swell wakes it: the crest glows a cold green-blue as it runs, and
  the motes in the water under it light as it passes over them and go out behind it. So each bass note still sends
  out its two crests, now as two threads of light running away along the dark water.
- An aurora over the first Gnossienne's night. It comes up once the sky is wholly dark (from 258 s), is fullest
  about the high phrases, and is gone before the moon rises (by 415 s). Three soft curtains of green-to-violet rays
  hang from slow waves, folding and brightening along their length; they breathe with how full the music is
  (`loudness`), and the calm sea gives them back faintly (`auroraAt`, `auroraSheet`).
- Under the moonlit pond in the third Gnossienne, once, a whale: a dark shape deep in the water, outlined in the sea's
  light. It swims the ball's way more slowly than the ball goes, so it passes back under it over a minute
  (`whaleAt`).

From far off, at the seam, the planet is a world in space. The sun and the moon each go once round it a period (the
sun across the sky through the Gymnopédie and slowly round under the planet through the night; the moon up for the
third Gnossienne, setting in the west at dawn, and round under the planet through the day), so when the camera draws
out they are where they should be. Each is one body through the zoom: as the planet draws away it travels from its
place in the sky to its place in space (`bodies`), out of the frame and back into it as the frame widens, and only
there takes on its look from space: the sun a small white disc with its glare, the moon a little world lit on its sun
side, its phase. The planet is lit from the sun: its deep water paler on that side, its far side in shadow, and its
air warm where the sun's light grazes it. At night the sea's light shows through its deep water from far off, motes in
a band under the surface. Close, through the first Gnossienne, the ball carries a small warm glow of its own: the
flame it lights the lamps with.

The sea gives it back: the stones, the lamps, the flowers, the perched gulls and the ball (with its flame) are drawn again upside down from their feet, into a
canvas of half the stage's resolution, faded with depth, and laid over the water row by row, each row shifted a little
by a ripple that grows as it goes down. The sky's colour lies on the water under its surface. The reflection fades as
the camera draws out, where it would only be a streak.

Far things go by slower than near ones: a layer at depth `f` passes at `f` of the ball's pace (`layered`), so the bank
on the horizon hardly moves while the stones come to the ball. For the loop, each layer's pattern repeats a whole
number of times in `f` of the way round, and its wind carries it a whole number of repeats a period; so it comes round
with the period like everything else. Anything in a layer fades towards the edge of its repeat (`inLayer`), so when the
camera draws out wider than a repeat nothing jumps across the frame.

## The colonnade in flower

As on the far shore's islands, bougainvillea grows on the colonnade (`blossom.ts`): on twenty of its stones, never two side by
side and never one with a gull on it, a vine climbs one column from the sea, winding, a leaf
here and there, and spills over the slab in a cascade of magenta, hanging longest by its column and thinning along the
slab towards the middle; never on the slab's top, where the ball rolls. It is the one strong colour in the morning's
pale picture, greyed in the shower and gone to the dusk's colours as the light goes. And it answers the melody, as the
perched gulls do: as the ball comes down on a flowering stone, on its note, ten petals shake loose and drift down,
fluttering, carried a little back the way the ball came, to the water.

Each stone's blossoms are one path to a colour, made once, and the colours once a frame: 0.3 ms a frame for all of them
(the median of 30 with the CPU slowed six times; building the paths each frame had cost ten times that).

## The sea's surface

The sea was a smooth gradient with its reflections on it. Now it has a surface (`ripples.ts`): wavelets seen in
perspective, catching the sky on their faces and dark in their troughs, small and close-packed at the horizon (where
they merge into the sky's sheen) and longer and further apart nearer. They are drawn in sixteen bands from the horizon
down, each going by at its depth's pace (the near water faster than the far) with a little wind across it, so the
surface moves as water does when the camera travels over it; each band's pace and wind are whole numbers of its tiles a
period, so it comes round. Two sets of wavelets cross-fade slowly, band by band, so the water glitters rather than
slides.

- Under the sun and the moon the same wavelets are lit: a glitter path, narrow at the horizon and wider nearer, drawn
  into a canvas of its own column of the water, faded softly to either side, and added to the frame's light. It sits
  under the chords' flashes of light on the water, which answer the music as before.
- Under each lit lamp, the wavelets catch its flame: a warm column of glitter going down from its foot, so the first
  Gnossienne's thread of lamps shimmers in the water. All the lamps in one canvas: the surface drawn whole into it,
  kept only under the lamps (a mask of their columns, added together), tinted the flame's colour and added to the
  frame's light; only as wide as the lamps in the frame reach, and fading as the camera draws back (from 14 to 17 cells
  either way), where a lamp's glitter would be a speck. It sits under the lamps' own paths of light, which the chords
  set flashing as before.
- Slicks: long streaks of glassy water where the wind does not reach, the sky smooth in them, going by at their depths.
- How ruffled the water is follows how full the music is (`loudness`), calm under the Gymnopédie's long notes and
  livelier where the Gnossiennes run on; it roughens in the shower, and is fainter at night.

The wavelets are drawn from two tiles made once, on the first frame of the sea (far off at the seam, 26 ms), not the
first close one. A frame's surface costs 0.4 to 0.7 ms (the median of 30 frames with the CPU slowed six times, glitter
included), and 2.7 ms in the first Gnossienne's widest framing, about twenty lamps' glitter in view; the dolphins cost
0.1 ms. They fade with the camera drawing out (12 to 24 cells), and towards their deepest band, so the deeper sea of a
phone held upright has no edge to them. That frame also showed a line, there from before, where the sea's band met the
planet's deep water under it: the band's foot is now the colour the deep water has there, which depends on where the
sun is.

## The far shore

The sea had nothing beyond it but cloud; now the ball goes along a coast (`shore.ts`). Islands stand out on the
horizon, in front of the bank of cloud and behind the boats, and behind them, paler, two ranges of mountains further
off. They are far, so they go by slowly (the islands at 0.16 of the ball's pace, the mountains at 0.07), each taking a
couple of minutes to cross the frame; each layer's repeat is its share of the way round, once, so it comes round with
the period. Each island is placed by the moment it is in the middle of the frame, so the day is told by what is out
there:

- skerries at dawn;
- a temple on its hill in the morning sun, six columns and a pediment, with cypresses and a hamlet by the shore,
  answering the colonnade;
- a mountain that the afternoon shower comes down on, greying into the rain;
- a white village up its hill at sunset, terraces of cubes, a blue-domed chapel at the top and a windmill on the
  ridge, its sails turning;
- a headland with a lighthouse, in view as the first Gnossienne begins;
- a long low island under the aurora;
- a hermitage between two peaks under the moon;
- a sea stack before the dawn.

They are lit by the day: the side towards the sun paler and warm when it is low, the whitewash taking the sunset's
colour, the air between thickening them to the horizon's colour, more in the shower and the morning mist; they go to
silhouettes against the sunset and dark against the night, edged with the moon's silver. A wide island is bent down
with the sea's curve at its ends, so it never stands off the water.

The shore keeps the story. At dusk, as the ball lights the colonnade's lamps, the villages' windows light one by one
(198 to 242 s), and late in the night they go out one by one, a few kept until the dawn, which puts them out with the
lamps. The lighthouse is lit with the ball's first lamp (`LIGHTHOUSE_ON`) and turns all night, thirty turns a period:
its beam is a long soft wedge along the horizon, as long as it points across, widening and brightening as it swings
towards us, and its lantern flashes as it faces us. The dawn puts it out. The sea gives the islands back, and their
lit windows, in its rippled mirror.

Its cost was measured. A first cut cost a few milliseconds a frame with the CPU slowed six times, most of it the
houses and the windows drawn one rectangle at a time, so the houses are two fills an island (lit and shaded faces) and
the fully lit windows one; each lit face and the haze is a fill of the outline with a gradient rather than a clip; the mirror takes only the islands' bodies and the windows. With the CPU slowed six times, the
moments with the shore in view cost what they did without it, within the run-to-run variation (least of 30 redraws),
and the worst moment of the loop (the pull-out between the Gnossiennes, about 15 ms) is unchanged.

## Any screen

The camera frames a 16:9 picture. On a canvas narrower than that (a phone held upright, a tablet) the stage shows the
same picture across its width with more sky and sea round it. So the sky's things are sized and placed by the framed
picture's height, hung from the horizon, not by the canvas's (`frameOf`): the sun and the moon keep their arcs over the
horizon rather than climbing out of sight, the bow stays a bow, the aurora hangs over the stones rather than
stretching to the top of the screen, and a shooting star falls over the scene. How far out the camera is is measured
the same way, so nothing that fades as the camera draws out (the gulls, the fireflies, the bow, the reflections) takes
an upright phone for a wide shot. Audited at 16:9, 21:9, 4:3 and an upright phone.

And on more than one engine and density: stills from Safari's engine (WebKit) match Chromium's to within
anti-aliasing at nine moments through the day (every set-piece drawn, the title veil's CSS resolved the same); the live
canvas at density 2 matches a still of the same device size at 47 of 48 moments across the loop, the 48th (the wide
shot) to within sub-pixel smoothing of the far stones; and 480 × 270, 1280 × 720 and 3840 × 2160 are the same picture
at three sizes.
On Apple's devices too, in WebKit with their own screens: an iPhone 15 (density 3, portrait, the stage above the
panel) and an iPad Pro 11 in landscape (density 2) each match a still of the same device size across the whole loop
(48 moments), the wide shot to within sub-pixel smoothing. Minimum widths drawn under the world's transform are in
device pixels (`devicePx`), so a phone's density does not thicken them.

## The words

The page sets the titles over the stage, and they come over busy places: the title and the credits over the planet's
lit limb and its ring of lamps, the Gnossiennes' names over the sunset's rays and the cadence. So each card is shaded,
as a film's titles are: a soft oval of the dark round its words (`shade` on the card), drawn with the words wherever
they are drawn (the page, and a saved video's frames) and nowhere else, so a still saved from the canvas alone has no
veil without words in it.

## Motion

Audited in motion as well as in stills: the whole period, ten frames a second, measured frame to frame for anything
that jumps against the motion round it (a layer wrapping, a cloud gathering, a light coming on). Nothing does; the
largest changes are the ball's quick hops after long notes, and the camera's.

And timed on the GPU (Chrome, Metal, 2880 × 1800): about 4 to 5 ms a frame through the day, the night and the pond,
the same as before any of the weather; 10 at the seam, where every stone is drawn. The sea's mirror is drawn from a
canvas of its own, which stays on the GPU so long as nothing reads the stage's canvas back (nothing does; a probe that
does would make every mirror row a readback, which is what a first measurement here mistook for the show being slow).

## On a slower machine

A piece to leave on will run on machines slower than the one it was made on. Measured by what each frame's drawing
costs, with Chrome's CPU slowed four times (a stand-in for a phone), the close shots cost 5 to 11 ms a frame and stay
inside 60 frames a second; but the wide shot at the seam, which draws every stone on the planet, cost 26 ms, over it,
on the shot that opens the loop and carries the title. Far off, where a cell is a few pixels, each stone is now drawn as
its silhouette in its colours, batched into a handful of strokes (`farStones`): the same picture at that size, and the
seam now costs 3 to 7 ms, a quarter of what it did before any of this pass. Across a band of the camera's distances (34 to 54 cells, the
same measure the far-off lights fade in by, so they are up first on any canvas) the full drawing comes in over the
silhouettes, which stay whole underneath until it is nearly whole, so no stone is ever seen through. The sea's mirror draws its stones the same way,
since its ripple and fade leave no more of them than that.

Timed as it now stands, the least of forty redraws of the same moment (so that the rest of the machine adds nothing),
in Chrome on the GPU at 2880 × 1800 with the CPU slowed four times: 1.4 ms at the seam, 4 to 7 ms through the day, the
aurora's night and the pond (6.7 ms the median of 48 moments round the loop), and about 12 ms at worst, in the wide
shot between the Gnossiennes, where the whole thread of lamps is in view: every moment inside the 16.7 ms of a frame at
60 a second. Slowed six times, a low-end phone, that wide shot went just over (16 to 18 ms), nearly all of it the lamps'
paths of light on the water, each a pixel or two there; past 14 cells out they are drawn in fewer rows, the same
picture at that size, and it is 12 to 13.5 ms. Timed so at all 48 moments, six times slowed, the worst is 11.6 ms and the median 5.7. A cached glow and kept colours for the lamps' beams were tried and
measured at under a millisecond's difference, and left out.

## Where things are

`orbit/`: `music.ts` the notes as played; `path.ts` the ball's way and the stones; `camera.ts`; `titles.ts`; `world.ts`
the day's colours; `air.ts` what lives in the air and the water (clouds, gulls, mist, the aurora, the whale) and their
layers; `shore.ts` the far shore; `ripples.ts` the sea's surface; `dolphins.ts` the morning's dolphins; `blossom.ts` the colonnade's bougainvillea; `comet.ts` the third Gnossienne's comet; and the drawings, `sky.ts`, `stones.ts`, `sea.ts` and `over.ts` (over the ball), with what they share in
`frame.ts` (the framed picture, the weathered day, the sun's and the moon's ways, the lamplighter's flame).
`scene.ts` is their index.

## The frame

Over everything, last, the frame's corners are a little in shade (`VIGNETTE`, 18% at the corners, nothing over the
middle), as a lens gives: the eye goes to the middle, where the ball is, and the many things in the picture sit
together as one.

## An edit

After the weather came in, the busiest moments were looked at again for things that compete, and pulled back: the
Milky Way steps back while the aurora is up (one band of light in the sky at a time); the far bank of cloud is thinner
at night, so it is not a grey mass behind the pond's leaves; and the air is kept clear round the ball, a cloud that
comes over it thinning away (by where the ball keeps to over a few seconds, so a cloud does not breathe with its hops).

## A review

The branch was read through by a second pair of eyes for real bugs, and they were fixed: as the camera crossed the
point where the sea is drawn whole (about 34 cells, at 7.5 s and 628.5 s), everything drawn only close (the mist, the
sea's glow, the rain's rings, the reflections, the surface's light) went out or came on in one frame; it now fades
between 25 and 33.5 cells, and the switch passes unseen. A long figure of the inner voice ran off the frame; each is
now kept wholly in the picture, across and down. The columns' shade is taken from the sun's angle within a half-turn,
so it cannot change sides at the seam; and the soft-light sprites are kept by all three of their colours.

## Taken away

The saved video was made end to end and read back: picture and sound (VP9 and Opus at 720p, played through once at
4×), every titled moment painted in and readable, the weather, the aurora and the whale all there. The vertical
"Shorts" frame and the tighter Zoom framing were looked at through the day too.

## What the ball meets

Measured, not only looked at, since at the show's size these things are a few pixels: the ball keeps clear of every
gull (0.76 cells at the closest, a check); every shooting star falls clear above it; the constellations hang clear of
it, the one-note figures of the third Gnossienne a single star with no line. On every leaf with a flower (74) the ball
rolls across where the flower stands; and the flower bows aside, leaning away from the ball as it comes and back
upright once it has gone (`bowAt`); it turns from one side to the other as the ball goes over its foot, where the ball
hides it. A lamp's new flame does the same: it leans back after the ball as it rolls on from the lamp it has lit, and
stands up again. A firefly the ball comes through (2.7% of the third Gnossienne, measured) dims as
if behind it, so none glows over the ball's face; they are not pushed, which made them dart.

## Checks

`check:shows` (`apps/rube/checks/gymnopedie.ts`): the picker entry, the credit, the three pieces in order; the loop
(period, offset, a transport that goes round, the last moment equal to the first for the ball and the camera, a time a
period on the same time); the ball never jumps, the seam included; every landing, bounce and restrike is a melody
note's own attack and every melody note is one; the ball arrives on each stone as its note is struck, riding it; it
squashes on every landing and bounce and at no other time; every bass note sends out a swell; every chord note belongs
to one heard chord; the camera breathes only on held melody notes, never jumps in or out, and its breath and the
loudness come round with the period; every lamp is dark until the ball lights it and burns until dawn, and every
flower opens as the ball comes and closes at dawn, across the seam; every layer of the air comes round with the
period, and a shooting star falls only on a Gnossienne's top note, at night; there is one shower, in the
Gymnopédie, with the bow after it and gone before the first Gnossienne; the whale passes once, under the third
Gnossienne's pond; gulls perch on the colonnade and lift off as the ball lands on their stone, on its note; rays come from the sun
only while it is low and up; a wave of light runs back along each piece's way from its last note, and only then; every inner note lights a star of
a constellation, at night; the aurora is the first Gnossienne's, in the full night only; the sun and the moon go round
without a jump, the seam included; the far shore's windows are dark by day, lit in the night and out by the dawn, and
the lighthouse is lit with the first lamp and put out by the dawn; the sea's surface comes round; the dolphins leap once, each on a Gymnopédie bass note, by day, close; bougainvillea flowers on stones apart, none with a
gull; the comet crosses only the third Gnossienne's night sky; the titles.

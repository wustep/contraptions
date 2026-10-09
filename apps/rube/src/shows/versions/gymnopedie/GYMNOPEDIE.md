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
- Gulls perched on the colonnade, one on a stone here and there, at a lintel's far end or on a column's capital.
  As the ball comes down on their stone they lift off on its note and fly on ahead of it, white wings beating and
  then easier, climbing until they are gone; they are back on their perches, roosting, by the time the ball comes
  round again. They are in the sea's reflection too (`PERCHED`).
- Gulls by day, a few small flocks overtaking the ball along the colonnade, beating a while and gliding a while.
- The Milky Way at night, turning with the stars; and a shooting star on the top note of each of the first
  Gnossienne's four high phrases and the third's two, a melody's peak answered in the sky.
- Mist on the water at dawn, a little at dusk, and under the moon; fireflies over the pond in the third Gnossienne.

Four things happen once a day:

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

## Any screen

The camera frames a 16:9 picture. On a canvas narrower than that (a phone held upright, a tablet) the stage shows the
same picture across its width with more sky and sea round it. So the sky's things are sized and placed by the framed
picture's height, hung from the horizon, not by the canvas's (`frameOf`): the sun and the moon keep their arcs over the
horizon rather than climbing out of sight, the bow stays a bow, the aurora hangs over the stones rather than
stretching to the top of the screen, and a shooting star falls over the scene. How far out the camera is is measured
the same way, so nothing that fades as the camera draws out (the gulls, the fireflies, the bow, the reflections) takes
an upright phone for a wide shot. Audited at 16:9, 21:9, 4:3 and an upright phone.

## The words

The page sets the titles over the stage, and they come over busy places: the title and the credits over the planet's
lit limb and its ring of lamps, the Gnossiennes' names over the sunset's rays and the cadence. So under each card, while
it is up, the canvas lays a soft veil of the dark (a wide ellipse, a third as dark as the night at its middle), as a
film's titles are shaded; it comes and goes with its card.

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

## Where things are

`orbit/`: `music.ts` the notes as played; `path.ts` the ball's way and the stones; `camera.ts`; `titles.ts`; `world.ts`
the day's colours; `air.ts` what lives in the air and the water (clouds, gulls, mist, the aurora, the whale) and their
layers; and the drawings, `sky.ts`, `stones.ts`, `sea.ts` and `over.ts` (over the ball), with what they share in
`frame.ts` (the framed picture, the weathered day, the sun's and the moon's ways, the lamplighter's flame).
`scene.ts` is their index.

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
without a jump, the seam included; the titles.

# Gymnopédie (Opus 5.5)

`/shows/?show=gymnopedie&take=opus55`, in the picker as **Gymnopédie**, one take, **Opus 5.5**.

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

## The story

A lamplighter's round, one day long. By day the ball walks the colonnade under the sun. At dusk it lights a lamp on
every stone it comes down on, and under the moon it opens the flowers; what it does at night stays done, so behind it
the lamps burn and the flowers are open, and ahead of it the lamps are dark and the flowers are buds. From far off the
lamps are a thread of lights over the curve of the planet (the wide between the Gnossiennes), and at the seam the
whole planet is ringed with them and, fainter, with the flowers: the night's way round, and dark on the day's side.
Then dawn comes round, the lamps go out one by one and the flowers close (7 to 34 s), and the ball sets off again.

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
- A grace note: a spark where the ball is about to land, a breath before it does; in the first Gnossienne, at the
  lamp's wick, which then catches.
- The phrasing: the camera. It drifts out on a held note, more on a longer one, and in again as the next phrase
  begins, following the melody like a slow spring, so a run of quick notes stays close and a run of long ones eases
  back (`breath`). Its keys shape each piece: close as the first Gnossienne climbs to its top note, back over the thread
  of lamps as it comes down; lower over the pond in the third, where the water and the moon's path are more of the
  picture.
- Loudness: the render's own level barely moves (a soft, pedalled piano), so the show answers how full the music is,
  worked out from the notes (every note's weight, dying away, smoothed over a few seconds; `loudness`). It sets how
  high the swells stand and how bright the light on the water is: calm in the Gymnopédie's long notes, fullest where the
  Gnossiennes run on.

## Checks

`check:shows` (`apps/rube/checks/gymnopedie.ts`): the picker entry, the credit, the three pieces in order; the loop
(period, offset, a transport that goes round, the last moment equal to the first for the ball and the camera, a time a
period on the same time); the ball never jumps, the seam included; every landing, bounce and restrike is a melody
note's own attack and every melody note is one; the ball arrives on each stone as its note is struck, riding it; it
squashes on every landing and bounce and at no other time; every bass note sends out a swell; every chord note belongs
to one heard chord; the camera breathes only on held melody notes, never jumps in or out, and its breath and the
loudness come round with the period; every lamp is dark until the ball lights it and burns until dawn, and every
flower opens as the ball comes and closes at dawn, across the seam; the titles.

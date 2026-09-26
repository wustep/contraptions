# Gymnopédie (Opus 5.5)

`/shows/?show=gymnopedie&take=opus55`, in the picker as **Gymnopédie**, one take, **Opus 5.5**.

Satie's Gymnopédie No. 1, Gnossienne No. 1 and Gnossienne No. 3, one after the other, round a small sea planet once
a period, as a loop with no seam: 634.8 s, and then the same 634.8 s again.

## The music

Played for the show by `scripts/satie-render.py`, not taken from a record. It reads the Mutopia Project's engravings
(Gymnopédie No. 1 unfolded to the 78 bars Satie wrote out) and plays them on the Salamander Grand Piano's samples:
a tempo for each piece (70, 84 and 72 to the crotchet), breaths into the long notes and a ritardando at each end, the
melody over the chords, the chords rolled a little from the bottom, the grace notes just ahead of their beat, and a
legato pedal changed with each bass note. Each sample is trimmed to its own attack, so a note's hammer lands on its
time to the sample. The room is a synthetic hall, convolved circularly.

The render is one period of a circle: whatever rings past the end of the period (the last Gnossienne's resonance, the
hall) wraps round into its start. The file carries two seconds of its own end before the show's zero and two of its
start after the period, so a decoder that trims a few samples differently still meets itself.

Every note is written down as it lands (`scripts/show-plans/satie-performance.json`): time, pitch, velocity, and role
(melody, bass, chord, grace). The show is timed to that file. Measured back off the mp3 with a spectral-flux onset
detector, every melody and bass note has an onset within 35 ms (the detector's own window bias is about −10 ms), there
are no clicks, and the two copies of the loop's edge agree to the mp3's coding noise.

Licences: `docs/promo/SATIE_GYMNOPEDIE_ATTRIBUTION.txt`. Composition public domain; engravings public domain and
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
- At the seam the camera is all the way out: the planet small in the dark, the last resonance going. The title comes up
  over it as the Gymnopédie's first bars begin, and the camera goes down to the ball on the first column as the melody
  enters.

## The machine

The melody is the landscape. Each run of one pitch is a stone standing out of the sea, as high as the note; the ball
lands on it as its note is struck, rides it, and leaves it for the next just before that one sounds, in a slow,
low-gravity arc. A second quick note on the same stone is a small bounce (the third Gnossienne's paired notes); a held
note whose key the chords strike again answers with a pulse. The ball goes as the music does: quick through the
eighths, slow over the long notes, never stopping.

One material a piece: the Gymnopédie at dawn and through the morning, slender columns and lintels in the sea; the
first Gnossienne from dusk into the night, bronze beams on dark posts, each with a lamp the ball lights as it lands and
which burns down slowly behind it, a thread of lights; the third Gnossienne under the moon, lotus leaves on stems, the
long ones with a flower that opens when the ball comes. Every bass note sends a slow swell out across the sea from
under the ball. A grace note is a glint on the ball just before it lands. Between the pieces the camera goes out over
the curve of the planet to the sun going down, the lamps, the moon.

## Checks

`check:shows` (`apps/rube/check-gymnopedie.ts`): the picker entry, the credit, the three pieces in order; the loop
(period, offset, a transport that goes round, the last moment equal to the first for the ball and the camera, a time a
period on the same time); the ball never jumps, the seam included; every landing, bounce and restrike is a melody
note's own attack and every melody note is one; the ball arrives on each stone as its note is struck; the titles.

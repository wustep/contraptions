# Orchestrion

`/shows/orchestrion/` · `versions/orchestrion/opus55.show.ts` · code in `versions/orchestrion/instrument/`

A show whose physics is its soundtrack. Balls fall through an instrument of tuned bars, harp strings and brass pipes,
and every sound is a collision in the simulation, synthesized from it. There is no recording, no sample and no note
laid on top: the soundtrack is the simulation's contact log, read out.

## The instrument

Four bays side by side, each cut to one chord of D major: **D** (Dmaj9), **B minor** (Bm9), **G** (Gmaj7♯11) and **A**
(A with its 6th and 9th). A ball rolls along the rail at the top and drops through whichever gate is open into that
bay. In the bay it:

1. lands on a **harp string** and bounces right,
2. bounces down a row of four **bars**, high to low,
3. hits a **string** at the row's end that turns it back,
4. bounces down a second row to the left,
5. hits a third **string**, turns back again,
6. bounces down a short last row,
7. and drops into a **brass pipe**, the chord's root, which it breathes into as it falls.

From the trough below, a **lift** carries it back to the top, onto the hopper's track, to wait at the **escapement**.
Over the bays hang four **chimes**, one per chord, with their mallets.

## How sound maps to physics

| What happens in the simulation | What you hear | How it is made |
|---|---|---|
| A ball hits a **bar** with normal speed *v* at position *u* along it | the bar rings at its pitch | A **modal resonator**: damped sinusoids at a tuned beam's modes (1 : 3.99 : 9.83 aluminium, 1 : 3.93 : 9.24 rosewood). The excitation is the contact itself: a half-sine pulse whose length is the Hertzian contact time (∝ *v*^−1/5), so a harder hit reaches higher partials. The 2nd mode has a node at the middle, so a centre strike is purer. Loudness ∝ *v*^1.1. |
| A ball hits a **string** | a pluck | **Karplus–Strong**: a delay line one period long, a one-zero loss filter in the loop, an all-pass for the fractional sample (tuned within half a cent). The excitation is combed at the point where the ball touched (a strike near the end is thin and bright). |
| A ball **falls through a pipe** | a breathy note, the chord's root | An **air column**: a waveguide comb at the open pipe's period, breathed into by turbulence noise for exactly as long as the ball is in the bore (the sensor's in/out times), harder as the ball falls faster, with the column's steady tone underneath. A ball that knocks the wall on the way in taps the column. |
| A **gate opens** (the chord changes) | a chime | The gate's mallet strikes its bay's hanging tube: a beam's free modes (1 : 2.76 : 5.40 : 8.93), long, with the slow beat between two nearly equal modes. |
| The escapement lets a ball go, a ball seats against the one ahead, a gate flap moves, a ball lands in the trough's felt or drops into the bowl | small knocks of the works | short modal clicks and thumps, quiet. |

Every voice is panned to where it happened across the instrument (equal-power, within three quarters of each side).

### Tuned to a scale

Nothing sounds that is not a note of D major, because every part is **cut** to one, in the proportions its physics
gives it (`tuning.ts`):

- a bar rings as a free–free beam, pitch ∝ 1 / length², so a bar is `0.46 · √(1175 Hz / f)` cells long;
- a string at one tension, pitch ∝ 1 / length;
- an open pipe, `c / 2L`, pitch ∝ 1 / length (the G pipe is the longest);
- a chime is a beam again, 1 / length².

The lengths are in proportion, not to scale: the instrument's air is slower than ours. The ratios are the physics.

### Rhythm from placement

A bay is **designed from the ball's flight** (`design.ts`). From where the ball leaves the rail, each part is put
where the ball will be one eighth note later. Where the ball has to go next fixes the velocity it must leave with,
and the incoming and outgoing velocities fix the part. The impulse is along the surface normal, so the normal is the
difference of the two velocities. The restitution that turns one into the other is the part's material: about 0.86,
lively aluminium, along a row; about 0.70, rosewood, where a row begins and has to take up the speed of the drop from
the row above; about 0.64 for the strings that turn the ball back. Bars are drawn in their material, and they sound
like it.

The simulation (`sim.ts`) is then run forward over the finished instrument, with nothing told to it but gravity and
the parts. It is a 2 kHz step, exact for a body under gravity, and every contact is resolved at the moment it happened
(the ball is wound back to the touch, turned and run on). It plays every bay as designed: all 52 balls touch the same
14 parts in the same order, each within **0.84 ms** of its sixteenth (`checks/orchestrion.ts`).

The escapement ticks every **dotted eighth** at 72 bpm and lets a ball go at most every third tick (a governor; nine
sixteenths is an odd number, so a ball always lands *between* its neighbour's bounces). Balls bounce in eighths, so two
balls interlock into sixteenths, three against two. A bay's ball plays a descending arpeggio, and the balls behind it
play the same arpeggio a little later: a canon that is just the same physics, a few ticks apart.

### Form from the machine

- Every sixteen ticks (twelve beats) the escapement's count turns the gates over and the next bay's opens, and its
  chime is struck: the chord changes D → Bm → G → A, three times round, and then **D** for the coda.
- How many balls are going round is how dense the music is, and that is the only hand on it. The **jar** lets one
  ball at a time into the machine over the first minute. From 1:30 a switch at the trough's end turns balls aside
  into the **bowl**, so the last cycle thins out: 6, 5, 5, then 2 balls through its four chords. The last ball is
  held back in the jar and let out exactly as the coda's D chime is struck. It plays D alone, and comes to rest with
  the others. 2:19.

## The soundtrack, live

Nothing is rendered ahead. When the show plays, an **AudioWorklet** runs the voices (`engine.ts`) in the browser's
audio thread, and each note is struck on the sample the playhead reaches its contact: the page tells the thread the
show's notes once, and then only where the show is (from which moment, at which of the thread's own sample times, at
what speed). The thread runs whatever is ringing 128 samples at a time, through a room and a desk (`render.ts`): the
dry instrument plus a `ConvolverNode` hall (an impulse response of seeded noise, darker as it dies, RT60 about 2.9 s),
a slow `DynamicsCompressor` for glue, and a fast hard-knee one as the **limiter**, then the level the offline render
is normalized to, so live and file are as loud as each other (peaks about −1 dBFS).

The player keeps the picture locked to the music, as it does for any soundtrack: the show's time **is** the audio
context's clock (where the synthesis started from, and how long it has run since at its speed, less the device's
latency). So:

- **Speed** changes the machine, not a recording. At ½× or 2× the balls strike the parts half or twice as often, and
  every bar and string still rings at its own pitch for its own time: no time-stretching.
- **Seeking** lets what was sounding go over a few milliseconds (with the room's tail), and picks up what was struck
  in the seconds before the new moment, ringing where it would be.
- **Pause** is silent at once: the voices and the hall's tail are let go together.

The engine refers to nothing outside itself, so its own source text is the worklet's (`live.ts`): the voices heard
live and the voices in a file are the same arithmetic, and `checks/orchestrion.ts` holds the live engine, run 128
samples at a time, to the offline mix to the sample.

**The file, where one is wanted.** A saved video (and a browser with no AudioWorklet, and `?music=file`) gets the
same voices rendered to a WAV first: the engine over the whole show, the same room in an `OfflineAudioContext`,
brought to a peak of −1.00 dBFS (no full-scale samples, about −13.6 dBFS RMS), about four seconds' work. A video
saved at another speed is that file time-stretched.

**Audio and gestures:** the audio context is made on the first play, in the press that asked for it. Before that the
page holds none: nothing sounds and nothing is asked of the browser. A link opened straight to the show runs its
picture with the sound held, and the first press anywhere brings the sound in where the picture is. Where there is no
audio context at all (the headless checks), the show is the same, silent.

## The picture

A dim room and a lamp. The parts are drawn in their own materials (aluminium and rosewood bars on felt pins at their
nodes, 0.224 of the way in, as a real free bar is held), quiet until struck. What sounds glows in its bay's light for
as long as it rings, with the same decay its voice has. A string trembles, and its swing is drawn as the lens a
long exposure would see. A pipe's brass warms while a ball is in it. The camera holds the instrument and leans toward
what is sounding. A 16:9 frame tall enough for one bay is already most of the instrument wide, so it never cuts in
close, except to follow the first ball out of the jar.

## Files

- `tuning.ts`: the chords, the pulse, sizes from pitches.
- `sim.ts`: the physics: balls, capsule parts, contacts at their moment, pipe sensors.
- `design.ts`: the instrument built from the ball's flight.
- `run.ts`: the whole performance as one simulation: escapement, gates, jar, lift, bowl.
- `score.ts`: the log read out as notes, panned and levelled.
- `engine.ts`: the voices, as an engine that plays notes as they come, live or offline; `voices.ts`, its copy for the
  page's own thread.
- `live.ts`: the engine as an AudioWorklet, and the live music the player plays.
- `render.ts`: the Web Audio room and limiter, and the WAV for what needs a file.
- `draw.ts`, `camera.ts`, `show.ts`, `index.ts`: the picture, and the take put together.

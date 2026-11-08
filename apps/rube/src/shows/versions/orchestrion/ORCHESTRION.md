# Orchestrion

`/shows/orchestrion/` · `versions/orchestrion/opus55.show.ts` · code in `versions/orchestrion/instrument/`

A show whose physics is its soundtrack. Balls fall through an instrument of tuned bars, harp strings and brass pipes,
and every sound is a collision in the simulation, synthesized from it. There is no recording, no sample and no note
laid on top: the soundtrack is the simulation's contact log, read out.

## The instrument

Five bays side by side, each cut to one chord of D major: **D** (Dmaj9), **B minor** (Bm9), **G** (Gmaj7♯11), **A**
(A with its 6th and 9th) and **F♯ minor** (F♯m7 with its 11th). A ball rolls along the rail at the top and drops
through whichever gate is open into that bay. In the bay it:

1. lands on a **harp string** and bounces right,
2. bounces down a row of four **bars**, high to low,
3. hits a **string** at the row's end that turns it back,
4. bounces down a second row to the left,
5. hits a third **string**, turns back again,
6. bounces down a short last row,
7. and drops into a **brass pipe**, the chord's root, which it breathes into as it falls.

From the trough below, a **lift** carries it back to the top, onto the hopper's track, to wait at the **escapement**,
unless the **trap** at the trough's end lets it down into the **bowl**. Over the bays hang five **chimes**, one per
chord, with their mallets. The balls come from a **jar** over the track, and they are not all alike: ivory, glass
and brass.

## How sound maps to physics

| What happens in the simulation | What you hear | How it is made |
|---|---|---|
| A ball hits a **bar** with normal speed *v* at position *u* along it | the bar rings at its pitch | A **modal resonator**: damped sinusoids at a tuned beam's modes (1 : 3.99 : 9.83 aluminium, 1 : 3.93 : 9.24 rosewood). The excitation is the contact itself: a half-sine pulse whose length is the Hertzian contact time (∝ *v*^−1/5, and ∝ *m*^2/5 *E*\*^−2/5 for the ball's mass and stiffness), so a harder hit, or a stiffer ball, reaches higher partials. The 2nd mode has a node at the middle, so a centre strike is purer. Loudness ∝ the ball's momentum, *m* *v*^1.1. |
| A ball hits a **string** | a pluck | **Karplus–Strong**: a delay line one period long, a one-zero loss filter in the loop, an all-pass for the fractional sample (tuned within half a cent). The excitation is combed at the point where the ball touched (a strike near the end is thin and bright), brighter for a stiffer ball, louder for a heavier one. |
| A ball **falls through a pipe** | a breathy note, the chord's root | An **air column**: a waveguide comb at the open pipe's period, breathed into by turbulence noise for exactly as long as the ball is in the bore (the sensor's in/out times), harder as the ball falls faster, with the column's steady tone underneath. A ball that knocks the wall on the way in taps the column. |
| A **gate opens** (the chord changes) | a chime | The gate's mallet strikes its bay's hanging tube: a beam's free modes (1 : 2.76 : 5.40 : 8.93), long, with the slow beat between two nearly equal modes. |
| The escapement lets a ball go, a ball seats against the one ahead, a gate flap moves, a ball lands in the trough's felt or drops into the bowl | small knocks of the works | short modal clicks and thumps, quiet. |

Every voice is panned to where it happened across the instrument (equal-power, within three quarters of each side).

### Tuned to a scale

Nothing sounds that is not a note of D major, because every part is **cut** to one, in the proportions its physics
gives it (`tuning.ts`):

- a bar rings as a free–free beam, pitch ∝ 1 / length², so a bar is `0.46 · √(1175 Hz / f)` cells long;
- a string at one tension, pitch ∝ 1 / length;
- an open pipe, `c / 2L`, pitch ∝ 1 / length (the F♯ pipe is the longest);
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
14 parts in the same order, each within **0.84 ms** of its sixteenth (`checks/orchestrion.ts`). Every ball, whatever it
is made of, takes the same path: they are all the same size and all hard, and the restitution is the part's.

The escapement ticks every **dotted eighth** at 72 bpm and lets a ball go at most every third tick (a governor; nine
sixteenths is an odd number, so a ball always lands *between* its neighbour's bounces). Balls bounce in eighths, so two
balls interlock into sixteenths, three against two. A bay's ball plays a descending arpeggio, and the balls behind it
play the same arpeggio a little later: a canon that is just the same physics, a few ticks apart.

### The balls: dynamics and colour

The jar holds three kinds of ball (`sim.ts`). They follow the same paths and differ in how they strike. By Hertz, a
ball stays on a part for a time ∝ *m*^2/5 / *E*\*^2/5 (*E*\*, the stiffness of the pair), and the blow it gives is its
momentum:

| Ball | Against ivory | Heard |
|---|---|---|
| **ivory**, 1.85 g/cm³, soft beside the parts (*E*\* 15 GPa against aluminium) | the reference | warm |
| **glass**, 2.5 g/cm³, stiff (*E*\* 38 GPa) | ×1.35 the blow (+2.6 dB); contact 0.78 as long | brighter, a little louder |
| **brass**, a hollow shell twice an ivory ball's weight, stiff (*E*\* 46 GPa) | ×2 the blow (+6 dB); contact 0.84 as long | loud and bright |

So the dynamics of the piece are what is in the machine: the jar's order is the score's hairpins.

### Form from the machine

Every sixteen ticks (twelve beats, ten seconds) the escapement's count turns the gates over, the next bay's opens and
its chime is struck: the chord changes. The count reads the form off a list of chords (`run.ts`, `FORM`):

| | Chords | The governor | The balls | Loudness (rendered, RMS) |
|---|---|---|---|---|
| **A** | D Bm G A | every 3rd tick | the jar lets in eight **ivory** balls, one every 8 ticks: 3, 3, 4, 3 a chord | −21 → −18 dB |
| **A** | D Bm G A | every 3rd tick | five **glass** balls join: 4, 5, 6, 5 | about −16 dB |
| **B** | G A **F♯m** Bm | every **2nd** tick | ten **brass** balls join: 8 a chord, every ball in | −14 → −11.5 dB |
| **A** | D Bm G A | every 3rd tick | the trap takes the brass out first, then the others: 3, 5, 4, 3 | −13 → −17 dB |
| **coda** | D | | one glass ball | −17 → −26 dB |

- **The governor** is the texture. In the song it lets a ball go at most every third tick: nine sixteenths, an odd
  number, so a ball always lands *between* its neighbour's bounces, and two balls interlock into sixteenths, three
  against two. In the middle it is let out to every second tick: six sixteenths, even, so a ball falls in step with
  the one ahead, three eighths behind, and they **strike together**: chords in eighths. (Measured: in the middle 98%
  of the touches sound with another ball's; in the song, half.)
- **The middle takes the gates in another order**, IV–V–iii–vi, and is the only place the F♯ minor bay is heard, so
  the song's return to D is a homecoming.
- **The trap** at the trough's end is set for weight two chords before the song comes back: every brass ball that
  comes to it drops into the bowl, so the loudest balls leave first. Then it takes others, one at a time, and in the
  last chord it takes every ball that comes.
- **The coda.** The escapement holds for the four ticks before it, and the jar's last ball, glass, kept back all
  along, is let out exactly as the coda's D chime is struck. It plays D alone, and comes to rest with the others. 3:04.

## The soundtrack, live

Nothing is rendered ahead. When the show plays, an **AudioWorklet** runs the voices (`engine.ts`) in the browser's
audio thread, and each note is struck on the sample the playhead reaches its contact: the page tells the thread the
show's notes once, and then only where the show is (from which moment, at which of the thread's own sample times, at
what speed). The thread runs whatever is ringing 128 samples at a time, through a room and a desk (`render.ts`): the
dry instrument plus a `ConvolverNode` hall (an impulse response of seeded noise, darker as it dies, RT60 about 2.9 s),
a light, slow `DynamicsCompressor` for glue (light enough that the jar's dynamics come through), and a fast hard-knee
one as the **limiter**, then the level the offline render
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
brought to a peak of −1.00 dBFS (no full-scale samples, about −15.6 dBFS RMS over the whole show), a few seconds' work. A video
saved at another speed is that file time-stretched.

**Audio and gestures:** the audio context is made on the first play, in the press that asked for it. Before that the
page holds none: nothing sounds and nothing is asked of the browser. A link opened straight to the show runs its
picture with the sound held, and the first press anywhere brings the sound in where the picture is. Where there is no
audio context at all (the headless checks), the show is the same, silent.

## The picture

A dim room and a lamp. The parts are drawn in their own materials (aluminium and rosewood bars on felt pins at their
nodes, 0.224 of the way in, as a real free bar is held), quiet until struck, and the balls in theirs: ivory, clear
glass with the lamp gathered low in it, brass. Everything that sounds is seen sounding, in its bay's light, for as
long as it rings, with the same decay its voice has (`draw.ts`):

- **A strike** is a flash where the ball met the part, and a thin ring of light going out from it as the sound does,
  as big as the blow: a brass ball's ring is twice an ivory one's. The ball itself catches the part's light for an
  instant as it touches.
- **A bar** lights along its length, not round it, and dips a hair and rings back.
- **A string** trembles, its swing drawn as the lens a long exposure would see.
- **A pipe** is lit inside where its air presses hardest: an open pipe's note has its pressure at the middle of the
  bore and none at the open ends, so the light is a sine along the tube, breathing a little. Its brass warms while the
  ball is in it, and a puff of air spreads from its foot as the ball leaves.
- **A chime** swings on its cord and glows, its mallet drawn back as the gate's count comes round.
- **The trap** is a brass leaf in the trough's floor at its end. It swings down under each ball it takes (with a small
  knock), and the ball runs down a chute under the lift's foot into the bowl.

The camera holds the instrument and leans toward what is sounding. A 16:9 frame tall enough for one bay is already
most of the instrument wide, so it never cuts in close, except to follow the first ball out of the jar.

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

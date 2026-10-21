# Maker · after Dune: Part Two — the cue

**"Harkonnen Arena"**, Hans Zimmer, from *Dune: Part Two (Original Motion Picture Soundtrack)*, WaterTower Music, 2024.
It runs 5:22.2. In the film it is the cue under Feyd-Rautha's birthday games on Giedi Prime, under the black sun. The
show plays WaterTower Music's own upload by YouTube only ([UdlvgIFdNZU](https://www.youtube.com/watch?v=UdlvgIFdNZU)),
from its first second, so show time is the video's time.

## Why this cue

The brief asked for the score's throat chants and drums, the iconic sound of Part Two, and for room: the desert, the
harvester, the first worm ride, the arena and the charge each staged with scale and time. The candidates were measured
side by side (loudness, a harmonic/percussive split, tempo by autocorrelation, spectrograms) from local analysis
copies of WaterTower's uploads:

| Cue | Length | What the measurements said |
| --- | --- | --- |
| Worm Ride | 2:20 | The ride itself, drums and voices, but uniformly loud and too short to hold more than the ride. |
| Harkonnen Arena | 5:22 | The most percussive of the long cues (about a third of its energy in hits), with chanting voices throughout, two steady driving pulses, and one dead silence in the middle. |
| Only I Will Remain | 6:44 | A beautiful arc (quiet, build, climax, fade) but sustained harmony: no drums to speak of, no chant. |
| Kiss the Ring | 3:12 | Near silence to a huge end: the ending, and short. |
| Lisan al Gaib | 6:37 | Loud and steady throughout; the guitar and Paul's motif rather than chant. |
| Beginnings Are Such Delicate Times | 8:56 | Mostly quiet woodwinds. |

Harkonnen Arena has the chant and the drums, and its shape holds the story: the two driving pulses are the thumper and
the ride, and the charge; the silence is the eclipse; the two hardest blows of the cue land in the arena.

The structure was measured once from a local analysis copy that is never committed
(`scripts/shows/harkonnen-arena-onsets.py` → `scripts/shows/plans/harkonnen-arena-onsets.json`). The script records:
- loudness in quarter seconds;
- spectral-flux onsets, each with its strength against its neighbours (`s`) and against the whole cue (`g`);
- five combs, each tracked beat by beat, every beat moved onto its own attack where one is within 40 ms;
- the stretches and landmarks the story is cut to.

`check:shows` holds the show's strikes and camera cuts to that file.

## Sections and landmarks (seconds)

| From | Stretch | What the music does | What the show does there |
|---|---|---|---|
| 0 | chant | The voices and the drone alone, loud, no blows; two hits at 12.6. | The deep desert: two on a rock; the harvester far off under its plume; the machine close on the hits. |
| 27.88 | booms | A blow every 3.33 s on a slow pulse of 1.666 s (the first at 27.88). | The first boom on the rock's lip; worm sign running in under the flat, heaving on each. |
| 44.54 | phrases | A great blow every 13.6 s (44.54, 58.13, 71.72, 85.31, 97.47; the first is the third-hardest of the cue) over a slower drum (1.045 s). | The carryall comes down; takes hold; the sand goes down round the machine; the mouth comes up; swallowed. |
| 104.06 | drive | A beat arrives, 95 a minute (0.633 s). | Another day: the thumper, beating with the drum. |
| 128.0 | run | Harder, 100 a minute (0.598 s): the steadiest stretch of the cue; its hardest beat 143.06. | The worm; the hooks; the climb; he stands. |
| 164.6 | fall | Everything going down to nothing; dead silence from about 178 to 184. | The eclipse: the colour drains to infrared, then black and white. |
| 186.02 | return | It comes back, low. | Giedi Prime's arena under the black sun (a dissolve). |
| 198.01 | blows | The two hardest blows of the cue (198.01, g 4.3; 202.15, g 4.9), then free. | Feyd-Rautha fells two prisoners; the third fights; the ink in the sky. |
| 262.89 | charge | The beat again, quickening from 102 to 108 a minute; its peak 288.49. | The colour back with the storm; the worms out of it; the Emperor's ship. |
| 314.0 | end | The last chord dying, to 322.2. | The storm gone by; the end credits, on into the quiet. |

## The combs

| Comb | From – to | Period | Beats | On their own attack |
| --- | --- | --- | --- | --- |
| booms | 21.4 – 42.9 | 1.666 s | 14 | 10 |
| phrases | 56.2 – 84.1 | 1.006 → 1.046 s | 28 | 8 |
| drive | 104.6 – 127.5 | 0.665 → 0.636 s | 37 | 19 |
| run | 128.0 – 164.6 | 0.595 → 0.600 s | 62 | 55 |
| charge | 264.0 – 312.8 | 0.587 → 0.551 s | 86 | 72 |

The charge quickens, and a comb carried on from its first half drifts a quarter of a beat by its peak, so its second
half is anchored on a blow of its own (292.53).

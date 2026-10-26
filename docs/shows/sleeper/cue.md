# Sleeper · after Dune — the cue

**"Paul's Dream"**, Hans Zimmer, from *Dune (Original Motion Picture Soundtrack)*, WaterTower Music, 2021. It was
released as the film's first single on 22 July 2021, beside *Ripples in the Sand*. It runs 7:03.39. The show plays
WaterTower Music's own upload by YouTube only ([BdtiYwSP9ko](https://www.youtube.com/watch?v=BdtiYwSP9ko)), from its
first second, so show time is the video's time.

**Why this cue.** It is the film's main theme in one long arc. It starts almost silent, swells into the drums, then
plays its loudest stretch, which one great blow cuts off. Only the low voices are left, then a high voice alone, then
everything again, and it dies away. Part One has the same shape. Caladan is quiet. Arrakis is the drums and the
spectacle. The night of the Harkonnens ends on a death. Then come the desert and the visions, then the storm and the
Fremen, then the long walk into the sand. The cue is named for Paul's dream, and the show is built on that dream.

The structure was measured once from a local analysis copy that is never committed
(`scripts/shows/pauls-dream-onsets.py` → `scripts/shows/plans/pauls-dream-onsets.json`). The script records:
- loudness and the high voices in quarter seconds;
- spectral-flux onsets, each with its strength against its neighbours and its low-band share;
- the low swells (booms), each with its attack;
- the click, where the playing holds it.

`check:shows` holds the show's strikes to that file.

## The click

Zimmer keeps a click under the whole cue: a tick of 0.31252 s (192 a minute), four ticks to a slow beat of 1.25 s. The
playing holds it closely from 0 to 41 s, and through the drums and the full stretch (110 to 270). Elsewhere it plays
free. In the quiet opening a figure falls every five seconds, on every sixteenth tick, with an answer a slow beat later
(5.06/6.31, 10.06/11.31 …). Through the full stretch a great boom comes about every ten seconds, eight slow beats apart.
After the great blow, the climb back has its own phrase: a drum fill into a boom every fifteen seconds (299.3, 314.4,
334.9, 349.6, 364.4, 379.4), and the last climb into 397.7.

## Stretches and landmarks (seconds)

| From | Stretch | What the music does |
|---|---|---|
| 0 | sea | A high D held almost alone; the five-second figure; the first low swell at 12.59. |
| 27.25 | lament | Low voices come in, a semitone rocking between A and A-flat over D; the call at 30.17; quiet swells at 46.68, 62.31, 87.13. |
| 99.5 | build | The lows climb, a swell on 103.09, and hold their breath from 105 to 109. |
| 110.06 | drums | The drop: the drums in D, each blow a swell (111.07, 116.30, 120.11, 130.66, 140.75). |
| 148 | full | The high voices and the brass over the drums: the loudest stretch, a boom about every ten seconds (150.06, 160.97, 170.75, 187.58, 200.79 … 267.18). |
| 270.06 | fall | The cue's greatest blow; the voices and the brass cut off; only the lows, dying to a hush at about 286. |
| 288.08 | voice | A high voice alone over the lows, rocking A and A-flat. |
| 312 | rise | Everything again under the voice, in fifteen-second phrases, with breaths at 336 and 366 and a climb from 384. |
| 397.72 | last | The last blow, and its long decay; a last swell at 406.87. |
| 411 | fade | To silence at 423.39. |

# Logogram

The recording is copyrighted. This take is a private tech demo only; do not ship this audio in a public build.
Nothing here claims any right to it.

The music is Jóhann Jóhannsson's *Heptapod B*, from *Arrival* (Denis Villeneuve, 2016). The attribution is in
`apps/rube/src/shows/versions/heptapod-b/ATTRIBUTION.txt`.

Open it at `/shows/heptapod-b/opus55/` (or `/shows/?show=heptapod-b&take=opus55`). In the Shows picker it is the work
**Logogram**, whose one take is **Opus 5.5**.

## What it is

A Rube Goldberg machine plays the cue from its first sample, 3:42, and the end credits run on in the quiet after it:
4:06 in all. It is one ball on one path through four places, and it is a circle: the last scene opens on the show's
first frame.

- **Louise Banks** is the orange ball (`#E2672C`), hazmat orange, the suit the team wears into the shell. She is the
  thread: every machine is hers to make go, and nothing else in the show is her colour.
- **Ian Donnelly** is the blue ball (`#5B84B1`). He is with her from the helicopter to the glass, and at the end.
- **Hannah** is the little peach ball (`#F4A582`), a paler Louise, her daughter. She is only ever at the lake house,
  which is the future.
- **Abbott and Costello**, the heptapods, are drawn, never balls.

## The cue

**Why Heptapod B.** It is the language cue, the film's idea in sound, and it is a machine made of voices.
- One pulse of short sung notes that never changes pace: pulse *k* at 0.0847 + 0.238715·*k* s, from pulse 28 (6.763 s)
  to the last clear one, pulse 824 (196.783 s). The strong pulses sit within a few milliseconds of that one comb from
  start to end: the loops were laid on a grid.
- Over it the voices loop in lengths of 7, 13 and 18 pulses and phase against each other. So there is no bar and no
  downbeat: only the pulse, and how hard each one is sung.
- Its arc: free murmurs out of near silence; the pulse forming and the voices swelling up to it; layers stacking in
  (39, 66, 90 s); the fullest voices from 108 to 132 s (the loudest swell of the cue at 130.4 s has no attack of its
  own); a last push of hard pulse after hard pulse (167 to 186 s); the pulse thinning and stopping; held tones dying to
  nothing by 219 s, with one last flutter at 208.6 to 212.5 s.

**Its clock.** `scripts/shows/heptapod-b-onsets.py` measured the recording once into
`scripts/shows/plans/heptapod-b-onsets.json`:
- **The comb**, one period and phase fitted to the whole pulse.
- **Every pulse**, moved onto its own attack where one is within 35 ms (720 of the 798 have one), with how hard it is
  sung against the 30 s round it and against the whole cue.
- **Every free onset**, with its strength: the murmurs and the coda have only these.
- **Loudness** every quarter second.

(The rest of this report is written as the parts land.)

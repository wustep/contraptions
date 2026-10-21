# Kohaku · after Spirited Away — the cue

**"One Summer's Day"** (あの夏へ, *Ano Natsu e*), Joe Hisaishi, from *Spirited Away* (2001), in his own recording with
the London Symphony Orchestra from *Melodyphony* (2010). The show plays the official music video on Joe Hisaishi's own
channel by YouTube only ([TK1Ij_-mank](https://www.youtube.com/watch?v=TK1Ij_-mank)), from its first second, so show
time is the video's time. It runs 4:05.

The structure was measured once from a local analysis copy that is never committed
(`scripts/shows/kohaku-onsets.py` → `scripts/shows/plans/kohaku-onsets.json`). The script records:
- every onset (a peak of spectral flux over its local median), with its strength against its neighbours;
- the eighths, tracked through the rubato by dynamic programming over the flux, each moved onto its own attack where
  one is within 40 ms;
- the stretches and their landmarks;
- loudness every quarter second, overall and in three bands.

`check:shows` holds the show's strikes and camera cuts to that file.

## What it is

One theme in C major, played freely: there is no click, and the eighths drift between about 0.35 and 0.41 s (a
quarter of about 78 a minute). It goes from the piano alone to the whole orchestra and back, climbing three times to
the same cadence through A-flat and B-flat to C, each time a little higher, and falls away at the end over half a
minute.

## Sections and landmarks (seconds)

| From | Stretch | What the music does | What the show does there |
|---|---|---|---|
| 0 | intro | Four soft chords on the piano (2.20, 5.10, 8.53, 10.00), then the strings breathe in. | The red gate, close. On the chords: she comes up out of the tunnel's dark; out into the sun; the wind pulls past her into the tunnel; on to the brow, and the summer opens round her. |
| 20.60 | theme | The theme alone, quiet, over the piano's running eighths. | Down the meadow; over the river of stones a stone a note; up the far bank a step an eighth; along the empty street as the sun goes, the lanterns coming on one a note. |
| 44.31 | swell | The orchestra takes the theme up. | The bathhouse revealed, lit, over its bridge; Haku waits on it, No-Face at its rail; they cross. |
| 64.08 | crest | The first climax, through A-flat and B-flat to C. | The great bath: the river spirit, the thorn, the haul, the junk pouring out. |
| 80.0 | settle | It comes down. | The clean river spirit rises and goes out over the night sea. |
| 94.0 | breath | The first quiet. | Dawn: the plain is a sea; she on the balcony. |
| 101.99 | rise | The theme again, building. | The white dragon over the sea with the paper birds cutting at him. |
| 115.82 | height | The second climax, the loudest so far (123.36). | He turns for her door; on 123.36 he comes in through it; the shutter drops on the birds and they strike it one a note. |
| 137.40 | high | High and light, nothing under it. | He lies still; she sets out on the water along the rails. |
| 147.5 | low | Quiet, with a swell at 157.07. | The train comes; across the water; inside, the shadow passengers. |
| 161.5 | hush | The deepest quiet of the middle. | Dusk: the lonely station and the girl left on its platform. |
| 168.46 | return | The theme once more, gathering. | Night; Swamp Bottom; the hopping lamp; the dragon comes down for her. |
| 193.45 | summit | The last climax. | Over the cloud under the moon; the river in the gap below. |
| 201.55 | cadence | The cadence at its fullest. | His name: the scales come off him and the last of the dragon is the boy. |
| 205.5 | home | It winds down. | Down through the cloud into the dawn, onto the river of stones; she goes back over it alone. |
| 231.5 | fade | It fades, to about 241. | At the gate's arch she stops, and goes into the dark; the credits over the summer sky, on into the quiet. |

## Free time

Every strike is on a measured onset or a tracked eighth (`spread`, `strongest`, `onsetNear` and `eighthsIn` in
`music.ts`):
- the four chords at the gate;
- the stones crossed going in, and again going home;
- the ten steps up the far bank, on the eighths;
- the lanterns down the street;
- the dragon in at the door on the peak, the shutter on the next note, the birds striking it, and the blows of his
  thrashing;
- his name on the cadence;
- the parting at the river.

# Nostos · after The Odyssey — the cue

**"Odysseus"**, Ludwig Göransson, from *The Odyssey (Original Motion Picture Soundtrack)*, Back Lot Music, 2026.
It is track 20 of 23 and runs 8:41.46. The show plays Back Lot Music's own upload by YouTube only
([WCxx_OVOVUw](https://www.youtube.com/watch?v=WCxx_OVOVUw)), from its first second, so show time is the video's time.

The structure was measured once from a local analysis copy that is never committed
(`scripts/shows/odysseus-onsets.py` → `scripts/shows/plans/odysseus-onsets.json`). The script records:
- loudness in quarter seconds, overall and in three bands;
- spectral-flux onsets, each with its strength against its neighbours;
- a novelty curve for the section boundaries;
- a pitch-class profile;
- a comb fitted to the one stretch that keeps a steady beat.

`check:shows` holds the show's strikes to that file.

## What it is

One theme in C minor, a lament over a drone, grown from a single voice to everything and back. The theme is a few
notes circling C with a lift to A-flat. The pitch profile sits on C, G and A-flat (with E-flat and F) nearly
throughout. It leans to F minor through the middle of the answer (about 123 to 150) and to the dominant just before
the cut (about 300). There is no steady beat except in the middle: 80 a minute (0.7501 s), from 188.35 to the cut,
in twelve-beat phrases of 9 s.

## Sections and landmarks (seconds)

| From | Stretch | What the music does | What the show does there |
|---|---|---|---|
| 0 | theme | The theme alone over the drone, very quiet, no low voices; first statement. | Troy's beach at dusk: the black horse half-sunk in the surf, hauled ashore. |
| 36.06 | (theme) | The second statement of the theme, a strong attack at its start. | Ithaca that night: the island, the palace cut open, Penelope's shuttle crossing on the theme's notes. |
| 71.42 | answer | The theme answered, fuller and higher, still no low voices; held breaths at about 99.5 and 119.3. | Troy at night: the men down the horse's rope, the gate's gears, the fire, Athena's statue; away at dawn. |
| 151.22 | ground | The low voices come in under it (a thud); a swell at 169.23. | The Cyclops' cave: the boulder shuts on the thud; the stake into the eye on the swell. |
| 187.23 | pulse | A beat arrives, 80 a minute, and everything climbs on it. | Telepylus: oars on the beat; chrome giants in the fog; two ships sunk on hard beats. |
| 222.4 | tutti | Everything, on the beat, the loudest stretch of the cue. | The shore of the dead; the Sirens; Apollo's cattle; the storm. |
| 304.61 | after | The tutti cut off at once; the low voices back at 323.34 and gone at 342; the last attack at 350.43. | Zeus's bolt on the cut; the wreck; the spar on the great seas; Ogygia's sand. |
| 352.6 | hush | Very nearly silence. | He lies still on the beach. |
| 353.5 | rise | The theme again from almost nothing, building. | Seven years on Ogygia, with the loom's cross-cuts; thunder on a clear day; the raft built. |
| 395.51 | return | Everything again, without the beat. | The raft given to the storm; Ithaca at dawn; ashore. |
| 431.57 | quiet | The low voices gone, the high ones slowly climbing; a breath at 494.45. | Argos dies on the drop; the hall; the axes rise; the suitors fail; he climbs. |
| 494.74 | last | The last swell, one great attack. | The bow sings on the attack; the arrow at 500.79; the hall empties; the two meet (508.96). |
| 512.8 | fade | The swell dying away to the end at 521.46. | The west: the skiff, the sun; the credits, and the quiet after them. |

## The comb

From the pulse to the cut there are 157 beats. 135 of them sit on their own attack, each moved there when one was
within 40 ms. The rest keep the comb. The twelve-beat phrases start at 188.35, 197.35, 206.35, 215.35, 224.35,
233.36, 242.36, 251.36, 260.36, 269.36, 278.36, 287.36 and 296.36. Several scenes hand over on a phrase's first beat:
the Sirens at 251.36 and Apollo's island at 278.36.

## Free time

Outside the comb, every strike is on a measured onset (`onsetsIn` and `strongest` in `music.ts`):
- the shuttle's eleven passes in the prologue;
- the men down the horse's rope;
- the boulder door at 151.22;
- the stake at 169.23;
- Argos at 431.57;
- the twelve axes, one from the next, from 450.96 to 457.36;
- the three suitors' landings at 458.07, 467.64 and 476.64;
- his six steps up the stairs, from 485.45 to 489.26;
- the bow at 494.74;
- the loose at 500.79;
- Penelope's six steps down, from 504.26 to 507.79;
- the meeting at 508.96.

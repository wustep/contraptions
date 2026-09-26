# Merry-Go-Round

Joe Hisaishi's concert arrangement of the *Merry-Go-Round of Life*, from *Howl's Moving Castle* (Hayao Miyazaki,
Studio Ghibli, 2004), played by a Rube Goldberg machine: one ball, one path, every mechanism striking on the music.
In the picker as **Merry-Go-Round**, one take, **Opus 5.5**. The recording is copyrighted and demo only
(`ATTRIBUTION.txt`); every piece is new.

## The music

`scripts/shows/merry-go-round-onsets.py` measures the recording once into
`scripts/shows/plans/merry-go-round-onsets.json`. The arrangement changes pace from stretch to stretch, so there is
no one comb: each stretch with a pulse is tracked beat by beat (bars of three, the downbeat the oom), and the free
stretches keep their onsets.

| s | stretch | what happens |
| ---: | --- | --- |
| 0 → 9.6 | a music box | dawn in the hat shop |
| 9.6 → 38.3 | the theme, slow and alone | Sophie at the hat line; out into the street |
| 38.3 → 49.0 | a held D, a breath | the alley: soldiers, Howl, the blob men |
| 49.0 → 150.4 | the waltz | the walk on the air (the swell at 70.0); the curse (101.31); the hills, Turnip Head, the castle walking |
| 152.0 → 177.3 | a flowing interlude | the castle's room: Calcifer, Markl and the dial, Howl, breakfast |
| 178.1 → 199.6 | a slow waltz in the major | the flower fields and the lake |
| 199.6 → 242.4 | a build, and the waltz again | the fleet; the town at war; Howl the bird |
| 243.6 → 285.8 | the climax | the castle falls apart to a plank on legs; the heart given back (272.37) |
| 285.8 → 292.2 | a cadenza | stillness at the cliff's edge |
| 292.2 → 311.2 | the last tutti, the last chord | Calcifer comes back; the castle flies |

The show then runs on in the quiet for the end credits, to 336 s.

## How it is built

The code is `howl/`, on the kit Liftoff, Epilogue and Everything share: each part is handed a slot and builds its
lane from timed waypoints, so its strikes land on the recording by construction (`hits.ts` gathers them; `check:shows`
measures each against the onsets file, `apps/rube/checks/merry-go-round.ts`). `show.ts` holds four places (the
hatter's town, the wastes, the castle's room, the flower fields) in legs; at each change of place the camera carries
the framing across with the ball, so Sophie holds still on the screen while the place changes round her, nearly
always as she steps through the castle's door. Sophie's colour is her age (`age.ts`). The end credits are words the
page sets from `Performance.titles` (`credits.ts`).

*Craft notes and the director's passes are added here as the show is built.*

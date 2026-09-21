# Versions

A show is a piece of music and a machine choreographed to it. One file is one
version of one show:

```
versions/<work>/<take>.show.ts
```

`<work>` is the music (`clair-de-lune`), `<take>` is this run at it (`take-a`),
both in lower case and hyphens. Drop the file in and it is in the picker at
`/shows/`, grouped with the other takes of the same work, in file order.
Nothing else keeps a list. A link to it is `/shows/?show=<work>&take=<take>`.
`/shows/` with no work opens Clair de Lune, Take A.

Keep two takes of the same music side by side for as long as you like; they
share nothing unless you make them share it. To combine them later, write a
third.

## The file

```ts
import { defineShow } from '../../registry'
import recording from './goedhart.mp3'

export default defineShow({
  title: 'Clair de Lune', // the same in every take of this work
  label: 'Take A',
  note: 'One line on what this take is trying.',
  async load() {
    const { ClairDeLune } = await import('./take-a')
    const show = new ClairDeLune()
    return {
      show, // a Show: the player asks it for show.at(t), t in seconds of music
      duration: 312.4, // seconds; the player holds the last frame there
      camera: (t) => show.cameraAt(t), // { x, y, cells }; leave out to follow the ball
      cuts: (t) => t >= 0.8, // leave out to draw every cut
      soundtrack: {
        src: recording,
        offset: 1.92, // seconds into the recording where the show's zero falls
        credit: 'Performed by … · CC BY 4.0', // said in the panel, never on the frame
        href: 'https://…',
      },
    }
  },
})
```

The page reads every version file before it shows a picker, so the file
itself imports only `defineShow`, types, and the recording's URL. The score,
the `Show` subclass and anything else with weight go behind `load()`.
`check:shows` holds you to that, loads every version, and walks it from its
first second to its last.

## What the player promises

- **The music is the clock.** While the recording plays, show time is where
  the recording is. At 2× the recording is time-stretched, not pitched up,
  and the picture is wherever it has got to.
- **It asks for `show.at(t)`**, with `t` in seconds of music. New music takes
  arrange stock durations against recording cues. Choose the pieces, their
  stock variants and their order; do not stretch mechanism clocks or add
  pauses. `../stock/show.ts` plays saved stock placements directly.
  `../timemap.ts` remains for the existing Take A and metronome studies.
- **Nothing is written on the frame.** A show's canvas cannot set type, live
  or in a saved file. Titles, credits and anything else in words go in the
  fields above and are shown in the panel.
- **`camera` frames for 16:9.** `cells` is how many cells a 16:9 frame shows
  top to bottom. A stage of another shape sees more world round that frame,
  never less of it; a saved file is exactly it. Overview overrides framing
  with Machine's fit of the current world's bounds. It affects live viewing
  and export without changing the music clock.

## What is here

`premiere-arabesque/take-a` is a real show: Debussy's Première Arabesque to
Patrizia Prati's recording, the machine walking Regular, Forest, Aqua,
Arcade. The version file only names it. The score, `PremiereShow`, camera
and soundtrack live in `apps/rube/src/timed/premiere-arabesque/` and are
fetched from `load()`.

`premiere-arabesque/take-b` and `clair-de-lune/take-a` are full stock-timing
arrangements with four long maps. Their explicit piece orders live in
`scripts/show-plans/`. `generate:premiere:b` and `generate:clair` compile
those orders using fresh stock placements and write the scores and cue
reports. `check:premiere` includes both Première takes; `check:clair` checks
Clair. Each keeps its approved recording offset and panel credit. Clair was
arranged across the whole catalog: every piece at least once and a repeat
only where the music needs more travel, the whale's cells over open water,
and the arcade's score pops drawn (a stock score's `scores` lists the worlds
whose pops show). A change to any stock piece's lane, or a piece in or out
of a world, means rearranging it and running `generate:clair` again.

`metronome/` is a show with no recording, in strict time: a procedural
machine under a time map, and a struck bar on every strike, made in the
page. It is a worked example of a time map, and `check:shows` still walks
it. Keep it.

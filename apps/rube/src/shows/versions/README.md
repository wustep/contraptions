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
- **It asks for `show.at(t)` and nothing else**, with `t` in seconds of
  music. Any retiming that fits the machine to the music — a pause before a
  strike, a bar hurried, a map a piece — lives inside your `Show`.
  `../timemap.ts` has the vocabulary: `timeMap(knots)` for a smooth monotone
  clock through pairs of (music, machine) seconds, `knotProblems` to say when
  a map asks a mechanism to stop looking like itself, and `RetimedShow` for a
  procedural machine under one map. `metronome/` is a worked example.
- **Nothing is written on the frame.** A show's canvas cannot set type, live
  or in a saved file. Titles, credits and anything else in words go in the
  fields above and are shown in the panel.
- **`camera` frames for 16:9.** `cells` is how many cells a 16:9 frame shows
  top to bottom. A stage of another shape sees more world round that frame,
  never less of it; a saved file is exactly it.

## What is here

`premiere-arabesque/take-a` is a real show: Debussy's Première Arabesque to
Patrizia Prati's recording, the machine walking Regular, Forest, Aqua,
Arcade. The version file only names it. The score, `PremiereShow`, camera
and soundtrack live in `apps/rube/src/timed/premiere-arabesque/` and are
fetched from `load()`.

`metronome/` is two takes of a show with no recording: a procedural machine
and a struck bar on every strike, made in the page. It is a worked example
of a time map, and `check:shows` still walks it. Keep it.


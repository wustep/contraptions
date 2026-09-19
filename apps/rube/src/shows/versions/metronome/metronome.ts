import { Show } from '../../../show'
import type { Note } from '../../ticks'
import { RetimedShow, musicTimeOf, timeMap, type Knot } from '../../timemap'

/**
 * The placeholder: two takes of a show with no music in the repo yet. A
 * procedural machine through its first two worlds, and a struck bar for
 * every piece that fires. The note is on the strike, so whether picture
 * and sound are locked (live, doubled, in a saved file) is something you
 * can see and hear and not only take on trust.
 *
 * The two takes are the two ways round the problem a real version has.
 * In free time the music follows the machine: the notes fall wherever the
 * strikes do. In strict time the machine follows the music: there is a
 * steady beat, and a time map brings each strike onto it with a slight
 * hurry or a slight wait. The second is a worked example of `timemap.ts`
 * for a version that has a recording to fit.
 *
 * When real shows are here this folder can go; nothing depends on it.
 */

const SEED = 'metronome'
/** How many worlds the show runs through, from the first portal to the cut out of the last. */
const WORLDS = 2

export const BPM = 120
const BEAT = 60 / BPM
/** Strikes land on the half-beat. */
export const GRID = BEAT / 2

/** C major pentatonic, two octaves. No two of its notes clash, so any order of strikes is a tune. */
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0]
/** Up the scale and back down, a strike a step. */
const pitch = (i: number): number => {
  const span = SCALE.length - 1
  const at = i % (2 * span)
  return SCALE[at <= span ? at : 2 * span - at]
}

/** When each piece fires, on the machine's own clock. Rails and portals carry the ball and strike nothing. */
export function strikes(show: Show): number[] {
  const out: number[] = []
  for (let i = 0; i < WORLDS; i++) {
    for (const placed of show.universe(i).pieces) {
      if (placed.piece.name === 'rail' || placed.piece.name === 'portal') continue
      out.push(show.begin(i) + placed.start + placed.lane.fire)
    }
  }
  return out
}

export interface Take {
  show: Show
  duration: number
  notes: Note[]
}

/** The music follows the machine: a note wherever a strike falls. */
export function freeTake(): Take {
  const show = new Show(SEED)
  return {
    show,
    duration: show.begin(WORLDS),
    notes: strikes(show).map((at, i) => ({ at, freq: pitch(i), gain: 0.9 })),
  }
}

export interface StrictTake extends Take {
  knots: Knot[]
  /** The strikes that were brought onto the grid, in seconds of music. */
  onGrid: number[]
}

/**
 * The machine follows the music. Each strike is moved to the half-beat
 * nearest where it would have fallen, given where the last one was put,
 * provided that asks the machine for no more than a slight change of pace
 * on the way; a strike too close on the heels of the last to be moved
 * honestly is left to ride between its neighbours.
 */
export function strictTake(): StrictTake {
  const plain = new Show(SEED)
  const native = strikes(plain)
  const end = plain.begin(WORLDS)
  const knots: Knot[] = [{ at: 0, native: 0 }]
  for (const n of native) {
    const last = knots[knots.length - 1]
    const gap = n - last.native
    const at = Math.round((last.at + gap) / GRID) * GRID
    const rate = gap / (at - last.at)
    if (at > last.at && rate >= 0.8 && rate <= 1.25) knots.push({ at, native: n })
  }
  // The way out ends on a beat where that is an honest ask, on the half-beat where it is not, and failing both where it falls.
  const last = knots[knots.length - 1]
  const tail = end - last.native
  const fair = (at: number) => at > last.at && tail / (at - last.at) >= 0.8 && tail / (at - last.at) <= 1.25
  const duration = [BEAT, GRID].map((g) => Math.round((last.at + tail) / g) * g).find(fair) ?? last.at + tail
  knots.push({ at: duration, native: end })

  const map = timeMap(knots)
  const onGrid = knots.slice(1, -1).map((k) => k.at)
  const notes: Note[] = native.map((n, i) => ({ at: musicTimeOf(map, n, 0, duration), freq: pitch(i), gain: 0.9 }))
  // The beat itself, low and quiet under the strikes, the first of each bar a little more.
  for (let b = 0; b * BEAT < duration; b++) notes.push({ at: b * BEAT, freq: b % 4 === 0 ? 130.81 : 98.0, gain: b % 4 === 0 ? 0.4 : 0.22 })

  return { show: new RetimedShow(SEED, {}, map), duration, notes, knots, onGrid }
}

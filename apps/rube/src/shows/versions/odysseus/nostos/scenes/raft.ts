import type { Key } from '../camera'
import { region, standing } from '../draw'
import { rest, ride, roll, type Move, type Pt } from '../path'
import type { Scene } from '../scene'
import { END, WINDOWS } from '../voyage'
import type { SkyKey } from '../world/sky'
import { AGROUND, LAUNCH, SEAT, drawRaft, onRaft, raftAt } from './raft/raft'

/**
 * The raft (M.return → 418): everything again, without the beat. Nolan's Calypso tells him to lie back and let the sea
 * take him; a lone raft on a black sea. The storm comes up as it leaves the beach and the great seas stand up again
 * (`storm/weather.ts`), and the raft rides them, up their black backs and down into the troughs; the camera goes out
 * and out until the raft is a mark among them; they lie down at first light, Ithaca's cliffs come up ahead, the raft
 * drives onto Ithaca's beach (AGROUND, 415.75), and he rolls off it onto the sand and comes to rest at the foot of the
 * cliff on the last attack before the quiet (417.68).
 */

const [FROM, TO] = WINDOWS.raft

type Sea = Pick<SkyKey, 'far' | 'near' | 'body' | 'deep' | 'lit' | 'edge'>
const SEA_BLACK: Sea = { far: '#283033', near: '#121A1C', body: '#0E1517', deep: '#030506', lit: '#5E6A6C', edge: '#080C0D' }
const SEA_FIRST: Sea = { far: '#8E8A80', near: '#384548', body: '#283438', deep: '#090F12', lit: '#C9BCA0', edge: '#151E21' }

const SKY: SkyKey[] = [
  // The storm at its blackest, the raft alone in it.
  { t: 404.5, top: '#161C1F', low: '#2C3437', cloud: '#232A2D', cover: 0.95, ...SEA_BLACK },
  { t: 408.5, top: '#1B2124', low: '#343B3D', cloud: '#2A3133', cover: 0.9, ...SEA_BLACK },
  // First light coming up behind the clouds as Ithaca does.
  { t: 415.6, top: '#66727A', low: '#C9B79A', cloud: '#8E8C86', cover: 0.45, ...SEA_FIRST },
]

/** Off the raft as it grounds, over the bow log, onto the sand, and to rest. */
const OFF = 415.6
const ASHORE = 417.68
const REST: Pt = [801.5, -0.35]
const off = (): Pt[] => {
  const from = onRaft(OFF, SEAT)
  const bow = onRaft(AGROUND + 0.3, [0.34, -0.3])
  return [from, bow, [798.62, -0.35], REST]
}

const HERO: Move[] = [
  ride((t) => onRaft(t, SEAT), LAUNCH, OFF, (t) => raftAt(t).a),
  roll(off(), OFF, ASHORE, 'out'),
  rest(REST, ASHORE, TO),
]

const SHOTS: Key[] = [
  // Off the beach, the storm coming; then in it, close enough to see the sea throw the raft about: along with it, but
  // level, so the seas lift it up the frame and drop it down.
  { t: 397.2, cells: 7.5, off: [1.0, -1.0] },
  { t: 400.0, cells: 10, at: [raftAt(400.0).x + 1.8, -2.1] },
  { t: 403.2, cells: 11, at: [raftAt(403.2).x + 2.0, -2.4] },
  { t: 406.3, cells: 11.5, at: [raftAt(406.3).x + 2.2, -2.6] },
  // Out and out: the raft a mark on a black sea, the storm passing.
  { t: 410.0, cells: 30, off: [5, -6.5] },
  // First light, Ithaca ahead.
  { t: 412.6, cells: 27, off: [8, -5.5] },
  { t: 414.6, cells: 16, off: [3, -2.6] },
  { t: 416.8, cells: 10, at: [802.2, -2.0] },
]

export const raft: Scene = {
  key: 'raft',
  from: FROM,
  to: TO,
  sky: SKY,
  weather: [
    [396.6, 0.5],
    [399, 0.95],
    [407, 1.0],
    [410.5, 0.8],
    [413.5, 0.35],
    [416.4, 0.17],
  ],
  hero: HERO,
  shots: SHOTS,
  mid: [standing('raft', region(668, -6, 806, 3, 2), END, (g) => drawRaft(g))],
}

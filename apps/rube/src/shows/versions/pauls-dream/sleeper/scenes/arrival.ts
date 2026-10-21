import type { Shot } from '../camera'
import { JESSICA, LETO, PAUL } from '../cast'
import type { Pt } from '../paint'
import { Walk } from '../path'
import { FOLD, OPENING } from '../plan'
import type { Scene } from '../scene'
import { FRIGATE_FOLD, RAMP_FOOT } from './arrakeen/geo'
import { ARRAKEEN } from './arrakeen/pieces'
import { SILL, inHold, leverEnd, onRamp } from './arrakeen/rig'
import { ARRIVAL as A } from './arrakeen/times'

/**
 * The arrival on Arrakis (M.drop → 130.664), on the drums.
 *
 * The fold: on the drop, the frigate that was in the heighliner's dark over Caladan holds its place in the middle of the
 * frame while everything round it becomes Arrakis, the ochre air and the city in its bowl of rock under it, and the
 * picture's bars slide away. It comes down on the drums' first three blows and stands on the field before the palace
 * on the third; its hatch opens, the ramp runs down to the field, and on the next blows the Duke comes out, then
 * Jessica, then Paul, three small balls in the heat before the vast sloped palace.
 *
 * Inside the great hall, the crate from Caladan stands open under a hook; Paul steps up onto the winch's foot lever and
 * on each of the fill's four onsets steps it down, the ratchet takes a tooth, and the bull's head comes up the wall a
 * notch, on its hook on the last. His father stands under it. The erg's scene cuts to the ornithopters on the roof on
 * the boom after.
 */

const rL = 0.13 * LETO.size
const rJ = 0.13 * JESSICA.size
const rP = 0.13 * PAUL.size

/** Steady walking pace across the field, cells a second. */
const PACE = 2.4

/** Out of the hold (from `dx` behind the sill, riding the frigate until `go`), down the ramp, and on across the field. */
function outOf(dx: number, r: number, go: number, out: number): Walk {
  const w = new Walk(inHold(A.from, dx, r), A.from).ride((t) => inHold(t, dx, r), go)
  w.roll([[SILL[0] + 0.02, SILL[1] - r]], out, 'in')
  const pts: Pt[] = [onRamp(0, r), onRamp(1, r), [RAMP_FOOT[0] + 0.5, -r]]
  let len = Math.hypot(pts[0][0] - w.at[0], pts[0][1] - w.at[1])
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  // Then on toward the palace at a steady pace until the cut.
  const onFloor = (A.hall - out) * PACE - len
  pts.push([pts[pts.length - 1][0] + Math.max(0.5, onFloor), -r])
  w.roll(pts, A.hall, 'none')
  return w
}

/** Paul on the winch's foot lever: on top of the bar at its end. */
const onLever = (t: number): Pt => {
  const [x, y] = leverEnd(t)
  return [x - 0.14, y - 0.05 - rP]
}

function paul(): Walk {
  const w = outOf(-2.2, rP, A.paul - 1.8, A.paul)
  // In the hall: to the lever's side, up onto it, and four steps down on it.
  w.jump([89.3, -rP]).roll([[87.15, -rP]], A.hall + 1.75, 'inout').wait(A.up)
  const [p0, p1, p2, p3] = A.pulls
  w.hop(onLever(p0), p0)
  for (const [now, next] of [[p0, p1], [p1, p2], [p2, p3]] as [number, number][]) {
    w.ride(onLever, now + 0.1).hop(onLever(next), next)
  }
  w.ride(onLever, A.to)
  return w
}

function leto(): Walk {
  const w = outOf(-0.45, rL, A.leto - 0.4, A.leto)
  w.jump([73.4, -rL]).roll([[79.55, -rL]], A.hall + 2.3, 'inout').wait(A.to)
  return w
}

function jessica(): Walk {
  const w = outOf(-1.2, rJ, A.jessica - 0.9, A.jessica)
  w.jump([71.4, -rJ]).roll([[76.3, -rJ]], A.hall + 2.7, 'inout').wait(A.to)
  return w
}

const shots: Shot[] = [
  // The fold: the frigate held in the middle of the frame, as it was in the heighliner's dark.
  { t: A.from, cells: FOLD.cells, at: FRIGATE_FOLD, cut: true },
  { t: A.descent[1], cells: 26, at: [28, -12.1] },
  { t: A.descent[2], cells: 24.5, at: [29.6, -9.8] },
  { t: A.touch, cells: 22, at: [31.4, -8.8] },
  { t: A.settle - 0.002, cells: 21.5, at: [31.8, -8.6] },
  // On the blow: close on the hatch as it opens, the ramp, and the three of them coming out into the light.
  { t: A.settle, cells: 6.6, at: [33.6, -2.5], cut: true },
  { t: A.jessica, cells: 6.5, at: [35.0, -2.45] },
  { t: 122.457, cells: 6.4, at: [36.6, -2.4] },
  // Wide: three small balls going across the field toward the palace.
  { t: 122.46, cells: 32, at: [44.0, -14.6], cut: true },
  { t: A.hall - 0.002, cells: 30, at: [45.6, -14.0] },
  // The great hall: the crate, the winch, the head coming up the wall.
  { t: A.hall, cells: 8.0, at: [81.5, -3.05], cut: true },
  { t: A.pulls[0], cells: 7.8, at: [81.5, -3.15] },
  { t: A.to - 0.002, cells: 7.5, at: [81.4, -3.3] },
]

export const arrival: Scene = {
  key: 'arrival',
  from: A.from,
  to: A.to,
  moves: { paul: paul().segs, leto: leto().segs, jessica: jessica().segs },
  // Up at the bull's head as it comes up the wall: Paul from the lever, his father and mother from under it.
  looks: {
    paul: [[A.hall + 1.6, A.to + 0.3, -2.4]],
    leto: [[A.hall + 2.4, A.to + 0.3, -1.33]],
    jessica: [[A.hall + 2.9, A.to + 0.3, -0.9]],
  },
  shots,
  scope: [[OPENING.from, 1], [OPENING.to, 0]],
  pieces: ARRAKEEN,
  strikes: [
    ['the frigate comes down', A.descent[1]],
    ['and down', A.descent[2]],
    ['it stands on the field', A.touch],
    ['it settles; the hatch opens', A.settle],
    ['the ramp is down', A.ramp],
    ['the Duke comes out', A.leto],
    ['Jessica', A.jessica],
    ['Paul', A.paul],
    ['wide, the three before the palace', 122.46],
    ['the great hall', A.hall],
    ['Paul up onto the lever', A.up],
    ...A.pulls.map((t, i): [string, number] => [`step ${i + 1} on the lever: the head a notch up`, t]),
  ],
}

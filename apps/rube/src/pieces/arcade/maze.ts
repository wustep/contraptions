import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, trace, type Lane, type Pt } from '../../parts'
import { score, tube } from './neon'

/**
 * A tilting labyrinth two floors tall, stood on end in a frame on an axle
 * through its middle. The rail ends over the board's open top; the ball
 * rolls off it and drops onto the top ledge. The board is already
 * tilted, and it rolls along the ledge, faster and faster, off its end
 * through the gap and down onto the next; and the board tilts the other
 * way as it falls, so it rolls back along that one to the gap at its far
 * end, and down, and along, and down, to the floor of the board. Each
 * ledge lights as it is ridden. The board comes level as the ball crosses
 * the floor, and it rolls out of the gate in the wall onto the rail two
 * floors down, on the way it came or back, and the board tilts itself
 * ready for the next one.
 *
 * The board's tilt and the ball's place on it are one motion: the lane
 * traces the ball's spot on the board turned by the tilt, and the board is
 * drawn turned by the same tilt.
 */
export interface MazeState {
  color: string
  turn: 1 | -1
}

/** The board: its half width, its walls, its open top, its floor two floors down, and the axle through its middle. */
const HW = 0.32
const WALL = 0.04
const TOP = 0.24
const FLOOR_Y = 2 + FLOOR
const BOTTOM = FLOOR_Y + 0.06
const PIVOT: Pt = [0, (TOP + BOTTOM) / 2]
const LEDGE_T = 0.04
/** How far a ledge runs past the middle, leaving the gap on its other side; and where the ball's centre stops against a wall. */
const GAP_END = 0.03
const STOP = 0.17
/** How far the board tilts; show gravity for the drops, and the pace the ball gathers along a tilted ledge. */
const A = 0.12
const G = 10
const ACC = 2.5
/** The rail's end over the board, and where the ball lands on the top ledge, over on the far side. */
const EDGE: Pt = [-0.42, 0]
const LAND_X = 0.13
/** The frame's posts, either side of the board. */
const POST_X = 0.47
/** The board tilts itself ready again this long after the ball has left. */
const RESET = 1.4

interface Phase {
  t0: number
  t1: number
  /** The ball's spot on the board, unturned. */
  at: (t: number) => Pt
  /** The tilt at the phase's start and end, in units of A. */
  tilt0: number
  tilt1: number
}
interface Plan {
  ledges: { y: number; side: 1 | -1 }[]
  phases: Phase[]
  tIn: number
  tExit: number
  /** When the ball lands on each ledge, and on the floor. */
  lands: number[]
  /** Where it lands, in world cells, and how long the drop from the rail's end takes. */
  landAt: Pt
  dropIn: number
}

/** A point on the board turned by `theta` about the axle. */
function turned([x, y]: Pt, theta: number): Pt {
  const dx = x - PIVOT[0]
  const dy = y - PIVOT[1]
  return [PIVOT[0] + dx * Math.cos(theta) - dy * Math.sin(theta), PIVOT[1] + dx * Math.sin(theta) + dy * Math.cos(theta)]
}

/** The ball's way down the board for a `turn`: the top ledge hangs from the far wall, so four ledges to go out on and three to come back. */
function plan(turn: 1 | -1): Plan {
  const n = turn > 0 ? 4 : 3
  const ledges = Array.from({ length: n }, (_, i) => ({
    y: TOP + ((FLOOR_Y - TOP) * (i + 1)) / (n + 1) + 0.06,
    side: (i % 2 === 0 ? 1 : -1) as 1 | -1,
  }))
  const theta0 = -ledges[0].side * A
  const landAt = turned([LAND_X, ledges[0].y - R], theta0)
  const dropIn = Math.sqrt((2 * (landAt[1] - EDGE[1])) / G)
  const vEdge = (landAt[0] - EDGE[0]) / dropIn
  const phases: Phase[] = []
  const lands: number[] = []
  const tIn = (EDGE[0] + 0.5) / ((ROLL + vEdge) / 2) + dropIn
  let t = tIn
  let x = LAND_X
  for (let i = 0; i <= n; i++) {
    const y = (i < n ? ledges[i].y : FLOOR_Y) - R
    // The direction it rolls: away from the wall the ledge hangs on, or toward the gate on the floor.
    const d: 1 | -1 = i < n ? (-ledges[i].side as 1 | -1) : turn
    lands.push(t)
    const x0 = x
    if (i < n) {
      // Along the ledge, from rest, gathering pace down the tilt, until its centre is past the ledge's end.
      const x1 = d * (GAP_END + 0.03)
      const len = Math.abs(x1 - x0)
      const run = Math.sqrt((2 * len) / ACC)
      const t0 = t
      phases.push({ t0, t1: t0 + run, at: (tt) => [x0 + (x1 - x0) * Math.pow(Math.min(1, (tt - t0) / run), 2), y], tilt0: d, tilt1: d })
      t += run
      // Down through the gap to the next ledge, up against the wall, the board tilting the other way as it falls.
      const yNext = (i + 1 < n ? ledges[i + 1].y : FLOOR_Y) - R
      const drop = Math.sqrt((2 * (yNext - y)) / G)
      const t1 = t
      const xw = d * STOP
      const dNext = i + 1 < n ? -ledges[i + 1].side : turn
      phases.push({
        t0: t1,
        t1: t1 + drop,
        at: (tt) => {
          const f = Math.min(1, (tt - t1) / drop)
          return [x1 + (xw - x1) * Math.min(1, f * 2.2), y + (yNext - y) * f * f]
        },
        tilt0: d,
        tilt1: dNext,
      })
      t += drop
      x = xw
    } else {
      // Across the floor to the gate, the board coming level under it.
      const x1 = d * (HW + 0.02)
      const len = Math.abs(x1 - x0)
      const dur = len / 1.4
      const t0 = t
      phases.push({ t0, t1: t0 + dur, at: (tt) => [x0 + (x1 - x0) * Math.min(1, (tt - t0) / dur), y], tilt0: d, tilt1: 0 })
      t += dur
    }
  }
  return { ledges, phases, tIn, tExit: t, lands, landAt, dropIn }
}
const PLANS: Record<1 | -1, Plan> = { 1: plan(1), [-1]: plan(-1) }

/** The board's tilt at `t`: as the phase it is in has it, and tilting itself ready again after the ball has gone. */
function thetaAt(pl: Plan, t: number): number {
  const first = pl.phases[0]
  if (t <= first.t0) return first.tilt0 * A
  for (const ph of pl.phases) {
    if (t <= ph.t1) return (ph.tilt0 + (ph.tilt1 - ph.tilt0) * easeInOutSine(over(t, ph.t0, ph.t1))) * A
  }
  const since = t - pl.tExit
  return since < RESET ? 0 : first.tilt0 * A * easeInOutSine(over(since, RESET, RESET + 0.8))
}
/** The ball's spot on the board at `t`, unturned. */
function spotAt(pl: Plan, t: number): Pt {
  for (const ph of pl.phases) if (t <= ph.t1) return ph.at(t)
  return pl.phases[pl.phases.length - 1].at(t)
}
const ballAt = (pl: Plan, t: number): Pt => turned(spotAt(pl, t), thetaAt(pl, t))

export const maze = definePiece<MazeState>({
  name: 'maze',
  points: 200,
  weight: 0.9,
  place: ({ rng, color, fits }) => {
    for (const turn of rng.shuffle([1, -1] as const)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
        [0, 2],
      ]
      if (!fits(cells, [turn, 2])) continue
      const pl = PLANS[turn]
      const vEdge = (pl.landAt[0] - EDGE[0]) / pl.dropIn
      const gate: Pt = [turn * (HW + 0.02), 2]
      const lane: Lane = {
        segs: [
          ramp([-0.5, 0], EDGE, ROLL, vEdge),
          fly(EDGE, pl.landAt, pl.dropIn, (pl.landAt[1] - EDGE[1]) / 4),
          ...trace((t) => ballAt(pl, t), pl.tIn, pl.tExit, 60),
          ramp(gate, [turn * 0.5, 2], 1.4, ROLL),
        ],
        fire: pl.tExit,
      }
      return { cells, exit: { at: [turn, 2], dir: turn }, lane, state: { color, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const { turn } = s
    const pl = PLANS[turn]
    const theta = thetaAt(pl, t)

    // The rail in, ending over the board; the rail out from the gate; the frame's posts and the axle stubs into the board.
    rail(p, k, ink, weight, -0.5, EDGE[0])
    rail(p, k, ink, weight, turn * (HW + 0.02), turn * 0.5, 2 + FLOOR)
    for (const side of [-1, 1]) {
      post(p, k, ink, weight, side * POST_X, side < 0 ? FLOOR : 0.36, 2.5)
      const [ax, ay] = turned([side * HW, PIVOT[1]], theta)
      outline(p, ink, weight * 1.2)
      p.line(side * POST_X * k, PIVOT[1] * k, ax * k, ay * k)
    }
    // The board, turned about its axle.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(theta)
    p.translate(-PIVOT[0] * k, -PIVOT[1] * k)
    solid(p, ink, weight * 0.8, bg)
    p.rect(0, ((TOP + BOTTOM) / 2) * k, HW * 2 * k, (BOTTOM - TOP) * k, 0.01 * k)
    solid(p, ink, weight, s.color)
    // The walls: whole on the near side, and stopping short of the floor on the gate's side.
    const gateTop = FLOOR_Y - 0.3
    p.rect(-turn * (HW - WALL / 2) * k, ((TOP + BOTTOM) / 2) * k, WALL * k, (BOTTOM - TOP) * k, 0.008 * k)
    p.rect(turn * (HW - WALL / 2) * k, ((TOP + gateTop) / 2) * k, WALL * k, (gateTop - TOP) * k, 0.008 * k)
    p.rect(0, (FLOOR_Y + 0.03) * k, HW * 2 * k, 0.06 * k, 0.008 * k)
    // The ledges: each from its wall past the middle, lit from the moment the ball lands on it.
    pl.ledges.forEach((L, i) => {
      const x0 = L.side * (HW - WALL)
      const x1 = -L.side * GAP_END
      solid(p, ink, weight, s.color)
      p.rect(((x0 + x1) / 2) * k, (L.y + LEDGE_T / 2) * k, Math.abs(x1 - x0) * k, LEDGE_T * k, 0.008 * k)
      const lit = t < pl.lands[i] ? 0 : 1 - over(t - pl.lands[i], 0.6, 1.4)
      tube(p, k, ink, weight * 0.7, s.color, x0, L.y, x1, L.y, lit)
    })
    p.pop()
  },
  // Beside the gate, over the rail out: on the board it would lie across the ledges.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, s.turn * (HW + 0.3), 1.85, '+200', since, 1),
})

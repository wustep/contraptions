import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../src/core/ease'
import { FLOOR, ROLL, arrive, arriveAt, definePiece, rail, rankBy, roll, trace, type Lane, type Pt } from '../../../parts'
import { feltColor, ivory } from './hall'

/**
 * An accordion stood on end with its bellows drawn right out, a floor or
 * two tall, its upper end level with the rail. The ball rolls out onto
 * that end and stops; the bellows take the weight and sigh shut under it,
 * every fold closing at once, slowly at first and cushioned at the last,
 * and the ball goes down with them. The side it is to leave by closes home
 * first, so the end it stands on tips that way for a moment, and the ball
 * rolls off it onto the rail below, on or back. The far side closes after
 * it. The accordion stays shut.
 *
 * The end's height and tilt are one function of the piece's clock; the
 * ball's seat on it is traced from the same, so it never leaves the wood
 * until it rolls off the edge.
 */
export interface AccordionState {
  color: string
  floors: number
  turn: 1 | -1
}

/** Half the instrument's width; how thick each wooden end is; the folds in the bellows. */
const HALF = 0.35
const END = 0.14
const FOLDS = 7
const PLEAT = 0.06
/** The ball stops on the end, the bellows take the weight, and then they go. */
const T_ON = arriveAt(0)
const SETTLE = 0.14
const sinkTime = (floors: number) => 0.75 + 0.55 * floors
/** How far the far side hangs back near the bottom, and how long the ball takes to roll off the tilted end. */
const LAG = 0.075
const ROLL_OFF = (2 * HALF) / ROLL
const roll0 = (floors: number) => T_ON + SETTLE + sinkTime(floors) - 0.2
const leave = (floors: number) => roll0(floors) + ROLL_OFF

/** How far the leaving side of the upper end has sunk at `t`, and how far the far side hangs back above it. */
function sunk(floors: number, t: number): number {
  const s = clamp((t - T_ON - SETTLE) / sinkTime(floors))
  // The weight coming on dips it a little before the air begins to go.
  const dip = 0.03 * clamp((t - T_ON + 0.05) / 0.12) * (1 - s)
  return dip + floors * easeInOutSine(s)
}
function lag(floors: number, t: number): number {
  const up = clamp((t - (roll0(floors) - 0.15)) / 0.3)
  const down = clamp((t - leave(floors) - 0.05) / 0.5)
  return LAG * easeInOutSine(up) * (1 - easeInOutSine(down))
}
/** The ball on the end: standing at its middle, then rolling off the side that is down. */
function seat(floors: number, turn: 1 | -1, t: number): Pt {
  const u = clamp((t - roll0(floors)) / ROLL_OFF)
  const x = turn * HALF * u * u
  return [x, sunk(floors, t) - (lag(floors, t) * (HALF - turn * x)) / (2 * HALF)]
}

function laneFor(floors: number, turn: 1 | -1): Lane {
  return {
    segs: [...arrive([-0.5, 0], [0, 0]), ...trace((t) => seat(floors, turn, t), T_ON, leave(floors), 48), roll([turn * HALF, floors], [turn * 0.5, floors], ROLL)],
    fire: T_ON + SETTLE,
  }
}

export const accordion = definePiece<AccordionState>({
  name: 'accordion',
  weight: 1,
  place: ({ rng, color, fits, theme, ball }) => {
    const options = [1, 2].flatMap((floors) => ([1, -1] as const).map((turn) => ({ floors, turn })))
    for (const { floors, turn } of rankBy(rng, options, () => 1)) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: turn }, lane: laneFor(floors, turn), state: { color: feltColor(theme, color, ball.color), floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight, theme }) => {
    const { floors, turn } = s
    const ground = floors + 0.5
    // The two sides of the upper end's top: the leaving side, and the far side hanging back above it.
    const lead = FLOOR + sunk(floors, t)
    const far = lead - lag(floors, t)
    const yOf = (x: number) => lead + ((far - lead) * (HALF - turn * x)) / (2 * HALF)
    const tilt = Math.atan2(yOf(HALF) - yOf(-HALF), 2 * HALF)

    // The rail in, the rail out, and the floor the instrument stands on.
    rail(p, k, ink, weight, -0.5, -HALF - 0.015)
    rail(p, k, ink, weight, turn * (HALF + 0.015), turn * 0.5, floors + FLOOR)
    outline(p, ink, weight)
    p.line(-0.46 * k, ground * k, 0.46 * k, ground * k)

    // The bellows: pale cloth between the two ends, one pleat a fold, each side as tall as that side stands.
    const foot = ground - END
    const side = (x: number, sgn: number): Pt[] => {
      const top = yOf(x) + END
      const pts: Pt[] = []
      for (let i = 0; i <= FOLDS * 2; i++) pts.push([x - sgn * (i % 2 ? PLEAT : 0), top + ((foot - top) * i) / (FOLDS * 2)])
      return pts
    }
    const west = side(-HALF, -1)
    const east = side(HALF, 1)
    solid(p, ink, weight, ivory(theme))
    p.beginShape()
    for (const [x, y] of west) p.vertex(x * k, y * k)
    for (const [x, y] of [...east].reverse()) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    // A crease across at every fold's peak, while there is room to see one.
    if ((foot - lead - END) / FOLDS > 0.05) {
      outline(p, ink, weight * 0.6)
      for (let i = 2; i < FOLDS * 2; i += 2) p.line(west[i][0] * k, west[i][1] * k, east[i][0] * k, east[i][1] * k)
    }

    // The lower end on the floor, and the upper end the ball stands on.
    solid(p, ink, weight, s.color)
    p.rect(0, (ground - END / 2) * k, (2 * HALF + 0.04) * k, END * k, 0.025 * k)
    p.push()
    p.translate(0, (yOf(0) + END / 2) * k)
    p.rotate(tilt)
    p.rect(0, 0, (2 * HALF + 0.04) * k, END * k, 0.025 * k)
    // Its keyboard, seen from the front: a strip of ivory and the black keys on it.
    solid(p, ink, weight * 0.7, ivory(theme))
    p.rect(0, 0.012 * k, 0.56 * k, 0.078 * k, 0.008 * k)
    p.fill(ink)
    p.noStroke()
    for (let i = 0; i < 6; i++) if (i !== 2) p.rect((-0.2 + i * 0.08) * k, -0.004 * k, 0.04 * k, 0.046 * k)
    p.pop()
  },
})

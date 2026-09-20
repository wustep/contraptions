import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, arrive, arriveAt, definePiece, fly, over, post, rail, ramp, rankBy, trace, wait, type Lane, type Pt } from '../../../parts'

/**
 * A mousetrap, the size of a bench, with a spoon lashed to its hammer. The
 * hammer is held back against its spring by the hold-down bar, which lies
 * over its shaft with its tip under a catch, and the spoon's bowl lies at
 * the rail's end. The ball rolls into the bowl; its weight eases the bar,
 * whose tip creeps out from under the catch, slips, and is thrown up; and
 * the hammer snaps over, the ball
 * leaving the bowl part way round, on the hammer's own tangent at the
 * hammer's own pace, in a high arc: over a gap to the rail beyond, or, off
 * a stiffer spring and let go sooner, up onto a shelf a floor above. The
 * hammer slaps the far end of the board and the whole trap jumps.
 *
 * The hammer turns under a steady torque, so its angle goes as the square
 * of the time; where the ball leaves, how fast, and where a ball thrown so
 * comes down under the piece's gravity are worked out from that, and the
 * landing stands where the sum says.
 */
type Throw = 'over' | 'up'

/** The hammer's pivot, the spring's coil; its length to the bowl's middle; the board. */
const PIVOT: Pt = [0.34, 0.2]
const ARM = 0.58
const BOARD: [number, number] = [-0.4, 0.98]
const BOARD_Y = 0.24
const G = 22
/** Set, the hammer stands this far up off the board, so the bowl's middle is on the ball's line. */
const SET = Math.asin(PIVOT[1] / ARM)
const SEAT: Pt = [PIVOT[0] - ARM * Math.cos(SET), 0]
const ARRIVE = arriveAt(SEAT[0])
/** The hold-down bar: its staple at the board's near end, the catch its tip is under, and how it lies while it holds. */
const HINGE: Pt = [-0.34, BOARD_Y]
const CATCH: Pt = [0.07, 0.01]
const BAR = Math.hypot(CATCH[0] - HINGE[0], CATCH[1] - HINGE[1])
const HELD = Math.atan2(CATCH[1] - HINGE[1], CATCH[0] - HINGE[0])
/** The bar's tip creeps out from under the catch and slips this long after the ball beds down. */
const TENSE = 0.34
const FIRE = ARRIVE + TENSE

interface Plan {
  lane: Lane
  /** The spring's torque over the hammer's inertia, and how far round the ball is let go. */
  torque: number
  swept: number
  land: Pt
  cells: Pt[]
  exit: Pt
  end: number
}

/** The hammer's angle up from the board's near end, `since` seconds after the bar slips: round to the far end of the board, and a bounce off it. */
function hammerAt(plan: Plan, since: number): number {
  if (since <= 0) return SET
  const a = SET + plan.torque * since * since
  if (a < Math.PI) return a
  const u = since - Math.sqrt((Math.PI - SET) / plan.torque)
  return Math.PI - 0.22 * Math.exp(-u * 9) * Math.abs(Math.sin(u * 17))
}

const tipAt = (a: number): Pt => [PIVOT[0] - ARM * Math.cos(a), PIVOT[1] - ARM * Math.sin(a)]

function planFor(kind: Throw): Plan {
  const torque = kind === 'over' ? 60 : 258
  const swept = kind === 'over' ? 0.5 : 0.2
  const floor = kind === 'over' ? 0 : -1
  const ride = Math.sqrt(swept / torque)
  const off = tipAt(SET + swept)
  // Let go on the tangent at the hammer's pace: up and on.
  const pace = ARM * 2 * torque * ride
  const vx = pace * Math.sin(SET + swept)
  const vy = -pace * Math.cos(SET + swept)
  // Down to the landing's height under the piece's gravity.
  const drop = floor - off[1]
  const air = (-vy + Math.sqrt(vy * vy + 2 * G * drop)) / G
  const land: Pt = [off[0] + vx * air, floor]
  const end = 2.5
  const partial = { torque, swept, land, end, cells: [], exit: [0, 0] as Pt, lane: { segs: [], fire: 0 } } satisfies Plan
  const lane: Lane = {
    segs: [
      ...arrive([-0.5, 0], SEAT),
      wait(SEAT, TENSE),
      ...trace((u) => tipAt(hammerAt(partial, u)), 0, ride, 8),
      fly(off, land, air, (G * air * air) / 8),
      ramp(land, [end, floor], Math.max(ROLL, Math.min(vx, 4.4)), ROLL),
    ],
    fire: FIRE,
  }
  const cells: Pt[] =
    kind === 'over'
      ? [[0, 0], [1, 0], [2, 0], [0, -1], [1, -1]]
      : [[0, 0], [1, 0], [0, -1], [1, -1], [2, -1]]
  return { ...partial, lane, cells, exit: kind === 'over' ? [3, 0] : [3, -1] }
}

const PLANS: Record<Throw, Plan> = { over: planFor('over'), up: planFor('up') }

export const mousetrap = definePiece<{ color: string; kind: Throw }>({
  name: 'mousetrap',
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits }) => {
    for (const kind of rankBy(rng, ['over', 'up'] as const, () => 1)) {
      const plan = PLANS[kind]
      if (!fits(plan.cells, plan.exit)) continue
      return { cells: plan.cells, exit: { at: plan.exit, dir: 1 }, lane: plan.lane, state: { color, kind } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const plan = PLANS[s.kind]
    const slam = Math.sqrt((Math.PI - SET) / plan.torque)
    // The slap jumps the whole trap off its feet, and it rattles down.
    const u = since - slam
    const jump = u <= 0 ? 0 : 0.07 * Math.exp(-u * 7) * Math.abs(Math.sin(u * 13))
    const a = hammerAt(plan, since)

    // The rail in; the landing, on its own post, with a pad where the ball comes down.
    rail(p, k, ink, weight, -0.5, SEAT[0] - 0.2)
    post(p, k, ink, weight, -0.46)
    const floor = plan.land[1]
    rail(p, k, ink, weight, plan.land[0] - 0.22, plan.end, floor + FLOOR)
    post(p, k, ink, weight, plan.end - 0.12, floor + FLOOR, floor + 0.5)
    const landed = plan.lane.segs.slice(0, -1).reduce((sum, seg) => sum + seg.dur, 0)
    const squash = t < landed ? 0 : 1 - over(t, landed, landed + 0.3)
    solid(p, ink, weight, s.color)
    p.rect(plan.land[0] * k, (floor + FLOOR + 0.05 + squash * 0.015) * k, 0.3 * k, (0.07 - squash * 0.03) * k, 0.015 * k)

    p.push()
    p.translate(0, -jump * k)
    // The board, on two battens, and the staple the bar is hinged on at its near end.
    outline(p, ink, weight)
    for (const x of [BOARD[0] + 0.12, BOARD[1] - 0.12]) p.line(x * k, (BOARD_Y + 0.1) * k, x * k, 0.5 * k)
    solid(p, ink, weight, bg)
    p.rect(((BOARD[0] + BOARD[1]) / 2) * k, (BOARD_Y + 0.05) * k, (BOARD[1] - BOARD[0]) * k, 0.1 * k, 0.015 * k)

    // The catch: a hooked post the bar's tip is under. The ball's weight on the spoon eases the bar and its tip creeps out.
    outline(p, ink, weight)
    p.line(CATCH[0] * k, BOARD_Y * k, CATCH[0] * k, (CATCH[1] - 0.03) * k)
    p.line(CATCH[0] * k, (CATCH[1] - 0.03) * k, (CATCH[0] - 0.05) * k, (CATCH[1] - 0.03) * k)
    // The hold-down bar: hinged on a staple at the board's near end, over the hammer's shaft, to the catch. Slipped,
    // the shaft throws it up past upright, and with the hammer gone it falls forward and lies along the board.
    const creep = t < ARRIVE || since >= 0 ? 0 : over(t, ARRIVE, FIRE)
    const tremble = 0.02 * creep * Math.sin(t * 80)
    const thrown = since < 0 ? 0 : since < 0.1 ? 1.35 * over(since, 0, 0.1) : since < 0.3 ? 1.35 : 1.35 - (1.35 - HELD) * Math.min(1, ((since - 0.3) / 0.32) ** 2)
    const settle = since < 0.62 ? 0 : 0.12 * Math.exp(-(since - 0.62) * 9) * Math.abs(Math.sin((since - 0.62) * 16))
    p.push()
    p.translate(HINGE[0] * k, HINGE[1] * k)
    p.rotate(HELD - thrown - settle + tremble)
    outline(p, ink, weight)
    p.line(0, 0, (BAR - 0.035 * creep) * k, 0)
    p.pop()

    // The hammer: a bar from the coil to the bowl, and the coil.
    const tip = tipAt(a)
    outline(p, ink, weight * 1.5)
    p.line(PIVOT[0] * k, PIVOT[1] * k, (tip[0] + Math.cos(a) * (R + 0.02)) * k, (tip[1] + Math.sin(a) * (R + 0.02)) * k)
    solid(p, ink, weight, s.color)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.13 * k)
    p.pop()
  },
  over: (p, s, { k, since, ink, weight }) => {
    // The spoon's bowl, in front of the ball: round-bottomed, its hollow to the way the hammer turns.
    const plan = PLANS[s.kind]
    const slam = Math.sqrt((Math.PI - SET) / plan.torque)
    const u = since - slam
    const jump = u <= 0 ? 0 : 0.07 * Math.exp(-u * 7) * Math.abs(Math.sin(u * 13))
    const a = hammerAt(plan, since)
    const tip = tipAt(a)
    p.push()
    p.translate(tip[0] * k, (tip[1] - jump) * k)
    p.rotate(a)
    solid(p, ink, weight, s.color)
    p.arc(0, 0.02 * k, (2 * R + 0.1) * k, (2 * R + 0.08) * k, 0, Math.PI, p.CHORD)
    p.pop()
  },
})

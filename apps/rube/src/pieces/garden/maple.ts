import { outline } from '../../../../../src/core/draw'
import { easeInQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, over, post, rail, ramp, rankBy, roll, trace, type Lane, type Pt } from '../../parts'
import { leaf, soil, tuft } from './green'

/**
 * A sapling behind the rail's end, and on a twig of it one big leaf held
 * out level with the rail like a diving board. The ball rolls out onto
 * the leaf and stops in its middle; the leaf bows under it, the stalk
 * creaks — and snaps. Leaf and ball come down the way a leaf falls: a swoop
 * to one side, a stall, a swoop back, rocking with each one, a floor or
 * two, until the leaf slides in onto the rail below and the ball rolls off
 * the end of it the way the last swoop was going — on, or back the way it
 * came. The leaf stays where it fell, and the twig keeps the stub.
 *
 * A falling leaf swings like a pendulum whose pivot is sinking, and the
 * ball rides it like a seat on a swing: pressed onto the leaf along the
 * leaf's own normal, so it never slides off a leaf that is tilted under it.
 * Lane and leaf come from the one motion.
 */
export interface MapleState {
  color: string
  floors: number
  turn: 1 | -1
}

/** The sapling's trunk, the twig's end where the stalk joins it, and the leaf's length. */
const TRUNK = -0.34
const BASE: Pt = [-0.24, FLOOR + 0.02]
const LEAF = 0.5
/** How far the ball's centre stands off the leaf's midrib. */
const UP = R + 0.02
/** The bow before the snap, radians, tip down. */
const BOW = 0.13
const SEAT_X = BASE[0] + LEAF / 2
const SLOW_FROM = SEAT_X - 0.16
const ARRIVE = (SLOW_FROM + 0.5) / ROLL + 0.16 / (ROLL / 2)
const CREAK = 0.32
const FIRE = ARRIVE + CREAK
/** Two swoops a floor; how wide they are, how much the leaf lifts at the end of each, and how far it rocks. */
const SWING = 0.22
const LIFT = 0.1
const ROCK = 0.5
const fallTime = (floors: number) => 0.5 + 0.85 * floors
/** The leaf lies this much above the rail it lands on. */
const LIES = 0.02
const SLIDE = 0.2

/** The leaf at piece time `t`: the middle of its midrib, and its tilt (tip down is positive). */
function leafAt(t: number, floors: number, turn: 1 | -1): { c: Pt; tilt: number } {
  const bow = t < ARRIVE ? 0 : BOW * easeInQuad(over(t, ARRIVE, FIRE))
  if (t < FIRE) return { c: [BASE[0] + (LEAF / 2) * Math.cos(bow), BASE[1] + (LEAF / 2) * Math.sin(bow)], tilt: bow }
  const fall = fallTime(floors)
  // Away slowly, as the stalk gives, and at a steady pace from there.
  const f = Math.min(1, (t - FIRE) / fall)
  const u = 2 * f * f - f * f * f
  const phi = u * floors * 2 * Math.PI
  const from: Pt = [BASE[0] + (LEAF / 2) * Math.cos(BOW), BASE[1] + (LEAF / 2) * Math.sin(BOW)]
  const to: Pt = [0, floors + FLOOR - LIES]
  // After the fall it slides a little way along the rail, the way it was going, and stops.
  const slid = turn * 0.06 * (1 - Math.pow(1 - over(t, FIRE + fall, FIRE + fall + SLIDE), 2))
  return {
    c: [lerp(from[0], to[0], u) + turn * SWING * Math.sin(phi) + slid, lerp(from[1], to[1], u) - LIFT * Math.pow(Math.sin(phi), 2)],
    tilt: BOW * (1 - over(u, 0, 0.12)) - turn * ROCK * Math.sin(phi) * (1 - 0.5 * u),
  }
}

/** The ball on the leaf: over the middle of the midrib, off it along the leaf's normal. */
function ballAt(t: number, floors: number, turn: 1 | -1): Pt {
  const { c, tilt } = leafAt(t, floors, turn)
  return [c[0] + UP * Math.sin(tilt), c[1] - UP * Math.cos(tilt)]
}

export const maple = definePiece<MapleState>({
  name: 'maple',
  weight: 1,
  place: ({ rng, color, fits, taste }) => {
    const deep = taste.weights['drop-deep'] ?? 1
    const options = rng.shuffle([1, 2].flatMap((floors) => [1, -1].map((turn) => ({ floors, turn: turn as 1 | -1 }))))
    for (const { floors, turn } of rankBy(rng, options, (o) => Math.pow(deep, o.floors - 1))) {
      const cells: Pt[] = []
      for (let i = 0; i <= floors; i++) cells.push([0, i])
      const exit: Pt = [turn, floors]
      if (!fits(cells, exit)) continue
      const fall = fallTime(floors)
      const at = (t: number) => ballAt(t, floors, turn)
      const down = trace(at, FIRE, FIRE + fall, 28 * floors)
      const last = down[down.length - 1]
      const vOff = Math.hypot(last.to[0] - last.from[0], last.to[1] - last.from[1]) / last.dur
      const lane: Lane = {
        segs: [
          roll([-0.5, 0], [SLOW_FROM, 0], ROLL),
          ramp([SLOW_FROM, 0], [SEAT_X, 0], ROLL, 0),
          ...trace(at, ARRIVE, FIRE, 6),
          ...down,
          ramp(last.to, [turn * 0.5, floors], vOff, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: exit, dir: turn }, lane, state: { color, floors, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const { floors, turn } = s
    const { c, tilt } = leafAt(t, floors, turn)
    const sway = 0.012 * Math.sin(t * 1.7)

    // The rail in, to the twig; the rail below, and its ground.
    rail(p, k, ink, weight, -0.5, BASE[0] - 0.02)
    const x0 = turn > 0 ? -0.36 : -0.5
    const x1 = turn > 0 ? 0.5 : 0.36
    rail(p, k, ink, weight, x0, x1, floors + FLOOR)
    post(p, k, ink, weight, turn > 0 ? x0 + 0.02 : x1 - 0.02, floors + FLOOR, floors + 0.5)
    soil(p, k, ink, weight, -0.5, 0.5, floors + 0.5)
    tuft(p, k, ink, weight, turn * 0.34, floors + 0.5, 0.1, 0.03)

    // The sapling: a slender trunk from the ground below up past the rail, a few small leaves at its top, and the twig.
    outline(p, ink, weight * 1.5)
    p.noFill()
    p.bezier(TRUNK * k, (floors + 0.5) * k, (TRUNK - 0.03) * k, (floors * 0.6) * k, (TRUNK + 0.03) * k, 0.1 * k, (TRUNK + 0.02 + sway) * k, -0.34 * k)
    leaf(p, k, ink, weight, s.color, TRUNK + 0.02 + sway, -0.33, 0.17, -1.2, 0.45)
    leaf(p, k, ink, weight, s.color, TRUNK + 0.01 + sway, -0.24, 0.15, -2.5, 0.45)
    leaf(p, k, ink, weight, s.color, TRUNK + 0.015 + sway * 0.6, -0.13, 0.14, -0.55, 0.45)
    outline(p, ink, weight * 1.2)
    p.line((TRUNK + 0.01) * k, (BASE[1] + 0.08) * k, (BASE[0] - 0.03) * k, BASE[1] * k)
    // The stalk: whole until it snaps, a stub on the twig after.
    p.line((BASE[0] - 0.03) * k, BASE[1] * k, (BASE[0] + (since < 0 ? 0.03 : -0.005)) * k, (BASE[1] + (since < 0 ? 0 : -0.012)) * k)

    // The leaf: from its stalk end along its midrib, wherever it is.
    const bx = c[0] - (LEAF / 2) * Math.cos(tilt)
    const by = c[1] - (LEAF / 2) * Math.sin(tilt)
    leaf(p, k, ink, weight, s.color, bx, by, LEAF, tilt, 0.3)
    if (since > 0) {
      outline(p, ink, weight)
      p.line(bx * k, by * k, (bx - 0.035 * Math.cos(tilt)) * k, (by - 0.035 * Math.sin(tilt)) * k)
    }

    // The snap: a crack of lines at the stalk.
    if (since > 0 && since < 0.2) {
      const f = over(since, 0, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-2.3, -1.6, -0.9]) {
        p.line((BASE[0] + Math.cos(a) * (0.06 + 0.05 * f)) * k, (BASE[1] + Math.sin(a) * (0.06 + 0.05 * f)) * k, (BASE[0] + Math.cos(a) * (0.11 + 0.08 * f)) * k, (BASE[1] + Math.sin(a) * (0.11 + 0.08 * f)) * k)
      }
      p.pop()
    }
  },
})

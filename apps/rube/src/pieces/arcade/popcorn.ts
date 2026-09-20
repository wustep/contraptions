import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'
import { glow, score, tube } from './neon'

/**
 * A popcorn cart. A glass case with an open top stands on a cart on two
 * wheels; inside it a kettle sits on its element with a few kernels in the
 * bottom of the case from the last batch. The rail runs in through the
 * case's side onto a chute that climbs to a tip over the kettle; the ball
 * slows up the chute, rolls off the tip and drops into the kettle, out of
 * sight. The element lights, the kettle shakes, and kernels burst up out
 * of it, white, and rain down into the case; then the ball comes up with
 * them, out of the kettle and out of the open top in a spray of popcorn,
 * high over the case and down onto the shelf a floor up, where it lands
 * and rolls on. The popcorn lies where it fell.
 */
export interface PopcornState {
  color: string
  kernels: Kernel[]
}
/** A kernel: where it pops from, how fast forward and up, when, and where it comes to lie. */
interface Kernel {
  x0: number
  vx: number
  vy: number
  at: number
  landX: number
  landY: number
}

/** The case, and the cart under it. */
const CASE = { x0: -0.34, x1: 0.34, top: -0.42, bottom: 0.38 }
/** The case's uprights, in the colour, like a bezel. */
const POST_W = 0.05
const CART = { y0: 0.38, y1: 0.44 }
const WHEEL = 0.05
/** The chute: from the case's wall up to its tip over the kettle. */
const WALL: Pt = [CASE.x0 + POST_W, 0]
const TIP: Pt = [-0.14, -0.08]
const V_TIP = 0.8
/** The kettle: its rim, its bottom, how wide; the element under it. */
const RIM = 0.06
const KETTLE_BOTTOM = 0.36
const KETTLE_W = 0.32
const ELEMENT_Y = KETTLE_BOTTOM + 0.012
/** The shelf a floor up, and where the ball comes down on it. */
const SHELF0 = 0.2
const LAND: Pt = [0.32, -1]
const HEAT = 0.7
/** Show gravity for the pop, and how high it goes. */
const G = 12
const POP_ARC = 1.0
const POP = Math.sqrt((8 * POP_ARC) / G)
/** Off the tip at the chute's pace, falling into the kettle: where it lands is where the kettle is. */
const DROP = Math.sqrt((2 * (KETTLE_BOTTOM - 0.02 - R - TIP[1])) / 10)
const SEAT: Pt = [TIP[0] + V_TIP * DROP, KETTLE_BOTTOM - 0.02 - R]
const KX = SEAT[0]
const T_WALL = (WALL[0] + 0.5) / ROLL
const CLIMB = ramp(WALL, TIP, ROLL, V_TIP)
const T_SEAT = T_WALL + CLIMB.dur + DROP
const T_POP = T_SEAT + HEAT
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], WALL, ROLL),
    CLIMB,
    fly(TIP, SEAT, DROP, (SEAT[1] - TIP[1]) / 4),
    wait(SEAT, HEAT, { hidden: true }),
    fly(SEAT, LAND, POP, POP_ARC),
    fly(LAND, [LAND[0] + 0.05, -1], 0.04, 0.01),
    ramp([LAND[0] + 0.05, -1], [0.5, -1], 1.2, ROLL),
  ],
  fire: T_POP,
}
const KG = 10
const KERNEL = 0.024

/** Where a kernel is at `t`: still in the kettle, in the air, or lying where it came down. */
function kernelAt(q: Kernel, t: number): Pt | null {
  const s = t - q.at
  if (s <= 0) return null
  const y0 = SEAT[1] - 0.04
  const T = (-q.vy + Math.sqrt(q.vy * q.vy + 2 * KG * (q.landY - y0))) / KG
  if (s >= T) return [q.landX, q.landY]
  const f = s / T
  return [q.x0 + (q.landX - q.x0) * f, y0 + q.vy * s + (KG / 2) * s * s]
}

function kettle(p: p5, k: number, ink: string, weight: number, color: string, bg: string, shake: number): void {
  solid(p, ink, weight, bg)
  p.rect((KX + shake) * k, ((RIM + KETTLE_BOTTOM) / 2) * k, KETTLE_W * k, (KETTLE_BOTTOM - RIM) * k, 0.01 * k, 0.01 * k, 0.06 * k, 0.06 * k)
  // The rim: a lip in the colour, a shade wider.
  solid(p, ink, weight, color)
  p.rect((KX + shake) * k, (RIM + 0.015) * k, (KETTLE_W + 0.04) * k, 0.035 * k, 0.008 * k)
}

export const popcorn = definePiece<PopcornState>({
  name: 'popcorn',
  points: 100,
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const kernels: Kernel[] = []
    const inside = (x: number) => Math.max(CASE.x0 + 0.05, Math.min(CASE.x1 - 0.05, x))
    // The ones that burst while it heats stay in the case.
    for (let i = 0; i < 9; i++) {
      const vx = (rng.next() - 0.5) * 1.6
      const vy = -(1.5 + 1.3 * rng.next())
      const x0 = KX + (rng.next() - 0.5) * 0.16
      const landY = CASE.bottom - KERNEL
      const T = (-vy + Math.sqrt(vy * vy + 2 * KG * (landY - SEAT[1] + 0.04))) / KG
      kernels.push({ x0, vx, vy, at: T_SEAT + 0.1 + i * 0.06, landX: inside(x0 + vx * T), landY })
    }
    // The spray that comes up with the ball goes out of the top and comes down round the cart.
    for (let i = 0; i < 6; i++) {
      const vx = (rng.next() - 0.5) * 2.6
      const vy = -(3.6 + 1.4 * rng.next())
      const x0 = KX + (rng.next() - 0.5) * 0.16
      let landY = 0.5 - KERNEL
      let T = (-vy + Math.sqrt(vy * vy + 2 * KG * (landY - SEAT[1] + 0.04))) / KG
      let landX = x0 + vx * T
      if (Math.abs(landX) < CASE.x1 + 0.04) {
        landY = CASE.bottom - KERNEL
        T = (-vy + Math.sqrt(vy * vy + 2 * KG * (landY - SEAT[1] + 0.04))) / KG
        landX = inside(x0 + vx * T)
      }
      kernels.push({ x0, vx, vy, at: T_POP, landX: Math.max(-0.47, Math.min(0.47, landX)), landY })
    }
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color, kernels } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const heat = t < T_SEAT ? 0 : 1 - over(t, T_POP + 0.3, T_POP + 1.2)

    // The rail in, and the shelf a floor up on its post, clear of the cart.
    rail(p, k, ink, weight, -0.5, CASE.x0 + POST_W)
    rail(p, k, ink, weight, SHELF0, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, 0.44, -1 + FLOOR, 0.5)
    // The cart: a body on two wheels, with the case standing on it.
    solid(p, ink, weight, s.color)
    p.rect(0, ((CART.y0 + CART.y1) / 2) * k, 0.78 * k, (CART.y1 - CART.y0) * k, 0.01 * k)
    for (const x of [-0.26, 0.26]) {
      solid(p, ink, weight, bg)
      p.circle(x * k, (0.5 - WHEEL) * k, WHEEL * 2 * k)
      p.fill(ink)
      p.noStroke()
      p.circle(x * k, (0.5 - WHEEL) * k, 0.03 * k)
    }
    // The case: a dark window between two uprights in the colour, open at the top, the lane's doorway cut in the near one.
    solid(p, ink, weight * 0.8, bg)
    p.rect(0, ((CASE.top + CASE.bottom) / 2) * k, (CASE.x1 - CASE.x0 - POST_W) * k, (CASE.bottom - CASE.top) * k)
    solid(p, ink, weight, s.color)
    p.rect((CASE.x0 + POST_W / 2) * k, ((CASE.top - 0.19) / 2) * k, POST_W * k, (-0.19 - CASE.top) * k, 0.01 * k)
    p.rect((CASE.x0 + POST_W / 2) * k, ((FLOOR + 0.02 + CASE.bottom) / 2) * k, POST_W * k, (CASE.bottom - FLOOR - 0.02) * k, 0.01 * k)
    p.rect((CASE.x1 - POST_W / 2) * k, ((CASE.top + CASE.bottom) / 2) * k, POST_W * k, (CASE.bottom - CASE.top) * k, 0.01 * k)
    // The chute: up from the wall to the tip, a radius under the ball's line.
    const under = R * Math.hypot(1, (TIP[1] - WALL[1]) / (TIP[0] - WALL[0]))
    solid(p, ink, weight, s.color)
    p.quad(WALL[0] * k, FLOOR * k, TIP[0] * k, (TIP[1] + under) * k, TIP[0] * k, (TIP[1] + under + 0.05) * k, WALL[0] * k, (FLOOR + 0.05) * k)
    // The element under the kettle, lit while it works, and the kettle's heat on the glass behind.
    glow(p, k, s.color, KX, 0.22, 0.24, heat)
    tube(p, k, ink, weight, s.color, KX - 0.15, ELEMENT_Y, KX + 0.15, ELEMENT_Y, heat)
  },
  over: (p, s, { k, t, ink, bg, weight }) => {
    // The kettle stands in front of the ball: it goes in, and comes out of the top.
    const heating = t > T_SEAT && t < T_POP
    kettle(p, k, ink, weight, s.color, bg, heating ? 0.008 * Math.sin(t * 55) : 0)
    // The popcorn: white, small, in the air and where it lies.
    p.noStroke()
    p.fill(ink)
    for (const q of s.kernels) {
      const at = kernelAt(q, t)
      if (!at) continue
      p.circle(at[0] * k, at[1] * k, KERNEL * 2 * k)
      p.circle((at[0] + 0.014) * k, (at[1] - 0.01) * k, KERNEL * 1.3 * k)
    }
  },
  // Beside the case, over the cart's near end: the pop goes up the far side.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, -0.2, -0.5, '+100', since, 1),
})

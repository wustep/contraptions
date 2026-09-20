import { solid } from '../../../../../src/core/draw'
import { FLOOR, ROLL, burst, definePiece, fly, over, post, rail, ramp, rankBy, roll, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from './sea'

/**
 * A breakwater. The pier stands on a heap of big rounded boulders two
 * floors high, and at its end the heap steps down into the sea. The ball
 * runs off the deck's end and tumbles down the face: onto the crown of
 * the first boulder, off that down onto the second, off that the other
 * way down onto the last, which lies awash and throws up a splash, and
 * off that up onto the landing stage at the water's edge, where it rolls
 * on, or on along a longer stage. A knock off each dry boulder. Nothing
 * here moves but the ball and the water.
 */
export interface BreakwaterState {
  color: string
  /** How far the landing stage runs: to the cell's edge, or a cell further. */
  long: boolean
}

/** The deck's end above, and the stage below. */
const WEST = -0.2
const STAGE_X0 = 0.16
/** The boulders the ball meets: crowns the ball comes down on. And the rest of the heap. */
const B1 = { x: 0.05, y: 0.5, r: 0.25 }
const B2 = { x: 0.3, y: 1.22, r: 0.22 }
const B3 = { x: -0.02, y: 2.55, r: 0.26 }
const HEAP: { x: number; y: number; r: number }[] = [
  { x: -0.3, y: 0.52, r: 0.25 },
  { x: -0.3, y: 1.0, r: 0.25 },
  { x: -0.04, y: 0.98, r: 0.17 },
  { x: -0.32, y: 1.5, r: 0.25 },
  { x: -0.32, y: 2.0, r: 0.25 },
  { x: -0.06, y: 1.62, r: 0.16 },
  { x: 0.4, y: 1.82, r: 0.18 },
  { x: 0.36, y: 2.52, r: 0.2 },
  { x: -0.34, y: 2.5, r: 0.22 },
]
/** Where the ball comes down on each crown, and where it lands on the stage. */
const HIT1: Pt = [B1.x, B1.y - B1.r - 0.13]
const HIT2: Pt = [B2.x - 0.04, B2.y - B2.r - 0.12]
const HIT3: Pt = [B3.x + 0.02, B3.y - B3.r - 0.12]
const LAND: Pt = [STAGE_X0 + 0.16, 2]

const T_EDGE = (WEST + 0.5) / ROLL
const FALL = 0.11
const FIRE = T_EDGE + FALL
const HOP1 = 0.3
const HOP2 = 0.4
const HOP3 = 0.28
const T_HIT2 = FIRE + HOP1
const T_HIT3 = T_HIT2 + HOP2

function laneTo(end: number): Lane {
  return {
    segs: [
      roll([-0.5, 0], [WEST, 0], ROLL),
      fly([WEST, 0], HIT1, FALL, HIT1[1] / 4),
      fly(HIT1, HIT2, HOP1, 0.09),
      fly(HIT2, HIT3, HOP2, 0.08),
      fly(HIT3, LAND, HOP3, 0.3),
      fly(LAND, [LAND[0] + 0.06, 2], 0.05, 0.012),
      ramp([LAND[0] + 0.06, 2], [end, 2], 1.7, ROLL),
    ],
    fire: FIRE,
  }
}
const LANES = { short: laneTo(0.5), long: laneTo(1.5) }

export const breakwater = definePiece<BreakwaterState>({
  name: 'breakwater',
  weight: 0.9,
  place: ({ rng, color, fits, theme, ball }) => {
    for (const long of rankBy(rng, [false, true], () => 1)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
        [0, 2],
      ]
      if (long) cells.push([1, 2])
      const exit: Pt = [long ? 2 : 1, 2]
      if (!fits(cells, exit)) continue
      return { cells, exit: { at: exit, dir: 1 }, lane: long ? LANES.long : LANES.short, state: { color: bodyColor(theme, color, ball.color), long } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight, theme }) => {
    const sea = seaWater(theme)
    const x1 = s.long ? 1.5 : 0.5

    // The deck above, standing on the heap; the sea two floors down, and the stage at its edge.
    rail(p, k, ink, weight, -0.5, WEST)
    post(p, k, ink, weight, -0.4, FLOOR, HEAP[0].y - HEAP[0].r + 0.04)
    seabed(p, k, ink, weight, -0.5, x1, 2.5)
    // The heap: every boulder one rounded shape, the ones the ball meets among them.
    solid(p, ink, weight, s.color)
    for (const b of [...HEAP, B1, B2, B3]) {
      p.push()
      p.translate(b.x * k, b.y * k)
      p.beginShape()
      const n = 18
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const rr = b.r * (1 + 0.05 * Math.sin(a * 3 + b.x * 7) + 0.03 * Math.cos(a * 5 + b.y * 3))
        p.vertex(Math.cos(a) * rr * 1.1 * k, Math.sin(a) * rr * 0.92 * k)
      }
      p.endShape(p.CLOSE)
      p.pop()
    }
    // The stage: a deck at the water's edge, its near end on the awash boulder, its far end on a piling.
    rail(p, k, ink, weight, STAGE_X0, x1, 2 + FLOOR)
    piling(p, k, ink, weight, 0.4, 2 + FLOOR, 2.5)
    if (s.long) piling(p, k, ink, weight, 1.2, 2 + FLOOR, 2.5)
    // The sea in front of the heap's foot.
    water(p, k, ink, weight, -0.5, x1, 2 + WATER)

    // The knocks off the dry boulders, and the splash off the awash one.
    for (const [hit, at] of [
      [HIT1, FIRE],
      [HIT2, T_HIT2],
    ] as const) {
      const f = over(t, at, at + 0.2)
      if (f <= 0 || f >= 1) continue
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      burst(p, hit[0] * k, (hit[1] + 0.1) * k, (0.06 + 0.08 * f) * k, (0.1 + 0.1 * f) * k, 4, 2.9)
      p.pop()
    }
    splash(p, k, sea, weight, B3.x + 0.04, 2 + WATER, over(t, T_HIT3, T_HIT3 + 0.5), 1)
  },
})

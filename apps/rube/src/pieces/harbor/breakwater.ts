import { solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, burst, definePiece, fly, over, post, rail, ramp, rankBy, roll, type Lane, type Pt } from '../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from './sea'

/**
 * A breakwater. The pier stands on a heap of big rounded boulders two
 * floors high, a steep face to the sea. The ball runs off the deck's end
 * and tumbles down the face: down the shoulder of the first boulder, off
 * that down onto the shoulder of one that stands out further, off that
 * down onto the last, which lies awash at the heap's foot and throws up a
 * splash, and off that up onto the landing stage at the water's edge,
 * where it rolls on, or on along a longer stage. A knock off each dry
 * boulder. Nothing here moves but the ball and the water.
 *
 * Where the ball meets a boulder is that boulder's own outline, a ball's
 * radius out along the normal, so it knocks on the stone and never falls
 * through one: each stands out past the one above, and the ball goes down
 * the open side of all three.
 */
export interface BreakwaterState {
  color: string
  /** How far the landing stage runs: to the cell's edge, or a cell further. */
  long: boolean
}

interface Boulder {
  x: number
  y: number
  r: number
}
/** A boulder is a little wider than it is tall. */
const WIDE = 1.1
const TALL = 0.92
/** The ball's centre when it rests on boulder `b`, `deg` round from its crown toward the sea. */
function touch(b: Boulder, deg: number): Pt {
  const a = (deg * Math.PI) / 180
  const nx = Math.sin(a)
  const ny = -Math.cos(a)
  const h = Math.hypot(b.r * WIDE * nx, b.r * TALL * ny)
  return [b.x + ((b.r * WIDE) ** 2 * nx) / h + nx * (R + 0.006), b.y + ((b.r * TALL) ** 2 * ny) / h + ny * (R + 0.006)]
}

/** The deck's end above, and the stage below. */
const WEST = -0.2
const STAGE_X0 = 0.26
/** The boulders the ball meets, the last of them awash. And the rest of the heap: courses of a big stone over two small ones, so it reads as rubble and not a string of beads. */
const B1: Boulder = { x: -0.285, y: 0.39, r: 0.18 }
const B2: Boulder = { x: -0.265, y: 1.3, r: 0.2 }
const B3: Boulder = { x: 0.01, y: 2 + WATER - 0.07 + 0.2 * TALL, r: 0.2 }
const HEAP: Boulder[] = [
  { x: -0.389, y: 0.7, r: 0.095 },
  { x: -0.215, y: 0.715, r: 0.11 },
  { x: -0.305, y: 0.97, r: 0.165 },
  { x: -0.394, y: 1.62, r: 0.09 },
  { x: -0.225, y: 1.64, r: 0.115 },
  { x: -0.3, y: 1.9, r: 0.17 },
  { x: -0.394, y: 2.18, r: 0.09 },
  { x: -0.22, y: 2.2, r: 0.12 },
  { x: -0.325, y: 2.45, r: 0.15 },
]
/** Where the ball comes down on each, and where it lands on the stage. */
const HIT1 = touch(B1, 62)
const HIT2 = touch(B2, 66)
const HIT3 = touch(B3, 14)
const LAND: Pt = [STAGE_X0 + 0.06, 2]

const T_EDGE = (WEST + 0.5) / ROLL
const FALL = 0.125
const FIRE = T_EDGE + FALL
const HOP1 = 0.325
const HOP2 = 0.36
const HOP3 = 0.28
const T_HIT2 = FIRE + HOP1
const T_HIT3 = T_HIT2 + HOP2

function laneTo(end: number): Lane {
  return {
    segs: [
      roll([-0.5, 0], [WEST, 0], ROLL),
      fly([WEST, 0], HIT1, FALL, 0.012),
      fly(HIT1, HIT2, HOP1, 0.17),
      fly(HIT2, HIT3, HOP2, 0.21),
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

    // The deck above, standing on the heap; the sea two floors down, and the stage at its edge on its pilings.
    rail(p, k, ink, weight, -0.5, WEST)
    post(p, k, ink, weight, -0.4, FLOOR, B1.y - B1.r * TALL + 0.06)
    rail(p, k, ink, weight, STAGE_X0, x1, 2 + FLOOR)
    piling(p, k, ink, weight, STAGE_X0 + 0.06, 2 + FLOOR, 2.5)
    if (s.long) piling(p, k, ink, weight, 1.2, 2 + FLOOR, 2.5)
    // The heap: every boulder one rounded shape, the ones the ball meets in front; its foot is in the bed of the sea.
    p.push()
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.beginPath()
    ctx.rect(-0.6 * k, -0.5 * k, 1.4 * k, 3 * k)
    ctx.clip()
    solid(p, ink, weight, s.color)
    for (const b of [...HEAP, B1, B2, B3]) {
      p.push()
      p.translate(b.x * k, b.y * k)
      p.beginShape()
      const n = 18
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const rr = b.r * (1 + 0.03 * Math.sin(a * 3 + b.x * 7) + 0.02 * Math.cos(a * 5 + b.y * 3))
        p.vertex(Math.cos(a) * rr * WIDE * k, Math.sin(a) * rr * TALL * k)
      }
      p.endShape(p.CLOSE)
      p.pop()
    }
    p.pop()
    seabed(p, k, ink, weight, -0.5, x1, 2.5)
    // The sea in front of the heap's foot.
    water(p, k, ink, weight, -0.5, x1, 2 + WATER)

    // The knocks off the dry boulders, where the ball met them, and the splash off the awash one.
    for (const [hit, at] of [
      [HIT1, FIRE],
      [HIT2, T_HIT2],
    ] as const) {
      const f = over(t, at, at + 0.2)
      if (f <= 0 || f >= 1) continue
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight * (1 - f))
      burst(p, (hit[0] - 0.1) * k, (hit[1] + 0.06) * k, (0.06 + 0.08 * f) * k, (0.1 + 0.1 * f) * k, 4, 2.9)
      p.pop()
    }
    splash(p, k, sea, weight, HIT3[0], 2 + WATER, over(t, T_HIT3, T_HIT3 + 0.5), 1)
  },
})

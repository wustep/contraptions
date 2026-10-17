import { solid } from '../../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, over, post, rail, ramp, rankBy, roll, type Lane, type Pt } from '../../../parts'
import { WATER, bodyColor, piling, seaWater, seabed, splash, water } from '../../../pieces/harbor/sea'

/**
 * A breakwater. The pier stands on a heap of big rounded boulders two
 * floors high, a steep face to the sea. The ball runs off the deck's end
 * and tumbles down the face: down the shoulder of the first boulder, off
 * that down onto the shoulder of one that stands out further, off that
 * down onto the last, which lies awash at the heap's foot and throws up a
 * splash, and off that up onto the landing stage at the water's edge,
 * where it rolls on, or on along a longer stage. Nothing here moves but
 * the ball and the water.
 *
 * Where the ball meets a boulder is that boulder's own outline, a ball's
 * radius out along the normal, so it knocks on the stone and never falls
 * through one: each stands out past the one above, and the ball goes down
 * the open side of all three. Every hop is a parabola under one gravity,
 * and each knock takes most of the ball's way off it, so it goes down the
 * face and not out over the sea.
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

/** The deck's end above, over the crown of the top boulder, and the stage below. */
const WEST = -0.26
const STAGE_X0 = 0.26
/**
 * The boulders the ball meets, each standing out to sea past the one above it, the last awash. And the rest of
 * the heap behind them: a few big stones, each resting on the ones below, the biggest at the foot, so it reads
 * as a mound and not a string of beads.
 */
const B1: Boulder = { x: -0.24, y: 0.5, r: 0.2 }
const B2: Boulder = { x: -0.12, y: 1.3, r: 0.22 }
const B3: Boulder = { x: 0.06, y: 2 + WATER - 0.13 + 0.24 * TALL, r: 0.24 }
const HEAP: Boulder[] = [
  { x: -0.28, y: 0.9, r: 0.22 },
  { x: -0.42, y: 1.36, r: 0.15 },
  { x: -0.25, y: 1.72, r: 0.23 },
  { x: -0.3, y: 2.2, r: 0.3 },
]

/** One gravity for every hop: a hop's rise over its chord is what its time makes it. */
const G = 22
const hop = (from: Pt, to: Pt, dur: number) => fly(from, to, dur, (G * dur * dur) / 8)

/** Where the ball comes down on each, and where it lands on the stage. Off the deck's end it falls from a level start. */
const HIT1 = touch(B1, 45)
const HIT2 = touch(B2, 50)
const HIT3 = touch(B3, 30)
const LAND: Pt = [STAGE_X0 + 0.08, 2]

const T_EDGE = (WEST + 0.5) / ROLL
const FALL = Math.sqrt((2 * HIT1[1]) / G)
const FIRE = T_EDGE + FALL
const HOP1 = 0.34
const HOP2 = 0.44
const HOP3 = 0.28
const T_HIT2 = FIRE + HOP1
const T_HIT3 = T_HIT2 + HOP2

function laneTo(end: number): Lane {
  return {
    segs: [
      roll([-0.5, 0], [WEST, 0], ROLL),
      hop([WEST, 0], HIT1, FALL),
      hop(HIT1, HIT2, HOP1),
      hop(HIT2, HIT3, HOP2),
      hop(HIT3, LAND, HOP3),
      ramp(LAND, [end, 2], 0.8, ROLL),
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
  draw: (p, s, { k, t, ink, bg, weight, theme }) => {
    const sea = seaWater(theme)
    const x1 = s.long ? 1.5 : 0.5

    // The deck above, standing on the heap; the sea two floors down, and the stage at its edge on its pilings.
    rail(p, k, ink, weight, -0.5, WEST)
    post(p, k, ink, weight, -0.42, FLOOR, B1.y - 0.09)
    rail(p, k, ink, weight, STAGE_X0, x1, 2 + FLOOR)
    piling(p, k, ink, weight, STAGE_X0 + 0.1, 2 + FLOOR, 2.5)
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
    water(p, k, ink, bg, weight, -0.5, x1, 2 + WATER)

    // The splash off the awash one.
    splash(p, k, sea, weight, HIT3[0], 2 + WATER, over(t, T_HIT3, T_HIT3 + 0.5), 1)
  },
})

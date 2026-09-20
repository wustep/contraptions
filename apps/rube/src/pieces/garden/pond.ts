import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, rail, ramp, roll, trace, type Lane, type Pt, type Seg } from '../../parts'
import { gardenWater, soil, tuft } from './green'

/**
 * A lily pool across three cells of the path: a raised pool between two
 * stone walls, brim-full, with three lily pads afloat on it in a row, their
 * tops level with the path, and a water lily open between two of them. The
 * ball hops off the near wall onto the first pad, which ducks under it and
 * tips toward it — down at the edge it came onto, level as it crosses the
 * middle, down again at the edge it leaves by — and hops the open water to
 * the next, and the next, and up onto the far wall. Each pad bobs up as it
 * is let go and rocks itself still, and the water's line runs a ripple out
 * from it both ways, as far as the walls and no farther.
 *
 * A pad's tilt is set by where the ball is on it and its duck by how long
 * the ball has been there, so the ball's lane over a pad is the pad's own
 * top under it, and the ball never leaves the leaf.
 */
/** The walls' inner faces; the water between them, just under the pads' tops. */
const BANK_L = -0.37
const BANK_R = 2.37
const WATER = FLOOR + 0.05
/** The pads: their centres, half-width, and how thick they look from a little above. */
const XS = [0.06, 1.0, 1.94]
const HW = 0.33
const PAD_H = 0.11
/** How far a pad ducks under the ball, the bounce it lands with, and how far it tips with the ball at its edge. */
const DUCK = 0.05
const BOUNCE = 0.035
const TILT = 0.16
/** The ball rides a pad from this far in from one edge to this far in from the other; its pace; how high it hops the gaps. */
const IN = 0.07
const V = 2.4
const HOP = 0.05

interface Ride {
  on: number
  off: number
  x0: number
}
const RIDES: Ride[] = []

/** How far pad `i` is ducked `tau` seconds after the ball landed on it. */
const duck = (tau: number): number => DUCK + BOUNCE * Math.exp(-tau * 9) * Math.cos(tau * 24)

/** The ball on pad `i` at piece time `t`. */
function onPad(i: number, t: number): Pt {
  const r = RIDES[i]
  const x = r.x0 + V * (t - r.on)
  return [x, FLOOR - R + duck(t - r.on) + (TILT * (x - XS[i]) * (x - XS[i])) / HW]
}

const LANE: Lane = (() => {
  const segs: Seg[] = [roll([-0.5, 0], [BANK_L, 0], ROLL)]
  let t = segs[0].dur
  let from: Pt = [BANK_L, 0]
  XS.forEach((cx, i) => {
    const x0 = cx - HW + IN
    const x1 = cx + HW - IN
    const hop = (x0 - from[0]) / V
    const ride: Ride = { on: t + hop, off: t + hop + (x1 - x0) / V, x0 }
    RIDES.push(ride)
    segs.push(fly(from, onPad(i, ride.on), hop, i ? HOP : HOP / 2))
    const across = trace((tt) => onPad(i, tt), ride.on, ride.off, 12)
    segs.push(...across)
    from = across[across.length - 1].to
    t = ride.off
  })
  segs.push(fly(from, [BANK_R, 0], (BANK_R - from[0]) / V, HOP), ramp([BANK_R, 0], [2.5, 0], V, ROLL))
  return { segs, fire: RIDES[1].on }
})()

/** Pad `i`'s tilt and duck at piece time `t`: level and afloat, set by the ball while it is on it, bobbing up and rocking itself still after. */
function padAt(i: number, t: number): { tilt: number; sink: number } {
  const r = RIDES[i]
  if (t < r.on) return { tilt: 0, sink: 0 }
  if (t <= r.off) {
    const x = r.x0 + V * (t - r.on)
    return { tilt: (TILT * (x - XS[i])) / HW, sink: duck(t - r.on) }
  }
  const tau = t - r.off
  const fade = Math.exp(-tau * 3)
  return { tilt: ((TILT * (HW - IN)) / HW) * fade * Math.cos(tau * 8), sink: duck(r.off - r.on) * fade * Math.cos(tau * 11) }
}

/**
 * The water's line at `x`, piece time `t`: level, but for a ripple that
 * runs out both ways from each pad when the ball lands on it, fading as it
 * goes.
 */
function waterAt(x: number, t: number): number {
  let y = WATER
  for (let i = 0; i < XS.length; i++) {
    const tau = t - RIDES[i].on
    if (tau <= 0 || tau > 1.6) continue
    const out = Math.abs(x - XS[i]) - HW
    const front = 0.9 * tau
    if (out < 0 || out > front) continue
    y -= 0.022 * Math.exp(-tau * 2.4) * Math.sin((front - out) * 22) * Math.min(1, (front - out) / 0.08)
  }
  return y
}

export const pond = definePiece<{ color: string; water: string }>({
  name: 'pond',
  weight: 1,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    const water = gardenWater(theme, ball.color)
    // The pads are never the water's colour, or they would be under it.
    const pads = color !== water ? color : rng.pick(theme.colors.filter((c) => c !== water && c !== ball.color)) ?? color
    return { cells, exit: { at: [3, 0], dir: 1 }, lane: LANE, state: { color: pads, water } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // The path in and out, and the ground either side of the pool.
    rail(p, k, ink, weight, -0.5, BANK_L - 0.1)
    rail(p, k, ink, weight, BANK_R + 0.1, 2.5)
    soil(p, k, ink, weight, -0.5, BANK_L - 0.1)
    soil(p, k, ink, weight, BANK_R + 0.1, 2.5)

    // The water: from its line, rippling, down to the pool's floor.
    const n = 120
    p.noStroke()
    p.fill(s.water)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = BANK_L + ((BANK_R - BANK_L) * i) / n
      p.vertex(x * k, waterAt(x, t) * k)
    }
    p.vertex(BANK_R * k, 0.5 * k)
    p.vertex(BANK_L * k, 0.5 * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = BANK_L + ((BANK_R - BANK_L) * i) / n
      p.vertex(x * k, waterAt(x, t) * k)
    }
    p.endShape()
    p.line(BANK_L * k, 0.5 * k, BANK_R * k, 0.5 * k)

    // The walls that hold it up level with the path: stone, with a coping the path runs onto.
    for (const x of [BANK_L - 0.05, BANK_R + 0.05]) {
      solid(p, ink, weight, bg)
      p.rect(x * k, ((FLOOR + 0.5) / 2 + 0.02) * k, 0.1 * k, (0.5 - FLOOR - 0.04) * k)
      p.rect(x * k, (FLOOR + 0.03) * k, 0.15 * k, 0.06 * k, 0.015 * k)
    }
    tuft(p, k, ink, weight, BANK_L - 0.12, 0.5, 0.11, -0.03)
    tuft(p, k, ink, weight, BANK_R + 0.13, 0.5, 0.1, 0.03)

    // The water lily, open between the second pad and the third, behind the ball as it hops over.
    const x = (XS[1] + XS[2]) / 2
    lily(p, k, ink, weight, bg, x, waterAt(x, t) + 0.01)

    // The pads: each a leaf seen from a little above, tilting and ducking with the ball.
    XS.forEach((cx, i) => {
      const { tilt, sink } = padAt(i, t)
      p.push()
      p.translate(cx * k, (FLOOR + PAD_H / 2 + sink) * k)
      p.rotate(tilt)
      solid(p, ink, weight, s.color)
      p.ellipse(0, 0, HW * 2 * k, PAD_H * k)
      p.pop()
    })
  },
})

/** A water lily afloat at (x, y): three petals in a cup, the middle one in front. */
function lily(p: p5, k: number, ink: string, weight: number, petal: string, x: number, y: number): void {
  p.push()
  p.translate(x * k, y * k)
  solid(p, ink, weight, petal)
  for (const a of [-0.7, 0.7, 0]) {
    p.push()
    p.rotate(a)
    p.beginShape()
    p.vertex(0, 0)
    p.bezierVertex(-0.07 * k, -0.04 * k, -0.045 * k, -0.13 * k, 0, -0.165 * k)
    p.bezierVertex(0.045 * k, -0.13 * k, 0.07 * k, -0.04 * k, 0, 0)
    p.endShape(p.CLOSE)
    p.pop()
  }
  p.pop()
}

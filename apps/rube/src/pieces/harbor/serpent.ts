import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, laneAt, laneReach, rail, roll, type Lane, type Pt, type Seg } from '../../parts'
import { aboveWater } from './creatures'
import { WATER, piling, seaColor, water } from './sea'

/**
 * Here be monsters. The deck stops over open water, and all there is to
 * see is the top of a head at the far side, an eye on the ball. As the
 * ball reaches the deck's end a sea serpent's coils come up out of the
 * water ahead of it, one after another, and it rolls over them — up each
 * hump and down into the gap before the next — while they go under again
 * behind it: a wave of serpent that travels with the ball. The head rises
 * last, the ball rolls up the back of its neck, over its crown and down
 * its snout onto the far deck, and the head sinks back to its eye and
 * watches it go. The ball never stops.
 *
 * The serpent is a tube round one line, and the ball's path is worked out
 * from that same line: where a ball that size actually rests on a body
 * that thick, bridging from one coil to the next, not the back's shape
 * moved up a radius.
 */

/** The near deck's end and the far deck's start. */
const E0 = -0.31
const E1 = 1.25
/** The coils: their spacing, the crown of the head — the last crest — and the snout's tip. */
const LAMBDA = 0.36
const CROWN = 1.04
const NECK = CROWN - LAMBDA / 2
const X0 = CROWN - 3.5 * LAMBDA
const SNOUT = 1.23
/** Half the body's thickness. */
const H = 0.058
/** The body's line: this far down in the dips between coils — under water — and up to here at a crest. */
const DIP = 0.45
const CREST = 0.06 + H
/** How round the coils' tops are: under 1 is rounder than a cosine. */
const ROUND = 0.6
/** Sunk: where the line lies when a coil is under. */
const UNDER = WATER + 0.12
/** The head at rest shows this much of its rise — the crown and the eye — and sinks this far when it is all the way down. */
const REST = 0.3
const HEAD_DROP = 0.3

/** The body's line at `x`, fully risen: a run of arches. */
function spine(x: number): number {
  const c = Math.cos((Math.PI * (x - CROWN)) / LAMBDA)
  return DIP - (DIP - CREST) * Math.pow(Math.abs(c), ROUND)
}

/** The brow: the head's top from the crown down to the snout, which lies at the deck's height. */
const brow = (x: number): number => CREST - H + (FLOOR - 0.005 - (CREST - H)) * easeInOutSine(clamp((x - CROWN) / (SNOUT - CROWN)))

/** The ball's centre when it is over `x`: as low as it can go without sinking into the decks, the coils or the head. */
function restAt(x: number): number {
  let y = Infinity
  const reach = R + H
  for (let u = x - reach; u <= x + reach; u += 0.002) {
    const d = Math.abs(x - u)
    // The decks and the brow are lines the ball rests a radius above; the body is a line it rests a radius and half a body above.
    if (d <= R && (u <= E0 || u >= E1)) y = Math.min(y, FLOOR - Math.sqrt(R * R - d * d))
    if (d <= R && u > CROWN && u <= SNOUT) y = Math.min(y, brow(u) - Math.sqrt(R * R - d * d))
    if (u >= X0 && u <= CROWN) y = Math.min(y, spine(u) - Math.sqrt(Math.max(0, reach * reach - d * d)))
  }
  return y
}

/** The ride: from the near deck's end to the far deck, a little under the rail's pace, quicker down in the gaps and slower over the crests. */
function ride(): Seg[] {
  const x1 = E1 + 0.03
  const n = Math.round((x1 - E0) / 0.02)
  const segs: Seg[] = []
  let from: Pt = [E0, 0]
  for (let i = 1; i <= n; i++) {
    const x = E0 + ((x1 - E0) * i) / n
    const to: Pt = [x, i === n ? 0 : restAt(x)]
    const ease = Math.min(1, (x - E0) / 0.2, (x1 - x) / 0.2)
    const v = ROLL - 0.45 * ease + 4 * ((from[1] + to[1]) / 2) * ease
    segs.push({ from, to, dur: Math.hypot(to[0] - from[0], to[1] - from[1]) / v })
    from = to
  }
  return segs
}

const LANE: Lane = { segs: [roll([-0.5, 0], [E0, 0], ROLL), ...ride(), roll([E1 + 0.03, 0], [1.5, 0], ROLL)], fire: 0 }
LANE.fire = laneReach(LANE, CROWN - 3 * LAMBDA)
const SPAN = LANE.segs.reduce((sum, s) => sum + s.dur, 0)

/** Where the ball is along the piece at `t`, before it arrives and after it has gone as well. */
const ballX = (t: number): number => (t < 0 ? -0.5 + t * ROLL : t > SPAN ? 1.5 + (t - SPAN) * ROLL : laneAt(LANE, t).x)

/** How far out of the water the serpent is at `x` when the ball is at `bx`: all the way under it, not at all far ahead or behind. */
const risen = (x: number, bx: number): number => easeInOutSine(clamp((0.66 - Math.abs(x - bx)) / 0.3))

export const serpent = definePiece<{ color: string }>({
  name: 'serpent',
  weight: 0.9,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: seaColor(theme, color) } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const bx = ballX(t)
    const by = t < 0 || t > SPAN ? 0 : laneAt(LANE, t).y
    const up = Math.max(REST, risen(CROWN, bx))
    const sunk = (1 - up) * HEAD_DROP

    rail(p, k, ink, weight, -0.5, E0)
    rail(p, k, ink, weight, E1, 1.5)
    piling(p, k, ink, weight, E0 - 0.08)
    piling(p, k, ink, weight, E1 + 0.08)

    // Everything of the serpent is cut off at the waterline: what is under the sea here is not seen.
    p.push()
    aboveWater(p, k, -0.5, 1.5)

    // A length of body along a line: ink, the colour inside it, and a pale stripe along the belly, the inside of every arch.
    const tube = (pts: Pt[]) => {
      p.noFill()
      for (const [color, w, off] of [
        [ink, 2 * H * k + weight, 0],
        [s.color, 2 * H * k - weight, 0],
        [bg, weight * 1.1, H * 0.5],
      ] as [string, number, number][]) {
        p.stroke(color)
        p.strokeWeight(w)
        p.beginShape()
        pts.forEach(([x, y], i) => {
          const [ax, ay] = pts[Math.max(0, i - 1)]
          const [cx, cy] = pts[Math.min(pts.length - 1, i + 1)]
          const len = Math.hypot(cx - ax, cy - ay) || 1
          p.vertex((x - ((cy - ay) / len) * off) * k, (y + ((cx - ax) / len) * off) * k)
        })
        p.endShape()
      }
    }

    // The coils: one body, up where the ball is and under everywhere else.
    const coils: Pt[] = []
    for (let x = X0 - 0.06; x <= NECK + 0.001; x += 0.012) coils.push([x, lerp(UNDER, spine(x), risen(x, bx))])
    tube(coils)

    // The head and neck, one stiff piece that rises and sinks.
    p.push()
    p.translate(0, sunk * k)
    const neck: Pt[] = []
    for (let x = NECK; x <= CROWN - 0.035; x += 0.012) neck.push([x, spine(x)])
    // The head: its top is the line the ball rolls down, from the back of the crown over the brow to the snout.
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let x = CROWN - 0.085; x <= CROWN + 0.001; x += 0.012) p.vertex(x * k, (spine(x) - H) * k)
    for (let x = CROWN; x <= SNOUT + 0.001; x += 0.015) p.vertex(x * k, brow(x) * k)
    p.bezierVertex((SNOUT + 0.022) * k, FLOOR * k, (SNOUT + 0.022) * k, (FLOOR + 0.09) * k, (SNOUT - 0.03) * k, (FLOOR + 0.095) * k)
    p.bezierVertex((CROWN + 0.08) * k, (FLOOR + 0.12) * k, (CROWN - 0.02) * k, (FLOOR + 0.15) * k, (CROWN - 0.075) * k, (FLOOR + 0.12) * k)
    p.endShape(p.CLOSE)
    tube(neck)
    // The mouth, a nostril, and the eye, which never leaves the ball.
    outline(p, ink, weight * 0.8)
    p.bezier((SNOUT + 0.012) * k, (FLOOR + 0.05) * k, (SNOUT - 0.03) * k, (FLOOR + 0.06) * k, (CROWN + 0.11) * k, (FLOOR + 0.07) * k, (CROWN + 0.075) * k, (FLOOR + 0.04) * k)
    p.noStroke()
    p.fill(ink)
    p.circle((SNOUT - 0.022) * k, (FLOOR + 0.016) * k, 0.014 * k)
    const ex = CROWN + 0.035
    const ey = CREST - H + 0.068
    solid(p, ink, weight * 0.8, bg)
    p.circle(ex * k, ey * k, 0.085 * k)
    const look = Math.atan2(by - (ey + sunk), bx - ex)
    p.noStroke()
    p.fill(ink)
    p.circle((ex + Math.cos(look) * 0.018) * k, (ey + Math.sin(look) * 0.018) * k, 0.036 * k)
    p.pop()
    p.pop()

    // The sea, over where the serpent goes into it, and the water it lifts: a ring round every coil that is coming up or going down, and round the head.
    water(p, k, ink, weight, -0.5, 1.5)
    p.push()
    p.noFill()
    p.stroke(s.color)
    for (let i = 1; i <= 3; i++) {
      const c = CROWN - i * LAMBDA
      const r = risen(c, bx)
      if (r < 0.04 || r > 0.96) continue
      p.strokeWeight(weight * 0.9 * Math.sin(r * Math.PI))
      p.ellipse(c * k, (WATER + 0.04) * k, (0.24 + 0.2 * r) * k, (0.03 + 0.03 * r) * k)
    }
    p.strokeWeight(weight * 0.9 * (up > REST + 0.01 ? Math.sin(Math.min(1, up) * Math.PI) : 0.55))
    if (up < 0.96) p.ellipse((CROWN + 0.04) * k, (WATER + 0.04) * k, (0.34 + 0.1 * up) * k, 0.045 * k)
    p.pop()
  },
})

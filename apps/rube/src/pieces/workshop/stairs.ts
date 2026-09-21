import { outline } from '../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, roll, type Lane, type Pt, type Seg } from '../../parts'

/**
 * A flight of stairs. The rail ends at the first lip and the ball goes down
 * them the way a ball does — off each lip, a hop, a tap on the next tread,
 * a short roll to its lip — four steps down to the rail a floor below. No
 * mechanism; the rhythm is the beat.
 */
const STEPS = 4
const TREAD = 0.2
const RISE = 1 / STEPS
/** The block's west edge, and the first lip: the top tread is the rail itself. */
const TOP = -0.46
const FIRST = -0.3
/** Each hop lands this far past the lip it left, then rolls the rest of the tread. */
const LAND = 0.15
const HOP = 0.15
const SKIP = 0.04

export const stairs = definePiece<{ color: string; taps: number[] }>({
  name: 'stairs',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    const segs: Seg[] = [roll([-0.5, 0], [FIRST, 0], ROLL)]
    const taps: number[] = []
    let t = segs[0].dur
    for (let i = 0; i < STEPS; i++) {
      const lip = FIRST + i * TREAD
      const y = i * RISE
      // Off the lip with a little bounce, down onto the next tread, and a skip to its lip.
      segs.push(fly([lip, y], [lip + LAND, y + RISE], HOP, 0.1))
      t += HOP
      taps.push(t)
      if (i < STEPS - 1) {
        segs.push(fly([lip + LAND, y + RISE], [lip + TREAD, y + RISE], SKIP, 0.012))
        t += SKIP
      }
    }
    const foot = FIRST + (STEPS - 1) * TREAD + LAND
    segs.push(ramp([foot, 1], [0.5, 1], Math.hypot(LAND, RISE) / HOP, ROLL))
    const lane: Lane = { segs, fire: taps[STEPS - 1] }
    return { cells, exit: { at: [1, 1], dir: 1 }, lane, state: { color, taps } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, FIRST)
    // The staircase: one block of colour, with the profile, the foot of
    // the last leg, the ground and the west edge drawn once in ink.
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    p.vertex(TOP * k, FLOOR * k)
    for (let i = 0; i < STEPS; i++) {
      const lip = FIRST + i * TREAD
      p.vertex(lip * k, (i * RISE + FLOOR) * k)
      p.vertex(lip * k, ((i + 1) * RISE + FLOOR) * k)
    }
    p.vertex(0.5 * k, (1 + FLOOR) * k)
    p.vertex(0.5 * k, 1.5 * k)
    p.vertex(TOP * k, 1.5 * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.beginShape()
    p.vertex(FIRST * k, FLOOR * k)
    for (let i = 0; i < STEPS; i++) {
      const lip = FIRST + i * TREAD
      p.vertex(lip * k, (i * RISE + FLOOR) * k)
      p.vertex(lip * k, ((i + 1) * RISE + FLOOR) * k)
    }
    p.vertex(0.5 * k, (1 + FLOOR) * k)
    p.vertex(0.5 * k, 1.5 * k)
    p.vertex(TOP * k, 1.5 * k)
    p.vertex(TOP * k, FLOOR * k)
    p.endShape()
    // A tap mark where the ball has just landed.
    for (let i = 0; i < STEPS; i++) {
      const f = 1 - over(t, s.taps[i], s.taps[i] + 0.25)
      if (f <= 0 || t < s.taps[i]) continue
      const x = FIRST + i * TREAD + LAND
      const y = (i + 1) * RISE + FLOOR
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-2.4, -0.7]) {
        const r0 = 0.08 + 0.1 * (1 - f)
        p.line((x + Math.cos(a) * r0) * k, (y + Math.sin(a) * r0) * k, (x + Math.cos(a) * (r0 + 0.05)) * k, (y + Math.sin(a) * (r0 + 0.05)) * k)
      }
      p.pop()
    }
  },
})

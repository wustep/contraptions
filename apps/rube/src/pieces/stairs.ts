import { outline, solid } from '../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fly, over, rail, roll, type Lane, type Pt, type Seg } from '../parts'

/**
 * A flight of stairs. The rail ends at the top step and the ball goes down
 * them the way a ball does — off each lip, a hop, a tap on the next tread,
 * off the next lip — four steps down to the rail a floor below. No
 * mechanism; the rhythm is the beat.
 */
const STEPS = 4
const TREAD = 0.2
const RISE = 1 / STEPS
const TOP = -0.34
const HOP = 0.15
const TAP = 0.06

export const stairs = definePiece<{ color: string; taps: number[] }>({
  name: 'stairs',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    const segs: Seg[] = [roll([-0.5, 0], [TOP, 0], ROLL)]
    const taps: number[] = []
    let t = segs[0].dur
    for (let i = 0; i < STEPS; i++) {
      const x = TOP + i * TREAD
      const y = i * RISE
      // Off the lip on a parabola that starts level, land short of the next lip, and a tap up to it.
      segs.push(fly([x, y], [x + TREAD - 0.05, y + RISE], HOP, 0.06))
      segs.push(fly([x + TREAD - 0.05, y + RISE], [x + TREAD, y + RISE], TAP, 0.015))
      t += HOP
      taps.push(t)
      t += TAP
    }
    segs.push(roll([TOP + STEPS * TREAD, 1], [0.5, 1], ROLL * 1.2, 'out'))
    const lane: Lane = { segs, fire: taps[STEPS - 1] }
    return { cells, exit: { at: [1, 1], dir: 1 }, lane, state: { color, taps } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    rail(p, k, ink, weight, -0.5, TOP)
    // The staircase: one block of colour with the profile cut into it.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(TOP * k, FLOOR * k)
    for (let i = 0; i < STEPS; i++) {
      const x = TOP + i * TREAD
      p.vertex((x + TREAD) * k, (i * RISE + FLOOR) * k)
      p.vertex((x + TREAD) * k, ((i + 1) * RISE + FLOOR) * k)
    }
    p.vertex(0.5 * k, (1 + FLOOR) * k)
    p.vertex(0.5 * k, 1.5 * k)
    p.vertex(TOP * k, 1.5 * k)
    p.endShape(p.CLOSE)
    // The rail on, level with the last tread, and the ground line.
    outline(p, ink, weight)
    p.line((TOP + STEPS * TREAD) * k, (1 + FLOOR) * k, 0.5 * k, (1 + FLOOR) * k)
    p.line((TOP - 0.06) * k, 1.5 * k, 0.5 * k, 1.5 * k)
    // A nosing on each tread, and a tap mark where the ball has just landed.
    p.fill(ink)
    p.noStroke()
    for (let i = 0; i < STEPS; i++) {
      const x = TOP + (i + 1) * TREAD
      p.rect((x - 0.02) * k, ((i + 1) * RISE + FLOOR + 0.015) * k, 0.04 * k, 0.03 * k)
    }
    for (let i = 0; i < STEPS; i++) {
      const f = 1 - over(t, s.taps[i], s.taps[i] + 0.25)
      if (f <= 0 || t < s.taps[i]) continue
      const x = TOP + (i + 1) * TREAD - 0.05
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

import { outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, rail, roll, type Lane, type Pt } from '../parts'

/**
 * A pit with a trampoline in it. The rail just stops; the ball drops into
 * the pit, hits the trampoline, and comes back up higher than it went in,
 * over the far wall and onto the rail again. Two cells square, no
 * mechanism, and the biggest arc in the show.
 */
const LIP = 0.22
const CENTRE = 0.7
const FABRIC = 1.05
const REST: Pt = [CENTRE, FABRIC - 0.13]
const SAG = 0.13
const LOW: Pt = [CENTRE, FABRIC - 0.13 + SAG]
const LAND: Pt = [1.32, 0]
const ARRIVE = (0.5 + LIP) / ROLL
const IN = 0.32
const DOWN = 0.1
const UP = 0.09
const FIRE = ARRIVE + IN + DOWN

export const trampoline = definePiece<{ color: string }>({
  name: 'trampoline',
  weight: 0.8,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]
    if (!fits(cells, [2, 0])) return null
    const lane: Lane = {
      segs: [
        roll([-0.5, 0], [LIP, 0], ROLL),
        fly([LIP, 0], REST, IN, 0.1),
        { from: REST, to: LOW, dur: DOWN, ease: 'out' },
        { from: LOW, to: REST, dur: UP, ease: 'in' },
        fly(REST, LAND, 0.56, 0.5),
        fly(LAND, [LAND[0] + 0.12, 0], 0.08, 0.03),
        roll([LAND[0] + 0.12, 0], [1.5, 0], ROLL, 'out'),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The fabric's sag: pressed by the ball, then a ring-down.
    const press = t < ARRIVE + IN ? 0 : since < 0 ? over(t, ARRIVE + IN, FIRE) : since < UP ? 1 - over(since, 0, UP) : 0
    const ring = since < UP ? 0 : Math.sin((since - UP) * 28) * Math.exp(-(since - UP) * 4) * 0.45
    const sag = SAG * press + SAG * ring * -1

    // The lip, with an end cap; the landing rail with its post.
    rail(p, k, ink, weight, -0.5, LIP + 0.06)
    outline(p, ink, weight)
    p.line((LIP + 0.06) * k, (FLOOR - 0.05) * k, (LIP + 0.06) * k, (FLOOR + 0.05) * k)
    rail(p, k, ink, weight, 1.14, 1.5)
    p.line(1.14 * k, (FLOOR - 0.05) * k, 1.14 * k, (FLOOR + 0.05) * k)
    // The pit: two walls and a floor, and the posts the fabric is strung on.
    p.line(0.3 * k, 0.4 * k, 0.3 * k, 1.5 * k)
    p.line(1.12 * k, (FLOOR + 0.05) * k, 1.12 * k, 1.5 * k)
    p.line(0.3 * k, 1.5 * k, 1.12 * k, 1.5 * k)
    for (const x of [0.4, 1.0]) {
      p.line(x * k, 1.5 * k, x * k, FABRIC * k)
      // Springs: a short zigzag between the post and the fabric's edge.
      p.beginShape()
      for (let i = 0; i <= 6; i++) {
        const f = i / 6
        const amp = 0.025 * (1 - Math.abs(sag) * 2.5)
        p.vertex((x + (x < CENTRE ? 1 : -1) * 0.07 * f) * k, (FABRIC + sag * 0.5 * f + (i % 2 ? amp : -amp) * (i === 0 || i === 6 ? 0 : 1)) * k)
      }
      p.endShape()
    }
    // The fabric, sagging under the ball.
    p.push()
    p.noFill()
    p.stroke(s.color)
    p.strokeWeight(weight * 2.4)
    p.bezier(0.47 * k, (FABRIC + sag * 0.5) * k, 0.6 * k, (FABRIC + sag * 1.6) * k, 0.8 * k, (FABRIC + sag * 1.6) * k, 0.93 * k, (FABRIC + sag * 0.5) * k)
    p.stroke(ink)
    p.strokeWeight(weight)
    p.bezier(0.47 * k, (FABRIC + 0.02 + sag * 0.5) * k, 0.6 * k, (FABRIC + 0.02 + sag * 1.6) * k, 0.8 * k, (FABRIC + 0.02 + sag * 1.6) * k, 0.93 * k, (FABRIC + 0.02 + sag * 0.5) * k)
    p.pop()
    // A sign on the far wall, in case anyone doubted it.
    solid(p, ink, weight, bg)
    p.rect(1.12 * k, 0.5 * k, 0.14 * k, 0.12 * k)
    solid(p, ink, weight, s.color)
    p.triangle(1.08 * k, 0.53 * k, 1.16 * k, 0.53 * k, 1.12 * k, 0.46 * k)
    // The bounce: a puff of lines off the fabric.
    if (since > 0 && since < 0.3) {
      const f = easeOutCubic(over(since, 0, 0.3))
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-2.6, -2.2, -0.9, -0.5]) {
        const r0 = 0.12 + 0.2 * f
        const r1 = r0 + 0.1 * (1 - f)
        p.line((CENTRE + Math.cos(a) * r0) * k, (FABRIC + Math.sin(a) * r0) * k, (CENTRE + Math.cos(a) * r1) * k, (FABRIC + Math.sin(a) * r1) * k)
      }
      p.pop()
    }
  },
})

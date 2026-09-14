import { coil, outline, solid } from '../../../../src/core/draw'
import { easeOutCubic } from '../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fly, over, rail, ramp, roll, type Lane, type Pt } from '../parts'

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
/** The pit's walls: each rail ends on top of one. */
const WALL0 = LIP + 0.06
const WALL1 = 1.14
const GROUND = 1.5
/** The posts the fabric is strung between, and the fabric's ends. */
const POST0 = 0.4
const POST1 = 1.0
const END0 = 0.48
const END1 = 0.92

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
        ramp([LAND[0] + 0.12, 0], [1.5, 0], 2, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [2, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    // The fabric's sag: pressed by the ball, then a ring-down.
    const press = t < ARRIVE + IN ? 0 : since < 0 ? over(t, ARRIVE + IN, FIRE) : since < UP ? 1 - over(since, 0, UP) : 0
    const ring = since < UP ? 0 : Math.sin((since - UP) * 28) * Math.exp(-(since - UP) * 4) * 0.45
    const sag = SAG * press - SAG * ring

    // The rails end on the pit's walls; the walls stand on its floor.
    rail(p, k, ink, weight, -0.5, WALL0)
    rail(p, k, ink, weight, WALL1, 1.5)
    outline(p, ink, weight)
    p.line(WALL0 * k, FLOOR * k, WALL0 * k, GROUND * k)
    p.line(WALL1 * k, FLOOR * k, WALL1 * k, GROUND * k)
    p.line(WALL0 * k, GROUND * k, WALL1 * k, GROUND * k)
    // The posts, and a spring from each to the fabric's edge.
    const edge0 = FABRIC + sag * 0.5
    for (const [px, ex] of [
      [POST0, END0],
      [POST1, END1],
    ]) {
      p.line(px * k, GROUND * k, px * k, FABRIC * k)
      coil(p, px * k, FABRIC * k, ex * k, edge0 * k, 3, 0.022 * k)
    }
    // The fabric: one band, sagging under the ball.
    const th = 0.05
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(END0 * k, edge0 * k)
    p.bezierVertex(0.6 * k, (FABRIC + sag * 1.6) * k, 0.8 * k, (FABRIC + sag * 1.6) * k, END1 * k, edge0 * k)
    p.vertex(END1 * k, (edge0 + th) * k)
    p.bezierVertex(0.8 * k, (FABRIC + th + sag * 1.6) * k, 0.6 * k, (FABRIC + th + sag * 1.6) * k, END0 * k, (edge0 + th) * k)
    p.endShape(p.CLOSE)
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

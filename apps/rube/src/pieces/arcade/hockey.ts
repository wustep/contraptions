import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic } from '../../../../../src/core/ease'
import { FAST, FLOOR, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'
import { digits, flash, glow, lamp, marquee } from './neon'

/**
 * An air-hockey table. The rail runs onto the table's surface; the ball
 * slides to a stop on the air; a mallet on a rod swings in from the side
 * and slaps it — and it goes the length of the table flat out, no friction
 * at all, into the goal slot at the far end, where the cushion takes the
 * speed off and it rolls out onto the rail. The scoreboard goes to one.
 */
const SEAT = 0.1
const GOAL = 1.9
const ARRIVE = arriveAt(SEAT)
const WIND = 0.25
const FIRE = ARRIVE + WIND
const SLAP = 0.06
const V = FAST * 1.3

export const hockey = definePiece<{ color: string }>({
  name: 'hockey',
  weight: 1,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    if (!fits(cells, [3, 0])) return null
    const lane: Lane = {
      segs: [
        ...arrive([-0.5, 0], [SEAT, 0]),
        wait([SEAT, 0], WIND),
        ramp([SEAT, 0], [SEAT + 0.2, 0], 0, V),
        roll([SEAT + 0.2, 0], [GOAL, 0], V),
        ramp([GOAL, 0], [2.5, 0], V, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The mallet: drawn back while it winds, slapped through at the fire, held, drawn back later.
    const wind = t < ARRIVE ? 0 : since < -SLAP ? easeOutCubic(over(t, ARRIVE, FIRE - SLAP)) : 1
    const swing =
      since < -SLAP ? -0.9 * wind
      : since < 0 ? -0.9 + 1.3 * easeInQuad(over(since, -SLAP, 0))
      : since < 0.6 ? 0.4
      : 0.4 * (1 - over(since, 0.6, 1.4))
    const goal = since - (GOAL - SEAT - 0.2) / V - 0.1
    const scored = goal > 0 ? 1 - over(goal, 2, 3) : 0

    rail(p, k, ink, weight, -0.5, -0.2)
    rail(p, k, ink, weight, GOAL + 0.16, 2.5)
    // The table: a slab under the surface, on legs, with a centre line and the goal slot at the far end.
    solid(p, ink, weight, s.color)
    p.rect(((-0.2 + GOAL + 0.16) / 2) * k, (FLOOR + 0.12) * k, (GOAL + 0.36) * k, 0.2 * k, 0.02 * k)
    outline(p, ink, weight)
    p.line(-0.2 * k, FLOOR * k, (GOAL + 0.16) * k, FLOOR * k)
    for (const x of [-0.1, 0.9, GOAL + 0.06]) {
      p.line(x * k, (FLOOR + 0.22) * k, x * k, 0.5 * k)
      p.line((x - 0.06) * k, 0.5 * k, (x + 0.06) * k, 0.5 * k)
    }
    p.line(0.85 * k, (FLOOR + 0.03) * k, 0.85 * k, (FLOOR + 0.2) * k)
    solid(p, ink, weight, ink)
    p.rect((GOAL + 0.02) * k, -0.02 * k, 0.06 * k, 0.2 * k)
    // The air: dots rising through the surface, more under the ball.
    p.push()
    p.noStroke()
    const air = p.color(bg)
    air.setAlpha(150)
    p.fill(air)
    for (let i = 0; i < 14; i++) {
      const x = -0.1 + i * 0.145
      const f = ((t * 1.5 + i * 0.37) % 1 + 1) % 1
      p.circle(x * k, (FLOOR - 0.01 - 0.05 * f) * k, 0.012 * k)
    }
    p.pop()
    // The mallet on its rod, hinged over the table from a post.
    outline(p, ink, weight)
    p.line(-0.3 * k, 0.5 * k, -0.3 * k, -0.42 * k)
    p.line(-0.3 * k, -0.42 * k, -0.1 * k, -0.42 * k)
    p.push()
    p.translate(-0.1 * k, -0.42 * k)
    p.rotate(swing)
    outline(p, ink, weight * 1.4)
    p.line(0, 0, 0, 0.34 * k)
    solid(p, ink, weight, s.color)
    p.ellipse(0, 0.37 * k, 0.18 * k, 0.09 * k)
    p.rect(0, 0.31 * k, 0.06 * k, 0.06 * k)
    p.pop()
    // The scoreboard on a post at the far end: 0, then 1.
    outline(p, ink, weight)
    p.line((GOAL + 0.1) * k, -0.1 * k, (GOAL + 0.1) * k, -0.5 * k)
    solid(p, ink, weight, ink)
    p.rect((GOAL + 0.1) * k, -0.58 * k, 0.26 * k, 0.16 * k, 0.01 * k)
    glow(p, k, s.color, GOAL + 0.1, -0.58, 0.16, scored)
    digits(p, k, s.color, GOAL + 0.1, -0.58, goal > 0 ? '1' : '0', 0.024)
    marquee(p, k, ink, weight, s.color, bg, -0.1, GOAL, FLOOR + 0.26, 8, since, goal > 0 && goal < 2)
    lamp(p, k, ink, weight, s.color, bg, GOAL + 0.1, -0.44, 0.03, scored)
    // The slap, and the goal.
    flash(p, k, s.color, weight, SEAT + 0.1, 0, since, 0.2, 0.1, 0.28)
    flash(p, k, s.color, weight, GOAL, 0, goal, 0.3, 0.1, 0.3)
  },
})

import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic, easeOutQuad } from '../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, arrive, arriveAt, definePiece, over, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'
import { display, flash, glow } from './neon'

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
/** The mallet's pivot, and the rod down to the head. */
const PIVOT: Pt = [-0.1, -0.42]
const ROD = 0.34
const HEAD_W = 0.18
/** Drawn back, behind the ball. Positive is back: the head swings toward the ball as it falls. */
const BACK = 0.9
/** Where the head's face meets the ball's back, hanging almost straight. */
const CONTACT = Math.asin((PIVOT[0] + HEAD_W / 2 - (SEAT - R)) / ROD)
/** How far past contact it follows through while the ball gets away. */
const THROUGH = -0.15
/** The goal slot's face, and when the ball's front reaches it after the slap: the half-ball of acceleration, then flat out. */
const SLOT = GOAL + 0.02
const T_GOAL = 0.12 / (V / 2) + (SLOT - 0.03 - R - (SEAT + 0.12)) / V
/** The scoreboard: on a post over the goal, inside the cell. */
const BOARD_Y = -0.41

export const hockey = definePiece<{ color: string }>({
  name: 'hockey',
  points: 100,
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
        // A slap, not a shove: flat out within half a ball.
        ramp([SEAT, 0], [SEAT + 0.12, 0], 0, V),
        roll([SEAT + 0.12, 0], [GOAL, 0], V),
        ramp([GOAL, 0], [2.5, 0], V, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    // The mallet: drawn back behind the ball while it winds, swung down onto
    // its back at the fire, a short follow-through as the ball gets away,
    // then left hanging.
    const wind = t < ARRIVE ? 0 : since < -SLAP ? easeOutCubic(over(t, ARRIVE, FIRE - SLAP)) : 1
    const swing =
      since < -SLAP ? BACK * wind
      : since < 0 ? BACK - (BACK - CONTACT) * easeInQuad(over(since, -SLAP, 0))
      : since < 0.15 ? CONTACT + (THROUGH - CONTACT) * easeOutQuad(over(since, 0, 0.15))
      : since < 0.6 ? THROUGH
      : THROUGH * (1 - over(since, 0.6, 1.4))
    const goal = since - T_GOAL
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
    p.rect(SLOT * k, -0.02 * k, 0.06 * k, 0.2 * k)
    // The mallet on its rod, hinged over the table from a post.
    outline(p, ink, weight)
    p.line(-0.3 * k, 0.5 * k, -0.3 * k, PIVOT[1] * k)
    p.line(-0.3 * k, PIVOT[1] * k, PIVOT[0] * k, PIVOT[1] * k)
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(swing)
    outline(p, ink, weight * 1.4)
    p.line(0, 0, 0, ROD * k)
    solid(p, ink, weight, s.color)
    p.ellipse(0, (ROD + 0.03) * k, HEAD_W * k, 0.09 * k)
    p.rect(0, (ROD - 0.03) * k, 0.06 * k, 0.06 * k)
    p.pop()
    // The scoreboard on a post over the goal, under the cell's roof: a dark
    // window with a dim 0 in it, that lights to 1 in the colour on the goal
    // and glows a while.
    outline(p, ink, weight)
    p.line((GOAL + 0.1) * k, -0.1 * k, (GOAL + 0.1) * k, BOARD_Y * k)
    glow(p, k, s.color, GOAL + 0.1, BOARD_Y, 0.16, scored)
    display(p, k, ink, weight, bg, GOAL + 0.1, BOARD_Y, 0.26, 0.15, goal > 0 ? '1' : '0', s.color, goal > 0)
    // The slap, and the goal.
    flash(p, k, s.color, weight, SEAT + 0.1, 0, since)
    flash(p, k, s.color, weight, SLOT, 0, goal)
  },
})

import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic, easeOutQuad } from '../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, definePiece, laneReach, over, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score } from './neon'

/**
 * A foosball table two cells long. The rail runs onto the pitch, whose
 * near wall stands in front of the ball; two rods cross the table over
 * it in brackets on the wall, three men on each, hanging from the rod by
 * their hips. As the ball comes the first rod's men wind back, feet up
 * out of its way, and as it passes under them they whip over and their
 * feet kick it in the back, hard, and the rod spins on right round; it
 * goes the length of the table flat out; the second rod swings at it as
 * it goes by, and misses. It runs into the goal slot in the end wall and
 * out onto the rail; the goal lamp lights, and a hundred pops. The men
 * swing to a stop.
 */
export interface FoosballState {
  color: string
  men: string
}

/** The table: its ends, the pitch on the rail line, its body under, and the near wall in front of the ball. */
const TABLE_X0 = -0.35
const TABLE_X1 = 1.38
const BODY = 0.23
const WALL_TOP = 0.02
/** The rods: where they cross, and how high; a man hangs this far below his rod. */
const RODS = [0.2, 1.0]
const ROD_Y = -0.27
const LEG = 0.37
/** The goal slot in the end wall, and where the ball's front reaches it. */
const GOAL = TABLE_X1 - 0.06
const SLOT: Pt = [GOAL, 0]
/** Where the ball is when the first rod's feet meet its back, and how hard it goes. */
const KICK = RODS[0] + R + 0.04
const V = FAST * 1.2
const T_KICK = (KICK + 0.5) / ROLL
const LANE: Lane = {
  segs: [roll([-0.5, 0], [KICK, 0], ROLL), ramp([KICK, 0], [KICK + 0.12, 0], ROLL, V), roll([KICK + 0.12, 0], [GOAL - 0.1, 0], V), ramp([GOAL - 0.1, 0], [1.5, 0], V, ROLL)],
  fire: T_KICK,
}
const T_GOAL = laneReach(LANE, GOAL - R)
/** The men wind back this far and whip through; the rod goes right round after the kick. */
const WIND = -1.4
const SPIN = Math.PI * 2

/** The first rod's angle: hanging, wound back as the ball comes, whipped through the kick and right round, settling. */
function rod1(t: number): number {
  const since = t - T_KICK
  if (since < -0.36) return 0
  if (since < -0.07) return WIND * easeOutCubic(over(since, -0.36, -0.1))
  if (since < 0) return WIND * (1 - easeInQuad(over(since, -0.07, 0)))
  if (since < 0.4) return SPIN * easeOutQuad(since / 0.4)
  return SPIN + 0.18 * Math.sin((since - 0.4) * 14) * Math.exp(-(since - 0.4) * 4)
}
/** The second rod: a swing at the ball as it goes by, late, and a wobble back to hanging. */
function rod2(t: number): number {
  const at = T_GOAL - 0.12
  const s = t - at
  if (s < -0.16) return 0
  if (s < 0) return -1.0 * easeOutQuad(over(s, -0.16, 0))
  if (s < 0.1) return -1.0 + 1.9 * easeInQuad(s / 0.1)
  return 0.9 * Math.cos((s - 0.1) * 9) * Math.exp(-(s - 0.1) * 3.5)
}

/** A man hanging from (x, ROD_Y) at angle `a`: a head over a shirt over legs, one block and a dot. */
function man(p: p5, k: number, ink: string, weight: number, color: string, x: number, dy: number, a: number): void {
  p.push()
  p.translate(x * k, (ROD_Y + dy) * k)
  p.rotate(a)
  solid(p, ink, weight, color)
  p.beginShape()
  for (const [px, py] of [
    [-0.05, -0.02],
    [0.05, -0.02],
    [0.05, 0.15],
    [0.025, 0.15],
    [0.025, LEG],
    [-0.025, LEG],
    [-0.025, 0.15],
    [-0.05, 0.15],
  ] as Pt[])
    p.vertex(px * k, py * k)
  p.endShape(p.CLOSE)
  p.circle(0, -0.065 * k, 0.07 * k)
  p.pop()
}

export const foosball = definePiece<FoosballState>({
  name: 'foosball',
  points: 100,
  weight: 1,
  flight: true,
  place: ({ rng, color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // The men in a colour of their own: not the table's, and not the ball's if there is another to be had.
    const others = theme.colors.filter((c) => c !== color)
    const apart = others.filter((c) => c !== ball.color)
    const pool = apart.length ? apart : others
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color, men: pool.length ? rng.pick(pool) : color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const goal = t - T_GOAL
    const scored = goal < 0 ? 0 : 1 - over(goal, 1.5, 2.5)

    // The rail in and out, and the table: a body under the pitch on legs, the pitch the rail's line, the end wall with the goal slot in it.
    rail(p, k, ink, weight, -0.5, TABLE_X0)
    rail(p, k, ink, weight, TABLE_X1, 1.5)
    solid(p, ink, weight, s.color)
    p.rect(((TABLE_X0 + TABLE_X1) / 2) * k, (FLOOR + BODY / 2) * k, (TABLE_X1 - TABLE_X0) * k, BODY * k, 0.02 * k)
    for (const x of [TABLE_X0 + 0.1, 0.6, TABLE_X1 - 0.1]) {
      outline(p, ink, weight)
      p.line(x * k, (FLOOR + BODY) * k, x * k, 0.5 * k)
      p.line((x - 0.06) * k, 0.5 * k, (x + 0.06) * k, 0.5 * k)
    }
    outline(p, ink, weight)
    p.line(TABLE_X0 * k, FLOOR * k, TABLE_X1 * k, FLOOR * k)
    solid(p, ink, weight, s.color)
    p.rect((TABLE_X1 - 0.04) * k, ((FLOOR - 0.14) / 2) * k, 0.08 * k, (FLOOR + 0.14) * k, 0.01 * k)
    solid(p, ink, weight, ink)
    p.rect(SLOT[0] * k, 0 * k, 0.05 * k, 0.24 * k)
    // The men, behind the ball, hanging from their rods: three to a rod, the ones behind a little up and along.
    const angles = [rod1(t), rod2(t)]
    RODS.forEach((x, i) => {
      for (let j = 2; j >= 0; j--) man(p, k, ink, weight, s.men, x + j * 0.03, -j * 0.028, angles[i])
    })
    // The goal lamp on its stalk over the end wall.
    outline(p, ink, weight)
    p.line((TABLE_X1 - 0.04) * k, -0.14 * k, (TABLE_X1 - 0.04) * k, -0.34 * k)
    glow(p, k, s.color, TABLE_X1 - 0.04, -0.38, 0.14, scored)
    lamp(p, k, ink, weight, s.color, bg, TABLE_X1 - 0.04, -0.38, 0.04, scored)
    // The kick, and the goal.
    flash(p, k, s.men, weight, KICK + 0.05, 0, since, 0.18, 0.12, 0.24)
    flash(p, k, s.color, weight, GOAL, 0, goal, 0.2, 0.1, 0.22)
  },
  over: (p, s, { k, ink, weight }) => {
    // The near wall stands in front of the ball along the pitch, and the rods' brackets stand on it, a rod's end in each.
    solid(p, ink, weight, s.color)
    p.rect(((TABLE_X0 + TABLE_X1 - 0.08) / 2) * k, ((WALL_TOP + FLOOR + 0.02) / 2) * k, (TABLE_X1 - 0.08 - TABLE_X0) * k, (FLOOR + 0.02 - WALL_TOP) * k, 0.01 * k)
    for (const x of RODS) {
      solid(p, ink, weight, s.color)
      p.rect(x * k, ((ROD_Y + WALL_TOP) / 2) * k, 0.06 * k, (WALL_TOP - ROD_Y) * k, 0.01 * k)
      solid(p, ink, weight, ink)
      p.circle(x * k, ROD_Y * k, 0.05 * k)
    }
  },
  // Over the goal lamp, as the goal goes in: at the kick it lay across the men.
  scores: (p, s, { k, t, bg }) => score(p, k, s.color, bg, TABLE_X1 - 0.04, -0.5, '+100', t - T_GOAL, 1),
})

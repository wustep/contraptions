import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInQuad, easeOutCubic, easeOutQuad } from '../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, definePiece, laneReach, over, post, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { flash, glow, lamp, score } from './neon'

/**
 * A foosball table two cells long. The rail runs in through one goal
 * mouth and onto the pitch, behind the table's near side; two rods cross
 * the table over it on posts, a man on each, fixed to his rod through the
 * chest. As the ball comes the first man winds back, feet up behind him
 * and out of its way, and as it passes under him he whips through and his
 * toe meets it in the back, hard, and the rod spins on right round; it
 * goes the length of the table flat out. The second man has wound back
 * too, swings at it as it goes by, late, and kicks the air where it was.
 * It runs out through the far goal mouth onto the rail; the goal lamp
 * lights, and a hundred pops. The men swing to a stop.
 */
export interface FoosballState {
  color: string
  men: string
}

/** The table: its ends, its body under the pitch, and the rim of its near side, which stands in front of the ball. */
const TABLE_X0 = -0.35
const TABLE_X1 = 1.38
const BODY = 0.23
const WALL_TOP = 0.06
/** A goal mouth at either end: a dark doorway the ball is seen against as it goes through. */
const MOUTH_W = 0.09
const MOUTH_TOP = -0.19
const LAMP_X = TABLE_X1 - MOUTH_W / 2
/** The goal slot in the end wall, and where the ball's front reaches it. */
const GOAL = TABLE_X1 - 0.06
/** Where the ball is when the first man's toe meets its back, and how hard it goes. */
const KICK = 0.2 + R + 0.04
const V = FAST * 1.2
const T_KICK = (KICK + 0.5) / ROLL
const LANE: Lane = {
  segs: [roll([-0.5, 0], [KICK, 0], ROLL), ramp([KICK, 0], [KICK + 0.12, 0], ROLL, V), roll([KICK + 0.12, 0], [GOAL - 0.1, 0], V), ramp([GOAL - 0.1, 0], [1.5, 0], V, ROLL)],
  fire: T_KICK,
}
const T_GOAL = laneReach(LANE, GOAL - R)
/**
 * A man, from his rod: shoulders, hips, sole, and how far his toe sticks
 * out in front. He is short enough to go right round his rod inside the
 * cell, and his toe hangs at the height of the ball's middle.
 */
const ROD_Y = -0.24
const SHOULDER = -0.05
const HIP = 0.1
const SOLE = 0.24
const TOE = 0.065
/** The rods: the first stands where its man's toe, hanging, is on the ball's back at the kick. */
const RODS = [KICK - R - TOE - 0.02, 1.0]
/** When the ball is under the second rod. */
const T_PASS = laneReach(LANE, RODS[1])
/** Wound back: feet up behind, a little past level, so the ball goes under with room. Then right round after the kick. */
const WIND = 1.65
const SPIN = Math.PI * 2

/** The first rod's angle, feet back positive: hanging, wound back as the ball comes, whipped through the kick and right round, settling. */
function rod1(t: number): number {
  const since = t - T_KICK
  if (since < -0.36) return 0
  if (since < -0.07) return WIND * easeOutCubic(over(since, -0.36, -0.1))
  if (since < 0) return WIND * (1 - easeInQuad(over(since, -0.07, 0)))
  if (since < 0.5) return -SPIN * easeOutQuad(since / 0.5)
  return -SPIN - 0.18 * Math.sin((since - 0.5) * 14) * Math.exp(-(since - 0.5) * 4)
}
/** The second rod: wound back as the first kicks, a swing at the ball once it has gone by, and the swing dying away. */
function rod2(t: number): number {
  const s = t - (T_PASS - 0.01)
  const wound = WIND * easeOutCubic(over(t, T_KICK - 0.04, T_KICK + 0.07))
  if (s < 0) return wound
  if (s < 0.08) return WIND * (1 - easeInQuad(s / 0.08))
  // Through the bottom at the pace the whip gave it, and on as a swing that dies.
  const w = 12
  return (-((WIND * 2) / 0.08 / w)) * Math.sin(w * (s - 0.08)) * Math.exp(-6 * (s - 0.08))
}

/**
 * A man on his rod at (x, ROD_Y), turned `a`: one block from shoulders to
 * toe, and a head. His line is finer than the table's, or at this size it
 * would leave none of his colour showing.
 */
function man(p: p5, k: number, ink: string, weight: number, color: string, x: number, a: number): void {
  p.push()
  p.translate(x * k, ROD_Y * k)
  p.rotate(a)
  solid(p, ink, weight * 0.6, color)
  p.beginShape()
  for (const [px, py] of [
    [-0.06, SHOULDER],
    [0.06, SHOULDER],
    [0.06, HIP],
    [0.04, HIP],
    [0.04, SOLE - 0.04],
    [TOE, SOLE - 0.035],
    [TOE, SOLE],
    [-0.04, SOLE],
    [-0.04, HIP],
    [-0.06, HIP],
  ] as Pt[])
    p.vertex(px * k, py * k)
  p.endShape(p.CLOSE)
  p.circle(0, (SHOULDER - 0.055) * k, 0.1 * k)
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

    // The rail in and out, the table's legs, and a goal mouth at either end of the pitch: dark, so the ball is seen going through it.
    rail(p, k, ink, weight, -0.5, TABLE_X0)
    rail(p, k, ink, weight, TABLE_X1, 1.5)
    for (const x of [TABLE_X0 + 0.1, TABLE_X1 - 0.1]) post(p, k, ink, weight, x, FLOOR + BODY, 0.5)
    solid(p, ink, weight, bg)
    for (const x of [TABLE_X0 + MOUTH_W / 2, TABLE_X1 - MOUTH_W / 2]) p.rect(x * k, ((MOUTH_TOP + FLOOR) / 2) * k, MOUTH_W * k, (FLOOR - MOUTH_TOP) * k, 0.01 * k)
    // The rods' posts, behind the men, and the men behind the ball.
    outline(p, ink, weight)
    for (const x of RODS) p.line(x * k, ROD_Y * k, x * k, FLOOR * k)
    man(p, k, ink, weight, s.men, RODS[0], rod1(t))
    man(p, k, ink, weight, s.men, RODS[1], rod2(t))
    // The goal lamp on its stalk over the far mouth.
    outline(p, ink, weight)
    p.line(LAMP_X * k, MOUTH_TOP * k, LAMP_X * k, -0.36 * k)
    glow(p, k, s.color, LAMP_X, -0.4, 0.14, scored)
    lamp(p, k, ink, weight, s.color, bg, LAMP_X, -0.4, 0.04, scored)
    // The kick, and the goal.
    flash(p, k, s.men, weight, KICK + 0.05, 0, since, 0.18, 0.12, 0.24)
    flash(p, k, s.color, weight, GOAL, 0, goal, 0.2, 0.1, 0.22)
  },
  over: (p, s, { k, ink, weight }) => {
    // The table's near side stands in front of the ball from its rim down, and each rod's end shows on its man's chest.
    solid(p, ink, weight, s.color)
    p.rect(((TABLE_X0 + TABLE_X1) / 2) * k, ((WALL_TOP + FLOOR + BODY) / 2) * k, (TABLE_X1 - TABLE_X0) * k, (FLOOR + BODY - WALL_TOP) * k, 0.02 * k)
    solid(p, ink, weight, ink)
    for (const x of RODS) p.circle(x * k, ROD_Y * k, 0.03 * k)
  },
  // Over the goal lamp, as the goal goes in, and inside the table's own two cells.
  scores: (p, s, { k, t, bg }) => score(p, k, s.color, bg, 1.26, -0.5, '+100', t - T_GOAL, 1),
})

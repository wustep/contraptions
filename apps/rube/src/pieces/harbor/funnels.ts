import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, flick, fly, over, puff, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { bodyColor, piling, water } from './sea'

/**
 * Two funnels. The deck stops, and in the open water beyond it a little
 * steam launch lies moored between the piers, so low that her gunwale is
 * barely out of the sea and all there is of her is two stubby funnels,
 * their rims about level with the deck. The ball runs off the
 * deck's end and comes down on the after funnel like a cork: she toots,
 * and the puff pops it up and on to the forward funnel, which toots it up
 * onto the far deck. The launch ducks under each landing and bobs back,
 * and the two puffs drift off.
 */
/** The piers. */
const WEST = -0.1
const EAST = 1.16
/** The funnels: where each stands, and its rim: the after one a hair under the deck's level, the forward one a hair over it. */
const STACKS: { x: number; top: number }[] = [
  { x: 0.28, top: 0.15 },
  { x: 0.86, top: 0.1 },
]
const STACK_W = 0.16
/** The launch: her gunwale, a hand over the water, from the stern to the stem. */
const GUNWALE = 0.32
const STERN = -0.02
const STEM = 1.12
/** Where the ball comes down on each rim, seated a hair into its mouth, and on the far deck. */
const HIT1: Pt = [STACKS[0].x, STACKS[0].top - R + 0.01]
const HIT2: Pt = [STACKS[1].x, STACKS[1].top - R + 0.01]
const LAND: Pt = [EAST + 0.12, 0]

const T_EDGE = (WEST + 0.5) / ROLL
const FALL = 0.15
const FIRE = T_EDGE + FALL
const HOP1 = 0.36
const HOP2 = 0.32
const T_HIT2 = FIRE + HOP1
const HITS = [FIRE, T_HIT2]

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [WEST, 0], ROLL),
    // Off the end: level at first, then down onto the first rim.
    fly([WEST, 0], HIT1, FALL, HIT1[1] / 4),
    fly(HIT1, HIT2, HOP1, 0.3),
    fly(HIT2, LAND, HOP2, 0.24),
    fly(LAND, [LAND[0] + 0.06, 0], 0.05, 0.012),
    ramp([LAND[0] + 0.06, 0], [1.5, 0], 1.7, ROLL),
  ],
  fire: FIRE,
}

/** How far the launch has ducked under the landings so far: down at each, and bobbing back. */
const duckAt = (t: number): number => {
  let d = 0
  for (const at of HITS) {
    const s = t - at
    if (s > 0) d += 0.03 * Math.exp(-s * 4.5) * Math.sin(s * 13)
  }
  return d
}

/** A funnel from the gunwale up to its rim: the pipe, a paper band round it, and a black top. */
function stack(p: p5, k: number, ink: string, weight: number, color: string, bg: string, x: number, top: number, foot: number): void {
  solid(p, ink, weight, color)
  p.rect(x * k, ((top + foot) / 2) * k, STACK_W * k, (foot - top) * k)
  solid(p, ink, weight * 0.8, bg)
  p.rect(x * k, (top + 0.095) * k, STACK_W * k, 0.04 * k)
  solid(p, ink, weight, ink)
  p.rect(x * k, (top + 0.02) * k, (STACK_W + 0.04) * k, 0.04 * k, 0.012 * k)
}

export const funnels = definePiece<{ color: string }>({
  name: 'funnels',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color: bodyColor(theme, color, ball.color) } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const duck = duckAt(t)

    rail(p, k, ink, weight, -0.5, WEST)
    rail(p, k, ink, weight, EAST, 1.5)
    piling(p, k, ink, weight, -0.3)
    piling(p, k, ink, weight, EAST + 0.2)

    // The funnels, each kicking down into itself as it toots; then the hull in front of their feet, and the sea in front of the hull.
    STACKS.forEach((f, i) => {
      const kick = 0.018 * flick(t - HITS[i], 0.04, 0.08, 0.3)
      stack(p, k, ink, weight, s.color, bg, f.x, f.top + duck + kick, GUNWALE + duck + 0.02)
    })
    solid(p, ink, weight, s.color)
    // The hull: a round counter aft, a sheer rising to a raked stem, the keel out of sight under the sea's line.
    p.beginShape()
    p.vertex(STERN * k, (GUNWALE + duck) * k)
    p.vertex((STEM - 0.25) * k, (GUNWALE + duck) * k)
    p.quadraticVertex((STEM - 0.08) * k, (GUNWALE - 0.005 + duck) * k, STEM * k, (GUNWALE - 0.045 + duck) * k)
    p.vertex((STEM - 0.11) * k, (0.47 + duck) * k)
    p.vertex((STERN + 0.1) * k, (0.47 + duck) * k)
    p.quadraticVertex(STERN * k, (0.45 + duck) * k, STERN * k, (GUNWALE + duck) * k)
    p.endShape(p.CLOSE)
    water(p, k, ink, weight, -0.5, 1.5)

    // Each toot: a puff out of the rim under the ball that pops it off, swelling as it drifts away.
    STACKS.forEach((f, i) => {
      const u = over(t, HITS[i], HITS[i] + 0.55)
      if (u <= 0 || u >= 1) return
      const rise = 1 - Math.pow(1 - u, 2)
      puff(p, k, ink, weight * 0.8, bg, f.x + 0.1 * u, f.top - 0.03 - 0.2 * rise, 0.02 + 0.075 * Math.sin(Math.PI * Math.pow(u, 0.6)))
    })
  },
})

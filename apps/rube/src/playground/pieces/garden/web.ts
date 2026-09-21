import { outline, solid } from '../../../../../../src/core/draw'
import { FLOOR, ROLL, definePiece, fall, fly, laneAt, over, post, rail, ramp, roll, wait, type Lane, type Pt } from '../../../parts'
import { soil, tuft } from '../../../pieces/garden/green'

/**
 * A spider's web strung between two twigs where the path stops, a bridge
 * thread across their tops, radials from it and from the twigs to a hub,
 * and rings round the hub. The ball rolls off the path's end into the web;
 * the web takes it and stretches deep, every thread drawn toward the ball,
 * until it hangs there stopped, quivering. A beat. Then the two threads to
 * the bridge line snap, the web sags, and the ball drops through it to the
 * path a floor down. The torn web hangs low from the twigs, the snapped
 * threads dangling from the bridge.
 *
 * The web is drawn from its hub: the radials run from the anchors to it and
 * the rings are strung at fixed fractions along them, so moving the hub
 * stretches the whole web. While the ball is in it, the hub is the ball,
 * read off the lane.
 */
/** The twigs, the bridge thread between their tops, and the hub at rest. */
const TWIG_L = -0.3
const TWIG_R = 0.4
const BRIDGE = -0.42
const HUB0: Pt = [-0.14, -0.02]
/** The web's anchors: three a twig, two on the bridge. */
const ANCHORS: Pt[] = [
  [TWIG_L, -0.34],
  [TWIG_L, -0.04],
  [TWIG_L, 0.3],
  [TWIG_R, -0.34],
  [TWIG_R, -0.04],
  [TWIG_R, 0.3],
  [-0.1, BRIDGE],
  [0.16, BRIDGE],
]
/** Which anchors snap: the two on the bridge. */
const SNAPS = [6, 7]
const RINGS = [0.3, 0.55, 0.8]
/** How far the web stretches with the ball, and how far it sags doing so; the hold before the snap; where the hub hangs after. */
const STRETCH = 0.36
const SAG = 0.06
const HOLD = 0.4
const HUB_END: Pt = [HUB0[0] + STRETCH, 0.48]
const RAIL_END = TWIG_L + 0.02

const CAUGHT: Pt = [HUB0[0] + STRETCH, SAG]
const T_IN = (0.5 + HUB0[0]) / ROLL
const LANE: Lane = (() => {
  const into = roll([-0.5, 0], [HUB0[0], 0], ROLL)
  const stretch = ramp([HUB0[0], 0], CAUGHT, ROLL, 0)
  const drop = fall(CAUGHT, [CAUGHT[0], 1])
  return {
    segs: [into, stretch, wait(CAUGHT, HOLD), drop, fly([CAUGHT[0], 1], [CAUGHT[0] + 0.05, 1], 0.05, 0.015), ramp([CAUGHT[0] + 0.05, 1], [0.5, 1], 1.6, ROLL)],
    fire: into.dur + stretch.dur + HOLD,
  }
})()
const FIRE = LANE.fire

/** The hub at piece time `t`: at rest, on the ball, held quivering, or sagged and hanging. */
function hubAt(t: number): Pt {
  if (t <= T_IN) return HUB0
  if (t < FIRE) {
    const at = laneAt(LANE, t)
    const held = over(t, FIRE - HOLD, FIRE)
    const quiver = held > 0 ? 0.008 * held : 0
    return [at.x + quiver * Math.sin(t * 75), at.y + quiver * Math.cos(t * 92)]
  }
  const tau = t - FIRE
  const f = 1 - Math.exp(-tau * 7)
  const bounce = 0.03 * Math.exp(-tau * 4) * Math.sin(tau * 14)
  return [CAUGHT[0] + (HUB_END[0] - CAUGHT[0]) * f, CAUGHT[1] + (HUB_END[1] - CAUGHT[1]) * f + bounce]
}

export const web = definePiece<{ color: string }>({
  name: 'web',
  weight: 0.9,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, 1],
    ]
    if (!fits(cells, [1, 1])) return null
    return { cells, exit: { at: [1, 1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, weight }) => {
    const hub = hubAt(t)

    // The path in to the near twig, the ground a floor down, and the path out down there on its stake.
    rail(p, k, ink, weight, -0.5, RAIL_END)
    soil(p, k, ink, weight, -0.5, 0.5, 1.5)
    rail(p, k, ink, weight, 0.02, 0.5, 1 + FLOOR)
    post(p, k, ink, weight, 0.45, 1 + FLOOR, 1.5)
    tuft(p, k, ink, weight, -0.1, 1.5, 0.1, -0.02)

    // The twigs: two slender saplings up from the ground below, forked at the top, and the bridge thread between them.
    outline(p, ink, weight * 1.3)
    p.noFill()
    for (const [x, lean] of [
      [TWIG_L, -0.03],
      [TWIG_R, 0.04],
    ]) {
      p.beginShape()
      p.vertex(x * k, 1.5 * k)
      p.quadraticVertex((x + lean) * k, 0.6 * k, x * k, (BRIDGE - 0.02) * k)
      p.endShape()
      p.line(x * k, (BRIDGE + 0.1) * k, (x + lean * 2) * k, (BRIDGE - 0.06) * k)
      p.line(x * k, (BRIDGE + 0.1) * k, (x - lean * 1.5) * k, (BRIDGE - 0.05) * k)
    }
    outline(p, ink, weight * 0.65)
    p.line(TWIG_L * k, BRIDGE * k, TWIG_R * k, BRIDGE * k)

    // The web: radials from the anchors to the hub, rings strung along them. Snapped threads dangle from their anchors instead.
    ANCHORS.forEach((a, i) => {
      if (since > 0 && SNAPS.includes(i)) {
        const f = over(since, 0, 0.5)
        const len = 0.18
        const sway = 0.05 * Math.sin(since * 6 + i) * Math.exp(-since * 0.8)
        p.beginShape()
        p.vertex(a[0] * k, a[1] * k)
        p.quadraticVertex((a[0] + sway) * k, (a[1] + len * 0.6 * f) * k, (a[0] + sway * 1.5 + (i === 6 ? -0.03 : 0.03)) * k, (a[1] + len * f) * k)
        p.endShape()
        return
      }
      p.line(a[0] * k, a[1] * k, hub[0] * k, hub[1] * k)
    })
    for (const f of RINGS) {
      p.beginShape()
      ANCHORS.forEach((a, i) => {
        if (since > 0 && SNAPS.includes(i)) return
        p.vertex((hub[0] + (a[0] - hub[0]) * f) * k, (hub[1] + (a[1] - hub[1]) * f) * k)
      })
      p.endShape(since > 0 ? undefined : p.CLOSE)
    }
    // The hub itself: a small knot of silk.
    solid(p, ink, weight * 0.65, s.color)
    p.circle(hub[0] * k, hub[1] * k, 0.045 * k)
  },
})

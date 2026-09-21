import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, definePiece, fall, fly, laneAt, over, post, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'
import { leaf, soil, tuft } from './green'

/**
 * A spider's web strung between two saplings where the path stops, a
 * bridge thread across their tops, radials from it and from the saplings to
 * a hub, and a spiral round the hub, and the spider sitting up on the
 * bridge line. The ball rolls off the path's end into the web; the web takes
 * it and stretches deep, every thread drawn toward the ball, until it hangs
 * there stopped, quivering, and the spider runs along the bridge to the
 * sapling. A beat. Then the two threads to the bridge line snap, the web
 * sags, and the ball drops through it to the path a floor down. The torn
 * web hangs low from the saplings, the snapped threads dangling from the
 * bridge, and the spider lets itself down on a thread to look, and bobs
 * there.
 *
 * The web is drawn from its hub: the radials run from the anchors to it and
 * the spiral is strung at fixed fractions along them, anchor to anchor
 * round the hub, each span sagging a little toward it; so moving the hub
 * stretches the whole web. While the ball is in it, the hub is the ball,
 * read off the lane. The radials are the web's frame and drawn heavier than
 * the spiral, so it reads as a web and not as a net.
 */
/** The twigs, the bridge thread between their tops, and the hub at rest. */
const TWIG_L = -0.3
const TWIG_R = 0.4
const BRIDGE = -0.42
const HUB0: Pt = [-0.14, -0.02]
/** The web's anchors, in order round the hub from the top: two on the bridge, three a twig. */
const ANCHORS: Pt[] = [
  [-0.1, BRIDGE],
  [TWIG_L, -0.34],
  [TWIG_L, -0.04],
  [TWIG_L, 0.3],
  [TWIG_R, 0.3],
  [TWIG_R, -0.04],
  [TWIG_R, -0.34],
  [0.16, BRIDGE],
]
/** Which anchors snap: the two on the bridge, the first and the last. */
const SNAPS = [0, ANCHORS.length - 1]
/** The spiral's turns, as fractions of the way out along the radials; and how far each span sags toward the hub. */
const RINGS = [0.3, 0.55, 0.8]
const SAG_IN = 0.16
/** The spider: where it sits on the bridge, where it runs to, how far it lets itself down after, and its size. */
const SPIDER_AT = 0.02
const SPIDER_TO = TWIG_R - 0.07
const SPIDER_DROP = 0.2
const SPIDER_R = 0.028
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

/** The spider at (x, y), hanging below the point it holds on by: a round abdomen and a small head, and eight legs, bent, that scuttle while it runs. */
function spider(p: p5, k: number, ink: string, weight: number, x: number, y: number, t: number, running: boolean): void {
  outline(p, ink, weight * 0.55)
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const lift = running ? 0.012 * Math.sin(t * 40 + i * 1.7 + (side > 0 ? 0 : Math.PI)) : 0
      const a = -0.9 + i * 0.55
      const kx = x + side * Math.cos(a) * SPIDER_R * 1.5
      const ky = y - SPIDER_R * 0.4 + Math.sin(a) * SPIDER_R * 1.2 - 0.012 + lift
      p.line(x * k, y * k, kx * k, ky * k)
      p.line(kx * k, ky * k, (kx + side * SPIDER_R * 0.5) * k, (ky + SPIDER_R * 1.1) * k)
    }
  }
  solid(p, ink, weight * 0.5, ink)
  p.circle(x * k, (y + SPIDER_R * 0.35) * k, SPIDER_R * 2 * k)
  p.circle(x * k, (y - SPIDER_R * 0.9) * k, SPIDER_R * 1.1 * k)
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

    // The twigs: two slender saplings up from the ground below, forked at the top with a leaf on each, and the bridge thread between them.
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
    leaf(p, k, ink, weight * 0.9, s.color, TWIG_L - 0.01, BRIDGE + 0.05, 0.08, -2.6)
    leaf(p, k, ink, weight * 0.9, s.color, TWIG_R + 0.01, BRIDGE + 0.07, 0.075, -0.5)
    outline(p, ink, weight * 0.7)
    p.line(TWIG_L * k, BRIDGE * k, TWIG_R * k, BRIDGE * k)

    // The web: radials from the anchors to the hub, the frame. Snapped threads dangle from their anchors instead.
    const torn = since > 0
    ANCHORS.forEach((a, i) => {
      if (torn && SNAPS.includes(i)) {
        const f = over(since, 0, 0.5)
        const len = 0.18
        const sway = 0.05 * Math.sin(since * 6 + i) * Math.exp(-since * 0.8)
        p.beginShape()
        p.vertex(a[0] * k, a[1] * k)
        p.quadraticVertex((a[0] + sway) * k, (a[1] + len * 0.6 * f) * k, (a[0] + sway * 1.5 + (i === 0 ? -0.03 : 0.03)) * k, (a[1] + len * f) * k)
        p.endShape()
        return
      }
      p.line(a[0] * k, a[1] * k, hub[0] * k, hub[1] * k)
    })
    // The spiral, lighter: anchor to anchor round the hub, each span sagging toward it; open where the web has torn.
    outline(p, ink, weight * 0.45)
    for (const f of RINGS) {
      const pts = ANCHORS.map((a, i): [Pt, boolean] => [[hub[0] + (a[0] - hub[0]) * f, hub[1] + (a[1] - hub[1]) * f], torn && SNAPS.includes(i)])
      for (let i = 0; i < pts.length; i++) {
        const [a, cutA] = pts[i]
        const [b, cutB] = pts[(i + 1) % pts.length]
        if (cutA || cutB) continue
        const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const bend: Pt = [mid[0] + (hub[0] - mid[0]) * SAG_IN, mid[1] + (hub[1] - mid[1]) * SAG_IN]
        p.beginShape()
        p.vertex(a[0] * k, a[1] * k)
        p.quadraticVertex(bend[0] * k, bend[1] * k, b[0] * k, b[1] * k)
        p.endShape()
      }
    }
    // The hub itself: a small knot of silk.
    solid(p, ink, weight * 0.65, s.color)
    p.circle(hub[0] * k, hub[1] * k, 0.045 * k)

    // The spider: on the bridge line, off along it to the sapling when the ball comes, and down on a thread when the web goes, bobbing.
    const run = easeInOutSine(over(t, T_IN, T_IN + 0.3))
    const sx = SPIDER_AT + (SPIDER_TO - SPIDER_AT) * run
    const down = since > 0 ? SPIDER_DROP * easeOutCubic(over(since, 0.15, 0.65)) + 0.02 * Math.sin((since - 0.65) * 9) * Math.exp(-Math.max(0, since - 0.65) * 3) * (since > 0.65 ? 1 : 0) : 0
    const sy = BRIDGE + SPIDER_R + down
    if (down > 0) {
      outline(p, ink, weight * 0.35)
      p.line(sx * k, BRIDGE * k, sx * k, sy * k)
    }
    spider(p, k, ink, weight, sx, sy, t, run > 0 && run < 1)
  },
})

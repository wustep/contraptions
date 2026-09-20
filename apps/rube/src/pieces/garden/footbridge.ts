import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, chain, definePiece, laneAt, laneReach, rail, roll, type Lane, type Pt } from '../../parts'
import { gardenWater, soil, tuft } from './green'

/**
 * A little arched footbridge over a brook, two cells long. The path runs
 * up onto it and the ball climbs the hump, slowing all the way to the top,
 * and runs down the far side gathering the pace back, onto the path on the
 * far bank. The planks give a little under it as it crosses. Below, the
 * brook runs under the arch between its banks, a reed standing in it. No
 * mechanism: the shape is the beat.
 *
 * The ball's pace on the arch comes from its height, the way a real ball's
 * would, and the planks' give is under the ball, wherever the lane has it.
 */
/** The bridge's ends on the banks, its hump, and the deck's thickness. */
const X0 = -0.2
const X1 = 1.2
const MID = (X0 + X1) / 2
const HUMP = 0.27
const DECK = 0.065
/** How far the planks give under the ball, in the middle of the span. */
const FLEX = 0.022
/** Gravity for the climb: enough that the top is slow. */
const G = 9

/** The deck's top line at `x`, unloaded. */
const deck = (x: number) => FLOOR - HUMP * (1 - Math.pow((x - MID) / (MID - X0), 2))
/** How much the planks can give at `x`: nothing at the abutments, most in the middle. */
const give = (x: number) => FLEX * Math.sin((Math.PI * (x - X0)) / (X1 - X0))

const LANE: Lane = (() => {
  const n = 36
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const x = X0 + ((X1 - X0) * i) / n
    pts.push([x, deck(x) + give(x) - R])
  }
  const speed = (i: number) => Math.sqrt(Math.max(1, ROLL * ROLL - 2 * G * (FLOOR - deck((pts[i - 1][0] + pts[i][0]) / 2))))
  let total = 0
  for (let i = 1; i <= n; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / speed(i)
  const lane: Lane = { segs: [roll([-0.5, 0], [X0, 0], ROLL), ...chain(pts, total, speed), roll([X1, 0], [1.5, 0], ROLL)], fire: 0 }
  lane.fire = laneReach(lane, MID)
  return lane
})()
const T_ON = LANE.segs[0].dur
const T_OFF = T_ON + LANE.segs.slice(1, -1).reduce((s, seg) => s + seg.dur, 0)

export const footbridge = definePiece<{ color: string; water: string }>({
  name: 'footbridge',
  weight: 0.9,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color, water: gardenWater(theme, ball.color) } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    // The planks' give: a dip under the ball while it is on the bridge, and a small spring back after.
    const on = t > T_ON && t < T_OFF
    const bx = on ? laneAt(LANE, t).x : X1
    const sag = on ? give(bx) : t >= T_OFF ? -0.4 * FLEX * Math.exp(-(t - T_OFF) * 6) * Math.sin((t - T_OFF) * 24) : 0
    const top = (x: number) => deck(x) + sag * Math.exp(-Math.pow((x - bx) / 0.22, 2))

    // The banks either side, the brook between them, and its reeds.
    rail(p, k, ink, weight, -0.5, X0)
    rail(p, k, ink, weight, X1, 1.5)
    soil(p, k, ink, weight, -0.5, X0 + 0.05)
    soil(p, k, ink, weight, X1 - 0.05, 1.5)
    tuft(p, k, ink, weight, X0 - 0.04, 0.5, 0.11, -0.03)
    p.push()
    p.noStroke()
    p.fill(s.water)
    p.beginShape()
    p.vertex((X0 + 0.05) * k, 0.5 * k)
    for (let i = 0; i <= 24; i++) {
      const x = X0 + 0.05 + ((X1 - X0 - 0.1) * i) / 24
      p.vertex(x * k, (0.41 + 0.012 * Math.sin(i * 1.3)) * k)
    }
    p.vertex((X1 - 0.05) * k, 0.5 * k)
    p.endShape(p.CLOSE)
    p.pop()
    outline(p, ink, weight)
    p.noFill()
    p.beginShape()
    for (let i = 0; i <= 24; i++) {
      const x = X0 + 0.05 + ((X1 - X0 - 0.1) * i) / 24
      p.vertex(x * k, (0.41 + 0.012 * Math.sin(i * 1.3)) * k)
    }
    p.endShape()
    for (const [x, h, lean] of [
      [0.14, 0.42, 0.03],
      [0.86, 0.34, -0.02],
    ]) {
      outline(p, ink, weight)
      p.line(x * k, 0.42 * k, (x + lean) * k, (0.42 - h) * k)
      solid(p, ink, weight, ink)
      p.ellipse((x + lean) * k, (0.42 - h + 0.05) * k, 0.04 * k, 0.11 * k)
    }

    // The abutments on the banks, and the deck: one band over the arch, planks ticked across it.
    solid(p, ink, weight, bg)
    p.rect((X0 + 0.02) * k, ((FLOOR + 0.5) / 2 + 0.03) * k, 0.1 * k, (0.5 - FLOOR - 0.06) * k)
    p.rect((X1 - 0.02) * k, ((FLOOR + 0.5) / 2 + 0.03) * k, 0.1 * k, (0.5 - FLOOR - 0.06) * k)
    const n = 40
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = X0 + ((X1 - X0) * i) / n
      p.vertex(x * k, top(x) * k)
    }
    for (let i = n; i >= 0; i--) {
      const x = X0 + ((X1 - X0) * i) / n
      p.vertex(x * k, (top(x) + DECK) * k)
    }
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.7)
    for (let x = X0 + 0.1; x < X1 - 0.05; x += 0.1) p.line(x * k, (top(x) + 0.012) * k, x * k, (top(x) + DECK - 0.012) * k)

    // The handrail on the far side: posts up from the deck and a rail along their tops, following the arch.
    outline(p, ink, weight)
    const posts = [X0 + 0.06, X0 + 0.38, MID, X1 - 0.38, X1 - 0.06]
    for (const x of posts) p.line(x * k, top(x) * k, x * k, (top(x) - 0.22) * k)
    p.noFill()
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const x = posts[0] + ((posts[4] - posts[0]) * i) / n
      p.vertex(x * k, (top(x) - 0.22) * k)
    }
    p.endShape()
  },
})

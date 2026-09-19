import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, laneAt, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { aboveWater, body, flipper, type Rib } from './creatures'
import { WATER, piling, seaColor, splash, water } from './sea'

/**
 * A dolphin. The deck stops over open water where a fin has been cruising
 * up and down; as the ball comes the fin goes under. The ball runs off the
 * deck's end and falls, and the dolphin comes up out of the water under it
 * that instant, takes it on the tip of its beak and leaps — a whole arc,
 * nose to tail following one line through the air, the ball riding ahead
 * of the beak. At the top it flicks the ball on, and the ball comes down
 * on the deck a floor above while the dolphin goes over and down, in under
 * that deck's end, and into the sea with a splash. After a while the fin
 * comes up again.
 *
 * The leap is one parabola. The dolphin's spine is that curve behind its
 * nose, so the body bends the way the jump does; the ball, while it is
 * carried, is a radius ahead of the beak along the same curve.
 */

/** The deck's end. */
const EDGE = 0.05
/** The leap: where the beak breaks the surface, how fast, and how hard it is pulled back down. */
const NOSE0: Pt = [0.39, 0.31]
const VX = 1.17
const VY = 5.28
const G = 9.1
const T_TOP = VY / G
/** Nose to tail, and half the body's thickness along it from the nose. */
const LENGTH = 0.8
const GIRTH: [number, number][] = [
  [0, 0.022],
  [0.085, 0.034],
  [0.14, 0.08],
  [0.24, 0.104],
  [0.39, 0.11],
  [0.56, 0.082],
  [0.7, 0.04],
  [0.8, 0.022],
]
/** How much of the leap's curve the body takes on: 1 would follow it exactly. */
const BEND = 0.5
/** The deck above: where the ball lands, where the deck starts — past where the dolphin comes down — and its piling. */
const LAND: Pt = [1.95, -1]
const SHELF_X = 1.74
const POST_X = 2.16

/** The beak's tip, `s` seconds into the leap; before and after, it is the same curve under water. */
const noseAt = (s: number): Pt => [NOSE0[0] + VX * s, NOSE0[1] - VY * s + (G * s * s) / 2]
const headingAt = (s: number): number => Math.atan2(-VY + G * s, VX)
/** The ball on the beak: a radius ahead of its tip, the way the dolphin is going. */
const carried = (s: number): Pt => {
  const [x, y] = noseAt(s)
  const a = headingAt(s)
  return [x + Math.cos(a) * (R + 0.004), y + Math.sin(a) * (R + 0.004)]
}
/** When the nose is back at the waterline. */
const T_DIVE = T_TOP + Math.sqrt((2 * (WATER - noseAt(T_TOP)[1])) / G)

/** How far along the curve the nose has come at `s`, for laying the body out behind it. */
const STEP = 0.004
const S0 = -0.5
const ALONG: number[] = (() => {
  const out = [0]
  for (let i = 1; S0 + i * STEP <= T_DIVE + 0.6; i++) {
    const a = noseAt(S0 + (i - 1) * STEP)
    const b = noseAt(S0 + i * STEP)
    out.push(out[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  return out
})()
/** The leap-time at which the nose was `back` cells of curve behind where it is at `s`. */
function behind(s: number, back: number): number {
  const i = Math.max(0, Math.min(ALONG.length - 1, (s - S0) / STEP))
  const here = lerp(ALONG[Math.floor(i)], ALONG[Math.min(ALONG.length - 1, Math.floor(i) + 1)], i % 1)
  const want = here - back
  let lo = 0
  let hi = Math.ceil(i)
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (ALONG[mid] < want) lo = mid
    else hi = mid
  }
  return S0 + (lo + (want - ALONG[lo]) / (ALONG[hi] - ALONG[lo] || 1)) * STEP
}

const T_EDGE = (0.5 + EDGE) / ROLL
const CATCH = carried(0)
const FALL = (CATCH[0] - EDGE) / ROLL
const FIRE = T_EDGE + FALL
const TOP = carried(T_TOP)
/** Off the beak at the top, level, and down onto the deck the way a thing falls. */
const FLICK = Math.sqrt((2 * (LAND[1] - TOP[1])) / G)
const V_LAND = (LAND[0] - TOP[0]) / FLICK

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [EDGE, 0], ROLL),
    // Off the end: level at first, then falling.
    fly([EDGE, 0], CATCH, FALL, CATCH[1] / 4),
    ...trace(carried, 0, T_TOP, 24),
    fly(TOP, LAND, FLICK, (LAND[1] - TOP[1]) / 4),
    fly(LAND, [LAND[0] + 0.12, -1], 0.12 / V_LAND, 0.012),
    ramp([LAND[0] + 0.12, -1], [2.5, -1], V_LAND, ROLL),
  ],
  fire: FIRE,
}

/** The fin that cruises while nothing is happening: where it is, which way it is going, how far out of the water. */
const finX = (t: number): number => 0.85 + 0.3 * Math.sin(t * 0.8)
const finUp = (t: number): number => 1 - easeInOutSine(over(t, T_EDGE - 0.45, T_EDGE - 0.15)) + easeInOutSine(over(t, FIRE + T_DIVE + 1.1, FIRE + T_DIVE + 1.6))

export const dolphin = definePiece<{ color: string }>({
  name: 'dolphin',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, -1],
      [2, -1],
    ]
    if (!fits(cells, [3, -1])) return null
    return { cells, exit: { at: [3, -1], dir: 1 }, lane: LANE, state: { color: seaColor(theme, color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    rail(p, k, ink, weight, -0.5, EDGE)
    piling(p, k, ink, weight, EDGE - 0.1)
    // The deck above on a piling that stands in the water, with a brace under it.
    rail(p, k, ink, weight, SHELF_X, 2.5, -1 + FLOOR)
    post(p, k, ink, weight, POST_X, -1 + FLOOR, 0.5)
    outline(p, ink, weight)
    p.line(POST_X * k, (-1 + FLOOR + 0.2) * k, (SHELF_X + 0.04) * k, (-1 + FLOOR) * k)

    p.push()
    aboveWater(p, k, -0.5, 2.5)
    // The fin, cruising: a dorsal fin and the top of a back, turning round at each end of its beat.
    const up = finUp(t)
    if (up > 0.02) {
      const x = finX(t)
      const way = Math.cos(t * 0.8) >= 0 ? 1 : -1
      p.push()
      p.translate(x * k, (WATER + 0.12 * (1 - up)) * k)
      p.scale(way, 1)
      solid(p, ink, weight, s.color)
      p.ellipse(0, 0.035 * k, 0.34 * k, 0.09 * k)
      p.beginShape()
      p.vertex(0.07 * k, -0.005 * k)
      p.bezierVertex(0.03 * k, -0.08 * k, -0.04 * k, -0.13 * k, -0.1 * k, -0.14 * k)
      p.bezierVertex(-0.07 * k, -0.09 * k, -0.07 * k, -0.04 * k, -0.08 * k, -0.005 * k)
      p.endShape(p.CLOSE)
      p.pop()
    }

    // The dolphin, laid out along its leap behind its nose.
    if (since > -0.05 && since < T_DIVE + 0.35) {
      // The spine: the leap's own curve behind the nose, eased half way toward a straight back, since a dolphin bends less than its jump does at the top.
      const mid = headingAt(behind(since, LENGTH * 0.45))
      const [nx, ny] = noseAt(since)
      const at = (back: number): Pt => {
        const [x, y] = noseAt(behind(since, back))
        return [lerp(nx - Math.cos(mid) * back, x, BEND), lerp(ny - Math.sin(mid) * back, y, BEND)]
      }
      const spine: Rib[] = []
      const n = 22
      for (let i = n; i >= 0; i--) {
        const back = (LENGTH * i) / n
        const j = GIRTH.findIndex(([along]) => along >= back)
        const [a0, w0] = GIRTH[Math.max(0, j - 1)]
        const [a1, w1] = GIRTH[Math.max(0, j)]
        spine.push([...at(back), lerp(w0, w1, a1 > a0 ? (back - a0) / (a1 - a0) : 0)])
      }
      // A point on the body `back` from the nose, `off` out from the spine toward the back (+) or the belly (-), and the heading there.
      const on = (back: number, off: number): [number, number, number] => {
        const [x, y] = at(back)
        const [hx, hy] = at(Math.max(0, back - 0.02))
        const [tx, ty] = at(back + 0.02)
        const a = Math.atan2(hy - ty, hx - tx)
        return [x + Math.sin(a) * off, y - Math.cos(a) * off, a]
      }
      solid(p, ink, weight, s.color)
      // The flukes, the fin on its back and the flipper under it, then the body over their roots.
      const [tx, ty, ta] = on(LENGTH - 0.01, 0)
      const beat = 0.35 * Math.sin(since * 16)
      for (const side of [-1, 1]) flipper(p, k, tx, ty, 0.18, ta + Math.PI + side * (0.75 + 0.15 * side * beat), 0.5)
      const [dx, dy, da] = on(0.4, 0.085)
      p.push()
      p.translate(dx * k, dy * k)
      p.rotate(da)
      p.beginShape()
      p.vertex(0.085 * k, 0.012 * k)
      p.bezierVertex(0.035 * k, -0.085 * k, -0.05 * k, -0.145 * k, -0.13 * k, -0.15 * k)
      p.bezierVertex(-0.095 * k, -0.095 * k, -0.085 * k, -0.035 * k, -0.095 * k, 0.012 * k)
      p.endShape(p.CLOSE)
      p.pop()
      const [fx, fy, fa] = on(0.27, -0.07)
      flipper(p, k, fx, fy, 0.18, fa + Math.PI - 0.95, 0.4)
      body(p, k, spine)
      // The pale belly: a line along the underside.
      p.push()
      p.noFill()
      p.stroke(bg)
      p.strokeWeight(weight * 1.6)
      p.beginShape()
      for (let back = 0.12; back <= 0.6; back += 0.04) {
        const [bx, by] = on(back, -0.052 - 0.025 * Math.sin(((back - 0.12) / 0.48) * Math.PI))
        p.vertex(bx * k, by * k)
      }
      p.endShape()
      p.pop()
      // The smile, and an eye on the ball.
      const [m0x, m0y] = on(0.014, -0.014)
      const [m1x, m1y] = on(0.12, -0.04)
      outline(p, ink, weight * 0.8)
      p.line(m0x * k, m0y * k, m1x * k, m1y * k)
      const [ex, ey] = on(0.18, 0.014)
      const ball = laneAt(LANE, t)
      const look = Math.atan2(ball.y - ey, ball.x - ex)
      solid(p, ink, weight * 0.7, bg)
      p.circle(ex * k, ey * k, 0.058 * k)
      p.noStroke()
      p.fill(ink)
      p.circle((ex + Math.cos(look) * 0.011) * k, (ey + Math.sin(look) * 0.011) * k, 0.03 * k)
    }
    p.pop()

    // The sea, over where the dolphin goes through it, and the water it throws coming out and going in.
    water(p, k, ink, weight, -0.5, 2.5)
    splash(p, k, s.color, weight, NOSE0[0], WATER, over(since, -0.02, 0.55), 1.3)
    splash(p, k, s.color, weight, noseAt(T_DIVE)[0], WATER, over(since, T_DIVE, T_DIVE + 0.6), 1.5)
    // The ring the fin leaves where it went under, and the flick at the top.
    if (up < 0.98 && up > 0.02) {
      p.push()
      p.noFill()
      p.stroke(s.color)
      p.strokeWeight(weight * 0.9 * Math.sin(up * Math.PI))
      p.ellipse(finX(t) * k, (WATER + 0.02) * k, (0.4 - 0.15 * up) * k, 0.05 * k)
      p.pop()
    }
    if (since > T_TOP && since < T_TOP + 0.18) {
      const f = over(since, T_TOP, T_TOP + 0.18)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight * (1 - f * 0.5))
      for (const a of [-2.3, Math.PI, 2.3]) {
        p.line((TOP[0] + Math.cos(a) * (0.16 + 0.1 * f)) * k, (TOP[1] + Math.sin(a) * (0.16 + 0.1 * f)) * k, (TOP[0] + Math.cos(a) * (0.23 + 0.12 * f)) * k, (TOP[1] + Math.sin(a) * (0.23 + 0.12 * f)) * k)
      }
      p.pop()
    }
  },
})

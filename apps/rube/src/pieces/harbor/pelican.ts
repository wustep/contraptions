import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, lerp } from '../../../../../src/core/ease'
import { ROLL, definePiece, fly, over, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'
import { piling, water } from './sea'

/**
 * A pelican on a post. The deck stops short over open water; the pelican
 * leans down from its perch with its beak open and its pouch hanging at
 * deck height, and the ball rolls off the end straight into the pouch.
 * The bird lifts its head, opens its wings and flaps across two cells of
 * water to the far post, tips its beak, and the ball drops out onto the
 * deck and rolls on. The pelican settles on the new post and stays.
 */
const EDGE = 0.15
const POUCH: Pt = [0.34, 0.06]
const CARRY_Y = -0.42
const CARRY_X0 = 0.52
const CARRY_X1 = 1.7
const LAND: Pt = [1.95, 0]
const NEAR = 0.06
const FAR = 2.05
const T_IN = (0.5 + EDGE) / ROLL
const DROP_IN = 0.1
const SCOOP = 0.3
const LIFT = 0.3
const GLIDE = 0.7
const TIP = 0.15
const T_LIFT = T_IN + DROP_IN + SCOOP
const T_GLIDE = T_LIFT + LIFT
const T_TIP = T_GLIDE + GLIDE
const FIRE = T_TIP + TIP

/** Where the pouch is: with the ball, once it has it; at the deck's end before; under the far perch after. */
function pouchAt(t: number): Pt {
  if (t < T_LIFT) return POUCH
  if (t < T_GLIDE) {
    const f = easeInOutSine(over(t, T_LIFT, T_GLIDE))
    return [lerp(POUCH[0], CARRY_X0, f), lerp(POUCH[1], CARRY_Y, f)]
  }
  if (t < T_TIP) return [lerp(CARRY_X0, CARRY_X1, easeInOutSine(over(t, T_GLIDE, T_TIP))), CARRY_Y]
  return [CARRY_X1 + 0.08 * over(t, T_TIP, FIRE + 0.3), CARRY_Y + 0.02 * over(t, T_TIP, FIRE)]
}

export const pelican = definePiece<{ color: string }>({
  name: 'pelican',
  weight: 0.9,
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
        roll([-0.5, 0], [EDGE, 0], ROLL),
        fly([EDGE, 0], POUCH, DROP_IN, 0.02),
        wait(POUCH, SCOOP),
        { from: POUCH, to: [CARRY_X0, CARRY_Y], dur: LIFT, ease: 'inout' },
        { from: [CARRY_X0, CARRY_Y], to: [CARRY_X1, CARRY_Y], dur: GLIDE, ease: 'inout' },
        wait([CARRY_X1, CARRY_Y], TIP),
        fly([CARRY_X1, CARRY_Y], LAND, 0.26, 0.04),
        fly(LAND, [LAND[0] + 0.14, 0], 0.06, 0.02),
        ramp([LAND[0] + 0.14, 0], [2.5, 0], 2.4, ROLL),
      ],
      fire: FIRE,
    }
    return { cells, exit: { at: [3, 0], dir: 1 }, lane, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const [px, py] = pouchAt(t)
    // The body: perched on the near post, then above and behind the pouch, then perched on the far one.
    const flying = t >= T_LIFT && t < FIRE + 0.5
    const settle = easeInOutSine(over(t, FIRE + 0.3, FIRE + 0.9))
    const bx = t < T_LIFT ? NEAR + 0.02 : flying ? lerp(px - 0.22, FAR, settle) : FAR
    const by = t < T_LIFT ? -0.5 : flying ? lerp(py - 0.34, -0.5, settle) : -0.5
    const flap = flying && t < FIRE ? Math.sin(t * 16) * 0.5 : 0
    const open = t < T_LIFT ? 0.5 : t < T_TIP ? 0.05 : t < FIRE + 0.4 ? 0.6 : 0.1
    // The neck: down to the deck's end while scooping, up while flying.
    const scooping = t < T_LIFT
    const hx = scooping ? px - 0.06 : bx + 0.18
    const hy = scooping ? py - 0.2 : by - 0.1

    // The deck, the two posts, the water between.
    water(p, k, ink, weight, -0.5, 2.5)
    rail(p, k, ink, weight, -0.5, EDGE)
    rail(p, k, ink, weight, LAND[0] - 0.2, 2.5)
    piling(p, k, ink, weight, EDGE - 0.06)
    piling(p, k, ink, weight, LAND[0] - 0.16)
    // The perches: a tall post at each end with a cap.
    outline(p, ink, weight)
    for (const x of [NEAR, FAR]) {
      p.line(x * k, 0.5 * k, x * k, -0.38 * k)
      p.line((x - 0.07) * k, -0.38 * k, (x + 0.07) * k, -0.38 * k)
    }

    // The wings, behind the body: two shapes that flap while it flies.
    p.push()
    p.translate(bx * k, by * k)
    for (const side of [-1, 1]) {
      p.push()
      p.rotate(side * (0.3 + flap) - (flying ? 0.5 : 1.0) * side)
      solid(p, ink, weight, s.color)
      p.beginShape()
      p.vertex(0, 0)
      p.bezierVertex(0.1 * k, -0.24 * k, 0.32 * k, -0.28 * k, 0.4 * k, -0.2 * k)
      p.bezierVertex(0.28 * k, -0.1 * k, 0.16 * k, 0.02 * k, 0, 0.04 * k)
      p.endShape(p.CLOSE)
      p.pop()
    }
    p.pop()
    // The body and the feet.
    solid(p, ink, weight, s.color)
    p.ellipse(bx * k, by * k, 0.36 * k, 0.24 * k)
    if (!flying) {
      outline(p, ink, weight)
      for (const dx of [-0.04, 0.04]) p.line((bx + dx) * k, (by + 0.1) * k, (bx + dx * 1.6) * k, -0.38 * k)
    }
    // The neck, the head, the eye.
    outline(p, ink, weight * 1.8)
    p.line((bx + 0.12) * k, (by - 0.04) * k, hx * k, (hy + 0.04) * k)
    solid(p, ink, weight, s.color)
    p.circle(hx * k, hy * k, 0.14 * k)
    p.fill(ink)
    p.noStroke()
    p.circle((hx + 0.03) * k, (hy - 0.02) * k, 0.025 * k)
    // The beak: the upper half fixed, the lower half hinged open; the pouch hangs from it.
    const dir = scooping ? 0.9 : t < FIRE ? 0.1 : 0.5
    p.push()
    p.translate((hx + 0.05) * k, hy * k)
    p.rotate(dir)
    solid(p, ink, weight, bg)
    p.triangle(0, -0.03 * k, 0.34 * k, -0.01 * k, 0, 0.01 * k)
    p.push()
    p.rotate(open)
    p.triangle(0, 0, 0.3 * k, 0.02 * k, 0, 0.04 * k)
    p.pop()
    p.pop()
    // The pouch, behind the ball: a sack from the beak's hinge down round the pouch point.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((hx + 0.05) * k, (hy + 0.02) * k)
    p.bezierVertex((px - 0.2) * k, (py - 0.02) * k, (px - 0.16) * k, (py + 0.18) * k, px * k, (py + 0.17) * k)
    p.bezierVertex((px + 0.16) * k, (py + 0.18) * k, (px + 0.2) * k, (py - 0.02) * k, (hx + 0.05 + 0.3 * Math.cos(dir + open)) * k, (hy + 0.3 * Math.sin(dir + open)) * k)
    p.endShape(p.CLOSE)
    // A drip off the pouch, and a small splash where the ball went in.
    if (since > 0 && since < 0.25) {
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-0.9, -0.5, -0.1]) {
        const r0 = 0.1 + 0.1 * over(since, 0, 0.25)
        p.line((px + Math.cos(a) * r0) * k, (py + 0.1 + Math.sin(a) * r0) * k, (px + Math.cos(a) * (r0 + 0.05)) * k, (py + 0.1 + Math.sin(a) * (r0 + 0.05)) * k)
      }
      p.pop()
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The pouch's front lip stands between the viewer and the ball while it is carried.
    if (t < T_IN + DROP_IN || t > FIRE) return
    const [px, py] = pouchAt(t)
    solid(p, ink, weight, s.color)
    p.arc(px * k, (py + 0.04) * k, 0.3 * k, 0.26 * k, 0.15, Math.PI - 0.15, p.CHORD)
  },
})

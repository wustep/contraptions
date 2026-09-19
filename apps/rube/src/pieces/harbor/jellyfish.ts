import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, laneAt, over, post, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { bodyColor, luminance, piling, seaWater, splash, water } from './sea'

/**
 * A jellyfish. The deck stops over open water, and a big jellyfish floats
 * there at the surface: a bell domed up out of the sea, breathing in and
 * out, a fringe of tentacles under it, two small eyes on the ball. The
 * ball runs off the deck's end and comes down on the crown of the bell;
 * the bell dimples deep under it, its shoulders bulging, and springs back,
 * and the ball goes up in a high arc over the water and comes down onto
 * the deck a floor above. The bell rings on for a while — crown up, crown
 * down — the lights round its rim running out from the middle, and the
 * tentacles take their time to settle.
 *
 * The crown's height is one function of time: the dimple, the rebound and
 * the ringing are all it, and the ball's lane while it is on the bell is
 * traced from it, so the ball sits in the dimple all the way down and up.
 */
const EDGE = -0.12
/** The bell: its middle, its rim — just awash — its crown at rest, its half-width. */
const JX = 0.38
const RIM_Y = 0.4
const CROWN_Y = 0.16
const HALF = 0.36
/** How wide the dimple is: wide enough that the ball sits on its floor and not on its walls. */
const DIMPLE = 0.21
/** How deep the crown dimples, how long it takes going down, and how long coming back up to where the ball leaves it. */
const SAG = 0.16
const DOWN = 0.1
const UP = 0.07
/** The ringing after: the crown swings about its rest at this rate and dies away at this one. */
const RING = Math.PI / (2 * UP)
const DAMP = 2.4
/** The deck above: where the ball lands, where the deck starts — clear of the ball's rise — and its piling. */
const LAND: Pt = [1.2, -1]
const SHELF_X = 1.05
const POST_X = 1.4
const T_EDGE = (0.5 + EDGE) / ROLL
const FALL = (JX - EDGE) / ROLL
const T_TOUCH = T_EDGE + FALL
const FIRE = T_TOUCH + DOWN
const T_OFF = FIRE + UP
const FLIGHT = 0.62
const LOFT = 0.5

/** How far the crown is below its rest at `t`: nothing, the dimple under the ball, then the rebound ringing down. */
function dipAt(t: number): number {
  if (t < T_TOUCH) return 0
  if (t < FIRE) return SAG * Math.sin((Math.PI / 2) * over(t, T_TOUCH, FIRE))
  const s = t - FIRE
  return SAG * Math.cos(RING * s) * Math.exp(-DAMP * s)
}

/** The bell breathes while it waits, holds its breath as the ball comes, and takes it up again when the ringing has died away. */
const breathAt = (t: number): number => Math.sin(t * 2.3) * (1 - over(t, T_EDGE - 0.5, T_EDGE) + over(t, FIRE + 2.4, FIRE + 3.6))

const REST: Pt = [JX, CROWN_Y - R]
const RIDE = trace((t) => [JX, CROWN_Y + dipAt(t) - R], T_TOUCH, T_OFF, 12)
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [EDGE, 0], ROLL),
    // Off the end and down onto the crown: level at first, then falling.
    fly([EDGE, 0], REST, FALL, REST[1] / 4),
    ...RIDE,
    fly(RIDE[RIDE.length - 1].to, LAND, FLIGHT, LOFT),
    fly(LAND, [LAND[0] + 0.1, -1], 0.06, 0.015),
    ramp([LAND[0] + 0.1, -1], [1.5, -1], 1.9, ROLL),
  ],
  fire: FIRE,
}

export const jellyfish = definePiece<{ color: string; light: string }>({
  name: 'jellyfish',
  weight: 0.9,
  flight: true,
  place: ({ color, fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
      [0, -1],
      [1, -1],
    ]
    if (!fits(cells, [2, -1])) return null
    // The bell in a colour that stands off the paper; its lights in the palette's colour furthest from that.
    const body = bodyColor(theme, color, ball.color)
    const light = [...theme.colors].filter((c) => c !== body).sort((a, b) => Math.abs(luminance(b) - luminance(body)) - Math.abs(luminance(a) - luminance(body)))[0] ?? body
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color: body, light } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight, theme }) => {
    const dip = dipAt(t)
    const dn = dip / SAG
    const breath = breathAt(t)
    // Dimpled, the bell's shoulders go out and up; breathing, it swells and flattens a little.
    const half = HALF * (1 + 0.09 * dn + 0.035 * breath)
    const ball = laneAt(LANE, t)
    // The tentacles: stirred up by the bounce, a long time settling.
    const stir = since < 0 ? 1 : 1 + 2.2 * Math.exp(-since * 1.1)

    rail(p, k, ink, weight, -0.5, EDGE)
    piling(p, k, ink, weight, EDGE - 0.08)
    // The deck above on a piling that stands in the water, with a brace under it.
    rail(p, k, ink, weight, SHELF_X, 1.5, -1 + FLOOR)
    post(p, k, ink, weight, POST_X, -1 + FLOOR, 0.5)
    outline(p, ink, weight)
    p.line(POST_X * k, (-1 + FLOOR + 0.18) * k, (SHELF_X + 0.03) * k, (-1 + FLOOR) * k)

    // Under the bell: long streamers trailing off down the current, a wave running along each, and two short frilled arms in the middle.
    outline(p, ink, weight * 0.7)
    for (let i = 0; i < 2; i++) {
      const x0 = JX + 0.1 + i * 0.12
      const len = 0.62 - 0.2 * i
      p.beginShape()
      for (let j = 0; j <= 20; j++) {
        const f = j / 20
        const wave = (0.008 + 0.006 * (stir - 1)) * Math.sin(f * 11 - t * 4.2 + i * 2.1) * Math.min(1, f * 5)
        p.vertex((x0 + len * f) * k, (RIM_Y + 0.02 + (0.04 + 0.03 * i) * Math.min(1, f * 5) + wave) * k)
      }
      p.endShape()
    }
    for (const side of [-1, 1]) {
      const x0 = JX + side * 0.06
      const sway = 0.02 * stir * Math.sin(t * 2.4 * Math.min(stir, 1.5) + side)
      const pts = [x0, RIM_Y, x0 + sway, RIM_Y + 0.04, x0 - sway + 0.015, RIM_Y + 0.07, x0 + sway * 0.6 + 0.03, RIM_Y + 0.095].map((v) => v * k) as [number, number, number, number, number, number, number, number]
      p.push()
      p.noFill()
      p.stroke(ink)
      p.strokeWeight(weight * 2.8)
      p.bezier(...pts)
      p.stroke(s.color)
      p.strokeWeight(weight * 1.2)
      p.bezier(...pts)
      p.pop()
    }

    // The bell: a dome, caved in round the crown by however far it is dimpled, over a scalloped rim.
    solid(p, ink, weight, s.color)
    p.beginShape()
    const n = 40
    for (let i = 0; i <= n; i++) {
      const u = -1 + (2 * i) / n
      const x = u * half
      p.vertex((JX + x) * k, (RIM_Y - (RIM_Y - CROWN_Y + 0.012 * breath) * Math.sqrt(1 - u * u) + dip * Math.exp(-(x * x) / (DIMPLE * DIMPLE))) * k)
    }
    for (let i = 0; i < 4; i++) p.quadraticVertex((JX + half - ((i + 0.5) * 2 * half) / 4) * k, (RIM_Y + 0.07) * k, (JX + half - ((i + 1) * 2 * half) / 4) * k, (RIM_Y + 0.012) * k)
    p.endShape(p.CLOSE)

    // The lights round the rim: dark until the bounce, then on from the middle outward, and out the same way.
    for (let i = -3; i <= 3; i++) {
      const lit = since > Math.abs(i) * 0.07 && since < 0.9 + Math.abs(i) * 0.22
      if (!lit) continue
      solid(p, ink, weight * 0.45, s.light)
      p.circle((JX + i * 0.095 * (half / HALF)) * k, (RIM_Y - 0.03 - 0.002 * (9 - i * i)) * k, 0.046 * k)
    }
    // Two eyes on the ball, shut tight through the bounce.
    const shut = since > -DOWN - 0.04 && since < 0.22
    for (const dx of [-0.075, 0.075]) {
      const ex = JX + dx
      const ey = RIM_Y - 0.115 + dip * 0.35
      if (shut) {
        outline(p, ink, weight * 0.8)
        p.line((ex - 0.025) * k, ey * k, (ex + 0.025) * k, ey * k)
        continue
      }
      const look = Math.atan2(ball.y - ey, ball.x - ex)
      solid(p, ink, weight * 0.7, bg)
      p.circle(ex * k, ey * k, 0.062 * k)
      p.noStroke()
      p.fill(ink)
      p.circle((ex + Math.cos(look) * 0.012) * k, (ey + Math.sin(look) * 0.012) * k, 0.03 * k)
    }

    // The sea in front: what is under the line is under water.
    water(p, k, ink, weight, -0.5, 1.5)
    // The water the bell shoves aside as it is pressed down, and again as it rings.
    splash(p, k, seaWater(theme), weight, JX - HALF - 0.08, 0.37, over(t, T_TOUCH + 0.03, T_TOUCH + 0.55), 0.7)
    splash(p, k, seaWater(theme), weight, JX + HALF + 0.08, 0.37, over(t, T_TOUCH + 0.03, T_TOUCH + 0.55), 0.7)
    // The bounce: a puff of lines off the crown.
    if (since > UP && since < UP + 0.25) {
      const f = over(since, UP, UP + 0.25)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight * (1 - f * 0.5))
      for (const a of [-2.5, -2.05, -1.1, -0.65]) {
        const r0 = 0.13 + 0.16 * f
        const r1 = r0 + 0.09 * (1 - f * 0.6)
        p.line((JX + Math.cos(a) * r0) * k, (CROWN_Y + Math.sin(a) * r0) * k, (JX + Math.cos(a) * r1) * k, (CROWN_Y + Math.sin(a) * r1) * k)
      }
      p.pop()
    }
  },
})

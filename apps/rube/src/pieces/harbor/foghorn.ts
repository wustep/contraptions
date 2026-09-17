import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { FAST, FLOOR, R, ROLL, definePiece, flick, over, rail, ramp, roll, trace, type Lane, type Pt } from '../../parts'
import { piling, seaColor, water } from './sea'

/**
 * A foghorn. A brass horn on a hollow post, aimed down the pier; under the
 * deck a bellows, and over the bellows a treadle plank. The ball rolls out
 * along the plank and the further it goes the harder it bears down: the
 * bellows wheezes shut, and at full squeeze the horn sounds — right behind
 * the ball, which the blast sends off down the deck faster than it came.
 * The horn kicks back on its bracket and quivers; the gull that was asleep
 * on it goes straight up, flaps there until the noise is over, and comes
 * down again to tuck its head back in. The plank springs up and the
 * bellows draws breath.
 */
/** The treadle: hinged at its west end, its free end sinking onto the bellows. */
const HINGE = -0.44
const PLANK_E = -0.06
const SINK = 0.035
/** The ball bears the plank down as it rolls from here to here. */
const BEAR0 = -0.4
const BEAR1 = -0.2
/** Where the ball's rim meets the fixed deck's corner, coming up off the sunken plank. */
const CORNER = PLANK_E - Math.sqrt(2 * R * SINK - SINK * SINK)
/** The blast: how long the ball takes to get up to pace, how far it holds it, and the run back down to the rail's. */
const KICK = 0.08
const HOLD_TO = 0.22
const T_FIRE = (BEAR1 + 0.5) / ROLL
const T_KICKED = T_FIRE + KICK
const X_KICKED = BEAR1 + ((ROLL + FAST) / 2) * KICK

/** The ball along the deck: at the rail's pace to the fire, then shoved. */
const xAt = (t: number) => (t < T_FIRE ? -0.5 + ROLL * t : BEAR1 + ROLL * (t - T_FIRE) + ((FAST - ROLL) / KICK / 2) * Math.pow(Math.min(t, T_KICKED) - T_FIRE, 2) + FAST * Math.max(0, t - T_KICKED))
/** When the ball is over the hinge, and when it is up off the plank and onto the deck. */
const T_ON = (HINGE + 0.5) / ROLL
const T_LEAVE = (() => {
  let t = T_FIRE
  while (xAt(t) < PLANK_E) t += 0.001
  return t
})()

/** How far down the plank is, 0 to 1: borne down as the ball rolls out along it, sprung back once it is off. */
const pressAt = (t: number) => (t < T_LEAVE ? easeInOutSine(over(xAt(t), BEAR0, BEAR1)) : 1 - easeOutCubic(over(t, T_LEAVE, T_LEAVE + 0.3)))
/** The ball on the plank, and over the deck's corner at its end. */
function ballAt(t: number): Pt {
  const x = xAt(t)
  const dip = (at: number) => (pressAt(t) * SINK * (at - HINGE)) / (PLANK_E - HINGE)
  if (x <= CORNER) return [x, dip(x)]
  if (x < PLANK_E) return [x, lerp(dip(CORNER), 0, (x - CORNER) / (PLANK_E - CORNER))]
  return [x, 0]
}
const RIDE = trace(ballAt, T_ON, T_KICKED, 20)
const LANE: Lane = {
  segs: [roll([-0.5, 0], [HINGE, 0], ROLL), ...RIDE, roll([X_KICKED, 0], [HOLD_TO, 0], FAST), ramp([HOLD_TO, 0], [0.5, 0], FAST, ROLL)],
  fire: T_FIRE,
}

/** The post the horn stands on, the joint it kicks about, and the mouth. */
const POST = -0.4
const THROAT: Pt = [-0.38, -0.27]
const MOUTH: Pt = [-0.1, -0.2]
const MOUTH_R = 0.1
const AXIS = Math.atan2(MOUTH[1] - THROAT[1], MOUTH[0] - THROAT[0])
/** How long the horn sounds. */
const BLARE = 0.45
/** The gull is in the air from the fire until here, and coming down from here. */
const GULL_UP = 0.75
const GULL_DOWN = 1.35
/** Where the gull sits: on the horn's back, part way along. */
const PERCH: Pt = [-0.27, -0.285]

export const foghorn = definePiece<{ color: string }>({
  name: 'foghorn',
  weight: 0.8,
  place: ({ color, fits, theme }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: seaColor(theme, color) } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const press = pressAt(t)
    const sounding = since > 0 && since < BLARE
    // The horn kicks back on its bracket and quivers while it sounds.
    const kick = since < 0 ? 0 : -0.16 * flick(since, 0.04, 0.12, 0.6) + (sounding ? 0.015 * Math.sin(since * 90) : 0)

    water(p, k, ink, weight, -0.5, 0.5)
    piling(p, k, ink, weight, 0.36)
    rail(p, k, ink, weight, -0.5, HINGE)
    rail(p, k, ink, weight, PLANK_E, 0.5)

    // The hollow post, from the seabed up to the horn's throat, and the pipe from the bellows into it.
    outline(p, ink, weight * 1.3)
    p.line(POST * k, 0.5 * k, POST * k, (THROAT[1] + 0.02) * k)
    outline(p, ink, weight)
    p.line((POST - 0.06) * k, 0.5 * k, (POST + 0.06) * k, 0.5 * k)
    const boardY = FLOOR + 0.17
    p.line(POST * k, boardY * k, -0.12 * k, boardY * k)

    // The bellows under the plank: a fixed board on the pipe, the plank for its lid, pleats between that close as it comes down.
    const x0 = -0.3
    const x1 = -0.12
    const lid = (x: number) => FLOOR + 0.035 + (press * SINK * (x - HINGE)) / (PLANK_E - HINGE)
    solid(p, ink, weight * 0.8, s.color)
    p.beginShape()
    p.vertex(x0 * k, lid(x0) * k)
    p.vertex(x1 * k, lid(x1) * k)
    p.vertex((x1 + 0.025 * (0.4 + press)) * k, ((lid(x1) + boardY) / 2) * k)
    p.vertex(x1 * k, boardY * k)
    p.vertex(x0 * k, boardY * k)
    p.vertex((x0 - 0.025 * (0.4 + press)) * k, ((lid(x0) + boardY) / 2) * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.7)
    p.line((x0 - 0.025 * (0.4 + press)) * k, ((lid(x0) + boardY) / 2) * k, (x1 + 0.025 * (0.4 + press)) * k, ((lid(x1) + boardY) / 2) * k)

    // The treadle.
    p.push()
    p.translate(HINGE * k, FLOOR * k)
    p.rotate(Math.atan((press * SINK) / (PLANK_E - HINGE)))
    solid(p, ink, weight, s.color)
    p.rect(((PLANK_E - HINGE) / 2) * k, 0.012 * k, (PLANK_E - HINGE) * k, 0.04 * k, 0.008 * k)
    p.pop()
    solid(p, ink, weight, ink)
    p.circle(HINGE * k, (FLOOR + 0.012) * k, 0.035 * k)

    // The horn: a throat on the post's head flaring to a wide mouth, aimed down the deck after the ball.
    p.push()
    p.translate(THROAT[0] * k, THROAT[1] * k)
    p.rotate(AXIS + kick)
    const len = Math.hypot(MOUTH[0] - THROAT[0], MOUTH[1] - THROAT[1])
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.03 * k, -0.028 * k)
    p.bezierVertex(len * 0.5 * k, -0.032 * k, len * 0.82 * k, -0.045 * k, len * k, -MOUTH_R * k)
    p.vertex(len * k, MOUTH_R * k)
    p.bezierVertex(len * 0.82 * k, 0.045 * k, len * 0.5 * k, 0.032 * k, -0.03 * k, 0.028 * k)
    p.endShape(p.CLOSE)
    // The mouth, seen a little from the side, dark inside.
    solid(p, ink, weight, ink)
    p.ellipse(len * k, 0, 0.055 * k, MOUTH_R * 2 * k)
    p.pop()
    // The bracket that holds it to the post.
    outline(p, ink, weight)
    p.line(POST * k, (THROAT[1] + 0.1) * k, (THROAT[0] + 0.1) * k, (THROAT[1] + 0.045) * k)

    // The gull: asleep on the horn's back; blown off it, straight up, flapping there; down again when it is
    // quiet, and a while after that its head goes back in.
    const up = since < 0 ? 0 : since < 0.12 ? easeOutCubic(since / 0.12) : since < GULL_UP ? 1 : 1 - easeInOutSine(over(since, GULL_UP, GULL_DOWN))
    gull(p, k, ink, weight, bg, s.color, PERCH[0] - 0.02 * up, PERCH[1] - 0.05 * up + 0.008 * Math.sin(since * 14) * up - 0.004 * (1 - up) * (1 + Math.sin(t * 2.4)), up, since < 0 || since > GULL_DOWN + 0.7, t)

    // The blast: three arcs off the mouth, one after another, racing out after the ball and thinning to nothing.
    if (since > 0 && since < BLARE + 0.3) {
      p.push()
      p.noFill()
      p.stroke(s.color)
      for (let i = 0; i < 3; i++) {
        const f = over(since - i * 0.1, 0, 0.42)
        if (f <= 0 || f >= 1) continue
        const r = 0.1 + 0.36 * easeOutCubic(f)
        p.strokeWeight(weight * 1.5 * (1 - f))
        p.arc(MOUTH[0] * k, MOUTH[1] * k, r * 2 * k, r * 2 * k, AXIS - 0.6, AXIS + 0.4)
      }
      p.pop()
    }
  },
})

/**
 * A gull standing at (x, y): asleep with its head tucked in, or awake;
 * `lift` from 0 (standing, wings folded) to 1 (wings out and beating on `clock`).
 */
function gull(p: p5, k: number, ink: string, weight: number, bg: string, color: string, x: number, y: number, lift: number, asleep: boolean, clock: number): void {
  const bx = x
  const by = y - 0.055
  // Legs, tucked up as it flies.
  outline(p, ink, weight * 0.8)
  for (const dx of [-0.015, 0.02]) p.line((bx + dx) * k, (by + 0.03) * k, (bx + dx) * k, (y - 0.02 * lift) * k)
  // The body, tail to the west; the head on its short neck, or sunk into the shoulders.
  solid(p, ink, weight, bg)
  p.beginShape()
  p.vertex((bx - 0.1) * k, (by - 0.015) * k)
  p.bezierVertex((bx - 0.04) * k, (by - 0.05) * k, (bx + 0.05) * k, (by - 0.05) * k, (bx + 0.07) * k, (by - 0.01) * k)
  p.bezierVertex((bx + 0.06) * k, (by + 0.04) * k, (bx - 0.03) * k, (by + 0.045) * k, (bx - 0.1) * k, (by - 0.015) * k)
  p.endShape(p.CLOSE)
  const hx = bx + (asleep ? 0.035 : 0.06)
  const hy = by - (asleep ? 0.035 : 0.06)
  p.circle(hx * k, hy * k, 0.06 * k)
  solid(p, ink, weight * 0.7, color)
  p.triangle((hx + 0.025) * k, (hy - 0.012) * k, (hx + 0.025) * k, (hy + 0.014) * k, (hx + 0.065) * k, (hy + 0.006) * k)
  if (asleep) {
    outline(p, ink, weight * 0.7)
    p.line((hx - 0.004) * k, (hy - 0.004) * k, (hx + 0.014) * k, (hy - 0.004) * k)
  } else {
    p.noStroke()
    p.fill(ink)
    p.circle((hx + 0.006) * k, (hy - 0.006) * k, 0.016 * k)
  }
  // The wing: folded along the back, or out and beating.
  p.push()
  p.translate((bx + 0.01) * k, (by - 0.025) * k)
  p.rotate(Math.PI - 0.12 + lift * (0.12 + 0.5 * Math.sin(clock * 38)))
  solid(p, ink, weight * 0.9, bg)
  p.beginShape()
  p.vertex(0, 0)
  p.bezierVertex(0.04 * k, -0.035 * k, (0.09 + 0.03 * lift) * k, -0.03 * k, (0.12 + 0.04 * lift) * k, 0.005 * k)
  p.bezierVertex(0.08 * k, 0.02 * k, 0.03 * k, 0.022 * k, 0, 0)
  p.endShape(p.CLOSE)
  p.pop()
}

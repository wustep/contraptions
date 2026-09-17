import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { ROLL, definePiece, laneAt, over, rail, ramp, roll, wait, type BallChange, type Lane, type Pt } from '../../parts'
import { piling, water } from './sea'

/**
 * A sea anemone in a rock pool, in a gap in the pier. It stands up out of
 * the pool on its column, its crown level with the deck, a fan of
 * tentacles behind the ball's line and a fringe hanging down the front,
 * and none of them is ever still: they sway on their own, and they lean
 * toward the ball as it comes. The deck dips into the crown; the ball
 * rolls in and stops on the mouth, and the tentacles close over it like a
 * fist — the fan from behind, the fringe up from the front, so the ball is
 * seen between them — and squeeze twice. When they open the ball is the
 * anemone's colour, for good, and a wave runs through the fan and
 * shoulders it out the far side. A few motes of the colour drift up after.
 *
 * The anemone is painted the colour it gives, so the ball is seen to take
 * it from the animal.
 */
const EDGE = 0.27
/** The ball's seat on the mouth: a hair under the rail's line, in the crown. */
const SEAT: Pt = [0, 0.035]
/** The crown: where the tentacles are rooted. */
const RIM_Y = 0.17
const RIM_RX = 0.15
const T_DIP = (0.5 - 0.22) / ROLL
const T_STOP = T_DIP + 0.22 / (ROLL / 2)
/** A beat on the mouth, then the tentacles close; shut, it squeezes twice; then opens and the ball is let go. */
const BEAT = 0.08
const CLOSE = 0.16
const FIRE = T_STOP + BEAT + CLOSE
const HOLD = 0.62
const OPEN = 0.24
const GO = HOLD + OPEN * 0.55
/** The colour takes while the fist is shut. */
const STAIN_AT = 0.12
const STAIN_OVER = 0.42

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [-0.22, 0], ROLL),
    ramp([-0.22, 0], SEAT, ROLL, 0),
    wait(SEAT, BEAT + CLOSE + GO),
    ramp(SEAT, [0.5, 0], 0, ROLL),
  ],
  fire: FIRE,
}

/** How shut the fist is, `since` it closed: 0 open, 1 shut. */
function gripAt(since: number): number {
  if (since < -CLOSE) return 0
  if (since < 0) return easeInQuad(over(since, -CLOSE, 0))
  if (since < HOLD) return 1
  return 1 - easeOutCubic(over(since, HOLD, HOLD + OPEN))
}

/** The squeeze while it is shut: two pulses. */
const squeezeAt = (since: number): number => (since > 0.06 && since < HOLD - 0.04 ? Math.pow(Math.sin(((since - 0.06) / (HOLD - 0.1)) * Math.PI * 2), 2) : 0)

interface Tentacle {
  /** Where it is rooted on the crown. */
  x: number
  y: number
  /** Which way it points when open, radians, y down. */
  open: number
  len: number
  /** Where its tip goes when the fist is shut. */
  tip: Pt
  phase: number
}

/** The fan behind the ball: five, standing up and out. */
const FAN: Tentacle[] = [-2, -1, 0, 1, 2].map((i) => ({
  x: i * 0.066,
  y: RIM_Y - 0.025 + 0.008 * Math.abs(i),
  open: -Math.PI / 2 + i * 0.58,
  len: 0.3 - 0.025 * Math.abs(i),
  tip: [i * 0.035 + 0.02, -0.17 + 0.012 * Math.abs(i)] as Pt,
  phase: i * 1.3 + 0.4,
}))
/** The fringe in front of it: four, hanging down over the column's lip until they are wanted. */
const FRINGE: Tentacle[] = [-1.5, -0.5, 0.5, 1.5].map((i) => ({
  x: i * 0.074,
  y: RIM_Y + 0.012,
  open: Math.PI / 2 - i * 0.62,
  len: 0.13,
  tip: [i * 0.045 - 0.02, -0.15 + 0.015 * Math.abs(i)] as Pt,
  phase: i * 1.9 + 2,
}))

/** One tentacle as a cubic: open it points along its angle, arching; shut it bows out round the ball and over to its tip. */
function curve(tn: Tentacle, grip: number, swing: number, squeeze: number): [Pt, Pt, Pt, Pt] {
  const a = tn.open + swing
  const up = lerp(a, a < 0 ? -Math.PI / 2 : Math.PI / 2, 0.55)
  const o0: Pt = [tn.x, tn.y]
  const o1: Pt = [tn.x + Math.cos(up) * tn.len * 0.4, tn.y + Math.sin(up) * tn.len * 0.4]
  const o3: Pt = [tn.x + Math.cos(a) * tn.len, tn.y + Math.sin(a) * tn.len]
  const o2: Pt = [o3[0] - Math.cos(a + 0.5 * Math.sign(tn.x || 0.3)) * tn.len * 0.3, o3[1] - Math.sin(a + 0.5 * Math.sign(tn.x || 0.3)) * tn.len * 0.3]
  // Shut: out round the ball's side and over its top, drawn in a little by the squeeze.
  const side = tn.x < 0 ? -1 : 1
  const bow = (0.2 - 0.025 * squeeze) * (0.45 + Math.abs(tn.x) / RIM_RX)
  const c1: Pt = [tn.x + side * bow * 0.7, tn.y - 0.13]
  const c2: Pt = [tn.tip[0] + side * bow * 0.55, tn.tip[1] - 0.02 + 0.015 * squeeze]
  const c3: Pt = [tn.tip[0], tn.tip[1] + 0.02 * squeeze]
  const g = easeInOutSine(grip)
  const mix = (p0: Pt, p1: Pt): Pt => [lerp(p0[0], p1[0], g), lerp(p0[1], p1[1], g)]
  return [o0, mix(o1, c1), mix(o2, c2), mix(o3, c3)]
}

function tentacles(p: p5, k: number, ink: string, weight: number, color: string, set: Tentacle[], t: number, since: number, ballX: number): void {
  const grip = gripAt(since)
  const squeeze = squeezeAt(since)
  for (const tn of set) {
    // Never still: each sways on its own clock, leans toward the ball while it is coming, and the fan throws a wave after it as it goes.
    const idle = 0.16 * Math.sin(t * 1.7 + tn.phase) + 0.07 * Math.sin(t * 2.9 + tn.phase * 2)
    const lean = since < -CLOSE ? 0.22 * clamp((ballX - tn.x) * 2.2, -1, 1) * over(ballX, -1.4, -0.4) : 0
    const shove = since > GO ? 0.55 * Math.sin(clamp((since - GO) * 5 - (tn.x + 0.15) * 3, 0, 1) * Math.PI) : 0
    const [a, b, c, d] = curve(tn, grip, (idle + lean) * (1 - grip) + shove * (tn.open < 0 ? 1 : -0.4), squeeze)
    p.push()
    p.noFill()
    p.stroke(ink)
    p.strokeWeight(weight * 3.1)
    p.bezier(a[0] * k, a[1] * k, b[0] * k, b[1] * k, c[0] * k, c[1] * k, d[0] * k, d[1] * k)
    p.stroke(color)
    p.strokeWeight(weight * 1.5)
    p.bezier(a[0] * k, a[1] * k, b[0] * k, b[1] * k, c[0] * k, c[1] * k, d[0] * k, d[1] * k)
    p.pop()
  }
}

export const anemone = definePiece<{ color: string }>({
  name: 'anemone',
  weight: 0.9,
  dynamic: true,
  place: ({ rng, fits, theme, ball }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    // The anemone is never the colour the ball arrives in; with nothing else to offer, it stays out of the map.
    const pool = theme.colors.filter((c) => c !== ball.color)
    if (!pool.length) return null
    const paint = rng.pick(pool)
    const changes: BallChange[] = [{ at: FIRE + STAIN_AT, color: paint, over: STAIN_OVER }]
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color: paint }, changes }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const squeeze = squeezeAt(since)
    const ballX = t < 0 ? -0.5 + t * ROLL : laneAt(LANE, t).x

    // The pier either side of the pool.
    rail(p, k, ink, weight, -0.5, -EDGE)
    rail(p, k, ink, weight, EDGE, 0.5)
    piling(p, k, ink, weight, -EDGE - 0.12)
    piling(p, k, ink, weight, EDGE + 0.12)
    // The pool: rocks either side, the floor between.
    solid(p, ink, weight, bg)
    p.arc(-0.3 * k, 0.5 * k, 0.3 * k, 0.3 * k, Math.PI, Math.PI * 2, p.CHORD)
    p.arc(0.31 * k, 0.5 * k, 0.26 * k, 0.24 * k, Math.PI, Math.PI * 2, p.CHORD)
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)

    // The fan, behind the ball.
    tentacles(p, k, ink, weight, s.color, FAN, t, since, ballX)
    // The column: a foot on the pool's floor, a waist, a flare under the crown; it swells with each squeeze.
    const fat = 0.018 * squeeze
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.17 * k, 0.5 * k)
    p.bezierVertex(-0.1 * k, 0.46 * k, (-0.1 - fat) * k, 0.3 * k, -RIM_RX * k, RIM_Y * k)
    p.vertex(RIM_RX * k, RIM_Y * k)
    p.bezierVertex((0.1 + fat) * k, 0.3 * k, 0.1 * k, 0.46 * k, 0.17 * k, 0.5 * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.7)
    for (const x of [-0.045, 0.045]) p.line(x * k, 0.27 * k, x * 1.2 * k, 0.45 * k)
    // The crown's disc and the mouth the ball sits on.
    solid(p, ink, weight, s.color)
    p.ellipse(0, RIM_Y * k, RIM_RX * 2 * k, 0.07 * k)
    p.noStroke()
    p.fill(ink)
    p.ellipse(0, (RIM_Y - 0.002) * k, 0.12 * k, 0.026 * k)
  },
  over: (p, s, { k, t, since, ink, weight }) => {
    const ballX = t < 0 ? -0.5 + t * ROLL : laneAt(LANE, t).x
    // The crown's near lip, so the ball sits in it and not on it.
    outline(p, ink, weight)
    p.arc(0, RIM_Y * k, RIM_RX * 2 * k, 0.07 * k, 0.1, Math.PI - 0.1)
    // The fringe, in front of the ball: down the column's lip, or up and over with the rest of the fist.
    tentacles(p, k, ink, weight, s.color, FRINGE, t, since, ballX)
    // The pool's water, in front of everything in it.
    water(p, k, ink, weight, -0.17, 0.19, 0.43)

    // Motes of the colour drifting up as it opens.
    if (since > HOLD && since < HOLD + 1.3) {
      const f = over(since, HOLD, HOLD + 1.3)
      p.push()
      p.noStroke()
      p.fill(s.color)
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.5
        const r = 0.2 + 0.26 * easeOutCubic(f)
        p.circle((Math.cos(a) * r * 0.8 + 0.02 * Math.sin(f * 8 + i)) * k, (0.02 + Math.sin(a) * r) * k, 0.04 * (1 - f) * k)
      }
      p.pop()
    }
  },
})

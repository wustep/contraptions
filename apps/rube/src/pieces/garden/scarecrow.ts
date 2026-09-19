import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutCubic, lerp } from '../../../../../src/core/ease'
import { R, ROLL, definePiece, laneAt, laneReach, over, rail, ramp, roll, type Lane, type PieceCtx, type Pt } from '../../parts'
import { tuft } from './green'

/**
 * A scarecrow on a pole behind the path, loose on it like a weathervane.
 * It stands turned a little toward us, so one sleeve — the one whose stick
 * broke, and hangs — dangles its straw hand in the ball's way. The ball
 * shoulders the hand along until the arm points straight out at us, and
 * then the whole figure is flung round on its pole, nearly two turns,
 * slowing, the loose hand swinging wide; it stops the way it stood. The
 * crow on its other arm goes up at the knock, flaps about over the
 * spinning hat, and comes back down when the arm is still. Punctuation.
 *
 * The figure turns about a vertical pole, seen from the side: the arms
 * foreshorten with the cosine of the turn, the round head and hat do not,
 * and the face comes and goes round the head.
 */
const POLE_X = 0.06
const ARM = 0.3
const ARM_Y = -0.19
const HEAD_Y = -0.325
const HEAD_R = 0.08
/** How far along its arm a sleeve's cuff is, and where the shirt's hem hangs. */
const CUFF = 0.86
const HEM = 0.015
/** How it stands: turned this far from square on, the hanging hand toward us and the ball. */
const REST = 0.45
/** How far ahead of the ball's centre the hand is pushed: the ball's half-width at the height of the straw, and half the hand's. */
const REACH = Math.sqrt(R * R - 0.06 * 0.06) + 0.035
const TOUCH = POLE_X - ARM * Math.cos(REST) - REACH
const LET_GO = POLE_X - REACH
/** Flung from pointing at us round to how it stood, two turns on: an exponential run-down. */
const SPIN = REST + Math.PI * 4 - Math.PI / 2
const TAU = 0.55

const LANE: Lane = {
  segs: [roll([-0.5, 0], [TOUCH, 0], ROLL), ramp([TOUCH, 0], [LET_GO, 0], ROLL, ROLL * 0.78), ramp([LET_GO, 0], [0.5, 0], ROLL * 0.78, ROLL)],
  fire: 0,
}
LANE.fire = laneReach(LANE, LET_GO)
const T_TOUCH = laneReach(LANE, TOUCH)

/** The figure's turn about its pole: standing, pushed by the ball's shoulder, then flung. */
function turnAt(t: number, since: number): number {
  if (since >= 0) return Math.PI / 2 + SPIN * (1 - Math.exp(-since / TAU))
  if (t < T_TOUCH) return REST
  return Math.acos(clamp((POLE_X - (laneAt(LANE, t).x + REACH)) / ARM, -1, 1))
}
/** How fast it is turning, radians a second. */
const spinAt = (since: number) => (since < 0 ? 0 : (SPIN / TAU) * Math.exp(-since / TAU))

/** The crow: up at the knock, about over the hat while the arms go round, back down onto the arm when it is still. */
const PERCH: Pt = [POLE_X + ARM * Math.cos(REST), ARM_Y - 0.012]
const HOVER: Pt = [0.34, -0.37]
const T_DOWN = 2.0
const T_PERCHED = 2.6

export const scarecrow = definePiece<{ color: string }>({
  name: 'scarecrow',
  weight: 0.9,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, c) => {
    const { k, t, since, ink, bg, weight } = c
    const a = turnAt(t, since)
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const near: Pt = [POLE_X - ARM * cos, ARM_Y]
    const far: Pt = [POLE_X + ARM * cos, ARM_Y]

    // The ground, the pole standing in it behind the path, and the path.
    outline(p, ink, weight)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    tuft(p, k, ink, weight, -0.3, 0.5, 0.09, 0.02)
    tuft(p, k, ink, weight, 0.34, 0.5, 0.07, -0.02)
    outline(p, ink, weight * 1.4)
    p.line(POLE_X * k, 0.5 * k, POLE_X * k, (ARM_Y + 0.1) * k)
    outline(p, ink, weight)
    p.line((POLE_X - 0.06) * k, 0.5 * k, (POLE_X + 0.06) * k, 0.5 * k)
    rail(p, k, ink, weight, -0.5, 0.5)

    // The hand hangs behind the shirt while its arm is turned away from us.
    if (sin <= 0) hand(p, s.color, c, near, spinAt(since), cos)
    // The sticks out of the cuffs, and the far one's straw.
    stick(p, c, near, true)
    stick(p, c, far, false)
    // The shirt: one shape, cuff to cuff and down to the hem, so nothing
    // inside it is a line. It is wider than it is deep, so it narrows as it
    // turns, and the sleeves draw in to the shoulders with the arms.
    const w = 0.13 + 0.09 * Math.abs(cos)
    const reach = Math.max(w * 0.45, ARM * CUFF * Math.abs(cos))
    const top = ARM_Y - 0.05
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex((POLE_X - reach) * k, (top + 0.012) * k)
    p.vertex((POLE_X - w * 0.3) * k, top * k)
    p.vertex((POLE_X + w * 0.3) * k, top * k)
    p.vertex((POLE_X + reach) * k, (top + 0.012) * k)
    p.vertex((POLE_X + reach) * k, (ARM_Y + 0.036) * k)
    p.vertex((POLE_X + w * 0.45) * k, (ARM_Y + 0.055) * k)
    p.vertex((POLE_X + w * 0.62) * k, HEM * k)
    p.vertex((POLE_X - w * 0.62) * k, HEM * k)
    p.vertex((POLE_X - w * 0.45) * k, (ARM_Y + 0.055) * k)
    p.vertex((POLE_X - reach) * k, (ARM_Y + 0.036) * k)
    p.endShape(p.CLOSE)
    // Straw out of the hem.
    outline(p, ink, weight * 0.8)
    for (const dx of [-0.36, 0.04, 0.4]) p.line((POLE_X + w * dx) * k, HEM * k, (POLE_X + w * dx * 1.3) * k, (HEM + 0.045) * k)

    // The head: a round sack, which looks the same from every side but for the face, and the hat on it.
    solid(p, ink, weight, bg)
    p.circle(POLE_X * k, HEAD_Y * k, HEAD_R * 2 * k)
    if (cos > 0.12) {
      // The face rides round the sack: two button eyes and a stitched mouth.
      const fx = POLE_X + HEAD_R * 0.85 * sin
      p.noStroke()
      p.fill(ink)
      for (const u of [-0.03, 0.03]) p.ellipse((fx + u * cos) * k, (HEAD_Y - 0.012) * k, 0.022 * cos * k, 0.022 * k)
      outline(p, ink, weight * 0.7)
      p.line((fx - 0.028 * cos) * k, (HEAD_Y + 0.032) * k, (fx + 0.028 * cos) * k, (HEAD_Y + 0.032) * k)
    }
    solid(p, ink, weight, s.color)
    p.rect(POLE_X * k, (HEAD_Y - HEAD_R - 0.025) * k, 0.12 * k, 0.085 * k, 0.012 * k)
    p.rect(POLE_X * k, (HEAD_Y - HEAD_R + 0.018) * k, 0.25 * k, 0.03 * k, 0.012 * k)

    // The crow.
    crow(p, c, a)
  },
  over: (p, s, c) => {
    // The hanging hand is in front of the ball whenever its arm is turned toward us.
    const a = turnAt(c.t, c.since)
    if (Math.sin(a) > 0) hand(p, s.color, c, [POLE_X - ARM * Math.cos(a), ARM_Y], spinAt(c.since), Math.cos(a))
  },
})

/** What shows of an arm's stick past its cuff, and the straw out of the far one's end. The near stick is broken short; its hand hangs. */
function stick(p: p5, { k, ink, weight }: PieceCtx, tip: Pt, broken: boolean): void {
  const dx = tip[0] - POLE_X
  const cuff = POLE_X + dx * CUFF
  outline(p, ink, weight * 1.2)
  p.line(cuff * k, ARM_Y * k, tip[0] * k, tip[1] * k)
  if (broken) return
  outline(p, ink, weight * 0.8)
  for (const dy of [-0.03, 0, 0.03]) p.line(cuff * k, (ARM_Y + dy * 0.6) * k, (tip[0] + dx * 0.08) * k, (ARM_Y + dy * 1.4) * k)
}

/** The hand that hangs from the near arm's end: a cuff of coat and a bundle of straw, swinging wide while the figure spins. */
function hand(p: p5, color: string, { k, ink, weight }: PieceCtx, tip: Pt, spin: number, cos: number): void {
  p.push()
  p.translate(tip[0] * k, tip[1] * k)
  // Flung outward by the spin, as far as we can see of it from the side.
  p.rotate(clamp(spin / 22) * 1.1 * cos)
  solid(p, ink, weight, color)
  p.quad(-0.04 * k, -0.035 * k, 0.04 * k, -0.035 * k, 0.034 * k, 0.1 * k, -0.034 * k, 0.1 * k)
  outline(p, ink, weight * 0.8)
  for (const dx of [-0.026, 0, 0.026]) p.line(dx * k, 0.1 * k, dx * 1.5 * k, 0.17 * k)
  p.pop()
}

/** The crow, ink all through: perched on the far arm, startled up by the knock, flapping over the spin, and down again. */
function crow(p: p5, { k, t, since, ink, bg, weight }: PieceCtx, turn: number): void {
  const started = t - T_TOUCH
  const perch: Pt = [POLE_X + ARM * Math.cos(turn), PERCH[1]]
  const up = started < 0 ? 0 : since < T_DOWN ? easeOutCubic(over(started, 0, 0.3)) : 1 - easeInOutSine(over(since, T_DOWN, T_PERCHED))
  const bob = up * 0.02 * Math.sin(t * 9)
  const x = lerp(perch[0], HOVER[0], up)
  const y = lerp(perch[1], HOVER[1] + bob, up) - 0.045
  const flying = up > 0.02
  // It faces away down the path; perched, it looks back at the scarecrow now and then.
  const look = !flying && Math.sin(t * 0.9) > 0.7 ? -1 : 1

  p.push()
  p.translate(x * k, y * k)
  p.scale(look, 1)
  // Legs, only when they are under it.
  if (!flying) {
    outline(p, ink, weight * 0.7)
    for (const dx of [-0.012, 0.014]) p.line(dx * k, 0.03 * k, dx * k, 0.046 * k)
  }
  solid(p, ink, weight * 0.6, ink)
  // Tail, body, head, beak.
  p.triangle(-0.04 * k, 0, -0.105 * k, 0.012 * k, -0.095 * k, 0.04 * k)
  p.ellipse(0, 0, 0.12 * k, 0.075 * k)
  p.circle(0.05 * k, -0.035 * k, 0.06 * k)
  p.triangle(0.072 * k, -0.05 * k, 0.122 * k, -0.03 * k, 0.074 * k, -0.02 * k)
  p.noStroke()
  p.fill(bg)
  p.circle(0.056 * k, -0.04 * k, 0.016 * k)
  // Wings: folded along the back, or beating.
  solid(p, ink, weight * 0.6, ink)
  if (flying) {
    const beat = Math.sin(t * 34)
    p.triangle(-0.05 * k, -0.005 * k, 0.035 * k, -0.005 * k, -0.045 * k, (-0.01 - 0.1 * beat) * k)
  }
  p.pop()
}

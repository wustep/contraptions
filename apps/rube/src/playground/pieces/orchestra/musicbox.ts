import { outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, rail, ramp, trace, type Lane, type Pt } from '../../../parts'
import { brass, feltColor, ivory } from './hall'

/**
 * A music box with its movement out of proportion to its case: a great
 * pinned brass cylinder seen end on, half sunk in the box, with one pin
 * grown into a ledge that lies level with the rail. The ball rolls out onto
 * the ledge and up against the brass; its weight lets the spring go, the
 * key in the case's front begins to turn, and the cylinder goes round at a
 * music box's pace with the ball in the crook of the ledge, up the near
 * side and onto the top, a floor up, where the rail takes it off. The other
 * pins go down the far side past the comb, seen edge on as one steel tooth,
 * and each lifts its tip and lets it go to sing. The cylinder stops a
 * little past the top, on the last pin's note.
 *
 * The cylinder's turn is one function of the piece's clock: the ball's
 * seat, the pins, the comb's plucks and the key are all read from it.
 */
/** The cylinder's axis, level with the rail's ball; the ball rides a radius off the brass, so the top is a floor up. */
const CX = 0.55
const BRASS = 1 - R
/** The ledge's leading face is this far round behind the ball's centre, so the face is a radius from it. */
const BEHIND = Math.asin(R / 1)
const LEDGE = 0.17
/** The turn: the spring's spin-up, the pace it holds, and how far past the top it stops. */
const UP = 0.3
const PACE = 1.25
const PAST = 0.09
const T_BOARD = (0.5 + CX - 1) / ((ROLL + 0.9) / 2)
const LIN = (Math.PI / 2 - (PACE * UP) / 2) / PACE
const T_TOP = UP + LIN
const STOP = (2 * PAST) / PACE

/** How far the cylinder has turned, `tau` seconds after the ball came against it. */
function turned(tau: number): number {
  if (tau <= 0) return 0
  if (tau < UP) return (PACE * tau * tau) / (2 * UP)
  if (tau < T_TOP) return (PACE * UP) / 2 + PACE * (tau - UP)
  const f = clamp((tau - T_TOP) / STOP)
  return Math.PI / 2 + PAST * (2 * f - f * f)
}
const seat = (t: number): Pt => {
  const a = Math.PI - turned(t - T_BOARD)
  return [CX + Math.cos(a), -Math.sin(a)]
}

const LANE: Lane = {
  segs: [ramp([-0.5, 0], [CX - 1, 0], ROLL, 0.9), ...trace(seat, T_BOARD, T_BOARD + T_TOP, 40), ramp([CX, -1], [1.5, -1], PACE, ROLL)],
  fire: T_BOARD,
}

/** The pins, by where they stand before the turn; the comb's tip meets them here on the far side. */
const PINS = Array.from({ length: 11 }, (_, i) => Math.PI + BEHIND - ((i + 1) * Math.PI) / 6)
const COMB = (42 * Math.PI) / 180
/** When each pin that reaches the comb lets its tip go: the turn at which it passes, turned back into time. */
const PLUCKS: number[] = PINS.map((a) => a - COMB)
  .filter((need) => need > 0 && need <= Math.PI / 2 + PAST)
  .map((need) => {
    let lo = 0
    let hi = T_TOP + STOP
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (turned(mid) < need) lo = mid
      else hi = mid
    }
    return hi
  })

/** Where the case's top lies: the cylinder is seen only above it. */
const CASE_TOP = 0.2

export const musicbox = definePiece<{ color: string; brass: string }>({
  name: 'musicbox',
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
    // The cylinder is brass, unless the ball is: then it is the palette's next most golden colour, so the ball shows on it.
    const gold = brass(theme) === ball.color ? brass({ ...theme, colors: theme.colors.filter((c) => c !== ball.color && c !== ivory(theme)) }) : brass(theme)
    const wood = feltColor(theme, color === gold ? ball.color : color, ball.color)
    return { cells, exit: { at: [2, -1], dir: 1 }, lane: LANE, state: { color: wood === gold ? theme.colors.find((c) => c !== gold && c !== ball.color && c !== ivory(theme)) ?? wood : wood, brass: gold } }
  },
  draw: (p, s, { k, since, ink, weight, theme, bg }) => {
    const phi = turned(since)
    const gold = s.brass

    // The rail out, off the cylinder's top, on a post that stands on the case; the comb is bracketed to the same post.
    rail(p, k, ink, weight, CX + 0.1, 1.5, -1 + FLOOR)
    outline(p, ink, weight)
    p.line(1.47 * k, (-1 + FLOOR) * k, 1.47 * k, CASE_TOP * k)

    // The cylinder: what stands above the case of a brass drum, its arbor at the centre.
    const sink = Math.asin(CASE_TOP / BRASS)
    solid(p, ink, weight, gold)
    p.arc(CX * k, 0, 2 * BRASS * k, 2 * BRASS * k, Math.PI - sink, 2 * Math.PI + sink, p.CHORD)
    solid(p, ink, weight, bg)
    p.circle(CX * k, 0, 0.16 * k)
    // The pins, those that are above the case; and the ledge among them, under the ball.
    p.fill(ink)
    p.noStroke()
    for (const a0 of PINS) {
      const a = a0 - phi
      if (-Math.sin(a) * BRASS > CASE_TOP - 0.06) continue
      p.push()
      p.translate(CX * k, 0)
      p.rotate(-a)
      p.rect((BRASS + 0.035) * k, 0, 0.08 * k, 0.045 * k, 0.01 * k)
      p.pop()
    }
    p.push()
    p.translate(CX * k, 0)
    p.rotate(-(Math.PI + BEHIND - phi))
    solid(p, ink, weight, gold)
    p.rect((BRASS + LEDGE / 2 - 0.01) * k, -0.03 * k, (LEDGE + 0.02) * k, 0.06 * k, 0.015 * k)
    p.pop()

    // The comb, edge on: one steel tooth from its block up to the pins, lifted and let go by each as it passes.
    const tip: Pt = [CX + (BRASS + 0.075) * Math.cos(COMB), -(BRASS + 0.075) * Math.sin(COMB)]
    const root: Pt = [1.465, -0.05]
    let bend = 0
    let sings = false
    for (const at of PLUCKS) {
      const dt = since - at
      if (dt < -0.12) continue
      // Carried down by the pin for a moment, then free: a sung note dying away.
      bend = dt < 0 ? 0.045 * (1 + dt / 0.12) : 0.045 * Math.exp(-dt * 4) * Math.cos(dt * 60)
      sings = dt >= 0
    }
    // A tapered tooth of steel; while it sings, the two ends of its swing faintly either side of it.
    const tooth = (b: number, alpha: number) => {
      const tx = tip[0] + b * 0.67
      const ty = tip[1] + b * 0.74
      const fill = p.color(ivory(theme))
      const line = p.color(ink)
      fill.setAlpha(alpha)
      line.setAlpha(alpha)
      p.fill(fill)
      p.stroke(line)
      p.strokeWeight(weight * 0.9)
      p.quad((root[0] - 0.03) * k, root[1] * k, (root[0] + 0.03) * k, root[1] * k, (tx + 0.012) * k, (ty + 0.008) * k, (tx - 0.012) * k, (ty - 0.008) * k)
    }
    const env = Math.abs(bend)
    if (sings && env > 0.004) {
      tooth(env, 70)
      tooth(-env, 70)
    }
    tooth(bend, 255)
    solid(p, ink, weight, ivory(theme))
    p.rect(1.47 * k, (root[1] + 0.06) * k, 0.06 * k, 0.16 * k, 0.012 * k)

    // The case, over the cylinder's lower half; and the key in its front, turning while the spring runs.
    solid(p, ink, weight, s.color)
    p.rect(0.5 * k, ((CASE_TOP + 0.5) / 2) * k, 1.96 * k, (0.5 - CASE_TOP) * k, 0.03 * k)
    p.push()
    p.translate(1.12 * k, 0.35 * k)
    p.rotate(phi * 5)
    solid(p, ink, weight * 0.8, gold)
    p.ellipse(-0.05 * k, 0, 0.09 * k, 0.07 * k)
    p.ellipse(0.05 * k, 0, 0.09 * k, 0.07 * k)
    p.fill(ink)
    p.noStroke()
    p.circle(0, 0, 0.035 * k)
    p.pop()
  },
})

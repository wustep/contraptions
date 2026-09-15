import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fly, over, rail, ramp, roll, type Lane, type PieceCtx, type Pt } from '../../parts'
import { tuft } from './green'

/**
 * A mole's tunnel. The path ends at a hole in the ground; the ball rolls
 * over the near lip at its own pace, meets the far wall of the hole and
 * drops in and is gone, and a ridge of turned earth travels down the soil
 * to a molehill on the path a floor below — where the ball pops up out of
 * the top with a spray of dirt, clears the hill's foot, lands on the rail,
 * and rolls on, or back the way it came. The mole puts its nose out after
 * to see what that was.
 *
 * The molehill stands in front of the ball: it comes up *through* the
 * hole in the top, not out of thin air in front of the mound.
 */
export interface BurrowState {
  color: string
  turn: 1 | -1
}

const HOLE = -0.16
/** The hole's half-width: the ball tips in over the near lip and drops at the far wall. */
const LIP = 0.15
/** Over the lip, falling from level, until its front meets the far wall. */
const OVER = fly([HOLE - LIP, 0], [HOLE, 0.1], LIP / ROLL, 0.1 / 4)
/** Down the hole from there, with the fall it already has. */
const DIVE = ramp([HOLE, 0.1], [HOLE + 0.02, 0.4], (2 * 0.1) / OVER.dur, 5.5)
/** When the ball is out of sight in the tunnel. */
const T_IN = (0.5 + HOLE - LIP) / ROLL + OVER.dur + DIVE.dur
const TUNNEL = 0.42
const PAUSE = 0.12
const FIRE = T_IN + TUNNEL + PAUSE
const HILL = 1 + FLOOR
/** The mound's half-width at its foot, and the height of its crown above the path. */
const FOOT = 0.28
const CROWN = 0.3
/** Where the ball lands: past the foot, on the rail out. */
const LAND = FOOT + 0.14
const POP = 0.3
/** Where the tunnel runs: from under the hole, curving down to under the molehill. */
const tunnelPt = (f: number): Pt => [HOLE + (0 - HOLE) * f, 0.45 + (0.95 - 0.45) * f + 0.08 * Math.sin(Math.PI * f)]

export const burrow = definePiece<BurrowState>({
  name: 'burrow',
  weight: 1,
  flight: true,
  place: ({ rng, color, fits }) => {
    for (const turn of rng.shuffle([1, -1] as const)) {
      const cells: Pt[] = [
        [0, 0],
        [0, 1],
      ]
      if (!fits(cells, [turn, 1])) continue
      const lane: Lane = {
        segs: [
          roll([-0.5, 0], [HOLE - LIP, 0], ROLL),
          OVER,
          DIVE,
          { from: [HOLE + 0.02, 0.4], to: [0, 0.95], dur: TUNNEL, hidden: true },
          { from: [0, 0.95], to: [0, 0.95], dur: PAUSE, hidden: true },
          // Up out of the crown and over the foot: the peak clears the mound by a ball.
          fly([0, 0.95], [turn * LAND, 1], POP, 0.36),
          ramp([turn * LAND, 1], [turn * 0.5, 1], 2.0, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: [turn, 1], dir: turn }, lane, state: { color, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const { turn } = s
    // How far along the tunnel the ridge of earth is.
    const dig = t < T_IN ? 0 : t < FIRE - PAUSE ? over(t, T_IN, FIRE - PAUSE) : 1

    // The upper path to the hole, and the ground it sits in.
    rail(p, k, ink, weight, -0.5, HOLE - LIP)
    outline(p, ink, weight)
    p.line((HOLE - LIP) * k, FLOOR * k, (HOLE - LIP) * k, 0.5 * k)
    p.line((HOLE + LIP) * k, FLOOR * k, (HOLE + LIP) * k, 0.5 * k)
    p.line((HOLE + LIP) * k, FLOOR * k, 0.5 * k, FLOOR * k)
    p.line(-0.5 * k, 0.5 * k, 0.5 * k, 0.5 * k)
    tuft(p, k, ink, weight, 0.3, FLOOR, 0.1, 0.02)
    // The hole: a dark mouth in the path, with a lip of dirt.
    solid(p, ink, weight, ink)
    p.ellipse(HOLE * k, (FLOOR + 0.03) * k, 0.3 * k, 0.1 * k)
    solid(p, ink, weight, s.color)
    for (const dx of [-0.18, 0.18]) p.ellipse((HOLE + dx) * k, (FLOOR + 0.01) * k, 0.08 * k, 0.05 * k)
    // The soil between the floors: the tunnel as a dotted line, and the ridge moving along it.
    p.push()
    const dot = p.color(ink)
    dot.setAlpha(90)
    p.stroke(dot)
    p.strokeWeight(weight * 0.8)
    for (let i = 0; i < 12; i += 2) {
      const a = tunnelPt(i / 12)
      const b = tunnelPt((i + 1) / 12)
      p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
    }
    p.pop()
    if (dig > 0 && dig < 1) {
      const [rx, ry] = tunnelPt(dig)
      solid(p, ink, weight, s.color)
      p.arc(rx * k, (ry + 0.02) * k, 0.24 * k, 0.14 * k, Math.PI, Math.PI * 2, p.CHORD)
    }
    // The lower path either side of the molehill, and the ground under it.
    rail(p, k, ink, weight, turn * 0.2, turn * 0.5, HILL)
    outline(p, ink, weight)
    p.line(-turn * 0.5 * k, HILL * k, -turn * 0.22 * k, HILL * k)
    p.line(-0.5 * k, 1.5 * k, 0.5 * k, 1.5 * k)
  },
  over: (p, s, c: PieceCtx) => {
    const { k, since, ink, bg, weight } = c
    const nose = since > 0.8 ? easeOutCubic(over(since, 0.8, 1.3)) * (1 - over(since, 3, 3.6)) : 0
    // The molehill, in front of the ball, with the hole in its crown the ball comes up through.
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-FOOT * k, HILL * k)
    p.bezierVertex(-0.2 * k, (HILL - 0.24) * k, -0.08 * k, (HILL - CROWN) * k, 0, (HILL - CROWN) * k)
    p.bezierVertex(0.08 * k, (HILL - CROWN) * k, 0.2 * k, (HILL - 0.24) * k, FOOT * k, HILL * k)
    p.endShape(p.CLOSE)
    p.fill(ink)
    p.noStroke()
    p.ellipse(0, (HILL - CROWN + 0.01) * k, 0.16 * k, 0.05 * k)
    // The dirt thrown up as the ball pops out.
    if (since > 0 && since < 0.35) {
      const f = over(since, 0, 0.35)
      p.push()
      p.noStroke()
      p.fill(s.color)
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (0.2 + 0.6 * (i / 5))
        const r = 0.12 + 0.3 * f
        p.circle((Math.cos(a) * r) * k, (HILL - CROWN + Math.sin(a) * r + 0.5 * f * f) * k, (0.035 - 0.02 * f) * k)
      }
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, 0, (HILL - CROWN - 0.02) * k, (0.1 + 0.1 * f) * k, (0.16 + 0.14 * f) * k, 5, -Math.PI / 2 - 1.2)
      p.pop()
    }
    // The mole's nose, up out of the hill after the ball has gone.
    if (nose > 0.02) {
      p.push()
      p.translate(0, (HILL - CROWN + 0.1 - 0.14 * nose) * k)
      solid(p, ink, weight, s.color)
      p.ellipse(0, 0, 0.14 * k, 0.12 * k)
      solid(p, ink, weight, bg)
      p.circle(0, -0.05 * k, 0.045 * k)
      p.fill(ink)
      p.noStroke()
      for (const dx of [-0.035, 0.035]) p.circle(dx * k, -0.01 * k, 0.015 * k)
      p.pop()
    }
  },
})

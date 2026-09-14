import { outline, solid } from '../../../../../src/core/draw'
import { easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, ROLL, burst, definePiece, fly, over, rail, ramp, roll, type Lane, type Pt } from '../../parts'
import { tuft } from './green'

/**
 * A mole's tunnel. The path ends at a hole in the ground; the ball drops
 * in and is gone, and a ridge of turned earth travels down the soil to a
 * molehill on the path a floor below — where the ball pops out of the
 * top with a spray of dirt, hops onto the rail, and rolls on, or back the
 * way it came. The mole puts its nose out after to see what that was.
 */
export interface BurrowState {
  color: string
  turn: 1 | -1
}

const HOLE = -0.16
const T_HOLE = (0.5 + HOLE) / ROLL
const DIVE = 0.14
const TUNNEL = 0.42
const PAUSE = 0.12
const FIRE = T_HOLE + DIVE + TUNNEL + PAUSE
const HILL = 1 + FLOOR
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
          roll([-0.5, 0], [HOLE, 0], ROLL),
          { from: [HOLE, 0], to: [HOLE + 0.04, 0.4], dur: DIVE, ease: 'in' },
          { from: [HOLE + 0.04, 0.4], to: [0, 0.95], dur: TUNNEL, hidden: true },
          { from: [0, 0.95], to: [0, 0.95], dur: PAUSE, hidden: true },
          fly([0, 0.95], [turn * 0.26, 1], 0.26, 0.16),
          fly([turn * 0.26, 1], [turn * 0.34, 1], 0.05, 0.02),
          ramp([turn * 0.34, 1], [turn * 0.5, 1], 2.2, ROLL),
        ],
        fire: FIRE,
      }
      return { cells, exit: { at: [turn, 1], dir: turn }, lane, state: { color, turn } }
    }
    return null
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const { turn } = s
    // How far along the tunnel the ridge of earth is.
    const dig = t < T_HOLE + DIVE ? 0 : t < FIRE - PAUSE ? over(t, T_HOLE + DIVE, FIRE - PAUSE) : 1
    const nose = since > 0.8 ? easeOutCubic(over(since, 0.8, 1.3)) * (1 - over(since, 3, 3.6)) : 0

    // The upper path to the hole, and the ground it sits in.
    rail(p, k, ink, weight, -0.5, HOLE - 0.16)
    outline(p, ink, weight)
    p.line((HOLE - 0.16) * k, FLOOR * k, (HOLE - 0.16) * k, 0.5 * k)
    p.line((HOLE + 0.16) * k, FLOOR * k, (HOLE + 0.16) * k, 0.5 * k)
    p.line((HOLE + 0.16) * k, FLOOR * k, 0.5 * k, FLOOR * k)
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
    // The molehill on the lower path, and the rail out from it.
    rail(p, k, ink, weight, turn * 0.2, turn * 0.5, HILL)
    outline(p, ink, weight)
    p.line(-turn * 0.5 * k, HILL * k, -turn * 0.22 * k, HILL * k)
    p.line(-0.5 * k, 1.5 * k, 0.5 * k, 1.5 * k)
    solid(p, ink, weight, s.color)
    p.beginShape()
    p.vertex(-0.28 * k, HILL * k)
    p.bezierVertex(-0.2 * k, (HILL - 0.24) * k, -0.08 * k, (HILL - 0.3) * k, 0, (HILL - 0.3) * k)
    p.bezierVertex(0.08 * k, (HILL - 0.3) * k, 0.2 * k, (HILL - 0.24) * k, 0.28 * k, HILL * k)
    p.endShape(p.CLOSE)
    p.fill(ink)
    p.noStroke()
    p.ellipse(0, (HILL - 0.29) * k, 0.16 * k, 0.05 * k)
    // The dirt thrown up as the ball pops out.
    if (since > 0 && since < 0.35) {
      const f = over(since, 0, 0.35)
      p.push()
      p.noStroke()
      p.fill(s.color)
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (0.2 + 0.6 * (i / 5))
        const r = 0.12 + 0.3 * f
        p.circle((Math.cos(a) * r) * k, (HILL - 0.3 + Math.sin(a) * r + 0.5 * f * f) * k, (0.035 - 0.02 * f) * k)
      }
      p.stroke(s.color)
      p.strokeWeight(weight)
      burst(p, 0, (HILL - 0.32) * k, (0.1 + 0.1 * f) * k, (0.16 + 0.14 * f) * k, 5, -Math.PI / 2 - 1.2)
      p.pop()
    }
    // The mole's nose, up out of the hill after the ball has gone.
    if (nose > 0.02) {
      p.push()
      p.translate(0, (HILL - 0.3 + 0.1 - 0.14 * nose) * k)
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

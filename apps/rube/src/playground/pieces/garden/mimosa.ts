import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp, easeInOutSine, easeOutQuad } from '../../../../../../src/core/ease'
import { R, ROLL, definePiece, mixHex, rail, roll, type Lane, type Pt } from '../../../parts'
import { gardenGreen, nearestHue, pot, soil } from '../../../pieces/garden/green'

/**
 * A sensitive plant. It stands in a pot behind the far end of two cells of
 * path and holds one long frond back over the path toward the ball, low at
 * its tip, its leaflets out in pairs either side of the rib. The ball
 * brushes the lowest pair as it comes under the tip, and the plant does what
 * a mimosa does: the touch runs along the rib faster than the ball rolls,
 * each pair of leaflets folding shut against the rib as it passes, tip to
 * stem, just ahead of the ball all the way; and when it reaches the joint at
 * the stem the whole frond lets go there and droops behind the ball. The
 * ball never slows. Long after, the frond lifts and the leaflets open again,
 * stem to tip.
 *
 * The frond is one rigid thing hung on the joint, as the real one is: a rib
 * through three points, turned about the joint by the droop. The fold is one
 * wave with one speed, read by every pair from how far along the rib it is.
 */
/** The joint at the stem's head, the rib's crown, and its tip, before the droop. */
const JOINT: Pt = [1.22, -0.24]
const CROWN: Pt = [0.5, -0.42]
const TIP: Pt = [-0.37, -0.19]
/** Pairs of leaflets, how far along the rib (joint to tip) the first and last stand, and how long they are at each end. */
const PAIRS = 8
const S0 = 0.1
const S1 = 0.96
const LEN0 = 0.17
const LEN1 = 0.115
/**
 * A leaflet's angle off the rib, toward the tip: out either side, and shut. They shut the way hands do, upward:
 * the upper one leans in, and the lower comes up across the rib to lie against it, away from what touched it.
 */
const OUT = 1.25
const SHUT_UPPER = 0.62
const SHUT_LOWER = 0.42
/** The rib's length, near enough, and the speed the touch runs along it. */
const RIB = 1.66
const WAVE = ROLL * 1.55
/** A pair takes this long to fold; the frond this long to droop, and this far, radians. */
const FOLD = 0.13
const DROOP = 0.16
const DROOP_T = 0.4
/** Long after: when the frond starts to lift, how long that takes, and how long the leaflets take to open, stem to tip. */
const WAKE = 3.4
const LIFT_T = 1.6
const OPEN_T = 2.4

/** A point on the rib before the droop, `s` from the joint (0) to the tip (1), and the rib's direction there. */
function ribAt(s: number): { at: Pt; dir: number } {
  const a = (1 - s) * (1 - s)
  const b = 2 * s * (1 - s)
  const c = s * s
  const dx = 2 * (1 - s) * (CROWN[0] - JOINT[0]) + 2 * s * (TIP[0] - CROWN[0])
  const dy = 2 * (1 - s) * (CROWN[1] - JOINT[1]) + 2 * s * (TIP[1] - CROWN[1])
  return { at: [a * JOINT[0] + b * CROWN[0] + c * TIP[0], a * JOINT[1] + b * CROWN[1] + c * TIP[1]], dir: Math.atan2(dy, dx) }
}

/** Where the ball's centre is when its shoulder first brushes the tip of the lowest leaflet, and when. */
const LOWEST = ribAt(S1)
const BRUSH: Pt = [LOWEST.at[0] + LEN1 * Math.cos(LOWEST.dir - OUT), LOWEST.at[1] + LEN1 * Math.sin(LOWEST.dir - OUT)]
const X_TOUCH = BRUSH[0] - Math.sqrt(Math.max(0, R * R - BRUSH[1] * BRUSH[1]))
const FIRE = (X_TOUCH + 0.5) / ROLL
/** When the touch reaches the joint. */
const T_JOINT = FIRE + RIB / WAVE

const LANE: Lane = { segs: [roll([-0.5, 0], [1.5, 0], ROLL)], fire: FIRE }

/** How shut the pair at `s` is at piece time `t`, 0 out to 1 shut. */
function shutAt(s: number, t: number): number {
  const reached = FIRE + ((1 - s) * RIB) / WAVE
  if (t < reached) return 0
  const folded = easeOutQuad(clamp((t - reached) / FOLD))
  // They open again stem to tip, slowly, each taking a third of the whole.
  const opens = WAKE + LIFT_T * 0.5 + s * OPEN_T * 0.67
  return folded * (1 - easeInOutSine(clamp((t - opens) / (OPEN_T * 0.33))))
}

/** How far the frond has drooped about its joint at piece time `t`, radians. */
function droopAt(t: number): number {
  if (t < T_JOINT) return 0
  const s = t - T_JOINT
  const down = DROOP * (easeOutQuad(clamp(s / DROOP_T)) + 0.12 * Math.exp(-s * 5) * Math.sin(s * 14) * clamp(s / 0.1))
  return down * (1 - easeInOutSine(clamp((t - WAKE) / LIFT_T)))
}

/** One leaflet from (x, y): a pointed blade `len` long along `angle`, no rib of its own at this size. */
function leaflet(p: p5, k: number, x: number, y: number, len: number, angle: number): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  const w = len * 0.3
  p.beginShape()
  p.vertex(0, 0)
  p.bezierVertex(len * 0.25 * k, -w * k, len * 0.75 * k, -w * k, len * k, 0)
  p.bezierVertex(len * 0.75 * k, w * k, len * 0.25 * k, w * k, 0, 0)
  p.endShape(p.CLOSE)
  p.pop()
}

export const mimosa = definePiece<{ color: string; green: string }>({
  name: 'mimosa',
  weight: 0.9,
  place: ({ fits, theme, ball }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    // A leaf is green and a pot is terracotta, whatever the map hands the piece; a green ball meets a deeper green.
    const green = gardenGreen(theme)
    return {
      cells,
      exit: { at: [2, 0], dir: 1 },
      lane: LANE,
      state: { color: nearestHue(theme, 18, ball.color), green: ball.color === green ? mixHex(green, theme.ink, 0.28) : green },
    }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    soil(p, k, ink, weight, -0.5, 1.5)
    // The plant: a pot on the ground behind the path, and a stem up to the joint.
    pot(p, k, ink, weight, s.color, 1.27, 0.5, 0.22, 0.17)
    outline(p, ink, weight * 1.15)
    p.noFill()
    p.beginShape()
    p.vertex(1.27 * k, 0.34 * k)
    p.quadraticVertex(1.34 * k, -0.05 * k, JOINT[0] * k, JOINT[1] * k)
    p.endShape()
    rail(p, k, ink, weight, -0.5, 1.5)

    // The frond, hung on its joint.
    p.push()
    p.translate(JOINT[0] * k, JOINT[1] * k)
    p.rotate(-droopAt(t))
    p.translate(-JOINT[0] * k, -JOINT[1] * k)
    outline(p, ink, weight * 1.1)
    p.beginShape()
    p.vertex(JOINT[0] * k, JOINT[1] * k)
    p.quadraticVertex(CROWN[0] * k, CROWN[1] * k, TIP[0] * k, TIP[1] * k)
    p.endShape()
    solid(p, ink, weight * 0.75, s.green)
    for (let i = 0; i < PAIRS; i++) {
      const at = S0 + ((S1 - S0) * i) / (PAIRS - 1)
      const { at: root, dir } = ribAt(at)
      const len = LEN0 + ((LEN1 - LEN0) * i) / (PAIRS - 1)
      const shut = shutAt(at, t)
      // The upper one first, so the lower, which the ball meets, lies over it when they are shut.
      leaflet(p, k, root[0], root[1], len, dir + OUT + (SHUT_UPPER - OUT) * shut)
      leaflet(p, k, root[0], root[1], len, dir - OUT + (SHUT_LOWER + OUT) * shut)
    }
    // The joint: a swelling where the frond is hung.
    solid(p, ink, weight, s.green)
    p.circle(JOINT[0] * k, JOINT[1] * k, 0.055 * k)
    p.pop()
  },
})

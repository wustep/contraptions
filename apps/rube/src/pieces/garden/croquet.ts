import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { FAST, FLOOR, R, ROLL, arrive, arriveAt, definePiece, gallows, over, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * Croquet. A mallet hangs from a little gallows over the lawn, drawn back
 * and held up on a hook; a cord runs from the hook along the beam to a
 * flap hanging in the ball's way. The ball rolls in under the mallet and
 * stops on the starting mark with its nose against the flap; the flap
 * gives, the cord tugs, the hook lets go; the mallet comes down like the
 * pendulum it is and tocks the ball on the back — and it shoots off through
 * the flap, through two hoops, each quivering as it goes by, and clips the
 * striped peg, which takes the pace off it. The mallet swings on until it
 * hangs still, and the flap goes on flapping for a while.
 *
 * The mallet's swing is a pendulum's: a cosine from the hook to the ball,
 * timed by its length, and a damped one after.
 */
const SEAT = 0.12
const PIVOT: Pt = [0, -0.46]
const ROD = 0.46
const HEAD_W = 0.22
const HEAD_H = 0.115
/** Held back on the hook. Positive is back, toward where the ball came from. */
const BACK = 0.98
/** Where the head's face meets the ball's back. */
const CONTACT = Math.asin((PIVOT[0] + HEAD_W / 2 - (SEAT - R)) / ROD)
/** A pendulum this long, under the show's cartoon gravity. */
const G = 16
const OMEGA = Math.sqrt(G / ROD)
const SWING = Math.acos(CONTACT / BACK) / OMEGA
const ARRIVE = arriveAt(SEAT)
const TRIP = 0.1
const FIRE = ARRIVE + TRIP + SWING
const V = FAST * 1.3
/** The flap, hinged on the beam, hanging just past the ball's nose. */
const FLAP: Pt = [SEAT + R + 0.015, -0.46]
const FLAP_L = 0.5
const HOOPS = [0.78, 1.07]
const PEG = 1.32
/** When the ball's middle is at `x`, after the tock: flat out within a ball's width. */
const passes = (x: number) => 0.12 / (V / 2) + (x - SEAT - 0.12) / V
const T_PEG = passes(PEG - 0.06)

const LANE: Lane = {
  segs: [
    ...arrive([-0.5, 0], [SEAT, 0]),
    wait([SEAT, 0], TRIP + SWING),
    ramp([SEAT, 0], [SEAT + 0.12, 0], 0, V),
    roll([SEAT + 0.12, 0], [PEG - 0.06, 0], V),
    ramp([PEG - 0.06, 0], [1.5, 0], 3.4, ROLL),
  ],
  fire: FIRE,
}

/** The mallet's angle from hanging: held, falling to the ball, and swinging itself out after. */
function swingAt(t: number): number {
  if (t < ARRIVE + TRIP) return BACK
  const since = t - FIRE
  if (since < 0) return BACK * Math.cos(OMEGA * (t - ARRIVE - TRIP))
  return Math.exp(-0.8 * since) * (CONTACT * Math.cos(OMEGA * since) - 0.42 * Math.sin(OMEGA * since))
}

/** The flap's angle from hanging, negative away from the ball: nudged, then knocked through, then flapping itself out. */
function flapAt(t: number): number {
  if (t < ARRIVE - 0.04) return 0
  const since = t - FIRE
  if (since < 0) return -0.09 * over(t, ARRIVE - 0.04, ARRIVE + 0.03)
  const open = passes(FLAP[0] + 0.1)
  if (since < open) return -0.09 - 0.86 * over(since, 0, open)
  const s = since - open
  return -0.95 * Math.exp(-1.6 * s) * Math.cos(7 * s)
}

export const croquet = definePiece<{ color: string }>({
  name: 'croquet',
  weight: 0.9,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [1, 0],
    ]
    if (!fits(cells, [2, 0])) return null
    return { cells, exit: { at: [2, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, since, ink, bg, weight }) => {
    const swing = swingAt(t)
    const tripped = over(t, ARRIVE, ARRIVE + TRIP)

    rail(p, k, ink, weight, -0.5, 1.5)
    soil(p, k, ink, weight, -0.5, 1.5)
    tuft(p, k, ink, weight, 0.82, 0.5, 0.1, 0.02)
    // The starting mark: a dimple in the lawn.
    outline(p, ink, weight)
    p.line((SEAT - 0.09) * k, FLOOR * k, (SEAT - 0.04) * k, (FLOOR + 0.02) * k)
    p.line((SEAT - 0.04) * k, (FLOOR + 0.02) * k, (SEAT + 0.04) * k, (FLOOR + 0.02) * k)
    p.line((SEAT + 0.04) * k, (FLOOR + 0.02) * k, (SEAT + 0.09) * k, FLOOR * k)

    // The gallows, the hook on its post, and the cord from the hook along the beam to the flap.
    gallows(p, k, ink, weight, -0.44, FLAP[0] + 0.04, -0.44, PIVOT[1])
    const held: Pt = [PIVOT[0] - ROD * Math.sin(BACK) - (HEAD_W / 2) * Math.cos(BACK), PIVOT[1] + ROD * Math.cos(BACK) - (HEAD_W / 2) * Math.sin(BACK)]
    outline(p, ink, weight * 0.6)
    p.line((FLAP[0] - 0.03) * k, (FLAP[1] + 0.045) * k, -0.4 * k, (FLAP[1] + 0.045) * k)
    p.line(-0.4 * k, (FLAP[1] + 0.045) * k, -0.4 * k, (held[1] + 0.02) * k)
    p.push()
    p.translate(-0.44 * k, (held[1] + 0.07) * k)
    p.rotate(0.9 * tripped)
    outline(p, ink, weight)
    p.line(0, 0, 0.09 * k, 0)
    p.line(0.09 * k, 0, 0.09 * k, -0.035 * k)
    p.pop()

    // The far legs of the hoops, and the peg, behind the ball.
    for (const x of HOOPS) hoop(p, k, ink, weight, x, quiver(since - passes(x)), false)
    const knock = since - T_PEG
    p.push()
    p.translate(PEG * k, FLOOR * k)
    p.rotate(knock > 0 ? 0.12 * Math.exp(-knock * 4) * Math.sin(knock * 30) : 0)
    for (let i = 0; i < 4; i++) {
      solid(p, ink, weight, i % 2 ? ink : s.color)
      p.rect(0, (-0.05 - i * 0.095) * k, 0.085 * k, 0.095 * k)
    }
    p.pop()

    // The flap: a rod on a hinge with a paddle at the ball's height.
    p.push()
    p.translate(FLAP[0] * k, FLAP[1] * k)
    p.rotate(flapAt(t))
    outline(p, ink, weight * 0.8)
    p.line(0, 0, 0, (FLAP_L - 0.06) * k)
    solid(p, ink, weight, s.color)
    p.rect(0, (FLAP_L - 0.03) * k, 0.035 * k, 0.14 * k, 0.01 * k)
    p.pop()

    // The mallet on its pivot: shaft, and a banded head.
    p.push()
    p.translate(PIVOT[0] * k, PIVOT[1] * k)
    p.rotate(swing)
    outline(p, ink, weight * 1.3)
    p.line(0, 0, 0, ROD * k)
    solid(p, ink, weight, s.color)
    p.rect(0, ROD * k, HEAD_W * k, HEAD_H * k, 0.012 * k)
    outline(p, ink, weight * 0.8)
    for (const x of [-HEAD_W / 2 + 0.035, HEAD_W / 2 - 0.035]) p.line(x * k, (ROD - HEAD_H / 2) * k, x * k, (ROD + HEAD_H / 2) * k)
    p.pop()
    solid(p, ink, weight, bg)
    p.circle(PIVOT[0] * k, PIVOT[1] * k, 0.045 * k)

    // The tock, and the clip off the peg.
    if (since > 0 && since < 0.16) {
      const f = over(since, 0, 0.16)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      for (const a of [-2.25, -1.65, -1.05]) {
        p.line((SEAT - R + Math.cos(a) * (0.17 + 0.06 * f)) * k, Math.sin(a) * (0.17 + 0.06 * f) * k, (SEAT - R + Math.cos(a) * (0.23 + 0.09 * f)) * k, Math.sin(a) * (0.23 + 0.09 * f) * k)
      }
      p.pop()
    }
    if (knock > 0 && knock < 0.16) {
      const f = over(knock, 0, 0.16)
      p.push()
      p.stroke(ink)
      p.strokeWeight(weight)
      for (const a of [-2.2, -1.7, -1.2]) {
        p.line((PEG + Math.cos(a) * (0.1 + 0.06 * f)) * k, (-0.2 + Math.sin(a) * (0.1 + 0.06 * f)) * k, (PEG + Math.cos(a) * (0.15 + 0.1 * f)) * k, (-0.2 + Math.sin(a) * (0.15 + 0.1 * f)) * k)
      }
      p.pop()
    }
  },
  over: (p, _s, { k, since, ink, weight }) => {
    // The near legs of the hoops stand before the ball: it goes through them.
    for (const x of HOOPS) hoop(p, k, ink, weight, x, quiver(since - passes(x)), true)
  },
})

/** A hoop's shiver, radians, from the moment the ball goes through it. */
const quiver = (s: number): number => (s < 0 ? 0 : 0.09 * Math.exp(-s * 3.5) * Math.sin(s * 34))

/**
 * A hoop seen from the side, turned enough that it is an arch and not a
 * line: the far leg and the crown behind the ball, the near leg in front
 * of it. Wire only — with the legs a pen's width apart and a cap on top
 * it read as a post, and three posts in a row are a fence, not a lawn.
 */
function hoop(p: p5, k: number, ink: string, weight: number, x: number, lean: number, near: boolean): void {
  const W = 0.085
  const H = 0.36
  const CROWN = 0.15
  p.push()
  p.translate(x * k, FLOOR * k)
  p.rotate(lean)
  outline(p, ink, weight)
  if (near) {
    p.line(-W * k, 0, -W * k, (-H + CROWN / 2) * k)
  } else {
    p.line(W * k, 0, W * k, (-H + CROWN / 2) * k)
    p.noFill()
    p.arc(0, (-H + CROWN / 2) * k, W * 2 * k, CROWN * k, Math.PI, Math.PI * 2)
  }
  p.pop()
}

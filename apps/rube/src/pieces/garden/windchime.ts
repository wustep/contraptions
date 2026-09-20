import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { R, ROLL, definePiece, gallows, laneAt, over, rail, ramp, roll, type Lane } from '../../parts'
import { soil, tuft } from './green'

/**
 * A wind chime: four wooden tubes on strings from a bough that reaches out
 * over the path from a post, their ends hanging at the ball's shoulder. The
 * ball shoulders through: each tube in turn is pushed up and forward over
 * it, rides its back, and is let go to swing — out, back through its
 * neighbour with a clack, and on, dying away — while the next is already
 * lifting. Rings sound off each as it is struck. The ball comes out the far
 * side a touch slower for it and picks the path's pace back up.
 *
 * While a tube is on the ball its angle is whatever keeps its end outside
 * the ball, solved from the ball's own position on the lane; from the
 * moment it leaves the ball's back it is a damped pendulum started with the
 * angle and the swing it had then. Two tubes hang in front of the ball and
 * two behind, so it goes *through* the chime.
 */
/** The tubes' strings hang from the bough here, and each tube's end swings on this radius below it. */
const BEAM = -0.5
const REACH = 0.5
const XS = [-0.2, -0.06, 0.08, 0.22]
/** The tubes' lengths; the rest of the reach is string. */
const LENGTHS = [0.46, 0.36, 0.42, 0.32]
const W = 0.085
/** How far the ball's centre is from a tube's end when they touch. */
const C = R + W / 2
/** A tube is on the ball from its end's first touch until the ball's centre is this far past its pivot. */
const REL = 0.03
/** The pendulums: their swing and how fast it dies. */
const OMEGA = 6.4
const DAMP = 1.1
/** The ball is slowed to this pace by the chime and picks up again after. */
const V_SLOW = 1.0
const X_IN = XS[0] - C - 0.08
const X_OUT = XS[3] + 0.06

const LANE: Lane = {
  segs: [
    roll([-0.5, 0], [X_IN, 0], ROLL),
    ramp([X_IN, 0], [XS[0], 0], ROLL, V_SLOW),
    roll([XS[0], 0], [X_OUT, 0], V_SLOW),
    ramp([X_OUT, 0], [0.5, 0], V_SLOW, ROLL),
  ],
  fire: 0,
}
const ballX = (t: number) => laneAt(LANE, t).x
/** When the ball's centre reaches `x`, on the way in. */
function reach(x: number): number {
  let lo = 0
  let hi = 2
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (ballX(mid) < x) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** The tube at `xi`, pushed by a ball whose centre is at `xb`: the smallest forward angle that keeps its end off the ball. */
function pushed(xi: number, xb: number): number {
  const clear = (a: number) => {
    const ex = xi + REACH * Math.sin(a)
    const ey = BEAM + REACH * Math.cos(a)
    return Math.hypot(ex - xb, ey) >= C
  }
  if (clear(0)) return 0
  let lo = 0
  let hi = Math.PI / 2
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (clear(mid)) hi = mid
    else lo = mid
  }
  return hi
}

interface Strike {
  hit: number
  let: number
  angle: number
  rate: number
  /** When, swinging back, it first passes straight down: the clack on its neighbour. */
  clack: number
}
const STRIKES: Strike[] = XS.map((xi) => {
  const hit = reach(xi - C)
  const let_ = reach(xi + REL)
  const angle = pushed(xi, xi + REL)
  const rate = (angle - pushed(xi, ballX(let_ - 0.01))) / 0.01
  const swing = (tau: number) => Math.exp(-DAMP * tau) * (angle * Math.cos(OMEGA * tau) + ((rate + DAMP * angle) / OMEGA) * Math.sin(OMEGA * tau))
  let clack = 0
  for (let tau = 0.01; tau < 2; tau += 0.005) {
    if (swing(tau) < 0) {
      clack = tau
      break
    }
  }
  return { hit, let: let_, angle, rate, clack }
})
LANE.fire = STRIKES[0].hit

/** Tube `i`'s angle at piece time `t`: hanging, on the ball, or swinging free. */
function angleAt(i: number, t: number): number {
  const s = STRIKES[i]
  if (t < s.hit) return 0
  if (t <= s.let) return pushed(XS[i], ballX(t))
  const tau = t - s.let
  return Math.exp(-DAMP * tau) * (s.angle * Math.cos(OMEGA * tau) + ((s.rate + DAMP * s.angle) / OMEGA) * Math.sin(OMEGA * tau))
}

export const windchime = definePiece<{ color: string }>({
  name: 'windchime',
  weight: 0.9,
  place: ({ color, fits }) => {
    if (!fits([[0, 0]], [1, 0])) return null
    return { cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, c) => {
    const { k, t, ink, weight } = c
    rail(p, k, ink, weight, -0.5, 0.5)
    soil(p, k, ink, weight, -0.5, 0.5)
    tuft(p, k, ink, weight, -0.4, 0.5, 0.1, -0.03)
    // The bough out over the path from its post, behind everything.
    gallows(p, k, ink, weight, XS[0] - 0.1, 0.46, 0.42, BEAM)
    for (const i of [0, 2]) tube(p, i, s.color, c)
    // The rings off a tube as it is struck, and the clack as it swings back through its neighbour.
    for (let i = 0; i < XS.length; i++) {
      const st = STRIKES[i]
      rings(p, k, ink, weight, XS[i] + 0.06, BEAM + REACH - 0.08, over(t, st.hit, st.hit + 0.35))
      rings(p, k, ink, weight, XS[i] - 0.07, BEAM + REACH - 0.2, over(t, st.let + st.clack, st.let + st.clack + 0.35))
    }
  },
  over: (p, s, c) => {
    for (const i of [1, 3]) tube(p, i, s.color, c)
  },
})

/** Tube `i` on its string, hanging from the bough at its angle. */
function tube(p: p5, i: number, color: string, { k, t, ink, weight }: { k: number; t: number; ink: string; weight: number }): void {
  const a = angleAt(i, t)
  const L = LENGTHS[i]
  p.push()
  p.translate(XS[i] * k, BEAM * k)
  p.rotate(-a)
  outline(p, ink, weight * 0.8)
  p.line(0, 0, 0, (REACH - L) * k)
  solid(p, ink, weight, color)
  p.rect(0, (REACH - L / 2) * k, W * k, L * k, W * 0.35 * k)
  p.pop()
}

/** Two short arcs ringing off a point, spreading and fading over `f`. */
function rings(p: p5, k: number, ink: string, weight: number, x: number, y: number, f: number): void {
  if (f <= 0 || f >= 1) return
  outline(p, ink, weight * (1 - f) * 1.1)
  for (const r of [0.06, 0.11]) {
    const rr = (r + 0.1 * f) * k
    p.arc(x * k, y * k, rr * 2, rr * 2, -0.9, 0.5)
  }
}

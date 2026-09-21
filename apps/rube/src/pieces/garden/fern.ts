import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeInQuad, lerp } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, arrive, definePiece, over, post, rail, ramp, segTime, trace, type Lane, type Pt } from '../../parts'
import { leaf, soil, tuft } from './green'

/**
 * A fiddlehead: a young fern still coiled, in the ground where the path
 * stops, the top of its coil level with the rail. The ball rolls off the
 * path's end onto the coil and stops on top of it; the frond stirs, and
 * unfurls — the coil unwinding from the stem up, the stalk stretching, the
 * pinnae opening pair by pair as the curl leaves them — and the ball rides
 * the top of the coil the whole way up, until the coil is only a hook at
 * the tip of a tall frond, a little higher than the shelf of path a floor
 * above it. The frond, top-heavy now, bows under it; the hook droops until
 * the ball is level with the shelf beside it, and the ball rolls off it
 * onto the shelf and on, the way it was going. The frond springs back a
 * little and stands there, open. Two smaller fiddleheads behind it stay
 * coiled.
 *
 * The frond is one curve, its heading a function of how far along it you
 * are: straight for the stem, then a curl that tightens toward the tip and
 * unwinds with time. The ball's seat is where that heading first comes
 * level, so the lane is traced off the very curve the frond is drawn from.
 */
interface Shape {
  /** The frond's length: it grows as it unfurls. */
  L: number
  /** How the curl is spread along it: low, a spiral; high, a hook at the very tip. */
  q: number
  /** How far the tip has turned from the stem's heading, radians. */
  A: number
  /** A bow along the whole length under the ball's weight. */
  B: number
  /** A lean of the whole frond about its root. */
  lean: number
}

/** Where the stem stops and the curl begins, as a fraction of the length. */
const U0 = 0.1
/** Coiled and waiting; tall and open, with a hook at the tip that points a little down the way out. */
const REST: Shape = { L: 1.2, q: 1.3, A: 8, B: 0, lean: 0 }
const TALL: Shape = { L: 1.6, q: 5, A: 0.3 + Math.PI / 2 - 0.04 - 0.15, B: 0.15, lean: 0.04 }
/** The bow the ball's weight would give the frond, and the lean with it: more than it gets, since the ball is off onto the shelf before the frond is down to it. */
const DROOP_B = 0.24
const DROOP_LEAN = 0.05
/** The ribbon's width at the root, and how much it tapers by the tip. */
const W0 = 0.075
const TAPER = 0.55
const N = 72

const WAKE = 0.3
const UNFURL = 1.3
const DROOP = 0.28

const ROOT_X = -0.2
const PINNAE = [0.32, 0.44, 0.56, 0.68, 0.79, 0.89]

const width = (u: number) => W0 * (1 - TAPER * u)
const theta = (sh: Shape, u: number) => -Math.PI / 2 + sh.lean + sh.B * u + (u > U0 ? sh.A * Math.pow((u - U0) / (1 - U0), sh.q) : 0)

/** The frond's centreline from its root, `n` steps along. */
function frondPts(sh: Shape, n: number): Pt[] {
  const pts: Pt[] = [[0, 0]]
  let x = 0
  let y = 0
  for (let i = 1; i <= n; i++) {
    const a = theta(sh, (i - 0.5) / n)
    x += (Math.cos(a) * sh.L) / n
    y += (Math.sin(a) * sh.L) / n
    pts.push([x, y])
  }
  return pts
}

/** The point `u` of the way along the frond, from the root. */
function pointAt(sh: Shape, u: number): Pt {
  const n = 96
  let x = 0
  let y = 0
  const steps = Math.floor(u * n)
  for (let i = 1; i <= steps; i++) {
    const a = theta(sh, (i - 0.5) / n)
    x += (Math.cos(a) * sh.L) / n
    y += (Math.sin(a) * sh.L) / n
  }
  const rest = u * n - steps
  if (rest > 0) {
    const a = theta(sh, (steps + rest / 2) / n)
    x += (Math.cos(a) * sh.L * rest) / n
    y += (Math.sin(a) * sh.L * rest) / n
  }
  return [x, y]
}

/** Where along the frond its heading first comes level: the top of the coil, where the ball sits. */
function seatU(sh: Shape): number {
  const n = 240
  let prev = theta(sh, 0)
  for (let i = 1; i <= n; i++) {
    const th = theta(sh, i / n)
    if (th >= 0) return (i - 1 + (0 - prev) / (th - prev)) / n
    prev = th
  }
  return 1
}

const U_HOLD = seatU(TALL)
const REST_SEAT = pointAt(REST, seatU(REST))
/** The root stands so the ball on the coil's top has its centre on the rail's line. */
const ROOT: Pt = [ROOT_X, R + width(seatU(REST)) / 2 - REST_SEAT[1]]
const SEAT0: Pt = [ROOT[0] + REST_SEAT[0], 0]
const IN = arrive([-0.5, 0], SEAT0)
const ARRIVE = segTime(IN)
const FIRE = ARRIVE + WAKE
const T_TALL = FIRE + UNFURL

const mix = (a: Shape, b: Shape, f: number): Shape => ({ L: lerp(a.L, b.L, f), q: lerp(a.q, b.q, f), A: lerp(a.A, b.A, f), B: lerp(a.B, b.B, f), lean: lerp(a.lean, b.lean, f) })
/** The tall frond bowed `f` of the way to its full droop. */
const drooped = (f: number): Shape => ({ ...TALL, B: lerp(TALL.B, DROOP_B, f), lean: lerp(TALL.lean, DROOP_LEAN, f) })

/** The ball on a frond of shape `sh`, sitting on it `u` of the way along. */
function onFrond(sh: Shape, u: number): Pt {
  const [x, y] = pointAt(sh, u)
  const th = theta(sh, u)
  const off = R + width(u) / 2
  return [ROOT[0] + x + Math.sin(th) * off, ROOT[1] + y - Math.cos(th) * off]
}
/** How far into its droop the frond has let the ball down level with the shelf, and when: there the ball rolls off onto it. */
const LET_GO = (() => {
  for (let f = 0; f < 1; f += 1 / 4000) if (onFrond(drooped(f), U_HOLD)[1] >= -1) return f
  return 1
})()
const T_OFF = T_TALL + DROOP * Math.sqrt(LET_GO)

/** The frond at piece time `t`. */
function shapeAt(t: number): Shape {
  if (t < FIRE) {
    // A stir as the ball's weight settles on it.
    const stir = t > ARRIVE ? 0.12 * Math.sin(t * 55) * over(t, ARRIVE, FIRE) : 0
    return { ...REST, A: REST.A + stir }
  }
  if (t < T_TALL) return mix(REST, TALL, easeInOutSine(over(t, FIRE, T_TALL)))
  if (t < T_OFF) return drooped(easeInQuad(over(t, T_TALL, T_TALL + DROOP)))
  // Lightened, it springs back from as far as it had bowed, and sways.
  const s = t - T_OFF
  const ring = Math.exp(-s * 2.6) * Math.cos(s * 7)
  const sway = 0.02 * Math.sin(s * 1.3) * (1 - Math.exp(-s))
  const sh = drooped(LET_GO * ring)
  return { ...sh, lean: sh.lean + sway }
}

/** The ball on the frond: on the top of the coil while it unwinds, at the hook once there is only a hook. */
const ballAt = (t: number): Pt => onFrond(shapeAt(t), t < T_TALL ? seatU(shapeAt(t)) : U_HOLD)

const LANE: Lane = (() => {
  const ride = [...trace(ballAt, ARRIVE, T_TALL, 26), ...trace(ballAt, T_TALL, T_OFF, 6)]
  const last = ride[ride.length - 1]
  const off = last.to
  // Off the hook at the pace the droop gave it, and up to the path's along the shelf.
  const v = Math.hypot(last.to[0] - last.from[0], last.to[1] - last.from[1]) / last.dur
  return { segs: [...IN, ...ride, ramp(off, [0.5, -1], v, ROLL)], fire: FIRE }
})()
/** The shelf starts under where the ball comes off the hook onto it. */
const LEDGE = LANE.segs[LANE.segs.length - 1].from[0] - 0.06

export const fern = definePiece<{ color: string }>({
  name: 'fern',
  weight: 1,
  flight: true,
  place: ({ color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color } }
  },
  draw: (p, s, { k, t, ink, weight }) => {
    const sh = shapeAt(t)
    const f = over(t, FIRE, T_TALL)

    // The path in to its last stake, the ground, and the shelf a floor up on a tall stake.
    const railEnd = SEAT0[0] - 0.17
    rail(p, k, ink, weight, -0.5, railEnd)
    post(p, k, ink, weight, railEnd)
    soil(p, k, ink, weight, -0.5, 0.5)
    rail(p, k, ink, weight, LEDGE, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, 0.42, -1 + FLOOR, 0.5)

    // Two smaller fiddleheads behind, still coiled, swaying a little.
    for (const [x, L, lean] of [
      [-0.36, 0.7, -0.16],
      [0.16, 0.56, 0.18],
    ]) {
      ribbon(p, k, ink, weight * 0.9, s.color, x, 0.5, { L, q: 1.2, A: 5.4, B: 0, lean: lean + 0.03 * Math.sin(t * 1.1 + x * 5) }, 0.6)
    }
    tuft(p, k, ink, weight, -0.05, 0.5, 0.1, -0.02)

    // The pinnae, opening pair by pair from the stem up as the curl leaves them.
    for (const u of PINNAE) {
      const open = over(f, u - 0.32, u + 0.03)
      if (open < 0.05) continue
      const [x, y] = pointAt(sh, u)
      const th = theta(sh, u)
      const len = (0.21 - 0.13 * u) * open
      for (const side of [-1, 1]) leaf(p, k, ink, weight * 0.9, s.color, ROOT[0] + x, ROOT[1] + y, len, th + side * 1.15, 0.4)
    }
    // The frond itself: one ribbon from the root, tapering to the tip.
    ribbon(p, k, ink, weight, s.color, ROOT[0], ROOT[1], sh, 1)
  },
})

/** A frond as one closed ribbon: the centreline offset both ways by its width, tapering to the tip. */
function ribbon(p: p5, k: number, ink: string, weight: number, color: string, x0: number, y0: number, sh: Shape, scale: number): void {
  const pts = frondPts(sh, N)
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const u = i / N
    const th = theta(sh, Math.min(1, Math.max(0, i === 0 ? 0.001 : i === N ? 0.999 : u)))
    const w = (width(u) * scale) / 2
    const nx = Math.sin(th) * w
    const ny = -Math.cos(th) * w
    left.push([x0 + pts[i][0] + nx, y0 + pts[i][1] + ny])
    right.push([x0 + pts[i][0] - nx, y0 + pts[i][1] - ny])
  }
  solid(p, ink, weight, color)
  p.beginShape()
  for (const [x, y] of left) p.vertex(x * k, y * k)
  for (let i = N; i >= 0; i--) p.vertex(right[i][0] * k, right[i][1] * k)
  p.endShape(p.CLOSE)
  outline(p, ink, weight)
}

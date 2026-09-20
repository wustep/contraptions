import { outline, solid } from '../../../../../src/core/draw'
import { FLOOR, R, ROLL, definePiece, fly, post, rail, ramp, roll, trace, wait, type Lane, type Pt } from '../../parts'
import { soil, tuft } from './green'

/**
 * A toy pinwheel on a stick, planted at the path's end: the stick is the
 * path's last stake, and one vane hangs down in the ball's way. The ball
 * runs into that vane's tip and stops dead — and the knock sets the wheel
 * spinning. The vane it hit whips away up the far side, and the next one
 * comes down behind the ball, takes it in the crook of its curled tip,
 * sweeps it along the last of the path and off its end, up the far side,
 * and lets go: straight up, a steep hop over onto a shelf of path a floor
 * above. The wheel spins on, slower and slower.
 *
 * The ball's lane there is the wheel's own turning, sampled: along the
 * path it is as far on as the vane behind has pushed it, and off the path
 * it sits where a ball fits in the crook, between the vane's leading edge
 * and its curl. A vane's back is a straight edge, so the vane ahead of the
 * ball stands well clear of it, and nothing turns through it.
 */
/** A vane, in its own frame: out along x from the hub, its straight back on the x axis, its leading edge toward -y; the crook where the curl leaves the blade, and the curl's point. */
const V = 0.32
const ROOT: Pt = [0.035, -0.05]
const CROOK: Pt = [V - 0.06, -0.11]
const CURL: Pt = [V, -0.2]
/** How near the ball's centre comes to a vane's edge. */
const C = R + 0.01
/** Where a ball sits in the crook, touching both edges. */
const POCKET: Pt = (() => {
  const unit = (from: Pt, to: Pt): Pt => {
    const d = Math.hypot(to[0] - from[0], to[1] - from[1])
    return [(to[0] - from[0]) / d, (to[1] - from[1]) / d]
  }
  const e1 = unit(CROOK, ROOT)
  const e2 = unit(CROOK, CURL)
  const half = Math.acos(e1[0] * e2[0] + e1[1] * e2[1]) / 2
  const mid = Math.hypot(e1[0] + e2[0], e1[1] + e2[1])
  const reach = C / Math.sin(half)
  return [CROOK[0] + (reach * (e1[0] + e2[0])) / mid, CROOK[1] + (reach * (e1[1] + e2[1])) / mid]
})()
/** The ride: how far from the hub, and how far round ahead of the vane's back. */
const RS = Math.hypot(POCKET[0], POCKET[1])
const AHEAD = Math.atan2(-POCKET[1], POCKET[0])
/** The hub: over the path's end, as high as the ride is wide, so the ball is carried off the rail's end and only ever upward. */
const HUB: Pt = [-0.1, -RS]
/** Where the vane that stops the ball hangs, a little past straight down, and the ball's seat against its tip. */
const REST_A = (105 / 180) * Math.PI
const TIP: Pt = [HUB[0] + V * Math.cos(REST_A), HUB[1] + V * Math.sin(REST_A)]
const SEAT: Pt = [TIP[0] - Math.sqrt(R * R - TIP[1] * TIP[1]), 0]
/** The ball is let go at this angle, going straight up the far side, and where it lands on the shelf. */
const LET_GO = (8 / 180) * Math.PI
const LAND: Pt = [0.475, -1]
const LEDGE = 0.44
const FLIGHT = 0.55
const ARC = 0.5

/** The spin the knock gives the wheel, radians a second, and how long it takes to die away. */
const SPIN = 19
const TAU = 1.6
const T_HIT = (0.5 + SEAT[0] - 0.04) / ROLL
const FIRE = T_HIT + 0.04 / (ROLL / 2)

/** How far the wheel has turned `s` seconds after the knock. */
const turned = (s: number) => (s <= 0 ? 0 : SPIN * TAU * (1 - Math.exp(-s / TAU)))
/** When it has turned by `a`. */
const turnedBy = (a: number) => -TAU * Math.log(1 - a / (SPIN * TAU))

/** The back of the vane that carries the ball, a quarter turn behind the one it hit, at piece time `t`. */
const backAt = (t: number) => REST_A + Math.PI / 2 - turned(t - FIRE)

/** How near a ball on the path at `x` is to the leading side of a vane whose back is at angle `a`. */
function nearVane(x: number, a: number): number {
  const dx = x - HUB[0]
  const dy = -HUB[1]
  const at: Pt = [dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)]
  const toEdge = (from: Pt, to: Pt) => {
    const ux = to[0] - from[0]
    const uy = to[1] - from[1]
    const f = Math.min(1, Math.max(0, ((at[0] - from[0]) * ux + (at[1] - from[1]) * uy) / (ux * ux + uy * uy)))
    return Math.hypot(from[0] + ux * f - at[0], from[1] + uy * f - at[1])
  }
  return Math.min(toEdge(ROOT, CROOK), toEdge(CROOK, CURL), toEdge(CURL, [V, 0]))
}

/** It reaches the ball at its seat at CATCH, has it under the hub and in its crook at UNDER, and lets it go at GO. */
const T_UNDER = FIRE + turnedBy(REST_A - AHEAD)
const T_GO = FIRE + turnedBy(REST_A + Math.PI / 2 - AHEAD - LET_GO)
const T_CATCH = (() => {
  let t = FIRE
  while (t < T_UNDER && nearVane(SEAT[0], backAt(t)) > C) t += 0.0005
  return t
})()

/** The ball on the wheel at piece time `t`: shoved along the path, then carried round in the crook. */
function riding(t: number): Pt {
  const a = backAt(t)
  if (t >= T_UNDER) return [HUB[0] + RS * Math.cos(a - AHEAD), HUB[1] + RS * Math.sin(a - AHEAD)]
  let lo = SEAT[0]
  let hi = HUB[0]
  if (nearVane(lo, a) >= C) return SEAT
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (nearVane(mid, a) >= C) hi = mid
    else lo = mid
  }
  return [hi, 0]
}

const LANE: Lane = (() => {
  const ride = [...trace(riding, T_CATCH, T_UNDER, 6), ...trace(riding, T_UNDER, T_GO, 10)]
  const go = ride[ride.length - 1].to
  return {
    segs: [
      roll([-0.5, 0], [SEAT[0] - 0.04, 0], ROLL),
      ramp([SEAT[0] - 0.04, 0], SEAT, ROLL, 0),
      wait(SEAT, T_CATCH - FIRE),
      ...ride,
      fly(go, LAND, FLIGHT, ARC),
      fly(LAND, [LAND[0] + 0.015, -1], 0.03, 0.006),
      ramp([LAND[0] + 0.015, -1], [0.5, -1], 1.6, ROLL),
    ],
    fire: FIRE,
  }
})()

export const pinwheel = definePiece<{ color: string }>({
  name: 'pinwheel',
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
  draw: (p, s, { k, since, ink, bg, weight }) => {
    const phi = turned(since)

    // The path in, ending on the pinwheel's stick; the ground; the shelf a floor up on a tall stake.
    rail(p, k, ink, weight, -0.5, HUB[0])
    soil(p, k, ink, weight, -0.5, 0.5)
    tuft(p, k, ink, weight, 0.3, 0.5, 0.1, 0.03)
    rail(p, k, ink, weight, LEDGE, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, 0.47, -1 + FLOOR, 0.5)

    // The stick, from the ground up past the path's end to the hub.
    outline(p, ink, weight * 1.3)
    p.line(HUB[0] * k, 0.5 * k, HUB[0] * k, HUB[1] * k)
    outline(p, ink, weight)
    p.line((HUB[0] - 0.06) * k, 0.5 * k, (HUB[0] + 0.06) * k, 0.5 * k)

    // The wheel: four vanes, each a blade with a straight back and its outer corner curled forward, paper side out; and the pin.
    p.push()
    p.translate(HUB[0] * k, HUB[1] * k)
    for (let i = 0; i < 4; i++) {
      p.push()
      p.rotate(REST_A + (i * Math.PI) / 2 - phi)
      solid(p, ink, weight, s.color)
      p.quad(ROOT[0] * k, 0, V * k, 0, CROOK[0] * k, CROOK[1] * k, ROOT[0] * k, ROOT[1] * k)
      solid(p, ink, weight, bg)
      p.triangle(V * k, 0, CURL[0] * k, CURL[1] * k, CROOK[0] * k, CROOK[1] * k)
      p.pop()
    }
    solid(p, ink, weight, bg)
    p.circle(0, 0, 0.09 * k)
    p.pop()
  },
})

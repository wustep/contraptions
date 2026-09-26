import type { Pt, Seg } from '../../../../../parts'
import { R } from '../../../../../parts'
import {
  CHIMNEY_X,
  FLY,
  FLYWHEEL,
  FLY_R,
  OOM,
  PHI_DOWN,
  PISTONS,
  PISTON_X,
  S_LAND,
  T0,
  T2,
  YOKE_GOES,
  YOKE_SEAT,
  clamp01,
  flyAngle,
  hammerPhi,
  kt,
  onPiston,
  onTail,
  polar,
  yokeSeatY,
} from './heart-clock'

/**
 * Peer's path through the heart, one function of show time for both parts, in gears' frame. Each piece is a ride
 * (sampled from the same function the drawing uses), a flight (a parabola between two struck moments) or the last
 * straight fall. `lane(from, to, dx)` cuts it into a lane for a part's slot.
 */

type Piece =
  | { t0: number; t1: number; kind: 'ride'; at: (T: number) => Pt; hz: number }
  | { t0: number; t1: number; kind: 'hop'; from: Pt; to: Pt; g: number }
  | { t0: number; t1: number; kind: 'fly'; p0: Pt; v0: Pt; p1: Pt }
  | { t0: number; t1: number; kind: 'fall'; from: Pt; to: Pt }

/** Where he sits on the flywheel: a hair outside its pitch circle, cradled in a gap between two teeth. */
export const RIDE_F = FLY_R + 0.05
/** When the flywheel lets him go (off its right shoulder) and where on it he is then. */
export const OFF_FLY = kt(222)
const OFF_ANGLE = -0.9
/** Where on the flywheel he lands (at FLY), so that he is at OFF_ANGLE when it lets him go. */
export const LAND_ANGLE = OFF_ANGLE - (flyAngle(OFF_FLY) - flyAngle(FLY))
/** His angle on the flywheel at T while he rides it. */
export const flyRideAngle = (T: number): number => LAND_ANGLE + flyAngle(T) - flyAngle(FLY)
export const onFly = (T: number): Pt => polar(FLYWHEEL.at, RIDE_F, flyRideAngle(T))

/** Where along the tail he lands on each bounce (from the pivot): creeping a little toward it. */
const BOUNCE_S = [S_LAND, S_LAND + 0.05, S_LAND + 0.1, S_LAND + 0.15, S_LAND + 0.2]

/** The piston hops: the beat he lands on each head (at its bottom), which head, and the beat he is flung off it. */
export const HOPS: { k: number; i: number; off: number }[] = [
  // The pistons (B): a head every two beats, across and back; landing on 1 and 3, flung off at the top on 2 and 4.
  { k: 224, i: 0, off: 225 },
  { k: 226, i: 1, off: 227 },
  { k: 228, i: 2, off: 229 },
  { k: 230, i: 1, off: 231 },
  { k: 232, i: 0, off: 233 },
  { k: 234, i: 1, off: 235 },
  { k: 236, i: 2, off: 237 },
  { k: 238, i: 1, off: 239 },
  // The great bellows (B again): the strokes doubled; over the middle head, end to end, higher.
  { k: 240, i: 0, off: 241 },
  { k: 244, i: 2, off: 245 },
  { k: 248, i: 0, off: 249 },
  { k: 252, i: 2, off: 253 },
  // The runaway: back on the first head (the seam), flung onto the governor's yoke.
  { k: 256, i: 0, off: 257 },
]
/** He lands on the governor's yoke here. */
export const ON_YOKE = kt(260)
/** The beats the yoke bucks and tosses him (landing a beat later): each bar's 1, then from the valve every 1 and 3. */
export const YOKE_BUCKS: number[] = [264, 268, 272, 274, 276, 278, 280, 282, 284]
/** Where he is on the first head at the seam: half a cell short of gears' exit. */
const SEAM_DX = 9.5 - PISTON_X[0]

function pieces(): Piece[] {
  const out: Piece[] = []
  // On the hammer's tail from his landing until the first blow flicks him up.
  out.push({ t0: T0, t1: OOM[0], kind: 'ride', at: (T) => onTail(hammerPhi(T), S_LAND), hz: 240 })
  // Batted up on the blows: two beats, two, two, then four, then flung four beats across onto the flywheel.
  const lands = [1, 2, 3, 5]
  let from: Pt = onTail(PHI_DOWN, S_LAND)
  let t = OOM[0]
  lands.forEach((n, j) => {
    const to = onTail(PHI_DOWN, BOUNCE_S[j + 1])
    out.push({ t0: t, t1: OOM[n], kind: 'hop', from, to, g: n - (j ? lands[j - 1] : 0) >= 2 ? 9.5 : 17 })
    from = to
    t = OOM[n]
  })
  const onto = onFly(FLY)
  out.push({ t0: t, t1: FLY, kind: 'hop', from, to: onto, g: 10.5 })
  // Carried up and over the top of the great wheel.
  out.push({ t0: FLY, t1: OFF_FLY, kind: 'ride', at: onFly, hz: 30 })
  // A tooth flicks him off its shoulder (beat 3), out over the rim onto the first head as the pistons start.
  out.push({ t0: OFF_FLY, t1: PISTONS, kind: 'hop', from: onFly(OFF_FLY), to: onPiston(0, PISTONS, SEAM_DX), g: 16 })
  // The pistons.
  HOPS.forEach((h, j) => {
    const dx = h.k === 256 || h.k === 224 || (h.i === 0) ? SEAM_DX : 0
    const i = h.i
    // Ride the head up from its bottom to its top.
    out.push({ t0: kt(h.k), t1: kt(h.off), kind: 'ride', at: (T) => onPiston(i, T, dx), hz: 120 })
    const next = HOPS[j + 1]
    if (next) {
      const ndx = next.i === 0 ? SEAM_DX : 0
      const span = next.k - h.off
      out.push({ t0: kt(h.off), t1: kt(next.k), kind: 'hop', from: onPiston(i, kt(h.off), dx), to: onPiston(next.i, kt(next.k), ndx), g: span >= 3 ? 11 : 26 })
    }
  })
  // Flung from the first head over the other two onto the governor's yoke.
  const last = HOPS[HOPS.length - 1]
  out.push({ t0: kt(last.off), t1: ON_YOKE, kind: 'hop', from: onPiston(last.i, kt(last.off), SEAM_DX), to: [YOKE_SEAT, yokeSeatY(ON_YOKE) - R], g: 11 })
  // Lifted on the yoke as the governor spins up; the yoke bucks under him on the blows, harder as it runs away:
  // on each bar's downbeat at first, then on every 1 and 3; each time he is tossed up and comes down on the backbeat.
  const seat = (T: number): Pt => [YOKE_SEAT, yokeSeatY(T) - R]
  let at = ON_YOKE
  for (const k of YOKE_BUCKS) {
    const up = kt(k)
    const down = kt(k + 1)
    if (up > at + 1e-6) out.push({ t0: at, t1: up, kind: 'ride', at: seat, hz: 60 })
    const hgt = 0.1 + 0.32 * clamp01((k - 262) / 22)
    const T = down - up
    out.push({ t0: up, t1: down, kind: 'hop', from: seat(up), to: seat(down), g: (8 * hgt) / (T * T) })
    at = down
  }
  out.push({ t0: at, t1: YOKE_GOES, kind: 'ride', at: seat, hz: 60 })
  // The yoke goes: straight down to the chimney's foot.
  out.push({ t0: YOKE_GOES, t1: T2, kind: 'fall', from: [CHIMNEY_X, yokeSeatY(YOKE_GOES) - R], to: [CHIMNEY_X, 0] })
  return out
}

export const PATH = pieces()

/** A flight that leaves `p0` with velocity `v0` and arrives at `p1` after `T` seconds: gravity and a little drift solved to fit. */
function flyAt(p: Extract<Piece, { kind: 'fly' }>, t: number): Pt {
  const T = p.t1 - p.t0
  const ax = (2 * (p.p1[0] - p.p0[0] - p.v0[0] * T)) / (T * T)
  const ay = (2 * (p.p1[1] - p.p0[1] - p.v0[1] * T)) / (T * T)
  return [p.p0[0] + p.v0[0] * t + 0.5 * ax * t * t, p.p0[1] + p.v0[1] * t + 0.5 * ay * t * t]
}

/** Where Peer is at show time T on the whole path (gears' frame): for the drawings (trolls look at him). */
export function peerAt(T: number): Pt {
  const p = PATH.find((q) => T >= q.t0 && T <= q.t1) ?? (T < T0 ? PATH[0] : PATH[PATH.length - 1])
  const tt = Math.max(p.t0, Math.min(p.t1, T))
  const u = p.t1 > p.t0 ? (tt - p.t0) / (p.t1 - p.t0) : 1
  switch (p.kind) {
    case 'ride':
      return p.at(tt)
    case 'hop': {
      const arc = (p.g * (p.t1 - p.t0) ** 2) / 8
      return [p.from[0] + (p.to[0] - p.from[0]) * u, p.from[1] + (p.to[1] - p.from[1]) * u - arc * 4 * u * (1 - u)]
    }
    case 'fly':
      return flyAt(p, tt - p.t0)
    case 'fall':
      return [p.from[0] + (p.to[0] - p.from[0]) * u * u, p.from[1] + (p.to[1] - p.from[1]) * u * u]
  }
}

/** The lane segments for [from, to] (show seconds), moved `dx` cells (the runaway's frame is gears' less RUN_DX). */
export function laneOf(from: number, to: number, dx = 0): Seg[] {
  const segs: Seg[] = []
  const mv = (p: Pt): Pt => [p[0] - dx, p[1]]
  for (const p of PATH) {
    if (p.t1 <= from + 1e-9 || p.t0 >= to - 1e-9) continue
    const a = Math.max(from, p.t0)
    const b = Math.min(to, p.t1)
    if (p.kind === 'hop') {
      segs.push({ from: mv(p.from), to: mv(p.to), dur: b - a, arc: (p.g * (p.t1 - p.t0) ** 2) / 8 })
    } else if (p.kind === 'fall') {
      segs.push({ from: mv(p.from), to: mv(p.to), dur: b - a, ease: 'in' })
    } else {
      const hz = p.kind === 'ride' ? p.hz : 120
      const n = Math.max(1, Math.ceil((b - a) * hz))
      const f = p.kind === 'ride' ? p.at : (T: number) => flyAt(p, T - p.t0)
      for (let i = 0; i < n; i++) {
        const t0 = a + ((b - a) * i) / n
        const t1 = a + ((b - a) * (i + 1)) / n
        segs.push({ from: mv(f(t0)), to: mv(f(t1)), dur: t1 - t0 })
      }
    }
  }
  return segs
}


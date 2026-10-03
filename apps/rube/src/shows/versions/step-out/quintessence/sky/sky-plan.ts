import type { Pt, Seg } from '../../../../../parts'
import { R } from '../../../../../parts'
import { carried, route, smooth, type Way } from '../kit'
import { at, BEATS, SEAM } from '../music'
import { G, hop, throwFor } from '../physics'

/**
 * The sky's numbers and clocks (B3's): where everything stands in the place's own cells, and every moving thing as a
 * pure function of show time, so the drawing, the lane and the camera read the same motion.
 *
 * The frame: Walter comes in at (-0.5, 0) running across the helipad, whose surface is at y 0.13. The pad is on a
 * quay at the harbour's edge; the sea is everywhere at one level (`SURF`, a little over a cell under the pad), so the
 * helicopter that leaves the pad comes down at the end over the same water, nearly as low as it started.
 *
 * The helicopter is drawn in its own frame (`Pt` local, +x forward, y down): its origin is where Walter sits in the
 * open side door (a ball's centre there; the cabin floor is at local y 0.13). It is placed in the world by `heli(t)`:
 * a point and a pitch (nose down positive, as a forward flight leans).
 */

/* ------------------------------------------------------------------ the clock */

export const BEGIN = SEAM.sky
export const END = SEAM.sea
/** The run ends with a leap off the pad on beat 4 of bar 25, landing in the door on bar 26. */
export const LEAP = at(25, 4)
export const IN = at(26)
/** The skids leave the pad. */
export const LIFT = at(27)
/** Turbulence: the cabin drops from under him and catches him again, on these downbeats. */
export const BUMPS = [at(29), at(31), at(33)]
/** He steps down out of the door onto the skid (bar 35), and jumps (beat 3 of bar 36). */
export const STEP = at(35)
export const JUMP = at(36, 3)
/** The cut to the wide (on bar 33's bump) and back (on the step down). */
export const WIDE_FROM = at(33)
export const WIDE_TO = STEP
/** The tail's white strobe fires on every downbeat while he has the sky. */
export const STROBES = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36].map((b) => at(b))
/** The pilot looks back at him (bar 34), and shakes his head: he will not set down by the boat (bar 36). */
export const LOOK = at(34)
export const NO = at(36)

/** Where the beat is: how many beats since the first, with the fraction. The rotor turns once a beat. */
export function beatPhase(t: number): number {
  let lo = 0
  let hi = BEATS.length - 1
  if (t <= BEATS[0].t) return (t - BEATS[0].t) / 0.417
  if (t >= BEATS[hi].t) return hi + (t - BEATS[hi].t) / 0.417
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (BEATS[mid].t <= t) lo = mid
    else hi = mid
  }
  return lo + (t - BEATS[lo].t) / (BEATS[hi].t - BEATS[lo].t)
}

/* ------------------------------------------------------------------ the helicopter */

/** Its parts, in its own frame: the door's floor and opening, the cabin, the boom, the skids, the rotor. */
export const H = {
  floor: 0.13,
  door: { x0: -0.72, x1: 0.62, top: -1.0 },
  body: { x0: -1.35, x1: 2.25, top: -1.3, bottom: 0.38 },
  glass: { x0: 0.85, x1: 2.25 },
  boom: { x0: -1.3, x1: -4.5, y: -0.8 },
  skid: { x0: -1.15, x1: 1.75, y: 0.8, h: 0.06 },
  mast: { x: 0.05, y: -1.78 },
  blade: 3.1,
  tail: { x: -4.45, y: -1.05, r: 0.55 },
  seat: [0.32, 0] as Pt,
  /** Where he stands on the skid. */
  onSkid: [0.6, 0.8 - R] as Pt,
}

/** Where it stands on the pad: the skids' foot on the pad's surface (0.13). */
const PARK_X = 3.2
const PARK_Y = 0.13 - H.skid.y - H.skid.h
/** How high it cruises, and where it hovers at the end. */
const CRUISE_Y = -7.2

/** Its forward speed, cells a second: off the pad, up to cruise, slowing to a hover as it comes down by the boat. */
function speed(t: number): number {
  return 0.3 * smooth(t, LIFT, LIFT + 0.8) + 3.9 * smooth(t, LIFT + 0.6, at(29) + 0.3) - 3.9 * smooth(t, at(33) + 0.2, at(35) + 0.4) + 3.6 * smooth(t, END + 0.6, END + 3.5)
}

// The flight, integrated once: a table of x every 4 ms (the speed is smooth, so a straight line between is exact enough).
const STEP_S = 0.004
const XS: number[] = []
{
  let x = PARK_X
  for (let t = LIFT; t <= END + 8 + 1e-9; t += STEP_S) {
    XS.push(x)
    const a = speed(t)
    const b = speed(t + STEP_S)
    x += ((a + b) / 2) * STEP_S
  }
}
// Before the lift there is no speed at all; from it, the floor speed 0.3 eases in with the rest (see `speed`).
function rawX(t: number): number {
  if (t <= LIFT) return PARK_X
  const i = (t - LIFT) / STEP_S
  const j = Math.min(XS.length - 2, Math.floor(i))
  const f = i - j
  return XS[j] + (XS[j + 1] - XS[j]) * f
}

/** Turbulence: the cabin drops a little under him over the beat before each bump, and comes back. */
function dip(t: number): number {
  let d = 0
  for (const b of BUMPS) {
    const u = t - (b - 0.32)
    if (u < 0 || u > 1.2) continue
    d += 0.16 * Math.sin(Math.min(1, u / 0.32) * Math.PI * 0.5) * Math.exp(-Math.max(0, u - 0.32) / 0.25)
  }
  return d
}

let hoverY = 0
/** The helicopter at `t`: its origin in the world and its pitch. */
export function heli(t: number): { x: number; y: number; a: number } {
  if (t <= LIFT) return { x: PARK_X, y: PARK_Y, a: 0 }
  const climb = PARK_Y + (-2.5 - PARK_Y) * smooth(t, LIFT, at(28) + 0.2) + (CRUISE_Y + 2.5) * smooth(t, at(28) - 0.2, at(30) + 0.8)
  const down = (hoverY - CRUISE_Y) * smooth(t, at(33) + 0.2, at(35) + 0.7)
  const bob = 0.09 * Math.sin(((t - LIFT) / 2.6) * Math.PI * 2) * smooth(t, at(28), at(29)) * (1 - smooth(t, at(34), at(35) + 0.5))
  const x = rawX(t)
  const v = speed(t)
  const acc = (speed(t + 0.05) - speed(t - 0.05)) / 0.1
  // Nose down to go and to hold its speed; nose up to slow (a flare), and level in the hover.
  const a = Math.max(-0.2, Math.min(0.2, 0.024 * Math.max(0, v - 0.3) + 0.1 * acc)) * smooth(t, LIFT, LIFT + 0.5)
  // Rid of him, it climbs away and goes on (what the sea sees of it, above the surface).
  const away = -7 * smooth(t, END + 0.25, END + 4.5)
  return { x, y: climb + down + bob + dip(t) + away, a }
}

/** A point of the helicopter's frame, in the world, at `t`. */
export function onHeli(t: number, l: Pt): Pt {
  const h = heli(t)
  const c = Math.cos(h.a)
  const s = Math.sin(h.a)
  return [h.x + l[0] * c - l[1] * s, h.y + l[0] * s + l[1] * c]
}

/* ------------------------------------------------------------------ Walter */

/** Where he is in the helicopter's frame, from the moment he lands in its door until he jumps. */
function inCabin(t: number): Pt {
  const [sx, sy] = H.seat
  // Rolled in from the door's leading edge with the run's speed, slowing to his place by the parcel.
  if (t < IN + 0.32) {
    const u = Math.max(0, (t - IN) / 0.32)
    return [sx - 0.36 * (1 - u) * (1 - u), sy]
  }
  // The bumps: a free flight off the floor that lands on the beat.
  for (const b of BUMPS) {
    const T = 0.3
    if (t >= b - T && t < b) {
      const u = (t - (b - T)) / T
      return [sx, sy - 0.5 * G * T * T * u * (1 - u)]
    }
  }
  if (t < STEP - 0.334) return [sx, sy]
  // Down out of the door onto the skid, from rest under gravity.
  if (t < STEP) {
    const T = 0.334
    const u = (t - (STEP - T)) / T
    const [kx, ky] = H.onSkid
    return [sx + (kx - sx) * u, sy + (ky - sy) * u * u]
  }
  return H.onSkid
}

/** His place in the world from his landing in the door to the jump. */
const walterAboard = (t: number): Pt => onHeli(t, inCabin(t))

/** The run, the leap and the ride, the jump and the fall, as waypoints and carried pieces; the exit; the strikes. */
export interface Plan {
  segs: Seg[]
  leave: Pt
  splash: Pt
  /** The sea's surface: a ball's centre is at it as he goes in. */
  surf: number
}

export function plan(begin: number): Plan {
  const run: Way = { at: 0, p: [-0.5, 0] }
  const off: Way = { at: LEAP - begin, p: [-0.5 + 2.2 * (LEAP - begin), 0] }
  const door = walterAboard(IN)
  const into = hop(off, door, IN - begin)
  const leave = walterAboard(JUMP)
  const T = END - JUMP
  const v: Pt = [0.3, 7 - G * T]
  const fall = throwFor({ at: JUMP - begin, p: leave }, v, T)
  const segs: Seg[] = [...route([run, off, into]), ...carried((s) => walterAboard(s + begin), IN - begin, JUMP - begin, Math.ceil((JUMP - IN) / 0.02)), ...route([{ at: JUMP - begin, p: leave }, fall])]
  return { segs, leave, splash: fall.p, surf: fall.p[1] }
}

// The hover is set so that the jump from the skid, at the seam's speed, meets the water exactly at the cut; and the
// sea is everywhere at that level (on the skid, level in the hover, he is `onSkid.y` under the origin).
/** The water's level (a ball's centre at it as it goes in): the hover is set from it. */
export const SURF = 1.3
{
  const T = END - JUMP
  const vy = 7 - G * T
  const drop = vy * T + 0.5 * G * T * T
  hoverY = SURF - drop - H.onSkid[1]
}

/** The parcel he jumps with: beside him, a little ahead, from the moment he is on the skid. */
export const PARCEL_OFF: Pt = [0.27, 0.02]
/** Where the parcel is in the helicopter's frame while it rides on the floor beside his seat. */
export const PARCEL_SEAT: Pt = [-0.2, 0.13]

/** The quay's edge, and the boat: its hull's stern a little right of where he goes in, at the sea's level. */
export const QUAY_X = 7.4

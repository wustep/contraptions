import type { Pt } from '../../../../parts'
import { BIRDS, BOARD, BONE, CLEAR, CRATE, DAWN, DRIVE_END, EGG, EGG_AT, GATES, JEEP, LAB, LAST, LIFT, PIPETTES, VALLEY } from './music'

/**
 * Every motion in the show, as a function of show time. The lanes sample these, and the drawings read the same
 * functions, so a ball cannot slide off the thing that carries it. Each prop has one job. A gesture starts on a
 * landmark and eases to rest on the next; nothing oscillates except a small ring after a lock, and that ring is zero
 * at the instant it starts.
 */

/** 0 until `a`, 1 from `b`, smooth between, so a gesture starts and ends at rest. */
export function smooth(t: number, a: number, b: number): number {
  if (!(b > a)) return t >= b ? 1 : 0
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/** A ring after a lock: 0 at the instant, then a dying wobble. */
export function ring(since: number, hz: number, decay: number): number {
  if (since < 0) return 0
  return Math.exp(-since / decay) * Math.sin(2 * Math.PI * hz * since)
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u

/* ------------------------------------------------------------------ the dig */

/** He rolls out of the dust to the bone during the first phrase, and waits out the breath. */
export const TO_BONE = 6.15
/** The bone has stood up; he rolls under it. */
export const PAST_BONE = BONE + 1.05

export const DIG_START: Pt = [-0.5, 0]
export const DIG_AT_BONE: Pt = [3.38, 0]
export const DIG_IN_CRATE: Pt = [8.22, 0]

/** The brush's one job: one sweep, left to right, across the first phrase. It stops beside him, short of the bone. */
export function brushX(t: number): number {
  return -1.7 + smooth(t, 0.3, 6.05) * 4.25
}

/** The bone's one job: it stands up on the second phrase. Angle 0 lies to the right; negative lifts the tip. */
export const BONE_PIVOT: Pt = [3.72, 0.07]
export const BONE_LEN = 2.95
export function boneAng(t: number): number {
  const u = smooth(t, BONE, BONE + 0.95)
  return 0.04 + (u + ring(t - (BONE + 0.95), 1.3, 0.42) * 0.015) * (-1.22 - 0.04)
}

export function grantDig(t: number): Pt {
  if (t <= 1.05) return DIG_START
  if (t <= TO_BONE) {
    const u = smooth(t, 1.05, TO_BONE)
    return [lerp(DIG_START[0], DIG_AT_BONE[0], u), 0]
  }
  if (t <= PAST_BONE) return DIG_AT_BONE
  if (t <= CRATE) {
    const u = smooth(t, PAST_BONE, CRATE)
    return [lerp(DIG_AT_BONE[0], DIG_IN_CRATE[0], u), 0]
  }
  return DIG_IN_CRATE
}

/* ------------------------------------------------------------------ the lab */

/** He waits while the cane opens, then goes. */
export const LAB_LEAVE = 18.4
export const LAB_PIP: Pt = [6.2, 0]
export const LAB_EGG: Pt = [15.72, 0]
/** She is already there, on the far side of the egg, and she does not move. */
export const ELLIE_LAB: Pt = [18.22, 0]
export const EGG_X = 16.95

/** The cane's amber, one job: it opens on the third phrase. 0 shut, 1 open. */
export function caneOpen(t: number): number {
  return smooth(t, LAB, LAB + 1.65)
}

/** The rack's one job: it tips as he arrives. Radians, clockwise in screen space. */
export function pipetteAng(t: number): number {
  const u = smooth(t, PIPETTES, PIPETTES + 0.72)
  return (u + ring(t - (PIPETTES + 0.72), 1.6, 0.38) * 0.02) * 1.05
}

/** The egg's one job: the shell opens on the small note in the hush. */
export function eggOpen(t: number): number {
  return smooth(t, EGG, EGG + 2.4)
}

export function grantLab(t: number): Pt {
  if (t <= LAB_LEAVE) return [-0.5, 0]
  if (t <= PIPETTES) {
    const u = smooth(t, LAB_LEAVE, PIPETTES)
    return [lerp(-0.5, LAB_PIP[0], u), 0]
  }
  if (t <= PIPETTES + 0.5) return LAB_PIP
  if (t <= EGG_AT) {
    const u = smooth(t, PIPETTES + 0.5, EGG_AT)
    return [lerp(LAB_PIP[0], LAB_EGG[0], u), 0]
  }
  return LAB_EGG
}

/* ------------------------------------------------------------------ the valley */

export const POST_L = 2.4
export const POST_R = 9.2
/** Where the neck joins the shoulder. High enough that the legs are long and the body has a chest. */
export const SHOULDER: Pt = [22.8, -7.6]
export const NECK_LEN = 16.2
/**
 * The rise, landed on the crests: lowered at the entrance, through the gate on the first crest, over the trees on the
 * next, and up on the full statement. Each join is at rest.
 */
const RISE: [number, number][] = [
  [VALLEY, -0.45],
  [GATES, 0.55],
  [CLEAR, 0.98],
  [BIRDS, 1.22],
]
/** How far along the neck the basket sits: at the shoulder, so the head still towers over him. */
export const BASKET = 0.2

export const JEEP_X0 = 6.55
export const JEEP_X1 = 21.6
export const SEAT = 0.46
export const ELLIE_SEAT = 1.12

/**
 * The neck's one job: it rises, and each crest is a place it arrives. The head clears the gate on the first crest and
 * the trees on the next, because those lines are taken from this function.
 */
export function neckAng(t: number): number {
  let a = RISE[0][1]
  for (let i = 0; i < RISE.length - 1; i++) {
    const [t0, a0] = RISE[i]
    const [t1, a1] = RISE[i + 1]
    if (t < t1) {
      a = a0 + smooth(t, t0, t1) * (a1 - a0)
      break
    }
    a = a1
  }
  return a + ring(t - BIRDS, 0.65, 0.8) * 0.012
}

/** A point `frac` of the way from the shoulder to the head. */
export function alongNeck(t: number, frac: number): Pt {
  const a = neckAng(t)
  const L = NECK_LEN * frac
  return [SHOULDER[0] + Math.cos(a) * L, SHOULDER[1] - Math.sin(a) * L]
}

/** The gate top sits just under the head at the moment the gates lock, so the crest and the clearance are one. */
export const GATE_TOP = alongNeck(GATES, 1)[1] + 0.62
/** The tallest trees sit just under the head when it clears them. */
export const CANOPY = alongNeck(CLEAR, 1)[1] + 0.7

/** The gates' one job: they open from the entrance and lock on the first crest. 0 shut, 1 open. */
export function gateOpen(t: number): number {
  const u = smooth(t, VALLEY, GATES)
  return Math.min(1.03, u + ring(t - GATES, 1.5, 0.55) * 0.012)
}

/** The jeep's one job: it drives, from the moment he is in it until it stops. */
export function jeepX(t: number): number {
  return JEEP_X0 + smooth(t, JEEP, DRIVE_END) * (JEEP_X1 - JEEP_X0)
}

/** The basket, fixed on the neck. */
export function cageAt(t: number): Pt {
  return alongNeck(t, BASKET)
}

/**
 * The lift's one job: one rise from the jeep to the basket. He eases onto the basket while the basket is itself
 * moving, and arrives on it with the basket's own speed.
 */
export function grantValley(t: number): Pt {
  if (t <= GATES) return [-0.5, 0]
  if (t <= JEEP) {
    const u = smooth(t, GATES, JEEP)
    return [lerp(-0.5, JEEP_X0 + SEAT, u), 0]
  }
  if (t <= DRIVE_END) return [jeepX(t) + SEAT, 0]
  if (t <= BOARD) return [jeepX(DRIVE_END) + SEAT, 0]
  if (t <= CLEAR) {
    const u = smooth(t, BOARD, CLEAR)
    const from = jeepX(DRIVE_END) + SEAT
    const cage = cageAt(t)
    return [lerp(from, cage[0], u), lerp(0, cage[1], u)]
  }
  return cageAt(t)
}

/** She waits in the jeep, rides it, and is lifted with him, a little further along the neck. */
export function ellieValley(t: number): Pt {
  if (t <= BOARD) return [jeepX(Math.min(Math.max(t, JEEP), DRIVE_END)) + ELLIE_SEAT, 0]
  const u = t >= CLEAR ? 1 : smooth(t, BOARD, CLEAR)
  const fromX = jeepX(DRIVE_END) + ELLIE_SEAT
  const a = neckAng(t)
  const cage = cageAt(t)
  const to: Pt = [cage[0] + Math.cos(a) * 0.52, cage[1] - Math.sin(a) * 0.52]
  return [lerp(fromX, to[0], u), lerp(0, to[1], u)]
}

/** The birds' one job: they lift off the neck on the full statement. `i` is which bird. */
export function birdAt(t: number, i: number): Pt {
  const frac = 0.5 + i * 0.06
  const perch = alongNeck(Math.min(t, BIRDS), frac)
  const since = t - BIRDS
  const spread = (i - 3) * 0.62
  if (since <= 0) return [perch[0] + spread, perch[1] - 0.85]
  const rise = 4.4 * (1 - Math.exp(-since / 0.9))
  const drift = since * (0.28 + (i % 3) * 0.06)
  return [perch[0] + spread + drift, perch[1] - 0.85 - rise]
}

/* ------------------------------------------------------------------ the dawn */

/** The rotor's one job: a line becomes a disc, in the quiet, and is a disc by the time the helicopter lifts. */
export function rotorSpan(t: number): number {
  return smooth(t, DAWN + 1.5, LIFT)
}

/** The helicopter's one job: it lifts on the last statement and is gone out over the sea by the end of the fade. */
export function heliShift(t: number): Pt {
  const u = smooth(Math.min(t, LAST), LIFT, LAST)
  return [u * 16.5, -u * 7.6]
}

export function grantDawn(t: number): Pt {
  const h = heliShift(t)
  return [h[0] - 0.5, h[1]]
}

export function ellieDawn(t: number): Pt {
  const g = grantDawn(t)
  return [g[0] + 0.62, g[1]]
}

/** How far the helicopter has gone, for a drawing that wants the whole cabin. */
export const heliAt = heliShift

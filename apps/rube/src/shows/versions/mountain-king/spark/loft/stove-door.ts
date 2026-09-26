import type { Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { DOORS, LAST } from '../music'
import { DOOR, FIRE_MOUTH } from './layout'

/**
 * The firebox door of the parlour stove: when it opens and shuts, and where its latch is. LOFT-B's; the stove part
 * (`stove.ts`) rides the latch's grip and the hearth (`hearth.ts`) draws it, so both read the same clock.
 *
 * The door is hinged on its west edge (`DOOR.hinge`). Seen side on, a door swung open by φ shows as a panel
 * `DOOR_W · cos φ` wide from the hinge: narrowing to an edge at 90°, and past it its sooty inside face, west of the
 * hinge. Its latch is a lever on the outer face: a grip that points west from a pivot near the free edge, and a
 * tongue past the pivot that drops into a keeper on the stove's frame. Press the grip down and the tongue lifts out.
 *
 *   52.504  the spark lands on the grip: the tongue lifts, and the door creaks open under it, then swings wide
 *   58.3    after the spark has gone into the fire, it swings to, softly, and latches
 *   148.44  it bursts open from inside (the spark comes home through the fire, 148.491) and hits its stop
 *   149.815 drawn by the fire's draught it slams shut: the loudest chord of the piece
 */

/** The door's width, hinge to free edge, and its middle line. */
export const DOOR_W = DOOR.x1 - DOOR.x0
export const DOOR_MID = (DOOR.y0 + DOOR.y1) / 2

/** The latch, in door-local cells (from the hinge): the pivot, the grip's end (west of it), the tongue's end (east, past the free edge). */
export const LATCH = { pivot: 2.2, grip: 1.52, tongue: 2.78, y: DOOR_MID - 0.02, thick: 0.1 }
/** Where on the grip the spark stands (door-local x): near its end, with room for its light. */
export const GRIP_STAND = 1.62

/** Show time the door first opens (the spark has pressed the latch). */
export const DOOR_OPENS = 52.504
/** How far it opens: against its stop, a little past square to the stove's face. */
const WIDE = 1.86
/** The first opening: slow while the spark rides the grip, then wide. */
const OPEN_FOR = 1.9
/** After the spark has gone, it swings to. */
const SHUT_FROM = 58.4
const SHUT_FOR = 2.4

/** The return: bursts open just before the spark comes through (it is under the veil), slams on the last chord. */
const BURST = DOORS.back[2] - 0.05
const BANG = LAST[1]

/** Ease with a slow start and a long soft finish: a heavy iron door, unlatched, gathering itself and swinging. */
const creak = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  // Cubic in, then a long ease out: the first third is slow (the spark is riding the grip).
  return v < 0.38 ? 0.28 * Math.pow(v / 0.38, 2.2) : 0.28 + 0.72 * (1 - Math.pow(1 - (v - 0.38) / 0.62, 2.6))
}

/** The door's swing, radians: 0 shut, about 106° wide open. */
export function doorAngle(t: number): number {
  if (t < DOOR_OPENS) return 0
  if (t < BURST - 1) {
    // Opened by the spark: creaks, swings wide, taps its stop and settles; later swings to.
    const u = (t - DOOR_OPENS) / OPEN_FOR
    let a = WIDE * creak(u)
    const since = t - (DOOR_OPENS + OPEN_FOR)
    if (since > 0) a -= 0.05 * Math.exp(-since / 0.35) * Math.sin(since * 9)
    const shut = smooth(t, SHUT_FROM, SHUT_FROM + SHUT_FOR)
    return Math.max(0, a * (1 - shut))
  }
  if (t < BURST) return 0
  // Burst open from inside: fast, onto the stop, a bounce off it.
  const b = t - BURST
  let a = WIDE * (1 - Math.exp(-b / 0.045))
  a -= 0.22 * Math.exp(-b / 0.16) * Math.max(0, Math.sin(Math.max(0, b - 0.09) * 11))
  if (t < BANG) {
    // Drawn shut by the fire's draught: slow at first, faster and faster, and it slams on the chord.
    const u = Math.max(0, (t - (BANG - 0.95)) / 0.95)
    return Math.max(0, a * (1 - Math.pow(u, 2.4)))
  }
  // After the bang: a small rattle against the frame, and still.
  const s = t - BANG
  return 0.06 * Math.exp(-s / 0.07) * Math.abs(Math.sin(s * 34))
}

/** How much of the fire shows through the doorway, 0 shut to 1 wide open. */
export function doorOpen(t: number): number {
  const a = doorAngle(t)
  return Math.min(1, 1 - Math.cos(Math.min(a, Math.PI / 2)))
}

/**
 * The latch grip's dip, radians (its west end pressed down): the spark's weight on it from 52.504, sprung back once
 * it steps off; knocked down when the door bursts; clacked back into its keeper on the bang.
 */
export function gripDip(t: number): number {
  let d = 0
  // The spark lands on it (52.504) and rides it until it steps off; then it springs back, damped.
  const land = t - DOOR_OPENS
  const off = t - GRIP_OFF
  if (land >= 0 && off < 0) d = 0.34 * (1 - Math.exp(-land / 0.05))
  else if (off >= 0) d = 0.34 * Math.exp(-off / 0.12) * Math.cos(off * 16)
  // The burst knocks it, and the bang clacks it.
  const burst = t - BURST
  if (burst >= 0 && t < BANG) d += 0.3 * Math.exp(-burst / 0.25)
  const bang = t - BANG
  if (bang >= 0) d += -0.22 * Math.exp(-bang / 0.09) * Math.cos(bang * 30)
  return d
}

/** Show time the spark steps off the grip, down to the sill. */
export const GRIP_OFF = 52.95

/** A door-local point (x from the hinge, y in the room) as it is seen with the door swung by `a`. */
export const onDoor = (lx: number, y: number, a: number): Pt => [DOOR.hinge + lx * Math.cos(a), DOOR_MID + (y - DOOR_MID) * (1 + 0.1 * Math.sin(a) * (lx / DOOR_W))]

/** Where the top of the grip is under the spark at `t`, in the room's cells (the spark's centre is `R` above it). */
export function gripTop(t: number, lx = GRIP_STAND): Pt {
  const a = doorAngle(t)
  const d = gripDip(t)
  const dx = lx - LATCH.pivot
  // The grip turns about the pivot: its west end goes down by the dip.
  const y = LATCH.y - LATCH.thick / 2 - dx * Math.sin(d)
  return onDoor(LATCH.pivot + dx * Math.cos(d), y, a)
}

/** The sill: the lip at the foot of the doorway, where the spark gathers itself before the leap. */
export const SILL = { y: DOOR.y1, x0: DOOR.x0 + 0.1, x1: DOOR.x1 - 0.1 }

/** How brightly the fire burns, 0..1, beyond its breathing: banked, then woken by the spark, then roaring when it comes home. */
export function fireRoar(t: number): number {
  // Banked all night; it wakes as the spark gathers itself on the sill, and leaps up to take it (58.024).
  const wake = smooth(t, 53.4, 57.4) * 0.45 + smooth(t, 57.3, 58.0) * 0.55
  const after = t > DOORS.glass ? Math.exp(-(t - DOORS.glass) / 1.2) : 1
  const home = t >= BURST ? Math.exp(-(t - BURST) / 0.9) : 0
  return Math.max(0, Math.min(1, wake * after + home))
}

export { FIRE_MOUTH }

import type { Pt } from '../../../../parts'
import { DOORS, FESTIVAL, LAST, LOFT_SEAM } from './music'
import { FIRE_MOUTH, WICK } from './loft/layout'

/**
 * What the spark is doing at every seam, so the parts on either side agree without seeing each other.
 *
 * At a fire-door the camera carries the last framing across exactly (a match cut on the spark), so its place on the
 * screen is continuous by construction; its motion is continuous only if both sides keep to these:
 *
 * - `v`: the spark's velocity at the cut, cells a second, y down. The part before ends its lane moving at this; the
 *   part after starts moving at it (a flight carries on as the same parabola under the new world's gravity:
 *   `throwFor` in `physics.ts`).
 * - `cells`: how close the camera is at the cut. The part before has a key at the door (or just before it) at this
 *   distance, framed on the spark, and it is close: the fire it dives into fills the frame. The part after opens on
 *   it (its fire filling the frame) and pulls out to show its world.
 * - The fire itself: the part before draws the fire the spark goes into, big round the spark at the cut; the part
 *   after draws the fire it comes out of. Over both, for a third of a second either side, `fx.ts` lays a veil of
 *   flame that turns from one world's fire to the other's (`FIRES` in `worlds.ts`), so the cut is inside a fire.
 */
export interface Seam {
  t: number
  v: Pt
  cells: number
  /** What the spark is doing, in words, for whoever builds either side. */
  what: string
}

/**
 * The last leap: out of the loft stove's firebox door at the third return door, up and west over the bench's end, and
 * down onto the wick on the first last chord. Not a thrown ball's parabola (under the loft's gravity that would take a
 * second, or land still rising): it bursts out of the fire fast and settles onto the wick from above like a flame
 * drawn back to it, slowing all the way in. A cubic curve (`HOME_CURVE`) run on an easing clock (`homeClock`).
 */
export const HOME_CURVE: [Pt, Pt, Pt, Pt] = [FIRE_MOUTH, [FIRE_MOUTH[0] - 2.1, FIRE_MOUTH[1] - 2.2], [WICK[0] + 0.9, WICK[1] - 1.2], WICK]
const HOME_OUT = 1.3
const HOME_IN = 0.25
/** How far along `HOME_CURVE` the leap is at `u` (0..1 of its time): quick out of the fire, slow onto the wick. */
export const homeClock = (u: number): number => {
  const s = Math.max(0, Math.min(1, u))
  return (s ** 3 - 2 * s * s + s) * HOME_OUT + (-2 * s ** 3 + 3 * s * s) + (s ** 3 - s * s) * HOME_IN
}
/** Where the leap is at `u` (0..1 of its time), in the loft's cells. */
export function homeLeapAt(u: number): Pt {
  const s = homeClock(u)
  const v = 1 - s
  const [a, b, c, d] = HOME_CURVE
  return [
    v ** 3 * a[0] + 3 * v * v * s * b[0] + 3 * v * s * s * c[0] + s ** 3 * d[0],
    v ** 3 * a[1] + 3 * v * v * s * b[1] + 3 * v * s * s * c[1] + s ** 3 * d[1],
  ]
}
/** The leap's time, from the door home to the first last chord. */
export const HOME_LEAP_T = LAST[0] - DOORS.back[0]
/** The leap's velocity out of the firebox door: what the dart into the crate's fire keeps to (cells a second, y down). */
export const HOME_LEAP: Pt = [
  (3 * (HOME_CURVE[1][0] - HOME_CURVE[0][0]) * HOME_OUT) / HOME_LEAP_T,
  (3 * (HOME_CURVE[1][1] - HOME_CURVE[0][1]) * HOME_OUT) / HOME_LEAP_T,
]

export const SEAMS = {
  /** Inside the loft: LOFT-A hands the spark to LOFT-B. Not a door: one room, one camera. */
  loft: { t: LOFT_SEAM, v: [0.9, 0.9], cells: 5, what: 'dropping off the drying rack\'s last rod onto the dipping wheel, down and to the right, slowing' },
  glass: {
    t: DOORS.glass,
    v: [2.2, -0.4],
    cells: 2.2,
    what: 'a low leap into the loft stove\'s open firebox, to the right; out of the glassworks\' glory hole the same way, flying right',
  },
  regatta: {
    t: DOORS.regatta,
    v: [0.3, -3.0],
    cells: 2.4,
    what: 'carried up into the glass furnace\'s heat (its flue, or the glory hole\'s updraught), rising; out of a balloon burner\'s jet, rising',
  },
  railway: {
    t: DOORS.railway,
    v: [0.3, -3.4],
    cells: 2.4,
    what: 'sucked up into the top balloon\'s burner flame, rising; out of the locomotive\'s smokestack on its first chuff, rising, in a shower of sparks',
  },
  /** Inside the railway: EXPRESS hands the spark to FIREWORKS as the train brakes at the festival. */
  festival: { t: FESTIVAL, v: [4.5, -2.5], cells: 6, what: 'flung forward off the braking engine\'s front, up and to the right, into the festival\'s fireworks field' },
  /** Home on the roll, up and left: the festival's dart into the crate's fire is at the leap's speed (`HOME_LEAP`). */
  back: { t: DOORS.back[0], v: HOME_LEAP, cells: 2.4, what: 'darting up and left out of the ash into the fire of a burning crate; out of the loft stove\'s firebox door, on a leap that lands on the wick on the first last chord' },
} satisfies Record<string, Seam>

export type SeamKey = keyof typeof SEAMS

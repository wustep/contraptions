import type { Pt } from '../../../../parts'
import { DOORS, FESTIVAL, LAST, LOFT_SEAM } from './music'
import { launch, G } from './physics'
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

/** The last leap: out of the loft stove's firebox door at the third return door, onto the wick on the first last chord. */
export const HOME_LEAP: Pt = launch(FIRE_MOUTH, WICK, LAST[0] - DOORS.back[2], G).out

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
  /**
   * The dash home on the roll, back through three fires, right to left (going back) and up: a streak through each. All
   * three at the velocity the last leap needs, out of the loft stove's firebox door and onto the wick on the first
   * last chord (`HOME_LEAP`).
   */
  back1: { t: DOORS.back[0], v: HOME_LEAP, cells: 2.4, what: 'darting up and left out of the ash into the fire of a burning crate; through a balloon burner\'s flame, the same way' },
  back2: { t: DOORS.back[1], v: HOME_LEAP, cells: 2.4, what: 'up and left through the burner; through the glory hole, the same way' },
  back3: { t: DOORS.back[2], v: HOME_LEAP, cells: 2.4, what: 'up and left through the glory hole; out of the loft stove\'s firebox door, on a leap that lands on the wick on the first last chord' },
} satisfies Record<string, Seam>

export type SeamKey = keyof typeof SEAMS

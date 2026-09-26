import type { Pt } from '../../../../parts'
import { SEAM } from './music'

/**
 * What Sophie is doing at every seam, so the parts on either side agree without seeing each other.
 *
 * At a cut (a change of place, nearly always through a door) the camera carries the last framing across exactly (a
 * match cut on Sophie), so her place on the screen is continuous by construction; the picture is continuous only
 * if both sides keep to these:
 *
 * - `v`: her velocity at the seam, cells a second, y down. The part before ends its lane moving at this; the part
 *   after starts moving at it.
 * - `cells`: how close the camera is at the seam. The part before has a key at the seam (or just before it) at this
 *   distance, framed on her as `frame` says; the part after starts from it and makes its own moves (its first key
 *   at least 0.4 s after the seam).
 * - `frame`: where the camera's centre is from her, in cells ([0.9, -0.8] puts her left of centre and low). Both
 *   sides frame her the same.
 * - `howl`, `markl`: where they are from her at the seam, the same on both sides, moving with her; null where they
 *   are not in the picture on either side.
 * - `calcifer`: she is carrying him across (drawn by the parts at `CALCIFER_HELD` from her).
 */
export interface Seam {
  t: number
  cut: boolean
  v: Pt
  cells: number
  frame: Pt
  howl: Pt | null
  markl: Pt | null
  calcifer?: boolean
  /** What she is doing, in words, for whoever builds either side. */
  what: string
}

export const SEAMS: Record<keyof typeof SEAM, Seam> = {
  alley: {
    t: SEAM.alley,
    cut: false,
    v: [0.9, 0],
    cells: 5,
    frame: [0.9, -0.8],
    howl: null,
    markl: null,
    what: 'walking right on the cobbles, level, from the hat shop\'s street into the mouth of the alley (the town builder\'s street ends where the sky builder\'s alley begins)',
  },
  skywalk: {
    t: SEAM.skywalk,
    cut: false,
    v: [0, 0],
    cells: 4,
    frame: [0.3, -0.6],
    howl: [0.36, 0],
    markl: null,
    what: 'the sky builder\'s own seam (both sides are theirs): at rest in the alley with Howl beside her, the moment before they step up into the air on the waltz\'s first downbeat',
  },
  curse: {
    t: SEAM.curse,
    cut: true,
    v: [0, 0],
    cells: 3.6,
    frame: [0.6, -0.5],
    howl: null,
    markl: null,
    what: 'at rest, alone: on the café\'s balcony at noon, Howl gone over the roofs; on the far side, at rest at the hat shop\'s counter at night',
  },
  hills: {
    t: SEAM.hills,
    cut: true,
    v: [0.45, 0],
    cells: 4.5,
    frame: [0.9, -0.8],
    howl: null,
    markl: null,
    what: 'old now, walking slowly right, level, out of the hat shop\'s door; on the far side, walking right up the lane at the foot of the hills',
  },
  walk: {
    t: SEAM.walk,
    cut: false,
    v: [0, 0],
    cells: 7,
    frame: [1.2, -2.0],
    howl: null,
    markl: null,
    what: 'the castle builder\'s own seam (both sides are theirs): at rest on the hilltop, the castle arriving',
  },
  morning: {
    t: SEAM.morning,
    cut: true,
    v: [0.6, 0],
    cells: 4,
    frame: [0.9, -0.7],
    howl: null,
    markl: null,
    what: 'walking right, level, in over the castle\'s threshold out of the night; on the far side, in through the room\'s door on its left wall',
  },
  field: {
    t: SEAM.field,
    cut: true,
    v: [0.6, 0],
    cells: 4,
    frame: [0.9, -0.7],
    howl: [0.36, 0],
    markl: null,
    what: 'walking right, level, through the door a step behind Howl (the dial turned); on the far side, out of the castle\'s door onto the flower field',
  },
  raid: {
    t: SEAM.raid,
    cut: true,
    v: [1.0, 0],
    cells: 4.5,
    frame: [0.9, -0.8],
    howl: null,
    markl: null,
    what: 'hurrying right, level, back through the door (Howl gone to the fleet as the bird); on the far side, out of the hat shop\'s front door into the street at night, at war',
  },
  hearth: {
    t: SEAM.hearth,
    cut: true,
    v: [0, 0],
    cells: 4,
    frame: [0.9, -0.7],
    howl: null,
    markl: null,
    what: 'at rest just inside the hat shop\'s door, the street burning behind her; on the far side, at rest just inside the room\'s door, the room shaking (at rest, so her way in on either side is free)',
  },
  plank: {
    t: SEAM.plank,
    cut: true,
    v: [0, 0],
    cells: 3.4,
    frame: [0, -0.5],
    howl: null,
    markl: null,
    calcifer: true,
    what: 'at rest, holding Calcifer up out of the grate, in the room; on the far side, at rest holding him where the hearth was, as the castle falls apart round her',
  },
  flight: {
    t: SEAM.flight,
    cut: false,
    v: [0, 0],
    cells: 5,
    frame: [0.4, -0.8],
    howl: [0.36, 0],
    markl: null,
    what: 'at rest on the plank at the cliff\'s edge, Howl beside her, awake; the director\'s finale takes her from here (Calcifer comes back, the castle flies)',
  },
}

/** Where Calcifer is drawn when Sophie carries him: his base, from her centre (cells), and his size. */
export const CALCIFER_HELD = { at: [0.2, -0.2] as Pt, size: 0.55 }

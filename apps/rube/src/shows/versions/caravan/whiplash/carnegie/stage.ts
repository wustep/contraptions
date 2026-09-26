import type { Pt } from '../../../../../parts'
import { KIT_FLOOR, KIT_LAND, type KitPiece } from '../drums'

/**
 * Carnegie Hall's stage, measured once, for every part that plays on it. Every Carnegie part (the sabotage, the
 * solo, the hush, the build, the rubato, the finale) has the SAME frame: the ball enters each at (-0.5, 0), which is
 * where it rests on the snare's head, and each part's exit is [0, 0], so the next part begins there too. The kit
 * stands still in the middle of it all; the parts are what happens round it, one after the other.
 *
 * The hall itself (`hall.ts`, scenery, the director's) is drawn from show time at the same origin: the back wall and
 * the proscenium, the stage floor, the band on its risers, the piano and the bass, the kit (struck by every part's
 * `*_KIT` list, gathered in `strokes.ts`), the house in the dark below the stage's lip, and the light.
 *
 * Seen from the house, in elevation, a cell about a foot:
 *
 *   the wings and the stage door (x ≈ -9)  |  piano (-6.5)  |  the kit (snare at -0.5)  |  bass (2.6)  |
 *   Fletcher's podium (4.8)  |  the band on three risers (6.6 to 19)
 *   the stage floor at y = FLOOR; the lip at y = FLOOR + 0.35; the house below.
 */

/** Where the kit's origin (`drums.ts`: the ball resting on the snare) is in every Carnegie part's frame. */
export const KIT_AT: Pt = [-0.5, 0]
/** A kit landing point (`drums.ts` `KIT_LAND`) in the part's frame. */
export const land = (piece: KitPiece): Pt => [KIT_AT[0] + KIT_LAND[piece][0], KIT_AT[1] + KIT_LAND[piece][1]]

/** The stage floor, in the part's frame. */
export const FLOOR = KIT_AT[1] + KIT_FLOOR
/** The stage's lip: below it, the house. */
export const LIP = FLOOR + 0.35

/** Fletcher's podium: a black box at the front of the band, and where his head (his ball) is when he stands on it. */
export const PODIUM = { x: 4.8, w: 1.3, h: 0.55 }
export const FLETCHER_HOME: Pt = [PODIUM.x, FLOOR - PODIUM.h - 3.2]

/** The stage door in the wings (house left), where Jim waits, and where he stands to watch the solo. */
export const DOOR = { x: -9.2, w: 1.5, h: 4.2 }
export const JIM_DOOR: Pt = [DOOR.x + 0.2, FLOOR - 0.13]
/** Just out of the doorway, clear of the piano's tail: where he stands to watch his son. */
export const JIM_WINGS: Pt = [DOOR.x + 1.05, FLOOR - 0.13]

/** The piano (a black grand, side on) and the upright bass: the rest of the rhythm section, beside the kit. */
export const PIANO = { x: -6.05, w: 3.3 }
export const BASS = { x: 2.7 }

/** The band's three risers, saxophones in front, then trombones, then trumpets, and how high each stands. */
export const RISERS = [
  { x0: 6.6, x1: 19.0, top: FLOOR, seats: 5 },
  { x0: 7.4, x1: 19.0, top: FLOOR - 0.6, seats: 4 },
  { x0: 8.2, x1: 19.0, top: FLOOR - 1.2, seats: 4 },
]

/** The proscenium: the hall's arch round the stage. */
export const ARCH = { x0: -12.5, x1: 21.5, top: -11 }

/** The frame of a wide on the whole stage, and of a close one on the kit: two framings every part can start from. */
export const WIDE = { hold: [4.5, -2.8] as Pt, cells: 19 }
export const CLOSE = { hold: [KIT_AT[0] - 0.9, KIT_AT[1] - 0.6] as Pt, cells: 4.2 }

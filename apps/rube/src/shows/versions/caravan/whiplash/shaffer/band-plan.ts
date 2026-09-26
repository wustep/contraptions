import { FLOOR, R, type Pt } from '../../../../../parts'
import { KIT_FLOOR, KIT_LAND, type KitPiece } from '../drums'

/**
 * The studio band's room at Shaffer, measured once: where everything stands, in the band part's frame (the ball
 * comes in at (-0.5, 0), rolling along the corridor's floor, whose top is at y = FLOOR). The tempo part's frame is
 * this one moved to the kit's snare (`TEMPO_AT`); both parts, and the room's drawing, read these.
 *
 * Seen from the side, a cell about a foot. The room is a rehearsal hall built in tiers, the band facing down them
 * toward the conductor in the pit, the rhythm section beside him:
 *
 *   corridor | door | trumpets' tier | trombones' tier | saxophones' tier | the pit: Fletcher's podium, the
 *   alternate's chair and Tanner's chart on its stand, the kit, room for Tanner to stand aside | door | corridor
 *
 * The corridor's floor and the trumpets' tier are level; each tier down is a step of 0.8 (the ball comes down them
 * rolling at about 1.4 cells a second, landing each step on a bar line: the tiers' widths are what that makes); the
 * pit is 2.4 below the corridor. The kit stands on the pit floor, so its snare is about where the corridor's floor is.
 */

/** The corridor's floor top, and the ball's centre rolling on it. */
export const G = FLOOR
/** The corridor's ceiling. */
export const CORRIDOR_TOP = -3.3

/** The wall between the corridor and the room, and the door in it (hinged on the room's side, opening inward). */
export const WALL_L = { x0: 2.35, x1: 2.65 }
export const DOOR_TOP = -2.7
export const DOOR_W = 1.2

/** The tiers, top to bottom. Each has one section, three players deep. */
export type Section = 'trumpets' | 'bones' | 'saxes'
export interface Tier {
  x0: number
  x1: number
  /** The tier's floor. */
  top: number
  section: Section
}
export const STEP = 0.8
export const TIERS: Tier[] = [
  { x0: WALL_L.x1, x1: 6.83, top: G, section: 'trumpets' },
  { x0: 6.83, x1: 9.26, top: G + STEP, section: 'bones' },
  { x0: 9.26, x1: 11.69, top: G + 2 * STEP, section: 'saxes' },
]
/** The pit's floor, and where it starts. */
export const PIT = G + 3 * STEP
export const PIT_X0 = TIERS[2].x1

/** The room's ceiling. */
export const ROOM_TOP = -5.6

/** Fletcher's podium, in the pit at the foot of the saxophones' tier; where his head is when he stands on it. */
export const PODIUM = { x: 13.86, w: 1.25, h: 0.42 }
export const PODIUM_TOP = PIT - PODIUM.h
/** How tall his column stands: his head above what he stands on. */
export const FLETCHER_H = 3.25
export const FLETCHER_HOME: Pt = [PODIUM.x, PODIUM_TOP - FLETCHER_H]

/**
 * Tanner's chart on its stand, which Andrew turns: facing the house, its ledge (where a ball can sit) along the
 * bottom of the desk. `x` is the spine.
 */
export const STAND = { x: 15.42, ledge: PIT - 2.55, w: 1.34, h: 1.02 }

/** The alternate's chair, in profile, facing the stand and the podium (its back to the kit); the seat's top, and the ball on it. */
export const CHAIR_X = 16.78
export const SEAT_H = 1.05
/** How high the chair's back stands above the floor. */
export const BACK_H = 2.02
export const SEAT: Pt = [CHAIR_X - 0.04, PIT - SEAT_H - R]
/** The ball on the ledge: its right end (where he waits to turn) and its left (where the page lands). */
export const LEDGE_R: Pt = [STAND.x + STAND.w / 2 - 0.2, STAND.ledge - R]
export const LEDGE_L: Pt = [STAND.x - STAND.w / 2 + 0.22, STAND.ledge - R]

/** The kit's origin (the ball resting on its snare): its floor is the pit's. */
export const KX = 22.0
export const KY = PIT - KIT_FLOOR
export const KIT_AT: Pt = [KX, KY]
/** A kit landing point in the band's frame. */
export const kitLand = (piece: KitPiece): Pt => [KX + KIT_LAND[piece][0], KY + KIT_LAND[piece][1]]

/** Where Tanner stands while Andrew has his kit: on the pit floor, right of the hi-hat, out of the way. */
export const TANNER_ASIDE: Pt = [25.05, PIT - R]

/** The wall between the room and the far corridor, and its door (hinged on the corridor's side, opening outward). */
export const WALL_R = { x0: 25.85, x1: 26.15 }
export const DOOR_R_TOP = PIT - 2.95
/** The far corridor's ceiling. */
export const CORRIDOR_R_TOP = PIT - 3.3

/** The ball on the pit floor. */
export const PIT_Y = PIT - R

/** The tempo part's frame: its origin is the band's exit cell, which is the snare's landing point moved half a cell right. */
export const TEMPO_AT: Pt = [KX + 0.5, KY]
/** A point of the band's frame in the tempo part's. */
export const toTempo = (p: Pt): Pt => [p[0] - TEMPO_AT[0], p[1] - TEMPO_AT[1]]

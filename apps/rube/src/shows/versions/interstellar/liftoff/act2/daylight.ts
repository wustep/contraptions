import { mixHex } from '../../../../../parts'
import { smooth } from '../kit'
import { cue } from '../music'

/**
 * Cooper Station's day, as a colorist would grade it: the station's air from the spindle out to the land, by show time.
 *
 * - Morning, a cool fresh cream, from the lights coming up through the replica and the working ring.
 * - Noon at the ballpark: whiter, higher, flatter.
 * - Late afternoon from the hit across the axis to the far-side house: a low amber, the warmest the station gets, for
 *   Murph.
 * - Then, as the lift climbs and gravity falls away toward the hub, a cool steel: the spindle's light white and cold.
 *
 * Before the lights the air is the night's (the replica's room wakes into it).
 */
export interface Air {
  /** By the spindle. */
  center: string
  /** Halfway out. */
  mid: string
  /** Down by the land. */
  edge: string
  /** At the land. */
  rim: string
}

const NIGHT: Air = { center: '#3B4660', mid: '#2E3850', edge: '#2A2E3E', rim: '#252938' }
const MORNING: Air = { center: '#F7F4EA', mid: '#DCE5E1', edge: '#E5DDC6', rim: '#CDBA94' }
const NOON: Air = { center: '#FFFDF3', mid: '#EBEEE2', edge: '#EEE3C6', rim: '#D7C499' }
const GOLDEN: Air = { center: '#FFF0D2', mid: '#F4DFB8', edge: '#EDCB98', rim: '#CFA370' }
const STEEL: Air = { center: '#F2F5F7', mid: '#D3DBE1', edge: '#C9D0D5', rim: '#A9B0B4' }

const mixAir = (a: Air, b: Air, u: number): Air =>
  u <= 0 ? a : u >= 1 ? b : { center: mixHex(a.center, b.center, u), mid: mixHex(a.mid, b.mid, u), edge: mixHex(a.edge, b.edge, u), rim: mixHex(a.rim, b.rim, u) }

/** How far into each grade: noon from the ballpark's first beat, the amber from the hit, steel from the lift's start. */
export const NOON_AT = (t: number): number => smooth(t, cue(126), cue(132))
export const GOLD_AT = (t: number): number => smooth(t, cue(140), cue(146.5))
export const STEEL_AT = (t: number): number => smooth(t, cue(160.5), cue(168.5))

/** The air at show time `t`, `lit` being how far the lights are up (0 before the accent). */
export function airAt(t: number, lit: number): Air {
  let air = mixAir(MORNING, NOON, NOON_AT(t))
  air = mixAir(air, GOLDEN, GOLD_AT(t))
  air = mixAir(air, STEEL, STEEL_AT(t))
  return mixAir(NIGHT, air, lit)
}

/** How warm the light is at `t`, 0..1: the far-side house's afternoon, and nothing before or after it. */
export const warmthAt = (t: number): number => GOLD_AT(t) * (1 - STEEL_AT(t))

import { clamp01, mix } from '../../draw'
import { skyAt } from '../../world/sky'

/**
 * Ithaca's colours, and the light on them at any time. The island is limestone and scrub, olive trees on the top; the
 * palace is pale stone with dark timber and painted columns; inside, the colours of Ithaca are petrol blue and a deep
 * red (the costume designer's words for Penelope's). By day the stone is warm; at night it goes down to the sky's blue,
 * and the hall and the room are lit from within by the hearth and the lamps, a flat warm tone on what they light.
 */

export const STONE = '#D8CCB2'
export const STONE_SHADE = '#A99B80'
export const STONE_DEEP = '#7E7260'
export const ROCK = '#8C8270'
export const ROCK_DEEP = '#5E564A'
export const SAND_C = '#D9C9A3'
export const SCRUB = '#6F7652'
export const SCRUB_DARK = '#4F5640'
export const OLIVE = '#8A9372'
export const OLIVE_DARK = '#5F6A4F'
export const BARK = '#4A3F33'
export const TIMBER = '#4B3A2B'
export const TIMBER_LIGHT = '#6E5640'
export const PLASTER = '#E4D6BA'
export const PLASTER_BACK = '#C9B796'
export const COLUMN = '#8E2E2A'
export const COLUMN_CAP = '#1E1A18'
export const PETROL = '#2F5563'
export const MADDER = '#9E3245'
export const CLOTH = '#E8DCC2'
export const BRONZE = '#B07A3A'
export const BRONZE_LIGHT = '#D3A35F'
export const INK = '#1A1714'
export const FIRE = '#E59A4A'
export const FIRE_CORE = '#F4C980'
export const EMBER = '#B5502A'

/** How dark it is out of doors at `t`: 0 day, 1 deep night (from the sky's own zenith). */
export function nightness(t: number): number {
  const top = skyAt(t).top
  const v = parseInt(top.slice(1), 16)
  const lum = (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255
  return clamp01(1 - (lum - 0.08) / 0.42)
}

/** A colour as it is out of doors at `t`: towards the sky's low blue at night, a little towards its glow at dusk. */
export function outdoors(hex: string, t: number): string {
  const s = skyAt(t)
  const n = nightness(t)
  return mix(mix(hex, s.low, 0.12), mix(s.top, '#0B0F16', 0.35), n * 0.72)
}

/**
 * A colour as it is indoors at `t`: by day the window's light; at night the hearth's and the lamps', warm and only a
 * little lower, so the house is the lit thing in the dark island.
 */
export function indoors(hex: string, t: number): string {
  const n = nightness(t)
  return mix(hex, mix(mix(hex, '#C9874E', 0.22), '#3A2216', 0.3), n)
}

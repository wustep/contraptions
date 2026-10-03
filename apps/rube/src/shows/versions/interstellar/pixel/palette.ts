import { ACT2, UNDOCK, beat, cue } from '../liftoff/music'
import { SWITCH } from '../liftoff/score'
import { BALL, BRAND, GREY, MURPH, MURPH_YOUNG } from '../liftoff/worlds'

/**
 * The game's paints: a handful of ramps, each dark to light and turning in hue as it goes (shade leans cool and
 * violet, light leans warm), the way a sprite sheet's are. Nothing is measured off the film: a colour is one of these,
 * so a fill is flat, a gradient is three or four hard steps, and the farm, the dark, Miller's water, Gargantua and
 * Edmunds' dusk are each a few ramps of one set.
 */
export const RAMPS = {
  /** The dark: space, night, the house before dawn. */
  night: ['#0B0A18', '#16142B', '#221F42', '#33305E'],
  /** Deep blue: the dark over the cloud, the Earth's oceans, Brand's coat. */
  navy: ['#1A2850', '#24407A', '#3463A6', '#5A8FD0'],
  /** Daylight sky and ice. */
  sky: ['#7FB2E0', '#A9D2EE', '#D6ECF5'],
  /** Miller's water, and the farm's faded teal. */
  teal: ['#0F3438', '#17585A', '#2A8A80', '#5CC2A6', '#A6E8C8'],
  /** Stalk and leaf. */
  leaf: ['#1E3A22', '#365F2C', '#5E8C34', '#98BC4A'],
  /** Corn, foil, accretion: the golds. */
  corn: ['#5E3E16', '#9A6A1E', '#D49A2E', '#F2C94C', '#FBE89A'],
  /** Dust, wood, plaster and paper, down to the farm's ink. */
  dust: ['#2A1C14', '#6E5038', '#A07A52', '#CDAA74', '#E8D3A2', '#F8EED2'],
  /** Rust, the signal red, flame. */
  rust: ['#3E1616', '#7A2620', '#BE4430', '#EE7650', '#F8B48A'],
  /** Edmunds' dusk, the violets. */
  dusk: ['#2E1C44', '#55306A', '#8E4A78', '#C8687A', '#F0A07A'],
  /** Hull, tin, the station's steel. */
  steel: ['#2A303E', '#4A5468', '#76829A', '#A8B2C2', '#DCE0E6'],
  bone: ['#FFFBF0'],
  /** The cast, kept exactly: Cooper, Brand, both Murphs and the years' grey. */
  cast: [BALL, BRAND, MURPH, MURPH_YOUNG, GREY],
}

type Ramp = keyof typeof RAMPS

/**
 * An area of the game: the ramps it paints with, and the grade a frame there is given before it is snapped to them (a
 * tint by channel, then saturation and contrast). Two areas on either side of a cut may paint with different ramps; a
 * camera that flies from one to the other keeps the ramps and eases the grade.
 */
export interface Area {
  name: string
  ramps: Ramp[]
  tint: [number, number, number]
  sat: number
  contrast: number
}

const EARTHLY: Ramp[] = ['night', 'navy', 'sky', 'teal', 'leaf', 'corn', 'dust', 'rust', 'steel', 'bone', 'cast']
const SPACE: Ramp[] = ['night', 'navy', 'sky', 'teal', 'corn', 'dust', 'rust', 'dusk', 'steel', 'bone', 'cast']

export const FARM: Area = { name: 'farm', ramps: EARTHLY, tint: [1.03, 1, 0.95], sat: 1.25, contrast: 1.1 }
export const ORBIT: Area = { name: 'orbit', ramps: SPACE, tint: [0.92, 0.98, 1.1], sat: 1.25, contrast: 1.15 }
export const MILLER: Area = { name: 'miller', ramps: SPACE, tint: [0.82, 1.04, 1.02], sat: 1.3, contrast: 1.12 }
export const GARGANTUA: Area = { name: 'gargantua', ramps: SPACE, tint: [1.1, 0.97, 0.82], sat: 1.25, contrast: 1.25 }
export const STATION: Area = { name: 'station', ramps: EARTHLY, tint: [1.02, 1, 0.94], sat: 1.2, contrast: 1.1 }
export const EDMUNDS: Area = { name: 'edmunds', ramps: SPACE, tint: [1.06, 0.9, 1.06], sat: 1.3, contrast: 1.15 }

/** Each area from when, in show time, and how long its grade takes to come in. */
const MAP: { from: number; area: Area; ease: number }[] = [
  { from: 0, area: FARM, ease: 0 },
  { from: SWITCH, area: ORBIT, ease: 0 },
  { from: beat(166) - 0.5, area: MILLER, ease: 1.5 },
  { from: beat(180) - 0.5, area: GARGANTUA, ease: 1.5 },
  { from: ACT2, area: STATION, ease: 0 },
  { from: UNDOCK, area: ORBIT, ease: 0 },
  { from: cue(206), area: EDMUNDS, ease: 4 },
]

/** The area at `t`, the one before it, and how far its grade has come in (0 to 1). */
export function areaAt(t: number): { area: Area; was: Area; u: number } {
  let i = 0
  while (i + 1 < MAP.length && t >= MAP[i + 1].from) i++
  const m = MAP[i]
  const was = MAP[Math.max(0, i - 1)].area
  const u = m.ease > 0 ? Math.min(1, (t - m.from) / m.ease) : 1
  return { area: m.area, was: was.ramps === m.area.ramps ? was : m.area, u }
}

export function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * The paints of a set of ramps, as r, g, b, and for each the paint its outline is drawn in: the darkest of its own
 * ramp (the cast's and the bone's are their own, so a ball is never ringed in another colour).
 */
export function paintsOf(ramps: Ramp[]): { rgb: number[][]; outline: number[] } {
  const rgb: number[][] = []
  const outline: number[] = []
  for (const r of ramps) {
    const first = rgb.length
    for (const c of RAMPS[r]) {
      outline.push(r === 'cast' || r === 'bone' ? rgb.length : first)
      rgb.push(hex(c))
    }
  }
  return { rgb, outline }
}

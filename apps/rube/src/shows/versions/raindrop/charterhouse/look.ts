import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'
import { clamp, mix, smooth } from './brush'
import { FORM, bar } from './music'

/**
 * The night's colour. Three lights, one after another: the last of the dusk (the theme), the storm (the minor),
 * and the clear night after it (the theme again, and the moon). Every named colour is the dusk's; the storm and the
 * night are worked from it (`tones`), so the whole picture goes over together. The warm colours are lights, and are
 * not darkened: a window is as bright in the storm as before it.
 */

export const DUSK = {
  skyTop: '#46546A',
  skyLow: '#9AA3AE',
  cloud: '#5D6A7E',
  cloudLow: '#7A8594',
  mtFar: '#5A6679',
  mtMid: '#4A5568',
  mtNear: '#3C4657',
  sea: '#6F7E8F',
  seaLight: '#97A2AE',
  hill: '#4A4F4A',
  hillDark: '#3A3F3C',
  plaster: '#B7AE9E',
  plasterShade: '#968E80',
  plasterDeep: '#776F63',
  stone: '#A3937A',
  stoneShade: '#7F7260',
  stoneDeep: '#5F5546',
  tile: '#94604A',
  tileShade: '#74493A',
  tileDeep: '#56362C',
  wood: '#5E4A3A',
  woodDark: '#43352A',
  leaf: '#626E58',
  leafDark: '#4A5444',
  cypress: '#34402F',
  earth: '#5E5446',
  earthDark: '#4A4238',
  water: '#56697A',
  waterLight: '#8496A3',
  iron: '#2C3137',
  glass: '#AFC0C8',
  ink: '#1B2129',
  rain: '#C9D3DC',
  // Lights: not darkened.
  warm: '#EDBE6A',
  warmDeep: '#C88A3E',
  flame: '#F6DC9A',
  ball: '#C9452D',
  room: '#7A4E2C',
} as const

export type Tone = keyof typeof DUSK
export type Palette = Record<Tone, string>

const LIGHTS: ReadonlySet<Tone> = new Set<Tone>(['warm', 'warmDeep', 'flame', 'ball', 'room'])

/** The storm: everything drawn down toward a wet slate. */
const STORM_TO = '#1A212C'
/** The night after it: darker than the dusk, cooler, clean. */
const NIGHT_TO = '#141B26'

const SKY = {
  storm: { skyTop: '#1E2632', skyLow: '#36404E', cloud: '#2A3340', cloudLow: '#3A4452' },
  night: { skyTop: '#121A27', skyLow: '#2B394C', cloud: '#2A3546', cloudLow: '#4A5A6E' },
} as const

/** How far into the storm, 0 to 1, at `t`. */
export function stormAt(t: number): number {
  return (
    0.3 * smooth(t, bar(24), bar(28)) +
    0.45 * smooth(t, bar(33), bar(40)) +
    0.25 * smooth(t, bar(52), bar(56)) -
    1 * smooth(t, bar(70), FORM.still)
  )
}

/** How far into the clear night, 0 to 1, at `t`. */
export function nightAt(t: number): number {
  return smooth(t, bar(70), FORM.still)
}

/** How much of the dusk's light is left on the land, 0 to 1: it goes as the show goes. */
export function duskAt(t: number): number {
  return 1 - smooth(t, bar(5), bar(28))
}

let memoT = NaN
let memo: Palette | null = null

/** Every colour at `t`. */
export function tones(t: number): Palette {
  if (t === memoT && memo) return memo
  const s = clamp(stormAt(t))
  const n = clamp(nightAt(t))
  // The dusk itself darkens a little before the storm comes in: the light is going.
  const fade = (1 - duskAt(t)) * 0.18
  const out = {} as Palette
  for (const key of Object.keys(DUSK) as Tone[]) {
    const base = DUSK[key]
    if (LIGHTS.has(key)) {
      out[key] = base
      continue
    }
    const dusk = mix(base, STORM_TO, fade)
    const storm = key in SKY.storm ? SKY.storm[key as keyof typeof SKY.storm] : mix(base, STORM_TO, 0.58)
    const night = key in SKY.night ? SKY.night[key as keyof typeof SKY.night] : mix(base, NIGHT_TO, 0.5)
    // The storm and the night share the dark; the night is what is left when the storm goes over.
    out[key] = mix(mix(dusk, storm, s), night, n * (1 - s))
  }
  memoT = t
  memo = out
  return out
}

/* ------------------------------------------------------------------ the weather */

/**
 * How hard it is raining, 0 to 1. A drizzle at dusk, heavier into the minor, hardest at the two fortissimos, easing
 * as the storm goes over, and none at all from the moment the pulse stops (the high B-flat).
 */
export function rainAt(t: number): number {
  if (t >= FORM.still) return 0
  const v =
    0.32 +
    0.12 * smooth(t, bar(26), bar(29)) +
    0.3 * smooth(t, bar(35), bar(40)) -
    0.2 * smooth(t, bar(43), bar(45)) +
    0.26 * smooth(t, bar(51), bar(56)) -
    0.2 * smooth(t, bar(60), bar(63)) -
    0.22 * smooth(t, bar(71), bar(76)) -
    0.14 * smooth(t, bar(79), FORM.still - 0.6)
  return clamp(v, 0, 1) * (1 - smooth(t, FORM.still - 0.6, FORM.still))
}

/** The rain's slant from the vertical, radians (positive: falling to the right, blown in off the sea's left). */
export function windAt(t: number): number {
  const gust = 0.06 * Math.sin(t * 0.73) * Math.sin(t * 0.31 + 1.2)
  return 0.1 + 0.2 * smooth(t, bar(35), bar(40)) - 0.08 * smooth(t, bar(43), bar(46)) + 0.12 * smooth(t, bar(51), bar(56)) - 0.24 * smooth(t, bar(64), bar(76)) + gust * clamp(rainAt(t) * 2)
}

/* ------------------------------------------------------------------ the engine's theme */

/** What the stage paints under everything and outlines the ball in. */
export const THEME: Theme = {
  name: 'raindrop',
  label: 'Raindrop',
  bg: DUSK.skyLow,
  ink: DUSK.ink,
  colors: [DUSK.ball],
  weight: 0.55,
}

export const WORLD = {
  name: 'charterhouse',
  label: 'The charterhouse',
  note: 'A winter night above Valldemossa, in the rain.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
} as unknown as World

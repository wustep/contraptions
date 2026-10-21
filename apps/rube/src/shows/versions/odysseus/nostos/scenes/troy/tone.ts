import { clamp01, mix, smooth } from '../../draw'
import { M } from '../../music'
import { WALL } from './geo'

/**
 * Troy's light, by show time: the last of the day at dusk (a low sun over the sea, on the right), a moonless night lit
 * only by a brazier on Athena's forecourt and a few lamps, then the fire, spreading from the gate up through the city,
 * and the first grey of dawn behind the hill as the ships put out.
 *
 * Every surface in Troy is one of a few materials, and `tone` gives a material's colour at a time: its own colour sunk
 * towards the night, warmed where the sun or the fire reaches it. Light is never drawn as a glow; it is in what it falls
 * on.
 */

export const MAT = {
  clay: '#AD6A4F',
  clayDark: '#7F4836',
  earth: '#6A3F2E',
  earthDeep: '#4A2B21',
  sand: '#CDB28A',
  sandWet: '#A38C69',
  stone: '#D3C3A5',
  marble: '#EEEAE1',
  timber: '#5C4331',
  hide: '#18181B',
  inner: '#3A2C22',
  bronze: '#9C7A44',
  scrub: '#7D7F55',
} as const

const NIGHT = '#19212F'
const SUN = '#F2C48C'
const FIRE = '#E07A3A'
const DAWN = '#B9C2C6'

/** How far the night has come: 0 in the dusk's light, 1 in the dark (from the cut to Ithaca to the dawn). */
export function night(t: number): number {
  if (t < M.answer) return 0.15 + 0.6 * smooth(t, 14, M.second + 1)
  return 1 - 0.55 * smooth(t, 125, 140)
}

/** The sun at dusk, on what faces it: strongest at the start, gone as it sets. */
export const sun = (t: number): number => (t < M.answer ? 0.5 * (1 - smooth(t, 18, M.second)) : 0)

/** The dawn's grey light from behind the hill (the left), as the ships put out. */
export const dawn = (t: number): number => (t > 120 ? 0.35 * smooth(t, 126, 140) : 0)

/** When the gate is up and the army is in: the fire starts at the gate. */
export const IGNITE = 114.32
/** When the fire reaches a roof at `x` (cells): it spreads up through the city from the gate, about a house a second. */
export const igniteAt = (x: number, depth = 0): number => IGNITE + 0.6 + Math.max(0, WALL.x0 - x) * 0.38 + depth * 1.6
/** How far a roof at `x` is burning at `t`, 0 to 1 (and dying back a little by dawn). */
export const burning = (x: number, t: number, depth = 0): number => {
  const at = igniteAt(x, depth)
  return smooth(t, at, at + 2.4) * (1 - 0.3 * smooth(t, 130, 140))
}
/** How much firelight falls on a face at `x`: the fire near it, and the whole city's glow on everything once it is up. */
export const firelight = (x: number, t: number): number => clamp01(0.75 * burning(x + 1.2, t) + 0.25 * smooth(t, IGNITE + 1, IGNITE + 9) * (1 - 0.5 * smooth(t, 128, 140)))

/**
 * A material's colour at `t`: sunk into the night as far as the night has come, then warmed by the sun (on faces turned
 * to it, `lit`), the fire (by how much reaches it), or the dawn.
 */
export function tone(base: string, t: number, opts: { lit?: number; fire?: number; deep?: number } = {}): string {
  let c = mix(base, NIGHT, 0.7 * night(t) + 0.12 * (opts.deep ?? 0))
  const lit = opts.lit ?? 0
  if (lit > 0) {
    c = mix(c, SUN, 0.42 * sun(t) * lit)
    c = mix(c, DAWN, 0.5 * dawn(t) * lit)
  }
  if (opts.fire) c = mix(c, FIRE, 0.42 * clamp01(opts.fire))
  return c
}

/** The flames' own colours: a deep body, a bright tongue, and the smoke over them. */
export const FLAME = { body: '#C9542A', tongue: '#F0A04B', core: '#F8D48A', smoke: '#2A2224' } as const

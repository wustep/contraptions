import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The room the Goldberg Variations are played in: a round colonnade of thirty-two columns, one to a bar of the ground
 * bass that every variation is built on, roofed by a rail the ball goes round. It is lit from within, by the lamps the
 * ball lights as it passes and by what has been played, and it is dark at the ends of the period so that the loop
 * closes on itself in the dark.
 */

export const BG = '#0B0910'
export const INK = '#0B0910'
export const IVORY = '#F4E6C8'
export const GOLD = '#EBBE66'
export const SILVER = '#BFD2E8'
export const LILAC = '#B79CDA'
export const COOL = '#86A8DA'
export const PEARL = '#15121B'
export const PEARL_RIM = '#E9D9B5'
export const BALL_COLOR = IVORY

export const THEME: Theme = {
  name: 'goldberg',
  label: 'Goldberg Variations',
  bg: BG,
  ink: INK,
  colors: [IVORY, GOLD, SILVER, LILAC],
  weight: 0.7,
  note: 'A round colonnade, thirty-two columns, and one lap of it to a variation.',
}

export const WORLD: World = {
  name: 'goldberg',
  label: 'Goldberg Variations',
  note: 'A round colonnade lit from within: one lap of the ball to a variation.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

/** 0 until `a`, 1 from `b`, smooth between. */
export const smooth = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/** Up over `[a, b]`, held, and down over `[c, d]`. */
export const pulse = (t: number, a: number, b: number, c: number, d: number): number => smooth(t, a, b) * (1 - smooth(t, c, d))

export const clamp = (x: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, x))

export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** `#rrggbb` and an alpha as `rgba(...)`. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp(a).toFixed(3)})`
}

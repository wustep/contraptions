import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'
import type { CubeName } from './machine'

/**
 * A painted wooden toy on a pale table: maple planks in a tray painted grey-green, five cubes in milk paint. Flat
 * colour, a face lit by how it turns to one light, and a thin dark line round every face; no gloss, no glow.
 */
export const PAPER = '#E5E0D6'
export const INK = '#2A221C'

export const WOOD = {
  /** The planks, one row in two a shade apart so each reads as its own. */
  plank: ['#E2C596', '#D9B988'],
  /** The tray, painted: its rim, and its floor down between the planks' ends. */
  rim: '#7E8B86',
  floor: '#5A6461',
} as const

export const PAINT: Record<CubeName, string> = {
  black: '#2B2927',
  red: '#C4432F',
  yellow: '#E0A52E',
  blue: '#2F5D9C',
  green: '#3F7A4E',
}

export const THEME: Theme = {
  name: 'quarter-turn',
  label: 'Quarter Turn',
  bg: PAPER,
  ink: INK,
  colors: [PAINT.black],
  weight: 0.55,
}

export const WORLD = {
  name: 'tray',
  label: 'The tray',
  note: 'A wooden toy on a table.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
} as unknown as World

/* ------------------------------------------------------------------ colour */

const cache = new Map<string, [number, number, number]>()
export function rgb(hex: string): [number, number, number] {
  let v = cache.get(hex)
  if (!v) {
    v = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
    cache.set(hex, v)
  }
  return v
}

const hx = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')

/** `hex` lit by `k` (1 as painted, below darker, above toward white). */
export function lit(hex: string, k: number): string {
  const [r, g, b] = rgb(hex)
  if (k <= 1) return `#${hx(r * k)}${hx(g * k)}${hx(b * k)}`
  const w = Math.min(1, k - 1)
  return `#${hx(r + (255 - r) * w)}${hx(g + (255 - g) * w)}${hx(b + (255 - b) * w)}`
}

import type { Theme } from '../../../../../../src/core/themes'
import { snowWhite } from './snow'

/** Batch f's own helpers. */

const hueOf = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (!d) return -1
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

/** Brass: the palette's most golden colour that is neither the snow's white nor the ball's. */
export function brassOf(theme: Theme, ball: string): string {
  const white = snowWhite(theme)
  const off = (hex: string) => (hueOf(hex) < 0 ? 999 : Math.min(Math.abs(hueOf(hex) - 42), 360 - Math.abs(hueOf(hex) - 42)))
  return [...theme.colors].filter((c) => c !== white && c !== ball).sort((a, b) => off(a) - off(b))[0] ?? theme.colors[0]
}

/** The palette's colours a thing may be painted in: never the snow's white, never the ball's, never `not`. */
export function paints(theme: Theme, ball: string, ...not: string[]): string[] {
  const white = snowWhite(theme)
  const pool = theme.colors.filter((c) => c !== white && c !== ball && !not.includes(c))
  return pool.length ? pool : theme.colors.filter((c) => c !== white)
}

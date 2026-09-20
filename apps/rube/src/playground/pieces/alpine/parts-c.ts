import type p5 from 'p5'
import type { Theme } from '../../../../../../src/core/themes'
import { snowWhite } from './snow'

/**
 * What batch c's pieces share and the world's own helpers do not have: a
 * fir's green, a second colour for a second thing, a sprung thing let go,
 * and a slop of meltwater.
 */

/** A fir is green, whatever colour the map hands the piece: the palette's greenest. */
export function firGreen(theme: Theme): string {
  const greenness = (hex: string) => parseInt(hex.slice(3, 5), 16) - Math.max(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(5, 7), 16))
  return [...theme.colors].sort((a, b) => greenness(b) - greenness(a))[0]
}

/** A second colour beside `first`: never the snow's white, never the ball's, never the first. */
export function otherColor(theme: Theme, first: string, ball: string): string {
  const white = snowWhite(theme)
  return theme.colors.find((c) => c !== white && c !== ball && c !== first) ?? theme.colors.find((c) => c !== white && c !== first) ?? first
}

/**
 * A sprung thing let go: how far it still is from rest, `u` seconds after
 * it was `x0` from rest and moving at `v0`. Underdamped, so it overshoots
 * and settles. `w` is its pace of swing in radians a second, `z` its damping.
 */
export const sprung = (u: number, x0: number, v0: number, w: number, z: number): number =>
  u <= 0 ? x0 : Math.exp(-z * u) * (x0 * Math.cos(w * u) + ((v0 + z * x0) / w) * Math.sin(w * u))

/** Drops thrown up from (x, y) on short arcs and falling back, in the colour alone: `f` from 0 (the instant) to 1 (gone). */
export function spurt(p: p5, k: number, color: string, x: number, y: number, f: number, size = 1): void {
  if (f <= 0 || f >= 1) return
  p.noStroke()
  p.fill(color)
  for (const [dx, up, r] of [[-0.6, 1, 0.022], [0.15, 1.5, 0.026], [0.8, 0.9, 0.018]]) {
    p.circle((x + dx * 0.07 * size * f) * k, (y - up * 0.12 * size * 4 * f * (1 - f)) * k, r * 2 * size * (1 - f * 0.5) * k)
  }
}

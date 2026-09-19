import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import type { Theme } from '../../../../../src/core/themes'
import { FLOOR, post } from '../../parts'

/**
 * The harbor's shared vocabulary: what every piece on the pier agrees on.
 *
 * The rail here is a pier deck. Under it there is always water — a still,
 * wavy line at WATER — and the deck stands on pilings that go down through
 * it to the seabed at the cell's floor. The water is drawn still on
 * purpose: a piece's clock is its own, so a ripple animated from `t` would
 * jump phase at every cell edge; three whole waves to a cell join up
 * instead, and what moves is what the ball does to it — a splash, a ring,
 * a run of bubbles.
 *
 * Colour here is read against the ball. Water — the sea, a splash, a wake,
 * a lifted ring — is the palette's blue (`seaWater`), never the colour of
 * the hull or the animal that threw it up. A body the ball rests on or in
 * is never the ball's own colour (`bodyColor`), so the ball is always seen
 * against what holds it.
 */

/** Where the water lies under the deck. */
export const WATER = 0.37

/** How light a colour is. */
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255
}

/**
 * A colour for a body of water: the one the planner picked, unless it is
 * so near the paper that a wave or a pool would vanish into it, in which
 * case the palette's colour furthest from the paper that is not `avoid`
 * — the ball's, for water the ball rides on or in.
 */
export function seaColor(theme: Theme, color: string, avoid?: string): string {
  const paper = luminance(theme.bg)
  if (Math.abs(luminance(color) - paper) > 0.25) return color
  const pool = theme.colors.filter((c) => c !== avoid)
  return (pool.length ? pool : theme.colors).sort((a, b) => Math.abs(luminance(b) - paper) - Math.abs(luminance(a) - paper))[0]
}

/**
 * A colour for a body — an animal, a hull, a horn — that the ball comes
 * to rest on or in. The planner's colour, unless it is the ball's own, so
 * the ball would vanish into what holds it, or so near the paper that the
 * body would be all outline; then the palette's colour furthest from the
 * paper that is not the ball's. A body in heavy ink reads in a paler
 * colour than water does, so the bar is lower than `seaColor`'s: a sand
 * seal stands off the paper where a sand sea would not.
 */
export function bodyColor(theme: Theme, color: string, ball: string): string {
  const paper = luminance(theme.bg)
  const off = (c: string) => Math.abs(luminance(c) - paper)
  if (color !== ball && off(color) > 0.12) return color
  return theme.colors.filter((c) => c !== ball).sort((a, b) => off(b) - off(a))[0] ?? color
}

/**
 * The sea's own colour in this palette: the bluest. What a splash, a
 * wake and a chamber of water are painted in, so water never borrows the
 * colour of the hull or the animal that threw it up and reads as bits of
 * them flying.
 */
export function seaWater(theme: Theme): string {
  const blueness = (hex: string) => parseInt(hex.slice(5, 7), 16) - parseInt(hex.slice(1, 3), 16)
  return [...theme.colors].sort((a, b) => blueness(b) - blueness(a))[0]
}
/** Waves per cell. A whole number, so the line joins up at every edge. */
const WAVES = 3
const AMP = 0.022

/** The waterline from x0 to x1 at height `y`, in cell units. Continuous across cells. */
export function water(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, y = WATER): void {
  outline(p, ink, weight * 0.8)
  p.beginShape()
  const n = Math.max(6, Math.round((x1 - x0) * 24))
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    p.vertex(x * k, (y + AMP * Math.sin(x * Math.PI * 2 * WAVES)) * k)
  }
  p.endShape()
}

/** A piling: a post from the deck through the water to the seabed, with a rope band under the deck. */
export function piling(p: p5, k: number, ink: string, weight: number, x: number, y0 = FLOOR, y1 = 0.5): void {
  post(p, k, ink, weight, x, y0, y1)
  outline(p, ink, weight)
  p.line((x - 0.035) * k, (y0 + 0.06) * k, (x + 0.035) * k, (y0 + 0.06) * k)
  p.line((x - 0.035) * k, (y0 + 0.09) * k, (x + 0.035) * k, (y0 + 0.09) * k)
}

/** The seabed: the cell's floor with a few pebbles. */
export function seabed(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, y = 0.5): void {
  outline(p, ink, weight)
  p.line(x0 * k, y * k, x1 * k, y * k)
  p.noStroke()
  p.fill(ink)
  for (let x = x0 + 0.13; x < x1 - 0.05; x += 0.21) p.ellipse(x * k, (y - 0.02) * k, 0.06 * k, 0.03 * k)
}

/**
 * A splash at (x, y): drops on short arcs either side, up and then down,
 * `f` from 0 (the instant) to 1 (gone). In the colour, so it reads as water.
 */
export function splash(p: p5, k: number, color: string, weight: number, x: number, y: number, f: number, size = 1): void {
  if (f <= 0 || f >= 1) return
  p.push()
  p.noStroke()
  p.fill(color)
  for (const [dx, h, r] of [
    [-0.16, 0.22, 0.035],
    [-0.07, 0.3, 0.03],
    [0.06, 0.28, 0.03],
    [0.15, 0.2, 0.035],
  ]) {
    const px = x + dx * size * (0.6 + 0.6 * f)
    const py = y - h * size * 4 * f * (1 - f)
    p.circle(px * k, py * k, r * 2 * k * (1 - f * 0.5))
  }
  p.pop()
  // A ring on the water where it went in.
  p.push()
  p.noFill()
  p.stroke(color)
  p.strokeWeight(weight * (1 - f))
  p.ellipse(x * k, y * k, (0.1 + 0.36 * f) * size * k, (0.03 + 0.1 * f) * size * k)
  p.pop()
}

/** Bubbles rising from (x, y): `n` of them, spaced up the column, drifting a little, over `t` seconds. */
export function bubbles(p: p5, k: number, ink: string, weight: number, bg: string, x: number, y: number, top: number, t: number, n = 4): void {
  if (t < 0) return
  solid(p, ink, weight * 0.8, bg)
  for (let i = 0; i < n; i++) {
    const phase = ((t * 0.9 + i / n) % 1 + 1) % 1
    const by = y + (top - y) * phase
    const bx = x + 0.05 * Math.sin(phase * 7 + i)
    const r = 0.018 + 0.014 * ((i * 7) % 3)
    p.circle(bx * k, by * k, r * 2 * k)
  }
}

/** A slack rope from a to b: one quadratic curve sagging toward +y. */
export function rope(p: p5, k: number, ink: string, weight: number, x0: number, y0: number, x1: number, y1: number, sag = 0.08): void {
  outline(p, ink, weight * 0.9)
  p.noFill()
  p.beginShape()
  p.vertex(x0 * k, y0 * k)
  p.quadraticVertex(((x0 + x1) / 2) * k, (Math.max(y0, y1) + sag) * k, x1 * k, y1 * k)
  p.endShape()
}

/** A cleat on the deck: a small bar on a stub, in the colour. */
export function cleat(p: p5, k: number, ink: string, weight: number, color: string, x: number, y = FLOOR): void {
  solid(p, ink, weight, color)
  p.rect(x * k, (y + 0.05) * k, 0.05 * k, 0.05 * k)
  p.rect(x * k, (y + 0.09) * k, 0.16 * k, 0.04 * k, 0.01 * k)
}

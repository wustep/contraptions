import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import type { Theme } from '../../../../../../src/core/themes'
import { FLOOR } from '../../../parts'

/**
 * What the mountain is made of. The track the ball rolls on is a rail like
 * any other world's, and under it lies the snow: one soft line a little
 * under the rail, the same height at every cell's edge so it joins up from
 * piece to piece the way the harbor's waterline does. A piece that stands
 * in the snow draws that line across its own cells with `snow`, first, and
 * stands its things in it; where the snow has mass it is a `drift`, white.
 */

/** The snow's surface, in cell units below the cell's centre line. */
export const SNOW = 0.36
/** Drifts per cell. A whole number, so the line joins up at every edge. */
const DRIFTS = 1
const AMP = 0.018

/** The height of the snow's surface at `x`. */
export const snowAt = (x: number, y = SNOW): number => y - AMP * (1 - Math.cos(x * Math.PI * 2 * DRIFTS)) * 0.5 - AMP * 0.6 * Math.sin(x * Math.PI * 2 * DRIFTS + 1.1)

/** Snow is the palette's lightest colour, whatever the map hands the piece. */
export function snowWhite(theme: Theme): string {
  const luma = (hex: string) => 0.2126 * parseInt(hex.slice(1, 3), 16) + 0.7152 * parseInt(hex.slice(3, 5), 16) + 0.0722 * parseInt(hex.slice(5, 7), 16)
  return [...theme.colors].sort((a, b) => luma(b) - luma(a))[0]
}

/** Ice and meltwater: the palette's bluest colour. */
export function iceBlue(theme: Theme): string {
  const blueness = (hex: string) => parseInt(hex.slice(5, 7), 16) - parseInt(hex.slice(1, 3), 16)
  return [...theme.colors].sort((a, b) => blueness(b) - blueness(a))[0]
}

/** A colour for a thing that stands in the snow: never the snow's white, never the ball's. */
export function gearColor(theme: Theme, color: string, ball: string): string {
  const white = snowWhite(theme)
  if (color !== white && color !== ball) return color
  return theme.colors.find((c) => c !== white && c !== ball) ?? color
}

/**
 * The snow's surface from x0 to x1: one soft ink line. It is a line and not a
 * white band for the reason the harbor's sea is: the portal's cells and the
 * next world's have none, and a band would end in a wall there. A piece
 * that needs the snow's mass, a slope, a drift, a cornice, fills that shape
 * white itself with `drift`, and this line runs on from its foot.
 */
export function snow(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, y = SNOW): void {
  const n = Math.max(6, Math.round((x1 - x0) * 24))
  outline(p, ink, weight * 0.8)
  p.beginShape()
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    p.vertex(x * k, snowAt(x, y) * k)
  }
  p.endShape()
}

/**
 * A body of snow: white inside one ink line, through `pts` along its top
 * (left to right, cell units) and closed along `floor` beneath. The top is
 * drawn through the points as a soft curve, since snow has no corners.
 */
export function drift(p: p5, k: number, ink: string, weight: number, white: string, pts: [number, number][], floor: number): void {
  solid(p, ink, weight, white)
  p.beginShape()
  p.vertex(pts[0][0] * k, floor * k)
  p.vertex(pts[0][0] * k, pts[0][1] * k)
  p.curveVertex(pts[0][0] * k, pts[0][1] * k)
  for (const [x, y] of pts) p.curveVertex(x * k, y * k)
  const last = pts[pts.length - 1]
  p.curveVertex(last[0] * k, last[1] * k)
  p.vertex(last[0] * k, last[1] * k)
  p.vertex(last[0] * k, floor * k)
  p.endShape(p.CLOSE)
}

/** A trail wand: a thin pole from the rail down into the snow, with a band of colour at its head. */
export function wand(p: p5, k: number, ink: string, weight: number, color: string, x: number, y0 = FLOOR, y1 = SNOW): void {
  outline(p, ink, weight)
  p.line(x * k, y0 * k, x * k, (snowAt(x, y1) + 0.03) * k)
  solid(p, ink, weight * 0.8, color)
  p.rect(x * k, (y0 + 0.05) * k, 0.035 * k, 0.06 * k)
}

/** A small fir: three tiers and a stub of trunk, its foot at (x, y). */
export function fir(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, h: number): void {
  outline(p, ink, weight)
  p.line(x * k, y * k, x * k, (y - h * 0.2) * k)
  solid(p, ink, weight, color)
  const w = h * 0.42
  p.beginShape()
  p.vertex(x * k, (y - h) * k)
  p.vertex((x + w * 0.55) * k, (y - h * 0.62) * k)
  p.vertex((x + w * 0.3) * k, (y - h * 0.62) * k)
  p.vertex((x + w * 0.8) * k, (y - h * 0.38) * k)
  p.vertex((x + w * 0.45) * k, (y - h * 0.38) * k)
  p.vertex((x + w) * k, (y - h * 0.14) * k)
  p.vertex((x - w) * k, (y - h * 0.14) * k)
  p.vertex((x - w * 0.45) * k, (y - h * 0.38) * k)
  p.vertex((x - w * 0.8) * k, (y - h * 0.38) * k)
  p.vertex((x - w * 0.3) * k, (y - h * 0.62) * k)
  p.vertex((x - w * 0.55) * k, (y - h * 0.62) * k)
  p.endShape(p.CLOSE)
}

/**
 * A puff of powder thrown up where something lands on the snow at (x, y):
 * one low cloud of three lumps, drawn twice over like `puff` so it has one
 * outline and not three, that bursts up, spreads, and sinks back into the
 * snow it came from. `f` from 0 (the instant) to 1 (gone).
 */
export function powder(p: p5, k: number, ink: string, weight: number, white: string, x: number, y: number, f: number, size = 1): void {
  if (f <= 0 || f >= 1) return
  const r = 0.065 * size * (f < 0.2 ? Math.sin((Math.PI / 2) * (f / 0.2)) : 1 - ((f - 0.2) / 0.8) ** 2)
  if (r < 0.03 * size) return
  const spread = 0.065 * size * (0.8 + 0.7 * Math.sqrt(f))
  const lumps: [number, number][] = [[-1, 0.72], [0, 1], [1, 0.66]]
  const at = (dx: number, f2: number): [number, number, number] => [(x + dx * spread) * k, (y - r * f2 * 0.6) * k, r * f2 * 2 * k]
  solid(p, ink, weight * 0.8, white)
  for (const [dx, f2] of lumps) p.circle(...at(dx, f2))
  p.noStroke()
  p.fill(white)
  for (const [dx, f2] of lumps) {
    const [cx, cy, d] = at(dx, f2)
    p.circle(cx, cy, Math.max(0, d - weight * 0.8))
  }
}

import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import type { Theme } from '../../../../../../src/core/themes'
import { FLOOR } from '../../../parts'

/**
 * What the concert hall is made of. The rail is the front edge of a stage,
 * on turned balusters, over a floor that is the cell's own ground line. Wood is one colour, brass another,
 * and felt and velvet whatever the map hands the piece; sound is never
 * drawn as lettering, only as the thing that makes it moving: a string
 * that blurs, a skin that ripples, a bar that dips.
 */

const hue = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (!d) return -1
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
const luma = (hex: string) => 0.2126 * parseInt(hex.slice(1, 3), 16) + 0.7152 * parseInt(hex.slice(3, 5), 16) + 0.0722 * parseInt(hex.slice(5, 7), 16)

/** Brass: the palette's most golden colour, whatever the map hands the piece. */
export function brass(theme: Theme): string {
  const off = (hex: string) => (hue(hex) < 0 ? 999 : Math.abs(hue(hex) - 42))
  return [...theme.colors].sort((a, b) => off(a) - off(b))[0]
}

/** Ivory, vellum and drum skin: the palette's lightest colour. */
export function ivory(theme: Theme): string {
  return [...theme.colors].sort((a, b) => luma(b) - luma(a))[0]
}

/** A colour for felt, velvet or lacquer: never the ivory, never the ball's. */
export function feltColor(theme: Theme, color: string, ball: string): string {
  const pale = ivory(theme)
  if (color !== pale && color !== ball) return color
  return theme.colors.find((c) => c !== pale && c !== ball) ?? color
}

/** The stage's edge from x0 to x1: the rail's own line, and no more. */
export function stage(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, y = FLOOR): void {
  outline(p, ink, weight)
  p.line(x0 * k, y * k, x1 * k, y * k)
}

/** A turned baluster from under the stage's board to the floor. */
export function baluster(p: p5, k: number, ink: string, weight: number, color: string, x: number, y0 = FLOOR, y1 = 0.5): void {
  outline(p, ink, weight)
  p.line(x * k, y0 * k, x * k, y1 * k)
  solid(p, ink, weight * 0.9, color)
  p.ellipse(x * k, (y0 + (y1 - y0) * 0.55) * k, 0.07 * k, (y1 - y0) * 0.5 * k)
  outline(p, ink, weight)
  p.line((x - 0.05) * k, y1 * k, (x + 0.05) * k, y1 * k)
}

/**
 * A string between two points, sounding: `amp` is how far its middle swings,
 * in cells, and `phase` where in the swing it is. Drawn as the string at
 * this instant and, while it sounds, the two ends of its swing faintly
 * either side, which is what a sounding string looks like.
 */
export function string(p: p5, k: number, ink: string, weight: number, x0: number, y0: number, x1: number, y1: number, amp = 0, phase = 0): void {
  const nx = -(y1 - y0)
  const ny = x1 - x0
  const len = Math.hypot(nx, ny) || 1
  const bow = (a: number, alpha: number) => {
    const c = p.color(ink)
    c.setAlpha(alpha)
    p.stroke(c)
    p.strokeWeight(weight * 0.7)
    p.noFill()
    p.beginShape()
    p.vertex(x0 * k, y0 * k)
    p.quadraticVertex(((x0 + x1) / 2 + (nx / len) * a * 2) * k, ((y0 + y1) / 2 + (ny / len) * a * 2) * k, x1 * k, y1 * k)
    p.endShape()
  }
  if (amp > 0.002) {
    bow(amp, 70)
    bow(-amp, 70)
  }
  bow(amp * Math.sin(phase), 255)
}

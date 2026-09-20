import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import type { Theme } from '../../../../../src/core/themes'

/**
 * The garden's shared vocabulary: leaves, blooms, soil and pots, drawn the
 * way everything else in the show is — one ink outline, one flat fill —
 * so a vine and a hammer could stand in the same frame and agree.
 */

/** A leaf from (x, y), `len` long, pointing along `angle` (radians, y down), with a midrib. */
export function leaf(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, len: number, angle: number, width = 0.42): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  solid(p, ink, weight, color)
  const w = len * width
  p.beginShape()
  p.vertex(0, 0)
  p.bezierVertex(len * 0.3 * k, -w * k, len * 0.8 * k, -w * 0.6 * k, len * k, 0)
  p.bezierVertex(len * 0.8 * k, w * 0.6 * k, len * 0.3 * k, w * k, 0, 0)
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.8)
  p.line(0.08 * len * k, 0, len * 0.85 * k, 0)
  p.pop()
}

/** A bloom at (x, y): `n` petals round a centre, the centre in `heart`, `open` from 0 (bud) to 1. */
export function bloom(p: p5, k: number, ink: string, weight: number, color: string, heart: string, x: number, y: number, r: number, n = 6, open = 1, phase = 0): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(phase)
  solid(p, ink, weight, color)
  const spread = 0.35 + 0.65 * open
  for (let i = 0; i < n; i++) {
    p.push()
    p.rotate((i / n) * Math.PI * 2)
    p.ellipse(r * 0.55 * spread * k, 0, r * 0.9 * spread * k, r * 0.5 * k)
    p.pop()
  }
  solid(p, ink, weight, heart)
  p.circle(0, 0, r * 0.6 * k)
  p.pop()
}

/** A stem: a line that bows with the wind, from (x0, y0) to (x1, y1), bulging `bow` cells sideways. */
export function stem(p: p5, k: number, ink: string, weight: number, x0: number, y0: number, x1: number, y1: number, bow = 0): void {
  outline(p, ink, weight)
  p.noFill()
  p.beginShape()
  p.vertex(x0 * k, y0 * k)
  p.quadraticVertex(((x0 + x1) / 2 + bow) * k, ((y0 + y1) / 2) * k, x1 * k, y1 * k)
  p.endShape()
}

/** Grass: a tuft of three blades at (x, y), leaning `lean`. */
export function tuft(p: p5, k: number, ink: string, weight: number, x: number, y: number, h = 0.1, lean = 0): void {
  outline(p, ink, weight * 0.9)
  for (const [dx, f] of [
    [-0.03, 0.8],
    [0, 1],
    [0.035, 0.75],
  ]) {
    p.line((x + dx) * k, y * k, (x + dx + lean * f + dx * 1.5) * k, (y - h * f) * k)
  }
}

/** A flower pot standing on `y`, its rim `w` wide and `h` tall, in the colour, with a lip. */
export function pot(p: p5, k: number, ink: string, weight: number, color: string, x: number, y: number, w: number, h: number): void {
  solid(p, ink, weight, color)
  p.quad((x - w / 2) * k, (y - h) * k, (x + w / 2) * k, (y - h) * k, (x + w * 0.38) * k, y * k, (x - w * 0.38) * k, y * k)
  p.rect(x * k, (y - h + 0.02) * k, (w + 0.05) * k, 0.06 * k)
}

/** The ground: a line at `y` from x0 to x1 with tufts along it. */
export function soil(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, y = 0.5): void {
  outline(p, ink, weight)
  p.line(x0 * k, y * k, x1 * k, y * k)
  for (let x = x0 + 0.17; x < x1 - 0.08; x += 0.31) tuft(p, k, ink, weight, x, y, 0.07, 0.02)
}

/** A drop of water: a teardrop at (x, y), `r` across, in the colour. */
export function drop(p: p5, k: number, color: string, x: number, y: number, r: number): void {
  p.push()
  p.noStroke()
  p.fill(color)
  p.circle(x * k, y * k, r * 2 * k)
  p.triangle((x - r * 0.9) * k, (y - r * 0.4) * k, (x + r * 0.9) * k, (y - r * 0.4) * k, x * k, (y - r * 2.2) * k)
  p.pop()
}

/**
 * Water's colour in this palette: the bluest of its colours that is not the
 * ball's, so a ball in a bowl or on a pond is always seen against it.
 */
export function gardenWater(theme: Theme, ball: string): string {
  const blueness = (hex: string) => parseInt(hex.slice(5, 7), 16) - parseInt(hex.slice(1, 3), 16)
  const pool = theme.colors.filter((c) => c !== ball)
  return [...(pool.length ? pool : theme.colors)].sort((a, b) => blueness(b) - blueness(a))[0]
}

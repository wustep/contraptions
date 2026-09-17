import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { mixHex } from '../../parts'

/**
 * The arcade's screens: what pong, pixel and blocks agree on. A screen is
 * a dark window in a bezel of the machine's colour, ruled with scanlines a
 * shade off the dark so it reads as glass with a picture tube behind it
 * and not as a hole in the night. What is on it is drawn in squares, and a
 * lane that runs into one goes in through a doorway cut in the bezel.
 */

/** How thick a screen's bezel is. */
export const BEZEL = 0.05

/** A screen from (x0, y0) to (x1, y1), the window's own edges; the bezel stands outside them. */
export function screen(p: p5, k: number, ink: string, weight: number, color: string, bg: string, x0: number, y0: number, x1: number, y1: number): void {
  const cx = ((x0 + x1) / 2) * k
  const cy = ((y0 + y1) / 2) * k
  solid(p, ink, weight, color)
  p.rect(cx, cy, (x1 - x0 + 2 * BEZEL) * k, (y1 - y0 + 2 * BEZEL) * k, 0.035 * k)
  solid(p, ink, weight * 0.8, bg)
  p.rect(cx, cy, (x1 - x0) * k, (y1 - y0) * k, 0.01 * k)
  // Scanlines: opaque, a shade off the dark, so nothing here is translucent but the halos.
  p.push()
  p.stroke(mixHex(bg, ink, 0.09))
  p.strokeWeight(Math.max(1, weight * 0.35))
  p.strokeCap(p.SQUARE)
  for (let y = y0 + 0.035; y < y1 - 0.02; y += 0.045) p.line((x0 + 0.02) * k, y * k, (x1 - 0.02) * k, y * k)
  p.pop()
}

/**
 * A doorway in a screen's side bezel at `x` (the window's edge on that
 * side), from `y0` down to `y1`: the bezel cut through, its cut ends capped
 * in ink. `side` is -1 for the west bezel and 1 for the east.
 */
export function doorway(p: p5, k: number, ink: string, weight: number, bg: string, x: number, side: 1 | -1, y0: number, y1: number): void {
  // Wide enough to take the bezel's outer line with it, whatever the line's weight.
  const cx = (x + side * (BEZEL / 2 + 0.015)) * k
  p.noStroke()
  p.fill(bg)
  p.rect(cx, ((y0 + y1) / 2) * k, (BEZEL + 0.06) * k, (y1 - y0) * k)
  outline(p, ink, weight)
  for (const y of [y0, y1]) p.line((x - 0.004 * side) * k, y * k, (x + side * (BEZEL + 0.004)) * k, y * k)
}

/** One square of a screen's picture: `px` across, its corner at (x, y). */
export function pixel(p: p5, k: number, color: string, x: number, y: number, px: number, w = 1, h = 1): void {
  p.noStroke()
  p.fill(color)
  p.rect((x + (px * w) / 2) * k, (y + (px * h) / 2) * k, px * w * k * 1.02, px * h * k * 1.02)
}

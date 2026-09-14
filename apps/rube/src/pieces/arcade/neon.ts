import type p5 from 'p5'
import { solid } from '../../../../../src/core/draw'
import { clamp, easeOutCubic } from '../../../../../src/core/ease'

/**
 * The arcade's shared vocabulary: glow, marquee lights, and a score that
 * pops off whatever the ball just hit. The palettes here are dark, so a
 * colour laid down with a soft halo reads as a lit tube or a lamp; the
 * halo is the only translucency in the show, and it stays here.
 */

/** A soft halo behind something lit: a few rings of the colour, fading out. `f` is the brightness. */
export function glow(p: p5, k: number, color: string, x: number, y: number, r: number, f = 1): void {
  if (f <= 0.01) return
  p.push()
  p.noStroke()
  for (let i = 3; i >= 1; i--) {
    const c = p.color(color)
    c.setAlpha(18 * f * (4 - i))
    p.fill(c)
    p.circle(x * k, y * k, r * 2 * (0.7 + i * 0.5) * k)
  }
  p.pop()
}

/** A lamp: a dot in the colour when lit, paper when not, with a halo when lit. */
export function lamp(p: p5, k: number, ink: string, weight: number, color: string, bg: string, x: number, y: number, r: number, lit: number): void {
  if (lit > 0.05) glow(p, k, color, x, y, r * 1.6, lit)
  solid(p, ink, weight * 0.8, lit > 0.5 ? color : bg)
  p.circle(x * k, y * k, r * 2 * k)
}

/** A row of marquee lamps from x0 to x1 at y, `n` of them, chasing with `t` when `on`. */
export function marquee(p: p5, k: number, ink: string, weight: number, color: string, bg: string, x0: number, x1: number, y: number, n: number, t: number, on = true): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n
    const lit = on ? (Math.floor(t * 6 + i) % 3 === 0 ? 1 : 0) : 0
    lamp(p, k, ink, weight, color, bg, x, y, 0.022, lit)
  }
}

/** A lit tube: the colour with a halo, from (x0, y0) to (x1, y1). `f` is how lit. */
export function tube(p: p5, k: number, ink: string, weight: number, color: string, x0: number, y0: number, x1: number, y1: number, f = 1): void {
  p.push()
  if (f > 0.02) {
    const halo = p.color(color)
    halo.setAlpha(60 * f)
    p.stroke(halo)
    p.strokeWeight(weight * 4)
    p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  }
  p.stroke(f > 0.5 ? color : ink)
  p.strokeWeight(weight * 1.3)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  p.pop()
}

/* 3×5 bitmap digits, for the score that pops off a hit. Rows top to bottom, bits left to right. */
const GLYPHS: Record<string, number[]> = {
  '0': [0b111, 0b101, 0b101, 0b101, 0b111],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b111, 0b001, 0b111, 0b100, 0b111],
  '3': [0b111, 0b001, 0b111, 0b001, 0b111],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b111, 0b001, 0b111],
  '6': [0b111, 0b100, 0b111, 0b101, 0b111],
  '7': [0b111, 0b001, 0b001, 0b010, 0b010],
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '9': [0b111, 0b101, 0b111, 0b001, 0b111],
  '+': [0b000, 0b010, 0b111, 0b010, 0b000],
}

/** Bitmap text centred on (x, y), each pixel `px` cells, in the colour. */
export function digits(p: p5, k: number, color: string, x: number, y: number, text: string, px: number): void {
  const w = text.length * 4 - 1
  p.push()
  p.noStroke()
  p.fill(color)
  for (let c = 0; c < text.length; c++) {
    const g = GLYPHS[text[c]]
    if (!g) continue
    for (let r = 0; r < 5; r++) {
      for (let b = 0; b < 3; b++) {
        if (!(g[r] & (1 << (2 - b)))) continue
        const gx = x + (c * 4 + b - w / 2 + 0.5) * px
        const gy = y + (r - 2) * px
        p.rect(gx * k, gy * k, px * k * 0.98, px * k * 0.98)
      }
    }
  }
  p.pop()
}

/** A score popping off (x, y): rises, holds, fades, over `dur` seconds from the moment `since` = 0. */
export function score(p: p5, k: number, color: string, x: number, y: number, text: string, since: number, dur = 0.8): void {
  if (since < 0 || since > dur) return
  const f = since / dur
  const rise = easeOutCubic(clamp(f * 1.6))
  const c = p.color(color)
  c.setAlpha(255 * (1 - clamp((f - 0.6) / 0.4)))
  digits(p, k, c.toString(), x, y - 0.22 - 0.18 * rise, text, 0.03)
}

/** A cabinet: a box with a rounded top edge and a darker base band, in the colour. */
export function cabinet(p: p5, k: number, ink: string, weight: number, color: string, x: number, y0: number, y1: number, w: number): void {
  solid(p, ink, weight, color)
  p.rect(x * k, ((y0 + y1) / 2) * k, w * k, (y1 - y0) * k, 0.03 * k)
  p.fill(ink)
  p.noStroke()
  p.rect(x * k, (y1 - 0.03) * k, w * k, 0.04 * k)
}

/** A flash of rings off (x, y) in the colour: the arcade's hit mark. */
export function flash(p: p5, k: number, color: string, weight: number, x: number, y: number, since: number, dur = 0.25, r0 = 0.1, r1 = 0.3): void {
  if (since < 0 || since > dur) return
  const f = since / dur
  p.push()
  p.noFill()
  p.stroke(color)
  p.strokeWeight(weight * (1.4 - f))
  p.circle(x * k, y * k, (r0 + (r1 - r0) * easeOutCubic(f)) * 2 * k)
  p.pop()
}

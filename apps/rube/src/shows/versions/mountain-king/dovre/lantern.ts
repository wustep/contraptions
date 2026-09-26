import type p5 from 'p5'
import { mixHex } from '../../../../parts'
import type { Pen } from './troll'
import { LAMP, WORKS } from './worlds'

/**
 * The canonical lights of the mountain: the trolls' iron lanterns, their wall torches, and the pool of light each
 * throws. Every light inside the mountain is one of these, so the whole place is lit one way: amber, warm, soft at
 * the edges, the flame small and pointed (never a round bright core: that reads as a second ball).
 *
 * A light is off (`lit` 0: a cold iron cage, a dead torch) until the chain reaction reaches it, and stays lit after:
 * Peer's passage lights the mountain, and in the finale's cutaway every lit place is a place he has been.
 */

export interface LightLook {
  /** 0 dark, 1 burning. Light it over a quarter second or more (a flame catches, it does not switch on). */
  lit: number
  /** Show seconds, for the flicker (a pure function of time: the same frame every time it is drawn). */
  t: number
  /** Per-light variation, a stable number. */
  seed?: number
  /** The cage's height, cells (default 0.34). */
  size?: number
  /** Swing, radians (a lantern knocked, the mountain shaking). */
  swing?: number
  /** Chain length above the cage, cells (default 0.5; 0 for a lantern standing on something). */
  hang?: number
}

/** How much a flame flickers at `t`: about 1, never still, never jumpy. */
export const flicker = (t: number, seed = 0): number =>
  1 + 0.06 * Math.sin(t * 9.1 + seed * 1.7) + 0.04 * Math.sin(t * 13.7 + seed * 3.1) + 0.03 * Math.sin(t * 23.3 + seed * 0.7)

/**
 * The soft pool a light throws on the rock round it: amber, `r` cells across at its edge, strongest `a` at the
 * middle. Draw it BEFORE the set it lights (it is light on the wall behind), and never over Peer.
 */
export function glow(p: p5, c: Pen, x: number, y: number, r: number, a: number, color = LAMP.glow): void {
  if (a <= 0.003 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cx = x * c.k
  const cy = y * c.k
  const R = r * c.k
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
  const col = p.color(color)
  const rgb = `${p.red(col)},${p.green(col)},${p.blue(col)}`
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(0.35, `rgba(${rgb},${a * 0.55})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** A flame: a small pointed teardrop, its tip wavering. (x, y) is its base. */
export function flame(p: p5, c: Pen, x: number, y: number, h: number, t: number, seed = 0, lit = 1): void {
  if (lit <= 0.01) return
  const k = c.k
  const f = flicker(t, seed)
  const hh = h * f * (0.4 + 0.6 * lit)
  const w = h * 0.42
  const lean = 0.12 * Math.sin(t * 5.3 + seed) * h
  p.push()
  p.translate(x * k, y * k)
  p.noStroke()
  for (const [col, s] of [[LAMP.flame, 1], [LAMP.core, 0.5]] as const) {
    const c0 = p.color(col)
    c0.setAlpha(255 * Math.min(1, lit * 1.2))
    p.fill(c0)
    p.beginShape()
    p.vertex(-w * s * 0.5 * k, 0)
    p.bezierVertex(-w * s * 0.6 * k, -hh * s * 0.45 * k, (lean - w * s * 0.1) * k, -hh * s * 0.8 * k, lean * s * k, -hh * s * k)
    p.bezierVertex((lean + w * s * 0.1) * k, -hh * s * 0.8 * k, w * s * 0.6 * k, -hh * s * 0.45 * k, w * s * 0.5 * k, 0)
    p.bezierVertex(w * s * 0.3 * k, h * 0.08 * k, -w * s * 0.3 * k, h * 0.08 * k, -w * s * 0.5 * k, 0)
    p.endShape(p.CLOSE)
  }
  p.pop()
}

/**
 * A hanging iron lantern: hook at (x, y), chain, the bail (a hoop over the top: what says lantern and not a little
 * roofed house), a squat cap, a glass that swells a little, two wire guards and a shallow foot; the flame inside.
 * Its pool of light is `glow`, drawn by the caller behind the set.
 */
export function drawLantern(p: p5, c: Pen, x: number, y: number, look: LightLook): void {
  const { k, ink, weight } = c
  const s = look.size ?? 0.34
  const hang = look.hang ?? 0.5
  const lit = Math.max(0, Math.min(1, look.lit))
  const S = s * k
  p.push()
  p.translate(x * k, y * k)
  p.rotate(look.swing ?? 0)
  const iron = WORKS.iron
  // The chain: a line is enough at this size.
  if (hang > 0) {
    p.stroke(mixHex(iron, ink, 0.25))
    p.strokeWeight(weight * 0.8)
    p.line(0, 0, 0, hang * k)
  }
  p.translate(0, hang * k)
  // The bail: a hoop from the cap's sides up to the hook.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.noFill()
  p.arc(0, S * 0.24, S * 0.56, S * 0.48, Math.PI, Math.PI * 2)
  // The glass: glowing amber when lit, dark when not; a little fuller in the middle.
  const glass = mixHex('#2A2621', LAMP.flame, 0.15 + 0.55 * lit)
  const gt = S * 0.3
  const gb = S * 0.8
  const bulge = (u: number) => S * (0.2 + 0.05 * Math.sin(Math.PI * u))
  p.strokeWeight(weight * 0.9)
  p.fill(glass)
  p.beginShape()
  for (let i = 0; i <= 8; i++) p.vertex(-bulge(i / 8), gt + ((gb - gt) * i) / 8)
  for (let i = 8; i >= 0; i--) p.vertex(bulge(i / 8), gt + ((gb - gt) * i) / 8)
  p.endShape(p.CLOSE)
  // The flame inside.
  flame(p, c, 0, s * 0.72, s * 0.36, look.t, look.seed ?? 0, lit)
  // Two wire guards over the glass, following its swell.
  p.noFill()
  p.strokeWeight(weight * 0.6)
  for (const side of [-1, 1]) {
    p.beginShape()
    for (let i = 0; i <= 8; i++) p.vertex(side * bulge(i / 8) * 0.55, gt + ((gb - gt) * i) / 8)
    p.endShape()
  }
  // The cap: squat, rounded at the top; and the foot, a shallow dish.
  p.strokeWeight(weight * 0.9)
  p.fill(iron)
  p.beginShape()
  p.vertex(-S * 0.27, gt + S * 0.02)
  p.bezierVertex(-S * 0.24, S * 0.16, -S * 0.1, S * 0.14, 0, S * 0.14)
  p.bezierVertex(S * 0.1, S * 0.14, S * 0.24, S * 0.16, S * 0.27, gt + S * 0.02)
  p.endShape(p.CLOSE)
  p.beginShape()
  p.vertex(-S * 0.26, gb - S * 0.01)
  p.vertex(S * 0.26, gb - S * 0.01)
  p.bezierVertex(S * 0.24, gb + S * 0.09, -S * 0.24, gb + S * 0.09, -S * 0.26, gb - S * 0.01)
  p.endShape(p.CLOSE)
  p.pop()
}

/** A torch in an iron bracket on a wall: the bracket's foot at (x, y), the flame above it. `side` 1 if the wall is on its left. */
export function drawTorch(p: p5, c: Pen, x: number, y: number, look: LightLook & { side?: number }): void {
  const { k, ink, weight } = c
  const side = look.side ?? 1
  const s = look.size ?? 0.34
  const lit = Math.max(0, Math.min(1, look.lit))
  p.push()
  p.rectMode(p.CORNER)
  p.translate(x * k, y * k)
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.noFill()
  // The bracket: an arm out from the wall and a cup.
  p.line(0, 0, side * s * 0.5 * k, -s * 0.2 * k)
  p.fill(WORKS.wood)
  p.quad(side * s * 0.36 * k, -s * 0.15 * k, side * s * 0.64 * k, -s * 0.15 * k, side * s * 0.58 * k, -s * 0.9 * k, side * s * 0.42 * k, -s * 0.9 * k)
  p.fill(WORKS.iron)
  p.rect(Math.min(side * s * 0.32, side * s * 0.68) * k, -s * 0.95 * k, s * 0.36 * k, s * 0.14 * k)
  p.pop()
  flame(p, c, x + side * s * 0.5, y - s * 0.95, s * 0.8, look.t, look.seed ?? 0, lit)
}

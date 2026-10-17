import type p5 from 'p5'

/**
 * Drawing straight onto the canvas, in cells: the stage's transform scaled by a cell, so every coordinate is in
 * cells and `px` is one pixel. The canvas is left as it was found.
 */
export interface Brush {
  g: CanvasRenderingContext2D
  /** Pixels a cell. */
  k: number
  /** One pixel, in cells. */
  px: number
}

export function paint(p: p5, k: number, fn: (b: Brush) => void): void {
  const g = p.drawingContext as CanvasRenderingContext2D
  g.save()
  g.scale(k, k)
  fn({ g, k, px: 1 / k })
  g.restore()
}

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
export const hex = (r: number, g: number, b: number): string => `#${hx(r)}${hx(g)}${hx(b)}`
/** `a` mixed `f` of the way to `b`. */
export function mix(a: string, b: string, f: number): string {
  if (f <= 0) return a
  if (f >= 1) return b
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  return hex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f)
}
/** A colour with alpha, for the canvas, the alpha never in exponent form. */
export function rgba(c: string, a: number): string {
  const [r, g, b] = rgb(c)
  return `rgba(${r},${g},${b},${clamp(a).toFixed(3)})`
}

/* ------------------------------------------------------------------ numbers */

export const clamp = (v: number, a = 0, b = 1): number => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, f: number): number => a + (b - a) * f
/** 0 before `a`, 1 after `b`, a smooth step between. */
export function smooth(t: number, a: number, b: number): number {
  const u = clamp((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
export const easeInOut = (u: number): number => {
  const v = clamp(u)
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}
export const easeOut = (u: number): number => 1 - Math.pow(1 - clamp(u), 3)

/** A stable hash, 0 to 1. */
export function hash(a: number, b = 0, s = 0): number {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * The swing of something struck at 0 and let go: nothing before, a push out that peaks at 1 a tenth of a second or
 * so after, back through rest and a little past it, and dying away. Continuous, so nothing struck ever jumps.
 */
export function ring(u: number, freq: number, decay: number): number {
  if (u <= 0) return 0
  const w = freq * Math.PI * 2
  // Where the first swing peaks, so the peak is 1 whatever the frequency and decay.
  const t1 = Math.atan(w / decay) / w
  const top = Math.exp(-decay * t1) * Math.sin(w * t1)
  return (Math.exp(-decay * u) * Math.sin(w * u)) / top
}

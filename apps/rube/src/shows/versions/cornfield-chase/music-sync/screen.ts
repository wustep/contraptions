import type p5 from 'p5'
import type { Piece, PieceCtx } from '../../../../parts'

/**
 * What the scenery shares: where the camera is, read back off the canvas, and the frame it is composing for.
 *
 * The stage draws a piece of scenery like any piece, translated to its entry cell. The sky, the far farm and the
 * corn are not in the world's cells, though: they stand at a distance and move past the camera slower than the
 * machine does. So a drawing here undoes that translation, works out where the camera is from it, and paints in
 * device pixels on the canvas, in units of the 16:9 frame's height. A frame wider or taller than 16:9 sees more sky
 * and more field round the same composition.
 */

export type Ctx2D = CanvasRenderingContext2D

export interface Screen {
  ctx: Ctx2D
  /** The canvas, device pixels. */
  w: number
  h: number
  /** The composed frame's middle: the camera's. */
  cx: number
  cy: number
  /** The composed 16:9 frame's height, device pixels: the unit everything at a distance is sized in. */
  f: number
  /** One cell, device pixels. */
  cell: number
  /** The cell at the frame's middle. */
  camX: number
  camY: number
}

/**
 * On a canvas taller than 16:9 (a phone held upright), the share of the extra picture above the composed frame
 * (`Performance.tall`): the stage sets the machine there, and the scenery's frame goes with it.
 */
export const TALL = 0.7

/** A drawing with no ball of its own. It is handed the universe's own time as `t`. */
export const scenery = (name: string, draw: (p: p5, c: PieceCtx) => void, over?: (p: p5, c: PieceCtx) => void): Piece<null> => ({
  name,
  weight: 0,
  place: () => null,
  draw: (p, _s, c) => draw(p, c),
  over: over ? (p, _s, c) => over(p, c) : undefined,
})

/**
 * The camera, from the canvas's transform at a piece of scenery placed at (`col`, `row`), and the canvas set to draw
 * in device pixels until `done`. Inside a save, so the transform the stage set and the fill p5 last noted come back.
 */
export function screenOf(p: p5, c: PieceCtx, col: number, row: number): Screen {
  const ctx = p.drawingContext as Ctx2D
  const m = ctx.getTransform()
  const cell = Math.hypot(m.a, m.b) * c.k
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const cx = w / 2
  // The composed frame's middle: lower than the canvas's on a tall one, where the stage set the machine (`TALL`).
  const cy = h / 2 + (TALL - 0.5) * Math.max(0, h - (w * 9) / 16)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return { ctx, w, h, cx, cy, f: Math.min(h, (w * 9) / 16), cell, camX: col - (m.e - cx) / cell, camY: row - (m.f - cy) / cell }
}

export const done = (s: Screen): void => s.ctx.restore()

export const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v))
/** 0 before `a`, 1 after `b`, smooth between. */
export const smooth = (v: number, a: number, b: number): number => {
  const u = clamp((v - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** A stable random number in [0, 1) for an integer and a salt. */
export function hash(i: number, salt = 0): number {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt + 0x632be5ab, 0xc2b2ae35)
  x ^= x >>> 15
  x = Math.imul(x, 0x2c1b3c6d)
  x ^= x >>> 12
  x = Math.imul(x, 0x297a2d39)
  x ^= x >>> 15
  return (x >>> 0) / 4294967296
}

/** `#rrggbb` as `rgba(…)` at alpha `a`. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${clamp(a).toFixed(3)})`
}

import type p5 from 'p5'
import { mixHex, type Piece, type PieceCtx } from '../../../../parts'
import { PERIOD, PIECES, wrap } from './music'
import { LENGTH, RADIUS, along } from './path'
import { wideAt } from './camera'
import { overcastAt } from './air'
import { polar, skyAt, smooth, type Sky } from './world'

/**
 * What the drawings of the planet share: the frame the camera has the canvas in, where the world is on it, the
 * day's colours under its weather, where the sun and the moon are, the soft lights stamped for things far off, and
 * the lamplighter's flame.
 */

export const scenery = <S>(name: string, draw: (p: p5, s: S, c: PieceCtx) => void, over?: (p: p5, s: S, c: PieceCtx) => void): Piece<S> => ({
  name,
  weight: 0,
  place: () => null,
  draw,
  over,
})

export type Ctx2D = CanvasRenderingContext2D

/** The frame on the canvas as the drawing sees it: its height in cells, and the ball's way round it. */
export interface View {
  /** Cells top to bottom of the framed picture (`frameOf`). */
  cells: number
  /** 0 close, 1 when the whole planet is the picture. */
  wide: number
  /** The span of the sea in the frame, cells along. */
  u0: number
  u1: number
}

export function viewOf(p: p5, c: PieceCtx): View {
  const ctx = p.drawingContext as Ctx2D
  const m = ctx.getTransform()
  const d = p.pixelDensity()
  // Cells per picture height: the transform's scale is device pixels a pixel of the drawing, and k pixels a cell.
  const scale = Math.hypot(m.a, m.b) / d
  // Of the framed picture, not the canvas: on a phone held upright the camera frames the same cells across a canvas
  // with more sky and sea round them, and is no further out.
  const cells = frameOf(ctx) / d / (c.k * scale)
  const wide = wideAt(cells)
  const u = along(c.t)
  // Once the frame has begun to slide from the ball to the planet's middle, the ball's neighbourhood is no longer
  // what is in it: the whole way round is.
  const half = wide > 0.001 ? LENGTH / 2 : (Math.hypot(p.width, p.height) / (c.k * scale)) * 0.62 + 1.5
  return { cells, wide, u0: u - half, u1: u + half }
}

/**
 * How tall the picture is that the camera frames, device pixels: the canvas's height, or on a canvas narrower than
 * 16:9 (a phone held upright), the height of the 16:9 picture across its width, with more sky and sea round it. What
 * the sky's own things (the sun and the moon, the bow, the aurora, the rays) are sized by, so they keep their place
 * over the horizon.
 */
export const frameOf = (ctx: Ctx2D): number => Math.min(ctx.canvas.height, (ctx.canvas.width * 9) / 16)

/** Where a point of the world (cells) is on the canvas, in device pixels: through the canvas's transform, or `m`. */
export function onCanvas(ctx: Ctx2D, k: number, x: number, y: number, m: DOMMatrix = ctx.getTransform()): [number, number] {
  return [m.a * x * k + m.c * y * k + m.e, m.b * x * k + m.d * y * k + m.f]
}

/** Draw in a stone's own frame: its front foot on the sea at the origin, up the frame's up. */
export function atSea(p: p5, k: number, u: number): void {
  const [x, y] = polar(u, 0)
  p.translate(x * k, y * k)
  p.rotate(u / RADIUS)
}

/** The day's colours at `t` under its weather: greyer and dimmer while the shower's cloud is over. */
export function weathered(t: number): Sky {
  const day = skyAt(t)
  const o = overcastAt(t)
  if (o < 0.001) return day
  const grey = (hex: string, g: string, a: number) => mixHex(hex, g, a * o)
  return {
    ...day,
    top: grey(day.top, '#8A93A3', 0.55),
    low: grey(day.low, '#C4C3C2', 0.5),
    sea: grey(day.sea, '#55626D', 0.4),
    deep: grey(day.deep, '#24303A', 0.3),
    lit: grey(day.lit, '#D9D6D0', 0.3),
  }
}

/** The sun and the moon: how far from overhead, radians (east positive), at show time `t`; beyond ±1.75 they are down. */
/**
 * Each goes once round the planet a period, east to west, so that from far off it is always somewhere in space: the
 * sun crosses the sky through the Gymnopédie and goes slowly round under the planet through the night; the moon rises
 * for the third Gnossienne, sets in the west at dawn, and goes round under the planet through the day.
 */
export const sunAngle = (t: number): number => {
  const u = wrap(t)
  return u < 222 ? 1.82 - (3.64 * u) / 222 : -1.82 - ((2 * Math.PI - 3.64) * (u - 222)) / (PERIOD - 222)
}
export const moonAngle = (t: number): number => {
  const u = wrap(t)
  return u >= 430 ? 1.8 - (3.6 * (u - 430)) / (PERIOD - 430) : -1.8 - ((2 * Math.PI - 3.6) * u) / 430
}

/** The sun or the moon in the frame: where it is on the canvas (device pixels), and how much it lights. */
export interface Body {
  x: number
  y: number
  light: number
  sun: boolean
  /** How far from overhead, radians. */
  angle: number
  /** Its radius on the canvas, device pixels. */
  r: number
}

/** The sun and the moon at `t`, on their arcs over the horizon; they light nothing once the planet is small in the frame. */
export function bodies(ctx: Ctx2D, c: PieceCtx, v: View, day: Sky): Body[] {
  const m = ctx.getTransform()
  const [hx, hy] = onCanvas(ctx, c.k, ...polar(along(c.t) + 0.55, 0), m)
  const reach = frameOf(ctx) * 0.62
  // As the planet draws away each goes, not out, but to where it is in space round the planet (`inSpace`), so the
  // sun of the sky and the sun of space are one sun travelling; and goes over to its look from space once there.
  const travel = smooth(v.wide, 0, 0.3)
  const near = 1 - smooth(v.wide, 0.3, 0.55)
  const cell = Math.hypot(m.a, m.b) * c.k
  const at = (angle: number, way: number, far: number, size: number, light: number, sun: boolean): Body => {
    const [sx, sy] = onCanvas(ctx, c.k, Math.sin(way) * RADIUS * far, -Math.cos(way) * RADIUS * far, m)
    return {
      x: hx + Math.sin(angle) * reach * 1.25 + (sx - hx - Math.sin(angle) * reach * 1.25) * travel,
      y: hy - Math.cos(angle) * reach + (sy - hy + Math.cos(angle) * reach) * travel,
      light: Math.abs(angle) > 1.9 ? 0 : light,
      sun,
      angle,
      r: frameOf(ctx) * (sun ? 0.045 : 0.03) * (1 - travel) + RADIUS * size * cell * travel,
    }
  }
  const veil = 1 - 0.8 * overcastAt(c.t)
  return [
    at(sunAngle(c.t), sunWay(c.t), SUN_FAR, 0.05, near * veil * (1 - day.night * 0.8), true),
    at(moonAngle(c.t), moonWay(c.t), MOON_FAR, 0.055, near * day.night, false),
  ]
}

/** How far from the planet's middle the sun and the moon are in space, in radii of the planet. */
export const SUN_FAR = 1.85
export const MOON_FAR = 1.5

/** Which way the sun is from the planet's middle at `t`, radians clockwise from the world's up. */
export const sunWay = (t: number): number => along(t) / RADIUS + sunAngle(t)
export const moonWay = (t: number): number => along(t) / RADIUS + moonAngle(t)

/** How far over the horizon the aurora's sheet reaches, in heights of the framed picture. */
export const AURORA_OVER = 0.78

/** How much the ball carries its flame at `t`: from dusk, as the first Gnossienne begins, until it ends. */
export const [, GN1_PIECE] = PIECES
export const lamplighter = (t: number): number => {
  const u = wrap(t)
  return smooth(u, GN1_PIECE.from - 3, GN1_PIECE.from + 3) * (1 - smooth(u, GN1_PIECE.last - 2, GN1_PIECE.end + 2))
}

/** A soft round light, drawn once and stamped: a lamp, or an open flower, seen from far off. */
const halos = new Map<string, HTMLCanvasElement>()
export function haloSprite(core: string, mid: string, edge: string): HTMLCanvasElement {
  const key = [core, mid, edge].join('|')
  const got = halos.get(key)
  if (got) return got
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, `rgba(${core}, 1)`)
  r.addColorStop(0.12, `rgba(${mid}, 0.85)`)
  r.addColorStop(0.4, `rgba(${edge}, 0.22)`)
  r.addColorStop(1, `rgba(${edge}, 0)`)
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  halos.set(key, c)
  return c
}

import type p5 from 'p5'
import type { Theme } from '../../../../../../../src/core/themes'
import type { PieceCtx } from '../../../../parts'
import type { Piece } from '../../../../parts'
import type { World } from '../../../../worlds'

/**
 * The world's look: a winter night seen from a warm room. Inside, the lamp's light on wood, brass and felt; outside,
 * the blue of the snow and the green of the aurora. The ball is pale, a pearl, so it reads against both.
 */

export const BALL = '#F4EFE4'
export const INK = '#1C1714'

export const THEME: Theme = {
  name: 'windowlight',
  label: 'Windowlight',
  bg: '#0C1222',
  ink: INK,
  colors: [BALL, '#C9A15C', '#7E3B3F', '#5EE0A6'],
  weight: 0.7,
  note: 'A small machine on a winter windowsill, by lamplight, under the aurora.',
}

export const WORLD: World = {
  name: 'windowlight',
  label: 'Windowlight',
  note: 'A winter windowsill at night: a lamp inside, the aurora outside, and a machine between them.',
  themes: [THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

/** The materials. */
export const BRASS = '#C9A15C'
export const BRASS_DARK = '#7A5E33'
export const BRASS_LIGHT = '#F1D69A'
export const WOOD = '#9C7249'
export const WOOD_DARK = '#5A3D26'
export const FELT = '#7E3B3F'
export const FELT_DARK = '#4E2327'
export const THREAD = '#D8CDB8'

export type Ctx2D = CanvasRenderingContext2D

/** A drawing that stands for the whole period. */
export const scenery = <S>(name: string, draw: (p: p5, s: S, c: PieceCtx) => void, over?: (p: p5, s: S, c: PieceCtx) => void): Piece<S> => ({
  name,
  weight: 0,
  place: () => null,
  draw,
  over,
})

/** A colour with an alpha, 0..1. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** The frame as the drawing sees it: its middle in cells, how many cells tall it is, and cells to device pixels. */
export interface View {
  /** World cells at the canvas's middle. */
  x: number
  y: number
  /** Cells top to bottom of the canvas. */
  cells: number
  /** Device pixels a cell. */
  px: number
  /** The canvas, device pixels. */
  W: number
  H: number
}

/** Read off the drawing's transform: the pieces are drawn with the world's origin where the transform puts it. */
export function viewOf(p: p5, c: PieceCtx): View {
  const ctx = p.drawingContext as Ctx2D
  const m = ctx.getTransform()
  const px = Math.hypot(m.a, m.b) * c.k
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  return { x: (W / 2 - m.e) / px, y: (H / 2 - m.f) / px, cells: H / px, px, W, H }
}

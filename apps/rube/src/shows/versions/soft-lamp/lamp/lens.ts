import type { Framing } from '../../../registry'
import { viewOf } from './canvas'
import { smooth } from './music'

/**
 * The lens, for what is out past the glass: how far behind the window a thing is, and so how it moves and how sharp it
 * is as the camera does.
 *
 * The room is one plane, the wall the window is in: the camera's frame is drawn on it. What is through the glass is
 * further off, and a layer at depth `p` (0 on the glass, 1 at the sky) moves with the camera by that much: as the
 * camera follows the ball along the sill, the near roofs slide behind the bars, the far ones less, the moon hardly
 * at all against the frame. A push in is partly the operator stepping closer, so the far layers grow a little less
 * than the room does.
 *
 * And the operator focuses on what they look at. Through the room's frames and the window's the city is sharp; as the
 * camera comes in to the desk it goes soft behind the rain, its lit windows opening into discs of light, while the
 * beads on the glass stay in focus. Every part of it is a function of the camera's frame, and so of show time.
 */

type Ctx = CanvasRenderingContext2D

/** Where the camera is, and how much it sees (cells top to bottom, for a 16:9 frame). */
export interface Lens {
  x: number
  y: number
  size: number
}

/** The frame the layers are drawn for: the window's look over the desk. There, every layer sits where it was drawn. */
const HOME = { x: 0.21, y: -1.9, cells: 4.9 }
/** How much of a push in is the operator stepping closer (the rest is the lens). */
const DOLLY = 0.35
/** Up and down, the layers move less than across: the camera rises and falls less than it travels along the desk. */
const RISE = 0.6

/** The lens of a camera's frame, as the show plans it (`camera`). */
export const lensOf = (c: Framing): Lens => ({ x: c.x, y: c.y, size: c.cells })

/** The lens of what the canvas shows: its middle, and the height a 16:9 frame of the same area would have. */
export function lensIn(ctx: Ctx): Lens {
  const v = viewOf(ctx)
  const w = v.x1 - v.x0
  const h = v.y1 - v.y0
  return { x: (v.x0 + v.x1) / 2, y: (v.y0 + v.y1) / 2, size: Math.sqrt((w * h * 9) / 16) }
}

/** Where a layer at depth `p` is drawn on the wall: `x_wall = s * x + ox` (and the same for y). */
export function layerOf(lens: Lens, p: number): { s: number; ox: number; oy: number } {
  // Only closer: drawing back to the room, the far layers keep the size they were drawn at.
  const s = Math.min(1, lens.size / HOME.cells) ** (p * DOLLY)
  return {
    s,
    ox: lens.x * (1 - s) + s * p * (lens.x - HOME.x),
    oy: lens.y * (1 - s) + s * p * RISE * (lens.y - HOME.y),
  }
}

/** A point of a layer at depth `p`, on the wall. */
export function onWall(lens: Lens, p: number, x: number, y: number): { x: number; y: number } {
  const l = layerOf(lens, p)
  return { x: l.s * x + l.ox, y: l.s * y + l.oy }
}

/** Draw a layer at depth `p`: the context's transform takes the layer's own coordinates. */
export function inLayer(ctx: Ctx, lens: Lens, p: number, draw: () => void): void {
  const l = layerOf(lens, p)
  ctx.save()
  ctx.transform(l.s, 0, 0, l.s, l.ox, l.oy)
  draw()
  ctx.restore()
}

/**
 * How out of focus the far city is: the radius (cells, on the wall) a point of light past the glass opens into. None
 * in the room's frames and the window's; a little following the ball along the sill; most at the cup, close.
 */
export const blurOf = (lens: Lens): number => 0.085 * (1 - smooth(lens.size, 2.6, 4.6))

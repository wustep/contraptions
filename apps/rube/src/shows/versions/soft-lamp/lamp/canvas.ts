/** The drawing's two small helpers, shared by every part of the room. */

type Ctx = CanvasRenderingContext2D

/** A hex colour at an alpha, 0 to 1. */
export const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/** The part of the world (cells) the canvas shows, in the drawing's current transform. */
export function viewOf(ctx: Ctx): { x0: number; y0: number; x1: number; y1: number } {
  const m = ctx.getTransform().inverse()
  const c = ctx.canvas
  const pts = [new DOMPoint(0, 0), new DOMPoint(c.width, 0), new DOMPoint(0, c.height), new DOMPoint(c.width, c.height)].map((q) => m.transformPoint(q))
  return {
    x0: Math.min(...pts.map((q) => q.x)),
    x1: Math.max(...pts.map((q) => q.x)),
    y0: Math.min(...pts.map((q) => q.y)),
    y1: Math.max(...pts.map((q) => q.y)),
  }
}

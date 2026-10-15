/**
 * A vignette for a frame: painted once for the frame's size (it is the same at every frame), only its corners
 * darkening, and only the corners laid on, so the middle of the frame is never touched. Home lays it on too.
 */
const vignettes = new Map<string, HTMLCanvasElement | null>()
function vignetteFor(W: number, H: number): HTMLCanvasElement | null {
  const key = `${W}x${H}`
  if (vignettes.has(key)) return vignettes.get(key) ?? null
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) return null
  g.translate(W / 2, H / 2)
  g.scale(1, H / W)
  const r = (W / 2) * 1.42
  const grad = g.createRadialGradient(0, 0, r * 0.8, 0, 0, r)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,1)')
  g.fillStyle = grad
  g.fillRect(-r, -r, 2 * r, 2 * r)
  if (vignettes.size > 6) vignettes.delete(vignettes.keys().next().value as string)
  vignettes.set(key, c)
  return c
}
/** Lay the vignette's corners at `a`. */
export function edges(ctx: CanvasRenderingContext2D, a: number): void {
  if (a <= 0.003) return
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const v = vignetteFor(W, H)
  if (!v) return
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = a
  // Only the corners carry much of it; the rest is left as it is, and never drawn.
  const bw = Math.round(W * 0.25)
  const bh = Math.round(H * 0.28)
  for (const [x, y] of [[0, 0], [W - bw, 0], [0, H - bh], [W - bw, H - bh]]) ctx.drawImage(v, x, y, bw, bh, x, y, bw, bh)
  ctx.restore()
}


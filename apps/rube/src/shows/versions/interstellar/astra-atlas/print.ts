import type p5 from 'p5'

/** The plate is fixed in object space. No time seed, image filter, or line boil. */
export const PAPER = '#E9DFCB'
export const INK = '#20221E'
export const COPPER = '#A35B3E'
export const SAGE = '#748174'
const cast = new Set(['#f0c987', '#1f5e98', '#7c8c9c', '#8fa8c4', '#9a958a'])
const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern[]>()

function plates(ctx: CanvasRenderingContext2D): CanvasPattern[] {
  const found = patterns.get(ctx)
  if (found) return found
  const out = [0, 1, 2].map((kind) => {
    const tile = document.createElement('canvas')
    tile.width = tile.height = 256
    const g = tile.getContext('2d')!
    const noise = (i: number) => ((Math.imul(i + 17, 1597334677) >>> 0) % 65521) / 65521
    g.strokeStyle = kind === 0 ? 'rgba(233,223,203,0.24)' : kind === 1 ? 'rgba(32,34,30,0.13)' : 'rgba(87,72,49,0.07)'
    g.lineWidth = kind === 2 ? 0.9 : 1.7
    for (let i = 0; i < (kind === 2 ? 90 : 24); i++) {
      const x = noise(i * 7) * 256
      const y = kind === 2 ? noise(i * 13) * 256 : i * 11
      g.beginPath()
      g.moveTo(kind === 2 ? x : -20, y)
      g.lineTo(kind === 2 ? x + 2 + noise(i) * 8 : 100, y - (kind === 2 ? 3 : 15 + noise(i) * 3))
      if (kind !== 2) g.lineTo(276, y - 37)
      g.stroke()
    }
    return ctx.createPattern(tile, 'repeat')!
  })
  patterns.set(ctx, out)
  return out
}

/** An impression inside each solid surface, clipped by the very same silhouette.
 * Scoped to this take's piece draw only; the stage's cast and other takes never inherit it.
 */
export function impression(p: p5, k: number, draw: () => void): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const fill = ctx.fill
  const rect = ctx.fillRect
  const [cut, hatch] = plates(ctx)
  const m = new DOMMatrix().scale(k * 0.72 / 256)
  cut.setTransform(m)
  hatch.setTransform(m)
  const surface = (): CanvasPattern | null => {
    const v = ctx.fillStyle
    if (typeof v !== 'string' || cast.has(v.toLowerCase()) || ctx.globalAlpha < 0.35) return null
    const rgb = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(v)
    if (!rgb) return null
    const l = (parseInt(rgb[1], 16) + parseInt(rgb[2], 16) + parseInt(rgb[3], 16)) / 3
    return l > 214 ? null : l < 130 ? cut : hatch
  }
  ctx.fill = function (...args: Parameters<typeof fill>) {
    fill.apply(ctx, args)
    const texture = surface()
    if (texture) {
      const prior = ctx.fillStyle
      ctx.fillStyle = texture
      fill.apply(ctx, args)
      ctx.fillStyle = prior
    }
  } as typeof fill
  ctx.fillRect = function (x, y, w, h) {
    rect.call(ctx, x, y, w, h)
    const texture = surface()
    if (texture && Math.abs(w * h) > k * k * 0.025) {
      const prior = ctx.fillStyle
      ctx.fillStyle = texture
      rect.call(ctx, x, y, w, h)
      ctx.fillStyle = prior
    }
  }
  try { draw() } finally { ctx.fill = fill; ctx.fillRect = rect }
}

export function paper(p: p5, k: number, f: { x0: number; y0: number; x1: number; y1: number }): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.fillStyle = PAPER
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  const grain = plates(ctx)[2]
  grain.setTransform(new DOMMatrix().scale(k * 1.9 / 256))
  ctx.fillStyle = grain
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  ctx.restore()
}

/** Copper lines are individual cuts in the plate, not a luminous airbrush. */
export function blackSun(p: p5, k: number, x: number, y: number, r: number, fade = 1, strike = 0): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(-0.07)
  p.noStroke()
  p.fill(INK)
  p.circle(0, 0, r * 2 * k)
  p.noFill()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.globalAlpha *= fade
  p.stroke(COPPER)
  for (let i = 0; i < 26; i++) {
    const rr = r * (1.025 + i * 0.013)
    p.strokeWeight(Math.max(0.55, k * r * (i % 4 === 0 ? 0.007 : 0.0035)))
    p.arc(0, 0, 2 * rr * k, 2 * rr * k, Math.PI + 0.012 * (i % 5), Math.PI * 2 - 0.018 * (i % 7))
    if (i < 12) p.arc(0, 0, 2 * rr * k, 2 * rr * k, 0.01 * (i % 3), Math.PI - 0.015 * (i % 5))
  }
  // Exposed paper separates the disk from the black mass at scored crossings.
  p.stroke(PAPER)
  p.strokeWeight(k * r * (0.014 + strike * 0.025))
  p.line(-4.7 * r * k, 0, 4.7 * r * k, 0)
  p.stroke(COPPER)
  for (let i = -12; i <= 12; i++) {
    p.strokeWeight(Math.max(0.5, k * r * (i % 3 === 0 ? 0.005 : 0.0025)))
    p.beginShape()
    const reach = 4.7 - (Math.abs(i) % 4) * 0.11
    for (let j = 0; j <= 72; j++) {
      const xx = -reach + 2 * reach * j / 72
      const yy = i * 0.008 * Math.sqrt(Math.max(0, 1 - (xx / reach) ** 2)) + 0.0018 * Math.sin(j * 1.8 + i)
      p.vertex(xx * r * k, yy * r * k)
    }
    p.endShape()
  }
  p.pop()
}

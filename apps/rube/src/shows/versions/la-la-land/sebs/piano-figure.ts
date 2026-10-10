import type p5 from 'p5'
import type { Pt } from '../../../../parts'
import { rgba } from './kit'

/**
 * The figure a planetarium draws over a constellation, as a picture of what it is: here a grand piano seen from above,
 * in fine gold line. Its outline in its own unit frame (x across, y down; the keyboard along the foot, the long
 * straight side on the left, the tail at the top, the bentside curving in on the right), drawn on from the keyboard's
 * left corner round to its right as `draw` goes from 0 to 1, and then the keys.
 */
export const OUTLINE: Pt[] = (() => {
  const pts: Pt[] = [[-0.5, 0.62], [-0.5, -0.5]]
  // The tail: round over the top.
  for (let j = 1; j <= 10; j++) {
    const a = Math.PI + (j / 10) * (Math.PI * 0.62)
    pts.push([-0.22 + 0.28 * Math.cos(a), -0.5 + 0.34 * Math.sin(a)])
  }
  // The bentside: in, and out again to the keyboard's right corner.
  const b: Pt[] = [[0.02, -0.78], [0.18, -0.34], [0.5, -0.05], [0.5, 0.62]]
  for (let j = 1; j <= 16; j++) {
    const u = j / 16
    const a = 1 - u
    pts.push([
      a * a * a * b[0][0] + 3 * a * a * u * b[1][0] + 3 * a * u * u * b[2][0] + u * u * u * b[3][0],
      a * a * a * b[0][1] + 3 * a * a * u * b[1][1] + 3 * a * u * u * b[2][1] + u * u * u * b[3][1],
    ])
  }
  pts.push([-0.5, 0.62])
  return pts
})()

/** Draw the figure centred on `at` (cells), `size` cells across, turned by `angle`, `draw` of the way on, at `a`. */
export function drawPianoFigure(p: p5, k: number, at: Pt, size: number, angle: number, draw: number, a: number, color: string, minPx = 0, flash = 0): void {
  if (a <= 0.01 || draw <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const P = ([x, y]: Pt): Pt => {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    return [at[0] + (x * c - y * s) * size, at[1] + (x * s + y * c) * size]
  }
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // A soft haze along the line, and the line in it.
  for (const [w, al] of [[0.07, 0.18], [0.018, 0.85]] as const) {
    ctx.strokeStyle = rgba(color, al * a)
    ctx.lineWidth = Math.max(w * k, minPx * (w / 0.018))
    ctx.beginPath()
    const n = Math.max(2, Math.ceil(OUTLINE.length * Math.min(1, draw)))
    OUTLINE.slice(0, n).forEach((q, i) => {
      const [x, y] = P(q)
      if (i === 0) ctx.moveTo(x * k, y * k)
      else ctx.lineTo(x * k, y * k)
    })
    ctx.stroke()
  }
  // The keys, once the outline is round: a row of short strokes along the keyboard.
  const keys = Math.max(0, Math.min(1, (draw - 1) / 0.4))
  if (keys > 0 && flash > 0.01) {
    // A chord played on it: light along the keyboard.
    const [g0, h0] = P([-0.5, 0.55])
    const [g1, h1] = P([0.5, 0.55])
    const gr = ctx.createLinearGradient(g0 * k, h0 * k, g1 * k, h1 * k)
    gr.addColorStop(0, rgba(color, 0))
    gr.addColorStop(0.5, rgba('#FFF6DA', 0.75 * flash * a))
    gr.addColorStop(1, rgba(color, 0))
    ctx.strokeStyle = gr
    ctx.lineWidth = Math.max(0.16 * size * k, minPx * 8) * 0.5
    ctx.beginPath()
    ctx.moveTo(g0 * k, h0 * k)
    ctx.lineTo(g1 * k, h1 * k)
    ctx.stroke()
  }
  if (keys > 0) {
    ctx.strokeStyle = rgba(flash > 0.01 ? '#FFF6DA' : color, Math.min(1, (0.7 + 0.3 * flash) * a))
    ctx.lineWidth = Math.max(0.014 * k, minPx * 0.8)
    const m = 14
    for (let i = 1; i < m; i++) {
      if (i / m > keys) break
      const x = -0.5 + i / m
      const [x0, y0] = P([x, 0.62])
      const [x1, y1] = P([x, 0.48])
      ctx.beginPath()
      ctx.moveTo(x0 * k, y0 * k)
      ctx.lineTo(x1 * k, y1 * k)
      ctx.stroke()
    }
    const [a0, b0] = P([-0.5, 0.48])
    const [a1, b1] = P([0.5, 0.48])
    ctx.beginPath()
    ctx.moveTo(a0 * k, b0 * k)
    ctx.lineTo(a0 * k + (a1 - a0) * k * keys, b0 * k + (b1 - b0) * k * keys)
    ctx.stroke()
  }
  ctx.restore()
}

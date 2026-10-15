import type p5 from 'p5'
import type { PieceCtx } from '../../../../parts'
import type { Show } from '../../../../show'
import type { StockMap } from '../../../stock/types'
import { clamp, rgba, smooth } from './screen'

/**
 * The photograph. The booth's flash fills the frame for a moment on its beat; then, as the last chord rings out, the
 * camera draws back across the field until the whole fair stands on the horizon, and the ball's run through it comes
 * up as one line of light, from where it left the fair back to where it came in: a long exposure of the chase.
 */

export interface Finale {
  /** Show time of the booth's flash. */
  flash: number
  /** Show time the ball is gone through the last portal and the camera may draw back, and when it is all the way back. */
  from: number
  to: number
  /** Where it ends up: the fair from end to end over the horizon. */
  wide: { x: number; y: number; cells: number }
  /** The horizon at the frame's share from its top, as the camera draws back. */
  horizon(t: number): number
  /** How far back the camera has drawn, 0 to 1. */
  back(t: number): number
}

/**
 * The photograph for the fair's `map`: the flash at `flash`, the draw back from `from` to `to`, framing the run's last
 * stretch, the pieces the ball reaches from `since` on, low in the frame with the night sky over it.
 */
export function finale(map: StockMap, flash: number, from: number, to: number, since: number): Finale {
  const cells = map.pieces.filter((p) => p.begin >= since).flatMap((p) => p.cells)
  const x0 = Math.min(...cells.map(([x]) => x))
  const x1 = Math.max(...cells.map(([x]) => x))
  const y1 = Math.max(...cells.map(([, y]) => y))
  // Wide enough for the stretch and a cell and a half each side; its foot on the horizon, a little over a quarter up.
  const wideCells = ((x1 - x0 + 3) * 9) / 16
  const foot = 0.72
  const wide = { x: (x0 + x1) / 2, y: y1 + 0.5 - (foot - 0.5) * wideCells, cells: wideCells }
  const back = (t: number) => smooth(t, from, to)
  // The horizon rises from under the machine to the stretch's foot as the camera draws back.
  return { flash, from, to, wide, back, horizon: (t) => 0.8 + (foot - 0.8) * back(t) }
}

/** The camera drawn back by `u` (0 to 1) from `close` to `wide`: in log of the cells, so the pace of the pull is even. */
export function pull(close: { x: number; y: number; cells: number }, wide: { x: number; y: number; cells: number }, u: number): { x: number; y: number; cells: number } {
  const cells = Math.exp(Math.log(close.cells) + (Math.log(wide.cells) - Math.log(close.cells)) * u)
  // The middle moves with the frame's size, so what was framed close stays in the frame as it widens.
  const m = (cells - close.cells) / Math.max(1e-6, wide.cells - close.cells)
  return { x: close.x + (wide.x - close.x) * m, y: close.y + (wide.y - close.y) * m, cells }
}

/** Where the ball went through the fair, every thirtieth of a second, and its colour there. */
export interface Exposure {
  pts: Float32Array
  colors: string[]
  times: Float32Array
}

export function expose(show: Show, from: number, to: number): Exposure {
  const n = Math.ceil((to - from) * 30)
  const pts = new Float32Array(n * 2)
  const times = new Float32Array(n)
  const colors: string[] = []
  for (let i = 0; i < n; i++) {
    const t = from + (i * (to - from)) / (n - 1)
    const here = show.at(t)
    pts[i * 2] = here.x
    pts[i * 2 + 1] = here.y
    times[i] = t
    colors.push(here.ball.color)
  }
  return { pts, colors, times }
}

/**
 * The exposure, drawn over the machine in the world's cells (the stage has the canvas at the scenery's cell,
 * `col`, `row`): from the end of the run back toward its start as the camera draws back, so it is always coming up
 * where the frame is opening. A soft glow under a fine bright line.
 */
export function exposure(p: p5, c: PieceCtx, col: number, line: number, t: number, e: Exposure, fin: Finale): void {
  const shown = smooth(t, fin.from + 0.2, fin.to - 0.6)
  if (shown <= 0) return
  const n = e.times.length
  const first = Math.floor((n - 1) * (1 - shown))
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const k = c.k
  const X = (i: number) => (e.pts[i * 2] - col) * k
  const Y = (i: number) => (e.pts[i * 2 + 1] - line) * k
  // Thick enough to read at the widest, never thicker than the ball close up.
  const px = 1 / Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
  const core = Math.max(1.4 * px, k * 0.035)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Runs of one colour, each stroked once for its glow and once for its line.
  let i = first
  while (i < n - 1) {
    const color = e.colors[i]
    let j = i + 1
    while (j < n - 1 && e.colors[j] === color) j++
    const path = new Path2D()
    path.moveTo(X(i), Y(i))
    for (let m = i + 1; m <= j; m++) path.lineTo(X(m), Y(m))
    const hex = /^#[0-9a-f]{6}$/i.test(color) ? color : '#FFFFFF'
    ctx.strokeStyle = rgba(hex, 0.16)
    ctx.lineWidth = core * 5
    ctx.stroke(path)
    ctx.strokeStyle = rgba(hex, 0.85)
    ctx.lineWidth = core
    ctx.stroke(path)
    i = j
  }
  // The head of the exposure as it travels back along the run: a bright point that fades once it reaches the start.
  if (shown < 1) {
    const h = Math.max(0, first)
    const g = ctx.createRadialGradient(X(h), Y(h), 0, X(h), Y(h), core * 7)
    g.addColorStop(0, rgba('#FFF6E0', 0.9))
    g.addColorStop(1, rgba('#FFF6E0', 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(X(h), Y(h), core * 7, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** The booth's flash: the frame lit from the booth out for an instant, and back over a third of a second. */
export function flash(p: p5, c: PieceCtx, col: number, line: number, t: number, at: number, booth: [number, number]): void {
  const age = t - at
  if (age < 0 || age > 0.4) return
  const a = clamp(1 - age / 0.4) ** 2.2
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const bx = (booth[0] - col) * c.k
  const by = (booth[1] - line) * c.k
  const r = c.k * 9
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(bx, by, c.k * 0.1, bx, by, r)
  g.addColorStop(0, rgba('#FFF8EA', 0.95 * a))
  g.addColorStop(0.25, rgba('#F4EEFF', 0.5 * a))
  g.addColorStop(1, rgba('#D8D0FF', 0.14 * a))
  ctx.fillStyle = g
  ctx.fillRect(bx - r * 4, by - r * 4, r * 8, r * 8)
  ctx.restore()
}

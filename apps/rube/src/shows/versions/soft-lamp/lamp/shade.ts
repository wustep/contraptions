import { liftAt } from './hands'
import { BOOKS, CAT, CUP, FAR_CUP, GLASS, LAMP, MUG, R, SILL, WALKMAN } from './desk'
import { ballAt, hollowY } from './route'
import { MOUTH, lampAt } from './world'

/**
 * Shadows: what sits things down. Each thing on the desk has a soft dark at its foot, longer on the side away from the
 * lamp; and the ball has its own on whatever is under it, small and dark as it sits, wider and fainter as it rises off
 * it (a nod, a step, the lob), so every bounce is read twice. The window lights the room a little too, so nothing's
 * shadow goes quite away when the lamp is down.
 */

type Ctx = CanvasRenderingContext2D

/** A soft dark ellipse at (x, y), `w` either side and `h` up and down, pushed `lean` along x. */
function pool(ctx: Ctx, x: number, y: number, w: number, h: number, a: number, lean = 0): void {
  if (a <= 0.005) return
  ctx.save()
  ctx.translate(x + lean, y)
  ctx.scale(w, h)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, `rgba(12, 8, 22, ${a.toFixed(3)})`)
  g.addColorStop(0.55, `rgba(12, 8, 22, ${(a * 0.45).toFixed(3)})`)
  g.addColorStop(1, 'rgba(12, 8, 22, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** How far a shadow at `x` leans away from the lamp, and how strong it is (the window's share never goes). */
function fromLamp(x: number, t: number): { lean: number; a: number } {
  const dx = x - MOUTH.x
  return { lean: Math.max(-0.25, Math.min(0.25, dx * 0.06)), a: 0.25 + 0.4 * lampAt(t) }
}

/** The feet of everything on the desk. */
export function contacts(ctx: Ctx, t: number): void {
  const feet: [number, number, number][] = [
    // x middle, half width, y
    [MUG.x, (MUG.halfW + 0.05) * (liftAt(t) > 0.02 ? 0 : 1), 0],
    [(WALKMAN.x0 + WALKMAN.x1) / 2, (WALKMAN.x1 - WALKMAN.x0) / 2 + 0.05, 0],
    [(CAT.x0 + CAT.chest) / 2, (CAT.chest - CAT.x0) / 2 + 0.08, 0],
    [(BOOKS[2].x0 + BOOKS[2].x1) / 2, (BOOKS[2].x1 - BOOKS[2].x0) / 2 + 0.06, 0],
    [CUP.x, CUP.halfW + 0.05, 0],
    [FAR_CUP.x, FAR_CUP.halfW + 0.08, 0],
    [LAMP.base.x, LAMP.base.w / 2 + 0.06, 0],
  ]
  for (const [x, w, y] of feet) {
    if (w <= 0) continue
    const s = fromLamp(x, t)
    pool(ctx, x, y, w * (1 + Math.abs(s.lean)), 0.07, s.a * 0.85, s.lean)
  }
  // Each book on the one under it.
  for (let i = 0; i < BOOKS.length - 1; i++) {
    const b = BOOKS[i]
    const s = fromLamp(b.x0, t)
    pool(ctx, (b.x0 + b.x1) / 2, b.bottom, (b.x1 - b.x0) / 2 + 0.05, 0.035, s.a * 0.7, s.lean * 0.5)
  }
}

/** What is under the ball at x, as high as the highest surface below it. */
function floorUnder(x: number, y: number): number {
  let best = 0
  const take = (top: number) => {
    if (top > y && top < best) best = top
  }
  if (x >= SILL.x0 && x <= SILL.x1) take(SILL.y)
  for (const b of BOOKS) if (x >= b.x0 && x <= b.x1) take(b.top)
  if (Math.abs(x - CUP.x) <= CUP.halfW) take(hollowY(x - CUP.x) + R)
  return best
}

/** The ball's shadow, on whatever it is over. */
export function ballShadow(ctx: Ctx, t: number): void {
  const b = ballAt(t)
  const floor = floorUnder(b.x, b.y + R * 0.5)
  const h = Math.max(0, floor - (b.y + R))
  const s = fromLamp(b.x, t)
  const k = Math.exp(-h / 0.45)
  pool(ctx, b.x, floor, R * (1.25 + h * 1.4), 0.045 + 0.02 * h, s.a * 1.4 * k, s.lean * (0.3 + h))
}

/**
 * Shadows on the wall: each thing on the desk throws a soft one onto the wall just behind it, away from the lamp, and
 * the ball throws its own, going where it goes (behind the books when it is behind them). Drawn with the canvas's own
 * blur, at the frame's scale, so they are as soft close up as wide.
 */
export function wallShadows(ctx: Ctx, t: number): void {
  const m = ctx.getTransform()
  const s = Math.hypot(m.a, m.b)
  const lamp = lampAt(t)
  const cast = (x: number, shape: () => void, a: number, blur = 0.09) => {
    const d = x - MOUTH.x
    // Further from the lamp, further thrown and softer.
    const dx = Math.max(-0.22, Math.min(0.22, d * 0.07))
    const dy = -0.05 - Math.abs(d) * 0.012
    const FAR = 20000
    ctx.save()
    ctx.shadowColor = `rgba(14, 9, 26, ${(a * (0.35 + 0.65 * lamp)).toFixed(3)})`
    ctx.shadowBlur = (blur + Math.abs(d) * 0.02) * s
    ctx.shadowOffsetX = FAR + dx * s
    ctx.shadowOffsetY = dy * s
    ctx.translate(-FAR / s, 0)
    ctx.fillStyle = '#000'
    shape()
    ctx.fill()
    ctx.restore()
  }
  const rect = (x0: number, y0: number, x1: number, y1: number) => () => {
    ctx.beginPath()
    ctx.rect(x0, y0, x1 - x0, y1 - y0)
  }
  if (liftAt(t) <= 0.02) cast(MUG.x, rect(MUG.x - MUG.halfW, -MUG.h, MUG.x + MUG.halfW, 0), 0.4)
  cast(WALKMAN.x1, rect(WALKMAN.x0, -WALKMAN.h, WALKMAN.x1, 0), 0.4)
  cast(CAT.chest, () => {
    ctx.beginPath()
    ctx.ellipse((CAT.x0 + CAT.chest) / 2, -0.25, (CAT.chest - CAT.x0) / 2, 0.36, 0, 0, Math.PI * 2)
    ctx.moveTo(CAT.head.x + 0.25, CAT.head.y)
    ctx.arc(CAT.head.x, CAT.head.y, 0.25, 0, Math.PI * 2)
  }, 0.4)
  for (const b of BOOKS) cast((b.x0 + b.x1) / 2, rect(b.x0, b.top, b.x1, b.bottom), 0.45)
  cast(CUP.x, rect(CUP.x - CUP.halfW, CUP.top, CUP.x + CUP.halfW, 0), 0.4)
  cast(FAR_CUP.x, rect(FAR_CUP.x - FAR_CUP.halfW, -FAR_CUP.h, FAR_CUP.x + FAR_CUP.halfW, 0), 0.35)
  // Not through the window: glass takes no shadow.
  const b = ballAt(t)
  if (b.x > GLASS.x0 - R && b.x < GLASS.x1 + R && b.y < GLASS.y1 + 2 * R) return
  cast(b.x, () => {
    ctx.beginPath()
    ctx.arc(b.x, b.y, R, 0, Math.PI * 2)
  }, 0.5, 0.05)
}

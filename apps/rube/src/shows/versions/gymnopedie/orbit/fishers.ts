import { mixHex } from '../../../../parts'
import { PIECES, osc, wrap } from './music'
import { inLayer, layered, repeatOf } from './air'
import { hash, smooth, type Sky } from './world'
import { haloSprite, type Ctx2D } from './frame'

/**
 * Night fishing boats: as the island fishermen go out with lamps at dusk, a few small boats far out on the sea, each a
 * bright warm lamp over a low dark hull, rocking slowly, its light laid on the water as the colonnade's lamps' are. They
 * light their lamps one by one after the ball's first, stay out through both nights, and put them out and go home before
 * the dawn. A layer of their own, far, drifting slowly against the ball's way.
 */

export const FISHERS = { f: 0.24, span: repeatOf(0.24, 1), wind: 1 }

export const SMACKS = Array.from({ length: 7 }, (_, i) => ({
  x: ((i + 0.6 * hash(i, 1001)) * FISHERS.span) / 7,
  size: 0.16 + 0.07 * hash(i, 1002),
  seed: i,
}))

/** How lit a boat's lamp is at `t`: lit one by one after the first lamp, out one by one before the dawn. */
export function fisherAt(seed: number, t: number): number {
  const u = wrap(t)
  const on = PIECES[1].from + 18 + 30 * hash(seed, 1003)
  const off = PIECES[2].last - 40 + 30 * hash(seed, 1004)
  return smooth(u, on, on + 2.5) * (1 - smooth(u, off, off + 3))
}

/** Each boat in the frame at `t`: cells along from the ball's place, how lit, and how much of it is drawn. */
export function fishersIn(t: number, half: number): { seed: number; d: number; lit: number; edge: number; size: number }[] {
  const out: { seed: number; d: number; lit: number; edge: number; size: number }[] = []
  for (const b of SMACKS) {
    const lit = fisherAt(b.seed, t)
    if (lit < 0.01) continue
    const d = layered(b.x, t, FISHERS.f, FISHERS.span, FISHERS.wind)
    const edge = inLayer(d, FISHERS.span)
    if (Math.abs(d) > half + 1 || edge < 0.01) continue
    out.push({ seed: b.seed, d, lit, edge, size: b.size })
  }
  return out
}

/** One boat, in its frame (its waterline's middle at the origin, up the frame's up, a cell a unit): hull, lamp and glow. */
export function drawFisher(ctx: Ctx2D, size: number, lit: number, t: number, seed: number, day: Sky, alpha: number): void {
  const rock = 0.06 * osc(t, 0.13, seed)
  ctx.save()
  ctx.rotate(rock)
  ctx.globalAlpha = alpha * lit
  ctx.fillStyle = mixHex(day.deep, '#05070E', 0.4)
  ctx.beginPath()
  ctx.moveTo(-size * 0.6, -size * 0.12)
  ctx.lineTo(size * 0.6, -size * 0.12)
  ctx.lineTo(size * 0.42, size * 0.04)
  ctx.lineTo(-size * 0.45, size * 0.04)
  ctx.closePath()
  ctx.fill()
  // A short mast at the stern with the lamp hung out over the water.
  ctx.fillRect(-size * 0.42, -size * 0.55, size * 0.05, size * 0.45)
  const flicker = 0.92 + 0.08 * osc(t, 0.47, seed * 2.3)
  const lx = -size * 0.25
  const ly = -size * 0.42
  const r = size * 1.6
  ctx.globalAlpha = alpha * lit * flicker
  ctx.drawImage(haloSprite('255, 240, 200', '255, 214, 140', '255, 186, 100'), lx - r, ly - r, 2 * r, 2 * r)
  ctx.fillStyle = '#FFF0C8'
  ctx.beginPath()
  ctx.arc(lx, ly, size * 0.08, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

import type { Pt } from '../../../../../parts'
import { scenery } from '../kit'
import { layer, view, type View } from '../depth'
import { BEATS } from '../music'
import { drawAir, fireT, heat } from './draw'
import { BED, BX, BX1, DECK, drained, FENCE, LIP, STREET, T0, T1, toneAt } from './geo'
import { ctxOf, rgba, type Pen } from './pen'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * The heat in the burning room's air (`drawAir`). The fire's light on what is near it, a plain warm wash along the
 * pavement in front of the building and across the tracks on the platform's edge, flickering with the flames and
 * lifting on every downbeat. Nearest, out of focus, the platform the camera stands on: a pillar and a bench. Over all
 * of it, a magenta haze high up and the night closing in at the top. Every colour goes through the daydream's tone,
 * so all of it drains with the rest.
 */

type C2 = CanvasRenderingContext2D

const ANCHOR: Pt = [3.5, -1.3]
const REF = 4.3

/** The downbeats while the daydream lasts: the fire lifts on each, over a few frames (on the cut, at once). */
const DOWNBEATS = BEATS.filter((b) => b.pos === 1 && b.t >= T0 - 0.5 && b.t <= T1).map((b) => b.t)
function flareAt(t: number): number {
  let v = 0
  for (const b of DOWNBEATS) {
    if (t < b || t - b >= 1) continue
    const rise = b <= T0 + 0.01 ? 1 : Math.min(1, (t - b) / 0.06)
    v = Math.max(v, rise * Math.exp(-(t - b) / 0.22))
  }
  return v
}

/** How bright the fire's light is on what is near it: its heat, its flicker, its lift on the downbeats. */
function fireLight(t: number): number {
  const ft = fireT(t)
  const flick = 0.85 + 0.15 * Math.sin(ft * 11.3) * Math.sin(ft * 4.7 + 1.3)
  const h = heat(t) * flick
  return h * (1 + 0.3 * flareAt(t) * (1 - drained(t)))
}

/* ------------------------------------------------------------------ the fire's light */

/**
 * The fire's light on what is near it, laid on as a plain warm wash: the pavement from the fence to the shop, warmest
 * in front of the building, and the vault's face under it; the rails and the ties; across the tracks, the platform's
 * deck, warmest at its lip.
 */
function fireOnThings(ctx: C2, pen: Pen, k: number, t: number): void {
  const f = Math.min(1.6, fireLight(t))
  if (f <= 0.01) return
  const fire = '#FF9437'
  const bands: [number, number, number, number, [number, number][]][] = [
    [FENCE, BX1, STREET, STREET + 0.12, [[0, 0.06], [(BX - FENCE) / (BX1 - FENCE), 0.2], [1, 0.08]]],
    [LIP - 2.2, LIP, DECK, DECK + 0.3, [[0, 0], [1, 0.09]]],
    [LIP, FENCE, BED - 0.24, BED + 0.02, [[0, 0.02], [1, 0.12]]],
  ]
  ctx.save()
  for (const [x0, x1, y0, y1, stops] of bands) {
    const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
    for (const [at, a] of stops) g.addColorStop(at, rgba(pen, fire, a * f))
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  // The vault's face under the pavement, from the fence on: the light going from its top course down.
  const top = STREET + 0.12
  const g = ctx.createLinearGradient(0, top * k, 0, (top + 0.8) * k)
  g.addColorStop(0, rgba(pen, fire, 0.1 * f))
  g.addColorStop(1, rgba(pen, fire, 0))
  ctx.fillStyle = g
  ctx.fillRect((FENCE + 0.02) * k, top * k, (BX1 + 8 - FENCE) * k, 0.8 * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the near plane */

/** The near platform's pillar and a bench, in the near plane's cells: each where the camera passes it at an edge. */
const PILLAR = -3.6
const BENCHES = [-2.5]

function nearPlane(ctx: C2, pen: Pen, v: View, t: number): void {
  const f = fireLight(t)
  layer(ctx, v, 1.4, ANCHOR, REF, (inner) => {
    const k = inner.k
    const near = rgba(pen, '#0C0818', 0.96)
    const rim = rgba(pen, '#FF9A3C', Math.min(0.6, 0.18 + 0.3 * f))
    for (const bx of BENCHES) {
      if (bx < inner.x0 - 2 || bx > inner.x1 + 2) continue
      // A bench: the slats of its back on their two posts, its seat, its iron arm; the fire along their tops.
      const seat = 1.42
      ctx.fillStyle = near
      ctx.beginPath()
      for (let i = 0; i < 3; i++) ctx.roundRect((bx - 1.0) * k, (seat - 0.58 + i * 0.15) * k, 2.0 * k, 0.09 * k, 0.03 * k)
      ctx.roundRect((bx - 1.1) * k, seat * k, 2.2 * k, 0.12 * k, 0.04 * k)
      for (const dx of [-0.75, 0.65]) ctx.rect((bx + dx) * k, (seat - 0.62) * k, 0.06 * k, 1.4 * k)
      ctx.rect((bx + 0.95) * k, (seat - 0.24) * k, 0.06 * k, 0.9 * k)
      ctx.rect((bx + 0.7) * k, (seat - 0.26) * k, 0.35 * k, 0.05 * k)
      ctx.fill()
      ctx.fillStyle = rim
      for (let i = 0; i < 3; i++) ctx.fillRect((bx - 0.98) * k, (seat - 0.58 + i * 0.15) * k, 1.96 * k, 0.016 * k)
      ctx.fillRect((bx - 1.08) * k, seat * k, 2.16 * k, 0.02 * k)
    }
    if (PILLAR > inner.x0 - 1 && PILLAR < inner.x1 + 1) {
      // A steel column, the fire's light down its far side.
      const w = 0.42
      const x0 = PILLAR - w / 2
      ctx.fillStyle = near
      ctx.fillRect(x0 * k, (inner.y0 - 0.2) * k, w * k, (inner.h + 0.4) * k)
      ctx.fillStyle = rim
      ctx.fillRect((x0 + w - 0.06) * k, (inner.y0 - 0.2) * k, 0.035 * k, (inner.h + 0.4) * k)
    }
  })
}

/* ------------------------------------------------------------------ the grade */

/** A magenta haze high in the frame, and the night closing in over it. */
function grade(ctx: C2, pen: Pen, v: View): void {
  const k = v.k
  const h = v.h * 0.16
  const g = ctx.createLinearGradient(0, v.y0 * k, 0, (v.y0 + h) * k)
  g.addColorStop(0, rgba(pen, '#0B0620', 0.55))
  g.addColorStop(0.5, rgba(pen, '#5A2650', 0.12))
  g.addColorStop(1, rgba(pen, '#5A2650', 0))
  ctx.fillStyle = g
  ctx.fillRect((v.x0 - 0.05) * k, (v.y0 - 0.05) * k, (v.w + 0.1) * k, (h + 0.05) * k)
}

export const dreamFront = scenery<null>({
  name: 'dream-front',
  draw: (p, _s, c) => {
    const t = c.t
    const pen: Pen = { p, k: c.k, ink: c.ink, w: c.weight, tone: toneAt(t) }
    const ctx = ctxOf(p)
    const v = view(p, c.k)
    ctx.save()
    drawAir(pen, t)
    fireOnThings(ctx, pen, c.k, t)
    nearPlane(ctx, pen, v, t)
    grade(ctx, pen, v)
    ctx.restore()
  },
})

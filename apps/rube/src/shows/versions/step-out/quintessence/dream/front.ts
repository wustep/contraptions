import type { Pt } from '../../../../../parts'
import { scenery } from '../kit'
import { layer, motes, view, type View } from '../depth'
import { BEATS } from '../music'
import { drawAir, fireT, heat } from './draw'
import { BX, drained, LIP, STREET, T0, T1, toneAt } from './geo'
import { ctxOf, rgba, type Pen } from './pen'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * The air round the fire: embers and sparks going up off it and twinkling out, the heat in the room, the smoke in
 * the shop. The fire's light on everything near it, on the pavement and across the tracks on the platform's edge,
 * pulsing with the flames and flaring on every downbeat. Nearest, out of focus, the platform the camera stands on:
 * a pillar, a bench's end, a lamp hanging on its rod. Over all of it, a magenta haze high up and the night closing
 * in at the top. Every colour goes through the daydream's tone, so all of it drains with the rest.
 */

type C2 = CanvasRenderingContext2D

const ANCHOR: Pt = [3.5, -1.3]
const REF = 4.3

/** The downbeats while the daydream lasts: the fire flares on each. */
const DOWNBEATS = BEATS.filter((b) => b.pos === 1 && b.t >= T0 - 0.5 && b.t <= T1).map((b) => b.t)
function flareAt(t: number): number {
  let v = 0
  for (const b of DOWNBEATS) if (t >= b && t - b < 1) v = Math.max(v, Math.exp(-(t - b) / 0.22))
  return v
}

/** How bright the fire's light is on what is near it: its heat, its flicker, its flares on the downbeats. */
function fireLight(t: number): number {
  const ft = fireT(t)
  const flick = 0.85 + 0.15 * Math.sin(ft * 11.3) * Math.sin(ft * 4.7 + 1.3)
  const h = Math.max(heat(t, 0), heat(t, 1)) * flick
  return h * (1 + 0.45 * flareAt(t) * (1 - drained(t)))
}

/* ------------------------------------------------------------------ the air */

function sparks(ctx: C2, pen: Pen, v: View, t: number): void {
  const d = drained(t)
  if (d >= 0.98) return
  const ft = fireT(t)
  ctx.save()
  ctx.globalAlpha = 1 - d
  // Embers going up off the building, drifting left on the night air, twinkling as they go.
  motes(ctx, v, ft, {
    n: 14,
    seed: 21,
    tile: [3.3, 4.1],
    r: [0.012, 0.026],
    v: [-0.16, -0.62],
    spread: 0.5,
    sway: [0.12, 0.35],
    color: rgba(pen, '#FFC960', 0.9),
    twinkle: 0.85,
    within: { x0: BX - 1.8, y0: -10, x1: 10, y1: -0.6 },
  })
  // Brighter sparks close over the burning beds, quick, going out fast.
  for (const [y0, y1] of [[-8.6, -7.0], [-5.6, -4.5], [-2.9, -1.9]]) {
    motes(ctx, v, ft, {
      n: 7,
      seed: 22,
      tile: [1.6, 1.1],
      r: [0.008, 0.016],
      v: [-0.25, -0.9],
      spread: 0.6,
      sway: [0.06, 1.3],
      color: rgba(pen, '#FFE9B0', 0.95),
      twinkle: 0.9,
      within: { x0: BX + 0.4, y0, x1: 8.6, y1 },
    })
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the fire's light */

/** The fire's light on what is near it: the pavement in front of the building, and across the tracks, the platform. */
function fireOnThings(ctx: C2, pen: Pen, k: number, t: number): void {
  const f = fireLight(t)
  if (f <= 0.01) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const [x, y, r, sq, a, col] of [
    [BX + 1.0, STREET, 3.4, 0.22, 0.22, '#FF9437'],
    [LIP + 0.4, 0.35, 2.0, 0.45, 0.1, '#FF9437'],
    [BX - 0.25, -2.0, 1.15, 1, 0.09, '#FFC960'],
  ] as const) {
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.scale(1, sq)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
    g.addColorStop(0, rgba(pen, col, a * f))
    g.addColorStop(0.45, rgba(pen, col, a * f * 0.4))
    g.addColorStop(1, rgba(pen, col, 0))
    ctx.fillStyle = g
    ctx.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
    ctx.restore()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the near plane */

/** The near platform's pillar, a bench and a lamp, in the near plane's cells: each where the camera passes it at an edge. */
const PILLAR = -3.6
const BENCHES = [-2.5]
const LAMP: Pt = [-2.6, -1.0]

function nearPlane(ctx: C2, pen: Pen, v: View, t: number): void {
  const f = fireLight(t)
  layer(ctx, v, 1.4, ANCHOR, REF, (inner) => {
    const k = inner.k
    const near = rgba(pen, '#0C0818', 0.96)
    const rim = rgba(pen, '#FF9A3C', Math.min(0.6, 0.18 + 0.3 * f))
    const cold = rgba(pen, '#9FB6C8', 0.16)
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
      // A riveted column: a soft edge (it is close to the lens), the fire's light down its far side.
      const w = 0.42
      const x0 = PILLAR - w / 2
      const soft = ctx.createLinearGradient((x0 - 0.06) * k, 0, (x0 + w + 0.06) * k, 0)
      soft.addColorStop(0, rgba(pen, '#0C0818', 0))
      soft.addColorStop(0.1, near)
      soft.addColorStop(0.9, near)
      soft.addColorStop(1, rgba(pen, '#0C0818', 0))
      ctx.fillStyle = soft
      ctx.fillRect((x0 - 0.06) * k, (inner.y0 - 0.2) * k, (w + 0.12) * k, (inner.h + 0.4) * k)
      ctx.fillStyle = rim
      ctx.fillRect((x0 + w - 0.06) * k, (inner.y0 - 0.2) * k, 0.035 * k, (inner.h + 0.4) * k)
      ctx.fillStyle = cold
      ctx.fillRect((x0 + 0.04) * k, (inner.y0 - 0.2) * k, 0.02 * k, (inner.h + 0.4) * k)
      const rivets = new Path2D()
      for (let y = Math.floor(inner.y0 / 0.3) * 0.3; y < inner.y1; y += 0.3) {
        rivets.moveTo((x0 + w - 0.1 + 0.018) * k, y * k)
        rivets.arc((x0 + w - 0.1) * k, y * k, 0.018 * k, 0, Math.PI * 2)
      }
      ctx.fillStyle = rgba(pen, '#7A5236', 0.5 * (0.5 + 0.5 * f))
      ctx.fill(rivets)
    }
    const [lx, ly] = LAMP
    if (lx > inner.x0 - 1 && lx < inner.x1 + 1) {
      // A lamp hanging on its rod from the platform's roof: an enamel shade, its cold light, swinging a little.
      const sw = 0.03 * Math.sin(t * 1.3) + 0.015 * Math.sin(t * 3.1 + 1)
      const bx = lx + sw * (ly - inner.y0)
      ctx.strokeStyle = near
      ctx.lineWidth = 0.035 * k
      ctx.beginPath()
      ctx.moveTo(lx * k, (inner.y0 - 0.5) * k)
      ctx.lineTo(bx * k, (ly - 0.18) * k)
      ctx.stroke()
      ctx.fillStyle = near
      ctx.beginPath()
      ctx.moveTo((bx - 0.1) * k, (ly - 0.2) * k)
      ctx.lineTo((bx + 0.1) * k, (ly - 0.2) * k)
      ctx.lineTo((bx + 0.32) * k, ly * k)
      ctx.lineTo((bx - 0.32) * k, ly * k)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = rgba(pen, '#D9F0E0', 0.9)
      ctx.fillRect((bx - 0.28) * k, ly * k, 0.56 * k, 0.03 * k)
      const g = ctx.createRadialGradient(bx * k, (ly + 0.05) * k, 0, bx * k, (ly + 0.05) * k, 1.1 * k)
      g.addColorStop(0, rgba(pen, '#D9F0E0', 0.22))
      g.addColorStop(1, rgba(pen, '#D9F0E0', 0))
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.fillRect((bx - 1.1) * k, (ly - 1.05) * k, 2.2 * k, 2.2 * k)
      ctx.restore()
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
    sparks(ctx, pen, v, t)
    nearPlane(ctx, pen, v, t)
    grade(ctx, pen, v)
    ctx.restore()
  },
})

import type { Pt } from '../../../../../parts'
import { layer, motes, rgbaOf, sway, view, type View } from '../depth'
import { hash, scenery } from '../kit'
import { lightning } from './erupt'
import { ERUPT, FINAL, HUSH, T1 } from './geo'
import { ICE } from './theme'
import { edges } from './vignette'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Near: tufts of grass at the frame's foot, bent by the wind; now and then a reflector post going by close, faster
 * than the road, while he rides; grit on the wind. The eruption's amber flash over the whole land and the lightning's
 * flicker after it. Then the hush: the ash in the air, the light going grey-mauve, flakes falling near and far.
 */

const sm = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/** Where the near plane is true: the camera's resting place, at the frame's usual height. */
const ANCHOR: Pt = [FINAL[0], FINAL[1] - 0.6]
const REF = 5

/** The wide (110.4 to 115.5): the camera is off the ground, so nothing is near it. */
const inWide = (t: number): number => sm(t, 109.9, 110.9) * (1 - sm(t, 115.0, 116.0))
/** When the near posts go by: only while he is moving and the camera with him, never on a held frame. */
const postsOn = (t: number): number =>
  Math.max(sm(t, 96.0, 96.4) * (1 - sm(t, 101.0, 101.5)), sm(t, 106.6, 107.0) * (1 - sm(t, 119.2, 119.6))) * (1 - inWide(t))

/** The tufts at the foot of the frame: clumps of blades on the near plane, swaying on the wind. */
function tufts(ctx: CanvasRenderingContext2D, inner: View, t: number, a: number): void {
  const k = inner.k
  const step = 0.9
  const i0 = Math.floor(inner.x0 / step) - 1
  const i1 = Math.ceil(inner.x1 / step) + 1
  const dark = new Path2D()
  const lit = new Path2D()
  const foot = inner.y1 + 0.08
  for (let i = i0; i <= i1; i++) {
    // Clumps here and there along the foot, more at the corners than in the middle.
    const x = i * step + (hash(i, 1, 601) - 0.5) * step * 0.8
    const mid = Math.abs((x - inner.cx) / (inner.w / 2))
    if (hash(i, 2, 601) > 0.25 + 0.65 * mid * mid) continue
    const h = (0.35 + 0.55 * hash(i, 3, 601)) * (0.55 + 0.45 * mid)
    const blades = 5 + Math.floor(5 * hash(i, 4, 601))
    const bend = 0.16 * sway(t, 0.35, i) + 0.1
    for (let b = 0; b < blades; b++) {
      const bx = x + (b / blades - 0.5) * 0.28
      const bh = h * (0.55 + 0.45 * hash(i, 10 + b, 601))
      const lean = (b / blades - 0.5) * 0.25 + bend * (0.7 + 0.6 * hash(i, 20 + b, 601))
      const tip: Pt = [bx + lean * bh, foot - bh]
      const path = b % 3 === 0 ? lit : dark
      path.moveTo((bx - 0.025) * k, foot * k)
      path.quadraticCurveTo((bx + lean * bh * 0.3) * k, (foot - bh * 0.6) * k, tip[0] * k, tip[1] * k)
      path.quadraticCurveTo((bx + lean * bh * 0.3 + 0.02) * k, (foot - bh * 0.6) * k, (bx + 0.025) * k, foot * k)
      path.closePath()
    }
  }
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = ICE.nearGrass
  ctx.fill(dark)
  ctx.fillStyle = ICE.nearGrassLit
  ctx.fill(lit)
  ctx.restore()
}

/** A reflector post on the near plane: close, against the low sun, so dark but for its band and its reflector. */
function posts(ctx: CanvasRenderingContext2D, inner: View, a: number): void {
  const k = inner.k
  const step = 13
  const i0 = Math.floor(inner.x0 / step) - 1
  const i1 = Math.ceil(inner.x1 / step) + 1
  for (let i = i0; i <= i1; i++) {
    const x = i * step + hash(i, 1, 611) * 4
    if (x < inner.x0 - 0.3 || x > inner.x1 + 0.3) continue
    const top = inner.y1 - inner.h * (0.26 + 0.06 * hash(i, 2, 611))
    const w = 0.1
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = ICE.nearPost
    ctx.fillRect((x - w / 2) * k, top * k, w * k, (inner.y1 - top + 0.2) * k)
    ctx.fillStyle = ICE.postBand
    ctx.fillRect((x - w / 2) * k, (top + 0.05) * k, w * k, 0.12 * k)
    ctx.fillStyle = ICE.reflector
    ctx.fillRect((x - w * 0.3) * k, (top + 0.22) * k, w * 0.6 * k, 0.07 * k)
    ctx.fillStyle = ICE.nearGrassLit
    ctx.fillRect((x - w / 2) * k, top * k, w * 0.22 * k, (inner.y1 - top + 0.2) * k)
    ctx.restore()
  }
}

export const icelandFront = scenery<null>({
  name: 'iceland-front',
  draw: (p, _s, c) => {
    const t = c.t
    if (t < 95 || t > 134) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const u = t - ERUPT

    // The ash in the air: the haze it makes, going grey-mauve and thickening to the cut (the director's cover then
    // takes the frame), and the flakes coming down through it.
    const haze = 0.24 * sm(t, ERUPT + 5, T1)
    if (haze > 0.003) {
      ctx.save()
      ctx.fillStyle = rgbaOf(ICE.ashHaze, haze)
      ctx.fillRect((v.x0 - 0.5) * c.k, (v.y0 - 0.5) * c.k, (v.w + 1) * c.k, (v.h + 1) * c.k)
      ctx.restore()
    }
    const ash = sm(t, HUSH + 0.4, HUSH + 3)
    if (ash > 0) {
      ctx.save()
      ctx.globalAlpha = ash
      motes(ctx, v, t, { n: 80, seed: 621, tile: [5, 3.5], r: [0.008, 0.02], v: [0.12, 0.22], spread: 0.4, sway: [0.08, 0.3], color: ICE.ash, twinkle: 0.4, square: true })
      ctx.globalAlpha = sm(t, HUSH + 2, T1 - 3)
      motes(ctx, v, t, { n: 160, seed: 622, tile: [5, 3.5], r: [0.008, 0.018], v: [0.1, 0.2], spread: 0.4, sway: [0.06, 0.25], color: ICE.ashDark, twinkle: 0.3, square: true })
      ctx.globalAlpha = sm(t, HUSH + 5, T1 - 2)
      motes(ctx, v, t, { n: 220, seed: 623, tile: [5, 3.5], r: [0.007, 0.016], v: [0.09, 0.18], spread: 0.4, sway: [0.06, 0.2], color: ICE.ash, twinkle: 0.3, square: true })
      ctx.globalAlpha = sm(t, HUSH + 7, T1 - 1)
      motes(ctx, v, t, { n: 420, seed: 624, tile: [5, 3.5], r: [0.006, 0.013], v: [0.08, 0.16], spread: 0.4, sway: [0.05, 0.2], color: ICE.ashDeep, square: true })
      ctx.restore()
    }

    // The near plane.
    const near = 1 - inWide(t)
    if (near > 0.01) {
      layer(ctx, v, 1.45, ANCHOR, REF, (inner) => {
        const pa = postsOn(t)
        if (pa > 0.01) posts(ctx, inner, pa)
        tufts(ctx, inner, t, near)
        // Grit on the wind, low over the ground: faster while he is riding.
        const gust = 0.6 + 0.4 * Math.sin(t * 0.7)
        ctx.save()
        ctx.globalAlpha = 0.55 * near * (1 - sm(t, HUSH, HUSH + 2))
        motes(ctx, inner, t, { n: 7, seed: 631, tile: [4, 2.5], r: [0.01, 0.02], v: [2.6 * gust, 0.25], spread: 0.5, sway: [0.15, 0.8], color: ICE.grit, streak: 0.035, within: { x0: -1e9, x1: 1e9, y0: inner.y1 - inner.h * 0.3, y1: inner.y1 } })
        ctx.restore()
        if (ash > 0) {
          ctx.save()
          ctx.globalAlpha = ash * 0.9
          motes(ctx, inner, t, { n: 6, seed: 641, tile: [4, 3], r: [0.025, 0.045], v: [0.15, 0.3], spread: 0.4, sway: [0.12, 0.25], color: ICE.ash })
          ctx.restore()
        }
      })
    }

    // The eruption's light: an amber flash over the whole land, falling away with a long warm tail; then the
    // lightning's flicker, white-violet.
    if (u > -0.02 && u < 9) {
      // The burst, two after-pulses as the column clears the crater, and a long warm tail.
      const w = Math.max(0, u)
      const pulse = (at: number, a: number, d: number) => (w < at ? 0 : a * Math.exp(-(w - at) / d))
      const flash = clamp01(pulse(0, 0.19, 0.3) + pulse(0.38, 0.09, 0.25) + pulse(0.86, 0.06, 0.3) + 0.07 * Math.exp(-w / 2.4) + 0.035 * Math.exp(-w / 7))
      const bolt = 0.09 * lightning(t)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      if (flash > 0.01) {
        ctx.fillStyle = rgbaOf(ICE.fire, flash)
        ctx.fillRect((v.x0 - 0.5) * c.k, (v.y0 - 0.5) * c.k, (v.w + 1) * c.k, (v.h + 1) * c.k)
      }
      if (bolt > 0.004) {
        ctx.fillStyle = rgbaOf(ICE.bolt, bolt)
        ctx.fillRect((v.x0 - 0.5) * c.k, (v.y0 - 0.5) * c.k, (v.w + 1) * c.k, (v.h + 1) * c.k)
      }
      ctx.restore()
    } else if (u >= 9) {
      const bolt = 0.06 * lightning(t)
      if (bolt > 0.004) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = rgbaOf(ICE.bolt, bolt)
        ctx.fillRect((v.x0 - 0.5) * c.k, (v.y0 - 0.5) * c.k, (v.w + 1) * c.k, (v.h + 1) * c.k)
        ctx.restore()
      }
    }

    // The frame's corners fall away a little, more as the ash closes in.
    edges(ctx, 0.12 + 0.22 * sm(t, HUSH, T1))
  },
})

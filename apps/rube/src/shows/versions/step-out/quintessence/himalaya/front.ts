import type { Pt } from '../../../../../parts'
import { hash, scenery, smooth } from '../kit'
import { layer, motes, onLayer, view, type View } from '../depth'
import { mix, rgba } from '../home/pen'
import { SEAM } from '../music'
import { lastGust, rise, sunAt, tone, VALLEY, REF, wind, type Tone } from './dawn'
import { inFace } from './himalaya-draw'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane and the
 * air. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or changes his
 * colour. It is handed show time as `t`.
 *
 * The air is full of the wind: spindrift streaming across, thicker as the build climbs; on every gust a sheet of
 * blown snow crosses close to the lens. Once the sun is up the snow in the air glitters, a little more each phrase,
 * and the sun blooms where it stands over the range. The colour of the hour is in the drawing itself (`dawn.ts`), not
 * laid over it.
 */

type C2 = CanvasRenderingContext2D

/** Spindrift in the air on the machine's plane: fine streaks close to, coarser ones far off, so it reads at any distance. */
function air(ctx: C2, v: View, t: number, tn: Tone): void {
  const w = wind(t)
  const close = 1 - smooth(v.h, 7, 13)
  const col = mix('#FFFFFF', tn.faceLit, 0.4 * tn.light)
  const a = 0.14 + 0.12 * Math.min(1, w)
  if (close > 0.02) motes(ctx, v, t, { n: Math.round(5 + 16 * w), seed: 3, tile: [4, 3], r: [0.005, 0.009], v: [3.2 + 1.5 * w, 0.35], spread: 0.35, sway: [0.12, 0.6], color: rgba(col, a * close), streak: 0.06 })
  if (close < 0.98) motes(ctx, v, t, { n: Math.round(4 + 12 * w), seed: 4, tile: [14, 9], r: [0.012, 0.022], v: [9 + 3 * w, 0.8], spread: 0.35, sway: [0.3, 0.4], color: rgba(col, a * (1 - close)), streak: 0.07 })
}

/** Snow crystals in the air, glittering once the sun is on them: more of them each phrase. */
function dust(ctx: C2, v: View, t: number, tn: Tone): void {
  const on = smooth(t, 172, 182) * (0.45 + 0.55 * rise(t))
  if (on <= 0.02) return
  const gold = mix('#FFFFFF', tn.sun, 0.6)
  const close = 1 - smooth(v.h, 7, 13)
  if (close > 0.02) motes(ctx, v, t, { n: Math.round(22 * on), seed: 9, tile: [3, 2.4], r: [0.006, 0.013], v: [0.7, 0.12], sway: [0.1, 0.3], color: rgba(gold, 0.95 * close), twinkle: 0.95, square: true })
  if (close < 0.98) motes(ctx, v, t, { n: Math.round(30 * on), seed: 10, tile: [12, 8], r: [0.018, 0.034], v: [2, 0.3], sway: [0.2, 0.25], color: rgba(gold, 0.9 * (1 - close)), twinkle: 0.95, square: true })
  // Near the lens: a few big soft ones going by.
  layer(ctx, v, 1.4, VALLEY, REF, (s) => motes(ctx, s, t, { n: Math.round(6 * on), seed: 12, tile: [6, 4], r: [0.025, 0.05], v: [1.6, 0.2], sway: [0.25, 0.2], color: rgba(gold, 0.55), twinkle: 0.9 }))
}

/**
 * The sheets: on each gust a sheet of blown snow crosses close to the lens, left to right, low over the snow or high
 * across the sky, in a second or so. Each is a veil, thick in its middle and gone at its ends, full of streaks.
 */
function sheets(ctx: C2, v: View, t: number, tn: Tone): void {
  const g = lastGust(t)
  const dur = 1.5
  if (g.ago > dur || t > SEAM.press - 0.45) return
  const u = g.ago / dur
  const strength = (0.45 + 0.55 * rise(g.at)) * smooth(t, SEAM.himalaya + 0.6, SEAM.himalaya + 1.2)
  layer(ctx, v, 1.5, VALLEY, REF, (s) => {
    const k = s.k
    const across = s.w * 1.9
    const len = s.w * 0.9
    const head = s.x0 - len + across * u * 1.05
    const yc = s.y0 + s.h * (0.3 + 0.5 * hash(g.i, 3, 5))
    const th = s.h * (0.1 + 0.12 * hash(g.i, 4, 5))
    const tilt = -0.06 * s.h
    const a = 0.32 * strength * Math.sin(Math.PI * Math.min(1, u * 1.2))
    if (a <= 0.01) return
    const c = mix('#FFFFFF', tn.faceLit, 0.5 * tn.light)
    ctx.save()
    const gr = ctx.createLinearGradient((head - len) * k, 0, head * k, 0)
    gr.addColorStop(0, rgba(c, 0))
    gr.addColorStop(0.55, rgba(c, a))
    gr.addColorStop(0.85, rgba(c, a * 0.8))
    gr.addColorStop(1, rgba(c, 0))
    ctx.fillStyle = gr
    ctx.beginPath()
    const n = 16
    for (let j = 0; j <= n; j++) {
      const q = j / n
      const x = head - len + len * q
      const y = yc + tilt * q - th * (0.6 + 0.4 * Math.sin(q * 7 + t * 5 + g.i))
      if (j) ctx.lineTo(x * k, y * k)
      else ctx.moveTo(x * k, y * k)
    }
    for (let j = n; j >= 0; j--) {
      const q = j / n
      ctx.lineTo((head - len + len * q) * k, (yc + tilt * q + th * (0.5 + 0.4 * Math.sin(q * 5 - t * 4 + g.i))) * k)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // Its streaks: the snow in it racing ahead of the veil, each its own length, fine as hairlines.
    const streaks = new Path2D()
    for (let i = 0; i < 46; i++) {
      const q = hash(i, 1, g.i)
      const x = head - len * (0.05 + 0.85 * q) + s.w * 0.25 * hash(i, 2, g.i) * u
      const y = yc + tilt * (1 - q) + th * (hash(i, 3, g.i) - 0.5) * 1.8 + Math.sin(t * 6 + i) * th * 0.06
      const l = len * (0.05 + 0.18 * hash(i, 4, g.i))
      streaks.moveTo(x * k, y * k)
      streaks.lineTo((x - l) * k, (y + l * 0.04) * k)
    }
    ctx.strokeStyle = rgba(c, Math.min(0.8, a * 2.2))
    ctx.lineWidth = 1 / ctx.getTransform().a
    ctx.stroke(streaks)
  })
}

/** The sun's light, once it is over the ridge: a bloom where it is, less where the mountain is in front of it. */
function sunlight(ctx: C2, v: View, t: number, tn: Tone): void {
  const up = smooth(t, 177.5, 181)
  if (up <= 0.01) return
  const at: Pt = onLayer(v, 0, VALLEY, REF, sunAt(t))
  const s = v.h / REF
  const hidden = inFace(at[0], at[1]) || (at[0] > 11.6 && at[0] < 21 && at[1] > -10.4) ? 0.35 : 1
  const k = v.k
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // The bloom: rings of light, the flat hand's glow.
  const a = 0.22 * up * tn.light * hidden
  ctx.fillStyle = rgba(tn.sun, a / 12)
  for (let i = 0; i < 12; i++) {
    ctx.beginPath()
    ctx.arc(at[0] * k, at[1] * k, 1.1 * s * k * (1 - i / 12) ** 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export const himalayaFront = scenery<null>({
  name: 'himalaya-front',
  draw: (p, _s, c) => {
    const t = c.t
    if (t < SEAM.himalaya - 0.4 || t > SEAM.press + 0.6) return
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const tn = tone(t)
    air(ctx, v, t, tn)
    dust(ctx, v, t, tn)
    sunlight(ctx, v, t, tn)
    sheets(ctx, v, t, tn)
  },
})

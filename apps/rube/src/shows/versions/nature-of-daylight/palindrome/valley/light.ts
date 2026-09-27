import type { Pt } from '../../../../../parts'
import { rgba } from '../cast'
import { hash, smooth } from '../kit'
import { VALLEY } from '../worlds'
import { daylight, G, MEADOW, SUN_GAP } from './geo'
import { herGoing, ianGoing } from './paths'

/**
 * The daylight (the VALLEY builder's): the cue's title. Once the shell has gone up into the cloud, the cloud glows
 * where it went; on the chord it opens there and the sun comes through, the light coming down in broad soft shafts and
 * spreading along the valley floor from under the opening, reaching her where she watches on the next chord, and
 * reaching Ian after. The air itself lights up. Only the valley's palette: its floodlight cream and its lamp's paler
 * gold, never her gold.
 */

type Ctx = CanvasRenderingContext2D

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** A soft elliptical glow, in 'screen'. */
function glow(ctx: Ctx, k: number, x: number, y: number, rx: number, ry: number, color: string, a: number, core = 0.3): void {
  if (a <= 0.003 || rx <= 0 || ry <= 0) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(core, rgba(color, a * 0.8))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** How lit the meadow is at `x` (0 in the cloud's shade, 1 in the sun): inside the light's reach, soft at its edges. */
export function sunAt(t: number, x: number): number {
  const d = daylight(t)
  if (d.sun <= 0) return 0
  const r = d.reach
  const soft = 5 + 0.3 * r
  return d.sun * clamp01((r + soft * 0.5 - Math.abs(x - SUN_GAP[0])) / soft)
}

/** The opening in the cloud, drawn over the cloud's veil: the light coming, then the sky through it. */
export function drawGap(ctx: Ctx, k: number, t: number): void {
  const d = daylight(t)
  const [gx, gy] = SUN_GAP
  const open = d.sun
  const rx = 7 + 34 * smooth(open, 0, 1) + 6 * smooth(t, G.lit, G.end)
  const ry = rx * 0.36
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  // Before it opens: the cloud lit from behind where the shell went in.
  glow(ctx, k, gx, gy - 4, 26, 11, VALLEY.lamp, 0.3 * d.glow * (1 - 0.5 * open), 0.2)
  if (open > 0.002) {
    // The opening: its torn rims lit, the sky beyond all light.
    glow(ctx, k, gx, gy - 2, rx * 1.7, ry * 1.9, VALLEY.lamp, 0.45 * open, 0.25)
    glow(ctx, k, gx, gy - 4, rx, ry, VALLEY.floodlight, 0.95 * open, 0.5)
    // The rims: the cloud's edges round it catching the light, long and ragged.
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2 + 0.4
      const r = 0.9 + 0.3 * hash(i, 63, 1)
      const bx = gx + Math.cos(a) * rx * r * 1.05
      const by = gy - 4 + Math.sin(a) * ry * r * 1.15
      glow(ctx, k, bx, by, rx * (0.35 + 0.25 * hash(i, 63, 2)), ry * 0.3, VALLEY.floodlight, 0.4 * open, 0.3)
    }
  }
  ctx.restore()
}

/** The air of the valley lit: a great soft glow under the opening, the haze itself shining. */
export function drawAir(ctx: Ctx, k: number, t: number, far = 1): void {
  const d = daylight(t)
  if ((d.sun <= 0.002 && d.glow <= 0.002) || far <= 0.01) return
  const [gx, gy] = SUN_GAP
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  glow(ctx, k, gx + 4, gy + 34, 100, 64, VALLEY.lamp, (0.2 * d.sun + 0.05 * d.glow) * far, 0.15)
  // The slopes under the opening warmed.
  glow(ctx, k, gx, -16, 26 + d.reach * 1.6, 14, VALLEY.floodlight, 0.16 * d.sun * far, 0.3)
  ctx.restore()
}

/**
 * The sun on the land, as far as it has reached: everything in it warmed and lifted (soft light: the darks keep their
 * dark, the greens go gold-green), the shade outside it left as it was.
 */
export function drawSunWash(ctx: Ctx, k: number, f: { x0: number; x1: number; y0: number; y1: number }, t: number): void {
  const d = daylight(t)
  if (d.sun <= 0.002) return
  const [gx] = SUN_GAP
  const r = d.reach
  const soft = 5 + 0.3 * r
  const a = 0.6 * d.sun
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  const at = (x: number) => clamp01((x - x0) / (x1 - x0))
  const lo = gx - r - soft * 0.5
  const hi = gx + r + soft * 0.5
  g.addColorStop(0, rgba(VALLEY.lamp, 0))
  g.addColorStop(at(lo), rgba(VALLEY.lamp, 0))
  g.addColorStop(at(lo + soft), rgba(VALLEY.lamp, a))
  g.addColorStop(Math.max(at(lo + soft), at(hi - soft)), rgba(VALLEY.lamp, a))
  g.addColorStop(Math.max(at(lo + soft), at(hi)), rgba(VALLEY.lamp, 0))
  g.addColorStop(1, rgba(VALLEY.lamp, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'soft-light'
  ctx.fillStyle = g
  // Seen from away it lies on the whole valley; seen close, on the ground (the haze behind is lit by `drawHaze`).
  const far = clamp01((f.y1 - f.y0 - 12) / 30)
  const top = Math.max(f.y0 - 1, MEADOW + (-60 - MEADOW) * far)
  ctx.fillRect(x0 * k, top * k, (x1 - x0) * k, (Math.max(f.y1, top) + 1 - top) * k)
  const close = clamp01((24 - (f.y1 - f.y0)) / 14)
  if (close > 0.01) {
    // Close, the light is behind them: the floor toward us falls into shade, smoothly, down the frame.
    ctx.globalCompositeOperation = 'source-over'
    const sh = ctx.createLinearGradient(0, (MEADOW + 0.15) * k, 0, f.y1 * k)
    sh.addColorStop(0, rgba(VALLEY.meadowDark, 0))
    sh.addColorStop(1, rgba(VALLEY.meadowDark, 0.42 * d.sun * close))
    ctx.fillStyle = sh
    ctx.fillRect(x0 * k, (MEADOW + 0.15) * k, (x1 - x0) * k, Math.max(0, f.y1 - MEADOW) * k)
    // And the grass along the line lit through from behind: a soft fringe of light at its top.
    ctx.globalCompositeOperation = 'screen'
    const fg = ctx.createLinearGradient(0, (MEADOW - 0.14) * k, 0, (MEADOW + 0.2) * k)
    fg.addColorStop(0, rgba(VALLEY.floodlight, 0))
    fg.addColorStop(0.45, rgba(VALLEY.floodlight, 0.22 * d.sun * close))
    fg.addColorStop(1, rgba(VALLEY.floodlight, 0))
    ctx.fillStyle = fg
    ctx.fillRect(x0 * k, (MEADOW - 0.14) * k, (x1 - x0) * k, 0.34 * k)
    // The sky toward the light, up to their left.
    const cx = f.x0 + (f.x1 - f.x0) * 0.2
    glow(ctx, k, cx, f.y0, (f.x1 - f.x0) * 0.7, (f.y1 - f.y0) * 0.6, VALLEY.lamp, 0.5 * d.sun * close, 0.1)
  }
  ctx.restore()
}

/**
 * The haze behind them lit: the sun's light in the air over the valley's far end, brightest low toward the horizon
 * and toward the opening, so what stands on the meadow stands against the light. Drawn before the trees.
 */
export function drawHaze(ctx: Ctx, k: number, f: { x0: number; x1: number; y0: number; y1: number }, t: number): void {
  const d = daylight(t)
  if (d.sun <= 0.002) return
  const [gx] = SUN_GAP
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const top = Math.max(f.y0 - 1, -70)
  const g = ctx.createLinearGradient(0, top * k, 0, MEADOW * k)
  const s = d.sun
  g.addColorStop(0, rgba(VALLEY.lamp, 0.14 * s))
  g.addColorStop(clamp01((MEADOW - 12 - top) / (MEADOW - top)), rgba(VALLEY.lamp, 0.34 * s))
  g.addColorStop(clamp01((MEADOW - 2.5 - top) / (MEADOW - top)), rgba(VALLEY.floodlight, 0.68 * s))
  g.addColorStop(1, rgba(VALLEY.floodlight, 0.55 * s))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (MEADOW - top) * k)
  glow(ctx, k, gx + 4, MEADOW - 6, 40, 16, VALLEY.floodlight, 0.25 * s, 0.2)
  ctx.restore()
}

/**
 * Seen close, the shafts are far off behind them: broad soft bands slanting down from the opening through the haze over
 * the valley's end, drawn before the trees so they stand in front of the light.
 */
export function drawFarShafts(ctx: Ctx, k: number, f: { x0: number; x1: number; y0: number; y1: number }, t: number): void {
  const d = daylight(t)
  const close = clamp01((34 - (f.y1 - f.y0)) / 20)
  if (d.sun <= 0.002 || close <= 0.01) return
  const [gx, gy] = SUN_GAP
  const cx = (f.x0 + f.x1) / 2
  // The light's slant here: from the opening down to the meadow at the frame's middle.
  const dx = (cx - gx) / (MEADOW - gy)
  const tall = f.y1 - f.y0
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (let i = -4; i <= 4; i++) {
    const h = hash(i + 40, 67, 1)
    if (h < 0.3) continue
    const x = cx + i * tall * 0.34 + (hash(i + 40, 67, 2) - 0.5) * tall * 0.2 + 0.3 * Math.sin(t * 0.25 + i)
    const w = tall * (0.05 + 0.1 * hash(i + 40, 67, 3))
    const y0 = f.y0 - 1
    const y1 = MEADOW
    const a = 0.26 * d.sun * close * (0.5 + 0.5 * h) * (0.85 + 0.15 * Math.sin(t * 0.7 + i * 1.3))
    for (const [wide, share] of [[1, 0.45], [0.5, 0.55]] as [number, number][]) {
      const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
      g.addColorStop(0, rgba(VALLEY.floodlight, a * share * 0.6))
      g.addColorStop(1, rgba(VALLEY.floodlight, a * share))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo((x - dx * (y1 - y0) - w * wide) * k, y0 * k)
      ctx.lineTo((x - dx * (y1 - y0) + w * wide) * k, y0 * k)
      ctx.lineTo((x + w * wide) * k, y1 * k)
      ctx.lineTo((x - w * wide) * k, y1 * k)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

/** The light on the valley floor: along the meadow, the camp and the grass, as far as it has reached. */
export function drawSunlight(ctx: Ctx, k: number, t: number, x0: number, x1: number, far = 1): void {
  const d = daylight(t)
  if (d.sun <= 0.002 || far <= 0.01) return
  const [gx] = SUN_GAP
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const step = 3
  const i0 = Math.floor((Math.max(x0, gx - d.reach - 8) - gx) / step)
  const i1 = Math.ceil((Math.min(x1, gx + d.reach + 8) - gx) / step)
  for (let i = i0; i <= i1; i++) {
    const x = gx + i * step
    const s = sunAt(t, x)
    if (s <= 0.01) continue
    // Along the meadow's far side (the camp, the trees, the grass at its edge), and on the floor toward us.
    glow(ctx, k, x, MEADOW - 0.8, 4.4, 2.2, VALLEY.floodlight, 0.14 * s * far, 0.4)
    glow(ctx, k, x, MEADOW + 5, 5.5, 5.5, VALLEY.lamp, 0.07 * s * far, 0.4)
  }
  ctx.restore()
}

/** The shafts: from the opening down through the air to where the light lies on the meadow. */
export function drawRays(ctx: Ctx, k: number, t: number, far = 1): void {
  const d = daylight(t)
  if (d.sun <= 0.002 || far <= 0.01) return
  const [gx, gy] = SUN_GAP
  const reach = Math.max(4, d.reach)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const rays = [
    { top: -0.6, bot: -0.95, w: 5, a: 0.5 },
    { top: -0.35, bot: -0.55, w: 4, a: 0.7 },
    { top: -0.1, bot: -0.15, w: 6, a: 0.85 },
    { top: 0.12, bot: 0.25, w: 4.5, a: 0.8 },
    { top: 0.32, bot: 0.6, w: 5.5, a: 0.65 },
    { top: 0.55, bot: 0.92, w: 4, a: 0.45 },
  ]
  const rx = 7 + 34 * smooth(d.sun, 0, 1)
  for (let i = 0; i < rays.length; i++) {
    const r = rays[i]
    const sway = 0.8 * Math.sin(t * 0.33 + i * 1.7)
    const xa = gx + r.top * rx
    const xb = gx + r.bot * reach + sway
    const ya = gy + 3
    const yb = MEADOW + 1
    const shimmer = 0.88 + 0.12 * Math.sin(t * 0.8 + i * 2.1)
    const a = r.a * d.sun * shimmer * far
    // Each shaft soft-edged: three widths laid over each other.
    for (const [wide, share] of [[1, 0.35], [0.62, 0.35], [0.3, 0.3]] as [number, number][]) {
      const w0 = r.w * 0.35 * wide
      const w1 = r.w * wide * (0.8 + 0.4 * clamp01(reach / 30))
      const g = ctx.createLinearGradient(0, ya * k, 0, yb * k)
      g.addColorStop(0, rgba(VALLEY.floodlight, 0.75 * a * share))
      g.addColorStop(0.55, rgba(VALLEY.floodlight, 0.42 * a * share))
      g.addColorStop(1, rgba(VALLEY.lamp, 0.22 * a * share))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo((xa - w0) * k, ya * k)
      ctx.lineTo((xa + w0) * k, ya * k)
      ctx.lineTo((xb + w1) * k, yb * k)
      ctx.lineTo((xb - w1) * k, yb * k)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

/** In the sun, a soft shadow under each of them on the grass, thrown a little away from the opening. */
export function drawShadows(ctx: Ctx, k: number, t: number): void {
  const d = daylight(t)
  if (d.sun <= 0.002 || t < G.gone || t > G.end + 0.1) return
  const balls: Pt[] = [herGoing(t), ianGoing(t)]
  for (const [x, y] of balls) {
    const s = sunAt(t, x)
    if (s <= 0.01) continue
    const lift = Math.max(0, -y)
    const off = 0.06 + 0.002 * (x - SUN_GAP[0])
    ctx.save()
    ctx.translate((x + off) * k, (MEADOW + 0.015) * k)
    ctx.scale(1, 0.28)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.2 * k)
    g.addColorStop(0, rgba(VALLEY.oliveDark, 0.5 * s * (1 - lift)))
    g.addColorStop(1, rgba(VALLEY.oliveDark, 0))
    ctx.fillStyle = g
    ctx.fillRect(-0.2 * k, -0.2 * k, 0.4 * k, 0.4 * k)
    ctx.restore()
  }
}

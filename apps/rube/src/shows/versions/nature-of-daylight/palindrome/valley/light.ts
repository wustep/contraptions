import type { Pt } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { hash, smooth } from '../kit'
import { SHELL, VALLEY } from '../worlds'
import { daylight, G, MEADOW, SUN_GAP } from './geo'
import { herGoing, ianGoing } from './paths'

/**
 * The daylight (the VALLEY builder's): the cue's title, and the release of the whole film. Once the shell has gone up,
 * the cloud churns and glows where it went; on the chord it tears open there, its torn edges dark and heavy round a
 * hole of light, and the sun comes through at once: shafts down the valley, and the light sweeping along the floor
 * from under the tear, reaching her on the next chord and Ian after. In the sun the grass goes warm gold-green and
 * catches the light at its tips; out of it, the valley falls into the cloud's shade, so the lit band reads as light.
 * Only the valley's palette: its floodlight cream-white and its lamp's pale gold, never her gold.
 */

type Ctx = CanvasRenderingContext2D
type View = { x0: number; x1: number; y0: number; y1: number }

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** A soft elliptical glow (in whatever blend the caller has set). */
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

/** How lit the meadow is at `x` (0 in the cloud's shade, 1 in the sun): inside the light's reach, soft at its edge. */
export function sunAt(t: number, x: number): number {
  const d = daylight(t)
  if (d.sun <= 0) return 0
  const r = d.reach
  const soft = 3 + 0.12 * r
  return d.sun * clamp01((r + soft * 0.5 - Math.abs(x - SUN_GAP[0])) / soft)
}

/** How far the cloud has torn open: fast as it tears, then slowly wider. Its half-width and half-height, cells. */
export function tearAt(t: number): { open: number; rx: number; ry: number } {
  if (t < G.sun) return { open: 0, rx: 0, ry: 0 }
  const open = 1 - Math.pow(1 - clamp01((t - G.sun) / 2.6), 2.4)
  const rx = (2.5 + 31 * open) * (1 + 0.3 * smooth(t, G.sun + 2.6, G.end))
  return { open, rx, ry: rx * 0.36 }
}

/** The tear's ragged outline about its centre, `grow` times its size: torn, never an ellipse. */
function tearPath(ctx: Ctx, k: number, t: number, cx: number, cy: number, rx: number, ry: number, grow = 1): void {
  const n = 72
  const drift = t * 0.05
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = grow * (1 + 0.13 * Math.sin(3 * a + 1.1 + drift) + 0.08 * Math.sin(5 * a + 2.3 - drift * 1.3) + 0.05 * Math.sin(11 * a + 0.4 + drift * 2))
    const x = cx + Math.cos(a) * rx * r
    const y = cy + Math.sin(a) * ry * r * (Math.sin(a) > 0 ? 0.8 : 1.1)
    if (i === 0) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  ctx.closePath()
}

/**
 * The cloud where the shell went, drawn over the cloud's veil: glowing from within in the hush, then torn open, the
 * cloud round the tear heavy and dark against the hole of light, its torn edges lit.
 */
export function drawGap(ctx: Ctx, k: number, t: number): void {
  const d = daylight(t)
  const [gx, gy] = SUN_GAP
  const { open, rx, ry } = tearAt(t)
  ctx.save()
  // Before it tears: the cloud lit from behind where the shell went in, the glow gathering in the churn.
  ctx.globalCompositeOperation = 'screen'
  const seep = d.glow * d.glow * (1 - open)
  glow(ctx, k, gx, gy - 1, 22, 7.5, VALLEY.lamp, 0.42 * seep, 0.25)
  for (let i = 0; i < 4; i++) {
    // Through the churn's gaps: small bright rifts that come and go.
    const ph = t * (0.9 + 0.3 * i) + i * 1.7
    const on = Math.max(0, Math.sin(ph)) ** 2
    glow(ctx, k, gx + (i - 1.5) * 6 + 2 * Math.sin(ph * 0.5), gy - 1.5 + Math.cos(i * 2.1) * 1.5, 3.2, 1.1, VALLEY.floodlight, 0.7 * seep * on, 0.4)
  }
  if (open > 0.001) {
    // The cloud round the tear, heavy and dark against the light: the depth of the deck it has torn through.
    ctx.globalCompositeOperation = 'source-over'
    const heavy = mix(VALLEY.cloudShade, VALLEY.steelDark, 0.5)
    glow(ctx, k, gx, gy + ry * 0.3, rx * 1.55 + 7, ry * 2.3 + 4, heavy, 0.7 * open, 0.45)
    // The hole: the sky beyond, white at its heart, warm toward its edges, and its light bleeding over them.
    tearPath(ctx, k, t, gx, gy, rx, ry)
    const hole = ctx.createRadialGradient(gx * k, (gy - ry * 0.2) * k, 0, gx * k, gy * k, rx * 1.05 * k)
    hole.addColorStop(0, SHELL.screen)
    hole.addColorStop(0.45, mix(SHELL.screen, VALLEY.floodlight, 0.6))
    hole.addColorStop(1, VALLEY.lamp)
    ctx.fillStyle = hole
    ctx.globalAlpha = smooth(open, 0, 0.12)
    ctx.fill()
    ctx.globalAlpha = 1
    // Its torn edge: heavy billows of cloud crowding round it, each lit on the side the light comes through.
    const n = 18
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + 0.2 * Math.sin(i * 2.7)
      const rr = 1.03 + 0.1 * hash(i, 59, 1)
      const size = 0.13 + 0.09 * hash(i, 59, 2)
      const bx = gx + Math.cos(ang) * rx * rr
      const by = gy + Math.sin(ang) * ry * rr * (Math.sin(ang) > 0 ? 0.8 : 1.1)
      const brx = rx * size + 1.5
      const bry = ry * (size * 1.7) + 1
      ctx.globalCompositeOperation = 'source-over'
      glow(ctx, k, bx, by, brx, bry, mix(heavy, VALLEY.steelDark, 0.15), 0.8 * open, 0.55)
      // The rim: toward the hole's middle, bright.
      const lx = bx - Math.cos(ang) * brx * 0.45
      const ly = by - Math.sin(ang) * bry * 0.5
      ctx.globalCompositeOperation = 'screen'
      glow(ctx, k, lx, ly, brx * 0.75, bry * 0.42, VALLEY.floodlight, 0.75 * open, 0.35)
    }
    // Its light bleeding out over the cloud round it.
    ctx.globalCompositeOperation = 'screen'
    glow(ctx, k, gx, gy, rx * 1.35, ry * 1.6, VALLEY.lamp, 0.3 * open, 0.4)
    // A strand of cloud still across it, dark with a lit edge: the hole is deep, not painted on.
    ctx.globalCompositeOperation = 'source-over'
    const sx = gx + rx * 0.25 * Math.sin(t * 0.21)
    glow(ctx, k, sx, gy + ry * 0.3, rx * 0.5, ry * 0.15, mix(VALLEY.cloudShade, VALLEY.steelDark, 0.25), 0.5 * open, 0.4)
    ctx.globalCompositeOperation = 'screen'
    glow(ctx, k, sx, gy + ry * 0.18, rx * 0.45, ry * 0.07, VALLEY.floodlight, 0.55 * open, 0.4)
  }
  ctx.restore()
}

/** The air of the valley lit under the tear: the haze itself shining, most where the shafts come down. */
export function drawAir(ctx: Ctx, k: number, t: number, far = 1): void {
  const d = daylight(t)
  if ((d.sun <= 0.002 && d.glow <= 0.002) || far <= 0.01) return
  const [gx, gy] = SUN_GAP
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  glow(ctx, k, gx + 3, gy + 30, 70 + d.reach, 46, VALLEY.lamp, (0.14 * d.sun + 0.04 * d.glow) * far, 0.15)
  ctx.restore()
}

/** A horizontal gradient across the frame, `a(x)` of `color`, sampled where the light's edge is. */
function across(ctx: Ctx, k: number, x0: number, x1: number, color: string, a: (x: number) => number): CanvasGradient {
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  const n = 24
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    g.addColorStop(i / n, rgba(color, clamp01(a(x))))
  }
  return g
}

/**
 * The sun on the land, as far as it has reached, and the shade beyond it. In the light: warmed and lifted, the greens
 * gone gold-green and bright (soft light, then a little shine). Out of it: the cloud's shade, darker and cooler than
 * the grey morning was, so the lit band reads as light and its edge as it sweeps along the valley.
 */
export function drawSunWash(ctx: Ctx, k: number, f: View, t: number): void {
  const d = daylight(t)
  if (d.sun <= 0.002) return
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const far = clamp01((f.y1 - f.y0 - 12) / 30)
  // Seen from away it lies on the whole valley below the cloud; seen close, on the ground.
  const top = Math.max(f.y0 - 1, MEADOW - 0.05 + (-46 - MEADOW) * far)
  const h = Math.max(f.y1, top) + 1 - top
  const lit = (x: number) => sunAt(t, x)
  ctx.save()
  // Each pass in slices whose strength rises over the first cells from its top, so it has no edge.
  const band = far > 0.01 ? 16 * far : 0
  const pass = (op: GlobalCompositeOperation, style: CanvasGradient) => {
    ctx.globalCompositeOperation = op
    ctx.fillStyle = style
    const n = band > 0 ? 24 : 0
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = (i + 0.5) / n
      ctx.fillRect(x0 * k, (top + (band * i) / n) * k, (x1 - x0) * k, (band / n + 0.02) * k)
    }
    ctx.globalAlpha = 1
    ctx.fillRect(x0 * k, (top + band) * k, (x1 - x0) * k, Math.max(0, h - band) * k)
  }
  pass('soft-light', across(ctx, k, x0, x1, mix(VALLEY.lamp, VALLEY.grass, 0.4), (x) => 0.85 * lit(x)))
  pass('screen', across(ctx, k, x0, x1, VALLEY.floodlight, (x) => 0.13 * lit(x)))
  pass('multiply', across(ctx, k, x0, x1, mix(VALLEY.ridge, VALLEY.cloudShade, 0.35), (x) => 0.55 * d.sun * (1 - lit(x) / Math.max(0.001, d.sun))))
  const close = clamp01((24 - (f.y1 - f.y0)) / 14)
  if (close > 0.01) {
    // Close, the floor toward us a little deeper at the frame's foot.
    ctx.globalCompositeOperation = 'source-over'
    const sh = ctx.createLinearGradient(0, (MEADOW + 0.15) * k, 0, f.y1 * k)
    sh.addColorStop(0, rgba(VALLEY.meadowDark, 0))
    sh.addColorStop(1, rgba(VALLEY.meadowDark, 0.28 * d.sun * close))
    ctx.fillStyle = sh
    ctx.fillRect(x0 * k, (MEADOW + 0.15) * k, (x1 - x0) * k, Math.max(0, f.y1 - MEADOW) * k)
    // The grass along the far line lit through from behind: a soft fringe of light at its top, where the sun is.
    ctx.globalCompositeOperation = 'screen'
    const step = Math.max(0.25, (f.x1 - f.x0) / 40)
    for (let x = Math.floor(f.x0 / step) * step; x <= f.x1 + step; x += step) {
      const s = lit(x) * close
      if (s > 0.01) glow(ctx, k, x, MEADOW - 0.03, step * 1.6, 0.13, VALLEY.floodlight, 0.2 * s, 0.4)
    }
    // The sky toward the light, up to their left.
    const cx = f.x0 + (f.x1 - f.x0) * 0.2
    glow(ctx, k, cx, f.y0, (f.x1 - f.x0) * 0.7, (f.y1 - f.y0) * 0.6, VALLEY.lamp, 0.45 * d.sun * close, 0.1)
  }
  ctx.restore()
}

/**
 * The haze behind them lit: the sun's light in the air over the valley's far end, brightest low toward the horizon,
 * so what stands on the meadow stands against the light. Drawn before the trees.
 */
export function drawHaze(ctx: Ctx, k: number, f: View, t: number): void {
  const d = daylight(t)
  if (d.sun <= 0.002) return
  const [gx] = SUN_GAP
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const top = Math.max(f.y0 - 1, -70)
  const g = ctx.createLinearGradient(0, top * k, 0, MEADOW * k)
  const near = clamp01((20 - (f.y1 - f.y0)) / 12)
  const s = d.sun * (1 - 0.55 * near)
  g.addColorStop(0, rgba(VALLEY.lamp, 0.1 * s))
  g.addColorStop(clamp01((MEADOW - 12 - top) / (MEADOW - top)), rgba(VALLEY.lamp, 0.24 * s))
  g.addColorStop(clamp01((MEADOW - 2.5 - top) / (MEADOW - top)), rgba(VALLEY.floodlight, 0.5 * s))
  g.addColorStop(1, rgba(VALLEY.floodlight, 0.42 * s))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (MEADOW - top) * k)
  glow(ctx, k, gx + 4, MEADOW - 6, 40, 16, VALLEY.floodlight, 0.2 * s, 0.2)
  // Seen close, the mist over the far side lit: soft banks of it shining just above the trees behind them.
  const close = near
  if (close > 0.01) {
    const drift = t * 0.12
    const step = 2.6
    // Their shaded undersides first, so each bank has a form.
    ctx.globalCompositeOperation = 'source-over'
    for (let i = Math.floor((f.x0 - 4 - drift) / step); i <= Math.ceil((f.x1 + 4 - drift) / step); i++) {
      const h = hash(i, 77, 1)
      if (h < 0.25) continue
      const x = i * step + drift + (hash(i, 77, 2) - 0.5) * step
      const y = MEADOW - 1.7 - 1.3 * hash(i, 77, 3)
      glow(ctx, k, x + 0.2, y + 0.28, 1.7 + 1.6 * h, 0.4 + 0.3 * h, mix(VALLEY.ridgeFar, VALLEY.cloudShade, 0.5), 0.35 * d.sun * close, 0.35)
    }
    ctx.globalCompositeOperation = 'screen'
    for (let i = Math.floor((f.x0 - 4 - drift) / step); i <= Math.ceil((f.x1 + 4 - drift) / step); i++) {
      const h = hash(i, 77, 1)
      if (h < 0.25) continue
      const x = i * step + drift + (hash(i, 77, 2) - 0.5) * step
      const y = MEADOW - 1.7 - 1.3 * hash(i, 77, 3)
      glow(ctx, k, x, y, 1.6 + 1.6 * h, 0.42 + 0.3 * h, VALLEY.floodlight, 0.7 * d.sun * close * (0.5 + 0.5 * h), 0.35)
    }
  }
  ctx.restore()
}

/**
 * Seen close, the shafts are far off behind them: broad soft bands slanting down from the tear through the haze over
 * the valley's end, drawn before the trees so they stand in front of the light.
 */
export function drawFarShafts(ctx: Ctx, k: number, f: View, t: number): void {
  const d = daylight(t)
  const close = clamp01((34 - (f.y1 - f.y0)) / 20)
  if (d.sun <= 0.002 || close <= 0.01) return
  const [gx, gy] = SUN_GAP
  const cx = (f.x0 + f.x1) / 2
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

/** The light on the valley floor, seen from away: along the meadow, the camp and the grass, as far as it has reached. */
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
    glow(ctx, k, x, MEADOW - 0.8, 4.4, 2.2, VALLEY.floodlight, 0.22 * s * far, 0.4)
    glow(ctx, k, x, MEADOW + 5, 5.5, 5.5, VALLEY.lamp, 0.1 * s * far, 0.4)
  }
  ctx.restore()
}

/** The shafts: from the tear down through the air to where the light lies on the meadow, sweeping out with it. */
export function drawRays(ctx: Ctx, k: number, t: number, far = 1): void {
  const d = daylight(t)
  if (d.sun <= 0.002 || far <= 0.01) return
  const [gx, gy] = SUN_GAP
  const { rx, ry } = tearAt(t)
  const reach = Math.max(3, d.reach)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const rays = [
    { top: -0.62, bot: -0.95, w: 5, a: 0.55 },
    { top: -0.35, bot: -0.55, w: 4, a: 0.75 },
    { top: -0.1, bot: -0.12, w: 6.5, a: 1 },
    { top: 0.14, bot: 0.3, w: 4.5, a: 0.85 },
    { top: 0.36, bot: 0.62, w: 5.5, a: 0.75 },
    { top: 0.58, bot: 0.94, w: 4, a: 0.55 },
  ]
  for (let i = 0; i < rays.length; i++) {
    const r = rays[i]
    const sway = 0.6 * Math.sin(t * 0.33 + i * 1.7)
    const xa = gx + r.top * rx
    const xb = gx + r.bot * reach + sway
    const ya = gy + ry * 0.5
    const yb = MEADOW + 1
    const shimmer = 0.9 + 0.1 * Math.sin(t * 0.8 + i * 2.1)
    const a = r.a * d.sun * shimmer * far
    for (const [wide, share] of [[1, 0.3], [0.6, 0.35], [0.28, 0.35]] as [number, number][]) {
      const w0 = r.w * 0.3 * wide
      const w1 = r.w * wide * (0.7 + 0.5 * clamp01(reach / 30))
      const g = ctx.createLinearGradient(0, ya * k, 0, yb * k)
      g.addColorStop(0, rgba(VALLEY.floodlight, 0.95 * a * share))
      g.addColorStop(0.5, rgba(VALLEY.floodlight, 0.55 * a * share))
      g.addColorStop(1, rgba(VALLEY.lamp, 0.3 * a * share))
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

/** In the sun, a soft shadow under each of them on the grass, thrown a little away from the tear. */
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
    g.addColorStop(0, rgba(VALLEY.oliveDark, 0.55 * s * (1 - lift)))
    g.addColorStop(1, rgba(VALLEY.oliveDark, 0))
    ctx.fillStyle = g
    ctx.fillRect(-0.2 * k, -0.2 * k, 0.4 * k, 0.4 * k)
    ctx.restore()
  }
}

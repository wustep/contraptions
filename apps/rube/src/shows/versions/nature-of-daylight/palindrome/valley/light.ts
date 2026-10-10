import type { Pt } from '../../../../../parts'
import { mix, rgba } from '../cast'
import { hash, smooth } from '../kit'
import { SHELL, VALLEY } from '../worlds'
import { daylight, G, MEADOW, SHELL_X, SUN_BREAK } from './geo'
import { herGoing, ianGoing } from './paths'

/**
 * The daylight (the VALLEY builder's): the cue's title, and the release of the whole film. It is not the shell's: where
 * the shell went, the cloud only thins. Off to one side, low along the valley's left wall, the cloud breaks, the ridge
 * standing dark against the bright gap; the sun comes in low through it and rakes across the valley, its long shafts
 * slanting through the air, and the light sweeps along the floor from the left as the cloud's shadow races off,
 * reaching her on the chord and Ian after. In the sun the grass goes warm gold-green and catches the light at its
 * tips; out of it the valley lies in the cloud's shade, so the lit floor reads as light. Only the valley's palette:
 * its floodlight cream-white and its lamp's pale gold, never her gold.
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

/** How lit the valley floor is at `x` (0 in the cloud's shade, 1 in the sun): left of the light's sweeping edge. */
export function sunAt(t: number, x: number): number {
  const d = daylight(t)
  if (d.sun <= 0) return 0
  // A cloud's shadow has a broad soft edge on the ground, never a line: wide from the start, wider as it races off.
  const soft = 9 + 0.12 * Math.max(0, d.edge - SUN_BREAK[0])
  return d.sun * clamp01((d.edge - x) / soft + 0.5)
}

/** How far the cloud has broken open along the ridge: fast as it breaks, then slowly wider. */
function breakAt(t: number): { open: number; rx: number; ry: number } {
  if (t < G.sun) return { open: 0, rx: 0, ry: 0 }
  const open = 1 - Math.pow(1 - clamp01((t - G.sun) / 2.2), 2.4)
  const rx = (4 + 20 * open) * (1 + 0.35 * smooth(t, G.sun + 2.2, G.end))
  // A long low tear along the ridge, never a round hole: a saucer is what a round bright hole over beams reads as.
  return { open, rx: rx * 1.3, ry: rx * 0.2 }
}

/**
 * The sky in the break, drawn behind the land: bright and low, so the ridge stands dark against it. Before it breaks,
 * the cloud there brightens a little: the eye has somewhere to go.
 */
export function drawBreakSky(ctx: Ctx, k: number, t: number): void {
  const d = daylight(t)
  const [bx, by] = SUN_BREAK
  const { open, rx, ry } = breakAt(t)
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  glow(ctx, k, bx, by + 2, 26, 9, VALLEY.cloud, 0.35 * d.glow * (1 - open), 0.3)
  if (open > 0.001) {
    glow(ctx, k, bx, by, rx * 1.8, ry * 1.9, VALLEY.lamp, 0.85 * open, 0.35)
    glow(ctx, k, bx, by - ry * 0.1, rx * 1.1, ry * 1.1, SHELL.screen, 1, 0.6)
  }
  ctx.restore()
}

/**
 * The break, over the cloud's veil: its light shining through the veil, and the cloud's torn lower edge over it, heavy
 * and dark, lit underneath by the sun coming in beneath it. And where the shell went, the cloud thinning to sky.
 */
export function drawBreak(ctx: Ctx, k: number, t: number): void {
  const d = daylight(t)
  const [bx, by] = SUN_BREAK
  const { open, rx, ry } = breakAt(t)
  if (open <= 0.001 && d.glow <= 0.001) return
  ctx.save()
  // The ridge's cloud brightening before it breaks.
  ctx.globalCompositeOperation = 'screen'
  glow(ctx, k, bx, by + 1, 22, 6, VALLEY.lamp, 0.22 * d.glow * (1 - open), 0.3)
  if (open > 0.001) {
    // The light through the veil.
    // Bleeding out into the cloud round it, brightest low along the tear and with no rim of its own.
    glow(ctx, k, bx + rx * 0.2, by + ry * 0.6, rx * 2.2, ry * 3.2, VALLEY.lamp, 0.22 * open, 0.1)
    glow(ctx, k, bx, by, rx * 1.3, ry * 1.6, VALLEY.floodlight, 0.6 * open, 0.15)
    glow(ctx, k, bx, by + ry * 0.2, rx * 0.7, ry * 0.7, SHELL.screen, 0.55 * open, 0.2)
    // The cloud's torn edge above the break: heavy billows, dark, their undersides lit from below by the low sun.
    const heavy = mix(VALLEY.cloudShade, VALLEY.steelDark, 0.45)
    // The deck's underside over it, darkening broadly toward the edge, so the edge is the cloud's and not one dark
    // streak hung alone in a pale sky.
    ctx.globalCompositeOperation = 'source-over'
    glow(ctx, k, bx + rx * 0.2, by - ry * 2.4, rx * 3.6, ry * 3.4, heavy, 0.5 * open, 0.3)
    const n = 14
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const x = bx + (u - 0.5) * 2.6 * rx * (1.05 + 0.1 * hash(i, 58, 1))
      // A ragged edge, a little higher over the middle of the tear, not a dome.
      const arch = 1 - (2 * u - 1) ** 2
      const y = by - ry * (0.7 + 0.25 * arch + 0.6 * (hash(i, 58, 3) - 0.5)) - 1.2
      const brx = rx * (0.2 + 0.1 * hash(i, 58, 2)) + 2.2
      const bry = ry * 0.5 + 1.8
      ctx.globalCompositeOperation = 'source-over'
      glow(ctx, k, x, y, brx, bry, heavy, 0.5 * open, 0.4)
      ctx.globalCompositeOperation = 'screen'
      glow(ctx, k, x + brx * 0.1, y + bry * 0.55, brx * 0.8, bry * 0.35, VALLEY.floodlight, 0.7 * open, 0.35)
    }
  }
  // Where the shell went: the cloud only thinning, a paleness spreading, no light of its own.
  if (d.sun > 0.01) {
    ctx.globalCompositeOperation = 'screen'
    glow(ctx, k, SHELL_X, -60, 30 + 8 * d.sun, 11, mix(VALLEY.cloud, VALLEY.sky, 0.4), 0.18 * d.sun * smooth(t, G.sun, G.sun + 5), 0.08)
  }
  ctx.restore()
}

/** The low sun in the valley's air: the haze lit from the break, strongest toward it, reaching across the valley. */
export function drawAir(ctx: Ctx, k: number, t: number, far = 1): void {
  const d = daylight(t)
  if (d.sun <= 0.002 || far <= 0.01) return
  const [bx, by] = SUN_BREAK
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  glow(ctx, k, bx + 8, by + 12, 34, 16, VALLEY.lamp, 0.16 * d.sun * far, 0.2)
  // The slopes the light reaches, warmed, the warmth following the sweep along the valley, soft all round.
  const mid = (Math.max(bx, Math.min(d.edge, 80)) + bx) / 2
  glow(ctx, k, mid + 6, -12, Math.max(20, (d.edge - bx) * 0.6), 13, VALLEY.lamp, 0.12 * d.sun * far, 0.35)
  ctx.restore()
}

/**
 * Seen from away, once the sun is in: the side of the valley away from the break falls into the cloud's shade, a
 * broad falloff across it (never an edge), over the slopes and the far range below the cloud; the side toward it
 * warmed. Drawn after the land, before the camp.
 */
export function drawValleyShade(ctx: Ctx, k: number, f: View, t: number): void {
  const d = daylight(t)
  const far = clamp01((f.y1 - f.y0 - 12) / 30)
  if (d.sun <= 0.002 || far <= 0.01) return
  const [bx] = SUN_BREAK
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const top = Math.max(f.y0 - 1, -62)
  const bottom = MEADOW + 0.2
  if (bottom <= top) return
  const g = across(ctx, k, x0, x1, mix(VALLEY.ridge, VALLEY.steelDark, 0.3), (x) => 0.42 * d.sun * far * smooth(x, bx + 25, bx + 110))
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = g
  // Fading in from the cloud down, in slices: no edge along its top. On whole pixels, each meeting the next exactly:
  // overlapped, every seam was a strip shaded twice, a line.
  const band = 18
  const n = 18
  const px = (y: number) => Math.round(y * k)
  for (let i = 0; i < n; i++) {
    const ya = px(top + (band * i) / n)
    const yb = px(top + (band * (i + 1)) / n)
    if (yb <= ya) continue
    ctx.globalAlpha = (i + 0.5) / n
    ctx.fillRect(x0 * k, ya, (x1 - x0) * k, yb - ya)
  }
  ctx.globalAlpha = 1
  const below = px(top + band)
  ctx.fillRect(x0 * k, below, (x1 - x0) * k, Math.max(0, bottom * k - below))
  ctx.restore()
}

/** A horizontal gradient across the frame, `a(x)` of `color`. */
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
 * The sun on the land, as far as it has swept, and the shade beyond it. In the light: warmed and lifted, the greens
 * gone gold-green and bright. Out of it: the cloud's shade, darker and cooler than the grey morning was, so the lit
 * floor reads as light and its edge as it sweeps.
 */
export function drawSunWash(ctx: Ctx, k: number, f: View, t: number): void {
  const d = daylight(t)
  if (d.sun <= 0.002) return
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const far = clamp01((f.y1 - f.y0 - 12) / 30)
  // On the valley floor and what stands on it; seen from away, fading in up the foot of the slopes.
  const top = Math.max(f.y0 - 1, MEADOW - 0.05 - 7 * far)
  const h = Math.max(f.y1, top) + 1 - top
  // The shadow's edge on the floor slants with depth, as it would lying on ground going away from us: nearer, it has
  // come less far. Seen from a tall frame (a phone's), a straight edge stood up the near meadow as a band.
  const SKEW = 1.4
  const lit = (x: number, y = MEADOW) => sunAt(t, x + SKEW * Math.max(0, y - MEADOW))
  ctx.save()
  // Each pass in slices whose strength rises over the first cells from its top, so it has no edge; below the far
  // line, in slices down the near floor, each with the edge where it lies at its depth.
  const band = far > 0.01 ? 6 * far : 0
  // On whole pixels, each slice meeting the next exactly: under these blends an overlap or a gap is a line.
  const px = (y: number) => Math.round(y * k)
  const pass = (op: GlobalCompositeOperation, color: string, F: (l: number) => number) => {
    ctx.globalCompositeOperation = op
    const n = band > 0 ? 24 : 0
    ctx.fillStyle = across(ctx, k, x0, x1, color, (x) => F(lit(x)))
    // The fade in at its top too: overlapped, its seams striped the treeline in a tall frame.
    for (let i = 0; i < n; i++) {
      const ya = px(top + (band * i) / n)
      const yb = px(top + (band * (i + 1)) / n)
      if (yb <= ya) continue
      ctx.globalAlpha = (i + 0.5) / n
      ctx.fillRect(x0 * k, ya, (x1 - x0) * k, yb - ya)
    }
    ctx.globalAlpha = 1
    const from = top + band
    const to = top + h
    const upper = Math.min(to, Math.max(from, MEADOW))
    if (upper > from) ctx.fillRect(x0 * k, px(from), (x1 - x0) * k, px(upper) - px(from))
    // Below it the light depends on x + SKEW·depth alone, so one gradient laid along that slant draws the edge
    // exactly: no slices (forty stood a tall frame's near meadow in steps; two hundred cost the daylight a fifth).
    if (to > upper) {
      const xa = x0 + SKEW * Math.max(0, upper - MEADOW)
      const xb = x1 + SKEW * Math.max(0, to - MEADOW)
      const lam = (xb - xa) / (1 + SKEW * SKEW)
      const g = ctx.createLinearGradient(xa * k, MEADOW * k, (xa + lam) * k, (MEADOW + SKEW * lam) * k)
      const stops = 48
      for (let i = 0; i <= stops; i++) {
        const xs = xa + ((xb - xa) * i) / stops
        g.addColorStop(i / stops, rgba(color, clamp01(F(sunAt(t, xs)))))
      }
      ctx.fillStyle = g
      ctx.fillRect(x0 * k, px(upper), (x1 - x0) * k, px(to) - px(upper))
    }
  }
  pass('soft-light', mix(VALLEY.lamp, VALLEY.grass, 0.4), (l) => 0.85 * l)
  pass('screen', VALLEY.floodlight, (l) => 0.13 * l)
  pass('multiply', mix(VALLEY.ridge, VALLEY.cloudShade, 0.35), (l) => 0.55 * d.sun * (1 - l / Math.max(0.001, d.sun)))
  const close = clamp01((24 - (f.y1 - f.y0)) / 14)
  if (close > 0.01) {
    // Close, the floor toward us a little deeper at the frame's foot.
    ctx.globalCompositeOperation = 'source-over'
    const sh = ctx.createLinearGradient(0, (MEADOW + 0.15) * k, 0, f.y1 * k)
    sh.addColorStop(0, rgba(VALLEY.meadowDark, 0))
    sh.addColorStop(1, rgba(VALLEY.meadowDark, 0.28 * d.sun * close))
    ctx.fillStyle = sh
    ctx.fillRect(x0 * k, (MEADOW + 0.15) * k, (x1 - x0) * k, Math.max(0, f.y1 - MEADOW) * k)
    // The grass along the far line lit through from the side: a soft fringe of light at its top, where the sun is.
    ctx.globalCompositeOperation = 'screen'
    const step = Math.max(0.25, (f.x1 - f.x0) / 40)
    for (let x = Math.floor(f.x0 / step) * step; x <= f.x1 + step; x += step) {
      const s = lit(x) * close
      if (s > 0.01) glow(ctx, k, x, MEADOW - 0.03, step * 1.6, 0.13, VALLEY.floodlight, 0.2 * s, 0.4)
    }
    // The sky toward the sun, up to their left.
    glow(ctx, k, f.x0, f.y0 + (f.y1 - f.y0) * 0.15, (f.x1 - f.x0) * 0.75, (f.y1 - f.y0) * 0.6, VALLEY.lamp, 0.45 * d.sun * close, 0.1)
  }
  ctx.restore()
}

/**
 * The haze behind them lit: the low sun's light in the air over the valley's far end, brightest toward the horizon,
 * so what stands on the meadow stands against the light; seen close, the mist banks over the far trees shining. Drawn
 * before the trees.
 */
export function drawHaze(ctx: Ctx, k: number, f: View, t: number): void {
  const d = daylight(t)
  if (d.sun <= 0.002) return
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
  if (near > 0.01) {
    const drift = t * 0.12
    const step = 2.6
    const banks: [number, number, number][] = []
    for (let i = Math.floor((f.x0 - 4 - drift) / step); i <= Math.ceil((f.x1 + 4 - drift) / step); i++) {
      const h = hash(i, 77, 1)
      if (h < 0.25) continue
      banks.push([i * step + drift + (hash(i, 77, 2) - 0.5) * step, MEADOW - 1.7 - 1.3 * hash(i, 77, 3), h])
    }
    // Their shaded undersides first, so each bank has a form; then their lit bodies, lit from the left.
    ctx.globalCompositeOperation = 'source-over'
    for (const [x, y, h] of banks) glow(ctx, k, x + 0.25, y + 0.28, 1.7 + 1.6 * h, 0.4 + 0.3 * h, mix(VALLEY.ridgeFar, VALLEY.cloudShade, 0.5), 0.35 * d.sun * near, 0.35)
    ctx.globalCompositeOperation = 'screen'
    for (const [x, y, h] of banks) glow(ctx, k, x - 0.15, y, 1.6 + 1.6 * h, 0.42 + 0.3 * h, VALLEY.floodlight, 0.7 * d.sun * near * (0.5 + 0.5 * h), 0.35)
  }
  ctx.restore()
}

/**
 * Seen close, the low sun's shafts are far off behind them: broad soft bands raking down from the left through the haze
 * over the valley's end, drawn before the trees so they stand in front of the light.
 */
export function drawFarShafts(ctx: Ctx, k: number, f: View, t: number): void {
  const d = daylight(t)
  const close = clamp01((34 - (f.y1 - f.y0)) / 20)
  if (d.sun <= 0.002 || close <= 0.01) return
  const [bx, by] = SUN_BREAK
  const cx = (f.x0 + f.x1) / 2
  const dx = Math.min(1.8, (cx - bx) / (MEADOW - by))
  const tall = f.y1 - f.y0
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  for (let i = -5; i <= 5; i++) {
    const h = hash(i + 40, 67, 1)
    if (h < 0.3) continue
    const x = cx + i * tall * 0.34 + (hash(i + 40, 67, 2) - 0.5) * tall * 0.2 + 0.3 * Math.sin(t * 0.25 + i)
    const w = tall * (0.05 + 0.1 * hash(i + 40, 67, 3))
    const y0 = f.y0 - 1
    const y1 = MEADOW
    const a = 0.26 * d.sun * close * (0.5 + 0.5 * h) * (0.85 + 0.15 * Math.sin(t * 0.7 + i * 1.3)) * sunAt(t, x)
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

/** The light on the valley floor, seen from away: along the meadow, the camp and the grass, as far as it has swept. */
export function drawSunlight(ctx: Ctx, k: number, t: number, x0: number, x1: number, far = 1): void {
  const d = daylight(t)
  if (d.sun <= 0.002 || far <= 0.01) return
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const step = 3
  for (let x = Math.floor(x0 / step) * step; x <= Math.min(x1, d.edge + 8); x += step) {
    const s = sunAt(t, x)
    if (s <= 0.01) continue
    glow(ctx, k, x, MEADOW - 0.8, 4.4, 2.2, VALLEY.floodlight, 0.22 * s * far, 0.4)
    glow(ctx, k, x, MEADOW + 5, 5.5, 5.5, VALLEY.lamp, 0.1 * s * far, 0.4)
  }
  ctx.restore()
}

/**
 * The low sun's shafts: long and slanting, from the break across the valley's air down to where the light lies on the
 * floor, fanning out as it sweeps along. Never down from where the shell was.
 */
export function drawRays(ctx: Ctx, k: number, t: number, far = 1): void {
  const d = daylight(t)
  if (d.sun <= 0.002 || far <= 0.01) return
  const [bx, by] = SUN_BREAK
  const { rx, ry } = breakAt(t)
  const reach = Math.max(bx + 30, d.edge)
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  const rays = [
    { from: -0.45, to: 0.08, w: 3.2, a: 0.75, dy: 0.5 },
    { from: -0.12, to: 0.33, w: 4.6, a: 1, dy: 2.6 },
    { from: 0.12, to: 0.5, w: 2.4, a: 0.8, dy: 1.1 },
    { from: 0.42, to: 0.78, w: 4, a: 0.85, dy: 3.8 },
    { from: 0.7, to: 0.96, w: 2.8, a: 0.6, dy: 1.8 },
  ]
  for (let i = 0; i < rays.length; i++) {
    const r = rays[i]
    const sway = 0.5 * Math.sin(t * 0.3 + i * 1.7)
    // From all along the tear, so the shafts fan out of the cloud's edge rather than falling from one bright spot.
    const xa = bx + (r.from - 0.25) * rx * 1.7
    const ya = by + ry * 0.25 + 1 + r.dy
    // Landing along the floor between the ridge's foot and the light's edge.
    const xb = bx + 22 + (reach - bx - 22) * r.to + sway
    const yb = MEADOW + 0.5
    const shimmer = 0.9 + 0.1 * Math.sin(t * 0.8 + i * 2.1)
    const a = r.a * d.sun * shimmer * far
    const len = Math.hypot(xb - xa, yb - ya) || 1
    const nx = -(yb - ya) / len
    const ny = (xb - xa) / len
    // Feathered: many widths laid over each other, faint at the widest.
    const n = 6
    for (let j = 0; j < n; j++) {
      const wide = 1 - j / n
      const w0 = r.w * 0.35 * wide
      const w1 = r.w * wide
      const share = 1 / n
      const g = ctx.createLinearGradient(xa * k, ya * k, xb * k, yb * k)
      // Out of the break's own glow, so a shaft has no end up there: it comes on over its first stretch.
      g.addColorStop(0, rgba(VALLEY.floodlight, 0))
      g.addColorStop(0.18, rgba(VALLEY.floodlight, 0.85 * a * share))
      g.addColorStop(0.55, rgba(VALLEY.floodlight, 0.5 * a * share))
      // And gone by its foot, into the light on the floor: cut off square at its full strength, the nested widths'
      // ends stepped down the meadow, a staircase in a tall frame.
      g.addColorStop(0.86, rgba(VALLEY.lamp, 0.26 * a * share))
      g.addColorStop(1, rgba(VALLEY.lamp, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo((xa + nx * w0) * k, (ya + ny * w0) * k)
      ctx.lineTo((xb + nx * w1) * k, (yb + ny * w1) * k)
      ctx.lineTo((xb - nx * w1) * k, (yb - ny * w1) * k)
      ctx.lineTo((xa - nx * w0) * k, (ya - ny * w0) * k)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

/** In the sun, a soft shadow under each of them on the grass, thrown to the right, away from the low sun. */
export function drawShadows(ctx: Ctx, k: number, t: number): void {
  const d = daylight(t)
  if (d.sun <= 0.002 || t < G.gone || t > G.end + 0.1) return
  const balls: Pt[] = [herGoing(t), ianGoing(t)]
  for (const [x, y] of balls) {
    const s = sunAt(t, x)
    if (s <= 0.01) continue
    const lift = Math.max(0, -y)
    ctx.save()
    ctx.translate((x + 0.16) * k, (MEADOW + 0.015) * k)
    ctx.scale(1, 0.24)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.26 * k)
    g.addColorStop(0, rgba(VALLEY.oliveDark, 0.55 * s * (1 - lift)))
    g.addColorStop(1, rgba(VALLEY.oliveDark, 0))
    ctx.fillStyle = g
    ctx.fillRect(-0.26 * k, -0.26 * k, 0.52 * k, 0.52 * k)
    ctx.restore()
  }
}

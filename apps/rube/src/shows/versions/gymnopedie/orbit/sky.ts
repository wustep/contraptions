import type p5 from 'p5'
import { mixHex, type PieceCtx } from '../../../../parts'
import { wrap } from './music'
import { RADIUS, along, ballLocal } from './path'
import {
  BANK, BANKS, CLOUDS, FLOCKS, GULLS, HEAPS, auroraAt, auroraSheet, auroraSize, bowAt, cloudLight, cloudThere, drawCloud, overcastAt, drawGull, inLayer, layered, meteorAt, milkyWay, wingsAt, type CloudLight,
  FIGURES, figureAt, BOATS, SAILS, boatsOut, drawBoat, lanternAt,
} from './air'
import { alpha, hash, osc, polar, smooth, type Sky } from './world'
import {
  scenery, type Ctx2D, type View, viewOf, frameOf, onCanvas, atSea, weathered, sunAngle, moonAngle, type Body, bodies, sunWay, moonWay, AURORA_OVER, SUN_FAR, MOON_FAR,
} from './frame'

/**
 * The sky: the day's gradient, the stars and the Milky Way, the aurora, shooting stars, the sun and the moon on
 * their arcs and, far off, in space; the rays of the low sun, the bow, and the clouds and gulls (`air.ts`).
 */

// ---------------------------------------------------------------- the sky

export const sky = scenery<null>('sky', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const v = viewOf(p, c)
  const day = weathered(c.t)
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const F = frameOf(ctx)
  // The horizon on the canvas: the sea under the frame's middle.
  const u = along(c.t)
  const [, hy] = onCanvas(ctx, c.k, ...polar(u + 0.55, 0))
  // Where they are is worked out in the world's own transform, before the sky is painted square to the canvas.
  const [sun, moon] = bodies(ctx, c, v, day)
  const m = ctx.getTransform()
  const roll = Math.atan2(m.b, m.a)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  // Space: the dark the planet hangs in, once it is small in the frame.
  const space = '#05070F'
  const top = mixHex(day.top, space, v.wide)
  const low = mixHex(day.low, '#0A0E1E', v.wide)
  const g = ctx.createLinearGradient(0, 0, 0, Math.max(hy, H * 0.3))
  g.addColorStop(0, top)
  g.addColorStop(1, low)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Stars: fixed to the sky, which turns with the planet (twice a period, as the sun and the moon do).
  const starLight = Math.max(day.night, v.wide) * 0.95
  if (starLight > 0.02) {
    // The Milky Way behind them, across the sky.
    const D = Math.hypot(W, H) * 1.6
    ctx.save()
    // Only over the sea: under its lowest point in the frame is water, or the planet.
    if (v.wide < 0.01) {
      let low = 0
      for (let i = 0; i <= 12; i++) low = Math.max(low, onCanvas(ctx, c.k, ...polar(v.u0 + ((v.u1 - v.u0) * i) / 12, -0.3), m)[1])
      ctx.beginPath()
      ctx.rect(0, 0, W, Math.min(H, low))
      ctx.clip()
    }
    ctx.translate(W / 2, H / 2)
    ctx.rotate(roll * 2 + 0.55)
    // Washed out while the aurora is up: one band of light in the sky at a time.
    ctx.globalAlpha = starLight * 0.62 * (1 - 0.65 * auroraAt(c.t))
    ctx.drawImage(milkyWay(), -D / 2, -D / 2, D, D)
    ctx.restore()
  }
  if (starLight > 0.02) {
    const R0 = Math.hypot(W, H) * 0.75
    const turn = roll * 2
    for (let i = 0; i < 420; i++) {
      const a = hash(i, 1) * Math.PI * 2 + turn
      const r = Math.sqrt(hash(i, 2)) * R0
      const x = W / 2 + Math.cos(a) * r
      const y = H / 2 + Math.sin(a) * r
      if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue
      // Stars only in the sky: over the horizon, fading into its haze.
      const over = v.wide > 0.5 ? 1 : smooth(hy - y, 0, F * 0.25)
      const tw = 0.7 + 0.3 * osc(c.t, 0.13 + hash(i, 3) * 0.3, i)
      const a2 = starLight * over * tw * (0.25 + 0.75 * hash(i, 4))
      if (a2 < 0.02) continue
      ctx.fillStyle = `rgba(244, 238, 223, ${a2.toFixed(3)})`
      // Their size as at a 1280 frame, larger past 1600, and smaller below 1280 so a small sky is not coarse.
      const s = (0.6 + hash(i, 5) * 1.3) * Math.max(W / 1600, Math.min(1, W / 1280))
      ctx.beginPath()
      ctx.arc(x, y, s, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // The aurora, over the first Gnossienne's night, among the stars.
  const northern = auroraAt(c.t) * (1 - v.wide)
  if (northern > 0.01) {
    const sheet = auroraSheet(c.t, ...auroraSize(W, F), along(c.t))
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, 0.62 * northern)
    ctx.drawImage(sheet, 0, hy - AURORA_OVER * F, W, F)
    ctx.restore()
  }

  // The inner voice's constellations: a star for each of its notes as it sounds, a faint line drawn to it from the last.
  const starry = smooth(day.night, 0.6, 0.9) * (1 - v.wide)
  if (starry > 0.01) {
    const fw = Math.min(W, (F * 16) / 9)
    for (const f of FIGURES) {
      const stars = figureAt(f, c.t)
      if (!stars?.length) continue
      // Clear of the moon: a figure that would be drawn over it, or in its light, is drawn on the other side.
      // Its stars' steps, and so how wide it is: it is kept wholly in the frame.
      const steps = f.notes.map((_, i) => (i ? F * (0.07 + 0.03 * hash(i, f.from, 224)) : 0))
      const offsets = steps.map((_, i) => steps.slice(0, i + 1).reduce((a, b) => a + b, 0))
      const span = offsets[offsets.length - 1]
      let left = (W - fw) / 2 + f.x * fw
      // Decided once for the figure, from where the moon is through it, so a figure never jumps sides as it is drawn.
      const [mx0] = onCanvas(ctx, c.k, ...polar(along(c.t) + 0.55, 0), m)
      const moonX = (t: number) => mx0 + Math.sin(moonAngle(t)) * F * 0.62 * 1.25
      const moonOver = [f.from, (f.from + f.to) / 2, f.to + 5].some((t) => Math.abs(moonAngle(t)) < 1.9 && Math.abs(left + span / 2 - moonX(t)) < F * 0.4)
      if (moonOver) left = (W - fw) / 2 + (1 - f.x) * fw - span
      left = Math.max((W - fw) / 2 + F * 0.04, Math.min((W + fw) / 2 - span - F * 0.04, left))
      const rise = (i: number) => (f.notes[i].p - f.low) * F * 0.016 + f.lean * i * F * 0.012
      // And its highest star kept a little under the top of the picture: a figure that climbs far is hung lower.
      let base = hy - F * f.y
      const highest = Math.max(...f.notes.map((_, i) => rise(i)))
      base = Math.max(base, (H - F) / 2 + F * 0.07 + highest)
      const at = (i: number): [number, number] => [left + offsets[i], base - rise(i)]
      ctx.lineCap = 'round'
      // A pixel at the least, fainter where that is more than its share of a small frame.
      ctx.lineWidth = Math.max(1, F / 900)
      const thin = Math.min(1, F / 900 / 0.8)
      for (const s of stars) {
        if (s.i === 0 || s.line < 0.01) continue
        const [x0, y0] = at(s.i - 1)
        const [x1, y1] = at(s.i)
        ctx.strokeStyle = `rgba(214, 226, 255, ${(0.2 * starry * s.line * thin).toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x0 + (x1 - x0) * s.line, y0 + (y1 - y0) * s.line)
        ctx.stroke()
      }
      for (const s of stars) {
        const [x, y] = at(s.i)
        const a = starry * s.light
        const r = F * (0.008 + 0.01 * s.light)
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r)
        glow.addColorStop(0, `rgba(236, 242, 255, ${(0.55 * a).toFixed(3)})`)
        glow.addColorStop(1, 'rgba(236, 242, 255, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
        ctx.fillStyle = `rgba(248, 250, 255, ${Math.min(1, 1.2 * a).toFixed(3)})`
        ctx.beginPath()
        ctx.arc(x, y, Math.max(1.2, F / 420), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // A shooting star, on a high phrase's top note.
  const fall = meteorAt(c.t)
  if (fall && day.night > 0.3 && v.wide < 0.5) {
    const i = fall.i
    // High in the sky, falling slant and short, clear of the stones.
    const L = W * 0.26
    const dir = hash(i, 133) > 0.5 ? 1 : -1
    const a = 0.22 + 0.2 * hash(i, 134)
    const sx = W * (dir > 0 ? 0.1 + 0.45 * hash(i, 131) : 0.45 + 0.45 * hash(i, 131))
    const sy = hy - AURORA_OVER * F + F * (0.05 + 0.1 * hash(i, 132))
    const q = 1 - (1 - fall.q) ** 2
    const hx = sx + dir * Math.cos(a) * L * q
    const hy2 = sy + Math.sin(a) * L * q
    const tail = L * 0.32 * Math.min(1, q * 2.5)
    const tx = hx - dir * Math.cos(a) * tail
    const ty = hy2 - Math.sin(a) * tail
    const light = fall.light * smooth(day.night, 0.3, 0.7) * smooth(hy - hy2, 0, F * 0.12) * Math.min(1, F / 330 / 1.5)
    const streak = ctx.createLinearGradient(tx, ty, hx, hy2)
    streak.addColorStop(0, 'rgba(255, 246, 228, 0)')
    streak.addColorStop(1, `rgba(255, 246, 228, ${light.toFixed(3)})`)
    ctx.strokeStyle = streak
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1.5, F / 330)
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(hx, hy2)
    ctx.stroke()
    ctx.fillStyle = `rgba(255, 250, 238, ${light.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(hx, hy2, Math.max(1.5, F / 300), 0, Math.PI * 2)
    ctx.fill()
  }

  // The sun and the moon, on arcs over the horizon; gone when the planet is small (they are its sky, not space's).
  const body = ({ x: bx, y: by, light }: Body, radius: number, core: string, glow: string) => {
    if (light <= 0.01) return
    const glowR = radius * 7
    const halo = ctx.createRadialGradient(bx, by, radius * 0.6, bx, by, glowR)
    halo.addColorStop(0, glow.replace('A', (0.55 * light).toFixed(3)))
    halo.addColorStop(1, glow.replace('A', '0'))
    ctx.fillStyle = halo
    ctx.fillRect(bx - glowR, by - glowR, glowR * 2, glowR * 2)
    ctx.globalAlpha = light
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(bx, by, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  body(sun, sun.r, '#FFF1D6', 'rgba(255, 214, 160, A)')
  body(moon, moon.r, '#F2EEE2', 'rgba(200, 214, 240, A)')
  ctx.restore()

  // The clouds and the gulls, close: once the planet draws away they are too small to be anything.
  const near = 1 - smooth(v.wide, 0, 0.3)
  if (near > 0.01) air(p, c, v, day, sun, moon, near)

  // Far off, the sun and the moon in space, where they are from the planet.
  const afar = smooth(v.wide, 0.3, 0.55)
  if (afar > 0.01) inSpace(p, c, afar)

  // Rays from the low sun, at dawn and through the afternoon into the sunset; not under the shower's cloud, so they
  // come as it clears.
  const rays = raysAt(c.t) * near
  if (rays > 0.01 && sun.light > 0.01) sunRays(ctx, c, v, sun, rays)

  // The bow, opposite the sun, as the shower clears.
  // Close: drawn back over the planet the bow would only be a stripe across the sky.
  const bow = bowAt(c.t) * near * (1 - smooth(v.cells, 9, 17))
  if (bow > 0.01) rainbow(ctx, c, v, sun, bow, hy)

  // Wide: the air round the planet, lit the colour of its day.
  if (v.wide > 0.01) {
    const k = c.k
    const air = ctx.createRadialGradient(0, 0, RADIUS * k * 0.98, 0, 0, RADIUS * k * 1.16)
    air.addColorStop(0, alpha(p, day.low, 0.75 * v.wide).toString())
    air.addColorStop(1, alpha(p, day.low, 0).toString())
    ctx.fillStyle = air
    ctx.beginPath()
    ctx.arc(0, 0, RADIUS * k * 1.16, 0, Math.PI * 2)
    ctx.fill()
  }
})

/**
 * The sun and the moon as the planet's neighbours in space, seen once it is small in the frame: the sun a small white
 * disc with its glare, the moon a little world lit on the side towards the sun.
 */
function inSpace(p: p5, c: PieceCtx, light: number): void {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const sun = sunWay(c.t)
  const sx = Math.sin(sun) * RADIUS * SUN_FAR * k
  const sy = -Math.cos(sun) * RADIUS * SUN_FAR * k
  const glare = ctx.createRadialGradient(sx, sy, 0, sx, sy, RADIUS * 0.9 * k)
  glare.addColorStop(0, `rgba(255, 240, 214, ${(0.7 * light).toFixed(3)})`)
  glare.addColorStop(0.06, `rgba(255, 220, 178, ${(0.32 * light).toFixed(3)})`)
  glare.addColorStop(0.3, `rgba(255, 206, 160, ${(0.08 * light).toFixed(3)})`)
  glare.addColorStop(1, 'rgba(255, 206, 160, 0)')
  ctx.fillStyle = glare
  ctx.fillRect(sx - RADIUS * 0.9 * k, sy - RADIUS * 0.9 * k, RADIUS * 1.8 * k, RADIUS * 1.8 * k)
  ctx.fillStyle = `rgba(255, 250, 236, ${light.toFixed(3)})`
  ctx.beginPath()
  ctx.arc(sx, sy, RADIUS * 0.05 * k, 0, Math.PI * 2)
  ctx.fill()

  const moon = moonWay(c.t)
  const mr = RADIUS * 0.055 * k
  const mx = Math.sin(moon) * RADIUS * MOON_FAR * k
  const my = -Math.cos(moon) * RADIUS * MOON_FAR * k
  const halo = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 4)
  halo.addColorStop(0, `rgba(200, 214, 240, ${(0.16 * light).toFixed(3)})`)
  halo.addColorStop(1, 'rgba(200, 214, 240, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8)
  ctx.save()
  ctx.globalAlpha = light
  ctx.fillStyle = '#1A2034'
  ctx.beginPath()
  ctx.arc(mx, my, mr, 0, Math.PI * 2)
  ctx.fill()
  ctx.clip()
  // Its lit half, towards the sun: a disc pushed towards the sun and squeezed as the moon goes round, its phase.
  const toSun = Math.atan2(sy - my, sx - mx)
  ctx.translate(mx, my)
  ctx.rotate(toSun)
  const face = ctx.createRadialGradient(mr * 0.5, 0, 0, mr * 0.35, 0, mr * 1.1)
  face.addColorStop(0, '#F1EEE4')
  face.addColorStop(0.75, '#D9D6CC')
  face.addColorStop(1, '#A9A9A6')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.ellipse(mr * 0.35, 0, mr * 1.05, mr * 1.05, 0, 0, Math.PI * 2)
  ctx.fill()
  // Its seas, faint.
  ctx.fillStyle = 'rgba(120, 124, 136, 0.18)'
  for (const [x, y, r] of [[0.1, -0.3, 0.32], [-0.25, 0.25, 0.24], [0.35, 0.3, 0.18]]) {
    ctx.beginPath()
    ctx.arc(x * mr, y * mr, r * mr, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** How much the low sun's rays show at `t`, 0 to 1. */
export function raysAt(t: number): number {
  const a = Math.abs(sunAngle(t))
  if (wrap(t) > 230) return 0
  return smooth(a, 0.8, 1.2) * (1 - smooth(a, 1.68, 1.84)) * (1 - overcastAt(t))
}

/**
 * Crepuscular rays: soft wedges of warm light fanning from the sun across the sky, each breathing slowly, with
 * darker gaps between; behind the stones, which stand in front of them.
 */
function sunRays(ctx: Ctx2D, c: PieceCtx, v: View, sun: Body, light: number): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const m = ctx.getTransform()
  let low = 0
  for (let i = 0; i <= 12; i++) low = Math.max(low, onCanvas(ctx, c.k, ...polar(v.u0 + ((v.u1 - v.u0) * i) / 12, 0), m)[1])
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.beginPath()
  ctx.rect(0, 0, W, Math.min(H, low))
  ctx.clip()
  ctx.globalCompositeOperation = 'lighter'
  const reach = Math.hypot(W, H) * 1.1
  const glow = ctx.createRadialGradient(sun.x, sun.y, frameOf(ctx) * 0.06, sun.x, sun.y, reach)
  glow.addColorStop(0, 'rgba(255, 226, 180, 0)')
  glow.addColorStop(0.04, 'rgba(255, 226, 180, 0.4)')
  glow.addColorStop(0.18, 'rgba(255, 214, 166, 0.14)')
  glow.addColorStop(0.55, 'rgba(255, 214, 166, 0.03)')
  glow.addColorStop(1, 'rgba(255, 214, 166, 0)')
  ctx.fillStyle = glow
  const N = 16
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * (i + 0.6 * hash(i, 201))) / N + 0.05 * osc(c.t, 0.008, i)
    const half = 0.025 + 0.05 * hash(i, 202)
    const breathe = 0.5 + 0.5 * osc(c.t, 0.035 + 0.03 * hash(i, 203), i * 2.3)
    const alpha = light * (0.035 + 0.06 * breathe) * (0.5 + 0.5 * hash(i, 204))
    if (alpha < 0.004) continue
    // Feathered: three wedges, each narrower, so the ray is brightest down its middle and has no edge.
    ctx.globalAlpha = alpha
    for (const f of [1, 0.62, 0.3]) {
      ctx.beginPath()
      ctx.moveTo(sun.x, sun.y)
      ctx.arc(sun.x, sun.y, reach, a - half * f, a + half * f)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

/** The bow's colours, outside in. */
const SPECTRUM = ['236, 120, 116', '240, 170, 104', '238, 220, 128', '146, 204, 140', '120, 166, 220', '160, 132, 210']

/**
 * A rainbow round the point opposite the sun, below the horizon as far as the sun is above it: soft bands, brighter
 * sky inside, a faint second bow outside with its colours turned round, fading to nothing at its feet. It is in the
 * sky, at no distance, so it keeps its size in the frame however far the camera draws out.
 */
function rainbow(ctx: Ctx2D, c: PieceCtx, v: View, sun: Body, light: number, hy: number): void {
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const m = ctx.getTransform()
  const [hx] = onCanvas(ctx, c.k, ...polar(along(c.t) + 0.55, 0))
  const cx = 2 * hx - sun.x
  const cy = hy + (hy - sun.y)
  const F = frameOf(ctx)
  const R = F * 0.78
  let low = 0
  for (let i = 0; i <= 12; i++) low = Math.max(low, onCanvas(ctx, c.k, ...polar(v.u0 + ((v.u1 - v.u0) * i) / 12, 0), m)[1])
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.beginPath()
  ctx.rect(0, 0, W, Math.min(H, low))
  ctx.clip()
  // The sky inside the bow is lighter.
  const inner = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 0.99)
  inner.addColorStop(0, 'rgba(255, 252, 244, 0)')
  inner.addColorStop(1, `rgba(255, 252, 244, ${(0.07 * light).toFixed(3)})`)
  ctx.fillStyle = inner
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.99, 0, Math.PI * 2)
  ctx.fill()
  // Each bow is one soft ring, its colours a radial gradient across it; faded towards its feet in thin slices.
  const ring = (r: number, width: number, a: number, outIn: string[]) => {
    const g = ctx.createRadialGradient(cx, cy, r - width, cx, cy, r)
    g.addColorStop(0, `rgba(${outIn[outIn.length - 1]}, 0)`)
    outIn
      .slice()
      .reverse()
      .forEach((rgb, j) => g.addColorStop(0.12 + (0.76 * j) / (outIn.length - 1), `rgba(${rgb}, ${a.toFixed(3)})`))
    g.addColorStop(1, `rgba(${outIn[0]}, 0)`)
    return g
  }
  const bows: [number, number, number, string[]][] = [
    [R, R * 0.1, 0.17, SPECTRUM],
    [R * 1.2, R * 0.11, 0.07, [...SPECTRUM].reverse()],
  ]
  const top = Math.max(0, cy - R * 1.21)
  const SLICES = 36
  const bottom = Math.min(H, low)
  for (let i = 0; i < SLICES; i++) {
    const y0 = top + ((bottom - top) * i) / SLICES
    const y1 = top + ((bottom - top) * (i + 1)) / SLICES
    const rise = smooth(hy - (y0 + y1) / 2, 0, F * 0.32)
    if (rise < 0.01) continue
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, y0, W, y1 - y0 + 0.5)
    ctx.clip()
    ctx.globalAlpha = light * rise
    for (const [r, width, a, colours] of bows) {
      ctx.fillStyle = ring(r, width, a, colours)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.arc(cx, cy, r - width, 0, Math.PI * 2, true)
      ctx.fill()
    }
    ctx.restore()
  }
  ctx.restore()
}

/**
 * The clouds, far and near, and the gulls, in the world's frame: each at its place in its layer, standing on the
 * curve of the sea, lit from the sun or the moon in the frame.
 */
function air(p: p5, c: PieceCtx, v: View, day: Sky, sun: Body, moon: Body, near: number): void {
  const ctx = p.drawingContext as Ctx2D
  const H = ctx.canvas.height
  const k = c.k
  const u = along(c.t)
  const half = (v.u1 - v.u0) / 2
  const low = smooth(Math.abs(sunAngle(c.t)), 0.75, 1.75)
  const moonUp = smooth(1.9 - Math.abs(moonAngle(c.t)), 0, 0.5)
  const light = cloudLight(day, low, moonUp, overcastAt(c.t))
  // Lit from the sun by day and the moon by night; from overhead when neither is up.
  const src = day.night < 0.5 ? (Math.abs(sun.angle) < 1.9 ? sun : null) : Math.abs(moon.angle) < 1.9 ? moon : null
  const lightFrom = (x: number, y: number): [number, number] => {
    if (!src) return [0, 1]
    const dx = src.x - x
    const dy = y - src.y
    const n = Math.hypot(dx, dy) || 1
    // Half towards it, half from above: a cloud is lit over its top whatever the sun's side.
    const lx = (dx / n) * 0.7
    const ly = (dy / n) * 0.7 + 0.5
    const m = Math.hypot(lx, ly) || 1
    return [lx / m, ly / m]
  }
  const hazy: CloudLight = {
    lit: mixHex(light.lit, day.low, 0.5),
    shade: mixHex(light.shade, day.low, 0.55),
    under: mixHex(light.under, day.low, 0.6),
    alpha: light.alpha,
  }
  // Clear air round the ball: a cloud behind it would muddy its outline, so one that comes over it thins away.
  // Where the ball keeps to over a few seconds, not each hop, so a cloud does not breathe with the ball's steps.
  const ball = { h: [-1.5, -0.75, 0, 0.75, 1.5].reduce((a, dt) => a + ballLocal(c.t + dt).h, 0) / 5 }
  const clearOfBall = (d: number, cloud: (typeof CLOUDS)[number]) => {
    const across = Math.abs(d) - cloud.w / 2
    let top = 0
    for (const [, cy, r] of cloud.puffs) top = Math.max(top, cy + r)
    const below = cloud.h - ball.h
    const above = ball.h - (cloud.h + top)
    const apart = Math.max(across, below, above)
    return 0.12 + 0.88 * smooth(apart, -0.2, 0.6)
  }
  const layer = (clouds: typeof CLOUDS, at: typeof BANK, tint: CloudLight, a: number, cover: boolean) => {
    for (const cloud of clouds) {
      const there = cover ? cloudThere(cloud, c.t) : 1
      if (there < 0.01) continue
      const d = layered(cloud.x, c.t, at.f, at.span, at.wind)
      const edge = inLayer(d, at.span)
      if (Math.abs(d) > half + cloud.w || edge < 0.01) continue
      const [x, y] = onCanvas(ctx, k, ...polar(u + d, cloud.h + 0.4))
      // A cloud whose foot is up at the frame's top edge would show only a flat sliver of its underside.
      const [, foot] = onCanvas(ctx, k, ...polar(u + d, cloud.h))
      const shown = smooth(foot, H * 0.14, H * 0.3) * clearOfBall(d, cloud)
      if (shown < 0.01) continue
      const [lx, ly] = lightFrom(x, y)
      p.push()
      atSea(p, k, u + d)
      p.translate(0, -cloud.h * k)
      drawCloud(ctx, k, cloud, tint, lx, ly, a * there * edge * shown)
      p.pop()
    }
  }
  layer(BANKS, BANK, hazy, (0.6 - 0.4 * day.night) * near * light.alpha, false)
  layer(CLOUDS, HEAPS, light, 0.92 * near * light.alpha, true)

  // Sailboats far out on the water by day, sitting into the sea (its surface is drawn over their hulls' feet).
  const boats = near * boatsOut(c.t)
  if (boats > 0.01) {
    const toward = Math.max(-1, Math.min(1, Math.sin(sunAngle(c.t)) * 2))
    // Dimming with the dusk to the sky's own colours, so the lantern is what is seen.
    const dusk = mixHex(day.top, day.low, 0.45)
    const sail = mixHex(mixHex('#FBF6EC', day.lit, 0.3), dusk, 0.7 * day.night)
    const shade = mixHex(mixHex(mixHex('#C9CFD8', day.low, 0.3), day.top, 0.15), dusk, 0.8 * day.night)
    const hull = mixHex(day.line, day.sea, 0.35)
    for (const b of BOATS) {
      const d = layered(b.x, c.t, SAILS.f, SAILS.span, SAILS.wind)
      const edge = inLayer(d, SAILS.span)
      if (Math.abs(d) > half + 1 || edge < 0.01) continue
      p.push()
      atSea(p, k, u + d)
      // Riding the sea's slow breath, low on the horizon.
      ctx.translate(0, k * (0.03 - 0.02 * osc(c.t, 0.09, b.seed * 2)))
      const rock = osc(c.t, 0.12, b.seed)
      drawBoat(ctx, k, b.size, toward, rock, sail, shade, hull, 0.85 * boats * edge)
      // At dusk its lantern, at the masthead, lit as the lamps are lit; a little unsteady, as a flame is.
      const lantern = lanternAt(b.seed, c.t) * boats * edge
      if (lantern > 0.01) {
        ctx.rotate(rock * 0.05)
        const y = -1.28 * b.size * k
        const r = k * b.size * 0.45
        const a = lantern * (0.9 + 0.1 * osc(c.t, 0.4, b.seed * 3))
        const g = ctx.createRadialGradient(0, y, 0, 0, y, r)
        g.addColorStop(0, `rgba(255, 226, 160, ${a.toFixed(3)})`)
        g.addColorStop(0.18, `rgba(255, 196, 110, ${(0.45 * a).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255, 190, 100, 0)')
        ctx.fillStyle = g
        ctx.fillRect(-r, y - r, 2 * r, 2 * r)
      }
      p.pop()
    }
  }

  // Gulls, by day, close.
  const gulls = near * (1 - smooth(day.night, 0.12, 0.4)) * (1 - smooth(v.cells, 9, 14))
  if (gulls > 0.01) {
    const m = ctx.getTransform()
    const cell = Math.hypot(m.a, m.b) * k
    const ink = mixHex(day.line, day.low, 0.3)
    ctx.save()
    for (const g of FLOCKS) {
      const d = layered(g.x, c.t, GULLS.f, GULLS.span, GULLS.wind) + 0.18 * osc(c.t, 0.03, g.seed)
      const edge = inLayer(d, GULLS.span)
      if (Math.abs(d) > half + 1 || edge < 0.01) continue
      const { beat, glide } = wingsAt(g, c.t)
      const h = g.h + 0.1 * osc(c.t, 0.05 + 0.03 * hash(g.seed, 85), g.seed) + 0.025 * beat * (1 - glide)
      const [x, y] = onCanvas(ctx, k, ...polar(u + d, h), m)
      ctx.setTransform(1, 0, 0, 1, x, y)
      drawGull(ctx, g.size * cell, beat, ink, 0.75 * gulls * edge, Math.max(1, cell * 0.013))
    }
    ctx.restore()
  }
}

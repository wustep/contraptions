import type p5 from 'p5'
import { R as BALL_R, mixHex, type Piece, type PieceCtx } from '../../../../parts'
import { CHORDS, GRACES, MELODY, PERIOD, PIECES, loudness, wrap } from './music'
import { LENGTH, RADIUS, along, ballLocal, crest, float, since, sink, stonesIn, swell, type Stone } from './path'
import { wideAt } from './camera'
import {
  BANK, BANKS, BANKS_OF_MIST, CLOUDS, FIREFLIES, FIREFLY, FLOCKS, GULLS, HEAPS, MIST,
  WHALE, auroraAt, auroraSheet, bowAt, deepLight, cloudLight, cloudThere, dropAt, drawCloud, overcastAt, rainAt, ringAt, whaleAt, whaleShape, drawGull, firefliesOut, inLayer, layered, meteorAt, milkyWay, mistAt, wingsAt, type CloudLight,
} from './air'
import { alpha, hash, osc, polar, skyAt, smooth, type Sky } from './world'

/**
 * Everything on the planet but the ball, each a drawing told show time.
 *
 * - The sky: the day's gradient over the sea, the sun and the moon on their
 *   arcs, the stars, and, as the camera draws out, space round the planet.
 * - The stones: the melody, one material to a piece. The Gymnopédie's are
 *   columns of pale stone, the long notes lintels on two columns; the first
 *   Gnossienne's dark stelae, each with a lamp the ball lights as it lands;
 *   the third's lotus leaves on stems, floating, the longest with a flower
 *   that opens when the ball comes. What the ball does at night stays done
 *   until dawn: the lamps burn and the flowers stay open behind it, so its way
 *   is a thread of light, and seen from far off, round the planet.
 * - The sea, over the stones' feet: the swell that each bass note sends out
 *   from under the ball, its crests catching the light; the stones'
 *   reflections; and the light on the water, under the sun, the lamps and the
 *   moon, which the chords set sparkling.
 * - Over the ball: a spark where it is about to land, struck by a grace note;
 *   the lamps seen from far off; and, once the planet is small in the frame, a
 *   light round the ball so it can still be found.
 *
 * One job to a voice: the melody is the stones and the ball's landings, the
 * bass the sea's swell, the chords the light on the water, a grace note a
 * spark. How full the music is (`loudness`) is how high the swell stands and
 * how bright the water's light.
 */

const scenery = <S>(name: string, draw: (p: p5, s: S, c: PieceCtx) => void, over?: (p: p5, s: S, c: PieceCtx) => void): Piece<S> => ({
  name,
  weight: 0,
  place: () => null,
  draw,
  over,
})

type Ctx2D = CanvasRenderingContext2D

/** The frame on the canvas as the drawing sees it: its height in cells, and the ball's way round it. */
interface View {
  /** Cells top to bottom of the canvas. */
  cells: number
  /** 0 close, 1 when the whole planet is the picture. */
  wide: number
  /** The span of the sea in the frame, cells along. */
  u0: number
  u1: number
}

function viewOf(p: p5, c: PieceCtx): View {
  const ctx = p.drawingContext as Ctx2D
  const m = ctx.getTransform()
  const d = p.pixelDensity()
  // Cells per canvas height: the transform's scale is device pixels a pixel of the drawing, and k pixels a cell.
  const scale = Math.hypot(m.a, m.b) / d
  const cells = p.height / (c.k * scale)
  const wide = wideAt(cells)
  const u = along(c.t)
  // Once the frame has begun to slide from the ball to the planet's middle, the ball's neighbourhood is no longer
  // what is in it: the whole way round is.
  const half = wide > 0.001 ? LENGTH / 2 : (Math.hypot(p.width, p.height) / (c.k * scale)) * 0.62 + 1.5
  return { cells, wide, u0: u - half, u1: u + half }
}

/** Where a point of the world (cells) is on the canvas, in device pixels: through the canvas's transform, or `m`. */
function onCanvas(ctx: Ctx2D, k: number, x: number, y: number, m: DOMMatrix = ctx.getTransform()): [number, number] {
  return [m.a * x * k + m.c * y * k + m.e, m.b * x * k + m.d * y * k + m.f]
}

/** Draw in a stone's own frame: its front foot on the sea at the origin, up the frame's up. */
function atSea(p: p5, k: number, u: number): void {
  const [x, y] = polar(u, 0)
  p.translate(x * k, y * k)
  p.rotate(u / RADIUS)
}

// ---------------------------------------------------------------- the sky

/** The day's colours at `t` under its weather: greyer and dimmer while the shower's cloud is over. */
function weathered(t: number): Sky {
  const day = skyAt(t)
  const o = overcastAt(t)
  if (o < 0.001) return day
  const grey = (hex: string, g: string, a: number) => mixHex(hex, g, a * o)
  return {
    ...day,
    top: grey(day.top, '#8A93A3', 0.55),
    low: grey(day.low, '#C4C3C2', 0.5),
    sea: grey(day.sea, '#55626D', 0.4),
    deep: grey(day.deep, '#24303A', 0.3),
    lit: grey(day.lit, '#D9D6D0', 0.3),
  }
}

/** The sun and the moon: how far from overhead, radians (east positive), at show time `t`; beyond ±1.75 they are down. */
/**
 * Each goes once round the planet a period, east to west, so that from far off it is always somewhere in space: the
 * sun crosses the sky through the Gymnopédie and goes slowly round under the planet through the night; the moon rises
 * for the third Gnossienne, sets in the west at dawn, and goes round under the planet through the day.
 */
export const sunAngle = (t: number): number => {
  const u = wrap(t)
  return u < 222 ? 1.82 - (3.64 * u) / 222 : -1.82 - ((2 * Math.PI - 3.64) * (u - 222)) / (PERIOD - 222)
}
export const moonAngle = (t: number): number => {
  const u = wrap(t)
  return u >= 430 ? 1.8 - (3.6 * (u - 430)) / (PERIOD - 430) : -1.8 - ((2 * Math.PI - 3.6) * u) / 430
}

/** The sun or the moon in the frame: where it is on the canvas (device pixels), and how much it lights. */
interface Body {
  x: number
  y: number
  light: number
  sun: boolean
  /** How far from overhead, radians. */
  angle: number
}

/** The sun and the moon at `t`, on their arcs over the horizon; they light nothing once the planet is small in the frame. */
function bodies(ctx: Ctx2D, c: PieceCtx, v: View, day: Sky): Body[] {
  const H = ctx.canvas.height
  const [hx, hy] = onCanvas(ctx, c.k, ...polar(along(c.t) + 0.55, 0))
  const reach = H * 0.62
  // Only close: once the planet draws away they are its sky's, not the frame's.
  const near = 1 - smooth(v.wide, 0, 0.25)
  const at = (angle: number, light: number, sun: boolean): Body => ({
    x: hx + Math.sin(angle) * reach * 1.25,
    y: hy - Math.cos(angle) * reach,
    light: Math.abs(angle) > 1.9 ? 0 : light,
    sun,
    angle,
  })
  const veil = 1 - 0.8 * overcastAt(c.t)
  return [at(sunAngle(c.t), near * veil * (1 - day.night * 0.8), true), at(moonAngle(c.t), near * day.night, false)]
}

export const sky = scenery<null>('sky', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const v = viewOf(p, c)
  const day = weathered(c.t)
  const W = ctx.canvas.width
  const H = ctx.canvas.height
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
    ctx.globalAlpha = starLight * 0.62
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
      const over = v.wide > 0.5 ? 1 : smooth(hy - y, 0, H * 0.25)
      const tw = 0.7 + 0.3 * osc(c.t, 0.13 + hash(i, 3) * 0.3, i)
      const a2 = starLight * over * tw * (0.25 + 0.75 * hash(i, 4))
      if (a2 < 0.02) continue
      ctx.fillStyle = `rgba(244, 238, 223, ${a2.toFixed(3)})`
      const s = (0.6 + hash(i, 5) * 1.3) * Math.max(1, W / 1600)
      ctx.beginPath()
      ctx.arc(x, y, s, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // The aurora, over the first Gnossienne's night, among the stars.
  const northern = auroraAt(c.t) * (1 - v.wide)
  if (northern > 0.01) {
    const sheet = auroraSheet(c.t, Math.ceil(W / 4), Math.ceil(H / 4), along(c.t))
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, 0.62 * northern)
    ctx.drawImage(sheet, 0, 0, W, H)
    ctx.restore()
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
    const sy = H * (0.05 + 0.1 * hash(i, 132))
    const q = 1 - (1 - fall.q) ** 2
    const hx = sx + dir * Math.cos(a) * L * q
    const hy2 = sy + Math.sin(a) * L * q
    const tail = L * 0.32 * Math.min(1, q * 2.5)
    const tx = hx - dir * Math.cos(a) * tail
    const ty = hy2 - Math.sin(a) * tail
    const light = fall.light * smooth(day.night, 0.3, 0.7) * smooth(hy - hy2, 0, H * 0.12)
    const streak = ctx.createLinearGradient(tx, ty, hx, hy2)
    streak.addColorStop(0, 'rgba(255, 246, 228, 0)')
    streak.addColorStop(1, `rgba(255, 246, 228, ${light.toFixed(3)})`)
    ctx.strokeStyle = streak
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1.5, H / 330)
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(hx, hy2)
    ctx.stroke()
    ctx.fillStyle = `rgba(255, 250, 238, ${light.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(hx, hy2, Math.max(1.5, H / 300), 0, Math.PI * 2)
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
  body(sun, H * 0.045, '#FFF1D6', 'rgba(255, 214, 160, A)')
  body(moon, H * 0.03, '#F2EEE2', 'rgba(200, 214, 240, A)')
  ctx.restore()

  // The clouds and the gulls, close: once the planet draws away they are too small to be anything.
  const near = 1 - smooth(v.wide, 0, 0.3)
  if (near > 0.01) air(p, c, v, day, sun, moon, near)

  // Far off, the sun and the moon in space, where they are from the planet.
  const afar = smooth(v.wide, 0.1, 0.55)
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

/** Which way the sun is from the planet's middle at `t`, radians clockwise from the world's up. */
const sunWay = (t: number): number => along(t) / RADIUS + sunAngle(t)
const moonWay = (t: number): number => along(t) / RADIUS + moonAngle(t)

/**
 * The sun and the moon as the planet's neighbours in space, seen once it is small in the frame: the sun a small white
 * disc with its glare, the moon a little world lit on the side towards the sun.
 */
function inSpace(p: p5, c: PieceCtx, light: number): void {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const sun = sunWay(c.t)
  const sx = Math.sin(sun) * RADIUS * 1.85 * k
  const sy = -Math.cos(sun) * RADIUS * 1.85 * k
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
  const mx = Math.sin(moon) * RADIUS * 1.5 * k
  const my = -Math.cos(moon) * RADIUS * 1.5 * k
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
  const glow = ctx.createRadialGradient(sun.x, sun.y, H * 0.06, sun.x, sun.y, reach)
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
  const R = H * 0.78
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
    const rise = smooth(hy - (y0 + y1) / 2, 0, H * 0.32)
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
      const shown = smooth(foot, H * 0.14, H * 0.3)
      if (shown < 0.01) continue
      const [lx, ly] = lightFrom(x, y)
      p.push()
      atSea(p, k, u + d)
      p.translate(0, -cloud.h * k)
      drawCloud(ctx, k, cloud, tint, lx, ly, a * there * edge * shown)
      p.pop()
    }
  }
  layer(BANKS, BANK, hazy, (0.6 - 0.28 * day.night) * near * light.alpha, false)
  layer(CLOUDS, HEAPS, light, 0.92 * near * light.alpha, true)

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

// ---------------------------------------------------------------- the stones

/** Show time dawn puts out what the night lit: each lamp goes out, and each flower closes, at its own moment in here. */
const DAWN_FROM = 7
const DAWN_TO = 34

/**
 * The night's hold on `stone` at `t`: how long ago the ball came to it (seconds), and how much of the night is still
 * on it (1, down to 0 as the dawn comes to it). The lamps the ball lights burn, and the flowers it opens stay open,
 * until the sun comes up; before the ball comes to it this time round it is last night's, going out with the dawn,
 * and then nothing. Only the Gnossiennes' stones: the night's.
 */
function tonight(stone: Stone, t: number): { age: number; left: number } | null {
  const u = wrap(t)
  const at = stone.touches[0]
  if (u >= at) return { age: u - at, left: 1 }
  const out = DAWN_FROM + hash(stone.index, 7) * (DAWN_TO - DAWN_FROM - 6)
  const left = 1 - smooth(u, out, out + 6)
  return left > 0 ? { age: u + PERIOD - at, left } : null
}

/**
 * How bright a lamp burns, 0 to 1: it catches as the ball comes down on it, flares as hard as the note was played,
 * and settles to burn, a little unsteadily, until dawn.
 */
export function lampLight(stone: Stone, t: number): number {
  const night = tonight(stone, t)
  if (!night) return 0
  const s = night.age
  const burn = 0.56 * smooth(s, 0, 0.3) * (1 + 0.07 * osc(t, 0.37, stone.index * 1.7))
  const flare = 0.55 * stone.weight[0] * (1 - Math.exp(-s / 0.03)) * Math.exp(-s / 1.6)
  return night.left * Math.min(1, burn + flare + 0.45 * pulse(stone, t))
}

/** How far a flower is open, 0 a bud to 1: it opens as the ball comes, and closes again at dawn. */
export function bloom(stone: Stone, t: number): number {
  const night = tonight(stone, t)
  return night ? night.left * smooth(night.age, 0, 2.2) : 0
}

/**
 * Each piece's last note runs back along the way the ball came: a slow wave of light going back through the piece's
 * stones as the camera draws out, a glint along the columns' tops in the sunset, a flare through the lamps, and,
 * after the third Gnossienne, round the whole planet through the flowers and then the lamps: the night's way, once
 * more, as the period comes round.
 */
export const CADENCES = PIECES.map((piece, i) => ({
  t: piece.last,
  u: along(piece.last),
  pieces: i === 2 ? [1, 2] : [i],
  /** How far back its way goes: to where the first of its pieces began. */
  way: along(piece.last) - along(PIECES[i === 2 ? 1 : i].from),
  /** Cells a second it runs back, how wide it is, and how long it lasts. */
  speed: [3, 3.4, 40][i],
  width: [1.6, 1.6, 7][i],
  lasts: [10, 10, 14][i],
}))

/** Where each cadence's wave is at `t`: cells along, and how bright; for those running now. */
export function cadenceFronts(t: number): { u: number; light: number }[] {
  const out: { u: number; light: number }[] = []
  for (const c of CADENCES) {
    const s = since(t, c.t)
    if (s < 0 || s > c.lasts) continue
    const back = c.speed * s
    const light = smooth(s, 0, 0.6) * (1 - smooth(s, c.lasts * 0.55, c.lasts)) * (1 - smooth(back, c.way - c.width, c.way))
    if (light > 0.01) out.push({ u: c.u - back, light })
  }
  return out
}

/** How much of a cadence's wave is on `stone` at `t`, 0 to 1. */
export function cadence(stone: Stone, t: number): number {
  let out = 0
  for (const c of CADENCES) {
    if (!c.pieces.includes(stone.piece)) continue
    const s = since(t, c.t)
    if (s < 0 || s > c.lasts) continue
    let back = (c.u - (stone.u0 + stone.u1) / 2) % LENGTH
    if (back < 0) back += LENGTH
    const d = back - c.speed * s
    out = Math.max(out, Math.exp(-((d / c.width) ** 2)) * (1 - smooth(s, c.lasts * 0.55, c.lasts)))
  }
  return out
}

/** A restrike's pulse: the chord striking the held note's key again, answered by the stone. */
function pulse(stone: Stone, t: number): number {
  let out = 0
  for (let i = 1; i < stone.touches.length; i++) {
    if (stone.bounced[i]) continue
    const s = since(t, stone.touches[i])
    if (s >= 0 && s < 3) out = Math.max(out, Math.exp(-s / 0.7))
  }
  return out
}

const MARBLE_SHADE = 0.22

/**
 * A column, or a lintel on two: the Gymnopédie's stones, drawn from the front foot, `w` wide, top at `-h`. Slender,
 * with air between: a colonnade in the sea, not a wall.
 */
function column(p: p5, k: number, w: number, h: number, day: Sky, weight: number, shine: number, sun: number): void {
  const K = (v: number) => v * k
  const stone = day.lit
  const shade = mixHex(day.lit, day.sea, MARBLE_SHADE)
  const ink = day.line
  const lintel = w > 0.62
  const shafts = lintel ? [0.14, w - 0.14] : [w / 2]
  const sw = lintel ? 0.11 : Math.max(0.08, Math.min(0.16, w * 0.36))
  const capH = lintel ? 0.09 : 0.06
  const slabW = lintel ? w : Math.min(w, sw * 2.1)
  p.strokeWeight(weight)
  for (const x of shafts) {
    // The shaft, into the sea: lit on the sun's side and in shade on the other, the shade narrowing to noon and
    // crossing over through the afternoon (`sun`, -1 west to 1 east).
    p.stroke(ink)
    p.fill(stone)
    p.rect(K(x), K(-h / 2 + 0.2), K(sw), K(h + 0.4))
    p.noStroke()
    p.fill(alpha(p, shade, 0.8))
    const shadeW = sw * (0.14 + 0.32 * Math.abs(sun))
    p.rect(K(x - sun * (sw / 2 - shadeW / 2 - sw * 0.04)), K(-h / 2 + 0.2), K(shadeW), K(h + 0.4 - 0.02))
    p.stroke(alpha(p, ink, 0.28))
    p.strokeWeight(weight * 0.55)
    const fluting = x + (sun >= 0 ? 1 : -1) * sw * 0.16
    p.line(K(fluting), K(-h + capH + 0.1), K(fluting), K(0.2))
    p.strokeWeight(weight)
    // The capital: a cushion under the slab.
    p.stroke(ink)
    p.fill(stone)
    p.quad(K(x - sw * 0.8), K(-h + capH), K(x + sw * 0.8), K(-h + capH), K(x + sw * 0.52), K(-h + capH + 0.06), K(x - sw * 0.52), K(-h + capH + 0.06))
  }
  // The slab the ball walks on.
  p.fill(stone)
  p.rect(K(w / 2), K(-h + capH / 2), K(slabW), K(capH))
  if (shine > 0.01) {
    p.stroke(alpha(p, '#FFF6E2', shine))
    p.strokeWeight(weight * 1.6)
    p.line(K(w / 2 - slabW / 2 + 0.02), K(-h), K(w / 2 + slabW / 2 - 0.02), K(-h))
  }
}

/**
 * The first Gnossienne's stones: a beam of bronze on slim dark posts, with a lamp at its front that the ball lights
 * as it lands. `lamp` is how bright it burns.
 */
function stele(p: p5, k: number, w: number, h: number, day: Sky, weight: number, lamp: number, withLamp: boolean): void {
  const K = (v: number) => v * k
  const body = mixHex('#23283C', day.lit, 0.2)
  const posts = w > 0.42 ? [0.09, w - 0.09] : [w / 2]
  const pw = w > 0.42 ? 0.075 : Math.max(0.06, Math.min(0.12, w * 0.4))
  p.strokeWeight(weight)
  p.stroke(alpha(p, day.line, 0.7))
  p.fill(body)
  for (const x of posts) p.rect(K(x), K(-h / 2 + 0.2), K(pw), K(h + 0.4))
  // The beam.
  p.fill(mixHex('#6E5232', '#C99C5C', 0.25 + 0.75 * lamp))
  const bw = w > 0.42 ? w : Math.min(w, pw * 2.4)
  p.rect(K(w / 2), K(-h + 0.03), K(bw), K(0.06))
  if (!withLamp) return
  // The lamp: a small bowl at the front, where the ball lands.
  const lx = w > 0.42 ? 0.1 : w / 2
  p.fill(mixHex('#3A2C22', '#E9B866', lamp))
  p.arc(K(lx), K(-h - 0.005), K(0.1), K(0.09), Math.PI, Math.PI * 2, 'chord')
  if (lamp > 0.02) {
    const ctx = p.drawingContext as Ctx2D
    const r = K(0.14 + 0.6 * lamp)
    const cy = K(-h - 0.08)
    const g = ctx.createRadialGradient(K(lx), cy, 0, K(lx), cy, r)
    g.addColorStop(0, `rgba(255, 214, 140, ${(0.75 * lamp).toFixed(3)})`)
    g.addColorStop(0.35, `rgba(242, 170, 80, ${(0.28 * lamp).toFixed(3)})`)
    g.addColorStop(1, 'rgba(242, 170, 80, 0)')
    ctx.fillStyle = g
    ctx.fillRect(K(lx) - r, cy - r, r * 2, r * 2)
    // The flame.
    p.noStroke()
    p.fill(alpha(p, '#FFE7B0', Math.min(1, lamp * 1.4)))
    const fh = 0.05 + 0.06 * lamp
    p.ellipse(K(lx), K(-h - 0.05 - fh / 2), K(0.035), K(fh))
  }
}

/** A lotus leaf on its stem: the third Gnossienne's stones. `open` is how far its flower has opened, if it has one. */
function lotus(p: p5, k: number, w: number, h: number, day: Sky, weight: number, sway: number, open: number, flower: boolean, wave = 0): void {
  const K = (v: number) => v * k
  const leaf = mixHex('#5E8C77', day.lit, 0.25)
  const ink = alpha(p, day.line, 0.75)
  // The stem, from under the sea to the leaf's middle, bowed a little by the swell.
  p.noFill()
  p.stroke(mixHex('#4F7466', day.sea, 0.3))
  p.strokeWeight(Math.max(1, K(0.03)))
  p.bezier(K(w / 2 + sway * 0.4), K(0.3), K(w / 2 - 0.08 + sway), K(-h * 0.35), K(w / 2 + 0.06), K(-h * 0.7), K(w / 2), K(-h + 0.02))
  // The leaf: flat, with a rim turned up at its edge.
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(leaf)
  const rim = Math.min(0.06, 0.03 + w * 0.02)
  p.beginShape()
  p.vertex(K(0), K(-h - rim))
  p.quadraticVertex(K(0.02), K(-h + 0.035), K(w * 0.18), K(-h + 0.04))
  p.vertex(K(w * 0.82), K(-h + 0.04))
  p.quadraticVertex(K(w - 0.02), K(-h + 0.035), K(w), K(-h - rim))
  p.vertex(K(w - 0.03), K(-h))
  p.vertex(K(0.03), K(-h))
  p.endShape(p.CLOSE)
  if (!flower) return
  // The flower at the leaf's far end: a small closed bud, green at its foot, until the ball comes; then open, pale,
  // and lit a little by the moon, so the way the ball has come is a line of flowers and the way ahead is buds.
  const fx = w - Math.min(0.24, w * 0.25)
  const fy = -h - 0.02
  if (open > 0.02) {
    const ctx = p.drawingContext as Ctx2D
    const r = K(0.34 * (1 + 0.5 * wave))
    const cy = K(fy - 0.09)
    const g = ctx.createRadialGradient(K(fx), cy, 0, K(fx), cy, r)
    g.addColorStop(0, `rgba(246, 226, 232, ${(0.22 * open + 0.3 * wave * open).toFixed(3)})`)
    g.addColorStop(1, 'rgba(246, 226, 232, 0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(K(fx) - r, cy - r, 2 * r, 2 * r)
    ctx.restore()
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  for (const i of [-2, 2, -1, 1, 0]) {
    const a = i * (0.1 + 0.4 * open)
    const len = 0.12 + 0.09 * open - Math.abs(i) * 0.018
    p.push()
    p.translate(K(fx), K(fy))
    p.rotate(a)
    p.fill(mixHex(mixHex('#9DB59A', '#D8A9B3', 0.55), mixHex('#EFC6CD', '#FBF1EE', Math.abs(i) / 3), open))
    p.ellipse(0, K(-len / 2), K(0.05 + 0.035 * open), K(len))
    p.pop()
  }
}

/** The longest a stone is drawn in one piece: longer, it is several, each standing square to the curve of the sea. */
const SEGMENT = [1.5, 1.3, 1.1]

/**
 * Every stone in the frame, in its piece's material, on `p` (the stage, or the sea's mirror). Mirrored, each is drawn
 * upside down from its foot, as the still sea gives it back.
 */
function drawStones(p: p5, c: PieceCtx, v: View, day: Sky, mirrored: boolean): void {
  const k = c.k
  // Which side the sun is on, for the columns' shade: from the east at dawn to the west at dusk.
  const sun = Math.max(-1, Math.min(1, sunAngle(c.t) / 1.1))
  for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
    const w = stone.u1 - stone.u0
    // Too small to be anything but a mark.
    if (w * k < 1.5 && v.wide > 0.9) continue
    const h = stone.h - sink(stone, c.t) + float(stone, c.t)
    const n = Math.max(1, Math.ceil(w / SEGMENT[stone.piece]))
    const gap = n > 1 ? 0.07 : 0
    const sw = (w - gap * (n - 1)) / n
    for (let j = 0; j < n; j++) {
      const u0 = stone.u0 + shift + j * (sw + gap)
      p.push()
      atSea(p, k, u0)
      if (mirrored) p.scale(1, -1)
      if (stone.piece === 0) {
        column(p, k, sw, h, day, c.weight, Math.min(1, 0.7 * pulse(stone, c.t) + cadence(stone, c.t)), sun)
      } else if (stone.piece === 1) {
        // Lit by the ball, and burning on behind it until dawn: Ariadne's thread in lamps.
        const lit = lampLight(stone, c.t)
        stele(p, k, sw, h, day, c.weight, lit > 0 ? Math.min(1, lit + 0.45 * cadence(stone, c.t)) : 0, j === 0)
      } else {
        const sway = 0.03 * osc(c.t, 0.11, stone.index + j)
        lotus(p, k, sw, h, day, c.weight, sway, bloom(stone, c.t), j === n - 1 && w > 0.9, cadence(stone, c.t))
      }
      p.pop()
    }
  }
}

export const stones = scenery<null>('stones', (p, _s, c) => {
  drawStones(p, c, viewOf(p, c), weathered(c.t), false)
})

// ---------------------------------------------------------------- the light on the water

/** A chord still sounding on the water: which one, how long ago, and how hard it was played (a middling chord is 1). */
interface Sounding {
  i: number
  s: number
  v: number
}

let soundingAt = Number.NaN
let soundingNow: Sounding[] = []

/** The chords that have lately sounded at `t`. Asked for many times a frame, for one time: kept for that time. */
function sounding(t: number): Sounding[] {
  if (t === soundingAt) return soundingNow
  const out: Sounding[] = []
  for (let i = 0; i < CHORDS.length; i++) {
    const s = since(t, CHORDS[i].t)
    if (s >= 0 && s < 2.4) out.push({ i, s, v: CHORDS[i].v / 32 })
  }
  soundingAt = t
  soundingNow = out
  return out
}

/**
 * How bright glint `id` of a path of light on the water is at `t`: a slow shimmer, brighter as the music is fuller,
 * and a flash when a chord catches it. Each chord catches a different few, as hard as it was played, and they die
 * away over half a second.
 */
function glint(id: number, t: number, full: number, chords: Sounding[]): number {
  let a = (0.26 + 0.14 * osc(t, 0.19 + 0.35 * hash(id, 11), 6.28 * hash(id, 12))) * (0.4 + 0.6 * full)
  for (const ch of chords) {
    if (hash(id, ch.i, 13) > 0.45) continue
    a += 1.1 * ch.v * (1 - Math.exp(-ch.s / 0.02)) * Math.exp(-ch.s / 0.5)
  }
  return a
}

/**
 * A path of light on the water, drawn in a stone's frame at `u` (cells along): short strokes of `rgb` in rows going
 * down from the surface, spreading as they come nearer, as bright as `light`. The chords set it sparkling.
 */
function waterLight(p: p5, c: PieceCtx, u: number, light: number, rgb: string, rows: number, spread: number, seed: number): void {
  const ctx = p.drawingContext as Ctx2D
  const k = c.k
  const full = loudness(c.t)
  const chords = sounding(c.t)
  const top = -swell(u, c.t)
  const thick = Math.max(1.2, c.weight * 1.1)
  ctx.save()
  for (let j = 0; j < rows; j++) {
    const d = 0.06 + 0.07 * j + 0.0035 * j * j
    const fade = 1 - j / (rows + 1)
    for (let i = 0; i < 3; i++) {
      const id = seed * 131 + j * 3 + i
      const a = Math.min(0.95, light * fade * glint(id, c.t, full, chords))
      if (a < 0.015) continue
      const x = (hash(id, 14) - 0.5) * 2 * spread * (0.5 + d) + 0.025 * osc(c.t, 0.23, id)
      const len = (0.04 + 0.1 * hash(id, 15)) * (0.7 + 0.6 * d)
      ctx.fillStyle = `rgba(${rgb}, ${a.toFixed(3)})`
      ctx.fillRect(k * (x - len / 2), k * (top + d), k * len, thick)
    }
  }
  ctx.restore()
}

// ---------------------------------------------------------------- the sea

const DEPTH = 5

/** The sea's own light at night, woken by the swell. */
const GLOW = '120, 228, 214'
const GLOW_RGB = [120, 228, 214]
const mixRgb = (a: number[], b: number[], f: number): string => a.map((x, i) => Math.round(x + (b[i] - x) * f)).join(', ')

export const sea = scenery<null>('sea', (p, _s, c) => {
  const ctx = p.drawingContext as Ctx2D
  const v = viewOf(p, c)
  const day = weathered(c.t)
  const k = c.k
  const whole = v.u1 - v.u0 >= LENGTH * 0.95
  const u0 = whole ? 0 : v.u0
  const u1 = whole ? LENGTH : v.u1
  const n = whole ? 360 : 220
  // The sea: a band from its surface (with the swell) down, darkening with depth.
  const water = new Path2D()
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n
    const [x, y] = polar(u, whole ? 0 : swell(u, c.t))
    if (i === 0) water.moveTo(x * k, y * k)
    else water.lineTo(x * k, y * k)
  }
  for (let i = n; i >= 0; i--) {
    const [x, y] = polar(u0 + ((u1 - u0) * i) / n, -DEPTH)
    water.lineTo(x * k, y * k)
  }
  water.closePath()
  const g = ctx.createRadialGradient(0, 0, (RADIUS - DEPTH) * k, 0, 0, RADIUS * k)
  g.addColorStop(0, day.deep)
  g.addColorStop(1, day.sea)
  ctx.fillStyle = g
  ctx.fill(water)
  // The sky's own colour on the water, under its surface, as a calm sea gives it back.
  {
    const sheen = ctx.createRadialGradient(0, 0, (RADIUS - 1.6) * k, 0, 0, RADIUS * k)
    sheen.addColorStop(0, alpha(p, day.low, 0).toString())
    sheen.addColorStop(1, alpha(p, day.low, 0.42 * (1 - v.wide)).toString())
    ctx.fillStyle = sheen
    ctx.fill(water)
  }
  // The aurora given back by the water, faint, upside down about the horizon.
  const northern = auroraAt(c.t) * (1 - v.wide)
  if (northern > 0.01) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    const [, hy] = onCanvas(ctx, k, ...polar(along(c.t) + 0.55, 0))
    const sheet = auroraSheet(c.t, Math.ceil(W / 4), Math.ceil(H / 4), along(c.t))
    ctx.save()
    ctx.clip(water)
    ctx.setTransform(1, 0, 0, -1, 0, 2 * hy)
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, 0.3 * northern)
    ctx.drawImage(sheet, 0, 0, W, H)
    ctx.restore()
  }
  // The planet under the sea: deep water all the way down, lit a little from the side the sun is on.
  {
    const r = (RADIUS - DEPTH + 0.02) * k
    const sun = sunWay(c.t)
    const [ox, oy] = [Math.sin(sun) * 0.5 * r, -Math.cos(sun) * 0.5 * r]
    const core = ctx.createRadialGradient(ox, oy, r * 0.1, 0, 0, r * 1.05)
    core.addColorStop(0, mixHex(day.sea, day.deep, 0.5))
    core.addColorStop(1, day.deep)
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    // Far off, at night: the sea's own light all through the deep water, turning with the planet.
    const far = smooth(Math.log(v.cells), Math.log(22), Math.log(70)) * smooth(day.night, 0.3, 0.8)
    if (far > 0.01) {
      ctx.save()
      ctx.globalAlpha = far * (0.8 + 0.2 * osc(c.t, 0.02))
      const R = RADIUS * k
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(deepLight(), -R, -R, 2 * R, 2 * R)
      ctx.restore()
    }
    // And its far side from the sun in shadow, once it is small enough to be a world.
    const shade = smooth(v.wide, 0.1, 0.6)
    if (shade > 0.01) {
      const R = RADIUS * k
      const night = ctx.createLinearGradient(Math.sin(sun) * R, -Math.cos(sun) * R, -Math.sin(sun) * R, Math.cos(sun) * R)
      night.addColorStop(0, 'rgba(3, 5, 12, 0)')
      night.addColorStop(0.45, 'rgba(3, 5, 12, 0)')
      night.addColorStop(1, `rgba(3, 5, 12, ${(0.5 * shade).toFixed(3)})`)
      ctx.fillStyle = night
      ctx.beginPath()
      ctx.arc(0, 0, R + 0.05 * k, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Wide: the planet's limb lit on the ball's side, where its day is, fading round to the far side's dark; and warm
  // where the sun's light grazes its air, the dawn coming round.
  if (v.wide > 0.01) {
    const face = along(c.t) / RADIUS - Math.PI / 2
    p.noFill()
    for (let i = 0; i < 6; i++) {
      const spread = 1.5 - i * 0.2
      p.stroke(alpha(p, mixHex(day.low, '#FFF1DA', 0.3), (0.08 + i * 0.045) * v.wide))
      p.strokeWeight(Math.max(1, (6 - i) * 1.4))
      p.arc(0, 0, RADIUS * 2 * k, RADIUS * 2 * k, face - spread, face + spread)
    }
    const sunFace = sunWay(c.t) - Math.PI / 2
    const warm = mixHex(day.low, '#FFC48E', 0.65)
    const px = Math.max(1, ctx.canvas.height / 720)
    for (let i = 0; i < 7; i++) {
      const spread = 1.1 - i * 0.14
      p.stroke(alpha(p, warm, (0.05 + i * 0.05) * smooth(v.wide, 0.1, 0.55)))
      p.strokeWeight((8 - i) * 1.6 * px)
      p.arc(0, 0, RADIUS * 2 * k, RADIUS * 2 * k, sunFace - spread, sunFace + spread)
    }
  }

  // The whale, deep under the pond, before anything on the water is drawn over it.
  const whale = whaleAt(c.t)
  if (whale && !whole && whale.there > 0.01) {
    const u = along(c.t) + whale.d
    const { body, flukes, fin } = whaleShape(k, whale.beat)
    const m = ctx.getTransform()
    const cell = Math.hypot(m.a, m.b) * k
    p.push()
    atSea(p, k, u)
    ctx.translate(0, WHALE.depth * k)
    // Swimming the ball's way, nose ahead, rising and sinking a little with its stroke.
    ctx.translate(0, 0.06 * whale.beat * k)
    const shape = new Path2D()
    body.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)))
    shape.closePath()
    const tail = new Path2D()
    flukes.forEach(([x, y], i) => (i ? tail.lineTo(x, y) : tail.moveTo(x, y)))
    tail.closePath()
    fin.forEach(([x, y], i) => (i ? tail.lineTo(x, y) : tail.moveTo(x, y)))
    tail.closePath()
    // Soft-edged, as a shape seen through deep water: a wider, fainter pass under the body itself.
    const dark = mixHex(day.deep, '#03060E', 0.45)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = alpha(p, dark, 0.14 * whale.there).toString()
    ctx.lineWidth = cell * 0.12
    ctx.stroke(shape)
    ctx.fillStyle = alpha(p, dark, 0.36 * whale.there).toString()
    ctx.fill(shape)
    ctx.fill(tail)
    // Its outline in the sea's light: motes along its back and belly, flickering.
    for (let i = 0; i < body.length; i += 2) {
      const [x, y] = body[i]
      const a = whale.there * (0.18 + 0.22 * Math.max(0, osc(c.t, 0.21 + 0.05 * hash(i, 181), i * 1.7)))
      ctx.fillStyle = `rgba(${GLOW}, ${a.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(x, y, Math.max(0.8, cell * 0.009), 0, Math.PI * 2)
      ctx.fill()
    }
    p.pop()
  }

  if (!whole) {
    // Reflections: the stones upside down in the water, rippling, fading as they go down; a lit lamp a longer,
    // warmer streak too, with its path of light on the water.
    mirror(p, c, v, day, water)
    const ctx2 = p.drawingContext as Ctx2D
    for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
      if (stone.piece !== 1) continue
      const lit = lampLight(stone, c.t)
      if (lit <= 0.02) continue
      const w = stone.u1 - stone.u0
      const h = stone.h - sink(stone, c.t)
      p.push()
      atSea(p, k, stone.u0 + shift)
      const depth = h * 0.8 * k
      const wob = 0.015 * osc(c.t, 0.4, stone.index)
      const lg = ctx2.createLinearGradient(0, 0, 0, depth * 1.2)
      lg.addColorStop(0, `rgba(242, 180, 90, ${(0.3 * lit).toFixed(3)})`)
      lg.addColorStop(1, 'rgba(242, 180, 90, 0)')
      ctx2.fillStyle = lg
      const lx = w > 0.42 ? 0.1 : w / 2
      ctx2.fillRect(k * (lx - 0.05 + wob), k * 0.02, k * 0.1, depth * 1.2)
      p.translate(k * (lx + wob), 0)
      waterLight(p, c, stone.u0 + shift + lx, lit, '255, 206, 132', 6, 0.05, stone.index)
      p.pop()
    }
    // The sun's and the moon's paths of light on the water, under them.
    {
      const m = ctx.getTransform()
      const cell = Math.hypot(m.a, m.b) * k
      const uh = along(c.t) + 0.55
      const [hx] = onCanvas(ctx, k, ...polar(uh, 0))
      for (const b of bodies(ctx, c, v, day)) {
        // Low over the sea it lays a long bright path; high, a fainter one; at the horizon it goes.
        const light = b.light * smooth(1.85 - Math.abs(b.angle), 0, 0.35) * (0.55 + 0.45 * Math.min(1, Math.abs(b.angle) / 1.2))
        if (light < 0.02) continue
        const ub = uh + (b.x - hx) / cell
        if (ub < v.u0 || ub > v.u1) continue
        p.push()
        atSea(p, k, ub)
        waterLight(p, c, ub, light, b.sun ? '255, 226, 178' : '226, 234, 248', 16, b.sun ? 0.22 : 0.16, b.sun ? 1 : 2)
        p.pop()
      }
    }
    // The surface: a line of light where the sky meets it, brighter along the swells' crests.
    p.noFill()
    p.stroke(alpha(p, day.low, 0.55))
    p.strokeWeight(Math.max(1, c.weight * 0.8))
    p.beginShape()
    for (let i = 0; i <= n; i++) {
      const u = u0 + ((u1 - u0) * i) / n
      const [x, y] = polar(u, swell(u, c.t))
      p.vertex(x * k, y * k)
    }
    p.endShape()
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, c.weight * 1.25)
    const foam = mixHex(day.low, '#FFF7EA', 0.6)
    const [fr, fg, fb] = [1, 3, 5].map((i) => parseInt(foam.slice(i, i + 2), 16))
    // At night the swell wakes the sea's light: the crest glows a cold green-blue as it runs.
    const glow = smooth(day.night, 0.4, 0.9)
    const cell = Math.hypot(ctx.getTransform().a, ctx.getTransform().b) * k
    for (let i = 0; i < n; i++) {
      const ua = u0 + ((u1 - u0) * i) / n
      const ub = u0 + ((u1 - u0) * (i + 1)) / n
      const lift = crest((ua + ub) / 2, c.t)
      if (lift < 0.04) continue
      const [xa, ya] = polar(ua, swell(ua, c.t))
      const [xb, yb] = polar(ub, swell(ub, c.t))
      if (glow > 0.01) {
        ctx.strokeStyle = `rgba(${GLOW}, ${(0.16 * lift * glow).toFixed(3)})`
        ctx.lineWidth = Math.max(3, cell * 0.09)
        ctx.beginPath()
        ctx.moveTo(xa * k, ya * k)
        ctx.lineTo(xb * k, yb * k)
        ctx.stroke()
        ctx.lineWidth = Math.max(1, c.weight * 1.25)
      }
      ctx.strokeStyle = glow > 0.01
        ? `rgba(${mixRgb([fr, fg, fb], GLOW_RGB, 0.6 * glow)}, ${(0.75 * lift).toFixed(3)})`
        : `rgba(${fr}, ${fg}, ${fb}, ${(0.75 * lift).toFixed(3)})`
      ctx.beginPath()
      ctx.moveTo(xa * k, ya * k)
      ctx.lineTo(xb * k, yb * k)
      ctx.stroke()
    }
    // And under it, the motes in the water light as the crest passes over them, and go out behind it.
    if (glow > 0.01) {
      const STEP = 0.11
      for (let j = Math.floor(v.u0 / STEP); j * STEP < v.u1; j++) {
        const u = (j + hash(j, 171)) * STEP
        const lit = crest(u, c.t)
        if (lit < 0.05) continue
        const depth = 0.04 + 0.55 * hash(j, 172) ** 1.6
        const a = glow * lit * (1 - depth) * 0.85
        const [x, y] = polar(u, swell(u, c.t) - depth)
        ctx.fillStyle = `rgba(${GLOW}, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(x * k, y * k, Math.max(0.8, cell * (0.008 + 0.01 * hash(j, 173))), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
    // Rain: each drop's ring spreading on the water.
    const rain = rainAt(c.t)
    if (rain > 0.01) {
      const span = v.u1 - v.u0
      ctx.save()
      ctx.lineWidth = Math.max(1, c.weight * 0.8)
      for (let i = 0; i < 70; i++) {
        const r = ringAt(i, c.t)
        const u = v.u0 + r.x * span
        const depth = 0.03 + 0.45 * r.d ** 1.5
        const size = (0.04 + 0.2 * r.q) * (1 - 0.5 * depth)
        const a = rain * (1 - r.q) ** 1.5 * (0.55 - 0.6 * depth)
        if (a < 0.02) continue
        const [x, y] = polar(u, swell(u, c.t) - depth)
        ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.ellipse(x * k, y * k, size * k, size * k * 0.2, u / RADIUS, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
    // Mist lying on the water: at dawn, a little at dusk, and under the moon.
    const mist = mistAt(c.t) * (1 - v.wide)
    if (mist > 0.01) {
      const tint = mixHex(day.low, day.night > 0.5 ? '#B4C2DC' : '#FFFFFF', 0.35)
      const [mr, mg, mb] = [1, 3, 5].map((i) => parseInt(tint.slice(i, i + 2), 16))
      const half = (v.u1 - v.u0) / 2
      const here = along(c.t)
      for (const bank of BANKS_OF_MIST) {
        const d = layered(bank.x, c.t, MIST.f, MIST.span, MIST.wind)
        const edge = inLayer(d, MIST.span)
        if (Math.abs(d) > half + bank.w / 2 || edge < 0.01) continue
        p.push()
        atSea(p, k, here + d)
        ctx.translate(0, -bank.h * k)
        ctx.scale((bank.w * k) / 2, (bank.th * k) / 2)
        const m = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        const a = 0.6 * mist * edge
        m.addColorStop(0, `rgba(${mr}, ${mg}, ${mb}, ${a.toFixed(3)})`)
        m.addColorStop(0.55, `rgba(${mr}, ${mg}, ${mb}, ${(a * 0.45).toFixed(3)})`)
        m.addColorStop(1, `rgba(${mr}, ${mg}, ${mb}, 0)`)
        ctx.fillStyle = m
        ctx.fillRect(-1, -1, 2, 2)
        p.pop()
      }
    }
  }
})

/** The sea's mirror: a canvas the size of the stage's, kept, that the stones are drawn into upside down. */
let mirrored: { p: p5; g: p5.Graphics } | null = null

/**
 * The stones given back by the sea: drawn upside down from their feet into the mirror, faded with depth and cut to the
 * water, and laid over the sea in rows, each shifted a little by the ripple, more the deeper it is.
 */
function mirror(p: p5, c: PieceCtx, v: View, day: Sky, water: Path2D): void {
  const ctx = p.drawingContext as Ctx2D
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  // Less as the camera draws out: far off, a reflection is a streak, not a picture.
  const strength = (0.34 + 0.16 * day.night) * (1 - v.wide) * (1 - 0.65 * smooth(Math.log(v.cells), Math.log(10), Math.log(28)))
  if (strength < 0.01) return
  // Where the water starts on the canvas, roughly: the highest point of its surface in the frame.
  const k = c.k
  let top = H
  for (let i = 0; i <= 12; i++) {
    const [, y] = onCanvas(ctx, k, ...polar(v.u0 + ((v.u1 - v.u0) * i) / 12, 0.25))
    top = Math.min(top, y)
  }
  top = Math.max(0, Math.floor(top / 2) * 2)
  if (top >= H) return
  // At half the stage's resolution: the ripple softens it anyway.
  const w = Math.ceil(W / 2)
  const h = Math.ceil(H / 2)
  if (!mirrored || mirrored.p !== p) {
    const g = p.createGraphics(w, h)
    g.pixelDensity(1)
    mirrored = { p, g }
  }
  const g = mirrored.g
  if (g.width !== w || g.height !== h) g.resizeCanvas(w, h)
  const gp = g as unknown as p5
  // The stage's drawing modes (`engine.ts`), which a canvas of its own does not have.
  gp.rectMode(gp.CENTER)
  gp.angleMode(gp.RADIANS)
  gp.strokeCap(gp.ROUND)
  gp.strokeJoin(gp.ROUND)
  const gc = g.drawingContext as Ctx2D
  gc.setTransform(1, 0, 0, 1, 0, 0)
  gc.globalCompositeOperation = 'source-over'
  gc.globalAlpha = 1
  gc.clearRect(0, top / 2, w, h - top / 2)
  gc.setTransform(new DOMMatrix([0.5, 0, 0, 0.5, 0, 0]).multiply(ctx.getTransform()))
  drawStones(gp, c, v, day, true)
  // Faded with depth, and nothing of it out of the water.
  gc.globalCompositeOperation = 'destination-in'
  const fade = gc.createRadialGradient(0, 0, (RADIUS - 2.2) * k, 0, 0, RADIUS * k)
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  fade.addColorStop(0.55, 'rgba(0, 0, 0, 0.18)')
  fade.addColorStop(1, 'rgba(0, 0, 0, 1)')
  gc.fillStyle = fade
  gc.fill(water)
  gc.globalCompositeOperation = 'source-over'
  const src = (g as unknown as { elt: HTMLCanvasElement }).elt
  const row = Math.max(2, Math.round(H / 240 / 2) * 2)
  const amp = H / 1500
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = strength
  for (let y = top; y < H; y += row) {
    const deep = (y - top) / H
    const dx = amp * (0.5 + deep * 7) * (0.6 * osc(c.t, 0.42, (y / H) * 190) + 0.4 * osc(c.t, 0.27, -(y / H) * 311))
    ctx.drawImage(src, 0, y / 2, w, row / 2, dx, y, w * 2, row)
  }
  ctx.restore()
}

// ---------------------------------------------------------------- over the ball

/**
 * A grace note's spark: the grace leans on the melody note after it, a breath ahead of it, and strikes a light
 * where the ball is about to come down on that note, a lamp's wick in the first Gnossienne.
 */
const SPARKS = GRACES.map((g) => {
  const on = MELODY.find((n) => n.t > g.t) ?? MELODY[0]
  const b = ballLocal(on.t)
  return { t: g.t, u: b.u, h: b.h - BALL_R }
})

/** How much the ball carries its flame at `t`: from dusk, as the first Gnossienne begins, until it ends. */
const [, GN1_PIECE] = PIECES
const lamplighter = (t: number): number => {
  const u = wrap(t)
  return smooth(u, GN1_PIECE.from - 3, GN1_PIECE.from + 3) * (1 - smooth(u, GN1_PIECE.last - 2, GN1_PIECE.end + 2))
}

/** A soft round light, drawn once and stamped: a lamp, or an open flower, seen from far off. */
const halos = new Map<string, HTMLCanvasElement>()
function haloSprite(core: string, mid: string, edge: string): HTMLCanvasElement {
  const key = core + mid
  const got = halos.get(key)
  if (got) return got
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, `rgba(${core}, 1)`)
  r.addColorStop(0.12, `rgba(${mid}, 0.85)`)
  r.addColorStop(0.4, `rgba(${edge}, 0.22)`)
  r.addColorStop(1, `rgba(${edge}, 0)`)
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  halos.set(key, c)
  return c
}

export const glints = scenery<null>('glints', () => {}, (p, _s, c) => {
  const v = viewOf(p, c)
  const k = c.k
  const ctx = p.drawingContext as Ctx2D
  // A grace note's spark, just ahead of the ball.
  for (const g of SPARKS) {
    const s = since(c.t, g.t)
    if (s < 0 || s > 0.7) continue
    const a = (1 - Math.exp(-s / 0.012)) * Math.exp(-s / 0.2)
    const [x, y] = polar(g.u, g.h)
    ctx.save()
    const r = k * (0.08 + 0.12 * Math.min(1, s / 0.25))
    const glow = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r)
    glow.addColorStop(0, `rgba(255, 246, 220, ${(0.95 * a).toFixed(3)})`)
    glow.addColorStop(0.3, `rgba(255, 214, 150, ${(0.5 * a).toFixed(3)})`)
    glow.addColorStop(1, 'rgba(255, 214, 150, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(x * k - r, y * k - r, 2 * r, 2 * r)
    ctx.restore()
  }
  // Far off: the lamps the ball has lit tonight, a thread of lights round the planet, and after them, fainter, the
  // flowers it has opened.
  const afar = smooth(v.cells, 10, 26)
  if (afar > 0.01) {
    const lamp = haloSprite('255, 236, 196', '255, 214, 150', '242, 170, 80')
    const flower = haloSprite('250, 236, 238', '240, 204, 212', '214, 170, 196')
    const H = ctx.canvas.height
    const spots: [number, number, number, HTMLCanvasElement][] = []
    for (const { stone, shift } of stonesIn(v.u0, v.u1)) {
      if (stone.piece === 1) {
        const burning = lampLight(stone, c.t)
        if (burning < 0.02) continue
        const light = burning + 0.7 * cadence(stone, c.t)
        const [x, y] = onCanvas(ctx, k, ...polar(stone.u0 + shift + 0.1, stone.h - sink(stone, c.t) + 0.08))
        spots.push([x, y, light, lamp])
      } else if (stone.piece === 2 && stone.u1 - stone.u0 > 0.9) {
        const open = bloom(stone, c.t)
        if (open < 0.02) continue
        const w = stone.u1 - stone.u0
        const fx = w - Math.min(0.24, (w / Math.ceil(w / SEGMENT[2])) * 0.25)
        const [x, y] = onCanvas(ctx, k, ...polar(stone.u0 + shift + fx, stone.h + float(stone, c.t) + 0.05))
        spots.push([x, y, open * (0.55 + 0.8 * cadence(stone, c.t)), flower])
      }
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    for (const [x, y, light, sprite] of spots) {
      const r = H * (0.006 + 0.008 * light)
      ctx.globalAlpha = Math.min(1, afar * light * 1.3)
      ctx.drawImage(sprite, x - r, y - r, 2 * r, 2 * r)
    }
    ctx.restore()
  }
  // Rain, falling past the frame.
  const rain = rainAt(c.t)
  if (rain > 0.01) {
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    const len = H * 0.04
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, H / 900)
    ctx.strokeStyle = `rgba(226, 232, 242, ${(0.28 * rain).toFixed(3)})`
    ctx.beginPath()
    const count = Math.round(260 * rain)
    for (let i = 0; i < count; i++) {
      const d = dropAt(i, c.t)
      const x = d.x * (W + len) - len * 0.2
      const y = d.y * (H + len) - len
      ctx.moveTo(x, y)
      ctx.lineTo(x - len * 0.18, y + len)
    }
    ctx.stroke()
    ctx.restore()
  }
  // Fireflies over the pond, close: each wandering a little, blinking slowly on and off.
  const flies = firefliesOut(c.t) * (1 - smooth(v.cells, 9, 16))
  if (flies > 0.01) {
    const sprite = haloSprite('255, 252, 220', '232, 246, 168', '190, 226, 120')
    const m = ctx.getTransform()
    const cell = Math.hypot(m.a, m.b) * k
    const here = along(c.t)
    const half = (v.u1 - v.u0) / 2
    ctx.save()
    for (const f of FIREFLIES) {
      const d = layered(f.x, c.t, FIREFLY.f, FIREFLY.span, FIREFLY.wind) + 0.3 * osc(c.t, 0.035 + 0.03 * hash(f.seed, 141), f.seed)
      const edge = inLayer(d, FIREFLY.span)
      if (Math.abs(d) > half || edge < 0.01) continue
      const h = f.h + 0.22 * osc(c.t, 0.05 + 0.04 * hash(f.seed, 142), f.seed * 1.3)
      const blink = Math.max(0, osc(c.t, 0.08 + 0.07 * hash(f.seed, 143), f.seed * 2.7)) ** 1.5
      const a = flies * edge * (0.25 + 0.75 * blink)
      if (a < 0.02) continue
      const [x, y] = onCanvas(ctx, k, ...polar(here + d, h), m)
      const r = cell * (0.1 + 0.16 * blink)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = a
      ctx.drawImage(sprite, x - r, y - r, 2 * r, 2 * r)
      ctx.fillStyle = '#F6FBD2'
      ctx.beginPath()
      ctx.arc(x, y, Math.max(1, cell * 0.012), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  // A cadence's wave, running back along the way: its front a soft light over the stones it is passing, gold over the
  // lamps, pink over the flowers, warm over the columns in the sunset.
  for (const front of cadenceFronts(c.t)) {
    const near = stonesIn(front.u - 0.6, front.u + 0.6)
    if (!near.length) continue
    const { stone, shift } = near[0]
    const H = ctx.canvas.height
    const m = ctx.getTransform()
    const cell = Math.hypot(m.a, m.b) * k
    const at = front.u - shift
    const h = stone.h - sink(stone, c.t) + float(stone, c.t) + 0.1
    const [x, y] = onCanvas(ctx, k, ...polar(at + shift, h))
    const sprite = stone.piece === 2
      ? haloSprite('255, 244, 246', '244, 206, 218', '220, 170, 200')
      : stone.piece === 1
        ? haloSprite('255, 240, 204', '255, 214, 150', '242, 170, 80')
        : haloSprite('255, 248, 232', '255, 226, 186', '255, 196, 150')
    const r = Math.max(H * 0.03, cell * 0.9)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, 0.9 * front.light)
    ctx.drawImage(sprite, x - r, y - r, 2 * r, 2 * r)
    ctx.restore()
  }
  // The lamplighter's own light: through the first Gnossienne the ball carries a small warm glow, the flame it lights
  // the lamps with, breathing a little.
  const flame = lamplighter(c.t) * (1 - v.wide)
  if (flame > 0.01) {
    const b = ballLocal(c.t)
    const [x, y] = polar(b.u, b.h)
    const r = k * (0.55 + 0.05 * osc(c.t, 0.31))
    const g = ctx.createRadialGradient(x * k, y * k, k * BALL_R * 0.8, x * k, y * k, r)
    g.addColorStop(0, `rgba(255, 210, 140, ${(0.3 * flame).toFixed(3)})`)
    g.addColorStop(0.35, `rgba(255, 190, 110, ${(0.1 * flame).toFixed(3)})`)
    g.addColorStop(1, 'rgba(255, 190, 110, 0)')
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = g
    ctx.fillRect(x * k - r, y * k - r, 2 * r, 2 * r)
    ctx.restore()
  }
  // Wide: a light round the ball, so the eye can find it on the small planet.
  if (v.wide > 0.02) {
    const b = ballLocal(c.t)
    const [x, y] = polar(b.u, b.h)
    const r = 22 * Math.max(1, p.width / 1600)
    const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r)
    g.addColorStop(0, `rgba(255, 240, 210, ${(0.85 * v.wide).toFixed(3)})`)
    g.addColorStop(0.2, `rgba(255, 228, 180, ${(0.35 * v.wide).toFixed(3)})`)
    g.addColorStop(1, 'rgba(255, 228, 180, 0)')
    ctx.save()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x * k, y * k, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
})

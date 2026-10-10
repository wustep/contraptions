import { mixHex } from '../../../../parts'
import { MELODY, PERIOD, osc, wrap } from './music'
import { RADIUS, along } from './path'
import { inLayer, layered, mistAt, overcastAt, repeatOf } from './air'
import { hash, polar, smooth, type Sky } from './world'
import { devicePx, haloSprite, type Ctx2D } from './frame'

/**
 * The far shore: islands out on the horizon, behind the stones and the boats, in front of the bank of cloud; and
 * behind them, fainter, a range of mountains further still. The sea was a line with nothing beyond it; now the ball
 * goes along a coast, as a day's sailing in the Aegean would.
 *
 * Each island is centred in the frame at its own moment of the day (`T`), so the day is told by what is out there: a
 * temple on its hill in the morning sun, a mountain the shower comes down on, a white village with a windmill in the
 * evening, a lighthouse on a headland for the night, a hermitage between two peaks under the moon. They are far, so
 * they go by slowly (a layer at depth `f` passes at `f` of the ball's pace, `layered`), each taking a couple of minutes
 * to cross the frame, and they come round with the period: the layer's repeat is `f` of the way round, once.
 *
 * Lit by the day: the sun's side paler and warm, the air between thickening their colour to the horizon's, more in
 * the shower and the mist; at dusk they go to silhouettes against the sunset, and dark against the night. At dusk,
 * as the ball lights the colonnade's lamps, the villages' windows light one by one, and go out one by one late in
 * the night, a few left for the dawn; the lighthouse is lit with the ball's first lamp and turns all night, its
 * beam sweeping across the dark and flashing as it comes round to face us, until the dawn puts it out with the lamps.
 */

/** The islands' layer, and the mountains' further off. */
export const SHORE = { f: 0.16, span: repeatOf(0.16, 1), wind: 0 }
export const RANGE = { f: 0.07, span: repeatOf(0.07, 1), wind: 0 }
type Layer = typeof SHORE

/** A light in a window: its place on the island (cells along, and up), and when it is lit and put out (show time). */
interface Window {
  s: number
  y: number
  on: number
  off: number
}

interface House {
  s: number
  /** Its foot (in the island's frame) and its height, its width, cells. */
  y: number
  h: number
  w: number
  window: Window | null
}

export interface Isle {
  /** Where it is in its layer's repeat, cells. */
  x: number
  layer: Layer
  /** How thick the air is between us and it, 0 none, 1 it is the horizon's colour. */
  haze: number
  /** Its profile: bumps along it, (middle, height, width), cells from its middle. */
  bumps: [number, number, number][]
  /** How far it reaches either way, cells; its outline (along, up in its own frame), cells. */
  reach: number
  outline: [number, number][]
  houses: House[]
  cypress: [number, number][]
  temple: number | null
  chapel: number | null
  windmill: number | null
  lighthouse: number | null
  seed: number
}

/** How high an island stands at `s` cells from its middle. */
export function heightOf(isle: Pick<Isle, 'bumps' | 'seed'>, s: number): number {
  let y = 0
  for (const [c, h, w] of isle.bumps) y += h * Math.exp(-(((s - c) / w) ** 2))
  // Weathered: a little rise and fall along its skyline, more where it is high.
  const rough = 0.035 * Math.sin(s * 7.3 + isle.seed) + 0.02 * Math.sin(s * 17.1 + isle.seed * 2.1)
  return Math.max(0, y * (1 + rough))
}

/**
 * How high a point `s` cells along from an island's middle is over the line square to the sea there: the sea curves
 * away under a wide island, so its ends are drawn down with it, and do not stand off the water.
 */
const sag = (s: number): number => (s * s) / (2 * RADIUS)

/** How high its ground is at `s`, in its own frame (over the line square to the sea at its middle). */
export const groundOf = (isle: Pick<Isle, 'bumps' | 'seed'>, s: number): number => heightOf(isle, s) - sag(s)

/** When the windows are lit, at dusk, as the colonnade's lamps are; and put out, late in the night, a few at dawn. */
function windowOf(s: number, y: number, seed: number, keep = false): Window {
  const on = 198 + 44 * hash(seed, 301)
  const late = keep || hash(seed, 302) < 0.22
  const off = late ? PERIOD + 1 + 2.5 * hash(seed, 303) : 470 + 140 * hash(seed, 304)
  return { s, y, on, off }
}

interface Spec {
  /** The moment it is in the middle of the frame. */
  T: number
  layer?: Layer
  haze?: number
  bumps: [number, number, number][]
  /** Houses: how crowded (0 to 1), between where and where along it. */
  village?: [number, number, number]
  cypress?: number[]
  temple?: number
  chapel?: number
  windmill?: number
  lighthouse?: number
  /** A house that keeps its light all night. */
  hermit?: number
}

function isle(spec: Spec, seed: number): Isle {
  const layer = spec.layer ?? SHORE
  const base = { bumps: spec.bumps, seed }
  let reach = 0
  for (const [c, , w] of spec.bumps) reach = Math.max(reach, Math.abs(c) + w * 1.9)
  const outline: [number, number][] = []
  const N = 72
  for (let i = 0; i <= N; i++) {
    const s = -reach + (2 * reach * i) / N
    outline.push([s, groundOf(base, s)])
  }
  const houses: House[] = []
  if (spec.village) {
    // Terraces of white cubes up the hillside, packed side by side, thickest in the village's middle.
    const [crowd, a, b] = spec.village
    const mid = (a + b) / 2
    const spread = (b - a) / 2
    let n = 0
    for (let row = 0; row < 16; row++) {
      const y = 0.02 + row * 0.04
      let at = a + 0.06 * hash(seed, row, 310)
      while (at < b) {
        const i = n++
        const w = 0.055 + 0.05 * hash(seed, i, 313)
        const s = at + w / 2
        const here = crowd * Math.exp(-(((s - mid) / (spread * 0.85)) ** 2))
        if (heightOf(base, s) > y + 0.06 && hash(seed, i, 311) < here) {
          const h = 0.045 + 0.022 * hash(seed, i, 314)
          const lit = hash(seed, i, 315) < 0.5
          houses.push({ s, y: y - sag(s), h, w, window: lit ? windowOf(s + (hash(seed, i, 316) - 0.5) * w * 0.4, y - sag(s) + h * 0.5, seed * 997 + i) : null })
        }
        at += w + (hash(seed, i, 312) < 0.22 ? 0.03 + 0.06 * hash(seed, i, 317) : 0.003)
      }
    }
  }
  if (spec.hermit !== undefined) {
    const s = spec.hermit
    const y = groundOf(base, s) - 0.04
    houses.push({ s, y, h: 0.06, w: 0.1, window: windowOf(s + 0.015, y + 0.03, seed * 97 + 90, true) })
  }
  if (spec.lighthouse !== undefined) {
    // The keeper's house beside it.
    const s = spec.lighthouse - 0.22
    const y = groundOf(base, s) - 0.03
    houses.push({ s, y, h: 0.06, w: 0.11, window: windowOf(s - 0.02, y + 0.028, seed * 97 + 91, true) })
  }
  // Back to front: the highest behind.
  houses.sort((p, q) => q.y - p.y)
  return {
    x: layer.f * along(spec.T),
    layer,
    haze: spec.haze ?? (layer === RANGE ? 0.72 : 0.36),
    bumps: spec.bumps,
    reach,
    outline,
    houses,
    cypress: (spec.cypress ?? []).map((s) => [s, groundOf(base, s)]),
    temple: spec.temple ?? null,
    chapel: spec.chapel ?? null,
    windmill: spec.windmill ?? null,
    lighthouse: spec.lighthouse ?? null,
    seed,
  }
}

export const ISLES: Isle[] = [
  // Far off, the mountains: a long range behind the morning, a lower one dark under the stars and the moon.
  { T: 112, layer: RANGE, bumps: [[-2.6, 0.62, 1.5], [-0.3, 1.05, 1.3], [1.9, 0.78, 1.4], [3.7, 0.4, 1]] },
  { T: 440, layer: RANGE, bumps: [[-1.6, 0.55, 1.4], [0.9, 0.82, 1.1], [2.6, 0.4, 0.9]] },
  // Skerries at dawn.
  { T: 38, bumps: [[-0.5, 0.17, 0.42], [0.35, 0.25, 0.38], [0.95, 0.09, 0.3]] },
  // The temple on its hill, in the morning sun, with cypresses and a hamlet by the shore.
  { T: 92, bumps: [[-1.3, 0.3, 1.1], [0.25, 0.5, 0.85], [1.6, 0.24, 0.8]], temple: 0.25, cypress: [-0.42, -0.3, 0.86, 0.98, -1.5], village: [0.7, -2.25, -1.55] },
  // The mountain the shower comes down on.
  { T: 146, haze: 0.44, bumps: [[0, 1.0, 0.85], [-1.0, 0.42, 0.85], [1.15, 0.45, 1.0]], village: [0.6, 1.3, 2.2] },
  // The village, white up its hill, a chapel's dome at the top and a windmill on the ridge: its windows lit at dusk.
  { T: 188, bumps: [[-0.55, 0.62, 0.95], [0.9, 0.44, 1.05], [-1.9, 0.2, 0.6]], village: [0.78, -1.5, 1.25], chapel: -0.5, windmill: 1.45, cypress: [-1.7, 1.85] },
  // The headland and its lighthouse, lit with the ball's first lamp.
  { T: 238, bumps: [[-0.9, 0.4, 0.85], [0.35, 0.28, 0.75], [1.35, 0.16, 0.45]], lighthouse: 1.5, cypress: [-1.25, -1.12] },
  // A long low island in the first Gnossienne's night, a few windows.
  { T: 362, bumps: [[-1.6, 0.2, 1.3], [0.4, 0.28, 1.5], [2.1, 0.14, 0.8]], village: [0.35, -0.5, 0.7] },
  // The hermitage between two peaks, under the moon, its one window lit all night.
  { T: 506, bumps: [[-0.75, 0.78, 0.62], [0.55, 0.66, 0.58], [1.65, 0.22, 0.65], [-1.9, 0.18, 0.6]], hermit: -0.08, chapel: 0.08 },
  // A sea stack before the dawn.
  { T: 586, bumps: [[0, 0.3, 0.3], [0.45, 0.14, 0.28]] },
].map((s, i) => isle(s as Spec, i + 1))

/** The moment the ball lights its first lamp: the lighthouse is lit with it. */
export const LIGHTHOUSE_ON = MELODY.find((n) => n.piece === 1)!.t
/** A turn of its light: a whole number a period, so it comes round. */
export const BEAM_TURNS = 30

/** How much of a light that is lit at `on` and put out at `off` (either may be past the period's end) is lit at `t`. */
function between(t: number, on: number, off: number, fade = 1.5): number {
  const u = wrap(t)
  const at = (x: number) => smooth(x, on, on + fade) * (1 - smooth(x, off, off + fade))
  return Math.max(at(u), at(u + PERIOD))
}

/** How lit the lighthouse is at `t`: from the ball's first lamp until the dawn puts the lamps out. */
export const lighthouseAt = (t: number): number => between(t, LIGHTHOUSE_ON, PERIOD + 2.2, 1.2)

/** How lit a window is at `t`. */
export const windowAt = (w: Window, t: number): number => between(t, w.on, w.off) * (0.92 + 0.08 * osc(t, 0.31, w.on))

/** The lighthouse's beam at `t`: which way it points round (0 at us), and so how far across and how much at us. */
export function beamAt(t: number): { across: number; facing: number } {
  const a = (2 * Math.PI * BEAM_TURNS * wrap(t)) / PERIOD
  return { across: Math.sin(a), facing: Math.cos(a) }
}

/** The windmill's sails: whole turns a period. */
const SAIL_TURNS = 64

/** The colours an island is drawn in at one moment. */
interface Tone {
  body: string
  lit: string
  white: string
  shade: string
  haze: string
  /** How much the sun lights its side, and which side (-1 west, 1 east). */
  sun: number
  side: number
  /** How dark the day is, 0 to 1, and the moon's silver on its edge. */
  dark: number
  rim: number
}

function toneOf(isle: Isle, day: Sky, t: number, sunAngle: number, moonUp: number): Tone {
  const o = overcastAt(t)
  const thick = Math.min(1, isle.haze + 0.4 * o + 0.25 * mistAt(t) * (1 - day.night))
  // The air's own colour at that distance: the horizon's, a little of the sky's.
  const air = mixHex(day.low, day.top, 0.25)
  const dark = smooth(day.night, 0.05, 0.85)
  const rock = mixHex('#6E7F86', '#8A8577', 0.4)
  const night = mixHex(mixHex(day.top, day.low, 0.3), '#03050C', 0.42 - 0.3 * isle.haze)
  const body = mixHex(mixHex(rock, air, thick), night, dark)
  const low = smooth(Math.abs(sunAngle), 0.7, 1.7)
  const sunlit = mixHex(mixHex('#E9E1CF', '#F2C793', low), air, thick * 0.6)
  const up = Math.abs(sunAngle) < 1.75 ? 1 - smooth(Math.abs(sunAngle), 1.55, 1.75) : 0
  const sun = up * (1 - o) * (1 - dark) * (1 - 0.6 * thick)
  // Whitewash, taking the sun's colour when it is low, and the air's at its distance.
  const lime = mixHex(mixHex('#F4F0E7', sunlit, 0.5 * sun * low), air, thick * 0.8)
  // Whitewash goes grey sooner than the hill does: at dusk it is only a little paler than the island.
  const white = mixHex(lime, mixHex(body, mixHex(night, '#2A3150', 0.35), dark), smooth(day.night, 0.02, 0.5) * 0.85)
  return {
    body,
    lit: sunlit,
    white,
    shade: mixHex(white, body, 0.5 + 0.3 * dark),
    haze: air,
    sun,
    side: Math.sin(sunAngle) >= 0 ? 1 : -1,
    dark,
    rim: moonUp * dark * (1 - 0.5 * thick),
  }
}

const outlines = new WeakMap<Isle, Path2D>()
function outlineOf(isle: Isle): Path2D {
  let got = outlines.get(isle)
  if (got) return got
  got = new Path2D()
  got.moveTo(-isle.reach, 0.2 + sag(isle.reach))
  for (const [s, y] of isle.outline) got.lineTo(s, -y)
  got.lineTo(isle.reach, 0.2 + sag(isle.reach))
  got.closePath()
  outlines.set(isle, got)
  return got
}

/** Into the frame of a point on the sea `u` cells round: its foot at the origin, up the frame's up, a cell a unit. */
function seaFrame(ctx: Ctx2D, k: number, u: number): void {
  const [x, y] = polar(u, 0)
  ctx.translate(x * k, y * k)
  ctx.rotate(u / RADIUS)
  ctx.scale(k, k)
}

/** Where each island is at `t` (cells along the sea from the ball's own place), and how much of it is drawn. */
export function islesIn(t: number, half: number): { isle: Isle; d: number; edge: number }[] {
  const out: { isle: Isle; d: number; edge: number }[] = []
  for (const isle of ISLES) {
    const { f, span, wind } = isle.layer
    const d = layered(isle.x, t, f, span, wind)
    const edge = inLayer(d, span)
    if (Math.abs(d) > half + isle.reach + 0.5 || edge < 0.01) continue
    out.push({ isle, d, edge })
  }
  return out
}

export interface ShoreLight {
  day: Sky
  sunAngle: number
  moonUp: number
}

/**
 * The far shore, drawn in the world's transform: each island standing on the curve of the sea, the range first. The
 * sea is drawn over their feet.
 */
export function drawShore(ctx: Ctx2D, k: number, t: number, half: number, light: ShoreLight, alpha: number): void {
  if (alpha < 0.01) return
  const u = along(t)
  for (const { isle, d, edge } of islesIn(t, half)) {
    const tone = toneOf(isle, light.day, t, light.sunAngle, light.moonUp)
    ctx.save()
    seaFrame(ctx, k, u + d)
    ctx.globalAlpha = alpha * edge
    drawIsle(ctx, isle, tone, t, false)
    ctx.restore()
  }
  // The lighthouse's beam, over its island and the sky.
  const lit = lighthouseAt(t)
  if (lit > 0.01) {
    for (const { isle, d, edge } of islesIn(t, half + 8)) {
      if (isle.lighthouse === null) continue
      ctx.save()
      seaFrame(ctx, k, u + d)
      ctx.globalAlpha = alpha * edge
      beam(ctx, isle, t, lit * smooth(light.day.night, 0.25, 0.7))
      ctx.restore()
    }
  }
}

/**
 * The far shore given back by the sea, for the mirror: drawn upside down from the waterline, its body and its lights;
 * the mirror ripples it and fades it with depth.
 */
export function mirrorShore(ctx: Ctx2D, k: number, t: number, half: number, light: ShoreLight): void {
  const u = along(t)
  for (const { isle, d, edge } of islesIn(t, half)) {
    const tone = toneOf(isle, light.day, t, light.sunAngle, light.moonUp)
    ctx.save()
    seaFrame(ctx, k, u + d)
    ctx.scale(1, -1)
    ctx.globalAlpha = edge * (isle.layer === RANGE ? 0.5 : 0.85)
    drawIsle(ctx, isle, tone, t, true)
    ctx.restore()
  }
}

/** One island in its own frame, a cell a unit, up negative. */
function drawIsle(ctx: Ctx2D, isle: Isle, tone: Tone, t: number, mirrored: boolean): void {
  const shape = outlineOf(isle)
  const top = Math.max(...isle.bumps.map(([, h]) => h)) * 1.1
  const R = isle.reach
  const alpha = ctx.globalAlpha
  ctx.fillStyle = tone.body
  ctx.fill(shape)
  if (!mirrored) {
    // The side towards the sun lit, warm when it is low; the other in the shade of the hill. (Each a fill of its
    // shape with a gradient, not a clip to it.)
    if (tone.sun > 0.01) {
      const g = ctx.createLinearGradient(tone.side * R, 0, -tone.side * R * 0.2, 0)
      g.addColorStop(0, tone.lit)
      g.addColorStop(1, tone.lit + '00')
      ctx.globalAlpha = alpha * 0.55 * tone.sun
      ctx.fillStyle = g
      ctx.fill(shape)
    }
    // Its feet in the haze over the water.
    const h = ctx.createLinearGradient(0, 0, 0, -Math.min(top, 0.5))
    h.addColorStop(0, tone.haze)
    h.addColorStop(1, tone.haze + '00')
    ctx.globalAlpha = alpha * (0.5 + 0.3 * isle.haze) * (1 - 0.5 * tone.dark)
    ctx.fillStyle = h
    ctx.fill(shape)
    ctx.globalAlpha = alpha
    // The moon's silver along its skyline.
    if (tone.rim > 0.01) {
      ctx.save()
      ctx.strokeStyle = `rgba(196, 210, 236, ${(0.32 * tone.rim).toFixed(3)})`
      ctx.lineWidth = Math.max(devicePx(ctx), 0.008)
      ctx.lineJoin = 'round'
      ctx.beginPath()
      isle.outline.forEach(([s, y], i) => (y < 0.02 ? null : i && isle.outline[i - 1][1] >= 0.02 ? ctx.lineTo(s, -y) : ctx.moveTo(s, -y)))
      ctx.stroke()
      ctx.restore()
    }
  }
  const px = devicePx(ctx)
  // In the water only its body and its lights: the rest would be specks in the ripple.
  if (!mirrored) details(ctx, isle, tone, t, px)
  lights(ctx, isle, t, px, alpha, !mirrored)
}

/** What stands on an island: its trees, its temple, its houses, the chapel, the windmill and the lighthouse. */
function details(ctx: Ctx2D, isle: Isle, tone: Tone, t: number, px: number): void {
  // Cypresses: dark spires.
  ctx.fillStyle = mixHex(tone.body, '#1E2A26', 0.5 * (1 - tone.dark))
  for (const [s, y] of isle.cypress) {
    const hgt = 0.11 + 0.05 * hash(Math.round(s * 100), isle.seed, 321)
    ctx.beginPath()
    ctx.ellipse(s, -y - hgt * 0.42, Math.max(px, 0.018), hgt * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // The temple: a stylobate, six columns and their entablature, a pediment.
  if (isle.temple !== null) {
    const s = isle.temple
    const y = groundOf(isle, s) - 0.02
    const w = 0.4
    const colH = 0.13
    ctx.fillStyle = tone.white
    ctx.fillRect(s - w / 2 - 0.02, -y - 0.03, w + 0.04, 0.03)
    for (let i = 0; i < 6; i++) {
      const cx = s - w / 2 + 0.02 + (i * (w - 0.04)) / 5
      ctx.fillStyle = (i < 3) === tone.side < 0 ? tone.white : tone.shade
      ctx.fillRect(cx - 0.012, -y - 0.03 - colH, Math.max(px, 0.024), colH)
    }
    ctx.fillStyle = tone.white
    ctx.fillRect(s - w / 2 - 0.01, -y - 0.03 - colH - 0.035, w + 0.02, 0.035)
    ctx.beginPath()
    ctx.moveTo(s - w / 2 - 0.015, -y - 0.03 - colH - 0.035)
    ctx.lineTo(s, -y - 0.03 - colH - 0.1)
    ctx.lineTo(s + w / 2 + 0.015, -y - 0.03 - colH - 0.035)
    ctx.closePath()
    ctx.fill()
  }
  // Houses: white cubes up the hill, the side away from the sun in shade; each colour one fill.
  if (isle.houses.length) {
    const white = new Path2D()
    const shade = new Path2D()
    for (const { s, y, w, h } of isle.houses) {
      white.rect(s - w / 2, -y - h, w, h + 0.02)
      const sw = w * 0.32
      shade.rect(tone.side > 0 ? s - w / 2 : s + w / 2 - sw, -y - h, sw, h + 0.02)
    }
    ctx.fillStyle = tone.white
    ctx.fill(white)
    ctx.fillStyle = tone.shade
    ctx.fill(shade)
  }
  // The chapel: a white cube with a blue dome.
  if (isle.chapel !== null) {
    const s = isle.chapel
    const y = groundOf(isle, s) - 0.025
    ctx.fillStyle = tone.white
    ctx.fillRect(s - 0.06, -y - 0.08, 0.12, 0.1)
    ctx.fillStyle = mixHex(mixHex('#4D70A6', tone.haze, isle.haze * 0.8), tone.body, 0.85 * tone.dark)
    ctx.beginPath()
    ctx.arc(s, -y - 0.08, 0.05, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(s - Math.max(px, 0.006) / 2, -y - 0.155, Math.max(px, 0.006), 0.03)
  }
  // The windmill: a round white tower, a dark cap, and four sails turning in the wind, whole turns a period.
  if (isle.windmill !== null) {
    const s = isle.windmill
    const y = groundOf(isle, s) - 0.02
    ctx.fillStyle = tone.white
    ctx.beginPath()
    ctx.moveTo(s - 0.045, -y)
    ctx.lineTo(s - 0.035, -y - 0.15)
    ctx.lineTo(s + 0.035, -y - 0.15)
    ctx.lineTo(s + 0.045, -y)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = mixHex(tone.body, '#3A3330', 0.4 * (1 - tone.dark))
    ctx.beginPath()
    ctx.arc(s, -y - 0.15, 0.037, Math.PI, 0)
    ctx.fill()
    const turn = (2 * Math.PI * SAIL_TURNS * wrap(t)) / PERIOD
    ctx.strokeStyle = mixHex(tone.white, tone.body, 0.25)
    ctx.lineWidth = Math.max(px, 0.006)
    ctx.fillStyle = mixHex(tone.white, tone.body, 0.15)
    for (let i = 0; i < 4; i++) {
      const a = turn + (i * Math.PI) / 2
      const [cx, cy] = [s, -y - 0.155]
      const [ex, ey] = [cx + Math.cos(a) * 0.15, cy + Math.sin(a) * 0.15]
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      // Its cloth, on the trailing side of the spar.
      const b = a - 0.32
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * 0.04, cy + Math.sin(a) * 0.04)
      ctx.lineTo(ex, ey)
      ctx.lineTo(cx + Math.cos(b) * 0.14, cy + Math.sin(b) * 0.14)
      ctx.lineTo(cx + Math.cos(b) * 0.05, cy + Math.sin(b) * 0.05)
      ctx.closePath()
      ctx.fill()
    }
  }
  // The lighthouse: a white tower on the headland, a dark band, the lantern and its cap.
  if (isle.lighthouse !== null) {
    const s = isle.lighthouse
    const y = groundOf(isle, s) - 0.02
    const H = 0.3
    ctx.fillStyle = tone.white
    ctx.beginPath()
    ctx.moveTo(s - 0.038, -y)
    ctx.lineTo(s - 0.026, -y - H)
    ctx.lineTo(s + 0.026, -y - H)
    ctx.lineTo(s + 0.038, -y)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = tone.shade
    ctx.fillRect(tone.side > 0 ? s - 0.034 : s + 0.012, -y - H * 0.95, 0.022, H * 0.95)
    ctx.fillStyle = mixHex('#7A3A34', tone.body, 0.35 + 0.5 * tone.dark)
    ctx.fillRect(s - 0.033, -y - H * 0.55, 0.066, 0.04)
    ctx.fillStyle = mixHex('#2B2F38', tone.body, 0.3)
    ctx.fillRect(s - 0.036, -y - H - 0.008, 0.072, 0.01)
    ctx.fillRect(s - 0.022, -y - H - 0.06, 0.044, 0.012)
    ctx.beginPath()
    ctx.moveTo(s - 0.026, -y - H - 0.058)
    ctx.lineTo(s, -y - H - 0.09)
    ctx.lineTo(s + 0.026, -y - H - 0.058)
    ctx.closePath()
    ctx.fill()
    const lit = lighthouseAt(t)
    ctx.fillStyle = lit > 0.01 ? mixHex(tone.shade, '#FFE6B0', lit) : mixHex(tone.shade, '#3A4050', 0.5)
    ctx.fillRect(s - 0.018, -y - H - 0.048, 0.036, 0.04)
  }
}

/** The windows, warm points with a soft light round them, and the lighthouse's lamp. */
function lights(ctx: Ctx2D, isle: Isle, t: number, px: number, alpha: number, glow: boolean): void {
  const sprite = haloSprite('255, 236, 196', '255, 206, 132', '255, 178, 96')
  const far = isle.layer === RANGE ? 0.5 : 1
  // The lights themselves in one fill: those fully lit together, any coming on or going out on their own.
  const q = Math.max(px * 1.2, 0.014)
  const lit = new Path2D()
  let any = false
  ctx.fillStyle = '#FFE2A8'
  for (const house of isle.houses) {
    const w = house.window
    if (!w) continue
    const a = windowAt(w, t)
    if (a < 0.01) continue
    if (glow) {
      ctx.globalAlpha = alpha * a * far
      const r = 0.06
      ctx.drawImage(sprite, w.s - r, -w.y - r, 2 * r, 2 * r)
    }
    if (a > 0.9) {
      lit.rect(w.s - q / 2, -w.y - q / 2, q, q)
      any = true
    } else {
      ctx.globalAlpha = alpha * a * far
      ctx.fillRect(w.s - q / 2, -w.y - q / 2, q, q)
    }
  }
  if (any) {
    ctx.globalAlpha = alpha * far
    ctx.fill(lit)
  }
  ctx.globalAlpha = alpha
  // The lighthouse's lamp: a glow, flashing as the beam comes round to us.
  if (isle.lighthouse !== null) {
    const lit = lighthouseAt(t)
    if (lit > 0.01) {
      const s = isle.lighthouse
      const y = groundOf(isle, s) - 0.02 + 0.3 + 0.028
      const { facing } = beamAt(t)
      const flash = Math.max(0, facing) ** 8
      const r = 0.12 + 0.55 * flash
      ctx.globalAlpha = alpha * lit * (0.55 + 0.45 * flash)
      ctx.drawImage(haloSprite('255, 248, 228', '255, 232, 180', '255, 214, 150'), s - r, -y - r, 2 * r, 2 * r)
      ctx.globalAlpha = alpha
    }
  }
}

/**
 * The lighthouse's beam: a long soft wedge from its lantern along the horizon, to the side it is pointing, as long
 * as it points across, widening and brightening as it swings round towards us, faint as it swings away.
 */
function beam(ctx: Ctx2D, isle: Isle, t: number, light: number): void {
  if (light < 0.01 || isle.lighthouse === null) return
  const s = isle.lighthouse
  const y = -(groundOf(isle, s) - 0.02 + 0.3 + 0.028)
  const { across, facing } = beamAt(t)
  const L = 9 * Math.abs(across)
  if (L < 0.05) return
  const dir = across > 0 ? 1 : -1
  const toward = Math.max(0, facing)
  const spread = 0.05 + 0.5 * toward
  const a = light * (0.08 + 0.18 * toward) * (0.4 + 0.6 * smooth(L, 0, 2))
  const g = ctx.createLinearGradient(s, y, s + dir * L, y)
  g.addColorStop(0, `rgba(255, 238, 200, ${a.toFixed(3)})`)
  g.addColorStop(0.35, `rgba(255, 232, 190, ${(a * 0.45).toFixed(3)})`)
  g.addColorStop(1, 'rgba(255, 232, 190, 0)')
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  // Feathered: the wedge twice, the narrower over the wider, so it is brightest down its middle.
  for (const w of [1, 0.45]) {
    ctx.beginPath()
    ctx.moveTo(s, y - 0.012)
    ctx.lineTo(s + dir * L, y - spread * w)
    ctx.lineTo(s + dir * L, y + spread * w * 0.6)
    ctx.lineTo(s, y + 0.012)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

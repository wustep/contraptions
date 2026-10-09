import { mixHex } from '../../../../parts'
import { MELODY, PERIOD, PIECES, wrap } from './music'
import { LENGTH, along, since } from './path'
import { hash, osc, smooth, type Sky } from './world'

/**
 * The air over the sea, at depths behind the stones: what makes the planet's sky a sky.
 *
 * - Clouds, in two layers: a low bank on the horizon, far off, and cumulus over the stones, nearer. Each is lit from
 *   wherever the sun or the moon is, warm from the side at dawn and dusk, silver under the moon, and drifts on the
 *   wind.
 * - Gulls by day, overtaking the ball along the colonnade.
 * - The Milky Way at night, turning with the stars, and a shooting star on the top note of the first Gnossienne's high
 *   phrase and of the third's.
 * - Mist on the water at dawn and under the moon, and fireflies over the pond.
 *
 * Far things move across the frame slower than near ones: a layer at depth `f` goes by at `f` of the ball's pace
 * (`layered`). So that nothing jumps when the period comes round, a layer's pattern repeats a whole number of times in
 * `f` of the way round, and its wind carries it a whole number of repeats a period.
 */

/**
 * Where a thing in a layer is at show time `t`: cells along the sea from the ball's own place, taken into the
 * repeat nearest it. The layer is at depth `f` (1 is the stones', 0 the sky's infinity), repeats every `span` cells, and
 * is carried `wind` repeats a period, against the ball's way.
 */
export function layered(x: number, t: number, f: number, span: number, wind: number): number {
  const d = x - f * along(t) - (wind * span * wrap(t)) / PERIOD
  return d - span * Math.round(d / span)
}

/**
 * How much of a thing at `d` (from `layered`) is drawn: all of it near the ball, none towards the edge of its repeat,
 * where it comes round from the other side; so when the camera draws out wider than a layer's repeat, nothing in it
 * jumps across the frame.
 */
export const inLayer = (d: number, span: number): number => 1 - smooth(Math.abs(d), span * 0.34, span * 0.48)

/** A layer's repeat: `f` of the way round, in `n` repeats, so it comes round with the period. */
export const repeatOf = (f: number, n: number): number => (f * LENGTH) / n

// ---------------------------------------------------------------- clouds

export interface Cloud {
  /** Where it is in its layer's repeat, cells. */
  x: number
  /** Which of the sky's share of cloud it is: there while the cover is over it (`coverAt`). */
  rank: number
  /** Its foot over the sea, cells; its width. */
  h: number
  w: number
  /** Its billows: centre along (from its middle) and up (from its foot), and radius, cells. */
  puffs: [number, number, number][]
}

function cumulus(seed: number, x: number, h: number, w: number, tall: number): Cloud {
  const rank = hash(seed, 0, 40)
  const n = 3 + Math.floor(w * 2.2)
  const puffs: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n
    // Billows biggest in the middle, a little rise and fall between them.
    const r = w * (0.11 + 0.1 * Math.sin(Math.PI * s) + 0.05 * hash(seed, i, 41)) * tall
    const cx = (s - 0.5) * w * 0.82 + (hash(seed, i, 42) - 0.5) * w * 0.06
    puffs.push([cx, r * (0.45 + 0.35 * hash(seed, i, 43)) * Math.sin(Math.PI * (0.25 + 0.5 * s)), r])
  }
  // A second, smaller row on top for a crown.
  const m = Math.max(1, Math.floor(n / 2) - 1)
  for (let i = 0; i < m; i++) {
    const s = (i + 0.5) / m
    const r = w * (0.1 + 0.06 * hash(seed, i, 44)) * tall
    puffs.push([(s - 0.5) * w * 0.45 + (hash(seed, i, 45) - 0.4) * w * 0.15, r * 1.6 + w * 0.08 * tall, r])
  }
  return { x, rank, h, w, puffs }
}

/** The low bank on the horizon: far, long, flat. */
export const BANK = { f: 0.14, span: repeatOf(0.14, 1), wind: 1 }
/** The cumulus over the stones. */
export const HEAPS = { f: 0.36, span: repeatOf(0.36, 1), wind: 2 }

export const BANKS: Cloud[] = Array.from({ length: 16 }, (_, i) => {
  const x = ((i + 0.3 + 0.5 * hash(i, 51)) * BANK.span) / 16
  return cumulus(1000 + i, x, 0.05 + 0.25 * hash(i, 52), 2.2 + 3.2 * hash(i, 53), 0.55 + 0.25 * hash(i, 54))
})

export const CLOUDS: Cloud[] = Array.from({ length: 26 }, (_, i) => {
  const x = ((i + 0.2 + 0.6 * hash(i, 61)) * HEAPS.span) / 26
  return cumulus(2000 + i, x, 2.2 + 1.3 * hash(i, 62), 0.8 + 1.5 * hash(i, 63) ** 1.4, 0.9 + 0.3 * hash(i, 64))
})

const COVER: [number, number][] = [
  [0, 0.7],
  [60, 0.85],
  [170, 0.7],
  [212, 0.9],
  [262, 0.42],
  [440, 0.35],
  [474, 0.62],
  [600, 0.6],
  [PERIOD, 0.7],
]

/** How much of the sky is cloud at `t`, 0 to 1: most of the day, thinning at night for the stars, more under the moon. */
export function coverAt(t: number): number {
  const u = wrap(t)
  let i = 0
  while (i + 2 < COVER.length && COVER[i + 1][0] <= u) i++
  const [t0, a] = COVER[i]
  const [t1, b] = COVER[i + 1]
  return a + (b - a) * smooth(u, t0, t1)
}

/** How much of `cloud` there is at `t`: it gathers and thins as the cover comes over its share and goes. */
export const cloudThere = (cloud: Cloud, t: number): number => smooth(coverAt(t) - cloud.rank, 0, 0.14)

/** The clouds' colours at one moment: the face lit by the sun or the moon, the side away, and how solid they are. */
export interface CloudLight {
  lit: string
  shade: string
  under: string
  alpha: number
}

/**
 * How the clouds are lit: white by day with a sky-blue shade; at dawn and dusk lit warm from the side with the
 * horizon's colour under them; at night dim, edged silver where the moon is up. `low` is how low the sun is, 0 high to
 * 1 on the horizon; `moon`, how much moon there is.
 */
export function cloudLight(day: Sky, low: number, moon: number): CloudLight {
  const n = day.night
  const sunLit = mixHex('#FFFDF7', '#FFCF9E', low)
  const lit = mixHex(sunLit, mixHex('#3E4668', '#C3CEE2', moon), n)
  const dayShade = mixHex(mixHex(mixHex(day.top, day.low, 0.5), '#FFFFFF', 0.45), sunLit, 0.15)
  const nightShade = mixHex(mixHex(day.top, day.low, 0.4), '#2A3256', 0.3)
  const shade = mixHex(dayShade, nightShade, n)
  const under = mixHex(mixHex(shade, day.low, 0.3 + 0.5 * low), shade, n)
  return { lit, shade, under, alpha: 0.95 - 0.35 * n }
}

/**
 * One cloud, drawn in its own frame (its foot's middle at the origin, up the frame's up), `k` pixels a cell: its
 * billows as one shape, flat underneath, lit on the side towards (`lx`, `ly`), a unit direction in the frame (right and
 * up positive).
 */
export function drawCloud(ctx: CanvasRenderingContext2D, k: number, cloud: Cloud, light: CloudLight, lx: number, ly: number, alpha: number): void {
  if (alpha < 0.01) return
  const body = new Path2D()
  for (const [cx, cy, r] of cloud.puffs) {
    body.moveTo((cx + r) * k, -cy * k)
    body.arc(cx * k, -cy * k, r * k, 0, Math.PI * 2)
  }
  let top = 0
  for (const [, cy, r] of cloud.puffs) top = Math.max(top, cy + r)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.rect(-cloud.w * k, -(top + 1) * k, cloud.w * 2 * k, (top + 1) * k)
  ctx.clip()
  // The lit face: all of it, and then the part turned away from the light over it.
  ctx.fillStyle = light.lit
  ctx.fill(body)
  ctx.clip(body)
  const shadow = new Path2D()
  const off = 0.24
  for (const [cx, cy, r] of cloud.puffs) {
    const sx = cx - lx * r * off
    const sy = cy - ly * r * off
    shadow.moveTo((sx + r * 1.02) * k, -sy * k)
    shadow.arc(sx * k, -sy * k, r * 1.02 * k, 0, Math.PI * 2)
  }
  // Paler towards the top, where the shadow side still takes the sky's light.
  const g = ctx.createLinearGradient(0, -top * k, 0, 0)
  g.addColorStop(0, mixHex(light.shade, light.lit, 0.35))
  g.addColorStop(0.55, light.shade)
  g.addColorStop(1, light.under)
  ctx.fillStyle = g
  ctx.fill(shadow)
  ctx.restore()
}

// ---------------------------------------------------------------- gulls

/** Gulls: a few small flocks, nearer than the clouds, flying the ball's way a little faster than it goes. */
export const GULLS = { f: 0.5, span: repeatOf(0.5, 1), wind: -2 }

export interface Gull {
  x: number
  h: number
  /** Its own phase, for the wings and the drift. */
  seed: number
  size: number
}

export const FLOCKS: Gull[] = []
for (let f = 0; f < 7; f++) {
  const x0 = ((f + 0.5 * hash(f, 71)) * GULLS.span) / 7
  const h0 = 3.1 + 0.9 * hash(f, 72)
  const n = 2 + Math.floor(hash(f, 73) * 4)
  for (let i = 0; i < n; i++) {
    FLOCKS.push({
      x: x0 - i * (0.35 + 0.3 * hash(f, i, 74)),
      h: h0 + (i % 2 ? 0.18 : -0.12) * Math.ceil(i / 2) + 0.12 * hash(f, i, 75),
      seed: f * 17 + i,
      size: 0.1 + 0.04 * hash(f, i, 76),
    })
  }
}

/** How spread a gull's wings are at `t`, -1 down to 1 up: it beats a while and glides a while. */
export function wingsAt(g: Gull, t: number): { beat: number; glide: number } {
  const glide = smooth(osc(t, 0.045 + 0.02 * hash(g.seed, 81), g.seed), -0.2, 0.35)
  return { beat: osc(t, 1.25 + 0.2 * hash(g.seed, 82), g.seed * 2.1) * (1 - glide), glide }
}

/** One gull, `s` pixels its half-span, at the origin, facing the ball's way: a soft M. */
export function drawGull(ctx: CanvasRenderingContext2D, s: number, beat: number, ink: string, alpha: number, width: number): void {
  const tip = -0.25 * s - 0.45 * s * beat
  const elbow = -0.32 * s + 0.12 * s * beat
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = ink
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-s, tip)
  ctx.quadraticCurveTo(-0.5 * s, elbow - 0.18 * s, 0, 0)
  ctx.quadraticCurveTo(0.5 * s, elbow - 0.18 * s, s, tip)
  ctx.stroke()
  ctx.restore()
}

// ---------------------------------------------------------------- the night sky

/** The Milky Way: drawn once, a band of faint stars and glow, and turned with the sky. */
let galaxy: HTMLCanvasElement | null = null
export function milkyWay(): HTMLCanvasElement {
  if (galaxy) return galaxy
  const S = 1024
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')!
  const band = (x: number) => S / 2 + Math.sin((x / S) * Math.PI * 2) * S * 0.035
  // Glow: soft clouds of light along the band, cool and a little warm at its heart.
  for (let i = 0; i < 70; i++) {
    const x = hash(i, 91) * S
    const y = band(x) + (hash(i, 92) - 0.5) * S * 0.09
    const r = S * (0.04 + 0.07 * hash(i, 93))
    const warm = Math.exp(-(((x - S * 0.55) / (S * 0.18)) ** 2))
    const rgb = warm > 0.4 && hash(i, 94) > 0.5 ? '240, 220, 196' : '196, 210, 240'
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, `rgba(${rgb}, ${(0.05 + 0.06 * warm).toFixed(3)})`)
    rg.addColorStop(1, `rgba(${rgb}, 0)`)
    g.fillStyle = rg
    g.fillRect(x - r, y - r, 2 * r, 2 * r)
  }
  // Its dust: a dark rift along the middle.
  g.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 26; i++) {
    const x = S * (0.2 + 0.6 * hash(i, 95))
    const y = band(x) + (hash(i, 96) - 0.3) * S * 0.02
    const r = S * (0.015 + 0.025 * hash(i, 97))
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, 'rgba(0, 0, 0, 0.35)')
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.fillStyle = rg
    g.fillRect(x - r, y - r, 2 * r, 2 * r)
  }
  g.globalCompositeOperation = 'source-over'
  // Its stars: many, small, crowding the band.
  for (let i = 0; i < 2600; i++) {
    const x = hash(i, 101) * S
    const spread = hash(i, 102) - 0.5
    const y = band(x) + spread * Math.abs(spread) * S * 0.28
    const a = (0.15 + 0.5 * hash(i, 103) ** 2) * Math.exp(-(((y - band(x)) / (S * 0.06)) ** 2))
    if (a < 0.03) continue
    g.fillStyle = `rgba(240, 238, 230, ${a.toFixed(3)})`
    g.fillRect(x, y, hash(i, 104) > 0.9 ? 1.6 : 1, hash(i, 104) > 0.9 ? 1.6 : 1)
  }
  galaxy = c
  return c
}

/**
 * The shooting stars: one on the top note of each of the first Gnossienne's high phrases (it climbs there four
 * times), and on the third's, at night; each falls for a second from where the note lands.
 */
export const METEORS: number[] = (() => {
  const out: number[] = []
  for (const piece of [1, 2]) {
    const notes = MELODY.filter((n) => n.piece === piece)
    const top = Math.max(...notes.map((n) => n.p))
    let last = -Infinity
    for (const n of notes) {
      // One a phrase: the top note's first strike, not its repeats, and not the third's opening bar.
      if (n.p !== top || n.t - last < 6) continue
      last = n.t
      if (n.t > PIECES[piece].from + 4) out.push(n.t)
    }
  }
  return out
})()

/** A shooting star at `t`: where it is along its fall (0 to 1) and how bright, or null. */
export function meteorAt(t: number): { i: number; q: number; light: number } | null {
  for (let i = 0; i < METEORS.length; i++) {
    const s = since(t, METEORS[i])
    if (s < -0.05 || s > 1.4) continue
    const q = Math.max(0, s + 0.05) / 1.1
    const light = smooth(s, -0.05, 0.08) * (1 - smooth(s, 0.6, 1.35))
    return { i, q: Math.min(1, q), light }
  }
  return null
}

// ---------------------------------------------------------------- mist and fireflies

const MIST_KEYS: [number, number][] = [
  [0, 0.75],
  [24, 0.85],
  [60, 0.4],
  [100, 0.05],
  [190, 0.05],
  [214, 0.35],
  [250, 0.12],
  [440, 0.12],
  [470, 0.55],
  [600, 0.6],
  [PERIOD, 0.75],
]

/** How much mist lies on the water at `t`, 0 to 1. */
export function mistAt(t: number): number {
  const u = wrap(t)
  let i = 0
  while (i + 2 < MIST_KEYS.length && MIST_KEYS[i + 1][0] <= u) i++
  const [t0, a] = MIST_KEYS[i]
  const [t1, b] = MIST_KEYS[i + 1]
  return a + (b - a) * smooth(u, t0, t1)
}

/** The mist's banks: long, low, nearly at the stones' depth, drifting. */
export const MIST = { f: 0.8, span: repeatOf(0.8, 4), wind: 1 }
export const BANKS_OF_MIST = Array.from({ length: 9 }, (_, i) => ({
  x: ((i + hash(i, 111)) * MIST.span) / 9,
  h: 0.12 + 0.3 * hash(i, 112),
  w: 4 + 5 * hash(i, 113),
  th: 0.45 + 0.4 * hash(i, 114),
}))

/** The fireflies over the pond: they stay where they are on the planet, wandering a little. */
export const FIREFLY = { f: 1, span: LENGTH / 12, wind: 0 }
export const FIREFLIES = Array.from({ length: 26 }, (_, i) => ({
  x: ((i + hash(i, 121)) * FIREFLY.span) / 26,
  h: 0.35 + 2.3 * hash(i, 122) ** 1.3,
  seed: i,
}))

/** How many fireflies are out at `t`: over the pond, from the third Gnossienne's first bars until the dawn. */
export const firefliesOut = (t: number): number => {
  const u = wrap(t)
  return smooth(u, PIECES[2].from - 2, PIECES[2].from + 14) * (1 - smooth(u, PERIOD - 14, PERIOD - 1))
}

import { mixHex } from '../../../../parts'
import { MELODY, NOTES, PERIOD, PIECES, loudness, wrap, type Note } from './music'
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
  [128, 0.7],
  [152, 1],
  [172, 1],
  [190, 0.75],
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
export function cloudLight(day: Sky, low: number, moon: number, overcast = 0): CloudLight {
  const n = day.night
  // Rain cloud is grey through, lit only a little paler on top.
  const sunLit = mixHex(mixHex('#FFFDF7', '#FFCF9E', low), '#D3D6DD', 0.7 * overcast)
  const lit = mixHex(sunLit, mixHex('#3E4668', '#C3CEE2', moon), n)
  const dayShade = mixHex(mixHex(mixHex(day.top, day.low, 0.5), '#FFFFFF', 0.45), sunLit, 0.15)
  const nightShade = mixHex(mixHex(day.top, day.low, 0.5), '#39426A', 0.3)
  const shade = mixHex(mixHex(dayShade, '#8E95A6', 0.75 * overcast), nightShade, n)
  const under = mixHex(mixHex(shade, day.low, 0.3 + 0.5 * low), shade, n)
  // Thinner at night, so the stars, the Milky Way and the aurora show through them.
  return { lit, shade, under, alpha: 0.95 - 0.5 * n }
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

// ---------------------------------------------------------------- the shower, and the bow

/**
 * An afternoon shower over the Gymnopédie's second statement: the cloud gathers, a soft rain falls on the sea, and it
 * clears for the last bars, leaving a bow opposite the low sun over the colonnade, which lingers into the dusk.
 */
const SHOWER = { gather: 138, from: 152, to: 174, clear: 182 }
const BOW = { from: 174, full: 186, fade: 196, gone: 208 }

/** How hard it is raining at `t`, 0 to 1. */
export const rainAt = (t: number): number => {
  const u = wrap(t)
  return smooth(u, SHOWER.from - 4, SHOWER.from + 4) * (1 - smooth(u, SHOWER.to - 3, SHOWER.clear))
}

/** How overcast it is at `t`, 0 to 1: the cloud before and after the rain itself. */
export const overcastAt = (t: number): number => {
  const u = wrap(t)
  // The cloud breaks on the Gymnopédie's last top note: the sun comes through at once while the rain still falls (a
  // sun shower, which lights the bow), and the rest of the cloud clears after.
  const clearing = Math.max(0.65 * smooth(u, BREAK, BREAK + 0.8), smooth(u, BREAK, SHOWER.clear + 6))
  return smooth(u, SHOWER.gather, SHOWER.from) * (1 - clearing)
}

/** The Gymnopédie's last top note, in the shower: where the sun breaks through. */
export const BREAK = (() => {
  const g1 = MELODY.filter((n) => n.piece === 0)
  const top = Math.max(...g1.map((n) => n.p))
  return g1.filter((n) => n.p === top && n.t > SHOWER.from && n.t < SHOWER.clear).map((n) => n.t)[0] ?? SHOWER.to
})()

/** How much of the bow there is at `t`, 0 to 1. */
export const bowAt = (t: number): number => {
  const u = wrap(t)
  return smooth(u, BOW.from, BOW.full) * (1 - smooth(u, BOW.fade, BOW.gone))
}

/** A raindrop's streak: where it is in the frame (0..1 across, 0..1 down) at `t`. Each falls a whole number of times a period. */
export function dropAt(i: number, t: number): { x: number; y: number } {
  const n = Math.round(PERIOD / (0.55 + 0.25 * hash(i, 151)))
  const f = (n * wrap(t)) / PERIOD + hash(i, 152)
  const fall = f - Math.floor(f)
  const turn = Math.floor(f)
  return { x: hash(i, turn, 153), y: fall }
}

/** A drop's ring on the water: which landing it is on, how far through its spread (0..1), and where (0..1 along). */
export function ringAt(i: number, t: number): { q: number; x: number; d: number } {
  const n = Math.round(PERIOD / (1.1 + 0.6 * hash(i, 161)))
  const f = (n * wrap(t)) / PERIOD + hash(i, 162)
  const turn = Math.floor(f)
  return { q: f - turn, x: hash(i, turn, 163), d: hash(i, turn, 164) }
}

// ---------------------------------------------------------------- under the pond

/**
 * A whale, once, under the moonlit pond in the third Gnossienne: a dark shape deep in the water, its outline lit by
 * the sea's own light, swimming the ball's way more slowly than the ball goes, so that it passes back under it.
 */
export const WHALE = { from: 510, to: 568, depth: 1.5, length: 4.4 }

/** Where the whale is at `t`: cells from the ball's place (it comes in on the right and leaves on the left), and how much of it there is; or null. */
export function whaleAt(t: number): { d: number; there: number; beat: number } | null {
  const u = wrap(t)
  if (u < WHALE.from || u > WHALE.to) return null
  const q = (u - WHALE.from) / (WHALE.to - WHALE.from)
  return {
    d: 9 - 18 * q,
    there: smooth(q, 0, 0.15) * (1 - smooth(q, 0.85, 1)),
    beat: osc(t, 0.16),
  }
}

/**
 * The whale's outline in its own frame, `k` pixels a cell, nose at +x, back up (negative y), its tail beating by
 * `beat` (-1..1): points round its body, then its flukes.
 */
export function whaleShape(k: number, beat: number): { body: [number, number][]; flukes: [number, number][]; fin: [number, number][] } {
  const L = WHALE.length
  const top: [number, number][] = []
  const under: [number, number][] = []
  const N = 36
  // How far the tail end is bent at `s` along (0 the flukes, 1 the nose).
  const bend = (s: number) => beat * 0.2 * Math.max(0, 0.5 - s) ** 2 * 4
  for (let i = 0; i <= N; i++) {
    const s = i / N
    // A slim tail stock thickening to the body, and a blunt, rounded head.
    const g = s < 0.6 ? 0.03 + 0.29 * smooth(s, 0, 0.6) ** 0.8 : 0.32 * Math.sqrt(Math.max(0, 1 - ((s - 0.6) / 0.4) ** 2.2))
    const x = (s - 0.6) * L
    top.push([x * k, (-g * 0.85 + bend(s)) * k])
    under.push([x * k, (g * 1.05 + bend(s)) * k])
  }
  const body = [...top, ...under.reverse()]
  const tx = -0.6 * L
  const ty = bend(0)
  const flukes: [number, number][] = [
    [(tx + 0.05) * k, ty * k],
    [(tx - 0.42) * k, (ty - 0.36 + 0.14 * beat) * k],
    [(tx - 0.26) * k, (ty - 0.02) * k],
    [(tx - 0.42) * k, (ty + 0.34 + 0.14 * beat) * k],
  ]
  // A long pectoral fin under the front of the body, swept back.
  const fin: [number, number][] = [
    [0.55 * k, 0.22 * k],
    [-0.15 * k, (0.62 + 0.04 * beat) * k],
    [0.2 * k, 0.28 * k],
  ]
  return { body, flukes, fin }
}

// ---------------------------------------------------------------- the sea's light, seen from afar

/**
 * The planet's deep water from far off at night: motes of the sea's own light in a band under its surface, crowded
 * near the top and thinning with depth. Drawn once, square, the planet's disc in its middle filling it; it turns with the
 * planet.
 */
let deep: HTMLCanvasElement | null = null
export function deepLight(): HTMLCanvasElement {
  if (deep) return deep
  const S = 2048
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')!
  const R = S / 2
  // A haze of it under the surface, all round.
  const haze = g.createRadialGradient(R, R, R * 0.55, R, R, R)
  haze.addColorStop(0, 'rgba(90, 200, 196, 0)')
  haze.addColorStop(0.75, 'rgba(90, 200, 196, 0)')
  haze.addColorStop(0.95, 'rgba(90, 200, 196, 0.09)')
  haze.addColorStop(1, 'rgba(90, 200, 196, 0)')
  g.fillStyle = haze
  g.fillRect(0, 0, S, S)
  for (let i = 0; i < 2600; i++) {
    const depth = hash(i, 191) ** 1.8
    const r = R * (0.975 - 0.2 * depth)
    const a = hash(i, 192) * Math.PI * 2
    const x = R + Math.cos(a) * r
    const y = R + Math.sin(a) * r
    const light = (0.2 + 0.8 * hash(i, 193) ** 3) * (1 - 0.9 * depth)
    const big = hash(i, 194) > 0.985
    const size = big ? 3 + 3 * hash(i, 195) : 1 + 1.4 * hash(i, 195)
    if (big) {
      const glow = g.createRadialGradient(x, y, 0, x, y, size * 3)
      glow.addColorStop(0, `rgba(150, 240, 226, ${(0.5 * light).toFixed(3)})`)
      glow.addColorStop(1, 'rgba(150, 240, 226, 0)')
      g.fillStyle = glow
      g.fillRect(x - size * 3, y - size * 3, size * 6, size * 6)
    } else {
      g.fillStyle = `rgba(140, 236, 222, ${light.toFixed(3)})`
      g.beginPath()
      g.arc(x, y, size, 0, Math.PI * 2)
      g.fill()
    }
  }
  deep = c
  return c
}

// ---------------------------------------------------------------- the aurora

/**
 * The aurora over the first Gnossienne's night: it comes up once the sky is wholly dark, is fullest about the high
 * phrases, and is gone before the moon rises; and it breathes with how full the music is.
 */
export const AURORA = { from: 258, full: 290, fade: 372, gone: 415 }

export const auroraAt = (t: number): number => {
  const u = wrap(t)
  const there = smooth(u, AURORA.from, AURORA.full) * (1 - smooth(u, AURORA.fade, AURORA.gone))
  return there > 0 ? there * (0.6 + 0.4 * loudness(t)) : 0
}

/** One column of the aurora's light, bottom bright to top nothing: drawn once and stretched. */
let ray: HTMLCanvasElement | null = null
function auroraRay(): HTMLCanvasElement {
  if (ray) return ray
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, 'rgba(176, 120, 226, 0)')
  grad.addColorStop(0.4, 'rgba(150, 140, 226, 0.18)')
  grad.addColorStop(0.72, 'rgba(110, 214, 210, 0.45)')
  grad.addColorStop(0.94, 'rgba(146, 255, 186, 1)')
  grad.addColorStop(1, 'rgba(146, 255, 186, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 1, 128)
  ray = c
  return c
}

let sheet: HTMLCanvasElement | null = null
let sheetAt = Number.NaN

/**
 * The aurora at `t`, as a picture `w` by `h` (a quarter of the frame's size: it is soft): three curtains, each a
 * ribbon of rays hanging from a slow wave, folding and brightening along its length. `drift` is how far round the
 * camera has come, cells, so the curtains go by a little as it travels. Kept for the moment it was drawn for.
 */
/** The aurora's sheet for a picture `W` by `F` device pixels: a quarter of its size, and never over 480 across. */
export function auroraSize(W: number, F: number): [number, number] {
  const w = Math.min(Math.ceil(W / 4), 480)
  return [w, Math.ceil((w * F) / W)]
}

export function auroraSheet(t: number, w: number, h: number, drift: number): HTMLCanvasElement {
  if (sheet && sheetAt === t && sheet.width === w && sheet.height === h) return sheet
  if (!sheet || sheet.width !== w || sheet.height !== h) {
    sheet = document.createElement('canvas')
    sheet.width = w
    sheet.height = h
  }
  const g = sheet.getContext('2d')!
  g.clearRect(0, 0, w, h)
  g.globalCompositeOperation = 'lighter'
  // Slow: a third slower than the time it is.
  const u = wrap(t) * 0.68
  const src = auroraRay()
  const strength = [0.5, 0.36, 0.26]
  // A column to a pixel of the sheet (`auroraSize` keeps it narrow enough for that to be cheap).
  const step = 1
  for (let j = 0; j < 3; j++) {
    for (let x = 0; x < w; x += step) {
      const X = x / w + 0.006 * drift
      const base = h * (0.34 + 0.08 * j) + h * 0.07 * Math.sin(2.1 * Math.PI * X + 0.06 * u + j) + h * 0.03 * Math.sin(5.3 * Math.PI * X - 0.1 * u + 2 * j)
      const rays = (0.5 + 0.5 * Math.sin(13 * Math.PI * X + 0.19 * u + 3 * j)) ** 1.5 * (0.55 + 0.45 * Math.sin(31 * Math.PI * X - 0.15 * u + j))
      const fold = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(1.7 * Math.PI * X + 0.045 * u + 1.3 * j))
      const a = rays * fold * strength[j]
      if (a < 0.01) continue
      const tall = h * (0.16 + 0.12 * (0.5 + 0.5 * Math.sin(7 * Math.PI * X + 0.08 * u + j)))
      g.globalAlpha = Math.min(1, a)
      g.drawImage(src, x, base - tall, step + 0.5, tall + h * 0.02)
    }
  }
  g.globalAlpha = 1
  g.globalCompositeOperation = 'source-over'
  sheetAt = t
  return sheet
}

// ---------------------------------------------------------------- the inner voice's constellations

/**
 * The inner voice, the Gnossiennes' quiet counter-line in the middle of the chords, draws in the night sky: each of
 * its figures (its notes a breath or so apart) a constellation, a star brightening as each note sounds, higher for a
 * higher note and a step along, a faint line drawn to it from the last; the whole figure lingering a while after its
 * last note, and going back into the sky.
 */
export interface Figure {
  notes: Note[]
  /** Its first note's attack, and its last's. */
  from: number
  to: number
  /** Where it is in the sky: across the frame (0..1), and how high its lowest note is over the horizon, in frames. */
  x: number
  y: number
  /** Its notes' lowest pitch, and which way it leans as it goes. */
  low: number
  lean: number
}

export const FIGURES: Figure[] = (() => {
  const inner = NOTES.filter((n) => n.r === 'inner')
  const out: Figure[] = []
  for (const n of inner) {
    const last = out[out.length - 1]
    if (last && n.t - last.to < 2.4) {
      last.notes.push(n)
      last.to = n.t
    } else out.push({ notes: [n], from: n.t, to: n.t, x: 0, y: 0, low: 0, lean: 0 })
  }
  out.forEach((f, i) => {
    f.low = Math.min(...f.notes.map((n) => n.p))
    // Away from the middle, where the ball is, and alternating sides, so one figure is not drawn over the last.
    f.x = (i % 2 ? 0.58 : 0.1) + 0.22 * hash(i, 221)
    f.y = 0.5 + 0.12 * hash(i, 222)
    f.lean = hash(i, 223) > 0.5 ? 1 : -1
  })
  return out
})()

/** How long a figure's stars stay after its last note, and how long they take to go. */
const LINGER = 2.5
const FADE = 3

/** A figure's stars at `t`: where each is (its index in the figure) and how bright; and how much of each line to it. */
export function figureAt(f: Figure, t: number): { i: number; light: number; line: number }[] | null {
  const u = wrap(t)
  if (u < f.from - 0.1 || u > f.to + LINGER + FADE) return null
  const going = 1 - smooth(u, f.to + LINGER, f.to + LINGER + FADE)
  const out: { i: number; light: number; line: number }[] = []
  f.notes.forEach((n, i) => {
    const s = u - n.t
    if (s < 0) return
    // Each star flares as its note sounds, as hard as it was played, and settles to a steady light.
    const flare = (n.v / 40) * Math.exp(-s / 0.6)
    const light = going * smooth(s, 0, 0.12) * (0.5 + 0.5 * Math.min(1, flare))
    out.push({ i, light, line: going * smooth(s, 0, 0.45) })
  })
  return out
}

// ---------------------------------------------------------------- boats

/**
 * Sailboats far out by day: a layer of their own, far, beating home against the ball's way, so that each crosses the
 * frame slowly, in half a minute or so. (Sailing the ball's way they would keep pace with the parallax, and stand still
 * off the frame's edge.)
 */
export const SAILS = { f: 0.3, span: repeatOf(0.3, 1), wind: 1 }

export const BOATS = Array.from({ length: 8 }, (_, i) => ({
  x: ((i + 0.5 * hash(i, 231)) * SAILS.span) / 8,
  size: 0.32 + 0.14 * hash(i, 232),
  seed: i,
}))

/**
 * How much the boats are out at `t`: from mid-morning, in from the shower's haze, and on into the dusk, going home
 * into the dark as the first Gnossienne gets under way.
 */
export const boatsOut = (t: number): number => {
  const u = wrap(t)
  return smooth(u, 40, 60) * (1 - smooth(u, 226, 246)) * (1 - 0.85 * overcastAt(t))
}

/** How bright the boats' masthead lanterns are at `t`: lit one by one as the colonnade's lamps are, at dusk. */
export const lanternAt = (seed: number, t: number): number => {
  const at = PIECES[1].from - 4 + 9 * hash(seed, 233)
  return smooth(wrap(t), at, at + 1.5)
}

/**
 * One sailboat, its waterline's middle at the origin, up the frame's up, `k` pixels a cell: a low dark hull and a
 * tall white sail, lit on the side towards `lit` (-1 west to 1 east), leaning a little with its rocking.
 */
export function drawBoat(ctx: CanvasRenderingContext2D, k: number, size: number, lit: number, rock: number, sail: string, shade: string, hull: string, alpha: number): void {
  const K = (v: number) => v * k * size
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.rotate(rock * 0.05)
  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.moveTo(K(-0.5), K(-0.1))
  ctx.lineTo(K(0.55), K(-0.1))
  ctx.lineTo(K(0.38), K(0.06))
  ctx.lineTo(K(-0.4), K(0.06))
  ctx.closePath()
  ctx.fill()
  // The mast, the mainsail behind it and the jib before.
  ctx.fillStyle = lit >= 0 ? sail : shade
  ctx.beginPath()
  ctx.moveTo(K(0.02), K(-1.25))
  ctx.lineTo(K(0.02), K(-0.16))
  ctx.lineTo(K(-0.42), K(-0.16))
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = lit >= 0 ? shade : sail
  ctx.beginPath()
  ctx.moveTo(K(0.07), K(-1.1))
  ctx.lineTo(K(0.07), K(-0.2))
  ctx.lineTo(K(0.42), K(-0.2))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

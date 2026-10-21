import type p5 from 'p5'
import { alpha, type frame, hash } from './kit'

/**
 * The world past the set and in front of it: what every place shares to stand in a world and not on a stage. Layers
 * that move at their own depth as the camera moves (`along`), clouds that drift (`clouds`), birds that cross
 * (`birds`), smoke that rises (`smoke`), and the wind that moves grass and leaves (`gust`). All of it flat and
 * unlined like the far trees, in the place's own colours, and a pure function of show time: a scrub, a seek and play
 * draw the same frame. Nothing here glows.
 */

export type Frame = ReturnType<typeof frame>

const TAU = Math.PI * 2

/** Smooth value noise in [-1, 1] over `t`, one knot every `period` seconds: a sway, a drift, a breath of wind. */
export function wobble(t: number, seed = 0, period = 2.5): number {
  const u = t / period
  const i = Math.floor(u)
  const f = u - i
  const s = f * f * (3 - 2 * f)
  const a = hash(i, 911, seed) * 2 - 1
  const b = hash(i + 1, 911, seed) * 2 - 1
  return a + (b - a) * s
}

/** The wind at `t`: a slow swell and a quicker flutter on it, mostly one way; about 0 to 1. */
export function gust(t: number, seed = 0): number {
  return 0.55 + 0.3 * wobble(t, seed, 4.5) + 0.15 * wobble(t, seed + 7, 1.1)
}

/**
 * Parallax: where something at `depth` stands, given the frame. 0 is the set's own plane; toward 1 it is farther off
 * and keeps more with the frame (1 is the sky, which never moves); below 0 it is nearer than the set and slides past
 * faster. Only across: a far ridge stays on its horizon. `anchor` is where it stands true (where the camera usually
 * looks at it), so it is drawn where it was designed to be when the frame is there.
 */
export function along(f: Frame, depth: number, anchor = 0): number {
  return (f.cx - anchor) * depth
}

/** `v` moved by whole `span`s to within half a span of `c`. */
export const wrapNear = (v: number, c: number, span: number): number => c + ((((v - c + span / 2) % span) + span) % span) - span / 2

export interface CloudOpts {
  /** The band of sky they float in (cells, up is negative). */
  y0: number
  y1: number
  /** How many to a hundred cells of sky. */
  per: number
  /** Their size, about, in cells across. */
  size: number
  /** Drift, cells a second (positive: to the right). */
  speed: number
  /** Their depth, for parallax (`along`). */
  depth: number
  /** Body and underside. */
  body: string
  shade: string
  /** Their opacity (a haze, a high thin sheet). */
  a?: number
  /** Flatter (cirrus, an autumn band) below 1; heaped above. */
  heap?: number
  seed?: number
  anchor?: number
}

/**
 * A sky's clouds: soft flat heaps in one colour with a shaded underside, no outline, drifting with the wind and
 * keeping to their depth as the camera moves. Only the ones in the frame are drawn.
 */
export function clouds(p: p5, k: number, f: Frame, t: number, o: CloudOpts): void {
  if (f.y0 > o.y1 + o.size || f.y1 < o.y0 - o.size) return
  const shift = along(f, o.depth, o.anchor ?? 0)
  const seed = o.seed ?? 0
  const span = 100
  const n = Math.max(1, Math.round(o.per))
  const heap = o.heap ?? 1
  const a = o.a ?? 1
  const body = alpha(p, o.body, a)
  const shade = alpha(p, o.shade, a)
  p.noStroke()
  for (let i = 0; i < n; i++) {
    const w = o.size * (0.65 + 0.7 * hash(i, 3, seed))
    // Each wraps round a hundred cells of sky about the frame (out of sight: the widest frame is under fifty), so the
    // drift never runs out.
    const x = wrapNear(hash(i, 1, seed) * span + o.speed * t, f.cx - shift, span) + shift
    if (x + w < f.x0 - 1 || x - w > f.x1 + 1) continue
    const y = o.y0 + (o.y1 - o.y0) * hash(i, 2, seed)
    const h = w * 0.32 * heap
    // The underside first (a flat, darker base), then the heaps over it.
    p.fill(shade)
    p.ellipse(x * k, (y + h * 0.18) * k, w * k, h * 0.7 * k)
    p.fill(body)
    const lumps = 3 + Math.floor(hash(i, 4, seed) * 3)
    for (let j = 0; j < lumps; j++) {
      const u = (j + 0.5) / lumps - 0.5
      const lw = w * (0.38 + 0.25 * hash(i, 10 + j, seed))
      const lh = h * (0.8 + 0.7 * hash(i, 20 + j, seed)) * (1 - Math.abs(u) * 0.9)
      p.ellipse((x + u * w * 0.72) * k, (y - lh * 0.22) * k, lw * k, lh * k)
    }
  }
}

export interface Flight {
  /** When it sets off and where from, its speed (cells a second, x and y), and how long it flies. */
  t0: number
  from: [number, number]
  v: [number, number]
  dur: number
  /** How many, and how they keep together: a loose flock, or a V (geese). */
  n: number
  vee?: boolean
  /** Wingspan, cells. */
  span: number
  color: string
  /** Wingbeats a second. */
  beat?: number
  seed?: number
  /** Depth, for parallax (`along`). */
  depth?: number
  anchor?: number
}

/**
 * Birds crossing: each a pair of strokes, wings flapping, the flock loose and each on its own wingbeat, or a skein of
 * geese in a V. They come in and leave over a quarter of a second at the ends of their flight (out of the frame by
 * design, so it never shows).
 */
export function birds(p: p5, k: number, f: Frame, t: number, b: Flight, weight: number): void {
  const s = t - b.t0
  if (s < 0 || s > b.dur) return
  const seed = b.seed ?? 0
  const shift = along(f, b.depth ?? 0, b.anchor ?? 0)
  const fade = Math.min(1, s / 0.25, (b.dur - s) / 0.25)
  p.noFill()
  p.stroke(alpha(p, b.color, fade))
  p.strokeWeight(Math.max(1, weight * 0.7 * Math.min(1, b.span / 0.3)))
  const dir = Math.sign(b.v[0]) || 1
  for (let i = 0; i < b.n; i++) {
    let dx: number
    let dy: number
    if (b.vee) {
      const rank = Math.ceil(i / 2)
      const side = i % 2 === 0 ? 1 : -1
      dx = -dir * rank * b.span * 1.4
      dy = side * rank * b.span * 0.9
    } else {
      dx = (hash(i, 31, seed) - 0.5) * b.span * 9
      dy = (hash(i, 32, seed) - 0.5) * b.span * 4
    }
    // A little drift within the flock as it goes.
    dx += Math.sin(s * 0.9 + i * 1.7) * b.span * 0.5
    dy += Math.sin(s * 1.3 + i * 2.3) * b.span * 0.35
    const x = b.from[0] + b.v[0] * s + dx + shift
    const y = b.from[1] + b.v[1] * s + dy
    if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
    const flap = Math.sin(TAU * (b.beat ?? 2.4) * s + hash(i, 33, seed) * TAU)
    const half = b.span / 2
    const lift = half * (0.15 + 0.45 * flap)
    p.beginShape()
    p.vertex((x - half) * k, (y - lift) * k)
    p.vertex(x * k, (y + half * 0.12) * k)
    p.vertex((x + half) * k, (y - lift) * k)
    p.endShape()
  }
}

export interface SmokeOpts {
  /** Puffs a second, how fast they rise (cells a second), how long each lasts. */
  rate?: number
  rise?: number
  life?: number
  /** Where the wind takes it: cells a second sideways. */
  drift?: number
  size?: number
  color: string
  a?: number
  seed?: number
}

/** Smoke from a chimney (or steam, a candle's last wisp): soft puffs born one after another, rising, widening, thinning. */
export function smoke(p: p5, k: number, t: number, x: number, y: number, o: SmokeOpts): void {
  const rate = o.rate ?? 1.4
  const life = o.life ?? 4
  const rise = o.rise ?? 0.35
  const drift = o.drift ?? 0.15
  const size = o.size ?? 0.22
  const a = o.a ?? 0.5
  const seed = o.seed ?? 0
  const first = Math.floor((t - life) * rate)
  p.noStroke()
  for (let i = Math.max(first, -1e6); i <= Math.floor(t * rate); i++) {
    const age = t - i / rate
    if (age < 0 || age > life) continue
    const u = age / life
    const px = x + drift * age + Math.sin(age * 1.3 + hash(i, 41, seed) * TAU) * 0.08 * (0.3 + u)
    const py = y - rise * age * (1 - 0.3 * u)
    const r = size * (0.5 + 1.6 * u) * (0.8 + 0.4 * hash(i, 42, seed))
    const fade = Math.min(1, age / 0.4) * (1 - u) * (1 - u)
    p.fill(alpha(p, o.color, a * fade))
    p.circle(px * k, py * k, 2 * r * k)
  }
}

/**
 * Grass along a ground line from `x0` to `x1`: stalks leaning with the wind (`gust`), the wind's lean travelling
 * along the row as a gust does. `per` stalks a cell, `h` their height.
 */
export function grass(p: p5, k: number, t: number, x0: number, x1: number, y: number, o: { per: number; h: number; color: string; weight: number; seed?: number; wind?: number }): void {
  const seed = o.seed ?? 0
  const wind = o.wind ?? 1
  p.noFill()
  p.stroke(o.color)
  p.strokeWeight(o.weight)
  const i0 = Math.floor(x0 * o.per)
  const i1 = Math.ceil(x1 * o.per)
  for (let i = i0; i <= i1; i++) {
    if (hash(i, 51, seed) > 0.55) continue
    const x = i / o.per + hash(i, 52, seed) / o.per
    const h = o.h * (0.5 + hash(i, 53, seed))
    const lean = wind * (0.25 + 0.5 * gust(t - x * 0.12, seed)) * h
    const sway = Math.sin(t * 2.1 + i) * 0.04 * h
    p.beginShape()
    p.vertex(x * k, y * k)
    p.quadraticVertex((x + (lean + sway) * 0.3) * k, (y - h * 0.6) * k, (x + lean + sway) * k, (y - h * (1 - 0.15 * Math.abs(lean) / h)) * k)
    p.endShape()
  }
}

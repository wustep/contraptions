import { hash } from './kit'

/**
 * A fire, not a row of teardrops: the one way every fire in the show is drawn (the loft stove's firebox, the glory
 * hole and the furnace's port, the veil at a door). The spark's own flame is the only clean teardrop in the show; a
 * fire here is licks.
 *
 * - Each lick climbs a sinuous centreline (two waves of different lengths that travel up it, so the fire rises) with
 *   a wavering edge, broad at the root and drawn out to a point; the bigger ones fork into two or three tips.
 * - Sizes follow a power law, so one or two licks stand tall over many short ones, and the roots are scattered off
 *   any row.
 * - Each is graded from white-gold at the root through the fire's body to its rim colour, gone at the tip, and they
 *   are laid on additively, so where they overlap they brighten into a hot core instead of stacking flat.
 * - Now and then a tip breaks off as a wisp that rises and goes out.
 */

export interface FirePalette {
  rim: string
  body: string
  heart: string
}

export interface FireOpts {
  /** The base line the licks rise from (cells). */
  x0: number
  x1: number
  y: number
  /** The tallest lick (cells). */
  h: number
  /** How many licks along the base. */
  n: number
  t: number
  seed: number
  pal: FirePalette
  /** Overall strength, 0..1. */
  alpha?: number
  /** How far the tips are swung sideways (cells at the tallest lick's tip), as by a draught. */
  lean?: number
  /** How the licks are laid on: 'lighter' (the default: overlaps burn white), 'screen', or 'source-over'. */
  mode?: GlobalCompositeOperation
  /** Tips breaking off and rising (default on). */
  wisps?: boolean
  /** A hot glow sitting low on the base line (default on). */
  bed?: boolean
}

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
const rgba = (c: [number, number, number], a: number): string => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
const mix = (a: [number, number, number], b: [number, number, number], f: number): [number, number, number] => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]

/** One lick: where it stands, how it is shaped, its colours. All in cells. */
export interface Lick {
  x: number
  y: number
  w: number
  h: number
  /** Tip swing (cells, at the tip). */
  lean: number
  t: number
  /** Its own clock's phases and rates. */
  seed: number
  /** Colours at the root and the rim. */
  root: [number, number, number]
  mid: [number, number, number]
  rim: [number, number, number]
  a: number
  /** Tips: 1, 2 or 3. */
  tips: number
}

const TAU = Math.PI * 2

/** The centreline and half-width of a lick at height share `u` (0 root, 1 tip). */
function along(L: Lick, u: number): { x: number; y: number; hw: number } {
  const s = L.seed
  const f1 = 1.1 + 0.8 * hash(s, 11)
  const f2 = 2.0 + 1.3 * hash(s, 12)
  // Waves that travel up the lick: the fire rises through it.
  const wave = 0.7 * Math.sin(TAU * (1.05 * u - L.t * f1) + 6.28 * hash(s, 13)) + 0.3 * Math.sin(TAU * (2.3 * u - L.t * f2) + 6.28 * hash(s, 14))
  const x = L.x + L.lean * Math.pow(u, 1.6) + L.w * 0.32 * u * wave
  const y = L.y - L.h * u
  const edge = 1 + 0.16 * Math.sin(TAU * (3.1 * u - L.t * (2.6 + hash(s, 15))) + 6.28 * hash(s, 16))
  const hw = (L.w / 2) * Math.sin(Math.PI * Math.sqrt(0.12 + 0.88 * u)) * (1 - 0.35 * u) * edge
  return { x, y, hw: Math.max(0, hw) }
}

/** Fill a lick's outline (from share `from` of its height, for a fork) with its root-to-tip grading. */
function fillLick(ctx: CanvasRenderingContext2D, k: number, L: Lick, from = 0): void {
  const m = 14
  const left: [number, number][] = []
  const right: [number, number][] = []
  for (let i = 0; i <= m; i++) {
    const u = from + ((1 - from) * i) / m
    const q = along(L, u)
    left.push([q.x - q.hw, q.y])
    right.push([q.x + q.hw, q.y])
  }
  const base = along(L, from)
  const g = ctx.createLinearGradient(0, base.y * k, 0, (L.y - L.h) * k)
  const r0 = from > 0 ? L.mid : L.root
  g.addColorStop(0, rgba(r0, L.a))
  g.addColorStop(0.22, rgba(mix(r0, L.mid, 0.6), L.a * 0.9))
  g.addColorStop(0.5, rgba(L.mid, L.a * 0.75))
  g.addColorStop(0.8, rgba(L.rim, L.a * 0.45))
  g.addColorStop(1, rgba(L.rim, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(left[0][0] * k, left[0][1] * k)
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i][0] * k, left[i][1] * k)
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0] * k, right[i][1] * k)
  // A soft round under the root, so it sits in its bed instead of on a line.
  ctx.quadraticCurveTo(base.x * k, (base.y + base.hw * 0.5) * k, left[0][0] * k, left[0][1] * k)
  ctx.closePath()
  ctx.fill()
}

/** A lick with its forks (drawn on whatever composite the caller has set). */
export function drawLick(ctx: CanvasRenderingContext2D, k: number, L: Lick): void {
  if (L.h <= 0.01 || L.a <= 0.004) return
  if (L.tips === 1) {
    fillLick(ctx, k, L)
    return
  }
  // A forked lick: the body to a little past half its height, then two or three tips off it, each its own curl.
  const body: Lick = { ...L, h: L.h * 0.72, lean: L.lean * 0.5 }
  fillLick(ctx, k, body)
  const at = 0.5 + 0.1 * hash(L.seed, 21)
  const q = along(body, at)
  for (let j = 0; j < L.tips; j++) {
    const side = L.tips === 2 ? (j ? 1 : -1) : j - 1
    const tall = j === (L.seed | 0) % L.tips ? 1 : 0.62 + 0.2 * hash(L.seed, j, 22)
    const tip: Lick = {
      ...L,
      x: q.x + side * q.hw * 0.45,
      y: q.y,
      w: q.hw * 1.35,
      h: (L.h - L.h * 0.72 * at) * tall * 1.05,
      lean: L.lean * 0.5 + side * L.w * (0.28 + 0.12 * hash(L.seed, j, 23)),
      seed: L.seed + 7.3 * (j + 1),
    }
    fillLick(ctx, k, tip)
  }
}

/** A wisp: a tip broken off, rising and going out. Long and thin, never round. */
function drawWisp(ctx: CanvasRenderingContext2D, k: number, L: Lick, q: number): void {
  const life = q / 0.45
  const tip = along(L, 1)
  const h = L.h * 0.22 * (1 - 0.6 * life)
  const w = Math.min(L.w * 0.18, h * 0.42)
  const wisp: Lick = { ...L, x: tip.x + L.lean * 0.3 * life, y: tip.y - L.h * 0.06 - L.h * 0.5 * life, w, h, lean: L.lean * 0.2, a: L.a * 0.7 * (1 - life), tips: 1, root: L.mid }
  fillLick(ctx, k, wisp)
}

/** The licks of a fire along a base line: how big, where, and forked, from `o`. */
export function licksOf(o: FireOpts): Lick[] {
  const pal = { rim: rgb(o.pal.rim), body: rgb(o.pal.body), heart: rgb(o.pal.heart) }
  const out: Lick[] = []
  const span = o.x1 - o.x0
  const step = span / o.n
  for (let i = 0; i < o.n; i++) {
    const s = o.seed * 101 + i
    // A power law: most licks short, one or two tall.
    const size = 0.22 + 0.78 * Math.pow(hash(s, 1), 2.6)
    const flick = 0.86 + 0.09 * Math.sin(o.t * (5.1 + 3 * hash(s, 2)) + 6.28 * hash(s, 3)) + 0.05 * Math.sin(o.t * (11.7 + 4 * hash(s, 4)) + i)
    const h = o.h * size * flick
    const w = Math.min(step * (1.2 + 1.6 * size), h * 0.75)
    out.push({
      x: o.x0 + step * (i + 0.5 + 0.9 * (hash(s, 5) - 0.5)),
      y: o.y + 0.04 * o.h * (hash(s, 6) - 0.5),
      w,
      h,
      lean: (o.lean ?? 0) * (h / o.h) + 0.12 * h * Math.sin(o.t * (1.7 + hash(s, 7)) + 6.28 * hash(s, 8)),
      t: o.t,
      seed: s,
      root: mix(pal.heart, pal.body, 0.15),
      mid: pal.body,
      rim: pal.rim,
      a: (o.alpha ?? 1) * (0.5 + 0.2 * hash(s, 9)),
      tips: size < 0.4 ? 1 : hash(s, 10) > 0.8 ? 3 : hash(s, 10) > 0.35 ? 2 : 1,
    })
  }
  // Tall at the back, so the short ones burn in front of them.
  return out.sort((a, b) => b.h - a.h)
}

/** A fire along a base line (see the file's note). */
export function drawFire(ctx: CanvasRenderingContext2D, k: number, o: FireOpts): void {
  const licks = licksOf(o)
  const pal = { body: rgb(o.pal.body), heart: rgb(o.pal.heart) }
  const a = o.alpha ?? 1
  ctx.save()
  ctx.globalCompositeOperation = o.mode ?? 'lighter'
  // The hot glow low on the base, where the licks are rooted.
  if (o.bed !== false) {
    const g = ctx.createLinearGradient(0, (o.y + 0.08 * o.h) * k, 0, (o.y - 0.4 * o.h) * k)
    g.addColorStop(0, rgba(pal.heart, 0.55 * a))
    g.addColorStop(0.35, rgba(pal.body, 0.3 * a))
    g.addColorStop(1, rgba(pal.body, 0))
    ctx.fillStyle = g
    ctx.fillRect(o.x0 * k, (o.y - 0.4 * o.h) * k, (o.x1 - o.x0) * k, 0.48 * o.h * k)
  }
  for (const L of licks) drawLick(ctx, k, L)
  if (o.wisps !== false) {
    for (const L of licks) {
      if (L.h < o.h * 0.35) continue
      const period = 0.7 + 0.6 * hash(L.seed, 31)
      const q = (o.t / period + hash(L.seed, 32)) % 1
      if (q < 0.45) drawWisp(ctx, k, L, q)
    }
  }
  ctx.restore()
}

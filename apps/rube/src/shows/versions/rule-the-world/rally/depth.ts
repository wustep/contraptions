import type { Pt } from '../../../../parts'
import { hash } from './kit'
import { BEATS, level } from './music'
import { ctxOf, rgb, type Pen } from './pen'

/**
 * Depth and life, shared by every place of Rally: the layers that make a place a world rather than a diagram (things
 * far off that drift slower than the machine, things close that pass faster), the air between (dust in the light,
 * rain, embers, confetti), and the small motion that keeps a quiet stretch alive (a flame's flicker, a lamp's sway, a
 * glint going round). Everything here draws in cells, in the frame the stage has translated to, through the pen's
 * tone, and batches its particles into a few fills so that a frame full of them stays cheap.
 */

/** The stage's frame in a drawing's cells (`kit.frame`). */
export interface Frame {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
}

/* ------------------------------------------------------------------ parallax */

/**
 * Where a layer at depth `d` is moved to, as the camera goes: add it to every point of the layer. `d` 1 is the
 * machine's own plane; under 1 is farther (0.3 drifts a third as fast as the machine past the frame: a skyline), and
 * over 1 is nearer (1.4: a rail in front of the lens). At `anchor` (in cells) the layer lies where it is drawn, so a
 * layer can be laid out against the place's own ground and still move at its own speed.
 */
export const parallax = (f: Frame, d: number, anchor: Pt = [0, 0]): Pt => [(f.cx - anchor[0]) * (1 - d), (f.cy - anchor[1]) * (1 - d)]

/** A layer drawn at depth `d`: the pen translated for it while `draw` runs. */
export function layer(pen: Pen, f: Frame, d: number, draw: (f: Frame) => void, anchor: Pt = [0, 0]): void {
  const [dx, dy] = parallax(f, d, anchor)
  const { p, k } = pen
  p.push()
  p.translate(dx * k, dy * k)
  draw({ x0: f.x0 - dx, y0: f.y0 - dy, x1: f.x1 - dx, y1: f.y1 - dy, cx: f.cx - dx, cy: f.cy - dy })
  p.pop()
}

/* ------------------------------------------------------------------ the music, for motion that is not a strike */

let beatIdx = 0
/** The last beat at or before `t` (a cursor, since frames come in order), and how long ago. */
export function lastBeat(t: number): { t: number; s: number; pos: number; ago: number } {
  if (beatIdx >= BEATS.length || BEATS[beatIdx].t > t) beatIdx = 0
  while (beatIdx + 1 < BEATS.length && BEATS[beatIdx + 1].t <= t) beatIdx++
  const b = BEATS[beatIdx]
  if (!b || b.t > t) return { t: -Infinity, s: 0, pos: 0, ago: Infinity }
  return { t: b.t, s: b.s, pos: b.pos, ago: t - b.t }
}
/** 1 on every beat (a little more on a downbeat), dying away over `tau`: a pulse for lights and crowds. */
export function pulse(t: number, tau = 0.22): number {
  const b = lastBeat(t)
  if (!Number.isFinite(b.ago)) return 0
  return Math.exp(-b.ago / tau) * (b.pos === 1 ? 1 : 0.7) * Math.min(1.2, 0.55 + 0.45 * b.s)
}
/** How hard the song is going at `t`, 0 to 1, slow: for how much there is (crowds, sparks, light). */
export const energy = (t: number): number => level(t)

/* ------------------------------------------------------------------ small motion */

/** A flame's or an old bulb's flicker about 1: mostly steady, with a quick dip now and then. `depth` is how far it dips. */
export function flicker(t: number, seed: number, depth = 0.25): number {
  const w = Math.sin(t * 7.3 + seed * 11.1) * 0.35 + Math.sin(t * 13.7 + seed * 3.7) * 0.25 + Math.sin(t * 2.1 + seed) * 0.4
  const slot = Math.floor(t * 9 + seed * 5)
  const dip = hash(slot, seed | 0, 77) < 0.06 ? 1 : 0
  return 1 - depth * (0.35 + 0.35 * w) * 0.6 - depth * dip * 0.7
}
/** A slow sway, -1 to 1, about a `period` in seconds, never quite the same twice. */
export const sway = (t: number, seed: number, period = 4): number =>
  0.75 * Math.sin((t / period) * Math.PI * 2 + seed * 2.39) + 0.25 * Math.sin((t / period) * Math.PI * 2 * 2.31 + seed * 5.1)

/* ------------------------------------------------------------------ the air */

type Rgb = [number, number, number]
const cache = new Map<string, Rgb>()
const rgbOf = (pen: Pen, hex: string): Rgb => {
  const key = pen.tone(hex)
  let c = cache.get(key)
  if (!c) {
    c = rgb(key)
    cache.set(key, c)
  }
  return c
}
const css = (c: Rgb, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`

/** Alphas are drawn in this many steps, so a cloud of particles is a handful of fills. */
const STEPS = 5

export interface Motes {
  /** How many, over the box. */
  n: number
  seed: number
  /** Where they drift, in cells: they wrap round inside it. */
  box: [number, number, number, number]
  /** Radius in cells, smallest and largest. */
  size: [number, number]
  color: string
  alpha: number
  /** Their drift, cells a second. */
  drift?: Pt
  /** How far each wanders off its line, in cells. */
  wander?: number
  /** How much each twinkles, 0 to 1. */
  twinkle?: number
  /** How lit each is where it is (a beam, a lamp's pool), 0 to 1. */
  light?: (x: number, y: number) => number
}

/** Dust in the air: specks drifting through a box, lit where `light` says, twinkling. */
export function motes(pen: Pen, t: number, o: Motes): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const [bx0, by0, bx1, by1] = o.box
  const w = bx1 - bx0
  const h = by1 - by0
  const [vx, vy] = o.drift ?? [0.05, -0.03]
  const wander = o.wander ?? 0.15
  const tw = o.twinkle ?? 0.5
  const c = rgbOf(pen, o.color)
  const buckets: number[][] = Array.from({ length: STEPS }, () => [])
  for (let i = 0; i < o.n; i++) {
    const h1 = hash(i, o.seed, 1)
    const h2 = hash(i, o.seed, 2)
    const h3 = hash(i, o.seed, 3)
    const sp = 0.6 + 0.8 * h3
    let x = bx0 + ((((h1 * w + vx * sp * t + wander * Math.sin(t * (0.3 + h2) + i)) % w) + w) % w)
    let y = by0 + ((((h2 * h + vy * sp * t + wander * Math.cos(t * (0.25 + h1) + i * 1.7)) % h) + h) % h)
    x = Math.min(bx1, Math.max(bx0, x))
    y = Math.min(by1, Math.max(by0, y))
    const lit = o.light ? o.light(x, y) : 1
    if (lit <= 0.02) continue
    const a = o.alpha * lit * (1 - tw + tw * (0.5 + 0.5 * Math.sin(t * (1.3 + 2.1 * h3) + i * 2.7)))
    if (a <= 0.01) continue
    const r = o.size[0] + (o.size[1] - o.size[0]) * h3
    const b = Math.min(STEPS - 1, Math.floor((a / Math.max(1e-6, o.alpha)) * STEPS))
    buckets[b].push(x * k, y * k, Math.max(0.6, r * k))
  }
  ctx.save()
  for (let b = 0; b < STEPS; b++) {
    const list = buckets[b]
    if (!list.length) continue
    ctx.fillStyle = css(c, o.alpha * ((b + 0.7) / STEPS))
    ctx.beginPath()
    for (let i = 0; i < list.length; i += 3) {
      ctx.moveTo(list[i] + list[i + 2], list[i + 1])
      ctx.arc(list[i], list[i + 1], list[i + 2], 0, Math.PI * 2)
    }
    ctx.fill()
  }
  ctx.restore()
}

export interface Rain {
  seed: number
  /** Drops per square cell. */
  density: number
  /** Fall, cells a second, and the wind's slant (cells across a cell down). */
  speed: number
  slant?: number
  /** Streak length, cells. */
  len: number
  color: string
  alpha: number
  /** Line weight, a share of the stage's. */
  lw?: number
  /** Only between these (cells), if given. */
  x?: [number, number]
  y?: [number, number]
}

/** Rain over the frame: streaks on a grid that wraps, so any frame has the same amount wherever the camera is. */
export function rain(pen: Pen, t: number, f: Frame, o: Rain): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const cellW = 1 / Math.sqrt(o.density)
  const slant = o.slant ?? 0.12
  const x0 = Math.max(f.x0 - 1, o.x?.[0] ?? -Infinity)
  const x1 = Math.min(f.x1 + 1, o.x?.[1] ?? Infinity)
  const y0 = Math.max(f.y0 - o.len, o.y?.[0] ?? -Infinity)
  const y1 = Math.min(f.y1, o.y?.[1] ?? Infinity)
  if (x1 <= x0 || y1 <= y0) return
  const col0 = Math.floor(x0 / cellW)
  const col1 = Math.ceil(x1 / cellW)
  const period = 6
  ctx.save()
  ctx.strokeStyle = css(rgbOf(pen, o.color), o.alpha)
  ctx.lineWidth = Math.max(0.6, pen.w * (o.lw ?? 0.45))
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let ci = col0; ci <= col1; ci++) {
    // Each column carries its drops down a tall loop of `period` cells, each at its own phase.
    const per = Math.max(1, Math.round(period / cellW))
    for (let j = 0; j < per; j++) {
      const h1 = hash(ci, j, o.seed)
      const sp = o.speed * (0.8 + 0.4 * h1)
      const fall = (h1 * period + t * sp) % period
      const loop = Math.floor((y0 - fall) / period)
      for (let m = loop; m <= loop + Math.ceil((y1 - y0) / period) + 1; m++) {
        const y = m * period + fall
        if (y < y0 || y > y1) continue
        const x = ci * cellW + hash(ci, j, o.seed + 1) * cellW + slant * y
        if (x < x0 || x > x1) continue
        ctx.moveTo(x * k, y * k)
        ctx.lineTo((x - slant * o.len) * k, (y - o.len) * k)
      }
    }
  }
  ctx.stroke()
  ctx.restore()
}

export interface Rising {
  seed: number
  n: number
  /** Where they start: along a line from x0 to x1 at y (cells). */
  from: [number, number, number]
  /** How high they go in a life, cells, and how long a life is, seconds. */
  rise: number
  life: number
  /** How far they drift sideways over a life. */
  spread: number
  size: [number, number]
  color: string
  /** Their hot colour, at the start of a life. */
  hot?: string
  alpha: number
}

/** Things that rise and fade: embers off a fire, steam, bubbles. Each lives `life` seconds, again and again. */
export function rising(pen: Pen, t: number, o: Rising): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const [x0, x1, y] = o.from
  const cool = rgbOf(pen, o.color)
  const hot = o.hot ? rgbOf(pen, o.hot) : cool
  ctx.save()
  for (const pass of [0, 1]) {
    const c = pass ? hot : cool
    const buckets: number[][] = Array.from({ length: STEPS }, () => [])
    for (let i = 0; i < o.n; i++) {
      const h1 = hash(i, o.seed, 11)
      const h2 = hash(i, o.seed, 12)
      const life = o.life * (0.7 + 0.6 * h2)
      const u = ((t / life + h1) % 1 + 1) % 1
      // Young ones are hot; the cool pass draws the old.
      if ((u < 0.35) !== (pass === 1)) continue
      const gen = Math.floor(t / life + h1)
      const sx = x0 + (x1 - x0) * hash(i, gen, o.seed + 13)
      const px = sx + o.spread * (u * (hash(i, gen, o.seed + 14) - 0.5) * 2 + 0.25 * Math.sin(u * 9 + i))
      const py = y - o.rise * u * (0.8 + 0.4 * h2)
      const a = o.alpha * Math.min(1, u * 8) * (1 - u) * (1 - u)
      if (a <= 0.01) continue
      const r = (o.size[0] + (o.size[1] - o.size[0]) * h1) * (1 - 0.6 * u)
      const b = Math.min(STEPS - 1, Math.floor((a / o.alpha) * STEPS))
      buckets[b].push(px * k, py * k, Math.max(0.5, r * k))
    }
    for (let b = 0; b < STEPS; b++) {
      const list = buckets[b]
      if (!list.length) continue
      ctx.fillStyle = css(c, o.alpha * ((b + 0.7) / STEPS))
      ctx.beginPath()
      for (let i = 0; i < list.length; i += 3) {
        ctx.moveTo(list[i] + list[i + 2], list[i + 1])
        ctx.arc(list[i], list[i + 1], list[i + 2], 0, Math.PI * 2)
      }
      ctx.fill()
    }
  }
  ctx.restore()
}

export interface Confetti {
  seed: number
  n: number
  /** When it is thrown (show time); it falls from then on and has gone `last` seconds later. */
  at: number
  last: number
  /** Where it is thrown from: a box it starts in (cells), and how far it falls in its time. */
  box: [number, number, number, number]
  fall: number
  colors: string[]
  size: number
  alpha?: number
}

/** Paper falling and turning: confetti, torn tickets, petals. Each piece flips as it falls, so it flashes. */
export function confetti(pen: Pen, t: number, o: Confetti): void {
  const u = t - o.at
  if (u < 0 || u > o.last) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const [bx0, by0, bx1, by1] = o.box
  const fade = Math.min(1, (o.last - u) / 1.2) * Math.min(1, u * 6)
  ctx.save()
  for (let ci = 0; ci < o.colors.length; ci++) {
    const c = rgbOf(pen, o.colors[ci])
    ctx.fillStyle = css(c, (o.alpha ?? 1) * fade)
    ctx.beginPath()
    for (let i = ci; i < o.n; i += o.colors.length) {
      const h1 = hash(i, o.seed, 21)
      const h2 = hash(i, o.seed, 22)
      const h3 = hash(i, o.seed, 23)
      // A burst up, then a slow fall with a flutter.
      const up = 1.4 * (0.5 + h3) * Math.exp(-u * 2.2)
      const x = bx0 + (bx1 - bx0) * h1 + 0.35 * Math.sin(u * (2 + 2 * h2) + i) + (h2 - 0.5) * u * 0.6
      const y = by0 + (by1 - by0) * h2 + (o.fall * (0.6 + 0.6 * h3) * u) / o.last - up
      const spin = u * (4 + 6 * h3) + i
      const cw = Math.abs(Math.cos(spin)) * o.size
      const ch = o.size * 0.55
      const a = h1 * Math.PI
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const pts: Pt[] = [[-cw, -ch], [cw, -ch], [cw, ch], [-cw, ch]]
      pts.forEach(([px, py], j) => {
        const X = (x + px * ca - py * sa) * k
        const Y = (y + px * sa + py * ca) * k
        if (j) ctx.lineTo(X, Y)
        else ctx.moveTo(X, Y)
      })
      ctx.closePath()
    }
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ light */

/**
 * A shaft of light from `apex`, down `angle` (radians, 0 straight down, positive to the left of it), `spread` wide
 * (radians) and `len` long, fading along its length: the beam from a lamp or a high window. Drawn added, so it lightens
 * what it falls on.
 */
export function shaft(pen: Pen, apex: Pt, angle: number, spread: number, len: number, color: string, a: number): void {
  if (a <= 0.004) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const dx = -Math.sin(angle)
  const dy = Math.cos(angle)
  const l = [apex[0] + Math.sin(-angle - spread / 2) * len, apex[1] + Math.cos(-angle - spread / 2) * len]
  const r = [apex[0] + Math.sin(-angle + spread / 2) * len, apex[1] + Math.cos(-angle + spread / 2) * len]
  const g = ctx.createLinearGradient(apex[0] * k, apex[1] * k, (apex[0] + dx * len) * k, (apex[1] + dy * len) * k)
  const c = rgbOf(pen, color)
  g.addColorStop(0, css(c, a))
  g.addColorStop(0.55, css(c, a * 0.4))
  g.addColorStop(1, css(c, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(apex[0] * k, apex[1] * k)
  ctx.lineTo(l[0] * k, l[1] * k)
  ctx.lineTo(r[0] * k, r[1] * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** A soft light added onto what is under it: a lamp's halo, a fire's glow on a wall. Like `pen.glow`, but it lightens. */
export function bloom(pen: Pen, c: Pt, r: number, color: string, a: number): void {
  if (a <= 0.004 || r <= 0) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const col = rgbOf(pen, color)
  const g = ctx.createRadialGradient(c[0] * k, c[1] * k, 0, c[0] * k, c[1] * k, r * k)
  g.addColorStop(0, css(col, a))
  g.addColorStop(0.3, css(col, a * 0.45))
  g.addColorStop(1, css(col, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.fillRect((c[0] - r) * k, (c[1] - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** A soft shadow laid over what is under it: an ellipse of dark, for a contact shadow or a pool of shade. */
export function shade(pen: Pen, c: Pt, rx: number, ry: number, color: string, a: number): void {
  if (a <= 0.004) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const col = rgbOf(pen, color)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, css(col, a))
  g.addColorStop(1, css(col, 0))
  ctx.save()
  ctx.translate(c[0] * k, c[1] * k)
  ctx.scale(rx * k, ry * k)
  ctx.fillStyle = g
  ctx.fillRect(-1, -1, 2, 2)
  ctx.restore()
}

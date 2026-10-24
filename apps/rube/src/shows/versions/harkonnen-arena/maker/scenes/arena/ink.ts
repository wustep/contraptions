import { hash, smooth, type Brush, type Pt } from '../../paint'
import { A } from './geo'

/**
 * The Harkonnens' fireworks: ink, not fire. Each is a drop of ink let fall into clear spirit, in the white sky: a broad
 * cap blooming, its heart thick and dark and its rim thinner and paler, and from under it threads, many and fine, each
 * its own length and droop, a few of them forking. As it ages a smaller bloom or two buds off it and drifts away with
 * threads of its own, and the whole of it sinks slowly and thins to a grey stain. No two alike; nothing in them gives
 * light.
 */

interface Bloom {
  at: number
  /** Where it opens, in world cells. */
  x: number
  y: number
  /** How far it spreads, cells. */
  size: number
  seed: number
}

export const BLOOMS: Bloom[] = [
  { at: A.ink[0], x: 5987, y: -31, size: 7.5, seed: 1 },
  { at: A.ink[1], x: 6013, y: -37, size: 8.5, seed: 2 },
  { at: A.ink[2], x: 5997, y: -44, size: 8, seed: 6 },
]

const INK = '#0C0C0C'

/** Adds the closed outline `ring` to the current path, wound so its area is positive, like every other piece of it. */
function wound(ctx: CanvasRenderingContext2D, ring: Pt[]): void {
  let area = 0
  for (let j = 0; j < ring.length; j++) {
    const p = ring[j]
    const q = ring[(j + 1) % ring.length]
    area += p[0] * q[1] - q[0] * p[1]
  }
  const pts = area < 0 ? [...ring].reverse() : ring
  ctx.moveTo(pts[0][0], pts[0][1])
  for (const p of pts) ctx.lineTo(p[0], p[1])
  ctx.closePath()
}

/** A thread: a tapering ribbon along `pts`, `w0` wide at its root and `w1` at its end. */
function ribbon(pts: Pt[], w0: number, w1 = 0): Pt[] {
  const m = pts.length - 1
  const left: Pt[] = []
  const right: Pt[] = []
  for (let j = 0; j <= m; j++) {
    const p = pts[j]
    const q = pts[Math.min(m, j + 1)]
    const pp = pts[Math.max(0, j - 1)]
    const dx = q[0] - pp[0]
    const dy = q[1] - pp[1]
    const l = Math.hypot(dx, dy) || 1
    const w = w1 + (w0 - w1) * Math.pow(1 - j / m, 0.9)
    left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w])
    right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w])
  }
  return [...left, ...right.reverse()]
}

interface Cloud {
  cx: number
  cy: number
  /** Its half width and half height. */
  rx: number
  ry: number
  /** How far its threads reach and droop, and how many it has. */
  size: number
  threads: number
  seed: number
  age: number
  reach: number
}

/** A cap's edge at angle `th`: round over the top, flatter under, rolled into small slow lobes. */
function edgeOf(c: Cloud, th: number, k = 1): Pt {
  const ph = hash(c.seed, 10) * 6.28
  const lob = 1 + 0.06 * Math.sin(7 * th + ph + c.age * 0.4) + 0.09 * Math.sin(3 * th + ph * 2 - c.age * 0.25) + 0.05 * Math.sin(13 * th + ph * 3)
  const s = Math.sin(th)
  return [c.cx + Math.cos(th) * c.rx * k * lob, c.cy + s * c.ry * k * lob * (s > 0 ? 0.5 : 1)]
}

/** The cap's outline at `k` of its size, as a sub-path. */
function cap(ctx: CanvasRenderingContext2D, c: Cloud, k: number, lift = 0): void {
  const ring: Pt[] = []
  const n = 56
  for (let i = 0; i < n; i++) {
    const [x, y] = edgeOf(c, (i / n) * Math.PI * 2, k)
    ring.push([x, y - lift])
  }
  wound(ctx, ring)
}

/**
 * The cloud's threads, as sub-paths: from under the cap, each from its own place along the rim, thrown out a little and
 * drooping; lengths and droops all different, a few forking part way down.
 */
function threadsOf(ctx: CanvasRenderingContext2D, c: Cloud): void {
  const S = c.size
  for (let k = 0; k < c.threads; k++) {
    const h = (i: number) => hash(k, c.seed, i)
    // Where it leaves the cap: anywhere under it, from near its middle out to its rim and round its flanks, not evenly.
    const th = -0.25 + (Math.PI + 0.5) * h(1)
    const [sx, sy] = edgeOf(c, th, 0.25 + 0.75 * Math.sqrt(h(2)))
    const len = S * (0.2 + 1.4 * h(3) * h(3)) * c.reach
    const out = Math.cos(th) * (0.1 + 0.6 * h(4))
    const droop = S * (0.2 + 1.2 * h(5) * h(5)) * Math.min(1.25, 0.2 + 0.13 * c.age) * c.reach
    const w0 = S * (0.006 + 0.014 * h(6))
    // Each wanders a little as it hangs, its own way.
    const wob = S * 0.06 * (h(12) - 0.5)
    const wf = 2 + 3 * h(13)
    const m = 16
    const pts: Pt[] = []
    for (let j = 0; j <= m; j++) {
      const u = j / m
      pts.push([sx + out * len * u * (1 - 0.3 * u) + wob * Math.sin(wf * u * Math.PI + c.age * 0.3) * u, sy + len * 0.25 * u + droop * u * u])
    }
    wound(ctx, ribbon(pts, w0))
    // One in five forks: a finer branch off it part way down, going its own way.
    if (h(7) < 0.2) {
      const at = Math.floor(m * (0.35 + 0.25 * h(8)))
      const [bx, by] = pts[at]
      const bl = len * (0.35 + 0.35 * h(9))
      const bo = (h(10) < 0.5 ? -1 : 1) * (0.3 + 0.3 * h(11))
      const br: Pt[] = []
      for (let j = 0; j <= 10; j++) {
        const u = j / 10
        br.push([bx + bo * bl * u, by + bl * 0.3 * u + droop * 0.6 * u * u])
      }
      wound(ctx, ribbon(br, w0 * 0.6))
    }
  }
}

function paintBloom(b: Brush, o: Bloom): void {
  const age = b.t - o.at
  if (age <= 0) return
  const { ctx, view } = b
  const S = o.size
  if (o.x + S * 2.5 < view.x0 || o.x - S * 2.5 > view.x1 || o.y + S * 3 < view.y0 || o.y - S * 2 > view.y1) return
  const grow = 1 - Math.exp(-age / 0.9)
  const reach = 1 - Math.exp(-age / 1.8)
  // How thick the ink still is: dark at first, thinning to a grey stain over the seconds after.
  const thick = 0.9 - 0.55 * smooth(age, 1.2, 11)
  // The whole of it sinking, slowly.
  const sink = S * (0.018 * age + 0.004 * age * age)
  const main: Cloud = { cx: o.x + 0.15 * age, cy: o.y - 0.1 * S * grow + sink, rx: S * 0.55 * grow, ry: S * 0.3 * grow, size: S, threads: 44, seed: o.seed, age, reach }
  // The buds: a smaller bloom or two coming off the cap's flank as it ages, drifting out and down with threads of their own.
  const buds: Cloud[] = []
  for (let i = 0; i < 2; i++) {
    const born = 1.6 + 1.6 * hash(o.seed, 20 + i) + i * 1.2
    const a = age - born
    if (a <= 0) continue
    const g = 1 - Math.exp(-a / 1.2)
    const side = hash(o.seed, 30 + i) < 0.5 ? -1 : 1
    const [ex, ey] = edgeOf(main, side < 0 ? Math.PI * 0.85 : Math.PI * 0.15)
    const bs = S * (0.28 + 0.1 * hash(o.seed, 40 + i))
    buds.push({ cx: ex + side * bs * 0.9 * g, cy: ey + bs * 0.5 * g, rx: bs * 0.55 * g, ry: bs * 0.32 * g, size: bs, threads: 10, seed: o.seed * 7 + i + 3, age: a, reach: 1 - Math.exp(-a / 1.5) })
  }
  // The thin outer cloud and every thread, one shape filled once, so where they cross the ink is no darker.
  ctx.beginPath()
  cap(ctx, main, 1)
  threadsOf(ctx, main)
  for (const c of buds) {
    cap(ctx, c, 1)
    threadsOf(ctx, c)
  }
  ctx.fillStyle = b.ca(INK, thick * 0.5)
  ctx.fill('nonzero')
  // The cap thicker toward its heart, and the heart thickest of all, a little high in it: two more, smaller, darker.
  ctx.beginPath()
  cap(ctx, main, 0.78, main.ry * 0.12)
  for (const c of buds) cap(ctx, c, 0.7, c.ry * 0.1)
  ctx.fillStyle = b.ca(INK, thick * 0.45)
  ctx.fill('nonzero')
  ctx.beginPath()
  cap(ctx, main, 0.5, main.ry * 0.22)
  ctx.fillStyle = b.ca(INK, thick * 0.5 * (1 - 0.6 * smooth(age, 2, 9)))
  ctx.fill('nonzero')
}

/** The fireworks open over the arena after the kill. */
export function paintInk(b: Brush): void {
  for (const o of BLOOMS) paintBloom(b, o)
}

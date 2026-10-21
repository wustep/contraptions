import { hash, smooth, type Brush, type Pt } from '../../paint'
import { A } from './geo'

/**
 * The Harkonnens' fireworks: ink, not fire. Each is a drop of ink let fall into spirit, in the white sky: a dark cloud
 * blooming and mushrooming, wider than it is tall, its edge unfurling into many fine threads that droop and sink, a
 * willow in negative; then all of it thinning to a grey stain. No two alike, none symmetric. Flat shapes only; nothing in
 * them gives light.
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
  { at: A.ink[0], x: 5987, y: -30, size: 7.5, seed: 1 },
  { at: A.ink[1], x: 6013, y: -36, size: 8.5, seed: 2 },
  { at: A.ink[2], x: 5997, y: -43, size: 8, seed: 6 },
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

/** A thread: a tapering ribbon along `pts`, `w0` wide where it leaves the cloud. */
function ribbon(pts: Pt[], w0: number): Pt[] {
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
    const w = w0 * Math.pow(1 - j / m, 0.85)
    left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w])
    right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w])
  }
  return [...left, ...right.reverse()]
}

function paintBloom(b: Brush, o: Bloom): void {
  const age = b.t - o.at
  if (age <= 0) return
  const { ctx, view } = b
  const S = o.size
  if (o.x + S * 2.2 < view.x0 || o.x - S * 2.2 > view.x1 || o.y + S * 3 < view.y0 || o.y - S * 2 > view.y1) return
  const grow = 1 - Math.exp(-age / 0.9)
  const reach = 1 - Math.exp(-age / 1.7)
  // How thick the ink still is: dark at first, thinning to a grey stain over the seconds after.
  const thick = 0.92 - 0.55 * smooth(age, 1.2, 10)
  // The cloud: it puffs up a little as it opens, then sinks; wider than tall; tipped a little its own way.
  const cx = o.x + 0.18 * age
  const cy = o.y - 0.12 * S * grow + 0.035 * age * age
  const rx = S * 0.4 * grow
  const ry = rx * 0.6
  const tip = (hash(o.seed, 9) - 0.5) * 0.5
  const ct = Math.cos(tip)
  const st = Math.sin(tip)
  const at = (x: number, y: number): Pt => [cx + x * ct - y * st, cy + x * st + y * ct]
  const phase = hash(o.seed, 10) * 6.28
  // Its edge: a mushroom's cap, round over the top and flatter under, rolled into small lobes that turn slowly.
  const edge = (th: number): Pt => {
    const lob = 1 + 0.07 * Math.sin(9 * th + phase + age * 0.5) + 0.1 * Math.sin(4 * th + phase * 2 - age * 0.3) + 0.06 * Math.sin(14 * th + phase * 3)
    const s = Math.sin(th)
    return at(Math.cos(th) * rx * lob, s * ry * lob * (s > 0 ? 0.55 : 1))
  }
  ctx.beginPath()
  const cap: Pt[] = []
  const n = 64
  for (let i = 0; i < n; i++) cap.push(edge((i / n) * Math.PI * 2))
  wound(ctx, cap)
  // The threads: many and fine, thrown out from all round the cap's edge as from a willow's burst, each arching out and
  // over and drooping, sinking further the older it is. No two the same length, so it never reads as a star.
  const threads = 30
  for (let k = 0; k < threads; k++) {
    const th = (k / threads) * Math.PI * 2 + (hash(k, o.seed, 1) - 0.5) * 0.35
    const start = edge(th)
    const len = S * (0.5 + 0.9 * hash(k, o.seed, 2)) * reach
    const sink = S * (0.5 + 0.7 * hash(k, o.seed, 4)) * Math.min(1.2, 0.2 + 0.16 * age) * reach
    const w0 = S * (0.014 + 0.018 * hash(k, o.seed, 5)) * Math.min(1, grow * 1.5)
    const vx = Math.cos(th)
    const vy = Math.sin(th) * 0.75
    const pts: Pt[] = []
    const m = 18
    for (let j = 0; j <= m; j++) {
      const u = j / m
      // Out along its throw, slowing, and down: a branch of the willow.
      const s = u * (1 - 0.3 * u)
      pts.push([start[0] + vx * len * s, start[1] + vy * len * s + sink * u * u])
    }
    wound(ctx, ribbon(pts, w0))
  }
  ctx.fillStyle = b.ca(INK, thick)
  ctx.fill('nonzero')
  // The heart of the cloud, still thick while the rest thins: gone by the time it is a stain.
  const core = 1 - smooth(age, 0.6, 5.5)
  if (core > 0.01) {
    ctx.beginPath()
    const inner: Pt[] = []
    for (let i = 0; i < 40; i++) {
      const th = (i / 40) * Math.PI * 2
      const lob = 1 + 0.12 * Math.sin(3 * th + phase - age * 0.4)
      inner.push(at(Math.cos(th) * rx * 0.55 * lob, Math.sin(th) * ry * 0.5 * lob - ry * 0.1))
    }
    wound(ctx, inner)
    ctx.fillStyle = b.ca(INK, 0.5 * core * thick)
    ctx.fill()
  }
}

/** The fireworks open over the arena after the kill. */
export function paintInk(b: Brush): void {
  for (const o of BLOOMS) paintBloom(b, o)
}

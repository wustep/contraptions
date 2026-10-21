import { hash, smooth, type Brush, type Pt } from '../../paint'
import { A } from './geo'

/**
 * The Harkonnens' fireworks: ink, not fire. Each opens in the white sky like a drop of ink let fall in water: a dark
 * heart, paler spreads of it going out round it, a few threads drawn out of it and sinking; then all of it thinning to
 * a grey stain drifting. Flat shapes only; nothing in them gives light.
 */

interface Bloom {
  at: number
  /** Its heart, in world cells. */
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

function paintBloom(b: Brush, o: Bloom): void {
  const age = b.t - o.at
  if (age <= 0) return
  const { ctx, view } = b
  if (o.x + o.size * 2 < view.x0 || o.x - o.size * 2 > view.x1 || o.y + o.size * 2 < view.y0 || o.y - o.size * 2 > view.y1) return
  const grow = 1 - Math.exp(-age / 0.8)
  const reach = 1 - Math.exp(-age / 1.5)
  // How thick the ink still is: dark at first, thinning to a grey stain over the seconds after.
  const thick = 0.93 - 0.5 * smooth(age, 1.2, 9)
  // It drifts a little with the air, and the whole of it sinks.
  const cx = o.x + 0.22 * age
  const cy = o.y + 0.04 * age * age
  // The ink spreading: a dark heart inside two paler spreads of the same billow, each a little further out and
  // thinner, each turning its own way.
  const r = o.size * 0.36 * grow
  /** A billow's outline, wound the way `wind` says (1 or -1), as a sub-path of the current path. */
  const lobed = (rr: number, k: number, wind = 1) => {
    const n = 48
    for (let i = 0; i <= n; i++) {
      const th = wind * (i / n) * Math.PI * 2
      const w = 1 + 0.17 * Math.cos(2 * th + o.seed * 1.7 + k * 1.3 + age * 0.1 * (k % 2 ? -1 : 1)) + 0.09 * Math.sin(3 * th + o.seed * 4.1 + k * 2.2 - age * 0.16)
      const x = cx + Math.cos(th) * rr * w
      const y = cy + Math.sin(th) * rr * w * 0.88
      if (i) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    }
    ctx.closePath()
  }
  const spread = 1 + 0.6 * reach
  ctx.beginPath()
  lobed(r * 1.55 * spread, 2)
  ctx.fillStyle = b.ca(INK, thick * 0.2)
  ctx.fill()
  ctx.beginPath()
  lobed(r * 1.25 * spread, 1)
  ctx.fillStyle = b.ca(INK, thick * 0.35)
  ctx.fill()
  // The heart and the threads are one shape, all wound one way and filled once, so where they cross it is no darker.
  // (The heart, going round by increasing angle with y down, has a positive area by the sum below.)
  ctx.beginPath()
  lobed(r, 0)
  // A few threads drawn out of it, curving away and sinking as the ink falls through the air.
  const arms = 4
  const sag = Math.min(1, 0.06 * age * age) * o.size * 0.35
  for (let k = 0; k < arms; k++) {
    const th0 = (k / arms) * Math.PI * 2 + 0.6 + (hash(k, o.seed, 1) - 0.5) * 0.9
    const len = o.size * (1.0 + 0.6 * hash(k, o.seed, 2)) * reach
    const curl = (hash(k, o.seed, 3) - 0.5) * 1.6
    const w0 = o.size * (0.03 + 0.02 * hash(k, o.seed, 4)) * Math.min(1, grow * 1.4)
    const pts: Pt[] = []
    const m = 16
    for (let j = 0; j <= m; j++) {
      const u = j / m
      const th = th0 + curl * u * u
      const d = r * 0.6 + (len - r * 0.6) * u
      pts.push([cx + Math.cos(th) * d, cy + Math.sin(th) * d * 0.9 + sag * u * u])
    }
    const left: Pt[] = []
    const right: Pt[] = []
    for (let j = 0; j <= m; j++) {
      const p = pts[j]
      const q = pts[Math.min(m, j + 1)]
      const pp = pts[Math.max(0, j - 1)]
      const dx = q[0] - pp[0]
      const dy = q[1] - pp[1]
      const l = Math.hypot(dx, dy) || 1
      const w = w0 * Math.pow(1 - j / m, 0.9)
      left.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w])
      right.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w])
    }
    const ring = [...left, ...right.reverse()]
    let area = 0
    for (let j = 0; j < ring.length; j++) {
      const p = ring[j]
      const q = ring[(j + 1) % ring.length]
      area += p[0] * q[1] - q[0] * p[1]
    }
    if (area < 0) ring.reverse()
    ctx.moveTo(ring[0][0], ring[0][1])
    for (const p of ring) ctx.lineTo(p[0], p[1])
    ctx.closePath()
  }
  ctx.fillStyle = b.ca(INK, thick)
  ctx.fill('nonzero')
}

/** The fireworks open over the arena after the kill. */
export function paintInk(b: Brush): void {
  for (const o of BLOOMS) paintBloom(b, o)
}

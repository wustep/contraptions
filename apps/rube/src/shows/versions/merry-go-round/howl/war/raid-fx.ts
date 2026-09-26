import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, hash } from '../kit'
import { TOWN, WASTES } from '../worlds'

/**
 * The war's soft things, for `raid.ts` (the war builder's): fire, smoke, light, bombs, flak and searchlights. Every
 * function draws in the caller's cells (`k` pixels a cell) and leaves p5 as it found it. Fire, smoke and light are
 * uninked volume; the only inked thing here is the bomb. Nothing is round and ball-sized: flames are tongues, smoke
 * is ragged clusters of many sizes, a flash is a wide low light with no bright core.
 */

const ctxOf = (p: p5) => p.drawingContext as CanvasRenderingContext2D

/** A palette colour as a canvas `rgba()`, for raw gradients. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(4)})`
}

/** A wave with no obvious period: for flicker. */
export const wobble = (u: number, s = 0): number => Math.sin(u + s) * 0.55 + Math.sin(u * 2.31 + s * 1.7) * 0.3 + Math.sin(u * 4.73 + s * 2.9) * 0.15

/**
 * Light added onto what is under it: fire on a wall, a flash inside smoke. Its middle is only a little brighter than
 * its body (a wide, low light, never a bright core); `squash` flattens it (a glow along a roofline).
 */
export function glow(p: p5, k: number, x: number, y: number, r: number, hex: string, a: number, squash = 1): void {
  if (a <= 0.004 || r <= 0.01) return
  const ctx = ctxOf(p)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(x * k, y * k)
  ctx.scale(1, squash)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  g.addColorStop(0, rgba(hex, a))
  g.addColorStop(0.35, rgba(hex, a * 0.7))
  g.addColorStop(0.7, rgba(hex, a * 0.25))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(-r * k, -r * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/**
 * A band of light rising from a line (the town burning below the roofs): strongest just over `y`, gone `h` above it.
 * It comes up out of nothing at `y` too (a glow drawn over the houses must never cut a line across them); a band
 * that must not show its ends is given the whole frame's width.
 */
export function skyGlow(p: p5, k: number, x0: number, x1: number, y: number, h: number, hex: string, a: number): void {
  if (a <= 0.004) return
  const ctx = ctxOf(p)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, y * k, 0, (y - h) * k)
  g.addColorStop(0, rgba(hex, 0))
  g.addColorStop(0.14, rgba(hex, a))
  g.addColorStop(0.5, rgba(hex, a * 0.4))
  g.addColorStop(1, rgba(hex, 0))
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, (y - h) * k, (x1 - x0) * k, h * k)
  ctx.restore()
}

export interface FireOpts {
  /** Show time, for the flicker. */
  t: number
  seed: number
  /** How far the tongues lean with the wind (fraction of their height; + is right). */
  lean?: number
  light?: number
}

/**
 * A fire: a low body of flame on a base `w` wide at (x, y), and tongues rising out of it up to `h` tall, the middle
 * ones tallest, each its own pointed S-curved blade flickering on its own clock; in three layers (ember, flame, the
 * hot heart), each smaller and lower than the last. Uninked.
 */
export function fire(p: p5, k: number, x: number, y: number, w: number, h: number, o: FireOpts): void {
  const light = o.light ?? 1
  if (h < 0.03 || w < 0.03 || light <= 0.01) return
  const n = Math.max(2, Math.min(6, Math.round(w / 0.42)))
  const lean = o.lean ?? 0.12
  const layers: [string, number, number][] = [
    [TOWN.ember, 1, 0.9],
    [TOWN.fire, 0.7, 0.95],
    [TOWN.fireHot, 0.4, 0.92],
  ]
  const X = (v: number) => v * k
  p.push()
  p.noStroke()
  for (const [color, s, a] of layers) {
    const ww = w * (0.45 + 0.55 * s)
    const hb = Math.min(h * 0.32, ww * 0.45) * (0.6 + 0.4 * s)
    p.fill(alpha(p, color, a * light))
    // The body: a low mound the tongues stand in.
    p.beginShape()
    p.vertex(X(x - ww / 2), X(y))
    p.bezierVertex(X(x - ww / 2), X(y - hb * 1.3), X(x + ww / 2), X(y - hb * 1.3), X(x + ww / 2), X(y))
    p.endShape(p.CLOSE)
    // The tongues.
    for (let j = 0; j < n; j++) {
      const u = (j + 0.5 + (hash(j, 4, o.seed) - 0.5) * 0.5) / n
      const cx = x - ww / 2 + u * ww
      const env = 0.42 + 0.58 * Math.sin(Math.PI * u)
      const f = 0.72 + 0.28 * wobble(o.t * (5.5 + hash(j, 1, o.seed) * 5), j * 2.1 + o.seed)
      const th = Math.max(hb * 1.2, h * s * env * f * (0.7 + 0.45 * hash(j, 2, o.seed)))
      const bw = (ww / n) * (0.62 + 0.25 * hash(j, 3, o.seed))
      const sway = (lean + 0.1 * wobble(o.t * 3.1 + j, j + o.seed)) * th
      const y0 = y - hb * 0.5
      p.beginShape()
      p.vertex(X(cx - bw), X(y0))
      p.bezierVertex(X(cx - bw * 1.1), X(y - th * 0.42), X(cx - bw * 0.2 + sway * 0.55), X(y - th * 0.68), X(cx + sway), X(y - th))
      p.bezierVertex(X(cx + bw * 0.25 + sway * 0.55), X(y - th * 0.7), X(cx + bw * 1.1), X(y - th * 0.42), X(cx + bw), X(y0))
      p.endShape(p.CLOSE)
    }
  }
  p.pop()
}

export interface Smoke {
  x: number
  y: number
  /** Show time it starts, and stops being fed (it rises on and thins after). */
  t0: number
  t1?: number
  /** Puffs a second. */
  rate: number
  /** Cells a second it rises. */
  rise: number
  /** Drift, cells a second a second (+ right). */
  wind: number
  /** A new puff's size (radius, cells); it grows to about 1.5 times as it goes. */
  size: number
  /** Seconds a puff lives. */
  life: number
  seed: number
  /** How much the fire under it lights its low puffs (0..1). */
  lit?: number
  /** How opaque (default 0.45). */
  a?: number
  /** A moving source (a falling bomber): where each puff is born, by show time; `x, y` are then ignored. */
  at?: (t: number) => [number, number]
}

/**
 * Smoke as soft volume: a column of puffs of many sizes, born at the source, rising and slowing, spreading, drifting
 * with the wind and thinning out; the low ones lit from the fire under them. Uninked; the oldest drawn first.
 */
export function smoke(p: p5, k: number, s: Smoke, t: number, light = 1): void {
  if (t < s.t0 || light <= 0.01) return
  const fed = s.t1 !== undefined ? Math.min(t, s.t1) : t
  const first = Math.max(0, Math.ceil((t - s.life - s.t0) * s.rate))
  const last = Math.floor((fed - s.t0) * s.rate)
  const base = s.a ?? 0.45
  p.push()
  p.noStroke()
  for (let i = first; i <= last; i++) {
    const born = s.t0 + i / s.rate
    const a = t - born
    if (a < 0 || a > s.life) continue
    const u = a / s.life
    const h1 = hash(i, 1, s.seed)
    const h2 = hash(i, 2, s.seed)
    const h3 = hash(i, 3, s.seed)
    const up = s.rise * a * (1 - 0.3 * u)
    const [sx, sy] = s.at ? s.at(born) : [s.x, s.y]
    const px = sx + (h1 - 0.5) * s.size * 0.9 + 0.5 * s.wind * a * a + 0.12 * s.size * Math.sin(a * 1.4 + i)
    const py = sy - up
    const r = s.size * (0.45 + 1.05 * Math.sqrt(u)) * (0.65 + 0.7 * h2)
    const fade = Math.min(1, a / 0.25) * Math.pow(1 - u, 1.2)
    const col = mixHex(TOWN.smoke, TOWN.ember, (s.lit ?? 0.5) * Math.max(0, 1 - u * 2.4))
    p.fill(alpha(p, col, base * fade * light))
    p.ellipse(px * k, py * k, 2 * r * k, 2 * r * k * (0.72 + 0.3 * h3))
  }
  p.pop()
}

/**
 * A bomb: an iron teardrop, nose forward along `ang` (radians, y down), with a ring of fins at its tail. About 0.36
 * cells long at `size` 1. The one inked thing of the war's own.
 */
export function bomb(p: p5, k: number, weight: number, ink: string, x: number, y: number, ang: number, size: number, light = 1): void {
  if (light <= 0.01) return
  const L = 0.36 * size * k
  const R = 0.07 * size * k
  const body = WASTES.ironDark
  p.push()
  p.translate(x * k, y * k)
  p.rotate(ang)
  p.stroke(alpha(p, ink, light))
  p.strokeWeight(Math.max(0.5, weight * 0.55 * Math.min(1, size)))
  // The fins: a box of four seen side on as two swept blades and a ring.
  p.fill(alpha(p, mixHex(body, WASTES.iron, 0.5), light))
  for (const s of [-1, 1]) {
    p.beginShape()
    p.vertex(-L * 0.36, s * R * 0.35)
    p.vertex(-L * 0.62, s * R * 1.45)
    p.vertex(-L * 0.7, s * R * 1.45)
    p.vertex(-L * 0.64, s * R * 0.2)
    p.endShape(p.CLOSE)
  }
  // The body.
  p.fill(alpha(p, body, light))
  p.beginShape()
  p.vertex(L * 0.5, 0)
  p.bezierVertex(L * 0.5, -R * 1.05, L * 0.2, -R, 0, -R)
  p.bezierVertex(-L * 0.22, -R, -L * 0.4, -R * 0.55, -L * 0.62, -R * 0.3)
  p.vertex(-L * 0.62, R * 0.3)
  p.bezierVertex(-L * 0.4, R * 0.55, -L * 0.22, R, 0, R)
  p.bezierVertex(L * 0.2, R, L * 0.5, R * 1.05, L * 0.5, 0)
  p.endShape(p.CLOSE)
  // A band round its waist.
  p.strokeWeight(Math.max(0.4, weight * 0.4 * Math.min(1, size)))
  p.line(L * 0.12, -R * 0.98, L * 0.12, R * 0.98)
  p.pop()
}

/**
 * A shell bursting in the sky: a short sharp flash (small and low, gone in a tenth of a second) and a ragged black
 * puff of many small parts that swells, drifts and thins over three seconds. `since` is seconds since it burst.
 */
export function flak(p: p5, k: number, x: number, y: number, since: number, seed: number, size = 1, light = 1): void {
  if (since < 0 || since > 2.6) return
  if (since < 0.12) glow(p, k, x, y, 0.8 * size, TOWN.fireHot, 0.5 * (1 - since / 0.12) * light)
  const g = 1 - Math.exp(-since / 0.25)
  const fade = Math.pow(1 - since / 2.6, 1.6)
  const drift = 0.3 * since
  p.push()
  p.noStroke()
  for (let i = 0; i < 16; i++) {
    const a = hash(i, 1, seed) * Math.PI * 2
    const d = size * g * (0.1 + 0.62 * Math.pow(hash(i, 2, seed), 0.7))
    const r = size * (0.07 + 0.16 * hash(i, 3, seed)) * (0.5 + 0.8 * g)
    const warm = Math.max(0, 1 - since / 0.3)
    const col = mixHex(mixHex(TOWN.smoke, TOWN.cobble, 0.25), TOWN.fire, warm * 0.8)
    p.fill(alpha(p, col, 0.55 * fade * light))
    p.ellipse(
      (x + Math.cos(a) * d + drift * (0.6 + 0.8 * hash(i, 4, seed))) * k,
      (y + Math.sin(a) * d * 0.75 - 0.12 * since) * k,
      2 * r * k,
      2 * r * k * (0.7 + 0.3 * hash(i, 5, seed)),
    )
  }
  p.pop()
}

/**
 * A searchlight's beam: a long narrow cone of pale light from (ox, oy) at `ang` (radians, y down; straight up is
 * -π/2), fading in from its source (which is below the roofs, out of sight) and out along its length.
 */
export function beam(p: p5, k: number, ox: number, oy: number, ang: number, len: number, a: number): void {
  if (a <= 0.004) return
  const ctx = ctxOf(p)
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.translate(ox * k, oy * k)
  ctx.rotate(ang)
  for (const [spread, f] of [
    [0.05, 0.45],
    [0.022, 1],
  ] as const) {
    const g = ctx.createLinearGradient(0, 0, len * k, 0)
    g.addColorStop(0, rgba(TOWN.glow, 0))
    g.addColorStop(0.08, rgba(TOWN.glow, a * f))
    g.addColorStop(0.5, rgba(TOWN.glow, a * f * 0.45))
    g.addColorStop(1, rgba(TOWN.glow, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, -0.1 * k)
    ctx.lineTo(len * k, -len * spread * k)
    ctx.lineTo(len * k, len * spread * k)
    ctx.lineTo(0, 0.1 * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/**
 * Sparks and embers thrown up from `x, y` at `since` 0: small bright flecks (little turned squares, never beads) on
 * short arcs under gravity, cooling from yellow to red and out.
 */
export function sparks(p: p5, k: number, x: number, y: number, since: number, n: number, speed: number, seed: number, light = 1): void {
  if (since < 0 || since > 1.8) return
  p.push()
  p.noStroke()
  for (let i = 0; i < n; i++) {
    const life = 0.7 + 1.0 * hash(i, 4, seed)
    if (since > life) continue
    const a = -Math.PI / 2 + (hash(i, 1, seed) - 0.5) * 2.2
    const v = speed * (0.4 + 0.8 * hash(i, 2, seed))
    const px = x + Math.cos(a) * v * since
    const py = y + Math.sin(a) * v * since + 0.5 * 5 * since * since
    const u = since / life
    const col = mixHex(TOWN.fireHot, TOWN.ember, u)
    const s = 0.045 * (1 - 0.5 * u) * (0.7 + 0.6 * hash(i, 3, seed))
    p.fill(alpha(p, col, (1 - u) * light))
    p.push()
    p.translate(px * k, py * k)
    p.rotate(since * 9 + i)
    p.rect(0, 0, s * k, s * k * 0.6)
    p.pop()
  }
  p.pop()
}

/**
 * Embers drifting up off a burning line (x0..x1 at y) on the wind: a steady few, each a fleck rising, wandering and
 * going out. Deterministic in show time.
 */
export function embers(p: p5, k: number, x0: number, x1: number, y: number, t: number, t0: number, rate: number, seed: number, light = 1): void {
  if (t < t0 || light <= 0.01) return
  const life = 3.2
  const first = Math.max(0, Math.ceil((t - life - t0) * rate))
  const last = Math.floor((t - t0) * rate)
  p.push()
  p.noStroke()
  for (let i = first; i <= last; i++) {
    const a = t - (t0 + i / rate)
    if (a < 0 || a > life) continue
    const u = a / life
    const px = x0 + (x1 - x0) * hash(i, 1, seed) + 0.9 * a + 0.35 * Math.sin(a * 2.3 + i)
    const py = y - (1.1 + 0.9 * hash(i, 2, seed)) * a
    const col = mixHex(TOWN.fireHot, TOWN.ember, u)
    const s = 0.04 * (0.6 + 0.8 * hash(i, 3, seed)) * (1 - 0.4 * u)
    const tw = 0.6 + 0.4 * Math.sin(a * 11 + i)
    p.fill(alpha(p, col, (1 - u) * tw * light))
    p.push()
    p.translate(px * k, py * k)
    p.rotate(a * 4 + i)
    p.rect(0, 0, s * k, s * k * 0.55)
    p.pop()
  }
  p.pop()
}

/**
 * Ash and embers on the wind over the whole picture, wherever the camera is: flakes laid out on a grid of tiles in the
 * town's own cells (so they belong to the place, not the screen), each drifting left and up and wandering, grey ash
 * and a few embers. Small turned squares, never beads.
 */
export function ash(p: p5, k: number, f: { x0: number; y0: number; x1: number; y1: number }, t: number, amount: number): void {
  if (amount <= 0.01) return
  const T = 6
  const i0 = Math.floor((f.x0 - 2) / T)
  const i1 = Math.floor((f.x1 + 2) / T)
  const j0 = Math.floor((f.y0 - 2) / T)
  const j1 = Math.floor((f.y1 + 2) / T)
  p.push()
  p.noStroke()
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++)
      for (let n = 0; n < 13; n++) {
        const h1 = hash(i * 31 + n, j, 77)
        const h2 = hash(i, j * 17 + n, 78)
        const h3 = hash(n, i + j * 7, 79)
        const x = i * T + ((((h1 * T - 0.55 * t) % T) + T) % T) + 0.25 * Math.sin(t * (0.9 + h2) + n)
        const y = j * T + ((((h2 * T - 0.3 * t) % T) + T) % T) + 0.2 * Math.sin(t * (1.3 + h1) + n * 2)
        const ember = h3 > 0.6
        const s = (ember ? 0.035 : 0.05) * (0.6 + 0.8 * hash(n, i, j))
        const tw = ember ? 0.55 + 0.45 * Math.sin(t * 7 + n * 3 + i) : 1
        p.fill(alpha(p, ember ? mixHex(TOWN.fireHot, TOWN.fire, h1) : mixHex(TOWN.cobble, TOWN.smoke, 0.5), (ember ? 0.9 : 0.5) * tw * amount))
        p.push()
        p.translate(x * k, y * k)
        p.rotate(t * (1 + 2 * h1) + n)
        p.rect(0, 0, s * k, s * 0.6 * k)
        p.pop()
      }
  p.pop()
}

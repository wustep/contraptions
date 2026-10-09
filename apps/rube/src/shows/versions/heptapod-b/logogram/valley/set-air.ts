import { hash } from '../kit'

/**
 * The valley's air, for the set and the parts that play in it: soft lobes of fog and cloud (volume, never a disc,
 * never outlined), and a smooth noise for ridgelines and drift. Everything here paints straight onto the canvas and
 * leaves its state as it found it.
 */

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
/** 0 until `a`, 1 from `b`, smooth between. */
export const sm = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u

const rgbs = new Map<string, string>()
/** `#rrggbb` as `r, g, b`, for gradients with an alpha. */
export function rgbOf(hex: string): string {
  let got = rgbs.get(hex)
  if (got) return got
  const n = parseInt(hex.slice(1), 16)
  got = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
  rgbs.set(hex, got)
  return got
}

/**
 * A soft lobe of air at (x, y) cells, `rx` by `ry`: dense in the middle, nothing at its edge. `rgb` from `rgbOf`.
 * `core` is how far out the middle stays dense (0.35 a puff, 0.6 a bank).
 */
export function lobe(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, rgb: string, a: number, core = 0.45): void {
  if (a <= 0.004 || rx * k < 0.8 || ry * k < 0.4) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(core, `rgba(${rgb}, ${a * 0.72})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

/** A lobe turned by `rot` radians: long along its own x (`rx`), thin across (`ry`). For fog lying along a slope. */
export function lobeR(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, rx: number, ry: number, rot: number, rgb: string, a: number, core = 0.45): void {
  if (a <= 0.004 || rx * k < 0.8 || ry * k < 0.4) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.rotate(rot)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(core, `rgba(${rgb}, ${a * 0.72})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
  ctx.restore()
}

const beams = new Map<string, HTMLCanvasElement>()
/**
 * A shaft of light from `a` to `b` (cells), `w0` across at `a` and `w1` at `b`, its whole soft width: dense along
 * its middle and nothing at its edges, so however close the camera comes it never shows a pane's edge. `along(v)`
 * is how bright it is from `a` (0) to `b` (1); `kind` names that curve, for the cache. Drawn from a sprite made
 * once for each kind, colour and taper, set onto the beam's line. `level` cuts its ends level instead of square to
 * it, for a shaft that comes down onto flat ground.
 */
export function softBeam(ctx: CanvasRenderingContext2D, k: number, a: readonly [number, number], b: readonly [number, number], w0: number, w1: number, rgb: string, al: number, kind: string, along: (v: number) => number, level = false): void {
  if (al <= 0.004) return
  const W = 256
  const H = 128
  const wide = Math.max(w0, w1)
  // Its taper in eighths of a doubling (fine near a point, coarse near its full width), so a beam that opens or
  // narrows makes a few sprites, not one a frame.
  const q = (w: number) => 2 ** (Math.round(Math.log2(Math.max(1 / 256, w / wide)) * 8) / 8)
  const q0 = q(w0)
  const q1 = q(w1)
  const key = `${kind}|${rgb}|${q0}|${q1}`
  let sprite = beams.get(key)
  if (!sprite) {
    sprite = document.createElement('canvas')
    sprite.width = W
    sprite.height = H
    const c = sprite.getContext('2d')!
    const [r, g, bl] = rgb.split(',').map(Number)
    const img = c.createImageData(W, H)
    for (let y = 0; y < H; y++) {
      const v = (y + 0.5) / H
      const down = along(v)
      const half = lerp(q0, q1, v)
      for (let x = 0; x < W; x++) {
        const u = (Math.abs((x + 0.5) / W - 0.5) * 2) / half
        const across = u >= 1 ? 0 : (1 - u * u) ** 2
        const i = (y * W + x) * 4
        img.data[i] = r
        img.data[i + 1] = g
        img.data[i + 2] = bl
        img.data[i + 3] = Math.round(255 * clamp01(down) * across)
      }
    }
    c.putImageData(img, 0, 0)
    beams.set(key, sprite)
  }
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy)
  // Level, its width is measured across the frame, not across it: near enough for a beam that leans a little.
  const [nx, ny] = level ? [1, 0] : [-dy / L, dx / L]
  ctx.save()
  ctx.globalAlpha *= Math.min(1, al)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // The sprite's across onto the beam's normal, its down onto the line from `a` to `b`.
  ctx.transform((nx * wide * k) / W, (ny * wide * k) / W, (dx * k) / H, (dy * k) / H, (a[0] - (nx * wide) / 2) * k, (a[1] - (ny * wide) / 2) * k)
  ctx.drawImage(sprite, 0, 0)
  ctx.restore()
}

/** Smooth value noise in [0, 1) along x. */
export function vnoise(x: number, seed: number): number {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return hash(i, seed, 17) * (1 - u) + hash(i + 1, seed, 17) * u
}

/** A few octaves of it, in [0, 1). */
export function fbm(x: number, seed: number, octaves = 3): number {
  let v = 0
  let a = 0.5
  let s = 1
  let n = 0
  for (let o = 0; o < octaves; o++) {
    v += a * vnoise(x * s, seed + o * 31)
    n += a
    a *= 0.5
    s *= 2.03
  }
  return v / n
}

/** A horizontal linear gradient band across a rectangle, `a` at its middle, nothing at its edges (a soft stripe). */
export function band(ctx: CanvasRenderingContext2D, k: number, x0: number, x1: number, y0: number, y1: number, rgb: string, a: number): void {
  if (a <= 0.004 || y1 <= y0) return
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, `rgba(${rgb}, 0)`)
  g.addColorStop(0.5, `rgba(${rgb}, ${a})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

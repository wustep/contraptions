import { hash } from '../kit'
import { rgbaOf } from '../depth'

type C2 = CanvasRenderingContext2D

/** A billow's round lobes, from its middle in its own radii: [across, down, radius]. The upper ones catch the light. */
const LOBES: [number, number, number][] = [
  [-0.45, 0.12, 0.72],
  [0.42, 0.16, 0.66],
  [0.02, -0.28, 0.8],
  [-0.1, 0.32, 0.6],
]

/**
 * Steam rising off a manhole or a roof's vent at `x, y` (cells, with the context in cells): billows, each a few round
 * lobes, that come up out of it, lean off on the air, swell and thin away; `size` scales the whole plume. Each billow
 * is one flat fill, its lit top over its shaded underside.
 */
export function steam(ctx: C2, t: number, x: number, y: number, seed: number, size: number): void {
  const n = 6
  for (let j = 0; j < n; j++) {
    const u = (((t * 0.32 + j / n + hash(j, 1, seed) * 0.05) % 1) + 1) % 1
    const a = Math.min(1, u * 5) * (1 - u) * 0.34
    if (a < 0.01) continue
    const r = (0.1 + 0.3 * u) * size
    const cx = x + (-0.7 * u * u + 0.08 * Math.sin(t * 0.7 + j * 2.1) * u) * size
    const cy = y - 1.5 * u * size
    const body = new Path2D()
    const top = new Path2D()
    for (const [dx, dy, s] of LOBES) {
      body.moveTo(cx + dx * r + s * r, cy + dy * r)
      body.arc(cx + dx * r, cy + dy * r, s * r, 0, Math.PI * 2)
      if (dy < 0.2) {
        top.moveTo(cx + dx * r + 0.04 * r + s * r * 0.8, cy + dy * r - 0.12 * r)
        top.arc(cx + dx * r + 0.04 * r, cy + dy * r - 0.12 * r, s * r * 0.8, 0, Math.PI * 2)
      }
    }
    ctx.fillStyle = rgbaOf('#D9D3C8', a)
    ctx.fill(body)
    ctx.fillStyle = rgbaOf('#F7F2E8', a * 0.8)
    ctx.fill(top)
  }
}

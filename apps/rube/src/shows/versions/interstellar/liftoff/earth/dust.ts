import type p5 from 'p5'

/**
 * A puff of dust or exhaust on the farm: soft, uninked lobes of `fill` that fade out at their edges. Machines are
 * inked; what the air carries is not. (The same rule as the cloud's collar at the launch.) Lobes as `puff` in parts.ts
 * lays them, so a puff swaps in where it was; `a` scales its strength, on top of any globalAlpha the caller has set.
 */
export function softPuff(p: p5, k: number, fill: string, x: number, y: number, r: number, a = 1): void {
  if (r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const n = parseInt(fill.slice(1), 16)
  const rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
  const lobes: [number, number, number][] = [
    [0, 0, 1],
    [r * 0.72, r * 0.22, 0.72],
    [-r * 0.66, r * 0.26, 0.66],
    [r * 0.1, -r * 0.5, 0.6],
  ]
  for (const [dx, dy, f] of lobes) {
    const cx = (x + dx) * k
    const cy = (y + dy) * k
    const rr = r * f * k * 1.15
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr)
    g.addColorStop(0, `rgba(${rgb}, ${0.85 * a})`)
    g.addColorStop(0.6, `rgba(${rgb}, ${0.6 * a})`)
    g.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = g
    ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2)
  }
}

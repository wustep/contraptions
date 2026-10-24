import { smooth, type Brush } from '../../paint'

/**
 * Dust thrown up where something heavy lands: a few flat clouds of the sand's colour that swell, lift a little and thin
 * out over a few seconds. No light in them; they only hide what is behind.
 */
export interface Puff {
  x: number
  y: number
  at: number
  /** Its size, cells across when it has swelled. */
  size: number
  /** Which way it drifts, cells a second. */
  drift?: number
  life?: number
  /** Drawn behind the hulls in its plane, not over them. */
  behind?: boolean
}

export function paintPuff(b: Brush, p: Puff, color: string): void {
  const s = b.t - p.at
  const life = p.life ?? 3.4
  if (s <= 0 || s >= life) return
  const { ctx } = b
  const grow = 1 - Math.pow(1 - Math.min(1, s / (life * 0.55)), 2)
  const fade = (1 - smooth(s, life * 0.3, life)) * smooth(s, 0, 0.08)
  const lobes: [number, number, number][] = [
    [-0.32, -0.18, 0.42],
    [0.05, -0.34, 0.5],
    [0.36, -0.16, 0.4],
    [0.0, -0.08, 0.55],
  ]
  for (const [ox, oy, r] of lobes) {
    const rx = p.size * r * (0.35 + 0.65 * grow)
    const cx = p.x + ox * p.size * (0.4 + 0.6 * grow) + (p.drift ?? 0) * s
    const cy = p.y + oy * p.size * grow - 0.25 * p.size * grow * 0.4
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, rx * 0.62, 0, 0, Math.PI * 2)
    ctx.fillStyle = b.ca(color, 0.62 * fade)
    ctx.fill()
  }
}

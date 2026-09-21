import type p5 from 'p5'
import { outline } from '../../../../../../src/core/draw'
import type { Theme } from '../../../../../../src/core/themes'
import { fly, type Pt, type Seg } from '../../../parts'
import { snowAt } from './snow'

/**
 * What batch e's pieces share: a gravity, so that every throw in them
 * falls the same way; colours picked by hue, so that a fire is warm and a
 * lamp is red or green in either palette; and a few small drawings.
 */

/** Cartoon gravity, cells per second squared. */
export const G = 22

/**
 * A ballistic flight from `from` to `to` in `dur` seconds under `G`: the
 * `arc` a parabola needs for its fall to be gravity's, whatever its chord.
 */
export const lob = (from: Pt, to: Pt, dur: number, extra: Partial<Seg> = {}): Seg => fly(from, to, dur, (G * dur * dur) / 8, extra)

/** How long a lob launched at `angle` (radians above the horizontal) takes to get from `from` to `to`, and how fast it leaves. */
export function lobAt(from: Pt, to: Pt, angle: number): { dur: number; speed: number } {
  const dx = Math.abs(to[0] - from[0])
  const dy = to[1] - from[1]
  // y = -dx tan(a) + (G / 2) (dx / vx)^2, solved for vx.
  const vx = Math.sqrt(((G / 2) * dx * dx) / (dy + dx * Math.tan(angle)))
  return { dur: dx / vx, speed: vx / Math.cos(angle) }
}

const hueOf = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d < 0.08) return -1
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

/** The palette's colour nearest `hue` in degrees, leaving `avoid` out while there is another. Greys and whites are never near. */
export function nearHue(theme: Theme, hue: number, ...avoid: string[]): string {
  const off = (hex: string) => {
    const h = hueOf(hex)
    if (h < 0) return 999
    const d = Math.abs(h - hue) % 360
    return Math.min(d, 360 - d)
  }
  const pool = theme.colors.filter((c) => !avoid.includes(c))
  return [...(pool.length ? pool : theme.colors)].sort((a, b) => off(a) - off(b))[0]
}

/** The snow's line through `pts`, as a soft curve: where a piece's ground leaves the level, a hollow or a bank. */
export function snowPath(p: p5, k: number, ink: string, weight: number, pts: Pt[]): void {
  outline(p, ink, weight * 0.8)
  p.beginShape()
  p.curveVertex(pts[0][0] * k, pts[0][1] * k)
  for (const [x, y] of pts) p.curveVertex(x * k, y * k)
  const last = pts[pts.length - 1]
  p.curveVertex(last[0] * k, last[1] * k)
  p.endShape()
}

/** A post from `y0` down into the snow at `x`, a little way under its line. */
export function stake(p: p5, k: number, ink: string, weight: number, x: number, y0: number, level?: number): void {
  outline(p, ink, weight)
  p.line(x * k, y0 * k, x * k, (snowAt(x, level) + 0.03) * k)
}

/**
 * A limb: a bent line drawn fat in `fill` inside one ink outline, through
 * `pts`. Stroked twice, ink then fill, so its joints are round and its
 * silhouette is one line.
 */
export function limb(p: p5, k: number, ink: string, weight: number, fill: string, pts: Pt[], width: number): void {
  p.noFill()
  for (const [color, w] of [
    [ink, width * k + weight * 2],
    [fill, width * k],
  ] as const) {
    p.stroke(color)
    p.strokeWeight(w)
    p.beginShape()
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    p.endShape()
  }
}

/** Drops of `color` thrown up from (x, y) on short arcs, `f` from 0 (the instant) to 1 (gone). */
export function spray(p: p5, k: number, color: string, x: number, y: number, f: number, size = 1): void {
  if (f <= 0 || f >= 1) return
  p.noStroke()
  p.fill(color)
  for (const [dx, up] of [[-1, 0.8], [-0.4, 1.25], [0.45, 1.35], [1, 0.75]]) {
    const px = x + dx * 0.14 * size * f
    const py = y - up * 0.2 * size * 4 * f * (1 - f)
    p.circle(px * k, py * k, 0.04 * size * (1 - f * 0.5) * k)
  }
}

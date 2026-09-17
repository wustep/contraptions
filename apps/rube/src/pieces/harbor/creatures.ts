import type p5 from 'p5'
import type { Pt } from '../../parts'
import { WATER } from './sea'

/**
 * What the harbor's animals share: a body drawn as one shape round a
 * spine, and the waterline as something to be cut off at. A seal, a
 * dolphin and a serpent are all a line with a thickness that changes
 * along it; drawing them that way keeps each one a single silhouette with
 * a single outline however it bends.
 */

/** A point on a spine: where it is, and half the body's thickness there. */
export type Rib = [x: number, y: number, half: number]

/** A smooth line through `pts`, `n` steps a span: Catmull-Rom, thickness and all. */
export function through(pts: Rib[], n: number): Rib[] {
  const out: Rib[] = []
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))]
  for (let i = 0; i < pts.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      const f = j / n
      const rib: Rib = [0, 0, 0]
      for (let d = 0; d < 3; d++) {
        const [a, b, c, e] = [at(i - 1)[d], at(i)[d], at(i + 1)[d], at(i + 2)[d]]
        rib[d] = 0.5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - e) * f * f + (3 * b - a - 3 * c + e) * f * f * f)
      }
      out.push(rib)
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/** One closed shape round a spine, with a round end at the last rib: the nose. Set the stroke and fill first. */
export function body(p: p5, k: number, spine: Rib[]): void {
  const left: Pt[] = []
  const right: Pt[] = []
  spine.forEach(([x, y, w], i) => {
    const [ax, ay] = spine[Math.max(0, i - 1)]
    const [bx, by] = spine[Math.min(spine.length - 1, i + 1)]
    const len = Math.hypot(bx - ax, by - ay) || 1
    const nx = -(by - ay) / len
    const ny = (bx - ax) / len
    left.push([x + nx * w, y + ny * w])
    right.push([x - nx * w, y - ny * w])
  })
  const [ex, ey, ew] = spine[spine.length - 1]
  const [qx, qy] = spine[spine.length - 2]
  const dir = Math.atan2(ey - qy, ex - qx)
  p.beginShape()
  for (const [x, y] of left) p.vertex(x * k, y * k)
  for (let i = 1; i < 8; i++) {
    const a = dir + Math.PI / 2 - (i / 8) * Math.PI
    p.vertex((ex + Math.cos(a) * ew) * k, (ey + Math.sin(a) * ew) * k)
  }
  for (const [x, y] of right.reverse()) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A flipper or a fin from (x, y): a long leaf along `angle`. Set the stroke and fill first. */
export function flipper(p: p5, k: number, x: number, y: number, len: number, angle: number, width = 0.36): void {
  p.push()
  p.translate(x * k, y * k)
  p.rotate(angle)
  p.beginShape()
  p.vertex(0, -len * 0.12 * k)
  p.bezierVertex(len * 0.4 * k, -len * width * k, len * 0.9 * k, -len * width * 0.7 * k, len * k, 0)
  p.bezierVertex(len * 0.8 * k, len * width * 0.5 * k, len * 0.3 * k, len * width * 0.45 * k, 0, len * 0.12 * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/**
 * Cut everything drawn from here to the matching `p.pop()` off at the
 * waterline between x0 and x1 — the same wavy line `water()` draws, so the
 * cut hides under it. For an animal that comes up out of the sea and goes
 * back into it: what is under the surface is not seen. Call inside a
 * `p.push()`.
 */
export function aboveWater(p: p5, k: number, x0: number, x1: number, y = WATER): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.moveTo(x0 * k, (y - 3) * k)
  ctx.lineTo(x1 * k, (y - 3) * k)
  for (let x = x1; x >= x0 - 0.001; x -= 0.02) ctx.lineTo(x * k, (y + 0.022 * Math.sin(x * Math.PI * 6)) * k)
  ctx.closePath()
  ctx.clip()
}

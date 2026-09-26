import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { ROCKS } from '../worlds'
import { INK, rgba } from './ledgeLand'
import { groundAt, type Ledge } from './ledgePath'

/**
 * The two of them as stones: drawn over their balls, so the rocks on the ledge are rocks and not marbles.
 *
 * Each is an irregular pebble in its own frame, in ball radii, its underside flatter than the rest and more of it
 * above the ball's centre than below, and never inside the ball's round anywhere (so no edge of the ball shows).
 * It turns as it rolls, lumps and speckles and crack together. Wherever it would dip into the ground it lies flat on
 * it instead, so a stone at rest sits on a face. The light is from the sky and does not turn with it: a paler top,
 * a shade underneath. Evelyn's is the bigger and rounder, and her googly eye (drawn over everything, on her ball's
 * centre) sits in its upper face. Joy's is smaller, and angular, a flat-faced slab of a pebble.
 */

export interface Stone {
  /** The outline, in ball radii about the ball's centre, in the stone's own frame (y down). */
  pts: Pt[]
  /** Speckles (x, y, r) and a crack, in the same frame. */
  specks: [number, number, number][]
  crack: Pt[]
}

/** Never inside the ball: the outline is at least this far out, in ball radii. */
const COVER = 1.03
/** The flat underside's depth below the centre, in ball radii: on the ground, as the ball is. */
const UNDER = 1.02

function shaped(n: number, radius: (a: number) => number, angular: boolean): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (angular ? 0.35 * (hash(i, 41) - 0.5) * ((Math.PI * 2) / n) : 0)
    // More of it above than below.
    let r = radius(a) * (1 + 0.075 * Math.max(0, -Math.sin(a)))
    // The underside flatter: nothing lower than the flat.
    const y = r * Math.sin(a)
    if (y > UNDER) r = UNDER / Math.sin(a)
    pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  // Keep every edge out of the ball's round: an edge closer to the centre than COVER is pushed out.
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const d = Math.hypot(dx, dy) || 1
      const dist = Math.abs(a[0] * dy - a[1] * dx) / d
      const mid = (Math.hypot(a[0], a[1]) + Math.hypot(b[0], b[1])) / 2
      if (dist < COVER && mid > 0) {
        const f = 1 + (COVER - dist) / mid
        for (const q of [a, b]) {
          // The flat underside stays at its depth; the push goes sideways there.
          if (q[1] >= UNDER - 1e-3) q[0] *= f
          else {
            q[0] *= f
            q[1] *= f
          }
        }
      }
    }
  }
  return pts
}

/** Evelyn: the larger stone, round-shouldered, a little lumpy. */
export const EVELYN_ROCK: Stone = {
  pts: shaped(34, (a) => 1.21 + 0.04 * Math.cos(2 * a + 0.4) + 0.03 * Math.cos(3 * a + 1.9) + 0.018 * Math.cos(5 * a + 0.7), false),
  specks: [
    [-0.62, 0.35, 0.075],
    [0.5, 0.52, 0.055],
    [0.72, -0.28, 0.065],
    [-0.3, 0.72, 0.045],
    [0.18, 0.2, 0.04],
  ],
  crack: [
    [-1.08, 0.12],
    [-0.8, 0.2],
    [-0.66, 0.08],
    [-0.44, 0.16],
  ],
}

/** Joy: smaller, angular, a slab of a pebble with a flat face top and bottom. */
export const JOY_ROCK: Stone = {
  pts: shaped(11, (a) => 1.05 + 0.06 * hash(Math.round(a * 10), 7) - 0.05 * Math.max(0, -Math.sin(a)) ** 3, true),
  specks: [
    [0.45, 0.4, 0.07],
    [-0.5, -0.2, 0.05],
    [0.1, 0.62, 0.05],
    [-0.2, 0.3, 0.035],
  ],
  crack: [
    [0.3, -1.02],
    [0.18, -0.7],
    [0.34, -0.5],
  ],
}

/**
 * A stone over a ball whose centre is at (x, y), turned by `turn`, in `color` (the ball's own, faded as it is), lying
 * flat on whichever of `ledges` it would otherwise sink into.
 */
export function paintStone(p: p5, k: number, weight: number, stone: Stone, x: number, y: number, turn: number, color: string, ledges: Ledge[]): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  const world = ([u, v]: Pt): Pt => [x + R * (u * c - v * s), y + R * (u * s + v * c)]
  // The ground under it: the ledges near enough to touch.
  const near = ledges.filter((l) => x + 1.4 * R >= l.a[0] && x - 1.4 * R <= l.b[0] && Math.abs(groundAt(l, Math.max(l.a[0], Math.min(l.b[0], x))) - y) < 1.6 * R)
  // Its own ink line dips into the ground by half its width, as the ball's does.
  const sink = weight / (2 * k)
  const lie = (q: Pt): Pt => {
    let [qx, qy] = q
    for (const l of near) {
      if (qx < l.a[0] || qx > l.b[0]) continue
      const g = groundAt(l, qx) + sink * 0.5
      if (qy > g && y < g) qy = g
    }
    return [qx, qy]
  }
  const outline = stone.pts.map((q) => lie(world(q)))
  const trace = () => {
    ctx.beginPath()
    outline.forEach(([qx, qy], i) => (i === 0 ? ctx.moveTo(qx * k, qy * k) : ctx.lineTo(qx * k, qy * k)))
    ctx.closePath()
  }
  trace()
  ctx.fillStyle = color
  ctx.fill()
  ctx.save()
  trace()
  ctx.clip()
  // The shade underneath and the light on top: from the sky, so they do not turn with it.
  ctx.fillStyle = rgba(mixHex(color, ROCKS.stoneDeep, 0.55), 0.55)
  ctx.beginPath()
  ctx.ellipse(x * k, (y + 0.95 * R) * k, 1.6 * R * k, 0.8 * R * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba(mixHex(color, ROCKS.far, 0.45), 0.7)
  ctx.beginPath()
  ctx.ellipse((x - 0.18 * R) * k, (y - 0.78 * R) * k, 0.78 * R * k, 0.42 * R * k, -0.12, 0, Math.PI * 2)
  ctx.fill()
  // Speckles and a crack, on the stone: they turn with it, and show it rolling.
  ctx.fillStyle = rgba(mixHex(color, INK, 0.5), 0.75)
  for (const [u, v, r] of stone.specks) {
    const [sx, sy] = world([u, v])
    ctx.beginPath()
    ctx.ellipse(sx * k, sy * k, r * R * k, r * 0.72 * R * k, turn + u, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = rgba(INK, 0.55)
  ctx.lineWidth = Math.max(0.6, weight * 0.45)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  stone.crack.forEach((q, i) => {
    const [cx, cy] = world(q)
    if (i === 0) ctx.moveTo(cx * k, cy * k)
    else ctx.lineTo(cx * k, cy * k)
  })
  ctx.stroke()
  ctx.restore()
  trace()
  ctx.strokeStyle = INK
  ctx.lineWidth = weight
  ctx.lineJoin = 'round'
  ctx.stroke()
}

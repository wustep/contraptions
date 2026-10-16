import type { Pt } from '../../../../../parts'
import { layer, rgbaOf, type View } from '../depth'
import { hash, smooth } from '../kit'
import { BOAT } from './boat'
import { BOAT_X0, OUT, REST_X, W } from './sea-plan'

/**
 * Above the water, once he is hauled out (B's): gulls following the boat, wheeling over its stern and crying down at
 * the catch, and the swell slapping at the hull and throwing spray. In the sea's cells, in front of the machine and
 * under Walter.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera mostly is on the deck, and how tall its frame. */
const DECK_AT: Pt = [REST_X + 0.6, -1.2]
const DECK_REF = 4.6

/** How much of the topside there is: from as he is hauled out. */
export const topsideAt = (t: number): number => smooth(t, OUT - 0.6, OUT + 0.4)

export function drawTopside(g: C2, v: View, t: number): void {
  const a = topsideAt(t)
  if (a <= 0.01 || v.y0 > W) return
  const k = v.k
  drawSpray(g, k, t, a)
  layer(g, v, 0.85, DECK_AT, DECK_REF, (inner) => gulls(g, inner, t, a, 0))
  layer(g, v, 1.3, DECK_AT, DECK_REF, (inner) => gulls(g, inner, t, a, 1))
}

/** The swell slapping at the hull, bow and stern, throwing up a burst of spray every so often, each its own way. */
function drawSpray(g: C2, k: number, t: number, a: number): void {
  const drops = new Path2D()
  for (const [x, dir, period, seed] of [[BOAT_X0 + BOAT.len + 0.3, 1, 1.9, 1], [BOAT_X0 - 0.05, -1, 2.3, 2]] as [number, number, number, number][]) {
    const u = (((t + seed * 0.7) / period) % 1 + 1) % 1
    const age = u * period
    if (age > 1.1) continue
    for (let j = 0; j < 14; j++) {
      const vx = dir * (0.3 + 1.1 * hash(j, seed, 1)) * (hash(j, seed, 4) < 0.25 ? -0.5 : 1)
      const vy = -(1.4 + 1.6 * hash(j, seed, 2))
      const px = x + vx * age
      const py = W + vy * age + 0.5 * 9 * age * age
      if (py > W + 0.02) continue
      const r = 0.018 + 0.025 * hash(j, seed, 3)
      drops.moveTo((px + r) * k, py * k)
      drops.arc(px * k, py * k, r * k, 0, Math.PI * 2)
    }
  }
  g.fillStyle = rgbaOf('#E9EFEE', 0.8 * a)
  g.fill(drops)
}

/** Gulls following the boat: wheeling over its stern on stiff wings, a beat now and then; one nearer, going over. */
function gulls(g: C2, v: View, t: number, a: number, near: number): void {
  const k = v.k
  const dark = new Path2D()
  const light = new Path2D()
  const n = near ? 1 : 4
  for (let i = 0; i < n; i++) {
    let x: number
    let y: number
    if (near) {
      // The near one crosses the frame's top on its way somewhere, slowly.
      const u = (((t - OUT) / 7) % 1 + 1) % 1
      x = v.x1 + 1 - u * (v.w + 2)
      y = v.y0 + 0.12 * v.h + 0.15 * Math.sin(t * 0.8)
    } else {
      const cx = BOAT_X0 + 1.5 + i * 1.3
      const cy = W - 3.2 - 0.6 * hash(i, 61)
      const ang = t * (0.45 + 0.15 * hash(i, 62)) * (i % 2 ? 1 : -1) + i * 1.9
      x = cx + (1.1 + 0.5 * hash(i, 63)) * Math.cos(ang)
      y = cy + 0.35 * Math.sin(ang)
    }
    const span = near ? 0.32 : 0.17
    const beat = smooth(Math.sin(t * 1.1 + i * 2.3), 0.55, 1) * Math.sin(t * 12 + i)
    const lift = 0.3 + 0.4 * beat
    for (const [p, w] of [[light, 1], [dark, 0.35]] as [Path2D, number][]) {
      p.moveTo((x - span * w) * k, (y - span * lift * w) * k)
      p.quadraticCurveTo((x - span * 0.4 * w) * k, (y - span * 0.4 * w) * k, x * k, y * k)
      p.quadraticCurveTo((x + span * 0.4 * w) * k, (y - span * 0.4 * w) * k, (x + span * w) * k, (y - span * lift * w) * k)
    }
  }
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = Math.max(1, (near ? 0.045 : 0.026) * k)
  g.strokeStyle = rgbaOf('#F1F3EF', 0.95 * a)
  g.stroke(light)
  g.strokeStyle = rgbaOf('#3F4A4F', 0.9 * a)
  g.stroke(dark)
}

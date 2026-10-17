import type { Pt } from '../../../../../parts'
import { layer, rgbaOf, type View } from '../depth'
import { hash, smooth } from '../kit'
import { BOAT_X0, OUT, REST_X, W } from './sea-plan'

/**
 * Above the water, once he is hauled out (B's): two gulls following the boat, wheeling over its stern on stiff wings.
 * In the sea's cells, in front of the machine and under Walter.
 */

type C2 = CanvasRenderingContext2D

/** Where the camera mostly is on the deck, and how tall its frame. */
const DECK_AT: Pt = [REST_X + 0.6, -1.2]
const DECK_REF = 4.6

/** How much of the topside there is: from as he is hauled out. */
const topsideAt = (t: number): number => smooth(t, OUT - 0.6, OUT + 0.4)

export function drawTopside(g: C2, v: View, t: number): void {
  const a = topsideAt(t)
  if (a <= 0.01 || v.y0 > W) return
  layer(g, v, 0.85, DECK_AT, DECK_REF, (inner) => gulls(g, inner, t, a))
}

/** Gulls following the boat: wheeling over its stern on stiff wings, a beat now and then. */
function gulls(g: C2, v: View, t: number, a: number): void {
  const k = v.k
  const dark = new Path2D()
  const light = new Path2D()
  for (let i = 0; i < 2; i++) {
    const cx = BOAT_X0 + 1.5 + i * 1.9
    const cy = W - 3.2 - 0.6 * hash(i, 61)
    const ang = t * (0.45 + 0.15 * hash(i, 62)) * (i % 2 ? 1 : -1) + i * 1.9
    const x = cx + (1.1 + 0.5 * hash(i, 63)) * Math.cos(ang)
    const y = cy + 0.35 * Math.sin(ang)
    const span = 0.17
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
  g.lineWidth = Math.max(1, 0.026 * k)
  g.strokeStyle = rgbaOf('#F1F3EF', 0.95 * a)
  g.stroke(light)
  g.strokeStyle = rgbaOf('#3F4A4F', 0.9 * a)
  g.stroke(dark)
}

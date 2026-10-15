import type { Pt } from '../../../../../parts'
import { layer, motes, rgbaOf, view, type View } from '../depth'
import { hash, scenery, smooth } from '../kit'
import { jolt } from './air'
import { END, heli, LIFT, WIDE_FROM, WIDE_TO } from './sky-plan'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * On the pad, the rotor's wash throwing grit and spray out flat along the quay as the skids leave it. In the flight,
 * wisps of low cloud nearer than the helicopter going by fast at the frame's head and foot (never across the middle,
 * where he is), which is what says how quick it is when the sea below hardly moves; rain streaking past; and the
 * cold, pearl light of the overcast closing in at the frame's edges.
 */

/** Where the camera mostly is in the cruise, and how tall its frame: what the near planes are composed against. */
const CRUISE_AT: Pt = [20, -7.2]
const CRUISE_REF = 6.6

/** The rain: a drizzle on the pad, showers through the cruise, thinning as it comes down by the boat. */
const rainAt = (t: number): number => 0.45 + 0.55 * smooth(t, LIFT + 1.5, LIFT + 3.5) - 0.35 * smooth(t, WIDE_TO - 1, WIDE_TO + 1)

export const skyFront = scenery<null>({
  name: 'sky-front',
  draw: (p, _s, c) => {
    const g = p.drawingContext as CanvasRenderingContext2D
    const v = view(p, c.k)
    const t = c.t
    drawGrit(g, v, t)
    drawWisps(g, v, t)
    drawRain(g, v, t)
  },
})

/** The wash on the pad: grit and spray thrown out flat both ways from under the rotor as it spools up and lifts. */
function drawGrit(g: CanvasRenderingContext2D, v: View, t: number): void {
  const a = smooth(t, LIFT - 1.6, LIFT - 0.2) * (1 - smooth(t, LIFT + 1.2, LIFT + 3))
  if (a <= 0.01) return
  const hx = heli(t).x + 0.4
  for (const dir of [-1, 1]) {
    const box = dir < 0 ? { x0: hx - 6, y0: -0.55, x1: hx - 0.8, y1: 0.12 } : { x0: hx + 0.8, y0: -0.55, x1: hx + 6, y1: 0.12 }
    motes(g, v, t, { n: 26, seed: dir < 0 ? 61 : 67, tile: [2.4, 0.7], r: [0.008, 0.016], v: [dir * 5.5, -0.35], spread: 0.45, color: rgbaOf('#E3E8E5', 0.55 * a), streak: 0.05, within: box })
  }
}

/**
 * The wisps: low cloud nearer than the helicopter, on three planes in front of it, so the nearest goes by quickest.
 * Each is a few flat, pale, overlapping lozenges, in the frame's top and bottom fifths only. The drops in the air jolt
 * them, the nearest most.
 */
function drawWisps(g: CanvasRenderingContext2D, v: View, t: number): void {
  const a = smooth(t, LIFT + 2, LIFT + 3.5) * (1 - smooth(t, END - 2.4, END - 1.2))
  if (a <= 0.01) return
  for (const [z, n, seed] of [[1.4, 3, 1], [1.6, 3, 2], [1.85, 2, 3]] as [number, number, number][]) {
    layer(g, v, z, CRUISE_AT, CRUISE_REF, (inner) => {
      const k = inner.k
      const span = inner.w + 8
      const body = new Path2D()
      const core = new Path2D()
      const kick = jolt(t) * 0.12 * z
      for (let i = 0; i < n; i++) {
        const gx = hash(i, seed, 1) * span * 1.7 - t * 0.6
        const x = inner.x0 - 4 + ((((gx - (inner.x0 - 4)) % span) + span) % span)
        const top = hash(i, seed, 2) < 0.5
        const y = inner.y0 + inner.h * (top ? 0.03 + 0.12 * hash(i, seed, 3) : 0.86 + 0.11 * hash(i, seed, 3)) + kick
        const w = (2 + 2.6 * hash(i, seed, 4)) * (z / 1.6)
        const h = (0.1 + 0.1 * hash(i, seed, 5)) * (z / 1.6)
        for (let j = 0; j < 3; j++) {
          const ox = (j - 1) * w * 0.42 + (hash(i, j, seed + 7) - 0.5) * w * 0.2
          const oy = (hash(i, j, seed + 8) - 0.5) * h * 0.9
          const ww = w * (0.45 + 0.25 * hash(i, j, seed + 9))
          body.moveTo((x + ox + ww) * k, (y + oy) * k)
          body.ellipse((x + ox) * k, (y + oy) * k, ww * k, h * k, 0, 0, Math.PI * 2)
          core.moveTo((x + ox + ww * 0.6) * k, (y + oy) * k)
          core.ellipse((x + ox) * k, (y + oy) * k, ww * 0.6 * k, h * 0.55 * k, 0, 0, Math.PI * 2)
        }
      }
      g.fillStyle = rgbaOf('#EEF1EF', 0.24 * a)
      g.fill(body)
      g.fillStyle = rgbaOf('#F7F8F5', 0.3 * a)
      g.fill(core)
    })
  }
}

/**
 * Rain streaking past the lens: on the pad it falls nearly straight; in the flight it streams back past the
 * helicopter. Each drop a short straight stroke, square-ended (round ends cost twice as much and are never seen).
 */
function drawRain(g: CanvasRenderingContext2D, v: View, t: number): void {
  const rain = rainAt(t)
  const fly = smooth(t, LIFT + 0.5, LIFT + 3) * (1 - smooth(t, WIDE_FROM + 2, WIDE_TO))
  layer(g, v, 1.25, CRUISE_AT, CRUISE_REF, (inner) => {
    const k = inner.k
    const path = new Path2D()
    const vx = -1.4 + (-8 + 1.4) * fly
    const vy = 9 + (6.5 - 9) * fly
    const len = 0.04
    const [tw, th] = [4, 3]
    const i0 = Math.floor(inner.x0 / tw)
    const i1 = Math.floor(inner.x1 / tw)
    const j0 = Math.floor(inner.y0 / th)
    const j1 = Math.floor(inner.y1 / th)
    // Heavier in the showers out over the sea.
    const count = Math.round(20 + 22 * fly)
    for (let n = 0; n < count; n++) {
      const f = 1 + 0.25 * (2 * hash(n, 3, 71) - 1)
      const x = ((((hash(n, 1, 71) * tw + vx * f * t) % tw) + tw) % tw)
      const y = ((((hash(n, 2, 71) * th + vy * f * t) % th) + th) % th)
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          const px = x + i * tw
          const py = y + j * th
          if (px < inner.x0 - 1 || px > inner.x1 + 1 || py < inner.y0 - 1 || py > inner.y1 + 1) continue
          path.moveTo(px * k, py * k)
          path.lineTo((px - vx * f * len) * k, (py - vy * f * len) * k)
        }
    }
    g.lineWidth = Math.max(0.8, 0.015 * k)
    g.strokeStyle = rgbaOf('#E4E9E8', 0.32 * rain)
    g.stroke(path)
  })
}

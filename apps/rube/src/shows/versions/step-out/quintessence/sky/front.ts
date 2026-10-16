import type { Pt } from '../../../../../parts'
import { layer, rgbaOf, view, type View } from '../depth'
import { hash, scenery, smooth } from '../kit'
import { jolt } from './air'
import { END, LIFT, WIDE_FROM, WIDE_TO } from './sky-plan'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * Rain, falling on the pad and streaking back past the helicopter in the flight; and in the flight a few rags of scud
 * nearer than the helicopter going by fast at the frame's head (never across the middle, where he is). They are what
 * say how quick it is when the sea below hardly moves.
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
    drawScud(g, v, t)
    drawRain(g, v, t)
  },
})

/**
 * The scud: rags of low cloud torn off the overcast, on one plane in front of the helicopter, in the frame's top sixth
 * only. Each is one flat grey, darker than the overcast above it, ragged along its foot. The drops in the air jolt them.
 */
function drawScud(g: CanvasRenderingContext2D, v: View, t: number): void {
  const a = smooth(t, LIFT + 2, LIFT + 3.5) * (1 - smooth(t, END - 2.4, END - 1.2))
  if (a <= 0.01) return
  layer(g, v, 1.5, CRUISE_AT, CRUISE_REF, (inner) => {
    const k = inner.k
    const span = inner.w + 8
    const rags = new Path2D()
    const kick = jolt(t) * 0.18
    for (let i = 0; i < 3; i++) {
      const gx = hash(i, 1, 1) * span * 1.7 - t * 0.6
      const x = inner.x0 - 5 + ((((gx - (inner.x0 - 5)) % span) + span) % span)
      const y = inner.y0 + inner.h * (0.04 + 0.08 * hash(i, 3, 1)) + kick
      const w = 3 + 2.5 * hash(i, 4, 1)
      const h = 0.16 + 0.1 * hash(i, 5, 1)
      const n = 24
      for (let j = 0; j <= n; j++) {
        const u = j / n
        const p = Math.pow(Math.sin(u * Math.PI), 0.7)
        const yy = y - h * 0.4 * p * (1 + 0.25 * Math.sin(u * 7 + i))
        if (j) rags.lineTo((x + u * w) * k, yy * k)
        else rags.moveTo(x * k, yy * k)
      }
      for (let j = n; j >= 0; j--) {
        const u = j / n
        const p = Math.pow(Math.sin(u * Math.PI), 0.7)
        const rag = Math.abs(Math.sin(u * 11 + i * 2 + t * 0.4)) * (0.6 + 0.4 * Math.sin(u * 4.3 + i))
        rags.lineTo((x + u * w) * k, (y + h * p * (0.35 + 0.5 * rag)) * k)
      }
      rags.closePath()
    }
    g.fillStyle = rgbaOf('#8E989C', a)
    g.fill(rags)
  })
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

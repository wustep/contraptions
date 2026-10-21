import type { Pt } from '../../../../../parts'
import { layer, rgbaOf, view, type View } from '../depth'
import { hash, scenery, smooth } from '../kit'
import { cabin } from './sky-draw'
import { heli, LIFT, WIDE_FROM, WIDE_TO } from './sky-plan'

/**
 * What stands between the camera and the machine in this place, and the light over all of it: the near plane, the
 * air, the grade. Drawn after the set and the parts and before Walter (`depth.ts`), so nothing here hides him or
 * changes his colour. It is handed show time as `t`.
 *
 * A thin rain, falling on the pad and streaking back in the flight: what says how quick it is when the sea below
 * hardly moves. It is never across the helicopter's cabin.
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
    drawRain(g, view(p, c.k), c.t)
  },
})

/**
 * Rain streaking past the lens: on the pad it falls nearly straight; in the flight it streams back. A few short pale
 * strokes, square-ended (round ends cost twice as much and are never seen), kept off the helicopter's cabin.
 */
function drawRain(g: CanvasRenderingContext2D, v: View, t: number): void {
  const rain = rainAt(t)
  const fly = smooth(t, LIFT + 0.5, LIFT + 3) * (1 - smooth(t, WIDE_FROM + 2, WIDE_TO))
  const k = v.k
  const h = heli(t)
  g.save()
  g.beginPath()
  g.rect((v.x0 - 1) * k, (v.y0 - 1) * k, (v.w + 2) * k, (v.h + 2) * k)
  g.save()
  g.translate(h.x * k, h.y * k)
  g.rotate(h.a)
  cabin(g, k)
  g.restore()
  g.clip('evenodd')
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
    // A little heavier in the showers out over the sea.
    const count = Math.round(7 + 5 * fly)
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
    g.strokeStyle = rgbaOf('#E4E9E8', 0.24 * rain)
    g.stroke(path)
  })
  g.restore()
}

import type { Pt } from '../../../../../parts'
import { alpha, frame, scenery, smooth } from '../kit'
import { cue } from '../music'

/**
 * Cooper Station's near layer: twice, a bird crosses close to the camera, high in the frame, faster than the world:
 * once over the working ring, once as the lift climbs. Drawn over everything (its `over`), so it is kept to the top of
 * the frame and never over the ball's way. (Wisps of cloud near the camera went: at the frame's edges they read as
 * grey smudges on the lens.)
 */
export interface NearState {
  /** The axis, in world cells. */
  axis: Pt
  /** Show time the lights come up (the organ's accent). */
  lights: number
}

/** The two close birds: when each crosses, over how long. */
const BIRDS = [
  { at: cue(118.5), dur: 2.2, dir: 1 },
  { at: cue(164.5), dur: 2.0, dir: -1 },
]

export const stationNear = scenery<NearState>({
  name: 'station-near',
  draw: () => {},
  over: (p, s, c) => {
    const { k, t, ink } = c
    const lit = smooth(t, s.lights - 0.1, s.lights + 0.6)
    if (lit <= 0.01) return
    const f = frame(p, k)
    const X = (v: number) => v * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    // The close birds: across the top of the frame, wings beating, a little bigger than the ring's.
    ctx.strokeStyle = alpha(p, ink, 0.7 * lit).toString()
    ctx.lineWidth = Math.max(1, k * 0.022)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const b of BIRDS) {
      const u = (t - b.at) / b.dur
      if (u < 0 || u > 1) continue
      const w = f.x1 - f.x0
      const h = f.y1 - f.y0
      const x = b.dir > 0 ? f.x0 - 0.1 * w + u * 1.2 * w : f.x1 + 0.1 * w - u * 1.2 * w
      const y = f.y0 + h * (0.16 + 0.06 * Math.sin(u * 5))
      const span = 0.012 * Math.max(w, h) + 0.08
      const flap = span * 0.55 * Math.sin(t * 11)
      ctx.beginPath()
      ctx.moveTo(X(x - span), X(y - flap))
      ctx.quadraticCurveTo(X(x - span * 0.4), X(y - flap * 0.3 - span * 0.25), X(x), X(y))
      ctx.quadraticCurveTo(X(x + span * 0.4), X(y - flap * 0.3 - span * 0.25), X(x + span), X(y - flap))
      ctx.stroke()
    }
    ctx.restore()
  },
})

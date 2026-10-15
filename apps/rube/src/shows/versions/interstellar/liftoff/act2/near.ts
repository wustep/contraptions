import type { Pt } from '../../../../../parts'
import { alpha, frame, scenery, smooth } from '../kit'
import { cue } from '../music'
import { airAt } from './daylight'
import { RIM_R } from './station'

/**
 * Cooper Station's near layer: what hangs in the air between the camera and the ring, faster than the world. Drawn
 * over everything (its `over`), so it is kept to the edges and never over the ball's way.
 *
 * - Wisps of cloud close to the camera, going round with the air a little quicker than the ring's clouds, and
 *   bigger: they slide across the frame's edges as it moves, so the air has a near and a far. Faint, so what they pass
 *   over still reads through them, and gone through the far-side house, where the frame is for the two of them.
 * - Twice, a bird crosses close, high in the frame: once over the working ring, once as the lift climbs.
 */
export interface NearState {
  /** The axis, in world cells. */
  axis: Pt
  /** Show time the lights come up (the organ's accent). */
  lights: number
}

/** How much more than the world the near layer moves with the camera. */
const NEAR = 1.45
const WISPS = [
  { a: 0.9, r: 17.2, w: 0.022, len: 2.6 },
  { a: 2.6, r: 15.4, w: 0.018, len: 3.2 },
  { a: 4.2, r: 16.6, w: 0.026, len: 2.2 },
  { a: 5.4, r: 14.8, w: 0.02, len: 2.8 },
  { a: 0.1, r: 12.5, w: 0.016, len: 3.4 },
]
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
    const [ax, ay] = s.axis
    // Out of the far-side house's scenes, where the frame is theirs.
    const clear = 1 - smooth(t, cue(151.4), cue(152)) * (1 - smooth(t, cue(160.5), cue(161.5)))
    const air = airAt(t, lit)
    const near = (q: Pt): Pt => [f.cx + (q[0] - f.cx) * NEAR, f.cy + (q[1] - f.cy) * NEAR]
    ctx.save()
    // Only in the station's air: from outside, in the whole-station shots, a wisp over the dark read as a scratch.
    ctx.beginPath()
    ctx.arc(X(ax), X(ay), X(RIM_R), 0, Math.PI * 2)
    ctx.clip()
    if (clear > 0.01) {
      ctx.fillStyle = alpha(p, '#FFFFFF', 0.26 * lit * clear).toString()
      for (const w of WISPS) {
        const a = w.a + w.w * t
        const [x, y] = near([ax + w.r * Math.cos(a), ay + w.r * Math.sin(a)])
        // Cull: only what reaches the frame.
        const reach = w.len * NEAR
        if (x < f.x0 - reach || x > f.x1 + reach || y < f.y0 - reach || y > f.y1 + reach) continue
        ctx.save()
        ctx.translate(X(x), X(y))
        ctx.rotate(a + Math.PI / 2)
        ctx.scale(NEAR, NEAR)
        // A long, thin, uneven streak of vapour: overlapping lozenges along its way.
        ctx.beginPath()
        for (let m = 0; m < 5; m++) {
          const u = m / 4 - 0.5
          const rx = w.len * (0.26 - 0.1 * Math.abs(u))
          const ry = 0.12 + 0.07 * (1 - Math.abs(u) * 2)
          ctx.moveTo(X(u * w.len * 0.8 + rx), X(-ry * 0.3))
          ctx.ellipse(X(u * w.len * 0.8), X(-ry * 0.3), X(rx), X(ry), 0, 0, Math.PI * 2)
        }
        ctx.fill()
        // Its underside, a shade of the land's warmth.
        ctx.fillStyle = alpha(p, air.rim, 0.1 * lit * clear).toString()
        ctx.fillRect(X(-w.len * 0.36), X(-0.02), X(w.len * 0.72), X(0.05))
        ctx.fillStyle = alpha(p, '#FFFFFF', 0.26 * lit * clear).toString()
        ctx.restore()
      }
    }
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

import { layer, sway, type Frame } from '../depth'
import { ctxOf, ring, rgba, type Pen } from '../pen'
import { LAMPS_ON } from './geo'

/**
 * The near side of the store, over the lens: the customers' row of lamps, hung down the middle of the floor nearer to
 * us than the wall of boxes. Only their shades come into the top of the frame as he goes up the wall and along it,
 * bigger and darker than the far row and going by faster, swinging on their cords in the fan's draught; they click on
 * with the far ones, a beat apiece. They are out of focus, as anything so near the lens is: soft at their edges.
 */

/** Its depth, and where it lies as drawn. */
const D = 1.45
const ANCHOR: [number, number] = [6, -2]
/** The lamps, along the store in the near row's own cells, each clicking on with a far one. */
const LAMPS = [1.2, 4.6, 8.0, 11.4, 14.8]
const SHADE = '#18241D'
const MOUTH = '#F1E4C4'

export function drawNear(pen: Pen, t: number, f: Frame): void {
  // Only along the wall of boxes, from the bass in until he is through the curtain.
  if (t < LAMPS_ON[0] - 0.4 || t > 19.5) return
  layer(pen, f, D, (g) => {
    const { k } = pen
    const ctx = ctxOf(pen.p)
    const h = g.y1 - g.y0
    const fade = Math.min(1, (19.5 - t) / 1.2)
    ctx.save()
    ctx.lineJoin = 'round'
    LAMPS.forEach((lx, i) => {
      // Hung so that only the shade comes into the frame, however high or low the camera is.
      const mouth = g.y0 + 0.07 * h
      const on = t >= LAMPS_ON[i] ? 1 : 0
      const sw = 0.05 * sway(t, 20 + i, 3.4) + 0.06 * ring(t - LAMPS_ON[i], 0.8, 1.4)
      const x = lx + sw
      if (x < g.x0 - 1 || x > g.x1 + 1) return
      const w = 0.42
      const tall = 0.34
      const tip = sw * 0.6
      const pts: [number, number][] = [
        [x - 0.07, mouth - tall],
        [x + 0.07, mouth - tall],
        [x + w + tip, mouth - tip * 0.4],
        [x - w + tip, mouth + tip * 0.4],
      ]
      ctx.beginPath()
      // The cord, up out of the frame.
      ctx.moveTo((lx) * k, (g.y0 - 1) * k)
      ctx.lineTo(x * k, (mouth - tall) * k)
      pts.forEach(([px, py], j) => (j ? ctx.lineTo(px * k, py * k) : ctx.moveTo(px * k, py * k)))
      ctx.closePath()
      // Out of focus: a soft edge round it, then the shade.
      for (const [lw, a] of [[0.14, 0.08], [0.07, 0.16]]) {
        ctx.strokeStyle = rgba(pen, SHADE, a * fade)
        ctx.lineWidth = lw * k
        ctx.stroke()
      }
      ctx.fillStyle = rgba(pen, SHADE, 0.92 * fade)
      ctx.fill()
      // Its mouth, seen from under: lit once it is on, the dull enamel before.
      ctx.fillStyle = rgba(pen, on ? MOUTH : '#4A463A', 0.9 * fade)
      ctx.beginPath()
      ctx.ellipse((x + tip) * k, mouth * k, w * k, 0.06 * k, -tip * 0.3, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.restore()
  }, ANCHOR)
}

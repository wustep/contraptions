import type { Pt } from '../../../../../parts'
import { layer, sway, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import type { Pen } from '../pen'
import { AY, S, T0 } from './geo'
import { bag, box, disc, fill, oval, poly, stroke } from './ink'

/**
 * The road's company out in the dark, while they drive: a telegraph line going along beyond the fence across the
 * fields, its poles going by slower than the road's and its wires dipping and rising between them through the low
 * sky; and high over it all an airliner going the same way they are, toward the airfield, its silhouette crossing the
 * moon, its lamps and its row of lit windows steady. It is the plane he will be on.
 */

const ANCHOR: Pt = [0, AY]
/** The line's depth: beyond the fence, in front of the near hills. */
const D_LINE = 0.66
/** Its ground, its poles' height and spacing, all in its own cells. */
const BASE = 0.22
const TALL = 1.62
const EVERY = 3.1
const SAG = 0.2
const POLE = '#03090B'
const WIRE = '#071116'

/** The telegraph line across the fields, along the road and no farther: it turns off before the farm. */
export function drawLine(pen: Pen, t: number, f: Frame): void {
  // Where along the world it runs: from behind the start to a little short of the farm.
  const end = S - 1.5
  if (f.x0 > end + 2) return
  layer(
    pen,
    f,
    D_LINE,
    (g) => {
      const poles = bag()
      const wires = bag()
      const top = BASE - TALL
      const xs: number[] = []
      for (let i = Math.floor(g.x0 / EVERY) - 1; i <= Math.ceil(g.x1 / EVERY) + 1; i++) {
        const x = i * EVERY + 0.35 * hash(i, 71, 3)
        // Its world place: the line stops short of the farm.
        if (x + f.cx * (1 - D_LINE) > end) break
        xs.push(x)
      }
      for (const x of xs) {
        const lean = (hash(Math.round(x * 10), 72, 3) - 0.5) * 0.06
        poly(poles, [[x - 0.035, BASE], [x - 0.025 + lean, top], [x + 0.025 + lean, top], [x + 0.035, BASE]])
        box(poles, x - 0.28 + lean, top + 0.08, x + 0.28 + lean, top + 0.12)
        box(poles, x - 0.2 + lean, top + 0.26, x + 0.2 + lean, top + 0.3)
      }
      // The wires, three from each crossarm, sagging between the poles; the wind lifts them a little.
      for (let j = 0; j + 1 < xs.length; j++) {
        const a = xs[j]
        const b = xs[j + 1]
        for (const [dx, dy] of [[-0.24, 0.08], [0.24, 0.08], [0, 0.26]] as Pt[]) {
          const swing = 0.03 * sway(t, j * 3.1 + dx * 7, 2.6)
          const y0 = top + dy
          wires.moveTo(a + dx, y0)
          const n = 8
          for (let s = 1; s <= n; s++) {
            const u = s / n
            wires.lineTo(a + dx + (b - a) * u, y0 + (SAG + swing) * 4 * u * (1 - u))
          }
        }
      }
      stroke(pen, wires, WIRE, 0.9, 0.38)
      fill(pen, poles, POLE, 1)
    },
    ANCHOR,
  )
}

/** When the airliner is overhead, and where it goes in the sky's own cells (the sky barely moves with the camera). */
const OVER: [number, number] = [T0 + 0.3, T0 + 11.5]
const SKY = { x0: -4.6, x1: 5.6, y0: AY - 1.86, y1: AY - 1.5 }
const DARK = '#050B12'
const LAMP = '#FFF1C2'
const PORT = '#D23A2A'
const WINDOWS = '#F0D08A'

/** The airliner high over the road, going their way toward the airfield: drawn in the sky's layer (`sky.ts`). */
export function drawOverhead(pen: Pen, t: number, g: Frame): void {
  if (t < OVER[0] || t > OVER[1]) return
  const u = (t - OVER[0]) / (OVER[1] - OVER[0])
  const x = SKY.x0 + (SKY.x1 - SKY.x0) * u
  const y = SKY.y0 + (SKY.y1 - SKY.y0) * u * u
  if (x < g.x0 - 1 || x > g.x1 + 1) return
  const on = smooth(t, OVER[0], OVER[0] + 0.8) * (1 - smooth(t, OVER[1] - 0.8, OVER[1]))
  // Its body side on, nose to the right, a touch nose-down as it starts its long descent.
  const body = bag()
  oval(body, x, y, 0.32, 0.045, 0.04)
  poly(body, [[x - 0.3, y - 0.01], [x - 0.36, y - 0.15], [x - 0.27, y - 0.15], [x - 0.18, y - 0.01]])
  poly(body, [[x - 0.06, y + 0.01], [x + 0.12, y + 0.015], [x + 0.02, y + 0.06], [x - 0.12, y + 0.05]])
  fill(pen, body, DARK, 0.95 * on)
  // A row of lit windows down its side; a red lamp at the wingtip; the white light on its tail.
  const win = bag()
  for (let i = 0; i < 7; i++) disc(win, x - 0.16 + i * 0.045, y - 0.008 + 0.0018 * i, 0.008)
  fill(pen, win, WINDOWS, 0.85 * on)
  const red = bag()
  disc(red, x + 0.05, y + 0.055, 0.013)
  fill(pen, red, PORT, 0.9 * on)
  const tail = bag()
  disc(tail, x - 0.35, y - 0.12, 0.011)
  fill(pen, tail, LAMP, 0.8 * on)
}

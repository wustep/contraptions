import { motes, sway, type Frame } from '../depth'
import { hash } from '../kit'
import { at } from '../music'
import { ctxOf, ellipse, mix, rect, rgba, shape, vgrad, type Pen } from '../pen'
import { T1 } from './geo'
import { plume } from './street'

/**
 * The stockroom's back window, behind the two of them over the carton: barred, on the yard. Through it the backs of the
 * tenements across the yard, a window or two lit and one coming on, washing left out on a line stiff in the cold and
 * swaying, the snow coming down, and over the sheds the El on its trestle at the end of the block, a train going by
 * one way and, later in their pause, the other. Each of those far things moves slower than the room as the camera
 * drifts: the washing a little, the tenements less, the El least.
 */

/** The window (x0, y0, x1, y1), in the stockroom's back wall between the shelving and the coat, the bulb hung before it. */
export const YARD: [number, number, number, number] = [17.0, -0.86, 18.28, -0.2]
const MID = (YARD[0] + YARD[2]) / 2

/** The El's deck across it, and its trains: when each comes into the window's view, from which side. */
const DECK = -0.6
const TRAINS: { t0: number; dir: 1 | -1 }[] = [
  { t0: at(10, 1), dir: -1 },
  { t0: at(12, 3), dir: 1 },
]
const CARS = 5
const CAR = 0.5
const SPEED = 1.15

export function drawYard(pen: Pen, t: number, f: Frame): void {
  const [x0, y0, x1, y1] = YARD
  if (f.x1 < x0 - 0.2 || f.x0 > x1 + 0.2 || f.y0 > y1 || f.y1 < y0) return
  const dawn = Math.min(1, t / T1)
  const { k } = pen
  const ctx = ctxOf(pen.p)
  // How far each depth is moved from where it is drawn as the camera goes: less, farther off.
  const off = (d: number) => (f.cx - MID) * (1 - d)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.clip()
  // The sky over the yard, the night going grey-blue.
  vgrad(pen, x0, y0, x1, y1, [
    [0, mix('#121C2E', '#4A5C74', dawn), 1],
    [1, mix('#1E2A3E', '#6A7C90', dawn), 1],
  ])
  // The El on its trestle: the deck, the lattice under it, and a train.
  const ex = off(0.2)
  const iron = mix('#0A0E14', '#1E2632', dawn * 0.5)
  rect(pen, x0 - 1, DECK - 0.02, x1 + 1, DECK + 0.035, iron)
  for (let x = Math.floor((x0 - ex) / 0.28) * 0.28; x < x1 - ex + 0.3; x += 0.28) {
    const px = x + ex
    shape(pen, [[px - 0.012, DECK + 0.03], [px + 0.012, DECK + 0.03], [px + 0.016, y1], [px - 0.016, y1]], iron)
    ctx.strokeStyle = rgba(pen, iron, 1)
    ctx.lineWidth = Math.max(0.5, 0.006 * k)
    ctx.beginPath()
    ctx.moveTo(px * k, (DECK + 0.03) * k)
    ctx.lineTo((px + 0.28) * k, (DECK + 0.16) * k)
    ctx.stroke()
  }
  for (const train of TRAINS) {
    const u = t - train.t0
    const len = CARS * CAR
    // From just outside the window on its far side, across, and out the other.
    const head = train.dir < 0 ? x1 + 0.1 - u * SPEED : x0 - 0.1 + u * SPEED
    const tail = head - train.dir * len
    if (Math.min(head, tail) > x1 + 0.1 || Math.max(head, tail) < x0 - 0.1) continue
    for (let c = 0; c < CARS; c++) {
      const a = Math.min(head, tail) + c * CAR + ex
      const b = a + CAR - 0.035
      if (b < x0 || a > x1) continue
      rect(pen, a, DECK - 0.15, b, DECK - 0.02, '#161A20')
      rect(pen, a, DECK - 0.165, b, DECK - 0.15, '#22262C')
      // Its windows lit, the people in them going to work.
      for (let w = 0; w < 5; w++) {
        const wx = a + 0.045 + w * 0.088
        rect(pen, wx, DECK - 0.125, wx + 0.055, DECK - 0.07, hash(c, w, train.t0 | 0) > 0.82 ? '#3A3428' : '#D9BC84')
      }
    }
  }
  // The backs of the tenements across the yard: their windows, a lamp or two lit, one coming on.
  const tx = off(0.45)
  const back = mix('#121820', '#283240', dawn * 0.6)
  rect(pen, x0 - 1, -0.5, x1 + 1, y1 + 0.1, back)
  for (let i = -3; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      const wx = x0 + 0.06 + i * 0.25 + tx
      const wy = -0.45 + j * 0.15
      if (wx > x1 || wx + 0.1 < x0) continue
      const on = hash(i, j, 61) > 0.72 || (i === 2 && j === 0 && t > at(11, 3))
      rect(pen, wx, wy, wx + 0.1, wy + 0.09, on ? '#C9A868' : mix('#0C1016', '#2E3A48', dawn * 0.5))
      if (on) rect(pen, wx, wy + 0.06, wx + 0.1, wy + 0.09, rgba(pen, '#5A4228', 0.6) as unknown as string)
    }
  }
  // A chimney on the roof across the yard, the boiler's smoke going up off it and away on the wind over the El.
  const stack = 17.95 + tx
  rect(pen, stack - 0.06, -0.62, stack + 0.06, -0.5, mix('#1A1E26', '#2E3642', dawn * 0.6))
  rect(pen, stack - 0.075, -0.645, stack + 0.075, -0.62, mix('#20242C', '#363E4A', dawn * 0.6))
  plume(pen, t, [stack, -0.66], { seed: 81, n: 26, life: 5.5, rise: 0.75, wind: -0.75, size: [0.03, 0.11], color: mix('#3A4250', '#8A94A2', dawn), alpha: 0.5 })
  // Washing on a line across the yard, nearer: stiff with cold, swaying.
  const lx = off(0.75)
  ctx.strokeStyle = rgba(pen, '#0A0C10', 0.9)
  ctx.lineWidth = Math.max(0.5, 0.005 * k)
  ctx.beginPath()
  ctx.moveTo((x0 - 0.2) * k, -0.5 * k)
  ctx.quadraticCurveTo((MID + lx) * k, -0.43 * k, (x1 + 0.2) * k, -0.49 * k)
  ctx.stroke()
  const pale = mix('#5E6670', '#A8B0B8', dawn)
  ;[[-0.45, 0.16, 0.2], [-0.2, 0.12, 0.13], [0.06, 0.18, 0.24], [0.38, 0.14, 0.17]].forEach(([dx, w, h], i) => {
    const cx = MID + dx + lx
    const top = -0.47 + 0.03 * Math.abs(dx)
    const swing = 0.022 * sway(t, 11 + i, 2.3 + i * 0.4)
    shape(pen, [[cx - w / 2, top], [cx + w / 2, top], [cx + w / 2 + swing, top + h], [cx - w / 2 + swing * 0.8, top + h]], mix(pale, i === 1 ? '#8A7A64' : pale, 0.5))
    ellipse(pen, [cx - w / 2 + 0.01, top], 0.008, 0.012, '#1A1A1A')
    ellipse(pen, [cx + w / 2 - 0.01, top], 0.008, 0.012, '#1A1A1A')
  })
  // The snow, coming down past the bars.
  motes(pen, t, {
    n: 16,
    seed: 71,
    box: [x0, y0, x1, y1],
    size: [0.005, 0.011],
    color: '#E4ECF4',
    alpha: 0.75,
    drift: [0.03, 0.13],
    wander: 0.04,
    twinkle: 0,
  })
  // Frost along the foot of the glass.
  vgrad(pen, x0, y1 - 0.12, x1, y1, [
    [0, '#C8D4E0', 0],
    [1, '#C8D4E0', 0.22],
  ])
  ctx.restore()
  // The sash: its frame, the bar across the middle, the bars inside it, the sill.
  const wood = '#3A281B'
  rect(pen, x0 - 0.06, y0 - 0.06, x1 + 0.06, y0, wood)
  rect(pen, x0 - 0.06, y0, x0, y1, wood)
  rect(pen, x1, y0, x1 + 0.06, y1, wood)
  rect(pen, x0, (y0 + y1) / 2 - 0.018, x1, (y0 + y1) / 2 + 0.018, wood)
  for (let i = 1; i < 4; i++) {
    const bx = x0 + ((x1 - x0) * i) / 4
    rect(pen, bx - 0.012, y0 - 0.02, bx + 0.012, y1 + 0.02, '#100C09')
  }
  rect(pen, x0 - 0.1, y1, x1 + 0.1, y1 + 0.05, '#5A3E2A')
  // The morning on the sill: a plain cold strip along its top.
  rect(pen, x0, y1, x1, y1 + 0.012, rgba(pen, '#8FA8C0', 0.25 + 0.3 * dawn) as unknown as string)
}

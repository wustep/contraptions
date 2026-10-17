import type { Pt } from '../../../../../parts'
import { rgbaOf, sway, type View } from '../depth'
import { CEIL, COUNTER, COUNTER_TOP, FLOOR, GLASS } from './geo'

/**
 * The bar's room, more of it (B's): what hangs on the walls (a net with its glass floats, a lifebuoy, two old
 * photographs of boats, a clock), the two lamps over the counter swinging slowly on their cords with their light going
 * over the counter, the brass rail along the counter's foot, and the piles and the dark water under the floor (the
 * bar stands out over the harbour on its pier). In the place's cells, straight onto the canvas: one path a colour.
 */

type C2 = CanvasRenderingContext2D

const R = {
  net: '#6E5A45',
  floatG: '#5E7F62',
  floatGLit: '#7E9A76',
  floatA: '#B98A3E',
  floatALit: '#D2A65A',
  buoy: '#D8D6CC',
  buoyBand: '#3F7F80',
  frame: '#1C1410',
  photo: '#7F8A88',
  photoDark: '#4E5856',
  clock: '#CFC6B0',
  brass: '#B38A4A',
  brassLit: '#D4B171',
  cord: '#16100D',
  shade: '#3E2B21',
  lamp: '#F2C879',
  lampHot: '#FFE6B0',
  pile: '#1C1714',
  brace: '#241C17',
  water: '#1E282B',
  waterLit: '#5F6E72',
}

/** The window behind the stage, in cells. */
export const WIN = { x0: 2.95, x1: 4.55, y0: -2.75, y1: -1.55 }

/** The lamps over the counter: where each hangs from, how long its cord, how it swings (a radian or so at most). */
const LAMPS: { x: number; len: number; seed: number }[] = [
  { x: 1.1, len: 1.2, seed: 1 },
  { x: 2.62, len: 1.15, seed: 2 },
]
/** Where a lamp is, and its swing. */
export function lampAt(i: number, t: number): { p: Pt; a: number } {
  const L = LAMPS[i]
  // A slow swing, nudged a little more each time the pilot sets his glass down hard.
  const knock = t > GLASS ? 0.05 * Math.exp(-(t - GLASS) / 2.5) * Math.sin((t - GLASS) * 2.9) : 0
  const a = 0.1 * sway(t, 0.21, L.seed) + knock
  return { p: [L.x + Math.sin(a) * L.len, CEIL + Math.cos(a) * L.len], a }
}

/**
 * What hangs on the walls, kept dark so it does not take the eye from the pilot's thumb: a fishing net swagged along
 * under the ceiling with its glass floats; a lifebuoy by the door; two old photographs of boats; a clock by the back
 * door whose hand goes round.
 */
export function drawWallThings(g: C2, k: number, t: number): void {
  // The net: swags from nail to nail, the mesh hanging in them.
  const net = new Path2D()
  const nails = [0.05, 0.75, 1.55, 2.35]
  for (let i = 0; i < nails.length - 1; i++) {
    const a = nails[i]
    const b = nails[i + 1]
    const top = CEIL + 0.18
    const sag = 0.32
    for (let j = 0; j <= 3; j++) {
      const s = sag * (0.45 + j * 0.2)
      net.moveTo(a * k, top * k)
      net.quadraticCurveTo(((a + b) / 2) * k, (top + 2 * s) * k, b * k, top * k)
    }
    for (let j = 1; j < 6; j++) {
      const x = a + ((b - a) * j) / 6
      const u = j / 6
      const d = 4 * u * (1 - u) * sag * 1.05
      net.moveTo(x * k, (top + 0.4 * d) * k)
      net.lineTo((x + 0.03) * k, (top + d) * k)
    }
  }
  g.lineWidth = Math.max(0.6, 0.009 * k)
  g.strokeStyle = rgbaOf(R.net, 0.75)
  g.stroke(net)
  // The floats in the swags: glass, green and amber, each paler on its side toward the nearer lamp as it swings.
  for (const [x, col, lit, i] of [[0.4, R.floatG, R.floatGLit, 0], [1.15, R.floatA, R.floatALit, 1], [1.95, R.floatG, R.floatGLit, 2]] as [number, string, string, number][]) {
    const y = CEIL + 0.18 + 0.3
    g.fillStyle = col
    g.beginPath()
    g.arc(x * k, y * k, 0.075 * k, 0, Math.PI * 2)
    g.fill()
    const lamp = lampAt(i === 2 ? 1 : 0, t).p
    const dx = Math.max(-1, Math.min(1, (lamp[0] - x) * 1.5))
    g.fillStyle = lit
    g.beginPath()
    g.arc((x + dx * 0.022) * k, (y + 0.012) * k, 0.05 * k, 0, Math.PI * 2)
    g.fill()
  }
  // The lifebuoy, on the wall by the back door.
  const bx = 4.92
  const by = -1.2
  g.fillStyle = R.buoy
  g.beginPath()
  g.arc(bx * k, by * k, 0.2 * k, 0, Math.PI * 2)
  g.arc(bx * k, by * k, 0.1 * k, 0, Math.PI * 2, true)
  g.fill('evenodd')
  g.fillStyle = R.buoyBand
  for (let q = 0; q < 4; q++) {
    const a0 = q * (Math.PI / 2) + 0.35
    g.beginPath()
    g.arc(bx * k, by * k, 0.2 * k, a0, a0 + 0.42)
    g.arc(bx * k, by * k, 0.1 * k, a0 + 0.42, a0, true)
    g.closePath()
    g.fill()
  }
  g.fillStyle = rgbaOf('#000000', 0.25)
  g.beginPath()
  g.arc(bx * k, by * k, 0.2 * k, Math.PI * 0.1, Math.PI * 0.9)
  g.arc(bx * k, by * k, 0.1 * k, Math.PI * 0.9, Math.PI * 0.1, true)
  g.closePath()
  g.fill()
  // Photographs: dark frames, grey pictures of boats and water.
  const frames = new Path2D()
  const pics = new Path2D()
  const darks = new Path2D()
  for (const [x, y, w, h] of [[4.68, -2.3, 0.38, 0.28], [-0.0, -2.55, 0.34, 0.26]] as [number, number, number, number][]) {
    frames.rect(x * k, y * k, w * k, h * k)
    pics.rect((x + 0.04) * k, (y + 0.04) * k, (w - 0.08) * k, (h - 0.08) * k)
    // A boat on the water in each: a hull and a mast.
    const cx = x + w / 2
    const cy = y + h * 0.62
    darks.rect((cx - w * 0.2) * k, cy * k, w * 0.4 * k, h * 0.08 * k)
    darks.rect((cx - 0.005) * k, (cy - h * 0.3) * k, 0.012 * k, h * 0.3 * k)
    darks.rect((x + 0.04) * k, (cy + h * 0.08) * k, (w - 0.08) * k, (h * 0.3 - 0.04) * k)
  }
  g.fillStyle = R.frame
  g.fill(frames)
  g.fillStyle = R.photo
  g.fill(pics)
  g.fillStyle = R.photoDark
  g.fill(darks)
  // The clock over the back door's side, its hand going round.
  const ck: Pt = [4.92, -2.95]
  g.fillStyle = R.frame
  g.beginPath()
  g.arc(ck[0] * k, ck[1] * k, 0.15 * k, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = R.clock
  g.beginPath()
  g.arc(ck[0] * k, ck[1] * k, 0.12 * k, 0, Math.PI * 2)
  g.fill()
  const sec = (t / 60) * Math.PI * 2
  g.strokeStyle = R.frame
  g.lineWidth = Math.max(0.8, 0.014 * k)
  g.beginPath()
  g.moveTo(ck[0] * k, ck[1] * k)
  g.lineTo((ck[0] + 0.1 * Math.sin(sec)) * k, (ck[1] - 0.1 * Math.cos(sec)) * k)
  g.moveTo(ck[0] * k, ck[1] * k)
  g.lineTo((ck[0] + 0.06 * Math.sin(1.1)) * k, (ck[1] - 0.06 * Math.cos(1.1)) * k)
  g.stroke()
}

/**
 * The two lamps over the counter, swinging on their cords: each a dark shade lit underneath, its light lying along the
 * counter's top and on the brass rail, going to and fro as it swings. Each pool is flat, brightest under the lamp and
 * gone at its edges.
 */
export function drawLamps(g: C2, k: number, t: number): void {
  const top = COUNTER_TOP - 0.06
  const [c0, c1] = [COUNTER[0] - 0.08, COUNTER[1] + 0.08]
  for (let i = 0; i < LAMPS.length; i++) {
    const { p, a } = lampAt(i, t)
    const px = p[0] + Math.tan(a) * (top - p[1])
    // Along the counter's top.
    const a0 = Math.max(c0, px - 0.7)
    const a1 = Math.min(c1, px + 0.7)
    if (a1 > a0) {
      g.fillStyle = across(g, k, px, 0.7, R.lamp, 0.26)
      g.fillRect(a0 * k, top * k, (a1 - a0) * k, 0.1 * k)
    }
  }
  for (let i = 0; i < LAMPS.length; i++) {
    const { p, a } = lampAt(i, t)
    const L = LAMPS[i]
    // The cord, the shade, the bulb's lit rim.
    g.strokeStyle = R.cord
    g.lineWidth = Math.max(0.8, 0.012 * k)
    g.beginPath()
    g.moveTo(L.x * k, CEIL * k)
    g.lineTo(p[0] * k, p[1] * k)
    g.stroke()
    g.save()
    g.translate(p[0] * k, p[1] * k)
    g.rotate(-a)
    g.fillStyle = R.shade
    g.beginPath()
    g.moveTo(-0.08 * k, 0)
    g.lineTo(0.08 * k, 0)
    g.lineTo(0.18 * k, 0.2 * k)
    g.lineTo(-0.18 * k, 0.2 * k)
    g.closePath()
    g.fill()
    g.fillStyle = R.lampHot
    g.fillRect(-0.15 * k, 0.185 * k, 0.3 * k, 0.035 * k)
    g.restore()
  }
}

/** A light lying across a surface: `a` at `x`, falling away evenly to nothing `w` either side. */
function across(g: C2, k: number, x: number, w: number, hex: string, a: number): CanvasGradient {
  const gr = g.createLinearGradient((x - w) * k, 0, (x + w) * k, 0)
  gr.addColorStop(0, rgbaOf(hex, 0))
  gr.addColorStop(0.5, rgbaOf(hex, a))
  gr.addColorStop(1, rgbaOf(hex, 0))
  return gr
}

/** The brass foot rail along the counter's foot, on its brackets, paler where the lamps' light falls on it. */
export function drawRail(g: C2, k: number, t: number): void {
  const [x0, x1] = COUNTER
  const y = -0.33
  g.strokeStyle = R.brass
  g.lineWidth = Math.max(1, 0.03 * k)
  g.beginPath()
  g.moveTo((x0 - 0.05) * k, y * k)
  g.lineTo((x1 + 0.05) * k, y * k)
  for (let x = x0 + 0.2; x < x1; x += 0.7) {
    g.moveTo(x * k, (y - 0.01) * k)
    g.lineTo((x - 0.05) * k, (y - 0.12) * k)
  }
  g.stroke()
  for (let i = 0; i < 2; i++) {
    const px = lampAt(i, t).p[0]
    g.fillStyle = across(g, k, px, 0.45, R.brassLit, 0.75)
    g.fillRect((px - 0.45) * k, (y - 0.015) * k, 0.9 * k, 0.03 * k)
  }
}

/**
 * Under the floor: the bar stands out over the harbour on piles, and under its boards are the piles, their cross
 * braces, the dark under the pier, and the water rising and falling along the piles with the swell, its surface
 * catching a little of the grey daylight from the open sides.
 */
export function drawUnderFloor(g: C2, v: View, t: number, x0: number, x1: number, day = 0): void {
  const k = v.k
  const top = FLOOR + 0.12
  const bottom = v.y1 + 0.5
  if (bottom <= top) return
  const a = Math.max(x0, v.x0 - 0.5)
  const b = Math.min(x1, v.x1 + 0.5)
  if (b <= a) return
  g.fillStyle = day ? '#2C3538' : '#120E0C'
  g.fillRect(x0 * k, top * k, (x1 - x0) * k, (bottom - top) * k)
  // The water: its surface a swell running in under the pier, two waves crossing.
  const surf = (x: number) => top + 0.2 + 0.045 * Math.sin(x * 1.9 - t * 1.4) + 0.025 * Math.sin(x * 4.3 + t * 1.1 + 1)
  const water = new Path2D()
  const edge = new Path2D()
  water.moveTo(a * k, bottom * k)
  for (let x = a; x <= b + 0.1; x += 0.1) {
    const xx = Math.min(x, b)
    water.lineTo(xx * k, surf(xx) * k)
    if (x === a) edge.moveTo(xx * k, surf(xx) * k)
    else edge.lineTo(xx * k, surf(xx) * k)
  }
  water.lineTo(b * k, bottom * k)
  water.closePath()
  g.fillStyle = day ? '#3A474C' : R.water
  g.fill(water)
  g.lineWidth = Math.max(0.8, 0.014 * k)
  g.strokeStyle = rgbaOf(day ? '#8E9CA0' : R.waterLit, 0.6)
  g.stroke(edge)
  // The piles and their cross braces.
  const piles = new Path2D()
  const braces = new Path2D()
  const xs: number[] = []
  for (let x = Math.ceil(x0 / 1.1) * 1.1 - 0.25; x < x1; x += 1.1) xs.push(x)
  for (const x of xs) piles.rect((x - 0.06) * k, top * k, 0.12 * k, (bottom - top) * k)
  for (let i = 0; i < xs.length - 1; i++) {
    braces.moveTo(xs[i] * k, (top + 0.02) * k)
    braces.lineTo(xs[i + 1] * k, (top + 0.5) * k)
    braces.moveTo(xs[i + 1] * k, (top + 0.02) * k)
    braces.lineTo(xs[i] * k, (top + 0.5) * k)
  }
  g.lineWidth = Math.max(1, 0.035 * k)
  g.strokeStyle = day ? '#2A3236' : R.brace
  g.stroke(braces)
  g.fillStyle = day ? '#262D30' : R.pile
  g.fill(piles)
  // The joists' ends under the boards.
  g.fillStyle = R.brace
  g.fillRect(x0 * k, top * k, (x1 - x0) * k, 0.06 * k)
}

/**
 * The harbour door's leaf, more of it: the raised panel's lit and shaded edges, a notice pinned between the glass and
 * the panel, and a brass kick plate.
 */
export function drawDoorDetail(g: C2, k: number, x: number, w: number): void {
  // The panel's edges: lit along its top and left, shaded along its bottom and right.
  const px0 = x + w * 0.2
  const px1 = x + w * 0.8
  g.fillStyle = rgbaOf('#8A6444', 0.55)
  g.fillRect(px0 * k, -0.9 * k, (px1 - px0) * k, 0.022 * k)
  g.fillRect(px0 * k, -0.9 * k, 0.022 * k, 0.7 * k)
  g.fillStyle = rgbaOf('#140D09', 0.6)
  g.fillRect(px0 * k, -0.222 * k, (px1 - px0) * k, 0.022 * k)
  g.fillRect((px1 - 0.022) * k, -0.9 * k, 0.022 * k, 0.7 * k)
  // The notice, a little crooked, and its pin.
  g.save()
  g.translate((x + w * 0.5) * k, -1.05 * k)
  g.rotate(-0.05)
  g.fillStyle = '#D9CFB8'
  g.fillRect(-0.15 * k, -0.11 * k, 0.3 * k, 0.21 * k)
  g.fillStyle = '#7E8E95'
  g.beginPath()
  g.arc(0, -0.09 * k, 0.012 * k, 0, Math.PI * 2)
  g.fill()
  g.restore()
  // The kick plate.
  g.fillStyle = rgbaOf('#9C7A45', 0.8)
  g.fillRect((x + w * 0.06) * k, (FLOOR - 0.2) * k, w * 0.88 * k, 0.1 * k)
}

/** The counter's front: the moulding under its top, lit along its upper edge, so it is wood and not a dark slab. */
export function drawCounterFront(g: C2, k: number): void {
  const [x0, x1] = COUNTER
  g.fillStyle = rgbaOf('#8A6444', 0.45)
  g.fillRect(x0 * k, (COUNTER_TOP + 0.1) * k, (x1 - x0) * k, 0.02 * k)
  g.fillStyle = rgbaOf('#140D09', 0.5)
  g.fillRect(x0 * k, (COUNTER_TOP + 0.12) * k, (x1 - x0) * k, 0.025 * k)
}

/** Where the ashtray is on the counter, and the cigarette in it burning down: the smoke's foot. */
export const ASH: Pt = [1.42, COUNTER_TOP - 0.05]

/** The ashtray on the counter by the pilot, a cigarette in it, its end glowing amber as it burns. */
export function drawAshtray(g: C2, k: number, t: number): void {
  const [x, y] = ASH
  g.fillStyle = '#4C5A5E'
  g.beginPath()
  g.ellipse(x * k, (y + 0.02) * k, 0.1 * k, 0.03 * k, 0, 0, Math.PI * 2)
  g.fill()
  g.fillRect((x - 0.09) * k, (y + 0.02) * k, 0.18 * k, 0.03 * k)
  g.fillStyle = '#E6E0D2'
  g.fillRect((x - 0.02) * k, (y - 0.012) * k, 0.12 * k, 0.018 * k)
  const ember = 0.75 + 0.25 * Math.sin(t * 2.1) * Math.sin(t * 0.7)
  g.fillStyle = rgbaOf('#F2A64A', ember)
  g.fillRect((x + 0.095) * k, (y - 0.012) * k, 0.02 * k, 0.018 * k)
}

/**
 * The little stage's skirt: deep green velvet hung in a few broad folds along its front, stirring in the draught from
 * the doors, the folds catching the lamps (and the spotlight, when it is on). Two values: the velvet and its lit folds.
 */
export function drawSkirt(g: C2, k: number, t: number, x0: number, x1: number, top: number, bottom: number, spot: number): void {
  g.fillStyle = '#1C3434'
  g.fillRect(x0 * k, top * k, (x1 - x0) * k, (bottom - top) * k)
  const lit = new Path2D()
  const n = Math.round((x1 - x0) / 0.28)
  const w = (x1 - x0) / n
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * w
    const stir = 0.012 * Math.sin(t * 1.3 + i * 0.8) + 0.008 * Math.sin(t * 2.9 + i * 1.9)
    lit.moveTo((x - w * 0.2) * k, top * k)
    lit.lineTo((x + w * 0.15) * k, top * k)
    lit.lineTo((x + w * 0.2 + stir) * k, bottom * k)
    lit.lineTo((x - w * 0.15 + stir) * k, bottom * k)
    lit.closePath()
  }
  g.fillStyle = rgbaOf('#3A5C58', 0.5 + 0.3 * Math.min(1, spot))
  g.fill(lit)
}

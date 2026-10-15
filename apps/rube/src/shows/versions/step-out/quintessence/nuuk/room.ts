import type { Pt } from '../../../../../parts'
import { rgbaOf, sway, type View } from '../depth'
import { hash } from '../kit'
import { CEIL, COUNTER, COUNTER_TOP, DOOR_IN, FLOOR, GLASS, HEAD as HEAD_Y, STOOL_X, WALL_OUT } from './geo'

/**
 * The bar's room, more of it (B's): the boards' grain, what hangs on the walls (a net with its glass floats, a
 * lifebuoy, old photographs of boats, a clock), the two lamps over the counter swinging slowly on their cords with
 * their light going over the counter and the bottles, the brass rail along the counter's foot, the piles and the dark
 * water under the floor (the bar stands out over the harbour on its pier), and the rain on the window's glass. In the
 * place's cells, straight onto the canvas: one path a colour.
 */

type C2 = CanvasRenderingContext2D

const R = {
  grain: '#3A2B22',
  knot: '#1E1612',
  net: '#6E5A45',
  floatG: '#5E7F62',
  floatA: '#B98A3E',
  buoy: '#D8D6CC',
  buoyBand: '#3F7F80',
  frame: '#1C1410',
  photo: '#7F8A88',
  photoDark: '#4E5856',
  clock: '#CFC6B0',
  brass: '#B38A4A',
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

/** The boards' grain: two or three long faint lines down each board, wandering a little, and a knot here and there. */
export function drawGrain(g: C2, k: number, x0: number, x1: number, top: number, bottom: number, skip?: { x0: number; x1: number; y0: number; y1: number }): void {
  const grain = new Path2D()
  const knots = new Path2D()
  let b = 0
  for (let x = x0 + 0.05; x < x1; x += 0.34, b++) {
    for (let j = 0; j < 3; j++) {
      const gx = x + 0.07 + j * 0.09 + 0.03 * hash(b, j, 61)
      grain.moveTo(gx * k, top * k)
      for (let y = top + 0.35; y <= bottom + 0.01; y += 0.35) {
        const wob = 0.012 * Math.sin(y * 3.1 + b * 1.7 + j)
        if (skip && gx > skip.x0 && gx < skip.x1 && y > skip.y0 && y - 0.35 < skip.y1) grain.moveTo((gx + wob) * k, y * k)
        else grain.lineTo((gx + wob) * k, y * k)
      }
    }
    if (hash(b, 62) < 0.5) {
      const ky = top + (bottom - top) * hash(b, 63)
      const kx = x + 0.1 + 0.14 * hash(b, 64)
      if (!skip || !(kx > skip.x0 && kx < skip.x1 && ky > skip.y0 && ky < skip.y1)) {
        knots.moveTo((kx + 0.025) * k, ky * k)
        knots.ellipse(kx * k, ky * k, 0.025 * k, 0.04 * k, 0, 0, Math.PI * 2)
      }
    }
  }
  g.lineWidth = Math.max(0.6, 0.008 * k)
  g.strokeStyle = rgbaOf(R.grain, 0.7)
  g.stroke(grain)
  g.fillStyle = rgbaOf(R.knot, 0.7)
  g.fill(knots)
}

/**
 * What hangs on the walls, kept dark so it does not take the eye from the pilot's thumb: a fishing net swagged along
 * under the ceiling with its glass floats; a lifebuoy by the door; old photographs of boats; a clock by the back door
 * whose hand goes round.
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
  // The floats in the swags: glass, green and amber, each with a glint of the lamps that moves as they swing.
  const glints = new Path2D()
  for (const [x, col, i] of [[0.4, R.floatG, 0], [1.15, R.floatA, 1], [1.95, R.floatG, 2]] as [number, string, number][]) {
    const y = CEIL + 0.18 + 0.3
    g.fillStyle = col
    g.beginPath()
    g.arc(x * k, y * k, 0.075 * k, 0, Math.PI * 2)
    g.fill()
    const lamp = lampAt(i === 2 ? 1 : 0, t).p
    const dx = Math.max(-1, Math.min(1, (lamp[0] - x) * 1.5))
    glints.moveTo((x + dx * 0.035 + 0.018) * k, (y - 0.03) * k)
    glints.arc((x + dx * 0.035) * k, (y - 0.03) * k, 0.018 * k, 0, Math.PI * 2)
  }
  g.fillStyle = rgbaOf(R.lampHot, 0.75)
  g.fill(glints)
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
  for (const [x, y, w, h] of [[4.68, -2.45, 0.38, 0.28], [4.75, -2.02, 0.3, 0.32], [-0.0, -2.55, 0.34, 0.26]] as [number, number, number, number][]) {
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
 * The two lamps over the counter, swinging on their cords: each a dark shade with its bulb's glow under it, and its
 * pool of light going to and fro over the counter and the back bar as it swings.
 */
export function drawLamps(g: C2, k: number, t: number): void {
  for (let i = 0; i < LAMPS.length; i++) {
    const { p, a } = lampAt(i, t)
    const L = LAMPS[i]
    // Its pool on the counter's top, and on the bottles behind.
    const px = p[0] + Math.tan(a) * (COUNTER_TOP - p[1])
    const pool = g.createRadialGradient(px * k, COUNTER_TOP * k, 0, px * k, COUNTER_TOP * k, 0.75 * k)
    pool.addColorStop(0, rgbaOf(R.lamp, 0.28))
    pool.addColorStop(1, rgbaOf(R.lamp, 0))
    g.fillStyle = pool
    g.fillRect((px - 0.75) * k, (COUNTER_TOP - 0.75) * k, 1.5 * k, 0.85 * k)
    // The glow round the bulb (a disc, not its square: the corners would be filled for nothing).
    const glow = g.createRadialGradient(p[0] * k, (p[1] + 0.12) * k, 0, p[0] * k, (p[1] + 0.12) * k, 0.95 * k)
    glow.addColorStop(0, rgbaOf(R.lamp, 0.32))
    glow.addColorStop(0.4, rgbaOf(R.lamp, 0.11))
    glow.addColorStop(1, rgbaOf(R.lamp, 0))
    g.fillStyle = glow
    g.beginPath()
    g.arc(p[0] * k, (p[1] + 0.12) * k, 0.95 * k, 0, Math.PI * 2)
    g.fill()
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

/** Glints on the bottles on the back bar: each catches the nearer lamp, the glint sliding as the lamp swings. */
export function drawBottleGlints(g: C2, k: number, t: number): void {
  const x0 = COUNTER[0]
  const path = new Path2D()
  for (let i = 0; i < 9; i++) {
    const x = x0 + 0.25 + i * 0.22
    const h = 0.3 + 0.12 * hash(i, 4)
    const lamp = lampAt(Math.abs(x - 1.1) < Math.abs(x - 2.6) ? 0 : 1, t).p
    const d = lamp[0] - x
    const on = Math.max(0, 1 - Math.abs(d) / 1.1)
    if (on < 0.05) continue
    const gx = x + Math.max(-0.035, Math.min(0.035, d * 0.06))
    path.rect((gx - 0.008) * k, (-2.05 - h + 0.05) * k, 0.016 * k, (h - 0.12) * k * on)
  }
  g.fillStyle = rgbaOf(R.lampHot, 0.55)
  g.fill(path)
}

/** The brass foot rail along the counter's foot, on its brackets, catching the lamps along its length. */
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
  const hot = new Path2D()
  for (let i = 0; i < 2; i++) {
    const px = lampAt(i, t).p[0]
    hot.rect((px - 0.12) * k, (y - 0.01) * k, 0.24 * k, 0.012 * k)
  }
  g.fillStyle = rgbaOf(R.lampHot, 0.6)
  g.fill(hot)
  void STOOL_X
}

/**
 * Under the floor: the bar stands out over the harbour on piles, and under its boards are the piles, their cross
 * braces, and the dark water lapping, a little of the grey daylight on it from either side.
 */
export function drawUnderFloor(g: C2, v: View, t: number, x0: number, x1: number, day = 0): void {
  const k = v.k
  const top = FLOOR + 0.12
  const bottom = v.y1 + 0.5
  if (bottom <= top) return
  g.fillStyle = day ? '#3A474C' : R.water
  g.fillRect(x0 * k, top * k, (x1 - x0) * k, (bottom - top) * k)
  // The water's surface down there, catching the daylight from the open sides.
  const lit = new Path2D()
  const wy = top + 0.42
  const n = Math.max(8, Math.round((x1 - x0) * 9))
  for (let i = 0; i < n; i++) {
    const u = hash(i, 71)
    const span = x1 - x0
    const x = x0 + ((((span * u + t * (0.12 + 0.2 * hash(i, 74)) * (i % 2 ? 1 : -1)) % span) + span) % span)
    const y = wy + 0.5 * Math.pow(hash(i, 72), 1.5) + 0.015 * Math.sin(t * 1.6 + i * 2)
    const w = 0.08 + 0.25 * hash(i, 73)
    lit.moveTo(x * k, y * k)
    lit.lineTo((x + w) * k, y * k)
  }
  g.lineWidth = Math.max(0.8, 0.012 * k)
  g.strokeStyle = rgbaOf(day ? '#8E9CA0' : R.waterLit, 0.55)
  g.stroke(lit)
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
  void DOOR_IN
  void WALL_OUT
}

/**
 * Rain on the window's glass: drops that gather, run down in a sudden slide, and stop, each leaving a thin trail; and
 * the sleet beyond the glass going by on the wind.
 */
export function drawWindowRain(g: C2, k: number, t: number): void {
  const { x0, x1, y0, y1 } = WIN
  const drops = new Path2D()
  const trails = new Path2D()
  for (let i = 0; i < 26; i++) {
    const x = x0 + 0.04 + (x1 - x0 - 0.08) * hash(i, 81)
    // Each drop slides in starts: still, then a quick run, still again; round and round the glass's height.
    const period = 3 + 4 * hash(i, 82)
    const ph = (((t + hash(i, 83) * period) / period) % 1 + 1) % 1
    const run = ph < 0.25 ? 0 : ph < 0.4 ? (ph - 0.25) / 0.15 : 1
    const h = y1 - y0 - 0.08
    const start = y0 + 0.04 + h * 0.5 * hash(i, 84)
    const y = start + (h * 0.5) * run * (0.5 + 0.5 * hash(i, 85))
    const wob = 0.01 * Math.sin(y * 30 + i)
    drops.rect((x + wob - 0.01) * k, (y - 0.012) * k, 0.02 * k, 0.024 * k)
    if (y - start > 0.02) {
      trails.moveTo(x * k, start * k)
      trails.lineTo((x + wob) * k, (y - 0.012) * k)
    }
  }
  g.lineWidth = Math.max(0.5, 0.006 * k)
  g.strokeStyle = rgbaOf('#D7E0E0', 0.35)
  g.stroke(trails)
  g.fillStyle = rgbaOf('#E6ECEB', 0.7)
  g.fill(drops)
}

/**
 * The harbour door's leaf, more of it: the grain down it, the raised panel's lit and shaded edges, a notice pinned
 * between the glass and the panel, a brass kick plate, and on the glass the lamps' reflection and the rain.
 */
export function drawDoorDetail(g: C2, k: number, t: number, x: number, w: number): void {
  const grain = new Path2D()
  for (let j = 0; j < 7; j++) {
    const gx = x + w * (0.08 + j * 0.135) + 0.01 * Math.sin(j * 2.3)
    // Not across the glass.
    const glass = gx > x + w * 0.2 && gx < x + w * 0.8
    grain.moveTo(gx * k, (HEAD_Y + 0.15) * k)
    if (glass) {
      grain.lineTo(gx * k, (HEAD_Y + 0.35) * k)
      grain.moveTo((gx + 0.004) * k, -1.2 * k)
    }
    grain.lineTo((gx + 0.01) * k, (FLOOR - 0.1) * k)
  }
  g.lineWidth = Math.max(0.6, 0.007 * k)
  g.strokeStyle = rgbaOf('#2E2018', 0.55)
  g.stroke(grain)
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
  const words = new Path2D()
  for (let r = 0; r < 4; r++) {
    const len = 0.22 * (0.5 + 0.5 * hash(r, 41))
    words.moveTo(-0.11 * k, (-0.06 + r * 0.045) * k)
    for (let i = 1; i <= 6; i++) words.lineTo((-0.11 + (len * i) / 6) * k, (-0.06 + r * 0.045 + 0.008 * Math.sin(i * 2.7 + r)) * k)
  }
  g.lineWidth = Math.max(0.5, 0.006 * k)
  g.strokeStyle = rgbaOf('#4A443A', 0.8)
  g.stroke(words)
  g.fillStyle = '#7E8E95'
  g.beginPath()
  g.arc(0, -0.09 * k, 0.012 * k, 0, Math.PI * 2)
  g.fill()
  g.restore()
  // The kick plate.
  g.fillStyle = rgbaOf('#9C7A45', 0.8)
  g.fillRect((x + w * 0.06) * k, (FLOOR - 0.2) * k, w * 0.88 * k, 0.1 * k)
  // On the glass: the lamp's reflection sliding as it swings, and the rain.
  const gx0 = x + w * 0.2
  const gx1 = x + w * 0.8
  const gy0 = HEAD_Y + 0.35
  const gy1 = -1.2
  const lamp = lampAt(0, t).p
  const rx = gx0 + (gx1 - gx0) * (0.55 + 0.25 * Math.max(-1, Math.min(1, (lamp[0] - 1.1) * 3)))
  g.fillStyle = rgbaOf('#F2C879', 0.35)
  g.beginPath()
  g.moveTo((rx - 0.03) * k, gy0 * k)
  g.lineTo((rx + 0.04) * k, gy0 * k)
  g.lineTo((rx - 0.06) * k, gy1 * k)
  g.lineTo((rx - 0.13) * k, gy1 * k)
  g.closePath()
  g.fill()
  const drops = new Path2D()
  for (let i = 0; i < 12; i++) {
    const dx = gx0 + 0.03 + (gx1 - gx0 - 0.06) * hash(i, 51)
    const period = 2.5 + 3 * hash(i, 52)
    const ph = (((t + hash(i, 53) * period) / period) % 1 + 1) % 1
    const dy = gy0 + 0.05 + (gy1 - gy0 - 0.1) * Math.min(1, hash(i, 54) * 0.6 + (ph > 0.6 ? (ph - 0.6) * 1.6 : 0))
    drops.moveTo((dx + 0.01) * k, dy * k)
    drops.arc(dx * k, dy * k, 0.01 * k, 0, Math.PI * 2)
  }
  g.fillStyle = rgbaOf('#EEF2F1', 0.65)
  g.fill(drops)
}

/** The counter's front: its boards' grain and the moulding under its top, so it is wood and not a dark slab. */
export function drawCounterFront(g: C2, k: number): void {
  const [x0, x1] = COUNTER
  const grain = new Path2D()
  for (let x = x0 + 0.06; x < x1 - 0.03; x += 0.1) {
    grain.moveTo(x * k, (COUNTER_TOP + 0.16) * k)
    grain.quadraticCurveTo((x + 0.012 * Math.sin(x * 9)) * k, ((COUNTER_TOP + FLOOR) / 2) * k, (x - 0.008) * k, (FLOOR - 0.14) * k)
  }
  g.lineWidth = Math.max(0.6, 0.007 * k)
  g.strokeStyle = rgbaOf('#2A1D16', 0.6)
  g.stroke(grain)
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
 * The little stage's skirt: deep green velvet hung in pleats along its front, stirring in the draught from the doors,
 * its folds catching the lamps (and the spotlight, when it is on).
 */
export function drawSkirt(g: C2, k: number, t: number, x0: number, x1: number, top: number, bottom: number, spot: number): void {
  g.fillStyle = '#1C3434'
  g.fillRect(x0 * k, top * k, (x1 - x0) * k, (bottom - top) * k)
  const lit = new Path2D()
  const dark = new Path2D()
  const n = Math.round((x1 - x0) / 0.1)
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) * ((x1 - x0) / n)
    const stir = 0.012 * Math.sin(t * 1.3 + i * 0.8) + 0.008 * Math.sin(t * 2.9 + i * 1.9)
    const p = i % 2 ? dark : lit
    const w = (x1 - x0) / n / 2
    p.moveTo((x - w * 0.5) * k, top * k)
    p.lineTo((x + w * 0.5) * k, top * k)
    p.lineTo((x + w * 0.6 + stir) * k, bottom * k)
    p.lineTo((x - w * 0.4 + stir) * k, bottom * k)
    p.closePath()
  }
  g.fillStyle = rgbaOf('#3A5C58', 0.75 + 0.25 * Math.min(1, spot))
  g.fill(lit)
  g.fillStyle = rgbaOf('#0E1C1C', 0.7)
  g.fill(dark)
}

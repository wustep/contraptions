import type { Pt } from '../../../../../parts'
import { motes, type View } from '../depth'
import { hash } from '../kit'
import { SHADE } from './home-draw'
import { fillPoly, line, mix, rgba, vgrad, type Pen } from './pen'

/**
 * His mother's room at evening, behind the piano: the wall in its old striped paper, the lamp's light on it and the
 * shadows the lamp throws there (hers the largest, playing); two windows onto the city at dusk, the far blocks'
 * windows coming on one by one, a train going over, a plane's lights, soft snow; sheer curtains moving in the
 * draught; the clock on the wall; the floorboards and the rug the piano stands on; the boxes not yet opened.
 *
 * The wall with its paper and the lamp's light, and the floor with its boards and rug, are each painted once into a
 * picture (they are the same at every frame) and laid on; the city's planes slide behind the glass at their own
 * depths.
 */

const R = {
  wall: '#2A211C',
  wallLit: '#4A3829',
  floorLit: '#5A4026',
  paperLight: '#6A5440',
  paperDark: '#120C09',
  rail: '#3A2C22',
  floor: '#241A15',
  board: '#1B1310',
  grain: '#3B2A1F',
  sill: '#191210',
  box: '#5E4B38',
  boxTop: '#76604A',
  tape: '#8C7A62',
  skyHigh: '#1C2340',
  skyMid: '#363E6A',
  skyLow: '#6F5F84',
  dusk: '#C69878',
  far: '#2A2F4C',
  near: '#1C2036',
  lit: '#F2C27A',
  tv: '#9FB4E0',
  train: '#F6DFA8',
  snow: '#DCE0EE',
  sheer: '#E8DCC6',
  drape: '#3A2A22',
  rugBlue: '#262433',
  rugOchre: '#5E4A2E',
  rugUmber: '#3A2A1E',
  rugCream: '#9C8460',
  shadow: '#0A0706',
  clock: '#C8B58F',
}

/** The wall's foot: the floor runs from here toward us. */
const WALL_FOOT = -1.06

interface Glass {
  x0: number
  x1: number
  y0: number
  y1: number
}
/** The window on the left, by the boxes, and the tall one behind the piano. */
const WINDOWS: Glass[] = [
  { x0: -3.0, x1: -1.25, y0: -3.45, y1: -1.85 },
  { x0: 1.55, x1: 3.3, y0: -3.62, y1: -2.24 },
]

const cache = <T>(make: () => T): (() => T) => {
  let made: T | null = null
  return () => (made ??= make())
}

/* ------------------------------------------------------------------ the paper */

/** The paper: a pinstripe in pairs, and a small sprig between each pair, made once as a pattern a few cells wide. */
const PAPER_W = 0.36
const PAPER_H = 0.42
const PAPER_PPC = 260
const papers = new WeakMap<CanvasRenderingContext2D, CanvasPattern | null>()
function paper(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (papers.has(ctx)) return papers.get(ctx) ?? null
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = Math.round(PAPER_W * PAPER_PPC)
  c.height = Math.round(PAPER_H * PAPER_PPC)
  const g = c.getContext('2d')
  if (!g) return null
  g.scale(PAPER_PPC, PAPER_PPC)
  g.lineCap = 'round'
  // The stripes: a light one and a dark one, close together, and a fainter one between the pairs.
  g.strokeStyle = rgba(R.paperLight, 0.5)
  g.lineWidth = 0.012
  g.beginPath()
  g.moveTo(0.02, 0)
  g.lineTo(0.02, PAPER_H)
  g.moveTo(0.2, 0)
  g.lineTo(0.2, PAPER_H)
  g.stroke()
  g.strokeStyle = rgba(R.paperDark, 0.55)
  g.lineWidth = 0.014
  g.beginPath()
  g.moveTo(0.045, 0)
  g.lineTo(0.045, PAPER_H)
  g.stroke()
  // The sprig: a stem and four leaves, between the stripes.
  const sprig = (x: number, y: number, s: number) => {
    g.beginPath()
    g.moveTo(x, y + 0.05 * s)
    g.quadraticCurveTo(x + 0.01 * s, y, x, y - 0.05 * s)
    g.stroke()
    for (const [dx, dy, a] of [[-0.025, -0.01, -0.6], [0.025, -0.02, 0.6], [-0.02, 0.025, -0.9], [0.02, 0.015, 0.9]] as const) {
      g.beginPath()
      g.ellipse(x + dx * s, y + dy * s, 0.018 * s, 0.008 * s, a, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.strokeStyle = rgba(R.paperLight, 0.45)
  g.fillStyle = rgba(R.paperLight, 0.4)
  g.lineWidth = 0.008
  sprig(0.12, 0.1, 1)
  sprig(0.28, 0.31, 0.9)
  g.fillStyle = rgba(R.paperDark, 0.45)
  g.fillRect(0.11, 0.3, 0.02, 0.02)
  g.fillRect(0.27, 0.09, 0.02, 0.02)
  const pattern = ctx.createPattern(c, 'repeat')
  pattern?.setTransform(new DOMMatrix().scale(1 / PAPER_PPC))
  papers.set(ctx, pattern)
  return pattern
}

/* ------------------------------------------------------------------ the floor */

/** The boards: their seams running away from us, closer together as they go back; their ends; their grain. */
const BOARDS = cache(() => {
  const seams = new Path2D()
  const ends = new Path2D()
  const grain = new Path2D()
  let y = WALL_FOOT
  for (let i = 0; y < 2.4; i++) {
    const next = y + 0.09 + i * 0.035
    seams.moveTo(-8, y)
    seams.lineTo(12, y)
    // Each row's boards end at their own places.
    let x = -8 + hash(i, 1, 801) * 1.4
    while (x < 12) {
      ends.moveTo(x, y)
      ends.lineTo(x + 0.01 * (next - y), next)
      x += 1.1 + 1.3 * hash(i, Math.round(x * 10), 802)
    }
    // Grain: long fine streaks along the row, more of them on the wide boards near to; a knot here and there.
    const h = next - y
    const n = 30 + Math.round(h * 420)
    for (let g = 0; g < n; g++) {
      const gx = -8 + 20 * hash(i, g, 803)
      const gy = y + h * (0.12 + 0.76 * hash(i, g, 804))
      const len = 0.25 + 0.9 * hash(i, g, 805)
      grain.moveTo(gx, gy)
      grain.quadraticCurveTo(gx + len / 2, gy + h * 0.08 * (hash(i, g, 806) - 0.5), gx + len, gy + h * 0.04 * (hash(i, g, 807) - 0.5))
    }
    for (let q = 0; q < Math.round(h * 30); q++) {
      const kx = -8 + 20 * hash(i, q, 808)
      const ky = y + h * (0.3 + 0.4 * hash(i, q, 809))
      grain.moveTo(kx + 0.03, ky)
      grain.ellipse(kx, ky, 0.03, h * 0.12, 0, 0, Math.PI * 2)
    }
    y = next
  }
  return { seams, ends, grain }
})

/** The rug under the piano and the bench: a border of bands, a field of small diamonds, laid flat on the boards. */
const RUG: Pt[] = [[-0.25, -0.95], [5.6, -0.95], [6.4, 0.5], [-0.7, 0.5]]
const RUG_PATHS = cache(() => {
  const at = (u: number, v: number): Pt => {
    const top: Pt = [RUG[0][0] + (RUG[1][0] - RUG[0][0]) * u, RUG[0][1]]
    const bot: Pt = [RUG[3][0] + (RUG[2][0] - RUG[3][0]) * u, RUG[3][1]]
    return [top[0] + (bot[0] - top[0]) * v, top[1] + (bot[1] - top[1]) * v]
  }
  const quad = (u0: number, v0: number, u1: number, v1: number, path: Path2D) => {
    const pts = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]
    pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)))
    path.closePath()
  }
  const field = new Path2D()
  quad(0.06, 0.12, 0.94, 0.88, field)
  const border = new Path2D()
  quad(0.02, 0.04, 0.98, 0.96, border)
  const diamonds = new Path2D()
  for (let i = 0; i < 26; i++)
    for (let j = 0; j < 7; j++) {
      const u = 0.09 + (0.82 * (i + 0.5)) / 26
      const v = 0.16 + (0.68 * (j + 0.5)) / 7
      const du = 0.012
      const dv = 0.035
      const pts = [at(u, v - dv), at(u + du, v), at(u, v + dv), at(u - du, v)]
      pts.forEach(([x, y], q) => (q ? diamonds.lineTo(x, y) : diamonds.moveTo(x, y)))
      diamonds.closePath()
    }
  const fringe = new Path2D()
  for (let i = 0; i <= 80; i++) {
    const [x, y] = at(i / 80, 1)
    fringe.moveTo(x, y)
    fringe.lineTo(x - 0.01, y + 0.06)
  }
  return { field, border, diamonds, fringe, outline: (() => { const p = new Path2D(); RUG.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p })() }
})

/** The wall, with the lamp's light on it, the paper and the picture rail, painted once into a picture and laid on scaled. */
const WALL = { x0: -6, x1: 10, y0: -4.7, y1: WALL_FOOT, ppc: 220 }
let wallCanvas: HTMLCanvasElement | null | undefined
function wallPicture(lamp: Pt): HTMLCanvasElement | null {
  if (wallCanvas !== undefined) return wallCanvas
  if (typeof document === 'undefined') return null
  const cv = document.createElement('canvas')
  cv.width = Math.round((WALL.x1 - WALL.x0) * WALL.ppc)
  cv.height = Math.round((WALL.y1 - WALL.y0) * WALL.ppc)
  const c = cv.getContext('2d')
  if (!c) return (wallCanvas = null)
  c.translate(-WALL.x0 * WALL.ppc, -WALL.y0 * WALL.ppc)
  const pen: Pen = { c, k: WALL.ppc }
  fillPoly(pen, [[WALL.x0, WALL.y0], [WALL.x1, WALL.y0], [WALL.x1, WALL.y1], [WALL.x0, WALL.y1]], R.wall)
  // The lamp's light on the wall, shaped by its shade: a fan going up from the shade's open top and a wider one
  // going down from its foot, each fading as it goes. Each is ten thin layers, a little narrower each, so its edge is
  // a slow fall into the dark and never a line across the paper; beside the shade the wall stays dark.
  const [lx, ly] = lamp
  const fan = (y0: number, y1: number, w0: number, spread: number, a0: number, a1: number) => {
    const g = vgrad(pen, y0, y1, [[0, rgba(R.wallLit, a0 / 10)], [1, rgba(R.wallLit, a1 / 10)]])
    const h = Math.abs(y1 - y0)
    for (let i = 0; i < 10; i++) {
      const f = 1.3 - 0.07 * i
      fillPoly(pen, [[lx - w0 * f, y0], [lx + w0 * f, y0], [lx + (w0 + spread * h) * f, y1], [lx - (w0 + spread * h) * f, y1]], g)
    }
  }
  fan(ly - 0.18, WALL.y0, 0.24, 1.0, 0.9, 0.15)
  fan(ly + 0.18, WALL.y1, 0.36, 1.6, 0.9, 0.3)
  const pattern = paper(c)
  if (pattern) {
    c.save()
    c.scale(WALL.ppc, WALL.ppc)
    c.fillStyle = pattern
    c.fillRect(WALL.x0, WALL.y0, WALL.x1 - WALL.x0, WALL.y1 - WALL.y0)
    c.restore()
  }
  line(pen, [[WALL.x0, -3.78], [WALL.x1, -3.78]], R.rail, 0.05)
  line(pen, [[WALL.x0, -3.75], [WALL.x1, -3.75]], rgba(R.paperLight, 0.35), 0.012)
  return (wallCanvas = cv)
}

/** Lay a part of a picture of the room (made at `ppc` pixels a cell over its box) where the frame sees it. */
function lay(pen: Pen, pic: HTMLCanvasElement, box: { x0: number; x1: number; y0: number; y1: number; ppc: number }, f: { x0: number; y0: number; x1: number; y1: number }): void {
  const a0 = Math.max(box.x0, f.x0 - 0.1)
  const a1 = Math.min(box.x1, f.x1 + 0.1)
  const b0 = Math.max(box.y0, f.y0 - 0.1)
  const b1 = Math.min(box.y1, f.y1 + 0.1)
  if (a1 <= a0 || b1 <= b0) return
  const k = pen.k
  // Near its own scale the picture is laid on unsmoothed (cheaper, and the same to the eye); much larger, smoothed.
  const m = pen.c.getTransform()
  const smooth = pen.c.imageSmoothingEnabled
  pen.c.imageSmoothingEnabled = (Math.hypot(m.a, m.b) * k) / box.ppc > 1.4
  pen.c.drawImage(pic, (a0 - box.x0) * box.ppc, (b0 - box.y0) * box.ppc, (a1 - a0) * box.ppc, (b1 - b0) * box.ppc, a0 * k, b0 * k, (a1 - a0) * k, (b1 - b0) * k)
  pen.c.imageSmoothingEnabled = smooth
}

/** The floor, boards and rug together, painted once into a picture of the room's floor and laid on scaled. */
const FLOOR = { x0: -6, x1: 9, y0: WALL_FOOT, y1: 2.0, ppc: 200 }
let floorCanvas: HTMLCanvasElement | null | undefined
function floorPicture(lamp: Pt): HTMLCanvasElement | null {
  if (floorCanvas !== undefined) return floorCanvas
  if (typeof document === 'undefined') return null
  const cv = document.createElement('canvas')
  cv.width = Math.round((FLOOR.x1 - FLOOR.x0) * FLOOR.ppc)
  cv.height = Math.round((FLOOR.y1 - FLOOR.y0) * FLOOR.ppc)
  const c = cv.getContext('2d')
  if (!c) return (floorCanvas = null)
  c.scale(FLOOR.ppc, FLOOR.ppc)
  c.translate(-FLOOR.x0, -FLOOR.y0)
  c.fillStyle = R.floor
  c.fillRect(FLOOR.x0, FLOOR.y0, FLOOR.x1 - FLOOR.x0, FLOOR.y1 - FLOOR.y0)
  const b = BOARDS()
  c.lineCap = 'butt'
  c.strokeStyle = rgba(R.grain, 0.9)
  c.lineWidth = 0.009
  c.stroke(b.grain)
  c.strokeStyle = rgba(R.board, 0.95)
  c.lineWidth = 0.012
  c.stroke(b.seams)
  c.lineWidth = 0.01
  c.stroke(b.ends)
  const rug = RUG_PATHS()
  c.fillStyle = R.rugUmber
  c.fill(rug.outline)
  c.fillStyle = R.rugOchre
  c.fill(rug.border)
  c.fillStyle = R.rugBlue
  c.fill(rug.field)
  c.fillStyle = rgba(R.rugCream, 0.13)
  c.fill(rug.diamonds)
  c.strokeStyle = rgba(R.rugCream, 0.5)
  c.lineWidth = 0.008
  c.stroke(rug.fringe)
  // The lamp's pool of light on the boards and the rug under it, in four flat steps.
  c.fillStyle = rgba(R.floorLit, 0.12)
  for (const rx of [3.1, 2.4, 1.75, 1.15]) {
    c.beginPath()
    c.ellipse(lamp[0] - 0.25, 0.2, rx, rx * 0.3, 0, 0, Math.PI * 2)
    c.fill()
  }
  return (floorCanvas = cv)
}

/* ------------------------------------------------------------------ the city */

interface Block {
  x: number
  w: number
  h: number
}
/** A row of blocks across a plane, from `x0` to `x1`, standing on `base`. */
const blocks = (x0: number, x1: number, seed: number, hMin: number, hMax: number): Block[] => {
  const out: Block[] = []
  let x = x0
  for (let i = 0; x < x1; i++) {
    const w = 0.22 + 0.38 * hash(i, 1, seed)
    out.push({ x, w, h: hMin + (hMax - hMin) * hash(i, 2, seed) })
    x += w + 0.02 * hash(i, 3, seed)
  }
  return out
}
const FAR_BASE = -1.98
const NEAR_BASE = -1.9
const FAR_BLOCKS = blocks(-9, 14, 811, 0.35, 1.1)
const NEAR_BLOCKS = blocks(-9, 14, 812, 0.18, 0.5)
/** The blocks' windows, each with the moment its light comes on (some are on already, some never). */
const LIGHTS = cache(() => {
  const out: { x: number; y: number; w: number; h: number; on: number; tv: boolean }[] = []
  FAR_BLOCKS.forEach((b, i) => {
    const cols = Math.max(2, Math.floor(b.w / 0.07))
    const rows = Math.max(2, Math.floor(b.h / 0.09))
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        const h = hash(i * 31 + c, r, 813)
        if (h > 0.55) continue
        out.push({
          x: b.x + 0.03 + (c * (b.w - 0.06)) / cols,
          y: FAR_BASE - b.h + 0.05 + r * 0.09,
          w: 0.03,
          h: 0.04,
          on: 133 + 16 * hash(i * 31 + c, r, 814) - (h < 0.2 ? 20 : 0),
          tv: hash(i * 31 + c, r, 815) < 0.12,
        })
      }
  })
  return out
})
const SKYLINE = cache(() => {
  const far = new Path2D()
  for (const b of FAR_BLOCKS) far.rect(b.x, FAR_BASE - b.h, b.w, b.h + 1)
  // A mast on one of them, its light blinking.
  const near = new Path2D()
  for (const b of NEAR_BLOCKS) {
    near.rect(b.x, NEAR_BASE - b.h, b.w, b.h + 1)
    // A pitched roof on some.
    if (b.w < 0.4) {
      near.moveTo(b.x, NEAR_BASE - b.h)
      near.lineTo(b.x + b.w / 2, NEAR_BASE - b.h - 0.08)
      near.lineTo(b.x + b.w, NEAR_BASE - b.h)
      near.closePath()
    }
  }
  return { far, near }
})
const MAST: Pt = [FAR_BLOCKS[12].x + FAR_BLOCKS[12].w / 2, FAR_BASE - FAR_BLOCKS[12].h]

/** Where the city is true behind the glass: about where the camera is through the place. */
const CITY_X = 1.6
/**
 * A plane of the city at depth `z`: it slides across the glass as the camera goes along (the farther, the less), but
 * holds its height in the window, where its horizon is, as the camera rises with him.
 */
function behind(ctx: CanvasRenderingContext2D, v: View, z: number, draw: () => void): void {
  ctx.save()
  ctx.translate((1 - z) * (v.cx - CITY_X) * v.k, 0)
  draw()
  ctx.restore()
}

/** The city at dusk in one window, through its glass: sky, far blocks, their lights, the train, a plane, the snow. */
function city(ctx: CanvasRenderingContext2D, v: View, t: number, g: Glass): void {
  const k = v.k
  if (g.x1 < v.x0 || g.x0 > v.x1 || g.y1 < v.y0 || g.y0 > v.y1) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
  ctx.clip()
  const sky = ctx.createLinearGradient(0, g.y0 * k, 0, g.y1 * k)
  sky.addColorStop(0, R.skyHigh)
  sky.addColorStop(0.5, R.skyMid)
  sky.addColorStop(0.85, R.skyLow)
  sky.addColorStop(1, R.dusk)
  ctx.fillStyle = sky
  ctx.fillRect(g.x0 * k, g.y0 * k, (g.x1 - g.x0) * k, (g.y1 - g.y0) * k)
  // A plane's lights, high, going over slowly: a white strobe and a green light.
  behind(ctx, v, 0.06, () => {
    const px = -1.4 + 0.42 * (t - 133.3)
    const py = -3.25 - 0.02 * (t - 133.3)
    const strobe = (t * 1.1) % 1 < 0.08 ? 1 : 0.15
    ctx.fillStyle = rgba('#FFFFFF', 0.9 * strobe)
    ctx.fillRect((px - 0.012) * k, (py - 0.012) * k, 0.024 * k, 0.024 * k)
    ctx.fillStyle = rgba('#8FE0A0', 0.8)
    ctx.fillRect((px + 0.03) * k, (py + 0.005) * k, 0.014 * k, 0.014 * k)
  })
  // The far blocks, and their windows coming on one by one as it gets dark.
  behind(ctx, v, 0.16, () => {
    ctx.save()
    ctx.scale(k, k)
    ctx.fillStyle = R.far
    ctx.fill(SKYLINE().far)
    const warm = new Path2D()
    const cold = new Path2D()
    const dim = new Path2D()
    for (const w of LIGHTS()) {
      if (t < w.on) continue
      // A few are televisions, their light going from one picture to the next every second or so.
      const bright = w.tv && hash(Math.floor(t * 0.8 + w.x * 7), Math.round(w.x * 100), 816) < 0.5
      ;(w.tv ? (bright ? cold : dim) : warm).rect(w.x, w.y, w.w, w.h)
    }
    ctx.fillStyle = rgba(R.lit, 0.85)
    ctx.fill(warm)
    ctx.fillStyle = rgba(R.tv, 0.8)
    ctx.fill(cold)
    ctx.fillStyle = rgba(R.tv, 0.55)
    ctx.fill(dim)
    const blink = (t * 0.8) % 1 < 0.12 ? 1 : 0.2
    ctx.fillStyle = rgba('#FFFFFF', blink)
    ctx.fillRect(MAST[0] - 0.006, MAST[1] - 0.2, 0.012, 0.2)
    ctx.restore()
  })
  // The nearer roofs, and the line the train runs on over them: a train going by every few seconds, lit.
  behind(ctx, v, 0.32, () => {
    ctx.save()
    ctx.scale(k, k)
    ctx.fillStyle = R.near
    ctx.fill(SKYLINE().near)
    const lineY = NEAR_BASE - 0.62
    ctx.fillStyle = R.near
    ctx.fillRect(-9, lineY, 23, 0.035)
    for (let x = -9; x < 14; x += 0.55) ctx.fillRect(x, lineY, 0.03, 0.6)
    const period = 6.5
    const u = ((t - 133.3) % period) / period
    const tx = 8 - 22 * u
    ctx.fillStyle = R.near
    ctx.fillRect(tx, lineY - 0.09, 2.4, 0.09)
    ctx.fillStyle = rgba(R.train, 0.9)
    for (let c = 0; c < 4; c++) for (let w = 0; w < 6; w++) ctx.fillRect(tx + c * 0.6 + 0.05 + w * 0.085, lineY - 0.075, 0.05, 0.035)
    ctx.restore()
  })
  // Soft snow, far and near.
  ctx.globalAlpha = 0.7
  motes(ctx, v, t, { n: 40, seed: 821, tile: [2, 2], r: [0.006, 0.012], v: [0.05, 0.22], spread: 0.4, sway: [0.05, 0.4], color: R.snow, square: true, within: g })
  ctx.globalAlpha = 0.85
  motes(ctx, v, t, { n: 10, seed: 822, tile: [2, 2], r: [0.012, 0.02], v: [0.08, 0.35], spread: 0.4, sway: [0.07, 0.3], color: R.snow, within: g })
  ctx.globalAlpha = 1
  ctx.restore()
}

/* ------------------------------------------------------------------ the shadows the lamp throws */

/** The lamp's light, as it falls on the wall: where it comes from. */
export interface Light {
  at: Pt
}
/**
 * A shadow on the wall: `pts` pushed away from the lamp and up the wall, larger the farther from it. What stands in the
 * room throws one: the boxes, the piano, and her, playing.
 */
function cast(pts: readonly Pt[], light: Light, reach: number): Pt[] {
  return pts.map(([x, y]) => {
    const dx = x - light.at[0]
    const dy = y - light.at[1]
    return [x + dx * reach, Math.min(WALL_FOOT, y + dy * reach * 0.6 - 0.15 * reach)]
  })
}

/* ------------------------------------------------------------------ drawing */

export function drawRoom(pen: Pen, f: { x0: number; y0: number; x1: number; y1: number }, t: number, light: Light, her: Pt[][]): void {
  const { c, k } = pen
  const v: View = { ...f, cx: (f.x0 + f.x1) / 2, cy: (f.y0 + f.y1) / 2, w: f.x1 - f.x0, h: f.y1 - f.y0, k }
  c.save()
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const wallTop = f.y0 - 1
  // The wall, the lamp's light on it, the paper and the rail.
  const wallPic = wallPicture(SHADE)
  if (wallPic) lay(pen, wallPic, WALL, f)
  else fillPoly(pen, [[x0, wallTop], [x1, wallTop], [x1, WALL_FOOT], [x0, WALL_FOOT]], R.wall)

  // The shadows the lamp throws on the wall: hers, playing; the piano's; the boxes'.
  const shade = rgba(R.shadow, 0.3)
  for (const part of her) fillPoly(pen, cast(part, light, 0.55), shade)
  fillPoly(pen, cast([[1.6, -1.2], [2.04, -2.08], [5.5, -2.08], [5.8, -1.86], [5.4, -1.2]], light, 0.35), rgba(R.shadow, 0.22))
  for (const b of BOXES) fillPoly(pen, cast([[b.x, b.y + b.h], [b.x, b.y - b.dp], [b.x + b.w + b.dp * 0.5, b.y - b.dp], [b.x + b.w + b.dp * 0.5, b.y + b.h]], light, 0.3), shade)

  // The windows: the city at dusk behind the glass, the sills and the bars, the curtains moving in the draught.
  for (const [i, g] of WINDOWS.entries()) {
    if (g.x1 < f.x0 - 0.5 || g.x0 > f.x1 + 0.5) continue
    fillPoly(pen, [[g.x0 - 0.08, g.y0 - 0.08], [g.x1 + 0.08, g.y0 - 0.08], [g.x1 + 0.08, g.y1 + 0.1], [g.x0 - 0.08, g.y1 + 0.1]], R.sill)
    city(c, v, t, g)
    const mx = (g.x0 + g.x1) / 2
    line(pen, [[mx, g.y0], [mx, g.y1]], R.sill, 0.05)
    line(pen, [[g.x0, (g.y0 + g.y1) / 2 - 0.1], [g.x1, (g.y0 + g.y1) / 2 - 0.1]], R.sill, 0.04)
    line(pen, [[g.x0 - 0.1, g.y1 + 0.1], [g.x1 + 0.1, g.y1 + 0.1]], rgba(R.paperLight, 0.4), 0.014)
    curtain(pen, g, t, i)
  }

  // The clock on the wall between the windows, its pendulum going.
  clock(pen, t)

  // The floor: its boards, their grain; the rug; the lamp's pool; the windows' cold light.
  const floorTop = WALL_FOOT
  fillPoly(pen, [[x0, floorTop], [x1, floorTop], [x1, f.y1 + 1], [x0, f.y1 + 1]], R.floor)
  const floor = floorPicture([SHADE[0], SHADE[1] + 0.3])
  if (floor) lay(pen, floor, FLOOR, f)
  // The windows' light on the boards: cold, a little violet.
  for (const g of WINDOWS) {
    if (g.x1 < f.x0 - 3 || g.x0 > f.x1 + 3) continue
    fillPoly(pen, [[g.x0 + 0.2, WALL_FOOT + 0.02], [g.x1 + 0.2, WALL_FOOT + 0.02], [g.x1 + 1.2, WALL_FOOT + 0.9], [g.x0 + 0.9, WALL_FOOT + 0.9]], rgba('#5E6698', 0.06))
  }
  line(pen, [[x0, WALL_FOOT], [x1, WALL_FOOT]], rgba('#120D0B', 1), 0.05)
  // The skirting, lit along its top.
  fillPoly(pen, [[x0, WALL_FOOT - 0.1], [x1, WALL_FOOT - 0.1], [x1, WALL_FOOT], [x0, WALL_FOOT]], R.rail)
  line(pen, [[x0, WALL_FOOT - 0.1], [x1, WALL_FOOT - 0.1]], rgba(R.paperLight, 0.45), 0.012)

  // The boxes, not yet opened.
  for (const bx of BOXES) drawBox(pen, bx)
  c.restore()
}

const BOXES = [
  { x: -3.25, y: -1.0, w: 1.15, h: 0.62, dp: 0.42 },
  { x: -3.05, y: -1.62, w: 0.8, h: 0.5, dp: 0.36 },
  { x: -1.95, y: -0.62, w: 0.95, h: 0.58, dp: 0.4 },
]

/** A taped carton: its front face from (x, y) (top left), w wide, h tall, and its top going back `dp`; its card's lines. */
function drawBox(pen: Pen, b: { x: number; y: number; w: number; h: number; dp: number }): void {
  const { x, y, w, h, dp } = b
  const ox = dp * 0.5
  const oy = -dp
  fillPoly(pen, [[x, y], [x + w, y], [x + w + ox, y + oy], [x + ox, y + oy]], R.boxTop, rgba('#0E0A08', 0.8), 0.015)
  fillPoly(pen, [[x + w, y], [x + w + ox, y + oy], [x + w + ox, y + oy + h], [x + w, y + h]], mix(R.box, '#000000', 0.25), rgba('#0E0A08', 0.8), 0.015)
  fillPoly(pen, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], vgrad(pen, y, y + h, [[0, R.box], [1, mix(R.box, '#000000', 0.2)]]), rgba('#0E0A08', 0.8), 0.015)
  // The card's corrugation showing, its scuffs, and a scrawl in marker on the front.
  for (let i = 1; i < 14; i++) line(pen, [[x + 0.03, y + (h * i) / 14], [x + w - 0.03, y + (h * i) / 14]], rgba(i % 2 ? '#3E3024' : '#7A6550', 0.45), 0.006)
  for (let i = 0; i < 6; i++) {
    const sx = x + w * (0.1 + 0.8 * hash(i, Math.round(x * 10), 831))
    const sy = y + h * (0.1 + 0.8 * hash(i, Math.round(y * 10), 832))
    line(pen, [[sx, sy], [sx + 0.06 + 0.08 * hash(i, 3, 833), sy + 0.01]], rgba('#2A1F17', 0.5), 0.01)
  }
  line(pen, [[x + w * 0.15, y + h * 0.55], [x + w * 0.22, y + h * 0.5], [x + w * 0.3, y + h * 0.58], [x + w * 0.38, y + h * 0.5], [x + w * 0.45, y + h * 0.56]], rgba('#1A120D', 0.6), 0.012)
  const m = x + w / 2
  line(pen, [[m, y], [m + ox, y + oy]], rgba(R.tape, 0.9), 0.07, 'butt')
  line(pen, [[m, y], [m, y + h * 0.3]], rgba(R.tape, 0.9), 0.07, 'butt')
}

/** A sheer curtain at the window's side, its folds moving in the draught, and the heavy drape gathered beyond it. */
function curtain(pen: Pen, g: Glass, t: number, i: number): void {
  const left = i === 1
  const edge = left ? g.x0 : g.x1
  const dir = left ? 1 : -1
  const top = g.y0 - 0.12
  const foot = g.y1 + 0.35
  const sheer: Pt[] = [[edge - dir * 0.15, top]]
  const n = 14
  for (let j = 0; j <= n; j++) {
    const u = j / n
    const y = top + (foot - top) * u
    const blow = (0.05 + 0.1 * u) * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 2 + u * 2.4)) + 0.02 * Math.sin(t * 2.3 + u * 7)
    sheer.push([edge + dir * (0.35 + blow), y])
  }
  sheer.push([edge - dir * 0.15, foot])
  fillPoly(pen, sheer, rgba(R.sheer, 0.18))
  // Its folds.
  for (let f = 1; f < 4; f++) {
    const pts: Pt[] = []
    for (let j = 0; j <= n; j++) {
      const u = j / n
      const y = top + (foot - top) * u
      const blow = (0.05 + 0.1 * u) * (0.5 + 0.5 * Math.sin(t * 0.9 + i * 2 + u * 2.4 + f * 0.4)) * (f / 4)
      pts.push([edge + dir * (0.1 * f + blow), y])
    }
    line(pen, pts, rgba(R.sheer, 0.16), 0.012)
  }
  fillPoly(pen, [[edge - dir * 0.32, top], [edge - dir * 0.02, top], [edge - dir * 0.06 + dir * 0.02 * Math.sin(t * 0.7 + i), foot + 0.3], [edge - dir * 0.36, foot + 0.3]], R.drape)
  line(pen, [[edge - dir * 0.04, top], [edge - dir * 0.07, foot + 0.3]], rgba(R.paperLight, 0.3), 0.012)
}

/** The clock: a pale face, its hands at ten past seven, its pendulum swinging under it. */
const CLOCK: Pt = [0.55, -3.05]
function clock(pen: Pen, t: number): void {
  const [x, y] = CLOCK
  fillPoly(pen, [[x - 0.17, y - 0.2], [x + 0.17, y - 0.2], [x + 0.17, y + 0.62], [x - 0.17, y + 0.62]], '#2E2118', rgba('#0E0A08', 0.9), 0.012)
  // The pendulum, beating seconds.
  const a = 0.22 * Math.sin(t * Math.PI)
  const bob: Pt = [x + Math.sin(a) * 0.4, y + 0.12 + Math.cos(a) * 0.4]
  line(pen, [[x, y + 0.12], bob], rgba(R.clock, 0.7), 0.01)
  const { c, k } = pen
  c.fillStyle = R.clock
  c.beginPath()
  c.arc(bob[0] * k, bob[1] * k, 0.04 * k, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = mix(R.clock, '#FFFFFF', 0.2)
  c.beginPath()
  c.arc(x * k, y * k, 0.13 * k, 0, Math.PI * 2)
  c.fill()
  for (let h = 0; h < 12; h++) {
    const q = (h / 12) * Math.PI * 2
    line(pen, [[x + Math.sin(q) * 0.105, y - Math.cos(q) * 0.105], [x + Math.sin(q) * 0.12, y - Math.cos(q) * 0.12]], '#3A2C22', 0.008)
  }
  const minute = ((10 + (t - 133.3) / 60) / 60) * Math.PI * 2
  const hour = ((7 + 10 / 60) / 12) * Math.PI * 2
  line(pen, [[x, y], [x + Math.sin(hour) * 0.065, y - Math.cos(hour) * 0.065]], '#1E1510', 0.014)
  line(pen, [[x, y], [x + Math.sin(minute) * 0.1, y - Math.cos(minute) * 0.1]], '#1E1510', 0.009)
}

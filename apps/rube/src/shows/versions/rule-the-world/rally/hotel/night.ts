import type { Pt } from '../../../../../parts'
import { bloom, lastBeat, layer, parallax, pulse, rain, rising, shaft, sway, type Frame } from '../depth'
import { hash } from '../kit'
import { BEAT } from '../music'
import { ctxOf, ellipse, mix, rgb, type Pen } from '../pen'
import { BULB_OUT, F_STREET, KERB, L_MISH, POUNDS, T0, WALL_R, WAY } from './geo'

/**
 * The night outside the hotel, in layers: the sky with the moon and the clouds going over it (the clouds are what
 * the moonlight in the rooms answers to), the city far off downtown, the roofs and water towers up the block, the
 * tenements across the street with their washing, their bar and its neon, and the wet street in front of them with
 * its cars and its steam; then the rain, far and near, and the cat on the fire escape. Wet teal and sodium amber, with
 * the one red-and-blue sign. Each layer lies where it is drawn when the camera is halfway down the fire escape
 * (`OUT`), and slides at its own depth as the camera goes down; nothing past the outer wall is drawn, since the
 * building covers it.
 */

export const N = {
  sky0: '#06141A',
  sky1: '#0E2A30',
  sky2: '#1C4442',
  cloud: '#16343A',
  cloudLit: '#6E99A0',
  moon: '#E2ECE2',
  moonGlow: '#9FC9CF',
  far: '#173740',
  farTop: '#1D4048',
  mid: '#10272E',
  midTop: '#16343B',
  near: '#0B1B20',
  near2: '#0F1A1E',
  near3: '#0D2026',
  nearTop: '#1A2E33',
  iron: '#050C0F',
  glass: '#152B30',
  win: '#EACD86',
  winWarm: '#D6B470',
  winDim: '#8C7448',
  tv: '#8DB6D8',
  diner: '#BFE2D4',
  red: '#FF3D5E',
  blue: '#45A8FF',
  sodium: '#F2B85C',
  rain: '#9CC2C6',
  road: '#0A1417',
  kerb: '#1E2C2F',
  steam: '#7E9C9E',
  steamLit: '#C4CCBC',
  board: '#CDBF98',
  boardRed: '#B5323C',
  boardGreen: '#1F4A36',
  wash: ['#8A938A', '#6D8196', '#958A76', '#5E6F64', '#9C8E8E'],
  cat: '#07090A',
  catEye: '#C9E07A',
}

/** The camera the outside is laid out for: halfway down the fire escape. */
const OUT: Pt = [12, 6]

/* ------------------------------------------------------------------ batching */

/**
 * Boxes gathered by their fill and drawn as one path each: a city's windows are a handful of fills. They are drawn in
 * the order their fills were first asked for since the last flush, so what is asked for first lies under the rest.
 */
const bins = new Map<string, number[]>()
const order: string[] = []
const STEP = 8
/** A CSS colour through the pen's tone, its alpha in eighths (so the bins stay few). */
export function css(pen: Pen, hex: string, a = 1): string {
  const [r, g, b] = rgb(pen.tone(hex))
  return `rgba(${r},${g},${b},${Math.round(Math.max(0, Math.min(1, a)) * STEP) / STEP})`
}
function box(style: string, x0: number, y0: number, x1: number, y1: number): void {
  let b = bins.get(style)
  if (!b) {
    if (bins.size > 160 && !order.length) bins.clear()
    b = []
    bins.set(style, b)
  }
  if (!b.length) order.push(style)
  b.push(x0, y0, x1 - x0, y1 - y0)
}
function flush(pen: Pen): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  for (const style of order) {
    const b = bins.get(style)
    if (!b || !b.length) continue
    ctx.fillStyle = style
    ctx.beginPath()
    for (let i = 0; i < b.length; i += 4) ctx.rect(b[i] * k, b[i + 1] * k, b[i + 2] * k, b[i + 3] * k)
    ctx.fill()
    b.length = 0
  }
  order.length = 0
}
/** A filled polygon list in one path. */
function polys(pen: Pen, list: Pt[][], style: string): void {
  if (!list.length) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.fillStyle = style
  ctx.beginPath()
  for (const pts of list) pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.fill()
}
/** Line segments [x0, y0, x1, y1, ...] in one stroke. */
function strokes(pen: Pen, segs: number[], style: string, lw: number): void {
  if (!segs.length) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.strokeStyle = style
  ctx.lineWidth = Math.max(0.6, pen.w * lw)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < segs.length; i += 4) {
    ctx.moveTo(segs[i] * k, segs[i + 1] * k)
    ctx.lineTo(segs[i + 2] * k, segs[i + 3] * k)
  }
  ctx.stroke()
}

/**
 * A layer at depth `d` that lies where it is drawn when the camera is centred on `anchor` (`depth.layer`). `draw` is
 * handed the frame in the layer's cells and the left edge of the outside there: what lies left of it is behind the
 * building.
 */
function deep(pen: Pen, f: Frame, d: number, anchor: Pt, draw: (g: Frame, outside: number) => void): void {
  layer(pen, f, d, (g) => draw(g, Math.max(g.x0, WALL_R[1] - (f.x0 - g.x0))), anchor)
}

/* ------------------------------------------------------------------ the beat, for lights */

/** Which beat of the slot it is (0 at the cut): what the city's windows go on and off by. */
const beatNo = (t: number): number => Math.floor((t - T0) / BEAT)

/** Whether a window is lit at `t`: some never are; the rest go on and off now and then, on a beat. */
function lit(i: number, j: number, seed: number, share: number, t: number): number {
  const h = hash(i, j, seed)
  if (h > share * 1.6) return 0
  const period = 6 + Math.floor(hash(i, j, seed + 1) * 18)
  const slot = Math.floor((beatNo(t) + Math.floor(hash(i, j, seed + 2) * period)) / period)
  return hash(i * 7 + slot, j, seed + 3) < 0.62 ? 1 + Math.floor(hash(i, j, seed + 4) * 3) : 0
}

/* ------------------------------------------------------------------ the sky: the moon and the clouds */

/** How the wind takes the clouds: cells a second, to the right. */
const WIND = 0.8
interface Cloud {
  /** When its middle goes over the moon's. */
  cross: number
  /** Its height off the moon's, and its half size. */
  dy: number
  hw: number
  hh: number
  /** How much of the moon it hides. */
  dense: number
  seed: number
}
const CLOUDS: Cloud[] = [
  // The bank that hides the moon while the bulb burns, and slides off it as the bulb goes.
  { cross: BULB_OUT + 0.25 - (2.4 + 0.45) / WIND, dy: 0.05, hw: 2.4, hh: 0.55, dense: 0.95, seed: 1 },
  // Then thinner ones, now and then, all down the fire escape.
  { cross: 100.2, dy: 0.12, hw: 0.9, hh: 0.35, dense: 0.75, seed: 2 },
  { cross: 104.9, dy: -0.15, hw: 1.15, hh: 0.4, dense: 0.7, seed: 3 },
  { cross: 111.3, dy: 0.08, hw: 1.3, hh: 0.45, dense: 0.75, seed: 4 },
  { cross: 117.6, dy: -0.05, hw: 1.0, hh: 0.4, dense: 0.6, seed: 5 },
  // And the ones that go by above it and below.
  ...Array.from({ length: 10 }, (_, i): Cloud => ({
    cross: 82 + i * 5.1 + hash(i, 1, 90) * 3,
    dy: (i % 2 ? 1 : -1) * (0.85 + hash(i, 2, 90) * 1.7),
    hw: 0.7 + hash(i, 3, 90) * 1.3,
    hh: 0.22 + hash(i, 4, 90) * 0.28,
    dense: 0.4 + hash(i, 5, 90) * 0.3,
    seed: 10 + i,
  })),
]
const cloudX = (c: Cloud, t: number): number => WIND * (t - c.cross)

/** How much moon there is, 0 (behind cloud) to 1 (clear): what lights the rooms once the bulb has gone. */
export function moonlight(t: number): number {
  let cov = 0
  for (const c of CLOUDS) {
    const x = Math.abs(cloudX(c, t))
    if (x > c.hw + 0.5) continue
    const u = Math.max(0, Math.min(1, (c.hw - x) / 0.5 + 0.5)) * Math.max(0, Math.min(1, (c.hh - Math.abs(c.dy)) / 0.3 + 0.5))
    cov = Math.max(cov, u * c.dense)
  }
  return 1 - 0.82 * cov
}

/** The sky's depth: so far it all but goes with the camera. */
export const SKY_D = 0.06

/**
 * The sky about the moon at `m` (in the sky layer's cells): a searchlight swinging far off, the moon and its halo, the
 * clouds going over, and a plane's lights crossing.
 */
export function drawSky(pen: Pen, t: number, m: Pt, beam = true, g?: Frame): void {
  const clear = moonlight(t)
  // A searchlight swinging over downtown, behind the far city.
  if (beam) shaft(pen, [m[0] - 5.2, m[1] + 6.5], Math.PI + 0.35 * Math.sin((t / 11) * Math.PI * 2) + 0.25, 0.07, 10, '#BFD8D6', 0.05)
  bloom(pen, m, 2.6, N.moonGlow, 0.16 * clear)
  ellipse(pen, m, 0.34, 0.34, mix(N.moonGlow, N.moon, 0.35 + 0.65 * clear))
  ellipse(pen, [m[0] + 0.1, m[1] - 0.06], 0.07, 0.06, mix(N.moon, '#B9C8BC', clear))
  ellipse(pen, [m[0] - 0.12, m[1] + 0.09], 0.05, 0.04, mix(N.moon, '#BFCCC0', clear))
  // The clouds, lit from behind where they pass the moon.
  const ctx = ctxOf(pen.p)
  const { k } = pen
  for (const c of CLOUDS) {
    const cx = m[0] + cloudX(c, t)
    const cy = m[1] + c.dy
    if (g && (cx + c.hw < g.x0 - 0.5 || cx - c.hw > g.x1 + 0.5 || cy - c.hh * 2 > g.y1 || cy + c.hh < g.y0)) continue
    const near = Math.exp(-((cx - m[0]) ** 2 + c.dy ** 2) / 3)
    ctx.fillStyle = css(pen, mix(N.cloud, N.cloudLit, 0.15 + 0.55 * near), 0.55 + 0.4 * c.dense)
    ctx.beginPath()
    // A lumpy top over a flat underside: lobes along it.
    const lobes = 3 + Math.floor(c.hw * 1.6)
    ctx.moveTo((cx - c.hw) * k, (cy + c.hh * 0.45) * k)
    for (let i = 0; i < lobes; i++) {
      const lx = cx - c.hw + ((i + 0.5) / lobes) * 2 * c.hw
      const lr = (c.hw / lobes) * (1.05 + 0.5 * hash(i, c.seed, 91))
      const ly = cy - c.hh * (0.1 + 0.6 * hash(i, c.seed, 92)) * Math.sin(((i + 0.5) / lobes) * Math.PI)
      ctx.ellipse(lx * k, ly * k, lr * k, Math.min(lr, c.hh * 0.9) * k, 0, Math.PI, 0)
    }
    ctx.lineTo((cx + c.hw) * k, (cy + c.hh * 0.45) * k)
    ctx.closePath()
    ctx.fill()
    // The silver along its top where the moon is behind it.
    if (near > 0.2) {
      ctx.strokeStyle = css(pen, N.moonGlow, 0.35 * near * clear)
      ctx.lineWidth = pen.w * 0.5
      ctx.stroke()
    }
  }
  // A plane going over, its red light blinking.
  const pl: Pt = [m[0] - 9 + 0.22 * (t - T0), m[1] - 2.35 + 0.02 * (t - T0)]
  const blink = ((t - T0) % 1.15) < 0.12 ? 1 : 0.25
  ellipse(pen, pl, 0.035, 0.035, mix(N.sky1, N.red, blink))
  ellipse(pen, [pl[0] - 0.12, pl[1] + 0.01], 0.022, 0.022, mix(N.sky1, '#E8F0E8', ((t - T0 + 0.5) % 1.15) < 0.08 ? 1 : 0.2))
}

/* ------------------------------------------------------------------ the city */

interface Block {
  x0: number
  x1: number
  top: number
  /** A water tower on it, and where. */
  tower: number
  /** A setback and a mast (the far city's towers). */
  spire: number
  i: number
}
function blocks(seed: number, from: number, to: number, w: [number, number], top: [number, number], towers: number, spires: number): Block[] {
  const out: Block[] = []
  let x = from
  for (let i = 0; x < to; i++) {
    const bw = w[0] + (w[1] - w[0]) * hash(i, seed, 1)
    out.push({
      x0: x,
      x1: x + bw,
      top: top[0] + (top[1] - top[0]) * hash(i, seed, 2),
      tower: hash(i, seed, 3) < towers ? 0.25 + 0.5 * hash(i, seed, 4) : -1,
      spire: hash(i, seed, 5) < spires ? 0.8 + 1.4 * hash(i, seed, 6) : 0,
      i,
    })
    x += bw + (hash(i, seed, 7) < 0.25 ? 0.08 + 0.25 * hash(i, seed, 8) : 0)
  }
  return out
}
/** Downtown, far off: slabs, a few towers with masts. */
const FAR = blocks(11, -6, 30, [0.6, 1.5], [-0.3, 3.1], 0.12, 0.14)
/** Up the block: walk-ups and their water towers. */
const MID = blocks(23, -4, 32, [1.2, 2.3], [2.1, 4.7], 0.5, 0)

/** A water tower: its barrel on legs, its pointed lid; in one shape, its legs and hoops in a stroke. */
function tower(x: number, roof: number, s: number, shapes: Pt[][], segs: number[]): void {
  const w = 0.32 * s
  const legs = 0.32 * s
  const h = 0.48 * s
  const b = roof - legs
  shapes.push([[x - w, b], [x - w * 0.95, b - h], [x, b - h - 0.22 * s], [x + w * 0.95, b - h], [x + w, b]])
  segs.push(x - w * 0.8, b, x - w * 0.9, roof, x + w * 0.8, b, x + w * 0.9, roof, x - w * 0.85, b + legs * 0.5, x + w * 0.85, b + legs * 0.5, x - w * 0.8, b, x + w * 0.85, b + legs * 0.5)
}

/** A run of walls, their roofs and the windows in them, in one layer. */
function skyline(pen: Pen, t: number, g: Frame, outside: number, list: Block[], o: { body: string; top: string; win: [number, number, number, number]; share: number; seed: number; dark?: string; base: number }): void {
  const shapes: Pt[][] = []
  const segs: number[] = []
  const tops: Pt[][] = []
  const [ww, wh, sx, sy] = o.win
  const bodyCss = css(pen, o.body)
  for (const b of list) {
    if (b.x1 < outside - 0.6 || b.x0 > g.x1 + 0.6) continue
    const y1 = Math.max(g.y1 + 0.5, o.base)
    if (b.top - 2.5 > g.y1) continue
    box(bodyCss, b.x0, b.top, b.x1, y1)
    tops.push([[b.x0 - 0.03, b.top], [b.x1 + 0.03, b.top], [b.x1 + 0.03, b.top + 0.06], [b.x0 - 0.03, b.top + 0.06]])
    if (b.spire > 0) {
      const cx = (b.x0 + b.x1) / 2
      const sw = (b.x1 - b.x0) * 0.3
      shapes.push([[cx - sw, b.top], [cx - sw, b.top - b.spire * 0.55], [cx - sw * 0.55, b.top - b.spire * 0.55], [cx - sw * 0.55, b.top - b.spire], [cx + sw * 0.55, b.top - b.spire], [cx + sw * 0.55, b.top - b.spire * 0.55], [cx + sw, b.top - b.spire * 0.55], [cx + sw, b.top]])
      segs.push(cx, b.top - b.spire, cx, b.top - b.spire - 0.45)
      // Its beacon blinks.
      const on = ((t + b.i * 0.37) % 1.6) < 0.5
      box(css(pen, on ? N.red : '#4A2228'), cx - 0.03, b.top - b.spire - 0.5, cx + 0.03, b.top - b.spire - 0.44)
    }
    if (b.tower > 0) tower(b.x0 + (b.x1 - b.x0) * b.tower, b.top, 1, shapes, segs)
    // The windows: the lit ones warm, a few with a television's blue, the rest (near enough) dark glass.
    const c0 = Math.ceil((Math.max(b.x0, outside - 0.3) - b.x0 - 0.1) / sx)
    const c1 = Math.floor((Math.min(b.x1, g.x1 + 0.3) - b.x0 - 0.1 - ww) / sx)
    const r0 = Math.max(0, Math.ceil((g.y0 - b.top - 0.2) / sy))
    const r1 = Math.floor((Math.min(y1, g.y1) - b.top - 0.2) / sy)
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        const x = b.x0 + 0.1 + c * sx
        const y = b.top + 0.2 + r * sy
        const on = lit(b.i * 41 + c, r, o.seed, o.share, t)
        if (on) {
          const tv = on === 3 && hash(c, r, o.seed + 9) < 0.5
          const col = tv ? N.tv : on === 2 ? N.winWarm : N.win
          box(css(pen, col, tv ? 0.55 + 0.35 * Math.abs(Math.sin(t * 9 + c * 3 + r)) : 0.92), x, y, x + ww, y + wh)
        } else if (o.dark) box(o.dark, x, y, x + ww, y + wh)
      }
    }
  }
  flush(pen)
  polys(pen, tops, css(pen, o.top))
  polys(pen, shapes, bodyCss)
  strokes(pen, segs, bodyCss, 0.7)
}

/** The far city and the roofs up the block, for the outside or for a window's view. */
export function drawFar(pen: Pen, t: number, g: Frame, outside: number): void {
  skyline(pen, t, g, outside, FAR, { body: N.far, top: N.farTop, win: [0.07, 0.09, 0.18, 0.24], share: 0.13, seed: 31, base: F_STREET + 4 })
}
export function drawMid(pen: Pen, t: number, g: Frame, outside: number): void {
  skyline(pen, t, g, outside, MID, { body: N.mid, top: N.midTop, win: [0.12, 0.16, 0.3, 0.4], share: 0.16, seed: 47, dark: css(pen, mix(N.mid, N.sky2, 0.3)), base: F_STREET + 4 })
}

/* ------------------------------------------------------------------ across the street */

/**
 * The near side of the block across: its ground line, and its houses. The first stands behind the stair he comes down,
 * kept dark; the washing hangs in the airshaft past the ladder, clear of his way down.
 */
const GROUND = 9.9
const HOUSES = [
  { x0: 6.4, x1: 11.4, top: 4.5, body: N.near, floors: 6, escape: 7.6 },
  { x0: 11.4, x1: 14.3, top: 5.3, body: N.near2, floors: 5, escape: 0 },
  { x0: 15.5, x1: 19.2, top: 6.0, body: N.near3, floors: 4, escape: 0 },
  { x0: 20.2, x1: 26, top: 5.0, body: N.near, floors: 5, escape: 21.0 },
]
/** The neon blade on the third house, by the airshaft. */
const BLADE: Pt = [15.95, 7.2]
/** The billboard on the bar's roof. */
const BILL = { x0: 11.55, x1: 14.15, y0: 3.75, y1: 5.05 }
/**
 * Where his way down passes in front of the houses across (in their cells, as the camera follows him): down the stair,
 * then down the ladder. No window lights up behind him there, so the orange of him reads against dark.
 */
const clearOfHim = (x: number, y: number): boolean => !((x > 9.45 && x < 11.75 && y > 3.9 && y < 7.4) || (x > 12.45 && x < 13.15 && y > 6.6 && y < 9.0))
/** The bar's window and door, and the diner's window. */
const BAR = { x0: 11.98, x1: 12.85, y0: 9.0, y1: 9.72 }
const BAR_DOOR: [number, number] = [11.5, 11.88]
const DINER = { x0: 16.5, x1: 18.9, y0: 9.0, y1: 9.75 }

/** The sign's two colours on the beat: red on one and three, blue on two and four. */
export function neon(t: number): { red: number; blue: number } {
  const b = lastBeat(t)
  const p = pulse(t, 0.3)
  const odd = b.pos === 1 || b.pos === 3
  // A stutter as a tube catches.
  const stut = hash(Math.floor(t * 14), 3, 61) < 0.05 ? 0.45 : 1
  return { red: (odd ? 0.55 + 0.45 * p : 0.22) * stut, blue: odd ? 0.22 : 0.55 + 0.45 * p }
}

/** The cars along the street across, show time to cells: the first going right, the second coming back. */
const CARS = [
  { at: (t: number) => 9 + 5 * (t - 117.6), dir: 1, from: 117.0, to: 120.4, body: '#0C1416' },
  { at: (t: number) => 23 - 3.4 * (t - 120.4), dir: -1, from: 120.4, to: 124, body: '#141414' },
]
/** The far lane, where their wheels run. */
const LANE = GROUND + 0.4

function drawAcross(pen: Pen, t: number, g: Frame, outside: number): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  // The street across, wet: the far kerb, then the road down to ours.
  box(css(pen, N.kerb), outside - 0.5, GROUND, g.x1 + 0.5, GROUND + 0.12)
  box(css(pen, N.road), outside - 0.5, GROUND + 0.12, g.x1 + 0.5, Math.max(g.y1 + 0.5, GROUND + 4))
  const shapes: Pt[][] = []
  const segs: number[] = []
  const tops: Pt[][] = []
  const darkWin = css(pen, N.glass)
  // The figures in lit rooms, drawn once their windows are down: [window x, y, height, figure x].
  const people: number[] = []
  // The street and the far kerb first, under the houses.
  flush(pen)
  for (const [hi, h] of HOUSES.entries()) {
    if (h.x1 < outside - 0.5 || h.x0 > g.x1 + 0.5) continue
    box(css(pen, h.body), h.x0, h.top, h.x1, GROUND)
    // Its cornice, and a belt over the shop floor.
    tops.push([[h.x0 - 0.08, h.top - 0.02], [h.x1 + 0.08, h.top - 0.02], [h.x1 + 0.08, h.top + 0.14], [h.x0 - 0.08, h.top + 0.14]])
    tops.push([[h.x0, GROUND - 1.15], [h.x1, GROUND - 1.15], [h.x1, GROUND - 1.08], [h.x0, GROUND - 1.08]])
    // The windows over the shops, two to a bay; some lit, some with someone in them.
    const fh = (GROUND - 1.15 - h.top - 0.2) / h.floors
    for (let fl = 0; fl < h.floors; fl++) {
      const y = h.top + 0.3 + fl * fh
      if (y > g.y1 || y + fh < g.y0) continue
      for (let x = h.x0 + 0.28, c = 0; x + 0.26 < h.x1 - 0.1; x += 0.52, c++) {
        if (x + 0.26 < outside) continue
        const on = clearOfHim(x + 0.13, y + fh * 0.3) ? lit(hi * 50 + c, fl, 71, 0.2, t) : 0
        box(on ? css(pen, on === 3 ? N.tv : on === 2 ? N.winWarm : N.win, on === 3 ? 0.6 + 0.3 * Math.abs(Math.sin(t * 7 + c)) : 0.95) : darkWin, x, y, x + 0.26, y + fh * 0.55)
        // A lintel.
        box(css(pen, N.nearTop), x - 0.03, y - 0.05, x + 0.29, y - 0.01)
        // Someone crossing a lit room now and then.
        if (on === 1 && hash(c, fl, 72 + hi) < 0.35) {
          const per = 5 + 4 * hash(c, fl, 73)
          const u = ((t / per + hash(c, fl, 74)) % 1) * 3 - 1
          if (u > -0.2 && u < 1.2) people.push(x, y, fh * 0.55, x + 0.13 + (u - 0.5) * 0.36)
        }
      }
    }
    // Each house's front, its windows and lintels, before the next house's.
    flush(pen)
    // The fire escape down its front: a landing a floor, the stairs zigzagging.
    if (h.escape) {
      const fx0 = h.escape
      const fx1 = fx0 + 1.5
      for (let fl = 0; fl < h.floors; fl++) {
        const y = h.top + 0.3 + (fl + 0.62) * fh
        segs.push(fx0, y, fx1, y, fx0, y - 0.3, fx1, y - 0.3, fx0, y, fx0, y - 0.3, fx1, y, fx1, y - 0.3)
        if (fl < h.floors - 1) segs.push(fl % 2 ? fx0 + 0.15 : fx1 - 0.15, y, fl % 2 ? fx1 - 0.25 : fx0 + 0.25, y + fh)
      }
    }
  }
  // Someone crossing a lit room: shoulders and a head, seen through the window.
  for (let i = 0; i < people.length; i += 4) {
    const [x, y, wh, px] = [people[i], people[i + 1], people[i + 2], people[i + 3]]
    const pts: Pt[] = [[px - 0.07, y + wh], [px - 0.06, y + wh * 0.55], [px - 0.03, y + wh * 0.44], [px + 0.03, y + wh * 0.44], [px + 0.06, y + wh * 0.55], [px + 0.07, y + wh]]
    ctx.save()
    ctx.beginPath()
    ctx.rect(x * k, y * k, 0.26 * k, wh * k)
    ctx.clip()
    polys(pen, [pts], css(pen, '#2A2016', 0.85))
    ellipse(pen, [px, y + wh * 0.34], 0.045, 0.05, '#2A2016')
    ctx.restore()
  }
  // The water towers on the near roofs.
  tower(7.4, HOUSES[0].top, 1.6, shapes, segs)
  tower(21.6, HOUSES[3].top, 1.5, shapes, segs)
  tower(18.2, HOUSES[2].top, 1.3, shapes, segs)
  flush(pen)
  polys(pen, tops, css(pen, N.nearTop))
  polys(pen, shapes, css(pen, N.near))
  strokes(pen, segs, css(pen, N.iron), 0.55)
  // The shops: the bar's window and its door, the diner's long window, the corner shop's grille.
  drawShops(pen, t)
  drawWashing(pen, t, g)
  drawBillboard(pen, t, g)
  drawBlade(pen, t, g)
  drawFarLamp(pen, g)
  drawStreetAcross(pen, t, g, outside)
}

/** The streetlight on the far kerb, by the airshaft: its sodium on the house fronts and down on the wet. */
const FAR_LAMP: Pt = [14.92, GROUND]
function drawFarLamp(pen: Pen, g: Frame): void {
  const [x, y] = FAR_LAMP
  if (x + 2 < g.x0 || x - 2 > g.x1 || y + 1 < g.y0 || y - 4.5 > g.y1) return
  const head: Pt = [x - 0.42, y - 2.5]
  strokes(pen, [x, y, x, y - 2.4, x, y - 2.4, x - 0.18, y - 2.57, x - 0.18, y - 2.57, head[0], head[1] - 0.04], css(pen, N.iron), 1.4)
  ellipse(pen, head, 0.1, 0.045, mix(N.iron, N.sodium, 0.95))
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const gr = ctx.createLinearGradient(0, head[1] * k, 0, y * k)
  gr.addColorStop(0, css(pen, N.sodium, 0.16))
  gr.addColorStop(1, css(pen, N.sodium, 0.05))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.moveTo((head[0] - 0.1) * k, head[1] * k)
  ctx.lineTo((head[0] + 0.1) * k, head[1] * k)
  ctx.lineTo((head[0] + 1.3) * k, (y + 0.5) * k)
  ctx.lineTo((head[0] - 1.3) * k, (y + 0.5) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  bloom(pen, head, 1.1, N.sodium, 0.32)
}

function drawShops(pen: Pen, t: number): void {
  // The bar: its warm window, two hats at the counter, a door with a lit transom.
  box(css(pen, N.win, 0.9), BAR.x0, BAR.y0, BAR.x1, BAR.y1)
  box(css(pen, '#2A1C12'), BAR.x0, BAR.y1 - 0.12, BAR.x1, BAR.y1)
  for (const [i, hx] of [BAR.x0 + 0.3, BAR.x0 + 0.66].entries()) {
    const lean = 0.02 * Math.sin(t * 1.3 + i * 2)
    box(css(pen, '#2A1C12'), hx - 0.1 + lean, BAR.y1 - 0.38, hx + 0.1 + lean, BAR.y1 - 0.12)
    box(css(pen, '#2A1C12'), hx - 0.07 + lean, BAR.y1 - 0.5, hx + 0.07 + lean, BAR.y1 - 0.38)
    box(css(pen, '#2A1C12'), hx - 0.12 + lean, BAR.y1 - 0.5, hx + 0.12 + lean, BAR.y1 - 0.47)
  }
  box(css(pen, '#060A0C'), BAR_DOOR[0], 9.0, BAR_DOOR[1], GROUND)
  box(css(pen, N.winDim, 0.8), BAR_DOOR[0] + 0.04, 8.82, BAR_DOOR[1] - 0.04, 8.94)
  // The diner, its fluorescent light, its stools, and the counterman going up and down behind the counter.
  box(css(pen, N.diner, 0.85), DINER.x0, DINER.y0, DINER.x1, DINER.y1)
  const man = DINER.x0 + 0.5 + (DINER.x1 - DINER.x0 - 1) * (0.5 + 0.5 * Math.sin(t * 0.45))
  box(css(pen, '#33403C'), man - 0.08, DINER.y0 + 0.22, man + 0.08, DINER.y1 - 0.2)
  box(css(pen, '#33403C'), man - 0.06, DINER.y0 + 0.1, man + 0.06, DINER.y0 + 0.22)
  box(css(pen, '#E8EEE6', 0.9), man - 0.08, DINER.y0 + 0.07, man + 0.08, DINER.y0 + 0.1)
  box(css(pen, '#2C3633'), DINER.x0, DINER.y1 - 0.22, DINER.x1, DINER.y1 - 0.16)
  for (let x = DINER.x0 + 0.2; x < DINER.x1 - 0.1; x += 0.36) box(css(pen, '#2C3633'), x - 0.02, DINER.y1 - 0.16, x + 0.02, DINER.y1)
  // The corner shop, shut: its grille pulled down.
  box(css(pen, '#141E21'), 7.0, 9.0, 9.6, GROUND)
  for (let x = 7.05; x < 9.6; x += 0.12) box(css(pen, '#1E2B2E'), x, 9.0, x + 0.03, GROUND)
  flush(pen)
}

/** Washing on the lines across the airshaft past the bar, swinging in the wind and the rain. */
function drawWashing(pen: Pen, t: number, g: Frame): void {
  const a = HOUSES[1].x1
  const b = HOUSES[2].x0
  if (b < g.x0 - 0.5 || a > g.x1 + 0.5) return
  const segs: number[] = []
  const byCol: Pt[][][] = N.wash.map(() => [])
  for (let li = 0; li < 3; li++) {
    const y = 4.6 + li * 0.85
    const sag = 0.16 + 0.03 * sway(t, li * 3, 2.8)
    const at = (x: number) => y + sag * (1 - ((2 * (x - a)) / (b - a) - 1) ** 2)
    for (let i = 0; i < 6; i++) segs.push(a + ((b - a) * i) / 6, at(a + ((b - a) * i) / 6), a + ((b - a) * (i + 1)) / 6, at(a + ((b - a) * (i + 1)) / 6))
    // Pulleys at either end.
    segs.push(a - 0.04, y - 0.04, a + 0.04, y + 0.04, b - 0.04, y - 0.04, b + 0.04, y + 0.04)
    const n = 3
    for (let i = 0; i < n; i++) {
      const x0 = a + 0.12 + ((b - a - 0.24) * i) / n
      const w = (b - a - 0.3) / n - 0.06
      const ci = Math.floor(hash(li, i, 81) * N.wash.length)
      const swing = 0.08 * sway(t, li * 5 + i, 1.7 + 0.4 * hash(li, i, 82)) + 0.04
      const top0 = at(x0)
      const top1 = at(x0 + w)
      const kind = hash(li, i, 83)
      const len = kind < 0.4 ? 0.55 : kind < 0.75 ? 0.4 : 0.28
      if (kind < 0.4) {
        // A sheet, its hem blowing.
        byCol[ci].push([[x0, top0], [x0 + w, top1], [x0 + w + swing, top1 + len], [x0 + w * 0.5 + swing * 1.2, top1 + len + 0.04 * Math.sin(t * 3 + i)], [x0 + swing, top0 + len]])
      } else if (kind < 0.75) {
        // A shirt, arms out.
        const sx = swing * 0.8
        byCol[ci].push([[x0 + w * 0.15, top0], [x0 + w * 0.85, top1], [x0 + w + 0.06 + sx, top1 + 0.12], [x0 + w * 0.82 + sx, top1 + 0.16], [x0 + w * 0.8 + sx, top1 + len], [x0 + w * 0.2 + sx, top0 + len], [x0 + w * 0.18 + sx, top0 + 0.16], [x0 - 0.06 + sx, top0 + 0.12]])
      } else {
        // Two socks.
        for (const dx of [0.1, 0.3]) byCol[ci].push([[x0 + dx * w, top0], [x0 + dx * w + 0.06, top0], [x0 + dx * w + 0.06 + swing, top0 + len], [x0 + dx * w + 0.14 + swing, top0 + len + 0.05], [x0 + dx * w + swing, top0 + len + 0.06]])
      }
    }
  }
  strokes(pen, segs, css(pen, '#2E3A3C'), 0.4)
  byCol.forEach((list, i) => polys(pen, list, css(pen, N.wash[i], 0.9)))
}

/** The billboard on the bar's roof, lit from under its hood by two lamps: an ad all picture (a bottle, a red sun). */
function drawBillboard(pen: Pen, t: number, g: Frame): void {
  const { x0, x1, y0, y1 } = BILL
  if (x1 < g.x0 - 1 || x0 > g.x1 + 1 || y1 < g.y0 - 1 || y0 > g.y1 + 1) return
  const roof = HOUSES[1].top
  const segs: number[] = []
  // The frame it stands on, and the catwalk.
  for (const x of [x0 + 0.3, (x0 + x1) / 2, x1 - 0.3]) segs.push(x, y1, x, roof, x, y1, x + 0.35, roof)
  segs.push(x0, y1 + 0.08, x1, y1 + 0.08)
  strokes(pen, segs, css(pen, N.iron), 0.6)
  // The lamps' flicker: one of them is going.
  const fl = 0.85 + 0.15 * Math.sin(t * 31) * (hash(Math.floor(t * 6), 1, 62) < 0.25 ? 1 : 0)
  box(css(pen, mix(N.board, N.sky1, 0.45 - 0.3 * fl)), x0, y0, x1, y1)
  // A band of sky blue along its foot, a red sun going down into it, a slogan's bars (all picture, no words).
  box(css(pen, mix('#6F9AA8', N.sky1, 0.4 - 0.25 * fl)), x0, y1 - 0.34, x1, y1)
  box(css(pen, mix(N.boardRed, N.sky1, 0.4 - 0.25 * fl)), x0 + 0.2, y0 + 0.16, x0 + 1.25, y0 + 0.25)
  box(css(pen, mix(N.boardRed, N.sky1, 0.4 - 0.25 * fl)), x0 + 0.2, y0 + 0.33, x0 + 0.95, y0 + 0.39)
  flush(pen)
  const ctx0 = ctxOf(pen.p)
  ctx0.save()
  ctx0.beginPath()
  ctx0.rect(x0 * pen.k, y0 * pen.k, (x1 - x0) * pen.k, (y1 - 0.34 - y0) * pen.k)
  ctx0.clip()
  ellipse(pen, [x0 + 0.85, y1 - 0.34], 0.36, 0.36, mix(N.boardRed, N.sky1, 0.4 - 0.25 * fl))
  ctx0.restore()
  // The bottle, tipped.
  const bx = x1 - 0.7
  const by = y0 + 0.7
  polys(pen, [[[bx - 0.18, by + 0.48], [bx + 0.08, by + 0.55], [bx + 0.2, by - 0.12], [bx + 0.12, by - 0.38], [bx + 0.15, by - 0.55], [bx + 0.05, by - 0.57], [bx - 0.02, by - 0.4], [bx - 0.13, by - 0.18]]], css(pen, mix(N.boardGreen, N.sky1, 0.3)))
  box(css(pen, mix(N.board, N.sky1, 0.3)), bx - 0.1, by - 0.02, bx + 0.12, by + 0.14)
  flush(pen)
  // A border, the hood, the lamps on their arms, their light down the face.
  strokes(pen, [x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0], css(pen, '#2A2A24'), 0.6)
  box(css(pen, N.iron), x0 - 0.05, y0 - 0.1, x1 + 0.05, y0 - 0.02)
  for (const x of [x0 + 0.6, x1 - 0.6]) {
    strokes(pen, [x, y0 - 0.06, x, y0 - 0.28, x, y0 - 0.28, x + 0.12, y0 - 0.3], css(pen, N.iron), 0.5)
    ellipse(pen, [x + 0.13, y0 - 0.27], 0.05, 0.03, mix(N.sky1, '#FFF1C8', fl))
  }
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const gr = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  gr.addColorStop(0, css(pen, '#FFE7B0', 0.32 * fl))
  gr.addColorStop(1, css(pen, '#FFE7B0', 0))
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = gr
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/** The bar's neon off the corner of its house, on its bracket. */
function drawBlade(pen: Pen, t: number, g: Frame): void {
  const [x, y] = BLADE
  if (x < g.x0 - 2 || x > g.x1 + 2 || y > g.y1 + 2 || y + 1.9 < g.y0 - 2) return
  strokes(pen, [x + 0.22, y + 0.2, x + 0.45, y + 0.2, x + 0.22, y + 1.6, x + 0.45, y + 1.6], css(pen, N.iron), 0.6)
  blade(pen, t, BLADE, 1)
}

/**
 * A bar's neon sign: a blade, its red tube round the edge, a blue glass and a red star inside, red and blue on the
 * beat, and their light in the wet air round it. `top` is its top's middle; `s` its size (1 is 1.8 cells tall).
 */
export function blade(pen: Pen, t: number, top: Pt, s: number): void {
  const [x, y] = top
  const { red, blue } = neon(t)
  const lw = 0.75 * Math.min(1, 0.4 + s)
  const X = (u: number) => x + u * s
  const Y = (v: number) => y + v * s
  box(css(pen, '#120E10'), X(-0.22), Y(0), X(0.22), Y(1.8))
  flush(pen)
  const R = mix('#3A1A22', N.red, red)
  const B = mix('#1A2A3A', N.blue, blue)
  strokes(pen, [X(-0.17), Y(0.05), X(0.17), Y(0.05), X(0.17), Y(0.05), X(0.17), Y(1.75), X(0.17), Y(1.75), X(-0.17), Y(1.75), X(-0.17), Y(1.75), X(-0.17), Y(0.05)], css(pen, R), lw)
  // The glass, in blue: its bowl, stem and foot; the olive in red.
  strokes(pen, [X(-0.12), Y(0.3), X(0.12), Y(0.3), X(-0.12), Y(0.3), X(0), Y(0.55), X(0.12), Y(0.3), X(0), Y(0.55), X(0), Y(0.55), X(0), Y(0.82), X(-0.09), Y(0.84), X(0.09), Y(0.84)], css(pen, B), lw)
  ellipse(pen, [X(0.03), Y(0.38)], 0.03 * s, 0.03 * s, R)
  // The star, in red; a wave under it in blue.
  const st: number[] = []
  for (let i = 0; i < 5; i++) {
    const a0 = -Math.PI / 2 + (i * 4 * Math.PI) / 5
    const a1 = -Math.PI / 2 + ((i + 1) * 4 * Math.PI) / 5
    st.push(X(0.12 * Math.cos(a0)), Y(1.12 + 0.12 * Math.sin(a0)), X(0.12 * Math.cos(a1)), Y(1.12 + 0.12 * Math.sin(a1)))
  }
  strokes(pen, st, css(pen, R), lw * 0.8)
  strokes(pen, [X(-0.13), Y(1.47), X(-0.06), Y(1.41), X(-0.06), Y(1.41), X(0.02), Y(1.49), X(0.02), Y(1.49), X(0.13), Y(1.41)], css(pen, B), lw * 0.8)
  bloom(pen, [x, Y(0.9)], 1.5 * s, red > blue ? N.red : N.blue, 0.2 * Math.max(red, blue))
}

/** The street across, wet: the lights in it, the rain rings, a manhole's steam, and the cars going by. */
function drawStreetAcross(pen: Pen, t: number, g: Frame, outside: number): void {
  const { red, blue } = neon(t)
  // Reflections: each light a broken streak down the wet road, wavering.
  const lights: [number, number, string, number][] = [
    [BLADE[0], 0.2, N.red, 0.42 * red],
    [BLADE[0], 0.12, N.blue, 0.42 * blue],
    [(BAR.x0 + BAR.x1) / 2, 0.4, N.win, 0.26],
    [(DINER.x0 + DINER.x1) / 2, 0.9, N.diner, 0.2],
    [(BAR_DOOR[0] + BAR_DOOR[1]) / 2, 0.16, N.winDim, 0.2],
  ]
  for (const [li, [x, w, col, a]] of lights.entries()) {
    if (x + w < outside || x - w > g.x1) continue
    for (let i = 0; i < 10; i++) {
      // Broken by the rain: a dash here and there missing, each wavering.
      if (hash(i, Math.floor(t * 6 + li), 69) < 0.25) continue
      const y = GROUND + 0.16 + i * 0.1
      const wob = 0.04 * Math.sin(t * 5 + i * 1.7 + x)
      const ww = w * (1 - i * 0.05) * (0.6 + 0.4 * Math.sin(t * 3.3 + i * 2.1 + li))
      box(css(pen, col, a * (1 - i / 10)), x - ww / 2 + wob, y, x + ww / 2 + wob, y + 0.035)
    }
  }
  flush(pen)
  // Rings where the rain hits the road.
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.lineWidth = Math.max(0.6, pen.w * 0.3)
  // Two strengths of ring: the fresh ones, and the ones spreading out and going.
  for (const fresh of [true, false]) {
    ctx.strokeStyle = css(pen, N.rain, fresh ? 0.22 : 0.1)
    ctx.beginPath()
    for (let i = 0; i < 18; i++) {
      const life = 0.5 + 0.3 * hash(i, 1, 63)
      const u = (t / life + hash(i, 2, 63)) % 1
      if (u < 0.45 !== fresh) continue
      const gen = Math.floor(t / life + hash(i, 2, 63))
      const x = outside + (g.x1 - outside + 0.5) * hash(i, gen, 64)
      const y = GROUND + 0.25 + 1.3 * hash(i, gen, 65)
      const r = 0.03 + 0.17 * u
      ctx.moveTo((x + r) * k, y * k)
      ctx.ellipse(x * k, y * k, r * k, r * 0.2 * k, 0, 0, Math.PI * 2)
    }
    ctx.stroke()
  }
  ctx.restore()
  // A manhole in the road, its steam going up past the lamp and the diner's light.
  const mh: Pt = [16.95, GROUND + 0.55]
  ellipse(pen, mh, 0.32, 0.05, '#071012')
  rising(pen, t, { seed: 5, n: 46, from: [mh[0] - 0.2, mh[0] + 0.2, mh[1]], rise: 3.0, life: 3.6, spread: 0.9, size: [0.16, 0.42], color: N.steam, hot: N.steamLit, alpha: 0.075 })
  // The cars, their lights on the road ahead and on the house fronts as they pass.
  for (const car of CARS) {
    if (t < car.from || t > car.to) continue
    const x = car.at(t)
    if (x < outside - 3 || x > g.x1 + 3) continue
    drawCar(pen, t, x, LANE, car.dir, car.body)
  }
}

/** A sedan on the street across, going `dir`, its wheels on `y`: headlamps, their beams, the tail light. */
function drawCar(pen: Pen, t: number, x: number, y: number, dir: number, body: string): void {
  const L = 1.5
  const at = (u: number, v: number): Pt => [x + dir * u, y + v]
  const hull: Pt[] = [at(-L / 2, -0.1), at(-L / 2, -0.28), at(-L * 0.3, -0.32), at(-L * 0.2, -0.5), at(L * 0.12, -0.52), at(L * 0.24, -0.33), at(L / 2, -0.3), at(L / 2 + 0.03, -0.12), at(L / 2, -0.1)]
  polys(pen, [hull], css(pen, body))
  // The sky along its roof, the glass.
  strokes(pen, [...at(-L * 0.19, -0.5), ...at(L * 0.11, -0.515)], css(pen, '#4E6A6C', 0.8), 0.6)
  polys(pen, [[at(-L * 0.17, -0.46), at(L * 0.1, -0.47), at(L * 0.2, -0.34), at(-L * 0.26, -0.33)]], css(pen, '#2A3C3E', 0.9))
  for (const u of [-L * 0.3, L * 0.3]) ellipse(pen, at(u, -0.08), 0.1, 0.1, '#050808')
  // The headlamp, its beam out along the road, its light thrown on the wet ahead.
  const hl = at(L / 2, -0.24)
  shaft(pen, hl, dir > 0 ? -Math.PI / 2 + 0.06 : Math.PI / 2 - 0.06, 0.32, 3.4, '#FFF2CC', 0.22)
  ellipse(pen, hl, 0.05, 0.05, '#FFF6DC')
  bloom(pen, hl, 0.32, '#FFF2CC', 0.5)
  for (let i = 0; i < 5; i++) box(css(pen, '#FFF2CC', 0.4 * (1 - i / 5)), hl[0] - 0.08 + dir * i * 0.02, y + 0.06 + i * 0.1, hl[0] + 0.08 + dir * i * 0.02, y + 0.1 + i * 0.1)
  const tl = at(-L / 2, -0.22)
  ellipse(pen, tl, 0.035, 0.035, N.red)
  bloom(pen, tl, 0.22, N.red, 0.45)
  for (let i = 0; i < 4; i++) box(css(pen, N.red, 0.35 * (1 - i / 4)), tl[0] - 0.05, y + 0.06 + i * 0.1, tl[0] + 0.05, y + 0.1 + i * 0.1)
  flush(pen)
  // The pool of its light along the house fronts, going with it.
  bloom(pen, at(L / 2 + 2.0, -0.7), 1.6, '#FFF2CC', 0.07 + 0.02 * Math.sin(t * 40))
}

/* ------------------------------------------------------------------ the whole outside */

/** Where the moon is in the sky outside, and the camera it is there for (the two rooms, as the floor goes). */
const MOON_OUT: Pt = [10.3, -1.5]
const MOON_CAM: Pt = [5, 1]

/** The night past the outer wall: the sky, the far city, the roofs up the block, the rain, the houses across. */
export function drawNight(pen: Pen, t: number, f: Frame): void {
  // Nothing of it is in shot while the camera is inside the rooms.
  if (f.x1 < WALL_R[1]) return
  deep(pen, f, SKY_D, MOON_CAM, (g) => drawSky(pen, t, MOON_OUT, true, g))
  deep(pen, f, 0.2, OUT, (g, o) => drawFar(pen, t, g, o))
  deep(pen, f, 0.45, OUT, (g, o) => drawMid(pen, t, g, o))
  // Far rain, over the roofs up the block.
  deep(pen, f, 0.5, OUT, (g, o) => rain(pen, t, g, { seed: 3, density: 5, speed: 8, slant: 0.1, len: 0.32, color: N.rain, alpha: 0.13, lw: 0.3, x: [o, Infinity] }))
  deep(pen, f, 0.72, OUT, (g, o) => {
    drawAcross(pen, t, g, o)
    rain(pen, t, g, { seed: 7, density: 2.4, speed: 10, slant: 0.1, len: 0.5, color: N.rain, alpha: 0.2, lw: 0.38, x: [o, Infinity] })
  })
}

/* ------------------------------------------------------------------ the near rain, the cat */

/** Bold streaks close to the lens, outside only: the rain between us and the fire escape. */
export function drawNearRain(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < WALL_R[1]) return
  const anchor: Pt = OUT
  const [dx] = parallax(f, 1.3, anchor)
  layer(pen, f, 1.3, (g) => rain(pen, t, g, { seed: 13, density: 0.32, speed: 15, slant: 0.1, len: 1.1, color: '#B9D6D6', alpha: 0.26, lw: 0.8, x: [WALL_R[1] - dx + 0.2, Infinity] }), anchor)
}

/** The streetlight's own rain: the drops lit amber as they fall through its cone. */
export function drawLampRain(pen: Pen, t: number, f: Frame, head: Pt, foot: number): void {
  if (head[0] + 2.4 < f.x0 || head[0] - 2.4 > f.x1 || foot < f.y0 || head[1] > f.y1) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((head[0] - 0.2) * k, head[1] * k)
  ctx.lineTo((head[0] + 0.2) * k, head[1] * k)
  ctx.lineTo((head[0] + 2.2) * k, foot * k)
  ctx.lineTo((head[0] - 2.2) * k, foot * k)
  ctx.closePath()
  ctx.clip()
  rain(pen, t, f, { seed: 17, density: 3.5, speed: 10, slant: 0.1, len: 0.42, color: N.sodium, alpha: 0.42, lw: 0.4, x: [head[0] - 2.3, head[0] + 2.3], y: [head[1], foot] })
  ctx.restore()
}

/** Where the cat sits: on the landing outside Mishkin's window, past where the stair goes down. */
const CAT: Pt = [10.95, L_MISH]
/** Its start at each of Mishkin's blows on the rail. */
const startle = (t: number): number => POUNDS.reduce((s, p) => s + (t >= p ? Math.exp(-(t - p) / 0.25) : 0), 0)

/** A black cat on the landing, its tail going, its head following him down the stair; its eyes catch the light. */
export function drawCat(pen: Pen, t: number, f: Frame): void {
  const [x, y] = CAT
  if (x + 1 < f.x0 || x - 1 > f.x1 || y - 1 > f.y1 || y + 0.3 < f.y0) return
  const ball = WAY.at(Math.min(t, 121))
  const st = Math.min(1, startle(t))
  // Crouched a little lower when he pounds.
  const hy = y - 0.5 + 0.08 * st
  const head: Pt = [x - 0.1, hy]
  const look = Math.atan2(ball[1] - head[1], ball[0] - head[0])
  const lx = Math.cos(look)
  const ly = Math.sin(look)
  const col = N.cat
  const ctx = ctxOf(pen.p)
  const { k } = pen
  // A little smaller than drawn, about where it sits.
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(0.82, 0.82)
  ctx.translate(-x * k, -y * k)
  // The tail, curling and uncurling along the landing.
  const sw = sway(t, 4, 3.1)
  const tail: Pt[] = [[x + 0.16, y - 0.05], [x + 0.36, y - 0.04], [x + 0.48 + 0.06 * sw, y - 0.14 - 0.04 * sw], [x + 0.46 + 0.12 * sw, y - 0.3 - 0.06 * sw]]
  ctx.save()
  ctx.strokeStyle = css(pen, col)
  ctx.lineWidth = 0.05 * k
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(tail[0][0] * k, tail[0][1] * k)
  ctx.bezierCurveTo(tail[1][0] * k, tail[1][1] * k, tail[2][0] * k, tail[2][1] * k, tail[3][0] * k, tail[3][1] * k)
  ctx.stroke()
  ctx.restore()
  // Its body sitting up, haunch and chest; its head turned his way.
  ellipse(pen, [x + 0.05, y - 0.15], 0.17, 0.15 - 0.02 * st, col)
  polys(pen, [[[x - 0.14, y - 0.02], [x - 0.15, hy + 0.12], [x - 0.02, hy + 0.08], [x + 0.12, y - 0.18], [x + 0.06, y - 0.02]]], css(pen, col))
  ellipse(pen, head, 0.11, 0.1, col)
  const ear = (side: number): Pt[] => {
    const bx = head[0] + side * 0.06 + lx * 0.02
    return [[bx - 0.045, hy - 0.06], [bx + side * 0.01 - lx * 0.03 * st, hy - 0.17 + 0.05 * st], [bx + 0.045, hy - 0.06]]
  }
  polys(pen, [ear(-1), ear(1)], css(pen, col))
  // The moon along its back.
  ctx.save()
  ctx.strokeStyle = css(pen, N.moonGlow, 0.35)
  ctx.lineWidth = pen.w * 0.4
  ctx.beginPath()
  ctx.ellipse((x + 0.05) * k, (y - 0.15) * k, 0.17 * k, 0.15 * k, 0, Math.PI * 1.15, Math.PI * 1.75)
  ctx.stroke()
  ctx.restore()
  // Its eyes, when it looks out toward us at all; it blinks now and then.
  const blink = hash(Math.floor(t * 1.7), 2, 66) < 0.1 && (t * 1.7) % 1 < 0.25
  if (!blink) {
    const front = 0.5 + 0.5 * Math.max(0, ly)
    for (const side of [-1, 1]) {
      const e: Pt = [head[0] + lx * 0.05 + side * 0.04, head[1] + 0.005 + ly * 0.03]
      ellipse(pen, e, 0.022, 0.018 + 0.006 * st, mix(N.cat, N.catEye, 0.55 + 0.45 * front))
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the street's own wet */

/** The puddles along our pavement: their rain rings, and drops jumping where it hits. */
export function drawPavementRain(pen: Pen, t: number, f: Frame): void {
  const y = F_STREET
  if (y < f.y0 - 0.5 || y > f.y1 + 0.5) return
  const x0 = Math.max(WALL_R[1], f.x0 - 0.5)
  const x1 = Math.min(KERB + 4, f.x1 + 0.5)
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.strokeStyle = css(pen, N.rain, 0.25)
  ctx.lineWidth = Math.max(0.6, pen.w * 0.32)
  ctx.beginPath()
  for (let i = 0; i < 14; i++) {
    const life = 0.45 + 0.3 * hash(i, 1, 67)
    const u = (t / life + hash(i, 2, 67)) % 1
    const gen = Math.floor(t / life + hash(i, 2, 67))
    const x = x0 + (x1 - x0) * hash(i, gen, 68)
    const r = 0.03 + 0.16 * u
    ctx.moveTo((x + r) * k, (y + 0.03) * k)
    ctx.ellipse(x * k, (y + 0.03) * k, r * k, r * 0.12 * k, 0, 0, Math.PI * 2)
    // The splash: two drops up, in the first moment.
    if (u < 0.2) {
      const h = 0.12 * Math.sin((u / 0.2) * Math.PI)
      ctx.moveTo((x - 0.04) * k, (y - h) * k)
      ctx.lineTo((x - 0.05) * k, (y - h - 0.03) * k)
      ctx.moveTo((x + 0.04) * k, (y - h) * k)
      ctx.lineTo((x + 0.05) * k, (y - h - 0.03) * k)
    }
  }
  ctx.stroke()
  ctx.restore()
  // The lights across the street, laid on our wet pavement: the sign's red and blue, the bar's and the diner's.
  const [dx] = parallax(f, 0.72, OUT)
  const { red, blue } = neon(t)
  const glints: [number, number, string, number][] = [
    [BLADE[0] + dx, 0.3, red > blue ? N.red : N.blue, 0.5 * Math.max(red, blue)],
    [(BAR.x0 + BAR.x1) / 2 + dx, 0.5, N.win, 0.3],
    [(DINER.x0 + DINER.x1) / 2 + dx, 0.9, N.diner, 0.25],
  ]
  for (const [gx, w, col, a] of glints) {
    if (gx + w < x0 || gx - w > x1) continue
    const wob = 0.04 * Math.sin(t * 4 + gx)
    box(css(pen, col, a), gx - w / 2 + wob, y + 0.01, gx + w / 2 + wob, y + 0.045)
    box(css(pen, col, a * 0.5), gx - w * 0.3 - wob, y + 0.06, gx + w * 0.3 - wob, y + 0.085)
  }
  flush(pen)
}

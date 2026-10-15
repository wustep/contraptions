import type p5 from 'p5'
import { frame, hash, scenery, smooth } from '../kit'
import { beat } from '../music'
import { DARK } from '../worlds'

/**
 * The dark's near layer, Act I: what drifts between the camera and the machine, faster than the world. Drawn over
 * everything (its `over`), so it is kept to the frame's edges and never over the ball's way: anything within the
 * frame's middle fades out.
 *
 * - In orbit, from the staging to the whip through the sphere: what the launch shed, tumbling past. Bolts and scraps
 *   of gold foil, a few dark panels nearer still, and flecks of ice, each depth at its own pace.
 * - At Gargantua, from the catch to the horizon: the disk's matter streaming past along its plane, near and fast.
 */

/**
 * From the staging (beat 144) until the ring takes the two of them and the camera draws back for the throw (162), and
 * from the slingshot's catch (181) to the horizon (189).
 */
export const SHED = beat(144)
export const SETTLED = beat(162)
export const CATCH = beat(181)
export const HORIZON = beat(189)
/** Gargantua's disk's tilt, as its part draws it. */
const TILT = -0.07
/**
 * How far from the camera's centre, in cells, the balls are in these stretches (2.4 at most): the near layer is kept
 * clear of all of it, whatever the frame's shape.
 */
const CLEAR = 2.55

export type Frame = ReturnType<typeof frame>

/**
 * 0 in the frame's middle, 1 out at its edges: what keeps the near layer off the machine. A thing of radius `r` is
 * kept a clear way off the camera's centre (where the balls are), and toward the edges of a wide frame.
 */
export function edge(f: Frame, x: number, y: number, r: number, inner = 0.5): number {
  const clear = smooth(Math.hypot(x - f.cx, y - f.cy), CLEAR + r, CLEAR + r + 0.5)
  if (inner <= 0 || clear <= 0) return clear
  const hw = (f.x1 - f.x0) / 2
  const hh = (f.y1 - f.y0) / 2
  return clear * smooth(((x - f.cx) / (inner * hw)) ** 2 + ((y - f.cy) / (inner * hh)) ** 2, 1, 1.6)
}

export interface Layer {
  /** How much of the camera's move it makes: more than 1 is nearer than the machine. */
  f: number
  cell: number
  /** Its own drift, cells a second. */
  vx: number
  vy: number
  /** How many of its cells have something in them. */
  fill: number
  seed: number
}

export const DEBRIS: Layer[] = [
  { f: 1.25, cell: 0.9, vx: -0.12, vy: 0.04, fill: 0.5, seed: 1 },
  { f: 1.6, cell: 2.2, vx: -0.18, vy: 0.05, fill: 0.45, seed: 2 },
  { f: 2.3, cell: 3.4, vx: -0.3, vy: 0.1, fill: 0.3, seed: 3 },
]

/** Visit every cell of a layer the frame shows: its object's place, and the cell's indices. */
export function cells(f: Frame, t: number, L: Layer, fn: (x: number, y: number, i: number, j: number) => void): void {
  const ox = f.cx * (1 - L.f) + L.vx * t
  const oy = f.cy * (1 - L.f) + L.vy * t
  for (let i = Math.floor((f.x0 - ox) / L.cell) - 1; i <= Math.ceil((f.x1 - ox) / L.cell); i++) {
    for (let j = Math.floor((f.y0 - oy) / L.cell) - 1; j <= Math.ceil((f.y1 - oy) / L.cell); j++) {
      if (hash(i, j, L.seed * 11) > L.fill) continue
      fn(ox + (i + hash(i, j, L.seed * 11 + 1)) * L.cell, oy + (j + hash(i, j, L.seed * 11 + 2)) * L.cell, i, j)
    }
  }
}

/** "r, g, b" of a hex colour, for the canvas's own fills (cheaper than a p5 colour per fleck). */
const rgb = (hex: string): string => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')
const ICE = rgb(DARK.ice)
const BONE = rgb('#ECE5D3')
const GOLD = rgb(DARK.gold)
const HULL = rgb(DARK.hull)
const SLATE = rgb(DARK.slate)

/** A closed outline through points (pixels, about the origin), turned by `a` and moved to `x, y`. */
function poly(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, pts: [number, number][]): void {
  const c = Math.cos(a)
  const s = Math.sin(a)
  ctx.beginPath()
  pts.forEach(([px, py], n) => (n ? ctx.lineTo : ctx.moveTo).call(ctx, x + px * c - py * s, y + px * s + py * c))
  ctx.closePath()
}

function drawDebris(p: p5, k: number, ink: string, weight: number, f: Frame, t: number, on: number): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const INK = rgb(ink)
  ctx.save()
  // Ice: flecks, the farthest of the three.
  cells(f, t, DEBRIS[0], (x, y, i, j) => {
    const a = on * edge(f, x, y, 0.04) * (0.3 + 0.4 * hash(i, j, 5))
    if (a < 0.02) return
    const s = X(0.012 + 0.018 * hash(i, j, 7))
    ctx.fillStyle = `rgba(${hash(i, j, 6) < 0.5 ? ICE : BONE}, ${a})`
    poly(ctx, X(x), X(y), hash(i, j, 8) * 6.3 + t * (hash(i, j, 9) - 0.5) * 3, [[-1.2 * s, -0.5 * s], [1.2 * s, -0.5 * s], [1.2 * s, 0.5 * s], [-1.2 * s, 0.5 * s]])
    ctx.fill()
  })
  // Bolts and scraps of foil, tumbling.
  ctx.lineWidth = Math.max(0.6, weight * 0.5)
  ctx.lineJoin = 'round'
  cells(f, t, DEBRIS[1], (x, y, i, j) => {
    const a = on * edge(f, x, y, 0.12)
    if (a < 0.02) return
    const s = X(0.05 + 0.07 * hash(i, j, 21))
    const turn = hash(i, j, 22) * 6.3 + t * (hash(i, j, 23) - 0.5) * 2.4
    ctx.strokeStyle = `rgba(${INK}, ${0.7 * a})`
    if (hash(i, j, 24) < 0.55) {
      // A scrap of gold foil, crumpled: a quad with one corner turned.
      ctx.fillStyle = `rgba(${GOLD}, ${0.9 * a})`
      poly(ctx, X(x), X(y), turn, [[-s, -s * 0.6], [s * 0.9, -s * 0.8], [s * 0.6 + s * 0.4 * Math.sin(t * 2 + i), s * 0.7], [-s * 0.8, s * 0.5]])
      ctx.fill()
      ctx.stroke()
    } else {
      // A bolt: a hex head on a short shank.
      ctx.fillStyle = `rgba(${HULL}, ${a})`
      poly(ctx, X(x), X(y), turn, [[0, -s * 0.18], [s * 1.1, -s * 0.18], [s * 1.1, s * 0.18], [0, s * 0.18]])
      ctx.fill()
      ctx.stroke()
      const hex: [number, number][] = []
      for (let q = 0; q < 6; q++) hex.push([Math.cos((q * Math.PI) / 3) * s * 0.42, Math.sin((q * Math.PI) / 3) * s * 0.42])
      poly(ctx, X(x), X(y), turn, hex)
      ctx.fill()
      ctx.stroke()
    }
  })
  // Nearest: a few dark panels off the interstage, edge-lit, turning slowly, ribbed.
  ctx.lineWidth = Math.max(0.8, weight * 0.7)
  cells(f, t, DEBRIS[2], (x, y, i, j) => {
    const a = on * edge(f, x, y, 0.3, 0.6)
    if (a < 0.02) return
    const w = X(0.22 + 0.2 * hash(i, j, 31)) / 2
    const h = w * (0.35 + 0.3 * hash(i, j, 32))
    const turn = hash(i, j, 33) * 6.3 + t * (hash(i, j, 34) - 0.5) * 0.9
    ctx.fillStyle = `rgba(${SLATE}, ${0.95 * a})`
    ctx.strokeStyle = `rgba(${INK}, ${0.55 * a})`
    poly(ctx, X(x), X(y), turn, [[-w, -h], [w, -h], [w, h], [-w, h]])
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = `rgba(${INK}, ${0.3 * a})`
    for (const u of [-0.5, 0.5]) {
      poly(ctx, X(x), X(y), turn, [[u * w, -h], [u * w, h]])
      ctx.stroke()
    }
  })
  ctx.restore()
}

/** Gargantua's disk, near: streams of its matter going by along its plane, fast, at the top and foot of the frame. */
export const STREAM: Layer[] = [
  { f: 1.5, cell: 0.7, vx: -2.2, vy: 2.2 * Math.tan(TILT), fill: 0.4, seed: 41 },
  { f: 2.1, cell: 1.3, vx: -3.4, vy: 3.4 * Math.tan(TILT), fill: 0.35, seed: 42 },
]

function drawStream(p: p5, k: number, f: Frame, t: number, on: number): void {
  const X = (v: number) => v * k
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.lineCap = 'round'
  for (let l = 0; l < STREAM.length; l++) {
    const L = STREAM[l]
    const speed = Math.hypot(L.vx, L.vy)
    const dx = L.vx / speed
    const dy = L.vy / speed
    cells(f, t, L, (x, y, i, j) => {
      const hh = (f.y1 - f.y0) / 2
      // Only in the bands above and below the middle, where the machine is not.
      const band = smooth(Math.abs(y - f.cy) / hh, 0.42, 0.62)
      const a = on * band * edge(f, x, y, 0.65, 0) * (0.25 + 0.4 * hash(i, j, 51))
      if (a < 0.02) return
      const len = (0.18 + 0.35 * hash(i, j, 52)) * (0.6 + 0.25 * l)
      ctx.strokeStyle = hash(i, j, 53) < 0.6 ? `rgba(240, 147, 64, ${a})` : `rgba(240, 200, 120, ${a})`
      ctx.lineWidth = Math.max(0.8, X(0.012 + 0.012 * hash(i, j, 54) + 0.008 * l))
      ctx.beginPath()
      ctx.moveTo(X(x), X(y))
      ctx.lineTo(X(x - dx * len), X(y - dy * len))
      ctx.stroke()
    })
  }
}

export const spaceNear = scenery<null>({
  name: 'space-near',
  draw: () => {},
  over: (p, _s, c) => {
    const { k, t, ink, weight } = c
    const debris = smooth(t, SHED + 0.1, SHED + 1.4) * (1 - smooth(t, SETTLED, SETTLED + 0.6))
    const stream = smooth(t, CATCH - 0.4, CATCH + 0.6) * (1 - smooth(t, HORIZON - 0.25, HORIZON + 0.15))
    if (debris <= 0 && stream <= 0) return
    const f = frame(p, k)
    if (debris > 0) drawDebris(p, k, ink, weight, f, t, debris)
    if (stream > 0) drawStream(p, k, f, t, stream)
  },
})

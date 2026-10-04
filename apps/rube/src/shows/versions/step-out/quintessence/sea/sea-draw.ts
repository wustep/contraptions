import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { R } from '../../../../../parts'
import { frame, hash, smooth } from '../kit'
import { G } from '../physics'
import { ctxOf, glow, mix, oval, poly, rgba, scribble, vgrad, type C2 } from '../sky/paint'
import { drawParcel } from '../sky/sky-draw'
import { BOAT, boomTip } from './boat'
import {
  BEGIN,
  BOAT_X0,
  BY_CAKE,
  CAKE,
  CAKE_X,
  DECK_ON,
  DECK_Y,
  DRIP,
  HANG,
  LINE_X,
  NET_IN,
  NET_ON,
  OPENS,
  OUT,
  parcelAt,
  PUFFS,
  REST_X,
  sharkAt,
  sinking,
  swingAt,
  TOP,
  W,
  WRAP,
} from './sea-plan'

/**
 * How the sea is drawn (B3's): the water from under its skin, cold blue-black with the light coming down from above;
 * the boat's hull dark against it; bubbles; the parcel going down; the shark; the net; the deck, the cake and its
 * wrapper, and the fisherman's hand. In the sea's cells times `k`, from show time.
 */

export const SEA = {
  skin: '#86AEBB',
  shallow: '#3B6B80',
  mid: '#1D4257',
  deep: '#0E2636',
  abyss: '#06131C',
  shaft: '#A9CBD4',
  snow: '#9DBCC6',
  bubble: '#D3E6EA',
  hull: '#0B1A22',
  shark: '#08141B',
  net: '#C9C3AE',
  line: '#D8D2BE',
  cake: '#E08A35',
  cakeSide: '#B9772F',
  cakeDark: '#8C5A26',
  slice: '#F2A64A',
  paper: '#E8E1CF',
  paperShade: '#CFC6B1',
  pencil: '#5C574D',
  sleeve: '#3E4934',
  cuff: '#5E594F',
  skin2: '#B4876A',
}

/** The water's colour at a depth (cells under the skin). */
export function waterAt(d: number): string {
  if (d < 1.5) return mix(SEA.shallow, SEA.mid, d / 1.5)
  if (d < 4.5) return mix(SEA.mid, SEA.deep, (d - 1.5) / 3)
  return mix(SEA.deep, SEA.abyss, Math.min(1, (d - 4.5) / 4))
}

/** The surface's line, a little lift and fall along it. */
export const skinY = (x: number, t: number): number => W + 0.028 * Math.sin(x * 2.1 + t * 1.3) + 0.016 * Math.sin(x * 5.3 - t * 2.1)

/* ------------------------------------------------------------------ the set: under the skin */

export function drawUnder(p: p5, k: number, t: number): void {
  const g = ctxOf(p)
  const f = frame(p, k)
  if (f.y1 < W - 0.1) return
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const yb = f.y1 + 1
  // The water, from the skin down, its edge the surface's line.
  g.beginPath()
  g.moveTo(x0 * k, yb * k)
  for (let x = x0; x <= x1 + 0.2; x += 0.2) g.lineTo(x * k, skinY(x, t) * k)
  g.lineTo(x1 * k, yb * k)
  g.closePath()
  g.fillStyle = vgrad(g, k, W, W + 9, [
    [0, SEA.shallow],
    [1.5 / 9, SEA.mid],
    [4.5 / 9, SEA.deep],
    [1, SEA.abyss],
  ])
  g.fill()
  g.save()
  g.clip()
  // The light coming down: slanted shafts, moving slowly, gone by the depths.
  for (let i = 0; i < 9; i++) {
    const span = 22
    let sx = (hash(i, 71) - 0.5) * span + Math.sin(t * 0.11 + i * 1.7) * 0.8
    sx = f.cx + ((((sx - f.cx * 0.2 - f.cx) % span) + span * 1.5) % span) - span / 2
    const w = 0.25 + hash(i, 72) * 0.7
    const lean = 0.22
    const len = 6 + hash(i, 73) * 3
    const a = 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.4 + i))
    const gr = g.createLinearGradient(0, W * k, 0, (W + len) * k)
    gr.addColorStop(0, rgba(SEA.shaft, a))
    gr.addColorStop(1, rgba(SEA.shaft, 0))
    g.fillStyle = gr
    poly(g, k, [
      [sx, W],
      [sx + w, W],
      [sx + w * 1.8 + lean * len, W + len],
      [sx + lean * len - w * 0.4, W + len],
    ])
    g.fill()
  }
  // Under the skin: its light, rippling.
  g.fillStyle = vgrad(g, k, W, W + 0.5, [
    [0, rgba(SEA.skin, 0.7)],
    [0.3, rgba(SEA.skin, 0.2)],
    [1, rgba(SEA.skin, 0)],
  ])
  g.fillRect(x0 * k, (W - 0.1) * k, (x1 - x0) * k, 0.6 * k)
  g.strokeStyle = rgba(SEA.skin, 0.35)
  g.lineWidth = Math.max(0.8, 0.02 * k)
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(f.x0) - 1 + hash(i, 74) * (f.x1 - f.x0 + 2) + Math.sin(t * 0.7 + i) * 0.15
    const y = W + 0.05 + hash(i, 75) * 0.25
    g.beginPath()
    g.moveTo(x * k, y * k)
    g.quadraticCurveTo((x + 0.15) * k, (y - 0.04) * k, (x + 0.3 + hash(i, 76) * 0.3) * k, y * k)
    g.stroke()
  }
  // The drift of the sea's snow, slower than him.
  for (let i = 0; i < 90; i++) {
    const span = 16
    const px = ((hash(i, 81) * span + t * 0.05 - f.cx * 0.15) % span + span) % span
    const py = ((hash(i, 82) * 12 + t * 0.06) % 12 + 12) % 12
    const x = f.cx - span / 2 + px
    const y = Math.max(W + 0.2, f.cy - 6) + py
    if (y < W + 0.15) continue
    oval(g, k, x, y, 0.012 + 0.018 * hash(i, 83), 0.012 + 0.018 * hash(i, 83), rgba(SEA.snow, 0.18 + 0.2 * hash(i, 84)))
  }
  // The boat's hull from below: dark on the light.
  drawHullUnderLocal(g, k)
  g.restore()
}

function drawHullUnderLocal(g: C2, k: number): void {
  const { len, draft } = BOAT
  const x0 = BOAT_X0
  g.fillStyle = mix(SEA.deep, SEA.hull, 0.55)
  g.beginPath()
  g.moveTo((x0 + 0.02) * k, (W - 0.1) * k)
  g.lineTo((x0 + len + 0.35) * k, (W - 0.1) * k)
  g.bezierCurveTo((x0 + len) * k, (W + 0.25) * k, (x0 + len - 1.2) * k, (W + draft) * k, (x0 + len - 2.2) * k, (W + draft) * k)
  g.lineTo((x0 + 1.4) * k, (W + draft) * k)
  g.bezierCurveTo((x0 + 0.6) * k, (W + draft) * k, (x0 + 0.1) * k, (W + 0.35) * k, (x0 + 0.02) * k, (W - 0.1) * k)
  g.closePath()
  g.fill()
  g.fillRect((x0 + 0.18) * k, (W + 0.3) * k, 0.1 * k, 0.42 * k)
  g.beginPath()
  g.ellipse((x0 + 0.45) * k, (W + 0.5) * k, 0.06 * k, 0.17 * k, 0, 0, Math.PI * 2)
  g.fill()
  // A soft dark under it: its shadow in the light coming down.
  const gr = g.createLinearGradient(0, (W + draft) * k, 0, (W + draft + 2.5) * k)
  gr.addColorStop(0, rgba(SEA.hull, 0.35))
  gr.addColorStop(1, rgba(SEA.hull, 0))
  g.fillStyle = gr
  poly(g, k, [
    [x0 + 0.4, W + draft],
    [x0 + len - 1.6, W + draft],
    [x0 + len - 0.6, W + draft + 2.5],
    [x0 + 1.4, W + draft + 2.5],
  ])
  g.fill()
}

/* ------------------------------------------------------------------ bubbles */

function bubble(g: C2, k: number, x: number, y: number, r: number, a: number): void {
  if (a <= 0.01) return
  g.strokeStyle = rgba(SEA.bubble, 0.75 * a)
  g.lineWidth = Math.max(0.7, r * 0.35 * k)
  g.beginPath()
  g.arc(x * k, y * k, r * k, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = rgba(SEA.bubble, 0.18 * a)
  g.fill()
  oval(g, k, x - r * 0.35, y - r * 0.35, r * 0.28, r * 0.28, rgba('#FFFFFF', 0.7 * a))
}

/** A bubble let go at `t0` from `p`, its `j`-th: where it is at `t`, and its size; null once it has reached the skin. */
function rising(t: number, t0: number, p: Pt, j: number, seed: number): { x: number; y: number; r: number } | null {
  const u = t - t0
  if (u < 0) return null
  const v = 0.7 + 0.8 * hash(j, seed, 1)
  const y = p[1] - (v * u + 0.35 * u * u)
  if (y < W + 0.04) return null
  const x = p[0] + (hash(j, seed, 2) - 0.5) * 0.2 + 0.06 * Math.sin(u * 7 + j * 1.3) * Math.min(1, u * 2)
  const r = (0.022 + 0.04 * Math.pow(hash(j, seed, 3), 2)) * (1 + 0.12 * (p[1] - y))
  return { x, y, r }
}

export function drawBubbles(p: p5, k: number, t: number): void {
  const g = ctxOf(p)
  // The dive: a column of air along his way in, let go as he passed.
  for (let j = 0; j < 46; j++) {
    const te = BEGIN + 0.02 + Math.pow(j / 46, 1.6) * 1.0
    const at = sinking(te)
    const b = rising(t, te, [at[0] + (hash(j, 3) - 0.5) * 0.3, at[1]], j, 91)
    if (b) bubble(g, k, b.x, b.y, b.r * 1.2, 1 - smooth(t, te + 2.5, te + 4))
  }
  // A breath on each of the strong lows.
  PUFFS.forEach((te, i) => {
    const at = sinking(te)
    const n = 5 + (i % 3)
    for (let j = 0; j < n; j++) {
      const b = rising(t, te + j * 0.035, [at[0] + 0.02, at[1] - R * 0.8], j, 100 + i)
      if (b) bubble(g, k, b.x, b.y, b.r, 1)
    }
  })
  // The haul: air dragged up with him.
  if (t > NET_ON && t < OUT + 2) {
    for (let j = 0; j < 22; j++) {
      const te = NET_ON + (j / 22) * (OUT - NET_ON) * 0.9
      const at = sinking(NET_ON)
      const frac = (te - NET_ON) / (OUT - NET_ON)
      const y0 = at[1] * (1 - frac * frac)
      const b = rising(t, te, [LINE_X + (hash(j, 5) - 0.5) * 0.35, y0 + 0.2], j, 140)
      if (b) bubble(g, k, b.x, b.y, b.r, 1)
    }
  }
}

/* ------------------------------------------------------------------ splashes */

/** A crown of water thrown up where something goes through the skin, at `t0`, `up` the speed it throws. */
function crown(g: C2, k: number, t: number, t0: number, x: number, up: number, n: number, seed: number): void {
  const u = t - t0
  if (u < 0 || u > 1.6) return
  for (let j = 0; j < n; j++) {
    const side = j % 2 ? 1 : -1
    const vx = side * (0.3 + 1.4 * hash(j, seed, 1))
    const vy = -(up * (0.5 + 0.6 * hash(j, seed, 2)))
    const dx = vx * u
    const dy = vy * u + 0.5 * G * u * u
    if (dy > 0.02) continue
    const r = 0.025 + 0.035 * hash(j, seed, 3)
    oval(g, k, x + dx, W + dy, r, r * 1.3, rgba('#EEF3F2', 0.85))
  }
  // The skin, white where it was broken, closing.
  const a = 1 - smooth(u, 0, 1.4)
  oval(g, k, x, W, 0.35 + u * 0.9, 0.06 + u * 0.03, rgba('#E6EEEE', 0.55 * a))
}

export function drawSplashes(p: p5, k: number, t: number): void {
  const g = ctxOf(p)
  crown(g, k, t, BEGIN, -0.5, 3.4, 24, 7)
  crown(g, k, t, OUT, LINE_X, 4.2, 20, 9)
  // Water off him and the net as he hangs, and as he is swung in: drops falling back.
  if (t > OUT && t < DECK_ON + 0.4) {
    for (let j = 0; j < 30; j++) {
      const te = OUT + (j / 30) * (DECK_ON - OUT)
      const u = t - te
      if (u < 0) continue
      const src = hanging(te)
      const y = src[1] + 0.2 + 0.5 * G * u * u
      const floor = src[0] > BOAT_X0 + 0.1 ? W + BOAT.deck : W
      if (y > floor) continue
      oval(g, k, src[0] + (hash(j, 21) - 0.5) * 0.25, y, 0.018, 0.035, rgba('#DCE8EA', 0.75))
    }
  }
}

/** Where he is while hung from the boom (for the water off him). */
function hanging(t: number): Pt {
  if (t < TOP) {
    const u = (t - OUT) / (TOP - OUT)
    const top = boomTip(BOAT_X0, W, 0)[1] + HANG
    return [LINE_X, W + (top - W) * u]
  }
  const [x, y] = boomTip(BOAT_X0, W, swingAt(t))
  return [x, y + HANG]
}

/* ------------------------------------------------------------------ the parcel, going */

export function drawParcelSinking(p: p5, k: number, t: number): void {
  if (t > BEGIN + 9) return
  const g = ctxOf(p)
  const q = parcelAt(t)
  const d = q.p[1] - W
  g.save()
  g.globalAlpha = 1 - smooth(d, 3.5, 9)
  drawParcel(g, k, q.p[0], q.p[1] + 0.115, q.rot)
  // The dark closing over it.
  g.restore()
  if (d > 0.5) {
    const dark = smooth(d, 1.5, 9)
    oval(g, k, q.p[0], q.p[1], 0.24, 0.24, rgba(waterAt(d), dark * 0.85))
  }
}

/* ------------------------------------------------------------------ the shark */

/** The shark's silhouette, nose to the right in its own frame (length 3.4 at s 1), its tail beating slowly. */
function sharkPath(g: C2, k: number, t: number): void {
  const beat = Math.sin(t * 2.4)
  const sq = 1 - 0.35 * Math.abs(beat)
  const tx = (x: number) => (x < -1.35 ? -1.35 + (x + 1.35) * sq : x)
  const P = (x: number, y: number): [number, number] => [tx(x) * k, (y + (x < -1.2 ? beat * 0.06 * (-1.2 - x) : 0)) * k]
  g.beginPath()
  g.moveTo(...P(1.72, 0.03))
  g.bezierCurveTo(...P(1.55, -0.22), ...P(1.0, -0.36), ...P(0.3, -0.38))
  // The dorsal fin.
  g.lineTo(...P(0.05, -0.42))
  g.quadraticCurveTo(...P(-0.08, -0.85), ...P(-0.26, -0.98))
  g.quadraticCurveTo(...P(-0.28, -0.6), ...P(-0.45, -0.32))
  g.bezierCurveTo(...P(-0.85, -0.24), ...P(-1.15, -0.12), ...P(-1.38, -0.07))
  // The tail: its high lobe, the notch, the low.
  g.quadraticCurveTo(...P(-1.6, -0.3), ...P(-1.92, -0.7))
  g.quadraticCurveTo(...P(-1.8, -0.25), ...P(-1.66, 0.0))
  g.quadraticCurveTo(...P(-1.74, 0.18), ...P(-1.86, 0.38))
  g.quadraticCurveTo(...P(-1.6, 0.18), ...P(-1.38, 0.07))
  g.bezierCurveTo(...P(-1.0, 0.14), ...P(-0.75, 0.2), ...P(-0.55, 0.22))
  // The pelvic fin, small; the pectoral, long and swept.
  g.lineTo(...P(-0.62, 0.36))
  g.lineTo(...P(-0.35, 0.25))
  g.lineTo(...P(0.25, 0.3))
  g.quadraticCurveTo(...P(-0.05, 0.62), ...P(-0.32, 0.82))
  g.quadraticCurveTo(...P(0.25, 0.6), ...P(0.62, 0.3))
  g.bezierCurveTo(...P(1.1, 0.26), ...P(1.5, 0.2), ...P(1.72, 0.03))
  g.closePath()
}

export function drawShark(p: p5, k: number, t: number, front: boolean): void {
  const s = sharkAt(t)
  if (!s || s.front !== front) return
  const g = ctxOf(p)
  g.save()
  g.translate(s.x * k, s.y * k)
  g.scale(s.dir * s.s, s.s)
  const d = s.y - W
  // Far is faint, nearly the water; near is the darkest thing in the sea.
  const col = mix(waterAt(d), SEA.shark, s.a)
  if (s.a < 0.6) g.filter = `blur(${Math.max(1, 0.03 * k).toFixed(1)}px)`
  sharkPath(g, k, t)
  g.fillStyle = col
  g.fill()
  // A trace of the light along its back, from above.
  if (s.a > 0.6) {
    g.save()
    sharkPath(g, k, t)
    g.clip()
    g.fillStyle = vgrad(g, k, -1, 0.4, [
      [0, rgba(SEA.shallow, 0.35 * s.a)],
      [0.55, rgba(SEA.shallow, 0)],
    ])
    g.fillRect(-2.2 * k, -1 * k, 4.2 * k, 1.5 * k)
    g.restore()
  }
  g.restore()
}

/* ------------------------------------------------------------------ the net and its line */

/** The net's ring: where it is (its centre), from hanging under the boom, down into the water, to him, and up with him. */
export function netAt(t: number, walter: Pt): Pt | null {
  const tip = boomTip(BOAT_X0, W, swingAt(t))
  const hangs: Pt = [tip[0], tip[1] + HANG]
  const drop = NET_IN - 0.62
  if (t < drop) return hangs
  if (t < NET_IN) {
    const u = t - drop
    return [hangs[0], hangs[1] + (W - hangs[1]) * Math.min(1, (0.5 * G * u * u) / (W - hangs[1]))]
  }
  if (t < NET_ON) {
    const to = sinking(NET_ON)
    const u = (t - NET_IN) / (NET_ON - NET_IN)
    const e = 1 - (1 - u) * (1 - u)
    return [LINE_X + (to[0] - LINE_X) * e, W + (to[1] - W) * e]
  }
  if (t < OPENS) return walter
  // Open and empty, hanging from the boom over the deck.
  return hangs
}

export function drawLine(p: p5, k: number, t: number, walter: Pt): void {
  const n = netAt(t, walter)
  if (!n) return
  const g = ctxOf(p)
  const tip = boomTip(BOAT_X0, W, swingAt(t))
  const taut = t > NET_ON + 0.25
  g.strokeStyle = rgba(SEA.line, n[1] > W ? 0.7 : 0.95)
  g.lineWidth = Math.max(1, 0.025 * k)
  g.beginPath()
  g.moveTo(tip[0] * k, tip[1] * k)
  const top: Pt = [n[0], n[1] - 0.3]
  if (taut) g.lineTo(top[0] * k, top[1] * k)
  else g.quadraticCurveTo(((tip[0] + top[0]) / 2 - 0.15) * k, ((tip[1] + top[1]) / 2) * k, top[0] * k, top[1] * k)
  g.stroke()
}

/** The net round him: a ring, and the mesh bag hanging from it (in front of him while it holds him). */
export function drawNet(p: p5, k: number, t: number, walter: Pt): void {
  const n = netAt(t, walter)
  if (!n) return
  const g = ctxOf(p)
  const holding = t >= NET_ON && t < OPENS
  const open = t >= OPENS ? smooth(t, OPENS, OPENS + 0.25) : 0
  const ry = n[1] - 0.3
  const wet = n[1] > W
  const col = rgba(SEA.net, wet ? 0.6 : 0.85)
  g.strokeStyle = col
  g.lineWidth = Math.max(1, 0.03 * k)
  // The ring, a little foreshortened.
  g.beginPath()
  g.ellipse(n[0] * k, ry * k, 0.27 * k, 0.06 * k, 0, 0, Math.PI * 2)
  g.stroke()
  // The bag: its sides down from the ring, gathered under him (or hanging open, split).
  const depth = holding ? 0.5 : 0.55
  g.lineWidth = Math.max(0.7, 0.014 * k)
  for (let i = 0; i <= 6; i++) {
    const u = i / 6
    const sx = n[0] - 0.27 + 0.54 * u
    const bx = n[0] + (u - 0.5) * (holding ? 0.22 : 0.3) + (u - 0.5) * open * 0.6
    g.beginPath()
    g.moveTo(sx * k, ry * k)
    g.quadraticCurveTo((sx + (bx - sx) * 0.2) * k, (ry + depth * 0.7) * k, bx * k, (ry + depth) * k)
    g.stroke()
  }
  for (let j = 1; j <= 3; j++) {
    const v = j / 4
    const w = 0.27 * (1 - v * 0.55) + open * v * 0.25
    g.beginPath()
    g.ellipse(n[0] * k, (ry + depth * v) * k, w * k, 0.04 * k, 0, 0, Math.PI)
    g.stroke()
  }
}

/* ------------------------------------------------------------------ the deck: the cake, the wrapper, the hand */

const DECK_TOP = W + BOAT.deck
const DECK_BACK = W + BOAT.deckBack

/**
 * The fisherman: a dark oilskin against the white wheelhouse, drawn, never a ball. He comes out round the house as
 * Walter is swung in, holding the cake; stoops on bar 50 to set it down beside him; straightens, and stays to watch.
 */
const MAN_X = BOAT_X0 + BOAT.house.x0 + 0.78
const MAN_FOOT = DECK_BACK + 0.07
/** Where he stands: out from behind the house's far end, a little bob in each step. */
const manX = (t: number): number => MAN_X + 1.5 * (1 - smooth(t, DECK_ON - 0.9, DECK_ON + 0.5))
const walking = (t: number): number => (t > DECK_ON - 0.9 && t < DECK_ON + 0.5 ? 1 : 0)
/** How far he is stooped, 0 standing to 1 down at the deck. */
const stoop = (t: number): number => smooth(t, CAKE - 1.0, CAKE - 0.08) * (1 - smooth(t, CAKE + 0.45, CAKE + 1.5))

interface Man {
  hip: Pt
  shoulder: Pt
  head: Pt
  lean: number
}
function manAt(t: number): Man {
  const b = stoop(t)
  const x = manX(t)
  const bob = walking(t) * 0.025 * Math.abs(Math.sin((t - DECK_ON) * 9))
  const hip: Pt = [x + 0.04 * b, MAN_FOOT - 0.74 + 0.16 * b - bob]
  const lean = 1.15 * b + 0.06
  const shoulder: Pt = [hip[0] - 0.6 * Math.sin(lean), hip[1] - 0.6 * Math.cos(lean)]
  const hl = lean + 0.25 * b
  const head: Pt = [shoulder[0] - 0.21 * Math.sin(hl), shoulder[1] - 0.21 * Math.cos(hl)]
  return { hip, shoulder, head, lean }
}

/** Where the cake (its foot's middle) is: held at his chest, then set down on bar 50. */
const HELD_DX = -0.34
const HELD_DY = 0.4
export function cakeAt(t: number): Pt {
  const m = manAt(Math.min(t, CAKE - 1.0))
  const from: Pt = [m.shoulder[0] + HELD_DX, m.shoulder[1] + HELD_DY]
  const on: Pt = [CAKE_X, DECK_TOP - 0.14]
  const u = smooth(t, CAKE - 1.0, CAKE)
  // An easing out that lands softly: most of the way quickly, the last of it slowly.
  const e = 1 - Math.pow(1 - u, 2.2)
  return [from[0] + (on[0] - from[0]) * e, from[1] + (on[1] - from[1]) * e]
}

export function drawDeckThings(p: p5, k: number, t: number): void {
  if (t < DECK_ON - 0.9) return
  const g = ctxOf(p)
  const c = cakeAt(t)
  const down = t >= CAKE
  // The wrapper: carried under the cake, then lying on the deck, Sean's notes on it.
  if (down) drawWrapper(g, k, t)
  else {
    g.fillStyle = SEA.paper
    poly(g, k, [
      [c[0] - 0.5, c[1] + 0.06],
      [c[0] + 0.5, c[1] + 0.03],
      [c[0] + 0.42, c[1] - 0.02],
      [c[0] - 0.42, c[1]],
    ])
    g.fill()
  }
  drawMan(g, k, t, c)
  drawCake(g, k, c[0], c[1])
  if (t < CAKE + 0.45) {
    const h: Pt = [c[0] + 0.16, c[1] - 0.2]
    g.fillStyle = SEA.skin2
    g.beginPath()
    g.ellipse(h[0] * k, h[1] * k, 0.085 * k, 0.065 * k, -0.4, 0, Math.PI * 2)
    g.fill()
  }
}

function drawWrapper(g: C2, k: number, t: number): void {
  const y0 = DECK_TOP - 0.01
  const y1 = DECK_BACK + 0.06
  const skew = 0.14
  // The paper on the deck, its far corners a little lifted, and its shade.
  g.fillStyle = SEA.paperShade
  poly(g, k, [
    [WRAP.x0, y0 + 0.012],
    [WRAP.x1, y0 + 0.012],
    [WRAP.x1 + skew, y1 + 0.012],
    [WRAP.x0 + skew, y1 + 0.012],
  ])
  g.fill()
  g.fillStyle = SEA.paper
  poly(g, k, [
    [WRAP.x0, y0],
    [WRAP.x1, y0],
    [WRAP.x1 + skew + 0.02, y1 - 0.02],
    [WRAP.x0 + skew - 0.03, y1],
  ])
  g.fill()
  // Sean's notes: lines of a hand, and no letters.
  g.save()
  g.transform(1, 0, -skew / (y0 - y1), 1, (skew / (y0 - y1)) * y0 * k, 0)
  scribble(g, k, WRAP.x0 + 0.07, y1 + 0.03, CAKE_X - 0.38 - WRAP.x0, y0 - y1 - 0.06, 4, 7, SEA.pencil, 0.75, Math.max(0.6, 0.012 * k))
  scribble(g, k, CAKE_X + 0.36, y1 + 0.05, WRAP.x1 - CAKE_X - 0.42, (y0 - y1) * 0.6, 2, 13, SEA.pencil, 0.6, Math.max(0.6, 0.012 * k))
  g.restore()
  // A drop off him, on the paper: a dark spot spreading.
  if (t >= DRIP) {
    const u = smooth(t, DRIP, DRIP + 0.6)
    oval(g, k, WRAP.x0 + 0.1, y0 - 0.05, 0.03 + 0.04 * u, 0.012 + 0.014 * u, rgba('#9E9580', 0.8))
  }
  if (t > DRIP - 0.35 && t < DRIP) {
    const u = (t - (DRIP - 0.35)) / 0.35
    oval(g, k, REST_X + 0.11 + u * 0.06, DECK_Y - 0.02 + u * 0.12, 0.016, 0.026, rgba('#DCE8EA', 0.9))
  }
}

function drawCake(g: C2, k: number, x: number, y: number): void {
  const r = 0.3
  const h = 0.17
  const ry = 0.075
  // Its side, golden-brown, darker at the foot; its glazed top, and slices of clementine on it.
  g.fillStyle = vgrad(g, k, y - h, y, [
    [0, SEA.cakeSide],
    [1, SEA.cakeDark],
  ])
  g.beginPath()
  g.moveTo((x - r) * k, (y - h) * k)
  g.lineTo((x - r) * k, y * k)
  g.ellipse(x * k, y * k, r * k, ry * k, 0, Math.PI, 0, true)
  g.lineTo((x + r) * k, (y - h) * k)
  g.closePath()
  g.fill()
  oval(g, k, x, y - h, r, ry, SEA.cake)
  oval(g, k, x - 0.06, y - h - 0.012, r * 0.7, ry * 0.55, rgba('#F6C27A', 0.35))
  for (const [dx, dy] of [
    [-0.13, 0.01],
    [0.03, -0.025],
    [0.15, 0.015],
  ] as [number, number][]) {
    oval(g, k, x + dx, y - h + dy, 0.065, 0.026, SEA.slice)
    g.strokeStyle = rgba('#FFE2B0', 0.8)
    g.lineWidth = Math.max(0.5, 0.008 * k)
    g.beginPath()
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI
      g.moveTo((x + dx) * k, (y - h + dy) * k)
      g.lineTo((x + dx + Math.cos(a) * 0.06) * k, (y - h + dy + Math.sin(a) * 0.022) * k)
    }
    g.stroke()
  }
}

/** An arm from the shoulder to the hand, bent at the elbow (away from the body) when the hand is near. */
function arm(g: C2, k: number, from: Pt, to: Pt, w: number): void {
  const L = 0.44
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const d = Math.hypot(dx, dy)
  const half = Math.min(d / 2, L)
  const out = Math.sqrt(Math.max(0, L * L - half * half))
  const elbow: Pt = [from[0] + dx / 2 + (dy / d) * out, from[1] + dy / 2 - (dx / d) * out]
  g.lineWidth = w * k
  g.beginPath()
  g.moveTo(from[0] * k, from[1] * k)
  g.lineTo(elbow[0] * k, elbow[1] * k)
  g.lineTo(to[0] * k, to[1] * k)
  g.stroke()
}

function drawMan(g: C2, k: number, t: number, c: Pt): void {
  if (t < DECK_ON - 0.9) return
  const m = manAt(t)
  const holding = t < CAKE + 0.45
  // Where his hands are: on the cake while he has it, then back at his sides.
  const rest: Pt = [m.shoulder[0] - 0.08, m.shoulder[1] + 0.62]
  const onCake: Pt = [c[0] + 0.16, c[1] - 0.2]
  const u = smooth(t, CAKE + 0.45, CAKE + 1.3)
  const hand: Pt = holding ? onCake : [onCake[0] + (rest[0] - onCake[0]) * u, onCake[1] + (rest[1] - onCake[1]) * u]
  const far: Pt = holding ? [c[0] + 0.3, c[1] - 0.12] : [hand[0] + 0.12, hand[1] - 0.02]
  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  // The far arm, behind him.
  g.strokeStyle = mix(SEA.sleeve, '#000000', 0.25)
  arm(g, k, [m.shoulder[0] + 0.1, m.shoulder[1] + 0.03], far, 0.13)
  // Boots, and the legs of the oilskin.
  const step = walking(t) * 0.09 * Math.sin((t - DECK_ON) * 9)
  g.strokeStyle = mix(SEA.sleeve, '#000000', 0.35)
  g.lineWidth = 0.17 * k
  for (const sx of [-0.09, 0.09]) {
    g.beginPath()
    g.moveTo((m.hip[0] + sx * 0.6) * k, m.hip[1] * k)
    g.lineTo((m.hip[0] + sx + (sx < 0 ? step : -step)) * k, (MAN_FOOT - 0.08) * k)
    g.stroke()
  }
  g.fillStyle = '#1F2622'
  for (const sx of [-0.09, 0.09]) {
    const fx = m.hip[0] + sx + (sx < 0 ? step : -step)
    poly(g, k, [
      [fx - 0.13, MAN_FOOT],
      [fx + 0.09, MAN_FOOT],
      [fx + 0.08, MAN_FOOT - 0.2],
      [fx - 0.07, MAN_FOOT - 0.2],
    ])
    g.fill()
  }
  // The coat: broad, its hem flared over the hips.
  g.strokeStyle = SEA.sleeve
  g.lineWidth = 0.44 * k
  g.beginPath()
  g.moveTo(m.hip[0] * k, m.hip[1] * k)
  g.lineTo(m.shoulder[0] * k, m.shoulder[1] * k)
  g.stroke()
  g.fillStyle = SEA.sleeve
  poly(g, k, [
    [m.hip[0] - 0.26, m.hip[1] + 0.12],
    [m.hip[0] + 0.27, m.hip[1] + 0.12],
    [m.hip[0] + 0.2, m.hip[1] - 0.2],
    [m.hip[0] - 0.2, m.hip[1] - 0.2],
  ])
  g.fill()
  // A wet sheen down his back.
  g.strokeStyle = rgba('#A8B39A', 0.28)
  g.lineWidth = Math.max(0.6, 0.025 * k)
  g.beginPath()
  g.moveTo((m.hip[0] + 0.17) * k, (m.hip[1] - 0.05) * k)
  g.lineTo((m.shoulder[0] + 0.17 * Math.cos(m.lean)) * k, (m.shoulder[1] + 0.05 - 0.17 * Math.sin(m.lean)) * k)
  g.stroke()
  // His head, a beard, and a knitted cap.
  oval(g, k, m.head[0], m.head[1], 0.14, 0.15, '#2A2F2A')
  g.fillStyle = SEA.cuff
  g.beginPath()
  g.ellipse(m.head[0] * k, m.head[1] * k, 0.15 * k, 0.16 * k, -m.lean, Math.PI, 0)
  g.fill()
  // The near arm, to the hand.
  g.strokeStyle = SEA.sleeve
  arm(g, k, m.shoulder, hand, 0.15)
  g.fillStyle = SEA.skin2
  g.beginPath()
  g.ellipse(hand[0] * k, hand[1] * k, 0.085 * k, 0.065 * k, -0.4, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** Light from above through the surface onto him and the cake: a little brighter round the deck once he is up. */
export function drawDeckLight(p: p5, k: number, t: number): void {
  if (t < DECK_ON - 1) return
  const g = ctxOf(p)
  glow(g, k, REST_X + 0.5, DECK_Y, 1.6, '#FFFFFF', 0.06 * smooth(t, DECK_ON, BY_CAKE))
}

export { TOP }

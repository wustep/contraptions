import { clamp01, fill, hash, mix, poly, smooth, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { horizonOf } from '../../world/sea'
import { skyAt } from '../../world/sky'
import { k } from '../giants/beats'
import { ASH, ASH_RIM, BEACH, CHARGE_BY_ROW, EDGE, LANDED, ROWS, SHADES, TRENCH, TRENCH_END, charged, upOf } from './plan'

/**
 * The shore of the dead, drawn: a beach of black sand going back from the water's edge to a long black ridge, and black
 * stacks standing in the sea off its east end; the trench he cuts along the water's edge, dark red in the black; the
 * hands that come up out of it; and the dead, a crowd going back over the sand into the dark, coming up out of it and
 * surging forward together.
 *
 * The front two ranks are balls of the cast (`plan.ts`, SHADE_ACTORS); every head behind them is drawn here, as balls
 * of the same ash, smaller the further back, and sinking into the colour of the sand as they get too small to be one.
 */

const SAND = '#1F1E1C'
const WET = '#141413'
const ROCK = '#151514'
const BLOOD = '#4B1D19'
const R = 0.13

/** The haze at `t`: what the far shore goes pale into. */
const hazeOf = (t: number): string => mix(skyAt(t).low, '#716C63', 0.35)

/**
 * How much of the shore there is at `x`, 0 off its ends to 1 along it: at each end the water's edge goes back to the
 * horizon in a straight line, as a coast going away does, not a curl.
 */
const along = (x: number): number => clamp01((x - BEACH.x0) / 10) * clamp01((BEACH.x1 - x) / 10)

/**
 * The beach: its ground from the water's edge back to the horizon, its two ends curving away from the water to the
 * horizon so it reads as a long coast going off into the haze; the far hills and dunes; the rocks at its ends.
 */
export function drawShore(g: Paint): void {
  const { ctx, t, view } = g
  const a = Math.max(BEACH.x0 - 2, view.x0 - 1)
  const b = Math.min(BEACH.x1 + 2, view.x1 + 1)
  if (b <= a) return
  const hy = horizonOf(view)
  const haze = hazeOf(t)
  // The front edge: the water's edge along the beach, going back to the horizon at both ends.
  const front = (x: number) => hy + (EDGE - hy) * along(x)
  const step = Math.max(0.25, (b - a) / 120)
  ctx.beginPath()
  ctx.moveTo(a, hy)
  for (let x = a; x <= b + step; x += step) ctx.lineTo(Math.min(b, x), front(Math.min(b, x)))
  ctx.lineTo(b, hy)
  ctx.closePath()
  const gr = ctx.createLinearGradient(0, EDGE, 0, hy)
  gr.addColorStop(0, SAND)
  gr.addColorStop(0.7, mix(SAND, haze, 0.18))
  gr.addColorStop(1, mix(SAND, haze, 0.62))
  ctx.fillStyle = gr
  ctx.fill()
  // The wet sand at the water's edge, a little darker.
  ctx.beginPath()
  for (let x = a; x <= b + step; x += step) {
    const y = front(Math.min(b, x))
    if (x === a) ctx.moveTo(x, y)
    else ctx.lineTo(Math.min(b, x), y)
  }
  for (let x = b; x >= a - step; x -= step) {
    const xx = Math.max(a, x)
    ctx.lineTo(xx, front(xx) - 0.07 * along(xx))
  }
  ctx.closePath()
  fill(ctx, WET)
  drawRidge(g, haze)
  drawStacks(g, haze)
}

/** The ridge behind the beach: how far back it stands, and its skyline as [layer x, height] (cells). */
export const RIDGE_D = 48
const RIDGE: Pt[] = [
  [BEACH.x0 - 26, 0],
  [BEACH.x0 - 21, 4.2],
  [BEACH.x0 - 16, 5.4],
  [BEACH.x0 - 4, 4.6],
  [BEACH.x0 + 10, 6.8],
  [BEACH.x0 + 19, 8.6],
  [BEACH.x0 + 27, 6.2],
  [BEACH.x0 + 44, 5.6],
  [BEACH.x0 + 58, 7.8],
  [BEACH.x0 + 66, 6.0],
  [BEACH.x1 + 4, 5.0],
  [BEACH.x1 + 16, 2.8],
  [BEACH.x1 + 24, 0],
]
/**
 * A long black ridge along the back of the beach, a few broad summits, its ends falling to the sea as cliffs: one dark
 * shape against the haze, so the shore has a back, and the dead somewhere to go back into.
 */
function drawRidge(g: Paint, haze: string): void {
  const { ctx, view } = g
  const L = layer(view, RIDGE_D)
  const lx0 = view.cx + (view.x0 - 1 - view.cx) / L.s
  const lx1 = view.cx + (view.x1 + 1 - view.cx) / L.s
  if (RIDGE[RIDGE.length - 1][0] < lx0 || RIDGE[0][0] > lx1) return
  ctx.beginPath()
  ctx.moveTo(L.x(RIDGE[0][0]), L.y(0.1))
  for (const [x, h] of RIDGE) ctx.lineTo(L.x(x), L.y(-h))
  ctx.lineTo(L.x(RIDGE[RIDGE.length - 1][0]), L.y(0.1))
  ctx.closePath()
  fill(ctx, mix(SAND, haze, 0.3))
}

/** The stacks off the beach's east end: [layer x, depth, height, width], the furthest first. */
const STACKS: [number, number, number, number][] = [
  [BEACH.x0 - 2.5, 16, 4.6, 1.5],
  [BEACH.x0 - 7, 10, 6.4, 1.8],
  [BEACH.x0 - 4, 4.5, 3.4, 1.2],
]

/** Black stacks standing in the sea, each a pillar with a few flat faces, paler the further back. */
function drawStacks(g: Paint, haze: string): void {
  const { ctx, view } = g
  for (const [x, d, h, w] of STACKS) {
    const L = layer(view, d)
    const sx = L.x(x)
    if (sx + w * L.s < view.x0 - 1 || sx - w * L.s > view.x1 + 1) continue
    const P = (u: number, v: number): Pt => [L.x(x + u * w), L.y(v * h)]
    poly(ctx, [P(-0.5, 0.02), P(-0.44, -0.55), P(-0.3, -0.9), P(-0.1, -1), P(0.18, -0.96), P(0.34, -0.74), P(0.42, -0.4), P(0.5, 0.02)])
    fill(ctx, mix(ROCK, haze, 0.08 + d / 70))
  }
}

/** The trench: cut behind him as he rolls, a dark red furrow along the water's edge. */
export function drawTrench(g: Paint): void {
  const { ctx, t, view } = g
  if (t < LANDED || TRENCH.x0 > view.x1 + 1 || TRENCH.x1 < view.x0 - 1) return
  const u = clamp01((t - LANDED) / (TRENCH_END - LANDED))
  const end = TRENCH.x0 + (TRENCH.x1 - TRENCH.x0) * u * u * (3 - 2 * u)
  if (end - TRENCH.x0 < 0.05) return
  const y = ROWS[0].ground + 0.01
  const half = (x: number) => 0.045 * Math.min(1, (x - TRENCH.x0) / 0.6, (end - x) / 0.35 + 0.4)
  ctx.beginPath()
  const n = 24
  for (let i = 0; i <= n; i++) {
    const x = TRENCH.x0 + ((end - TRENCH.x0) * i) / n
    if (i === 0) ctx.moveTo(x, y - half(x))
    else ctx.lineTo(x, y - half(x))
  }
  for (let i = n; i >= 0; i--) {
    const x = TRENCH.x0 + ((end - TRENCH.x0) * i) / n
    ctx.lineTo(x, y + half(x) * 0.6)
  }
  ctx.closePath()
  fill(ctx, BLOOD)
}

/**
 * The hands that come up before each of the front ranks: two pale hands, open, breaking the sand a little apart, all
 * on the one beat, and going down again on either side of the head that comes up between them.
 */
export function drawHands(g: Paint): void {
  const { ctx, t, view } = g
  ctx.beginPath()
  let any = false
  for (const sh of SHADES) {
    // The first rank's hands only: the second's would be a second row of them behind, and are hidden by the first.
    const s = t - sh.hands
    if (sh.row !== 0 || s < 0 || t > sh.rise + 0.7) continue
    const row = ROWS[sh.row]
    const x = sh.x + CHARGE_BY_ROW[sh.row] * charged(t, sh.lag)
    if (x < view.x0 - 1 || x > view.x1 + 1) continue
    const size = row.scale
    const h = (0.5 + 0.12 * Math.sin(sh.x * 3.1)) * size * smooth(s, 0, 0.22) * (1 - upOf(t - sh.rise))
    if (h < 0.006) continue
    const open = smooth(s, 0.08, 0.5)
    for (const side of [-1, 1] as const) {
      const hx = x + side * (0.13 + 0.06 * open) * size
      const lean = side * (0.12 + 0.22 * open)
      hand(ctx, hx, row.ground, h, 0.22 * size, lean, open)
    }
    any = true
  }
  if (!any) return
  fill(ctx, ASH)
  stroke(g, ASH_RIM, 2.2)
}

/** One hand, reaching up from `x, ground`, `h` tall: a wrist, a palm, four fingers spread by `open`, and a thumb. */
function hand(ctx: CanvasRenderingContext2D, x: number, ground: number, h: number, w: number, lean: number, open: number): void {
  const c = Math.cos(lean)
  const sn = Math.sin(lean)
  // In the hand's own frame: up is -y, across is x; turned by `lean` about the wrist.
  const P = (u: number, v: number): [number, number] => [x + u * c - v * sn, ground + u * sn + v * c]
  const wrist = w * 0.32
  const palm = h * 0.5
  const pts: [number, number][] = [P(-wrist, 0), P(-w * 0.45, -palm * 0.75)]
  // The thumb, out to one side.
  pts.push(P(-w * 0.75 - 0.05 * open * w, -palm * 0.95), P(-w * 0.6, -palm * 1.05))
  // Four fingers, each a narrow tongue, fanned.
  for (let f = 0; f < 4; f++) {
    const fx = -w * 0.42 + (w * 0.84 * f) / 3
    const spread = (f - 1.5) * 0.12 * open * w
    const len = h * (0.42 + 0.08 * (f === 1 || f === 2 ? 1 : 0))
    pts.push(P(fx - w * 0.09, -palm), P(fx + spread - w * 0.07, -palm - len), P(fx + spread + w * 0.07, -palm - len), P(fx + w * 0.09, -palm))
  }
  pts.push(P(w * 0.45, -palm * 0.75), P(wrist, 0))
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
}

/* ------------------------------------------------------------------ the army behind */

/** How far back the dead go behind the front two ranks: the nearest and the furthest depth (cells behind the water's edge), to the ridge's foot. */
const NEAR = 1.8
const FAR = RIDGE_D - 2
/** The crowd in depth lanes, each its own colour; within a lane every head has its own depth, so there are no rows. */
const LANES = 16
/** A head may stand no nearer on the screen than this: the front two ranks' ground is in front of it. */
const LIMIT = -0.98
/** Along the shore, a head every this much (in its own depth's terms), in each lane: closer than a head is wide, so a lane is one body with heads along its top, never a string of marks. */
const SPACING = 0.13

/**
 * The army: the dead behind the front two ranks, going back over the black sand to the ridge. Not ranks: every head
 * stands at its own depth, so in the frame they are a crowd thickening into the distance, each smaller and higher the
 * further back it is, never lines of marks. How much of the ash shows goes by how big a head is in the frame: the
 * biggest are drawn with their rims, as the front ranks are, and the smaller sink into the colour of the sand, so where
 * a head would be too small to be one it is the dark of the shore itself and never a speck. They come up out of the
 * ground near ones first, from the trench outwards, and go forward with the surges of the charge.
 */
export function drawRanks(g: Paint): void {
  const { ctx, t, view } = g
  if (t < k(67.5)) return
  const haze = hazeOf(t)
  const trench = (TRENCH.x0 + TRENCH.x1) / 2
  // Only on the land: the beach as it is drawn (its ends curving away to the horizon), and over it, where it runs whole,
  // the sky their heads stand against. Off its ends, out over the water, there is no one.
  const hy = horizonOf(view)
  const a = Math.max(BEACH.x0, view.x0 - 1)
  const b = Math.min(BEACH.x1, view.x1 + 1)
  if (b <= a) return
  const step = Math.max(0.25, (b - a) / 120)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(a, hy)
  for (let x = a; x <= b + step; x += step) {
    const xx = Math.min(b, x)
    ctx.lineTo(xx, hy + (EDGE - hy) * along(xx))
  }
  ctx.lineTo(b, hy)
  ctx.closePath()
  const w0 = Math.max(a, BEACH.x0 + 7)
  const w1 = Math.min(b, BEACH.x1 - 7)
  if (w1 > w0) ctx.rect(w0, view.y0 - 1, w1 - w0, hy - view.y0 + 1.01)
  ctx.clip()
  const ln = Math.log(FAR / NEAR)
  for (let lane = LANES - 1; lane >= 0; lane--) {
    // The lane's middle depth sets its colour and whether it is drawn at all.
    const dMid = NEAR * Math.exp(((lane + 0.5) / LANES) * ln)
    const Lm = layer(view, dMid)
    const lit = smooth((R * 0.86 * Lm.s) / view.h, 1 / 420, 1 / 160)
    if (lit < 0.03) continue
    const f = (lane + 0.5) / LANES
    const groundC = mix(SAND, haze, 0.06 + 0.2 * f)
    const sink = 1 - lit * (1 - 0.6 * f)
    // Its span along the shore, ragged at the ends, and wider the further back (so the crowd fills the shore going away),
    // most of it behind him, the way they will come.
    const spread = Math.pow(dMid, 0.8)
    const x0 = trench - 13 - 1.6 * spread - 3 * hash(lane, 71)
    const x1 = trench + 6 + 0.7 * spread + 3 * hash(lane, 72)
    const surge = (CHARGE_BY_ROW[1] - 4 * f) * charged(t, 0.6 * f)
    // The layer x the frame shows at this depth, so only the heads in view are visited.
    const lx0 = Math.max(x0 + surge, view.cx + (view.x0 - 1 - view.cx) / Lm.s - 2)
    const lx1 = Math.min(x1 + surge, view.cx + (view.x1 + 1 - view.cx) / Lm.s + 2)
    ctx.beginPath()
    let any = false
    for (let j = Math.floor((lx0 - surge) / SPACING) - 1; j <= Math.ceil((lx1 - surge) / SPACING) + 1; j++) {
      // Its own depth inside the lane, and its own place along it.
      const u = (lane + hash(j, lane, 61)) / LANES
      const d = NEAR * Math.exp(u * ln)
      const L = layer(view, d)
      const home = j * SPACING + (hash(j, lane, 62) - 0.5) * SPACING
      if (home < x0 || home > x1) continue
      const x = L.x(home + surge * (0.97 + 0.06 * hash(j, lane, 66)))
      if (x < view.x0 - 1 || x > view.x1 + 1) continue
      const ground = L.y(0)
      const keep = 1 - smooth(ground, LIMIT - 0.22, LIMIT)
      if (keep <= 0.002) continue
      // Up out of the ground: the near first, then back and back, each from the trench outwards.
      const rise = k(68) + 2.4 * u + 1.4 * Math.min(1, Math.abs(home - trench) / 30)
      const up = keep * smooth(t, rise, rise + 0.7 + 0.3 * hash(j, lane, 63))
      if (up <= 0.001) continue
      const size = R * 0.86 * L.s * (0.9 + 0.2 * hash(j, lane, 64)) * up
      const y = ground - size
      ctx.moveTo(x + size, y)
      ctx.arc(x, y, size, 0, Math.PI * 2)
      any = true
    }
    if (!any) continue
    // The rims first and the fills over them, so where two overlap only the outside of the pair is outlined; only the
    // biggest have rims at all, which on small heads are only more marks.
    if (lit > 0.5) stroke(g, mix(ASH_RIM, groundC, sink), 4.2 * 0.86 * Lm.s)
    fill(ctx, mix(mix(ASH, haze, 0.12), groundC, sink))
  }
  ctx.restore()
}

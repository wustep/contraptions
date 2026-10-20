import { clamp01, fill, hash, mix, poly, smooth, stroke, type Paint } from '../../draw'
import { layer } from '../../world/depth'
import { horizonOf } from '../../world/sea'
import { skyAt } from '../../world/sky'
import { k } from '../giants/beats'
import { ASH, ASH_RIM, BEACH, CHARGE_BY_ROW, EDGE, LANDED, ROWS, SHADES, TRENCH, TRENCH_END, charged, upOf } from './plan'

/**
 * The shore of the dead, drawn: a beach of black sand going back from the water's edge to the horizon, low dunes and
 * far ash-grey hills at its back, black rocks at both ends; the trench he cuts along the water's edge, dark red in the
 * black; the hands that come up out of it; and the dead, rank behind rank, back into the haze, each rank coming up
 * out of its own ground and surging forward with the rest.
 *
 * The front two ranks are balls of the cast (`plan.ts`, SHADE_ACTORS); every rank behind them is drawn here, as balls
 * of the same ash, smaller and paler the further back, cut off at their ground line while they come up out of it.
 */

const SAND = '#1F1E1C'
const WET = '#141413'
const ROCK = '#151514'
const BLOOD = '#4B1D19'
const R = 0.13

/** The haze at `t`: what the far shore goes pale into. */
const hazeOf = (t: number): string => mix(skyAt(t).low, '#716C63', 0.35)

/** How much of the shore there is at `x`, 0 off its ends to 1 along it. */
const along = (x: number): number => smooth(x, BEACH.x0, BEACH.x0 + 7) * (1 - smooth(x, BEACH.x1 - 7, BEACH.x1))

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
  // Dunes along the back of the beach, and the hills beyond them, each paler.
  for (const [d, h, pale, wave] of [
    [140, 4.2, 0.8, 0.05],
    [46, 2.2, 0.58, 0.11],
  ] as const) {
    const L = layer(view, d)
    const lx0 = view.cx + (view.x0 - view.cx) / L.s
    const lx1 = view.cx + (view.x1 - view.cx) / L.s
    const la = Math.max(BEACH.x0 - 10, lx0 - 2)
    const lb = Math.min(BEACH.x1 + 10, lx1 + 2)
    if (lb <= la) continue
    const ls = Math.max(0.6, (lb - la) / 90)
    ctx.beginPath()
    ctx.moveTo(L.x(la), L.y(0.1))
    for (let x = la; x <= lb + ls; x += ls) {
      const e = smooth(x, BEACH.x0 - 10, BEACH.x0 + 6) * (1 - smooth(x, BEACH.x1 - 6, BEACH.x1 + 10))
      ctx.lineTo(L.x(x), L.y(-h * e * (0.6 + 0.4 * Math.sin(x * wave + d))))
    }
    ctx.lineTo(L.x(lb + ls), L.y(0.1))
    ctx.closePath()
    fill(ctx, mix(SAND, haze, pale))
  }
  // Black rocks at both ends, at the water.
  for (const [x, w, h] of [
    [BEACH.x0 + 3.2, 1.6, 0.9],
    [BEACH.x0 + 5.0, 0.9, 0.5],
    [BEACH.x1 - 4.4, 1.9, 1.1],
    [BEACH.x1 - 2.4, 1.1, 0.6],
  ] as const) {
    if (x + w < view.x0 || x - w > view.x1) continue
    const y = EDGE + 0.02
    poly(ctx, [[x - w / 2, y], [x - w * 0.35, y - h * 0.7], [x - w * 0.05, y - h], [x + w * 0.3, y - h * 0.8], [x + w / 2, y]])
    fill(ctx, ROCK)
    stroke(g, '#0B0B0A', 2)
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
 * The hands that come up before each of the front ranks: two pale hands, open, reaching up out of the sand a little
 * apart, and going down again on either side of the head that comes up between them.
 */
export function drawHands(g: Paint): void {
  const { ctx, t, view } = g
  ctx.beginPath()
  let any = false
  for (const sh of SHADES) {
    const s = t - sh.rise
    if (s < 0 || s > 1.3) continue
    const row = ROWS[sh.row]
    const x = sh.x + CHARGE_BY_ROW[sh.row] * charged(t, sh.lag)
    if (x < view.x0 - 1 || x > view.x1 + 1) continue
    const size = row.scale
    const h = 0.56 * size * smooth(s, 0, 0.45) * (1 - upOf(s))
    if (h < 0.006) continue
    const open = smooth(s, 0.15, 0.6)
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

/** How far back the dead go behind the front two ranks: the nearest and the furthest depth (cells behind the water's edge). */
const NEAR = 1.8
const FAR = 150
/** The crowd in depth lanes, each its own colour; within a lane every head has its own depth, so there are no rows. */
const LANES = 16
/** A head may stand no nearer on the screen than this: the front two ranks' ground is in front of it. */
const LIMIT = -1.06
/** Along the shore, a head every this much (in its own depth's terms), in each lane. */
const SPACING = 0.2

/**
 * The army: the dead behind the front two ranks, going back over the black sand to the horizon. Not ranks: every head
 * stands at its own depth, so in the frame they are a crowd thickening into the distance, each smaller and higher the
 * further back it is, never lines of marks. The near ones are drawn with their rims, as the front ranks are; further
 * back they sink into the colour of the sand at their distance, and where a head would be too small to be one they are
 * not drawn at all: the thousands behind them are the dark of the shore itself. They come up out of the ground near
 * ones first, from the trench outwards, and go forward with the surges of the charge.
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
    const rMid = R * 0.86 * Lm.s
    if (rMid < view.h / 380) continue
    const small = 1 - smooth(rMid / view.h, 1 / 380, 1 / 170)
    const f = (lane + 0.5) / LANES
    const sink = Math.min(0.94, 1.15 * f + small)
    const groundC = mix(SAND, haze, 0.06 + 0.25 * f)
    // Its span along the shore, ragged at the ends, and wider the further back (so the crowd fills the shore going away).
    const spread = Math.pow(dMid, 0.8)
    const x0 = trench - 13 - 1.1 * spread - 3 * hash(lane, 71)
    const x1 = trench + 8 + 1.6 * spread + 4 * hash(lane, 72)
    // The layer x the frame shows at this depth, so only the heads in view are visited.
    const lx0 = Math.max(x0, view.cx + (view.x0 - 1 - view.cx) / Lm.s - 2)
    const lx1 = Math.min(x1, view.cx + (view.x1 + 1 - view.cx) / Lm.s + 2)
    const surge = (CHARGE_BY_ROW[1] - 4 * f) * charged(t, 0.6 * f)
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
    // nearest have rims at all, which further back are only more marks.
    if (lane < 3) stroke(g, mix(ASH_RIM, groundC, Math.min(1, sink + small)), 4.2 * 0.86 * Lm.s)
    fill(ctx, mix(mix(ASH, haze, 0.12), groundC, sink))
  }
  ctx.restore()
}

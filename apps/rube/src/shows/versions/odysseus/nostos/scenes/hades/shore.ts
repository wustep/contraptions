import { clamp01, fill, hash, mix, poly, rgba, smooth, stroke, type Paint } from '../../draw'
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

/** The depths of the ranks behind the front two, nearest first (cells behind the water's edge). */
const DEPTHS = Array.from({ length: 12 }, (_, r) => 2.4 * Math.pow(1.36, r))
/** A rank may stand no nearer on the screen than this: the front two ranks' ground is in front of it. */
const LIMIT = -1.06

/**
 * The army: rank behind rank of the dead on the receding ground, each rank on its own ground line, smaller and paler
 * the further back. A rank whose heads are big enough in the frame to be told apart is drawn one by one, each with its
 * rim and its own moment to come up out of the ground; behind the last of those the rest of them are one pale crowd
 * going back into the haze to the horizon. Everything goes forward with the surges of the charge, and a rank that would
 * stand in front of the front two (on a camera that sees the beach from low) stays down in the ground.
 */
export function drawRanks(g: Paint): void {
  const { ctx, t, view } = g
  if (t < k(67.5)) return
  const haze = hazeOf(t)
  const trench = (TRENCH.x0 + TRENCH.x1) / 2
  const spanOf = (r: number, d: number): [number, number] => {
    const spread = Math.pow(d, 0.8)
    // Each rank's ends ragged against the next's.
    return [trench - 13 - 1.1 * spread - 3 * hash(r, 71), trench + 8 + 1.6 * spread + 4 * hash(r, 72)]
  }
  const shiftOf = (r: number, lag = 0) => (CHARGE_BY_ROW[1] - 0.25 * r) * charged(t, 0.05 * r + lag)
  // When a rank comes up: the near ranks first, then back and back, each from the trench outwards.
  const riseOf = (r: number, x: number) => k(68) + 0.28 * r + 1.4 * Math.min(1, Math.abs(x - trench) / 30)
  // The ranks that are drawn one by one, and the nearest that is not: where the crowd begins.
  let crowd = DEPTHS.length
  for (let r = 0; r < DEPTHS.length; r++) {
    if (R * 0.86 * layer(view, DEPTHS[r]).s < view.h / 280) {
      crowd = r
      break
    }
  }
  if (crowd < DEPTHS.length) drawCrowd(g, DEPTHS[crowd], spanOf(crowd, DEPTHS[DEPTHS.length - 1]), shiftOf(crowd), riseOf(crowd, trench), haze)
  for (let r = crowd - 1; r >= 0; r--) {
    const d = DEPTHS[r]
    const L = layer(view, d)
    const ground = L.y(0)
    const keep = 1 - smooth(ground, LIMIT - 0.22, LIMIT)
    if (keep <= 0.002) continue
    const scale = 0.86 * L.s
    const radius = R * scale
    const [x0, x1] = spanOf(r, d)
    // Where the crowd is thin: a slow rise and fall of density along the rank, its own for each rank.
    const thin = (lx: number) => 0.5 + 0.5 * Math.sin(lx * 0.19 + r * 2.3) * Math.sin(lx * 0.07 + r)
    const pale = Math.min(0.55, 0.08 + 0.045 * r)
    ctx.save()
    ctx.beginPath()
    ctx.rect(view.x0 - 1, view.y0 - 1, view.x1 - view.x0 + 2, ground - view.y0 + 1)
    ctx.clip()
    // Shoulder to shoulder, every other rank offset by half a place.
    const gap = 0.3
    ctx.beginPath()
    let any = false
    for (let j = Math.floor(x0 / gap); j <= Math.ceil(x1 / gap); j++) {
      const lx = j * gap + (r % 2 ? gap / 2 : 0) + (hash(j, r, 61) - 0.5) * gap * 0.7
      // Gaps where the crowd thins.
      if (hash(j, r, 65) < 0.35 * thin(lx)) continue
      // Each surges a little after or before the rank as a whole.
      const x = L.x(lx + shiftOf(r, 0.18 * hash(j, r, 66)))
      if (x < view.x0 - 1 || x > view.x1 + 1) continue
      const up = keep * smooth(t, riseOf(r, lx), riseOf(r, lx) + 0.7 + 0.3 * hash(j, r, 62))
      if (up <= 0.001) continue
      const size = radius * (0.9 + 0.2 * hash(j, r, 63))
      // Not on a ruled line: each a little nearer or further than its rank.
      const y = ground - size * (2 * up - 1) + 0.16 * L.s * (hash(j, r, 64) - 0.5)
      ctx.moveTo(x + size, y)
      ctx.arc(x, y, size, 0, Math.PI * 2)
      any = true
    }
    // The rims first and the fills over them, so where two overlap only the outside of the pair is outlined.
    if (any) {
      stroke(g, mix(ASH_RIM, haze, pale), 4.2 * scale)
      fill(ctx, mix(ASH, haze, pale))
    }
    ctx.restore()
  }
}

/**
 * The rest of them, too far back to tell apart: one pale crowd from the ground of the nearest of those ranks back to the
 * horizon, palest and thickest at its front and gone into the haze at its back, its top edge a little uneven, coming
 * up out of the ground with the rest and going forward with them.
 */
function drawCrowd(g: Paint, d: number, [x0, x1]: [number, number], shift: number, rise: number, haze: string): void {
  const { ctx, t, view } = g
  const up = smooth(t, rise, rise + 1.6)
  if (up <= 0.002) return
  const L = layer(view, d)
  const ground = L.y(0)
  const hy = L.hy
  const a = Math.max(L.x(x0 + shift), view.x0 - 1)
  const b = Math.min(L.x(x1 + shift), view.x1 + 1)
  if (b <= a || ground <= hy + 0.01) return
  // How far up it stands: from its front's ground, most of the way to the horizon, and a little over it.
  const height = (ground - hy) * (0.9 + 0.25 * up) * up
  const step = Math.max(0.3, (b - a) / 60)
  const ends = (x: number) => smooth(x, a, a + Math.min(4, (b - a) / 4)) * (1 - smooth(x, b - Math.min(6, (b - a) / 3), b))
  // It comes forward behind the ranks drawn one by one, thinning to nothing there, so it has no front edge.
  const base = Math.min(LIMIT, ground + 0.45 * (ground - hy))
  ctx.beginPath()
  ctx.moveTo(a, base)
  for (let x = a; x <= b + step; x += step) {
    const xx = Math.min(b, x)
    const lx = view.cx + (xx - view.cx) / L.s
    const top = ground - height * ends(xx) * (0.82 + 0.18 * Math.sin(lx * 0.31 + 1.3) * Math.sin(lx * 0.11))
    ctx.lineTo(xx, top)
  }
  ctx.lineTo(b, base)
  ctx.closePath()
  const gr = ctx.createLinearGradient(0, base, 0, ground - height)
  const front = (base - ground) / Math.max(1e-6, base - (ground - height))
  gr.addColorStop(0, rgba(mix(ASH, haze, 0.5), 0))
  gr.addColorStop(Math.min(0.9, front + 0.02), rgba(mix(ASH, haze, 0.5), 0.8))
  gr.addColorStop(Math.min(0.95, front + 0.5 * (1 - front)), rgba(mix(ASH, haze, 0.72), 0.45))
  gr.addColorStop(1, rgba(haze, 0))
  ctx.fillStyle = gr
  ctx.fill()
}

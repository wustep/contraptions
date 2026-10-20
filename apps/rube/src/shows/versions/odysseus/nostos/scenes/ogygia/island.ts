import { circle, clamp01, curve, fill, hash, mix, poly, rgba, ring, smooth, stroke, type Paint } from '../../draw'
import type { Pt } from '../../path'
import { layer } from '../../world/depth'
import { seaLight, surface, weather } from '../../world/sea'
import { skyAt } from '../../world/sky'
import { FIRST_DAWN, LAST_DAWN, daylight, dayOf } from './days'

/**
 * Ogygia: a spit of white sand in a turquoise sea, a great white dune standing behind it, and on the spit a knuckle of
 * pale limestone with a cave in it, Calypso's, a net hung across its mouth. He comes ashore on the west beach, goes over
 * the low rise to the lotus at the cave's mouth, and lies there seven years while the sand drifts against him.
 *
 * Everything is lit by the sky it stands under: the sand and the stone are white by day and the blue of the night by
 * night (the sky's own horizon colour says which), and the far dune pales into the air.
 */

/**
 * The sand's surface, (x, y) knots: the island's flank going down into the deep, the west waterline at 652.5, the
 * landing flat, the low rise, the cave's beach a little higher, the east beach running down to the waterline at 676.6.
 */
const KNOTS: Pt[] = [
  [560, 14],
  [600, 9],
  [625, 4.5],
  [640, 2.2],
  [647, 1.0],
  [652.5, 0.02],
  [655, -0.17],
  [656, -0.22],
  [664, -0.22],
  [665, -0.42],
  [666, -0.6],
  [667.1, -0.58],
  [668, -0.5],
  [672.4, -0.5],
  [673.6, -0.42],
  [675.2, -0.2],
  [676.6, 0.02],
  [678.5, 0.5],
  [684, 1.6],
  [700, 4.2],
  [720, 8.5],
  [760, 15],
]

/** A monotone cubic through the knots: no overshoot, so the flat sand stays flat. */
const slopes = (() => {
  const n = KNOTS.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((KNOTS[i + 1][1] - KNOTS[i][1]) / (KNOTS[i + 1][0] - KNOTS[i][0]))
  const m: number[] = [d[0]]
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]))
  m.push(d[n - 2])
  return m
})()

/** The sand's surface at `x` (cells, negative up). */
export function ground(x: number): number {
  if (x <= KNOTS[0][0]) return KNOTS[0][1]
  const n = KNOTS.length
  if (x >= KNOTS[n - 1][0]) return KNOTS[n - 1][1]
  let i = 0
  while (i + 1 < n && KNOTS[i + 1][0] <= x) i++
  const [x0, y0] = KNOTS[i]
  const [x1, y1] = KNOTS[i + 1]
  const h = x1 - x0
  const u = (x - x0) / h
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * slopes[i] + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * slopes[i + 1]
}

/** Where a ball of radius `r` rests on the sand at `x`: its centre, off the surface along the surface's normal. */
export function onSand(x: number, r = 0.13): Pt {
  const e = 0.02
  const dy = (ground(x + e) - ground(x - e)) / (2 * e)
  const n = Math.hypot(1, dy)
  return [x + (dy * r) / n, ground(x) - r / n]
}

/** The cave's mouth, where he lies seven years: its middle, its feet and its crown. */
export const CAVE = { x: 669, left: 668.25, right: 669.75, crown: -1.75 }
/** Where he lies. */
export const BED: Pt = onSand(CAVE.x)

/* ------------------------------------------------------------------ light */

const lum = (hex: string): number => {
  const v = parseInt(hex.slice(1), 16)
  return (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255
}

/** How lit the island is at `t`, 0 (night) to 1 (noon), from the sky over it: the horizon's brightness. */
export function lightAt(t: number): number {
  return clamp01((lum(skyAt(t).low) - 0.14) / 0.76)
}

/** The day's colours at night: towards the night's blue, and darker. */
const NIGHT_SAND = '#62788F'
const NIGHT_STONE = '#53697F'
const lit = (day: string, night: string, l: number) => mix(night, day, l)

/* ------------------------------------------------------------------ the sky's discs */

/**
 * The sun by day and the moon by night, each on its own arc across the sky, low in the east to low in the west, cut off
 * by the horizon: flat discs, the light in what they fall on. In the frame's own terms, as the sky's discs are.
 */
export function drawDiscs(g: Paint, hy: number): void {
  const { ctx, t, view } = g
  if (t < FIRST_DAWN - 1 || t > 397.6) return
  const { k, day, u } = dayOf(t)
  const sunFade = 1 - smooth(t, 395.4, 397.4)
  let sun: number | null = null
  let moon: number | null = null
  if (k === 7) sun = 0.3 * (1 - Math.exp(-u / 0.9))
  else if (k >= 0) {
    if (day) sun = u
    else moon = u
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(view.x0 - 1, view.y0 - 1, view.x1 - view.x0 + 2, hy - view.y0 + 1)
  ctx.clip()
  const at = (p: number, rise: number): Pt => [view.x0 + (view.x1 - view.x0) * (0.1 + 0.8 * p), view.y0 + (hy - view.y0) * (1.1 - rise * Math.sin(Math.PI * p))]
  if (sun !== null) {
    const [x, y] = at(sun, 0.96)
    circle(ctx, x, y, 0.03 * view.h)
    fill(ctx, rgba('#FFF7E6', sunFade))
  }
  if (moon !== null) {
    const [x, y] = at(moon, 0.85)
    circle(ctx, x, y, 0.022 * view.h)
    fill(ctx, rgba('#E4EAEC', 0.95))
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the dunes */

/** The great white dune and, far behind it, a lower one: layers far back, paling into the air. */
export function drawDunes(g: Paint): void {
  const { ctx, t, view } = g
  // Left behind, the island goes into the haze, and into the storm's murk: gone by the time the raft is halfway home.
  const away = smooth(Math.abs(view.cx - 688), 28, 90)
  const murk = 0.85 * smooth(weather(t), 0.4, 0.9)
  const seen = (1 - away) * (1 - murk)
  if (seen <= 0.002) return
  const sky = skyAt(t)
  const l = lightAt(t)
  ctx.globalAlpha = seen
  const ranks: { d: number; peak: number; at: number; left: number; right: number; air: number }[] = [
    { d: 90, peak: -10, at: 714, left: 640, right: 742, air: 0.55 },
    { d: 32, peak: -13.5, at: 689, left: 640, right: 706, air: 0.18 },
  ]
  for (const r of ranks) {
    const L = layer(view, r.d)
    if (L.x(r.right) < view.x0 - 1 || L.x(r.left) > view.x1 + 1) continue
    const day = r.d > 60 ? '#E9E3D4' : '#F3EEE2'
    const shade = r.d > 60 ? '#D5CEC0' : '#DCD5C6'
    const face = mix(lit(day, NIGHT_SAND, l), sky.low, r.air)
    const slip = mix(lit(shade, '#33485E', l), sky.low, r.air * 0.9)
    // The windward back: a long, smooth rise from the west to the crest; the slip face falls steep to the east.
    const pts: Pt[] = []
    const n = 36
    for (let i = 0; i <= n; i++) {
      const x = r.left + ((r.at - r.left) * i) / n
      const v = i / n
      pts.push([L.x(x), L.y(r.peak * Math.pow(Math.sin((v * Math.PI) / 2), 1.8))])
    }
    const slipPts: Pt[] = []
    for (let i = 0; i <= 16; i++) {
      const v = i / 16
      const x = r.at + (r.right - r.at) * v
      slipPts.push([L.x(x), L.y(r.peak * (1 - Math.pow(v, 0.8)) * (1 - 0.15 * v))])
    }
    const base = L.y(0)
    ctx.beginPath()
    ctx.moveTo(pts[0][0], base)
    for (const p of pts) ctx.lineTo(p[0], p[1])
    for (const p of slipPts) ctx.lineTo(p[0], p[1])
    ctx.lineTo(slipPts[slipPts.length - 1][0], base)
    ctx.closePath()
    fill(ctx, face)
    // The slip face in its own shade, from the crest down.
    ctx.beginPath()
    ctx.moveTo(slipPts[0][0], slipPts[0][1])
    for (const p of slipPts) ctx.lineTo(p[0], p[1])
    ctx.lineTo(slipPts[slipPts.length - 1][0], base)
    ctx.lineTo(L.x(r.at - 3), base)
    ctx.quadraticCurveTo(L.x(r.at - 1.2), L.y(r.peak * 0.45), slipPts[0][0], slipPts[0][1])
    ctx.closePath()
    fill(ctx, slip)
  }
  ctx.globalAlpha = 1
}

/* ------------------------------------------------------------------ the stone and the cave */

/**
 * The knuckle of limestone over the cave: blocky, in steps, as limestone weathers: a low step to landward, the main block
 * over the cave, a crown, and a step down to its steep seaward face.
 */
const STONE: Pt[] = [
  [665.8, 0.2],
  [665.95, -0.55],
  [666.35, -0.95],
  [666.5, -1.3],
  [667.1, -1.45],
  [667.35, -1.85],
  [668.2, -2.05],
  [669.3, -2.15],
  [670.2, -2.1],
  [670.55, -2.35],
  [671.4, -2.38],
  [671.75, -2.05],
  [672.05, -1.55],
  [672.3, -1.45],
  [672.55, -0.8],
  [672.7, 0.2],
]

export function drawStone(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 665 || view.x0 > 673.5) return
  const l = lightAt(t)
  const sky = skyAt(t)
  const ink = mix('#4A4E50', '#0D1720', 1 - l)
  const stone = mix(lit('#E6DECD', NIGHT_STONE, l), sky.low, 0.06)
  const shade = mix(lit('#D1C7B3', '#30455A', l), sky.low, 0.06)
  ctx.lineJoin = 'round'
  poly(ctx, STONE)
  fill(ctx, stone)
  // The faces away from the light: the steep seaward face and the risers of the steps.
  ctx.save()
  poly(ctx, STONE)
  ctx.clip()
  poly(ctx, [[671.75, -2.6], [671.9, -1.55], [672.15, 0.3], [673, 0.3], [673, -2.6]])
  fill(ctx, shade)
  poly(ctx, [[667.1, -1.45], [667.35, -1.85], [667.62, -1.9], [667.42, -1.42]])
  fill(ctx, shade)
  // Its bedding: two long, low ledges running through the block, not a texture.
  ctx.beginPath()
  ctx.moveTo(666.5, -1.3)
  ctx.lineTo(667.9, -1.33)
  ctx.moveTo(670.3, -1.72)
  ctx.lineTo(672.05, -1.55)
  stroke(g, rgba(ink, 0.35), 1.8)
  ctx.restore()
  poly(ctx, STONE)
  stroke(g, ink, 2.4)
  // The cave's mouth: an arch of dark, its floor the sand.
  const { left, right, crown } = CAVE
  ctx.beginPath()
  ctx.moveTo(left, 0.2)
  ctx.lineTo(left, -0.95)
  ctx.bezierCurveTo(left + 0.02, crown - 0.2, right - 0.02, crown - 0.2, right, -0.95)
  ctx.lineTo(right, 0.2)
  ctx.closePath()
  fill(ctx, mix('#1B2326', '#060B10', 1 - l))
  stroke(g, ink, 2.4)
  drawNet(g, l)
}

/**
 * Calypso's net, hung across the top of her cave's mouth from two pegs: a diamond mesh, sagging deepest in the middle,
 * pale against the dark, swaying a little with the air off the sea, and hard when the thunder comes.
 */
function drawNet(g: Paint, l: number): void {
  const { ctx, t } = g
  const a: Pt = [CAVE.left + 0.12, -1.42]
  const b: Pt = [CAVE.right - 0.12, -1.42]
  const thunder = ring(t, LAST_DAWN, 1.3, 0.9)
  const sway = 0.035 * Math.sin(t * 0.9) + 0.02 * Math.sin(t * 1.7 + 1) + 0.11 * thunder
  const cord = mix('#D9CDB2', '#7C8C98', 1 - l)
  // A point of the net: across it (u) and down it (v), its foot sagging into a shallow scallop.
  const at = (u: number, v: number): Pt => {
    const top = a[1] + 0.05 * Math.sin(Math.PI * u)
    const foot = -0.98 - 0.16 * Math.sin(Math.PI * u) + 0.035 * Math.cos(u * Math.PI * 8)
    const y = top + (foot - top) * v
    return [a[0] + (b[0] - a[0]) * u + sway * v * v * (0.5 + 0.5 * Math.sin(Math.PI * u)), y]
  }
  ctx.lineCap = 'round'
  const lines = 5
  // The two runs of cord that cross to make the diamonds: down to the right, and down to the left.
  for (const dir of [1, -1]) {
    for (let i = -lines + 1; i < lines; i++) {
      const pts: Pt[] = []
      for (let s = 0; s <= 12; s++) {
        const v = s / 12
        const u = (i + dir * v * lines * 0.5) / lines + (dir < 0 ? 1 / (lines * 2) : 0)
        if (u < -1e-6 || u > 1 + 1e-6) continue
        pts.push(at(u, v))
      }
      if (pts.length < 2) continue
      curve(ctx, pts)
      stroke(g, rgba(cord, 0.75), 1.5)
    }
  }
  // Its head rope, along the top.
  const head: Pt[] = []
  for (let s = 0; s <= 8; s++) head.push(at(s / 8, 0))
  curve(ctx, head)
  stroke(g, rgba(cord, 0.9), 2)
  for (const p of [a, b]) {
    circle(ctx, p[0], p[1], 0.035)
    fill(ctx, mix('#6B5A44', '#2A3440', 1 - l))
  }
}

/* ------------------------------------------------------------------ the sand */

export function drawSand(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 560 || view.x0 > 760) return
  const l = lightAt(t)
  const sky = skyAt(t)
  const sea = seaLight(t)
  const sand = mix(lit('#F1EADB', NIGHT_SAND, l), sky.low, 0.04)
  const wet = mix(lit('#D9CDB4', '#3A5268', l), sea.near, 0.18)
  const ink = mix('#5B5448', '#0F1A24', 1 - l)
  const x0 = Math.max(560, view.x0 - 1)
  const x1 = Math.min(760, view.x1 + 1)
  const step = Math.max(0.05, (x1 - x0) / 220)
  const top: Pt[] = []
  for (let x = x0; x <= x1 + 1e-9; x += step) top.push([x, ground(x)])
  const deep = Math.max(view.y1 + 1, 2)
  ctx.beginPath()
  ctx.moveTo(top[0][0], deep)
  for (const p of top) ctx.lineTo(p[0], p[1])
  ctx.lineTo(top[top.length - 1][0], deep)
  ctx.closePath()
  fill(ctx, sand)
  // The wet sand the sea has just left: a skin along each shore's surface, from a little above where the swell reaches
  // to a little under the water, fading out at both ends.
  for (const [xa, xb] of [[649.8, 655.6], [675.2, 680.4]]) {
    if (xb < view.x0 || xa > view.x1) continue
    ctx.beginPath()
    const pts: Pt[] = []
    for (let x = xa; x <= xb + 1e-9; x += 0.1) pts.push([x, ground(x)])
    ctx.moveTo(pts[0][0], pts[0][1])
    for (const p of pts) ctx.lineTo(p[0], p[1])
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1] + 0.16)
    ctx.closePath()
    const band = ctx.createLinearGradient(xa, 0, xb, 0)
    band.addColorStop(0, rgba(wet, 0))
    band.addColorStop(0.3, rgba(wet, 0.6))
    band.addColorStop(0.7, rgba(wet, 0.6))
    band.addColorStop(1, rgba(wet, 0))
    ctx.fillStyle = band
    ctx.fill()
  }
  // The sand's edge, one line along its top, above the water.
  ctx.beginPath()
  let pen = false
  for (const p of top) {
    if (p[1] > 0.1) {
      pen = false
      continue
    }
    if (!pen) ctx.moveTo(p[0], p[1])
    else ctx.lineTo(p[0], p[1])
    pen = true
  }
  stroke(g, rgba(ink, 0.55), 2.2)
  // The swash: the thin sheet the last wave runs up the sand, its edge sliding up and back with the swell.
  for (const [xw, dir] of [[652.5, -1], [676.6, 1]] as [number, number][]) {
    if (xw < view.x0 - 3 || xw > view.x1 + 3) continue
    const reach = 0.7 + 0.35 * Math.sin(t * 0.8 + xw) + 0.2 * Math.sin(t * 1.9)
    const xa = xw
    const xb = xw - dir * reach
    const pts: Pt[] = []
    const n = 14
    for (let i = 0; i <= n; i++) {
      const x = xa + ((xb - xa) * i) / n
      pts.push([x, Math.min(ground(x), surface(x, t)) - 0.012])
    }
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1] + 0.06)
    for (const p of pts) ctx.lineTo(p[0], p[1])
    for (let i = n; i >= 0; i--) ctx.lineTo(pts[i][0], ground(pts[i][0]) + 0.04)
    ctx.closePath()
    fill(ctx, rgba(mix(sea.near, sea.lit, 0.35), 0.55))
  }
}

/* ------------------------------------------------------------------ the lotus */

interface Lotus {
  x: number
  /** Its height: how tall its stem stands. */
  h: number
  /** Its size. */
  r: number
  /** When it first opens. */
  opens: number
  /** Leans a little, this way. */
  lean: number
  /** Drawn over him (in front) rather than behind. */
  front?: boolean
}

/** The beckoning one on the rise, and the five at the cave's mouth, which open round him as he comes. */
export const LOTUS: Lotus[] = [
  { x: 666.1, h: 0.3, r: 0.15, opens: FIRST_DAWN, lean: -0.12 },
  { x: 667.8, h: 0.42, r: 0.17, opens: 362.39, lean: -0.15 },
  { x: 668.42, h: 0.28, r: 0.14, opens: 362.72, lean: 0.06 },
  { x: 670.0, h: 0.36, r: 0.16, opens: 363.28, lean: 0.12 },
  { x: 670.55, h: 0.5, r: 0.18, opens: 363.88, lean: 0.16 },
  { x: 669.42, h: 0.16, r: 0.12, opens: 364.37, lean: 0.08, front: true },
]

/** How open a lotus is at `t`: unopened before its time; then open by day and shut by night; shut for good at the thunder. */
export function openOf(f: Lotus, t: number): number {
  const first = smooth(t, f.opens, f.opens + 0.9)
  if (first <= 0) return 0
  const day = smooth(daylight(t), 0.3, 0.72)
  const shut = 1 - smooth(t, LAST_DAWN + 0.15, LAST_DAWN + 1.4)
  return first * Math.max(day, 1 - smooth(t, f.opens + 0.9, f.opens + 1.8)) * shut
}

export function drawLotus(g: Paint, front: boolean): void {
  const { ctx, t, view } = g
  if (view.x1 < 665 || view.x0 > 672) return
  const l = lightAt(t)
  const leaf = mix('#7F9C7B', '#2C4450', 1 - l)
  const stem = mix('#5E7A55', '#22363F', 1 - l)
  const petal = mix('#F3F5F2', '#8AA1B4', 1 - l)
  const tip = mix('#9DB6CD', '#5A7590', 1 - l)
  const heart = mix('#E3C46A', '#76735A', 1 - l)
  const ink = mix('#4B5A4C', '#0E1A22', 1 - l)
  for (const [i, f] of LOTUS.entries()) {
    if (!!f.front !== front) continue
    const base: Pt = [f.x, ground(f.x) + 0.02]
    const o = openOf(f, t)
    // The thunder runs through them: a shiver, damped.
    const shiver = 0.08 * ring(t, LAST_DAWN, 3.1, 0.5)
    const sway = 0.035 * Math.sin(t * 0.7 + i * 1.9) + shiver
    const head: Pt = [base[0] + (f.lean + sway) * f.h, base[1] - f.h]
    // The leaves: two flat rounds on short stalks, low.
    for (const s of [-1, 1]) {
      const lx = base[0] + s * f.r * 1.15
      const ly = base[1] - 0.035 - 0.02 * hash(i, s)
      ctx.beginPath()
      ctx.moveTo(base[0], base[1])
      ctx.quadraticCurveTo(base[0] + s * f.r * 0.5, base[1] - 0.06, lx, ly)
      stroke(g, stem, 1.6)
      ctx.beginPath()
      ctx.ellipse(lx, ly, f.r * 0.85, f.r * 0.26, s * 0.12, 0, Math.PI * 2)
      fill(ctx, leaf)
      stroke(g, ink, 1.6)
    }
    // The stem, curving up to the flower.
    ctx.beginPath()
    ctx.moveTo(base[0], base[1])
    ctx.quadraticCurveTo(base[0] + (head[0] - base[0]) * 0.2, base[1] - f.h * 0.55, head[0], head[1])
    stroke(g, stem, 2)
    // The flower: petals from a closed bud to a wide cup. The outer petals first, then the inner over them.
    const petals = 7
    const spread = 0.12 + 1.05 * o
    const len = f.r * (0.95 + 0.15 * o)
    const order: number[] = []
    for (let p = 0; p < petals; p++) order.push(p)
    order.sort((x, y) => Math.abs(y - (petals - 1) / 2) - Math.abs(x - (petals - 1) / 2))
    for (const p of order) {
      const side = (p - (petals - 1) / 2) / ((petals - 1) / 2)
      const ang = -Math.PI / 2 + side * spread
      const tipPt: Pt = [head[0] + Math.cos(ang) * len, head[1] + Math.sin(ang) * len * (0.85 + 0.15 * o)]
      const w = f.r * (0.26 + 0.08 * o) * (1 - 0.25 * Math.abs(side))
      const nx = -Math.sin(ang) * w
      const ny = Math.cos(ang) * w
      const mid: Pt = [(head[0] + tipPt[0]) / 2, (head[1] + tipPt[1]) / 2]
      ctx.beginPath()
      ctx.moveTo(head[0], head[1])
      ctx.quadraticCurveTo(mid[0] + nx, mid[1] + ny, tipPt[0], tipPt[1])
      ctx.quadraticCurveTo(mid[0] - nx, mid[1] - ny, head[0], head[1])
      ctx.closePath()
      const g2 = ctx.createLinearGradient(head[0], head[1], tipPt[0], tipPt[1])
      g2.addColorStop(0, petal)
      g2.addColorStop(0.6, petal)
      g2.addColorStop(1, tip)
      ctx.fillStyle = g2
      ctx.fill()
      stroke(g, ink, 1.6)
    }
    // Its heart, seen only when it is open.
    if (o > 0.35) {
      ctx.beginPath()
      ctx.ellipse(head[0], head[1] - f.r * 0.18, f.r * 0.22 * o, f.r * 0.1 * o, 0, 0, Math.PI * 2)
      fill(ctx, rgba(heart, clamp01((o - 0.35) / 0.4)))
    }
  }
}

/* ------------------------------------------------------------------ the drift */

/**
 * The sand drifting against him through the years: a low bank on his seaward side, up over the lower part of him, drawn
 * in front of him; when he wakes it slumps back to the beach.
 */
export function drawDrift(g: Paint): void {
  const { ctx, t, view } = g
  if (view.x1 < 667 || view.x0 > 671) return
  const grow = smooth(t, 364.2, LAST_DAWN - 1)
  const slump = 1 - smooth(t, LAST_DAWN + 0.25, 386.6)
  const hgt = (0.14 * grow + 0.015 * smooth(t, 364.2, 366)) * slump
  if (hgt <= 0.004) return
  const l = lightAt(t)
  const sand = mix(lit('#F1EADB', NIGHT_SAND, l), skyAt(t).low, 0.04)
  const ink = mix('#5B5448', '#0F1A24', 1 - l)
  const [bx, by] = BED
  const w = 0.3 + 0.16 * grow
  const y0 = by + 0.13
  const edge = () => {
    ctx.moveTo(bx - w, y0 + 0.01)
    ctx.bezierCurveTo(bx - w * 0.45, y0 - hgt * 0.15, bx - w * 0.35, y0 - hgt, bx + 0.02, y0 - hgt)
    ctx.bezierCurveTo(bx + w * 0.35, y0 - hgt, bx + w * 0.5, y0 - hgt * 0.1, bx + w * 1.1, y0 + 0.01)
  }
  ctx.beginPath()
  edge()
  ctx.lineTo(bx + w * 1.1, y0 + 0.08)
  ctx.lineTo(bx - w, y0 + 0.08)
  ctx.closePath()
  fill(ctx, sand)
  ctx.beginPath()
  edge()
  stroke(g, rgba(ink, 0.5), 1.6)
}

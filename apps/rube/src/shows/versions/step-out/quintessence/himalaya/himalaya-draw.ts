import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { level } from '../music'
import { ellipse, fillPoly, glow, line, mix, rgba, vgrad, type Pen } from '../home/pen'
import {
  CAT_LOOK,
  CAT_LOOK_AWAY,
  catAt,
  CAT_STEPS_IN,
  CAT_STEPS_OUT,
  FAR_Y,
  GUST,
  LANDINGS,
  LEDGE_Y,
  R,
  SEAN_AT,
  SIFTS,
  SIFT_X,
  STEPS,
  TICKS,
} from './himalaya-plan'

/**
 * The Himalayas, drawn: a great deal of sky; ranges going back pale into it; a sea of cloud in the valley; the face he
 * climbs, its steps capped with snow; the ledge at the top with Sean's tripod and long lens on it; across the valley,
 * the far rocks, and on them, if you look, the snow leopard.
 */

export const C = {
  zenith: '#5F7FA8',
  sky: '#9FB6CF',
  horizon: '#DCE6EE',
  far1: '#9AACC2',
  far2: '#8E9FB5',
  farSnow: '#F1F5F8',
  cloud: '#F4F7FA',
  rock: '#7E8A98',
  rockDark: '#566270',
  rockLit: '#A3AEBA',
  face: '#8C98A6',
  snow: '#F6F9FB',
  snowShade: '#D6E0E8',
  ridge: '#B9C2CB',
  ridgeDark: '#A0AAB4',
  ridgeSnow: '#EEF2F5',
  cat: '#E6E3DC',
  catShade: '#CBC7BE',
  spot: '#9E998F',
  lens: '#3E423E',
  lensBand: '#D8D6CC',
  tripod: '#2F3338',
  strap: '#6B5A3E',
}

type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/* ------------------------------------------------------------------ sky, ranges, cloud */

export function drawSky(pen: Pen, f: Frame, t: number): void {
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The sky is fixed to the world's height: deep overhead, pale at the horizon (about the ledge's height).
  fillPoly(pen, [[x0, f.y0 - 1], [x1, f.y0 - 1], [x1, f.y1 + 1], [x0, f.y1 + 1]], vgrad(pen, -24, -4, [[0, C.zenith], [0.55, C.sky], [1, C.horizon]]))
  // The ranges, far and farther: each moves less than the world as the camera goes.
  range(pen, f, 0.9, -9.6, 3.6, C.far1, 11, 0.5)
  range(pen, f, 0.8, -7.6, 3.0, C.far2, 23, 0.6)
  // A sea of cloud far below the ledge, the ranges' feet in it.
  const cy = -7.0 + (f.cy + 10) * 0.2
  fillPoly(pen, [[x0, cy], [x1, cy], [x1, f.y1 + 1], [x0, f.y1 + 1]], vgrad(pen, cy - 0.6, cy + 3, [[0, rgba(C.cloud, 0.0)], [0.18, rgba(C.cloud, 0.95)], [1, C.cloud]]))
  const ox = f.cx * 0.15
  for (let i = Math.floor((f.x0 - ox) / 2.2) - 2; i <= Math.ceil((f.x1 - ox) / 2.2) + 2; i++) {
    const x = ox + i * 2.2 + ((t * 0.05) % 2.2)
    ellipse(pen, x, cy + 0.05 + hash(i, 5) * 0.2, 1.2 + hash(i, 6) * 0.8, 0.28, rgba(C.cloud, 0.9))
  }
}

/** A range of peaks at parallax `par` (1 moves with the world), its tops round `base` up to `h` tall. */
function range(pen: Pen, f: Frame, par: number, base: number, h: number, col: string, seed: number, snowLine: number): void {
  const ox = f.cx * (1 - par)
  const oy = f.cy * (1 - par) * 0.6
  const step = 1.6
  const i0 = Math.floor((f.x0 - ox) / step) - 2
  const i1 = Math.ceil((f.x1 - ox) / step) + 2
  const pts: Pt[] = []
  for (let i = i0; i <= i1; i++) {
    const peak = hash(i, seed) * hash(i, seed + 1)
    const y = base + oy - h * (0.25 + peak) + hash(i, seed + 2) * 0.3
    pts.push([ox + i * step + (hash(i, seed + 3) - 0.5) * 0.8, y])
  }
  const bottom = Math.max(f.y1 + 1, base + 6)
  fillPoly(pen, [...pts, [pts[pts.length - 1][0], bottom], [pts[0][0], bottom]], col)
  // Snow on the upper slopes of each peak: a lighter cap down from its top, along its sides.
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i]
    if (py > pts[i - 1][1] || py > pts[i + 1][1]) continue
    const l = pts[i - 1]
    const r = pts[i + 1]
    const s = snowLine
    fillPoly(pen, [[px, py], [px + (r[0] - px) * s, py + (r[1] - py) * s], [px + (r[0] - px) * s * 0.55, py + (r[1] - py) * s * 0.75], [px, py + (Math.max(l[1], r[1]) - py) * s * 0.7], [px + (l[0] - px) * s * 0.6, py + (l[1] - py) * s * 0.8], [px + (l[0] - px) * s, py + (l[1] - py) * s]], rgba(C.farSnow, 0.85))
  }
}

/* ------------------------------------------------------------------ the mountain he climbs */

/** The boulder over the foot, up to his left: the gust takes the snow off its top. */
const BOULDER: Pt = [-1.6, -1.75]

/** The face's outline: off to the left and down, its right flank down into the cloud, the ledge's lip, the summit ridge. */
const FACE: Pt[] = [
  [-16, 8],
  [11.6, 8],
  [11.1, -2.5],
  [10.6, -6.4],
  [10.0, -8.4],
  [9.75, LEDGE_Y + 0.05],
  [9.9, LEDGE_Y],
  [9.95, LEDGE_Y - 0.08],
  [9.35, LEDGE_Y - 0.6],
  [9.1, LEDGE_Y - 1.4],
  [8.5, -11.25],
  [7.6, -11.6],
  [6.3, -12.2],
  [5.1, -12.9],
  [4.2, -13.3],
  [3.0, -12.6],
  [1.3, -12.8],
  [-0.6, -11.8],
  [-3.2, -12.3],
  [-6, -10.8],
  [-16, -11],
]

export function drawFace(pen: Pen, f: Frame): void {
  const { c } = pen
  c.save()
  fillPoly(pen, FACE, vgrad(pen, -14, 2, [[0, C.rockLit], [0.6, C.face], [1, C.rock]]))
  // Its strata: long faint seams across it, and snow lying in the gullies.
  c.save()
  pen.c.beginPath()
  FACE.forEach(([x, y], i) => (i ? c.lineTo(x * pen.k, y * pen.k) : c.moveTo(x * pen.k, y * pen.k)))
  c.closePath()
  c.clip()
  for (let i = 0; i < 26; i++) {
    const y = -13 + i * 0.55 + hash(i, 41) * 0.3
    if (y < f.y0 - 1 || y > f.y1 + 1) continue
    const pts: Pt[] = []
    for (let x = Math.floor(f.x0) - 1; x <= f.x1 + 1; x += 0.5) pts.push([x, y + 0.18 * Math.sin(x * 0.9 + i) - x * 0.08])
    line(pen, pts, rgba(C.rockDark, 0.18), 0.02)
  }
  for (let i = 0; i < 24; i++) {
    const x = -6 + hash(i, 51) * 16
    const y = -13 + hash(i, 52) * 14
    if (x < f.x0 - 2 || x > f.x1 + 2 || y < f.y0 - 1 || y > f.y1 + 1) continue
    const w = 0.4 + hash(i, 53) * 0.9
    fillPoly(pen, [[x - w, y + w * 0.08], [x - w * 0.2, y - 0.06], [x + w, y - w * 0.08], [x + w * 0.3, y + 0.05]], rgba(C.snow, 0.45))
  }
  // The snow the climb starts in, along the foot.
  const foot: Pt[] = [[-16, R + 0.02], [-1.6, R - 0.02], [-0.2, R], [0.5, R + 0.06], [1.6, R + 0.45], [3.2, R + 1.3], [5.5, R + 2.4]]
  fillPoly(pen, [...foot, [5.5, 8], [-16, 8]], vgrad(pen, R, R + 3, [[0, C.snow], [1, C.snowShade]]))
  line(pen, foot, rgba(C.snowShade, 0.9), 0.02)
  c.restore()
  // The boulder over the foot, whose snow the gust tears off.
  fillPoly(pen, [[BOULDER[0] - 0.8, BOULDER[1] + 0.05], [BOULDER[0], BOULDER[1] - 0.25], [BOULDER[0] + 0.65, BOULDER[1] - 0.05], [BOULDER[0] + 0.8, BOULDER[1] + 0.4], [BOULDER[0] - 0.9, BOULDER[1] + 0.45]], C.rockDark)
  fillPoly(pen, [[BOULDER[0] - 0.84, BOULDER[1] + 0.06], [BOULDER[0], BOULDER[1] - 0.3], [BOULDER[0] + 0.68, BOULDER[1] - 0.06], [BOULDER[0] + 0.1, BOULDER[1] - 0.12], [BOULDER[0] - 0.5, BOULDER[1] + 0.12]], C.snow)
  // The rock over the ledge, its lip of snow, from which it sifts down by them.
  fillPoly(pen, [[SIFT_X - 0.6, LEDGE_Y - 1.55], [SIFT_X + 0.05, LEDGE_Y - 1.45], [SIFT_X + 0.25, LEDGE_Y - 1.25], [SIFT_X - 0.05, LEDGE_Y - 1.18], [SIFT_X - 0.7, LEDGE_Y - 1.25]], C.rockDark)
  fillPoly(pen, [[SIFT_X - 0.65, LEDGE_Y - 1.56], [SIFT_X + 0.08, LEDGE_Y - 1.5], [SIFT_X + 0.28, LEDGE_Y - 1.28], [SIFT_X + 0.02, LEDGE_Y - 1.42], [SIFT_X - 0.5, LEDGE_Y - 1.46]], C.snow)
  c.restore()
}

/** The steps: a slab of rock under every landing, capped with snow; the ledge at the top. */
export function drawSteps(pen: Pen, f: Frame): void {
  // The trail: a shelf worn along each leg of the switchback, the steps on it.
  for (const [a, b] of [[0, 9], [9, 17], [17, STEPS.length]] as [number, number][]) {
    const leg = STEPS.slice(a, b).map((s) => s.p).sort((p, q) => p[0] - q[0])
    const top: Pt[] = leg.flatMap(([x, y]): Pt[] => [[x - 0.3, y + R + 0.1], [x + 0.3, y + R + 0.1]])
    const low = top.map(([x, y]): Pt => [x, y + 0.34]).reverse()
    fillPoly(pen, [...top, ...low], rgba(C.rockDark, 0.4))
  }
  for (const s of STEPS) {
    const [x, y] = s.p
    if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
    const top = y + R
    const h = (i: number) => hash(Math.round(x * 100), Math.round(y * 100), i)
    fillPoly(pen, [[x - 0.3, top], [x + 0.3, top], [x + 0.26 + h(1) * 0.05, top + 0.2], [x + 0.05, top + 0.3 + h(2) * 0.08], [x - 0.24, top + 0.22]], C.rockDark)
    fillPoly(pen, [[x - 0.32, top + 0.02], [x - 0.2, top - 0.035], [x + 0.18, top - 0.04], [x + 0.32, top + 0.02], [x + 0.25, top + 0.06], [x - 0.26, top + 0.06]], C.snow)
  }
  // The ledge: a long shelf out over the valley.
  const y = LEDGE_Y
  const a = STEPS[STEPS.length - 1].p[0] - 0.4
  fillPoly(pen, [[a, y], [9.95, y], [9.9, y + 0.12], [9.4, y + 0.32], [8.2, y + 0.45], [a + 0.2, y + 0.4]], C.rockDark)
  fillPoly(pen, [[a - 0.05, y + 0.02], [a + 0.3, y - 0.05], [9.0, y - 0.05], [9.98, y + 0.01], [9.8, y + 0.07], [a + 0.1, y + 0.07]], C.snow)
}

/* ------------------------------------------------------------------ across the valley */

/** The far ridge's top, and the two rocks the cat comes from behind and goes behind. */
const ROCK_A: Pt[] = [[11.75, FAR_Y + 0.2], [11.95, FAR_Y - 0.42], [12.35, FAR_Y - 0.55], [12.62, FAR_Y - 0.3], [12.7, FAR_Y + 0.2]]
const ROCK_B: Pt[] = [[14.7, FAR_Y + 0.2], [14.85, FAR_Y - 0.36], [15.3, FAR_Y - 0.58], [15.75, FAR_Y - 0.4], [16.0, FAR_Y + 0.2]]

export function drawFarSide(pen: Pen): void {
  const y = FAR_Y + 0.1
  // The far mountain rising behind the ridge: the cat is against it, pale on pale, not against the sky.
  fillPoly(pen, [[11.8, y], [12.6, y - 1.6], [13.6, y - 2.3], [14.6, y - 3.4], [15.4, y - 3.0], [16.6, y - 4.1], [18.2, y - 2.8], [20, y - 1.5], [22, y]], vgrad(pen, y - 4, y, [[0, '#D3DBE3'], [1, '#C4CDD6']]))
  for (let i = 0; i < 12; i++) {
    const x = 12.4 + hash(i, 63) * 7
    const yy = y - 0.4 - hash(i, 64) * 2.4
    fillPoly(pen, [[x - 0.5, yy], [x, yy - 0.12], [x + 0.6, yy - 0.02], [x + 0.2, yy + 0.08]], rgba('#EEF2F5', 0.8))
  }
  fillPoly(pen, [[11.2, 1], [11.5, -3.6], [11.9, -7.6], [12.0, y - 0.05], [13.1, y - 0.1], [14.4, y], [16.2, y - 0.25], [17.6, y - 1.4], [19.5, y - 2.0], [22, y - 1.2], [24, 1]], vgrad(pen, y - 2, y + 6, [[0, C.ridge], [1, mix(C.ridge, C.cloud, 0.5)]]))
  // Snow along its top, where the cat will walk.
  fillPoly(pen, [[11.95, y + 0.02], [12.0, y - 0.06], [13.1, y - 0.12], [14.4, y - 0.03], [16.2, y - 0.28], [16.4, y - 0.15], [14.4, y + 0.06], [12.6, y + 0.05]], C.ridgeSnow)
  for (let i = 0; i < 9; i++) {
    const x = 12.2 + i * 0.9 + hash(i, 61) * 0.4
    const yy = y + 0.6 + hash(i, 62) * 2.4
    line(pen, [[x, yy], [x + 0.25, yy + 0.5]], rgba(C.ridgeDark, 0.5), 0.03)
  }
}

export function drawFarRocks(pen: Pen): void {
  fillPoly(pen, ROCK_A, C.ridgeDark)
  fillPoly(pen, [[11.93, FAR_Y - 0.38], [12.35, FAR_Y - 0.57], [12.6, FAR_Y - 0.32], [12.3, FAR_Y - 0.42]], C.ridgeSnow)
  fillPoly(pen, ROCK_B, C.ridgeDark)
  fillPoly(pen, [[14.84, FAR_Y - 0.34], [15.3, FAR_Y - 0.6], [15.75, FAR_Y - 0.41], [15.3, FAR_Y - 0.48]], C.ridgeSnow)
}

/** The snow leopard: pale on pale, long and low, its tail as long again. Barely there. */
export function drawCat(pen: Pen, t: number): void {
  const at = catAt(t)
  if (!at) return
  const { c } = pen
  c.save()
  const s = 0.62
  const x = at.x
  const ground = FAR_Y + 0.1
  // How much of it is to be seen: it comes out of the rock's colour, and goes back into it.
  const a = 0.9
  const bob = at.walking ? Math.abs(Math.sin(at.stride * Math.PI)) * 0.012 : 0
  const body = ground - 0.2 * s - bob
  // Head: toward them (left) while it looks; otherwise along its way.
  const look = t >= CAT_LOOK && t < CAT_LOOK_AWAY ? Math.min(1, (t - CAT_LOOK) / 0.5) * (1 - Math.max(0, Math.min(1, (t - (CAT_LOOK_AWAY - 0.5)) / 0.5))) : 0
  const leg = (hx: number, phase: number) => {
    const sw = at.walking ? Math.sin((at.stride + phase) * Math.PI * 2) * 0.07 * s : 0
    line(pen, [[x + hx * s, body + 0.04 * s], [x + hx * s + sw, ground]], rgba(C.catShade, a), 0.05 * s)
  }
  leg(-0.32, 0.5)
  leg(0.3, 0)
  // The tail: thick, long, low, curling up at its end.
  const sway = Math.sin(t * 1.1) * 0.04
  const tail: Pt[] = []
  for (let i = 0; i <= 14; i++) {
    const u = i / 14
    tail.push([x - 0.42 * s - u * 0.75 * s, body + 0.02 * s + Math.sin(u * Math.PI * 0.9) * 0.1 * s - u * u * u * 0.32 * s + sway * u])
  }
  line(pen, tail, rgba(C.catShade, a), 0.11 * s)
  line(pen, tail, rgba(C.cat, a), 0.075 * s)
  // The body, long and low.
  ellipse(pen, x, body, 0.46 * s, 0.15 * s, rgba(C.cat, a))
  ellipse(pen, x, body + 0.05 * s, 0.4 * s, 0.08 * s, rgba(C.catShade, a * 0.6))
  leg(-0.22, 0)
  leg(0.38, 0.5)
  // Its rosettes: faint.
  for (let i = 0; i < 9; i++) {
    const ux = (hash(i, 71) - 0.5) * 0.7 * s
    const uy = (hash(i, 72) - 0.5) * 0.16 * s
    ellipse(pen, x + ux, body + uy, 0.03 * s, 0.022 * s, rgba(C.spot, 0.55 * a))
  }
  // The head, small, on a short neck; turned to them while it looks.
  const hx = x + 0.5 * s - look * 0.05 * s
  const hy = body - 0.1 * s
  ellipse(pen, hx, hy, 0.12 * s, 0.1 * s, rgba(C.cat, a))
  const ear = look > 0.5 ? -1 : 1
  fillPoly(pen, [[hx - 0.07 * s, hy - 0.07 * s], [hx - 0.04 * s, hy - 0.15 * s], [hx - 0.01 * s, hy - 0.08 * s]], rgba(C.catShade, a))
  fillPoly(pen, [[hx + 0.02 * s, hy - 0.08 * s], [hx + 0.05 * s, hy - 0.15 * s], [hx + 0.08 * s, hy - 0.06 * s]], rgba(C.catShade, a))
  // Its eye: the one thing on it that is not pale, and only a little; on the side it looks.
  ellipse(pen, hx + (look > 0.5 ? -0.05 : 0.06) * s * ear * ear, hy - 0.01 * s, 0.016 * s, 0.012 * s, rgba('#6A6F66', 0.8 * a))
  // Its feet in the snow: a little puff on each step.
  for (const st of [...CAT_STEPS_IN, ...CAT_STEPS_OUT]) {
    const g = t - st
    if (g < 0 || g > 0.5) continue
    ellipse(pen, x + 0.2 * s, ground + 0.01, 0.05 + g * 0.1, 0.012, rgba(C.ridgeSnow, 0.7 * (1 - g / 0.5)))
  }
  c.restore()
}

/* ------------------------------------------------------------------ Sean's tripod */

/** The tripod, the camera on it, and the long lens out over the valley. Sean's eye is at its left end. */
export function drawTripod(pen: Pen, t: number): void {
  const [sx, sy0] = SEAN_AT
  // The eyepiece is at his eye's height, a little under his middle: he is bent to it.
  const sy = sy0 + 0.07
  const head: Pt = [sx + 0.36, sy - 0.04]
  const feet: Pt[] = [[sx + 0.12, LEDGE_Y], [sx + 0.66, LEDGE_Y], [sx + 0.4, LEDGE_Y + 0.02]]
  for (const ft of feet) line(pen, [head, ft], C.tripod, 0.03)
  // The strap under the lens, swung by the wind; its buckle knocks the near leg on the ticks.
  const swing = strapSwing(t)
  const top: Pt = [sx + 0.62, sy - 0.12]
  const low: Pt = [sx + 0.56 + swing * 0.12, sy - 0.0 - Math.abs(swing) * 0.02]
  line(pen, [top, [(top[0] + low[0]) / 2 + 0.03, (top[1] + low[1]) / 2 + 0.03], low], C.strap, 0.022)
  ellipse(pen, low[0], low[1], 0.022, 0.018, '#8B8F92')
  // The camera body, and the lens: long, with a pale band, its hood toward the cat.
  fillPoly(pen, [[sx + 0.16, sy - 0.24], [sx + 0.42, sy - 0.24], [sx + 0.42, sy - 0.04], [sx + 0.16, sy - 0.04]], C.tripod)
  ellipse(pen, sx + 0.15, sy - 0.12, 0.025, 0.04, '#1E2124')
  fillPoly(pen, [[sx + 0.4, sy - 0.2], [sx + 1.1, sy - 0.22], [sx + 1.1, sy - 0.04], [sx + 0.4, sy - 0.06]], C.lens)
  fillPoly(pen, [[sx + 0.66, sy - 0.21], [sx + 0.76, sy - 0.21], [sx + 0.76, sy - 0.05], [sx + 0.66, sy - 0.05]], C.lensBand)
  fillPoly(pen, [[sx + 1.1, sy - 0.24], [sx + 1.3, sy - 0.25], [sx + 1.3, sy - 0.01], [sx + 1.1, sy - 0.02]], mix(C.lens, '#000000', 0.2))
  line(pen, [[sx + 0.42, sy - 0.2], [sx + 1.1, sy - 0.215]], rgba('#FFFFFF', 0.18), 0.012)
  // The ticks: a tiny glint where the buckle meets the leg.
  for (const k of TICKS) {
    const g = t - k
    if (g < 0 || g > 0.3) continue
    glow(pen, low[0], low[1], 0.09, [[0, rgba('#FFFFFF', 0.8 * (1 - g / 0.3))], [1, rgba('#FFFFFF', 0)]])
  }
}

/** The strap's swing, -1..1: the wind lifts it away, and it falls back against the leg on each tick. */
function strapSwing(t: number): number {
  let last = -Infinity
  let next = Infinity
  for (const k of TICKS) {
    if (k <= t) last = k
    else if (k < next) next = k
  }
  const w = 0.25 + 0.5 * level(t)
  if (next < Infinity && next - t < 0.5) {
    // Lifted, and falling to the leg: it meets it on the tick.
    const u = (next - t) / 0.5
    return -w * Math.sin(u * Math.PI * 0.5)
  }
  // After a knock it rebounds a little and then rides the wind.
  const g = t - last
  if (g >= 0 && g < 0.6) return w * 0.3 * Math.sin(g * 9) * Math.exp(-g / 0.25)
  return -w * 0.15 * Math.sin(t * 2.3)
}

/* ------------------------------------------------------------------ what moves on the beats */

/** His landings: a small kick of snow off each step. The gust off the boulder on the downbeat of the build. */
export function drawKicks(pen: Pen, t: number): void {
  for (let i = 0; i < STEPS.length; i++) {
    const g = t - LANDINGS[i]
    if (g < 0 || g > 0.55) continue
    const [x, y] = STEPS[i].p
    const fade = 1 - g / 0.55
    for (let j = -2; j <= 2; j++) {
      if (j === 0) continue
      const vx = j * 0.35
      const vy = -0.55 - Math.abs(j) * 0.1
      ellipse(pen, x + vx * g, Math.min(y + R - 0.01, y + R + vy * g + 3 * g * g), 0.022, 0.022, rgba(C.snow, 0.9 * fade))
    }
  }
  const gg = t - GUST
  if (gg > -0.05 && gg < 3.5) {
    // The plume: torn off the boulder's top and streamed away right, thinning.
    for (let i = 0; i < 70; i++) {
      const delay = hash(i, 81) * 0.5
      const g = gg - delay
      if (g < 0) continue
      const x = BOULDER[0] - 0.6 + hash(i, 82) * 1.2 + g * (2.0 + hash(i, 83) * 1.6)
      const y = BOULDER[1] - 0.15 - hash(i, 84) * 0.15 - g * (0.3 + hash(i, 85) * 0.2) + Math.sin(g * 4 + i) * 0.05
      const a = Math.max(0, 1 - g / (1.6 + hash(i, 86)))
      ellipse(pen, x, y, 0.02 + g * 0.01, 0.016, rgba('#FFFFFF', 0.75 * a))
    }
  }
}

/** Snow sifting from the rock over them: a thin fall, its front landing on the ledge on the beat. */
const SIFT_FALL = 1.5
export function drawSifts(pen: Pen, t: number): void {
  const top = LEDGE_Y - 1.2
  const h = LEDGE_Y - top
  const dur = h / SIFT_FALL
  for (const s of SIFTS) {
    const g = t - (s - dur)
    if (g < 0 || g > dur + 1.2) continue
    for (let i = 0; i < 26; i++) {
      const lag = i * 0.04
      const gi = g - lag
      if (gi < 0) continue
      const y = top + gi * SIFT_FALL
      if (y > LEDGE_Y) continue
      const x = SIFT_X + (hash(i, 91) - 0.5) * 0.08 + Math.sin(gi * 3 + i) * 0.02 + gi * 0.12
      ellipse(pen, x, y, 0.014, 0.014, rgba('#FFFFFF', 0.85))
    }
    const land = t - s
    if (land >= 0 && land < 0.5) ellipse(pen, SIFT_X + 0.1, LEDGE_Y - 0.01, 0.05 + land * 0.2, 0.02, rgba('#FFFFFF', 0.8 * (1 - land / 0.5)))
  }
}

/** The wind: spindrift streaming across the frame, more as the build rises. */
export function drawWind(pen: Pen, f: Frame, t: number): void {
  const lv = level(t)
  const n = Math.round(30 + 90 * Math.max(0, lv - 0.5) * 2)
  const w = f.x1 - f.x0 + 4
  const hgt = f.y1 - f.y0
  for (let i = 0; i < n; i++) {
    const sp = 2.4 + hash(i, 101) * 2
    const x = f.x0 - 2 + ((hash(i, 102) * w + t * sp) % w)
    const y = f.y0 + ((hash(i, 103) * hgt + t * 0.25 + Math.sin(t * 0.7 + i) * 0.2) % hgt)
    const len = 0.05 + sp * 0.03
    line(pen, [[x, y], [x - len, y - len * 0.08]], rgba('#FFFFFF', 0.35 + 0.3 * hash(i, 104)), 0.012)
  }
}


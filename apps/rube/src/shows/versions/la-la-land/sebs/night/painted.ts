import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt } from '../../../../../parts'
import { box, carried, frame, glow, knock, part, rgba, smooth, type PartShot } from '../kit'
import { NIGHT_MAT } from '../worlds'
import {
  barPhase,
  CART_X,
  centre,
  CHIME_HITS,
  CLOCK_X,
  CURTSY_HITS,
  FLY_SET,
  FLY_SKY,
  LAMPS,
  MIA_SPAN,
  miaAt,
  NIGHT_FROM,
  POLE,
  RELEASE,
  scatter,
  sebAt,
  UMBRELLA_HITS,
  UPSTAGE,
  WALTZ,
} from './painted-waltz'
import { drawFloor, drawSky, lampLight } from './stars-sky'

/**
 * Painted Paris: the choral waltz, from the iris to the stars.
 *
 * The iris opens on the two of them standing close under a streetlamp on a
 * painted quay: the river and the far bank's roofs and the tower behind in
 * ultramarine brushwork, a painted sky with a moon and swirls, wet cobbles
 * with red petals on them. When the orchestra comes in under the choir they
 * begin to turn, and waltz along the quay: behind them a line of furled
 * umbrellas on sprung stands, the ensemble, pops open one on each ONE as
 * they pass (five bars), and dances after that, a dip on every ONE, a
 * curtsy together on the accents as the pair nears the great street clock.
 * All along, the clock's hands have been hurrying; they meet at twelve and
 * the bell strikes three. The strokes shake the balloon seller's bunch loose
 * and the balloons go up; and after them the painted sky flies out, and then
 * all of Paris, on its lines, and the stars are behind it.
 *
 * The frame is the NIGHT frame (`painted-waltz.ts`): the ball rests on the
 * floor at y = 0, the quay's parapet stands on the floor's far edge.
 */

/* ------------------------------------------------------------------ the fly-out */

/**
 * How far a layer of the set has gone up at `T`: 0 the painted sky, 1 the far
 * bank, river and parapet, 2 everything standing on the quay. Each takes up
 * on its line with a snatch, then rises heavier and faster.
 */
export function lift(T: number, layer: number): number {
  const start = layer === 0 ? FLY_SKY : FLY_SET
  const s = T - start
  if (s <= 0) return 0
  const a = [1.7, 2.3, 2.7][layer] ?? 2.5
  const snatch = 0.06 * (1 - Math.exp(-s / 0.045))
  const r = Math.max(0, s - 0.16)
  return snatch + 0.5 * a * r * r
}
const SET = { lift }

/* ------------------------------------------------------------------ the painted flats */

/** The far bank's foot, and the top of the parapet (the river between). */
const BANK = -1.52
const PARAPET = -0.98

interface House {
  x0: number
  x1: number
  wall: number
  roof: number
  chimneys: number[]
  windows: Pt[]
}
/** The roofs of the far bank: mansards and chimney pots, a lit window here and there. */
const HOUSES: House[] = (() => {
  const out: House[] = []
  let x = -15
  let i = 0
  while (x < 31) {
    const w = 1.1 + 1.5 * scatter(i, 100)
    const wall = BANK - 0.75 - 0.75 * scatter(i, 101)
    const roof = wall - 0.3 - 0.25 * scatter(i, 102)
    const chimneys: number[] = []
    const nc = Math.floor(scatter(i, 103) * 3)
    for (let c = 0; c < nc; c++) chimneys.push(x + 0.25 + (w - 0.5) * scatter(i * 7 + c, 104))
    const windows: Pt[] = []
    const cols = Math.max(1, Math.floor(w / 0.42))
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < cols; c++) if (scatter(i * 31 + r * 7 + c, 105) < 0.3) windows.push([x + (w * (c + 0.5)) / cols, wall + 0.28 + 0.36 * r])
    out.push({ x0: x, x1: x + w, wall, roof, chimneys, windows })
    x += w
    i++
  }
  return out
})()
const DOME_X = 3.3
const TOWER_X = 13.7

/** Brush swirls on the painted sky, round the same pole the real one will turn on. */
const SWIRLS = Array.from({ length: 22 }, (_, i) => ({
  r: 2.2 + 11 * scatter(i, 110),
  a0: scatter(i, 111) * Math.PI * 2,
  span: 0.5 + 1.0 * scatter(i, 112),
  w: 0.1 + 0.2 * scatter(i, 113),
  white: scatter(i, 114) < 0.25,
}))
/** Painted stars: gold dabs. */
const DABS = Array.from({ length: 30 }, (_, i) => ({ x: -12 + 40 * scatter(i, 120), y: -2.6 - 9 * scatter(i, 121), r: 0.03 + 0.03 * scatter(i, 122) }))
const MOON: Pt = [2.4, -4.35]

function paintedSky(p: p5, k: number, T: number): void {
  const up = lift(T, 0)
  const f = frame(p, k)
  const bottom = BANK - 0.2 - up
  if (bottom < f.y0 - 1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const top = Math.max(f.y0 - 1, -26 - up)
  const g = ctx.createLinearGradient(0, (-14 - up) * k, 0, bottom * k)
  g.addColorStop(0, NIGHT_MAT.deep)
  g.addColorStop(0.55, NIGHT_MAT.cobalt)
  g.addColorStop(1, NIGHT_MAT.ultramarine)
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (bottom - top) * k)
  ctx.save()
  ctx.beginPath()
  ctx.rect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (bottom - top) * k)
  ctx.clip()
  // The swirls: long painted strokes.
  ctx.lineCap = 'round'
  for (const s of SWIRLS) {
    // A spiral stroke as one ribbon, loaded at the start and running dry.
    ctx.fillStyle = rgba(s.white ? NIGHT_MAT.white : NIGHT_MAT.swirl, s.white ? 0.14 : 0.36)
    const n = 14
    const left: Pt[] = []
    const right: Pt[] = []
    for (let j = 0; j <= n; j++) {
      const a = s.a0 + (s.span * j) / n
      const r = s.r * Math.exp(0.16 * (a - s.a0))
      const hw = (s.w / 2) * Math.sin((Math.PI * (j + 0.35)) / (n + 0.7)) ** 0.7
      // Along the spiral, and out across it.
      const cx = POLE[0] + r * Math.cos(a)
      const cy = POLE[1] - up + r * Math.sin(a) * 0.8
      const nx = Math.cos(a)
      const ny = Math.sin(a) * 0.8
      const nl = Math.hypot(nx, ny) || 1
      left.push([cx + (nx / nl) * hw, cy + (ny / nl) * hw])
      right.push([cx - (nx / nl) * hw, cy - (ny / nl) * hw])
    }
    ctx.beginPath()
    ctx.moveTo(left[0][0] * k, left[0][1] * k)
    for (const q of left.slice(1)) ctx.lineTo(q[0] * k, q[1] * k)
    for (const q of right.reverse()) ctx.lineTo(q[0] * k, q[1] * k)
    ctx.closePath()
    ctx.fill()
  }
  for (const d of DABS) {
    glow(p, k, d.x, d.y - up, d.r * 5, NIGHT_MAT.gold, 0.22)
    ctx.fillStyle = rgba(NIGHT_MAT.gold, 0.9)
    ctx.beginPath()
    ctx.arc(d.x * k, (d.y - up) * k, d.r * k, 0, Math.PI * 2)
    ctx.fill()
  }
  // The moon, a painted crescent.
  const mx = MOON[0]
  const my = MOON[1] - up
  glow(p, k, mx, my, 1.6, NIGHT_MAT.gold, 0.2)
  ctx.fillStyle = NIGHT_MAT.gold
  ctx.beginPath()
  ctx.arc(mx * k, my * k, 0.42 * k, -Math.PI * 0.62, Math.PI * 0.62, true)
  ctx.arc((mx - 0.2) * k, (my - 0.05) * k, 0.36 * k, Math.PI * 0.5, -Math.PI * 0.55, false)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // The drop's hem, seen only when it flies.
  if (up > 0.2) {
    ctx.fillStyle = NIGHT_MAT.deep
    ctx.fillRect((f.x0 - 1) * k, (bottom - 0.05) * k, (f.x1 - f.x0 + 2) * k, 0.08 * k)
  }
}

function farBank(p: p5, k: number, T: number): void {
  const up = lift(T, 1)
  const f = frame(p, k)
  if (UPSTAGE - up < f.y0 - 1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(0, -up * k)
  const vis = (h: House) => h.x1 > f.x0 - 1 && h.x0 < f.x1 + 1
  // The tower behind the roofs: painted, with its gold lights.
  {
    const x = TOWER_X
    const base = BANK
    const pts: Pt[] = [
      [x - 1.0, base],
      [x - 0.62, base - 1.2],
      [x - 0.38, base - 2.4],
      [x - 0.2, base - 3.6],
      [x - 0.07, base - 4.8],
      [x - 0.03, base - 5.3],
      [x + 0.03, base - 5.3],
      [x + 0.07, base - 4.8],
      [x + 0.2, base - 3.6],
      [x + 0.38, base - 2.4],
      [x + 0.62, base - 1.2],
      [x + 1.0, base],
    ]
    ctx.fillStyle = mixHex(NIGHT_MAT.cobalt, NIGHT_MAT.deep, 0.3)
    ctx.beginPath()
    ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
    for (const q of pts.slice(1)) ctx.lineTo(q[0] * k, q[1] * k)
    ctx.closePath()
    ctx.fill()
    // Its platforms, and the painted light up it.
    ctx.fillStyle = NIGHT_MAT.cobalt
    for (const [yy, hw] of [[base - 1.95, 0.62], [base - 3.45, 0.32]] as const) ctx.fillRect((x - hw) * k, (yy - 0.07) * k, 2 * hw * k, 0.12 * k)
    ctx.strokeStyle = rgba(NIGHT_MAT.swirl, 0.5)
    ctx.lineWidth = 0.06 * k
    ctx.beginPath()
    ctx.moveTo((x - 0.5) * k, (base - 1.5) * k)
    ctx.quadraticCurveTo((x - 0.18) * k, (base - 3.0) * k, (x - 0.04) * k, (base - 5.1) * k)
    ctx.stroke()
    ctx.strokeStyle = rgba(NIGHT_MAT.gold, 0.9)
    ctx.lineWidth = 0.02 * k
    ctx.beginPath()
    ctx.moveTo(x * k, (base - 5.3) * k)
    ctx.lineTo(x * k, (base - 5.75) * k)
    ctx.stroke()
    for (let i = 0; i < 12; i++) {
      const v = scatter(i, 130)
      const yy = base - 1.2 - 3.9 * v
      const hw = 0.62 * (1 - v) + 0.06
      const xx = x + (scatter(i, 131) * 2 - 1) * hw
      const tw = 0.5 + 0.5 * Math.sin(T * (2 + 3 * scatter(i, 132)) + i)
      glow(p, k, xx, yy, 0.16, NIGHT_MAT.gold, 0.5 * tw)
      ctx.fillStyle = rgba(NIGHT_MAT.gold, 0.6 + 0.4 * tw)
      ctx.fillRect((xx - 0.02) * k, (yy - 0.02) * k, 0.04 * k, 0.04 * k)
    }
  }
  // The dome.
  {
    const x = DOME_X
    ctx.fillStyle = NIGHT_MAT.cobalt
    ctx.fillRect((x - 0.55) * k, (BANK - 1.95) * k, 1.1 * k, 0.6 * k)
    ctx.beginPath()
    ctx.ellipse(x * k, (BANK - 1.95) * k, 0.56 * k, 0.72 * k, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    ctx.fillRect((x - 0.08) * k, (BANK - 2.95) * k, 0.16 * k, 0.3 * k)
    ctx.strokeStyle = rgba(NIGHT_MAT.gold, 0.55)
    ctx.lineWidth = 0.025 * k
    for (const dx of [-0.3, 0, 0.3]) {
      ctx.beginPath()
      ctx.moveTo((x + dx) * k, (BANK - 1.95) * k)
      ctx.quadraticCurveTo((x + dx * 0.55) * k, (BANK - 2.5) * k, x * k, (BANK - 2.66) * k)
      ctx.stroke()
    }
  }
  // The houses: walls, mansards, chimneys, one fill; the roofs a shade darker; a lit window here and there.
  ctx.fillStyle = NIGHT_MAT.cobalt
  ctx.beginPath()
  for (const h of HOUSES) {
    if (!vis(h)) continue
    ctx.rect(h.x0 * k, h.wall * k, (h.x1 - h.x0 + 0.01) * k, (BANK - h.wall + 0.02) * k)
  }
  ctx.fill()
  ctx.fillStyle = mixHex(NIGHT_MAT.cobalt, NIGHT_MAT.deep, 0.45)
  ctx.beginPath()
  for (const h of HOUSES) {
    if (!vis(h)) continue
    const inset = 0.16
    ctx.moveTo(h.x0 * k, h.wall * k)
    ctx.lineTo((h.x0 + inset) * k, h.roof * k)
    ctx.lineTo((h.x1 - inset) * k, h.roof * k)
    ctx.lineTo(h.x1 * k, h.wall * k)
    ctx.closePath()
    for (const cx of h.chimneys) ctx.rect((cx - 0.07) * k, (h.roof - 0.28) * k, 0.14 * k, 0.3 * k)
  }
  ctx.fill()
  // Painted light down the left of each wall: the brushwork.
  ctx.lineCap = 'round'
  for (let i = 0; i < HOUSES.length; i++) {
    const h = HOUSES[i]
    if (!vis(h)) continue
    ctx.strokeStyle = rgba(NIGHT_MAT.swirl, 0.28)
    ctx.lineWidth = 0.09 * k
    ctx.beginPath()
    ctx.moveTo((h.x0 + 0.1) * k, (h.wall + 0.08) * k)
    ctx.lineTo((h.x0 + 0.12) * k, (BANK - 0.12) * k)
    ctx.stroke()
    for (const w of h.windows) {
      glow(p, k, w[0], w[1], 0.22, NIGHT_MAT.gold, 0.3)
      ctx.fillStyle = NIGHT_MAT.gold
      ctx.fillRect((w[0] - 0.045) * k, (w[1] - 0.07) * k, 0.09 * k, 0.13 * k)
    }
  }
  // The river: dark water, painted ripples, the lit windows and the tower drawn down into it.
  ctx.fillStyle = NIGHT_MAT.deep
  ctx.fillRect((f.x0 - 1) * k, BANK * k, (f.x1 - f.x0 + 2) * k, (PARAPET - BANK + 0.02) * k)
  for (let i = 0; i < 26; i++) {
    const x = f.x0 - 1 + ((scatter(i, 140) * 40 + T * 0.05) % (f.x1 - f.x0 + 2))
    const y = BANK + 0.1 + 0.36 * scatter(i, 141)
    ctx.strokeStyle = rgba(NIGHT_MAT.ultramarine, 0.7)
    ctx.lineWidth = 0.04 * k
    ctx.beginPath()
    ctx.moveTo(x * k, y * k)
    ctx.lineTo((x + 0.4 + 0.6 * scatter(i, 142)) * k, y * k)
    ctx.stroke()
  }
  for (const h of HOUSES) {
    if (!vis(h)) continue
    for (const w of h.windows) glow(p, k, w[0] + 0.03 * Math.sin(T * 1.7 + w[0] * 3), BANK + 0.24, 0.26, NIGHT_MAT.gold, 0.28, 0.28, 1)
  }
  glow(p, k, TOWER_X, BANK + 0.25, 0.9, NIGHT_MAT.gold, 0.18, 0.4, 0.5)
  // The quay's parapet: dressed stone, a pale coping, piers.
  ctx.fillStyle = NIGHT_MAT.ultramarine
  ctx.fillRect((f.x0 - 1) * k, PARAPET * k, (f.x1 - f.x0 + 2) * k, (UPSTAGE - PARAPET + 0.01) * k)
  ctx.fillStyle = mixHex(NIGHT_MAT.swirl, NIGHT_MAT.white, 0.2)
  ctx.fillRect((f.x0 - 1) * k, (PARAPET - 0.06) * k, (f.x1 - f.x0 + 2) * k, 0.08 * k)
  ctx.fillStyle = rgba(NIGHT_MAT.swirl, 0.55)
  for (let x = Math.floor((f.x0 - 1) / 3.1) * 3.1 + 0.6; x < f.x1 + 1; x += 3.1) ctx.fillRect(x * k, (PARAPET + 0.02) * k, 0.3 * k, (UPSTAGE - PARAPET - 0.02) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the quay's machines */

/** The umbrellas: where each stands, its colour, and the ONE it opens on. */
const UMBRELLAS = UMBRELLA_HITS.map((t, i) => ({
  x: centre(t)[0] - 0.04,
  at: t,
  color: [NIGHT_MAT.petal, NIGHT_MAT.gold, NIGHT_MAT.balloon[3], NIGHT_MAT.white, NIGHT_MAT.petal][i],
  stripe: [NIGHT_MAT.white, NIGHT_MAT.white, NIGHT_MAT.white, NIGHT_MAT.petal, NIGHT_MAT.white][i],
}))
/** An umbrella's stand stands this far upstage (its foot in the picture). */
const UMB_FOOT = -0.42

/** How open an umbrella is: a snap open, a little past, settled. */
function openOf(s: number): number {
  if (s <= 0) return 0
  return 1 - Math.exp(-s / 0.11) * Math.cos(2 * Math.PI * 2.3 * s)
}

/** A curtsy on each accent: straight down on its spring, and up again slowly. */
function curtsy(T: number): number {
  let c = 0
  for (const h of CURTSY_HITS) {
    const s = T - h
    if (s > 0) c += (1 - Math.exp(-s / 0.035)) * Math.exp(-s / 0.34)
  }
  return c
}

function umbrella(p: p5, k: number, ink: string, weight: number, T: number, u: (typeof UMBRELLAS)[number], i: number): void {
  const up = lift(T, 2)
  const s = T - u.at
  const o = openOf(s)
  // After it opens, it dances: down on each ONE, up through two and three; and a curtsy with the others on the accents.
  const on = smooth(s, 0.2, 1.2)
  const ph = barPhase(T)
  const bob = on * 0.06 * (1 - Math.sin(Math.PI * ph) ** 2) + 0.16 * curtsy(T) * on
  // The curtsy leans each one toward the pair.
  const toward = Math.sign(centre(T)[0] - u.x) || 1
  const tip = 0.2 * curtsy(T) * on * toward + 0.02 * Math.sin(T * 1.3 + i) * on
  const foot = UMB_FOOT - up
  const springTop = foot - 0.3 + bob
  p.push()
  p.translate(u.x * k, 0)
  // The foot and the spring.
  solid(p, ink, weight * 0.8, NIGHT_MAT.deep)
  p.ellipse(0, foot * k, 0.34 * k, 0.08 * k)
  outline(p, ink, weight * 0.7)
  const turns = 5
  p.beginShape()
  for (let j = 0; j <= turns * 2; j++) {
    const y = foot - 0.02 + ((springTop - foot + 0.02) * j) / (turns * 2)
    p.vertex((j % 2 === 0 ? -0.07 : 0.07) * k, y * k)
  }
  p.endShape()
  // The shaft and canopy lean together from the spring's top.
  p.translate(0, springTop * k)
  p.rotate(tip)
  outline(p, ink, weight * 0.8)
  p.line(0, 0, 0, -0.98 * k)
  const crown = -1.02
  const w = 0.12 + 0.74 * o
  const hgt = 0.56 - 0.27 * Math.min(1, o)
  const rim = crown + hgt
  // The gores, turning as it twirls; a gore faces us while its middle is on our side.
  const twirl = on * (T - u.at) * 1.1
  const n = 8
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const rib = (a: number): Pt => [(w / 2) * Math.sin(a), rim]
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((-w / 2) * k, rim * k)
  ctx.bezierCurveTo((-w / 2) * k, (crown + hgt * 0.15) * k, (-w * 0.12) * k, crown * k, 0, crown * k)
  ctx.bezierCurveTo((w * 0.12) * k, crown * k, (w / 2) * k, (crown + hgt * 0.15) * k, (w / 2) * k, rim * k)
  // The scalloped hem between the ribs' tips.
  const scallops = 4
  for (let j = scallops; j > 0; j--) {
    const x1 = -w / 2 + (w * (j - 1)) / scallops
    const xm = (x1 + (-w / 2 + (w * j) / scallops)) / 2
    ctx.quadraticCurveTo(xm * k, (rim - 0.07 * o) * k, x1 * k, rim * k)
  }
  ctx.closePath()
  ctx.fillStyle = u.color
  ctx.fill()
  if (o > 0.15) {
    ctx.clip()
    ctx.fillStyle = u.stripe
    for (let j = 0; j < n; j += 2) {
      const a0 = (j / n) * Math.PI * 2 + twirl
      const a1 = ((j + 1) / n) * Math.PI * 2 + twirl
      if (Math.cos((a0 + a1) / 2) < 0) continue
      const p0 = rib(a0)
      const p1 = rib(a1)
      ctx.beginPath()
      ctx.moveTo(0, crown * k)
      ctx.lineTo(p0[0] * k * 1.05, (p0[1] + 0.05) * k)
      ctx.lineTo(p1[0] * k * 1.05, (p1[1] + 0.05) * k)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
  // Its ink, and the tip.
  outline(p, ink, weight * 0.85)
  p.beginShape()
  p.vertex((-w / 2) * k, rim * k)
  p.bezierVertex((-w / 2) * k, (crown + hgt * 0.15) * k, (-w * 0.12) * k, crown * k, 0, crown * k)
  p.bezierVertex((w * 0.12) * k, crown * k, (w / 2) * k, (crown + hgt * 0.15) * k, (w / 2) * k, rim * k)
  for (let j = scallops; j > 0; j--) {
    const x1 = -w / 2 + (w * (j - 1)) / scallops
    const xm = (x1 + (-w / 2 + (w * j) / scallops)) / 2
    p.quadraticVertex(xm * k, (rim - 0.07 * o) * k, x1 * k, rim * k)
  }
  p.endShape()
  p.line(0, crown * k, 0, (crown - 0.1) * k)
  p.pop()
}

/** A Paris streetlamp: a flared foot, a post, a ladder bar, a lantern alight. */
function lamp(p: p5, k: number, ink: string, weight: number, T: number, x: number): void {
  const up = lift(T, 2)
  const foot = -0.3 - up
  const light = lampLight(T)
  const lx = x
  const ly = foot - 2.42
  glow(p, k, lx, ly, 1.9, NIGHT_MAT.gold, 0.34 * light)
  glow(p, k, lx, ly, 0.55, NIGHT_MAT.gold, 0.35 * light)
  solid(p, ink, weight * 0.9, NIGHT_MAT.deep)
  p.beginShape()
  p.vertex((x - 0.17) * k, foot * k)
  p.vertex((x - 0.12) * k, (foot - 0.12) * k)
  p.vertex((x - 0.06) * k, (foot - 0.42) * k)
  p.vertex((x - 0.04) * k, (foot - 2.2) * k)
  p.vertex((x + 0.04) * k, (foot - 2.2) * k)
  p.vertex((x + 0.06) * k, (foot - 0.42) * k)
  p.vertex((x + 0.12) * k, (foot - 0.12) * k)
  p.vertex((x + 0.17) * k, foot * k)
  p.endShape(p.CLOSE)
  outline(p, ink, weight * 0.8)
  p.line((x - 0.18) * k, (foot - 2.02) * k, (x + 0.18) * k, (foot - 2.02) * k)
  // The lantern: glass narrowing to its foot, a pointed cap.
  solid(p, ink, weight * 0.85, mixHex(NIGHT_MAT.gold, NIGHT_MAT.deep, 1 - (0.25 + 0.75 * light)))
  p.quad((x - 0.07) * k, (foot - 2.22) * k, (x + 0.07) * k, (foot - 2.22) * k, (x + 0.16) * k, (foot - 2.62) * k, (x - 0.16) * k, (foot - 2.62) * k)
  solid(p, ink, weight * 0.85, NIGHT_MAT.deep)
  p.triangle((x - 0.21) * k, (foot - 2.62) * k, (x + 0.21) * k, (foot - 2.62) * k, x * k, (foot - 2.84) * k)
  p.line(x * k, (foot - 2.84) * k, x * k, (foot - 2.93) * k)
}

/* ------------------------------------------------------------------ the clock */

const MIDNIGHT = CHIME_HITS[0]
/** The hands' hurry: a slow evening at the iris, the minutes flying by the time they reach the clock. */
const minuteSpeed = (t: number): number => 0.08 + 3.4 * smooth(t, WALTZ, MIDNIGHT - 0.4) ** 1.6
const MINUTE: Float64Array = (() => {
  const n = Math.ceil((MIDNIGHT - (NIGHT_FROM - 1)) * 100) + 1
  const out = new Float64Array(n)
  out[n - 1] = 0
  for (let i = n - 2; i >= 0; i--) {
    const t = MIDNIGHT - (n - 1 - i) / 100
    out[i] = out[i + 1] - 0.5 * (minuteSpeed(t) + minuteSpeed(t + 0.01)) * 0.01
  }
  return out
})()
/** The minute hand's angle from twelve, unwound: 0 at midnight, when it stops dead (with a small settle). */
function minuteAngle(T: number): number {
  if (T >= MIDNIGHT) return 0.06 * Math.exp(-(T - MIDNIGHT) / 0.12) * Math.sin(2 * Math.PI * 3 * (T - MIDNIGHT))
  const u = (T - (NIGHT_FROM - 1)) * 100
  const i = Math.max(0, Math.min(MINUTE.length - 2, Math.floor(u)))
  const f = Math.max(0, Math.min(1, u - i))
  return MINUTE[i] + (MINUTE[i + 1] - MINUTE[i]) * f
}

const FACE_R = 0.5
const FACE_Y = -3.62

/** The bell's hammer, turned back from the bell: at rest, drawn back before each stroke, thrown at the bell on it, and back. */
function hammer(T: number): number {
  let last = -Infinity
  for (const h of CHIME_HITS) if (T >= h) last = h
  const s0 = T - last
  const after = last === -Infinity ? 0.42 : 0.42 * (1 - Math.exp(-s0 / 0.16)) + 0.05 * Math.exp(-s0 / 0.2) * Math.sin(2 * Math.PI * 2.4 * s0)
  for (const h of CHIME_HITS) {
    const s = T - h
    if (s < -0.28 || s >= 0) continue
    if (s < -0.1) return after + (0.72 - after) * smooth(s, -0.28, -0.1)
    const u = (s + 0.1) / 0.1
    return 0.72 * (1 - u * u)
  }
  return after
}
/** How the struck post and head ring after each stroke (small, low, heavy). */
const shake = (T: number): number => CHIME_HITS.reduce((a, h) => a + (T > h ? 0.018 * Math.exp(-(T - h) / 0.3) * Math.sin(2 * Math.PI * 1.9 * (T - h)) : 0), 0)

function clock(p: p5, k: number, ink: string, weight: number, T: number): void {
  const up = lift(T, 2)
  const x = CLOCK_X
  const foot = -0.38 - up
  const light = 0.35 + 0.65 * lampLight(T)
  // The post.
  solid(p, ink, weight, NIGHT_MAT.cobalt)
  p.rect((x - 0.1) * k, (foot - 2.72) * k, 0.2 * k, 2.3 * k)
  p.rect((x - 0.28) * k, (foot - 0.14) * k, 0.56 * k, 0.14 * k)
  p.quad((x - 0.21) * k, (foot - 0.14) * k, (x + 0.21) * k, (foot - 0.14) * k, (x + 0.15) * k, (foot - 0.5) * k, (x - 0.15) * k, (foot - 0.5) * k)
  p.rect((x - 0.17) * k, (foot - 0.58) * k, 0.34 * k, 0.08 * k)
  p.rect((x - 0.2) * k, (foot - 2.86) * k, 0.4 * k, 0.14 * k)
  outline(p, rgba(NIGHT_MAT.swirl, 0.8), weight * 0.6)
  p.line((x - 0.03) * k, (foot - 0.6) * k, (x - 0.03) * k, (foot - 2.62) * k)
  // The head rings a little on each stroke, about the top of the post.
  p.push()
  p.translate(x * k, (foot - 2.86) * k)
  p.rotate(shake(T))
  const fy = FACE_Y - (-0.38) + 2.86
  const chimeGlow = CHIME_HITS.reduce((a, h) => a + 0.5 * knock(T - h, 0.3), 0)
  glow(p, k, 0, fy, 1.2, NIGHT_MAT.white, (0.2 + 0.4 * chimeGlow) * light)
  solid(p, ink, weight, NIGHT_MAT.gold)
  p.circle(0, fy * k, (FACE_R + 0.08) * 2 * k)
  solid(p, ink, weight * 0.8, mixHex(NIGHT_MAT.white, NIGHT_MAT.gold, 0.12))
  p.circle(0, fy * k, FACE_R * 2 * k)
  outline(p, NIGHT_MAT.deep, weight * 0.75)
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2
    const r0 = h % 3 === 0 ? FACE_R * 0.72 : FACE_R * 0.82
    p.line(Math.sin(a) * r0 * k, (fy - Math.cos(a) * r0) * k, Math.sin(a) * FACE_R * 0.92 * k, (fy - Math.cos(a) * FACE_R * 0.92) * k)
  }
  const m = minuteAngle(T)
  const hr = m / 12
  // The hands: dark on the lit face, the hour's short and broad, the minute's long.
  p.noStroke()
  p.fill(NIGHT_MAT.deep)
  const hand = (a: number, len: number, w: number) => {
    const sx = Math.sin(a)
    const cy = -Math.cos(a)
    p.quad((-cy * w) * k, (fy + sx * w) * k, (sx * len) * k, (fy + cy * len) * k, (cy * w) * k, (fy - sx * w) * k, (-sx * 0.08) * k, (fy - cy * 0.08) * k)
  }
  hand(hr, FACE_R * 0.52, 0.045)
  hand(m, FACE_R * 0.82, 0.03)
  p.circle(0, fy * k, 0.08 * k)
  // The bell in its little iron arch on top, and its hammer.
  const top = fy - FACE_R - 0.08
  outline(p, ink, weight * 0.85)
  p.noFill()
  p.arc(0, (top - 0.02) * k, 0.56 * k, 0.9 * k, Math.PI, Math.PI * 2)
  const bellSwing = CHIME_HITS.reduce((a, h) => a + (T > h ? 0.14 * Math.exp(-(T - h) / 0.35) * Math.sin(2 * Math.PI * 2.1 * (T - h)) : 0), 0)
  p.push()
  p.translate(0, (top - 0.44) * k)
  p.rotate(bellSwing)
  solid(p, ink, weight * 0.85, NIGHT_MAT.gold)
  p.beginShape()
  p.vertex(-0.05 * k, 0)
  p.vertex(0.05 * k, 0)
  p.bezierVertex(0.13 * k, 0.05 * k, 0.12 * k, 0.2 * k, 0.19 * k, 0.3 * k)
  p.vertex(-0.19 * k, 0.3 * k)
  p.bezierVertex(-0.12 * k, 0.2 * k, -0.13 * k, 0.05 * k, -0.05 * k, 0)
  p.endShape(p.CLOSE)
  p.pop()
  glow(p, k, 0, top - 0.26, 0.8, NIGHT_MAT.gold, 0.55 * chimeGlow)
  // The hammer: an arm from the arch's right foot, its head to the bell's lip.
  p.push()
  p.translate(0.31 * k, (top - 0.02) * k)
  p.rotate(-hammer(T))
  outline(p, ink, weight * 0.9)
  p.line(0, 0, -0.14 * k, -0.24 * k)
  solid(p, ink, weight * 0.7, NIGHT_MAT.gold)
  p.circle(-0.14 * k, -0.24 * k, 0.09 * k)
  p.pop()
  p.pop()
}

/* ------------------------------------------------------------------ the balloons */

const BALLOONS = [
  { dx: -0.34, dy: -1.55, c: NIGHT_MAT.petal },
  { dx: 0.02, dy: -1.9, c: NIGHT_MAT.balloon[3] },
  { dx: 0.36, dy: -1.6, c: NIGHT_MAT.white },
  { dx: -0.16, dy: -2.3, c: NIGHT_MAT.white },
  { dx: 0.26, dy: -2.22, c: NIGHT_MAT.petal },
  { dx: -0.5, dy: -2.05, c: NIGHT_MAT.balloon[3] },
]
/** The knot on the seller's cart. */
const KNOT: Pt = [CART_X, -1.36]

function balloonAt(T: number, i: number): { x: number; y: number; free: number } {
  const b = BALLOONS[i]
  const sway = 0.06 * Math.sin(T * (0.8 + 0.13 * i) + i * 1.7)
  const jig = CHIME_HITS.reduce((a, h) => a + (T > h ? 0.07 * Math.exp(-(T - h) / 0.35) * Math.sin(2 * Math.PI * 1.7 * (T - h) + i) : 0), 0)
  const s = T - RELEASE - 0.05 * i
  let x = KNOT[0] + b.dx + sway + jig
  let y = KNOT[1] + b.dy - Math.abs(jig) * 0.4
  if (s > 0) {
    // Buoyant: gathering speed up to a steady rise, spreading as they go.
    const vt = 3.3
    const tau = 1.25
    y -= vt * (s - tau * (1 - Math.exp(-s / tau)))
    x += b.dx * 0.8 * (1 - Math.exp(-s / 1.4)) + 0.25 * Math.sin(s * 1.3 + i)
  }
  return { x, y, free: s > 0 ? s : 0 }
}

function balloons(p: p5, k: number, ink: string, weight: number, T: number): void {
  const up = lift(T, 2)
  // The cart: a box on two wheels, a handle, a mast with the knot.
  const cx = CART_X
  const foot = -0.34 - up
  solid(p, ink, weight * 0.9, NIGHT_MAT.deep)
  p.rect((cx - 0.44) * k, (foot - 0.78) * k, 0.88 * k, 0.4 * k)
  outline(p, ink, weight * 0.8)
  p.line((cx + 0.44) * k, (foot - 0.62) * k, (cx + 0.95) * k, (foot - 0.12) * k)
  p.line(cx * k, (foot - 0.78) * k, cx * k, (KNOT[1] - up) * k)
  for (const wx of [cx - 0.24, cx + 0.24]) {
    solid(p, ink, weight * 0.8, NIGHT_MAT.cobalt)
    p.circle(wx * k, (foot - 0.2) * k, 0.4 * k)
    outline(p, ink, weight * 0.6)
    const r = 0.2
    for (let j = 0; j < 3; j++) {
      const a = (j / 3) * Math.PI
      p.line((wx - Math.cos(a) * r) * k, (foot - 0.2 - Math.sin(a) * r) * k, (wx + Math.cos(a) * r) * k, (foot - 0.2 + Math.sin(a) * r) * k)
    }
  }
  p.noStroke()
  p.fill(NIGHT_MAT.gold)
  p.rect((cx - 0.44) * k, (foot - 0.58) * k, 0.88 * k, 0.04 * k)
  for (let i = 0; i < BALLOONS.length; i++) {
    const b = balloonAt(T, i)
    const bx = b.x
    const by = b.y - (b.free > 0 ? 0 : up)
    // The string: to the knot while tied, trailing free after.
    outline(p, rgba(ink, 0.75), weight * 0.5)
    p.noFill()
    const sx = bx
    const sy = by + 0.2
    if (b.free <= 0) p.bezier(sx * k, sy * k, sx * k, (sy + 0.5) * k, KNOT[0] * k, (KNOT[1] - up - 0.4) * k, KNOT[0] * k, (KNOT[1] - up) * k)
    else {
      const trail = 0.95
      const wag = 0.18 * Math.sin(b.free * 3 + i)
      p.bezier(sx * k, sy * k, (sx + wag) * k, (sy + trail * 0.4) * k, (sx - wag) * k, (sy + trail * 0.7) * k, (sx + wag * 0.5) * k, (sy + trail) * k)
    }
    solid(p, ink, weight * 0.8, BALLOONS[i].c)
    p.ellipse(bx * k, by * k, 0.32 * k, 0.38 * k)
    p.triangle((bx - 0.04) * k, (by + 0.21) * k, (bx + 0.04) * k, (by + 0.21) * k, bx * k, (by + 0.17) * k)
    p.noFill()
    p.stroke(rgba(NIGHT_MAT.white, 0.7))
    p.strokeWeight(weight * 0.9)
    p.arc((bx - 0.03) * k, (by - 0.03) * k, 0.2 * k, 0.24 * k, Math.PI * 1.1, Math.PI * 1.45)
  }
}

/* ------------------------------------------------------------------ the petals */

/** Red petals on the cobbles; the ones on the pair's line are lifted as they turn past and settle behind them. */
const PETALS = Array.from({ length: 24 }, (_, i) => {
  const x = -2.5 + 14 * scatter(i, 150)
  const y = UPSTAGE + 0.3 + 1.6 * scatter(i, 151) ** 1.6
  // When the pair's centre comes by.
  let pass = Infinity
  for (let t = WALTZ; t < FLY_SET; t += 0.02) if (centre(t)[0] >= x) { pass = t; break }
  return { x, y, a: scatter(i, 152) * Math.PI, pass, near: Math.abs(y) < 0.5 }
})

function petals(p: p5, k: number, T: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const fade = 0.3 + 0.7 * lampLight(T)
  ctx.fillStyle = rgba(NIGHT_MAT.petal, 0.95 * fade)
  for (const q of PETALS) {
    let x = q.x
    let y = q.y
    let a = q.a
    if (q.near && T > q.pass - 0.35) {
      const s = Math.min(1, (T - q.pass + 0.35) / 1.9)
      const hop = Math.sin(Math.PI * s) ** 2
      x += 0.45 * smooth(s, 0, 1)
      y -= 0.34 * hop
      a += 5 * smooth(s, 0, 1)
    }
    ctx.save()
    ctx.translate(x * k, y * k)
    ctx.rotate(a)
    ctx.beginPath()
    ctx.ellipse(0, 0, 0.055 * k, 0.03 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the part */

/** Every strike in painted Paris: five umbrellas, four curtsies, midnight's three strokes, the balloons. */
export const PAINTED_HITS = [...UMBRELLA_HITS, ...CURTSY_HITS, ...CHIME_HITS, RELEASE]

interface PaintedState {
  begin: number
}

export const painted = part<PaintedState>(
  {
    name: 'painted',
    draw(p, s, c) {
      const T = s.begin + c.t
      const k = c.k
      p.push()
      p.rectMode(p.CORNER)
      p.ellipseMode(p.CENTER)
      drawSky(p, k, T)
      paintedSky(p, k, T)
      farBank(p, k, T)
      drawFloor(p, k, T, SET)
      petals(p, k, T)
      if (lift(T, 2) < 14) {
        for (const x of LAMPS) lamp(p, k, c.ink, c.weight, T, x)
        UMBRELLAS.forEach((u, i) => umbrella(p, k, c.ink, c.weight, T, u, i))
        clock(p, k, c.ink, c.weight, T)
      }
      balloons(p, k, c.ink, c.weight, T)
      p.pop()
    },
  },
  (slot) => {
    const span = slot.end - slot.begin
    const at = (a: number): Pt => sebAt(slot.begin + a)
    const end = at(span)
    // He comes in at the part's door, (-0.5, 0), and settles onto his waltz path in the dark before the iris opens.
    const settle = 0.4
    const segs = [{ from: [-0.5, 0] as Pt, to: at(settle), dur: settle, ease: 'inout' as const }, ...carried(at, settle, span, Math.ceil((span - settle) * 30))]
    return {
      cells: box(-14, -16, 30, 8, 2),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: WALTZ - slot.begin },
      state: { begin: slot.begin },
      company: [
        {
          from: MIA_SPAN[0],
          to: MIA_SPAN[1],
          who: 'mia',
          at: (T) => {
            const m = miaAt(T)
            return { x: m[0], y: m[1] }
          },
        },
      ],
    }
  },
  (slot): PartShot[] => {
    const c = (t: number, dy = 0, dx = 0): Pt => {
      const q = centre(t)
      return [q[0] + dx, q[1] + dy]
    }
    return [
      // The iris opens on him, close; they are still under the lamp.
      { t: slot.begin, cells: 4.3, hold: [-0.6, -1.0] },
      { t: WALTZ - 0.3, cells: 4.6, hold: c(WALTZ, -1.0, -0.1) },
      // Out, as the orchestra comes in, to the quay and the umbrellas opening along it.
      { t: 276.2, cells: 6.0, hold: c(276.2, -1.45, 0.4) },
      { t: 279.4, cells: 6.3, hold: c(279.4, -1.6, 0.4) },
      { t: 286.5, cells: 6.6, hold: c(286.5, -1.8, 0.6) },
      // The clock: its bell at the top of the frame, the two of them under it.
      { t: MIDNIGHT - 0.5, cells: 6.2, hold: [CLOCK_X - 0.1, -1.62] },
      { t: RELEASE - 0.3, cells: 6.6, hold: [CLOCK_X + 0.4, -1.85] },
      { t: slot.end, cells: 9.2, hold: [CLOCK_X + 0.2, -3.0] },
    ]
  },
)

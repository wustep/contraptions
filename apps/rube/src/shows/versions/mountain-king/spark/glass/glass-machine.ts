import { mixHex, type Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { GLASS } from '../worlds'
import {
  BASE_Y,
  BED_Y,
  BELT_GO,
  BELT_Y,
  BODY_W,
  BODY_Y,
  BOTTLE_H,
  CART,
  CLAP,
  FLOOR_Y,
  HALF,
  HISS,
  JAW_TOP,
  LEHR,
  MOULD_X,
  NECK_W,
  OPEN,
  ORGAN,
  PINGS,
  PIPE_LEN,
  PIPE_R,
  PIPE_UP,
  PLOP,
  RACK,
  RAIL,
  RINGS,
  SAND_Y,
  SHOULDER_Y,
  SNAP,
  STOP,
  TIP0,
  WHEEL_R,
  ZONES,
  beltAt,
  bellowsOpen,
  bottleAt,
  bottleHeat,
  bottleOutline,
  bubbleAt,
  doorAngle,
  glassOutline,
  hollowAt,
  pipeTurn,
  railAt,
  ringOf,
  sagAt,
  shiverOf,
  tipAt,
  travel,
  upBottle,
  wheelTurn,
  type Tuned,
} from './glass-plan'
import { arcPts, box4, clipTo, fillWith, glow, rgba, roundBox, shape, strokeLine, tongue, turn, type Pen } from './glass-pen'
import type { View } from './glass-shop'

/**
 * The glassworks' machine: the blowing cart on its rail, the glass on the pipe, the mould, the lehr and the bottle
 * it carries, and the organ of finished bottles.
 */

const LEATHER = mixHex(GLASS.woodDeep, GLASS.brickDeep, 0.45)
const BRASS = mixHex(GLASS.amber, GLASS.steel, 0.3)
const WARM_INK = (ink: string) => mixHex(ink, GLASS.brickDeep, 0.55)
const thin = (pen: Pen, f = 0.5) => Math.max(0.6, pen.w * f)

/* ------------------------------------------------------------------ the bench and its rail */

export function drawBench(pen: Pen): void {
  const { x0, x1 } = RAIL
  const top = (x: number) => railAt(x)
  // Trestles: splayed legs down to the floor, a stretcher across.
  for (const lx of [x0 + 0.55, (x0 + x1) / 2 - 0.4, x1 - 0.85]) {
    const y = top(lx) + 0.3
    for (const s of [-1, 1]) shape(pen, [[lx - 0.05, y], [lx + 0.05, y], [lx + s * 0.34 + 0.05, FLOOR_Y], [lx + s * 0.34 - 0.05, FLOOR_Y]], GLASS.woodDeep, 0.8)
    const sy = y + (FLOOR_Y - y) * 0.62
    const sw = 0.34 * ((sy - y) / (FLOOR_Y - y)) + 0.06
    shape(pen, box4(lx - sw, sy - 0.04, lx + sw, sy + 0.04), GLASS.woodDeep, 0.7)
  }
  // The bench's beam, and the iron rail along it.
  shape(pen, [[x0, top(x0) + 0.06], [x1, top(x1) + 0.06], [x1, top(x1) + 0.32], [x0, top(x0) + 0.32]], GLASS.wood, 0.9)
  strokeLine(pen, [[x0 + 0.05, top(x0) + 0.19], [x1 - 0.05, top(x1) + 0.19]], rgba(GLASS.woodDeep, 0.5), thin(pen, 0.45))
  shape(pen, [[x0, top(x0)], [x1, top(x1)], [x1, top(x1) + 0.06], [x0, top(x0) + 0.06]], GLASS.steel, 0.7)
  // The rest it started from, and the buffer it runs up to.
  shape(pen, roundBox(x0 - 0.12, top(x0) - 0.2, x0 + 0.08, top(x0) + 0.06, 0.04), GLASS.woodDeep, 0.8)
  shape(pen, roundBox(x1 - 0.05, top(x1) - 0.3, x1 + 0.2, top(x1) + 0.06, 0.04), GLASS.woodDeep, 0.8)
  shape(pen, box4(x1 - 0.1, top(x1) - 0.24, x1 - 0.04, top(x1) - 0.02), GLASS.iron, 0.6)
}

/* ------------------------------------------------------------------ the blowing cart */

/** A spoked iron wheel. */
function wheel(pen: Pen, c: Pt, r: number, a: number): void {
  shape(pen, arcPts(c[0], c[1], r, r, 0, Math.PI * 2, 24), GLASS.iron, 0.9)
  shape(pen, arcPts(c[0], c[1], r * 0.74, r * 0.74, 0, Math.PI * 2, 20), GLASS.steel, 0.6)
  for (let i = 0; i < 5; i++) {
    const b = a + (i / 5) * Math.PI * 2
    strokeLine(pen, [[c[0] + Math.cos(b) * r * 0.2, c[1] + Math.sin(b) * r * 0.2], [c[0] + Math.cos(b) * r * 0.74, c[1] + Math.sin(b) * r * 0.74]], GLASS.iron, Math.max(1, pen.w * 0.9))
  }
  shape(pen, arcPts(c[0], c[1], r * 0.22, r * 0.22, 0, Math.PI * 2, 12), GLASS.iron, 0.6)
}

export function drawCart(pen: Pen, t: number): void {
  const X = TIP0 + travel(t)
  const at = (x: number, h: number): Pt => [x, railAt(x) - h]
  const [, tipY] = tipAt(t)
  // The pipe runs from its mouthpiece to the tip; the tip carries the mould's shake.
  const mx = X - PIPE_LEN
  const pipeAt = (x: number): Pt => {
    const f = (x - mx) / PIPE_LEN
    const [, y0] = at(mx, PIPE_UP)
    return [x, y0 + (tipY - y0) * f]
  }
  // The chassis.
  const ch0 = X - CART.rear - 0.38
  const ch1 = X - CART.front + 0.36
  shape(pen, [at(ch0, 0.3), at(ch1, 0.3), at(ch1, 0.16), at(ch0, 0.16)], GLASS.iron, 0.9)
  // The bellows on its bed: two boards hinged at the back, the leather between them pleated, the top board worked by
  // the crank on the front wheel.
  const hx = X - 3.62
  const fx = X - 2.34
  const wf: Pt = at(X - CART.front, WHEEL_R)
  const phi = wheelTurn(t)
  const pin: Pt = [wf[0] + 0.11 * Math.sin(phi), wf[1] - 0.11 * Math.cos(phi)]
  const open = bellowsOpen(t)
  const bottom = 0.34
  const lift = 0.05 + 0.46 * open
  const hinge: Pt = at(hx, bottom + 0.06)
  const free: Pt = at(fx, bottom + 0.06 + lift)
  const low: Pt = at(fx, bottom + 0.06)
  // The leather: a fan of pleats from the hinge to the free end, folding in as it closes.
  const folds = 5
  const pleats: Pt[] = []
  for (let i = 0; i <= folds * 2; i++) {
    const f = i / (folds * 2)
    pleats.push([fx - (i % 2 ? 0.12 : 0.0) * (0.35 + open * 0.65), low[1] + (free[1] - low[1]) * f])
  }
  shape(pen, [hinge, ...pleats, free], LEATHER, 0.8)
  for (let i = 0; i < folds * 2; i += 2) {
    fillWith(pen, [[hinge[0] + 0.1, hinge[1] + (free[1] - hinge[1]) * 0.05], pleats[i], pleats[i + 1]], rgba(GLASS.woodDeep, 0.45))
  }
  // The boards: the bottom one fixed on the bed, the top one rocking.
  shape(pen, [at(hx - 0.1, bottom), at(fx + 0.06, bottom), at(fx + 0.06, bottom + 0.06), at(hx - 0.1, bottom + 0.06)], GLASS.wood, 0.8)
  const along: Pt = [free[0] - hinge[0], free[1] - hinge[1]]
  const L = Math.hypot(along[0], along[1])
  const nx = along[1] / L
  const ny = -along[0] / L
  const tip: Pt = [free[0] + (0.08 * along[0]) / L, free[1] + (0.08 * along[1]) / L]
  shape(pen, [[hinge[0] - 0.1 * along[0] / L, hinge[1] - 0.1 * along[1] / L], tip, [tip[0] + nx * 0.07, tip[1] + ny * 0.07], [hinge[0] + nx * 0.07 - 0.1 * along[0] / L, hinge[1] + ny * 0.07 - 0.1 * along[1] / L]], GLASS.wood, 0.8)
  // The crank rod, from the wheel's pin up to a lug halfway along the board (where the board's stroke is the pin's).
  const f = 0.22 / 0.46
  const lug: Pt = [hinge[0] + along[0] * f + nx * 0.07, hinge[1] + along[1] * f + ny * 0.07]
  strokeLine(pen, [pin, lug], pen.ink, Math.max(1.5, 0.05 * pen.k))
  strokeLine(pen, [pin, lug], GLASS.steel, Math.max(0.8, 0.025 * pen.k))
  shape(pen, arcPts(lug[0], lug[1], 0.03, 0.03, 0, Math.PI * 2, 8), BRASS, 0.5)
  // The nozzle, and the hose up to the pipe's mouthpiece.
  const nz: Pt = at(hx - 0.14, bottom + 0.1)
  shape(pen, [[hinge[0] - 0.08, hinge[1] - 0.06], [nz[0] - 0.14, nz[1] - 0.025], [nz[0] - 0.14, nz[1] + 0.025], [hinge[0] - 0.08, hinge[1] + 0.03]], BRASS, 0.7)
  const mp = pipeAt(mx + 0.05)
  const hose: Pt[] = []
  for (let i = 0; i <= 16; i++) {
    const u = i / 16
    const a: Pt = [nz[0] - 0.14, nz[1]]
    const c1: Pt = [a[0] - 0.55, a[1] + 0.12]
    const c2: Pt = [mp[0] + 0.05, mp[1] + 0.55]
    const b: Pt = [mp[0], mp[1] + 0.05]
    const v = 1 - u
    hose.push([v ** 3 * a[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u ** 3 * b[0], v ** 3 * a[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u ** 3 * b[1]])
  }
  strokeLine(pen, hose, pen.ink, Math.max(2, 0.085 * pen.k))
  strokeLine(pen, hose, LEATHER, Math.max(1, 0.055 * pen.k))
  // The wheels (the front one with its crank pin).
  const turnA = wheelTurn(t)
  wheel(pen, at(X - CART.rear, WHEEL_R), WHEEL_R, turnA)
  wheel(pen, wf, WHEEL_R, turnA)
  shape(pen, arcPts(pin[0], pin[1], 0.035, 0.035, 0, Math.PI * 2, 10), BRASS, 0.6)
  // The yokes, their rollers under the pipe.
  for (const yk of [X - CART.yokeF, X - CART.yokeR]) {
    const foot = at(yk, 0.3)
    const head = pipeAt(yk)
    const top = head[1] + PIPE_R + 0.03
    shape(pen, box4(yk - 0.04, top, yk + 0.04, foot[1]), GLASS.iron, 0.8)
    shape(pen, [[yk - 0.16, top - 0.12], [yk - 0.1, top - 0.12], [yk - 0.08, top], [yk + 0.08, top], [yk + 0.1, top - 0.12], [yk + 0.16, top - 0.12], [yk + 0.14, top + 0.06], [yk - 0.14, top + 0.06]], GLASS.iron, 0.8)
    for (const s of [-1, 1]) shape(pen, arcPts(yk + s * 0.06, head[1] + PIPE_R + 0.02, 0.035, 0.035, 0, Math.PI * 2, 10), GLASS.steel, 0.6)
  }
  // The pipe: steel, red hot toward its tip.
  const p0 = pipeAt(mx)
  const p1: Pt = [X, tipY]
  const pipe: Pt[] = [[p0[0], p0[1] - PIPE_R], [p1[0], p1[1] - PIPE_R], [p1[0], p1[1] + PIPE_R], [p0[0], p0[1] + PIPE_R]]
  shape(pen, pipe, GLASS.steel, 0.8)
  const { ctx, k } = pen
  const hot = ctx.createLinearGradient((X - 1.1) * k, 0, X * k, 0)
  hot.addColorStop(0, rgba(GLASS.molten, 0))
  hot.addColorStop(1, rgba(GLASS.molten, 0.9))
  fillWith(pen, [[X - 1.1, p1[1] - PIPE_R], [X, p1[1] - PIPE_R], [X, p1[1] + PIPE_R], [X - 1.1, p1[1] + PIPE_R]], hot)
  strokeLine(pen, [[p0[0] + 0.7, p0[1] - PIPE_R * 0.35], [X - 1.15, p1[1] - PIPE_R * 0.35]], rgba(GLASS.light, 0.7), thin(pen))
  // Its grip, wound round: the winding shows it turning.
  const g0 = mx + 0.14
  const g1 = mx + 0.78
  const gy = (x: number) => pipeAt(x)[1]
  shape(pen, [[g0, gy(g0) - 0.08], [g1, gy(g1) - 0.08], [g1, gy(g1) + 0.08], [g0, gy(g0) + 0.08]], GLASS.wood, 0.8)
  clipTo(pen, [[g0, gy(g0) - 0.08], [g1, gy(g1) - 0.08], [g1, gy(g1) + 0.08], [g0, gy(g0) + 0.08]], () => {
    const turnP = pipeTurn(t) / (Math.PI * 2)
    for (let i = -1; i < 6; i++) {
      const x = g0 + ((((i + turnP * 2) % 6) + 6) % 6) * 0.13
      strokeLine(pen, [[x - 0.05, gy(x) + 0.09], [x + 0.05, gy(x) - 0.09]], GLASS.woodDeep, Math.max(1, 0.03 * k))
    }
  })
  shape(pen, [[mx - 0.03, gy(mx) - 0.05], [mx + 0.14, gy(mx) - 0.065], [mx + 0.14, gy(mx) + 0.065], [mx - 0.03, gy(mx) + 0.05]], BRASS, 0.7)
}

/* ------------------------------------------------------------------ glass */

/** The colour of glass at a heat: molten gold-orange, cooling through amber to sea-green. */
export function glassColor(heat: number): string {
  if (heat > 0.66) return mixHex(GLASS.amber, GLASS.molten, (heat - 0.66) / 0.34)
  const olive = mixHex(GLASS.amber, GLASS.glassDeep, 0.55)
  if (heat > 0.33) return mixHex(olive, GLASS.amber, (heat - 0.33) / 0.33)
  return mixHex(GLASS.glass, olive, heat / 0.33)
}

/** An outline pulled in toward its middle by `d` cells (for a wall's inside), about (cx, cy). */
function inset(pts: Pt[], cx: number, cy: number, d: number): Pt[] {
  return pts.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const r = Math.hypot(dx, dy)
    if (r < 1e-6) return [x, y] as Pt
    const f = Math.max(0, (r - d) / r)
    return [cx + dx * f, cy + dy * f] as Pt
  })
}

/**
 * Molten glass: it glows from inside, white-gold at its heart and deep orange at its skin, with the day's light on
 * its shoulder. `hollow` 0..1 shows a blown bubble's thin wall (its inside paler). `a` fades it all.
 */
function molten(pen: Pen, pts: Pt[], heat: number, hollow: number, a = 1): void {
  let cx = 0
  let cy = 0
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const [x, y] of pts) {
    cx += x
    cy += y
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  cx /= pts.length
  cy /= pts.length
  const size = Math.max(x1 - x0, y1 - y0) / 2
  glow(pen, cx, cy, size * 2.2 + 0.5, GLASS.furnace, 0.32 * heat * a, size * 0.5)
  // The skin: deep orange, going to the glass's own colour as it cools.
  const skin = mixHex(glassColor(heat), GLASS.brick, 0.28 * heat)
  shape(pen, pts, rgba(skin, a), 0)
  // The heart: white-gold, glowing out from inside.
  const { ctx, k } = pen
  const g = ctx.createRadialGradient(cx * k, (cy + size * 0.1) * k, 0, cx * k, cy * k, size * 1.05 * k)
  g.addColorStop(0, rgba(GLASS.moltenHot, 0.95 * heat * a))
  g.addColorStop(0.55, rgba(mixHex(GLASS.moltenHot, GLASS.molten, 0.5), 0.75 * heat * a))
  g.addColorStop(1, rgba(GLASS.molten, 0))
  fillWith(pen, pts, g)
  // A blown bubble: its inside, paler, inside a wall.
  if (hollow > 0.01) {
    const wall = Math.max(0.06, size * 0.16)
    fillWith(pen, inset(pts, cx, cy, wall), rgba(mixHex(GLASS.moltenHot, GLASS.light, 0.45), 0.55 * hollow * a))
  }
  // The day on its shoulder: a streak of window light round its upper west.
  const streak: Pt[] = []
  for (const [x, y] of pts) {
    const ang = Math.atan2(y - cy, x - cx)
    if (ang > -2.55 && ang < -1.75) streak.push([cx + (x - cx) * 0.8, cy + (y - cy) * 0.8])
  }
  if (streak.length > 1) {
    streak.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx))
    strokeLine(pen, streak, rgba(GLASS.light, 0.85 * a), Math.max(1.2, 0.05 * pen.k))
  }
  shape(pen, pts, null, 0.7, rgba(WARM_INK(pen.ink), a))
}

export function drawGlassOnPipe(pen: Pen, t: number): void {
  if (t >= CLAP) return
  const pts = glassOutline(t)
  // A drip hangs from the gather while it is left still, and is turned back up as the pipe turns.
  const sag = sagAt(t)
  if (sag > 0.01) {
    let lo = pts[0]
    for (const q of pts) if (q[1] > lo[1]) lo = q
    const len = 0.1 + 1.3 * sag
    const sway = 0.02 * Math.sin(t * 3.1)
    const drip = tongue(lo[0] - 0.02, lo[1] - 0.05, 0.16, -len, sway)
    shape(pen, drip, mixHex(GLASS.molten, GLASS.brick, 0.28), 0.6, WARM_INK(pen.ink))
    glow(pen, lo[0], lo[1] + len * 0.5, 0.18, GLASS.moltenHot, 0.4)
  }
  molten(pen, pts, 1, hollowAt(t) * (1 - smooth(t, STOP - 0.4, CLAP - 0.2)))
  // While the pipe turns, bands of hotter glass go round it: it is being rolled.
  const rolling = smooth(t, PLOP, PLOP + 0.4) * (1 - smooth(t, STOP - 0.3, STOP + 0.3))
  if (rolling > 0.01) {
    const b = bubbleAt(t)
    clipTo(pen, pts, () => {
      for (let i = 0; i < 3; i++) {
        const a = pipeTurn(t) + (i / 3) * Math.PI * 2
        const face = Math.cos(a)
        if (face <= 0) continue
        const y = b.cy + b.ry * Math.sin(a) * 0.9
        const band: Pt[] = []
        for (let j = 0; j <= 10; j++) {
          const u = -1 + (2 * j) / 10
          const half = b.rx * Math.sqrt(Math.max(0, 1 - ((y - b.cy) / b.ry) ** 2))
          band.push([b.cx + u * half, y + 0.04 * (1 - u * u) * face])
        }
        strokeLine(pen, band, rgba(GLASS.moltenHot, 0.6 * face * rolling), Math.max(1, 0.035 * pen.k))
      }
    })
  }
}

/* ------------------------------------------------------------------ the bottle, and its thread */

/** The bottle's outline, stood where it is and leant as it is. */
export function bottlePts(t: number): Pt[] {
  const b = bottleAt(t)
  const base: Pt = [b.x, b.y]
  return bottleOutline(b.x, b.y - BOTTLE_H, b.y - (BASE_Y - SHOULDER_Y), b.y - (BASE_Y - BODY_Y), b.y, NECK_W, BODY_W).map((q) => turn(q, base, -b.lean))
}

/** Glass as glass: a translucent body, a streak of window light down its west side, a darker east edge. */
function glassBody(pen: Pen, pts: Pt[], color: string, lit: number, axis: number, half: number, top: number, base: number, a = 1): void {
  shape(pen, pts, rgba(mixHex(color, GLASS.light, 0.12 + 0.35 * lit), 0.92 * a), 0)
  clipTo(pen, pts, () => {
    shape(pen, box4(axis + half * 0.35, top - 1, axis + half * 1.2, base + 1), rgba(GLASS.glassDeep, 0.25 * a), 0)
    shape(pen, box4(axis - half * 0.62, top + 0.05, axis - half * 0.38, base - 0.12), rgba(GLASS.light, (0.55 + 0.4 * lit) * a), 0)
  })
}

export function drawBottle(pen: Pen, t: number): void {
  if (t < CLAP) return
  const heat = bottleHeat(t)
  const pts = bottlePts(t)
  const b = bottleAt(t)
  const hot = smooth(heat, 0.25, 0.75)
  if (hot < 1) {
    glassBody(pen, pts, glassColor(heat), 0, b.x, BODY_W, b.y - BOTTLE_H, b.y)
    if (heat > 0.02) shape(pen, pts, rgba(GLASS.molten, heat * 0.5), 0)
  }
  if (hot > 0) molten(pen, pts, Math.max(heat, 0.5), 0.6, hot)
  shape(pen, pts, null, 0.8)
  // The ping of cooling glass: the light on it flashes, and fades.
  let flash = 0
  for (const at of PINGS) {
    const u = t - at
    if (u >= 0 && u < 0.9) flash = Math.max(flash, Math.exp(-u / 0.16))
  }
  if (flash > 0.02) {
    const top = upBottle(b, BOTTLE_H - (SHOULDER_Y - (BASE_Y - BOTTLE_H)) - 0.15)
    const foot = upBottle(b, 0.18)
    const dx = -BODY_W * 0.5
    clipTo(pen, pts, () => {
      strokeLine(pen, [[top[0] + dx, top[1]], [foot[0] + dx, foot[1]]], rgba(GLASS.light, flash), Math.max(1.5, 0.09 * pen.k))
      glow(pen, top[0] + dx, (top[1] + foot[1]) / 2, 0.5, GLASS.light, 0.6 * flash)
    })
  }
}

/** The glass thread from the pipe's tip to the bottle's mouth as the belt pulls it away; the tail left on the pipe. */
export function drawThread(pen: Pen, t: number): void {
  if (t < BELT_GO) return
  const [tx, ty] = tipAt(t)
  const b = bottleAt(t)
  const mouth = upBottle(b, BOTTLE_H)
  if (t < SNAP) {
    const f = (t - BELT_GO) / (SNAP - BELT_GO)
    const a: Pt = [tx + 0.02, ty - 0.01]
    const m: Pt = [mouth[0] - NECK_W * 0.7, mouth[1] + 0.09]
    const w0 = 0.09 * (1 - f) ** 1.5 + 0.01
    const mid: Pt = [(a[0] + m[0]) / 2, (a[1] + m[1]) / 2 + 0.05 * f]
    const pts: Pt[] = [
      [a[0], a[1] - 0.07],
      [(a[0] + mid[0]) / 2, (a[1] + mid[1]) / 2 - w0 * 1.1],
      [mid[0], mid[1] - w0],
      [(m[0] + mid[0]) / 2, (m[1] + mid[1]) / 2 - w0 * 1.1],
      [m[0], m[1] - 0.06],
      [m[0], m[1] + 0.06],
      [(m[0] + mid[0]) / 2, (m[1] + mid[1]) / 2 + w0 * 1.1],
      [mid[0], mid[1] + w0],
      [(a[0] + mid[0]) / 2, (a[1] + mid[1]) / 2 + w0 * 1.1],
      [a[0], a[1] + 0.07],
    ]
    glow(pen, mid[0], mid[1], 0.35, GLASS.furnace, 0.35)
    shape(pen, pts, GLASS.molten, 0.5, WARM_INK(pen.ink))
    return
  }
  // Cracked off: a short tail droops off the tip and cools.
  const u = t - SNAP
  const cool = smooth(u, 0.2, 2.5)
  const len = 0.16 + 0.07 * (1 - Math.exp(-u / 0.3))
  const sway = 0.05 * Math.exp(-u / 0.4) * Math.sin(u * 13)
  const tail: Pt[] = [
    [tx - 0.03, ty - 0.08],
    [tx + 0.08, ty - 0.03],
    [tx + 0.06 + sway, ty + len],
    [tx + 0.01 + sway, ty + len + 0.02],
    [tx - 0.03, ty + 0.07],
  ]
  shape(pen, tail, mixHex(GLASS.molten, mixHex(GLASS.glassDeep, GLASS.steel, 0.5), cool), 0.5)
}

/* ------------------------------------------------------------------ the mould */

/** The mould's stand: two iron posts either side of it at the head of the belt, the halves hung on them, a bar across. */
const POST_W = 0.07

export function drawMouldStand(pen: Pen, t: number): void {
  const top = JAW_TOP - 0.28
  // The posts, down behind the belt to the floor.
  for (const s of [-1, 1]) {
    const hx = MOULD_X + s * HALF
    shape(pen, box4(hx - POST_W, top, hx + POST_W, FLOOR_Y), GLASS.iron, 0.8)
    strokeLine(pen, [[hx - POST_W * 0.3, top + 0.06], [hx - POST_W * 0.3, BASE_Y]], rgba(GLASS.steel, 0.8), thin(pen, 0.5))
  }
  // The bar across their heads, bowed up over the neck.
  const bar: Pt[] = [[MOULD_X - HALF - 0.14, top], ...arcPts(MOULD_X, top + 0.04, HALF + 0.14, 0.2, Math.PI, 2 * Math.PI, 12), [MOULD_X + HALF + 0.14, top], [MOULD_X + HALF + 0.14, top + 0.12], ...arcPts(MOULD_X, top + 0.16, HALF + 0.02, 0.18, 2 * Math.PI, Math.PI, 12), [MOULD_X - HALF - 0.14, top + 0.12]]
  shape(pen, bar, GLASS.iron, 0.8)
  // Where the bottle stood, the posts keep a little of its heat for a while.
  const warm = smooth(t, CLAP, CLAP + 0.4) * (1 - smooth(t, BELT_GO, BELT_GO + 4))
  if (warm > 0.01) glow(pen, MOULD_X, (JAW_TOP + BASE_Y) / 2, 1.1, GLASS.molten, 0.22 * warm)
}

/** A half of the mould, `s` -1 west, 1 east, swung `a` open (0 shut, π open flat). */
function mouldHalf(pen: Pen, s: -1 | 1, a: number, heat: number): void {
  const hx = MOULD_X + s * HALF
  const top = JAW_TOP
  const bot = BASE_Y - 0.01
  const c = Math.cos(a)
  const sn = Math.sin(a)
  // The free edge: toward the middle when shut, out past the hinge when open.
  const fx = hx - s * HALF * c
  // As it swings its free edge comes toward us: a little taller.
  const grow = 0.12 * sn
  const mid = (top + bot) / 2
  const ft = mid - (mid - top) * (1 + grow)
  const fb = mid + (bot - mid) * (1 + grow)
  const DEPTH = 0.18
  // The thickness of the half, seen as it turns: beyond its free edge.
  const edge = DEPTH * sn
  const out = c >= 0 ? -s : s
  const ex = fx + out * edge
  if (edge > 0.01) shape(pen, [[fx, ft], [ex, ft + 0.03], [ex, fb - 0.03], [fx, fb]], mixHex(GLASS.iron, pen.ink, 0.35), 0.8)
  const face: Pt[] = [[hx, top], [fx, ft], [fx, fb], [hx, bot]]
  if (c >= 0) {
    // Its outside: iron with a lit edge and two ribs, a lug to shut it by, a notch at the top for the neck.
    const w = HALF * c
    const notch = Math.min(w, (NECK_W + 0.035) * c)
    const nx = fx + s * notch
    const lerpY = (x: number, y0: number, y1: number) => y0 + (y1 - y0) * ((x - hx) / (fx - hx || 1))
    const shell: Pt[] = [[hx, top], [nx, lerpY(nx, top, ft)], [nx, lerpY(nx, top, ft) + 0.14], [fx, ft + 0.14], [fx, fb], [hx, bot]]
    shape(pen, shell, GLASS.iron, 1)
    strokeLine(pen, [[hx - s * 0.08 * c, top + 0.1], [hx - s * 0.08 * c, bot - 0.08]], rgba(GLASS.steel, 0.9), thin(pen, 0.6))
    for (const f of [0.3, 0.72]) strokeLine(pen, [[hx, top + (bot - top) * f], [fx, ft + (fb - ft) * f]], mixHex(GLASS.iron, GLASS.steel, 0.35), Math.max(1, 0.04 * pen.k))
    if (w > 0.12) {
      const ly = ft + (fb - ft) * 0.5
      shape(pen, roundBox(Math.min(fx, fx + s * 0.1) - 0.02, ly - 0.14, Math.max(fx, fx + s * 0.1) + 0.02, ly + 0.14, 0.04), GLASS.steel, 0.7)
    }
    // Shut on hot glass, the seam breathes its glow.
    if (heat > 0.01 && a < 0.2) glow(pen, fx, (ft + fb) / 2 + 0.2, 0.5, GLASS.molten, 0.35 * heat)
  } else {
    // Its inside, turned to us: the bottle's half-shape sunk in it, sooted black, glowing a while after the glass.
    shape(pen, face, mixHex(GLASS.iron, GLASS.steel, 0.3), 1)
    const w = -HALF * c
    const halfAt = (y: number): number => {
      if (y < SHOULDER_Y) return NECK_W + 0.02
      if (y < BODY_Y) {
        const u = (y - SHOULDER_Y) / (BODY_Y - SHOULDER_Y)
        return NECK_W + 0.02 + (BODY_W - NECK_W) * Math.sin((u * Math.PI) / 2)
      }
      return BODY_W + 0.02
    }
    const cavity: Pt[] = []
    const n = 16
    for (let i = 0; i <= n; i++) {
      const y = top + ((bot - 0.07 - top) * i) / n
      const u = Math.min(1, halfAt(y) / HALF)
      const f = (y - top) / (bot - top)
      const edgeY = ft + (fb - ft) * f
      cavity.push([fx + (hx - fx) * u, y + (edgeY - y) * (1 - u)])
    }
    const cav: Pt[] = [[fx, ft], ...cavity, [fx, fb - 0.07]]
    shape(pen, cav, mixHex(GLASS.iron, pen.ink, 0.55), 0.6)
    if (heat > 0.01) fillWith(pen, cav, rgba(GLASS.molten, 0.4 * heat))
    // The wet sheen of its paste lining.
    strokeLine(pen, cavity.slice(4, 14).map(([x, y]) => [x - s * 0.05 * (w / HALF), y] as Pt), rgba(GLASS.light, 0.4), thin(pen, 0.6))
  }
  // The hinge's knuckles.
  for (const f of [0.12, 0.5, 0.88]) {
    const y = top + (bot - top) * f
    shape(pen, roundBox(hx - 0.075, y - 0.1, hx + 0.075, y + 0.1, 0.03), GLASS.steel, 0.7)
  }
}

/**
 * The mould's halves. Swung open (flat against the stand's back) they are drawn behind the bottle's way; shut, or on
 * their way, in front of it: `front` says which pass this is.
 */
export function drawMould(pen: Pen, t: number, front: boolean): void {
  const a = doorAngle(t)
  if (a > Math.PI * 0.78 === front) return
  // The mould stays hot for a while after it lets the bottle go.
  const heat = smooth(t, CLAP - 0.05, CLAP + 0.1) * (1 - smooth(t, OPEN + 0.3, OPEN + 2.2))
  mouldHalf(pen, -1, a, heat)
  mouldHalf(pen, 1, a, heat)
}

/** A soft round of steam: white at its middle, gone at its edge. */
function puff(pen: Pen, x: number, y: number, r: number, a: number): void {
  const { ctx, k } = pen
  const g = ctx.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
  g.addColorStop(0, rgba(GLASS.light, a))
  g.addColorStop(0.55, rgba(GLASS.light, a * 0.6))
  g.addColorStop(1, rgba(GLASS.light, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/** Steam out of the wet mould as the hot glass meets it, and a billow as it opens: soft, drifting up, thinning. */
export function drawSteam(pen: Pen, t: number): void {
  const bursts: [number, number, number][] = [
    [CLAP, 1, 0],
    [HISS[0], 0.6, 1],
    [HISS[1], 0.5, 2],
    [OPEN + 0.08, 1, 3],
  ]
  for (const [at, amt, n] of bursts) {
    const age = t - at
    if (age < 0 || age > 3) continue
    for (let j = 0; j < 9; j++) {
      const side = j % 2 ? 1 : -1
      const life = 2 + 0.9 * hash(j, n, 3)
      const u = Math.min(1, age / life)
      if (u >= 1) continue
      const ease = 1 - (1 - u) ** 2.2
      const spread = n === 3 ? 0.45 + 0.5 * hash(j, n) : 0.05 + 0.3 * hash(j, n)
      const x = MOULD_X + side * (spread + 0.55 * ease) + 0.12 * Math.sin(age * 1.7 + j)
      const y = (n === 3 ? JAW_TOP + 0.55 + 0.5 * hash(j, n, 5) : JAW_TOP + 0.05 + 0.25 * hash(j, n, 5)) - 1.3 * ease * (0.6 + 0.4 * hash(j, n, 7))
      const r = (0.2 + 0.45 * ease + 0.08 * hash(j, n, 9)) * (0.75 + 0.35 * amt)
      const a = (1 - u) ** 1.6 * 0.6 * amt * smooth(age, 0, 0.1)
      if (a < 0.02) continue
      puff(pen, x, y, r, a)
    }
  }
}

/* ------------------------------------------------------------------ the lehr */

const BELT_X0 = LEHR.x0 + 0.15
const BELT_X1 = LEHR.x1 - 0.15
/** How hot each part of the lehr is, from the mould's end to its cold end. */
const ZONE_EDGES = [LEHR.x0 + 0.3, ...ZONES, LEHR.x1 - 0.1]
const ZONE_HEAT = [1, 0.62, 0.3, 0]

export function drawLehr(pen: Pen, t: number, v: View): void {
  if (LEHR.x1 + 1 < v.x0 || LEHR.x0 - 1 > v.x1) return
  const top = BED_Y
  // The bed: brick down to the floor, a fire in it under each warm part of the belt.
  const bed = box4(LEHR.x0, top, LEHR.x1, FLOOR_Y)
  shape(pen, bed, GLASS.brick, 0.9)
  clipTo(pen, bed, () => {
    for (let r = 0; top + 0.3 * r < FLOOR_Y; r++) {
      const y = top + 0.3 * r
      strokeLine(pen, [[LEHR.x0, y], [LEHR.x1, y]], rgba(GLASS.brickDeep, 0.3), thin(pen, 0.45))
      for (let x = LEHR.x0 + ((r % 2) * 0.31); x < LEHR.x1; x += 0.62) strokeLine(pen, [[x, y], [x, y + 0.3]], rgba(GLASS.brickDeep, 0.3), thin(pen, 0.45))
    }
  })
  shape(pen, box4(LEHR.x0 - 0.06, FLOOR_Y - 0.14, LEHR.x1 + 0.06, FLOOR_Y), mixHex(GLASS.brickDeep, GLASS.iron, 0.35), 0.8)
  for (let i = 0; i < 3; i++) {
    const x = (ZONE_EDGES[i] + ZONE_EDGES[i + 1]) / 2
    const heat = ZONE_HEAT[i]
    const w = Math.min(0.34, (ZONE_EDGES[i + 1] - ZONE_EDGES[i]) * 0.3)
    const sill = FLOOR_Y - 0.2
    const spring = top + 0.42
    const mouth: Pt[] = [[x - w, sill], [x - w, spring], ...arcPts(x, spring, w, w * 0.8, Math.PI, 2 * Math.PI, 10), [x + w, spring], [x + w, sill]]
    shape(pen, arcPts(x, spring, w + 0.1, w * 0.8 + 0.1, Math.PI, 2 * Math.PI, 10).concat([[x + w + 0.1, spring], [x - w - 0.1, spring]]), GLASS.brickDeep, 0.7)
    shape(pen, mouth, mixHex(GLASS.brickDeep, pen.ink, 0.35), 0.8)
    const { ctx, k } = pen
    const g = ctx.createLinearGradient(0, sill * k, 0, spring * k)
    g.addColorStop(0, rgba(GLASS.moltenHot, 0.95 * heat))
    g.addColorStop(0.5, rgba(GLASS.molten, 0.8 * heat))
    g.addColorStop(1, rgba(GLASS.brick, 0.3 * heat))
    fillWith(pen, mouth, g)
    // Coals.
    for (let j = 0; j < 4; j++) {
      const cx = x - w * 0.7 + (w * 1.4 * j) / 3
      shape(pen, arcPts(cx, sill - 0.05, w * 0.26, 0.06, Math.PI, 2 * Math.PI, 6).concat([[cx + w * 0.26, sill], [cx - w * 0.26, sill]]), mixHex(GLASS.brickDeep, GLASS.molten, heat * (0.6 + 0.4 * hash(j, i))), 0.5)
    }
    glow(pen, x, spring, 0.7, GLASS.furnace, 0.35 * heat)
  }
  // The zones' iron dividers.
  for (const x of ZONES) shape(pen, box4(x - 0.05, top, x + 0.05, FLOOR_Y - 0.14), GLASS.iron, 0.7)
  // The belt: iron slats going by under a skin of sand.
  shape(pen, box4(BELT_X0, BELT_Y, BELT_X1, top), GLASS.iron, 0.9)
  const off = ((beltAt(t) % 0.28) + 0.28) % 0.28
  clipTo(pen, box4(BELT_X0, BELT_Y, BELT_X1, top), () => {
    for (let x = BELT_X0 + off - 0.28; x < BELT_X1; x += 0.28) strokeLine(pen, [[x, BELT_Y + 0.03], [x, top - 0.03]], GLASS.steel, thin(pen))
  })
  shape(pen, box4(BELT_X0, SAND_Y, BELT_X1, BELT_Y), GLASS.sand, 0.6)
  clipTo(pen, box4(BELT_X0, SAND_Y, BELT_X1, BELT_Y), () => {
    for (let x = BELT_X0 + off - 0.28; x < BELT_X1; x += 0.28) {
      shape(pen, arcPts(x + 0.08, SAND_Y + 0.035, 0.03, 0.012, 0, Math.PI * 2, 6), rgba(GLASS.woodDeep, 0.35), 0)
    }
  })
  // Its drums.
  const turnA = beltAt(t) / 0.12
  for (const x of [BELT_X0, BELT_X1]) {
    const c: Pt = [x, (SAND_Y + top) / 2]
    const r = (top - SAND_Y) / 2 + 0.02
    shape(pen, arcPts(c[0], c[1], r, r, 0, Math.PI * 2, 16), GLASS.steel, 0.8)
    for (let i = 0; i < 3; i++) strokeLine(pen, [c, [c[0] + r * 0.85 * Math.cos(turnA + (i * 2 * Math.PI) / 3), c[1] + r * 0.85 * Math.sin(turnA + (i * 2 * Math.PI) / 3)]], GLASS.iron, thin(pen, 0.6))
  }
}

/* ------------------------------------------------------------------ the bottle organ */

function tunedPts(b: Tuned, dx: number): Pt[] {
  const mouth = b.base - b.h
  const shoulderLen = Math.min(0.55, b.h * 0.32)
  const round = Math.min(0.42, b.w * 0.8)
  return bottleOutline(b.x + dx, mouth, mouth + shoulderLen, mouth + shoulderLen + round, b.base, b.neck, b.w)
}

/** The stepped rack: oak treads on a stringer that climbs toward the furnace, on posts down to the floor. */
export function drawRack(pen: Pen): void {
  const steps = ORGAN.map((b, i) => {
    const x0 = i === 0 ? RACK.x0 : (ORGAN[i - 1].x + b.x) / 2
    const x1 = i === ORGAN.length - 1 ? RACK.x1 : (b.x + ORGAN[i + 1].x) / 2
    return { x0, x1, y: b.base }
  })
  const TREAD = 0.1
  const DEEP = 0.32
  // The posts, a pair under every other step, and a stretcher low down.
  const posts = [steps[0].x0 + 0.12, steps[2].x0 + 0.05, steps[4].x0 + 0.05, steps[6].x1 - 0.14]
  for (const [i, x] of posts.entries()) {
    const y = steps[Math.min(6, i * 2)].y + TREAD
    shape(pen, box4(x - 0.06, y, x + 0.06, FLOOR_Y), GLASS.woodDeep, 0.7)
  }
  shape(pen, box4(RACK.x0 + 0.06, FLOOR_Y - 0.62, RACK.x1 - 0.08, FLOOR_Y - 0.52), GLASS.woodDeep, 0.7)
  // The stringer: a board under the treads, stepped along its top, its underside a straight climb.
  const under = (x: number) => steps[0].y + DEEP + 0.3 + ((steps[6].y + DEEP) - (steps[0].y + DEEP + 0.3)) * ((x - RACK.x0) / (RACK.x1 - RACK.x0))
  const stringer: Pt[] = []
  for (const s of steps) stringer.push([s.x0, s.y + TREAD], [s.x1, s.y + TREAD])
  stringer.push([RACK.x1, under(RACK.x1)], [RACK.x0, under(RACK.x0)])
  shape(pen, stringer, GLASS.wood, 0.9)
  strokeLine(pen, [[RACK.x0 + 0.05, under(RACK.x0) - 0.07], [RACK.x1 - 0.05, under(RACK.x1) - 0.07]], rgba(GLASS.woodDeep, 0.45), thin(pen, 0.5))
  // The treads, their nosings lit.
  for (const s of steps) {
    shape(pen, box4(s.x0 - 0.03, s.y, s.x1 + 0.03, s.y + TREAD), mixHex(GLASS.wood, GLASS.light, 0.18), 0.7)
  }
}

export function drawOrgan(pen: Pen, t: number): void {
  drawRack(pen)
  for (let i = 0; i < ORGAN.length; i++) {
    const b = ORGAN[i]
    const ring = ringOf(i, t)
    const dx = shiverOf(i, t)
    const pts = tunedPts(b, dx)
    const color = GLASS[b.glass]
    const mouth = b.base - b.h
    // Its shadow on the step.
    shape(pen, arcPts(b.x + 0.08, b.base + 0.01, b.w * 1.05, 0.035, 0, Math.PI * 2, 14), rgba(GLASS.woodDeep, 0.35), 0)
    glassBody(pen, pts, color, ring * 0.6, b.x + dx, b.w, mouth, b.base)
    // The water it is tuned with, its surface shivering when it rings.
    const bodyTop = mouth + Math.min(0.55, b.h * 0.32) + Math.min(0.42, b.w * 0.8)
    const level = b.base - (b.base - bodyTop) * b.water
    clipTo(pen, pts, () => {
      const surf: Pt[] = []
      for (let j = 0; j <= 12; j++) {
        const u = j / 12
        const x = b.x + dx - b.w + 2 * b.w * u
        surf.push([x, level + 0.035 * ring * Math.sin(u * 9 + (t - RINGS[i]) * 40)])
      }
      shape(pen, [...surf, [b.x + dx + b.w, b.base + 0.1], [b.x + dx - b.w, b.base + 0.1]], rgba(GLASS.water, 0.6), 0)
      strokeLine(pen, surf, rgba(GLASS.light, 0.85), thin(pen, 0.55))
      // Struck, the light on it flashes.
      if (ring > 0.02) {
        const x = b.x + dx - b.w * 0.5
        strokeLine(pen, [[x, mouth + b.h * 0.3], [x, b.base - 0.15]], rgba(GLASS.light, ring), Math.max(1.5, 0.1 * pen.k))
        glow(pen, b.x + dx, b.base - b.h * 0.4, b.w + 0.4, GLASS.light, 0.5 * ring)
      }
    })
    shape(pen, pts, null, 0.8)
  }
}

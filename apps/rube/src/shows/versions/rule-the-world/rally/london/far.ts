import type { Pt } from '../../../../../parts'
import { lastBeat, layer, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { BEAT } from '../music'
import { ctxOf, flash, glow, line, mix, rect, rgba, shape, type Pen } from '../pen'
import { DIES, T0 } from './geo'
import { GALLERY_TOP } from './above'
import { C } from './palette'

/**
 * The far hall, through the gangways at the back of the stand: three openings in its upper rows (left of the
 * semifinal's table, between the two, right of the final's), and through each the hall next door (d 0.6), cold
 * daylight from its own high windows, where the early rounds are still being played on table after table under their
 * own small lamps, tiny players in white putting a tiny white ball over the net on the beat. As the final comes on,
 * those matches finish and their lamps go down one by one, and the people from the far hall crowd into the gangways to
 * watch the final, standing; after the last point they go.
 */

/** The gangways: their middles, half-width, and the step they open from (the rows below stay). */
export const GANGWAYS = [-2.6, 7.75, 17.6]
const HW = 0.92
export const GANG_BOT = -2.27
/** Whether a spectator at `x` would stand in a gangway (and so is not drawn in its rows). */
export const inGangway = (x: number): boolean => GANGWAYS.some((g) => Math.abs(x - g) < HW + 0.12)

const ANCHOR: Pt = [7, -1.5]
const D = 0.6
/**
 * The far hall, in its own layer's cells (everything there half the size it would be here): its floor, the tables'
 * top, their pitch and half-length, the lamps' shades.
 */
const FLOOR = -2.8
const TOP = -2.99
const PITCH = 2.0
const HALF = 0.45
const SHADE = -3.42
/** When each far table's match ends: through the final's first point. */
const endOf = (n: number): number => 70 + 7 * hash(n, 5, 71)

/** The latecomers in a gangway: when each comes up the steps to stand and watch, and when they go. */
const COMERS = 5
const comeAt = (g: number, j: number): number => 69.4 + 2.2 * j + 0.9 * hash(g, j, 72)
const goAt = (g: number, j: number): number => DIES + 1.3 + 0.45 * j + 0.3 * hash(g, j, 73)

export function gangways(pen: Pen, t: number, f: Frame): void {
  if (f.y0 > GANG_BOT) return
  const vis = GANGWAYS.filter((g) => g + HW > f.x0 && g - HW < f.x1)
  if (!vis.length) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  for (const g of vis) ctx.rect((g - HW) * k, GALLERY_TOP * k, 2 * HW * k, (GANG_BOT - GALLERY_TOP) * k)
  ctx.clip()
  // What of the far hall shows through each opening, in its own cells.
  const dx = (f.cx - ANCHOR[0]) * (1 - D)
  layer(
    pen,
    f,
    D,
    (lf) => farHall(pen, t, lf, vis.map((g): [number, number] => [g - HW - dx, g + HW - dx])),
    ANCHOR,
  )
  // The latecomers, standing in the gangway's mouth, backlit by the far hall.
  for (const g of vis) latecomers(pen, t, g)
  ctx.restore()
  // The openings' iron: the jambs, the step's edge, and a rail across.
  for (const g of vis) {
    rect(pen, g - HW - 0.07, GALLERY_TOP, g - HW + 0.02, GANG_BOT, C.iron)
    rect(pen, g + HW - 0.02, GALLERY_TOP, g + HW + 0.07, GANG_BOT, C.iron)
    rect(pen, g - HW, GANG_BOT - 0.05, g + HW, GANG_BOT + 0.03, C.ironHi)
    line(pen, [g - HW, GANG_BOT - 0.42], [g + HW, GANG_BOT - 0.42], C.ironHi, 1.3)
    line(pen, [g - 0.3, GANG_BOT - 0.42], [g - 0.3, GANG_BOT], C.iron, 1.0)
    line(pen, [g + 0.3, GANG_BOT - 0.42], [g + 0.3, GANG_BOT], C.iron, 1.0)
  }
}

/** The hall next door, in its own cells: its wall and high windows, its floor, its tables and their players. */
function farHall(pen: Pen, t: number, f: Frame, spans: [number, number][]): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const g = ctx.createLinearGradient(0, -4.8 * k, 0, FLOOR * k)
  g.addColorStop(0, rgba(pen, C.farWall, 1))
  g.addColorStop(1, rgba(pen, C.farWallLow, 1))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (FLOOR - f.y0 + 1) * k)
  rect(pen, f.x0 - 1, FLOOR, f.x1 + 1, f.y1 + 1, C.farFloor)
  // The high windows along its far wall.
  const shows = (x: number, r: number) => spans.some(([a, b]) => x + r > a && x - r < b)
  for (let i = Math.floor(f.x0 / 0.6) - 1; i * 0.6 <= f.x1 + 1; i++) {
    const x = i * 0.6 + 0.3
    if (!shows(x, 0.2)) continue
    rect(pen, x - 0.16, -4.55, x + 0.16, -4.18, mix(C.farWindow, C.skyLow, hash(i, 2, 74) * 0.5))
    line(pen, [x, -4.55], [x, -4.18], C.farWall, 0.35)
    line(pen, [x - 0.16, -4.36], [x + 0.16, -4.36], C.farWall, 0.35)
  }
  // Its crowd: a dim row along the far side, thinning as the matches end.
  const thin = smooth(t, 72, 80)
  ctx.beginPath()
  for (let i = Math.floor(f.x0 / 0.15) - 1; i * 0.15 <= f.x1 + 1; i++) {
    if (hash(i, 3, 75) < 0.2 + 0.6 * thin || !shows(i * 0.15, 0.1)) continue
    const x = i * 0.15 + 0.05 * hash(i, 4, 75)
    const y = -3.14 + 0.008 * Math.sin(t * 1.4 + i)
    ctx.moveTo((x + 0.03) * k, y * k)
    ctx.arc(x * k, y * k, 0.03 * k, 0, Math.PI * 2)
    ctx.rect((x - 0.05) * k, (y + 0.026) * k, 0.1 * k, 0.16 * k)
  }
  ctx.fillStyle = rgba(pen, mix(C.farWallLow, C.night, 0.35), 1)
  ctx.fill()
  rect(pen, f.x0 - 1, -2.96, f.x1 + 1, FLOOR, mix(C.barrier, C.farWallLow, 0.45))
  for (let n = Math.floor((f.x0 - 2) / PITCH); n * PITCH <= f.x1 + 2; n++) if (shows(n * PITCH + 0.9, HALF + 0.75)) farTable(pen, t, n)
}

/** One far table, its lamp, and its two players at the early rounds, until their match is over. */
function farTable(pen: Pen, t: number, n: number): void {
  const cx = n * PITCH + 0.9
  const end = endOf(n)
  const L = 1 - 0.8 * smooth(t, end + 0.6, end + 1.8)
  // The lamp's light first, under everything.
  if (L > 0.05) {
    glow(pen, [cx, TOP], 0.55, C.lamp, 0.2 * L)
    const ctx = ctxOf(pen.p)
    const { k } = pen
    ctx.save()
    ctx.fillStyle = rgba(pen, C.lamp, 0.07 * L)
    ctx.beginPath()
    ctx.moveTo((cx - 0.06) * k, SHADE * k)
    ctx.lineTo((cx + 0.06) * k, SHADE * k)
    ctx.lineTo((cx + 0.34) * k, TOP * k)
    ctx.lineTo((cx - 0.34) * k, TOP * k)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  // The table: legs, the green top and its white edge, the net.
  for (const lx of [cx - HALF + 0.07, cx + HALF - 0.07]) line(pen, [lx, TOP], [lx, FLOOR], C.leg, 0.55)
  rect(pen, cx - HALF, TOP, cx + HALF, TOP + 0.022, mix(C.farTable, C.tableTop, 0.4 * L))
  rect(pen, cx - HALF, TOP, cx + HALF, TOP + 0.007, mix(C.farWall, C.tableEdge, 0.4 + 0.4 * L))
  rect(pen, cx - 0.006, TOP - 0.048, cx + 0.006, TOP, C.net)
  // The lamp: its cord, the shade, the bulb.
  line(pen, [cx, -6.5], [cx, SHADE - 0.07], C.iron, 0.35)
  rect(pen, cx - 0.026, SHADE - 0.07, cx + 0.026, SHADE, C.shade)
  rect(pen, cx - 0.07, SHADE - 0.022, cx + 0.07, SHADE, C.shade)
  if (L > 0.05) glow(pen, [cx, SHADE + 0.012], 0.11, C.bulb, 0.6 * L)
  // The players, at the ends: in play until the match ends, then off out of the lamp.
  const off = smooth(t, end, end + 1.6)
  if (off >= 1) return
  const b = lastBeat(t)
  const idx = Math.round((b.t - T0) / BEAT)
  // A rally of nine beats, then three while the ball is fetched and served.
  const inRally = Number.isFinite(b.ago) && t < end && ((idx + n * 5) % 12 + 12) % 12 < 9
  const u = Number.isFinite(b.ago) ? Math.min(1, b.ago / BEAT) : 0
  const fromLeft = (idx + n) % 2 === 0
  const xs = [cx - HALF - 0.15, cx + HALF + 0.15]
  const ball: Pt | null = inRally ? farBall(xs, fromLeft, u) : null
  for (const side of [0, 1]) {
    const dir = side ? -1 : 1
    const x = xs[side] - dir * (0.022 * Math.sin(t * 2.2 + n + side) + 0.45 * off)
    const hits = inRally && (side === 0) === fromLeft
    farPlayer(pen, [x, FLOOR], dir, hits ? flash(b.ago, 0.12) : 0, ball ? ball[1] : TOP - 0.09, 1 - off)
  }
  if (ball) {
    const ctx = ctxOf(pen.p)
    const { k } = pen
    ctx.fillStyle = rgba(pen, mix(C.farWall, C.white, 0.85), 1)
    ctx.beginPath()
    ctx.arc(ball[0] * k, ball[1] * k, 0.017 * k, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The far ball across a beat: off one bat, a bounce on the far half on the "a", up to the other bat. */
function farBall(xs: number[], fromLeft: boolean, u: number): Pt {
  const [xa, xb] = fromLeft ? xs : [xs[1], xs[0]]
  const x = xa + (xb - xa) * (0.12 + 0.76 * u)
  const hit = TOP - 0.075
  const rest = TOP - 0.017
  if (u < 2 / 3) {
    const v = u * 1.5
    return [x, hit + (rest - hit) * v - 0.1 * 4 * v * (1 - v)]
  }
  const w = (u - 2 / 3) * 3
  return [x, rest + (hit - rest) * w - 0.06 * 4 * w * (1 - w)]
}

/** A far player, hazed by the distance: legs, white shirt, head, and his bat out over the table. */
function farPlayer(pen: Pen, feet: Pt, dir: number, swing: number, ballY: number, a: number): void {
  if (a <= 0.02) return
  const [x, y] = feet
  const haze = (c: string, f = 1) => mix(C.farWall, c, 0.72 * a * f)
  const hip: Pt = [x, y - 0.22]
  const sh: Pt = [x + 0.022 * dir, y - 0.39]
  line(pen, hip, [x - 0.045, y], haze(C.trouser), 0.95)
  line(pen, hip, [x + 0.045, y], haze(C.trouser, 0.85), 0.95)
  shape(pen, [[hip[0] - 0.037, hip[1]], [sh[0] - 0.045, sh[1]], [sh[0] + 0.045, sh[1]], [hip[0] + 0.037, hip[1]]], haze(C.white))
  const head: Pt = [sh[0] + 0.009 * dir, sh[1] - 0.052]
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.fillStyle = rgba(pen, haze(C.skin), 1)
  ctx.beginPath()
  ctx.arc(head[0] * k, head[1] * k, 0.031 * k, 0, Math.PI * 2)
  ctx.fill()
  const bat: Pt = [x + dir * (0.15 + 0.05 * swing), Math.min(y - 0.2, ballY + 0.01) - 0.045 * swing]
  line(pen, [sh[0] + 0.03 * dir, sh[1] + 0.015], bat, haze(C.skin, 0.9), 0.65)
  ctx.fillStyle = rgba(pen, haze(C.rubberDark), 1)
  ctx.beginPath()
  ctx.ellipse(bat[0] * k, bat[1] * k, 0.024 * k, 0.021 * k, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** The far hall's people come up into the gangway's mouth to watch the final, standing; they go after the loss. */
function latecomers(pen: Pen, t: number, g: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.beginPath()
  let any = false
  for (let j = 0; j < COMERS; j++) {
    const up = smooth(t, comeAt(g, j), comeAt(g, j) + 0.9) * (1 - smooth(t, goAt(g, j), goAt(g, j) + 0.9))
    if (up <= 0.01) continue
    any = true
    const x = g - 0.68 + 0.34 * j + 0.1 * (hash(g, j, 76) - 0.5)
    // Craning to see, a lean and a shift; risen up the steps by `up`.
    const lean = 0.03 * Math.sin(t * (0.8 + 0.3 * hash(g, j, 77)) + j)
    const hy = GANG_BOT - 0.92 + 0.95 * (1 - up) + 0.02 * Math.sin(t * 1.7 + j * 2)
    const hx = x + lean
    ctx.moveTo((hx + 0.12) * k, hy * k)
    ctx.ellipse(hx * k, hy * k, 0.12 * k, 0.14 * k, 0, 0, Math.PI * 2)
    // Shoulders, to below the step.
    ctx.moveTo((x - 0.27) * k, (GANG_BOT + 0.1) * k)
    ctx.lineTo((x - 0.25) * k, (hy + 0.24) * k)
    ctx.lineTo((x - 0.08) * k, (hy + 0.14) * k)
    ctx.lineTo((x + 0.08) * k, (hy + 0.14) * k)
    ctx.lineTo((x + 0.25) * k, (hy + 0.24) * k)
    ctx.lineTo((x + 0.27) * k, (GANG_BOT + 0.1) * k)
    ctx.closePath()
    if (hash(g, j, 78) < 0.6) {
      // A trilby: the brim, and a low crown pinched at the top.
      ctx.moveTo((hx + 0.19) * k, (hy - 0.08) * k)
      ctx.ellipse(hx * k, (hy - 0.08) * k, 0.19 * k, 0.03 * k, 0, 0, Math.PI * 2)
      ctx.moveTo((hx - 0.12) * k, (hy - 0.08) * k)
      ctx.lineTo((hx - 0.1) * k, (hy - 0.17) * k)
      ctx.lineTo((hx - 0.02) * k, (hy - 0.185) * k)
      ctx.lineTo(hx * k, (hy - 0.16) * k)
      ctx.lineTo((hx + 0.02) * k, (hy - 0.185) * k)
      ctx.lineTo((hx + 0.1) * k, (hy - 0.17) * k)
      ctx.lineTo((hx + 0.12) * k, (hy - 0.08) * k)
      ctx.closePath()
    }
  }
  if (!any) return
  ctx.fillStyle = rgba(pen, '#151C1A', 1)
  ctx.fill()
}

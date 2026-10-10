import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { bloom, pool, rgba } from '../cast'
import { hash } from '../kit'
import { level } from '../music'
import { HOTEL } from '../worlds'
import {
  afloat,
  B,
  BEDS,
  brake,
  bundleAt,
  cabinY,
  CAB,
  ch,
  CHARGES_AT,
  clamp01,
  DISK,
  DOOR_TOP,
  drumAngle,
  DRUM,
  HIN,
  HOLE,
  lampGain,
  lerp,
  LINE_FOOT,
  LINE_TOP,
  liftAt,
  POST_AT,
  rot,
  ROLLER_R,
  ROLLERS,
  SHAFT,
  ss,
  T,
  HANG,
  TOW,
  TYRE,
  type Who,
} from './hotel-geo'

/**
 * The hotel's standing set, drawn in the dream world's own cells (the HOTEL builder's): Arthur's dream, a grand hotel
 * of the sixties in section. Walnut and brass, olive carpet, milk-glass lamps, marble in the lobby; the lift shaft on
 * the column; the drum where the top floor's corridor turns; the city at night beyond. Everything that is not the ball
 * runs on the hotel's own clock, but for what the ball touches (the drum, the lift, the line), which is on show time.
 */

type C2 = CanvasRenderingContext2D
export interface View {
  x0: number
  y0: number
  x1: number
  y1: number
}
export interface Pen {
  p: p5
  c: C2
  k: number
  w: number
  ink: string
}

/* ------------------------------------------------------------------ colour */

const H = HOTEL
export const C = {
  concrete: mixHex(H.wallShade, H.shaft, 0.42),
  concreteDark: mixHex(H.wallShade, H.shaft, 0.64),
  plaster: mixHex(H.wall, H.glass, 0.5),
  suite: mixHex(H.wall, H.woodLight, 0.16),
  wainscot: mixHex(H.wall, H.wallShade, 0.5),
  rooms: [H.wall, mixHex(H.wall, H.wallShade, 0.3), mixHex(H.wall, H.carpet, 0.14)],
  skyTop: mixHex(H.night, H.shaft, 0.25),
  skyLow: mixHex(H.night, H.wallShade, 0.2),
  cityFar: mixHex(H.night, H.wallShade, 0.13),
  cityNear: mixHex(H.night, H.shaft, 0.55),
  pane: mixHex(H.night, H.shaft, 0.15),
  person: mixHex(H.shaft, H.night, 0.5),
  steel: mixHex(H.shaft, H.glass, 0.34),
  steelDark: mixHex(H.shaft, H.glass, 0.14),
  curtain: mixHex(H.carpet, H.wood, 0.5),
  curtainDark: mixHex(H.carpetDark, H.wood, 0.6),
  bedding: mixHex(H.glass, H.wall, 0.35),
  bottle: mixHex(H.carpetDark, H.shaft, 0.45),
  channel: mixHex(H.wall, H.shaft, 0.38),
  far: mixHex(H.wallShade, H.shaft, 0.22),
  earth: mixHex(H.shaft, H.night, 0.35),
  lobby: mixHex(H.marble, H.wallShade, 0.28),
  street: mixHex(H.shaft, H.night, 0.6),
  leaf: mixHex(H.carpetDark, H.night, 0.35),
}

/* ------------------------------------------------------------------ pen */

const seen = (f: View, x0: number, y0: number, x1: number, y1: number, m = 0.6): boolean => x1 > f.x0 - m && x0 < f.x1 + m && y1 > f.y0 - m && y0 < f.y1 + m

function rect(g: Pen, x0: number, y0: number, x1: number, y1: number, fill: string | null, stroke: string | null = null, lw = 1): void {
  const { c, k } = g
  if (fill) {
    c.fillStyle = fill
    c.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = g.w * lw
    c.strokeRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
}
function poly(g: Pen, pts: Pt[], fill: string | null, stroke: string | null = null, lw = 1, close = true): void {
  const { c, k } = g
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x * k, y * k) : c.moveTo(x * k, y * k)))
  if (close) c.closePath()
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = g.w * lw
    c.lineJoin = 'round'
    c.stroke()
  }
}
function line(g: Pen, a: Pt, b: Pt, color: string, lw = 1): void {
  const { c, k } = g
  c.beginPath()
  c.moveTo(a[0] * k, a[1] * k)
  c.lineTo(b[0] * k, b[1] * k)
  c.strokeStyle = color
  c.lineWidth = g.w * lw
  c.lineCap = 'round'
  c.stroke()
}
function disc(g: Pen, at: Pt, r: number, fill: string | null, stroke: string | null = null, lw = 1): void {
  const { c, k } = g
  c.beginPath()
  c.arc(at[0] * k, at[1] * k, r * k, 0, Math.PI * 2)
  if (fill) {
    c.fillStyle = fill
    c.fill()
  }
  if (stroke) {
    c.strokeStyle = stroke
    c.lineWidth = g.w * lw
    c.stroke()
  }
}
/** Draw `fn` in a frame at `at`, turned `turn` (clockwise). */
function at(g: Pen, p: Pt, turn: number, fn: () => void): void {
  g.c.save()
  g.c.translate(p[0] * g.k, p[1] * g.k)
  if (turn) g.c.rotate(turn)
  fn()
  g.c.restore()
}

/* ------------------------------------------------------------------ light */

function glow(g: Pen, p: Pt, r: number, a: number, t: number): void {
  bloom(g.p, g.k, p, r, H.lamp, a * lampGain(t) * (0.9 + 0.12 * level(t)))
}
/** A milk-glass sconce on a wall: a brass plate and a small shade, its glow on the wall. */
function sconce(g: Pen, x: number, y: number, t: number, i: number): void {
  const flick = 1 - 0.12 * Math.pow(Math.max(0, Math.sin(ch(t) * 1.7 + i * 2.3)), 24)
  pool(g.p, g.k, [x, y + 0.05], 0.55, 0.75, H.lamp, 0.16 * lampGain(t) * flick)
  if (g.k > 5) {
    rect(g, x - 0.035, y - 0.13, x + 0.035, y + 0.1, H.brass)
    poly(g, [[x - 0.07, y - 0.08], [x + 0.07, y - 0.08], [x + 0.1, y + 0.08], [x - 0.1, y + 0.08]], H.glass, g.k > 14 ? g.ink : null, 0.4)
  }
  glow(g, [x, y], 0.5, 0.3 * flick, t)
}

/* ------------------------------------------------------------------ the night outside */

function drawNight(g: Pen, f: View): void {
  const y0 = Math.max(B.band, f.y0 - 1)
  const y1 = Math.min(B.lobby, f.y1 + 1)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const { c, k } = g
  if (y1 > y0) {
    const gr = c.createLinearGradient(0, B.band * k, 0, B.lobby * k)
    gr.addColorStop(0, C.skyTop)
    gr.addColorStop(0.7, H.night)
    gr.addColorStop(1, C.skyLow)
    c.fillStyle = gr
    c.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    // A low haze of the city's light along the horizon.
    const hz = c.createLinearGradient(0, 30 * k, 0, B.lobby * k)
    hz.addColorStop(0, rgba(H.lamp, 0))
    hz.addColorStop(1, rgba(H.lamp, 0.07))
    c.fillStyle = hz
    c.fillRect(x0 * k, Math.max(30, y0) * k, (x1 - x0) * k, (y1 - Math.max(30, y0)) * k)
  }
  // Towers: a far row and a near row, with a few lit windows.
  for (const row of [0, 1]) {
    const col = row ? C.cityNear : C.cityFar
    // Out past the first and the last of them too, so seen whole (Overview) the city runs to the frame's edges.
    for (let i = -14; i < 76; i++) {
      const w = 1.4 + hash(i, row, 3) * (row ? 2.2 : 3)
      const x = -66 + i * 2.25 + hash(i, row, 5) * 1.1
      if (x + w < f.x0 - 1 || x > f.x1 + 1) continue
      if (x + w > B.left - 0.2 && x < B.right + 0.2) continue
      const top = (row ? 25 : 19.5) + hash(i, row, 7) * (row ? 8 : 10)
      if (top > f.y1 + 1) continue
      rect(g, x, top, x + w, B.lobby, col)
      if (g.k < 6) continue
      const pale = row ? 0.2 : 0.13
      for (let yy = top + 0.5; yy < B.lobby - 0.4; yy += 0.75) {
        if (yy < f.y0 - 1 || yy > f.y1 + 1) continue
        for (let xx = x + 0.25; xx < x + w - 0.3; xx += 0.5) {
          const h = hash(Math.round(xx * 4), Math.round(yy * 4), 11 + row)
          if (h > 0.2) continue
          rect(g, xx, yy, xx + 0.17, yy + 0.26, rgba(h < 0.012 ? H.lamp : H.glass, h < 0.012 ? 0.4 : pale))
        }
      }
    }
  }
  // The street and the ground under it.
  if (f.y1 > B.lobby - 0.5) {
    rect(g, x0, B.lobby, x1, B.lobby + 0.22, C.street)
    rect(g, x0, B.lobby + 0.22, x1, B.foot, C.earth)
  }
}

/* ------------------------------------------------------------------ the building's rooms (behind the section) */

const TOP_DOORS = [-16.6, -12.9, -9.2, 3.3]
const TOP_SCONCES = [-17.6, -14.75, -11.05, -7.75, 1.7, 5.25]
const ROOMS: [number, number][] = [
  [B.left + B.wall, -12.1],
  [-11.9, -6.1],
  [-5.9, -1.1],
  [1.1, 5.9],
  [6.1, 12.1],
  [12.3, B.right - B.wall],
]
const PARTITIONS = [-12.1, -6.1, 5.9, 12.1]

function door(g: Pen, x: number, y1: number, h: number, w = 1.05): void {
  rect(g, x, y1 - h, x + w, y1, H.wood, g.ink, 0.7)
  if (g.k > 7) {
    rect(g, x + 0.12, y1 - h + 0.14, x + w - 0.12, y1 - h * 0.52, H.woodLight)
    rect(g, x + 0.12, y1 - h * 0.46, x + w - 0.12, y1 - 0.14, H.woodLight)
    rect(g, x + w - 0.2, y1 - h * 0.49, x + w - 0.13, y1 - h * 0.44, H.brass)
  }
}
function window_(g: Pen, x0: number, y0: number, x1: number, y1: number, seed: number): void {
  rect(g, x0, y0, x1, y1, C.pane)
  if (g.k > 6) {
    for (let i = 0; i < 9; i++) {
      const xx = x0 + 0.1 + hash(i, seed, 1) * (x1 - x0 - 0.3)
      const yy = y0 + 0.25 + hash(i, seed, 2) * (y1 - y0 - 0.4)
      rect(g, xx, yy, xx + 0.12, yy + 0.17, rgba(hash(i, seed, 3) < 0.15 ? H.lamp : H.glass, 0.22))
    }
    line(g, [(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1], H.brass, 0.5)
  }
  rect(g, x0, y0, x1, y1, null, g.ink, 0.6)
  rect(g, x0 - 0.06, y1, x1 + 0.06, y1 + 0.07, H.woodLight)
}

function drawTopFloor(g: Pen, f: View, t: number): void {
  if (!seen(f, B.left, B.ceil, B.right, B.top)) return
  // The corridor.
  const cx0 = Math.max(B.left + B.wall, f.x0 - 1)
  const cx1 = Math.min(B.suite, f.x1 + 1)
  if (cx1 > cx0) {
    rect(g, cx0, B.ceil, cx1, B.top, H.wall)
    rect(g, cx0, 20.25, cx1, B.top, C.wainscot)
    line(g, [cx0, 20.25], [cx1, 20.25], H.woodLight, 0.8)
    rect(g, cx0, B.ceil, cx1, B.ceil + 0.1, C.plaster)
    for (const x of TOP_DOORS) if (seen(f, x, 19, x + 1.1, 21)) door(g, x, B.top, B.door)
  }
  // The suite.
  const sx0 = Math.max(B.suite, f.x0 - 1)
  const sx1 = Math.min(B.right - B.wall, f.x1 + 1)
  if (sx1 > sx0) {
    rect(g, sx0, B.ceil, sx1, B.top, C.suite)
    rect(g, sx0, 20.3, sx1, B.top, mixHex(C.suite, H.wallShade, 0.4))
    rect(g, sx0, B.ceil, sx1, B.ceil + 0.1, C.plaster)
    if (seen(f, 15, 18.8, 17.8, 20.8)) window_(g, 15.3, 18.95, 17.6, 20.5, 7)
  }
  for (const [i, x] of TOP_SCONCES.entries()) if (seen(f, x - 1, 18.6, x + 1, 21)) sconce(g, x, 19.55, t, i)
}

/**
 * A bed in the hotel's rooms, `x0` to `x1` on the floor at `floor`: its shadow on the carpet, its legs, the frame with
 * its rail in shade, the mattress, and the cover turned down from the foot, its fold catching the lamp. `head` is the
 * end its headboard is at (drawn by the caller). Without these, once the pillows float off it was two bare slabs.
 */
function bed(g: Pen, x0: number, x1: number, floor: number, frameTop: number, mattTop: number, head: 'left' | 'right'): void {
  pool(g.p, g.k, [(x0 + x1) / 2, floor - 0.01], (x1 - x0) * 0.55, 0.06, H.wallShade, 0.5)
  for (const lx of [x0 + 0.08, x1 - 0.2]) rect(g, lx, floor - 0.1, lx + 0.07, floor, H.wood)
  rect(g, x0, frameTop, x1, floor - 0.1, H.wood, g.ink, 0.6)
  rect(g, x0 + 0.02, frameTop + 0.1, x1 - 0.02, floor - 0.14, mixHex(H.wood, H.wallShade, 0.35))
  const m0 = x0 + 0.04
  const m1 = x1 - 0.06
  rect(g, m0, mattTop, m1, frameTop, C.bedding, g.ink, 0.5)
  const cover = mixHex(C.curtain, C.bedding, 0.45)
  const fold = head === 'right' ? lerp(m0, m1, 0.62) : lerp(m0, m1, 0.38)
  const [c0, c1] = head === 'right' ? [m0, fold] : [fold, m1]
  rect(g, c0, mattTop + 0.02, c1, frameTop + 0.02, cover, g.ink, 0.5)
  const [f0, f1] = head === 'right' ? [fold - 0.12, fold] : [fold, fold + 0.12]
  rect(g, f0, mattTop + 0.02, f1, frameTop + 0.02, mixHex(C.bedding, H.lamp, 0.35), g.ink, 0.4)
}

/** A nightstand: its top, a drawer and its pull. */
function nightstand(g: Pen, x0: number, x1: number, top: number, floor: number): void {
  rect(g, x0, top, x1, floor, H.woodLight, g.ink, 0.5)
  rect(g, x0 - 0.03, top - 0.03, x1 + 0.03, top + 0.04, H.wood, g.ink, 0.4)
  const dy = top + (floor - top) * 0.3
  rect(g, x0 + 0.05, dy, x1 - 0.05, dy + 0.16, mixHex(H.woodLight, H.wood, 0.4), g.ink, 0.35)
  const cx = (x0 + x1) / 2
  rect(g, cx - 0.03, dy + 0.07, cx + 0.03, dy + 0.09, H.brass)
}

function drawMiddle(g: Pen, f: View, t: number): void {
  if (!seen(f, B.left, B.slab, B.right, B.mid)) return
  ROOMS.forEach(([x0, x1], i) => {
    if (!seen(f, x0, B.slab, x1, B.mid)) return
    rect(g, x0, B.slab, x1, B.mid, C.rooms[i % 3])
    rect(g, x0, 27.4, x1, B.mid, mixHex(C.rooms[i % 3], H.wallShade, 0.4))
    const mid = (x0 + x1) / 2
    const flip = i % 2 === 0
    const wx = i === 4 ? 8.35 : mid - 0.85
    window_(g, wx, 23.4, wx + 1.7, 26.5, 20 + i)
    // The door on the back wall, and the bed (with its lamp) at the other end.
    door(g, flip ? x1 - 1.55 : x0 + 0.45, B.mid, 2.3, 1.1)
    const bx = flip ? x0 + 0.25 : x1 - 2.35
    bed(g, bx, bx + 2.1, B.mid, 27.85, 27.58, flip ? 'left' : 'right')
    const hb = flip ? bx : bx + 1.95
    rect(g, hb, 26.9, hb + 0.15, B.mid, H.wood, g.ink, 0.6)
    const ns = flip ? bx + 2.2 : bx - 0.55
    nightstand(g, ns, ns + 0.42, 27.9, B.mid)
    // The bedside lamp: its shade floats off when the hotel goes weightless.
    const shade = floating([ns + 0.21, 27.55], [0.25 - (i % 3) * 0.2, -0.9 - 0.2 * (i % 2)], 5, 0.12 * (i % 2 ? 1 : -1), i, t)
    rect(g, ns + 0.18, 27.6, ns + 0.24, 27.9, H.brass)
    lampShade(g, shade.at, shade.turn, 0.34)
    glow(g, shade.at, 1.1, 0.34, t)
    pool(g.p, g.k, [ns + 0.21, 27.9], 0.9, 0.2, H.lamp, 0.14 * lampGain(t))
  })
}

function lampShade(g: Pen, p: Pt, turn: number, w: number): void {
  at(g, p, turn, () => poly(g, [[-w * 0.35, -w * 0.3], [w * 0.35, -w * 0.3], [w * 0.5, w * 0.3], [-w * 0.5, w * 0.3]], H.glass, g.ink, 0.5))
}

function drawLobby(g: Pen, f: View, t: number): void {
  if (!seen(f, B.left, B.slab2, B.right, B.lobby)) return
  const x0 = Math.max(B.left + B.wall, f.x0 - 1)
  const x1 = Math.min(B.right - B.wall, f.x1 + 1)
  rect(g, x0, B.slab2, x1, B.lobby, C.lobby)
  rect(g, x0, 34.9, x1, B.lobby, mixHex(C.lobby, H.wallShade, 0.4))
  // Pilasters on the back wall.
  for (const px of [-15.8, -10.2, -4.6, 4.4, 10.0, 15.6]) if (seen(f, px - 0.4, 29, px + 0.4, 36)) rect(g, px - 0.3, B.slab2, px + 0.3, B.lobby, mixHex(C.lobby, H.wallShade, 0.25), g.ink, 0.4)
  // The desk, and the key rack behind it.
  if (seen(f, 12, 30, 16.5, 36)) {
    rect(g, 12.85, 31.2, 15.85, 32.55, mixHex(H.wood, C.lobby, 0.55), g.ink, 0.4)
    if (g.k > 9) for (let r = 0; r < 3; r++) for (let q = 0; q < 7; q++) rect(g, 13.0 + q * 0.4, 31.33 + r * 0.4, 13.18 + q * 0.4, 31.47 + r * 0.4, rgba(H.wood, 0.28))
    // The desk: its shadow on the marble, a plinth in shade, its front in raised panels, the brass rail along its top.
    pool(g.p, g.k, [14.35, B.lobby - 0.01], 2.2, 0.07, H.wallShade, 0.55)
    rect(g, 12.5, 34.95, 16.2, B.lobby, H.wood, g.ink, 0.7)
    rect(g, 12.5, B.lobby - 0.12, 16.2, B.lobby, mixHex(H.wood, H.wallShade, 0.45))
    for (let q = 0; q < 4; q++) {
      const px = 12.62 + q * 0.9
      rect(g, px, 35.1, px + 0.76, B.lobby - 0.2, mixHex(H.wood, H.woodLight, 0.3), g.ink, 0.35)
    }
    rect(g, 12.4, 34.85, 16.3, 34.97, H.brass, g.ink, 0.5)
  }
  // A sofa and a floor lamp, left of where they come down through the lobby.
  if (seen(f, 5.8, 34, 9.2, 36)) {
    const so = floating([7.35, 35.62], [0.05, -0.28], 5, 0.015, 17, t)
    at(g, so.at, so.turn, () => {
      rect(g, -1.15, -0.42, 1.15, 0.12, C.curtain, g.ink, 0.6)
      rect(g, -1.05, -0.12, 1.05, 0.02, mixHex(C.curtain, H.glass, 0.2), g.ink, 0.4)
      rect(g, -1.25, -0.2, -1.05, 0.12, C.curtain, g.ink, 0.5)
      rect(g, 1.05, -0.2, 1.25, 0.12, C.curtain, g.ink, 0.5)
    })
    rect(g, 5.95, 34.0, 6.01, B.lobby, H.brass)
    const ls = floating([5.98, 33.85], [0.2, -0.3], 4, 0.05, 19, t)
    lampShade(g, ls.at, ls.turn, 0.42)
    glow(g, ls.at, 1.4, 0.3, t)
  }
  // The lift's landing: its walnut surround either side of the shaft, a sconce each side, the call buttons, and over
  // them the floor dial, its needle following the cabin down the shaft.
  if (seen(f, -3.6, 31.5, 3.6, 36)) {
    for (const s of [-1, 1]) {
      rect(g, s < 0 ? -1.36 : 1.1, 33.25, s < 0 ? -1.1 : 1.36, B.lobby, H.wood, g.ink, 0.6)
      rect(g, s < 0 ? -1.42 : 1.1, 33.15, s < 0 ? -1.1 : 1.42, 33.27, H.brass, g.ink, 0.4)
      sconce(g, s * 2.95, 33.2, t, 7 + (s > 0 ? 1 : 0))
    }
    rect(g, 1.62, 34.05, 1.8, 34.55, H.brass, g.ink, 0.4)
    if (g.k > 6) for (const [q, lit] of [[34.2, false], [34.4, true]] as const) disc(g, [1.71, q], 0.045, lit ? H.lamp : H.wood)
    const dc: Pt = [2.1, 32.55]
    const dr = 0.36
    const half = (r: number, fill: string, stroke: string | null): void => {
      g.c.beginPath()
      g.c.arc(dc[0] * g.k, dc[1] * g.k, r * g.k, Math.PI, 2 * Math.PI)
      g.c.closePath()
      g.c.fillStyle = fill
      g.c.fill()
      if (stroke) {
        g.c.strokeStyle = stroke
        g.c.lineWidth = g.w * 0.5
        g.c.stroke()
      }
    }
    half(dr, H.brass, g.ink)
    half(dr * 0.84, H.glass, null)
    // Its floors: the top on the right, the lobby on the left.
    const swing = (u: number): number => lerp(1.15, -1.15, u)
    const tip = (a: number, r: number): Pt => [dc[0] + Math.sin(a) * r, dc[1] - Math.cos(a) * r]
    if (g.k > 6) for (const u of [0, 0.5, 1]) line(g, tip(swing(u), dr * 0.62), tip(swing(u), dr * 0.82), g.ink, 0.5)
    const u = clamp01((cabinY(t) - B.top) / (B.lobby - B.top))
    line(g, dc, tip(swing(u), dr * 0.74), g.ink, 0.8)
    disc(g, dc, 0.05, H.brass)
  }
  // Chandeliers: a brass ring of milk-glass cups on a chain, and a potted palm by the door.
  for (const [i, cx] of [-9.4, 4.9].entries()) {
    if (!seen(f, cx - 1, 29, cx + 1, 32)) continue
    const fl = floating([cx, 30.35], [0, -0.35], 4, 0.05 * (i ? 1 : -1), 40 + i, t)
    line(g, [cx, B.slab2], [fl.at[0], fl.at[1] - 0.25], H.cable, 0.5)
    at(g, fl.at, fl.turn, () => {
      poly(g, [[-0.62, 0], [0.62, 0], [0.5, 0.12], [-0.5, 0.12]], H.brass, g.ink, 0.5)
      for (let q = -2; q <= 2; q++) poly(g, [[q * 0.25 - 0.07, -0.14], [q * 0.25 + 0.07, -0.14], [q * 0.25 + 0.05, 0], [q * 0.25 - 0.05, 0]], H.glass, g.ink, 0.4)
      rect(g, -0.03, -0.25, 0.03, 0.3, H.brass)
    })
    glow(g, fl.at, 1.6, 0.3, t)
  }
  if (seen(f, -17.8, 33, -15.6, 36)) {
    rect(g, -17.1, 35.3, -16.5, B.lobby, H.woodLight, g.ink, 0.5)
    const { tau } = afloat(t)
    for (let q = 0; q < 6; q++) {
      const a0 = -Math.PI / 2 + (q - 2.5) * 0.42
      const spread = 1 + 0.25 * (1 - Math.exp(-tau / 4))
      const a = -Math.PI / 2 + (a0 + Math.PI / 2) * spread + 0.04 * Math.sin(tau * 0.8 + q)
      const tip: Pt = [-16.8 + Math.cos(a) * 0.95, 35.3 + Math.sin(a) * 0.95]
      const mid: Pt = [-16.8 + Math.cos(a) * 0.5 + Math.cos(a + 1.3) * 0.12, 35.3 + Math.sin(a) * 0.5 + Math.sin(a + 1.3) * 0.12]
      poly(g, [[-16.8, 35.3], mid, tip, [-16.8 + Math.cos(a) * 0.5 - Math.cos(a + 1.3) * 0.08, 35.3 + Math.sin(a) * 0.5 - Math.sin(a + 1.3) * 0.08]], C.leaf)
    }
  }
}

/* ------------------------------------------------------------------ the section: slabs and walls */

function drawSection(g: Pen, f: View, t: number): void {
  const L = B.left
  const Rt = B.right
  const x0 = Math.max(L, f.x0 - 1)
  const x1 = Math.min(Rt, f.x1 + 1)
  if (x1 <= x0) return
  const shaft0 = SHAFT[0]
  const shaft1 = SHAFT[1]
  const span = (y0: number, y1: number, fill: string, gap = true) => {
    if (!seen(f, x0, y0, x1, y1)) return
    if (gap && x0 < shaft0 && x1 > shaft1) {
      rect(g, x0, y0, shaft0, y1, fill, g.ink, 0.8)
      rect(g, shaft1, y0, x1, y1, fill, g.ink, 0.8)
    } else rect(g, x0, y0, x1, y1, fill, g.ink, 0.8)
  }
  // The roof, with its parapets, the lift's machine room and the drum's cowl.
  span(B.roof, B.ceil, C.concrete, false)
  if (seen(f, -8, 16.9, 2, 17.9)) {
    const [dx, dy] = DRUM
    const r = HOLE + COLLAR + 0.02
    g.c.beginPath()
    g.c.arc(dx * g.k, dy * g.k, r * g.k, Math.PI + 0.62, -0.62)
    g.c.closePath()
    g.c.fillStyle = C.concrete
    g.c.fill()
    g.c.strokeStyle = g.ink
    g.c.lineWidth = g.w * 0.8
    g.c.stroke()
    // The lift's winding gear, beside the shaft on the roof.
    rect(g, 1.05, 17.3, 1.9, B.roof, C.concreteDark, g.ink, 0.7)
  }
  for (const [a, b] of [[L, L + 0.3], [Rt - 0.3, Rt]]) if (seen(f, a, 17.3, b, 18)) rect(g, a, 17.35, b, B.roof, C.concrete, g.ink, 0.8)
  // The top floor's slab (the carpet on it), the middle floor's (carpet too), the lobby's marble and the footings.
  span(B.top, B.slab, C.concrete)
  if (seen(f, x0, B.top - 0.1, x1, B.top + 0.1)) {
    rect(g, x0, B.top, Math.min(x1, shaft0), B.top + 0.09, H.carpet)
    if (x1 > shaft1) rect(g, Math.max(x0, shaft1), B.top, x1, B.top + 0.09, H.carpet)
    rect(g, x0, B.slab - 0.09, x1, B.slab, C.plaster)
  }
  span(B.mid, B.slab2, C.concrete)
  if (seen(f, x0, B.mid - 0.1, x1, B.mid + 0.1)) {
    rect(g, x0, B.mid, Math.min(x1, shaft0), B.mid + 0.09, H.carpetDark)
    if (x1 > shaft1) rect(g, Math.max(x0, shaft1), B.mid, x1, B.mid + 0.09, H.carpetDark)
    rect(g, x0, B.slab2 - 0.09, x1, B.slab2, C.plaster)
  }
  if (seen(f, x0, B.lobby, x1, B.foot)) {
    rect(g, x0, B.lobby, x1, B.foot, C.concreteDark, g.ink, 0.8)
    rect(g, x0, B.lobby, x1, B.lobby + 0.1, H.marble)
    if (g.k > 4) for (let x = Math.ceil(x0 / 3) * 3; x < x1; x += 3) rect(g, x - 0.25, B.lobby + 0.1, x + 0.25, B.foot, C.concrete)
  }
  // The end walls, with their windows onto the night.
  for (const [a, b] of [[L, L + B.wall], [Rt - B.wall, Rt]]) {
    if (!seen(f, a, B.roof, b, B.lobby)) continue
    rect(g, a, B.roof, b, B.lobby, C.concrete, g.ink, 0.8)
    for (const [w0, w1] of [[19.0, 20.5], [23.4, 26.5], [30.6, 33.6]]) rect(g, a, w0, b, w1, C.pane)
  }
  // The street doors.
  if (seen(f, Rt - 0.4, 33.5, Rt + 0.2, 36)) {
    rect(g, Rt - B.wall, 33.6, Rt, B.lobby, rgba(H.glass, 0.35), H.brass, 0.8)
    line(g, [Rt - B.wall / 2, 33.6], [Rt - B.wall / 2, B.lobby], H.brass, 0.6)
  }
  // The middle floor's partitions and the shaft's walls below the top floor.
  for (const x of PARTITIONS) if (seen(f, x, B.slab, x + 0.2, B.mid)) rect(g, x, B.slab, x + 0.2, B.mid, C.concrete, g.ink, 0.6)
  for (const [a, b] of [[shaft0 - 0.2, shaft0], [shaft1, shaft1 + 0.2]]) {
    if (seen(f, a, B.slab, b, B.mid)) rect(g, a, B.slab, b, B.mid, C.concrete, g.ink, 0.6)
    if (seen(f, a, B.slab2, b, B.lobby)) rect(g, a, B.slab2, b, B.lobby, C.concrete, g.ink, 0.6)
  }
  // The corridor's end, and the suite's doorway in it.
  if (seen(f, B.suite - 0.15, B.ceil, B.suite + 0.2, B.top)) {
    rect(g, B.suite - 0.1, B.ceil, B.suite + 0.15, B.top - B.door, C.concrete, g.ink, 0.7)
    // The doorway's frame: its reveal either side, the lintel's trim, a brass sill.
    rect(g, B.suite - 0.16, B.top - B.door, B.suite - 0.1, B.top, H.wood)
    rect(g, B.suite + 0.15, B.top - B.door, B.suite + 0.21, B.top, H.wood)
    rect(g, B.suite - 0.16, B.top - B.door, B.suite + 0.21, B.top - B.door + 0.06, H.wood)
    rect(g, B.suite - 0.16, B.top - 0.03, B.suite + 0.21, B.top + 0.02, H.brass)
  }
  void t
}

/* ------------------------------------------------------------------ the lift */

/** The cabin's doors: open at the top floor (a through-car: the corridor runs through it), shut once Arthur is at his post. */
const doorsShut = (t: number): number => ss((ch(t) - (POST_AT - 0.08)) / 0.08)

function drawShaft(g: Pen, f: View, t: number): void {
  const [s0, s1] = SHAFT
  if (!seen(f, s0 - 1, 17, s1 + 1, 36.5)) return
  // Its dark, the rails.
  rect(g, s0, B.ceil, s1, B.lobby, H.shaft)
  if (g.k > 5) for (const x of [s0 + 0.1, s1 - 0.1]) line(g, [x, B.ceil], [x, B.lobby], C.steel, 0.5)
  // The counterweight, behind, at the foot of the shaft.
  const cw = counterweight(t)
  rect(g, 0.28, cw - 2.2, 0.72, cw, C.steelDark, g.ink, 0.5)
  if (g.k > 8) for (let q = 1; q < 6; q++) line(g, [0.28, cw - 2.2 + q * 0.37], [0.72, cw - 2.2 + q * 0.37], H.shaft, 0.4)
  const cy = cabinY(t)
  // The cables, and the charges on them; parted by the blast.
  const cut = t >= T.blast
  const chargeY = B.top - CAB[1] - 0.28
  const top = B.ceil
  for (const x of [-0.12, 0, 0.12]) {
    if (!cut) line(g, [x, top], [x, cy - CAB[1]], H.cable, 0.55)
    else {
      const u = t - T.blast
      const rec = ss(u / 0.35)
      const upper = lerp(chargeY, top + 0.3, rec)
      const whip = 0.18 * Math.exp(-u / 0.5) * Math.sin(u * 14 + x * 30)
      line(g, [x, top], [x + whip, upper], H.cable, 0.55)
      const trail = 0.25 + 0.1 * Math.sin(u * 5 + x * 20)
      line(g, [x, cy - CAB[1]], [x - whip * 0.5, cy - CAB[1] - trail], H.cable, 0.55)
    }
  }
  const armed = ch(t) >= CHARGES_AT && !cut
  if (armed) {
    for (const x of [-0.12, 0.12]) rect(g, x - 0.07, chargeY - 0.11, x + 0.07, chargeY + 0.11, C.concreteDark, g.ink, 0.5)
    rect(g, -0.19, chargeY - 0.02, 0.19, chargeY + 0.02, H.brass)
    // The wire down to Arthur's plunger at the landing.
    g.c.beginPath()
    g.c.moveTo(0.12 * g.k, chargeY * g.k)
    g.c.quadraticCurveTo(0.95 * g.k, (chargeY + 0.1) * g.k, 1.28 * g.k, 20.3 * g.k)
    g.c.strokeStyle = H.cable
    g.c.lineWidth = g.w * 0.4
    g.c.stroke()
  }
  drawCabin(g, t, cy)
  // The blast: a flash, then smoke hanging (it is weightless), and bits flying out.
  if (t >= T.blast - 0.01 && t < T.blast + 6) {
    const u = t - T.blast
    const flash = Math.exp(-u / 0.12)
    bloom(g.p, g.k, [0, chargeY], 1.9, H.lamp, 0.95 * flash)
    bloom(g.p, g.k, [0, chargeY], 0.7, H.glass, 0.9 * flash)
    for (let q = 0; q < 7; q++) {
      const a = hash(q, 1, 9) * Math.PI * 2
      const d = 0.15 + (0.5 + hash(q, 2, 9) * 0.6) * (1 - Math.exp(-u / 1.4))
      bloom(g.p, g.k, [Math.cos(a) * d * 0.7, chargeY + Math.sin(a) * d * 0.5 - 0.1], 0.35 + 0.3 * (1 - Math.exp(-u / 1.5)), C.plaster, 0.28 * Math.exp(-u / 2.4) * clamp01(u / 0.08))
    }
    if (g.k > 6)
      for (let q = 0; q < 9; q++) {
        const a = hash(q, 3, 9) * Math.PI * 2
        const v = 1.2 + hash(q, 4, 9) * 2
        const d = v * 0.8 * (1 - Math.exp(-u / 0.8))
        const p: Pt = [Math.cos(a) * d, chargeY + Math.sin(a) * d]
        if (Math.abs(p[0]) > 0.85 && p[1] > B.ceil) continue
        at(g, p, u * (3 + q), () => rect(g, -0.03, -0.015, 0.03, 0.015, C.concreteDark))
      }
  }
  // Passing the middle floor's landing, its corners catch the sills: sparks.
  if (t >= T.pass - 0.02 && t < T.pass + 0.9 && g.k > 4) {
    const u = t - T.pass
    for (let q = 0; q < 14; q++) {
      const side = q % 2 ? 1 : -1
      const a = (side > 0 ? 0 : Math.PI) + (hash(q, 1, 31) - 0.5) * 1.6
      const v = 1.2 + 2.2 * hash(q, 2, 31)
      const d = v * u
      const life = 1 - u / (0.35 + 0.5 * hash(q, 3, 31))
      if (life <= 0) continue
      const p0: Pt = [side * 0.82 + Math.cos(a) * d, B.mid + Math.sin(a) * d * 0.6]
      line(g, p0, [p0[0] - Math.cos(a) * 0.08, p0[1] - Math.sin(a) * 0.05], rgba(H.lamp, 0.9 * life), 0.7)
    }
    bloom(g.p, g.k, [0.8, B.mid], 0.5, H.lamp, 0.4 * Math.exp(-u / 0.15))
    bloom(g.p, g.k, [-0.8, B.mid], 0.5, H.lamp, 0.4 * Math.exp(-u / 0.15))
  }
  // The slam: dust bursting out of the pit along the lobby's floor, and bits of it.
  if (t >= T.slam && t < T.slam + 5) {
    const u = t - T.slam
    const out = 1 - Math.exp(-u / 0.5)
    for (const sx of [-1, 1])
      for (let q = 0; q < 3; q++) {
        const d = 0.7 + (0.6 + q * 0.7) * out
        bloom(g.p, g.k, [sx * d, B.lobby - 0.25 - q * 0.12 * out], 0.45 + 0.35 * q + 0.5 * out, H.glass, (0.5 - q * 0.1) * Math.exp(-u / (1.1 + q * 0.5)) * clamp01(u / 0.04))
      }
    if (g.k > 5)
      for (let q = 0; q < 12; q++) {
        const sx = q % 2 ? 1 : -1
        const a = (sx > 0 ? 0 : Math.PI) + (hash(q, 5, 9) - 0.5) * 1.3 - sx * 0.35
        const v = 1.5 + 2.5 * hash(q, 6, 9)
        const d = v * 0.7 * (1 - Math.exp(-u / 0.7))
        const p: Pt = [sx * 0.85 + Math.cos(a) * d, B.lobby - 0.1 + Math.sin(a) * d * 0.7]
        at(g, p, u * (4 + q), () => rect(g, -0.035, -0.02, 0.035, 0.02, C.concreteDark))
      }
  }
}

/** The counterweight: at the foot while the cabin waits at the top; freed by the blast, it drifts (there is no weight). */
function counterweight(t: number): number {
  if (t < T.blast) return B.lobby - 0.1
  return B.lobby - 0.1 - 0.12 * (1 - Math.exp(-(t - T.blast) / 2))
}

function drawCabin(g: Pen, t: number, cy: number): void {
  const [w, h0] = CAB
  const sq = t >= T.slam ? 0.14 * Math.exp(-(t - T.slam) / 0.12) * Math.cos((t - T.slam) * 26) : 0
  const h = h0 - sq
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = cy - h
  const shut = doorsShut(t)
  // Its back wall, walnut; the rail; its light.
  rect(g, x0, y0, x1, cy, H.woodLight)
  rect(g, x0 + 0.1, y0 + 0.2, x1 - 0.1, cy - 0.12, H.wood)
  line(g, [x0 + 0.1, cy - 0.85], [x1 - 0.1, cy - 0.85], H.brass, 0.8)
  poly(g, [[-0.22, y0 + 0.1], [0.22, y0 + 0.1], [0.16, y0 + 0.2], [-0.16, y0 + 0.2]], H.glass)
  bloom(g.p, g.k, [0, y0 + 0.3], 0.9, H.lamp, 0.25 * lampGain(t))
  // What is in it: the sleepers, tied; the line across the floor that holds the three of them.
  drawSleepers(g, t, true)
  drawCabinLine(g, t, cy)
  // The frame in section: roof, floor, and the jambs; the brass doors when they are shut.
  rect(g, x0, y0 - 0.1, x1, y0 + 0.02, H.brass, g.ink, 0.8)
  rect(g, x0, cy, x1, cy + 0.12, H.brass, g.ink, 0.8)
  rect(g, x0, cy - 0.04, x1, cy, H.carpet)
  for (const [a, b] of [[x0 - 0.02, x0 + 0.06], [x1 - 0.06, x1 + 0.02]]) {
    rect(g, a, y0, b, y0 + 0.18, H.brass, g.ink, 0.6)
    if (shut > 0) rect(g, a, y0 + 0.18, b, y0 + 0.18 + (h - 0.18) * shut, mixHex(H.brass, H.wood, 0.25), g.ink, 0.6)
  }
}

/** The line across the cabin's floor: taut, bowed up where the three came up against it, then holding them down. */
function drawCabinLine(g: Pen, t: number, cy: number): void {
  if (ch(t) < TOW.to) return
  const rest = 0.3
  const pts: Pt[] = [[-CAB[0] / 2 + 0.06, cy - rest]]
  if (t > T.lift && t < T.slam) {
    const who: Who[] = ['ariadne', 'cobb', 'fischer']
    for (const w of who) {
      const b = liftAt(w, t)
      const h = cy - b[1]
      const top = h > -0.2 && h < 1.5 ? Math.max(rest, h + R + 0.015) : rest
      pts.push([b[0], cy - top])
    }
  }
  pts.push([CAB[0] / 2 - 0.06, cy - rest])
  const { c, k } = g
  c.beginPath()
  c.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length - 1; i++) {
    const m: Pt = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]
    c.quadraticCurveTo(pts[i][0] * k, pts[i][1] * k, m[0] * k, m[1] * k)
  }
  c.lineTo(pts[pts.length - 1][0] * k, pts[pts.length - 1][1] * k)
  c.strokeStyle = C.bedding
  c.lineWidth = g.w * 0.8
  c.stroke()
}

/* ------------------------------------------------------------------ the drum */

const FS = 0.35
/** The collar of concrete round the drum's hole. */
const COLLAR = 0.2
const sc = (d: number): number => 1 / (1 + (1 / FS - 1) * d)
const pr = (x: number, y: number, d: number): Pt => [x * sc(d), y * sc(d)]

function drawDrum(g: Pen, f: View, t: number): void {
  const [dx, dy] = DRUM
  if (!seen(f, dx - HOLE - 0.4, dy - HOLE - 0.4, dx + HOLE + 0.4, dy + HOLE + 0.4)) return
  const a = drumAngle(t)
  const { c, k } = g
  // The hole in the building it turns in, in a concrete collar.
  c.beginPath()
  c.arc(dx * k, dy * k, (HOLE + COLLAR) * k, 0, Math.PI * 2)
  c.arc(dx * k, dy * k, HOLE * k, 0, Math.PI * 2, true)
  c.fillStyle = C.concreteDark
  c.fill()
  c.strokeStyle = g.ink
  c.lineWidth = g.w * 0.8
  c.stroke()
  disc(g, DRUM, HOLE, H.shaft)
  // The sills that bridge to its doorways, floor and lintel, both sides.
  for (const s of [-1, 1]) {
    const xa = dx + s * Math.sqrt((HOLE + COLLAR) ** 2 - HIN * HIN)
    const xb = dx + s * 1.86
    rect(g, Math.min(xa, xb), B.top, Math.max(xa, xb), B.top + 0.12, C.steel, g.ink, 0.5)
    rect(g, Math.min(xa, xb), B.ceil - 0.12, Math.max(xa, xb), B.ceil, C.steel, g.ink, 0.5)
  }
  // Its rollers (fixed), turning as it turns on them, and the brake under it.
  for (const ang of ROLLERS) {
    const rr = TYRE + ROLLER_R
    const p: Pt = [dx + Math.cos(ang) * rr, dy + Math.sin(ang) * rr]
    const out: Pt = [dx + Math.cos(ang) * (HOLE + 0.25), dy + Math.sin(ang) * (HOLE + 0.25)]
    line(g, p, out, C.steelDark, 2.2)
    disc(g, p, ROLLER_R, C.steel, g.ink, 0.7)
    if (k > 8)
      at(g, p, (-a * TYRE) / ROLLER_R, () => {
        for (let q = 0; q < 3; q++) line(g, [0, 0], rot((q * 2 * Math.PI) / 3, [ROLLER_R * 0.8, 0]), C.steelDark, 0.6)
      })
    disc(g, p, 0.05, C.steelDark)
  }
  const bk = brake(t)
  at(g, [dx + 0.7, dy + HOLE + 0.02], 0.55 * (1 - bk), () => {
    poly(g, [[0, 0], [-0.7, -0.24 + 0], [-0.75, -0.08], [-0.05, 0.1]], C.steelDark, g.ink, 0.6)
    rect(g, -1.0, -0.36, -0.55, -0.16, H.brass, g.ink, 0.5)
  })
  // The drum itself, turned.
  c.save()
  c.translate(dx * k, dy * k)
  c.rotate(a)
  drumRoom(g, t, a)
  // The doorways' insides: the corridor carried through the wall.
  const rimTop = Math.sqrt(DISK * DISK - DOOR_TOP * DOOR_TOP)
  const rimBot = Math.sqrt(DISK * DISK - HIN * HIN)
  for (const s of [-1, 1]) {
    poly(g, [[s * HIN, DOOR_TOP], [s * rimTop, DOOR_TOP], [s * rimBot, HIN], [s * HIN, HIN]], C.channel)
    rect(g, Math.min(s * HIN, s * rimBot), HIN - 0.08, Math.max(s * HIN, s * rimBot), HIN, H.carpet)
  }
  // The disk: walnut in section, the room and its doorways cut out of it.
  c.beginPath()
  c.arc(0, 0, DISK * k, 0, Math.PI * 2)
  const ang = (x: number, y: number) => Math.atan2(y, x)
  c.moveTo(-HIN * k, -HIN * k)
  c.lineTo(HIN * k, -HIN * k)
  c.lineTo(HIN * k, DOOR_TOP * k)
  c.lineTo(rimTop * k, DOOR_TOP * k)
  c.arc(0, 0, DISK * k, ang(rimTop, DOOR_TOP), ang(rimBot, HIN), false)
  c.lineTo(-rimBot * k, HIN * k)
  c.arc(0, 0, DISK * k, ang(-rimBot, HIN), ang(-rimTop, DOOR_TOP), false)
  c.lineTo(-HIN * k, DOOR_TOP * k)
  c.closePath()
  c.fillStyle = H.wood
  c.fill('evenodd')
  c.strokeStyle = g.ink
  c.lineWidth = g.w * 0.8
  c.stroke()
  // Its steel tyre, riveted, and a brass line at its rim.
  c.beginPath()
  c.arc(0, 0, TYRE * k, 0, Math.PI * 2)
  c.arc(0, 0, DISK * k, 0, Math.PI * 2, true)
  c.fillStyle = C.steel
  c.fill()
  c.strokeStyle = g.ink
  c.lineWidth = g.w * 0.7
  c.stroke()
  if (k > 7)
    for (let q = 0; q < 24; q++) {
      const pt = rot((q * Math.PI) / 12, [(DISK + TYRE) / 2, 0])
      if (pt[1] > DOOR_TOP - 0.05 && pt[1] < HIN + 0.05) continue
      disc(g, pt, 0.025, C.steelDark)
    }
  c.beginPath()
  c.arc(0, 0, (DISK - 0.05) * k, 0, Math.PI * 2)
  c.strokeStyle = H.brass
  c.lineWidth = g.w * 0.6
  c.stroke()
  // The doorways go on through the tyre.
  const tyTop = Math.sqrt(TYRE * TYRE - DOOR_TOP * DOOR_TOP) + 0.01
  const tyBot = Math.sqrt(TYRE * TYRE - HIN * HIN) + 0.01
  for (const s of [-1, 1]) {
    poly(g, [[s * (rimTop - 0.06), DOOR_TOP], [s * tyTop, DOOR_TOP], [s * tyBot, HIN], [s * (rimBot - 0.06), HIN]], C.channel)
    rect(g, Math.min(s * (rimBot - 0.06), s * tyBot), HIN - 0.08, Math.max(s * (rimBot - 0.06), s * tyBot), HIN, H.carpet)
    line(g, [s * HIN, DOOR_TOP], [s * tyTop, DOOR_TOP], g.ink, 0.8)
    line(g, [s * HIN, HIN], [s * tyBot, HIN], g.ink, 0.8)
  }
  c.restore()
}

/** The room inside the drum: a length of the corridor seen end-on, going away from us to a window at its end. */
function drumRoom(g: Pen, t: number, a: number): void {
  const h = HIN
  const q = h * FS
  // The four faces and the far wall.
  poly(g, [[-h, h], [h, h], [q, q], [-q, q]], H.carpet)
  poly(g, [[-h * 0.42, h], [h * 0.42, h], [q * 0.42, q], [-q * 0.42, q]], H.carpetDark)
  poly(g, [[-h, -h], [h, -h], [q, -q], [-q, -q]], C.plaster)
  poly(g, [[-h, -h], [-q, -q], [-q, q], [-h, h]], H.wall)
  poly(g, [[h, -h], [q, -q], [q, q], [h, h]], H.wallShade)
  rect(g, -q, -q, q, q, C.far)
  // The window at the end, onto the night.
  rect(g, -0.12, -0.26, 0.12, 0.17, C.pane, g.ink, 0.4)
  rect(g, -0.09, -0.2, -0.06, -0.16, rgba(H.glass, 0.4))
  rect(g, 0.04, -0.05, 0.07, -0.01, rgba(H.lamp, 0.4))
  // The doors along both walls, going away.
  const wallDoor = (s: number, d0: number, d1: number) => {
    const A = pr(s * h, h - B.door, d0)
    const Bq = pr(s * h, h - B.door, d1)
    const Cq = pr(s * h, h, d1)
    const Dq = pr(s * h, h, d0)
    poly(g, [A, Bq, Cq, Dq], H.wood, g.ink, 0.5)
    if (g.k > 10) {
      const m0 = pr(s * h, h - B.door * 0.5, d0 + (d1 - d0) * 0.8)
      rect(g, m0[0] - 0.02, m0[1] - 0.02, m0[0] + 0.02, m0[1] + 0.02, H.brass)
    }
  }
  wallDoor(-1, 0.1, 0.3)
  wallDoor(-1, 0.55, 0.66)
  wallDoor(1, 0.28, 0.46)
  wallDoor(1, 0.72, 0.8)
  // Where the walls meet: the room's corners, going away.
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) line(g, [sx * h, sy * h], [sx * q, sy * q], g.ink, 0.45)
  // A sconce on each wall, and the lamps hanging from the ceiling: they hang the way gravity is (which the drum turns).
  for (const [s, d] of [[-1, 0.42], [1, 0.14]] as const) {
    const p = pr(s * h, -0.2, d)
    rect(g, p[0] - 0.02, p[1] - 0.05, p[0] + 0.02, p[1] + 0.05, H.brass)
    glow(g, p, 0.35 * sc(d) + 0.15, 0.28, t)
  }
  for (const d of [0.62, 0.22]) pendant(g, t, a, d)
}

/**
 * A lamp on a chain from the ceiling at depth `d`: it hangs toward the world's down (the drum turns, gravity does not),
 * lagging a little, and where that would be up into the ceiling it lies along it; weightless, its chain goes slack.
 */
function pendant(g: Pen, t: number, a: number, d: number): void {
  const s = sc(d)
  const piv = pr(0, -HIN, d)
  const L = 0.42 * s
  const lag = drumAngle(t - 0.14)
  let psi = Math.atan2(Math.sin(lag), Math.cos(lag))
  const sway = 0.06 * Math.sin(ch(t) * 2.1 + d * 5) * Math.exp(-Math.abs(lag - a) * 0)
  psi += sway * (t < T.turn ? 0.4 : 1)
  let end: Pt
  let turn: number
  if (Math.abs(psi) <= Math.PI / 2) {
    end = [piv[0] + L * Math.sin(-psi) * -1, piv[1] + L * Math.cos(psi)]
    end = [piv[0] + L * Math.sin(psi), piv[1] + L * Math.cos(psi)]
    turn = -psi
  } else {
    end = [piv[0] + L * Math.sin(psi), piv[1] + 0.02 * s]
    turn = Math.sign(psi) * -Math.PI / 2
  }
  const { tau } = afloat(t)
  if (tau > 0) {
    const e = 1 - Math.exp(-tau / 1.5)
    end = [lerp(end[0], piv[0] + 0.08 * s * Math.sin(tau * 0.7 + d * 9), e), lerp(end[1], piv[1] + 0.12 * s, e)]
    turn = lerp(turn, 0.6 * Math.sin(tau * 0.4 + d * 3), e)
  }
  line(g, piv, end, H.cable, 0.5)
  at(g, end, turn, () => poly(g, [[-0.08 * s, 0], [0.08 * s, 0], [0.15 * s, 0.14 * s], [-0.15 * s, 0.14 * s]], H.glass, g.ink, 0.4))
  const lamp = rot(-turn, [0, 0.12 * s])
  glow(g, [end[0] + lamp[0], end[1] + lamp[1]], 0.5 * s + 0.2, 0.3, t)
}

/* ------------------------------------------------------------------ what floats */

/**
 * Something loose, afloat from the van going off the bridge: it lifts from `rest` toward `rest + drift` over `tau0`
 * hotel seconds, turning `spin` radians a hotel second at first and slowing, with a slow sway; when gravity comes back
 * with the river it falls back.
 */
function floating(rest: Pt, drift: Pt, tau0: number, spin: number, seed: number, t: number): { at: Pt; turn: number } {
  const { tau, back } = afloat(t)
  if (tau <= 0) return { at: rest, turn: 0 }
  const e = 1 - Math.exp(-tau / tau0)
  const sway: Pt = [0.05 * Math.sin(0.45 * tau + seed) * e, 0.04 * Math.sin(0.33 * tau + seed * 1.7) * e]
  let p: Pt = [rest[0] + drift[0] * e + sway[0], rest[1] + drift[1] * e + sway[1]]
  let turn = spin * 6 * (1 - Math.exp(-tau / 6))
  if (back > 0) {
    p = [p[0], lerp(p[1], rest[1], back)]
    turn = lerp(turn, Math.round(turn / Math.PI) * Math.PI, back)
  }
  return { at: p, turn }
}

/** The standing lamp's shade: off its pole, it drifts the length of the suite under the ceiling, turning as it goes. */
function drifting(t: number): { at: Pt; turn: number } {
  const rest: Pt = [8.1, 19.27]
  const { tau, back } = afloat(t)
  if (tau <= 0) return { at: rest, turn: 0 }
  const go = Math.min(tau, 28)
  let p: Pt = [rest[0] + 0.3 * go * ss(tau / 2), rest[1] - 0.3 * (1 - Math.exp(-tau / 3)) + 0.04 * Math.sin(tau * 0.6)]
  let turn = 0.24 * go
  if (back > 0) {
    p = [p[0], lerp(p[1], B.top - 0.15, back)]
    turn = lerp(turn, Math.round(turn / Math.PI) * Math.PI, back)
  }
  return { at: p, turn }
}

/** The room-service trolley by the lift, and the bottle in its bucket that Cobb knocks as he floats over it. */
const TROLLEY: Pt = [2.72, B.top - 0.2]
function drawTrolley(g: Pen, f: View, t: number): void {
  if (!seen(f, 1.5, 19, 4, 21)) return
  const tr = floating(TROLLEY, [0.1, -0.06], 3, 0.015, 3, t)
  at(g, tr.at, tr.turn, () => {
    rect(g, -0.45, -0.25, 0.45, -0.19, C.bedding, g.ink, 0.5)
    rect(g, -0.42, -0.19, 0.42, 0.05, rgba(H.glass, 0.25))
    line(g, [-0.4, -0.19], [-0.4, 0.12], H.brass, 0.8)
    line(g, [0.4, -0.19], [0.4, 0.12], H.brass, 0.8)
    line(g, [-0.42, 0.05], [0.42, 0.05], H.brass, 0.8)
    for (const x of [-0.36, 0.36]) rect(g, x - 0.04, 0.12, x + 0.04, 0.2, H.cable)
    // The bucket.
    poly(g, [[-0.43, -0.25], [-0.23, -0.25], [-0.25, -0.42], [-0.41, -0.42]], C.steel, g.ink, 0.5)
  })
  // The bottle: in its bucket until Cobb's knock, then away, turning, over the corridor.
  const bucket = rot(tr.turn, [-0.33, -0.42])
  const base: Pt = [tr.at[0] + bucket[0], tr.at[1] + bucket[1]]
  let p = base
  let turn = tr.turn - 0.08
  if (t > T.knock) {
    const u = ch(t) - ch(T.knock)
    const d = 1 - Math.exp(-u / 1.8)
    p = [base[0] + 1.5 * d, base[1] - 0.9 * d]
    turn += 2.6 * d * 1.8
  }
  at(g, p, turn, () => {
    poly(g, [[-0.05, 0.08], [0.05, 0.08], [0.05, -0.12], [0.02, -0.18], [0.02, -0.34], [-0.02, -0.34], [-0.02, -0.18], [-0.05, -0.12]], C.bottle, g.ink, 0.45)
  })
}

/** The console by the suite's door: the vase lifts off it and its water leaves it in beads of many sizes. */
function drawConsole(g: Pen, f: View, t: number): void {
  if (!seen(f, 3.8, 19, 6, 21)) return
  rect(g, 4.3, 20.3, 5.2, 20.38, H.wood, g.ink, 0.5)
  line(g, [4.38, 20.38], [4.38, B.top], H.wood, 0.9)
  line(g, [5.12, 20.38], [5.12, B.top], H.wood, 0.9)
  const vase = floating([4.75, 20.12], [-0.15, -0.55], 3.5, 0.06, 7, t)
  at(g, vase.at, vase.turn, () => {
    poly(g, [[-0.07, 0.18], [0.07, 0.18], [0.1, -0.02], [0.05, -0.18], [-0.05, -0.18], [-0.1, -0.02]], H.glass, g.ink, 0.5)
    for (let q = 0; q < 4; q++) {
      const a = -Math.PI / 2 + (q - 1.5) * 0.35
      line(g, [0, -0.16], [Math.cos(a) * 0.38, -0.16 + Math.sin(a) * 0.38], H.carpetDark, 0.5)
      disc(g, [Math.cos(a) * 0.4, -0.16 + Math.sin(a) * 0.4], 0.035, H.woodLight)
    }
  })
  const { tau } = afloat(t)
  if (tau > 0.2 && g.k > 6)
    for (let q = 0; q < 11; q++) {
      const r = 0.012 + 0.05 * Math.pow(hash(q, 1, 21), 2)
      const a = -Math.PI / 2 + (hash(q, 2, 21) - 0.5) * 2.4
      const sp = 0.08 + 0.18 * hash(q, 3, 21)
      const d = sp * 5 * (1 - Math.exp(-(tau - 0.2) / 5))
      const p: Pt = [vase.at[0] + Math.cos(a) * d + 0.02 * Math.sin(tau * 2 + q), vase.at[1] - 0.15 + Math.sin(a) * d]
      disc(g, p, r, rgba(H.glass, 0.55))
      disc(g, [p[0] - r * 0.3, p[1] - r * 0.3], r * 0.35, rgba(H.glass, 0.8))
    }
}

/** The suite: beds, the case, the standing lamp, the armchair, the curtains. */
function drawSuite(g: Pen, f: View, t: number): void {
  if (!seen(f, B.suite, B.ceil, B.right, B.top)) return
  // The curtains, lifting.
  const { tau } = afloat(t)
  const lift = 1 - Math.exp(-tau / 3)
  for (const [x0, x1, s] of [[14.85, 15.45, -1], [17.45, 18.05, 1]] as const) {
    const bot = 20.85 - 0.55 * lift + 0.08 * Math.sin(tau * 0.6 + s) * lift
    const flare = 0.35 * lift * s
    poly(g, [[x0, 18.8], [x1, 18.8], [x1 + (s > 0 ? flare : 0), bot], [x0 + (s < 0 ? flare : 0), bot + 0.1 * lift]], C.curtain, g.ink, 0.5)
    if (g.k > 8) for (let q = 1; q < 3; q++) line(g, [x0 + (q * (x1 - x0)) / 3, 18.85], [x0 + (q * (x1 - x0)) / 3 + flare * 0.4, bot - 0.05], C.curtainDark, 0.5)
  }
  rect(g, 14.8, 18.72, 18.1, 18.8, H.brass)
  // The beds.
  for (const [b0, b1] of BEDS) {
    bed(g, b0, b1, B.top, 20.72, 20.45, 'right')
    rect(g, b1 - 0.12, 19.78, b1, B.top, H.wood, g.ink, 0.6)
    const pil = floating([b1 - 0.42, 20.37], [-0.2, -0.45], 4, 0.05, b0, t)
    at(g, pil.at, pil.turn, () => rect(g, -0.26, -0.08, 0.26, 0.08, H.glass, g.ink, 0.4))
  }
  // The nightstand and the silver case on it.
  nightstand(g, 12.72, 13.08, 20.45, B.top)
  const cs = floating([12.9, 20.33], [0.05, -0.5], 4, -0.04, 5, t)
  at(g, cs.at, cs.turn, () => {
    rect(g, -0.26, -0.11, 0.26, 0.11, C.steel, g.ink, 0.6)
    line(g, [-0.2, 0], [0.2, 0], C.steelDark, 0.5)
  })
  // The standing lamp: its shade floats off the pole.
  rect(g, 7.95, 20.93, 8.25, B.top, H.brass)
  line(g, [8.1, 20.93], [8.1, 19.42], H.brass, 0.8)
  const sh = drifting(t)
  lampShade(g, sh.at, sh.turn, 0.42)
  glow(g, sh.at, 1.3, 0.34, t)
  // The armchair.
  const ac = floating([7.25, 20.62], [0.1, -0.3], 5, -0.03, 11, t)
  at(g, ac.at, ac.turn, () => {
    poly(g, [[-0.36, 0.38], [-0.36, -0.45], [-0.2, -0.45], [-0.2, 0.02], [0.36, 0.02], [0.36, 0.38]], C.curtain, g.ink, 0.6)
    rect(g, -0.2, -0.06, 0.36, 0.06, mixHex(C.curtain, H.glass, 0.2), g.ink, 0.5)
  })
}

/** The corridor's other loose things (left of the drum): a chair and a picture off its hook. */
function drawCorridorThings(g: Pen, f: View, t: number): void {
  if (seen(f, -15, 19, -13, 21)) {
    const ch_ = floating([-13.95, 20.6], [0.15, -0.5], 4, 0.05, 13, t)
    at(g, ch_.at, ch_.turn, () => poly(g, [[-0.22, 0.4], [-0.22, -0.42], [-0.1, -0.42], [-0.1, 0.02], [0.24, 0.02], [0.24, 0.4]], H.woodLight, g.ink, 0.6))
  }
  // The picture hangs between a sconce and the next door, not over the sconce.
  if (seen(f, -11.2, 18.8, -9.0, 20.2)) {
    const pic = floating([-10.1, 19.35], [0.1, 0.12], 5, 0.04, 15, t)
    at(g, pic.at, pic.turn, () => {
      rect(g, -0.35, -0.24, 0.35, 0.24, H.brass, g.ink, 0.5)
      rect(g, -0.28, -0.17, 0.28, 0.17, mixHex(H.carpet, H.glass, 0.4))
    })
  }
}

/* ------------------------------------------------------------------ the sleepers and Arthur */

/**
 * A person in silhouette, lying along +x from `p` (head at -x), one dark mass with the lamp's rim on its upper edge.
 * `curl` 0 lies straight, 1 curls up (knees to chest: in the cabin).
 */
function figure(g: Pen, p: Pt, turn: number, curl: number, len = 1.45): void {
  const L = len * (1 - 0.3 * curl)
  const knee = 0.55 * curl
  const pts: Pt[] = [
    [-L * 0.5, -0.02],
    [-L * 0.47, -0.13],
    [-L * 0.37, -0.12],
    [-L * 0.33, -0.08],
    [-L * 0.2, -0.13],
    [L * 0.12, -0.12],
    [L * 0.2, -0.1 - knee * 0.4],
    [L * 0.34, -0.06 - knee * 0.3],
    [L * 0.5, -0.03 + knee * 0.05],
    [L * 0.5, 0.05 + knee * 0.05],
    [L * 0.3, 0.06],
    [L * 0.15, 0.1],
    [-L * 0.25, 0.12],
    [-L * 0.36, 0.06],
    [-L * 0.47, 0.08],
  ]
  at(g, p, turn, () => {
    poly(g, pts, C.person)
    if (g.k > 6) {
      g.c.beginPath()
      pts.slice(1, 9).forEach(([x, y], i) => (i ? g.c.lineTo(x * g.k, y * g.k) : g.c.moveTo(x * g.k, y * g.k)))
      g.c.strokeStyle = rgba(H.lamp, 0.4)
      g.c.lineWidth = Math.max(0.8, g.w * 0.6)
      g.c.stroke()
    }
  })
}

/** The sleepers: on their beds; afloat; tied together and to the bed's foot; towed into the lift; in it. */
function sleeperPose(i: number, t: number): { at: Pt; turn: number; curl: number } {
  const bed = BEDS[i]
  const rest: Pt = [(bed[0] + bed[1]) / 2 - 0.1, 20.3]
  const { tau } = afloat(t)
  const rise = 0.5 * ss(tau / 2.2)
  const tie = ss((tau - 1) / 3.5)
  const b = bundleAt(t)
  const slot: Pt = i === 0 ? [b.at[0] - 0.05, b.at[1] - 0.17] : [b.at[0] + 0.08, b.at[1] + 0.17]
  const loose: Pt = [rest[0] + 0.1 * Math.sin(tau * 0.4 + i), rest[1] - rise]
  const p: Pt = [lerp(loose[0], slot[0], tie), lerp(loose[1], slot[1], tie)]
  const curl = b.inCab ? 1 : ss((ch(t) - (TOW.to - 0.12)) / 0.12)
  return { at: p, turn: (i ? -0.05 : 0.07) * tie + b.turn * tie + 0.04 * Math.sin(tau * 0.3 + i * 2) * (1 - tie), curl }
}

function drawSleepers(g: Pen, t: number, inCab: boolean): void {
  const b = bundleAt(t)
  if (b.inCab !== inCab) return
  const tied = afloat(t).tau > 2.5 || b.inCab || ch(t) > TOW.from
  for (const i of [0, 1]) {
    const s = sleeperPose(i, t)
    figure(g, s.at, s.turn, s.curl, b.inCab ? 1.25 : 1.45)
  }
  if (tied) {
    // Arthur's rope round the two of them.
    const w = b.inCab ? 0.55 : 0.62
    for (const dx of [-w * 0.6, w * 0.5]) {
      const p = rot(b.turn, [dx, 0])
      line(g, [b.at[0] + p[0], b.at[1] + p[1] - 0.32], [b.at[0] + p[0] + 0.03, b.at[1] + p[1] + 0.33], H.woodLight, 0.7)
    }
  }
}

/** The line from the bundle to the bed's foot, that the three come to rest against; it gives, and swings when they go. */
function drawSuiteLine(g: Pen, t: number): void {
  const c = ch(t)
  const { tau } = afloat(t)
  if (tau < 3.2 || c > TOW.from) return
  const b = bundleAt(t)
  const top: Pt = [b.at[0] - (BUNDLE_HALF - 0.05), b.at[1] + 0.15]
  const foot = LINE_FOOT
  // How far it bows at the height they touch it (to the right: they came from the left).
  let bow = 0
  if (t > T.catch - 0.3) {
    const u = t - (T.catch - 0.3)
    const hang = 1 - (1 - Math.cos(2 * Math.PI * clamp01((t - T.catch - HANG.from) / (HANG.to - HANG.from)))) / 2
    bow = 0.08 * ss(u / 0.3) * hang * (1 - ss((t - T.catch - 3.1) / 0.8)) + 0.05 * Math.exp(-Math.max(0, t - T.catch) / 0.8) * Math.sin(Math.max(0, t - T.catch) * 9)
    if (t > T.catch + HANG.to) bow += 0.04 * Math.exp(-(t - T.catch - HANG.to) / 0.6) * Math.sin((t - T.catch - HANG.to) * 8)
  }
  const mid: Pt = [lerp(top[0], foot[0], 0.3) + bow, lerp(top[1], foot[1], 0.3)]
  g.c.beginPath()
  g.c.moveTo(top[0] * g.k, top[1] * g.k)
  g.c.quadraticCurveTo(mid[0] * g.k, mid[1] * g.k, foot[0] * g.k, foot[1] * g.k)
  g.c.strokeStyle = H.wood
  g.c.lineWidth = g.w * 1.0
  g.c.stroke()
  void LINE_TOP
}
const BUNDLE_HALF = 0.72

/** Arthur: one quiet silhouette at his work. Standing in the suite; afloat, tying them; towing them; at his plunger. */
function drawArthur(g: Pen, f: View, t: number): void {
  const c = ch(t)
  const { tau } = afloat(t)
  const b = bundleAt(t)
  let p: Pt
  let turn: number
  let reach = 0
  if (tau <= 0) {
    p = [13.55, B.top - 0.78]
    turn = 0
  } else if (c < TOW.from) {
    // Up off the floor and over to the sleepers' far end, upright in the air, his hand on their rope.
    const u = ss(tau / 3)
    const stand: Pt = [13.55, B.top - 0.78 - 0.25 * ss(tau / 1.5)]
    const by: Pt = [b.at[0] + 1.62, b.at[1] + 0.3]
    p = [lerp(stand[0], by[0], u) + 0.04 * Math.sin(tau * 0.5), lerp(stand[1], by[1], u) + 0.03 * Math.sin(tau * 0.37)]
    turn = lerp(0, -0.22, u) + 0.03 * Math.sin(tau * 0.41)
    reach = u
  } else if (c < TOW.to) {
    // Towing them, ahead of them along the corridor.
    p = [b.at[0] - 1.1, b.at[1] + 0.05]
    turn = -1.45
    reach = 1
  } else if (c < POST_AT) {
    const u = ss((c - TOW.to) / (POST_AT - TOW.to))
    p = [lerp(b.at[0] - 1.1, 1.72, u), lerp(b.at[1] + 0.05, B.top - 0.8, u)]
    turn = lerp(-1.45, 0, u)
    reach = 1
  } else {
    p = [1.72, B.top - 0.8 + 0.03 * Math.sin(c * 0.8)]
    turn = 0.03 * Math.sin(c * 0.5)
    reach = 1
  }
  if (!seen(f, p[0] - 1.2, p[1] - 1.2, p[0] + 1.2, p[1] + 1.2)) return
  // The plunger box, at his post.
  const post = c >= POST_AT - 0.05
  let handle = 0.18
  if (post) {
    if (t > T.arm - 0.3 && t < T.blast) handle = 0.18 + 0.12 * ss((t - (T.arm - 0.3)) / 0.3)
    if (t >= T.blast - 0.12) handle = 0.3 - 0.3 * ss((t - (T.blast - 0.12)) / 0.12)
    rect(g, 1.12, 20.28, 1.42, 20.5, H.wood, g.ink, 0.6)
    line(g, [1.27, 20.28], [1.27, 20.28 - handle], C.steel, 0.9)
    line(g, [1.14, 20.28 - handle], [1.4, 20.28 - handle], C.steel, 1.2)
  }
  at(g, p, turn, () => {
    // Standing, 1.55 tall, feet at +0.78: head and shoulders one mass.
    const body: Pt[] = [
      [-0.075, -0.8],
      [0.075, -0.8],
      [0.105, -0.73],
      [0.095, -0.65],
      [0.05, -0.6],
      [0.19, -0.56],
      [0.22, -0.46],
      [0.2, -0.05],
      [0.13, 0.05],
      [0.12, 0.78],
      [0.02, 0.78],
      [0, 0.12],
      [-0.03, 0.78],
      [-0.13, 0.78],
      [-0.14, 0.05],
      [-0.2, -0.05],
      [-0.22, -0.46],
      [-0.19, -0.56],
      [-0.05, -0.6],
      [-0.095, -0.65],
      [-0.105, -0.73],
    ]
    poly(g, body, C.person)
    // His arm: down at rest, out to the bundle or the plunger.
    const hand: Pt = post ? [1.27 - p[0], 20.28 - handle - p[1]] : [lerp(0.05, -0.78, reach), lerp(0.15, -0.5, reach)]
    line(g, [-0.12, -0.45], hand, C.person, 2.6)
    if (g.k > 6) {
      g.c.beginPath()
      for (const [i, [x, y]] of [body[body.length - 1], ...body.slice(0, 6)].entries()) i ? g.c.lineTo(x * g.k, y * g.k) : g.c.moveTo(x * g.k, y * g.k)
      g.c.strokeStyle = rgba(H.lamp, 0.35)
      g.c.lineWidth = Math.max(0.8, g.w * 0.6)
      g.c.stroke()
    }
  })
}

/* ------------------------------------------------------------------ the set */

export function drawHotel(g: Pen, f: View, t: number): void {
  if (f.y1 < B.band - 0.5 || f.y0 > B.foot + 0.5) return
  const c = g.c
  c.save()
  // Nothing of the hotel outside its band.
  c.beginPath()
  c.rect((f.x0 - 2) * g.k, B.band * g.k, (f.x1 - f.x0 + 4) * g.k, (B.foot - B.band) * g.k)
  c.clip()
  drawNight(g, f)
  drawTopFloor(g, f, t)
  drawMiddle(g, f, t)
  drawLobby(g, f, t)
  drawCorridorThings(g, f, t)
  drawSuite(g, f, t)
  drawSection(g, f, t)
  drawShaft(g, f, t)
  drawTrolley(g, f, t)
  drawConsole(g, f, t)
  drawDrum(g, f, t)
  if (!bundleAt(t).inCab) drawSleepers(g, t, false)
  drawSuiteLine(g, t)
  drawArthur(g, f, t)
  c.restore()
}

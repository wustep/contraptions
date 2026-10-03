import type p5 from 'p5'
import { R } from '../../../../../parts'
import { frame, hash, knock, lastOf, smooth, type Ctx } from '../kit'
import { LIFE_RED } from '../worlds'
import {
  BOARD,
  BOARD_TOP,
  BUNDLE_TOP,
  bundleX,
  CINCH,
  CONVEYOR,
  COPY,
  copiesAt,
  CRIMP,
  CURTAIN,
  CUT_START,
  CUTS,
  DECK,
  DOOR_TOP,
  DOOR_X,
  FLOOR,
  FULL,
  G0,
  G4,
  IMP_R,
  IMPRESSIONS,
  JOG,
  LAID,
  LIFT,
  liftAt,
  LIFTS,
  NEG,
  NOSE,
  padTop,
  PLATE_R,
  PRESS_END,
  RAM_AGAIN,
  RAMS,
  RAMS_NEXT,
  RECOIL,
  REEL,
  ROLLERS,
  SHOVE,
  SLAPS,
  STACK_W,
  STACK_X,
  STAIR,
  STOP,
  strength,
  STRAP_OVER,
  STRAP_UP,
  TABLE,
  TED,
  TREAD,
  TREADLE,
  treadY,
  UNIT_START,
  UNITS,
  UP,
  V_WEB,
  WEB_T,
  WEB_Y,
  PAVEMENT,
} from './press-plan'

/**
 * Life, drawn (the PRESS builder's). The set first (the hall, the conference room upstairs, the street through the
 * loading door), then the machine, then what stands in front of the ball. Every moving thing reads the plan's clocks.
 * Nothing here is written: the Life box is a red box with a white rule, the photograph a grey rectangle.
 */

/* ------------------------------------------------------------------ the palette */

export const PAL = {
  void: '#16171A',
  hall: '#202226',
  hallHigh: '#25282D',
  window: '#4A5563',
  windowLit: '#6B7887',
  mullion: '#1A1C20',
  room: '#2B2928',
  roomHigh: '#34302D',
  frame: '#1E1C1B',
  wood: '#3E3029',
  woodTop: '#5A4639',
  woodEdge: '#6E5848',
  iron: '#3A3D43',
  ironHi: '#555A62',
  ironLo: '#2A2C31',
  steel: '#8C9199',
  steelHi: '#B5BAC1',
  paper: '#E4DDCB',
  paperShade: '#B9B19F',
  paperEdge: '#9B9483',
  photo: '#7F8286',
  ink: '#1F2023',
  lamp: '#E6C688',
  ted: '#0B0C0E',
  floor: '#1B1C1F',
  floorLine: '#34363B',
  outside: '#AFB9C2',
  outsideHigh: '#CBD3D9',
  pavement: '#7C7D7B',
  pavementLine: '#5F605E',
  strip: '#C9D6DA',
  strap: '#2F3A46',
}

/* ------------------------------------------------------------------ small pens */

type C2 = CanvasRenderingContext2D
const cx = (p: p5): C2 => p.drawingContext as C2

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}
function mix(a: string, b: string, u: number): string {
  const pa = a.replace('#', '')
  const pb = b.replace('#', '')
  const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16)
  const m = (i: number) => Math.round(ch(pa, i) + (ch(pb, i) - ch(pa, i)) * Math.max(0, Math.min(1, u)))
  return `#${[0, 2, 4].map((i) => m(i).toString(16).padStart(2, '0')).join('')}`
}
function rect(g: C2, k: number, x: number, y: number, w: number, h: number, fill: string): void {
  g.fillStyle = fill
  g.fillRect(x * k, y * k, w * k, h * k)
}
function disc(g: C2, k: number, x: number, y: number, r: number, fill: string): void {
  g.fillStyle = fill
  g.beginPath()
  g.arc(x * k, y * k, r * k, 0, Math.PI * 2)
  g.fill()
}
function ring(g: C2, k: number, x: number, y: number, r: number, stroke: string, lw: number): void {
  g.strokeStyle = stroke
  g.lineWidth = lw * k
  g.beginPath()
  g.arc(x * k, y * k, r * k, 0, Math.PI * 2)
  g.stroke()
}
function line(g: C2, k: number, x0: number, y0: number, x1: number, y1: number, stroke: string, lw: number): void {
  g.strokeStyle = stroke
  g.lineWidth = lw * k
  g.beginPath()
  g.moveTo(x0 * k, y0 * k)
  g.lineTo(x1 * k, y1 * k)
  g.stroke()
}
function poly(g: C2, k: number, pts: [number, number][], fill: string): void {
  g.fillStyle = fill
  g.beginPath()
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
  g.closePath()
  g.fill()
}
/** A soft pool of light: a radial gradient, `a` at its middle. */
function glow(g: C2, k: number, x: number, y: number, r: number, color: string, a: number): void {
  if (a <= 0.002) return
  const gr = g.createRadialGradient(x * k, y * k, 0, x * k, y * k, r * k)
  gr.addColorStop(0, hexA(color, a))
  gr.addColorStop(1, hexA(color, 0))
  g.fillStyle = gr
  g.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k)
}
/** The most recent of `times` at or before t: its knock (1 on it, decaying), scaled by how hard the music hit there. */
function hitOf(times: readonly number[], t: number, decay = 0.14): number {
  const { i, ago } = lastOf(times, t)
  if (i < 0) return 0
  return knock(ago, decay) * Math.min(1.25, 0.55 + 0.45 * strength(times[i]))
}

/* ------------------------------------------------------------------ a cover */

/**
 * The last issue's cover, face on, `w` wide: paper, the red box at the top left with its white rule, the grey
 * photograph under it. No letters.
 */
export function cover(g: C2, k: number, x: number, y: number, w: number, h: number, a = 1): void {
  g.save()
  g.globalAlpha *= a
  rect(g, k, x, y, w, h, PAL.paper)
  const m = w * 0.08
  // The photograph: most of the cover, grey.
  rect(g, k, x + m, y + h * 0.3, w - 2 * m, h * 0.62, PAL.photo)
  // The Life box: red, with a white rule inside it.
  const bw = w * 0.42
  const bh = h * 0.2
  rect(g, k, x + m, y + m, bw, bh, LIFE_RED)
  g.strokeStyle = PAL.paper
  g.lineWidth = Math.max(0.6, w * 0.035 * k)
  g.strokeRect((x + m + bw * 0.12) * k, (y + m + bh * 0.22) * k, bw * 0.76 * k, bh * 0.56 * k)
  g.restore()
}

/* ------------------------------------------------------------------ the set */

const HALL_TOP = -3.6
const ROOM_X1 = 2.15

export function drawSet(p: p5, c: Ctx, t: number): void {
  const k = c.k
  const g = cx(p)
  const f = frame(p, k)
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  const y0 = Math.min(f.y0 - 1, HALL_TOP - 1)
  const y1 = Math.max(f.y1 + 1, FLOOR + 2)
  g.save()
  // The hall: dark, a little lighter high up where the windows are.
  const wall = g.createLinearGradient(0, HALL_TOP * k, 0, FLOOR * k)
  wall.addColorStop(0, PAL.hallHigh)
  wall.addColorStop(1, PAL.hall)
  g.fillStyle = wall
  g.fillRect(x0 * k, y0 * k, (Math.min(x1, DOOR_X) - x0) * k, (y1 - y0) * k)
  // Tall windows high in the back wall, the morning grey in them, and their light falling long across the hall.
  const dawn = 0.75 + 0.25 * smooth(t, TREADLE - 1, TREADLE + 6)
  for (let i = 0; i < 6; i++) {
    const wx = 3.3 + i * 3.1
    if (wx + 1 < x0 || wx - 1 > x1 || wx > DOOR_X - 1.2) continue
    const wy0 = HALL_TOP + 0.6
    const wy1 = 1.9
    rect(g, k, wx - 0.62, wy0, 1.24, wy1 - wy0, mix(mix(PAL.window, PAL.hall, 0.35), PAL.windowLit, 0.2 * dawn))
    // The arch at its top.
    g.fillStyle = mix(mix(PAL.window, PAL.hall, 0.35), PAL.windowLit, 0.2 * dawn)
    g.beginPath()
    g.arc(wx * k, wy0 * k, 0.62 * k, Math.PI, 0)
    g.fill()
    for (let m = 1; m < 3; m++) line(g, k, wx - 0.62 + (1.24 * m) / 3, wy0 - 0.5, wx - 0.62 + (1.24 * m) / 3, wy1, PAL.mullion, 0.035)
    for (let m = 1; m < 4; m++) line(g, k, wx - 0.62, wy0 + ((wy1 - wy0) * m) / 4, wx + 0.62, wy0 + ((wy1 - wy0) * m) / 4, PAL.mullion, 0.035)
    // A shaft of the window's light, down and to the right, very faint.
    g.fillStyle = hexA(PAL.windowLit, 0.05 * dawn)
    g.beginPath()
    g.moveTo((wx - 0.62) * k, wy1 * k)
    g.lineTo((wx + 0.62) * k, wy1 * k)
    g.lineTo((wx + 2.3) * k, FLOOR * k)
    g.lineTo((wx + 0.4) * k, FLOOR * k)
    g.closePath()
    g.fill()
  }
  // The roof's girders and the crane rail.
  rect(g, k, x0, HALL_TOP - 0.25, Math.min(x1, DOOR_X) - x0, 0.25, PAL.ironLo)
  for (let gx = Math.floor(x0 / 2.4) * 2.4; gx < Math.min(x1, DOOR_X); gx += 2.4) {
    line(g, k, gx, HALL_TOP, gx + 1.2, HALL_TOP + 0.45, PAL.ironLo, 0.05)
    line(g, k, gx + 1.2, HALL_TOP + 0.45, gx + 2.4, HALL_TOP, PAL.ironLo, 0.05)
  }
  rect(g, k, Math.max(x0, ROOM_X1), HALL_TOP + 0.45, Math.min(x1, DOOR_X) - Math.max(x0, ROOM_X1), 0.08, PAL.ironLo)
  // The lamps hung over the press, coming up as the press starts.
  const lampOn = smooth(t, TREADLE - 0.05, TREADLE + 0.6)
  for (const lx of [9.4, 13.2, 17.0, 20.6]) {
    if (lx + 3 < x0 || lx - 3 > x1) continue
    const ly = -0.15
    line(g, k, lx, HALL_TOP + 0.5, lx, ly - 0.1, PAL.ironLo, 0.03)
    poly(g, k, [[lx - 0.3, ly + 0.08], [lx + 0.3, ly + 0.08], [lx + 0.12, ly - 0.12], [lx - 0.12, ly - 0.12]], PAL.ironLo)
    const a = 0.08 + 0.1 * lampOn
    g.fillStyle = hexA(PAL.lamp, a * 0.55)
    g.beginPath()
    g.moveTo((lx - 0.28) * k, (ly + 0.08) * k)
    g.lineTo((lx + 0.28) * k, (ly + 0.08) * k)
    g.lineTo((lx + 1.7) * k, FLOOR * k)
    g.lineTo((lx - 1.7) * k, FLOOR * k)
    g.closePath()
    g.fill()
    glow(g, k, lx, ly + 0.1, 0.5, PAL.lamp, 0.25 + 0.4 * lampOn)
  }
  // The floor.
  rect(g, k, x0, FLOOR, Math.min(x1, DOOR_X) - x0, y1 - FLOOR, PAL.floor)
  line(g, k, x0, FLOOR + 0.01, Math.min(x1, DOOR_X), FLOOR + 0.01, PAL.floorLine, 0.03)

  // The street, through the loading door: the morning, the far side's buildings pale, the pavement.
  if (x1 > DOOR_X - 1) {
    const sky = g.createLinearGradient(0, -3 * k, 0, FLOOR * k)
    sky.addColorStop(0, PAL.outsideHigh)
    sky.addColorStop(1, PAL.outside)
    g.fillStyle = sky
    g.fillRect(DOOR_X * k, y0 * k, (x1 - DOOR_X) * k, (FLOOR - y0) * k)
    // Across the street: the fronts of the buildings opposite, pale in the morning haze, their rows of windows.
    const far = FLOOR - 1.05
    let bx = DOOR_X + 0.3
    for (let i = 0; bx < x1; i++) {
      const bw = 2.2 + 1.3 * hash(i, 11)
      const bh = 4.2 + 3 * hash(i, 7)
      const face = mix(PAL.outside, '#8C97A1', 0.3 + 0.3 * hash(i, 9))
      rect(g, k, bx, far - bh, bw - 0.08, bh, face)
      const winC = mix(face, '#5D6873', 0.32)
      for (let wy = far - bh + 0.4; wy < far - 0.95; wy += 0.46) for (let wx = bx + 0.25; wx < bx + bw - 0.35; wx += 0.34) rect(g, k, wx, wy, 0.15, 0.24, winC)
      // The shop front at its foot, a little darker, and its awning's shadow.
      rect(g, k, bx, far - 0.75, bw - 0.08, 0.75, mix(face, '#6F7A84', 0.5))
      bx += bw
    }
    // The road, the far kerb, the near kerb; the pavement he comes out onto.
    rect(g, k, DOOR_X, far, x1 - DOOR_X, 0.12, mix(PAL.outside, PAL.pavement, 0.3))
    rect(g, k, DOOR_X, far + 0.12, x1 - DOOR_X, FLOOR - 0.28 - far - 0.12, '#666A6E')
    rect(g, k, DOOR_X, FLOOR - 0.28, x1 - DOOR_X, 0.28, mix(PAL.pavement, PAL.outsideHigh, 0.25))
    rect(g, k, DOOR_X, FLOOR, x1 - DOOR_X, y1 - FLOOR, PAL.pavement)
    rect(g, k, DOOR_X, FLOOR, x1 - DOOR_X, 0.04, mix(PAL.pavement, PAL.outsideHigh, 0.45))
    for (let px = DOOR_X + 1.5; px < x1; px += 1.5) line(g, k, px, FLOOR + 0.04, px - 0.25, y1, PAL.pavementLine, 0.02)
    // The low sun from down the street, warm on the pavement.
    const sun = g.createLinearGradient(DOOR_X * k, 0, (DOOR_X + 8) * k, 0)
    sun.addColorStop(0, hexA(PAL.lamp, 0))
    sun.addColorStop(1, hexA(PAL.lamp, 0.16))
    g.fillStyle = sun
    g.fillRect(DOOR_X * k, (FLOOR - 0.28) * k, (x1 - DOOR_X) * k, (y1 - FLOOR + 0.28) * k)
    // The building's face, round the door.
    rect(g, k, DOOR_X - 0.12, y0, 0.34, DOOR_TOP - y0, mix(PAL.hall, '#3C3E44', 0.6))
    rect(g, k, DOOR_X - 0.12, DOOR_TOP - 0.12, 0.6, 0.14, PAL.ironLo)
  }

  // Upstairs: the conference room, warmer, on the mezzanine over the hall's left end.
  if (x0 < ROOM_X1 + 0.5) {
    const rx0 = x0
    rect(g, k, rx0, HALL_TOP, ROOM_X1 - rx0, UP - HALL_TOP, PAL.room)
    const warm = g.createRadialGradient(-1 * k, -2.6 * k, 0, -1 * k, -2.6 * k, 4.5 * k)
    warm.addColorStop(0, hexA(PAL.lamp, 0.12))
    warm.addColorStop(1, hexA(PAL.lamp, 0))
    g.fillStyle = warm
    g.fillRect(rx0 * k, HALL_TOP * k, (ROOM_X1 - rx0) * k, (UP - HALL_TOP) * k)
    // The covers on the wall, framed, in a row: the magazine's past, dim.
    for (let i = 0; i < 6; i++) {
      const fx = -7.6 + i * 1.5
      if (fx > ROOM_X1 - 0.9 || fx + 1 < x0) continue
      rect(g, k, fx - 0.06, -2.26, 0.72, 0.94, PAL.frame)
      g.save()
      g.globalAlpha = 0.42
      cover(g, k, fx, -2.2, 0.6, 0.82)
      g.restore()
    }
    // A pendant over the table.
    line(g, k, -1.1, HALL_TOP, -1.1, -2.85, PAL.frame, 0.025)
    poly(g, k, [[-1.45, -2.7], [-0.75, -2.7], [-0.95, -2.88], [-1.25, -2.88]], PAL.frame)
    glow(g, k, -1.1, -2.6, 1.8, PAL.lamp, 0.16)
    // The partition at the room's end: a door frame, and glass over the stairhead.
    rect(g, k, ROOM_X1 - 0.08, HALL_TOP, 0.12, UP - 2.3 - HALL_TOP, PAL.frame)
    rect(g, k, ROOM_X1 - 0.08, UP - 2.36, 0.5, 0.08, PAL.frame)
    // The mezzanine's slab, and the dark under it.
    rect(g, k, rx0, UP, STAIR.x0 - rx0, 0.32, PAL.ironLo)
    rect(g, k, rx0, UP + 0.32, STAIR.x0 - rx0, FLOOR - UP - 0.32, mix(PAL.void, PAL.hall, 0.4))
    rect(g, k, rx0, UP - 0.02, STAIR.x0 - rx0, 0.04, PAL.woodEdge)
    // Columns under the mezzanine.
    for (const px of [-3.6, -0.4]) if (px > x0 - 1) rect(g, k, px - 0.1, UP + 0.32, 0.2, FLOOR - UP - 0.32, PAL.ironLo)
  }
  g.restore()
}

/* ------------------------------------------------------------------ upstairs */

function drawTable(g: C2, k: number, t: number): void {
  // Two chairs pushed in, behind; the table; its legs.
  for (const chx of [-1.6, 0.5]) {
    rect(g, k, chx - 0.32, -0.55, 0.06, UP + 0.55, PAL.frame)
    rect(g, k, chx - 0.32, 0.55, 0.62, 0.06, PAL.frame)
  }
  // The top's far edge, in a little perspective, and its front.
  poly(g, k, [[TABLE.x0 + 0.15, TABLE.top - 0.22], [TABLE.x1 - 0.1, TABLE.top - 0.22], [TABLE.x1, TABLE.top], [TABLE.x0, TABLE.top]], PAL.woodTop)
  rect(g, k, TABLE.x0, TABLE.top, TABLE.x1 - TABLE.x0, 0.12, PAL.wood)
  line(g, k, TABLE.x0, TABLE.top, TABLE.x1, TABLE.top, PAL.woodEdge, 0.02)
  for (const lx of [TABLE.x0 + 0.25, TABLE.x1 - 0.3]) rect(g, k, lx, TABLE.top + 0.12, 0.1, TABLE.h - 0.12, PAL.wood)
  // The table's light: a sheen where the pendant falls.
  glow(g, k, -1.1, TABLE.top - 0.1, 1.5, PAL.lamp, 0.08)
  // Negative 25, flat on the top, in its sleeve; laid down on the downbeat.
  const since = t - LAID
  const drop = since < 0 ? 0 : Math.max(0, 0.06 * Math.exp(-since / 0.03) * Math.cos(since * 50))
  const nx = NEG.x
  const ny = TABLE.top - 0.035 - drop
  poly(g, k, [[nx + 0.06, ny - 0.13], [nx + NEG.w - 0.02, ny - 0.13], [nx + NEG.w, ny], [nx, ny]], hexA(PAL.paper, 0.55))
  // The frame in it: dark, with its sprockets.
  poly(g, k, [[nx + 0.13, ny - 0.11], [nx + NEG.w - 0.1, ny - 0.11], [nx + NEG.w - 0.08, ny - 0.02], [nx + 0.1, ny - 0.02]], '#2C2620')
  for (let s = 0; s < 5; s++) {
    const sx = nx + 0.13 + s * 0.055
    rect(g, k, sx, ny - 0.1, 0.02, 0.012, hexA(PAL.paper, 0.6))
    rect(g, k, sx - 0.01, ny - 0.035, 0.02, 0.012, hexA(PAL.paper, 0.6))
  }
  // The little gust it makes, and the lamp catching it.
  if (since >= 0 && since < 0.8) {
    const a = knock(since, 0.22)
    glow(g, k, nx + NEG.w / 2, ny - 0.06, 0.45, PAL.paper, 0.35 * a)
    for (let i = 0; i < 6; i++) {
      const d = (0.08 + since * 0.9) * (0.6 + 0.6 * hash(i, 3))
      const s = i < 3 ? -1 : 1
      disc(g, k, nx + NEG.w / 2 + s * (NEG.w / 2 + d), ny - 0.02 - d * 0.25 * hash(i, 5), 0.012, hexA(PAL.paper, 0.5 * a))
    }
  }
}

/** Ted Hendricks: a hard dark shape at the table's far end. His beard. He starts back on the third beat, and stands. */
function drawTed(g: C2, k: number, t: number): void {
  const since = t - RECOIL
  const back = since < 0 ? 0 : 1 - Math.exp(-since / 0.09) * Math.cos(since * 9)
  const lean = -0.1 * Math.min(1.1, back) + 0.02 * Math.sin(Math.max(0, t - RECOIL - 1.5) * 0.9) * smooth(t, RECOIL + 1.5, RECOIL + 3)
  const ox = TED.x - 0.18 * Math.min(1, back)
  const foot = UP
  g.save()
  g.translate(ox * k, foot * k)
  g.rotate(lean)
  g.fillStyle = PAL.ted
  // Legs, behind the table's end.
  g.fillRect(-0.24 * k, -1.35 * k, 0.2 * k, 1.35 * k)
  g.fillRect(0.04 * k, -1.35 * k, 0.2 * k, 1.35 * k)
  // The suit: shoulders square, a little wide; arms hanging.
  g.beginPath()
  g.moveTo(-0.32 * k, -1.32 * k)
  g.lineTo(-0.38 * k, -2.32 * k)
  g.quadraticCurveTo(-0.36 * k, -2.5 * k, -0.18 * k, -2.52 * k)
  g.lineTo(0.18 * k, -2.52 * k)
  g.quadraticCurveTo(0.36 * k, -2.5 * k, 0.38 * k, -2.32 * k)
  g.lineTo(0.32 * k, -1.32 * k)
  g.closePath()
  g.fill()
  g.fillRect(-0.47 * k, -2.35 * k, 0.12 * k, 0.95 * k)
  g.fillRect(0.35 * k, -2.35 * k, 0.12 * k, 0.95 * k)
  // Neck; head in profile, facing down the table toward Walter; the beard, full and squared, jutting out from the jaw.
  g.fillRect(-0.09 * k, -2.62 * k, 0.15 * k, 0.12 * k)
  g.beginPath()
  g.ellipse(0, -2.88 * k, 0.15 * k, 0.19 * k, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.moveTo(0.14 * k, -2.94 * k)
  g.lineTo(0.215 * k, -2.86 * k)
  g.lineTo(0.15 * k, -2.82 * k)
  g.closePath()
  g.fill()
  g.beginPath()
  g.moveTo(-0.04 * k, -2.8 * k)
  g.lineTo(0.16 * k, -2.81 * k)
  g.quadraticCurveTo(0.235 * k, -2.75 * k, 0.225 * k, -2.64 * k)
  g.lineTo(0.2 * k, -2.57 * k)
  g.lineTo(0.05 * k, -2.55 * k)
  g.quadraticCurveTo(-0.05 * k, -2.58 * k, -0.07 * k, -2.66 * k)
  g.closePath()
  g.fill()
  g.restore()
}

/* ------------------------------------------------------------------ the stair and the treadle */

function drawStair(g: C2, k: number): void {
  const { x0, run, n } = STAIR
  // The far stringer, treads, the near stringer, a rail.
  const xs = x0
  const xe = x0 + run * (n - 1)
  line(g, k, xs - 0.05, UP + 0.15, xe + 0.05, FLOOR - 0.1, PAL.ironLo, 0.12)
  for (let i = 1; i < n; i++) {
    const tx = x0 + run * (i - 1)
    const ty = treadY(i)
    rect(g, k, tx, ty, run + 0.04, 0.06, PAL.ironHi)
    rect(g, k, tx, ty + 0.06, run + 0.04, 0.03, PAL.ironLo)
    line(g, k, tx + run, ty + 0.09, tx + run, ty + STAIR.rise, hexA(PAL.ironLo, 0.6), 0.02)
  }
  // The rail and its posts.
  line(g, k, xs + 0.05, UP - 0.95, xe + 0.3, FLOOR - 1.05, PAL.iron, 0.05)
  for (let i = 1; i < n; i += 2) {
    const tx = x0 + run * (i - 1) + 0.1
    line(g, k, tx, treadY(i), tx, treadY(i) - 1.0, PAL.iron, 0.03)
  }
}

function drawTreadle(g: C2, k: number, t: number): void {
  const top = padTop(t)
  const { pad, pivot, end } = TREAD
  const yPiv = FLOOR - 0.13
  // Its base, its lever, its pad.
  poly(g, k, [[pivot - 0.18, FLOOR], [pivot + 0.18, FLOOR], [pivot + 0.06, yPiv - 0.04], [pivot - 0.06, yPiv - 0.04]], PAL.ironLo)
  const ang = Math.atan2(yPiv - top, pivot - pad)
  const ex = pivot + Math.cos(ang) * (end - pivot)
  const ey = yPiv + Math.sin(ang) * (end - pivot)
  line(g, k, pad, top + 0.04, ex, ey, PAL.iron, 0.07)
  rect(g, k, pad - 0.22, top, 0.44, 0.07, PAL.ironHi)
  disc(g, k, pivot, yPiv, 0.05, PAL.steel)
  // A spring under the pad.
  const sy0 = top + 0.07
  const n = 5
  g.strokeStyle = PAL.steel
  g.lineWidth = 0.015 * k
  g.beginPath()
  for (let i = 0; i <= n * 2; i++) {
    const y = sy0 + ((FLOOR - sy0) * i) / (n * 2)
    const x = pad + (i % 2 ? 0.07 : -0.07)
    if (i) g.lineTo(x * k, y * k)
    else g.moveTo(x * k, y * k)
  }
  g.stroke()
  // The flash when it goes down: the press starts.
  glow(g, k, pad, FLOOR - 0.1, 0.6, PAL.lamp, 0.5 * knock(t - TREADLE, 0.2))
}

/* ------------------------------------------------------------------ the press */

/** How far the paper has run (cells) by `t`: still before the treadle, then at the web's pace to the press's end. */
export function runAt(t: number): number {
  const a = Math.max(0, Math.min(t, PRESS_END + 0.4) - TREADLE)
  return a * V_WEB
}

function spokes(g: C2, k: number, x: number, y: number, r: number, ang: number, n: number, color: string, lw: number): void {
  for (let i = 0; i < n; i++) {
    const a = ang + (i * Math.PI * 2) / n
    line(g, k, x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, color, lw)
  }
}

function drawReel(g: C2, k: number, t: number): void {
  const [x, y] = REEL.c
  const run = runAt(t)
  // The stand.
  poly(g, k, [[x - 0.65, FLOOR], [x - 0.12, y], [x + 0.12, y], [x + 0.65, FLOOR]], PAL.ironLo)
  // The roll of paper: its face, the wound layers, the core.
  const r = REEL.r - run * 0.002
  disc(g, k, x, y, r, PAL.paperShade)
  for (let i = 1; i < 6; i++) ring(g, k, x, y, r * (0.35 + 0.13 * i), hexA(PAL.paperEdge, 0.35), 0.008)
  disc(g, k, x, y, 0.22, PAL.iron)
  spokes(g, k, x, y, 0.22, run / r, 3, PAL.steel, 0.03)
  // The web up the reel's side to the first roller, and over it.
  const wx = x + r
  line(g, k, wx, y, G0.c[0] - G0.r, G0.c[1], PAL.paper, WEB_T)
  disc(g, k, G0.c[0], G0.c[1], G0.r, PAL.steel)
  spokes(g, k, G0.c[0], G0.c[1], G0.r, run / G0.r, 3, PAL.ironLo, 0.02)
  g.strokeStyle = PAL.paper
  g.lineWidth = WEB_T * k
  g.beginPath()
  g.arc(G0.c[0] * k, G0.c[1] * k, (G0.r + WEB_T / 2) * k, Math.PI, Math.PI * 1.5)
  g.stroke()
  // The roller's bracket, to the floor.
  line(g, k, G0.c[0], G0.c[1], G0.c[0] + 0.2, FLOOR, PAL.ironLo, 0.06)
}

/** The web's top at distance `d` along it from x = 0 of the straight run: the run, round the turning roller, down the board. */
function webAt(d: number): [number, number, number] {
  if (d <= G4.c[0]) return [d, WEB_Y, 0]
  const arcLen = G4.r * BOARD
  if (d <= G4.c[0] + arcLen) {
    const a = (d - G4.c[0]) / G4.r
    return [G4.c[0] + G4.r * Math.sin(a), G4.c[1] - G4.r * Math.cos(a), a]
  }
  const s = d - G4.c[0] - arcLen
  return [BOARD_TOP[0] + Math.cos(BOARD) * s, BOARD_TOP[1] + Math.sin(BOARD) * s, BOARD]
}
const BOARD_LEN = Math.hypot(NOSE[0] - BOARD_TOP[0], NOSE[1] - BOARD_TOP[1])
const WEB_END = G4.c[0] + G4.r * BOARD + BOARD_LEN

/** The marks printed on the web: one per impression of the first unit; each picks up the next units' if they print it. */
function marks(t: number): { d: number; layers: number }[] {
  const out: { d: number; layers: number }[] = []
  const imp = IMPRESSIONS[0]
  const passing = (i: number, when: number) => when >= UNIT_START[i] - 1e-6 && !(when >= LIFTS[i][0] && when < LIFTS[i][1]) && when <= PRESS_END + 0.05
  for (const ti of imp) {
    if (ti > t) break
    const d = UNITS[0] + V_WEB * (Math.min(t, PRESS_END + 0.4) - ti)
    if (d > WEB_END) continue
    let layers = 1
    const t2 = ti + (UNITS[1] - UNITS[0]) / V_WEB
    if (d >= UNITS[1] && passing(1, t2)) layers = 2
    const t3 = ti + (UNITS[2] - UNITS[0]) / V_WEB
    if (layers === 2 && d >= UNITS[2] && passing(2, t3)) layers = 3
    out.push({ d, layers })
  }
  return out
}

function drawWeb(g: C2, k: number, t: number): void {
  const run = runAt(t)
  // The web along the line and down the board.
  g.strokeStyle = PAL.paper
  g.lineWidth = WEB_T * k
  g.lineCap = 'butt'
  g.beginPath()
  g.moveTo(G0.c[0] * k, (WEB_Y + WEB_T / 2) * k)
  g.lineTo(G4.c[0] * k, (WEB_Y + WEB_T / 2) * k)
  g.arc(G4.c[0] * k, G4.c[1] * k, (G4.r - WEB_T / 2) * k, -Math.PI / 2, -Math.PI / 2 + BOARD)
  g.lineTo((NOSE[0] - Math.sin(BOARD) * WEB_T * 0.5) * k, (NOSE[1] + Math.cos(BOARD) * WEB_T * 0.5) * k)
  g.stroke()
  // Its grain, running: faint ticks that show it moving.
  for (let d = G0.c[0] + ((-run % 0.32) + 0.32) % 0.32; d < WEB_END; d += 0.32) {
    const [x, y, a] = webAt(d)
    const nx = -Math.sin(a)
    const ny = Math.cos(a)
    line(g, k, x + nx * 0.015, y + ny * 0.015, x + nx * (WEB_T - 0.015), y + ny * (WEB_T - 0.015), hexA(PAL.paperEdge, 0.35), 0.012)
  }
  // The printed covers, edge on: the red box (and its white rule), and the grey photograph beside it.
  for (const m of marks(t)) {
    const [x, y, a] = webAt(m.d)
    g.save()
    g.translate(x * k, y * k)
    g.rotate(a)
    rect(g, k, -0.2, 0.012, 0.13, WEB_T - 0.024, LIFE_RED)
    if (m.layers >= 2) rect(g, k, -0.185, WEB_T / 2 - 0.006, 0.1, 0.012, PAL.paper)
    if (m.layers >= 3) rect(g, k, -0.05, 0.012, 0.16, WEB_T - 0.024, PAL.photo)
    g.restore()
  }
}

/** Unit i: the impression cylinder under the web, the plate and its inking over it on an arm that lifts. */
function drawUnit(g: C2, k: number, i: number, t: number, front: boolean): void {
  const x = UNITS[i]
  const run = runAt(t)
  const lift = liftAt(i, t) * LIFT
  const hit = t >= UNIT_START[i] ? hitOf(IMPRESSIONS[i], t, 0.11) : 0
  const ink = [LIFE_RED, PAL.paper, PAL.photo][i]
  const impY = WEB_Y + WEB_T + IMP_R
  const plY = WEB_Y - PLATE_R - lift + 0.015 * hit
  if (!front) {
    // The side frame: a heavy plate behind, with its foot.
    poly(g, k, [[x - 0.85, FLOOR], [x - 0.7, WEB_Y - 1.55], [x + 0.7, WEB_Y - 1.55], [x + 0.85, FLOOR]], PAL.ironLo)
    rect(g, k, x - 0.95, FLOOR - 0.12, 1.9, 0.12, PAL.iron)
    // The gear on the frame, turning with the press.
    disc(g, k, x + 0.42, impY + 0.62, 0.3, PAL.iron)
    spokes(g, k, x + 0.42, impY + 0.62, 0.3, -run / 0.3, 6, PAL.ironHi, 0.04)
    // The impression cylinder.
    disc(g, k, x, impY, IMP_R, PAL.iron)
    ring(g, k, x, impY, IMP_R - 0.03, PAL.ironHi, 0.02)
    spokes(g, k, x, impY, IMP_R, run / IMP_R, 4, PAL.ironHi, 0.035)
    return
  }
  // The arm the plate rides on, from its pivot on the frame's back.
  const px = x - 0.62
  const py = WEB_Y - 1.2
  line(g, k, px, py, x, plY, PAL.iron, 0.09)
  disc(g, k, px, py, 0.07, PAL.steel)
  // The inking: the fountain, two rollers between it and the plate.
  const fy = plY - 0.72
  poly(g, k, [[x - 0.3, fy - 0.12], [x + 0.36, fy - 0.12], [x + 0.26, fy + 0.12], [x - 0.2, fy + 0.12]], PAL.iron)
  rect(g, k, x - 0.24, fy - 0.12, 0.54, 0.05, ink)
  disc(g, k, x - 0.12, plY - 0.42, 0.11, PAL.ironHi)
  disc(g, k, x + 0.16, plY - 0.45, 0.1, PAL.ironHi)
  ring(g, k, x - 0.12, plY - 0.42, 0.11, ink, 0.025)
  ring(g, k, x + 0.16, plY - 0.45, 0.1, ink, 0.025)
  // The plate cylinder: steel, its plate inked.
  disc(g, k, x, plY, PLATE_R, PAL.steel)
  g.strokeStyle = ink
  g.lineWidth = 0.05 * k
  g.beginPath()
  g.arc(x * k, plY * k, (PLATE_R - 0.03) * k, -run / PLATE_R, -run / PLATE_R + Math.PI * 1.55)
  g.stroke()
  spokes(g, k, x, plY, PLATE_R, -run / PLATE_R, 3, PAL.ironLo, 0.03)
  disc(g, k, x, plY, 0.06, PAL.ironLo)
  // The impression: the ink's colour, struck into the paper at the nip.
  if (hit > 0.02 && lift < 0.05) glow(g, k, x, WEB_Y + 0.02, 0.4, i === 1 ? PAL.paper : ink, 0.55 * hit)
}

/* ------------------------------------------------------------------ the former, the folder, the stacker */

const FOLD = { x0: NOSE[0] - 1.05, x1: NOSE[0] - 0.12, y0: NOSE[1] + 0.12, y1: NOSE[1] + 0.62 }
const OUTLET_X = (FOLD.x0 + FOLD.x1) / 2
const TRAY_X = STACK_X - STACK_W / 2 - 0.62
const CW = 0.42
const CH = 0.56

function drawFormer(g: C2, k: number, t: number): void {
  const run = runAt(t)
  // The former: a steel triangle under the board, its nose a hand's width over the folder.
  poly(g, k, [[BOARD_TOP[0], BOARD_TOP[1] + WEB_T], [NOSE[0], NOSE[1] + WEB_T], [BOARD_TOP[0] + 0.1, NOSE[1] + 0.05]], PAL.steel)
  poly(g, k, [[BOARD_TOP[0] + 0.12, BOARD_TOP[1] + 0.25], [NOSE[0] - 0.3, NOSE[1] - 0.04], [BOARD_TOP[0] + 0.18, NOSE[1] - 0.02]], hexA(PAL.steelHi, 0.25))
  // Its post, and the turning roller.
  rect(g, k, G4.c[0] - 0.05, G4.c[1], 0.1, FLOOR - G4.c[1], PAL.ironLo)
  disc(g, k, G4.c[0], G4.c[1], G4.r, PAL.steel)
  spokes(g, k, G4.c[0], G4.c[1], G4.r, run / G4.r, 3, PAL.ironLo, 0.02)
}

function drawFolder(g: C2, k: number, t: number): void {
  const run = runAt(t)
  const cut = t >= CUT_START ? hitOf(CUTS, t, 0.09) : 0
  // The folder's box under the nose; through its window the cutting cylinder and the jaw.
  rect(g, k, FOLD.x0, FOLD.y0, FOLD.x1 - FOLD.x0, FOLD.y1 - FOLD.y0, PAL.iron)
  rect(g, k, FOLD.x0 + 0.08, FOLD.y0 + 0.08, FOLD.x1 - FOLD.x0 - 0.16, FOLD.y1 - FOLD.y0 - 0.16, PAL.ironLo)
  const ca = run / 0.15
  for (const [ox, dir] of [[-0.18, 1], [0.18, -1]] as const) {
    const ccx = OUTLET_X + ox
    const ccy = (FOLD.y0 + FOLD.y1) / 2
    disc(g, k, ccx, ccy, 0.15, PAL.ironHi)
    const a = ca * dir
    line(g, k, ccx, ccy, ccx + Math.cos(a) * 0.16, ccy + Math.sin(a) * 0.16, PAL.steelHi, 0.025)
  }
  // The knife's flash on the cut.
  if (cut > 0.02) glow(g, k, OUTLET_X, (FOLD.y0 + FOLD.y1) / 2, 0.35, PAL.steelHi, 0.6 * cut)
  // The legs, and the chute down to the tray.
  rect(g, k, FOLD.x0 + 0.05, FOLD.y1, 0.08, FLOOR - FOLD.y1, PAL.ironLo)
  rect(g, k, FOLD.x1 - 0.13, FOLD.y1, 0.08, FLOOR - FOLD.y1, PAL.ironLo)
}

/** The copies falling from the folder to the tray, face on: the cover, turning a little as it drops. */
function drawFalling(g: C2, k: number, t: number): void {
  const fallH = DECK - FOLD.y1 - 0.02
  const T = Math.sqrt((2 * fallH) / 12)
  for (const ci of CUTS) {
    const u = t - ci
    if (u < 0 || u > T + 0.02) continue
    const y = FOLD.y1 + 6 * u * u
    const flat = smooth(u, T - 0.06, T)
    const h = CH * (1 - flat) + 0.03 * flat
    const swing = Math.sin(u * 14 + ci) * 0.12 * (1 - flat)
    g.save()
    g.translate(OUTLET_X * k, (y - h / 2) * k)
    g.rotate(swing)
    cover(g, k, -CW / 2, -h / 2, CW, h)
    g.restore()
  }
}

/** The tray, the ram, the stacker's posts, the stack (or the bundle and the next stack), the joggers and the strapper. */
function drawStacker(g: C2, k: number, t: number, front: boolean): void {
  const sx0 = STACK_X - STACK_W / 2
  const sx1 = STACK_X + STACK_W / 2
  if (!front) {
    // The deck under tray and stack, on legs.
    rect(g, k, TRAY_X - 0.55, DECK, sx1 - TRAY_X + 0.62, 0.1, PAL.iron)
    for (const lx of [TRAY_X - 0.45, sx1 - 0.05]) rect(g, k, lx, DECK + 0.1, 0.09, FLOOR - DECK - 0.1, PAL.ironLo)
    // The strapping arch over the stacker.
    const archTop = BUNDLE_TOP - 0.38
    g.strokeStyle = PAL.iron
    g.lineWidth = 0.08 * k
    g.beginPath()
    g.moveTo((sx0 - 0.25) * k, DECK * k)
    g.lineTo((sx0 - 0.25) * k, (archTop + 0.25) * k)
    g.quadraticCurveTo((sx0 - 0.25) * k, archTop * k, sx0 * k, archTop * k)
    g.lineTo(sx1 * k, archTop * k)
    g.quadraticCurveTo((sx1 + 0.25) * k, archTop * k, (sx1 + 0.25) * k, (archTop + 0.25) * k)
    g.lineTo((sx1 + 0.25) * k, DECK * k)
    g.stroke()
    return
  }
  // The copy waiting in the tray (cut on the beat before), and the ram that shoves it under the stack.
  const all = [...RAMS, ...RAMS_NEXT]
  const { i: ri, ago } = lastOf(all, t)
  const shoveU = ri >= 0 ? Math.min(1, ago / 0.08) : 1
  const ramOut = ri >= 0 && ago < 0.3 ? (ago < 0.08 ? shoveU : Math.max(0, 1 - (ago - 0.08) / 0.2)) : 0
  const ramX = TRAY_X - 0.3 + ramOut * (sx0 - TRAY_X + 0.1)
  // A copy lies in the tray when its cut has landed and its shove has not come.
  const fallT = Math.sqrt((2 * (DECK - FOLD.y1 - 0.02)) / 12)
  for (const ci of CUTS) {
    const landed = ci + fallT
    const shoved = all.find((r) => r > ci + 1e-6)
    if (t < landed || shoved === undefined || t > shoved + 0.08) continue
    const u = t < shoved ? 0 : (t - shoved) / 0.08
    const x = TRAY_X - CW / 2 + u * (sx0 - TRAY_X + CW / 2)
    rect(g, k, x, DECK - COPY, Math.max(CW, STACK_W * u + CW * (1 - u)), COPY, PAL.paper)
    rect(g, k, x, DECK - COPY, 0.12, COPY, LIFE_RED)
  }
  // The ram: a block on a rod.
  rect(g, k, TRAY_X - 0.9, DECK - 0.16, 0.5, 0.14, PAL.iron)
  rect(g, k, TRAY_X - 0.45, DECK - 0.1, ramX - (TRAY_X - 0.45), 0.04, PAL.steel)
  rect(g, k, ramX - 0.06, DECK - 0.15, 0.08, 0.14, PAL.ironHi)
  // The stack: on the stacker until the shove; the next one after.
  const n1 = t < SHOVE ? copiesAt(t) : 0
  if (n1 > 0) drawStack(g, k, STACK_X, n1, t)
  if (t >= RAM_AGAIN) drawStack(g, k, STACK_X, copiesAt(t, RAMS_NEXT), t)
  // The joggers: two paddles that slap the stack square when it is full.
  if (t >= JOG[0] - 0.35 && t < SHOVE) {
    const jog = hitOf(JOG, t, 0.1)
    const come = 1 - smooth(t, JOG[0] - 0.35, JOG[0])
    const jogIn = 0.01 + 0.05 * (1 - jog) + 0.5 * come
    rect(g, k, sx0 - jogIn - 0.07, BUNDLE_TOP + 0.35, 0.07, DECK - BUNDLE_TOP - 0.5, PAL.ironHi)
    rect(g, k, sx1 + jogIn, BUNDLE_TOP + 0.35, 0.07, DECK - BUNDLE_TOP - 0.5, PAL.ironHi)
  }
  // The strap, going round: up the far side, over the top, down; cinched; crimped. It stays on the bundle.
  if (t >= STRAP_UP && t < SHOVE + 0.01) drawStrap(g, k, STACK_X, t)
  // The pusher behind the bundle.
  const push = t < SHOVE ? 0 : Math.max(0, bundleX(Math.min(t, SHOVE + 0.82)) - STACK_X) * (t < SHOVE + 0.82 ? 1 : Math.max(0, 1 - (t - SHOVE - 0.82) / 0.5))
  if (t >= CRIMP - 0.4 && t < SHOVE + 1.6) {
    const down = smooth(t, CRIMP - 0.4, CRIMP + 0.05) * (1 - smooth(t, SHOVE + 1.2, SHOVE + 1.6))
    const lift = (1 - down) * (DECK - BUNDLE_TOP)
    rect(g, k, sx0 - 0.16 + push, BUNDLE_TOP + 0.1 - lift, 0.12, DECK - BUNDLE_TOP - 0.15, PAL.ironHi)
    rect(g, k, sx0 - 0.9, BUNDLE_TOP + 0.6 - lift, 0.74 + push, 0.06, PAL.steel)
  }
}

function drawStack(g: C2, k: number, x: number, n: number, t: number): void {
  const w = STACK_W
  const x0 = x - w / 2
  const h = n * COPY
  rect(g, k, x0, DECK - h, w, h, PAL.paper)
  // Each copy's edge, and the spines' red at the left.
  const whole = Math.floor(n + 1e-6)
  for (let i = 1; i <= whole; i++) {
    const y = DECK - i * COPY
    line(g, k, x0, y, x0 + w, y, hexA(PAL.paperEdge, 0.7), 0.008)
  }
  rect(g, k, x0, DECK - h, 0.03, h, hexA(LIFE_RED, 0.75))
  rect(g, k, x0 + w - 0.05, DECK - h, 0.05, h, hexA(PAL.paperShade, 0.6))
  void t
}

function drawStrap(g: C2, k: number, x: number, t: number): void {
  const u = smooth(t, STRAP_UP, STRAP_OVER + 0.05)
  const tight = smooth(t, CINCH, CINCH + 0.06)
  const lw = 0.05 + 0.015 * tight
  const col = mix(PAL.strap, '#45566A', 1 - tight)
  // Down the face, from the top, as far as it has gone round.
  const top = BUNDLE_TOP
  const slack = 0.08 * (1 - tight)
  if (u > 0) line(g, k, x, DECK, x, DECK - (DECK - top + slack) * Math.min(1, u * 1.6), col, lw)
  if (u > 0.6) line(g, k, x, top - slack, x + 0.0, top - slack, col, lw)
  // The crimp's seal, on the face, struck.
  if (t >= CRIMP) {
    rect(g, k, x - 0.07, DECK - 0.38, 0.14, 0.1, PAL.steel)
    glow(g, k, x, DECK - 0.33, 0.3, PAL.steelHi, 0.6 * knock(t - CRIMP, 0.12))
  }
}

/* ------------------------------------------------------------------ the bundle, the conveyor, the door */

function drawConveyor(g: C2, k: number, t: number): void {
  const { x0, x1 } = CONVEYOR
  rect(g, k, x0, DECK + 0.1, x1 - x0, 0.1, PAL.iron)
  for (let lx = x0 + 0.2; lx < x1; lx += 1.2) rect(g, k, lx, DECK + 0.2, 0.08, FLOOR - DECK - 0.2, PAL.ironLo)
  const moving = t > SHOVE && t < STOP + 0.2
  ROLLERS.forEach((rx) => {
    const ry = DECK + 0.06
    disc(g, k, rx, ry, 0.08, PAL.steel)
    const front = bundleX(t) + STACK_W / 2
    const under = t > SHOVE && Math.abs(front - rx) < 0.06
    if (under) glow(g, k, rx, ry - 0.04, 0.22, PAL.steelHi, 0.5)
    const a = moving ? (bundleX(t) - STACK_X) / 0.08 : 0
    line(g, k, rx, ry, rx + Math.cos(a) * 0.07, ry + Math.sin(a) * 0.07, PAL.ironLo, 0.02)
  })
  // The bumper at its end.
  rect(g, k, x1 - 0.06, DECK - 0.35, 0.1, 0.45, PAL.ironHi)
  rect(g, k, x1 - 0.12, DECK - 0.35, 0.06, 0.3, '#3B3B38')
}

function drawBundle(g: C2, k: number, t: number): void {
  if (t < SHOVE) return
  const bx = bundleX(t)
  // A little tip as its front edge drops over each roller.
  drawStack(g, k, bx, FULL, t)
  drawStrap(g, k, bx, t)
  // The top copy's face, in a little perspective: the cover he rides out on.
  const x0 = bx - STACK_W / 2
  poly(g, k, [[x0, BUNDLE_TOP], [x0 + STACK_W, BUNDLE_TOP], [x0 + STACK_W - 0.05, BUNDLE_TOP - 0.1], [x0 + 0.06, BUNDLE_TOP - 0.1]], PAL.paperShade)
  poly(g, k, [[x0 + 0.04, BUNDLE_TOP - 0.01], [x0 + 0.34, BUNDLE_TOP - 0.01], [x0 + 0.33, BUNDLE_TOP - 0.05], [x0 + 0.08, BUNDLE_TOP - 0.05]], LIFE_RED)
}

/** The strip curtain in the loading door: clear strips that the bundle pushes through and that slap back after. */
function drawCurtain(g: C2, k: number, t: number): void {
  const len = FLOOR - 0.06 - DOOR_TOP
  const bx = bundleX(t)
  const front = bx + STACK_W / 2
  const back = bx - STACK_W / 2
  // The strips swing back once the bundle's back is through: slapping shut on one beat, and back the other way on the next.
  const half = SLAPS[1] - SLAPS[0]
  const release = SLAPS[0] - half / 2
  for (let i = 0; i < 3; i++) {
    const sx = DOOR_X + 0.03 + i * 0.03
    const a = 0.2 + 0.08 * i
    const pts: [number, number][] = [[sx, DOOR_TOP]]
    if (t >= CURTAIN - 0.05 && t < release && front >= sx - 0.02) {
      // Draped over the bundle (and him): down to its top, along it, and down its front.
      const cx0 = Math.min(Math.max(sx + 0.12, back + 0.05), front)
      const y = BUNDLE_TOP - 0.02
      const first = Math.hypot(cx0 - sx, y - DOOR_TOP)
      let left = len - first
      pts.push([cx0, y])
      const along = Math.min(left, Math.max(0, front - cx0))
      pts.push([cx0 + along, y])
      left -= along
      if (left > 0) pts.push([front + 0.02, y + Math.min(left, DECK - y)])
    } else {
      let ang = 0.015 * Math.sin(t * 1.3 + i)
      if (t >= release) {
        const u = t - release
        const w = Math.PI / half
        ang = 0.55 * Math.exp(-u / 0.45) * Math.cos(w * u)
      }
      pts.push([sx + Math.sin(ang) * len, DOOR_TOP + Math.cos(ang) * len])
    }
    g.strokeStyle = hexA(PAL.strip, a)
    g.lineWidth = 0.07 * k
    g.lineJoin = 'round'
    g.beginPath()
    pts.forEach(([x, y], j) => (j ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
    g.stroke()
  }
}

/* ------------------------------------------------------------------ the whole */

export function drawMachine(p: p5, c: Ctx, t: number): void {
  const g = cx(p)
  const k = c.k
  const f = frame(p, k)
  const vis = (a: number, b: number) => b >= f.x0 - 1 && a <= f.x1 + 1
  g.save()
  g.lineCap = 'round'
  if (vis(-5, ROOM_X1 + 0.5)) {
    drawTed(g, k, t)
    drawTable(g, k, t)
  }
  if (vis(STAIR.x0 - 0.5, STAIR.x0 + 4)) drawStair(g, k)
  if (vis(REEL.c[0] - 2, REEL.c[0] + 2)) {
    drawTreadle(g, k, t)
    drawReel(g, k, t)
  }
  for (let i = 0; i < UNITS.length; i++) if (vis(UNITS[i] - 1.2, UNITS[i] + 1.2)) drawUnit(g, k, i, t, false)
  if (vis(G0.c[0], NOSE[0] + 1)) drawWeb(g, k, t)
  for (let i = 0; i < UNITS.length; i++) if (vis(UNITS[i] - 1.2, UNITS[i] + 1.2)) drawUnit(g, k, i, t, true)
  if (vis(G4.c[0] - 2, STACK_X + 2)) {
    drawFormer(g, k, t)
    drawStacker(g, k, t, false)
    drawFolder(g, k, t)
  }
  if (vis(CONVEYOR.x0 - 1, CONVEYOR.x1 + 1)) drawConveyor(g, k, t)
  if (vis(TRAY_X - 2, STACK_X + 2)) {
    drawStacker(g, k, t, true)
    drawFalling(g, k, t)
  }
  if (vis(bundleX(t) - 1, bundleX(t) + 1)) drawBundle(g, k, t)
  g.restore()
}

export function drawFront(p: p5, c: Ctx, t: number): void {
  const g = cx(p)
  const k = c.k
  const f = frame(p, k)
  g.save()
  g.lineCap = 'butt'
  if (DOOR_X + 1 >= f.x0 && DOOR_X - 1 <= f.x1) drawCurtain(g, k, t)
  // The hall's dust in the lamp light, lifting a little on the loudest hits.
  if (t > TREADLE && f.x0 < DOOR_X) {
    for (let i = 0; i < 40; i++) {
      const x = 7 + hash(i, 1) * 16 + Math.sin(t * 0.2 + i) * 0.3
      const y = -0.5 + hash(i, 2) * 4.2 - ((t * 0.05 + hash(i, 4) * 4) % 4.2) * 0.2
      if (x < f.x0 || x > f.x1 || x > DOOR_X) continue
      disc(g, k, x, y, 0.01 + 0.008 * hash(i, 3), hexA(PAL.lamp, 0.18))
    }
  }
  g.restore()
  void R
  void PAVEMENT
  void FULL
}

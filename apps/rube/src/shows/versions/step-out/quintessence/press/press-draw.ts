import type p5 from 'p5'
import { frame, hash, knock, lastOf, smooth, type Ctx } from '../kit'
import { view } from '../depth'
import { drawHall } from './hall'
import { drawOffice, OFFICE, PANES } from './office'
import { drawOutside } from './outside'
import { lampsOn } from './pulse'
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
  WALL,
  WEB_T,
  WEB_Y,
} from './press-plan'

/**
 * Life, drawn (the PRESS builder's). The set first (the hall in depth, `hall.ts`; Ted's office upstairs, `office.ts`;
 * the street through the loading door, `outside.ts`), then the machine; the light and the near plane are the front's
 * (`front.ts`). Every moving thing reads the plan's clocks. Nothing here is written: the Life box is a red box with a
 * white rule, the photograph a grey rectangle.
 */

/* ------------------------------------------------------------------ the palette */

export const PAL = {
  hall: '#202226',
  frame: '#1E1C1B',
  wood: '#3E3029',
  woodTop: '#5A4639',
  woodEdge: '#6E5848',
  iron: '#2F3E46',
  ironHi: '#4F6872',
  ironLo: '#1F2A30',
  steel: '#86A0A9',
  steelHi: '#C4DADF',
  paper: '#EEE8D9',
  paperShade: '#BDB5A3',
  paperEdge: '#9B9483',
  photo: '#7F8286',
  ink: '#1F2023',
  lamp: '#F2B25C',
  ted: '#0B0C0E',
  outside: '#AFB9C2',
  outsideHigh: '#CBD3D9',
  pavement: '#7C7D7B',
  strip: '#8DA0A4',
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

const ROOM_X1 = OFFICE.x1
/** The lamps hung over the machine's own line. */
export const LAMPS = [9.4, 13.2, 17.0, 20.6]
export const LAMP_Y = -0.15
/** The bay lamp, caged on a bracket off the end wall over the conveyor: off until the shove, which switches it on. */
export const BAY: [number, number] = [DOOR_X - 0.5, DOOR_TOP - 0.3]
export const bayOn = (t: number): number => (t < SHOVE ? 0 : Math.min(1, (t - SHOVE) / 0.06))

export function drawSet(p: p5, c: Ctx, t: number): void {
  const k = c.k
  const g = cx(p)
  const v = view(p, k)
  const x0 = v.x0 - 1
  const x1 = v.x1 + 1
  g.save()
  // The hall in depth, wherever the office and the street leave it to be seen.
  if (v.x1 > ROOM_X1 - 0.5 || v.y0 < OFFICE.top || v.y1 > FLOOR) {
    g.save()
    if (v.x0 < ROOM_X1 && v.y0 > OFFICE.top && v.y1 < FLOOR + 0.2) {
      g.beginPath()
      g.rect(ROOM_X1 * k, (v.y0 - 1) * k, (v.x1 - ROOM_X1 + 1) * k, (v.h + 2) * k)
      g.clip()
    }
    drawHall(g, v, t)
    g.restore()
  }
  // The lamps hung over the press: their cords, their shades, the bulb lit under each; their light lies on the floor.
  const lamp = new Path2D()
  const lit = new Path2D()
  for (const lx of LAMPS) {
    if (lx + 1 < x0 || lx - 1 > x1) continue
    lamp.rect((lx - 0.015) * k, (-5.2) * k, 0.03 * k, (LAMP_Y - 0.1 + 5.2) * k)
    lamp.moveTo((lx - 0.34) * k, (LAMP_Y + 0.1) * k)
    lamp.quadraticCurveTo((lx - 0.3) * k, (LAMP_Y - 0.14) * k, lx * k, (LAMP_Y - 0.16) * k)
    lamp.quadraticCurveTo((lx + 0.3) * k, (LAMP_Y - 0.14) * k, (lx + 0.34) * k, (LAMP_Y + 0.1) * k)
    lamp.closePath()
    lit.moveTo((lx + 0.27) * k, (LAMP_Y + 0.09) * k)
    lit.ellipse(lx * k, (LAMP_Y + 0.09) * k, 0.27 * k, 0.05 * k, 0, 0, Math.PI)
  }
  g.fillStyle = PAL.ironLo
  g.fill(lamp)
  g.fillStyle = hexA('#FFD9A0', 0.3 + 0.65 * lampsOn(t, 0))
  g.fill(lit)

  // The street, through the loading door, in the morning.
  if (x1 > DOOR_X - 1) {
    drawOutside(g, v, t)
    drawDoorway(g, v, t)
  }

  // Upstairs: Ted's office, on the mezzanine over the hall's left end.
  if (x0 < ROOM_X1 + 0.5) drawOffice(g, v, t, cover)
  g.restore()
}

/**
 * The hall's end wall, cut through at the loading door: brick, its outer face catching the morning; a stone lintel
 * over the opening, the curtain hung from it; through the opening the far jamb, the wall's thickness in its own
 * shade; the wall's foot running out under the camera, and the threshold. On a bracket off its inner face, the bay
 * lamp over the conveyor.
 */
function drawDoorway(g: C2, v: ReturnType<typeof view>, t: number): void {
  const k = v.k
  const y0 = v.y0 - 1
  const w = WALL.x1 - WALL.x0
  const brick = mix(PAL.hall, '#5A4A44', 0.55)
  const jamb = mix(brick, '#15171A', 0.35)
  const arris = mix(brick, PAL.outsideHigh, 0.35)
  rect(g, k, WALL.x0, y0, w, DOOR_TOP - y0, brick)
  rect(g, k, WALL.x0, DOOR_TOP, w, FLOOR - DOOR_TOP, jamb)
  for (let by = FLOOR - 0.2; by > y0; by -= 0.2) line(g, k, WALL.x0, by, WALL.x1, by, hexA('#000000', 0.18), 0.012)
  rect(g, k, WALL.x1 - 0.06, y0, 0.06, FLOOR - y0, arris)
  // The wall's foot, from the threshold out under the camera, as the floor's lines run back to the eye.
  const drop = FLOOR - v.cy
  if (drop > 0.05 && v.y1 > FLOOR) {
    const yb = v.y1 + 0.5
    const f = (yb - v.cy) / drop
    const at = (x: number) => v.cx + (x - v.cx) * f
    poly(g, k, [[WALL.x0, FLOOR], [WALL.x1, FLOOR], [at(WALL.x1), yb], [at(WALL.x0), yb]], mix(jamb, '#000000', 0.2))
    poly(g, k, [[WALL.x1 - 0.06, FLOOR], [WALL.x1, FLOOR], [at(WALL.x1), yb], [at(WALL.x1 - 0.06), yb]], hexA(arris, 0.6))
  }
  rect(g, k, WALL.x0 - 0.06, DOOR_TOP - 0.2, w + 0.12, 0.22, mix(PAL.outside, '#5C5F66', 0.55))
  line(g, k, WALL.x0 - 0.06, DOOR_TOP + 0.02, WALL.x1 + 0.06, DOOR_TOP + 0.02, hexA('#000000', 0.3), 0.02)
  rect(g, k, WALL.x0 - 0.02, FLOOR - 0.02, w + 0.06, 0.07, mix(PAL.pavement, '#3A3C40', 0.5))
  // The bay lamp: its bracket, its shade, the cage round the bulb; dark until it is switched on.
  const [bx, by] = BAY
  const on = bayOn(t)
  rect(g, k, bx, by - 0.24, WALL.x0 - bx, 0.035, PAL.ironLo)
  rect(g, k, bx - 0.012, by - 0.24, 0.024, 0.1, PAL.ironLo)
  poly(g, k, [[bx - 0.15, by - 0.04], [bx - 0.07, by - 0.15], [bx + 0.07, by - 0.15], [bx + 0.15, by - 0.04]], PAL.ironLo)
  g.fillStyle = on > 0 ? hexA('#FFF0CC', 0.35 + 0.6 * on) : '#33393C'
  g.beginPath()
  g.ellipse(bx * k, (by + 0.02) * k, 0.07 * k, 0.065 * k, 0, 0, Math.PI * 2)
  g.fill()
  for (const dx of [-0.07, 0, 0.07]) line(g, k, bx + dx * 0.9, by - 0.04, bx + dx, by + 0.1, PAL.iron, 0.012)
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
  // The table's light: the pendant's pool on its top, brighter at the middle; the windows in its top, long and pale;
  // the grain of its front.
  for (const [rx, a] of [[1.35, 0.1], [0.7, 0.08]] as const) {
    g.fillStyle = hexA(PAL.lamp, a)
    g.beginPath()
    g.ellipse(-1.1 * k, (TABLE.top - 0.11) * k, rx * k, 0.1 * k, 0, 0, Math.PI * 2)
    g.fill()
  }
  for (const [a, b] of PANES) {
    if (b < TABLE.x0 || a > TABLE.x1) continue
    const xa = Math.max(a, TABLE.x0 + 0.2)
    const xb = Math.min(b, TABLE.x1 - 0.15)
    if (xb <= xa) continue
    poly(g, k, [[xa + 0.04, TABLE.top - 0.21], [xb - 0.04, TABLE.top - 0.21], [xb + 0.05, TABLE.top - 0.01], [xa + 0.1, TABLE.top - 0.01]], hexA('#A9C1C8', 0.13))
  }
  for (const [y, a] of [[0.03, 0.35], [0.06, 0.25], [0.095, 0.3]] as const) line(g, k, TABLE.x0 + 0.05, TABLE.top + y, TABLE.x1 - 0.05, TABLE.top + y + 0.004, hexA('#2A1F19', a), 0.008)
  // The grain along its top, foreshortened.
  for (let j = 1; j < 6; j++) {
    const u = j / 6
    const y = TABLE.top - 0.22 * (1 - u)
    line(g, k, TABLE.x0 + 0.15 * (1 - u) + 0.05, y, TABLE.x1 - 0.1 * (1 - u) - 0.05, y + 0.003 * (j % 2), hexA(j % 2 ? '#3A2C24' : '#6E5848', 0.45), 0.007)
  }
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
  // The little gust it makes.
  if (since >= 0 && since < 0.8) {
    const a = knock(since, 0.22)
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
  // The window behind him, catching his edges: the back of his head, his shoulder, his arm; less on the side
  // toward the room.
  g.strokeStyle = hexA('#E9D2A6', 0.5)
  g.lineWidth = 0.02 * k
  g.lineCap = 'round'
  g.beginPath()
  g.ellipse(0, -2.88 * k, 0.15 * k, 0.19 * k, 0, Math.PI * 0.62, Math.PI * 1.32)
  g.moveTo(-0.37 * k, -2.0 * k)
  g.lineTo(-0.38 * k, -2.32 * k)
  g.quadraticCurveTo(-0.36 * k, -2.5 * k, -0.18 * k, -2.52 * k)
  g.moveTo(-0.47 * k, -2.3 * k)
  g.lineTo(-0.47 * k, -1.45 * k)
  g.stroke()
  g.strokeStyle = hexA('#9FC0CB', 0.3)
  g.lineWidth = 0.014 * k
  g.beginPath()
  g.moveTo(0.47 * k, -2.3 * k)
  g.lineTo(0.47 * k, -1.45 * k)
  g.moveTo(0.18 * k, -2.52 * k)
  g.quadraticCurveTo(0.36 * k, -2.5 * k, 0.38 * k, -2.32 * k)
  g.stroke()
  g.restore()
}

/* ------------------------------------------------------------------ the stair and the treadle */

function drawStair(g: C2, k: number, t: number): void {
  const { x0, run, n } = STAIR
  // The far stringer, treads, the near stringer, a rail.
  const xs = x0
  const xe = x0 + run * (n - 1)
  line(g, k, xs - 0.05, UP + 0.15, xe + 0.05, FLOOR - 0.1, PAL.ironLo, 0.12)
  // The light on its edges: the dawn's, until the lamps come up.
  const edge = mix('#8FB0BA', '#F2C27A', lampsOn(t, 0) > 0.5 ? 1 : 0)
  for (let i = 1; i < n; i++) {
    const tx = x0 + run * (i - 1)
    const ty = treadY(i)
    rect(g, k, tx, ty, run + 0.04, 0.06, PAL.ironHi)
    rect(g, k, tx, ty + 0.06, run + 0.04, 0.03, PAL.ironLo)
    rect(g, k, tx, ty - 0.008, run + 0.04, 0.016, hexA(edge, 0.75))
    line(g, k, tx + run, ty + 0.09, tx + run, ty + STAIR.rise, hexA(PAL.ironLo, 0.6), 0.02)
  }
  // The near stringer: a channel along under the treads' fronts, so they stand up from it as steps; its bolts.
  const slope = STAIR.rise / run
  const sy = (x: number) => treadY(1) + 0.09 + (x - (x0 + run)) * slope
  const foot = x0 + run + (FLOOR - treadY(1) - 0.09) / slope
  poly(g, k, [[xs - 0.04, sy(xs - 0.04)], [foot, FLOOR], [foot - 0.34, FLOOR], [xs - 0.04, sy(xs - 0.04) + 0.24]], PAL.ironLo)
  line(g, k, xs - 0.04, sy(xs - 0.04), foot, FLOOR, hexA(edge, 0.35), 0.012)
  for (let x = xs + 0.25; x < foot - 0.2; x += 0.42) disc(g, k, x, sy(x) + 0.12, 0.016, PAL.steel)
  // The rail and its posts, the rail's top catching the light.
  line(g, k, xs + 0.05, UP - 0.95, xe + 0.3, FLOOR - 1.05, PAL.iron, 0.05)
  line(g, k, xs + 0.05, UP - 0.97, xe + 0.3, FLOOR - 1.07, hexA(edge, 0.55), 0.014)
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
  // The web along the line and down the board: the brightest thing in the hall after him.
  const web = new Path2D()
  web.moveTo(G0.c[0] * k, (WEB_Y + WEB_T / 2) * k)
  web.lineTo(G4.c[0] * k, (WEB_Y + WEB_T / 2) * k)
  web.arc(G4.c[0] * k, G4.c[1] * k, (G4.r - WEB_T / 2) * k, -Math.PI / 2, -Math.PI / 2 + BOARD)
  web.lineTo((NOSE[0] - Math.sin(BOARD) * WEB_T * 0.5) * k, (NOSE[1] + Math.cos(BOARD) * WEB_T * 0.5) * k)
  g.strokeStyle = PAL.paper
  g.lineWidth = WEB_T * k
  g.lineCap = 'butt'
  g.stroke(web)
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

/**
 * A drive chain round two sprockets (centres and pitch radii), its links running at the press's pace: the outer
 * tangents and the far side of each, dashed into links that move along it.
 */
function chain(g: C2, k: number, a: [number, number], ra: number, b: [number, number], rb: number, run: number): void {
  const th = Math.atan2(b[1] - a[1], b[0] - a[0])
  const ph = Math.acos((ra - rb) / Math.hypot(b[0] - a[0], b[1] - a[1]))
  g.save()
  g.beginPath()
  g.arc(b[0] * k, b[1] * k, rb * k, th + ph, th - ph, true)
  g.arc(a[0] * k, a[1] * k, ra * k, th - ph, th + ph, true)
  g.closePath()
  g.strokeStyle = PAL.ironLo
  g.lineWidth = 0.035 * k
  g.stroke()
  g.setLineDash([0.035 * k, 0.025 * k])
  g.lineDashOffset = -run * k
  g.strokeStyle = hexA(PAL.steel, 0.75)
  g.lineWidth = 0.022 * k
  g.stroke()
  g.restore()
}

/** The lamps' light along a turning cylinder's upper left rim: it stays put while the cylinder turns. */
function litRim(g: C2, k: number, x: number, y: number, r: number): void {
  g.strokeStyle = hexA(PAL.steelHi, 0.7)
  g.lineWidth = Math.max(0.6, r * 0.09 * k)
  g.beginPath()
  g.arc(x * k, y * k, r * 0.86 * k, -2.55, -1.75)
  g.stroke()
}

/** A unit's side frame's face, in cells from its middle: pure geometry, made once. */
let FACE: { panels: Path2D; rivets: Path2D; lit: Path2D; rim: Path2D; upper: Path2D; crown: Path2D } | null = null
function unitFace(): NonNullable<typeof FACE> {
  if (FACE) return FACE
  const top = WEB_Y - 1.55
  const panels = new Path2D()
  const rivets = new Path2D()
  // The frame's outline, inset: its panel, and stiffening ribs across it.
  const inset: [number, number][] = [[-0.75, FLOOR - 0.18], [-0.615, top + 0.09], [0.615, top + 0.09], [0.75, FLOOR - 0.18]]
  panels.moveTo(inset[0][0], inset[0][1])
  for (const q of inset.slice(1)) panels.lineTo(q[0], q[1])
  panels.closePath()
  const across = (y: number): [number, number] => {
    const u = (y - top) / (FLOOR - top)
    const w = 0.615 + (0.75 - 0.615) * u
    return [-w, w]
  }
  for (const y of [top + 0.5, FLOOR - 0.62]) {
    const [a, b] = across(y)
    panels.moveTo(a, y)
    panels.lineTo(b, y)
  }
  // Rivets along the panel's edges and its ribs.
  for (let j = 0; j < 4; j++) {
    const [ax, ay] = inset[j]
    const [bx, by] = inset[(j + 1) % 4]
    const len = Math.hypot(bx - ax, by - ay)
    for (let d = 0.07; d < len; d += 0.15) {
      const px = ax + ((bx - ax) * d) / len - (Math.sign(ax + bx) || 0) * 0.04
      const py = ay + ((by - ay) * d) / len + (j === 1 ? 0.045 : j === 3 ? -0.045 : 0)
      rivets.moveTo(px + 0.016, py)
      rivets.arc(px, py, 0.016, 0, Math.PI * 2)
    }
  }
  for (const y of [top + 0.5, FLOOR - 0.62]) {
    const [a, b] = across(y)
    for (let x = a + 0.1; x < b - 0.05; x += 0.15) {
      rivets.moveTo(x + 0.014, y - 0.04)
      rivets.arc(x, y - 0.04, 0.014, 0, Math.PI * 2)
    }
  }
  // The lamp's light along its top and falling down its face, brightest nearest the lamp; the window's cool light
  // down its right edge.
  const lit = new Path2D()
  lit.rect(-0.7, top, 1.4, 0.025)
  const band = (d: number): Path2D => {
    const w = 0.7 + ((0.85 - 0.7) * d) / (FLOOR - top)
    const p = new Path2D()
    p.moveTo(-0.7, top)
    p.lineTo(0.7, top)
    p.lineTo(w, top + d)
    p.lineTo(-w, top + d)
    p.closePath()
    return p
  }
  const upper = band(1.0)
  const crown = band(0.45)
  const rim = new Path2D()
  rim.moveTo(0.7, top + 0.03)
  rim.lineTo(0.85, FLOOR)
  rim.lineTo(0.82, FLOOR)
  rim.lineTo(0.675, top + 0.03)
  rim.closePath()
  FACE = { panels, rivets, lit, rim, upper, crown }
  return FACE
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
    // The side frame: a heavy plate behind, with its foot; the lamps' light on its upper face; its panels, their
    // rivets, the light along its top.
    poly(g, k, [[x - 0.85, FLOOR], [x - 0.7, WEB_Y - 1.55], [x + 0.7, WEB_Y - 1.55], [x + 0.85, FLOOR]], PAL.ironLo)
    rect(g, k, x - 0.95, FLOOR - 0.12, 1.9, 0.12, PAL.iron)
    g.save()
    g.translate(x * k, 0)
    g.scale(k, k)
    const face = unitFace()
    const on = lampsOn(t, 0)
    g.fillStyle = hexA(PAL.lamp, 0.05 * on)
    g.fill(face.upper)
    g.fill(face.crown)
    g.strokeStyle = hexA(PAL.ironHi, 0.55)
    g.lineWidth = 0.018
    g.stroke(face.panels)
    g.fillStyle = hexA(PAL.steel, 0.5)
    g.fill(face.rivets)
    g.fillStyle = hexA(PAL.lamp, 0.15 + 0.5 * on)
    g.fill(face.lit)
    g.fillStyle = hexA(PAL.steelHi, 0.35)
    g.fill(face.rim)
    // The gauge on the frame: its needle kicks on each impression.
    const gx = -0.44
    const gy = WEB_Y - 1.0
    g.fillStyle = PAL.iron
    g.beginPath()
    g.arc(gx, gy, 0.125, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#D9D3C3'
    g.beginPath()
    g.arc(gx, gy, 0.1, 0, Math.PI * 2)
    g.fill()
    const needle = -2.3 + (t >= UNIT_START[i] ? 1.6 + 0.5 * hit + 0.05 * Math.sin(t * 9 + i) : 0.2)
    g.strokeStyle = PAL.ink
    g.lineWidth = 0.014
    g.beginPath()
    g.moveTo(gx, gy)
    g.lineTo(gx + Math.cos(needle) * 0.085, gy + Math.sin(needle) * 0.085)
    g.stroke()
    // The running light by its foot, in its bezel: dark until the unit runs, then green.
    g.fillStyle = PAL.ironLo
    g.beginPath()
    g.arc(-0.55, FLOOR - 0.36, 0.045, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = t >= UNIT_START[i] ? '#7CC48E' : '#24352B'
    g.beginPath()
    g.arc(-0.55, FLOOR - 0.36, 0.028, 0, Math.PI * 2)
    g.fill()
    g.restore()
    // The sprockets on the frame, the small one driving the large by a chain, all turning with the press.
    disc(g, k, x - 0.28, impY + 0.98, 0.19, PAL.iron)
    spokes(g, k, x - 0.28, impY + 0.98, 0.19, run / 0.19, 5, PAL.ironHi, 0.03)
    disc(g, k, x + 0.42, impY + 0.62, 0.3, PAL.iron)
    spokes(g, k, x + 0.42, impY + 0.62, 0.3, run / 0.3, 6, PAL.ironHi, 0.04)
    litRim(g, k, x + 0.42, impY + 0.62, 0.3)
    chain(g, k, [x - 0.28, impY + 0.98], 0.21, [x + 0.42, impY + 0.62], 0.32, run)
    // The impression cylinder.
    disc(g, k, x, impY, IMP_R, PAL.iron)
    ring(g, k, x, impY, IMP_R - 0.03, PAL.ironHi, 0.02)
    spokes(g, k, x, impY, IMP_R, run / IMP_R, 4, PAL.ironHi, 0.035)
    litRim(g, k, x, impY, IMP_R)
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
  litRim(g, k, x, plY, PLATE_R)
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
  // The mouth under the knife that the copies come out of.
  rect(g, k, OUTLET_X - CW / 2 - 0.04, FOLD.y1 - 0.05, CW + 0.08, 0.05, PAL.ink)
  // The legs, and the chute down to the tray.
  rect(g, k, FOLD.x0 + 0.05, FOLD.y1, 0.08, FLOOR - FOLD.y1, PAL.ironLo)
  rect(g, k, FOLD.x1 - 0.13, FOLD.y1, 0.08, FLOOR - FOLD.y1, PAL.ironLo)
}

/**
 * The copies out of the folder, face on: each comes down out of the mouth under the knife on its cut, drops clear,
 * turning a little once it is out, drifts back over the tray, and falls flat in it.
 */
function drawFalling(g: C2, k: number, t: number): void {
  const fallH = DECK - FOLD.y1 - 0.02
  const T = Math.sqrt((2 * fallH) / 12)
  g.save()
  g.beginPath()
  g.rect((TRAY_X - 1) * k, FOLD.y1 * k, (FOLD.x1 - TRAY_X + 2) * k, (DECK + 0.2 - FOLD.y1) * k)
  g.clip()
  for (const ci of CUTS) {
    const u = t - ci
    if (u < 0 || u > T + 0.02) continue
    const y = FOLD.y1 + 6 * u * u
    const out = Math.min(1, (y - FOLD.y1) / CH)
    const flat = smooth(u, T - 0.08, T)
    const h = CH * (1 - flat) + 0.03 * flat
    const swing = Math.sin(u * 14 + ci) * 0.12 * (1 - flat) * out * out
    const x = OUTLET_X + (TRAY_X - OUTLET_X) * smooth(u, 0.05, T)
    g.save()
    g.translate(x * k, (y - h / 2) * k)
    g.rotate(swing)
    cover(g, k, -CW / 2, -h / 2, CW, h)
    g.restore()
  }
  g.restore()
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
  if (t >= CRIMP) rect(g, k, x - 0.07, DECK - 0.38, 0.14, 0.1, PAL.steel)
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
    const a = 0.3 + 0.06 * i
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
    // Each strip: the clear plastic, grey-green, and its thick edge darker down the middle of it.
    g.lineJoin = 'round'
    g.beginPath()
    pts.forEach(([x, y], j) => (j ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)))
    g.strokeStyle = hexA(PAL.strip, a)
    g.lineWidth = 0.075 * k
    g.stroke()
    g.strokeStyle = hexA('#3E4C50', 0.4)
    g.lineWidth = Math.max(0.6, 0.014 * k)
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
  if (vis(STAIR.x0 - 0.5, STAIR.x0 + 4)) drawStair(g, k, t)
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
  // The strip curtain last, behind him: he goes through it, and it never lies over him.
  if (vis(DOOR_X - 1, DOOR_X + 1)) {
    g.lineCap = 'butt'
    drawCurtain(g, k, t)
  }
  g.restore()
}

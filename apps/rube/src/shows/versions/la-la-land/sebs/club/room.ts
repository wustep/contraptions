import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt } from '../../../../../parts'
import { frame, glow, hash, rgba, scenery, smooth } from '../kit'
import { picture } from '../lens'
import { DRIVE_MAT, SEBS_MAT } from '../worlds'
import { PIANO } from './geometry'
import { bandPlayers, DREAM_BAND, drinkRail, fans, gallery, REAL_BAND, sitter, smoke, stander, walker, type Light, type Sitter } from './people'
import { PIANO_SHADOW } from './piano'

/** Where the piano's shadow is laid, round a small circle (cells), for its soft edge. */
const PENUMBRA: [number, number][] = [[0, 0], ...[0.07, 0.14].flatMap((r, j) => Array.from({ length: 6 }, (_, i): [number, number] => [r * Math.cos(((i + j / 2) * Math.PI) / 3), r * Math.sin(((i + j / 2) * Math.PI) / 3)]))]

/**
 * Seb's: a small jazz club, drawn in section the way every building in this house is, the front wall cut away.
 *
 * Inside, left to right: the door in the left wall, the bar along the back wall with its stools, the tables on the
 * floor (a candle lamp on each), and in the front row the table where Mia sits; then the low stage, a velvet
 * curtain behind it, the piano (which the parts draw) and the band's idle instruments to its right: a stand-up bass
 * lying on its side, a drum kit, a stool, two music stands with clip lamps. Overhead a pipe of stage lights, one of
 * them on the piano. Round it the building's shell, cut: the walls, the floor slab, the ceiling and roof with its
 * parapet; outside the door a small velvet awning, and over it the blue neon arrow. Along the front, the street.
 * The city beyond is the director's (`city.ts`).
 *
 * The same room stands twice: at the start (`end: false`), the house lights up and then down to the one blue stage
 * light and the candles; and at the end (`end: true`), where the dream's rose light fills it from 423.4 s until it
 * drains at about 452 s, the band's lamps come up at 471.5 s and the stage blazes on the band at 478 s.
 *
 * The neon arrow, which the drive draws too, from the street outside: a single tube of blue neon (DRIVE_MAT.neon,
 * with a DRIVE_MAT.neonCore core, glowing) bent into an arrow. Its tail is a level run from the left, 0.95 cells
 * long; it turns down through a quarter-circle bend of radius 0.25; it drops 0.5 cells straight down; and it ends in
 * an open chevron (two strokes, each 0.24 cells long, 40° off the vertical) pointing straight down at the door's
 * awning. It hangs off the wall on a black bracket above the awning, its tail away from the door. The tube is about
 * a twelfth of a cell thick. No letters anywhere on the building.
 */

/** Which club: the one at the start, or the same one at the end (where the dream's rose comes into it). */
export interface ClubRoom {
  end: boolean
}

/** The room's numbers, in the piano's frame (the lowest key's left edge is x = 0; a ball on a white key, y = 0). */
export const ROOM = {
  floor: PIANO.floor,
  stage: PIANO.stage,
  /** The stage's front edge (it runs to the right wall). */
  stageX0: -1.7,
  /** The left wall (the door is in it), its outer and inner faces; the right wall's inner and outer faces. */
  wallL0: -12.5,
  wallL1: -12.0,
  wallR0: 11.0,
  wallR1: 11.5,
  /** The ceiling's underside, and the roof's top. */
  ceil: -5.7,
  roof: -6.4,
  /** The door's head, in the left wall (it opens from here to the floor). */
  doorTop: 1.72,
}

/**
 * Whether the picture `fr` (room cells) is all inside the room, under its ceiling: then the back wall, and the street
 * along the front below its floor, cover everything behind them, and the city need not be drawn. `street` asks the
 * same of the wall alone, above the floor: then the street need not be drawn either.
 */
export function insideRoom(fr: { x0: number; y0: number; x1: number; y1: number }, street = false): boolean {
  return fr.x0 >= ROOM.wallL1 && fr.x1 <= ROOM.wallR0 && fr.y0 >= ROOM.ceil && (!street || fr.y1 <= ROOM.floor)
}

/** Where a ball sits on a chair: its seat's top is `SEAT` (the ball's centre is a radius above it). */
export const SEAT = 2.8
/**
 * Mia's table, front row, nearest the stage: a small café table for two, its centre and its top. She sits on its
 * left, and across it on its right the one with her: David now, Seb in the dream. Their seats are set so that each
 * ball's dot (its gaze) says something: hers looks level across the table and on to the stage; his looks straight
 * back at her.
 */
export const TABLE = { x: -2.2462, top: 2.71 }
/** Mia's seat (the ball's centre), and the seat across from her. */
export const MIA_SEAT: Pt = [-2.4504, SEAT - 0.13]
export const SIDE_SEAT: Pt = [-2.042, SEAT - 0.13]
/** The bar: its counter's ends and top; the stools in front of it (x). */
export const BAR = { x0: -11.72, x1: -9.55, top: 2.26, stools: [-11.05, -10.25] }

/**
 * Where the club's front door is, in the room's own cells (the piano's origin is 0,0): the finale enters here, from
 * the street, and the score stands the room at the end so that its door is where the finale's lane begins. The
 * finale's (-0.5, 0), the ball's centre on the threshold, is the middle of the left wall at the floor.
 */
export const DOOR: Pt = [(ROOM.wallL0 + ROOM.wallL1) / 2 + 0.5, ROOM.floor - 0.13]

/* ------------------------------------------------------------------ the lights */

/** The house lights' cue at the start: up as the camera comes in, and down to the one stage light on the phrase's settle. */
export const HOUSE_DOWN: [number, number] = [12.35, 15.0]
/** At the end: the dream's rose drains out of the light; the band's lamps; the band. */
export const ROSE_OUT: [number, number] = [451.5, 453.73]
/** The dream's kiss at her table: they lean in, touch, and he leaves her side as the dream drains. */
export const LEAN = 446.938
export const KISS = 450.107
export const LEAVE = 451.53
export const BAND_LAMPS = 471.546
export const BAND = 478.052

export interface Lights {
  /** The house lights (sconces), 0..1, and their colour. */
  house: number
  warm: string
  /** The stage light on the piano: its colour and strength. */
  stage: string
  stageA: number
  /** The band's clip lamps, and the whole rig blazing on the band. */
  band: number
  blaze: number
  /** How much of the dream's rose is in the room. */
  rose: number
}

const M = SEBS_MAT
/** The stage light's cold blue, as it falls on things. */
export const COLD = mixHex(M.blue, M.ivory, 0.38)

/** How the room is lit at show time `t`. */
export function lightsAt(t: number, end: boolean): Lights {
  if (!end) {
    const u = smooth(t, HOUSE_DOWN[0], HOUSE_DOWN[1])
    return { house: 1 - 0.88 * u, warm: M.candle, stage: COLD, stageA: 1, band: 0, blaze: 0, rose: 0 }
  }
  const rose = 1 - smooth(t, ROSE_OUT[0], ROSE_OUT[1])
  return {
    house: 0.12 + 0.55 * rose,
    warm: mixHex(M.candle, M.rose, rose),
    stage: mixHex(COLD, M.rose, rose * 0.85),
    stageA: 1,
    band: smooth(t, BAND_LAMPS, BAND_LAMPS + 0.5),
    blaze: smooth(t, BAND, BAND + 0.18),
    rose,
  }
}

/** The door shuts behind her on The End's onset, at the end. */
export const DOOR_SHUT = 467.866
/** How far open the door is (0 shut, 1 swung wide): shut at the start; open at the end until it swings to on its closer. */
export function doorAt(t: number, end: boolean): number {
  if (!end) return 0
  const a = DOOR_SHUT - 0.9
  if (t < a) return 1
  if (t < DOOR_SHUT) {
    const u = (t - a) / 0.9
    return 1 - u * u
  }
  // Shut hard, it gives a hair and settles.
  const since = t - DOOR_SHUT
  return 0.06 * Math.exp(-since / 0.12) * Math.abs(Math.sin(since * 22))
}

/** How far the curtain's fold `i` has stirred at `t`, in the fans' air (cells). */
const curtainStir = (t: number, i: number): number => 0.06 * Math.sin(t * 0.6 + i * 0.83) + 0.03 * Math.sin(t * 1.3 + i * 2.1)

/** How far up the house lights are at show time `t` (0..1). */
export const house = (t: number, end: boolean): number => lightsAt(t, end).house

/* ------------------------------------------------------------------ the furniture */

/** The other tables: where, and their chairs (offset from the table, and which way each faces: 1 is to the stage). */
const TABLES: { x: number; chairs: [number, 1 | -1][] }[] = [
  { x: -4.3, chairs: [[-0.33, 1], [0.33, -1]] },
  { x: -6.25, chairs: [[-0.34, 1], [0.47, -1]] },
  { x: -8.25, chairs: [[0.34, -1]] },
]
/** The banquette along the wall behind her table and the next, its ends. */
const BANQUETTE: [number, number] = [-4.75, -1.82]
/** The sconces on the back wall: the house lights. */
const SCONCES = [-10.6, -7.25, -5.3, -3.35]
const SCONCE_Y = 0.95
/** The stage lights' pipe, and the fixtures on it: the first is the piano's own. */
const PIPE = -5.05
const SPOTS: { x: number; to: Pt }[] = [
  { x: 2.75, to: [2.8, 0.1] },
  { x: -0.9, to: [0.4, 2.2] },
  { x: 5.3, to: [4.4, 2.3] },
  { x: 7.3, to: [7.1, 2.4] },
  { x: 9.2, to: [8.6, 2.4] },
]
/** The band's clip lamps on their music stands (x). */
const STANDS = [7.75, 9.95]
/**
 * Who is at her table, where (room cells), as the parts that seat them say: so her table's candle can throw their
 * shadows on the wall behind them. The opening sets `start`, the finale `end`.
 */
export const AT_HER_TABLE: { start: ((t: number) => Pt[]) | null; end: ((t: number) => Pt[]) | null } = { start: null, end: null }

/** The house spot, hung from the ceiling over the floor and turned on her table: the light that finds her. */
const HOUSE_SPOT: Pt = [-4.3, -5.05]
const HOUSE_SPOT_TO: Pt = [-2.25, 2.4]
/** How much the house spot is on her table at `t`: at the start while the camera is with her, at the end for the kiss. */
function onHer(t: number, end: boolean): number {
  if (!end) return smooth(t, 18.5, 21.5) * (1 - smooth(t, 32.5, 35.5))
  return smooth(t, LEAN - 1.6, LEAN + 0.6) * (1 - smooth(t, LEAVE, LEAVE + 0.9))
}

/**
 * Who sits where: every chair and stool, and which of them are the room as it is (a couple at the middle table, a man
 * smoking at the bar's end, and at the start a second couple at the next table to hers, who have gone by the end, their
 * table wiped). The rest are the dream's, and go with its rose.
 */
type Real = 'both' | 'start' | 'none'
const SITTERS: (Sitter & { real: Real; bar: boolean })[] = [
  ...TABLES.flatMap((tb, i) => tb.chairs.map(([dx, face], j) => ({ x: tb.x + dx, y: SEAT - 0.14, face, seed: hash(i, j, 61), real: (tb.x === -6.25 ? 'both' : i === 0 ? 'start' : 'none') as Real, bar: false }))),
  ...[-11.05, -10.25].map((x, j) => ({ x, y: 2.5 - 0.14, face: -1 as const, seed: hash(j, 9, 61), real: (x === -11.05 ? 'both' : 'none') as Real, bar: true })),
]
/** The bartender's way along the bar, [show time, x]: at the start, and at the end. */
const TENDER_START: [number, number][] = [[0, -10.95], [8.5, -10.95], [10.5, -10.05], [23, -10.05], [25.5, -10.95], [40, -10.95]]
// (At the end, as the door shuts behind her, he goes down the bar to the man at its end.)
const TENDER_END: [number, number][] = [[423.3, -10.05], [429.5, -10.05], [431.5, -10.95], [441, -10.95], [443, -10.15], [465.4, -10.15], [467.2, -10.8], [510, -10.8]]
/**
 * The waiters' ways across the floor, [show time, x]. The real one works both rooms: drinks out to the middle table,
 * a table wiped, back to the bar. The dream has a second, crossing the full room with a tray.
 */
const WAITERS: { real: boolean; start: [number, number][]; end: [number, number][] }[] = [
  {
    real: true,
    start: [[0, -9.2], [1.5, -9.2], [5.5, -7.0], [8.0, -7.0], [11.0, -4.85], [13.0, -4.85], [18.0, -9.2], [40, -9.2]],
    end: [[423.3, -9.2], [425.5, -9.2], [429.0, -7.0], [431.0, -7.0], [434.0, -9.2], [456.2, -9.2], [459.2, -3.72], [465.5, -3.72], [469.8, -9.2], [510, -9.2]],
  },
  // The dream's: across the room with a tray, to the stage's edge, and back past her table, behind it, as they lean in.
  { real: false, start: [[0, -40]], end: [[423.3, -3.4], [426, -3.4], [430, -8.6], [432, -8.6], [436, -5.4], [438.5, -5.4], [441.8, -0.8], [444.3, -0.8], [447.4, -5.9], [453.6, -5.9]] },
]

/* ------------------------------------------------------------------ drawing */

type Pen = {
  p: p5
  k: number
  ink: string
  w: number
  X: (v: number) => number
  rect: (x0: number, y0: number, x1: number, y1: number, ...r: number[]) => void
  poly: (pts: Pt[]) => void
}

function pen(p: p5, k: number, ink: string, w: number): Pen {
  const X = (v: number) => v * k
  return {
    p,
    k,
    ink,
    w,
    X,
    rect: (x0, y0, x1, y1, ...r) => p.rect(X((x0 + x1) / 2), X((y0 + y1) / 2), X(x1 - x0), X(y1 - y0), ...r.map(X)),
    poly: (pts) => {
      p.beginShape()
      for (const [x, y] of pts) p.vertex(X(x), X(y))
      p.endShape(p.CLOSE)
    },
  }
}

const vband = (p: p5, k: number, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  for (const [o, c] of stops) g.addColorStop(o, c)
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

/** A bentwood chair seen from the side, its seat at `SEAT`, facing `face` (1: to the right). */
function chair(q: Pen, x: number, face: 1 | -1): void {
  const { p, X } = q
  const wood = mixHex(M.brass, M.deep, 0.55)
  const back = x - face * 0.115
  p.stroke(q.ink)
  p.strokeWeight(q.w * 0.5)
  p.noFill()
  // The back: a bent hoop from the seat's back edge, raked a little.
  p.beginShape()
  p.vertex(X(back), X(SEAT))
  p.bezierVertex(X(back - face * 0.03), X(SEAT - 0.2), X(back - face * 0.02), X(SEAT - 0.36), X(back + face * 0.03), X(SEAT - 0.38))
  p.endShape()
  p.line(X(x + face * 0.1), X(SEAT + 0.02), X(x + face * 0.12), X(ROOM.floor))
  p.line(X(back + face * 0.01), X(SEAT + 0.02), X(back - face * 0.02), X(ROOM.floor))
  solid(p, q.ink, q.w * 0.45, wood)
  q.rect(x - 0.13, SEAT, x + 0.13, SEAT + 0.03, 0.012)
}

/** A small stool at Mia's table: a velvet seat at `SEAT` on a brass stem. A ball climbs onto it from beside it. */
function stool(q: Pen, x: number): void {
  const { p, X } = q
  p.stroke(q.ink)
  p.strokeWeight(q.w * 0.5)
  p.line(X(x), X(SEAT + 0.04), X(x), X(ROOM.floor - 0.02))
  p.line(X(x - 0.07), X(ROOM.floor - 0.1), X(x + 0.07), X(ROOM.floor - 0.1))
  solid(p, q.ink, q.w * 0.45, mixHex(M.brass, M.deep, 0.4))
  q.rect(x - 0.09, ROOM.floor - 0.03, x + 0.09, ROOM.floor, 0.012)
  solid(p, q.ink, q.w * 0.5, M.velvet)
  q.rect(x - 0.12, SEAT, x + 0.12, SEAT + 0.05, 0.025)
}

/** A café table: a brass top on a stem, its foot on the floor. Only its top with `part` 'top', only the rest with 'base'. */
function table(q: Pen, x: number, part: 'all' | 'top' | 'base' = 'all', half = 0.31): void {
  const { p, X } = q
  if (part !== 'top') {
    p.stroke(q.ink)
    p.strokeWeight(q.w * 0.55)
    p.line(X(x), X(TABLE.top + 0.03), X(x), X(ROOM.floor - 0.03))
    solid(p, q.ink, q.w * 0.45, mixHex(M.brass, M.deep, 0.4))
    q.rect(x - Math.min(0.16, half * 0.75), ROOM.floor - 0.035, x + Math.min(0.16, half * 0.75), ROOM.floor, 0.015)
  }
  if (part !== 'base') {
    solid(p, q.ink, q.w * 0.55, M.brass)
    q.rect(x - half, TABLE.top, x + half, TABLE.top + 0.035, 0.012)
  }
}

/**
 * A wall lamp's light on the wall: a fan of it from the shade's mouth at (x, y), `len` long, opening to `spread` either
 * side, going up (`dir` -1) or down (1), and fading as it goes. In two layers, so its sides are soft. It is light lying
 * on the wall, not a glow round the lamp.
 */
function wash(p: p5, k: number, x: number, y: number, len: number, spread: number, color: string, a: number, dir: 1 | -1): void {
  if (a < 0.004) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const y1 = y + dir * len
  for (const [w, f] of [[spread, 0.55], [spread * 0.6, 0.6]] as const) {
    const g = ctx.createLinearGradient(0, y * k, 0, y1 * k)
    g.addColorStop(0, rgba(color, a * f))
    g.addColorStop(1, rgba(color, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((x - 0.09) * k, y * k)
    ctx.lineTo((x + 0.09) * k, y * k)
    ctx.lineTo((x + w) * k, y1 * k)
    ctx.quadraticCurveTo(x * k, (y1 + dir * len * 0.22) * k, (x - w) * k, y1 * k)
    ctx.closePath()
    ctx.fill()
  }
}

/**
 * The banquette along the back wall: a buttoned back and a seat, in the club's velvet, between `x0` and `x1`. Its
 * buttons pull the velvet into diamonds, each with a little light on its upper edge and a crease below.
 */
function banquette(p: p5, k: number, x0: number, x1: number, velvet: string, ink: string, weight: number, L: Lights): void {
  const f = frame(p, k)
  if (x1 < f.x0 || x0 > f.x1 || ROOM.floor < f.y0 || 2.15 > f.y1) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = (v: number) => v * k
  const top = 2.22
  const seat = 2.78
  ctx.save()
  // The back, its rolled top, the seat's cushion and the plinth under it.
  ctx.fillStyle = velvet
  ctx.beginPath()
  ctx.roundRect(X(x0), X(top), X(x1 - x0), X(seat - top), X(0.05))
  ctx.fill()
  ctx.fillStyle = mixHex(velvet, M.ivory, 0.08 + 0.06 * L.house)
  ctx.fillRect(X(x0 + 0.03), X(top), X(x1 - x0 - 0.06), Math.max(1, X(0.02)))
  ctx.fillStyle = mixHex(velvet, M.lacquer, 0.15)
  ctx.beginPath()
  ctx.roundRect(X(x0 - 0.03), X(seat), X(x1 - x0 + 0.06), X(0.13), X(0.035))
  ctx.fill()
  ctx.fillStyle = mixHex(M.lacquer, velvet, 0.25)
  ctx.fillRect(X(x0), X(seat + 0.13), X(x1 - x0), X(ROOM.floor - seat - 0.13))
  // The tufting: diamonds of crease between the buttons, and a little light on each puff's upper edge.
  const dx = 0.15
  const dy = 0.12
  const lw = Math.max(1, 0.007 * k)
  ctx.lineWidth = lw
  ctx.strokeStyle = rgba(M.lacquer, 0.45)
  ctx.beginPath()
  for (let r = 0; top + 0.06 + r * dy < seat - 0.04; r++) {
    const y = top + 0.07 + r * dy
    for (let x = x0 + 0.06 + (r % 2) * dx * 0.5; x < x1 - 0.05; x += dx) {
      if (x < f.x0 - 0.2 || x > f.x1 + 0.2) continue
      ctx.moveTo(X(x - dx * 0.5), X(y + dy * 0.5))
      ctx.lineTo(X(x), X(y))
      ctx.lineTo(X(x + dx * 0.5), X(y + dy * 0.5))
    }
  }
  ctx.stroke()
  ctx.strokeStyle = rgba(L.warm, 0.1 + 0.08 * L.house)
  ctx.beginPath()
  for (let r = 0; top + 0.06 + r * dy < seat - 0.04; r++) {
    const y = top + 0.07 + r * dy + 0.018
    for (let x = x0 + 0.06 + (r % 2) * dx * 0.5; x < x1 - 0.05; x += dx) {
      if (x < f.x0 - 0.2 || x > f.x1 + 0.2) continue
      ctx.moveTo(X(x - dx * 0.38), X(y + dy * 0.38))
      ctx.lineTo(X(x), X(y))
      ctx.lineTo(X(x + dx * 0.38), X(y + dy * 0.38))
    }
  }
  ctx.stroke()
  ctx.fillStyle = rgba(M.lacquer, 0.6)
  ctx.beginPath()
  for (let r = 0; top + 0.06 + r * dy < seat - 0.04; r++) {
    const y = top + 0.07 + r * dy
    for (let x = x0 + 0.06 + (r % 2) * dx * 0.5; x < x1 - 0.05; x += dx) {
      if (x < f.x0 - 0.2 || x > f.x1 + 0.2) continue
      ctx.moveTo(X(x + 0.012), X(y))
      ctx.arc(X(x), X(y), X(0.012), 0, Math.PI * 2)
    }
  }
  ctx.fill()
  ctx.restore()
  void ink
  void weight
}

const flicker = (t: number, seed: number): number => 0.85 + 0.15 * Math.sin(t * 7.3 + seed * 2.1) * Math.sin(t * 3.1 + seed)

/**
 * A table candle's light, on the wall and the backs of the chairs behind it: warm round the flame and cut off at the
 * table's top, which shades what is below it. Drawn under the furniture and the people, so nothing in front of the
 * candle is lit by it as if the air were.
 */
function candleLight(q: Pen, x: number, t: number, seed: number, strength = 1): void {
  const ctx = q.p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(q.X(x - 0.8), q.X(TABLE.top - 0.9), q.X(1.6), q.X(0.9))
  ctx.clip()
  glow(q.p, q.k, x, TABLE.top - 0.06, 0.5, M.candle, 0.2 * flicker(t, seed) * strength, 1.15, 0.8)
  ctx.restore()
}

/** A candle lamp on a table: a small glass and its flame. */
function candle(q: Pen, x: number, t: number, seed: number): void {
  const { p } = q
  const y = TABLE.top
  solid(p, q.ink, q.w * 0.3, rgba(M.candle, 0.3))
  q.rect(x - 0.03, y - 0.085, x + 0.03, y, 0.012, 0.012, 0.004, 0.004)
  p.noStroke()
  p.fill(M.candle)
  p.beginShape()
  const fx = x + 0.004 * Math.sin(t * 11 + seed)
  p.vertex(q.X(fx - 0.011), q.X(y - 0.03))
  p.bezierVertex(q.X(fx - 0.012), q.X(y - 0.05), q.X(fx), q.X(y - 0.06), q.X(fx + 0.001), q.X(y - 0.068))
  p.bezierVertex(q.X(fx + 0.012), q.X(y - 0.05), q.X(fx + 0.012), q.X(y - 0.04), q.X(fx + 0.011), q.X(y - 0.03))
  p.endShape(p.CLOSE)
}

/**
 * Seb's sign: a blue neon arrow bent down to the door, and beside it, hung from the same bracket, the note Mia drew
 * for his club's name (no letters, only the note). `tube` and `head` are the arrow, `note` the note's tubes, and
 * `left` how far the bracket reaches to hold them.
 */
export function neonArrow(tipX: number, tipY: number): { tube: Pt[]; head: [Pt, Pt, Pt]; note: Pt[][]; left: number } {
  const r = 0.25
  const drop = 0.5
  const cx = tipX - r
  const cy = tipY - drop
  const tube: Pt[] = [[cx - 0.95, cy - r]]
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2)
    tube.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  tube.push([tipX, tipY])
  const s = 0.24
  const a = (40 * Math.PI) / 180
  // The note: a round head tilted as a written one is, a stem up from its right side, a flag curling down.
  const nx = cx - 1.32
  const ny = cy + 0.08
  const ring: Pt[] = []
  for (let i = 0; i <= 14; i++) {
    const u = (i / 14) * Math.PI * 2
    const ex = 0.1 * Math.cos(u)
    const ey = 0.07 * Math.sin(u)
    ring.push([nx + ex * Math.cos(-0.35) - ey * Math.sin(-0.35), ny + ex * Math.sin(-0.35) + ey * Math.cos(-0.35)])
  }
  const sx = nx + 0.09
  const stem: Pt[] = [[sx, ny - 0.03], [sx, ny - 0.46]]
  const flag: Pt[] = [[sx, ny - 0.46], [sx + 0.08, ny - 0.38], [sx + 0.14, ny - 0.3], [sx + 0.13, ny - 0.2]]
  return {
    tube,
    head: [[tipX - s * Math.sin(a), tipY - s * Math.cos(a)], [tipX, tipY], [tipX + s * Math.sin(a), tipY - s * Math.cos(a)]],
    note: [ring, stem, flag],
    left: nx - 0.02,
  }
}

/** How the people at the tables are lit: their candles along an edge, warmer and fuller in the dream. */
function patron(L: Lights): Light {
  const tone = mixHex('#120F1B', M.velvet, 0.15 * L.rose)
  return { tone, rim: L.warm, rimA: 0.4 + 0.25 * L.house + 0.3 * L.rose, sway: 0.35 + 0.65 * L.rose }
}
/** The staff, on their feet: the same, a little less. */
function staff(L: Lights, a: number): Light {
  const l = patron(L)
  return { ...l, rimA: l.rimA * (0.6 + a * 0.4) }
}

function drawRoom(p: p5, s: ClubRoom, k: number, ink: string, bg: string, weight: number, t: number): void {
  const q = pen(p, k, ink, weight)
  const { X, rect, poly } = q
  const L = lightsAt(t, s.end)
  const fr = frame(p, k)
  const R = ROOM
  const cut = M.deep

  // The street, unless the picture is all inside the room above its floor, where the back wall covers it.
  if (!insideRoom(picture(p, k, t), true)) {
    // The street along the front, and the ground under it, across the frame.
    p.noStroke()
    p.fill(mixHex(bg, M.lacquer, 0.5))
    rect(fr.x0 - 1, R.floor, fr.x1 + 1, Math.max(fr.y1 + 1, R.floor + 2))
    // The pavement: thick enough to read from far off, its kerb catching the streetlight.
    p.fill(M.wall)
    rect(fr.x0 - 1, R.floor, fr.x1 + 1, R.floor + 0.22)
    p.stroke(rgba(M.brass, 0.45))
    p.strokeWeight(weight * 0.6)
    p.line(X(fr.x0 - 1), X(R.floor + 0.22), X(fr.x1 + 1), X(R.floor + 0.22))
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    p.line(X(fr.x0 - 1), X(R.floor), X(fr.x1 + 1), X(R.floor))
    // The road along the front: asphalt, its centre line, the near kerb, and the club's light lying on it.
    {
      const r0 = R.floor + 0.22
      const r1 = R.floor + 2.1
      const mid = (r0 + r1) / 2
      p.noStroke()
      p.fill(mixHex(bg, M.lacquer, 0.32))
      rect(fr.x0 - 1, r0, fr.x1 + 1, r1)
      glow(p, k, (R.wallL0 + R.wallR1) / 2, r0 + 0.15, (R.wallR1 - R.wallL0) * 0.55, M.candle, 0.06 + 0.06 * Math.max(L.house, L.blaze), 1, 0.12)
      glow(p, k, -15.2 + 0.4, r0 + 0.2, 1.6, M.candle, 0.1, 1, 0.3)
      p.fill(rgba(M.brass, 0.22))
      for (let x = Math.floor((fr.x0 - 1) / 1.6) * 1.6; x < fr.x1 + 1; x += 1.6) rect(x, mid - 0.025, x + 0.8, mid + 0.025)
      p.fill(M.wall)
      rect(fr.x0 - 1, r1, fr.x1 + 1, r1 + 0.18)
      p.stroke(rgba(M.brass, 0.3))
      p.strokeWeight(weight * 0.5)
      p.line(X(fr.x0 - 1), X(r1), X(fr.x1 + 1), X(r1))
    }
    // A streetlamp on the pavement, short of the door: sodium, the way the drive comes in.
    {
      const lx = -15.2
      p.stroke(ink)
      p.strokeWeight(weight * 0.7)
      p.line(X(lx), X(R.floor), X(lx), X(-0.35))
      p.line(X(lx), X(-0.35), X(lx + 0.35), X(-0.5))
      solid(p, ink, weight * 0.5, M.lacquer)
      poly([[lx + 0.22, -0.55], [lx + 0.58, -0.55], [lx + 0.52, -0.43], [lx + 0.28, -0.43]])
      // Its light is on the pavement under it and the side street behind, not round the lamp.
      glow(p, k, lx + 0.4, R.floor, 1.5, M.candle, 0.14, 1, 0.3)
      p.noStroke()
      p.fill(M.candle)
      rect(lx + 0.3, -0.45, lx + 0.5, -0.41, 0.01)
    }
    // The neon's blue, lying on the pavement under the arrow and outside the door.
    glow(p, k, R.wallL0 - 0.5, R.floor + 0.03, 0.9, DRIVE_MAT.neon, 0.16, 1.2, 0.1)
  }

  // The room's back wall, lit by the house lights; a dado along its foot with a brass rail.
  // In the dream the walls are warm with its rose; it drains with the dream, and the room is itself again.
  p.noStroke()
  p.fill(mixHex(M.wall, M.rose, 0.3 * L.rose))
  rect(R.wallL1, R.ceil, R.wallR0, R.floor)
  // Above the wainscot the wall is the old brick, its courses seen only up close.
  {
    const ka = smooth(k, 30, 70)
    const bx0 = Math.max(R.wallL1, fr.x0)
    const bx1 = Math.min(R.stageX0 + 0.1, fr.x1)
    const by0 = Math.max(R.ceil, fr.y0)
    const by1 = Math.min(2.0, fr.y1)
    if (ka > 0.01 && bx1 > bx0 && by1 > by0) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const CH = 0.11
      const CW = 0.25
      ctx.save()
      ctx.strokeStyle = rgba(M.lacquer, (0.34 - 0.14 * L.rose) * ka)
      ctx.lineWidth = Math.max(1, 0.009 * k)
      ctx.beginPath()
      for (let i = Math.floor((by0 - R.ceil) / CH); R.ceil + i * CH < by1; i++) {
        const y = R.ceil + i * CH
        ctx.moveTo(X(bx0), X(y))
        ctx.lineTo(X(bx1), X(y))
        const off = (i % 2) * CW * 0.5
        for (let x = Math.floor((bx0 - off) / CW) * CW + off; x < bx1; x += CW) {
          if (x < bx0) continue
          ctx.moveTo(X(x), X(y))
          ctx.lineTo(X(x), X(Math.min(by1, y + CH)))
        }
      }
      ctx.stroke()
      // The courses' top edges catch a little of the room's light.
      ctx.strokeStyle = rgba(L.warm, 0.05 * ka * (0.5 + L.house))
      ctx.beginPath()
      for (let i = Math.floor((by0 - R.ceil) / CH); R.ceil + i * CH < by1; i++) {
        const y = R.ceil + i * CH + 0.012
        ctx.moveTo(X(bx0), X(y))
        ctx.lineTo(X(bx1), X(y))
      }
      ctx.stroke()
      ctx.restore()
    }
  }
  vband(p, k, R.wallL1, 2.0, R.stageX0, R.floor, [[0, rgba(M.deep, 0.7)], [1, rgba(M.deep, 0.9)]])
  p.stroke(rgba(M.brass, 0.5))
  p.strokeWeight(weight * 0.5)
  p.line(X(R.wallL1), X(2.0), X(R.stageX0), X(2.0))
  // Along the wall behind her table and the next, a banquette: a tufted velvet bench, buttoned, under the rail.
  banquette(p, k, BANQUETTE[0], BANQUETTE[1], mixHex(mixHex(M.velvet, M.lacquer, 0.5), M.rose, 0.25 * L.rose), ink, weight, L)
  // The drink rail along it, and what the house has left on it; crowded in the dream.
  {
    const dreamHouse = s.end ? 1 - smooth(t, ROSE_OUT[0], ROSE_OUT[1] - 0.6) : 0
    drinkRail(p, k, t, R.wallL1, R.stageX0, dreamHouse, Math.max(L.house, 0.35 * L.rose), L.warm, ink)
  }
  // The dado is wainscot: tall sunk panels under the rail, the same joinery as the stage's front (none where the
  // banquette stands against it).
  p.noFill()
  p.strokeWeight(weight * 0.4)
  for (let x = R.wallL1 + 0.15; x + 1.0 < R.stageX0 - 0.1; x += 1.18) {
    if (x + 1.0 > BANQUETTE[0] && x < BANQUETTE[1]) continue
    p.stroke(rgba(M.lacquer, 0.5))
    rect(x, 2.14, x + 1.0, R.floor - 0.12, 0.02)
    p.stroke(rgba(M.brass, 0.14))
    p.line(X(x + 0.03), X(2.145), X(x + 0.97), X(2.145))
  }
  // Up close the wainscot is wood: its grain running down each panel, a little warm where the light is on it.
  {
    const ka = smooth(k, 30, 70)
    const gx0 = Math.max(R.wallL1, fr.x0)
    const gx1 = Math.min(R.stageX0, fr.x1)
    if (ka > 0.01 && gx1 > gx0 && fr.y1 > 2.0 && fr.y0 < R.floor) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      ctx.lineWidth = Math.max(1, 0.006 * k)
      for (const [col, a] of [[M.lacquer, 0.26], [M.brass, 0.07]] as const) {
        ctx.strokeStyle = rgba(col, a * ka)
        ctx.beginPath()
        const step = 0.045
        for (let i = Math.floor(gx0 / step); i * step < gx1; i++) {
          const h = hash(i, col === M.lacquer ? 1 : 2, 47)
          if (h < 0.45) continue
          const x = i * step + 0.03 * hash(i, 5, 47)
          if (x > BANQUETTE[0] && x < BANQUETTE[1]) continue
          const y0 = 2.16 + 0.3 * hash(i, 6, 47)
          const y1 = Math.min(R.floor - 0.13, y0 + 0.25 + 0.55 * hash(i, 7, 47))
          ctx.moveTo(X(x), X(y0))
          ctx.quadraticCurveTo(X(x + 0.012 * (h - 0.7)), X((y0 + y1) / 2), X(x), X(y1))
        }
        ctx.stroke()
      }
      ctx.restore()
    }
  }
  vband(p, k, R.wallL1, R.ceil, R.wallR0, R.ceil + 1.6, [[0, rgba(M.deep, 0.75)], [1, rgba(M.deep, 0)]])
  if (s.end) candleShadows(p, s, k, t, L)
  if (L.rose > 0.005) glow(p, k, (R.wallL1 + R.wallR0) / 2, 0.6, 12, M.rose, 0.2 * L.rose, 1.4, 0.75)
  // The greats on the wall, in their frames, lit by the sconces; and the fans turning under the ceiling.
  gallery(p, k, L.house, SCONCES, SCONCE_Y, L.warm)
  fans(p, k, t, ink, mixHex(L.warm, COLD, 0.5))

  // The house lights: brass sconces, each throwing its warm fan up and down the wall.
  for (const x of SCONCES) {
    const on = L.house
    wash(p, k, x, SCONCE_Y - 0.14, 1.25, 0.5, L.warm, 0.3 * on, -1)
    wash(p, k, x, SCONCE_Y + 0.04, 0.8, 0.32, L.warm, 0.22 * on, 1)
    solid(p, ink, weight * 0.45, M.brass)
    rect(x - 0.03, SCONCE_Y + 0.02, x + 0.03, SCONCE_Y + 0.2, 0.01)
    solid(p, ink, weight * 0.5, mixHex(M.brass, L.warm, 0.3 + 0.5 * on))
    poly([[x - 0.14, SCONCE_Y - 0.14], [x + 0.14, SCONCE_Y - 0.14], [x + 0.09, SCONCE_Y + 0.04], [x - 0.09, SCONCE_Y + 0.04]])
  }

  // The bar along the back wall: shelves of bottles behind, the counter, its stools.
  {
    const { x0, x1, top } = BAR
    for (const [j, sy] of [0.55, 1.3].entries()) {
      solid(p, ink, weight * 0.45, mixHex(M.brass, M.deep, 0.5))
      rect(x0 + 0.05, sy, x1 - 0.1, sy + 0.05)
      let bx = x0 + 0.18
      let n = 0
      while (bx < x1 - 0.3 && n < 12) {
        const h = 0.22 + 0.16 * hash(n, j, 3)
        const bw = 0.07 + 0.04 * hash(n, j, 4)
        const glass = [M.brass, M.velvet, M.ivory, M.candle][Math.floor(hash(n, j, 5) * 4)]
        solid(p, ink, weight * 0.3, rgba(glass, 0.55 + 0.25 * L.house))
        p.beginShape()
        p.vertex(X(bx - bw / 2), X(sy))
        p.vertex(X(bx - bw / 2), X(sy - h * 0.62))
        p.vertex(X(bx - 0.018), X(sy - h * 0.8))
        p.vertex(X(bx - 0.018), X(sy - h))
        p.vertex(X(bx + 0.018), X(sy - h))
        p.vertex(X(bx + 0.018), X(sy - h * 0.8))
        p.vertex(X(bx + bw / 2), X(sy - h * 0.62))
        p.vertex(X(bx + bw / 2), X(sy))
        p.endShape(p.CLOSE)
        bx += bw + 0.06 + 0.1 * hash(n, j, 6)
        n++
      }
    }
    glow(p, k, (x0 + x1) / 2, 1.1, 1.6, L.warm, 0.14 * L.house, 1.3, 0.8)
    // The bartender, behind the counter: along it and back, polishing a glass, turned to the room.
    {
      const b = walker(s.end ? TENDER_END : TENDER_START, t)
      if (b) {
        const ctx = p.drawingContext as CanvasRenderingContext2D
        ctx.save()
        // (He stands on the duckboard behind the bar, a step up.)
        stander(ctx, k, { x: b.x, feet: R.floor - 0.16, h: 1.05, face: b.face, stride: b.stride, arms: Number.isFinite(b.stride) ? 'down' : 'polish', t }, staff(L, 0.6), 'shirt', top)
        ctx.restore()
      }
    }
    solid(p, ink, weight * 0.8, mixHex(M.brass, M.deep, 0.62))
    rect(x0, top, x1, R.floor)
    solid(p, ink, weight * 0.7, M.brass)
    rect(x0 - 0.06, top - 0.05, x1 + 0.06, top + 0.01, 0.015)
    p.stroke(rgba(M.brass, 0.6))
    p.strokeWeight(weight * 0.4)
    p.line(X(x0 + 0.1), X(R.floor - 0.12), X(x1 - 0.1), X(R.floor - 0.12))
    for (const sx of BAR.stools) {
      p.stroke(ink)
      p.strokeWeight(weight * 0.55)
      p.line(X(sx), X(2.55), X(sx), X(R.floor - 0.02))
      p.line(X(sx - 0.08), X(2.86), X(sx + 0.08), X(2.86))
      solid(p, ink, weight * 0.45, mixHex(M.brass, M.deep, 0.4))
      rect(sx - 0.12, R.floor - 0.03, sx + 0.12, R.floor, 0.015)
      solid(p, ink, weight * 0.5, M.velvet)
      rect(sx - 0.13, 2.5, sx + 0.13, 2.56, 0.03)
    }
  }

  // The stage: the curtain behind it, its pelmet, the light on it.
  const sx0 = R.stageX0
  const cx0 = sx0 + 0.15
  const cx1 = R.wallR0
  p.noStroke()
  p.fill(M.velvet)
  rect(cx0, R.ceil, cx1, R.stage)
  {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const folds = 22
    const fw = (cx1 - cx0) / folds
    for (let i = 0; i < folds; i++) {
      const x = cx0 + (i + 0.5) * fw
      // The velvet stirs in the fans' air: its folds' light drifts a little, slowly.
      const dx = curtainStir(t, i)
      const g = ctx.createLinearGradient(X(x - fw / 2 + dx), 0, X(x + fw / 2 + dx), 0)
      g.addColorStop(0, rgba(M.lacquer, 0.34))
      g.addColorStop(0.45, rgba(M.lacquer, 0))
      g.addColorStop(0.62, rgba(M.rose, 0.07))
      g.addColorStop(1, rgba(M.lacquer, 0.3))
      ctx.fillStyle = g
      ctx.fillRect(X(x - fw / 2), X(R.ceil), X(fw), X(R.stage - R.ceil))
    }
  }
  // Up close, the velvet's pile: a dark crease down each fold's valley and a fine light along its crown, moving as it stirs.
  {
    const ka = smooth(k, 30, 70)
    if (ka > 0.01) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const folds = 22
      const fw = (cx1 - cx0) / folds
      const y0 = Math.max(R.ceil, fr.y0)
      const y1 = Math.min(R.stage, fr.y1)
      if (y1 > y0) {
        ctx.save()
        ctx.lineWidth = Math.max(1, 0.012 * k)
        for (const [off, col, a] of [[0, M.lacquer, 0.26], [0.6, M.rose, 0.08]] as const) {
          ctx.strokeStyle = rgba(col, a * ka)
          ctx.beginPath()
          for (let i = 0; i <= folds; i++) {
            const x = cx0 + (i + off - 0.5) * fw + curtainStir(t, i)
            if (x < fr.x0 - 0.1 || x > fr.x1 + 0.1 || x < cx0 || x > cx1) continue
            ctx.moveTo(X(x), X(y0))
            ctx.quadraticCurveTo(X(x + 0.04 * Math.sin(t * 0.5 + i)), X((y0 + y1) / 2), X(x + 0.01), X(y1))
          }
          ctx.stroke()
        }
        ctx.restore()
      }
    }
  }
  vband(p, k, cx0, R.ceil, cx1, R.ceil + 3, [[0, rgba(M.lacquer, 0.6)], [1, rgba(M.lacquer, 0)]])
  // While the house lights are up their warmth is on the velvet too; the stage light's spill behind the piano stays.
  glow(p, k, 3.6, -1.2, 9.5, L.warm, 0.2 * L.house, 1.25, 0.8)
  // The stage light's spill on the velvet behind the piano, and the band's corner when it blazes.
  glow(p, k, 2.7, -0.4, 4.2, L.stage, 0.3 * L.stageA, 1.05, 1)
  glow(p, k, 8.4, 1.2, 3.2, M.candle, 0.16 * L.band + 0.2 * L.blaze, 1.2, 0.9)
  glow(p, k, 4.8, 0.4, 7.5, mixHex(M.candle, COLD, 0.4), 0.28 * L.blaze, 1.35, 0.8)
  // The piano's shadow on the velvet behind it, thrown up and back by the light on it from the house: it stands in
  // front of the curtain, and the light says so. Darkest where the light on the velvet is. The house's light is broad,
  // so the shadow's edge is soft: the outline laid a few times round a small circle, a penumbra a quarter of a cell wide,
  // and not a hard-edged panel on the cloth in the close shots.
  {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(X(2.9), X(-0.9), 0, X(2.9), X(-0.9), X(5.4))
    const a = 0.34 * L.stageA * (1 - 0.5 * L.blaze)
    g.addColorStop(0, rgba(M.lacquer, a))
    g.addColorStop(0.6, rgba(M.lacquer, a * 0.7))
    g.addColorStop(1, rgba(M.lacquer, 0))
    ctx.save()
    ctx.fillStyle = g
    // A share of the shadow each time, so the passes together come to its whole depth inside the edge.
    ctx.globalAlpha = 1.1 / PENUMBRA.length
    for (const [ox, oy] of PENUMBRA) {
      ctx.beginPath()
      for (const shape of PIANO_SHADOW) {
        for (const [i, [x, y]] of shape.entries()) {
          const sx = X(x * 1.05 + 0.45 + ox)
          const sy = X(y * 1.05 - 0.55 + oy)
          if (i === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.closePath()
      }
      ctx.fill()
    }
    ctx.restore()
  }
  // The pelmet, with its gold fringe.
  solid(p, ink, weight * 0.7, mixHex(M.velvet, M.lacquer, 0.35))
  const swags = 6
  const sw = (cx1 - cx0 + 0.25) / swags
  p.beginShape()
  p.vertex(X(cx0 - 0.25), X(R.ceil))
  p.vertex(X(cx1), X(R.ceil))
  p.vertex(X(cx1), X(R.ceil + 0.55))
  for (let i = swags; i > 0; i--) {
    const a = cx0 - 0.25 + i * sw
    p.quadraticVertex(X(a - sw / 2), X(R.ceil + 0.85), X(a - sw), X(R.ceil + 0.55))
  }
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(rgba(M.brass, 0.85))
  p.strokeWeight(weight * 0.55)
  p.beginShape()
  p.vertex(X(cx1), X(R.ceil + 0.58))
  for (let i = swags; i > 0; i--) {
    const a = cx0 - 0.25 + i * sw
    p.quadraticVertex(X(a - sw / 2), X(R.ceil + 0.88), X(a - sw), X(R.ceil + 0.58))
  }
  p.endShape()

  // The pipe of stage lights, hung from the ceiling; each fixture turned to where it throws.
  p.stroke(ink)
  p.strokeWeight(weight * 0.55)
  p.line(X(-1.3), X(PIPE), X(10.5), X(PIPE))
  for (const hx of [-0.6, 9.8]) p.line(X(hx), X(R.ceil), X(hx), X(PIPE))
  for (const [i, sp] of SPOTS.entries()) {
    const on = i === 0 ? L.stageA : L.blaze
    const col = i === 0 ? L.stage : mixHex(M.candle, COLD, 0.3 + 0.2 * (i % 2))
    const from: Pt = [sp.x, PIPE + 0.22]
    const a = Math.atan2(sp.to[1] - from[1], sp.to[0] - from[0])
    // Its light is where it falls (a pool on the boards), not a shaft in the air.
    if (on > 0.01) glow(p, k, sp.to[0], sp.to[1] + 0.3, i === 0 ? 2.8 : 1.6, col, (i === 0 ? 0.12 : 0.16) * on, 1.3, 0.35)
    p.push()
    p.translate(X(from[0]), X(from[1]))
    p.rotate(a - Math.PI / 2)
    solid(p, ink, weight * 0.5, M.lacquer)
    rect(-0.08, -0.16, 0.08, 0.1, 0.03)
    p.noStroke()
    p.fill(on > 0.01 ? mixHex(M.lacquer, col, 0.3 + 0.7 * on) : M.wall)
    rect(-0.065, 0.06, 0.065, 0.1, 0.01)
    p.pop()
    p.stroke(ink)
    p.strokeWeight(weight * 0.4)
    p.line(X(sp.x), X(PIPE), X(sp.x), X(from[1] - 0.12))
  }

  // The house spot over the floor, on its own drop from the ceiling, turned on her table; its lens lit while it is on.
  {
    const [hx, hy] = HOUSE_SPOT
    const on = onHer(t, s.end)
    p.stroke(ink)
    p.strokeWeight(weight * 0.45)
    p.line(X(hx), X(R.ceil), X(hx), X(hy - 0.12))
    p.push()
    p.translate(X(hx), X(hy))
    p.rotate(Math.atan2(HOUSE_SPOT_TO[1] - hy, HOUSE_SPOT_TO[0] - hx) - Math.PI / 2)
    solid(p, ink, weight * 0.5, M.lacquer)
    rect(-0.09, -0.2, 0.09, 0.12, 0.03)
    p.noStroke()
    p.fill(on > 0.01 ? mixHex(M.lacquer, M.ivory, 0.25 + 0.6 * on) : M.wall)
    rect(-0.075, 0.08, 0.075, 0.12, 0.01)
    p.pop()
  }

  // The stage itself: its boards, its front, the brass nosing.
  solid(p, ink, weight * 0.8, mixHex(M.brass, M.deep, 0.72))
  rect(sx0, R.stage, R.wallR0, R.floor)
  vband(p, k, sx0, R.stage, R.wallR0, R.floor, [[0, rgba(M.lacquer, 0)], [1, rgba(M.lacquer, 0.5)]])
  p.stroke(rgba(M.brass, 0.85))
  p.strokeWeight(weight * 0.55)
  p.line(X(sx0 + 0.02), X(R.stage + 0.02), X(R.wallR0), X(R.stage + 0.02))
  // Its front is panelled, so it reads as joinery and not a slab beside her table: inset frames a shade darker, each
  // with a fine brass bead along its top where the light catches it.
  for (let x = sx0 + 0.12; x + 0.6 < R.wallR0 - 0.08; x += 0.74) {
    p.noStroke()
    p.fill(rgba(M.lacquer, 0.22))
    rect(x, R.stage + 0.11, x + 0.6, R.floor - 0.09, 0.015)
    p.noFill()
    p.stroke(rgba(M.lacquer, 0.55))
    p.strokeWeight(weight * 0.4)
    rect(x, R.stage + 0.11, x + 0.6, R.floor - 0.09, 0.015)
    p.stroke(rgba(M.brass, 0.32))
    p.strokeWeight(weight * 0.35)
    p.line(X(x + 0.02), X(R.stage + 0.115), X(x + 0.58), X(R.stage + 0.115))
  }
  glow(p, k, 2.7, R.stage, 3.0, L.stage, 0.22 * L.stageA, 1.2, 0.14)

  // The band's things, idle: the bass on its side, the kit, a stool, the stands with their clip lamps.
  drawBand(q, L, t, s.end)

  // The dream's second waiter, crossing behind the tables (and behind her table, as they lean in).
  if (s.end) {
    const there = 1 - smooth(t, ROSE_OUT[0], ROSE_OUT[1] - 0.6)
    const w = WAITERS[1]
    const at = there < 0.01 ? null : walker(w.end, t)
    if (at) {
      const ctx = p.drawingContext as CanvasRenderingContext2D
      ctx.save()
      ctx.globalAlpha = there
      const going = Number.isFinite(at.stride)
      stander(ctx, k, { x: at.x, feet: R.floor, h: 1.05, face: at.face, stride: at.stride, arms: going || at.x > -2 ? 'tray' : 'down', t }, staff(L, 0.5), 'apron')
      ctx.restore()
    }
  }

  // The tables on the floor, their chairs and candles; Mia's table's top and lamp are drawn over the balls.
  for (const tb of TABLES) candleLight(q, tb.x, t, tb.x)
  candleLight(q, TABLE.x, t, 7, 1.15)
  for (const tb of TABLES) {
    for (const [dx, face] of tb.chairs) chair(q, tb.x + dx, face)
    table(q, tb.x)
    candle(q, tb.x, t, tb.x)
  }
  stool(q, MIA_SEAT[0])
  stool(q, SIDE_SEAT[0])
  table(q, TABLE.x, 'base', 0.19)

  // The shell, cut: the floor slab, the walls, the ceiling and the roof with its parapet.
  solid(p, ink, weight, cut)
  rect(R.wallL0, R.floor, R.wallR1, R.floor + 0.45)
  rect(R.wallL0, R.roof, R.wallL1, R.doorTop)
  rect(R.wallR0, R.roof, R.wallR1, R.floor)
  rect(R.wallL0 - 0.1, R.roof, R.wallR1 + 0.1, R.ceil)
  rect(R.wallL0 - 0.18, R.roof - 0.16, R.wallR1 + 0.18, R.roof + 0.02, 0.03)
  p.stroke(rgba(M.brass, 0.55))
  p.strokeWeight(weight * 0.7)
  p.line(X(R.wallL0 - 0.12), X(R.roof - 0.02), X(R.wallR1 + 0.12), X(R.roof - 0.02))
  // The doorway through the wall, and the door in it: shut, or swung out onto the street on its closer. Open, it shows
  // the side street's night (the block draws it, behind the wall), the reveal dark at its head, and the neon's blue
  // lying on the threshold.
  const open = doorAt(t, s.end)
  if (open <= 0.01) {
    p.noStroke()
    p.fill(M.lacquer)
    rect(R.wallL0, R.doorTop, R.wallL1, R.floor)
  } else {
    vband(p, k, R.wallL0 + 0.02, R.doorTop, R.wallL1 - 0.02, R.doorTop + 0.45, [[0, rgba(M.lacquer, 0.85)], [1, rgba(M.lacquer, 0)]])
    glow(p, k, (R.wallL0 + R.wallL1) / 2, R.floor - 0.005, 0.5, DRIVE_MAT.neon, 0.3 * open, 1.3, 0.1)
  }
  const dw = (R.wallL1 - R.wallL0) * Math.cos(open * Math.PI / 2)
  if (dw > 0.01) {
    solid(p, ink, weight * 0.6, M.velvet)
    rect(R.wallL0, R.doorTop + 0.02, R.wallL0 + dw, R.floor - 0.01)
    p.noStroke()
    p.fill(rgba(M.candle, 0.35 + 0.4 * L.house))
    rect(R.wallL0 + dw * 0.35, R.doorTop + 0.18, R.wallL0 + dw * 0.65, R.doorTop + 0.55, 0.01)
    p.fill(M.brass)
    rect(R.wallL0 + dw * 0.8 - 0.02, 2.4, R.wallL0 + dw * 0.8 + 0.02, 2.5, 0.01)
  }
  if (open > 0.01) {
    solid(p, ink, weight * 0.5, mixHex(M.velvet, M.lacquer, 0.4))
    rect(R.wallL0 - 0.05, R.doorTop + 0.02, R.wallL0 + 0.01, R.floor - 0.01)
  }

  // Outside: the awning over the door, and the neon arrow over it on its bracket.
  {
    const a0 = R.wallL0
    const a1 = R.wallL0 - 0.95
    solid(p, ink, weight * 0.7, M.velvet)
    poly([[a0, R.doorTop - 0.22], [a1, R.doorTop - 0.05], [a1, R.doorTop + 0.07], [a0, R.doorTop + 0.02]])
    p.stroke(ink)
    p.strokeWeight(weight * 0.4)
    p.line(X(a1 + 0.05), X(R.doorTop + 0.07), X(a0), X(R.doorTop + 0.35))
    const tipX = R.wallL0 - 0.55
    const tipY = R.doorTop - 0.42
    const { tube, head, note, left } = neonArrow(tipX, tipY)
    p.stroke(ink)
    p.strokeWeight(weight * 0.55)
    p.line(X(a0), X(tube[0][1] - 0.18), X(left), X(tube[0][1] - 0.18))
    p.line(X(note[1][1][0]), X(tube[0][1] - 0.18), X(note[1][1][0]), X(note[1][1][1]))
    p.line(X(tube[0][0] + 0.1), X(tube[0][1] - 0.18), X(tube[0][0] + 0.1), X(tube[0][1] - 0.04))
    p.line(X(a0 - 0.35), X(tube[0][1] - 0.18), X(a0 - 0.35), X(tube[4][1] - 0.02))
    // (The tube is its own light: no halo round it. Its blue is on the threshold when the door is open.)
    for (const [col, w] of [[rgba(DRIVE_MAT.neon, 0.9), 0.085], [DRIVE_MAT.neonCore, 0.03]] as const) {
      p.stroke(col)
      p.strokeWeight(X(w))
      p.noFill()
      p.beginShape()
      for (const [x, y] of tube) p.vertex(X(x), X(y))
      p.endShape()
      p.beginShape()
      for (const [x, y] of head) p.vertex(X(x), X(y))
      p.endShape()
      for (const line of note) {
        p.beginShape()
        for (const [x, y] of line) p.vertex(X(x), X(y))
        p.endShape()
      }
    }
  }
}

/**
 * Her table's candle is at their heads' height, between them: it throws the two of them on the wall behind, bigger,
 * one each side, and as they lean in to each other their shadows lean in too. The flame trembles, and so do they.
 * (At the start it is drawn over the dark the house goes to, where only her pool lights the wall.)
 */
function candleShadows(p: p5, s: ClubRoom, k: number, t: number, L: Lights): void {
  const X = (v: number) => v * k
  const R = ROOM
  const who = (s.end ? AT_HER_TABLE.end : AT_HER_TABLE.start)?.(t) ?? []
  const fx = TABLE.x + 0.004 * Math.sin(t * 11 + 7)
  const fy = TABLE.top - 0.06
  const flick = flicker(t, 7)
  const dark = (0.34 + 0.24 * (1 - L.house)) * flick
  const ctx = p.drawingContext as CanvasRenderingContext2D
  let clipped = false
  for (const [bx, by] of who) {
    const dx = bx - fx
    const dy = by - fy
    if (Math.hypot(dx, dy) > 0.62 || by > R.floor - 0.2) continue
    if (!clipped) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(X(R.wallL1), X(R.ceil), X(R.stageX0 - R.wallL1), X(R.floor - R.ceil))
      ctx.clip()
      clipped = true
    }
    const m = 3.0 * (1 + 0.04 * (flick - 0.92))
    const cx = fx + dx * m
    const cy = fy + dy * m - 0.04
    const r = 0.13 * m
    const g = ctx.createRadialGradient(X(cx), X(cy), X(r * 0.62), X(cx), X(cy), X(r * 1.1))
    g.addColorStop(0, rgba(M.lacquer, dark))
    g.addColorStop(1, rgba(M.lacquer, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(X(cx), X(cy), X(r * 1.1), 0, Math.PI * 2)
    ctx.fill()
  }
  if (clipped) ctx.restore()
}

/**
 * The people, drawn over the room's dark (the opening's house going down round the piano): each table its own island
 * of candlelight, its candle and the edges of the faces round it, the way a club looks while someone plays.
 */
function drawPeople(p: p5, s: ClubRoom, k: number, ink: string, weight: number, t: number): void {
  const q = pen(p, k, ink, weight)
  const L = lightsAt(t, s.end)
  const R = ROOM
  if (!s.end && t < 40 && L.house < 0.99) {
    candleLight(q, TABLE.x, t, 7, 1.15 * (1 - L.house))
    for (const tb of TABLES) {
      candleLight(q, tb.x, t, tb.x, 1 - L.house)
      candle(q, tb.x, t, tb.x)
    }
  }
  if (!s.end) candleShadows(p, s, k, t, L)
  // The people. The late-night few are there in both rooms; in the dream's last room everyone else is there too,
  // someone on every chair and at the bar and a second waiter with a tray, and as the dream drains they go.
  {
    const there = s.end ? 1 - smooth(t, ROSE_OUT[0], ROSE_OUT[1] - 0.6) : 0
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    const lit = patron(L)
    for (const st of SITTERS) {
      const a = st.real === 'both' || (st.real === 'start' && !s.end) ? 1 : there
      if (a < 0.01) continue
      ctx.globalAlpha = a
      sitter(ctx, k, st, t, lit, st.bar ? BAR.top : TABLE.top)
    }
    for (const w of WAITERS) {
      // (The dream's second waiter walks behind the tables, drawn with the room.)
      if (!w.real) continue
      const a = 1
      const at = a < 0.01 ? null : walker(s.end ? w.end : w.start, t)
      if (!at) continue
      ctx.globalAlpha = a
      const going = Number.isFinite(at.stride)
      const arms = going ? (at.face > 0 && at.x < -4.5 ? 'tray' : 'down') : at.x > -9 ? 'wipe' : 'down'
      stander(ctx, k, { x: at.x, feet: R.floor, h: 1.05, face: at.face, stride: at.stride, arms, t }, staff(L, 0.5), 'apron')
    }
    ctx.restore()
    // The man at the bar's cigarette, in the ashtray by his glass; in the dream, one at the far table too.
    smoke(p, k, BAR.stools[0] - 0.34, BAR.top - 0.03, t, 0.9, 1)
    if (there > 0.01) smoke(p, k, -8.1, TABLE.top - 0.03, t, there, 2)
  }
}

/** The band's instruments, idle on the stage to the piano's right, and the clip lamps that come up for them. */
function drawBand(q: Pen, L: Lights, t: number, end: boolean): void {
  const { p, X, rect, poly, ink, w } = q
  const st = ROOM.stage
  const wood = mixHex(M.brass, M.velvet, 0.35)
  // The band: on its break at the start, the instruments idle; in the dream's last room playing soft under the piano
  // that plays itself; and at the end back on the stand in the dark after she has gone, playing from The End's band.
  const dream = end && t >= DREAM_BAND[0] && t < DREAM_BAND[1] ? L.rose : 0
  const real = end && t >= REAL_BAND ? 1 : 0
  const there = Math.max(dream, real)
  const lamps = Math.max(L.band, 0.8 * dream)
  if (there > 0.01) bandPlayers(p, q.k, t, ink, there, lamps, L.blaze, L.rose, real ? smooth(t, BAND - 0.1, BAND + 0.2) : 0.45, real > 0)
  // The stand-up bass, lying on its side: the body's two bouts and waist, the neck, the scroll, the strings.
  if (there <= 0.01) {
    const bx = 6.95
    const by = st - 0.25
    solid(p, ink, w * 0.6, wood)
    p.beginShape()
    p.vertex(X(bx - 0.62), X(by))
    p.bezierVertex(X(bx - 0.62), X(by - 0.27), X(bx - 0.3), X(by - 0.3), X(bx - 0.12), X(by - 0.17))
    p.bezierVertex(X(bx - 0.02), X(by - 0.13), X(bx + 0.05), X(by - 0.24), X(bx + 0.22), X(by - 0.21))
    p.bezierVertex(X(bx + 0.36), X(by - 0.19), X(bx + 0.4), X(by - 0.08), X(bx + 0.4), X(by))
    p.bezierVertex(X(bx + 0.4), X(by + 0.08), X(bx + 0.36), X(by + 0.19), X(bx + 0.22), X(by + 0.21))
    p.bezierVertex(X(bx + 0.05), X(by + 0.24), X(bx - 0.02), X(by + 0.13), X(bx - 0.12), X(by + 0.17))
    p.bezierVertex(X(bx - 0.3), X(by + 0.3), X(bx - 0.62), X(by + 0.27), X(bx - 0.62), X(by))
    p.endShape(p.CLOSE)
    solid(p, ink, w * 0.5, M.lacquer)
    rect(bx + 0.3, by - 0.035, bx + 1.02, by + 0.035, 0.015)
    rect(bx + 1.0, by - 0.06, bx + 1.13, by + 0.06, 0.05)
    rect(bx - 0.55, by - 0.05, bx - 0.4, by + 0.05, 0.02)
    p.stroke(rgba(M.ivory, 0.55))
    p.strokeWeight(w * 0.25)
    for (const d of [-0.02, 0.02]) p.line(X(bx - 0.48), X(by + d), X(bx + 1.0), X(by + d * 0.6))
    solid(p, ink, w * 0.35, M.brass)
    rect(bx - 0.2, by - 0.08, bx - 0.16, by + 0.08)
  }
  // The kit: a bass drum face on, a floor tom, a snare on its stand, the hi-hat, the ride.
  {
    const kx = 8.75
    const cym = mixHex(M.brass, M.candle, 0.35 * L.blaze)
    p.stroke(ink)
    p.strokeWeight(w * 0.45)
    p.line(X(8.05), X(st), X(8.05), X(1.72))
    p.line(X(9.55), X(st), X(9.55), X(1.35))
    p.line(X(8.25), X(st), X(8.25), X(2.12))
    solid(p, ink, w * 0.6, M.velvet)
    p.circle(X(kx), X(st - 0.3), X(0.6))
    solid(p, ink, w * 0.4, rgba(M.ivory, 0.18 + 0.25 * L.blaze))
    p.circle(X(kx), X(st - 0.3), X(0.46))
    solid(p, ink, w * 0.5, M.velvet)
    rect(9.05, 2.02, 9.4, st, 0.02)
    solid(p, ink, w * 0.5, rgba(M.ivory, 0.7))
    rect(8.14, 2.02, 8.38, 2.14, 0.02)
    solid(p, ink, w * 0.5, M.velvet)
    rect(kx - 0.14, 1.93, kx + 0.14, 2.03, 0.02)
    solid(p, ink, w * 0.45, cym)
    poly([[7.85, 1.7], [8.25, 1.7], [8.21, 1.73], [7.89, 1.73]])
    poly([[7.87, 1.76], [8.23, 1.76], [8.19, 1.79], [7.91, 1.79]])
    p.push()
    p.translate(X(9.55), X(1.34))
    p.rotate(-0.16)
    poly([[-0.3, 0], [0.3, 0], [0.26, 0.035], [-0.26, 0.035]])
    p.pop()
  }
  // The stands with their clip lamps: dark until the band's lamps come up.
  for (const x of STANDS) {
    p.stroke(ink)
    p.strokeWeight(w * 0.45)
    p.line(X(x), X(st), X(x), X(1.78))
    p.line(X(x - 0.12), X(st), X(x), X(st - 0.2))
    p.line(X(x + 0.12), X(st), X(x), X(st - 0.2))
    const on = lamps
    // The lamp lights the music on the desk, and a pool on the boards under the stand.
    solid(p, ink, w * 0.45, mixHex(M.lacquer, M.ivory, 0.55 * on))
    p.push()
    p.translate(X(x), X(1.72))
    p.rotate(-0.18)
    rect(-0.17, -0.2, 0.17, 0.02, 0.015)
    p.pop()
    if (on > 0.01) glow(p, q.k, x, st, 0.75, M.candle, 0.22 * on, 1.4, 0.22)
    solid(p, ink, w * 0.4, mixHex(M.brass, M.candle, on))
    poly([[x - 0.09, 1.5], [x + 0.05, 1.46], [x + 0.08, 1.54], [x - 0.07, 1.57]])
  }
  // A stool at the right.
  p.stroke(ink)
  p.strokeWeight(w * 0.5)
  p.line(X(10.45), X(2.12), X(10.35), X(st))
  p.line(X(10.45), X(2.12), X(10.58), X(st))
  solid(p, ink, w * 0.45, mixHex(M.brass, M.deep, 0.4))
  rect(10.3, 2.08, 10.62, 2.14, 0.02)
}

/** What stands in front of the balls: Mia's table's top and its lamp, whose light is on their faces. */
function drawOver(p: p5, k: number, ink: string, weight: number, t: number): void {
  const q = pen(p, k, ink, weight)
  table(q, TABLE.x, 'top', 0.19)
  candle(q, TABLE.x, t, 7)
}

/** The house spot's pool at her table: an ellipse of its light on the wall behind them, the table and the floor. */
const POOL = { x: TABLE.x, y: TABLE.top - 0.1, rx: 0.92, ry: 0.78, lip: 0.28 }

/**
 * The dark the room goes to, with the house spot's pool at her table cut out of it: the dark is laid over everything
 * but the pool (`dark` at most, from `darkAt`), and inside the pool it lifts to `lift` of itself at the middle, with a
 * soft lip at its edge, the way a spot's pool has one. What is in the pool is lit by the dark not being there; a faint
 * warmth lies on what it falls on.
 */
function darkWithPool(ctx: CanvasRenderingContext2D, k: number, f: { x0: number; y0: number; x1: number; y1: number }, fill: CanvasGradient | string, dark: number, her: number, warm: string, tint: number): void {
  const { x, y, rx, ry, lip } = POOL
  const sy = ry / rx
  const ellipse = (r: number) => {
    ctx.moveTo((x + r) * k, y * k)
    ctx.ellipse(x * k, y * k, r * k, r * sy * k, 0, 0, Math.PI * 2)
  }
  ctx.save()
  if (her > 0.01) {
    ctx.beginPath()
    ctx.rect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
    ellipse(rx)
    ctx.clip('evenodd')
  }
  ctx.fillStyle = fill
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  ctx.restore()
  if (her <= 0.01) return
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(1, sy)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
  const inner = dark * (1 - her)
  g.addColorStop(0, rgba(M.lacquer, inner))
  g.addColorStop(Math.max(0, 1 - lip / rx), rgba(M.lacquer, inner))
  g.addColorStop(1, rgba(M.lacquer, dark))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, rx * k, 0, Math.PI * 2)
  ctx.fill()
  if (tint > 0.004) {
    const w = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * k)
    w.addColorStop(0, rgba(warm, tint * her))
    w.addColorStop(Math.max(0, 1 - lip / rx), rgba(warm, tint * her * 0.85))
    w.addColorStop(1, rgba(warm, 0))
    ctx.fillStyle = w
    ctx.beginPath()
    ctx.arc(0, 0, rx * k, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/**
 * The follow-spot, at the start: as the house lights go down the dark closes round the piano (which is drawn over the
 * room, so it stays in its light), and while the camera is with her the house spot's pool finds Mia at her table, the
 * way the film finds her face in the dark. Gone by the time the room turns into Lipton's.
 */
function drawSpot(p: p5, k: number, t: number): void {
  const L = lightsAt(t, false)
  const her = onHer(t, false)
  // While the camera is in her corner the dark there is a little less deep: the candles and her lamp are enough to see by.
  const dark = 0.78 * (1 - L.house) * (1 - 0.3 * her)
  if (dark < 0.01) return
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cx = PIANO.x0 + 12 * PIANO.keyW
  const cy = -0.6
  const g = ctx.createRadialGradient(cx * k, cy * k, 1.4 * k, cx * k, cy * k, 4.4 * k)
  g.addColorStop(0, rgba(M.lacquer, 0))
  g.addColorStop(1, rgba(M.lacquer, dark))
  darkWithPool(ctx, k, f, g, dark, her, mixHex(M.candle, M.ivory, 0.5), 0.07)
}

/**
 * The dream's kiss, at the end: as they lean in over her table the room goes down round them to the same house spot's
 * pool of its rose light on the two of them, the way it found her there at the start; it lets them go as he leaves her.
 */
function drawPool(p: p5, k: number, t: number): void {
  const u = smooth(t, LEAN - 1.6, LEAN + 0.6) * (1 - smooth(t, LEAVE, LEAVE + 0.9))
  if (u < 0.01) return
  const L = lightsAt(t, true)
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dark = 0.62 * u
  darkWithPool(ctx, k, f, rgba(M.lacquer, dark), dark, Math.min(1, u * 1.2), mixHex(L.warm, M.ivory, 0.25), 0.1)
}

export const clubRoom = scenery<ClubRoom>({
  name: 'club-room',
  draw: (p, s, c) => {
    drawRoom(p, s, c.k, c.ink, c.bg, c.weight, c.t)
    if (!s.end && c.t < 40) drawSpot(p, c.k, c.t)
    drawPeople(p, s, c.k, c.ink, c.weight, c.t)
    if (s.end && c.t > LEAN - 1.6 && c.t < LEAVE + 0.9) drawPool(p, c.k, c.t)
  },
  over: (p, _s, c) => drawOver(p, c.k, c.ink, c.weight, c.t),
})

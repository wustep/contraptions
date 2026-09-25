import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex, type Pt } from '../../../../../parts'
import { beam, frame, glow, hash, rgba, scenery, smooth } from '../kit'
import { DRIVE_MAT, SEBS_MAT } from '../worlds'
import { PIANO } from './geometry'

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

/** How far up the house lights are at show time `t` (0..1). */
export const house = (t: number, end: boolean): number => lightsAt(t, end).house

/* ------------------------------------------------------------------ the furniture */

/** The other tables: where, and their chairs (offset from the table, and which way each faces: 1 is to the stage). */
const TABLES: { x: number; chairs: [number, 1 | -1][] }[] = [
  { x: -4.3, chairs: [[-0.33, 1], [0.33, -1]] },
  { x: -6.25, chairs: [[-0.34, 1], [0.47, -1]] },
  { x: -8.25, chairs: [[0.34, -1]] },
]
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

/** A candle lamp on a table: a small glass, its flame, the warm pool it throws. */
function candle(q: Pen, x: number, t: number, seed: number, strength = 1): void {
  const { p } = q
  const y = TABLE.top
  const flick = 0.85 + 0.15 * Math.sin(t * 7.3 + seed * 2.1) * Math.sin(t * 3.1 + seed)
  glow(p, q.k, x, y - 0.06, 0.7, M.candle, 0.2 * flick * strength, 1.25, 0.8)
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

/** The neon arrow's tube, as points: the level tail, the bend, the drop; and its chevron's two strokes. */
export function neonArrow(tipX: number, tipY: number): { tube: Pt[]; head: [Pt, Pt, Pt] } {
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
  return { tube, head: [[tipX - s * Math.sin(a), tipY - s * Math.cos(a)], [tipX, tipY], [tipX + s * Math.sin(a), tipY - s * Math.cos(a)]] }
}

function drawRoom(p: p5, s: ClubRoom, k: number, ink: string, bg: string, weight: number, t: number): void {
  const q = pen(p, k, ink, weight)
  const { X, rect, poly } = q
  const L = lightsAt(t, s.end)
  const fr = frame(p, k)
  const R = ROOM
  const cut = M.deep

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
  // A streetlamp on the pavement, short of the door: sodium, the way the drive comes in.
  {
    const lx = -15.2
    p.stroke(ink)
    p.strokeWeight(weight * 0.7)
    p.line(X(lx), X(R.floor), X(lx), X(-0.35))
    p.line(X(lx), X(-0.35), X(lx + 0.35), X(-0.5))
    solid(p, ink, weight * 0.5, M.lacquer)
    poly([[lx + 0.22, -0.55], [lx + 0.58, -0.55], [lx + 0.52, -0.43], [lx + 0.28, -0.43]])
    glow(p, k, lx + 0.4, -0.3, 2.4, M.candle, 0.16, 1, 1.35)
    p.noStroke()
    p.fill(M.candle)
    rect(lx + 0.3, -0.45, lx + 0.5, -0.41, 0.01)
  }

  // The room's back wall, lit by the house lights; a dado along its foot with a brass rail.
  p.noStroke()
  p.fill(M.wall)
  rect(R.wallL1, R.ceil, R.wallR0, R.floor)
  vband(p, k, R.wallL1, 2.0, R.stageX0, R.floor, [[0, rgba(M.deep, 0.7)], [1, rgba(M.deep, 0.9)]])
  p.stroke(rgba(M.brass, 0.5))
  p.strokeWeight(weight * 0.5)
  p.line(X(R.wallL1), X(2.0), X(R.stageX0), X(2.0))
  vband(p, k, R.wallL1, R.ceil, R.wallR0, R.ceil + 1.6, [[0, rgba(M.deep, 0.75)], [1, rgba(M.deep, 0)]])

  // The house lights: brass sconces, each throwing its warm fan up and down the wall.
  for (const x of SCONCES) {
    const on = L.house
    glow(p, k, x, SCONCE_Y, 1.9, L.warm, 0.32 * on, 0.75, 1.5)
    glow(p, k, x, SCONCE_Y - 0.35, 0.55, M.ivory, 0.18 * on, 0.8, 1.6)
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
      const g = ctx.createLinearGradient(X(x - fw / 2), 0, X(x + fw / 2), 0)
      g.addColorStop(0, rgba(M.lacquer, 0.34))
      g.addColorStop(0.45, rgba(M.lacquer, 0))
      g.addColorStop(0.62, rgba(M.rose, 0.07))
      g.addColorStop(1, rgba(M.lacquer, 0.3))
      ctx.fillStyle = g
      ctx.fillRect(X(x - fw / 2), X(R.ceil), X(fw), X(R.stage - R.ceil))
    }
  }
  vband(p, k, cx0, R.ceil, cx1, R.ceil + 3, [[0, rgba(M.lacquer, 0.6)], [1, rgba(M.lacquer, 0)]])
  // While the house lights are up their warmth is on the velvet too; the stage light's spill behind the piano stays.
  glow(p, k, 3.6, -1.2, 9.5, L.warm, 0.2 * L.house, 1.25, 0.8)
  // The stage light's spill on the velvet behind the piano, and the band's corner when it blazes.
  glow(p, k, 2.7, -0.4, 4.2, L.stage, 0.3 * L.stageA, 1.05, 1)
  glow(p, k, 8.4, 1.2, 3.2, M.candle, 0.16 * L.band + 0.2 * L.blaze, 1.2, 0.9)
  glow(p, k, 4.8, 0.4, 7.5, mixHex(M.candle, COLD, 0.4), 0.28 * L.blaze, 1.35, 0.8)
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
    if (on > 0.01) {
      beam(p, k, from[0], from[1], sp.to[0], sp.to[1], 0.16, i === 0 ? 4.6 : 2.6, col, (i === 0 ? 0.1 : 0.09) * on)
      glow(p, k, sp.to[0], sp.to[1] + 0.3, i === 0 ? 2.8 : 1.6, col, (i === 0 ? 0.12 : 0.16) * on, 1.3, 0.35)
    }
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

  // The stage itself: its boards, its front, the brass nosing.
  solid(p, ink, weight * 0.8, mixHex(M.brass, M.deep, 0.72))
  rect(sx0, R.stage, R.wallR0, R.floor)
  vband(p, k, sx0, R.stage, R.wallR0, R.floor, [[0, rgba(M.lacquer, 0)], [1, rgba(M.lacquer, 0.5)]])
  p.stroke(rgba(M.brass, 0.85))
  p.strokeWeight(weight * 0.55)
  p.line(X(sx0 + 0.02), X(R.stage + 0.02), X(R.wallR0), X(R.stage + 0.02))
  glow(p, k, 2.7, R.stage, 3.0, L.stage, 0.22 * L.stageA, 1.2, 0.14)

  // The band's things, idle: the bass on its side, the kit, a stool, the stands with their clip lamps.
  drawBand(q, L)

  // The tables on the floor, their chairs and candles; Mia's table's top and lamp are drawn over the balls.
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
  glow(p, k, R.wallL1 + 0.1, 2.45, 0.9, L.warm, 0.12 * L.house, 0.6, 1)
  // The doorway through the wall, dark, and the door in it: shut, or swung out onto the street on its closer.
  p.noStroke()
  p.fill(M.lacquer)
  rect(R.wallL0 + 0.02, R.doorTop, R.wallL1 - 0.02, R.floor)
  const open = doorAt(t, s.end)
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
    const { tube, head } = neonArrow(tipX, tipY)
    p.stroke(ink)
    p.strokeWeight(weight * 0.55)
    p.line(X(a0), X(tube[0][1] - 0.18), X(tube[0][0] - 0.05), X(tube[0][1] - 0.18))
    p.line(X(tube[0][0] + 0.1), X(tube[0][1] - 0.18), X(tube[0][0] + 0.1), X(tube[0][1] - 0.04))
    p.line(X(a0 - 0.35), X(tube[0][1] - 0.18), X(a0 - 0.35), X(tube[4][1] - 0.02))
    const lit = 0.92 + 0.08 * Math.sin(t * 13) * Math.sin(t * 5.3)
    glow(p, k, tipX - 0.45, tipY - 0.55, 1.5, DRIVE_MAT.neon, 0.28 * lit, 1.2, 0.9)
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
    }
  }
}

/** The band's instruments, idle on the stage to the piano's right, and the clip lamps that come up for them. */
function drawBand(q: Pen, L: Lights): void {
  const { p, X, rect, poly, ink, w } = q
  const st = ROOM.stage
  const wood = mixHex(M.brass, M.velvet, 0.35)
  // The stand-up bass, lying on its side: the body's two bouts and waist, the neck, the scroll, the strings.
  {
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
    solid(p, ink, w * 0.45, M.lacquer)
    p.push()
    p.translate(X(x), X(1.72))
    p.rotate(-0.18)
    rect(-0.17, -0.2, 0.17, 0.02, 0.015)
    p.pop()
    const on = L.band
    if (on > 0.01) glow(p, q.k, x, 1.62, 0.8, M.candle, 0.4 * on, 1.1, 0.8)
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
function drawOver(p: p5, s: ClubRoom, k: number, ink: string, weight: number, t: number): void {
  const q = pen(p, k, ink, weight)
  const L = lightsAt(t, s.end)
  table(q, TABLE.x, 'top', 0.19)
  candle(q, TABLE.x, t, 7, 1.15)
  glow(p, k, TABLE.x, TABLE.top - 0.12, 0.42, L.warm, 0.12, 1.4, 0.8)
}

export const clubRoom = scenery<ClubRoom>({
  name: 'club-room',
  draw: (p, s, c) => drawRoom(p, s, c.k, c.ink, c.bg, c.weight, c.t),
  over: (p, s, c) => drawOver(p, s, c.k, c.ink, c.weight, c.t),
})

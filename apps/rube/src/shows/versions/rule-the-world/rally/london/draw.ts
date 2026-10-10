import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { level } from '../music'
import { ctxOf, ease, ellipse, flash, glow, line, mix, path, rect, rgba, ring, shape, vgrad, blob, type Pen } from '../pen'
import {
  A,
  A_DIM,
  B,
  BAT_DOWN,
  BOW,
  DEAD,
  ENDO_H,
  ENDO_TAP,
  ENDO_X,
  FLIP_A,
  FLIP_B,
  FLOOR,
  FLOOR_BACK,
  GLOVE,
  hubOf,
  IN_PAN_A,
  IN_PAN_B,
  KAY_X,
  KLETZKI_GONE,
  KLETZKI_H,
  KLETZKI_X,
  KNOCK,
  LAMP_ON,
  NET_H,
  PARAPET,
  panOf,
  POST,
  ARM,
  STROKES,
  TOP,
  TOSS_A,
  TOSS_B,
  UMP_A,
  UMP_B,
  WALK,
  type Stroke,
  type Table,
} from './geo'

/**
 * London: a big cold hall in grey and green, the daylight gone blue in the glass roof, the gallery in shadow; the only
 * warmth the lamps' pools on the green tables, and the white of the players' kit in them.
 */

const C = {
  night: '#141A18',
  glass: '#56656A',
  glassHi: '#7E8F92',
  iron: '#151B1A',
  ironHi: '#2B3532',
  wall: '#2E3834',
  wallHi: '#3A4641',
  window: '#9AAAAA',
  windowDim: '#6F807F',
  gallery: '#1C2421',
  riser: '#232C29',
  parapet: '#2A3430',
  parapetTop: '#46524C',
  barrier: '#1F3329',
  barrierHi: '#2A4436',
  barrierPost: '#141F1A',
  floor: '#3E3A33',
  floorHi: '#4B463D',
  floorSeam: '#2A2722',
  table: '#2D5A44',
  tableTop: '#4E8A66',
  tableEdge: '#E4E2D6',
  apron: '#1C3328',
  leg: '#1A221F',
  net: '#2A302D',
  netTape: '#E8E6DC',
  shade: '#21392D',
  shadeIn: '#E9E1C6',
  bulb: '#FFF1C8',
  lamp: '#F6DC9A',
  white: '#ECEAE2',
  whiteShade: '#B9BDB5',
  trouser: '#D9D8CF',
  skin: '#D9B49A',
  skinDim: '#8F7A6C',
  hairGrey: '#A9A7A0',
  hairBlack: '#15130F',
  rubber: '#B5262B',
  rubberDark: '#6E1418',
  wood: '#B08A5A',
  woodDark: '#5E4428',
  sponge: '#E9DDB0',
  spongeDark: '#B8A774',
  brass: '#B99A55',
  steel: '#5B6662',
  blazer: '#1E2530',
  card: '#EDEBE3',
  cardInk: '#1A1C1B',
  platinum: '#EFE8D0',
  pearl: '#F4F1E8',
  stole: '#B3A894',
  stoleDark: '#857B69',
  dress: '#121315',
  glove: '#F2EFE6',
}

/* ------------------------------------------------------------------ helpers */

/** A soft elliptical light: a glow squashed by `sy`. */
function oval(pen: Pen, c: Pt, rx: number, sy: number, col: string, a: number): void {
  const { p, k } = pen
  p.push()
  p.translate(c[0] * k, c[1] * k)
  p.scale(1, sy)
  glow(pen, [0, 0], rx, col, a)
  p.pop()
}

/** A rotated ellipse. */
function rotEllipse(pen: Pen, c: Pt, rx: number, ry: number, ang: number, fill: string, lw = 0, ink?: string): void {
  const { p, k } = pen
  p.push()
  p.translate(c[0] * k, c[1] * k)
  p.rotate(ang)
  ellipse(pen, [0, 0], rx, ry, fill, lw, ink ?? pen.ink)
  p.pop()
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const lerpPt = (a: Pt, b: Pt, u: number): Pt => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

/** How lit table A's lamps are (on at the cut, down once the semifinal is long over); B's are always on. */
export const lampA = (t: number): number => (t < LAMP_ON ? 0 : 1 - 0.85 * smooth(t, A_DIM[0], A_DIM[1]))
const lampOf = (tb: Table, t: number): number => (tb === A ? lampA(t) : 1)

/* ------------------------------------------------------------------ the hall */

const WALL_TOP = -6.2
const GALLERY_TOP = -4.0
const ROW = 0.78
const COLUMNS = [-5.2, 6.62, 18.8]

export function drawHall(pen: Pen, t: number, f: { x0: number; y0: number; x1: number; y1: number }): void {
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The whole frame first: the cold dark of the hall.
  vgrad(pen, x0, f.y0 - 1, x1, f.y1 + 1, [
    [0, C.night, 1],
    [1, C.night, 1],
  ])
  roof(pen, f, x0, x1)
  wall(pen, x0, x1)
  gallery(pen, t, x0, x1)
  for (const cx of COLUMNS) column(pen, cx)
  barrier(pen, x0, x1)
  glove(pen, t)
  floor(pen, f, x0, x1)
  // The light the lamps throw on the gallery behind each table.
  for (const tb of [A, B]) {
    const L = lampOf(tb, t)
    if (L <= 0.01) continue
    oval(pen, [(tb.x0 + tb.x1) / 2, -1.4], 4.2, 0.55, C.lamp, 0.09 * L)
  }
  umpire(pen, A, t, UMP_A)
  umpire(pen, B, t, UMP_B)
  for (const tb of [A, B]) {
    table(pen, tb, t)
    lamps(pen, tb, t)
  }
}

function roof(pen: Pen, f: { y0: number }, x0: number, x1: number): void {
  if (f.y0 > WALL_TOP + 0.2) return
  const yTop = f.y0 - 1
  vgrad(pen, x0, yTop, x1, WALL_TOP, [
    [0, C.glass, 0.65],
    [1, C.glassHi, 0.85],
  ])
  // Glazing bars, and the iron arches spanning the hall.
  for (let x = Math.floor(x0 / 0.55) * 0.55; x <= x1; x += 0.55) line(pen, [x, yTop], [x, WALL_TOP], C.iron, 0.6)
  for (let y = WALL_TOP - 0.9; y > yTop; y -= 0.9) line(pen, [x0, y], [x1, y], C.iron, 0.9)
  for (let n = Math.floor(x0 / 6); n * 6 <= x1; n++) {
    const cx = n * 6 + 0.6
    const pts: Pt[] = []
    for (let i = 0; i <= 24; i++) {
      const u = i / 24
      const x = cx - 3 + 6 * u
      pts.push([x, WALL_TOP - 0.1 - 2.6 * Math.sin(Math.PI * u)])
    }
    path(pen, pts, C.iron, 3.2)
    const inner = pts.map(([x, y]): Pt => [x, y - 0.32])
    path(pen, inner, C.iron, 1.4)
    for (let i = 1; i < 24; i += 2) line(pen, pts[i], inner[i + 1], C.iron, 0.9)
  }
  rect(pen, x0, WALL_TOP - 0.15, x1, WALL_TOP + 0.1, C.iron)
}

function wall(pen: Pen, x0: number, x1: number): void {
  rect(pen, x0, WALL_TOP, x1, GALLERY_TOP, C.wall)
  // Tall arched windows, the evening gone blue-grey in them.
  for (let n = Math.floor(x0 / 2.4) - 1; n * 2.4 <= x1 + 2.4; n++) {
    const cx = n * 2.4 + 0.3
    const w = 0.62
    const yb = GALLERY_TOP - 0.25
    const ys = WALL_TOP + 0.75
    rect(pen, cx - w - 0.06, ys, cx + w + 0.06, yb + 0.06, C.wallHi)
    const pts: Pt[] = [[cx - w, yb], [cx - w, ys]]
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI + (Math.PI * i) / 10
      pts.push([cx + w * Math.cos(a), ys + w * Math.sin(a)])
    }
    pts.push([cx + w, yb])
    shape(pen, pts, mix(C.windowDim, C.window, hash(n, 4) * 0.5))
    line(pen, [cx, ys - w], [cx, yb], C.iron, 0.8)
    for (let y = ys + 0.35; y < yb; y += 0.42) line(pen, [cx - w, y], [cx + w, y], C.iron, 0.6)
  }
  rect(pen, x0, GALLERY_TOP - 0.12, x1, GALLERY_TOP, C.iron)
}

/** The gallery: tiered rows of spectators in the shadow, and Kay Stone in the front row. */
function gallery(pen: Pen, t: number, x0: number, x1: number): void {
  rect(pen, x0, GALLERY_TOP, x1, PARAPET + 0.6, C.gallery)
  for (let r = 3; r >= 0; r--) {
    const y = PARAPET - ROW * r
    // The bench back in front of this row's knees.
    rect(pen, x0, y - 0.12, x1, y + 0.6, mix(C.riser, C.gallery, r * 0.2))
    const dim = 0.32 + 0.12 * (3 - r)
    for (let i = Math.floor((x0 + 10) / 0.62) - 2; i * 0.62 - 10 <= x1 + 1; i++) {
      const hx = i * 0.62 - 10 + (hash(i, r, 1) - 0.5) * 0.22 + (r % 2) * 0.3
      if (hx < -11 || hx > 25) continue
      if (r === 0 && Math.abs(hx - KAY_X) < 0.62) continue
      if (hash(i, r, 9) < 0.12) continue
      spectator(pen, hx, y, i, r, dim, t)
    }
    if (r === 0) kay(pen, t, y)
  }
  // The parapet the front row leans on.
  rect(pen, x0, PARAPET, x1, PARAPET + 1.6, C.parapet)
  rect(pen, x0, PARAPET - 0.04, x1, PARAPET + 0.05, C.parapetTop)
}

function spectator(pen: Pen, x: number, y: number, i: number, r: number, dim: number, t: number): void {
  const coat = [C.blazer, '#34302A', '#2C3533', '#3D3A36', '#283040'][Math.floor(hash(i, r, 2) * 5)]
  const bob = 0.012 * Math.sin(t * (1.2 + hash(i, r, 3)) + i) + 0.02 * level(t) * Math.sin(t * 6 + i * 1.7)
  const hy = y - 0.62 + bob
  const col = mix(C.gallery, coat, dim + 0.15)
  shape(pen, [[x - 0.27, y + 0.05], [x - 0.24, hy + 0.22], [x - 0.08, hy + 0.13], [x + 0.08, hy + 0.13], [x + 0.24, hy + 0.22], [x + 0.27, y + 0.05]], col)
  ellipse(pen, [x, hy], 0.13, 0.15, mix(C.gallery, C.skinDim, dim))
  if (hash(i, r, 5) < 0.45) {
    // A hat.
    const hc = mix(C.gallery, '#26241F', dim + 0.3)
    ellipse(pen, [x, hy - 0.08], 0.21, 0.035, hc)
    shape(pen, [[x - 0.13, hy - 0.08], [x - 0.11, hy - 0.2], [x - 0.03, hy - 0.22], [x, hy - 0.19], [x + 0.03, hy - 0.22], [x + 0.11, hy - 0.2], [x + 0.13, hy - 0.08]], hc)
  } else ellipse(pen, [x, hy - 0.07], 0.135, 0.09, mix(C.gallery, hash(i, r, 6) < 0.3 ? C.hairGrey : '#2A221B', dim))
}

/** Kay's lean, 0 to 1: forward over the parapet through the final, and back as the last point dies. */
const kayLean = (t: number) => smooth(t, 70, 84) * (1 - 0.75 * smooth(t, DEAD + 0.5, DEAD + 1.8))

/** Kay Stone in the front row, face on: platinum waves, pearls, a fur stole, her forearms on the parapet. */
function kay(pen: Pen, t: number, y: number): void {
  const x = KAY_X
  const L = kayLean(t)
  const sh: Pt = [x - 0.03 * L, y - 0.55 + 0.1 * L]
  const head: Pt = [sh[0] - 0.02 * L, sh[1] - 0.36 + 0.03 * L]
  // A spill of the table's light on her.
  glow(pen, [x, y - 0.75], 1.0, C.lamp, 0.14)
  // The black dress.
  shape(pen, [[sh[0] - 0.27, sh[1] + 0.05], [sh[0] + 0.27, sh[1] + 0.05], [x + 0.25, y + 0.1], [x - 0.25, y + 0.1]], C.dress)
  // The neck, and the pearls at her throat.
  rect(pen, head[0] - 0.05, head[1] + 0.1, head[0] + 0.05, sh[1] + 0.04, C.skin)
  // The fur stole, wrapped round her shoulders and falling down the front.
  blob(pen, [[sh[0] - 0.38, sh[1] + 0.06], [sh[0] - 0.22, sh[1] - 0.08], [sh[0], sh[1] - 0.02], [sh[0] + 0.22, sh[1] - 0.08], [sh[0] + 0.38, sh[1] + 0.06], [sh[0] + 0.3, sh[1] + 0.22], [sh[0] + 0.1, sh[1] + 0.12], [sh[0] - 0.1, sh[1] + 0.12], [sh[0] - 0.3, sh[1] + 0.22]], C.stole)
  blob(pen, [[sh[0] - 0.36, sh[1] + 0.12], [sh[0] - 0.24, sh[1] + 0.12], [sh[0] - 0.22, sh[1] + 0.42], [sh[0] - 0.33, sh[1] + 0.42]], C.stoleDark)
  for (let i = 0; i < 9; i++) {
    const u = -1 + (2 * i) / 8
    ellipse(pen, [head[0] + u * 0.09, sh[1] - 0.04 + 0.035 * (1 - u * u)], 0.018, 0.018, C.pearl)
  }
  // The face, and the platinum hair in its set waves.
  ellipse(pen, head, 0.13, 0.16, C.skin)
  blob(pen, [[head[0] - 0.2, head[1] + 0.14], [head[0] - 0.21, head[1] - 0.06], [head[0] - 0.08, head[1] - 0.2], [head[0] + 0.1, head[1] - 0.2], [head[0] + 0.21, head[1] - 0.06], [head[0] + 0.2, head[1] + 0.14], [head[0] + 0.13, head[1] + 0.02], [head[0] + 0.02, head[1] - 0.1], [head[0] - 0.13, head[1] + 0.02]], C.platinum)
  ellipse(pen, [head[0] - 0.18, head[1] + 0.15], 0.055, 0.06, C.platinum)
  ellipse(pen, [head[0] + 0.18, head[1] + 0.15], 0.055, 0.06, C.platinum)
  ellipse(pen, [head[0] - 0.05, head[1] + 0.01], 0.022, 0.01, '#3A302C')
  ellipse(pen, [head[0] + 0.05, head[1] + 0.01], 0.022, 0.01, '#3A302C')
  ellipse(pen, [head[0], head[1] + 0.09], 0.032, 0.013, '#8E3236')
  // Her forearms on the parapet, the gloved hands together.
  for (const sd of [-1, 1]) {
    const elbow: Pt = [x + sd * 0.3, y - 0.06]
    path(pen, [[sh[0] + sd * 0.25, sh[1] + 0.12], elbow, [x + sd * 0.07, y - 0.05]], C.dress, 5.5)
    ellipse(pen, [x + sd * 0.07, y - 0.06], 0.055, 0.045, C.glove)
  }
  // The spare glove in her hand, hanging over the ledge, until it slips.
  if (t < GLOVE[0]) rotEllipse(pen, [x + 0.12, y + 0.08], 0.035, 0.12, 0.15, C.glove)
}

/** Her glove, slipping out of her hand as the dead ball dies, down onto the barrier's rail. */
function glove(pen: Pen, t: number): void {
  if (t < GLOVE[0]) return
  const from: Pt = [KAY_X + 0.12, PARAPET + 0.08]
  const to: Pt = [KAY_X + 0.02, BARRIER_TOP - 0.035]
  const u = Math.min(1, (t - GLOVE[0]) / (GLOVE[1] - GLOVE[0]))
  const fall = u * u
  const sway = u < 1 ? 0.07 * Math.sin(u * 8) : 0
  const p: Pt = [lerp(from[0], to[0], u) + sway, lerp(from[1], to[1], fall)]
  const ang = u < 1 ? 0.15 + 1.4 * u + 0.3 * Math.sin(u * 7) : Math.PI / 2 + 0.06 * ring(t - GLOVE[1], 5, 0.2)
  rotEllipse(pen, p, 0.035, 0.12, ang, C.glove)
}

function column(pen: Pen, cx: number): void {
  rect(pen, cx - 0.11, WALL_TOP, cx + 0.11, FLOOR_BACK, C.iron)
  rect(pen, cx - 0.04, WALL_TOP, cx + 0.0, FLOOR_BACK, C.ironHi)
  rect(pen, cx - 0.2, FLOOR_BACK - 0.15, cx + 0.2, FLOOR_BACK, C.iron)
  rect(pen, cx - 0.22, WALL_TOP + 0.05, cx + 0.22, WALL_TOP + 0.22, C.iron)
}

/** The low barrier round the court: dark green canvas on its frames. */
const BARRIER_TOP = 0.5
function barrier(pen: Pen, x0: number, x1: number): void {
  const y0 = BARRIER_TOP
  rect(pen, x0, y0, x1, FLOOR_BACK, C.barrier)
  rect(pen, x0, y0, x1, y0 + 0.06, C.barrierHi)
  for (let x = Math.floor(x0 / 1.7) * 1.7; x <= x1; x += 1.7) rect(pen, x - 0.03, y0, x + 0.03, FLOOR_BACK, C.barrierPost)
}

function floor(pen: Pen, f: { y1: number }, x0: number, x1: number): void {
  const y1 = f.y1 + 1
  rect(pen, x0, FLOOR_BACK, x1, y1, C.floor)
  // Boards running down the hall, wider apart as they come nearer.
  let y = FLOOR_BACK
  let gap = 0.07
  let n = 0
  while (y < y1) {
    rect(pen, x0, y, x1, y + 0.012 + gap * 0.05, C.floorSeam)
    if (n % 3 === 1) rect(pen, x0, y + 0.02, x1, y + gap * 0.5, C.floorHi)
    // Butt joints, staggered.
    for (let x = Math.floor(x0 / 2.3) * 2.3 + (n % 4) * 0.57; x <= x1; x += 2.3) rect(pen, x, y, x + 0.015, y + gap, C.floorSeam)
    y += gap
    gap *= 1.22
    n++
  }
}

/* ------------------------------------------------------------------ the umpire and his cards */

/** The cards' values: bars for games, Marty's and the opponent's. */
function cardsOf(tb: Table, t: number): { m: number; o: number; flip: number; side: 0 | 1 } {
  if (tb === A) return { m: t < FLIP_A ? 2 : 3, o: 2, flip: t - FLIP_A, side: 0 }
  return { m: 1, o: t < FLIP_B ? 2 : 3, flip: t - FLIP_B, side: 1 }
}

function umpire(pen: Pen, tb: Table, t: number, x: number): void {
  const seat = -0.28
  // The high chair: four legs, rungs, a foot rail.
  const legC = C.iron
  line(pen, [x - 0.32, seat], [x - 0.42, FLOOR_BACK], legC, 2.2)
  line(pen, [x + 0.32, seat], [x + 0.42, FLOOR_BACK], legC, 2.2)
  line(pen, [x - 0.36, 0.45], [x + 0.36, 0.45], legC, 1.6)
  rect(pen, x - 0.38, seat - 0.02, x + 0.38, seat + 0.07, '#2D2620')
  rect(pen, x + 0.28, seat - 0.75, x + 0.36, seat, '#2D2620')
  // The umpire: dark blazer, grey hair, a white collar; he turns his head with the ball.
  const sh: Pt = [x + 0.02, seat - 0.92]
  shape(pen, [[x - 0.26, seat], [x - 0.28, sh[1] + 0.12], [x - 0.12, sh[1]], [x + 0.18, sh[1]], [x + 0.3, sh[1] + 0.14], [x + 0.26, seat]], C.blazer)
  shape(pen, [[x - 0.2, seat + 0.02], [x - 0.42, 0.42], [x - 0.3, 0.45], [x - 0.05, seat + 0.05]], C.blazer)
  shape(pen, [[x - 0.06, sh[1] - 0.02], [x + 0.08, sh[1] - 0.02], [x + 0.01, sh[1] + 0.14]], C.white)
  const head: Pt = [x + 0.01, sh[1] - 0.25]
  ellipse(pen, head, 0.17, 0.2, C.skinDim)
  ellipse(pen, add(head, [0.03, -0.1]), 0.17, 0.11, C.hairGrey)
  // The board of flip-cards on its pole by his right hand.
  const { m, o, flip, side } = cardsOf(tb, t)
  const bx = x + 0.95
  const by = -2.05
  line(pen, [bx, by + 0.5], [bx - 0.05, FLOOR_BACK], C.iron, 1.6)
  rect(pen, bx - 0.4, by - 0.05, bx + 0.4, by + 0.5, C.iron)
  card(pen, bx - 0.2, by, m, side === 0 ? flip : -1, side === 0 ? m - 1 : m)
  card(pen, bx + 0.2, by, o, side === 1 ? flip : -1, side === 1 ? o - 1 : o)
  // His hand comes up to turn the card.
  const reach = Math.max(flash(flip + 0.25, 0.3) * (flip < -0.25 ? 0 : 1), flip >= -0.25 && flip < 0 ? smooth(flip, -0.25, 0) : 0)
  const rest: Pt = [x + 0.25, seat - 0.15]
  const at: Pt = [bx + (side ? 0.2 : -0.2), by + 0.42]
  const hand = lerpPt(rest, at, Math.min(1, reach))
  line(pen, [sh[0] + 0.2, sh[1] + 0.12], hand, C.blazer, 4.5)
  ellipse(pen, hand, 0.06, 0.06, C.skinDim)
}

/** A flip-card of `n` bars; within its flip (0..0.2 s) the top leaf folds down from the old value `was`. */
function card(pen: Pen, cx: number, y: number, n: number, flip: number, was: number): void {
  const w = 0.17
  const h = 0.42
  const bars = (val: number, y0: number, y1: number) => {
    for (let i = 0; i < val; i++) {
      const bx = cx + (i - (val - 1) / 2) * 0.085
      rect(pen, bx - 0.022, Math.max(y0, y + 0.08), bx + 0.022, Math.min(y1, y + h - 0.08), C.cardInk)
    }
  }
  rect(pen, cx - w, y, cx + w, y + h, C.card)
  const folding = flip >= 0 && flip < 0.22
  bars(folding ? was : n, y, y + h)
  if (folding) {
    // The new leaf comes over: its shadow line sweeping down, the new value under it.
    const u = ease(flip / 0.22)
    const yl = y + h * u
    rect(pen, cx - w, y, cx + w, yl, C.card)
    bars(n, y, yl)
    rect(pen, cx - w, yl - 0.012, cx + w, yl + 0.012, '#8C8A84')
  }
  line(pen, [cx - w, y + h / 2], [cx + w, y + h / 2], '#B7B4AC', 0.4)
}

/* ------------------------------------------------------------------ the tables and the lamps */

function table(pen: Pen, tb: Table, t: number): void {
  const { x0, x1, net } = tb
  const L = lampOf(tb, t)
  // The far legs, then the near.
  for (const [lx, far] of [[x0 + 0.55, true], [x1 - 0.55, true], [x0 + 0.4, false], [x1 - 0.4, false]] as [number, boolean][]) {
    const foot = far ? FLOOR_BACK + 0.1 : FLOOR
    const col = far ? '#121816' : C.leg
    rect(pen, lx - 0.05 + (far ? 0.12 : 0), TOP + 0.15, lx + 0.05 + (far ? 0.12 : 0), foot, col)
  }
  line(pen, [x0 + 0.45, 0.95], [x1 - 0.45, 0.95], '#151C19', 1.2)
  // The shadow under it.
  oval(pen, [(x0 + x1) / 2, FLOOR - 0.02], 3.0, 0.08, '#000000', 0.5)
  // The top: green, lit where the lamps are, its white edge line.
  rect(pen, x0 + 0.1, TOP + 0.08, x1 - 0.1, TOP + 0.2, C.apron)
  rect(pen, x0, TOP, x1, TOP + 0.09, mix(C.table, C.tableTop, 0.3 * L))
  rect(pen, x0, TOP, x1, TOP + 0.022, mix(C.whiteShade, C.tableEdge, L))
  rect(pen, x0, TOP, x0 + 0.03, TOP + 0.09, C.tableEdge)
  rect(pen, x1 - 0.03, TOP, x1, TOP + 0.09, C.tableEdge)
  // The net, edge on: its post and clamp, the mesh, the white tape.
  rect(pen, net - 0.035, TOP - NET_H, net + 0.035, TOP, C.net)
  rect(pen, net - 0.045, TOP - NET_H - 0.03, net + 0.045, TOP - NET_H + 0.02, C.netTape)
  rect(pen, net - 0.06, TOP + 0.0, net + 0.06, TOP + 0.14, C.steel)
}

/** The lamps' x over a table. */
const lampXs = (tb: Table): number[] => [tb.x0 + 1.45, tb.x1 - 1.45]
const SHADE_Y = -2.45

function lamps(pen: Pen, tb: Table, t: number): void {
  const L = lampOf(tb, t)
  const on = tb === A ? flash(t - LAMP_ON, 0.18) : 0
  for (const lx of lampXs(tb)) {
    // The light down onto the table, and its pool.
    if (L > 0.01) {
      const ctx = ctxOf(pen.p)
      const k = pen.k
      const g = ctx.createLinearGradient(0, SHADE_Y * k, 0, TOP * k)
      g.addColorStop(0, rgba(pen, C.lamp, 0.16 * L + 0.2 * on))
      g.addColorStop(1, rgba(pen, C.lamp, 0.03 * L))
      ctx.save()
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo((lx - 0.42) * k, SHADE_Y * k)
      ctx.lineTo((lx + 0.42) * k, SHADE_Y * k)
      ctx.lineTo((lx + 1.5) * k, TOP * k)
      ctx.lineTo((lx - 1.5) * k, TOP * k)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      oval(pen, [lx, TOP + 0.02], 1.9, 0.12, C.lamp, 0.55 * L + 0.4 * on)
      oval(pen, [lx, FLOOR - 0.05], 2.4, 0.1, C.lamp, 0.1 * L)
    }
    // The cord, the green enamel cone, its white inside and the bulb.
    line(pen, [lx, -12], [lx, SHADE_Y - 0.5], C.iron, 0.8)
    shape(pen, [[lx - 0.1, SHADE_Y - 0.52], [lx + 0.1, SHADE_Y - 0.52], [lx + 0.45, SHADE_Y], [lx - 0.45, SHADE_Y]], C.shade)
    rect(pen, lx - 0.06, SHADE_Y - 0.6, lx + 0.06, SHADE_Y - 0.5, C.steel)
    ellipse(pen, [lx, SHADE_Y], 0.45, 0.06, mix(C.shade, C.shadeIn, 0.3 + 0.7 * L))
    ellipse(pen, [lx, SHADE_Y + 0.02], 0.11, 0.07, mix('#5C5A50', C.bulb, L))
    if (L > 0.01) glow(pen, [lx, SHADE_Y + 0.05], 0.7, C.bulb, 0.35 * L + 0.5 * on)
  }
}

/* ------------------------------------------------------------------ the play: Marty's bats, Kletzki, Endo */

export function drawPlay(pen: Pen, t: number): void {
  contraption(pen, A, t, TOSS_A, IN_PAN_A)
  contraption(pen, B, t, TOSS_B, IN_PAN_B)
  if (t < KLETZKI_GONE) kletzki(pen, t)
  endo(pen, t)
}

/* ---- Marty's sprung bat ---- */

const READY = (190 * Math.PI) / 180
const COCK = (158 * Math.PI) / 180
const THROUGH = (48 * Math.PI) / 180

function armAngle(tb: Table, t: number): number {
  const fires = STROKES.filter((s) => s.who === 'marty' && s.table === tb)
  for (const s of fires) {
    const tc = s.arm!
    const d = t - s.t
    if (s.kind === 'miss' && d >= 0) return tc + THROUGH * ease(Math.min(1, d / 0.1)) + 0.04 * ring(d - 0.1, 4, 0.3)
    if (d < -0.32 || d > 0.55) continue
    if (d < -0.1) return lerp(READY, COCK, ease((d + 0.32) / 0.22))
    if (d < 0) {
      const u = (d + 0.1) / 0.1
      return lerp(COCK, tc, u * u)
    }
    if (d < 0.1) {
      const u = d / 0.1
      return tc + THROUGH * (1 - (1 - u) * (1 - u))
    }
    return lerp(tc + THROUGH, READY, ease((d - 0.1) / 0.45))
  }
  return READY
}

function contraption(pen: Pen, tb: Table, t: number, toss: number, inPan: number): void {
  const hub = hubOf(tb)
  const post = POST(tb)
  const pan0 = panOf(tb)
  // The pan's lever: flicked up on the toss, and dipping as he lands in it.
  const dt = t - toss
  const kick = dt >= 0 ? (dt < 0.07 ? dt / 0.07 : Math.exp(-(dt - 0.07) / 0.12)) : 0
  const dip = flash(t - inPan, 0.12) * (t >= inPan ? 1 : 0)
  const rel: Pt = [pan0[0] - post[0], pan0[1] + 0.13 - post[1]]
  const ang = Math.atan2(rel[1], rel[0]) + 0.42 * kick - 0.06 * dip
  const len = Math.hypot(rel[0], rel[1])
  const pan: Pt = [post[0] + len * Math.cos(ang), post[1] + len * Math.sin(ang)]
  // The clamp on the table's end, its screw, the post.
  rect(pen, tb.x0 - 0.13, TOP - 0.06, tb.x0 + 0.12, TOP - 0.0, C.steel)
  rect(pen, tb.x0 - 0.13, TOP - 0.06, tb.x0 - 0.04, hub[1] + 0.14, C.steel)
  rect(pen, tb.x0 - 0.13, TOP + 0.22, tb.x0 + 0.12, TOP + 0.28, C.steel)
  line(pen, [tb.x0 + 0.04, TOP + 0.28], [tb.x0 + 0.04, TOP + 0.48], C.steel, 1.4)
  rect(pen, tb.x0 - 0.04, TOP + 0.46, tb.x0 + 0.12, TOP + 0.5, C.steel)
  line(pen, [post[0], TOP - 0.03], post, C.steel, 1.4)
  // The lever and the little brass pan.
  line(pen, post, pan, C.brass, 1.3)
  const { p, k } = pen
  p.push()
  p.translate(pan[0] * k, pan[1] * k)
  p.rotate(ang - Math.atan2(rel[1], rel[0]))
  shape(pen, [[-0.15, -0.02], [0.15, -0.02], [0.1, 0.06], [-0.1, 0.06]], C.brass)
  rect(pen, -0.16, -0.03, 0.16, -0.0, '#D9BE7A')
  p.pop()
  ellipse(pen, post, 0.035, 0.035, C.steel)
  // The arm, the spring that drives it, the hub.
  const th = armAngle(tb, t)
  const dir: Pt = [Math.cos(th), Math.sin(th)]
  const tip: Pt = [hub[0] + ARM * dir[0], hub[1] + ARM * dir[1]]
  const springAt: Pt = [hub[0] + 0.32 * dir[0], hub[1] + 0.32 * dir[1]]
  const anchor: Pt = [tb.x0 + 0.04, TOP + 0.48]
  const zig: Pt[] = []
  for (let i = 0; i <= 10; i++) {
    const u = i / 10
    const q = lerpPt(anchor, springAt, u)
    const nx = -(springAt[1] - anchor[1])
    const ny = springAt[0] - anchor[0]
    const nl = Math.hypot(nx, ny) || 1
    const s = i === 0 || i === 10 ? 0 : i % 2 ? 0.045 : -0.045
    zig.push([q[0] + (nx / nl) * s, q[1] + (ny / nl) * s])
  }
  path(pen, zig, '#9AA39E', 0.7)
  line(pen, hub, [hub[0] + (ARM - 0.2) * dir[0], hub[1] + (ARM - 0.2) * dir[1]], C.woodDark, 2.0)
  // The bat: a red-rubber face on its wooden blade, seen a little open, the face toward the table.
  const nrm: Pt = [-dir[1], dir[0]]
  rotEllipse(pen, tip, 0.23, 0.1, th, C.woodDark)
  rotEllipse(pen, add(tip, [nrm[0] * 0.02, nrm[1] * 0.02]), 0.215, 0.085, th, C.rubber)
  rotEllipse(pen, add(tip, [nrm[0] * 0.045, nrm[1] * 0.045]), 0.14, 0.03, th, '#D8494B')
  ellipse(pen, hub, 0.065, 0.065, C.steel)
  ellipse(pen, hub, 0.025, 0.025, C.iron)
}

/* ---- the opponents ---- */

interface Key {
  t: number
  p: Pt
  lin?: boolean
}

/** A bat's path through its keys: straight and fast through each stroke, eased between. */
function track(keys: Key[], t: number): Pt {
  if (t <= keys[0].t) return keys[0].p
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (t > b.t) continue
    const u = (t - a.t) / Math.max(1e-6, b.t - a.t)
    return lerpPt(a.p, b.p, a.lin && b.lin ? u : ease(u))
  }
  return keys[keys.length - 1].p
}

function strokeKeys(strokes: Stroke[], ready: Pt): Key[] {
  const keys: Key[] = []
  for (const s of strokes) {
    // The bat's face behind the ball, the ball on its face.
    const C0: Pt = [s.p[0] + 0.15, s.p[1] + 0.02]
    let back: Pt = [C0[0] + 0.34, C0[1] + 0.16]
    let thru: Pt = [C0[0] - 0.34, C0[1] - 0.36]
    if (s.kind === 'lob') {
      back = [C0[0] + 0.18, C0[1] + 0.38]
      thru = [C0[0] - 0.14, C0[1] - 0.6]
    } else if (s.kind === 'dead') {
      back = [C0[0] + 0.08, C0[1] + 0.03]
      thru = [C0[0] - 0.1, C0[1] - 0.04]
    }
    keys.push({ t: s.t - 0.3, p: ready }, { t: s.t - 0.11, p: back, lin: true }, { t: s.t, p: C0, lin: true }, { t: s.t + 0.11, p: thru, lin: true }, { t: s.t + 0.42, p: ready })
  }
  return keys
}

const KL_READY: Pt = [KLETZKI_X - 0.85, -0.3]
const KL_LOW: Pt = [KLETZKI_X - 0.32, 0.12]
const KL_BAT_DOWN: Pt = [A.x1 - 0.32, TOP - 0.03]
const KL_KEYS: Key[] = (() => {
  const ks: Key[] = [
    { t: 0, p: KL_READY },
    { t: KNOCK - 0.22, p: KL_READY },
    { t: KNOCK, p: [A.x1 - 0.12, TOP - 0.08], lin: true },
    { t: KNOCK + 0.25, p: KL_READY },
  ]
  ks.push(...strokeKeys(STROKES.filter((s) => s.who === 'kletzki'), KL_READY))
  // After the miss: the bat drops to his side, and then he lays it on the table.
  const miss = STROKES.find((s) => s.who === 'kletzki' && s.kind === 'miss')!
  ks.splice(ks.length - 1, 1, { t: miss.t + 0.5, p: KL_LOW }, { t: BAT_DOWN - 0.3, p: KL_LOW }, { t: BAT_DOWN, p: KL_BAT_DOWN })
  return ks
})()

const EN_READY: Pt = [ENDO_X - 0.85, -0.25]
const EN_KEYS: Key[] = (() => {
  const ks: Key[] = [
    { t: 0, p: EN_READY },
    { t: ENDO_TAP - 0.25, p: EN_READY },
    { t: ENDO_TAP, p: [B.x1 - 0.14, TOP - 0.1], lin: true },
    { t: ENDO_TAP + 0.3, p: EN_READY },
  ]
  ks.push(...strokeKeys(STROKES.filter((s) => s.who === 'endo'), EN_READY))
  // The bow: the bat to his side.
  ks.push({ t: BOW, p: EN_READY }, { t: BOW + 0.3, p: [ENDO_X - 0.25, 0.25] }, { t: BOW + 1.6, p: [ENDO_X - 0.25, 0.25] })
  return ks
})()

interface Figure {
  x: number
  h: number
  lean: number
  bat: Pt | null
  batKind: 'kletzki' | 'endo'
  hair: 'bald' | 'black'
  /** Walking: the stride's phase (radians), or null standing. */
  stride: number | null
  /** Faces left (toward the table) or right (walking away). */
  face: 1 | -1
}

function figure(pen: Pen, f: Figure): void {
  const s = f.h / 3.2
  const hip: Pt = [f.x, FLOOR - 1.5 * s]
  const up = (d: number, side: number): Pt => [hip[0] - Math.sin(f.lean) * d * f.face + side * Math.cos(f.lean), hip[1] - Math.cos(f.lean) * d - side * Math.sin(f.lean) * f.face]
  // Legs: the stance, or the stride.
  const st = f.stride
  const swing = st === null ? 0 : 0.28 * Math.sin(st)
  const feet: Pt[] = st === null ? [[f.x - 0.3, FLOOR], [f.x + 0.25, FLOOR]] : [[f.x - swing, FLOOR], [f.x + swing, FLOOR]]
  for (const [i, ft] of feet.entries()) {
    const knee: Pt = [(hip[0] + ft[0]) / 2 - 0.08 * f.face, (hip[1] + FLOOR) / 2 + 0.02]
    const col = i === 0 ? C.trouser : mix(C.trouser, C.whiteShade, 0.6)
    path(pen, [[hip[0] + (i ? 0.06 : -0.06), hip[1]], knee, [ft[0], ft[1] - 0.08]], col, 7.5 * s)
    shape(pen, [[ft[0] - 0.17, FLOOR], [ft[0] - 0.15, FLOOR - 0.1], [ft[0] + 0.1, FLOOR - 0.11], [ft[0] + 0.1, FLOOR]], '#E8E5DA')
  }
  // The body: the white shirt, a cold shade down its back.
  const sh = up(1.05 * s, 0)
  shape(pen, [up(-0.05, -0.22 * s), up(0.6 * s, -0.25 * s), up(1.05 * s, -0.27 * s), up(1.12 * s, -0.12 * s), up(1.12 * s, 0.12 * s), up(1.05 * s, 0.27 * s), up(0.6 * s, 0.24 * s), up(-0.05, 0.22 * s)], C.white)
  shape(pen, [up(-0.05, 0.08 * s * f.face), up(1.05 * s, 0.12 * s * f.face), up(1.05 * s, 0.27 * s * f.face), up(-0.05, 0.22 * s * f.face)], C.whiteShade)
  // The free arm.
  const back = up(1.0 * s, 0.18 * s * f.face)
  const elbow2: Pt = [back[0] + 0.05 * f.face, back[1] + 0.45 * s]
  path(pen, [back, elbow2, [elbow2[0] - 0.12 * f.face, elbow2[1] + 0.38 * s]], C.skin, 6 * s)
  // The neck and head.
  const neck = up(1.18 * s, 0)
  const head = up(1.42 * s, -0.04 * s * f.face)
  line(pen, sh, neck, C.skin, 7 * s)
  ellipse(pen, head, 0.19 * s, 0.23 * s, C.skin)
  if (f.hair === 'bald') {
    // The champion: bald on top, a grey fringe, a hard brow and a long jaw.
    ellipse(pen, add(head, [0.11 * f.face, 0.02]), 0.1 * s, 0.13 * s, C.hairGrey)
    rect(pen, head[0] - 0.13 * f.face - 0.05, head[1] - 0.06 * s, head[0] - 0.13 * f.face + 0.05, head[1] - 0.04 * s, '#4B3F37')
    shape(pen, [add(head, [-0.17 * f.face, 0.1 * s]), add(head, [-0.05 * f.face, 0.26 * s]), add(head, [0.08 * f.face, 0.2 * s])], C.skin)
  } else {
    blob(pen, [add(head, [-0.18 * s, -0.04 * s]), add(head, [-0.1 * s, -0.22 * s]), add(head, [0.12 * s, -0.22 * s]), add(head, [0.2 * s, -0.04 * s]), add(head, [0.17 * s, 0.1 * s]), add(head, [0.0, -0.06 * s])], C.hairBlack)
  }
  // The bat arm, shoulder to the bat.
  if (!f.bat) {
    const fr = up(1.0 * s, -0.2 * s * f.face)
    path(pen, [fr, [fr[0] - 0.05 * f.face, fr[1] + 0.45 * s], [fr[0] - 0.1 * f.face, fr[1] + 0.82 * s]], C.skin, 6 * s)
    return
  }
  const fr = up(1.0 * s, -0.2 * s * f.face)
  const toSh: Pt = [fr[0] - f.bat[0], fr[1] - f.bat[1]]
  const dl = Math.hypot(toSh[0], toSh[1]) || 1
  const hd: Pt = [toSh[0] / dl, toSh[1] / dl]
  const hand: Pt = [f.bat[0] + hd[0] * 0.27, f.bat[1] + hd[1] * 0.27]
  const mid = lerpPt(fr, hand, 0.5)
  const elbow: Pt = [mid[0] + 0.1, mid[1] + 0.16]
  path(pen, [fr, elbow], C.white, 7 * s)
  path(pen, [elbow, hand], C.skin, 6 * s)
  const ang = Math.atan2(-hd[1], -hd[0])
  line(pen, hand, [f.bat[0] + hd[0] * 0.17, f.bat[1] + hd[1] * 0.17], C.wood, 3.4)
  if (f.batKind === 'kletzki') {
    rotEllipse(pen, f.bat, 0.2, 0.17, ang, C.woodDark)
    rotEllipse(pen, [f.bat[0] - 0.015, f.bat[1]], 0.185, 0.155, ang, C.rubberDark)
  } else {
    // Endo's: a thick slab of pale sponge.
    rotEllipse(pen, f.bat, 0.22, 0.19, ang, C.spongeDark)
    rotEllipse(pen, [f.bat[0] - 0.03, f.bat[1] - 0.02], 0.2, 0.17, ang, C.sponge)
  }
  ellipse(pen, hand, 0.065 * s, 0.065 * s, C.skin)
}

function kletzki(pen: Pen, t: number): void {
  const miss = STROKES.find((s) => s.who === 'kletzki' && s.kind === 'miss')!
  const walking = t >= WALK[0] && t < WALK[1]
  const u = smooth(t, WALK[0], WALK[1])
  const x = KLETZKI_X - 1.0 * u
  const hit = STROKES.filter((s) => s.who === 'kletzki').reduce((m, s) => Math.max(m, flash(t - s.t, 0.2) * (t >= s.t ? 1 : 0)), 0)
  // Beaten: his head goes down after the miss.
  const beaten = smooth(t, miss.t + 0.3, miss.t + 1.2)
  const lean = 0.14 + 0.1 * hit + 0.12 * beaten
  const down = t >= BAT_DOWN
  figure(pen, {
    x,
    h: KLETZKI_H,
    lean: walking || t >= WALK[1] ? 0.1 : lean,
    bat: down ? null : track(KL_KEYS, t),
    batKind: 'kletzki',
    hair: 'bald',
    stride: walking ? ((t - WALK[0]) / 0.5) * Math.PI : null,
    face: t >= WALK[0] ? 1 : 1,
  })
  if (down) {
    // His bat lies on the end of the table where he put it.
    rotEllipse(pen, [KL_BAT_DOWN[0], TOP - 0.03], 0.2, 0.035, 0, C.woodDark)
    rotEllipse(pen, [KL_BAT_DOWN[0], TOP - 0.05], 0.18, 0.02, 0, C.rubberDark)
    line(pen, [KL_BAT_DOWN[0] + 0.2, TOP - 0.03], [KL_BAT_DOWN[0] + 0.42, TOP - 0.03], C.wood, 3.2)
  }
}

function endo(pen: Pen, t: number): void {
  // The bow: down on the beat, held, and up.
  const bow = t < BOW ? 0 : t < BOW + 0.3 ? ease((t - BOW) / 0.3) : t < BOW + 1.0 ? 1 : 1 - ease((t - BOW - 1.0) / 0.6)
  figure(pen, {
    x: ENDO_X,
    h: ENDO_H,
    lean: 0.06 + 0.7 * bow,
    bat: track(EN_KEYS, t),
    batKind: 'endo',
    hair: 'black',
    stride: null,
    face: 1,
  })
}


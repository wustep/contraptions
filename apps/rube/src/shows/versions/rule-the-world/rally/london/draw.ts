import type { Pt } from '../../../../../parts'
import { flicker, motes, sway, type Frame } from '../depth'
import { hash, lastOf, smooth } from '../kit'
import { level } from '../music'
import { ctxOf, ease, ellipse, flash, glow, line, mix, path, rect, rgba, ring, shape, vgrad, blob, type Pen } from '../pen'
import { banners, bunting, daylight, GALLERY_TOP, glazing, WALL_TOP, lampPigeon, pigeons, roofIron, scoreboard, wallBack, wallIron } from './above'
import { ballBoys, officials, programme } from './court'
import { gangways, inGangway } from './far'
import {
  A,
  A_DIM,
  B,
  ballAt,
  BAT_DOWN,
  BOW,
  CATCH,
  carryAt,
  DEAD,
  DIES,
  endoFace,
  ENDO_H,
  ENDO_TAP,
  FEED,
  FLIP_A,
  FLIP_B,
  FLIP_M,
  FLOOR,
  FLOOR_BACK,
  GLOVE,
  hipAt,
  hubOf,
  IN_PAN_A,
  IN_PAN_B,
  IN_PAN_B2,
  KAY_X,
  KLETZKI_GONE,
  KLETZKI_H,
  KNOCK,
  LAMP_ON,
  LUNGE,
  MISS,
  NET_H,
  OUT,
  PARAPET,
  panOf,
  POST,
  ARM,
  R,
  STROKES,
  TOP,
  TOSS_A,
  TOSS_B,
  TOSS_B2,
  UMP_A,
  UMP_B,
  WALK,
  WINNER,
  type Stroke,
  type Table,
} from './geo'
import { busy, cheer, groan, hush, SEMI_WIN } from './mood'
import { C } from './palette'
import { PRESS_SPAN, pressBox, pressDesk } from './press'

/**
 * London: a big cold hall in grey and green, the daylight gone blue in the glass roof, the gallery in shadow; the only
 * warmth the lamps' pools on the green tables, and the white of the players' kit in them. The colours are in
 * `palette.ts`; the hall above the crowd in `above.ts`, the far hall through the gangways in `far.ts`, the press in
 * `press.ts`, the court's ball boys and officials in `court.ts`, and the near side of the court in `near.ts`.
 */

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

/** How lit table A's lamps are (on at the cut, down once the semifinal is long over). */
export const lampA = (t: number): number => (t < LAMP_ON ? 0 : 1 - 0.85 * smooth(t, A_DIM[0], A_DIM[1]))
/**
 * How lit the lamp at `lx` is. Table A's go down after the semifinal; B's stay on, but the one over Marty's end of
 * it stutters as his bat swings over the dead ball under it, and goes down, flickering, as he rolls off onto the
 * floorboards.
 */
function lampOf(tb: Table, t: number, lx = tb.x0): number {
  if (tb === A) return lampA(t)
  if (lx > (B.x0 + B.x1) / 2 || t < MISS) return 1
  const u = t - MISS
  const stutter = u > 0.08 && u < 0.14 ? 0.5 : u > 0.24 && u < 0.29 ? 0.68 : 1
  return stutter * (1 - 0.42 * smooth(t, MISS + 0.3, MISS + 2.4)) * flicker(t, 7, 0.3 * (1 - smooth(t, MISS + 2.6, MISS + 4.5)))
}

/* ------------------------------------------------------------------ the hall */

const ROW = 0.78
const COLUMNS = [-5.2, 6.62, 18.8]

/**
 * The hall, back to front: the glass and the world through it, the wall's iron and its banners and board, the gallery
 * (and the far hall through its gangways, and the press's flash bulbs in it), the bunting, the columns, the daylight
 * and the dust in it, the pigeons; the barrier and the floor, the ball boys and the officials; the umpires, the tables
 * and their lamps.
 */
export function drawHall(pen: Pen, t: number, f: Frame): void {
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The whole frame first: the cold dark of the hall.
  vgrad(pen, x0, f.y0 - 1, x1, f.y1 + 1, [
    [0, C.night, 1],
    [1, C.night, 1],
  ])
  wallBack(pen, x0, x1)
  glazing(pen, t, f, x0, x1)
  roofIron(pen, f, x0, x1)
  wallIron(pen, x0, x1)
  banners(pen, t, f)
  scoreboard(pen, t, f)
  gallery(pen, t, f, x0, x1)
  wisps(pen, t)
  bunting(pen, t, f)
  for (const cx of COLUMNS) column(pen, cx)
  daylight(pen, t, f)
  pigeons(pen, t, f)
  barrier(pen, x0, x1)
  glove(pen, t)
  floor(pen, f, x0, x1)
  officials(pen, t, f)
  ballBoys(pen, t, f)
  programme(pen, t)
  // The light the lamps throw on the gallery behind each table.
  for (const tb of [A, B]) {
    const L = (lampOf(tb, t, tb.x0) + lampOf(tb, t, tb.x1)) / 2
    if (L <= 0.01) continue
    oval(pen, [(tb.x0 + tb.x1) / 2, -1.4], 4.2, 0.55, C.lamp, 0.09 * L)
  }
  umpire(pen, A, t, UMP_A)
  umpire(pen, B, t, UMP_B)
  for (const tb of [A, B]) {
    table(pen, tb, t)
    lamps(pen, tb, t, f)
  }
}

/** What the house is watching: the ball, as each spectator's eyes catch up with it (three lags), and its height. */
interface Watch {
  at: Pt[]
  cheer: number
  groan: number
  busy: number
  level: number
}

/** The smokers in the gallery, gathered as it is drawn (their mouths, in cells), their smoke drawn over it in one go. */
const smokers: number[] = []

/**
 * The gallery: tiered rows of spectators in the shadow, the gangways in its upper rows onto the far hall, and in the
 * front row the press box and Kay Stone.
 */
function gallery(pen: Pen, t: number, f: Frame, x0: number, x1: number): void {
  rect(pen, x0, GALLERY_TOP, x1, PARAPET + 0.6, C.gallery)
  const watch: Watch = { at: [ballAt(t - 0.1), ballAt(t - 0.18), ballAt(t - 0.28)], cheer: cheer(t), groan: groan(t), busy: busy(t), level: level(t) }
  smokers.length = 0
  for (let r = 3; r >= 0; r--) {
    // The gangways open out of the two upper rows; the lower two sit in front of their mouths.
    if (r === 1) gangways(pen, t, f)
    const y = PARAPET - ROW * r
    // The bench back in front of this row's knees.
    rect(pen, x0, y - 0.12, x1, y + 0.6, mix(C.riser, C.gallery, r * 0.2))
    for (let i = Math.floor((x0 + 10) / 0.62) - 2; i * 0.62 - 10 <= x1 + 1; i++) {
      const hx = i * 0.62 - 10 + (hash(i, r, 1) - 0.5) * 0.22 + (r % 2) * 0.3
      if (hx < -11 || hx > 25) continue
      if (r === 0 && Math.abs(hx - KAY_X) < 0.62) continue
      if (r === 0 && hx > PRESS_SPAN[0] - 0.25 && hx < PRESS_SPAN[1] + 0.25) continue
      if (r >= 2 && inGangway(hx)) continue
      if (hash(i, r, 9) < 0.12) continue
      spectator(pen, hx, y, i, r, t, watch)
    }
    if (r === 0) {
      kay(pen, t, y)
      pressBox(pen, t, y)
    }
  }
  // The parapet the front row leans on, and the press's desk on it.
  rect(pen, x0, PARAPET, x1, PARAPET + 1.6, C.parapet)
  rect(pen, x0, PARAPET - 0.04, x1, PARAPET + 0.05, C.parapetTop)
  pressDesk(pen)
}

/** The newspaper readers: when each puts it down to watch (the semifinal's winner, or the final's), and takes it up again. */
const paperUp = (i: number, r: number, t: number): number => {
  const down = hash(i, r, 15) < 0.5 ? SEMI_WIN : WINNER
  const again = DIES + 1.3 + 0.8 * hash(i, r, 16)
  return 1 - smooth(t, down - 0.05, down + 0.3) + smooth(t, again, again + 0.6)
}

/** The gallery's colours, a row at a time (the farther back, the more the shadow takes them): worked out once. */
const COATS = [C.blazer, '#34302A', '#2C3533', '#3D3A36', '#283040']
const ROW_INK = [0, 1, 2, 3].map((r) => {
  const dim = 0.32 + 0.12 * (3 - r)
  const coat = COATS.map((c) => mix(C.gallery, c, dim + 0.15))
  const paper = mix(C.gallery, C.paper, dim + 0.05)
  return {
    coat,
    sleeve: coat.map((c) => mix(c, C.whiteShade, 0.18)),
    hand: mix(C.gallery, C.skin, dim + 0.1),
    skin: mix(C.gallery, C.skinDim, dim),
    nose: mix(C.gallery, C.skin, dim),
    hat: mix(C.gallery, '#26241F', dim + 0.3),
    hair: [mix(C.gallery, C.hairGrey, dim), mix(C.gallery, '#2A221B', dim)],
    programme: mix(C.gallery, C.programme, dim * 0.85),
    paper,
    ink: mix(paper, C.paperInk, 0.55),
  }
})

/**
 * A spectator, face on: his head turned after the ball (his face toward it, the back of his hair away), tipped up
 * when it goes high; up off the bench with his arms in the air in a cheer, a hat or a programme waved in his hand, and
 * slumped in the groan. Some hold a programme, fanning it when the play gets hot; a few read the paper until the
 * match takes them, and go back to it after; some smoke. Drawn straight onto the canvas, a fill a part: there are a
 * hundred and more of them in a frame.
 */
function spectator(pen: Pen, x: number, y: number, i: number, r: number, t: number, w: Watch): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const ink = ROW_INK[r]
  const ci = Math.floor(hash(i, r, 2) * 5)
  const ball = w.at[Math.floor(hash(i, r, 7) * 3)]
  const look = Math.max(-1, Math.min(1, (ball[0] - x) / 4))
  const tip = Math.max(0, Math.min(1, (-0.3 - ball[1]) / 1.6))
  const keen = 0.55 + 0.45 * hash(i, r, 8)
  const rise = w.cheer * keen
  const bob = 0.012 * Math.sin(t * (1.2 + hash(i, r, 3)) + i) + 0.02 * w.level * Math.sin(t * 6 + i * 1.7) + 0.035 * rise * Math.sin(t * 13 + i * 2.3)
  const hy = y - 0.62 + bob - 0.16 * rise + 0.05 * w.groan
  const hx = x + 0.035 * look
  const hatted = hash(i, r, 5) < 0.45
  const prog = hash(i, r, 11) < 0.07
  // His coat, shoulders to the bench.
  ctx.fillStyle = pen.tone(ink.coat[ci])
  ctx.beginPath()
  ctx.moveTo((x - 0.27) * k, (y + 0.05) * k)
  ctx.lineTo((x - 0.24) * k, (hy + 0.22) * k)
  ctx.lineTo((x - 0.08) * k, (hy + 0.13) * k)
  ctx.lineTo((x + 0.08) * k, (hy + 0.13) * k)
  ctx.lineTo((x + 0.24) * k, (hy + 0.22) * k)
  ctx.lineTo((x + 0.27) * k, (y + 0.05) * k)
  ctx.closePath()
  ctx.fill()
  let hatInHand = false
  const armsUp = rise > 0.12 && r <= 1 && hash(i, r, 4) < 0.55
  if (armsUp) {
    // Arms up, waving: the front rows only, sleeves a shade lighter than the dark behind them.
    const wave = 0.06 * Math.sin(t * 11 + i * 1.3)
    const reach = Math.min(1, (rise - 0.12) / 0.4)
    hatInHand = hatted && hash(i, r, 13) < 0.6 && reach > 0.4
    const hands: Pt[] = []
    ctx.strokeStyle = pen.tone(ink.sleeve[ci])
    ctx.lineWidth = pen.w * 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const sd of [-1, 1]) {
      const hand: Pt = [x + sd * (0.3 + wave * sd), hy + 0.2 - 0.6 * reach]
      ctx.moveTo((x + sd * 0.18) * k, (hy + 0.22) * k)
      ctx.lineTo((x + sd * 0.34) * k, (hy + 0.05 - 0.15 * reach) * k)
      ctx.lineTo(hand[0] * k, hand[1] * k)
      hands.push(hand)
    }
    ctx.stroke()
    ctx.fillStyle = pen.tone(ink.hand)
    ctx.beginPath()
    for (const h of hands) {
      ctx.moveTo((h[0] + 0.055) * k, h[1] * k)
      ctx.arc(h[0] * k, h[1] * k, 0.055 * k, 0, Math.PI * 2)
    }
    ctx.fill()
    // A hat off and waved in one hand, or the programme.
    if (hatInHand) hat(pen, [hands[0][0], hands[0][1] - 0.04], ink.hat, 0.25 * Math.sin(t * 11 + i))
    if (prog) rotRect(pen, [hands[1][0], hands[1][1] - 0.1], 0.07, 0.1, 0.4 * Math.sin(t * 12 + i), ink.programme)
  }
  disc(pen, hx, hy, 0.13, 0.15, ink.skin)
  // The nose, toward the ball: a turned head reads at any size.
  disc(pen, hx + 0.085 * look, hy + 0.03 - 0.03 * tip, 0.03, 0.035, ink.nose)
  const back = -0.045 * look
  // A hat, tipped back as he looks up; or his hair.
  if (hatted && !hatInHand) hat(pen, [hx + back, hy - 0.08 - 0.03 * tip], ink.hat, 0)
  else disc(pen, hx + back, hy - 0.07 - 0.025 * tip, 0.135, 0.09, ink.hair[hash(i, r, 6) < 0.3 ? 0 : 1])
  // The programme at his chest, fanned when the play is hot.
  if (prog && !armsUp) {
    const fan = hash(i, r, 12) < 0.5 ? w.busy * 0.45 * Math.sin(t * 8.5 + i * 2.1) : 0
    rotRect(pen, [x + 0.1, hy + 0.34], 0.075, 0.1, 0.15 + fan, ink.programme)
  }
  // The paper, held open in front of his face.
  if (r >= 1 && hash(i, r, 14) < 0.035) {
    const up = paperUp(i, r, t)
    if (up > 0.03) {
      const top = hy - 0.17 + 0.5 * (1 - up)
      const bot = Math.min(y + 0.05, top + 0.4)
      rect(pen, x - 0.25, top, x + 0.25, bot, ink.paper)
      line(pen, [x, top], [x, bot], ink.ink, 0.5)
      for (let c = 0; c < 4; c++) {
        const cx = x - 0.2 + c * 0.11 + (c > 1 ? 0.04 : 0)
        rect(pen, cx, top + 0.05, cx + 0.07, Math.min(bot - 0.03, top + 0.32), ink.ink)
      }
    }
  }
  if (hash(i, r, 17) < 0.08) smokers.push(x + 0.09 * look + 0.06, hy + 0.08, i * 7 + r)
}

/** A filled ellipse, straight onto the canvas. */
function disc(pen: Pen, cx: number, cy: number, rx: number, ry: number, col: string): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.fillStyle = pen.tone(col)
  ctx.beginPath()
  ctx.ellipse(cx * k, cy * k, rx * k, ry * k, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** The hat's crown, from the front, about its brim's middle: a trilby, pinched. */
const CROWN: Pt[] = [[-0.13, 0], [-0.11, -0.12], [-0.03, -0.14], [0, -0.11], [0.03, -0.14], [0.11, -0.12], [0.13, 0]]

/** A hat (a trilby, from the front): its brim and its pinched crown, at `c` on the brim, tilted. One fill, on the canvas. */
function hat(pen: Pen, c: Pt, col: string, tilt: number): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const ca = Math.cos(tilt)
  const sa = Math.sin(tilt)
  ctx.fillStyle = rgba(pen, col, 1)
  ctx.beginPath()
  ctx.ellipse(c[0] * k, c[1] * k, 0.21 * k, 0.035 * k, tilt, 0, Math.PI * 2)
  CROWN.forEach(([x, y], j) => {
    const X = (c[0] + x * ca - y * sa) * k
    const Y = (c[1] + x * sa + y * ca) * k
    if (j) ctx.lineTo(X, Y)
    else ctx.moveTo(X, Y)
  })
  ctx.closePath()
  ctx.fill()
}

/** A rotated rectangle, `hw` by `hh` either side of `c`: a programme in a hand. One fill, on the canvas. */
function rotRect(pen: Pen, c: Pt, hw: number, hh: number, ang: number, col: string): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const ca = Math.cos(ang)
  const sa = Math.sin(ang)
  ctx.fillStyle = rgba(pen, col, 1)
  ctx.beginPath()
  for (const [x, y] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) ctx.lineTo((c[0] + x * ca - y * sa) * k, (c[1] + x * sa + y * ca) * k)
  ctx.closePath()
  ctx.fill()
}

/**
 * The smokers' smoke, curling up through the gallery: each a thin ribbon off his cigarette that widens and fades as
 * it rises, its curls going up it; three strokes for all of them, thicker as the hall warms up.
 */
function wisps(pen: Pen, t: number): void {
  if (!smokers.length) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const thick = 0.6 + 0.4 * busy(t)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let seg = 0; seg < 3; seg++) {
    ctx.beginPath()
    for (let s = 0; s < smokers.length; s += 3) {
      const [sx, sy, seed] = [smokers[s], smokers[s + 1], smokers[s + 2]]
      for (let j = seg * 4; j <= seg * 4 + 4; j++) {
        const u = j / 12
        const x = sx + 0.22 * u * u + 0.07 * u * Math.sin(u * 9 - t * 1.8 + seed) + 0.015 * Math.sin(t * 0.9 + seed)
        const y = sy - 1.05 * u
        if (j === seg * 4) ctx.moveTo(x * k, y * k)
        else ctx.lineTo(x * k, y * k)
      }
    }
    ctx.strokeStyle = rgba(pen, '#A4ACA8', [0.16, 0.1, 0.05][seg] * thick)
    ctx.lineWidth = (0.018 + 0.03 * seg) * k
    ctx.stroke()
  }
  ctx.restore()
}

/** Kay's lean, 0 to 1: forward over the parapet through the final, and back as the last point dies. */
const kayLean = (t: number) => smooth(t, 70, 84) * (1 - 0.75 * smooth(t, DEAD + 0.5, DEAD + 1.8))
/** Kay's applause for Marty's point: her gloved hands up and together, a clap on the beats. */
const kayClap = (t: number) => smooth(t, LUNGE, LUNGE + 0.2) * (1 - smooth(t, OUT[1] + 0.6, OUT[1] + 1.2))

/** Kay Stone in the front row, face on: platinum waves, pearls, a fur stole, her forearms on the parapet. */
function kay(pen: Pen, t: number, y: number): void {
  const x = KAY_X
  const L = kayLean(t)
  const clap = kayClap(t)
  const look = t > 69 && t < DEAD + 0.5 ? Math.max(-1, Math.min(1, (ballAt(t - 0.15)[0] - x) / 4)) : 0
  const sh: Pt = [x - 0.03 * L, y - 0.55 + 0.1 * L - 0.08 * clap]
  const head: Pt = [sh[0] - 0.02 * L + 0.03 * look, sh[1] - 0.36 + 0.03 * L]
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
  // Her forearms on the parapet, the gloved hands together; up under her chin, clapping, for Marty's point.
  const apart = 0.07 + 0.06 * clap * Math.abs(Math.sin((t - LUNGE) * Math.PI * 1.87))
  for (const sd of [-1, 1]) {
    const elbow: Pt = [x + sd * 0.3, y - 0.06 - 0.08 * clap]
    const hand: Pt = [x + sd * lerp(0.07, apart, clap), lerp(y - 0.06, head[1] + 0.32, clap)]
    path(pen, [[sh[0] + sd * 0.25, sh[1] + 0.12], elbow, hand], C.dress, 5.5)
    ellipse(pen, hand, 0.055, 0.045, C.glove)
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

/**
 * The cards' values (pips for games, Marty's and the opponent's) and the times each turns: the semifinal won 3–2; in
 * the final Marty, a game down, levels it on his point, and loses the last.
 */
function cardsOf(tb: Table, t: number): { m: number; o: number; mFlip: number; oFlip: number } {
  if (tb === A) return { m: t < FLIP_A ? 2 : 3, o: 2, mFlip: t - FLIP_A, oFlip: -9 }
  return { m: t < FLIP_M ? 1 : 2, o: t < FLIP_B ? 2 : 3, mFlip: t - FLIP_M, oFlip: t - FLIP_B }
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
  const ball = ballAt(t - 0.08)
  const look = Math.max(-1, Math.min(1, (ball[0] - x) / 2.2))
  const head: Pt = [x + 0.01 + 0.04 * look, sh[1] - 0.25]
  ellipse(pen, head, 0.17, 0.2, C.skinDim)
  ellipse(pen, add(head, [0.03 - 0.06 * look, -0.1]), 0.17, 0.11, C.hairGrey)
  ellipse(pen, add(head, [0.12 * look, 0.04]), 0.04, 0.045, mix(C.skinDim, C.skin, 0.4))
  // The board of flip-cards on its pole by his right hand.
  const { m, o, mFlip, oFlip } = cardsOf(tb, t)
  // The hand goes to whichever card is turning (or about to).
  const side = oFlip > -0.25 && oFlip < 1.5 ? 1 : 0
  const flip = side ? oFlip : mFlip
  const bx = x + 0.95
  const by = -2.05
  line(pen, [bx, by + 0.5], [bx - 0.05, FLOOR_BACK], C.iron, 1.6)
  rect(pen, bx - 0.4, by - 0.05, bx + 0.4, by + 0.5, C.iron)
  card(pen, bx - 0.2, by, m, mFlip, m - 1)
  card(pen, bx + 0.2, by, o, oFlip, o - 1)
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
  // Pips, laid like a die's: one in the middle, two or three on the diagonal.
  const LAY: Record<number, Pt[]> = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]] }
  const bars = (val: number, y0: number, y1: number) => {
    for (const [u, v] of LAY[val] ?? []) {
      const py = y + h / 2 + v * 0.115
      if (py < y0 + 0.03 || py > y1 - 0.03) continue
      ellipse(pen, [cx + u * 0.085, py], 0.036, 0.036, C.cardInk)
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
  const L = (lampOf(tb, t, x0) + lampOf(tb, t, x1)) / 2
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
/** Where the lamps hang from, high in the roof: they swing about it. */
const HUNG = -12

/**
 * The dust's own clock in the lamps' light: show time until the dead ball dies, then slowing to a settle, so the haze
 * in the light goes still as the hall does (the integral of `1 - 0.7 hush`).
 */
function settle(t: number): number {
  const L = 2.5
  const u = (t - DIES) / L
  if (u <= 0) return t
  const area = u >= 1 ? L * (0.5 + (u - 1)) : L * (u * u * u - (u * u * u * u) / 2)
  return t - 0.7 * area
}

/** How far into a lamp's cone (`dx` across from its axis, at height `y`) a point is: 1 on the axis, 0 at the edge. */
function inCone(dx: number, y: number): number {
  if (y < SHADE_Y || y > FLOOR) return 0
  const half = 0.42 + (1.08 * (y - SHADE_Y)) / (TOP - SHADE_Y)
  const v = 1 - Math.abs(dx) / half
  return v > 0 ? Math.sqrt(v) * (1 - 0.55 * smooth(y, TOP, FLOOR)) : 0
}

/**
 * The lamps: each swinging a touch on its long cord in the hall's draught (its light, its pools and the dust in it
 * going with it), a thin sheet of tobacco smoke hanging in the light over the table, a little dust turning in it, and
 * on the final's far lamp a pigeon until the house goes up. The lamp is its lit bulb and the white inside of its shade,
 * and the light is what it falls on (the green top, the floor): no aura round the bulb, and the cone in the air faint.
 */
function lamps(pen: Pen, tb: Table, t: number, f: Frame): void {
  const { p, k } = pen
  const ctx = ctxOf(p)
  const hz = busy(t)
  const calm = hush(t)
  for (const lx of lampXs(tb)) {
    if (lx + 2.6 < f.x0 || lx - 2.6 > f.x1) continue
    const L = lampOf(tb, t, lx)
    const swing = 0.0045 * sway(t, lx, 5.3) + 0.0025 * hz * sway(t, lx + 2, 2.2)
    p.push()
    p.translate(lx * k, HUNG * k)
    p.rotate(swing)
    p.translate(-lx * k, -HUNG * k)
    // The light down onto the table, faint in the smoky air, and its pools on the green top and the boards.
    if (L > 0.01) {
      const g = ctx.createLinearGradient(0, SHADE_Y * k, 0, TOP * k)
      g.addColorStop(0, rgba(pen, C.lamp, 0.08 * L))
      g.addColorStop(1, rgba(pen, C.lamp, 0.015 * L))
      ctx.save()
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo((lx - 0.42) * k, SHADE_Y * k)
      ctx.lineTo((lx + 0.42) * k, SHADE_Y * k)
      ctx.lineTo((lx + 1.5) * k, TOP * k)
      ctx.lineTo((lx - 1.5) * k, TOP * k)
      ctx.closePath()
      ctx.fill()
      // The pool on the table: on its top and its apron, not in the air over it.
      ctx.beginPath()
      ctx.rect(tb.x0 * k, TOP * k, (tb.x1 - tb.x0) * k, 0.2 * k)
      ctx.clip()
      oval(pen, [lx, TOP + 0.04], 1.9, 0.12, C.lamp, 0.42 * L)
      ctx.restore()
      oval(pen, [lx, FLOOR - 0.05], 2.4, 0.1, C.lamp, 0.1 * L)
      // The smoke hanging in the light over the table: one thin slow sheet, drifting and sinking as the hall goes quiet.
      const hx = lx + 0.45 * Math.sin(t * 0.11 + lx + 2) + 0.2 * sway(t, lx + 1, 7)
      const hy = TOP - 0.75 + 0.08 * Math.sin(t * 0.3 + 1 + lx) + 0.35 * calm
      p.push()
      p.translate(hx * k, hy * k)
      p.scale(1, 0.24)
      glow(pen, [0, 0], 1.25, C.lamp, (0.035 + 0.02 * hz) * L * (1 - 0.4 * calm))
      p.pop()
      // A little dust turning in it, fine and steady.
      motes(pen, settle(t), {
        n: 18,
        seed: Math.round(lx * 13),
        box: [lx - 2.1, SHADE_Y + 0.3 * calm, lx + 2.1, FLOOR + 0.3 * calm],
        size: [0.006, 0.013],
        color: C.bulb,
        alpha: 0.35 * L,
        drift: [0.035, -0.03],
        wander: 0.18,
        twinkle: 0,
        light: (x, y) => (x < f.x0 || x > f.x1 || y < f.y0 || y > f.y1 ? 0 : inCone(x - lx, y)),
      })
    }
    // The cord, the green enamel cone, its white inside and the bulb, lit.
    line(pen, [lx, HUNG], [lx, SHADE_Y - 0.5], C.iron, 0.8)
    shape(pen, [[lx - 0.1, SHADE_Y - 0.52], [lx + 0.1, SHADE_Y - 0.52], [lx + 0.45, SHADE_Y], [lx - 0.45, SHADE_Y]], C.shade)
    rect(pen, lx - 0.06, SHADE_Y - 0.6, lx + 0.06, SHADE_Y - 0.5, C.steel)
    ellipse(pen, [lx, SHADE_Y], 0.45, 0.06, mix(C.shade, C.shadeIn, 0.3 + 0.7 * L))
    ellipse(pen, [lx, SHADE_Y + 0.02], 0.11, 0.07, mix('#5C5A50', C.bulb, L))
    if (tb === B && lx > B.net) lampPigeon(pen, t, [lx, SHADE_Y - 0.6])
    p.pop()
  }
}

/* ------------------------------------------------------------------ the play: Marty's bats, Kletzki, Endo */

export function drawPlay(pen: Pen, t: number): void {
  contraption(pen, A, t, [TOSS_A], [IN_PAN_A])
  contraption(pen, B, t, [TOSS_B, TOSS_B2], [IN_PAN_B, IN_PAN_B2])
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
    // A smash is cocked right back and goes right through; a block barely swings. The sprung arm shudders after the
    // ball leaves it, hardest after a smash: the stroke is felt in the iron, not lit.
    const cock = s.kind === 'smash' ? COCK - 0.32 : s.kind === 'block' ? COCK + 0.12 : COCK
    const through = THROUGH * (s.kind === 'smash' ? 1.45 : s.kind === 'block' ? 0.5 : 1)
    if (d < -0.1) return lerp(READY, cock, ease((d + 0.32) / 0.22))
    if (d < 0) {
      const u = (d + 0.1) / 0.1
      return lerp(cock, tc, u * u)
    }
    if (d < 0.1) {
      const u = d / 0.1
      return tc + through * (1 - (1 - u) * (1 - u))
    }
    return lerp(tc + through, READY, ease((d - 0.1) / 0.45)) + (s.kind === 'smash' ? 0.07 : 0.05 * s.power) * ring(d - 0.1, 7, 0.18)
  }
  return READY
}

function contraption(pen: Pen, tb: Table, t: number, tosses: number[], inPans: number[]): void {
  const hub = hubOf(tb)
  const post = POST(tb)
  const pan0 = panOf(tb)
  // The pan's lever: flicked up on each toss, and dipping as he lands in it.
  let kick = 0
  for (const toss of tosses) {
    const dt = t - toss
    kick = Math.max(kick, dt >= 0 ? (dt < 0.07 ? dt / 0.07 : Math.exp(-(dt - 0.07) / 0.12)) : 0)
  }
  const dip = inPans.reduce((m, at) => Math.max(m, t >= at ? flash(t - at, 0.12) : 0), 0)
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

/** The bat's swing through a stroke, from behind the ball to past it, by kind: Kletzki's flat and hard, Endo's soft and up. */
function swing(s: Stroke): { back: Pt; thru: Pt } {
  const C0: Pt = [s.p[0] + 0.15, s.p[1] + 0.02]
  const off = (dx: number, dy: number): Pt => [C0[0] + dx, C0[1] + dy]
  switch (s.kind) {
    case 'smash':
      return { back: off(0.3, -0.5), thru: off(-0.55, 0.38) }
    case 'loop':
      return { back: off(0.3, 0.42), thru: off(-0.22, -0.6) }
    case 'lob':
      return { back: off(0.18, 0.38), thru: off(-0.14, -0.6) }
    case 'dead':
      return { back: off(0.08, 0.03), thru: off(-0.1, -0.04) }
    case 'miss':
      return s.who === 'endo' ? { back: off(0.3, -0.35), thru: off(-0.15, 0.3) } : { back: off(0.35, 0.1), thru: off(-0.45, -0.25) }
    default:
      return s.who === 'kletzki' ? { back: off(0.4, 0.08), thru: off(-0.45, -0.26) } : { back: off(0.34, 0.16), thru: off(-0.34, -0.36) }
  }
}

/** Where an opponent's bat waits between strokes: out in front of him, wherever his feet have got to. */
const readyOf = (who: 'kletzki' | 'endo', t: number): Pt => [hipAt(who, t) - 0.85, who === 'kletzki' ? -0.3 : -0.25]

function strokeKeys(strokes: Stroke[], who: 'kletzki' | 'endo'): Key[] {
  const keys: Key[] = []
  for (const s of strokes) {
    const C0: Pt = [s.p[0] + 0.15, s.p[1] + 0.02]
    const { back, thru } = swing(s)
    keys.push({ t: s.t - 0.3, p: readyOf(who, s.t - 0.3) }, { t: s.t - 0.11, p: back, lin: true }, { t: s.t, p: C0, lin: true }, { t: s.t + 0.11, p: thru, lin: true }, { t: s.t + 0.42, p: readyOf(who, s.t + 0.42) })
  }
  return keys
}

const KL_BAT_DOWN: Pt = [A.x1 - 0.32, TOP - 0.03]
const KL_KEYS: Key[] = (() => {
  const ready = (t: number) => readyOf('kletzki', t)
  const ks: Key[] = [
    { t: 0, p: ready(0) },
    { t: KNOCK - 0.22, p: ready(KNOCK) },
    { t: KNOCK, p: [A.x1 - 0.12, TOP - 0.08], lin: true },
    { t: KNOCK + 0.25, p: ready(KNOCK) },
  ]
  ks.push(...strokeKeys(STROKES.filter((s) => s.who === 'kletzki'), 'kletzki'))
  // After the miss: the bat drops to his side, and then he lays it on the table.
  const miss = STROKES.find((s) => s.who === 'kletzki' && s.kind === 'miss')!
  const low: Pt = [hipAt('kletzki', miss.t + 0.5) - 0.32, 0.12]
  ks.splice(ks.length - 1, 1, { t: miss.t + 0.5, p: low }, { t: BAT_DOWN - 0.3, p: low }, { t: BAT_DOWN, p: KL_BAT_DOWN })
  return ks
})()

/** Endo's bat under the ball he caught, as he carries it round. */
const onBat = (t: number): Pt => {
  const c = carryAt(t)
  return [c[0] + 0.02, c[1] + R + 0.07]
}
const EN_KEYS: Key[] = (() => {
  const ready = (t: number) => readyOf('endo', t)
  const ks: Key[] = [
    { t: 0, p: ready(0) },
    { t: ENDO_TAP - 0.25, p: ready(ENDO_TAP) },
    { t: ENDO_TAP, p: [B.x1 - 0.14, TOP - 0.1], lin: true },
    { t: ENDO_TAP + 0.3, p: ready(ENDO_TAP) },
  ]
  ks.push(...strokeKeys(STROKES.filter((s) => s.who === 'endo' && s.kind !== 'catch' && s.kind !== 'feed'), 'endo'))
  // After the lunge: turned round, the bat out low after the ball, and under it as it comes up off the floor.
  const lunge = ks.findIndex((k) => k.t > LUNGE + 0.3)
  ks.splice(lunge, 1, { t: OUT[0], p: [17.25, 0.55] }, { t: CATCH - 0.12, p: [onBat(CATCH)[0] + 0.05, onBat(CATCH)[1] + 0.1] }, { t: CATCH, p: onBat(CATCH) })
  // The pat back over the net: a flick off the face.
  const feed = STROKES.find((s) => s.who === 'endo' && s.kind === 'feed')!
  ks.push({ t: FEED, p: onBat(FEED), lin: true }, { t: FEED + 0.12, p: [feed.p[0] - 0.3, feed.p[1] - 0.25], lin: true }, { t: FEED + 0.45, p: ready(FEED + 0.45) })
  ks.sort((x, y) => x.t - y.t)
  // The bow: the bat to his side.
  ks.push({ t: BOW, p: ready(BOW) }, { t: BOW + 0.3, p: [hipAt('endo', BOW) - 0.25, 0.25] }, { t: BOW + 1.6, p: [hipAt('endo', BOW) - 0.25, 0.25] })
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
  /** How far the knees bend (cells the hip drops), and how far the front foot steps in. */
  crouch?: number
  step?: number
  /** His feet, when his footwork has them (else the stance or the stride). */
  feet?: [Pt, Pt]
  /** Seconds since his last hard stroke: his breath shows in the cold for a moment after it. */
  breath?: number
}

/** The hard strokes each opponent breathes out after, in the cold hall. */
const HARD = (who: 'kletzki' | 'endo'): number[] => STROKES.filter((s) => s.who === who && s.power > 0.3).map((s) => s.t)
const BREATHS = { kletzki: HARD('kletzki'), endo: HARD('endo') }
const sinceHard = (who: 'kletzki' | 'endo', t: number): number => lastOf(BREATHS[who], t).ago

/** A breath in the cold: two small clouds out of his mouth, drifting up and off, gone in a second. */
function breathe(pen: Pen, mouth: Pt, face: number, u: number, s: number): void {
  if (!(u >= 0 && u < 1.1)) return
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const a = 0.16 * Math.min(1, u * 7) * (1 - u / 1.1)
  ctx.save()
  ctx.fillStyle = rgba(pen, C.breath, a)
  ctx.beginPath()
  for (let j = 0; j < 2; j++) {
    const v = u * (1 - 0.3 * j)
    const x = mouth[0] - face * (0.08 + 0.32 * v) * s
    const y = mouth[1] - (0.05 + 0.3 * v * v) * s - 0.04 * j * s
    const r = (0.05 + 0.13 * v) * s
    ctx.moveTo((x + r) * k, y * k)
    ctx.arc(x * k, y * k, r * k, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/**
 * Footwork: each foot follows the hips a moment behind (the trailing foot later), and is lifted while it moves, so a
 * quick shift across reads as the side-step it is and a run in as a run.
 */
function footwork(who: 'kletzki' | 'endo', t: number, x: number, step = 0, face = 1): [Pt, Pt] {
  const dx = x - hipAt(who, t)
  const foot = (lag: number, off: number): Pt => {
    const f0 = hipAt(who, t - lag) + dx
    const f1 = hipAt(who, t - lag - 0.06) + dx
    const lift = Math.min(0.16, Math.abs(f0 - f1) * 1.1)
    return [f0 + off, FLOOR - lift]
  }
  return [foot(0.04, (-0.3 - step) * face), foot(0.15, 0.25 * face)]
}

function figure(pen: Pen, f: Figure): void {
  const s = f.h / 3.2
  const crouch = f.crouch ?? 0
  const hip: Pt = [f.x, FLOOR - 1.5 * s + crouch]
  const up = (d: number, side: number): Pt => [hip[0] - Math.sin(f.lean) * d * f.face + side * Math.cos(f.lean), hip[1] - Math.cos(f.lean) * d - side * Math.sin(f.lean) * f.face]
  // Legs: the stance, or the stride.
  const st = f.stride
  const swing = st === null ? 0 : 0.28 * Math.sin(st)
  const feet: Pt[] = f.feet ?? (st === null ? [[f.x - 0.3 - (f.step ?? 0), FLOOR], [f.x + 0.25, FLOOR]] : [[f.x - swing, FLOOR], [f.x + swing, FLOOR]])
  for (const [i, ft] of feet.entries()) {
    const knee: Pt = [(hip[0] + ft[0]) / 2 - (0.08 + 1.1 * crouch) * f.face, (hip[1] + ft[1]) / 2 + 0.02]
    const col = i === 0 ? C.trouser : mix(C.trouser, C.whiteShade, 0.6)
    path(pen, [[hip[0] + (i ? 0.06 : -0.06), hip[1]], knee, [ft[0], ft[1] - 0.08]], col, 7.5 * s)
    shape(pen, [[ft[0] - 0.17, ft[1]], [ft[0] - 0.15, ft[1] - 0.1], [ft[0] + 0.1, ft[1] - 0.11], [ft[0] + 0.1, ft[1]]], '#E8E5DA')
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
  if (f.breath !== undefined) breathe(pen, add(head, [-0.17 * s * f.face, 0.09 * s]), f.face, f.breath, s)
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
  const x = hipAt('kletzki', t) - 1.0 * u
  // Into every ball, the smashes from up on his toes and right over it; low and wide for the one he misses.
  let hit = 0
  let crouch = 0.04
  for (const s of STROKES) {
    if (s.who !== 'kletzki' || t < s.t - 0.5 || t > s.t + 0.8) continue
    const d = t - s.t
    hit = Math.max(hit, (s.kind === 'smash' ? 2.2 : 1) * (d >= 0 ? flash(d, 0.2) : smooth(d, -0.25, 0) * 0.5))
    crouch += (s.kind === 'miss' ? 0.22 : s.kind === 'loop' ? 0.16 : 0.07) * Math.exp(-((d + 0.05) * (d + 0.05)) / (2 * 0.14 * 0.14))
  }
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
    face: 1,
    crouch: walking || t >= WALK[1] ? 0 : crouch,
    feet: walking ? undefined : footwork('kletzki', t, x),
    breath: sinceHard('kletzki', t),
  })
  if (down) {
    // His bat lies on the end of the table where he put it.
    rotEllipse(pen, [KL_BAT_DOWN[0], TOP - 0.03], 0.2, 0.035, 0, C.woodDark)
    rotEllipse(pen, [KL_BAT_DOWN[0], TOP - 0.05], 0.18, 0.02, 0, C.rubberDark)
    line(pen, [KL_BAT_DOWN[0] + 0.2, TOP - 0.03], [KL_BAT_DOWN[0] + 0.42, TOP - 0.03], C.wood, 3.2)
  }
}

const ENDO_DIP: Partial<Record<Stroke['kind'], number>> = { lob: 0.26, dead: 0.06, miss: 0.34, catch: 0.22, feed: 0.04 }

/** Endo's small life: a knee bend and a shift of weight into each stroke, a step in to each lob, a slow breath. */
function endoBody(t: number): { crouch: number; shift: number; step: number } {
  let crouch = 0.03 + 0.015 * Math.sin(t * 1.7)
  let shift = 0
  let step = 0
  for (const s of STROKES) {
    if (s.who !== 'endo') continue
    const d = t - s.t
    if (d < -0.6 || d > 0.9) continue
    const into = Math.exp(-((d + 0.05) * (d + 0.05)) / (2 * 0.12 * 0.12))
    // Low under his lobs, deep in the lunge, bent to the catch; hardly moving for the dead shot.
    crouch += (ENDO_DIP[s.kind] ?? 0.12) * into
    shift -= (s.kind === 'dead' || s.kind === 'catch' || s.kind === 'feed' ? 0.02 : 0.08) * into
    if (s.kind === 'lob') step = Math.max(step, smooth(d, -0.5, -0.12) * (1 - smooth(d, 0.25, 0.85)))
  }
  return { crouch, shift, step: 0.32 * step }
}

function endo(pen: Pen, t: number): void {
  // The bow: down on the beat, held, and up.
  const bow = t < BOW ? 0 : t < BOW + 0.3 ? ease((t - BOW) / 0.3) : t < BOW + 1.0 ? 1 : 1 - ease((t - BOW - 1.0) / 0.6)
  const b = endoBody(t)
  const face = endoFace(t)
  const x = hipAt('endo', t) + b.shift * face - 0.5 * b.step
  figure(pen, {
    x,
    h: ENDO_H,
    lean: 0.06 + 0.12 * b.crouch + 0.7 * bow,
    bat: t >= CATCH && t <= FEED ? onBat(t) : track(EN_KEYS, t),
    batKind: 'endo',
    hair: 'black',
    stride: null,
    face,
    crouch: b.crouch,
    feet: footwork('endo', t, x, 0.5 * b.step, face),
    breath: sinceHard('endo', t),
  })
}

import type p5 from 'p5'
import { mixHex, type Piece, type PieceCtx } from '../../../../parts'
import { BAND_TOP, BOOKS, CUP, DESK, FAR_CUP, GLASS, LAMP, MUG, POT, R, SILL, WALKMAN, WINDOW, type Book } from './desk'
import { MUSIC_END, heldAt } from './music'
import { LANDINGS, NODS, SHOULDER, ballAt, squashAt } from './route'
import { cat } from './cat'
import { bloom, clock, curtain, draughtAt, scrim, fairyGlowAt, fairyLights, grain, headlights, motes, notes, print, vignette } from './decor'
import { ceiling, hanger, highShelf, underDesk } from './room'
import { ballShadow, contacts, wallShadows } from './shade'
import { camera } from './camera'
import { titlesAt } from './titles'
import { REFILL, doodle, hands, knob, liftAt } from './hands'
import { moth, mothShadow } from './moth'
import { rimAt, rimLine } from './rim'
import { reflection } from './reflection'
import { cable, walkman } from './walkman'
import { rgba, viewOf } from './canvas'
import { flashRoom, night } from './sky'
import { CREAM, INK, MOUTH, hash, lampAt, lampColor, lightAt, lit, skyAt } from './world'

/**
 * Everything but the ball, each a drawing told show time, in cells (the drawing is scaled so a unit is a cell).
 *
 * - The room: the indigo wall, violet by the window and warm where the lamp reaches it; the print and the pinned
 *   polaroids; the window, and through it the evening (`sky.ts`); the frame, the curtain, the fairy lights
 *   (`decor.ts`), the sill, and the plant pot on it.
 * - The desk, its edge lit under the lamp; the mug, and its steam; the cat (`cat.ts`); the stair of books; the
 *   headphones; the lamp.
 * - Over the ball: its shading from the lamp's side; the cushion's near lip, so the ball sits in the cup rather than on it; then the lamp's bloom, the
 *   vignette and the grain.
 *
 * One job to a thing. The window is the evening: dusk, the clouds, the rain heaviest through the middle of the night,
 * then clear with the moon up. The steam is the held sound, the pad and the keys, and thins as the tea cools through
 * the night; the fairy lights breathe with it. The lamp is only the light. The cup plays the kick, and the ball nods
 * to it. The pot is what the ball comes back off, and it rocks when it does. The cat is the audience.
 */

type Ctx = CanvasRenderingContext2D

const scenery = <S>(name: string, draw: (p: p5, s: S, c: PieceCtx) => void, over?: (p: p5, s: S, c: PieceCtx) => void): Piece<S> => ({
  name,
  weight: 0,
  place: () => null,
  draw,
  over,
})

/** Draw in cells: the canvas scaled by the cell size, a line's width in cells. */
function inCells(p: p5, c: PieceCtx, fn: (ctx: Ctx, lw: number) => void): void {
  const ctx = p.drawingContext as Ctx
  ctx.save()
  ctx.scale(c.k, c.k)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  fn(ctx, c.weight / c.k)
  ctx.restore()
}



function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const q = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + q, y)
  ctx.lineTo(x + w - q, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + q)
  ctx.lineTo(x + w, y + h - q)
  ctx.quadraticCurveTo(x + w, y + h, x + w - q, y + h)
  ctx.lineTo(x + q, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - q)
  ctx.lineTo(x, y + q)
  ctx.quadraticCurveTo(x, y, x + q, y)
  ctx.closePath()
}

function stroke(ctx: Ctx, lw: number, color = INK): void {
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.stroke()
}

/* ------------------------------------------------------------------ the room */

const WALL = '#2A2742'
const WALL_LOW = '#231F38'
const WALL_LIT = '#C27450'
const FRAME = '#8A7F8E'
const FRAME_LIT = '#F0D6B4'
/** The sash bars, half their width. */
const BAR = 0.045

function wall(ctx: Ctx, t: number): void {
  const v = viewOf(ctx)
  const lamp = lampAt(t)
  const sky = skyAt(t)
  const wg = ctx.createLinearGradient(0, -6, 0, 0)
  wg.addColorStop(0, mixHex(WALL, '#3A3058', sky.dusk * 0.5))
  wg.addColorStop(1, WALL_LOW)
  ctx.fillStyle = wg
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, DESK.y - v.y0 + 1)
  // The window's light on the wall round it: the sky's colour, strong at dusk, faint at night.
  const cx = (WINDOW.x0 + WINDOW.x1) / 2
  const cy = (WINDOW.y0 + WINDOW.y1) / 2
  const w = ctx.createRadialGradient(cx, cy + 0.6, 0.5, cx, cy + 0.6, 4.6)
  w.addColorStop(0, rgba(sky.low, 0.22 + 0.28 * sky.dusk))
  w.addColorStop(1, rgba(sky.low, 0))
  ctx.fillStyle = w
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, DESK.y - v.y0 + 1)
  // The fairy lights' warmth along the wall over the window.
  const f = fairyGlowAt(t)
  const fg = ctx.createRadialGradient(cx, WINDOW.y0 + 0.4, 0.2, cx, WINDOW.y0 + 0.4, 3.2)
  fg.addColorStop(0, rgba('#FFC890', 0.13 * f))
  fg.addColorStop(1, rgba('#FFC890', 0))
  ctx.fillStyle = fg
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, DESK.y - v.y0 + 1)
  // The lamp's light on the wall: a warm round of it behind the books and the cup, warmest low down.
  const g = ctx.createRadialGradient(LAMP.pool.x + 0.1, -0.15, 0.05, LAMP.pool.x + 0.1, -0.7, 3.8)
  const warm = lampColor(t)
  g.addColorStop(0, rgba(mixHex(WALL_LIT, warm, 0.45), 0.9 * lamp))
  g.addColorStop(0.3, rgba(WALL_LIT, 0.5 * lamp))
  g.addColorStop(0.65, rgba(mixHex(WALL_LIT, '#6A3F5A', 0.5), 0.2 * lamp))
  g.addColorStop(1, rgba(WALL, 0))
  ctx.fillStyle = g
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, DESK.y - v.y0 + 1)
}

/** The window's frame, its bars, and the sill. */
function frame(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const shade = (x: number, y: number) => lit(FRAME, FRAME_LIT, lightAt(x, y, 1) * lamp * 0.9)
  const { x0, x1, y0, y1, frame: F } = WINDOW
  // The four sides of the frame, each lit as its middle is.
  const side = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.fillStyle = shade(x + w / 2, y + h / 2)
    ctx.fill()
  }
  side(x0, y0, x1 - x0, F)
  side(x0, y0, F, y1 - y0)
  side(x1 - F, y0, F, y1 - y0)
  // The sash bars.
  const m = WINDOW.mullion
  const tr = WINDOW.transom
  side(m - BAR, GLASS.y0, BAR * 2, GLASS.y1 - GLASS.y0)
  side(GLASS.x0, tr - BAR, GLASS.x1 - GLASS.x0, BAR * 2)
  // Lines: the frame's outer edge, the glass's edge, the bars.
  ctx.beginPath()
  ctx.rect(x0, y0, x1 - x0, y1 - y0)
  stroke(ctx, lw)
  ctx.beginPath()
  ctx.rect(GLASS.x0, GLASS.y0, GLASS.x1 - GLASS.x0, GLASS.y1 - GLASS.y0)
  stroke(ctx, lw * 0.6)
  ctx.beginPath()
  ctx.moveTo(m - BAR, GLASS.y0)
  ctx.lineTo(m - BAR, tr - BAR)
  ctx.moveTo(m + BAR, GLASS.y0)
  ctx.lineTo(m + BAR, tr - BAR)
  ctx.moveTo(m - BAR, tr + BAR)
  ctx.lineTo(m - BAR, GLASS.y1)
  ctx.moveTo(m + BAR, tr + BAR)
  ctx.lineTo(m + BAR, GLASS.y1)
  ctx.moveTo(GLASS.x0, tr - BAR)
  ctx.lineTo(m - BAR, tr - BAR)
  ctx.moveTo(GLASS.x0, tr + BAR)
  ctx.lineTo(m - BAR, tr + BAR)
  ctx.moveTo(m + BAR, tr - BAR)
  ctx.lineTo(GLASS.x1, tr - BAR)
  ctx.moveTo(m + BAR, tr + BAR)
  ctx.lineTo(GLASS.x1, tr + BAR)
  stroke(ctx, lw * 0.6)
  // The sill: a ledge a little wider than the frame, its top catching the light, its front in shade.
  const sx0 = SILL.x0
  const sx1 = SILL.x1
  ctx.beginPath()
  ctx.rect(sx0, SILL.y, sx1 - sx0, SILL.thick)
  const g = ctx.createLinearGradient(sx0, 0, sx1, 0)
  for (let i = 0; i <= 6; i++) {
    const x = sx0 + ((sx1 - sx0) * i) / 6
    g.addColorStop(i / 6, lit('#8E8296', FRAME_LIT, lightAt(x, SILL.y, 1) * lamp))
  }
  ctx.fillStyle = g
  ctx.fill()
  stroke(ctx, lw)
  // The apron under it, set back.
  ctx.beginPath()
  ctx.rect(x0 + 0.06, SILL.y + SILL.thick, x1 - x0 - 0.12, 0.1)
  ctx.fillStyle = mixHex(WALL, '#6E6480', 0.45)
  ctx.fill()
  stroke(ctx, lw * 0.6)
}

/* ------------------------------------------------------------------ the pot */

/** How far the pot is rocked at `t` (radians, clockwise), after the ball comes back off it. */
function potRock(t: number): number {
  let a = 0
  for (let i = LANDINGS.length - 1; i >= 0; i--) {
    const l = LANDINGS[i]
    if (l.on !== 'pot') continue
    const s = t - l.t
    if (s < 0) continue
    if (s > 3) break
    a += -0.07 * Math.exp(-s / 0.45) * Math.sin(s * 9)
  }
  return a
}

function pot(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const rock = potRock(t)
  const rim = rimAt(t)
  const { x, halfW, h } = POT
  const base = SILL.y
  ctx.save()
  // It rocks on the corner away from the ball.
  const pivot = rock < 0 ? x - halfW * 0.78 : x + halfW * 0.78
  ctx.translate(pivot, base)
  ctx.rotate(rock)
  ctx.translate(-pivot, -base)
  // The plant: a few long leaves, dark against the glass, stirring very slightly in the cold off the window.
  const leaves: [number, number, number][] = [[-0.75, 0.5, 0], [-0.45, 0.66, 1], [-0.2, 0.8, 2], [0.05, 0.74, 3], [0.3, 0.62, 4], [0.55, 0.52, 5], [0.85, 0.42, 6]]
  const stir = rock * 2.5
  for (const [ang, len, i] of leaves) {
    const a = ang + 0.04 * Math.sin(t * 0.37 + i * 1.7) + stir * (0.6 + i * 0.1)
    const sx = x + (i - 3) * 0.035
    const sy = base - h + 0.04
    const tx = sx + Math.sin(a) * len
    const ty = sy - Math.cos(a) * len
    const nx = -Math.cos(a) * 0.09
    const ny = -Math.sin(a) * 0.09
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo((sx + tx) / 2 + nx, (sy + ty) / 2 + ny, tx, ty)
    ctx.quadraticCurveTo((sx + tx) / 2 - nx * 0.4, (sy + ty) / 2 - ny * 0.4, sx, sy)
    ctx.fillStyle = lit(i % 2 ? '#2F4A45' : '#355A4A', i % 2 ? '#5F8F6E' : '#79A86B', Math.min(1, lightAt(tx, ty, 1) * lamp + 0.15))
    ctx.fill()
    stroke(ctx, lw * 0.6)
    // Against the glass, the window's light round its edge.
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.strokeStyle = rgba(rim.color, rim.a * 0.45)
    ctx.lineWidth = lw * 0.9
    ctx.stroke()
    ctx.restore()
  }
  // The pot: clay, a rim, tapering to its foot.
  ctx.beginPath()
  ctx.moveTo(x - halfW, base - h + 0.1)
  ctx.lineTo(x + halfW, base - h + 0.1)
  ctx.lineTo(x + halfW * 0.78, base)
  ctx.lineTo(x - halfW * 0.78, base)
  ctx.closePath()
  ctx.fillStyle = lit('#7A4636', '#D07E5E', Math.min(1, lightAt(x, base - h / 2, 1) * lamp + 0.12))
  ctx.fill()
  stroke(ctx, lw)
  roundRect(ctx, x - halfW - 0.03, base - h, halfW * 2 + 0.06, 0.12, 0.02)
  ctx.fillStyle = lit('#8A5240', '#E0946E', Math.min(1, lightAt(x, base - h, 1) * lamp + 0.12))
  ctx.fill()
  stroke(ctx, lw)
  rimLine(ctx, lw, t, [{ x: x - halfW, y: base - h + lw * 1.4 }, { x: x + halfW, y: base - h + lw * 1.4 }])
  ctx.restore()
}

/**
 * The window's light along the tops of the things standing in front of it (`rim.ts`): the books, the mug, the
 * Walkman. (By the lamp, the headphones are past its reach.) The kitten's is its own (`cat.ts`), and the pot's and the plant's are drawn with them.
 */
function windowRims(ctx: Ctx, lw: number, t: number): void {
  const at = (x0: number, x1: number, y: number) => [{ x: x0, y: y + lw * 1.4 }, { x: x1, y: y + lw * 1.4 }]
  BOOKS.forEach((b, i) => rimLine(ctx, lw, t, at(b.x0 + 0.04, b.x1 - 0.04, b.top + pressed(i, t))))
  if (liftAt(t) <= 0.001) rimLine(ctx, lw, t, at(MUG.x - MUG.halfW + 0.05, MUG.x + MUG.halfW - 0.05, -MUG.h))
  rimLine(ctx, lw, t, at(WALKMAN.x0 + 0.05, WALKMAN.x1 - 0.05, -WALKMAN.h), 0.8)
}

/* ------------------------------------------------------------------ the desk */

function desk(ctx: Ctx, lw: number, t: number): void {
  const v = viewOf(ctx)
  const lamp = lampAt(t)
  // Under the desk: the drawers, the floor, the rug (`room.ts`).
  underDesk(ctx, lw, t)
  // Its front edge, lit along under the lamp.
  const g = ctx.createLinearGradient(v.x0, 0, v.x1, 0)
  const n = 10
  for (let i = 0; i <= n; i++) {
    const x = v.x0 + ((v.x1 - v.x0) * i) / n
    g.addColorStop(i / n, lit('#3A2733', mixHex('#B47148', lampColor(t), 0.25), lightAt(x, 0.1) * lamp))
  }
  ctx.fillStyle = g
  ctx.fillRect(v.x0 - 1, DESK.y, v.x1 - v.x0 + 2, DESK.face)
  // The wood's grain along its edge, faint.
  ctx.strokeStyle = rgba('#2A1A22', 0.28)
  ctx.lineWidth = 0.012
  for (let i = 0; i < 4; i++) {
    const y = DESK.y + 0.06 + i * 0.055
    ctx.beginPath()
    for (let x = Math.floor(v.x0) - 1; x <= v.x1 + 1; x += 0.25) {
      const yy = y + Math.sin(x * (0.7 + i * 0.23) + i * 2) * 0.012
      if (x === Math.floor(v.x0) - 1) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  // The top's edge catches the light: a thin bright line along it where the lamp is.
  const e = ctx.createLinearGradient(v.x0, 0, v.x1, 0)
  for (let i = 0; i <= n; i++) {
    const x = v.x0 + ((v.x1 - v.x0) * i) / n
    e.addColorStop(i / n, rgba(lampColor(t), 0.75 * lightAt(x, 0) * lamp))
  }
  ctx.fillStyle = e
  ctx.fillRect(v.x0 - 1, DESK.y, v.x1 - v.x0 + 2, 0.035)
  ctx.beginPath()
  ctx.moveTo(v.x0 - 1, DESK.y)
  ctx.lineTo(v.x1 + 1, DESK.y)
  ctx.moveTo(v.x0 - 1, DESK.y + DESK.face)
  ctx.lineTo(v.x1 + 1, DESK.y + DESK.face)
  stroke(ctx, lw)
}

/* ------------------------------------------------------------------ the mug */

/**
 * How hot the tea still is: 1, cooling to under half by about midnight, when someone takes the mug away and brings it
 * back hot (`REFILL`, `hands.ts`); that cools again toward the end.
 */
const warmth = (t: number): number =>
  t < REFILL ? 1 - 0.62 * Math.min(1, t / MUSIC_END) : 1 - 0.45 * Math.min(1, (t - REFILL) / (MUSIC_END - REFILL))

function mug(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const { x, halfW, h } = MUG
  const x0 = x - halfW
  const x1 = x + halfW
  const top = -h
  const l = lightAt(x1, -h / 2) * lamp
  // The handle, on the dark side.
  ctx.beginPath()
  ctx.moveTo(x0 + 0.02, top + 0.14)
  ctx.bezierCurveTo(x0 - 0.3, top + 0.12, x0 - 0.3, top + 0.48, x0 + 0.02, top + 0.46)
  ctx.lineWidth = 0.075
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.lineWidth = 0.075 - lw * 2
  ctx.strokeStyle = lit('#5A4058', '#D79A9C', l * 0.5)
  ctx.stroke()
  // The body: cream, lit from the right.
  roundRect(ctx, x0, top, halfW * 2, h, 0.06)
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  g.addColorStop(0, lit('#5A4058', '#D79A9C', l * 0.4))
  g.addColorStop(0.65, lit('#7A5470', '#EBB0AA', l))
  g.addColorStop(1, lit('#6E4C66', '#F6C6BA', l))
  ctx.fillStyle = g
  ctx.fill()
  stroke(ctx, lw)
  // Its rim.
  ctx.beginPath()
  ctx.moveTo(x0 + 0.03, top + 0.05)
  ctx.lineTo(x1 - 0.03, top + 0.05)
  stroke(ctx, lw * 0.55, rgba(INK, 0.6))
  // The tea bag's string over the rim and down its front, and its paper tag, stirring a little in the draught off the
  // window that moves the curtain.
  const sway = -draughtAt(t) * 1.4
  const knot = { x: x + 0.08, y: top + 0.01 }
  const tag = { x: knot.x + 0.04 + sway * 0.12, y: top + 0.27 }
  ctx.beginPath()
  ctx.moveTo(knot.x, knot.y)
  ctx.quadraticCurveTo(knot.x + 0.035, top + 0.14, tag.x, tag.y - 0.055)
  stroke(ctx, lw * 0.35, rgba('#EDE2CC', 0.45 + 0.4 * l))
  ctx.save()
  ctx.translate(tag.x, tag.y - 0.055)
  ctx.rotate(0.08 + sway)
  roundRect(ctx, -0.045, 0, 0.09, 0.11, 0.01)
  ctx.fillStyle = lit('#8A7C78', '#F2E6D2', l)
  ctx.fill()
  stroke(ctx, lw * 0.5)
  ctx.beginPath()
  ctx.moveTo(-0.025, 0.065)
  ctx.lineTo(0.025, 0.065)
  stroke(ctx, lw * 0.35, rgba('#B0703E', 0.55))
  ctx.restore()
}

/**
 * The steam: three thin wisps off the tea, curling as they rise and gone by a hand's height. They are as full as the
 * held sound is (the pad and the keys), and thinner through the night as the tea cools.
 */
function steam(ctx: Ctx, t: number): void {
  const strength = warmth(t) * (0.3 + 0.7 * heldAt(t))
  const top = -MUG.h - 0.02
  // Under the sill: it rises to just short of the sill's underside and is gone there, not up across its front.
  const room = top - (SILL.y + SILL.thick + 0.12)
  const rise = room * (0.75 + 0.25 * strength)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let w = 0; w < 3; w++) {
    const x0 = MUG.x - 0.12 + w * 0.12
    const phase = t * (0.5 + w * 0.07) + w * 2.1
    const breath = 0.65 + 0.35 * Math.sin(phase * 1.3)
    // Each wisp one smooth line, curling as it rises (a slow wave that grows as it goes up, the wave itself drifting
    // up), faded in off the tea and out at its top along its length.
    ctx.beginPath()
    const n = 24
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const y = top - u * rise
      const x = x0 + Math.sin(u * 6 - phase * 2 + w) * (0.03 + 0.12 * u * u) + 0.06 * u * Math.sin(phase * 0.3 + w)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    for (const [width, share] of [[0.16, 0.45], [0.07, 1]] as const) {
      const a = strength * 0.3 * breath * share
      const g = ctx.createLinearGradient(0, top, 0, top - rise)
      g.addColorStop(0, rgba(CREAM, 0))
      g.addColorStop(0.2, rgba(CREAM, a))
      g.addColorStop(0.55, rgba(CREAM, a * 0.8))
      g.addColorStop(1, rgba(CREAM, 0))
      ctx.strokeStyle = g
      ctx.lineWidth = width
      ctx.stroke()
    }
  }
}

/* ------------------------------------------------------------------ the books */

/** How far a book is pressed down at `t` by the ball landing on it (cells). */
function pressed(i: number, t: number): number {
  let d = 0
  for (let j = LANDINGS.length - 1; j >= 0; j--) {
    const l = LANDINGS[j]
    const s = t - l.t
    if (s < 0) continue
    if (s > 1.2) break
    if (l.on === 'book' && l.book !== undefined && l.book <= i) d += 0.012 * l.s * Math.exp(-s / 0.12) * Math.cos(s * 22)
  }
  return d
}

function book(ctx: Ctx, lw: number, b: Book, i: number, t: number): void {
  const lamp = lampAt(t)
  const d = pressed(i, t)
  const top = b.top + d
  const h = b.bottom - top
  const l = lightAt(b.x1, (top + b.bottom) / 2) * lamp
  // The spine, toward us: its cloth, darker away from the lamp, with a band near each end and a label.
  roundRect(ctx, b.x0, top, b.x1 - b.x0, h, 0.03)
  const g = ctx.createLinearGradient(b.x0, 0, b.x1, 0)
  g.addColorStop(0, lit(mixHex(b.cover, '#120E0C', 0.62), b.cover, l * 0.35))
  g.addColorStop(1, lit(mixHex(b.cover, '#120E0C', 0.45), mixHex(b.cover, '#FFF2DA', 0.18), 0.2 + 0.8 * l))
  ctx.fillStyle = g
  ctx.fill()
  ctx.fillStyle = rgba(mixHex(b.cover, '#E9D9B8', 0.5), 0.55)
  ctx.fillRect(b.x0 + 0.1, top + 0.03, 0.03, h - 0.06)
  ctx.fillRect(b.x1 - 0.13, top + 0.03, 0.03, h - 0.06)
  const lx = b.x0 + (b.x1 - b.x0) * 0.42
  const lwid = Math.min(0.42, (b.x1 - b.x0) * 0.3)
  roundRect(ctx, lx, top + h * 0.3, lwid, h * 0.4, 0.015)
  ctx.fillStyle = rgba(mixHex(b.cover, '#EFE4CE', 0.6), 0.45 + 0.3 * l)
  ctx.fill()
  // Its title, written on the label by hand: a line and a shorter one, faint.
  ctx.strokeStyle = rgba(INK, 0.3 + 0.15 * l)
  ctx.lineWidth = lw * 0.45
  for (const [k, len] of [[0, 0.7 + 0.2 * hash(i, 41)], [1, 0.35 + 0.25 * hash(i, 43)]] as const) {
    const y = top + h * (0.43 + k * 0.15)
    ctx.beginPath()
    for (let u = 0; u <= 1.0001; u += 0.05) {
      const x = lx + lwid * (0.14 + 0.72 * len * u)
      const yy = y + (Math.sin(u * 11 + i * 3 + k) * 0.6 + Math.sin(u * 4.3 + i + k * 2) * 0.4) * 0.0045
      if (u === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  roundRect(ctx, b.x0, top, b.x1 - b.x0, h, 0.03)
  stroke(ctx, lw)
  // The middle one's ribbon, out of its pages at the left end, lying down onto the book under it.
  if (i === 1) {
    ctx.beginPath()
    ctx.moveTo(b.x0 + 0.01, top + h * 0.45)
    ctx.quadraticCurveTo(b.x0 - 0.07, top + h * 0.55, b.x0 - 0.05, b.bottom - 0.004)
    ctx.lineTo(b.x0 - 0.1, b.bottom - 0.004)
    ctx.lineCap = 'butt'
    ctx.lineWidth = 0.028 + lw
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = 0.028 - lw * 0.6
    ctx.strokeStyle = lit('#5A2420', '#C8564A', l * 0.8 + 0.1)
    ctx.stroke()
    ctx.lineCap = 'round'
  }
  // Its top edge catches the lamp.
  ctx.fillStyle = rgba(lampColor(t), 0.5 * l)
  ctx.fillRect(b.x0 + 0.05, top, b.x1 - b.x0 - 0.08, 0.02)
}

/* ------------------------------------------------------------------ the headphones */

/** How far the cushion is pressed at `t`: under the ball's landings in it and under each nod's kick. */
function cushion(t: number): number {
  let d = 0
  for (let j = LANDINGS.length - 1; j >= 0; j--) {
    const l = LANDINGS[j]
    const s = t - l.t
    if (s < 0) continue
    if (s > 1) break
    if (l.on === 'cup') d += 0.03 * l.s * Math.exp(-s / 0.1)
  }
  // The kick's push: the cushion gives as the ball leaves it.
  for (let j = NODS.length - 1; j >= 0; j--) {
    const n = NODS[j]
    const s = t - n.t
    if (s < -0.05) continue
    if (s > 0.6) break
    d += n.h * 0.18 * Math.exp(-((s / 0.05) ** 2))
  }
  return d
}

const SHELL = '#2A2638'
const SHELL_LIT = '#7A6A80'
const PAD = '#3F3548'
const PAD_LIT = '#B08A86'

/** The near cup's cushion, from the side: a soft pad with rounded shoulders and a hollow between them. */
function cushionPath(ctx: Ctx, top: number): void {
  const x = CUP.x
  const w = CUP.halfW
  const s = SHOULDER
  const base = CUP.top + 0.17
  ctx.beginPath()
  ctx.moveTo(x - w + 0.02, base)
  ctx.bezierCurveTo(x - w - 0.03, base - 0.08, x - w + 0.02, top, x - s - 0.02, top)
  ctx.quadraticCurveTo(x - s * 0.55, top, x - s * 0.4, top + CUP.hollow * 0.45)
  ctx.quadraticCurveTo(x, top + CUP.hollow * 1.35, x + s * 0.4, top + CUP.hollow * 0.45)
  ctx.quadraticCurveTo(x + s * 0.55, top, x + s + 0.02, top)
  ctx.bezierCurveTo(x + w - 0.02, top, x + w + 0.03, base - 0.08, x + w - 0.02, base)
  ctx.closePath()
}

function headphones(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const warm = lampColor(t)
  const top = CUP.top + cushion(t)
  // The band: from a yoke on the near cup's far side, up in an arch, and down onto the standing cup's crown.
  const a = { x: CUP.x + CUP.halfW + 0.02, y: CUP.top + 0.2 }
  const b = { x: FAR_CUP.x, y: -FAR_CUP.h + 0.04 }
  const c1 = { x: a.x + 0.12, y: BAND_TOP - 0.18 }
  const c2 = { x: b.x - 0.02, y: BAND_TOP - 0.34 }
  const band = () => {
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y)
  }
  band()
  ctx.lineWidth = 0.1
  ctx.strokeStyle = INK
  ctx.stroke()
  band()
  ctx.lineWidth = 0.1 - lw * 2
  ctx.strokeStyle = lit(SHELL, SHELL_LIT, lightAt((a.x + b.x) / 2, BAND_TOP, 0) * lamp * 0.7)
  ctx.stroke()
  // The padding along the top of the arch.
  ctx.save()
  ctx.beginPath()
  ctx.rect(a.x + 0.25, BAND_TOP - 1, b.x - a.x - 0.35, 1.25)
  ctx.clip()
  band()
  ctx.lineWidth = 0.05
  ctx.strokeStyle = lit(PAD, PAD_LIT, lightAt(a.x + 0.6, BAND_TOP) * lamp * 0.8)
  ctx.stroke()
  ctx.restore()
  // The far cup, on its edge: the shell away from us, the cushion toward the near cup.
  const fx = FAR_CUP.x
  const fw = FAR_CUP.halfW
  const fh = FAR_CUP.h
  roundRect(ctx, fx - fw, -fh, fw * 2, fh, 0.16)
  ctx.fillStyle = lit(SHELL, SHELL_LIT, lightAt(fx, -fh / 2) * lamp * 0.8)
  ctx.fill()
  stroke(ctx, lw)
  roundRect(ctx, fx - fw - 0.05, -fh + 0.05, 0.16, fh - 0.1, 0.07)
  ctx.fillStyle = lit(PAD, PAD_LIT, lightAt(fx - fw, -fh / 2) * lamp)
  ctx.fill()
  stroke(ctx, lw)
  // The yoke on the near cup.
  roundRect(ctx, CUP.x + CUP.halfW - 0.08, CUP.top + 0.13, 0.14, 0.12, 0.03)
  ctx.fillStyle = lit(SHELL, SHELL_LIT, 0.4 * lamp)
  ctx.fill()
  stroke(ctx, lw * 0.8)
  // The near cup's shell, lying on its back.
  const w = CUP.halfW * 0.94
  roundRect(ctx, CUP.x - w, CUP.top + 0.15, w * 2, -CUP.top - 0.15, 0.07)
  const l = lightAt(CUP.x, -0.15) * lamp
  const g = ctx.createLinearGradient(CUP.x - w, 0, CUP.x + w, 0)
  g.addColorStop(0, lit(SHELL, SHELL_LIT, l * 0.3))
  g.addColorStop(1, lit(SHELL, SHELL_LIT, l * 0.9))
  ctx.fillStyle = g
  ctx.fill()
  stroke(ctx, lw)
  // Its cushion, as pressed.
  cushionPath(ctx, top)
  const pg = ctx.createLinearGradient(0, top, 0, CUP.top + 0.17)
  pg.addColorStop(0, lit(PAD, PAD_LIT, l))
  pg.addColorStop(1, lit(PAD, PAD_LIT, l * 0.5))
  ctx.fillStyle = pg
  ctx.fill()
  stroke(ctx, lw)
  // The lamp along the cushion's far shoulder.
  ctx.beginPath()
  ctx.moveTo(CUP.x + SHOULDER * 0.5, top + 0.02)
  ctx.quadraticCurveTo(CUP.x + SHOULDER + 0.06, top - 0.005, CUP.x + CUP.halfW - 0.02, top + 0.07)
  ctx.lineWidth = 0.016
  ctx.strokeStyle = rgba(warm, 0.55 * l)
  ctx.stroke()
}

/**
 * The ball's shading, over it and under the cushion's lip: a ping-pong ball's matt roundness, a soft shine on the side
 * toward the lamp and a dusk on the side away, the shine fading out along the sill where the window is the light.
 */
function ballShine(ctx: Ctx, lw: number, t: number): void {
  const b = ballAt(t)
  const q = squashAt(t)
  const y = b.y + R * q
  const rx = R * (1 + q) - lw * 0.5
  const ry = R * (1 - q) - lw * 0.5
  if (rx <= 0 || ry <= 0) return
  const l = lightAt(b.x, b.y) * lampAt(t)
  // Toward the lamp's mouth in its light; straight up, the window's way, out of it.
  const dx = MOUTH.x - b.x
  const dy = MOUTH.y - b.y
  const d = Math.hypot(dx, dy) || 1
  const w = Math.min(1, l * 1.6)
  let ux = (dx / d) * w
  let uy = (dy / d) * w - (1 - w)
  const u = Math.hypot(ux, uy) || 1
  ux /= u
  uy /= u
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(b.x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.clip()
  // The maker's stamp, faint, turning as it rolls (the stage's turn: a cell of travel is 1/R radians, clockwise
  // going right), so the walk along the sill is a roll and not a slide.
  const spin = b.x / R
  const sx = b.x + Math.cos(spin) * R * 0.5
  const sy = y + Math.sin(spin) * R * 0.5 * (1 - q)
  ctx.beginPath()
  ctx.moveTo(sx - Math.sin(spin) * R * 0.22, sy + Math.cos(spin) * R * 0.22)
  ctx.lineTo(sx + Math.sin(spin) * R * 0.22, sy - Math.cos(spin) * R * 0.22)
  ctx.lineWidth = lw * 0.7
  ctx.strokeStyle = rgba('#B0703E', 0.32)
  ctx.stroke()
  // The far side in its own shadow.
  const shade = ctx.createRadialGradient(b.x + ux * R * 0.35, y + uy * R * 0.35, R * 0.2, b.x + ux * R * 0.35, y + uy * R * 0.35, R * 1.5)
  shade.addColorStop(0, rgba('#5A4A6A', 0))
  shade.addColorStop(0.55, rgba('#5A4A6A', 0.12))
  shade.addColorStop(1, rgba('#3A2E4A', 0.42))
  ctx.fillStyle = shade
  ctx.fillRect(b.x - R * 1.5, y - R * 1.5, R * 3, R * 3)
  // The shine, small and soft: a matt ball, not a glass one.
  const hx = b.x + ux * R * 0.42
  const hy = y + uy * R * 0.42
  const shine = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 0.42)
  shine.addColorStop(0, rgba('#FFF8EA', 0.25 + 0.55 * l))
  shine.addColorStop(1, rgba('#FFF8EA', 0))
  ctx.fillStyle = shine
  ctx.fillRect(hx - R, hy - R, R * 2, R * 2)
  ctx.restore()
}

/** The cushion's near lip, over the ball: the ball sits down in the hollow, not on top of it. */
function lip(ctx: Ctx, lw: number, t: number): void {
  const b = ballAt(t)
  if (Math.abs(b.x - CUP.x) > CUP.halfW + R || b.y < CUP.top - 2 * R - 0.05) return
  const lamp = lampAt(t)
  const top = CUP.top + cushion(t)
  const x = CUP.x
  const s = SHOULDER
  const y = top + CUP.hollow * 0.9
  const edge = () => {
    ctx.beginPath()
    ctx.moveTo(x - s * 0.62, top + 0.012)
    ctx.quadraticCurveTo(x - s * 0.3, y, x, y + 0.004)
    ctx.quadraticCurveTo(x + s * 0.3, y, x + s * 0.62, top + 0.012)
  }
  edge()
  ctx.lineTo(x + s * 0.62, top + 0.12)
  ctx.lineTo(x - s * 0.62, top + 0.12)
  ctx.closePath()
  // The cushion's own shading, top to foot, so the lip is the cushion and not a patch on it.
  const l = lightAt(CUP.x, -0.15) * lamp
  const pg = ctx.createLinearGradient(0, top, 0, CUP.top + 0.17)
  pg.addColorStop(0, lit(PAD, PAD_LIT, l))
  pg.addColorStop(1, lit(PAD, PAD_LIT, l * 0.5))
  ctx.fillStyle = pg
  ctx.fill()
  edge()
  stroke(ctx, lw * 0.8)
}

/* ------------------------------------------------------------------ the lamp */

const METAL = '#24363C'
const METAL_LIT = '#7FA39C'

function lamp(ctx: Ctx, lw: number, t: number): void {
  const on = lampAt(t)
  const warm = lampColor(t)
  const { base, elbow, hinge } = LAMP
  const foot = { x: base.x, y: -0.16 }
  const rod = (ax: number, ay: number, bx: number, by: number, w: number) => {
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.lineWidth = w
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.lineWidth = Math.max(0.01, w - lw * 2)
    ctx.strokeStyle = lit(METAL, METAL_LIT, lightAt((ax + bx) / 2, (ay + by) / 2) * on * 0.6)
    ctx.stroke()
    // The edge toward the pool catches it.
    if (w > 0.06) {
      const dx = bx - ax
      const dy = by - ay
      const d = Math.hypot(dx, dy)
      const ox = (-dy / d) * w * 0.28
      const oy = (dx / d) * w * 0.28
      const s = ox < 0 ? 1 : -1
      ctx.beginPath()
      ctx.moveTo(ax + s * ox, ay + s * oy)
      ctx.lineTo(bx + s * ox, by + s * oy)
      ctx.lineWidth = w * 0.18
      ctx.strokeStyle = rgba(warm, 0.35 * on)
      ctx.stroke()
    }
  }
  // The arms, each a stout rod and a thin one beside it, and the spring along the lower.
  rod(foot.x + 0.1, foot.y, elbow.x + 0.08, elbow.y + 0.06, 0.04)
  rod(foot.x - 0.03, foot.y, elbow.x - 0.03, elbow.y, 0.1)
  // The spring, close beside the thin rod and hooked onto it at both ends.
  const thin = (u: number) => ({ x: foot.x + 0.1 + (elbow.x + 0.08 - foot.x - 0.1) * u, y: foot.y + (elbow.y + 0.06 - foot.y) * u })
  const p0 = thin(0.2)
  const p1 = thin(0.55)
  const off = 0.075
  const sx0 = p0.x + off
  const sy0 = p0.y - 0.06
  const sx1 = p1.x + off
  const sy1 = p1.y + 0.06
  const coils = 12
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(sx0, sy0)
  for (let i = 1; i <= coils * 2; i++) {
    const u = i / (coils * 2)
    ctx.lineTo(sx0 + (sx1 - sx0) * u + (i % 2 ? 0.026 : -0.026), sy0 + (sy1 - sy0) * u)
  }
  ctx.lineTo(sx1, sy1)
  ctx.lineTo(p1.x, p1.y)
  stroke(ctx, lw * 0.45, rgba(INK, 0.8))
  rod(elbow.x - 0.02, elbow.y + 0.09, hinge.x + 0.03, hinge.y + 0.08, 0.04)
  rod(elbow.x, elbow.y - 0.02, hinge.x, hinge.y - 0.02, 0.1)
  // The joints.
  for (const j of [elbow, hinge]) {
    ctx.beginPath()
    ctx.arc(j.x, j.y, 0.065, 0, Math.PI * 2)
    ctx.fillStyle = lit(METAL, METAL_LIT, lightAt(j.x, j.y) * on * 0.5)
    ctx.fill()
    stroke(ctx, lw)
  }
  // The base: a heavy low dome on the desk.
  ctx.beginPath()
  ctx.moveTo(base.x - base.w / 2, 0)
  ctx.bezierCurveTo(base.x - base.w / 2, -0.2, base.x + base.w / 2, -0.2, base.x + base.w / 2, 0)
  ctx.closePath()
  ctx.fillStyle = lit(METAL, METAL_LIT, 0.3 * on)
  ctx.fill()
  stroke(ctx, lw)
  // The shade: a cone from the hinge, opening toward the pool.
  const ux = MOUTH.ux
  const uy = MOUTH.uy
  const nx = -uy
  const ny = ux
  const back = { x: hinge.x - ux * 0.08, y: hinge.y - uy * 0.08 }
  const mouth = { x: hinge.x + ux * 0.66, y: hinge.y + uy * 0.66 }
  const rb = 0.12
  const rm = 0.36
  ctx.beginPath()
  ctx.moveTo(back.x + nx * rb, back.y + ny * rb)
  ctx.quadraticCurveTo(back.x - ux * 0.12, back.y - uy * 0.12, back.x - nx * rb, back.y - ny * rb)
  ctx.lineTo(mouth.x - nx * rm, mouth.y - ny * rm)
  ctx.lineTo(mouth.x + nx * rm, mouth.y + ny * rm)
  ctx.closePath()
  const sg = ctx.createLinearGradient(back.x + nx * 0.4, back.y + ny * 0.4, back.x - nx * 0.4, back.y - ny * 0.4)
  sg.addColorStop(0, lit(METAL, METAL_LIT, 0.55 * on))
  sg.addColorStop(1, METAL)
  ctx.fillStyle = sg
  ctx.fill()
  stroke(ctx, lw)
  // The mouth, seen a little from below: the warm inside of the shade, and the bulb.
  ctx.save()
  ctx.translate(mouth.x, mouth.y)
  ctx.rotate(Math.atan2(uy, ux))
  ctx.beginPath()
  ctx.ellipse(0, 0, 0.08, rm, 0, 0, Math.PI * 2)
  ctx.fillStyle = mixHex('#3A2A1E', warm, 0.85 * on)
  ctx.fill()
  stroke(ctx, lw)
  ctx.beginPath()
  ctx.ellipse(-0.02, 0, 0.05, rm * 0.55, 0, 0, Math.PI * 2)
  ctx.fillStyle = mixHex('#4A3A2A', '#FFF1D2', on)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ as pieces */

export const room = scenery<null>('room', (p, _s, c) => inCells(p, c, (ctx, lw) => {
  wall(ctx, c.t)
  ceiling(ctx, lw, c.t)
  highShelf(ctx, lw, c.t)
  hanger(ctx, lw, c.t)
  print(ctx, lw, c.t)
  notes(ctx, lw, c.t)
  clock(ctx, lw, c.t)
  headlights(ctx, c.t)
  night(ctx, c.t)
  reflection(ctx, c.t)
  doodle(ctx, c.t)
  frame(ctx, lw, c.t)
  curtain(ctx, lw, c.t)
  fairyLights(ctx, lw, c.t)
  pot(ctx, lw, c.t)
  desk(ctx, lw, c.t)
  wallShadows(ctx, c.t)
  mothShadow(ctx, c.t)
}))

export const things = scenery<null>(
  'things',
  (p, _s, c) => inCells(p, c, (ctx, lw) => {
    contacts(ctx, c.t)
    cable(ctx, lw)
    walkman(ctx, lw, c.t)
    // Unless someone has it up (`hands.ts` draws it then, on its way); its steam stays a moment where it was.
    const up = liftAt(c.t)
    if (up <= 0.001) mug(ctx, lw, c.t)
    if (up < 0.999) {
      ctx.save()
      ctx.globalAlpha = 1 - up
      steam(ctx, c.t)
      ctx.restore()
    }
    cat(ctx, lw, c.t)
    BOOKS.forEach((b, i) => book(ctx, lw, b, i, c.t))
    headphones(ctx, lw, c.t)
    lamp(ctx, lw, c.t)
    knob(ctx, lw, c.t)
    windowRims(ctx, lw, c.t)
    ballShadow(ctx, c.t)
  }),
  (p, _s, c) => inCells(p, c, (ctx, lw) => {
    ballShine(ctx, lw, c.t)
    lip(ctx, lw, c.t)
    // Someone's hand, now and then, in front of it all.
    moth(ctx, lw, c.t)
    hands(ctx, lw, c.t, (g) => mug(g, lw, c.t))
    bloom(ctx, c.t)
    motes(ctx, c.t)
    flashRoom(ctx, c.t)
    vignette(ctx)
    // Under each track's now-playing line (not the title or the credits, which stand on the dark wall).
    for (const card of titlesAt(c.t)) if (card.names.length === 1 && Array.isArray(card.names[0])) scrim(ctx, card.light, card.at, camera(c.t).cells)
    grain(ctx, c.t)
  }),
)

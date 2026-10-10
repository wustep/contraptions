import type p5 from 'p5'
import { mixHex, type Piece, type PieceCtx } from '../../../../parts'
import { BOOKS, CAT, CUP, DESK, FAR_CUP, GLASS, LAMP, MUG, POT, PROPS, R, SILL, WALKMAN, WINDOW, type Book } from './desk'
import { MUSIC_END, heldAt, smooth } from './music'
import { LANDINGS, NODS, ballAt, squashAt } from './route'
import { cat, climbAt } from './cat'
import { formed, plaster } from './form'
import { openBook } from './book'
import { spill } from './spill'
import { bloom, farPress, curtain, draughtAt, scrim, fairyGlowAt, fairyLights, grain, notes, vignette } from './decor'
import { ceiling, highShelf, underDesk } from './room'
import { ballShadow, contacts, wallShadows } from './shade'
import { camera } from './camera'
import { titlesAt } from './titles'
import { REFILL, hands, knob, liftAt } from './hands'
import { rimAt, rimLine } from './rim'
import { light } from './light'
import { cable, walkman } from './walkman'
import { rgba, viewOf } from './canvas'
import { flashRoom, night } from './sky'
import { CREAM, INK, MOUTH, coverAt, hash, lampAt, lampColor, lightAt, lit, skyAt } from './world'

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
  // A lighter line than the stage's own: drawn, not inked.
  fn(ctx, (c.weight / c.k) * 0.72)
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
  // The window's light on the wall round it: the sky's colour, strong at dusk, faint at night; and once the snow has
  // settled, the city's white roofs give a little more of it back, cooler.
  const cx = (WINDOW.x0 + WINDOW.x1) / 2
  const cy = (WINDOW.y0 + WINDOW.y1) / 2
  const cover = coverAt(t)
  const spill = mixHex(sky.low, '#9CA6E0', 0.5 * cover)
  const w = ctx.createRadialGradient(cx, cy + 0.6, 0.5, cx, cy + 0.6, 4.6)
  w.addColorStop(0, rgba(spill, 0.22 + 0.28 * sky.dusk + 0.12 * cover))
  w.addColorStop(1, rgba(spill, 0))
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
  g.addColorStop(0, rgba(mixHex(WALL_LIT, warm, 0.45), 0.75 * lamp))
  g.addColorStop(0.3, rgba(WALL_LIT, 0.4 * lamp))
  g.addColorStop(0.65, rgba(mixHex(WALL_LIT, '#6A3F5A', 0.5), 0.2 * lamp))
  g.addColorStop(1, rgba(WALL, 0))
  ctx.fillStyle = g
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, DESK.y - v.y0 + 1)
  // The plaster: an uneven, painted tone over all of it.
  plaster(ctx, v.x0 - 1, v.y0 - 1, v.x1 + 1, DESK.y, 0.2, 2.2)
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
  const warm = lampColor(t)
  const TOP = DESK.y + DESK.top
  // Under the desk: the drawers, the floor, the rug (`room.ts`).
  underDesk(ctx, lw, t)
  // Its top, a plane running back from us to the wall, the wood a little lighter toward us (it faces the room more),
  // and lit where the lamp reaches it.
  const n = 12
  const g = ctx.createLinearGradient(v.x0, 0, v.x1, 0)
  for (let i = 0; i <= n; i++) {
    const x = v.x0 + ((v.x1 - v.x0) * i) / n
    g.addColorStop(i / n, lit('#3E2A33', mixHex('#B47148', warm, 0.25), lightAt(x, 0.15) * lamp))
  }
  ctx.fillStyle = g
  ctx.fillRect(v.x0 - 1, DESK.y, v.x1 - v.x0 + 2, TOP - DESK.y)
  // Darker back where it meets the wall, and toward us, out of the light's reach; lighter in between.
  const depth = ctx.createLinearGradient(0, DESK.y, 0, TOP)
  depth.addColorStop(0, 'rgba(14, 9, 24, 0.55)')
  depth.addColorStop(0.18, 'rgba(14, 9, 24, 0.12)')
  depth.addColorStop(0.55, 'rgba(14, 9, 24, 0)')
  depth.addColorStop(1, 'rgba(14, 9, 24, 0.18)')
  ctx.fillStyle = depth
  ctx.fillRect(v.x0 - 1, DESK.y, v.x1 - v.x0 + 2, TOP - DESK.y)
  // The boards' grain, running along the desk, the lines further apart as they come toward us.
  ctx.strokeStyle = rgba('#2A1A22', 0.24)
  ctx.lineWidth = 0.011
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.6) / 7.4
    const y = DESK.y + (TOP - DESK.y) * u ** 1.35
    ctx.beginPath()
    for (let x = Math.floor(v.x0) - 1; x <= v.x1 + 1; x += 0.25) {
      const yy = y + Math.sin(x * (0.5 + i * 0.17) + i * 2) * 0.008 * (0.5 + u)
      if (x === Math.floor(v.x0) - 1) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
  // A seam between two boards, and a knot in one, so it is wood and not a stripe.
  ctx.strokeStyle = rgba('#1E1219', 0.35)
  ctx.lineWidth = 0.014
  ctx.beginPath()
  ctx.moveTo(v.x0 - 1, DESK.y + (TOP - DESK.y) * 0.47)
  ctx.lineTo(v.x1 + 1, DESK.y + (TOP - DESK.y) * 0.47)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(-1.15, DESK.y + (TOP - DESK.y) * 0.72, 0.09, 0.022, 0, 0, Math.PI * 2)
  ctx.strokeStyle = rgba('#2A1A22', 0.3)
  ctx.stroke()
  // The lamp's pool, lying on the wood round where the shade looks: an oval, warm and soft-edged.
  if (lamp > 0.01) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(v.x0 - 1, DESK.y, v.x1 - v.x0 + 2, TOP - DESK.y)
    ctx.clip()
    ctx.translate(LAMP.aim.x + 0.2, DESK.y + (TOP - DESK.y) * 0.38)
    ctx.scale(LAMP.pool.half * 0.9, (TOP - DESK.y) * 0.75)
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    pool.addColorStop(0, rgba(mixHex(warm, '#FFF0D8', 0.35), 0.55 * lamp))
    pool.addColorStop(0.5, rgba(warm, 0.3 * lamp))
    pool.addColorStop(1, rgba(warm, 0))
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = pool
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }
  // The window's light lying on it, when there is any: the dusk's, the moon's, a flash's.
  spill(ctx, t)
  // Its front edge's face, darker, and along the top of it the edge catching the lamp.
  const f = ctx.createLinearGradient(v.x0, 0, v.x1, 0)
  for (let i = 0; i <= n; i++) {
    const x = v.x0 + ((v.x1 - v.x0) * i) / n
    f.addColorStop(i / n, lit('#2C1D26', mixHex('#8A5238', warm, 0.2), lightAt(x, TOP) * lamp * 0.8))
  }
  ctx.fillStyle = f
  ctx.fillRect(v.x0 - 1, TOP, v.x1 - v.x0 + 2, DESK.face - DESK.top)
  const e = ctx.createLinearGradient(v.x0, 0, v.x1, 0)
  for (let i = 0; i <= n; i++) {
    const x = v.x0 + ((v.x1 - v.x0) * i) / n
    e.addColorStop(i / n, rgba(warm, 0.75 * lightAt(x, TOP * 0.5) * lamp))
  }
  ctx.fillStyle = e
  ctx.fillRect(v.x0 - 1, TOP, v.x1 - v.x0 + 2, 0.025)
  ctx.beginPath()
  ctx.moveTo(v.x0 - 1, DESK.y)
  ctx.lineTo(v.x1 + 1, DESK.y)
  stroke(ctx, lw * 0.5, rgba(INK, 0.6))
  ctx.beginPath()
  ctx.moveTo(v.x0 - 1, TOP)
  ctx.lineTo(v.x1 + 1, TOP)
  stroke(ctx, lw * 0.6, rgba(INK, 0.6))
  ctx.beginPath()
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

/** The mug's solid, its handle filled in, for its shading (`form.ts`). */
function mugSolid(ctx: Ctx): void {
  const { x, halfW, h } = MUG
  roundRect(ctx, x - halfW - 0.24, -h + 0.1, halfW * 2 + 0.24, h - 0.1, 0.06)
  ctx.fill()
  roundRect(ctx, x - halfW, -h, halfW * 2, h, 0.06)
  ctx.fill()
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
      const x = x0 + Math.sin(u * 6 - phase * 2 + w) * (0.03 + 0.06 * u * u) + 0.06 * u * Math.sin(phase * 0.3 + w)
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

// A pair of cream headphones with dark pads, as a lofi desk has: light shells that take the lamp, dark pads that frame
// the ball.
const SHELL = '#4A3C4C'
const SHELL_LIT = '#EDC9AE'
const PAD = '#221E2A'
const PAD_LIT = '#4E4858'

/**
 * A cup's cushion, lying face up, seen a little from above as the desk is: its top an oval ring round the speaker
 * cloth (the ball's seat, `CLOTH`), and below its front edge, the cushion's side, a thin band of the fabric down to the
 * shell. `top` is where the cushion's top is pressed to (the kick, the snare).
 */
const PAD_RY = 0.075
const padRX = (): number => CUP.halfW * 0.94 - 0.005
const cloth = (top: number) => ({ cy: top + 0.035, rx: CUP.halfW * 0.94 * 0.62, ry: 0.042 })
function cushionPath(ctx: Ctx, top: number, x = CUP.x): void {
  const rx = padRX()
  const cy = top + 0.035
  const base = CUP.top + 0.17
  ctx.beginPath()
  ctx.moveTo(x - rx, base - 0.012)
  ctx.lineTo(x - rx, cy)
  ctx.ellipse(x, cy, rx, PAD_RY, 0, Math.PI, Math.PI * 2)
  ctx.lineTo(x + rx, base - 0.012)
  ctx.quadraticCurveTo(x + rx, base, x + rx - 0.02, base)
  ctx.lineTo(x - rx + 0.02, base)
  ctx.quadraticCurveTo(x - rx, base, x - rx, base - 0.012)
  ctx.closePath()
}

/**
 * The cushion's fabric, all but the cloth: its side band, its top ring lighter where it faces up, the edge between
 * them, the stitched seam round its side, and the lamp along its far rim toward it. Drawn whole for the cup, and again
 * over the ball's foot for the lip.
 */
function padFabric(ctx: Ctx, lw: number, x: number, top: number, l: number, side: 1 | -1, warm: string): void {
  const rx = padRX()
  const cy = top + 0.035
  const base = CUP.top + 0.17
  // The side band.
  cushionPath(ctx, top, x)
  const sg = ctx.createLinearGradient(0, cy, 0, base)
  sg.addColorStop(0, lit(PAD, PAD_LIT, l * 0.75))
  sg.addColorStop(1, lit(PAD, PAD_LIT, l * 0.35))
  ctx.fillStyle = sg
  ctx.fill()
  // The top ring, facing up into the light.
  ctx.beginPath()
  ctx.ellipse(x, cy, rx, PAD_RY, 0, 0, Math.PI * 2)
  const tg = ctx.createLinearGradient(x - side * rx, 0, x + side * rx, 0)
  tg.addColorStop(0, lit(PAD, PAD_LIT, l * 0.85 + 0.05))
  tg.addColorStop(1, lit(PAD, PAD_LIT, Math.min(1, l * 1.15 + 0.1)))
  ctx.fillStyle = tg
  ctx.fill()
  // Its front edge, where the top turns down into the side.
  ctx.beginPath()
  ctx.ellipse(x, cy, rx, PAD_RY, 0, 0, Math.PI)
  ctx.lineWidth = lw * 0.7
  ctx.strokeStyle = rgba(INK, 0.6)
  ctx.stroke()
  // The seam, round the side.
  ctx.setLineDash([0.025, 0.02])
  ctx.beginPath()
  ctx.ellipse(x, cy + (base - cy - PAD_RY) * 0.45 + 0.01, rx - 0.01, PAD_RY, 0, Math.PI * 0.08, Math.PI * 0.92)
  ctx.lineWidth = lw * 0.5
  ctx.strokeStyle = rgba('#000000', 0.32)
  ctx.stroke()
  ctx.setLineDash([])
  // The lamp along its far rim, on the side toward it.
  ctx.beginPath()
  ctx.ellipse(x, cy, rx - 0.012, PAD_RY - 0.01, 0, side > 0 ? Math.PI * 1.55 : Math.PI * 1.05, side > 0 ? Math.PI * 1.95 : Math.PI * 1.45)
  ctx.lineWidth = 0.014
  ctx.strokeStyle = rgba(warm, 0.5 * l)
  ctx.stroke()
}

function headphones(ctx: Ctx, lw: number, t: number): void {
  const lamp = lampAt(t)
  const warm = lampColor(t)
  const top = CUP.top + cushion(t)
  // Cream reads as cream even at the pool's edge: the room's light on it, then the lamp's.
  const shell = (k: number) => lit(SHELL, SHELL_LIT, Math.min(1, 0.32 * Math.max(0.4, lamp) + 0.75 * k))
  // A pair, set down face up: both cups on their backs, cushions up, the band standing between them from yoke to yoke.
  // Each cup hangs in a yoke, a fork round its middle on the side toward the other.
  const w = CUP.halfW * 0.94
  const fx = FAR_CUP.x
  const farTop = -FAR_CUP.h + farPress(t)
  // Each cup hangs by a pivot on its side toward the other, a slider arm from it down to the band.
  const pivots = [{ x: CUP.x + w - 0.012, y: CUP.top + 0.215 }, { x: fx - w + 0.012, y: CUP.top + 0.215 }]
  // The band, lying flat on the desk as headphones set down face up lie: from each arm round toward us in a shallow U
  // on the wood, the cream of its outside and the dark of its padding along its inner edge, the lamp along its near
  // rim. Drawn last, over the cups' feet, being nearer.
  const ex = (pivots[0].x + pivots[1].x) / 2
  const erx = (pivots[1].x - pivots[0].x) / 2 + 0.03
  const ery = DESK.top * 0.2
  const ey = DESK.y + 0.04
  const band = (dy = 0) => {
    ctx.beginPath()
    ctx.ellipse(ex, ey + dy, erx, ery, 0, 0, Math.PI)
  }
  // The arms: from each pivot, down the cup's side, to the band's ends on the wood.
  const arms = () => {
    ctx.beginPath()
    ctx.moveTo(pivots[0].x, pivots[0].y)
    ctx.lineTo(ex - erx + 0.004, ey - 0.005)
    ctx.moveTo(pivots[1].x, pivots[1].y)
    ctx.lineTo(ex + erx - 0.004, ey - 0.005)
  }
  const bl = lightAt(ex, 0.1, 0) * lamp
  const drawBand = () => {
    arms()
    ctx.lineWidth = 0.05
    ctx.strokeStyle = INK
    ctx.stroke()
    arms()
    ctx.lineWidth = 0.05 - lw * 1.6
    ctx.strokeStyle = shell(bl * 0.8 + 0.1)
    ctx.stroke()
    // Its shadow on the desk, just under and toward us.
    band(0.035)
    ctx.lineWidth = 0.1
    ctx.strokeStyle = 'rgba(14, 9, 24, 0.28)'
    ctx.stroke()
    // The band seen from a little above: a flat strip, its top face cream.
    band()
    ctx.lineWidth = 0.075
    ctx.strokeStyle = INK
    ctx.stroke()
    band()
    ctx.lineWidth = 0.075 - lw * 2
    ctx.strokeStyle = shell(bl * 0.85 + 0.1)
    ctx.stroke()
    // The padding along its inside edge (the far side of the strip, toward the cups).
    band(-0.018)
    ctx.lineWidth = 0.018
    ctx.strokeStyle = lit(PAD, PAD_LIT, bl * 0.7)
    ctx.stroke()
    // The lamp along its near rim.
    band(0.022)
    ctx.lineWidth = 0.01
    ctx.strokeStyle = rgba(warm, 0.6 * bl)
    ctx.stroke()
  }
  // A yoke: a fork round the cup's middle, its arm up into the band.
  // A pivot: the screw the cup turns on, where its arm meets it.
  const pivot = (p: { x: number; y: number }, k: number) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 0.028, 0, Math.PI * 2)
    ctx.fillStyle = shell(k)
    ctx.fill()
    ctx.lineWidth = lw * 0.8
    ctx.strokeStyle = INK
    ctx.stroke()
  }
  // One cup on its back: a shallow rounded shell, rim up, the lamp along its rim, and its cushion.
  const cup = (x: number, cTop: number, l: number, side: 1 | -1) => {
    ctx.beginPath()
    ctx.moveTo(x - w, CUP.top + 0.15)
    ctx.lineTo(x + w, CUP.top + 0.15)
    ctx.bezierCurveTo(x + w + 0.01, -0.06, x + w * 0.8, 0, x + w * 0.6, 0)
    ctx.lineTo(x - w * 0.6, 0)
    ctx.bezierCurveTo(x - w * 0.8, 0, x - w - 0.01, -0.06, x - w, CUP.top + 0.15)
    ctx.closePath()
    // Lit on the side toward the lamp.
    const g = ctx.createLinearGradient(x - side * w, 0, x + side * w, 0)
    g.addColorStop(0, shell(l * 0.5 + 0.08))
    g.addColorStop(1, shell(l * 0.95 + 0.12))
    ctx.fillStyle = g
    ctx.fill()
    stroke(ctx, lw)
    ctx.beginPath()
    ctx.moveTo(x - side * w * 0.3, CUP.top + 0.175)
    ctx.lineTo(x + side * (w - 0.04), CUP.top + 0.175)
    ctx.lineWidth = 0.014
    ctx.strokeStyle = rgba(warm, 0.55 * l)
    ctx.stroke()
    padFabric(ctx, lw, x, cTop, l, side, warm)
    // The speaker cloth in the ring's middle, darker: the ball's seat.
    const c = cloth(cTop)
    ctx.beginPath()
    ctx.ellipse(x, c.cy, c.rx, c.ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = lit('#120E18', '#2E2636', l * 0.6)
    ctx.fill()
    ctx.lineWidth = lw * 0.7
    ctx.strokeStyle = rgba(INK, 0.7)
    ctx.stroke()
    cushionPath(ctx, cTop, x)
    stroke(ctx, lw)
  }
  // The far cup: the near one's twin, its cushion pressed a little by each snare the music strikes.
  const fl = lightAt(fx, -0.15) * lamp
  cup(fx, farTop, fl, -1)
  // The near cup, the ball's seat, its cushion pushed by the kick.
  const l = lightAt(CUP.x, -0.15) * lamp
  cup(CUP.x, top, l, 1)
  drawBand()
  pivot(pivots[1], fl * 0.8 + 0.1)
  pivot(pivots[0], l * 0.9 + 0.12)
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
  // The front of the cushion's ring, over the ball: everything of the cushion in front of the cloth's near edge, so the
  // ball sits down in it.
  const c = cloth(top)
  const cx = CUP.x
  ctx.save()
  cushionPath(ctx, top)
  ctx.clip()
  ctx.beginPath()
  ctx.moveTo(cx - CUP.halfW - 0.1, c.cy)
  ctx.lineTo(cx - c.rx, c.cy)
  ctx.ellipse(cx, c.cy, c.rx, c.ry, 0, Math.PI, 0, true)
  ctx.lineTo(cx + CUP.halfW + 0.1, c.cy)
  ctx.lineTo(cx + CUP.halfW + 0.1, CUP.top + 0.2)
  ctx.lineTo(cx - CUP.halfW - 0.1, CUP.top + 0.2)
  ctx.closePath()
  ctx.clip()
  padFabric(ctx, lw, cx, top, lightAt(CUP.x, -0.15) * lamp, 1, lampColor(t))
  // The cloth's near edge.
  ctx.beginPath()
  ctx.ellipse(cx, c.cy, c.rx, c.ry, 0, Math.PI, 0, true)
  ctx.lineWidth = lw * 0.7
  ctx.strokeStyle = rgba(INK, 0.7)
  ctx.stroke()
  ctx.restore()
  // The cushion's outline over it again, where the clip cut it.
  ctx.save()
  ctx.beginPath()
  ctx.rect(cx - CUP.halfW - 0.1, c.cy, CUP.halfW * 2 + 0.2, 0.3)
  ctx.clip()
  cushionPath(ctx, top)
  stroke(ctx, lw)
  ctx.restore()
}

/**
 * The cup playing: on each kick it plays, a soft warm glow in the air over it, gone within a quarter second, as hard
 * as the kick was struck. Small beside the ball's nod close up; in a wide frame, where the nod is a few pixels, it is
 * what says the machine is keeping time.
 */
const KICK_MAX = Math.max(1e-6, ...NODS.map((n) => n.h))
function beatGlow(ctx: Ctx, t: number): void {
  const lamp = lampAt(t)
  if (lamp < 0.2) return
  let k = 0
  for (let i = NODS.length - 1; i >= 0; i--) {
    const s = t - NODS[i].t
    if (s < 0) continue
    if (s > 0.8) break
    k = Math.max(k, (NODS[i].h / KICK_MAX) * Math.exp(-s / 0.18))
  }
  if (k < 0.01) return
  // Stronger the wider the frame: barely there close, plain in the room's frame.
  const wide = smooth(viewOf(ctx).y1 - viewOf(ctx).y0, 3, 6)
  const a = k * lamp * (0.06 + 0.16 * wide)
  const x = CUP.x
  const y = CUP.top - 0.12
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 0, x, y, 0.55)
  g.addColorStop(0, rgba(lampColor(t), a))
  g.addColorStop(1, rgba(lampColor(t), 0))
  ctx.fillStyle = g
  ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2)
  ctx.restore()
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
  notes(ctx, lw, c.t)
  night(ctx, c.t)
  frame(ctx, lw, c.t)
  curtain(ctx, lw, c.t)
  fairyLights(ctx, lw, c.t)
  formed(ctx, 'pot', c.t, { box: [PROPS.plant[0] - 0.1, PROPS.plant[1] - 0.15, PROPS.plant[2] + 0.1, SILL.y + 0.02], at: { x: POT.x, y: SILL.y - POT.h / 2 }, core: 0.1 }, (g) => pot(g, lw, c.t))
  desk(ctx, lw, c.t)
  wallShadows(ctx, c.t)
}))

export const things = scenery<null>(
  'things',
  (p, _s, c) => inCells(p, c, (ctx, lw) => {
    contacts(ctx, c.t)
    cable(ctx, lw)
    formed(ctx, 'walkman', c.t, { box: PROPS.walkman, at: { x: (WALKMAN.x0 + WALKMAN.x1) / 2, y: -WALKMAN.h / 2 }, core: 0.12 }, (g) => walkman(g, lw, c.t))
    // Unless someone has it up (`hands.ts` draws it then, on its way); its steam stays a moment where it was.
    const up = liftAt(c.t)
    if (up <= 0.001) formed(ctx, 'mug', c.t, { box: PROPS.mug, at: { x: MUG.x, y: -MUG.h / 2 }, core: 0.2, solid: (g) => mugSolid(g) }, (g) => mug(g, lw, c.t))
    if (up < 0.999) {
      ctx.save()
      ctx.globalAlpha = 1 - up
      steam(ctx, c.t)
      ctx.restore()
    }
    const cl = climbAt(c.t)
    const cx = (CAT.x0 + CAT.chest) / 2 + cl.dx
    formed(ctx, 'cat', c.t, { box: [cx - 1.5, cl.dy - 1.7, cx + 1.5, cl.dy + 0.15], at: { x: cx, y: cl.dy - 0.35 }, core: 0.22, smooth: true }, (g) => cat(g, lw, c.t))
    BOOKS.forEach((b, i) => formed(ctx, `book${i}`, c.t, { box: [b.x0 - 0.15, b.top - 0.05, b.x1 + 0.1, b.bottom + 0.03], at: { x: (b.x0 + b.x1) / 2, y: (b.top + b.bottom) / 2 }, core: 0.09 }, (g) => book(g, lw, b, i, c.t)))
    formed(ctx, 'headphones', c.t, { box: [CUP.x - CUP.halfW - 0.1, CUP.top - 0.15, FAR_CUP.x + FAR_CUP.halfW + 0.1, DESK.top * 0.6], at: { x: (CUP.x + FAR_CUP.x) / 2, y: -0.25 }, core: 0.15, k: 0.6 }, (g) => headphones(g, lw, c.t))
    // Nearer us on the wood: the book left open under the lamp, and its pencil.
    openBook(ctx, lw, c.t)
    lamp(ctx, lw, c.t)
    knob(ctx, lw, c.t)
    windowRims(ctx, lw, c.t)
    ballShadow(ctx, c.t)
  }),
  (p, _s, c) => inCells(p, c, (ctx, lw) => {
    ballShine(ctx, lw, c.t)
    lip(ctx, lw, c.t)
    beatGlow(ctx, c.t)
    // Someone's hand, now and then, in front of it all.
    hands(ctx, lw, c.t, (g) => mug(g, lw, c.t))
    // The room's light over all of it: the lamp's pool, the window and the fairy lights keep what they reach.
    light(ctx, c.t)
    bloom(ctx, c.t)
    flashRoom(ctx, c.t)
    vignette(ctx)
    // Under each track's now-playing line (not the title or the credits, which stand on the dark wall).
    for (const card of titlesAt(c.t)) if (card.names.length === 1 && Array.isArray(card.names[0])) scrim(ctx, card.light, card.at, camera(c.t).cells)
    grain(ctx, c.t)
  }),
)

import { mixHex } from '../../../../parts'
import { DESK } from './desk'
import { rgba, viewOf } from './canvas'
import { INK, hash, lampAt, lampColor, lightAt, lit, skyAt } from './world'

/**
 * The rest of the room, for a stage that sees more than the desk (a phone held upright sees the whole wall, floor to
 * ceiling), and for the foot of every frame: the ceiling and a high shelf with books and a trailing pothos; and under
 * the desk, its apron, a pedestal of drawers with brass knobs that catch the lamp, a ukulele leaning on the wall, a crate of
 * records and a pair of slippers on the floor, and a rug.
 *
 * All of it in the room's dark, lit by what spills: the lamp's warmth on what faces it, the window's violet on the rest.
 */

type Ctx = CanvasRenderingContext2D

/** The floor's line, the ceiling's, and the apron under the desk's top. */
export const FLOOR = 5.0
export const CEILING = -8.4
const APRON = { y0: DESK.y + DESK.face, y1: DESK.y + DESK.face + 0.34 }
/** The pedestal of drawers under the desk's left. */
const PEDESTAL = { x0: -4.7, x1: -2.5 }
/** The high shelf over the desk, right of the window. */
const SHELF = { x0: 1.35, x1: 4.35, y: -6.55 }


function line(ctx: Ctx, lw: number, color = INK): void {
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.stroke()
}

/* ------------------------------------------------------------------ up */

/** The ceiling, and the moulding along it. */
export function ceiling(ctx: Ctx, lw: number, t: number): void {
  const v = viewOf(ctx)
  if (v.y0 > CEILING + 0.3) return
  const sky = skyAt(t)
  ctx.fillStyle = mixHex('#1A1830', '#2A2448', sky.dusk * 0.5)
  ctx.fillRect(v.x0 - 1, v.y0 - 1, v.x1 - v.x0 + 2, CEILING - v.y0 + 1)
  ctx.fillStyle = mixHex('#3A3552', '#5A4A6A', sky.dusk * 0.4)
  ctx.fillRect(v.x0 - 1, CEILING, v.x1 - v.x0 + 2, 0.14)
  ctx.beginPath()
  ctx.moveTo(v.x0 - 1, CEILING)
  ctx.lineTo(v.x1 + 1, CEILING)
  ctx.moveTo(v.x0 - 1, CEILING + 0.14)
  ctx.lineTo(v.x1 + 1, CEILING + 0.14)
  line(ctx, lw * 0.6)
  // A little of the lamp's warmth thrown up the wall and across the ceiling's edge.
  const g = ctx.createRadialGradient(3, CEILING + 0.5, 0.1, 3, CEILING + 0.5, 3.5)
  g.addColorStop(0, rgba(lampColor(t), 0.06 * lampAt(t)))
  g.addColorStop(1, rgba(lampColor(t), 0))
  ctx.fillStyle = g
  ctx.fillRect(-1, CEILING - 1, 8, 4)
}

/** A macramé hanger from the ceiling in the corner left of the window, a trailing plant in it, turning a little. */
export function hanger(ctx: Ctx, lw: number, t: number): void {
  const v = viewOf(ctx)
  const x = -4.85
  const potY = -6.55
  if (v.y0 > potY - 0.3 || v.x0 > x + 1 || v.x1 < x - 1) return
  const sway = 0.05 * Math.sin(t * 0.23)
  const lamp = lampAt(t)
  const l = 0.15 + 0.1 * lamp
  ctx.strokeStyle = lit('#6E6250', '#D9C8A8', l)
  ctx.lineWidth = 0.02
  for (const k of [-1, 0, 1]) {
    ctx.beginPath()
    ctx.moveTo(x, CEILING + 0.14)
    ctx.quadraticCurveTo(x + k * 0.1 + sway * 0.5, (CEILING + potY) / 2, x + k * 0.26 + sway, potY - 0.2)
    ctx.stroke()
  }
  // The knots, where the cords cross.
  ctx.fillStyle = lit('#6E6250', '#D9C8A8', l)
  ctx.beginPath()
  ctx.arc(x + sway * 0.6, potY - 0.75, 0.04, 0, Math.PI * 2)
  ctx.fill()
  // Its trailing plant.
  for (let i = 0; i < 5; i++) {
    const sx = x + sway - 0.2 + i * 0.1
    const len = 0.4 + hash(i, 191) * 0.55
    for (let k = 0; k <= 5; k++) {
      const u = k / 5
      const lx = sx + (i - 2) * 0.1 * u + Math.sin(t * 0.3 + i + u * 2) * 0.02 * u
      const ly = potY + 0.05 + len * u
      ctx.beginPath()
      ctx.ellipse(lx + (k % 2 ? 0.035 : -0.035), ly, 0.045, 0.03, k % 2 ? 0.6 : -0.6, 0, Math.PI * 2)
      ctx.fillStyle = lit(k % 2 ? '#2E4A3C' : '#365A44', '#6E9A62', l)
      ctx.fill()
    }
  }
  ctx.beginPath()
  ctx.ellipse(x + sway, potY - 0.1, 0.27, 0.2, 0, 0, Math.PI)
  ctx.lineTo(x + sway - 0.27, potY - 0.1)
  ctx.fillStyle = lit('#3A3448', '#C9B6A0', l)
  ctx.fill()
  line(ctx, lw * 0.7)
}

/** The high shelf: books stood along it, one leaning, and a pothos whose vines trail over the edge and stir. */
export function highShelf(ctx: Ctx, lw: number, t: number): void {
  const v = viewOf(ctx)
  if (v.y0 > SHELF.y - 0.8) return
  const lamp = lampAt(t)
  const l = (x: number, y: number) => Math.min(1, lightAt(x, y, 1) * lamp * 1.5 + 0.1)
  const dim = (c: string, x: number, y: number) => lit(mixHex(c, '#1E1A30', 0.65), c, l(x, y))
  // The books.
  const books: [number, number, string][] = [[0.13, 0.56, '#7A4E6E'], [0.11, 0.62, '#3F6E78'], [0.15, 0.5, '#B68A44'], [0.1, 0.58, '#A4533C'], [0.12, 0.54, '#5B5A8E']]
  let x = SHELF.x0 + 0.15
  for (const [w, h, c] of books) {
    ctx.beginPath()
    ctx.rect(x, SHELF.y - h, w, h)
    ctx.fillStyle = dim(c, x, SHELF.y - h / 2)
    ctx.fill()
    line(ctx, lw * 0.6)
    ctx.fillStyle = rgba('#EFE4CE', 0.25)
    ctx.fillRect(x + 0.02, SHELF.y - h + 0.08, w - 0.04, 0.03)
    x += w + 0.01
  }
  // One leaning on the last.
  ctx.save()
  ctx.translate(x + 0.02, SHELF.y)
  ctx.rotate(0.32)
  ctx.beginPath()
  ctx.rect(0, -0.5, 0.12, 0.5)
  ctx.fillStyle = dim('#3E7A5E', x, SHELF.y - 0.3)
  ctx.fill()
  line(ctx, lw * 0.6)
  ctx.restore()
  // The pothos, its vines trailing down past the shelf's edge, stirring.
  const px = SHELF.x0 + 2.2
  for (let i = 0; i < 6; i++) {
    const sx = px - 0.18 + i * 0.07
    const len = 0.45 + hash(i, 171) * 0.45
    const sway = 0.04 * Math.sin(t * 0.4 + i * 1.3)
    ctx.beginPath()
    ctx.moveTo(sx, SHELF.y - 0.2)
    ctx.quadraticCurveTo(sx + (i - 2.5) * 0.12, SHELF.y + 0.05, sx + (i - 2.5) * 0.09 + sway, SHELF.y + len)
    ctx.strokeStyle = dim('#3C6B4C', sx, SHELF.y)
    ctx.lineWidth = 0.018
    ctx.stroke()
    // Its leaves along it.
    for (let k = 1; k <= 4; k++) {
      const u = k / 4.5
      const lx = sx + ((i - 2.5) * 0.09 + sway) * u * u + (i - 2.5) * 0.12 * 2 * u * (1 - u)
      const ly = SHELF.y - 0.2 + (len + 0.2) * u
      const side = k % 2 ? 1 : -1
      ctx.beginPath()
      ctx.ellipse(lx + side * 0.04, ly, 0.05, 0.035, side * 0.6, 0, Math.PI * 2)
      ctx.fillStyle = dim(k % 2 ? '#5E9A5E' : '#4B8452', lx, ly)
      ctx.fill()
    }
  }
  // Its pot.
  ctx.beginPath()
  ctx.moveTo(px - 0.24, SHELF.y - 0.34)
  ctx.lineTo(px + 0.24, SHELF.y - 0.34)
  ctx.lineTo(px + 0.19, SHELF.y)
  ctx.lineTo(px - 0.19, SHELF.y)
  ctx.closePath()
  ctx.fillStyle = dim('#E2D6C4', px, SHELF.y - 0.17)
  ctx.fill()
  line(ctx, lw * 0.7)
  // Top leaves over the pot's rim.
  for (let k = 0; k < 5; k++) {
    ctx.beginPath()
    ctx.ellipse(px - 0.2 + k * 0.1, SHELF.y - 0.38 - (k % 2) * 0.05, 0.07, 0.045, (k - 2) * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = dim(k % 2 ? '#5E9A5E' : '#4B8452', px, SHELF.y - 0.4)
    ctx.fill()
  }
  // The board, and its two brackets.
  ctx.beginPath()
  ctx.rect(SHELF.x0, SHELF.y, SHELF.x1 - SHELF.x0, 0.08)
  ctx.fillStyle = dim('#8A5A3E', (SHELF.x0 + SHELF.x1) / 2, SHELF.y)
  ctx.fill()
  line(ctx, lw * 0.8)
  for (const bx of [SHELF.x0 + 0.3, SHELF.x1 - 0.3]) {
    ctx.beginPath()
    ctx.moveTo(bx, SHELF.y + 0.08)
    ctx.lineTo(bx, SHELF.y + 0.32)
    ctx.lineTo(bx + 0.04, SHELF.y + 0.32)
    ctx.quadraticCurveTo(bx + 0.06, SHELF.y + 0.12, bx + 0.22, SHELF.y + 0.08)
    ctx.closePath()
    ctx.fillStyle = '#2A2638'
    ctx.fill()
    line(ctx, lw * 0.5)
  }
}

/* ------------------------------------------------------------------ down */

/**
 * Under the desk: the wall in the desk's shadow, the floor and its skirting, the rug, the pedestal of drawers, the
 * apron, the crate of records and the slippers.
 */
export function underDesk(ctx: Ctx, lw: number, t: number): void {
  const v = viewOf(ctx)
  const lamp = lampAt(t)
  const sky = skyAt(t)
  const top = DESK.y
  // The wall under the desk, darkest just under its top.
  const wg = ctx.createLinearGradient(0, top, 0, FLOOR)
  wg.addColorStop(0, '#120F1C')
  wg.addColorStop(0.35, '#1A1628')
  wg.addColorStop(1, mixHex('#201B32', '#2B2342', sky.dusk * 0.4))
  ctx.fillStyle = wg
  ctx.fillRect(v.x0 - 1, top, v.x1 - v.x0 + 2, FLOOR - top)
  if (v.y1 > APRON.y1) {
    // The skirting board.
    ctx.beginPath()
    ctx.rect(v.x0 - 1, FLOOR - 0.24, v.x1 - v.x0 + 2, 0.24)
    ctx.fillStyle = '#2A2440'
    ctx.fill()
    line(ctx, lw * 0.6)
    // The floor, boards running away from us: a few long lines, closer together toward the wall.
    const fg = ctx.createLinearGradient(0, FLOOR, 0, FLOOR + 3)
    fg.addColorStop(0, '#2A1E26')
    fg.addColorStop(1, '#1A1219')
    ctx.fillStyle = fg
    ctx.fillRect(v.x0 - 1, FLOOR, v.x1 - v.x0 + 2, Math.max(0, v.y1 - FLOOR + 1))
    ctx.strokeStyle = rgba('#120C14', 0.6)
    ctx.lineWidth = 0.012
    for (let i = 1; i < 9; i++) {
      const y = FLOOR + 0.06 * i * i
      ctx.beginPath()
      ctx.moveTo(v.x0 - 1, y)
      ctx.lineTo(v.x1 + 1, y)
      ctx.stroke()
    }
    // The rug, lying out from under the desk: a woven band with a pattern, and its fringe.
    const rx0 = -3.4
    const rx1 = 4.8
    const ry = FLOOR + 0.18
    const rh = 0.62
    ctx.beginPath()
    ctx.moveTo(rx0 + 0.25, ry)
    ctx.lineTo(rx1 - 0.25, ry)
    ctx.lineTo(rx1, ry + rh)
    ctx.lineTo(rx0, ry + rh)
    ctx.closePath()
    const rg = ctx.createLinearGradient(0, ry, 0, ry + rh)
    rg.addColorStop(0, '#5A3A4E')
    rg.addColorStop(1, '#6E4458')
    ctx.fillStyle = rg
    ctx.fill()
    line(ctx, lw * 0.6)
    ctx.save()
    ctx.clip()
    for (let k = 0; k < 3; k++) {
      const yy = ry + 0.12 + k * 0.17
      ctx.fillStyle = k === 1 ? '#C98A5E' : '#3E5A6E'
      ctx.globalAlpha = 0.55
      ctx.fillRect(rx0, yy, rx1 - rx0, 0.05)
      ctx.globalAlpha = 0.4
      ctx.fillStyle = '#E8D5B0'
      for (let d = rx0 + 0.2; d < rx1; d += 0.42) {
        ctx.beginPath()
        ctx.moveTo(d, yy + 0.025)
        ctx.lineTo(d + 0.06, yy - 0.03)
        ctx.lineTo(d + 0.12, yy + 0.025)
        ctx.lineTo(d + 0.06, yy + 0.08)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.restore()
    ctx.strokeStyle = rgba('#D9C3A0', 0.45)
    ctx.lineWidth = 0.012
    for (let d = rx0 + 0.05; d < rx1; d += 0.07) {
      ctx.beginPath()
      ctx.moveTo(d, ry + rh)
      ctx.lineTo(d - 0.01, ry + rh + 0.08)
      ctx.stroke()
    }
    // A ukulele leaning on the drawers, and the crate of records against the wall.
    ukulele(ctx, lw, PEDESTAL.x1 + 0.62, FLOOR, t)
    crate(ctx, lw, 0.3, FLOOR)
    // The slippers, left by the chair that isn't there.
    for (const [sx, rot] of [[2.35, -0.05], [2.85, 0.08]] as const) {
      ctx.save()
      ctx.translate(sx, ry + 0.3)
      ctx.rotate(rot)
      ctx.beginPath()
      ctx.ellipse(0, 0, 0.24, 0.08, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#C78C9A'
      ctx.fill()
      line(ctx, lw * 0.6)
      ctx.beginPath()
      ctx.ellipse(0.08, -0.03, 0.12, 0.06, 0, Math.PI, Math.PI * 2)
      ctx.fillStyle = '#E8C7CD'
      ctx.fill()
      line(ctx, lw * 0.5)
      ctx.restore()
    }
  }
  // The pedestal of drawers, under the desk's left.
  const pg = ctx.createLinearGradient(PEDESTAL.x0, 0, PEDESTAL.x1, 0)
  pg.addColorStop(0, '#2A1E2A')
  pg.addColorStop(1, '#3A2A34')
  ctx.beginPath()
  ctx.rect(PEDESTAL.x0, APRON.y0, PEDESTAL.x1 - PEDESTAL.x0, FLOOR - APRON.y0)
  ctx.fillStyle = pg
  ctx.fill()
  line(ctx, lw)
  const drawers = [APRON.y0 + 0.06, 1.2, 2.55, 3.9]
  for (let i = 0; i < drawers.length - 1; i++) {
    const y0 = drawers[i]
    const y1 = drawers[i + 1] - 0.06
    ctx.beginPath()
    ctx.rect(PEDESTAL.x0 + 0.08, y0, PEDESTAL.x1 - PEDESTAL.x0 - 0.16, y1 - y0)
    ctx.fillStyle = mixHex('#3A2A34', '#4A3440', 0.5)
    ctx.fill()
    line(ctx, lw * 0.6)
    knob(ctx, lw, (PEDESTAL.x0 + PEDESTAL.x1) / 2, y0 + Math.min(0.28, (y1 - y0) / 2), t)
  }
  // The apron across the knee space, with its one wide drawer.
  const ag = ctx.createLinearGradient(v.x0, 0, v.x1, 0)
  const n = 8
  for (let i = 0; i <= n; i++) {
    const x = v.x0 + ((v.x1 - v.x0) * i) / n
    ag.addColorStop(i / n, lit('#2A1C26', '#6A4436', lightAt(x, 0.4) * lamp * 0.5))
  }
  ctx.beginPath()
  ctx.rect(v.x0 - 1, APRON.y0, v.x1 - v.x0 + 2, APRON.y1 - APRON.y0)
  ctx.fillStyle = ag
  ctx.fill()
  line(ctx, lw * 0.8)
  for (const [x0, x1] of [[-2.35, 1.2], [1.3, 4.9]]) {
    ctx.beginPath()
    ctx.rect(x0, APRON.y0 + 0.05, x1 - x0, APRON.y1 - APRON.y0 - 0.1)
    line(ctx, lw * 0.5, rgba(INK, 0.7))
    knob(ctx, lw, (x0 + x1) / 2, (APRON.y0 + APRON.y1) / 2, t)
  }
}

/** A brass knob, catching the lamp. */
function knob(ctx: Ctx, lw: number, x: number, y: number, t: number): void {
  const l = Math.min(1, lightAt(x, y) * lampAt(t) * 2 + 0.15)
  ctx.beginPath()
  ctx.arc(x, y, 0.045, 0, Math.PI * 2)
  ctx.fillStyle = lit('#5A4630', '#E6B86E', l)
  ctx.fill()
  line(ctx, lw * 0.5)
  ctx.beginPath()
  ctx.arc(x + 0.012, y - 0.014, 0.012, 0, Math.PI * 2)
  ctx.fillStyle = rgba('#FFF0D0', 0.7 * l)
  ctx.fill()
}

/** A crate of records: their sleeves' tops showing over its side, a few colours, one pulled half out. */
function crate(ctx: Ctx, lw: number, x0: number, floor: number): void {
  const w = 1.5
  const h = 0.62
  const colors = ['#C9734E', '#3F6E78', '#E2C27A', '#7A4E6E', '#5B5A8E', '#D99AA6', '#2E4A44', '#B68A44']
  for (let i = 0; i < colors.length; i++) {
    const sx = x0 + 0.08 + i * 0.17
    const up = i === 3 ? 0.42 : 0.12 + hash(i, 181) * 0.06
    ctx.save()
    ctx.translate(sx, floor - h)
    ctx.rotate(-0.08 + i * 0.012)
    ctx.beginPath()
    ctx.rect(0, -up, 0.16, h)
    ctx.fillStyle = mixHex(colors[i], '#1A1626', 0.35)
    ctx.fill()
    line(ctx, lw * 0.5)
    if (i === 3) {
      // The record's edge, peeking out of the pulled sleeve.
      ctx.beginPath()
      ctx.arc(0.08, -up + 0.02, 0.07, Math.PI, Math.PI * 2)
      ctx.fillStyle = '#141018'
      ctx.fill()
    }
    ctx.restore()
  }
  ctx.beginPath()
  ctx.rect(x0, floor - h, w, h)
  ctx.fillStyle = '#5A3C2E'
  ctx.fill()
  line(ctx, lw * 0.8)
  ctx.strokeStyle = rgba('#2A1A16', 0.6)
  ctx.lineWidth = 0.02
  for (const yy of [floor - h * 0.66, floor - h * 0.33]) {
    ctx.beginPath()
    ctx.moveTo(x0, yy)
    ctx.lineTo(x0 + w, yy)
    ctx.stroke()
  }
  // Its hand hole.
  ctx.beginPath()
  ctx.ellipse(x0 + w / 2, floor - h + 0.13, 0.16, 0.05, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#1E1418'
  ctx.fill()
}

/** A ukulele, leaning on the drawers: its body on the floor, its neck against the pedestal's edge, its strings catching a little. */
function ukulele(ctx: Ctx, lw: number, x: number, floor: number, t: number): void {
  const l = Math.min(1, 0.18 + lightAt(x, 1) * lampAt(t))
  ctx.save()
  ctx.translate(x, floor - 0.04)
  ctx.rotate(-0.17)
  // The neck and the head.
  ctx.beginPath()
  ctx.rect(-0.07, -2.95, 0.14, 1.75)
  ctx.fillStyle = lit('#3A2620', '#7A4E36', l)
  ctx.fill()
  line(ctx, lw * 0.6)
  ctx.beginPath()
  ctx.moveTo(-0.1, -3.32)
  ctx.lineTo(0.1, -3.32)
  ctx.lineTo(0.09, -2.95)
  ctx.lineTo(-0.09, -2.95)
  ctx.closePath()
  ctx.fillStyle = lit('#2A1A16', '#5A3A2A', l)
  ctx.fill()
  line(ctx, lw * 0.6)
  for (const k of [0, 1]) {
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(side * 0.13, -3.25 + k * 0.17, 0.03, 0, Math.PI * 2)
      ctx.fillStyle = '#C9B08A'
      ctx.fill()
    }
  }
  // Frets.
  ctx.strokeStyle = rgba('#C9B08A', 0.5)
  ctx.lineWidth = 0.01
  for (let k = 0; k < 9; k++) {
    const fy = -2.9 + k * 0.17 * (1 - k * 0.03)
    ctx.beginPath()
    ctx.moveTo(-0.07, fy)
    ctx.lineTo(0.07, fy)
    ctx.stroke()
  }
  // The body: two bouts and a waist.
  const body = () => {
    ctx.beginPath()
    ctx.ellipse(0, -0.5, 0.5, 0.5, 0, 0, Math.PI * 2)
    ctx.moveTo(0.4, -1.12)
    ctx.ellipse(0, -1.12, 0.4, 0.38, 0, 0, Math.PI * 2)
  }
  body()
  const g = ctx.createLinearGradient(-0.5, 0, 0.5, 0)
  g.addColorStop(0, lit('#5A3420', '#B5743E', l * 0.6))
  g.addColorStop(1, lit('#6A3E26', '#D69050', l))
  ctx.fillStyle = g
  ctx.fill('nonzero')
  ctx.strokeStyle = INK
  ctx.lineWidth = lw * 0.7
  ctx.beginPath()
  ctx.ellipse(0, -0.5, 0.5, 0.5, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, -1.12, 0.4, 0.38, 0, Math.PI * 1.08, Math.PI * 1.92 + Math.PI * 0.0)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, -1.12, 0.4, 0.38, 0, -Math.PI * 0.08, Math.PI * 0.12)
  ctx.moveTo(-0.4, -1.12)
  ctx.ellipse(0, -1.12, 0.4, 0.38, 0, Math.PI, Math.PI * 0.88, true)
  ctx.stroke()
  // The sound hole, the bridge, the strings.
  ctx.beginPath()
  ctx.arc(0, -0.95, 0.15, 0, Math.PI * 2)
  ctx.fillStyle = '#1A100C'
  ctx.fill()
  ctx.beginPath()
  ctx.rect(-0.16, -0.38, 0.32, 0.06)
  ctx.fillStyle = '#2A1A16'
  ctx.fill()
  ctx.strokeStyle = rgba('#EDE2CC', 0.35 + 0.3 * l)
  ctx.lineWidth = 0.006
  for (const sx of [-0.045, -0.015, 0.015, 0.045]) {
    ctx.beginPath()
    ctx.moveTo(sx, -0.35)
    ctx.lineTo(sx * 0.9, -3.0)
    ctx.stroke()
  }
  ctx.restore()
}

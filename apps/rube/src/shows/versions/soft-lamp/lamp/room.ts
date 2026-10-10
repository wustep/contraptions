import { mixHex } from '../../../../parts'
import { DESK } from './desk'

/** The high shelf under the ceiling, right of the window: only a phone held upright sees it. */
const TOP_SHELF = { x0: 1.35, x1: 2.75, y: -6.55 }
import { rgba, viewOf } from './canvas'
import { INK, lampAt, lampColor, lightAt, lit, skyAt } from './world'

/**
 * The rest of the room, for a stage that sees more than the desk (a phone held upright sees the whole wall, floor to
 * ceiling), and for the foot of every frame: the ceiling and a high shelf of books; and under the desk, its apron, a
 * pedestal of drawers with brass knobs that catch the lamp, and a ukulele leaning on the wall between. The rest under there is dark.
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

/** The high shelf under the ceiling, where only a phone held upright sees it: a plain shelf of books. */
export function highShelf(ctx: Ctx, lw: number, t: number): void {
  shelf(ctx, lw, t, TOP_SHELF, [[0.13, 0.56, '#7A4E6E'], [0.11, 0.62, '#3F6E78'], [0.15, 0.5, '#B68A44'], [0.1, 0.58, '#A4533C'], [0.12, 0.54, '#5B5A8E'], [0.14, 0.48, '#6E8E9A']])
}

function shelf(ctx: Ctx, lw: number, t: number, S: { x0: number; x1: number; y: number }, books: [number, number, string][]): void {
  const v = viewOf(ctx)
  // Nothing to draw unless some of it, the vines under it included, is in view.
  if (v.y0 > S.y + 0.6 || v.y1 < S.y - 0.8 || v.x1 < S.x0 - 0.5 || v.x0 > S.x1 + 0.5) return
  const lamp = lampAt(t)
  const l = (x: number, y: number) => Math.min(1, lightAt(x, y, 1) * lamp * 1.5 + 0.12)
  const dim = (c: string, x: number, y: number) => lit(mixHex(c, '#1E1A30', 0.62), c, l(x, y))
  // The books.
  let x = S.x0 + 0.1
  for (const [w, h, c] of books) {
    ctx.beginPath()
    ctx.rect(x, S.y - h, w, h)
    ctx.fillStyle = dim(c, x, S.y - h / 2)
    ctx.fill()
    line(ctx, lw * 0.6)
    ctx.fillStyle = rgba('#EFE4CE', 0.25)
    ctx.fillRect(x + 0.02, S.y - h + 0.08, w - 0.04, 0.03)
    x += w + 0.01
  }
  // One leaning on the last.
  ctx.save()
  ctx.translate(x + 0.02, S.y)
  ctx.rotate(0.32)
  ctx.beginPath()
  ctx.rect(0, -0.5, 0.12, 0.5)
  ctx.fillStyle = dim('#3E7A5E', x, S.y - 0.3)
  ctx.fill()
  line(ctx, lw * 0.6)
  ctx.restore()
  // The board, and its two brackets.
  ctx.beginPath()
  ctx.rect(S.x0, S.y, S.x1 - S.x0, 0.08)
  ctx.fillStyle = dim('#8A5A3E', (S.x0 + S.x1) / 2, S.y)
  ctx.fill()
  line(ctx, lw * 0.8)
  for (const bx of [S.x0 + 0.18, S.x1 - 0.32]) {
    ctx.beginPath()
    ctx.moveTo(bx, S.y + 0.08)
    ctx.lineTo(bx, S.y + 0.32)
    ctx.lineTo(bx + 0.04, S.y + 0.32)
    ctx.quadraticCurveTo(bx + 0.06, S.y + 0.12, bx + 0.22, S.y + 0.08)
    ctx.closePath()
    ctx.fillStyle = '#2A2638'
    ctx.fill()
    line(ctx, lw * 0.5)
  }
}

/* ------------------------------------------------------------------ down */

/**
 * Under the desk: the wall in the desk's shadow, the floor and its skirting, the pedestal of drawers, the
 * apron, and the ukulele.
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
    // A ukulele leaning on the wall in the knee space, where a phone held upright looks.
    ukulele(ctx, lw, 1.7, FLOOR, t)
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

/** A ukulele, leaning on the wall: its body on the floor, its neck against the wall, its strings catching a little. */
function ukulele(ctx: Ctx, lw: number, x: number, floor: number, t: number): void {
  // In the desk's shadow: only a little of the lamp reaches under.
  const l = Math.min(1, 0.12 + 0.3 * lightAt(x, 1) * lampAt(t))
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

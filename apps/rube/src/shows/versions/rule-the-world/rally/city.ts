import type { Pt } from '../../../../parts'
import { hash } from './kit'
import { rgb } from './pen'

/**
 * The city round the finale's building (`finale.ts`), waking: the tenement next door with a morning in each of its
 * windows, the street at the building's foot and the near pavement under the El, and the things nearer still that the
 * crane goes past, at the frame's edges.
 *
 * Everything is in the ward's own cells, as the building is. Next door stands in the building's own plane; the near
 * pavement is the El's, a little nearer; and the near things are laid at their depth about the frame's middle, as
 * `finale.ts`'s `deep` lays the far ones, so they come in large from outside the frame as the crane comes out, settle
 * at its edges while it is out wide, and go off its edges again as it comes back in.
 */

const css = (hex: string, a = 1) => {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`
}
const smooth = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

export interface Frame {
  x0: number
  y0: number
  x1: number
  y1: number
  cx: number
  cy: number
}

/* ------------------------------------------------------------------ next door */

/** The tenement next door, right of the building: its face, its cornice, its windows, floor by floor. */
const NX0 = 8.7
const NX1 = 46
const NROOF = -1.2
const COL0 = 10.55
const COL_W = 1.15
const COL_STEP = 2.3
const ROW0 = 0.4
const ROW_H = 1.75
const ROW_STEP = 3.1
const ROWS = 7
const COLS = Math.floor((NX1 - COL0) / COL_STEP)
/** The fire escape, down the third bay. */
const ESC_COL = 2

/** Next door's chimney's mouth, for its smoke (`finale.ts`). */
export const CHIMNEY: Pt = [19.05, NROOF - 2.3]

const winX = (c: number): number => COL0 + c * COL_STEP
const winY = (r: number): number => ROW0 + r * ROW_STEP

/** When each window's light comes on, as the house wakes (some are lit already; some stay dark). */
function lightOf(c: number, r: number, t: number, start: number): number {
  const h = hash(c, r, 811)
  if (h < 0.22) return 0
  const on = start - 4 + h * 30
  return smooth((t - on) / 0.25)
}

/** A figure's head and shoulders in a window, from its sill: dark against the room's light. */
function bust(P: Path2D, k: number, x: number, sill: number, s: number, lean = 0, turn = 0): void {
  const hx = x + lean + turn * 0.04
  const hy = sill - 1.05 * s
  P.moveTo((x - 0.38 * s) * k, sill * k)
  P.quadraticCurveTo((x - 0.36 * s) * k, (sill - 0.62 * s) * k, (x + lean * 0.5) * k, (sill - 0.7 * s) * k)
  P.quadraticCurveTo((x + 0.36 * s) * k, (sill - 0.62 * s) * k, (x + 0.38 * s) * k, sill * k)
  P.closePath()
  P.moveTo((hx + 0.19 * s) * k, hy * k)
  P.ellipse(hx * k, hy * k, 0.19 * s * k, 0.23 * s * k, 0, 0, Math.PI * 2)
}

/**
 * Next door at `t`: its brick and windows; a morning in the near windows (a boy at the glass following the pigeons, a
 * man shaving, a woman shaking a rug out over the sill, a man behind his paper, washing reeled out on a pulley line, a
 * cat, a curtain out of an open window); the fire escape; and on its roof a chimney, an aerial and sheets on a line.
 * `flockX` is where the pigeons are, for the boy's eyes.
 */
export function drawNextDoor(ctx: CanvasRenderingContext2D, k: number, f: Frame, t: number, start: number, flockX: number): void {
  if (f.x1 < NX0) return
  const x1 = Math.min(NX1, f.x1 + 1)
  const base = 22.6
  ctx.save()
  // The face, and its brick; the cornice; the parapet.
  ctx.fillStyle = '#3A2A2C'
  ctx.fillRect(NX0 * k, NROOF * k, (x1 - NX0) * k, (base - NROOF) * k)
  ctx.strokeStyle = css('#000000', 0.16)
  ctx.lineWidth = Math.max(1, 0.03 * k)
  ctx.beginPath()
  for (let y = NROOF + 0.9; y < base; y += 0.42) {
    ctx.moveTo(NX0 * k, y * k)
    ctx.lineTo(x1 * k, y * k)
  }
  ctx.stroke()
  ctx.fillStyle = '#4C3A3A'
  ctx.fillRect((NX0 - 0.1) * k, (NROOF - 0.15) * k, (x1 - NX0 + 0.2) * k, 0.75 * k)
  ctx.fillStyle = css('#8E7478', 0.55)
  ctx.fillRect((NX0 - 0.1) * k, (NROOF - 0.15) * k, (x1 - NX0 + 0.2) * k, 0.1 * k)
  // Its roof: a chimney with its smoke, an aerial on its mast, and a line of sheets in the dawn wind.
  ctx.fillStyle = '#2E2226'
  ctx.fillRect(18.6 * k, (NROOF - 2.2) * k, 0.9 * k, 2.1 * k)
  ctx.strokeStyle = css('#2A2228', 0.95)
  ctx.lineWidth = Math.max(1, 0.06 * k)
  ctx.beginPath()
  ctx.moveTo(13.2 * k, (NROOF - 0.15) * k)
  ctx.lineTo(13.2 * k, (NROOF - 4.2) * k)
  for (const [y, w] of [[-3.9, 1.3], [-3.3, 1.0], [-2.7, 0.75]] as const) {
    ctx.moveTo((13.2 - w) * k, (NROOF + y) * k)
    ctx.lineTo((13.2 + w) * k, (NROOF + y) * k)
  }
  // The washing line's posts and the line.
  ctx.moveTo(14.8 * k, (NROOF - 0.15) * k)
  ctx.lineTo(14.8 * k, (NROOF - 2.0) * k)
  ctx.moveTo(23.5 * k, (NROOF - 0.15) * k)
  ctx.lineTo(23.5 * k, (NROOF - 2.0) * k)
  ctx.moveTo(14.8 * k, (NROOF - 1.95) * k)
  ctx.quadraticCurveTo(19.15 * k, (NROOF - 1.6) * k, 23.5 * k, (NROOF - 1.95) * k)
  ctx.stroke()
  // The sheets, filling and going slack.
  ctx.fillStyle = css('#C8B8BC', 0.95)
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const sx = 15.4 + i * 2.6
    const top = NROOF - 1.88 + 0.08 * Math.sin(((sx - 14.8) / 8.7) * Math.PI)
    const blow = 0.35 + 0.3 * Math.sin(t * 1.3 + i * 1.7) + 0.15 * Math.sin(t * 3.1 + i)
    const w = 1.9
    ctx.moveTo(sx * k, top * k)
    ctx.lineTo((sx + w) * k, top * k)
    ctx.quadraticCurveTo((sx + w + blow * 0.5) * k, (top + 0.7) * k, (sx + w + blow) * k, (top + 1.35 - blow * 0.3) * k)
    ctx.quadraticCurveTo((sx + w * 0.5 + blow) * k, (top + 1.5 - blow * 0.2 + 0.1 * Math.sin(t * 4 + i)) * k, (sx + blow) * k, (top + 1.35 - blow * 0.3) * k)
    ctx.quadraticCurveTo((sx + blow * 0.5) * k, (top + 0.7) * k, sx * k, top * k)
  }
  ctx.fill()

  // The windows: the room's light or the dark, a sash and a sill.
  const lit = new Path2D()
  const dark = new Path2D()
  const frames = new Path2D()
  const cols = Math.min(COLS, Math.ceil((x1 - COL0) / COL_STEP))
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < ROWS; r++) {
      const x = winX(c)
      const y = winY(r)
      const on = lightOf(c, r, t, start)
      ;(on > 0.5 ? lit : dark).rect(x * k, y * k, COL_W * k, ROW_H * k)
      frames.rect((x - 0.1) * k, (y + ROW_H) * k, (COL_W + 0.2) * k, 0.14 * k)
      frames.rect(x * k, (y + ROW_H * 0.48) * k, COL_W * k, 0.07 * k)
    }
  }
  ctx.fillStyle = '#211A20'
  ctx.fill(dark)
  ctx.fillStyle = '#E2B278'
  ctx.fill(lit)
  ctx.fillStyle = '#5A4648'
  ctx.fill(frames)

  // The lives in the near windows, dark against their rooms' light.
  const who = new Path2D()
  const pale = new Path2D()
  // A boy at the glass, his eyes on the pigeons.
  {
    const x = winX(0) + COL_W / 2
    const sill = winY(0) + ROW_H
    const look = Math.max(-1, Math.min(1, (flockX - x) / 25))
    bust(who, k, x, sill, 0.8, 0, look)
    who.moveTo((x - 0.32) * k, (sill - 0.05) * k)
    who.rect((x - 0.45) * k, (sill - 0.32) * k, 0.9 * k, 0.12 * k)
  }
  // A man shaving at the glass in his undershirt, the razor going up his cheek and down again.
  {
    const x = winX(1) + COL_W / 2
    const sill = winY(1) + ROW_H
    const stroke = Math.max(0, Math.sin(t * 2.4))
    bust(who, k, x, sill + 0.15, 1.0, 0.03 * Math.sin(t * 0.7))
    const hand: Pt = [x + 0.24, sill - 1.0 + 0.25 * stroke]
    who.moveTo((x + 0.3) * k, (sill - 0.45) * k)
    who.lineTo((hand[0] + 0.1) * k, (hand[1] + 0.05) * k)
    who.lineTo(hand[0] * k, (hand[1] + 0.12) * k)
    who.lineTo((x + 0.18) * k, (sill - 0.4) * k)
    who.closePath()
    // His undershirt, and the lather on his chin.
    pale.moveTo((x - 0.28) * k, (sill + 0.15) * k)
    pale.lineTo((x - 0.22) * k, (sill - 0.45) * k)
    pale.lineTo((x + 0.22) * k, (sill - 0.45) * k)
    pale.lineTo((x + 0.28) * k, (sill + 0.15) * k)
    pale.closePath()
    pale.moveTo((x + 0.15) * k, (sill - 0.78) * k)
    pale.ellipse(x * k, (sill - 0.8) * k, 0.15 * k, 0.09 * k, 0, 0, Math.PI * 2)
  }
  // A woman shaking a rug out over the sill.
  {
    const x = winX(0) + COL_W / 2
    const sill = winY(2) + ROW_H
    const shake = Math.sin(t * 5.2) * (0.6 + 0.4 * Math.sin(t * 0.5))
    bust(who, k, x, sill - 0.1, 0.9, 0.1)
    // The rug hangs out over the sill from her hands, a wave going down it.
    const rug = new Path2D()
    const w = 0.85
    const len = 1.5
    rug.moveTo((x - w / 2) * k, (sill - 0.05) * k)
    rug.lineTo((x + w / 2) * k, (sill - 0.05) * k)
    for (let j = 1; j <= 6; j++) {
      const u = j / 6
      rug.lineTo((x + w / 2 + 0.25 * shake * Math.sin(u * 4 - t * 9) * u) * k, (sill - 0.05 + len * u - 0.12 * shake * u) * k)
    }
    for (let j = 6; j >= 1; j--) {
      const u = j / 6
      rug.lineTo((x - w / 2 + 0.25 * shake * Math.sin(u * 4 - t * 9) * u) * k, (sill - 0.05 + len * u - 0.12 * shake * u) * k)
    }
    rug.closePath()
    ctx.fillStyle = '#8A3A34'
    ctx.fill(rug)
    ctx.strokeStyle = css('#D8B070', 0.8)
    ctx.lineWidth = Math.max(1, 0.05 * k)
    ctx.stroke(rug)
  }
  // A man behind his paper; he turns a page now and then.
  {
    const x = winX(1) + COL_W / 2
    const sill = winY(2) + ROW_H
    bust(who, k, x, sill, 0.85)
    const turn = (t * 0.22) % 1
    const fold = turn < 0.08 ? Math.sin((turn / 0.08) * Math.PI) : 0
    pale.rect((x - 0.42 + fold * 0.3) * k, (sill - 1.05) * k, (0.84 - fold * 0.45) * k, 0.62 * k)
  }
  // A cat on a sill, its tail going.
  {
    const x = winX(0) + 0.3
    const sill = winY(1) + ROW_H
    who.moveTo((x + 0.3) * k, (sill - 0.25) * k)
    who.ellipse(x * k, (sill - 0.22) * k, 0.3 * k, 0.2 * k, 0, 0, Math.PI * 2)
    who.moveTo((x + 0.42) * k, (sill - 0.48) * k)
    who.arc((x + 0.3) * k, (sill - 0.48) * k, 0.13 * k, 0, Math.PI * 2)
    const tail = 0.3 * Math.sin(t * 1.7)
    who.moveTo((x - 0.25) * k, (sill - 0.1) * k)
    who.quadraticCurveTo((x - 0.55) * k, (sill + 0.1) * k, (x - 0.5 + tail) * k, (sill + 0.45) * k)
    who.lineTo((x - 0.42 + tail) * k, (sill + 0.45) * k)
    who.quadraticCurveTo((x - 0.45) * k, (sill + 0.05) * k, (x - 0.2) * k, (sill - 0.05) * k)
    who.closePath()
  }
  // And in the other lit rooms, now and then someone going past the window.
  const near = new Set(['0,0', '1,1', '0,2', '1,2', '0,1', `${ESC_COL},0`])
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < ROWS; r++) {
      if (near.has(`${c},${r}`) || lightOf(c, r, t, start) < 0.5) continue
      const period = 7 + 8 * hash(c, r, 812)
      const u = (t + period * hash(c, r, 813)) % period
      if (u > 1.6) continue
      const dir = hash(c, r, 814) < 0.5 ? 1 : -1
      const x = winX(c) + COL_W / 2 + dir * (u / 1.6 - 0.5) * (COL_W + 1)
      const sill = winY(r) + ROW_H
      const P = new Path2D()
      bust(P, k, x, sill + 0.1, 0.85)
      ctx.save()
      ctx.beginPath()
      ctx.rect(winX(c) * k, winY(r) * k, COL_W * k, ROW_H * k)
      ctx.clip()
      ctx.fillStyle = '#2A2028'
      ctx.fill(P)
      ctx.restore()
    }
  }
  ctx.fillStyle = '#231B22'
  ctx.fill(who)
  ctx.fillStyle = '#D6CCC4'
  ctx.fill(pale)

  // Washing on a pulley line out of a window, reeled out a shirt at a time and back.
  {
    const a: Pt = [winX(1) + COL_W, winY(0) + ROW_H * 0.6]
    const b: Pt = [NX1 - 1, winY(0) - 0.4]
    ctx.strokeStyle = css('#1E181E', 0.9)
    ctx.lineWidth = Math.max(1, 0.035 * k)
    ctx.beginPath()
    ctx.moveTo(a[0] * k, a[1] * k)
    ctx.lineTo(b[0] * k, b[1] * k)
    ctx.stroke()
    const reel = (t * 0.35) % 1
    const out = 0.6 + 2.2 * smooth(reel * 2) - 2.2 * smooth(reel * 2 - 1)
    const cols = ['#C8C0B4', '#6A7E9A', '#B89A70', '#D0C8C8']
    for (let i = 0; i < 4; i++) {
      const u = (out + i * 1.15) / (b[0] - a[0])
      const px = a[0] + (b[0] - a[0]) * u
      const py = a[1] + (b[1] - a[1]) * u
      const flap = 0.08 * Math.sin(t * 3.3 + i * 1.4)
      ctx.fillStyle = cols[i]
      ctx.beginPath()
      ctx.moveTo((px - 0.32) * k, py * k)
      ctx.lineTo((px + 0.32) * k, py * k)
      ctx.lineTo((px + 0.3 + flap) * k, (py + 0.7) * k)
      ctx.lineTo((px - 0.3 + flap) * k, (py + 0.7) * k)
      ctx.closePath()
      ctx.fill()
    }
  }

  // The fire escape down the third bay: a landing under each window, its rail, and the stair between.
  {
    const x0 = winX(ESC_COL) - 0.75
    const x1e = winX(ESC_COL) + COL_W + 0.75
    ctx.strokeStyle = css('#141016', 0.95)
    ctx.lineWidth = Math.max(1, 0.06 * k)
    ctx.beginPath()
    for (let r = 0; r < ROWS; r++) {
      const fl = winY(r) + ROW_H + 0.12
      ctx.moveTo(x0 * k, fl * k)
      ctx.lineTo(x1e * k, fl * k)
      ctx.moveTo(x0 * k, (fl - 0.85) * k)
      ctx.lineTo(x1e * k, (fl - 0.85) * k)
      for (let x = x0; x <= x1e + 1e-6; x += (x1e - x0) / 6) {
        ctx.moveTo(x * k, fl * k)
        ctx.lineTo(x * k, (fl - 0.85) * k)
      }
      if (r < ROWS - 1) {
        const dir = r % 2 ? 1 : -1
        ctx.moveTo((dir > 0 ? x0 + 0.2 : x1e - 0.2) * k, fl * k)
        ctx.lineTo((dir > 0 ? x1e - 0.3 : x0 + 0.3) * k, (fl + ROW_STEP) * k)
      }
    }
    ctx.stroke()
    // A curtain out of the open window onto the landing, and geraniums.
    const sill = winY(0) + ROW_H
    const blow = 0.3 + 0.25 * Math.sin(t * 1.1) + 0.1 * Math.sin(t * 2.9)
    ctx.fillStyle = css('#E8DCC8', 0.92)
    ctx.beginPath()
    ctx.moveTo((winX(ESC_COL) + COL_W) * k, winY(0) * k)
    ctx.quadraticCurveTo((winX(ESC_COL) + COL_W + blow) * k, (winY(0) + 0.6) * k, (winX(ESC_COL) + COL_W + blow * 1.4) * k, (sill - 0.3) * k)
    ctx.lineTo((winX(ESC_COL) + COL_W * 0.6) * k, (sill - 0.1) * k)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#8A3A2C'
    for (const r of [1, 3]) ctx.fillRect((x0 + 0.15) * k, (winY(r) + ROW_H - 0.25) * k, 0.4 * k, 0.37 * k)
    ctx.fillStyle = '#C8483A'
    ctx.beginPath()
    for (const r of [1, 3]) {
      const px = x0 + 0.35 + 0.04 * Math.sin(t * 1.4 + r)
      ctx.moveTo((px + 0.22) * k, (winY(r) + ROW_H - 0.42) * k)
      ctx.arc(px * k, (winY(r) + ROW_H - 0.42) * k, 0.22 * k, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  // The shop on its ground floor, its blind going up.
  {
    const sx0 = NX0 + 0.6
    const sx1 = Math.min(x1, NX0 + 9)
    const top = 20.0
    ctx.fillStyle = '#5A3A2A'
    ctx.fillRect(sx0 * k, (top - 0.5) * k, (sx1 - sx0) * k, 0.5 * k)
    ctx.fillStyle = '#E8C080'
    ctx.fillRect((sx0 + 0.3) * k, top * k, (sx1 - sx0 - 0.6) * k, (base - top - 0.2) * k)
    const up = smooth((t - start - 14) / 2.5)
    ctx.fillStyle = '#4A4044'
    ctx.fillRect((sx0 + 0.3) * k, top * k, (sx1 - sx0 - 0.6) * k, (base - top - 0.2) * (1 - up) * k)
    ctx.strokeStyle = css('#2A2226', 0.6)
    ctx.lineWidth = Math.max(1, 0.03 * k)
    ctx.beginPath()
    for (let y = top + 0.18; y < top + (base - top - 0.2) * (1 - up); y += 0.18) {
      ctx.moveTo((sx0 + 0.3) * k, y * k)
      ctx.lineTo((sx1 - 0.3) * k, y * k)
    }
    ctx.stroke()
    // Its striped awning.
    ctx.fillStyle = '#7A2E2A'
    ctx.fillRect((sx0 - 0.2) * k, (top - 0.6) * k, (sx1 - sx0 + 0.4) * k, 0.55 * k)
    ctx.fillStyle = '#D8C8B0'
    for (let x = sx0; x < sx1; x += 0.8) ctx.fillRect(x * k, (top - 0.6) * k, 0.4 * k, 0.55 * k)
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the building's own roof */

/** The roof's chimney stack, left of the washing, for its smoke (`finale.ts`). */
export const STACK: Pt = [-31.6, 0]
const LINE_X0 = -29
const LINE_X1 = -18.6

/**
 * The washing on the building's roof, beside the loft: sheets, shirts and a row of nappies (there is a new baby on the top
 * floor), filling and flapping in the dawn wind; and the chimney stack it is downwind of.
 */
export function drawRoofWashing(ctx: CanvasRenderingContext2D, k: number, f: Frame, t: number, roof: number): void {
  const top = roof - 0.5
  if (f.x1 < STACK[0] - 2 || f.x0 > LINE_X1 + 2 || f.y0 > top) return
  const line = top - 2.3
  ctx.save()
  // The stack.
  ctx.fillStyle = '#3A2A2C'
  ctx.fillRect((STACK[0] - 0.6) * k, (top - 2.9) * k, 1.2 * k, 2.9 * k)
  ctx.fillStyle = '#4C3A3A'
  ctx.fillRect((STACK[0] - 0.72) * k, (top - 3.05) * k, 1.44 * k, 0.3 * k)
  // The posts and the line, sagging.
  ctx.strokeStyle = css('#2A2228', 0.95)
  ctx.lineWidth = Math.max(1, 0.07 * k)
  ctx.beginPath()
  for (const x of [LINE_X0, LINE_X1]) {
    ctx.moveTo(x * k, top * k)
    ctx.lineTo(x * k, (line - 0.15) * k)
  }
  ctx.stroke()
  ctx.lineWidth = Math.max(1, 0.03 * k)
  ctx.beginPath()
  ctx.moveTo(LINE_X0 * k, line * k)
  ctx.quadraticCurveTo(((LINE_X0 + LINE_X1) / 2) * k, (line + 0.5) * k, LINE_X1 * k, line * k)
  ctx.stroke()
  const at = (x: number): number => {
    const u = (x - LINE_X0) / (LINE_X1 - LINE_X0)
    return line + 0.5 * 4 * u * (1 - u) * 0.5
  }
  // What hangs on it: [where it starts, how wide, how long, its colour].
  const pieces: [number, number, number, string][] = [
    [-28.6, 2.3, 1.55, '#CFC4C8'],
    [-26.0, 0.9, 1.0, '#7A8CA6'],
    [-24.8, 0.9, 1.0, '#D8D0C8'],
    [-23.6, 0.42, 0.42, '#E6E0DA'],
    [-23.0, 0.42, 0.42, '#E6E0DA'],
    [-22.4, 0.42, 0.42, '#E6E0DA'],
    [-21.8, 0.42, 0.42, '#E6E0DA'],
    [-21.2, 2.2, 1.45, '#C4B8C0'],
  ]
  pieces.forEach(([x, w, h, col], i) => {
    const y0 = at(x)
    const y1 = at(x + w)
    // The wind fills it out sideways and lifts its hem, in gusts; the flutter runs along it.
    const gust = 0.55 + 0.45 * Math.sin(t * 0.9 + 0.4) * Math.sin(t * 0.37 + 1.1)
    const blow = (0.25 + 0.55 * gust) * h + 0.08 * Math.sin(t * 6.3 + i * 1.9) * h
    const flut = 0.1 * Math.sin(t * 8.1 + i * 2.3) * h
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(x * k, y0 * k)
    ctx.lineTo((x + w) * k, y1 * k)
    ctx.quadraticCurveTo((x + w + blow * 0.45) * k, (y1 + h * 0.5) * k, (x + w + blow) * k, (y1 + h - blow * 0.35) * k)
    ctx.quadraticCurveTo((x + w * 0.5 + blow) * k, (y0 + h - blow * 0.3 + flut) * k, (x + blow * 0.85) * k, (y0 + h - blow * 0.4) * k)
    ctx.quadraticCurveTo((x + blow * 0.35) * k, (y0 + h * 0.5) * k, x * k, y0 * k)
    ctx.fill()
  })
  ctx.restore()
}

/* ------------------------------------------------------------------ the street */

/** People going to work along the near pavement under the El, each on their own errand, each their own pace. */
interface Walker {
  kind: number
  dir: 1 | -1
  v: number
  x0: number
  coat: string
}
const COATS = ['#3A3440', '#4A3A34', '#2E3A46', '#463E30', '#3C2E3A', '#2A2E36']
const WALKERS: Walker[] = Array.from({ length: 13 }, (_, i): Walker => ({
  kind: i % 6,
  dir: hash(i, 1, 91) < 0.5 ? 1 : -1,
  v: i % 6 === 4 ? 4.2 : 1.5 + 0.8 * hash(i, 2, 91),
  x0: hash(i, 3, 91) * 130,
  coat: COATS[i % COATS.length],
}))
const WALK_FROM = -100
const WALK_SPAN = 130

/** One person, side on, `h` cells tall, feet at (x, foot), walking `dir` at phase `ph`. */
function walker(P: Path2D, skin: Path2D, k: number, w: Walker, x: number, foot: number, h: number, ph: number): void {
  const d = w.dir
  const s = h / 2
  const stride = 0.32 * s * Math.sin(ph)
  const bob = 0.04 * s * Math.abs(Math.cos(ph))
  const hip = foot - 0.95 * s - bob
  if (w.kind === 4) {
    // On a bicycle, a basket of bread on the front.
    const wy = foot - 0.38 * s
    for (const wx of [x - 0.55 * s, x + 0.55 * s]) {
      P.moveTo((wx + 0.38 * s) * k, wy * k)
      P.arc(wx * k, wy * k, 0.38 * s * k, 0, Math.PI * 2)
      P.moveTo((wx + 0.3 * s) * k, wy * k)
      P.arc(wx * k, wy * k, 0.3 * s * k, 0, Math.PI * 2, true)
    }
    P.rect((x - 0.55 * s) * k, (wy - 0.45 * s) * k, 1.1 * s * k, 0.06 * s * k)
    P.rect((x + d * 0.5 * s - 0.25 * s) * k, (wy - 0.75 * s) * k, 0.5 * s * k, 0.3 * s * k)
    P.moveTo((x - d * 0.1 * s) * k, (wy - 0.5 * s) * k)
    P.lineTo((x + d * 0.15 * s) * k, (wy - 1.35 * s) * k)
    P.lineTo((x + d * 0.35 * s) * k, (wy - 1.3 * s) * k)
    P.lineTo((x + d * 0.08 * s) * k, (wy - 0.45 * s) * k)
    P.closePath()
    skin.moveTo((x + d * 0.24 * s + 0.15 * s) * k, (wy - 1.5 * s) * k)
    skin.arc((x + d * 0.24 * s) * k, (wy - 1.5 * s) * k, 0.15 * s * k, 0, Math.PI * 2)
    const pedal = Math.sin(ph * 1.3) * 0.18 * s
    P.moveTo((x - 0.06 * s) * k, (wy - 0.5 * s) * k)
    P.lineTo((x + pedal) * k, (wy + 0.05 * s) * k)
    return
  }
  // Legs.
  P.moveTo((x - 0.08 * s) * k, hip * k)
  P.lineTo((x + stride - 0.06 * s) * k, foot * k)
  P.lineTo((x + stride + 0.08 * s) * k, foot * k)
  P.lineTo((x + 0.08 * s) * k, hip * k)
  P.closePath()
  P.moveTo((x - 0.08 * s) * k, hip * k)
  P.lineTo((x - stride - 0.06 * s) * k, foot * k)
  P.lineTo((x - stride + 0.08 * s) * k, foot * k)
  P.lineTo((x + 0.08 * s) * k, hip * k)
  P.closePath()
  // The coat (a woman's skirt flares), the arms swinging.
  const sh = foot - 1.62 * s - bob
  const flare = w.kind === 1 || w.kind === 3 ? 0.12 * s : 0
  P.moveTo((x - 0.2 * s) * k, sh * k)
  P.lineTo((x + 0.2 * s) * k, sh * k)
  P.lineTo((x + 0.22 * s + flare) * k, (hip + 0.25 * s) * k)
  P.lineTo((x - 0.22 * s - flare) * k, (hip + 0.25 * s) * k)
  P.closePath()
  const arm = 0.22 * s * Math.sin(ph + Math.PI)
  P.moveTo(x * k, (sh + 0.05 * s) * k)
  P.lineTo((x + arm) * k, (sh + 0.62 * s) * k)
  // The head, and a hat for some.
  const hx = x + d * 0.03 * s
  const hy = sh - 0.2 * s
  skin.moveTo((hx + 0.14 * s) * k, hy * k)
  skin.arc(hx * k, hy * k, 0.14 * s * k, 0, Math.PI * 2)
  if (w.kind === 0 || w.kind === 5) {
    P.rect((hx - 0.22 * s) * k, (hy - 0.12 * s) * k, 0.44 * s * k, 0.05 * s * k)
    P.rect((hx - 0.13 * s) * k, (hy - 0.27 * s) * k, 0.26 * s * k, 0.16 * s * k)
  }
  if (w.kind === 2) P.rect((hx - 0.16 * s + d * 0.04 * s) * k, (hy - 0.16 * s) * k, 0.32 * s * k, 0.08 * s * k)
  if (w.kind === 2) P.rect((x + arm - 0.12 * s) * k, (sh + 0.6 * s) * k, 0.24 * s * k, 0.16 * s * k)
  if (w.kind === 1) P.rect((x + arm - 0.1 * s) * k, (sh + 0.55 * s) * k, 0.22 * s * k, 0.3 * s * k)
  if (w.kind === 3) {
    // A pram ahead of her.
    const px = x + d * 0.75 * s
    P.moveTo((x + d * 0.2 * s) * k, (sh + 0.45 * s) * k)
    P.lineTo((px - d * 0.3 * s) * k, (hip + 0.05 * s) * k)
    P.rect((px - 0.38 * s) * k, (hip + 0.05 * s) * k, 0.76 * s * k, 0.42 * s * k)
    P.moveTo((px - d * 0.38 * s) * k, (hip + 0.05 * s) * k)
    P.quadraticCurveTo((px - d * 0.38 * s) * k, (hip - 0.35 * s) * k, (px + d * 0.05 * s) * k, (hip - 0.3 * s) * k)
    P.lineTo((px + d * 0.05 * s) * k, (hip + 0.05 * s) * k)
    for (const wx of [px - 0.25 * s, px + 0.25 * s]) {
      P.moveTo((wx + 0.12 * s) * k, (foot - 0.12 * s) * k)
      P.arc(wx * k, (foot - 0.12 * s) * k, 0.12 * s * k, 0, Math.PI * 2)
    }
  }
}

/**
 * The near pavement under the El: its curb, the people on it, and the newsstand at the corner with its man and his
 * bundles. Nearer than the building, as the El is, so it slides by a little faster as the camera goes.
 */
export function drawPavement(ctx: CanvasRenderingContext2D, k: number, f: Frame, t: number, start: number, base: number, part: 'ground' | 'people'): void {
  const curb = base + 3.1
  if (f.y1 < curb - 2.6) return
  const near = 1.12
  const dx = (f.cx - -30) * (1 - near)
  ctx.save()
  ctx.translate(dx * k, 0)
  const lo = f.x0 - dx - 4
  const hi = f.x1 - dx + 4
  if (part === 'ground') {
    // The kerb and the flags, under the El: its columns come down onto them.
    ctx.fillStyle = '#4A4450'
    ctx.fillRect(lo * k, curb * k, (hi - lo) * k, 0.3 * k)
    ctx.fillStyle = '#36303C'
    ctx.fillRect(lo * k, (curb + 0.3) * k, (hi - lo) * k, (f.y1 - curb + 2) * k)
    ctx.strokeStyle = css('#000000', 0.2)
    ctx.lineWidth = Math.max(1, 0.03 * k)
    ctx.beginPath()
    for (let x = Math.floor(lo / 2.5) * 2.5; x < hi; x += 2.5) {
      ctx.moveTo(x * k, (curb + 0.3) * k)
      ctx.lineTo((x - 0.6) * k, (curb + 2.4) * k)
    }
    ctx.stroke()
    ctx.restore()
    return
  }
  // The newsstand at the corner: its counter of papers, its awning, the man in it.
  const nx = -61
  if (nx + 4 > lo && nx - 4 < hi) {
    const foot = curb + 1.9
    ctx.fillStyle = '#3A2C24'
    ctx.fillRect((nx - 1.8) * k, (foot - 2.6) * k, 3.6 * k, 2.6 * k)
    ctx.fillStyle = '#5E2C28'
    ctx.fillRect((nx - 2.1) * k, (foot - 3.0) * k, 4.2 * k, 0.45 * k)
    ctx.fillStyle = '#D8D0C0'
    for (let i = 0; i < 5; i++) ctx.fillRect((nx - 1.7 + i * 0.7) * k, (foot - 1.25) * k, 0.55 * k, 0.2 * k)
    ctx.fillStyle = '#B8B0A0'
    for (let i = 0; i < 4; i++) ctx.fillRect((nx - 1.4 + i * 0.75) * k, (foot - 1.05) * k, 0.6 * k, 0.15 * k)
    const P = new Path2D()
    // He leans out over his papers now and then.
    const reach = Math.max(0, Math.sin(t * 0.9)) * 0.3
    bust(P, k, nx + 0.4 - reach, foot - 1.35, 1.0)
    ctx.fillStyle = '#231C22'
    ctx.fill(P)
  }
  // The people, wrapping round a stretch longer than any frame, so there are always some going by.
  const bodies = new Map<string, Path2D>()
  const skin = new Path2D()
  for (let i = 0; i < WALKERS.length; i++) {
    const w = WALKERS[i]
    const u = (((w.x0 + w.dir * w.v * (t - start)) % WALK_SPAN) + WALK_SPAN) % WALK_SPAN
    const x = WALK_FROM + u
    if (x < lo || x > hi) continue
    const foot = curb + 0.75 + 0.9 * hash(i, 4, 91)
    const h = 1.9 + 0.25 * hash(i, 5, 91)
    let P = bodies.get(w.coat)
    if (!P) {
      P = new Path2D()
      bodies.set(w.coat, P)
    }
    walker(P, skin, k, w, x, foot, h, (t - start) * w.v * 2.6 + i)
  }
  ctx.lineCap = 'round'
  for (const [coat, P] of bodies) {
    ctx.fillStyle = coat
    ctx.fill(P)
    ctx.strokeStyle = coat
    ctx.lineWidth = Math.max(1, 0.12 * k)
    ctx.stroke(P)
  }
  ctx.fillStyle = '#A88A7A'
  ctx.fill(skin)
  ctx.restore()
}

/**
 * The milk truck: along the street at the building's foot, pulling up at the kerb while the milkman takes a crate in
 * at the door and comes back for the empties, then on to the next house.
 */
export function drawMilk(ctx: CanvasRenderingContext2D, k: number, f: Frame, t: number, start: number, base: number): void {
  const stop = -38
  const arrive = start + 8
  const leave = start + 18.5
  // In from the left, slowing to the kerb; and away, gathering speed.
  const x = t < arrive ? stop - 22 * Math.pow((arrive - t) / 5, 1.6) : t > leave ? stop + 1.1 * (t - leave) * (t - leave) : stop
  if (x < f.x0 - 6 || x > f.x1 + 6) return
  const y = base + 1.55
  ctx.save()
  // The van: a tall white box, its cab forward, the dairy's red band.
  ctx.fillStyle = '#D8D0C4'
  ctx.beginPath()
  ctx.roundRect((x - 2.4) * k, (y - 2.3) * k, 3.6 * k, 2.0 * k, 0.15 * k)
  ctx.roundRect((x + 1.1) * k, (y - 1.75) * k, 1.4 * k, 1.45 * k, 0.35 * k)
  ctx.fill()
  ctx.fillStyle = '#9A3A30'
  ctx.fillRect((x - 2.4) * k, (y - 1.2) * k, 3.6 * k, 0.28 * k)
  ctx.fillStyle = '#3E4A58'
  ctx.fillRect((x + 1.5) * k, (y - 1.6) * k, 0.75 * k, 0.55 * k)
  ctx.fillStyle = '#141216'
  for (const wx of [x - 1.5, x + 1.6]) {
    ctx.beginPath()
    ctx.arc(wx * k, (y - 0.25) * k, 0.38 * k, 0, Math.PI * 2)
    ctx.fill()
  }
  // The milkman, to the door with a crate and back for the empties.
  if (t > arrive + 0.6 && t < leave - 0.4) {
    const u = (t - arrive - 0.6) / (leave - arrive - 1.0)
    const trip = u < 0.5 ? u * 2 : 2 - u * 2
    const mx = x - 2.7 - 2.4 * smooth(trip * 1.15)
    const foot = base + 0.55
    const P = new Path2D()
    const S = new Path2D()
    const w: Walker = { kind: 2, dir: u < 0.5 ? -1 : 1, v: 1.6, x0: 0, coat: '#D8D0C4' }
    walker(P, S, k, w, mx, foot, 1.9, t * 7.5)
    ctx.fillStyle = '#D0C8BC'
    ctx.fill(P)
    ctx.strokeStyle = '#D0C8BC'
    ctx.lineWidth = Math.max(1, 0.12 * k)
    ctx.lineCap = 'round'
    ctx.stroke(P)
    ctx.fillStyle = '#A88A7A'
    ctx.fill(S)
    // The crate of bottles.
    ctx.fillStyle = '#6A5038'
    ctx.fillRect((mx - 0.35) * k, (foot - 1.05) * k, 0.7 * k, 0.4 * k)
    if (u < 0.5) {
      ctx.fillStyle = '#F0ECE4'
      for (let i = 0; i < 4; i++) ctx.fillRect((mx - 0.3 + i * 0.16) * k, (foot - 1.25) * k, 0.1 * k, 0.22 * k)
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ near the lens */

/** How far in front of the building the near things stand (in `deep`'s measure). */
const NEAR_E = -11

/**
 * What the crane goes past, at the edges of its frame: the fire escape of the house across the street on the left,
 * and on the right a telegraph pole with its wires sagging away and a pigeon or two on them; dark against the dawn.
 * They come in from outside the frame as the camera comes out, and go off it again as it comes back in.
 */
export function drawNear(ctx: CanvasRenderingContext2D, k: number, f: Frame, t: number): void {
  const H = f.y1 - f.y0
  if (H + NEAR_E < 2) return
  const s = H / (H + NEAR_E)
  if (s > 4) return
  const at = (x: number, y: number): Pt => [f.cx + (x - f.cx) * s, f.cy + (y - f.cy) * s]
  ctx.save()
  ctx.fillStyle = css('#141016', 0.97)
  ctx.strokeStyle = css('#141016', 0.97)
  ctx.lineCap = 'round'
  // The fire escape: two landings with their rails and the stair between, a pot on one, washing on the rail.
  {
    const P = new Path2D()
    const L = new Path2D()
    const x0 = -63.5
    const x1 = -57.5
    for (const fl of [8.5, 17.5]) {
      const [ax, ay] = at(x0, fl)
      const [bx] = at(x1, fl)
      P.rect(ax * k, ay * k, (bx - ax) * k, 0.22 * s * k)
      const [, ty] = at(x0, fl - 1.4)
      L.moveTo(ax * k, ty * k)
      L.lineTo(bx * k, ty * k)
      for (let i = 0; i <= 8; i++) {
        const x = ax + ((bx - ax) * i) / 8
        L.moveTo(x * k, ay * k)
        L.lineTo(x * k, ty * k)
      }
    }
    const [s0x, s0y] = at(x1 - 0.5, 8.7)
    const [s1x, s1y] = at(x0 + 0.8, 17.5)
    L.moveTo(s0x * k, s0y * k)
    L.lineTo(s1x * k, s1y * k)
    for (let i = 1; i < 10; i++) {
      const u = i / 10
      const x = s0x + (s1x - s0x) * u
      const y = s0y + (s1y - s0y) * u
      L.moveTo((x - 0.3 * s) * k, y * k)
      L.lineTo((x + 0.3 * s) * k, y * k)
    }
    // The wall it is bolted to, at the frame's edge.
    const [wx, wy] = at(x0 - 0.4, -30)
    const [, wy1] = at(x0, 40)
    P.rect((wx - 20 * s) * k, wy * k, 20 * s * k, (wy1 - wy) * k)
    // A pot of geraniums, and a shirt over the rail moving in the air.
    const [px, py] = at(x1 - 1.4, 8.5)
    P.rect((px - 0.3 * s) * k, (py - 0.55 * s) * k, 0.6 * s * k, 0.55 * s * k)
    ctx.lineWidth = Math.max(1, 0.1 * s * k)
    ctx.fill(P)
    ctx.stroke(L)
    ctx.fillStyle = css('#6A2A2A', 0.95)
    ctx.beginPath()
    ctx.arc(px * k, (py - 0.8 * s) * k, 0.35 * s * k, 0, Math.PI * 2)
    ctx.fill()
    // Washing on the rails and on a line out from the upper landing, all of it going in the wind.
    ctx.fillStyle = css('#4A4250', 0.97)
    ctx.beginPath()
    const hang = (hx: number, hy: number, w: number, h: number, seed: number): void => {
      const blow = (0.25 + 0.2 * Math.sin(t * 1.3 + seed) + 0.12 * Math.sin(t * 5.7 + seed * 2)) * h
      ctx.moveTo((hx - w / 2) * k, hy * k)
      ctx.lineTo((hx + w / 2) * k, hy * k)
      ctx.lineTo((hx + w / 2 + blow) * k, (hy + h - blow * 0.3) * k)
      ctx.lineTo((hx - w / 2 + blow * 0.8) * k, (hy + h - blow * 0.35 + 0.05 * h * Math.sin(t * 7 + seed)) * k)
      ctx.closePath()
    }
    const [qx, qy] = at(x0 + 2.2, 17.5 - 1.4)
    hang(qx, qy, 1.2 * s, 1.3 * s, 1)
    const [lx, ly] = at(x0 + 4.4, 8.5 - 1.4)
    hang(lx, ly, 1.0 * s, 1.1 * s, 2)
    const [ax0, ay0] = at(x1, 8.5 - 1.6)
    const [ax1, ay1] = at(x0 - 12, 5.5)
    ctx.fill()
    ctx.lineWidth = Math.max(1, 0.04 * s * k)
    ctx.beginPath()
    ctx.moveTo(ax0 * k, ay0 * k)
    ctx.quadraticCurveTo(((ax0 + ax1) / 2) * k, ((ay0 + ay1) / 2 + 1.2 * s) * k, ax1 * k, ay1 * k)
    ctx.stroke()
    ctx.fillStyle = css('#5A4E5C', 0.97)
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const u = 0.2 + i * 0.2
      const px = ax0 + (ax1 - ax0) * u
      const py = ay0 + (ay1 - ay0) * u + 1.2 * s * 4 * u * (1 - u) * 0.5
      hang(px, py, 0.9 * s, (i % 2 ? 1.0 : 1.5) * s, 3 + i)
    }
    ctx.fill()
  }
  // The telegraph pole and its wires, swinging a little.
  {
    const [px, top] = at(7.5, -16)
    const [, foot] = at(7.5, 40)
    ctx.fillStyle = css('#141016', 0.97)
    ctx.fillRect((px - 0.28 * s) * k, top * k, 0.56 * s * k, (foot - top) * k)
    for (const [y, w] of [[-15, 2.4], [-13.4, 1.9]] as const) {
      const [ax, ay] = at(7.5 - w, y)
      const [bx] = at(7.5 + w, y)
      ctx.fillRect(ax * k, ay * k, (bx - ax) * k, 0.22 * s * k)
    }
    ctx.lineWidth = Math.max(1, 0.05 * s * k)
    ctx.beginPath()
    for (let j = 0; j < 4; j++) {
      const y = j < 2 ? -15 : -13.4
      const ox = (j % 2 ? 1 : -1) * (j < 2 ? 2.0 : 1.5)
      const [ax, ay] = at(7.5 + ox, y - 0.1)
      const [bx, by] = at(-40 + j * 3, -26 + j * 0.6)
      const sag = (3.2 + 0.6 * Math.sin(t * 0.9 + j) + 0.2 * Math.sin(t * 2.3 + j * 2)) * s
      ctx.moveTo(ax * k, ay * k)
      ctx.quadraticCurveTo(((ax + bx) / 2) * k, ((ay + by) / 2 + sag) * k, bx * k, by * k)
    }
    ctx.stroke()
  }
  ctx.restore()
}

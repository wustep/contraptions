import type { Pt } from '../../../../../parts'
import { motes, parallax, rain, rising, sway, type Frame } from '../depth'
import { hash, smooth } from '../kit'
import { at as beatAt, BEAT } from '../music'
import { G } from '../physics'
import { ctxOf, ellipse, mix, rect, rgba, type Pen } from '../pen'
import {
  BREAK,
  BULB_OUT,
  bulbLevel,
  ceilOf,
  F_MARTY,
  F_MISH,
  headOf,
  LAND,
  M_BED,
  M_MATTRESS,
  COLLAPSE,
  LANDED,
  NIGHTSTAND,
  sillOf,
  STAND_TOP,
  TUB_HALF,
  TUB_X,
  WALL_L,
  WALL_R,
} from './geo'
import { beam, blade, css, drawFar, drawMid, drawSky, moonlight, N, SIGN, SKY_D } from './night'

/**
 * The two rooms' life. Marty's: a sash window in the back wall over the tub with the night beyond it (the moon behind
 * its cloud, the city, an El on its trestle, the bar's sign red and blue across the way), rain on the glass, a curtain
 * breathing in the draught, moths round the bulb, the El's windows going over the wallpaper, and the hall's light
 * under the door; when the bulb goes, the moon comes out from its cloud and in at the window, and the clouds going
 * over it dim it and give it back. Mishkin's: his cigarette's smoke, a moth at his lamp, the lace at his open window,
 * a car's lights going over his ceiling; then the crash's plaster dust bursting and settling in his lamp's light and
 * the moon's down through the hole, and the bath water everywhere. The light is only ever what falls on things, laid
 * over them: no halo hangs round a lamp, and nothing glints.
 */

const MOON_BLUE = '#A8CCF0'
const plain = (pen: Pen): Pen => ({ ...pen, tone: (h) => h })

/* ------------------------------------------------------------------ Marty's window */

/** The back window's glass, over the tub. */
const WIN = { x0: 4.75, x1: 6.45, y0: -2.92, y1: -1.3 }
const WIN_C: Pt = [(WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2]
/** The camera the view through it is laid out for: on him in the tub as the bulb goes. */
const ROOM: Pt = [4.9, -1.06]
const MOON_IN: Pt = [6.02, -2.4]

/** A layer of the view at depth `d`, moved on by `shift`, drawn only as far as the glass. */
function view(pen: Pen, f: Frame, d: number, shift: Pt, draw: (g: Frame) => void): void {
  const [dx, dy] = parallax(f, d, ROOM)
  const ox = dx + shift[0]
  const oy = dy + shift[1]
  const { p, k } = pen
  p.push()
  p.translate(ox * k, oy * k)
  draw({ x0: WIN.x0 - ox, y0: WIN.y0 - oy, x1: WIN.x1 - ox, y1: WIN.y1 - oy, cx: WIN_C[0] - ox, cy: WIN_C[1] - oy })
  p.pop()
}

/** The El's passes behind the house: when the head of the train comes into the window. */
const ELS = [93.35, 98.6]
const EL_SPEED = 3.2
const CARRIAGE = 1.15
const CARRIAGES = 4

/** The night through the window, clipped to its glass: what the room looks out on. */
function drawView(pen: Pen, t: number, f: Frame): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.beginPath()
  ctx.rect(WIN.x0 * k, WIN.y0 * k, (WIN.x1 - WIN.x0) * k, (WIN.y1 - WIN.y0) * k)
  ctx.clip()
  const g = ctx.createLinearGradient(0, WIN.y0 * k, 0, WIN.y1 * k)
  g.addColorStop(0, css(pen, N.sky0))
  g.addColorStop(1, css(pen, N.sky2))
  ctx.fillStyle = g
  ctx.fillRect(WIN.x0 * k, WIN.y0 * k, (WIN.x1 - WIN.x0) * k, (WIN.y1 - WIN.y0) * k)
  view(pen, f, SKY_D, [0, 0], (g2) => drawSky(pen, t, MOON_IN, g2))
  // Downtown laid so the moon stands clear over a low roof when the bulb goes, a tower beside it.
  view(pen, f, 0.2, [-6.5, -3.3], (g2) => drawFar(pen, t, g2, g2.x0))
  view(pen, f, 0.42, [-6.9, -5.1], (g2) => drawMid(pen, t, g2, g2.x0))
  // The El on its trestle, the train going over it.
  view(pen, f, 0.5, [0, 0], (g2) => {
    const y = -1.7
    rect(pen, g2.x0 - 1, y, g2.x1 + 1, y + 0.07, N.iron)
    const segs: number[] = []
    for (let x = Math.floor(g2.x0 / 0.5) * 0.5; x < g2.x1 + 0.5; x += 0.5) segs.push(x, y + 0.07, x + 0.5, y + 0.6, x + 0.5, y + 0.07, x, y + 0.6, x, y + 0.07, x, y + 0.8)
    ctx.strokeStyle = css(pen, N.iron)
    ctx.lineWidth = Math.max(0.6, pen.w * 0.4)
    ctx.beginPath()
    for (let i = 0; i < segs.length; i += 4) {
      ctx.moveTo(segs[i] * k, segs[i + 1] * k)
      ctx.lineTo(segs[i + 2] * k, segs[i + 3] * k)
    }
    ctx.stroke()
    for (const t0 of ELS) {
      const head = 6.9 - EL_SPEED * (t - t0)
      if (head > g2.x1 + 0.2 || head + CARRIAGES * CARRIAGE < g2.x0 - 0.2) continue
      for (let c = 0; c < CARRIAGES; c++) {
        const x0 = head + c * CARRIAGE
        rect(pen, x0 + 0.03, y - 0.27, x0 + CARRIAGE - 0.03, y - 0.01, '#2C3A3C')
        rect(pen, x0 + 0.03, y - 0.29, x0 + CARRIAGE - 0.03, y - 0.26, '#46585A')
        for (let w = 0; w < 5; w++) rect(pen, x0 + 0.1 + w * 0.2, y - 0.21, x0 + 0.22 + w * 0.2, y - 0.09, mix('#FFF0C0', '#2C3A3C', hash(c, w, 5) < 0.2 ? 0.7 : 0))
      }
    }
  })
  // The house across the way, and the bar's sign hanging off its corner.
  view(pen, f, 0.6, [0, 0], (g2) => {
    const x0 = 6.0
    rect(pen, x0, -2.2, g2.x1 + 1, g2.y1 + 1, N.near)
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const lit = hash(r, c + Math.floor((t - 91) / (BEAT * 6)), 52) < 0.4
        rect(pen, x0 + 0.12 + c * 0.32, -2.05 + r * 0.42, x0 + 0.27 + c * 0.32, -1.85 + r * 0.42, lit ? N.win : N.glass)
      }
    blade(pen, [x0 - 0.12, -2.2], 0.48)
  })
  // The rain beyond the glass.
  view(pen, f, 0.55, [0, 0], (g2) => rain(pen, t, g2, { seed: 21, density: 9, speed: 7, slant: 0.12, len: 0.22, color: N.rain, alpha: 0.22, lw: 0.28 }))
  ctx.restore()
}

/** Rain on the glass: drops stuck to it, and a few running down it in starts. */
function drawWetGlass(pen: Pen, t: number): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.fillStyle = css(pen, '#D6E6E8', 0.4)
  ctx.beginPath()
  for (let i = 0; i < 22; i++) {
    const x = WIN.x0 + 0.04 + (WIN.x1 - WIN.x0 - 0.08) * hash(i, 1, 53)
    const y = WIN.y0 + 0.04 + (WIN.y1 - WIN.y0 - 0.08) * hash(i, 2, 53)
    const r = 0.012 + 0.014 * hash(i, 3, 53)
    ctx.moveTo((x + r) * k, y * k)
    ctx.ellipse(x * k, y * k, r * k, r * 1.2 * k, 0, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.strokeStyle = css(pen, '#D6E6E8', 0.3)
  ctx.lineWidth = Math.max(0.6, pen.w * 0.3)
  ctx.beginPath()
  const runs: Pt[] = []
  for (let i = 0; i < 6; i++) {
    const per = 2.2 + 1.6 * hash(i, 4, 53)
    const u0 = (t / per + hash(i, 5, 53)) % 1
    // In starts: quick, then held, then quick.
    const u = u0 - (0.6 * Math.sin(u0 * Math.PI * 10)) / (Math.PI * 10)
    const gen = Math.floor(t / per + hash(i, 5, 53))
    const x = WIN.x0 + 0.08 + (WIN.x1 - WIN.x0 - 0.16) * hash(i, gen, 54) + 0.02 * Math.sin(u * 7)
    const y = WIN.y0 + (WIN.y1 - WIN.y0) * u
    ctx.moveTo(x * k, Math.max(WIN.y0, y - 0.3) * k)
    ctx.lineTo(x * k, y * k)
    runs.push([x, y])
  }
  ctx.stroke()
  ctx.fillStyle = css(pen, '#E6F2F2', 0.6)
  ctx.beginPath()
  for (const [x, y] of runs) {
    ctx.moveTo((x + 0.022) * k, y * k)
    ctx.ellipse(x * k, y * k, 0.022 * k, 0.03 * k, 0, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/** How the curtain breathes: the draught through the sash, and harder as an El goes by. */
function breath(t: number): number {
  const el = ELS.reduce((s, t0) => s + Math.max(0, Math.sin(Math.max(0, Math.min(1, (t - t0) / 2.4)) * Math.PI)), 0)
  return 0.55 + 0.45 * sway(t, 2, 3.6) + 0.5 * el
}

/** A box of light laid over what is there, in cells: a tint where a light falls. */
function wash(pen: Pen, x0: number, y0: number, x1: number, y1: number, col: string, a: number): void {
  if (a <= 0.004) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.fillStyle = rgba(pen, col, a)
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

/**
 * The back window: its casing, the night through its glass, the rain on it, its sashes, the curtain breathing at it,
 * and the light it gives the room: the sign's across the street on its sill and casing, and the moon once the bulb
 * has gone.
 */
export function drawWindow(room: Pen, t: number, f: Frame): void {
  if (WIN.x1 + 2.5 < f.x0 || WIN.x0 - 2.5 > f.x1 || WIN.y1 + 3.5 < f.y0 || WIN.y0 - 2.5 > f.y1) return
  const pen = plain(room)
  const L = bulbLevel(t)
  const dark = 1 - L
  const clear = moonlight(t)
  // The casing.
  rect(room, WIN.x0 - 0.12, WIN.y0 - 0.14, WIN.x1 + 0.12, WIN.y1 + 0.04, '#4E3A28')
  rect(room, WIN.x0 - 0.05, WIN.y0 - 0.06, WIN.x1 + 0.05, WIN.y1, '#32251A')
  if (WIN.x1 >= f.x0 && WIN.x0 <= f.x1 && WIN.y1 >= f.y0 && WIN.y0 <= f.y1) {
    drawView(pen, t, f)
    drawWetGlass(pen, t)
  }
  // The sashes: the lower one up a crack, so the draught comes in; their bars.
  const mid = (WIN.y0 + WIN.y1) / 2
  const bar = '#634A33'
  rect(room, WIN.x0, mid - 0.04, WIN.x1, mid + 0.04, bar)
  rect(room, WIN.x0, mid + 0.1, WIN.x1, mid + 0.15, bar)
  rect(room, WIN_C[0] - 0.025, WIN.y0, WIN_C[0] + 0.025, WIN.y1, bar)
  rect(room, WIN.x0, WIN.y0, WIN.x1, WIN.y0 + 0.05, bar)
  rect(room, WIN.x0, WIN.y1 - 0.05, WIN.x1, WIN.y1, bar)
  // The sill.
  rect(room, WIN.x0 - 0.2, WIN.y1, WIN.x1 + 0.2, WIN.y1 + 0.08, '#5A4430')
  rect(room, WIN.x0 - 0.16, WIN.y1 + 0.08, WIN.x1 + 0.16, WIN.y1 + 0.12, '#3A2A1C')
  // The sign's light in at the glass, steady: a tint along the sill and the casing's edge that faces it, which tells
  // more once the bulb has gone.
  const sign = 0.1 + 0.16 * dark
  wash(pen, WIN.x0 - 0.2, WIN.y1, WIN.x1 + 0.2, WIN.y1 + 0.05, SIGN, sign)
  wash(pen, WIN.x0 - 0.05, WIN.y0 - 0.06, WIN.x0, WIN.y1, SIGN, sign * 0.8)
  // The curtain on its rod, drawn aside, breathing.
  const b = breath(t)
  const rod = WIN.y0 - 0.2
  room.p.noStroke()
  const ctx = ctxOf(room.p)
  const { k } = room
  ctx.save()
  ctx.fillStyle = css(room, '#C8BE96', 0.82)
  ctx.beginPath()
  const cx0 = WIN.x0 - 0.22
  const cx1 = WIN.x0 + 0.26
  ctx.moveTo(cx0 * k, rod * k)
  ctx.lineTo(cx1 * k, rod * k)
  const hem = WIN.y1 + 0.2 - 0.06 * b
  ctx.bezierCurveTo((cx1 + 0.05 + 0.12 * b) * k, (rod + 0.6) * k, (cx1 - 0.15 + 0.22 * b) * k, (hem - 0.5) * k, (cx1 - 0.05 + 0.2 * b) * k, hem * k)
  ctx.quadraticCurveTo((cx0 + 0.25 + 0.06 * b) * k, (hem + 0.08) * k, (cx0 + 0.02 * b) * k, (hem + 0.02) * k)
  ctx.closePath()
  ctx.fill()
  // Its folds.
  ctx.strokeStyle = css(room, '#9C916C', 0.7)
  ctx.lineWidth = Math.max(0.6, room.w * 0.5)
  ctx.beginPath()
  for (const u of [0.25, 0.55, 0.8]) {
    const x = cx0 + (cx1 - cx0) * u
    ctx.moveTo(x * k, rod * k)
    ctx.quadraticCurveTo((x + 0.05 * b * u) * k, ((rod + hem) / 2) * k, (x + 0.15 * b * u) * k, (hem - 0.02) * k)
  }
  ctx.stroke()
  ctx.restore()
  rect(room, cx0 - 0.08, rod - 0.04, WIN.x1 + 0.25, rod + 0.02, '#2B2420')
  // Once the bulb has gone: the moon's light, faint, in a shaft down over the tub; the clouds going over dim it.
  if (dark > 0.02) beam(pen, [WIN_C[0] + 0.1, WIN.y0 + 0.15], 0.12, 0.62, 3.5, MOON_BLUE, 0.08 * dark * clear)
}

/** Moonlight in the shaft from the window, 0 to 1: where the dust shows once the bulb has gone. */
const inShaft = (x: number, y: number): number => {
  const d = y - WIN.y0
  if (d < 0) return 0
  const half = 0.15 + d * 0.32
  const c = WIN_C[0] + 0.1 - d * 0.12
  return Math.max(0, 1 - Math.abs(x - c) / half) * Math.max(0, 1 - d / 3.6)
}

/* ------------------------------------------------------------------ light going over the walls */

/** The El's lit windows going over the paper, right to left, while it passes: faint, laid on the wall. */
export function drawElLight(room: Pen, t: number): void {
  const pen = plain(room)
  const ceil = ceilOf(F_MARTY)
  const dark = 1 - bulbLevel(t)
  const ctx = ctxOf(pen.p)
  const { k } = pen
  for (const t0 of ELS) {
    const s = t - t0
    if (s < 0 || s > 3.4) continue
    const env = Math.sin(Math.min(1, s / 3.4) * Math.PI)
    ctx.save()
    ctx.beginPath()
    ctx.rect(WALL_L[1] * k, ceil * k, (WALL_R[0] - WALL_L[1]) * k, (F_MARTY - ceil) * k)
    ctx.clip()
    ctx.fillStyle = rgba(pen, '#E8E0C0', (0.02 + 0.025 * dark) * env)
    ctx.beginPath()
    const head = 8.2 - EL_SPEED * 2.2 * s
    for (let c = 0; c < CARRIAGES; c++)
      for (let w = 0; w < 2; w++) {
        const x = head + (c * CARRIAGE + 0.15 + w * 0.5) * 2.2
        if (x < WALL_L[1] - 1 || x > WALL_R[0] + 1) continue
        const sk = 0.5
        ctx.moveTo(x * k, ceil * k)
        ctx.lineTo((x + 0.6) * k, ceil * k)
        ctx.lineTo((x + 0.6 - sk) * k, F_MARTY * k)
        ctx.lineTo((x - sk) * k, F_MARTY * k)
        ctx.closePath()
      }
    ctx.fill()
    ctx.restore()
  }
}

/** Someone going by in the hall: two feet's shadows across the light under the door. */
export function drawHall(room: Pen, t: number, door: [number, number]): void {
  const s = t - 91.35
  const walk = s > 0 && s < 1.6 ? s / 1.6 : -1
  if (walk < 0) return
  const pen = plain(room)
  const fl = F_MARTY
  const fx = door[1] + 0.3 - (door[1] - door[0] + 0.6) * walk
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.fillStyle = css(pen, '#1A120C', 0.85)
  ctx.beginPath()
  for (const [i, off] of [0, 0.22].entries()) {
    const step = Math.sin((walk * 6 + i * 0.5) * Math.PI)
    const x = fx + off + 0.04 * step
    if (x < door[0] || x > door[1] - 0.12) continue
    ctx.rect(x * k, (fl - 0.04) * k, 0.12 * k, 0.04 * k)
  }
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ moths and dust */

/** Moths round a light: in loops close to it; `scatter` 0 to 1 takes them off to `to` once it has gone out. */
function moths(pen: Pen, t: number, n: number, seed: number, light: Pt, lit: number, to: Pt | null, scatter: number): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  // Pale in the bulb's light; in the moon's, grey-blue.
  ctx.fillStyle = css(pen, mix('#93A4BE', '#EFE4C2', lit))
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, seed, 1)
    const h2 = hash(i, seed, 2)
    const th = t * (2.4 + 2.2 * h1) * (h2 < 0.5 ? 1 : -1) + i * 2.1
    const r = 0.22 + 0.3 * h2 + 0.12 * Math.sin(t * 3.3 + i * 1.7)
    let x = light[0] + r * Math.cos(th) + 0.04 * Math.sin(t * 17 + i)
    let y = light[1] + 0.62 * r * Math.sin(th) + 0.05 * Math.sin(t * 11 + i * 3)
    if (to && scatter > 0) {
      const u = Math.max(0, Math.min(1, scatter * 1.4 - h1 * 0.4))
      const tx = to[0] + 0.35 * Math.cos(th * 0.6) + (h1 - 0.5) * 0.5
      const ty = to[1] + 0.2 * Math.sin(th * 0.8) + (h2 - 0.5) * 0.4
      x += (tx - x) * u
      y += (ty - y) * u
    }
    // Two wings beating, a body between.
    const span = 0.032 * (0.3 + 0.7 * Math.abs(Math.sin(t * 41 + i * 2.3)))
    for (const sd of [-1, 1]) {
      ctx.moveTo((x + sd * 0.006 + sd * span * 2) * k, y * k)
      ctx.ellipse((x + sd * (0.006 + span)) * k, (y - 0.004) * k, span * k, 0.02 * k, sd * 0.3, 0, Math.PI * 2)
    }
    ctx.moveTo((x + 0.008) * k, (y + 0.01) * k)
    ctx.ellipse(x * k, (y + 0.01) * k, 0.008 * k, 0.022 * k, 0, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
}

/** Marty's room's moths and dust: round the bulb while it burns, then gone to the window and the moonlight. */
export function drawMartyAir(room: Pen, t: number, f: Frame, bulb: Pt): void {
  const pen = plain(room)
  const L = bulbLevel(t)
  const clear = moonlight(t)
  const ceil = ceilOf(F_MARTY)
  if (f.y0 > F_MARTY || f.y1 < ceil) return
  const scatter = smooth(t, BULB_OUT - 0.2, BULB_OUT + 1.6)
  moths(pen, t, 5, 3, bulb, L, [WIN_C[0], WIN.y0 + 0.45], scatter)
  // The dust in the air, seen only where the light is on it: the bulb's, then the moon's shaft.
  motes(pen, t, {
    n: 40,
    seed: 9,
    box: [WALL_L[1], ceil, WALL_R[0], F_MARTY],
    size: [0.008, 0.02],
    color: L > 0.5 ? '#FFEFC4' : '#D6E8FF',
    alpha: 0.42,
    drift: [0.04, 0.025],
    wander: 0.2,
    twinkle: 0,
    light: (x, y) => L * Math.exp(-((x - bulb[0]) ** 2 + (y - bulb[1]) ** 2) / 1.6) + (1 - L) * clear * inShaft(x, y) * 1.4,
  })
}

/* ------------------------------------------------------------------ the tub's tap */

/** The tap's drips, landing in the bath on the twos and fours (bars 43 to 47), till the floor goes. */
const DRIPS = [43, 44, 45, 46, 47].flatMap((bar) => [beatAt(bar, 2), beatAt(bar, 4)]).filter((d) => d < BREAK)
/** The tap's mouth and the water under it, in the tub's own cells. */
const TAP: Pt = [0.86, -1.31]
const TAP_WATER = -0.47
const DRIP_FALL = Math.sqrt((2 * (TAP_WATER - TAP[1] - 0.05)) / G)

/**
 * The tap at the tub's foot (the window's end, away from where Mishkin will sit up), and its drip: a drop swelling at the mouth, falling, a ring on the water. `at` takes the
 * tub's own cells to the room's.
 */
export function drawTap(pen: Pen, t: number, at: (p: Pt) => Pt, water: number): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const chrome = '#B9B6A6'
  // The riser off the rim, the spout over, the two taps' crosses.
  const pts: Pt[] = [at([1.08, -1.12]), at([1.08, -1.42]), at([0.98, -1.5]), at([0.86, -1.46]), at([0.86, -1.36])]
  ctx.save()
  ctx.strokeStyle = css(pen, chrome)
  ctx.lineWidth = 0.055 * k
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.stroke()
  ctx.lineWidth = 0.035 * k
  ctx.beginPath()
  for (const dx of [1.2, 0.96]) {
    const [x, y] = at([dx, -1.32])
    ctx.moveTo((x - 0.06) * k, y * k)
    ctx.lineTo((x + 0.06) * k, y * k)
    ctx.moveTo(x * k, (y - 0.05) * k)
    ctx.lineTo(x * k, (y + 0.05) * k)
  }
  ctx.moveTo(at([1.2, -1.32])[0] * k, at([1.2, -1.32])[1] * k)
  ctx.lineTo(at([1.08, -1.3])[0] * k, at([1.08, -1.3])[1] * k)
  ctx.lineTo(at([0.96, -1.32])[0] * k, at([0.96, -1.32])[1] * k)
  ctx.stroke()
  ctx.restore()
  // The drip.
  for (const d of DRIPS) {
    const s = t - (d - DRIP_FALL)
    if (s < -0.9 || s > DRIP_FALL + 0.7) continue
    const mouth = at([TAP[0], TAP[1] + 0.05])
    if (s < 0) {
      const g = 1 + s / 0.9
      ellipse(pen, [mouth[0], mouth[1] + 0.02 * g], 0.022 * g + 0.008, 0.026 * g + 0.008, '#D8ECEA')
    } else if (s < DRIP_FALL) {
      ellipse(pen, [mouth[0], mouth[1] + 0.5 * G * s * s], 0.022, 0.034, '#D8ECEA')
    } else {
      const u = (s - DRIP_FALL) / 0.7
      const [wx, wy] = at([TAP[0], water])
      ctx.save()
      ctx.strokeStyle = css(pen, '#E2F0EC', 0.7 * (1 - u))
      ctx.lineWidth = Math.max(0.6, pen.w * 0.5)
      ctx.beginPath()
      ctx.ellipse(wx * k, wy * k, (0.04 + 0.3 * u) * k, (0.012 + 0.04 * u) * k, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      // A little drop jumping back up off it.
      const j = s - DRIP_FALL
      if (j < 0.22) ellipse(pen, [wx, wy - 2.2 * j + 0.5 * G * j * j], 0.014, 0.018, '#E2F0EC')
    }
  }
}

/* ------------------------------------------------------------------ Mishkin's room */

/** The car going by in the street, its lights coming in at his window and over his wall and ceiling. */
const CAR_SWEEP = 99.9

/** His lamp: where it is, and how it rocks after the tub lands by it. */
const LAMP: Pt = [(NIGHTSTAND[0] + NIGHTSTAND[1]) / 2 - 0.1, STAND_TOP]
export const lampRock = (t: number): number => (t < LAND ? 0 : 0.22 * Math.exp(-(t - LAND) / 0.7) * Math.sin((t - LAND) * 11))
/** And its light, which stutters when the floor comes down. */
export const lampLevel = (t: number): number => {
  const s = t - LAND
  if (s < 0 || s > 1.4) return 0.97 + 0.03 * Math.sin(t * 2.1)
  return 0.6 + 0.4 * Math.abs(Math.cos(s * 23)) * (s > 0.5 ? 1 : 0.6) + 0.4 * (s / 1.4)
}

/** His room's air: the lace at the open window, the cigarette's smoke, a moth at his lamp, a car's lights going over. */
export function drawMishAir(mish: Pen, t: number, f: Frame): void {
  const fl = F_MISH
  const ceil = ceilOf(fl)
  if (f.y0 > fl + 0.5 || f.y1 < ceil || f.x0 > WALL_R[1] || f.x1 < WALL_L[1]) return
  const pen = plain(mish)
  const ctx = ctxOf(mish.p)
  const { k } = mish
  // The lace curtain at his window, blowing in.
  const head = headOf(fl)
  const sill = sillOf(fl)
  const b = 0.5 + 0.5 * sway(t, 7, 2.9) + (t > BREAK ? 0.6 * Math.exp(-(t - BREAK) / 1.2) : 0)
  ctx.save()
  ctx.fillStyle = css(mish, '#E2DCC6', 0.26)
  ctx.beginPath()
  const x1 = WALL_R[0] + 0.02
  ctx.moveTo(x1 * k, (head - 0.05) * k)
  ctx.lineTo((x1 - 0.22) * k, (head - 0.05) * k)
  ctx.bezierCurveTo((x1 - 0.26 - 0.18 * b) * k, (head + 0.8) * k, (x1 - 0.14 - 0.32 * b) * k, (sill - 0.7) * k, (x1 - 0.2 - 0.26 * b) * k, (sill - 0.15 + 0.05 * b) * k)
  ctx.lineTo(x1 * k, (sill - 0.1) * k)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = css(mish, '#F2EEDC', 0.22)
  ctx.lineWidth = Math.max(0.6, mish.w * 0.4)
  ctx.beginPath()
  for (const u of [0.3, 0.6]) {
    ctx.moveTo((x1 - 0.22 * u) * k, (head - 0.05) * k)
    ctx.quadraticCurveTo((x1 - 0.2 * u - 0.22 * b * u) * k, ((head + sill) / 2) * k, (x1 - 0.2 * u - 0.22 * b * u) * k, (sill - 0.15) * k)
  }
  ctx.stroke()
  ctx.restore()
  // The sign across the street, a steady tint on his window's sill.
  wash(pen, WALL_R[0] - 0.1, sill, WALL_R[1] + 0.12, sill + 0.04, SIGN, 0.16)
  // The cigarette in the ashtray, its smoke going up past the lamp and curling in its warmth.
  const ash: Pt = [NIGHTSTAND[0] + 0.24, STAND_TOP - 0.04]
  ellipse(pen, [ash[0] + 0.09, ash[1] - 0.005], 0.012, 0.012, '#FF5A4A')
  rising(pen, t, { seed: 31, n: 30, from: [ash[0] + 0.06, ash[0] + 0.1, ash[1] - 0.02], rise: 1.7, life: 3.4, spread: 0.5, size: [0.03, 0.09], color: '#C4BEAC', hot: '#E2DCC8', alpha: 0.38 })
  // A moth at his lamp.
  const lamp: Pt = [LAMP[0] + lampRock(t) * 0.6, LAMP[1] - 0.72]
  moths(pen, t, 2, 7, lamp, 1, null, 0)
  // The car's lights coming in at the window and going over the wall and the ceiling, right to left.
  const s = t - CAR_SWEEP
  if (s > 0 && s < 1.6) {
    const x = WALL_R[0] - (WALL_R[0] - WALL_L[1] + 1) * (s / 1.6)
    const env = Math.sin((s / 1.6) * Math.PI)
    ctx.save()
    ctx.beginPath()
    ctx.rect(WALL_L[1] * k, ceil * k, (WALL_R[0] - WALL_L[1]) * k, (fl - ceil) * k)
    ctx.clip()
    const g = ctx.createLinearGradient((x - 0.7) * k, 0, (x + 0.7) * k, 0)
    g.addColorStop(0, rgba(pen, '#FFF0C8', 0))
    g.addColorStop(0.5, rgba(pen, '#FFF0C8', 0.08 * env))
    g.addColorStop(1, rgba(pen, '#FFF0C8', 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo((x - 0.7 - 0.9) * k, ceil * k)
    ctx.lineTo((x + 0.7 - 0.9) * k, ceil * k)
    ctx.lineTo((x + 0.7 + 0.5) * k, fl * k)
    ctx.lineTo((x - 0.7 + 0.5) * k, fl * k)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

/* ------------------------------------------------------------------ the crash */

interface Burst {
  at: number
  /** Where the dust comes from: a line from x0 to x1 at y. */
  from: [number, number, number]
  n: number
  seed: number
  /** How hard it is thrown out, and up. */
  speed: number
  up: number
  life: number
}
const BURSTS: Burst[] = [
  { at: BREAK, from: [TUB_X - TUB_HALF, TUB_X + TUB_HALF, F_MARTY + 0.5], n: 70, seed: 41, speed: 2.4, up: 0.2, life: 6 },
  { at: LAND, from: [M_BED[0] + 0.3, M_BED[1] - 0.2, M_MATTRESS + COLLAPSE - 0.2], n: 110, seed: 43, speed: 3.2, up: 1.6, life: 7 },
]
const BINS = 5
const dustBins: number[][] = Array.from({ length: BINS }, () => [])

/**
 * The plaster dust: thrown out in a burst, dragged to a stop by the air, then sinking and wandering, lit where the
 * lamp or the moon through the hole falls on it.
 */
function dust(pen: Pen, t: number, b: Burst, light: (x: number, y: number) => number): void {
  const s = t - b.at
  if (s < 0 || s > b.life * 1.3) return
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const drag = 3.2
  const gone = (1 - Math.exp(-drag * s)) / drag
  for (let i = 0; i < b.n; i++) {
    const h1 = hash(i, b.seed, 1)
    const h2 = hash(i, b.seed, 2)
    const h3 = hash(i, b.seed, 3)
    const life = b.life * (0.6 + 0.6 * h3)
    if (s > life) continue
    const sx = b.from[0] + (b.from[1] - b.from[0]) * h1
    const side = (h1 - 0.5) * 2
    const vx = side * b.speed * (0.4 + 0.8 * h2)
    const vy = -b.up * (0.3 + h3) + (h2 - 0.5) * 1.2
    const x = sx + vx * gone + 0.15 * Math.sin(s * (0.5 + h2) + i)
    const y = b.from[2] + vy * gone + 0.1 * s + 0.012 * s * s + 0.08 * Math.cos(s * (0.4 + h1) + i)
    const fade = Math.min(1, s * 6) * (1 - s / life) ** 1.3
    const a = fade * (0.25 + 0.75 * light(x, y))
    if (a < 0.03) continue
    const r = 0.012 + 0.03 * h2
    dustBins[Math.min(BINS - 1, Math.floor(a * BINS))].push(x * k, y * k, Math.max(0.6, r * k))
  }
  ctx.save()
  for (let j = 0; j < BINS; j++) {
    const list = dustBins[j]
    if (!list.length) continue
    ctx.fillStyle = css(pen, '#F2E8D0', 0.75 * ((j + 0.6) / BINS))
    ctx.beginPath()
    for (let i = 0; i < list.length; i += 3) {
      ctx.moveTo(list[i] + list[i + 2], list[i + 1])
      ctx.arc(list[i], list[i + 1], list[i + 2], 0, Math.PI * 2)
    }
    ctx.fill()
    list.length = 0
  }
  ctx.restore()
}

/** Where the bath water runs off the bed, and where it drips through the hole above. */
const RUNS: Pt[] = [
  [M_BED[0] + 0.1, M_MATTRESS + COLLAPSE + 0.32],
  [M_BED[1] - 0.05, M_MATTRESS + COLLAPSE + 0.32],
]
const HOLE_DRIPS: Pt[] = [
  [TUB_X - TUB_HALF - 0.02, F_MARTY + 0.47],
  [TUB_X + TUB_HALF + 0.05, F_MARTY + 0.47],
  [TUB_X - 0.4, F_MARTY + 0.47],
]

/**
 * After the floor goes: the moon down through the hole, the plaster dust bursting and settling in the light, the bath
 * water off the bed in a spreading puddle, dripping off the mattress and through the hole.
 */
export function drawCrash(mish: Pen, t: number): void {
  if (t < BREAK) return
  const pen = plain(mish)
  const clear = moonlight(t)
  const open = smooth(t, BREAK, BREAK + 0.4)
  // The moon down through the hole, faint.
  const apex: Pt = [TUB_X, F_MARTY + 0.47]
  beam(pen, apex, 0.06, 0.78, 4.4, MOON_BLUE, 0.07 * open * clear)
  const lampAt: Pt = [LAMP[0], LAMP[1] - 0.65]
  const lampL = lampLevel(t)
  const light = (x: number, y: number): number => {
    const dl = Math.exp(-((x - lampAt[0]) ** 2 + (y - lampAt[1]) ** 2) / 2.2) * lampL
    const dy = y - apex[1]
    const inBeam = dy > 0 ? Math.max(0, 1 - Math.abs(x - apex[0]) / (0.3 + dy * 0.42)) * clear : 0
    return Math.min(1, dl + 0.8 * inBeam)
  }
  for (const b of BURSTS) dust(pen, t, b, light)
  // The dust left hanging in the light, slowly settling, once the bursts have thinned.
  motes(pen, t, {
    n: 50,
    seed: 45,
    box: [WALL_L[1] + 0.2, ceilOf(F_MISH) + 0.3, WALL_R[0] - 0.2, F_MISH - 0.1],
    size: [0.01, 0.025],
    color: '#F2E8D0',
    alpha: 0.45 * smooth(t, LAND + 0.5, LAND + 2.5),
    drift: [0.03, 0.07],
    wander: 0.25,
    twinkle: 0,
    light,
  })
  // The bath water: a puddle spreading on the boards under the bed, its gleam; drips off the mattress, through the hole.
  if (t > LAND) {
    const s = t - LAND
    const spread = 1 - Math.exp(-s / 0.9)
    const pc: Pt = [5.3, F_MISH - 0.005]
    const ctx = ctxOf(pen.p)
    const { k } = pen
    ctx.save()
    ctx.fillStyle = css(mish, '#6E8E8C', 0.75)
    ctx.beginPath()
    ctx.ellipse(pc[0] * k, pc[1] * k, (0.4 + 2.0 * spread) * k, 0.035 * k, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = css(pen, '#D8E8F0', 0.45)
    ctx.lineWidth = Math.max(0.6, pen.w * 0.4)
    ctx.beginPath()
    ctx.moveTo((pc[0] - 0.3 - 1.6 * spread) * k, (pc[1] - 0.02) * k)
    ctx.lineTo((pc[0] + 0.2 + 1.5 * spread) * k, (pc[1] - 0.02) * k)
    ctx.stroke()
    ctx.restore()
    // Drips off the mattress's edges to the puddle, and through the hole: two to the boards, one into the tub.
    const inTub = F_MARTY + LANDED + COLLAPSE - 0.4
    const drops: [Pt, number, number][] = [
      [RUNS[0], 0.42, F_MISH],
      [RUNS[1], 0.52, F_MISH],
      [HOLE_DRIPS[0], 0.7, F_MISH],
      [HOLE_DRIPS[1], 0.93, F_MISH],
      [HOLE_DRIPS[2], 1.16, inTub],
    ]
    if (s > 0.6)
      drops.forEach(([[x, y], per, floor], i) => {
        const fall = Math.sqrt((2 * Math.max(0.05, floor - y)) / G)
        // Each drip swells, falls, and leaves a ring where it lands.
        const u = (s + hash(i, 1, 46) * per) % (per + fall)
        if (u < per) ellipse(pen, [x, y + 0.02], 0.015 + 0.012 * (u / per), 0.02 + 0.014 * (u / per), '#C8E0E0')
        else ellipse(pen, [x, Math.min(floor, y + 0.5 * G * (u - per) ** 2)], 0.018, 0.03, '#C8E0E0')
        if (u < 0.3 && s > 0.6 + per) ellipse(pen, [x, floor - 0.01], 0.05 + 0.2 * u, 0.012, '#9EC2BE')
      })
  }
}

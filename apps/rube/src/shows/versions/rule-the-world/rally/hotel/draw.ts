import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { at, BEAT } from '../music'
import { G, G_LOW } from '../physics'
import { blob, ctxOf, ellipse, flash, glint, glow, line, mix, path, rect, rgb, rgba, ring, shape, toHex, vgrad, type Pen } from '../pen'
import {
  BED,
  BREAK,
  BULB_HANG,
  BUZZ,
  CATCH,
  ceilOf,
  CLAP,
  COLLAPSE,
  CORD,
  CRACKS,
  CREAK,
  DOOR,
  DOOR_TOP,
  F_MARTY,
  F_MISH,
  F_SECOND,
  F_STREET,
  FLAKES,
  FOOT,
  headOf,
  HEAD_R,
  KERB,
  KNOCKS,
  L_MARTY,
  L_MISH,
  L_SECOND,
  LADDER_LEN,
  LADDER_TOP0,
  LADDER_X,
  LAMP_X,
  LAND,
  LANDED,
  LANDING,
  M_BED,
  M_DOOR,
  M_MATTRESS,
  MATTRESS,
  NIGHTSTAND,
  PAVE,
  RADIATOR,
  RADIATOR_TOP,
  RISE,
  RISE_UP,
  RISERS,
  RUN,
  RUNG,
  sillOf,
  STAIR_X0,
  STAIR_X1,
  STAND_TOP,
  STANDS,
  STOREY,
  T0,
  TUB_HALF,
  TUB_RIM,
  TUB_X,
  WALL_L,
  WALL_R,
  TREADS,
  DOWN,
  buried,
  bedGive,
  bulbLevel,
  BULB_OUT,
  BULB_POP,
  BOARD_DROP,
  POUNDS,
  RAIL_HIT,
  ladderDrop,
  tubDrop,
  type Pose,
} from './geo'

/**
 * The hotel: a brick building cut open at night. Marty's room is sick green-yellow paper under one bare bulb, and goes
 * moon-teal when the bulb goes; Mishkin's under it is warmer and browner, by his bedside lamp; the rooms round them are
 * dark; outside, the night is teal, the iron of the fire escape black against it, and the street is wet under a
 * sodium lamp.
 */

const C = {
  sky0: '#06141A',
  sky1: '#0E2A30',
  sky2: '#1C4442',
  moon: '#D9E6DA',
  moonLight: '#9FC9CF',
  city: '#0A181C',
  city2: '#0F2226',
  cityWin: '#D8A955',
  brick: '#6E3426',
  brickHi: '#83432F',
  mortar: '#40201A',
  joist: '#2B1E17',
  board: '#5E412B',
  boardHi: '#7A5638',
  plaster: '#BDB39A',
  plasterHi: '#DDD5C0',
  plasterDark: '#8E856F',
  paper: '#A6A85A',
  paperStripe: '#8D9147',
  paperMotif: '#C2BE72',
  paperBack: '#CFC6A0',
  stain: '#7C6F3A',
  skirting: '#3A2A1C',
  door: '#4E3A28',
  doorHi: '#634A33',
  doorDark: '#32251A',
  transom: '#C8A453',
  knob: '#C79A4E',
  radiator: '#8C8878',
  radiatorDark: '#5A574C',
  iron: '#211D1A',
  ironHi: '#4F4943',
  mattress: '#A9A389',
  ticking: '#857F68',
  blanket: '#5B6049',
  blanketHi: '#6F755B',
  pillow: '#CFC9B2',
  suitcase: '#6B4A2C',
  strap: '#3B2918',
  cord: '#1A1714',
  bulb: '#FFD48A',
  bulbOff: '#5E5A48',
  tungsten: '#FFC46A',
  tubOut: '#6F7D6C',
  tubCut: '#2B2C28',
  enamel: '#E9E4D4',
  enamelShade: '#B9B5A6',
  claw: '#2C2A26',
  water: '#86B3AE',
  mPaper: '#9A7458',
  mStripe: '#87634B',
  mMotif: '#B48B67',
  mBed: '#4A3122',
  mBedHi: '#6A4A33',
  mBlanket: '#7A3E33',
  mBlanketHi: '#94503F',
  sheet: '#D8D0BA',
  lampBase: '#3A2E22',
  shade: '#D9B26A',
  lamp: '#FFCF7A',
  stand: '#4A3424',
  frame: '#5A4026',
  picture: '#3E4E44',
  skin: '#C99A76',
  skinDark: '#9A6F55',
  shirt: '#E4DDCB',
  shirtShade: '#BDB6A3',
  trousers: '#38332E',
  shoe: '#1C1816',
  hair: '#2B2420',
  mouth: '#3A1A16',
  news: '#CFC8B4',
  newsLine: '#8E887A',
  fe: '#1D1F22',
  feHi: '#3A3A3E',
  pave: '#3B4446',
  paveHi: '#56625F',
  kerb: '#5C6463',
  road: '#1C2427',
  under: '#14181A',
  sodium: '#F2B85C',
  pole: '#1C2224',
  dark: '#0D0B0A',
}

/* ------------------------------------------------------------------ light */

const night = (hex: string): string => {
  const [r, g, b] = rgb(hex)
  return toHex(r * 0.22 + 4, g * 0.3 + 8, b * 0.38 + 12)
}
/** Marty's room under its bulb, or the moon. */
export const toneMarty = (t: number) => {
  const L = bulbLevel(t)
  return (hex: string): string => mix(mix(night(hex), '#3D6066', 0.08), mix(hex, C.tungsten, 0.06), 0.18 + 0.82 * L)
}
/** Mishkin's room by his lamp. */
export const toneMish = (hex: string): string => mix(night(hex), mix(hex, C.lamp, 0.05), 0.82)
/** The dark rooms. */
const toneDark = (hex: string): string => mix(night(hex), hex, 0.12)
const withTone = (pen: Pen, tone: (h: string) => string): Pen => ({ ...pen, tone })

/** A limb: a thick round-capped line, `w` cells wide. */
function limb(pen: Pen, a: Pt, b: Pt, w: number, col: string): void {
  const { p, k } = pen
  p.stroke(pen.tone(col))
  p.strokeWeight(w * k)
  p.strokeCap(p.ROUND)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.noStroke()
}
type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/* ------------------------------------------------------------------ outside */

export function drawOutside(pen: Pen, t: number, f: Frame): void {
  vgrad(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, [
    [0, C.sky0, 1],
    [0.55, C.sky1, 1],
    [1, C.sky2, 1],
  ])
  // Fill the frame top to bottom whatever its height in the place.
  const top = Math.min(f.y0, -14)
  vgrad(pen, f.x0 - 1, top - 1, f.x1 + 1, F_STREET, [
    [0, C.sky0, 1],
    [0.6, C.sky1, 1],
    [1, C.sky2, 1],
  ])
  // The moon, low over the roofs.
  const moon: Pt = [10.3, -1.5]
  glow(pen, moon, 2.4, C.moonLight, 0.22)
  ellipse(pen, moon, 0.34, 0.34, C.moon)
  ellipse(pen, [moon[0] + 0.1, moon[1] - 0.06], 0.07, 0.06, '#C3D1C4')
  // The city up the block, low and far: roofs and water towers, a few windows still lit.
  const shift = (f.cx - 8) * 0.3
  for (let i = 0; i < 22; i++) {
    const x0 = 7.6 + i * 1.45 + shift - 2
    const w = 1.1 + hash(i, 3) * 1.1
    const topY = 0.5 + hash(i, 7) * 6
    const body = mix(i % 2 ? C.city : C.city2, C.sky1, 0.35)
    rect(pen, x0, topY, x0 + w, F_STREET, body)
    if (hash(i, 11) > 0.6) {
      const tx = x0 + w * 0.5
      rect(pen, tx - 0.25, topY - 0.9, tx + 0.25, topY - 0.35, body)
      shape(pen, [[tx - 0.3, topY - 0.9], [tx, topY - 1.15], [tx + 0.3, topY - 0.9]], body)
      line(pen, [tx - 0.2, topY - 0.35], [tx - 0.25, topY], body, 0.8)
      line(pen, [tx + 0.2, topY - 0.35], [tx + 0.25, topY], body, 0.8)
    }
    for (let r = 0; topY + 0.4 + r * 0.55 < F_STREET - 0.8; r++)
      for (let c = 0; c * 0.38 + 0.18 < w - 0.2; c++) {
        const h = hash(i * 31 + r, c, 5)
        if (h < 0.93) continue
        const wx = x0 + 0.18 + c * 0.38
        const wy = topY + 0.4 + r * 0.55
        rect(pen, wx, wy, wx + 0.14, wy + 0.2, mix(C.cityWin, body, h > 0.975 ? 0.2 : 0.6))
      }
  }
  // Haze over the street.
  vgrad(pen, f.x0 - 1, F_STREET - 4, f.x1 + 1, F_STREET, [
    [0, C.sky2, 0],
    [1, C.sky2, 0.7],
  ])
  drawStreet(pen, t, f)
}

function drawStreet(pen: Pen, t: number, f: Frame): void {
  const y = F_STREET
  // Under the street, cut: the earth, the hotel's footing, a gas main, the vault light's glass in the pavement.
  rect(pen, f.x0 - 1, y, f.x1 + 1, Math.max(f.y1 + 1, y + 3), C.under)
  for (let i = 0; i < 40; i++) {
    const sx = WALL_R[1] + hash(i, 1, 60) * 12
    const sy = y + 0.45 + hash(i, 2, 60) * 2.2
    ellipse(pen, [sx, sy], 0.05 + hash(i, 3, 60) * 0.08, 0.04 + hash(i, 4, 60) * 0.05, '#231E1A')
  }
  rect(pen, f.x0 - 1, y, WALL_R[1] + 0.2, y + 2.6, '#2A2622')
  for (let r = 0; r < 5; r++) line(pen, [f.x0 - 1, y + 0.5 * r + 0.5], [WALL_R[1] + 0.2, y + 0.5 * r + 0.5], '#1A1714', 0.5)
  for (const [px, py, pr] of [[11.6, y + 1.05, 0.26], [15.8, y + 0.85, 0.18]] as const) {
    ellipse(pen, [px, py], pr, pr, '#2E3436')
    ellipse(pen, [px, py], pr * 0.72, pr * 0.72, '#0E1112')
    ellipse(pen, [px - pr * 0.3, py - pr * 0.3], pr * 0.15, pr * 0.1, '#4B5658')
  }
  rect(pen, WALL_R[1], y + 0.22, KERB, y + 0.36, '#2B3133')
  rect(pen, WALL_R[1], y, KERB, y + 0.22, C.pave)
  rect(pen, KERB, y + 0.14, f.x1 + 2, y + 0.3, C.road)
  rect(pen, KERB - 0.12, y, KERB + 0.02, y + 0.3, C.kerb)
  // Paving joints.
  for (let x = WALL_R[1] + 0.9; x < KERB - 0.2; x += 1.6) line(pen, [x, y + 0.02], [x - 0.04, y + 0.2], C.under, 0.5)
  line(pen, [WALL_R[1], y], [KERB, y], C.paveHi, 0.6)
  // A hydrant at the kerb.
  const hx = KERB - 0.55
  rect(pen, hx - 0.14, y - 0.62, hx + 0.14, y, '#3E4644')
  ellipse(pen, [hx, y - 0.62], 0.15, 0.1, '#4C5553')
  rect(pen, hx - 0.24, y - 0.42, hx + 0.24, y - 0.32, '#323937')
  rect(pen, hx - 0.2, y - 0.06, hx + 0.2, y, '#272D2C')
  line(pen, [hx - 0.08, y - 0.58], [hx - 0.08, y - 0.1], '#6F7A76', 0.6)
  // The streetlight, its arm out over the pavement.
  const buzz = t >= BUZZ ? 0.55 + 0.45 * Math.abs(Math.cos((t - BUZZ) * 60)) * (1 - Math.exp(-(t - BUZZ) / 0.12)) + 0.45 * Math.exp(-(t - BUZZ) / 0.12) * 0 : 1
  const lit = t >= BUZZ && t < BUZZ + 0.3 ? buzz : 1
  const head: Pt = [LAMP_X - 0.75, y - 5.15]
  limb(pen, [LAMP_X, y], [LAMP_X, y - 5.0], 0.13, C.pole)
  limb(pen, [LAMP_X - 0.12, y], [LAMP_X + 0.12, y], 0.1, C.pole)
  rect(pen, LAMP_X - 0.12, y - 0.6, LAMP_X + 0.12, y, C.pole)
  path(pen, [[LAMP_X, y - 5.0], [LAMP_X, y - 5.3], [LAMP_X - 0.3, y - 5.42], [head[0], head[1] - 0.1]], C.pole, 2.2)
  shape(pen, [[head[0] - 0.3, head[1]], [head[0] + 0.3, head[1]], [head[0] + 0.18, head[1] - 0.15], [head[0] - 0.18, head[1] - 0.15]], C.pole)
  ellipse(pen, [head[0], head[1] + 0.04], 0.17, 0.07, mix(C.pole, C.sodium, lit))
  glow(pen, [head[0], head[1] + 0.2], 3.4, C.sodium, 0.32 * lit)
  // Its cone down to the pavement, and the wet gleam it leaves.
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const g = ctx.createLinearGradient(0, head[1] * k, 0, y * k)
  g.addColorStop(0, rgba(pen, C.sodium, 0.16 * lit))
  g.addColorStop(1, rgba(pen, C.sodium, 0.03 * lit))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((head[0] - 0.2) * k, head[1] * k)
  ctx.lineTo((head[0] + 0.2) * k, head[1] * k)
  ctx.lineTo((head[0] + 2.2) * k, y * k)
  ctx.lineTo((head[0] - 2.2) * k, y * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // A puddle by the ladder's foot: the lamp in it, and the sky.
  const pud: Pt = [14.6, y + 0.05]
  ellipse(pen, pud, 1.25, 0.06, mix(C.pave, C.sky2, 0.6))
  ellipse(pen, [pud[0] + 0.3, pud[1]], 0.7, 0.035, mix(C.sodium, C.pave, 0.55 - 0.3 * flash(t - PAVE, 0.25)))
  for (let i = 0; i < 5; i++) {
    const gx = head[0] - 1.6 + i * 0.75
    line(pen, [gx, y + 0.04], [gx + 0.25, y + 0.04], C.sodium, 0.35)
  }
  // The ripple where he lands.
  const sp = t - PAVE
  if (sp > 0 && sp < 1.4) {
    const r = 0.15 + sp * 0.9
    const ctx2 = ctxOf(pen.p)
    ctx2.save()
    ctx2.strokeStyle = rgba(pen, C.paveHi, 0.6 * (1 - sp / 1.4))
    ctx2.lineWidth = pen.w * 0.7
    ctx2.beginPath()
    ctx2.ellipse(13.75 * k, (y + 0.05) * k, r * k, r * 0.08 * k, 0, 0, Math.PI * 2)
    ctx2.stroke()
    ctx2.restore()
  }
}

/* ------------------------------------------------------------------ the building */

/** Brick, coursed, over a box (clipped to the frame). */
function brick(pen: Pen, x0: number, y0: number, x1: number, y1: number, f: Frame): void {
  const a0 = Math.max(x0, f.x0 - 0.5)
  const a1 = Math.min(x1, f.x1 + 0.5)
  const b0 = Math.max(y0, f.y0 - 0.5)
  const b1 = Math.min(y1, f.y1 + 0.5)
  if (a1 <= a0 || b1 <= b0) return
  rect(pen, a0, b0, a1, b1, C.brick)
  const H = 0.21
  const W = 0.46
  for (let r = Math.floor(b0 / H); r * H < b1; r++) {
    const y = r * H
    if (y > b0) line(pen, [a0, y], [a1, y], C.mortar, 0.45)
    const off = (r & 1) * W * 0.5
    for (let c = Math.floor((a0 - off) / W); c * W + off < a1; c++) {
      const x = c * W + off
      const h = hash(c, r, 9)
      if (h > 0.72) rect(pen, Math.max(a0, x + 0.02), Math.max(b0, y + 0.02), Math.min(a1, x + W - 0.02), Math.min(b1, y + H - 0.02), h > 0.9 ? C.brickHi : mix(C.brick, C.mortar, 0.3))
      if (x > a0 && x < a1) line(pen, [x, Math.max(b0, y)], [x, Math.min(b1, y + H)], C.mortar, 0.45)
    }
  }
}

/** A floor seen cut: boards on top, the joists, the plaster of the ceiling under. */
function slab(pen: Pen, x0: number, x1: number, fl: number, f: Frame): void {
  const a0 = Math.max(x0, f.x0 - 0.5)
  const a1 = Math.min(x1, f.x1 + 0.5)
  if (a1 <= a0 || fl > f.y1 + 1 || fl + 0.5 < f.y0 - 1) return
  rect(pen, a0, fl, a1, fl + 0.47, C.joist)
  rect(pen, a0, fl, a1, fl + 0.07, C.board)
  line(pen, [a0, fl], [a1, fl], C.boardHi, 0.6)
  for (let x = Math.floor(a0 / 1.1) * 1.1; x < a1; x += 1.1) rect(pen, x, fl + 0.09, x + 0.14, fl + 0.4, mix(C.joist, C.board, 0.45))
  rect(pen, a0, fl + 0.4, a1, fl + 0.47, C.plaster)
}

/** Wallpaper over a room's back wall: a stripe and a small motif, a skirting board. */
function paper(pen: Pen, x0: number, x1: number, ceil: number, fl: number, base: string, stripe: string, motif: string, f: Frame): void {
  const a0 = Math.max(x0, f.x0 - 0.5)
  const a1 = Math.min(x1, f.x1 + 0.5)
  if (a1 <= a0) return
  rect(pen, a0, ceil, a1, fl, base)
  for (let x = Math.floor((a0 - x0) / 0.5) * 0.5 + x0; x < a1; x += 0.5) {
    rect(pen, x, ceil, x + 0.07, fl, stripe)
    for (let y = ceil + 0.3; y < fl - 0.3; y += 0.5) {
      const yy = y + ((Math.round((x - x0) / 0.5) & 1) * 0.25)
      shape(pen, [[x + 0.25, yy - 0.07], [x + 0.32, yy], [x + 0.25, yy + 0.07], [x + 0.18, yy]], motif)
    }
  }
  rect(pen, a0, fl - 0.16, a1, fl, C.skirting)
  // The picture rail.
  rect(pen, a0, ceil + 0.42, a1, ceil + 0.47, mix(base, C.skirting, 0.5))
}

/** A window in the outer wall, seen cut: the opening, the sashes on the glass's line, the sky through it. */
function windowCut(pen: Pen, fl: number, open: boolean, shade: number): void {
  const s = sillOf(fl)
  const h = headOf(fl)
  const [x0, x1] = WALL_R
  rect(pen, x0, h, x1, s, mix(C.sky1, C.sky0, 0.3))
  const gx = (x0 + x1) / 2
  // The lower sash: up, if open.
  const lowTop = open ? h + 0.1 : (h + s) / 2
  const lowBot = open ? (h + s) / 2 : s
  rect(pen, gx - 0.05, h, gx + 0.05, (h + s) / 2 + 0.05, C.doorDark)
  rect(pen, gx - 0.035, lowTop, gx + 0.035, lowBot, C.doorHi)
  line(pen, [gx, h + 0.05], [gx, s - 0.05], C.moonLight, 0.3)
  // Sill and head, the lintel over it.
  rect(pen, x0 - 0.1, s, x1 + 0.12, s + 0.08, mix(C.plaster, C.brick, 0.5))
  rect(pen, x0, h - 0.18, x1, h, mix(C.brick, C.mortar, 0.5))
  // A torn shade, pulled part way.
  if (shade > 0) {
    rect(pen, x0 - 0.12, h + 0.02, x0 - 0.02, h + 0.02 + (s - h) * shade, mix(C.paperBack, C.dark, 0.35))
    ellipse(pen, [x0 - 0.07, h + 0.05], 0.07, 0.07, C.doorDark)
  }
}

export function drawBuilding(pen: Pen, t: number, f: Frame): void {
  const marty = withTone(pen, toneMarty(t))
  const mish = withTone(pen, toneMish)
  const dark = withTone(pen, toneDark)
  const top = -16
  // The whole block in brick, from the hall to the outer wall.
  brick(pen, f.x0 - 1, top, WALL_R[1], F_STREET, f)
  // Rooms floor by floor: the hall to the left of the party wall, the room right of it.
  const floors = [F_MARTY - 2 * STOREY, F_MARTY - STOREY, F_MARTY, F_MISH, F_SECOND, F_STREET]
  for (const fl of floors) {
    const ceil = ceilOf(fl)
    if (fl < f.y0 - 1 || ceil > f.y1 + 1) continue
    const room = fl === F_MARTY ? marty : fl === F_MISH ? mish : dark
    // The hall: dim paper and a hall light.
    paper(dark, f.x0 - 1, WALL_L[0], ceil, fl, '#6A5A3E', '#5C4E36', '#7A6A4A', f)
    glow(dark, [-4, ceil + 0.8], 2.4, C.tungsten, fl === F_MARTY || fl === F_MISH ? 0.5 : 0.25)
    if (fl === F_MARTY) paper(room, WALL_L[1], WALL_R[0], ceil, fl, C.paper, C.paperStripe, C.paperMotif, f)
    else if (fl === F_MISH) paper(room, WALL_L[1], WALL_R[0], ceil, fl, C.mPaper, C.mStripe, C.mMotif, f)
    else paper(room, WALL_L[1], WALL_R[0], ceil, fl, '#7A7458', '#6C6750', '#86805F', f)
    if (fl !== F_STREET) windowCut(fl === F_MARTY ? marty : fl === F_MISH ? mish : dark, fl, fl === F_MISH, fl === F_MARTY ? 0.32 : fl === F_SECOND ? 0.6 : 0)
    else {
      // The street door's vestibule, low.
      rect(dark, WALL_R[0], fl - 2.6, WALL_R[1], fl, mix(C.doorDark, C.dark, 0.5))
    }
    if (room === dark) darkRoom(dark, fl)
    // The floor under every room but the one with the tub over it.
    if (fl !== F_MARTY) slab(fl === F_MISH ? mish : dark, f.x0 - 1, WALL_R[0], fl, f)
  }
  // The cut walls.
  brick(pen, WALL_L[0], top, WALL_L[1], F_STREET, f)
  for (const fl of floors) {
    // A doorway through the party wall into each room is round the back: the wall here is solid; only the floors cross it.
    if (fl >= f.y0 - 1 && fl <= f.y1 + 1) slab(dark, WALL_L[0], WALL_L[1], fl, f)
  }
  drawMartyRoom(marty, t)
  drawMishRoom(mish)
  drawFloor(marty, mish, t, f)
}

/** The rooms nobody is awake in: a bed, a wardrobe, a chair; the lobby's desk, its pigeonholes, a lamp left on. */
function darkRoom(pen: Pen, fl: number): void {
  if (fl === F_STREET) {
    rect(pen, 1.2, fl - 1.15, 4.6, fl, C.door)
    rect(pen, 1.1, fl - 1.25, 4.7, fl - 1.15, C.doorHi)
    rect(pen, 1.6, fl - 3.0, 4.2, fl - 1.8, C.doorDark)
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) rect(pen, 1.7 + i * 0.42, fl - 2.92 + j * 0.38, 2.02 + i * 0.42, fl - 2.62 + j * 0.38, hash(i, j, 50) > 0.6 ? C.paperBack : C.dark)
    const lamp: Pt = [4.1, fl - 1.55]
    rect(pen, lamp[0] - 0.03, lamp[1], lamp[0] + 0.03, fl - 1.25, C.lampBase)
    shape(pen, [[lamp[0] - 0.18, lamp[1]], [lamp[0] + 0.18, lamp[1]], [lamp[0] + 0.1, lamp[1] - 0.2], [lamp[0] - 0.1, lamp[1] - 0.2]], '#5E6E3A')
    glow({ ...pen, tone: (h) => h }, [lamp[0], lamp[1] + 0.1], 2.6, '#C9B060', 0.2)
    // A potted palm, gone brown.
    rect(pen, 5.6, fl - 0.5, 6.0, fl, C.suitcase)
    for (const a of [-0.9, -0.4, 0.2, 0.7, 1.1]) path(pen, [[5.8, fl - 0.5], [5.8 + 0.3 * Math.sin(a), fl - 1.0], [5.8 + 0.6 * Math.sin(a), fl - 0.9 + 0.2 * Math.abs(a)]], '#4A5A34', 1.4)
    return
  }
  // A wardrobe, a bed under a dark blanket, a chair.
  rect(pen, -0.9, fl - 2.6, 0.3, fl, C.doorDark)
  line(pen, [-0.3, fl - 2.5], [-0.3, fl - 0.1], C.dark, 0.6)
  rect(pen, 2.6, fl - 0.85, 6.0, fl - 0.5, C.mattress)
  rect(pen, 2.6, fl - 0.5, 6.0, fl - 0.35, C.iron)
  shape(pen, [[3.4, fl - 0.85], [6.0, fl - 0.9], [6.1, fl - 0.35], [3.3, fl - 0.4]], C.blanket)
  limb(pen, [2.6, fl], [2.6, fl - 1.5], 0.07, C.iron)
  limb(pen, [6.05, fl], [6.05, fl - 1.0], 0.07, C.iron)
}

/* ------------------------------------------------------------------ Marty's room */

function drawMartyRoom(pen: Pen, t: number): void {
  const fl = F_MARTY
  const ceil = ceilOf(fl)
  // The paper peeling: a seam come away at the top and curling forward, the plaster's backing behind it; a stain.
  for (const [x, w, d] of [[-0.55, 0.3, 0.55], [2.45, 0.34, 0.75], [6.45, 0.3, 0.6]] as const) {
    const y = ceil + 0.47
    shape(pen, [[x, y], [x + w, y], [x + w * 0.92, y + d], [x + w * 0.4, y + d * 0.8], [x + 0.02, y + d * 0.95]], mix(C.paperBack, C.paper, 0.35))
    // The loose flap, its paler underside out, curling.
    shape(pen, [[x + 0.02, y + d * 0.95], [x + w * 0.92, y + d], [x + w * 1.05, y + d + 0.22], [x + w * 0.7, y + d + 0.36], [x + w * 0.15, y + d + 0.26]], mix(C.paperBack, C.dark, 0.12))
    path(pen, [[x + w * 0.15, y + d + 0.26], [x + w * 0.7, y + d + 0.36], [x + w * 1.05, y + d + 0.22]], mix(C.paperStripe, C.dark, 0.45), 0.6)
    line(pen, [x + 0.02, y + d * 0.95], [x + w * 0.92, y + d], mix(C.paper, C.dark, 0.35), 0.5)
  }
  blob(pen, [[0.8, ceil + 0.05], [2.0, ceil + 0.1], [2.3, ceil + 0.7], [1.6, ceil + 1.1], [0.9, ceil + 0.75]], C.stain, 0.35)
  // The door, a transom over it lit from the hall, light under it.
  const [d0, d1] = DOOR
  rect(pen, d0 - 0.1, DOOR_TOP - 0.1, d1 + 0.1, fl, C.doorDark)
  rect(pen, d0, DOOR_TOP, d1, fl, C.door)
  for (const [y0, y1] of [[DOOR_TOP + 0.18, DOOR_TOP + 1.2], [DOOR_TOP + 1.4, fl - 0.2]]) {
    rect(pen, d0 + 0.15, y0, (d0 + d1) / 2 - 0.06, y1, C.doorHi)
    rect(pen, (d0 + d1) / 2 + 0.06, y0, d1 - 0.15, y1, C.doorHi)
  }
  ellipse(pen, [d1 - 0.16, DOOR_TOP + 1.35], 0.05, 0.05, C.knob)
  rect(pen, d0, DOOR_TOP - 0.5, d1, DOOR_TOP - 0.16, C.doorDark)
  rect(pen, d0 + 0.06, DOOR_TOP - 0.45, d1 - 0.06, DOOR_TOP - 0.2, mix(C.transom, C.dark, 0.25))
  rect(pen, d0 + 0.02, fl - 0.04, d1 - 0.02, fl, C.transom)
  // A coat on a nail by the door.
  jacket(pen, [d1 + 0.32, DOOR_TOP + 0.3], '#3E3A33')
  // The radiator: its sections, its pipe; it knocks.
  const kn = KNOCKS.reduce((s, k) => s + (t >= k ? ring(t - k, 18, 0.09) : 0), 0)
  const dx = 0.025 * kn
  const [r0, r1] = RADIATOR
  for (let i = 0; i < 8; i++) {
    const x = r0 + dx + i * ((r1 - r0) / 8)
    rect(pen, x + 0.01, RADIATOR_TOP, x + (r1 - r0) / 8 - 0.015, fl - 0.08, i % 2 ? C.radiator : mix(C.radiator, C.radiatorDark, 0.4))
    ellipse(pen, [x + (r1 - r0) / 16, RADIATOR_TOP], (r1 - r0) / 16 - 0.01, 0.04, C.radiator)
  }
  rect(pen, r0 + dx, fl - 0.12, r1 + dx, fl - 0.06, C.radiatorDark)
  limb(pen, [r1 + dx, fl - 0.3], [r1 + 0.22, fl - 0.3], 0.07, C.radiatorDark)
  limb(pen, [r1 + 0.22, fl - 0.3], [r1 + 0.22, fl], 0.07, C.radiatorDark)
  ellipse(pen, [r1 + 0.22, fl - 0.42], 0.06, 0.06, C.iron)
  // The suitcase under the bed (back from London), the iron bed, its mattress.
  rect(pen, BED[0] + 0.5, fl - 0.42, BED[0] + 1.75, fl - 0.02, C.suitcase)
  rect(pen, BED[0] + 0.8, fl - 0.42, BED[0] + 0.88, fl - 0.02, C.strap)
  rect(pen, BED[0] + 1.35, fl - 0.42, BED[0] + 1.43, fl - 0.02, C.strap)
  const dents = [at(44, 1), at(44, 2)]
  let dent = 0
  for (const d of dents) dent += 0.07 * Math.max(0, ring(t - d, 3.2, 0.18))
  const m0 = MATTRESS
  shape(pen, [[BED[0] + 0.05, m0 + 0.04], [BED[0] + 0.7, m0 + dent * 0.4], [BED[0] + 1.3, m0 + dent], [BED[0] + 2.1, m0 + dent * 0.6], [BED[1] - 0.08, m0], [BED[1] - 0.08, m0 + 0.32], [BED[0] + 0.05, m0 + 0.32]], C.mattress)
  for (let x = BED[0] + 0.2; x < BED[1] - 0.1; x += 0.22) line(pen, [x, m0 + 0.08], [x, m0 + 0.3], C.ticking, 0.4)
  // The blanket kicked half off, over the foot.
  shape(pen, [[BED[0] + 1.55, m0 + 0.02 + dent * 0.6], [BED[0] + 1.2, m0 - 0.1 + dent * 0.7], [BED[0] + 0.75, m0 - 0.04 + dent * 0.4], [BED[0] + 0.3, m0 - 0.12], [BED[0] - 0.06, m0 - 0.02], [BED[0] - 0.12, m0 + 0.35], [BED[0] - 0.08, fl - 0.28], [BED[0] + 0.12, fl - 0.18], [BED[0] + 0.18, m0 + 0.36], [BED[0] + 1.6, m0 + 0.3]], C.blanket)
  path(pen, [[BED[0] + 0.25, m0 + 0.02], [BED[0] + 0.7, m0 + 0.12], [BED[0] + 1.15, m0 + 0.05]], C.blanketHi, 0.6)
  path(pen, [[BED[0] - 0.05, m0 + 0.4], [BED[0] + 0.0, fl - 0.35]], C.blanketHi, 0.5)
  shape(pen, [[BED[1] - 0.75, m0 + 0.02], [BED[1] - 0.12, m0 - 0.02], [BED[1] - 0.1, m0 - 0.22], [BED[1] - 0.7, m0 - 0.2]], C.pillow)
  // The iron: rails, posts with their knobs, the bars of the head.
  const rail = m0 + 0.36
  limb(pen, [BED[0], rail], [BED[1], rail], 0.06, C.iron)
  limb(pen, [BED[0], fl], [BED[0], m0 - 0.3], 0.07, C.iron)
  limb(pen, [BED[1], fl], [BED[1], m0 - 0.92], 0.07, C.iron)
  ellipse(pen, [BED[0], m0 - 0.34], 0.06, 0.06, C.ironHi)
  ellipse(pen, [BED[1], m0 - 0.96], 0.06, 0.06, C.ironHi)
  limb(pen, [BED[0], m0 - 0.22], [BED[0] + 0.08, m0 - 0.22], 0.04, C.iron)
  for (let i = 1; i <= 3; i++) limb(pen, [BED[1] - 0.02 * i, m0 - 0.85], [BED[1] - 0.02 * i, rail], 0.03, C.iron)
  limb(pen, [BED[1], m0 - 0.85], [BED[1] - 0.06, m0 - 0.85], 0.05, C.iron)
  // The window (in the cut wall), and the moonlight through it once the bulb has gone.
  const L = bulbLevel(t)
  const moon = 1 - L
  if (moon > 0.01) {
    const s = sillOf(fl)
    const h = headOf(fl)
    const ctx = ctxOf(pen.p)
    const { k } = pen
    const g = ctx.createLinearGradient(WALL_R[0] * k, 0, 3.6 * k, 0)
    g.addColorStop(0, `rgba(170,215,220,${0.2 * moon})`)
    g.addColorStop(1, `rgba(170,215,220,0)`)
    ctx.save()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(WALL_R[0] * k, (h + 0.3) * k)
    ctx.lineTo(WALL_R[0] * k, s * k)
    ctx.lineTo(4.9 * k, fl * k)
    ctx.lineTo(2.6 * k, fl * k)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    // The window's pattern on the floor.
    for (const x of [3.3, 4.2, 5.1]) rect(pen, x, fl - 0.02, x + 0.7, fl + 0.02, mix(C.moonLight, C.board, 0.45))
  }
  // The bulb on its cord, swinging; out on the bridge.
  drawBulb(pen, t)
}

/** A jacket hung by its collar from `hook`: shoulders, the body, a sleeve, the lapels. */
function jacket(pen: Pen, hook: Pt, col: string): void {
  const [x, y] = hook
  ellipse(pen, [x, y], 0.04, 0.04, C.iron)
  shape(pen, [[x - 0.08, y + 0.04], [x + 0.08, y + 0.04], [x + 0.3, y + 0.2], [x + 0.34, y + 1.05], [x - 0.3, y + 1.08], [x - 0.3, y + 0.2]], col)
  shape(pen, [[x - 0.08, y + 0.04], [x + 0.08, y + 0.04], [x + 0.02, y + 0.55]], mix(col, C.shirt, 0.5))
  path(pen, [[x - 0.12, y + 0.06], [x - 0.02, y + 0.6], [x + 0.02, y + 1.06]], mix(col, C.dark, 0.5), 0.6)
  shape(pen, [[x + 0.3, y + 0.22], [x + 0.4, y + 0.3], [x + 0.38, y + 0.95], [x + 0.28, y + 0.95]], mix(col, C.dark, 0.25))
  rect(pen, x + 0.08, y + 0.7, x + 0.24, y + 0.74, mix(col, C.dark, 0.5))
}

function drawBulb(pen: Pen, t: number): void {
  const L = bulbLevel(t)
  const s = t - T0
  // A slow swing that the knocks feed; it swings hard after the crash.
  const crash = t > BREAK ? 0.35 * Math.exp(-(t - BREAK) / 3) * Math.sin((t - BREAK) * 4.2) : 0
  const ang = 0.08 * Math.sin((s * Math.PI * 2) / (BEAT * 4)) + KNOCKS.reduce((a, k) => a + (t > k ? 0.03 * Math.exp(-(t - k) / 0.6) * Math.sin((t - k) * 9) : 0), 0) + crash
  const end: Pt = [BULB_HANG[0] + Math.sin(ang) * CORD, BULB_HANG[1] + Math.cos(ang) * CORD]
  line(pen, BULB_HANG, end, C.cord, 0.9)
  rect(pen, BULB_HANG[0] - 0.07, BULB_HANG[1], BULB_HANG[0] + 0.07, BULB_HANG[1] + 0.06, C.iron)
  const c: Pt = [end[0] + Math.sin(ang) * 0.17, end[1] + Math.cos(ang) * 0.17]
  rect(pen, end[0] - 0.05, end[1] - 0.02, end[0] + 0.05, end[1] + 0.1, C.ironHi)
  if (L > 0.02) {
    glow(pen, c, 4.4, C.tungsten, 0.34 * L)
    glow(pen, c, 1.0, C.bulb, 0.6 * L)
  }
  ellipse(pen, c, 0.11, 0.13, mix(C.bulbOff, C.bulb, L))
  if (L > 0.3) ellipse(pen, c, 0.05, 0.06, '#FFF4D8')
  // The filament's last flash as it goes, each time.
  for (const k of [BULB_POP, BULB_OUT]) {
    const m = flash(t - k, 0.09)
    if (m > 0.02) {
      glint({ ...pen, tone: (h) => h }, c, 0.32, '#FFF1C8', m)
      glow({ ...pen, tone: (h) => h }, c, 2.2, C.tungsten, 0.35 * m)
    }
  }
}

/* ------------------------------------------------------------------ Mishkin's room */

function drawMishRoom(pen: Pen): void {
  const fl = F_MISH
  const ceil = ceilOf(fl)
  // His door, a picture over the bed's head.
  const [d0, d1] = M_DOOR
  rect(pen, d0 - 0.1, fl - 2.7, d1 + 0.1, fl, C.doorDark)
  rect(pen, d0, fl - 2.6, d1, fl, mix(C.door, C.mBed, 0.3))
  rect(pen, d0 + 0.14, fl - 2.42, d1 - 0.14, fl - 1.5, C.doorHi)
  rect(pen, d0 + 0.14, fl - 1.3, d1 - 0.14, fl - 0.2, C.doorHi)
  ellipse(pen, [d1 - 0.16, fl - 1.3], 0.05, 0.05, C.knob)
  rect(pen, 0.9, ceil + 1.0, 2.0, ceil + 1.75, C.frame)
  rect(pen, 0.98, ceil + 1.08, 1.92, ceil + 1.67, C.picture)
  shape(pen, [[0.98, ceil + 1.67], [1.3, ceil + 1.35], [1.55, ceil + 1.5], [1.92, ceil + 1.25], [1.92, ceil + 1.67]], '#2E3A32')
  // A chair with his jacket and hat.
  rect(pen, -0.6 + 1.3, fl - 1.0, 0.2 + 1.3, fl - 0.92, C.mBed)
  limb(pen, [0.75, fl - 0.95], [0.75, fl], 0.05, C.mBed)
  limb(pen, [1.45, fl - 0.95], [1.45, fl], 0.05, C.mBed)
  limb(pen, [1.45, fl - 0.95], [1.5, fl - 2.0], 0.06, C.mBed)
  jacket(pen, [1.5, fl - 2.02], '#2C2A30')
  ellipse(pen, [0.95, fl - 1.06], 0.3, 0.07, '#3A3236')
  ellipse(pen, [0.95, fl - 1.15], 0.17, 0.1, '#3A3236')
  // The nightstand and its lamp: what lights the room.
  const [n0, n1] = NIGHTSTAND
  rect(pen, n0, STAND_TOP, n1, fl, C.stand)
  rect(pen, n0 - 0.05, STAND_TOP - 0.06, n1 + 0.05, STAND_TOP, mix(C.stand, C.mBedHi, 0.5))
  rect(pen, n0 + 0.08, STAND_TOP + 0.15, n1 - 0.08, STAND_TOP + 0.4, mix(C.stand, C.dark, 0.3))
  const lx = (n0 + n1) / 2 - 0.1
  rect(pen, lx - 0.05, STAND_TOP - 0.5, lx + 0.05, STAND_TOP, C.lampBase)
  ellipse(pen, [lx, STAND_TOP - 0.04], 0.18, 0.05, C.lampBase)
  shape(pen, [[lx - 0.22, STAND_TOP - 0.5], [lx + 0.22, STAND_TOP - 0.5], [lx + 0.14, STAND_TOP - 0.85], [lx - 0.14, STAND_TOP - 0.85]], C.shade)
  glow(pen, [lx, STAND_TOP - 0.65], 3.6, C.lamp, 0.36)
  glow(pen, [lx, STAND_TOP - 0.45], 0.8, C.lamp, 0.55)
  // A glass and an ashtray.
  rect(pen, n1 - 0.25, STAND_TOP - 0.2, n1 - 0.12, STAND_TOP, '#9DB0A4')
  ellipse(pen, [n0 + 0.2, STAND_TOP - 0.02], 0.12, 0.03, '#2A2420')
}

/* ------------------------------------------------------------------ the floor between */

/** The cracks: each a crooked line through the floor's cut and down Mishkin's wall, growing on its beat. */
const CRACK_PATHS: Pt[][] = CRACKS.map((_, i) => {
  const x = TUB_X + (i % 2 ? 1 : -1) * (0.3 + 0.17 * i) + (hash(i, 2) - 0.5) * 0.3
  const pts: Pt[] = [[x, F_MARTY + 0.02]]
  let y = F_MARTY + 0.02
  let cx = x
  for (let j = 0; j < 5 + (i % 3); j++) {
    y += 0.12 + hash(i, j, 4) * 0.16
    cx += (hash(i, j, 6) - 0.5) * 0.35
    pts.push([cx, y])
  }
  return pts
})

function drawFloor(marty: Pen, mish: Pen, t: number, f: Frame): void {
  const fl = F_MARTY
  const x0 = Math.max(f.x0 - 1, -20)
  const x1 = WALL_R[0]
  const hole: [number, number] = [TUB_X - TUB_HALF - 0.05, TUB_X + TUB_HALF + 0.05]
  // The sag under the tub before it goes: a dip in the boards.
  const sag = t < BREAK ? tubDrop(t) : 0
  const at = (x: number): number => {
    const u = (x - TUB_X) / 2.2
    return Math.abs(u) >= 1 ? 0 : sag * 0.5 * (1 + Math.cos(u * Math.PI))
  }
  const top: Pt[] = []
  const bot: Pt[] = []
  for (let x = x0; x <= x1 + 1e-9; x += Math.min(0.2, Math.max(0.05, (x1 - x0) / 120))) {
    top.push([x, fl + at(x)])
    bot.push([x, fl + 0.47 + at(x)])
  }
  const draw = (pts: Pt[], pb: Pt[]) => {
    if (pts.length < 2) return
    shape(marty, [...pts, ...[...pb].reverse()], C.joist)
    shape(marty, [...pts, ...[...pts].reverse().map(([x, y]) => [x, y + 0.07] as Pt)], C.board)
    path(marty, pts, C.boardHi, 0.6)
    shape(mish, [...pb.map(([x, y]) => [x, y - 0.07] as Pt), ...[...pb].reverse()], C.plaster)
  }
  if (t < BREAK) draw(top, bot)
  else {
    draw(top.filter(([x]) => x <= hole[0]), bot.filter(([x]) => x <= hole[0]))
    draw(top.filter(([x]) => x >= hole[1]), bot.filter(([x]) => x >= hole[1]))
    // Through the hole: the dark between the joists further back.
    rect(marty, hole[0], fl, hole[1], fl + 0.47, mix(C.joist, C.dark, 0.6))
    for (let x = hole[0] + 0.3; x < hole[1]; x += 0.55) rect(marty, x, fl + 0.05, x + 0.1, fl + 0.42, mix(C.joist, C.dark, 0.3))
    // The hole's ragged edges, and the boards hanging down into Mishkin's room.
    for (const side of [-1, 1]) {
      const ex = side < 0 ? hole[0] : hole[1]
      const jag: Pt[] = [[ex, fl], [ex + side * 0.08, fl + 0.12], [ex - side * 0.05, fl + 0.22], [ex + side * 0.1, fl + 0.33], [ex, fl + 0.47], [ex - side * 0.25, fl + 0.47], [ex - side * 0.25, fl]]
      shape(marty, jag, C.dark)
      const sw = Math.exp(-(t - BREAK) / 1.2) * Math.sin((t - BREAK) * 7) * 0.12
      const ang = 1.15 + sw
      const b0: Pt = [ex - side * 0.02, fl + 0.03]
      const b1: Pt = [b0[0] - side * Math.cos(ang) * 0.9, b0[1] + Math.sin(ang) * 0.9]
      if (side < 0 || t < BOARD_DROP - BOARD_FALL) limb(marty, b0, b1, 0.07, C.board)
      const c0: Pt = [ex - side * 0.12, fl + 0.4]
      limb(mish, c0, [c0[0] - side * 0.15, c0[1] + 0.55], 0.05, C.plasterDark)
    }
  }
  // The cracks, through the floor and down the wall below.
  for (let i = 0; i < CRACKS.length; i++) {
    const s = t - CRACKS[i]
    if (s < 0 || t >= BREAK + 0.05) continue
    const pts = CRACK_PATHS[i]
    const n = Math.min(pts.length, 1 + (pts.length - 1) * Math.min(1, s / 0.12))
    const shown = pts.slice(0, Math.ceil(n)).map(([x, y]) => [x, y + at(x)] as Pt)
    path(mish, shown, C.dark, 1.0)
    // The fresh crack catches the lamp light for a moment.
    if (s < 0.25) path(mish, shown, C.plasterHi, 0.5 * (1 - s / 0.25))
    // Dust sifts from it.
    for (let j = 0; j < 4; j++) {
      const ds = s - j * 0.08
      if (ds < 0 || ds > 1.3) continue
      const px = pts[0][0] + (hash(i, j, 12) - 0.5) * 0.4
      const py = fl + 0.47 + 0.5 * G_LOW * ds * ds
      ellipse(mish, [px, py], 0.025, 0.025, C.plasterHi)
    }
  }
  // The creak before them: the boards under the tub's feet flex.
  const cs = t - CREAK
  if (cs >= 0 && cs < 0.5 && t < BREAK) {
    const m = flash(cs, 0.15)
    for (const fx of [TUB_X - 0.8, TUB_X + 0.8]) path(marty, [[fx - 0.25, fl + 0.02], [fx, fl + 0.02 + 0.04 * m], [fx + 0.25, fl + 0.02]], C.plasterHi, 0.7 * m)
  }
}

/* ------------------------------------------------------------------ the fire escape */

/** Iron, with the moon along its top edge. */
function ironLimb(pen: Pen, p: Pt, q: Pt, w: number, col: string): void {
  limb(pen, p, q, w, col)
  const dx = q[0] - p[0]
  const dy = q[1] - p[1]
  const len = Math.hypot(dx, dy) || 1
  // The lit side: the one facing up (or the right, on an upright).
  let nx = dy / len
  let ny = -dx / len
  if (ny > 0 || (Math.abs(ny) < 1e-6 && nx < 0)) {
    nx = -nx
    ny = -ny
  }
  const o = w * 0.32
  line(pen, [p[0] + nx * o, p[1] + ny * o], [q[0] + nx * o, q[1] + ny * o], mix(col, C.moonLight, 0.42), 0.5)
}

function rails(pen: Pen, x0: number, x1: number, y: number, col: string): void {
  ironLimb(pen, [x0, y], [x1, y], 0.07, col)
  ironLimb(pen, [x0, y - 1.0], [x1, y - 1.0], 0.045, col)
  ironLimb(pen, [x0, y - 0.5], [x1, y - 0.5], 0.025, col)
  for (let x = x0; x <= x1 + 1e-6; x += 0.42) ironLimb(pen, [x, y], [x, y - 1.0], 0.03, col)
  // Its brackets back to the wall.
  ironLimb(pen, [WALL_R[1], y + 0.9], [x0 + 1.1, y + 0.04], 0.045, col)
}

function flight(pen: Pen, top: Pt, bottom: Pt, n: number, col: string): void {
  const dx = (bottom[0] - top[0]) / n
  const dy = (bottom[1] - top[1]) / n
  ironLimb(pen, [top[0], top[1] + 0.12], [bottom[0], bottom[1] + 0.12], 0.06, col)
  for (let i = 1; i < n; i++) {
    const x = top[0] + dx * i
    const y = top[1] + dy * i
    ironLimb(pen, [x - Math.abs(dx) * 0.7, y + 0.03], [x + Math.abs(dx) * 0.7, y + 0.03], 0.07, col)
  }
  // The handrail.
  ironLimb(pen, [top[0], top[1] - 1.0], [bottom[0], bottom[1] - 1.0], 0.04, col)
  ironLimb(pen, [bottom[0], bottom[1] - 1.0], [bottom[0], bottom[1]], 0.03, col)
}

export function drawFireEscape(pen: Pen, t: number): void {
  const back = mix(C.fe, C.sky1, 0.45)
  const L5 = sillOf(F_MARTY - STOREY)
  // The flights that go the other way, behind.
  flight(pen, [12.45, L5], [9.15, L_MARTY], RISERS, back)
  flight(pen, [12.45, L_MARTY], [9.15, L_MISH], RISERS, back)
  // The landings, at each window's sill.
  for (const y of [L5, L_MARTY, L_MISH, L_SECOND]) {
    const gap = y === L_MISH || y === L_MARTY - 999 ? [STAIR_X0 + 0.05, STAIR_X0 + 1.05] : null
    if (gap) {
      ironLimb(pen, [LANDING[0], y + 0.03], [gap[0], y + 0.03], 0.07, C.fe)
      ironLimb(pen, [gap[1], y + 0.03], [LANDING[1], y + 0.03], 0.07, C.fe)
    } else ironLimb(pen, [LANDING[0], y + 0.03], [LANDING[1], y + 0.03], 0.07, C.fe)
    rails(pen, LANDING[0] + 0.05, LANDING[1], y, C.fe)
  }
  // The flights down to the right: the one he takes, and the one above it.
  flight(pen, [STAIR_X0, L5], [STAIR_X1, L_MARTY], RISERS, C.fe)
  flight(pen, [STAIR_X0, L_MISH], [STAIR_X1, L_SECOND], RISERS, C.fe)
  // Tread rings: each tread he lands on shivers.
  for (let n = 1; n <= 13; n++) {
    const tt = n <= 12 ? TREADS[n - 1] : DOWN
    const s = t - tt
    if (s < 0 || s > 0.5) continue
    const x = STAIR_X0 + RUN * n
    const y = L_MISH + RISE * n
    const m = flash(s, 0.12)
    line(pen, [x - 0.2, y + 0.01 + 0.03 * ring(s, 14, 0.12)], [x + 0.2, y + 0.01 - 0.03 * ring(s, 14, 0.12)], '#9FB4B0', 1.4 * m)
  }
  drawLadder(pen, t)
}

function drawLadder(pen: Pen, t: number): void {
  const d = ladderDrop(t)
  const y0 = LADDER_TOP0 + d
  const y1 = y0 + LADDER_LEN
  const xl = LADDER_X - 0.22
  const xr = LADDER_X + 0.22
  // The guide it runs in, off the landing's end; the pulley; the counterweight going up as it comes down.
  const gx = LADDER_X + 0.34
  ironLimb(pen, [LANDING[1], L_SECOND + 0.03], [gx, L_SECOND + 0.03], 0.07, C.fe)
  ironLimb(pen, [gx, L_SECOND + 0.35], [gx, L_SECOND - 1.6], 0.06, C.fe)
  ironLimb(pen, [xl - 0.05, L_SECOND + 0.25], [gx, L_SECOND + 0.25], 0.04, C.fe)
  ironLimb(pen, [xl - 0.05, L_SECOND - 0.9], [gx, L_SECOND - 0.9], 0.04, C.fe)
  const pul: Pt = [gx + 0.2, L_SECOND - 1.7]
  ellipse(pen, pul, 0.14, 0.14, null, 1.2, C.fe)
  const wy = L_SECOND + 0.7 - d
  line(pen, [LADDER_X, y0], [pul[0] - 0.14, pul[1]], C.feHi, 0.5)
  line(pen, [pul[0] + 0.14, pul[1]], [pul[0] + 0.14, wy], C.feHi, 0.5)
  rect(pen, pul[0] + 0.02, wy, pul[0] + 0.26, wy + 0.55, C.fe)
  rect(pen, pul[0] + 0.05, wy + 0.05, pul[0] + 0.1, wy + 0.5, C.feHi)
  // The ladder.
  ironLimb(pen, [xl, y0], [xl, y1], 0.06, C.fe)
  ironLimb(pen, [xr, y0], [xr, y1], 0.06, C.fe)
  for (let y = y0; y <= y1 - 0.1; y += RUNG) ironLimb(pen, [xl, y], [xr, y], 0.045, C.fe)
  // Its catch gives; its feet ring on the pavement.
  const cs = t - CATCH
  if (cs >= 0 && cs < 0.4) for (const a of [-1, 1]) line(pen, [gx + 0.1, L_SECOND - 0.9], [gx + 0.1 + 0.2 * a, L_SECOND - 1.0 - 0.1], '#9FB4B0', 0.7 * flash(cs, 0.12))
  const fs = t - FOOT
  if (fs >= 0 && fs < 0.6) {
    const m = flash(fs, 0.15)
    for (const a of [-1.2, -0.6, 0.6, 1.2]) line(pen, [LADDER_X + 0.35 * Math.sin(a), F_STREET - 0.05 - 0.1 * Math.cos(a)], [LADDER_X + 0.6 * Math.sin(a), F_STREET - 0.05 - 0.3 * Math.cos(a)], '#C9D6D0', 0.8 * m)
    glow(pen, [LADDER_X, F_STREET], 0.6, C.sodium, 0.25 * m)
  }
}

/* ------------------------------------------------------------------ the tub */

const TUB_OUT: Pt[] = [[-1.34, -1.13], [-1.22, -0.72], [-1.06, -0.4], [-0.86, -0.25], [-0.5, -0.21], [0.5, -0.21], [0.88, -0.25], [1.08, -0.42], [1.2, -0.75], [1.29, -1.13]]
const TUB_IN: Pt[] = [[-1.21, -1.13], [-1.1, -0.74], [-0.96, -0.47], [-0.78, -0.35], [-0.5, -0.32], [0.5, -0.32], [0.8, -0.35], [0.97, -0.5], [1.08, -0.78], [1.16, -1.13]]
/** The water line, in the tub's own cells. */
const WATER = -0.47

/** The polygon cut to y ≥ `y` (below a line, y down). */
function below(pts: Pt[], y: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const ina = a[1] >= y
    const inb = b[1] >= y
    if (ina) out.push(a)
    if (ina !== inb) {
      const u = (y - a[1]) / (b[1] - a[1])
      out.push([a[0] + (b[0] - a[0]) * u, y])
    }
  }
  return out
}

/** Where the tub's feet are at `t`. */
export const tubAt = (t: number): Pt => [TUB_X, F_MARTY + tubDrop(t)]

export function drawTub(pen: Pen, t: number): void {
  const [ox, oy] = tubAt(t)
  // A shudder on each crack.
  const sh = CRACKS.reduce((s, c) => s + (t > c && t < BREAK ? 0.02 * ring(t - c, 16, 0.08) : 0), 0) + (t > CREAK && t < BREAK ? 0.012 * ring(t - CREAK, 12, 0.1) : 0)
  const at = ([x, y]: Pt): Pt => [ox + x + sh, oy + y]
  // The claw feet.
  for (const fx of [-0.82, 0.82]) {
    shape(pen, [at([fx - 0.08, -0.26]), at([fx + 0.08, -0.26]), at([fx + 0.06, -0.1]), at([fx + 0.12, 0]), at([fx - 0.12, 0]), at([fx - 0.06, -0.1])], C.claw)
    ellipse(pen, at([fx, -0.05]), 0.08, 0.05, C.claw)
  }
  shape(pen, TUB_OUT.map(at), C.tubCut)
  shape(pen, TUB_IN.map(at), C.enamel)
  // The far side of the inside, shaded toward the bottom.
  shape(pen, [at([-1.0, -0.62]), at([1.0, -0.62]), at([0.9, -0.38]), at([-0.85, -0.38])], C.enamelShade)
  // The rolled rim, cut at both ends.
  limb(pen, at([-1.36, TUB_RIM]), at([1.32, TUB_RIM]), 0.08, C.enamel)
  ellipse(pen, at([-1.36, TUB_RIM]), 0.07, 0.07, C.tubCut)
  ellipse(pen, at([1.32, TUB_RIM]), 0.07, 0.07, C.tubCut)
  // The outside's paint where it rounds under.
  path(pen, [at([-1.2, -0.7]), at([-1.0, -0.36]), at([-0.6, -0.24])], C.tubOut, 0.8)
  // The water, till the fall throws it out; it is drawn again over him.
  if (t < LAND) shape(pen, below(TUB_IN, WATER).map(at), mix(C.water, C.enamel, 0.35))
}

/** The water over him: he sits in the bath. */
export function drawWaterOver(pen: Pen, t: number): void {
  if (t >= LAND) return
  const [ox, oy] = tubAt(t)
  const sh = CRACKS.reduce((s, c) => s + (t > c && t < BREAK ? 0.02 * ring(t - c, 16, 0.08) : 0), 0)
  const at = ([x, y]: Pt): Pt => [ox + x + sh, oy + y]
  const ctx = ctxOf(pen.p)
  const { k } = pen
  const pts = below(TUB_IN, WATER).map(at)
  ctx.save()
  ctx.fillStyle = rgba(pen, C.water, 0.42)
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // The surface, rippling out from where he went in.
  const rs = t - 94.773
  const wob = rs > 0 ? 0.03 * Math.exp(-rs / 0.5) * Math.sin(rs * 20) : 0
  path(pen, [at([-1.02, WATER]), at([-0.3, WATER + wob]), at([0.3, WATER - wob]), at([1.0, WATER])], '#DDEBE6', 0.7)
  // The splash as he lands in it.
  if (rs > 0 && rs < 0.6) {
    for (let i = 0; i < 9; i++) {
      const vx = (hash(i, 1, 20) - 0.5) * 2.2
      const vy = -2.4 - hash(i, 2, 20) * 1.6
      const s = rs
      const p: Pt = at([-0.06 + vx * s, WATER + vy * s + 0.5 * G * s * s])
      if (p[1] > oy + WATER) continue
      ellipse(pen, p, 0.035, 0.045, '#CFE3DE')
    }
  }
}

/* ------------------------------------------------------------------ Mishkin's bed, and the man */

export function drawMishBed(pen: Pen, t: number): void {
  const give = bedGive(t) * COLLAPSE
  const m = M_MATTRESS + give
  const [b0, b1] = M_BED
  // The legs buckle outward when the tub lands.
  const splay = bedGive(t) * 0.35
  for (const [x, s] of [[b0 + 0.1, -1], [b1 - 0.1, 1]] as const) limb(pen, [x, m + 0.3], [x + s * splay, F_MISH], 0.08, C.mBed)
  shape(pen, [[b0, m + 0.05], [b1, m + 0.05], [b1, m + 0.32], [b0, m + 0.32]], C.mBed)
  shape(pen, [[b0 + 0.05, m - 0.02], [b1 - 0.05, m - 0.02], [b1 - 0.05, m + 0.14], [b0 + 0.05, m + 0.14]], C.sheet)
  // Headboard (left), footboard (right).
  rect(pen, b0 - 0.12, m - 1.05, b0 + 0.04, F_MISH - (give > 0 ? 0 : 0), C.mBed)
  ellipse(pen, [b0 - 0.04, m - 1.05], 0.12, 0.06, C.mBedHi)
  rect(pen, b1 - 0.04, m - 0.45, b1 + 0.1, m + 0.32, C.mBed)
  ellipse(pen, [b1 + 0.03, m - 0.45], 0.1, 0.05, C.mBedHi)
  // The pillow behind him.
  blob(pen, [[b0 + 0.05, m - 0.05], [b0 + 0.55, m - 0.12], [b0 + 0.6, m - 0.75], [b0 + 0.1, m - 0.85]], C.pillow)
}

/** The blanket over his legs while he is in bed (and left behind when he gets up). */
export function drawBlanket(pen: Pen, t: number, pose: Pose): void {
  const give = bedGive(t) * COLLAPSE
  const m = M_MATTRESS + give
  const inBed = !pose.legs
  const hip = inBed ? pose.hip : [M_BED[0] + 0.7, m] as Pt
  const knee = inBed ? 0.32 : 0.05
  shape(pen, [[hip[0] - 0.15, m + 0.12], [hip[0] - 0.05, hip[1] - 0.3], [hip[0] + 0.9, m - knee - 0.08], [hip[0] + 1.7, m - knee], [M_BED[1] - 0.15, m - 0.15], [M_BED[1] + 0.05, m + 0.35], [hip[0] - 0.15, m + 0.4]], C.mBlanket)
  path(pen, [[hip[0] + 0.5, m - 0.05], [hip[0] + 1.1, m - knee + 0.05], [hip[0] + 1.9, m - 0.05]], C.mBlanketHi, 0.7)
}

export function drawMishkin(pen: Pen, t: number, pose: Pose): void {
  const dust = t >= LAND ? 0.45 : 0
  const col = (h: string) => mix(h, C.plasterHi, dust)
  const { hip, neck, head, arms, legs } = pose
  const ax = neck[0] - hip[0]
  const ay = neck[1] - hip[1]
  const len = Math.hypot(ax, ay)
  const nx = -ay / len
  const ny = ax / len
  const across = (p: Pt, w: number): [Pt, Pt] => [[p[0] + nx * w, p[1] + ny * w], [p[0] - nx * w, p[1] - ny * w]]
  const shoulders = across([neck[0] - ax * 0.06, neck[1] - ay * 0.06], 0.42)
  // The far arm first.
  limb(pen, shoulders[1], arms[2], 0.21, mix(col(C.skin), C.dark, 0.2))
  limb(pen, arms[2], arms[3], 0.19, mix(col(C.skin), C.dark, 0.2))
  ellipse(pen, arms[3], 0.11, 0.11, mix(col(C.skin), C.dark, 0.2))
  // The legs.
  if (legs) {
    limb(pen, hip, legs[2], 0.34, mix(col(C.trousers), C.dark, 0.2))
    limb(pen, legs[2], legs[3], 0.28, mix(col(C.trousers), C.dark, 0.2))
    limb(pen, hip, legs[0], 0.36, col(C.trousers))
    limb(pen, legs[0], legs[1], 0.3, col(C.trousers))
    for (const ft of [legs[1], legs[3]]) ellipse(pen, [ft[0] + 0.1, ft[1] - 0.03], 0.2, 0.08, C.shoe)
  }
  // The torso: a big man in an undershirt, the belly forward.
  const hips = across(hip, 0.36)
  const bellyC: Pt = [hip[0] + ax * 0.4, hip[1] + ay * 0.4]
  const face = Math.cos(pose.look) >= 0 ? 1 : -1
  const belly: Pt = [bellyC[0] + face * 0.5 * Math.abs(ny) + nx * 0.05, bellyC[1] + 0.08]
  shape(pen, orderTorso(hips, shoulders, belly), col(C.shirt))
  // The undershirt's straps, the skin of his shoulders.
  shape(pen, [shoulders[0], shoulders[1], [shoulders[1][0], shoulders[1][1] + 0.22], [shoulders[0][0], shoulders[0][1] + 0.22]], col(C.skin))
  path(pen, [hips[1], [bellyC[0] - nx * 0.2, bellyC[1] - ny * 0.2]], col(C.shirtShade), 0.6)
  limb(pen, [hip[0] - nx * 0.38, hip[1] - ny * 0.38], [hip[0] + nx * 0.38, hip[1] + ny * 0.38], 0.12, col(C.trousers))
  // The neck and the head.
  limb(pen, neck, [head[0], head[1] + 0.2], 0.3, col(C.skin))
  drawHead(pen, head, pose, col)
  // The near arm.
  limb(pen, shoulders[0], arms[0], 0.23, col(C.skin))
  limb(pen, arms[0], arms[1], 0.21, col(C.skin))
  ellipse(pen, arms[1], 0.12, 0.12, col(C.skin))
  // The paper, in both hands.
  if (pose.paper > 0.05) {
    const [h1, h2] = [arms[1], arms[3]]
    const flakeDip = FLAKES.reduce((s, fl) => s + (t > fl ? 0.04 * Math.max(0, ring(t - fl, 5, 0.15)) : 0), 0)
    const c: Pt = [(h1[0] + h2[0]) / 2 + 0.05, (h1[1] + h2[1]) / 2 - 0.25 + flakeDip]
    const hw = 0.5 * pose.paper
    shape(pen, [[c[0] - hw * 0.4, c[1] - 0.48], [c[0] + hw * 0.5, c[1] - 0.52], [c[0] + hw * 0.55, c[1] + 0.42], [c[0] - hw * 0.4, c[1] + 0.45]], C.news)
    for (let i = 0; i < 6; i++) line(pen, [c[0] - hw * 0.3, c[1] - 0.35 + i * 0.13], [c[0] + hw * 0.42, c[1] - 0.37 + i * 0.13], C.newsLine, 0.45)
    rect(pen, c[0] - hw * 0.3, c[1] - 0.44, c[0] + hw * 0.4, c[1] - 0.38, C.newsLine)
    // The flakes that have come down on it.
    FLAKES.forEach((fl, i) => {
      if (t >= fl) ellipse(pen, [c[0] - 0.15 + i * 0.14, c[1] - 0.5 + 0.03 * i], 0.06, 0.03, C.plasterHi)
    })
  }
}

function orderTorso(hips: [Pt, Pt], sh: [Pt, Pt], belly: Pt): Pt[] {
  // hips[0], belly, shoulders[0] on one side; hips[1], shoulders[1] on the other: pick the belly's side.
  const d0 = Math.hypot(belly[0] - hips[0][0], belly[1] - hips[0][1])
  const d1 = Math.hypot(belly[0] - hips[1][0], belly[1] - hips[1][1])
  return d0 < d1 ? [hips[1], hips[0], belly, sh[0], sh[1]] : [hips[0], hips[1], belly, sh[1], sh[0]]
}

function drawHead(pen: Pen, c: Pt, pose: Pose, col: (h: string) => string): void {
  const r = HEAD_R
  const dir: Pt = [Math.cos(pose.look), Math.sin(pose.look)]
  const side = dir[0] >= 0 ? 1 : -1
  // The back of his head's dark fringe, the bald dome.
  ellipse(pen, c, r, r * 1.02, col(C.skin))
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.fillStyle = rgba(pen, C.hair, 1)
  ctx.beginPath()
  const back = Math.atan2(-dir[1], -dir[0])
  ctx.arc(c[0] * k, c[1] * k, r * k, back - 1.1, back + 1.1)
  ctx.arc(c[0] * k, c[1] * k, r * 0.72 * k, back + 0.9, back - 0.9, true)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // The ear, the eye under a heavy brow, the nose, the mouth.
  ellipse(pen, [c[0] - side * 0.06, c[1] + 0.04], 0.07, 0.1, col(C.skinDark))
  const eye: Pt = [c[0] + dir[0] * 0.2 - dir[1] * 0.08 * side, c[1] + dir[1] * 0.2 - 0.05]
  const browTilt = pose.rage * 0.06
  line(pen, [eye[0] - 0.09, eye[1] - 0.07 - browTilt * side], [eye[0] + 0.1, eye[1] - 0.08 + browTilt * side], C.hair, 1.6)
  ellipse(pen, eye, 0.03, 0.03, C.dark)
  const nose: Pt = [c[0] + dir[0] * 0.36, c[1] + dir[1] * 0.36 + 0.06]
  ellipse(pen, nose, 0.08, 0.07, col(C.skinDark))
  const mouth: Pt = [c[0] + dir[0] * 0.26 + 0.0, c[1] + 0.2 + dir[1] * 0.2]
  if (pose.rage > 0.3) ellipse(pen, mouth, 0.06 + 0.04 * pose.rage, 0.05 + 0.05 * pose.rage, C.mouth)
  else line(pen, [mouth[0] - 0.06, mouth[1]], [mouth[0] + 0.06, mouth[1] + 0.01], C.skinDark, 0.9)
  // Stubble.
  ellipse(pen, [c[0] + dir[0] * 0.18, c[1] + 0.24], 0.17, 0.08, mix(col(C.skin), C.hair, 0.25))
}

/* ------------------------------------------------------------------ plaster, boards, dust */

interface Bit {
  p: Pt
  v: Pt
  w: number
  h: number
  spin: number
  col: string
  floor: number
}
const BITS: Bit[] = Array.from({ length: 22 }, (_, i) => {
  const board = i < 7
  const side = hash(i, 1, 30) - 0.5
  const x = TUB_X + side * 2 * TUB_HALF
  const vx = side * 4 + (hash(i, 2, 30) - 0.5) * 1.5
  const xl = Math.max(WALL_L[1] + 0.1, Math.min(WALL_R[0] - 0.1, x + vx * 0.85))
  return {
    p: [x, F_MARTY + 0.25] as Pt,
    v: [vx, -1.5 + hash(i, 3, 30) * 2] as Pt,
    w: board ? 0.5 + hash(i, 4, 30) * 0.4 : 0.06 + hash(i, 4, 30) * 0.12,
    h: board ? 0.07 : 0.05 + hash(i, 5, 30) * 0.08,
    spin: (hash(i, 6, 30) - 0.5) * 14,
    col: board ? C.board : i % 3 ? C.plasterDark : C.plaster,
    floor: xl > M_BED[0] && xl < M_BED[1] ? M_MATTRESS + COLLAPSE - 0.02 - hash(i, 7, 30) * 0.1 : F_MISH - 0.02 - (board ? 0.03 : 0),
  }
})

export function drawDebris(pen: Pen, t: number): void {
  const s = t - BREAK
  if (s < 0) return
  drawBoard(pen, t)
  for (const b of BITS) {
    const fall = (b.floor - b.p[1] - 0.04)
    const T = (-b.v[1] + Math.sqrt(b.v[1] * b.v[1] + 2 * G * fall)) / G
    const u = Math.min(s, T)
    let x = b.p[0] + b.v[0] * u
    x = Math.max(WALL_L[1] + 0.1, Math.min(WALL_R[0] - 0.1, x))
    const y = b.p[1] + b.v[1] * u + 0.5 * G * u * u
    const ang = s >= T ? (hash(b.w * 100, 8) - 0.5) * 0.5 : b.spin * u
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const pts: Pt[] = [[-b.w / 2, -b.h / 2], [b.w / 2, -b.h / 2], [b.w / 2, b.h / 2], [-b.w / 2, b.h / 2]].map(([px, py]) => [x + px * ca - py * sa, y + px * sa + py * ca])
    shape(pen, pts, b.col)
  }
  // The burst at the ceiling, and the cloud where it lands; the plaster heaped on him.
  const puff = (c: Pt, since: number, r0: number, r1: number, life: number, a: number) => {
    if (since < 0 || since > life) return
    const u = since / life
    const r = r0 + (r1 - r0) * (1 - (1 - u) * (1 - u))
    glow(pen, c, r, C.plasterHi, a * (1 - u))
  }
  puff([TUB_X, F_MARTY + 0.45], s, 0.6, 2.6, 1.8, 0.75)
  puff([TUB_X - 0.6, F_MISH - 0.9], t - LAND, 0.8, 3.4, 2.6, 0.85)
  // Water thrown out of the tub as it lands.
  const ws = t - LAND
  if (ws > 0 && ws < 1.3) {
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1
      const vx = side * (1.2 + hash(i, 1, 40) * 2.6)
      const vy = -2.5 - hash(i, 2, 40) * 2.5
      const x = TUB_X + side * 1.1 + vx * ws
      const y = F_MARTY + LANDED + COLLAPSE - 1.1 + vy * ws + 0.5 * G * ws * ws
      if (y > F_MISH) continue
      ellipse(pen, [x, y], 0.04, 0.055, C.water)
    }
  }
}

/** The board left hanging at the hole's right edge: it lets go, turns as it falls, and smacks the floor. */
export const BOARD_FALL = 0.775
function drawBoard(pen: Pen, t: number): void {
  const s = t - (BOARD_DROP - BOARD_FALL)
  if (s < 0) return
  const u = Math.min(1, s / BOARD_FALL)
  const c0: Pt = [6.77, F_MARTY + 0.57]
  const c1: Pt = [7.17, F_MISH - 0.05]
  const c: Pt = [c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u * u]
  const ang = 1.15 * (1 - u) + (u >= 1 ? 0.06 : 0)
  const h = 0.38
  limb(pen, [c[0] - Math.cos(ang) * h, c[1] - Math.sin(ang) * h], [c[0] + Math.cos(ang) * h, c[1] + Math.sin(ang) * h], 0.07, C.board)
  const m = flash(t - BOARD_DROP, 0.12)
  if (t >= BOARD_DROP && m > 0.02) for (const a of [-1, -0.4, 0.4, 1]) line(pen, [c1[0] + 0.45 * Math.sin(a), c1[1] - 0.1 - 0.1 * Math.cos(a)], [c1[0] + 0.62 * Math.sin(a), c1[1] - 0.1 - 0.3 * Math.cos(a)], C.plasterHi, 0.8 * m)
}

/** The plaster heaped over him, and thrown off as he comes up. */
export function drawHeap(pen: Pen, t: number): void {
  const b = buried(t)
  if (b <= 0) return
  const hip: Pt = [4.05, M_MATTRESS + COLLAPSE]
  const up = t > RISE_UP ? (t - RISE_UP) * 4 : 0
  // A mound of broken plaster and lath over him, angular, a board across it; it flies up as he bursts out.
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.globalAlpha = b
  const mound: Pt[] = [[hip[0] - 0.75, hip[1] + 0.12], [hip[0] - 0.68, hip[1] - 0.55], [hip[0] - 0.42, hip[1] - 0.95], [hip[0] - 0.12, hip[1] - 1.35], [hip[0] + 0.28, hip[1] - 1.62], [hip[0] + 0.62, hip[1] - 1.3], [hip[0] + 0.85, hip[1] - 0.9], [hip[0] + 1.0, hip[1] - 0.35], [hip[0] + 1.1, hip[1] + 0.12]]
  shape(pen, mound.map(([x, y]) => [x, y - up * 0.3] as Pt), C.plasterDark)
  for (let i = 0; i < 14; i++) {
    const a0 = hash(i, 1, 70)
    const cx = hip[0] - 0.6 + a0 * 1.6
    const top = hip[1] - 1.5 + Math.abs(cx - (hip[0] + 0.25)) * 1.3
    const cy = top + 0.1 + hash(i, 2, 70) * 0.5 - up * (0.4 + hash(i, 5, 70))
    const r = 0.08 + hash(i, 3, 70) * 0.12
    const rot = hash(i, 4, 70) * 3
    const pts: Pt[] = [0, 1, 2, 3].map((j) => [cx + Math.cos(rot + j * 1.7) * r * (j % 2 ? 0.7 : 1.1), cy + Math.sin(rot + j * 1.7) * r * (j % 2 ? 0.7 : 1.1)])
    shape(pen, pts, i % 3 ? C.plaster : C.plasterHi)
    if (i % 4 === 0) path(pen, [pts[0], pts[1]], C.plasterDark, 0.5)
  }
  limb(pen, [hip[0] - 0.55, hip[1] - 0.7 - up], [hip[0] + 0.75, hip[1] - 1.2 - up * 1.3], 0.07, C.board)
  limb(pen, [hip[0] - 0.2, hip[1] - 1.25 - up], [hip[0] + 0.55, hip[1] - 0.85 - up], 0.04, mix(C.board, C.plaster, 0.4))
  ctx.restore()
  const s = t - RISE_UP
  if (s > 0) glow(pen, [hip[0] + 0.2, hip[1] - 1.4], 1.0 + s * 3, C.plasterHi, 0.6 * (1 - b))
}

/** A flake of the ceiling on its way down to the paper. */
export function drawFlakes(pen: Pen, t: number): void {
  FLAKES.forEach((fl, i) => {
    const drop = 1.9
    const T = Math.sqrt((2 * drop) / G_LOW)
    const s = t - (fl - T)
    if (s < 0 || s > T) return
    const y = ceilOf(F_MISH) + 0.5 * G_LOW * s * s
    const x = 4.55 + i * 0.14 + 0.12 * Math.sin(s * 7 + i)
    ellipse(pen, [x, y], 0.06, 0.03 + 0.02 * Math.abs(Math.sin(s * 9)), C.plasterHi)
  })
}

/** The man's fist and the boards ring: the jolt of his stamp on the floor as he stands and lunges. */
export function drawStamp(pen: Pen, t: number): void {
  for (const k of [STANDS, CLAP, ...POUNDS]) {
    const s = t - k
    if (s < 0 || s > 0.4) continue
    const m = flash(s, 0.12)
    const c: Pt = k === CLAP ? [8.28, 2.72] : k === STANDS ? [6.1, F_MISH - 0.02] : [RAIL_HIT[0], RAIL_HIT[1] + 0.05]
    // The rail he pounds shivers along its length.
    if (k !== CLAP && k !== STANDS) line(pen, [LANDING[0] + 0.1, L_MISH - 1.0 + 0.04 * ring(s, 12, 0.12)], [LANDING[1] - 0.1, L_MISH - 1.0 - 0.04 * ring(s, 12, 0.12)], '#9FB4B0', 1.0 * m)
    for (const a of [-1, -0.4, 0.4, 1]) line(pen, [c[0] + 0.18 * Math.sin(a), c[1] - 0.18 * Math.cos(a)], [c[0] + 0.36 * Math.sin(a), c[1] - 0.36 * Math.cos(a)], C.plasterHi, 0.8 * m)
  }
}

/** The outer wall again, over him where he leans out of the window: only his top half goes through. */
export function drawWallOver(pen: Pen, f: Frame): void {
  const s = sillOf(F_MISH)
  const h = headOf(F_MISH)
  brick(pen, WALL_R[0], s, WALL_R[1], F_MISH + SLAB_T, f)
  brick(pen, WALL_R[0], ceilOf(F_MISH) - 0.2, WALL_R[1], h, f)
  rect(pen, WALL_R[0] - 0.1, s, WALL_R[1] + 0.12, s + 0.08, mix(C.plaster, C.brick, 0.5))
  rect(pen, WALL_R[0], h - 0.18, WALL_R[1], h, mix(C.brick, C.mortar, 0.5))
}
const SLAB_T = 0.47

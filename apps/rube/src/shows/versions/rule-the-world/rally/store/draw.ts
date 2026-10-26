import type { Pt } from '../../../../../parts'
import { motes, shade, sway } from '../depth'
import { BEAT } from '../music'
import { hash, lastOf } from '../kit'
import { ctxOf, ease, ellipse, fillWith, line, mix, path, rect, rgba, ring, shape, vgrad, type Pen } from '../pen'
import {
  BANG,
  CLOCK_SIX,
  TICKET_UP,
  TICKET_IN,
  BAT_AT,
  BAT_HINGE,
  BENCH,
  BENCH_TOP,
  BOLTS,
  BOX_H,
  BOX_ROWS,
  BOX_W,
  BOX_X0,
  BOX_X1,
  BULB,
  BULB_ON,
  CEIL,
  COUNTER,
  COUNTER_TOP,
  CURTAIN,
  DEVICE,
  DEVICE_LAND,
  DEVICE_TOP,
  DIAL,
  DIAL_R,
  DOOR_W,
  FIRE,
  FLOOR,
  FOOT_END,
  FOOT_HINGE,
  FOOTREST,
  FRONT,
  HANDLE,
  HEAD,
  HINGE_X,
  HORN0,
  HORN1,
  HORN_LAND,
  INNER,
  INTO,
  LADDER_GO,
  LADDER_HALF,
  LAMP_X,
  LAMP_Y,
  LAMPS_ON,
  LEFT_STACK,
  LIP,
  ONTO,
  PART1,
  PART2,
  PLINTH,
  POPS,
  POST,
  RAIL,
  RAIL_Y,
  RIGHT_STACK,
  RIGHT_TOP,
  RUNG,
  RUNGS_AT,
  SAFE,
  SAFE_FEET,
  SAFE_TOP,
  SHELF,
  SKIPS,
  SLIDER0,
  SLIDER1,
  SLIDER_STOP,
  STACK,
  STEP,
  STEP_BOX,
  STEP_TOP,
  STEPS_AT,
  STOCK_BULB,
  STOOL,
  STOOL_SEAT,
  T1,
  TILL,
  TRANSOM,
  WELCOME,
  WIN,
  boxTop,
  boxX,
  dialTurn,
  doorDeg,
  doorX,
  handleTurn,
  ladderX,
  officeDoor,
  rungY,
  WAY,
  GATES,
  MURRAY_STEPS,
  fenceDrop,
  murrayNear,
  stockSway,
  wheelTurn,
} from './geo'
import { drawOutside, LAMP_POST, windowSeen } from './street'
import { catPart } from './cat'
import { drawRadiator } from './heat'
import { drawYard, elRumble } from './yard'

/**
 * Uncle Murray's shoe store, before it opens: warm tungsten browns and creams in deep shadow, one cold blue window on
 * the street. The store is dark but for the bulb over the counter until the bass comes in and the lamps click on down
 * its length; the stockroom has its own bare bulb (she is there already); the office is dark but for the light through
 * its door, which, when the safe swings open, falls on the bills.
 */

export const C = {
  bg: '#1E1611',
  wall: '#3B2C21',
  wallDark: '#2A1F17',
  wood: '#5A3E2A',
  woodDark: '#3A281B',
  woodLight: '#8A6444',
  oak: '#9C7650',
  oakLight: '#C29A6C',
  oakDark: '#6A4C32',
  ceil: '#2C2219',
  tin: '#3A2D22',
  tinLine: '#22191312',
  floor: '#4A3424',
  floorLine: '#2E2017',
  floorLight: '#6A4C34',
  boxes: ['#B8946A', '#A8845E', '#D8C7A4', '#CDB892', '#8E8780', '#A39A8C', '#C4A47A', '#7E6A56'],
  label: '#EFE4CC',
  slot: '#140E0A',
  brass: '#C9A458',
  brassDark: '#7E6230',
  chrome: '#BDB8AC',
  chromeDark: '#6E6A62',
  iron: '#16110D',
  lampShade: '#2F4A3A',
  lampIn: '#F3E7C8',
  lamp: '#FFD48A',
  bulb: '#FFE2A6',
  red: '#B3362C',
  redDark: '#6E1F1A',
  night: '#16233A',
  dawn: '#6B7F8E',
  street: '#24303A',
  across: '#1B242C',
  sodium: '#D9B66A',
  cold: '#7FA6C8',
  glass: '#2B3A48',
  velvet: '#5E2420',
  velvetDark: '#3A1512',
  velvetLight: '#7A3029',
  plaster: '#4A4436',
  plasterDark: '#36322A',
  shelfSteel: '#4E4E48',
  carton: '#9A7B54',
  cartonDark: '#6E5638',
  office: '#33372B',
  officeDark: '#24271F',
  wainscot: '#4A3424',
  safe: '#171515',
  safeHi: '#3A3634',
  safeEdge: '#0B0A0A',
  gilt: '#C8A24A',
  giltDark: '#8A6A2A',
  lining: '#5A2A22',
  liningDark: '#3A1A16',
  bill: '#8C9A78',
  billDark: '#5E6A50',
  billLight: '#B4C09C',
  band: '#E6DCC0',
  ticket: '#EADFC2',
  ticketDark: '#B8A47A',
  green: '#2E4A38',
  greenLight: '#4E7A5A',
  shade: '#0C0907',
  oxblood: '#5A2420',
}

type F = { x0: number; y0: number; x1: number; y1: number }

/* ------------------------------------------------------------------ light */

/** How lit the store is at `x`, 0 (dark) to 1, at show time `t`. */
export function lightAt(x: number, t: number): number {
  let L = 0
  // The window: the street's cold light.
  const wd = x < WIN[0] ? WIN[0] - x : x > WIN[2] ? x - WIN[2] : 0
  L += 0.55 * Math.exp(-wd / 0.9)
  // The bulb over the counter.
  const bulb = bulbOn(t)
  L += 0.7 * bulb * Math.exp(-(((x - BULB[0]) / 1.9) ** 2))
  // The lamps along the store.
  LAMP_X.forEach((lx, i) => {
    const on = lampOn(i, t)
    if (on > 0) L += 0.85 * on * Math.exp(-(((x - lx - lampFoot(lampSway(i, t)) * 0.5) / 2.1) ** 2))
  })
  // The stockroom's bulb: on before he comes.
  if (x > PART1[0] - 0.3 && x < PART2[1] + 0.2) L += 0.72 * Math.exp(-(((x - STOCK_BULB[0] - stockSway(t)) / 3.2) ** 2))
  // The office: dark, but for its door.
  if (x > PART2[0]) {
    const d = officeDoor(t)
    // Murray in the doorway takes some of its light.
    L += 0.22 + 0.42 * d * (1 - 0.3 * murrayNear(t)) * Math.exp(-Math.max(0, x - PART2[1]) / 3.2)
    const s = ease((doorDeg(t) - 20) / 100)
    L += 0.18 * s * Math.exp(-(((x - (SAFE[0] + SAFE[1]) / 2) / 1.4) ** 2))
    // His desk lamp, left on all night.
    L += 0.26 * Math.exp(-(((x - DESK_LAMP) / 1.15) ** 2))
  } else {
    // The office's light onto the stockroom beside its door, falling away: a little through the gaps round the shut
    // door, and once it is open, out through the doorway and further.
    const d = officeDoor(t)
    L += (0.22 + 0.42 * d * (1 - 0.3 * murrayNear(t))) * Math.exp(-(PART2[0] - x) / (0.4 + 0.5 * d))
  }
  return Math.min(1, L)
}
export function bulbOn(t: number): number {
  if (t < BULB_ON) return 0
  const u = t - BULB_ON
  if (u > 0.4) return 1
  // It catches with a stutter.
  return u < 0.05 ? 1 : u < 0.12 ? 0.25 : u < 0.18 ? 0.9 : u < 0.24 ? 0.45 : 1
}
/**
 * How far a store lamp's shade is swung off the plumb (cells): a slow swing after it clicks on, dying away, the
 * draught's small sway all the while, and once the fan is spun up with the lamps, its draught keeping them going.
 */
export function lampSway(i: number, t: number): number {
  const fan = ease((t - FIRE) / 3)
  return 0.032 * ring(t - LAMPS_ON[i], 0.85, 1.6) + 0.007 * sway(t, i + 1, 3.6) + 0.022 * fan * sway(t, i + 11, 2.7)
}
/** How far the foot of a lamp's light swings for a swing `sw` of its shade: further, as the cord is short and the floor far. */
export const lampFoot = (sw: number): number => (sw * (FLOOR + 0.3 - CEIL)) / (LAMP_Y - CEIL)
/** Murray's desk lamp, on his desk in the office. */
export const DESK_LAMP = 27.95
export function lampOn(i: number, t: number): number {
  const t0 = LAMPS_ON[i]
  if (t < t0) return 0
  const u = t - t0
  // It catches: on, a dip as the filament settles, and up to full.
  return u < 0.06 ? 1 : u < 0.12 ? 0.6 : Math.min(1, 0.85 + u)
}

/** The dark laid over everything the lights do not reach, then the lights themselves. */
export function drawShade(pen: Pen, t: number, f: F): void {
  const { k } = pen
  const ctx = ctxOf(pen.p)
  const g = ctx.createLinearGradient(f.x0 * k, 0, f.x1 * k, 0)
  const n = 48
  for (let i = 0; i <= n; i++) {
    const x = f.x0 + ((f.x1 - f.x0) * i) / n
    const a = 0.88 * (1 - lightAt(x, t))
    g.addColorStop(i / n, rgba(pen, C.shade, a))
  }
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  ctx.restore()
  // Up under the ceiling it is darker everywhere.
  vgrad(pen, f.x0, Math.min(f.y0, CEIL - 2), f.x1, CEIL + 1.6, [
    [0, C.shade, 0.55],
    [0.6, C.shade, 0.35],
    [1, C.shade, 0],
  ])
}

/**
 * A pool of light laid on a surface (the counter's top, the floor under a lamp): a soft ellipse of the light's colour
 * over what is there, not added to it, and flat, so it lies on the thing lit rather than hanging in the air.
 */
const pool = shade

/**
 * The light the store's lamps throw on things, over the dark: each source drawn as the lit thing itself (the bulb, the
 * mouth of a shade) with its light on the counter, the wall and the floor round it, and no glow in the air.
 */
export function drawLights(pen: Pen, t: number): void {
  // The window's cold light on the floor before it, and across the counter's front, fading away from the glass.
  const dawn = Math.min(1, t / T1)
  pool(pen, [WIN[0] - 0.3, FLOOR + 0.16], 1.8, 0.36, C.cold, 0.12 + 0.08 * dawn)
  {
    const ctx = ctxOf(pen.p)
    const { k } = pen
    const g = ctx.createLinearGradient(COUNTER[0] * k, 0, COUNTER[1] * k, 0)
    g.addColorStop(0, rgba(pen, C.cold, 0.1 + 0.06 * dawn))
    g.addColorStop(1, rgba(pen, C.cold, 0.02))
    fillWith(pen, [[COUNTER[0], COUNTER_TOP + 0.1], [COUNTER[1], COUNTER_TOP + 0.1], [COUNTER[1], FLOOR], [COUNTER[0], FLOOR]], g)
  }
  // The bulb over the counter: lit, and its light down on the counter's top and front.
  const b = bulbOn(t)
  if (b > 0) {
    pool(pen, [BULB[0], COUNTER_TOP + 0.04], 1.6, 0.42, C.bulb, 0.2 * b)
    litBulb(pen, BULB, b)
  }
  // The lamps: each a cone of light down the wall onto the floor, faint, and the lit mouth of its shade.
  LAMP_X.forEach((lx, i) => {
    const on = lampOn(i, t)
    if (on <= 0) return
    const ctx = ctxOf(pen.p)
    const { k } = pen
    // The cone swings with the shade, its foot further than its head.
    const sw = lampSway(i, t)
    const hx = lx + sw
    const fx = lx + lampFoot(sw)
    const g = ctx.createLinearGradient(0, LAMP_Y * k, 0, (FLOOR + 0.3) * k)
    g.addColorStop(0, rgba(pen, C.lamp, 0.1 * on))
    g.addColorStop(1, rgba(pen, C.lamp, 0.015 * on))
    fillWith(pen, [[hx - 0.25, LAMP_Y + 0.05], [hx + 0.25, LAMP_Y + 0.05], [fx + 1.5, FLOOR + 0.3], [fx - 1.5, FLOOR + 0.3]], g)
    pool(pen, [fx, FLOOR + 0.12], 1.5, 0.55, C.lamp, 0.14 * on)
    ellipse(pen, [hx, LAMP_Y + 0.04], 0.2, 0.05, mix(C.lampIn, '#FFFFFF', 0.4))
  })
  // The stockroom's bulb, swinging: lit (its light on the room is the dark's lifting round it, in `lightAt`).
  litBulb(pen, [STOCK_BULB[0] + stockSway(t), STOCK_BULB[1]], 1)
  // The office: the light through its door, along the floor and up the safe.
  const d = officeDoor(t)
  if (d > 0) {
    const ctx = ctxOf(pen.p)
    const { k } = pen
    // Thrown by the stockroom's bulb behind it, so as the bulb swings the light's far end swings the other way.
    const reach = 4.2 - 3.2 * stockSway(t)
    const g = ctx.createLinearGradient(PART2[1] * k, 0, (PART2[1] + reach) * k, 0)
    g.addColorStop(0, rgba(pen, C.lamp, 0.22 * d))
    g.addColorStop(1, rgba(pen, C.lamp, 0))
    fillWith(pen, [[PART2[1] - 0.1, FLOOR], [PART2[1] + reach, FLOOR], [PART2[1] + reach + 0.4 * stockSway(t), FLOOR + 0.9], [PART2[1] - 0.1, FLOOR + 0.25]], g)
  }
  doorLight(pen, t)
  // The safe open: the light falls in on the bills and the lining, inside its walls, and on the floor before it.
  const s = ease((doorDeg(t) - 30) / 110)
  if (s > 0) {
    vgrad(pen, INNER[0], INNER[1], INNER[2], INNER[3], [
      [0, C.lamp, 0.05 * s],
      [0.6, C.lamp, 0.14 * s],
      [1, C.lamp, 0.2 * s],
    ])
    pool(pen, [(INNER[0] + INNER[2]) / 2, FLOOR + 0.05], 1.3, 0.4, C.lamp, 0.1 * s)
  }
}

/** A bare bulb, lit: the glass pale and warm, the filament's brighter heart in it. `b` is how lit (0 to 1). */
function litBulb(pen: Pen, c: Pt, b: number): void {
  ellipse(pen, c, 0.065, 0.085, mix('#8A8068', '#FFF2CC', b))
  if (b > 0.5) ellipse(pen, [c[0], c[1] + 0.01], 0.032, 0.04, '#FFFBEC')
}

/**
 * Murray's office door from the stockroom side: his desk lamp is on behind it, so a line of light shows round the
 * shut door and under it, brighter as Marty comes; on "Welcome" it is knocked open and the light comes out through
 * the doorway and across the stockroom's floor.
 */
function doorLight(pen: Pen, t: number): void {
  const x0 = PART2[0] + POST
  const x1 = PART2[1] - POST
  const d = officeDoor(t)
  const near = ease((t - (WELCOME - 2.2)) / 2.0)
  const shut = 1 - d
  // The line round the shut door.
  if (shut > 0.02) {
    const a = (0.45 + 0.4 * near) * shut
    const w = (x1 - x0) * Math.cos(d * 1.35)
    const left = x1 - w
    rect(pen, left - 0.02, HEAD + 0.02, left + 0.012, FLOOR - 0.02, rgba(pen, C.lamp, a) as unknown as string)
    rect(pen, left, FLOOR - 0.025, x1, FLOOR, rgba(pen, C.lamp, a) as unknown as string)
    rect(pen, left, HEAD, x1, HEAD + 0.025, rgba(pen, C.lamp, a * 0.7) as unknown as string)
    // What comes under it, on the stockroom's boards.
    pool(pen, [(x0 + x1) / 2, FLOOR + 0.06], 0.9 + 0.4 * near, 0.22, C.lamp, 0.22 * a)
  }
  if (d > 0) {
    // The opening, lit from inside, beside the leaf.
    const w = (x1 - x0) * Math.cos(d * 1.35)
    const left = x1 - w
    const ctx = ctxOf(pen.p)
    const { k } = pen
    const g = ctx.createLinearGradient(0, HEAD * k, 0, FLOOR * k)
    g.addColorStop(0, rgba(pen, C.lamp, 0.3 * d))
    g.addColorStop(1, rgba(pen, C.lamp, 0.55 * d))
    fillWith(pen, [[x0, HEAD], [left, HEAD], [left, FLOOR], [x0, FLOOR]], g)
    // Out across the stockroom's floor, and a little up the wall beside the door.
    pool(pen, [x0 - 0.6, FLOOR + 0.2], 2.0, 0.6, C.lamp, 0.16 * d)
  }
}


/* ------------------------------------------------------------------ the room */

export function drawRoom(pen: Pen, t: number, f: F & { cx: number; cy: number }): void {
  rect(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, C.bg)
  drawStreet(pen, t, f)
  drawCeiling(pen, f)
  drawFloor(pen, f)
  drawBoxWall(pen, f)
  drawStock(pen, t, f)
  drawOffice(pen, t, f)
  drawPartition(pen, PART1, false)
  drawPartition(pen, PART2, true)
  drawRail(pen)
  drawCounter(pen)
  drawChairs(pen)
}

function drawStreet(pen: Pen, t: number, f: F & { cx: number; cy: number }): void {
  const dawn = Math.min(1, t / T1)
  const [x0, y0, x1, y1] = WIN
  // The front wall, the window in it behind the counter.
  rect(pen, f.x0 - 1, CEIL, FRONT, FLOOR, C.wallDark)
  // Outside, through the glass, in its layers (`street.ts`).
  if (windowSeen(f)) {
    const { k } = pen
    const ctx = ctxOf(pen.p)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    ctx.clip()
    drawOutside(pen, t, f)
    ctx.restore()
  }
  // The street lamp, on the pavement just outside.
  line(pen, [LAMP_POST, y1 - 0.3], [LAMP_POST, -1.65], '#0F151B', 1.6)
  shape(pen, [[LAMP_POST - 0.17, -1.62], [LAMP_POST + 0.17, -1.62], [LAMP_POST + 0.07, -1.8], [LAMP_POST - 0.07, -1.8]], '#0F151B')
  ellipse(pen, [LAMP_POST, -1.58], 0.1, 0.045, mix(C.sodium, '#BFC2B0', dawn * 0.6))
  // The display in the window: a pair of shoes on a riser, at the end the counter does not hide (the cat sits by them).
  rect(pen, x0 + 0.05, y1 - 0.15, x0 + 1.05, y1, C.woodDark)
  shoe(pen, [x0 + 0.08, y1 - 0.15], 0.36, '#3A2014')
  shoe(pen, [x0 + 0.45, y1 - 0.15], 0.36, '#6A4428')
  // Frost along the foot of the glass, the street's cold coming through it.
  vgrad(pen, x0, y1 - 0.32, x1, y1, [
    [0, '#C8D4E0', 0],
    [1, '#C8D4E0', 0.13],
  ])
  // The glass's frame: a transom over the big panes, its bar, its mullions; a blind part way down.
  const tr = y0 + 0.62
  rect(pen, x0, y0, x1, y0 + 0.4, mix('#4A4030', '#6A6250', dawn * 0.4))
  for (let y = y0 + 0.08; y < y0 + 0.4; y += 0.08) line(pen, [x0, y], [x1, y], '#3A3226', 0.4)
  ellipse(pen, [(x0 + x1) / 2, y0 + 0.45], 0.04, 0.04, C.brass)
  rect(pen, x0 - 0.1, y0 - 0.12, x1 + 0.1, y0, C.wood)
  rect(pen, x0 - 0.1, y1, x1 + 0.1, y1 + 0.1, C.wood)
  rect(pen, x0 - 0.1, y0, x0, y1, C.wood)
  rect(pen, x1, y0, x1 + 0.1, y1, C.wood)
  rect(pen, x0, tr, x1, tr + 0.07, C.wood)
  for (let x = x0 + (x1 - x0) / 6; x < x1 - 0.1; x += (x1 - x0) / 6) rect(pen, x - 0.02, y0, x + 0.02, tr, C.wood)
  rect(pen, (x0 + x1) / 2 - 0.04, tr, (x0 + x1) / 2 + 0.04, y1, C.wood)
  // Under it, the riser down to the floor.
  rect(pen, f.x0 - 1, y1 + 0.1, FRONT, FLOOR, C.wood)
  // Above it, up the front wall: a shelf of the season's shoes, and the ceiling fan.
  if (f.y0 < y0 - 0.2) {
    const sy = y0 - 0.55
    rect(pen, x0 - 0.05, sy, x1 + 0.05, sy + 0.05, C.woodLight)
    for (const bx of [x0 + 0.2, (x0 + x1) / 2, x1 - 0.2]) shape(pen, [[bx - 0.03, sy + 0.05], [bx + 0.03, sy + 0.05], [bx, sy + 0.18]], C.woodDark)
    const pairs = ['#2A1810', '#6A4428', '#4A1A16', '#8A6A4A', '#1E1A18', '#5A3A22']
    pairs.forEach((col, i) => shoe(pen, [x0 + 0.12 + i * 0.5 + (i % 2) * -0.08, sy], 0.32, col))
    drawFan(pen, t)
  }
}

/** The ceiling fan over the front of the store: turning lazily in the draught, then spun up when the lamps go on. */
const FAN: Pt = [-0.2, CEIL + 0.42]
function drawFan(pen: Pen, t: number): void {
  // Its angle: a lazy drift, and from the bass on, the switch thrown with the lamps, winding up to speed.
  const lazy = 0.35 * t
  const on = Math.max(0, t - FIRE)
  const th = lazy + 2.6 * (on - 2.2 * (1 - Math.exp(-on / 2.2)))
  const [hx, hy] = FAN
  line(pen, [hx, CEIL], [hx, hy - 0.06], C.iron, 1)
  const blade = (a: number) => {
    const c = Math.cos(a)
    const s = Math.sin(a)
    const tip = hx + c * 0.62
    const w = 0.02 + 0.03 * Math.abs(s)
    shape(pen, [[hx + c * 0.1, hy - 0.01], [tip, hy + 0.02 - w], [tip, hy + 0.02 + w], [hx + c * 0.1, hy + 0.02]], s < 0 ? C.woodDark : C.wood)
  }
  const angles = [0, 1, 2, 3].map((i) => th + (i * Math.PI) / 2)
  for (const a of angles) if (Math.sin(a) < 0) blade(a)
  ellipse(pen, [hx, hy], 0.13, 0.07, C.brassDark)
  ellipse(pen, [hx, hy - 0.03], 0.09, 0.035, C.brass)
  for (const a of angles) if (Math.sin(a) >= 0) blade(a)
}

/** A shoe in profile, toe to the right, its sole on `at`. */
function shoe(pen: Pen, at: Pt, len: number, col: string): void {
  const [x, y] = at
  const l = len
  shape(pen, [[x, y], [x + l, y], [x + l, y - l * 0.12], [x + l * 0.75, y - l * 0.24], [x + l * 0.42, y - l * 0.3], [x + l * 0.2, y - l * 0.42], [x + l * 0.02, y - l * 0.42], [x, y - l * 0.18]], col)
  rect(pen, x, y - 0.025, x + l * 0.25, y, '#120B07')
  line(pen, [x + l * 0.45, y - l * 0.28], [x + l * 0.7, y - l * 0.2], mix(col, '#FFFFFF', 0.25), 0.4)
}

function drawCeiling(pen: Pen, f: F): void {
  rect(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, CEIL, C.ceil)
  // Pressed tin: squares with a boss in each.
  const s = 0.5
  for (let x = Math.floor(f.x0 / s) * s; x < f.x1; x += s)
    for (let y = CEIL - s; y > f.y0 - s; y -= s) {
      rect(pen, x + 0.04, y + 0.04, x + s - 0.04, y + s - 0.04, C.tin)
      ellipse(pen, [x + s / 2, y + s / 2], 0.07, 0.07, C.ceil)
    }
  rect(pen, f.x0 - 1, CEIL - 0.12, f.x1 + 1, CEIL, C.woodDark)
  rect(pen, f.x0 - 1, CEIL - 0.04, f.x1 + 1, CEIL + 0.04, C.woodLight)
}

function drawFloor(pen: Pen, f: F): void {
  rect(pen, f.x0 - 1, FLOOR, f.x1 + 1, f.y1 + 1, C.floor)
  // The boards, coming toward us: lines further apart nearer.
  let y = FLOOR
  let gap = 0.08
  while (y < f.y1 + 1) {
    line(pen, [f.x0 - 1, y], [f.x1 + 1, y], C.floorLine, 0.5)
    y += gap
    gap *= 1.35
  }
  for (let x = Math.floor(f.x0); x < f.x1 + 1; x += 1.3) line(pen, [x, FLOOR + 0.08], [x + 0.2, FLOOR + 0.4], C.floorLine, 0.4)
  line(pen, [f.x0 - 1, FLOOR], [f.x1 + 1, FLOOR], C.floorLight, 0.8)
}

const I0 = 6
const WALL0 = boxX(I0)

function drawBoxWall(pen: Pen, f: F): void {
  const xa = Math.max(WALL0, f.x0 - 0.5)
  const xb = Math.min(BOX_X1, f.x1 + 0.5)
  rect(pen, WALL0, CEIL, BOX_X1, FLOOR, C.slot)
  const i0 = Math.max(I0, Math.floor((xa - BOX_X0) / BOX_W))
  const i1 = Math.ceil((xb - BOX_X0) / BOX_W)
  for (let i = i0; i < i1; i++) {
    const x = boxX(i)
    if (x + BOX_W > BOX_X1 + 1e-6) break
    for (let j = 0; j < BOX_ROWS; j++) {
      const top = boxTop(j)
      if (top < CEIL) break
      if (top + BOX_H < f.y0 - 0.5 || top > f.y1 + 0.5) continue
      boxEnd(pen, x, top, i, j, 1)
    }
  }
  // The shelves' uprights and boards.
  for (let i = I0; boxX(i) <= BOX_X1 + 1e-6; i += 6) rect(pen, boxX(i) - 0.035, CEIL, boxX(i) + 0.035, FLOOR, C.woodDark)
  rect(pen, BOX_X1 - 0.04, CEIL, BOX_X1 + 0.04, FLOOR, C.woodDark)
  for (let j = 0; j <= BOX_ROWS; j += 4) rect(pen, WALL0, boxTop(j - 1) - 0.03, BOX_X1, boxTop(j - 1) + 0.02, C.wood)
  // The plinth.
  rect(pen, WALL0, PLINTH, BOX_X1, FLOOR, C.woodDark)
  rect(pen, WALL0, PLINTH, BOX_X1, PLINTH + 0.03, C.woodLight)
}

/** A box's colour: each bay of shelves (six across, four up) is one maker's stock, a box or two out of place. */
export function boxColor(i: number, j: number): string {
  const bay = Math.floor((i - I0) / 6)
  const tier = Math.floor(j / 4)
  let base = C.boxes[Math.floor(hash(bay, tier, 21) * C.boxes.length)]
  if (hash(i, j, 22) > 0.88) base = C.boxes[Math.floor(hash(i, j, 23) * C.boxes.length)]
  return mix(base, '#000000', 0.08 + 0.14 * hash(i, j, 24))
}

/** One box end in the wall: its colour, a blank label, a finger notch. `s` scales it about its middle (pulled out). */
export function boxEnd(pen: Pen, x: number, top: number, i: number, j: number, s: number): void {
  const col = boxColor(i, j)
  const cx = x + BOX_W / 2
  const cy = top + BOX_H / 2
  const hw = (BOX_W / 2 - 0.014) * s
  const hh = (BOX_H / 2 - 0.014) * s
  rect(pen, cx - hw, cy - hh, cx + hw, cy + hh, col)
  // The lid's edge.
  rect(pen, cx - hw, cy - hh, cx + hw, cy - hh + 0.07 * s, mix(col, '#000000', 0.16))
  // A blank label, small, the same place on every box of a bay.
  const lw = 0.12 * s
  const lx = cx + 0.03 * s
  rect(pen, lx, cy + 0.0 * s, lx + lw, cy + 0.07 * s, mix(C.label, col, 0.55))
}

function drawRail(pen: Pen): void {
  line(pen, [RAIL[0], RAIL_Y], [RAIL[1], RAIL_Y], C.brass, 1.4)
  for (let x = RAIL[0] + 0.2; x < RAIL[1]; x += 1.6) {
    rect(pen, x - 0.03, RAIL_Y - 0.12, x + 0.03, RAIL_Y, C.brassDark)
  }
  // The stop at its end.
  rect(pen, RAIL[1] - 0.04, RAIL_Y - 0.1, RAIL[1] + 0.08, RAIL_Y + 0.08, C.brassDark)
}

function drawCounter(pen: Pen): void {
  const [x0, x1] = COUNTER
  // The front: panels in dark wood, a brass kick rail.
  rect(pen, x0, COUNTER_TOP + 0.1, x1, FLOOR, C.wood)
  for (let x = x0 + 0.12; x < x1 - 0.3; x += 0.6) rect(pen, x, COUNTER_TOP + 0.25, x + 0.48, FLOOR - 0.2, C.woodDark)
  rect(pen, x0, FLOOR - 0.1, x1, FLOOR - 0.06, C.brass)
  // The top.
  rect(pen, x0 - 0.06, COUNTER_TOP, x1 + 0.06, COUNTER_TOP + 0.1, C.woodLight)
  line(pen, [x0 - 0.06, COUNTER_TOP], [x1 + 0.06, COUNTER_TOP], C.oakLight, 0.7)
  // The till: a cash register, a shape only.
  const [t0, t1] = TILL
  const b = COUNTER_TOP
  shape(pen, [[t0, b], [t1, b], [t1, b - 0.32], [t1 - 0.08, b - 0.4], [t0 + 0.04, b - 0.4], [t0, b - 0.22]], '#5E4A32', 0.4, C.iron)
  shape(pen, [[t0 + 0.03, b - 0.2], [t1 - 0.12, b - 0.36], [t1 - 0.05, b - 0.3], [t0 + 0.06, b - 0.1]], '#2E241A')
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ellipse(pen, [t0 + 0.1 + i * 0.075, b - 0.15 - j * 0.05 - i * 0.025], 0.017, 0.013, C.label)
  rect(pen, t0 + 0.12, b - 0.55, t1 - 0.08, b - 0.4, '#5E4A32', 0.4, C.iron)
  rect(pen, t0 + 0.17, b - 0.52, t1 - 0.13, b - 0.45, '#1A140E')
  rect(pen, t0, b - 0.06, t1, b, '#3A2C1E')
  ellipse(pen, [t1 + 0.04, b - 0.2], 0.03, 0.06, C.brass)
}

function drawChairs(pen: Pen): void {
  // The fitting chairs along the wall: a row of three, leather seats and wooden arms.
  for (let i = 0; i < 3; i++) {
    const x = 12.45 + i * 0.7
    rect(pen, x, -0.5, x + 0.62, 0.42, '#4A1A16')
    rect(pen, x + 0.06, -0.42, x + 0.56, 0.3, '#5E231D')
    rect(pen, x - 0.02, 0.36, x + 0.64, 0.55, '#4A1A16')
    rect(pen, x - 0.04, 0.3, x + 0.04, 1.42, C.woodDark)
    rect(pen, x + 0.58, 0.3, x + 0.66, 1.42, C.woodDark)
    rect(pen, x - 0.05, 0.28, x + 0.08, 0.34, C.woodLight)
  }
}

function drawPartition(pen: Pen, [x0, x1]: [number, number], door: boolean): void {
  rect(pen, x0, CEIL, x1, HEAD, door ? C.officeDark : C.wallDark)
  rect(pen, x0, HEAD - 0.12, x1, HEAD, C.woodLight)
  rect(pen, x0, CEIL, x0 + POST, FLOOR, C.wood)
  rect(pen, x1 - POST, CEIL, x1, FLOOR, C.wood)
  rect(pen, x0 + POST, HEAD, x1 - POST, FLOOR, '#0F0B08')
}

function drawStock(pen: Pen, t: number, f: F & { cx: number; cy: number }): void {
  const x0 = PART1[1]
  const x1 = PART2[0]
  if (f.x1 < x0 || f.x0 > x1) return
  rect(pen, x0, CEIL, x1, FLOOR, C.plaster)
  for (let y = CEIL + 0.8; y < FLOOR; y += 1.4) line(pen, [x0, y], [x1, y + 0.05], C.plasterDark, 0.4)
  // Steel shelving full of boxes, stacked any way.
  const rumble = elRumble(t)
  for (const [sx, sw] of [[15.95, 0.95], [18.95, 2.6]] as const) {
    for (let r = 0; r < 4; r++) {
      const y = FLOOR - 0.15 - r * 1.15
      rect(pen, sx, y - 0.04, sx + sw, y, C.shelfSteel)
      let bx = sx + 0.05
      let n = 0
      while (bx < sx + sw - 0.3) {
        const w = 0.32 + 0.22 * hash(r, n, 11)
        const h = 0.24 + 0.22 * hash(r, n, 12)
        const col = C.boxes[Math.floor(hash(r, n, 13) * C.boxes.length)]
        if (hash(r, n, 14) > 0.15) {
          // A train going by on the El shivers the boxes on their shelves, the loose ones on top most.
          const jx = 0.012 * rumble * Math.sin(t * 37 + n * 1.7 + r * 2.3)
          const jy = -0.01 * rumble * Math.abs(Math.sin(t * 23 + n * 2.9 + r))
          rect(pen, bx + jx, y - 0.04 - h + jy, bx + w + jx, y - 0.04, mix(col, C.plasterDark, 0.25))
          rect(pen, bx + jx, y - 0.04 - h + jy, bx + w + jx, y - 0.04 - h + 0.04 + jy, mix(col, '#000000', 0.3))
          if (hash(r, n, 15) > 0.5) {
            const h2 = 0.2 + 0.15 * hash(r, n, 16)
            const kx = jx + 0.022 * rumble * Math.sin(t * 31 + n * 4.1 + r * 1.3)
            const ky = jy - 0.018 * rumble * Math.abs(Math.sin(t * 19 + n * 3.7 + r * 2))
            rect(pen, bx + 0.04 + kx, y - 0.04 - h - h2 + ky, bx + w - 0.05 + kx, y - 0.04 - h + jy, mix(C.boxes[(n + r) % C.boxes.length], C.plasterDark, 0.3))
          }
        }
        bx += w + 0.04
        n++
      }
    }
    rect(pen, sx - 0.04, -3.3, sx, FLOOR, C.shelfSteel)
    rect(pen, sx + sw, -3.3, sx + sw + 0.04, FLOOR, C.shelfSteel)
  }
  // And the dust it shakes down off the shelves, sifting through the bulb's light.
  if (rumble > 0.05) {
    for (const [sx, sw] of [[15.95, 0.95], [18.95, 2.6]] as const) {
      motes(pen, t, { n: Math.round(14 * sw), seed: Math.round(sx * 7), box: [sx, FLOOR - 4.7, sx + sw, FLOOR - 0.2], size: [0.008, 0.016], color: '#D8C8A4', alpha: 0.5 * rumble, drift: [0.01, 0.45], wander: 0.05, twinkle: 0, light: (x) => lightAt(x, t) })
    }
  }
  // High in the back wall, a transom on the street, its glass the dawn's cold blue.
  const [tx0, ty0, tx1, ty1] = TRANSOM
  rect(pen, tx0 - 0.06, ty0 - 0.06, tx1 + 0.06, ty1 + 0.06, C.woodDark)
  rect(pen, tx0, ty0, tx1, ty1, mix('#2A3A50', '#7A8C9C', Math.min(1, t / T1)))
  for (let x = tx0 + (tx1 - tx0) / 3; x < tx1 - 0.05; x += (tx1 - tx0) / 3) rect(pen, x - 0.015, ty0, x + 0.015, ty1, C.woodDark)
  rect(pen, tx0, (ty0 + ty1) / 2 - 0.012, tx1, (ty0 + ty1) / 2 + 0.012, C.woodDark)
  // Behind the two of them, under the bulb: the barred window on the yard (`yard.ts`), and a coat on a nail.
  drawYard(pen, t, f)
  const nail = 18.66
  ellipse(pen, [nail, -1.15], 0.025, 0.025, C.iron)
  // The coat's hem stirs in the draught off the window and under the curtain.
  const hem = 0.06 * sway(t, 6, 2.6) + 0.04 * ring(t - CURTAIN - 0.3, 0.9, 1.2)
  shape(pen, [[nail, -1.15], [nail + 0.2, -0.9], [nail + 0.25 + hem, 0.2], [nail - 0.25 + hem * 0.8, 0.2], [nail - 0.2, -0.9]], '#2E3436')
  line(pen, [nail, -0.9], [nail + hem * 0.6, 0.15], '#1E2224', 0.5)
  // Cartons on the floor; a broom; the bulb's cord.
  rect(pen, 21.0, FLOOR - 0.7, 21.9, FLOOR, C.cartonDark)
  rect(pen, 21.1, FLOOR - 1.15, 21.8, FLOOR - 0.7, C.carton)
  line(pen, [21.1, FLOOR - 0.92], [21.8, FLOOR - 0.92], C.cartonDark, 0.4)
  line(pen, [15.95, FLOOR - 0.05], [16.45, -1.2], C.woodLight, 1)
  shape(pen, [[15.8, FLOOR], [16.15, FLOOR], [16.08, FLOOR - 0.3], [15.9, FLOOR - 0.3]], '#8A7A50')
  const sw = stockSway(t)
  const sb: Pt = [STOCK_BULB[0] + sw, STOCK_BULB[1]]
  line(pen, [STOCK_BULB[0], CEIL], [sb[0], sb[1] - 0.08], C.iron, 0.6)
  rect(pen, sb[0] - 0.035, sb[1] - 0.12, sb[0] + 0.035, sb[1] - 0.05, C.chromeDark)
  ellipse(pen, sb, 0.06, 0.08, '#FFF0C8')
  // The carton they sit on: a long one, its flaps tucked, and an open box of tissue beside it.
  const [b0, b1] = BENCH
  rect(pen, b0, BENCH_TOP, b1, FLOOR, C.carton)
  rect(pen, b0, BENCH_TOP, b1, BENCH_TOP + 0.05, C.cartonDark)
  line(pen, [(b0 + b1) / 2, BENCH_TOP + 0.05], [(b0 + b1) / 2, FLOOR], C.cartonDark, 0.5)
  rect(pen, b0 + 0.1, BENCH_TOP + 0.18, b0 + 0.4, BENCH_TOP + 0.26, C.label)
  rect(pen, b1 + 0.15, FLOOR - 0.3, b1 + 0.75, FLOOR, C.boxes[2])
  shape(pen, [[b1 + 0.18, FLOOR - 0.3], [b1 + 0.3, FLOOR - 0.42], [b1 + 0.45, FLOOR - 0.33], [b1 + 0.6, FLOOR - 0.44], [b1 + 0.72, FLOOR - 0.3]], '#EEE6D8')
}

function drawOffice(pen: Pen, t: number, f: F): void {
  const x0 = PART2[1]
  const x1 = 31.6
  if (f.x1 < x0 - 0.5) return
  rect(pen, x0, CEIL, x1, FLOOR, C.office)
  // Wallpaper stripes; wainscot.
  for (let x = x0 + 0.2; x < x1; x += 0.4) rect(pen, x, CEIL, x + 0.05, 0.3, C.officeDark)
  rect(pen, x0, 0.3, x1, FLOOR, C.wainscot)
  for (let x = x0 + 0.15; x < x1 - 0.5; x += 0.9) rect(pen, x, 0.45, x + 0.75, FLOOR - 0.15, C.woodDark)
  rect(pen, x0, 0.26, x1, 0.32, C.woodLight)
  // The end wall, and the dark past it.
  rect(pen, x1, CEIL, x1 + 0.3, FLOOR, C.wood)
  rect(pen, x1 + 0.3, CEIL, f.x1 + 1, FLOOR, C.bg)
  // A framed picture (a harbour in shapes), a calendar of blank squares, a clock with no figures.
  rect(pen, 27.5, -1.45, 28.5, -0.75, C.gilt)
  rect(pen, 27.56, -1.39, 28.44, -0.81, '#5A6A6E')
  shape(pen, [[27.56, -1.05], [27.85, -1.22], [28.1, -1.1], [28.44, -1.2], [28.44, -0.81], [27.56, -0.81]], '#3A4A40')
  rect(pen, 28.95, -1.45, 29.55, -0.65, C.label)
  rect(pen, 28.95, -1.45, 29.55, -1.27, C.red)
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) rect(pen, 29.0 + i * 0.11, -1.21 + j * 0.13, 29.08 + i * 0.11, -1.12 + j * 0.13, '#BFB49A')
  const ck: Pt = [24.25, -1.2]
  // A schoolhouse clock: under its dial a drop case, the brass pendulum swinging through its glass a beat each way.
  rect(pen, ck[0] - 0.2, ck[1] + 0.2, ck[0] + 0.2, ck[1] + 0.95, C.wood)
  rect(pen, ck[0] - 0.14, ck[1] + 0.3, ck[0] + 0.14, ck[1] + 0.86, '#1A120C')
  const swing = 0.2 * Math.cos((Math.PI * (t - BULB_ON)) / BEAT)
  const pivot: Pt = [ck[0], ck[1] + 0.26]
  const bob: Pt = [pivot[0] + Math.sin(swing) * 0.46, pivot[1] + Math.cos(swing) * 0.46]
  line(pen, pivot, bob, C.brassDark, 0.5)
  ellipse(pen, bob, 0.055, 0.055, C.brass)
  ellipse(pen, [bob[0] - 0.015, bob[1] - 0.015], 0.018, 0.018, mix(C.brass, '#FFFFFF', 0.45))
  line(pen, [ck[0] - 0.1, ck[1] + 0.82], [ck[0] + 0.02, ck[1] + 0.34], '#3A2C20', 0.4)
  ellipse(pen, [ck[0], ck[1] + 0.98], 0.06, 0.03, C.woodDark)
  ellipse(pen, ck, 0.3, 0.3, C.wood)
  ellipse(pen, ck, 0.24, 0.24, '#E4D9BE')
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    line(pen, [ck[0] + Math.cos(a) * 0.18, ck[1] + Math.sin(a) * 0.18], [ck[0] + Math.cos(a) * 0.22, ck[1] + Math.sin(a) * 0.22], C.iron, 0.5)
  }
  // A minute to six; on the downbeat of bar 23 it clicks over to six, and the store's day begins.
  const click = t >= CLOCK_SIX ? 1 - 0.08 * Math.exp(-(t - CLOCK_SIX) / 0.1) * Math.cos((t - CLOCK_SIX) * 40) : 0
  const mins = 59 + click
  const hr = 5 + mins / 60
  const ma = (mins / 60) * Math.PI * 2 - Math.PI / 2
  const ha = (hr / 12) * Math.PI * 2 - Math.PI / 2
  line(pen, ck, [ck[0] + Math.cos(ma) * 0.19, ck[1] + Math.sin(ma) * 0.19], C.iron, 0.7)
  line(pen, ck, [ck[0] + Math.cos(ha) * 0.12, ck[1] + Math.sin(ha) * 0.12], C.iron, 1)
  // The radiator under the clock, coming up for the morning, and his scarf over its riser (`heat.ts`).
  drawRadiator(pen, t)
  // Murray's desk, his lamp (off), his chair; the coat stand with his hat.
  const dx = -0.85
  rect(pen, 28.4 + dx, 0.15, 30.8 + dx, 0.28, C.woodLight)
  rect(pen, 28.5 + dx, 0.28, 29.2 + dx, FLOOR, C.woodDark)
  rect(pen, 30.1 + dx, 0.28, 30.7 + dx, FLOOR, C.woodDark)
  rect(pen, 28.58 + dx, 0.4, 29.12 + dx, 0.75, C.wood)
  rect(pen, 28.58 + dx, 0.82, 29.12 + dx, 1.2, C.wood)
  ellipse(pen, [28.85 + dx, 0.57], 0.04, 0.025, C.brass)
  ellipse(pen, [28.85 + dx, 1.0], 0.04, 0.025, C.brass)
  rect(pen, 28.9 + dx, 0.1, 29.9 + dx, 0.15, C.green)
  // His lamp, a banker's lamp, left on all night (its light is drawn over the dark, in `life.ts`).
  const dl = DESK_LAMP
  line(pen, [dl, 0.15], [dl, -0.35], C.brass, 1)
  shape(pen, [[dl - 0.3, -0.32], [dl + 0.3, -0.32], [dl + 0.2, -0.52], [dl - 0.2, -0.52]], C.green, 0.4, C.iron)
  ellipse(pen, [dl, 0.13], 0.15, 0.03, C.brassDark)
  line(pen, [dl + 0.12, -0.32], [dl + 0.13, -0.18], C.brassDark, 0.35)
  rect(pen, 29.5 + dx, -0.12, 29.8 + dx, 0.1, '#D9CDAE')
  // The ashtray, and the last cigarette of the night still burning in it.
  ellipse(pen, [ASH[0] + 0.04, 0.135], 0.11, 0.028, '#2A2622')
  ellipse(pen, [ASH[0] + 0.04, 0.125], 0.08, 0.016, '#1A1714')
  line(pen, [ASH[0] - 0.1, 0.12], [ASH[0], 0.1], '#E6DCC8', 0.9)
  line(pen, [31.2, FLOOR], [31.2, -1.6], C.woodDark, 1.4)
  line(pen, [30.95, FLOOR], [31.45, FLOOR], C.woodDark, 1.2)
  // Its hooks bare: Murray has his hat on, and he is on his way.
  line(pen, [31.2, -1.6], [30.98, -1.45], C.woodDark, 0.8)
  line(pen, [31.2, -1.6], [31.42, -1.45], C.woodDark, 0.8)
  drawRug(pen)
  // The safe's body: squat, black, on its feet, its edges catching what light there is.
  const [s0, s1] = SAFE
  rect(pen, s0, SAFE_TOP, s1, FLOOR - SAFE_FEET, C.safe)
  rect(pen, s0, SAFE_TOP, s1, SAFE_TOP + 0.05, C.safeHi)
  rect(pen, s0 - 0.04, SAFE_TOP - 0.05, s1 + 0.04, SAFE_TOP, '#221F1E')
  rect(pen, s0 - 0.04, FLOOR - SAFE_FEET - 0.06, s1 + 0.04, FLOOR - SAFE_FEET, '#221F1E')
  for (const x of [s0 + 0.08, s1 - 0.2]) rect(pen, x, FLOOR - SAFE_FEET, x + 0.12, FLOOR, C.iron)
  // The step stool.
  const [p0, p1] = STEP
  rect(pen, p0 - 0.03, STEP_TOP, p1 + 0.03, STEP_TOP + 0.06, C.oak)
  rect(pen, p0, STEP_TOP + 0.06, p0 + 0.06, FLOOR, C.oakDark)
  rect(pen, p1 - 0.06, STEP_TOP + 0.06, p1, FLOOR, C.oakDark)
  rect(pen, p0, 1.12, p1, 1.17, C.oakDark)
}

/** The burning end of the cigarette in Murray's ashtray: where its smoke comes off. */
/**
 * Murray's rug, on the boards in front of the safe and the desk: an old Turkey runner coming toward us, its border, a
 * row of medallions down its middle, fringes at its ends, and worn pale where he stands at the safe every night.
 */
function drawRug(pen: Pen): void {
  const back = FLOOR + 0.1
  const front = FLOOR + 0.78
  const [x0, x1] = [24.0, 29.5]
  // Its edges spread a little toward us.
  const at = (u: number, v: number): Pt => [x0 - 0.25 * v + (x1 - x0 + 0.5 * v) * u, back + (front - back) * v]
  const quad = (u0: number, v0: number, u1: number, v1: number, col: string) => shape(pen, [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], col)
  quad(0, 0, 1, 1, '#3A1E18')
  quad(0.02, 0.12, 0.98, 0.88, '#4E2620')
  quad(0.05, 0.3, 0.95, 0.7, '#44201A')
  // The medallions: diamonds down its length, in faded indigo and ochre.
  for (let i = 0; i < 9; i++) {
    const u = 0.1 + i * 0.1
    const [cx, cy] = at(u, 0.5)
    const w = 0.23
    shape(pen, [[cx - w, cy], [cx, cy - 0.15], [cx + w, cy], [cx, cy + 0.15]], i % 2 ? '#3A3A4A' : '#6A5030')
    shape(pen, [[cx - w * 0.45, cy], [cx, cy - 0.07], [cx + w * 0.45, cy], [cx, cy + 0.07]], '#4E2620')
  }
  // The border's small repeat.
  for (let i = 0; i < 30; i++) {
    const u = 0.03 + i * 0.032
    for (const v of [0.06, 0.94]) {
      const [cx, cy] = at(u, v)
      shape(pen, [[cx - 0.04, cy], [cx, cy - 0.025], [cx + 0.04, cy], [cx, cy + 0.025]], '#5A4228')
    }
  }
  // Worn pale before the safe, where he stands at it.
  const [wx, wy] = at(0.22, 0.45)
  shade(pen, [wx, wy], 0.7, 0.24, '#B08A6A', 0.22)
  // The fringes.
  for (const u of [0, 1]) {
    for (let j = 0; j <= 10; j++) {
      const p = at(u, j / 10)
      line(pen, p, [p[0] + (u ? 0.09 : -0.09), p[1] + 0.01], '#C8B898', 0.4)
    }
  }
}

export const ASH: Pt =[28.48, 0.098]

/* ------------------------------------------------------------------ the moving things */

/** His toy: a red-rubber bat on a sprung, hinged arm, clamped on the counter; it flicks him up on every takeoff. */
export function drawBat(pen: Pen, t: number, takeoffs: number[]): void {
  const { ago } = lastOf(takeoffs, t)
  const big = t >= FIRE - 1e-6 && t < FIRE + 0.5
  const kick = ago < 0.4 ? (big ? 0.42 : 0.16) * Math.exp(-ago / 0.06) * Math.cos(ago * 26) : 0
  const th = -Math.max(-0.08, kick)
  const [hx, hy] = BAT_HINGE
  const rot = (x: number, y: number): Pt => {
    const dx = x - hx
    const dy = y - hy
    return [hx + dx * Math.cos(th) - dy * Math.sin(th), hy + dx * Math.sin(th) + dy * Math.cos(th)]
  }
  // The clamp block and the spring.
  rect(pen, hx - 0.06, hy - 0.04, hx + 0.26, COUNTER_TOP, C.oakDark)
  rect(pen, hx + 0.05, COUNTER_TOP, hx + 0.2, COUNTER_TOP + 0.16, C.chromeDark)
  const sp: Pt[] = []
  for (let i = 0; i <= 6; i++) {
    const u = i / 6
    const top = rot(hx - 0.12 - 0.04 * u, hy + 0.0)
    sp.push([hx - 0.15 + (i % 2 ? 0.035 : -0.035), COUNTER_TOP - (COUNTER_TOP - top[1]) * u])
  }
  path(pen, sp, C.chrome, 0.6)
  // The arm and the handle.
  path(pen, [rot(hx, hy), rot(-0.2, 0.17)], C.chromeDark, 1.6)
  shape(pen, [rot(-0.18, 0.15), rot(-0.3, 0.15), rot(-0.3, 0.19), rot(-0.18, 0.19)], C.oak)
  // The bat's face: wood under red rubber, seen almost edge on.
  const c = BAT_AT[0]
  const face: Pt[] = []
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2
    face.push(rot(c + Math.cos(a) * 0.225, 0.158 + Math.sin(a) * 0.028))
  }
  shape(pen, face, C.oakLight)
  const top: Pt[] = []
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI
    top.push(rot(c + Math.cos(a) * 0.225, 0.152 + Math.sin(a) * 0.022))
  }
  top.push(rot(c + 0.225, 0.158))
  shape(pen, top, C.red)
}

/** A box pulled out of the wall: the dark slot behind it, its end nearer and bigger, its lid's top showing. */
export function drawPops(pen: Pen, t: number): void {
  STEP_BOX.forEach(([i, j], n) => {
    const t0 = POPS[n]
    if (t < t0) return
    const u = Math.min(1, (t - t0) / 0.09)
    const land = STEPS_AT[n]
    const dip = t >= land ? 0.02 * Math.exp(-(t - land) / 0.08) : 0
    const out = u * (1 + 0.1 * ring(t - t0 - 0.09, 5, 0.15))
    const x = boxX(i)
    const top = boxTop(j)
    rect(pen, x, top, x + BOX_W, top + BOX_H, C.slot)
    const s = 1 + 0.16 * out
    const cx = x + BOX_W / 2
    const cy = top + BOX_H / 2 + dip
    const hh = (BOX_H / 2 - 0.012) * s
    const hw = (BOX_W / 2 - 0.012) * s
    // The lid's top, toward us.
    const col = boxColor(i, j)
    shape(pen, [[x + 0.01, top + 0.01], [x + BOX_W - 0.01, top + 0.01], [cx + hw, cy - hh], [cx - hw, cy - hh]], mix(col, '#FFFFFF', 0.2))
    rect(pen, cx - hw - 0.01, cy - hh - 0.07 * out, cx + hw + 0.01, cy - hh, mix(col, '#FFFFFF', 0.28))
    pen.p.push()
    pen.p.translate(0, dip * pen.k)
    boxEnd(pen, x, top, i, j, s)
    pen.p.pop()
    // A shadow under it on the box below.
    rect(pen, cx - hw, cy + hh, cx + hw, cy + hh + 0.09 * out, C.slot)
  })
}

/** The library ladder: oak rails and rungs, hooked on the brass rail, on its wheels. */
export function drawLadder(pen: Pen, t: number): void {
  const x = ladderX(t)
  const shake = t >= BANG ? 0.05 * ring(t - BANG, 4, 0.25) : t >= LADDER_GO ? 0.015 * ring(t - LADDER_GO, 4, 0.2) : 0
  const lean = shake
  const top = RAIL_Y + 0.08
  const bottom = FLOOR - 0.1
  const xl = (y: number, side: number) => x + side * LADDER_HALF + lean * (y - bottom) * -0.3
  // The rails.
  for (const side of [-1, 1]) {
    shape(pen, [[xl(top, side) - 0.04, top], [xl(top, side) + 0.04, top], [xl(bottom, side) + 0.045, bottom], [xl(bottom, side) - 0.045, bottom]], C.oak, 0.3, C.oakDark)
    // The hook over the rail.
    path(pen, [[xl(top, side), top], [xl(top, side), RAIL_Y - 0.1], [xl(top, side) + 0.08 * side, RAIL_Y - 0.1], [xl(top, side) + 0.08 * side, RAIL_Y]], C.brass, 1.2)
    // The wheel.
    const wx = xl(bottom, side)
    const turn = (x - 4) / 0.08
    ellipse(pen, [wx, FLOOR - 0.07], 0.07, 0.07, C.iron)
    line(pen, [wx, FLOOR - 0.07], [wx + Math.cos(turn) * 0.06, FLOOR - 0.07 + Math.sin(turn) * 0.06], C.chrome, 0.5)
  }
  // The rungs.
  const rt = RUNGS_AT
  for (let n = 1; rungY(n) > top + 0.1; n++) {
    const y = rungY(n)
    const k = rt.findIndex((_, i) => [8, 7, 6, 5, 4, 3][i] === n)
    const hit = k >= 0 && t >= rt[k] ? 0.018 * Math.exp(-(t - rt[k]) / 0.08) : 0
    shape(pen, [[xl(y, -1), y - 0.025 + hit], [xl(y, 1), y - 0.025 + hit], [xl(y, 1), y + 0.03 + hit], [xl(y, -1), y + 0.03 + hit]], C.oakLight, 0.3, C.oakDark)
  }
  void RUNG
}

/** The shoehorn on its stack of boxes, the salesman's stool with its sprung footrest, and the measuring device. */
export function drawFitting(pen: Pen, t: number): void {
  // The stack.
  for (let r = 0; r < 3; r++) {
    const y = FLOOR - 0.32 * (r + 1)
    const col = C.boxes[(r * 3 + 1) % C.boxes.length]
    rect(pen, STACK[0] + r * 0.02, y, STACK[1] - r * 0.015, y + 0.32, col, 0.3, C.woodDark)
    rect(pen, STACK[0] + r * 0.02, y, STACK[1] - r * 0.015, y + 0.06, mix(col, '#000000', 0.2))
  }
  // The shoehorn: long, horn-coloured, its spoon at the foot.
  const land = t >= HORN_LAND ? 0.02 * Math.exp(-(t - HORN_LAND) / 0.1) * Math.cos((t - HORN_LAND) * 30) : 0
  const dx = HORN1[0] - HORN0[0]
  const dy = HORN1[1] - HORN0[1]
  const l = Math.hypot(dx, dy)
  const nx = dy / l
  const ny = -dx / l
  const P = (f: number, off: number): Pt => [HORN0[0] - 0.12 * dx / l + (dx + 0.14 * dx / l) * f + nx * off, HORN0[1] - 0.12 * dy / l + (dy + 0.14 * dy / l) * f + ny * off + land * Math.sin(f * Math.PI)]
  shape(pen, [P(0, 0), P(0.6, 0), P(0.85, 0.005), P(1, 0.0), P(1.0, -0.06), P(0.9, -0.1), P(0.65, -0.05), P(0, -0.035)], '#C08A3E', 0.3, '#6A4418')
  path(pen, [P(0.62, -0.01), P(0.88, -0.02), P(0.98, -0.01)], '#E2B064', 0.5)
  ellipse(pen, P(0.04, -0.018), 0.018, 0.018, '#3A2410')
  // The stool: a low seat on four legs, its sprung footrest out in front.
  const [s0, s1] = STOOL
  rect(pen, s0, STOOL_SEAT, s1, STOOL_SEAT + 0.1, C.oxblood)
  rect(pen, s0 - 0.03, STOOL_SEAT + 0.1, s1 + 0.03, STOOL_SEAT + 0.16, C.woodDark)
  rect(pen, s0 + 0.03, STOOL_SEAT + 0.16, s0 + 0.09, FLOOR, C.woodDark)
  rect(pen, s1 - 0.09, STOOL_SEAT + 0.16, s1 - 0.03, FLOOR, C.woodDark)
  const flick = t >= FOOTREST ? 0.22 * Math.exp(-(t - FOOTREST) / 0.12) * Math.cos((t - FOOTREST) * 22) : 0
  const th = flick
  const [hx, hy] = FOOT_HINGE
  const rot = (p: Pt): Pt => {
    const ddx = p[0] - hx
    const ddy = p[1] - hy
    return [hx + ddx * Math.cos(th) - ddy * Math.sin(th), hy + ddx * Math.sin(th) + ddy * Math.cos(th)]
  }
  const e = FOOT_END
  const fdx = e[0] - hx
  const fdy = e[1] - hy
  const fl = Math.hypot(fdx, fdy)
  const n: Pt = [fdy / fl * 0.05, -fdx / fl * 0.05]
  shape(pen, [rot([hx, hy]), rot(e), rot([e[0] - n[0], e[1] - n[1]]), rot([hx - n[0], hy - n[1]])].map((q) => q), C.chromeDark)
  shape(pen, [rot([hx, hy]), rot(e), rot([e[0] + n[0] * 0.6, e[1] + n[1] * 0.6]), rot([hx + n[0] * 0.6, hy + n[1] * 0.6])], C.chrome)
  line(pen, [hx, hy], [hx + 0.05, STOOL_SEAT + 0.16], C.chromeDark, 1)
  // The spring under the footrest.
  const tip = rot([hx - 0.25, hy + 0.1])
  path(pen, [[hx - 0.25, FLOOR], [hx - 0.29, FLOOR - 0.06], [hx - 0.21, FLOOR - 0.12], [hx - 0.29, FLOOR - 0.18], [hx - 0.21, FLOOR - 0.24], [tip[0], tip[1] + 0.05]], C.chrome, 0.6)
  // The measuring device: a flat steel plate, its heel cup, its scale, the slider the ball pushes, the lip at the toe.
  const [d0, d1] = DEVICE
  rect(pen, d0, DEVICE_TOP, d1, FLOOR, C.chromeDark)
  rect(pen, d0, DEVICE_TOP, d1, DEVICE_TOP + 0.015, C.chrome)
  shape(pen, [[d0, DEVICE_TOP], [d0 + 0.12, DEVICE_TOP], [d0 + 0.1, DEVICE_TOP - 0.12], [d0 + 0.02, DEVICE_TOP - 0.14], [d0, DEVICE_TOP - 0.1]], C.chromeDark)
  for (let x = d0 + 0.2; x < d1 - 0.1; x += 0.07) line(pen, [x, DEVICE_TOP + 0.02], [x, DEVICE_TOP + (Math.round((x - d0) / 0.07) % 2 ? 0.035 : 0.05)], C.iron, 0.4)
  rect(pen, LIP, DEVICE_TOP - 0.1, d1, DEVICE_TOP, C.chromeDark)
  let sx = SLIDER0
  if (t >= DEVICE_LAND) {
    const q = WAY.at(Math.min(t, SLIDER_STOP))[0] + 0.15
    sx = Math.max(SLIDER0, Math.min(SLIDER1, q))
  }
  rect(pen, sx - 0.02, DEVICE_TOP - 0.13, sx + 0.05, DEVICE_TOP, C.chrome, 0.3, C.iron)
  rect(pen, sx - 0.03, DEVICE_TOP - 0.16, sx + 0.06, DEVICE_TOP - 0.12, C.iron)
}

const breathe = sway

/** The curtain to the stockroom: two halves of oxblood velvet; they part round him in the doorway and swing back. */
export function drawCurtain(pen: Pen, t: number): void {
  const x0 = PART1[0] + POST
  const x1 = PART1[1] - POST
  const mid = (x0 + x1) / 2
  const open = Math.max(0, Math.min(1, 1 - Math.abs(t - CURTAIN) / 0.45)) ** 0.7
  // It swings back after him, and all the while it breathes a little in the draught from the street.
  const sway = (t > CURTAIN ? 0.06 * ring(t - CURTAIN - 0.3, 1.2, 0.8) : 0) + 0.02 * breathe(t, 2, 3.3)
  const g = 0.28 * open
  // Parted at its foot where the cat puts its head through.
  const cat = 0.07 * catPart(t)
  for (const side of [-1, 1]) {
    const inner = mid + side * g + sway
    const outer = side < 0 ? x0 : x1
    const a = Math.min(inner, outer)
    const b = Math.max(inner, outer)
    const foot: [number, number][] = side < 0
      ? [[b, FLOOR - 0.28], [b - cat, FLOOR - 0.02], [a, FLOOR - 0.02]]
      : [[b, FLOOR - 0.02], [a + cat * 1.6, FLOOR - 0.02], [a, FLOOR - 0.28]]
    shape(pen, [[a, HEAD + 0.08], [b, HEAD + 0.08], ...foot], C.velvet)
    // Its folds, rippling in the fan's draught from the store: each fold's foot swings on its own, a little after the last.
    const n = 4
    for (let i = 1; i < n; i++) {
      const x = a + ((b - a) * i) / n
      const ripple = t > FIRE ? 0.05 * Math.min(1, (t - FIRE) / 3) * breathe(t - i * 0.35, 9 + i + side, 2.1) : 0
      const foot = x + sway * 0.5 + ripple
      line(pen, [x, HEAD + 0.1], [foot, FLOOR - 0.04], C.velvetDark, 0.9)
      line(pen, [x + 0.04, HEAD + 0.1], [foot + 0.04, FLOOR - 0.04], C.velvetLight, 0.4)
    }
  }
  line(pen, [x0 - 0.05, HEAD + 0.05], [x1 + 0.05, HEAD + 0.05], C.brass, 1.2)
  for (let x = x0 + 0.05; x < x1; x += 0.12) ellipse(pen, [x + (x < mid ? -g * 0.3 : g * 0.3), HEAD + 0.06], 0.02, 0.02, C.brassDark)
}

/** The office door, face on in its opening; it is knocked open on "Welcome", hinged at its far side. */
export function drawOfficeDoor(pen: Pen, t: number): void {
  const x0 = PART2[0] + POST
  const x1 = PART2[1] - POST
  const d = officeDoor(t)
  const w = (x1 - x0) * Math.cos(d * 1.35)
  const a = x1 - w
  const bulge = 0.06 * Math.sin(d * 1.35)
  shape(pen, [[a, HEAD + 0.02 - bulge], [x1, HEAD + 0.02], [x1, FLOOR - 0.01], [a, FLOOR - 0.01 + bulge]], '#4A3020', 0.4, C.iron)
  if (w > 0.12) {
    const pad = 0.1 * (w / (x1 - x0))
    rect(pen, a + pad, HEAD + 0.2, x1 - pad, -0.25, '#8E8A72')
    rect(pen, a + pad, 0.0, x1 - pad, FLOOR - 0.2, '#3A2418')
    ellipse(pen, [a + 0.08 * (w / (x1 - x0)) + 0.02, 0.0], 0.03, 0.03, C.brass)
  }
}

/** The safe's inside: the lining, the shelf, a cash box, the bundles of bills and the ticket tucked in the top one. */
export function drawSafeInside(pen: Pen, t: number): void {
  const [x0, y0, x1, y1] = INNER
  rect(pen, SAFE[0] + 0.04, SAFE_TOP + 0.04, SAFE[1] - 0.04, FLOOR - SAFE_FEET - 0.04, C.safeHi)
  rect(pen, x0, y0, x1, y1, C.liningDark)
  rect(pen, x0 + 0.05, y0 + 0.05, x1 - 0.05, y1, C.lining)
  rect(pen, x0, y0, x1, y0 + 0.03, C.gilt)
  rect(pen, x0, y0, x0 + 0.03, y1, C.giltDark)
  rect(pen, x1 - 0.03, y0, x1, y1, C.giltDark)
  // The shelf, gilt-edged; on it a cash box and a ledger.
  rect(pen, x0, SHELF, x1, SHELF + 0.05, C.liningDark)
  rect(pen, x0, SHELF + 0.05, x1, SHELF + 0.07, C.gilt)
  rect(pen, x0 + 0.12, SHELF - 0.22, x0 + 0.62, SHELF, '#2A3A44', 0.3, C.iron)
  rect(pen, x0 + 0.33, SHELF - 0.15, x0 + 0.41, SHELF - 0.1, C.brass)
  rect(pen, x0 + 0.75, SHELF - 0.3, x0 + 0.92, SHELF, '#4A1E18')
  rect(pen, x0 + 0.93, SHELF - 0.26, x0 + 1.08, SHELF, '#2E3A2A')
  // Gilt scrolls in the upper corners.
  path(pen, [[x0 + 0.08, y0 + 0.25], [x0 + 0.08, y0 + 0.1], [x0 + 0.25, y0 + 0.1]], C.gilt, 0.6)
  path(pen, [[x1 - 0.08, y0 + 0.25], [x1 - 0.08, y0 + 0.1], [x1 - 0.25, y0 + 0.1]], C.gilt, 0.6)
  // The bills: the left stack of two, the right of three; the ticket in the top one.
  const hits = [INTO, ONTO, ...SKIPS.flatMap((s) => [s[1], s[2]])]
  const { ago, i } = lastOf(hits, t)
  const riffle = ago < 0.3 ? Math.exp(-ago / 0.08) : 0
  bundles(pen, LEFT_STACK, 2, i === 0 ? riffle : 0, 1)
  bundles(pen, RIGHT_STACK, 3, i > 0 ? riffle : 0, 2)
  // The ticket: plain paper, a stub, tucked under the band of the top bundle, standing up beside him.
  const tx = RIGHT_STACK[1] - 0.12
  let ty = RIGHT_TOP + 0.02
  // It rises out of the band on a beat; on his last skip he settles it back in, tucked against him.
  const up = ease((t - TICKET_UP) / 0.18) * (1 - ease((t - TICKET_IN) / 0.2))
  const wob = (i > 0 ? 0.12 * riffle : 0) + 0.02 * Math.sin(t * 2.1) - 0.22 * up
  ty -= 0.07 * up
  const tk = (x: number, y: number): Pt => [tx + x * Math.cos(0.3 + wob) - y * Math.sin(0.3 + wob), ty + x * Math.sin(0.3 + wob) + y * Math.cos(0.3 + wob)]
  shape(pen, [tk(-0.05, 0.1), tk(0.05, 0.1), tk(0.05, -0.3), tk(-0.05, -0.3)], C.ticket, 0.3, C.ticketDark)
  for (let k = 0; k < 5; k++) ellipse(pen, tk(-0.05 + k * 0.025, -0.2), 0.006, 0.006, C.ticketDark)
  shape(pen, [tk(-0.035, -0.07), tk(0.035, -0.07), tk(0.035, -0.11), tk(-0.035, -0.11)], C.red)
  // The band over the ticket's foot.
  rect(pen, tx - 0.07, RIGHT_TOP + 0.05, tx + 0.07, RIGHT_TOP + 0.14, C.band)
}

function bundles(pen: Pen, [x0, x1]: [number, number], n: number, riffle: number, seed: number): void {
  for (let r = 0; r < n; r++) {
    const y1 = INNER[3] - r * 0.16
    const y0 = y1 - 0.15
    const off = (hash(r, seed, 9) - 0.5) * 0.06
    const top = r === n - 1
    const lift = top ? 0.025 * riffle : 0
    rect(pen, x0 + off, y0 - lift, x1 + off, y1, C.bill, 0.3, C.billDark)
    for (let k = 1; k < 4; k++) line(pen, [x0 + off + 0.02, y0 + k * 0.035 - lift * (1 - k / 4)], [x1 + off - 0.02, y0 + k * 0.035 - lift * (1 - k / 4)], C.billDark, 0.3)
    rect(pen, x0 + off, y0 - lift, x1 + off, y0 + 0.02 - lift, C.billLight)
    const bx = (x0 + x1) / 2 + off - 0.06
    rect(pen, bx, y0 - lift, bx + 0.12, y1, C.band)
  }
}

/** The safe's door: shut, then heaved open; the dial, the handle, the gilt lines, its hinges, its bolts. */
export function drawSafeDoor(pen: Pen, t: number): void {
  const deg = doorDeg(t)
  const c = Math.cos((deg * Math.PI) / 180)
  const s = Math.sin((deg * Math.PI) / 180)
  const yT = SAFE_TOP + 0.08
  const yB = FLOOR - SAFE_FEET - 0.08
  const X = (x: number) => doorX(x, deg)
  const edge = HINGE_X + DOOR_W
  // The free edge comes toward us: it reads a little taller.
  const grow = 0.1 * s
  const yAt = (x: number, y: number) => {
    const u = (x - HINGE_X) / DOOR_W
    const mid = (yT + yB) / 2
    return mid + (y - mid) * (1 + grow * u)
  }
  const P = (x: number, y: number): Pt => [X(x), yAt(x, y)]
  const inside = c < 0
  // The door's thickness, when it stands open.
  const thick = 0.14
  if (deg > 3) {
    const e0 = P(edge, yT)
    const e1 = P(edge, yB)
    shape(pen, [e0, [e0[0] + thick * (inside ? 1 : -1) * Math.abs(s) * 0.8, e0[1]], [e1[0] + thick * (inside ? 1 : -1) * Math.abs(s) * 0.8, e1[1]], e1], C.chromeDark)
  }
  shape(pen, [P(HINGE_X, yT), P(edge, yT), P(edge, yB), P(HINGE_X, yB)], inside ? '#2A2826' : C.safe, 0.5, C.safeEdge)
  if (inside) {
    // Its inner face: the bolt-work under a plate, a gilt line round it.
    shape(pen, [P(HINGE_X + 0.2, yT + 0.2), P(edge - 0.2, yT + 0.2), P(edge - 0.2, yB - 0.2), P(HINGE_X + 0.2, yB - 0.2)], '#36332F')
    shape(pen, [P(HINGE_X + 0.12, yT + 0.12), P(edge - 0.12, yT + 0.12), P(edge - 0.12, yB - 0.12), P(HINGE_X + 0.12, yB - 0.12)], null, 0.5, C.gilt)
    for (const y of [yT + 0.35, (yT + yB) / 2, yB - 0.35]) shape(pen, [P(edge - 0.02, y - 0.05), P(edge + 0.1, y - 0.05), P(edge + 0.1, y + 0.05), P(edge - 0.02, y + 0.05)], C.chrome)
    return
  }
  // The face's gilt: a double line round the panel, scrolls at the corners, a landscape oval (shapes only).
  const g = (x0: number, y0: number, x1: number, y1: number, col: string, lw: number) => shape(pen, [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)], null, lw, col)
  g(HINGE_X + 0.1, yT + 0.08, edge - 0.1, yB - 0.08, C.gilt, 0.7)
  g(HINGE_X + 0.15, yT + 0.13, edge - 0.15, yB - 0.13, C.giltDark, 0.4)
  for (const [x, y, sx, sy] of [[HINGE_X + 0.15, yT + 0.13, 1, 1], [edge - 0.15, yT + 0.13, -1, 1], [HINGE_X + 0.15, yB - 0.13, 1, -1], [edge - 0.15, yB - 0.13, -1, -1]] as const) {
    path(pen, [P(x + sx * 0.02, y + sy * 0.18), P(x + sx * 0.1, y + sy * 0.1), P(x + sx * 0.18, y + sy * 0.02)], C.gilt, 0.5)
  }
  // Under the dial, the door in section where its lock is: three wheels on the dial's spindle, the fence over them.
  if (c > 0.3) drawLock(pen, t, P)
  // The dial: a silver ring of ticks round a black knob, turning.
  const dc = P(DIAL[0], DIAL[1])
  const dth = dialTurn(t)
  ellipse(pen, dc, DIAL_R * 1.12 * c, DIAL_R * 1.12, C.iron)
  ellipse(pen, dc, DIAL_R * c, DIAL_R, C.chrome)
  for (let i = 0; i < 20; i++) {
    const a = dth + (i / 20) * Math.PI * 2
    const r0 = i % 5 === 0 ? 0.13 : 0.155
    line(pen, [dc[0] + Math.cos(a) * r0 * c, dc[1] + Math.sin(a) * r0], [dc[0] + Math.cos(a) * 0.185 * c, dc[1] + Math.sin(a) * 0.185], C.iron, i % 5 === 0 ? 0.6 : 0.35)
  }
  ellipse(pen, dc, 0.11 * c, 0.11, '#26221F')
  for (let i = 0; i < 10; i++) {
    const a = dth + (i / 10) * Math.PI * 2
    line(pen, [dc[0] + Math.cos(a) * 0.07 * c, dc[1] + Math.sin(a) * 0.07], [dc[0] + Math.cos(a) * 0.105 * c, dc[1] + Math.sin(a) * 0.105], '#4A4440', 0.5)
  }
  ellipse(pen, dc, 0.04 * c, 0.04, '#3A3430')
  // The index mark over it.
  const im = P(DIAL[0], DIAL[1] - DIAL_R * 1.12 - 0.02)
  shape(pen, [[im[0] - 0.03 * c, im[1] - 0.05], [im[0] + 0.03 * c, im[1] - 0.05], [im[0], im[1]]], C.gilt)
  // The handle: a hub and a lever with a ball on its end; it turns down under him.
  const hc = P(HANDLE[0], HANDLE[1])
  const hth = handleTurn(t)
  const lx = (u: number, v: number): Pt => [hc[0] + (u * Math.cos(hth) - v * Math.sin(hth)) * c, hc[1] + u * Math.sin(hth) + v * Math.cos(hth)]
  shape(pen, [lx(0, -0.035), lx(0.33, -0.03), lx(0.33, 0.03), lx(0, 0.035)], C.chrome, 0.4, C.chromeDark)
  ellipse(pen, lx(0.35, 0), 0.045 * c, 0.045, C.chrome)
  ellipse(pen, hc, 0.08 * c, 0.08, C.chromeDark)
  ellipse(pen, hc, 0.045 * c, 0.045, C.chrome)
  // The hinges.
  for (const y of [yT + 0.2, yB - 0.25]) rect(pen, HINGE_X - 0.06, y, HINGE_X + 0.02, y + 0.22, '#2A2624', 0.3, C.safeEdge)
  // The bolts across the gap at the free edge: they go home into the door as the handle throws them.
  if (deg < 2) {
    const back = ease((t - BOLTS + 0.15) / 0.2)
    for (const y of [yT + 0.3, (yT + yB) / 2, yB - 0.3]) rect(pen, edge - 0.04 - 0.1 * back, y - 0.035, edge + 0.04 - 0.1 * back, y + 0.035, C.chrome)
  }
}

/**
 * The lock, cut open under the dial: three brass wheels side by side, each with its gate (a notch), turned by the
 * dial's clicks a bar each until the gate comes up under the fence, the wheel's brass then bright; the fence drops into the three gates
 * as the handle turns, and the bolts go back.
 */
function drawLock(pen: Pen, t: number, P: (x: number, y: number) => Pt): void {
  const q = (pts: Pt[]) => pts.map(([x, y]) => P(x, y))
  const [x0, x1, y0, y1] = [25.32, 26.26, 0.66, 1.08]
  shape(pen, q([[x0 - 0.03, y0 - 0.03], [x1 + 0.03, y0 - 0.03], [x1 + 0.03, y1 + 0.03], [x0 - 0.03, y1 + 0.03]]), C.giltDark)
  shape(pen, q([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]), '#0D0B0A')
  // The spindle, from the dial down through the wheels.
  const cy = 0.91
  shape(pen, q([[x0 + 0.05, cy - 0.012], [x1 - 0.05, cy - 0.012], [x1 - 0.05, cy + 0.012], [x0 + 0.05, cy + 0.012]]), C.chromeDark)
  const drop = fenceDrop(t)
  for (let i = 0; i < 3; i++) {
    const cx = x0 + 0.17 + i * 0.3
    const c = P(cx, cy)
    const rr = 0.115
    const th = -Math.PI / 2 + wheelTurn(i, t)
    const set = t >= GATES[i]
    ellipse(pen, c, rr * (c[0] - P(cx - 1, cy)[0]), rr, set ? C.brass : C.brassDark)
    ellipse(pen, c, rr * 0.35 * (c[0] - P(cx - 1, cy)[0]), rr * 0.35, '#2A2420')
    // The gate: a notch cut in the rim.
    const sx = c[0] - P(cx - 1, cy)[0]
    const g = (a: number, r: number): Pt => [c[0] + Math.cos(a) * r * sx, c[1] + Math.sin(a) * r]
    shape(pen, [g(th - 0.32, rr * 1.02), g(th + 0.32, rr * 1.02), g(th + 0.2, rr * 0.7), g(th - 0.2, rr * 0.7)], '#0D0B0A')
    // The tick on the rim that shows it turning.
    line(pen, g(th + Math.PI * 0.75, rr * 0.55), g(th + Math.PI * 0.75, rr * 0.95), C.brassDark, 0.5)
  }
  // The fence: a bar over the wheels, its teeth dropping into the gates as the handle turns.
  const fy = y0 + 0.07 + 0.045 * drop
  shape(pen, q([[x0 + 0.04, fy - 0.03], [x1 - 0.04, fy - 0.03], [x1 - 0.04, fy], [x0 + 0.04, fy]]), C.chrome)
  for (let i = 0; i < 3; i++) {
    const cx = x0 + 0.17 + i * 0.3
    shape(pen, q([[cx - 0.03, fy], [cx + 0.03, fy], [cx + 0.015, fy + 0.04], [cx - 0.015, fy + 0.04]]), C.chrome)
  }
}

/**
 * Murray's shadow, at six: in at the office door from the store's light behind him and up the wall, a step a beat
 * and bigger with each, his hat on; on the last steps his arm comes up and out over the safe. Cast on everything in
 * the office, the safe and the bills too (Marty, drawn last, stays orange in it).
 */
export function drawMurray(pen: Pen, t: number): void {
  if (t < MURRAY_STEPS[0] - 0.05) return
  const s = murrayNear(t)
  const fade = ease((t - MURRAY_STEPS[0] + 0.05) / 0.3)
  const { ago } = lastOf(MURRAY_STEPS, t)
  const bob = ago < 0.4 ? 0.05 * Math.sin(Math.min(1, ago / 0.24) * Math.PI) : 0
  const h = (2.0 + 1.25 * s) / 3
  // Between his steps he is still coming: his weight rolling from foot to foot, his shadow never quite still.
  const roll = 0.035 * Math.sin((t - MURRAY_STEPS[0]) * Math.PI / BEAT) * fade
  const cx = 23.75 + 1.0 * s + roll
  const F = FLOOR + 0.02
  const top = F - 2.35 * h + bob
  const { k } = pen
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.beginPath()
  ctx.rect((PART2[1] - 0.02) * k, CEIL * k, (31.6 - PART2[1]) * k, (FLOOR + 1 - CEIL) * k)
  ctx.clip()
  const col = rgba(pen, C.shade, 0.58 * fade) as unknown as string
  ctx.fillStyle = col
  // The coat, the head, the hat; one shape, so where they overlap it is no darker.
  ctx.beginPath()
  const coat: Pt[] = [[cx - 0.4 * h, F], [cx + 0.4 * h, F], [cx + 0.36 * h, top + 0.25 * h], [cx + 0.22 * h, top], [cx - 0.22 * h, top], [cx - 0.36 * h, top + 0.25 * h]]
  coat.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
  const head: Pt = [cx + 0.03 * h, top - 0.2 * h]
  ctx.moveTo((head[0] + 0.17 * h) * k, head[1] * k)
  ctx.ellipse(head[0] * k, head[1] * k, 0.17 * h * k, 0.2 * h * k, 0, 0, Math.PI * 2)
  ctx.rect((head[0] - 0.32 * h) * k, (head[1] - 0.17 * h) * k, 0.64 * h * k, 0.06 * h * k)
  ctx.rect((head[0] - 0.18 * h) * k, (head[1] - 0.42 * h) * k, 0.36 * h * k, 0.27 * h * k)
  // The arm: up and out toward the safe on the last two steps, a coat sleeve narrowing to the wrist and a hand whose
  // fingers open as it comes; in the same shape, so where it meets the coat it is no darker.
  const reach = ease((t - MURRAY_STEPS[5]) / 0.5)
  if (reach > 0) {
    const sh: Pt = [cx + 0.26 * h, top + 0.2 * h]
    const wr: Pt = [sh[0] + (0.3 + 0.62 * reach) * h * 1.3, sh[1] + (0.62 - 0.22 * reach) * h]
    const ang = Math.atan2(wr[1] - sh[1], wr[0] - sh[0])
    const nx = -Math.sin(ang)
    const ny = Math.cos(ang)
    const at = (p: Pt, d: number, s: number): Pt => [p[0] + Math.cos(ang) * d * h + nx * s * h, p[1] + Math.sin(ang) * d * h + ny * s * h]
    // Each piece is wound the coat's way round, so that the overlaps fill rather than cancel.
    const area = (pts: Pt[]) => pts.reduce((sum, [x, y], i) => sum + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0)
    const wind = Math.sign(area(coat))
    const add = (pts: Pt[]) => {
      const ps = Math.sign(area(pts)) === wind ? pts : [...pts].reverse()
      ps.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
      ctx.closePath()
    }
    // Upper arm and forearm, the elbow a little low, narrowing to the wrist.
    const el = at([(sh[0] + wr[0]) / 2, (sh[1] + wr[1]) / 2], 0, 0.07 * reach)
    add([at(sh, 0, -0.15), at(el, 0, -0.1), at(el, 0, 0.11), at(sh, 0, 0.17)])
    add([at(el, 0, -0.1), at(wr, 0, -0.06), at(wr, 0, 0.065), at(el, 0, 0.11)])
    // The hand, turned down over the safe, its fingers spreading as it comes.
    const ha = ang + 0.25 + 0.2 * reach
    const palm: Pt = [wr[0] + Math.cos(ha) * 0.1 * h, wr[1] + Math.sin(ha) * 0.1 * h]
    add(Array.from({ length: 12 }, (_, i): Pt => {
      const u = (i / 12) * Math.PI * 2
      const [px, py] = [0.12 * Math.cos(u) * h, 0.09 * Math.sin(u) * h]
      return [palm[0] + px * Math.cos(ha) - py * Math.sin(ha), palm[1] + px * Math.sin(ha) + py * Math.cos(ha)]
    }))
    const spread = 0.1 + 0.12 * reach
    for (let i = 0; i < 5; i++) {
      const thumb = i === 4
      const a = ha + (thumb ? -1.0 : (i - 1.5) * spread)
      const len = (thumb ? 0.14 : i === 0 || i === 3 ? 0.18 : 0.21) * h
      const base: Pt = [palm[0] + Math.cos(a) * 0.08 * h, palm[1] + Math.sin(a) * 0.08 * h]
      const tip: Pt = [base[0] + Math.cos(a) * len, base[1] + Math.sin(a) * len]
      const w = 0.026 * h
      const [sx, sy] = [-Math.sin(a), Math.cos(a)]
      add([[base[0] + sx * w, base[1] + sy * w], [tip[0] + sx * w * 0.7, tip[1] + sy * w * 0.7], [tip[0] - sx * w * 0.7, tip[1] - sy * w * 0.7], [base[0] - sx * w, base[1] - sy * w]])
    }
  }
  ctx.fill('nonzero')
  ctx.restore()
}

/** The two of them on the carton: their shadows from the swinging bulb, swaying the other way. */
export function drawPairShadows(pen: Pen, t: number, rachel: Pt): void {
  if (t < CURTAIN || t > WELCOME) return
  const bulbX = STOCK_BULB[0] + stockSway(t)
  const marty = WAY.at(t)
  for (const b of [marty, rachel]) {
    const lift = BENCH_TOP - 0.13 - b[1]
    if (b[0] < BENCH[0] || b[0] > BENCH[1] || lift < -0.01 || lift > 0.6) continue
    const x = b[0] - (bulbX - b[0]) * 0.3
    const a = 0.32 * (1 - lift / 0.6)
    ellipse(pen, [x, BENCH_TOP + 0.012], 0.14 + 0.08 * lift, 0.025, rgba(pen, C.shade, a) as unknown as string)
  }
}

/** The hanging lamps: their cords and green enamel shades (their light is drawn over the shade). */
export function drawLamps(pen: Pen, t: number): void {
  LAMP_X.forEach((lx, i) => {
    const sw = lampSway(i, t)
    // The shade tips as it swings on its cord.
    const tip = sw * 0.9
    line(pen, [lx, CEIL], [lx + sw, LAMP_Y - 0.2], C.iron, 0.6)
    shape(pen, [[lx + sw - 0.05, LAMP_Y - 0.22], [lx + sw + 0.05, LAMP_Y - 0.22], [lx + sw + 0.24 + tip, LAMP_Y + 0.04 - tip], [lx + sw - 0.24 + tip, LAMP_Y + 0.04 + tip]], C.lampShade, 0.3, C.iron)
    ellipse(pen, [lx + sw + tip, LAMP_Y + 0.04], 0.24, 0.035, lampOn(i, t) > 0 ? C.lampIn : '#5A5446')
    // Its pull chain, swinging a little behind it in the draught.
    const pc: Pt = [lx + sw + 0.16, LAMP_Y + 0.03]
    const lag = 0.035 * sway(t - 0.3, i + 7, 2.2) + sw * 1.6
    line(pen, pc, [pc[0] + lag, pc[1] + 0.3], C.brassDark, 0.35)
    ellipse(pen, [pc[0] + lag, pc[1] + 0.31], 0.012, 0.012, C.brass)
  })
  // The bare bulb over the counter, on its cord.
  line(pen, [BULB[0], CEIL], [BULB[0], BULB[1] - 0.1], C.iron, 0.6)
  rect(pen, BULB[0] - 0.035, BULB[1] - 0.14, BULB[0] + 0.035, BULB[1] - 0.06, C.chromeDark)
  ellipse(pen, BULB, 0.065, 0.085, bulbOn(t) > 0.5 ? '#FFF2CC' : '#6A6250')
  // Its pull chain, stirring in the draught off the window (and set swinging when it is pulled).
  const draught = 0.035 * sway(t, 3, 2.7) + 0.06 * ring(t - BULB_ON, 1.1, 0.9)
  line(pen, [BULB[0] + 0.03, BULB[1] - 0.08], [BULB[0] + 0.03 + draught, BULB[1] + 0.35 + 0.03 * ring(t - BULB_ON, 2, 0.5)], C.brassDark, 0.4)
  ellipse(pen, [BULB[0] + 0.03 + draught * 1.03, BULB[1] + 0.37], 0.015, 0.015, C.brass)
}


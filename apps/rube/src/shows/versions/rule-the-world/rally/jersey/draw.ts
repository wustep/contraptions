import type { Pt } from '../../../../../parts'
import { CAB, drawCab } from '../cab'
import { hash, smooth } from '../kit'
import { a, at } from '../music'
import { blob, ctxOf, ellipse, flash, glint, glow, line, mix, path, rect, rgba, ring, shape, vgrad, type Pen } from '../pen'
import { dropTime } from '../physics'
import {
  AMB_LEN,
  AMB_ROOF,
  AMB_STOP,
  ambX,
  BALES_TOP,
  BARN_WIN,
  bob,
  BUMPS,
  BX0,
  BX1,
  cabX,
  COT_IN,
  COT_IN0,
  COT_OUT,
  COT_REACH,
  COT_TOP,
  cotOut,
  DOOR_FACE,
  DOOR_HEAD,
  DOOR_HITS,
  DOOR_OPEN,
  DOOR_X,
  DOORS_OPEN,
  FLARE,
  FLOOR,
  GATE_X,
  HAY,
  HOUSE,
  IN_CABIN,
  LANTERN,
  LANTERN_DOWN,
  LANTERN_SHOT,
  LEAVE,
  LOFT_X1,
  LOFT_Y,
  ON_SILL,
  PORCH,
  PORCH_ON,
  PORCH_Y,
  PASSING,
  passX,
  XING_FROM,
  XING_TO,
  XING_X,
  T0,
  RED_FLASHES,
  ROAD,
  S,
  SF,
  SHOT_WIN,
  SHOTS,
  SHUT,
  START_X,
  STEP,
  STEP_TIMES,
  STEPS,
  WIN_C,
  WIN_R,
  WIN_X,
  SILL,
} from './geo'

/**
 * New Jersey at night: teal-green and blue-black, the sodium yellow of headlights and lit windows, the barn's fire
 * red-gold (never his orange), the ambulance's red. Everything is drawn from here; `geo.ts` says where and when.
 */

export const C = {
  skyTop: '#03070A',
  skyMid: '#081619',
  skyLow: '#123029',
  star: '#CFE3DC',
  moon: '#E4E6D0',
  moonShade: '#B9C2B2',
  moonGlow: '#9CC3B8',
  hillFar: '#0C1E20',
  hillNear: '#08171A',
  treeline: '#050D0F',
  field: '#0A1815',
  fieldNear: '#06100E',
  road: '#161E22',
  roadNear: '#1D272B',
  roadLine: '#7E7347',
  joint: '#2E3A3E',
  verge: '#081311',
  pole: '#0F0C0B',
  wire: '#1E2B2A',
  post: '#151210',
  tree: '#030707',
  farmLight: '#F2C46A',
  house: '#1A2427',
  clap: '#141C1F',
  roof: '#0B1113',
  trim: '#2C3A3C',
  win: '#E9C46E',
  winWarm: '#F6DC97',
  winDim: '#6E5E36',
  porch: '#211C18',
  man: '#08090B',
  rim: '#5B6A64',
  barn: '#3A1A17',
  barnPlank: '#2C1311',
  barnDark: '#1A0B0A',
  beam: '#140908',
  loft: '#2A1A12',
  hay: '#86703A',
  hayDark: '#4E4024',
  bale: '#6E5B2E',
  baleDark: '#4A3C1F',
  fireRed: '#B52A1C',
  fireGold: '#E9AE3C',
  fireCore: '#FFE6A6',
  smoke: '#14181A',
  white: '#F5F7F2',
  yard: '#0F1714',
  apron: '#19221F',
  apronSeam: '#283337',
  blue: '#7FA6FF',
  runWhite: '#F2EAD0',
  hangar: '#141C20',
  hangarRib: '#1D272C',
  hangarDoor: '#D8BF7C',
  plane: '#76858C',
  planeLight: '#A3B1B6',
  planeDark: '#47545B',
  planeBelly: '#353F45',
  stripe: '#26364B',
  cabinWall: '#C7BDA4',
  cabinShade: '#8E8470',
  cabinFloor: '#4A2C26',
  seat: '#5C2B24',
  seatLight: '#7A3D30',
  rack: '#6C6656',
  lamp: '#FFE6AE',
  stair: '#7F8A8E',
  stairDark: '#4A5357',
  amb: '#D3D8D2',
  ambShade: '#A3ABA8',
  ambRed: '#A8211A',
  ambLight: '#FF2B1C',
  glass: '#1B2529',
  frost: '#E8E6D4',
  chrome: '#C6CACA',
  tyre: '#121212',
  coatWhite: '#E2E5DE',
  trousers: '#1A1D20',
  skin: '#C9A27E',
  green: '#7FE3A0',
}

type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }

/** The far layers move with the camera by this much of its move, so they lie behind. */
const CY0 = ROAD - 1.6
const par = (f: Frame, fx: number, fy = fx): Pt => [f.cx * fx, (f.cy - CY0) * fy]

/* ------------------------------------------------------------------ the sky and the far */

export function drawSky(pen: Pen, t: number, f: Frame): void {
  const [, oy] = par(f, 0.8)
  const horizon = ROAD - 1.25 + oy
  vgrad(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, [
    [0, C.skyTop, 1],
    [Math.max(0.05, Math.min(0.9, (horizon - 4 - f.y0 + 1) / (f.y1 - f.y0 + 2))), C.skyMid, 1],
    [Math.max(0.1, Math.min(0.97, (horizon - f.y0 + 1) / (f.y1 - f.y0 + 2))), C.skyLow, 1],
    [1, C.skyLow, 1],
  ])
  // Stars, nearly fixed.
  const [sx, sy] = par(f, 0.96)
  for (let i = 0; i < 160; i++) {
    const x = sx + (hash(i, 1) - 0.5) * 60 + f.cx * 0 - 0
    const y = sy + CY0 - 2 - hash(i, 2) * 14
    const px = ((((x - f.x0) % 60) + 60) % 60) + f.x0
    if (y > horizon - 0.6 || px > f.x1) continue
    const tw = 0.55 + 0.45 * Math.sin(t * (1 + hash(i, 3) * 2) + i)
    ellipse(pen, [px, y], 0.012 + hash(i, 4) * 0.018, 0.012 + hash(i, 4) * 0.018, mix(C.skyMid, C.star, 0.4 + 0.5 * tw))
  }
  // The moon, high and a little left, all but fixed.
  const [mx, my] = par(f, 0.94)
  const m: Pt = [mx - 2.5, my + CY0 - 5.4]
  glow(pen, m, 2.6, C.moonGlow, 0.16)
  glow(pen, m, 0.9, C.moon, 0.22)
  ellipse(pen, m, 0.42, 0.42, C.moon)
  ellipse(pen, [m[0] + 0.12, m[1] - 0.08], 0.09, 0.07, C.moonShade)
  ellipse(pen, [m[0] - 0.14, m[1] + 0.1], 0.06, 0.05, C.moonShade)
}

export function drawFar(pen: Pen, t: number, f: Frame): void {
  // Far hills.
  {
    const [ox, oy] = par(f, 0.82, 0.8)
    const base = ROAD - 1.25 + oy
    const step = 2.2
    const pts: Pt[] = []
    const i0 = Math.floor((f.x0 - ox) / step) - 1
    const i1 = Math.ceil((f.x1 - ox) / step) + 1
    for (let i = i0; i <= i1; i++) pts.push([ox + i * step, base - 0.5 - 1.3 * (0.5 + 0.5 * Math.sin(i * 0.7)) * (0.6 + 0.4 * hash(i, 11))])
    shape(pen, [[ox + i0 * step, f.y1 + 2], ...pts, [ox + i1 * step, f.y1 + 2]], C.hillFar)
  }
  // The tree line, and a farm's lights in it here and there.
  {
    const [ox, oy] = par(f, 0.62, 0.7)
    const base = ROAD - 1.0 + oy
    const step = 0.55
    const i0 = Math.floor((f.x0 - ox) / step) - 2
    const i1 = Math.ceil((f.x1 - ox) / step) + 2
    const pts: Pt[] = []
    for (let i = i0; i <= i1; i++) {
      const h = hash(i, 21)
      const clump = 0.5 + 0.5 * Math.sin(i * 0.31 + 1.7)
      pts.push([ox + i * step, base - 0.2 - clump * 0.9 - h * 0.35])
    }
    shape(pen, [[ox + i0 * step, f.y1 + 2], ...pts, [ox + i1 * step, f.y1 + 2]], C.hillNear)
    vgrad(pen, f.x0 - 1, base - 0.1, f.x1 + 1, f.y1 + 2, [
      [0, C.field, 1],
      [1, C.fieldNear, 1],
    ])
    for (let i = Math.floor((f.x0 - ox) / 3.7) - 1; i <= Math.ceil((f.x1 - ox) / 3.7) + 1; i++) {
      if (hash(i, 23) > 0.45) continue
      const x = ox + i * 3.7 + hash(i, 24) * 2
      const y = base - 0.12 - hash(i, 25) * 0.1
      const flick = 0.85 + 0.15 * Math.sin(t * 3 + i)
      glow(pen, [x, y], 0.35, C.farmLight, 0.35 * flick)
      ellipse(pen, [x, y], 0.03, 0.03, C.farmLight)
    }
  }
  // Nearer trees, black, at a middle distance.
  {
    const [ox, oy] = par(f, 0.35, 0.4)
    const base = ROAD - 0.55 + oy
    for (let i = Math.floor((f.x0 - ox) / 2.6) - 2; i <= Math.ceil((f.x1 - ox) / 2.6) + 2; i++) {
      if (hash(i, 31) > 0.5) continue
      const x = ox + i * 2.6 + hash(i, 32)
      tree(pen, x, base, 1.6 + hash(i, 33) * 1.6, C.treeline, i)
    }
  }
}

/** A black tree: a trunk and a heap of round crowns. */
function tree(pen: Pen, x: number, base: number, h: number, col: string, seed: number): void {
  rect(pen, x - 0.06 * h * 0.5, base - h * 0.45, x + 0.06 * h * 0.5, base, col)
  const n = 5
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + seed
    const r = h * (0.22 + 0.08 * hash(seed, j, 5))
    ellipse(pen, [x + Math.cos(a) * h * 0.18, base - h * 0.62 + Math.sin(a) * h * 0.16], r, r * 0.95, col)
  }
  ellipse(pen, [x, base - h * 0.85], h * 0.2, h * 0.18, col)
}

/* ------------------------------------------------------------------ the ground */

const ROAD_END = S + 6.6
const APRON_FROM = S + 30.5

export function drawGround(pen: Pen, _t: number, f: Frame): void {
  const x0 = f.x0 - 1
  const x1 = f.x1 + 1
  // The near ground, under everything.
  rect(pen, x0, ROAD - 0.42, x1, f.y1 + 2, C.verge)
  // The road: its far edge, the surface, the faded centre line; the joints the wheels hit.
  const rx1 = Math.min(x1, ROAD_END)
  if (rx1 > x0) {
    vgrad(pen, x0, ROAD - 0.42, rx1, ROAD + 0.28, [
      [0, C.road, 1],
      [1, C.roadNear, 1],
    ])
    for (let x = Math.floor(x0 / 1.2) * 1.2; x < rx1; x += 1.2) rect(pen, x, ROAD - 0.13, Math.min(rx1, x + 0.6), ROAD - 0.1, C.roadLine)
    for (const b of BUMPS) {
      const jx = cabXAt(b) + CAB.wheels[1]
      if (jx < x0 || jx > rx1) continue
      line(pen, [jx - 0.06, ROAD - 0.42], [jx + 0.06, ROAD + 0.28], C.joint, 0.9)
    }
    // The headlights' pool on the road ahead, riding with the cab.
  }
  // The farmyard: packed dirt.
  if (x1 > ROAD_END && x0 < APRON_FROM) rect(pen, Math.max(x0, ROAD_END), ROAD - 0.42, Math.min(x1, APRON_FROM), ROAD + 0.28, C.yard)
  // The apron: concrete in slabs.
  if (x1 > APRON_FROM) {
    const a0 = Math.max(x0, APRON_FROM)
    rect(pen, a0, ROAD - 0.42, x1, ROAD + 0.28, C.apron)
    const ctx = ctxOf(pen.p)
    const g = ctx.createLinearGradient((APRON_FROM - 0.01) * pen.k, 0, (APRON_FROM + 2) * pen.k, 0)
    g.addColorStop(0, rgba(pen, C.yard, 1))
    g.addColorStop(1, rgba(pen, C.yard, 0))
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect(APRON_FROM * pen.k, (ROAD - 0.42) * pen.k, 2 * pen.k, 0.7 * pen.k)
    ctx.restore()
    for (let x = Math.ceil(Math.max(a0, APRON_FROM + 2) / 2.5) * 2.5; x < x1; x += 2.5) line(pen, [x, ROAD - 0.42], [x + 0.25, ROAD + 0.28], C.apronSeam, 0.6)
  }
  line(pen, [x0, ROAD + 0.28], [x1, ROAD + 0.28], C.fieldNear, 0.8)
  // The level crossing's rails, across the road, and their ties.
  if (XING_X > x0 - 2 && XING_X < x1 + 2) {
    for (const dx of [-0.05, 0.75]) {
      shape(pen, [[XING_X + dx - 0.18, ROAD - 0.42], [XING_X + dx - 0.1, ROAD - 0.42], [XING_X + dx + 0.12, ROAD + 0.28], [XING_X + dx + 0.02, ROAD + 0.28]], '#11171A')
      line(pen, [XING_X + dx - 0.14, ROAD - 0.42], [XING_X + dx + 0.07, ROAD + 0.28], '#8C9699', 0.7)
    }
    // The rails run on away into the dark both sides of the road.
    shape(pen, [[XING_X - 0.6, ROAD - 0.42], [XING_X + 1.4, ROAD - 0.42], [XING_X + 1.0, ROAD - 1.1], [XING_X + 0.2, ROAD - 1.1]], '#0A1210')
    line(pen, [XING_X - 0.23, ROAD - 0.42], [XING_X + 0.32, ROAD - 1.1], '#5E686B', 0.5)
    line(pen, [XING_X + 0.62, ROAD - 0.42], [XING_X + 0.88, ROAD - 1.1], '#5E686B', 0.5)
  }
  // Between the farm and the airfield: dark field, and its fence.
  if (x1 > S + 26 && x0 < APRON_FROM) {
    for (let x = S + 26.2; x < APRON_FROM - 0.2; x += 0.9) rect(pen, x - 0.04, ROAD - 1.25, x + 0.04, ROAD - 0.42, '#1A1915')
    line(pen, [S + 26.2, ROAD - 1.05], [APRON_FROM - 0.3, ROAD - 1.05], '#22241F', 0.6)
    line(pen, [S + 26.2, ROAD - 0.7], [APRON_FROM - 0.3, ROAD - 0.7], '#22241F', 0.6)
  }
}

/** The level crossing's signal: a crossbuck on its post, two lamps that take turns while it rings. */
export function drawCrossing(pen: Pen, t: number): void {
  const x = XING_X - 0.75
  const base = ROAD - 0.42
  rect(pen, x - 0.06, base - 3.3, x + 0.06, base, '#2B2F30')
  // The crossbuck: two white boards in an X (no lettering).
  const c: Pt = [x, base - 3.0]
  for (const a of [0.6, -0.6]) {
    const dx = Math.cos(a) * 0.62
    const dy = Math.sin(a) * 0.62
    const nx = -Math.sin(a) * 0.08
    const ny = Math.cos(a) * 0.08
    shape(pen, [[c[0] - dx - nx, c[1] - dy - ny], [c[0] + dx - nx, c[1] + dy - ny], [c[0] + dx + nx, c[1] + dy + ny], [c[0] - dx + nx, c[1] - dy + ny]], '#D9DCD4')
  }
  // The lamps' bar.
  const ly = base - 2.15
  rect(pen, x - 0.55, ly - 0.04, x + 0.55, ly + 0.04, '#2B2F30')
  const on = t >= XING_FROM && t < XING_TO + 0.2
  const lastB = lastBeat(t)
  for (const [i, lx] of [x - 0.45, x + 0.45].entries()) {
    rect(pen, lx - 0.17, ly - 0.17, lx + 0.17, ly + 0.17, '#141718')
    const lit = on && lastB.i % 2 === i
    ellipse(pen, [lx, ly], 0.11, 0.11, lit ? '#FF3A22' : '#3A1410')
    if (lit) glow(pen, [lx, ly], 1.0 + 0.5 * flash(lastB.ago, 0.15), '#FF3A22', 0.5)
  }
}
/** Which of the crossing's beats and "a"s came last, counting from its first. */
function lastBeat(t: number): { i: number; ago: number } {
  const marks: number[] = []
  for (let bar = 67; bar <= 68; bar++) for (let pos = 1; pos <= 4; pos++) {
    marks.push(at(bar, pos))
    marks.push(a(bar, pos))
  }
  let i = -1
  for (let j = 0; j < marks.length; j++) if (marks[j] <= t) i = j
  return { i: Math.max(0, i), ago: i < 0 ? 0 : t - marks[i] }
}

/** The car the other way: dark, lamps blazing, in the far lane, gone in a moment. */
export function drawPassing(pen: Pen, t: number): void {
  if (t < T0 || t > PASSING + 2.5) return
  const fx = passX(t)
  const y = ROAD - 0.28
  const L = 4.6
  // Its beams ahead (to the left).
  const ctx = ctxOf(pen.p)
  const g = ctx.createLinearGradient(fx * pen.k, 0, (fx - 7) * pen.k, 0)
  g.addColorStop(0, rgba(pen, C.winWarm, 0.35))
  g.addColorStop(1, rgba(pen, C.winWarm, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(fx * pen.k, (y - 0.75) * pen.k)
  ctx.lineTo((fx - 7) * pen.k, (y - 1.3) * pen.k)
  ctx.lineTo((fx - 7) * pen.k, (y + 0.3) * pen.k)
  ctx.lineTo(fx * pen.k, (y - 0.5) * pen.k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  shape(pen, [[fx, y - 0.25], [fx, y - 0.85], [fx + 1.3, y - 0.95], [fx + 1.8, y - 1.6], [fx + 3.6, y - 1.6], [fx + 4.0, y - 1.0], [fx + L, y - 0.9], [fx + L, y - 0.25]], '#161C1F')
  shape(pen, [[fx + 1.95, y - 1.0], [fx + 2.15, y - 1.45], [fx + 3.45, y - 1.45], [fx + 3.7, y - 1.0]], '#26343A')
  for (const wx of [fx + 0.95, fx + 3.6]) ellipse(pen, [wx, y - 0.25], 0.33, 0.33, C.tyre)
  ellipse(pen, [fx + 0.06, y - 0.68], 0.07, 0.1, C.winWarm)
  glow(pen, [fx - 0.1, y - 0.68], 2.0, C.winWarm, 0.75)
  rect(pen, fx + L - 0.06, y - 0.85, fx + L + 0.02, y - 0.6, '#C8321F')
  glow(pen, [fx + L, y - 0.72], 0.35, '#C8321F', 0.4)
}

/** The glare of its lamps across the back window as they pass, on the "a". */
export function drawGlare(pen: Pen, t: number): void {
  // Its lamps sweep in over the bonnet, flare in the back window as they pass him, and are gone behind.
  const k = Math.exp(-Math.abs(t - PASSING) / (t < PASSING ? 0.3 : 0.14))
  if (k < 0.02) return
  const x = cabX(t)
  const lx = passX(t) - cabX(t)
  glow(pen, [x + Math.max(0.3, lx), bob(t) - 0.45], 2.2, C.winWarm, 0.6 * k)
  glint(pen, [x + Math.max(0.3, lx) + 0.4, bob(t) - 0.6], 0.6 * k, C.white, k)
}
const cabXAt = (t: number) => cabX(t)

/** The roadside: telephone poles and their wires, the fence and its posts, and black trees close by. */
export function drawRoadside(pen: Pen, _t: number, f: Frame): void {
  const x0 = Math.max(f.x0 - 3, -40)
  const x1 = Math.min(f.x1 + 3, S + 4)
  if (x1 <= x0) return
  const base = ROAD - 0.42
  // Trees close behind the fence.
  for (let i = Math.floor(x0 / 3.1) - 1; i <= Math.ceil(x1 / 3.1); i++) {
    if (hash(i, 41) > 0.42) continue
    const x = i * 3.1 + hash(i, 42) * 1.4
    if (x > S + 3) continue
    tree(pen, x, base - 0.1, 3.2 + hash(i, 43) * 2.2, C.tree, i + 100)
  }
  // The fence: a post a beat and an "a" apart at speed, three wires.
  const posts: number[] = []
  for (let x = Math.floor(x0 / 0.95) * 0.95; x < x1; x += 0.95) posts.push(x + 0.1 * hash(Math.round(x * 10), 44))
  for (const px of posts) shape(pen, [[px - 0.04, base + 0.02], [px - 0.035, base - 0.85], [px + 0.035, base - 0.87], [px + 0.04, base + 0.02]], C.post)
  for (const wy of [0.3, 0.55, 0.78]) line(pen, [x0, base - wy], [x1, base - wy], C.wire, 0.4)
  // The poles, the crossarm, the insulators, the sag of the wires between.
  const POLE = 4.3
  const poleTop = base - 5.4
  const ps: number[] = []
  for (let i = Math.floor(x0 / POLE) - 1; i <= Math.ceil(x1 / POLE) + 1; i++) ps.push(i * POLE + 0.6)
  for (let j = 0; j < ps.length - 1; j++) {
    for (const dy of [0.12, 0.42]) {
      const a: Pt = [ps[j], poleTop + dy]
      const b: Pt = [ps[j + 1], poleTop + dy]
      const pts: Pt[] = []
      for (let u = 0; u <= 1.0001; u += 0.1) pts.push([a[0] + (b[0] - a[0]) * u, a[1] + 0.35 * 4 * u * (1 - u)])
      path(pen, pts, C.wire, 0.5)
    }
  }
  for (const px of ps) {
    shape(pen, [[px - 0.07, base + 0.05], [px - 0.05, poleTop - 0.2], [px + 0.05, poleTop - 0.2], [px + 0.07, base + 0.05]], C.pole)
    rect(pen, px - 0.5, poleTop + 0.06, px + 0.5, poleTop + 0.14, C.pole)
    rect(pen, px - 0.35, poleTop + 0.36, px + 0.35, poleTop + 0.43, C.pole)
    for (const ix of [-0.42, -0.15, 0.15, 0.42]) ellipse(pen, [px + ix, poleTop + 0.04], 0.03, 0.04, '#2E3B3A')
  }
}

/* ------------------------------------------------------------------ people */

interface Figure {
  coat: string
  hat?: 'fedora' | 'cap'
  face?: 1 | -1
  rim?: string
  arm?: number
  h?: number
}

/** A person: legs, a coat, shoulders, a head, a hat. About 3.2 cells tall. */
export function figure(pen: Pen, x: number, foot: number, o: Figure): void {
  const s = (o.h ?? 3.2) / 3.2
  const y = (d: number) => foot - d * s
  const w = (d: number) => d * s
  const face = o.face ?? 1
  const legs = o.coat === C.coatWhite ? C.trousers : o.coat
  // Legs and shoes.
  rect(pen, x - w(0.2), y(1.0), x - w(0.04), y(0.05), legs)
  rect(pen, x + w(0.04), y(1.0), x + w(0.2), y(0.05), legs)
  ellipse(pen, [x - w(0.12) + face * w(0.05), y(0.04)], w(0.14), w(0.05), C.man)
  ellipse(pen, [x + w(0.12) + face * w(0.05), y(0.04)], w(0.14), w(0.05), C.man)
  // The coat, to the knee.
  shape(pen, [[x - w(0.36), y(0.85)], [x - w(0.4), y(2.5)], [x - w(0.3), y(2.66)], [x + w(0.3), y(2.66)], [x + w(0.4), y(2.5)], [x + w(0.36), y(0.85)]], o.coat)
  // Arms, hanging, one a little forward.
  const arm = o.arm ?? 0
  shape(pen, [[x - w(0.42), y(2.55)], [x - w(0.5), y(1.45)], [x - w(0.36), y(1.42)], [x - w(0.3), y(2.4)]], mix(o.coat, '#000000', 0.25))
  shape(pen, [[x + w(0.3), y(2.4)], [x + w(0.36) + face * w(arm), y(1.45)], [x + w(0.5) + face * w(arm), y(1.48)], [x + w(0.42), y(2.55)]], mix(o.coat, '#000000', 0.25))
  // Head and neck.
  rect(pen, x - w(0.07), y(2.8), x + w(0.07), y(2.62), o.coat === C.coatWhite ? C.skin : C.man)
  ellipse(pen, [x + face * w(0.02), y(2.95)], w(0.19), w(0.21), o.coat === C.coatWhite ? C.skin : C.man)
  if (o.hat === 'fedora') {
    ellipse(pen, [x + face * w(0.02), y(3.06)], w(0.33), w(0.05), C.man)
    shape(pen, [[x - w(0.18), y(3.06)], [x - w(0.16), y(3.27)], [x + w(0.16), y(3.27)], [x + w(0.18), y(3.06)]], C.man)
    rect(pen, x - w(0.18), y(3.12), x + w(0.18), y(3.07), '#1C1A18')
  } else if (o.hat === 'cap') {
    shape(pen, [[x - w(0.19), y(3.04)], [x - w(0.17), y(3.2)], [x + w(0.17), y(3.2)], [x + w(0.19), y(3.04)], [x + face * w(0.34), y(3.02)]], C.coatWhite)
  }
  if (o.rim) {
    // A rim of light down one side.
    const sx = x - w(0.39)
    line(pen, [sx, y(2.5)], [sx + w(0.03), y(0.9)], o.rim, 0.5)
    line(pen, [x - w(0.17), y(2.8)], [x - w(0.2), y(3.0)], o.rim, 0.5)
  }
}

/* ------------------------------------------------------------------ the farmhouse */

const SHOT_FLASH = (t: number) => SHOTS.reduce((m, s) => Math.max(m, flash(t - s, 0.09)), 0)

export function drawHouse(pen: Pen, t: number): void {
  const [x0, x1] = HOUSE
  const top = ROAD - 6.0
  // The house front: clapboards.
  rect(pen, x0, top, x1, ROAD, C.house)
  for (let y = top + 0.2; y < ROAD; y += 0.24) line(pen, [x0, y], [x1, y], C.clap, 0.45)
  // The roof, its eaves, the chimney.
  shape(pen, [[x0 - 0.35, top + 0.05], [x0 + 1.4, top - 2.1], [x1 - 1.4, top - 2.1], [x1 + 0.35, top + 0.05]], C.roof)
  line(pen, [x0 - 0.35, top + 0.05], [x1 + 0.35, top + 0.05], C.trim, 0.8)
  rect(pen, x1 - 2.2, top - 2.9, x1 - 1.6, top - 1.6, C.roof)
  // Smoke from the chimney, slow.
  for (let i = 0; i < 4; i++) {
    const u = ((t * 0.12 + i / 4) % 1 + 1) % 1
    blob(pen, circle([x1 - 1.9 + u * 0.8, top - 3.0 - u * 1.6], 0.2 + u * 0.35), '#1B2427', 0.45 * (1 - u))
  }
  // The windows: upstairs, and down; the one at the right is where the shots come from.
  const lit = (i: number) => 0.85 + 0.15 * Math.sin(t * 2.1 + i * 1.7)
  const win = (cx: number, cy: number, w: number, h: number, i: number, dim = false) => {
    rect(pen, cx - w / 2 - 0.08, cy - h / 2 - 0.08, cx + w / 2 + 0.08, cy + h / 2 + 0.1, C.trim)
    rect(pen, cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, dim ? C.winDim : mix(C.winDim, C.win, lit(i)))
    line(pen, [cx, cy - h / 2], [cx, cy + h / 2], C.trim, 0.5)
    line(pen, [cx - w / 2, cy], [cx + w / 2, cy], C.trim, 0.5)
    if (!dim) glow(pen, [cx, cy], 1.4, C.win, 0.12)
  }
  for (const [i, cx] of [x0 + 1.0, x0 + 3.3, x0 + 5.6].entries()) win(cx, top + 1.2, 0.75, 1.05, i, i === 1)
  win(x0 + 0.55, ROAD - 2.0, 0.7, 1.15, 5)
  // The shot window: white in each burst.
  const sf = SHOT_FLASH(t)
  win(SHOT_WIN[0], SHOT_WIN[1], 0.75, 1.15, 6)
  if (sf > 0.01) {
    rect(pen, SHOT_WIN[0] - 0.37, SHOT_WIN[1] - 0.57, SHOT_WIN[0] + 0.37, SHOT_WIN[1] + 0.57, mix(C.win, C.white, sf))
    glint(pen, [SHOT_WIN[0] - 0.1, SHOT_WIN[1] + 0.05], 0.9 * sf + 0.2, C.white, sf)
    glow(pen, SHOT_WIN, 3.4, C.white, 0.35 * sf)
  }
  // The porch: its floor, steps, roof on posts, the door, the lamp.
  const [p0, p1] = PORCH
  const proof = ROAD - 4.1
  rect(pen, p0 + 0.6, ROAD - 2.75, p1 - 0.6, PORCH_Y, '#2A2219')
  const doorX = (p0 + p1) / 2
  rect(pen, doorX - 0.55, ROAD - 3.15, doorX + 0.55, PORCH_Y, C.porch)
  rect(pen, doorX - 0.45, ROAD - 3.05, doorX + 0.45, PORCH_Y, mix(C.winDim, C.win, 0.55))
  rect(pen, doorX - 0.3, ROAD - 2.9, doorX + 0.3, ROAD - 2.1, C.winWarm)
  const on = t >= PORCH_ON ? 1 : 0
  const lampA = on * (0.8 + 0.2 * flash(t - PORCH_ON, 0.12))
  ellipse(pen, [doorX + 0.85, ROAD - 2.95], 0.08, 0.11, on ? C.winWarm : C.winDim)
  if (on) {
    glow(pen, [doorX + 0.85, ROAD - 2.95], 2.4 + 0.8 * flash(t - PORCH_ON, 0.15), C.win, 0.3 * lampA)
    glow(pen, [doorX, PORCH_Y], 2.2, C.win, 0.1 * lampA)
  }
  rect(pen, p0, PORCH_Y, p1, PORCH_Y + 0.14, C.porch)
  rect(pen, p0, PORCH_Y + 0.14, p1, ROAD, '#120F0D')
  for (let k = 0; k < 3; k++) rect(pen, p0 - 0.35 * (k + 1), PORCH_Y + 0.18 * k, p0, PORCH_Y + 0.18 * (k + 1), C.porch)
  shape(pen, [[p0 - 0.3, proof], [p0 + 0.2, proof - 0.5], [p1 - 0.2, proof - 0.5], [p1 + 0.3, proof]], C.roof)
  for (const px of [p0 + 0.1, p1 - 0.1]) rect(pen, px - 0.06, proof, px + 0.06, PORCH_Y, C.trim)
  // Mishkin's men: three dark shapes in hats against the light, waiting.
  const fx = SHOT_FLASH(t)
  const rim = mix(C.rim, C.white, fx)
  figure(pen, HOUSE[1] + 0.55, ROAD, { coat: '#0D0F12', hat: 'fedora', face: -1, rim, arm: 0.1 })
  figure(pen, p0 + 0.8, PORCH_Y, { coat: C.man, hat: 'fedora', face: -1, rim })
  figure(pen, doorX + 1.25, PORCH_Y, { coat: C.man, hat: 'fedora', face: -1, rim, h: 3.3, arm: 0.12 })
  // The gate and a run of fence along the yard.
  const gx = GATE_X - 0.2
  for (let x = gx - 3.2; x < gx + 0.6; x += 0.5) rect(pen, x - 0.04, ROAD - 1.25, x + 0.04, ROAD - 0.4, '#1C1A16')
  line(pen, [gx - 3.2, ROAD - 1.05], [gx + 0.55, ROAD - 1.05], '#1C1A16', 0.9)
  line(pen, [gx - 3.2, ROAD - 0.65], [gx + 0.55, ROAD - 0.65], '#1C1A16', 0.9)
}

const circle = (c: Pt, r: number): Pt[] => Array.from({ length: 8 }, (_, i) => [c[0] + Math.cos((i / 8) * Math.PI * 2) * r * (0.85 + 0.3 * hash(i, 7)), c[1] + Math.sin((i / 8) * Math.PI * 2) * r] as Pt)

/* ------------------------------------------------------------------ the barn */

/** How much of the barn is alight, 0 to 1. */
export function fireAt(t: number): number {
  if (t < LANTERN_DOWN) return 0
  return Math.min(1, 0.12 + 0.88 * smooth(t, LANTERN_DOWN, LANTERN_DOWN + 7.5))
}
/** Flares: the lantern bursting, the flare after, the hay landing. */
function flareAt(t: number): number {
  let v = flash(t - LANTERN_DOWN, 0.35) + 0.7 * flash(t - FLARE, 0.3)
  for (const h of HAY) v += (h.big ? 0.6 : 0.35) * flash(t - h.t, 0.25)
  return v
}

/** A tongue of flame from `base`, `w` wide and `h` tall, swaying. */
function tongue(pen: Pen, base: Pt, w: number, h: number, t: number, seed: number): void {
  if (h <= 0.02) return
  const sway = 0.12 * h * Math.sin(t * (5 + hash(seed, 1) * 3) + seed)
  const lick = 1 + 0.18 * Math.sin(t * (9 + hash(seed, 2) * 4) + seed * 2)
  const H = h * lick
  const pts = (k: number): Pt[] => {
    const ww = w * k
    const hh = H * (0.4 + 0.6 * k)
    const [x, y] = base
    return [
      [x - ww / 2, y],
      [x - ww * 0.45, y - hh * 0.35],
      [x - ww * 0.12 + sway * 0.6, y - hh * 0.72],
      [x + sway, y - hh],
      [x + ww * 0.22 + sway * 0.5, y - hh * 0.58],
      [x + ww * 0.5, y - hh * 0.25],
      [x + ww / 2, y],
    ]
  }
  blob(pen, pts(1), C.fireRed, 0.92)
  blob(pen, pts(0.66), C.fireGold, 0.95)
  blob(pen, pts(0.32), C.fireCore, 0.9)
}

export function drawBarn(pen: Pen, t: number): void {
  const eave = ROAD - 5.0
  const fire = fireAt(t)
  const flare = flareAt(t)
  // The roof, in section: a gambrel, its gable filled with the back wall.
  const roofPts: Pt[] = [[BX0 - 0.35, eave + 0.1], [BX0 + 1.1, ROAD - 6.9], [(BX0 + BX1) / 2, ROAD - 7.8], [BX1 - 1.1, ROAD - 6.9], [BX1 + 0.35, eave + 0.1]]
  shape(pen, roofPts, C.barnDark)
  const inner: Pt[] = [[BX0 + 0.22, eave], [BX0 + 1.25, ROAD - 6.65], [(BX0 + BX1) / 2, ROAD - 7.5], [BX1 - 1.25, ROAD - 6.65], [BX1 - 0.22, eave]]
  shape(pen, [...inner, [BX1 - 0.22, ROAD], [BX0 + 0.22, ROAD]], C.barn)
  // The back wall's boards.
  for (let x = BX0 + 0.4; x < BX1 - 0.2; x += 0.42) line(pen, [x, ROAD], [x, ROAD - 6.5 + Math.abs(x - (BX0 + BX1) / 2) * 0.28], C.barnPlank, 0.6)
  // Its beams.
  rect(pen, BX0 + 0.22, eave - 0.05, BX1 - 0.22, eave + 0.12, C.beam)
  line(pen, [BX0 + 1.25, ROAD - 6.65], [BX1 - 1.25, ROAD - 6.65], C.beam, 1.2)
  // The back window: night through it; white with the shot.
  const wf = flash(t - LANTERN_SHOT, 0.09)
  rect(pen, BARN_WIN[0] - 0.42, BARN_WIN[1] - 0.42, BARN_WIN[0] + 0.42, BARN_WIN[1] + 0.42, C.beam)
  rect(pen, BARN_WIN[0] - 0.34, BARN_WIN[1] - 0.34, BARN_WIN[0] + 0.34, BARN_WIN[1] + 0.34, mix(C.skyLow, C.white, wf))
  line(pen, [BARN_WIN[0], BARN_WIN[1] - 0.34], [BARN_WIN[0], BARN_WIN[1] + 0.34], C.beam, 0.6)
  if (wf > 0.01) {
    glint(pen, BARN_WIN, 0.8 * wf + 0.2, C.white, wf)
    glow(pen, BARN_WIN, 2.6, C.white, 0.35 * wf)
  }
  // The fire's light on the walls.
  if (fire > 0) glow(pen, [S + 17.6, ROAD - 2.2], 3 + 5 * fire, C.fireRed, Math.min(0.75, 0.25 + 0.4 * fire + 0.25 * flare))
  // Bales along the back wall.
  const bales: [number, number, number][] = [
    [S + 15.9, S + 18.7, BALES_TOP],
    [S + 16.4, S + 18.2, BALES_TOP - 0.55],
    [S + 20.3, S + 21.6, ROAD - 0.55],
  ]
  for (const [a, b, top] of bales) {
    const bot = top === BALES_TOP - 0.55 ? BALES_TOP : top === BALES_TOP ? ROAD : ROAD
    for (let x = a; x < b - 0.01; x += 0.7) {
      rect(pen, x, top, Math.min(b, x + 0.68), bot, mix(C.bale, C.fireGold, 0.25 * fire))
      line(pen, [x + 0.2, top], [x + 0.2, bot], C.baleDark, 0.5)
      line(pen, [x + 0.48, top], [x + 0.48, bot], C.baleDark, 0.5)
    }
  }
  // The loft: its floor on a post, the hay heaped on it.
  rect(pen, BX0 + 0.22, LOFT_Y - 0.02, LOFT_X1, LOFT_Y + 0.16, C.loft)
  rect(pen, LOFT_X1 - 0.22, LOFT_Y + 0.16, LOFT_X1 - 0.08, ROAD, C.beam)
  const hayPts: Pt[] = [[BX0 + 0.22, LOFT_Y]]
  for (let i = 0; i <= 12; i++) {
    const x = BX0 + 0.4 + ((LOFT_X1 - BX0 - 0.8) * i) / 12
    hayPts.push([x, LOFT_Y - 0.5 - 0.5 * Math.sin((i / 12) * Math.PI) - 0.15 * hash(i, 51)])
  }
  hayPts.push([LOFT_X1 - 0.1, LOFT_Y])
  blob(pen, hayPts, mix(C.hay, C.fireRed, 0.35 * fire))
  for (let i = 0; i < 26; i++) {
    const x = BX0 + 0.5 + hash(i, 52) * (LOFT_X1 - BX0 - 1.0)
    const y = LOFT_Y - 0.15 - hash(i, 53) * 0.7 * Math.sin(((x - BX0) / (LOFT_X1 - BX0)) * Math.PI)
    const a = (hash(i, 54) - 0.5) * 1.6
    line(pen, [x, y], [x + Math.cos(a) * 0.3, y - Math.abs(Math.sin(a)) * 0.2], mix(C.hayDark, C.fireRed, 0.3 * fire), 0.5)
  }
  for (let i = 0; i < 9; i++) {
    const x = BX0 + 0.5 + hash(i, 55) * (LOFT_X1 - BX0 - 1.0)
    line(pen, [x, LOFT_Y + 0.16], [x + 0.05, LOFT_Y + 0.4 + hash(i, 56) * 0.25], C.hay, 0.5)
  }
  // The ladder to the loft.
  for (const lx of [BX0 + 0.75, BX0 + 1.25]) line(pen, [lx, ROAD], [lx + 0.15, LOFT_Y], C.beam, 0.8)
  for (let k = 1; k < 8; k++) {
    const u = k / 8
    line(pen, [BX0 + 0.75 + 0.15 * u, ROAD - 3.4 * u], [BX0 + 1.25 + 0.15 * u, ROAD - 3.4 * u], C.beam, 0.6)
  }
  // The fire itself: from the lantern on the bales, up the hay to the loft, along the loft, at last the roof.
  if (fire > 0) {
    const n = 7
    for (let i = 0; i < n; i++) {
      const x = S + 16.0 + (2.6 * i) / (n - 1) + (hash(i, 64) - 0.5) * 0.3
      const h = (0.5 + 1.4 * fire + 0.5 * flare) * (0.5 + 0.8 * hash(i, 61)) * (0.85 + 0.15 * Math.sin(t * 2.3 + i * 1.9))
      tongue(pen, [x, BALES_TOP - 0.5 * (i > 0 && i < n - 1 ? 1 : 0)], 0.4 + 0.45 * hash(i, 65), h * smooth(fire, i * 0.04, i * 0.04 + 0.2), t, i)
    }
    const loft = smooth(fire, 0.2, 0.6)
    for (let i = 0; i < 9; i++) {
      const x = BX0 + 0.7 + ((LOFT_X1 - BX0 - 1.2) * i) / 8 + (hash(i, 66) - 0.5) * 0.35
      const h = (0.6 + 1.6 * loft + 0.4 * flare) * (0.45 + 0.9 * hash(i, 62)) * (0.85 + 0.15 * Math.sin(t * 1.9 + i * 2.7))
      tongue(pen, [x, LOFT_Y - 0.6 - 0.3 * Math.sin((i / 8) * Math.PI)], 0.5 + 0.5 * hash(i, 67), h * smooth(loft, Math.abs(i - 5) * 0.08, Math.abs(i - 5) * 0.08 + 0.3), t, 20 + i)
    }
    const roof = smooth(fire, 0.55, 1)
    for (let i = 0; i < 6; i++) {
      const x = BX0 + 1.6 + ((BX1 - BX0 - 3) * i) / 5
      tongue(pen, [x + (hash(i, 68) - 0.5) * 0.5, ROAD - 6.4 - 0.4 * Math.sin((i / 5) * Math.PI)], 0.6 + 0.6 * hash(i, 69), (1.0 + 1.6 * roof) * (0.45 + 0.8 * hash(i, 63)) * roof, t, 40 + i)
    }
    // Smoke up out of it, and sparks.
    for (let i = 0; i < 9; i++) {
      const u = (((t - LANTERN_DOWN) * 0.25 + i / 9) % 1 + 1) % 1
      const x = S + 16 + hash(i, 71) * 4 + u * 2.5
      const y = ROAD - 7.2 - u * 5
      blob(pen, circle([x, y], 0.5 + u * 1.3), C.smoke, 0.55 * fire * (1 - u))
    }
    for (let i = 0; i < 18; i++) {
      const u = (((t - LANTERN_DOWN) * (0.5 + hash(i, 81) * 0.4) + hash(i, 82)) % 1 + 1) % 1
      const x = S + 15.5 + hash(i, 83) * 5 + Math.sin(u * 6 + i) * 0.4
      const y = LOFT_Y - 0.5 - u * 6
      ellipse(pen, [x, y], 0.03, 0.03, mix(C.fireGold, C.fireCore, hash(i, 84)))
    }
    glow(pen, [(BX0 + BX1) / 2, ROAD - 6.5], 7 * fire, C.fireRed, 0.2 * fire)
  }
  // The lantern: hanging lit; shot off its hook, falling into the bales, gone in the burst.
  const hook: Pt = [LANTERN[0], LOFT_Y + 0.16]
  if (t < LANTERN_SHOT) {
    const sw = 0.03 * Math.sin(t * 1.3)
    lantern(pen, [LANTERN[0] + sw, LANTERN[1]], hook, 1)
  } else if (t < LANTERN_DOWN) {
    const s = t - LANTERN_SHOT
    const T = LANTERN_DOWN - LANTERN_SHOT
    const y = LANTERN[1] + (BALES_TOP - 0.55 - 0.2 - LANTERN[1]) * Math.min(1, (s / T) ** 2)
    lantern(pen, [LANTERN[0] + 0.25 * (s / T), y], null, 1, 0.6 * (s / T))
  }
  // The burst as it lands.
  const burst = flash(t - LANTERN_DOWN, 0.18)
  if (burst > 0.01) {
    glow(pen, [LANTERN[0] + 0.25, BALES_TOP - 0.6], 2.2, C.fireGold, 0.8 * burst)
    glint(pen, [LANTERN[0] + 0.25, BALES_TOP - 0.7], 0.8 * burst, C.fireCore, burst)
  }
  // Burning hay falling from the loft on the beats, and burning where it lands.
  for (const [i, h] of HAY.entries()) {
    const fall = dropTime(ROAD - LOFT_Y - 0.4)
    const s0 = h.t - fall
    if (t < s0) continue
    const r = h.big ? 0.36 : 0.26
    if (t < h.t) {
      const u = (t - s0) / fall
      const y = LOFT_Y + 0.2 + (ROAD - r * 0.6 - LOFT_Y - 0.2) * u * u
      blob(pen, circle([h.x, y], r), C.fireRed, 0.95)
      blob(pen, circle([h.x, y], r * 0.6), C.fireGold, 0.95)
      tongue(pen, [h.x, y - r * 0.5], r * 1.4, r * 2, t, 90 + i)
    } else {
      const k = flash(t - h.t, 0.2)
      const life = 1 - smooth(t, h.t + 5, h.t + 9)
      if (life <= 0) continue
      shape(pen, [[h.x - r * 1.5, ROAD], [h.x - r, ROAD - r * 0.5], [h.x + r, ROAD - r * 0.55], [h.x + r * 1.5, ROAD]], C.hayDark)
      tongue(pen, [h.x, ROAD - 0.05], r * 2.4, (r * 2.4 + 1.2 * k) * life, t, 100 + i)
      if (k > 0.05) glint(pen, [h.x, ROAD - 0.3], 0.7 * k, C.fireCore, k)
    }
  }
  // The end walls, cut: the near end open; the far end's hay door, hinged at its head.
  const wallCut = (x: number) => {
    rect(pen, x, eave, x + 0.22, ROAD - 2.62, C.barnDark)
    rect(pen, x, ROAD - 2.62, x + 0.22, ROAD - 2.5, C.beam)
  }
  wallCut(BX0)
  wallCut(BX1 - 0.22)
  hayDoor(pen, t)
  // The ground outside, lit by it.
  if (fire > 0) glow(pen, [BX1 + 1.5, ROAD], 4 * fire, C.fireRed, 0.25 * fire)
}

function lantern(pen: Pen, c: Pt, hook: Pt | null, lit: number, spin = 0): void {
  if (hook) line(pen, hook, [c[0], c[1] - 0.22], '#0A0A0A', 0.6)
  glow(pen, c, 1.6, C.fireGold, 0.35 * lit)
  const a = spin * 2
  const rot = (p: Pt): Pt => [c[0] + p[0] * Math.cos(a) - p[1] * Math.sin(a), c[1] + p[0] * Math.sin(a) + p[1] * Math.cos(a)]
  shape(pen, [[-0.11, -0.16], [0.11, -0.16], [0.13, 0.14], [-0.13, 0.14]].map((p) => rot(p as Pt)), C.fireCore)
  shape(pen, [[-0.14, -0.2], [0.14, -0.2], [0.1, -0.26], [-0.1, -0.26]].map((p) => rot(p as Pt)), '#1A1A1A')
  shape(pen, [[-0.15, 0.14], [0.15, 0.14], [0.15, 0.19], [-0.15, 0.19]].map((p) => rot(p as Pt)), '#1A1A1A')
}

/** The far end's hay door: shut, jolting at each hit; on the fourth it gives and swings out. */
function hayDoor(pen: Pen, t: number): void {
  const hinge: Pt = [BX1 - 0.11, DOOR_HEAD]
  let ang = 0
  for (const h of DOOR_HITS.slice(0, 3)) ang += 0.14 * Math.max(0, ring(t - h, 3.5, 0.18))
  if (t >= DOOR_OPEN) {
    // Banged open, held up by its own swing while she gets through, then falling back to hang a little open.
    const s = t - DOOR_OPEN
    const up = 1.25 * (1 - Math.exp(-s / 0.1))
    const fall = smooth(t, DOOR_OPEN + 1.6, DOOR_OPEN + 2.6)
    ang = up * (1 - fall) + fall * (0.18 + 0.1 * ring(t - DOOR_OPEN - 2.6, 0.9, 0.6))
  }
  const L = ROAD - DOOR_HEAD - 0.04
  const th = 0.2
  const pt = (along: number, across: number): Pt => [hinge[0] + Math.sin(ang) * along + Math.cos(ang) * across, hinge[1] + Math.cos(ang) * along - Math.sin(ang) * across]
  const quad = [pt(0, -th / 2), pt(L, -th / 2), pt(L, th / 2), pt(0, th / 2)]
  shape(pen, quad, '#4A2420')
  line(pen, pt(L * 0.25, -th / 2), pt(L * 0.25, th / 2), C.barnDark, 0.6)
  line(pen, pt(L * 0.7, -th / 2), pt(L * 0.7, th / 2), C.barnDark, 0.6)
  ellipse(pen, hinge, 0.05, 0.05, '#0A0A0A')
  // Splinters as it gives.
  const k = flash(t - DOOR_OPEN, 0.3)
  if (k > 0.02) for (let i = 0; i < 6; i++) {
    const s = t - DOOR_OPEN
    const x = DOOR_FACE + 0.3 + s * (1.5 + hash(i, 91) * 2)
    const y = ROAD - 0.9 - s * (1 + hash(i, 92) * 2) + 6 * s * s
    line(pen, [x, y], [x + 0.12, y - 0.04], '#4A2420', 0.8)
  }
  void DOOR_FACE
}

/* ------------------------------------------------------------------ the airfield */

export const TAIL_X = DOOR_X - 5.6
export const NOSE_X = DOOR_X + 24
const FUS_BOT = ROAD - 1.5
const FUS_TOP = ROAD - 5.0
/** How far the cabin is shown in section: from as he climbs in. */
export const reveal = (t: number) => smooth(t, STEP_TIMES[4], IN_CABIN)

export function drawAirfield(pen: Pen, t: number, f: Frame): void {
  if (f.x1 < APRON_FROM - 6) return
  // The hangar, an arched shed, its door a slot of light; a beacon on a mast.
  const h0 = DOOR_X + 14
  const h1 = DOOR_X + 27
  const hy = ROAD - 0.42
  const arch: Pt[] = []
  for (let i = 0; i <= 16; i++) {
    const u = i / 16
    arch.push([h0 + (h1 - h0) * u, hy - 6.2 * Math.sin(u * Math.PI) ** 0.6])
  }
  shape(pen, [[h0, hy], ...arch, [h1, hy]], C.hangar)
  for (let i = 1; i < 8; i++) {
    const u = i / 8
    line(pen, [h0 + (h1 - h0) * u, hy], [h0 + (h1 - h0) * u, hy - 6.2 * Math.sin(u * Math.PI) ** 0.6], C.hangarRib, 0.6)
  }
  rect(pen, h0 + 3, hy - 3.2, h0 + 10, hy, '#0D1316')
  rect(pen, h0 + 6.2, hy - 3.2, h0 + 6.8, hy, C.hangarDoor)
  glow(pen, [h0 + 6.5, hy - 1.2], 3, C.hangarDoor, 0.25)
  const bx = h1 + 3
  line(pen, [bx, hy], [bx, hy - 7.5], '#0E1416', 1.2)
  for (let k = 0; k < 6; k++) line(pen, [bx - 0.3 + k * 0.02, hy - k * 1.25], [bx + 0.3 - k * 0.02, hy - (k + 1) * 1.25], '#0E1416', 0.5)
  const sweep = (t * 0.55) % 1
  const beacon: Pt = [bx, hy - 7.7]
  glow(pen, beacon, 0.9, sweep < 0.5 ? C.green : C.runWhite, 0.55 + 0.45 * Math.cos(sweep * Math.PI * 4))
  ellipse(pen, beacon, 0.1, 0.1, sweep < 0.5 ? C.green : C.runWhite)
  // Runway lights: a far row and a near row.
  for (let x = Math.ceil(Math.max(f.x0, APRON_FROM + 1) / 1.6) * 1.6; x < f.x1 + 1; x += 1.6) {
    const tw = 0.8 + 0.2 * Math.sin(t * 2 + x)
    glow(pen, [x, ROAD - 0.55], 0.28, C.blue, 0.5 * tw)
    ellipse(pen, [x, ROAD - 0.55], 0.03, 0.025, C.blue)
  }
  for (let x = Math.ceil(Math.max(f.x0, APRON_FROM + 3) / 2.4) * 2.4; x < f.x1 + 1; x += 2.4) {
    glow(pen, [x, ROAD + 0.42], 0.45, C.runWhite, 0.45)
    rect(pen, x - 0.05, ROAD + 0.38, x + 0.05, ROAD + 0.48, C.runWhite)
  }
  drawPlane(pen, t)
  drawStair(pen, t)
}

/** The airliner: a long, slightly curved fuselage, triple tail, four props; unmarked. Facing right. */
function drawPlane(pen: Pen, t: number): void {
  const top = (x: number) => {
    // The fuselage's top line: rises off the tail, a slight hump, down to the nose.
    if (x < TAIL_X + 6) {
      const u = (x - TAIL_X) / 6
      return FUS_TOP + 0.55 * (1 - u) ** 2 + 0.05
    }
    if (x > NOSE_X - 4) {
      const u = (x - (NOSE_X - 4)) / 4
      return FUS_TOP + 0.2 + 1.4 * u * u
    }
    return FUS_TOP + 0.05 - 0.15 * Math.sin(((x - TAIL_X - 6) / (NOSE_X - TAIL_X - 10)) * Math.PI)
  }
  const bot = (x: number) => {
    if (x < TAIL_X + 9) {
      const u = (x - TAIL_X) / 9
      return FUS_BOT - 2.6 * (1 - u) ** 1.8
    }
    if (x > NOSE_X - 3) {
      const u = (x - (NOSE_X - 3)) / 3
      return FUS_BOT - 1.1 * u * u
    }
    return FUS_BOT
  }
  const N = 48
  const outline: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const x = TAIL_X + ((NOSE_X - TAIL_X) * i) / N
    outline.push([x, top(x)])
  }
  outline.push([NOSE_X + 0.25, (top(NOSE_X) + bot(NOSE_X)) / 2])
  for (let i = N; i >= 0; i--) {
    const x = TAIL_X + ((NOSE_X - TAIL_X) * i) / N
    outline.push([x, bot(x)])
  }
  // The far wing and engines, behind.
  wing(pen, DOOR_X + 6.2, -0.35, C.planeDark, t, 0.85)
  // The tail: the tailplane, and its three fins, the far ones set back and darker.
  const tp = ROAD - 4.45
  shape(pen, [[TAIL_X - 1.3, tp - 0.06], [TAIL_X + 2.6, tp - 0.2], [TAIL_X + 3.3, tp + 0.02], [TAIL_X - 1.1, tp + 0.12]], C.planeDark)
  fin(pen, TAIL_X - 0.15, tp - 0.3, 2.5, mix(C.planeDark, '#000000', 0.25))
  fin(pen, TAIL_X + 0.75, top(TAIL_X + 1.2) + 0.1, 2.25, C.planeDark)
  shape(pen, outline, C.plane)
  // Shading: the belly darker, a light along the top.
  const belly: Pt[] = []
  for (let i = 0; i <= N; i++) {
    const x = TAIL_X + ((NOSE_X - TAIL_X) * i) / N
    belly.push([x, bot(x) - 0.55 * Math.min(1, (bot(x) - top(x)) / 3.5)])
  }
  for (let i = N; i >= 0; i--) {
    const x = TAIL_X + ((NOSE_X - TAIL_X) * i) / N
    belly.push([x, bot(x)])
  }
  shape(pen, belly, C.planeBelly)
  const ridge: Pt[] = []
  for (let i = 2; i <= N - 2; i++) {
    const x = TAIL_X + ((NOSE_X - TAIL_X) * i) / N
    ridge.push([x, top(x) + 0.12])
  }
  path(pen, ridge, C.planeLight, 0.9)
  fin(pen, TAIL_X - 0.75, tp + 0.25, 2.75, C.plane)
  shape(pen, [[TAIL_X - 1.6, tp + 0.02], [TAIL_X + 1.2, tp - 0.06], [TAIL_X + 1.6, tp + 0.1], [TAIL_X - 1.4, tp + 0.16]], C.planeLight)
  // The cheatline: a dark band down the windows.
  const band: Pt[] = []
  const bx0 = TAIL_X + 2.5
  const bx1 = NOSE_X - 1.2
  for (let i = 0; i <= 30; i++) {
    const x = bx0 + ((bx1 - bx0) * i) / 30
    band.push([x, WIN_C[1] - 0.42 + (x < TAIL_X + 6 ? -0.3 * ((TAIL_X + 6 - x) / 3.5) : 0)])
  }
  for (let i = 30; i >= 0; i--) {
    const x = bx0 + ((bx1 - bx0) * i) / 30
    band.push([x, WIN_C[1] + 0.42 + (x < TAIL_X + 6 ? -0.3 * ((TAIL_X + 6 - x) / 3.5) : 0)])
  }
  shape(pen, band, C.stripe)
  // The round windows, lit.
  for (let x = WIN_X; x < NOSE_X - 4; x += 1.5) {
    ellipse(pen, [x, WIN_C[1]], WIN_R + 0.04, WIN_R + 0.04, C.planeDark)
    ellipse(pen, [x, WIN_C[1]], WIN_R, WIN_R, mix(C.winDim, C.win, 0.75))
  }
  // The cockpit's glazing.
  shape(pen, [[NOSE_X - 2.6, top(NOSE_X - 2.6) + 0.35], [NOSE_X - 1.4, top(NOSE_X - 1.4) + 0.3], [NOSE_X - 1.0, top(NOSE_X - 1.0) + 0.7], [NOSE_X - 2.6, top(NOSE_X - 2.6) + 0.75]], C.glass)
  // The rear door, open, its leaf folded back against the skin.
  rect(pen, DOOR_X - 0.08, FLOOR - 2.15, DOOR_X + 0.9, FLOOR + 0.02, '#2A221D')
  rect(pen, DOOR_X - 0.02, FLOOR - 2.05, DOOR_X + 0.84, FLOOR, mix('#3B2E26', C.lamp, 0.25))
  rect(pen, DOOR_X - 1.05, FLOOR - 2.1, DOOR_X - 0.12, FLOOR - 0.02, C.planeLight)
  line(pen, [DOOR_X - 1.05, FLOOR - 2.1], [DOOR_X - 0.12, FLOOR - 2.1], C.planeDark, 0.6)
  glow(pen, [DOOR_X + 0.4, FLOOR - 1], 1.6, C.lamp, 0.22)
  // The near wing and its two engines, in front.
  wing(pen, DOOR_X + 6.6, 0.25, C.plane, t, 1)
  // The landing gear.
  const gear = (x: number, wheels: number) => {
    rect(pen, x - 0.07, FUS_BOT - 0.2, x + 0.07, ROAD - 0.45, '#1C2226')
    for (let i = 0; i < wheels; i++) {
      ellipse(pen, [x - 0.25 + i * 0.5, ROAD - 0.42], 0.42, 0.42, C.tyre)
      ellipse(pen, [x - 0.25 + i * 0.5, ROAD - 0.42], 0.18, 0.18, '#4F575B')
    }
  }
  gear(DOOR_X + 9.1, 2)
  gear(NOSE_X - 3.2, 1)
  // The section: the cabin, as he climbs into it.
  const rv = reveal(t)
  if (rv > 0) cabin(pen, t, rv, top, bot)
}

/** One of the tail's fins: a tall oval cut flat at its foot, its top leaning back. */
function fin(pen: Pen, x: number, foot: number, h: number, col: string): void {
  const pts: Pt[] = [
    [x + 0.95, foot + 0.15],
    [x + 0.55, foot - h * 0.35],
    [x + 0.15, foot - h * 0.8],
    [x - 0.15, foot - h],
    [x - 0.5, foot - h * 0.9],
    [x - 0.6, foot - h * 0.55],
    [x - 0.45, foot - h * 0.15],
    [x - 0.3, foot + 0.3],
  ]
  blob(pen, pts, col)
  line(pen, [x - 0.42, foot - h * 0.3], [x - 0.48, foot - h * 0.75], mix(col, '#000000', 0.2), 0.5)
}

/** A wing seen almost edge on, with the two engines on this side (or the far side, set back and darker). */
function wing(pen: Pen, x: number, dy: number, col: string, t: number, near: number): void {
  const y = FUS_BOT - 0.5 + dy
  shape(pen, [[x - 0.4, y - 0.25], [x + 4.2, y - 0.38], [x + 5.0, y - 0.18], [x + 3.6, y + 0.22], [x - 0.6, y + 0.12]], mix(col, '#000000', 0.15))
  shape(pen, [[x + 0.5, y + 0.1], [x + 4.4, y + 0.1], [x + 3.4, y + 0.9 * near], [x + 0.9, y + 0.9 * near]], col)
  // Engines: nacelles forward of the wing, props spinning up as the engines start.
  const spin = smooth(t, STEP_TIMES[3], ON_SILL + 0.4)
  for (const [i, ex] of [x + 0.4, x + 2.9].entries()) {
    const ey = y - 0.05 + i * 0.12 * near
    shape(pen, [[ex - 0.2, ey - 0.25], [ex + 2.0, ey - 0.32], [ex + 2.5, ey - 0.1], [ex + 2.5, ey + 0.15], [ex + 2.0, ey + 0.32], [ex - 0.2, ey + 0.28]], mix(col, C.planeLight, 0.2))
    ellipse(pen, [ex + 2.55, ey], 0.12, 0.12, '#2A3134')
    const px = ex + 2.65
    if (spin > 0.6) {
      const ctx = ctxOf(pen.p)
      ctx.save()
      ctx.globalAlpha = 0.35 * (spin - 0.6) / 0.4
      ellipse(pen, [px, ey], 0.06, 1.25, C.planeLight)
      ctx.restore()
    }
    const a = t * (spin * 40) + i
    const blades = 3
    for (let b = 0; b < blades; b++) {
      const q = a + (b * Math.PI * 2) / blades
      const yy = Math.sin(q) * 1.25
      const ww = Math.abs(Math.cos(q)) * 0.06 + 0.03
      if (spin < 0.95) rect(pen, px - ww, ey + Math.min(0, yy), px + ww, ey + Math.max(0, yy), '#15191B')
    }
    // A cough of flame from the exhaust as each one catches.
    const cough = flash(t - (STEP_TIMES[4] + i * 0.535), 0.12)
    if (cough > 0.02 && near > 0.9) glow(pen, [ex + 1.2, ey + 0.3], 0.5, C.fireGold, 0.8 * cough)
  }
}

/** The cabin in section: the far wall with its round windows and their sills, seats, racks, lamps; the skin cut. */
function cabin(pen: Pen, t: number, rv: number, top: (x: number) => number, bot: (x: number) => number): void {
  const ctx = ctxOf(pen.p)
  const x0 = DOOR_X - 0.05
  const x1 = DOOR_X + 6.4
  const ceil = FUS_TOP + 0.3
  // The cut skin round the opening; everything inside it is clipped to it.
  const ring0: Pt[] = []
  for (let i = 0; i <= 12; i++) ring0.push([x0 + ((x1 - x0) * i) / 12, top(x0 + ((x1 - x0) * i) / 12)])
  for (let i = 12; i >= 0; i--) ring0.push([x0 + ((x1 - x0) * i) / 12, bot(x0 + ((x1 - x0) * i) / 12)])
  ctx.save()
  ctx.globalAlpha = rv
  shape(pen, ring0, C.planeDark)
  ctx.beginPath()
  ring0.forEach(([x, y], i) => (i ? ctx.lineTo(x * pen.k, (y + (i <= 12 ? 0.08 : -0.08)) * pen.k) : ctx.moveTo(x * pen.k, (y + 0.08) * pen.k)))
  ctx.closePath()
  ctx.clip()
  // The far wall.
  rect(pen, x0, ceil, x1, FLOOR, C.cabinWall)
  vgrad(pen, x0, ceil, x1, FLOOR, [
    [0, C.cabinShade, 0.6],
    [0.4, C.cabinWall, 0],
    [1, C.cabinShade, 0.5],
  ])
  // The windows on it, the airfield beyond each; the sills.
  for (let wx = WIN_X; wx < x1 - 0.3; wx += 1.5) {
    const c: Pt = [wx, WIN_C[1]]
    ellipse(pen, c, WIN_R + 0.08, WIN_R + 0.08, C.cabinShade)
    windowView(pen, t, c)
    ellipse(pen, c, WIN_R + 0.08, WIN_R + 0.08, null, 1.2, C.cabinShade)
    rect(pen, wx - 0.36, SILL, wx + 0.36, SILL + 0.07, mix(C.cabinShade, '#000000', 0.2))
    line(pen, [wx - 0.36, SILL], [wx + 0.36, SILL], C.cabinWall, 0.5)
  }
  // The hat rack and the ceiling's lamps.
  rect(pen, x0, ceil + 0.25, x1, ceil + 0.35, C.rack)
  for (let lx = x0 + 0.9; lx < x1; lx += 1.5) {
    rect(pen, lx - 0.15, ceil, lx + 0.15, ceil + 0.06, C.lamp)
    glow(pen, [lx, ceil + 0.2], 1.0, C.lamp, 0.35 * smooth(t, IN_CABIN - 0.02, IN_CABIN + 0.05) + 0.1)
  }
  // The floor, in section.
  rect(pen, x0, FLOOR, x1, FLOOR + 0.12, C.cabinFloor)
  // Seats, in profile, facing the nose: the window's between two.
  for (let sx = WIN_X + 0.62; sx < x1 - 0.4; sx += 1.5) seat(pen, sx)
  ctx.restore()
  void t
}

function seat(pen: Pen, x: number): void {
  // An airliner's seat in profile, facing the nose: a deep, rounded back, the cushion, the armrest, its pedestal.
  blob(pen, [[x - 0.12, FLOOR - 0.5], [x - 0.3, FLOOR - 1.0], [x - 0.36, FLOOR - 1.4], [x - 0.2, FLOOR - 1.5], [x + 0.02, FLOOR - 1.36], [x + 0.08, FLOOR - 0.6]], C.seat)
  blob(pen, [[x - 0.12, FLOOR - 0.42], [x - 0.08, FLOOR - 0.62], [x + 0.52, FLOOR - 0.64], [x + 0.6, FLOOR - 0.5], [x + 0.5, FLOOR - 0.38]], C.seatLight)
  rect(pen, x - 0.05, FLOOR - 0.82, x + 0.42, FLOOR - 0.74, '#3A1D18')
  rect(pen, x + 0.02, FLOOR - 0.4, x + 0.36, FLOOR - 0.06, '#2A1714')
  rect(pen, x - 0.08, FLOOR - 0.08, x + 0.48, FLOOR, '#2A1714')
  blob(pen, [[x - 0.32, FLOOR - 1.38], [x - 0.22, FLOOR - 1.47], [x - 0.02, FLOOR - 1.36], [x - 0.08, FLOOR - 1.22], [x - 0.3, FLOOR - 1.24]], C.frost)
}

/** Through a round window: the night, the far side of the field, its lights, a tractor's lamps going by. */
function windowView(pen: Pen, t: number, c: Pt): void {
  const ctx = ctxOf(pen.p)
  const { k } = pen
  ctx.save()
  ctx.beginPath()
  ctx.arc(c[0] * k, c[1] * k, WIN_R * k, 0, Math.PI * 2)
  ctx.clip()
  vgrad(pen, c[0] - WIN_R, c[1] - WIN_R, c[0] + WIN_R, c[1] + WIN_R, [
    [0, C.skyMid, 1],
    [0.55, C.skyLow, 1],
    [0.56, C.field, 1],
    [1, C.fieldNear, 1],
  ])
  const hy = c[1] + 0.03
  // Far runway lights, and a tow tractor's lamps going by right to left.
  for (let i = -3; i <= 3; i++) ellipse(pen, [c[0] + i * 0.11 + 0.03, hy + 0.04], 0.012, 0.01, C.blue)
  const u = ((t - (IN_CABIN - 0.6)) * 0.35 + c[0] * 0.13) % 1.4
  const tx = c[0] + WIN_R + 0.1 - u * 0.9
  glow(pen, [tx, hy + 0.08], 0.14, C.farmLight, 0.8)
  ellipse(pen, [tx, hy + 0.08], 0.02, 0.02, C.winWarm)
  ellipse(pen, [tx + 0.06, hy + 0.08], 0.02, 0.02, C.winWarm)
  const sweep = (t * 0.55) % 1
  glow(pen, [c[0] + 0.15, hy - 0.05], 0.12, sweep < 0.5 ? C.green : C.runWhite, 0.5 + 0.5 * Math.cos(sweep * Math.PI * 4))
  glow(pen, [c[0], c[1] - 0.12], 0.4, C.white, 0.06)
  ctx.restore()
}

/** The boarding stair, rolled up to the door: six steps, a rail, its little wheels. */
function drawStair(pen: Pen, t: number): void {
  const head = DOOR_X
  // The stringer and the frame underneath.
  shape(pen, [[SF - 0.05, ROAD - 0.35], [head - 0.02, FLOOR - 0.02], [head - 0.02, FLOOR + 0.25], [SF + 0.35, ROAD - 0.25]], C.stairDark)
  rect(pen, SF - 0.2, ROAD - 0.45, head, ROAD - 0.32, C.stairDark)
  line(pen, [head - 0.3, FLOOR + 0.2], [head - 0.3, ROAD - 0.4], C.stairDark, 1.2)
  for (const wx of [SF + 0.25, head - 0.4]) {
    ellipse(pen, [wx, ROAD - 0.17], 0.17, 0.17, C.tyre)
    ellipse(pen, [wx, ROAD - 0.17], 0.06, 0.06, '#6B7275')
  }
  // The steps: treads and risers, each catching a little light as he lands on it.
  for (let k = 1; k <= STEPS; k++) {
    const x0 = SF + STEP * (k - 1)
    const x1 = SF + STEP * k
    const y = ROAD - STEP * k
    const hit = flash(t - STEP_TIMES[k - 1], 0.15)
    rect(pen, x0, y, x1 + (k === STEPS ? 0.0 : 0.03), y + 0.07, mix(C.stair, C.white, 0.5 * hit))
    rect(pen, x0, y + 0.07, x0 + 0.05, y + STEP, C.stairDark)
  }
  // The rail.
  line(pen, [SF + 0.1, ROAD - 1.25], [head - 0.08, FLOOR - 1.0], C.stair, 0.9)
  for (let k = 0; k <= STEPS; k += 2) {
    const x = SF + 0.1 + STEP * k * 0.98
    const y = ROAD - STEP * Math.max(1, k)
    line(pen, [x, y], [x, y - 1.0 - 0.05], C.stair, 0.6)
  }
}

/* ------------------------------------------------------------------ the cab and the ambulance (the part's) */

export function drawTheCab(pen: Pen, t: number): void {
  const x = cabX(t)
  drawCab(pen, [x, 0], { t, rolled: x - START_X, wally: true, lights: 1, bob: bob(t) })
}

const ambFront = (t: number) => ambX(t) - AMB_LEN

/** The cot: its frame and mattress, out of the back doors and in again. */
function cot(pen: Pen, t: number): void {
  const A = ambX(t)
  const out = cotOut(t)
  if (out <= 0 && (t < AMB_STOP || t > COT_IN)) return
  const end = A + out * COT_REACH
  const x0 = end - 2.2
  rect(pen, x0, COT_TOP, end, COT_TOP + 0.08, '#BFC4C0')
  rect(pen, x0 + 0.05, COT_TOP - 0.06, end - 0.05, COT_TOP, '#E7E9E4')
  // Its legs, down once it is out.
  const legs = t >= COT_OUT && t < COT_IN0 + 0.15 ? 1 - smooth(t, COT_IN0, COT_IN0 + 0.15) : smooth(t, COT_OUT - 0.18, COT_OUT)
  if (legs > 0.02) {
    const ly = COT_TOP + 0.08 + (ROAD - 0.08 - COT_TOP - 0.08) * legs
    line(pen, [end - 0.25, COT_TOP + 0.08], [end - 0.55, ly], '#8E9592', 0.8)
    line(pen, [end - 0.55, COT_TOP + 0.08], [end - 0.25, ly], '#8E9592', 0.8)
    ellipse(pen, [end - 0.25, ly + 0.04], 0.05, 0.05, C.tyre)
    ellipse(pen, [end - 0.55, ly + 0.04], 0.05, 0.05, C.tyre)
  }
  line(pen, [end, COT_TOP + 0.02], [end + 0.2, COT_TOP - 0.02], '#8E9592', 0.8)
}

/** The attendant: out of the far side, round to the back, the cot, the doors, and back. */
function attendantX(t: number): number | null {
  const A = ambX(t)
  if (t < AMB_STOP + 0.1 || t > LEAVE) return null
  const keys: [number, number][] = [
    [AMB_STOP + 0.1, A - 1.6],
    [DOORS_OPEN, A + 0.9],
    [COT_OUT, A + COT_REACH + 0.5],
    [COT_IN0, A + COT_REACH + 0.5],
    [COT_IN, A + 0.95],
    [SHUT + 0.15, A + 0.75],
    [LEAVE, A - 1.8],
  ]
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, xa] = keys[i]
    const [tb, xb] = keys[i + 1]
    if (t <= tb) {
      const u = Math.max(0, Math.min(1, (t - ta) / (tb - ta)))
      return xa + (xb - xa) * (u * u * (3 - 2 * u))
    }
  }
  return null
}

/** The rear door's width as it shows, swung open toward us (0 shut). */
function doorOpen(t: number): number {
  return 0.62 * (smooth(t, DOORS_OPEN - 0.2, DOORS_OPEN) - smooth(t, SHUT - 0.22, SHUT))
}

/** The red light's flash: on the beat, and its turning beam. */
function redFlash(t: number): number {
  let v = 0
  for (const b of RED_FLASHES) v = Math.max(v, flash(t - b, 0.16))
  return v
}

/** The ambulance, all but its body (or, `body`, the body only: what the over-layer draws while Rachel goes in). */
export function drawAmbulance(pen: Pen, t: number, layer: 'all' | 'under' | 'body'): void {
  if (t < at(75, 1) - 0.5) return
  const A = ambX(t)
  const x0 = ambFront(t)
  const ax = attendantX(t)
  const moving = t < AMB_STOP || t > LEAVE
  if (layer !== 'body') {
    // The headlights' beam ahead (to the left) as it drives.
    if (moving) {
      const ctx = ctxOf(pen.p)
      const g = ctx.createLinearGradient(x0 * pen.k, 0, (x0 - 6) * pen.k, 0)
      g.addColorStop(0, rgba(pen, C.winWarm, 0.22))
      g.addColorStop(1, rgba(pen, C.winWarm, 0))
      ctx.save()
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(x0 * pen.k, (ROAD - 0.95) * pen.k)
      ctx.lineTo((x0 - 6) * pen.k, (ROAD - 1.3) * pen.k)
      ctx.lineTo((x0 - 6) * pen.k, (ROAD + 0.1) * pen.k)
      ctx.lineTo(x0 * pen.k, (ROAD - 0.8) * pen.k)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    cot(pen, t)
    if (ax !== null && ax < A + 0.3) figure(pen, ax, ROAD, { coat: C.coatWhite, hat: 'cap', face: 1, h: 3.1 })
  }
  if (layer !== 'under') ambBody(pen, t, A, x0)
  if (layer !== 'body') {
    if (ax !== null && ax >= A + 0.3) figure(pen, ax, ROAD, { coat: C.coatWhite, hat: 'cap', face: -1, h: 3.1, arm: 0.2 })
  }
  // The light: a red dome on the roof, its flash on the beats, the beam turning.
  const fl = redFlash(t)
  const dome: Pt = [x0 + 2.35, ROAD - AMB_ROOF - 0.16]
  if (layer !== 'under') {
    glow(pen, dome, 1.2 + 3.2 * fl, C.ambLight, 0.25 + 0.6 * fl)
    if (fl > 0.05) glow(pen, [dome[0], ROAD - 0.5], 4 * fl, C.ambLight, 0.18 * fl)
  }
  void ROAD
}

function ambBody(pen: Pen, t: number, A: number, x0: number): void {
  const roof = ROAD - AMB_ROOF
  const fl = redFlash(t)
  const roll = ambX(t) - ambX(AMB_STOP)
  // Shadow.
  ellipse(pen, [(x0 + A) / 2, ROAD + 0.03], AMB_LEN * 0.55, 0.1, '#000000')
  // Body: a long hood, the windscreen, the high back.
  const body: Pt[] = [
    [x0, ROAD - 0.3],
    [x0 - 0.05, ROAD - 1.0],
    [x0 + 0.25, ROAD - 1.2],
    [x0 + 1.55, ROAD - 1.3],
    [x0 + 2.05, roof + 0.12],
    [x0 + 2.25, roof],
    [A - 0.2, roof],
    [A, roof + 0.2],
    [A + 0.02, ROAD - 0.3],
  ]
  shape(pen, body, C.amb)
  rect(pen, x0, ROAD - 0.55, A + 0.02, ROAD - 0.3, C.ambShade)
  // The red band, the windows: the driver's dark; the back's frosted and lit.
  rect(pen, x0 + 0.05, ROAD - 1.12, A, ROAD - 0.98, C.ambRed)
  shape(pen, [[x0 + 1.75, ROAD - 1.32], [x0 + 2.12, roof + 0.18], [x0 + 2.9, roof + 0.18], [x0 + 2.9, ROAD - 1.32]], C.glass)
  rect(pen, x0 + 3.1, roof + 0.22, A - 0.25, ROAD - 1.42, C.frost)
  glow(pen, [x0 + 4.2, roof + 0.7], 1.2, C.frost, 0.2)
  line(pen, [x0 + 3.0, roof + 0.1], [x0 + 3.0, ROAD - 0.35], C.ambShade, 0.6)
  // Chrome: bumpers, grille, the headlamp; the tail light at the back.
  rect(pen, x0 - 0.12, ROAD - 0.48, x0 + 0.5, ROAD - 0.34, C.chrome)
  rect(pen, A - 0.35, ROAD - 0.48, A + 0.1, ROAD - 0.34, C.chrome)
  for (let i = 0; i < 4; i++) line(pen, [x0 - 0.02, ROAD - 0.92 + i * 0.1], [x0 - 0.02, ROAD - 0.86 + i * 0.1], '#7E8384', 0.8)
  ellipse(pen, [x0 + 0.08, ROAD - 0.95], 0.07, 0.11, C.winWarm)
  glow(pen, [x0 - 0.05, ROAD - 0.95], 0.8, C.winWarm, 0.45)
  rect(pen, A - 0.06, ROAD - 1.0, A + 0.04, ROAD - 0.7, '#D23A2A')
  const tail = t > LEAVE ? 1 : 0.5
  glow(pen, [A + 0.05, ROAD - 0.85], 0.5 + 0.4 * tail, '#D23A2A', 0.4 + 0.35 * tail)
  // The dome.
  rect(pen, x0 + 2.2, roof - 0.06, x0 + 2.5, roof, '#5A5A5A')
  ellipse(pen, [x0 + 2.35, roof - 0.16], 0.13, 0.12, mix('#7A1810', C.ambLight, 0.4 + 0.6 * fl))
  // Wheels, turning as it rolls.
  for (const wx of [x0 + 1.05, A - 1.0]) {
    const c: Pt = [wx, ROAD - 0.38]
    ellipse(pen, [c[0], c[1] - 0.03], 0.48, 0.5, '#2B2F2E')
    ellipse(pen, c, 0.38, 0.38, C.tyre)
    ellipse(pen, c, 0.2, 0.2, C.chrome)
    const a = roll / 0.38
    for (let i = 0; i < 3; i++) {
      const q = a + (i * Math.PI * 2) / 3
      line(pen, [c[0] + Math.cos(q) * 0.06, c[1] + Math.sin(q) * 0.06], [c[0] + Math.cos(q) * 0.17, c[1] + Math.sin(q) * 0.17], '#7E8384', 0.8)
    }
  }
}

/** The near back door, swung open toward us. Drawn over the cot (and over her as she goes in). */
export function drawAmbDoor(pen: Pen, t: number): void {
  const w = doorOpen(t)
  if (w <= 0.01) return
  const A = ambX(t)
  const roof = ROAD - AMB_ROOF
  rect(pen, A, roof + 0.18, A + w, ROAD - 0.32, C.amb)
  rect(pen, A + w * 0.18, roof + 0.32, A + w * 0.82, ROAD - 1.45, mix(C.frost, '#FFFFFF', 0.2))
  rect(pen, A, ROAD - 1.12, A + w, ROAD - 0.98, C.ambRed)
  line(pen, [A + w, roof + 0.2], [A + w, ROAD - 0.32], C.ambShade, 0.6)
  glow(pen, [A + 0.2, ROAD - 1.2], 1.6, C.frost, 0.22)
}


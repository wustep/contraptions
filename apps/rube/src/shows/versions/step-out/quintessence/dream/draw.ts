import type { Pt } from '../../../../../parts'
import { hash } from '../kit'
import { level } from '../music'
import {
  BEAM,
  BED,
  BRAKE,
  BURST,
  BX,
  BX1,
  CAR_BACK,
  CAR_DOWN,
  carY,
  CEIL,
  DECK,
  DOOR,
  DOORWAY,
  DRAIN,
  drained,
  FENCE,
  FLARES,
  GATE,
  GATE_UP,
  JOIST_X,
  joistY,
  LIP,
  PLAT_X0,
  ROOF,
  ROOM,
  SLAB,
  STREET,
  SX0,
  SX1,
  TOP_FLOOR,
  WALL,
  WIN,
  dogAt,
  type DogPose,
} from './geo'
import { blob, ctxOf, ellipse, flash, glow, line, path, rect, rgba, ring, shape, vgrad, type Pen } from './pen'

/**
 * The daydream's drawing: the night, the platform, the tracks and the pavement, the burning building cut open, the
 * dumbwaiter, the dog. Colours are past true (a warm violet night, fire in four warm values, none of them Life's red),
 * and every one goes through the pen's tone, which greys them all in the last bar.
 */

const C = {
  skyTop: '#120C2A',
  skyMid: '#24184A',
  skyLow: '#5A2650',
  far: '#191134',
  farLit: '#FFB45C',
  mid: '#1E1538',
  platform: '#4A4366',
  platFace: '#2A2440',
  platEdge: '#7C74A0',
  strip: '#C9A23E',
  canopy: '#1C1630',
  steel: '#3A3358',
  bed: '#181226',
  tie: '#2C2238',
  rail: '#B9B2D6',
  fence: '#0E0A18',
  pave: '#3E3456',
  paveTop: '#6E6290',
  under: '#140F22',
  brick: '#47264A',
  brickCut: '#7A4A6A',
  roomWall: '#5E2F52',
  shopWall: '#33233F',
  topWall: '#6A3048',
  slab: '#2B1A30',
  shaft: '#160F1E',
  wood: '#8A5634',
  woodDark: '#4E2E1E',
  rope: '#D8C7A8',
  iron: '#2E2848',
  post: '#4C4474',
  lamp: '#D9F0E0',
  street: '#FFE1A6',
  ember: '#E2622A',
  flame1: '#E2622A',
  flame2: '#FF9437',
  flame3: '#FFC960',
  flame4: '#FFF0C8',
  smoke: '#3A2944',
  dog: '#D99044',
  dogInk: '#2A170E',
  glass: '#BFD8E8',
}

/** How hard each fire source is burning at `t`: a base, its flares, and the drain taking it down. */
function heat(t: number, src: number): number {
  const base = [0.55, 0.6, 0.5, 0.45][src]
  let v = base * (0.85 + 0.25 * level(t))
  for (const [ft, s] of FLARES) if (s === src && t >= ft) v += 0.9 * Math.exp(-(t - ft) / 0.45)
  // The first: before the window goes there is only a glow behind it.
  if (src === 0 && t < BURST) v = 0.25
  // The last flare on the drain, then down.
  if (t >= DRAIN) v = v * (1 - 0.65 * drained(t)) + 0.5 * Math.exp(-(t - DRAIN) / 0.25) * (1 - drained(t))
  return v
}

/** Fire's own clock: it slows to a stop as the colour drains, the picture going still. */
const fireT = (t: number) => (t < DRAIN ? t : DRAIN + (t - DRAIN) * (1 - 0.85 * drained(t)))

/**
 * One fire: a tongue of flame in four warm values, from a base `w` wide, `h` tall, leaning by `lean` (cells of tip
 * shift), alive on `t`.
 */
function flame(pen: Pen, base: Pt, w: number, h: number, t: number, seed: number, lean = 0, a = 1, only = -1): void {
  if (h <= 0.02) return
  const layers: [string, number, number, number][] = [
    [C.flame1, 1, 1, 0.92],
    [C.flame2, 0.72, 0.74, 0.95],
    [C.flame3, 0.46, 0.48, 0.95],
    [C.flame4, 0.22, 0.24, 0.75],
  ]
  const fl = (f: number, ph: number) => Math.sin(t * f + seed * 2.7 + ph)
  layers.forEach(([col, sw, sh, alpha], li) => {
    if (only >= 0 && li !== only) return
    const W = w * sw
    const H = h * sh * (0.88 + 0.12 * fl(7.3, 0))
    const tip = (lean + 0.14 * fl(4.1, 1)) * H
    const bx = base[0]
    const by = base[1]
    // A soft tongue: a round belly low down, drawn up into a tip that sways.
    const pts: Pt[] = [
      [bx - W * 0.5, by],
      [bx - W * (0.56 + 0.04 * fl(9, 2)), by - H * 0.22],
      [bx - W * 0.36 + tip * 0.35, by - H * 0.52],
      [bx - W * 0.08 + tip * 0.8, by - H * (0.84 + 0.04 * fl(11, 3))],
      [bx + tip, by - H],
      [bx + W * 0.16 + tip * 0.6, by - H * 0.66],
      [bx + W * 0.42 + tip * 0.25, by - H * 0.36],
      [bx + W * (0.52 + 0.04 * fl(8, 4)), by - H * 0.12],
      [bx + W * 0.4, by + W * 0.05],
      [bx - W * 0.4, by + W * 0.05],
    ]
    blob(pen, pts, col, alpha * a)
  })
}

/** A row of flames along a line: a fire bed. */
function fireBed(pen: Pen, x0: number, x1: number, y: number, h: number, t: number, seed: number, lean = 0, a = 1): void {
  const n = Math.max(2, Math.round((x1 - x0) / 0.32))
  // Layer by layer across the bed, so its tongues burn as one fire and not as a row of them.
  for (let layer = 0; layer < 4; layer++)
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const x = x0 + (x1 - x0) * u
      const hi = h * (0.55 + 0.45 * hash(i, seed)) * (0.85 + 0.15 * Math.sin(t * 3 + i))
      flame(pen, [x, y], ((x1 - x0) / n) * 1.9, hi, t, seed * 13 + i, lean, a, layer)
    }
}

/** Smoke: soft rolls rising from a point, drifting left on the night air. */
function smoke(pen: Pen, from: Pt, t: number, seed: number, amount: number, rise = 3.2): void {
  for (let i = 0; i < 6; i++) {
    const age = (t * 0.55 + i / 6 + hash(seed, i) * 0.3) % 1
    const x = from[0] - age * 1.6 + Math.sin(age * 4 + i) * 0.3
    const y = from[1] - age * rise
    const r = 0.35 + age * 1.1
    blob(
      pen,
      Array.from({ length: 7 }, (_, j) => {
        const a = (j / 7) * Math.PI * 2
        const rr = r * (0.8 + 0.25 * Math.sin(a * 3 + i + seed))
        return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75] as Pt
      }),
      C.smoke,
      0.42 * amount * Math.sin(age * Math.PI),
    )
  }
}

/* ------------------------------------------------------------------ the night */

export function drawSky(pen: Pen, f: { x0: number; y0: number; x1: number; y1: number; cx: number }, t: number): void {
  vgrad(pen, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, [
    [0, C.skyTop, 1],
    [0.55, C.skyMid, 1],
    [1, C.skyLow, 1],
  ])
  // The fire's glow on the night.
  const fire = Math.max(heat(t, 0), heat(t, 1)) * (t < BURST ? 0.6 : 1)
  glow(pen, [6.2, -3.4], 10, C.flame1, 0.22 * fire)
  // The window going, on the band's first downbeat: its light thrown right across the street onto the platform.
  glow(pen, [BX - 0.2, (WIN[0] + WIN[1]) / 2], 6.5, C.flame2, 0.45 * flash(t - BURST, 0.5))
  // The far city, a little slower than the near (it is further off): low, dark, a few windows lit.
  const px = f.cx * 0.55
  for (let i = -12; i < 28; i++) {
    const x = i * 0.95 + px + hash(i, 7) * 0.3
    const h = 1.3 + hash(i, 3) * 2.4 + (hash(i, 8) > 0.85 ? 1.4 : 0)
    const top = BED - 0.9 - h
    const w = 0.7 + hash(i, 4) * 0.5
    rect(pen, x, top, x + w, BED + 2, C.far)
    for (let j = 0; j < 9; j++) {
      if (hash(i, j, 9) > 0.16) continue
      const wx = x + 0.1 + (j % 3) * (w / 3.2)
      const wy = top + 0.25 + Math.floor(j / 3) * 0.5
      if (wy > BED - 1.2) continue
      rect(pen, wx, wy, wx + 0.09, wy + 0.13, C.farLit)
    }
  }
}

/* ------------------------------------------------------------------ platform, tracks, pavement */

export function drawGround(pen: Pen, t: number): void {
  // The tracks' bed, sunk below the deck, and the dark under everything.
  rect(pen, LIP - 0.05, BED, FENCE + 0.05, BED + 6, C.bed)
  rect(pen, LIP, BED - 0.07, FENCE, BED + 0.02, C.tie)
  for (const x of [0.85, 1.65]) {
    // A rail, end on: its head catching the lamp, its web and foot.
    shape(pen, [[x - 0.07, BED - 0.07], [x + 0.07, BED - 0.07], [x + 0.03, BED - 0.1], [x + 0.015, BED - 0.16], [x + 0.045, BED - 0.17], [x + 0.045, BED - 0.21], [x - 0.045, BED - 0.21], [x - 0.045, BED - 0.17], [x - 0.015, BED - 0.16], [x - 0.03, BED - 0.1]], C.steel)
    rect(pen, x - 0.045, BED - 0.215, x + 0.045, BED - 0.2, C.rail)
  }
  // The platform: canopy, columns, the deck and its face.
  rect(pen, PLAT_X0, -2.75, -0.15, -2.45, C.canopy)
  rect(pen, PLAT_X0, -2.47, -0.15, -2.42, C.steel)
  for (const x of [-2.6, -6.4]) rect(pen, x - 0.07, -2.45, x + 0.07, DECK, C.steel)
  rect(pen, PLAT_X0, DECK, LIP, DECK + 0.3, C.platform)
  rect(pen, PLAT_X0, DECK + 0.3, LIP - 0.04, BED + 6, C.platFace)
  rect(pen, LIP - 0.42, DECK, LIP, DECK + 0.045, C.strip)
  line(pen, [PLAT_X0, DECK], [LIP, DECK], C.platEdge, 0.9)
  // Its lamp: a cold light, the only one in the daydream, over where he sits.
  const lx = -1.15
  line(pen, [lx, -2.42], [lx, -1.95], C.steel, 0.8)
  shape(pen, [[lx - 0.2, -1.8], [lx + 0.2, -1.8], [lx + 0.1, -1.97], [lx - 0.1, -1.97]], C.steel)
  glow(pen, [lx, -1.75], 1.5, C.lamp, 0.16)
  rect(pen, lx - 0.16, -1.82, lx + 0.16, -1.79, C.lamp)
  // The pavement and the fence.
  rect(pen, FENCE - 0.05, STREET, BX1 + 8, BED + 6, C.under)
  rect(pen, FENCE, STREET, BX1 + 8, STREET + 0.12, C.pave)
  line(pen, [FENCE, STREET], [BX, STREET], C.paveTop, 0.9)
  rect(pen, FENCE - 0.05, STREET, FENCE + 0.02, BED + 6, C.platFace)
  // The street lamp she waits under.
  // A short iron lamp by the shop's door, its arm out over where she waits.
  const sx = 3.68
  const head: Pt = [2.78, -1.12]
  const lit = 1 - 0.6 * drained(t)
  glow(pen, [head[0], head[1] + 0.15], 2.0, C.street, 0.24 * lit)
  const ctx = ctxOf(pen.p)
  ctx.save()
  ctx.translate(head[0] * pen.k, STREET * pen.k)
  ctx.scale(1, 0.2)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.4 * pen.k)
  g.addColorStop(0, rgba(pen, C.street, 0.38 * lit))
  g.addColorStop(1, rgba(pen, C.street, 0))
  ctx.fillStyle = g
  ctx.fillRect(-1.4 * pen.k, -1.4 * pen.k, 2.8 * pen.k, 2.8 * pen.k)
  ctx.restore()
  line(pen, [sx, STREET], [sx, -1.0], C.post, 1.8)
  rect(pen, sx - 0.06, STREET - 0.25, sx + 0.06, STREET, C.post)
  path(pen, [[sx, -1.0], [sx - 0.15, -1.22], [head[0] + 0.15, -1.26]], C.post, 1.5)
  shape(pen, [[head[0] - 0.16, head[1]], [head[0] + 0.16, head[1]], [head[0] + 0.08, head[1] - 0.15], [head[0] - 0.08, head[1] - 0.15]], C.post)
  rect(pen, head[0] - 0.14, head[1] - 0.02, head[0] + 0.14, head[1] + 0.01, C.street)
}

/* ------------------------------------------------------------------ the building */

const WIN3: [number, number] = [-5.75, -4.75]

/** The building, cut open: its walls, floors, its rooms on fire, the shaft. */
export function drawBuilding(pen: Pen, t: number): void {
  const ft = fireT(t)
  // The neighbours behind it.
  rect(pen, BX1 - 0.2, ROOF - 2.2, BX1 + 6, STREET, C.mid)
  rect(pen, BX1 + 2.4, ROOF - 3.6, BX1 + 4.6, STREET, C.mid)
  // Rooms: the top floor ablaze, his room burning, the shop dark with smoke.
  const inner = BX + WALL
  rect(pen, inner, ROOF, BX1, TOP_FLOOR, C.topWall)
  rect(pen, inner, CEIL, SX0, ROOM, C.roomWall)
  rect(pen, inner, ROOM + SLAB, SX0, STREET, C.shopWall)
  // The fire's light in each.
  const h1 = heat(t, 1)
  const h0 = heat(t, 0)
  vgrad(pen, inner, ROOF, BX1, TOP_FLOOR, [
    [0, C.flame1, 0.25 + 0.2 * h1],
    [1, C.flame2, 0.35 + 0.25 * h1],
  ])
  vgrad(pen, inner, CEIL, SX0, ROOM, [
    [0, C.flame1, 0.45 * Math.min(1.3, h0)],
    [0.7, C.flame2, 0.18 * h0],
    [1, C.flame2, 0.32 * h0],
  ])
  // The room's wallpaper: a faint stripe, warm in the light.
  for (let x = inner + 0.3; x < SX0; x += 0.42) rect(pen, x, CEIL + 0.1, x + 0.05, ROOM, C.topWall)
  // A picture on the wall and a lamp knocked over: a room someone lives in.
  rect(pen, 5.25, -3.2, 5.95, -2.65, C.woodDark)
  rect(pen, 5.33, -3.12, 5.87, -2.73, C.flame3)
  // The shop below: the fire's light coming down its back, shelves and a counter in the smoke.
  vgrad(pen, inner, ROOM + SLAB, SX0, STREET, [
    [0, C.flame1, 0.16 * h0],
    [1, C.flame1, 0.02],
  ])
  for (const y of [-0.75, -0.25]) rect(pen, inner + 1.3, y, SX0 - 0.3, y + 0.05, C.slab)
  for (let i = 0; i < 9; i++) {
    const x = inner + 1.4 + i * 0.3
    const y = i % 2 ? -0.75 : -0.25
    rect(pen, x, y - 0.12 - 0.06 * hash(i, 2), x + 0.13, y, C.brickCut)
  }
  rect(pen, inner + 0.5, STREET - 0.55, inner + 1.5, STREET, C.slab)
  rect(pen, inner + 0.45, STREET - 0.6, inner + 1.55, STREET - 0.55, C.brickCut)
  // The shaft and its two openings.
  rect(pen, SX0, ROOF + 0.3, SX1, STREET, C.shaft)
  // Floors and the roof, cut.
  for (const [y0, y1] of [
    [TOP_FLOOR, CEIL],
    [ROOM, ROOM + SLAB],
    [ROOF - 0.3, ROOF],
  ] as const) {
    rect(pen, BX, y0, BX1, y1, C.slab)
    line(pen, [BX, y0], [BX1, y0], C.brickCut, 0.7)
  }
  // The shaft's walls through the floors, but open on the room and the shop.
  rect(pen, SX0 - 0.05, ROOF, SX0, CEIL, C.slab)
  rect(pen, SX0 - 0.05, ROOM + SLAB, SX0, ROOM + SLAB + 0.2, C.slab)
  // The front wall, with its window, its door and the top floor's window cut through.
  const wall = (y0: number, y1: number) => rect(pen, BX, y0, BX + WALL, y1, C.brick)
  wall(ROOF - 0.3, WIN3[0])
  wall(WIN3[1], WIN[0])
  wall(WIN[1], DOORWAY[0])
  // A cornice.
  rect(pen, BX - 0.18, ROOF - 0.5, BX1 + 0.1, ROOF - 0.3, C.brick)
  line(pen, [BX - 0.18, ROOF - 0.5], [BX1 + 0.1, ROOF - 0.5], C.brickCut, 0.7)
  // The back wall.
  rect(pen, SX1, ROOF - 0.3, BX1, STREET, C.brick)
  line(pen, [BX, ROOF - 0.3], [BX, STREET], C.brickCut, 0.6)
  // Sills.
  for (const y of [WIN[1], WIN3[1]]) rect(pen, BX - 0.1, y, BX + WALL + 0.02, y + 0.07, C.brickCut)
  // The window's glass, till it goes.
  if (t < BURST) {
    rect(pen, BX + 0.12, WIN[0], BX + 0.2, WIN[1], C.glass)
    glow(pen, [BX + 0.2, (WIN[0] + WIN[1]) / 2], 1.2, C.flame2, 0.3)
  }
  // Fire in the rooms: the top floor's, the room's back (behind where he rolls), the room's ceiling.
  fireBed(pen, inner + 0.2, BX1 - 0.4, TOP_FLOOR, 1.25 * h1, ft, 2, 0)
  fireBed(pen, inner + 0.6, SX0 - 0.15, ROOM, 0.95 * h0, ft, 5, 0)
  // The roof's fire.
  const h2 = heat(t, 2)
  fireBed(pen, BX + 0.6, BX1 - 0.4, ROOF - 0.5, 1.4 * h2, ft, 7, -0.15)
  smoke(pen, [6.4, ROOF - 1.4], ft, 1, 1 - 0.4 * drained(t), 4)
  smoke(pen, [BX - 0.4, WIN3[0] - 0.4], ft, 2, 0.7, 2.5)
  // Out of the windows.
  windowFire(pen, WIN3, heat(t, 1), ft, 11)
  if (t >= BURST) windowFire(pen, WIN, heat(t, 0) * 0.85, ft, 12)
  // The glass, flying out on the burst.
  shards(pen, t, BURST, [BX + 0.1, (WIN[0] + WIN[1]) / 2], 1)
  shards(pen, t, FLARES[1][0], [BX + 0.1, (WIN3[0] + WIN3[1]) / 2], 2)
}

/** Fire out of a window: tongues from its upper half, licking up the face of the wall. */
function windowFire(pen: Pen, win: [number, number], h: number, t: number, seed: number): void {
  const [top, bottom] = win
  glow(pen, [BX - 0.3, top], 1.3, C.flame2, 0.3 * Math.min(1, h))
  // Two tongues out of the window's head, side by side, licking up the wall's face.
  const y = top + (bottom - top) * 0.3
  for (let layer = 0; layer < 4; layer++) {
    flame(pen, [BX - 0.02, y], 0.7, 1.5 * h, t, seed * 7, 0.18, 1, layer)
    flame(pen, [BX - 0.42, y + 0.12], 0.55, 1.05 * h, t, seed * 7 + 1, -0.12, 1, layer)
  }
}

function shards(pen: Pen, t: number, at: number, from: Pt, seed: number): void {
  const s = t - at
  if (s < 0 || s > 1.2) return
  for (let i = 0; i < 9; i++) {
    const vx = -1.2 - 2.4 * hash(i, seed)
    const vy = -2.5 + 2.4 * hash(i, seed, 1)
    const x = from[0] + vx * s
    const y = from[1] + (hash(i, seed, 2) - 0.5) * 1.1 + vy * s + 6 * s * s
    const r = 0.04 + 0.03 * hash(i, seed, 3)
    const a = s * 9 + i
    shape(pen, [[x + Math.cos(a) * r, y + Math.sin(a) * r], [x + Math.cos(a + 2.2) * r, y + Math.sin(a + 2.2) * r], [x + Math.cos(a + 4) * r * 0.6, y + Math.sin(a + 4) * r * 0.6]], C.glass)
  }
}

/* ------------------------------------------------------------------ the machine */

const CAR_W0 = SX0 + 0.03
const CAR_W1 = SX1 - 0.03
const CAR_H = 0.95
const PULLEY: Pt = [(SX0 + SX1) / 2, CEIL - SLAB - 0.35]

/** The dumbwaiter: pulley, rope, counterweight, brake, and the car (its back and floor; the gate is drawn over). */
export function drawMachine(pen: Pen, t: number): void {
  const cy = ROOM + carY(t)
  const top = cy - CAR_H
  // The pulley wheel, turning as the car goes.
  const turn = carY(t) / 0.3
  ellipse(pen, PULLEY, 0.3, 0.3, C.iron, 0.9, C.rope)
  for (let i = 0; i < 3; i++) {
    const a = turn + (i * Math.PI * 2) / 3
    line(pen, PULLEY, [PULLEY[0] + Math.cos(a) * 0.27, PULLEY[1] + Math.sin(a) * 0.27], C.rope, 0.6)
  }
  // The counterweight in the shaft's back, going up as the car goes down.
  const cwX = SX1 - 0.12
  const cwY = ROOM - 0.4 + (DROP_RANGE - carY(t)) * 1
  line(pen, [PULLEY[0] - 0.29, PULLEY[1]], [PULLEY[0] - 0.29, top], C.rope, 0.8)
  line(pen, [cwX, PULLEY[1]], [cwX, cwY - 0.45], C.rope, 0.8)
  rect(pen, cwX - 0.09, cwY - 0.45, cwX + 0.09, cwY + 0.15, C.iron, 0.6, C.rope)
  // The brake: a lever on the pulley's housing that drops on BRAKE.
  const lever = BRAKE <= t ? Math.min(1, (t - BRAKE) / 0.12) : 0
  const la = -0.25 + lever * 1.1 + 0.08 * ring(t - BRAKE, 4, 0.2)
  const piv: Pt = [SX0 - 0.15, PULLEY[1] + 0.05]
  line(pen, piv, [piv[0] - Math.cos(la) * 0.55, piv[1] + Math.sin(la) * 0.55], C.iron, 1.6)
  ellipse(pen, [piv[0] - Math.cos(la) * 0.55, piv[1] + Math.sin(la) * 0.55], 0.07, 0.07, C.wood)
  ellipse(pen, piv, 0.04, 0.04, C.rope)
  // The car: a wooden box on its rope.
  rect(pen, CAR_W0, top, CAR_W1, cy, C.woodDark)
  for (let x = CAR_W0 + 0.15; x < CAR_W1; x += 0.22) line(pen, [x, top + 0.05], [x, cy - 0.05], C.wood, 0.5)
  rect(pen, CAR_W0 - 0.02, cy, CAR_W1 + 0.02, cy + 0.07, C.wood)
  rect(pen, CAR_W0 - 0.02, top - 0.06, CAR_W1 + 0.02, top, C.wood)
  // Its bump on the buffer, and its knock at the top.
  for (const at of [CAR_DOWN, CAR_BACK]) {
    const k = flash(t - at, 0.12)
    if (k > 0.02) glow(pen, [(CAR_W0 + CAR_W1) / 2, at === CAR_DOWN ? STREET : top - 0.06], 0.5, C.flame4, 0.3 * k)
  }
  // The buffer.
  rect(pen, SX0 + 0.25, STREET - 0.04 + 0.07, SX1 - 0.25, STREET + 0.07, C.iron)
}
const DROP_RANGE = STREET - ROOM

/** The gate across the car's open side: down from GATE to GATE_UP, folded up over the opening otherwise. */
export function drawGate(pen: Pen, t: number): void {
  const cy = ROOM + carY(t)
  const top = cy - CAR_H
  const down = t >= GATE && t < GATE_UP + 0.25 ? (t < GATE + 0.1 ? (t - GATE) / 0.1 : t >= GATE_UP ? 1 - (t - GATE_UP) / 0.25 : 1) : 0
  const bottom = top + 0.14 + (CAR_H - 0.14) * Math.max(0, Math.min(1, down))
  // A folding grille: verticals, and its cross-pieces in a lattice.
  const x0 = CAR_W0 - 0.04
  const x1 = CAR_W0 + 0.04
  line(pen, [x0, top], [x0, bottom], C.iron, 1.2)
  line(pen, [x1, top], [x1, bottom], C.iron, 1.2)
  const n = 6
  for (let i = 0; i < n; i++) {
    const y0 = top + ((bottom - top) * i) / n
    const y1 = top + ((bottom - top) * (i + 1)) / n
    line(pen, [x0, y0], [x1, y1], C.iron, 0.8)
    line(pen, [x1, y0], [x0, y1], C.iron, 0.8)
  }
  if (t >= GATE && t < GATE + 0.3) glow(pen, [CAR_W0, bottom], 0.35, C.flame4, 0.4 * flash(t - GATE, 0.1))
}

/** The burning joist, in the ceiling till it comes down behind him. */
export function drawJoist(pen: Pen, t: number): void {
  const y = joistY(t)
  const tilt = t < BEAM ? Math.min(0.25, Math.max(0, (t - (BEAM - 0.6)) * 0.4)) : 0.05
  const [x0, x1] = JOIST_X
  const dy = (x1 - x0) * tilt
  shape(pen, [[x0, y + dy], [x1, y], [x1, y + 0.16], [x0, y + dy + 0.16]], C.woodDark)
  flame(pen, [(x0 + x1) / 2, y], 0.9, 0.55 * (0.7 + 0.3 * Math.sin(t * 3)), fireT(t), 21, 0, 0.9)
  // Sparks where it lands.
  const s = t - BEAM
  if (s >= 0 && s < 0.7) {
    for (let i = 0; i < 10; i++) {
      const vx = (hash(i, 4) - 0.5) * 3
      const vy = -1.5 - 2 * hash(i, 5)
      const px = x0 + (x1 - x0) * hash(i, 6) + vx * s
      const py = ROOM - 0.1 - 0.15 * hash(i, 7) + vy * s * (0.5 + hash(i, 8)) + 6 * s * s
      if (py > ROOM - 0.02) continue
      ellipse(pen, [px, py], 0.02, 0.02, C.flame4)
    }
    glow(pen, [(x0 + x1) / 2, ROOM], 1.2, C.flame3, 0.5 * flash(s, 0.15))
  }
}

/** The shop's door: shut, then flung out on DOOR and swinging. Seen edge-on shut, face-on open. */
export function drawDoor(pen: Pen, t: number): void {
  const s = t - DOOR
  const open = s < 0 ? 0 : Math.min(1, 1 - Math.exp(-s / 0.07)) * 0.92 - 0.12 * (1 - Math.exp(-s / 0.9)) + 0.05 * ring(s, 1.6, 0.6)
  const w = 0.95 * Math.sin((Math.max(0, open) * Math.PI) / 2)
  const [y0, y1] = DOORWAY
  if (w < 0.08) {
    rect(pen, BX + 0.12, y0, BX + 0.24, y1, C.wood)
    return
  }
  shape(pen, [[BX + 0.1 - w, y0 + 0.05], [BX + 0.1, y0], [BX + 0.1, y1], [BX + 0.1 - w, y1 - 0.04]], C.wood, 0.6, C.woodDark)
  rect(pen, BX + 0.1 - w * 0.82, y0 + 0.2, BX + 0.1 - w * 0.18, (y0 + y1) / 2 - 0.05, C.woodDark)
  ellipse(pen, [BX + 0.1 - w * 0.88, (y0 + y1) / 2 + 0.1], 0.03, 0.03, C.flame3)
}

/* ------------------------------------------------------------------ the dog */

/**
 * The three-legged dog: small, warm, two forelegs and one hind leg (where the other was, nothing). Drawn in its
 * pose: shaking in the car, loping out, sitting at her side.
 */
export function drawDog(pen: Pen, d: DogPose, t: number): void {
  const f = d.face
  const sh = d.shake * 0.012 * Math.sin(t * 60)
  const X = (dx: number) => d.x + sh + f * dx
  const base = d.y - d.lift
  const ink = C.dogInk
  const leg = (hip: Pt, foot: Pt) => {
    line(pen, hip, foot, ink, 3.2)
    line(pen, hip, foot, C.dog, 2.0)
  }
  if (d.pose === 2) {
    // Sitting: haunch down, forelegs straight, head up, tail swept and wagging on the beat.
    const wag = Math.sin(t * Math.PI * 2 * 1.2) * 0.4
    path(pen, [[X(-0.12), base - 0.07], [X(-0.2 - 0.04 * Math.cos(wag)), base - 0.1 - 0.06 * Math.sin(wag + 1)]], ink, 2.4)
    leg([X(0.06), base - 0.15], [X(0.08), base - 0.005])
    leg([X(0.02), base - 0.15], [X(0.03), base - 0.005])
    blob(pen, [[X(-0.14), base], [X(-0.15), base - 0.12], [X(-0.04), base - 0.22], [X(0.08), base - 0.2], [X(0.06), base - 0.08], [X(-0.02), base]], ink, 1)
    blob(pen, [[X(-0.13), base - 0.012], [X(-0.135), base - 0.115], [X(-0.04), base - 0.205], [X(0.065), base - 0.19], [X(0.045), base - 0.08], [X(-0.02), base - 0.012]], C.dog, 1)
    head(pen, [X(0.07), base - 0.27], f)
    return
  }
  // Standing or loping: body level, the lone hind leg under the hip, the forelegs reaching and gathering.
  const ph = d.phase * Math.PI * 2
  const run = d.pose === 1 ? 1 : 0
  const bodyY = base - 0.17
  const fore = run ? 0.06 * Math.sin(ph) : 0
  leg([X(0.1), bodyY], [X(0.12 + fore + 0.03 * run), base])
  leg([X(0.07), bodyY], [X(0.06 - fore), base])
  leg([X(-0.1), bodyY], [X(-0.1 - 0.05 * run * Math.cos(ph)), base])
  // The tail.
  const wag = d.shake > 0.5 ? -0.5 : Math.sin(t * 9) * 0.3
  path(pen, [[X(-0.15), bodyY - 0.02], [X(-0.22), bodyY - 0.08 - 0.03 * Math.sin(wag)]], ink, 2.4)
  ellipse(pen, [X(0), bodyY], 0.16, 0.07, ink)
  ellipse(pen, [X(0), bodyY], 0.15, 0.06, C.dog)
  head(pen, [X(0.16), bodyY - 0.07 + (d.shake > 0.5 ? 0.03 : 0)], f)
}

function head(pen: Pen, c: Pt, f: number): void {
  const ink = C.dogInk
  ellipse(pen, c, 0.07, 0.06, ink)
  shape(pen, [[c[0] + f * 0.03, c[1] - 0.03], [c[0] + f * 0.13, c[1] + 0.005], [c[0] + f * 0.12, c[1] + 0.04], [c[0] + f * 0.02, c[1] + 0.04]], ink)
  ellipse(pen, c, 0.06, 0.05, C.dog)
  shape(pen, [[c[0] + f * 0.03, c[1] - 0.02], [c[0] + f * 0.12, c[1] + 0.01], [c[0] + f * 0.11, c[1] + 0.03], [c[0] + f * 0.03, c[1] + 0.03]], C.dog)
  // The ear, flopped.
  shape(pen, [[c[0] - f * 0.04, c[1] - 0.04], [c[0] - f * 0.0, c[1] - 0.06], [c[0] - f * 0.07, c[1] + 0.04]], ink)
  ellipse(pen, [c[0] + f * 0.125, c[1] + 0.005], 0.014, 0.014, ink)
}

/* ------------------------------------------------------------------ over the balls */

/** What is in front: the gate, embers, a haze of smoke and heat round the building. */
export function drawOver(pen: Pen, t: number): void {
  drawGate(pen, t)
  // Embers, rising from the building and falling on the street.
  const ft = fireT(t)
  const d = drained(t)
  for (let i = 0; i < 26; i++) {
    const life = 2.4 + hash(i, 1) * 1.6
    const age = ((ft + hash(i, 2) * life) % life) / life
    const x = 3.4 + hash(i, 3) * 5.5 + Math.sin(ft * 1.3 + i) * 0.25 - age * 1.2
    const y = ROOF + 3.5 - age * 7 + hash(i, 4) * 3
    const a = Math.sin(age * Math.PI) * (1 - d)
    if (a < 0.05) continue
    ellipse(pen, [x, y], 0.022, 0.022, C.flame3)
    glow(pen, [x, y], 0.1, C.flame2, 0.4 * a)
  }
  // Heat on the room's air, in front of him as he crosses it.
  vgrad(pen, BX + WALL, CEIL, SX0, ROOM, [
    [0, C.flame2, 0.0],
    [0.55, C.flame2, 0.0],
    [1, C.flame1, 0.06 * heat(t, 0)],
  ])
  // Smoke through the shop, low and soft.
  const sa = 0.25 * (1 - 0.5 * d)
  for (let i = 0; i < 4; i++) {
    const x = BX + 0.8 + ((ft * 0.18 + i * 0.27) % 1) * 3
    const r = 0.5 + 0.2 * Math.sin(ft + i)
    blob(pen, Array.from({ length: 6 }, (_, j) => [x + Math.cos(j) * r, ROOM + SLAB + 0.45 + Math.sin(j) * r * 0.45] as Pt), C.smoke, sa)
  }
}

/** Everything the part draws behind the balls, in order. */
export function drawPart(pen: Pen, t: number): void {
  drawMachine(pen, t)
  drawJoist(pen, t)
  drawDoor(pen, t)
  drawDog(pen, dogAt(t), t)
}

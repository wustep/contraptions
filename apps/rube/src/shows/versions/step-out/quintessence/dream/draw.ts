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
import { blob, ctxOf, ease, ellipse, flash, line, loop, mix, path, rect, rgba, ring, shape, vgrad, type Pen } from './pen'
import { drawCity, drawPlumes, skyFloor } from './city'
import type { View } from '../depth'

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

/** A flare's rise: over a few frames from its beat (the window's burst, on the cut, is at once). */
const rise = (s: number, at: number): number => (at === BURST ? 1 : ease(s / 0.08))

/** How hard each fire source is burning at `t`: a base, its flares, and the drain taking it down. */
export function heat(t: number, src: number): number {
  const base = [0.55, 0.6, 0.5, 0.45][src]
  let v = base * (0.85 + 0.25 * level(t))
  for (const [ft, s] of FLARES) if (s === src && t >= ft) v += 0.9 * rise(t - ft, ft) * Math.exp(-(t - ft) / 0.45)
  // The first: before the window goes there is only a low fire behind it.
  if (src === 0 && t < BURST) v = 0.25
  // The last flare on the drain, then down.
  if (t >= DRAIN) v = v * (1 - 0.65 * drained(t)) + 0.5 * rise(t - DRAIN, DRAIN) * Math.exp(-(t - DRAIN) / 0.25) * (1 - drained(t))
  return v
}

/** Fire's own clock: it slows to a stop as the colour drains, the picture going still. */
export const fireT = (t: number) => (t < DRAIN ? t : DRAIN + (t - DRAIN) * (1 - 0.85 * drained(t)))

/** The four warm values of a flame, outermost first: [colour, width, height, alpha]. */
const FLAME_LAYERS: [string, number, number, number][] = [
  [C.flame1, 1, 1, 0.92],
  [C.flame2, 0.72, 0.74, 0.95],
  [C.flame3, 0.46, 0.48, 0.95],
  [C.flame4, 0.22, 0.24, 0.75],
]

/**
 * One tongue of flame, one of its four values (`li`), added to `path`: from a base `w` wide, `h` tall, leaning by
 * `lean` (cells of tip shift), alive on `t`.
 */
function tongue(path: Path2D, k: number, base: Pt, w: number, h: number, t: number, seed: number, lean: number, li: number): void {
  const [, sw, sh] = FLAME_LAYERS[li]
  const fl = (f: number, ph: number) => Math.sin(t * f + seed * 2.7 + ph)
  const W = w * sw
  const H = h * sh * (0.88 + 0.12 * fl(7.3, 0))
  const tip = (lean + 0.14 * fl(4.1, 1)) * H
  const bx = base[0]
  const by = base[1]
  // A soft tongue: a round belly low down, drawn up into a tip that sways.
  loop(
    path,
    [
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
    ],
    k,
  )
}

/** Fill the four values of a fire, each in one path: what makes a bed of tongues burn as one fire. */
function burn(pen: Pen, paths: Path2D[], a = 1): void {
  const ctx = ctxOf(pen.p)
  ctx.save()
  FLAME_LAYERS.forEach(([col, , , alpha], li) => {
    ctx.fillStyle = rgba(pen, col, alpha * a)
    ctx.fill(paths[li])
  })
  ctx.restore()
}

/** One fire: a tongue of flame in four warm values, from a base `w` wide, `h` tall, leaning by `lean`. */
function flame(pen: Pen, base: Pt, w: number, h: number, t: number, seed: number, lean = 0, a = 1): void {
  if (h <= 0.02) return
  const paths = FLAME_LAYERS.map(() => new Path2D())
  for (let li = 0; li < 4; li++) tongue(paths[li], pen.k, base, w, h, t, seed, lean, li)
  burn(pen, paths, a)
}

/** A row of flames along a line: a fire bed. Its tongues are filled value by value, so they burn as one fire. */
function fireBed(pen: Pen, x0: number, x1: number, y: number, h: number, t: number, seed: number, lean = 0, a = 1): void {
  const n = Math.max(2, Math.round((x1 - x0) / 0.32))
  const paths = FLAME_LAYERS.map(() => new Path2D())
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n
    const x = x0 + (x1 - x0) * u
    const hi = h * (0.55 + 0.45 * hash(i, seed)) * (0.85 + 0.15 * Math.sin(t * 3 + i))
    if (hi <= 0.02) continue
    for (let li = 0; li < 4; li++) tongue(paths[li], pen.k, [x, y], ((x1 - x0) / n) * 1.9, hi, t, seed * 13 + i, lean, li)
  }
  burn(pen, paths, a)
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

/**
 * The night: the sky (only where it can be seen: over the far towers, beside and above the building), the fire's light
 * on it, warmer for a moment as the window goes on the cut; then the city on its planes (`city.ts`) and the smoke going away
 * over it.
 */
export function drawSky(pen: Pen, v: View, t: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const fire = Math.max(heat(t, 0), heat(t, 1)) * (t < BURST ? 0.6 : 1)
  const low = Math.min(v.y1, skyFloor(v)) + 0.05
  const rects: [number, number, number, number][] = []
  if (v.x0 < BX) rects.push([v.x0 - 0.1, v.y0 - 0.1, Math.min(v.x1, BX + 0.1) + 0.1, low])
  if (v.x1 > BX && v.y0 < ROOF - 0.4) rects.push([Math.max(v.x0, BX) - 0.1, v.y0 - 0.1, v.x1 + 0.1, Math.min(low, ROOF - 0.4)])
  // One plain wash for the sky and the fire's light on it: dark far off and high, warming toward the building.
  // The window going, on the band's first downbeat, warms it at once.
  const warm = 0.22 * fire + 0.12 * flash(t - BURST, 0.5)
  const sky = ctx.createLinearGradient(-3 * k, -7.5 * k, 6.2 * k, -2.6 * k)
  sky.addColorStop(0, pen.tone(C.skyTop))
  sky.addColorStop(0.45, pen.tone(mix(C.skyTop, C.skyMid, 0.5)))
  sky.addColorStop(0.8, pen.tone(mix(C.skyMid, C.flame1, warm * 0.42)))
  sky.addColorStop(1, pen.tone(mix(C.skyMid, C.flame1, warm)))
  ctx.save()
  ctx.fillStyle = sky
  for (const [x0, y0, x1, y1] of rects) {
    if (x1 <= x0 || y1 <= y0) continue
    ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  }
  ctx.restore()
  drawCity(pen, v, t, fire)
  drawPlumes(pen, v, fireT(t), fire, 1 - 0.5 * drained(t))
}

/* ------------------------------------------------------------------ platform, tracks, pavement */

/**
 * A lamp's light lying along a floor, seen edge on: the floor's band from `x0` to `x1`, lit most under the lamp at
 * `at` and falling off evenly to nothing at either end.
 */
function pavedPool(pen: Pen, x0: number, x1: number, y0: number, y1: number, col: string, a: number, at = (x0 + x1) / 2): void {
  if (a <= 0.003 || x1 <= x0) return
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const g = ctx.createLinearGradient(x0 * k, 0, x1 * k, 0)
  const m = Math.max(0.05, Math.min(0.95, (at - x0) / (x1 - x0)))
  g.addColorStop(0, rgba(pen, col, 0))
  g.addColorStop(m, rgba(pen, col, a))
  g.addColorStop(1, rgba(pen, col, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.restore()
}

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
  // Its lamp: a cold light over where he sits, and its light along the deck under it.
  const lx = -1.15
  line(pen, [lx, -2.42], [lx, -1.95], C.steel, 0.8)
  shape(pen, [[lx - 0.2, -1.8], [lx + 0.2, -1.8], [lx + 0.1, -1.97], [lx - 0.1, -1.97]], C.steel)
  rect(pen, lx - 0.16, -1.82, lx + 0.16, -1.79, C.lamp)
  pavedPool(pen, lx - 1.4, lx + 1.4, DECK, DECK + 0.3, C.lamp, 0.16)
  // The pavement and the fence.
  rect(pen, FENCE - 0.05, STREET, BX1 + 8, BED + 6, C.under)
  rect(pen, FENCE, STREET, BX1 + 8, STREET + 0.12, C.pave)
  line(pen, [FENCE, STREET], [BX, STREET], C.paveTop, 0.9)
  rect(pen, FENCE - 0.05, STREET, FENCE + 0.02, BED + 6, C.platFace)
  // The vault under the pavement in its stone courses, and the platform's face in its panels.
  const ctx0 = ctxOf(pen.p)
  const k0 = pen.k
  const courses = new Path2D()
  for (let y = STREET + 0.24, row = 0; y < BED + 3; y += 0.13, row++) {
    courses.rect((FENCE + 0.02) * k0, y * k0, (BX1 + 7.9 - FENCE) * k0, 0.018 * k0)
    for (let x = FENCE + 0.1 + (row % 2) * 0.22; x < BX1 + 8; x += 0.44) courses.rect(x * k0, (y - 0.13) * k0, 0.018 * k0, 0.13 * k0)
  }
  ctx0.fillStyle = rgba(pen, '#2C2244', 0.65)
  ctx0.fill(courses)
  const panels = new Path2D()
  for (let x = PLAT_X0 + 0.3; x < LIP - 0.1; x += 0.6) panels.rect(x * k0, (DECK + 0.32) * k0, 0.025 * k0, (BED + 3) * k0)
  for (let y = DECK + 0.6; y < BED + 3; y += 0.3) panels.rect(PLAT_X0 * k0, y * k0, (LIP - 0.04 - PLAT_X0) * k0, 0.02 * k0)
  ctx0.fillStyle = rgba(pen, '#16112A', 0.8)
  ctx0.fill(panels)
  // The street lamp she waits under: a short iron lamp by the shop's door, its arm out over where she waits, and its
  // light lying on the pavement.
  const sx = 3.68
  const head: Pt = [2.78, -1.12]
  const lit = 1 - 0.6 * drained(t)
  pavedPool(pen, Math.max(FENCE, head[0] - 1.3), Math.min(BX, head[0] + 1.3), STREET, STREET + 0.12, C.street, 0.34 * lit, head[0])
  line(pen, [sx, STREET], [sx, -1.0], C.post, 1.8)
  rect(pen, sx - 0.06, STREET - 0.25, sx + 0.06, STREET, C.post)
  path(pen, [[sx, -1.0], [sx - 0.15, -1.22], [head[0] + 0.15, -1.26]], C.post, 1.5)
  shape(pen, [[head[0] - 0.16, head[1]], [head[0] + 0.16, head[1]], [head[0] + 0.08, head[1] - 0.15], [head[0] - 0.08, head[1] - 0.15]], C.post)
  rect(pen, head[0] - 0.14, head[1] - 0.02, head[0] + 0.14, head[1] + 0.01, C.street)
  // Its glass under the shade, lit.
  shape(pen, Array.from({ length: 9 }, (_, i) => [head[0] + 0.1 * Math.cos((Math.PI * i) / 8), head[1] + 0.01 + 0.06 * Math.sin((Math.PI * i) / 8)] as Pt), C.street)
}

/* ------------------------------------------------------------------ the building */

const WIN3: [number, number] = [-5.75, -4.75]

/** The building, cut open: its walls, floors, its rooms on fire, the shaft. */
export function drawBuilding(pen: Pen, t: number): void {
  const ft = fireT(t)
  // The neighbours behind it, their fronts warm with the fire's light, most up by the burning roof.
  const lit = Math.max(heat(t, 1), heat(t, 2))
  for (const [x0, x1, top] of [[BX1 - 0.2, BX1 + 6, ROOF - 2.2], [BX1 + 2.4, BX1 + 4.6, ROOF - 3.6]] as const) {
    rect(pen, x0, top, x1, STREET, C.mid)
    vgrad(pen, x0, top, x1, STREET, [
      [0, C.flame2, 0.14 * Math.min(1.4, lit)],
      [1, C.flame2, 0.03],
    ])
  }
  neighbours(pen, t)
  // Rooms: the top floor ablaze, his room burning, the shop dark with smoke.
  const inner = BX + WALL
  rect(pen, inner, ROOF, BX1, TOP_FLOOR, C.topWall)
  rect(pen, inner, CEIL, SX0, ROOM, C.roomWall)
  rect(pen, inner, ROOM + SLAB, SX0, STREET, C.shopWall)
  // The room's wallpaper, a fine stripe, and the dado under its rail; a picture on the wall, a landscape in a dark
  // frame: a room someone lives in. The fire's light falls on all of it.
  const paper = new Path2D()
  for (let x = inner + 0.1; x < SX0 - 0.03; x += 0.14) paper.rect(x * pen.k, (CEIL + 0.1) * pen.k, 0.035 * pen.k, (ROOM - 0.55 - CEIL - 0.1) * pen.k)
  for (let x = inner + 0.05; x < SX0 - 0.1; x += 0.28) paper.rect(x * pen.k, (ROOM - 0.5) * pen.k, 0.2 * pen.k, 0.42 * pen.k)
  ctxOf(pen.p).fillStyle = rgba(pen, '#4F2647', 1)
  ctxOf(pen.p).fill(paper)
  rect(pen, inner, ROOM - 0.56, SX0, ROOM - 0.52, C.brickCut)
  rect(pen, 5.25, -3.2, 5.95, -2.65, C.woodDark)
  rect(pen, 5.33, -3.12, 5.87, -2.73, '#9A7458')
  shape(pen, [[5.33, -2.73], [5.33, -2.88], [5.5, -2.97], [5.66, -2.86], [5.87, -2.92], [5.87, -2.73]], '#5A3F44')
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
  // Smoke rolling along under the room's ceiling toward the street, in from behind the shaft.
  const k = pen.k
  const ctx = ctxOf(pen.p)
  const span = SX0 - inner + 1.6
  const bank = new Path2D()
  for (let i = 0; i < 5; i++) {
    const x = SX0 + 0.8 - ((ft * 0.14 + (i / 5) * span) % span)
    const y = CEIL + 0.2 + 0.08 * hash(i, 43) + 0.03 * Math.sin(ft * 0.7 + i)
    const r = 0.32 + 0.14 * hash(i, 44)
    loop(
      bank,
      Array.from({ length: 7 }, (_, j) => {
        const a = (j / 7) * Math.PI * 2
        const rr = r * (0.82 + 0.2 * Math.sin(a * 3 + i * 1.9 + ft * 0.4))
        return [x + Math.cos(a) * rr * 1.5, y + Math.sin(a) * rr * 0.55] as Pt
      }),
      k,
    )
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(inner * k, CEIL * k, (SX0 - inner) * k, (ROOM - CEIL) * k)
  ctx.clip()
  ctx.fillStyle = rgba(pen, C.smoke, 0.42 * (1 - 0.4 * drained(t)))
  ctx.fill(bank)
  ctx.restore()
  // The shop below: the fire's light coming down its back, shelves and a counter in the smoke.
  vgrad(pen, inner, ROOM + SLAB, SX0, STREET, [
    [0, C.flame1, 0.16 * h0],
    [1, C.flame1, 0.02],
  ])
  shop(pen, inner)
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
  if (t < BURST) rect(pen, BX + 0.12, WIN[0], BX + 0.2, WIN[1], mix(C.glass, C.flame3, 0.55))
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

/**
 * The shop below the burning room, in the smoke: boarding up its back wall to the dado, shelves of tins and jars,
 * the counter by the door, a lamp hanging dark from the ceiling.
 */
function shop(pen: Pen, inner: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const boards = new Path2D()
  for (let x = inner + 0.06; x < SX0 - 0.05; x += 0.12) boards.rect(x * k, 0.08 * k, 0.02 * k, (STREET - 0.08) * k)
  boards.rect(inner * k, 0.04 * k, (SX0 - inner) * k, 0.04 * k)
  const shelves = new Path2D()
  const goods: Path2D[] = [new Path2D(), new Path2D()]
  const s0 = inner + 0.3
  const s1 = SX0 - 0.25
  for (const [row, y] of [-1.0, -0.72, -0.44, -0.16].entries()) {
    shelves.rect(s0 * k, y * k, (s1 - s0) * k, 0.04 * k)
    for (const bx of [s0 + 0.1, s1 - 0.14]) shelves.rect(bx * k, y * k, 0.03 * k, 0.1 * k)
    // Jars and tins and boxes along it, all one dim plum in the smoke.
    for (let x = s0 + 0.05, i = 0; x < s1 - 0.1; i++) {
      const w = 0.07 + 0.08 * hash(row, i, 31)
      const h = 0.09 + 0.1 * hash(row, i, 32)
      goods[hash(row, i, 33) < 0.6 ? 0 : 1].rect(x * k, (y - h) * k, w * k, h * k)
      x += w + 0.02 + 0.05 * hash(row, i, 34)
    }
  }
  // The counter by the door.
  shelves.rect((inner + 0.5) * k, (STREET - 0.55) * k, 1.0 * k, 0.55 * k)
  // A lamp hanging dark from the ceiling on its flex.
  const lx = inner + 2.2
  shelves.rect((lx - 0.006) * k, (ROOM + SLAB) * k, 0.012 * k, 0.32 * k)
  shelves.moveTo((lx - 0.16) * k, (ROOM + SLAB + 0.44) * k)
  shelves.lineTo((lx - 0.05) * k, (ROOM + SLAB + 0.32) * k)
  shelves.lineTo((lx + 0.05) * k, (ROOM + SLAB + 0.32) * k)
  shelves.lineTo((lx + 0.16) * k, (ROOM + SLAB + 0.44) * k)
  shelves.closePath()
  ctx.save()
  ctx.fillStyle = rgba(pen, '#2A1C35', 1)
  ctx.fill(boards)
  for (const [i, col] of ['#6E5470', '#574060'].entries()) {
    ctx.fillStyle = rgba(pen, col, 1)
    ctx.fill(goods[i])
  }
  ctx.fillStyle = rgba(pen, C.slab, 1)
  ctx.fill(shelves)
  ctx.restore()
  rect(pen, inner + 0.45, STREET - 0.6, inner + 1.55, STREET - 0.55, C.brickCut)
}

/**
 * The neighbours' fronts behind the building: rows of dark windows, some catching the fire's light and flickering
 * with it, some lit from inside; a fire escape down the near one; a cornice.
 */
function neighbours(pen: Pen, t: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const ft = fireT(t)
  const dark = new Path2D()
  const caught = new Path2D()
  const lit = new Path2D()
  const iron = new Path2D()
  const fronts: [number, number, number][] = [
    [BX1 + 0.1, BX1 + 2.3, ROOF - 2.0],
    [BX1 + 2.6, BX1 + 4.4, ROOF - 3.4],
    [BX1 + 4.7, BX1 + 5.9, ROOF - 2.0],
  ]
  for (const [x0, x1, top] of fronts) {
    for (let y = top + 0.35, row = 0; y < STREET - 0.6; y += 0.62, row++) {
      for (let x = x0 + 0.12, col = 0; x + 0.22 < x1; x += 0.42, col++) {
        const h = hash(row, col, Math.round(x0 * 10))
        const p = h < 0.1 ? lit : h < 0.4 ? caught : dark
        p.rect(x * k, y * k, 0.18 * k, 0.27 * k)
      }
    }
    iron.rect((x0 - 0.05) * k, (top - 0.02) * k, (x1 - x0 + 0.1) * k, 0.07 * k)
  }
  // The fire escape: landings and ladders down the nearest front.
  for (let y = ROOF - 1.2; y < STREET - 0.8; y += 1.24) {
    iron.rect((BX1 + 0.2) * k, y * k, 1.3 * k, 0.03 * k)
    iron.rect((BX1 + 0.2) * k, (y - 0.22) * k, 0.015 * k, 0.22 * k)
    iron.rect((BX1 + 1.485) * k, (y - 0.22) * k, 0.015 * k, 0.22 * k)
    iron.moveTo((BX1 + 0.35) * k, (y + 0.03) * k)
    iron.lineTo((BX1 + 0.4) * k, (y + 0.03) * k)
    iron.lineTo((BX1 + 1.2) * k, (y + 1.24) * k)
    iron.lineTo((BX1 + 1.15) * k, (y + 1.24) * k)
    iron.closePath()
  }
  const flick = 0.55 + 0.35 * heat(t, 1) * (0.8 + 0.2 * Math.sin(ft * 9.1) * Math.sin(ft * 3.7))
  ctx.save()
  ctx.fillStyle = rgba(pen, '#160F27', 1)
  ctx.fill(dark)
  ctx.fillStyle = rgba(pen, C.flame2, Math.min(1, flick * 0.32))
  ctx.fill(caught)
  ctx.fillStyle = rgba(pen, C.street, 0.5)
  ctx.fill(lit)
  ctx.fillStyle = rgba(pen, '#0E0A18', 1)
  ctx.fill(iron)
  ctx.restore()
}

/** Fire out of a window: tongues from its upper half, licking up the face of the wall. */
function windowFire(pen: Pen, win: [number, number], h: number, t: number, seed: number): void {
  const [top, bottom] = win
  // Two tongues out of the window's head, side by side, licking up the wall's face.
  const y = top + (bottom - top) * 0.3
  const paths = FLAME_LAYERS.map(() => new Path2D())
  for (let li = 0; li < 4; li++) {
    if (1.5 * h > 0.02) tongue(paths[li], pen.k, [BX - 0.02, y], 0.7, 1.5 * h, t, seed * 7, 0.18, li)
    if (1.05 * h > 0.02) tongue(paths[li], pen.k, [BX - 0.42, y + 0.12], 0.55, 1.05 * h, t, seed * 7 + 1, -0.12, li)
  }
  burn(pen, paths)
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
    for (let i = 0; i < 6; i++) {
      const vx = (hash(i, 4) - 0.5) * 3
      const vy = -1.5 - 2 * hash(i, 5)
      const px = x0 + (x1 - x0) * hash(i, 6) + vx * s
      const py = ROOM - 0.1 - 0.15 * hash(i, 7) + vy * s * (0.5 + hash(i, 8)) + 6 * s * s
      if (py > ROOM - 0.02) continue
      ellipse(pen, [px, py], 0.02, 0.02, C.flame4)
    }
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
  // Its two lower panels, their mouldings catching the fire, and a kick plate.
  const mid = (y0 + y1) / 2
  for (const [a, b] of [[mid + 0.05, mid + 0.55], [mid + 0.65, y1 - 0.2]]) {
    rect(pen, BX + 0.1 - w * 0.8, a, BX + 0.1 - w * 0.2, b, null, 0.5, C.woodDark)
    line(pen, [BX + 0.1 - w * 0.78, a + 0.03], [BX + 0.1 - w * 0.22, a + 0.03], C.flame3, 0.4)
  }
  rect(pen, BX + 0.1 - w * 0.92, y1 - 0.14, BX + 0.1 - w * 0.08, y1 - 0.06, '#9A7A52')
  ellipse(pen, [BX + 0.1 - w * 0.88, mid + 0.1], 0.03, 0.03, C.flame3)
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

/** What is in front of him: the car's gate. */
export function drawOver(pen: Pen, t: number): void {
  drawGate(pen, t)
}

/**
 * The air round the building, drawn in the front (`front.ts`) so it is in front of the machine and under the balls:
 * embers going up from the building and falling on the street, the heat in the burning room, the smoke through the
 * shop.
 */
export function drawAir(pen: Pen, t: number): void {
  const ctx = ctxOf(pen.p)
  const k = pen.k
  const ft = fireT(t)
  const d = drained(t)
  const cores = new Path2D()
  for (let i = 0; i < 12; i++) {
    const life = 2.4 + hash(i, 1) * 1.6
    const age = ((ft + hash(i, 2) * life) % life) / life
    const x = 3.4 + hash(i, 3) * 5.5 + Math.sin(ft * 1.3 + i) * 0.25 - age * 1.2
    const y = ROOF + 3.5 - age * 7 + hash(i, 4) * 3
    const a = Math.sin(age * Math.PI) * (1 - d)
    if (a < 0.05) continue
    cores.moveTo((x + 0.02) * k, y * k)
    cores.arc(x * k, y * k, 0.02 * k, 0, Math.PI * 2)
  }
  ctx.save()
  ctx.fillStyle = rgba(pen, C.flame3, 1)
  ctx.fill(cores)
  ctx.restore()
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

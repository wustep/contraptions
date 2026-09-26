import type p5 from 'p5'
import { solid } from '../../../../../../../../src/core/draw'
import { mixHex } from '../../../../../parts'
import { sparkIn } from '../fx'
import { alpha, box, frame, hash, scenery, smooth } from '../kit'
import { THEME, onsetsIn } from '../music'
import { LOFT } from '../worlds'
import { BENCH, CANDLE, DOOR, FLOOR_Y, ROOM, SKYLIGHT, WICK } from './layout'
import { WICK_BACK, WICK_LEFT, candleLit } from './sneak-beats'
import { doorOpen, fireRoar } from './stove-door'

/**
 * LOFT-A's: the loft itself, drawn from show time for the whole show. The chandler's loft seen side-on, a dollhouse
 * cut open, at night. The plaster back wall and its posts, the wall plate, the underside of the roof (boards between
 * rafters) up to the ridge beam, the skylight with the moon behind it, the floor and its section, the long oak bench
 * with its lower shelf, the wall shelf over the bench (the pan lift hangs from it), the plank door at the east end,
 * and the candle on its pewter chamberstick. The stove and the cat are LOFT-B's (`hearth.ts`); the sneak's machines
 * (the pan lift, the balance, the snuffer, the drying rack, the candle arm) are `sneak.ts`'s.
 *
 * **Light.** The room is drawn in its lit colours, and at the end of its `draw` it multiplies what it has drawn by a
 * light map: the night's colour, with the moon's shaft through the skylight, the spark's warm pool wherever it is
 * (`sparkIn`, with the same falloff as LOFT-B's `stove-light.ts`), the stove's glow, and every glow other parts add.
 * Only the room is multiplied (and whatever is drawn into it through `ROOM_LAYERS`): the hearth and every part draw
 * after it and light themselves, so nothing is darkened twice.
 *
 * API for the other loft parts (LOFT-B, the director's `home`):
 *
 * - `ROOM_LAYERS.set(name, fn)`: a drawing made inside the room, before its light, so it is lit exactly as the room
 *   is. `fn(p, k, ink, weight, t)` in the loft's world cells, in lit colours. The sneak's machines are drawn this way.
 * - `LOFT_LIGHT.glows.push(fn)`: more light on the room, `fn(t) => Glow[]` in the loft's world cells (the stove's
 *   fire through its open door, a flare).
 * - `LOFT_LIGHT.hearth`: the stove's fire on the room round it (`hearthGlow`): the vent's red while LOFT-B's door is
 *   shut, the doorway's red-gold flood while it is open (read from `stove-door.ts`).
 * - `lightAt(x, y, t)` (0..1) and `shade(hex, x, y, t)`: the map sampled at a point, for what a part draws in its
 *   `over` (in front of the spark) in the room's own light.
 * - `candleLit(t)`, `WICK_LEFT`, `WICK_BACK` (from `sneak-beats.ts`): when the candle burns.
 */

/** Every cell the room covers: the set is drawn whenever any of it is in view. */
export const ROOM_CELLS = box(ROOM.x0 - 1, ROOM.y0, ROOM.x1 + 1, ROOM.y1, 2)

/* ------------------------------------------------------------------ the room's plan */

/** The wall plate: the beam along the top of the plaster wall, where the roof begins. */
const PLATE = { y0: -5.15, y1: -4.6 }
/** The ridge beam along the top of the roof. */
const RIDGE = { y0: -14.1, y1: -13.62 }
/** The rafters under the roof boards, by their centres (the skylight sits between the first two). */
const RAFTERS = [-25.2, -16.8, -9.2, -1.4, 12.6]
/** The end posts of the timber frame, and the end walls' cut. */
const POSTS = [-29.35, 15.35]
/** The floor's cut: boards, then the joists, then the dark of the room below. */
const BOARDS = FLOOR_Y + 0.42
const JOISTS = FLOOR_Y + 1.25
/** The bench: its top's thickness, its apron, its legs and the lower shelf between them. */
const TOP = BENCH.top + 0.34
const APRON = TOP + 0.44
const LEGS = [-15.45, -9.6, -3.7, 2.45]
const UNDER = { y: 8.4, x0: -15.75, x1: 2.75 }
/** The wall shelf over the bench, where the pan lift's pulley hangs. */
export const SHELF = { y: -3.15, x0: -6.6, x1: 1.7 }
/** The plank door at the east end, to the stairs. */
const EXIT_DOOR = { x0: 11.3, x1: 13.9, y0: 4.6 }
/** The chamberstick: its dish, the socket the candle stands in, the finger ring on the east side. */
const DISH = { x0: CANDLE.x - 0.78, x1: CANDLE.x + 0.78, rim: BENCH.top - 0.24 }
const SOCKET = { r: 0.43, top: CANDLE.foot - 0.4 }

/* ------------------------------------------------------------------ light */

export interface Glow {
  x: number
  y: number
  /** Radius, cells (and `ry` to squash it). */
  r: number
  ry?: number
  /** Strength: 1 lights a thing to its full colour at the middle. */
  a: number
  color?: string
}

export const LOFT_LIGHT = {
  /** More light in the dark from other parts, in the loft's world cells. */
  glows: [] as ((t: number) => Glow[])[],
  /** The banked stove's glow through its vent. LOFT-B replaces this with its own, or sets it to null. */
  hearth: null as ((t: number) => Glow[]) | null,
}

/** A drawing made inside the room before its light (see the top): in the loft's world cells, in lit colours. */
export type RoomLayer = (p: p5, k: number, ink: string, weight: number, t: number) => void
/** The room's layers by name, drawn in the order they were first added (a hot reload replaces one, never doubles it). */
export const ROOM_LAYERS = new Map<string, RoomLayer>()

/**
 * The stove's fire on the room, following LOFT-B's door (`stove-door.ts`): shut, a low red glow round the firebox and
 * on the floor under it (its vent); open, the doorway floods the room round the stove with red-gold, more as the fire
 * roars (52.5 to 58.4, and when it bursts open from inside at 148.44).
 */
export const hearthGlow = (t: number): Glow[] => {
  const breathe = 1 + 0.06 * Math.sin(t * 1.3) + 0.04 * Math.sin(t * 3.1 + 1)
  const flick = 1 + 0.05 * Math.sin(t * 13.1) + 0.035 * Math.sin(t * 29.3 + 1.1)
  const open = doorOpen(t)
  const roar = fireRoar(t)
  const shut = 1 - 0.6 * open
  const cx = (DOOR.x0 + DOOR.x1) / 2
  const cy = (DOOR.y0 + DOOR.y1) / 2
  const out: Glow[] = [
    { x: cx, y: cy, r: 3.2, a: 0.55 * breathe * shut, color: LOFT.ember },
    { x: cx - 0.8, y: FLOOR_Y - 1.2, r: 5.2, ry: 2.6, a: 0.42 * breathe * shut, color: mixHex(LOFT.ember, LOFT.glow, 0.5) },
  ]
  if (open > 0.01) {
    const reach = 5.5 + 3 * roar
    out.push({ x: cx - 0.4, y: cy + 1.2, r: reach, ry: reach * 0.8, a: open * (0.55 + 0.45 * roar) * flick, color: mixHex(LOFT.ember, LOFT.glow, 0.45) })
    out.push({ x: cx - 0.6, y: FLOOR_Y - 0.6, r: reach * 1.1, ry: 2.2, a: open * (0.35 + 0.3 * roar) * flick, color: mixHex(LOFT.ember, LOFT.glow, 0.6) })
  }
  return out
}
LOFT_LIGHT.hearth = hearthGlow

/** The night with no light on it: what the map is where nothing lights it. */
const AMBIENT = mixHex(LOFT.night, LOFT.moonDeep, 0.85)
const WARM = LOFT.glow
const WARM_HOT = mixHex(LOFT.glow, LOFT.tallow, 0.6)
const MOON = LOFT.moon

/** The moon's shaft: from the skylight down and east across the drying rack to the bench top. */
const SHAFT = (() => {
  const a = (37 * Math.PI) / 180
  const from: [number, number] = [(SKYLIGHT.x0 + SKYLIGHT.x1) / 2, (SKYLIGHT.y0 + SKYLIGHT.y1) / 2]
  const dir: [number, number] = [Math.sin(a), Math.cos(a)]
  const len = (BENCH.top - from[1]) / dir[1]
  return { from, dir, len, width: (SKYLIGHT.x1 - SKYLIGHT.x0) * Math.cos(a) + 0.4, angle: a }
})()
/** Where the shaft lands on the bench top. */
const PATCH: [number, number] = [SHAFT.from[0] + SHAFT.dir[0] * SHAFT.len, BENCH.top - 0.1]

/** The horns' swells before the theme: the candle's light breathes with them. */
const HORNS = onsetsIn(0, THEME - 0.05, 1.3)
function breath(t: number): number {
  if (t >= THEME + 1) return 0
  let v = 0
  for (const h of HORNS) {
    const u = t - h
    if (u < 0 || u > 3) continue
    v += (1 - Math.exp(-u / 0.12)) * Math.exp(-u / 0.9)
  }
  return Math.min(1, v)
}

/** Every pool of light at `t`: what the map draws and what `lightAt` samples, the same list. */
interface Pool {
  x: number
  y: number
  rx: number
  ry: number
  a: number
  rgb: [number, number, number]
  /** Its falloff from the middle (0) to the edge (1); `STOPS` when unset. */
  fall?: [number, number][]
}
const rgbOf = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
const AMBIENT_RGB = rgbOf(AMBIENT)
const MOON_RGB = rgbOf(MOON)

function pools(t: number): Pool[] {
  const out: Pool[] = []
  const add = (g: Glow) => out.push({ x: g.x, y: g.y, rx: g.r, ry: g.ry ?? g.r, a: g.a, rgb: rgbOf(g.color ?? WARM) })
  // The moon: a faint fill round the skylight, and where its shaft lands on the bench.
  add({ x: SHAFT.from[0] + 1, y: SHAFT.from[1] + 4, r: 13, ry: 11, a: 0.16, color: MOON })
  add({ x: PATCH[0], y: PATCH[1], r: 3.6, ry: 1.2, a: 0.34, color: MOON })
  // The spark: the only warm light in the room, wherever it is. It flickers as a flame does, and breathes with the horns.
  const s = sparkIn('loft', t)
  if (s) {
    const power = Math.min(1.3, s.heat) * (s.hidden ? 0.35 : 1)
    const flick = 1 + 0.035 * Math.sin(t * 17.3) + 0.025 * Math.sin(t * 29.1 + 2) + 0.02 * (hash(Math.floor(t * 24)) - 0.5)
    const lift = 1 + 0.12 * breath(t)
    const r = (1.45 + 0.8 * power) * lift
    out.push({ x: s.x, y: s.y - 0.1, rx: 3 * r, ry: 3 * r, a: 1.05 * power * flick, rgb: rgbOf(WARM), fall: SPARK_FALL })
    add({ x: s.x, y: s.y - 0.1, r: 3.4 * r, a: 0.1 * power * lift, color: WARM_HOT })
  }
  const hearth = LOFT_LIGHT.hearth
  if (hearth) for (const g of hearth(t)) add(g)
  for (const fn of LOFT_LIGHT.glows) for (const g of fn(t)) add(g)
  return out
}

/** A pool's falloff from its middle (0) to its edge (1): the same stops the map's gradients use. */
const STOPS: [number, number][] = [
  [0, 1],
  [0.28, 0.66],
  [0.58, 0.26],
  [1, 0],
]
/** The spark's: 1 / (1 + d²/r²)² out to three r, as LOFT-B's stove and cat take its light. */
const SPARK_FALL: [number, number][] = [0, 0.1, 0.2, 0.333, 0.5, 0.667, 0.85, 1].map((u) => [u, u >= 1 ? 0 : 1 / (1 + 9 * u * u) ** 2 - (u / 1) * 0.01])
function falloff(u: number, stops: [number, number][] = STOPS): number {
  if (u >= 1) return 0
  for (let i = 1; i < stops.length; i++) {
    const [u1, v1] = stops[i]
    if (u <= u1) {
      const [u0, v0] = stops[i - 1]
      return v0 + ((v1 - v0) * (u - u0)) / (u1 - u0)
    }
  }
  return 0
}

/** How much of the shaft's light falls at (x, y): 0 outside it, soft at its edges. */
function shaftAt(x: number, y: number): number {
  const dx = x - SHAFT.from[0]
  const dy = y - SHAFT.from[1]
  const along = dx * SHAFT.dir[0] + dy * SHAFT.dir[1]
  if (along < -0.5 || along > SHAFT.len + 0.4) return 0
  const across = Math.abs(dx * SHAFT.dir[1] - dy * SHAFT.dir[0]) / (SHAFT.width / 2)
  if (across >= 1) return 0
  return across < 0.55 ? 1 : 1 - (across - 0.55) / 0.45
}
const SHAFT_A = 0.36

/** The light at (x, y) as an RGB multiplier, 0..1 a channel: what the map multiplies there. */
function lightRGB(x: number, y: number, t: number): [number, number, number] {
  const out: [number, number, number] = [AMBIENT_RGB[0], AMBIENT_RGB[1], AMBIENT_RGB[2]]
  const sh = shaftAt(x, y) * SHAFT_A
  for (let i = 0; i < 3; i++) out[i] += MOON_RGB[i] * sh
  for (const pl of pools(t)) {
    const u = Math.hypot((x - pl.x) / pl.rx, (y - pl.y) / pl.ry)
    const v = falloff(u, pl.fall) * pl.a
    if (v <= 0) continue
    for (let i = 0; i < 3; i++) out[i] += pl.rgb[i] * v
  }
  return out.map((c) => Math.min(1, c / 255)) as [number, number, number]
}

/** How lit (x, y) is at `t`, 0 (the night) .. 1 (as drawn). */
export function lightAt(x: number, y: number, t: number): number {
  const [r, g, b] = lightRGB(x, y, t)
  return (r + g + b) / 3
}

/** A colour as the room's light leaves it at (x, y): for what a part draws in its `over`, after the light map. */
export function shade(hex: string, x: number, y: number, t: number): string {
  const l = lightRGB(x, y, t)
  const c = rgbOf(hex)
  return '#' + c.map((v, i) => Math.round(v * l[i]).toString(16).padStart(2, '0')).join('')
}

let lightCanvas: HTMLCanvasElement | null = null

/** Everything drawn so far in the loft, multiplied by the light: the night's colour, the moon, the spark, every glow. */
function lightMap(p: p5, k: number, t: number): void {
  if (typeof document === 'undefined') return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  if (!lightCanvas) lightCanvas = document.createElement('canvas')
  if (lightCanvas.width !== cw || lightCanvas.height !== ch) {
    lightCanvas.width = cw
    lightCanvas.height = ch
  }
  const g = lightCanvas.getContext('2d')
  if (!g) return
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.fillStyle = AMBIENT
  g.fillRect(0, 0, cw, ch)
  g.setTransform(ctx.getTransform())
  g.globalCompositeOperation = 'lighter'
  // The moon's shaft: a band from the skylight down to the bench, soft at its edges.
  g.save()
  g.translate(SHAFT.from[0] * k, SHAFT.from[1] * k)
  g.rotate(-SHAFT.angle)
  const w = (SHAFT.width / 2) * k
  const across = g.createLinearGradient(-w, 0, w, 0)
  const m = `${MOON_RGB[0]}, ${MOON_RGB[1]}, ${MOON_RGB[2]}`
  across.addColorStop(0, `rgba(${m}, 0)`)
  across.addColorStop(0.225, `rgba(${m}, ${SHAFT_A})`)
  across.addColorStop(0.775, `rgba(${m}, ${SHAFT_A})`)
  across.addColorStop(1, `rgba(${m}, 0)`)
  g.fillStyle = across
  g.fillRect(-w, -0.5 * k, 2 * w, (SHAFT.len + 0.9) * k)
  g.restore()
  for (const pl of pools(t)) {
    if (pl.a <= 0.003) continue
    const rgb = `${pl.rgb[0]}, ${pl.rgb[1]}, ${pl.rgb[2]}`
    // A pool stronger than 1 is laid twice: the second pass saturates its middle toward white.
    let left = pl.a
    while (left > 0.003) {
      const a = Math.min(1, left)
      left -= a
      g.save()
      g.translate(pl.x * k, pl.y * k)
      g.scale(1, pl.ry / pl.rx)
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, pl.rx * k)
      for (const [u, v] of pl.fall ?? STOPS) grad.addColorStop(u, `rgba(${rgb}, ${Math.max(0, a * v)})`)
      g.fillStyle = grad
      g.fillRect(-pl.rx * k, -pl.rx * k, 2 * pl.rx * k, 2 * pl.rx * k)
      g.restore()
    }
  }
  g.restore()
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(lightCanvas, 0, 0)
  ctx.restore()
}

/** The shaft seen in the air: moonlit dust, over everything, faint, with a few motes drifting slowly down through it. */
function shaftGlow(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.translate(SHAFT.from[0] * k, SHAFT.from[1] * k)
  ctx.rotate(-SHAFT.angle)
  const w = (SHAFT.width / 2) * k
  const across = ctx.createLinearGradient(-w, 0, w, 0)
  const m = `${MOON_RGB[0]}, ${MOON_RGB[1]}, ${MOON_RGB[2]}`
  across.addColorStop(0, `rgba(${m}, 0)`)
  across.addColorStop(0.3, `rgba(${m}, 0.075)`)
  across.addColorStop(0.7, `rgba(${m}, 0.075)`)
  across.addColorStop(1, `rgba(${m}, 0)`)
  ctx.fillStyle = across
  ctx.fillRect(-w, 0, 2 * w, SHAFT.len * k)
  // Motes: a few specks of dust turning slowly as they fall through the light.
  for (let i = 0; i < 26; i++) {
    const along = ((hash(i, 1) * SHAFT.len + t * (0.12 + 0.08 * hash(i, 2))) % SHAFT.len) * k
    const off = (hash(i, 3) - 0.5) * 0.8 * 2 * w + Math.sin(t * 0.4 + i) * 0.15 * k
    const tw = 0.5 + 0.5 * Math.sin(t * (0.6 + hash(i, 4)) + i * 2.1)
    ctx.fillStyle = `rgba(${m}, ${0.35 * tw})`
    ctx.fillRect(off, along, 0.028 * k, 0.028 * k)
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ drawing */

type See = (x0: number, x1: number, y0?: number, y1?: number) => boolean

/** A box in cells, from its corners (the stage draws rects from their centres; this sets CORNER for itself). */
function rectC(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, r = 0): void {
  p.push()
  p.rectMode(p.CORNER)
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k, r * k)
  p.pop()
}

/** The plaster wall, the frame's posts and plate, and the roof's underside up to the ridge. */
function shell(p: p5, k: number, ink: string, w: number, see: See): void {
  p.noStroke()
  // Plaster, from the floor to the wall plate.
  p.fill(LOFT.wallLit)
  rectC(p, k, ROOM.x0, PLATE.y1, ROOM.x1, FLOOR_Y)
  // The roof's underside: boards running the length of the room, each a little different, between the rafters.
  if (see(ROOM.x0, ROOM.x1, RIDGE.y1, PLATE.y0)) {
    const n = 11
    const h = (PLATE.y0 - RIDGE.y1) / n
    for (let i = 0; i < n; i++) {
      p.fill(mixHex(LOFT.beamLit, LOFT.beam, 0.08 + 0.2 * hash(i, 9)))
      rectC(p, k, ROOM.x0, RIDGE.y1 + i * h, ROOM.x1, RIDGE.y1 + (i + 1) * h + 0.01)
    }
    p.stroke(alpha(p, ink, 0.45))
    p.strokeWeight(w * 0.35)
    for (let i = 1; i < n; i++) p.line(ROOM.x0 * k, (RIDGE.y1 + i * h) * k, ROOM.x1 * k, (RIDGE.y1 + i * h) * k)
  }
  // The skylight between the first two rafters: the night sky behind glass, four panes in an oak frame.
  skylight(p, k, ink, w, see)
  // Rafters, the wall plate, the ridge, the end posts.
  solid(p, ink, w * 0.8, mixHex(LOFT.beamLit, LOFT.woodLit, 0.35))
  for (const x of RAFTERS) if (see(x - 0.4, x + 0.4, RIDGE.y1, PLATE.y0)) rectC(p, k, x - 0.28, RIDGE.y1, x + 0.28, PLATE.y0)
  solid(p, ink, w, mixHex(LOFT.beamLit, LOFT.woodLit, 0.25))
  rectC(p, k, ROOM.x0 - 0.2, PLATE.y0, ROOM.x1 + 0.2, PLATE.y1)
  rectC(p, k, ROOM.x0 - 0.2, RIDGE.y0, ROOM.x1 + 0.2, RIDGE.y1)
  for (const x of POSTS) if (see(x - 0.5, x + 0.5)) rectC(p, k, x - 0.36, PLATE.y1, x + 0.36, FLOOR_Y)
  // Braces from the posts up to the plate.
  p.strokeWeight(w * 0.8)
  for (const [x, d] of [
    [POSTS[0], 1],
    [POSTS[1], -1],
  ] as [number, number][]) {
    if (!see(x - 2.5, x + 2.5)) continue
    p.beginShape()
    p.vertex((x + d * 0.36) * k, (PLATE.y1 + 1.9) * k)
    p.vertex((x + d * 2.1) * k, PLATE.y1 * k)
    p.vertex((x + d * 1.55) * k, PLATE.y1 * k)
    p.vertex((x + d * 0.36) * k, (PLATE.y1 + 1.35) * k)
    p.endShape(p.CLOSE)
  }
  // The end walls, cut.
  p.noStroke()
  p.fill(LOFT.soot)
  rectC(p, k, ROOM.x0 - 1.2, ROOM.y0 - 1, ROOM.x0, ROOM.y1 + 1)
  rectC(p, k, ROOM.x1, ROOM.y0 - 1, ROOM.x1 + 1.2, ROOM.y1 + 1)
}

function skylight(p: p5, k: number, ink: string, w: number, see: See): void {
  const { x0, x1, y0, y1 } = SKYLIGHT
  if (!see(x0 - 1, x1 + 1, y0 - 1, y1 + 1)) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The night through the glass: deep at the top, paler toward the moon (off to the upper right, unseen).
  const sky = ctx.createLinearGradient(x0 * k, y0 * k, x1 * k, y1 * k)
  sky.addColorStop(0, LOFT.night)
  sky.addColorStop(0.55, LOFT.moonDeep)
  sky.addColorStop(1, mixHex(LOFT.moonDeep, LOFT.moon, 0.55))
  p.noStroke()
  ctx.fillStyle = sky
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  // A few stars.
  p.fill(alpha(p, LOFT.moon, 0.9))
  for (let i = 0; i < 7; i++) {
    const sx = x0 + 0.3 + hash(i, 21) * (x1 - x0 - 0.6)
    const sy = y0 + 0.2 + hash(i, 22) * (y1 - y0 - 0.4) * 0.6
    const s = 0.035 + 0.03 * hash(i, 23)
    rectC(p, k, sx, sy, sx + s, sy + s)
  }
  // The frame and its muntins.
  solid(p, ink, w * 0.8, mixHex(LOFT.beamLit, LOFT.woodLit, 0.4))
  const f = 0.22
  rectC(p, k, x0 - f, y0 - f, x1 + f, y0)
  rectC(p, k, x0 - f, y1, x1 + f, y1 + f * 1.4)
  rectC(p, k, x0 - f, y0, x0, y1)
  rectC(p, k, x1, y0, x1 + f, y1)
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  rectC(p, k, mx - 0.06, y0, mx + 0.06, y1)
  rectC(p, k, x0, my - 0.06, x1, my + 0.06)
}

/** The floor's cut: the boards, the joists, the dark below; the skirting along the wall's foot. */
function floor(p: p5, k: number, ink: string, w: number, see: See): void {
  if (!see(ROOM.x0, ROOM.x1, FLOOR_Y - 0.5, ROOM.y1 + 1)) return
  p.noStroke()
  p.fill(LOFT.soot)
  rectC(p, k, ROOM.x0 - 1.2, JOISTS, ROOM.x1 + 1.2, ROOM.y1 + 2)
  // Joists, end-on, under the boards.
  p.fill(LOFT.beam)
  rectC(p, k, ROOM.x0 - 1.2, BOARDS, ROOM.x1 + 1.2, JOISTS)
  p.fill(LOFT.soot)
  for (let x = ROOM.x0 + 1.5; x < ROOM.x1; x += 2.6) if (see(x - 1, x + 3)) rectC(p, k, x, BOARDS + 0.1, x + 1.9, JOISTS)
  solid(p, ink, w * 0.9, mixHex(LOFT.woodLit, LOFT.wood, 0.3))
  rectC(p, k, ROOM.x0 - 1.2, FLOOR_Y, ROOM.x1 + 1.2, BOARDS)
  // Skirting.
  solid(p, ink, w * 0.7, mixHex(LOFT.woodLit, LOFT.wood, 0.45))
  rectC(p, k, ROOM.x0, FLOOR_Y - 0.3, ROOM.x1, FLOOR_Y)
}

/** The plank door at the east end, down to the stairs. */
function exitDoor(p: p5, k: number, ink: string, w: number, see: See): void {
  const { x0, x1, y0 } = EXIT_DOOR
  if (!see(x0 - 0.5, x1 + 0.5, y0 - 0.5, FLOOR_Y)) return
  solid(p, ink, w, mixHex(LOFT.beamLit, LOFT.woodLit, 0.3))
  rectC(p, k, x0 - 0.25, y0 - 0.25, x1 + 0.25, FLOOR_Y - 0.3)
  solid(p, ink, w * 0.7, mixHex(LOFT.woodLit, LOFT.wood, 0.25))
  rectC(p, k, x0, y0, x1, FLOOR_Y - 0.3)
  p.stroke(alpha(p, ink, 0.7))
  p.strokeWeight(w * 0.5)
  for (let x = x0 + 0.65; x < x1 - 0.1; x += 0.65) p.line(x * k, y0 * k, x * k, (FLOOR_Y - 0.3) * k)
  // Strap hinges and the latch.
  solid(p, ink, w * 0.6, LOFT.ironLit)
  for (const y of [y0 + 1.1, FLOOR_Y - 1.6]) rectC(p, k, x0 + 0.05, y - 0.09, x0 + 1.7, y + 0.09, 0.05)
  rectC(p, k, x1 - 0.5, (y0 + FLOOR_Y) / 2 - 0.2, x1 - 0.3, (y0 + FLOOR_Y) / 2 + 0.2, 0.05)
}

/** The wall shelf over the bench on two knees, and what stands on it: a jug, the candle box, cakes of tallow. */
function wallShelf(p: p5, k: number, ink: string, w: number, see: See): void {
  const { y, x0, x1 } = SHELF
  if (!see(x0 - 1, x1 + 1, y - 2, y + 1.5)) return
  // Knees under it.
  solid(p, ink, w * 0.8, mixHex(LOFT.woodLit, LOFT.wood, 0.2))
  for (const x of [x0 + 0.6, x1 - 0.6]) {
    rectC(p, k, x - 0.12, y + 0.18, x + 0.12, y + 1.15)
    p.beginShape()
    p.vertex((x + 0.12) * k, (y + 0.18) * k)
    p.vertex((x + 0.8) * k, (y + 0.18) * k)
    p.vertex((x + 0.12) * k, (y + 0.9) * k)
    p.endShape(p.CLOSE)
  }
  solid(p, ink, w, LOFT.woodLit)
  rectC(p, k, x0, y, x1, y + 0.2)
  // A stoneware jug.
  const jx = x0 + 1.1
  solid(p, ink, w * 0.8, mixHex(LOFT.tallow, LOFT.wood, 0.45))
  p.beginShape()
  p.vertex((jx - 0.2) * k, (y - 1.05) * k)
  p.bezierVertex((jx - 0.18) * k, (y - 0.85) * k, (jx - 0.42) * k, (y - 0.7) * k, (jx - 0.42) * k, (y - 0.35) * k)
  p.bezierVertex((jx - 0.42) * k, (y - 0.08) * k, (jx - 0.3) * k, y * k, (jx - 0.25) * k, y * k)
  p.vertex((jx + 0.25) * k, y * k)
  p.bezierVertex((jx + 0.3) * k, y * k, (jx + 0.42) * k, (y - 0.08) * k, (jx + 0.42) * k, (y - 0.35) * k)
  p.bezierVertex((jx + 0.42) * k, (y - 0.7) * k, (jx + 0.18) * k, (y - 0.85) * k, (jx + 0.2) * k, (y - 1.05) * k)
  p.endShape(p.CLOSE)
  p.noFill()
  p.strokeWeight(w * 0.8)
  p.arc((jx + 0.42) * k, (y - 0.62) * k, 0.34 * k, 0.5 * k, -Math.PI / 2, Math.PI / 2)
  // The candle box: a wooden box with a sloped lid.
  const bx = x0 + 2.9
  solid(p, ink, w * 0.8, mixHex(LOFT.woodLit, LOFT.beamLit, 0.35))
  rectC(p, k, bx - 0.75, y - 0.62, bx + 0.75, y)
  p.beginShape()
  p.vertex((bx - 0.8) * k, (y - 0.62) * k)
  p.vertex((bx + 0.8) * k, (y - 0.62) * k)
  p.vertex((bx + 0.72) * k, (y - 0.84) * k)
  p.vertex((bx - 0.72) * k, (y - 0.84) * k)
  p.endShape(p.CLOSE)
  // Tallow in cakes, stacked, at the east end.
  const cx = x1 - 1.35
  solid(p, ink, w * 0.7, LOFT.tallow)
  for (let i = 0; i < 3; i++) {
    const o = i === 1 ? 0.08 : 0
    rectC(p, k, cx - 0.55 + o, y - 0.3 * (i + 1), cx + 0.55 + o, y - 0.3 * i, 0.05)
  }
}

/** The long oak bench, its apron, legs and lower shelf, and what is kept under it. */
function bench(p: p5, k: number, ink: string, w: number, see: See): void {
  const { x0, x1, top } = BENCH
  if (!see(x0 - 1, x1 + 1, top - 0.5, FLOOR_Y)) return
  const woodDark = mixHex(LOFT.woodLit, LOFT.wood, 0.4)
  // Legs, the lower shelf, and what is kept on it.
  solid(p, ink, w * 0.9, woodDark)
  for (const x of LEGS) if (see(x - 0.4, x + 0.4)) rectC(p, k, x - 0.21, APRON, x + 0.21, FLOOR_Y)
  solid(p, ink, w * 0.9, mixHex(LOFT.woodLit, LOFT.wood, 0.25))
  rectC(p, k, UNDER.x0, UNDER.y, UNDER.x1, UNDER.y + 0.26)
  underShelf(p, k, ink, w, see)
  // The apron, and the top: thick oak with tallow run over its front edge in places.
  solid(p, ink, w * 0.9, woodDark)
  rectC(p, k, x0 + 0.2, TOP, x1 - 0.2, APRON)
  solid(p, ink, w, LOFT.woodLit)
  rectC(p, k, x0, top, x1, TOP)
  p.stroke(alpha(p, ink, 0.35))
  p.strokeWeight(w * 0.4)
  p.line((x0 + 0.3) * k, (top + 0.17) * k, (x0 + 5.5) * k, (top + 0.17) * k)
  p.line((x0 + 8.2) * k, (top + 0.2) * k, (x1 - 0.6) * k, (top + 0.2) * k)
}

/** Under the bench: tallow in cakes, a crock, a coil of wick in a basket, a spare mould frame. Seen as the spark passes along the floor. */
function underShelf(p: p5, k: number, ink: string, w: number, see: See): void {
  const y = UNDER.y
  // Tallow cakes, stacked.
  for (const [x, n] of [
    [-14.4, 3],
    [-6.2, 2],
  ] as [number, number][]) {
    if (!see(x - 1, x + 1, y - 1.5, y)) continue
    solid(p, ink, w * 0.7, LOFT.tallow)
    for (let i = 0; i < n; i++) rectC(p, k, x - 0.62 + (i % 2) * 0.1, y - 0.34 * (i + 1), x + 0.62 + (i % 2) * 0.1, y - 0.34 * i, 0.06)
  }
  // A basket with a hank of wick coiled in it.
  const bx = -11.3
  if (see(bx - 1.2, bx + 1.2, y - 1.4, y)) {
    solid(p, ink, w * 0.8, mixHex(LOFT.brass, LOFT.wood, 0.5))
    p.beginShape()
    p.vertex((bx - 0.95) * k, (y - 0.95) * k)
    p.vertex((bx + 0.95) * k, (y - 0.95) * k)
    p.vertex((bx + 0.75) * k, y * k)
    p.vertex((bx - 0.75) * k, y * k)
    p.endShape(p.CLOSE)
    p.stroke(alpha(p, ink, 0.5))
    p.strokeWeight(w * 0.4)
    for (let i = 1; i < 4; i++) p.line((bx - 0.95 + 0.05 * i) * k, (y - 0.95 + 0.24 * i) * k, (bx + 0.95 - 0.05 * i) * k, (y - 0.95 + 0.24 * i) * k)
    // The wick, heaped over its rim.
    solid(p, ink, w * 0.5, LOFT.wick)
    p.beginShape()
    p.vertex((bx - 0.8) * k, (y - 0.95) * k)
    p.bezierVertex((bx - 0.6) * k, (y - 1.35) * k, (bx + 0.6) * k, (y - 1.35) * k, (bx + 0.8) * k, (y - 0.95) * k)
    p.endShape(p.CLOSE)
  }
  // A crock of lard for the moulds.
  const cx = -3.1
  if (see(cx - 1, cx + 1, y - 1.3, y)) {
    solid(p, ink, w * 0.8, mixHex(LOFT.moonDeep, LOFT.tallow, 0.55))
    p.beginShape()
    p.vertex((cx - 0.48) * k, (y - 1.05) * k)
    p.vertex((cx + 0.48) * k, (y - 1.05) * k)
    p.bezierVertex((cx + 0.62) * k, (y - 0.7) * k, (cx + 0.6) * k, (y - 0.2) * k, (cx + 0.46) * k, y * k)
    p.vertex((cx - 0.46) * k, y * k)
    p.bezierVertex((cx - 0.6) * k, (y - 0.2) * k, (cx - 0.62) * k, (y - 0.7) * k, (cx - 0.48) * k, (y - 1.05) * k)
    p.endShape(p.CLOSE)
    solid(p, ink, w * 0.6, mixHex(LOFT.woodLit, LOFT.wood, 0.3))
    rectC(p, k, cx - 0.52, y - 1.16, cx + 0.52, y - 1.03, 0.04)
  }
  // A spare mould frame on its side: six pewter tubes in an oak frame.
  const mx = 0.6
  if (see(mx - 1.4, mx + 1.4, y - 1, y)) {
    solid(p, ink, w * 0.8, LOFT.woodLit)
    rectC(p, k, mx - 1.3, y - 0.7, mx - 1.12, y)
    rectC(p, k, mx + 1.12, y - 0.7, mx + 1.3, y)
    solid(p, ink, w * 0.6, LOFT.pewter)
    for (let i = 0; i < 6; i++) rectC(p, k, mx - 1.12, y - 0.66 + i * 0.108, mx + 1.12, y - 0.66 + (i + 1) * 0.108 - 0.012, 0.03)
  }
}

/* ------------------------------------------------------------------ the candle */

/** The chamberstick: a pewter dish with a rolled rim, the socket, and a finger ring with a thumb-piece. */
function chamberstick(p: p5, k: number, ink: string, w: number): void {
  const { x0, x1, rim } = DISH
  const cx = CANDLE.x
  const base = BENCH.top
  // The finger ring on the east side.
  const rx = x1 + 0.12
  const ry = rim + 0.08
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.5 + 0.11 * k)
  p.ellipse(rx * k, ry * k, 0.42 * k, 0.4 * k)
  p.stroke(LOFT.pewter)
  p.strokeWeight(0.08 * k)
  p.ellipse(rx * k, ry * k, 0.42 * k, 0.4 * k)
  solid(p, ink, w * 0.6, LOFT.pewter)
  p.beginShape()
  p.vertex((rx - 0.12) * k, (ry - 0.2) * k)
  p.vertex((rx + 0.26) * k, (ry - 0.3) * k)
  p.vertex((rx + 0.3) * k, (ry - 0.22) * k)
  p.vertex((rx - 0.02) * k, (ry - 0.12) * k)
  p.endShape(p.CLOSE)
  // The dish: flat on the bench, flaring up to a rolled rim.
  solid(p, ink, w * 0.8, LOFT.pewter)
  p.beginShape()
  p.vertex((x0 + 0.12) * k, (base + 0.005) * k)
  p.vertex((x1 - 0.12) * k, (base + 0.005) * k)
  p.bezierVertex((x1 - 0.02) * k, (base - 0.04) * k, (x1 + 0.02) * k, (rim + 0.08) * k, (x1 + 0.03) * k, rim * k)
  p.vertex((x1 - 0.1) * k, rim * k)
  p.bezierVertex((x1 - 0.14) * k, (rim + 0.12) * k, (cx + 0.3) * k, (base - 0.08) * k, cx * k, (base - 0.08) * k)
  p.bezierVertex((cx - 0.3) * k, (base - 0.08) * k, (x0 + 0.14) * k, (rim + 0.12) * k, (x0 + 0.1) * k, rim * k)
  p.vertex((x0 - 0.03) * k, rim * k)
  p.bezierVertex((x0 - 0.02) * k, (rim + 0.08) * k, (x0 + 0.02) * k, (base - 0.04) * k, (x0 + 0.12) * k, (base + 0.005) * k)
  p.endShape(p.CLOSE)
  // The socket, and its drip-rim.
  solid(p, ink, w * 0.8, mixHex(LOFT.pewter, LOFT.moon, 0.15))
  rectC(p, k, cx - SOCKET.r + 0.06, SOCKET.top, cx + SOCKET.r - 0.06, base - 0.07)
  rectC(p, k, cx - SOCKET.r - 0.06, SOCKET.top - 0.06, cx + SOCKET.r + 0.06, SOCKET.top + 0.06, 0.03)
}

/** The candle: tallow, a little burned down, a run of wax down its side; its wick, and when it is lit, a pool of melted wax. */
function candle(p: p5, k: number, ink: string, w: number, t: number): void {
  const { x, top, r } = CANDLE
  const lit = candleLit(t)
  solid(p, ink, w * 0.9, LOFT.tallow)
  p.beginShape()
  p.vertex((x - r) * k, (SOCKET.top - 0.02) * k)
  p.vertex((x - r) * k, (top + 0.05) * k)
  p.bezierVertex((x - r) * k, (top - 0.01) * k, (x - r + 0.08) * k, (top - 0.04) * k, (x - r + 0.12) * k, (top - 0.02) * k)
  p.bezierVertex((x - 0.08) * k, (top + 0.03) * k, (x + 0.08) * k, (top + 0.03) * k, (x + r - 0.12) * k, (top - 0.02) * k)
  p.bezierVertex((x + r - 0.08) * k, (top - 0.04) * k, (x + r) * k, (top - 0.01) * k, (x + r) * k, (top + 0.05) * k)
  p.vertex((x + r) * k, (SOCKET.top - 0.02) * k)
  p.endShape(p.CLOSE)
  // A run of wax down the west side, set in a bead at its foot.
  p.noStroke()
  p.fill(mixHex(LOFT.tallow, LOFT.beeswax, 0.2))
  p.beginShape()
  p.vertex((x - r + 0.03) * k, (top + 0.02) * k)
  p.vertex((x - r + 0.13) * k, (top + 0.02) * k)
  p.bezierVertex((x - r + 0.13) * k, (top + 0.4) * k, (x - r + 0.1) * k, (top + 0.72) * k, (x - r + 0.08) * k, (top + 0.82) * k)
  p.bezierVertex((x - r + 0.04) * k, (top + 0.86) * k, (x - r) * k, (top + 0.84) * k, (x - r - 0.01) * k, (top + 0.78) * k)
  p.endShape(p.CLOSE)
  // Lit, the top holds a small pool of melted tallow, bright with the flame over it.
  if (lit) {
    p.fill(mixHex(LOFT.tallow, LOFT.glow, 0.55))
    p.ellipse(x * k, (top + 0.005) * k, r * 1.6 * k, 0.06 * k)
  }
  // The wick: upright in the flame when lit; out, a black curl, its tip a dying ember for a moment.
  p.noFill()
  p.stroke(LOFT.soot)
  p.strokeWeight(Math.max(w * 0.6, 0.045 * k))
  if (lit) {
    p.line(x * k, top * k, (x + 0.01) * k, (WICK[1] + 0.1) * k)
  } else {
    const since = t - WICK_LEFT
    const bend = smooth(since, 0, 1.2)
    const tx = x + 0.02 + 0.05 * bend
    const ty = top - 0.2 + 0.03 * bend
    p.beginShape()
    p.vertex(x * k, top * k)
    p.quadraticVertex((x + 0.01) * k, (top - 0.12) * k, tx * k, ty * k)
    p.endShape()
    const ember = Math.exp(-since / 0.7)
    if (ember > 0.02 && since < 3) {
      p.noStroke()
      p.fill(alpha(p, LOFT.ember, ember))
      p.circle(tx * k, ty * k, 0.05 * k)
    }
  }
}

/** The wick's smoke once the flame has gone: a thin thread that rises, sways, thins and goes, drawn over the wall behind. */
function smoke(p: p5, k: number, t: number): void {
  if (candleLit(t)) return
  const since = t - WICK_LEFT
  if (since < 0 || since > 11) return
  const life = 2.6
  const x0 = CANDLE.x + 0.04
  const y0 = CANDLE.top - 0.22
  p.noStroke()
  const grey = mixHex(LOFT.pewter, LOFT.tallow, 0.45)
  for (let j = 0; j < 90; j++) {
    const born = j * 0.085
    const age = since - born
    if (age < 0) break
    if (age > life) continue
    const s = Math.exp(-born / 2.4)
    if (s < 0.03) break
    const y = y0 - 0.5 * age - 0.08 * age * age
    const x = x0 + Math.sin(age * 1.7 + born * 0.9) * 0.1 * age + 0.06 * age * age
    const rr = 0.035 + 0.1 * age
    const a = 0.34 * s * Math.pow(1 - age / life, 1.6) * smooth(age, 0, 0.12)
    p.fill(alpha(p, grey, a))
    p.ellipse(x * k, y * k, rr * 2 * k, rr * 2.3 * k)
  }
}

/* ------------------------------------------------------------------ the room */

export const room = scenery<null>({
  name: 'loft-room',
  draw: (p, _s, c) => {
    const { k, ink, t } = c
    const w = c.weight
    const f = frame(p, k)
    const see: See = (x0, x1, y0 = -Infinity, y1 = Infinity) => x1 >= f.x0 - 0.5 && x0 <= f.x1 + 0.5 && y1 >= f.y0 - 0.5 && y0 <= f.y1 + 0.5
    p.push()
    shell(p, k, ink, w, see)
    floor(p, k, ink, w, see)
    exitDoor(p, k, ink, w, see)
    wallShelf(p, k, ink, w, see)
    bench(p, k, ink, w, see)
    if (see(CANDLE.x - 2, CANDLE.x + 2, CANDLE.top - 3, BENCH.top + 0.5)) {
      chamberstick(p, k, ink, w)
      candle(p, k, ink, w, t)
      smoke(p, k, t)
    }
    for (const layer of ROOM_LAYERS.values()) {
      p.push()
      layer(p, k, ink, w, t)
      p.pop()
    }
    p.pop()
    // The light, over the room and what was drawn into it.
    lightMap(p, k, t)
  },
  over: (p, _s, c) => {
    // The shaft's dust, glowing over everything.
    const f = frame(p, c.k)
    if (f.x0 < PATCH[0] + 4 && f.y1 > SKYLIGHT.y0) shaftGlow(p, c.k, c.t)
  },
})

/** The shaft's patch on the bench top, for parts that want to stand something in the moonlight. */
export const MOON_PATCH = PATCH
export { WICK_BACK, WICK_LEFT, candleLit }

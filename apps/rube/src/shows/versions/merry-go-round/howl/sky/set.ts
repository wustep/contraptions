import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, hash, type Ctx } from '../kit'
import * as TownSet from '../town/town'
import { TOWN, WASTES } from '../worlds'
import { BALCONY, DECK_Y, foot, LAND_AT, PASSAGE, PUFF_BARS, RAIL_TOP, STROKES, TOWER_X, W } from './path'

/**
 * The town right of the hat shop's street, the sky builder's (drawn by `alley.ts` whenever any of it is in view, in
 * the alley's frame: the town world's (26, 0) is its origin). From left to right along one lane: the alley's tall
 * houses (the soldiers, the side passage, the blob men's walls), more houses whose roofs and chimneys the walk on
 * the air passes over, the town hall's tower (its bell, its clock, the weathercock under her step), the square, the
 * café with its first-floor balcony, and houses beyond. Behind them the rest of the town up the hill and the hills,
 * in haze, sliding slower than the lane as the camera moves.
 *
 * Lit by show time through the town's own sky (`skyAt`): noon here, and a settled night if the war ever comes this
 * far. The machines (the bell, the weathercock, the clock's hand) are still outside the walk on the air.
 */

export const G = 0.13

/* ------------------------------------------------------------------ the lane's houses */

interface House {
  x0: number
  x1: number
  eaves: number
  roof: 'gable' | 'side'
  ridge: number
  wall: string
  timber?: boolean
  /** Window centres, as offsets from x0, for the upper floors. */
  win: number[]
  /** Which upper windows (floor * 10 + index) carry a flower box. */
  boxes?: number[]
  chimneys?: { x: number; top: number }[]
  dormer?: number
  /** A plaster band at every floor (the height going by as they climb). */
  bands?: boolean
}

const FLOORS = [-3.1, -5.6, -8.1, -10.6]
const puffX = (i: number) => foot(i)[0]

/** The lane, left to right: every chimney the walk puffs is under a foothold. */
export const HOUSES: House[] = [
  { x0: 0, x1: 3.66, eaves: -9.6, roof: 'side', ridge: -11.4, wall: TOWN.plaster, win: [0.95, 2.7], boxes: [11, 20], chimneys: [{ x: 2.7, top: -12.2 }] },
  // The tall house they climb in front of: a quiet plaster front, windows only at its edges, a band at each floor.
  { x0: 3.66, x1: 8.7, eaves: -10.6, roof: 'gable', ridge: -13.9, wall: mixHex(TOWN.plaster, TOWN.rose, 0.18), win: [0.72, 4.42], boxes: [0, 11, 20], bands: true },
  { x0: 8.7, x1: 12.6, eaves: -9.0, roof: 'side', ridge: -10.9, wall: TOWN.rose, win: [0.95, 2.95], boxes: [0, 21], chimneys: [{ x: puffX(PUFF_BARS[0]), top: -11.85 }] },
  { x0: 12.6, x1: 16.3, eaves: -9.8, roof: 'side', ridge: -11.5, wall: TOWN.plasterShade, win: [0.9, 2.8], boxes: [10], chimneys: [{ x: puffX(PUFF_BARS[1]), top: -12.1 }], dormer: 13.6 },
  { x0: 16.3, x1: 20.1, eaves: -9.4, roof: 'gable', ridge: -12.6, wall: mixHex(TOWN.shutter, TOWN.plaster, 0.55), timber: true, win: [0.95, 2.85], boxes: [0, 11], chimneys: [{ x: puffX(PUFF_BARS[2]), top: -12.25 }] },
  { x0: 20.1, x1: 23.9, eaves: -9.2, roof: 'side', ridge: -11.1, wall: TOWN.plaster, win: [0.9, 2.9], boxes: [1, 20], chimneys: [{ x: puffX(PUFF_BARS[3]), top: -12.3 }], dormer: 21.75 },
  { x0: 23.9, x1: TOWER_X - 1.8, eaves: -9.6, roof: 'gable', ridge: -12.2, wall: TOWN.rose, win: [0.85, 2.1], boxes: [10], chimneys: [{ x: puffX(PUFF_BARS[4]), top: -12.55 }] },
]

/** A washing line over the roofs: from the dormer on F to the chimney on G, sagging; it billows as they step over. */
export const LINE = { a: [21.75, -10.95] as Pt, b: [puffX(PUFF_BARS[4]) - 0.26, -11.6] as Pt, sag: 0.34, bar: 15 }

/** The café: its walls, and the houses beyond it. */
export const CAFE: [number, number] = [BALCONY[0] - 0.56, BALCONY[0] + 7.9]
const BEYOND: House[] = [
  { x0: CAFE[1], x1: CAFE[1] + 3.8, eaves: -9.4, roof: 'gable', ridge: -12.4, wall: TOWN.plasterShade, timber: true, win: [0.95, 2.85], boxes: [0] },
  { x0: CAFE[1] + 3.8, x1: CAFE[1] + 8.0, eaves: -8.8, roof: 'side', ridge: -10.6, wall: TOWN.plaster, win: [0.9, 2.1, 3.3], boxes: [11], chimneys: [{ x: CAFE[1] + 7.2, top: -11.4 }] },
  { x0: CAFE[1] + 8.0, x1: CAFE[1] + 11.6, eaves: -9.8, roof: 'gable', ridge: -12.9, wall: TOWN.rose, win: [0.9, 2.7] },
  { x0: CAFE[1] + 11.6, x1: CAFE[1] + 16, eaves: -9.0, roof: 'side', ridge: -10.9, wall: mixHex(TOWN.shutter, TOWN.plaster, 0.55), win: [1.0, 2.2, 3.4], boxes: [0, 12] },
]
/** The square: from the tower to the café. */
export const SQUARE: [number, number] = [TOWER_X + 1.8, CAFE[0]]
/** The tower: its shaft's sides, the belfry's arch, the bell's axle, the spire's tip, the weathercock. */
export const TOWER = {
  x0: TOWER_X - 1.8,
  x1: TOWER_X + 1.8,
  cornice: -9.2,
  sill: -9.6,
  spring: -10.5,
  eaves: -11.8,
  tip: -14.55,
  cock: -14.85,
  axle: -11.1,
  clock: [TOWER_X, -7.25] as Pt,
  clockR: 0.82,
}

/* ------------------------------------------------------------------ light */

export interface Light {
  t: number
  tone: (hex: string) => string
  haze: string
  dark: number
}
/** The town builder's own light on the outside (so the lane matches the street), if the town set exports it. */
const outside = (TownSet as unknown as { outside?: (t: number) => (hex: string) => string }).outside
export function lightAt(t: number): Light {
  const sky = TownSet.skyAt(t)
  const tone = outside ? outside(t) : (hex: string) => mixHex(hex, TOWN.night, sky.dark * 0.62)
  return { t, tone, haze: sky.low, dark: sky.dark }
}

/* ------------------------------------------------------------------ helpers */

function rectC(p: p5, x: number, y: number, w: number, h: number, k: number, r = 0): void {
  p.rect(x * k, y * k, w * k, h * k, r * k)
}
function poly(p: p5, pts: Pt[], k: number): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A small cluster of flowers along a box: blooms of a few sizes over leaves, never beads in a row. */
function blooms(p: p5, k: number, x0: number, x1: number, y: number, L: Light, seed: number, colours = [TOWN.ribbon, TOWN.rose, TOWN.ribbon]): void {
  p.noStroke()
  p.fill(L.tone(TOWN.moss))
  const n = Math.max(3, Math.round((x1 - x0) / 0.12))
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i + 0.5) / n) * (x1 - x0)
    p.ellipse(x * k, (y - 0.05 - 0.04 * hash(i, seed)) * k, (0.14 + 0.05 * hash(i, seed, 2)) * k, 0.11 * k)
  }
  for (let i = 0; i < n; i++) {
    if (hash(i, seed, 3) < 0.25) continue
    const x = x0 + ((i + 0.3 + 0.4 * hash(i, seed, 4)) / n) * (x1 - x0)
    p.fill(L.tone(colours[i % colours.length]))
    const r = 0.05 + 0.04 * hash(i, seed, 5)
    p.ellipse(x * k, (y - 0.1 - 0.07 * hash(i, seed, 6)) * k, 2 * r * k, 1.7 * r * k)
  }
}

function window_(p: p5, c: Ctx, L: Light, x: number, y0: number, w: number, h: number, box: boolean, seed: number, lit: boolean): void {
  const { k, ink, weight } = c
  // Shutters, open either side; the frame; the panes; the sill.
  p.stroke(ink)
  p.strokeWeight(weight * 0.55)
  p.fill(L.tone(TOWN.shutter))
  rectC(p, x - w / 2 - 0.3, y0, 0.28, h, k)
  rectC(p, x + w / 2 + 0.02, y0, 0.28, h, k)
  p.fill(L.tone(TOWN.plaster))
  rectC(p, x - w / 2, y0, w, h, k)
  p.fill(lit ? TOWN.glow : L.tone(mixHex(TOWN.slateDark, TOWN.canal, 0.25)))
  p.strokeWeight(weight * 0.4)
  rectC(p, x - w / 2 + 0.06, y0 + 0.06, w / 2 - 0.08, h - 0.12, k)
  rectC(p, x + 0.02, y0 + 0.06, w / 2 - 0.08, h - 0.12, k)
  p.strokeWeight(weight * 0.55)
  p.fill(L.tone(TOWN.plasterShade))
  rectC(p, x - w / 2 - 0.06, y0 + h, w + 0.12, 0.07, k)
  if (box) {
    p.fill(L.tone(TOWN.timber))
    rectC(p, x - w / 2 - 0.02, y0 + h + 0.07, w + 0.04, 0.14, k)
    blooms(p, k, x - w / 2, x + w / 2, y0 + h + 0.08, L, seed)
  }
}

function roofSide(p: p5, c: Ctx, L: Light, x0: number, x1: number, eaves: number, ridge: number): void {
  const { k, ink, weight } = c
  const inset = (eaves - ridge) * 0.45
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(L.tone(TOWN.slate))
  poly(p, [[x0 - 0.22, eaves + 0.05], [x1 + 0.22, eaves + 0.05], [x1 - inset, ridge], [x0 + inset, ridge]], k)
  // Courses of slate, faint.
  p.stroke(alpha(p, L.tone(TOWN.slateDark), 0.55))
  p.strokeWeight(weight * 0.45)
  for (let j = 1; j < 4; j++) {
    const y = eaves + ((ridge - eaves) * j) / 4
    const f = j / 4
    p.line((x0 - 0.22 + (inset + 0.22) * f) * k, y * k, (x1 + 0.22 - (inset + 0.22) * f) * k, y * k)
  }
}

function roofGable(p: p5, c: Ctx, L: Light, h: House): void {
  const { k, ink, weight } = c
  const mid = (h.x0 + h.x1) / 2
  // The gable's wall, then the verges: two thick slate bands down the slopes.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(L.tone(h.wall))
  poly(p, [[h.x0, h.eaves], [h.x1, h.eaves], [mid, h.ridge]], k)
  p.fill(L.tone(TOWN.slate))
  const v = 0.26
  const ang = Math.atan2(h.eaves - h.ridge, (h.x1 - h.x0) / 2)
  const dx = v / Math.sin(ang)
  poly(p, [[h.x0 - 0.2, h.eaves + 0.05], [h.x0 - 0.2 + dx * 0.9, h.eaves + 0.05], [mid, h.ridge + v * 1.2], [mid, h.ridge - 0.08]], k)
  poly(p, [[h.x1 + 0.2, h.eaves + 0.05], [h.x1 + 0.2 - dx * 0.9, h.eaves + 0.05], [mid, h.ridge + v * 1.2], [mid, h.ridge - 0.08]], k)
  // A small attic window in the gable.
  p.strokeWeight(weight * 0.5)
  p.fill(L.tone(mixHex(TOWN.slateDark, TOWN.canal, 0.25)))
  const aw = Math.min(0.55, (h.x1 - h.x0) * 0.14)
  rectC(p, mid - aw / 2, h.eaves - (h.eaves - h.ridge) * 0.52, aw, aw * 1.3, k)
}

function timberFrame(p: p5, c: Ctx, L: Light, h: House): void {
  const { k, ink, weight } = c
  p.stroke(ink)
  p.strokeWeight(weight * 0.5)
  p.fill(L.tone(TOWN.timber))
  const b = 0.1
  // Posts at the ends and between the windows; a beam at each floor; a brace in each bay under the windows.
  const posts = [h.x0 + 0.02, h.x1 - b - 0.02, ...h.win.slice(0, -1).map((w, i) => h.x0 + (w + h.win[i + 1]) / 2 - b / 2)]
  const top = h.eaves
  for (const x of posts) rectC(p, x, top, b, FLOORS[0] - top, k)
  for (const y of FLOORS) if (y > top - 0.01) rectC(p, h.x0, y - b / 2, h.x1 - h.x0, b, k)
  for (let f = 0; f < FLOORS.length - 1; f++) {
    const y0 = FLOORS[f]
    const y1 = FLOORS[f + 1]
    if (y1 < top - 0.01) break
    for (const w of h.win) {
      const x = h.x0 + w
      const yb = y0 - 0.12
      const yt = y0 - (y0 - y1) * 0.3
      p.quad((x - 0.42) * k, yb * k, (x - 0.36) * k, yb * k, (x + 0.42) * k, yt * k, (x + 0.36) * k, yt * k)
      p.quad((x + 0.42) * k, yb * k, (x + 0.36) * k, yb * k, (x - 0.42) * k, yt * k, (x - 0.36) * k, yt * k)
    }
  }
}

function chimney(p: p5, c: Ctx, L: Light, x: number, base: number, top: number): void {
  const { k, ink, weight } = c
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(L.tone(TOWN.plasterShade))
  rectC(p, x - 0.26, top + 0.3, 0.52, base - top - 0.3, k)
  p.fill(L.tone(TOWN.slateDark))
  rectC(p, x - 0.31, top + 0.22, 0.62, 0.1, k)
  // Two pots.
  p.fill(L.tone(TOWN.slate))
  for (const dx of [-0.12, 0.12]) rectC(p, x + dx - 0.07, top, 0.14, 0.23, k, 0.02)
}

/** The y of a house's roof over x (where a chimney stands on it). */
function roofAt(h: House, x: number): number {
  if (h.roof === 'side') return h.eaves + (h.ridge - h.eaves) * 0.55
  const mid = (h.x0 + h.x1) / 2
  const f = 1 - Math.abs(x - mid) / ((h.x1 - h.x0) / 2)
  return h.eaves + (h.ridge - h.eaves) * Math.max(0, f)
}

function house(p: p5, c: Ctx, L: Light, h: House, seed: number, ground: (p: p5, c: Ctx, L: Light, h: House) => void): void {
  const { k, ink, weight } = c
  const lit = L.dark > 0.5
  // Chimneys first, so the roof stands in front of their feet.
  for (const ch of h.chimneys ?? []) chimney(p, c, L, ch.x, roofAt(h, ch.x) + 0.3, ch.top)
  if (h.roof === 'side') roofSide(p, c, L, h.x0, h.x1, h.eaves, h.ridge)
  // The wall.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(L.tone(h.wall))
  rectC(p, h.x0, h.eaves, h.x1 - h.x0, G - h.eaves, k)
  if (h.roof === 'gable') roofGable(p, c, L, h)
  if (h.timber) timberFrame(p, c, L, h)
  // A string course at the first floor (and at every floor on a banded house).
  p.noStroke()
  p.fill(L.tone(TOWN.plasterShade))
  for (const y of h.bands ? FLOORS : [FLOORS[0]]) if (y > h.eaves + 0.2) rectC(p, h.x0, y - 0.07, h.x1 - h.x0, 0.14, k)
  // Upper windows.
  for (let f = 0; f < FLOORS.length - 1; f++) {
    const y0 = FLOORS[f + 1]
    if (y0 < h.eaves - 0.01) break
    for (let i = 0; i < h.win.length; i++) {
      const box = (h.boxes ?? []).includes(f * 10 + i)
      window_(p, c, L, h.x0 + h.win[i], y0 + 0.5, 0.62, 1.3, box, seed * 31 + f * 7 + i, lit && hash(seed, f, i) > 0.4)
    }
  }
  // A dormer in the roof.
  if (h.dormer !== undefined) {
    const d = h.dormer
    const y = h.eaves - 0.7
    p.stroke(ink)
    p.strokeWeight(weight * 0.6)
    p.fill(L.tone(h.wall))
    rectC(p, d - 0.4, y - 0.8, 0.8, 0.8, k)
    p.fill(L.tone(TOWN.slate))
    poly(p, [[d - 0.55, y - 0.75], [d + 0.55, y - 0.75], [d, y - 1.25]], k)
    p.fill(lit ? TOWN.glow : L.tone(mixHex(TOWN.slateDark, TOWN.canal, 0.25)))
    rectC(p, d - 0.22, y - 0.62, 0.44, 0.5, k)
  }
  ground(p, c, L, h)
  // The eaves' gutter and a shadow under it.
  p.noStroke()
  p.fill(alpha(p, L.tone(TOWN.slateDark), 0.28))
  rectC(p, h.x0, h.eaves, h.x1 - h.x0, 0.16, k)
}

/* ------------------------------------------------------------------ ground floors */

function groundPlain(p: p5, c: Ctx, L: Light, h: House): void {
  const { k, ink, weight } = c
  // A door and a low window, alternating by house.
  const w = h.x1 - h.x0
  const dx = h.x0 + w * (hash(h.x0 | 0, 9) > 0.5 ? 0.3 : 0.7)
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(L.tone(TOWN.timberDark))
  p.push()
  p.rectMode(p.CORNER)
  rectC(p, dx - 0.42, -2.1, 0.84, 2.1 + G, k, 0.08)
  p.pop()
  p.fill(L.tone(TOWN.plasterShade))
  rectC(p, dx - 0.52, -2.2, 1.04, 0.12, k)
  const wx = dx < h.x0 + w / 2 ? h.x1 - w * 0.28 : h.x0 + w * 0.28
  window_(p, c, L, wx, -2.35, 0.62, 1.2, false, h.x0 * 13, L.dark > 0.5)
}

function groundAlley(p: p5, c: Ctx, L: Light, h: House): void {
  const { k, ink, weight } = c
  if (h.x0 === 0) {
    // The corner house: a barred window, the drainpipe down its right edge, a lamp bracket at the corner.
    window_(p, c, L, 2.0, -2.4, 0.55, 1.0, false, 3, false)
    p.stroke(ink)
    p.strokeWeight(weight * 0.55)
    for (let i = 0; i < 3; i++) p.line((1.82 + i * 0.18) * k, -2.34 * k, (1.82 + i * 0.18) * k, -1.46 * k)
    p.fill(L.tone(TOWN.slate))
    p.strokeWeight(weight * 0.6)
    rectC(p, 3.42, h.eaves + 0.1, 0.11, G - h.eaves - 0.25, k)
    poly(p, [[3.42, G - 0.15], [3.53, G - 0.15], [3.62, G - 0.02], [3.37, G - 0.02]], k)
    // The lamp: an iron arm off the wall and a lantern hanging from it.
    p.noFill()
    p.strokeWeight(weight * 0.8)
    p.line(0.18 * k, -3.05 * k, 0.72 * k, -3.05 * k)
    p.line(0.18 * k, -2.8 * k, 0.5 * k, -3.05 * k)
    p.fill(L.dark > 0.5 ? TOWN.glow : L.tone(TOWN.plasterShade))
    p.strokeWeight(weight * 0.6)
    poly(p, [[0.6, -2.92], [0.84, -2.92], [0.8, -2.62], [0.64, -2.62]], k)
    p.fill(L.tone(TOWN.timberDark))
    poly(p, [[0.56, -2.92], [0.88, -2.92], [0.72, -3.04]], k)
    return
  }
  // The side passage: a dark arched way through the house, a stone surround.
  const [a0, a1, top] = PASSAGE
  const mid = (a0 + a1) / 2
  const r = (a1 - a0) / 2
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(L.tone(TOWN.plasterShade))
  p.beginShape()
  p.vertex((a0 - 0.16) * k, G * k)
  p.vertex((a0 - 0.16) * k, (top + r) * k)
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI
    p.vertex((mid + Math.cos(a) * (r + 0.16)) * k, (top + r + Math.sin(a) * (r + 0.16)) * k)
  }
  p.vertex((a1 + 0.16) * k, G * k)
  p.endShape(p.CLOSE)
  p.fill(L.tone(mixHex(TOWN.night, TOWN.timberDark, 0.35)))
  p.beginShape()
  p.vertex(a0 * k, G * k)
  p.vertex(a0 * k, (top + r) * k)
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i / 12) * Math.PI
    p.vertex((mid + Math.cos(a) * r) * k, (top + r + Math.sin(a) * r) * k)
  }
  p.vertex(a1 * k, G * k)
  p.endShape(p.CLOSE)
  // Light at the far end of the passage: a sliver of the next street.
  p.noStroke()
  p.fill(alpha(p, L.tone(TOWN.plaster), 0.35))
  rectC(p, mid - 0.12, top + 0.55, 0.24, G - top - 0.55, k)
  // A low window further along.
  window_(p, c, L, 7.35, -2.45, 0.6, 1.1, true, 17, L.dark > 0.5)
}

/* ------------------------------------------------------------------ the far town */

/** How much of the camera's move a far layer takes: the hills barely move, the next street up nearly keeps pace. */
const PAR = { mid: 0.28, far: 0.52, hills: 0.74 }
/** The camera x at which the far layers stand where they are drawn (the wide over the square). */
const REF_X = 36

/** The camera height at which the clouds stand where they are placed (the wide over the square). */
const REF_Y = -9.3
const CLOUDS = [
  { x: 4, y: -19.8, w: 8.5, s: 1 },
  { x: 16, y: -22.5, w: 9, s: 2 },
  // Off to the right of the swell and its way down: never behind the two of them in the sky.
  { x: 49, y: -13.0, w: 12, s: 3 },
  { x: 55, y: -21.2, w: 12, s: 4 },
  { x: 71, y: -18.4, w: 9, s: 5 },
]
/** A soft round of colour: solid through its middle, fading out over its edge (a cloud's heap, never an outline). */
function soft(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rgb: string, a: number): void {
  if (a <= 0.004 || rx <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, `rgba(${rgb}, ${a})`)
  g.addColorStop(0.55, `rgba(${rgb}, ${a})`)
  g.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, rx, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
const rgbOf = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/**
 * Fair-weather clouds far off over the hills: two or three heaps of uneven size on a soft, cool underside, lit from
 * above; soft volume with soft edges, never outlined, never a row of even bumps on a ruled base. They hardly move with
 * the camera and drift on the wind.
 */
function clouds(p: p5, c: Ctx, L: Light, f: { x0: number; x1: number; cx: number; cy: number }): void {
  if (L.dark > 0.5) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ox = (f.cx - REF_X) * 0.88 + L.t * 0.05
  const oy = (f.cy - REF_Y) * 0.85
  const lit = rgbOf(WASTES.cloud)
  const under = rgbOf(mixHex(WASTES.cloud, TOWN.slate, 0.3))
  for (const cl of CLOUDS) {
    const cx = cl.x + ox
    if (cx + cl.w < f.x0 - 1 || cx - cl.w > f.x1 + 1) continue
    const base = cl.y + oy
    const n = Math.max(6, Math.round(cl.w / 0.8))
    // Two heaps, one bigger, at uneven places along it; small domes between and down its ends.
    const p1 = 0.3 + 0.15 * hash(cl.s, 9)
    const p2 = 0.62 + 0.18 * hash(cl.s, 10)
    const h2 = 0.45 + 0.3 * hash(cl.s, 11)
    const puffs: [number, number, number][] = []
    for (let i = 0; i < n; i++) {
      const u = (i + 0.3 + 0.4 * hash(i, cl.s, 4)) / n
      const bell = Math.max(Math.exp(-(((u - p1) / 0.2) ** 2)), h2 * Math.exp(-(((u - p2) / 0.16) ** 2)))
      const r = cl.w * (0.05 + 0.13 * bell) * (0.7 + 0.6 * hash(i, cl.s))
      const x = cx - cl.w / 2 + u * cl.w + (hash(i, cl.s, 2) - 0.5) * 0.6
      puffs.push([x, base - r * (0.35 + 0.5 * bell) - 0.25 * hash(i, cl.s, 3), r])
    }
    // The underside: a long soft shadow, flatter than the heaps and thinning out at the ends.
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n
      const end = Math.sin(Math.PI * u)
      soft(ctx, (cx - cl.w / 2 + u * cl.w) * k, (base - 0.35) * k, (0.9 + 1.1 * end) * k, (0.45 + 0.4 * end) * k, under, 0.42 * end)
    }
    for (const [x, y, r] of puffs) soft(ctx, x * k, (y + r * 0.18) * k, 1.05 * r * k, 0.9 * r * k, under, 0.5)
    // The lit tops, a little up and to the left of each heap.
    for (const [x, y, r] of puffs) soft(ctx, (x - r * 0.12) * k, (y - r * 0.18) * k, 0.95 * r * k, 0.82 * r * k, lit, 0.85)
  }
}

function farTown(p: p5, c: Ctx, L: Light, f: { x0: number; x1: number; y0: number; y1: number; cx: number; cy: number }): void {
  const { k, ink, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, (f.y0 - 1) * k, (f.x1 + 1) * k, (f.y1 - f.y0 + 2) * k)
  ctx.clip()
  clouds(p, c, L, f)
  // The hills beyond the town: two soft ridges in haze.
  for (const [layer, d, amp, base, mixA, seed] of [
    [0, PAR.hills + 0.1, 1.1, -13.4, 0.78, 3],
    [1, PAR.hills, 1.4, -11.6, 0.66, 7],
  ] as const) {
    const off = (f.cx - REF_X) * d
    p.noStroke()
    p.fill(mixHex(L.tone(layer ? TOWN.moss : TOWN.shutter), L.haze, mixA))
    p.beginShape()
    const xa = Math.floor(f.x0) - 2
    const xb = Math.ceil(f.x1) + 2
    for (let x = xa; x <= xb; x += 0.5) {
      const u = x - off
      const y = base - amp * (Math.sin(u * 0.09 + seed) * 0.6 + Math.sin(u * 0.23 + seed * 2) * 0.3 + Math.sin(u * 0.51 + seed) * 0.1)
      p.vertex(x * k, y * k)
    }
    p.vertex(xb * k, -3 * k)
    p.vertex(xa * k, -3 * k)
    p.endShape(p.CLOSE)
  }
  // The town up the hill: roofs in haze, a church's spire.
  {
    const off = (f.cx - REF_X) * PAR.far
    const i0 = Math.floor((f.x0 - off) / 2.3) - 2
    const i1 = Math.ceil((f.x1 - off) / 2.3) + 2
    p.stroke(alpha(p, ink, 0.12))
    p.strokeWeight(weight * 0.5)
    for (let i = i0; i <= i1; i++) {
      const x0 = i * 2.3 + off + (hash(i, 41) - 0.5) * 0.6
      const w = 2.0 + hash(i, 42) * 1.2
      const eav = -10.2 - hash(i, 43) * 1.6
      const rid = eav - 1.0 - hash(i, 44) * 1.2
      const wall = [TOWN.plaster, TOWN.rose, TOWN.plasterShade, TOWN.shutter][Math.floor(hash(i, 45) * 4)]
      p.fill(mixHex(L.tone(wall), L.haze, 0.62))
      rectC(p, x0, eav, w, 6, k)
      p.fill(mixHex(L.tone(TOWN.slate), L.haze, 0.55))
      if (hash(i, 46) > 0.5) poly(p, [[x0 - 0.1, eav], [x0 + w + 0.1, eav], [x0 + w / 2, rid]], k)
      else poly(p, [[x0 - 0.1, eav], [x0 + w + 0.1, eav], [x0 + w - 0.5, rid + 0.4], [x0 + 0.5, rid + 0.4]], k)
      p.fill(mixHex(L.tone(TOWN.slateDark), L.haze, 0.6))
      for (let j = 0; j < 2; j++) rectC(p, x0 + 0.4 + j * (w - 1.0), eav + 0.7, 0.3, 0.45, k)
      if (i % 17 === 5) {
        // The church: a tower and a tall spire.
        const cx = x0 + w / 2
        p.fill(mixHex(L.tone(TOWN.plasterShade), L.haze, 0.55))
        rectC(p, cx - 0.55, rid - 2.2, 1.1, 8, k)
        p.fill(mixHex(L.tone(TOWN.slate), L.haze, 0.5))
        poly(p, [[cx - 0.7, rid - 2.2], [cx + 0.7, rid - 2.2], [cx, rid - 5.4]], k)
      }
    }
  }
  // The next street over and the square's far side: whole houses down to the ground, a little hazy.
  {
    const off = (f.cx - REF_X) * PAR.mid
    const i0 = Math.floor((f.x0 - off) / 3.1) - 2
    const i1 = Math.ceil((f.x1 - off) / 3.1) + 2
    for (let i = i0; i <= i1; i++) {
      const x0 = i * 3.1 + off
      const w = 3.1
      const eav = -7.2 - hash(i, 51) * 2.0
      const rid = eav - 1.4 - hash(i, 52) * 1.3
      const wall = [TOWN.plaster, TOWN.rose, mixHex(TOWN.shutter, TOWN.plaster, 0.5), TOWN.plasterShade][Math.floor(hash(i, 53) * 4)]
      const tint = (hex: string) => mixHex(L.tone(hex), L.haze, 0.38)
      p.stroke(alpha(p, ink, 0.3))
      p.strokeWeight(weight * 0.55)
      p.fill(tint(wall))
      rectC(p, x0, eav, w, G - eav, k)
      p.fill(tint(TOWN.slate))
      if (hash(i, 54) > 0.45) poly(p, [[x0 - 0.15, eav], [x0 + w + 0.15, eav], [x0 + w / 2, rid]], k)
      else poly(p, [[x0 - 0.15, eav], [x0 + w + 0.15, eav], [x0 + w - 0.6, rid + 0.5], [x0 + 0.6, rid + 0.5]], k)
      p.noStroke()
      for (let fl = 0; fl < 3; fl++) {
        const y = -2.6 - fl * 2.3
        if (y - 1 < eav) break
        for (let j = 0; j < 3; j++) {
          const lit = L.dark > 0.5 && hash(i, fl, j) > 0.5
          p.fill(lit ? mixHex(TOWN.glow, L.haze, 0.2) : tint(mixHex(TOWN.slateDark, TOWN.canal, 0.3)))
          rectC(p, x0 + 0.45 + j * 0.9, y - 1.0, 0.42, 0.95, k)
        }
      }
      // Doors on the ground.
      p.fill(tint(TOWN.timberDark))
      rectC(p, x0 + 1.25, -1.6, 0.6, 1.6 + G, k)
      // Parade day: a flag hung from some of them.
      if (hash(i, 55) > 0.55) {
        const fx = x0 + 0.5 + hash(i, 56) * 2
        const fy = eav + 1.1
        const wave = Math.sin(L.t * 2.4 + i) * 0.06
        p.stroke(alpha(p, ink, 0.35))
        p.strokeWeight(weight * 0.4)
        p.line(fx * k, fy * k, (fx + 0.5) * k, (fy - 0.45) * k)
        p.noStroke()
        p.fill(tint(hash(i, 57) > 0.5 ? TOWN.ribbon : TOWN.gold))
        poly(p, [[fx + 0.5, fy - 0.45], [fx + 0.5 + 0.05, fy + 0.35 + wave], [fx + 0.95, fy + 0.3 - wave], [fx + 0.9, fy - 0.5]], k)
      }
    }
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ the tower */

/** The bell's swing: pulled off rest through bar 18, twelve full swings (a stroke at each end, on the downbeats), then dying away. */
export function bellAngle(t: number): number {
  const A = 0.5
  if (t <= W[18]) return 0
  if (t < W[19]) {
    // Pulled off rest: out to the first end of its swing, arriving there (still) on the first stroke.
    const u = (t - W[18]) / (W[19] - W[18])
    return -A * (u * u * (3 - 2 * u))
  }
  const last = STROKES[STROKES.length - 1]
  const bars = (tt: number) => {
    for (let i = 19; i < W.length - 1; i++) if (tt < W[i + 1]) return i - 19 + (tt - W[i]) / (W[i + 1] - W[i])
    return W.length - 1 - 19
  }
  const phase = bars(t)
  const amp = t <= last ? A : A * Math.exp(-(t - last) / 1.4)
  return -amp * Math.cos(Math.PI * phase)
}

/** The weathercock's turn: kicked round by her step on the first stroke, spinning down to rest facing the other way. */
export function cockTurn(t: number): number {
  const at = STROKES[0]
  if (t < at) return 0
  const u = t - at
  // Spins through three and a half turns, slowing (critically damped onto its new heading).
  const total = Math.PI * 7
  return total * (1 - Math.exp(-u / 0.9) * (1 + u / 0.9))
}

function drawTower(p: p5, c: Ctx, L: Light): void {
  const { k, ink, weight } = c
  const T = TOWER
  const X = TOWER_X
  const stone = L.tone(TOWN.plasterShade)
  const stoneDark = L.tone(mixHex(TOWN.plasterShade, TOWN.slateDark, 0.25))
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  // The spire: a steep slate pyramid, a small lucarne, and its eaves over the belfry.
  p.fill(L.tone(TOWN.slate))
  poly(p, [[T.x0 - 0.22, T.eaves + 0.06], [T.x1 + 0.22, T.eaves + 0.06], [X, T.tip]], k)
  p.stroke(alpha(p, L.tone(TOWN.slateDark), 0.6))
  p.strokeWeight(weight * 0.45)
  for (const f of [0.33, 0.66]) {
    const y = T.eaves + (T.tip - T.eaves) * f
    const hw = (1 - f) * (T.x1 - T.x0 + 0.44) / 2
    p.line((X - hw) * k, y * k, (X + hw) * k, y * k)
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(stone)
  poly(p, [[X - 0.28, -12.35], [X + 0.28, -12.35], [X + 0.28, -12.9], [X, -13.15], [X - 0.28, -12.9]], k)
  p.fill(L.tone(mixHex(TOWN.slateDark, TOWN.canal, 0.2)))
  rectC(p, X - 0.13, -12.82, 0.26, 0.4, k)
  // The shaft: stone, quoins at the corners, a plinth, a tall door onto the square, a slit window.
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.fill(stone)
  rectC(p, T.x0, T.eaves, T.x1 - T.x0, G - T.eaves, k)
  p.strokeWeight(weight * 0.5)
  p.fill(stoneDark)
  for (let y = G - 0.55, j = 0; y > T.eaves + 0.2; y -= 0.55, j++) {
    const w = j % 2 ? 0.34 : 0.52
    rectC(p, T.x0, y, w, 0.5, k)
    rectC(p, T.x1 - w, y, w, 0.5, k)
  }
  p.strokeWeight(weight * 0.8)
  p.fill(stoneDark)
  rectC(p, T.x0 - 0.12, -0.9, T.x1 - T.x0 + 0.24, 0.9 + G, k)
  p.fill(L.tone(TOWN.timberDark))
  p.beginShape()
  p.vertex((X - 0.55) * k, G * k)
  p.vertex((X - 0.55) * k, -2.3 * k)
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI
    p.vertex((X + Math.cos(a) * 0.55) * k, (-2.3 + Math.sin(a) * 0.55) * k)
  }
  p.vertex((X + 0.55) * k, G * k)
  p.endShape(p.CLOSE)
  p.fill(L.tone(mixHex(TOWN.slateDark, TOWN.canal, 0.2)))
  rectC(p, X - 0.1, -5.2, 0.2, 0.9, k)
  // The cornice under the belfry, and the belfry's cornice.
  p.fill(stoneDark)
  rectC(p, T.x0 - 0.16, T.cornice - 0.22, T.x1 - T.x0 + 0.32, 0.22, k)
  rectC(p, T.x0 - 0.16, T.eaves, T.x1 - T.x0 + 0.32, 0.2, k)
  // The clock: a plaster face, a gilt ring, four gilt marks, the hands at noon (the minute hand clicks onto it on the first stroke).
  const [cx, cy] = T.clock
  p.fill(L.tone(TOWN.gold))
  p.circle(cx * k, cy * k, 2 * (T.clockR + 0.1) * k)
  p.fill(L.tone(TOWN.plaster))
  p.circle(cx * k, cy * k, 2 * T.clockR * k)
  p.noStroke()
  p.fill(L.tone(TOWN.gold))
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    p.push()
    p.translate((cx + Math.sin(a) * T.clockR * 0.8) * k, (cy - Math.cos(a) * T.clockR * 0.8) * k)
    p.rotate(a)
    p.rect(-0.04 * k, -0.1 * k, 0.08 * k, 0.2 * k)
    p.pop()
  }
  const t = L.t
  const click = t < STROKES[0] ? -0.105 : 0.018 * Math.exp(-(t - STROKES[0]) / 0.12) * Math.cos((t - STROKES[0]) * 40)
  const hand = (a: number, len: number, w: number) => {
    p.push()
    p.translate(cx * k, cy * k)
    p.rotate(a)
    p.fill(L.tone(TOWN.blob))
    p.stroke(ink)
    p.strokeWeight(weight * 0.4)
    poly(p, [[-w, 0.08], [w, 0.08], [w * 0.4, -len], [-w * 0.4, -len]], k)
    p.pop()
  }
  hand(-0.01, T.clockR * 0.52, 0.055)
  hand(click, T.clockR * 0.82, 0.04)
  p.fill(L.tone(TOWN.blob))
  p.noStroke()
  p.circle(cx * k, cy * k, 0.1 * k)
}

/** The belfry's open arch, the bell swinging in it, and the pigeons on its sill until the first stroke. */
function drawBelfry(p: p5, c: Ctx, L: Light): void {
  const { k, ink, weight } = c
  const T = TOWER
  const X = TOWER_X
  const r = 1.0
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const arch = () => {
    p.beginShape()
    p.vertex((X - r) * k, T.sill * k)
    p.vertex((X - r) * k, T.spring * k)
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (i / 14) * Math.PI
      p.vertex((X + Math.cos(a) * r) * k, (T.spring + Math.sin(a) * r) * k)
    }
    p.vertex((X + r) * k, T.sill * k)
    p.endShape(p.CLOSE)
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.fill(L.tone(mixHex(TOWN.night, TOWN.slateDark, 0.45)))
  arch()
  // The bell, clipped to the arch (the piers are in front of it).
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((X - r) * k, T.sill * k)
  ctx.lineTo((X - r) * k, T.spring * k)
  ctx.arc(X * k, T.spring * k, r * k, Math.PI, 2 * Math.PI)
  ctx.lineTo((X + r) * k, T.sill * k)
  ctx.closePath()
  ctx.clip()
  // The beam it hangs from.
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(L.tone(TOWN.timberDark))
  rectC(p, X - r, T.axle - 0.08, 2 * r, 0.12, k)
  const th = bellAngle(L.t)
  const bronze = L.tone(mixHex(TOWN.gold, TOWN.timber, 0.35))
  p.push()
  p.translate(X * k, T.axle * k)
  p.rotate(th)
  // The headstock.
  p.fill(L.tone(TOWN.timber))
  rectC(p, -0.36, -0.08, 0.72, 0.18, k, 0.03)
  // The clapper, hanging inside, lagging the bell and touching its lip at each end of the swing.
  const amp = 0.5
  const rel = -Math.sign(th) * 0.3 * Math.pow(Math.min(1, Math.abs(th) / amp), 4)
  p.push()
  p.translate(0, 0.16 * k)
  p.rotate(rel)
  p.stroke(ink)
  p.strokeWeight(weight * 0.9)
  p.line(0, 0, 0, 0.82 * k)
  p.fill(L.tone(TOWN.slateDark))
  p.ellipse(0, 0.86 * k, 0.12 * k, 0.16 * k)
  p.pop()
  // The bell: crown, shoulder, waist, the flare and the lip.
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(bronze)
  p.beginShape()
  p.vertex(-0.2 * k, 0.1 * k)
  p.bezierVertex(-0.34 * k, 0.12 * k, -0.33 * k, 0.4 * k, -0.34 * k, 0.6 * k)
  p.bezierVertex(-0.35 * k, 0.82 * k, -0.52 * k, 0.9 * k, -0.54 * k, 1.04 * k)
  p.vertex(0.54 * k, 1.04 * k)
  p.bezierVertex(0.52 * k, 0.9 * k, 0.35 * k, 0.82 * k, 0.34 * k, 0.6 * k)
  p.bezierVertex(0.33 * k, 0.4 * k, 0.34 * k, 0.12 * k, 0.2 * k, 0.1 * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, L.tone(TOWN.glow), 0.35))
  p.beginShape()
  p.vertex(-0.14 * k, 0.16 * k)
  p.bezierVertex(-0.24 * k, 0.3 * k, -0.24 * k, 0.6 * k, -0.3 * k, 0.86 * k)
  p.vertex(-0.2 * k, 0.86 * k)
  p.bezierVertex(-0.16 * k, 0.6 * k, -0.16 * k, 0.3 * k, -0.08 * k, 0.16 * k)
  p.endShape(p.CLOSE)
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(L.tone(mixHex(TOWN.gold, TOWN.timber, 0.55)))
  rectC(p, -0.56, 0.98, 1.12, 0.08, k, 0.03)
  p.pop()
  ctx.restore()
  // The piers' sill: a stone balustrade across the bottom of the arch.
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(L.tone(TOWN.plasterShade))
  rectC(p, X - r - 0.1, T.sill - 0.12, 2 * r + 0.2, 0.2, k)
}

/** The weathercock on its rod over the spire: a gilt rooster, turning (seen edge-on as it spins). */
function drawCock(p: p5, c: Ctx, L: Light): void {
  const { k, ink, weight } = c
  const T = TOWER
  const X = TOWER_X
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.line(X * k, (T.tip + 0.05) * k, X * k, (T.cock + 0.02) * k)
  const turn = cockTurn(L.t)
  const sx = Math.cos(turn)
  p.push()
  p.translate(X * k, T.cock * k)
  p.scale(Math.abs(sx) < 0.08 ? 0.08 * Math.sign(sx || 1) : sx, 1)
  p.strokeWeight(weight * 0.55)
  p.fill(L.tone(TOWN.gold))
  // Tail, body, neck, head and comb; the arrow of its perch below.
  poly(p, [[-0.2, -0.02], [-0.16, -0.28], [-0.06, -0.12], [0.06, -0.1], [0.1, -0.22], [0.17, -0.25], [0.16, -0.18], [0.12, -0.12], [0.1, -0.02], [0.02, 0.02], [-0.12, 0.02]], k)
  p.fill(L.tone(TOWN.ribbon))
  poly(p, [[0.12, -0.22], [0.15, -0.28], [0.17, -0.25]], k)
  p.strokeWeight(weight * 0.6)
  p.line(-0.22 * k, 0.04 * k, 0.24 * k, 0.04 * k)
  p.fill(L.tone(TOWN.gold))
  poly(p, [[0.24, 0.0], [0.3, 0.04], [0.24, 0.08]], k)
  p.pop()
}

/* ------------------------------------------------------------------ the café */

function drawCafe(p: p5, c: Ctx, L: Light): void {
  const { k, ink, weight } = c
  const [x0, x1] = CAFE
  const eaves = -8.4
  const ridge = -10.2
  const lit = L.dark > 0.5
  const wall = TOWN.plaster
  // Chimney, roof, dormers.
  chimney(p, c, L, x1 - 1.1, eaves - 1.0, -11.1)
  roofSide(p, c, L, x0, x1, eaves, ridge)
  for (const d of [x0 + 2.2, x1 - 2.6]) {
    p.stroke(ink)
    p.strokeWeight(weight * 0.6)
    p.fill(L.tone(wall))
    rectC(p, d - 0.4, eaves - 1.5, 0.8, 0.8, k)
    p.fill(L.tone(TOWN.slate))
    poly(p, [[d - 0.55, eaves - 1.45], [d + 0.55, eaves - 1.45], [d, eaves - 1.95]], k)
    p.fill(lit ? TOWN.glow : L.tone(mixHex(TOWN.slateDark, TOWN.canal, 0.25)))
    rectC(p, d - 0.22, eaves - 1.32, 0.44, 0.5, k)
  }
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(L.tone(wall))
  rectC(p, x0, eaves, x1 - x0, G - eaves, k)
  // Pilasters in rose at the corners and between the bays, and the string courses.
  p.strokeWeight(weight * 0.5)
  p.fill(L.tone(TOWN.rose))
  for (const x of [x0, x1 - 0.32]) rectC(p, x, eaves, 0.32, G - eaves, k)
  p.fill(L.tone(TOWN.plasterShade))
  rectC(p, x0, -5.62, x1 - x0, 0.1, k)
  rectC(p, x0 - 0.1, eaves - 0.05, x1 - x0 + 0.2, 0.18, k)
  // Second floor windows.
  for (const [i, x] of [x0 + 1.35, x0 + 3.1, x0 + 5.0, x0 + 6.75].entries()) window_(p, c, L, x, -7.75, 0.62, 1.3, i !== 1, 60 + i, lit && i % 2 === 0)
  // First floor: the balcony's French window, and two windows to its right.
  for (const [i, x] of [x0 + 5.05, x0 + 6.8].entries()) window_(p, c, L, x, -5.15, 0.62, 1.35, i === 1, 70 + i, lit)
  const fw = [LAND_AT[0] - 0.7, LAND_AT[0] + 0.7]
  const ftop = -5.4
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(L.tone(TOWN.shutter))
  rectC(p, fw[0] - 0.46, ftop, 0.42, DECK_Y - ftop, k)
  rectC(p, fw[1] + 0.04, ftop, 0.42, DECK_Y - ftop, k)
  p.fill(L.tone(TOWN.timber))
  rectC(p, fw[0] - 0.05, ftop - 0.1, fw[1] - fw[0] + 0.1, DECK_Y - ftop + 0.1, k, 0.05)
  const glass = lit ? TOWN.glow : L.tone(mixHex(TOWN.canal, TOWN.plaster, 0.35))
  p.fill(glass)
  p.strokeWeight(weight * 0.45)
  for (const side of [0, 1]) {
    const gx = fw[0] + 0.06 + side * ((fw[1] - fw[0]) / 2)
    const gw = (fw[1] - fw[0]) / 2 - 0.1
    for (let j = 0; j < 3; j++) rectC(p, gx, ftop + 0.06 + j * 0.64, gw, 0.58, k)
  }
  // A lace curtain behind the glass, gathered.
  p.noStroke()
  p.fill(alpha(p, L.tone(TOWN.plaster), 0.55))
  poly(p, [[fw[0] + 0.08, ftop + 0.08], [fw[0] + 0.42, ftop + 0.08], [fw[0] + 0.2, DECK_Y - 0.1], [fw[0] + 0.08, DECK_Y - 0.1]], k)
  poly(p, [[fw[1] - 0.08, ftop + 0.08], [fw[1] - 0.42, ftop + 0.08], [fw[1] - 0.2, DECK_Y - 0.1], [fw[1] - 0.08, DECK_Y - 0.1]], k)
  // The ground floor: the café's front, lit warm within, under its awning.
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.fill(L.tone(TOWN.timber))
  rectC(p, x0 + 0.32, -2.95, x1 - x0 - 0.64, 3.08, k)
  const warm = lit ? TOWN.glow : L.tone(mixHex(TOWN.glow, TOWN.gold, 0.35))
  for (const [a, b] of [[x0 + 0.55, x0 + 3.3], [x0 + 4.6, x1 - 0.55]]) {
    p.fill(warm)
    rectC(p, a, -2.55, b - a, 2.0, k)
    // Shelves, and cakes on them: small domes of a few kinds.
    p.noStroke()
    for (let j = 0; j < 2; j++) {
      const y = -1.55 + j * 0.75
      p.fill(L.tone(TOWN.timber))
      rectC(p, a + 0.08, y, b - a - 0.16, 0.06, k)
      const n = Math.floor((b - a) / 0.42)
      for (let q = 0; q < n; q++) {
        const cx = a + 0.28 + q * ((b - a - 0.4) / Math.max(1, n - 1))
        const kind = Math.floor(hash(q, j, 77) * 3)
        p.fill(L.tone([TOWN.straw, TOWN.rose, TOWN.plaster][kind]))
        const w = 0.2 + 0.08 * hash(q, j, 78)
        p.arc(cx * k, y * k, w * k, (0.22 + 0.1 * kind) * k, Math.PI, 2 * Math.PI, p.CHORD)
      }
    }
    p.stroke(ink)
    p.strokeWeight(weight * 0.45)
    p.noFill()
    rectC(p, a, -2.55, b - a, 2.0, k)
    for (let q = 1; q < 3; q++) p.line((a + ((b - a) * q) / 3) * k, -2.55 * k, (a + ((b - a) * q) / 3) * k, -0.55 * k)
  }
  p.fill(L.tone(TOWN.timberDark))
  rectC(p, x0 + 3.55, -2.4, 0.8, 2.4 + G, k, 0.05)
  p.fill(warm)
  rectC(p, x0 + 3.7, -2.2, 0.5, 1.1, k)
  // The awning: a sloped band of stripes and a scalloped valance.
  const a0 = x0 + 0.1
  const a1 = x1 - 0.1
  const at = -2.95
  const ab = -2.18
  const stripes = Math.round((a1 - a0) / 0.36)
  p.strokeWeight(weight * 0.55)
  for (let i = 0; i < stripes; i++) {
    const u0 = i / stripes
    const u1 = (i + 1) / stripes
    const top0 = a0 + 0.12 + (a1 - a0 - 0.24) * u0
    const top1 = a0 + 0.12 + (a1 - a0 - 0.24) * u1
    const bot0 = a0 - 0.15 + (a1 - a0 + 0.3) * u0
    const bot1 = a0 - 0.15 + (a1 - a0 + 0.3) * u1
    p.fill(L.tone(i % 2 ? TOWN.plaster : TOWN.ribbon))
    poly(p, [[top0, at], [top1, at], [bot1, ab], [bot0, ab]], k)
    p.arc(((bot0 + bot1) / 2) * k, ab * k, (bot1 - bot0) * k, 0.3 * k, 0, Math.PI, p.CHORD)
  }
}

/** The balcony's slab and its brackets (under her); the railing is `drawRailing`. */
function drawBalcony(p: p5, c: Ctx, L: Light): void {
  const { k, ink, weight } = c
  const [b0, b1] = BALCONY
  p.stroke(ink)
  p.strokeWeight(weight * 0.8)
  p.fill(L.tone(TOWN.plasterShade))
  rectC(p, b0, DECK_Y, b1 - b0, 0.22, k, 0.02)
  p.fill(L.tone(mixHex(TOWN.plasterShade, TOWN.slateDark, 0.2)))
  for (const x of [b0 + 0.35, (b0 + b1) / 2, b1 - 0.35]) poly(p, [[x - 0.12, DECK_Y + 0.22], [x + 0.12, DECK_Y + 0.22], [x + 0.04, DECK_Y + 0.42], [x - 0.04, DECK_Y + 0.42]], k)
}

/** The balcony's wrought-iron railing: end posts, a top rail she stands in front of, balusters; geraniums on the left. */
function drawRailing(p: p5, c: Ctx, L: Light): void {
  const { k, ink, weight } = c
  const [b0, b1] = BALCONY
  const iron = L.tone(mixHex(TOWN.blob, TOWN.slateDark, 0.4))
  // The balusters are behind her, thin and quiet; the posts and the rail carry the shape.
  p.stroke(alpha(p, iron, 0.55))
  p.strokeWeight(Math.max(1, weight * 0.45))
  for (let x = b0 + 0.28; x < b1 - 0.2; x += 0.22) p.line(x * k, (DECK_Y - 0.02) * k, x * k, (RAIL_TOP + 0.04) * k)
  p.stroke(ink)
  p.strokeWeight(weight * 0.6)
  p.fill(iron)
  rectC(p, b0 + 0.04, RAIL_TOP, 0.1, DECK_Y - RAIL_TOP, k)
  rectC(p, b1 - 0.14, RAIL_TOP, 0.1, DECK_Y - RAIL_TOP, k)
  rectC(p, b0 + 0.02, RAIL_TOP - 0.03, b1 - b0 - 0.04, 0.07, k, 0.02)
  // The flower box hung on the rail, left of where she lands.
  const fx0 = b0 + 0.22
  const fx1 = b0 + 0.95
  p.fill(L.tone(TOWN.timber))
  rectC(p, fx0, RAIL_TOP + 0.02, fx1 - fx0, 0.18, k)
  blooms(p, k, fx0 + 0.02, fx1 - 0.02, RAIL_TOP + 0.02, L, 91)
}

/** The café's parade flag, off a pole from its first floor, waving. */
function drawFlag(p: p5, c: Ctx, L: Light): void {
  const { k, ink, weight } = c
  const x = CAFE[1] - 0.2
  const y = -5.1
  const tip: Pt = [x + 1.1, y - 1.0]
  p.stroke(ink)
  p.strokeWeight(weight * 0.7)
  p.line(x * k, y * k, tip[0] * k, tip[1] * k)
  const t = L.t
  p.strokeWeight(weight * 0.5)
  // The café's own colour, the rose of its awning: one swallow-tailed pennant (one colour: no nation's flag).
  p.fill(L.tone(TOWN.ribbon))
  const wave = (u: number) => Math.sin(t * 3.1 - u * 4) * 0.08 * u
  p.beginShape()
  for (let i = 0; i <= 8; i++) {
    const u = i / 8
    p.vertex((tip[0] + u * 1.4) * k, (tip[1] + wave(u) + u * 0.12) * k)
  }
  p.vertex((tip[0] + 1.05) * k, (tip[1] + 0.34 + wave(0.75) + 0.09) * k)
  for (let i = 8; i >= 0; i--) {
    const u = i / 8
    p.vertex((tip[0] + u * 1.4) * k, (tip[1] + 0.7 - 0.12 * u + wave(u) + u * 0.12) * k)
  }
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the ground and the lane's shade */

/**
 * The lane between the houses is in shade below its second floor (cool, deepest on the stones); the street it opens
 * from and the square are in the sun, and up the walls the light comes back. The shade's edge at the lane's mouth is
 * soft.
 */
let shadeMask: HTMLCanvasElement | null = null
/** A small picture of the shade's soft edge: alpha rising left to right, and from the top of the shade down to the stones. */
function mask(): HTMLCanvasElement | null {
  if (shadeMask || typeof document === 'undefined') return shadeMask
  const cv = document.createElement('canvas')
  cv.width = 32
  cv.height = 64
  const g = cv.getContext('2d')
  if (!g) return null
  const img = g.createImageData(32, 64)
  for (let y = 0; y < 64; y++) {
    const v = y / 63
    const a = v < 0.5 ? 0.45 * (v / 0.5) ** 2 : 0.45 + 0.55 * ((v - 0.5) / 0.5)
    for (let x = 0; x < 32; x++) {
      const u = x / 31
      const e = u * u * (3 - 2 * u)
      const i = (y * 32 + x) * 4
      img.data[i] = 52
      img.data[i + 1] = 58
      img.data[i + 2] = 92
      img.data[i + 3] = Math.round(255 * 0.3 * a * e)
    }
  }
  g.putImageData(img, 0, 0)
  shadeMask = cv
  return cv
}

/**
 * The lane between the houses is in shade below its second floor (cool, deepest on the stones); the street it opens
 * from and the square are in the sun, and up the walls the light comes back. The shade's edge at the lane's mouth is
 * soft; it ends at the tower's far corner, where the square opens.
 */
function drawShade(p: p5, c: Ctx, L: Light, f: { y0: number; y1: number }): void {
  if (L.dark > 0.5) return
  const m = mask()
  if (!m) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const top = -8.5
  const x0 = -0.3
  const edge = 1.5
  const x1 = TOWER.x1
  const bottom = Math.max(f.y1, G + 1) + 1
  ctx.save()
  ctx.imageSmoothingEnabled = true
  // The soft edge (the mask stretched over it) and the rest of the lane (the mask's last column, stretched).
  ctx.drawImage(m, 0, 0, 32, 64, x0 * k, top * k, edge * k, (G - top) * k)
  ctx.drawImage(m, 31, 0, 1, 64, (x0 + edge) * k, top * k, (x1 - x0 - edge) * k, (G - top) * k)
  // On the stones below, the shade at its deepest: soft at the mouth.
  ctx.drawImage(m, 0, 63, 32, 1, x0 * k, G * k, edge * k, (bottom - G) * k)
  ctx.drawImage(m, 31, 63, 1, 1, (x0 + edge) * k, G * k, (x1 - x0 - edge) * k, (bottom - G) * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the whole set */

/** Everything static (and the tower's machines), for any show time, drawn where the frame is. */
export function drawSet(p: p5, c: Ctx, t: number, f: { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }): void {
  if (f.x1 < -0.5) return
  const L = lightAt(t)
  p.push()
  p.rectMode(p.CORNER)
  farTown(p, c, L, f)
  const seen = (x0: number, x1: number) => x1 > f.x0 - 1 && x0 < f.x1 + 1
  HOUSES.forEach((h, i) => {
    if (seen(h.x0 - 0.5, h.x1 + 0.5)) house(p, c, L, h, i + 1, i < 2 ? groundAlley : groundPlain)
  })
  BEYOND.forEach((h, i) => {
    if (seen(h.x0 - 0.5, h.x1 + 0.5)) house(p, c, L, h, i + 11, groundPlain)
  })
  if (seen(TOWER.x0 - 0.5, TOWER.x1 + 0.5)) {
    drawTower(p, c, L)
    drawBelfry(p, c, L)
    drawCock(p, c, L)
  }
  if (seen(CAFE[0] - 0.5, CAFE[1] + 2.5)) {
    drawCafe(p, c, L)
    drawBalcony(p, c, L)
    drawRailing(p, c, L)
    drawFlag(p, c, L)
  }
  drawShade(p, c, L, f)
  p.pop()
}

/** Where each chimney's pots are (its puff rises from here), by the bar it puffs on. */
export const POTS: { bar: number; at: Pt }[] = PUFF_BARS.map((bar, i) => {
  const h = HOUSES.find((hh) => (hh.chimneys ?? []).some((ch) => Math.abs(ch.x - puffX(bar)) < 1e-6))
  const ch = h?.chimneys?.find((cc) => Math.abs(cc.x - puffX(bar)) < 1e-6)
  void i
  return { bar, at: [puffX(bar), ch ? ch.top : -12] as Pt }
})

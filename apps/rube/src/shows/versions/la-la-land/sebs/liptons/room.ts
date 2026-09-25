import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, beam, frame, glow, hash, knock, rgba, ring, scenery, smooth } from '../kit'
import { LIPTONS_INK, LIPTONS_MAT } from '../worlds'
import {
  BELL,
  BULBS,
  CUP,
  cupTip,
  cupY,
  DIP,
  DOOR,
  GARLAND,
  HOOKS,
  inout,
  KISS_MIA,
  KISS_SEB,
  mia,
  ON_FLOOR,
  ROOM,
  seb,
  STAR,
  STAR_R,
  SWAG_LIT,
  T,
  TABLE,
  TABLES,
  TREE,
  WEIGHT,
  weightY,
  wire,
} from './kiss-plan'

/**
 * Lipton's, at Christmas, in the dream: the supper club where he first played it for her, built round the same
 * piano (which the opening part draws, in this frame: its lowest key's left edge is x = 0, a ball on a key y = 0).
 *
 * In section, as every building in this house is drawn: a warm oxblood room with its front wall cut away, in the
 * snow. The door with its bell in the left wall; four tables with white cloths and red-shaded lamps; the low stage
 * with the piano and, beside it, the tree; a string of bulbs across the room, dark until the dream lights it; the
 * garland along the top of the wall and down to the door.
 *
 * Every prop has one job, on the kiss's clock (`kiss-plan.ts`): the door lets her in and them out, and its bell
 * rings each time; the lamps go down with the hush and come up with the kiss; the tree hoists the two of them to
 * its star in a glass cup on a cord over the star; the string of bulbs carries them across the room, a swag lit
 * on each downbeat; the garland brings them down to the door. It is handed show time.
 */

const M = LIPTONS_MAT
const BG = LIPTONS_INK.bg
/** The wallpaper, a deep oxblood; the section of walls and roof, darker than anything in the room. */
const PAPER = mixHex(M.shade, M.panel, 0.64)
const CUT = mixHex(M.panel, BG, 0.5)
/** The night outside, cold against the room. */
const NIGHT = mixHex(BG, M.bulbs[3], 0.16)
const SNOW = M.cloth

/* ------------------------------------------------------------------ the light */

/** How bright the lamps are: lit as she comes in, down to embers in the hush, and up past where they were with the kiss. */
export function lampLevel(t: number): number {
  if (t < T.hush) return 1
  const down = 1 - 0.8 * inout((t - T.hush) / 0.9)
  if (t < T.kiss) return down
  const since = t - T.kiss
  const up = 1 - Math.exp(-since / 0.11)
  return down + (1.3 - down) * up + 0.55 * up * Math.exp(-since / 0.5)
}

/** How lit each swag of bulbs is (0 dark, 1 lit, a little more on the flash). */
function swagLit(i: number, t: number): number {
  const since = t - SWAG_LIT[i]
  if (since < 0) return 0
  return Math.min(1, since / 0.03) + 0.6 * knock(since, 0.22)
}

/** The star: dark gold, and lit when the cup reaches it. */
function starLit(t: number): number {
  const since = t - T.rise[1]
  if (since < 0) return 0
  return Math.min(1, since / 0.04) + 0.8 * knock(since, 0.3)
}

/* ------------------------------------------------------------------ the door */

/** The door's swing (radians): positive swung into the room (she comes in), negative out into the street (they go). */
export function doorSwing(t: number): number {
  const [a, b] = T.doorIn
  let v = 0
  if (t >= a && t < b) v = 1.3 * inout((t - a) / (b - a))
  else if (t >= b && t < 43.85) v = 1.3 + 0.06 * ring(t - b, 2.2, 0.15)
  else if (t >= 43.85 && t < 80) {
    // Let go, it swings to, through the frame and back, and settles shut.
    const s = t - 43.85
    v = 1.3 * Math.exp(-s / 0.42) * Math.cos((Math.PI * s) / 0.9)
  }
  const o = T.doorOut
  if (t >= o && t < o + 0.55) v = -1.25 * (1 - Math.exp(-(t - o) / 0.07))
  else if (t >= o + 0.55 && t < T.doorShut) v = -1.25 * (1 - inout((t - o - 0.55) / (T.doorShut - o - 0.55)))
  else if (t >= T.doorShut) {
    const s = t - T.doorShut
    v = 0.16 * Math.exp(-s / 0.25) * Math.sin(2 * Math.PI * 1.4 * s)
  }
  return v
}

/** The bell's swing on its spring (radians): a ring each time the door moves it. */
function bellSwing(t: number): number {
  return 0.55 * ring(t - T.doorIn[1], 2.6, 0.4) + 0.5 * ring(t - T.doorOut, 2.6, 0.35) + 0.6 * ring(t - T.doorShut, 2.6, 0.45)
}

/* ------------------------------------------------------------------ precomputed */

interface Flake {
  x: number
  y: number
  v: number
  r: number
  ph: number
}
const TILE = 9
const FLAKES: Flake[] = Array.from({ length: 34 }, (_, i) => ({
  x: hash(i, 1, 7) * TILE,
  y: hash(i, 2, 7) * TILE,
  v: 0.28 + 0.3 * hash(i, 3, 7),
  r: 0.022 + 0.022 * hash(i, 4, 7),
  ph: hash(i, 5, 7) * Math.PI * 2,
}))

/** The tree's tiers, from the top: where each starts and ends (0 at the tip, 1 at the foot). */
const TIERS: [number, number][] = [
  [0, 0.24],
  [0.15, 0.43],
  [0.33, 0.62],
  [0.52, 0.81],
  [0.7, 1],
]
/** Its lights, and its baubles: where on it (fraction down, across -1..1), and what. */
const LIGHTS = Array.from({ length: 22 }, (_, i) => {
  const f = 0.12 + 0.86 * ((i + 0.5) / 22)
  return { f, s: (hash(i, 11, 3) * 2 - 1) * 0.86, ph: hash(i, 12, 3) * 6.28 }
})
const BAUBLES = Array.from({ length: 11 }, (_, i) => {
  const f = 0.2 + 0.75 * hash(i, 21, 5)
  const side = i % 2 === 0 ? -1 : 1
  return { f, s: side * (0.35 + 0.5 * hash(i, 22, 5)), r: 0.075 + 0.04 * hash(i, 23, 5), c: i % 3 === 0 ? M.gold : M.shade }
})

/** When he passes each bulb (for its sway), per swag. */
const PASS: number[][] = HOOKS.slice(0, -1).map((_, i) =>
  Array.from({ length: BULBS }, (_, j) => {
    const x = wire(i, (j + 0.5) / BULBS)[0]
    for (let t = SWAG_LIT[i]; t < SWAG_LIT[i] + 2.2; t += 1 / 120) if (seb(t)[0] <= x) return t
    return Infinity
  }),
)

/* ------------------------------------------------------------------ drawing helpers */

type Draw = { p: p5; k: number; ink: string; w: number }

function poly(d: Draw, pts: Pt[], close = true): void {
  d.p.beginShape()
  for (const [x, y] of pts) d.p.vertex(x * d.k, y * d.k)
  if (close) d.p.endShape(d.p.CLOSE)
  else d.p.endShape()
}

function box(d: Draw, x0: number, y0: number, x1: number, y1: number): void {
  poly(d, [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ])
}

function fillRect(d: Draw, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const ctx = d.p.drawingContext as CanvasRenderingContext2D
  ctx.fillStyle = color
  ctx.fillRect(x0 * d.k, y0 * d.k, (x1 - x0) * d.k, (y1 - y0) * d.k)
}

/* ------------------------------------------------------------------ the parts of the room */

function night(d: Draw, t: number): void {
  const f = frame(d.p, d.k)
  fillRect(d, f.x0 - 1, f.y0 - 1, f.x1 + 1, f.y1 + 1, NIGHT)
  // Snow, falling slowly past the building; none inside it.
  const { p, k } = d
  p.noStroke()
  const inBox = (x: number, y: number) => x > ROOM.wallL0 - 0.05 && x < ROOM.wallR1 + 0.05 && y > ROOM.roof - 0.25 && y < ROOM.floor + 0.6
  for (let tx = Math.floor(f.x0 / TILE) * TILE; tx < f.x1; tx += TILE) {
    for (let ty = Math.floor(f.y0 / TILE) * TILE; ty < f.y1; ty += TILE) {
      for (const fl of FLAKES) {
        const x = tx + fl.x + 0.18 * Math.sin(t * 0.7 + fl.ph)
        const y = ty + ((fl.y + fl.v * t) % TILE)
        if (y > ROOM.floor + 0.02 || inBox(x, y)) continue
        p.fill(alpha(p, SNOW, 0.55))
        p.circle(x * k, y * k, 2 * fl.r * k)
      }
    }
  }
}

function shell(d: Draw): void {
  const { p, ink, w } = d
  // The ground outside, under its snow, both sides; the floor's own section under the room.
  solid(p, ink, w * 0.6, CUT)
  box(d, -40, ROOM.floor, ROOM.wallL0, ROOM.floor + 0.5)
  box(d, ROOM.wallR1, ROOM.floor, 40, ROOM.floor + 0.5)
  box(d, ROOM.wallL0, ROOM.floor, ROOM.wallR1, ROOM.floor + 0.5)
  p.noStroke()
  p.fill(SNOW)
  for (const [x0, x1] of [
    [-40, ROOM.wallL0],
    [ROOM.wallR1, 40],
  ]) {
    p.beginShape()
    p.vertex(x0 * d.k, ROOM.floor * d.k)
    p.vertex(x1 * d.k, ROOM.floor * d.k)
    p.vertex(x1 * d.k, (ROOM.floor + 0.09) * d.k)
    p.vertex(x0 * d.k, (ROOM.floor + 0.09) * d.k)
    p.endShape(p.CLOSE)
  }
  // The walls and the roof, cut.
  solid(p, ink, w * 0.8, CUT)
  box(d, ROOM.wallL0, ROOM.roof, ROOM.wallR1, ROOM.ceil)
  box(d, ROOM.wallL0, ROOM.ceil, ROOM.wallL1, DOOR.top)
  box(d, ROOM.wallR0, ROOM.ceil, ROOM.wallR1, ROOM.floor)
  // Snow on the roof, soft along its top.
  p.noStroke()
  p.fill(SNOW)
  p.beginShape()
  p.vertex((ROOM.wallL0 - 0.08) * d.k, ROOM.roof * d.k)
  const n = 36
  for (let i = 0; i <= n; i++) {
    const x = ROOM.wallL0 - 0.08 + ((ROOM.wallR1 - ROOM.wallL0 + 0.16) * i) / n
    p.vertex(x * d.k, (ROOM.roof - 0.1 - 0.035 * Math.sin(i * 1.7) - 0.02 * Math.sin(i * 0.6)) * d.k)
  }
  p.vertex((ROOM.wallR1 + 0.08) * d.k, ROOM.roof * d.k)
  p.endShape(p.CLOSE)
  // Over the door outside, a small awning, snow on it.
  solid(p, ink, w * 0.6, M.shade)
  poly(d, [
    [ROOM.wallL0, 1.55],
    [ROOM.wallL0 - 0.78, 1.86],
    [ROOM.wallL0 - 0.78, 1.97],
    [ROOM.wallL0, 1.97],
  ])
  p.noStroke()
  p.fill(SNOW)
  poly(d, [
    [ROOM.wallL0, 1.5],
    [ROOM.wallL0 - 0.8, 1.82],
    [ROOM.wallL0 - 0.74, 1.87],
    [ROOM.wallL0, 1.58],
  ])
}

function wall(d: Draw, t: number): void {
  const { p, ink, w } = d
  const x0 = ROOM.wallL1
  const x1 = ROOM.wallR0
  fillRect(d, x0, ROOM.ceil, x1, ROOM.rail, PAPER)
  // A faint stripe in the paper, wide and soft.
  for (let x = x0 + 0.35; x < x1; x += 0.7) fillRect(d, x, ROOM.ceil, x + 0.12, ROOM.rail, rgba(M.panel, 0.18))
  // The wainscot, in panels, and its rail.
  fillRect(d, x0, ROOM.rail, x1, ROOM.floor, M.panel)
  outline(p, rgba(M.wood, 0.9), w * 0.5)
  for (let x = x0 + 0.2; x + 1.1 < x1; x += 1.3) box(d, x, ROOM.rail + 0.25, x + 1.1, ROOM.floor - 0.2)
  solid(p, ink, w * 0.5, M.wood)
  box(d, x0, ROOM.rail - 0.06, x1, ROOM.rail + 0.06)
  // The cornice under the ceiling, and a gold line.
  solid(p, ink, w * 0.5, M.wood)
  box(d, x0, ROOM.ceil, x1, ROOM.ceil + 0.2)
  p.noStroke()
  p.fill(alpha(p, M.gold, 0.7))
  box(d, x0, ROOM.ceil + 0.23, x1, ROOM.ceil + 0.26)
  // The lamps' light up the wall behind each table.
  const lv = lampLevel(t)
  for (const x of TABLES) glow(p, d.k, x, TABLE.top - 0.4, 1.9, M.lamp, 0.16 * lv, 1, 1.25)
  // The bloom: a warm wash that goes out from the two of them through the room.
  const since = t - T.kiss
  if (since > 0 && since < 3) {
    const c: Pt = [(KISS_SEB[0] + KISS_MIA[0]) / 2, KISS_SEB[1] - 0.5]
    const r = 1 + 13 * (1 - Math.exp(-since / 0.7))
    glow(p, d.k, c[0], c[1], r, M.lamp, 0.3 * Math.exp(-since / 0.9), 1, 0.8)
  }
}

function garland(d: Draw, t: number): void {
  const { p, k, w } = d
  // Along the top of the wall, swagged from bow to bow.
  const hangs: number[] = []
  for (let x = ROOM.wallL1 + 0.3; x < ROOM.wallR0; x += 3.3) hangs.push(x)
  const y = ROOM.ceil + 0.42
  // A pine rope: a dark core, then tufts of needles along it, light on top.
  const rope = (pts: Pt[], thick: number, seed: number) => {
    p.noFill()
    p.stroke(M.pine)
    p.strokeWeight(thick * k)
    p.beginShape()
    for (const [x, yy] of pts) p.vertex(x * k, yy * k)
    p.endShape()
    p.noStroke()
    let acc = 0
    let n = 0
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1]
      const [bx, by] = pts[i]
      const L = Math.hypot(bx - ax, by - ay)
      for (acc += L; acc > 0.11; acc -= 0.11) {
        const f = 1 - acc / L
        const x = ax + (bx - ax) * f
        const yy = ay + (by - ay) * f
        const h1 = hash(n, seed, 1)
        const h2 = hash(n, seed, 2)
        p.fill(h1 < 0.5 ? M.pine : M.garland)
        p.ellipse((x + (h2 - 0.5) * thick * 0.6) * k, (yy - (h1 - 0.3) * thick * 0.5) * k, thick * (0.7 + 0.5 * h2) * k, thick * (0.55 + 0.3 * h1) * k)
        n++
      }
    }
  }
  for (let i = 0; i + 1 < hangs.length; i++) {
    const a = hangs[i]
    const b = hangs[i + 1]
    rope(Array.from({ length: 13 }, (_, j) => {
      const u = j / 12
      return [a + (b - a) * u, y + 0.38 * 4 * u * (1 - u)] as Pt
    }), 0.15, i)
  }
  for (const x of hangs) bow(d, x, y, 0.8)
  // And from the last hook of the bulbs down to the floor by the door: a slide, pine all the way.
  const pts: Pt[] = Array.from({ length: 41 }, (_, j) => bezier(GARLAND, j / 40))
  rope(pts, 0.17, 40)
  // Its end, curled on the floor.
  p.noStroke()
  p.fill(M.pine)
  p.ellipse((GARLAND[3][0] - 0.12) * k, (ROOM.floor - 0.05) * k, 0.34 * k, 0.12 * k)
  // The bow at its hook bobs as they go over it onto the garland.
  const bob = 0.25 * ring(t - T.swags[4], 2.2, 0.3)
  bow(d, GARLAND[0][0], GARLAND[0][1] - 0.02, 1, bob)
  void w
}

function bow(d: Draw, x: number, y: number, s: number, turn = 0): void {
  const { p, k, ink, w } = d
  p.push()
  p.translate(x * k, y * k)
  p.rotate(turn)
  solid(p, ink, w * 0.4, M.shade)
  for (const side of [-1, 1]) {
    p.beginShape()
    p.vertex(0, 0)
    p.vertex(side * 0.17 * s * k, -0.09 * s * k)
    p.vertex(side * 0.17 * s * k, 0.08 * s * k)
    p.endShape(p.CLOSE)
    p.beginShape()
    p.vertex(side * 0.02 * s * k, 0)
    p.vertex(side * 0.09 * s * k, 0.2 * s * k)
    p.vertex(side * 0.02 * s * k, 0.17 * s * k)
    p.endShape(p.CLOSE)
  }
  p.circle(0, 0, 0.07 * s * k)
  p.pop()
}

function bezier(q: Pt[], u: number): Pt {
  const a = 1 - u
  return [
    a * a * a * q[0][0] + 3 * a * a * u * q[1][0] + 3 * a * u * u * q[2][0] + u * u * u * q[3][0],
    a * a * a * q[0][1] + 3 * a * a * u * q[1][1] + 3 * a * u * u * q[2][1] + u * u * u * q[3][1],
  ]
}

function stage(d: Draw): void {
  const { p, ink, w } = d
  solid(p, ink, w * 0.7, M.wood)
  box(d, ROOM.stageX0, ROOM.stage, ROOM.wallR0, ROOM.floor)
  p.noStroke()
  p.fill(alpha(p, M.gold, 0.55))
  box(d, ROOM.stageX0, ROOM.stage + 0.05, ROOM.wallR0, ROOM.stage + 0.075)
  p.fill(alpha(p, M.panel, 0.5))
  for (let x = ROOM.stageX0 + 0.9; x < ROOM.wallR0; x += 0.9) box(d, x, ROOM.stage + 0.12, x + 0.025, ROOM.floor)
  outline(p, ink, w * 0.7)
  p.line(ROOM.stageX0 * d.k, ROOM.stage * d.k, ROOM.wallR0 * d.k, ROOM.stage * d.k)
}

function table(d: Draw, x: number, t: number): void {
  const { p, k, ink, w } = d
  const top = TABLE.top
  const floor = ROOM.floor
  // Two bentwood chairs, backs out.
  for (const side of [-1, 1]) {
    const cx = x + side * 0.52
    outline(p, ink, w * 0.45)
    p.stroke(M.wood)
    p.strokeWeight(0.035 * k)
    p.line((cx - side * 0.12) * k, 2.8 * k, (cx - side * 0.12) * k, floor * k)
    p.line((cx + side * 0.1) * k, 2.8 * k, (cx + side * 0.12) * k, floor * k)
    p.noFill()
    p.beginShape()
    p.vertex((cx + side * 0.1) * k, 2.8 * k)
    p.quadraticVertex((cx + side * 0.16) * k, 2.5 * k, (cx + side * 0.08) * k, 2.4 * k)
    p.endShape()
    solid(p, ink, w * 0.4, M.wood)
    box(d, cx - 0.14, 2.77, cx + 0.14, 2.82)
  }
  // The pedestal, the cloth, the lamp.
  solid(p, ink, w * 0.45, M.panel)
  box(d, x - 0.04, 2.86, x + 0.04, floor - 0.03)
  box(d, x - 0.16, floor - 0.04, x + 0.16, floor)
  solid(p, ink, w * 0.55, M.cloth)
  poly(d, [
    [x - TABLE.half, top],
    [x + TABLE.half, top],
    [x + TABLE.half + 0.04, 2.87],
    [x + 0.2, 2.9],
    [x, 2.87],
    [x - 0.2, 2.9],
    [x - TABLE.half - 0.04, 2.87],
  ])
  const lv = lampLevel(t)
  // The lamp's pool on the cloth.
  glow(p, k, x, top + 0.03, 0.55, M.lamp, 0.35 * Math.min(1.4, lv), 1, 0.35)
  solid(p, ink, w * 0.35, M.gold)
  box(d, x - 0.05, top - 0.03, x + 0.05, top)
  box(d, x - 0.012, 2.5, x + 0.012, top - 0.03)
  // The shade: red, and lit through.
  const lit = Math.min(1, lv)
  solid(p, ink, w * 0.45, mixHex(mixHex(M.shade, M.panel, 0.55), mixHex(M.shade, M.lamp, 0.3), lit))
  poly(d, [
    [x - 0.06, 2.37],
    [x + 0.06, 2.37],
    [x + 0.12, 2.51],
    [x - 0.12, 2.51],
  ])
  glow(p, k, x, 2.47, 0.42, M.lamp, 0.35 * lv, 1, 0.7)
}

function door(d: Draw, t: number): void {
  const { p, ink, w } = d
  const x0 = ROOM.wallL0
  const x1 = ROOM.wallL1
  const top = DOOR.top
  const floor = ROOM.floor
  const phi = doorSwing(t)
  const open = Math.abs(Math.sin(phi))
  // The doorway: the night through it when the door is open, the door's own edge when it is shut.
  p.noStroke()
  p.fill(mixHex(NIGHT, M.wood, 1 - Math.min(1, open * 3)))
  box(d, x0, top, x1, floor)
  // The lintel.
  solid(p, ink, w * 0.6, M.wood)
  box(d, x0 - 0.04, top - 0.08, x1 + 0.04, top)
  // The leaf, swung round into view about its hinge: into the room, or out into the street.
  if (open > 0.02) {
    const L = DOOR.leaf * open
    const [a, b] = phi > 0 ? [x1, x1 + L] : [x0 - L, x0]
    solid(p, ink, w * 0.6, M.wood)
    box(d, a, top + 0.02, b, floor - 0.01)
    // Its window, lit warm from inside.
    const m = 0.14 * open
    p.noStroke()
    p.fill(alpha(p, M.lamp, 0.55))
    box(d, a + m, top + 0.14, b - m, top + 0.5)
    outline(p, ink, w * 0.35)
    box(d, a + m, top + 0.14, b - m, top + 0.5)
    // The handle.
    p.fill(M.gold)
    p.noStroke()
    const hx = phi > 0 ? b - 0.1 * open : a + 0.1 * open
    p.circle(hx * d.k, (top + 0.62) * d.k, 0.05 * d.k)
  }
  // The bell on its curled spring, over the door.
  const [bx, by] = BELL
  const sw = bellSwing(t)
  outline(p, M.gold, w * 0.5)
  p.noFill()
  p.beginShape()
  p.vertex(x1 * d.k, (by - 0.2) * d.k)
  p.quadraticVertex((bx + 0.02) * d.k, (by - 0.34) * d.k, bx * d.k, (by - 0.16) * d.k)
  p.endShape()
  p.push()
  p.translate(bx * d.k, (by - 0.16) * d.k)
  p.rotate(sw)
  solid(p, ink, w * 0.4, M.gold)
  p.beginShape()
  p.vertex(-0.03 * d.k, 0)
  p.vertex(0.03 * d.k, 0)
  p.quadraticVertex(0.05 * d.k, 0.08 * d.k, 0.08 * d.k, 0.13 * d.k)
  p.vertex(-0.08 * d.k, 0.13 * d.k)
  p.quadraticVertex(-0.05 * d.k, 0.08 * d.k, -0.03 * d.k, 0)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(M.panel)
  p.circle(Math.sin(-sw * 0.6) * 0.03 * d.k, 0.14 * d.k, 0.035 * d.k)
  p.pop()
}

/** The tree's half-width at `f` of the way down from its tip. */
const treeHalf = (f: number) => TREE.half * f
const treeY = (f: number) => TREE.tip + (TREE.foot - TREE.tip) * f

function tree(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  const cx = TREE.x
  // The tub it stands in.
  solid(p, ink, w * 0.6, M.shade)
  poly(d, [
    [cx - 0.42, TREE.foot],
    [cx + 0.42, TREE.foot],
    [cx + 0.34, ROOM.stage],
    [cx - 0.34, ROOM.stage],
  ])
  p.noStroke()
  p.fill(alpha(p, M.gold, 0.8))
  box(d, cx - 0.41, TREE.foot + 0.1, cx + 0.41, TREE.foot + 0.14)
  // The tiers, from the bottom up so each hangs over the one below it.
  for (let j = TIERS.length - 1; j >= 0; j--) {
    const [fa, fb] = TIERS[j]
    const ya = treeY(fa)
    const yb = treeY(fb)
    const wa = treeHalf(fa) * 0.55
    const wb = treeHalf(fb)
    const pts: Pt[] = [
      [cx - wa, ya],
      [cx + wa, ya],
      [cx + wb, yb],
    ]
    // The drooping hem, in scallops.
    const n = 3 + j
    for (let i = n; i >= 0; i--) {
      const u = i / n
      const x = cx - wb + 2 * wb * u
      const sag = i % 1 === 0 && i > 0 && i < n ? 0.06 : 0
      pts.push([x, yb - sag])
      if (i > 0) pts.push([x - wb / n, yb + 0.1])
    }
    solid(p, ink, w * 0.6, M.pine)
    poly(d, pts)
    // The light side, up and left.
    p.noStroke()
    p.fill(alpha(p, M.garland, 0.75))
    poly(d, [
      [cx - wa, ya],
      [cx - wa * 0.2, ya],
      [cx - wb * 0.25, yb - 0.08],
      [cx - wb + 0.05, yb - 0.02],
    ])
  }
  // Its lights, breathing slowly, brighter in the dream.
  const lv = Math.min(1.3, lampLevel(t))
  for (const L of LIGHTS) {
    const x = cx + treeHalf(L.f) * L.s * 0.9
    const y = treeY(L.f) - 0.05
    const a = (0.55 + 0.25 * Math.sin(t * 1.3 + L.ph)) * lv
    p.noStroke()
    p.fill(alpha(p, M.lamp, 0.25 * a))
    p.circle(x * k, y * k, 0.16 * k)
    p.fill(alpha(p, M.lamp, 0.95 * Math.min(1, a)))
    p.circle(x * k, y * k, 0.05 * k)
  }
  for (const B of BAUBLES) {
    const x = cx + treeHalf(B.f) * B.s * 0.85
    const y = treeY(B.f) - 0.02
    outline(p, M.gold, w * 0.35)
    p.line(x * k, (y - B.r - 0.05) * k, x * k, (y - B.r) * k)
    solid(p, ink, w * 0.35, B.c)
    p.circle(x * k, y * k, 2 * B.r * k)
    p.noStroke()
    p.fill(alpha(p, M.cloth, 0.55))
    p.circle((x - B.r * 0.35) * k, (y - B.r * 0.35) * k, B.r * 0.55 * k)
  }
  void smooth
}

/** The star on the tip, turned by the cord it carries; lit when the cup reaches it. */
function star(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  const [sx, sy] = STAR
  const run = CUP.low - cupY(t)
  const turn = run / STAR_R
  const lit = starLit(t)
  if (lit > 0) {
    glow(p, k, sx, sy, 1.6, M.lamp, 0.22 * Math.min(1.4, lit), 1, 1)
    glow(p, k, sx, sy, 0.7, M.gold, 0.35 * Math.min(1.4, lit), 1, 1)
  }
  p.push()
  p.translate(sx * k, sy * k)
  p.rotate(turn)
  solid(p, ink, w * 0.6, mixHex(mixHex(M.gold, M.panel, 0.35), mixHex(M.gold, M.cloth, 0.35), Math.min(1, lit)))
  p.beginShape()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = (i % 2 === 0 ? STAR_R : STAR_R * 0.45) * k
    p.vertex(Math.cos(a) * r, Math.sin(a) * r)
  }
  p.endShape(p.CLOSE)
  // Its hub: the pulley the cord runs over.
  solid(p, ink, w * 0.4, M.panel)
  p.circle(0, 0, 0.1 * k)
  p.pop()
}

/** The cords from the star: the cup's on the left, the counterweight's on the right; and the counterweight. */
function cords(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  const [sx, sy] = STAR
  const bail = cupY(t) - 0.36
  const wy = weightY(t)
  outline(p, M.gold, w * 0.45)
  p.line(CUP.x * k, sy * k, CUP.x * k, bail * k)
  p.line(WEIGHT.x * k, sy * k, WEIGHT.x * k, (wy - WEIGHT.r - 0.06) * k)
  solid(p, ink, w * 0.4, M.gold)
  box(d, WEIGHT.x - 0.05, wy - WEIGHT.r - 0.07, WEIGHT.x + 0.05, wy - WEIGHT.r + 0.01)
  solid(p, ink, w * 0.5, mixHex(M.gold, M.wood, 0.25))
  p.circle(WEIGHT.x * k, wy * k, 2 * WEIGHT.r * k)
  p.noStroke()
  p.fill(alpha(p, M.cloth, 0.45))
  p.circle((WEIGHT.x - 0.07) * k, (wy - 0.07) * k, 0.1 * k)
  void sx
}

/** The cup, behind the balls: its bail, and the far side of its rim. Tipped about the bail's top. */
export function cupBack(p: p5, k: number, ink: string, w: number, t: number): void {
  const y = cupY(t)
  const top = y - 0.36
  p.push()
  p.translate(CUP.x * k, top * k)
  p.rotate(cupTip(t))
  outline(p, M.gold, w * 0.6)
  p.noFill()
  p.beginShape()
  p.vertex(-0.42 * k, 0.4 * k)
  p.bezierVertex(-0.42 * k, 0.02 * k, 0.42 * k, 0.02 * k, 0.42 * k, 0.4 * k)
  p.endShape()
  solid(p, ink, w * 0.4, mixHex(M.shade, M.panel, 0.55))
  p.arc(0, 0.42 * k, 0.84 * k, 0.12 * k, Math.PI, 2 * Math.PI)
  p.pop()
  void ink
}

/** The cup's front, over the balls: the bowl of red glass, its gold band. */
export function cupFront(p: p5, k: number, ink: string, w: number, t: number): void {
  const y = cupY(t)
  const top = y - 0.36
  p.push()
  p.translate(CUP.x * k, top * k)
  p.rotate(cupTip(t))
  solid(p, ink, w * 0.55, M.shade)
  p.beginShape()
  p.vertex(-0.43 * k, 0.42 * k)
  p.bezierVertex(-0.43 * k, 0.72 * k, 0.43 * k, 0.72 * k, 0.43 * k, 0.42 * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, M.cloth, 0.3))
  p.beginShape()
  p.vertex(-0.32 * k, 0.47 * k)
  p.quadraticVertex(-0.3 * k, 0.6 * k, -0.12 * k, 0.64 * k)
  p.quadraticVertex(-0.26 * k, 0.56 * k, -0.26 * k, 0.47 * k)
  p.endShape(p.CLOSE)
  solid(p, ink, w * 0.4, M.gold)
  p.beginShape()
  p.vertex(-0.44 * k, 0.4 * k)
  p.vertex(0.44 * k, 0.4 * k)
  p.vertex(0.44 * k, 0.46 * k)
  p.vertex(-0.44 * k, 0.46 * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/** The string of bulbs: the drops from the ceiling, the wire giving under the two of them, the bulbs. */
function festoon(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  const riding = t > T.tip && t < T.swags[4] + 0.4
  const balls: Pt[] = riding ? [seb(t), mia(t)] : []
  // The drops.
  outline(p, rgba(M.panel, 0.95), w * 0.45)
  for (const [x, y] of HOOKS) p.line(x * k, ROOM.ceil * k, x * k, y * k)
  // The wire's end tied to the tree's top.
  p.line(HOOKS[0][0] * k, HOOKS[0][1] * k, (TREE.x - 0.1) * k, (HOOKS[0][1] - 0.18) * k)
  for (let i = 0; i + 1 < HOOKS.length; i++) {
    const give = (x: number, u: number) => {
      let g = 0
      for (const [bx, by] of balls) {
        const [lo, hi] = [HOOKS[i + 1][0], HOOKS[i][0]]
        if (bx < lo - 0.05 || bx > hi + 0.05 || by > ROOM.stage - 1) continue
        const ub = (HOOKS[i][0] - bx) / (HOOKS[i][0] - HOOKS[i + 1][0])
        g = Math.max(g, DIP * Math.sin(Math.PI * Math.max(0, Math.min(1, ub))) * Math.exp(-(((x - bx) / 0.55) ** 2)))
      }
      return g * Math.sin(Math.PI * u) ** 0.3
    }
    const n = 28
    const pts: Pt[] = []
    for (let j = 0; j <= n; j++) {
      const u = j / n
      const [x, y] = wire(i, u)
      pts.push([x, y + give(x, u)])
    }
    outline(p, M.panel, w * 0.5)
    p.noFill()
    p.beginShape()
    for (const [x, y] of pts) p.vertex(x * k, y * k)
    p.endShape()
    // The bulbs, hanging under the wire; dark glass until this swag is lit.
    const lit = swagLit(i, t)
    for (let j = 0; j < BULBS; j++) {
      const u = (j + 0.5) / BULBS
      const [x, y0] = wire(i, u)
      const y = y0 + give(x, u)
      const color = M.bulbs[(i * 2 + j) % M.bulbs.length]
      const sway = 0.35 * ring(t - PASS[i][j], 1.7, 0.45)
      p.push()
      p.translate(x * k, y * k)
      p.rotate(sway)
      if (lit > 0) glow(p, k, 0, 0.2, 0.55, color, 0.28 * Math.min(1.3, lit), 1, 1)
      solid(p, ink, w * 0.3, M.panel)
      p.beginShape()
      p.vertex(-0.03 * k, 0)
      p.vertex(0.03 * k, 0)
      p.vertex(0.03 * k, 0.07 * k)
      p.vertex(-0.03 * k, 0.07 * k)
      p.endShape(p.CLOSE)
      const on = Math.min(1, lit)
      solid(p, mixHex(M.panel, ink, on), w * (0.2 + 0.1 * on), mixHex(mixHex(color, PAPER, 0.78), color, on))
      p.beginShape()
      p.vertex(-0.045 * k, 0.07 * k)
      p.bezierVertex(-0.07 * k, 0.14 * k, -0.03 * k, 0.2 * k, 0, 0.23 * k)
      p.bezierVertex(0.03 * k, 0.2 * k, 0.07 * k, 0.14 * k, 0.045 * k, 0.07 * k)
      p.endShape(p.CLOSE)
      p.pop()
    }
    // The hook.
    const [hx, hy] = HOOKS[i]
    solid(p, ink, w * 0.35, M.gold)
    p.circle(hx * k, hy * k, 0.07 * k)
  }
  const [hx, hy] = HOOKS[HOOKS.length - 1]
  solid(p, ink, w * 0.35, M.gold)
  p.circle(hx * k, hy * k, 0.07 * k)
}

/* ------------------------------------------------------------------ the room */

export const liptonsRoom = scenery<null>({
  name: 'liptons-room',
  draw(p, _s, c) {
    const t = c.t
    const d: Draw = { p, k: c.k, ink: c.ink, w: c.weight }
    night(d, t)
    shell(d)
    wall(d, t)
    garland(d, t)
    stage(d)
    for (const x of TABLES) table(d, x, t)
    door(d, t)
    festoon(d, t)
    tree(d, t)
    cords(d, t)
    star(d, t)
    cupBack(p, c.k, c.ink, c.weight, t)
    void R
    void ON_FLOOR
    void beam
  },
})

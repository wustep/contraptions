import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, beam, frame, glow, hash, rgba, ring, scenery, smooth } from '../kit'
import { LIPTONS_INK, LIPTONS_MAT } from '../worlds'
import { DREAM_PERIOD, dream } from '../music'
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
  mia,
  ON_FLOOR,
  reach,
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

/**
 * How bright a lamp at `x` is: lit as she comes in, down to embers in the hush, and, as the kiss's wave reaches it,
 * up again, a little warmer than before. A lamp coming on, not a flash.
 */
export function lampAt(x: number, t: number): number {
  if (t < T.hush) return 1
  const down = 1 - 0.8 * inout((t - T.hush) / 0.9)
  const since = t - reach(x)
  if (since < 0) return down
  return down + (1.12 - down) * (1 - Math.exp(-since / 0.07))
}

/** The string's bulbs in the bloom: dark glass until the wave passes, then a low warm glass. */
function bulbWarm(x: number, t: number): number {
  const since = t - reach(x)
  if (since < 0) return 0
  return Math.min(1, since / 0.04) * 0.5
}

/** How lit each swag of bulbs is (0 dark, 1 lit). */
function swagLit(i: number, t: number): number {
  const since = t - SWAG_LIT[i]
  if (since < 0) return 0
  return Math.min(1, since / 0.03)
}

/** The star: dark gold, and lit when the cup reaches it. */
function starLit(t: number): number {
  const since = t - T.rise[1]
  if (since < 0) return 0
  return Math.min(1, since / 0.04)
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

/** The bulb he is passing on each of the ride's accents (swag, bulb), which jumps on its flex as he goes by. */
const FLARES: { i: number; j: number; t: number }[] = T.flares.map((t) => {
  const i = Math.max(0, Math.min(3, Math.floor((t - T.swags[0]) / (T.swags[1] - T.swags[0]))))
  const x = seb(t)[0]
  let j = 0
  for (let q = 1; q < BULBS; q++) if (Math.abs(wire(i, (q + 0.5) / BULBS)[0] - x) < Math.abs(wire(i, (j + 0.5) / BULBS)[0] - x)) j = q
  return { i, j, t }
})

/** A bulb's own jump on the ride's accents: a kick on its flex that swings out and settles. */
function kickOf(i: number, j: number, t: number): number {
  let f = 0
  for (const q of FLARES) if (q.i === i && q.j === j) f += ring(t - q.t, 2.1, 0.5)
  return f
}

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
  street(d, t)
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

/**
 * The street outside the door, where they go out into the snow: across it, a low row of houses with snow on their
 * roofs and a few windows lit; on the pavement short of the door, a lamp, its light lying on the snow.
 */
function street(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  const f = frame(p, k)
  const x1 = ROOM.wallL0 - 0.02
  if (f.x0 > x1) return
  const far = mixHex(NIGHT, CUT, 0.35)
  const roofs: [number, number, number][] = []
  for (let x = x1 - 0.4, i = 0; x > Math.max(-40, f.x0 - 4); i++) {
    const wd = 1.6 + 1.2 * hash(i, 1, 31)
    roofs.push([x - wd, x, 1.0 - 0.7 * hash(i, 2, 31)])
    x -= wd + 0.05
  }
  for (const [a, b, top] of roofs) {
    p.noStroke()
    p.fill(far)
    p.beginShape()
    p.vertex(a * k, ROOM.floor * k)
    p.vertex(a * k, top * k)
    p.vertex(((a + b) / 2) * k, (top - 0.45) * k)
    p.vertex(b * k, top * k)
    p.vertex(b * k, ROOM.floor * k)
    p.endShape(p.CLOSE)
    // Snow along the roof's two slopes.
    p.stroke(alpha(p, SNOW, 0.7))
    p.strokeWeight(0.06 * k)
    p.line(a * k, top * k, ((a + b) / 2) * k, (top - 0.45) * k)
    p.line(((a + b) / 2) * k, (top - 0.45) * k, b * k, top * k)
    // A few windows lit, warm.
    p.noStroke()
    for (let j = 0; j < 3; j++) {
      for (let r = 0; r < 2; r++) {
        if (hash(Math.round(a * 10) + j, r, 37) < 0.55) continue
        const wx = a + 0.3 + j * ((b - a - 0.6) / 2.2)
        const wy = top + 0.3 + r * 0.55
        if (wy > ROOM.floor - 0.5) continue
        p.fill(alpha(p, M.lamp, 0.55))
        p.rect((wx - 0.07) * k, wy * k, 0.14 * k, 0.2 * k)
      }
    }
  }
  passersBy(d, t)
  // The lamp on the pavement, its pool on the snow.
  const lx = ROOM.wallL0 - 3.1
  const top = 0.55
  glow(p, k, lx, ROOM.floor, 1.6, M.lamp, 0.22, 1.5, 0.35)
  // The post, a lantern on it, snow on the lantern's cap.
  solid(p, ink, w * 0.6, CUT)
  poly(d, [[lx - 0.035, top + 0.2], [lx + 0.035, top + 0.2], [lx + 0.05, ROOM.floor], [lx - 0.05, ROOM.floor]])
  poly(d, [[lx - 0.1, ROOM.floor - 0.12], [lx + 0.1, ROOM.floor - 0.12], [lx + 0.12, ROOM.floor], [lx - 0.12, ROOM.floor]])
  solid(p, ink, w * 0.5, M.lamp)
  poly(d, [[lx - 0.14, top - 0.12], [lx + 0.14, top - 0.12], [lx + 0.09, top + 0.2], [lx - 0.09, top + 0.2]])
  solid(p, ink, w * 0.5, CUT)
  poly(d, [[lx - 0.2, top - 0.12], [lx, top - 0.26], [lx + 0.2, top - 0.12]])
  p.noStroke()
  p.fill(SNOW)
  poly(d, [[lx - 0.19, top - 0.14], [lx, top - 0.29], [lx + 0.19, top - 0.14], [lx, top - 0.22]])
}

function shell(d: Draw): void {
  const { p, ink, w } = d
  // The ground outside, under its snow, both sides; the floor's own section under the room; and the earth under them
  // all, so the picture ends in ground wherever the camera sits.
  solid(p, ink, w * 0.6, CUT)
  box(d, -40, ROOM.floor, 40, ROOM.floor + 8)
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
  // The lamps' light up the wall behind each table: a wash on the paper above the shade, not a halo round it.
  for (const x of TABLES) glow(p, d.k, x, TABLE.top - 0.95, 1.4, M.lamp, 0.12 * lampAt(x, t), 1, 0.85)
}

/**
 * High on the wall, under the cornice, what a supper club this old has hung there: four dark old paintings in gilt
 * frames, each on two cords from a hook on the picture rail (the sea with a sail on it, the hills, a vase of flowers,
 * a woman in profile, a winter field, a man in his hat), and between the windows a regulator clock, its pendulum swinging in the dream's own time from
 * the first, so that when the band comes in on the kiss it comes in on the clock. Painted dim: the lamps are low.
 */
const PICTURES: { x: number; w: number; h: number; kind: 'sea' | 'hills' | 'flowers' | 'lady' | 'snow' | 'man' }[] = [
  { x: -11.05, w: 1.35, h: 1.0, kind: 'hills' },
  { x: -8.8, w: 1.7, h: 1.15, kind: 'sea' },
  { x: -4.4, w: 1.15, h: 1.3, kind: 'lady' },
  { x: -2.15, w: 1.3, h: 1.0, kind: 'flowers' },
  { x: 2.2, w: 1.6, h: 1.05, kind: 'snow' },
  { x: 6.0, w: 1.0, h: 1.25, kind: 'man' },
]
const HANG = -4.75
const CLOCK = { x: -6.6, y: -3.95, r: 0.36 }
function pictures(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  const rail = ROOM.ceil + 0.3
  const dim = (c: string, a = 0.55) => mixHex(c, M.panel, a)
  const gilt = dim(M.gold, 0.35)
  for (const pic of PICTURES) {
    const x0 = pic.x - pic.w / 2
    const x1 = pic.x + pic.w / 2
    const y0 = HANG
    const y1 = HANG + pic.h
    // The cords, from the hook on the rail to the frame's top corners.
    outline(p, rgba(M.gold, 0.5), w * 0.35)
    p.line(pic.x * k, rail * k, (x0 + 0.15) * k, y0 * k)
    p.line(pic.x * k, rail * k, (x1 - 0.15) * k, y0 * k)
    // The frame, and the canvas in it.
    solid(p, ink, w * 0.5, gilt)
    box(d, x0, y0, x1, y1)
    const cx0 = x0 + 0.1
    const cx1 = x1 - 0.1
    const cy0 = y0 + 0.1
    const cy1 = y1 - 0.1
    const cw = cx1 - cx0
    const ch = cy1 - cy0
    const at = (u: number, v: number): Pt => [cx0 + u * cw, cy0 + v * ch]
    p.noStroke()
    if (pic.kind === 'sea' || pic.kind === 'hills') {
      fillRect(d, cx0, cy0, cx1, cy1, dim('#8C6A52'))
      p.fill(dim('#B98B5E'))
      poly(d, [at(0, 0.45), at(1, 0.38), at(1, 0.62), at(0, 0.66)])
      if (pic.kind === 'sea') {
        p.fill(dim('#3E5A5E'))
        poly(d, [at(0, 0.62), at(1, 0.6), at(1, 1), at(0, 1)])
        // A sail on it, and a far headland.
        p.fill(dim('#4A3A30'))
        poly(d, [at(0.7, 0.62), at(1, 0.5), at(1, 0.62)])
        p.fill(dim(M.cloth, 0.45))
        poly(d, [at(0.38, 0.58), at(0.44, 0.22), at(0.5, 0.58)])
        poly(d, [at(0.33, 0.62), at(0.53, 0.62), at(0.5, 0.67), at(0.36, 0.67)])
      } else {
        p.fill(dim('#4F5A3E'))
        poly(d, [at(0, 0.55), at(0.3, 0.35), at(0.6, 0.52), at(1, 0.3), at(1, 1), at(0, 1)])
        p.fill(dim('#3B4530'))
        poly(d, [at(0, 0.82), at(0.45, 0.6), at(1, 0.78), at(1, 1), at(0, 1)])
      }
    } else if (pic.kind === 'flowers') {
      fillRect(d, cx0, cy0, cx1, cy1, dim('#3A2A24'))
      p.fill(dim('#7C6A50'))
      poly(d, [at(0.4, 0.62), at(0.6, 0.62), at(0.64, 0.95), at(0.36, 0.95)])
      // Each bloom a ring of petals round its heart, so none of them is a disc.
      for (const [u, v, r, c] of [[0.38, 0.42, 0.13, M.shade], [0.56, 0.32, 0.15, '#C98A5A'], [0.66, 0.5, 0.11, M.cloth], [0.46, 0.55, 0.1, M.shade]] as const) {
        const [fx, fy] = at(u, v)
        const rr = r * Math.min(cw, ch)
        p.fill(dim(c, 0.5))
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * Math.PI * 2 + u * 5
          p.circle((fx + Math.cos(a) * rr * 0.6) * k, (fy + Math.sin(a) * rr * 0.6) * k, rr * 0.9 * k)
        }
        p.fill(dim('#3A2A24', 0.2))
        p.circle(fx * k, fy * k, rr * 0.55 * k)
      }
    } else if (pic.kind === 'snow') {
      // A winter field at dusk: a pale sky, the snow, a line of dark trees and a lit window far off.
      fillRect(d, cx0, cy0, cx1, cy1, dim('#7D7488'))
      p.fill(dim(M.cloth, 0.42))
      poly(d, [at(0, 0.62), at(0.5, 0.55), at(1, 0.6), at(1, 1), at(0, 1)])
      p.fill(dim('#2E2A26'))
      for (const [u, h] of [[0.12, 0.3], [0.2, 0.22], [0.66, 0.34], [0.74, 0.26], [0.82, 0.3]] as const) poly(d, [at(u - 0.04, 0.6), at(u, 0.6 - h), at(u + 0.04, 0.6)])
      p.fill(dim(M.lamp, 0.35))
      p.rect(at(0.42, 0.5)[0] * k, at(0.42, 0.5)[1] * k, 0.05 * cw * k, 0.06 * ch * k)
    } else if (pic.kind === 'man') {
      fillRect(d, cx0, cy0, cx1, cy1, dim('#4A3A2E'))
      // A gentleman in profile, the other way from the lady across the room: his hat, his collar.
      p.fill(dim('#241A16'))
      poly(d, [at(0.18, 1), at(0.22, 0.76), at(0.38, 0.66), at(0.36, 0.56), at(0.3, 0.52), at(0.34, 0.42), at(0.32, 0.36), at(0.68, 0.36), at(0.66, 0.5), at(0.6, 0.62), at(0.66, 0.7), at(0.82, 0.8), at(0.86, 1)])
      poly(d, [at(0.24, 0.37), at(0.76, 0.37), at(0.7, 0.32), at(0.66, 0.16), at(0.36, 0.16), at(0.32, 0.32)])
      p.fill(dim(M.cloth, 0.5))
      poly(d, [at(0.44, 0.7), at(0.58, 0.7), at(0.52, 0.8)])
    } else {
      fillRect(d, cx0, cy0, cx1, cy1, dim('#5A3E36'))
      // A woman in profile, her hair up, her shoulders: the oldest picture in the room.
      p.fill(dim('#2E211D'))
      poly(d, [at(0.25, 1), at(0.3, 0.78), at(0.42, 0.68), at(0.42, 0.6), at(0.36, 0.55), at(0.36, 0.42), at(0.42, 0.3), at(0.56, 0.26), at(0.66, 0.34), at(0.66, 0.5), at(0.6, 0.62), at(0.62, 0.7), at(0.78, 0.8), at(0.82, 1)])
      p.circle(at(0.56, 0.22)[0] * k, at(0.56, 0.22)[1] * k, 0.18 * cw * k)
    }
    // A sprig of holly tucked over one corner: it is Christmas.
    if (pic.kind === 'sea' || pic.kind === 'lady') {
      p.fill(M.garland)
      p.ellipse((x1 - 0.12) * k, (y0 + 0.02) * k, 0.24 * k, 0.1 * k)
      p.ellipse((x1 - 0.26) * k, (y0 - 0.02) * k, 0.2 * k, 0.09 * k)
      p.fill(M.shade)
      p.circle((x1 - 0.18) * k, (y0 - 0.02) * k, 0.07 * k)
    }
  }
  // The clock: a case on the wall, its dial, its hands near midnight, and its pendulum behind the glass below.
  const { x, y, r } = CLOCK
  solid(p, ink, w * 0.5, M.wood)
  poly(d, [[x - r - 0.08, y - r - 0.1], [x + r + 0.08, y - r - 0.1], [x + r + 0.08, y + r + 1.2], [x, y + r + 1.42], [x - r - 0.08, y + r + 1.2]])
  solid(p, ink, w * 0.45, mixHex(M.cloth, M.panel, 0.3))
  p.circle(x * k, y * k, 2 * r * k)
  outline(p, rgba(ink, 0.7), w * 0.35)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r0 = i % 3 === 0 ? 0.74 : 0.84
    p.line((x + Math.sin(a) * r * r0) * k, (y - Math.cos(a) * r * r0) * k, (x + Math.sin(a) * r * 0.92) * k, (y - Math.cos(a) * r * 0.92) * k)
  }
  // Eleven minutes to midnight, and going on at a clock's own pace.
  const minutes = 49 + (t - 39) / 60
  const hand = (a: number, L: number, wt: number) => {
    outline(p, ink, w * wt)
    p.line(x * k, y * k, (x + Math.sin(a) * L) * k, (y - Math.cos(a) * L) * k)
  }
  hand(((11 + minutes / 60) / 12) * Math.PI * 2, r * 0.5, 0.75)
  hand((minutes / 60) * Math.PI * 2, r * 0.78, 0.5)
  // The pendulum: one swing a beat of the dream's comb, its bob at the end of each swing on the beat.
  const ph = (t - dream(0)) / DREAM_PERIOD
  const swing = 0.2 * Math.cos(Math.PI * ph)
  const px = x
  const py = y + r + 0.12
  const L = 0.9
  const bx = px + Math.sin(swing) * L
  const by = py + Math.cos(swing) * L
  fillRect(d, x - r + 0.02, y + r + 0.05, x + r - 0.02, y + r + 1.15, mixHex(M.panel, '#000000', 0.25))
  outline(p, mixHex(M.gold, M.panel, 0.2), w * 0.45)
  p.line(px * k, py * k, bx * k, by * k)
  solid(p, ink, w * 0.35, mixHex(M.gold, M.panel, 0.15))
  p.circle(bx * k, by * k, 0.17 * k)
}

/**
 * The houses across the street, seen through a window centred at `cx`: they are well beyond the glass, so they slide
 * with the camera by most of the way (the further a thing is, the less it moves across the frame as the camera goes).
 */
const HOUSES = Array.from({ length: 22 }, (_, i) => ({ x: -16 + i * 0.95 + 0.25 * hash(i, 31), w: 0.62 + 0.2 * hash(i, 32), h: 0.45 + 0.35 * hash(i, 33), lit: hash(i, 34) }))
function acrossTheStreet(d: Draw, t: number, cx: number, x0: number, x1: number, sill: number): void {
  const { p, k } = d
  const fr = frame(p, k)
  // Aligned as authored when the window is in the middle of the frame; elsewhere slid by 0.55 of the camera's offset.
  const shift = (fr.cx - cx) * 0.55
  const ground = sill - 0.2
  p.noStroke()
  for (const hs of HOUSES) {
    const hx = hs.x + cx * 0.3 + shift
    if (hx + hs.w < x0 - 0.2 || hx > x1 + 0.2) continue
    const top = ground - hs.h
    p.fill(mixHex(NIGHT, '#000000', 0.35))
    p.rect((hx + hs.w / 2) * k, (top + hs.h / 2) * k, hs.w * k, hs.h * k)
    // The gable, and the snow on it.
    p.triangle(hx * k, top * k, (hx + hs.w) * k, top * k, (hx + hs.w / 2) * k, (top - 0.26) * k)
    p.fill(alpha(p, SNOW, 0.8))
    p.triangle((hx - 0.04) * k, (top + 0.02) * k, (hx + hs.w / 2) * k, (top - 0.29) * k, (hx + hs.w / 2) * k, (top - 0.22) * k)
    p.triangle((hx + hs.w + 0.04) * k, (top + 0.02) * k, (hx + hs.w / 2) * k, (top - 0.29) * k, (hx + hs.w / 2) * k, (top - 0.22) * k)
    // Its windows, warm, one or two lit.
    for (let j = 0; j < 2; j++) {
      if (hash(Math.round(hs.x * 10), j + 40) < 0.3) continue
      const wx = hx + hs.w * (0.2 + 0.45 * j)
      p.fill(alpha(p, M.lamp, 0.85))
      p.rect((wx + 0.07) * k, (top + 0.22) * k, 0.11 * k, 0.13 * k)
    }
  }
  // The snow lying in the street before them, and people going by in it.
  p.fill(alpha(p, SNOW, 0.55))
  p.rect(((x0 + x1) / 2) * k, (ground + 0.2) * k, (x1 - x0 + 0.4) * k, 0.4 * k)
  farWalkers(d, t, cx, shift, ground + 0.04)
}

/** Two tall windows in the back wall, between the tables: the snowy night through them, a wreath on each. */
const WINDOWS = [-8.8, -4.4]
const WIN = { half: 0.72, top: -0.75, sill: 1.42 }
function windows(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  for (const cx of WINDOWS) {
    const [x0, x1, y0, y1] = [cx - WIN.half, cx + WIN.half, WIN.top, WIN.sill]
    // The night, deeper at the top, and the room's warmth on the glass low down.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
    g.addColorStop(0, mixHex(NIGHT, BG, 0.45))
    g.addColorStop(1, NIGHT)
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    // Across the street, through the glass: snowy houses with their windows lit, further off than the room, so as the
    // camera crosses the room they slide behind the window more slowly than the window goes by.
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    ctx.clip()
    acrossTheStreet(d, t, cx, x0, x1, y1)
    ctx.restore()
    // Snow falling past outside, and lying on the outer ledge.
    p.noStroke()
    p.fill(alpha(p, SNOW, 0.5))
    for (const fl of FLAKES) {
      // Each window its own fall: the flakes' tile, shifted by where the window is.
      const x = x0 + ((fl.x * 0.37 + cx * 1.37 + 0.18 * Math.sin(t * 0.7 + fl.ph)) % (x1 - x0) + (x1 - x0)) % (x1 - x0)
      const y = y0 + (((fl.y * 0.6 + cx * 0.71 + fl.v * t) % (y1 - y0)) + (y1 - y0)) % (y1 - y0)
      p.circle(x * k, y * k, 1.3 * fl.r * k)
    }
    p.fill(alpha(p, SNOW, 0.75))
    poly(d, [[x0, y1], [x0 + 0.1, y1 - 0.1], [cx - 0.2, y1 - 0.14], [cx + 0.3, y1 - 0.09], [x1 - 0.08, y1 - 0.12], [x1, y1]])
    // Frost in the lower corners.
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    ctx.clip()
    for (const x of [x0, x1]) glow(p, k, x, y1, 0.5, SNOW, 0.25)
    ctx.restore()
    // The sashes: frame, mullion, glazing bars; the sill.
    outline(p, M.wood, w * 1.6)
    box(d, x0, y0, x1, y1)
    p.line(cx * k, y0 * k, cx * k, y1 * k)
    p.strokeWeight(w)
    for (const yy of [y0 + (y1 - y0) / 3, y0 + (2 * (y1 - y0)) / 3]) p.line(x0 * k, yy * k, x1 * k, yy * k)
    solid(p, ink, w * 0.5, M.wood)
    box(d, x0 - 0.12, y1, x1 + 0.12, y1 + 0.1)
    // The wreath, hung on the middle of the window: a ring of pine, berries, a red bow at its foot.
    const wy = y0 + (y1 - y0) * 0.36
    const r = 0.26
    p.noFill()
    p.stroke(M.pine)
    p.strokeWeight(0.13 * k)
    p.circle(cx * k, wy * k, 2 * r * k)
    p.noStroke()
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2
      p.fill(i % 2 ? M.garland : M.pine)
      p.circle((cx + Math.cos(a) * r) * k, (wy + Math.sin(a) * r) * k, 0.1 * k)
    }
    p.fill(M.shade)
    for (const a of [0.6, 2.2, 3.9, 5.1]) p.circle((cx + Math.cos(a) * r) * k, (wy + Math.sin(a) * r) * k, 0.055 * k)
    bow(d, cx, wy + r, 0.95)
    // The lamps' glow lies on the glass too.
    glow(p, k, cx, y1 - 0.2, 0.9, M.lamp, 0.06 * Math.max(...TABLES.map((x) => lampAt(x, t) * Math.exp(-Math.abs(x - cx) / 1.5))))
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
  const lv = lampAt(x, t)
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
  // The bulb under the shade, seen at its rim.
  p.noStroke()
  p.fill(alpha(p, mixHex(M.lamp, M.cloth, 0.3), Math.min(1, 0.25 + 0.75 * lit)))
  box(d, x - 0.09, 2.495, x + 0.09, 2.51)
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
  const lv = Math.min(1.3, lampAt(TREE.x, t))
  for (const L of LIGHTS) {
    const x = cx + treeHalf(L.f) * L.s * 0.9
    const y = treeY(L.f) - 0.05
    const a = (0.7 + 0.12 * Math.sin(t * 1.3 + L.ph)) * lv
    p.noStroke()
    p.fill(alpha(p, mixHex(M.pine, M.lamp, Math.min(1, a)), 1))
    p.circle(x * k, y * k, 0.055 * k)
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
  // As the cup spills them out beside it, it rocks on its pin, the cord's jerk.
  const rock = 0.22 * ring(t - T.starFlash, 2.4, 0.4)
  p.push()
  p.translate(sx * k, sy * k)
  p.rotate(turn + rock)
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
    // The bulbs, hanging under the wire: dark glass, warm once the kiss's wave has passed, their own colours once
    // he has gone over this swag's hook.
    const lit = swagLit(i, t)
    const on = Math.min(1, lit)
    for (let j = 0; j < BULBS; j++) {
      const u = (j + 0.5) / BULBS
      const [x, y0] = wire(i, u)
      const y = y0 + give(x, u)
      const color = M.bulbs[(i * 2 + j) % M.bulbs.length]
      // Each swings on its flex as he goes by; the one he is passing jumps on an accent, and on the string's one
      // pulse a ripple runs down the whole of it, bulb after bulb.
      const ripple = 0.22 * ring(t - T.pulse - 0.035 * (i * BULBS + j), 2.2, 0.4)
      const sway = 0.35 * ring(t - PASS[i][j], 1.7, 0.45) + 0.45 * kickOf(i, j, t) + (on > 0 ? ripple : 0)
      const warm = Math.min(1, bulbWarm(x, t))
      p.push()
      p.translate(x * k, y * k)
      p.rotate(sway)
      solid(p, ink, w * 0.3, M.panel)
      p.beginShape()
      p.vertex(-0.03 * k, 0)
      p.vertex(0.03 * k, 0)
      p.vertex(0.03 * k, 0.07 * k)
      p.vertex(-0.03 * k, 0.07 * k)
      p.endShape(p.CLOSE)
      const dark = mixHex(color, PAPER, 0.78)
      const glass = mixHex(mixHex(dark, mixHex(color, M.lamp, 0.6), warm * 0.8), color, on)
      const edge = Math.max(on, 0.5 * warm)
      solid(p, mixHex(M.panel, ink, edge), w * (0.2 + 0.1 * edge), glass)
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


/* ------------------------------------------------------------------ the diners, the waiter, the street */

/**
 * Lipton's is full for Christmas: someone at every table. A couple at the first, a mother and her small son kneeling
 * up on his chair at the second, two old friends at the third, a couple at the one nearest the stage. People, not
 * balls: shoulders, a head, an arm on the table, in their party clothes, each lit along one side by the lamp on their
 * table, so they go down to shapes with it in the hush and come up with it on the kiss.
 *
 * They look at each other across the table; they turn to look at her as she crosses past them; when the room lights
 * up they turn to the stage, where the two of them are; and as the two ride the bulbs over them, the ones they are
 * passing over look up.
 */
interface Diner {
  table: number
  side: -1 | 1
  coat: string
  hat?: boolean
  bun?: boolean
  child?: boolean
}
const DINERS: Diner[] = [
  { table: 0, side: -1, coat: mixHex('#2B2E3A', M.panel, 0.35), hat: true },
  { table: 0, side: 1, coat: mixHex(M.shade, M.panel, 0.35), bun: true },
  { table: 1, side: -1, coat: mixHex(M.garland, M.panel, 0.3), child: true },
  { table: 1, side: 1, coat: mixHex(M.cloth, M.panel, 0.45), bun: true },
  { table: 2, side: -1, coat: mixHex('#5A4A3A', M.panel, 0.3) },
  { table: 2, side: 1, coat: mixHex('#3B3340', M.panel, 0.3), hat: true },
  { table: 3, side: -1, coat: mixHex(M.pine, M.panel, 0.25) },
  { table: 3, side: 1, coat: mixHex(M.shade, M.cloth, 0.25), bun: true },
]
const HAIR = mixHex(M.panel, '#000000', 0.35)

/** Where a diner looks at `t`: across (-1 left .. 1 right) and up (0..1). */
function gazeOf(x: number, side: -1 | 1, t: number): { d: number; up: number } {
  let d = -side * 0.85
  let up = 0
  let w = 0
  // At her, as she crosses the room past them.
  if (t > 40 && t < 58.8) {
    const [mx] = mia(t)
    const near = Math.exp(-(((mx - x) / 1.9) ** 2))
    if (near > w) {
      w = near
      d = d * (1 - near) + Math.sign(mx - x || 1) * near
    }
  }
  // To the stage when the room lights up round the kiss, for a while, and back to their table.
  const since = t - reach(x)
  if (t > T.kiss && since > -0.1) {
    const turn = smooth(since, -0.1, 0.5) * (1 - smooth(since, 3.2, 4.4))
    d = d * (1 - turn) + 1 * turn
    up = Math.max(up, 0.25 * turn)
  }
  // Up, at the two of them going over on the bulbs.
  if (t > T.tip && t < T.swags[4] + 1.5) {
    const [sx, sy] = seb(t)
    const over = Math.exp(-(((sx - x) / 1.6) ** 2)) * smooth(t, T.tip, T.tip + 0.5)
    if (over > 0.05) {
      d = d * (1 - over) + Math.max(-1, Math.min(1, (sx - x) / 1.2)) * over
      up = Math.max(up, over * (sy < 1 ? 1 : 0.4))
    }
  }
  return { d: Math.max(-1, Math.min(1, d)), up }
}

function diners(d: Draw, t: number): void {
  const { p, k } = d
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const [i, dn] of DINERS.entries()) {
    const tx = TABLES[dn.table]
    const x = tx + dn.side * 0.5
    const lv = Math.min(1.1, lampAt(tx, t))
    const g = gazeOf(x, dn.side, t)
    const s = dn.child ? 0.72 : 1
    // A child kneels up on his chair: higher than he would sit.
    const seat = 2.78 - (dn.child ? 0.06 : 0)
    const sh = seat - 0.3 * s
    const breath = 0.006 * Math.sin(t * 1.1 + i * 1.7)
    const hx = x + 0.025 * g.d * s
    const hy = sh - 0.11 * s - 0.02 * g.up + breath
    const r = 0.075 * s
    // The body: from the seat up to rounded shoulders.
    ctx.fillStyle = mixHex(dn.coat, '#000000', 0.55 - 0.4 * Math.min(1, lv))
    ctx.beginPath()
    ctx.moveTo((x - 0.13 * s) * k, seat * k)
    ctx.lineTo((x - 0.15 * s) * k, (sh + 0.06 * s) * k)
    ctx.quadraticCurveTo((x - 0.14 * s) * k, (sh - 0.01) * k, (x - 0.05 * s) * k, (sh - 0.01) * k)
    ctx.lineTo((x + 0.05 * s) * k, (sh - 0.01) * k)
    ctx.quadraticCurveTo((x + 0.14 * s) * k, (sh - 0.01) * k, (x + 0.15 * s) * k, (sh + 0.06 * s) * k)
    ctx.lineTo((x + 0.13 * s) * k, seat * k)
    ctx.closePath()
    ctx.fill()
    // The arm on the table: from the near shoulder to the cloth's edge.
    ctx.strokeStyle = ctx.fillStyle
    ctx.lineCap = 'round'
    ctx.lineWidth = 0.05 * s * k
    ctx.beginPath()
    ctx.moveTo((x - dn.side * 0.1 * s) * k, (sh + 0.04) * k)
    ctx.lineTo((tx + dn.side * (TABLE.half - 0.1)) * k, (TABLE.top - 0.02) * k)
    ctx.stroke()
    // The head, turned: its nose toward where they look.
    ctx.fillStyle = mixHex(HAIR, '#000000', 0.3 - 0.25 * Math.min(1, lv))
    ctx.beginPath()
    ctx.arc(hx * k, hy * k, r * k, 0, Math.PI * 2)
    ctx.fill()
    const turn = Math.abs(g.d)
    if (turn > 0.2) {
      const sd = Math.sign(g.d)
      ctx.beginPath()
      ctx.moveTo((hx + sd * r * 0.8) * k, (hy - 0.25 * r - 0.3 * r * g.up) * k)
      ctx.lineTo((hx + sd * r * (1 + 0.35 * turn)) * k, (hy + 0.1 * r - 0.4 * r * g.up) * k)
      ctx.lineTo((hx + sd * r * 0.8) * k, (hy + 0.35 * r - 0.3 * r * g.up) * k)
      ctx.fill()
    }
    if (dn.bun) {
      ctx.beginPath()
      ctx.arc((hx - Math.sign(g.d || -dn.side) * r * 0.85) * k, (hy - r * 0.35) * k, r * 0.45 * k, 0, Math.PI * 2)
      ctx.fill()
    }
    if (dn.hat) {
      ctx.fillRect((hx - r * 1.25) * k, (hy - r * 0.55) * k, r * 2.5 * k, r * 0.22 * k)
      ctx.fillRect((hx - r * 0.75) * k, (hy - r * 1.25) * k, r * 1.5 * k, r * 0.75 * k)
    }
    // The lamp's light along the side of them toward it.
    if (lv > 0.05) {
      ctx.strokeStyle = rgba(M.lamp, 0.6 * Math.min(1, lv))
      ctx.lineWidth = Math.max(1, 0.012 * k)
      const a0 = dn.side < 0 ? -1.1 : Math.PI + 0.1
      ctx.beginPath()
      ctx.arc(hx * k, hy * k, r * k, a0, a0 + 1.0)
      ctx.moveTo((x - dn.side * 0.05 * s) * k, (sh - 0.01) * k)
      ctx.quadraticCurveTo((x - dn.side * 0.14 * s) * k, (sh - 0.01) * k, (x - dn.side * 0.15 * s) * k, (sh + 0.08 * s) * k)
      ctx.stroke()
    }
  }
}

/**
 * The waiter, in a white apron with a tray up on one hand: out from the stage end as she comes in, to the table
 * nearest the stage, on to the second, and back by the door as she reaches the piano; still in the hush, like
 * everyone; and back across toward the stage once the room is lit, to stand by the tree and watch them ride.
 */
const WAITER: [number, number][] = [
  [39.9, -1.95], [42.6, -1.95], [44.2, -2.6], [46.0, -2.6], [49.0, -6.9], [50.8, -6.9], [54.2, -11.2],
  [67.4, -11.2], [72.4, -6.4], [74.0, -6.4], [77.6, -1.95],
]
function waiterX(t: number): { x: number; walking: number; dir: number } {
  if (t <= WAITER[0][0]) return { x: WAITER[0][1], walking: 0, dir: -1 }
  for (let i = 1; i < WAITER.length; i++) {
    const [t0, x0] = WAITER[i - 1]
    const [t1, x1] = WAITER[i]
    if (t > t1) continue
    const u = (t - t0) / (t1 - t0)
    const x = x0 + (x1 - x0) * inout(u)
    return { x, walking: x1 !== x0 ? Math.sin(Math.PI * u) : 0, dir: x1 < x0 ? -1 : x1 > x0 ? 1 : i + 1 < WAITER.length && WAITER[i + 1][1] < x1 ? -1 : 1 }
  }
  return { x: WAITER[WAITER.length - 1][1], walking: 0, dir: -1 }
}
function waiter(d: Draw, t: number): void {
  const { p, k } = d
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const { x, walking, dir } = waiterX(t)
  // His stride: a step every third of a second while he walks.
  const ph = (t * 3) % 1
  const swing = walking * Math.sin(ph * Math.PI * 2)
  const bob = 0.012 * walking * Math.abs(Math.cos(ph * Math.PI * 2))
  const floor = ROOM.floor
  const hip = floor - 0.42 - bob
  const sh = floor - 0.74 - bob
  const lit = Math.min(1, 0.35 + 0.65 * lampAt(x, t))
  const suit = mixHex('#1E1A20', M.panel, 0.25)
  ctx.fillStyle = suit
  ctx.strokeStyle = suit
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.045 * k
  ctx.beginPath()
  ctx.moveTo(x * k, hip * k)
  ctx.lineTo((x + 0.09 * swing) * k, floor * k)
  ctx.moveTo(x * k, hip * k)
  ctx.lineTo((x - 0.09 * swing) * k, floor * k)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo((x - 0.09) * k, sh * k)
  ctx.lineTo((x + 0.09) * k, sh * k)
  ctx.lineTo((x + 0.08) * k, (hip + 0.04) * k)
  ctx.lineTo((x - 0.08) * k, (hip + 0.04) * k)
  ctx.closePath()
  ctx.fill()
  // The long white apron, and the white of his shirt front.
  ctx.fillStyle = mixHex(M.cloth, '#000000', 0.55 - 0.45 * lit)
  ctx.fillRect((x - 0.075) * k, (hip - 0.06) * k, 0.15 * k, 0.32 * k)
  ctx.fillRect((x - 0.02) * k, (sh + 0.01) * k, 0.04 * k, 0.12 * k)
  ctx.fillStyle = HAIR
  ctx.beginPath()
  ctx.arc((x + 0.01 * dir) * k, (sh - 0.1) * k, 0.065 * k, 0, Math.PI * 2)
  ctx.fill()
  // The tray up on his hand, a plate under its cover and a bottle; down to the table while he serves.
  const serving = walking < 0.05 && Math.abs(x - TABLES[3] - 0.65) < 0.1 ? smooth(t, 44.3, 44.8) * (1 - smooth(t, 45.4, 45.9)) : walking < 0.05 && Math.abs(x - TABLES[1] - 0.8) < 0.1 ? smooth(t, 49.1, 49.6) * (1 - smooth(t, 50.2, 50.7)) : 0
  const tx = x + 0.17 * dir
  const ty = sh - 0.05 + 0.32 * serving
  ctx.strokeStyle = suit
  ctx.lineWidth = 0.035 * k
  ctx.beginPath()
  ctx.moveTo((x + 0.06 * dir) * k, (sh + 0.03) * k)
  ctx.lineTo(tx * k, (ty + 0.01) * k)
  ctx.moveTo((x - 0.06 * dir) * k, (sh + 0.03) * k)
  ctx.lineTo((x - 0.09 * dir - 0.04 * swing) * k, (sh + 0.32) * k)
  ctx.stroke()
  ctx.fillStyle = mixHex(mixHex(M.cloth, M.panel, 0.45), '#000000', 0.5 - 0.4 * lit)
  ctx.fillRect((tx - 0.13) * k, ty * k, 0.26 * k, 0.02 * k)
  ctx.beginPath()
  ctx.ellipse((tx - 0.03) * k, ty * k, 0.07 * k, 0.05 * k, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = mixHex(M.pine, '#000000', 0.3)
  ctx.fillRect((tx + 0.06) * k, (ty - 0.13) * k, 0.035 * k, 0.13 * k)
}

/** The coat rack inside the door, heavy with the night's coats, a scarf, a hat; snow melting off the shoulders. */
const RACK_X = -11.2
function coatRack(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  const floor = ROOM.floor
  const top = floor - 0.95
  solid(p, ink, w * 0.4, M.wood)
  box(d, RACK_X - 0.018, top, RACK_X + 0.018, floor)
  poly(d, [[RACK_X - 0.17, floor], [RACK_X, floor - 0.08], [RACK_X + 0.17, floor], [RACK_X, floor - 0.03]])
  // The coats, hung from the hooks at the top, one over another; each sways a hair as the door's draught finds it.
  const draught = 0.04 * ring(t - T.doorIn[1], 0.9, 0.9) + 0.03 * ring(t - T.doorOut, 0.9, 0.9)
  const coats: [number, number, string][] = [[-0.09, 0.62, mixHex('#3A3440', M.panel, 0.3)], [0.1, 0.55, mixHex(M.pine, M.panel, 0.35)], [-0.02, 0.48, mixHex(M.shade, M.panel, 0.4)]]
  for (const [i, [dx, len, c]] of coats.entries()) {
    const sw = draught * (1 + 0.4 * i)
    p.push()
    p.translate((RACK_X + dx) * k, (top + 0.08) * k)
    p.rotate(sw)
    solid(p, ink, w * 0.35, c)
    poly(d, [[-0.05, 0], [0.05, 0], [0.13, 0.12], [0.11, len], [-0.11, len], [-0.13, 0.12]])
    // A dusting of snow on its shoulders, going as the room warms it.
    const snow = 0.8 * (1 - smooth(t, 44 + i * 5, 62 + i * 5))
    if (snow > 0.02) {
      p.noStroke()
      p.fill(alpha(p, SNOW, snow))
      poly(d, [[-0.05, 0.01], [0.05, 0.01], [0.12, 0.11], [-0.12, 0.11]])
    }
    p.pop()
  }
  // A scarf over the top; the pole's crown above it, its curled hooks, and a hat on the hook to one side.
  solid(p, ink, w * 0.35, M.shade)
  poly(d, [[RACK_X - 0.06, top + 0.06], [RACK_X + 0.07, top + 0.04], [RACK_X + 0.09, top + 0.36], [RACK_X + 0.04, top + 0.37], [RACK_X + 0.02, top + 0.1]])
  solid(p, ink, w * 0.4, M.wood)
  box(d, RACK_X - 0.018, top - 0.16, RACK_X + 0.018, top + 0.05)
  p.circle(RACK_X * k, (top - 0.17) * k, 0.05 * k)
  outline(p, M.wood, w * 1.4)
  p.noFill()
  for (const side of [-1, 1]) {
    p.beginShape()
    p.vertex(RACK_X * k, (top - 0.06) * k)
    p.quadraticVertex((RACK_X + side * 0.16) * k, (top - 0.08) * k, (RACK_X + side * 0.15) * k, (top - 0.17) * k)
    p.endShape()
  }
  solid(p, ink, w * 0.35, mixHex('#2B2E3A', M.panel, 0.3))
  box(d, RACK_X + 0.06, top - 0.15, RACK_X + 0.26, top - 0.125)
  box(d, RACK_X + 0.1, top - 0.24, RACK_X + 0.22, top - 0.15)
}

/** People going by in the snow: on the pavement past the door, and across the street seen through the windows. */
const WALKERS: { from: number; to: number; x0: number; x1: number; umbrella: boolean }[] = [
  { from: 39.5, to: 47.5, x0: -24, x1: -14.9, umbrella: true },
  { from: 84.0, to: 92.0, x0: -14.9, x1: -24, umbrella: false },
]
function walker(d: Draw, x: number, foot: number, s: number, ph: number, umbrella: boolean, dir: number, fill: string): void {
  const { p, k } = d
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const swing = Math.sin(ph * Math.PI * 2)
  const hip = foot - 0.4 * s
  const sh = foot - 0.72 * s
  ctx.fillStyle = fill
  ctx.strokeStyle = fill
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.05 * s * k
  ctx.beginPath()
  ctx.moveTo(x * k, hip * k)
  ctx.lineTo((x + 0.1 * s * swing) * k, foot * k)
  ctx.moveTo(x * k, hip * k)
  ctx.lineTo((x - 0.1 * s * swing) * k, foot * k)
  ctx.stroke()
  // A long coat to the knee.
  ctx.beginPath()
  ctx.moveTo((x - 0.08 * s) * k, sh * k)
  ctx.lineTo((x + 0.08 * s) * k, sh * k)
  ctx.lineTo((x + 0.13 * s) * k, (hip + 0.14 * s) * k)
  ctx.lineTo((x - 0.13 * s) * k, (hip + 0.14 * s) * k)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x * k, (sh - 0.1 * s) * k, 0.065 * s * k, 0, Math.PI * 2)
  ctx.fill()
  if (umbrella) {
    ctx.lineWidth = 0.02 * s * k
    ctx.beginPath()
    ctx.moveTo((x + 0.06 * s * dir) * k, (sh + 0.05 * s) * k)
    ctx.lineTo((x + 0.06 * s * dir) * k, (sh - 0.42 * s) * k)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo((x + 0.06 * s * dir - 0.3 * s) * k, (sh - 0.3 * s) * k)
    ctx.quadraticCurveTo((x + 0.06 * s * dir) * k, (sh - 0.62 * s) * k, (x + 0.06 * s * dir + 0.3 * s) * k, (sh - 0.3 * s) * k)
    ctx.closePath()
    ctx.fill()
  } else {
    // A hat, against the snow.
    ctx.fillRect((x - 0.09 * s) * k, (sh - 0.14 * s) * k, 0.18 * s * k, 0.025 * s * k)
    ctx.fillRect((x - 0.055 * s) * k, (sh - 0.21 * s) * k, 0.11 * s * k, 0.07 * s * k)
  }
}
function passersBy(d: Draw, t: number): void {
  for (const wk of WALKERS) {
    if (t < wk.from || t > wk.to) continue
    const u = (t - wk.from) / (wk.to - wk.from)
    const x = wk.x0 + (wk.x1 - wk.x0) * u
    walker(d, x, ROOM.floor, 1, t * 1.6, wk.umbrella, Math.sign(wk.x1 - wk.x0), mixHex(NIGHT, '#000000', 0.55))
  }
}
/** Across the street, through the windows: small, far, at the pace of a walk in snow, going both ways. */
const FAR_WALKERS = [
  { x0: -17, v: 0.32, umbrella: true },
  { x0: 4, v: -0.27, umbrella: false },
  { x0: -2, v: 0.22, umbrella: false },
]
function farWalkers(d: Draw, t: number, cx: number, shift: number, ground: number): void {
  for (const fw of FAR_WALKERS) {
    // They walk the length of the street and back round, so there is always someone going by somewhere.
    const span = 26
    const x = -16 + ((((fw.x0 + 16 + fw.v * t) % span) + span) % span) + cx * 0.3 + shift
    walker(d, x, ground, 0.34, t * 1.5 + fw.x0, fw.umbrella, Math.sign(fw.v), mixHex(NIGHT, '#000000', 0.62))
  }
}

/**
 * Paper snowflakes, cut and hung from the ceiling on threads over the room, above the string of bulbs. Each turns
 * slowly on its thread, its face catching the lamps' light as it comes round and going darker edge-on; as the two
 * of them ride by beneath, the air of their passing sets the nearest swinging.
 */
const FLAKES_HUNG = Array.from({ length: 13 }, (_, i) => {
  const x = -12.6 + i * 1.62 + 0.4 * (hash(i, 81) - 0.5)
  // Above the wire: well clear of it, so they never cross the ride.
  const swag = Math.max(0, Math.min(3, Math.floor((HOOKS[0][0] - x) / ((HOOKS[0][0] - HOOKS[4][0]) / 4))))
  const u = Math.max(0, Math.min(1, (HOOKS[swag][0] - x) / (HOOKS[swag][0] - HOOKS[swag + 1][0])))
  const wireY = wire(swag, u)[1]
  const low = Math.min(wireY - 0.85, -3.0)
  const y = ROOM.ceil + 0.75 + (low - ROOM.ceil - 0.75) * (0.3 + 0.7 * hash(i, 82))
  return { x, y, r: 0.15 + 0.08 * hash(i, 83), w: 0.25 + 0.35 * hash(i, 84), ph: hash(i, 85) * 6.28 }
}).filter((f) => f.x < TREE.x - TREE.half - 0.3 && f.y > ROOM.ceil + 0.5)
/** The flake's paper, as a twelve-pointed cut: six arms, each with a pair of side notches. */
const FLAKE_SHAPE: Pt[] = (() => {
  const out: Pt[] = []
  for (let a = 0; a < 6; a++) {
    const th = (a * Math.PI) / 3 - Math.PI / 2
    const at = (r: number, off: number): Pt => [Math.cos(th + off) * r, Math.sin(th + off) * r]
    out.push(at(0.32, -0.42), at(0.55, -0.16), at(0.66, -0.36), at(0.72, -0.12), at(1, 0), at(0.72, 0.12), at(0.66, 0.36), at(0.55, 0.16), at(0.32, 0.42))
  }
  return out
})()
function hungFlakes(d: Draw, t: number): void {
  const { p, k, w } = d
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const riding = t > T.tip && t < T.swags[4] + 0.6
  const [sx] = riding ? seb(t) : [Infinity]
  for (const [i, fl] of FLAKES_HUNG.entries()) {
    // Swung by the air of their passing.
    const pass = riding ? Math.exp(-(((sx - fl.x) / 1.2) ** 2)) : 0
    const swing = 0.06 * Math.sin(t * 0.8 + fl.ph) + 0.18 * pass * Math.sin(t * 5 + i)
    const th = fl.ph + fl.w * t + 2.5 * pass
    const face = Math.cos(th)
    const lv = Math.min(1, lampAt(fl.x, t))
    const cx = fl.x + swing * (fl.y - ROOM.ceil) * 0.15
    // The thread.
    ctx.strokeStyle = rgba(M.cloth, 0.35)
    ctx.lineWidth = Math.max(1, 0.006 * k)
    ctx.beginPath()
    ctx.moveTo(fl.x * k, ROOM.ceil * k)
    ctx.lineTo(cx * k, (fl.y - fl.r) * k)
    ctx.stroke()
    // The paper: turned on the thread, squeezed edge-on, lit on its face and dimmer on its back.
    const lit = face > 0 ? 0.55 + 0.45 * face : 0.35 + 0.25 * -face
    ctx.fillStyle = mixHex(mixHex(M.cloth, M.panel, 0.55), M.cloth, lit * (0.45 + 0.55 * lv))
    ctx.strokeStyle = rgba(M.panel, 0.6)
    ctx.lineWidth = Math.max(1, w * 0.3)
    ctx.beginPath()
    const sxk = Math.max(0.08, Math.abs(face)) * fl.r
    FLAKE_SHAPE.forEach(([px, py], j) => {
      const X = (cx + px * sxk) * k
      const Y = (fl.y + py * fl.r) * k
      if (j) ctx.lineTo(X, Y)
      else ctx.moveTo(X, Y)
    })
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * Brass sconces on the wall between the windows, a small red shade on each like the tables': each lights a short
 * scallop of the wallpaper above it and a smaller one below. They go down in the hush and come up on the
 * kiss's wave with the rest.
 */
const SCONCES = [-11.0, -6.6, -2.25]
const SCONCE_Y = -0.15
function sconces(d: Draw, t: number): void {
  const { p, k, ink, w } = d
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const x of SCONCES) {
    const lv = Math.min(1.1, lampAt(x, t))
    // The light on the wall, out of the shade's open top and bottom: a short scallop of lit paper each way, a hand or
    // so high, its curved edge plain, and the paper beyond it in the room's light. Not a fan up to the cornice.
    for (const [dir, len, a] of [[-1, 0.3, 0.13], [1, 0.16, 0.09]] as const) {
      const y0 = SCONCE_Y + dir * 0.06
      const y1 = y0 + dir * len
      const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
      g.addColorStop(0, rgba(M.lamp, a * lv))
      g.addColorStop(1, rgba(M.lamp, a * lv * 0.45))
      ctx.fillStyle = g
      // The scallop: its sides bow out from the shade's rim and round over into its edge.
      const hw = 0.1 + 0.35 * len
      ctx.beginPath()
      ctx.moveTo((x - 0.08) * k, y0 * k)
      ctx.lineTo((x + 0.08) * k, y0 * k)
      ctx.quadraticCurveTo((x + hw) * k, (y0 + dir * 0.35 * len) * k, (x + hw * 0.8) * k, y1 * k)
      ctx.quadraticCurveTo(x * k, (y1 + dir * 0.35 * len) * k, (x - hw * 0.8) * k, y1 * k)
      ctx.quadraticCurveTo((x - hw) * k, (y0 + dir * 0.35 * len) * k, (x - 0.08) * k, y0 * k)
      ctx.closePath()
      ctx.fill()
    }
    // The plate, the arm, the shade.
    solid(p, ink, w * 0.35, M.gold)
    box(d, x - 0.035, SCONCE_Y + 0.05, x + 0.035, SCONCE_Y + 0.22)
    box(d, x - 0.012, SCONCE_Y, x + 0.012, SCONCE_Y + 0.14)
    const litShade = Math.min(1, lv)
    solid(p, ink, w * 0.4, mixHex(mixHex(M.shade, M.panel, 0.55), mixHex(M.shade, M.lamp, 0.3), litShade))
    poly(d, [[x - 0.05, SCONCE_Y - 0.12], [x + 0.05, SCONCE_Y - 0.12], [x + 0.1, SCONCE_Y + 0.02], [x - 0.1, SCONCE_Y + 0.02]])
  }
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
    pictures(d, t)
    sconces(d, t)
    windows(d, t)
    hungFlakes(d, t)
    garland(d, t)
    stage(d)
    coatRack(d, t)
    waiter(d, t)
    for (const x of TABLES) table(d, x, t)
    diners(d, t)
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

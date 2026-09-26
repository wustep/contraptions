import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { hash } from '../kit'
import { drawTroll, type Pen } from '../troll'
import { GOLD, STONE, TROLL, WORKS } from '../worlds'
import { HEAP_TOP, PEER_CART, TROLL_CART, type CartShape, type TrollAct } from './mine-clock'

/**
 * The mine's carts: a troll-built ore cart (a timber bin bound with iron, on four small iron wheels), his heaped with
 * ore (grey rock, a little gold), and the trolls' bigger one with two miners standing in it. Drawn from the rail up:
 * `(x, y)` is the middle between the wheels' feet on the rail, cells, and the cart may be tilted about it.
 */

export interface CartLook {
  /** How lit (0 a dark shape a step above the rock, 1 in full torchlight). */
  light: number
  /** The wheels' turn, radians. */
  turn: number
  /** Tilt of the whole cart about its feet (radians, + is nose down). */
  tilt: number
  /** The body's dip on its springs (cells, + is down): a clack, a landing. */
  dip: number
  /** The bin pitched forward about its front hinge (radians). */
  tip?: number
  /** How much ore is left in the bin (1 heaped, 0 empty). */
  load?: number
}

/** Colours in this light: the dark is the rock the cart sinks into. */
function shade(hex: string, light: number, bg: string): string {
  return mixHex(bg, hex, 0.28 + 0.72 * Math.max(0, Math.min(1, light)))
}

function poly(p: p5, k: number, pts: Pt[]): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
}

/** A small iron wheel with a flanged rim and a hub, turning: its bolts show the turn. */
function wheel(p: p5, c: Pen, x: number, y: number, r: number, turn: number, light: number, ink: string): void {
  const k = c.k
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.8)
  p.fill(shade(WORKS.iron, light, c.bg))
  p.circle(x * k, y * k, 2 * r * k)
  p.noFill()
  p.stroke(shade(WORKS.steel, light * 0.9, c.bg))
  p.strokeWeight(c.weight * 0.7)
  p.circle(x * k, y * k, 1.35 * r * k)
  p.noStroke()
  p.fill(shade(WORKS.steel, light, c.bg))
  for (let i = 0; i < 3; i++) {
    const a = turn + (i * Math.PI * 2) / 3
    p.circle((x + Math.cos(a) * r * 0.45) * k, (y + Math.sin(a) * r * 0.45) * k, r * 0.22 * k)
  }
  p.fill(ink)
  p.circle(x * k, y * k, r * 0.28 * k)
}

/** The bin's outline: a trapezoid, bottom to rim, in the cart's frame (the rail at y 0). */
const binPts = (s: CartShape): Pt[] => [
  [-s.bottomHalf, -s.bottom],
  [s.bottomHalf, -s.bottom],
  [s.rimHalf, -s.rim],
  [-s.rimHalf, -s.rim],
]

/** The bin's near side: planks, iron bands at the corners and the rim, and a bumper block at each end. */
function binSide(p: p5, c: Pen, s: CartShape, light: number, ink: string, wood: string): void {
  const k = c.k
  p.stroke(ink)
  p.strokeWeight(c.weight)
  p.fill(shade(wood, light, c.bg))
  poly(p, k, binPts(s))
  // Plank seams, faint.
  p.stroke(shade(mixHex(wood, WORKS.iron, 0.55), light, c.bg))
  p.strokeWeight(c.weight * 0.55)
  const h = s.rim - s.bottom
  for (const f of [0.36, 0.68]) {
    const y = -s.bottom - h * f
    const half = s.bottomHalf + (s.rimHalf - s.bottomHalf) * f
    p.line((-half + 0.04) * k, y * k, (half - 0.04) * k, y * k)
  }
  // Iron: a band round the rim, and a strap down each end.
  const iron = shade(WORKS.iron, light, c.bg)
  p.noStroke()
  p.fill(iron)
  const band = 0.055
  poly(p, k, [
    [-s.rimHalf, -s.rim],
    [s.rimHalf, -s.rim],
    [s.rimHalf - 0.012, -s.rim + band],
    [-s.rimHalf + 0.012, -s.rim + band],
  ])
  for (const side of [-1, 1]) {
    const x0 = side * (s.bottomHalf - 0.03)
    const x1 = side * (s.rimHalf - 0.03)
    const w = 0.075
    poly(p, k, [
      [x0 - (side * w) / 2, -s.bottom],
      [x0 + (side * w) / 2, -s.bottom],
      [x1 + (side * w) / 2, -s.rim],
      [x1 - (side * w) / 2, -s.rim],
    ])
  }
  // Rivets on the straps (tiny).
  p.fill(shade(WORKS.steel, light, c.bg))
  for (const side of [-1, 1]) for (const f of [0.25, 0.75]) {
    const x = side * (s.bottomHalf - 0.03 + (s.rimHalf - s.bottomHalf) * f)
    p.circle(x * k, (-s.bottom - h * f) * k, 0.022 * k)
  }
  // Bumpers.
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.9)
  p.fill(shade(WORKS.timber, light, c.bg))
  p.rectMode(p.CORNER)
  for (const side of [-1, 1]) {
    const x0 = side > 0 ? s.bottomHalf - 0.02 : -s.bump
    p.rect(x0 * k, (-s.bottom - 0.02) * k, (s.bump - s.bottomHalf + 0.02) * k, 0.1 * k)
  }
}

/** The underframe and the axle boxes, under the bin. */
function chassis(p: p5, c: Pen, s: CartShape, light: number, ink: string): void {
  const k = c.k
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.8)
  p.fill(shade(WORKS.wood, light * 0.8, c.bg))
  p.rectMode(p.CORNER)
  p.rect(-s.bottomHalf * k, (-s.bottom - 0.01) * k, 2 * s.bottomHalf * k, 0.07 * k)
  p.fill(shade(WORKS.iron, light, c.bg))
  for (const side of [-1, 1]) p.rect((side * s.wheelX - 0.07) * k, (-s.wheelR - 0.06) * k, 0.14 * k, 0.1 * k)
}

/* ------------------------------------------------------------------ his cart */

/** The heap of ore in his bin: a lumpy mound over the rim, broken rock with a few specks of the King's gold. */
function heap(p: p5, c: Pen, light: number, ink: string, load: number, seed: number): void {
  if (load <= 0.02) return
  const k = c.k
  const s = PEER_CART
  const rise = (HEAP_TOP - s.rim) * load
  const top: Pt[] = []
  const n = 9
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const x = -s.rimHalf + 0.05 + (2 * s.rimHalf - 0.1) * u
    // A mound, flat enough on top for him to sit, broken into lumps.
    const m = Math.pow(Math.sin(Math.PI * u), 0.7)
    const lump = (hash(i, seed, 3) - 0.5) * 0.05 * (i === 0 || i === n ? 0 : 1)
    top.push([x, -s.rim - rise * m + lump * load])
  }
  const rock = shade(STONE.mid, light, c.bg)
  p.stroke(ink)
  p.strokeWeight(c.weight * 0.8)
  p.fill(rock)
  poly(p, k, [...top, [s.rimHalf - 0.05, -s.rim + 0.06], [-s.rimHalf + 0.05, -s.rim + 0.06]])
  // Lumps: angular faces, lighter where the light comes from above; never round.
  p.noStroke()
  for (let i = 0; i < 7; i++) {
    const x = -0.36 + 0.72 * hash(i, seed, 7)
    const tu = (x + s.rimHalf) / (2 * s.rimHalf)
    const yTop = -s.rim - rise * Math.pow(Math.sin(Math.PI * tu), 0.7)
    const y = yTop + 0.03 + (-s.rim - yTop) * 0.5 * hash(i, seed, 8)
    const r = 0.035 + 0.035 * hash(i, seed, 9)
    const a = hash(i, seed, 10) * 6
    p.fill(shade(i % 3 === 0 ? STONE.light : STONE.dark, light, c.bg))
    poly(p, k, [0, 1, 2, 3].map((j) => [x + Math.cos(a + j * 1.7) * r, y + Math.sin(a + j * 1.7) * r * 0.75] as Pt))
  }
  // Gold: three specks, angular, catching the light.
  p.fill(mixHex(c.bg, GOLD, 0.25 + 0.75 * light))
  for (let i = 0; i < 3; i++) {
    const x = -0.3 + 0.6 * hash(i, seed, 11)
    const tu = (x + s.rimHalf) / (2 * s.rimHalf)
    const yTop = -s.rim - rise * Math.pow(Math.sin(Math.PI * tu), 0.7)
    const y = yTop + 0.05 + 0.08 * hash(i, seed, 12)
    const r = 0.022
    poly(p, k, [[x - r, y], [x, y - r * 0.8], [x + r * 1.2, y + r * 0.2], [x + r * 0.2, y + r]])
  }
}

/** His ore cart, its middle's feet at (x, y) on the rail. */
export function drawOreCart(p: p5, c: Pen, x: number, y: number, look: CartLook): void {
  const k = c.k
  const s = PEER_CART
  const ink = mixHex(c.bg, c.ink, 0.35 + 0.65 * Math.min(1, look.light))
  p.push()
  p.translate(x * k, y * k)
  p.rotate(look.tilt)
  for (const side of [-1, 1]) wheel(p, c, side * s.wheelX, -s.wheelR, s.wheelR, look.turn, look.light, ink)
  p.translate(0, look.dip * k)
  chassis(p, c, s, look.light, ink)
  // The bin (with its heap) pitches forward about the front bottom corner.
  const tip = look.tip ?? 0
  p.push()
  p.translate(s.bottomHalf * k, -s.bottom * k)
  p.rotate(tip)
  p.translate(-s.bottomHalf * k, s.bottom * k)
  heap(p, c, look.light, ink, look.load ?? 1, 5)
  binSide(p, c, s, look.light, ink, WORKS.wood)
  p.pop()
  p.pop()
}

/* ------------------------------------------------------------------ the trolls' cart */

export interface TrollCartLook extends CartLook {
  lead: TrollAct
  rear: TrollAct
  /** The brake lever's pull (0 on, 1 knocked off). */
  brake: number
  /** The light on the trolls themselves (their heads stand higher than the cart). */
  trollLight: number
}

/** The trolls' cart, with the two miners standing in it (its middle's feet at (x, y) on the rail). */
export function drawTrollCart(p: p5, c: Pen, x: number, y: number, look: TrollCartLook): void {
  const k = c.k
  const s = TROLL_CART
  const light = look.light
  const ink = mixHex(c.bg, c.ink, 0.35 + 0.65 * Math.min(1, light))
  p.push()
  p.translate(x * k, y * k)
  p.rotate(look.tilt)
  for (const side of [-1, 1]) wheel(p, c, side * s.wheelX, -s.wheelR, s.wheelR, look.turn, light, ink)
  p.translate(0, look.dip * k)
  chassis(p, c, s, light, ink)
  // The brake: a long wooden lever at the front corner, its shoe on the front wheel; the lead troll knocks it forward and off.
  const bx = s.bottomHalf - 0.06
  const by = -s.bottom + 0.02
  const ba = -0.28 + 0.95 * look.brake
  const bl = 0.66
  p.stroke(ink)
  p.strokeWeight(c.weight * 2.2)
  p.line(bx * k, by * k, (bx + Math.sin(ba) * bl) * k, (by - Math.cos(ba) * bl) * k)
  p.stroke(shade(WORKS.timber, light, c.bg))
  p.strokeWeight(c.weight * 1.1)
  p.line(bx * k, by * k, (bx + Math.sin(ba) * (bl - 0.02)) * k, (by - Math.cos(ba) * (bl - 0.02)) * k)
  // The miners, standing in the bin: the one behind first. Their feet on the bin's floor, leaning about them.
  const pen: Pen = { k, ink: c.ink, weight: c.weight, bg: c.bg }
  const floor = -s.bottom - 0.04
  const miners: [TrollAct, number, number, number, string][] = [
    [look.rear, -0.36, 1.18, 72, TROLL.hide],
    [look.lead, 0.36, 1.3, 71, TROLL.old],
  ]
  for (const [act, mx, size, seed, hide] of miners) {
    p.push()
    p.translate((mx + act.slide) * k, floor * k)
    p.rotate(act.lean)
    drawTroll(p, pen, 0, 0, {
      size,
      pose: 'stand',
      face: act.face,
      eyes: act.eyes,
      mouth: act.mouth,
      arms: act.arms,
      slump: act.slump,
      seed,
      hide,
      lit: look.trollLight,
      noTail: true,
    })
    p.pop()
  }
  binSide(p, c, s, light, ink, mixHex(WORKS.wood, TROLL.old, 0.35))
  p.pop()
}

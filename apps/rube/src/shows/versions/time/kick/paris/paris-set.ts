import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { bloom } from '../cast'
import { hash } from '../kit'
import { PARIS } from '../worlds'
import { H, R, Y_S } from './paris-geo'
import { fillPaths, line, rect, seen, shape, strokePaths, vwash, type Pen } from './paris-pen'

/**
 * The near street (the set, handed show time; it never moves): a Haussmann block in the sun with the café at its foot
 * (the café's own front, its awning and its window are the part's: they blow), the square beyond it with a plane tree
 * and a lamp, the far roofs of Paris over the square in the haze, and under the street the ground, in section, down
 * past anything the camera sees. Right of the slot is the leaf's: the part draws it wherever it has gone.
 */

type Frame = { x0: number; y0: number; x1: number; y1: number }

/** The café block's run of frontage, and how its floors stand. */
export const BLOCK = { x0: -14.4, x1: 2.9 }
export const GROUND_FLOOR = 2.25
export const FLOOR = 1.3
const FLOORS = 2
export const CORNICE = Y_S - GROUND_FLOOR - FLOOR * FLOORS
const MANSARD = 0.95
export const ROOF = CORNICE - MANSARD
/** Where the café's own front is (the part draws it). */
export const CAFE = { x0: -3.05, x1: 2.55 }

const SKY_WARM = mixHex(PARIS.sky, PARIS.lamp, 0.35)
/** Where the sun is: in the gap the fold opens, a little beyond its curve. */
const SUN: Pt = [H + R * 0.55, Y_S - R * 1.05]
const FAR = mixHex(PARIS.sky, PARIS.slate, 0.2)
const HAZE_STONE = mixHex(PARIS.sky, PARIS.stoneShade, 0.32)
const HAZE_SLATE = mixHex(PARIS.sky, PARIS.slate, 0.28)
const HAZE_WINDOW = mixHex(PARIS.sky, PARIS.slate, 0.4)
const LIME = mixHex(PARIS.stoneShade, PARIS.cobbleDark, 0.45)
const LIME_DEEP = mixHex(PARIS.cobbleDark, PARIS.iron, 0.4)
const LIME_JOINT = mixHex(PARIS.cobbleDark, PARIS.iron, 0.3)
const EARTH_DEEP = mixHex(PARIS.iron, PARIS.crowd, 0.5)
const WINDOW = mixHex(PARIS.glass, PARIS.slate, 0.42)
const WINDOW_DARK = mixHex(PARIS.slate, PARIS.cafe, 0.45)
const LEAF = mixHex(PARIS.awning, PARIS.stoneShade, 0.28)
const LEAF_DARK = mixHex(PARIS.awning, PARIS.iron, 0.4)

export function drawParisSet(p: p5, k: number, t: number, ink: string, w: number, f: Frame): void {
  const pen: Pen = { p, k, ink, w }
  p.push()
  // The air: warm low over the street, clearer higher up (and the same below: the dream has nothing under it).
  vwash(pen, f.x0 - 1, f.x1 + 1, Math.min(f.y0, -30) - 1, Y_S, [
    [0, PARIS.skyHigh, 0.55],
    [0.62, PARIS.sky, 0],
    [1, SKY_WARM, 0.5],
  ])
  if (f.y1 > Y_S) vwash(pen, f.x0 - 1, f.x1 + 1, Y_S, Math.max(f.y1, Y_S + 12) + 1, [[0, SKY_WARM, 0.35], [1, PARIS.skyHigh, 0.45]])
  // The sun, low in the fold's gap: once the street is over, it shines between the two halves of Paris.
  bloom(p, k, SUN, 7.5, PARIS.lamp, 0.34)
  bloom(p, k, SUN, 3.2, PARIS.lamp, 0.18)
  if (seen(f, -40, Y_S - 6, H + 1, Y_S)) skyline(pen, f)
  if (seen(f, -30, ROOF - 1, BLOCK.x0, Y_S)) plainBlock(pen, -26, BLOCK.x0, f)
  if (seen(f, BLOCK.x0, ROOF - 1, BLOCK.x1 + 0.3, Y_S)) cafeBlock(pen, f)
  if (seen(f, BLOCK.x1, Y_S - 5, H, Y_S)) square(pen, t, f)
  ground(pen, f)
  p.pop()
}

/* ------------------------------------------------------------------ far roofs */

/** Roofs and chimneys far off over the square, in the haze (the same far city the bridge's side has), and a dome. */
function skyline(pen: Pen, f: Frame): void {
  // A dome over the roofs, far off beyond the square.
  if (seen(f, 4.2, Y_S - 6, 7.8, Y_S)) {
    const c: Pt = [6.0, Y_S - 4.1]
    const dome: Pt[] = [[c[0] - 1.25, Y_S - 3.3], [c[0] - 1.05, c[1] + 0.6], [c[0] - 0.9, c[1] + 0.6]]
    for (let a = Math.PI; a <= 2 * Math.PI + 1e-6; a += Math.PI / 14) dome.push([c[0] + 0.9 * Math.cos(a), c[1] + 0.6 + 1.05 * Math.sin(a)])
    dome.push([c[0] + 0.9, c[1] + 0.6], [c[0] + 1.05, c[1] + 0.6], [c[0] + 1.25, Y_S - 3.3], [c[0] + 1.25, Y_S], [c[0] - 1.25, Y_S])
    shape(pen, dome, FAR, 0)
    rect(pen, c[0] - 0.14, c[1] - 0.75, c[0] + 0.14, c[1] - 0.35, FAR, 0)
    rect(pen, c[0] - 0.04, c[1] - 1.1, c[0] + 0.04, c[1] - 0.72, FAR, 0)
  }
  // The city in front of it.
  hazeCity(pen, Math.max(-30, Math.floor(f.x0) - 3), Math.min(H + 2.6, f.x1 + 2), -30, 7, 3.6)
}

/**
 * A far city in the haze, from `x0` to `x1` (stepped from `from`, so it does not slide as the frame moves): blocks of
 * pale stone under mansards of pale slate, their windows in rows, chimneys along the ridges; all of it gone toward the
 * sky's colour with distance. The near street's (over the square) and the bridge's (across the river) are the same city.
 */
export function hazeCity(pen: Pen, x0: number, x1: number, from: number, seed: number, tall: number): void {
  if (x1 <= x0) return
  const facades: Pt[][] = []
  const roofs: Pt[][] = []
  const wins: Pt[][] = []
  let x = from
  let i = 0
  while (x < x1) {
    const wd = 1.6 + 1.9 * hash(i, seed)
    if (x + wd > x0) {
      const eave = Y_S - (tall - 1.3) * (0.55 + 0.45 * hash(i, seed + 1))
      const top = eave - 0.45
      facades.push([[x, Y_S], [x, eave], [x + wd, eave], [x + wd, Y_S]])
      const roof: Pt[] = [[x - 0.04, eave], [x + 0.16, top]]
      for (let c = 0; c < 2; c++) {
        if (hash(i, seed + 2 + c) < 0.45) continue
        const cx = x + 0.4 + (wd - 0.9) * (c ? 0.75 : 0.3)
        roof.push([cx, top], [cx, top - 0.22], [cx + 0.2, top - 0.22], [cx + 0.2, top])
      }
      roof.push([x + wd - 0.16, top], [x + wd + 0.04, eave])
      roofs.push(roof)
      for (let y = eave + 0.3; y < Y_S - 0.35; y += 0.55) for (let wx = x + 0.25; wx < x + wd - 0.2; wx += 0.42) wins.push([[wx, y], [wx + 0.16, y], [wx + 0.16, y + 0.28], [wx, y + 0.28]])
    }
    x += wd
    i++
  }
  fillPaths(pen, facades, HAZE_STONE)
  fillPaths(pen, wins, HAZE_WINDOW)
  fillPaths(pen, roofs, HAZE_SLATE)
}

/* ------------------------------------------------------------------ the buildings */

/** Tall French windows on a floor: a stone surround, dark glass with the sky in its upper panes. */
function windowsOn(pen: Pen, x0: number, x1: number, floorTop: number, h: number, step: number, f: Frame, shutters = false): void {
  const glass: Pt[][] = []
  const shine: Pt[][] = []
  const shade: Pt[][] = []
  const frames: Pt[][] = []
  for (let x = x0 + step / 2; x < x1 - 0.2; x += step) {
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const ww = 0.42
    const top = floorTop + 0.22
    const bot = top + h
    glass.push([[x - ww / 2, top], [x + ww / 2, top], [x + ww / 2, bot], [x - ww / 2, bot]])
    shine.push([[x - ww / 2, top], [x + ww / 2, top], [x + ww / 2, top + h * 0.38], [x - ww / 2, top + h * 0.5]])
    // The reveal's shade on the left, where the sun from the right does not reach.
    shade.push([[x - ww / 2, top], [x - ww / 2 + 0.06, top], [x - ww / 2 + 0.06, bot], [x - ww / 2, bot]])
    // The mullion and the transom.
    frames.push([[x, top], [x, bot]], [[x - ww / 2, top + h * 0.3], [x + ww / 2, top + h * 0.3]])
    // A moulded lintel.
    shade.push([[x - ww / 2 - 0.07, top - 0.1], [x + ww / 2 + 0.07, top - 0.1], [x + ww / 2 + 0.07, top - 0.05], [x - ww / 2 - 0.07, top - 0.05]])
    if (shutters) {
      shade.push([[x - ww / 2 - 0.2, top], [x - ww / 2 - 0.02, top], [x - ww / 2 - 0.02, bot], [x - ww / 2 - 0.2, bot]])
    }
  }
  fillPaths(pen, glass, WINDOW_DARK)
  fillPaths(pen, shine, WINDOW, 0.9)
  fillPaths(pen, shade, PARIS.stoneShade)
  strokePaths(pen, frames, PARIS.stoneShade, 0.45)
}

/** An iron balcony along a floor: a rail, a bottom bar, and its balusters. */
function balcony(pen: Pen, x0: number, x1: number, y: number, f: Frame): void {
  const a = Math.max(x0, f.x0 - 1)
  const b = Math.min(x1, f.x1 + 1)
  if (b <= a) return
  rect(pen, a, y - 0.04, b, y + 0.05, PARIS.stoneShade, 0)
  line(pen, [a, y - 0.42], [b, y - 0.42], PARIS.iron, 0.9)
  line(pen, [a, y - 0.06], [b, y - 0.06], PARIS.iron, 0.6)
  const bars: Pt[][] = []
  for (let x = Math.ceil(a / 0.14) * 0.14; x < b; x += 0.14) bars.push([[x, y - 0.42], [x, y - 0.06]])
  strokePaths(pen, bars, PARIS.iron, 0.32, 0.8)
}

/** A mansard of slate over a cornice, with dormers and chimneys. */
function roof(pen: Pen, x0: number, x1: number, cornice: number, f: Frame, seed: number, mh = MANSARD, stacksScale = 1): void {
  const top = cornice - mh
  const ds = Math.min(1, mh / MANSARD)
  // The cornice: a projecting band of stone, its underside in shade.
  rect(pen, x0 - 0.12, cornice - 0.08, x1 + 0.12, cornice + 0.06, PARIS.stone, 0.5)
  rect(pen, x0 - 0.1, cornice + 0.06, x1 + 0.1, cornice + 0.14, PARIS.stoneShade, 0)
  // The mansard's steep slope, and the zinc ridge.
  shape(pen, [[x0 - 0.05, cornice - 0.08], [x1 + 0.05, cornice - 0.08], [x1 - 0.12, top + 0.1], [x0 + 0.12, top + 0.1]], PARIS.slate, 0.6)
  rect(pen, x0 + 0.1, top, x1 - 0.1, top + 0.12, PARIS.zinc, 0.5)
  // Dormers.
  const dormers: Pt[][] = []
  const glass: Pt[][] = []
  for (let x = x0 + 0.85; x < x1 - 0.5; x += 2.3) {
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    dormers.push([[x - 0.26 * ds, cornice - 0.1], [x - 0.26 * ds, cornice - 0.62 * ds], [x, cornice - 0.8 * ds], [x + 0.26 * ds, cornice - 0.62 * ds], [x + 0.26 * ds, cornice - 0.1]])
    glass.push([[x - 0.14 * ds, cornice - 0.14], [x - 0.14 * ds, cornice - 0.55 * ds], [x + 0.14 * ds, cornice - 0.55 * ds], [x + 0.14 * ds, cornice - 0.14]])
  }
  fillPaths(pen, dormers, PARIS.stone)
  strokePaths(pen, dormers.map((d) => [...d, d[0]]), pen.ink, 0.45)
  fillPaths(pen, glass, WINDOW_DARK)
  // Chimney stacks on the ridge, with their pots.
  const stacks: Pt[][] = []
  const pots: Pt[][] = []
  for (let x = x0 + 1.4; x < x1 - 0.4; x += 3.1) {
    if (x < f.x0 - 1 || x > f.x1 + 1) continue
    const wd = 0.5 + 0.35 * hash(Math.round(x * 10), seed)
    const ht = (0.32 + 0.12 * hash(Math.round(x * 10), seed + 1)) * stacksScale
    stacks.push([[x - wd / 2, top + 0.02], [x - wd / 2, top - ht], [x + wd / 2, top - ht], [x + wd / 2, top + 0.02]])
    for (let px = x - wd / 2 + 0.1; px < x + wd / 2 - 0.05; px += 0.16) pots.push([[px - 0.04, top - ht], [px - 0.035, top - ht - 0.13 * stacksScale], [px + 0.035, top - ht - 0.13 * stacksScale], [px + 0.04, top - ht]])
  }
  fillPaths(pen, stacks, PARIS.stoneShade)
  strokePaths(pen, stacks, pen.ink, 0.45)
  fillPaths(pen, pots, mixHex(PARIS.stoneShade, PARIS.cafe, 0.3))
}

/**
 * A Haussmann front at full strength on its own street (the bridge's far quai uses it: its buildings ride the fold up
 * and over): rusticated shops at the foot under a string course, floors of French windows with iron balconies on the
 * first and the top, a cornice, a slate mansard with dormers and chimneys. Heights in cells; it stands on `Y_S`.
 */
export function facadeBlock(pen: Pen, x0: number, x1: number, base: number, ground: number, floors: number, floorH: number, mh: number, f: Frame, seed: number, stacks = 1): void {
  const gf = base - ground
  const cornice = gf - floors * floorH
  if (!seen(f, x0 - 0.3, cornice - mh - 0.6, x1 + 0.3, base)) return
  rect(pen, x0, cornice, x1, base, PARIS.stone, 0.7)
  const joints: Pt[][] = []
  for (let y = base - 0.33; y > gf + 0.1; y -= 0.33) joints.push([[x0, y], [x1, y]])
  strokePaths(pen, joints, PARIS.stoneShade, 0.35)
  rect(pen, x0, gf - 0.08, x1, gf + 0.04, PARIS.stoneShade, 0.4)
  // Its shops, and a carriage door.
  let i = 0
  for (let x = x0 + 0.3; x < x1 - 1.2; x += 2.25, i++) {
    const b = Math.min(x + 1.75, x1 - 0.3)
    if (hash(i, seed + 5) > 0.72) {
      const c = (x + b) / 2
      const door: Pt[] = [[c - 0.55, base], [c - 0.55, gf + 0.55]]
      for (let a = Math.PI; a <= 2 * Math.PI + 1e-6; a += Math.PI / 10) door.push([c + 0.55 * Math.cos(a), gf + 0.55 + 0.35 * Math.sin(a)])
      door.push([c + 0.55, base])
      shape(pen, door, PARIS.cafe, 0.6)
      continue
    }
    rect(pen, x, gf + 0.3, b, base, PARIS.cafe, 0.6)
    rect(pen, x + 0.12, gf + 0.44, b - 0.12, base - 0.3, WINDOW, 0)
    rect(pen, x + 0.18, gf + 0.08, b - 0.18, gf + 0.25, mixHex(PARIS.cafe, PARIS.stone, 0.18), 0.4)
  }
  for (let k = 0; k < floors; k++) {
    const floorTop = gf - floorH * (k + 1)
    windowsOn(pen, x0, x1, floorTop, floorH - 0.42, 1.15, f)
    if (k === 0 || k === floors - 1) balcony(pen, x0 + 0.1, x1 - 0.1, floorTop + floorH - 0.02, f)
  }
  // Its end walls in shade.
  rect(pen, x0 - 0.06, cornice, x0 + 0.08, base, PARIS.stoneShade, 0)
  rect(pen, x1 - 0.08, cornice, x1 + 0.06, base, PARIS.stoneShade, 0)
  roof(pen, x0, x1, cornice, f, seed, mh, stacks)
}

/** The block left of the café's: plainer, a floor lower. */
function plainBlock(pen: Pen, x0: number, x1: number, f: Frame): void {
  const cornice = Y_S - GROUND_FLOOR - FLOOR * FLOORS + 0.2
  rect(pen, x0, cornice, x1, Y_S, mixHex(PARIS.stone, PARIS.stoneShade, 0.25), 0.7)
  for (let i = 0; i < FLOORS; i++) windowsOn(pen, x0, x1, Y_S - GROUND_FLOOR - FLOOR * (i + 1) + 0.1 * (i + 1), 0.78, 1.2, f, true)
  // Shopfronts at its foot: dark, their glass catching the street.
  for (let x = x0 + 0.6; x < x1 - 1; x += 2.6) {
    if (x > f.x1 + 1 || x + 2 < f.x0 - 1) continue
    rect(pen, x, Y_S - 1.75, x + 1.9, Y_S, PARIS.cafe, 0.6)
    rect(pen, x + 0.12, Y_S - 1.6, x + 1.78, Y_S - 0.35, WINDOW, 0)
  }
  roof(pen, x0, x1, cornice, f, 3)
}

/** The café's block: rusticated stone at the foot, three floors of French windows, balconies, the mansard. */
function cafeBlock(pen: Pen, f: Frame): void {
  const { x0, x1 } = BLOCK
  const gf = Y_S - GROUND_FLOOR
  // The facade.
  rect(pen, x0, CORNICE, x1, Y_S, PARIS.stone, 0.7)
  // The ground floor's rustication: long horizontal joints.
  const joints: Pt[][] = []
  for (let y = Y_S - 0.35; y > gf + 0.1; y -= 0.34) joints.push([[Math.max(x0, f.x0 - 1), y], [Math.min(x1, f.x1 + 1), y]])
  strokePaths(pen, joints, PARIS.stoneShade, 0.35)
  // The string course over the shops.
  rect(pen, x0, gf - 0.1, x1, gf + 0.04, PARIS.stoneShade, 0.4)
  // The shops: the porte-cochère, a shop, the épicerie; the café's front is the part's.
  const porte: Pt[] = [[-13.75, Y_S], [-13.75, gf + 0.55]]
  for (let a = Math.PI; a <= 2 * Math.PI + 1e-6; a += Math.PI / 12) porte.push([-12.6 + 1.15 * Math.cos(a), gf + 0.55 + 0.5 * Math.sin(a)])
  porte.push([-11.45, Y_S])
  shape(pen, porte, PARIS.cafe, 0.6)
  line(pen, [-12.6, gf + 0.1], [-12.6, Y_S], mixHex(PARIS.cafe, PARIS.stone, 0.25), 0.45)
  for (const [a, b] of [[-10.8, -7.3], [-6.7, -3.55]]) {
    rect(pen, a, gf + 0.32, b, Y_S, PARIS.cafe, 0.6)
    rect(pen, a + 0.14, gf + 0.48, b - 0.14, Y_S - 0.38, WINDOW, 0)
    // A blank signboard over it, the sun on it.
    rect(pen, a + 0.2, gf + 0.08, b - 0.2, gf + 0.28, mixHex(PARIS.cafe, PARIS.stone, 0.18), 0.4)
  }
  // Three floors: balconies on the first and the third.
  for (let i = 0; i < FLOORS; i++) {
    const floorTop = gf - FLOOR * (i + 1)
    windowsOn(pen, x0, x1, floorTop, i === 0 ? 0.92 : 0.84, 1.15, f)
    balcony(pen, x0 + 0.1, x1 - 0.1, floorTop + FLOOR - 0.02, f)
  }
  // The block's end wall toward the square, in shade (the sun is on the front), its flues up it.
  rect(pen, x1 - 0.08, CORNICE - 0.1, x1 + 0.22, Y_S, PARIS.stoneShade, 0.5)
  roof(pen, x0, x1, CORNICE, f, 9)
}

/* ------------------------------------------------------------------ the square */

/** The plane tree and the lamp on the square (the kiosk and the lever are the part's). */
export const TREE_X = 5.35
function square(pen: Pen, t: number, f: Frame): void {
  // The plane tree: a trunk and a crown of soft masses, stirring a little.
  if (seen(f, TREE_X - 2.2, Y_S - 4.4, TREE_X + 2.2, Y_S)) {
    const sway = 0.03 * Math.sin(t * 0.9) + 0.015 * Math.sin(t * 2.3)
    shape(pen, [[TREE_X - 0.12, Y_S], [TREE_X - 0.08, Y_S - 1.9], [TREE_X + 0.1, Y_S - 1.9], [TREE_X + 0.14, Y_S]], mixHex(PARIS.stoneShade, PARIS.cafe, 0.35), 0.6)
    shape(pen, [[TREE_X - 0.05, Y_S - 1.8], [TREE_X - 0.6, Y_S - 2.5], [TREE_X - 0.5, Y_S - 2.55], [TREE_X + 0.02, Y_S - 1.95]], mixHex(PARIS.stoneShade, PARIS.cafe, 0.35), 0.5)
    const blobs: [number, number, number][] = [
      [-0.4, -3.3, 1.0],
      [0.6, -3.15, 0.95],
      [1.25, -2.55, 0.75],
      [0.1, -2.45, 0.9],
      [-0.9, -3.4, 0.7],
      [0.45, -3.85, 0.7],
    ]
    const ctx = pen.p.drawingContext as CanvasRenderingContext2D
    const { k } = pen
    for (const [col, dx, dy] of [[LEAF_DARK, 0.05, 0.08], [LEAF, 0, 0]] as const) {
      ctx.save()
      ctx.fillStyle = col
      ctx.beginPath()
      for (const [bx, by, r] of blobs) {
        const x = TREE_X + bx + sway * (-by) + dx
        const y = Y_S + by + dy
        ctx.moveTo((x + r) * k, y * k)
        ctx.ellipse(x * k, y * k, r * k, r * 0.8 * k, 0, 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.restore()
    }
    // The sun through the leaves: a few lighter patches on the crown's top.
    const lit = mixHex(LEAF, PARIS.lamp, 0.35)
    ctx.save()
    ctx.fillStyle = lit
    ctx.beginPath()
    for (const [bx, by, r] of blobs.slice(0, 3)) {
      const x = TREE_X + bx + sway * (-by) + r * 0.25
      const y = Y_S + by - r * 0.35
      ctx.moveTo((x + r * 0.45) * k, y * k)
      ctx.ellipse(x * k, y * k, r * 0.45 * k, r * 0.3 * k, 0, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.restore()
  }
}

/** A Paris street lamp standing on `y`: a fluted post, a crossbar, a four-sided lantern. */
export function lampPost(pen: Pen, x: number, y: number): void {
  shape(pen, [[x - 0.1, y], [x - 0.05, y - 0.3], [x - 0.035, y - 2.0], [x + 0.035, y - 2.0], [x + 0.05, y - 0.3], [x + 0.1, y]], PARIS.iron, 0.6)
  line(pen, [x - 0.12, y - 1.72], [x + 0.12, y - 1.72], PARIS.iron, 0.6)
  shape(pen, [[x - 0.11, y - 2.0], [x + 0.11, y - 2.0], [x + 0.14, y - 2.32], [x - 0.14, y - 2.32]], mixHex(PARIS.glass, PARIS.lamp, 0.2), 0.6)
  shape(pen, [[x - 0.17, y - 2.32], [x + 0.17, y - 2.32], [x, y - 2.46]], PARIS.iron, 0.6)
}

/* ------------------------------------------------------------------ the ground */

/**
 * The pavement's edge and the ground under it in section, as far down as the frame looks: the kerb, and the city's
 * limestone in courses of dressed blocks, warm under the street and darkening down; it ends at the quai's wall.
 */
function ground(pen: Pen, f: Frame): void {
  if (f.y1 < Y_S - 0.2) return
  const x0 = Math.max(-40, f.x0 - 1)
  const x1 = H + 0.2
  if (x1 <= x0) return
  const bottom = Math.min(Y_S + 40, f.y1 + 1)
  rect(pen, x0, Y_S, x1, bottom, LIME, 0)
  vwash(pen, x0, x1, Y_S + 0.2, Math.min(bottom, Y_S + 7), [[0, LIME, 0], [0.5, LIME_DEEP, 0.55], [1, EARTH_DEEP, 0.95]])
  if (bottom > Y_S + 7) rect(pen, x0, Y_S + 7, x1, bottom, EARTH_DEEP, 0)
  // Courses of dressed stone, their joints staggered.
  const joints: Pt[][] = []
  let row = 0
  for (let y = Y_S + 0.32; y < Math.min(bottom, Y_S + 6); y += 0.34, row++) {
    joints.push([[x0, y], [x1, y]])
    const off = row % 2 ? 0.45 : 0
    for (let x = Math.floor((x0 - off) / 0.9) * 0.9 + off; x < x1; x += 0.9) if (x > x0) joints.push([[x, y], [x, y + 0.34]])
  }
  strokePaths(pen, joints, LIME_JOINT, 0.35, 0.6)
  // The kerb along the top, in the sun.
  rect(pen, x0, Y_S, x1, Y_S + 0.12, PARIS.cobble, 0)
  rect(pen, x0, Y_S + 0.12, x1, Y_S + 0.2, PARIS.cobbleDark, 0)
  line(pen, [x0, Y_S], [x1, Y_S], pen.ink, 0.8)
}

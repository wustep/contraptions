import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, frame, scenery, smooth } from '../kit'
import { CUT } from '../music'
import { CLINIC, HOME, INK } from '../worlds'

/**
 * The clinic (the set; the clinic builder's): two cold rooms far apart along one corridor of the clinic's cells, the
 * doctor's office (73.456 to 84.376) and the hospital room (180.413 to 189.452). Both are cut open like the house's
 * inside, a section: the far wall, the floor and the ceiling in section, nothing in front. We sit where the doctor
 * sits: the two of them face us.
 *
 * The machine here is light and time. In the office the sun comes through blinds in a window we never see (in the
 * wall to the left, behind the camera's shoulder) and lays its bars across the far wall and over the two of them;
 * through the held note the bars slide away from them, first off him, then off her, and a cloud takes what is left.
 * In the hospital the window is behind them and the day goes down in it; a lamp comes on.
 *
 * This file draws the rooms (walls, floors, the door, the coat on its stand, the window and its sky) at show time,
 * and holds what both parts share: where the rooms are, the chair, the light's schedules. The parts draw their own
 * furniture and the light that falls over the two of them.
 *
 * Coordinates: each room is drawn from its own origin, which is where Carl sits (his centre), so the parts and the set
 * agree by construction. A sitter's centre is 0.65 over the floor, like the armchairs at home (`CHAIR.sit`).
 */

/* ------------------------------------------------------------------ the rooms */

/** The floor under a sitter (the chair's feet), the seat's top (a sitter's bottom), the ceiling's underside. */
export const FLOOR = 0.65
export const SEAT = R
export const CEIL = -2.62
/** The line where the wall's darker lower paint meets the pale upper: an institution's two tones. */
export const DADO = -0.78

const TAU = Math.PI * 2
/**
 * The x nearest `x` at which a ball rolled there has its dot turned to `a` (radians, clockwise from the right on the
 * screen: -π/2 is up). The cast turns Ellie by where she is (`x / R`), so where she sits sets where she looks.
 */
export const facing = (x: number, a: number): number => (a + TAU * Math.round((x / R - a) / TAU)) * R

/** In the office she sits 0.62 to his right (`CUTS.doctor`), her dot turned a little up and away from him: listening. */
export const OFFICE_APART = 0.62
/** Carl's seat in the office, in the clinic's cells: the office's origin. */
export const OFFICE: Pt = [facing(0.12, -0.62) - OFFICE_APART, 0]
/** In the hospital she lies 0.45 to his right (`CUTS.hospital`), her dot turned up, at the ceiling. */
export const WARD_APART = 0.45
/** Carl's seat at her bedside, in the clinic's cells: the hospital room's origin. Far along the corridor. */
export const WARD: Pt = [facing(40, -1.5) - WARD_APART, 0]

/** Each room's walls, from its origin: never in any shot, so the camera never sees past them. */
const OFFICE_WALLS: Pt = [-6.4, 4.9]
const WARD_WALLS: Pt = [-5.4, 5.4]

/**
 * The office door, shut, on the far wall just left of his chair, hung on its right: at the cut to the yard it becomes
 * the back door, open, beside him, with her out beyond it. [x0, x1] and its head.
 */
export const DOOR = { x0: -1.34, x1: -0.44, top: -1.68 }
/** The coat stand, to her right: the doctor's white coat on it, the one thing in the room that says whose room it is. */
export const STAND = 1.95
/** The hospital room's window, on the far wall behind the lamp: [x0, x1, y0, y1]. */
export const WINDOW = { x0: -2.55, x1: -0.98, y0: -2.25, y1: -0.9 }

/** The cells the set claims, [x0, y0, x1, y1] from the clinic's origin: both rooms. */
export const CLINIC_BOX: [number, number, number, number] = [
  Math.floor(OFFICE[0] + OFFICE_WALLS[0]) - 1,
  -4,
  Math.ceil(WARD[0] + WARD_WALLS[1]) + 1,
  3,
]

/* ------------------------------------------------------------------ the light's clocks (show seconds) */

/** The office's clock: the cut in (the music box has stopped), and the cut out (the piano alone, the yard). */
export const D_IN = CUT.doctor
export const D_OUT = CUT.yard
/** The hospital's: the cut in, and the cut to the church. */
export const W_IN = CUT.hospital
export const W_OUT = CUT.funeral

/**
 * The office's bars of sun: the stack of slits' images on the far wall, from the blinds in the wall on the left. A
 * horizontal slit in a wall square to this one lands as a band slanting down to the right, so the image is a stack
 * of slanting bars between two upright edges (where the window's jambs land). The sun moves: the stack slides to the
 * right at a quarter of a cell a second, off Carl by 79.3 and off Ellie as she sinks (81.1), and a cloud takes it
 * from 81.5. Office cells (from Carl's seat).
 */
export interface Bars {
  /** The stack's left and right edges. */
  x0: number
  x1: number
  /** Where the top bar meets the left edge; each bar falls `slope` a cell to the right; bars `pitch` apart, `lit` thick. */
  top: number
  slope: number
  pitch: number
  lit: number
  n: number
  /** How bright, 0..1. */
  a: number
}

export function officeBars(T: number): Bars {
  const u = Math.max(-2, Math.min(D_OUT, T) - D_IN)
  const x0 = -1.32 + 0.25 * u
  return {
    x0,
    x1: x0 + 2.55,
    top: -1.58 + 0.018 * u,
    slope: 0.4 + 0.006 * u,
    pitch: 0.215,
    lit: 0.118,
    n: 10,
    a: 1 - smooth(T, 81.5, 83.9),
  }
}

/** How cold the office has gone once the sun is gone, 0..1. */
export const officeCold = (T: number): number => smooth(T, 81.3, 84.2)

/**
 * The hospital window's sky, and the room's light, at show time `T`: the sun is down behind the town as the cut comes
 * in; its gold goes to rose, to violet, to night over the nine seconds.
 */
export interface Dusk {
  top: string
  mid: string
  low: string
  /** The window's warm spill on the wall round it, 0..1. */
  spill: number
  /** How far the room has darkened, 0..1. */
  dim: number
}

const SKY_KEYS: [number, string, string, string][] = [
  [W_IN - 0.5, mixHex(HOME.sky, HOME.night, 0.12), HOME.dusk, HOME.lamp],
  [183.4, mixHex(HOME.sky, HOME.night, 0.42), mixHex(HOME.dusk, HOME.pink, 0.55), mixHex(HOME.dusk, HOME.lamp, 0.35)],
  [186.4, mixHex(HOME.night, HOME.sky, 0.18), mixHex(HOME.pink, HOME.night, 0.52), mixHex(HOME.dusk, HOME.night, 0.35)],
  [W_OUT, HOME.night, mixHex(HOME.night, HOME.sky, 0.22), mixHex(HOME.night, HOME.dusk, 0.3)],
]

export function wardDusk(T: number): Dusk {
  let i = 0
  while (i + 1 < SKY_KEYS.length && T > SKY_KEYS[i + 1][0]) i++
  const a = SKY_KEYS[i]
  const b = SKY_KEYS[Math.min(i + 1, SKY_KEYS.length - 1)]
  const u = a === b ? 0 : Math.max(0, Math.min(1, (T - a[0]) / (b[0] - a[0])))
  const e = u * u * (3 - 2 * u)
  return {
    top: mixHex(a[1], b[1], e),
    mid: mixHex(a[2], b[2], e),
    low: mixHex(a[3], b[3], e),
    spill: 1 - smooth(T, 180.9, 187.6),
    dim: smooth(T, 180.9, 188.8),
  }
}

/**
 * Where Carl's centre goes when he tips `tilt` radians (clockwise, the cast's sense) over the bottom corner on that
 * side, as a sitter leans: from his seat. The cast turns him about his centre, so the lane carries this.
 */
export function lean(tilt: number): Pt {
  const h = R
  const a = Math.abs(tilt)
  const s = Math.sign(tilt)
  return [s * h * (1 - Math.cos(a) + Math.sin(a)), h * (1 - Math.sin(a) - Math.cos(a))]
}

/* ------------------------------------------------------------------ drawing helpers (cells; the caller has translated to the room's origin) */

/** `#rrggbb` with an alpha, for the canvas's own gradients. */
export function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/** A steel tube from (x0, y0) to (x1, y1): an ink line with the steel inside it. */
export function tube(p: p5, k: number, weight: number, x0: number, y0: number, x1: number, y1: number, thick = 1, steel = CLINIC.steel): void {
  p.stroke(INK)
  p.strokeWeight(weight * 1.9 * thick)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  p.stroke(steel)
  p.strokeWeight(weight * 1.0 * thick)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
}

/**
 * A visitor's chair, the clinic's one kind, facing us: a vinyl seat and a back panel on a bent steel tube. Its centre
 * at `x`; a sitter's bottom on the seat's top (y = SEAT), its feet on the floor. `dent` presses the seat's top down
 * under a sitter at `dentX` (she sinks into it).
 */
/**
 * How a visitor's chair looks: the office's (a slate-teal vinyl, its back panel over the sitter's shoulders), or the
 * ward's, `low`: a warm brown vinyl and a back that stops below the sitter's top edge, so the old grey Carl in it
 * stands clear of it against the pale wall instead of reading as part of the chair.
 */
export interface ChairLook {
  low?: boolean
}

export function drawVisitorChair(p: p5, k: number, weight: number, x: number, dent = 0, dentX = x, look: ChairLook = {}): void {
  // A slate-teal vinyl, darker than either of them, so both read against it; in the ward, a warm mid brown.
  const vinyl = look.low ? mixHex(mixHex(HOME.woodDark, HOME.wood, 0.3), CLINIC.chair, 0.2) : mixHex(mixHex(CLINIC.chair, HOME.leaf, 0.22), INK, 0.3)
  const back = mixHex(vinyl, INK, 0.12)
  // The back panel's top and bottom: behind the sitter's shoulders, or (low) behind his middle, under his top edge.
  const [b0, b1] = look.low ? [-0.05, 0.1] : [-0.47, -0.1]
  p.push()
  p.translate(x * k, 0)
  // The back: two uprights from behind the seat to the panel, and the panel.
  const up = look.low ? (b0 + b1) / 2 : -0.2
  tube(p, k, weight, -0.15, SEAT + 0.02, -0.15, up)
  tube(p, k, weight, 0.15, SEAT + 0.02, 0.15, up)
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(back)
  p.rectMode(p.CORNER)
  p.rect(-0.2 * k, b0 * k, 0.4 * k, (b1 - b0) * k, Math.min(0.07, (b1 - b0) * 0.35) * k)
  // A stitched seam across the panel, near its top: vinyl, not wood.
  p.stroke(alpha(p, CLINIC.light, 0.18))
  p.strokeWeight(weight * 0.45)
  p.line(-0.14 * k, (b0 + 0.08) * k, 0.14 * k, (b0 + 0.08) * k)
  // The legs: one bent tube each side, splaying a little to the floor, a stretcher between.
  tube(p, k, weight, -0.19, SEAT + 0.07, -0.215, FLOOR - 0.02)
  tube(p, k, weight, 0.19, SEAT + 0.07, 0.215, FLOOR - 0.02)
  tube(p, k, weight, -0.2, 0.5, 0.2, 0.5, 0.7)
  // Glides under the feet.
  p.noStroke()
  p.fill(INK)
  p.rect(-0.25 * k, (FLOOR - 0.03) * k, 0.07 * k, 0.03 * k, 0.01 * k)
  p.rect(0.18 * k, (FLOOR - 0.03) * k, 0.07 * k, 0.03 * k, 0.01 * k)
  // The seat: a cushion, its top pressed where someone sinks into it.
  const w = 0.235
  const top = (sx: number): number => {
    const d = (sx - (dentX - x)) / 0.16
    return SEAT - 0.004 + dent * Math.exp(-d * d)
  }
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.fill(vinyl)
  p.beginShape()
  p.vertex(-w * k, (SEAT + 0.03) * k)
  for (let i = 0; i <= 16; i++) {
    const sx = -w + 0.03 + ((2 * w - 0.06) * i) / 16
    p.vertex(sx * k, top(sx) * k)
  }
  p.vertex(w * k, (SEAT + 0.03) * k)
  p.bezierVertex(w * k, (SEAT + 0.09) * k, (w - 0.01) * k, (SEAT + 0.1) * k, (w - 0.04) * k, (SEAT + 0.1) * k)
  p.vertex((-w + 0.04) * k, (SEAT + 0.1) * k)
  p.bezierVertex((-w + 0.01) * k, (SEAT + 0.1) * k, -w * k, (SEAT + 0.09) * k, -w * k, (SEAT + 0.03) * k)
  p.endShape(p.CLOSE)
  // The cushion's welt: a light line along its front edge.
  p.stroke(alpha(p, CLINIC.light, 0.28))
  p.strokeWeight(weight * 0.5)
  p.line((-w + 0.05) * k, (SEAT + 0.065) * k, (w - 0.05) * k, (SEAT + 0.065) * k)
  p.pop()
}

/** The room itself: the far wall in two tones, its rail and skirting, the floor and the ceiling in section, and the walls at its ends. */
function shell(p: p5, k: number, weight: number, walls: Pt, f: { x0: number; x1: number; y0: number; y1: number }, cold: number): void {
  const X0 = Math.max(f.x0, walls[0] - 0.4)
  const X1 = Math.min(f.x1, walls[1] + 0.4)
  if (X1 <= X0) return
  const Y0 = f.y0
  const Y1 = f.y1
  const upper = mixHex(CLINIC.wall, CLINIC.steel, 0.1 + 0.18 * cold)
  const lower = mixHex(mixHex(CLINIC.wall, CLINIC.steel, 0.4), HOME.leaf, 0.08 + 0.1 * cold)
  const section = mixHex(CLINIC.steel, INK, 0.66)
  const beyond = mixHex(CLINIC.floor, CLINIC.steel, 0.5)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  const band = (y0: number, y1: number, fill: string, x0 = X0, x1 = X1) => {
    const a = Math.max(y0, Y0)
    const b = Math.min(y1, Y1)
    if (b <= a || x1 <= x0) return
    p.fill(fill)
    p.rect(x0 * k, a * k, (x1 - x0) * k, (b - a) * k)
  }
  const inside0 = Math.max(X0, walls[0])
  const inside1 = Math.min(X1, walls[1])
  // Round the room: the building, cut through.
  band(Y0, CEIL - 0.3, beyond)
  band(FLOOR + 0.36, Y1, beyond)
  band(CEIL - 0.3, CEIL, section)
  band(FLOOR + 0.06, FLOOR + 0.36, section)
  if (X0 < walls[0]) band(CEIL - 0.3, FLOOR + 0.36, section, X0, Math.min(X1, walls[0]))
  if (X1 > walls[1]) band(CEIL - 0.3, FLOOR + 0.36, section, Math.max(X0, walls[1]), X1)
  // The far wall.
  band(CEIL, DADO, upper, inside0, inside1)
  band(DADO, FLOOR, lower, inside0, inside1)
  // The floor's linoleum, seen at its edge, and the skirting.
  band(FLOOR, FLOOR + 0.06, mixHex(CLINIC.floor, CLINIC.steel, 0.2), inside0, inside1)
  band(FLOOR - 0.07, FLOOR, mixHex(lower, INK, 0.35), inside0, inside1)
  // The rail between the two paints.
  band(DADO - 0.025, DADO + 0.02, mixHex(CLINIC.blind, CLINIC.steel, 0.25), inside0, inside1)
  // A soft shadow along the ceiling's line: the room is lit low.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  if (inside1 > inside0) {
    const g = ctx.createLinearGradient(0, CEIL * k, 0, (CEIL + 0.7) * k)
    g.addColorStop(0, hexA(INK, 0.16))
    g.addColorStop(1, hexA(INK, 0))
    ctx.fillStyle = g
    ctx.fillRect(inside0 * k, CEIL * k, (inside1 - inside0) * k, 0.7 * k)
  }
  // The section's edges in ink.
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.8)
  const hline = (y: number) => { if (y > Y0 && y < Y1) p.line(inside0 * k, y * k, inside1 * k, y * k) }
  hline(CEIL)
  hline(FLOOR + 0.06)
  p.stroke(alpha(p, INK, 0.35))
  p.strokeWeight(weight * 0.5)
  hline(FLOOR)
  p.pop()
}

/** The office's door, shut: a flush leaf with a frosted pane lit from the corridor, a lever, a kick plate. */
function door(p: p5, k: number, weight: number, cold: number): void {
  const { x0, x1, top } = DOOR
  p.push()
  p.rectMode(p.CORNER)
  // The frame: a cream architrave.
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(CLINIC.blind, CLINIC.steel, 0.15))
  p.rect((x0 - 0.08) * k, (top - 0.08) * k, (x1 - x0 + 0.16) * k, (FLOOR - top + 0.08) * k)
  // The leaf.
  p.fill(mixHex(CLINIC.chair, CLINIC.wall, 0.45 - 0.1 * cold))
  p.rect(x0 * k, top * k, (x1 - x0) * k, (FLOOR - top) * k)
  // The frosted pane: the corridor's light behind it.
  const px0 = x0 + 0.17
  const px1 = x1 - 0.17
  const py0 = top + 0.18
  const py1 = top + 0.82
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, py0 * k, 0, py1 * k)
  g.addColorStop(0, mixHex(CLINIC.light, CLINIC.wall, 0.15 + 0.3 * cold))
  g.addColorStop(1, mixHex(CLINIC.light, CLINIC.wall, 0.45 + 0.3 * cold))
  ctx.fillStyle = g
  ctx.fillRect(px0 * k, py0 * k, (px1 - px0) * k, (py1 - py0) * k)
  p.noFill()
  p.stroke(alpha(p, INK, 0.7))
  p.strokeWeight(weight * 0.7)
  p.rect(px0 * k, py0 * k, (px1 - px0) * k, (py1 - py0) * k)
  // The kick plate.
  p.noStroke()
  p.fill(alpha(p, CLINIC.steel, 0.7))
  p.rect((x0 + 0.05) * k, (FLOOR - 0.2) * k, (x1 - x0 - 0.1) * k, 0.15 * k)
  // The lever, on the side away from the hinge (it is hung on its right).
  tube(p, k, weight, x0 + 0.12, -0.02, x0 + 0.28, -0.02, 0.9)
  p.noStroke()
  p.fill(INK)
  p.rect((x0 + 0.09) * k, -0.07 * k, 0.05 * k, 0.1 * k, 0.015 * k)
  p.pop()
}

/**
 * The coat stand and the doctor's white coat on it, a stethoscope round its collar: the doctor, who never appears,
 * is in the room by this. It stands on the floor at STAND.
 */
function stand(p: p5, k: number, weight: number, cold: number): void {
  const x = STAND
  const pole = mixHex(HOME.woodDark, CLINIC.steel, 0.35)
  p.push()
  // The feet and the pole, and its hooks.
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.noFill()
  for (const s of [-1, 1]) {
    p.beginShape()
    p.vertex(x * k, 0.38 * k)
    p.bezierVertex((x + s * 0.08) * k, 0.52 * k, (x + s * 0.18) * k, (FLOOR - 0.04) * k, (x + s * 0.26) * k, (FLOOR - 0.01) * k)
    p.endShape()
  }
  tube(p, k, weight, x, FLOOR - 0.24, x, -1.92, 1.25, pole)
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(pole)
  p.ellipse(x * k, -1.96 * k, 0.09 * k, 0.07 * k)
  p.noFill()
  p.strokeWeight(weight * 0.9)
  for (const s of [-1, 1]) {
    p.beginShape()
    p.vertex(x * k, -1.8 * k)
    p.bezierVertex((x + s * 0.1) * k, -1.8 * k, (x + s * 0.2) * k, -1.84 * k, (x + s * 0.2) * k, -1.92 * k)
    p.endShape()
  }
  // The coat, hung by its loop from the front hook: shoulders, the body falling to the hem, the sleeves.
  const coat = mixHex(CLINIC.sheet, CLINIC.wall, 0.12 + 0.3 * cold)
  const fold = mixHex(coat, CLINIC.steel, 0.35)
  const sh = -1.66
  const hem = -0.36
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(fold)
  // The sleeves, behind the body.
  for (const s of [-1, 1]) {
    p.beginShape()
    p.vertex((x + s * 0.2) * k, (sh + 0.04) * k)
    p.bezierVertex((x + s * 0.3) * k, (sh + 0.1) * k, (x + s * 0.33) * k, (sh + 0.5) * k, (x + s * 0.31) * k, (sh + 0.86) * k)
    p.vertex((x + s * 0.2) * k, (sh + 0.88) * k)
    p.bezierVertex((x + s * 0.21) * k, (sh + 0.5) * k, (x + s * 0.17) * k, (sh + 0.2) * k, (x + s * 0.12) * k, (sh + 0.1) * k)
    p.endShape(p.CLOSE)
  }
  p.fill(coat)
  p.beginShape()
  p.vertex((x - 0.05) * k, (sh - 0.06) * k)
  p.bezierVertex((x - 0.14) * k, (sh - 0.04) * k, (x - 0.22) * k, sh * k, (x - 0.23) * k, (sh + 0.1) * k)
  p.bezierVertex((x - 0.26) * k, (sh + 0.5) * k, (x - 0.27) * k, (hem - 0.3) * k, (x - 0.26) * k, hem * k)
  p.bezierVertex((x - 0.1) * k, (hem + 0.03) * k, (x + 0.1) * k, (hem + 0.03) * k, (x + 0.26) * k, hem * k)
  p.bezierVertex((x + 0.27) * k, (hem - 0.3) * k, (x + 0.26) * k, (sh + 0.5) * k, (x + 0.23) * k, (sh + 0.1) * k)
  p.bezierVertex((x + 0.22) * k, sh * k, (x + 0.14) * k, (sh - 0.04) * k, (x + 0.05) * k, (sh - 0.06) * k)
  p.endShape(p.CLOSE)
  // The lapels, the opening down the front, and a breast pocket with a pen in it.
  p.stroke(alpha(p, INK, 0.75))
  p.strokeWeight(weight * 0.6)
  p.noFill()
  p.line((x - 0.05) * k, (sh - 0.05) * k, (x + 0.01) * k, (sh + 0.36) * k)
  p.line((x + 0.05) * k, (sh - 0.05) * k, (x + 0.01) * k, (sh + 0.36) * k)
  p.line((x + 0.01) * k, (sh + 0.36) * k, (x + 0.01) * k, (hem + 0.02) * k)
  p.rectMode(p.CORNER)
  p.rect((x - 0.19) * k, (sh + 0.34) * k, 0.1 * k, 0.1 * k, 0.01 * k)
  p.stroke(alpha(p, INK, 0.9))
  p.strokeWeight(weight * 0.7)
  p.line((x - 0.16) * k, (sh + 0.28) * k, (x - 0.16) * k, (sh + 0.36) * k)
  // The stethoscope over the collar: tubing down either lapel, the chest piece on the right.
  p.stroke(mixHex(INK, CLINIC.steel, 0.2))
  p.strokeWeight(weight * 0.95)
  p.noFill()
  p.beginShape()
  p.vertex((x - 0.1) * k, (sh - 0.03) * k)
  p.bezierVertex((x - 0.13) * k, (sh + 0.15) * k, (x - 0.07) * k, (sh + 0.34) * k, (x - 0.06) * k, (sh + 0.52) * k)
  p.endShape()
  p.beginShape()
  p.vertex((x + 0.1) * k, (sh - 0.03) * k)
  p.bezierVertex((x + 0.13) * k, (sh + 0.18) * k, (x + 0.09) * k, (sh + 0.42) * k, (x + 0.1) * k, (sh + 0.62) * k)
  p.endShape()
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.fill(CLINIC.steel)
  p.ellipse((x + 0.1) * k, (sh + 0.66) * k, 0.1 * k, 0.06 * k)
  p.pop()
}

/**
 * The hospital room's window, on the far wall: a cream frame, its blind drawn half up (the slats bunched under the
 * head rail, a cord down the side), and through the bare glass the town's roofs against the sky going down.
 */
function window_(p: p5, k: number, weight: number, T: number): void {
  const { x0, x1, y0, y1 } = WINDOW
  const d = wardDusk(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  p.rectMode(p.CORNER)
  // The window's warm spill on the wall round it, while the sun lasts.
  if (d.spill > 0.01) {
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2 + 0.3
    const g = ctx.createRadialGradient(cx * k, cy * k, 0.3 * k, cx * k, cy * k, 2.3 * k)
    g.addColorStop(0, hexA(HOME.dusk, 0.3 * d.spill))
    g.addColorStop(1, hexA(HOME.dusk, 0))
    ctx.save()
    ctx.globalCompositeOperation = 'soft-light'
    ctx.fillStyle = g
    ctx.fillRect((cx - 2.3) * k, (cy - 2.3) * k, 4.6 * k, 4.6 * k)
    ctx.restore()
  }
  // The sky.
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, d.top)
  g.addColorStop(0.62, d.mid)
  g.addColorStop(1, d.low)
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  // The town against it: roofs, a chimney, a water tower, a tree: flat, one colour, darkening with the sky.
  const town = mixHex(mixHex(CLINIC.steel, HOME.night, 0.45), HOME.night, d.dim * 0.7)
  p.noStroke()
  p.fill(town)
  p.beginShape()
  const base = y1
  p.vertex(x0 * k, base * k)
  const roofs: Pt[] = [
    [0, -0.12], [0.12, -0.12], [0.2, -0.2], [0.28, -0.12], [0.34, -0.12], [0.34, -0.24], [0.42, -0.24], [0.42, -0.14],
    [0.58, -0.14], [0.66, -0.26], [0.74, -0.14], [0.8, -0.1], [0.92, -0.1], [0.92, -0.2], [1.0, -0.2], [1.0, -0.12],
    [1.1, -0.12], [1.18, -0.18], [1.26, -0.12], [1.57, -0.12],
  ]
  for (const [dx, dy] of roofs) p.vertex((x0 + dx) * k, (base + dy) * k)
  p.vertex(x1 * k, base * k)
  p.endShape(p.CLOSE)
  // A water tower on its legs, and a round tree.
  const wx = x0 + 1.34
  p.rect((wx - 0.09) * k, (base - 0.42) * k, 0.18 * k, 0.13 * k)
  p.triangle((wx - 0.11) * k, (base - 0.42) * k, (wx + 0.11) * k, (base - 0.42) * k, wx * k, (base - 0.5) * k)
  p.stroke(town)
  p.strokeWeight(weight * 0.45)
  p.line((wx - 0.07) * k, (base - 0.29) * k, (wx - 0.09) * k, (base - 0.12) * k)
  p.line((wx + 0.07) * k, (base - 0.29) * k, (wx + 0.09) * k, (base - 0.12) * k)
  p.noStroke()
  p.ellipse((x0 + 0.5) * k, (base - 0.2) * k, 0.2 * k, 0.17 * k)
  // The blind, drawn half up: its slats bunched under the head rail, the bottom rail, the cords.
  const stack = y0 + 0.36
  p.fill(mixHex(CLINIC.blind, CLINIC.steel, 0.1 + d.dim * 0.3))
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.7)
  p.rect((x0 - 0.02) * k, (y0 - 0.02) * k, (x1 - x0 + 0.04) * k, (stack - y0 + 0.02) * k)
  p.stroke(alpha(p, INK, 0.22))
  p.strokeWeight(weight * 0.45)
  for (let y = y0 + 0.09; y < stack - 0.02; y += 0.055) p.line((x0 + 0.02) * k, y * k, (x1 - 0.02) * k, y * k)
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(CLINIC.blind, CLINIC.steel, 0.3 + d.dim * 0.3))
  p.rect((x0 - 0.04) * k, (stack - 0.01) * k, (x1 - x0 + 0.08) * k, 0.06 * k, 0.015 * k)
  // The frame, the sash's bar, the sill.
  const trim = mixHex(CLINIC.blind, CLINIC.wall, 0.2 + d.dim * 0.4)
  p.noFill()
  p.stroke(alpha(p, INK, 0.6))
  p.strokeWeight(weight * 1.6)
  p.line(x0 * k, ((stack + y1) / 2) * k, x1 * k, ((stack + y1) / 2) * k)
  p.stroke(trim)
  p.strokeWeight(weight * 0.8)
  p.line(x0 * k, ((stack + y1) / 2) * k, x1 * k, ((stack + y1) / 2) * k)
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.8)
  p.rect((x0 - 0.06) * k, (y0 - 0.06) * k, (x1 - x0 + 0.12) * k, (y1 - y0 + 0.12) * k)
  p.fill(trim)
  p.rect((x0 - 0.16) * k, (y1 + 0.06) * k, (x1 - x0 + 0.32) * k, 0.09 * k, 0.02 * k)
  // The cord, down the right of the glass, and its pull.
  p.stroke(alpha(p, INK, 0.7))
  p.strokeWeight(weight * 0.4)
  p.line((x1 - 0.1) * k, (stack + 0.05) * k, (x1 - 0.1) * k, (y1 - 0.18) * k)
  p.noStroke()
  p.fill(mixHex(CLINIC.blind, CLINIC.steel, 0.4))
  p.rect((x1 - 0.125) * k, (y1 - 0.2) * k, 0.05 * k, 0.07 * k, 0.02 * k)
  p.pop()
}

export const clinicSet = scenery<null>({
  name: 'clinic',
  draw: (p, _s, c) => {
    const { k, weight } = c
    const T = c.t
    const f = frame(p, k)
    // The office.
    {
      const [ox, oy] = OFFICE
      const g = { x0: f.x0 - ox, x1: f.x1 - ox, y0: f.y0 - oy, y1: f.y1 - oy }
      if (g.x1 > OFFICE_WALLS[0] - 1 && g.x0 < OFFICE_WALLS[1] + 1) {
        const cold = officeCold(T)
        p.push()
        p.translate(ox * k, oy * k)
        shell(p, k, weight, OFFICE_WALLS, g, cold)
        door(p, k, weight, cold)
        stand(p, k, weight, cold)
        p.pop()
      }
    }
    // The hospital room.
    {
      const [ox, oy] = WARD
      const g = { x0: f.x0 - ox, x1: f.x1 - ox, y0: f.y0 - oy, y1: f.y1 - oy }
      if (g.x1 > WARD_WALLS[0] - 1 && g.x0 < WARD_WALLS[1] + 1) {
        p.push()
        p.translate(ox * k, oy * k)
        shell(p, k, weight, WARD_WALLS, g, 0.2)
        window_(p, k, weight, T)
        p.pop()
      }
    }
  },
})

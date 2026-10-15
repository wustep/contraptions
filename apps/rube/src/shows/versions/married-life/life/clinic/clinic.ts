import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { along, birds, type Frame, wobble } from '../depth'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { CUT } from '../music'
import { CLINIC, HILL, HOME, INK } from '../worlds'

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
 * Time keeps going in both: the same wall clock hangs in each, its red sweep hand going round without a stop through
 * the held note and through her last evening. In the office a rubber plant stirs, someone passes the door's frosted
 * pane, and the sun's bars fall across a radiator, a print and the plant as well as the two of them; in the ward the
 * window looks out on a town in three depths, its clouds drifting, birds crossing the gold and its windows coming on as
 * the night does, and her privacy curtain hangs drawn back at the end of its track.
 *
 * This file draws the rooms (walls, floors, the floors over and under them in section, the door, the coat on its
 * stand, the radiator, the print, the plant, the clocks, the curtain, the window and its view) at show time, and holds
 * what both parts share: where the rooms are, the chair, the light's schedules. The parts draw their own furniture and
 * the light that falls over the two of them.
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
/**
 * The coat stand, to her right: the doctor's white coat on it, the one thing in the room that says whose room it is.
 * Far enough out that it is whole in the room's wide and slides out of the frame as the camera closes on the two of
 * them (by 80.1), so no strip of white coat hangs at the edge of the close or the drift to the cut.
 */
export const STAND = 2.6
/** The hospital room's window, on the far wall behind the lamp: [x0, x1, y0, y1]. */
export const WINDOW = { x0: -2.55, x1: -0.98, y0: -2.25, y1: -0.9 }

/**
 * The clinic's wall clock, the same in both rooms: [x, y] of its centre, its radius, and the time on it as each room's
 * cut comes in (hours: 15.7 is twenty to four). In the office it is up and right of her, low enough to stay in the
 * frame all the way in to the close and the drift to the door; in the ward, on the wall past the foot of her bed.
 */
const OFFICE_CLOCK = { x: 0.98, y: -1.29, r: 0.15, at: 15.7 }
const WARD_CLOCK = { x: 2.02, y: -1.42, r: 0.15, at: 18.87 }
/** The office's rubber plant, on the floor between her chair and the coat stand. */
const PLANT = 1.55
/** The office's radiator and the print over it, on the wall left of the door (the room's empty side). */
const RADIATOR = { x0: -2.64, x1: -1.86, top: -0.22 }
const PRINT = { x0: -2.56, x1: -1.92, y0: -1.78, y1: -1.28 }

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
 * A visitor's chair, the clinic's one kind, facing us: a vinyl seat and a back on a bent steel tube. Its centre at
 * `x`; a sitter's bottom on the seat's top (y = SEAT), its feet on the floor. `dent` presses the seat's top down under
 * a sitter at `dentX` (she sinks into it).
 */
/**
 * How a visitor's chair looks. The office's: a pale slate-teal vinyl, and for a back a wide, low, well-rounded band on
 * its two uprights, level with the sitter's top edge, so nothing Carl-sized sits behind either of them (a square back
 * panel over his shoulders read as a second, darker Carl stacked on him). The ward's, `low`: a warm brown vinyl and a
 * back that stops below the sitter's top edge, so the old grey Carl in it stands clear of it against the pale wall.
 */
export interface ChairLook {
  low?: boolean
}

export function drawVisitorChair(p: p5, k: number, weight: number, x: number, dent = 0, dentX = x, look: ChairLook = {}): void {
  // The office's vinyl is lighter than his blue and a shade under her coral, darker than the wall behind: the ink
  // outline carries the chair, not its value. In the ward, a warm mid brown.
  const vinyl = look.low
    ? mixHex(mixHex(HOME.woodDark, HOME.wood, 0.3), CLINIC.chair, 0.2)
    : mixHex(mixHex(CLINIC.chair, HOME.leaf, 0.18), CLINIC.wall, 0.15)
  const back = look.low ? mixHex(vinyl, INK, 0.12) : vinyl
  const seat = look.low ? vinyl : mixHex(vinyl, INK, 0.15)
  p.push()
  p.translate(x * k, 0)
  if (look.low) {
    // The back: two uprights from behind the seat to the panel, and the panel, behind his middle, under his top edge.
    const [b0, b1] = [-0.05, 0.1]
    const up = (b0 + b1) / 2
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
  } else {
    // The back: a band 0.44 wide and 0.13 deep, its top level with his (-R), its ends round, on two uprights that
    // stand just clear of his sides, so the tube shows between his edges and the band's ends.
    const b0 = -R - 0.005
    const b1 = b0 + 0.13
    const bw = 0.22
    tube(p, k, weight, -0.18, SEAT + 0.02, -0.18, (b0 + b1) / 2)
    tube(p, k, weight, 0.18, SEAT + 0.02, 0.18, (b0 + b1) / 2)
    p.stroke(INK)
    p.strokeWeight(weight * 0.85)
    p.fill(back)
    p.rectMode(p.CORNER)
    p.rect(-bw * k, b0 * k, 2 * bw * k, (b1 - b0) * k, 0.058 * k)
    // The light along its top roll: vinyl, catching the room.
    p.stroke(alpha(p, CLINIC.light, 0.32))
    p.strokeWeight(weight * 0.5)
    p.line((-bw + 0.06) * k, (b0 + 0.03) * k, (bw - 0.06) * k, (b0 + 0.03) * k)
  }
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
  p.fill(seat)
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
  // Round the room: the building, cut through. The floors over and under it are in section too (what a phone held
  // upright sees above this room): the same rooms, empty and in shade, each with its rail, its skirting and a door.
  band(Y0, CEIL - 0.3, beyond)
  band(FLOOR + 0.36, Y1, beyond)
  const shade = mixHex(CLINIC.steel, HOME.night, 0.3)
  const STOREY = FLOOR - CEIL + 0.36
  for (const i of [3, 2, 1, -1, -2]) {
    const dy = -i * STOREY
    if (CEIL - 0.3 + dy > Y1 || FLOOR + 0.36 + dy < Y0) continue
    band(CEIL + dy, DADO + dy, mixHex(upper, shade, 0.4), inside0, inside1)
    band(DADO + dy, FLOOR + dy, mixHex(lower, shade, 0.4), inside0, inside1)
    band(DADO - 0.025 + dy, DADO + 0.02 + dy, mixHex(CLINIC.blind, shade, 0.45), inside0, inside1)
    band(FLOOR - 0.07 + dy, FLOOR + dy, mixHex(lower, shade, 0.6), inside0, inside1)
    band(FLOOR + dy, FLOOR + 0.06 + dy, mixHex(CLINIC.floor, shade, 0.4), inside0, inside1)
    band(CEIL - 0.3 + dy, CEIL + dy, section)
    // A door, shut, the corridor's light dim in its pane.
    const dx = (walls[0] + walls[1]) / 2 + (i % 2 === 0 ? -1.6 : 0.9)
    if (dx + 0.5 > X0 && dx - 0.5 < X1) {
      band(DOOR.top - 0.06 + dy, FLOOR + dy, mixHex(CLINIC.blind, shade, 0.5), dx - 0.51, dx + 0.51)
      band(DOOR.top + dy, FLOOR + dy, mixHex(CLINIC.chair, shade, 0.45), dx - 0.45, dx + 0.45)
      band(DOOR.top + 0.18 + dy, DOOR.top + 0.82 + dy, mixHex(CLINIC.light, shade, 0.45), dx - 0.28, dx + 0.28)
    }
  }
  band(CEIL - 0.3, CEIL, section)
  band(FLOOR + 0.06, FLOOR + 0.36, section)
  if (X0 < walls[0]) band(Y0, Y1, section, X0, Math.min(X1, walls[0]))
  if (X1 > walls[1]) band(Y0, Y1, section, Math.max(X0, walls[1]), X1)
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

/**
 * Someone going along the corridor, seen through the door's frosted pane as a soft shadow, head and shoulders: twice
 * while they wait, the second time slower, and then no one (gone by 80.5, before the news). Show seconds, office cells.
 */
const PASSES = [
  { t0: 74.7, t1: 76.5, x0: -1.62, x1: -0.16 },
  { t0: 78.1, t1: 80.35, x0: -0.16, x1: -1.62 },
]

/** The office's door, shut: a flush leaf with a frosted pane lit from the corridor, a lever, a kick plate. */
function door(p: p5, k: number, weight: number, cold: number, T: number): void {
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
  // Whoever is going by: the glass blurs them, so a few soft layers, each a little smaller and as faint, and a step's
  // rise and fall in the head.
  for (const w of PASSES) {
    if (T <= w.t0 || T >= w.t1) continue
    const u = (T - w.t0) / (w.t1 - w.t0)
    const cx = w.x0 + (w.x1 - w.x0) * u
    const bob = 0.012 * Math.abs(Math.sin(u * Math.PI * 4))
    ctx.save()
    ctx.beginPath()
    ctx.rect(px0 * k, py0 * k, (px1 - px0) * k, (py1 - py0) * k)
    ctx.clip()
    p.noStroke()
    p.fill(alpha(p, mixHex(CLINIC.steel, INK, 0.3), 0.085))
    for (let pass = 0; pass < 3; pass++) {
      const gr = 0.08 - pass * 0.03
      p.ellipse(cx * k, (py0 + 0.13 + bob) * k, (0.15 + gr) * k, (0.18 + gr) * k)
      p.rect((cx - 0.17 - gr / 2) * k, (py0 + 0.25 + bob - gr / 2) * k, (0.34 + gr) * k, 0.6 * k, (0.09 + gr / 2) * k)
    }
    ctx.restore()
  }
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

/** The thin red of a sweep hand: the clinic's one strong colour, kept small. */
const SWEEP = mixHex(HILL.blanket, CLINIC.steel, 0.2)

/**
 * The clinic's wall clock, the same in both rooms: a pale face in a steel rim, its twelve marks, two black hands, and a
 * thin red sweep hand that goes round without stopping (an electric clock: no tick to fall against the music). It is
 * the one thing in the room that never stops moving. `hours` is the time on it; its shadow falls a little down and
 * right of it on the wall.
 */
function clock(p: p5, k: number, weight: number, x: number, y: number, r: number, hours: number, cold: number): void {
  const hand = (turns: number, from: number, to: number) => {
    const a = TAU * turns - Math.PI / 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    p.line((x + c * from) * k, (y + s * from) * k, (x + c * to) * k, (y + s * to) * k)
  }
  p.push()
  p.noStroke()
  p.fill(alpha(p, INK, 0.13))
  p.circle((x + 0.022) * k, (y + 0.03) * k, 2 * (r + 0.006) * k)
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(mixHex(CLINIC.steel, CLINIC.blind, 0.35))
  p.circle(x * k, y * k, 2 * r * k)
  p.stroke(alpha(p, INK, 0.45))
  p.strokeWeight(weight * 0.5)
  p.fill(mixHex(CLINIC.light, CLINIC.wall, 0.1 + 0.3 * cold))
  p.circle(x * k, y * k, 2 * r * 0.82 * k)
  // The marks, the quarters longer.
  p.stroke(alpha(p, INK, 0.7))
  for (let i = 0; i < 12; i++) {
    p.strokeWeight(weight * (i % 3 === 0 ? 0.55 : 0.35))
    hand(i / 12, r * (i % 3 === 0 ? 0.52 : 0.6), r * 0.7)
  }
  const h = ((hours % 12) + 12) % 12
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  hand(h / 12, -r * 0.1, r * 0.4)
  p.strokeWeight(weight * 0.6)
  hand(h % 1, -r * 0.12, r * 0.64)
  p.stroke(SWEEP)
  p.strokeWeight(Math.max(1, weight * 0.3))
  hand((h * 60) % 1, -r * 0.2, r * 0.7)
  p.noStroke()
  p.fill(INK)
  p.circle(x * k, y * k, r * 0.13 * k)
  p.pop()
}

/**
 * The office's radiator, on the wall left of the door: an old cast-iron one in the building's cream, its columns in a
 * row on short feet, the valve and its pipe at the end; the wall behind it a shade darker.
 */
function radiator(p: p5, k: number, weight: number, cold: number): void {
  const { x0, x1, top } = RADIATOR
  const foot = FLOOR - 0.07
  const n = 9
  const w = (x1 - x0) / n
  const iron = mixHex(mixHex(CLINIC.blind, HOME.trim, 0.4), CLINIC.steel, 0.2 + 0.15 * cold)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, INK, 0.1))
  p.rect((x0 + 0.03) * k, (top + 0.05) * k, (x1 - x0) * k, (FLOOR - top - 0.05) * k)
  // The pipe up from the floor and the valve.
  tube(p, k, weight, x0 - 0.07, FLOOR - 0.01, x0 - 0.07, top + 0.22, 1.1)
  tube(p, k, weight, x0 - 0.07, top + 0.22, x0 + 0.02, top + 0.22, 1.1)
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(HOME.woodDark, CLINIC.steel, 0.3))
  p.rect((x0 - 0.115) * k, (top + 0.11) * k, 0.09 * k, 0.05 * k, 0.015 * k)
  // The columns, each rounded at its ends; the feet.
  p.stroke(alpha(p, INK, 0.7))
  p.strokeWeight(weight * 0.6)
  p.fill(iron)
  for (let i = 0; i < n; i++) p.rect((x0 + i * w + 0.006) * k, top * k, (w - 0.012) * k, (foot - top) * k, 0.035 * k)
  // The bars that join them, top and bottom, behind the columns' faces: a darker line across each.
  p.stroke(alpha(p, INK, 0.35))
  p.strokeWeight(weight * 0.5)
  p.line((x0 + 0.03) * k, (top + 0.09) * k, (x1 - 0.03) * k, (top + 0.09) * k)
  p.line((x0 + 0.03) * k, (foot - 0.09) * k, (x1 - 0.03) * k, (foot - 0.09) * k)
  p.noStroke()
  p.fill(INK)
  p.rect((x0 + 0.04) * k, foot * k, 0.06 * k, (FLOOR - foot) * k, 0.01 * k)
  p.rect((x1 - 0.1) * k, foot * k, 0.06 * k, (FLOOR - foot) * k, 0.01 * k)
  p.pop()
}

/**
 * The print over the radiator, in a thin dark frame on a cream mat, no words: far off across a green plain, a
 * mountain with a flat top and a thin fall of water down its face, in the room's cold colours. Anyone's waiting-room
 * picture; theirs, as it turns out.
 */
function print_(p: p5, k: number, weight: number, cold: number): void {
  const { x0, x1, y0, y1 } = PRINT
  const X = (u: number) => (x0 + 0.1 + (x1 - x0 - 0.2) * u) * k
  const Y = (v: number) => (y0 + 0.1 + (y1 - y0 - 0.2) * v) * k
  const haze = (hex: string, a: number) => mixHex(hex, CLINIC.wall, a + 0.2 * cold)
  p.push()
  p.rectMode(p.CORNER)
  p.noStroke()
  p.fill(alpha(p, INK, 0.13))
  p.rect((x0 + 0.022) * k, (y0 + 0.03) * k, (x1 - x0) * k, (y1 - y0) * k)
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(HOME.woodDark, CLINIC.steel, 0.35))
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  p.noStroke()
  p.fill(haze(CLINIC.blind, 0.05))
  p.rect((x0 + 0.035) * k, (y0 + 0.035) * k, (x1 - x0 - 0.07) * k, (y1 - y0 - 0.07) * k)
  // The picture: sky, the far mountain, its fall, the plain.
  p.fill(haze(HOME.sky, 0.3))
  p.rect(X(0), Y(0), X(1) - X(0), Y(1) - Y(0))
  p.fill(haze(mixHex(HILL.leaf, HOME.bark, 0.35), 0.35))
  p.beginShape()
  p.vertex(X(0.1), Y(0.82))
  p.vertex(X(0.2), Y(0.3))
  p.vertex(X(0.26), Y(0.24))
  p.vertex(X(0.6), Y(0.22))
  p.vertex(X(0.66), Y(0.3))
  p.vertex(X(0.76), Y(0.82))
  p.endShape(p.CLOSE)
  p.fill(haze(CLINIC.light, 0.05))
  p.rect(X(0.47), Y(0.23), X(0.505) - X(0.47), Y(0.78) - Y(0.23))
  p.fill(haze(HILL.grass, 0.3))
  p.beginShape()
  p.vertex(X(0), Y(1))
  p.vertex(X(0), Y(0.76))
  p.bezierVertex(X(0.3), Y(0.7), X(0.7), Y(0.82), X(1), Y(0.72))
  p.vertex(X(1), Y(1))
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(alpha(p, INK, 0.5))
  p.strokeWeight(weight * 0.45)
  p.rect(X(0), Y(0), X(1) - X(0), Y(1) - Y(0))
  p.pop()
}

/**
 * A rubber plant in a pot on the floor between her chair and the coat stand: broad dark leaves alternating up a single
 * stem, a new one furled at the top. Each leaf stirs a hair in the room's air, on its own; the sun's bars cross them.
 * [height up the stem, side, lean from upright (radians), length, width].
 */
const LEAVES: [number, number, number, number, number][] = [
  [0.22, -1, -1.08, 0.26, 0.12],
  [0.12, 1, 1.02, 0.28, 0.125],
  [-0.04, -1, -0.86, 0.3, 0.13],
  [-0.2, 1, 0.8, 0.3, 0.13],
  [-0.36, -1, -0.62, 0.28, 0.12],
  [-0.5, 1, 0.52, 0.25, 0.11],
  [-0.63, -1, -0.32, 0.2, 0.095],
]

/** The pot's rim, and the top of the stem. */
const RIM = FLOOR - 0.33
const CROWN = -0.74

/** Where the plant's stem is at height `y`: leaning a little right as it rises, swaying `sway` a cell for each it rises. */
const stemX = (y: number, sway: number): number => PLANT + 0.03 * (RIM - y) ** 2 + sway * (RIM - y)

/**
 * Where each of the plant's leaves is at `T`: its stalk's foot on the stem, its turn, its length and width, the new
 * furled leaf last. The plant sways a hair as a whole and each leaf stirs on its own.
 */
function leavesAt(T: number): [number, number, number, number, number][] {
  const sway = 0.012 * wobble(T, 41, 3.2)
  const out = LEAVES.map(([y, , lean, len, w], i): [number, number, number, number, number] => [stemX(y, sway), y, lean + 0.035 * wobble(T, 50 + i, 2.3) + sway * 2, len, w])
  out.push([stemX(CROWN, sway), CROWN, 0.06 + 0.02 * wobble(T, 60, 2.6) + sway * 2, 0.15, 0.045])
  return out
}

/**
 * The plant's outline added to the canvas's current path, for the shadow it throws in the sun's bars on the wall behind
 * it (`doctor.ts`): its leaves as ovals and its pot, moved `dx, dy` (office cells, from where the path's origin is) and
 * grown by `g` for a soft edge.
 */
export function plantShape(ctx: CanvasRenderingContext2D, k: number, T: number, dx: number, dy: number, g: number): void {
  for (const [ax, ay, rot, len, w] of leavesAt(T)) {
    const cx = ax + dx + Math.sin(rot) * len * 0.55
    const cy = ay + dy - Math.cos(rot) * len * 0.55
    const rx = w * 0.45 + g
    ctx.moveTo((cx + rx * Math.cos(rot)) * k, (cy + rx * Math.sin(rot)) * k)
    ctx.ellipse(cx * k, cy * k, rx * k, (len * 0.46 + g) * k, rot, 0, TAU)
  }
  ctx.rect((PLANT + dx - 0.15 - g) * k, (RIM + dy - g) * k, (0.3 + 2 * g) * k, (FLOOR - RIM) * k)
}

function plant(p: p5, k: number, weight: number, T: number, cold: number): void {
  const x = PLANT
  const rim = RIM
  const pot = mixHex(mixHex(HOME.roof, CLINIC.wall, 0.4), CLINIC.steel, 0.1 + 0.1 * cold)
  const leaf = mixHex(mixHex(HOME.leaf, INK, 0.3), CLINIC.steel, 0.12 + 0.15 * cold)
  const vein = mixHex(leaf, CLINIC.light, 0.35)
  const leaves = leavesAt(T)
  const sway = 0.012 * wobble(T, 41, 3.2)
  p.push()
  p.rectMode(p.CORNER)
  // The shade it throws on the wall behind it, and the pot.
  p.noStroke()
  p.fill(alpha(p, INK, 0.1))
  p.rect((x - 0.13) * k, (rim + 0.06) * k, 0.3 * k, (FLOOR - rim - 0.06) * k, 0.04 * k)
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(pot)
  p.quad((x - 0.15) * k, (rim + 0.05) * k, (x + 0.15) * k, (rim + 0.05) * k, (x + 0.11) * k, FLOOR * k, (x - 0.11) * k, FLOOR * k)
  p.fill(mixHex(pot, CLINIC.light, 0.15))
  p.rect((x - 0.165) * k, rim * k, 0.33 * k, 0.065 * k, 0.015 * k)
  // The stem.
  p.noFill()
  p.stroke(mixHex(HOME.bark, CLINIC.steel, 0.3))
  p.strokeWeight(weight * 0.9)
  p.beginShape()
  for (let y = rim; y >= CROWN; y -= 0.1) p.vertex(stemX(y, sway) * k, y * k)
  p.vertex(stemX(CROWN, sway) * k, CROWN * k)
  p.endShape()
  // The leaves, lowest first: a pointed oval on a short stalk, its midrib; the new one at the top furled in its sheath.
  const blade = (len: number, w: number) => {
    p.beginShape()
    p.vertex(0, -0.03 * k)
    p.bezierVertex(w * 0.62 * k, -(0.03 + len * 0.12) * k, w * 0.6 * k, -len * 0.78 * k, 0, -len * k)
    p.bezierVertex(-w * 0.6 * k, -len * 0.78 * k, -w * 0.62 * k, -(0.03 + len * 0.12) * k, 0, -0.03 * k)
    p.endShape(p.CLOSE)
  }
  leaves.forEach(([ax, ay, rot, len, w], i) => {
    const furled = i === leaves.length - 1
    p.push()
    p.translate(ax * k, ay * k)
    p.rotate(rot)
    p.stroke(INK)
    p.strokeWeight(weight * (furled ? 0.65 : 0.7))
    p.fill(furled ? mixHex(leaf, HOME.roof, 0.35) : leaf)
    blade(len, w)
    if (!furled) {
      p.stroke(vein)
      p.strokeWeight(weight * 0.4)
      p.line(0, -0.04 * k, 0, -len * 0.85 * k)
    }
    p.pop()
  })
  p.pop()
}

/**
 * The ward's privacy curtain, drawn back: its track along the ceiling, and the curtain gathered at the end of its run
 * past the foot of her bed, a band of net under the track and then the cloth in deep folds to a hand over the floor.
 * Its folds and hem stir a hair in the room's air.
 */
const CURTAIN = { x: 2.78, w: 0.44, top: CEIL + 0.08, net: CEIL + 0.4, hem: FLOOR - 0.3 }

function curtain(p: p5, k: number, weight: number, T: number, x0: number): void {
  const { x, w, top, net, hem } = CURTAIN
  const cloth = mixHex(mixHex(HOME.siding, CLINIC.wall, 0.62), CLINIC.steel, 0.1)
  const fold = mixHex(cloth, CLINIC.steel, 0.4)
  const n = 6
  // Where the cloth's edge is at height y (it hangs a little wider toward the hem), and its hem, scalloped by the folds.
  const flare = (y: number) => 0.035 * Math.max(0, (y - net) / (hem - net))
  const stir = (i: number, y: number) => 0.01 * wobble(T, 70 + i, 2.9) * Math.max(0, (y - net) / (hem - net))
  const edge = (i: number, y: number) => x - w / 2 - flare(y) + ((w + 2 * flare(y)) * i) / n + stir(i, y)
  const foot = (i: number) => hem + (i % 2 === 0 ? 0 : 0.03) + 0.008 * wobble(T, 80 + i, 3.3)
  p.push()
  p.rectMode(p.CORNER)
  // The track, from over the bed to the end of its run, and the carriers bunched over the curtain.
  const tx0 = Math.max(x0 - 0.2, -0.6)
  tube(p, k, weight, tx0, top - 0.03, x + w / 2 + 0.06, top - 0.03, 0.9)
  p.noStroke()
  p.fill(INK)
  for (let i = 0; i <= n; i++) p.rect((x - w / 2 + (w * i) / n - 0.012) * k, (top - 0.02) * k, 0.024 * k, 0.03 * k)
  // The net: the wall through it, a lattice of thread.
  p.fill(alpha(p, cloth, 0.35))
  p.rect((x - w / 2) * k, top * k, w * k, (net - top) * k)
  p.stroke(alpha(p, cloth, 0.9))
  p.strokeWeight(Math.max(1, weight * 0.3))
  for (let u = 0.04; u < w + 0.3; u += 0.06) {
    p.line((x - w / 2 + Math.min(u, w)) * k, (top + Math.max(0, u - w)) * k, (x - w / 2 + Math.max(0, u - 0.3)) * k, (top + Math.min(0.3, u)) * k)
  }
  // The cloth, its outline over the folds.
  p.noStroke()
  p.fill(cloth)
  p.beginShape()
  p.vertex(edge(0, net) * k, net * k)
  p.vertex(edge(n, net) * k, net * k)
  p.vertex(edge(n, hem) * k, foot(n) * k)
  for (let i = n - 1; i >= 0; i--) {
    const xm = (edge(i, hem) + edge(i + 1, hem)) / 2
    p.quadraticVertex(xm * k, (foot(i) + 0.04) * k, edge(i, hem) * k, foot(i) * k)
  }
  p.endShape(p.CLOSE)
  p.fill(fold)
  for (let i = 1; i < n; i += 2) {
    p.quad(
      (edge(i, net) - 0.008) * k, net * k,
      (edge(i + 1, net) - 0.02) * k, net * k,
      (edge(i + 1, hem) - 0.03) * k, (foot(i + 1) - 0.01) * k,
      (edge(i, hem) + 0.005) * k, foot(i) * k,
    )
  }
  p.noFill()
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(weight * 0.65)
  p.beginShape()
  p.vertex(edge(0, net) * k, net * k)
  p.vertex(edge(0, hem) * k, foot(0) * k)
  p.endShape()
  p.beginShape()
  p.vertex(edge(n, net) * k, net * k)
  p.vertex(edge(n, hem) * k, foot(n) * k)
  for (let i = n - 1; i >= 0; i--) {
    const xm = (edge(i, hem) + edge(i + 1, hem)) / 2
    p.quadraticVertex(xm * k, (foot(i) + 0.04) * k, edge(i, hem) * k, foot(i) * k)
  }
  p.endShape()
  p.stroke(alpha(p, INK, 0.6))
  p.strokeWeight(weight * 0.6)
  p.line((x - w / 2) * k, net * k, (x + w / 2) * k, net * k)
  p.noFill()
  p.rect((x - w / 2) * k, top * k, w * k, (net - top) * k)
  p.pop()
}

/* ------------------------------------------------------------------ the view from the ward's window */

/**
 * What the ward's window looks out on, in window cells (across from the glass's left edge, up from its foot): three
 * depths of town, each moving at its own depth as the camera moves (`along`), so the window is a window and not a
 * picture on the wall. Far off, towers hazed into the sky; then the roofs and the water tower; then near roofs, dark at
 * the sill. Over them a few long clouds drift across the sunset, and birds cross it in the gold. As the sky goes to
 * night the town's windows come on, one by one: small flat warm squares, nothing round them.
 */
const VIEW_AT: Pt = [0.3, -0.75]
/** The far towers: [middle, width, height]. */
const TOWERS: [number, number, number][] = [
  [-0.42, 0.13, 0.34], [-0.22, 0.16, 0.46], [0.0, 0.1, 0.3], [0.17, 0.14, 0.53], [0.36, 0.09, 0.38], [0.6, 0.18, 0.43],
  [0.86, 0.11, 0.6], [1.04, 0.15, 0.36], [1.27, 0.12, 0.5], [1.48, 0.17, 0.4], [1.72, 0.1, 0.33], [1.9, 0.14, 0.46],
]
/** The town's roofs (the middle depth): their skyline, [across, up]. The water tower and a tree stand among them. */
const ROOFS: Pt[] = [
  [-0.5, 0.15], [-0.36, 0.15], [-0.28, 0.23], [-0.2, 0.15], [-0.1, 0.12], [0.12, 0.12], [0.2, 0.2], [0.28, 0.12],
  [0.34, 0.12], [0.34, 0.24], [0.42, 0.24], [0.42, 0.14], [0.58, 0.14], [0.66, 0.26], [0.74, 0.14], [0.8, 0.1],
  [0.92, 0.1], [0.92, 0.2], [1.0, 0.2], [1.0, 0.12], [1.1, 0.12], [1.18, 0.18], [1.26, 0.12], [1.66, 0.12],
  [1.74, 0.21], [1.82, 0.13], [1.95, 0.13], [1.95, 0.19], [2.05, 0.19], [2.05, 0.12], [2.25, 0.12],
]
/** The near roofs, low along the sill: two gables, a flat roof with its chimney, a lean-to. */
const NEAR_ROOFS: Pt[] = [
  [-0.4, 0.05], [-0.2, 0.05], [-0.06, 0.13], [0.08, 0.05], [0.3, 0.05], [0.3, 0.09], [0.62, 0.09], [0.62, 0.06],
  [0.7, 0.06], [0.7, 0.16], [0.76, 0.16], [0.76, 0.06], [0.98, 0.06], [1.1, 0.14], [1.22, 0.06], [1.5, 0.04],
  [1.7, 0.1], [1.9, 0.04], [2.15, 0.04],
]
/** The clouds: [across, up, width, depth of body]. The first lies low, behind the towers. */
const CLOUDS: [number, number, number, number][] = [
  [0.3, 0.38, 0.7, 0.03], [0.1, 0.8, 0.62, 0.05], [0.95, 0.9, 0.75, 0.045], [1.65, 0.74, 0.5, 0.04],
  [-0.6, 0.66, 0.55, 0.04], [0.55, 0.63, 0.38, 0.03],
]
/** The town's windows: which depth (0 far, 1 roofs, 2 near), where, how big, and when each comes on. */
interface Lit {
  layer: number
  x: number
  y: number
  w: number
  h: number
  on: number
}
const LIT: Lit[] = (() => {
  const out: Lit[] = []
  TOWERS.forEach(([x, w, h], i) => {
    for (let row = 0; row * 0.07 + 0.1 < h - 0.04; row++) {
      for (const col of [-1, 0, 1]) {
        const s = hash(i * 31 + row, col + 2, 7)
        if (s > 0.3 || Math.abs(col) * 0.04 > w / 2 - 0.025) continue
        // A few offices lit already in the gold; the rest come on as it goes.
        const on = s < 0.04 ? 180 : 183.4 + 5.6 * hash(i, row * 3 + col, 8)
        out.push({ layer: 0, x: x + col * 0.04 - 0.009, y: 0.1 + row * 0.07, w: 0.018, h: 0.022, on })
      }
    }
  })
  for (const [x, y, on] of [[-0.3, 0.06, 185.2], [0.05, 0.05, 186.6], [0.48, 0.07, 184.4], [0.86, 0.05, 187.8], [1.13, 0.06, 185.9], [1.45, 0.05, 188.5], [1.88, 0.06, 186.1]]) {
    out.push({ layer: 1, x, y, w: 0.026, h: 0.03, on })
  }
  for (const [x, y, on] of [[-0.09, 0.025, 186.9], [0.42, 0.02, 184.9], [1.08, 0.025, 187.4], [1.62, 0.02, 188.2]]) {
    out.push({ layer: 2, x, y, w: 0.034, h: 0.034, on })
  }
  return out
})()

function view(p: p5, k: number, weight: number, T: number, f: Frame, d: Dusk): void {
  const { x0, x1, y0, y1 } = WINDOW
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  ctx.clip()
  // The sky.
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, d.top)
  g.addColorStop(0.62, d.mid)
  g.addColorStop(1, d.low)
  ctx.fillStyle = g
  ctx.fillRect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  // Where each depth stands: across with the camera (`along`), and a little up and down with it, so a far horizon
  // keeps its height in the frame as the window moves past it.
  const at = (depth: number): Pt => [x0 + along(f, depth, VIEW_AT[0]), y1 + (f.cy - VIEW_AT[1]) * depth * 0.6]
  const town = mixHex(mixHex(CLINIC.steel, HOME.night, 0.45), HOME.night, d.dim * 0.7)
  const far = mixHex(town, d.mid, 0.42 - 0.12 * d.dim)
  const near = mixHex(town, INK, 0.3)
  p.noStroke()
  // The clouds, slow and far: a long flat body, a heap or two on it, its underside lit by the sun gone down.
  {
    const [ox, oy] = at(0.85)
    const body = mixHex(mixHex(d.top, d.mid, 0.6), HOME.night, 0.16 + 0.12 * d.dim)
    const lit = mixHex(d.low, mixHex(HOME.lamp, HOME.pink, 0.45), 0.55 * d.spill)
    CLOUDS.forEach(([cx, cy, w, h], i) => {
      const x = ox + ((((cx + 0.028 * (T - W_IN) + 0.9) % 3.4) + 3.4) % 3.4) - 0.9
      const y = oy - cy
      if (i === 0) {
        // The low one, behind the towers: a thin streak.
        p.fill(lit)
        p.ellipse(x * k, y * k, w * k, h * k)
        return
      }
      p.fill(body)
      p.ellipse(x * k, y * k, w * k, h * k)
      p.ellipse((x - w * 0.14) * k, (y - h * 0.42) * k, w * 0.42 * k, h * 1.1 * k)
      p.ellipse((x + w * 0.17) * k, (y - h * 0.28) * k, w * 0.32 * k, h * 0.8 * k)
      p.fill(lit)
      p.ellipse((x + w * 0.04) * k, (y + h * 0.3) * k, w * 0.78 * k, h * 0.4 * k)
    })
  }
  // The town's windows on one depth, coming on.
  const windows = (layer: number, ox: number, oy: number, col: string) => {
    for (const l of LIT) {
      if (l.layer !== layer || T < l.on) continue
      p.fill(alpha(p, col, smooth(T, l.on, l.on + 0.12)))
      p.rect((ox + l.x) * k, (oy - l.y - l.h) * k, l.w * k, l.h * k)
    }
  }
  const glow = mixHex(HOME.lamp, HOME.dusk, 0.25)
  // The far towers, hazed toward the sky, one with a mast; their windows.
  {
    const [ox, oy] = at(0.55)
    p.fill(far)
    TOWERS.forEach(([x, w, h], i) => {
      p.rect((ox + x - w / 2) * k, (oy - h) * k, w * k, (h + 0.4) * k)
      if (i % 4 === 1) p.rect((ox + x - w * 0.3) * k, (oy - h - 0.05) * k, w * 0.6 * k, 0.06 * k)
    })
    p.rect((ox + 0.86 - 0.004) * k, (oy - 0.72) * k, 0.008 * k, 0.13 * k)
    windows(0, ox, oy, mixHex(glow, d.mid, 0.35))
  }
  // Birds crossing in the gold, between the towers and the roofs.
  const bird = mixHex(town, d.mid, 0.2)
  birds(p, k, f, T, { t0: 180.3, from: [x1 + 0.3, y1 - 0.74], v: [-0.46, 0.012], dur: 6, n: 4, span: 0.045, color: bird, beat: 2.3, seed: 3, depth: 0.45, anchor: VIEW_AT[0] }, weight)
  birds(p, k, f, T, { t0: 181.9, from: [x0 - 0.3, y1 - 0.86], v: [0.36, -0.02], dur: 6.2, n: 2, span: 0.04, color: bird, beat: 2.6, seed: 9, depth: 0.5, anchor: VIEW_AT[0] }, weight)
  // The roofs, the water tower on its legs, a round tree; their windows.
  {
    const [ox, oy] = at(0.3)
    p.noStroke()
    p.fill(town)
    p.beginShape()
    p.vertex((ox + ROOFS[0][0]) * k, (oy + 0.4) * k)
    for (const [x, y] of ROOFS) p.vertex((ox + x) * k, (oy - y) * k)
    p.vertex((ox + ROOFS[ROOFS.length - 1][0]) * k, (oy + 0.4) * k)
    p.endShape(p.CLOSE)
    const wx = ox + 1.34
    p.rect((wx - 0.09) * k, (oy - 0.42) * k, 0.18 * k, 0.13 * k)
    p.triangle((wx - 0.11) * k, (oy - 0.42) * k, (wx + 0.11) * k, (oy - 0.42) * k, wx * k, (oy - 0.5) * k)
    p.stroke(town)
    p.strokeWeight(weight * 0.45)
    p.line((wx - 0.07) * k, (oy - 0.29) * k, (wx - 0.09) * k, (oy - 0.12) * k)
    p.line((wx + 0.07) * k, (oy - 0.29) * k, (wx + 0.09) * k, (oy - 0.12) * k)
    p.noStroke()
    p.ellipse((ox + 0.5) * k, (oy - 0.2) * k, 0.2 * k, 0.17 * k)
    windows(1, ox, oy, mixHex(glow, d.mid, 0.15))
  }
  // The near roofs, and their windows.
  {
    const [ox, oy] = at(0.12)
    p.fill(near)
    p.beginShape()
    p.vertex((ox + NEAR_ROOFS[0][0]) * k, (oy + 0.4) * k)
    for (const [x, y] of NEAR_ROOFS) p.vertex((ox + x) * k, (oy - y) * k)
    p.vertex((ox + NEAR_ROOFS[NEAR_ROOFS.length - 1][0]) * k, (oy + 0.4) * k)
    p.endShape(p.CLOSE)
    windows(2, ox, oy, glow)
  }
  ctx.restore()
}

/**
 * The same window on the ward's floors over and under it (seen by a phone held upright): the building's windows stack,
 * each in a room in shade, the same sky going down in its glass, the blind down a little further in each.
 */
function stackedWindows(p: p5, k: number, weight: number, T: number, f: Frame): void {
  const { x0, x1, y0, y1 } = WINDOW
  const d = wardDusk(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const STOREY = FLOOR - CEIL + 0.36
  const shade = mixHex(CLINIC.steel, HOME.night, 0.3)
  for (const i of [3, 2, 1, -1, -2]) {
    const dy = -i * STOREY
    if (y0 - 0.2 + dy > f.y1 || y1 + 0.2 + dy < f.y0 || x1 + 0.2 < f.x0 || x0 - 0.2 > f.x1) continue
    const g = ctx.createLinearGradient(0, (y0 + dy) * k, 0, (y1 + dy) * k)
    g.addColorStop(0, d.top)
    g.addColorStop(0.62, d.mid)
    g.addColorStop(1, d.low)
    ctx.fillStyle = g
    ctx.fillRect(x0 * k, (y0 + dy) * k, (x1 - x0) * k, (y1 - y0) * k)
    p.noStroke()
    p.fill(mixHex(CLINIC.blind, shade, 0.45))
    p.rect((x0 - 0.02) * k, (y0 - 0.02 + dy) * k, (x1 - x0 + 0.04) * k, (0.3 + 0.1 * ((i + 4) % 3)) * k)
    p.noFill()
    p.stroke(alpha(p, INK, 0.45))
    p.strokeWeight(weight * 0.7)
    p.rect((x0 - 0.06) * k, (y0 - 0.06 + dy) * k, (x1 - x0 + 0.12) * k, (y1 - y0 + 0.12) * k)
    p.noStroke()
    p.fill(mixHex(CLINIC.blind, shade, 0.4))
    p.rect((x0 - 0.16) * k, (y1 + 0.06 + dy) * k, (x1 - x0 + 0.32) * k, 0.09 * k, 0.02 * k)
  }
}

/**
 * The hospital room's window, on the far wall: a cream frame, its blind drawn half up (the slats bunched under the
 * head rail, a cord down the side), and through the bare glass the town against the sky going down (`view`). The sill
 * catches the sky's light while there is any.
 */
function window_(p: p5, k: number, weight: number, T: number, f: Frame): void {
  const { x0, x1, y0, y1 } = WINDOW
  const d = wardDusk(T)
  p.push()
  p.rectMode(p.CORNER)
  view(p, k, weight, T, f, d)
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
  // The sill's top, facing the glass, takes the sky's colour: warm in the gold, going with it.
  p.noStroke()
  p.fill(mixHex(trim, d.low, 0.2 + 0.4 * d.spill))
  p.rect((x0 - 0.14) * k, (y1 + 0.068) * k, (x1 - x0 + 0.28) * k, 0.028 * k)
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
        const { x, y, r, at } = OFFICE_CLOCK
        p.push()
        p.translate(ox * k, oy * k)
        shell(p, k, weight, OFFICE_WALLS, g, cold)
        if (g.x0 < RADIATOR.x1 + 0.1) {
          radiator(p, k, weight, cold)
          print_(p, k, weight, cold)
        }
        clock(p, k, weight, x, y, r, at + (T - D_IN) / 3600, cold)
        if (g.x1 > PLANT - 0.4) plant(p, k, weight, T, cold)
        door(p, k, weight, cold, T)
        stand(p, k, weight, cold)
        p.pop()
      }
    }
    // The hospital room.
    {
      const [ox, oy] = WARD
      const g: Frame = { x0: f.x0 - ox, x1: f.x1 - ox, y0: f.y0 - oy, y1: f.y1 - oy, cx: f.cx - ox, cy: f.cy - oy }
      if (g.x1 > WARD_WALLS[0] - 1 && g.x0 < WARD_WALLS[1] + 1) {
        const { x, y, r, at } = WARD_CLOCK
        p.push()
        p.translate(ox * k, oy * k)
        shell(p, k, weight, WARD_WALLS, g, 0.2)
        p.push()
        p.rectMode(p.CORNER)
        stackedWindows(p, k, weight, T, g)
        p.pop()
        window_(p, k, weight, T, g)
        clock(p, k, weight, x, y, r, at + (T - W_IN) / 3600, 0.2)
        if (g.x1 > CURTAIN.x - CURTAIN.w) curtain(p, k, weight, T, g.x0)
        p.pop()
      }
    }
  },
})

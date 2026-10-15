import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { wobble } from '../depth'
import { alpha, box, carried, frame, part, type Companion, type Ctx, type Pose } from '../kit'
import { CHURCH, CLINIC, HOME, INK } from '../worlds'
import { CUTS } from '../seams'
import { CUT } from '../music'
import { slumpOf } from '../hill/climb'
import { CEIL, drawVisitorChair, FLOOR, hexA, lean, SEAT, tube, W_IN, W_OUT, WARD, WARD_APART, wardDusk, WINDOW } from './clinic'

/**
 * HOSPITAL (180.413 to 189.452): her bed, the balloon he brought her, the day going down. Strings and piano, free.
 *
 * She lies in the bed at the height of his chair, a little to his right (`CUTS.hospital`), turned up to the ceiling,
 * very still. He sits at her bedside in a low-backed chair with the balloon he has brought her (the cast draws it,
 * tied to him) over him. Behind them the window's sky goes from gold to rose to night over the nine seconds, and the
 * room darkens with it. As it goes he leans to the lamp on the bedside table and it comes on, on its note (182.433):
 * the one warm light. Then he leans to her and gives her the balloon: the knot goes across from his corner to her,
 * arriving on the strong note 184.883 (`HAND`), and it floats over her. On the strongest note (185.655) she turns the
 * smallest roll toward him, the film's touch; he answers with a lean. The camera stays on the two of them and the
 * balloon over them, and drifts in for the cut (189.452): he is sitting upright, at rest, and she is gone. The far side
 * is the empty church, where the balloon is his again, drifting back over him.
 *
 * Frame: Carl's seat is (-0.5, 0) (in at rest, out at rest: `exit` is [0, 0]); the set draws the room, and its window,
 * from the same point (`WARD`); this part draws the bed, her drip, the table with his flowers and its lamp, his chair,
 * and the light: the room going dark, and the lamp's light where it lands, on the wall and the table under it.
 */

/** Where this part's entry cell is: half a cell right of Carl's seat at her bedside (he enters at (-0.5, 0)). */
export const HOSPITAL_AT: Pt = [WARD[0] + 0.5, WARD[1]]

/** Carl's seat in this frame; the room is drawn from it. */
const O = -0.5

/* ------------------------------------------------------------------ the clock (show seconds) */

/** He leans to the lamp from here; it comes on, on its note. */
const REACH = 181.52
const CLICK = 182.433
/** The strongest note of the hospital: she rolls toward him. */
const TOUCH = 185.655
/** The next strong note: his answer, a lean to her, arrives on it. */
const ANSWER = 186.532

/**
 * He gives her the balloon: he leans to her from `lean`, and at the full of it the knot passes from his top corner to
 * her (`from` to `to`, quickly, so it is never long in the air between them), arriving on the strong note 184.883; it
 * floats over her from then to the cut (`score.ts` ties it to her).
 */
export const HAND = { lean: 183.7, from: 184.45, to: 184.883 }

/** Every strike of this part, in show seconds (check:shows holds each to the music): the lamp, and her roll. */
export const HOSPITAL_HITS: number[] = [CLICK, HAND.to, TOUCH]

/* ------------------------------------------------------------------ the room's things (room cells, from his seat) */

/** The bedside table: [x0, x1], its top. */
const TABLE = { x0: -0.9, x1: -0.3, top: 0.0 }
/** The lamp on it: its stem, the shade's bottom and top, and where its chain hangs from. */
const LAMP = { x: -0.58, bottom: -0.47, top: -0.76, wb: 0.46, wt: 0.3 }
const CHAIN: Pt = [LAMP.x + 0.15, LAMP.bottom + 0.02]
const CHAIN_L = 0.3
/**
 * The bed: from behind his chair to its foot; the mattress's top; her pillow. Her length, not a grown-up's: the foot
 * about a cell past her, so the mound under the covers is plainly her and the bed is not long and empty past her.
 */
const BED = { x0: -0.12, x1: 1.5, top: 0.21 }
const PILLOW = { x0: 0.1, x1: 0.9 }
/** Her drip's stand, behind the bed toward its foot, low enough to keep clear of the balloon over her: where, its top. */
const IV = { x: 1.2, top: -1.2 }
/** The glass of flowers he brought her, on the table left of the lamp's foot: where, how wide, how tall. */
const VASE = { x: -0.8, w: 0.085, h: 0.13 }

/* ------------------------------------------------------------------ the two of them */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const inout = (u: number) => { const v = clamp01(u); return v * v * (3 - 2 * v) }

/**
 * Carl's bearing: over to the lamp and back; then to her with the balloon, well over as the knot goes across, and
 * back a little, still turned to her when she rolls to him (TOUCH), and a touch further for his answer (on the next
 * strong note, ANSWER: her gesture and his each have their note); sitting up
 * again by the cut.
 */
function tilt(T: number): number {
  // Big enough to be seen at the ward's distance: at 10° to give her the balloon and 2.5° for his answer, a fresh
  // viewer saw neither of them move at all, and the knot's passing read as a string sliding, not a gift.
  const reach = -0.3 * inout((T - REACH) / (CLICK - REACH)) * (1 - inout((T - CLICK - 0.08) / 1.45))
  const give = 0.3 * inout((T - HAND.lean) / (HAND.to - HAND.lean)) - 0.15 * inout((T - HAND.to - 0.05) / 0.95)
  const answer = 0.12 * inout((T - TOUCH - 0.15) / (ANSWER - TOUCH - 0.15))
  return reach + (give + answer) * (1 - inout((T - 187.55) / 1.6))
}

/**
 * Her roll toward him, a little under half a ball's width: it eases from rest just before the note, is under way on
 * it, is at its quickest a breath after, and settles long, stopping short of him.
 */
const roll = (T: number): number => -0.11 * inout(1 - Math.pow(1 - clamp01((T - TOUCH + 0.2) / 1.45), 1.8))

/** Where she is at `T`, in room cells. */
function herAt(T: number): Pt {
  return [WARD_APART + roll(T), 0]
}

/** Where he is at `T`, in room cells: his seat, moved as he tips over a bottom corner. */
function carlAt(T: number): Pt {
  return lean(tilt(T))
}

/** The lamp: off, then on from its note, warming in a tenth of a second. */
const lampOn = (T: number): number => (T < CLICK ? 0 : 1 - Math.exp(-(T - CLICK) / 0.09))
/** The chain's swing (radians): still, then kicked on the click and swinging down to rest. */
const chainSwing = (T: number): number => (T < CLICK ? 0 : -0.32 * Math.exp(-(T - CLICK) / 0.85) * Math.sin((2 * Math.PI * (T - CLICK)) / 0.74))

/* ------------------------------------------------------------------ drawing (room cells) */

/**
 * The bedside table. It is drawn after the room has darkened (so the lamp's light can land on the wall behind it), so
 * it darkens itself as the room does (`dim`); its top is in the lamp's light once it is on (`on`).
 */
function drawTable(p: p5, k: number, weight: number, dim: number, on: number): void {
  const { x0, x1, top } = TABLE
  const steel0 = mixHex(CLINIC.steel, CLINIC.wall, 0.35)
  const steel = dimmed(steel0, dim)
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(steel)
  // The cabinet on short legs; its top a little proud.
  p.rect((x0 + 0.03) * k, (top + 0.04) * k, (x1 - x0 - 0.06) * k, (FLOOR - 0.1 - top - 0.04) * k, 0.02 * k)
  p.fill(mixHex(dimmed(mixHex(steel0, CLINIC.light, 0.25), dim), HOME.lamp, 0.55 * on))
  p.rect(x0 * k, top * k, (x1 - x0) * k, 0.05 * k, 0.015 * k)
  // The lip of the top throws a thin shade on the cabinet's face under it.
  p.noStroke()
  p.fill(alpha(p, INK, 0.16))
  p.rect((x0 + 0.045) * k, (top + 0.05) * k, (x1 - x0 - 0.09) * k, 0.025 * k)
  // A drawer and its pull, and the cupboard under it.
  p.noFill()
  p.stroke(alpha(p, INK, 0.55))
  p.strokeWeight(weight * 0.6)
  p.rect((x0 + 0.07) * k, (top + 0.09) * k, (x1 - x0 - 0.14) * k, 0.13 * k, 0.01 * k)
  p.rect((x0 + 0.07) * k, (top + 0.26) * k, (x1 - x0 - 0.14) * k, (FLOOR - 0.16 - top - 0.26) * k, 0.01 * k)
  p.noStroke()
  p.fill(INK)
  p.rect(((x0 + x1) / 2 - 0.05) * k, (top + 0.145) * k, 0.1 * k, 0.025 * k, 0.01 * k)
  // Legs.
  tube(p, k, weight, x0 + 0.07, FLOOR - 0.1, x0 + 0.07, FLOOR - 0.01, 0.9, dimmed(CLINIC.steel, dim))
  tube(p, k, weight, x1 - 0.07, FLOOR - 0.1, x1 - 0.07, FLOOR - 0.01, 0.9, dimmed(CLINIC.steel, dim))
  p.pop()
}

/**
 * The lamp: a round foot, a stem, a drum shade, warm through its cloth when it is on; its pull chain swinging. Drawn
 * after the room has darkened, like the table: its foot and stem stand in its own light.
 */
function drawLamp(p: p5, k: number, weight: number, T: number, dim: number): void {
  const on = lampOn(T)
  const { x, bottom, top, wb, wt } = LAMP
  const tone = (hex: string, lit: number) => mixHex(dimmed(hex, dim), HOME.lamp, lit * on)
  p.push()
  // The foot and the stem.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(tone(mixHex(HOME.woodDark, CLINIC.steel, 0.3), 0.3))
  p.beginShape()
  p.vertex((x - 0.1) * k, (TABLE.top - 0.002) * k)
  p.bezierVertex((x - 0.1) * k, (TABLE.top - 0.05) * k, (x - 0.04) * k, (TABLE.top - 0.06) * k, (x - 0.02) * k, (TABLE.top - 0.07) * k)
  p.vertex((x + 0.02) * k, (TABLE.top - 0.07) * k)
  p.bezierVertex((x + 0.04) * k, (TABLE.top - 0.06) * k, (x + 0.1) * k, (TABLE.top - 0.05) * k, (x + 0.1) * k, (TABLE.top - 0.002) * k)
  p.endShape(p.CLOSE)
  tube(p, k, weight, x, TABLE.top - 0.07, x, bottom + 0.02, 0.9, tone(mixHex(HOME.brass, CLINIC.steel, 0.4), 0.35))
  // The chain, from the socket under the shade, and its little pull.
  const a = chainSwing(T)
  const bx = CHAIN[0] + Math.sin(a) * CHAIN_L
  const by = CHAIN[1] + Math.cos(a) * CHAIN_L
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(Math.max(1, weight * 0.4))
  p.line(CHAIN[0] * k, CHAIN[1] * k, bx * k, by * k)
  p.noStroke()
  p.fill(tone(mixHex(HOME.brass, INK, 0.2), 0.3))
  p.push()
  p.translate(bx * k, by * k)
  p.rotate(-a)
  p.rectMode(p.CENTER)
  p.rect(0, 0.015 * k, 0.03 * k, 0.045 * k, 0.012 * k)
  p.pop()
  // The shade: a drum, narrower at the top, cream when off, the bulb's warmth through it when on.
  const cloth = tone(mixHex(CLINIC.sheet, CLINIC.steel, 0.12), 0.85)
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(cloth)
  p.quad((x - wt / 2) * k, top * k, (x + wt / 2) * k, top * k, (x + wb / 2) * k, bottom * k, (x - wb / 2) * k, bottom * k)
  // Its seams: two faint lines down the drum.
  p.stroke(alpha(p, INK, 0.2))
  p.strokeWeight(weight * 0.45)
  for (const s of [-0.33, 0.33]) p.line((x + (s * wt) / 2) * k, top * k, (x + (s * wb) / 2) * k, bottom * k)
  p.pop()
}

/** The flowers' heads: [x, y, colour], leaning out of the glass under the shade's near edge. */
const BLOOMS: [number, number, string][] = [
  [-0.905, -0.3, HOME.yellow],
  [-0.855, -0.37, CHURCH.flowers],
  [-0.79, -0.35, CLINIC.sheet],
  [-0.735, -0.29, CHURCH.flowers],
  [-0.84, -0.27, CLINIC.sheet],
]

/**
 * The flowers he brought her, in a glass of water on the table by the lamp, and a card stood beside the lamp's foot (no
 * words on it). Drawn after the room has darkened, and in the lamp's light once it is on; their heads stir a hair.
 */
function drawFlowers(p: p5, k: number, weight: number, T: number, dim: number, on: number): void {
  const tone = (hex: string, lit: number) => mixHex(dimmed(hex, dim), HOME.lamp, lit * on)
  const { x, w, h } = VASE
  const y0 = TABLE.top
  p.push()
  p.rectMode(p.CORNER)
  // The stems, and a leaf or two on them.
  p.noFill()
  p.stroke(tone(mixHex(HOME.leaf, CLINIC.steel, 0.2), 0.2))
  p.strokeWeight(weight * 0.5)
  const heads = BLOOMS.map(([bx, by], i): Pt => [bx + 0.006 * wobble(T, 90 + i, 2.4), by + 0.003 * wobble(T, 95 + i, 2.1)])
  heads.forEach(([bx, by]) => {
    const sx = x + (bx - x) * 0.25
    p.beginShape()
    p.vertex(sx * k, (y0 - 0.02) * k)
    p.quadraticVertex(sx * k, (y0 - h - 0.06) * k, bx * k, by * k)
    p.endShape()
  })
  p.noStroke()
  p.fill(tone(mixHex(HOME.leaf, CLINIC.steel, 0.2), 0.2))
  p.ellipse((x - 0.045) * k, (y0 - h - 0.04) * k, 0.06 * k, 0.025 * k)
  p.ellipse((x + 0.04) * k, (y0 - h - 0.025) * k, 0.055 * k, 0.022 * k)
  // The glass: the stems through it, the water's line.
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.6)
  p.fill(alpha(p, tone(mixHex(HOME.glass, CLINIC.wall, 0.3), 0.3), 0.7))
  p.quad((x - w / 2) * k, (y0 - h) * k, (x + w / 2) * k, (y0 - h) * k, (x + w * 0.4) * k, y0 * k, (x - w * 0.4) * k, y0 * k)
  p.stroke(alpha(p, INK, 0.3))
  p.strokeWeight(weight * 0.4)
  p.line((x - w * 0.46) * k, (y0 - h * 0.6) * k, (x + w * 0.46) * k, (y0 - h * 0.6) * k)
  // The heads: a ring of petals in one colour, the middle darker.
  heads.forEach(([bx, by], i) => {
    p.stroke(alpha(p, INK, 0.75))
    p.strokeWeight(weight * 0.45)
    p.fill(tone(BLOOMS[i][2], 0.3))
    p.circle(bx * k, by * k, 0.055 * k)
    p.noStroke()
    p.fill(tone(mixHex(HOME.yellow, HOME.woodDark, 0.4), 0.25))
    p.circle(bx * k, by * k, 0.018 * k)
  })
  // The card, folded and stood up: cream, a band of colour across it.
  const cx0 = LAMP.x + 0.13
  p.stroke(alpha(p, INK, 0.8))
  p.strokeWeight(weight * 0.55)
  p.fill(tone(HOME.trim, 0.35))
  p.quad(cx0 * k, y0 * k, (cx0 + 0.015) * k, (y0 - 0.09) * k, (cx0 + 0.095) * k, (y0 - 0.09) * k, (cx0 + 0.09) * k, y0 * k)
  p.noStroke()
  p.fill(tone(HOME.pink, 0.3))
  p.rect((cx0 + 0.025) * k, (y0 - 0.06) * k, 0.055 * k, 0.025 * k)
  p.pop()
}

/** Her drip: a drop gathers in the chamber under the bag and falls, one every this many seconds. */
const DRIP = 1.7

/**
 * Her drip, on its stand behind the bed past her: the bag hung on its hook, nearly full, the little chamber under it
 * where a drop gathers and falls, slowly, and the line down to her under the covers.
 */
function drawIV(p: p5, k: number, weight: number, T: number): void {
  const { x, top } = IV
  const steel = mixHex(CLINIC.steel, CLINIC.sheet, 0.3)
  const bx = x + 0.05
  const b0 = top + 0.07
  const b1 = top + 0.33
  const c0 = b1 + 0.035
  const c1 = c0 + 0.085
  p.push()
  p.rectMode(p.CORNER)
  // The line: from the chamber, hanging down by the pole and turning in under her covers.
  p.noFill()
  p.stroke(alpha(p, INK, 0.5))
  p.strokeWeight(Math.max(1, weight * 0.35))
  p.bezier(bx * k, c1 * k, bx * k, (c1 + 0.45) * k, (x - 0.06) * k, 0.02 * k, 0.9 * k, 0.12 * k)
  // The pole, its crossbar and hooks.
  tube(p, k, weight, x, FLOOR - 0.06, x, top, 0.85, steel)
  tube(p, k, weight, x - 0.07, top + 0.015, x + 0.07, top + 0.015, 0.7, steel)
  tube(p, k, weight, x - 0.07, top + 0.015, x - 0.075, top - 0.02, 0.6, steel)
  tube(p, k, weight, x + 0.07, top + 0.015, x + 0.075, top - 0.02, 0.6, steel)
  // The bag, hung by its tab from the right hook: clear plastic, full but for a little air at the top.
  p.stroke(alpha(p, INK, 0.7))
  p.strokeWeight(weight * 0.5)
  p.line(bx * k, (top + 0.015) * k, bx * k, b0 * k)
  p.strokeWeight(weight * 0.65)
  p.fill(mixHex(CLINIC.sheet, HOME.glass, 0.55))
  p.rect((bx - 0.058) * k, b0 * k, 0.116 * k, (b1 - b0) * k, 0.022 * k, 0.022 * k, 0.04 * k, 0.04 * k)
  p.noStroke()
  p.fill(mixHex(CLINIC.light, CLINIC.sheet, 0.5))
  p.rect((bx - 0.048) * k, (b0 + 0.012) * k, 0.096 * k, 0.04 * k, 0.014 * k)
  // Its port, and the chamber: a little clear tube, the fluid in its foot, a drop at its top gathering, then falling.
  p.stroke(alpha(p, INK, 0.7))
  p.strokeWeight(weight * 0.5)
  p.line(bx * k, b1 * k, bx * k, c0 * k)
  p.fill(mixHex(CLINIC.light, HOME.glass, 0.4))
  p.rect((bx - 0.02) * k, c0 * k, 0.04 * k, (c1 - c0) * k, 0.01 * k)
  p.noStroke()
  const water = mixHex(HOME.glass, CLINIC.steel, 0.35)
  p.fill(water)
  p.rect((bx - 0.016) * k, (c1 - 0.03) * k, 0.032 * k, 0.026 * k, 0.006 * k)
  const u = (((T - W_IN) / DRIP) % 1 + 1) % 1
  const r = u < 0.78 ? 0.004 + 0.006 * (u / 0.78) : 0.009
  const dy = u < 0.78 ? 0 : (c1 - c0 - 0.05) * ((u - 0.78) / 0.22) ** 2
  p.circle(bx * k, (c0 + 0.012 + r + dy) * k, 2 * r * k)
  p.pop()
}

/** His chair, and the bed beside it: steel, a mattress, her pillow pressed where she lies, the rails (the blanket is in front of her: `drawCovers`). */
function drawBed(p: p5, k: number, weight: number, ex: number, dim: number): void {
  const sheet = mixHex(CLINIC.sheet, CLINIC.steel, 0.08)
  const frameSteel = mixHex(CLINIC.steel, CLINIC.sheet, 0.3)
  const { x0, x1, top } = BED
  p.push()
  p.rectMode(p.CORNER)
  // The wall a shade darker under the bed: it stands on the floor.
  p.noStroke()
  p.fill(alpha(p, INK, 0.1))
  p.rect((x0 + 0.03) * k, (top + 0.2) * k, (x1 - x0 - 0.2) * k, (FLOOR - top - 0.2) * k, 0.03 * k)
  // The head rail, behind the chair: a tube hoop.
  tube(p, k, weight, x0 + 0.04, 0.5, x0 + 0.04, -0.3, 1.1, frameSteel)
  // The foot rail: a hoop, a crossbar.
  tube(p, k, weight, x1 - 0.06, FLOOR - 0.08, x1 - 0.06, -0.32, 1.1, frameSteel)
  tube(p, k, weight, x1 - 0.06, -0.32, x1 - 0.24, -0.32, 1.1, frameSteel)
  tube(p, k, weight, x1 - 0.24, -0.32, x1 - 0.24, top, 1.1, frameSteel)
  tube(p, k, weight, x1 - 0.06, -0.12, x1 - 0.24, -0.12, 0.8, frameSteel)
  // The frame under the mattress, the legs, the castors, the crank at the foot.
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(frameSteel)
  p.rect(x0 * k, (top + 0.15) * k, (x1 - x0) * k, 0.07 * k, 0.01 * k)
  for (const lx of [x0 + 0.1, x1 - 0.14]) {
    tube(p, k, weight, lx, top + 0.22, lx, FLOOR - 0.07, 1.05, frameSteel)
    p.stroke(INK)
    p.strokeWeight(weight * 0.7)
    p.fill(mixHex(INK, CLINIC.steel, 0.35))
    p.ellipse(lx * k, (FLOOR - 0.04) * k, 0.08 * k, 0.08 * k)
  }
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.beginShape()
  p.vertex((x1 - 0.02) * k, (top + 0.19) * k)
  p.vertex((x1 + 0.07) * k, (top + 0.19) * k)
  p.vertex((x1 + 0.07) * k, (top + 0.3) * k)
  p.vertex((x1 + 0.13) * k, (top + 0.3) * k)
  p.endShape()
  // The mattress.
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(sheet)
  p.rect((x0 - 0.02) * k, top * k, (x1 - x0 - 0.2) * k, 0.15 * k, 0.05 * k)
  // Her pillow: plump at its ends and pressed down where she lies.
  const { x0: q0, x1: q1 } = PILLOW
  const pillowTop = (x: number): number => {
    const d = (x - ex) / 0.17
    const plump = top - 0.07 - 0.035 * Math.sin(Math.PI * clamp01((x - q0) / (q1 - q0)))
    return plump + Math.max(0, SEAT + 0.005 - plump) * Math.exp(-d * d)
  }
  p.fill(mixHex(CLINIC.sheet, CLINIC.light, 0.5))
  p.beginShape()
  p.vertex(q0 * k, (top + 0.005) * k)
  p.bezierVertex((q0 - 0.05) * k, (top - 0.01) * k, (q0 - 0.04) * k, (pillowTop(q0) - 0.02) * k, (q0 + 0.03) * k, pillowTop(q0 + 0.03) * k)
  for (let i = 1; i <= 24; i++) {
    const x = q0 + 0.03 + ((q1 - q0 - 0.06) * i) / 24
    p.vertex(x * k, pillowTop(x) * k)
  }
  p.bezierVertex((q1 + 0.04) * k, (pillowTop(q1) - 0.02) * k, (q1 + 0.05) * k, (top - 0.01) * k, q1 * k, (top + 0.005) * k)
  p.endShape(p.CLOSE)
  // A clipboard on the foot rail: her chart, its page a blank light.
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.fill(mixHex(HOME.wood, CLINIC.steel, 0.3))
  p.rect((x1 - 0.235) * k, -0.22 * k, 0.16 * k, 0.24 * k, 0.015 * k)
  p.noStroke()
  p.fill(mixHex(CLINIC.sheet, CLINIC.steel, 0.1 + dim * 0.2))
  p.rect((x1 - 0.215) * k, -0.19 * k, 0.12 * k, 0.19 * k)
  p.fill(CLINIC.steel)
  p.rect((x1 - 0.19) * k, -0.235 * k, 0.07 * k, 0.04 * k, 0.01 * k)
  p.pop()
}

/**
 * The day going out of the room: it darkens and blues, all but the window's glass, which has its own sky. Drawn under
 * the two of them (in the part's draw), so they and the balloon keep their colours as the room goes.
 */
function dusk(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const d = wardDusk(T)
  if (d.dim <= 0.005) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  ctx.save()
  ctx.beginPath()
  ctx.rect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  ctx.rect((WINDOW.x0 + O) * k, WINDOW.y0 * k, (WINDOW.x1 - WINDOW.x0) * k, (WINDOW.y1 - WINDOW.y0) * k)
  ctx.clip('evenodd')
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = hexA(mixHex(HOME.night, CLINIC.steel, 0.35), 0.5 * d.dim)
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  ctx.restore()
}

/**
 * The lamp's light where it lands, once it is on: under the shade a fan of it down the wall to the table, and over the
 * shade the light out of its open top, up the wall. Each is the shape a drum shade throws on a wall close behind it,
 * its edges curving in to the shade's rim, soft at the edge, fading as it goes from the bulb; nothing round the shade
 * itself. Drawn after the room has darkened and on the wall only (not on the window's glass, nor past the table onto
 * his chair), under what stands on the table, which is lit as it is drawn. Room cells.
 */
function lampLight(p: p5, k: number, T: number): void {
  const on = lampOn(T)
  if (on <= 0.005) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const { x, bottom, top } = LAMP
  ctx.save()
  ctx.beginPath()
  ctx.rect((x - 3) * k, (CEIL - 1) * k, 6 * k, (-0.12 - CEIL + 1) * k)
  ctx.rect((x - 3) * k, -0.12 * k, (3 + TABLE.x1 - x + 0.05) * k, (TABLE.top + 0.12) * k)
  ctx.clip()
  ctx.beginPath()
  ctx.rect((x - 3) * k, (CEIL - 1) * k, 6 * k, 4 * k)
  ctx.rect(WINDOW.x0 * k, WINDOW.y0 * k, (WINDOW.x1 - WINDOW.x0) * k, (WINDOW.y1 - WINDOW.y0) * k)
  ctx.clip('evenodd')
  // One side of the light, from the shade's rim (`y0`, as wide there as the rim) out `len` to where it is gone or
  // stopped, flaring to `w1`: the sides bow out a little near the rim, as a shade's light on a wall close behind it does.
  const flare = (y0: number, dir: number, w0: number, w1: number, len: number) => {
    const n = 8
    const side = (u: number) => w0 + (w1 - w0) * Math.pow(u, 0.7)
    ctx.moveTo((x - w0) * k, y0 * k)
    for (let i = 1; i <= n; i++) ctx.lineTo((x - side(i / n)) * k, (y0 + (dir * len * i) / n) * k)
    for (let i = n; i >= 0; i--) ctx.lineTo((x + side(i / n)) * k, (y0 + (dir * len * i) / n) * k)
    ctx.closePath()
  }
  // Down, under the shade, to the table's top: a skirt of it, as wide there as the table.
  const down = ctx.createLinearGradient(0, bottom * k, 0, TABLE.top * k)
  down.addColorStop(0, hexA(HOME.lamp, 0.5 * on))
  down.addColorStop(1, hexA(HOME.lamp, 0.3 * on))
  // Up, out of the open top: fainter, and gone a little way up the wall.
  const RISE = 0.48
  const up = ctx.createLinearGradient(0, top * k, 0, (top - RISE) * k)
  up.addColorStop(0, hexA(HOME.lamp, 0.18 * on))
  up.addColorStop(1, hexA(HOME.lamp, 0))
  ctx.globalAlpha = 0.36
  for (let pass = 0; pass < 3; pass++) {
    const soft = 0.022 * (2 - pass)
    ctx.fillStyle = down
    ctx.beginPath()
    flare(bottom - 0.01, 1, LAMP.wb / 2 - 0.03 + soft * 0.5, 0.31 + soft, TABLE.top - bottom + 0.01)
    ctx.fill()
    ctx.fillStyle = up
    ctx.beginPath()
    flare(top + 0.01, -1, LAMP.wt / 2 - 0.02 + soft * 0.5, 0.36 + soft * 1.5, RISE)
    ctx.fill()
  }
  ctx.restore()
}

/** A colour as the ward's dusk leaves it (`dusk`'s multiply, worked out here for what is drawn in front of the cast). */
function dimmed(hex: string, dim: number): string {
  const a = 0.5 * dim
  const m = mixHex(HOME.night, CLINIC.steel, 0.35)
  const ch = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16)
  const out = [0, 1, 2].map((i) => Math.round(ch(hex, i) * (1 - a + (a * ch(m, i)) / 255)))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Her covers, in front of her: she is in the bed, not on it. The blanket comes up over the lower third of her from just
 * on her far side, a soft mound where she lies under it, and down to the foot, hanging over the mattress's near side;
 * the sheet turned down over its top edge. It starts clear of his chair at his fullest lean, so it never covers him.
 */
function drawCovers(p: p5, k: number, weight: number, ex: number, dim: number, on: number): void {
  // The lamp's light reaches her bed a little once it is on: the sheet most, at its turn-down nearest the lamp.
  const blanket = mixHex(dimmed(mixHex(mixHex(CLINIC.wall, HOME.sky, 0.35), CLINIC.sheet, 0.25), dim), HOME.lamp, 0.06 * on)
  const sheet = mixHex(dimmed(mixHex(CLINIC.sheet, CLINIC.steel, 0.08), dim), HOME.lamp, 0.12 * on)
  const { x1, top } = BED
  const b0 = ex - 0.16
  const hang = top + 0.24
  // The top edge, from her far side to the foot: across her, over the mound of her, down to the mattress.
  const edge = (p: p5, dy: number) => {
    p.vertex(b0 * k, (0.09 + dy) * k)
    p.bezierVertex((b0 + 0.07) * k, (0.07 + dy) * k, (ex - 0.04) * k, (0.06 + dy) * k, (ex + 0.06) * k, (0.06 + dy) * k)
    p.bezierVertex((ex + 0.16) * k, (0.06 + dy) * k, (ex + 0.22) * k, (0.05 + dy) * k, (ex + 0.32) * k, (0.06 + dy) * k)
    p.bezierVertex((ex + 0.48) * k, (0.08 + dy) * k, (ex + 0.56) * k, (top - 0.04 + dy) * k, (ex + 0.72) * k, (top - 0.035 + dy) * k)
  }
  p.push()
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(blanket)
  p.beginShape()
  edge(p, 0)
  p.vertex((x1 - 0.2) * k, (top - 0.03) * k)
  p.vertex((x1 - 0.2) * k, hang * k)
  p.bezierVertex((x1 - 0.45) * k, (hang + 0.025) * k, (b0 + 0.3) * k, (hang + 0.01) * k, (b0 + 0.02) * k, hang * k)
  p.bezierVertex((b0 - 0.03) * k, (hang - 0.09) * k, (b0 - 0.03) * k, 0.13 * k, b0 * k, 0.09 * k)
  p.endShape(p.CLOSE)
  // The sheet turned down over the blanket's top, across her and over the mound.
  p.fill(sheet)
  p.strokeWeight(weight * 0.7)
  p.beginShape()
  p.vertex(b0 * k, 0.09 * k)
  p.bezierVertex((b0 + 0.07) * k, 0.07 * k, (ex - 0.04) * k, 0.06 * k, (ex + 0.06) * k, 0.06 * k)
  p.bezierVertex((ex + 0.16) * k, 0.06 * k, (ex + 0.22) * k, 0.05 * k, (ex + 0.32) * k, 0.06 * k)
  p.vertex((ex + 0.32) * k, 0.115 * k)
  p.bezierVertex((ex + 0.22) * k, 0.105 * k, (ex + 0.16) * k, 0.12 * k, (ex + 0.06) * k, 0.12 * k)
  p.bezierVertex((ex - 0.04) * k, 0.12 * k, (b0 + 0.06) * k, 0.13 * k, (b0 - 0.005) * k, 0.15 * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/**
 * Under Zoom, the hold through her touch and his answer (`Framing.zoomDrop`, negative: above the frame's middle): the
 * show's frame comes down onto the two of them there, and Zoom, half as close again, would then lose the balloon over
 * them; it keeps the hold it had (a cell and a half over the floor), easing in with the camera's move and out with the
 * draw back to the cut.
 */
export function hospitalZoomDrop(T: number): number {
  const ease = (a: number, b: number) => {
    const u = clamp01((T - a) / (b - a))
    return u * u * (3 - 2 * u)
  }
  return -0.19 * ease(HAND.to, TOUCH + 0.6) * (1 - ease(187.1, CUT.funeral))
}

/* ------------------------------------------------------------------ the part */

interface HospitalState {
  begin: number
}

export const hospital = part<HospitalState>(
  {
    name: 'hospital',
    draw: (p, s, c) => {
      const T = c.t + s.begin
      const { k, weight } = c
      const [ex] = herAt(Math.max(W_IN, Math.min(W_OUT, T)))
      const { dim } = wardDusk(T)
      const on = lampOn(T)
      p.push()
      p.translate(O * k, 0)
      drawIV(p, k, weight, T)
      drawBed(p, k, weight, ex, dim)
      drawVisitorChair(p, k, weight, 0, 0, 0, { low: true })
      p.pop()
      dusk(p, c, T)
      // Then the lamp's light on the wall, and the table, the flowers and the lamp in it, darkened as the room is.
      p.push()
      p.translate(O * k, 0)
      lampLight(p, k, T)
      drawTable(p, k, weight, dim, on)
      drawFlowers(p, k, weight, T, dim, on)
      drawLamp(p, k, weight, T, dim)
      p.pop()
    },
    over: (p, s, c) => {
      const T = c.t + s.begin
      const [ex] = herAt(Math.max(W_IN, Math.min(W_OUT, T)))
      p.push()
      p.translate(O * c.k, 0)
      drawCovers(p, c.k, c.weight, ex, wardDusk(T).dim, lampOn(T))
      p.pop()
    },
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const lane = carried((t) => { const [x, y] = carlAt(slot.begin + t); return [O + x, y] }, 0, dur, Math.max(1, Math.round(dur / 0.04)))
    // Slumped as she lay on the hill, across the cut, and settling round under the covers over its first second.
    const slumped = slumpOf(CUT.hospital - 1e-3)
    const her = (T: number): Companion => {
      const [x, y] = herAt(T)
      const left = slumped ? 1 - inout((T - CUT.hospital) / 1.2) : 0
      if (left <= 0 || !slumped) return { x: O + x, y }
      const scale = 1 - (1 - slumped.scale) * left
      return { x: O + x, y: y + R * (1 - scale), scale, stretch: 1 + (slumped.stretch - 1) * left }
    }
    const pose: Pose[] = [{ from: slot.begin, to: slot.end, at: (T) => ({ tilt: tilt(T) }) }]
    return {
      cells: box(-5.5, -3.5, 5, 2),
      exit: [0, 0] as Pt,
      lane: { segs: lane, fire: CLICK - slot.begin },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: her }],
      pose,
    }
  },
  (slot) => [
    // From the hill's close framing (`CUTS.hospital`), out and over to the lamp as he reaches for it, and up, so the
    // balloon over him comes whole into the frame (he comes in with its string gathered short, `GATHERS`, and lets it
    // up as he reaches for the lamp; let out, Zoom wants about 3.35 cells with the frame's middle near a cell over
    // them). Then he gives it to her, tied short, and it comes down to float
    // just over her; the camera comes in with it to the two of them, closing on her roll toward him (185.655, the
    // film's touch) and his answer, the balloon whole over them under Zoom, and stays a moment.
    { t: CLICK, cells: 3.3, hold: [O + 0.02, -0.93], w: 1 },
    { t: HAND.to, cells: 3.36, hold: [O + 0.4, -0.97], w: 1 },
    // The touch and his answer sit two thirds down the frame, not on its foot under a wall (the balloon is tied short
    // to her now, so the frame can come down onto them); Zoom keeps its own, higher hold (`hospitalZoomDrop`).
    { t: TOUCH + 0.6, cells: 2.7, hold: [O + 0.36, -0.45], w: 1 },
    { t: 187.1, cells: 2.67, hold: [O + 0.35, -0.45], w: 1 },
    // Then, as she is still again, the leaving starts: one slow draw back, unbroken, through the cut to the church
    // (`CUTS.funeral`) and on into it. The balloon whole over her; across the cut it is his again, and drifts back over
    // him in the empty church as its string is let out.
    { t: slot.end, cells: CUTS.funeral.cells, hold: [O + CUTS.funeral.frame[0], CUTS.funeral.frame[1]], w: 1 },
  ],
)

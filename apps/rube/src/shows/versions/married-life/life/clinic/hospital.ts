import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { alpha, box, carried, frame, part, type Companion, type Ctx, type Pose } from '../kit'
import { CLINIC, HOME, INK } from '../worlds'
import { CEIL, drawVisitorChair, FLOOR, hexA, lean, SEAT, tube, W_IN, W_OUT, WARD, WARD_APART, wardDusk, WINDOW } from './clinic'

/**
 * HOSPITAL (180.413 to 189.452): her bed, the balloon he brought her, the day going down. Strings and piano, free.
 *
 * She lies in the bed at the height of his chair, a little to his right (`CUTS.hospital`), turned up to the ceiling,
 * very still. He sits at her bedside with the balloon (the cast draws it, tied to him) over him. Behind them the
 * window's sky goes from gold to rose to night over the nine seconds, and the room darkens with it. As it goes he
 * leans to the lamp on the bedside table and it comes on, on its note (182.433): the one warm light. On the strongest
 * note (185.655) she turns the smallest roll toward him, the film's touch; he answers with a lean. The camera pushes
 * in on the two of them for it, and breathes back out to him and the balloon, and on the cut (189.452) he is sitting upright, at rest, the
 * balloon over him, and she is gone: the far side is the empty church.
 *
 * Frame: Carl's seat is (-0.5, 0) (in at rest, out at rest: `exit` is [0, 0]); the set draws the room, and its window,
 * from the same point (`WARD`); this part draws the bed, the table and its lamp, his chair, and the light.
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

/** Every strike of this part, in show seconds (check:shows holds each to the music): the lamp, and her roll. */
export const HOSPITAL_HITS: number[] = [CLICK, TOUCH]

/* ------------------------------------------------------------------ the room's things (room cells, from his seat) */

/** The bedside table: [x0, x1], its top. */
const TABLE = { x0: -0.9, x1: -0.3, top: 0.0 }
/** The lamp on it: its stem, the shade's bottom and top, and where its chain hangs from. */
const LAMP = { x: -0.58, bottom: -0.47, top: -0.76, wb: 0.46, wt: 0.3 }
const CHAIN: Pt = [LAMP.x + 0.15, LAMP.bottom + 0.02]
const CHAIN_L = 0.3
/** The bed: from behind his chair to its foot; the mattress's top; her pillow. */
const BED = { x0: -0.12, x1: 2.72, top: 0.21 }
const PILLOW = { x0: 0.1, x1: 0.9 }

/* ------------------------------------------------------------------ the two of them */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const inout = (u: number) => { const v = clamp01(u); return v * v * (3 - 2 * v) }

/** Carl's bearing: over to the lamp and back, and, after her touch, a little toward her, sitting up again by the cut. */
function tilt(T: number): number {
  const reach = -0.3 * inout((T - REACH) / (CLICK - REACH)) * (1 - inout((T - CLICK - 0.08) / 1.45))
  const answer = 0.075 * inout((T - TOUCH - 0.25) / 1.15) * (1 - inout((T - 187.55) / 1.6))
  return reach + answer
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

function drawTable(p: p5, k: number, weight: number): void {
  const { x0, x1, top } = TABLE
  const steel = mixHex(CLINIC.steel, CLINIC.wall, 0.35)
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(INK)
  p.strokeWeight(weight * 0.85)
  p.fill(steel)
  // The cabinet on short legs; its top a little proud.
  p.rect((x0 + 0.03) * k, (top + 0.04) * k, (x1 - x0 - 0.06) * k, (FLOOR - 0.1 - top - 0.04) * k, 0.02 * k)
  p.fill(mixHex(steel, CLINIC.light, 0.25))
  p.rect(x0 * k, top * k, (x1 - x0) * k, 0.05 * k, 0.015 * k)
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
  tube(p, k, weight, x0 + 0.07, FLOOR - 0.1, x0 + 0.07, FLOOR - 0.01, 0.9)
  tube(p, k, weight, x1 - 0.07, FLOOR - 0.1, x1 - 0.07, FLOOR - 0.01, 0.9)
  p.pop()
}

/** The lamp: a round foot, a stem, a drum shade that glows warm when it is on; its pull chain swinging. */
function drawLamp(p: p5, k: number, weight: number, T: number): void {
  const on = lampOn(T)
  const { x, bottom, top, wb, wt } = LAMP
  p.push()
  // The foot and the stem.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(HOME.woodDark, CLINIC.steel, 0.3))
  p.beginShape()
  p.vertex((x - 0.1) * k, (TABLE.top - 0.002) * k)
  p.bezierVertex((x - 0.1) * k, (TABLE.top - 0.05) * k, (x - 0.04) * k, (TABLE.top - 0.06) * k, (x - 0.02) * k, (TABLE.top - 0.07) * k)
  p.vertex((x + 0.02) * k, (TABLE.top - 0.07) * k)
  p.bezierVertex((x + 0.04) * k, (TABLE.top - 0.06) * k, (x + 0.1) * k, (TABLE.top - 0.05) * k, (x + 0.1) * k, (TABLE.top - 0.002) * k)
  p.endShape(p.CLOSE)
  tube(p, k, weight, x, TABLE.top - 0.07, x, bottom + 0.02, 0.9, mixHex(HOME.brass, CLINIC.steel, 0.4))
  // The chain, from the socket under the shade, and its little pull.
  const a = chainSwing(T)
  const bx = CHAIN[0] + Math.sin(a) * CHAIN_L
  const by = CHAIN[1] + Math.cos(a) * CHAIN_L
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(Math.max(1, weight * 0.4))
  p.line(CHAIN[0] * k, CHAIN[1] * k, bx * k, by * k)
  p.noStroke()
  p.fill(mixHex(HOME.brass, INK, 0.2))
  p.push()
  p.translate(bx * k, by * k)
  p.rotate(-a)
  p.rectMode(p.CENTER)
  p.rect(0, 0.015 * k, 0.03 * k, 0.045 * k, 0.012 * k)
  p.pop()
  // The shade: a drum, narrower at the top, cream when off, the bulb's warmth through it when on.
  const cloth = mixHex(mixHex(CLINIC.sheet, CLINIC.steel, 0.12), HOME.lamp, on * 0.85)
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

/** His chair, and the bed beside it: steel, a mattress, her pillow pressed where she lies, the blanket, the rails. */
function drawBed(p: p5, k: number, weight: number, ex: number, dim: number): void {
  const sheet = mixHex(CLINIC.sheet, CLINIC.steel, 0.08)
  const blanket = mixHex(mixHex(CLINIC.wall, HOME.sky, 0.35), CLINIC.sheet, 0.25)
  const frameSteel = mixHex(CLINIC.steel, CLINIC.sheet, 0.3)
  const { x0, x1, top } = BED
  p.push()
  p.rectMode(p.CORNER)
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
  // The blanket, from her side to the foot, hanging over the mattress's near side; the sheet turned down over it.
  const b0 = ex + 0.155
  p.fill(blanket)
  p.beginShape()
  p.vertex(b0 * k, (top - 0.035) * k)
  p.bezierVertex((b0 + 0.3) * k, (top - 0.05) * k, (x1 - 0.6) * k, (top - 0.04) * k, (x1 - 0.2) * k, (top - 0.03) * k)
  p.vertex((x1 - 0.2) * k, (top + 0.24) * k)
  p.bezierVertex((x1 - 0.7) * k, (top + 0.27) * k, (b0 + 0.4) * k, (top + 0.25) * k, (b0 + 0.02) * k, (top + 0.24) * k)
  p.bezierVertex((b0 - 0.03) * k, (top + 0.15) * k, (b0 - 0.03) * k, (top + 0.02) * k, b0 * k, (top - 0.035) * k)
  p.endShape(p.CLOSE)
  p.fill(sheet)
  p.beginShape()
  p.vertex(b0 * k, (top - 0.035) * k)
  p.bezierVertex((b0 + 0.08) * k, (top - 0.045) * k, (b0 + 0.18) * k, (top - 0.045) * k, (b0 + 0.24) * k, (top - 0.04) * k)
  p.bezierVertex((b0 + 0.26) * k, (top + 0.05) * k, (b0 + 0.25) * k, (top + 0.14) * k, (b0 + 0.27) * k, (top + 0.245) * k)
  p.vertex((b0 + 0.02) * k, (top + 0.24) * k)
  p.bezierVertex((b0 - 0.03) * k, (top + 0.15) * k, (b0 - 0.03) * k, (top + 0.02) * k, b0 * k, (top - 0.035) * k)
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

/** The lamp's warm pool, over everything, the two of them too: broad and soft round the shade's mouth, no hot centre. */
function pool(p: p5, c: Ctx, T: number): void {
  const { k } = c
  const on = lampOn(T)
  if (on <= 0.005) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const f = frame(p, k)
  ctx.save()
  ctx.beginPath()
  ctx.rect(f.x0 * k, CEIL * k, (f.x1 - f.x0) * k, (FLOOR + 0.06 - CEIL) * k)
  ctx.clip()
  ctx.globalCompositeOperation = 'screen'
  const cx = (LAMP.x + O) * k
  const cy = (LAMP.bottom + 0.15) * k
  const g = ctx.createRadialGradient(cx, cy, 0.05 * k, cx, cy, 1.9 * k)
  g.addColorStop(0, hexA(HOME.lamp, 0.34 * on))
  g.addColorStop(0.35, hexA(HOME.lamp, 0.2 * on))
  g.addColorStop(1, hexA(HOME.lamp, 0))
  ctx.fillStyle = g
  ctx.fillRect(cx - 1.9 * k, cy - 1.9 * k, 3.8 * k, 3.8 * k)
  // Under the shade, its cone down onto the table.
  const x = (LAMP.x + O) * k
  const cone = ctx.createLinearGradient(0, LAMP.bottom * k, 0, TABLE.top * k)
  cone.addColorStop(0, hexA(HOME.lamp, 0.4 * on))
  cone.addColorStop(1, hexA(HOME.lamp, 0.1 * on))
  ctx.fillStyle = cone
  ctx.beginPath()
  ctx.moveTo(x - (LAMP.wb / 2 - 0.02) * k, LAMP.bottom * k)
  ctx.lineTo(x + (LAMP.wb / 2 - 0.02) * k, LAMP.bottom * k)
  ctx.lineTo(x + (LAMP.wb / 2 + 0.12) * k, TABLE.top * k)
  ctx.lineTo(x - (LAMP.wb / 2 + 0.12) * k, TABLE.top * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
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
      p.push()
      p.translate(O * k, 0)
      drawTable(p, k, weight)
      drawLamp(p, k, weight, T)
      drawBed(p, k, weight, ex, wardDusk(T).dim)
      drawVisitorChair(p, k, weight, 0)
      p.pop()
      dusk(p, c, T)
    },
    over: (p, s, c) => pool(p, c, c.t + s.begin),
  },
  (slot) => {
    const dur = slot.end - slot.begin
    const lane = carried((t) => { const [x, y] = carlAt(slot.begin + t); return [O + x, y] }, 0, dur, Math.max(1, Math.round(dur / 0.04)))
    const her = (T: number): Companion => {
      const [x, y] = herAt(T)
      return { x: O + x, y }
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
    // A little over to the lamp as he reaches for it, and then one slow push in on the two of them, so that her roll
    // toward him (185.655, the film's touch) and his lean are the picture; the balloon stays whole over him.
    { t: CLICK, cells: 3.4, hold: [O - 0.02, -0.66], w: 1 },
    { t: TOUCH, cells: 2.86, hold: [O + 0.3, -0.72], w: 1 },
    { t: 186.9, cells: 2.8, hold: [O + 0.3, -0.72], w: 1 },
    // Then, as she is still again, a slow breath back out to him and the balloon for the cut to the church
    // (`CUTS.funeral`), where he is alone.
    { t: slot.end, cells: 3.6, hold: [O + 0.22, -0.6], w: 1 },
  ],
)

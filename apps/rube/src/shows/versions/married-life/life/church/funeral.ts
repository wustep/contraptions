import type p5 from 'p5'
import { mixHex, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, knock, part, smooth, type Ctx } from '../kit'
import { CUT } from '../music'
import { CLINIC, HOME, INK } from '../worlds'
import { bellAt, CH, CHURCH_BOX, ease, FOOT, FUN, gloomy, paint, pchip, SEATED, waking } from './church'

/**
 * The funeral (189.452 to 201.944): the same church, empty and grey.
 *
 * From the cut Carl sits alone in the front pew where his father sat at the wedding, the balloon over him, and the
 * place beside him where she was a moment ago (at her bedside, across the cut) is empty. Nothing moves but the light:
 * one grey beam from a lancet with the dust turning in it, the candles burned low. The camera drifts from him to the
 * altar: the wedding's kiss, framed again, with nobody in it; white lilies, and the wedding photograph on an easel
 * where the two of them stood.
 *
 * He gets up (slowly: he slides off the seat and lets himself down to the floor, on 193.66) and walks down the aisle
 * the way they ran, at half the pace, into the porch under the tower, where the bell's rope comes down beside the
 * doors. As he comes to it the rope starts to move (the bell is swinging up, out of sight), and the camera rises with
 * it, widening, to arrive on 197.712, the strongest onset of the whole cue: the whole empty church, the bell they were
 * married under tolling once at the top of the frame, the rope jolting and swaying beside him at the bottom. It
 * answers softly as it swings back (198.409). He looks up at it; bows his head; and goes out into the silence and down
 * the steps, one at a time, as the camera comes down with the dust, and comes to rest at their foot on 201.944
 * (`CUTS.home`: the house builder's own front steps match).
 *
 * The part's frame is the church world's, shifted by `FUNERAL_AT` (Carl seated is its (-0.5, 0)).
 */

/** Where this part's entry cell is, in its world's cells (the score starts its leg here). */
export const FUNERAL_AT: Pt = [SEATED[0] + 0.5, SEATED[1]]

/* ------------------------------------------------------------------ the clock */

/** He leans forward to get up; lets himself down off the seat to the floor (on an onset). */
const LEAN = 192.45
const DOWN = 193.66
/** He walks from the pew to the porch under the tower, and stands there. */
const WALK = 193.95
const HALT = 197.55
/** Where he stops: just inside the porch, the rope a step to his right and his balloon clear of it. */
const PORCH = CH.tower[0] + 0.15
/** The toll, and its answer; then out, and down the steps. */
const TOLL = FUN.toll
const ANSWER = FUN.answer
const OUT = 198.5
/** Where he stands on the floor after getting up. */
const STOOD: Pt = [SEATED[0] - 0.2, 0]

const aisle = pchip([WALK, 194.9, 196.75, HALT], [STOOD[0], STOOD[0] + 0.4, PORCH - 0.52, PORCH], 0, 0)
/** Out through the doors and down: slower on the steps, at rest at their foot. */
const out = pchip([OUT, 199.75, 200.7, 201.4, CUT.home], [PORCH, CH.landing[1] - 0.5, CH.landing[1] + 0.17, CH.landing[1] + 0.64, FOOT[0]], 0, 0)

/** The height of his centre going down the steps: on each tread until he is over its edge, then down to the next. */
function stepY(x: number): number {
  let y = CH.floor
  for (let i = 1; i <= CH.risers; i++) {
    const edge = CH.landing[1] + CH.tread * (i - 1)
    y += CH.rise * ease(x, edge + 0.03, edge + 0.22)
  }
  return y - 0.13
}

/** Carl, in the church's cells, at show time T. */
function carl(T: number): Pt {
  if (T < LEAN) return SEATED
  if (T < DOWN) {
    // Forward to the seat's edge first, then down: an old man letting himself off a pew.
    const u = (T - LEAN) / (DOWN - LEAN)
    const x = SEATED[0] + (STOOD[0] - SEATED[0]) * ease(u, 0, 0.75)
    const y = SEATED[1] + (STOOD[1] - SEATED[1]) * ease(u, 0.28, 1)
    return [x, y]
  }
  if (T < WALK) return STOOD
  if (T < OUT) return [aisle(Math.min(T, HALT)), 0]
  const x = out(Math.min(T, CUT.home))
  return [x, stepY(x)]
}

/**
 * How he holds himself: slumped a little in the pew, a lean forward to get up, a stoop as he walks; a start at the
 * toll and a long look up at the bell; his head bowed going down the steps; upright at their foot.
 */
function carlPose(T: number): { tilt: number; squash: number } {
  // He settles into the pew over the first second after the cut (on the far side he was upright in her bedside chair).
  const slump = 0.05 * smooth(T, FUN.from, FUN.from + 1.2) * (1 - smooth(T, LEAN, DOWN))
  const forward = -0.13 * smooth(T, LEAN, LEAN + 0.5) * (1 - smooth(T, DOWN - 0.3, DOWN + 0.3))
  const stoop = 0.05 * smooth(T, WALK, WALK + 0.6) * (1 - smooth(T, HALT - 0.5, HALT))
  const up = -0.17 * ease(T, TOLL + 0.02, TOLL + 0.6) * (1 - ease(T, ANSWER + 0.05, OUT + 0.45))
  const bow = 0.07 * smooth(T, OUT - 0.2, OUT + 0.4) * (1 - smooth(T, 201.3, CUT.home - 0.05))
  const squash = slump + 0.05 * knock(T - DOWN, 0.2) * (T >= DOWN ? 1 : 0) + 0.045 * knock(T - TOLL, 0.22) * (T >= TOLL ? 1 : 0)
  return { tilt: forward + stoop + up + bow, squash }
}

/** Every strike of this part, in show seconds (check:shows holds each to the music). */
export const FUNERAL_HITS: number[] = [DOWN, TOLL, ANSWER]

interface FuneralState {
  begin: number
}

/* ------------------------------------------------------------------ the bell's rope */

/**
 * The rope comes off the bell's wheel (the set draws it in the belfry, to the belfry floor at `ROPE_X`) and down
 * through the ringing chamber and the ringing floor into the porch, beside the doors, to its sally (the striped woollen
 * grip) and a short tail. It hangs still through the funeral until the bell is swung up; then it is paid out and taken
 * back with the wheel, so it moves with the bell's every swing; the strike jolts it, and it swings on, a slow pendulum,
 * dying away.
 */
const ROPE_X = CH.bell[0] + 0.29
/** The ringing floor's underside (the rope comes through it) and the sally's centre at rest. */
const ROPE_TOP = -2.9
const SALLY_Y = -1.08
const SALLY_H = 0.36
const SALLY_W = 0.085
const TAIL = 0.24
/** How much of the wheel's turn reaches the sally (the drawn wheel is small for its bell). */
const GAIN = 1.7

/** The rope at show time T: how far the sally has been let down (cells, down positive), and how far it swings aside. */
function ropeAt(T: number): { down: number; aside: number } {
  const { a } = bellAt(T)
  let down = GAIN * 0.29 * a
  let aside = 0
  // The strike and its answer: a sharp jolt up the rope, then a long damped swing (the rope's own slow period).
  for (const [s, f] of [
    [TOLL, 1],
    [ANSWER, 0.45],
  ] as [number, number][]) {
    const u = T - s
    if (u < 0) continue
    down -= f * 0.06 * Math.exp(-u / 0.3) * Math.sin((2 * Math.PI * u) / 0.46)
    aside += f * 0.075 * Math.exp(-u / 1.6) * Math.sin((2 * Math.PI * u) / 2.3)
  }
  return { down, aside }
}

function drawRope(p: p5, k: number, weight: number, T: number): void {
  const c = paint(T)
  const { down, aside } = ropeAt(T)
  const sy = SALLY_Y + down
  const sx = ROPE_X + aside
  // Where the rope is at height y: fixed where it comes through the floor, swung aside below it in proportion.
  const xAt = (y: number) => ROPE_X + (aside * (y - ROPE_TOP)) / (SALLY_Y - ROPE_TOP)
  const tailEnd = sy + SALLY_H / 2 + TAIL
  const tailX = xAt(tailEnd) + aside * 0.25
  const w = 0.034
  const rope = (x0: number, y0: number, x1: number, y1: number) => {
    p.stroke(INK)
    p.strokeWeight(w * k + weight * 0.9)
    p.line(x0 * k, y0 * k, x1 * k, y1 * k)
    p.stroke(c.stone)
    p.strokeWeight(w * k)
    p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  }
  p.push()
  p.rectMode(p.CENTER)
  p.strokeCap(p.ROUND)
  // Through the ringing chamber, between the belfry floor and the ringing floor.
  rope(ROPE_X, CH.belfry[1] + 0.12, ROPE_X, ROPE_TOP - 0.1)
  // Down into the porch, the sally, and the tail below it.
  rope(ROPE_X, ROPE_TOP, sx, sy - SALLY_H / 2)
  rope(sx, sy + SALLY_H / 2, tailX, tailEnd)
  // The tail's whipped end: a short dark binding.
  p.stroke(alpha(p, INK, 0.85))
  p.strokeWeight(w * k + weight * 0.9)
  p.line(tailX * k, (tailEnd - 0.05) * k, tailX * k, tailEnd * k)
  // The sally: a woollen grip, red, cream and blue in bands (the wedding's colours, greyed), tapering at its ends.
  const lean = Math.atan2(sx - ROPE_X, sy - ROPE_TOP)
  p.translate(sx * k, sy * k)
  p.rotate(-lean)
  const bands = [c.glass[0], c.cloth, c.glass[1], c.cloth, c.glass[0]]
  const h = SALLY_H / bands.length
  p.noStroke()
  for (let i = 0; i < bands.length; i++) {
    const y0 = -SALLY_H / 2 + i * h
    const taper = i === 0 || i === bands.length - 1 ? 0.8 : 1
    p.fill(bands[i])
    p.rect(0, (y0 + h / 2) * k, SALLY_W * taper * k, h * k + 0.5)
  }
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.rect(0, 0, SALLY_W * k, SALLY_H * k, SALLY_W * 0.45 * k)
  p.pop()
}

function lane(begin: number, end: number, at: Pt): Seg[] {
  const marks = [begin, LEAN, DOWN, WALK, HALT, OUT, end].filter((s) => s >= begin && s <= end)
  const cuts = [...new Set(marks)].sort((a, b) => a - b)
  const segs: Seg[] = []
  const local = (T: number): Pt => {
    const [x, y] = carl(T)
    return [x - at[0], y - at[1]]
  }
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]
    const b = cuts[i + 1]
    if (b - a < 1e-6) continue
    // Where he sits or stands still, one piece; where he moves, short ones.
    const still = (a >= begin && b <= LEAN) || (a >= DOWN && b <= WALK) || (a >= HALT && b <= OUT)
    segs.push(...carried((t) => local(t + begin), a - begin, b - begin, still ? 1 : Math.max(1, Math.ceil((b - a) / 0.02))))
  }
  return segs
}

/**
 * The hospital's night, carried across the cut and lifting: the same cold blue laid over the room as the ward's dusk
 * (`clinic/hospital.ts`), a little deeper for the church's paler plaster, under the two of them (drawn before the
 * cast, as the ward's is), gone as the grey morning comes up (`waking`).
 */
function night(p: p5, c: Ctx, T: number): void {
  const a = 1 - waking(T)
  if (a <= 0.003) return
  const { k } = c
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  const hex = mixHex(HOME.night, CLINIC.steel, 0.35)
  const n = parseInt(hex.slice(1), 16)
  ctx.fillStyle = `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${0.62 * a})`
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  ctx.restore()
}

export const funeral = part<FuneralState>(
  {
    name: 'funeral',
    // Everything else the funeral shows is the set's (the grey light, the lilies, the photograph, the bell): its own
    // is the bell's rope in the porch, behind him. Only in the funeral's light (the wedding's porch has none).
    draw: (p: p5, s: FuneralState, c: Ctx) => {
      const T = c.t + s.begin
      if (!gloomy(T)) return
      p.push()
      p.translate(-FUNERAL_AT[0] * c.k, -FUNERAL_AT[1] * c.k)
      drawRope(p, c.k, c.weight, T)
      p.pop()
      night(p, c, T)
    },
  },
  (slot) => {
    const at = FUNERAL_AT
    const [bx0, by0, bx1, by1] = CHURCH_BOX
    const end = carl(slot.end)
    return {
      cells: box(bx0 - at[0], by0 - at[1], bx1 - at[0], by1 - at[1]),
      exit: [end[0] - at[0] + 0.5, end[1] - at[1]],
      lane: { segs: lane(slot.begin, slot.end, at), fire: TOLL - slot.begin },
      state: { begin: slot.begin },
      pose: [{ from: slot.begin, to: slot.end, at: carlPose }],
    }
  },
  (slot) => {
    const at = FUNERAL_AT
    const key = (t: number, cells: number, x: number, y: number) => ({ t, cells, hold: [x - at[0], y - at[1]] as Pt, w: 1 })
    return [
      // Off him to the altar: the kiss's framing, with nobody in it, and him at its edge.
      key(192.6, 3.6, 0.3, -0.66),
      // With him, slowly, as he gets up and goes.
      key(194.4, 4.1, 1.35, -0.9),
      // Into the porch with him, the rope hanging beside the doors.
      key(196.1, 4.85, 2.7, -1.25),
      // As the rope starts to move, up it and out, widening, to arrive on the toll: the whole empty church, the bell
      // well inside the top of the frame, the rope down to him, and him whole at the bottom even under Zoom.
      key(TOLL, 7.5, 3.25, -2.05),
      // The answer; then down with the dust as he goes.
      key(OUT, 7.45, 3.6, -1.95),
      key(199.95, 5.7, 5.0, -1.3),
      // Down the steps to the cut (`CUTS.home`): 4.5 cells, Carl 0.6 left of centre and 1.1 below it.
      key(slot.end, 4.5, FOOT[0] + 0.6, FOOT[1] - 1.1),
    ].filter((s) => s.t > slot.begin && s.t <= slot.end)
  },
)

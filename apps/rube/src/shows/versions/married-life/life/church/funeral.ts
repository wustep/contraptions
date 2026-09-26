import type p5 from 'p5'
import type { Pt, Seg } from '../../../../../parts'
import { box, carried, knock, part, smooth, type Ctx } from '../kit'
import { CUT } from '../music'
import { CH, CHURCH_BOX, ease, FOOT, FUN, pchip, SEATED } from './church'

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
 * the way they ran, at half the pace, and stops in the porch under the tower. 197.712, the strongest onset of the
 * whole cue: the bell they were married under tolls once over his head (the same bell), and answers softly as it
 * swings back (198.409). He looks up at it; bows his head; and goes out into the silence and down the steps, one at a
 * time, and comes to rest at their foot on 201.944 (`CUTS.home`: the house builder's own front steps match).
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
const PORCH = CH.tower[0] + 0.48
/** The toll, and its answer; then out, and down the steps. */
const TOLL = FUN.toll
const ANSWER = FUN.answer
const OUT = 198.55
/** Where he stands on the floor after getting up. */
const STOOD: Pt = [SEATED[0] - 0.2, 0]

const aisle = pchip([WALK, 194.9, 196.75, HALT], [STOOD[0], STOOD[0] + 0.4, PORCH - 0.52, PORCH], 0, 0)
/** Out through the doors and down: slower on the steps, at rest at their foot. */
const out = pchip([OUT, 199.6, 200.6, 201.35, CUT.home], [PORCH, CH.landing[1] - 0.45, CH.landing[1] + 0.2, CH.landing[1] + 0.64, FOOT[0]], 0, 0)

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

export const funeral = part<FuneralState>(
  {
    name: 'funeral',
    // Everything the funeral shows is the set's (the grey light, the lilies, the photograph, the bell): nothing of
    // its own stands in front of him.
    draw: (_p: p5, _s: FuneralState, _c: Ctx) => {},
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
      key(196.2, 5.0, 2.95, -1.35),
      // Wide and high enough for the tower: the bell over him as it tolls.
      key(197.62, 6.2, 3.9, -2.02),
      key(OUT, 6.0, 4.35, -1.9),
      // Down the steps to the cut (`CUTS.home`): 4.5 cells, Carl 0.6 left of centre and 1.1 below it.
      key(slot.end, 4.5, FOOT[0] + 0.6, FOOT[1] - 1.1),
    ].filter((s) => s.t > slot.begin && s.t <= slot.end)
  },
)

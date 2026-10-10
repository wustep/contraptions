import type { Pt, Seg } from '../../../../../parts'
import { box, carried, part, type Company, type PartShot } from '../kit'
import { penOf } from './set'
import { APPEAR, B, ballAt, E0, FINAL, lidAt, PIECES, waymondAt } from './kindness-plan'
import {
  drawArm,
  drawArmFront,
  drawDesk,
  drawGivenEyes,
  drawGiftBox,
  drawGlove,
  drawHammer,
  drawKaraoke,
  drawLanterns,
  drawPartyWall,
  drawLid,
  drawSteamers,
  drawTable,
  drawTrap,
} from './kindness-draw'

/**
 * KINDNESS: the great hit, home, and the empathy fight (191.216 to 200.163).
 *
 * The mosaic folds into her on the great hit and she comes to rest, alone, with her new googly eye, on the floor of
 * the laundromat's party corner: the new year party set up and waiting (the table in its red cloth, the dumpling
 * steamers, the karaoke machine, the paper lanterns, a gift) and the back office with the taxes. Jobu's jumpers have
 * come for her: a gift box, a steel trap, a mallet hung from the ceiling, an arm folded high on the wall.
 *
 * On the fight's last bars they come at her, one after another, and each one she touches is given an eye, and its
 * strike turns gentle. The glove's punch is a push that rolls her on, and it waves after her. The trap's bite is a
 * toss that squeezes her up and out, and it bobs. The mallet's blow is a scoop that lobs her up under the lights, and it sways
 * like a metronome. The arm's grab is a cradle: it bounces her softly while the whole corner sways in time, and sets
 * her down on the steamers, and she steps down them, a beat a step, to land on the table beside Waymond on the last
 * hit. The room goes still. (See `kindness-plan.ts` for the beat by beat.)
 *
 * The room is `set.ts`'s; this part draws the party corner, x 25 to 38.5, at every time: the party and the desk from
 * the first frame, Jobu's jumpers from a moment before the great hit.
 */

/** This leg's entry cell in the laundromat's cells: she rests at E0, the cell's (-0.5, 0). */
export const KINDNESS_AT: Pt = [E0[0] + 0.5, E0[1]]

const O = KINDNESS_AT
const toPart = ([x, y]: Pt): Pt => [x - O[0], y - O[1]]

/** Every strike, in show seconds (see `kindness-plan.ts`). */
export const KINDNESS_HITS: number[] = [124, 125, 126, 127, 128, 129, 130, 132, 133, 134, 136, 137, 141, 142, 143, 144].map(B)

interface KindnessState {
  begin: number
}

export const kindness = part<KindnessState>(
  {
    name: 'kindness',
    draw: (p, s, c) => {
      const t = c.t + s.begin
      const pen = penOf(p, c)
      const { k } = c
      p.push()
      p.translate(-O[0] * k, -O[1] * k)
      // The party and the office, as they have stood all day.
      drawPartyWall(pen, t)
      drawDesk(pen)
      drawLanterns(pen, t)
      drawTable(pen)
      drawKaraoke(pen)
      drawSteamers(pen)
      drawGiftBox(pen)
      if (t >= APPEAR) {
        drawHammer(pen, t)
        drawTrap(pen, t)
        drawArm(pen, t)
        drawGlove(pen, t)
      }
      const lid = lidAt(t)
      drawLid(pen, lid.at, lid.turn)
      p.pop()
    },
    over: (p, s, c) => {
      const t = c.t + s.begin
      if (t < B(124) || t > B(141) + 0.2) return
      const { k } = c
      const pen = penOf(p, c)
      p.push()
      p.translate(-O[0] * k, -O[1] * k)
      drawArmFront(pen, t)
      drawGivenEyes(pen, t, ballAt)
      p.pop()
    },
  },
  (slot) => {
    const segs: Seg[] = []
    const at = (t: number) => toPart(ballAt(t))
    for (const piece of PIECES) {
      const a = Math.max(piece.a, slot.begin)
      const b = Math.min(piece.b, slot.end)
      if (b <= a) continue
      if (piece.still) segs.push({ from: at(a), to: at(a), dur: b - a })
      else segs.push(...carried(at, a, b, Math.max(1, Math.ceil((b - a) * 60))))
    }
    const end = toPart(FINAL)
    const company: Company[] = [
      {
        who: 'waymond',
        from: APPEAR,
        to: slot.end,
        at: (t) => {
          const [x, y] = toPart(waymondAt(t))
          return { x, y }
        },
      },
    ]
    return {
      cells: box(25 - O[0], -4.8 - O[1], 38.8 - O[0], 0.6 - O[1]),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: B(125) - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  (slot) => {
    const H = (x: number, y: number): Pt => toPart([x, y])
    const shots: PartShot[] = [
      // Out of the calm she lands in, a breath on the whole corner: her, Jobu's jumpers between, and Waymond waiting at
      // the far end of the party table (he gave her the eye).
      { t: B(124), cells: 4.2, hold: H(28.4, -1.05), w: 1 },
      // Then in on each kindness, close enough that the eye she gives is seen to fly from her to it and land.
      // The glove: it punches, the eye lands, the punch goes soft.
      { t: B(125), cells: 2.7, hold: H(26.95, -0.62), w: 1 },
      { t: B(126), cells: 2.8, hold: H(27.7, -0.55), w: 1 },
      // The trap: it snaps, the eye lands, the bite is a toss.
      { t: B(128), cells: 2.6, hold: H(28.85, -0.5), w: 1 },
      // The mallet: the eye lands as it swings, and the blow is a scoop.
      { t: B(129.6), cells: 3.0, hold: H(29.7, -1.6), w: 1 },
      { t: B(130), cells: 3.1, hold: H(30.0, -1.85), w: 1 },
      // The lob under the ceiling: back, to see the whole arc.
      { t: B(130.7), cells: 4.3, hold: H(30.8, -2.75), w: 1 },
      { t: B(131.5), cells: 4.7, hold: H(31.3, -2.75), w: 1 },
      // The claw: it grabs her, the eye lands, the grab is a cradle.
      { t: B(133), cells: 3.0, hold: H(32.75, -2.15), w: 1 },
      // The cradle, and Waymond watching her across the table: the two of them in one frame.
      { t: B(135), cells: 2.9, hold: H(32.95, -1.65), w: 1 },
      { t: B(139), cells: 2.75, hold: H(32.9, -1.6), w: 1 },
      // Down the steps to him, and to rest beside him.
      { t: B(141), cells: 2.5, hold: H(32.95, -1.45), w: 1 },
      { t: B(144), cells: 2.3, hold: H(33.45, -1.25), w: 1 },
      { t: slot.end, cells: 2.2, hold: H(FINAL[0] + 0.2, FINAL[1] - 0.22), w: 1 },
    ]
    return shots.filter((s) => s.t > slot.begin + 0.39 && s.t <= slot.end + 1e-6)
  },
)

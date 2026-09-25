import type { Pt } from '../../../../../parts'
import { box, carried, frame, part, route, type Way } from '../kit'
import { AT } from '../music'
import { hop } from '../physics'
import { drawDark, FLARE, HANDOFF, HOP_UP, KNOCK, miaAt, seat, SHIVER, VALVE_T } from './jazz-club'

/**
 * The trumpet (239.444 → 269): the solo, quiet and rubato. The band has gone
 * dark but for one spot from the vault on the trumpet, high on its stand
 * over the see-saw; the two of them sit on its two ends at the edge of the
 * light, a balance. The valves go down on the solo's notes by themselves,
 * and the bell lifts with its high notes and bows with its low ones; a few
 * motes turn in the beam. In each of the solo's breaths she inches in along
 * her end toward him, and the beam leans his way a little more. Its high
 * accents set the hi-hat's open cymbal shivering at the edge of the light;
 * on its biggest note the lamp flares. Out of the silence at 264.7 he
 * springs up off his end (hers sinks) and comes down hard: the kick sounds
 * in the dark room, the beam slams over to his side, and she rolls down it
 * to him and stops against him. The iris closes on him (267.3 → 268.45).
 * The room and the machines are `jazz-club.ts`; this frame's entry is
 * HANDOFF, where he sits as the solo begins.
 */

interface TrumpetState {
  begin: number
}

/** The trumpet's frame: its entry (-0.5, 0) is HANDOFF, so the jazz's point P is P − HANDOFF − (0.5, 0) here. */
const OX = HANDOFF[0] + 0.5
const OY = HANDOFF[1]
const here = ([x, y]: Pt): Pt => [x - OX, y - OY]

/** The valves on the solo's notes, the cymbal's shivers, the lamp's flare, and the knock. */
export const TRUMPET_HITS: number[] = [...VALVE_T.filter((t) => t >= AT.trumpet && t < 268), ...SHIVER, FLARE, KNOCK].sort((a, b) => a - b)

/** She is company until the iris has closed on the two of them. */
const MIA_TO = 268.45

export const trumpet = part<TrumpetState>(
  {
    name: 'trumpet',
    draw(p, s, c) {
      const t = c.t + s.begin
      p.push()
      p.rectMode(p.CORNER)
      p.translate(-OX * c.k, -OY * c.k)
      drawDark(p, c.k, t, frame(p, c.k))
      p.pop()
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const sit = (u: number): Pt => here(seat(1, u + slot.begin))
    // On his end as the beam leans his way under her moves; up off it, and down hard on the knock; on it as it lies
    // over, to the end.
    const up: Way = { at: at(HOP_UP), p: sit(at(HOP_UP)) }
    const segs = [
      ...carried(sit, 0, at(HOP_UP), Math.ceil((HOP_UP - slot.begin) * 30)),
      ...route([up, hop(up, sit(at(KNOCK)), at(KNOCK))]),
      ...carried(sit, at(KNOCK), at(slot.end), Math.ceil((slot.end - KNOCK) * 40)),
    ]
    const end = sit(at(slot.end))
    const [hx, hy] = [OX, OY]
    return {
      cells: box(-4 - hx, -4 - hy, 9 - hx, 3.5 - hy),
      exit: [end[0] + 0.5, end[1]],
      lane: { segs, fire: at(KNOCK) },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: MIA_TO, who: 'mia', at: (t) => { const m = miaAt(t); const [x, y] = here([m.x, m.y]); return { ...m, x, y } } }],
    }
  },
  (slot) => {
    const h = (x: number, y: number): Pt => here([x, y])
    return [
      // One slow move across the whole solo: a dolly left to right, the way she inches, with a push-in, down onto the
      // see-saw for the knock. Every channel keeps going one way, so it never stops on a key.
      { t: slot.begin + 0.05, cells: 3.85, hold: h(4.18, 1.22) },
      { t: 247.0, cells: 3.62, hold: h(4.32, 1.27) },
      { t: 255.5, cells: 3.42, hold: h(4.47, 1.33) },
      { t: 264.0, cells: 3.2, hold: h(4.62, 1.45) },
      { t: 266.6, cells: 3.0, hold: h(4.75, 1.65) },
      { t: slot.end - 0.05, cells: 2.98, hold: h(4.8, 1.7) },
    ]
  },
)

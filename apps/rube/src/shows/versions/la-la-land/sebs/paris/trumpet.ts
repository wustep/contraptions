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
 * motes turn in the beam, and each phrase it plays goes out of the bell as a thread of light, at the height of its
 * notes, drifting up into the dark and fading (`drawSolo`). In each of the solo's breaths she inches in along
 * her end toward him, and the beam leans his way a little more. Its high
 * accents set the hi-hat's open cymbal shivering at the edge of the light;
 * on its biggest note the lamp flares. Out of the silence at 264.7 he
 * springs up off his end (hers sinks) and comes down hard: the kick sounds
 * in the dark room, the beam slams over to his side, and she rolls down it
 * to him and stops against him. The iris closes on them to a small circle (267.3 → 268.2) and shuts on the second knock (268.655).
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
const MIA_TO = 268.72

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
      // Two slow moves across the solo. First a dolly left to right, the way she inches, drawing back as it goes, so
      // the dark room comes into the picture round the spot: the bass player behind his bass, the stair, the vault,
      // and over the band the skyline the solo is drawing. Then, from the solo's last long phrase, in again and down
      // onto the see-saw for the knock. The zoom and the pan never turn together, so the picture never stops. It sits
      // a little to the right of the two of them, so the threads of light going out from the bell and up into the dark
      // on that side are in the picture with them, and the skyline the solo draws over the band is whole in it.
      { t: slot.begin + 0.05, cells: 3.85, hold: h(4.5, 1.12) },
      { t: 247.0, cells: 4.08, hold: h(4.8, 1.14) },
      { t: 252.0, cells: 4.22, hold: h(5.12, 1.12) },
      { t: 259.5, cells: 3.9, hold: h(5.35, 1.2) },
      { t: 264.0, cells: 3.25, hold: h(5.05, 1.4) },
      { t: 266.6, cells: 3.0, hold: h(4.75, 1.65) },
      { t: slot.end - 0.05, cells: 2.98, hold: h(4.8, 1.7) },
    ]
  },
)

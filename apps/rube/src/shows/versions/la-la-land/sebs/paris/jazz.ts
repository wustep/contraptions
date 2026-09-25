import type { Pt } from '../../../../../parts'
import { box, carried, part, route, type Way } from '../kit'
import { AT } from '../music'
import { hop } from '../physics'
import {
  BALLOONS, drawClub, drawLamp, FLASHES, HANDOFF, J0, LAND_X1, LEAVE, LIGHTS, MEET, miaAt, SEESAW_T, seat, SLAM, SNARE_T,
  SOLO_LANDINGS, stepBall, STEP_T, VALVE_T,
} from './jazz-club'

/**
 * The Paris club (214.877 → 239.444, the band at 122.8 bpm). Through the red
 * door on the kick, the two of them; it slams behind them and the bulbs come
 * on over a red cellar. He goes down the stair on the drum fill, a step an
 * eighth, and lands on the band: a see-saw whose ends play the hi-hat and
 * the kick, which he bounces from end to end on the swing, with the trumpet
 * high over its pivot, the snare's stick and the bass's strings along with
 * it. Her premiere is up on the landing: flash guns come down from the vault
 * and fire on the beats as she crosses it, and a net of balloons lets go
 * over the stair. She comes down, lands on the other end as he lands on his,
 * and they ride it together to the band's last chord. (The room and all its
 * machines are `jazz-club.ts`, shared with the trumpet.)
 */

interface JazzState {
  begin: number
}

/** Every strike: the door, the lights, the stair, every end of the see-saw, the flashes, the balloons, the snare, the band's valves. */
export const JAZZ_HITS: number[] = [SLAM, LIGHTS, ...STEP_T, ...SEESAW_T, ...FLASHES, BALLOONS, ...SNARE_T, ...VALVE_T.filter((t) => t < AT.trumpet)].sort((a, b) => a - b)

export const jazz = part<JazzState>(
  {
    name: 'jazz',
    flight: true,
    draw(p, s, c) {
      const t = c.t + s.begin
      p.rectMode(p.CORNER)
      drawClub(p, c.k, c.weight, t)
      drawLamp(p, c.k, c.weight, t)
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // Out of the door, easing to a stop at the edge of the landing, and off it on the fill.
    const edge: Pt = [LAND_X1 - 0.18, 0]
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: 1.022, p: edge, ramp: [1.8, 0] }, { at: at(LEAVE), p: edge }]
    STEP_T.forEach((t, i) => ways.push(hop(ways[ways.length - 1], stepBall(i + 1), at(t))))
    // End to end on the see-saw, alone; then onto his end as she lands on hers.
    for (const [t, e] of SOLO_LANDINGS) ways.push(hop(ways[ways.length - 1], seat(e, t), at(t)))
    ways.push(hop(ways[ways.length - 1], seat(1, MEET), at(MEET)))
    const ride = (u: number): Pt => seat(1, u + slot.begin)
    const segs = [...route(ways), ...carried(ride, at(MEET), at(slot.end), Math.ceil((slot.end - MEET) * 40))]
    return {
      cells: box(-4, -4, 9, 3.5),
      exit: [HANDOFF[0] + 0.5, HANDOFF[1]],
      lane: { segs, fire: at(SOLO_LANDINGS[0][0]) },
      state: { begin: slot.begin },
      company: [{ from: J0, to: slot.end, who: 'mia', at: miaAt }],
    }
  },
  (slot) => [
    // Through the red: the door, close; the lights come up and the camera opens on the cellar below.
    { t: slot.begin, cells: 3.6, hold: [-0.3, -0.5] },
    { t: LIGHTS - 0.05, cells: 3.9, hold: [-0.1, -0.45] },
    { t: LEAVE + 0.1, cells: 6.2, hold: [1.4, 0.55] },
    { t: STEP_T[4], cells: 5.4, hold: [2.7, 1.1] },
    { t: SOLO_LANDINGS[1][0], cells: 4.0, hold: [4.4, 1.45] },
    { t: 222.6, cells: 3.9, hold: [4.5, 1.45] },
    // Up to the landing for her premiere, the band still in the corner of the frame on the way.
    { t: 224.0, cells: 5.8, hold: [1.4, 0.3] },
    { t: FLASHES[0] + 0.1, cells: 4.3, hold: [-0.85, -0.45] },
    { t: FLASHES[5], cells: 4.5, hold: [-0.2, -0.45] },
    // The balloons go, and she comes down to him.
    { t: BALLOONS + 0.5, cells: 6.0, hold: [1.7, 0.2] },
    { t: 231.0, cells: 5.6, hold: [3.0, 1.0] },
    { t: MEET + 0.2, cells: 3.9, hold: [4.4, 1.45] },
    { t: 236.0, cells: 3.6, hold: [4.45, 1.4] },
    { t: slot.end - 0.05, cells: 3.8, hold: [4.45, 1.15] },
  ],
)

import type { Pt } from '../../../../parts'
import { box, carried, part, type Companion, type PartShot, type Slot } from './kit'
import {
  ARM, BANKS, BEGIN, BLACK, BLAST, BRUTE, BRUTE_OFF, BUFFER, CLAPS, CRANK, DIM, DOOR, END, EXIT_X, FAN_ON, FAN_X, FLAP, FLASHES, GUSTS, JOINTS, LIGHTS, LIP_X,
  OUT_DOOR, RAIN, RED, REST_BACK, SLATES, SPAN, SPOT, TAP, UNISON, WALL_OUT, heroAt, miaAt,
} from './studio-motion'
import { drawStudio, drawStudioOver } from './studio-set'

/**
 * The studio (103.84 → 132.43, the swing's loud half, beats 221 → 282): the
 * backlot. They come off the freeway at speed and through the studio gate;
 * the stage's door goes up on the biggest beat and they are on a soundstage,
 * in a shoot: the slate, the lamps, the dolly that carries them across the
 * set a take a bar. The set goes quiet; a spotlight hunts, and finds her.
 * The chairs applaud. She taps him on; the wind machine blows the two of
 * them across the floor down a row of flats, through the rain, and out of
 * the far door as the lights go down on the beat the swing goes soft.
 *
 * The timing and the motion are in `studio-motion.ts`, the drawing in
 * `studio-set.ts`; this file is the part: the lane, her, the camera.
 */

export const STUDIO_HITS: number[] = [
  ...new Set([LIGHTS, ARM, DOOR, RED, ...SLATES, ...BANKS, CRANK, ...JOINTS, BRUTE, BUFFER, DIM, BRUTE_OFF, SPOT, ...CLAPS, TAP, UNISON, FLAP, FAN_ON, BLAST, ...GUSTS, RAIN, OUT_DOOR, ...FLASHES, BLACK]),
].sort((a, b) => a - b)

interface StudioState {
  begin: number
}

export const studio = part<StudioState>(
  {
    name: 'studio',
    draw: (p, s, c) => drawStudio(p, c.t + s.begin, c),
    over: (p, s, c) => drawStudioOver(p, c.t + s.begin, c),
  },
  (slot: Slot) => {
    // The lane is the motion itself, sampled finely: what the dolly does to him, the lane does to him.
    const n = Math.ceil(SPAN / 0.02)
    const segs = carried((t) => heroAt(t + BEGIN), 0, SPAN, n)
    // Her: a step behind him through the gate, beside him on the dolly, the tap, the wind; back at his side at the door.
    const her = (T: number): Companion => {
      const [x, y] = miaAt(T)
      return { x, y }
    }
    return {
      cells: box(-1, -4.5, EXIT_X + 0.5, 1),
      exit: [EXIT_X, 0] as Pt,
      lane: { segs, fire: ARM - BEGIN },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: her }],
    }
  },
  (slot: Slot): PartShot[] => [
    // In from the freeway, tracking a little ahead; then locked on the gate and the door as they cross through it.
    { t: slot.begin, cells: 6, off: [1.0, -0.6] },
    { t: DOOR, cells: 7, hold: [4.0, -1.2] },
    { t: CRANK, cells: 7, hold: [4.0, -1.2] },
    // With the dolly across the set, framing ahead of it.
    { t: SLATES[2], cells: 6.4, off: [1.3, -1.0] },
    // Locked where the track ends: the stop, the hunt, and in on her as the spot finds her.
    { t: BUFFER, cells: 6.4, hold: [REST_BACK + 1.0, -1.15] },
    { t: SPOT, cells: 5.0, hold: [LIP_X - 0.4, -0.85] },
    { t: TAP, cells: 5.0, hold: [LIP_X - 0.4, -0.85] },
    // Out to the wind machine, and a wide of the row for the blast: they cross it.
    { t: FAN_ON, cells: 6.6, hold: [FAN_X + 1.6, -1.2] },
    { t: BLAST, cells: 7.0, hold: [FAN_X + 3.2, -1.25] },
    { t: RAIN, cells: 7.0, hold: [WALL_OUT - 4.6, -1.25] },
    // Handing off through the door: following, as Paris opens.
    { t: slot.end, cells: 6 },
  ],
)

/** Where the far door stands, for anyone who wants to know. */
export const STUDIO_DOOR_X = WALL_OUT
export const STUDIO_END = END

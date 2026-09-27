import type { Pt } from '../../../../../parts'
import { box, part, route, type Company, type PartShot } from '../kit'
import { drawChamber } from './chamber-glass'
import { FOOTFALLS } from './chamber-heptapods'
import { IAN_PATH, IN, INK_IN, LOUISE_PATH, OPENS, OUT, PALM, SPRAY, SURGES, WAKE, X_LEAN, X_PALM, X_REST } from './chamber-path'

/**
 * The chamber (85.786 → 130.409): the chamber builder's. First contact.
 *
 * Out of the shaft into the dark: a vast room, and far along it a dim grey rectangle. They slow, and stop. On two hard
 * pulses the glass wakes (87.226, 87.464): the fog behind it lights, and the room is seen, vast, the two of them
 * small on the floor at its foot. The long walk along the floor to it, into its light, their silhouettes against the
 * white. On the hard run the heptapods come: first shadows in the fog on the footfalls (94.128, 96.044, 97.007), then
 * Abbott out of the white (97.239), a great dark shape resolving, walking up to the glass on its limbs, each tip set
 * down on a hard pulse; she stops; Costello answers it (99.875, 100.345) and comes out after (101.303), a ripple of
 * footfalls. She goes on to the glass's foot; Ian stops a way behind. The fullest voices: the grand wide (the glass
 * whole, the two giants, the two of them tiny at its foot), and Abbott's front limb leaves the fog floor (109.308)
 * and reaches, slowly, up out of the fog and down to her. She sets off to meet it (118.468); its tip opens (118.700);
 * on 119.658 its palm presses flat on the glass right over her as she comes to it: the touch. Ian backs off a little.
 * Costello lifts a limb and sprays ink into the fog (121.330); it reaches the fog beside the palm (122.061) and a ring
 * blooms there, surging on the pulses, turning slowly; she leans toward it; it closes as the glass's light swells to
 * white, and the director's veil takes it into the fog on the cue's loudest swell.
 *
 * The part's frame: the ball comes in at (-0.5, 0) at the shaft's exit, the floor's surface y = FLOOR throughout.
 */

interface ChamberState {
  begin: number
}

/** Every strike: the glass's two wakings, the seen footfalls, the limb leaving the floor, the palm opening, the touch, the spray, the ink coming in, the ring's surges. */
export const CHAMBER_HITS: number[] = [...new Set([...WAKE, ...FOOTFALLS.map((f) => f.at), OPENS, PALM, SPRAY, INK_IN, ...SURGES])].sort((a, b) => a - b)

export const chamber = part<ChamberState>(
  {
    name: 'chamber',
    draw: (p, s, c) => drawChamber(p, c.k, s.begin + c.t),
  },
  (slot) => {
    const ways = LOUISE_PATH.ways(slot.begin)
    const company: Company[] = [
      {
        who: 'ian',
        from: slot.begin,
        to: slot.end,
        at: (t) => ({ x: IAN_PATH.x(t), y: 0 }),
      },
    ]
    return {
      cells: box(-1, -23, 38, 4, 2),
      exit: [X_LEAN + 0.5, 0] as Pt,
      lane: { segs: route(ways), fire: WAKE[0] - slot.begin },
      state: { begin: slot.begin },
      company,
    }
  },
  // Framed so she is never lower than about a quarter of the frame under the centre, nor further aside than about
  // 0.45 of its height: under Zoom she stays whole in the frame, the floor under her.
  (): PartShot[] => [
    // Out of the shaft, the camera easing ahead of her as she slows into the dark; the glass a dim grey slab ahead.
    { t: 87.9, cells: 5.9, hold: [2.4, -1.35], w: 1 },
    // The glass wakes, and the camera draws back: the room is vast, the glass bigger than the frame.
    { t: 92.2, cells: 13, hold: [6.8, -3.5], w: 1 },
    // The long walk: they cross the frame toward it; a slow push toward the glass as the shapes come.
    { t: 96.6, cells: 12.4, hold: [9.2, -3.35], w: 1 },
    { t: 99.3, cells: 11.2, hold: [10.6, -3.0], w: 1 },
    { t: 102.2, cells: 12.2, hold: [12.3, -3.3], w: 1 },
    { t: 105.6, cells: 13.2, hold: [14.2, -3.55], w: 1 },
    // The grand wide: the glass whole, the two giants, the two of them tiny at its foot.
    { t: 107.8, cells: 15.5, hold: [15.2, -4.2], w: 1 },
    { t: 110.0, cells: 24, hold: [18.2, -8.4], w: 1 },
    { t: 112.6, cells: 24.8, hold: [18.0, -8.5], w: 1 },
    // In with the limb as it comes down to her.
    { t: 115.1, cells: 16.5, hold: [14.3, -4.45], w: 1 },
    { t: 117.6, cells: 8.2, hold: [X_PALM + 0.8, -2.2], w: 1 },
    // The palm on the glass, and her at it; held a moment.
    { t: 119.55, cells: 4.5, hold: [X_PALM - 0.1, -1.15], w: 1 },
    { t: 120.25, cells: 4.6, hold: [X_PALM + 0.05, -1.2], w: 1 },
    // Out and over as Costello lifts a limb to write, the ink leaving it, the ring beside the palm.
    // Then drifting slowly back toward her and the palm as the ring comes round to close on her side.
    { t: 121.7, cells: 7.4, hold: [X_PALM + 3.9, -2.0], w: 1 },
    { t: 125.0, cells: 7.1, hold: [X_PALM + 2.9, -1.9], w: 1 },
    { t: 128.5, cells: 6.9, hold: [X_PALM + 1.9, -1.86], w: 1 },
    // In on her for the cut, as the light goes white.
    { t: OUT, cells: 3.6, hold: [X_LEAN + 0.1, -0.6], w: 1 },
  ],
)

/** Where she rests at the glass's foot, and at the palm (the chamber's frame). */
export { X_REST, X_PALM, IN as CHAMBER_IN }

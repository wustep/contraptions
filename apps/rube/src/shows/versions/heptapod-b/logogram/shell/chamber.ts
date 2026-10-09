import type { Pt } from '../../../../../parts'
import { box, part, route, type Company, type PartShot, type Riders } from '../kit'
import { SEAMS } from '../seams'
import { drawChamber } from './chamber-glass'
import { FOOTFALLS } from './chamber-heptapods'
import { ABBOTT_SEEN, CLOSE, IAN_PATH, IN, INK_IN, LOUISE_PATH, OPENS, OUT, PALM, REACH, SET_OFF, SPRAY, SURGES, WAKE, X_LEAN, X_PALM, X_REST } from './chamber-path'

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
 * Costello lifts a limb and sprays ink into the fog (121.574); it reaches the fog beside the palm (122.061) and a ring
 * blooms there, surging on the pulses, turning slowly, as the two giants sink back into the thickening fog; she
 * leans toward it; its two ends run into each other on the last pulse before the swell (126.131), the whole
 * logogram in the middle of the glass, and it hangs there putting out its tendrils through the swell until the
 * glass's light goes to white, and the director's veil takes it into the fog on the cue's loudest moment.
 *
 * The part's frame: the ball comes in at (-0.5, 0) at the shaft's exit, the floor's surface y = FLOOR throughout.
 */

interface ChamberState {
  begin: number
}

/** The shortest turn from angle `a` to `b`. */
const turnTo = (a: number, b: number): number => {
  const d = (b - a) % (2 * Math.PI)
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d
}
const ease = (u: number): number => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}
/** Where she looks: up at a giant over the glass, up at the palm, and up and over to the ring as it is written. */
const AT_GIANT = -1.0
const AT_PALM = -Math.PI / 2 + 0.12
const AT_RING = -0.55
/** Following the limb as it comes down out of the giants to her. */
const LIMB_DOWN = 115.4
/**
 * When she looks rather than rolls, and at what. Only while she is at rest (or all but), so her eye never slides on a
 * rolling ball: stopped as Abbott comes out of the white; at the glass's foot through the grand wide, the giants over
 * her and then the limb coming down; and from the palm's opening through the touch and the writing, into the white.
 * Between them, and on the rolls, her eye rolls with her.
 */
const LOOKS: { from: number; to: number; at: (t: number) => number }[] = [
  { from: ABBOTT_SEEN + 0.3, to: 99.25, at: () => AT_GIANT },
  { from: 105.2, to: SET_OFF - 0.2, at: (t) => AT_GIANT + turnTo(AT_GIANT, AT_PALM) * ease((t - LIMB_DOWN) / 2.2) },
  { from: OPENS + 0.55, to: Infinity, at: (t) => AT_PALM + turnTo(AT_PALM, AT_RING) * ease((t - (SPRAY + 0.1)) / 0.6) },
]
/** Her eye: rolling with her, and turned to look in the windows above, from where it is and back to it. */
const looking: Riders = (t, hero) => {
  const look = LOOKS.find((l) => t > l.from && t < l.to + 0.4)
  if (!look) return null
  const w = ease((t - look.from) / 0.45) * (1 - ease((t - look.to) / 0.4))
  if (w <= 0) return null
  const roll = hero.spin ?? 0
  return [{ ...hero, spin: roll + w * turnTo(roll, look.at(t)) }]
}

/** Every strike: the glass's two wakings, the seen footfalls, the limb leaving the floor, the palm opening, the touch, the spray, the ink coming in, the ring's surges, its closing and its tendrils. */
export const CHAMBER_HITS: number[] = [...new Set([...WAKE, ...FOOTFALLS.map((f) => f.at), OPENS, PALM, SPRAY, INK_IN, ...SURGES, CLOSE, REACH])].sort((a, b) => a - b)

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
      riders: looking,
      company,
    }
  },
  // Framed so she is never lower than about a quarter of the frame under the centre, nor further aside than about
  // 0.45 of its height: under Zoom she stays whole in the frame, the floor under her.
  (): PartShot[] => [
    // Out of the shaft, the camera easing ahead of her as she slows into the dark; the glass a dim grey slab ahead.
    { t: 87.9, cells: 5.9, hold: [2.4, -1.35], w: 1 },
    // The glass wakes, and the camera draws back a little: the glass is bigger than the frame.
    { t: 89.6, cells: 8.6, hold: [3.6, -2.4], w: 1 },
    // The long walk: the camera goes with them, a little ahead, pushing in as they go, so the glass's edge comes past
    // and its light grows toward us; a shadow gathers in the fog.
    { t: 91.4, cells: 9.4, off: [2.55, -2.6], w: 0 },
    { t: 93.6, cells: 8.7, off: [2.55, -2.45], w: 0 },
    { t: 95.8, cells: 7.9, off: [2.45, -2.3], w: 0 },
    // Abbott out of the white: the camera draws back to take it in.
    { t: 98.4, cells: 11.9, hold: [9.6, -3.2], w: 1 },
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
    // Out and over as Costello lifts a limb to write and the ink comes into the fog, and on back while the ring is
    // written, so it is always whole in the frame; coming to rest as its two ends meet (CLOSE): the whole logogram
    // in the middle of the glass, the palm and her small at its left. Then, through the swell, a slow push in on the
    // two of them and it, and on under the white rising (the veil from 129.7) to the seam's framing. She stays low
    // and left, never out of the frame under Zoom.
    { t: 122.4, cells: 7.4, hold: [X_PALM + 3.75, -2.4], w: 1 },
    { t: 124.3, cells: 7.85, hold: [X_PALM + 4.1, -2.58], w: 1 },
    { t: CLOSE, cells: 8.2, hold: [X_PALM + 4.3, -2.7], w: 1 },
    { t: 129.6, cells: 7.75, hold: [X_PALM + 3.95, -2.57], w: 1 },
    { t: OUT, cells: SEAMS.fog1.cells, hold: [X_LEAN + SEAMS.fog1.frame[0], SEAMS.fog1.frame[1]], w: 1 },
  ],
)

/** Where she rests at the glass's foot, and at the palm (the chamber's frame). */
export { X_REST, X_PALM, IN as CHAMBER_IN }

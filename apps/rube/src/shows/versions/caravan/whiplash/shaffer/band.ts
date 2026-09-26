import type { Pt } from '../../../../../parts'
import { box, part, type Company, type PartShot, type Slot } from '../kit'
import { ONSETS, QUIET, TEMPO } from '../music'
import { KX, KY, PIT, ROOM_TOP, WALL_R } from './band-plan'
import {
  ANSWER, BAND_WALK, BEAT, BUMP, DOOR_IN, DOOR_SHUT, FILL, LANDINGS, PIT_BOUNCES, SEATED, SEAT_TAPS, TANNER_DOWN, THERE, TURNS, YOU,
} from './band-motion'
import { ROOM_KIT, fletcherHead, tannerAt } from './band-people'
import { drawBandRoom } from './bandroom'

/**
 * The band (30.65 → 80.79, beats 71 → 188): the studio band comes in with the tune, and Andrew comes in off the
 * corridor to Fletcher's room. The music: the band's first chorus of Caravan.
 *
 * He pushes the door open on the band's hit (75) and comes down the room's tiers a step a bar (83, 87, 91), past
 * the trumpets, the trombones and the saxophones, their bells lifting on their hits, to roll up against the
 * conductor's podium (93¾): Fletcher's head comes down to him, and his hand points him to his place, the
 * alternate's chair beside Tanner's chart. Tanner plays; Andrew turns his pages, up on the stand's ledge and back,
 * each page going over with him on a bar line; in the tutti the trumpets stand, Fletcher flings both hands up on
 * the biggest hit, and in its one breath of silence the page goes over. On 175 Fletcher points at him: you; then at
 * the kit: off. Tanner hops down and stands aside; Andrew comes onto the kit by a fill across the toms, and lands on
 * the snare on 188, the tempo part's first beat.
 *
 * The room is `bandroom.ts` (drawn here for both parts), the timing and his path `band-motion.ts`, the people
 * `band-people.ts`.
 */

const upBeats = [LANDINGS[0], LANDINGS[1]].map((t) => t + BEAT / 2)
const turnBeats = TURNS.flatMap((t) => [t.up, t.page, t.down]).filter((t): t is number => t !== undefined)
/** The band's hits in the slot, where its bells lift: the loudest onsets. */
const bandAccents = ONSETS.filter((o) => o.t >= 30.6 && o.t < TEMPO - 0.02 && o.s >= 0.9).map((o) => o.t)
const kit = ROOM_KIT.filter((s) => s.t >= 30.6 && s.t < TEMPO - 0.02).map((s) => s.t)

/** Every strike this part makes, in show seconds (`hits.ts` gathers them; `check:shows` holds them to the music). */
export const BAND_HITS: number[] = [
  ...new Set([DOOR_IN, DOOR_SHUT, ...LANDINGS, ...upBeats, ...PIT_BOUNCES, BUMP, SEATED, ...turnBeats, ...SEAT_TAPS, TANNER_DOWN, ...FILL, ...kit, ...bandAccents].map((t) => Math.round(t * 1e4) / 1e4)),
].sort((a, b) => a - b)

interface BandState {
  begin: number
}

export const band = part<BandState>(
  {
    name: 'band',
    draw: (p, s, c) => drawBandRoom(p, c, c.t + s.begin),
  },
  (slot: Slot) => {
    const company: Company[] = [
      { who: 'fletcher', from: slot.begin, to: QUIET, at: (t) => { const [x, y] = fletcherHead(t); return { x, y } } },
      { who: 'tanner', from: slot.begin, to: QUIET, at: (t) => { const [x, y] = tannerAt(t); return { x, y } } },
    ]
    return {
      // The whole room and its corridor: it is drawn whenever any of it is in view, through both parts.
      cells: box(-1, ROOM_TOP - 1, WALL_R.x1 + 0.5, PIT + 1),
      exit: [KX + 0.5, KY] as Pt,
      lane: BAND_WALK.lane(slot.begin, DOOR_IN),
      state: { begin: slot.begin },
      company,
    }
  },
  (slot: Slot): PartShot[] => [
    // In the corridor, following, as the band comes in; through the door with him.
    { t: slot.begin, cells: 5, off: [0.9, -0.8] },
    { t: DOOR_IN, cells: 5.4, off: [1.3, -0.9] },
    // The room opens: the tiers and the band, as he comes down them a step a bar.
    { t: 34.4, cells: 8.2, hold: [7.2, -1.1], w: 0.7 },
    { t: LANDINGS[1], cells: 8.4, hold: [10.2, -0.7], w: 0.65 },
    // Up against the podium: him small at Fletcher's feet, Fletcher above.
    { t: BUMP, cells: 6.2, hold: [13.5, 0.55], w: 1 },
    { t: THERE + 0.4, cells: 6.2, hold: [13.8, 0.55], w: 1 },
    // His place: the chair, the chart; Fletcher at the edge of it.
    { t: SEATED, cells: 5.8, hold: [16.0, 0.4], w: 1 },
    { t: 49.4, cells: 5.8, hold: [16.3, 0.3], w: 1 },
    // Back to take in the saxophones and trombones at work, the conductor, the page turner.
    { t: 51.6, cells: 7.4, hold: [13.3, -0.4], w: 1 },
    // Wide for the tutti: the trumpets stand, his hands go up, the page goes over in the breath.
    { t: 55.3, cells: 8.8, hold: [11.9, -1.25], w: 1 },
    { t: ANSWER + 0.6, cells: 8.8, hold: [12.4, -1.15], w: 1 },
    // The alternate and the drummer, keeping the same time: Andrew tapping on his seat, Tanner playing his kit.
    { t: 61.8, cells: 4.4, hold: [19.4, 0.55], w: 1 },
    { t: 64.4, cells: 4.3, hold: [19.3, 0.5], w: 1 },
    // A page, and Fletcher's eye on him.
    { t: 67.2, cells: 5.8, hold: [16.6, 0.25], w: 1 },
    // Across to the band at work, the bells lifting on its hits, Fletcher driving it; back to all three of them.
    { t: 70.0, cells: 8.4, hold: [10.8, -1.05], w: 1 },
    { t: 72.9, cells: 6.6, hold: [17.9, 0.1], w: 1 },
    { t: YOU, cells: 6.6, hold: [17.9, 0.15], w: 1 },
    // Onto the kit.
    { t: 78.3, cells: 5.4, hold: [19.9, 0.2], w: 1 },
    { t: FILL[4], cells: 4.8, hold: [21.4, -0.1], w: 1 },
  ],
)

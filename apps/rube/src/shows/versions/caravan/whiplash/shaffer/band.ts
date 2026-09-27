import type { Pt } from '../../../../../parts'
import { box, part, type Company, type PartShot, type Slot } from '../kit'
import { ONSETS, QUIET, TEMPO } from '../music'
import { KX, KY, PIT, ROOM_TOP, STAND, WALL_R } from './band-plan'
import {
  ANSWER, BAND_WALK, BEAT, BUMP, DOOR_IN, DOOR_SHUT, FILL, LANDINGS, PEAK, PIT_BOUNCES, SEATED, SEAT_TAPS, TANNER_DOWN, THERE, TURNS, TUTTI,
  YOU,
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
 * alternate's chair beside Tanner's chart. Tanner plays; Andrew turns his pages with the stand's page-turner: off
 * his seat onto the treadle at its foot on a phrase's downbeat, and the sprung arm at the top of the desk sweeps the
 * page over by the next beat and swings back; in the tutti the trumpets stand, Fletcher flings both hands up on the
 * biggest hit, Andrew drops onto the treadle with it, and in its one breath of silence the page goes over. On 175
 * Fletcher points at him: you; then at
 * the kit: off. Tanner hops down and stands aside; Andrew comes onto the kit by a fill across the toms, and lands on
 * the snare on 188, the tempo part's first beat.
 *
 * The room is `bandroom.ts` (drawn here for both parts), the timing and his path `band-motion.ts`, the people
 * `band-people.ts`.
 */

/** The first page after he is seated (the page-turner's first turn), and the tutti's page (his hop up from it). */
const FIRST = TURNS[0] as { press: number; page: number; down: number }
const TUTTI_DOWN = TURNS[2].down as number

const upBeats = [LANDINGS[0], LANDINGS[1]].map((t) => t + BEAT / 2)
const turnBeats = TURNS.flatMap((t) => [t.press, t.up, t.page, t.down]).filter((t): t is number => t !== undefined)
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
    // In the corridor as the band comes in: the frame already leaning past him (practice.ts leads it there) so its
    // first chord lands on the room lit and the tiers playing; opening on, him rolling toward its door; through the
    // door with him.
    // The corridor sits low in the frame, the cut under its floor at the frame's foot: centred on him, half the frame
    // under the floor was the building's section, a black slab like a letterbox.
    { t: slot.begin, cells: 5.3, off: [2.45, -1.6] },
    { t: 31.9, cells: 6.6, hold: [4.0, -1.6], w: 0.8 },
    { t: DOOR_IN, cells: 7.1, hold: [4.4, -1.45], w: 0.7 },
    // The room opens: the tiers and the band, as he comes down them a step a bar.
    { t: 34.4, cells: 8.2, hold: [7.2, -1.1], w: 0.7 },
    { t: LANDINGS[1], cells: 8.4, hold: [10.2, -0.7], w: 0.65 },
    // Up against the podium: him small at Fletcher's feet, Fletcher above.
    { t: BUMP, cells: 6.2, hold: [13.5, 0.55], w: 1 },
    { t: THERE + 0.4, cells: 6.2, hold: [13.8, 0.55], w: 1 },
    // His place: the chair, the chart, Tanner at the kit; Fletcher whole on his podium at the left of it.
    { t: SEATED, cells: 5.8, hold: [17.3, 0.4], w: 1 },
    // The first page, as an insert on the page-turner and the group it serves: Andrew on his chair, the whole stand
    // from the arm over its desk to the treadle at its foot, and Tanner on the snare keeping the time Andrew taps.
    // Fletcher is out of it: its left edge stays past his beating hand (15.07 at its reach), so he is never cut in
    // half at the edge through the insert, and its right edge keeps Tanner in by more than his radius. He drops onto
    // the treadle on the downbeat and the arm takes the page over; a slow push in on the desk as the arm swings back;
    // out again with his hop up to the seat, one pull-out that opens past Fletcher's whole figure on the podium and
    // carries on, leaning left, out to the room.
    { t: FIRST.press - 2 * BEAT - 0.5, cells: 4.3, hold: [19.0, 0.55], w: 1 },
    { t: FIRST.press, cells: 4.1, hold: [18.95, 0.5], w: 1 },
    { t: FIRST.page + 0.5, cells: 3.9, hold: [18.9, 0.3], w: 1 },
    { t: FIRST.down + 0.6, cells: 5.5, hold: [17.5, 0.4], w: 1 },
    // Back to take in the saxophones and trombones at work, the conductor, the page turner.
    { t: 51.6, cells: 7.4, hold: [13.3, -0.4], w: 1 },
    { t: 53.95, cells: 7.2, hold: [13.0, -0.7], w: 1 },
    // The tutti, up among the heads and the bells: the trumpets standing behind him as his beat grows; across to his
    // two hands flung up on the biggest hit and the whole stand beside them, Andrew dropping onto its treadle with
    // the hit; the page goes over in the breath as the hands drop to his chest; in on the stand as he hops back up.
    { t: TUTTI - 0.05, cells: 5.0, hold: [10.9, -1.85], w: 1 },
    { t: TUTTI + 0.85, cells: 4.8, hold: [11.4, -1.85], w: 1 },
    { t: PEAK - 0.08, cells: 5.05, hold: [16.05, -0.1], w: 1 },
    { t: ANSWER + 0.34, cells: 4.75, hold: [16.3, 0.05], w: 1 },
    { t: TUTTI_DOWN, cells: 4.4, hold: [17.2, 0.3], w: 1 },
    // The alternate and the drummer, keeping the same time: Andrew tapping on his seat, Tanner playing his kit.
    // Fletcher's beating hand reaches to 15.07 on his podium, so the frame's left edge stays past it (15.15), while
    // under Zoom (the same centre, 1.5x closer) both balls stay inside by about their radius and a little more: a
    // window only about 0.05 cells wide in size and centre, so move these together.
    { t: 61.3, cells: 4.77, hold: [19.39, 0.62], w: 1 },
    { t: 64.4, cells: 4.74, hold: [19.38, 0.6], w: 1 },
    // A page, and Fletcher's eye on him.
    { t: 66.9, cells: 5.8, hold: [16.4, 0.25], w: 1 },
    // Across and up to the band at work, then along the tiers at the bells' height: from the trumpets down past the
    // trombones (centred on their hit, 71.58) to the saxophones, and on out to all three of them.
    { t: 68.6, cells: 7.0, hold: [10.8, -0.5], w: 1 },
    { t: 70.0, cells: 3.8, hold: [6.4, -1.8], w: 1 },
    { t: 71.58, cells: 3.7, hold: [8.8, -1.1], w: 1 },
    { t: 72.5, cells: 3.8, hold: [11.3, -0.45], w: 1 },
    { t: 74.3, cells: 6.6, hold: [17.9, 0.1], w: 1 },
    { t: YOU, cells: 6.6, hold: [17.9, 0.15], w: 1 },
    // Onto the kit.
    { t: 78.3, cells: 5.4, hold: [19.9, 0.2], w: 1 },
    { t: FILL[4], cells: 4.8, hold: [21.4, -0.1], w: 1 },
  ],
)

import { R, laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { box, carried, part, route, type Company, type PartShot, type Slot, type Way } from '../kit'
import { G, hop, throwFor } from '../physics'
import { SEAMS } from '../seams'
import { alleyOver, drawAlley } from './premiere-alley'
import { drawPremiere, premiereOver, spotOnHer } from './premiere-carpet'
import * as C from './premiere-clock'

/**
 * EVERYWHERE. Out of the dryer's door into her movie-star life.
 *
 * The premiere (57.95 to 69): she comes down out of the dryer's flight onto the red carpet of her own premiere, into
 * a wall of press flashes. The spotlight on the marquee has been hunting over the press, and on the loudest note it
 * swings onto her and stays. She clips the rope line twice, and its brass posts go over like dominoes on the music's
 * runs; as she passes the theatre's doors they swing wide on the hit. At the carpet's end the steps go down, round
 * the corner of the theatre, into the alley.
 *
 * The alley (69 to 86.3): the rain begins, and the world slows. She floats down the steps one at a time, the neon
 * washer in the laundromat's window stuttering on as she hangs at the top of a float. Waymond waits under the lamp at
 * the drain. She reaches him (76.46), a touch, and they are still. Then the rain comes on full, the downspout floods
 * the drain, and its cover rocks under her and gives: she drops away from him into the race under the landing, which
 * carries her out of its mouth in the terrace wall on the jump. He goes to where she was, and stays.
 *
 * `premiere-clock.ts` has the times and the ground; `premiere-carpet.ts` and `premiere-alley.ts` draw it.
 */

interface PremiereState {
  begin: number
  lane: Lane
}

/** Every strike this part makes, in show seconds. */
export const PREMIERE_HITS: number[] = C.PREMIERE_STRIKES

export const premiere = part<PremiereState>(
  {
    name: 'premiere',
    flight: true,
    draw: (p, s, c) => {
      const t = c.t + s.begin
      const q = laneAt(s.lane, c.t)
      const her: Pt = [q.x, q.y]
      drawPremiere(p, c, t)
      drawAlley(p, c, t, her)
      spotOnHer(p, c, t, her)
    },
    over: (p, s, c) => {
      const t = c.t + s.begin
      premiereOver(p, c, t)
      alleyOver(p, c, t)
    },
  },
  (slot) => build(slot),
  (slot) => shots(slot),
)

function build(slot: Slot) {
  const at = (T: number) => T - slot.begin
  const segs: Seg[] = []
  // The dryer's throw, carried on, down onto the carpet; and a bounce.
  const start: Way = { at: 0, p: [-0.5, 0] }
  const down = throwFor(start, SEAMS.premiere.v, at(C.LAND))
  segs.push(...route([start, { ...down, p: C.LAND_AT }]))
  const landed: Way = { at: at(C.LAND), p: C.LAND_AT }
  segs.push(...route([landed, hop(landed, C.BOUNCE_AT, at(C.BOUNCE))]))
  // Along the carpet.
  segs.push(...carried((a) => [C.carpetX(a + slot.begin), C.YC], at(C.BOUNCE), at(C.EDGE_T), Math.ceil((C.EDGE_T - C.BOUNCE) * 30)))
  // Off its end and down the steps: two quick, then the floats.
  const edge: Way = { at: at(C.EDGE_T), p: [C.EDGE_X, C.YC] }
  segs.push(...route([edge, hop(edge, C.STEP_LAND[0], at(C.STEPS[0]))]))
  for (let i = 1; i < C.STEPS.length; i++) {
    const from: Way = { at: at(C.STEPS[i - 1]), p: C.STEP_LAND[i - 1] }
    const arc = i === 1 ? (G * (C.STEPS[1] - C.STEPS[0]) ** 2) / 8 : C.STEP_ARC[i]
    segs.push(...route([from, { at: at(C.STEPS[i]), p: C.STEP_LAND[i], arc }]))
  }
  // Across the landing to him, slower and slower.
  segs.push(...carried((a) => [C.approachX(a + slot.begin), C.YL], at(C.STEPS[5]), at(C.TOUCH), 50))
  // Still, with him; then riding the cover as it rocks.
  const rest = (a: number): Pt => C.onCover(a + slot.begin, C.COVER_R - C.MEET_X, R)
  segs.push(...route([{ at: at(C.TOUCH), p: rest(at(C.TOUCH)) }, { at: at(C.RATTLE[0]), p: rest(at(C.RATTLE[0])) }]))
  segs.push(...carried(rest, at(C.RATTLE[0]), at(C.DROP), 90))
  // Down the opening cover, off its edge, down the shaft into the race.
  segs.push(...carried((a) => C.slideAt(a + slot.begin), at(C.DROP), at(C.OFF.t), 24))
  segs.push(...carried((a) => C.fallAt(a + slot.begin), at(C.OFF.t), at(C.SPLASH), 30))
  // Carried along the race to its last bend, and up the lip out of its mouth.
  segs.push(...carried((a) => C.raceAt(a + slot.begin), at(C.SPLASH), at(C.LIP), 120))
  segs.push(...route([{ at: at(C.LIP), p: C.BEND_AT }, { at: at(C.END), p: C.MOUTH }]))

  const lane: Lane = { segs, fire: at(C.LAND) }
  const company: Company[] = [
    {
      who: 'waymond',
      from: C.WAYMOND_FROM,
      to: C.END,
      at: (T) => {
        const [x, y] = C.waymondAt(T)
        return { x, y }
      },
    },
  ]
  return {
    cells: box(-12, -14, 38, 10, 2),
    exit: [C.MOUTH[0] + 0.5, C.MOUTH[1]] as Pt,
    lane,
    state: { begin: slot.begin, lane },
    company,
  }
}

/* ------------------------------------------------------------------ the camera */

function shots(slot: Slot): PartShot[] {
  const two: Pt = [(C.MEET_X + C.WAYMOND_X) / 2, C.YL]
  return [
    // Out of the dryer's close framing, pulling back as she comes down into the flashes.
    { t: slot.begin + 0.45, cells: 3.1, off: [0.4, -0.35] },
    { t: C.BOUNCE + 0.18, cells: 4.3, off: [0.9, -0.9] },
    // Wide and high: the spotlight on the marquee, hunting, swings down out of the dark onto her; and in again.
    { t: 60.3, cells: 8.2, off: [3.6, -2.3] },
    { t: C.SPOT, cells: 7.2, off: [3.1, -1.85] },
    { t: C.VOLLEY + 0.05, cells: 5.0, off: [2.3, -1.1] },
    { t: 62.6, cells: 4.8, off: [1.6, -1.1] },
    // Leading her down the carpet so the posts are seen going ahead of her.
    { t: C.RUN1[0], cells: 4.6, off: [1.7, -0.8] },
    { t: 64.6, cells: 4.7, off: [1.2, -0.9] },
    // The doors beside her as they burst.
    { t: C.DOORS_WIDE, cells: 4.8, off: [0.6, -1.4] },
    { t: C.RUN2[2], cells: 4.8, off: [1.5, -0.85] },
    { t: 68.3, cells: 6.0, off: [1.8, -0.8] },
    // Round the corner and down: the alley opens, wide, as the rain begins, and follows her down.
    { t: 69.4, cells: 7.0, hold: [C.EDGE_X + 2.6, 0.9], w: 0.7 },
    { t: 70.8, cells: 7.6, hold: [C.EDGE_X + 3.6, 0.7], w: 1 },
    { t: 73.2, cells: 6.4, hold: [C.EDGE_X + 4.2, 1.5], w: 1 },
    // In on the two of them as she comes to him, and slowly closer through the stillness.
    { t: C.STEPS[5] + 0.5, cells: 5.2, hold: [two[0] - 0.3, two[1] - 1.2], w: 1 },
    { t: C.TOUCH, cells: 4.2, hold: [two[0] + 0.3, two[1] - 1.0], w: 1 },
    { t: 80.8, cells: 2.9, hold: [two[0] + 0.1, two[1] - 0.55], w: 1 },
    // Back a little as the cover rocks; back further as it gives, to hold him above and her falling below.
    { t: C.RATTLE[3], cells: 3.5, hold: [two[0], two[1] - 0.4], w: 1 },
    { t: 82.6, cells: 4.8, hold: [two[0] + 0.4, two[1] + 0.9], w: 1 },
    { t: C.SPLASH + 0.25, cells: 5.4, hold: [two[0] + 0.85, two[1] + 1.3], w: 1 },
    // After her along the race, and on her at the mouth for the jump.
    { t: 85.3, cells: 5.0, off: [0.4, -0.9], hold: [C.BEND_AT[0] - 1.4, C.BEND_AT[1] - 1.1], w: 0.4 },
    { t: C.END, cells: SEAMS.dojo.cells, off: [0.5, -0.4] },
  ]
}

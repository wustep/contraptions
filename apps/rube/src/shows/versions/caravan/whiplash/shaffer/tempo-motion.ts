import type { Pt } from '../../../../../parts'
import { clamp } from '../../../../../../../../src/core/ease'
import { QUIET, TEMPO, tune } from '../music'
import { G_EARTH } from '../physics'
import { PIT_Y, TANNER_ASIDE, WALL_R, kitLand } from './band-plan'
import { BEAT } from './band-motion'
import { Walk, laneAtShow } from './band-walk'

/**
 * The tempo part's clock and Andrew's path through it (80.79 → 130.5: "not quite my tempo"), in the band's frame
 * (the part moves it to its own). The music never stops, so the test is a machine: Fletcher's hand keeps a tempo
 * over the snare and the ball has to meet it.
 *
 *   188  on the snare. Fletcher comes from his podium; his hand counts him in
 *   190  he plays: two strokes with the hand, then he rushes (a stroke every quarter, twice the hand)
 *   196  STOP: the palm comes down flat on the head beside him
 *   199  again. 202  he drags: a stroke every beat and a half, high and slow        208.94  STOP
 *   ...  Fletcher leans in close: rushing, or dragging?
 *   214  again: in time. Fletcher walks away, to the alternate's chair, and lifts it
 *   228  he throws it. Andrew ducks behind the snare; it flies over him, 229½ into the wall behind, 231 down
 *   236–239  count: one, two, three, and on four the hand slaps the hoop by his ear.  244–247 again
 *   250  "rushing".  252  the last slap
 *   254  again, in time, the hand beating with him, stroke for stroke...    276  STOP. Not quite
 *   278  Fletcher points: Tanner. 280  Andrew drops off the kit; Tanner hops up past him, onto it (286)
 *   295  Andrew goes. 298.71  he pushes the door; 300 it slams behind him on the band's last hit
 *   304  in the dark corridor, rolling, as the band drops out
 */

export const SNARE: Pt = kitLand('snare')

/** Trial one: in time for two strokes, then rushing (every quarter) to the stop. */
export const RUSH = [tune(190), tune(191), ...[191.5, 192, 192.5, 193, 193.5, 194, 194.5, 195, 195.5].map(tune)]
export const STOP1 = tune(196)
/** The hand's count-in for trial two, and the dragging strokes (every beat and a half) to the stop. */
export const AGAIN1 = 85.508
export const DRAG = [202, 203.5, 205, 206.5, 208].map(tune)
export const STOP2 = 89.758
/** Fletcher leans in: rushing or dragging? */
export const LEAN = 90.0
/** Trial three: in time, a stroke a beat, while Fletcher fetches the chair. The last is the duck. */
export const STEADY = Array.from({ length: 15 }, (_, i) => tune(214 + i))
export const DUCK = tune(228)
export const THROW = DUCK
export const WALL = 98.571
export const CRASH = 99.204
/** He comes back up over the rim once it is down. */
export const PEEK = 99.35
/** The counts: three strokes, and the slap on four. Twice; the answer; the last slap. */
export const COUNT1 = [236, 237, 238].map(tune)
export const SLAP1 = tune(239)
export const COUNT2 = [244, 245, 246].map(tune)
export const SLAP2 = 106.08
export const ANSWER = tune(250)
export const SLAP3 = 108.232
/** Trial four: in time with the hand, stroke for stroke, to the last stop. */
export const WITH = Array.from({ length: 22 }, (_, i) => tune(254 + i))
export const STOP3 = tune(276)
/** Tanner. Andrew drops off the kit to the floor; Tanner hops up past him onto it. */
export const POINT = tune(278)
export const DROP_OFF = tune(280)
export const TANNER_GO = tune(283.5)
export const TANNER_ON = tune(286)
/** Andrew goes: to the door, pushes it, and it slams behind him on the band's last hit. */
export const LOOK = 123.9
export const GO = 126.631
export const PUSH = 128.231
export const SLAM = 128.781

/** The ball in the far corridor at the slot's end, and the pace he leaves at. */
export const EXIT_V = 1.2

/* ------------------------------------------------------------------ his path */

const ducked: Pt = [SNARE[0] + 0.02, SNARE[1] + 0.52]

function build(): Walk {
  const w = new Walk(TEMPO, SNARE)
  // Trial one: a first stroke from rest, in time, then the patter.
  w.rest(RUSH[0] - BEAT)
  w.hop(SNARE, RUSH[0])
  w.bounces(RUSH.slice(1))
  w.bounces([STOP1])
  w.rest(DRAG[0] - 1.5 * BEAT)
  // Trial two: high and slow; the last short one as the palm comes down.
  w.bounces(DRAG)
  w.bounces([STOP2])
  w.rest(STEADY[0] - BEAT)
  // Trial three, in time; the duck.
  w.bounces(STEADY.slice(0, -1))
  w.hop(SNARE, DUCK)
  w.ease(ducked, DUCK + 0.14, 'out')
  w.rest(PEEK)
  w.ease(SNARE, PEEK + 0.75, 'inout')
  // The counts, and the flinches from the slaps (away from his hand, on the far side of the drum).
  const flinch = (at: number, d: number, back: number) => {
    w.rest(at)
    w.ease([SNARE[0] + d, SNARE[1] - 0.03], at + 0.12, 'out')
    w.ease(SNARE, at + back, 'inout')
  }
  w.rest(COUNT1[0] - BEAT)
  w.bounces(COUNT1)
  flinch(SLAP1, -0.1, 0.9)
  w.rest(COUNT2[0] - BEAT)
  w.bounces(COUNT2)
  flinch(SLAP2, -0.12, 0.9)
  // The answer: a small roll toward him, and back.
  w.rest(ANSWER - 0.2)
  w.ease([SNARE[0] + 0.06, SNARE[1]], ANSWER + 0.25, 'inout')
  w.ease(SNARE, ANSWER + 0.9, 'inout')
  flinch(SLAP3, -0.18, 1.3)
  // Trial four: in time with the hand, to the last stop.
  w.rest(WITH[0] - BEAT)
  w.bounces(WITH)
  w.bounces([STOP3])
  // Off the kit, down to the floor on the hi-hat's side.
  w.rest(DROP_OFF - 1.5 * BEAT)
  const floor: Pt = [SNARE[0] + 1.5, PIT_Y]
  w.hop(floor, DROP_OFF, G_EARTH).landed()
  w.vx = 0
  // A slow way toward the door; Tanner goes up over him; a look back at the kit; then out.
  w.travel([TANNER_ASIDE[0] - 1.25, PIT_Y], TANNER_GO + 0.3, 0)
  w.rest(LOOK)
  w.ease([TANNER_ASIDE[0] - 1.42, PIT_Y], LOOK + 0.9, 'inout')
  w.rest(LOOK + 1.4)
  w.ease([TANNER_ASIDE[0] - 1.2, PIT_Y], GO - 0.2, 'inout')
  w.rest(GO)
  const plate = WALL_R.x0 - 0.13
  w.travel([plate, PIT_Y], PUSH, 1.45)
  // Through, as the door swings out, and on down the corridor at the pace he leaves with.
  const past = plate + 0.5 * (1.45 + EXIT_V) * (QUIET - PUSH)
  w.roll([past, PIT_Y], QUIET)
  return w
}

export const TEMPO_WALK = build()
/** The lane's last point, in the band's frame. */
export const TEMPO_END: Pt = TEMPO_WALK.at
const LANE = TEMPO_WALK.lane(TEMPO, RUSH[0])
/** Where Andrew is at show time `T`, in the band's frame. */
export const heroTempo = (T: number): Pt => laneAtShow(LANE, TEMPO, T)

/* ------------------------------------------------------------------ the far door */

/** The door to the far corridor, 0 shut to 1 wide (swung out into the corridor): pushed, flung wide, slammed. */
export function doorR(T: number): number {
  const a = T - PUSH
  if (a <= 0) return 0
  if (T < SLAM) {
    const open = 1 - Math.exp(-a / 0.09)
    const back = clamp((T - (SLAM - 0.2)) / 0.2)
    return 0.9 * open * (1 - back * back)
  }
  const b = T - SLAM
  return Math.max(0, 0.05 * Math.exp(-b / 0.07) * Math.sin(b * 45))
}

/** How lit the far corridor is: the room's light through the open door, then nothing. */
export const spill = (T: number): number => doorR(T)

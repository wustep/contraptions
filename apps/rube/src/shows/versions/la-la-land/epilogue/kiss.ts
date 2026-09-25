import type p5 from 'p5'
import { clamp, easeInQuad } from '../../../../../../../src/core/ease'
import { type Pt } from '../../../../parts'
import { box, carried, knock, part, route, smooth, type Companion, type Ctx, type Way } from './kit'
import { KISS, KISS_PEAK } from './music'
import { G_EARTH, hop } from './physics'
import { beam, glow } from './rig'
import { doorLight, drawPiano, KISS_AT, ROOM, STEPS, treadBall, treadX } from './room'
import { PAINT } from './worlds'
import { hopAt, pchip, stroll } from './club-motion'

/**
 * The kiss: the room turns into the dream.
 *
 * He has just touched her at her table. On the burst the lamp over the
 * piano blooms into a spotlight on the two of them, and on the peak of the
 * swell the curtain behind the piano draws open on a band (the room's own
 * scenery does that) and colour floods the flats. The two rise: the light
 * lifts them off the floor, he passes over her, and on the cymbal's hit
 * they come down together on the far side, she a step behind him. They
 * roll to the stairs; on the two sharp hits he hops the first two steps,
 * she hops the first as he lands the second; then the door at the top
 * opens and the street's light comes down the stairs, and they glide up
 * it and out through the door, level, as the swing begins.
 *
 * The part's frame: the touch is (-0.5, 0), on the club's floor; the
 * room's origin is at ORIGIN, so a room point (x, y) is at (x + ORIGIN.x,
 * y + ORIGIN.y) here.
 */

/** The room's origin in this frame. */
const ORIGIN: Pt = [-KISS_AT[0] - 0.5, -KISS_AT[1]]
const inRoom = (x: number, y: number): Pt => [x + ORIGIN[0], y + ORIGIN[1]]

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The burst: the lamp blooms. The peak: the curtain starts to open, the two begin to rise. */
const BURST = KISS
const PEAK = KISS_PEAK
/** The cymbal's hit they come down on. */
const LAND = 68.336
/** The two sharp hits: a hop onto the first step, and onto the second. */
const STEP1 = 70.949
const STEP2 = 71.192
/** The door opens from the second step, and its light comes down the stairs. */
const DOOR_OPENS = STEP2
export const KISS_HITS: number[] = [BURST, PEAK, LAND, STEP1, STEP2]

/* ------------------------------------------------------------------ the geometry */

/** Where a ball rests on step `i`, in this frame. */
const step = (i: number): Pt => inRoom(treadX(i), treadBall(i))
/** The door, and the lane's end (the door, level). */
const DOOR: Pt = inRoom(ROOM.door[0], ROOM.door[1])
const EXIT: Pt = [DOOR[0] + 0.5, DOOR[1]]
/** Where they come down after the rise, and where he takes off for the first step. */
const DOWN = 0.75
const TAKEOFF = step(0)[0] - 0.62
/** The lamp, which becomes the spotlight. */
const LAMP: Pt = inRoom(ROOM.lamp[0], ROOM.lamp[1])
/** The climb: from the second step's rest up the flight to the top step's, then level to the door. */
const TOP = step(STEPS - 1)
const SLOPE = Math.hypot(TOP[0] - step(1)[0], TOP[1] - step(1)[1])
const CLIMB = SLOPE + (DOOR[0] - TOP[0])
/** A point `s` along the climb from the second step. */
function climb(s: number): Pt {
  const a = step(1)
  if (s <= SLOPE) {
    const u = Math.max(-1, s) / SLOPE
    return [a[0] + (TOP[0] - a[0]) * u, a[1] + (TOP[1] - a[1]) * u]
  }
  return [TOP[0] + (s - SLOPE), TOP[1]]
}
/** How far along the climb he is: from rest on the second step to the door at 1.5 cells a second. */
const along = pchip([STEP2, 73.3, 75.72], [0, CLIMB * 0.42, CLIMB], 0.25, 1.5)

/* ------------------------------------------------------------------ the rise */

const RISE_T = PEAK
const RISE_H = 1.15
const HER_H = 0.72
/** The lift: up smoothly, a hang, and down gathering speed onto the hit. `u` is 0..1 over the rise. */
const lift = (u: number, from: number, to: number): number => smooth(u, from, to) * (1 - easeInQuad(clamp((u - 0.62) / 0.38)))

/** He in the air: over her, and down to DOWN on the hit. */
function himRising(T: number): Pt {
  const u = clamp((T - RISE_T) / (LAND - RISE_T))
  const x = -0.5 + (DOWN + 0.5) * smooth(u, 0.08, 0.96)
  return [x, -RISE_H * lift(u, 0, 0.5)]
}
/** She in the air: a little later and lower, under him as he passes, and down beside him on the hit. */
function herRising(T: number): Pt {
  const u = clamp((T - RISE_T) / (LAND - RISE_T))
  const x = -0.22 + (DOWN - 0.32 + 0.22) * smooth(u, 0.2, 1)
  return [x, -HER_H * lift(u, 0.14, 0.62)]
}

/* ------------------------------------------------------------------ the lane, as functions of show time */

/** He, from the touch to the door. */
function him(T: number): Pt {
  if (T < RISE_T) return [-0.5, 0]
  if (T < LAND) return himRising(T)
  if (T < STEP1 - 0.3) return [DOWN + (TAKEOFF - DOWN) * stroll((T - LAND) / (STEP1 - 0.3 - LAND)), 0]
  if (T < STEP1) return hopAt([TAKEOFF, 0], step(0), 0.3, G_EARTH, (T - (STEP1 - 0.3)) / 0.3)
  if (T < STEP2) return hopAt(step(0), step(1), STEP2 - STEP1, G_EARTH, (T - STEP1) / (STEP2 - STEP1))
  return climb(along(T))
}

/** She, a step behind: down beside him, after him to the stairs, onto the first step as he lands the second, and up behind him. */
function her(T: number): Pt {
  if (T < RISE_T) return [-0.22, 0]
  if (T < LAND) return herRising(T)
  if (T < STEP1) return [DOWN - 0.32 + (TAKEOFF - DOWN + 0.32) * stroll((T - LAND) / (STEP1 - LAND)), 0]
  if (T < STEP2) return hopAt([TAKEOFF, 0], step(0), STEP2 - STEP1, G_EARTH, (T - STEP1) / (STEP2 - STEP1))
  // Behind him on the climb by a step less a little, and level with him, a ball's width and a bit back, by the door.
  const s = along(T) - (SLOPE / (STEPS - 2)) * (1 - 0.48 * smooth(T, STEP2, 75.0))
  const on = climb(s)
  const h = him(T)
  const w = smooth(T, 74.9, 75.72)
  return [on[0] + (h[0] - 0.32 - on[0]) * w, on[1] + (h[1] - on[1]) * w]
}

interface KissState {
  begin: number
}

export const kiss = part<KissState>(
  {
    name: 'kiss',
    draw: (p: p5, s: KissState, c: Ctx) => {
      const T = c.t + s.begin
      const { k } = c
      p.push()
      p.translate(ORIGIN[0] * k, ORIGIN[1] * k)
      drawPiano(p, c, true)
      // The door opens and the street's light comes down the stairs.
      doorLight(p, c, smooth(T, DOOR_OPENS, DOOR_OPENS + 1.4))
      p.pop()
      if (T < BURST - 0.05 || T > 75.72 + 0.6) return
      // The lamp blooms into a spotlight on the two: a flash on the burst, wider on the peak, following them up the
      // stairs, and giving way to the street's light at the top.
      const bloom = smooth(T, BURST, BURST + 0.12) * (1 + 0.5 * knock(T - BURST, 0.25)) + 0.35 * smooth(T, PEAK, PEAK + 0.1) * (1 + 0.6 * knock(T - PEAK, 0.3))
      const fade = 1 - smooth(T, 73.2, 74.8)
      const a = Math.min(1.6, bloom) * fade
      if (a > 0.01) {
        const [hx, hy] = him(T)
        const [mx, my] = her(T)
        const cx = (hx + mx) / 2
        const cy = (hy + my) / 2
        beam(p, c, LAMP, [cx, cy + 0.25], 2.4, 0.17 * a, PAINT.beam)
        glow(p, c, cx, cy, 1.15, 0.22 * a, PAINT.beam)
      }
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const local = (T: number): Pt => him(T)
    const segs = carried((t) => local(t + slot.begin), 0, at(LAND), 80)
    // The stroll to the stairs, the two hops, and the climb, sampled from the same functions the drawing reads.
    const toStairs: Way = { at: at(STEP1 - 0.3), p: [TAKEOFF, 0] }
    segs.push(...carried((t) => local(t + slot.begin), at(LAND), toStairs.at, 40))
    segs.push(...route([toStairs, hop(toStairs, step(0), at(STEP1)), hop({ at: at(STEP1), p: step(0) }, step(1), at(STEP2))]))
    segs.push(...carried((t) => local(t + slot.begin), at(STEP2), at(slot.end), 90))
    const mia = (T: number): Companion => {
      const [x, y] = her(T)
      return { x, y }
    }
    return {
      cells: box(-19.5, -11, EXIT[0] + 1, 3),
      exit: EXIT,
      lane: { segs, fire: 0 },
      state: { begin: slot.begin },
      company: [{ from: slot.begin, to: slot.end, at: mia }],
    }
  },
  (slot) => [
    // The two-shot the piano part ends on (its hold, in this frame), then a push in as the room turns, and up the stairs with them.
    { t: slot.begin, cells: 5, hold: inRoom(14.4, -0.2), w: 1 },
    { t: PEAK + 0.4, cells: 4.6, hold: inRoom(14.4, -0.2), w: 0.6 },
    { t: 67.6, cells: 3.6, off: [0.2, 0.1] },
    { t: LAND, cells: 3.6, off: [0.35, 0] },
    { t: STEP2, cells: 4.2, off: [0.5, -0.5] },
    { t: slot.end, cells: 5, off: [0.8, -0.3] },
  ],
)


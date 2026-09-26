import { R, type Pt, type Seg } from '../../../../../parts'
import { box, carried, part, route, type PartShot, type Slot, type Way } from '../kit'
import { G_EARTH } from '../physics'
import type { KitStroke } from '../stub'
import { ACCENTS, BIG, BOUNCE, FIRST, FOLD, GO, HOP, HOP_MAX, LAND, LAST, LATCH, SHIFT, SLAM, STOMPS, hopHeight } from './fast-clock'
import { BALL_X, LEVER, drawEngine, leverTop } from './fast-engine'
import { CLOSE, KIT_AT } from './stage'

/**
 * Carnegie Hall, the build (369.98 → 423.34): from the hush to the loudest and fastest playing of the solo, and
 * back down to the soft ride.
 *
 * He lands on the snare. Beside it an engine rises out of the stage: a flywheel on a cast-iron frame, a post, and
 * a lever out under the hi-hat. He plays the snare twice while it rises (the second the build's loudest stroke),
 * glances at it, rolls across onto the lever and stomps it: the first kick, and the flywheel starts to turn, a turn
 * a stomp. The head swings round off the post over the snare and drops onto its seat: one stick, thrown by its cam,
 * strikes with every stomp, and the stomps come faster and the wheel spins up. On the roll (383) the second stick
 * drops in and the camshaft runs at the roll's own pace, a stroke every 70 ms: the sticks a blur over the head, the
 * wheel a dark disc, and him stomping every kick, every 150 ms. Near the end the sticks let go and the head folds
 * back to its post; on his last stomp he rolls home across the lever onto the snare and settles there as the ride
 * begins (no strike). The engine sinks back into the stage.
 *
 * The clock is `fast-clock.ts`, the drawing `fast-engine.ts`. The frame is Carnegie's (`stage.ts`).
 */

/* ------------------------------------------------------------------ the strikes */

const strokes: KitStroke[] = [
  // The landing from the hush, and his two strokes on the snare while the engine rises.
  { t: LAND, piece: 'snare' },
  { t: BOUNCE, piece: 'snare' },
  { t: SLAM, piece: 'snare' },
]
// Every stomp is a kick.
for (const s of STOMPS) strokes.push({ t: s, piece: 'kick' })
// From the latch to the roll, the one stick strikes the snare with every stomp.
for (const s of STOMPS) if (s >= LATCH - 1e-6 && s <= SHIFT + 1e-6) strokes.push({ t: s, piece: 'snare' })
// In the roll the sticks are a blur; the head answers the roll's accents, a stick landing on each.
for (const a of ACCENTS) strokes.push({ t: a.t, piece: 'snare' })
strokes.sort((a, b) => a.t - b.t)

export const FAST_KIT: KitStroke[] = strokes
/** Every strike: the kit's, and the head knocking home against its post as it folds away (the fill's accent). */
export const FAST_HITS: number[] = [...new Set([...strokes.map((s) => s.t), FOLD[1]])].sort((a, b) => a - b)

/* ------------------------------------------------------------------ the lane */

interface FastState {
  begin: number
}

/** Where he stands on the lever at show time `T` (it dips under him on a stomp). */
const onLever = (x: number, T: number): Pt => {
  if (x <= LEVER.x0 - 0.02) return [x, 0]
  const top = leverTop(x, T)
  return [x, top[1] - R]
}

function build(slot: Slot) {
  const B = slot.begin
  const span = slot.end - slot.begin
  const at = (T: number): number => T - B
  const snare: Pt = [...KIT_AT]
  const segs: Seg[] = []
  let cur: Way = { at: 0, p: snare }
  const go = (w: Way): void => {
    segs.push(...route([cur, w]))
    cur = w
  }
  const ride = (fn: (t: number) => Pt, t1: number, n: number): void => {
    segs.push(...carried(fn, cur.at, t1, n))
    cur = { at: t1, p: fn(t1) }
  }
  const flight = (T: number, g = G_EARTH): number => (g * T * T) / 8

  // On the snare: a stroke in place, a glance toward the engine as it rises, the slam.
  go({ at: at(BOUNCE), p: snare, arc: flight(BOUNCE - LAND) })
  go({ at: at(370.86), p: snare })
  go({ at: at(371.04), p: [snare[0] + 0.07, 0], ease: 'inout' })
  go({ at: at(371.23), p: snare, ease: 'inout' })
  go({ at: at(SLAM), p: snare, arc: flight(SLAM - 371.23) })
  // Across to the lever, and up onto it: the first stomp.
  go({ at: at(GO), p: snare })
  go({ at: at(HOP), p: [BALL_X - 0.17, 0], ease: 'inout' })
  go({ at: at(FIRST), p: onLever(BALL_X, FIRST), arc: hopHeight(FIRST - HOP) })
  // Every stomp a hop landing on the lever; a long gap is a rest riding the lever, then a hop.
  for (let i = 1; i < STOMPS.length; i++) {
    const a = STOMPS[i - 1]
    const b = STOMPS[i]
    const gap = b - a
    if (gap > HOP_MAX + 0.02) {
      ride((t) => onLever(BALL_X, B + t), at(b - HOP_MAX), Math.max(2, Math.ceil((gap - HOP_MAX) / 0.02)))
      go({ at: at(b), p: onLever(BALL_X, b), arc: hopHeight(HOP_MAX) })
    } else {
      go({ at: at(b), p: onLever(BALL_X, b), arc: hopHeight(gap) })
    }
  }
  // Home: from the last stomp he rolls back along the lever onto the snare and comes to rest in its middle.
  const t0 = at(LAST)
  const t1 = span
  const home = (t: number): Pt => {
    const u = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)))
    const e = u * u * (3 - 2 * u)
    const x = BALL_X + (snare[0] - BALL_X) * e
    return x > LEVER.x0 ? onLever(x, B + t) : [x, 0]
  }
  segs.push(...carried(home, t0, t1, 90))
  // The last piece ends exactly on the snare.
  segs[segs.length - 1] = { ...segs[segs.length - 1], to: snare }

  return {
    cells: box(-2, -3, 3, 3),
    exit: [0, 0] as Pt,
    lane: { segs, fire: at(BOUNCE) },
    state: { begin: slot.begin },
  }
}

/* ------------------------------------------------------------------ the camera */

function shots(slot: Slot): PartShot[] {
  const close = { cells: CLOSE.cells, hold: CLOSE.hold, w: 1 }
  return [
    { t: slot.begin, ...close },
    // Over to the engine as it rises and he goes across to it.
    { t: 371.5, cells: 4.5, hold: [0.1, 0.35], w: 1 },
    // Close on the head as the first stick comes down; across to him on the biggest stomp of the spin-up; back to
    // the whole engine as it gathers speed.
    { t: LATCH, cells: 3.3, hold: [-0.2, -0.05], w: 1 },
    { t: BIG, cells: 3.3, hold: [0.75, 0.2], w: 1 },
    { t: 381.4, cells: 4.0, hold: [0.35, 0.5], w: 1 },
    { t: SHIFT, cells: 3.7, hold: [0.3, 0.35], w: 1 },
    // The roll: back to see all of it at full cry, and Fletcher on his podium, watching it.
    { t: 389.5, cells: 5.1, hold: [1.75, -0.15], w: 1 },
    { t: 395.4, cells: 4.8, hold: [1.65, -0.1], w: 1 },
    // In on the peak, close on the sticks; across to him stomping; back out, Fletcher again; in for the last push.
    { t: 399.4, cells: 3.0, hold: [0.35, 0.15], w: 1 },
    { t: 403.2, cells: 3.0, hold: [0.05, 0.1], w: 1 },
    { t: 406.6, cells: 3.0, hold: [0.95, 0.3], w: 1 },
    { t: 410.6, cells: 4.6, hold: [0.9, 0.2], w: 1 },
    { t: 414.8, cells: 5.0, hold: [1.6, -0.1], w: 1 },
    { t: 419.2, cells: 3.6, hold: [0.15, 0.2], w: 1 },
    { t: LAST, cells: 4.2, hold: [-0.3, -0.25], w: 1 },
    { t: slot.end, ...close },
  ]
}

export const fast = part<FastState>(
  {
    name: 'fast',
    draw: (p, s, c) => drawEngine(p, c, s.begin + c.t),
  },
  build,
  shots,
)

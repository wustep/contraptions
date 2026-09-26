import type { Pt } from '../../../../../parts'
import { box, part, type PartShot } from '../kit'
import { CYMBALS, ONSETS } from '../music'
import type { KitStroke } from '../stub'
import { crashAskew, FIX, H_BACK, H_WALK, KNOCK, LET_GO } from './conductor'
import { FLOOR_SEAT, HAT_SEAT, Path, RACK_SEAT, SNARE_SEAT, onCrash, onRide, since } from './path'
import { CLOSE } from './stage'

/**
 * Carnegie Hall, the hush (323.27 → 369.98): the solo drops to soft cymbals, with bursts. The director's.
 *
 * The film's moment: Andrew knocks a cymbal loose, and Fletcher, who a minute ago was trying to destroy him, steps
 * to the kit and sets it straight, and looks at him. Here:
 *
 * - He comes down out of the solo onto the snare, soft, and on a loud stroke leaps up onto the crash (327.84): it
 *   tips on its stand under him and hangs there askew, and he slides off its rim onto the hi-hat.
 * - The hush's pulse on the hi-hat, a small bounce a stroke. Fletcher comes down off the podium, crosses, rises on
 *   his column, and sets the crash straight with one hand (on the stroke at 337.63); a look, close; he goes back.
 * - The bursts: round the toms, and up onto the crash again (348.86): it holds.
 * - The ride's soft pulse, the camera back to the whole stage: his father in the wings, Fletcher on his podium, the
 *   small yellow ball in its pool. Down the kit onto the snare for the build.
 *
 * The frame is Carnegie's (`stage.ts`). Fletcher and the crash's tilt keep the conductor's clock (`conductor.ts`).
 */

/** The measured onset nearest `t` (within 40 ms): every landing here is one. */
function on(t: number): number {
  let best = t
  let d = 0.04
  for (const o of ONSETS) {
    const e = Math.abs(o.t - t)
    if (e < d) {
      d = e
      best = o.t
    }
  }
  return best
}

/** The cymbal strokes between `a` and `b`, at least `min` strong, none closer than `gap` to the one before. */
function pulse(a: number, b: number, min: number, gap: number): number[] {
  const out: number[] = []
  for (const o of CYMBALS) {
    if (o.t < a || o.t > b || o.s < min) continue
    if (out.length && o.t - out[out.length - 1] < gap) continue
    out.push(o.t)
  }
  return out
}

/* ------------------------------------------------------------------ the score */

type Piece = KitStroke['piece']
interface Land {
  t: number
  piece: Piece
  /** How high the bounce into it is, cells (a leap between drums is a real throw instead). */
  lift?: number
}

/** Soft on the snare, and the leap's take-off. */
const SETTLE: Land[] = [323.79, 324.313, 324.99, 325.75, 326.136, 326.519].map((t, i) => ({ t: on(t), piece: 'snare' as const, lift: i === 4 ? 0.34 : 0.12 }))
/** Off the tipping crash onto the hi-hat. */
const OFF_CRASH = on(328.603)
/** The hush's pulse on the hi-hat, while Fletcher sets the crash straight. */
const HAT_PULSE = pulse(OFF_CRASH + 0.2, 343.87, 0.8, 0.25)
/** The bursts, round the kit: which drum each loud stroke is on, by where its sound is. */
const BURSTS: Land[] = [
  { t: on(344.284), piece: 'rack' },
  { t: on(345.119), piece: 'snare' },
  { t: on(345.94), piece: 'snare', lift: 0.2 },
  { t: on(346.439), piece: 'floor' },
  { t: on(347.26), piece: 'floor', lift: 0.14 },
  { t: on(347.52), piece: 'rack' },
  { t: on(347.928), piece: 'snare' },
  { t: on(348.253), piece: 'rack' },
  { t: on(348.858), piece: 'crash' },
  { t: on(349.663), piece: 'snare' },
  { t: on(350.612), piece: 'snare', lift: 0.08 },
  { t: on(350.88), piece: 'snare', lift: 0.06 },
  { t: on(351.422), piece: 'snare', lift: 0.18 },
  { t: on(351.826), piece: 'hat' },
  { t: on(353.217), piece: 'snare' },
  { t: on(353.768), piece: 'rack' },
  { t: on(354.033), piece: 'snare' },
  { t: on(355.267), piece: 'floor' },
  { t: on(355.584), piece: 'snare' },
  { t: on(355.8), piece: 'snare', lift: 0.05 },
  { t: on(355.937), piece: 'snare', lift: 0.05 },
  { t: on(356.06), piece: 'snare', lift: 0.05 },
]
/** Across to the ride, and its soft pulse while the camera finds his father. */
const TO_RIDE = on(357.354)
const RIDE_PULSE = pulse(TO_RIDE + 0.2, 368.9, 0.9, 0.26)
/** Down the kit for the build: the rack tom, then the snare on the build's first stroke (the build's own). */
const DOWN = on(369.552)

const HITS: { t: number; piece: Piece }[] = [
  ...SETTLE,
  { t: KNOCK, piece: 'crash' },
  { t: OFF_CRASH, piece: 'hat' },
  ...HAT_PULSE.map((t) => ({ t, piece: 'hat' as const })),
  ...BURSTS,
  { t: TO_RIDE, piece: 'ride' },
  ...RIDE_PULSE.map((t) => ({ t, piece: 'ride' as const })),
  { t: DOWN, piece: 'rack' },
]

/** Every stroke on the hall's kit. The build's first stroke (369.975) is the build's. */
export const HUSH_KIT: KitStroke[] = HITS.map(({ t, piece }) => ({ t, piece })).sort((a, b) => a.t - b.t)
export const HUSH_HITS: number[] = HUSH_KIT.map((s) => s.t)

const crashTimes = HUSH_KIT.filter((s) => s.piece === 'crash').map((s) => s.t)
const rideTimes = HUSH_KIT.filter((s) => s.piece === 'ride').map((s) => s.t)
const crashAt = (dx: number) => (T: number): Pt => onCrash(dx, since(crashTimes, T), crashAskew(T))
const rideAt = (dx: number) => (T: number): Pt => onRide(dx, since(rideTimes, T))

/* ------------------------------------------------------------------ the lane */

const seat = (piece: Piece, T: number): Pt =>
  piece === 'snare' ? SNARE_SEAT : piece === 'hat' ? HAT_SEAT : piece === 'rack' ? RACK_SEAT : piece === 'floor' ? FLOOR_SEAT : piece === 'crash' ? crashAt(0.3)(T) : rideAt(0.42)(T)

function lane(begin: number, end: number): Path {
  const path = new Path(begin, SNARE_SEAT)
  // A bounce in place is a small lift; a move to another drum a real throw, high enough to clear what is between.
  const bounce = (l: Land, from: Piece) => {
    const T = l.t - path.t
    if (l.piece === from) path.hop(seat(l.piece, l.t), l.t, 12, 0, l.lift ?? Math.min(0.3, 0.1 + 0.3 * T))
    else path.hop(seat(l.piece, l.t), l.t, 12, 0.32, 1.1)
  }
  let at: Piece = 'snare'
  for (const l of SETTLE) {
    bounce(l, at)
    at = l.piece
  }
  // Up onto the crash: a long floating leap, over its rim and down onto its bow.
  path.hop(crashAt(0.28)(KNOCK), KNOCK, 7)
  // It tips under him: he slides down it and off its rim, and falls onto the hi-hat.
  const slideEnd = KNOCK + 0.34
  path.ride((T) => {
    const u = (T - KNOCK) / (slideEnd - KNOCK)
    return crashAt(0.28 + 0.4 * u * u)(T)
  }, slideEnd)
  path.fall(HAT_SEAT, OFF_CRASH)
  at = 'hat'
  // The pulse on the hi-hat: each stroke a small bounce, smaller still while Fletcher's hand is on the crash.
  for (const t of HAT_PULSE) {
    const quiet = t > FIX[0] - 0.3 && t < LET_GO + 0.3 ? 0.035 : 0.07
    path.hop(HAT_SEAT, t, 12, 0, quiet)
  }
  // The bursts round the kit; the crash again (it holds now); the snare's little roll.
  for (const l of BURSTS) {
    if (l.piece === 'crash') {
      path.hop(crashAt(0.3)(l.t), l.t, 12, 0.5, 1.2)
      path.ride(crashAt(0.3), l.t + 0.35)
    } else bounce(l, at)
    at = l.piece
  }
  // Across the kit to the ride, floating over the rack tom, and its soft pulse, riding its sway.
  path.hop(rideAt(0.42)(TO_RIDE), TO_RIDE, 12, 0.9, 1.4)
  for (const t of RIDE_PULSE) {
    path.ride(rideAt(0.42), t - 0.16)
    path.hop(rideAt(0.42)(t), t, 12, 0, 0.06)
  }
  // Down: off the ride onto the rack tom, and onto the snare for the build.
  path.ride(rideAt(0.42), Math.max(path.t + 0.05, DOWN - 0.55))
  path.hop(RACK_SEAT, DOWN, 12, 0.3, 0.6)
  path.hop(SNARE_SEAT, end, 12, 0.2, 0.4)
  return path
}

/* ------------------------------------------------------------------ the camera */

function shots(slot: { begin: number; end: number }): PartShot[] {
  const k = (t: number, cells: number, hold: Pt): PartShot => ({ t, cells, hold, w: 1 })
  return [
    { t: slot.begin, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
    // Up to take in the crash over the snare before he goes for it; with him onto it and off it.
    k(325.6, 5.0, [-0.55, -0.95]),
    k(KNOCK, 5.4, [-0.05, -1.25]),
    k(330.2, 5.0, [0.35, -1.05]),
    // Back to see Fletcher come down off his podium and across; in on the hand on the crash, and the two of them.
    k(H_WALK[0] + 1.6, 8.4, [2.3, -1.2]),
    k(H_WALK[1] + 0.4, 5.8, [1.2, -1.45]),
    k(FIX[0] + 0.5, 4.5, [0.85, -1.6]),
    k(LET_GO + 0.9, 4.1, [1.05, -1.35]),
    // He goes back; the bursts round the kit.
    k(H_BACK[0] + 1.2, 6.2, [0.9, -1.05]),
    k(345.0, 5.6, [-1.2, -0.85]),
    k(348.6, 5.8, [-0.8, -1.2]),
    k(351.8, 5.2, [-0.6, -0.9]),
    k(355.6, 5.2, [-1.4, -0.8]),
    // To the ride; then the whole stage: his father at the stage door, Fletcher on his podium, the ball in its pool.
    k(TO_RIDE + 0.4, 5.6, [-2.4, -1.05]),
    k(361.2, 9.6, [-1.8, -0.4]),
    k(365.6, 9.0, [-2.0, -0.55]),
    k(368.4, 5.8, [-1.9, -0.8]),
    { t: slot.end, cells: CLOSE.cells, hold: CLOSE.hold, w: 1 },
  ]
}

export const hush = part<{ begin: number }>(
  { name: 'hush', draw: () => {} },
  (slot) => {
    const path = lane(slot.begin, slot.end)
    // The lane in slot seconds, ending exactly on the snare.
    const segs = path.segs
    segs[segs.length - 1] = { ...segs[segs.length - 1], to: SNARE_SEAT }
    return {
      cells: box(-5, -3, 3, 3),
      exit: [0, 0] as Pt,
      lane: { segs, fire: SETTLE[0].t - slot.begin },
      state: { begin: slot.begin },
    }
  },
  shots,
)

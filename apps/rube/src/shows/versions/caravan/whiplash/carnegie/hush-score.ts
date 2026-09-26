import type { KitPiece } from '../drums'
import { CYMBALS, ONSETS } from '../music'
import type { KitStroke } from '../stub'
import { H_BACK, H_WALK, KNOCK } from './conductor'
import { TARGETS, type Arm, type Grip } from './solo-score'

/**
 * The hush's score (323.27 → 369.98), read by the hush's lane (`hush.ts`) and by the drummer's frame, which stays
 * hanging over the kit after the solo and plays the hush (`solo-rig.ts`). Kept apart from both so neither imports
 * the other.
 *
 * - Soft on the snare, alone, under the frame hanging limp (`SETTLE`); he leaps back up into its cup and lands on
 *   the loud stroke that knocks the crash askew (`KNOCK`): the frame's right stick is what knocks it.
 * - The frame plays the hush: its right arm the hi-hat's pulse, and the left the ride's while Fletcher is at the kit
 *   setting the crash straight (the right arm hangs out of his way, `H_REST`); both arms the
 *   bursts round the kit (the crash again: it holds); the left arm the ride's soft pulse while the camera finds his
 *   father.
 * - He leaves the cup on the ride's last stroke, down onto the rack tom and the snare for the build; the frame goes
 *   limp and flies out as the build's engine rises.
 */

/** The measured onset nearest `t` (within 40 ms): every landing here is one. */
export function on(t: number): number {
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

type Piece = KitStroke['piece']
export interface Land {
  t: number
  piece: Piece
  /** How high the bounce into it is, cells. */
  lift?: number
}

/**
 * Soft on the snare, alone, under the frame hanging limp; the last (327.35, a firm stroke half a second before the
 * knock) is the leap's take-off, up into the frame's cup, a flight as long as the solo's first leap.
 */
export const SETTLE: Land[] = [323.79, 324.313, 324.99, 325.75, 326.136, 326.519, 327.35].map((t, i) => ({
  t: on(t),
  piece: 'snare' as const,
  lift: i === 4 ? 0.2 : i === 6 ? 0.3 : 0.12,
}))
/** The right arm off the crash onto the hi-hat. */
const OFF_CRASH = on(328.603)
/** The hush's pulse, on the hi-hat, while Fletcher comes across and sets the crash straight. */
const HAT_PULSE = pulse(OFF_CRASH + 0.2, 343.87, 0.8, 0.25)
/**
 * While Fletcher is at the kit, the frame's right arm hangs out of his way (it would reach across his body to the
 * hi-hat) and the pulse goes over to the ride, on the left arm: the drummer making room for him.
 */
export const H_REST: [number, number] = [H_WALK[1] - 1.2, H_BACK[0] + 0.4]
const restPiece = (t: number): 'hat' | 'ride' => (t > H_REST[0] - 0.15 && t < H_REST[1] + 0.15 ? 'ride' : 'hat')
/** The bursts, round the kit: which drum each loud stroke is on, by where its sound is. */
const BURSTS: Land[] = [
  { t: on(344.284), piece: 'rack' },
  { t: on(345.119), piece: 'snare' },
  { t: on(345.94), piece: 'snare' },
  { t: on(346.439), piece: 'floor' },
  { t: on(347.26), piece: 'floor' },
  { t: on(347.52), piece: 'rack' },
  { t: on(347.928), piece: 'snare' },
  { t: on(348.253), piece: 'rack' },
  { t: on(348.858), piece: 'crash' },
  { t: on(349.663), piece: 'snare' },
  { t: on(350.612), piece: 'snare' },
  { t: on(350.88), piece: 'snare' },
  { t: on(351.422), piece: 'snare' },
  { t: on(351.826), piece: 'hat' },
  { t: on(353.217), piece: 'snare' },
  { t: on(353.768), piece: 'rack' },
  { t: on(354.033), piece: 'snare' },
  { t: on(355.267), piece: 'floor' },
  { t: on(355.584), piece: 'snare' },
  { t: on(355.8), piece: 'snare' },
  { t: on(355.937), piece: 'snare' },
  { t: on(356.06), piece: 'snare' },
]
/** Across to the ride, and its soft pulse while the camera finds his father. */
const TO_RIDE = on(357.354)
const RIDE_PULSE = pulse(TO_RIDE + 0.2, 368.9, 0.9, 0.26)
/** Down the kit for the build: off the cup onto the rack tom, then the snare on the build's first stroke (the build's). */
export const DOWN = on(369.552)

/** The frame's second session: he leaps from the snare into its cup, lands on the knock, and leaves on the ride's last stroke. */
export const H_LEAP = SETTLE[SETTLE.length - 1].t
export const H_SEATED = KNOCK
export const H_UNSEAT = RIDE_PULSE[RIDE_PULSE.length - 1]
/** The frame flies out, up into the flies, as the build's engine rises. */
export const H_FLY: [number, number] = [370.2, 373.2]

/** What the frame plays, in order: the knock, the hat's pulse, the bursts, the ride's pulse. */
const FRAME_PLAYS: Land[] = [
  { t: KNOCK, piece: 'crash' },
  { t: OFF_CRASH, piece: 'hat' },
  ...HAT_PULSE.map((t) => ({ t, piece: restPiece(t) })),
  ...BURSTS,
  { t: TO_RIDE, piece: 'ride' },
  ...RIDE_PULSE.map((t) => ({ t, piece: 'ride' as const })),
]

export interface HushStroke {
  t: number
  piece: KitPiece
  limb: Arm
  s: number
}

/** Seconds an arm needs between two strokes: a wrist's rebound, plus the time to carry the stick across. */
function needs(a: Grip | undefined, b: Grip): number {
  if (!a) return 0
  const d = Math.hypot(a.grip[0] - b.grip[0], a.grip[1] - b.grip[1])
  return d < 0.01 ? 0.062 : 0.11 + 0.1 * d
}

/**
 * Who plays each of the frame's strokes: the crash and the hi-hat the house's right arm, the ride and the toms the
 * left; the snare whichever arm is free (the right first). How loud each is, for the size of its stroke.
 */
export const H_STROKES: readonly HushStroke[] = (() => {
  const out: HushStroke[] = []
  const last: Record<Arm, { t: number; g?: Grip }> = { left: { t: -Infinity }, right: { t: -Infinity } }
  const can = (arm: Arm, piece: KitPiece, t: number) => t - last[arm].t >= needs(last[arm].g, TARGETS[arm][piece]!)
  const strength = (t: number, piece: KitPiece): number => {
    if (t === KNOCK) return 1.6
    if (piece === 'hat' || piece === 'ride') return 0.55
    let s = 0.9
    for (const o of ONSETS) if (Math.abs(o.t - t) < 0.02) s = Math.max(s, Math.min(1.6, o.s))
    return s
  }
  for (const l of FRAME_PLAYS) {
    const piece = l.piece as KitPiece
    let arm: Arm
    if (piece === 'crash' || piece === 'hat') arm = 'right'
    else if (piece === 'ride' || piece === 'rack' || piece === 'floor') arm = 'left'
    else arm = can('right', 'snare', l.t) ? 'right' : 'left'
    out.push({ t: l.t, piece, limb: arm, s: strength(l.t, piece) })
    last[arm] = { t: l.t, g: TARGETS[arm][piece] }
  }
  return out
})()

/** The accents his head bounces on in the cup: every stroke, the bursts and the knock bigger than the pulses. */
export const H_ACCENTS: readonly { t: number; a: number }[] = H_STROKES.map((s) => ({ t: s.t, a: Math.min(1, Math.max(0.15, (s.s - 0.5) / 1.1)) }))

/** Every stroke on the hall's kit: his own on the snare and the rack tom, and the frame's. */
const HITS: { t: number; piece: Piece }[] = [...SETTLE, ...FRAME_PLAYS, { t: DOWN, piece: 'rack' }]
export const HUSH_KIT: KitStroke[] = HITS.map(({ t, piece }) => ({ t, piece })).sort((a, b) => a.t - b.t)
export const HUSH_HITS: number[] = HUSH_KIT.map((s) => s.t)

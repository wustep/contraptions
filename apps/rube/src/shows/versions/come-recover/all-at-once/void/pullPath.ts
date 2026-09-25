import { clamp } from '../../../../../../../../src/core/ease'
import { R, type Pt } from '../../../../../parts'
import { fight, JUMPS } from '../music'
import { G_LOW } from '../physics'
import { SEAMS } from '../seams'

/**
 * Evelyn's way through the pull (`pull.ts`), in the bagel's own frame (its centre at 0, 0), and the pull's clock. A
 * helper of its own so the bagel (`bagel.ts`) can read where she is, to send each thing it swallows over the lip
 * beside her, without the two files importing each other.
 *
 * She drifts in from the surf, slowing; turns toward Joy when the light finds her; stalls as the pull takes hold;
 * goes round the hole counterclockwise, pulled a step closer on every bar and quicker as she closes, a quarter turn a
 * beat at the end; is braked by the lip to the top of the hole on beat 56, rocks, and settles; and tips in.
 */

/** The entry cell of the pull's leg in the dark's own cells. The bagel's centre is at 0, 0 of the dark. */
export const PULL_AT: Pt = [-8, -6]
/** The bagel's centre in the dark's cells, and its hole's radius at scale 1 (`BAGEL` in `bagel.ts` is these). */
export const CENTRE: Pt = [0, 0]
export const HOLE = 2.0

/** A light finds Joy on the crown; the whole bagel is lit; the pull takes hold (the first thing goes in). */
export const JOY_LIGHT = 133.793
export const REVEAL = 135.639
export const FIRST_IN = 138.321
/** The pull's last beat: Evelyn at the brink (the fight's beat 56), and the tip in, on beat 59 (the jump). */
export const BRINK = fight(56)
export const TIP_IN = fight(59)

const T0 = JUMPS.void
const T1 = JUMPS.mosaic

/** Where she comes in, in the bagel's frame: the ball at (-0.5, 0) of the entry cell. */
const E: Pt = [PULL_AT[0] - 0.5 - CENTRE[0], PULL_AT[1] - CENTRE[1]]
/** The drift: the surf's velocity at the jump, dying away in the dark. */
const V0 = SEAMS.void.v
const TAU_DRIFT = 4.5
const drift = (t: number): Pt => {
  const s = Math.max(0, t - T0)
  const f = TAU_DRIFT * (1 - Math.exp(-s / TAU_DRIFT))
  return [E[0] + V0[0] * f, E[1] + V0[1] * f]
}

/** The pull takes her: from the drift into the orbit over these seconds. */
const TAKE0 = 137.3
const TAKE1 = 141.6
/** On the brink: at the top of the hole, her foot on its lip. */
export const R_BRINK = HOLE + R
/** A beat of the fight's pulse. */
export const BEAT = fight(1) - fight(0)
/** Where the fast orbit ends and the lip brakes her, to the top on beat 56. */
export const BRAKE = BRINK - 3 * BEAT
/** Her speed round at the end: a quarter turn a beat. */
const W_END = Math.PI / 2 / BEAT
/**
 * What she still has as she comes to the top on beat 56 (radians a second): she goes a little past it, rocks back
 * and settles there, heavy, on the brink.
 */
const W_LIP = 0.5
const ROCK = (2 * Math.PI) / 0.62
const ROCK_DECAY = 0.17
/** How far past the top she is, `s` seconds after beat 56 (the angle's way: counterclockwise is negative). */
const rock = (s: number): number => (s <= 0 ? 0 : -(W_LIP / ROCK) * Math.exp(-s / ROCK_DECAY) * Math.sin(ROCK * s))

const beatOf = (t: number): number => (t - fight(0)) / BEAT
const ss = (x: number, a: number, b: number): number => {
  const u = clamp((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}

const TAKE_AT = drift(TAKE0)
const R_TAKE = Math.hypot(TAKE_AT[0], TAKE_AT[1])
const PHI_TAKE = Math.atan2(TAKE_AT[1], TAKE_AT[0])

/** How close she is to the middle: pulled in a step on every bar of the pulse, on its downbeat. */
function radius(t: number): number {
  let g = 1 - 0.05 * ss(t, TAKE0, fight(0))
  const b = beatOf(t)
  for (let j = 0; j < 14; j++) g -= (0.95 / 14) * ss(b, 4 * j, 4 * j + 2.2)
  return R_BRINK + (R_TAKE - R_BRINK) * Math.max(0, g)
}

/**
 * Her speed round (radians a second, the pull's way): nothing as she is taken, quickening to a quarter turn a beat
 * by beat 53, then braked by the lip. The curve's power is solved so she comes to the top exactly on beat 56.
 */
const OMEGA = (() => {
  // Laps: from where she is taken, counterclockwise (the angle going down) to the top, and five times round.
  const target = PHI_TAKE - (-Math.PI / 2 - 5 * 2 * Math.PI)
  const brake = ((W_END - W_LIP) * (BRINK - BRAKE)) / 3 + W_LIP * (BRINK - BRAKE)
  const main = target - brake
  const q = (W_END * (BRAKE - TAKE0)) / main - 1
  return (t: number): number => {
    if (t <= TAKE0) return 0
    if (t <= BRAKE) return W_END * Math.pow((t - TAKE0) / (BRAKE - TAKE0), q)
    if (t <= BRINK) return W_LIP + (W_END - W_LIP) * (1 - (t - BRAKE) / (BRINK - BRAKE)) ** 2
    return 0
  }
})()
const ANGLE_STEP = 0.005
const SWEPT: Float64Array = (() => {
  const n = Math.ceil((BRINK - TAKE0) / ANGLE_STEP) + 2
  const out = new Float64Array(n)
  for (let i = 1; i < n; i++) {
    const a = TAKE0 + (i - 1) * ANGLE_STEP
    // Simpson on each step: the swept angle exact enough to land on the top.
    out[i] = out[i - 1] + (ANGLE_STEP / 6) * (OMEGA(a) + 4 * OMEGA(a + ANGLE_STEP / 2) + OMEGA(a + ANGLE_STEP))
  }
  return out
})()
const swept = (t: number): number => {
  const i = clamp((t - TAKE0) / ANGLE_STEP, 0, SWEPT.length - 1.001)
  const j = Math.floor(i)
  return SWEPT[j] + (SWEPT[j + 1] - SWEPT[j]) * (i - j)
}
/** Whatever the sum says, she ends at the top exactly: the small miss is spread over the whole orbit. */
const MISS = PHI_TAKE - swept(BRINK) - (-Math.PI / 2 - 10 * Math.PI)
const orbitAngle = (t: number): number => PHI_TAKE - swept(t) + MISS * ss(t, TAKE0, BRINK)

const orbit = (t: number): Pt => {
  const r = radius(t)
  const a = orbitAngle(t)
  return [r * Math.cos(a), r * Math.sin(a)]
}

/** Tipped in: from rest on the brink she falls straight down, under the dark's low pull, to the seam's speed. */
const TIP = T1 - SEAMS.mosaic.v[1] / G_LOW

/**
 * When the light finds Joy, Evelyn turns in the dark and drifts toward her daughter, a little way, before the pull
 * takes her round the other way. (Joy sits on the crown, `JOY_SEAT` as the light finds her.)
 */
const JOY_SEAT: Pt = [0, -6.42]
const REACH = 0.7
const TOWARD = (() => {
  const from = drift(JOY_LIGHT)
  const d = Math.hypot(JOY_SEAT[0] - from[0], JOY_SEAT[1] - from[1])
  return [(JOY_SEAT[0] - from[0]) / d, (JOY_SEAT[1] - from[1]) / d] as Pt
})()
const towardJoy = (t: number): Pt => {
  const f = REACH * ss(t, JOY_LIGHT + 0.15, TAKE1)
  return [TOWARD[0] * f, TOWARD[1] * f]
}

/** Evelyn at show time `t`, in the bagel's frame. */
export function evelyn(t: number): Pt {
  if (t >= BRINK) {
    const a = -Math.PI / 2 + rock(t - BRINK)
    const s = Math.max(0, t - TIP)
    return [R_BRINK * Math.cos(a), R_BRINK * Math.sin(a) + 0.5 * G_LOW * s * s]
  }
  const [dx, dy] = drift(t)
  const [rx, ry] = towardJoy(t)
  const d: Pt = [dx + rx, dy + ry]
  if (t <= TAKE0) return d
  const w = ss(t, TAKE0, TAKE1)
  const o = orbit(t)
  return [d[0] + (o[0] - d[0]) * w, d[1] + (o[1] - d[1]) * w]
}

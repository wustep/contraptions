import { CATCHES, FLOOR, POURS } from './cups'
import { fly, ring, scale, smoother, type Pt } from './kit'
import { TROUGH_LIP, TROUGH_R } from './layout'
import { BAR, bar, beatAt, held, since } from './music'

/**
 * The trough: the strings and the build. A long curved channel of felt along the bottom of the window, and in its
 * floor a felt hammer. The last cup pours the ball in as the strings come in, and it rolls from side to side as a
 * ball in a bowl does, slowly, two bars a side: through the floor on every chord change, where the hammer gives it a
 * push, a little higher each time, as full as the strings are. On the drums' first downbeat the hammer gives it its
 * hardest, and the ball goes up the right side, over the lip on the third beat, and drops into the mouth of the screw
 * on the fourth.
 *
 * The ball's angle in the trough (0 at the floor, positive to the right) is `A(t) sin(π (t − bar 20) / 2 bars)`:
 * through the floor on every even bar's downbeat, the strings' chord changes. Its amplitude A grows only at the
 * passes, where the hammer is.
 */

/** Seconds a side: two bars. */
export const HALF = 2 * BAR
/** Bar 20's downbeat, where the strings come in: the swing's clock starts there. */
const ORIGIN = bar(20)
/** Show time the ball drops into the trough: the strings' entry, a moment after bar 20's downbeat. */
export const CATCH = CATCHES[8]
export const PASSES = 14
/** The show time of each pass through the floor after the catch: the downbeats of bars 22, 24, … 48, the last the drums' first. */
export const PASS_TIMES = Array.from({ length: PASSES }, (_, i) => bar(22 + 2 * i))
export const DRUMS = PASS_TIMES[PASSES - 1]
/** Over the lip on the drums' third beat, and into the screw's mouth on their fourth. */
export const OVER = beatAt(194)
export const INTO_SCREW = beatAt(195)

const phase = (t: number): number => (Math.PI * (t - ORIGIN)) / HALF

const landing = POURS[POURS.length - 1]
/** The speed along the floor the ball lands with, from the last cup's pour: the swing it starts with. */
const A0 = landing.v[0] / (TROUGH_R * (Math.PI / HALF) * Math.cos(phase(CATCH)))
/** How far it swings before the drums (under the lip, radians); and after the drums' push, whatever takes it over the lip on their third beat. */
const BEFORE = 0.47
export const AMPLITUDE_BEFORE = BEFORE
const AFTER = TROUGH_LIP / Math.sin(phase(OVER) - PASSES * Math.PI)

/** The circle the ball rolls on: set so that it lands where the last cup pours it, a hair past the floor. */
const LANDS_AT = A0 * Math.sin(phase(CATCH))
export const TROUGH_C: Pt = [FLOOR[0] - TROUGH_R * Math.sin(LANDS_AT), FLOOR[1] - TROUGH_R * Math.cos(LANDS_AT)]

/** Where the ball's centre is at angle `a` in the trough. */
export const inTrough = (a: number): Pt => [TROUGH_C[0] + TROUGH_R * Math.sin(a), TROUGH_C[1] + TROUGH_R * Math.cos(a)]


/**
 * How much each pass adds: as full as the strings are there (the held sound, squared, so the build pushes hardest),
 * so the swing reaches BEFORE on the thirteenth; and the fourteenth, the drums, whatever takes it to AFTER.
 */
export const PUSHES: number[] = (() => {
  const w = PASS_TIMES.slice(0, PASSES - 1).map((t) => held(t) ** 2 + 0.05)
  const total = w.reduce((a, b) => a + b, 0)
  const out = w.map((x) => ((BEFORE - A0) * x) / total)
  out.push(AFTER - BEFORE)
  return out
})()

/** Seconds a push takes to give: the hammer's stroke, round the pass. */
const STROKE = 0.3

/** How far the ball swings at `t` (in [CATCH, the exit]). */
export function amplitude(t: number): number {
  let a = A0
  for (let k = 0; k < PASSES; k++) a += PUSHES[k] * smoother(t, PASS_TIMES[k] - STROKE / 2, PASS_TIMES[k] + STROKE / 2)
  return a
}

/** Where the ball is in the trough: its angle. */
export const angle = (t: number): number => amplitude(t) * Math.sin(phase(t))

/** Over the lip: where, and how fast (along the trough, up and to the right). */
export const LIP_AT: Pt = inTrough(TROUGH_LIP)
export const LIP_V: Pt = (() => {
  const w = AFTER * (Math.PI / HALF) * Math.cos(phase(OVER))
  return scale([Math.cos(TROUGH_LIP), -Math.sin(TROUGH_LIP)], w * TROUGH_R)
})()
/** Where it lands in the screw's mouth, a bar after the drums: the flight from the lip decides it. */
export const MOUTH: Pt = fly(LIP_AT, LIP_V, INTO_SCREW - OVER)

/** The ball from the catch to the screw's mouth. */
export function ballInTrough(t: number): { p: Pt; flying: boolean; rolling: number } {
  if (t < OVER) {
    const a = angle(t)
    // Rolling: the ball's speed along the felt, for its spin.
    const da = (angle(t + 0.005) - angle(t - 0.005)) / 0.01
    return { p: inTrough(a), flying: false, rolling: da * TROUGH_R }
  }
  return { p: fly(LIP_AT, LIP_V, t - OVER), flying: true, rolling: 0 }
}

/** The felt hammer in the trough's floor: how far up it is (0 down, 1 at the top of its stroke) at `t`. */
export function hammer(t: number): { lift: number; lean: number } {
  let lift = 0
  let lean = 0
  for (let k = 0; k < PASSES; k++) {
    const s = since(t, PASS_TIMES[k] - STROKE / 2)
    if (s < -0.2 || s > 2) continue
    const strength = Math.min(1, PUSHES[k] / 0.06)
    // Up as the ball comes, and down behind it; the drums' push the hardest.
    const up = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, s / STROKE)))) * strength
    lift = Math.max(lift, up)
    // It leans the way the ball is going: right on even passes, left on odd (the first is left: it lands going right).
    const way = (k + 1) % 2 === 0 ? 1 : -1
    lean += way * up + 0.25 * way * ring(s - STROKE, 0.5, 0.35) * strength
  }
  return { lift, lean }
}

/** The ball's squash as it drops into the trough on the strings, and into the screw's mouth. */
export function troughSquash(t: number): number {
  let q = 0
  for (const [at, w] of [[CATCH, 1.2], [INTO_SCREW, 0.9]] as const) {
    const s = since(t, at)
    if (s < 0 || s > 0.6) continue
    q += 0.12 * w * (1 - Math.exp(-s / 0.012)) * Math.exp(-s / 0.08) * Math.cos((2 * Math.PI * s) / 0.32)
  }
  return q
}

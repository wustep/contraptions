import type { Pt } from '../../../../../parts'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { CRASH } from '../drums'
import { POSES, RIG, beatPose, reachFromHead, type ArmPose, type HandShape, type Pose } from '../fletcher'
import { BREAK, FINAL, LAST_CHORD, SOLO } from '../music'
import { STOMPS, UNWIND } from './fast-clock'
import { FLETCHER_HOME, FLOOR, JIM_WINGS, KIT_AT, PODIUM } from './stage'

/**
 * Fletcher, Jim and the crash cymbal from the solo's first stroke (270.52) to the end, in the Carnegie frame
 * (`stage.ts`). The director's: the score hands the stage their company spans from here, the hall draws Fletcher's
 * rig from `fletcherAt`, `floorAt` and `poseAt` and the crash from `crashAskew`, and the hush and the finale time
 * Andrew to the same clock. Before the solo the sabotage part has them both; at the hand-off Fletcher is at
 * `FLETCHER_HOME` in `POSES.rest` and Jim at `JIM_WINGS`, at rest.
 *
 * What the film has, and where it is here:
 *
 * - **The solo.** Fletcher on his podium, watching. Jim in the wings by the stage door, watching.
 * - **The hush: the cymbal.** Andrew lands on the crash on a loud stroke (`KNOCK`) and knocks it askew on its stand;
 *   it hangs there, tipped. Fletcher comes down off the podium, crosses to the kit, rises on his column to reach
 *   it, and sets it straight with one hand (`FIX`); a look at Andrew, close; back to the podium.
 * - **The build: he conducts him.** Through the loudest, fastest playing his right hand comes up and starts to beat
 *   time with Andrew's stomps, small at first, then the whole arm, until the sticks let go (`CONDUCT`).
 * - **The finale: the nod.** In the long roll he comes back to the kit and rises until his head is level with
 *   Andrew's (in the drummer's frame), and nods, once, slowly (`NOD`); Andrew nods back. Back to the podium.
 * - **The end.** In the silence before the last chord his hands come up, open (the band ready); the chord, a
 *   downbeat and both hands held high; and on the cut-off his right hand closes: **the fist** (`FINAL`), the only
 *   one in the show. He holds it, and lowers it in the dark.
 */

/* ------------------------------------------------------------------ the clock */

/** The hush: Andrew lands on the crash and knocks it askew. */
export const KNOCK = 327.84
/** Fletcher steps down off the podium, crosses, and is at the kit, rising. */
export const H_WALK: [number, number] = [331.0, 335.2]
/** His hand on the crash's rim, straightening it (on the stroke at 337.63), and letting go. */
export const GRIP: [number, number] = [336.2, 337.35]
export const FIX: [number, number] = [337.63, 339.2]
export const LET_GO = 339.55
/** The look at Andrew, close, then down and back to the podium. */
export const H_BACK: [number, number] = [341.2, 345.2]

/** The build: from here he conducts Andrew's stomps, a beat every fourth, until the engine's sticks let go. */
export const CONDUCT: [number, number] = [388.2, UNWIND]
const BEATS: number[] = STOMPS.filter((t) => t > CONDUCT[0] - 1 && t < CONDUCT[1] + 1.5).filter((_, i) => i % 4 === 0)

/** The finale: to the kit in the long roll, up to Andrew's height, the nod, and back. */
export const F_WALK: [number, number] = [519.4, 522.8]
export const NOD: [number, number] = [527.5, 529.9]
/** Andrew's nod back, in the drummer's frame. */
export const NOD_BACK: [number, number] = [529.25, 530.75]
/**
 * After the nod he does not go back to his podium: he gives Andrew room for the last fill (a small step back, a
 * little lower), and stays by the kit, eye to eye, to the end: the film keeps him there. In the silence he rises to
 * Andrew's height again, his hands up for the band's chord, and cuts it off there.
 */
export const F_BACK: [number, number] = [530.9, 533.4]
/** How far he steps back and sinks for the last fill, and when he comes up again (the silence). */
const BACK_X = 0
const BACK_SINK = 0.4
const UP_AGAIN: [number, number] = [BREAK + 0.2, LAST_CHORD - 0.3]

/** Where he stands to set the crash straight, and to nod: right of the hi-hat. How far his column rises for each. */
const FIX_X = 1.95
const FIX_RISE = 1.1
const NOD_X = 1.62
const NOD_RISE = 1.62
/** His head is this far above whatever his column stands on. */
const TALL = FLOOR - PODIUM.h - FLETCHER_HOME[1]
/** The podium's front edge, where he steps up and down. */
const EDGE = PODIUM.x - PODIUM.w / 2

const ease = (T: number, a: number, b: number): number => easeInOutSine(clamp((T - a) / (b - a)))

/** A trip from the podium to `x` and back, as a share 0..1 of the way (0 home): out over `go`, back over `back`. */
function away(T: number, go: [number, number], back: [number, number]): number {
  return ease(T, go[0], go[1]) * (1 - ease(T, back[0], back[1]))
}

/** Where his head is across the stage at `T`. */
function xAt(T: number): number {
  const home = FLETCHER_HOME[0]
  if (T < 400) return home + (FIX_X - home) * away(T, H_WALK, H_BACK)
  return home + (NOD_X - home) * ease(T, F_WALK[0], F_WALK[1]) + BACK_X * away(T, F_BACK, UP_AGAIN)
}

/** How far his column has risen above his height: to reach the crash, and to meet Andrew's eyes. */
function riseAt(T: number): number {
  if (T < 400) return FIX_RISE * ease(T, H_WALK[1] - 0.9, GRIP[0] + 0.2) * (1 - ease(T, H_BACK[0] - 0.9, H_BACK[0] + 0.4))
  return NOD_RISE * ease(T, F_WALK[1] - 1.2, F_WALK[1] + 0.6) - BACK_SINK * away(T, F_BACK, UP_AGAIN)
}

/** Where his column stands at `T`: the podium's top, or the stage floor once he has stepped off its front edge. */
export function floorAt(T: number): number {
  const x = xAt(T)
  // The step down (and up) as his column passes the podium's front edge: smooth, a step's worth.
  const off = clamp((EDGE + 0.2 - x) / 0.45)
  const s = off * off * (3 - 2 * off)
  return FLOOR - PODIUM.h * (1 - s)
}

/**
 * How far his head leans off his column toward Andrew (negative: toward the kit, on the house's left), the column's
 * foot planted: a look close after he sets the crash straight, and the nod.
 */
function leanAt(t: number): number {
  if (t < 400) return -0.12 * ease(t, LET_GO, LET_GO + 0.6) * (1 - ease(t, H_BACK[0] - 0.4, H_BACK[0] + 0.3))
  // Turned in to him before the nod, the nod itself rolling his head a little further in, and back once Andrew answers.
  return -0.2 * ease(t, NOD[0] - 0.9, NOD[0] + 0.1) * (1 - ease(t, NOD_BACK[1] - 0.2, NOD_BACK[1] + 0.8)) - 0.05 * nodAt(t)
}

/** The nod: one slow, deep dip of his head, held, and up again (0..1). */
function nodAt(t: number): number {
  return ease(t, NOD[0], NOD[0] + 0.75) - ease(t, NOD[0] + 1.55, NOD[1])
}

/** Where his column's foot is across the stage at `t` (his head is off it when he leans). */
export const baseAt = (t: number): number => xAt(t)

/** Where Fletcher's head (his ball) is at `t` (show seconds), in the Carnegie frame. */
export function fletcherAt(t: number): Pt {
  const x = xAt(t)
  const nod = 0.16 * nodAt(t)
  // A small breath the rest of the time.
  const breath = 0.012 * Math.sin((t - SOLO) * 1.3)
  return [x + leanAt(t), floorAt(t) - TALL - riseAt(t) + nod + breath]
}

/* ------------------------------------------------------------------ the crash */

/** How far the crash has tipped: a slip on its stand when he lands on it, a slow rock, and Fletcher's hand setting it straight. */
export function crashAskew(T: number): number {
  if (T < KNOCK) return 0
  const A = 0.52
  const s = T - KNOCK
  // The slip: quick at first, settling without a bounce; then it rocks a little on the loosened tilter.
  const slip = A * (1 - (1 + s / 0.09) * Math.exp(-s / 0.09)) + 0.05 * Math.exp(-s / 1.6) * Math.sin(2 * Math.PI * 0.85 * s) * clamp(s / 0.3)
  if (T < FIX[0]) return slip
  const u = ease(T, FIX[0], FIX[1])
  const set = slip * (1 - u)
  // Straight, and the last small rock as his hand leaves it.
  const after = T > FIX[1] ? 0.018 * Math.exp(-(T - FIX[1]) / 0.45) * Math.sin(2 * Math.PI * 1.5 * (T - FIX[1])) : 0
  return set + after
}

/** The crash's right rim, in the Carnegie frame, at an angle `a` off its level (its tilt plus how askew it is). */
export function crashRim(askew: number): Pt {
  const a = CRASH.tilt + askew
  return [KIT_AT[0] + CRASH.x + (CRASH.w / 2) * Math.cos(a), KIT_AT[1] + CRASH.y + (CRASH.w / 2) * Math.sin(a)]
}

/* ------------------------------------------------------------------ his hands */

/** An arm reaching its wrist to `target` from `shoulder`, the elbow below the line, the hand along `dir`. */
function reach(shoulder: Pt, target: Pt, dir: number, hand: HandShape): ArmPose {
  const U = RIG.upper
  const F = RIG.fore
  const dx = target[0] - shoulder[0]
  const dy = target[1] - shoulder[1]
  const d = clamp(Math.hypot(dx, dy), Math.abs(U - F) + 0.02, U + F - 0.002)
  const base = Math.atan2(dy, dx)
  const a = Math.acos(clamp((U * U + d * d - F * F) / (2 * U * d), -1, 1))
  // The elbow on the underside of the reach (for an arm reaching left, the upper arm turned anticlockwise on screen).
  const up = base - a
  const e: Pt = [shoulder[0] + Math.cos(up) * U, shoulder[1] + Math.sin(up) * U]
  const fa = Math.atan2(target[1] - e[1], target[0] - e[0])
  return { up, bend: fa - up, wrist: dir - fa, hand }
}

/** Between two arm poses, `u` 0..1, the upper arm turning the short way round (hanging to raised goes out to the side, not across the chest). */
function mixArm(a: ArmPose, b: ArmPose, u: number): ArmPose {
  let d = b.up - a.up
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return { up: a.up + d * u, bend: a.bend + (b.bend - a.bend) * u, wrist: a.wrist + (b.wrist - a.wrist) * u, hand: u < 0.5 ? a.hand : b.hand }
}
/** Between two poses, each arm the short way round. */
const turnPose = (a: Pose, b: Pose, u: number): Pose => ({ left: mixArm(a.left, b.left, u), right: mixArm(a.right, b.right, u) })

/** His right hand on the crash's rim while he straightens it. */
function fixing(T: number): ArmPose {
  const head = fletcherAt(T)
  const shoulder: Pt = [head[0] - RIG.shoulder, head[1] + RIG.drop]
  const askew = crashAskew(T)
  const rim = crashRim(askew)
  const a = CRASH.tilt + askew
  // The palm laid on the rim from the right, pointing in along the cymbal toward its bell.
  const wrist: Pt = [rim[0] + 0.24 * Math.cos(a), rim[1] + 0.24 * Math.sin(a) - 0.05]
  return reach(shoulder, wrist, Math.PI + a, 'open')
}


/** Where he is in his beat at `t`: whole numbers on the stomps he beats. */
function beatAt(t: number): number {
  let j = 0
  while (j + 1 < BEATS.length && BEATS[j + 1] <= t) j++
  const a = BEATS[j]
  const b = BEATS[Math.min(j + 1, BEATS.length - 1)]
  return j + (b > a ? clamp((t - a) / (b - a)) : 0)
}

/** What his hands do at `t`. */
export function poseAt(t: number): Pose {
  // The build: drawn in, he conducts him, bigger as it goes.
  if (t > CONDUCT[0] && t < CONDUCT[1] + 1.4) {
    const on = ease(t, CONDUCT[0], CONDUCT[0] + 1.6) * (1 - ease(t, CONDUCT[1], CONDUCT[1] + 1.3))
    const size = 0.3 + 0.6 * ease(t, CONDUCT[0], CONDUCT[0] + 16)
    return turnPose(POSES.rest, beatPose(beatAt(t), size), on)
  }
  // The hush: his right hand up to the crash's rim, straightening it, and back down.
  if (t > GRIP[0] && t < LET_GO + 0.9) {
    const on = ease(t, GRIP[0], GRIP[1]) * (1 - ease(t, LET_GO, LET_GO + 0.9))
    return { left: POSES.rest.left, right: mixArm(POSES.rest.right, fixing(t), on) }
  }
  if (t < BREAK + 0.2) return POSES.rest
  // In the silence before the last chord, both hands come up, open: the band ready.
  const ready = POSES.ready
  if (t < LAST_CHORD - 0.12) return turnPose(POSES.rest, ready, ease(t, BREAK + 0.2, LAST_CHORD - 0.3))
  // The chord: a downbeat with both hands, and up again, held high and open, rising a little as it swells.
  if (t < FINAL - 0.62) return { right: heldHigh(t), left: heldHigh(t, 'left') }
  // The cut-off, with his left hand (the house's right, out over the clear wall past the bass's scroll: his right
  // side is all the frame's arm and sticks). Open, it circles out and up (the breath before it), then comes down
  // hard and closes ON the last stroke: the fist, at his eye line. It stops dead there and holds, no settle. The
  // right hand comes down to his side during the circle and hangs still, so nothing moves on the cut but the fist.
  const shoulder: Pt = [RIG.shoulder, RIG.drop]
  const wristOf = (a: ArmPose): Pt => {
    const e: Pt = [shoulder[0] + Math.cos(a.up) * RIG.upper, shoulder[1] + Math.sin(a.up) * RIG.upper]
    return [e[0] + Math.cos(a.up + a.bend) * RIG.fore, e[1] + Math.sin(a.up + a.bend) * RIG.fore]
  }
  const from = wristOf(heldHigh(FINAL - 0.62, 'left'))
  const right: ArmPose = mixArm(heldHigh(FINAL - 0.62), POSES.rest.right, ease(t, FINAL - 0.62, FINAL - 0.1))
  let left: ArmPose
  if (t < CIRCLE) {
    // Out and up, open, the palm turning out: a small loop that bulges away from him.
    const u = ease(t, FINAL - 0.62, CIRCLE)
    const bulge = Math.sin(Math.PI * u) * 0.12
    const w: Pt = [from[0] + (APEX[0] - from[0]) * u + bulge, from[1] + (APEX[1] - from[1]) * u]
    left = reachFromHead(1, w, -1.2 - 0.35 * u, 'open')
  } else {
    // The strike: gathering speed all the way down, round the outside, and stopping on the stroke.
    const v = clamp((t - CIRCLE) / (FINAL - CIRCLE))
    const u = v * v * v
    const bow = Math.sin(Math.PI * u) * 0.14
    const w: Pt = [APEX[0] + (FIST[0] - APEX[0]) * u + bow, APEX[1] + (FIST[1] - APEX[1]) * u]
    left = reachFromHead(1, w, -1.55 + (1.55 - 0.35) * u, t >= FINAL - 0.02 ? 'fist' : 'open')
  }
  const down = ease(t, FINAL + 3.2, FINAL + 6.4)
  if (down <= 0) return { right, left }
  return { right, left: { ...mixArm(left, POSES.rest.left, down), hand: down < 0.6 ? 'fist' : 'beat' } }
}

/** The loop's top, and where the fist stops: relative to his head (his left hand, on the house's right). */
const APEX: Pt = [1.0, -0.95]
const FIST: Pt = [0.7, -0.24]
/** When the loop turns into the strike. */
const CIRCLE = FINAL - 0.17

/** The chord held: both hands high and open, a little higher as it swells, at `t`. */
function heldHigh(t: number, side: 'right' | 'left' = 'right'): ArmPose {
  const ready = POSES.ready
  const hit = Math.exp(-Math.max(0, t - LAST_CHORD) / 0.16) * clamp((t - (LAST_CHORD - 0.12)) / 0.12)
  const swell = ease(t, LAST_CHORD + 0.3, FINAL - 0.7)
  const lift = (x: ArmPose, s: number): ArmPose => ({ ...x, up: x.up + s * (0.32 * hit - 0.1 * swell), bend: x.bend - s * 0.2 * hit })
  return side === 'right' ? lift(ready.right, -1) : lift(ready.left, 1)
}

/* ------------------------------------------------------------------ Jim */

/** Where Jim is at `t`: in the wings by the stage door, watching; drawn a little toward the stage at the nod. */
export function jimAt(t: number): Pt {
  const lean = 0.07 * ease(t, NOD[0] - 0.5, NOD[1]) * (1 - ease(t, FINAL + 2, FINAL + 5))
  return [JIM_WINGS[0] + lean, JIM_WINGS[1]]
}

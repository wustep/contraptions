import type { Pt } from '../../../../../parts'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { CRASH } from '../drums'
import { CHEST, POSES, RIG, beatPose, blendPose, mixArm, reachFromHead, wrapAngle, type ArmPose, type HandShape, type Pose } from '../fletcher'
import { BREAK, FINAL, LAST_CHORD, RIDE, SOLO } from '../music'
import { STOMPS, UNWIND } from './fast-clock'
import { pushOff } from './rubato-hits'
import { CUT, STUN_LEAN } from './sabotage-motion'
import { DOOR, FLETCHER_HOME, FLOOR, JIM_WINGS, KIT_AT, PODIUM } from './stage'

/**
 * Fletcher, Jim and the crash cymbal from the solo's first stroke (270.52) to the end, in the Carnegie frame
 * (`stage.ts`). The director's: the score hands the stage their company spans from here, the hall draws Fletcher's
 * rig from `fletcherAt`, `floorAt` and `poseAt` and the crash from `crashAskew`, and the hush and the finale time
 * Andrew to the same clock. Before the solo the sabotage part has them both; at the hand-off Fletcher is at
 * `FLETCHER_HOME` in `POSES.rest` and Jim at `JIM_WINGS`, at rest.
 *
 * What the film has, and where it is here:
 *
 * - **The solo.** Fletcher cut the band off, and the drummer did not stop. His open hands stay out where the band
 *   stopped, his head turned hard to the kit, until the solo's camera whips across to him (`STUNNED`); only then do
 *   they come down, and he sinks into listening. Jim in the wings by the stage door, watching.
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

/**
 * The solo's first phrase: frozen in his cut-off from the solo's first stroke until the camera's whip lands on him on
 * the phrase's big hit (`solo.ts`, 277.96); then his hands come down and his head eases back to a listening lean.
 */
export const STUNNED: [number, number] = [277.96, 280.5]

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

/**
 * The rubato: from his podium he keeps the metronome's time with it, his right hand alone beating every stroke of the
 * rod, the hand falling into each stroke as the bob strikes and rebounding high, slowing with it to the slowest
 * (458.58, one long slow fall a stroke) and quickening after, leaning in; the left hangs at his side, so the one
 * thing moving is the hand that keeps the time: the conductor keeping the drummer's own tempo, which is the show's
 * answer to "not my tempo".
 */
export const RUBATO: [number, number] = [455.0, 468.8]
const RUBATO_BEATS: number[] = RIDE.filter((t) => t > RUBATO[0] - 2 && t < RUBATO[1] + 2)
export const rubatoOn = (t: number): number => ease(t, RUBATO[0], RUBATO[0] + 1.5) * (1 - ease(t, RUBATO[1] - 1.8, RUBATO[1]))
/** The rubato beat's ictus (relative to his head: his shoulder's height, out toward the metronome) and its rebound's share of a beat. */
const RUBATO_ICTUS: Pt = [-0.9, 0.12]
const REBOUND = 0.33

/**
 * His right hand in the rubato at `t`: on each stroke of the rod it is at the ictus, with a flick of the wrist; it
 * rebounds up (quick, slowing to the top), hangs, and falls, gathering speed, into the next stroke. The slower the
 * rod, the higher the rebound (0.45 to 0.8 cells) and the longer the fall. Continuous across every stroke: whatever
 * the beat's size, the hand is at the ictus on it.
 */
function rubatoBeat(t: number): ArmPose {
  let j = 0
  while (j + 1 < RUBATO_BEATS.length && RUBATO_BEATS[j + 1] <= t) j++
  const a = RUBATO_BEATS[j]
  const b = RUBATO_BEATS[Math.min(j + 1, RUBATO_BEATS.length - 1)]
  const span = b - a
  const u = span > 0 ? clamp((t - a) / span) : 0
  const h = u < REBOUND ? 1 - (1 - u / REBOUND) ** 2 : 1 - ((u - REBOUND) / (1 - REBOUND)) ** 2
  const size = 0.45 + 0.35 * clamp((span - 0.3) / 0.6)
  const w: Pt = [RUBATO_ICTUS[0] + 0.18 * h, RUBATO_ICTUS[1] - size * h]
  const flick = (1 - h) ** 3
  return reachFromHead(-1, w, Math.PI + 0.5 * h - 0.35 * flick, 'beat')
}

/** The finale: to the kit in the long roll, up to Andrew's height, the nod, and back. */
export const F_WALK: [number, number] = [519.4, 522.8]
export const NOD: [number, number] = [527.5, 530.95]
/** Andrew's nod back, in the drummer's frame: between Fletcher's deep nod and his second, smaller one. */
export const NOD_BACK: [number, number] = [529.3, 530.35]
/**
 * After the nod he does not go back to his podium: he gives Andrew room for the last fill (a small step back, a
 * little lower), and stays by the kit, eye to eye, to the end: the film keeps him there. In the silence he rises to
 * Andrew's height again, his hands up for the band's chord, and cuts it off there.
 */
export const F_BACK: [number, number] = [531.05, 533.4]
/** How far he steps back and sinks for the last fill, and when he comes up again (the silence). */
const BACK_X = 0
const BACK_SINK = 0.4
const UP_AGAIN: [number, number] = [BREAK + 0.2, LAST_CHORD - 0.3]

/** Where he stands to set the crash straight, and to nod: right of the hi-hat. How far his column rises for each. */
const FIX_X = 1.72
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
export function riseAt(T: number): number {
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
  // The solo: turned hard to the kit from the cut-off (the sabotage turned him), easing to a listening lean as his
  // hands come down under the camera's look (`STUNNED`), and upright again once it has gone back to the kit.
  const watch = t < 290 ? -STUN_LEAN * (1 - ease(t, STUNNED[0], STUNNED[1])) - 0.1 * ease(t, STUNNED[0], STUNNED[1]) * (1 - ease(t, 281.6, 283.4)) : 0
  if (t < 400) return watch - 0.12 * ease(t, LET_GO, LET_GO + 0.6) * (1 - ease(t, H_BACK[0] - 0.4, H_BACK[0] + 0.3))
  if (t < 480) return -0.1 * rubatoOn(t)
  // Turned in to him before the nod, and back once it is done (the nod itself is a bow: `bowAt`).
  return -0.2 * ease(t, NOD[0] - 0.9, NOD[0] + 0.1) * (1 - ease(t, NOD[1] - 0.3, NOD[1] + 0.7))
}

/**
 * The nod (0..1): a deep one, down over half a second and held, the whole chest bowing toward Andrew off the column;
 * up; Andrew answers (`NOD_BACK`); then a second, smaller nod, quicker: that's it.
 */
function nodAt(t: number): number {
  const first = ease(t, NOD[0], NOD[0] + 0.45) - ease(t, NOD[0] + 1.25, NOD[0] + 1.8)
  const second = 0.55 * (ease(t, NOD[1] - 0.65, NOD[1] - 0.38) - ease(t, NOD[1] - 0.3, NOD[1]))
  return first + second
}

/** His bow at `t` (radians, negative toward Andrew): the chest and arms turned off the column about the waist. */
export const bowAt = (t: number): number => (t > 400 ? -0.36 * nodAt(t) : 0)

/** Where his column's foot is across the stage at `t` (his head is off it when he leans). */
export const baseAt = (t: number): number => xAt(t)

/** Where Fletcher's head (his ball) is at `t` (show seconds), in the Carnegie frame. */
export function fletcherAt(t: number): Pt {
  const x = xAt(t)
  // The bow swings his head forward and down about his waist; the head dips on the neck as well.
  const b = bowAt(t)
  const nod = 0.17 * (t > 400 ? nodAt(t) : 0)
  // A small breath the rest of the time.
  const breath = 0.012 * Math.sin((t - SOLO) * 1.3)
  return [x + leanAt(t) + CHEST.waist * Math.sin(b), floorAt(t) - TALL - riseAt(t) + CHEST.waist * (1 - Math.cos(b)) + nod + breath]
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
  // And in the rubato, giving under him as he springs off it for the metronome's weight, and ringing after.
  return set + after + pushOff(T)
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
  return { up: wrapAngle(up), bend: wrapAngle(fa - up), wrist: wrapAngle(dir - fa), hand }
}

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


/** Where he is in his beat at `t`: whole numbers on the beats he keeps (the stomps he beats, by default). */
function beatAt(t: number, beats: readonly number[] = BEATS): number {
  let j = 0
  while (j + 1 < beats.length && beats[j + 1] <= t) j++
  const a = beats[j]
  const b = beats[Math.min(j + 1, beats.length - 1)]
  return j + (b > a ? clamp((t - a) / (b - a)) : 0)
}

/** What his hands do at `t`. */
export function poseAt(t: number): Pose {
  // The solo's first phrase: the cut-off held, then lowered to his sides once the camera has found him.
  if (t < STUNNED[1]) return blendPose(CUT, POSES.rest, ease(t, STUNNED[0], STUNNED[1]))
  // The build: drawn in, he conducts him, bigger as it goes.
  if (t > CONDUCT[0] && t < CONDUCT[1] + 1.4) {
    const on = ease(t, CONDUCT[0], CONDUCT[0] + 1.6) * (1 - ease(t, CONDUCT[1], CONDUCT[1] + 1.3))
    const size = 0.3 + 0.6 * ease(t, CONDUCT[0], CONDUCT[0] + 16)
    return blendPose(POSES.rest, beatPose(beatAt(t), size), on)
  }
  // The rubato: his right hand beats the rod's strokes, the left hangs at his side.
  if (t > RUBATO[0] && t < RUBATO[1]) return { left: POSES.rest.left, right: mixArm(POSES.rest.right, rubatoBeat(t), rubatoOn(t)) }
  // The hush: his right hand up to the crash's rim, straightening it, and back down.
  if (t > GRIP[0] && t < LET_GO + 0.9) {
    const on = ease(t, GRIP[0], GRIP[1]) * (1 - ease(t, LET_GO, LET_GO + 0.9))
    return { left: POSES.rest.left, right: mixArm(POSES.rest.right, fixing(t), on) }
  }
  if (t < BREAK + 0.2) return POSES.rest
  // In the silence before the last chord, both hands come up, open: the band ready.
  const ready = POSES.ready
  if (t < LAST_CHORD - 0.12) return blendPose(POSES.rest, ready, ease(t, BREAK + 0.2, LAST_CHORD - 0.3))
  // The chord: a downbeat with both hands, and up again, held high and open, rising a little as it swells.
  if (t < FINAL - 0.62) return { right: heldHigh(t), left: heldHigh(t, 'left') }
  // The cut-off, with his left hand (the house's right, out over clear wall: his right side is all the frame's arm
  // and sticks). Open, it circles out and up (the breath before it), then comes down hard and closes ON the last
  // stroke: the fist, at his eye line. It stops dead there and holds, no settle. The right hand comes down during
  // the circle and hangs close at his side (`SIDE`), still, so nothing moves on the cut but the fist, and the frame's
  // steel fist pinning the crash has clear wall between it and his hand.
  const shoulder: Pt = [RIG.shoulder, RIG.drop]
  const wristOf = (a: ArmPose): Pt => {
    const e: Pt = [shoulder[0] + Math.cos(a.up) * RIG.upper, shoulder[1] + Math.sin(a.up) * RIG.upper]
    return [e[0] + Math.cos(a.up + a.bend) * RIG.fore, e[1] + Math.sin(a.up + a.bend) * RIG.fore]
  }
  const held = heldHigh(FINAL - 0.62, 'left')
  const from = wristOf(held)
  // The palm turns out from the held chord's angle as the circle begins, not in one frame.
  const heldDir = held.up + held.bend + held.wrist
  const right: ArmPose = mixArm(heldHigh(FINAL - 0.62), SIDE, ease(t, FINAL - 0.62, FINAL - 0.1))
  let left: ArmPose
  if (t < CIRCLE) {
    // Out and up, open, the palm turning out: a small loop that bulges away from him.
    const u = ease(t, FINAL - 0.62, CIRCLE)
    const bulge = Math.sin(Math.PI * u) * 0.12
    const w: Pt = [from[0] + (APEX[0] - from[0]) * u + bulge, from[1] + (APEX[1] - from[1]) * u]
    const dir = -1.2 - 0.35 * u
    left = reachFromHead(1, w, heldDir + wrapAngle(dir - heldDir) * ease(t, FINAL - 0.62, FINAL - 0.4), 'open')
  } else {
    // The strike: gathering speed all the way down, round the outside, and stopping on the stroke.
    const v = clamp((t - CIRCLE) / (FINAL - CIRCLE))
    const u = v * v * v
    const bow = Math.sin(Math.PI * u) * 0.14
    const w: Pt = [APEX[0] + (FIST[0] - APEX[0]) * u + bow, APEX[1] + (FIST[1] - APEX[1]) * u]
    left = reachFromHead(1, w, -1.55 + (1.55 - 0.35) * u, t >= FINAL - 0.02 ? 'fist' : 'open')
  }
  // Held, and then lowered on the inside: the fist comes in to his chest and on down to hang at his side (blended
  // joint by joint it swung out sideways first, the fist held out at arm's length like a signal).
  const down = ease(t, FINAL + 3.2, FINAL + 6.4)
  if (down <= 0) return { right, left }
  const v = 1 - down
  const w: Pt = [v * v * FIST[0] + 2 * v * down * IN[0] + down * down * HANG[0], v * v * FIST[1] + 2 * v * down * IN[1] + down * down * HANG[1]]
  return { right, left: reachFromHead(1, w, -0.35 + (HANG_DIR + 0.35) * down, down < 0.6 ? 'fist' : 'beat') }
}

/** The lowered fist's way down: pulled in toward his chest (`IN` bends the path), to hang at his side. */
const IN: Pt = [-0.1, 0.5]
const HANG: Pt = [0.55, 1.12]
const HANG_DIR = 1.26

/**
 * His right hand (the house's left) from the cut-off to the end: hanging close at his side, the arm near straight
 * down, the hand by his thigh. `POSES.rest` holds it out from his hip, and there it met the frame's steel fist on the
 * crash's rim (the last image read as the machine handing him the stick).
 */
const SIDE: ArmPose = { up: Math.PI * 0.545, bend: -0.05, wrist: 0.04, hand: 'beat' }

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

/**
 * The hush's look at Jim: the stage door opens again (358.5) and he stands in it, in the corridor's light, where he
 * held his son under the chord; a small ball in a lit doorway reads across the stage where a ball on a dark floor
 * did not. He steps back out into the wings once the camera has gone back to the kit (367.2), and the door closes.
 */
const HUSH_DOOR = { open: [358.5, 359.5] as [number, number], shut: [368.0, 369.3] as [number, number] }
const IN_DOOR: [number, number] = [358.7, 359.95]
const OUT_DOOR: [number, number] = [367.2, 368.4]
/** Where he stands in the doorway: just inside its stage edge, the corridor's light behind him. */
const DOORWAY_X = DOOR.x + 0.18

/** How far the stage door is open in the hush (radians, as the sabotage's `doorAngle`: 1.36 wide open). */
export function hushDoor(t: number): number {
  return 1.3 * ease(t, HUSH_DOOR.open[0], HUSH_DOOR.open[1]) * (1 - ease(t, HUSH_DOOR.shut[0], HUSH_DOOR.shut[1]))
}

/**
 * Where Jim is at `t`: in the wings by the stage door, watching; in the doorway's light for the hush's look at him,
 * drawn toward the stage (his son alone on the ride, far across it); drawn toward it too for the solo's look, and at
 * the nod.
 */
export function jimAt(t: number): Pt {
  const inDoor = ease(t, IN_DOOR[0], IN_DOOR[1]) * (1 - ease(t, OUT_DOOR[0], OUT_DOOR[1]))
  const hush = 0.08 * ease(t, 359.6, 361.4) * (1 - ease(t, 365.6, 367.2))
  // Drawn toward the stage too when the solo's camera comes to him.
  const solo = 0.06 * ease(t, 304.2, 305.6) * (1 - ease(t, 307.2, 308.6))
  const lean = hush + solo + 0.07 * ease(t, NOD[0] - 0.5, NOD[1]) * (1 - ease(t, FINAL + 2, FINAL + 5))
  return [JIM_WINGS[0] + (DOORWAY_X - JIM_WINGS[0]) * inDoor + lean, JIM_WINGS[1]]
}

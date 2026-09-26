import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { drawStick, KICK, KIT_FLOOR, SNARE, type KitPiece } from '../drums'
import type { Ctx } from '../kit'
import { SOLO } from '../music'
import { KIT } from '../worlds'
import { mixHex } from '../../../../../parts'
import { H_ACCENTS, H_FLY, H_LEAP, H_REST, H_SEATED, H_STROKES, H_UNSEAT } from './hush-score'
import { ACCENTS, CATCH, FOOT_DOWN, HOLD, LEAP, RIG_DOWN, SEATED, SLAM, STICK, STROKES, TARGETS, TOSS, UNSEAT, strokesOf, type Arm, type Grip, type Stroke } from './solo-score'

/**
 * The solo's machine, moved and drawn: a drummer's frame of chrome drum hardware, flown in on two lines from the flies
 * over the kit. A yoke for shoulders with a cup on top where his head goes, two long jointed arms with a stick in each
 * grip, and a steel shin that comes down from behind the snare onto the kick's pedal. Andrew (the ball) is its head:
 * he leaps up into the cup and it plays as his body, his head bouncing on the accents and leaning into the playing.
 *
 * After the solo it does not fly out: it hangs limp over the kit while he plays soft on the snare, and he leaps back
 * up into it for the hush (`hush-score.ts`), where it plays soft (the hi-hat, the bursts, the ride) with him in the
 * cup; he leaves it for the build, and it flies out as the build's engine rises.
 *
 * Every pose is a function of show time, in the kit's frame (`drums.ts`), so the lane and the drawing agree.
 */

/* ------------------------------------------------------------------ the frame */

/** Where his head (the ball's centre) sits in the cup when the frame is at rest. */
export const NECK: Pt = [-0.78, -2.62]
/** The shoulders, from the head. */
export const SHOULDER_AT: Record<Arm, Pt> = { left: [-0.86, 0.24], right: [0.84, 0.24] }
/** The arms: upper and fore, in cells. */
export const UPPER = 1.2
export const FORE = 1.13

/** How far above its playing height the frame is at `T`: high in the flies, down on the solo's first stroke, up as the build begins. */
export function rigDrop(T: number): number {
  if (T <= SOLO) return -9
  if (T < RIG_DOWN) {
    // A long fly in: fast from out of sight, slowing to a stop without a bounce.
    const u = (T - SOLO) / (RIG_DOWN - SOLO)
    return -9 * Math.pow(1 - u, 3)
  }
  if (T < H_FLY[0]) return 0
  const u = clamp((T - H_FLY[0]) / (H_FLY[1] - H_FLY[0]))
  return -9.5 * Math.pow(u, 2.2)
}

/** Whether the machine is anywhere to be seen at `T`. */
export const rigOut = (T: number): boolean => T <= SOLO || T >= H_FLY[1]

/** How much he is seated in the cup: through the solo, and again through the hush. */
function seatedW(T: number): number {
  const solo = smoother((T - SEATED) / 0.3) * (1 - smoother((T - UNSEAT + 0.3) / 0.3))
  const hush = smoother((T - H_SEATED) / 0.3) * (1 - smoother((T - H_UNSEAT + 0.3) / 0.3))
  return solo + hush
}

export const smoother = (x: number): number => {
  const u = clamp(x)
  return u * u * u * (u * (u * 6 - 15) + 10)
}
/** The rebound: up fast off the head, a float at the top, and down fast into the next stroke. */
export const liftShape = (u: number): number => Math.sin(Math.PI * Math.pow(clamp(u), 0.72))

/* ------------------------------------------------------------------ his head */

/** Which way each piece leans him: the house's left for the ride and the toms, its right for the hi-hat and the crash. */
const SIDE: Partial<Record<KitPiece, number>> = { ride: -1, floor: -1, rack: -0.6, snare: 0, hat: 0.7, crash: 1 }
const ARMS: readonly { t: number; piece: KitPiece }[] = [...STROKES.filter((s) => s.limb === 'left' || s.limb === 'right'), ...H_STROKES]
/** The accents his head bounces on: the solo's, and the hush's (soft). */
const ALL_ACCENTS: readonly { t: number; a: number }[] = [...ACCENTS, ...H_ACCENTS.map((x) => ({ t: x.t, a: x.a * 0.6 }))]
/** His lean at `T`, cells: into the side the arms are playing, smoothed over the strokes round it. */
function lean(T: number): number {
  let sum = 0
  let w = 0
  for (const s of ARMS) {
    const d = s.t - T
    if (d < -0.9) continue
    if (d > 0.9) break
    const k = Math.exp(-(d * d) / (2 * 0.28 * 0.28))
    sum += k * (SIDE[s.piece] ?? 0)
    w += k
  }
  return (0.11 * sum) / (w + 0.6)
}
/** His head's bounce at `T`: down on each accent, up between, higher for a longer gap and a louder hit to come. */
function bob(T: number): number {
  let j = 0
  while (j < ALL_ACCENTS.length && ALL_ACCENTS[j].t <= T) j++
  if (j === 0 || j === ALL_ACCENTS.length) return 0
  const a = ALL_ACCENTS[j - 1]
  const b = ALL_ACCENTS[j]
  const gap = b.t - a.t
  const big = Math.abs(b.t - SLAM) < 0.01 ? 2.6 : 1
  // The hush plays soft: the head's bounce half the solo's.
  const soft = T > H_LEAP ? 0.5 : 1
  const amp = clamp(0.035 + 0.11 * gap, 0.04, 0.12) * (0.55 + 0.45 * b.a) * big * soft
  return -amp * liftShape((T - a.t) / gap)
}
/** How the body follows his head: the shoulders take part of the lean and the bounce. */
function body(T: number): Pt {
  const w = seatedW(T)
  if (w <= 0) return [0, 0]
  return [lean(T) * 0.7 * w, bob(T) * 0.35 * w]
}
/** His head (the ball's centre) while he rides the frame, in the kit's frame. */
export function headAt(T: number): Pt {
  const w = seatedW(T)
  return [NECK[0] + lean(T) * w, NECK[1] + bob(T) * w + rigDrop(T)]
}

/** A shoulder at `T`, with the frame's drop and the body's sway. */
function shoulder(arm: Arm, T: number): Pt {
  const b = body(T)
  return [NECK[0] + SHOULDER_AT[arm][0] + b[0], NECK[1] + SHOULDER_AT[arm][1] + b[1] + rigDrop(T)]
}

/* ------------------------------------------------------------------ an arm's stroke */

/** How big a backswing is: bigger for a longer wait and a louder stroke to come. */
export const ampOf = (gap: number, s: number): number => clamp(0.18 + 1.45 * gap, 0.2, 0.9) * (0.62 + 0.38 * clamp(s / 1.8))
/** Which way turns the tip up, for a stick at `ang`: a stick pointing right lifts turning back, one pointing left turning on. */
export const upSign = (ang: number): number => -Math.cos(ang) / Math.max(0.35, Math.abs(Math.cos(ang)))

export interface ArmPose {
  grip: Pt
  ang: number
  holding: boolean
}

/** An arm hanging limp from its shoulder, the stick down: flying in and out. */
export const LIMP: Record<Arm, { off: Pt; ang: number }> = {
  left: { off: [-0.05, 1.32], ang: Math.PI / 2 + 0.08 },
  right: { off: [0.48, 1.2], ang: Math.PI / 2 - 0.26 },
}

const ARM_STROKES: Record<Arm, Stroke[]> = {
  left: [...strokesOf('left'), ...H_STROKES.filter((s) => s.limb === 'left')] as Stroke[],
  right: [...strokesOf('right'), ...H_STROKES.filter((s) => s.limb === 'right')] as Stroke[],
}

function playPose(arm: Arm, T: number): Grip {
  const list = ARM_STROKES[arm]
  // The strokes either side of T; before the first and after the last, a stroke's worth of lift at the same place.
  let j = 0
  while (j < list.length && list[j].t <= T) j++
  const prev = j > 0 ? list[j - 1] : { ...list[0], t: list[0].t - 0.6, s: 0.6 }
  const next = j < list.length ? list[j] : { ...list[list.length - 1], t: list[list.length - 1].t + 0.6, s: 0.6 }
  const a = TARGETS[arm][prev.piece]!
  const b = TARGETS[arm][next.piece]!
  const gap = next.t - prev.t
  if (T > H_LEAP && gap > 1.6) return restPose(a, b, prev, next, T)
  const u = clamp((T - prev.t) / gap)
  // Carried across between the rebound and the next downstroke; a little up and over when it goes far.
  const e = smoother((u - 0.12) / 0.76)
  const dist = Math.hypot(b.grip[0] - a.grip[0], b.grip[1] - a.grip[1])
  const amp = ampOf(gap, next.s) * (Math.abs(next.t - SLAM) < 0.01 ? 1.25 : 1)
  const L = liftShape(u)
  const sign = upSign(a.ang) + (upSign(b.ang) - upSign(a.ang)) * e
  return {
    // The hand lifts with the stick (a stroke is wrist and forearm), so the tip rises more than it swings in.
    grip: [a.grip[0] + (b.grip[0] - a.grip[0]) * e, a.grip[1] + (b.grip[1] - a.grip[1]) * e - 0.2 * dist * Math.sin(Math.PI * e) - 0.3 * amp * L],
    ang: a.ang + (b.ang - a.ang) * e + sign * 0.72 * amp * L,
  }
}

/**
 * A long wait in the hush (an arm with nothing to play for seconds): carried over to the next drum early, the stick
 * resting just over its head, lifted only for the stroke to come. (One backswing stretched over the whole wait held
 * the stick up high for ten seconds.)
 */
function restPose(a: Grip, b: Grip, prev: Stroke, next: Stroke, T: number): Grip {
  const since = T - prev.t
  const until = next.t - T
  const PREP = 0.8
  const e = smoother((since - 0.15) / 0.8)
  const rebound = since < 0.45 ? ampOf(0.45, prev.s) * liftShape(since / 0.45) : 0
  const prep = until < PREP ? ampOf(PREP, next.s) * liftShape(1 - until / PREP) : 0
  const hover = 0.08 * smoother((since - 0.2) / 0.4) * smoother((until - 0.1) / 0.4)
  const lift = Math.max(rebound, prep, hover)
  const dist = Math.hypot(b.grip[0] - a.grip[0], b.grip[1] - a.grip[1])
  const sign = upSign(a.ang) + (upSign(b.ang) - upSign(a.ang)) * e
  return {
    grip: [a.grip[0] + (b.grip[0] - a.grip[0]) * e, a.grip[1] + (b.grip[1] - a.grip[1]) * e - 0.2 * dist * Math.sin(Math.PI * e) - 0.3 * lift],
    ang: a.ang + (b.ang - a.ang) * e + sign * 0.72 * lift,
  }
}

/** How far the right arm hangs out of Fletcher's way while he is at the kit (`H_REST`), 0 to 1. */
const resting = (T: number): number => smoother((T - H_REST[0]) / 0.6) * (1 - smoother((T - (H_REST[1] - 0.6)) / 0.6))

/** Awake (1) or limp (0): the arms come up as he leaps for the cup, and go limp as he leaves it. */
const awake = (T: number): number =>
  smoother((T - (LEAP + 0.04)) / (SEATED - LEAP - 0.08)) * (1 - smoother((T - (UNSEAT + 0.04)) / 0.45)) +
  smoother((T - (H_LEAP + 0.04)) / (H_SEATED - H_LEAP - 0.08)) * (1 - smoother((T - (H_UNSEAT + 0.04)) / 0.45))

/** An arm's pose at `T`, in the kit's frame. */
export function armPose(arm: Arm, T: number): ArmPose {
  const w = awake(T) * (arm === 'right' ? 1 - resting(T) : 1)
  const s = shoulder(arm, T)
  const drop = rigDrop(T)
  const play = w > 0 ? playPose(arm, T) : null
  // A limp arm still swings a little as the frame comes to rest, and as it starts up again.
  const settle = T > RIG_DOWN - 0.3 && T < RIG_DOWN + 2.5 ? 0.07 * Math.exp(-(T - RIG_DOWN + 0.3) / 0.5) * Math.sin((T - RIG_DOWN + 0.3) * 6.5) : 0
  const lift = T > H_FLY[0] ? 0.06 * Math.sin(clamp((T - H_FLY[0]) / 0.5) * Math.PI) : 0
  const limp: Grip = { grip: [s[0] + LIMP[arm].off[0] + settle * 0.5, s[1] + LIMP[arm].off[1]], ang: LIMP[arm].ang + settle + lift * (arm === 'left' ? 1 : -1) }
  if (!play) return { ...limp, holding: true }
  return {
    grip: [limp.grip[0] + (play.grip[0] - limp.grip[0]) * w, limp.grip[1] + (play.grip[1] + drop - limp.grip[1]) * w],
    ang: limp.ang + (play.ang - limp.ang) * w,
    holding: arm === 'left' || T < TOSS + 0.03 || T >= CATCH,
  }
}

/** The stick in flight, thrown at `TOSS` and caught at `CATCH`: its middle and its angle, or null. */
export function tossedStick(T: number): { mid: Pt; ang: number } | null {
  if (T < TOSS + 0.03 || T >= CATCH) return null
  const t0 = TOSS + 0.03
  const a = armPose('right', t0)
  const b = armPose('right', CATCH)
  const midOf = (q: ArmPose): Pt => [q.grip[0] + Math.cos(q.ang) * (STICK / 2 - HOLD), q.grip[1] + Math.sin(q.ang) * (STICK / 2 - HOLD)]
  const m0 = midOf(a)
  const m1 = midOf(b)
  const u = (T - t0) / (CATCH - t0)
  // Straight up out of the grip and back into it: a parabola, and two turns end over end.
  const H = 1.5
  return {
    mid: [m0[0] + (m1[0] - m0[0]) * u, m0[1] + (m1[1] - m0[1]) * u - H * 4 * u * (1 - u)],
    ang: a.ang + (b.ang + 4 * Math.PI - a.ang) * u,
  }
}

/* ------------------------------------------------------------------ the foot */

const FOOT = strokesOf('foot')
/** How far the pedal's footboard is pressed at `T` (the hall's kit presses it the same way on the same strokes). */
export function pedalPress(T: number): number {
  let last = -Infinity
  for (const s of FOOT) {
    if (s.t > T) break
    last = s.t
  }
  const since = T - last
  return since >= 0 && since < 0.4 ? Math.exp(-since / 0.06) : 0
}
/** How far the foot is lowered: 0 hidden behind the snare, 1 on the pedal. */
export function footDown(T: number): number {
  return smoother((T - (SOLO + 0.3)) / (FOOT_DOWN - SOLO - 0.35)) * (1 - smoother((T - (UNSEAT + 0.06)) / 0.5))
}
/** The boot's lift off the footboard between kicks. */
function footLift(T: number): number {
  let j = 0
  while (j < FOOT.length && FOOT[j].t <= T) j++
  if (j === 0 || j === FOOT.length) return 0.1
  const a = FOOT[j - 1]
  const b = FOOT[j]
  const gap = b.t - a.t
  return clamp(0.02 + 0.2 * gap, 0.03, 0.13) * (0.7 + 0.3 * clamp(b.s / 1.6)) * liftShape((T - a.t) / gap)
}

/* ------------------------------------------------------------------ drawing */

/** The frame's metal: a dark chrome that holds its silhouette against the warm wall, and the light along its top. */
export const STEEL = mixHex(KIT.chrome, KIT.lacquer, 0.58)
const STEEL_EDGE = mixHex(STEEL, KIT.lacquer, 0.45)

/**
 * A length of tube: dark chrome, a darker edge under it, and one lit edge along its upper side (the stage's light is
 * above), so it reads as a solid rod, not a pale outline.
 */
export function tube(p: p5, c: Ctx, a: Pt, b: Pt, w0: number): void {
  const { k, weight } = c
  const w = weight * w0 * 0.82
  p.strokeCap(p.ROUND)
  p.stroke(STEEL_EDGE)
  p.strokeWeight(w)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.stroke(STEEL)
  p.strokeWeight(w * 0.72)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  // The lit edge: on the side of the tube that faces up.
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy) || 1
  let nx = dy / L
  let ny = -dx / L
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  const off = w * 0.2
  p.stroke(KIT.chrome)
  p.strokeWeight(w * 0.16)
  p.line(a[0] * k + nx * off, a[1] * k + ny * off, b[0] * k + nx * off, b[1] * k + ny * off)
}

/**
 * A joint: a round hub in the tube's dark chrome (sized from `len` and `w`, the old clamp's), a darker rim, one
 * small highlight on its upper side. Never bright, never ball-sized.
 */
export function clampBlock(p: p5, c: Ctx, at: Pt, _ang: number, len: number, w: number): void {
  const { k, weight } = c
  const d = Math.min(0.13, 0.72 * Math.max(len, w))
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.stroke(STEEL_EDGE)
  p.strokeWeight(weight * 0.9)
  p.fill(STEEL)
  p.circle(0, 0, d * k)
  p.noFill()
  p.stroke(KIT.chrome)
  p.strokeWeight(weight * 0.8)
  p.arc(0, 0, d * 0.62 * k, d * 0.62 * k, Math.PI * 1.1, Math.PI * 1.55)
  p.pop()
}

/**
 * The yoke across the shoulders, bowed up under his head, and the cradle his head sits in: a shallow shaped dish of
 * the same dark chrome, its lit rim along the top (not a black half-disc under him).
 */
export function drawYoke(p: p5, c: Ctx, L: Pt, R: Pt): void {
  const { k, weight } = c
  const mid: Pt = [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - 0.05]
  p.noFill()
  p.strokeCap(p.ROUND)
  for (const [w, col] of [[4.4, STEEL_EDGE], [3.2, STEEL]] as const) {
    p.stroke(col)
    p.strokeWeight(weight * w)
    p.bezier(L[0] * k, L[1] * k, (L[0] + 0.3) * k, (mid[1] - 0.12) * k, (R[0] - 0.3) * k, (mid[1] - 0.12) * k, R[0] * k, R[1] * k)
  }
  p.stroke(KIT.chrome)
  p.strokeWeight(weight * 0.7)
  p.bezier(L[0] * k, (L[1] - 0.02) * k, (L[0] + 0.3) * k, (mid[1] - 0.14) * k, (R[0] - 0.3) * k, (mid[1] - 0.14) * k, R[0] * k, (R[1] - 0.02) * k)
  // The cradle: a shallow dish, its top the rim he sits in, its underside curved.
  const top = mid[1] - 0.1
  const half = 0.2
  p.stroke(STEEL_EDGE)
  p.strokeWeight(weight * 0.8)
  p.fill(STEEL)
  p.beginShape()
  for (let i = 0; i <= 16; i++) {
    const u = i / 16
    const x = mid[0] - half + 2 * half * u
    p.vertex(x * k, (top + 0.1 * Math.sin(Math.PI * u) ** 0.8 + 0.012) * k)
  }
  for (let i = 16; i >= 0; i--) {
    const u = i / 16
    const x = mid[0] - half * 0.82 + 2 * half * 0.82 * u
    p.vertex(x * k, (top + 0.035 * Math.sin(Math.PI * u)) * k)
  }
  p.endShape(p.CLOSE)
  p.noFill()
  p.stroke(KIT.chrome)
  p.strokeWeight(weight * 0.7)
  p.line((mid[0] - half * 0.95) * k, (top + 0.004) * k, (mid[0] - half * 0.55) * k, (top + 0.022) * k)
}

/**
 * Where the elbow is, for a shoulder and a wrist. An elbow bends one way only, so it never flips: the house's left
 * arm bends out to the left (and up, reaching left), the right arm out to the right (and up, reaching right).
 */
export function elbowOf(s: Pt, w: Pt, bend: -1 | 1): Pt {
  const dx = w[0] - s[0]
  const dy = w[1] - s[1]
  const d = Math.max(Math.abs(UPPER - FORE) + 1e-3, Math.min(UPPER + FORE - 1e-3, Math.hypot(dx, dy)))
  const A = Math.acos(clamp((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d), -1, 1))
  const a = Math.atan2(dy, dx) + bend * A
  return [s[0] + Math.cos(a) * UPPER, s[1] + Math.sin(a) * UPPER]
}

/**
 * Where an elbow is for a shoulder and a wrist, `bend` from -1 to 1: at ±1 the two ways an elbow bends (as
 * `elbowOf`); between, the elbow swinging through the depth of the stage toward the house, so the arm never stretches.
 */
export function elbowSwing(s: Pt, w: Pt, bend: number): Pt {
  const dx = w[0] - s[0]
  const dy = w[1] - s[1]
  const L = Math.hypot(dx, dy) || 1e-6
  const d = Math.max(Math.abs(UPPER - FORE) + 1e-3, Math.min(UPPER + FORE - 1e-3, L))
  const A = Math.acos(clamp((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d), -1, 1))
  const ux = dx / L
  const uy = dy / L
  const along = UPPER * Math.cos(A)
  const across = UPPER * Math.sin(A) * bend
  return [s[0] + ux * along - uy * across, s[1] + uy * along + ux * across]
}

/**
 * The house's right elbow: out (as through the solo) until the frame hangs limp after it; then it swings under and
 * stays under through the hush, where the arm plays the hi-hat below the crash Fletcher straightens: out, its elbow
 * would sit up by the crash's rim, in his hand's way.
 */
const RIGHT_UNDER: [number, number] = [UNSEAT + 0.8, UNSEAT + 2.4]
const rightBend = (T: number): number => -1 + 2 * smoother((T - RIGHT_UNDER[0]) / (RIGHT_UNDER[1] - RIGHT_UNDER[0]))

function drawArm(p: p5, c: Ctx, arm: Arm, T: number): void {
  const pose = armPose(arm, T)
  const s = shoulder(arm, T)
  const w = pose.grip
  const e = arm === 'left' ? elbowOf(s, w, 1) : elbowSwing(s, w, rightBend(T))
  tube(p, c, s, e, 4.4)
  tube(p, c, e, w, 3.8)
  clampBlock(p, c, e, Math.atan2(w[1] - e[1], w[0] - e[0]), 0.15, 0.12)
  if (pose.holding) {
    const butt: Pt = [w[0] - Math.cos(pose.ang) * HOLD, w[1] - Math.sin(pose.ang) * HOLD]
    drawStick(p, c, butt, pose.ang, STICK)
  }
  // The grip: a clamp round the stick (a smaller, open one while the stick is in the air).
  clampBlock(p, c, w, pose.ang, pose.holding ? 0.15 : 0.1, pose.holding ? 0.11 : 0.09)
}

/** The yoke, the cup, and the two lines up into the flies. */
function drawFrame(p: p5, c: Ctx, T: number): void {
  const { k, weight } = c
  const L = shoulder('left', T)
  const R = shoulder('right', T)
  // The lines, up out of sight, fading into the dark above the light.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const q of [L, R]) {
    const g = ctx.createLinearGradient(0, (q[1] - 5) * k, 0, q[1] * k)
    g.addColorStop(0, 'rgba(183, 178, 167, 0)')
    // Bright while it flies in and out; dim once it hangs still at its height (in the wide shots two long lines up
    // the frame's full height were the strongest lines in it).
    g.addColorStop(1, `rgba(183, 178, 167, ${(0.16 + 0.34 * Math.min(1, Math.abs(rigDrop(T)) / 0.6)).toFixed(3)})`)
    ctx.save()
    ctx.strokeStyle = g
    ctx.lineWidth = weight * 0.8
    ctx.beginPath()
    ctx.moveTo(q[0] * k, (q[1] - 5) * k)
    ctx.lineTo(q[0] * k, q[1] * k)
    ctx.stroke()
    ctx.restore()
  }
  drawYoke(p, c, L, R)
}

function drawFoot(p: p5, c: Ctx, T: number): void {
  const down = footDown(T)
  if (down <= 0.001) return
  const { k, ink, weight } = c
  // The footboard, as the kit draws it: its heel pinned at the kick's foot, turned down as it is pressed.
  const heel: Pt = [KICK.x + 0.55, KIT_FLOOR - 0.02]
  const tilt = -0.22 + 0.16 * pedalPress(T)
  const along = (d: number, up: number): Pt => [heel[0] + Math.cos(tilt) * d + Math.sin(tilt) * up, heel[1] + Math.sin(tilt) * d - Math.cos(tilt) * up]
  const lift = footLift(T) + (1 - down) * 1.6
  // The boot on the board's toe: a black wedge, its sole along the board, lifted between kicks.
  const sole0 = along(0.25, 0.045 + lift)
  const sole1 = along(0.52, 0.045 + lift)
  const top1 = along(0.47, 0.15 + lift)
  const top0 = along(0.31, 0.25 + lift)
  const ankle = along(0.41, 0.21 + lift)
  // The shin, up from the ankle to behind the snare's shell, where it goes out of sight.
  const hidden = SNARE.top + SNARE.depth + SNARE.w * 0.11 * 0.8
  const top: Pt = [ankle[0] + 0.07, hidden]
  if (ankle[1] <= top[1] + 0.02) return
  // Everything above the snare's shell is behind it: the foot comes down out of it and goes back up into it.
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.rect((top[0] - 1) * k, hidden * k, 2 * k, 3 * k)
  ctx.clip()
  tube(p, c, [top[0], hidden - 0.2], ankle, 3.8)
  solid(p, ink, weight * 0.8, KIT.lacquer)
  p.quad(sole0[0] * k, sole0[1] * k, sole1[0] * k, sole1[1] * k, top1[0] * k, top1[1] * k, top0[0] * k, top0[1] * k)
  clampBlock(p, c, ankle, Math.atan2(top[1] - ankle[1], top[0] - ankle[0]), 0.12, 0.11)
  p.pop()
}

/** The whole machine at `T`, in the kit's frame. */
export function drawRig(p: p5, c: Ctx, T: number): void {
  if (rigOut(T)) return
  p.push()
  // The clamps are laid out round their joints by corners (the stage draws in rectMode(CENTER)).
  p.rectMode(p.CORNER)
  drawFoot(p, c, T)
  drawFrame(p, c, T)
  drawArm(p, c, 'left', T)
  drawArm(p, c, 'right', T)
  // The shoulders' clamps, over where the arms join the yoke.
  const L = shoulder('left', T)
  const R = shoulder('right', T)
  for (const q of [L, R]) clampBlock(p, c, q, Math.atan2(R[1] - L[1], R[0] - L[0]), 0.2, 0.15)
  const flying = tossedStick(T)
  if (flying) {
    const butt: Pt = [flying.mid[0] - (Math.cos(flying.ang) * STICK) / 2, flying.mid[1] - (Math.sin(flying.ang) * STICK) / 2]
    drawStick(p, c, butt, flying.ang, STICK)
  }
  p.pop()
}

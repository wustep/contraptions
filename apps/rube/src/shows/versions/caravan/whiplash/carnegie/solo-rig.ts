import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { drawStick, KICK, KIT_FLOOR, SNARE, type KitPiece } from '../drums'
import type { Ctx } from '../kit'
import { SOLO } from '../music'
import { KIT } from '../worlds'
import { ACCENTS, CATCH, FOOT_DOWN, HOLD, LEAP, RIG_DOWN, RIG_UP, SEATED, SLAM, STICK, STROKES, TARGETS, TOSS, UNSEAT, strokesOf, type Arm, type Grip, type Stroke } from './solo-score'

/**
 * The solo's machine, moved and drawn: a drummer's frame of chrome drum hardware, flown in on two lines from the flies
 * over the kit. A yoke for shoulders with a cup on top where his head goes, two long jointed arms with a stick in each
 * grip, and a steel shin that comes down from behind the snare onto the kick's pedal. Andrew (the ball) is its head:
 * he leaps up into the cup and it plays as his body, his head bouncing on the accents and leaning into the playing.
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

/** How far above its playing height the frame is at `T`: high in the flies, down on the solo's first stroke, up at the end. */
export function rigDrop(T: number): number {
  if (T <= SOLO) return -9
  if (T < RIG_DOWN) {
    // A long fly in: fast from out of sight, slowing to a stop without a bounce.
    const u = (T - SOLO) / (RIG_DOWN - SOLO)
    return -9 * Math.pow(1 - u, 3)
  }
  const up = UNSEAT + 0.35
  if (T < up) return 0
  const u = clamp((T - up) / (RIG_UP - up))
  return -9.5 * Math.pow(u, 2.2)
}

/** Whether the machine is anywhere to be seen at `T`. */
export const rigOut = (T: number): boolean => T <= SOLO || T >= RIG_UP

export const smoother = (x: number): number => {
  const u = clamp(x)
  return u * u * u * (u * (u * 6 - 15) + 10)
}
/** The rebound: up fast off the head, a float at the top, and down fast into the next stroke. */
export const liftShape = (u: number): number => Math.sin(Math.PI * Math.pow(clamp(u), 0.72))

/* ------------------------------------------------------------------ his head */

/** Which way each piece leans him: the house's left for the ride and the toms, its right for the hi-hat and the crash. */
const SIDE: Partial<Record<KitPiece, number>> = { ride: -1, floor: -1, rack: -0.6, snare: 0, hat: 0.7, crash: 1 }
const ARMS = STROKES.filter((s) => s.limb === 'left' || s.limb === 'right')
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
  while (j < ACCENTS.length && ACCENTS[j].t <= T) j++
  if (j === 0 || j === ACCENTS.length) return 0
  const a = ACCENTS[j - 1]
  const b = ACCENTS[j]
  const gap = b.t - a.t
  const big = Math.abs(b.t - SLAM) < 0.01 ? 2.6 : 1
  const amp = clamp(0.035 + 0.11 * gap, 0.04, 0.12) * (0.55 + 0.45 * b.a) * big
  return -amp * liftShape((T - a.t) / gap)
}
/** How the body follows his head: the shoulders take part of the lean and the bounce. */
function body(T: number): Pt {
  if (T < SEATED || T > UNSEAT) return [0, 0]
  const w = smoother((T - SEATED) / 0.3) * (1 - smoother((T - UNSEAT + 0.3) / 0.3))
  return [lean(T) * 0.7 * w, bob(T) * 0.35 * w]
}
/** His head (the ball's centre) while he rides the frame, in the kit's frame. */
export function headAt(T: number): Pt {
  const w = smoother((T - SEATED) / 0.3) * (1 - smoother((T - UNSEAT + 0.3) / 0.3))
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

const ARM_STROKES: Record<Arm, Stroke[]> = { left: strokesOf('left'), right: strokesOf('right') }

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

/** Awake (1) or limp (0): the arms come up as he leaps for the cup, and go limp as he leaves it. */
const awake = (T: number): number => smoother((T - (LEAP + 0.04)) / (SEATED - LEAP - 0.08)) * (1 - smoother((T - (UNSEAT + 0.04)) / 0.45))

/** An arm's pose at `T`, in the kit's frame. */
export function armPose(arm: Arm, T: number): ArmPose {
  const w = awake(T)
  const s = shoulder(arm, T)
  const drop = rigDrop(T)
  const play = w > 0 ? playPose(arm, T) : null
  // A limp arm still swings a little as the frame comes to rest, and as it starts up again.
  const settle = T > RIG_DOWN - 0.3 && T < RIG_DOWN + 2.5 ? 0.07 * Math.exp(-(T - RIG_DOWN + 0.3) / 0.5) * Math.sin((T - RIG_DOWN + 0.3) * 6.5) : 0
  const lift = T > UNSEAT + 0.35 ? 0.06 * Math.sin(clamp((T - UNSEAT - 0.35) / 0.5) * Math.PI) : 0
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

/** A length of chrome tube: an ink edge and the bright core, like the kit's stands but heavier. */
export function tube(p: p5, c: Ctx, a: Pt, b: Pt, w: number): void {
  const { k, ink, weight } = c
  p.stroke(ink)
  p.strokeWeight(weight * w)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  p.stroke(KIT.chrome)
  p.strokeWeight(weight * w * 0.55)
  p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
}

/** A clamp: a black block across a joint, `len` along `ang`, `w` across, with a wing screw. */
export function clampBlock(p: p5, c: Ctx, at: Pt, ang: number, len: number, w: number): void {
  const { k, ink, weight } = c
  p.push()
  p.translate(at[0] * k, at[1] * k)
  p.rotate(ang)
  solid(p, ink, weight * 0.8, KIT.lacquer)
  p.rect((-len / 2) * k, (-w / 2) * k, len * k, w * k, 0.025 * k)
  p.stroke(KIT.chrome)
  p.strokeWeight(weight * 0.9)
  p.line(0, (-w / 2) * k, 0, (-w / 2 - 0.045) * k)
  p.pop()
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

function drawArm(p: p5, c: Ctx, arm: Arm, T: number): void {
  const pose = armPose(arm, T)
  const s = shoulder(arm, T)
  const w = pose.grip
  const e = elbowOf(s, w, arm === 'left' ? 1 : -1)
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
  const { k, ink, weight } = c
  const L = shoulder('left', T)
  const R = shoulder('right', T)
  const mid: Pt = [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - 0.05]
  // The lines, up out of sight, fading into the dark above the light.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const q of [L, R]) {
    const g = ctx.createLinearGradient(0, (q[1] - 5) * k, 0, q[1] * k)
    g.addColorStop(0, 'rgba(183, 178, 167, 0)')
    g.addColorStop(1, 'rgba(183, 178, 167, 0.5)')
    ctx.save()
    ctx.strokeStyle = g
    ctx.lineWidth = weight * 0.8
    ctx.beginPath()
    ctx.moveTo(q[0] * k, (q[1] - 5) * k)
    ctx.lineTo(q[0] * k, q[1] * k)
    ctx.stroke()
    ctx.restore()
  }
  // The yoke: a bar across the shoulders, bowed up under the cup.
  p.noFill()
  for (const [w, col] of [[5.4, ink], [3.0, KIT.chrome]] as const) {
    p.stroke(col)
    p.strokeWeight(weight * w)
    p.bezier(L[0] * k, L[1] * k, (L[0] + 0.3) * k, (mid[1] - 0.12) * k, (R[0] - 0.3) * k, (mid[1] - 0.12) * k, R[0] * k, R[1] * k)
  }
  // The cup his head sits in: a black crescent on the yoke.
  const cup: Pt = [mid[0], mid[1] - 0.09]
  solid(p, ink, weight * 0.8, KIT.lacquer)
  p.arc(cup[0] * k, cup[1] * k, 0.42 * k, 0.26 * k, 0.05, Math.PI - 0.05, p.CHORD)
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

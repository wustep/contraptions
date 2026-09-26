import type p5 from 'p5'
import type { Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { drawStick, KICK, KIT_FLOOR, SNARE, type KitPiece } from '../drums'
import { alpha, type Ctx } from '../kit'
import { SOLO } from '../music'
import { ANDREW, HALL, HANDS, KIT } from '../worlds'
import { mixHex } from '../../../../../parts'

const HALL_BLACK = HALL.black
import { H_ACCENTS, H_FLY, H_LEAP, H_REST, H_SEATED, H_STROKES, H_UNSEAT } from './hush-score'
import { ACCENTS, CATCH, FOOT_DOWN, HOLD, LEAP, RIG_DOWN, SEATED, SLAM, STICK, STROKES, TARGETS, TOSS, UNSEAT, strokesOf, type Arm, type Grip, type Stroke } from './solo-score'

/**
 * The solo's machine, moved and drawn: a drummer's body, flown in empty on two lines from the flies over the kit, like
 * a marionette. A dark shirt with a collar where his head goes, shoulders sloping to rounded deltoids, two long arms
 * (sleeves to the elbow, skin below) with a stick in each hand, and a trouser leg that comes down from behind the
 * snare onto the kick's pedal. Andrew (the ball) is its head: he leaps up onto the collar and it plays as his body,
 * leaning about the waist into the side it plays, hunching on the accents, his head bouncing on them.
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
const ALL_ACCENTS: readonly { t: number; a: number }[] = [...ACCENTS, ...H_ACCENTS.map((x) => ({ t: x.t, a: x.a * 0.6 }))].sort((a, b) => a.t - b.t)
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
/**
 * How slumped the empty frame is, 0..1: hanging with nobody in the cup (flying in, limp after the solo, and after
 * the hush), the shoulders drop and round forward; it straightens as he lands in the cup.
 */
export function slumpOf(T: number): number {
  const fly = 1 - smoother((T - LEAP) / (SEATED - LEAP))
  const after = smoother((T - UNSEAT - 0.1) / 0.9) * (1 - smoother((T - H_LEAP) / (H_SEATED - H_LEAP)))
  const out = smoother((T - H_UNSEAT - 0.1) / 0.9)
  return Math.max(fly, after, out)
}
/** The slump's shoulders: down, and in toward the middle (rounded forward). */
export const SLUMP = { down: 0.2, inward: 0.09 }

/**
 * The lean: the whole upper body tilts about the waist (on the seat) toward the side being played, 1.2 radians a cell
 * of lean, never past 0.14; the head, the collar and the shoulders turn together, so the body leans into the playing
 * instead of the head sliding over a still chest.
 */
export const TILT = { perCell: 1.2, max: 0.14 }
export const tiltOf = (lean: number): number => Math.max(-TILT.max, Math.min(TILT.max, TILT.perCell * lean))
/** The waist he tilts about, in the kit's frame (the frame's drop added by the caller). */
export const PIVOT: Pt = [NECK[0], 0.3]
/** `q` turned `th` about the waist (positive: the top toward the house's right), with the frame `drop`ped. */
export function turnAbout(q: Pt, th: number, drop: number): Pt {
  const dx = q[0] - PIVOT[0]
  const dy = q[1] - PIVOT[1]
  const c = Math.cos(th)
  const s = Math.sin(th)
  return [PIVOT[0] + dx * c - dy * s, PIVOT[1] + dx * s + dy * c + drop]
}

/**
 * The hunch: on an accent the shoulders rise toward the head and come in, sharp, and let go over about 0.4 s, damped
 * (0 to 1; accents close together hold it up). `a` of each accent 0..1.
 */
export const HUNCH = { rise: 0.1, inward: 0.05 }
export function hunchOf(accents: readonly { t: number; a: number }[], T: number): number {
  let lo = 0
  let hi = accents.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (accents[mid].t < T - 1.5) lo = mid + 1
    else hi = mid
  }
  let sum = 0
  for (let i = lo; i < accents.length && accents[i].t <= T; i++) {
    const u = T - accents[i].t
    sum += ((0.4 + 0.6 * accents[i].a) * (1 - Math.exp(-u / 0.035)) * Math.exp(-u / 0.2)) / 0.61
  }
  return 1 - Math.exp(-1.2 * sum)
}

/** His tilt at `T`, radians, as far as he is in the cup. */
const tilt = (T: number): number => tiltOf(lean(T)) * seatedW(T)
/** His hunch at `T`: the solo's accents full, the hush's soft. */
const hunch = (T: number): number => hunchOf(ALL_ACCENTS, T) * (T > H_LEAP ? 0.5 : 1) * seatedW(T)

/** His head (the ball's centre) while he rides the frame, in the kit's frame. */
export function headAt(T: number): Pt {
  const w = seatedW(T)
  return turnAbout([NECK[0], NECK[1] + bob(T) * w], tilt(T), rigDrop(T))
}

/** A shoulder at `T`: with the bounce, the hunch, the lean about the waist, the frame's drop, and its slump when empty. */
function shoulder(arm: Arm, T: number): Pt {
  const w = seatedW(T)
  const sl = slumpOf(T)
  const h = hunch(T)
  const inward = (arm === 'left' ? 1 : -1) * (SLUMP.inward * sl + HUNCH.inward * h)
  const up: Pt = [NECK[0] + SHOULDER_AT[arm][0] + inward, NECK[1] + SHOULDER_AT[arm][1] + bob(T) * 0.35 * w + SLUMP.down * sl - HUNCH.rise * h]
  return turnAbout(up, tilt(T), rigDrop(T))
}

/** Which way each piece leans him (exported for the finale's frame). */
export { SIDE }

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

/**
 * His clothes and skin: a dark shirt warmed a little toward his yellow (his, not Fletcher's black), flat, lit only by
 * a soft rim of top light in a dim of his yellow; trousers darker; forearms and hands in skin (Fletcher's hands' tone),
 * each edged in its own shadow.
 */
export const SHIRT = mixHex('#1E1C1B', ANDREW, 0.08)
const SHIRT_EDGE = mixHex(SHIRT, '#050404', 0.55)
const SHIRT_LOW = mixHex(SHIRT, '#050404', 0.45)
/** The rim of top light on his shoulders and sleeves: a dim of his yellow. */
export const RIM = mixHex(SHIRT, ANDREW, 0.5)
const TROUSERS = mixHex('#121110', ANDREW, 0.03)
const TROUSERS_EDGE = mixHex(TROUSERS, '#000000', 0.5)
const SHOE = '#0A0908'
const SKIN = HANDS
const SKIN_ARM = mixHex(HANDS, SHIRT, 0.16)
const SKIN_SHADE = mixHex(HANDS, '#3B2B20', 0.58)
const SKIN_LIT = mixHex(HANDS, HALL.beam, 0.4)

/** His waist on the seat (behind the snare), in the kit's frame, and half its width. */
export const WAIST = { y: PIVOT[1], half: 0.28 }

const css = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

type Bez = [Pt, Pt, Pt]
/**
 * One side of his torso from the collar (s = 1 the house's right), in the torso's own upright frame: the collar under
 * his head, the shoulder sloping down and out to the round deltoid over the arm's joint, round it to the armpit, and
 * down the side, narrowing, to the waist. `S` the shoulder joint, `H` his head.
 */
function side(S: Pt, H: Pt, s: 1 | -1): { from: Pt; segs: Bez[]; rim: number } {
  const C: Pt = [H[0] + s * 0.11, H[1] + 0.03]
  const Dt: Pt = [S[0] - s * 0.08, S[1] - 0.06]
  const Do: Pt = [S[0] + s * 0.15, S[1] + 0.08]
  const A: Pt = [S[0] - s * 0.1, S[1] + 0.4]
  const W: Pt = [s * WAIST.half, 0.02]
  return {
    from: C,
    segs: [
      [[C[0] + s * 0.14, C[1] + 0.02], [Dt[0] - s * 0.26, Dt[1] - 0.01], Dt],
      [[S[0] + s * 0.07, S[1] - 0.08], [S[0] + s * 0.15, S[1] - 0.02], Do],
      [[S[0] + s * 0.16, S[1] + 0.2], [S[0] + s * 0.03, S[1] + 0.36], A],
      [[A[0] - s * 0.03, A[1] + 0.75], [s * (WAIST.half + 0.06), -0.8], W],
    ],
    // The rim runs over the first two: the slope of the shoulder and the top of the deltoid.
    rim: 2,
  }
}

/**
 * His torso, behind the drums (`hall.ts` draws it before the kit): a dark shirt from the collar under his head, the
 * shoulders sloping to round deltoids over the arms' joints, the chest narrowing to his waist on the seat, the seat's
 * black cushion under him; flat cloth sinking into shadow toward the waist, and a soft rim of top light along the
 * shoulders. All turned `tilt` about the waist. `L`, `R` the shoulder joints and `H` his head, in the kit's frame (as
 * drawn, tilted); `drop` the frame's height; `slump` how empty it hangs (the rim dims).
 */
export function drawTorso(p: p5, c: Ctx, L: Pt, R: Pt, H: Pt, drop: number, slump: number, tilt: number): void {
  const { k, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const P: Pt = [PIVOT[0], PIVOT[1] + drop]
  // Into the torso's own upright frame (about the waist).
  const cs = Math.cos(-tilt)
  const sn = Math.sin(-tilt)
  const local = (q: Pt): Pt => [(q[0] - P[0]) * cs - (q[1] - P[1]) * sn, (q[0] - P[0]) * sn + (q[1] - P[1]) * cs]
  const l = local(L)
  const r = local(R)
  const h = local(H)
  // The seat: a black cushion under him, on the throne's post (upright, not tilted).
  p.noStroke()
  p.fill(HALL_BLACK)
  p.rect((P[0] - 0.62) * k, (P[1] - 0.03) * k, 1.24 * k, 0.2 * k, 0.09 * k)
  p.fill(mixHex(HALL_BLACK, KIT.chrome, 0.2))
  p.rect((P[0] - 0.05) * k, (P[1] + 0.15) * k, 0.1 * k, 0.9 * k)
  const right = side(r, h, 1)
  const left = side(l, h, -1)
  ctx.save()
  ctx.translate(P[0] * k, P[1] * k)
  ctx.rotate(tilt)
  const K = (q: Pt): [number, number] => [q[0] * k, q[1] * k]
  const outline = (): void => {
    ctx.beginPath()
    ctx.moveTo(...K(left.from))
    // Under his head: the collar.
    ctx.quadraticCurveTo(...K([h[0], h[1] + 0.17]), ...K(right.from))
    for (const [a, b, q] of right.segs) ctx.bezierCurveTo(...K(a), ...K(b), ...K(q))
    // Up the other side, the same curves backward.
    const back: Pt[] = [left.from, ...left.segs.map((g) => g[2])]
    for (let i = left.segs.length - 1; i >= 0; i--) {
      const [a, b] = left.segs[i]
      if (i === left.segs.length - 1) ctx.lineTo(...K(back[i + 1]))
      ctx.bezierCurveTo(...K(b), ...K(a), ...K(back[i]))
    }
    ctx.closePath()
  }
  outline()
  // Flat cloth, sinking into shadow toward the waist (behind the drums).
  const g = ctx.createLinearGradient(0, (Math.min(l[1], r[1]) + 0.5) * k, 0, 0)
  g.addColorStop(0, SHIRT)
  g.addColorStop(1, SHIRT_LOW)
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = weight * 0.8
  ctx.strokeStyle = SHIRT_EDGE
  ctx.stroke()
  // The rim of top light along both shoulders: a soft wide glow of it and a finer line.
  const rim = (w: number, a: number): void => {
    for (const sd of [left, right]) {
      ctx.beginPath()
      ctx.moveTo(...K([sd.from[0] + (sd === left ? 0.02 : -0.02), sd.from[1] + 0.012]))
      for (let i = 0; i < sd.rim; i++) {
        const [a1, b1, q] = sd.segs[i]
        ctx.bezierCurveTo(...K([a1[0], a1[1] + 0.012]), ...K([b1[0], b1[1] + 0.012]), ...K([q[0], q[1] + 0.012]))
      }
      ctx.lineCap = 'round'
      ctx.lineWidth = weight * w
      ctx.strokeStyle = css(RIM, a)
      ctx.stroke()
    }
  }
  const lit = 1 - 0.5 * slump
  rim(3.0, 0.18 * lit)
  rim(1.1, 0.62 * lit)
  ctx.restore()
}

/**
 * A tapered length with round ends, from `a` (`w0` across) to `b` (`w1`): a sleeve, a forearm, a trouser leg. Filled
 * `fill`, edged `edge`; `lit` along its upper side and `shade` along its lower, each a line a little in from the edge.
 */
function taper(p: p5, c: Ctx, a: Pt, b: Pt, w0: number, w1: number, fill: string, edge: string, lit: [string, number] | null, shade: [string, number] | null): void {
  const { k, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
  const pa = ang - Math.PI / 2
  const n: Pt = [Math.cos(pa), Math.sin(pa)]
  ctx.save()
  ctx.beginPath()
  ctx.moveTo((a[0] + (n[0] * w0) / 2) * k, (a[1] + (n[1] * w0) / 2) * k)
  ctx.lineTo((b[0] + (n[0] * w1) / 2) * k, (b[1] + (n[1] * w1) / 2) * k)
  ctx.arc(b[0] * k, b[1] * k, (w1 / 2) * k, pa, pa + Math.PI, false)
  ctx.lineTo((a[0] - (n[0] * w0) / 2) * k, (a[1] - (n[1] * w0) / 2) * k)
  ctx.arc(a[0] * k, a[1] * k, (w0 / 2) * k, pa + Math.PI, pa + 2 * Math.PI, false)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = weight * 0.75
  ctx.strokeStyle = edge
  ctx.stroke()
  // Which side faces up (the stage's light is above).
  const up = n[1] <= 0 ? 1 : -1
  const line = (col: [string, number], sgn: number, w: number): void => {
    const o0 = (w0 / 2 - 0.035) * sgn
    const o1 = (w1 / 2 - 0.03) * sgn
    ctx.beginPath()
    ctx.moveTo((a[0] + n[0] * o0) * k, (a[1] + n[1] * o0) * k)
    ctx.lineTo((b[0] + n[0] * o1) * k, (b[1] + n[1] * o1) * k)
    ctx.lineCap = 'round'
    ctx.lineWidth = weight * w
    ctx.strokeStyle = css(col[0], col[1])
    ctx.stroke()
  }
  if (lit) line(lit, up, 1.1)
  if (shade) line(shade, -up, 1.4)
  ctx.restore()
}

/** The upper arm: a sleeve of his shirt from the shoulder to the elbow, tapered, the elbow a round bend in the cloth. */
export function sleeve(p: p5, c: Ctx, s: Pt, e: Pt): void {
  taper(p, c, s, e, 0.24, 0.2, SHIRT, SHIRT_EDGE, [RIM, 0.55], null)
}

/** The forearm, in skin, from inside the sleeve's cuff to the wrist: tapered, lit along its top, its underside in shadow. */
export function forearm(p: p5, c: Ctx, e: Pt, w: Pt): void {
  taper(p, c, e, w, 0.155, 0.115, SKIN_ARM, SKIN_SHADE, [SKIN_LIT, 0.45], [SKIN_SHADE, 0.75])
}

/**
 * A hand round the stick at `at` (the stick at `ang`): skin, the fingers wrapped under it and the knuckles over it,
 * lit along the knuckles, the lower edge in shadow, the thumb laid along the stick toward its tip. Drawn over the
 * stick. Smaller and open while the stick is in the air.
 */
export function hand(p: p5, c: Ctx, at: Pt, ang: number, holding = true): void {
  const { k, weight } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(at[0] * k, at[1] * k)
  ctx.rotate(ang)
  // The stick's upper side on the screen, in the hand's frame.
  const up = Math.cos(ang) >= 0 ? -1 : 1
  const L = holding ? 0.2 : 0.15
  const W = holding ? 0.15 : 0.12
  ctx.beginPath()
  ctx.roundRect((-L / 2) * k, (-W / 2 + up * 0.012) * k, L * k, W * k, 0.06 * k)
  ctx.fillStyle = SKIN
  ctx.fill()
  ctx.lineWidth = weight * 0.7
  ctx.strokeStyle = SKIN_SHADE
  ctx.stroke()
  if (holding) {
    // The fingers' creases across the back of the hand, and the knuckles' ridge over the stick, lit.
    ctx.lineCap = 'round'
    ctx.strokeStyle = css(SKIN_SHADE, 0.55)
    ctx.lineWidth = weight * 0.6
    for (const x of [-0.04, 0.0, 0.04]) {
      ctx.beginPath()
      ctx.moveTo(x * k, up * 0.012 * k)
      ctx.lineTo(x * k, up * 0.06 * k)
      ctx.stroke()
    }
    ctx.strokeStyle = css(SKIN_LIT, 0.8)
    ctx.lineWidth = weight * 1.0
    ctx.beginPath()
    ctx.moveTo(-0.07 * k, up * 0.058 * k)
    ctx.lineTo(0.06 * k, up * 0.058 * k)
    ctx.stroke()
    // The thumb, along the stick toward its tip.
    ctx.beginPath()
    ctx.ellipse(0.1 * k, -up * 0.012 * k, 0.05 * k, 0.03 * k, 0, 0, Math.PI * 2)
    ctx.fillStyle = SKIN
    ctx.fill()
    ctx.lineWidth = weight * 0.6
    ctx.strokeStyle = SKIN_SHADE
    ctx.stroke()
  }
  // The heel of the hand, underneath, in shadow.
  ctx.strokeStyle = css(SKIN_SHADE, 0.8)
  ctx.lineWidth = weight * 1.2
  ctx.beginPath()
  ctx.moveTo((-L / 2 + 0.04) * k, (-up * (W / 2 - 0.03) + up * 0.012) * k)
  ctx.lineTo((L / 2 - 0.05) * k, (-up * (W / 2 - 0.03) + up * 0.012) * k)
  ctx.stroke()
  ctx.restore()
}

/**
 * An arm: the forearm, the sleeve over its top (the elbow a round bend of cloth), the stick, and the hand round it.
 * `stick` draws the stick (and any blur of it) between the arm and the hand.
 */
export function drawBodyArm(p: p5, c: Ctx, s: Pt, e: Pt, w: Pt, ang: number, holding: boolean, stick: () => void): void {
  forearm(p, c, e, w)
  // The sleeve's round top sits a little under the joint, so the shoulder's slope runs over it into the arm.
  const d = Math.hypot(e[0] - s[0], e[1] - s[1]) || 1
  sleeve(p, c, [s[0] + ((e[0] - s[0]) / d) * 0.03, s[1] + 0.035 + ((e[1] - s[1]) / d) * 0.03], e)
  stick()
  hand(p, c, w, ang, holding)
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
/** The arms' widths, in cells: tapered limbs, round joints. */
export const ARM_W = { upper: [0.26, 0.21], fore: [0.2, 0.15], elbow: 0.22, shoulder: 0.3 } as const
const rightBend = (T: number): number => -1 + 2 * smoother((T - RIGHT_UNDER[0]) / (RIGHT_UNDER[1] - RIGHT_UNDER[0]))

function drawArm(p: p5, c: Ctx, arm: Arm, T: number): void {
  const pose = armPose(arm, T)
  const s = shoulder(arm, T)
  const w = pose.grip
  const e = arm === 'left' ? elbowOf(s, w, 1) : elbowSwing(s, w, rightBend(T))
  drawBodyArm(p, c, s, e, w, pose.ang, pose.holding, () => {
    if (!pose.holding) return
    const butt: Pt = [w[0] - Math.cos(pose.ang) * HOLD, w[1] - Math.sin(pose.ang) * HOLD]
    drawStick(p, c, butt, pose.ang, STICK)
  })
}

/** The two lines up into the flies, only while it flies in and out (hanging still, they read as a coat hanger). */
export function drawLines(p: p5, c: Ctx, L: Pt, R: Pt, drop: number): void {
  const { k, weight } = c
  const a = 0.5 * Math.min(1, Math.abs(drop) / 0.6)
  if (a < 0.005) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (const q of [L, R]) {
    const g = ctx.createLinearGradient(0, (q[1] - 5) * k, 0, q[1] * k)
    g.addColorStop(0, 'rgba(183, 178, 167, 0)')
    g.addColorStop(1, `rgba(183, 178, 167, ${a.toFixed(3)})`)
    ctx.save()
    ctx.strokeStyle = g
    ctx.lineWidth = weight * 0.8
    ctx.beginPath()
    ctx.moveTo(q[0] * k, (q[1] - 5) * k)
    ctx.lineTo(q[0] * k, q[1] * k)
    ctx.stroke()
    ctx.restore()
  }
}

function drawFoot(p: p5, c: Ctx, T: number): void {
  const down = footDown(T)
  if (down <= 0.001) return
  const { k } = c
  // The footboard, as the kit draws it: its heel pinned at the kick's foot, turned down as it is pressed.
  const heel: Pt = [KICK.x + 0.55, KIT_FLOOR - 0.02]
  const tilt = -0.22 + 0.16 * pedalPress(T)
  const along = (d: number, up: number): Pt => [heel[0] + Math.cos(tilt) * d + Math.sin(tilt) * up, heel[1] + Math.sin(tilt) * d - Math.cos(tilt) * up]
  const lift = footLift(T) + (1 - down) * 1.6
  // The shoe on the board's toe: its sole along the board, lifted between kicks.
  const sole0 = along(0.25, 0.045 + lift)
  const sole1 = along(0.52, 0.045 + lift)
  const top1 = along(0.47, 0.15 + lift)
  const top0 = along(0.31, 0.25 + lift)
  const ankle = along(0.41, 0.21 + lift)
  // The leg, up from the ankle to behind the snare's shell, where it goes out of sight.
  const hidden = SNARE.top + SNARE.depth + SNARE.w * 0.11 * 0.8
  const top: Pt = [ankle[0] + 0.07, hidden]
  if (ankle[1] <= top[1] + 0.02) return
  // Everything above the snare's shell is behind it: the foot comes down out of it and goes back up into it.
  p.push()
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.beginPath()
  ctx.rect((top[0] - 1) * k, hidden * k, 2 * k, 3 * k)
  ctx.clip()
  drawShin(p, c, [top[0], hidden], ankle, [sole0, sole1, top1, top0])
  p.pop()
}

/**
 * The shin and the shoe, below the snare: a trouser leg from the knee just under the snare's shell (the thigh goes up
 * behind it to the seat) down to the ankle, and the shoe on the footboard, its toe catching the light.
 */
export function drawShin(p: p5, c: Ctx, top: Pt, ankle: Pt, boot: [Pt, Pt, Pt, Pt]): void {
  const { k, weight } = c
  taper(p, c, [top[0], top[1] - 0.2], [ankle[0], ankle[1] - 0.03], 0.22, 0.16, TROUSERS, TROUSERS_EDGE, [RIM, 0.3], null)
  solid(p, mixHex(SHOE, '#000000', 0.5), weight * 0.8, SHOE)
  p.quad(boot[0][0] * k, boot[0][1] * k, boot[1][0] * k, boot[1][1] * k, boot[2][0] * k, boot[2][1] * k, boot[3][0] * k, boot[3][1] * k)
  // The toe, lit.
  p.stroke(alpha(p, HALL.beam, 0.28))
  p.strokeWeight(weight * 0.9)
  p.line(boot[3][0] * k, boot[3][1] * k, boot[2][0] * k, boot[2][1] * k)
}

/**
 * The drummer's body (torso, collar, seat): drawn by the hall BEHIND the kit (`hall.ts`, just before `drawKit`), in
 * the kit's frame, so the rack tom, the snare and the kick sit in front of it. The arms, the leg and the fly lines stay
 * in `drawRig`, in front.
 */
export function drawDrummerBody(p: p5, c: Ctx, T: number): void {
  if (rigOut(T)) return
  p.push()
  p.rectMode(p.CORNER)
  drawTorso(p, c, shoulder('left', T), shoulder('right', T), headAt(T), rigDrop(T), slumpOf(T), tilt(T))
  p.pop()
}

/** The whole machine at `T`, in the kit's frame. */
export function drawRig(p: p5, c: Ctx, T: number): void {
  if (rigOut(T)) return
  p.push()
  p.rectMode(p.CORNER)
  drawFoot(p, c, T)
  drawLines(p, c, shoulder('left', T), shoulder('right', T), rigDrop(T))
  drawArm(p, c, 'left', T)
  drawArm(p, c, 'right', T)
  const flying = tossedStick(T)
  if (flying) {
    const butt: Pt = [flying.mid[0] - (Math.cos(flying.ang) * STICK) / 2, flying.mid[1] - (Math.sin(flying.ang) * STICK) / 2]
    drawStick(p, c, butt, flying.ang, STICK)
  }
  p.pop()
}

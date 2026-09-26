import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInOutSine } from '../../../../../../../../src/core/ease'
import { CRASH, FLOOR_TOM, KICK, RACK, RIDE as RIDE_CYMBAL, SNARE, drawKit, headDip, type Cymbal, type Drum } from '../drums'
import { alpha, smooth, type Ctx } from '../kit'
import { BURST, RIDE, level } from '../music'
import { G_EARTH } from '../physics'
import { HALL, KIT } from '../worlds'
import { hallLight, kitLight, kitSince } from './hall'
import { FLOOR, KIT_AT } from './stage'
import { BOARD } from './rubato-hits'

/**
 * The metronome whose weight is Andrew: the rubato's machine, in the Carnegie frame (`stage.ts`). Its geometry, its
 * clock (all pure functions of show time, which the lane and the drawing both read, so he never slides off it), and
 * its drawing.
 *
 * A metronome with its works in the open, in walnut and gilt, rises out of the stage behind the kit: a tall pyramid
 * case, and on its crown, above both cymbals, the pivot. From the pivot the rod runs both ways, as a real
 * metronome's does: the short arm up, with the sliding weight (Andrew, in a gilt cradle); the long arm down, with its
 * brass bob, swinging in front of the case. The long arm is what strikes: its tip meets the ride's rim at the left of
 * its swing (tick) and its side the crash's rim at the right (tock), and the pivot is placed so the two angles are
 * the same. The phase comes from the measured strokes (`RIDE`): a monotone cubic through them, so the rod reaches a
 * stop exactly on each. His place on the rod comes from the tempo, as a real metronome's weight does (up the rod is
 * slower; fast, he sits down on the pivot): the farther the rod swings in a moment, the nearer the pivot he rides, so
 * he himself never moves faster than a slow roll however fast it ticks. How hard the rod meets each stop follows
 * the music: soft and slow, it arrives nearly at rest (a kiss); fast and loud, it strikes at speed and rebounds.
 *
 * Until he boards, the rod is parked leaning (a metronome switched off); his landing tips it over into the first tick. After the last stroke
 * the swing collapses into a shimmer too fast to count (the roll), growing with the swell; before the burst the rod
 * leans back with him and tosses him onto the snare; left without its weight, the bob rings it down to upright, and
 * it sinks back into the stage.
 */

const [KX, KY] = KIT_AT

/* ------------------------------------------------------------------ the hall's cymbals, as drawn */

/** The lens's top at `lx` along a cymbal from its bell (negative is up), as `drums.ts` draws it. */
const lensTop = (cym: Cymbal, lx: number): number => -0.085 * 0.9 * Math.sin(Math.PI * clamp(lx / cym.w + 0.5))

/** A point of a cymbal of the hall's kit, at local (`lx`, `ly`) from its bell, when it is swung by `swing`. */
function onCymbal(cym: Cymbal, lx: number, ly: number, swing = 0): Pt {
  const a = cym.tilt + swing
  return [KX + cym.x + lx * Math.cos(a) - ly * Math.sin(a), KY + cym.y + lx * Math.sin(a) + ly * Math.cos(a)]
}

/** Where the ball's centre is when he rests on a cymbal at `lx` from its bell, the cymbal swung by `swing`. */
export function seatOnCymbal(cym: Cymbal, lx: number, swing = 0): Pt {
  const a = cym.tilt + swing
  const [sx, sy] = onCymbal(cym, lx, lensTop(cym, lx), swing)
  return [sx + R * Math.sin(a), sy - R * Math.cos(a)]
}

/** Where the ball's centre is when he rests on a drum's head `dx` from its middle, the head dipping under him when struck. */
export function seatOnDrum(d: Drum, depth: number, since: number, dx = 0): Pt {
  const cx = (2 * dx) / d.w
  return [KX + d.x + dx, KY + d.top - R + 0.8 * (1 - cx * cx) * headDip(since, depth)]
}

/* ------------------------------------------------------------------ geometry */

/** The rod's width: what meets the rims. */
const ROD_W = 0.07
/** The pivot's height: on the case's crown, above both cymbals. Its x is solved so the two stops are the same angle. */
export const PIVOT_Y = KY - 3.05
/** The rims the long arm meets: the ride's right rim (tick) and the crash's left rim (tock). */
const RIDE_RIM = onCymbal(RIDE_CYMBAL, RIDE_CYMBAL.w / 2, 0)
const CRASH_RIM = onCymbal(CRASH, -CRASH.w / 2, 0)
/**
 * The rod's angle (its short arm's, from upright, positive to the right) at which the long arm's side meets a rim
 * below the pivot at `px`: `side` 1 for a rim to the right (the arm's right side meets it), -1 to the left.
 */
function stopAngle(px: number, rim: Pt, side: -1 | 1): number {
  const dx = rim[0] - px
  const dy = rim[1] - PIVOT_Y
  return -(Math.atan2(dx, dy) - side * Math.asin(ROD_W / 2 / Math.hypot(dx, dy)))
}
/** The pivot's x: the one from which the ride and the crash stop the rod at the same angle either side. */
export const PIVOT_X = (() => {
  let lo = KX - 3
  let hi = KX + 1
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (stopAngle(mid, RIDE_RIM, -1) + stopAngle(mid, CRASH_RIM, 1) > 0) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
})()
/** How far the rod swings either side of upright: the long arm to the ride's rim (short arm right), and to the crash's. */
export const SWING = stopAngle(PIVOT_X, RIDE_RIM, -1)
/** The long arm: to just past where its tip meets the ride. How far down it the crash's rim meets its side. */
const RIDE_REACH = Math.hypot(RIDE_RIM[0] - PIVOT_X, RIDE_RIM[1] - PIVOT_Y)
export const CRASH_REACH = Math.hypot(CRASH_RIM[0] - PIVOT_X, CRASH_RIM[1] - PIVOT_Y)
const ROD_LOW = RIDE_REACH + 0.04
/** The bob on the long arm, from and to (clear of the crash's rim). */
const BOB: [number, number] = [0.62, Math.min(1.08, CRASH_REACH - 0.14)]

/**
 * Andrew's range on the short arm, from the pivot: sat down on the pivot's cradle (fastest) to high (slowest); where he
 * rides out the roll; and the fastest he is ever carried, cells a second (the house trail beads above about five).
 */
export const R_MIN = 0.4
export const R_MAX = 1.42
export const R_LOW = R_MIN
const V_CAP = 4.2
/** The short arm: above his highest place, its fine tip. (`ROD_LEN` is its length, as the part reads it.) */
const ROD_UP = R_MAX + 0.42
export const ROD_LEN = ROD_UP

/** The case: a tall pyramid in walnut, on the floor, its crown just under the pivot. */
const CASE_TOP = PIVOT_Y + 0.07
const CASE_HALF_TOP = 0.24
const CASE_HALF_BASE = 1.0
const caseHalf = (y: number): number => CASE_HALF_TOP + ((CASE_HALF_BASE - CASE_HALF_TOP) * (y - CASE_TOP)) / (FLOOR - CASE_TOP)

/** How far below its place it starts (and ends): all of it under the stage. */
const DROP = FLOOR - (PIVOT_Y - ROD_UP - 0.1) + 0.4

/* ------------------------------------------------------------------ the clock */

/** It rises out of the stage behind the kit through the wind-up, and sinks back after the burst. */
const RISE: [number, number] = [424.0, 428.6]
const SINK: [number, number] = [505.7, 509.5]
/** The last stroke of the rubato. */
const N = RIDE.length
export const RIDE_END = RIDE[N - 1]
/**
 * The cock: the shimmer gone, the whole machine crouches (sinks a little into the stage) as the rod leans back with
 * him, slow, so the toss is anticipated; then it swings forward and lets him go onto the snare on the burst. The
 * crouch is what lets him clear the crash's rim: from the pivot's full height, any throw onto the snare grazes it.
 */
export const COCK = 502.4
const BACK_AT = 502.95
const THETA_BACK = -0.62
const CROUCH = 1.1
const T_FLY = 0.65
export const RELEASE = BURST - T_FLY
/** Through the roll he settles to the bottom of his range (his fastest place), just clear of the pivot. */
const DESCEND: [number, number] = [RIDE_END + 0.8, COCK - 0.7]

/** How far below its place the whole metronome is at `T` (cells). */
export function lift(T: number): number {
  if (T <= RISE[0] || T >= SINK[1]) return DROP
  if (T < RISE[1]) return DROP * (1 - easeInOutSine((T - RISE[0]) / (RISE[1] - RISE[0])))
  if (T <= COCK) return 0
  if (T <= BACK_AT) return CROUCH * easeInOutSine((T - COCK) / (BACK_AT - COCK))
  if (T <= SINK[0]) return CROUCH
  return CROUCH + (DROP - CROUCH) * easeInOutSine((T - SINK[0]) / (SINK[1] - SINK[0]))
}

// The strokes' gaps, and the monotone cubic through (stroke time, stroke number): the rod's phase.
const GAP = RIDE.slice(1).map((t, i) => t - RIDE[i])
const SLOPE = (() => {
  const d = GAP.map((g) => 1 / g)
  const m = new Array<number>(N)
  m[0] = d[0]
  m[N - 1] = d[N - 2]
  for (let i = 1; i < N - 1; i++) {
    const w1 = 2 * GAP[i] + GAP[i - 1]
    const w2 = GAP[i] + 2 * GAP[i - 1]
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return m
})()
/** The rod's phase at `T` in strokes: an integer on each stroke, monotone between (RIDE[0] ≤ T ≤ RIDE_END). */
function phase(T: number): number {
  let lo = 0
  let hi = N - 2
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (RIDE[mid] <= T) lo = mid
    else hi = mid - 1
  }
  const h = GAP[lo]
  const u = clamp((T - RIDE[lo]) / h)
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * lo + (u3 - 2 * u2 + u) * h * SLOPE[lo] + (-2 * u3 + 3 * u2) * (lo + 1) + (u3 - u2) * h * SLOPE[lo + 1]
}

/**
 * One half-swing, stop to stop, `u` 0..1 → -1..1: a pendulum's arc cut off at the stops. `a` near 1 is the whole
 * half of a free swing (it reaches each stop nearly at rest); smaller, the stops cut in sooner and it meets them at
 * speed.
 */
const half = (u: number, a: number): number => Math.sin(a * Math.PI * (u - 0.5)) / Math.sin((a * Math.PI) / 2)

/** How freely each half-swing runs into the stroke that ends it: soft and slow, a kiss; fast and loud, a strike. */
const FREE = RIDE.map((t, j) => {
  const h = j > 0 ? GAP[j - 1] : 2 * (RIDE[0] - BOARD)
  return clamp(0.46 + 0.5 * smooth(h, 0.16, 0.6) - 0.22 * level(t), 0.45, 0.96)
})

/** Parked, until he boards: the rod leaning toward him on the crash (the short arm right), a metronome switched off. */
const PARK = 0.22

/**
 * The rod through the rubato: parked; his weight landing on it tips it on over into the first tick on the ride; then
 * stop to stop on every stroke (the short arm right, the long arm on the ride, on the even strokes).
 */
function tickTock(T: number): number {
  if (T <= BOARD) return PARK
  if (T <= RIDE[0]) return PARK + (SWING - PARK) * (1 - Math.cos((Math.PI / 2) * ((T - BOARD) / (RIDE[0] - BOARD))))
  const f = phase(T)
  const i = Math.min(N - 2, Math.floor(f))
  return (i % 2 === 0 ? -1 : 1) * SWING * half(f - i, FREE[i + 1])
}

/**
 * How fast the rod turns around `T` (radians a second): the peak of every swing near it, held over a quarter second
 * either side and then smoothed, so that it leads each quickening and trails each slowing. What sets his place.
 */
const TURN = (() => {
  const step = 0.02
  const sub = 8
  const bins: number[] = []
  for (let t = BOARD; t <= RIDE_END + step; t += step) {
    let m = 0
    for (let j = 0; j < sub; j++) {
      const a = t + (j * step) / sub
      const b = a + step / sub
      m = Math.max(m, Math.abs(tickTock(Math.min(b, RIDE_END)) - tickTock(Math.min(a, RIDE_END))) / (step / sub))
    }
    bins.push(m)
  }
  const HOLD = 13
  const env = bins.map((_, i) => Math.max(...bins.slice(Math.max(0, i - HOLD), i + HOLD + 1)))
  const SIGMA = 12
  const w = env.map((_, i) => {
    let s = 0
    let n = 0
    for (let j = Math.max(0, i - 3 * SIGMA); j <= Math.min(env.length - 1, i + 3 * SIGMA); j++) {
      const d = (j - i) / SIGMA
      const g = Math.exp((-d * d) / 2)
      s += g * env[j]
      n += g
    }
    // Never below the held peak by much: the smoothing may only round its corners.
    return Math.max(s / n, 0.92 * env[i])
  })
  return { step, w }
})()
/**
 * His place on the rod while it keeps the rubato: as near the pivot as keeps him under V_CAP, from R_MIN to R_MAX.
 * Before the first stroke (the empty weight, and the tip over into it) it is where the first strokes want him.
 */
function rRide(T: number): number {
  const x = (clamp(T, RIDE[0], RIDE_END) - BOARD) / TURN.step
  const i = Math.min(TURN.w.length - 2, Math.floor(x))
  const w = TURN.w[i] + (TURN.w[i + 1] - TURN.w[i]) * (x - i)
  return clamp(V_CAP / Math.max(w, 1e-3), R_MIN, R_MAX)
}

// The roll: the half-period falls from the last stroke's to a shimmer's, and the swing dies from the stops to a
// tremble that grows with the swell. It never reaches a stop again, so it turns smoothly (a cosine): no bounce in
// mid-air.
const H_END = GAP[N - 2]
const H_SHIMMER = 0.042
const TAU_H = 0.5
const TAU_A = 0.2
const SHIMMER = 0.03
/** The phase through the roll, in half-swings, from the last stroke: the integral of 1 / half-period. */
const rollPhase = (D: number): number => (D + TAU_H * Math.log((H_SHIMMER + (H_END - H_SHIMMER) * Math.exp(-D / TAU_H)) / H_END)) / H_SHIMMER
/** The tremble's size at `T`, radians: growing through the swell, and gone before the cock. */
const tremble = (T: number): number => SHIMMER * (0.35 + 0.65 * smooth(T, RIDE_END + 1, COCK - 0.8) + 0.6 * level(T)) * (1 - smooth(T, COCK - 0.5, COCK))
/** The size of the swing through the roll, radians. */
export function rollSize(T: number): number {
  const e = Math.exp(-(T - RIDE_END) / TAU_A)
  return SWING * e + tremble(T) * (1 - e)
}
const roll = (T: number): number => -rollSize(T) * Math.cos(Math.PI * rollPhase(T - RIDE_END))

/** A cubic from (t0, x0, slope v0) to (t1, x1, slope v1). */
function hermite(t: number, t0: number, x0: number, v0: number, t1: number, x1: number, v1: number): number {
  const h = t1 - t0
  const u = clamp((t - t0) / h)
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * x0 + (u3 - 2 * u2 + u) * h * v0 + (-2 * u3 + 3 * u2) * x1 + (u3 - u2) * h * v1
}

/** Where he is on the rod at angle `th` and distance `r` from the pivot. */
const onRod = (th: number, r: number, dy = 0): Pt => [PIVOT_X + r * Math.sin(th), PIVOT_Y + dy - r * Math.cos(th)]

/** The snare's head, where he lands on the burst. */
export const LANDING: Pt = [KX, KY]
/**
 * The toss: the angle at which the rod lets him go, so that he flies free (the rod's own speed at his place, then
 * gravity) onto the snare at the burst; and the rod's speed then.
 */
export const { THETA_REL, OMEGA_REL } = (() => {
  const need = (th: number): Pt => {
    const [x, y] = onRod(th, R_LOW, CROUCH)
    return [(LANDING[0] - x) / T_FLY, (LANDING[1] - y) / T_FLY - (G_EARTH * T_FLY) / 2]
  }
  let lo = -1.2
  let hi = 0.8
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const [vx, vy] = need(mid)
    if (Math.atan2(vy, vx) - mid > 0) lo = mid
    else hi = mid
  }
  const th = (lo + hi) / 2
  const [vx, vy] = need(th)
  return { THETA_REL: th, OMEGA_REL: Math.hypot(vx, vy) / R_LOW }
})()

/** Left without its weight, the bob rings it down fast to upright. */
const W_FREE = 2 * Math.PI * 2.4
const TAU_FREE = 0.7
function free(T: number): number {
  const t = T - RELEASE
  const e = Math.exp(-t / TAU_FREE)
  return e * (THETA_REL * Math.cos(W_FREE * t) + ((OMEGA_REL + THETA_REL / TAU_FREE) / W_FREE) * Math.sin(W_FREE * t))
}

/** The rod's angle from upright at `T` (radians, positive to the right). */
export function rodAt(T: number): number {
  if (T <= RIDE_END) return tickTock(T)
  if (T <= COCK) return roll(T)
  if (T <= BACK_AT) return hermite(T, COCK, roll(COCK), 0, BACK_AT, THETA_BACK, 0)
  if (T <= RELEASE) return hermite(T, BACK_AT, THETA_BACK, 0, RELEASE, THETA_REL, OMEGA_REL)
  return free(T)
}

/** How far up the rod the weight is at `T` (with him on it from BOARD to RELEASE). */
export function weightAt(T: number): number {
  if (T <= RIDE_END) return rRide(T)
  const r1 = rRide(RIDE_END)
  return r1 + (R_LOW - r1) * easeInOutSine(clamp((T - DESCEND[0]) / (DESCEND[1] - DESCEND[0])))
}

/** Andrew on the weight at `T`, in the part's frame. */
export const riding = (T: number): Pt => onRod(rodAt(T), weightAt(T), lift(T))

/* ------------------------------------------------------------------ drawing */

type Poly = Pt[]

/** The case's outline at `dy` below its place, cut at the stage floor (empty when all of it is under the stage). */
function caseOutline(dy: number): Poly {
  const top = CASE_TOP + dy
  if (top >= FLOOR) return []
  const low = FLOOR - dy
  return [
    [PIVOT_X - CASE_HALF_TOP, top],
    [PIVOT_X + CASE_HALF_TOP, top],
    [PIVOT_X + caseHalf(low), FLOOR],
    [PIVOT_X - caseHalf(low), FLOOR],
  ]
}

/** Walnut; the window in its face a shade deeper. */
const WOOD = mixHex(HALL.floor, HALL.black, 0.3)
const WINDOW = mixHex(HALL.floor, HALL.black, 0.62)
/** The fittings' gilt, a touch lifted: they stand in front of the case, outside the relit part, so the hall's light is in it already. */
const GILT = mixHex(HALL.gilt, HALL.beam, 0.15)
/** The bob's brass: the gilt, darker, so it never outshines the weight above. */
const BRASS = mixHex(HALL.gilt, HALL.black, 0.28)
/** Where the winding key stands out of the case's right side, and how far it has been turned at `T`. */
const KEY_Y = CASE_TOP + 1.3
function keyTurn(T: number): number {
  const wound = 3 * Math.PI * easeInOutSine(clamp((T - RISE[0] - 0.4) / (RISE[1] - RISE[0])))
  return wound - 0.04 * Math.max(0, T - BOARD)
}

function path(ctx: CanvasRenderingContext2D, k: number, poly: Poly): void {
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
  ctx.closePath()
}

/** The drums that stand in front of the case (their silhouettes, a hair generous): what the rod passes behind. */
function drumHoles(ctx: CanvasRenderingContext2D, k: number): void {
  const box = (d: Drum, m = 0.03) => {
    const eh = d.w * 0.11
    ctx.rect((KX + d.x - d.w / 2 - m) * k, (KY + d.top - eh - m) * k, (d.w + 2 * m) * k, (d.depth + 2 * eh + 2 * m) * k)
  }
  // One clip each: their intersection leaves every hole out, however they overlap.
  const kick = () => {
    const r = KICK.r + 0.08
    ctx.moveTo((KX + KICK.x + r) * k, (KY + KICK.cy) * k)
    ctx.arc((KX + KICK.x) * k, (KY + KICK.cy) * k, r * k, 0, Math.PI * 2)
  }
  for (const hole of [() => box(RACK), () => box(SNARE), () => box(FLOOR_TOM), kick]) {
    ctx.beginPath()
    ctx.rect(-60 * k, -60 * k, 120 * k, (FLOOR + 60) * k)
    hole()
    ctx.clip('evenodd')
  }
}

/**
 * The case, as a metronome's reads at a glance: a tall walnut pyramid, gilt at its edges, and the tall window in its
 * face with the pale scale down it (no marks), which the long arm swings across. Its fittings (`drawFittings`) stand
 * proud of it.
 */
function drawCase(p: p5, c: Ctx, dy: number, T: number): void {
  const { k, ink, weight } = c
  const top = CASE_TOP + dy
  const base = FLOOR + dy
  const x = PIVOT_X
  const inset = (y: number) => caseHalf(y - dy) * 0.52
  solid(p, ink, weight * 0.9, WOOD)
  p.quad((x - CASE_HALF_TOP) * k, top * k, (x + CASE_HALF_TOP) * k, top * k, (x + CASE_HALF_BASE) * k, base * k, (x - CASE_HALF_BASE) * k, base * k)
  // The window: from under the crown to just above the rack tom, its sides following the case's, a gilt frame round it.
  const w0 = top + 0.24
  const w1 = KY + RACK.top - 0.3 + dy
  // The gilt catches more of the light as the music swells, and less as it nearly stops.
  const glint = 0.45 + 0.5 * level(T)
  p.stroke(alpha(p, HALL.gilt, glint + 0.1))
  p.strokeWeight(weight * 0.6)
  p.fill(WINDOW)
  p.beginShape()
  p.vertex((x - inset(w0)) * k, (w0 + 0.1) * k)
  p.quadraticVertex(x * k, (w0 - 0.06) * k, (x + inset(w0)) * k, (w0 + 0.1) * k)
  p.vertex((x + inset(w1)) * k, w1 * k)
  p.vertex((x - inset(w1)) * k, w1 * k)
  p.endShape(p.CLOSE)
  // The scale down the window: a pale strip, no marks.
  p.noStroke()
  p.fill(alpha(p, HALL.beam, 0.3))
  p.rect(x * k, ((w0 + 0.12 + w1 - 0.1) / 2) * k, 0.09 * k, (w1 - w0 - 0.22) * k, 0.03 * k)
  // Gilt along the case's two edges, a little in.
  p.stroke(alpha(p, HALL.gilt, glint))
  p.strokeWeight(weight * 0.55)
  for (const s of [-1, 1]) p.line((x + s * (CASE_HALF_TOP - 0.06)) * k, (top + 0.1) * k, (x + s * (CASE_HALF_BASE - 0.08)) * k, (base - 0.05) * k)
}

/** The case's gilt fittings: the crown the pivot stands on, and the winding key out of its right side, turning. (Rects are centred: the stage draws in `rectMode(CENTER)`.) */
function drawFittings(p: p5, c: Ctx, dy: number, T: number): void {
  const { k, ink, weight } = c
  const top = CASE_TOP + dy
  const x = PIVOT_X
  solid(p, ink, weight * 0.7, GILT)
  p.rect(x * k, (top - 0.01) * k, (2 * CASE_HALF_TOP + 0.14) * k, 0.1 * k, 0.02 * k)
  // The key: a shaft and a flat bow, which shows its full height face on and a sliver edge on as it turns.
  const ky = KEY_Y + dy
  const kx = x + caseHalf(KEY_Y)
  const h = 0.05 + 0.13 * Math.abs(Math.cos(keyTurn(T)))
  p.rect((kx + 0.06) * k, ky * k, 0.16 * k, 0.056 * k, 0.02 * k)
  p.rect((kx + 0.155) * k, ky * k, 0.07 * k, 2 * h * k, 0.035 * k)
}

/**
 * The rod at `th`, both arms through the pivot: the short arm up to its fine tip, the long arm down past its brass
 * bob to the striker at its end; and the pivot's pin across it. (In the rod's own frame the short arm is up, -y.)
 */
function drawRod(p: p5, c: Ctx, dy: number, th: number): void {
  const { k, ink, weight } = c
  p.push()
  p.translate(PIVOT_X * k, (PIVOT_Y + dy) * k)
  p.rotate(th)
  p.stroke(ink)
  p.strokeWeight(weight * 2.4)
  p.line(0, -ROD_UP * k, 0, ROD_LOW * k)
  p.stroke(KIT.chrome)
  p.strokeWeight(weight * 1.3)
  p.line(0, -ROD_UP * k, 0, ROD_LOW * k)
  // The tip: a short spindle along the rod.
  solid(p, ink, weight * 0.6, KIT.chrome)
  p.ellipse(0, (-ROD_UP + 0.02) * k, 0.06 * k, 0.17 * k)
  // The striker: a short chrome sleeve at the long arm's end, what meets the ride.
  p.rect(0, (ROD_LOW - 0.07) * k, 0.085 * k, 0.15 * k, 0.02 * k)
  // The bob: a long brass plumb on the long arm, pointed both ends (never a disc: nothing round near him).
  const [b0, b1] = BOB
  const bw = 0.085
  solid(p, ink, weight * 0.7, BRASS)
  p.beginShape()
  p.vertex(0, b0 * k)
  p.vertex(bw * k, (b0 + 0.1) * k)
  p.vertex(bw * k, (b1 - 0.1) * k)
  p.vertex(0, b1 * k)
  p.vertex(-bw * k, (b1 - 0.1) * k)
  p.vertex(-bw * k, (b0 + 0.1) * k)
  p.endShape(p.CLOSE)
  p.stroke(alpha(p, HALL.beam, 0.35))
  p.strokeWeight(weight * 0.5)
  p.line(-0.03 * k, (b0 + 0.12) * k, -0.03 * k, (b1 - 0.12) * k)
  // The pin: a small gilt block across the rod at the pivot.
  solid(p, ink, weight * 0.6, GILT)
  p.rect(0, 0, 0.17 * k, 0.07 * k, 0.02 * k)
  p.pop()
}

/** The weight's cradle under him: a gilt sleeve on the rod, a little wider at the top. */
function drawCradle(p: p5, c: Ctx, dy: number, th: number, r: number): void {
  const { k, ink, weight } = c
  const y = -(r - R)
  p.push()
  p.translate(PIVOT_X * k, (PIVOT_Y + dy) * k)
  p.rotate(th)
  solid(p, ink, weight * 0.8, HALL.gilt)
  p.quad(-0.17 * k, (y - 0.005) * k, 0.17 * k, (y - 0.005) * k, 0.11 * k, (y + 0.12) * k, -0.11 * k, (y + 0.12) * k)
  p.stroke(alpha(p, KIT.shade, 0.7))
  p.strokeWeight(weight * 0.5)
  p.line(-0.13 * k, (y + 0.055) * k, 0.13 * k, (y + 0.055) * k)
  p.pop()
}

/** The rod's two arms between angles `a0` and `a1`: one filled shape, a bow tie through the pivot. */
function sweep(p: p5, k: number, px: number, py: number, a0: number, a1: number): void {
  const n = 8
  p.beginShape()
  p.vertex(px, py)
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    p.vertex(px + Math.sin(a) * ROD_UP * k, py - Math.cos(a) * ROD_UP * k)
  }
  p.vertex(px, py)
  for (let i = 0; i <= n; i++) {
    const a = a1 + ((a0 - a1) * i) / n
    p.vertex(px - Math.sin(a) * ROD_LOW * k, py + Math.cos(a) * ROD_LOW * k)
  }
  p.endShape(p.CLOSE)
}

/**
 * The eye's blur of a fast swing: one soft filled wedge over where the rod was in the last frame or so, fainter the
 * narrower it is; nothing when it is slow.
 */
function drawBlur(p: p5, c: Ctx, dy: number, T: number, th: number): void {
  const back = rodAt(T - 1 / 50)
  const d = Math.abs(back - th)
  if (d < 0.03) return
  p.noStroke()
  p.fill(alpha(p, mixHex(KIT.chrome, HALL.gold, 0.35), 0.16 * clamp((d - 0.03) / 0.2)))
  sweep(p, c.k, PIVOT_X * c.k, (PIVOT_Y + dy) * c.k, back, th)
}

/** The blur of the roll: a faint fan where the rod trembles. */
function drawFan(p: p5, c: Ctx, dy: number, size: number, lit: number): void {
  if (size < 0.004) return
  p.noStroke()
  p.fill(alpha(p, mixHex(KIT.chrome, HALL.gold, 0.4), 0.3 * lit))
  sweep(p, c.k, PIVOT_X * c.k, (PIVOT_Y + dy) * c.k, -size, size)
}

/**
 * The hall's light over what this part draws behind the kit (the case, and the drums redrawn in front of it): the
 * hall's own (`hall.ts` `hallLight`), which is drawn before any part and so never reaches them.
 */
function relight(p: p5, c: Ctx, T: number): void {
  hallLight(p, c, T)
}

/** The metronome at show time `T`: nothing while it is under the stage. */
export function drawMetronome(p: p5, c: Ctx, T: number): void {
  const dy = lift(T)
  if (dy >= DROP - 1e-6) return
  const { k } = c
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const th = rodAt(T)
  const r = weightAt(T)
  const outline = caseOutline(dy)

  // Behind the kit: the case, the drums drawn again in front of it (the hall's kit, struck as the hall strikes it),
  // and the hall's light over it all. Only inside the case's outline, so nothing else changes.
  if (outline.length) {
    ctx.save()
    ctx.beginPath()
    path(ctx, k, outline)
    ctx.clip()
    drawCase(p, c, dy, T)
    p.push()
    p.translate(KX * k, KY * k)
    drawKit(p, c, { shell: KIT.lacquer, since: (piece) => kitSince(piece, T), light: kitLight(T), without: ['ride', 'crash'] })
    p.pop()
    relight(p, c, T)
    ctx.restore()
  }

  // In front of the case and the cymbals, behind the drums: the crown, the blur, the rod, the cradle. Never under the stage.
  ctx.save()
  drumHoles(ctx, k)
  if (outline.length) drawFittings(p, c, dy, T)
  const size = T > RIDE_END && T < COCK ? rollSize(T) : 0
  // The roll's fan only once the swing has become a shimmer (a wide one would read as a beam of light).
  if (size > 0 && size < 0.12) drawFan(p, c, dy, size, level(T) * smooth(T, RIDE_END + 0.6, RIDE_END + 1.6))
  else drawBlur(p, c, dy, T, th)
  drawRod(p, c, dy, th)
  drawCradle(p, c, dy, th, r)
  ctx.restore()
}

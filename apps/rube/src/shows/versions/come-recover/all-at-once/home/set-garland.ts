import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { R, type Pt } from '../../../../../parts'
import { G } from '../physics'
import { HOME } from '../worlds'

/**
 * The lantern string: the party's prep, which the laundromat leg hangs and the dryer leg ends on.
 *
 * A wire is strung across the shop from high over the door to the wall past the big dryer, a little slack. A
 * clothes hanger rides it on its hook, and a small wire basket hangs from the hanger's bar. Five paper lanterns
 * hang folded flat from knots along the wire. The ball is thrown up into the basket on 31.463; the hanger runs down
 * the wire under gravity (the wire sags into a V under it), its hook jumps each knot as it passes, and each lantern
 * it knocks drops open, on the music. On 34.331 the hook hits the stop over the big dryer's mouth and the basket
 * swings on, tipping the ball in.
 *
 * Everything here is a pure function of show time, worked out once. The laundromat and the dryer both read it: the
 * one for the ride, the other for the tip.
 */

/** The wire's anchors, in the room's cells, and how much longer it is than the straight line between them. */
export const WIRE_A: Pt = [0.0, -4.55]
export const WIRE_B: Pt = [10.6, -4.0]
const SLACK = 1.028
const WIRE_LEN = Math.hypot(WIRE_B[0] - WIRE_A[0], WIRE_B[1] - WIRE_A[1]) * SLACK

/** Where the hanger is parked before the ride, and the stop at the end (over the big dryer's mouth). */
export const PARK_X = 1.28
export const STOP_X = 8.62
/** The catch, and the stop: show seconds. */
export const CATCH = 31.463
export const STOP = 34.331
/** The lanterns open on these onsets, as the hook passes their knots. */
export const POPS = [31.858, 32.357, 33.088, 33.379, 34.087]

/** The hanger: its hook's drop from the wire to its bar, and the basket under it (the ball's seat). */
const HOOK = 0.2
const HANG = 0.46

/** The point on the wire (a V through the hook) under x, given the hook at `hx`. */
function wireY(x: number, hx: number): number {
  const hy = hookY(hx)
  if (x <= hx) return WIRE_A[1] + ((hy - WIRE_A[1]) * (x - WIRE_A[0])) / (hx - WIRE_A[0])
  return hy + ((WIRE_B[1] - hy) * (x - hx)) / (WIRE_B[0] - hx)
}

/** The hook's height at x: on the ellipse the wire's length allows (the anchors its foci), its lower side. */
function hookY(x: number): number {
  const chord = WIRE_A[1] + ((WIRE_B[1] - WIRE_A[1]) * (x - WIRE_A[0])) / (WIRE_B[0] - WIRE_A[0])
  let lo = chord
  let hi = chord + 3
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const len = Math.hypot(x - WIRE_A[0], mid - WIRE_A[1]) + Math.hypot(WIRE_B[0] - x, WIRE_B[1] - mid)
    if (len < WIRE_LEN) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/* ------------------------------------------------------------------ the ride, worked out once */

const RATE = 240
/** The ball's velocity as it drops into the basket (from the laundromat's throw), which sets the hanger going. */
export const CATCH_V: Pt = [1.64, 2.3]
/** How much of her speed along the wire the hanger takes up (she is heavier than it and the basket). */
const SHARE = 0.72

interface Ride {
  /** Samples from CATCH to STOP + 3: the hook's x, and the basket's swing (radians, + forward). */
  x: Float32Array
  swing: Float32Array
  /** The drag that makes the ride end at the stop on STOP. */
  drag: number
}

function slope(x: number): number {
  return (hookY(x + 0.01) - hookY(x - 0.01)) / 0.02
}

/** Run the hanger down the wire with a rolling drag `mu`; the time it reaches the stop (or Infinity). */
function runDown(mu: number, keep = false): { at: number; x: number[]; v: number[] } {
  const dt = 1 / RATE
  const s0 = slope(PARK_X)
  const dir = [1 / Math.hypot(1, s0), s0 / Math.hypot(1, s0)]
  let v = SHARE * (CATCH_V[0] * dir[0] + CATCH_V[1] * dir[1])
  let x = PARK_X
  const xs: number[] = []
  const vs: number[] = []
  for (let i = 0; i < RATE * 8; i++) {
    if (keep) {
      xs.push(x)
      vs.push(v)
    }
    const m = slope(x)
    const c = 1 / Math.hypot(1, m)
    // Gravity along the wire, less a rolling drag.
    const a = G * m * c - mu * v * Math.abs(v) - 0.15 * Math.sign(v)
    v += a * dt
    x += v * c * dt
    if (x >= STOP_X) return { at: CATCH + (i + 1) * dt, x: xs, v: vs }
  }
  return { at: Infinity, x: xs, v: vs }
}

const RIDE: Ride = (() => {
  // The drag that lands the hook on the stop on the beat.
  let lo = 0
  let hi = 3
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (runDown(mid).at < STOP) lo = mid
    else hi = mid
  }
  const drag = (lo + hi) / 2
  const run = runDown(drag, true)
  const n = Math.ceil((STOP - CATCH + 8) * RATE)
  const x = new Float32Array(n)
  const swing = new Float32Array(n)
  const dt = 1 / RATE
  // After the stop, the empty hanger is knocked back off it and slides back down to the wire's low point, where it
  // rocks to rest: out of the dryer's window.
  const vStop = run.v[run.v.length - 1] ?? 0
  let hx = STOP_X
  let hv = -0.22 * vStop
  // The basket swings under the hook as a pendulum, thrown back as it sets off and forward at the stop.
  let th = 0
  let w = 0
  let prevV = run.v[0] ?? 0
  for (let i = 0; i < n; i++) {
    const t = CATCH + i * dt
    let v: number
    if (t < STOP) {
      const j = Math.min(i, run.x.length - 1)
      hx = run.x[j]
      v = run.v[j]
    } else {
      if (hx >= STOP_X && hv > 0) hv = -0.3 * hv
      const m = slope(hx)
      const c = 1 / Math.hypot(1, m)
      hv += (G * m * c - 1.6 * hv) * dt
      hx = Math.min(STOP_X, hx + hv * c * dt)
      v = hv
    }
    // The hook's acceleration along x: at the stop it stops dead, within a sixtieth of a second, and is knocked back.
    const acc = t >= STOP && t < STOP + 1 / 60 ? -vStop * 60 * 1.22 : (v - prevV) / dt
    prevV = v
    // Once she is out the basket is light, and swings freer.
    const damp = t < STOP ? 2.2 : 1.1
    const alpha = -(G / HANG) * Math.sin(th) - (acc / HANG) * Math.cos(th) - damp * w
    w += alpha * dt
    th += w * dt
    // The basket cannot swing up past the wire.
    th = clamp(th, -1.3, 1.3)
    x[i] = hx
    swing[i] = th
  }
  return { x, swing, drag }
})()

const sample = (arr: Float32Array, t: number): number => {
  const i = (t - CATCH) * RATE
  if (i <= 0) return arr[0]
  if (i >= arr.length - 1) return arr[arr.length - 1]
  const j = Math.floor(i)
  return arr[j] + (arr[j + 1] - arr[j]) * (i - j)
}

/** The hook's x on the wire at show time `t`. */
export const hookX = (t: number): number => (t < CATCH ? PARK_X : sample(RIDE.x, t))

/** The basket's swing under the hook at `t` (radians, + forward, to the right). */
export function basketSwing(t: number): number {
  if (t < CATCH) return 0
  // The catch: she drops in and the basket gives under her, a small bob.
  return sample(RIDE.swing, t)
}

/** The hook at `t` (where the hanger's hook sits on the wire). */
export function hookAt(t: number): Pt {
  const x = hookX(t)
  // The catch: the wire gives under her and twangs back.
  const u = t - CATCH
  const give = u > 0 && u < 1.5 ? 0.09 * Math.exp(-u / 0.22) * Math.sin(u * 19) : 0
  return [x, hookY(x) + give]
}

/** The basket's seat at `t`: where the ball sits in it. Its bob at the catch is in the part's lane, not here. */
export function seatAt(t: number): Pt {
  const [hx, hy] = hookAt(t)
  const a = basketSwing(t)
  const bar = hy + HOOK
  return [hx + Math.sin(a) * HANG, bar + Math.cos(a) * HANG - R - 0.02]
}

/** Where each lantern's knot is: the hook's x on the onset it opens on. */
export const KNOTS: number[] = POPS.map((t) => hookX(t))

/** Where lantern i hangs from at `t` (its knot on the wire, which moves as the hanger does), and its lantern's middle. */
export function lanternAt(i: number, t: number): { knot: Pt; middle: Pt } {
  const hx = hookX(t)
  const x = KNOTS[i]
  const y = wireY(x, hx)
  return { knot: [x, y], middle: [x, y + 0.42] }
}

/* ------------------------------------------------------------------ drawing */

/** A lantern opens as the hook knocks its knot: a drop, an overshoot, a ring. And it swings from the knock. */
function lanternOpen(t: number, at: number): { open: number; sway: number } {
  const u = t - at
  if (u < 0) return { open: 0, sway: 0 }
  const open = 1 - Math.exp(-u / 0.07) * Math.cos(u * 22) * 0.9 - 0.1 * Math.exp(-u / 0.07)
  const sway = 0.5 * Math.exp(-u / 0.9) * Math.sin(u * 5.2 + 0.4)
  return { open: Math.max(0, open), sway }
}

export interface GarlandPen {
  p: p5
  k: number
  ink: string
  w: number
}

type LanternFn = (x: number, y: number, look: { open: number; lit: number; sway: number; size: number }) => void

/**
 * The wire, its lanterns, the hanger and the basket, at show time `t`. `lantern` draws one lantern (`set.ts`), and
 * `lit(i, t)` says how lit lantern i is. The basket's front wires are drawn by `basketFront`, over the ball.
 */
export function drawGarland(pen: GarlandPen, t: number, lantern: LanternFn, lit: (i: number, t: number) => number): void {
  const { p, k, ink, w } = pen
  const [hx, hy] = hookAt(t)
  // The wire: a V through the hook.
  outline(p, ink, w * 0.55)
  p.line(WIRE_A[0] * k, WIRE_A[1] * k, hx * k, hy * k)
  p.line(hx * k, hy * k, WIRE_B[0] * k, WIRE_B[1] * k)
  // Its anchors: a hook in the wall at each end.
  solid(p, ink, w * 0.6, HOME.steelDark)
  for (const [ax, ay] of [WIRE_A, WIRE_B]) p.circle(ax * k, ay * k, 0.08 * k)
  // The stop over the dryer: a knot and a cork.
  const sy = wireY(STOP_X + 0.12, hx)
  solid(p, ink, w * 0.6, HOME.wood)
  p.rect((STOP_X + 0.15) * k, sy * k, 0.12 * k, 0.1 * k, 0.02 * k)
  // The lanterns, from their knots.
  KNOTS.forEach((kx, i) => {
    const ky = wireY(kx, hx)
    const o = lanternOpen(t, POPS[i])
    // Folded, a lantern hangs close under its knot; open, it drops on its cord.
    lantern(kx, ky, { open: o.open, lit: lit(i, t), sway: o.sway, size: 0.92 })
  })
  // The hanger on its hook, and the basket.
  const a = basketSwing(t)
  const bar = hy + HOOK
  outline(p, ink, w * 0.8)
  p.noFill()
  p.arc((hx + 0.035) * k, (hy + 0.01) * k, 0.1 * k, 0.1 * k, Math.PI, Math.PI * 2.3)
  p.line(hx * k, (hy + 0.06) * k, hx * k, (hy + 0.09) * k)
  p.line(hx * k, (hy + 0.09) * k, (hx - 0.26) * k, bar * k)
  p.line(hx * k, (hy + 0.09) * k, (hx + 0.26) * k, bar * k)
  p.line((hx - 0.26) * k, bar * k, (hx + 0.26) * k, bar * k)
  basketBack(pen, hx, bar, a)
}

/** The basket's two cords and its back half, hung from the hanger's bar at (hx, bar), swung by `a`. */
function basketBack(pen: GarlandPen, hx: number, bar: number, a: number): void {
  const { p, k, ink, w } = pen
  p.push()
  p.translate(hx * k, bar * k)
  p.rotate(-a)
  outline(p, ink, w * 0.5)
  p.line(-0.2 * k, 0, -0.17 * k, (HANG - 0.1) * k)
  p.line(0.2 * k, 0, 0.17 * k, (HANG - 0.1) * k)
  solid(p, ink, w * 0.6, HOME.steelDark)
  p.arc(0, (HANG - 0.1) * k, 0.4 * k, 0.26 * k, 0, Math.PI, p.CHORD)
  p.pop()
}

/** The basket's front: its rim and wires, drawn over the ball riding in it. */
export function basketFront(pen: GarlandPen, t: number): void {
  const { p, k, ink, w } = pen
  const [hx, hy] = hookAt(t)
  const a = basketSwing(t)
  const bar = hy + HOOK
  p.push()
  p.translate(hx * k, bar * k)
  p.rotate(-a)
  const y0 = HANG - 0.1
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.85)
  p.arc(0, y0 * k, 0.4 * k, 0.26 * k, 0, Math.PI)
  p.line(-0.2 * k, y0 * k, 0.2 * k, y0 * k)
  p.strokeWeight(Math.max(1, w * 0.45))
  for (const f of [-0.1, 0, 0.1]) p.line(f * k, y0 * k, f * 0.9 * k, (y0 + Math.sqrt(1 - (f / 0.2) ** 2) * 0.13) * k)
  p.pop()
}

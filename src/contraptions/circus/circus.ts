import type p5 from 'p5'
import { outline, solid } from '../../core/draw'
import type { Rng } from '../../core/rng'
import type { Theme } from '../../core/themes'
import { clamp, easeInOutCubic, easeOutCubic, lerp, mod, seg } from '../../core/ease'

/**
 * The shared vocabulary of the ring.
 *
 * Every act is drawn in units of the cell — the origin at the centre, y down,
 * a 1x1 cell spanning [-0.5, 0.5] — and multiplied out by `k`, the cell size
 * in pixels, at the last moment. Every performer is a ball of the act's
 * colour; every prop is heavy ink around one flat fill.
 *
 * Acts loop. A performer that leaves the top of a tower comes back to it by
 * the end of the loop, by trampoline, cannon, teeterboard, bucket or chute,
 * and the stunt on the way fires again next lap. The helpers here are the
 * things that recur: the ball, the flight between two points, the knock a
 * passing ball gives a prop, the hoop, the pedestal, the bell, the rings of
 * sound coming off a struck thing.
 */

/** Performer diameter. Every act is a ball, and every ball is this big. */
export const P = 0.22

/** Loop time since the moment `at`, wrapped, so the beat just gone reads as just gone. */
export const since = (u: number, at: number) => mod(u - at, 1)

/** Unclamped progress through [a, b]. */
export const lin = (u: number, a: number, b: number) => (u - a) / (b - a)

/**
 * A knock: what a prop does when the ball hits it at `at`. Out fast, then back
 * with a settle. 0 at rest, 1 at full deflection.
 */
export const knock = (u: number, at: number, out = 0.05, back = 0.28) => {
  const t = since(u, at)
  return easeOutCubic(seg(t, 0, out)) - easeInOutCubic(seg(t, out * 1.5, back))
}

/** A struck thing shivering: a damped wobble that starts at `at` and dies by `at + span`. */
export const shiver = (u: number, at: number, span = 0.18, cycles = 5) => {
  const t = since(u, at)
  if (t >= span) return 0
  const left = 1 - t / span
  return left * left * Math.sin(t * Math.PI * 2 * (cycles / span))
}

/** 1 at the moment `at`, decaying linearly to 0 over `span`. The ring of a bell, the flash of a bulb. */
export const fade = (u: number, at: number, span = 0.2) => clamp(1 - since(u, at) / span)

type Pt = [number, number]

/**
 * A flight from `a` to `b` on a parabola: `f` in [0, 1], `lift` how far above
 * the chord the apex sits. What every leap, throw and shot is made of.
 */
export const flight = (a: Pt, b: Pt, lift: number, f: number): Pt => [
  lerp(a[0], b[0], f),
  lerp(a[1], b[1], f) - lift * 4 * f * (1 - f),
]

/** A fall from rest at `a` to `b`: the apex is where it started, so it accelerates away. */
export const drop = (a: Pt, b: Pt, f: number): Pt => [lerp(a[0], b[0], f), lerp(a[1], b[1], f * f)]

/** A throw from `a` that arrives at `b` at the top of its rise: the apex is where it lands. */
export const rise = (a: Pt, b: Pt, f: number): Pt => [lerp(a[0], b[0], f), b[1] + (a[1] - b[1]) * (1 - f) * (1 - f)]

/**
 * A route: legs with a speed each, so a ball rolling a floor and falling a
 * chute is one object with one clock. `at(f)` is the point at fraction `f`
 * of the route's total time, `leg(f)` which leg it is on.
 */
export interface Leg {
  from: Pt
  to: Pt
  /** Cell units per loop. */
  v: number
  /** Parabolic lift above the chord, for legs that fly. */
  lift?: number
}

export interface Route {
  legs: Leg[]
  /** Loop fraction the whole route takes at its speeds. */
  time: number
  /** Cumulative start time of each leg, as a fraction of `time`. */
  starts: number[]
  at(f: number): Pt
  leg(f: number): number
  /** Route fraction at which the ball is `s` of the way along leg `i`. Where a prop gets hit. */
  frac(i: number, s: number): number
}

const legLen = (l: Leg) => Math.hypot(l.to[0] - l.from[0], l.to[1] - l.from[1])

export function route(legs: Leg[]): Route {
  const times = legs.map((l) => legLen(l) / l.v)
  const time = times.reduce((a, b) => a + b, 0)
  const starts: number[] = []
  let acc = 0
  for (const t of times) {
    starts.push(acc / time)
    acc += t
  }
  const leg = (f: number) => {
    let i = 0
    while (i < legs.length - 1 && f >= starts[i + 1]) i++
    return i
  }
  return {
    legs,
    time,
    starts,
    leg,
    frac: (i, s) => starts[i] + (s * times[i]) / time,
    at(f) {
      const i = leg(clamp(f))
      const l = legs[i]
      const span = times[i] / time
      const s = span === 0 ? 1 : clamp((clamp(f) - starts[i]) / span)
      return flight(l.from, l.to, l.lift ?? 0, s)
    },
  }
}

/** A second fill colour, for the other half of a double act. */
export const second = (rng: Rng, theme: Theme, color: string) =>
  rng.pick(theme.colors.filter((c) => c !== color)) ?? color

/** The performer: a ball of the act's colour, at `x, y` in cell units. */
export function performer(p: p5, k: number, ink: string, weight: number, fill: string, x: number, y: number, d = P): void {
  solid(p, ink, weight, fill)
  p.circle(x * k, y * k, d * k)
}

/** Same, when the ball is a prop rather than the act: a hub, a knob, a weight. */
export function knob(p: p5, k: number, ink: string, weight: number, fill: string, x: number, y: number, d: number): void {
  solid(p, ink, weight, fill)
  p.circle(x * k, y * k, d * k)
}

/** An ink line in cell units. */
export function stroke(p: p5, k: number, x1: number, y1: number, x2: number, y2: number): void {
  p.line(x1 * k, y1 * k, x2 * k, y2 * k)
}

/** The floor of a cell, or any footprint: the ground every act stands on. */
export function ground(p: p5, k: number, w: number, y = 0.5): void {
  p.line((-w / 2) * k, y * k, (w / 2) * k, y * k)
}

/** A filled rectangle by centre, in cell units. */
export function block(p: p5, k: number, ink: string, weight: number, fill: string, x: number, y: number, w: number, h: number): void {
  solid(p, ink, weight, fill)
  p.rect(x * k, y * k, w * k, h * k)
}

/**
 * A pedestal, the drum a performer stands on: a solid body with an ink rim
 * a little below the top. `x` is the centre, `top` the surface, `floor` where
 * it stands.
 */
export function pedestal(p: p5, k: number, ink: string, weight: number, fill: string, x: number, top: number, floor: number, w: number): void {
  const h = floor - top
  solid(p, ink, weight, fill)
  p.rect(x * k, (top + h / 2) * k, w * k, h * k)
  outline(p, ink, weight)
  const rim = top + Math.min(0.06, h * 0.3)
  p.line((x - w / 2) * k, rim * k, (x + w / 2) * k, rim * k)
}

/**
 * A hoop: a band of fill between two ink circles, open in the middle so
 * whatever is going through it shows. Drawn after the performer, the band
 * crosses the ball and the ball reads as passing through the ring. `flare`
 * pushes tongues of fill out of the rim, for a hoop that is on fire.
 */
export function hoop(
  p: p5,
  k: number,
  ink: string,
  weight: number,
  fill: string,
  x: number,
  y: number,
  r: number,
  band: number,
  flare = 0,
): void {
  if (flare > 0.01) {
    p.push()
    p.noStroke()
    p.fill(fill)
    const n = 10
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n
      const r0 = r + band
      const r1 = r0 + (0.05 + 0.06 * flare) * (i % 2 === 0 ? 1 : 0.6)
      const half = 0.16
      p.triangle(
        (x + Math.cos(a - half) * r0) * k,
        (y + Math.sin(a - half) * r0) * k,
        (x + Math.cos(a + half) * r0) * k,
        (y + Math.sin(a + half) * r0) * k,
        (x + Math.cos(a) * r1) * k,
        (y + Math.sin(a) * r1) * k,
      )
    }
    p.pop()
  }
  solid(p, ink, weight, fill)
  const n = 48
  p.beginShape()
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    p.vertex((x + Math.cos(a) * (r + band)) * k, (y + Math.sin(a) * (r + band)) * k)
  }
  p.beginContour()
  for (let i = n - 1; i >= 0; i--) {
    const a = (i / n) * Math.PI * 2
    p.vertex((x + Math.cos(a) * r) * k, (y + Math.sin(a) * r) * k)
  }
  p.endContour()
  p.endShape(p.CLOSE)
}

/**
 * A bell hanging from the point `x, top`: a short stem, the flared body of
 * width `bw` and height `bh`, and a clapper. `swing` rocks it.
 */
export function bell(p: p5, k: number, ink: string, weight: number, fill: string, x: number, top: number, bw: number, bh: number, swing = 0): void {
  p.push()
  p.translate(x * k, top * k)
  p.rotate(swing)
  outline(p, ink, weight)
  p.line(0, 0, 0, bh * 0.22 * k)
  p.translate(0, bh * 0.22 * k)
  p.fill(fill)
  p.beginShape()
  p.vertex((-bw / 2) * k, bh * k)
  p.bezierVertex((-bw / 2) * k, 0, -bw * 0.22 * k, 0, 0, 0)
  p.bezierVertex(bw * 0.22 * k, 0, (bw / 2) * k, 0, (bw / 2) * k, bh * k)
  p.endShape(p.CLOSE)
  p.line((-bw / 2) * k, bh * k, (bw / 2) * k, bh * k)
  p.fill(fill)
  p.circle(0, (bh + bw * 0.12) * k, bw * 0.24 * k)
  p.pop()
}

/**
 * Sound coming off a struck thing: `n` arcs of the act's colour spreading
 * from `x, y`, facing `toward` (radians), `hit` from 1 fresh to 0 gone.
 */
export function rings(p: p5, k: number, color: string, weight: number, x: number, y: number, r: number, hit: number, toward: number, n = 2): void {
  if (hit <= 0.02) return
  p.push()
  p.stroke(color)
  p.strokeWeight(weight)
  p.noFill()
  for (let i = 1; i <= n; i++) {
    const rr = r * (0.9 + i * 0.32 + (1 - hit) * 0.25) * k
    p.arc(x * k, y * k, rr * 2, rr * 2, toward - 0.55, toward + 0.55)
  }
  p.pop()
}

/**
 * A splash at `x, y`: drops of the act's colour thrown up and out, `t` from
 * 0 at the impact to 1 when they have fallen back.
 */
export function splash(p: p5, k: number, fill: string, x: number, y: number, t: number, reach = 0.2): void {
  if (t <= 0 || t >= 1) return
  p.push()
  p.noStroke()
  p.fill(fill)
  for (const [dx, h, d] of [
    [-1, 1.1, 0.5],
    [1, 1.1, 0.5],
    [-0.45, 1.5, 0.36],
    [0.5, 1.4, 0.36],
  ] as const) {
    const px = x + dx * reach * lerp(0.3, 1.6, t)
    const py = y - h * reach * 4 * t * (1 - t)
    p.circle(px * k, py * k, d * reach * lerp(0.9, 0.35, t) * k)
  }
  p.pop()
}

/** A rope from `a` to `b` sagging by `sag` at its middle, drawn as a curve. */
export function rope(p: p5, k: number, a: Pt, b: Pt, sag: number): void {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2 + sag
  p.noFill()
  p.beginShape()
  p.vertex(a[0] * k, a[1] * k)
  p.quadraticVertex(mx * k, (my + sag) * k, b[0] * k, b[1] * k)
  p.endShape()
}

/** A ladder between two heights, at `x`, with rungs. */
export function ladder(p: p5, k: number, x: number, top: number, bottom: number, w: number, rungs: number): void {
  p.line((x - w / 2) * k, top * k, (x - w / 2) * k, bottom * k)
  p.line((x + w / 2) * k, top * k, (x + w / 2) * k, bottom * k)
  for (let i = 1; i <= rungs; i++) {
    const y = lerp(top, bottom, i / (rungs + 1))
    p.line((x - w / 2) * k, y * k, (x + w / 2) * k, y * k)
  }
}

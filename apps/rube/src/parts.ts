import type p5 from 'p5'
import { outline, solid } from '../../../src/core/draw'
import { clamp, easeInOutSine, easeInQuad, easeOutQuad } from '../../../src/core/ease'
import type { Rng } from '../../../src/core/rng'
import type { Theme } from '../../../src/core/themes'

/**
 * The shared vocabulary of the show.
 *
 * One ball, one thread. Every piece is a beat the ball passes through once:
 * it arrives, the piece does its one thing, it leaves. **No piece draws the
 * ball.** A piece declares a lane — the ball's path across its footprint, in
 * cell units, in the canonical hand (west → east, y down) — and the show
 * draws the ball once, on the joined path of every piece, from one clock.
 *
 * Time is seconds, not loop fractions, and nothing here is periodic: a piece
 * is drawn from `t`, the seconds since the ball entered it, and it must look
 * right for any `t` — armed and waiting before the ball, reacting as it
 * passes, settling long after. That is what lets the camera scrub, the show
 * run forever, and every frame stay a pure function of the clock.
 *
 * Units are cells. The ball's centre rolls along y = 0; the rail it rolls
 * on is at y = FLOOR. A cell spans [-0.5, 0.5] on both axes.
 */

export type Pt = [number, number]

/** The ball's radius. */
export const R = 0.13
/** The rail's height: the ball sits on it with its centre on the cell's centre line. */
export const FLOOR = R
/** Cells per second on a plain rail. */
export const ROLL = 2.6
/** After a kick — a hammer, a seesaw, a puff. */
export const FAST = 4.4
/** Terminal-ish speed down a tube. */
export const FALL = 5.5
/** Seconds the ball spends being pulled into a portal, or pushed out of one. */
export const TRANSIT = 0.4

/* ------------------------------------------------------------------ lanes */

/** One piece of a ball's path: a straight run, a pause, or a flight. */
export interface Seg {
  from: Pt
  to: Pt
  /** Seconds. */
  dur: number
  /** How progress along the segment is eased. Linear when unset. */
  ease?: 'in' | 'out' | 'inout'
  /**
   * Speed at the start and at the end, cells per second, changing linearly
   * in time: a roll that slows from a kick to the plain rail's pace, or one
   * that picks up from a stop. The segment's `dur` must be the length over
   * the mean of the two. Overrides `ease`.
   */
  ramp?: [number, number]
  /**
   * A flight: the ball leaves the chord on a parabola that peaks this many
   * cells above its midpoint. Zero (unset) is a straight line.
   */
  arc?: number
  /** The ball is crossing a portal: scaling down to nothing, or up from it. */
  portal?: 'in' | 'out'
  /** The ball is out of sight — inside a barrel, a toaster. */
  hidden?: boolean
}

export interface Lane {
  segs: Seg[]
  /** Seconds after the ball enters at which the piece fires: the blow, the bang, the tip. */
  fire: number
}

/* ------------------------------------------------------------------ the ball */

/**
 * The ball as it is right now. The thread is one ball, but a piece may
 * recolour it, turn it ghostly, or hand the thread to another ball
 * altogether; the state rides along the chain from piece to piece.
 */
export interface BallState {
  color: string
  /** A phased ball: drawn as an outline, passes through solid things. */
  ghost: boolean
  /** Which ball this is. Counts up at every relay, so a trail never bridges two balls. */
  id: number
}

/** A change to the ball, `at` seconds into a piece's lane. */
export interface BallChange {
  at: number
  color?: string
  ghost?: boolean
  /** The thread passes to another ball here. */
  relay?: boolean
}

/** The ball after every change in `changes` up to time `t`. */
export function ballAt(ball: BallState, changes: BallChange[], t: number): BallState {
  let out = ball
  for (const c of changes) {
    if (c.at > t) break
    out = {
      color: c.color ?? out.color,
      ghost: c.ghost ?? out.ghost,
      id: c.relay ? out.id + 1 : out.id,
    }
  }
  return out
}

const len = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1])

export const roll = (from: Pt, to: Pt, v = ROLL, ease?: Seg['ease']): Seg => ({ from, to, dur: len(from, to) / v, ease })
/** A straight run whose speed changes linearly from `v0` to `v1`, so a hand-off never jumps in pace. */
export const ramp = (from: Pt, to: Pt, v0: number, v1: number): Seg => ({ from, to, dur: len(from, to) / ((v0 + v1) / 2), ramp: [v0, v1] })
/** Cells over which a ball rolling at ROLL comes to a stop. */
const STOP = 0.16
/** Roll at ROLL and come to a stop at `to`: the last STOP cells slow to nothing. */
export function arrive(from: Pt, to: Pt): Seg[] {
  const L = len(from, to)
  const f = (L - STOP) / L
  const mid: Pt = [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f]
  return [roll(from, mid, ROLL), ramp(mid, to, ROLL, 0)]
}
/** Seconds after entering at x = -0.5 that `arrive` reaches a stop at `x`. */
export const arriveAt = (x: number): number => (x + 0.5 - STOP) / ROLL + STOP / (ROLL / 2)
export const wait = (at: Pt, dur: number, extra: Partial<Seg> = {}): Seg => ({ from: at, to: at, dur, ...extra })
/** A drop under gravity: accelerating. */
export const fall = (from: Pt, to: Pt, v = FALL): Seg => ({ from, to, dur: len(from, to) / v, ease: 'in' })
/** A flight on a parabola. */
export const fly = (from: Pt, to: Pt, dur: number, arc: number, extra: Partial<Seg> = {}): Seg => ({
  from,
  to,
  dur,
  arc,
  ...extra,
})

/** Points on a circle from angle `a0` to `a1` (radians, y down), `n` steps. */
export function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return out
}

/**
 * Straight segments through `pts`, sharing `dur` in proportion to length,
 * with an optional per-point speed factor so a loop can slow at its top.
 */
export function chain(pts: Pt[], dur: number, speed?: (i: number) => number): Seg[] {
  const parts: number[] = []
  for (let i = 1; i < pts.length; i++) parts.push(len(pts[i - 1], pts[i]) / (speed ? speed(i) : 1))
  const total = parts.reduce((a, b) => a + b, 0) || 1
  return parts.map((part, i) => ({ from: pts[i], to: pts[i + 1], dur: (dur * part) / total }))
}

export const segTime = (segs: Seg[]): number => segs.reduce((sum, s) => sum + s.dur, 0)
export const laneTime = (lane: Lane): number => segTime(lane.segs)

/** Where the ball is on a lane. */
export interface LanePoint {
  x: number
  y: number
  /** 1 normally, shrinking to 0 inside a portal. */
  scale: number
  /** 1 normally; more than 1 when the ball is drawn out into a streak along its motion. */
  stretch: number
  /** Direction of motion, radians, in the lane's own hand. */
  angle: number
  hidden: boolean
  /** Index of the segment. */
  seg: number
  /** Eased progress along it. */
  s: number
  /** Time fraction along it, before easing. */
  raw: number
}

const easeOf = (kind: Seg['ease'], s: number): number =>
  kind === 'in' ? easeInQuad(s) : kind === 'out' ? easeOutQuad(s) : kind === 'inout' ? easeInOutSine(s) : s

/** The ball `t` seconds into the lane, clamped to its ends. */
export function laneAt(lane: Lane, t: number): LanePoint {
  const { segs } = lane
  let want = Math.max(0, t)
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    const last = i === segs.length - 1
    if (want <= seg.dur || last) {
      const raw = seg.dur <= 0 ? 1 : clamp(want / seg.dur)
      const s = seg.ramp ? (raw * (2 * seg.ramp[0] + (seg.ramp[1] - seg.ramp[0]) * raw)) / (seg.ramp[0] + seg.ramp[1]) : easeOf(seg.ease, raw)
      const lift = seg.arc ? seg.arc * 4 * s * (1 - s) : 0
      const scale = seg.portal === 'out' ? 1 - raw : seg.portal === 'in' ? raw : 1
      // Pulled into a portal, or pushed out of one, the ball draws out into
      // a streak along its path: a teleport, not a fade.
      const stretch = seg.portal ? 1 + 2.4 * Math.pow(1 - scale, 1.4) : 1
      return {
        x: seg.from[0] + (seg.to[0] - seg.from[0]) * s,
        y: seg.from[1] + (seg.to[1] - seg.from[1]) * s - lift,
        scale,
        stretch,
        angle: Math.atan2(seg.to[1] - seg.from[1], seg.to[0] - seg.from[0]),
        hidden: !!seg.hidden,
        seg: i,
        s,
        raw,
      }
    }
    want -= seg.dur
  }
  const end = segs[segs.length - 1]
  return { x: end.to[0], y: end.to[1], scale: 1, stretch: 1, angle: 0, hidden: !!end.hidden, seg: segs.length - 1, s: 1, raw: 1 }
}

/** Seconds into the lane at which the ball first reaches `x`, on a segment moving forward across it. */
export function laneReach(lane: Lane, x: number): number {
  let acc = 0
  for (const seg of lane.segs) {
    if (seg.from[0] < x && seg.to[0] >= x) return acc + seg.dur * ((x - seg.from[0]) / (seg.to[0] - seg.from[0]))
    acc += seg.dur
  }
  return acc
}

/* ------------------------------------------------------------------ pieces */

export interface Taste {
  /** Multiplier on a piece's weight, by name. */
  weights: Record<string, number>
}

/** What a piece is told when the planner asks it to place itself. */
export interface PlaceCtx {
  rng: Rng
  color: string
  theme: Theme
  taste: Taste
  /** The ball as it arrives: its colour, whether it is a ghost. */
  ball: BallState
  /** True if the piece may occupy these canonical cells and hand off into `exit`. */
  fits(cells: Pt[], exit: Pt): boolean
}

/** A piece's answer: where it sits, where it sends the ball, and how. */
export interface Placement<S> {
  /** Cells occupied, relative to the entry cell, canonical. Includes the entry cell. */
  cells: Pt[]
  /** The next piece's entry cell, relative to this one's; and whether the heading reverses. */
  exit: { at: Pt; dir: 1 | -1 }
  lane: Lane
  state: S
  /** What the piece does to the ball, in lane time, sorted by `at`. */
  changes?: BallChange[]
}

/** Everything a piece gets on every frame. */
export interface PieceCtx {
  /** Cell size in pixels. Multiply every coordinate by this. */
  k: number
  /** Seconds since the ball entered this piece. Negative before it arrives. */
  t: number
  /** Seconds since the piece fired. Negative before. */
  since: number
  ink: string
  bg: string
  weight: number
  /** The colour of the ball as it arrives. A piece that recolours it knows the new one from its own state. */
  color: string
  theme: Theme
}

export interface Piece<S = unknown> {
  name: string
  /** Relative likelihood of being picked by the planner. 0 for the pieces it places by hand. */
  weight: number
  /** Propose a placement, or null if nothing fits here. */
  place(ctx: PlaceCtx): Placement<S> | null
  draw(p: p5, s: S, c: PieceCtx): void
  /** Drawn after the ball, for parts that stand in front of it. */
  over?(p: p5, s: S, c: PieceCtx): void
}

/** Identity helper that pins the state type. */
export const definePiece = <S>(spec: Piece<S>): Piece<S> => spec

/* ------------------------------------------------------------------ drawing */

/**
 * The ball: one flat fill, ink outline, a dot that shows it spinning. A
 * `stretch` above 1 draws it out along `angle` into a streak, which is how
 * it looks going into a portal.
 */
export function ball(
  p: p5,
  k: number,
  ink: string,
  weight: number,
  color: string,
  x: number,
  y: number,
  spin: number,
  scale = 1,
  stretch = 1,
  angle = 0,
  ghost = false,
): void {
  if (scale <= 0.02) return
  const d = 2 * R * k * scale
  p.push()
  p.translate(x, y)
  p.rotate(angle)
  if (ghost) {
    // A phased ball: the same outline, dashed, with the world showing through.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.setLineDash([d * 0.22, d * 0.16])
    const tint = p.color(color)
    tint.setAlpha(70)
    p.stroke(ink)
    p.strokeWeight(weight * Math.min(1, scale * 1.5 + 0.3))
    p.fill(tint)
    p.ellipse(0, 0, d * stretch, d)
    ctx.setLineDash([])
    p.pop()
    return
  }
  solid(p, ink, weight * Math.min(1, scale * 1.5 + 0.3), color)
  p.ellipse(0, 0, d * stretch, d)
  if (stretch < 1.4) {
    p.noStroke()
    p.fill(ink)
    p.circle(Math.cos(spin - angle) * R * k * 0.48 * scale, Math.sin(spin - angle) * R * k * 0.48 * scale, d * 0.2)
  }
  p.pop()
}

/** A stretch of rail. */
export function rail(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, y = FLOOR): void {
  outline(p, ink, weight)
  p.line(x0 * k, y * k, x1 * k, y * k)
}

/** A post from the rail to the ground of the cell, with a foot. */
export function post(p: p5, k: number, ink: string, weight: number, x: number, y0 = FLOOR, y1 = 0.5): void {
  outline(p, ink, weight)
  p.line(x * k, y0 * k, x * k, y1 * k)
  p.line((x - 0.06) * k, y1 * k, (x + 0.06) * k, y1 * k)
}

/**
 * A gallows: a beam along the cell's roof from `x0` to `x1`, held up by a
 * post at `xPost` that stands on the ground behind the rail. Anything the
 * show hangs over the line hangs from one of these, so nothing floats.
 */
export function gallows(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, xPost: number, y = -0.5): void {
  outline(p, ink, weight)
  p.line(x0 * k, y * k, x1 * k, y * k)
  post(p, k, ink, weight, xPost, y, 0.5)
}

/** A flick: out fast, back with a settle. 1 at full stroke. Seconds. */
export const flick = (t: number, out = 0.06, back = 0.12, done = 0.5) =>
  easeOutQuad(clamp(t / out)) - easeInOutSine(clamp((t - back) / (done - back)))

/** 0 → 1 over [a, b] in seconds, clamped. */
export const over = (t: number, a: number, b: number) => clamp((t - a) / (b - a))

/** Radial burst lines: `n` spokes from radius `r0` to `r1` around (x, y). */
export function burst(p: p5, x: number, y: number, r0: number, r1: number, n: number, phase = 0): void {
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2
    p.line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1)
  }
}

/**
 * A puff of smoke: a cloud of lobes, paper-filled, drawn twice — outlined,
 * then filled again on top — so the lobes overlap into one silhouette with
 * one outline instead of a cluster of bubbles.
 */
export function puff(p: p5, k: number, ink: string, weight: number, bg: string, x: number, y: number, r: number): void {
  const lobes: [number, number, number][] = [
    [0, 0, 1],
    [r * 0.72, r * 0.22, 0.72],
    [-r * 0.66, r * 0.26, 0.66],
    [r * 0.1, -r * 0.5, 0.6],
  ]
  solid(p, ink, weight, bg)
  for (const [dx, dy, f] of lobes) p.circle((x + dx) * k, (y + dy) * k, r * 2 * f * k)
  p.noStroke()
  p.fill(bg)
  for (const [dx, dy, f] of lobes) p.circle((x + dx) * k, (y + dy) * k, (r * 2 * f - weight / k) * k)
}

/**
 * The catch at the foot of a fall: a quarter-pipe that turns a drop into a
 * roll. Drawn in a frame whose origin is the ball's rest point at the
 * bottom — the fall line at x = 0, the rail out at y = FLOOR — and flipped
 * for a ball that turns back. The wall of the bend starts on the tube's
 * near wall at x = -R and lands on the rail at x = arc, so the lines join;
 * a cushion on a post sits under the bend and squashes at the landing.
 */
export function catchBend(p: p5, k: number, ink: string, weight: number, color: string, turn: 1 | -1, arc: number, squash: number, end = 0.5): void {
  p.push()
  p.scale(turn, 1)
  outline(p, ink, weight)
  p.arc(arc * k, -arc * k, (arc + FLOOR) * 2 * k, (arc + FLOOR) * 2 * k, Math.PI / 2, Math.PI)
  p.line(arc * k, FLOOR * k, end * k, FLOOR * k)
  solid(p, ink, weight, color)
  p.rect(0.04 * k, (FLOOR + 0.12 + squash * 0.02) * k, 0.24 * k, (0.09 - squash * 0.03) * k, 0.015 * k)
  outline(p, ink, weight)
  p.line(0.04 * k, (FLOOR + 0.17) * k, 0.04 * k, 0.5 * k)
  p.line((end - 0.1) * k, FLOOR * k, (end - 0.1) * k, 0.5 * k)
  p.pop()
}

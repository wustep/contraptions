import type p5 from 'p5'
import type { Theme } from '../../../../../../src/core/themes'
import { FLOOR, R, fly, post, rail, type Pt, type Seg } from '../../../parts'
import { snowWhite } from './snow'

/**
 * What the mountain's ways up share. Four of them throw the ball, and a
 * thrown ball is let go by the thing that was carrying it: it leaves with
 * that thing's own velocity at that instant and falls under one gravity
 * from there, so there is no kink where the carry ends and the flight
 * begins, and where it comes down is where the ledge is built.
 */

/** Cartoon gravity for everything this batch throws, cells a second squared. */
export const G = 22

/** A velocity from a motion function, by a centred difference. */
export function velocityOf(at: (t: number) => Pt, t: number, dt = 1e-4): Pt {
  const a = at(t - dt)
  const b = at(t + dt)
  return [(b[0] - a[0]) / (2 * dt), (b[1] - a[1]) / (2 * dt)]
}

export interface Flight {
  from: Pt
  to: Pt
  dur: number
  arc: number
  v: Pt
}

/** A ball let go at `from` moving at `v` (y down), falling under `g` until it is back down on the ball line `floor`. */
export function letGo(from: Pt, v: Pt, floor: number, g = G): Flight {
  const dur = (-v[1] + Math.sqrt(Math.max(0, v[1] * v[1] - 2 * g * (from[1] - floor)))) / g
  return { from, to: [from[0] + v[0] * dur, floor], dur, arc: (g * dur * dur) / 8, v }
}

/** The velocity that takes a ball from `from` to `to`, peaking `loft` over `to`. */
export function tossTo(from: Pt, to: Pt, loft: number, g = G): Flight {
  const up = Math.sqrt((2 * (from[1] - to[1] + loft)) / g)
  const dur = up + Math.sqrt((2 * loft) / g)
  const v: Pt = [(to[0] - from[0]) / dur, -g * up]
  return { from, to, dur, arc: (g * dur * dur) / 8, v }
}

export const flightSeg = (f: Flight): Seg => fly(f.from, f.to, f.dur, f.arc)

/** Where the ball's centre is `tau` seconds into a flight. */
export const flightAt = (f: Flight, tau: number, g = G): Pt => [f.from[0] + f.v[0] * tau, f.from[1] + f.v[1] * tau + (g * tau * tau) / 2]

/**
 * How far from the cell's middle a ledge at the ball line `floor` must keep
 * its near end for the ball to clear it on the way up: the ball's far side,
 * while any of it is level with the ledge's rail, and a little more.
 */
export function ledgeStart(f: Flight, floor: number, turn: 1 | -1, g = G): number {
  let reach = 0
  for (let i = 0; i <= 60; i++) {
    const tau = (f.dur * i) / 60
    const [x, y] = flightAt(f, tau, g)
    // Only on the way up, and only while the ball overlaps the rail's height.
    if (f.v[1] + g * tau > 0) break
    if (Math.abs(y - (floor + FLOOR)) < R + 0.01) reach = Math.max(reach, turn * x + R + 0.025)
  }
  return reach
}

/** The ledge a throw comes down on: rail from its near end to the cell's edge, on a post to the floor of the piece's own cell. */
export function ledge(p: p5, k: number, ink: string, weight: number, x0: number, x1: number, floor: number, postX: number, ground = 0.5): void {
  rail(p, k, ink, weight, x0, x1, floor + FLOOR)
  post(p, k, ink, weight, postX, floor + FLOOR, ground)
}

/** A second colour for a piece with two coloured parts: not snow, not the ball's, not the first. */
export function secondColor(theme: Theme, first: string, ball: string): string {
  const white = snowWhite(theme)
  return theme.colors.find((c) => c !== white && c !== ball && c !== first) ?? theme.colors.find((c) => c !== white && c !== first) ?? first
}

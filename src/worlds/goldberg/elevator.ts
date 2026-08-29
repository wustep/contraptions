import type p5 from 'p5'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, seg } from '../../core/ease'

/**
 * The shared elevator: guides, a sheave, a counterweight, and a cage.
 * Cascade, workshop and circus each decide who rides it.
 *
 * Units are cells, y down. `y` is the passenger's centre.
 */

export const GUIDE = 0.17
export const CAR_W = 0.38
export const CAR_H = 0.32
export const LIP = 0.18

/** Cascade: one token rides once a loop, boarding just after the machine fires. */
export const BOARD = 0.1
export const RIDE0 = 0.16
export const RIDE1 = 0.58
export const CLEAR = 0.62

/** How far the car has descended, in cells, from the top rail. */
export function rideTravel(t: number, floors: number): number {
  if (floors <= 0) return 0
  if (t < RIDE0) return 0
  if (t >= RIDE1) return floors
  return floors * easeInOutCubic(seg(t, RIDE0, RIDE1))
}

/** Passenger centre in this cell. Loose so the car can straddle the seam. */
export function carLocalY(travel: number, index: number): number | null {
  const y = travel - index
  if (y < -0.72 || y > 0.72) return null
  return y
}

/**
 * Workshop trains a part every half-loop. `v = (2u) mod 1` so the car
 * boards at the same beat the belts hand a part to centre, twice a loop.
 */
export function shopBeat(u: number): number {
  const v = (u * 2) % 1
  return v < 0 ? v + 1 : v
}

export function shopTravel(v: number, floors: number): number {
  if (floors <= 0) return 0
  if (v < 0.5) return 0
  if (v >= 0.75) return floors
  return floors * easeInOutCubic(seg(v, 0.5, 0.75))
}

export function guides(p: p5, k: number, ink: string, weight: number, y0: number, y1: number): void {
  outline(p, ink, weight)
  for (const x of [-GUIDE, GUIDE]) p.line(x * k, y0 * k, x * k, y1 * k)
}

export function sheave(p: p5, k: number, ink: string, weight: number, y: number, spin = 0): void {
  outline(p, ink, weight)
  p.line((-GUIDE - 0.05) * k, y * k, (GUIDE + 0.05) * k, y * k)
  p.push()
  p.translate(0, y * k)
  p.rotate(spin)
  outline(p, ink, weight)
  p.circle(0, 0, 0.11 * k)
  p.line(-0.055 * k, 0, 0.055 * k, 0)
  p.pop()
}

export function buffers(p: p5, k: number, ink: string, weight: number, y: number): void {
  outline(p, ink, weight)
  p.line((-GUIDE - 0.03) * k, y * k, (GUIDE + 0.03) * k, y * k)
  for (const x of [-0.07, 0.07]) {
    p.line(x * k, y * k, x * k, (y + 0.045) * k)
    p.line((x - 0.025) * k, (y + 0.045) * k, (x + 0.025) * k, (y + 0.045) * k)
  }
}

/** Short deck from the rail into the cage, so the hand-off is a lip, not a gap. */
export function landing(p: p5, k: number, ink: string, weight: number, fromX: number, toX: number, y: number): void {
  outline(p, ink, weight)
  p.line(fromX * k, y * k, toX * k, y * k)
}

/** Cage around a passenger at `y`. Ink slab, open sides, a roof, shoes on the guides. */
export function car(p: p5, k: number, ink: string, weight: number, color: string, y: number, seat = 0.13): void {
  const floor = y + seat
  const roof = floor - CAR_H
  const post = 0.04
  solid(p, ink, weight, ink)
  for (const x of [-CAR_W / 2, CAR_W / 2]) {
    p.rect(x * k, ((roof + floor) / 2) * k, post * k, (CAR_H + 0.02) * k)
  }
  p.rect(0, (roof - 0.01) * k, (CAR_W + 0.02) * k, 0.03 * k)
  outline(p, ink, weight)
  p.line((-CAR_W / 2 + 0.04) * k, (roof + CAR_H * 0.45) * k, (CAR_W / 2 - 0.04) * k, (roof + CAR_H * 0.45) * k)
  for (const x of [-GUIDE, GUIDE]) {
    p.line((x - 0.04) * k, (floor - 0.02) * k, (x + 0.04) * k, (floor - 0.02) * k)
    p.line((x - 0.04) * k, (roof + 0.02) * k, (x + 0.04) * k, (roof + 0.02) * k)
  }
  // Ink slab wider than the passenger, plus a coloured top. Same-colour
  // tokens ate the old sliver and the car vanished into a circle-in-a-box.
  solid(p, ink, weight, ink)
  p.rect(0, (floor + 0.055) * k, (CAR_W + 0.08) * k, 0.11 * k)
  solid(p, ink, weight, color)
  p.rect(0, (floor + 0.02) * k, (CAR_W + 0.08) * k, 0.04 * k)
}

export function counterweight(p: p5, k: number, ink: string, weight: number, color: string, y: number): void {
  outline(p, ink, weight)
  p.line(0.28 * k, (y - 0.08) * k, 0.28 * k, (y + 0.04) * k)
  solid(p, ink, weight, color)
  p.rect(0.28 * k, (y + 0.06) * k, 0.08 * k, 0.1 * k)
}

export function cable(p: p5, k: number, ink: string, weight: number, fromY: number, toY: number, x = 0): void {
  if (Math.abs(toY - fromY) < 0.02) return
  outline(p, ink, weight)
  p.line(x * k, fromY * k, x * k, toY * k)
}

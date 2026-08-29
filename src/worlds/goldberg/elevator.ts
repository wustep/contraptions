import type p5 from 'p5'
import { outline, solid } from '../../core/draw'
import { easeInOutCubic, seg } from '../../core/ease'

/**
 * The shared elevator: two guide rails, a sheave, and a cage. Cascade and
 * workshop each decide who rides it; this file only draws the machine.
 *
 * Units are cells, y down. The passenger sits on the car floor; `y` is the
 * passenger's centre so a ball and a square part can share the cage.
 */

export const GUIDE = 0.16
export const CAR_W = 0.34
export const CAR_H = 0.26

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

/** Passenger centre in this cell. Null when the car is fully in another cell. */
export function carLocalY(travel: number, index: number): number | null {
  const y = travel - index
  if (y < -0.62 || y > 0.62) return null
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
  p.line((-GUIDE - 0.04) * k, y * k, (GUIDE + 0.04) * k, y * k)
  p.push()
  p.translate(0, y * k)
  p.rotate(spin)
  outline(p, ink, weight)
  p.circle(0, 0, 0.1 * k)
  p.line(-0.05 * k, 0, 0.05 * k, 0)
  p.pop()
}

export function buffers(p: p5, k: number, ink: string, weight: number, y: number): void {
  outline(p, ink, weight)
  p.line((-GUIDE - 0.03) * k, y * k, (GUIDE + 0.03) * k, y * k)
  for (const x of [-0.08, 0.08]) {
    p.line(x * k, y * k, x * k, (y + 0.05) * k)
    p.line((x - 0.03) * k, (y + 0.05) * k, (x + 0.03) * k, (y + 0.05) * k)
  }
}

/** Cage around a passenger at `y`. Platform under it, open sides, a roof. */
export function car(p: p5, k: number, ink: string, weight: number, color: string, y: number, seat = 0.13): void {
  const floor = y + seat
  const roof = floor - CAR_H
  outline(p, ink, weight)
  p.line((-CAR_W / 2) * k, floor * k, (-CAR_W / 2) * k, roof * k)
  p.line((CAR_W / 2) * k, floor * k, (CAR_W / 2) * k, roof * k)
  p.line((-CAR_W / 2) * k, roof * k, (CAR_W / 2) * k, roof * k)
  p.line((-CAR_W / 2) * k, (roof + CAR_H * 0.45) * k, (CAR_W / 2) * k, (roof + CAR_H * 0.45) * k)
  solid(p, ink, weight, color)
  p.rect(0, (floor + 0.02) * k, CAR_W * k, 0.045 * k)
}

export function cable(p: p5, k: number, ink: string, weight: number, fromY: number, toY: number): void {
  if (toY <= fromY + 0.02) return
  outline(p, ink, weight)
  p.line(0, fromY * k, 0, toY * k)
}

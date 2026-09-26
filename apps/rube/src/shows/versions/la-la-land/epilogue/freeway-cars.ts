import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { FLOOR, puff, type Pt } from '../../../../parts'
import { type Ctx } from './kit'
import { beam, glow, hexA } from './rig'
import { PAINT } from './worlds'
import { BED_H, BUICK_FRONT_WHEEL, BUICK_LEN, BUS_LEN, CAR_LEN, CONV_LEN, GATE_LEN, PICKUP_LEN, X_P, bodyPt, poseAt, type Pose } from './freeway-road'

/**
 * The jam, car by car: each is drawn in its body cells (u along the road,
 * v up) through a `Pose`, so it sits on the grade and rides its springs.
 * The numbers the lane needs (where a roof is, where the rack's rail runs,
 * where the seat is) are exported, and the lane and the drawing read the
 * same ones.
 */

type UV = [number, number]

function shape(p: p5, k: number, ink: string, w: number, q: Pose, pts: UV[], fill: string | null, raw = false): void {
  if (fill === null) outline(p, ink, w)
  else solid(p, ink, w, fill)
  p.beginShape()
  for (const [u, v] of pts) {
    const [x, y] = bodyPt(q, u, v, raw)
    p.vertex(x * k, y * k)
  }
  p.endShape(p.CLOSE)
}

function seg(p: p5, k: number, q: Pose, a: UV, b: UV, raw = false): void {
  const [x0, y0] = bodyPt(q, a[0], a[1], raw)
  const [x1, y1] = bodyPt(q, b[0], b[1], raw)
  p.line(x0 * k, y0 * k, x1 * k, y1 * k)
}

/** A wheel: a dark tyre on an ink rim, a hub, turned by `turn` radians. */
function wheel(p: p5, c: Ctx, q: Pose, u: number, r: number, turn = 0): void {
  const { k, ink, weight } = c
  const [x, y] = bodyPt(q, u, r, true)
  solid(p, ink, weight, PAINT.deep)
  p.circle(x * k, y * k, 2 * r * k)
  outline(p, ink, weight * 0.6)
  p.circle(x * k, y * k, 0.9 * r * k)
  const a = turn - q.th
  p.line(x * k, y * k, (x + Math.cos(a) * r * 0.42) * k, (y + Math.sin(a) * r * 0.42) * k)
}

/** A tail light: a small red lamp on the rear face, and its glow when it pulses. */
function tailLamp(p: p5, c: Ctx, q: Pose, u: number, v: number, lit: number, size = 0.1): void {
  const { k, ink, weight } = c
  const [x, y] = bodyPt(q, u, v)
  if (lit > 0.02) glow(p, c, x - 0.05, y, 0.42 + 0.2 * lit, 0.5 * lit, PAINT.red)
  solid(p, ink, weight * 0.5, PAINT.red)
  p.rect(x * k, y * k, size * 0.6 * k, size * k)
}

const GLASS = hexA(PAINT.deep, 0.82)

/* ------------------------------------------------------------------ the pickup */

/** The rack's rail, and the bed floor the ball rides. */
export const RACK_V = 1.51
export const RACK_U0 = 0.05
export const RACK_U1 = 2.55
export const BED_LEN = 0.95
export const CAB_H = 1.45
/** The gate's hinge, on the bed floor at the tailgate. */
const HINGE: UV = [0, BED_H]
/**
 * The gate's angle, radians in the body plane (v up), from closed (straight up) to dropped (down and back onto the
 * road). The pickup sits nose-up on the ramp's foot, so its tail is a little under the street; the dropped gate lies
 * at whatever angle puts its tip on the street's surface.
 */
const GATE_UP = Math.PI / 2
const GATE_DOWN = (() => {
  const q = poseAt(X_P, PICKUP_LEN)
  let phi = Math.asin(BED_H / GATE_LEN)
  for (let i = 0; i < 12; i++) {
    const ut = -GATE_LEN * Math.cos(phi)
    const road = (q.y - FLOOR - ut * Math.sin(q.th)) / Math.cos(q.th)
    phi = Math.asin(Math.max(0.05, Math.min(GATE_LEN - 0.01, BED_H - road)) / GATE_LEN)
  }
  return Math.PI + phi
})()

export interface PickupState {
  /** The gate: 0 closed, 1 dropped; and a shiver on it. */
  gate: number
  shiver: number
  /** The horn's puff: seconds since it blew, or -1. */
  horn: number
  /** The rack's flex under a landing (v units). */
  flex: number
  tail: number
}

/** The tailgate's tip and the direction along it (tip → hinge), in body cells, for `gate` 0..1. */
export function gateLine(gate: number, shiver = 0): { tip: UV; dir: UV; normal: UV } {
  const a = GATE_UP + (GATE_DOWN - GATE_UP) * gate + shiver
  const tip: UV = [HINGE[0] + Math.cos(a) * GATE_LEN, HINGE[1] + Math.sin(a) * GATE_LEN]
  const dir: UV = [-Math.cos(a), -Math.sin(a)]
  // The face that is up when the gate is down: the direction turned a quarter toward v.
  const normal: UV = [-dir[1], dir[0]]
  return { tip, dir, normal }
}

/** A point on the gate's upper face at `s` (0 at the tip, 1 at the hinge), a ball's radius off it. */
export function onGate(s: number, gate: number, shiver: number, r: number): UV {
  const { tip, dir, normal } = gateLine(gate, shiver)
  return [tip[0] + dir[0] * GATE_LEN * s + normal[0] * r, tip[1] + dir[1] * GATE_LEN * s + normal[1] * r]
}

export function drawPickup(p: p5, c: Ctx, q: Pose, s: PickupState): void {
  const { k, ink, weight } = c
  const body = PAINT.timber
  wheel(p, c, q, 0.5, 0.3)
  wheel(p, c, q, 2.85, 0.3)
  // The far side of the bed and the body's lower band; the cab; the hood.
  shape(p, k, ink, weight, q, [[0, 0.36], [PICKUP_LEN, 0.36], [PICKUP_LEN, 0.62], [0, 0.62]], body)
  shape(p, k, ink, weight * 0.8, q, [[0, BED_H - 0.04], [BED_LEN, BED_H - 0.04], [BED_LEN, 0.72], [0, 0.72]], hexA(PAINT.deep, 0.55))
  shape(p, k, ink, weight, q, [[BED_LEN, 0.4], [BED_LEN, CAB_H], [2.3, CAB_H], [2.55, 0.98], [PICKUP_LEN - 0.1, 0.98], [PICKUP_LEN, 0.9], [PICKUP_LEN, 0.4]], body)
  // The cab's windows: the rear glass, the door glass; the door's line and handle.
  shape(p, k, ink, weight * 0.6, q, [[BED_LEN + 0.06, 1.0], [BED_LEN + 0.06, CAB_H - 0.07], [1.55, CAB_H - 0.07], [1.55, 1.0]], GLASS)
  shape(p, k, ink, weight * 0.6, q, [[1.65, 1.0], [1.65, CAB_H - 0.07], [2.28, CAB_H - 0.07], [2.48, 1.0]], GLASS)
  outline(p, ink, weight * 0.6)
  seg(p, k, q, [1.6, 0.4], [1.6, 0.98])
  seg(p, k, q, [1.72, 0.88], [1.9, 0.88])
  // The bumpers.
  shape(p, k, ink, weight * 0.7, q, [[PICKUP_LEN - 0.02, 0.32], [PICKUP_LEN + 0.08, 0.32], [PICKUP_LEN + 0.08, 0.46], [PICKUP_LEN - 0.02, 0.46]], PAINT.cream)
  shape(p, k, ink, weight * 0.7, q, [[-0.08, 0.32], [0.02, 0.32], [0.02, 0.46], [-0.08, 0.46]], PAINT.cream)
  // The rack: two posts and the rail over the bed and the cab, and the horn on its front post.
  const rail = RACK_V - 0.03 + s.flex
  outline(p, ink, weight * 0.9)
  seg(p, k, q, [0.12, 0.72], [0.12, rail])
  seg(p, k, q, [2.45, CAB_H], [2.45, rail])
  seg(p, k, q, [RACK_U0, rail], [RACK_U1, rail])
  seg(p, k, q, [RACK_U0, rail - 0.06], [RACK_U0, rail + 0.06])
  seg(p, k, q, [RACK_U1, rail - 0.06], [RACK_U1, rail + 0.06])
  shape(p, k, ink, weight * 0.7, q, [[2.45, 1.24], [2.66, 1.2], [2.66, 1.34], [2.45, 1.3]], PAINT.cream)
  if (s.horn >= 0 && s.horn < 1.1) {
    const [hx, hy] = bodyPt(q, 2.7, 1.27)
    const u = s.horn / 1.1
    p.push()
    ;(p.drawingContext as CanvasRenderingContext2D).globalAlpha = (1 - u) * (1 - u)
    puff(p, k, ink, weight * 0.7, PAINT.cream, hx + 0.1 + u * 0.7, hy - u * 0.25, 0.12 + u * 0.32)
    p.pop()
  }
  // The gate: a frame with bars, on its hinge at the bed's rear.
  const { tip, dir, normal } = gateLine(s.gate, s.shiver)
  const across = 0.07
  const at = (t: number, n: number): UV => [tip[0] + dir[0] * GATE_LEN * t + normal[0] * n, tip[1] + dir[1] * GATE_LEN * t + normal[1] * n]
  shape(p, k, ink, weight * 0.9, q, [at(0, -across), at(1, -across), at(1, across), at(0, across)], body)
  outline(p, ink, weight * 0.6)
  for (const t of [0.33, 0.66]) seg(p, k, q, at(t, -across), at(t, across))
  tailLamp(p, c, q, -0.02, 0.56, s.tail)
}

/** The bed's near side, in front of what rides in the bed. */
export function drawPickupOver(p: p5, c: Ctx, q: Pose): void {
  const { k, ink, weight } = c
  shape(p, k, ink, weight, q, [[-0.02, BED_H - 0.06], [BED_LEN, BED_H - 0.06], [BED_LEN, 0.58], [-0.02, 0.58]], PAINT.timber)
}

/* ------------------------------------------------------------------ the bus */

export const BUS_ROOF = 1.75
const BUS_WINDOWS = [0, 1, 2, 3, 4, 5, 6].map((i) => 0.95 + 0.6 * i)

export interface BusState {
  /** Each window's light, 0..1, and the flash on the bar. */
  lit: number[]
  flash: number
  tail: number
}

export function drawBus(p: p5, c: Ctx, q: Pose, s: BusState): void {
  const { k, ink, weight } = c
  wheel(p, c, q, 1.1, 0.36)
  wheel(p, c, q, 4.5, 0.36)
  // The body, its front corner rounded; the engine grille at the back; the door at the front.
  shape(p, k, ink, weight, q, [[0, 0.32], [BUS_LEN, 0.32], [BUS_LEN, BUS_ROOF - 0.3], [BUS_LEN - 0.1, BUS_ROOF - 0.08], [BUS_LEN - 0.3, BUS_ROOF], [0, BUS_ROOF]], PAINT.cream)
  shape(p, k, ink, weight * 0.6, q, [[0.08, 0.5], [0.42, 0.5], [0.42, 1.2], [0.08, 1.2]], hexA(PAINT.deep, 0.5))
  outline(p, ink, weight * 0.6)
  for (const v of [0.68, 0.86, 1.04]) seg(p, k, q, [0.12, v], [0.38, v])
  shape(p, k, ink, weight * 0.6, q, [[4.98, 0.42], [5.42, 0.42], [5.42, 1.5], [4.98, 1.5]], GLASS)
  outline(p, ink, weight * 0.5)
  seg(p, k, q, [5.2, 0.42], [5.2, 1.5])
  // The windows, dark until they light.
  for (let i = 0; i < BUS_WINDOWS.length; i++) {
    const u = BUS_WINDOWS[i]
    const lit = Math.min(1, s.lit[i] + s.flash)
    if (lit > 0.02) {
      const [gx, gy] = bodyPt(q, u + 0.22, 1.22)
      glow(p, c, gx, gy, 0.6, 0.28 * lit, PAINT.beam)
    }
    const fill = lit > 0.02 ? hexA(PAINT.beam, 0.35 + 0.65 * lit) : GLASS
    shape(p, k, ink, weight * 0.6, q, [[u, 0.95], [u + 0.44, 0.95], [u + 0.44, 1.5], [u, 1.5]], fill)
  }
  // The destination box over the door, lit with the flash; the stripe along the side; the bumpers.
  shape(p, k, ink, weight * 0.6, q, [[4.85, 1.54], [5.4, 1.54], [5.4, 1.7], [4.85, 1.7]], s.flash > 0.02 ? hexA(PAINT.beam, 0.5 + 0.5 * s.flash) : GLASS)
  outline(p, ink, weight * 0.6)
  seg(p, k, q, [0.5, 0.62], [4.9, 0.62])
  shape(p, k, ink, weight * 0.7, q, [[-0.08, 0.34], [0.02, 0.34], [0.02, 0.5], [-0.08, 0.5]], PAINT.deep)
  shape(p, k, ink, weight * 0.7, q, [[BUS_LEN - 0.02, 0.34], [BUS_LEN + 0.08, 0.34], [BUS_LEN + 0.08, 0.5], [BUS_LEN - 0.02, 0.5]], PAINT.deep)
  tailLamp(p, c, q, -0.02, 0.85, s.tail, 0.14)
}

/* ------------------------------------------------------------------ the chorus line */

export const CAR_ROOF = 1.0
export const CAR_LAND_U = 0.35
const COWL: UV = [0.85, 0.72]
const HOOD_LEN = CAR_LEN - COWL[0]

export interface CarState {
  /** The hood, 0 shut to 1 kicked up. */
  hood: number
  tail: number
}

export function drawCar(p: p5, c: Ctx, q: Pose, s: CarState): void {
  const { k, ink, weight } = c
  wheel(p, c, q, 0.25, 0.22)
  wheel(p, c, q, 1.0, 0.22)
  // A boxy little wagon: the lower body, the cabin with its glass, the engine bay under the hood.
  shape(p, k, ink, weight, q, [[0, 0.28], [CAR_LEN, 0.28], [CAR_LEN, COWL[1]], [COWL[0], COWL[1]], [COWL[0], CAR_ROOF], [0.24, CAR_ROOF], [0.16, 0.62], [0, 0.62]], PAINT.pink)
  shape(p, k, ink, weight * 0.55, q, [[0.26, 0.66], [0.26, CAR_ROOF - 0.06], [0.5, CAR_ROOF - 0.06], [0.5, 0.66]], GLASS)
  shape(p, k, ink, weight * 0.55, q, [[0.56, 0.66], [0.56, CAR_ROOF - 0.06], [0.8, CAR_ROOF - 0.06], [0.8, 0.66]], GLASS)
  if (s.hood > 0.02) shape(p, k, ink, weight * 0.6, q, [[COWL[0] + 0.03, 0.5], [CAR_LEN - 0.05, 0.5], [CAR_LEN - 0.05, COWL[1] - 0.02], [COWL[0] + 0.03, COWL[1] - 0.02]], hexA(PAINT.deep, 0.6))
  // The hood, hinged at the cowl, kicked up.
  const a = 0.95 * s.hood
  const tip: UV = [COWL[0] + Math.cos(a) * HOOD_LEN, COWL[1] + Math.sin(a) * HOOD_LEN]
  const n: UV = [-Math.sin(a) * 0.07, Math.cos(a) * 0.07]
  shape(p, k, ink, weight * 0.9, q, [COWL, tip, [tip[0] + n[0], tip[1] + n[1]], [COWL[0] + n[0], COWL[1] + n[1]]], PAINT.pink)
  tailLamp(p, c, q, -0.01, 0.48, s.tail, 0.08)
}

/* ------------------------------------------------------------------ the convertible */

/** The top's arms: their pivot in the body, their length, and the angle folded (on the deck) and raised (at the header). */
const PIVOT: UV = [1.0, 0.75]
const FOLDED: UV = [0.25, 0.85]
const RAISED: UV = [1.05, 1.5]
const ARM = Math.hypot(FOLDED[0] - PIVOT[0], FOLDED[1] - PIVOT[1])
export const TOP_FOLDED = Math.atan2(FOLDED[1] - PIVOT[1], FOLDED[0] - PIVOT[0])
export const TOP_RAISED = Math.atan2(RAISED[1] - PIVOT[1], RAISED[0] - PIVOT[0])
export const PANEL_LEN = 0.9
export const PANEL_T = 0.12
export const HEADER_U = 1.95
export const CONV_HOOD_V = (u: number): number => 0.9 - (0.1 * (u - 2.05)) / 0.65

/** Where the top's panel is (its rear lower corner) for the arms at angle `th`. */
export const panelAt = (th: number): UV => [PIVOT[0] + Math.cos(th) * ARM, PIVOT[1] + Math.sin(th) * ARM]

export interface ConvertibleState {
  th: number
  tail: number
}

export function drawConvertible(p: p5, c: Ctx, q: Pose, s: ConvertibleState): void {
  const { k, ink, weight } = c
  wheel(p, c, q, 0.5, 0.27)
  wheel(p, c, q, 2.25, 0.27)
  // A long low two-seater: the body with its deck, the well of the cabin, the seat backs, the raked windshield, the hood.
  shape(p, k, ink, weight, q, [[0, 0.3], [CONV_LEN, 0.3], [CONV_LEN, 0.8], [2.05, 0.9], [1.15, 0.9], [1.15, 0.85], [0.15, 0.85], [0, 0.78]], PAINT.sea)
  shape(p, k, ink, weight * 0.7, q, [[1.18, 0.62], [1.95, 0.62], [1.95, 0.88], [1.18, 0.88]], hexA(PAINT.deep, 0.6))
  for (const u of [1.32, 1.72]) shape(p, k, ink, weight * 0.7, q, [[u, 0.86], [u + 0.16, 0.86], [u + 0.14, 1.08], [u + 0.02, 1.08]], PAINT.sea)
  shape(p, k, ink, weight * 0.6, q, [[2.05, 0.9], [2.1, 0.9], [HEADER_U + 0.05, 1.5], [HEADER_U, 1.5]], hexA(PAINT.cream, 0.35))
  outline(p, ink, weight * 0.8)
  seg(p, k, q, [HEADER_U - 0.02, 1.5], [HEADER_U + 0.12, 1.5])
  // The arms and the panel.
  const a = panelAt(s.th)
  outline(p, ink, weight * 0.9)
  seg(p, k, q, PIVOT, a)
  seg(p, k, q, [PIVOT[0] + 0.5, PIVOT[1]], [a[0] + 0.5, a[1]])
  shape(p, k, ink, weight * 0.9, q, [a, [a[0] + PANEL_LEN, a[1]], [a[0] + PANEL_LEN, a[1] + PANEL_T], [a[0], a[1] + PANEL_T]], PAINT.deep)
  shape(p, k, ink, weight * 0.7, q, [[-0.08, 0.34], [0.02, 0.34], [0.02, 0.48], [-0.08, 0.48]], PAINT.cream)
  shape(p, k, ink, weight * 0.7, q, [[CONV_LEN - 0.02, 0.34], [CONV_LEN + 0.08, 0.34], [CONV_LEN + 0.08, 0.48], [CONV_LEN - 0.02, 0.48]], PAINT.cream)
  tailLamp(p, c, q, -0.02, 0.62, s.tail, 0.09)
}

/* ------------------------------------------------------------------ the Buick */

export const TRUNK_V = 0.66
export const TRUNK_U0 = 0.1
export const TRUNK_U1 = 0.82
export const SEAT_U = 1.25
export const SEAT_V = 0.6
const DOOR_TOP = 0.64

export interface BuickState {
  turn: number
  /** The headlamps, 0..1; the brake lights; the tail pulse. */
  lamp: number
  brake: number
  tail: number
  /** Exhaust: seconds since each puff, for the ones that are still hanging. */
  puffs: number[]
}

export function drawBuick(p: p5, c: Ctx, q: Pose, s: BuickState): void {
  const { k, ink, weight } = c
  wheel(p, c, q, 0.75, 0.3, s.turn)
  wheel(p, c, q, BUICK_FRONT_WHEEL, 0.3, s.turn)
  // Long and low and red: the rear deck, the well of the seats, the low speedster screen, the long hood to a rounded nose.
  shape(p, k, ink, weight, q, [[0, 0.3], [BUICK_LEN - 0.1, 0.3], [BUICK_LEN, 0.42], [BUICK_LEN, 0.56], [BUICK_LEN - 0.15, 0.62], [1.6, 0.7], [1.55, 0.7], [1.55, DOOR_TOP], [0.85, DOOR_TOP], [0.85, TRUNK_V + 0.02], [TRUNK_U0, TRUNK_V + 0.02], [0, 0.6]], PAINT.red)
  // Inside the well: the dark of the footwell, the bench, the seat back.
  shape(p, k, ink, weight * 0.7, q, [[0.88, 0.5], [1.55, 0.5], [1.55, DOOR_TOP], [0.88, DOOR_TOP]], hexA(PAINT.deep, 0.65))
  shape(p, k, ink, weight * 0.7, q, [[0.86, SEAT_V - 0.02], [1.5, SEAT_V - 0.02], [1.5, SEAT_V + 0.06], [0.86, SEAT_V + 0.06]], PAINT.cream)
  shape(p, k, ink, weight * 0.7, q, [[0.86, SEAT_V], [1.0, SEAT_V], [0.98, 0.9], [0.9, 0.9]], PAINT.cream)
  // The screen: a low lip of glass along the cowl.
  shape(p, k, ink, weight * 0.55, q, [[1.5, 0.7], [1.66, 0.7], [1.62, 0.72], [1.48, 0.72]], hexA(PAINT.cream, 0.5))
  // Chrome: the side strip, the bumpers, the grille.
  outline(p, ink, weight * 0.55)
  seg(p, k, q, [0.2, 0.5], [BUICK_LEN - 0.2, 0.5])
  shape(p, k, ink, weight * 0.7, q, [[-0.08, 0.32], [0.04, 0.32], [0.04, 0.46], [-0.08, 0.46]], PAINT.cream)
  shape(p, k, ink, weight * 0.7, q, [[BUICK_LEN - 0.04, 0.32], [BUICK_LEN + 0.08, 0.32], [BUICK_LEN + 0.08, 0.46], [BUICK_LEN - 0.04, 0.46]], PAINT.cream)
  // The headlamp and its beam ahead, when lit.
  const [lx, ly] = bodyPt(q, BUICK_LEN - 0.02, 0.52)
  if (s.lamp > 0.02) {
    const [tx, ty] = bodyPt(q, BUICK_LEN + 3.2, 0.5)
    beam(p, c, [lx, ly], [tx, ty], 0.9, 0.3 * s.lamp)
  }
  solid(p, ink, weight * 0.6, s.lamp > 0.3 ? PAINT.beam : PAINT.cream)
  p.rect(lx * k, ly * k, 0.07 * k, 0.12 * k)
  // The tail lamp: a strip across the rear, red with the brakes on, pulsing with the jam.
  tailLamp(p, c, q, -0.01, 0.52, Math.max(s.tail, s.brake), 0.16)
  // Exhaust.
  for (const age of s.puffs) {
    if (age < 0 || age > 1.3) continue
    const u = age / 1.3
    const [ex, ey] = bodyPt(q, -0.05, 0.24)
    p.push()
    ;(p.drawingContext as CanvasRenderingContext2D).globalAlpha = 1 - u
    puff(p, k, ink, weight * 0.7, PAINT.cream, ex - 0.15 - age * 0.55, ey - age * 0.3, 0.08 + age * 0.14)
    p.pop()
  }
}

/** The near door, in front of whoever sits in the seat: up to the door's top, a chrome line along it. */
export function drawBuickOver(p: p5, c: Ctx, q: Pose): void {
  const { k, ink, weight } = c
  shape(p, k, ink, weight, q, [[0.82, 0.42], [1.58, 0.42], [1.58, DOOR_TOP], [0.82, DOOR_TOP]], PAINT.red)
  outline(p, ink, weight * 0.55)
  seg(p, k, q, [0.86, 0.5], [1.54, 0.5])
}

export type { Pt }

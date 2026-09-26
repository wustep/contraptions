import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { outline, solid } from '../../../../../../../../src/core/draw'
import type { Ctx } from '../kit'
import { ROAD } from '../worlds'
import { cone, glow, hexA, lit } from './crash-paint'

/**
 * The two vehicles of the drive, drawn in their own body cells (after Epilogue's freeway cars): the rental car
 * Andrew races in, and the truck that hits it. `crash.ts` moves them and says how damaged, lit and open they are;
 * the numbers its lane needs (where the seat is, where the box a tumble rolls on is) are here, so the lane and the
 * drawing read the same ones.
 *
 * The car: u runs from the rear bumper forward to the nose (the car faces right), v up from the road. It is posed
 * as a rigid body turned by `th` (radians, the screen's sense: negative turns its nose up) about its middle, CM,
 * standing at (x, y) in the part's frame; so a drive, a pitch and a tumble are all one pose.
 */

export const CAR_LEN = 3.6
export const CAR_H = 1.345
/** The car's middle: the point it turns about, and the middle of the box it tumbles as. */
export const CM: Pt = [CAR_LEN / 2, CAR_H / 2]
/** Where Andrew sits, behind the wheel, in the front side window. */
export const SEAT: Pt = [2.1, 0.98]
/** How far the roof is pressed down once the car has rolled (its top then at CAR_H - CRUSHED). */
export const CRUSHED = 0.1
/** Where he lies when the car is on its roof: on the (pressed-down) roof's lining, inside. */
export const LINER: Pt = [2.05, CAR_H - CRUSHED - 0.13 - 0.02]
export const WHEEL_R = 0.3
export const WHEELS = [0.72, 2.85]
/** The front door: hinged at its front edge, over the seat. */
export const DOOR = { u0: 1.78, u1: 2.72, v0: 0.3, v1: 0.9 }

export interface CarPose {
  x: number
  y: number
  th: number
}

export interface CarLook {
  /** How lit the paint is (the sodium lamps overhead, the dark): 0..1+. */
  light: number
  /** The wheels' turn, radians. */
  turn: number
  /** The front door: 0 shut, 1 swung wide. */
  door: number
  /** Headlamps and the brake lamps, 0..1. */
  lamps: number
  brake: number
  /** The damage: the nose crumpled, the glass gone, the roof crushed, each 0..1. */
  nose: number
  glass: number
  roof: number
  /** One front wheel, spinning on after the car has stopped (radians), when set. */
  spin?: number
}

/** A body point of the car in the part's frame. */
export function carPt(q: CarPose, u: number, v: number): Pt {
  const du = u - CM[0]
  const dv = v - CM[1]
  const c = Math.cos(q.th)
  const s = Math.sin(q.th)
  return [q.x + du * c + dv * s, q.y + du * s - dv * c]
}

/** The car's box corners (tail-bottom, nose-bottom, nose-top, tail-top) in the part's frame: what a tumble rolls on. */
export function carBox(q: CarPose): Pt[] {
  return [carPt(q, 0, 0), carPt(q, CAR_LEN, 0), carPt(q, CAR_LEN, CAR_H), carPt(q, 0, CAR_H)]
}

type UV = [number, number]

/** The crumple: the nose's points pulled back toward the cowl, the hood kinked up. */
function crumple(u: number, v: number, nose: number): UV {
  if (nose <= 0 || u <= 2.86) return [u, v]
  const f = (u - 2.86) / (CAR_LEN - 2.86)
  const nu = 2.86 + (u - 2.86) * (1 - 0.42 * nose)
  const kink = v > 0.7 ? 0.16 * nose * Math.sin(Math.PI * Math.min(1, f * 1.3)) : 0
  return [nu, v + kink]
}
/** The roof pressed down toward the belt line: `roof` 1 is CRUSHED at the top. */
const crush = (u: number, v: number, roof: number): UV => (roof > 0 && v > 0.9 ? [u, v - CRUSHED * roof * ((v - 0.9) / (CAR_H - 0.9))] : [u, v])

export function drawCar(p: p5, c: Ctx, q: CarPose, s: CarLook): void {
  const { k, weight } = c
  const L = Math.max(0, s.light)
  const ink = lit(c, c.ink, Math.min(1, 0.35 + 0.65 * L))
  const paint = lit(c, ROAD.car, Math.min(1.15, 0.28 + 0.72 * L))
  const bend = (u: number, v: number): UV => {
    const a = crumple(u, v, s.nose)
    return crush(a[0], a[1], s.roof)
  }
  const pt = (u: number, v: number): Pt => {
    const [bu, bv] = bend(u, v)
    return carPt(q, bu, bv)
  }
  const shape = (pts: UV[]) => {
    p.beginShape()
    for (const [u, v] of pts) {
      const [x, y] = pt(u, v)
      p.vertex(x * k, y * k)
    }
    p.endShape(p.CLOSE)
  }
  const line = (a: UV, b: UV) => {
    const [x0, y0] = pt(a[0], a[1])
    const [x1, y1] = pt(b[0], b[1])
    p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  }
  p.push()
  // The wheels, behind the body's skirt.
  for (let i = 0; i < 2; i++) wheel(p, c, q, WHEELS[i], i === 1 && s.spin !== undefined ? s.spin : s.turn, L, ink)
  // The body: the trunk, the greenhouse, the long hood; wheel arches cut into its skirt.
  const body: UV[] = [[0.05, 0.3], [0.0, 0.44], [0.02, 0.66], [0.12, 0.8], [0.8, 0.86], [1.2, 1.29], [1.34, CAR_H], [2.28, CAR_H], [2.42, 1.29], [2.86, 0.9], [3.44, 0.83], [3.57, 0.75], [CAR_LEN, 0.56], [3.57, 0.34], [3.48, 0.3]]
  for (const [cx, dir] of [[WHEELS[1], 1], [WHEELS[0], 1]] as const) {
    void dir
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI
      body.push([cx + Math.cos(a) * 0.37, 0.3 + Math.sin(a) * 0.1 + (i > 0 && i < 8 ? Math.sin(a) * 0.12 : 0)])
    }
  }
  solid(p, ink, weight, paint)
  shape(body)
  // The glass: the rear side window and the front, a pillar between; broken glass is a dark hole with a few teeth.
  const glass = s.glass > 0.5 ? hexA(ROAD.deep, 0.92) : hexA(mixHex(ROAD.deep, ROAD.car, 0.25 + 0.2 * L), 0.9)
  solid(p, ink, weight * 0.6, glass)
  shape([[0.9, 0.9], [1.24, 1.26], [1.34, 1.29], [1.72, 1.29], [1.72, 0.9]])
  shape([[1.8, 0.9], [1.8, 1.29], [2.3, 1.29], [2.4, 1.25], [2.74, 0.92], [2.74, 0.9]])
  if (s.glass < 0.5) {
    // A glint across each pane: the lamps' light on the glass.
    p.stroke(hexA(ROAD.paint, 0.18 + 0.25 * Math.min(1, L)))
    p.strokeWeight(weight * 0.8)
    line([1.1, 0.96], [1.3, 1.22])
    line([2.02, 0.95], [2.28, 1.24])
  } else {
    p.noStroke()
    p.fill(hexA(ROAD.paint, 0.35))
    for (const [a, b, cc] of [[[0.92, 0.92], [1.04, 0.92], [0.97, 1.02]], [[1.62, 1.28], [1.71, 1.28], [1.7, 1.16]], [[2.6, 0.92], [2.73, 0.92], [2.68, 1.02]], [[1.81, 1.27], [1.93, 1.28], [1.82, 1.18]]] as UV[][]) shape([a, b, cc])
  }
  // The seams: the trunk lid, the doors, the hood.
  outline(p, ink, weight * 0.55)
  line([0.8, 0.86], [0.78, 0.62])
  line([0.9, 0.86], [0.9, 0.34])
  line([1.76, 0.9], [1.76, 0.34])
  line([2.86, 0.9], [2.8, 0.34])
  // The bumpers: dark bands across the ends.
  solid(p, ink, weight * 0.6, lit(c, ROAD.asphalt, 0.5 + 0.5 * L))
  shape([[-0.03, 0.3], [0.18, 0.3], [0.18, 0.44], [-0.03, 0.44]])
  shape([[3.42, 0.3], [3.62, 0.3], [3.62, 0.44], [3.42, 0.44]])
  // The lamps: a pale headlamp at the nose, a red one at the tail; lit, and their light.
  const head = pt(3.56, 0.64)
  const nose = pt(4.4, 0.62)
  const dir: Pt = [nose[0] - head[0], nose[1] - head[1]]
  solid(p, ink, weight * 0.5, s.lamps > 0.2 ? mixHex(ROAD.paint, '#FFFFFF', 0.4 * s.lamps) : lit(c, ROAD.paint, 0.5 + 0.4 * L))
  shape([[3.46, 0.6], [3.585, 0.6], [3.59, 0.7], [3.48, 0.72]])
  const tail = s.brake > 0.05 ? mixHex(ROAD.brake, '#FF6A55', 0.5 * s.brake) : lit(c, ROAD.brake, 0.45 + 0.4 * L)
  solid(p, ink, weight * 0.5, tail)
  shape([[0.0, 0.5], [0.1, 0.5], [0.12, 0.64], [0.02, 0.64]])
  if (s.lamps > 0.01) {
    const [hx, hy] = head
    const n = Math.hypot(dir[0], dir[1]) || 1
    cone(p, c, [hx, hy], [hx + (dir[0] / n) * 6.5, hy + (dir[1] / n) * 6.5 + 0.35], 0.18, 2.4, 0.2 * s.lamps, ROAD.paint)
    glow(p, c, hx, hy, 0.45, 0.45 * s.lamps, ROAD.paint)
  }
  if (s.brake > 0.01) {
    const [tx, ty] = pt(0.04, 0.57)
    glow(p, c, tx, ty, 0.6, 0.4 * s.brake, ROAD.brake)
  }
  // The mirror at the foot of the windshield.
  solid(p, ink, weight * 0.5, paint)
  shape([[2.66, 0.9], [2.8, 0.93], [2.8, 1.02], [2.7, 1.0]])
  // The door open: where it was, the dark of the cabin, the driver's seat in it (its cushion and its back).
  if (s.door > 0.01) {
    solid(p, ink, weight * 0.6, lit(c, mixHex(ROAD.deep, ROAD.asphalt, 0.4), 0.6 + 0.4 * L))
    shape([[DOOR.u0, DOOR.v0 + 0.04], [DOOR.u1 + 0.02, DOOR.v0 + 0.04], [DOOR.u1 + 0.02, 0.92], [2.4, 1.25], [2.3, 1.29], [DOOR.u0, 1.29]])
    const seat = lit(c, mixHex(ROAD.asphalt, ROAD.truck, 0.25), 0.5 + 0.5 * L)
    solid(p, ink, weight * 0.5, seat)
    shape([[1.84, SEAT[1] - 0.2], [2.5, SEAT[1] - 0.2], [2.46, SEAT[1] - 0.1], [1.86, SEAT[1] - 0.1]])
    shape([[1.8, SEAT[1] - 0.2], [1.94, SEAT[1] - 0.2], [1.9, 1.24], [1.82, 1.26], [1.78, 1.2]])
  }
  p.pop()
}

/** What stands in front of him while he sits: the door's lower panel (and its handle), shut or open. */
export function drawCarOver(p: p5, c: Ctx, q: CarPose, s: CarLook): void {
  const { k, weight } = c
  const L = Math.max(0, s.light)
  const ink = lit(c, c.ink, Math.min(1, 0.35 + 0.65 * L))
  const paint = lit(c, ROAD.car, Math.min(1.15, 0.28 + 0.72 * L))
  const pt = (u: number, v: number): Pt => {
    const a = crumple(u, v, s.nose)
    const b = crush(a[0], a[1], s.roof)
    return carPt(q, b[0], b[1])
  }
  const shape = (pts: UV[]) => {
    p.beginShape()
    for (const [u, v] of pts) {
      const [x, y] = pt(u, v)
      p.vertex(x * k, y * k)
    }
    p.endShape(p.CLOSE)
  }
  p.push()
  // The door: its width foreshortened as it swings out on the hinge at its front edge.
  const open = Math.max(0, Math.min(1, s.door))
  const w = (DOOR.u1 - DOOR.u0) * Math.cos(open * 1.25)
  const u0 = DOOR.u1 - w
  const lift = 0.05 * open
  if (open < 0.02) {
    solid(p, ink, weight * 0.7, paint)
    shape([[DOOR.u0, DOOR.v0 + 0.04], [DOOR.u1 + 0.06, DOOR.v0 + 0.04], [DOOR.u1 + 0.08, 0.9], [DOOR.u0, 0.9]])
    solid(p, ink, weight * 0.45, lit(c, ROAD.asphalt, 0.6 + 0.4 * L))
    shape([[1.9, 0.76], [2.1, 0.76], [2.1, 0.8], [1.9, 0.8]])
  } else {
    // Swung out on its front hinge: its skin narrowed toward the hinge, its free edge (a dark strip) nearer the
    // house and so a little taller; the empty window frame over it.
    const edge = lit(c, mixHex(ROAD.car, ROAD.deep, 0.55), 0.4 + 0.6 * L)
    solid(p, ink, weight * 0.7, paint)
    shape([[u0, DOOR.v0 - lift], [DOOR.u1 + 0.06, DOOR.v0 + 0.04], [DOOR.u1 + 0.08, 0.9], [u0, 0.9 + lift]])
    solid(p, ink, weight * 0.5, edge)
    shape([[u0 - 0.06, DOOR.v0 - lift], [u0, DOOR.v0 - lift], [u0, 0.9 + lift], [u0 - 0.06, 0.9 + lift]])
    outline(p, ink, weight * 0.6)
    const a = pt(u0, 0.9 + lift)
    const b = pt(u0 + w * 0.12, 1.29 + lift)
    const cc = pt(DOOR.u1 + 0.02, 1.27)
    p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
    p.line(b[0] * k, b[1] * k, cc[0] * k, cc[1] * k)
    solid(p, ink, weight * 0.45, lit(c, ROAD.asphalt, 0.6 + 0.4 * L))
    shape([[u0 + w * 0.2, 0.76], [u0 + w * 0.2 + 0.12 * Math.cos(open * 1.25) + 0.03, 0.76], [u0 + w * 0.2 + 0.12 * Math.cos(open * 1.25) + 0.03, 0.8], [u0 + w * 0.2, 0.8]])
  }
  p.pop()
}

function wheel(p: p5, c: Ctx, q: CarPose, u: number, turn: number, L: number, ink: string): void {
  const { k, weight } = c
  const [x, y] = carPt(q, u, WHEEL_R)
  solid(p, ink, weight, lit(c, ROAD.asphalt, 0.7 + 0.3 * Math.min(1, L)))
  p.circle(x * k, y * k, 2 * WHEEL_R * k)
  solid(p, ink, weight * 0.6, lit(c, mixHex(ROAD.car, ROAD.paint, 0.4), 0.35 + 0.65 * Math.min(1, L)))
  p.circle(x * k, y * k, 1.05 * WHEEL_R * k)
  // Five spokes, turning: they show the speed, and a wheel spinning on after the crash.
  outline(p, ink, weight * 0.55)
  for (let i = 0; i < 5; i++) {
    const a = turn + q.th + (i / 5) * Math.PI * 2
    p.line(x * k, y * k, (x + Math.cos(a) * WHEEL_R * 0.5) * k, (y + Math.sin(a) * WHEEL_R * 0.5) * k)
  }
}

/* ------------------------------------------------------------------ the truck */

/**
 * The truck: a conventional tractor (a long hood, the cab, a sleeper) and its trailer, facing left. s runs from its
 * front bumper back (to the right), v up from the road; `x` is where the bumper's face is.
 */
export const TRUCK_LEN = 13.2
export const TRUCK_WHEELS = [1.05, 4.35, 5.4, 11.3, 12.35]
const TRUCK_R = 0.48

export interface TruckLook {
  light: number
  /** Headlamps (0..1) and a flash of the high beams (0..1). */
  lamps: number
  flash: number
  turn: number
  /** The bumper and grille pushed in by the hit, 0..1. */
  dent: number
  /** Its nose dipping on the brakes (cells at the bumper). */
  dive: number
}

export function drawTruck(p: p5, c: Ctx, x: number, road: number, s: TruckLook): void {
  const { k, weight } = c
  const L = Math.max(0, s.light)
  const ink = lit(c, c.ink, Math.min(1, 0.3 + 0.7 * L))
  const cream = lit(c, ROAD.truck, Math.min(1.1, 0.22 + 0.78 * L))
  const shade = lit(c, mixHex(ROAD.truck, ROAD.deep, 0.45), Math.min(1.1, 0.25 + 0.75 * L))
  // The body rides its springs: the nose dips by `dive` at the bumper, nothing at the back.
  const at = (sx: number, v: number): Pt => [x + sx, road - v + s.dive * Math.max(0, 1 - sx / 6) * (v > 0.5 ? 1 : 0)]
  const shape = (pts: [number, number][]) => {
    p.beginShape()
    for (const [a, b] of pts) {
      const [px, py] = at(a, b)
      p.vertex(px * k, py * k)
    }
    p.endShape(p.CLOSE)
  }
  p.push()
  // The trailer: a long box on its bogie at the back, its landing legs up.
  solid(p, ink, weight, shade)
  shape([[3.55, 1.25], [TRUCK_LEN, 1.25], [TRUCK_LEN, 4.15], [3.55, 4.15]])
  outline(p, lit(c, ROAD.truck, 0.25 + 0.3 * L), weight * 0.5)
  for (let i = 1; i < 8; i++) {
    const a = at(3.55 + i * 1.2, 1.3)
    const b = at(3.55 + i * 1.2, 4.1)
    p.line(a[0] * k, a[1] * k, b[0] * k, b[1] * k)
  }
  solid(p, ink, weight * 0.6, lit(c, ROAD.asphalt, 0.6 + 0.4 * L))
  shape([[10.6, 0.85], [TRUCK_LEN - 0.1, 0.85], [TRUCK_LEN - 0.1, 1.25], [10.6, 1.25]])
  // The tractor: the frame, the fuel tank and the step, the sleeper, the cab, the long hood and its grille.
  shape([[0.3, 0.72], [6.1, 0.72], [6.1, 1.0], [0.3, 1.0]])
  solid(p, ink, weight * 0.7, lit(c, mixHex(ROAD.paint, ROAD.car, 0.3), 0.3 + 0.7 * L))
  shape([[2.35, 0.62], [3.5, 0.62], [3.5, 1.02], [2.35, 1.02]])
  solid(p, ink, weight, cream)
  shape([[3.0, 1.0], [4.35, 1.0], [4.35, 3.35], [3.0, 3.35]])
  shape([[1.75, 1.0], [3.05, 1.0], [3.05, 3.1], [2.05, 3.1], [1.82, 2.2]])
  const dent = 0.25 * s.dent
  shape([[0.12 + dent, 0.95], [1.82, 0.95], [1.82, 2.2], [0.3 + dent * 0.6, 2.05], [0.12 + dent, 1.85]])
  // The windshield and the door's glass: dark, with the lamps' glint.
  solid(p, ink, weight * 0.6, hexA(ROAD.deep, 0.9))
  shape([[1.95, 2.25], [2.12, 3.0], [2.55, 3.0], [2.55, 2.25]])
  outline(p, ink, weight * 0.55)
  const d0 = at(2.65, 1.1)
  const d1 = at(2.65, 3.05)
  p.line(d0[0] * k, d0[1] * k, d1[0] * k, d1[1] * k)
  // The grille: chrome bars, the bumper under it.
  solid(p, ink, weight * 0.6, lit(c, mixHex(ROAD.paint, ROAD.deep, 0.3), 0.3 + 0.7 * L))
  shape([[0.1 + dent, 1.15], [0.34 + dent * 0.6, 1.15], [0.34 + dent * 0.6, 1.9], [0.1 + dent, 1.8]])
  solid(p, ink, weight * 0.7, lit(c, ROAD.paint, 0.35 + 0.6 * L))
  shape([[-0.05 + dent, 0.62], [0.55, 0.62], [0.55, 0.98], [-0.05 + dent, 0.98]])
  // The exhaust stack behind the cab.
  solid(p, ink, weight * 0.6, lit(c, ROAD.paint, 0.35 + 0.5 * L))
  shape([[3.1, 3.3], [3.22, 3.3], [3.22, 4.2], [3.1, 4.2]])
  // The wheels.
  for (const w of TRUCK_WHEELS) {
    const [wx, wy] = [x + w, road - TRUCK_R]
    solid(p, ink, weight, lit(c, ROAD.asphalt, 0.75 + 0.25 * L))
    p.circle(wx * k, wy * k, 2 * TRUCK_R * k)
    solid(p, ink, weight * 0.6, lit(c, ROAD.paint, 0.3 + 0.5 * L))
    p.circle(wx * k, wy * k, 0.9 * TRUCK_R * k)
    outline(p, ink, weight * 0.5)
    for (let i = 0; i < 6; i++) {
      const a = s.turn + (i / 6) * Math.PI * 2
      p.line(wx * k, wy * k, (wx + Math.cos(a) * TRUCK_R * 0.4) * k, (wy + Math.sin(a) * TRUCK_R * 0.4) * k)
    }
  }
  // The headlamps: two stacked rectangles either side of the grille, and their throw down the road.
  const on = Math.min(1, s.lamps + s.flash)
  solid(p, ink, weight * 0.5, on > 0.2 ? mixHex(ROAD.paint, '#FFFFFF', 0.5 * on) : lit(c, ROAD.paint, 0.4 + 0.4 * L))
  shape([[0.36 + dent * 0.5, 1.2], [0.62, 1.2], [0.62, 1.42], [0.36 + dent * 0.5, 1.42]])
  if (on > 0.01) {
    const [hx, hy] = at(0.4, 1.31)
    cone(p, c, [hx, hy], [hx - 15, hy + 1.05], 0.3, 5.2, 0.17 * s.lamps + 0.3 * s.flash, ROAD.paint)
    glow(p, c, hx, hy, 0.9 + 1.4 * s.flash, 0.5 * on + 0.3 * s.flash, ROAD.paint)
  }
  // The running lamps along the cab's roof: small amber blocks.
  p.noStroke()
  p.fill(lit(c, ROAD.sodium, 0.5 + 0.5 * Math.min(1, s.lamps + 0.3)))
  for (const sx of [2.2, 2.4, 2.6]) {
    const [rx, ry] = at(sx, 3.12)
    p.rect(rx * k, ry * k, 0.1 * k, 0.05 * k)
  }
  p.pop()
}

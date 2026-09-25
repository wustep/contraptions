import type p5 from 'p5'
import { outline, solid } from '../../../../../../../src/core/draw'
import { FLOOR, type Pt } from '../../../../parts'
import { frame, hash, knock, lastOf, type Ctx } from './kit'
import { flat, glow, hexA } from './rig'
import { PAINT } from './worlds'
import { BEATS, GATE_FOOT, JOINTS, LIGHTS_UP, STOP, driveAt, isBar } from './freeway-clock'

/**
 * The on-ramp: where it stands and how it is drawn. A level street out of the
 * club's door, a ramp rising RAMP_H over RAMP_X0..RAMP_X1 (a run with rounded
 * ends, so the jam sits on one grade), and the freeway level along the top to
 * the deck's end. Everything on it is placed in body cells (u along the road,
 * uphill; v up from the road) through a `Pose`, so a car on the grade tilts
 * with it and what rides the car rides the tilt.
 *
 * Behind it all, the flat: a magic-hour sky, the towers small and far, palms
 * in silhouette. The whole set is lit on the swing's first downbeat.
 */

export const RAMP_X0 = 3.0
export const RAMP_X1 = 24.0
export const RAMP_H = 5.0
const EASE = 0.22

const NORM = 1 - EASE
function rise(u: number): number {
  if (u <= 0) return 0
  if (u >= 1) return 1
  let f: number
  if (u < EASE) f = (u * u) / (2 * EASE)
  else if (u <= 1 - EASE) f = EASE / 2 + (u - EASE)
  else {
    const w = 1 - u
    f = NORM - (w * w) / (2 * EASE)
  }
  return f / NORM
}
function riseSlope(u: number): number {
  if (u <= 0 || u >= 1) return 0
  if (u < EASE) return u / EASE / NORM
  if (u <= 1 - EASE) return 1 / NORM
  return (1 - u) / EASE / NORM
}

/** The road's surface at x (a ball rolling on it has its centre R above). */
export const road = (x: number): number => FLOOR - RAMP_H * rise((x - RAMP_X0) / (RAMP_X1 - RAMP_X0))
/** The grade at x, dy/dx (negative going up). */
export const grade = (x: number): number => (-RAMP_H * riseSlope((x - RAMP_X0) / (RAMP_X1 - RAMP_X0))) / (RAMP_X1 - RAMP_X0)
/** How much a body standing on the road at x tilts, radians, nose up. */
export const tilt = (x: number): number => Math.atan(-grade(x))
/** The surface's height along the top. */
export const TOP_Y = road(RAMP_X1)

/* ------------------------------------------------------------------ poses */

/** A body on the road: its rear on the road at x, tilted with the grade under its middle, lifted on its springs. */
export interface Pose {
  x: number
  y: number
  th: number
  /** The lift at the rear and at the front (v units; negative is a squat), blended along the body. */
  lr: number
  lf: number
  len: number
}

/** A body of length `len` with its rear at x: it tilts with the chord of the road under its wheels, and sits on it. */
export function poseAt(x: number, len: number, lr = 0, lf = 0): Pose {
  const a = 0.14 * len
  const b = 0.86 * len
  const y0 = road(x + a)
  const y1 = road(x + b)
  const th = Math.atan2(y0 - y1, b - a)
  return { x, y: y0 + a * Math.sin(th), th, lr, lf, len }
}

/** A body point (u along, v up) of a pose, in the part's frame. `raw` ignores the springs: the wheels. */
export function bodyPt(q: Pose, u: number, v: number, raw = false): Pt {
  const lift = raw ? 0 : q.lr + (q.lf - q.lr) * Math.max(0, Math.min(1, u / q.len))
  const w = v + lift
  const c = Math.cos(q.th)
  const s = Math.sin(q.th)
  return [q.x + u * c + w * s, q.y - u * s - w * c]
}

/* ------------------------------------------------------------------ the layout */

/** The vehicles' lengths, rear bumper to nose, in body cells. */
export const PICKUP_LEN = 3.35
export const BUS_LEN = 5.6
export const CAR_LEN = 1.25
export const CAR_PITCH = 1.35
export const N_CARS = 8
export const CONV_LEN = 2.7
export const BUICK_LEN = 3.3

/** The tailgate: its length and the bed floor's height, so dropped it reaches back to the road this far. */
export const GATE_LEN = 0.85
export const BED_H = 0.5
export const GATE_REACH = Math.sqrt(GATE_LEN * GATE_LEN - BED_H * BED_H)

/** Out of the door at 1.5 cells a second, he meets the dropped gate's foot on the eighth: that fixes the pickup, and the jam behind it. */
export const TIP_X = -0.5 + 1.5 * (GATE_FOOT - LIGHTS_UP)
export const X_P = TIP_X + GATE_REACH
export const X_B = X_P + PICKUP_LEN + 0.26
export const X_C0 = X_B + BUS_LEN + 0.15
export const carX = (i: number): number => X_C0 + i * CAR_PITCH
export const X_V = carX(N_CARS - 1) + CAR_LEN + 0.2
export const X_K = X_V + CONV_LEN + 0.15
/** The Buick's front wheel, along its body; and the deck's expansion joints, where that wheel is on each joint's beat. */
export const BUICK_FRONT_WHEEL = 2.7
export const JOINT_X = JOINTS.map((t) => X_K + driveAt(t) + BUICK_FRONT_WHEEL)
/** Where the Buick's nose stops, and the deck ends just past it. */
export const DECK_END = X_K + BUICK_LEN + driveAt(STOP) + 0.35
export const SET_X0 = 0.15
export const SET_X1 = DECK_END + 2.2
const SKY_TOP = -13
const HORIZON = -0.95
const SLAB = 0.6

/* ------------------------------------------------------------------ the pulse */

/** The jam keeping time: 1 on each beat, decaying; brighter and longer on the bar. */
export function pulseAt(T: number): number {
  const { i, ago } = lastOf(BEATS, T)
  if (i < 0 || T > STOP + 0.5) return 0
  return isBar(i) ? knock(ago, 0.16) : 0.55 * knock(ago, 0.11)
}

/* ------------------------------------------------------------------ the set */

const PIERS = [6, 10, 14, 18, 22, 26, 30, 34, 38, 42]
const TOWERS: [number, number, number][] = [
  // x, width, height: downtown, small and far, on the horizon under the freeway's top.
  [29.2, 0.7, 1.6],
  [30.3, 0.9, 2.6],
  [31.6, 0.6, 2.0],
  [32.6, 1.1, 3.3],
  [34.0, 0.7, 2.4],
  [35.0, 0.8, 1.5],
  [36.4, 1.0, 2.9],
  [37.8, 0.6, 1.9],
  [39.0, 0.9, 2.3],
  [40.4, 0.7, 1.2],
]
const PALMS: [number, number, number][] = [
  // x at the foot, how far the crown stands over the road there, lean.
  [1.6, 3.4, 0.1],
  [9.2, 2.6, -0.07],
  [16.4, 2.9, 0.09],
  [24.8, 2.4, -0.05],
  [32.3, 3.1, 0.12],
  [40.6, 2.7, -0.08],
]

/** The flat and the ground, the towers, the palms: everything behind the road. */
export function drawBackdrop(p: p5, c: Ctx, T: number): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The sky, violet to rose, and the painted ground under the horizon.
  flat(p, c, SET_X0, SKY_TOP, SET_X1 - SET_X0, HORIZON - SKY_TOP, PAINT.violet, PAINT.rose, false)
  flat(p, c, SET_X0, HORIZON, SET_X1 - SET_X0, FLOOR - HORIZON, PAINT.violet, PAINT.deep, false)
  p.noStroke()
  // The last of the sun, low over downtown.
  glow(p, c, 36, HORIZON - 0.2, 6.5, 0.28, PAINT.gold)
  // Downtown, in silhouette.
  p.fill(PAINT.deep)
  for (const [x, w, h] of TOWERS) {
    if (x + w < f.x0 - 1 || x - w > f.x1 + 1) continue
    p.rect(X(x), X(HORIZON - h / 2 + 0.02), X(w), X(h + 0.04))
  }
  // A few lit windows on the towers: small squares, warm.
  p.fill(hexA(PAINT.gold, 0.55))
  for (let i = 0; i < TOWERS.length; i++) {
    const [x, w, h] = TOWERS[i]
    if (x + w < f.x0 - 1 || x - w > f.x1 + 1) continue
    for (let j = 0; j < 3; j++) {
      if (hash(i, j) > 0.55) continue
      p.rect(X(x - w / 2 + 0.12 + hash(i, j, 1) * (w - 0.24)), X(HORIZON - 0.2 - hash(i, j, 2) * (h - 0.4)), X(0.08), X(0.11))
    }
  }
  // The palms: a trunk leaning a little, a crown of fronds that stir.
  for (let i = 0; i < PALMS.length; i++) {
    const [x, over, lean] = PALMS[i]
    if (x < f.x0 - 3 || x > f.x1 + 3) continue
    palm(p, k, x, HORIZON + 0.1, HORIZON + 0.1 - road(x) + over, lean, T, i)
  }
  // The flat's frame edge.
  outline(p, ink, weight * 0.7)
  p.rect(X((SET_X0 + SET_X1) / 2), X((SKY_TOP + FLOOR) / 2), X(SET_X1 - SET_X0), X(FLOOR - SKY_TOP))
  void ctx
}

function palm(p: p5, k: number, x: number, foot: number, h: number, lean: number, T: number, seed: number): void {
  const X = (v: number) => v * k
  const top: Pt = [x + lean * h, foot - h]
  p.noStroke()
  p.fill(PAINT.deep)
  // The trunk: a tapered quad along a slight curve.
  p.beginShape()
  p.vertex(X(x - 0.09), X(foot))
  p.vertex(X(x + 0.09), X(foot))
  p.quadraticVertex(X(x + 0.07 + lean * h * 0.35), X(foot - h * 0.55), X(top[0] + 0.045), X(top[1]))
  p.vertex(X(top[0] - 0.045), X(top[1]))
  p.quadraticVertex(X(x - 0.07 + lean * h * 0.35), X(foot - h * 0.55), X(x - 0.09), X(foot))
  p.endShape(p.CLOSE)
  // The crown: fronds out and down, stirring.
  const n = 9
  for (let j = 0; j < n; j++) {
    const a = -Math.PI * 0.95 + (j / (n - 1)) * Math.PI * 0.9 + 0.035 * Math.sin(T * 0.9 + seed * 1.7 + j)
    const len = 1.1 + 0.35 * hash(seed, j)
    const tipX = top[0] + Math.cos(a) * len
    const tipY = top[1] + Math.sin(a) * len + 0.55 * len * (0.4 + 0.6 * Math.abs(Math.cos(a)))
    const cx = top[0] + Math.cos(a) * len * 0.6
    const cy = top[1] + Math.sin(a) * len * 0.6 - 0.05
    p.beginShape()
    p.vertex(X(top[0]), X(top[1] - 0.06))
    p.quadraticVertex(X(cx), X(cy - 0.08), X(tipX), X(tipY))
    p.quadraticVertex(X(cx), X(cy + 0.1), X(top[0]), X(top[1] + 0.06))
    p.endShape(p.CLOSE)
  }
}

/** The elevated road: the slab up the ramp and along the top, its piers down to the street, the far rail, the near kerb. */
export function drawDeck(p: p5, c: Ctx): void {
  const { k, ink, weight } = c
  const X = (v: number) => v * k
  const f = frame(p, k)
  const x0 = Math.max(SET_X0, f.x0 - 1)
  const x1 = Math.min(DECK_END, f.x1 + 1)
  if (x1 <= x0) return
  const step = 0.4
  // The piers first, behind the slab.
  solid(p, ink, weight * 0.8, PAINT.deep)
  for (const x of PIERS) {
    if (x > DECK_END - 0.6 || x < f.x0 - 1 || x > f.x1 + 1) continue
    const top = road(x) + SLAB - 0.05
    if (top > FLOOR - 0.4) continue
    p.rect(X(x), X((top + FLOOR) / 2), X(0.42), X(FLOOR - top))
  }
  // The far rail: a line the height of a kerb and a half above the road, on posts, behind the cars.
  outline(p, ink, weight * 0.5)
  p.stroke(hexA(ink, 0.55))
  p.beginShape()
  p.noFill()
  for (let x = x0; x <= x1 + 1e-6; x += step) p.vertex(X(x), X(road(x) - 0.48))
  p.endShape()
  for (let x = Math.ceil(x0 / 1.5) * 1.5; x <= x1; x += 1.5) p.line(X(x), X(road(x) - 0.48), X(x), X(road(x) - 0.02))
  // The slab.
  p.noStroke()
  p.fill(PAINT.deep)
  p.beginShape()
  for (let x = x0; x <= x1 + 1e-6; x += step) p.vertex(X(x), X(road(x)))
  p.vertex(X(x1), X(road(x1)))
  p.vertex(X(x1), X(Math.min(FLOOR, road(x1) + SLAB)))
  for (let x = x1; x >= x0 - 1e-6; x -= step) p.vertex(X(x), X(Math.min(FLOOR, road(x) + SLAB)))
  p.endShape(p.CLOSE)
  // Its edges: the road's surface in full ink, the underside lighter.
  outline(p, ink, weight)
  p.beginShape()
  for (let x = x0; x <= x1 + 1e-6; x += step) p.vertex(X(x), X(road(x)))
  p.vertex(X(x1), X(road(x1)))
  p.endShape()
  p.stroke(hexA(ink, 0.6))
  p.strokeWeight(weight * 0.6)
  p.beginShape()
  for (let x = Math.max(x0, RAMP_X0 - 0.2); x <= x1 + 1e-6; x += step) p.vertex(X(x), X(Math.min(FLOOR, road(x) + SLAB)))
  p.vertex(X(x1), X(Math.min(FLOOR, road(x1) + SLAB)))
  p.endShape()
  // The joints: a seam across the deck at each, a lip of the slab's own dark.
  outline(p, ink, weight * 0.8)
  for (const jx of JOINT_X) {
    if (jx < x0 || jx > x1) continue
    p.line(X(jx), X(road(jx) - 0.04), X(jx), X(road(jx) + 0.22))
  }
  // The deck's end face.
  if (x1 >= DECK_END - 1e-6) {
    outline(p, ink, weight)
    p.line(X(DECK_END), X(road(DECK_END)), X(DECK_END), X(road(DECK_END) + SLAB))
  }
}

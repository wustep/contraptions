import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, mixHex, R, puff, type Pt } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, lastOf, part, route, smooth, type Ctx, type Way } from '../kit'
import { beat, beats, DROP } from '../music'
import { dropTime, hop } from '../physics'
import { DUST } from '../worlds'
import { cornWall, stalk } from './corn'

/**
 * The truck, and Cooper drives it. It is waiting on the field road under the
 * bank, tailgate up, and the ball hops off the end of the flume onto the
 * bed's rail on a note. He rolls along the rail into the corner of the cab;
 * the knock swings the door open, he rolls in onto the bench, and the door
 * slams behind him on the note. Then the organ: the engine turns over on its
 * first chords and catches, the headlights come on, it revs — and on the drop
 * it goes, straight into the corn, him at the wheel behind the glass.
 *
 * Through the corn it hits a stalk on every beat, and every beat the seat
 * throws him up and he comes down on the eighth. At the dam he stands on the
 * brakes on the first beat of a bar: the nose goes down, the door flies open,
 * and he is thrown out ahead of the truck, over the edge and down into the
 * combine. The truck stays at the edge, empty, its door swinging.
 *
 * The part's frame: the ball comes in on the bank (y = 0); the field road
 * is a cell lower (the ground at 1 + FLOOR).
 */

/* ------------------------------------------------------------------ the pickup, for any part */

/** The truck, in body cells from the back of the bed (u) and up from the road (v). */
const LEN = 3.0
const BED_FLOOR = 0.62
/** The bed's rail: the top of its far side, which he rolls along to the cab. */
const RAIL = 0.88
/** The near side of the bed is drawn a little low, so the ball in it shows its crown. */
const NEAR_TOP = 0.77
const CAB_U = 1.3
const HOOD_U = 2.25
const ROOF = 1.5
const HOOD = 1.05
const WHEELS = [0.55, 2.42]
const WHEEL_R = 0.25
/** The pivot the body pitches about. */
const PIVOT: Pt = [1.5, 0.6]
/** The near door: its hinge (front) edge, its back edge, its sill and top; the window in it. */
const DOOR_F = 2.13
const DOOR_B = 1.37
const DOOR_LO = 0.45
const DOOR_HI = 1.44
const SILL = RAIL
const GLASS_TOP = 1.37
/** Where he sits on the bench, at the wheel (u, v of his centre), and how far forward the dash lets him go. */
const SEAT: Pt = [1.72, RAIL + R]
const DASH = 1.93

/** Where the pickup stands and how it is holding itself: what every part that shows it passes in. */
export interface Pickup {
  /** The back of the bed, and the road under the wheels, in the drawing's frame. */
  rear: number
  road: number
  /** Positive is nose down; lift is off the springs. */
  pitch: number
  lift: number
  /** How far the wheels are off the road. */
  air: number
  /** The wheels' turn, radians. */
  turn: number
  /** The near door: 0 shut, 1 wide. */
  door: number
  /** The headlamp and its beam: 0 dark, 1 lit. */
  lamp: number
}

/** A body point (u along from the tailgate, v up from the road) of a pickup, in its drawing's frame. */
export function pickupPoint(pk: Pickup, u: number, v: number): Pt {
  const du = u - PIVOT[0]
  const dv = v - PIVOT[1]
  const x = du * Math.cos(pk.pitch) + dv * Math.sin(pk.pitch)
  const y = -du * Math.sin(pk.pitch) + dv * Math.cos(pk.pitch)
  return [pk.rear + PIVOT[0] + x, pk.road - PIVOT[1] - pk.lift - y]
}

/** The door's outline, and its window's, in body cells, swung open by `open` (0..1) about its front edge. */
function doorShape(open: number): { door: Pt[]; glass: Pt[] } {
  const c = Math.cos(open * 1.25)
  const f = (u: number) => DOOR_F - (DOOR_F - u) * c
  return {
    door: [[f(DOOR_B), DOOR_LO], [DOOR_F, DOOR_LO], [DOOR_F, HOOD], [DOOR_F - 0.1, DOOR_HI], [f(DOOR_B), DOOR_HI]],
    glass: [[f(DOOR_B + 0.07), SILL], [f(DOOR_F - 0.07), SILL], [f(DOOR_F - 0.07), HOOD], [f(DOOR_F - 0.15), GLASS_TOP], [f(DOOR_B + 0.07), GLASS_TOP]],
  }
}

/**
 * The pickup, everything behind the balls: the wheels, the bed's far side and
 * its rail, the cab with its inside (the bench, the far window) showing where
 * the near door is not, the hood, the lamp and its beam, the tailgate.
 */
export function drawPickup(p: p5, k: number, ink: string, weight: number, pk: Pickup): void {
  const X = (x: number) => x * k
  const B = (u: number, v: number) => pickupPoint(pk, u, v)
  const shape = (pts: Pt[], fill: string | p5.Color, w = weight) => {
    solid(p, ink, w, fill as string)
    p.beginShape()
    for (const [u, v] of pts) {
      const [x, y] = B(u, v)
      p.vertex(X(x), X(y))
    }
    p.endShape(p.CLOSE)
  }
  for (const u of WHEELS) {
    const wx = pk.rear + u
    const wy = pk.road - WHEEL_R - pk.air
    solid(p, ink, weight, ink)
    p.circle(X(wx), X(wy), X(WHEEL_R * 2))
    solid(p, ink, weight * 0.6, DUST.bone)
    p.circle(X(wx), X(wy), X(WHEEL_R * 0.95))
    outline(p, ink, weight * 0.6)
    for (let j = 0; j < 3; j++) {
      const a = pk.turn + (j * Math.PI * 2) / 3
      p.line(X(wx), X(wy), X(wx + Math.cos(a) * WHEEL_R * 0.45), X(wy + Math.sin(a) * WHEEL_R * 0.45))
    }
  }
  // The bed's far side, its rail along the top; the body's lower band; the cab; the hood.
  shape([[0, BED_FLOOR - 0.06], [CAB_U, BED_FLOOR - 0.06], [CAB_U, RAIL], [0, RAIL]], DUST.shade)
  shape([[0, 0.34], [LEN, 0.34], [LEN, 0.62], [0, 0.62]], DUST.denim)
  shape([[CAB_U, 0.4], [HOOD_U + 0.05, 0.4], [HOOD_U + 0.05, HOOD], [HOOD_U - 0.08, ROOF - 0.06], [HOOD_U - 0.2, ROOF], [CAB_U + 0.05, ROOF], [CAB_U, ROOF - 0.05]], DUST.denim)
  // Inside, where the door opens: the cab in shadow, the far window, the bench.
  const wide = doorShape(0)
  shape(wide.door, alpha(p, ink, 0.62), weight * 0.8)
  // The far window, seen through the cab: dusty and shaded, a middle tone the sand-pale driver reads against.
  shape(wide.glass, mixHex(DUST.sky, DUST.denim, 0.5), weight * 0.5)
  shape([[DOOR_B + 0.02, 0.72], [DASH + 0.02, 0.72], [DASH + 0.02, RAIL - 0.02], [DOOR_B + 0.02, RAIL - 0.02]], DUST.teal, weight * 0.7)
  shape([[DOOR_B + 0.02, RAIL - 0.02], [DOOR_B + 0.17, RAIL - 0.02], [DOOR_B + 0.17, 1.17], [DOOR_B + 0.12, 1.23], [DOOR_B + 0.02, 1.23]], DUST.teal, weight * 0.7)
  // The wheel, raked back toward the bench and seen edge on, on its column down to the dash.
  const hub = B(1.99, 1.05)
  const col = B(2.1, 0.9)
  outline(p, ink, weight * 0.8)
  p.line(X(hub[0]), X(hub[1]), X(col[0]), X(col[1]))
  p.push()
  p.translate(X(hub[0]), X(hub[1]))
  p.rotate(0.5 - pk.pitch)
  outline(p, ink, weight * 1.1)
  p.ellipse(0, 0, X(0.07), X(0.32))
  p.pop()
  shape([[HOOD_U, 0.4], [LEN, 0.4], [LEN, HOOD - 0.1], [LEN - 0.12, HOOD], [HOOD_U, HOOD]], DUST.denim)
  // Bumpers, the lamp and its beam, the mirror, the tailgate.
  shape([[LEN - 0.02, 0.36], [LEN + 0.08, 0.36], [LEN + 0.08, 0.5], [LEN - 0.02, 0.5]], DUST.bone, weight * 0.8)
  shape([[-0.08, 0.36], [0.02, 0.36], [0.02, 0.5], [-0.08, 0.5]], DUST.bone, weight * 0.8)
  const lamp = B(LEN - 0.05, 0.84)
  if (pk.lamp > 0.01) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(X(lamp[0]), 0, X(lamp[0] + 2.4), 0)
    g.addColorStop(0, `rgba(255, 244, 205, ${0.55 * pk.lamp})`)
    g.addColorStop(1, 'rgba(255, 244, 205, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(X(lamp[0]), X(lamp[1] - 0.05))
    ctx.lineTo(X(lamp[0] + 2.4), X(lamp[1] - 0.25))
    ctx.lineTo(X(lamp[0] + 2.4), X(lamp[1] + 0.55))
    ctx.lineTo(X(lamp[0]), X(lamp[1] + 0.05))
    ctx.closePath()
    ctx.fill()
  }
  solid(p, ink, weight * 0.8, pk.lamp > 0.5 ? DUST.light : DUST.shade)
  p.circle(X(lamp[0]), X(lamp[1]), X(0.11))
  const m0 = B(HOOD_U - 0.05, 1.08)
  outline(p, ink, weight * 0.8)
  p.line(X(m0[0]), X(m0[1]), X(m0[0] + 0.1), X(m0[1] - 0.05))
  shape([[-0.06, BED_FLOOR - 0.06], [0.02, BED_FLOOR - 0.06], [0.02, RAIL], [-0.06, RAIL]], DUST.denim)
}

/** The bed's near wall, in front of whatever rides in the bed. */
export function bedPickup(p: p5, k: number, ink: string, weight: number, pk: Pickup): void {
  const X = (x: number) => x * k
  solid(p, ink, weight, DUST.denim)
  p.beginShape()
  for (const [u, v] of [[-0.02, BED_FLOOR - 0.05], [CAB_U, BED_FLOOR - 0.05], [CAB_U, NEAR_TOP], [-0.02, NEAR_TOP]] as Pt[]) {
    const [x, y] = pickupPoint(pk, u, v)
    p.vertex(X(x), X(y))
  }
  p.endShape(p.CLOSE)
}

/** The near door, its window cut out, swung open by `pk.door` about its front edge: in front of whoever sits behind it. */
export function doorPickup(p: p5, k: number, ink: string, weight: number, pk: Pickup): void {
  const X = (x: number) => x * k
  const B = (u: number, v: number) => pickupPoint(pk, u, v)
  const at = (pts: Pt[]) => pts.map(([u, v]) => B(u, v))
  const { door, glass } = doorShape(pk.door)
  // Swung out toward us, the door shows its edge: a strip of shadow along the back of it.
  if (pk.door > 0.02) {
    const [b0, b1] = at([door[0], door[4]])
    const w = 0.05 * Math.sin(pk.door * 1.25)
    solid(p, ink, weight * 0.8, ink)
    p.quad(X(b0[0]), X(b0[1]), X(b0[0] - w), X(b0[1]), X(b1[0] - w), X(b1[1]), X(b1[0]), X(b1[1]))
  }
  solid(p, ink, weight, DUST.denim)
  p.beginShape()
  for (const [x, y] of at(door)) p.vertex(X(x), X(y))
  p.beginContour()
  for (const [x, y] of at(glass).reverse()) p.vertex(X(x), X(y))
  p.endContour()
  p.endShape(p.CLOSE)
  // The handle.
  const c = Math.cos(pk.door * 1.25)
  const h0 = B(DOOR_F - (DOOR_F - (DOOR_B + 0.1)) * c, 0.8)
  const h1 = B(DOOR_F - (DOOR_F - (DOOR_B + 0.22)) * c, 0.8)
  outline(p, ink, weight * 0.8)
  p.line(X(h0[0]), X(h0[1]), X(h1[0]), X(h1[1]))
}

/** The door's glass, over whoever sits behind it: a faint pane and one glint, and (unless `rim` is false) its frame again. */
export function glassPickup(p: p5, k: number, ink: string, weight: number, pk: Pickup, rim = true): void {
  const X = (x: number) => x * k
  const pts = doorShape(pk.door).glass.map(([u, v]) => pickupPoint(pk, u, v))
  p.noStroke()
  p.fill(alpha(p, DUST.sky, 0.3))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(x), X(y))
  p.endShape(p.CLOSE)
  // The glint: one bright stroke across the pane's upper back corner.
  const c = Math.cos(pk.door * 1.25)
  const f = (u: number) => DOOR_F - (DOOR_F - u) * c
  const g0 = pickupPoint(pk, f(DOOR_B + 0.12), GLASS_TOP - 0.2)
  const g1 = pickupPoint(pk, f(DOOR_B + 0.3), GLASS_TOP - 0.03)
  p.stroke(alpha(p, DUST.light, 0.7))
  p.strokeWeight(Math.max(1, weight * 0.9))
  p.line(X(g0[0]), X(g0[1]), X(g1[0]), X(g1[1]))
  if (!rim) return
  outline(p, ink, weight * 0.8)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(X(x), X(y))
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the part */

const GROUND = 1 + FLOOR
const BALL_V = BED_FLOOR + R

const V = 2.6
const ACCEL = 5
const BRAKE = 8

/** Where the ball drops off the bank, lands in the bed, and hits the cab. */
const LAND = 30.401
const BONK = 31.121
const DOOR = 32.049
const CRANKS = [33.135, 33.785, 34.389]
const CATCH = 35.654
const LIGHTS = 40.031
const REV = 41.123
const STOP = beat(84)
/** Bar three: a dirt lip on 76, a ditch under it, and it comes down hard on 77. */
const TAKEOFF = beat(76)
const LANDING = beat(77)
const HANG = 0.58
/** Bar four's downbeat: a split-rail fence across the field, and the truck goes through it. */
const FENCE = beat(80)
/** Every beat the truck is on the ground a furrow kicks the ball; every one it meets a stalk the grille takes it. */
const SLAPS = beats(69, 83).filter((t) => t !== TAKEOFF && t !== LANDING)
const STALKS = SLAPS.filter((t) => t !== FENCE)
const TOUCHDOWN = beat(86)

/** He is on the bench, the door about to shut behind him. */
const IN_SEAT = 31.93
/**
 * At the dam he is thrown out through the flung-open door, low across the hood, and off its nose at this moment,
 * going this fast, from this far along the body: then over the edge and down into the combine.
 */
const OFF_NOSE = STOP + 0.53
const NOSE_U = 3.0
/** How fast he goes off the nose, along the body: set by the build to the speed his flight over the edge starts at, so there is no kink. */
let vOff = 3.5

export const TRUCK_NOTES = [LAND, BONK, DOOR]
export const TRUCK_ORGAN = [...CRANKS, CATCH, LIGHTS, REV]
export const TRUCK_BEATS = [DROP, ...SLAPS, TAKEOFF, LANDING, STOP, TOUCHDOWN].sort((a, b) => a - b)

/** How far the whole truck is off the road, over the ditch. */
/** 0..1 → 0..1, starting at rest and running on at an even pace: a launch that builds over a moment (the lip). */
const launch = (u: number, a = 0.15): number => (u + a * (Math.exp(-u / a) - 1)) / (1 + a * (Math.exp(-1 / a) - 1))
const jumpAt = (t: number): number => {
  if (t <= TAKEOFF || t >= LANDING) return 0
  // Up the lip: the front wheels climb it first, so the lift builds over a moment rather than all at once. Down hard.
  const u = launch((t - TAKEOFF) / (LANDING - TAKEOFF))
  return HANG * 4 * u * (1 - u)
}

interface TruckState {
  begin: number
  b0: number
  /** Where the stalks stand that the grille takes, one a beat. */
  stalks: number[]
  edge: number
  /** Where the fence stands, and where the ditch runs under the jump. */
  fence: number
  ditch: [number, number]
}

/** The back of the bed, in the part's frame, at show time `t`. */
export function rearAt(b0: number, t: number): number {
  if (t <= DROP) return b0
  const ta = V / ACCEL
  const run = (x: number) => (x < ta ? 0.5 * ACCEL * x * x : 0.5 * ACCEL * ta * ta + V * (x - ta))
  if (t <= STOP) return b0 + run(t - DROP)
  const tb = V / BRAKE
  const f = Math.min(t - STOP, tb)
  return b0 + run(STOP - DROP) + V * f - 0.5 * BRAKE * f * f
}

/** The body's pitch (positive is nose down) and how far it has lifted on its springs, at show time `t`. */
function bodyAt(t: number): { pitch: number; lift: number } {
  let pitch = 0
  let lift = 0
  // The door: the truck rocks as he gets in.
  const d = t - DOOR
  if (d > 0) pitch += 0.022 * Math.exp(-d / 0.35) * Math.sin(d * 16)
  // Cranking: a shudder a turn.
  for (const c of CRANKS) {
    const s = t - c
    if (s > 0 && s < 0.6) pitch += 0.012 * Math.exp(-s / 0.15) * Math.sin(s * 70)
  }
  // Running: a fine tremble while it idles, more with the revs.
  if (t > CATCH && t < STOP + 0.6) {
    const rev = knock(t - REV, 0.4) + knock(t - DROP, 0.5)
    lift += (0.006 + 0.01 * rev) * Math.sin(t * 90)
    pitch += 0.004 * Math.sin(t * 53)
  }
  const catchUp = t - CATCH
  if (catchUp > 0) pitch += 0.02 * Math.exp(-catchUp / 0.25) * Math.sin(catchUp * 25)
  // Off the line: it squats.
  const go = t - DROP
  if (go > 0) pitch -= 0.06 * Math.exp(-go / 0.45) * Math.sin(Math.min(Math.PI / 2, go * 9))
  // The ditch: off the lip nose-up, over, down nose-first, and a hard squash on the springs.
  const air = jumpAt(t)
  if (air > 0) {
    const u = (t - TAKEOFF) / (LANDING - TAKEOFF)
    lift += air
    pitch += 0.07 * (2 * u - 1) * (1 - Math.exp(-u / 0.04))
  }
  const down = t - LANDING
  if (down > 0) pitch += 0.07 * Math.exp(-down / 0.03)
  if (down > 0 && down < 0.8) {
    // (Squashed in a few milliseconds rather than all at once, so what rides in the cab never jumps.)
    lift -= 0.1 * (1 - Math.exp(-down / 0.012)) * Math.exp(-down / 0.12) * Math.cos(down * 22)
    pitch += 0.04 * Math.exp(-down / 0.2) * Math.sin(down * 18)
  }
  // The fence: a jolt through the frame.
  const hit = t - FENCE
  if (hit > 0 && hit < 0.6) pitch -= 0.03 * Math.exp(-hit / 0.15) * Math.sin(hit * 30)
  // A furrow every beat.
  const { ago } = lastOf(SLAPS, t)
  if (ago < 0.5 && t < STOP) {
    lift += 0.07 * Math.exp(-ago / 0.1) * Math.sin(ago * 30)
    pitch -= 0.015 * Math.exp(-ago / 0.12)
  }
  // The brakes: the nose goes down hard and the back end comes up.
  const br = t - STOP
  if (br > 0) pitch += 0.16 * Math.sin(Math.min(1, br / 0.22) * Math.PI / 2) * Math.exp(-Math.max(0, br - 0.22) / 0.3) + 0.02 * Math.exp(-br / 0.6) * Math.sin(br * 12)
  return { pitch, lift }
}

/** The near door: swung open by the knock when he hits the cab, slammed on the note once he is in; flung open at the dam, and left swinging. */
function doorAt(t: number): number {
  if (t <= BONK) return 0
  if (t < STOP) {
    const shut = DOOR - 0.22
    if (t < shut) {
      const s = t - BONK
      return easeOutCubic(clamp(s / 0.28)) + 0.06 * Math.exp(-Math.max(0, s - 0.28) / 0.12) * Math.sin(Math.max(0, s - 0.28) * 30)
    }
    if (t < DOOR) return 1 - easeInQuad((t - shut) / (DOOR - shut))
    const k = t - DOOR
    return 0.05 * Math.exp(-k / 0.06) * Math.abs(Math.sin(k * 40))
  }
  const k = t - STOP
  if (k < 0.1) return easeOutCubic(k / 0.1)
  const j = k - 0.1
  return 0.72 + 0.28 * Math.exp(-j / 1.6) * Math.cos(j * 4.2)
}

/** The pickup at show time `t`. */
function poseAt(s: TruckState, t: number): Pickup {
  const { pitch, lift } = bodyAt(t)
  const rear = rearAt(s.b0, t)
  return { rear, road: GROUND, pitch, lift, air: jumpAt(t) * 0.92, turn: (rear - s.b0) / WHEEL_R, door: doorAt(t), lamp: t > LIGHTS ? (t < LIGHTS + 0.25 ? (Math.sin((t - LIGHTS) * 80) > 0 ? 1 : 0.3) : 1) : 0 }
}

/** A body point (u along, v up) at show time `t`, in the part's frame. */
const bodyPoint = (s: TruckState, t: number, u: number, v: number): Pt => pickupPoint(poseAt(s, t), u, v)

/** Along the rail from where he lands, into the corner of the cab on BONK; a rock back off it; and in at the door onto the bench. */
function boardU(t: number): number {
  if (t < BONK) {
    // He lands going 1.25 a second and hardly loses any of it before the cab stops him.
    const T = BONK - LAND
    const a = (2 * (1.25 * T - 0.82)) / (T * T)
    const x = Math.max(0, t - LAND)
    return 0.35 + 1.25 * x - 0.5 * a * x * x
  }
  const k = t - BONK
  if (k < 0.15) return 1.17 - 0.07 * Math.sin((Math.PI / 2) * (k / 0.15))
  return 1.1 + (SEAT[0] - 1.1) * smooth(t, BONK + 0.15, IN_SEAT)
}

/**
 * Where he is (u, v in body cells) at show time `t`, from the moment he lands on the rail: in at the door, then at the
 * wheel, jolted with the truck, thrown up by the seat on every beat, and at the dam thrown against the dash.
 */
function heroAt(t: number): Pt {
  if (t < IN_SEAT) return [boardU(t), SEAT[1]]
  let u = SEAT[0]
  let v = SEAT[1]
  // The slam behind him.
  const d = t - DOOR
  if (d > 0) u += 0.035 * Math.exp(-d / 0.3) * Math.sin(d * 14)
  // A lift on each turn of the engine, and on the catch and the rev.
  for (const c of [...CRANKS, CATCH, REV]) {
    const s = t - c
    if (s > 0 && s < 0.2) v += 0.05 * 4 * (s / 0.2) * (1 - s / 0.2)
  }
  // Off the line he is pressed back into the bench, and comes forward again.
  const go = t - DROP
  if (go > 0) u -= 0.06 * Math.sin(Math.min(Math.PI / 2, go * 7)) * Math.exp(-Math.max(0, go - 0.22) / 0.5)
  // Every furrow the seat throws him up on the beat, and he comes down on the eighth.
  const { ago } = lastOf(SLAPS, t)
  const air = beat(0.5) - beat(0)
  if (t < STOP && ago < air) v += 0.13 * 4 * (ago / air) * (1 - ago / air)
  // The ditch: up off the bench nearly to the roof, and down on the eighth after the wheels.
  const f0 = TAKEOFF + 0.06
  const f1 = beat(77.5)
  if (t > f0 && t < f1) {
    const w = launch((t - f0) / (f1 - f0))
    v += 0.22 * 4 * w * (1 - w)
  }
  // The fence: a knock forward.
  const hit = t - FENCE
  if (hit > 0) u += 0.06 * Math.exp(-hit / 0.2) * Math.sin(Math.min(Math.PI, hit * 12))
  // The brakes: the door flies open and he is thrown forward — out through it, up onto the hood just clear of it,
  // across it with the nose going down, and off the nose. (Nowhere through the glass or above the roof.)
  const br = t - STOP
  if (br > 0) {
    const T = OFF_NOSE - STOP
    const w = clamp(br / T)
    const m1 = (vOff * T) / (NOSE_U - u)
    u += (NOSE_U - u) * ((3 - 2 * w) * w * w + (w ** 3 - w ** 2) * m1)
    v += (HOOD + R - v) * smooth(u, 1.95, 2.3)
  }
  return [u, v]
}

export const truck = part<TruckState>(
  {
    name: 'pickup',
    flight: true,
    draw: (p, s, c) => drawTruck(p, s, c),
    over: (p, s, c) => {
      // The bed's near wall; and until he is out at the dam, the door in front of him and its glass over him.
      const t = c.t + s.begin
      const pose = poseAt(s, t)
      bedPickup(p, c.k, c.ink, c.weight, pose)
      if (t < STOP) {
        doorPickup(p, c.k, c.ink, c.weight, pose)
        glassPickup(p, c.k, c.ink, c.weight, pose)
      }
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // Where the truck stands, and where the flume ends, are as they were when he dropped into the bed: the dam, and so
    // everything after it, stays where it was.
    const fall = dropTime(GROUND - BALL_V)
    const edge = -0.5 + 1.25 * (at(LAND) - fall)
    const b0 = edge + 1.25 * fall - 0.35
    const s: TruckState = { begin: slot.begin, b0, stalks: [], edge: 0, fence: 0, ditch: [0, 0] }
    s.stalks = STALKS.map((t) => rearAt(b0, t) + LEN + 0.04)
    s.fence = rearAt(b0, FENCE) + LEN + 0.04
    s.ditch = [rearAt(b0, TAKEOFF) + WHEELS[1] + 0.2, rearAt(b0, LANDING) + WHEELS[0] - 0.15]
    s.edge = rearAt(b0, STOP + 1) + LEN + 0.12
    const rider = (t: number): Pt => {
      const [u, v] = heroAt(t + slot.begin)
      return bodyPoint(s, t + slot.begin, u, v)
    }
    const land = at(LAND)
    const leave = at(OFF_NOSE)
    const touch: Pt = [s.edge + 2.4, 3]
    const drop = at(LAND) - fall
    // Off the nose at the pace his flight over the edge begins with (along the nose-down body): where he leaves the
    // nose does not depend on it, so it is worked out first, and the ride below is sampled with it.
    vOff = (touch[0] - rider(leave)[0]) / (at(TOUCHDOWN) - leave) / Math.cos(bodyAt(OFF_NOSE).pitch)
    // Along the flume, a hop off its end onto the rail on the note; along it and into the cab, and the ride.
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: drop, p: [edge, 0] }]
    ways.push(hop(ways[1], rider(land), land))
    const segs = [
      ...route(ways),
      ...carried(rider, land, leave, Math.ceil((leave - land) * 40)),
    ]
    // Off the nose, over the edge, and down into the combine on the same beat as ever.
    const from: Way = { at: leave, p: rider(leave) }
    segs.push(...route([from, hop(from, touch, at(TOUCHDOWN))]))
    const pad = Math.ceil(s.edge + 3)
    return {
      cells: box(-1, -3, pad, 4),
      exit: [touch[0] + 0.5, touch[1]],
      lane: { segs, fire: at(DROP) },
      state: s,
    }
  },
)

function drawTruck(p: p5, s: TruckState, c: Ctx): void {
  const { k, ink, weight } = c
  const t = c.t + s.begin
  const f = frame(p, k)
  const X = (x: number) => x * k
  // The corn on the far side of the road: the field, as one wall, to the dam.
  const wx1 = Math.min(s.edge - 0.1, f.x1 + 1)
  if (wx1 > f.x0 - 1) {
    cornWall(p, k, ink, weight, { x0: f.x0 - 1, x1: wx1, foot: GROUND - 0.35, h: 2.6, t, fill: DUST.husk, seed: 31, taper: [s.b0 + 0.6, s.edge - 0.1] })
    cornWall(p, k, ink, weight, { x0: f.x0 - 1, x1: wx1, foot: GROUND - 0.1, h: 1.25, t: t + 1, fill: DUST.sage, seed: 32, tassels: false, taper: [s.b0 + 1.4, s.edge - 0.1] })
  }
  // The bank the corn track runs along, the same earth as the track's, sloping down to the road.
  const toe = s.b0 + 0.25
  solid(p, ink, weight, DUST.shade)
  p.beginShape()
  p.vertex(X(-0.5), X(FLOOR))
  p.vertex(X(toe - 0.75), X(FLOOR))
  p.quadraticVertex(X(toe - 0.35), X(FLOOR + 0.15), X(toe), X(GROUND))
  p.vertex(X(-0.5), X(GROUND))
  p.endShape()
  p.stroke(alpha(p, ink, 0.3))
  p.strokeWeight(Math.max(1, weight * 0.6))
  for (let i = 0; i < 6; i++) {
    const gx = -0.4 + i * 0.37 + hash(i, 13) * 0.2
    if (gx > toe - 0.9) break
    const gy = FLOOR + 0.25 + hash(i, 14) * 0.6
    p.line(X(gx), X(gy), X(gx + 0.1), X(gy))
  }
  // The road, with the irrigation ditch across it and the dirt lip before it.
  outline(p, ink, weight)
  const [dx0, dx1] = s.ditch
  p.line(X(-1.5), X(GROUND), X(dx0 - 0.35), X(GROUND))
  p.line(X(dx1), X(GROUND), X(s.edge), X(GROUND))
  solid(p, ink, weight, DUST.husk)
  p.beginShape()
  p.vertex(X(dx0 - 0.45), X(GROUND))
  p.quadraticVertex(X(dx0 - 0.1), X(GROUND - 0.2), X(dx0), X(GROUND - 0.1))
  p.vertex(X(dx0), X(GROUND + 0.45))
  p.vertex(X(dx1), X(GROUND + 0.45))
  p.vertex(X(dx1), X(GROUND))
  p.vertex(X(dx1 + 0.02), X(GROUND))
  p.endShape()
  p.noStroke()
  p.fill(DUST.teal)
  p.rect(X((dx0 + dx1) / 2), X(GROUND + 0.34), X(dx1 - dx0 - weight / k), X(0.2))
  p.stroke(alpha(p, DUST.sky, 0.8))
  p.strokeWeight(Math.max(1, weight * 0.6))
  for (let i = 0; i < 3; i++) {
    const wx = dx0 + 0.1 + ((i * 0.37 + t * 0.2) % (dx1 - dx0 - 0.2))
    p.line(X(wx), X(GROUND + 0.28), X(wx + 0.12), X(GROUND + 0.28))
  }
  outline(p, ink, weight)
  p.stroke(alpha(p, ink, 0.3))
  for (let i = Math.floor(f.x0 / 0.45); i < f.x1 / 0.45; i++) {
    const x = i * 0.45 + hash(i, 9) * 0.2
    if (x > s.edge - 0.2) continue
    p.line(X(x), X(GROUND + 0.08), X(x + 0.14), X(GROUND + 0.08))
  }
  // The dam: the road stops at a concrete lip, and the face goes down.
  solid(p, ink, weight, DUST.bone)
  p.rect(X(s.edge + 0.08), X(GROUND + 1.5), X(0.16), X(3))
  outline(p, ink, weight * 0.6)
  for (let y = GROUND + 0.4; y < GROUND + 3; y += 0.5) p.line(X(s.edge), X(y), X(s.edge + 0.16), X(y))

  // The fence: two posts and two rails across the field; on the downbeat the grille takes the rails and they go end over end.
  {
    const x = s.fence
    const hit = t - FENCE
    const lean = hit > 0 ? Math.min(0.5, hit * 3) : 0
    solid(p, ink, weight, DUST.wood)
    for (const [dx, side] of [[-0.95, -1], [0.95, 1]] as const) {
      p.push()
      p.translate(X(x + dx), X(GROUND))
      p.rotate(side > 0 ? lean : lean * 0.3)
      p.rect(0, X(-0.45), X(0.1), X(0.9))
      p.pop()
    }
    for (const [ry, spin] of [[0.72, 1], [0.38, -1]] as const) {
      for (const half of [-1, 1] as const) {
        const cx0 = x + half * 0.47
        const cy0 = GROUND - ry
        let cx = cx0
        let cy = cy0
        let a = 0
        if (hit > 0) {
          // Thrown ahead of the truck, up and over, and down in the stubble.
          const fly = Math.min(hit, 0.9)
          cx = cx0 + (3.1 + half * 0.4) * fly
          cy = Math.min(GROUND - 0.05, cy0 - (1.6 + spin * 0.3) * fly + 0.5 * 9 * fly * fly)
          a = spin * half * 5 * fly
        }
        p.push()
        p.translate(X(cx), X(cy))
        p.rotate(a)
        solid(p, ink, weight, DUST.wood)
        p.rect(0, 0, X(0.94), X(0.08))
        p.pop()
      }
    }
    if (hit > 0 && hit < 0.4) {
      p.stroke(alpha(p, ink, 1 - hit / 0.4))
      p.strokeWeight(weight)
      for (let j = 0; j < 5; j++) {
        const a = -0.9 + j * 0.45
        p.line(X(x + Math.cos(a) * 0.25), X(GROUND - 0.55 + Math.sin(a) * 0.25), X(x + Math.cos(a) * (0.35 + hit)), X(GROUND - 0.55 + Math.sin(a) * (0.35 + hit)))
      }
    }
  }

  // The stalks the grille takes: standing, bent under, and back up behind.
  for (let i = 0; i < s.stalks.length; i++) {
    const x = s.stalks[i]
    if (x < f.x0 - 2 || x > f.x1 + 2) continue
    const since = t - STALKS[i]
    let sway = Math.sin(t * 1.1 + i) * 0.03
    if (since > -0.05) {
      const under = rearAt(s.b0, t) < x + 0.3 && since < 1.6
      const down = under ? 1.25 * smooth(since, -0.05, 0.08) : 0
      const back = since > 0 ? Math.exp(-(since - 0.4) / 0.5) * Math.sin((since - 0.4) * 9) * 0.3 : 0
      sway = under ? down : Math.max(-0.4, Math.min(0.4, back))
    }
    stalk(p, k, ink, weight * 0.85, { x, foot: GROUND, h: 1.55 + hash(i, 7) * 0.25, seed: i + 500, sway, shake: since > 0 ? Math.exp(-since / 0.5) : 0, plain: true })
  }

  // Dust: one kick off the line, then one off the back wheels on each bar's downbeat. One cloud each, never a trail.
  const kicks = [DROP, beat(72), beat(76), beat(80), STOP]
  for (const at of kicks) {
    const age = t - at
    if (age < 0 || age > 1.4) continue
    const u = age / 1.4
    const cx = rearAt(s.b0, at) + (at === STOP ? LEN + 0.1 : 0.3) - age * (at === STOP ? -0.3 : 0.35)
    p.push()
    p.drawingContext.globalAlpha = (1 - u) * (1 - u) * 0.85
    puff(p, k, alpha(p, ink, 0.5).toString(), weight * 0.6, DUST.husk, cx, GROUND - 0.18 - age * 0.3, 0.16 + age * 0.3)
    p.pop()
  }

  // The truck itself. Once he is out, the door swings in front of nobody.
  const pose = poseAt(s, t)
  drawPickup(p, k, ink, weight, pose)
  if (t >= STOP) {
    doorPickup(p, k, ink, weight, pose)
    glassPickup(p, k, ink, weight, pose)
  }

  // Exhaust: a puff a turn of the engine, a steady thread once it runs, a cloud at each rev.
  const pipe = pickupPoint(pose, -0.05, 0.3)
  const puffs = [...CRANKS, CATCH, REV, DROP]
  for (const at of puffs) {
    const age = t - at
    if (age < 0 || age > 1.4) continue
    const u = age / 1.4
    p.push()
    const big = at === CATCH || at === REV || at === DROP ? 1.5 : 1
    p.drawingContext.globalAlpha = 1 - u
    puff(p, k, ink, weight * 0.8, DUST.bone, pipe[0] - 0.15 - age * 0.5 * big, pipe[1] - age * 0.35, (0.08 + age * 0.12) * big)
    p.pop()
  }
}

import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeInQuad, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, puff, type Pt } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, lastOf, part, route, smooth, type Companion, type Ctx, type Way } from '../kit'
import { beat, beats, DROP } from '../music'
import { dropTime, hop } from '../physics'
import { DUST } from '../worlds'
import { cornWall, stalk } from './corn'

/**
 * The truck. It is waiting on the field road under the bank, tailgate up,
 * and the ball drops into the bed off the end of the corn track on a note.
 * The gold ball comes off the flume a step behind him and lands on the bed's
 * rail; he hits the cab, the jolt swings the door open, and she rolls along
 * the rail and in onto the seat: the door slams on the note. Someone got in.
 * Then the organ: the engine turns over on its first chords and catches, the
 * headlights come on, it revs — and on the drop it goes, straight into the
 * corn, her in the window.
 *
 * Through the corn it hits a stalk on every beat, and every beat the bed
 * kicks the ball up, and it comes down on the eighth. At the dam it stands
 * on its brakes on the first beat of a bar, the back end comes up, and the
 * ball goes over the cab and off the edge. She is thrown against the glass,
 * and stays there, looking after him.
 *
 * The part's frame: the ball comes in on the bank (y = 0); the field road
 * is a cell lower (the ground at 1 + FLOOR).
 */

/* ------------------------------------------------------------------ the pickup, for any part */

/** The truck, in body cells from the back of the bed (u) and up from the road (v). */
const LEN = 3.0
const BED_FLOOR = 0.62
/** The bed's rail: the top of its far side, which she rolls along to the cab. */
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
/** Where a rider sits on the bench (u, v of her centre), and how far forward she can go before the dash stops her. */
export const SEAT: Pt = [1.72, RAIL + R]
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
  shape(wide.glass, DUST.sky, weight * 0.5)
  shape([[DOOR_B + 0.02, 0.72], [DASH + 0.02, 0.72], [DASH + 0.02, RAIL - 0.02], [DOOR_B + 0.02, RAIL - 0.02]], DUST.teal, weight * 0.7)
  shape([[DOOR_B + 0.02, RAIL - 0.02], [DOOR_B + 0.17, RAIL - 0.02], [DOOR_B + 0.17, 1.17], [DOOR_B + 0.12, 1.23], [DOOR_B + 0.02, 1.23]], DUST.teal, weight * 0.7)
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

/** The pickup's near side, in front of the balls: the bed's near wall, and the door with its window cut out. */
export function nearPickup(p: p5, k: number, ink: string, weight: number, pk: Pickup): void {
  const X = (x: number) => x * k
  const B = (u: number, v: number) => pickupPoint(pk, u, v)
  const at = (pts: Pt[]) => pts.map(([u, v]) => B(u, v))
  solid(p, ink, weight, DUST.denim)
  p.beginShape()
  for (const [x, y] of at([[-0.02, BED_FLOOR - 0.05], [CAB_U, BED_FLOOR - 0.05], [CAB_U, NEAR_TOP], [-0.02, NEAR_TOP]])) p.vertex(X(x), X(y))
  p.endShape(p.CLOSE)
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

/** The door's window, in the drawing's frame: for a part that has to put things in front of whoever sits behind it. */
export const pickupGlass = (pk: Pickup): Pt[] => doorShape(pk.door).glass.map(([u, v]) => pickupPoint(pk, u, v))

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

/** The gold ball: where she is handed over on the flume, the note she lands on the rail on, and when she is on the seat. */
const HANDOFF: Pt = [-1.15, 0]
const FLUME = 1.25
const ON_RAIL = 30.79
const SEATED = 31.93
/** She is out of the story here: the truck at the dam has long left the frame. */
const GONE = beat(94)

export const TRUCK_NOTES = [LAND, BONK, DOOR]
export const TRUCK_ORGAN = [...CRANKS, CATCH, LIGHTS, REV]
export const TRUCK_BEATS = [DROP, ...SLAPS, TAKEOFF, LANDING, STOP, TOUCHDOWN].sort((a, b) => a - b)

/** How far the whole truck is off the road, over the ditch. */
const jumpAt = (t: number): number => {
  if (t <= TAKEOFF || t >= LANDING) return 0
  const u = (t - TAKEOFF) / (LANDING - TAKEOFF)
  return HANG * 4 * u * (1 - u)
}

interface TruckState {
  begin: number
  b0: number
  /** The end of the flume, where both balls go over. */
  lip: number
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
  // The door: the truck rocks as she gets in.
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

/** The near door: swung open by the jolt when he hits the cab, and slammed on the note once she is in. */
function doorAt(t: number): number {
  if (t <= BONK) return 0
  const shut = DOOR - 0.22
  if (t < shut) {
    const s = t - BONK
    return easeOutCubic(clamp(s / 0.28)) + 0.06 * Math.exp(-Math.max(0, s - 0.28) / 0.12) * Math.sin(Math.max(0, s - 0.28) * 30)
  }
  if (t < DOOR) return 1 - easeInQuad((t - shut) / (DOOR - shut))
  const k = t - DOOR
  return 0.05 * Math.exp(-k / 0.06) * Math.abs(Math.sin(k * 40))
}

/** The pickup at show time `t`. */
function poseAt(s: TruckState, t: number): Pickup {
  const { pitch, lift } = bodyAt(t)
  const rear = rearAt(s.b0, t)
  return { rear, road: GROUND, pitch, lift, air: jumpAt(t) * 0.92, turn: (rear - s.b0) / WHEEL_R, door: doorAt(t), lamp: t > LIGHTS ? (t < LIGHTS + 0.25 ? (Math.sin((t - LIGHTS) * 80) > 0 ? 1 : 0.3) : 1) : 0 }
}

/** A body point (u along, v up) at show time `t`, in the part's frame. */
const bodyPoint = (s: TruckState, t: number, u: number, v: number): Pt => pickupPoint(poseAt(s, t), u, v)

/** Where along the bed the ball is, at show time `t`. */
function ballU(t: number): number {
  if (t < LAND) return 0.35
  if (t < BONK) {
    // It lands going 1.25 a second and hardly loses any of it before the cab stops it.
    const T = BONK - LAND
    const a = (2 * (1.25 * T - 0.82)) / (T * T)
    const x = t - LAND
    return 0.35 + 1.25 * x - 0.5 * a * x * x
  }
  if (t < DROP) {
    const back = 1.17 - 0.28 * easeOutCubic(clamp((t - BONK) / 0.8))
    const door = t > DOOR ? 0.05 * Math.exp(-(t - DOOR) / 0.4) * Math.sin((t - DOOR) * 10) : 0
    return back + door
  }
  // Off the line it rolls back to the tailgate, and there it stays.
  return 0.89 - (0.89 - (R + 0.05)) * clamp(((t - DROP) / 0.45) ** 2)
}

/** How high the ball is off the bed floor: small hops on the cranks, and a kick every beat through the corn. */
function ballHop(t: number): number {
  let h = 0
  for (const c of [...CRANKS, CATCH, REV]) {
    const s = t - c
    if (s > 0 && s < 0.2) h = Math.max(h, 0.05 * 4 * (s / 0.2) * (1 - s / 0.2))
  }
  const { ago } = lastOf(SLAPS, t)
  const air = beat(0.5) - beat(0)
  if (t < STOP && ago < air) h = Math.max(h, 0.17 * 4 * (ago / air) * (1 - ago / air))
  // Over the ditch the ball floats clear of the bed, and comes down a moment after the truck does.
  const f0 = TAKEOFF + 0.06
  const f1 = LANDING + 0.14
  if (t > f0 && t < f1) {
    const u = (t - f0) / (f1 - f0)
    h = Math.max(h, 0.34 * 4 * u * (1 - u))
  }
  return h
}

/**
 * Where she sits in the cab (u, v in body cells), at show time `t` once she is in: jolted with the truck, a little
 * of everything he gets in the bed, and at the dam thrown forward against the glass, where she stays.
 */
function seatAt(t: number): Pt {
  let u = SEAT[0]
  let v = SEAT[1]
  // The slam.
  const d = t - DOOR
  if (d > 0) u += 0.035 * Math.exp(-d / 0.3) * Math.sin(d * 14)
  // A lift on each turn of the engine, and on the catch and the rev.
  for (const c of [...CRANKS, CATCH, REV]) {
    const s = t - c
    if (s > 0 && s < 0.18) v += 0.025 * 4 * (s / 0.18) * (1 - s / 0.18)
  }
  // Off the line she is pressed back against the bench, and comes forward again.
  const go = t - DROP
  if (go > 0) u -= 0.06 * Math.sin(Math.min(Math.PI / 2, go * 7)) * Math.exp(-Math.max(0, go - 0.22) / 0.5)
  // Every furrow: a small bob, on the beat and down on the eighth.
  const { ago } = lastOf(SLAPS, t)
  const air = beat(0.5) - beat(0)
  if (t < STOP && ago < air) v += 0.055 * 4 * (ago / air) * (1 - ago / air)
  // The ditch: she floats up off the bench, nearly to the roof, and settles on the eighth after the wheels.
  const f0 = TAKEOFF + 0.1
  const f1 = beat(77.5)
  if (t > f0 && t < f1) {
    const w = (t - f0) / (f1 - f0)
    v += 0.2 * 4 * w * (1 - w)
  }
  // The fence: a knock forward.
  const hit = t - FENCE
  if (hit > 0) u += 0.06 * Math.exp(-hit / 0.2) * Math.sin(Math.min(Math.PI, hit * 12))
  // The brakes: forward to the dash as he goes over the roof, a bump off it, and she stays at the glass.
  const br = t - STOP
  if (br > 0) {
    const to = DASH - R - 0.02 - SEAT[0]
    u += to * easeInQuad(clamp(br / 0.26)) - 0.035 * Math.exp(-Math.max(0, br - 0.26) / 0.12) * Math.sin(Math.max(0, br - 0.26) * 22)
  }
  return [u, v]
}

/** The gold ball in the truck's frame at show time `t`: down the flume behind him, onto the rail, in at the door, and along for the ride. */
function goldAt(s: TruckState, t: number): Companion | null {
  if (t >= GONE) return null
  const pose = poseAt(s, t)
  // On the flume, going its pace, a touch quicker as she nears the end.
  const tau = t - s.begin
  const fall = Math.sqrt((2 * (GROUND - SEAT[1] - HANDOFF[1])) / 12)
  const leave = ON_RAIL - fall - s.begin
  const a = (2 * (s.lip - HANDOFF[0] - FLUME * leave)) / (leave * leave)
  const vLip = FLUME + a * leave
  if (tau < leave) return { x: HANDOFF[0] + FLUME * tau + 0.5 * a * tau * tau, y: HANDOFF[1] }
  // Over the lip, and down onto the rail on the note.
  const uLand = s.lip + vLip * fall - s.b0
  if (t < ON_RAIL) {
    const f = t - (ON_RAIL - fall)
    return { x: s.lip + vLip * f, y: HANDOFF[1] + 6 * f * f }
  }
  // Along the rail and in at the door, onto the bench.
  if (t < SEATED) {
    const T = SEATED - ON_RAIL
    const w = (t - ON_RAIL) / T
    const m0 = vLip * 0.9 * T
    const u = (2 * w ** 3 - 3 * w ** 2 + 1) * uLand + (w ** 3 - 2 * w ** 2 + w) * m0 + (-2 * w ** 3 + 3 * w ** 2) * SEAT[0]
    const [x, y] = pickupPoint(pose, u, SEAT[1])
    return { x, y }
  }
  const [u, v] = seatAt(t)
  const [x, y] = pickupPoint(pose, u, v)
  return { x, y }
}

export const truck = part<TruckState>(
  {
    name: 'pickup',
    flight: true,
    draw: (p, s, c) => drawTruck(p, s, c),
    over: (p, s, c) => {
      // The bed's near side stands in front of the ball, and the door in front of her; its glass over her.
      const t = c.t + s.begin
      const pose = poseAt(s, t)
      nearPickup(p, c.k, c.ink, c.weight, pose)
      glassPickup(p, c.k, c.ink, c.weight, pose)
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const fall = dropTime(GROUND - BALL_V)
    const edge = -0.5 + 1.25 * (at(LAND) - fall)
    const b0 = edge + 1.25 * fall - 0.35
    const s: TruckState = { begin: slot.begin, b0, lip: edge, stalks: [], edge: 0, fence: 0, ditch: [0, 0] }
    s.stalks = STALKS.map((t) => rearAt(b0, t) + LEN + 0.04)
    s.fence = rearAt(b0, FENCE) + LEN + 0.04
    s.ditch = [rearAt(b0, TAKEOFF) + WHEELS[1] + 0.2, rearAt(b0, LANDING) + WHEELS[0] - 0.15]
    s.edge = rearAt(b0, STOP + 1) + LEN + 0.12
    const bed = (t: number): Pt => {
      const [x, y] = bodyPoint(s, t + slot.begin, ballU(t + slot.begin), BALL_V + ballHop(t + slot.begin))
      return [x, y]
    }
    const land = at(LAND)
    const leave = at(STOP)
    const touch: Pt = [s.edge + 2.4, 3]
    const drop = at(LAND) - fall
    const ways: Way[] = [{ at: 0, p: [-0.5, 0] }, { at: drop, p: [edge, 0] }]
    ways.push(hop(ways[1], bed(land), land))
    const segs = [
      ...route(ways),
      ...carried(bed, land, leave, Math.ceil((leave - land) * 40)),
    ]
    const from: Way = { at: leave, p: bed(leave) }
    segs.push(...route([from, hop(from, touch, at(TOUCHDOWN))]))
    const pad = Math.ceil(s.edge + 3)
    return {
      cells: box(-1, -3, pad, 4),
      exit: [touch[0] + 0.5, touch[1]],
      lane: { segs, fire: at(DROP) },
      state: s,
      company: [{ from: slot.begin, to: GONE, at: (t) => goldAt(s, t) }],
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

  // The truck itself.
  const pose = poseAt(s, t)
  drawPickup(p, k, ink, weight, pose)

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

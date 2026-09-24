import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp, easeOutCubic } from '../../../../../../../../src/core/ease'
import { FLOOR, R, puff, type Pt } from '../../../../../parts'
import { alpha, box, carried, frame, hash, knock, lastOf, part, route, smooth, type Ctx, type Way } from '../kit'
import { beat, beats, DROP } from '../music'
import { dropTime, hop } from '../physics'
import { DUST } from '../worlds'
import { cornWall, stalk } from './corn'

/**
 * The truck. It is waiting on the field road under the bank, tailgate up,
 * and the ball drops into the bed off the end of the corn track on a note.
 * Someone gets in (the door, on a note). Then the organ: the engine turns
 * over on its first chords and catches, the headlights come on, it revs —
 * and on the drop it goes, straight into the corn.
 *
 * Through the corn it hits a stalk on every beat, and every beat the bed
 * kicks the ball up, and it comes down on the eighth. At the dam it stands
 * on its brakes on the first beat of a bar, the back end comes up, and the
 * ball goes over the cab and off the edge.
 *
 * The part's frame: the ball comes in on the bank (y = 0); the field road
 * is a cell lower (the ground at 1 + FLOOR).
 */

const GROUND = 1 + FLOOR
/** The truck, in body cells from the back of the bed (u) and up from the road (v). */
const LEN = 3.0
const BED_FLOOR = 0.62
const BED_TOP = 0.86
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
  // The door: the truck rocks as someone gets in.
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
    pitch += 0.07 * (2 * u - 1)
  }
  const down = t - LANDING
  if (down > 0 && down < 0.8) {
    lift -= 0.1 * Math.exp(-down / 0.12) * Math.cos(down * 22)
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

/** A body point (u along, v up) at show time `t`, in the part's frame. */
function bodyPoint(s: TruckState, t: number, u: number, v: number): Pt {
  const { pitch, lift } = bodyAt(t)
  const rx = rearAt(s.b0, t)
  const du = u - PIVOT[0]
  const dv = v - PIVOT[1]
  const x = du * Math.cos(pitch) + dv * Math.sin(pitch)
  const y = -du * Math.sin(pitch) + dv * Math.cos(pitch)
  return [rx + PIVOT[0] + x, GROUND - PIVOT[1] - lift - y]
}

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

export const truck = part<TruckState>(
  {
    name: 'pickup',
    flight: true,
    draw: (p, s, c) => drawTruck(p, s, c),
    over: (p, s, c) => {
      // The bed's near side stands in front of the ball.
      const t = c.t + s.begin
      const { k, ink, weight } = c
      const pts = [bodyPoint(s, t, -0.02, BED_FLOOR - 0.05), bodyPoint(s, t, CAB_U, BED_FLOOR - 0.05), bodyPoint(s, t, CAB_U, NEAR_TOP), bodyPoint(s, t, -0.02, NEAR_TOP)]
      solid(p, ink, weight, DUST.denim)
      p.beginShape()
      for (const [x, y] of pts) p.vertex(x * k, y * k)
      p.endShape(p.CLOSE)
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    const fall = dropTime(GROUND - BALL_V)
    const edge = -0.5 + 1.25 * (at(LAND) - fall)
    const b0 = edge + 1.25 * fall - 0.35
    const s: TruckState = { begin: slot.begin, b0, stalks: [], edge: 0, fence: 0, ditch: [0, 0] }
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
  p.vertex(X(-1.5), X(FLOOR))
  p.vertex(X(toe - 0.75), X(FLOOR))
  p.quadraticVertex(X(toe - 0.35), X(FLOOR + 0.15), X(toe), X(GROUND))
  p.vertex(X(-1.5), X(GROUND))
  p.endShape()
  p.stroke(alpha(p, ink, 0.3))
  p.strokeWeight(Math.max(1, weight * 0.6))
  for (let i = 0; i < 6; i++) {
    const gx = -1.3 + i * 0.37 + hash(i, 13) * 0.2
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
          a = spin * half * 5 * fly + (hit > 0.9 ? 0 : 0)
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

  // The truck: wheels on the road, the body on its springs.
  const rx = rearAt(s.b0, t)
  for (const u of WHEELS) {
    const wx = rx + u
    const wy = GROUND - WHEEL_R - jumpAt(t) * 0.92
    const turn = (rx - s.b0) / WHEEL_R
    solid(p, ink, weight, ink)
    p.circle(X(wx), X(wy), X(WHEEL_R * 2))
    solid(p, ink, weight * 0.6, DUST.bone)
    p.circle(X(wx), X(wy), X(WHEEL_R * 0.95))
    outline(p, ink, weight * 0.6)
    for (let j = 0; j < 3; j++) {
      const a = turn + (j * Math.PI * 2) / 3
      p.line(X(wx), X(wy), X(wx + Math.cos(a) * WHEEL_R * 0.45), X(wy + Math.sin(a) * WHEEL_R * 0.45))
    }
  }
  const B = (u: number, v: number) => bodyPoint(s, t, u, v)
  const shape = (pts: Pt[], fill: string, w = weight) => {
    solid(p, ink, w, fill)
    p.beginShape()
    for (const [u, v] of pts) {
      const [x, y] = B(u, v)
      p.vertex(X(x), X(y))
    }
    p.endShape(p.CLOSE)
  }
  // The bed's far side and floor, the cab, the hood.
  shape([[0, BED_FLOOR - 0.06], [CAB_U, BED_FLOOR - 0.06], [CAB_U, BED_TOP], [0, BED_TOP]], DUST.shade)
  shape([[0, 0.34], [LEN, 0.34], [LEN, 0.62], [0, 0.62]], DUST.denim)
  shape([[CAB_U, 0.4], [HOOD_U + 0.05, 0.4], [HOOD_U + 0.05, HOOD], [HOOD_U - 0.08, ROOF - 0.06], [HOOD_U - 0.2, ROOF], [CAB_U + 0.05, ROOF], [CAB_U, ROOF - 0.05]], DUST.denim)
  shape([[HOOD_U, 0.4], [LEN, 0.4], [LEN, HOOD - 0.1], [LEN - 0.12, HOOD], [HOOD_U, HOOD]], DUST.denim)
  // Windows: the back glass and the door's.
  shape([[CAB_U + 0.1, 1.0], [HOOD_U - 0.12, 1.0], [HOOD_U - 0.12, ROOF - 0.12], [CAB_U + 0.1, ROOF - 0.12]], DUST.sky, weight * 0.8)
  // The door and its handle; it opens a crack and slams on the note.
  const door = t - DOOR
  const open = door < 0 && door > -0.9 ? Math.sin(((door + 0.9) / 0.9) * Math.PI) * 0.12 : 0
  outline(p, ink, weight * 0.8)
  const d0 = B(CAB_U + 0.08 + open, 0.45)
  const d1 = B(CAB_U + 0.08 + open, 1.0)
  p.line(X(d0[0]), X(d0[1]), X(d1[0]), X(d1[1]))
  const h0 = B(CAB_U + 0.2, 0.9)
  const h1 = B(CAB_U + 0.32, 0.9)
  p.line(X(h0[0]), X(h0[1]), X(h1[0]), X(h1[1]))
  // Bumpers, grille, the lamp.
  shape([[LEN - 0.02, 0.36], [LEN + 0.08, 0.36], [LEN + 0.08, 0.5], [LEN - 0.02, 0.5]], DUST.bone, weight * 0.8)
  shape([[-0.08, 0.36], [0.02, 0.36], [0.02, 0.5], [-0.08, 0.5]], DUST.bone, weight * 0.8)
  const lit = t > LIGHTS ? 1 : 0
  const lamp = B(LEN - 0.05, 0.84)
  if (lit) {
    // The beam, low into the corn.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const flick = t < LIGHTS + 0.25 ? (Math.sin((t - LIGHTS) * 80) > 0 ? 1 : 0.3) : 1
    const g = ctx.createLinearGradient(X(lamp[0]), 0, X(lamp[0] + 2.4), 0)
    g.addColorStop(0, `rgba(255, 244, 205, ${0.55 * flick})`)
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
  solid(p, ink, weight * 0.8, lit ? DUST.light : DUST.shade)
  p.circle(X(lamp[0]), X(lamp[1]), X(0.11))
  // The mirror.
  const m0 = B(HOOD_U - 0.05, 1.08)
  outline(p, ink, weight * 0.8)
  p.line(X(m0[0]), X(m0[1]), X(m0[0] + 0.1), X(m0[1] - 0.05))

  // The tailgate, shut.
  shape([[-0.06, BED_FLOOR - 0.06], [0.02, BED_FLOOR - 0.06], [0.02, BED_TOP], [-0.06, BED_TOP]], DUST.denim)

  // Exhaust: a puff a turn of the engine, a steady thread once it runs, a cloud at each rev.
  const pipe = B(-0.05, 0.3)
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

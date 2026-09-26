import type { Pt } from '../../../../../parts'
import { beat, beatAt, DOORS, FESTIVAL } from '../music'
import { G_RAIL } from '../physics'

/**
 * The line and the train on it: everything EXPRESS's drawing, its lane and the night's sky agree on, and what
 * FIREWORKS needs to know about where the express leaves it. World cells of the railway (the express's leg is laid at
 * [0, 0], so its frame is the world's). y is down; `v` in the engine's own cells is up from the rail.
 *
 * The engine is drawn in its own cells: `u` along it from the chimney's middle (forward, east, is +), `v` up from the
 * top of the rail. At the door (`DOORS.railway`) the chimney's lip is at world (-0.5, 0), where the spark comes out.
 */

/** World y of the top of the rail. The chimney's lip is 4.5 above it, at y = 0. */
export const RAIL_Y = 4.5

/* ------------------------------------------------------------------ the engine's layout (u forward, v up) */

/** The driving wheels: radius, axle height, where they are, the crank's throw. */
export const WHEEL = 0.9
export const AXLE_V = 0.9
export const LEAD = -2.55
export const TRAIL = -4.5
export const CRANK = 0.55
/** How far above the crank pin's middle the spark rides on its boss. */
export const BOSS = 0.22
/** The bogie's small wheels. */
export const BOGIE: readonly number[] = [0.3, 1.3]
export const BOGIE_R = 0.42
/** The cylinder: its axis and ends; the slide bars behind it. */
export const CYL = { u0: 0.15, u1: 1.4, v: 1.35, r: 0.36 }
export const SLIDE = { u0: -1.35, u1: 0.15 }
export const MAIN_ROD = 2.0
/** The running board's top, and where it runs. */
export const BOARD = { v: 2.25, u0: -5.6, u1: 1.0 }
/** The boiler: its middle, the barrel's radius and ends, the smokebox's. */
export const BOILER = { v: 2.98, r: 0.74, u0: -4.35, u1: -0.8 }
export const SMOKEBOX = { r: 0.8, u0: -0.8, u1: 1.0 }
/** The chimney's lip. */
export const LIP_V = 4.5
/** The fittings on top, front to back: the steam dome, the safety valves; the whistle on the firebox. */
export const DOME = { u: -1.9, w: 0.95, top: 4.28 }
export const VALVES = { u: -3.3, w: 0.46, top: 4.06 }
export const FIREBOX = { u0: -5.6, u1: -4.35, top: 3.82 }
export const WHISTLE = { u: -5.05, top: 4.32 }
/** The cab. */
export const CAB = { u0: -7.6, u1: -5.6, floor: 1.95, eave: 4.3, top: 4.55 }
/** The ashpan's mouth, glowing, in the slot behind the trailing wheel: where the fire draws its air in. */
export const MOUTH = { u0: -5.56, u1: -5.43, v0: 0.42, v1: 1.3 }
/** The buffer beam and its buffers' faces. */
export const BEAM = { u0: 1.45, u1: 1.8, v0: 1.05, v1: 1.75 }
export const NOSE = 2.13
/** The tender and the two wagons, rear to front ends. */
export const TENDER = { u0: -13.2, u1: -8.0 }
export const ROCKETS = { u0: -18.5, u1: -13.7 }
export const CRATES = { u0: -23.8, u1: -19.0 }
/** Where the pitch of the body turns about. */
const PIVOT: Pt = [-2.6, 1.5]

/* ------------------------------------------------------------------ the tempo: the wheels are the music */

/** A turn of the driving wheels, in cells along the rail. */
export const TURN = 2 * Math.PI * WHEEL
/** The quarter the train starts on (the door), the quarter it is up to the tempo by, and the quarter its brakes go on. */
export const K_DOOR = 192
const RAMP = 9
export const K_BRAKE = 253
/** Show times: the door, full speed, the brakes, the buffer stops at the festival. */
export const T_DOOR = DOORS.railway
export const T_TEMPO = beat(K_DOOR + RAMP)
export const T_BRAKE = beat(K_BRAKE)
export const T_STOP = FESTIVAL
/** The brakes' pull, cells a second a second, once they bite. */
export const DECEL = 6

/**
 * How many turns the driving wheels have made at quarter `k`. From the door the train pulls away harder at first and
 * less as it comes up to speed (9 quarters), and from then on it is locked to the music: a turn every two quarters, so
 * the crank pins are at the top on every backbeat (the odd quarters) and the whole train speeds up exactly as the
 * orchestra does. From the brakes the wheels are locked, and the train slides.
 */
function turnsAtBeat(k: number): number {
  const u = Math.min(k, K_BRAKE) - K_DOOR
  if (u <= 0) return 0
  if (u < RAMP) {
    const x = u / RAMP
    return 0.5 * RAMP * (x * x - (x * x * x) / 3)
  }
  return RAMP / 3 + (u - RAMP) / 2
}

/**
 * The quarter at show time `t`, smooth: `beatAt` is piecewise linear, so a train on it would change speed with a
 * jolt at every quarter. This is a monotone cubic through the same quarters (Fritsch-Carlson), so the train's speed
 * is continuous and every quarter still falls exactly where it was measured.
 */
const Q = Array.from({ length: 289 }, (_, k) => beat(k))
const SLOPE: number[] = Q.map((_, i) => {
  if (i === 0) return 1 / (Q[1] - Q[0])
  if (i === Q.length - 1) return 1 / (Q[i] - Q[i - 1])
  const a = 1 / (Q[i] - Q[i - 1])
  const b = 1 / (Q[i + 1] - Q[i])
  const h0 = Q[i] - Q[i - 1]
  const h1 = Q[i + 1] - Q[i]
  return (3 * (h0 + h1)) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b)
})
function smoothBeat(t: number): number {
  if (t <= Q[0] || t >= Q[Q.length - 1]) return beatAt(t)
  const k = Math.min(Q.length - 2, Math.floor(beatAt(t)))
  const h = Q[k + 1] - Q[k]
  const s = (t - Q[k]) / h
  const s2 = s * s
  const s3 = s2 * s
  return (2 * s3 - 3 * s2 + 1) * k + (s3 - 2 * s2 + s) * h * SLOPE[k] + (-2 * s3 + 3 * s2) * (k + 1) + (s3 - s2) * h * SLOPE[k + 1]
}

/** The driving wheels' turns at show time `t` (0 before the door; fixed from the brakes on). */
export const turns = (t: number): number => turnsAtBeat(smoothBeat(t))

/** The train's speed at the brakes (cells a second), and how far it had come. */
const V_BRAKE = TURN * 0.5 * SLOPE[K_BRAKE]
const D_BRAKE = TURN * turnsAtBeat(K_BRAKE)
const V_STOP = V_BRAKE - DECEL * (T_STOP - T_BRAKE)
const D_STOP = D_BRAKE + V_BRAKE * (T_STOP - T_BRAKE) - 0.5 * DECEL * (T_STOP - T_BRAKE) ** 2
/** The buffer springs: how hard they are, and how fast they die. */
const SPRING = 10
const DAMP = 0.32

/** How far the train has come since the door, in cells. */
export function travel(t: number): number {
  if (t <= T_DOOR) return 0
  if (t <= T_BRAKE) return TURN * turns(t)
  if (t <= T_STOP) {
    const s = t - T_BRAKE
    return D_BRAKE + V_BRAKE * s - 0.5 * DECEL * s * s
  }
  // Into the buffer stops: the springs take it and give some back, a heavy rock that dies away.
  const s = t - T_STOP
  return D_STOP + (V_STOP / SPRING) * Math.sin(SPRING * s) * Math.exp(-s / DAMP)
}

/** The train's speed along the rail at `t`, cells a second (sampled, for the drawing's streaks and puffs). */
export const speed = (t: number): number => (travel(t + 0.01) - travel(t - 0.01)) / 0.02

/** Where the engine's chimney stands at `t` (world x of u = 0). */
export const engineX = (t: number): number => -0.5 + travel(t)

/** The wheels' turn at `t`, radians, clockwise on the screen (the way they roll going east), 0 with the pins at the top. */
export const crank = (t: number): number => 2 * Math.PI * turns(t)

/* ------------------------------------------------------------------ the body on its springs */

/** The backbeats the train runs over a rail joint on, from full speed to the brakes. */
export const JOINTS: readonly number[] = Array.from({ length: 64 }, (_, i) => beat(K_DOOR + RAMP + 2 * i)).filter((t) => t >= T_TEMPO - 1e-6 && t < T_BRAKE - 0.05)

/** How the body sits: `lift` (cells, up) and `pitch` (radians, nose down) at show time `t`. */
export function pose(t: number): { lift: number; pitch: number } {
  let lift = 0
  let pitch = 0
  // The first chuffs: the body snatches back and rocks on its springs as the train takes the strain.
  const go = t - T_DOOR
  if (go > 0) pitch -= 0.022 * Math.exp(-go / 0.35) * Math.sin(go * 9)
  // A rail joint every backbeat: a knock through the springs, gone by the next.
  let last = -1
  for (const j of JOINTS) if (j <= t) last = j
  if (last >= 0) {
    const a = t - last
    lift += 0.028 * Math.exp(-a / 0.1) * Math.sin(a * 28)
    pitch += 0.004 * Math.exp(-a / 0.12) * Math.sin(a * 22)
  }
  // The brakes: the nose goes down and stays down while it slides; at the buffer stops it bows and rocks back.
  const br = t - T_BRAKE
  if (br > 0) pitch += 0.03 * (1 - Math.exp(-br / 0.12)) * (t < T_STOP ? 1 : Math.exp(-(t - T_STOP) / 0.5))
  const hit = t - T_STOP
  if (hit > 0) pitch += 0.035 * Math.sin(Math.min(Math.PI, hit * 14)) * Math.exp(-hit / 0.5) + 0.012 * Math.sin(hit * 7) * Math.exp(-hit / 0.8) * (hit > 0.22 ? 1 : 0)
  return { lift, pitch }
}

/** A point of the sprung body (u along, v up) at show time `t`, in world cells. */
export function bodyPoint(t: number, u: number, v: number, at = pose(t)): Pt {
  const du = u - PIVOT[0]
  const dv = v - PIVOT[1]
  const c = Math.cos(at.pitch)
  const s = Math.sin(at.pitch)
  const ru = du * c + dv * s
  const rv = -du * s + dv * c
  return [engineX(t) + PIVOT[0] + ru, RAIL_Y - (PIVOT[1] + rv + at.lift)]
}

/** A point on the wheels' plane (unsprung: it rides the rail), in world cells. */
export const wheelPoint = (t: number, u: number, v: number): Pt => [engineX(t) + u, RAIL_Y - v]

/** The middle of a driving wheel's crank pin at `t`, world cells. */
export function pinAt(t: number, axle: number): Pt {
  const a = crank(t) - Math.PI / 2
  const [x, y] = wheelPoint(t, axle, AXLE_V)
  return [x + CRANK * Math.cos(a), y + CRANK * Math.sin(a)]
}

/* ------------------------------------------------------------------ the line */

/** The halt the fireworks special stands at (world x of the platform's ends). */
export const HALT = { x0: -16, x1: 7 }
/** The trestle over the river: where the embankment ends and starts again (world x), and how far down the river is. */
export const TRESTLE = { x0: 79.5, x1: 110.5, depth: 7.2 }
/** The telegraph poles: one passes the trailing wheel on every backbeat at speed. From after the halt to the brakes. */
export const POLE_STEP = TURN
export const POLES: readonly number[] = Array.from({ length: 40 }, (_, i) => -0.5 + TRAIL + TURN * (i + 3)).filter((x) => x > HALT.x1 + 2 && (x < TRESTLE.x0 - 1 || x > TRESTLE.x1 + 1) && x < 165)
/** The red signal before the terminus: the engine's nose passes it as the brakes go on. */
export const SIGNAL_X = engineX(T_BRAKE) + NOSE + 0.4
/** The buffer stops at the end of the line: their face, where the engine's buffers meet them at the festival. */
export const BUFFER_STOP = engineX(T_STOP) + NOSE

/* ------------------------------------------------------------------ into the fire, and the throw */

/** At the bottom of its turn the pin carries the spark past the ashpan's mouth; the draught takes it in on the backbeat. */
export const T_SUCK = beat(250.5)
export const T_IN = beat(251)

/** Out of the chimney on the last backbeat before the festival, as the braking engine comes down to the spark's pace. */
export const T_OUT = beat(K_BRAKE + 2)
/** The spark's velocity at the festival (`SEAMS.festival`). */
export const THROW_V: Pt = [4.5, -2.5]
const T_FLY = T_STOP - T_OUT
/** The chimney's lip as the spark bursts out of it. */
export const LIP_OUT: Pt = bodyPoint(T_OUT, 0, LIP_V)
/** Where the spark is at the festival: the end of EXPRESS's lane, and FIREWORKS's entry (-0.5, 0). World cells. */
export const THROWN: Pt = [LIP_OUT[0] + THROW_V[0] * T_FLY, LIP_OUT[1] + THROW_V[1] * T_FLY - 0.5 * G_RAIL * T_FLY * T_FLY]
/**
 * For FIREWORKS, in its own frame (its entry at (-0.5, 0), so its origin is `THROWN + [0.5, 0]`): the ground (the top of
 * the rail, and the field's level) is `FIELD.ground` below it; the buffer stops' face is at `FIELD.stops`, the standing
 * engine's buffers just behind that, its chimney at `FIELD.chimney`. The engine and the stops are EXPRESS's to draw.
 */
export const FIELD = {
  origin: [THROWN[0] + 0.5, THROWN[1]] as Pt,
  ground: RAIL_Y - THROWN[1],
  stops: BUFFER_STOP - (THROWN[0] + 0.5),
  chimney: engineX(T_STOP + 3) - (THROWN[0] + 0.5),
}

import { R, type Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { beat, beatAt, CODA, DOORS, FESTIVAL, onset, ROLL } from '../music'
import { G_RAIL } from '../physics'
import { HOME_LEAP, SEAMS } from '../seams'
import { RAILWAY } from '../worlds'
import { FIELD } from './express-line'

/**
 * FIREWORKS, worked out once: where everything in the festival's launch field stands, when each thing goes off, and
 * where the spark is at every show time. The lane and the drawing both read this. Cells are the part's own frame:
 * the spark comes in at (-0.5, 0), flung off the front of the braking express, and y is down.
 *
 *   124.010  flung off the engine, over the end of the line and down to the field below
 *   124.983  onto the quick-match at the first rack: its tube fires (a comet a backbeat from here)
 *   125.616, 126.244, 126.883  along the sagging match, rack to rack: two comets, three, four
 *   127.530  the gerb: a fountain erupts under it and carries it up; 128.172 it surges
 *   128.802  onto the Niagara wire; every backbeat to 133.674 lights the next length of the falling curtain
 *   133.674  off the wire's end, down with the last of the curtain
 *   134.254  the crash: onto the finale's master fuse; the mines and the first gun go up at once and throw it
 *   135.411  onto the great wheel's rim as the first big shell bursts; the battery fires on down the coda, each
 *            shell bursting about 0.95 s after it leaves its gun, so every chord is a launch or a burst
 *   137.4-138.6  the crescendo: the wheel's drivers catch one by one and it spins up
 *   139.072  flung off the wheel; 140.273 onto the foot of the Titan's leader
 *   140.3-143.2  the second crescendo: up the leader, a fuse burning up the side of the biggest gun
 *   143.199  over the lip and in; the flanking guns fire. 143.926 the Titan fires with the spark on its shell
 *   144.120  the flanking shells burst either side; 144.840 the Titan bursts with the spark at its heart
 *   145.079  its stars crackle; 145.345-146.601 the salute barrage, six flash-bangs round the falling spark
 *   146.601  down into the ash by a burning crate, on the last hammer blow. 147.0 silence: all but out
 *   148.243  the roll: it flares, and darts up and left into the crate's fire (148.330, the first door home)
 */

export const g = G_RAIL
const C = (i: number): number => CODA[i].t

/* ------------------------------------------------------------------ times (show seconds) */

export const IN = FESTIVAL
export const OUT = DOORS.back[0]
/** The last two phrases' backbeats: eighths 2, 6, … 30 of phrases 16 and 17 (odd quarters from 257). */
export const BACKBEATS = [257, 259, 261, 263, 265, 267, 269, 271, 273, 275, 277, 279, 281, 283, 285, 287].map(beat)
export const RACK_AT = [beat(259), beat(261), beat(263), beat(265)]
export const LAND_AT = RACK_AT[0]
export const GERB_AT = beat(267)
export const SURGE_AT = beat(269)
export const WIRE_AT = beat(271)
/** The Niagara's nine lengths, each lit as the spark passes over it, a backbeat apart. */
export const UNIT_AT = [271, 273, 275, 277, 279, 281, 283, 285, 287].map(beat)
export const TIP_AT = UNIT_AT[8]
export const CRASH = C(0)
export const WHEEL_AT = C(2)
export const FLING = C(7)
export const LEADER_AT = C(10)
export const DIVE = C(12)
export const TITAN_FIRE = C(13)
export const FLANK_BURST = C(14)
export const TITAN_BURST = C(15)
export const CRACKLE = C(16)
export const HAMMERS = CODA.slice(-6).map((c) => c.t)
export const DOWN = HAMMERS[5]
export const FLARE = ROLL
/** The wheel's drivers catch on these: the spark's touch, the chords, then every note of the crescendo. */
export const DRIVERS_AT = [C(2), C(3), C(4), C(5), onset(137.404, 0.5), onset(137.529, 0.5), onset(137.655, 0.5), onset(137.921, 0.5), onset(138.062, 0.5), C(6)]
const T5_AT = onset(138.149, 0.5)
const T6_AT = onset(138.392, 0.5)
/** The silence: from here nothing is struck until the roll. */
export const HUSH = 147.0

/* ------------------------------------------------------------------ the spark's first flight, and the ground */

export const ENTRY: Pt = [-0.5, 0]
const V_IN = SEAMS.festival.v as Pt
const ballistic = (p: Pt, v: Pt, s: number, gg = g): Pt => [p[0] + v[0] * s, p[1] + v[1] * s + 0.5 * gg * s * s]
/** Where the flight off the engine comes down, on the first backbeat it can: the top of the first rack. */
export const LAND = ballistic(ENTRY, V_IN, LAND_AT - IN)
/**
 * The field's ground: the rail's level, where the line ends in its buffer stops (EXPRESS's `FIELD`; EXPRESS draws the
 * stops and the standing engine). The quick-match crosses each rack at the flight's landing height.
 */
export const GY = FIELD.ground
export const STOPS = FIELD.stops
export const ROPE_Y = LAND[1] + R
export const RACK_H = GY - ROPE_Y

/* ------------------------------------------------------------------ the racks and the match */

export const SPAN = 1.85
export const RACK_X = [0, 1, 2, 3].map((i) => LAND[0] + SPAN * i)
/** How many tubes each rack holds: one, two, three, four, a comet each. */
export const RACK_N = [1, 2, 3, 4]
/** The racks' tubes stand up through the frame, well over the match: the comets leave their mouths over the spark. */
export const TUBE_H = RACK_H + 0.62
/** The gerb's mouth: the match's last post. */
export const GERB: Pt = [LAND[0] + SPAN * 4, ROPE_Y]
const SAG = 0.3
/** How far the spark slows over a post: its speed there is (1 - EASE) of the span's mean. */
const EASE = 0.55
const POSTS = [...RACK_X, GERB[0]]
const POST_AT = [...RACK_AT, GERB_AT]

/** The quick-match's height at x, sagging between the posts. */
export function ropeY(x: number): number {
  if (x <= POSTS[0] || x >= POSTS[4]) return ROPE_Y
  let i = 0
  while (x > POSTS[i + 1]) i++
  const u = (x - POSTS[i]) / (POSTS[i + 1] - POSTS[i])
  return ROPE_Y + 4 * SAG * u * (1 - u)
}

function runAt(t: number): Pt {
  let i = 0
  while (i < 3 && t > POST_AT[i + 1]) i++
  const s = Math.max(0, Math.min(1, (t - POST_AT[i]) / (POST_AT[i + 1] - POST_AT[i])))
  const u = s - (EASE * Math.sin(2 * Math.PI * s)) / (2 * Math.PI)
  const x = POSTS[i] + (POSTS[i + 1] - POSTS[i]) * u
  return [x, ropeY(x) - R]
}
/** Where the match is burnt to: the spark's x while it runs it, all of it after. */
export const burntTo = (t: number): number => (t < LAND_AT ? -Infinity : t >= GERB_AT ? Infinity : runAt(t)[0])

/* ------------------------------------------------------------------ the gerb */

/** How high the gerb's fountain stands over its mouth: up at once, a surge on the next backbeat, dying by 132.6. */
export function jetTop(t: number): number {
  const u = t - GERB_AT
  if (u <= 0) return 0
  let h = 2.0 * (1 - Math.exp(-u / 0.22))
  const v = t - SURGE_AT
  if (v > 0) h += 1.75 * (1 - Math.exp(-v / 0.2))
  return h * (1 - smooth(t, 131.0, 132.6))
}
/** The spark riding the top of the fountain, leaning a little over to the wire's side. */
const onJet = (t: number): Pt => {
  const u = Math.max(0, t - GERB_AT)
  return [GERB[0] + 0.1 * (1 - Math.exp(-u / 0.35)), GERB[1] - R - jetTop(t)]
}
const onJetV = (t: number): Pt => {
  const a = onJet(t - 0.001)
  const b = onJet(t + 0.001)
  return [(b[0] - a[0]) / 0.002, (b[1] - a[1]) / 0.002]
}
/** When the fountain hands it over to the wire, and from where. */
const LEAVE_AT = WIRE_AT - 0.3
const P_LEAVE = onJet(LEAVE_AT)

/* ------------------------------------------------------------------ the Niagara wire */

export const UNIT = 1.9
export const MAST_A = GERB[0] + 0.45
export const HANG0 = MAST_A + 0.45
export const HANG = UNIT_AT.map((_, j) => HANG0 + UNIT * j)
export const MAST_B = HANG[8] + 0.9
const WSAG = 0.45
const wireSag = (x: number): number => {
  const u = (x - MAST_A) / (MAST_B - MAST_A)
  return 4 * WSAG * u * (1 - u)
}
/** The wire's height at its two masts: set so the fountain hands the spark down onto it by a third of a cell. */
export const WIRE_Y = P_LEAVE[1] + 0.3 + R - wireSag(HANG0)
export const wireY = (x: number): number => WIRE_Y + wireSag(x)
/** How long a length of the Niagara pours once lit. */
/** (Long enough that the whole curtain is pouring at once as the spark reaches the wire's end.) */
export const POUR = 5.4

const W0: Pt = [HANG[0], wireY(HANG[0]) - R]
const wireRun = (t: number): Pt => {
  const x = HANG[0] + ((beatAt(t) - 271) / 16) * (HANG[8] - HANG[0])
  return [x, wireY(x) - R]
}
/** From the top of the fountain over the mast's cap and down onto the wire: a cubic whose ends keep both speeds. */
const handOver = (() => {
  const T = WIRE_AT - LEAVE_AT
  const v0 = onJetV(LEAVE_AT)
  const a = wireRun(WIRE_AT)
  const b = wireRun(WIRE_AT + 0.002)
  const v1: Pt = [(b[0] - a[0]) / 0.002, (b[1] - a[1]) / 0.002]
  return (t: number): Pt => {
    const s = Math.max(0, Math.min(1, (t - LEAVE_AT) / T))
    const h00 = 2 * s ** 3 - 3 * s * s + 1
    const h10 = s ** 3 - 2 * s * s + s
    const h01 = -2 * s ** 3 + 3 * s * s
    const h11 = s ** 3 - s * s
    return [h00 * P_LEAVE[0] + h10 * T * v0[0] + h01 * W0[0] + h11 * T * v1[0], h00 * P_LEAVE[1] + h10 * T * v0[1] + h01 * W0[1] + h11 * T * v1[1]]
  }
})()

/* ------------------------------------------------------------------ the crash, the battery, the wheel */

/** Where the spark comes down off the end of the wire, at the head of the finale's master fuse. */
export const CRASH_AT: Pt = [HANG[8] + 0.35, GY - R]
/** The great wheel: centre, rim, and the spark's orbit round it (on the rim's outside). */
export const WHEEL_R = 1.7
export const ORBIT = WHEEL_R + R
const LOB_VX = 6
export const WHEEL: Pt = [CRASH_AT[0] + LOB_VX * (WHEEL_AT - CRASH) + ORBIT, GY - 4.0]
const P_WHEEL: Pt = [WHEEL[0] - ORBIT, WHEEL[1]]

/**
 * The wheel turns counterclockwise on the screen: the spark lands on its left side going down, goes round under it,
 * up its right side and over, and round once more, faster and faster as the drivers catch, until it is flung off
 * the lower right, up and to the right, at `FLING`. Its speed there is what lands it at the Titan's leader on
 * `LEADER_AT`; its starting speed is the spark's knock.
 */
const W0_SPEED = 1.2
const REL = Math.PI / 4
const SPIN_D = FLING - WHEEL_AT
/** The speed at release: what the fling needs to come down on the ground at `LEADER_AT`. */
const OMEGA_R = (() => {
  const T = LEADER_AT - FLING
  // y at landing: WHEEL.y + ORBIT sin(REL) - ORBIT ω cos(REL) T + g T²/2 = GY - R
  return (WHEEL[1] + ORBIT * Math.sin(REL) + 0.5 * g * T * T - (GY - R)) / (ORBIT * Math.cos(REL) * T)
})()
const TURN = (3 * Math.PI) / 4 + 2 * Math.PI
const SPIN_P = (OMEGA_R - W0_SPEED) / (TURN / SPIN_D - W0_SPEED) - 1
/** The wheel's turning speed (radians a second, counterclockwise). */
export function omega(t: number): number {
  if (t < WHEEL_AT) return 0
  if (t < FLING) return W0_SPEED + (OMEGA_R - W0_SPEED) * Math.pow((t - WHEEL_AT) / SPIN_D, SPIN_P)
  // Its drivers burn on a while, then out one by one: it runs down and stops.
  return OMEGA_R * Math.exp(-Math.max(0, t - 140.6) / 1.6) * (1 - smooth(t, 144.5, 147.5))
}
/** How far the wheel has turned since the spark landed on it (radians, counterclockwise). */
export function turned(t: number): number {
  if (t <= WHEEL_AT) return 0
  if (t <= FLING) {
    const u = (t - WHEEL_AT) / SPIN_D
    return SPIN_D * (W0_SPEED * u + ((OMEGA_R - W0_SPEED) * Math.pow(u, SPIN_P + 1)) / (SPIN_P + 1))
  }
  // After the fling: integrate numerically (it is smooth and slow to change).
  let a = TURN
  const dt = 1 / 120
  for (let s = FLING; s < t; s += dt) a += omega(Math.min(t, s + dt / 2)) * Math.min(dt, t - s)
  return a
}
const wheelRide = (t: number): Pt => {
  const phi = Math.PI - turned(t)
  return [WHEEL[0] + ORBIT * Math.cos(phi), WHEEL[1] + ORBIT * Math.sin(phi)]
}
const P_REL = wheelRide(FLING)
const V_REL: Pt = [ORBIT * OMEGA_R * Math.sin(REL), -ORBIT * OMEGA_R * Math.cos(REL)]

/* ------------------------------------------------------------------ the Titan */

/** The leader's foot on the ground, where the fling comes down. */
export const LEADER_FOOT: Pt = ballistic(P_REL, V_REL, LEADER_AT - FLING)
export const TITAN_W = 1.3
export const TITAN_X = LEADER_FOOT[0] + 1.05
export const LIP = GY - 2.75
/** How high its shell carries the spark over the muzzle before it bursts. */
export const TITAN_RISE = 5.8
const WALL = TITAN_X - TITAN_W / 2
const FOOT_R = WALL - R - 0.04 - LEADER_FOOT[0]
const CLIMB_X = LEADER_FOOT[0] + FOOT_R
const OVER_R = R + 0.04
const IN_AT: Pt = [TITAN_X - 0.24, LIP + 0.14]

/** The spark's way up the leader: round its foot, up the Titan's side, over the lip. Points, and arc length. */
const CLIMB = (() => {
  const pts: Pt[] = []
  // Round the foot: from lying along the ground (going right) to going up the tube's side.
  for (let i = 0; i <= 14; i++) {
    const a = Math.PI / 2 - (i / 14) * (Math.PI / 2)
    pts.push([LEADER_FOOT[0] + FOOT_R * Math.cos(a), GY - R - FOOT_R + FOOT_R * Math.sin(a)])
  }
  pts.push([CLIMB_X, LIP + 0.01])
  // Over the lip's corner.
  for (let i = 1; i <= 10; i++) {
    const a = Math.PI + (i / 10) * (Math.PI / 2)
    pts.push([WALL + OVER_R * Math.cos(a), LIP + OVER_R * Math.sin(a)])
  }
  const len: number[] = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { pts, len, L: len[len.length - 1] }
})()
const alongClimb = (d: number): Pt => {
  const { pts, len } = CLIMB
  let i = 1
  while (i < len.length - 1 && len[i] < d) i++
  const f = Math.max(0, Math.min(1, (d - len[i - 1]) / Math.max(1e-9, len[i] - len[i - 1])))
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
}
const OVER_AT = DIVE - 0.14
const climbAt = (t: number): Pt => {
  // Slow at first, and faster and faster with the crescendo.
  const u = Math.max(0, Math.min(1, (t - LEADER_AT) / (OVER_AT - LEADER_AT)))
  return alongClimb(CLIMB.L * (0.16 * u + 0.84 * u * u))
}
const P_OVER = climbAt(OVER_AT)
/** Over the lip it goes on at the pace it climbed at, curving down into the muzzle. */
const dive = (() => {
  const T = DIVE - OVER_AT
  const speed = (CLIMB.L * (0.16 + 1.68)) / (OVER_AT - LEADER_AT)
  const P1: Pt = [P_OVER[0] + (speed * T) / 2, P_OVER[1]]
  return (t: number): Pt => {
    const s = Math.max(0, Math.min(1, (t - OVER_AT) / T))
    const a = (1 - s) * (1 - s)
    const b = 2 * s * (1 - s)
    const c = s * s
    return [a * P_OVER[0] + b * P1[0] + c * IN_AT[0], a * P_OVER[1] + b * P1[1] + c * IN_AT[1]]
  }
})()
/** The Titan's shell: straight up from its muzzle, slowing to a stop where it bursts (as every shell here does). */
const P_LAUNCH: Pt = [TITAN_X, LIP - R]
export const APEX: Pt = [TITAN_X, LIP - R - TITAN_RISE]
const titanRise = (t: number): Pt => {
  const u = Math.max(0, Math.min(1, (t - TITAN_FIRE) / (TITAN_BURST - TITAN_FIRE)))
  return [TITAN_X, P_LAUNCH[1] - TITAN_RISE * (1 - (1 - u) * (1 - u))]
}

/* ------------------------------------------------------------------ the fall, the ash, the crate */

/** Where it lands in the ash, and where it comes to rest. */
export const X_LAND = TITAN_X + 6.2
export const REST: Pt = [X_LAND + 0.13, GY - R]
export const REST_AT = DOWN + 0.5
/** The crate, tipped on its side with its open end to the right, burning: its mouth is just up and left of the spark, a little space between. */
export const CRATE = { x0: REST[0] - 0.45 - 1.3, x1: REST[0] - 0.45, h: 0.95 }
/**
 * The fall from the Titan's burst: thrown up and right by it, then drifting down like the rest of its stars, slowed
 * by the air (linear drag, `DRAG`, solved so it comes down on the last hammer blow).
 */
const FALL_T = DOWN - TITAN_BURST
const FALL_VY = -1.2
const DRAG = (() => {
  const H = GY - R - APEX[1]
  const yAt = (k: number) => (g / k) * FALL_T + (FALL_VY - g / k) * (1 - Math.exp(-k * FALL_T)) / k
  let lo = 0.2
  let hi = 8
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (yAt(mid) > H) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
})()
const FALL_VX = ((X_LAND - APEX[0]) * DRAG) / (1 - Math.exp(-DRAG * FALL_T))
const fallAt = (t: number): Pt => {
  const s = Math.max(0, t - TITAN_BURST)
  const E = (1 - Math.exp(-DRAG * s)) / DRAG
  return [APEX[0] + FALL_VX * E, APEX[1] + FALL_VY * E + (g / DRAG) * (s - E)]
}
const BOUNCE_AT = DOWN + 0.2

/** The dart home: from rest to the last leap's velocity in the time from the roll to the first door. */
const HL = HOME_LEAP as Pt
export const DART_END: Pt = [REST[0] + (HL[0] * (OUT - FLARE)) / 2, REST[1] + (HL[1] * (OUT - FLARE)) / 2]

/* ------------------------------------------------------------------ the spark's path */

export interface Piece {
  a: number
  b: number
  at: (t: number) => Pt
  hidden?: boolean
  /** A straight run with a speed ramp instead of samples. */
  ramp?: [number, number]
}

const parabola = (p: Pt, q: Pt, a: number, b: number): ((t: number) => Pt) => {
  const T = b - a
  const vx = (q[0] - p[0]) / T
  const vy = (q[1] - p[1]) / T - 0.5 * g * T
  return (t) => ballistic(p, [vx, vy], t - a)
}

export const PIECES: Piece[] = [
  // Flung off the engine's front, over the wall, down onto the first rack.
  { a: IN, b: LAND_AT, at: (t) => ballistic(ENTRY, V_IN, t - IN) },
  // Along the quick-match, rack to rack, slowing over each post as its tubes fire.
  { a: LAND_AT, b: GERB_AT, at: runAt },
  // Up on the gerb's fountain, and over onto the wire.
  { a: GERB_AT, b: LEAVE_AT, at: onJet },
  { a: LEAVE_AT, b: WIRE_AT, at: handOver },
  // Along the wire, as fast as the music.
  { a: WIRE_AT, b: TIP_AT, at: wireRun },
  // Off its end and down with the last of the curtain.
  { a: TIP_AT, b: CRASH, at: parabola(wireRun(TIP_AT), CRASH_AT, TIP_AT, CRASH) },
  // The crash throws it over the battery onto the wheel.
  { a: CRASH, b: WHEEL_AT, at: parabola(CRASH_AT, P_WHEEL, CRASH, WHEEL_AT) },
  // Round on the wheel's rim.
  { a: WHEEL_AT, b: FLING, at: wheelRide },
  // Flung off it to the Titan.
  { a: FLING, b: LEADER_AT, at: (t) => ballistic(P_REL, V_REL, t - FLING) },
  // Up the leader, burning.
  { a: LEADER_AT, b: OVER_AT, at: climbAt },
  // Over the lip and in.
  { a: OVER_AT, b: DIVE, at: dive },
  // Inside the Titan, rising with its shell to the muzzle.
  { a: DIVE, b: TITAN_FIRE, at: (t) => { const u = smooth(t, DIVE, TITAN_FIRE); return [IN_AT[0] + (P_LAUNCH[0] - IN_AT[0]) * u, IN_AT[1] + (P_LAUNCH[1] - IN_AT[1]) * u] }, hidden: true },
  // Shot up on the Titan's shell to the top of its climb.
  { a: TITAN_FIRE, b: TITAN_BURST, at: titanRise },
  // Down through the salutes, drifting, into the ash.
  { a: TITAN_BURST, b: DOWN, at: fallAt },
  // A small bounce, and a roll to rest by the crate's mouth.
  { a: DOWN, b: BOUNCE_AT, at: parabola([X_LAND, GY - R], [X_LAND + 0.06, GY - R], DOWN, BOUNCE_AT) },
  { a: BOUNCE_AT, b: REST_AT, at: (t) => { const u = (t - BOUNCE_AT) / (REST_AT - BOUNCE_AT); const s = 1 - (1 - u) * (1 - u); return [X_LAND + 0.06 + (REST[0] - X_LAND - 0.06) * s, GY - R] } },
  // All but out, in the silence.
  { a: REST_AT, b: FLARE, at: () => REST },
  // The roll: it flares, and darts up and left into the crate's fire.
  { a: FLARE, b: OUT, at: (t) => { const s = t - FLARE; return [REST[0] + (HL[0] * s * s) / (2 * (OUT - FLARE)), REST[1] + (HL[1] * s * s) / (2 * (OUT - FLARE))] }, ramp: [0, Math.hypot(HL[0], HL[1])] },
]

/** Where the spark is at show time `t`, in the part's cells. */
export function sparkAt(t: number): Pt {
  if (t <= IN) return ENTRY
  for (const pc of PIECES) if (t <= pc.b) return pc.at(Math.max(pc.a, t))
  return DART_END
}

/* ------------------------------------------------------------------ what goes up */

export type Kind = 'peony' | 'chrys' | 'willow' | 'palm' | 'crossette' | 'salute' | 'mine' | 'small' | 'titan'

export interface Burst {
  at: number
  x: number
  y: number
  kind: Kind
  col: string
  /** Its trails' colour, when not its own. */
  tail?: string
  n: number
  /** Stars' speed out, the air's drag on them, and the gravity they droop under. */
  v: number
  k: number
  gs: number
  life: number
  trail: number
  /** How much its flash washes the frame, 0..1. */
  wash: number
  /** A mine sprays up from the ground in a fan this wide (radians) instead of all round. */
  fan?: number
  seed: number
}

/** A shell or comet on its way up: from a gun's muzzle to where it bursts. */
export interface Rise {
  from: number
  to: number
  a: Pt
  b: Pt
  col: string
  /** A comet is a bright star with a long tail; a shell shows only its glittering rising tail. */
  comet?: boolean
}

export interface Gun {
  x: number
  y: number
  w: number
  h: number
  lean: number
  fires: number[]
}

const FW = RAILWAY
export const BURSTS: Burst[] = []
export const RISES: Rise[] = []
const shell = (from: number, to: number, a: Pt, b: Pt, burst: Omit<Burst, 'at' | 'x' | 'y' | 'seed'>, comet = false) => {
  RISES.push({ from, to, a, b, col: burst.tail ?? burst.col, comet })
  BURSTS.push({ ...burst, at: to, x: b[0], y: b[1], seed: BURSTS.length + 1 })
}

/* The racks: a comet from each tube as the spark crosses the rack, breaking into a small star on the next backbeat. */
export const RACK_COLS = [[FW.fwGold], [FW.fwRed, FW.fwRed], [FW.fwGreen, FW.fwWhite, FW.fwGreen], [FW.fwViolet, FW.fwBlue, FW.fwBlue, FW.fwViolet]]
export const rackTube = (i: number, j: number): { x: number; lean: number } => {
  const n = RACK_N[i]
  const c = j - (n - 1) / 2
  return { x: RACK_X[i] + c * 0.3, lean: c * 0.16 }
}
for (let i = 0; i < 4; i++) {
  const next = i < 3 ? RACK_AT[i + 1] : GERB_AT
  for (let j = 0; j < RACK_N[i]; j++) {
    const tube = rackTube(i, j)
    const muzzle: Pt = [tube.x + Math.sin(tube.lean) * TUBE_H, GY - Math.cos(tube.lean) * TUBE_H]
    // Each a little different: how high it climbs, how wide it breaks.
    const up = 2.0 + 0.25 * i + 0.9 * hash(i, j, 3)
    const b: Pt = [muzzle[0] + Math.sin(tube.lean) * up * 1.4, muzzle[1] - up]
    const v = 7.4 * (0.75 + 0.45 * hash(i, j, 4))
    shell(RACK_AT[i], next, muzzle, b, { kind: 'small', col: RACK_COLS[i][j], n: 11 + Math.round(5 * hash(i, j, 5)), v, k: 4.0, gs: 6.5, life: 0.95, trail: 0.22, wash: 0.12 }, true)
  }
}

/* The finale's battery: eight guns in a long rack, chain-fused down the coda. */
export const BATTERY_X0 = CRASH_AT[0] + 0.95
export const GUN_H = 1.3
export const GUN_W = 0.36
const LAUNCH = [CRASH, C(1), C(2), C(3), T5_AT, T6_AT, C(7), C(8)]
const BURST_AT = [C(2), C(3), C(4), C(5), C(7), C(8), C(9), C(10)]
const BATTERY_BURSTS: Omit<Burst, 'at' | 'x' | 'y' | 'seed'>[] = [
  { kind: 'chrys', col: FW.fwGold, tail: FW.fwGold, n: 64, v: 15, k: 3.3, gs: 5.5, life: 2.0, trail: 0.5, wash: 0.9 },
  { kind: 'peony', col: FW.fwRed, n: 46, v: 13, k: 3.6, gs: 6, life: 1.7, trail: 0.3, wash: 0.85 },
  { kind: 'palm', col: FW.fwGreen, tail: FW.fwGold, n: 9, v: 8.5, k: 2.0, gs: 4.5, life: 2.1, trail: 0.6, wash: 0.55 },
  { kind: 'willow', col: FW.fwViolet, tail: FW.fwGold, n: 30, v: 6.5, k: 2.8, gs: 5.2, life: 2.3, trail: 0.8, wash: 0.25 },
  { kind: 'crossette', col: FW.fwBlue, n: 10, v: 8.5, k: 1.9, gs: 5, life: 1.6, trail: 0.2, wash: 0.5 },
  { kind: 'willow', col: FW.fwGold, tail: FW.fwGold, n: 46, v: 9.5, k: 2.7, gs: 5.2, life: 2.7, trail: 0.95, wash: 0.75 },
  { kind: 'peony', col: FW.fwWhite, tail: FW.fwRed, n: 42, v: 12.5, k: 3.6, gs: 6, life: 1.7, trail: 0.3, wash: 0.5 },
  { kind: 'chrys', col: FW.fwGreen, tail: FW.fwGold, n: 60, v: 15, k: 3.3, gs: 5.5, life: 2.0, trail: 0.5, wash: 0.9 },
]
/** Where each battery shell bursts: over the battery and the wheel, rippling right with the chain toward the Titan. */
const BATTERY_B: Pt[] = [
  [WHEEL[0] - 5.2, GY - 7.3],
  [WHEEL[0] - 8.6, GY - 5.9],
  [WHEEL[0] - 1.2, GY - 6.6],
  [WHEEL[0] - 4.4, GY - 5.2],
  [WHEEL[0] + 1.6, GY - 7.0],
  [WHEEL[0] + 5.4, GY - 6.8],
  [LEADER_FOOT[0] - 3.8, GY - 5.8],
  [LEADER_FOOT[0] + 0.4, GY - 7.2],
]
/** Each gun is laid toward where its shell will burst. */
export const GUNS: Gun[] = LAUNCH.map((at, i) => {
  const x = BATTERY_X0 + 0.66 * i
  const lean = Math.atan2(BATTERY_B[i][0] - x, GY - BATTERY_B[i][1])
  return { x, y: GY, w: GUN_W, h: GUN_H, lean: Math.max(-0.5, Math.min(0.5, lean)), fires: [at] }
})
const gunMuzzle = (gun: Gun): Pt => [gun.x + Math.sin(gun.lean) * gun.h, gun.y - Math.cos(gun.lean) * gun.h]
GUNS.forEach((gun, i) => shell(LAUNCH[i], BURST_AT[i], gunMuzzle(gun), BATTERY_B[i], BATTERY_BURSTS[i]))

/* The crash itself: a row of mines along the battery's front, all at once. */
export const MINES_X = [0, 1, 2, 3, 4].map((i) => BATTERY_X0 - 0.35 + 1.25 * i)
const MINE_COLS = [FW.fwGold, FW.fwRed, FW.fwWhite, FW.fwGreen, FW.fwViolet]
MINES_X.forEach((x, i) =>
  BURSTS.push({ at: CRASH, x, y: GY - 0.3, kind: 'mine', col: MINE_COLS[i], tail: FW.fwGold, n: 22, v: 14.5 + 1.5 * hash(i, 9), k: 1.7, gs: 9, life: 1.5, trail: 0.3, wash: i === 2 ? 0.8 : 0.1, fan: 0.42, seed: 100 + i }),
)

/* The Titan, and the two guns flanking it. */
export const FLANK: Gun[] = [
  { x: LEADER_FOOT[0] - 0.85, y: GY, w: 0.34, h: 1.25, lean: -0.3, fires: [DIVE] },
  { x: TITAN_X + 1.3, y: GY, w: 0.34, h: 1.25, lean: 0.3, fires: [DIVE] },
]
shell(DIVE, FLANK_BURST, gunMuzzle(FLANK[0]), [TITAN_X - 4.2, GY - 6.4], { kind: 'palm', col: FW.fwRed, tail: FW.fwGold, n: 9, v: 9, k: 2.0, gs: 4.5, life: 2.1, trail: 0.65, wash: 0.6 })
shell(DIVE, FLANK_BURST, gunMuzzle(FLANK[1]), [TITAN_X + 4.2, GY - 6.2], { kind: 'palm', col: FW.fwBlue, tail: FW.fwGold, n: 9, v: 9, k: 2.0, gs: 4.5, life: 2.1, trail: 0.65, wash: 0.6 })
/** The Titan's shell: the spark rides it up, so no rise of its own is drawn beyond the tail under the spark. */
BURSTS.push({ at: TITAN_BURST, x: APEX[0], y: APEX[1], kind: 'titan', col: FW.fwWhite, tail: FW.fwGold, n: 88, v: 20, k: 3.1, gs: 4.6, life: 2.3, trail: 0.62, wash: 1.3, seed: 200 })

/* The salute barrage: six flash-bangs round the falling spark, from a rack of short tubes past the crate. */
export const SALUTE_RACK: Pt = [REST[0] + 5.4, GY]
const SALUTE_OFF: Pt[] = [[-1.7, -0.5], [1.6, -1.1], [-1.4, 1.0], [1.9, 0.4], [-2.1, -0.9], [1.3, -1.7]]
export const SALUTES = HAMMERS.map((at, j) => {
  const s = sparkAt(at)
  const b: Pt = [s[0] + SALUTE_OFF[j][0], Math.min(GY - 1.6, s[1] + SALUTE_OFF[j][1])]
  const a: Pt = [SALUTE_RACK[0] - 0.3 + 0.12 * j, GY - 0.55]
  return { at, from: at - 0.42, a, b }
})
SALUTES.forEach((s, j) => {
  RISES.push({ from: s.from, to: s.at, a: s.a, b: s.b, col: FW.fwWhite })
  BURSTS.push({ at: s.at, x: s.b[0], y: s.b[1], kind: 'salute', col: FW.fwWhite, n: 20, v: 55, k: 26, gs: 0, life: 0.34, trail: 0.17, wash: j === 5 ? 0.9 : 0.6, seed: 300 + j })
})

BURSTS.sort((a, b) => a.at - b.at)

/** A star's place `s` seconds after its burst, with linear drag `k` and gravity `gs`. */
export function starAt(b: Burst, vx: number, vy: number, s: number): Pt {
  const E = (1 - Math.exp(-b.k * s)) / b.k
  return [b.x + vx * E, b.y + vy * E + (b.gs / b.k) * (s - E)]
}

/** A rising shell's place: decelerating straight to its burst point, where it stops. */
export function riseAt(r: Rise, t: number): Pt {
  const u = Math.max(0, Math.min(1, (t - r.from) / (r.to - r.from)))
  const s = 1 - (1 - u) * (1 - u)
  return [r.a[0] + (r.b[0] - r.a[0]) * s, r.a[1] + (r.b[1] - r.a[1]) * s]
}

/* ------------------------------------------------------------------ smoke */

export interface Puff {
  at: number
  x: number
  y: number
  r0: number
  r1: number
  life: number
  a: number
  seed: number
}
export const WIND: Pt = [0.32, -0.06]
export const PUFFS: Puff[] = []
const puff = (at: number, x: number, y: number, r0: number, r1: number, life: number, a: number) => PUFFS.push({ at, x, y, r0, r1, life, a, seed: PUFFS.length + 1 })
for (const r of RISES) puff(r.from + 0.03, r.a[0], r.a[1] - 0.2, 0.25, r.comet ? 0.8 : 1.2, r.comet ? 4 : 7, r.comet ? 0.22 : r.col === FW.fwWhite ? 0.14 : 0.32)
for (const b of BURSTS) {
  if (b.kind === 'mine') puff(b.at + 0.12, b.x, b.y - 0.6, 0.5, 2.4, 10, 0.34)
  else if (b.kind === 'salute') puff(b.at + 0.18, b.x, b.y, 0.7, 1.8, 7, 0.22)
  else if (b.kind === 'small') puff(b.at + 0.3, b.x, b.y, 0.3, 1.0, 5, 0.14)
  else puff(b.at + 0.45, b.x, b.y + 0.3, 0.9, 0.4 * (b.v / b.k) + 1, 10, b.kind === 'titan' ? 0.34 : 0.24)
}
puff(TITAN_FIRE + 0.05, TITAN_X, LIP - 0.6, 0.6, 2.4, 10, 0.45)
puff(TITAN_FIRE + 0.15, TITAN_X + 0.5, GY - 0.3, 0.5, 1.8, 9, 0.3)
PUFFS.sort((a, b) => a.at - b.at)

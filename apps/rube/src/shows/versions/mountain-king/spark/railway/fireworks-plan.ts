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
export const TITAN_RISE = 6.3
/**
 * The spark rides the shell's crown, so the shell's heart (where its stars break from) is a little under the spark:
 * the spark starts in the flower's upper half.
 */
export const HEART_DROP = 0.7
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
const FALL_VY = -3.4
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
  /** How much its flash washes the frame: 0..1, and over 1 (the Titan) holds the flash at its brightest longer. */
  wash: number
  /**
   * Its stars go out in a fan this wide either side of straight up (radians) instead of all round: a mine sprays up
   * from the ground; the Titan leaves out only the few that would plunge straight down onto its own gun.
   */
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

/** Rises and bursts whose smoke is made here rather than by the loop at the end (so it stays thin, and far). */
const OWN_SMOKE = new Set<Rise | Burst>()
const SKY_COLS = [FW.fwGold, FW.fwRed, FW.fwGreen, FW.fwViolet, FW.fwBlue, FW.fwWhite]

/*
 * What the audience sees of the sky. The moon holds its place in the frame (`night.ts`), so it rides with the camera
 * and slides across the sky behind every burst; and the frame's top cuts off whatever breaks too high. So every shell
 * here is placed against the show's own camera, measured into `CAM`. **Re-measure it whenever the camera changes** (the
 * keys in `fireworks.ts`, the last of `express.ts`'s that carry into the festival, or the punches in `score.ts`): it is
 * the camera's middle and height, less the part's place in the world (`show.where(t) - sparkAt(t)`), and the untracked
 * `dev/fireworks-plan.ts-p1-probe.ts` prints it (`table`) and audits every burst against it (`audit`).
 */

/** The show's camera over the festival in this part's cells: the frame's middle (x, y) and its height, every 0.05 s from `CAM_T0` to 147.2. */
const CAM_T0 = 124.05
const CAM_DT = 0.05
// prettier-ignore
const CAM: number[] = [
  0.33, 2.85, 9.96, 0.38, 2.68, 9.80, 0.48, 2.50, 9.55, 0.65, 2.35, 9.23, 0.88, 2.26, 8.89, 1.20, 2.26, 8.54,
  1.57, 2.36, 8.21, 1.98, 2.55, 7.92, 2.41, 2.81, 7.68, 2.80, 3.12, 7.50, 3.12, 3.43, 7.41, 3.37, 3.68, 7.38,
  3.60, 3.87, 7.35, 3.84, 4.01, 7.33, 4.07, 4.08, 7.31, 4.29, 4.11, 7.29, 4.51, 4.09, 7.27, 4.72, 4.04, 7.26,
  4.92, 3.95, 7.25, 5.12, 3.85, 7.23, 5.31, 3.74, 7.22, 5.49, 3.63, 7.21, 5.67, 3.54, 7.21, 5.84, 3.47, 7.20,
  6.01, 3.44, 7.20, 6.17, 3.46, 7.20, 6.33, 3.50, 7.20, 6.48, 3.53, 7.20, 6.63, 3.54, 7.21, 6.78, 3.55, 7.21,
  6.92, 3.54, 7.22, 7.07, 3.54, 7.22, 7.21, 3.53, 7.23, 7.36, 3.53, 7.24, 7.50, 3.52, 7.25, 7.65, 3.52, 7.26,
  7.79, 3.51, 7.27, 7.94, 3.50, 7.29, 8.08, 3.50, 7.30, 8.23, 3.49, 7.31, 8.37, 3.48, 7.33, 8.51, 3.48, 7.34,
  8.65, 3.47, 7.36, 8.79, 3.47, 7.37, 8.93, 3.47, 7.39, 9.07, 3.46, 7.41, 9.21, 3.46, 7.42, 9.36, 3.46, 7.44,
  9.50, 3.46, 7.46, 9.64, 3.46, 7.47, 9.78, 3.45, 7.49, 9.92, 3.45, 7.51, 10.06, 3.45, 7.52, 10.20, 3.45, 7.54,
  10.34, 3.44, 7.56, 10.48, 3.44, 7.57, 10.62, 3.43, 7.59, 10.75, 3.42, 7.60, 10.88, 3.41, 7.61, 11.02, 3.40, 7.63,
  11.14, 3.40, 7.65, 11.26, 3.40, 7.67, 11.38, 3.40, 7.68, 11.48, 3.40, 7.70, 11.58, 3.40, 7.72, 11.67, 3.39, 7.75,
  11.76, 3.39, 7.77, 11.83, 3.38, 7.79, 11.90, 3.36, 7.81, 11.95, 3.33, 7.83, 12.00, 3.29, 7.85, 12.04, 3.25, 7.87,
  12.07, 3.20, 7.89, 12.10, 3.15, 7.91, 12.12, 3.09, 7.92, 12.13, 3.02, 7.94, 12.15, 2.95, 7.95, 12.16, 2.88, 7.97,
  12.17, 2.80, 7.98, 12.18, 2.71, 7.99, 12.19, 2.62, 7.99, 12.21, 2.51, 8.00, 12.24, 2.41, 8.00, 12.28, 2.30, 7.99,
  12.34, 2.19, 7.95, 12.43, 2.10, 7.88, 12.54, 2.02, 7.78, 12.66, 1.95, 7.66, 12.81, 1.90, 7.52, 12.97, 1.85, 7.38,
  13.15, 1.81, 7.24, 13.33, 1.79, 7.10, 13.52, 1.77, 6.97, 13.71, 1.76, 6.85, 13.89, 1.75, 6.75, 14.07, 1.75, 6.67,
  14.24, 1.76, 6.62, 14.40, 1.77, 6.60, 14.55, 1.79, 6.60, 14.70, 1.80, 6.59, 14.85, 1.82, 6.59, 15.01, 1.84, 6.58,
  15.17, 1.86, 6.58, 15.32, 1.87, 6.58, 15.48, 1.89, 6.57, 15.64, 1.90, 6.57, 15.80, 1.91, 6.57, 15.95, 1.93, 6.56,
  16.11, 1.94, 6.56, 16.27, 1.95, 6.56, 16.43, 1.96, 6.56, 16.58, 1.97, 6.55, 16.74, 1.97, 6.55, 16.90, 1.98, 6.55,
  17.05, 1.99, 6.54, 17.21, 2.00, 6.54, 17.37, 2.01, 6.54, 17.53, 2.02, 6.54, 17.68, 2.02, 6.54, 17.84, 2.03, 6.53,
  18.00, 2.04, 6.53, 18.15, 2.04, 6.53, 18.31, 2.05, 6.53, 18.46, 2.05, 6.53, 18.62, 2.06, 6.52, 18.78, 2.06, 6.52,
  18.93, 2.07, 6.52, 19.09, 2.07, 6.52, 19.24, 2.08, 6.52, 19.40, 2.08, 6.52, 19.55, 2.08, 6.52, 19.71, 2.09, 6.51,
  19.86, 2.09, 6.51, 20.02, 2.09, 6.51, 20.17, 2.09, 6.51, 20.33, 2.09, 6.51, 20.48, 2.10, 6.51, 20.64, 2.10, 6.51,
  20.79, 2.10, 6.51, 20.95, 2.10, 6.51, 21.10, 2.10, 6.51, 21.26, 2.10, 6.50, 21.41, 2.10, 6.50, 21.57, 2.10, 6.50,
  21.72, 2.10, 6.50, 21.88, 2.10, 6.50, 22.03, 2.09, 6.50, 22.19, 2.09, 6.50, 22.34, 2.09, 6.50, 22.50, 2.09, 6.50,
  22.65, 2.09, 6.50, 22.81, 2.08, 6.50, 22.96, 2.08, 6.50, 23.12, 2.08, 6.50, 23.28, 2.08, 6.50, 23.43, 2.07, 6.50,
  23.59, 2.07, 6.50, 23.74, 2.06, 6.50, 23.89, 2.06, 6.51, 24.04, 2.06, 6.53, 24.17, 2.06, 6.55, 24.29, 2.06, 6.59,
  24.41, 2.07, 6.64, 24.51, 2.07, 6.69, 24.61, 2.08, 6.75, 24.70, 2.09, 6.82, 24.78, 2.10, 6.90, 24.85, 2.10, 6.98,
  24.91, 2.11, 7.08, 24.97, 2.12, 7.18, 25.02, 2.13, 7.29, 25.06, 2.14, 7.40, 25.10, 2.15, 7.52, 25.13, 2.16, 7.65,
  25.16, 2.17, 7.78, 25.19, 2.17, 7.92, 25.21, 2.18, 8.07, 25.22, 2.19, 8.22, 25.24, 2.19, 8.38, 25.25, 2.20, 8.54,
  25.26, 2.21, 8.71, 25.27, 2.21, 8.88, 25.27, 2.22, 9.05, 25.28, 2.24, 9.23, 25.28, 2.25, 9.41, 25.28, 2.27, 9.59,
  25.28, 2.30, 9.78, 25.29, 2.32, 9.96, 25.29, 2.36, 10.15, 25.30, 2.39, 10.33, 25.32, 2.43, 10.51, 25.34, 2.47, 10.70,
  25.41, 2.50, 10.91, 25.52, 2.50, 11.14, 25.68, 2.48, 11.40, 25.87, 2.45, 11.68, 26.10, 2.40, 11.99, 26.37, 2.33, 12.31,
  26.66, 2.24, 12.64, 26.97, 2.14, 12.98, 27.31, 2.02, 13.33, 27.66, 1.90, 13.68, 28.03, 1.75, 14.03, 28.41, 1.60, 14.37,
  28.78, 1.44, 14.69, 29.16, 1.27, 14.51, 29.54, 1.11, 14.81, 29.90, 0.95, 15.11, 30.24, 0.80, 15.37, 30.57, 0.67, 15.57,
  30.86, 0.56, 15.71, 31.12, 0.47, 15.78, 31.36, 0.40, 15.76, 31.59, 0.37, 15.64, 31.83, 0.37, 15.43, 32.06, 0.40, 15.15,
  32.28, 0.45, 14.81, 32.49, 0.53, 14.43, 32.69, 0.64, 14.04, 32.88, 0.76, 13.63, 33.06, 0.90, 13.24, 33.22, 1.04, 12.86,
  33.37, 1.18, 12.51, 33.51, 1.31, 12.20, 33.63, 1.43, 11.93, 33.74, 1.53, 11.72, 33.84, 1.60, 11.57, 33.92, 1.63, 11.49,
  33.99, 1.65, 11.19, 34.06, 1.66, 11.17, 34.12, 1.67, 11.19, 34.18, 1.68, 11.20, 34.24, 1.69, 11.21, 34.29, 1.70, 11.21,
  34.34, 1.71, 11.21, 34.38, 1.72, 11.22, 34.43, 1.73, 11.21, 34.47, 1.74, 11.21, 34.51, 1.75, 11.20, 34.55, 1.75, 11.19,
  34.59, 1.76, 11.18, 34.63, 1.77, 11.18, 34.66, 1.77, 10.89, 34.70, 1.78, 10.89, 34.74, 1.78, 10.92, 34.77, 1.79, 10.94,
  34.80, 1.79, 10.96, 34.84, 1.79, 10.98, 34.87, 1.79, 10.99, 34.91, 1.79, 11.00, 34.94, 1.79, 11.00, 34.97, 1.79, 11.01,
  35.01, 1.79, 11.01, 35.04, 1.79, 11.01, 35.08, 1.78, 11.01, 35.11, 1.78, 11.01, 35.14, 1.77, 11.01, 35.18, 1.77, 11.01,
  35.22, 1.76, 11.01, 35.25, 1.75, 11.01, 35.29, 1.74, 11.01, 35.33, 1.73, 11.01, 35.36, 1.72, 11.00, 35.40, 1.70, 11.00,
  35.44, 1.69, 11.00, 35.48, 1.68, 11.00, 35.52, 1.66, 11.00, 35.56, 1.65, 11.00, 35.60, 1.63, 11.00, 35.64, 1.61, 11.00,
  35.69, 1.60, 11.00, 35.73, 1.58, 11.00, 35.77, 1.57, 11.00, 35.82, 1.56, 11.00, 35.87, 1.55, 11.00, 35.92, 1.54, 11.00,
  35.97, 1.53, 11.00, 36.02, 1.53, 11.00, 36.07, 1.52, 11.00, 36.13, 1.52, 11.00, 36.18, 1.53, 11.00, 36.24, 1.54, 11.00,
  36.31, 1.55, 11.00, 36.37, 1.56, 11.00, 36.45, 1.58, 11.00, 36.52, 1.60, 11.00, 36.60, 1.63, 11.00, 36.69, 1.65, 11.00,
  36.79, 1.68, 11.00, 36.89, 1.71, 11.00, 37.00, 1.74, 11.00, 37.12, 1.77, 11.00, 37.25, 1.80, 11.00, 37.39, 1.82, 11.00,
  37.54, 1.85, 11.00, 37.69, 1.87, 11.00, 37.86, 1.88, 11.00, 38.03, 1.89, 11.00, 38.21, 1.90, 11.00, 38.39, 1.91, 11.00,
  38.58, 1.91, 11.00, 38.79, 1.91, 11.00, 39.03, 1.92, 10.99, 39.32, 1.93, 10.97, 39.65, 1.95, 10.94, 40.00, 1.97, 10.91,
  40.39, 1.99, 10.87, 40.80, 2.03, 10.82, 41.23, 2.07, 10.77, 41.67, 2.12, 10.71, 42.12, 2.17, 10.65, 42.57, 2.23, 10.58,
  43.02, 2.29, 10.51, 43.47, 2.36, 10.44, 43.91, 2.44, 10.37, 44.34, 2.52, 10.29, 44.74, 2.60, 10.22, 45.13, 2.68, 10.14,
  45.48, 2.76, 10.06, 45.80, 2.84, 9.99, 46.08, 2.92, 9.91, 46.32, 3.00, 9.84, 46.52, 3.07, 9.77, 46.66, 3.14, 9.70,
  46.74, 3.20, 9.63, 46.77, 3.26, 9.35, 46.79, 3.31, 9.27, 46.81, 3.37, 9.24, 46.83, 3.42, 9.20, 46.84, 3.47, 9.16,
  46.85, 3.52, 9.11, 46.86, 3.57, 9.06, 46.87, 3.62, 9.00, 46.88, 3.67, 8.95, 46.88, 3.71, 8.89, 46.88, 3.75, 8.83,
  46.89, 3.79, 8.76, 46.89, 3.83, 8.70, 46.89, 3.87, 8.63, 46.89, 3.91, 8.57, 46.90, 3.94, 8.50, 46.90, 3.97, 8.43,
  46.90, 4.01, 8.36, 46.90, 4.04, 8.29, 46.90, 4.06, 8.23, 46.90, 4.09, 8.16, 46.90, 4.11, 8.09, 46.91, 4.13, 8.02,
  46.91, 4.15, 7.95, 46.91, 4.16, 7.89, 46.91, 4.17, 7.82, 46.91, 4.18, 7.75, 46.91, 4.18, 7.69, 46.92, 4.18, 7.62,
  46.92, 4.18, 7.56, 46.92, 4.17, 7.50, 46.92, 4.16, 7.44, 46.93, 4.15, 7.37, 46.93, 4.14, 7.29, 46.94, 4.13, 7.22,
  46.95, 4.11, 7.14, 46.96, 4.10, 7.06, 46.97, 4.08, 6.99, 46.98, 4.07, 6.91, 46.99, 4.05, 6.83, 47.00, 4.03, 6.75,
  47.01, 4.01, 6.67, 47.02, 3.99, 6.60, 47.04, 3.97, 6.53, 47.05, 3.94, 6.46, 47.07, 3.92, 6.39, 47.09, 3.90, 6.33,
  47.11, 3.88, 6.27, 47.13, 3.85, 6.22, 47.15, 3.83, 6.17, 47.17, 3.81, 6.13, 47.20, 3.79, 6.09, 47.22, 3.77, 6.06,
  47.25, 3.76, 6.03, 47.27, 3.74, 6.02, 47.30, 3.73, 6.00, 47.33, 3.71, 6.00, 47.36, 3.70, 6.00, 47.39, 3.68, 6.02,
  47.41, 3.65, 6.03, 47.44, 3.62, 6.06, 47.47, 3.58, 6.09, 47.50, 3.53, 6.13, 47.53, 3.47, 6.17, 47.56, 3.40, 6.22,
  47.59, 3.33, 6.27, 47.62, 3.25, 6.33, 47.64, 3.17, 6.39, 47.67, 3.08, 6.46, 47.70, 2.98, 6.53, 47.73, 2.88, 6.60,
  47.76, 2.77, 6.68, 47.79, 2.66, 6.76, 47.82, 2.55, 6.84, 47.84, 2.41, 6.96, 47.87, 2.25, 7.10, 47.89, 2.07, 7.26,
  47.91, 1.87, 7.46, 47.94, 1.66, 7.68, 47.96, 1.45, 7.93, 47.99, 1.23, 8.21, 48.02, 1.00, 8.51, 48.05, 0.78, 8.83,
  48.09, 0.56, 9.18, 48.12, 0.35, 9.55, 48.17, 0.15, 9.95, 48.21, -0.04, 10.36, 48.26, -0.21, 10.79, 48.32, -0.36, 11.23,
  48.38, -0.49, 11.68, 48.44, -0.59, 12.13, 48.51, -0.66, 12.43, 48.60, -0.72, 12.81, 48.70, -0.77, 13.49, 48.82, -0.80, 14.27,
  48.95, -0.84, 15.08, 49.09, -0.87, 15.88, 49.22, -0.89, 16.63, 49.36, -0.91, 17.26, 49.49, -0.93, 17.69, 49.61, -0.93, 17.87,
  49.71, -0.93, 17.80, 49.81, -0.93, 17.62, 49.90, -0.93, 17.64, 49.99, -0.92, 17.64, 50.08, -0.91, 17.64, 50.17, -0.89, 17.57,
  50.28, -0.87, 17.32, 50.39, -0.85, 17.30, 50.53, -0.82, 17.27, 50.68, -0.79, 17.23, 50.91, -0.67, 17.00, 51.25, -0.41, 16.38,
  51.64, -0.05, 15.82, 52.08, 0.39, 15.13, 52.50, 0.87, 14.37, 52.89, 1.37, 13.58, 53.22, 1.85, 12.62, 53.45, 2.29, 11.90,
  53.57, 2.66, 11.27, 53.62, 3.00, 10.62, 53.67, 3.35, 9.89, 53.71, 3.68, 9.07, 53.75, 4.00, 8.41, 53.78, 4.27, 7.82,
  53.80, 4.50, 7.31, 53.81, 4.66, 6.90, 53.83, 4.79, 6.41, 53.83, 4.90, 6.11, 53.84, 4.99, 5.83, 53.84, 5.07, 5.57,
  53.84, 5.14, 5.32, 53.85, 5.21, 5.09, 53.84, 5.26, 4.88, 53.84, 5.30, 4.69, 53.84, 5.34, 4.52, 53.84, 5.38, 4.36,
  53.84, 5.41, 4.22, 53.84, 5.43, 4.09,
]
const CAM_N = CAM.length / 3 - 1
function camAt(t: number): { x: number; y: number; h: number } {
  const f = Math.max(0, Math.min(CAM_N, (t - CAM_T0) / CAM_DT))
  const i = Math.min(CAM_N - 1, Math.floor(f))
  const u = f - i
  const at = (j: number): number => CAM[3 * i + j] + (CAM[3 * i + 3 + j] - CAM[3 * i + j]) * u
  return { x: at(0), y: at(1), h: at(2) }
}
/** The moon at show time `t`: 0.77 and 0.23 of the 16:9 frame, 0.15 of its height across (`night.ts` `moonPlace`). */
function moonOf(t: number): { x: number; y: number; r: number } {
  const c = camAt(t)
  return { x: c.x + (0.27 * 16 * c.h) / 9, y: c.y - 0.27 * c.h, r: 0.075 * c.h }
}
const frameTop = (t: number): number => {
  const c = camAt(t)
  return c.y - c.h / 2
}

type Shape = Omit<Burst, 'at' | 'x' | 'y' | 'seed'>
/** How far a burst's stars fly out (their speed over the air's drag). */
const reachOf = (sh: Shape): number => sh.v / sh.k
/** A burst's heart `s` seconds after it breaks: it sinks with its stars. */
const heartY = (y: number, sh: Shape, s: number): number => y + (sh.gs / sh.k) * (s - (1 - Math.exp(-sh.k * s)) / sh.k)
/**
 * Off the moon: for its first half second (or its life, if shorter) the whole flower, out to its reach, stays half a
 * cell clear of the moon's disc. A burst round the moon makes the moon its bright round core.
 */
function clearOfMoon(at: number, x: number, y: number, sh: Shape): boolean {
  const need = reachOf(sh) + 0.5
  for (let s = 0; s <= Math.min(0.5, sh.life) + 1e-9; s += 0.05) {
    const m = moonOf(at + s)
    if (Math.hypot(x - m.x, heartY(y, sh, s) - m.y) < m.r + need) return false
  }
  return true
}
/** Under the frame's top: its highest stars stay 0.3 cells inside the frame for the first 0.3 s, while it is a flower. */
function underTop(at: number, y: number, sh: Shape): boolean {
  for (let s = 0; s <= 0.3 + 1e-9; s += 0.05) if (y - reachOf(sh) - 0.3 < frameTop(at + s)) return false
  return true
}
/** The heart's nearest pass by the spark over the burst's first half second. */
function sparkGap(at: number, x: number, y: number, sh: Shape): number {
  let d = Infinity
  for (let s = 0; s <= 0.5 + 1e-9; s += 0.05) {
    const sp = sparkAt(at + s)
    d = Math.min(d, Math.hypot(x - sp[0], heartY(y, sh, s) - sp[1]))
  }
  return d
}
/**
 * For a shell whose place is set by hand: where it was set if that is off the moon, else the nearest place that is,
 * going away from the moon first, with its heart in the frame, well up off the ground, and no nearer the spark.
 */
function offMoon(at: number, p: Pt, sh: Shape): Pt {
  if (clearOfMoon(at, p[0], p[1], sh)) return p
  const keep = Math.min(sparkGap(at, p[0], p[1], sh), 0.9 * reachOf(sh))
  const m = moonOf(at)
  const away = Math.atan2(p[1] - m.y, p[0] - m.x)
  const turns = Array.from({ length: 24 }, (_, i) => (i % 2 ? -1 : 1) * Math.ceil(i / 2) * (Math.PI / 12)).filter((a, i, all) => all.indexOf(a) === i)
  for (let d = 0.25; d <= 7; d += 0.25) {
    for (const turn of turns) {
      const x = p[0] + d * Math.cos(away + turn)
      const y = p[1] + d * Math.sin(away + turn)
      const c = camAt(at)
      if (Math.abs(x - c.x) > (8 * c.h) / 9 - 0.5 || y < c.y - c.h / 2 + 0.5 || y > GY - 2) continue
      if (clearOfMoon(at, x, y, sh) && sparkGap(at, x, y, sh) >= keep) return [x, y]
    }
  }
  return p
}
/**
 * Whether a burst breaks on the moon (for a check). Mines are fans thrown up off the ground, so their heart is on the
 * ground, not in the sky; the Titan's flower is meant to take the whole sky, and a bank of its smoke is laid across the
 * moon (`MOON_THEN`) so the moon is a smudge behind it.
 */
export function onMoon(b: Burst): boolean {
  if (b.kind === 'mine' || b.kind === 'titan') return false
  return !clearOfMoon(b.at, b.x, b.y, b)
}

/*
 * The racks are Roman candles. Each tube fires a comet as the spark crosses its rack (one, two, three, four), and then
 * again on every backbeat after, each star breaking into a small burst on the next backbeat and climbing a little
 * higher than the last. So the sky over the racks builds a backbeat at a time: 1, 3, 6, 10 comets a backbeat, and
 * every burst still in the air as the next volley goes up.
 */
export const RACK_COLS = [[FW.fwGold], [FW.fwRed, FW.fwRed], [FW.fwGreen, FW.fwWhite, FW.fwGreen], [FW.fwViolet, FW.fwBlue, FW.fwBlue, FW.fwViolet]]
/** How many stars each rack's candles fire, a backbeat apart. */
const CANDLE_SHOTS = [5, 5, 5, 4]
export const rackTube = (i: number, j: number): { x: number; lean: number } => {
  const n = RACK_N[i]
  const c = j - (n - 1) / 2
  return { x: RACK_X[i] + c * 0.3, lean: c * 0.16 }
}
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < RACK_N[i]; j++) {
    const tube = rackTube(i, j)
    const muzzle: Pt = [tube.x + Math.sin(tube.lean) * TUBE_H, GY - Math.cos(tube.lean) * TUBE_H]
    for (let s = 0; s < CANDLE_SHOTS[i]; s++) {
      const at = beat(259 + 2 * i + 2 * s)
      const next = beat(261 + 2 * i + 2 * s)
      const v = 7.4 * (0.75 + 0.45 * hash(i * 7 + s, j, 4)) * (1 + 0.06 * s)
      const col = s === 0 ? RACK_COLS[i][j] : SKY_COLS[(i + 2 * j + 3 * s) % SKY_COLS.length]
      const star: Shape = { kind: 'small', col, n: 11 + 2 * s + Math.round(5 * hash(i * 7 + s, j, 5)), v, k: 4.0, gs: 6.5, life: 0.95 + 0.05 * s, trail: 0.22, wash: s === 0 ? 0.12 : 0.035 }
      // Each a little different: how high it climbs, how wide it breaks. Every star climbs higher than the one before.
      let up = s === 0 ? 2.0 + 0.25 * i + 0.9 * hash(i, j, 3) : 2.5 + 0.6 * s + 0.25 * i + 0.8 * hash(i * 7 + s, j, 13)
      // Never breaking on the spark: well clear of it as it rides the gerb up.
      for (let tries = 0; tries < 8; tries++) {
        const b: Pt = [muzzle[0] + Math.sin(tube.lean) * up * 1.4, muzzle[1] - up]
        const sp = sparkAt(next)
        if (Math.hypot(b[0] - sp[0], b[1] - sp[1]) >= 2.2) break
        up += 0.35
      }
      // But never over the frame's top either: the camera is down with the spark on the gerb and the wire, so the
      // later stars climb only as high as the sky the frame shows, and break whole in it.
      let ceiling = -Infinity
      for (let q = 0; q <= 0.3 + 1e-9; q += 0.05) ceiling = Math.max(ceiling, frameTop(next + q) + reachOf(star) + 0.3)
      up = Math.min(up, muzzle[1] - ceiling)
      const b: Pt = [muzzle[0] + Math.sin(tube.lean) * up * 1.4, muzzle[1] - up]
      const sp = sparkAt(next)
      // A star with no room left to break in the sky the frame shows, clear of the spark and the moon: its tube is spent.
      if (up < 1.2 || Math.hypot(b[0] - sp[0], b[1] - sp[1]) < 2.2 || !clearOfMoon(next, b[0], b[1], star)) continue
      shell(at, next, muzzle, b, star, true)
      // A repeat's smoke is a wisp: the first shot's puff already hangs there.
      if (s > 0) {
        OWN_SMOKE.add(RISES[RISES.length - 1])
        OWN_SMOKE.add(BURSTS[BURSTS.length - 1])
      }
    }
  }
}

/*
 * The festival across the river. From the gerb on, the other crews on the far bank answer every backbeat: their
 * shells go up off the far bank (only the flash of each launch is seen, and its glint in the water), and break over
 * the wire on the next backbeat, more of them each bar and bigger, until the last volley breaks on the crash. They
 * break in the sky the spark is crossing (behind it and ahead of it, never on it), so the whole of the last phrase
 * is a sky filling up over the Niagara. Where the frame is close on the wire they break low, at the wire and under it,
 * behind the pouring curtain (they are across the river): whole in the frame, and never round the moon.
 */
/** The far bank: where the plain meets the river (`drawGround`'s river top). */
const FAR_BANK = GY - 1.3
const VOLLEY_N = [1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7]
const VOLLEY_KINDS: Kind[] = ['peony', 'chrys', 'palm', 'peony', 'willow', 'chrys', 'peony']
const volleyBursts: Burst[] = []
VOLLEY_N.forEach((m, v) => {
  const from = beat(267 + 2 * v)
  const to = v < VOLLEY_N.length - 1 ? beat(269 + 2 * v) : CRASH
  const sp = sparkAt(to)
  // The last two volleys break higher: the camera is drawing back to see the whole curtain.
  const late = to > TIP_AT - 0.1
  const x0 = sp[0] - 4.0
  const x1 = sp[0] + 8.0
  for (let i = 0; i < m; i++) {
    const h = hash(v, i, 21)
    const want = x0 + ((i + 0.5 + 0.7 * (hash(v, i, 22) - 0.5)) * (x1 - x0)) / m
    const y0 = late ? WIRE_Y - 1.6 - 2.0 * h : Math.min(WIRE_Y, sp[1]) - 0.5 - 0.8 * h
    let y = y0
    const kind = VOLLEY_KINDS[(v + 3 * i) % VOLLEY_KINDS.length]
    const col = SKY_COLS[(2 * v + 5 * i + 1) % SKY_COLS.length]
    // Bigger each bar: more stars, thrown wider, flashing harder.
    const grow = v / (VOLLEY_N.length - 1)
    const sv = (6.6 + 3.2 * grow) * (0.85 + 0.3 * hash(v, i, 24))
    const big: Shape =
      kind === 'palm'
        ? { kind, col: col === FW.fwWhite ? FW.fwRed : col, tail: FW.fwGold, n: 8, v: sv, k: 2.2, gs: 4.8, life: 1.5, trail: 0.5, wash: 0.05 + 0.08 * grow }
        : kind === 'willow'
          ? { kind, col: FW.fwGold, tail: FW.fwGold, n: 26, v: sv * 0.8, k: 2.8, gs: 5.2, life: 1.8, trail: 0.7, wash: 0.05 + 0.07 * grow }
          : { kind, col, tail: kind === 'chrys' ? FW.fwGold : undefined, n: Math.round(20 + 14 * grow), v: sv, k: 3.6, gs: 6, life: 1.15 + 0.3 * grow, trail: 0.28, wash: 0.05 + 0.1 * grow }
    // Where the sky is too full for a big shell, a small one (a finale mixes its calibres).
    const small: Shape = { kind: 'small', col, n: 14 + Math.round(4 * grow), v: 5.2 + 1.2 * grow, k: 4.0, gs: 6.5, life: 1.0, trail: 0.22, wash: 0.04 }
    // Where it may break: in the frame, its flower whole under the frame's top; the spark keeps a clear patch of sky
    // while the stars fly out (their drooping trails may fall past it later); off the moon; and apart from every other
    // shell still burning, so each reads as its own.
    const fits = (bx: number, burst: Shape, y: number): boolean => {
      const reach = reachOf(burst)
      if (bx < x0 - 1.0 || bx > x1 + 0.5) return false
      const c = camAt(to)
      if (Math.abs(bx - c.x) > (8 * c.h) / 9 - 0.6) return false
      // Not straight over it either: a burst breaking above the spark reads as the spark's own.
      if (Math.abs(bx - sp[0]) < 1.4 && sp[1] - y < 2.8) return false
      for (let s = 0; s <= burst.life * 0.5; s += 0.05) {
        const sp2 = sparkAt(Math.min(to + s, CRASH))
        if (Math.hypot(bx - sp2[0], heartY(y, burst, s) - sp2[1]) < 0.95 * reach * (1 - Math.exp(-burst.k * s)) + (burst.kind === 'palm' ? 1.5 : 0.9)) return false
      }
      if (!underTop(to, y, burst) || !clearOfMoon(to, bx, y, burst)) return false
      return volleyBursts.every((o) => o.at + o.life * 0.6 < to || Math.hypot(bx - o.x, y - o.y) >= 0.35 * (reach + o.v / o.k) + (o.at === to ? 0.7 : 0.2))
    }
    // The nearest place that fits to where it was aimed. First in the sky over the wire, a big shell or else a small
    // one, so the sky the spark runs under fills a volley a backbeat; then lower, down to a cell and a half under the
    // wire (they are across the river, so a low one breaks behind the curtain), big before small.
    let x = NaN
    let burst = big
    const HIGH = [0, 0.5, -0.7]
    const LOW = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
    const passes: [Shape, number[]][] = [
      [big, HIGH],
      [small, HIGH],
      [big, LOW],
      [small, LOW],
    ]
    search: for (const [option, dys] of passes) {
      for (let d = 0; d <= 6; d += 0.25) {
        for (const dy of dys) {
          // (On the last two the camera has drawn back over the whole curtain and the finale: they stay up in the sky.)
          if (y0 + dy > WIRE_Y + 1.5 || (late && dy > 1.0)) continue
          for (const bx of [want + d, want - d]) {
            if (fits(bx, option, y0 + dy)) {
              x = bx
              y = y0 + dy
              burst = option
              break search
            }
          }
        }
      }
    }
    if (Number.isNaN(x)) continue
    const b: Pt = [x, y]
    const a: Pt = [x - (hash(v, i, 23) - 0.5) * 1.2, FAR_BANK]
    // A far shell's rise: a silver tail, dim at its launch (it is across the water).
    const rise: Rise = { from, to, a, b, col: FW.fwWhite }
    RISES.push(rise)
    const bb: Burst = { ...burst, at: to, x: b[0], y: b[1], seed: BURSTS.length + 1 }
    BURSTS.push(bb)
    volleyBursts.push(bb)
    OWN_SMOKE.add(rise)
    OWN_SMOKE.add(bb)
  }
})

/* The finale's battery: eight guns in a long rack, chain-fused down the coda. */
export const BATTERY_X0 = CRASH_AT[0] + 0.95
export const GUN_H = 1.3
export const GUN_W = 0.36
const LAUNCH = [CRASH, C(1), C(2), C(3), T5_AT, T6_AT, C(7), C(8)]
const BURST_AT = [C(2), C(3), C(4), C(5), C(7), C(8), C(9), C(10)]
const BATTERY_BURSTS: Shape[] = [
  { kind: 'chrys', col: FW.fwGold, tail: FW.fwGold, n: 64, v: 15, k: 3.3, gs: 5.5, life: 2.0, trail: 0.5, wash: 0.9 },
  { kind: 'peony', col: FW.fwRed, n: 46, v: 13, k: 3.6, gs: 6, life: 1.7, trail: 0.3, wash: 0.85 },
  { kind: 'palm', col: FW.fwGreen, tail: FW.fwGold, n: 9, v: 8.5, k: 2.0, gs: 4.5, life: 2.1, trail: 0.6, wash: 0.55 },
  { kind: 'willow', col: FW.fwViolet, tail: FW.fwGold, n: 30, v: 6.5, k: 2.8, gs: 5.2, life: 2.3, trail: 0.8, wash: 0.25 },
  { kind: 'crossette', col: FW.fwBlue, n: 10, v: 8.5, k: 1.9, gs: 5, life: 1.6, trail: 0.2, wash: 0.5 },
  { kind: 'willow', col: FW.fwGold, tail: FW.fwGold, n: 46, v: 9.5, k: 2.7, gs: 5.2, life: 2.7, trail: 0.95, wash: 0.75 },
  { kind: 'peony', col: FW.fwWhite, tail: FW.fwRed, n: 42, v: 12.5, k: 3.6, gs: 6, life: 1.7, trail: 0.3, wash: 0.5 },
  { kind: 'chrys', col: FW.fwGreen, tail: FW.fwGold, n: 60, v: 15, k: 3.3, gs: 5.5, life: 2.0, trail: 0.5, wash: 0.9 },
]
/**
 * Where each battery shell bursts: over the battery and the wheel, rippling right with the chain toward the Titan, and
 * each moved off the moon if the camera has brought the moon there (`offMoon`).
 */
const BATTERY_B: Pt[] = ([
  [WHEEL[0] - 5.2, GY - 7.3],
  [WHEEL[0] - 8.6, GY - 5.9],
  [WHEEL[0] - 1.2, GY - 6.6],
  [WHEEL[0] - 4.4, GY - 5.2],
  [WHEEL[0] + 1.6, GY - 7.0],
  [WHEEL[0] + 5.4, GY - 6.8],
  [LEADER_FOOT[0] - 3.8, GY - 5.8],
  [LEADER_FOOT[0] + 0.4, GY - 7.2],
] as Pt[]).map((b, i) => offMoon(BURST_AT[i], b, BATTERY_BURSTS[i]))
/** Each gun is laid toward where its shell will burst. */
export const GUNS: Gun[] = LAUNCH.map((at, i) => {
  const x = BATTERY_X0 + 0.66 * i
  const lean = Math.atan2(BATTERY_B[i][0] - x, GY - BATTERY_B[i][1])
  return { x, y: GY, w: GUN_W, h: GUN_H, lean: Math.max(-0.5, Math.min(0.5, lean)), fires: [at] }
})
const gunMuzzle = (gun: Gun): Pt => [gun.x + Math.sin(gun.lean) * gun.h, gun.y - Math.cos(gun.lean) * gun.h]
GUNS.forEach((gun, i) => shell(LAUNCH[i], BURST_AT[i], gunMuzzle(gun), BATTERY_B[i], BATTERY_BURSTS[i]))

/*
 * The crash itself: a row of mines along the battery's front, all at once, their fans thrown up to the frame's top and
 * out to its edges. The spark is lobbed through them to the wheel, so they burn cool (silver, blue, violet, with silver
 * tails): the gold in the sky is the battery's, and the spark stays the one warm light among them.
 */
export const MINES_X = [0, 1, 2, 3, 4].map((i) => BATTERY_X0 - 0.35 + 1.25 * i)
const MINE_COLS = [FW.fwWhite, FW.fwBlue, FW.fwViolet, FW.fwWhite, FW.fwBlue]
MINES_X.forEach((x, i) =>
  BURSTS.push({ at: CRASH, x, y: GY - 0.3, kind: 'mine', col: MINE_COLS[i], tail: FW.fwWhite, n: 34, v: 26 + 3 * hash(i, 9), k: 1.65, gs: 9, life: 1.9, trail: 0.34, wash: i === 2 ? 1.0 : 0.15, fan: 0.6, seed: 100 + i }),
)

/*
 * The Titan's two escort guns, both on its leader's side. The moon hangs up and right of the Titan in its frame, and a
 * shell broken on the right puts the moon at its heart; so the second gun stands behind the first and lays its shell
 * lower and farther out, a blue palm under the red one, and the sky right of the Titan is the moon's.
 */
export const FLANK: Gun[] = [
  { x: LEADER_FOOT[0] - 0.85, y: GY, w: 0.34, h: 1.25, lean: -0.3, fires: [DIVE] },
  { x: LEADER_FOOT[0] - 1.55, y: GY, w: 0.34, h: 1.1, lean: -0.42, fires: [DIVE] },
]
const FLANK_PALM: Shape = { kind: 'palm', col: FW.fwRed, tail: FW.fwGold, n: 9, v: 9, k: 2.0, gs: 4.5, life: 2.1, trail: 0.65, wash: 0.6 }
shell(DIVE, FLANK_BURST, gunMuzzle(FLANK[0]), offMoon(FLANK_BURST, [TITAN_X - 4.2, GY - 6.4], FLANK_PALM), FLANK_PALM)
shell(DIVE, FLANK_BURST, gunMuzzle(FLANK[1]), offMoon(FLANK_BURST, [TITAN_X - 5.8, GY - 3.4], FLANK_PALM), { ...FLANK_PALM, col: FW.fwBlue })
/**
 * The Titan's shell: the spark rides it up, so no rise of its own is drawn beyond the tail under the spark. The biggest
 * burst of the show, on the loudest chord of the coda: its stars break out to about 11 cells (three quarters and more
 * of the 18-cell frame's width), slower to open than the battery's, with long trails, so its head reads as one vast
 * flower with the spark inside its upper half. Its flash is held at its brightest for a moment and gone by about 0.4 s
 * (`wash` over 1 holds `drawWash`'s cap longer before it decays), in the warm gold of its light (`col`; the stars'
 * own colours are the Titan's, in `drawBurst`). Its heart is about 8.5 cells up, so the few stars thrown straight down
 * would plunge through the gun and into the ground: they are left out (`fan`), and the gun's own smoke stands there.
 */
export const TITAN: Burst = { at: TITAN_BURST, x: APEX[0], y: APEX[1] + HEART_DROP, kind: 'titan', col: FW.fwGold, tail: FW.fwGold, n: 150, v: 28, k: 2.5, gs: 4.2, life: 2.9, trail: 1.0, wash: 8, fan: Math.PI - 0.42, seed: 200 }
BURSTS.push(TITAN)

/* The salute barrage: six flash-bangs round the falling spark, from a rack of short tubes past the crate. */
export const SALUTE_RACK: Pt = [REST[0] + 5.4, GY]
const SALUTE_OFF: Pt[] = [[-1.7, -0.5], [1.6, -1.1], [-1.4, 1.0], [1.9, 0.4], [-2.1, -0.9], [1.3, -1.7]]
const SALUTE: Shape = { kind: 'salute', col: FW.fwWhite, n: 20, v: 55, k: 26, gs: 0, life: 0.34, trail: 0.17, wash: 0.6 }
export const SALUTES = HAMMERS.map((at, j) => {
  const s = sparkAt(at)
  const b = offMoon(at, [s[0] + SALUTE_OFF[j][0], Math.min(GY - 1.6, s[1] + SALUTE_OFF[j][1])], SALUTE)
  const a: Pt = [SALUTE_RACK[0] - 0.3 + 0.12 * j, GY - 0.55]
  return { at, from: at - 0.42, a, b }
})
SALUTES.forEach((s, j) => {
  RISES.push({ from: s.from, to: s.at, a: s.a, b: s.b, col: FW.fwWhite })
  BURSTS.push({ ...SALUTE, at: s.at, x: s.b[0], y: s.b[1], wash: j === 5 ? 0.9 : 0.6, seed: 300 + j })
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
for (const r of RISES) {
  if (!OWN_SMOKE.has(r)) puff(r.from + 0.03, r.a[0], r.a[1] - 0.2, 0.25, r.comet ? 0.8 : 1.2, r.comet ? 4 : 7, r.comet ? 0.22 : r.col === FW.fwWhite ? 0.14 : 0.32)
  // A candle's repeat: a wisp off its mouth. A far shell: haze hanging over the far bank (drawn behind the field).
  else if (r.comet) puff(r.from + 0.03, r.a[0], r.a[1] - 0.2, 0.15, 0.5, 3, 0.08)
  else puff(r.from + 0.05, r.a[0], GY - 2.3, 0.3, 1.1, 6, 0.08)
}
for (const b of BURSTS) {
  if (OWN_SMOKE.has(b)) puff(b.at + 0.4, b.x, b.y + 0.3, 0.5, b.kind === 'small' ? 0.8 : 1.5, 6, b.kind === 'small' ? 0.05 : 0.06)
  else if (b.kind === 'mine') puff(b.at + 0.12, b.x, b.y - 0.6, 0.5, 2.4, 10, 0.34)
  else if (b.kind === 'salute') puff(b.at + 0.18, b.x, b.y, 0.7, 1.8, 7, 0.22)
  else if (b.kind === 'small') puff(b.at + 0.3, b.x, b.y, 0.3, 1.0, 5, 0.14)
  else puff(b.at + 0.45, b.x, b.y + 0.3, 0.9, 0.4 * (b.v / b.k) + 1, 10, b.kind === 'titan' ? 0.34 : 0.24)
}
/*
 * The Titan's stars smoke as they burn: a thin haze where they have been, round the upper part of the flower (its
 * lower part is the gun's own smoke). One bank of it lies across the moon: the moon holds its place in the frame
 * (`night.ts`, 0.77 and 0.23 of it), so under the 18-cell framing (`fireworks.ts`: hold about [TITAN_X + 2.2, GY - 7.05]
 * at 145.5) it is at about (TITAN_X + 10.8, GY - 11.9), where the flower's rim reaches about 145.55. From then the moon
 * glows through the finale's smoke instead of standing crisp beside it. Re-measure if that framing changes.
 */
for (let i = 0; i < 9; i++) {
  const ang = -Math.PI / 2 + (i / 8 - 0.5) * 2 * 2.1 + 0.25 * (hash(i, 231) - 0.5)
  const r = 5.2 + 2.8 * hash(i, 232)
  puff(TITAN_BURST + 0.3 + 0.3 * hash(i, 233), TITAN.x + Math.cos(ang) * r, TITAN.y + Math.sin(ang) * r, 0.6, 1.7 + 0.9 * hash(i, 234), 8, 0.09 + 0.05 * hash(i, 235))
}
const MOON_THEN: Pt = [TITAN_X + 10.8, GY - 11.9]
puff(TITAN_BURST + 0.4, MOON_THEN[0] - 0.3, MOON_THEN[1] + 0.1, 1.3, 3.0, 9, 0.38)
puff(TITAN_FIRE + 0.05, TITAN_X, LIP - 0.6, 0.6, 2.4, 10, 0.45)
puff(TITAN_FIRE + 0.15, TITAN_X + 0.5, GY - 0.3, 0.5, 1.8, 9, 0.3)
PUFFS.sort((a, b) => a.at - b.at)

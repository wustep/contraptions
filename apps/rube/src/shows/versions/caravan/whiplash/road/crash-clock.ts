import type { Pt } from '../../../../../parts'
import { BREAKS, strength, tune } from '../music'
import { G_EARTH, G_LOW } from '../physics'
import { FOLDER_END, LOT_ON } from './folder'
import { CAR_H, CM, CRUSHED, LINER, SEAT, WHEELS, carPt, type CarPose } from './crash-car'
import { kick, ring } from './crash-paint'

/**
 * The drive and the crash as functions of show time, in the crash part's frame (the ball, seated in the parked
 * car, is at (-0.5, 0) when the part begins): where the car is and how it is turned, where the truck is, which lamp
 * is lit, and where Andrew is. `crash.ts` samples `him` for the lane and draws everything else from the same
 * functions, so he never slides off his seat.
 *
 *   205.92  the door slams, the lamps come on (the part's first beat)
 *   206.35  away across the lot; 207.64 the front wheels off the curb, 208.28 the rear
 *   208.50  the first of the road's sodium lamps lights as he passes under it; then one every other beat, and from
 *           211.50 one on every beat: the road lights up behind him in time, dark ahead
 *   225.42  far ahead, the truck flashes its high beams; 226.71 he brakes
 *   227.15  the truck hits him (the first stop-time break); 227.79 the car slams onto its tail and is thrown up
 *   227.79 to 230.57 in the air, slowly, turning over (the silence between the breaks)
 *   230.57  onto its roof; then end over end, a slam on every break, 230.99 to 233.67
 *   233.99  into a lamp post, on its roof, stopped (the last and loudest break)
 *   234.33  the post's lamp dies; the lamps round the wreck go out one by one
 *   236.36  he drops out of his seat; out under the hood; he crawls, and goes on, alone
 *   241.06  the wreck's last headlamp dies; 242.34 he is at rest in the dark: Carnegie Hall
 */

const smoothstep = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

export const T0 = FOLDER_END
/** The lot, where the car is parked (the ball seated is 0.98 above it), and the road, a curb lower. */
export const LOT_Y = SEAT[1]
export const ROAD_Y = LOT_Y + 0.18
/** The parked car's pose: the seat on the entry point. */
export const PARKED: CarPose = { x: -0.5 - (SEAT[0] - CM[0]), y: LOT_Y - CM[1], th: 0 }

/* ------------------------------------------------------------------ the drive */

/** The engine catches and the car pulls away. */
export const T_GO = tune(481)
/** The front wheels land off the curb, then the rear. */
export const CURB_F = tune(484)
export const CURB_R = tune(485.5)
/** He brakes; the truck hits. */
export const BRAKE = tune(528.5)
export const IMPACT = BREAKS[0]
/** The high beams, far ahead. */
export const FLASH = tune(525.5)

const CURB_H = ROAD_Y - LOT_Y
const DROP_T = Math.sqrt((2 * CURB_H) / G_EARTH)
const FRONT = WHEELS[1] - SEAT[0]
const REAR = SEAT[0] - WHEELS[0]

/** A drive from knots of speed (time, cells a second), linear between: the distance covered by `t`. */
function driven(knots: [number, number][]): (t: number) => number {
  const acc: number[] = [0]
  for (let i = 1; i < knots.length; i++) acc.push(acc[i - 1] + ((knots[i][1] + knots[i - 1][1]) / 2) * (knots[i][0] - knots[i - 1][0]))
  return (t: number) => {
    if (t <= knots[0][0]) return 0
    const n = knots.length
    if (t >= knots[n - 1][0]) return acc[n - 1] + knots[n - 1][1] * (t - knots[n - 1][0])
    let i = 0
    while (t > knots[i + 1][0]) i++
    const [ta, va] = knots[i]
    const [tb, vb] = knots[i + 1]
    const u = t - ta
    return acc[i] + va * u + ((vb - va) / (tb - ta)) * u * u * 0.5
  }
}
const knotsFor = (v1: number): [number, number][] => [
  [T0, 0],
  [T_GO, 0],
  [CURB_F, v1],
  [tune(492), 7.6],
  [tune(513), 9.2],
  [BRAKE, 10.2],
  [IMPACT, 5.8],
]
/** The speed at the curb that lands the rear wheels on their beat too. */
const V1 = (() => {
  let lo = 1
  let hi = 6
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2
    const d = driven(knotsFor(v))
    const gap = d(CURB_R - DROP_T) - d(CURB_F - DROP_T)
    if (gap > FRONT + REAR) hi = v
    else lo = v
  }
  return (lo + hi) / 2
})()
const DRIVE = driven(knotsFor(V1))
/** Where the seat is along the road at `t` (before the crash). */
export const seatX = (t: number): number => -0.5 + DRIVE(t)
/** The curb's edge: where the front wheels leave the lot. */
export const CURB_X = seatX(CURB_F - DROP_T) + FRONT

/* ------------------------------------------------------------------ the lamps */

/** The beats a lamp lights on as he passes under it: every other beat off the curb, then every beat. */
const LAMP_BEATS: number[] = [486, 488, 490, 492]
for (let b = 493; b <= 528; b++) LAMP_BEATS.push(b)
export const LAMP_T = LAMP_BEATS.map((b) => tune(b))
/** A lamp's post stands this far back from its lens (its arm reaches out over the road), and lights as he passes under the lens. */
export const LENS = 0.95 + 0.19
export const LAMP_X = LAMP_T.map((t) => seatX(t) - LENS)
/** How hard each lamp flares as it lights: as hard as the band's beat it lights on. */
const FLARE = LAMP_BEATS.map((b) => Math.min(1, strength('tune', b)))
/** The bridge over the river, mid-drive: from before the tenth lamp to past the twenty-first. */
export const BRIDGE = { x0: LAMP_X[9] - 2.6, x1: LAMP_X[20] + 2.2 }
/** The lot's lamp over the parked car: it comes on as the hall's loading door rolls up on it. */
export const LOT_LAMP_X = PARKED.x - 1.75
export { LOT_ON }

/* ------------------------------------------------------------------ the crash */

export const TAIL = BREAKS[1]
export const LAND = BREAKS[2]
/** The slams end over end, and the stop against the post. */
export const ROLLS = BREAKS.slice(3, 11)
export const POST_T = BREAKS[11]

/** The box a tumble rolls on (its nose is crumpled by then), in body cells. */
const BOX = { u0: 0, u1: 3.3, v0: 0, v1: CAR_H - CRUSHED }
const corners = (): Pt[] => [[BOX.u0, BOX.v0], [BOX.u1, BOX.v0], [BOX.u1, BOX.v1], [BOX.u0, BOX.v1]]

/** The car's pose at the impact (as the drive has it: diving on its brakes). */
const Q_IMPACT: CarPose = driving(IMPACT)
/** The truck's bumper at the impact: on the car's nose. */
export const TRUCK_HIT_X = Q_IMPACT.x + (3.6 - CM[0])
const TRUCK_V = 3.8
const TRUCK_STOP = 1.9
/** Where the truck's bumper is at `t`: coming at the car, then braking to a stop after the hit. */
export function truckX(t: number): number {
  if (t <= IMPACT) return TRUCK_HIT_X + TRUCK_V * (IMPACT - t)
  const u = Math.min(t - IMPACT, TRUCK_STOP)
  return TRUCK_HIT_X - (TRUCK_V * u - (TRUCK_V / TRUCK_STOP) * u * u * 0.5)
}

/** Phase 1: the nose driven back and up, the car pivoting on its tail corner, which is shoved back along the road. */
const P1 = TAIL - IMPACT
const PIVOT0: Pt = carPt(Q_IMPACT, 0, 0)
const P1_V0 = 6.2
const P1_V1 = 3.4
function phase1(t: number): CarPose {
  const tau = Math.max(0, Math.min(P1, t - IMPACT))
  const u = tau / P1
  const px = PIVOT0[0] - (P1_V0 * tau + ((P1_V1 - P1_V0) / P1) * tau * tau * 0.5)
  const py = PIVOT0[1] + (ROAD_Y - PIVOT0[1]) * Math.min(1, u * 4)
  const th = Q_IMPACT.th + (-(Math.PI / 2) - Q_IMPACT.th) * (1.35 * u - 0.35 * u * u)
  return aboutCorner([px, py], [0, 0], th)
}
/** The pose that puts body corner `uv` at `at`, turned `th`. */
function aboutCorner(at: Pt, uv: Pt, th: number): CarPose {
  const du = uv[0] - CM[0]
  const dv = uv[1] - CM[1]
  const c = Math.cos(th)
  const s = Math.sin(th)
  return { x: at[0] - (du * c + dv * s), y: at[1] - (du * s - dv * c), th }
}

/** Phase 2: in the air, slowly (the stage's low gravity: the silence between the breaks), a quarter turn onto the roof. */
const Q_TAIL = phase1(TAIL)
const P2 = LAND - TAIL
/** It lands on its roof after a turn and a quarter. */
const LAND_TH = -3 * Math.PI
const land = (dx: number): CarPose => aboutCorner([Q_TAIL.x - dx - (BOX.u1 - CM[0]), ROAD_Y], [BOX.u1, BOX.v1], LAND_TH)

/** Phase 3: end over end, pivoting on the leading corner, a slam on each break. */
interface Pivot {
  t0: number
  t1: number
  at: Pt
  r: number
  phi0: number
  th0: number
  /** Normalised time → how far round (0..1), from the energy of a body tipping over a corner. */
  turn: (u: number) => number
}
function pivotsFrom(q0: CarPose, t0: number): { pivots: Pivot[]; end: CarPose } {
  const pivots: Pivot[] = []
  let q = q0
  let t = t0
  for (const t1 of ROLLS) {
    // The corner on the road furthest back along the way it is going (left).
    const pts = corners().map(([u, v]) => ({ uv: [u, v] as Pt, p: carPt(q, u, v) }))
    const low = Math.max(...pts.map((c) => c.p[1]))
    const on = pts.filter((c) => c.p[1] > low - 1e-6).sort((a, b) => a.p[0] - b.p[0])[0]
    const at: Pt = [on.p[0], ROAD_Y]
    const r = Math.hypot(q.x - at[0], q.y - at[1])
    const phi0 = Math.atan2(at[1] - q.y, q.x - at[0])
    pivots.push({ t0: t, t1, at, r, phi0, th0: q.th, turn: tipping(phi0) })
    q = aboutCorner(at, on.uv, q.th - Math.PI / 2)
    t = t1
  }
  return { pivots, end: q }
}
/** A tip over a corner through a quarter turn from the centre's angle `phi0` above the road: slow over the top, fast into the slam. */
function tipping(phi0: number): (u: number) => number {
  const n = 64
  const acc: number[] = [0]
  for (let i = 1; i <= n; i++) {
    const phi = phi0 + ((i - 0.5) / n) * (Math.PI / 2)
    acc.push(acc[i - 1] + 1 / Math.sqrt(0.14 + 1 - Math.sin(phi)))
  }
  const total = acc[n]
  return (u: number) => {
    const want = Math.max(0, Math.min(1, u)) * total
    let i = 0
    while (i < n && acc[i + 1] < want) i++
    const f = (want - acc[i]) / Math.max(1e-9, acc[i + 1] - acc[i])
    return (i + f) / n
  }
}
function atPivot(v: Pivot, t: number): CarPose {
  const u = v.turn((t - v.t0) / (v.t1 - v.t0))
  const phi = v.phi0 + u * (Math.PI / 2)
  return { x: v.at[0] + v.r * Math.cos(phi), y: v.at[1] - v.r * Math.sin(phi), th: v.th0 - u * (Math.PI / 2) }
}

/** Phase 4: on its roof, sliding back into the post, and stopped dead. */
const SLIDE_V0 = 4.6
const SLIDE_A = 6.5
const SLIDE_T = POST_T - ROLLS[ROLLS.length - 1]
const SLIDE_D = SLIDE_V0 * SLIDE_T - 0.5 * SLIDE_A * SLIDE_T * SLIDE_T

/** The flight's drift is chosen so that the wreck stops with its nose on one of the road's lamp posts. */
const PLAN = (() => {
  const trial = pivotsFrom(land(0), LAND).end
  const nose0 = trial.x - SLIDE_D - (BOX.u1 - CM[0]) - 0.1
  // The drift that brings the nose to a post: as near 8.5 cells as the posts allow.
  let best = { dx: 8.5, j: -1, err: Infinity }
  for (let j = 0; j < LAMP_X.length; j++) {
    const dx = nose0 - LAMP_X[j]
    if (dx < 6 || dx > 11.5) continue
    const err = Math.abs(dx - 8.5)
    if (err < best.err) best = { dx, j, err }
  }
  const q = land(best.dx)
  const rolls = pivotsFrom(q, LAND)
  return { dx: best.dx, post: best.j, landed: q, pivots: rolls.pivots, rolled: rolls.end }
})()
/** Which lamp the wreck ends against, and where it stops. */
export const POST_LAMP = PLAN.post
export const POST_X = LAMP_X[PLAN.post]
export const WRECK: CarPose = { x: PLAN.rolled.x - SLIDE_D, y: PLAN.rolled.y, th: PLAN.rolled.th }

function phase2(t: number): CarPose {
  const u = Math.max(0, Math.min(1, (t - TAIL) / P2))
  const a = Q_TAIL
  const b = PLAN.landed
  const arc = (G_LOW * P2 * P2) / 8
  // Its turn slows as it comes down, so it meets the road flat on its roof and not on a corner.
  const turn = 1 - Math.pow(1 - u, 1.5)
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - arc * 4 * u * (1 - u), th: a.th + (b.th - a.th) * turn }
}

/** The car at `t`: parked, driving (with its springs), tumbling, and at rest. */
export function carAt(t: number): CarPose {
  if (t < T0) return PARKED
  if (t < IMPACT) return driving(t)
  if (t < TAIL) return phase1(t)
  if (t < LAND) return phase2(t)
  const last = ROLLS[ROLLS.length - 1]
  if (t < last) {
    const v = PLAN.pivots.find((p) => t < p.t1) ?? PLAN.pivots[PLAN.pivots.length - 1]
    return atPivot(v, t)
  }
  if (t < POST_T) {
    const tau = t - last
    return { x: PLAN.rolled.x - (SLIDE_V0 * tau - 0.5 * SLIDE_A * tau * tau), y: PLAN.rolled.y, th: PLAN.rolled.th }
  }
  // Stopped against the post: a small recoil and a long damped rock on the crushed roof.
  const tau = t - POST_T
  return { x: WRECK.x + 0.07 * Math.sin(Math.min(tau, 0.5) * Math.PI * 2) * Math.exp(-tau / 0.25), y: WRECK.y, th: WRECK.th + 0.045 * ring(tau, 0.55, 7) }
}

/** The car on the road: rolling, its wheels dropping off the curb, its nose lifting and diving on its springs. */
function driving(t: number): CarPose {
  const s = seatX(t)
  // A wheel over the curb's edge falls its height and lands on the beat.
  const wheelY = (cross: number): number => {
    const tau = t - cross
    if (tau <= 0) return LOT_Y
    if (tau < DROP_T) return LOT_Y + 0.5 * G_EARTH * tau * tau
    return ROAD_Y
  }
  const yf = wheelY(CURB_F - DROP_T)
  const yr = wheelY(CURB_R - DROP_T)
  const th0 = Math.atan2(yf - yr, FRONT + REAR)
  // The springs: a heave after each landing, a squat pulling away, a dive on the brakes.
  const heave = -0.05 * ring(t - CURB_F, 0.2, 15) - 0.05 * ring(t - CURB_R, 0.2, 15)
  const pitch = -0.035 * smoothstep(t, T_GO - 0.1, T_GO + 0.5) * (1 - smoothstep(t, T_GO + 0.8, CURB_F)) + 0.06 * kick(t - BRAKE, 0.8) - 0.02 * ring(t - CURB_F, 0.25, 12) + 0.02 * ring(t - CURB_R, 0.25, 12)
  // The wheels' line where the wheels are, the seat at s along the road.
  return { x: s - (SEAT[0] - CM[0]), y: (yf + yr) / 2 - CM[1] + heave, th: th0 + pitch }
}

/* ------------------------------------------------------------------ him */

/** He drops out of his seat (hanging in his belt upside down) onto the roof's lining. */
export const DROP = tune(551)
/** Out under the hood, onto the road. */
export const OUT = DROP + 0.95
/** Up again, going on. */
export const ON = BREAKS[11] + 5.152
/** The end: at rest in the dark. */
export const END = 242.344

/** Where he is in the car's body cells while he is in it. */
function inCar(t: number): Pt {
  if (t < IMPACT) return SEAT
  // Thrown against his belt by every hit, and back.
  let du = 0.09 * kick(t - IMPACT, 0.25) - 0.05 * kick(t - TAIL, 0.3)
  let dv = 0
  for (const b of [LAND, ...ROLLS, POST_T]) dv += 0.04 * ring(t - b, 0.12, 20)
  if (t > TAIL && t < LAND) {
    // Weightless in the fall: a slow drift against the belt.
    const u = (t - TAIL) / (LAND - TAIL)
    du += 0.05 * Math.sin(u * Math.PI * 2.2)
    dv += 0.08 * Math.sin(u * Math.PI)
  }
  if (t < DROP) return [SEAT[0] + du, SEAT[1] + dv]
  const u = Math.min(1, (t - DROP) / 0.2)
  return [SEAT[0] + (LINER[0] - SEAT[0]) * u, SEAT[1] + (LINER[1] - SEAT[1]) * u * u]
}

/** The road under him, at rest after the crash. */
const OUT_Y = ROAD_Y - 0.13
/** Where he comes out from under the hood, and where he stops. */
const OUT_X = carPt(WRECK, 3.35, LINER[1])[0] - 0.05
export const REST_X = OUT_X - 3.0

/** Andrew at `t`, in the part's frame. */
export function him(t: number): Pt {
  if (t < DROP + 0.2) {
    const [u, v] = inCar(t)
    return carPt(carAt(t), u, v)
  }
  const lined = carPt(carAt(DROP + 0.2), LINER[0], LINER[1])
  if (t < OUT) {
    // Along the lining toward the broken windshield, slowly.
    const u = smoothstep(t, DROP + 0.35, OUT)
    return [lined[0] + (OUT_X - lined[0]) * u, lined[1] + (OUT_Y - lined[1]) * u]
  }
  // The crawl: out from under the hood, a stop to gather himself, and on; slowing to rest at the end.
  const x = crawl(t)
  return [x, OUT_Y]
}

/** His distance along the road from where he comes out: slow, a stop, then on, and at rest on the last beat. */
const crawl = (() => {
  const pts: [number, number][] = [
    [OUT, 0],
    [OUT + 0.95, 0.42],
    [OUT + 1.5, 0.5],
    [ON, 0.78],
    [ON + 1.3, 1.9],
    [END - 0.45, 2.85],
    [END, 3.0],
  ]
  const xs = pts.map((q) => q[0])
  const ys = pts.map((q) => q[1])
  // Monotone through the points, with a gentle speed everywhere and zero at the very end.
  const n = xs.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])
  m[0] = 0
  m[n - 1] = 0
  return (t: number): number => {
    if (t <= xs[0]) return OUT_X
    if (t >= xs[n - 1]) return OUT_X - ys[n - 1]
    let i = 0
    while (i < n - 2 && t > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const u = (t - xs[i]) / h
    const y = (2 * u ** 3 - 3 * u ** 2 + 1) * ys[i] + (u ** 3 - 2 * u ** 2 + u) * h * m[i] + (-2 * u ** 3 + 3 * u ** 2) * ys[i + 1] + (u ** 3 - u ** 2) * h * m[i + 1]
    return OUT_X - y
  }
})()

/* ------------------------------------------------------------------ what dies */

/** The lamps round the wreck, going out one by one after it stops: lamp index → the beat it dies on. */
export const DIES: Map<number, number> = new Map([
  [POST_LAMP, 234.333],
  [POST_LAMP + 1, 235.947],
  [POST_LAMP - 1, 237.776],
  [POST_LAMP + 2, 239.137],
  [POST_LAMP - 2, 240.192],
])
/** The wreck's last headlamp, still burning along the road, dies. */
export const LAST_LIGHT = 241.059

/** How lit lamp `i` is at `t`: dark until he passes under it, a flare on its beat, steady; out when it dies. */
export function lampAt(i: number, t: number): number {
  const on = LAMP_T[i]
  if (t < on) return 0
  const d = DIES.get(i)
  const base = 0.82 + (0.2 + 0.55 * FLARE[i]) * kick(t - on, 0.3)
  if (d === undefined || t < d) return base
  return base * (0.9 * kick(t - d, 0.05) + 0.1) * Math.max(0, 1 - (t - d) / 0.25)
}

/** The post the wreck hits: how far it leans (radians, its top going back along the road). */
export const postLean = (t: number): number => (t < POST_T ? 0 : 0.42 * (1 - Math.exp(-(t - POST_T) / 0.12)) + 0.05 * ring(t - POST_T - 0.2, 0.35, 9))

void CAR_H

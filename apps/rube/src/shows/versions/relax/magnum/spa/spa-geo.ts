import type { Pt, Seg } from '../../../../../parts'
import { R } from '../../../../../parts'
import { carried } from '../kit'
import { bar, beat, CALL, half, HOOK1, HOOK2, onset, VERSE } from '../music'
import { G, launch } from '../physics'

/**
 * Mugatu's day spa, the SPA builder's: where everything is, when everything happens, and Derek's way through it. The
 * part's frame (SPA_AT is the place's origin, so it is the set's frame too): he comes in at (-0.5, 0), the floor's
 * surface at y = FLOOR (0.13) throughout. Every state here is a function of show time, so the drawings and the lane read
 * the same numbers.
 *
 *   27.394  the door: Mugatu beside him. Mugatu's lift takes him up (27.911); the belt starts (28.439)
 *   hook1   the car wash for models, a treatment on each line of the hook: the towel drums (32.596, 33.629), the mud
 *           (36.758) and the teal rinse (38.836), two cucumber slices (41.431, 41.947), the steam cabinet
 *           (45.065 → 46.632), the hot towel (48.188), the dryer (49.221); the steam over the room past the line clears
 *           (51.305)
 *   hook2   the conditioning: into the recliner (52.356); on each line Mugatu's lever lets the chair go and it flings him
 *           at the crimson target (53.395, 57.551, 61.713), each a little nearer its middle; he rolls back down the
 *           chute to the chair. The fourth time Mugatu takes his hand off the lever and Derek goes by himself (65.876)
 *   71.071  the call: he coils, and goes, and hits it dead centre: the target knocked flat. Mugatu's glee
 *   74.699  dazed on the floor past it, the big dryer comes down and blows him out through the spa's door (83.552)
 */

/* ------------------------------------------------------------------ the clock */

export const T0 = HOOK1
export const T1 = VERSE
/** The door: Mugatu's nod down the line ("after you"); his lift goes up; the belt starts. */
export const NOD = beat(53)
export const LIFT_GO = beat(54)
export const SET_OFF = beat(55)
/** The towel drums: each comes down onto him on its beat and rides him to the next. */
export const DRUM_T = [beat(62), beat(64)]
export const DRUM_UP = [beat(63), beat(65)]
/** The mud trough tips, and the mud comes down on him on the line; the teal jets come on, and rinse him. */
export const MUD_TIP = beat(69)
export const MUD_HIT = beat(70)
export const RINSE_ON = beat(73)
export const RINSE_HIT = beat(74)
export const RINSE_OFF = beat(76)
/** The slicer chops, a slice a beat; each lands on him a beat later, an eye each. */
export const CHOPS = [beat(78), beat(79)]
export const SLICES = [beat(79), beat(80)]
/** Each gantry's lamp comes on, on the downbeat before its treatment: the line lighting the way ahead of him. */
export const LAMPS_ON = [bar(15), bar(17), bar(19), bar(22)]
export const CAB_LAMP = bar(21)
/** The steam cabinet: the door comes down behind him, the steam, the door ahead goes up. */
export const CAB_IN = beat(86)
export const CAB_PUFF = onset(45.541, 0.5)
export const CAB_OUT = beat(89)
/** The hot towel: the arm comes down, wraps it round him. The dryer's hood blows, and lifts. */
export const TOWEL_GO = beat(91)
export const TOWEL = beat(92)
export const DRY = beat(94)
export const DRY_UP = beat(96)
/** The vents over the far room open, and its steam clears. */
export const FOG_GO = beat(97)
/** Into the recliner: the second round of the hook. */
export const DELIVER = HOOK2

export interface Cycle {
  /** Mugatu comes to the lever; presses it (the latch lets go); the chair slams up and flings him; the hit; onto the chute; the chair wound back and latched; back in it. */
  near: number
  lever: number
  fling: number
  hit: number
  land: number
  latch: number
  back: number
}
/** The three flings Mugatu makes, on bars 25, 27 and 29: each on its line's third beat. */
export const CYCLES: Cycle[] = [0, 1, 2].map((k) => {
  const b = 100 + 8 * k
  return { near: beat(b + 1), lever: half(b + 1), fling: beat(b + 2), hit: beat(b + 3), land: beat(b + 4), latch: beat(b + 6), back: beat(b + 8) }
})
/** The fourth (bar 31): Mugatu comes to the lever, and takes his hand away; Derek coils and goes by himself. */
/**
 * On beat 125, the beat he would have pushed it, Mugatu takes his hand off the lever and holds it away; the latch stays
 * locked. A beat of nothing. On the line (beat 126) Derek gathers into the cushion, and on its off-beat springs by
 * himself: stiff and exact, the conditioned motion, not the chair's throw. Mugatu's look when it lands.
 */
export const WITHDRAW = beat(125)
export const GATHER3 = beat(126)
export const HOP3 = half(126)
export const HIT3 = half(127)
export const LAND3 = half(128)
export const BACK3 = bar(33)
/** The call: three coils on the fill, the launch on its loudest hit, dead centre on the crash. */
export const COILS = [beat(133), beat(134), beat(135)]
export const LAUNCH = half(135)
export const HIT4 = CALL
/** The target comes down flat on its stand; he is thrown up off it as it goes, comes down past it, and bounces, dazed. */
export const FLAT = half(136)
export const LAND_F = beat(138)
export const BOUNCE_F = beat(139)
export const BOUNCE_F2 = half(139)
/** Mugatu's glee. */
export const GLEE = [beat(137), beat(138), beat(139)]
/** The big dryer comes down over him, spins up, and blows. */
export const DRYER_DOWN = beat(141)
export const DRYER_SPIN = beat(142)
export const BLAST = beat(143)
/** On the way out: through the towel strips, and the doors swing open ahead. */
export const STRIPS = bar(38)
export const DOORS = bar(39)
/** The press waiting outside the front door: a flash as it blows open, one as he comes out, and the one that is the cut. */
export const PRESS_FLASH = [bar(39), half(159), VERSE]

/* ------------------------------------------------------------------ small helpers */

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))
export const sm = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
/** A point turned by `a` (radians; on the screen, y down, a positive turn takes the left side up). */
export const rot = (a: number, [x, y]: Pt): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]

/* ------------------------------------------------------------------ the line */

/** The floor's surface; his centre on it is at 0. */
export const FLOOR_Y = R
/** The belt's pace, and how long it takes to come up to it. */
export const V_BELT = 0.68
const ACC = 0.5
/** The belt's head (under the door) and where it runs to (the recliner's back end, found below). */
export const BELT_X0 = -1.15
/** How far the belt has carried him at `t`. */
export function beltD(t: number): number {
  if (t <= SET_OFF) return 0
  const u = t - SET_OFF
  if (u < ACC) return (V_BELT * u * u) / (2 * ACC)
  return V_BELT * (u - ACC / 2)
}
/** Where he is on the belt at `t`. */
export const onBelt = (t: number): number => -0.5 + beltD(t)

/** Where each treatment stands along the line: where he is on its moment. */
export const LIFT_X = -0.08
export const DRUM_X = DRUM_T.map((t) => onBelt(t))
export const MUD_X = onBelt(MUD_HIT)
export const RINSE_X = onBelt(RINSE_HIT) + 0.2
export const SLICER_X = onBelt(SLICES[0]) + 0.16
/** The slicer's blade: a slice falls from it under G_LOW onto his top in a beat. */
export const SLICER_Y = -R - 0.36
export const CAB = { x0: onBelt(CAB_IN) - 0.22, x1: onBelt(CAB_OUT) + 0.24, top: FLOOR_Y - 1.5 }
export const TOWEL_X = onBelt(TOWEL)
export const HOOD = { x0: onBelt(DRY) - 0.28, x1: onBelt(DRY_UP) + 0.3 }
/** The treatments' gantries: a brass portal over each. */
export const GANTRIES: { x: number; w: number }[] = [
  { x: (DRUM_X[0] + DRUM_X[1]) / 2, w: 2.0 },
  { x: (MUD_X + RINSE_X) / 2, w: RINSE_X - MUD_X + 1.2 },
  { x: SLICER_X, w: 1.25 },
  { x: (TOWEL_X + (HOOD.x0 + HOOD.x1) / 2) / 2, w: (HOOD.x1 - TOWEL_X) + 1.0 },
]

/* ------------------------------------------------------------------ the recliner */

/**
 * The conditioning chair: a padded recliner lying back in a shallow pit at the belt's end, hinged at its foot (P) on
 * the pit's floor, a coil spring under its back. Reclined and latched, it is cocked: the belt drops him off its end
 * onto the back, and he rolls down into its hollow. Let go, the spring throws it up about its foot and it flings him
 * across the room. His centre along its top, cocked, is a curve through the back, the hollow, the knee and the foot.
 */
const BACK = 1.9
const HOLLOW = 1.0
const KNEE = 0.42
/** How long he takes to roll off the belt's end down the back into the hollow, from the belt's pace. */
function downTheBack(): { time: number; speed: number } {
  // His centre along the back, relative to its top: a cosine 0.17 deep over BACK - HOLLOW.
  const L = BACK - HOLLOW
  const y = (x: number) => (0.17 * (1 - Math.cos((Math.PI * x) / L))) / 2
  let x = 0
  let v = V_BELT
  let t = 0
  const dt = 1 / 2000
  while (x < L) {
    const s = (y(x + 1e-4) - y(x)) / 1e-4
    const c = 1 / Math.sqrt(1 + s * s)
    v += (5 / 7) * G * s * c * dt
    x += v * c * dt
    t += dt
  }
  return { time: t, speed: v }
}
const DOWN = downTheBack()
/** When he leaves the belt, and where. */
export const OFF_BELT = DELIVER - DOWN.time
export const BELT_X1 = onBelt(OFF_BELT)
/** The recliner's foot (its hinge), and his rest in its hollow. */
export const P: Pt = [BELT_X1 + BACK, 0.3]
export const HOLLOW_X = P[0] - HOLLOW
export const REST: Pt = [HOLLOW_X, 0.17]

/** His centre along the cocked recliner, then up the chute (x from the back's top to the chute's top). */
export function seatY(x: number): number {
  const x0 = P[0] - BACK
  const xh = HOLLOW_X
  const xk = P[0] - KNEE
  const xf = P[0] + 0.1
  const cos = (a: number, b: number, y0: number, y1: number, v: number) => y0 + ((y1 - y0) * (1 - Math.cos((Math.PI * clamp01((v - a) / (b - a)))))) / 2
  if (x <= xh) return cos(x0, xh, 0, 0.17, x)
  if (x <= xk) return cos(xh, xk, 0.17, 0.07, x)
  if (x <= xf) return cos(xk, xf, 0.07, 0.12, x)
  return chuteY(x)
}

/* ------------------------------------------------------------------ the target, the chute */

/** The target: its post's top (the hinge), the disc's middle over it, the disc's half-size (turned a little toward the chair). */
export const XT = P[0] + 4.6
export const DISC = { c: [XT, -2.0] as Pt, rx: 0.5, ry: 0.78 }
export const HINGE: Pt = [XT + 0.05, DISC.c[1] + DISC.ry]
/** Where each hit lands on the disc, from its middle: nearer every time. */
export const HIT_OFF: Pt[] = [
  [0.04, 0.55],
  [0.0, 0.37],
  [-0.01, 0.21],
  [0.0, 0.08],
  [0.0, 0.0],
]
/** The return chute: his centre along it, from the recliner's foot up to under the target. */
export const CHUTE = { x0: P[0] + 0.1, y0: 0.12, x1: XT - 0.32, y1: -0.3 }
export function chuteY(x: number): number {
  const u = (x - CHUTE.x0) / (CHUTE.x1 - CHUTE.x0)
  return CHUTE.y0 + (CHUTE.y1 - CHUTE.y0) * u
}

/* ------------------------------------------------------------------ the chair's swing */

/** The chair turned by `a` about its foot: a point of it, given cocked. */
export const chairPoint = (a: number, q: Pt): Pt => add(P, rot(a, [q[0] - P[0], q[1] - P[1]]))

interface Fling {
  /** The chair's throw: how far it turns, how long it takes, when it starts. */
  amax: number
  ts: number
  start: number
  /** Where he leaves it, and his speed. */
  from: Pt
  v: Pt
}
/** Solve a fling: the chair's turn whose tip leaves on exactly the flight that meets `to` at `hit`. */
function solveFling(fling: number, hit: number, to: Pt): Fling {
  const r: Pt = [REST[0] - P[0], REST[1] - P[1]]
  const T = hit - fling
  let a = 1.2
  let from = chairPoint(a, REST)
  let v = launch(from, to, T).out
  for (let i = 0; i < 60; i++) {
    from = chairPoint(a, REST)
    v = launch(from, to, T).out
    const tan = rot(a + Math.PI / 2, r)
    const d = Math.atan2(v[1], v[0]) - Math.atan2(tan[1], tan[0])
    a += d
  }
  const ts = (2 * a * Math.hypot(r[0], r[1])) / Math.hypot(v[0], v[1])
  return { amax: a, ts, start: fling - ts, from, v }
}
export const FLINGS: Fling[] = CYCLES.map((c, k) => solveFling(c.fling, c.hit, add(DISC.c, HIT_OFF[k])))

/** How far the chair is turned up at `t`: cocked, thrown, held up against its stop, wound back in two clicks, latched. */
export function chairAngle(t: number): number {
  for (let k = CYCLES.length - 1; k >= 0; k--) {
    const c = CYCLES[k]
    const f = FLINGS[k]
    if (t < f.start) continue
    if (t < c.fling) {
      const u = (t - f.start) / f.ts
      return f.amax * u * u
    }
    // Against the stop: a knock back off its buffer, and held.
    const knockBack = 0.07 * Math.exp(-(t - c.fling) / 0.09) * Math.abs(Math.sin(((t - c.fling) * Math.PI) / 0.14))
    const up = f.amax - knockBack
    // Wound back down by the ratchet: half on the beat after it lands, the rest onto the latch.
    const mid = c.latch - (c.latch - c.land) / 2
    const step1 = sm(t, mid - 0.2, mid)
    const step2 = sm(t, c.latch - 0.2, c.latch)
    const settle = t > c.latch ? 0.025 * Math.exp(-(t - c.latch) / 0.08) * Math.sin((t - c.latch) * 40) : 0
    return Math.max(0, up * (1 - 0.5 * step1 - 0.5 * step2) + settle)
  }
  return 0
}

/* ------------------------------------------------------------------ the target's state */

/** How far the target is tipped back on its hinge at `t` (radians): a rock on each hit, then knocked flat by the last. */
export function targetTip(t: number): number {
  let a = 0
  const hits = [...CYCLES.map((c) => c.hit), HIT3]
  const size = [0.1, 0.14, 0.18, 0.22]
  hits.forEach((h, i) => {
    const u = t - h
    if (u < 0 || u > 2) return
    a += size[i] * Math.exp(-u / 0.28) * Math.sin(u * 16) * (u < 0.1 ? 1 : 1)
  })
  if (t >= HIT4) {
    // Knocked over: it goes back under the blow, gathering, and slams flat on the loud off-beat after; one bounce.
    const flat = Math.PI / 2 - 0.02
    if (t < FLAT) {
      const u = (t - HIT4) / (FLAT - HIT4)
      return flat * (0.35 * u + 0.65 * u * u)
    }
    const s = t - FLAT
    return flat - 0.16 * Math.exp(-s / 0.1) * Math.abs(Math.sin(s * 14))
  }
  return Math.max(0, a)
}

/* ------------------------------------------------------------------ the big dryer */

/** Where he comes to rest past the target, dazed, and the big dryer that comes down over him there. */
const LAND_DX = 2.1
export const LAND_F_X = XT + LAND_DX
export const BOUNCE_X = [LAND_F_X + 0.45, LAND_F_X + 0.62]
export const REST_F_X = BOUNCE_X[1] + 0.2
export const DRYER = { x: REST_F_X - 0.78, y: -0.78, parked: -7.5, aim: 0.62 }
/** How far down the big dryer's column has come (its hood's middle, y), how far it is turned to aim, and its blow (0..1). */
export function dryerAt(t: number): { y: number; aim: number; spin: number; blow: number } {
  const down = sm(t, DRYER_DOWN - 0.52, DRYER_DOWN)
  const settle = t > DRYER_DOWN ? 0.08 * Math.exp(-(t - DRYER_DOWN) / 0.18) * Math.sin((t - DRYER_DOWN) * 18) : 0
  const up = sm(t, BLAST + 2.2, BLAST + 4.2)
  const y = DRYER.parked + (DRYER.y - DRYER.parked) * down * (1 - up) + settle * (1 - up)
  const aim = DRYER.aim * sm(t, DRYER_DOWN - 0.2, DRYER_DOWN + 0.25)
  const spin = sm(t, DRYER_SPIN - 0.05, BLAST) * (1 - sm(t, BLAST + 1.4, BLAST + 2.4))
  const blow = t < BLAST ? 0 : Math.exp(-(t - BLAST) / 0.7) * (1 - sm(t, BLAST + 1.6, BLAST + 2.2))
  return { y, aim, spin, blow }
}

/* ------------------------------------------------------------------ the way out */

/** Blown: sharp to 3.2 cells a second on the blast, dying away to exactly the seam's 1.2 at the cut. */
const V_END = 1.2
const V_KICK = 2.0
const TAU = 1.4
const U = T1 - BLAST
const E = Math.exp(-U / TAU)
export const outD = (u: number): number => V_END * u + (V_KICK / (1 - E)) * (TAU * (1 - Math.exp(-u / TAU)) - u * E)
export const X_END = REST_F_X + outD(U)
/** Where he is on the way out at `t`. */
export const onExit = (t: number): number => (t <= BLAST ? REST_F_X : REST_F_X + outD(Math.min(U, t - BLAST)))
/** The strips across the way out, the doors, and the lit teal pool the floor crosses. */
export const STRIPS_X = onExit(STRIPS) + 0.14
export const DOOR_X = X_END - 0.9
/** When the dryer's gust, running just ahead of him on the way out, gets to `x` (Infinity if it never does). */
export function gustAt(x: number): number {
  if (x < REST_F_X) return Infinity
  if (x > X_END + 0.6) return T1 + (x - X_END - 0.6) / V_END
  let lo = BLAST
  let hi = T1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (onExit(mid) + 0.6 < x) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
/** How hard the gust is blowing at `x` at `t` (0..1): it comes with him and dies away behind him. */
export function windAt(x: number, t: number): number {
  const at = gustAt(x)
  if (!Number.isFinite(at)) return 0
  const u = t - at
  if (u < -0.35) return 0
  return u < 0 ? (1 + u / 0.35) ** 2 : Math.exp(-u / 1.1)
}
/** The robes on hooks along the way out, hung where the gust gets to each on a beat: their hems lift in time. */
export const ROBE_BEATS = [beat(144), beat(146), beat(148), beat(150)]
export const ROBES: number[] = ROBE_BEATS.map((b) => onExit(b) + 0.6)

/* ------------------------------------------------------------------ Derek's way */

/** A lane being laid, in show seconds and the part's cells. */
export class Path {
  segs: Seg[] = []
  constructor(
    public at: Pt,
    public t: number,
  ) {}
  /** Carried by something from now to `t1`, sampled from `fn` (show time). */
  carry(fn: (t: number) => Pt, t1: number, perSecond = 40, hidden = false): this {
    const n = Math.max(2, Math.ceil((t1 - this.t) * perSecond))
    this.segs.push(...carried(fn, this.t, t1, n, hidden))
    this.at = fn(t1)
    this.t = t1
    return this
  }
  /** Still until `t1`. */
  rest(t1: number): this {
    if (t1 > this.t + 1e-9) this.segs.push({ from: this.at, to: this.at, dur: t1 - this.t })
    this.t = Math.max(this.t, t1)
    return this
  }
  /** A flight under gravity to `to`, landing at `t1`. */
  fly(to: Pt, t1: number, g = G): this {
    const T = t1 - this.t
    this.segs.push({ from: this.at, to, dur: T, arc: (g * T * T) / 8 })
    this.at = to
    this.t = t1
    return this
  }
  /** Straight to `to` at one even pace, landing at `t1`: no arc, no ease (the conditioned motion). */
  line(to: Pt, t1: number): this {
    this.segs.push({ from: this.at, to, dur: t1 - this.t })
    this.at = to
    this.t = t1
    return this
  }
}

/** A roll along a curve y(x) under gravity (a ball rolling: 5/7 g along the slope) with a little drag, from x0 at v0 (dir ±1), sampled. */
function rollTable(y: (x: number) => number, x0: number, v0: number, dir: 1 | -1, until: (x: number) => boolean, drag = 0.35): { t: number[]; x: number[]; v: number } {
  const ts = [0]
  const xs = [x0]
  let x = x0
  let v = v0
  let t = 0
  const dt = 1 / 1000
  for (let i = 0; i < 20000 && !until(x); i++) {
    const s = ((y(x + 1e-4) - y(x - 1e-4)) / 2e-4) * dir
    const c = 1 / Math.sqrt(1 + s * s)
    v += ((5 / 7) * G * s * c - drag * v) * dt
    x += dir * v * c * dt
    t += dt
    ts.push(t)
    xs.push(x)
  }
  return { t: ts, x: xs, v }
}
const tableAt = (tab: { t: number[]; x: number[] }, u: number): number => {
  const { t, x } = tab
  if (u <= 0) return x[0]
  if (u >= t[t.length - 1]) return x[x.length - 1]
  const i = Math.min(t.length - 2, Math.floor(u * 1000))
  const f = (u - t[i]) / (t[i + 1] - t[i])
  return x[i] + (x[i + 1] - x[i]) * f
}

/** Back down the chute from `x0` into the hollow, arriving on `back`: the start pace found so that he does. */
function chuteReturn(x0: number, land: number, back: number): { at: (t: number) => Pt; speed: number } {
  const T = back - land
  let lo = 0
  let hi = 6
  let tab = rollTable(seatY, x0, 1, -1, (x) => x <= HOLLOW_X)
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    tab = rollTable(seatY, x0, mid, -1, (x) => x <= HOLLOW_X)
    if (tab.t[tab.t.length - 1] > T) lo = mid
    else hi = mid
  }
  // Scaled so it arrives exactly on the beat.
  const k = tab.t[tab.t.length - 1] / T
  return {
    at: (t: number): Pt => {
      const x = tableAt(tab, (t - land) * k)
      return [x, seatY(x)]
    },
    speed: tab.v * k,
  }
}

/** Settling in the padded hollow after coming in at `v` (dir ±1): a damped rock along it, quite still by `until`. */
function settleIn(arrive: number, v: number, dir: 1 | -1, until: number): (t: number) => Pt {
  const w = 7
  const z = 0.58
  const wd = w * Math.sqrt(1 - z * z)
  return (t: number): Pt => {
    const u = t - arrive
    const taper = 1 - sm(t, until - 0.35, until)
    const x = HOLLOW_X + dir * (v / wd) * Math.exp(-z * w * u) * Math.sin(wd * u) * taper
    return [x, seatY(x)]
  }
}

/** Sunk into the cushion (how deep) at `t`: the coil before he goes by himself the first time. */
export function sinkAt(t: number): number {
  if (t < GATHER3 || t > HOP3) return 0
  return 0.12 * Math.min(1, (t - GATHER3) / 0.05)
}

/**
 * The wind-up before the call, on the fill's three beats: he rocks back up the chair's back, a little further each
 * time, like a swing being pumped, and comes most of the way back; the third time he stays up there, coiled, and goes.
 */
const WIND = [0.13, 0.25, 0.37]
export function windUp(t: number): { back: number; sink: number } {
  if (t > LAUNCH) return { back: 0, sink: 0 }
  let back = 0
  let sink = 0
  // A ratchet: a sharp step back up the chair's back on each beat, and dead still between.
  COILS.forEach((c, i) => {
    if (t < c) return
    const f = Math.min(1, (t - c) / 0.06)
    const prev = i ? WIND[i - 1] : 0
    back = prev + (WIND[i] - prev) * f
    sink = 0.035 * (i + f)
  })
  return { back, sink }
}
export const windPos = (t: number): Pt => {
  const w = windUp(t)
  const x = REST[0] - w.back
  return [x, seatY(x) + w.sink]
}

export interface Way {
  lane: Seg[]
  /** Where he is at `t` (show time), for what rides on him. */
  at: (t: number) => Pt
}

/** Derek's way through the spa, `begin` to `end` (the seams). */
export function derekWay(begin: number, end: number): Way {
  const path = new Path([-0.5, 0], begin)
  // At the door, still, while Mugatu goes up; then the belt takes him.
  path.rest(SET_OFF)
  const belt = (t: number): Pt => [onBelt(t), 0]
  path.carry(belt, CAB_IN)
  // Inside the steam cabinet, out of sight (its frosted pane shows where), until its far door goes up.
  path.carry(belt, CAB_OUT + 0.06, 40, true)
  path.carry(belt, OFF_BELT)
  // Off the belt's end, down the recliner's back into its hollow, and settled.
  const back = rollTable(seatY, BELT_X1, V_BELT, 1, (x) => x >= HOLLOW_X, 0)
  const kb = back.t[back.t.length - 1] / (DELIVER - OFF_BELT)
  path.carry((t) => {
    const x = tableAt(back, (t - OFF_BELT) * kb)
    return [x, seatY(x)]
  }, DELIVER)
  // The three flings: settled; thrown; the hit; off it onto the chute; back down it into the hollow.
  const landX = [XT - 0.95, XT - 1.05, XT - 0.9]
  let arriveV = back.v * kb
  let arrive = DELIVER
  let dir: 1 | -1 = 1
  CYCLES.forEach((c, k) => {
    const f = FLINGS[k]
    path.carry(settleIn(arrive, arriveV, dir, f.start), f.start, 30)
    path.carry((t) => chairPoint(chairAngle(t), REST), c.fling, 120)
    path.fly(add(DISC.c, HIT_OFF[k]), c.hit)
    path.fly([landX[k], chuteY(landX[k])], c.land)
    const ret = chuteReturn(landX[k], c.land, c.back)
    path.carry(ret.at, c.back)
    arriveV = ret.speed
    arrive = c.back
    dir = -1
  })
  // The fourth: settled, and dead still while Mugatu's hand comes off; on the line he gathers, sharp, and holds; on
  // its off-beat he springs by himself, straight and exact.
  path.carry(settleIn(arrive, arriveV, dir, WITHDRAW + 0.25), WITHDRAW + 0.25, 30)
  path.rest(GATHER3)
  path.carry((t) => [REST[0], REST[1] + sinkAt(t)], GATHER3 + 0.05, 10)
  path.rest(HOP3)
  path.line(add(DISC.c, HIT_OFF[3]), HIT3)
  const x3 = XT - 0.98
  path.fly([x3, chuteY(x3)], LAND3)
  const ret3 = chuteReturn(x3, LAND3, BACK3)
  path.carry(ret3.at, BACK3)
  // The call: settled; three coils on the fill; the launch; dead centre.
  path.carry(settleIn(BACK3, ret3.speed, -1, COILS[0]), COILS[0], 30)
  path.carry(windPos, LAUNCH, 90)
  path.line(DISC.c, HIT4)
  // Thrown up off it as it goes down, over it, and down past it; bounced, dazed, and still.
  path.fly([LAND_F_X, 0], LAND_F)
  path.fly([BOUNCE_X[0], 0], BOUNCE_F)
  path.fly([BOUNCE_X[1], 0], BOUNCE_F2)
  const v0 = (BOUNCE_X[1] - BOUNCE_X[0]) / (BOUNCE_F2 - BOUNCE_F)
  const d = REST_F_X - BOUNCE_X[1]
  const stop = BOUNCE_F2 + (2 * d) / v0
  path.segs.push({ from: [BOUNCE_X[1], 0], to: [REST_F_X, 0], dur: stop - BOUNCE_F2, ramp: [v0, 0] })
  path.at = [REST_F_X, 0]
  path.t = stop
  // A dazed wobble, dying away.
  path.carry((t) => [REST_F_X + 0.03 * Math.exp(-(t - stop) / 0.5) * Math.sin((t - stop) * 7) * sm(t, stop, stop + 0.15), 0], BLAST, 30)
  // Blown out through the doors.
  path.carry((t) => [onExit(t), 0], end, 30)
  const lane = path.segs
  return {
    lane,
    at: (t: number): Pt => {
      let u = t - begin
      if (u <= 0) return lane[0].from
      for (const s of lane) {
        if (u <= s.dur) {
          const raw = s.dur <= 0 ? 1 : u / s.dur
          const q = s.ramp ? (raw * (2 * s.ramp[0] + (s.ramp[1] - s.ramp[0]) * raw)) / (s.ramp[0] + s.ramp[1]) : raw
          const lift = s.arc ? s.arc * 4 * q * (1 - q) : 0
          return [s.from[0] + (s.to[0] - s.from[0]) * q, s.from[1] + (s.to[1] - s.from[1]) * q - lift]
        }
        u -= s.dur
      }
      return lane[lane.length - 1].to
    },
  }
}

/** The way for the show's own slot: what the drawings read. */
export const WAY = derekWay(T0, T1)

/* ------------------------------------------------------------------ Mugatu */

/** Mugatu's lift, beside the door: its car comes up from the floor and out of the top of the frame. */
export const LIFT_UP = 3.9
export const liftRise = (t: number): number => LIFT_UP * sm(t, LIFT_GO, LIFT_GO + 1.9)
/** His console on the balcony over the recliner: where he stands, where he stands to press the lever, where he backs off to. */
export const BALCONY = { x0: P[0] - 2.55, x1: P[0] + 0.35, top: -3.0 }
export const M_REST: Pt = [P[0] - 1.02, BALCONY.top - R]
export const LEVER: Pt = [P[0] - 0.36, BALCONY.top]
const M_LEVER: Pt = [LEVER[0] - 0.3, M_REST[1]]
const M_BACK: Pt = [M_REST[0] - 0.62, M_REST[1]]
/** When he is at the console, having gone up out of sight. */
export const M_AT_CONSOLE = 37.0
export const M_GONE = LIFT_GO + 1.95

/** Mugatu at `t`, or null while he is out of sight between the lift and the console. */
export function mugatuAt(t: number): Pt | null {
  if (t < LIFT_GO) {
    // The nod: a little dip toward the line, and up.
    const u = t - NOD
    const nod = u > -0.1 && u < 0.45 ? Math.sin((Math.PI * (u + 0.1)) / 0.55) : 0
    return [LIFT_X + 0.03 * nod, 0.035 * nod]
  }
  if (t < M_GONE) return [LIFT_X, -liftRise(t)]
  if (t < M_AT_CONSOLE) return null
  let x = M_REST[0]
  let y = M_REST[1]
  // To the lever, pressing it, and back, three times.
  for (const c of CYCLES) {
    const go = sm(t, c.near - 0.12, c.lever - 0.06)
    const home = sm(t, c.fling + 0.25, c.fling + 0.95)
    x += (M_LEVER[0] - M_REST[0]) * go * (1 - home)
    // Leaning into it: he pushes on through as it goes over, and eases back.
    const push = sm(t, c.lever - 0.1, c.lever) * (1 - sm(t, c.lever + 0.1, c.fling + 0.4))
    x += 0.14 * push
  }
  // The fourth: he comes to the lever early; on the beat he would have pushed it he takes his hand off it and holds
  // it away, up, dead still, for a beat; Derek goes by himself; then Mugatu's look, and he settles, still back.
  const go3 = sm(t, CYCLES[2].back + 0.12, WITHDRAW - 0.12)
  x += (M_LEVER[0] - M_REST[0]) * go3
  const off3 = sm(t, WITHDRAW, WITHDRAW + 0.16)
  x += (M_BACK[0] - M_LEVER[0]) * off3
  y -= 0.08 * off3 * (1 - sm(t, LAND3 + 0.4, LAND3 + 1.2))
  // Stays back through the call; then the glee: a glide this way and that, a little hop on each, and home.
  const back = sm(t, GLEE[2] + 0.1, GLEE[2] + 0.9)
  x += (M_REST[0] - M_BACK[0]) * back
  const glee = [0.38, -0.22, 0.24]
  GLEE.forEach((g, i) => {
    const prev = i === 0 ? 0 : glee[i - 1]
    x += (glee[i] - prev) * sm(t, g - 0.22, g) * (1 - sm(t, GLEE[2] + 0.1, GLEE[2] + 0.9))
    const hop = t > g - 0.2 && t < g + 0.3 ? Math.sin((Math.PI * (t - g + 0.2)) / 0.5) : 0
    y -= 0.2 * hop
  })
  return [x, y]
}

/** How far down Mugatu's lever is (0 up, 1 home) at `t`. */
export function leverAt(t: number): number {
  let v = 0
  for (const c of CYCLES) {
    if (t < c.lever - 0.05) continue
    const down = sm(t, c.lever - 0.05, c.lever)
    const up = sm(t, c.fling + 0.3, c.fling + 1.0)
    v = Math.max(v, down * (1 - up))
  }
  return v
}

/** The horn's song at `t` (0..1): a breath on every beat from the chair's first catch, a swell on each line. */
export function hornAt(t: number): number {
  if (t < DELIVER - 0.2) return 0
  const on = sm(t, DELIVER - 0.2, DELIVER + 0.3)
  const k = Math.round((t - 0.3603) / 0.519908)
  const b = beat(k)
  const u = t - b
  const breath = u >= 0 ? Math.exp(-u / 0.16) : Math.exp(u / 0.03)
  let swell = 0
  for (const s of [...CYCLES.map((c) => c.fling), GATHER3, LAUNCH]) {
    const q = t - s
    if (q > -0.3 && q < 1.6) swell = Math.max(swell, q < 0 ? 1 + q / 0.3 : Math.exp(-q / 0.6))
  }
  // Quieter once he is out past the target; gone by the time he is out of the room.
  const off = 1 - sm(t, BLAST, BLAST + 2)
  return on * off * Math.min(1, 0.35 + 0.35 * breath + 0.65 * swell)
}

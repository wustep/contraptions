import { mixHex, type Pt } from '../../../../../parts'
import { DOORS, inPhrase } from '../music'
import { REGATTA, REGATTA_THEME } from '../worlds'

/**
 * BALLOONS's clock: where every balloon of the regatta is, what its burner is doing, and where the spark is, as
 * functions of show time. The drawing (`balloons-draw.ts`) and the lane (`balloons.ts`) both read these, so the spark
 * never slides off the burner that carries it.
 *
 * The regatta's cells: the part is laid at [0, 0], so its frame is the world's. y is down; the meadow is at `GROUND`.
 *
 *   B0  coral stripes, tethered upright on the meadow. Its burner's blast is the door the spark comes out of.
 *   B1  saffron, lying on the meadow with the fan breathing into it. The spark lights its burner (turned on its
 *       gimbal into the mouth), the envelope stands up with the spark riding the burner round, and it lifts off.
 *   B2  teal, hovering above B1. B3 ivory, hovering above B2. B4 indigo, the highest, above B3.
 *
 * Every balloon from B1 on is the same machine, faster each time: the spark lands on its pilot arm (the burner roars,
 * the envelope lights up like a lantern), the next blast takes it up the jet into the envelope, it rides the hot air
 * up inside (a glow moving up through the silk), and the parachute vent at the crown pops it out into the sky, up
 * to the next balloon's pilot. At the top it stays on B4's pilot for the wide shot, and B4's great blast on the
 * fortissimo sucks it up into the flame: the third door.
 */

/* ------------------------------------------------------------------ the strikes */

/** Every strike, show seconds: quarters and eighths of the tracked beat, each on a measured note. */
export const AT = {
  /** The spark lands on B1's pilot arm: its burner roars sideways into the lying envelope's mouth. */
  land1: inPhrase(9, 8),
  /** The envelope swells and heaves off the grass. */
  heave1: inPhrase(9, 10),
  /** It swings up. */
  heave2: inPhrase(9, 12),
  /** The crown comes over the top: B1 stands upright. */
  upright: inPhrase(9, 18),
  /** B1's first blast straight up: the silk goes taut and glowing. */
  blast1: inPhrase(9, 20),
  /** The big blast: the spark up the jet into B1; the tether pin pops; B1 lifts off the meadow. */
  whoosh1: inPhrase(9, 24),
  /** B1's parachute vent pops: the spark out of the crown. */
  pop1: inPhrase(10, 0),
  land2: inPhrase(10, 4),
  bags2: inPhrase(10, 6),
  whoosh2: inPhrase(10, 8),
  flare2: inPhrase(10, 12),
  pop2: inPhrase(10, 14),
  land3: inPhrase(10, 18),
  bags3: inPhrase(10, 20),
  whoosh3: inPhrase(10, 22),
  flare3: inPhrase(10, 26),
  pop3: inPhrase(10, 30),
  /** The top balloon: the spark lands on B4's pilot, and the regatta rises. */
  land4: inPhrase(11, 6),
  /** B4's ballast goes, and the far balloons on the left roar. */
  bags4: inPhrase(11, 10),
  /** The far balloons on the right roar. */
  groupB: inPhrase(11, 14),
  /** Every burner in the regatta at once: the glow. */
  glow: inPhrase(11, 18),
  /** The fortissimo: B4's great blast, held into the door. */
  blast4: inPhrase(11, 26),
} as const

export const T0 = DOORS.regatta
export const T1 = DOORS.railway
/** The return: a streak up and left through B4's flame on the roll. */
export const BACK = [DOORS.back[0], DOORS.back[1]] as const

/* ------------------------------------------------------------------ the light */

/**
 * How far the sun has gone down: none on the meadow, and through the climb the last of it goes, so that by the wide
 * shot it is dusk and every lit envelope is a lantern. After this part's slot it stays there (the way home is dusk too).
 */
export const dusk = (t: number): number => 0.62 * ss(t, AT.pop1, AT.glow + 1.2)
/** The colour the dusk takes things toward. */
export const DUSK = mixHex(REGATTA.indigo, REGATTA_THEME.ink, 0.45)

/* ------------------------------------------------------------------ small maths */

export const clamp01 = (u: number): number => (u < 0 ? 0 : u > 1 ? 1 : u)
/** Smoothstep of `t` from `a` to `b`. */
export const ss = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** Smoother: zero velocity and acceleration at both ends. */
export const ss5 = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * u * (u * (6 * u - 15) + 10)
}
export const rot = (p: Pt, a: number): Pt => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]
}
export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
export const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k]

/** A cubic Hermite from `p0` (velocity `v0`) to `p1` (velocity `v1`) over `T` seconds, at `u` of the way. */
export function hermite(p0: Pt, v0: Pt, p1: Pt, v1: Pt, T: number, u: number): Pt {
  const s = clamp01(u)
  const s2 = s * s
  const s3 = s2 * s
  const h00 = 2 * s3 - 3 * s2 + 1
  const h10 = s3 - 2 * s2 + s
  const h01 = -2 * s3 + 3 * s2
  const h11 = s3 - s2
  return [
    h00 * p0[0] + h10 * T * v0[0] + h01 * p1[0] + h11 * T * v1[0],
    h00 * p0[1] + h10 * T * v0[1] + h01 * p1[1] + h11 * T * v1[1],
  ]
}

/** Velocity of a function of time, by a small central difference. */
export const velocity = (f: (t: number) => Pt, t: number, h = 0.004): Pt => {
  const a = f(t - h)
  const b = f(t + h)
  return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)]
}

/* ------------------------------------------------------------------ the anatomy */

/** The meadow's surface. */
export const GROUND = 3.05
/**
 * A balloon, in its own cells: the origin is its burner's nozzle, up is -y. The basket stands under the burner, the
 * envelope over it. Every hero balloon shares these; only the envelope's size and silks differ.
 */
export const ANAT = {
  /** Where the spark sits on the pilot arm (its centre), left of the burner, outside the load frame's corner. */
  seat: [-0.92, 0.08] as Pt,
  /** The load frame's bar, and its half-width. */
  frameY: 0.55,
  frameW: 0.76,
  /** The basket: its rim and floor, and half-widths at each. */
  rimY: 1.05,
  floorY: 2.35,
  rimW: 0.76,
  floorW: 0.64,
  /** The envelope's mouth (its ring), and the skirt's hem below it. */
  mouthY: -2.6,
  mouthR: 1.0,
  hemY: -2.15,
  hemR: 1.1,
}

export interface Silk {
  /** The two gore colours, alternating. */
  a: string
  b: string
  /** A band round the belly, if any. */
  band?: string
  /** The parachute vent's colour. */
  cap: string
}

export interface Balloon {
  key: string
  /** Mouth to crown. */
  H: number
  /** The envelope's widest radius (its dome's). */
  Rs: number
  silk: Silk
}

/* ------------------------------------------------------------------ the common climb */

/**
 * How fast the regatta climbs once it is lit (cells a second): a slow rise, then the mass ascension of phrase 11 (the
 * whole regatta going up together), then, long after this part has let go of the spark, a drift.
 */
function climbSpeed(t: number): number {
  const up = ss(t, AT.land4, AT.glow)
  const ease = ss(t, T1 + 0.6, T1 + 4.5)
  return 0.3 + 1.15 * up * (1 - ease) + 0.12 * ease
}
/** The climb's integral from a fixed zero, by a fine table (it is only a few seconds long where it changes). */
const CLIMB_STEP = 0.02
const CLIMB_FROM = 80
const CLIMB_TO = 160
const climbTable: number[] = (() => {
  const n = Math.ceil((CLIMB_TO - CLIMB_FROM) / CLIMB_STEP)
  const out = [0]
  for (let i = 0; i < n; i++) {
    const a = CLIMB_FROM + i * CLIMB_STEP
    out.push(out[i] + ((climbSpeed(a) + climbSpeed(a + CLIMB_STEP)) / 2) * CLIMB_STEP)
  }
  return out
})()
/** How far the regatta's climb has gone by `t`, from a fixed zero: what the far balloons rise by. */
export function climbInt(t: number): number {
  const u = (Math.max(CLIMB_FROM, Math.min(CLIMB_TO, t)) - CLIMB_FROM) / CLIMB_STEP
  const i = Math.min(climbTable.length - 2, Math.floor(u))
  return climbTable[i] + (climbTable[i + 1] - climbTable[i]) * (u - i)
}
/** How far a balloon set going at `a` has climbed by `t`, eased in over its first second so it never lurches. */
export function climbed(t: number, a: number): number {
  if (t <= a) return 0
  return (climbInt(t) - climbInt(a)) * ss(t, a, a + 1.2)
}

/* ------------------------------------------------------------------ the balloons */

export const REG = {
  coral: '#E4655A',
  saffron: '#F2B43E',
  teal: '#3F9C96',
  ivory: '#F8EEDC',
  indigo: '#3E4C8C',
}

export const B: Record<'b0' | 'b1' | 'b2' | 'b3' | 'b4', Balloon> = {
  b0: { key: 'b0', H: 10, Rs: 4.1, silk: { a: REG.coral, b: REG.ivory, cap: REG.coral } },
  b1: { key: 'b1', H: 11, Rs: 4.6, silk: { a: REG.saffron, b: REG.saffron, band: REG.coral, cap: REG.coral } },
  b2: { key: 'b2', H: 10.5, Rs: 4.4, silk: { a: REG.teal, b: REG.ivory, cap: REG.indigo } },
  b3: { key: 'b3', H: 11, Rs: 4.6, silk: { a: REG.ivory, b: REG.ivory, band: REG.indigo, cap: REG.saffron } },
  b4: { key: 'b4', H: 12, Rs: 5.0, silk: { a: REG.indigo, b: REG.saffron, cap: REG.coral } },
}

/** Where a balloon's crown is, over its nozzle: the vent's top. */
export const crownOf = (b: Balloon): number => ANAT.mouthY - b.H

/** B0: tethered on the meadow, still. Its burner is the door. */
export const N0: Pt = [-0.5, GROUND - ANAT.floorY]

/* B1 ---------------------------------------------------------------- */

const N1_BASE: Pt = [7.2, GROUND - ANAT.floorY]
/** B1's lift off the meadow, and when that surge has spent itself. */
const LIFT1 = { d: 5.0, end: AT.whoosh1 + 2.9 }

/** B1's axis from upright, radians: a quarter turn lying on the grass (crown to the east), then stood up, overshooting a little. */
export function theta1(t: number): number {
  const Q = Math.PI / 2
  if (t <= AT.heave1) return Q
  // The heave off the grass, then the swing up: slow to start, arriving upright with a little way still on it.
  const heave = 0.13 * ss(t, AT.heave1, AT.heave1 + 0.42)
  const T = AT.upright - AT.heave2
  let swing = 0
  if (t >= AT.heave2) {
    const u = Math.min(1, (t - AT.heave2) / T)
    // A Hermite from 0 (at rest) to 1 (arriving at half the mean speed).
    const u2 = u * u
    const u3 = u2 * u
    swing = 0.87 * ((-2 * u3 + 3 * u2) + 0.5 * (u3 - u2))
  }
  let a = Q * (1 - heave - swing)
  if (t > AT.upright) {
    // Past upright: the way still on it rocks it over a few degrees and back, long and damped.
    const v = (0.87 * 0.5 * Q) / T
    const w = 5.2
    const tau = t - AT.upright
    a = -(v / w) * Math.sin(w * tau) * Math.exp(-tau / 0.42)
  }
  return a
}

/** B1's nozzle. It stands on the meadow until the tether goes, then climbs. */
export function n1(t: number): Pt {
  const lift = LIFT1.d * ss5(t, AT.whoosh1, LIFT1.end) + climbed(t, LIFT1.end)
  const drift = 0.35 * ss(t, AT.whoosh1, LIFT1.end) + 0.1 * climbed(t, LIFT1.end)
  return [N1_BASE[0] + drift, N1_BASE[1] - lift]
}

/** How full B1's envelope is: breathing with the fan on the grass, then filling hot once its burner is lit. */
export function fill1(t: number): number {
  const cold = 0.6 + 0.035 * Math.sin(((t - T0) * 2 * Math.PI) / 1.9)
  if (t < AT.land1) return cold
  const hot = 1 - (1 - cold) * Math.exp(-(t - AT.land1) / 0.5)
  // Each heave gulps a little more.
  return Math.min(1.02, hot + 0.03 * Math.exp(-Math.max(0, t - AT.heave1) / 0.3) * (t > AT.heave1 ? 1 : 0))
}

/* B2..B4: hovering, one over the other's crown, each set going by its own landing ------------ */

/** A hover's slow bob, so nothing up there is parked. */
const bob = (t: number, phase: number): number => 0.09 * Math.sin(((t - phase) * 2 * Math.PI) / 4.6)

interface Hover {
  base: Pt
  phase: number
  /** When the spark lands (the burner roars and it starts to climb), and the climb's first surge. */
  lit: number
  surge: { d: number; end: number }
}

function hoverAt(h: Hover, t: number): Pt {
  const settle = ss(t, h.lit, h.lit + 0.8)
  const lift = h.surge.d * ss5(t, h.lit + 0.1, h.surge.end) + climbed(t, h.surge.end)
  const drift = 0.3 * ss(t, h.lit, h.surge.end) + 0.1 * climbed(t, h.surge.end)
  // The bob dies away once it is lit and climbing.
  return [h.base[0] + drift, h.base[1] + bob(t, h.phase) * (1 - settle) - lift]
}

/**
 * Each hovering balloon waits over the crown of the one below: its basket's floor a cell above that crown, where the
 * one below will have climbed to by the time the spark comes up out of it, and a little east, so the spark rises past
 * the basket to the pilot arm.
 */
const OFFSET_X = 3.4
const CLEAR = 1.0
function over(below: (t: number) => Pt, belowB: Balloon, when: number, lit: number, surge: { d: number; end: number }, phase: number): Hover {
  const b = below(when)
  const crown = b[1] + crownOf(belowB)
  return { base: [b[0] + OFFSET_X, crown - CLEAR - ANAT.floorY], phase, lit, surge }
}

const H2 = over(n1, B.b1, LIFT1.end + 0.2, AT.land2, { d: 5.2, end: AT.land2 + 3.2 }, 0.7)
export const n2 = (t: number): Pt => hoverAt(H2, t)
const H3 = over(n2, B.b2, H2.surge.end + 0.2, AT.land3, { d: 5.2, end: AT.land3 + 3.2 }, 2.1)
export const n3 = (t: number): Pt => hoverAt(H3, t)
const H4 = over(n3, B.b3, AT.land4 + 0.35, AT.land4, { d: 3.2, end: AT.land4 + 2.8 }, 3.4)
export const n4 = (t: number): Pt => hoverAt(H4, t)

/* ------------------------------------------------------------------ burners */

/**
 * A blast of a burner: it comes on hard (40 ms), holds, and dies away (a quarter second). Intensity 1 is a full roar;
 * more is the fortissimo's.
 */
export interface Blast {
  on: number
  off: number
  i?: number
}
export function roarOf(blasts: readonly Blast[], t: number): number {
  let v = 0
  for (const b of blasts) {
    if (t < b.on) continue
    const up = clamp01((t - b.on) / 0.04)
    const hit = 1 + 0.25 * Math.exp(-(t - b.on) / 0.12)
    const down = t > b.off ? Math.exp(-(t - b.off) / 0.14) : 1
    v = Math.max(v, (b.i ?? 1) * up * hit * down)
  }
  return v < 0.004 ? 0 : v
}

export const BLASTS: Record<'b0' | 'b1' | 'b2' | 'b3' | 'b4', Blast[]> = {
  b0: [{ on: T0 - 0.6, off: T0 + 0.42, i: 1.25 }],
  b1: [
    { on: AT.land1, off: AT.heave2 + 0.9 },
    { on: AT.heave2, off: AT.upright - 0.2, i: 1.1 },
    { on: AT.blast1, off: AT.blast1 + 0.42 },
    { on: AT.whoosh1, off: AT.whoosh1 + 1.1, i: 1.15 },
    { on: AT.glow, off: AT.glow + 0.7 },
  ],
  b2: [
    { on: AT.land2, off: AT.land2 + 0.34 },
    { on: AT.whoosh2, off: AT.whoosh2 + 0.5, i: 1.1 },
    { on: AT.flare2, off: AT.flare2 + 0.36, i: 1.2 },
    { on: AT.glow, off: AT.glow + 0.7 },
  ],
  b3: [
    { on: AT.land3, off: AT.land3 + 0.34 },
    { on: AT.whoosh3, off: AT.whoosh3 + 0.4, i: 1.1 },
    { on: AT.flare3, off: AT.flare3 + 0.5, i: 1.3 },
    { on: AT.glow, off: AT.glow + 0.7 },
  ],
  b4: [
    { on: AT.land4, off: AT.land4 + 0.5 },
    { on: AT.glow, off: AT.glow + 0.7, i: 1.1 },
    { on: AT.blast4, off: T1 + 0.8, i: 1.55 },
    // Alight for the return, when the spark streaks back up through this flame on the roll.
    { on: BACK[0] - 0.45, off: BACK[1] + 0.5, i: 1.3 },
  ],
}

/**
 * The envelope's light from inside: the burner's roar, carried on for a while as the air in it stays hot. A lantern
 * that brightens on every blast and dims slowly between.
 */
export function warmth(blasts: readonly Blast[], t: number, lit: number): number {
  if (t < lit - 0.6) return 0
  let v = 0
  for (const b of blasts) {
    if (t < b.on) continue
    const on = clamp01((t - b.on) / 0.12)
    const after = t > b.off ? Math.exp(-(t - b.off) / 1.4) : 1
    v = Math.max(v, Math.min(1.2, b.i ?? 1) * on * after)
  }
  // Once lit it never goes quite cold again in this part.
  return Math.max(v, t > lit ? 0.18 * ss(t, lit, lit + 1) : 0)
}

/** How much an envelope swells out on each blast, as the hot air hits it: a gulp, then long and damped. */
export function swellOf(blasts: readonly Blast[], t: number): number {
  let v = 0
  for (const b of blasts) {
    const u = t - b.on
    if (u < 0 || u > 2.5) continue
    v += 0.035 * Math.min(1.3, b.i ?? 1) * (1 - Math.exp(-u / 0.06)) * Math.exp(-u / 0.55)
  }
  return v
}

/** When each balloon's pilot is lit (the spark's first touch; B0 was lit before the door). */
export const LIT = { b0: -Infinity, b1: AT.land1, b2: AT.land2, b3: AT.land3, b4: AT.land4 }

/** The parachute vent's lift, cells: it pops as the spark comes up under it, and settles back. */
export function ventOf(pop: number, t: number): number {
  if (t < pop - 0.05) return 0
  const up = ss(t, pop - 0.05, pop + 0.02)
  const down = 1 - ss(t, pop + 0.25, pop + 1.6)
  return 0.42 * up * down + 0.04 * Math.sin((t - pop) * 18) * Math.exp(-(t - pop) / 0.5) * up
}
export const POPS = { b1: AT.pop1, b2: AT.pop2, b3: AT.pop3 }

/** Sandbags: when each balloon lets its ballast go. */
export const BAGS = { b2: AT.bags2, b3: AT.bags3, b4: AT.bags4 }
/** The quick-release on B1's tether. */
export const TETHER1 = AT.whoosh1

/* ------------------------------------------------------------------ the spark */

/** Where the seat is, in the world, for a balloon at `n` turned `a` (radians). */
export const seatAt = (n: Pt, a = 0): Pt => add(n, rot(ANAT.seat, a))

/** The spark sitting on B1's pilot arm, riding the burner round as the envelope stands up and the balloon lifts. */
const seat1 = (t: number): Pt => seatAt(n1(t), theta1(t))

/**
 * Up the jet and through the envelope, in the balloon's own cells: from the seat into the flame, up through the
 * skirt and the mouth, and up inside on the hot air (a little sway), to the crown, moving up at `vTop` as it gets
 * there. `u` is seconds since the whoosh, `T` the whole ride.
 */
function inside(b: Balloon, u: number, T: number, vTop: number): Pt {
  const a = 0.2
  if (u <= a) {
    return hermite(ANAT.seat, [0, 0], [0, -0.62], [0, -5.2], a, u / a)
  }
  const T2 = T - a
  const s = (u - a) / T2
  const top = crownOf(b)
  const y = hermite([0, -0.62], [0, -5.2], [0, top], [0, -vTop], T2, s)[1]
  const x = 0.32 * Math.sin(Math.PI * s) * Math.sin(Math.PI * s) * Math.sin(2.2 * Math.PI * s + 0.4)
  return [x, y]
}

/** The ride up through a balloon, in the world, and whether it is out of sight (above the skirt's hem). */
function ride(n: (t: number) => Pt, b: Balloon, from: number, to: number, vTop: number, t: number): { p: Pt; hidden: boolean } {
  const local = inside(b, t - from, to - from, vTop)
  return { p: add(n(t), local), hidden: local[1] < ANAT.hemY + 0.05 }
}

/** A float from one balloon's vent up to the next one's seat, arriving slowed, on the landing. */
function float(from: number, p0: Pt, v0: Pt, to: number, seat: (t: number) => Pt, t: number): Pt {
  const p1 = seat(to)
  const v1 = add(velocity(seat, to), [0.55, 0.45])
  return hermite(p0, v0, p1, v1, to - from, (t - from) / (to - from))
}

const V_TOP = 6.2
const seat2 = (t: number): Pt => seatAt(n2(t))
const seat3 = (t: number): Pt => seatAt(n3(t))
const seat4 = (t: number): Pt => seatAt(n4(t))
const ride1 = (t: number) => ride(n1, B.b1, AT.whoosh1, AT.pop1, V_TOP, t)
const ride2 = (t: number) => ride(n2, B.b2, AT.whoosh2, AT.pop2, V_TOP, t)
const ride3 = (t: number) => ride(n3, B.b3, AT.whoosh3, AT.pop3, V_TOP, t)
const exitVel = (r: (t: number) => { p: Pt }, t: number): Pt => velocity((s) => r(Math.min(s, t)).p, t - 0.004, 0.004)

/** Where the spark leaves: in B4's jet, rising, on the door. */
export const EXIT_V: Pt = [0.3, -3.4]
const SUCK = T1 - 0.62
export const EXIT: Pt = add(n4(T1), [0.06, -1.15])

/** Where the spark comes in: B0's jet, rising. */
export const ENTRY: Pt = [-0.5, 0]
export const ENTRY_V: Pt = [0.3, -3.0]

export interface SparkHere {
  p: Pt
  hidden: boolean
}

/** The spark, show time to world cells: every stage of its climb through the regatta. */
export function sparkAt(t: number): SparkHere {
  if (t < AT.land1) {
    // Out of B0's jet, caught by the breeze, and let down onto B1's pilot arm.
    const p1 = seat1(AT.land1)
    return { p: hermite(ENTRY, ENTRY_V, p1, [0.9, 0.55], AT.land1 - T0, (t - T0) / (AT.land1 - T0)), hidden: false }
  }
  if (t < AT.whoosh1) return { p: seat1(t), hidden: false }
  if (t < AT.pop1) return ride1(t)
  if (t < AT.land2) return { p: float(AT.pop1, ride1(AT.pop1).p, exitVel(ride1, AT.pop1), AT.land2, seat2, t), hidden: false }
  if (t < AT.whoosh2) return { p: seat2(t), hidden: false }
  if (t < AT.pop2) return ride2(t)
  if (t < AT.land3) return { p: float(AT.pop2, ride2(AT.pop2).p, exitVel(ride2, AT.pop2), AT.land3, seat3, t), hidden: false }
  if (t < AT.whoosh3) return { p: seat3(t), hidden: false }
  if (t < AT.pop3) return ride3(t)
  if (t < AT.land4) return { p: float(AT.pop3, ride3(AT.pop3).p, exitVel(ride3, AT.pop3), AT.land4, seat4, t), hidden: false }
  if (t < SUCK) return { p: seat4(t), hidden: false }
  // Drawn off the pilot arm into the great blast, and up it.
  const u = (Math.min(t, T1) - SUCK) / (T1 - SUCK)
  return { p: hermite(seat4(SUCK), velocity(seat4, SUCK), EXIT, EXIT_V, T1 - SUCK, u), hidden: false }
}

/**
 * The return (148.330 to 148.404): a lit burner the spark streaks up and left through. B4's, where it went in, its
 * flame alight then (`BLASTS.b4`). World cells: the middle of its jet.
 */
export const BURNER_POINT: Pt = add(n4(BACK[0]), [0.02, -0.75])

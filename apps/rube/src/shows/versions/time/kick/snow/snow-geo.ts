import { R, type Pt } from '../../../../../parts'
import { bar, beat, half, SEAM } from '../music'
import { G, G_LOW } from '../physics'
import { DOWN, FISCHER_DOWN, FISCHER_UP, UP } from '../stack'

/**
 * The snow's geometry and its clock (the SNOW builder's): the mountain, the pistes, the fortress, and where Cobb,
 * Ariadne, Fischer, Mal and the guards are at every moment of both parts, in the dream world's own cells (the set
 * draws there; the parts move it into their frames). Nothing here draws.
 *
 * The run is built from its timing: every lip, every landing and the hairpin are where the motion puts them when it
 * reaches them on the beat, so the strikes are on the recording by construction.
 */

export const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
export const ss = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
const TAU = Math.PI * 2

/* ------------------------------------------------------------------ the clock */

/** Every moment of both parts, show seconds, each on the recording. */
export const T = {
  in: SEAM.snow,
  /** Down in the powder on the shoulder under the summit. */
  land: beat(129),
  /** Over the cornice, one at a time: Ariadne on the eighth before the chord, Cobb on it, Fischer on the eighth after. */
  dropA: half(131),
  dropC: bar(33),
  dropF: half(132),
  /** The rock step over the fortress's roof: the big jump. */
  j1: bar(34),
  j1Land: beat(137),
  /** The hairpin at the far end of the face, its apex. */
  h1: half(140),
  /** The crevasse. */
  j2: bar(36),
  j2Land: half(144),
  /** Cobb skids to a stop on the ledge over the gate. */
  stopA: beat(146),
  stopC: half(146),
  /** The gate goes up for Fischer. */
  gate: bar(37),
  /** Mal's shot; Cobb leaps. */
  shot: bar(38),
  cLand3: beat(153),
  aLeap: half(153),
  aLand3: half(154),
  /** The case opens; the floor goes soft under them. */
  case: bar(39),
  sink: half(156),
  /** The camera's cuts: back in close as Fischer lands off the rock step, and off the crevasse; to Mal; back. */
  cutJ1: beat(137) + (half(132) - bar(33)),
  cutJ2: half(144) + (half(132) - bar(33)),
  malCut: beat(150),
  malBack: half(152),
  out: SEAM.limbo,
  /* the vault */
  vIn: SEAM.vault,
  fUp: FISCHER_UP.t,
  fThrough: beat(190),
  cThrough: beat(194),
  paddles: bar(49),
  wheel: half(196),
  door: beat(197),
  doorOpen: half(197),
  pinwheel: beat(198),
  charges: beat(199),
  kick: bar(50),
  vOut: SEAM.lift,
}

/** Ariadne runs the piste this much ahead of Cobb, and Fischer this much behind: an eighth each. */
export const A_SHIFT = T.dropC - T.dropA
export const F_SHIFT = T.dropF - T.dropC

/* ------------------------------------------------------------------ motion */

/** One stretch of someone's motion: where they are from `t0` to `t1`, and how their skis lie (radians), if on them. */
export interface Phase {
  t0: number
  t1: number
  at: (t: number) => Pt
  ski?: (t: number) => number | null
}

export class Motion {
  constructor(readonly phases: Phase[]) {}
  get t0(): number {
    return this.phases[0].t0
  }
  get t1(): number {
    return this.phases[this.phases.length - 1].t1
  }
  private phase(t: number): Phase {
    const ps = this.phases
    if (t <= ps[0].t0) return ps[0]
    for (const p of ps) if (t <= p.t1) return p
    return ps[ps.length - 1]
  }
  at(t: number): Pt {
    const p = this.phase(t)
    return p.at(Math.max(p.t0, Math.min(p.t1, t)))
  }
  /** The skis' tilt at `t`, or null when he is off them. */
  ski(t: number): number | null {
    const p = this.phase(t)
    return p.ski ? p.ski(Math.max(p.t0, Math.min(p.t1, t))) : null
  }
  vel(t: number, h = 0.004): Pt {
    const a = this.at(t - h)
    const b = this.at(t + h)
    return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)]
  }
}

/** A motion moved in time: `m` as it is `shift` seconds later (so an earlier start by `shift`). */
const shifted = (m: Motion, shift: number, from: number, to: number): Phase => ({
  t0: from,
  t1: to,
  at: (t) => m.at(t + shift),
  ski: (t) => m.ski(t + shift),
})

/** A polyline with its lengths: a piste, a branch, a floor. */
export class Path {
  readonly cum: number[] = [0]
  readonly len: number
  constructor(readonly pts: Pt[]) {
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    this.len = this.cum[this.cum.length - 1]
  }
  private seg(s: number): number {
    const c = this.cum
    let lo = 0
    let hi = c.length - 2
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (c[mid] <= s) lo = mid
      else hi = mid - 1
    }
    return lo
  }
  at(s: number): Pt {
    const v = Math.max(0, Math.min(this.len, s))
    const i = this.seg(v)
    const d = this.cum[i + 1] - this.cum[i]
    const u = d > 1e-12 ? (v - this.cum[i]) / d : 0
    const a = this.pts[i]
    const b = this.pts[i + 1]
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
  }
  /** Heading at `s`, radians (y down). */
  heading(s: number): number {
    const v = Math.max(0, Math.min(this.len, s))
    const i = this.seg(v)
    const a = this.pts[i]
    const b = this.pts[i + 1]
    return Math.atan2(b[1] - a[1], b[0] - a[0])
  }
  get end(): Pt {
    return this.pts[this.pts.length - 1]
  }
}

/** Speed knots (seconds from the phase's start, cells a second), linear between: the distance run by `tau`. */
export function run(knots: [number, number][], tau: number): number {
  let s = 0
  for (let i = 1; i < knots.length; i++) {
    const [ta, va] = knots[i - 1]
    const [tb, vb] = knots[i]
    if (tau <= ta) break
    const u = Math.min(tau, tb) - ta
    const a = (vb - va) / Math.max(1e-9, tb - ta)
    s += va * u + 0.5 * a * u * u
    if (tau <= tb) return s
  }
  const [tl, vl] = knots[knots.length - 1]
  if (tau > tl) s += vl * (tau - tl)
  return s
}
/** The one knot speed (index `i`) that makes the knots run `len` cells in all. */
export function solveKnot(knots: [number, number][], i: number, len: number): [number, number][] {
  const k = knots.map((q) => [...q] as [number, number])
  const at = (v: number) => {
    k[i][1] = v
    return run(k, k[k.length - 1][0])
  }
  const a0 = at(0)
  const a1 = at(1)
  k[i][1] = (len - a0) / (a1 - a0)
  return k
}

/** A cubic from (0, s0 moving v0) to (T, s1 moving v1): a start or a stop that eases. */
export const hermite = (s0: number, v0: number, s1: number, v1: number, T: number) => (tau: number): number => {
  const u = clamp01(tau / T)
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * s0 + (u3 - 2 * u2 + u) * T * v0 + (-2 * u3 + 3 * u2) * s1 + (u3 - u2) * T * v1
}

/** A phase along a path, from distance `s0`, the distance run given by `s(tau)`; skis along the path. */
function onPath(path: Path, t0: number, t1: number, s: (tau: number) => number, s0 = 0): Phase {
  return { t0, t1, at: (t) => path.at(s0 + s(t - t0)), ski: (t) => path.heading(s0 + s(t - t0)) }
}

/** A ballistic flight from `p` moving `v` under `g`, the skis turning from `a0` to `a1` as it goes. */
function flight(p: Pt, v: Pt, t0: number, t1: number, g = G, a0?: number, a1?: number): Phase {
  return {
    t0,
    t1,
    at: (t) => {
      const u = t - t0
      return [p[0] + v[0] * u, p[1] + v[1] * u + 0.5 * g * u * u]
    },
    ski: a0 === undefined ? undefined : (t) => lerpAngle(a0, a1 ?? a0, ss((t - t0) / (t1 - t0))),
  }
}
const flightEnd = (p: Pt, v: Pt, T: number, g = G): { p: Pt; v: Pt } => ({ p: [p[0] + v[0] * T, p[1] + v[1] * T + 0.5 * g * T * T], v: [v[0], v[1] + g * T] })
const still = (p: Pt, t0: number, t1: number, ski: number | null = 0): Phase => ({ t0, t1, at: () => p, ski: ski === null ? undefined : () => ski })

/** The shorter way round from one heading to another. */
export function lerpAngle(a: number, b: number, u: number): number {
  let d = (b - a) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return a + d * u
}
/** A heading as seen by skis: a ski has two ends, so a heading left is the same line as one right. */
export const skiLine = (h: number): number => {
  let a = h
  while (a > Math.PI / 2) a -= Math.PI
  while (a < -Math.PI / 2) a += Math.PI
  return a
}

const dir = (h: number): Pt => [Math.cos(h), Math.sin(h)]
const along = (p: Pt, h: number, d: number): Pt => [p[0] + Math.cos(h) * d, p[1] + Math.sin(h) * d]
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1]

/* ------------------------------------------------------------------ the run: built from Cobb's timing */

/** Cobb comes out of the dark falling at 5 c/s (`DOWN.snow`), softly (a dream's fall). */
const FALL_G = G_LOW
const fallY = (y0: number, t: number) => y0 + DOWN.snow.v[1] * (t - T.in) + 0.5 * FALL_G * (t - T.in) ** 2
function fallTime(y0: number, y1: number): number {
  const a = 0.5 * FALL_G
  const b = DOWN.snow.v[1]
  const c = y0 - y1
  return T.in + (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)
}
const C_IN: Pt = DOWN.snow.at
const A_IN: Pt = [C_IN[0] + DOWN.snow.ariadne![0], C_IN[1] + DOWN.snow.ariadne![1]]
const F_IN: Pt = [C_IN[0] + DOWN.snow.fischer![0], C_IN[1] + DOWN.snow.fischer![1]]

/** The shoulder under the summit where they land: flat, its cornice lip on the left. */
const Y_REST = fallY(C_IN[1], T.land)
export const SHOULDER = { y: Y_REST + R, lip: 8.3, right: 12.4 }
const V_LIP = 1.2
/** Over the cornice: a drop onto the face below. */
const DROP_T = T.dropF - T.dropC
const drop = flightEnd([SHOULDER.lip, Y_REST], [-V_LIP, 0], DROP_T)

/** The face's first traverse, left across the mountain over the fortress's roof, to the rock step's lip. */
export const J1_LIP: Pt = [-4.6, 47.5]
const T1A = new Path([drop.p, J1_LIP])
const t1aH = T1A.heading(0)
const t1aV0 = dot(drop.v, dir(t1aH))
const t1aV1 = (2 * T1A.len) / (T.j1 - T.dropF) - t1aV0
/** The kicker at the lip throws them up this much off level. */
const J1_ANGLE = (28 * Math.PI) / 180
const j1V: Pt = [-t1aV1 * Math.cos(J1_ANGLE), -t1aV1 * Math.sin(J1_ANGLE)]
const j1 = flightEnd(J1_LIP, j1V, T.j1Land - T.j1)

/** The long run on along the face, fast, and the hard carve into the hairpin. */
const T1B_SLOPE = 0.035
const T1B_LEN = 15
const t1bH = Math.atan2(T1B_SLOPE, -1)
const T1B = new Path([j1.p, along(j1.p, t1bH, T1B_LEN)])
const t1bV0 = dot(j1.v, dir(t1bH))
const V_HAIR = 2.9
const V_HAIR_OUT = 2.5
/** The hairpin: a turn down and back of this radius, from heading left to heading right and down. */
const H_R = 0.72
const T2_SLOPE = 0.1
const t2H = Math.atan2(T2_SLOPE, 1)
function hairpin(p: Pt, h0: number, h1: number, r: number): { path: Path; turn: number } {
  // Turning from heading left (h0 about pi) down and round to heading right (h1 about 0): the heading falls.
  let turn = h1 - h0
  while (turn > 0) turn -= TAU
  while (turn < -TAU) turn += TAU
  // The centre is on the inside of the turn: for a falling heading, at p + r (sin h, -cos h).
  const c: Pt = [p[0] + r * Math.sin(h0), p[1] - r * Math.cos(h0)]
  const a0 = h0 + Math.PI / 2
  const n = 40
  const pts: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + (turn * i) / n
    pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)])
  }
  return { path: new Path(pts), turn }
}
const HAIR = hairpin(T1B.end, t1bH, t2H, H_R)
const T_ARC = (2 * HAIR.path.len) / (V_HAIR + V_HAIR_OUT)
const hairS = (tau: number) => V_HAIR * tau + ((V_HAIR_OUT - V_HAIR) * tau * tau) / (2 * T_ARC)
// When is the apex (half way round)? Solve hairS = len / 2.
const apexTau = (() => {
  let lo = 0
  let hi = T_ARC
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (hairS(mid) < HAIR.path.len / 2) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
})()
const tHin = T.h1 - apexTau
const tHout = tHin + T_ARC
const T1B_PEAK = 1.3
const t1bKnots = solveKnot(
  [
    [0, t1bV0],
    [T1B_PEAK, NaN],
    [tHin - T.j1Land, V_HAIR],
  ],
  1,
  T1B.len,
)
/** The second traverse, back right, to the crevasse's lip. */
const V_J2 = 3.5
const T2_LEN = ((V_HAIR_OUT + V_J2) / 2) * (T.j2 - tHout)
const T2 = new Path([HAIR.path.end, along(HAIR.path.end, t2H, T2_LEN)])
export const J2_LIP = T2.end
const J2_ANGLE = (12 * Math.PI) / 180
const j2V: Pt = [V_J2 * Math.cos(J2_ANGLE), -V_J2 * Math.sin(J2_ANGLE)]
const j2 = flightEnd(J2_LIP, j2V, T.j2Land - T.j2)
/** The crevasse between the lip and where they land. */
export const CREVASSE = { x0: J2_LIP[0] + 0.25, x1: j2.p[0] - 0.35, top: J2_LIP[1] + R, depth: 3.2 }

/** A short run on to the fork: the upper branch level to the ledge over the gate, the lower down to the gate. */
const T2B_H = Math.atan2(0.08, 1)
export const FORK: Pt = along(j2.p, T2B_H, 0.65)
/** The ledge's lip, where the face drops to the apron at the gate. */
export const LEDGE = { y: FORK[1] + 0.02, lip: -9.5, c: -10.35, a: -9.8, from: FORK[0] + 1.55 }
const UPPER = new Path([j2.p, FORK, [LEDGE.lip, LEDGE.y]])
/** The apron at the gate: the vault's floor, outside. */
export const FLOOR_Y = 56
const REST_Y = FLOOR_Y - R
export const GATE_X = -7
/** Where the lower branch comes down onto the apron, round the ledge's left end. */
export const APRON_FROM = FORK[0] + 1.35
/** Fischer shot here, at the vault door (the stack's point). */
export const SHOT_X = FISCHER_DOWN.at[0]
function lowerBranch(): Path {
  // Down off the fork round the ledge's left end onto the apron (a quadratic), then level along the apron in front of
  // the ledge's rock to the gate, and on along the antechamber.
  const a = FORK
  const b: Pt = [APRON_FROM, REST_Y]
  const ctl: Pt = [a[0] + 0.55, REST_Y + 0.05]
  const pts: Pt[] = [j2.p]
  for (let i = 0; i <= 20; i++) {
    const u = i / 20
    const v = 1 - u
    pts.push([v * v * a[0] + 2 * v * u * ctl[0] + u * u * b[0], v * v * a[1] + 2 * v * u * ctl[1] + u * u * b[1]])
  }
  pts.push([SHOT_X, REST_Y])
  return new Path(pts)
}
const LOWER = lowerBranch()
const LOWER_GATE = LOWER.len - (SHOT_X - (GATE_X - R))

/* ------------------------------------------------------------------ Cobb, the run */

const C_LAND: Pt = [C_IN[0], Y_REST]
const slide = (x0: number, t0: number, t1: number, flat: number) => {
  const d = x0 - SHOULDER.lip
  const s = hermite(0, 0, d, V_LIP, t1 - t0)
  return { t0, t1, at: (t: number): Pt => [x0 - s(t - t0), flat], ski: () => 0 } as Phase
}

/** Cobb's run, from the dark to the ledge, and his leap: the motion everyone else's is timed from. */
function cobbRun(): Phase[] {
  const out: Phase[] = []
  out.push({ t0: T.in, t1: T.land, at: (t) => [C_IN[0], fallY(C_IN[1], t)] })
  out.push(slide(C_LAND[0], T.land, T.dropC, Y_REST))
  out.push(flight([SHOULDER.lip, Y_REST], [-V_LIP, 0], T.dropC, T.dropF, G, 0, skiLine(t1aH)))
  out.push(onPath(T1A, T.dropF, T.j1, (tau) => t1aV0 * tau + 0.5 * ((t1aV1 - t1aV0) / (T.j1 - T.dropF)) * tau * tau))
  out.push(flight(J1_LIP, j1V, T.j1, T.j1Land, G, skiLine(t1aH) - 0.25, skiLine(t1bH)))
  out.push(onPath(T1B, T.j1Land, tHin, (tau) => run(t1bKnots, tau)))
  out.push(onPath(HAIR.path, tHin, tHout, hairS))
  out.push(onPath(T2, tHout, T.j2, (tau) => V_HAIR_OUT * tau + (0.5 * (V_J2 - V_HAIR_OUT) * tau * tau) / (T.j2 - tHout)))
  out.push(flight(J2_LIP, j2V, T.j2, T.j2Land, G, skiLine(t2H) - 0.2, skiLine(T2B_H)))
  return out
}
const RUN = new Motion(cobbRun())

/** How fast someone lands off the crevasse along the branch (the landing's speed along the snow). */
const j2Along = dot(j2.v, dir(T2B_H))

/** A stop along the upper branch at `x` by `t1`, from the landing at `t0`. */
function toLedge(x: number, t0: number, t1: number): Phase {
  const target = UPPER.cum[1] + (x - FORK[0])
  const s = hermite(0, j2Along, target, 0, t1 - t0)
  return onPath(UPPER, t0, t1, s)
}

/** Off the ledge over whoever is beside him, down onto the apron, and a skid to a stop at `x`. */
function leap(x0: number, t0: number, t1: number, vx: number, x1: number, tStop: number): Phase[] {
  const Tf = t1 - t0
  const vy = (REST_Y - LEDGE.y - 0.5 * G * Tf * Tf) / Tf
  const land: Pt = [x0 + vx * Tf, REST_Y]
  const d = x1 - land[0]
  const s = hermite(0, vx, d, 0, tStop - t1)
  return [
    flight([x0, LEDGE.y], [vx, vy], t0, t1, G, 0, 0),
    { t0: t1, t1: tStop, at: (t) => [land[0] + s(t - t1), REST_Y], ski: () => 0 },
  ]
}
/** Where they lie down by the gate: over the crossing into limbo (`DOWN.limbo`). */
export const LIE_C = DOWN.limbo.at[0]
export const LIE_A = DOWN.limbo.at[0] + DOWN.limbo.ariadne![0]
/** The case, by the gate. */
export const CASE_X = -9.25

/** Sinking through the floor and the mountain from `y0` at `t0` to `y1` at `t1`, moving 5 c/s down there. */
function sinkTo(x: number, y0: number, y1: number, t0: number, t1: number, v0 = 0): Phase {
  const s = hermite(y0, v0, y1, DOWN.limbo.v[1], t1 - t0)
  return { t0, t1, at: (t) => [x, s(t - t0)] }
}

const C_STOP_T = T.stopC
const C_REST_T = T.cLand3 + 0.52
export const COBB = new Motion([
  ...RUN.phases,
  toLedge(LEDGE.c, T.j2Land, C_STOP_T),
  still([LEDGE.c, LEDGE.y], C_STOP_T, T.shot),
  ...leap(LEDGE.c, T.shot, T.cLand3, 1.83, LIE_C, C_REST_T),
  still([LIE_C, REST_Y], C_REST_T, T.sink),
  sinkTo(LIE_C, REST_Y, DOWN.limbo.at[1], T.sink, T.out),
])

/* ------------------------------------------------------------------ Ariadne and Fischer on the run */

const A_LAND_T = fallTime(A_IN[1], Y_REST)
const F_LAND_T = fallTime(F_IN[1], Y_REST)
const A_REST_T = T.aLand3 + 0.55
export const ARIADNE_SNOW = new Motion([
  { t0: T.in, t1: A_LAND_T, at: (t) => [A_IN[0], fallY(A_IN[1], t)] },
  still([A_IN[0], Y_REST], A_LAND_T, A_LAND_T + 0.001),
  slide(A_IN[0], A_LAND_T + 0.001, T.dropA, Y_REST),
  shifted(RUN, A_SHIFT, T.dropA, T.j2Land - A_SHIFT),
  toLedge(LEDGE.a, T.j2Land - A_SHIFT, T.stopA),
  still([LEDGE.a, LEDGE.y], T.stopA, T.aLeap),
  ...leap(LEDGE.a, T.aLeap, T.aLand3, 1.0, LIE_A, A_REST_T),
  still([LIE_A, REST_Y], A_REST_T, T.sink),
  sinkTo(LIE_A, REST_Y, DOWN.limbo.at[1] + DOWN.limbo.ariadne![1], T.sink, T.out),
])

/** Fischer's own way from the crevasse: down the lower branch, the gate, the antechamber to the vault door. */
const F_J2 = T.j2Land + F_SHIFT
/** He reaches the gate's threshold just after it has started up. */
const F_GATE_T = T.gate + 0.24
const F_GATE_V = 1.8
function fischerIn(): Phase[] {
  const T1 = F_GATE_T - F_J2
  const knots = solveKnot(
    [
      [0, j2Along],
      [T1 * 0.4, NaN],
      [T1, F_GATE_V],
    ],
    1,
    LOWER_GATE,
  )
  const T2x = T.shot - F_GATE_T
  const L2 = LOWER.len - LOWER_GATE
  const v2 = (2 * L2) / T2x - F_GATE_V
  const skiOff = (t: number) => (t < F_GATE_T - 0.05 ? LOWER.heading(run(knots, t - F_J2)) : null)
  return [
    { t0: F_J2, t1: F_GATE_T, at: (t) => LOWER.at(run(knots, t - F_J2)), ski: skiOff },
    { t0: F_GATE_T, t1: T.shot, at: (t) => LOWER.at(LOWER_GATE + F_GATE_V * (t - F_GATE_T) + (0.5 * (v2 - F_GATE_V) * (t - F_GATE_T) ** 2) / T2x) },
  ]
}
export const FISCHER_SNOW = new Motion([
  { t0: T.in, t1: F_LAND_T, at: (t) => [F_IN[0], fallY(F_IN[1], t)] },
  still([F_IN[0], Y_REST], F_LAND_T, F_LAND_T + 0.001),
  slide(F_IN[0], F_LAND_T + 0.001, T.dropF, Y_REST),
  shifted(RUN, -F_SHIFT, T.dropF, F_J2),
  ...fischerIn(),
  // Shot: he goes down into the floor at once and falls through the mountain into the dark (`FISCHER_DOWN`).
  sinkTo2(SHOT_X, REST_Y, T.shot, FISCHER_DOWN.t),
])
/**
 * Shot, Fischer goes down into the floor slowly at first (a body going under, the floor soft), and once through it
 * falls away through the mountain into the dark, to cross at `FISCHER_DOWN` moving 5 c/s.
 */
function sinkTo2(x: number, y0: number, t0: number, t1: number): Phase {
  const tm = t0 + 0.75
  const ym = y0 + 0.68
  const vm = 2.6
  const a = hermite(y0, 0.25, ym, vm, tm - t0)
  const b = hermite(ym, vm, FISCHER_DOWN.at[1], FISCHER_DOWN.v[1], t1 - tm)
  return { t0, t1, at: (t) => [x, t < tm ? a(t - t0) : b(t - tm)] }
}
/** Where Fischer's skis come off: at the gate, left in the snow (where he stepped out of them). */
export const F_SKIS_OFF: Pt = FISCHER_SNOW.at(F_GATE_T - 0.05)

/* ------------------------------------------------------------------ the guards */

/**
 * Two guards on snowmobiles come over the crest from the right after them, down the same pistes, over the rock step.
 * At the crevasse the first goes in and the second pulls up at its edge.
 */
export const GUARD_SHIFT = [half(138) - T.j1, half(139) - T.j1]
/** When each guard comes down hard on the face off the cornice: on the eighths after bar 33's third beat. */
export const GUARD_LAND = [half(134), half(135)]
/** When each guard carves the hairpin (following Cobb's run). */
export const GUARD_HAIR = [T.h1 + GUARD_SHIFT[0], T.h1 + GUARD_SHIFT[1]]
/** When the first guard goes over the crevasse's lip, and sticks in it. */
export const GUARD_IN = beat(147)
export const GUARD_DOWN = half(147)
const CREST_IN: Pt[] = [
  [30, 43.35],
  [22, 43.9],
  [SHOULDER.right, Y_REST],
]
function guard(i: number): Motion {
  const shift = GUARD_SHIFT[i]
  const tJ1 = T.j1 + shift
  // From over the crest, fast along the shoulder and off the cornice, landing hard on the face on an eighth.
  const vLip = 3.2
  const approach = new Path([...CREST_IN, [SHOULDER.lip, Y_REST]])
  // Off the lip at vLip: when does it meet the first traverse?
  let tDown = 0.3
  for (let k = 0; k < 40; k++) {
    const p = flightEnd([SHOULDER.lip, Y_REST], [-vLip, 0], tDown).p
    const u = (p[0] - T1A.pts[0][0]) / (T1A.pts[1][0] - T1A.pts[0][0])
    const y = T1A.pts[0][1] + (T1A.pts[1][1] - T1A.pts[0][1]) * u
    tDown += (y - p[1]) / 8
  }
  const tLip = GUARD_LAND[i] - tDown
  const tStart = tLip - approach.len / vLip
  const off: Phase = { t0: tStart, t1: tLip, at: (t) => approach.at(approach.len - vLip * (tLip - t)), ski: (t) => skiLine(approach.heading(approach.len - vLip * (tLip - t))) }
  const landing = flightEnd([SHOULDER.lip, Y_REST], [-vLip, 0], tDown)
  const sLand = Math.hypot(landing.p[0] - T1A.pts[0][0], landing.p[1] - T1A.pts[0][1])
  const tLand = tLip + tDown
  const vIn = dot(landing.v, dir(t1aH))
  const knots = solveKnot(
    [
      [0, vIn],
      [(tJ1 - tLand) * 0.5, NaN],
      [tJ1 - tLand, t1aV1],
    ],
    1,
    T1A.len - sLand,
  )
  const phases: Phase[] = [
    off,
    flight([SHOULDER.lip, Y_REST], [-vLip, 0], tLip, tLand, G, 0, skiLine(t1aH)),
    onPath(T1A, tLand, tJ1, (tau) => run(knots, tau), sLand),
    shifted(RUN, -shift, tJ1, T.j2 - 1.4 + shift),
  ]
  // On the second traverse: the first comes on too fast and goes into the crevasse; the second pulls up.
  const t0 = T.j2 - 1.4 + shift
  const s0 = T2.len - (V_J2 * 1.4 - (0.5 * (V_J2 - V_HAIR_OUT) * 1.4 * 1.4) / (T.j2 - tHout))
  const v0 = V_J2 - ((V_J2 - V_HAIR_OUT) * 1.4) / (T.j2 - tHout)
  if (i === 0) {
    // Onto the lip slower than they were (heavy): it tips nose first into the crevasse and sticks there.
    const tLipG = GUARD_IN
    const vL = 1.5
    const s = hermite(0, v0, T2.len - s0, vL, tLipG - t0)
    phases.push({ t0, t1: tLipG, at: (t) => T2.at(s0 + s(t - t0)), ski: (t) => T2.heading(s0 + s(t - t0)) })
    const wedge: Pt = [J2_LIP[0] + 0.62, J2_LIP[1] + 0.78]
    const D = GUARD_DOWN - tLipG
    phases.push({
      t0: tLipG,
      t1: GUARD_DOWN,
      at: (t) => {
        const u = (t - tLipG) / D
        // Across at its speed, easing; down as a fall does.
        return [J2_LIP[0] + (wedge[0] - J2_LIP[0]) * (u * (2 - u) * 0.6 + 0.4 * u), J2_LIP[1] + (wedge[1] - J2_LIP[1]) * u * u]
      },
      ski: (t) => lerpAngle(t2H, 1.05, ss((t - tLipG) / D)),
    })
    phases.push(still(wedge, GUARD_DOWN, 400, 1.05))
  } else {
    // Pulls up short of the lip, and stays.
    const tStop = beat(148) + 0.2
    const edge = T2.len - 3.4
    const s = hermite(0, v0, edge - s0, 0, tStop - t0)
    phases.push({ t0, t1: tStop, at: (t) => T2.at(s0 + s(t - t0)), ski: (t) => T2.heading(s0 + s(t - t0)) })
    phases.push(still(T2.at(edge), tStop, 400, t2H))
  }
  return new Motion(phases)
}
export const GUARDS = [guard(0), guard(1)]

/* ------------------------------------------------------------------ Mal */

/** Mal on the upper traverse over the ledge, still, her rifle on Fischer at the vault door. */
export const MAL_AT: Pt = T1B.at(Math.abs((-11.3 - T1B.pts[0][0]) / Math.cos(t1bH)))
export const MAL_FROM = T.gate + 0.7
export const MAL_TO = T.shot + 2.4

/* ------------------------------------------------------------------ the pistes, for the set */

/** Every piste the run lays, as the snow's surface under the ball's path (the centre path moved down R). */
export const PISTES: { path: Path; kind: 'piste' | 'branch' }[] = [
  { path: T1A, kind: 'piste' },
  { path: T1B, kind: 'piste' },
  { path: HAIR.path, kind: 'piste' },
  { path: T2, kind: 'piste' },
  { path: UPPER, kind: 'branch' },
  { path: new Path(LOWER.pts.slice(0, LOWER.pts.length - 1)), kind: 'branch' },
]
export const TRACK = { T1A, T1B, HAIR: HAIR.path, T2, UPPER, LOWER, drop: drop.p, j1Land: j1.p, j2Land: j2.p }

/* ------------------------------------------------------------------ the fortress */

/**
 * The fortress (the stack's `SNOW_GEO`): a hospital of concrete on the column at the foot of the face, x -7 to 7, its
 * footing at 58. The ground floor (the vault's level, floor 56) is cut away: the antechamber from the gate in the left
 * wall, and at its back the vault's steel face with the great round door; behind the door the vault itself, the bed.
 */
export const FORT = {
  x0: -7,
  x1: 7,
  foot: 58,
  floor: FLOOR_Y,
  slab: 0.32,
  ceil: 53.0,
  /** The upper floor's slab and the roofs: the main block's, the lower left wing's, the tower's. */
  upper: 52.6,
  roof: 48.6,
  wingX: -3.6,
  wingRoof: 50.2,
  towerX: [5.0, 6.6] as Pt,
  towerTop: 47.7,
  wall: 0.38,
  /** The gate in the left wall, and its height. */
  gateH: 2.2,
  /** The vault's steel face at the back of the antechamber. */
  vault: [-0.3, 4.9] as Pt,
  /** The great round door: its centre and radius, and where it rolls to. */
  door: [1.6, 54.8] as Pt,
  doorR: 1.0,
  doorTo: 3.6,
}

/** How far the great door has turned its wheel (radians), and rolled (0 shut, 1 open), at show time `t`. */
export function doorAt(t: number): { wheel: number; roll: number; bolts: number } {
  const wheel = ss((t - T.wheel) / (T.door - T.wheel)) * TAU * 0.75
  const bolts = ss((t - T.wheel - 0.15) / (T.door - T.wheel - 0.1))
  const roll = ss((t - T.door) / (T.doorOpen + 0.25 - T.door))
  return { wheel, roll, bolts }
}
/** The pinwheel's turn (radians) at `t`: still, then a breath turns it round, and it slows. */
export function pinwheelAt(t: number): number {
  const u = t - T.pinwheel
  if (u <= 0) return 0.35
  return 0.35 + 7.5 * (1 - Math.exp(-u / 0.6)) + 0.9 * u * Math.exp(-u / 1.6)
}

/* ------------------------------------------------------------------ the vault: the three of them back up */

const THROW_T = T.vOut - T.kick
/**
 * The floor drops under them from the charges to the kick (show time: they ride it): as far as puts them, thrown up
 * under gravity on the kick, into the hotel at exactly `UP.hotel`'s speed.
 */
export const DROP = UP.hotel.at[1] - UP.hotel.v[1] * THROW_T + 0.5 * G * THROW_T * THROW_T - (FLOOR_Y - R)
function floorDrop(t: number): number {
  const u = clamp01((t - T.charges) / (T.kick - T.charges))
  return DROP * u * u
}
/** The fortress's own sag and fall: the floor's drop, then on down after the kick (the snow's own clock). */
export function fortDrop(t: number): number {
  return floorDrop(t)
}
const Y_KICK = REST_Y + DROP
/** The kick: thrown straight up from the fallen floor to cross into the hotel at 20 c/s (`UP.hotel`). */
const THROW_V0 = (UP.hotel.at[1] - Y_KICK - 0.5 * G * THROW_T * THROW_T) / THROW_T
const throwY = (t: number) => Y_KICK + THROW_V0 * (t - T.kick) + 0.5 * G * (t - T.kick) ** 2

/** Rising out of the dark from `from` moving `v` up, to rest on the vault's floor, passing its surface at `through`. */
function riseTo(x: number, y0: number, v0: number, t0: number, through: number): { phase: Phase; rest: number } {
  // Solve the rise's length so the ball's centre is at the floor's surface at `through` (a longer rise is slower).
  let lo = through - t0 + 0.02
  let hi = 2.0
  for (let k = 0; k < 60; k++) {
    const D = (lo + hi) / 2
    const y = hermite(y0, v0, REST_Y, 0, D)(through - t0)
    if (y < FLOOR_Y) lo = D
    else hi = D
  }
  const D = (lo + hi) / 2
  const s = hermite(y0, v0, REST_Y, 0, D)
  return { phase: { t0, t1: t0 + D, at: (t) => [x, s(t - t0)] }, rest: t0 + D }
}

const cRise = riseTo(UP.snow.at[0], UP.snow.at[1], UP.snow.v[1], T.vIn, T.cThrough)
const A_V_X = UP.snow.at[0] + UP.snow.ariadne![0]
const aRise = riseTo(A_V_X, UP.snow.at[1] + UP.snow.ariadne![1], UP.snow.v[1], T.vIn, T.cThrough + 0.07)
const fRise = riseTo(FISCHER_UP.at[0], FISCHER_UP.at[1], FISCHER_UP.v[1], T.fUp, T.fThrough)
export const REST = { c: UP.snow.at[0], a: A_V_X, f: FISCHER_UP.at[0], bed: FORT.door[0] }
export const THROUGH = { c: T.cThrough, a: T.cThrough + 0.07, f: T.fThrough }

const riding = (x: number, t0: number): Phase => ({ t0, t1: T.kick, at: (t) => [x, REST_Y + floorDrop(t)] })
const thrown = (x0: number, x1: number, dy: number): Phase => ({
  t0: T.kick,
  t1: T.vOut,
  at: (t) => {
    const u = ss((t - T.kick) / THROW_T)
    return [lerp(x0, x1, u), throwY(t) + dy * u]
  },
})
export const COBB_VAULT = new Motion([cRise.phase, still([REST.c, REST_Y], cRise.rest, T.charges, null), riding(REST.c, T.charges), thrown(REST.c, UP.hotel.at[0], 0)])
export const ARIADNE_VAULT = new Motion([
  aRise.phase,
  still([REST.a, REST_Y], aRise.rest, T.charges, null),
  riding(REST.a, T.charges),
  thrown(REST.a, UP.hotel.at[0] + UP.hotel.ariadne![0], UP.hotel.ariadne![1]),
])
/** Fischer: up first; on his back; the paddles; to his father's bed; the kick. */
const F_BED_T0 = T.door + 0.12
const F_BED_T1 = T.pinwheel - 0.12
export const FISCHER_VAULT = new Motion([
  fRise.phase,
  still([REST.f, REST_Y], fRise.rest, T.paddles, null),
  {
    // The jolt: up off the floor and down again.
    t0: T.paddles,
    t1: T.paddles + 0.34,
    at: (t) => {
      const u = (t - T.paddles) / 0.34
      return [REST.f, REST_Y - 0.24 * Math.sin(Math.PI * u) * (1 - 0.3 * u)]
    },
  },
  still([REST.f, REST_Y], T.paddles + 0.34, F_BED_T0, null),
  { t0: F_BED_T0, t1: F_BED_T1, at: (t) => [lerp(REST.f, REST.bed, ss((t - F_BED_T0) / (F_BED_T1 - F_BED_T0))), REST_Y] },
  still([REST.bed, REST_Y], F_BED_T1, T.charges, null),
  riding(REST.bed, T.charges),
  thrown(REST.bed, UP.hotel.at[0] + UP.hotel.fischer![0], UP.hotel.fischer![1]),
])
/** Fischer's face (the ball's mark): up on his back; after the paddles, toward the door. */
export function fischerMark(t: number): number | undefined {
  if (t < fRise.rest - 0.3) return undefined
  const up = -Math.PI / 2
  const wake = ss((t - T.paddles - 0.15) / 0.5)
  return lerpAngle(up, -0.25, wake)
}

/** Where the rise tears the floor, and when. */
export const TEARS_UP: { x: number; y: number; t: number }[] = [
  { x: REST.f, y: FLOOR_Y, t: T.fThrough },
  { x: REST.c, y: FLOOR_Y, t: T.cThrough },
  { x: REST.a, y: FLOOR_Y, t: T.cThrough + 0.07 },
]
/** Where the kick throws them up through the ceiling and the roof. */
export function kickTears(): { x: number; y: number; t: number; who: 'c' | 'a' | 'f' }[] {
  const out: { x: number; y: number; t: number; who: 'c' | 'a' | 'f' }[] = []
  const list: ['c' | 'a' | 'f', Motion][] = [
    ['c', COBB_VAULT],
    ['a', ARIADNE_VAULT],
    ['f', FISCHER_VAULT],
  ]
  for (const [who, m] of list) {
    for (const surface of [FORT.ceil + DROP, FORT.roof + DROP]) {
      let lo = T.kick
      let hi = T.vOut
      if (m.at(hi)[1] > surface) continue
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2
        if (m.at(mid)[1] > surface) lo = mid
        else hi = mid
      }
      out.push({ x: m.at(lo)[0], y: surface, t: lo, who })
    }
  }
  return out
}

/* ------------------------------------------------------------------ what the run's numbers came out as (for tuning) */

export const DERIVED = {
  drop: drop.p,
  t1aV: [t1aV0, t1aV1],
  j1Land: j1.p,
  t1bKnots,
  hairIn: T1B.end,
  hairOut: HAIR.path.end,
  apex: HAIR.path.at(HAIR.path.len / 2),
  tHin,
  tHout,
  j2Lip: J2_LIP,
  j2Land: j2.p,
  fork: FORK,
  mal: MAL_AT,
  throwV0: THROW_V0,
  rests: { c: cRise.rest, a: aRise.rest, f: fRise.rest },
}

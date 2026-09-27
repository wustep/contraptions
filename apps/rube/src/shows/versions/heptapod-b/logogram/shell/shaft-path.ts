import { R, type Pt } from '../../../../../parts'
import { LIFT_AT, LIFT_EXIT } from '../valley/geo'
import { G } from '../physics'
import { pulse, SEAM, TURN } from '../music'

/**
 * The shaft's fixed geometry and its clock (the shaft builder's): where the deck stops, where the walls are, how
 * gravity turns, and the two of them from the mouth to the chamber. Shell cells, the shaft part's own frame: the ball
 * comes in at (-0.5, 0) rising on the deck (+x), the shaft runs along +x to the chamber, gravity is the shell's own
 * (+y) once it has turned. In the mouth Earth's gravity points to -x (the camera is rolled a quarter there).
 *
 * Across the shaft (along y) the deck lies from DECK[0] to DECK[1], centred under the slot (the valley's slot is
 * SLOT_W wide round SHELL_X; Louise stands 0.4 left of its middle). The shaft is wider than its throat: its walls are
 * at Y_C and Y_F, and the +y wall is the one that becomes the floor.
 */

/* ------------------------------------------------------------------ the clock */

export const T0 = SEAM.shaft
export const T_END = SEAM.chamber
/** The deck comes up against its stops (pulse 282), the rail rings. */
export const T_STOP = pulse(282)
/** She sets off across the deck to the lamp's switch (284), touches it (286: the lamp stutters), it catches (287). */
export const T_ROLL = pulse(284)
export const T_SWITCH = pulse(286)
export const T_ON = pulse(287)
/** Ian comes after her a little way (289 → 292), and stops. */
export const T_IAN_GO = pulse(289)
export const T_IAN_STOP = pulse(292)
/** Gravity turns (295): she leaps; Ian a pulse after (296). */
export const T_LEAP = TURN
export const T_IAN_LEAP = pulse(296)
/** Her landing on the wall that is now the floor, and her bounces, 3, 2 and 1 pulses long. */
export const L_TOUCH = [pulse(298), pulse(301), pulse(303), pulse(304)] as const
/** His, a pulse behind hers. */
export const I_TOUCH = [pulse(299), pulse(302), pulse(304), pulse(305)] as const
/** Her low hops over the ribs: [lift off, land] (every landing on a pulse, every hop two pulses long). */
export const L_HOPS: readonly [number, number][] = [
  [pulse(307), pulse(309)],
  [pulse(339), pulse(341)],
  [pulse(349), pulse(351)],
]
/** His, over the same ribs, a little after her. */
export const I_HOPS: readonly [number, number][] = [
  [pulse(310), pulse(312)],
  [pulse(340), pulse(342)],
  [pulse(350), pulse(352)],
]

/* ------------------------------------------------------------------ gravity */

/** The shell's own gravity (+y), cells a second a second: not quite ours (Earth's, in the mouth, is G). */
export const G_SHELL = 6
/** How long gravity takes to turn, from TURN. */
export const TURN_FOR = 0.5
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
/** 0 → 1 with no jump in speed or acceleration at either end. */
export const smoother = (u: number): number => {
  const v = clamp01(u)
  return v * v * v * (v * (6 * v - 15) + 10)
}
/** How far gravity has turned at `t`: 0 Earth's (-x), 1 the shell's (+y). */
export const turned = (t: number): number => smoother((t - TURN) / TURN_FOR)
/** Gravity at `t` (cells/s², y down). */
export function gravity(t: number): Pt {
  const u = turned(t)
  const a = Math.PI - (Math.PI / 2) * u
  const g = G + (G_SHELL - G) * u
  return [g * Math.cos(a), g * Math.sin(a)]
}

/**
 * Gravity integrated from TURN: its velocity `V(t)` and position `X(t)` (from rest at TURN), tabled finely through the
 * turn and exact after it (where it is constant). Anything thrown in the turn then moves exactly as
 * p0 + v0·τ + X(t) - X(t0) - V(t0)·τ: the path is linear in how it was thrown, so a throw is solved, not searched.
 */
const DT = 0.0005
const N = Math.ceil((TURN_FOR + 0.01) / DT)
const VT: Pt[] = [[0, 0]]
const XT: Pt[] = [[0, 0]]
for (let i = 1; i <= N; i++) {
  const a = gravity(TURN + (i - 1) * DT)
  const b = gravity(TURN + i * DT)
  const m = gravity(TURN + (i - 0.5) * DT)
  const v0 = VT[i - 1]
  // Simpson's on each step for the velocity, and the trapezoid of it for the position.
  const v1: Pt = [v0[0] + (DT / 6) * (a[0] + 4 * m[0] + b[0]), v0[1] + (DT / 6) * (a[1] + 4 * m[1] + b[1])]
  const vm: Pt = [v0[0] + (DT / 4) * (a[0] + m[0]), v0[1] + (DT / 4) * (a[1] + m[1])]
  VT.push(v1)
  const x0 = XT[i - 1]
  XT.push([x0[0] + (DT / 6) * (v0[0] + 4 * vm[0] + v1[0]), x0[1] + (DT / 6) * (v0[1] + 4 * vm[1] + v1[1])])
}
const TEND = TURN + N * DT
function table(t: number, T: Pt[]): Pt {
  const i = (t - TURN) / DT
  const j = Math.max(0, Math.min(N - 1, Math.floor(i)))
  const f = Math.max(0, Math.min(1, i - j))
  return [T[j][0] + (T[j + 1][0] - T[j][0]) * f, T[j][1] + (T[j + 1][1] - T[j][1]) * f]
}
/** Gravity's velocity from TURN. */
export function gV(t: number): Pt {
  if (t <= TURN) return [0, 0]
  if (t <= TEND) return table(t, VT)
  const e = VT[N]
  return [e[0], e[1] + G_SHELL * (t - TEND)]
}
/** Gravity's position from TURN. */
export function gX(t: number): Pt {
  if (t <= TURN) return [0, 0]
  if (t <= TEND) return table(t, XT)
  const e = XT[N]
  const v = VT[N]
  const s = t - TEND
  return [e[0] + v[0] * s, e[1] + v[1] * s + 0.5 * G_SHELL * s * s]
}

/** A throw in the turning gravity: from `p0` at `t0` to land on `p1` at `t1`. Its velocity out, and its path. */
export function thrown(p0: Pt, t0: number, p1: Pt, t1: number): { v0: Pt; at: (t: number) => Pt; vel: (t: number) => Pt } {
  const T = t1 - t0
  const X1 = gX(t1)
  const X0 = gX(t0)
  const V0 = gV(t0)
  const v0: Pt = [(p1[0] - p0[0] - (X1[0] - X0[0] - V0[0] * T)) / T, (p1[1] - p0[1] - (X1[1] - X0[1] - V0[1] * T)) / T]
  const at = (t: number): Pt => {
    const s = t - t0
    const X = gX(t)
    return [p0[0] + v0[0] * s + X[0] - X0[0] - V0[0] * s, p0[1] + v0[1] * s + X[1] - X0[1] - V0[1] * s]
  }
  const vel = (t: number): Pt => {
    const V = gV(t)
    return [v0[0] + V[0] - V0[0], v0[1] + V[1] - V0[1]]
  }
  return { v0, at, vel }
}

/* ------------------------------------------------------------------ the deck and the walls */

/** The deck rises into the mouth at 0.55 (SEAMS.shaft) and slows to 0.12 as it meets its stops. */
export const V_IN = 0.55
export const V_HIT = 0.12
export const X_STOP = -0.5 + ((V_IN + V_HIT) / 2) * (T_STOP - T0)
/** The mouth's lip: the shaft's end face, flush with the deck's plate when the deck is home. */
export const X_LIP = X_STOP - R
/**
 * The belly's outer face: the hull is thick here, the slot a deep throat through it, and the belly curves up away from
 * the slot on either side (its lowest point is the slot's middle, y = 0.4). X_HULL is its lowest.
 */
export const X_HULL = X_LIP - 3.4
export const hullX = (y: number): number => X_HULL + 0.5 * ((y - 0.4) / 4.6) ** 2
/** The deck, across the shaft, from her (Ian is at -0.42): 2.4 long, centred on the slot. */
export const DECK: Pt = [-0.8, 1.6]
/** The throat through the belly (the slot, 2.6 wide), from her. */
export const THROAT: Pt = [-0.9, 1.7]
/** The shaft's two walls: -y (the ceiling, once gravity turns) and +y (the floor). */
export const Y_C = -4.1
export const Y_F = 2.9
/** A ball resting on the floor. */
export const REST = Y_F - R
/** The lamp's switch on the deck (its face toward her), and how far its button goes in under her. */
export const SWITCH_U = 0.49
export const PRESS = 0.035
export const U_TOUCH = SWITCH_U - R
export const U_PRESS = U_TOUCH + PRESS
/** Where the lift starts back down, after they have gone. */
export const T_DOWN = T_END + 3

/** The deck's rest line along x at `t` (the balls on it sit here). */
export function deckX(t: number): number {
  if (t <= T0) return -0.5 + V_IN * (t - T0)
  const D = T_STOP - T0
  if (t <= T_STOP) {
    const s = t - T0
    return -0.5 + V_IN * s + ((V_HIT - V_IN) / (2 * D)) * s * s
  }
  const s = t - T_STOP
  // The stops: a knock back off them and a damped settle.
  let x = X_STOP - 0.018 * Math.sin((2 * Math.PI * s) / 0.42) * Math.exp(-s / 0.2)
  if (t > T_DOWN) {
    const d = t - T_DOWN
    x -= 0.08 * d * d / (1 + 0.05 * d * d) + 0.02 * d
  }
  return x
}

/* ------------------------------------------------------------------ on the deck */

/** Her roll across the deck to the switch: from rest, arriving at 0.5 c/s, pressing its button in, stopping. */
const V_TOUCH = 0.5
function deckU(t: number): number {
  if (t <= T_ROLL) return 0
  const D = T_SWITCH - T_ROLL
  if (t <= T_SWITCH) {
    const s = (t - T_ROLL) / D
    const m = (V_TOUCH * D) / U_TOUCH
    return U_TOUCH * ((3 - m) * s * s + (m - 2) * s * s * s)
  }
  const P = (2 * PRESS) / V_TOUCH
  const s = Math.min(t - T_SWITCH, P)
  return U_TOUCH + V_TOUCH * s - (V_TOUCH / (2 * P)) * s * s
}
/** Ian across the deck: from -0.42 a little way after her, easing, and stopping. */
const I_U0 = -0.42
const I_U1 = -0.12
function ianDeckU(t: number): number {
  const u = smoother((t - T_IAN_GO) / (T_IAN_STOP - T_IAN_GO))
  return I_U0 + (I_U1 - I_U0) * u
}

/* ------------------------------------------------------------------ the fall in the turn */

/** Where she lands on the wall that becomes the floor, and he (behind her). */
export const X_LAND = X_STOP + 1.05
export const I_X_LAND = X_LAND - 0.42
const LEAP = thrown([X_STOP, U_PRESS], T_LEAP, [X_LAND, REST], L_TOUCH[0])
/** Ian: pressed to the deck, he rolls along it as gravity turns (a rolling ball feels 5/7 of the pull), then leaps. */
function ianSlide(t: number): number {
  return ianDeckU(Math.min(t, T_LEAP)) + (5 / 7) * gX(t)[1]
}
const I_LEAP = thrown([X_STOP, ianSlide(T_IAN_LEAP)], T_IAN_LEAP, [I_X_LAND, REST], I_TOUCH[0])

/* ------------------------------------------------------------------ along the floor */

/** A rib across the shaft: its x, its height, its half-width. */
export interface Rib {
  x: number
  h: number
  w: number
}

/** A stretch along the floor: x from `x0` with speed going linearly `v0 → v1`; a flight (`hop`) keeps `v0`. */
interface Stretch {
  t0: number
  t1: number
  x0: number
  v0: number
  v1: number
  hop: boolean
}
const xOf = (s: Stretch, t: number): number => {
  const u = Math.max(0, Math.min(t, s.t1) - s.t0)
  const D = s.t1 - s.t0
  return s.x0 + s.v0 * u + ((s.v1 - s.v0) / (2 * D)) * u * u
}
const endOf = (s: Stretch) => xOf(s, s.t1)

/** Rolling from `x0, v0` at `t0` to `x1, v1` at `t1`, the speed changing linearly to a middle knot and on (continuous). */
function bridge(t0: number, x0: number, v0: number, t1: number, x1: number, v1: number): Stretch[] {
  const tm = (t0 + t1) / 2
  const da = tm - t0
  const db = t1 - tm
  const vm = (2 * (x1 - x0) - v0 * da - v1 * db) / (da + db)
  const a: Stretch = { t0, t1: tm, x0, v0, v1: vm, hop: false }
  return [a, { t0: tm, t1, x0: endOf(a), v0: vm, v1, hop: false }]
}

/** The bounces after a landing: flights between the touches, each a little slower along. */
function bounces(touch: readonly number[], x0: number, vx: number): Stretch[] {
  const out: Stretch[] = []
  let x = x0
  let v = vx
  const keep = [0.72, 0.8, 0.85]
  for (let i = 0; i + 1 < touch.length; i++) {
    v *= keep[i] ?? 0.85
    const s: Stretch = { t0: touch[i], t1: touch[i + 1], x0: x, v0: v, v1: v, hop: true }
    out.push(s)
    x = endOf(s)
  }
  return out
}

/** Louise's hop speeds (the ribs follow from where she is), her cruise, and the speed she leaves at (SEAMS.chamber). */
const L_HOP_V = [0.95, 1.25, 1.1]
const V_EXIT = 0.9

function louiseFloor(): Stretch[] {
  const land = LEAP.vel(L_TOUCH[0])
  const out = bounces(L_TOUCH, X_LAND, land[0])
  let last = out[out.length - 1]
  const hopAt = (i: number, x: number): Stretch => ({ t0: L_HOPS[i][0], t1: L_HOPS[i][1], x0: x, v0: L_HOP_V[i], v1: L_HOP_V[i], hop: true })
  // From the last bounce, roll up to the first hop's speed; hop; and so on. Between hops far apart, a cruise.
  const roll = (t1: number, v1: number) => {
    const s: Stretch = { t0: last.t1, t1, x0: endOf(last), v0: last.v1, v1, hop: false }
    out.push(s)
    last = s
  }
  const hop = (i: number) => {
    const s = hopAt(i, endOf(last))
    out.push(s)
    last = s
  }
  roll(L_HOPS[0][0], L_HOP_V[0])
  hop(0)
  roll(L_HOPS[0][1] + 2.4, 1.3)
  roll(L_HOPS[1][0], L_HOP_V[1])
  hop(1)
  roll(L_HOPS[2][0], L_HOP_V[2])
  hop(2)
  roll(T_END, V_EXIT)
  return out
}
const L_FLOOR = louiseFloor()
const at = (track: Stretch[], t: number): Stretch => track.find((s) => t <= s.t1) ?? track[track.length - 1]

/** The ribs she hops, where her hops cross them; and the ribs between, which the two of them roll over. */
const hopRib = (i: number): number => {
  const s = L_FLOOR.find((q) => q.hop && Math.abs(q.t0 - L_HOPS[i][0]) < 1e-9)!
  return xOf(s, (s.t0 + s.t1) / 2)
}
/** The shaft's far end: where it opens into the chamber (the chamber's wall; she is at it at the seam). */
export const X_END = endOf(L_FLOOR[L_FLOOR.length - 1])
const HOP_RIBS = L_HOPS.map((_, i) => hopRib(i))
export const RIBS: Rib[] = (() => {
  const xs = [...HOP_RIBS]
  // Between the first and second hops, and after the last: ribs they roll over, spaced like the rest.
  const a = HOP_RIBS[0]
  const b = HOP_RIBS[1]
  const n = Math.max(1, Math.round((b - a) / 2.5) - 1)
  for (let i = 1; i <= n; i++) xs.push(a + ((b - a) * i) / (n + 1) + 0.22 * Math.sin(i * 2.3))
  const c = HOP_RIBS[2]
  if (X_END - c > 2.4) xs.push(c + (X_END - c) * 0.55)
  return xs.sort((p, q) => p - q).map((x, i) => ({ x, h: 0.095 + 0.02 * Math.sin(i * 1.7 + 0.4), w: 0.38 + 0.05 * Math.cos(i * 2.1) }))
})().filter((r) => r.x > X_LIP + 0.5 && r.x < X_END - 0.4)

/** The rise of the floor's face over the ribs at `x` (0 between them). */
export function ribRise(x: number, grow = 0): number {
  let h = 0
  for (const r of RIBS) {
    const w = r.w + grow
    const d = Math.abs(x - r.x)
    if (d < w) h = Math.max(h, r.h * Math.cos((Math.PI / 2) * (d / w)) ** 2)
  }
  return h
}
/** A ball rolling over them: its centre rides a little wider and smoother than the face. */
const rideRise = (x: number) => ribRise(x, 0.12)

function floorAt(track: Stretch[], t: number): Pt {
  const s = at(track, t)
  const x = xOf(s, t)
  if (s.hop) {
    const u = Math.max(0, Math.min(t, s.t1) - s.t0)
    return [x, REST - (G_SHELL / 2) * u * (s.t1 - s.t0 - u)]
  }
  return [x, REST - rideRise(x)]
}

/* ------------------------------------------------------------------ Ian along the floor */

function ianFloor(): Stretch[] {
  const land = I_LEAP.vel(I_TOUCH[0])
  const out = bounces(I_TOUCH, I_X_LAND, land[0])
  let last = out[out.length - 1]
  const push = (ss: Stretch[]) => {
    out.push(...ss)
    last = ss[ss.length - 1]
  }
  I_HOPS.forEach(([t0, t1], i) => {
    const v = L_HOP_V[i] * (i === I_HOPS.length - 1 ? 0.95 : 1)
    const x0 = HOP_RIBS[i] - (v * (t1 - t0)) / 2
    push(bridge(last.t1, endOf(last), last.v1, t0, x0, v))
    push([{ t0, t1, x0, v0: v, v1: v, hop: true }])
  })
  // To the seam: half a cell behind her, at her speed.
  push(bridge(last.t1, endOf(last), last.v1, T_END, X_END - 0.48, V_EXIT))
  return out
}
const I_FLOOR = ianFloor()

/* ------------------------------------------------------------------ the two of them */

/** Louise, in the part's frame, at show time `t`. */
export function louiseAt(t: number): Pt {
  if (t < T_LEAP) return [deckX(t), deckU(t)]
  if (t < L_TOUCH[0]) return LEAP.at(t)
  return floorAt(L_FLOOR, t)
}
/** Ian, at show time `t`. */
export function ianAt(t: number): Pt {
  if (t < T_LEAP) return [deckX(t), ianDeckU(t)]
  if (t < T_IAN_LEAP) return [deckX(t), ianSlide(t)]
  if (t < I_TOUCH[0]) return I_LEAP.at(t)
  return floorAt(I_FLOOR, t)
}

/**
 * Where each one's mark is (the dot that shows a ball rolling): still while the deck carries them, turning as they
 * roll across it, held through the leap, and rolling along the floor from the landing. It starts where the valley
 * side left it, turned by the camera's quarter roll so it holds its place on the screen at the cut.
 */
const L_SPIN0 = (LIFT_AT[0] + LIFT_EXIT[0] - 0.5) / R + Math.PI / 2
const I_SPIN0 = (LIFT_AT[0] + LIFT_EXIT[0] - 0.5 - 0.42) / R + Math.PI / 2
export function louiseSpin(t: number): number {
  const deck = L_SPIN0 + deckU(Math.min(t, T_LEAP)) / R
  if (t < L_TOUCH[0]) return deck
  return deck + (louiseAt(t)[0] - X_LAND) / R
}
export function ianSpin(t: number): number {
  const deck = I_SPIN0 + (ianSlide(Math.min(t, T_IAN_LEAP)) - I_U0) / R
  if (t < I_TOUCH[0]) return deck
  return deck + (ianAt(t)[0] - I_X_LAND) / R
}

/** Every moment a ball touches down (her landing and bounces and hops, his), for the dust they raise. */
export const TOUCHES: { t: number; who: 'louise' | 'ian' }[] = [
  ...L_TOUCH.map((t) => ({ t, who: 'louise' as const })),
  ...L_HOPS.map(([, t]) => ({ t, who: 'louise' as const })),
  ...I_TOUCH.map((t) => ({ t, who: 'ian' as const })),
  ...I_HOPS.map(([, t]) => ({ t, who: 'ian' as const })),
]

/** The times the lane must break at (so a landing is a segment's end, exactly). */
export const L_BREAKS: number[] = [T0, T_STOP, T_ROLL, T_SWITCH, T_LEAP, ...L_FLOOR.map((s) => s.t0), T_END]

/** For the probes: the speeds the track has. */
export const DEBUG = { LEAP, I_LEAP, L_FLOOR, I_FLOOR, HOP_RIBS }

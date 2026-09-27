import type p5 from 'p5'
import { FLOOR, laneAt, mixHex, type Lane, type Pt, type Seg } from '../../../../../parts'
import { alpha, box, carried, frame, hash, part, route, smooth, type Company, type Companion, type PartShot, type Way } from '../kit'
import { bar, BUILD, onset, SEAM } from '../music'
import { G as GRAVITY, hop } from '../physics'
import { DOOR, drawWarship, drawWings } from '../cast'
import { CASTLE, doorAt, drawCastle, feetAt, HULL_OUTLINE, onBody, STRIDE, type CastlePose } from '../wastes/castle'
import { FLOWERS, HOWL, HOWL_BIRD, ROOM, TOWN, WASTES } from '../worlds'

/**
 * The flower fields (178.051 → 205.86): Howl's gift, the slow waltz in E flat, and the war on the far sky.
 *
 * The valley is drawn in depth, not only in elevation: a horizon under the mountains, the meadow and the lake laid
 * back to it, and everything off Sophie's own plane drawn smaller and higher the further off it is (`depthX`,
 * `depthY`). Her machine stands on her plane; the castle walks off into the depth and comes back out of it.
 *
 * - **The door** (178.051, the slow waltz's hit). The castle sits in the flowers; its door, dial on green, bangs
 *   wide and the two of them come out onto its porch, Howl a step ahead. On the next beat they step off it into the
 *   air, arm in arm as they were over the town, and waltz down one bar to the meadow, Howl turning over her so that
 *   she lands ahead of him (180.622).
 * - **The castle goes** (179.35 →). Behind them it gets up off its haunches, shuts its door and walks away round the
 *   lake, a step a bar, smaller and hazier, and sits again on the far shore (191.4): the curtain going up on the
 *   valley.
 * - **The noria** (183.223 → 187.617). Howl's boyhood water wheel stands in its race, braked, a tub waiting at the
 *   bank. She hops into it on the fourth bar; her weight trips the brake and the stream takes the wheel. It lifts her
 *   up the left side over two bars, the valley opening below, and at the top the cam tips her tub and she drops
 *   into the flume's head on the sixth bar, the strongest note of the waltz.
 * - **The flume** (187.617 → 195.187). She rides the water along the aqueduct over the field. On bars 7, 8 and 9 she
 *   knocks a paddle hanging in the stream; its arm opens a flap under the trough and a shower falls on the bed of
 *   flowers below, which opens (yellow, coral, pink). She is warming toward young all the while (`age.ts`). Howl
 *   walks along below.
 * - **The tipping trough** (195.187 → 197.027). Off the spout into the cup of a see-saw: her weight takes it down to
 *   the shore and she rolls out (195.773); the counterweight swings it back and it clacks on its stump on bar 11.
 * - **The water's edge** (197.0 → 199.6, the music all but silent). She stops at the lake. Howl comes and stands a
 *   step behind her. The castle sits across the water in its reflection.
 * - **The build** (199.639 → 205.86). The fleet comes out from behind the mountains and crosses the sky, and the
 *   lake. The castle starts up on the far shore. Howl looks up; his wings open (201.19) and he climbs away toward
 *   the war, out of shot. The castle wades back across to her low in the water, three strides quickening with the
 *   build (splashing on 201.19, 202.15, 203.06), and kneels into the water on 204.44 as the camera closes on her,
 *   its dial turning to red; she runs for it over the stepping stones, pushing off on the build's beats and landing
 *   on its strong notes; the door bangs open on 205.38 as she lands on its porch, and she is through it at 205.86.
 *
 * Frame: she comes in at (-0.5, 0) on the castle's porch; the meadow is lower, by as much as the sat castle's door
 * is above its feet (`GR`). The castle is the castle builder's: everything here reads it through its API.
 */

/* ------------------------------------------------------------------ the clock */

const s = (n: number, pos = 1): number => bar('slow', n, pos)
const b = (n: number, pos = 1): number => bar('build', n, pos)

/** The door bangs wide: the slow waltz's hit. */
const BANG = SEAM.field
/** They step off the porch, and land in the flowers. */
const STEP_OFF = s(1, 2)
const LAND = s(2, 2)
/** The castle gets up behind them, and shuts its door; its first stride away. */
const RISE: [number, number] = [STEP_OFF + 0.05, s(2, 2) + 0.2]
const SHUT: [number, number] = [s(2), s(2, 2) + 0.4]
const AWAY = [s(3), s(4), s(5), s(6), s(7)]
/** Its three strides back across the lake, and its crouch into the water on b4. */
const RETURN = [bar('build', 1, 3), bar('build', 2, 2), bar('build', 3)]
/** She pushes off the bank, and lands in the tub. */
const HOP_UP = s(3, 3)
const BOARD = s(4)
/** Into the flume's head, off the top of the wheel: the strongest note of the slow waltz. */
const TIP = s(6)
/** The three gates. */
const GATES = [s(7), s(8), s(9)]
/** Off the spout into the trough; out onto the shore; the trough back on its stump. */
const TROUGH = s(10)
const OUT = s(10, 2)
const CLACK = s(11)
/** The build: the fleet, Howl's wings, the push-offs and the stones, the porch. */
const FLEET = BUILD
const WINGS = b(1, 3)
const PUSH = [b(2), b(2, 3), b(3, 3), b(4, 2)]
const STONES = [onset(202.1), b(3), b(4)]
const PORCH = b(4, 3)
const END = SEAM.raid
/** The door comes ajar as the castle kneels into the water for her (b4), the war's red light out of it. */
const AJAR = b(4)
const AJAR_OPEN = 0.5

/** Every strike of this part, in show seconds. */
export const FIELD_HITS: number[] = [
  BANG, LAND, AWAY[0], HOP_UP, BOARD, TIP, ...GATES, TROUGH, OUT, CLACK,
  FLEET, RETURN[0], PUSH[0], STONES[0], RETURN[1], PUSH[1], STONES[1], PUSH[2], STONES[2], PUSH[3], PORCH,
]

/* ------------------------------------------------------------------ small tools */

const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))
const lerp = (a: number, c: number, u: number): number => a + (c - a) * u
const easeIn = (u: number): number => clamp01(u) ** 2
/** A damped ring after an event: 0 before, a decaying sine after. */
const ring = (u: number, a: number, w: number, tau: number): number => (u <= 0 ? 0 : a * Math.exp(-u / tau) * Math.sin(w * u))

/**
 * A smooth monotone curve through knots (show time, value): Fritsch-Carlson, easing from and to rest at the ends and
 * on every flat. What the castle's steps, sit and Howl's strolls ride on, so nothing starts or stops with a jolt.
 */
function eased(knots: [number, number][]): (t: number) => number {
  const n = knots.length
  const ts = knots.map((q) => q[0])
  const vs = knots.map((q) => q[1])
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]))
  const m = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = ts[i] - ts[i - 1]
    const h1 = ts[i + 1] - ts[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t) => {
    if (t <= ts[0]) return vs[0]
    if (t >= ts[n - 1]) return vs[n - 1]
    let i = 0
    while (t > ts[i + 1]) i++
    const h = ts[i + 1] - ts[i]
    const u = (t - ts[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

/** A cubic Hermite from `a` (velocity `va`) to `c` (velocity `vc`) over `T` seconds, at `u` in 0..1. */
function hermite(a: Pt, va: Pt, c: Pt, vc: Pt, T: number, u: number): Pt {
  const u2 = u * u
  const u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2
  return [h00 * a[0] + h10 * T * va[0] + h01 * c[0] + h11 * T * vc[0], h00 * a[1] + h10 * T * va[1] + h01 * c[1] + h11 * T * vc[1]]
}

/* ------------------------------------------------------------------ the valley */

/** The castle sat: how high its door's sill is over its feet. The meadow is that far below the porch. */
const SAT: CastlePose = { t: 0, step: 0, sit: 1 }
const DOOR_UP = -doorAt(SAT)[1]
/** The meadow's surface, and a ball's centre on it. */
const GR = FLOOR + DOOR_UP
const M = GR - FLOOR
/** The lake's surface on her plane (a little under the meadow: its banks). */
const GW = GR + 0.2
/** The horizon, at the mountains' feet. */
const YH = GR - 3.2

/** Where a point of the ground at world `x`, height `y`, `sc` deep (1 on her plane, less further off) is on the screen. */
const depthX = (x: number, sc: number, cx: number): number => cx + (x - cx) * sc
const depthY = (y: number, sc: number): number => YH + (y - YH) * sc

/* ------------------------------------------------------------------ where things stand */

/** The castle's door as they come out of it, and where the castle stands for that. */
const X_DOOR0 = -0.55
const X_C0 = X_DOOR0 - CASTLE.door[0]
/** How far off it sits across the lake. */
const S_FAR = 0.135
const Z_FAR = 1 / S_FAR - 1

/** The wheel: its axle, radius, tubs, and the tub waiting at the bank. */
const NX = 7.05
const RW = 1.9
const NB = 8
const TH_LOAD = (150 * Math.PI) / 180
/** A tub hangs from its pivot on the rim: its rim and floor below the pivot; her centre when she sits in it. */
const TUB_TOP = 0.12
const TUB_BOT = 0.54
const TUB_W = 0.52
const SEAT = TUB_BOT - FLOOR
const AY = M - RW * Math.sin(TH_LOAD) - SEAT
const X_LOAD = NX + RW * Math.cos(TH_LOAD)
/** The race the wheel stands in. */
const PIT: [number, number] = [NX - 1.3, NX + 1.3]

/** The flume: its head inside the wheel's top, its spout at the far end; the floor falls gently along it. */
const F_X0 = NX - 0.15
const F_X1 = NX + 10.8
const F_Y0 = GR - 2.55
const F_Y1 = GR - 1.75
const floorAt = (x: number): number => F_Y0 + ((F_Y1 - F_Y0) * (x - F_X0)) / (F_X1 - F_X0)
/**
 * The trough drawn cut away, as the house draws everything: a tall back wall, the water, and only a low lip in
 * front, so she is seen riding in it. She floats, her middle a little over the water's skin.
 */
const F_WALL = 0.36
const F_WATER = 0.15
const F_LIP = 0.05
const FLOAT = 0.2
/** Where she lands in the head, and where she leaves the spout. */
const F_IN = NX + 0.4
const F_OUT = F_X1 - 0.05

/** The see-saw trough under the spout: its pivot, its arms, and her seat in the cup on the right-hand arm. */
const LC = 1.2
const LW = 0.8
const CUP_LIFT = 0.23
const seatOn = (piv: Pt, a: number): Pt => [piv[0] + LC * Math.cos(a) + CUP_LIFT * Math.sin(a), piv[1] + LC * Math.sin(a) - CUP_LIFT * Math.cos(a)]
const TP_Y = GR - 0.85
/** The beam's angle with her seat at a height (found once). */
function angleFor(y: number, lo: number, hi: number): number {
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (seatOn([0, TP_Y], mid)[1] < y) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
/** Up: the cup under the spout. Down: its lip on the shore. */
const A_UP = angleFor(GR - 1.4, -1.2, 0.3)
const A_DOWN = angleFor(M - 0.04, 0.2, 1.3)
const TP: Pt = [F_OUT + 0.4 - seatOn([0, TP_Y], A_UP)[0], TP_Y]

/** The shore: where she rolls out of the cup, and the lake's left shore on her plane. */
const X_OFF = TP[0] + seatOn([0, 0], A_DOWN)[0] + 0.42
const L0 = X_OFF + 1.67
/**
 * Howl waits at the see-saw's foot, a step beyond where the cup comes down, to hand her down: she rolls out of it
 * and comes to rest a little short of him. In the silence the two of them walk on to the water together, him at the
 * very edge and her a step behind, the same step apart all the way.
 */
const GAP = 0.44
const H_SEE = X_OFF + 0.78
const X_REST = H_SEE - GAP
const H_EDGE = L0 - 0.2
const X_EDGE = H_EDGE - GAP

/* ------------------------------------------------------------------ her run for the door (worked out once) */

interface RunWay {
  T: number
  p: Pt
  arc?: number
  ramp?: [number, number]
}
/** The run: from rest at the edge, push-offs on the build's beats, landings on its strong notes, into the door. */
function theRun(): { ways: RunWay[]; stones: [number, number][]; door: number } {
  const V = [1.7, 1.45, 1.35, 1.3]
  const ways: RunWay[] = []
  const stones: [number, number][] = []
  const start = WINGS + 0.16
  let x = X_EDGE
  ways.push({ T: start, p: [x, M] })
  x += (V[0] / 2) * (PUSH[0] - start)
  ways.push({ T: PUSH[0], p: [x, M], ramp: [0, V[0]] })
  for (let i = 0; i < 4; i++) {
    const land = i < 3 ? STONES[i] : PORCH
    const T = land - PUSH[i]
    const x1 = x + V[i] * T
    ways.push({ T: land, p: [x1, M], arc: (GRAVITY * T * T) / 8 })
    const next = i < 3 ? PUSH[i + 1] : END
    const v1 = i < 3 ? V[i + 1] : 1.0
    const x2 = x1 + ((V[i] + v1) / 2) * (next - land)
    ways.push({ T: next, p: [x2, M], ramp: [V[i], v1] })
    if (i < 3) stones.push([x1 - 0.2, x2 + 0.16])
    x = x2
  }
  return { ways, stones, door: x }
}
const RUN = theRun()
/** The castle's door at the end: she is at its middle as the cut comes. */
const X_DOOR1 = RUN.door
const X_C1 = X_DOOR1 - CASTLE.door[0]
/**
 * How far it has walked after `step` footfalls: a stride a step as it gets up and goes, longer ones once it is off
 * in the distance (the castle's own `travel`, so no planted foot slides), and short wading ones as it comes back
 * across the lake to her, mostly toward us.
 */
const AWAY_TRAVEL = STRIDE + 4.2 + 3 * 5
const X_FAR = X_C0 + AWAY_TRAVEL

/* ------------------------------------------------------------------ the castle's day */

/** Its footfalls: away, a step a bar; back across the lake, three strides quickening with the build. */
const castleStep = eased([
  [RISE[1] - 0.5, 0],
  [AWAY[0], 1],
  [AWAY[1], 2],
  [AWAY[2], 3],
  [AWAY[3], 4],
  [AWAY[4], 5],
  [FLEET + 0.25, 5],
  [RETURN[0], 6],
  [RETURN[1], 7],
  [RETURN[2], 8],
])
const travel = (step: number): number => {
  if (step <= 1) return STRIDE * step
  if (step <= 2) return STRIDE + 4.2 * (step - 1)
  if (step <= 5) return STRIDE + 4.2 + 5 * (step - 2)
  return AWAY_TRAVEL + ((X_C1 - X_FAR) * (step - 5)) / 3
}
/** How low it goes as it wades back across: its hull just off the water. */
const WADE = 0.45
const sitUp = eased([
  [RISE[0], 1],
  [RISE[1], 0],
  [AWAY[4], 0],
  [s(8), 1],
  [FLEET, 1],
  [FLEET + 0.5, WADE],
])
const COME: [number, number][] = [
  [FLEET + 0.25, S_FAR],
  [RETURN[1], 0.4],
  [b(4), 1],
]
const comeScale = eased(COME)
/** Sat, up, sat on the far shore, up again (low, wading), and down into the water for her. */
function castleSit(T: number): number {
  if (T < b(3)) return sitUp(T)
  // It lets itself down, faster and faster, onto the water on the fourth bar; the hull bobs and settles.
  const u = (T - b(3)) / (b(4) - b(3))
  if (u < 1) return WADE + (1 - WADE) * easeIn(u)
  return 1 - ring(T - b(4), 0.028, 20, 0.16)
}
interface CastleNow {
  x: number
  s: number
  feet: number
  pose: CastlePose
}
const HAZE = mixHex(FLOWERS.mountainFar, FLOWERS.sky, 0.5)
/** The valley's noon on the castle's near side: its iron warmed and lifted a little, never washed out. */
const SUN = mixHex(FLOWERS.white, FLOWERS.yellow, 0.3)
/**
 * The air between us and the castle: a little sun on it close by (less once the fleet greys the sky), and only as
 * much blue as a far thing takes on the far shore, where it is small. It is gone well before the castle is near, so
 * the castle wading back reads as solid iron, never a ghost.
 */
function airOn(T: number, sc: number): { haze: number; to: string } {
  const far = smooth(1 - sc, 0.4, 1 - S_FAR)
  const sun = 0.08 * (1 - 0.6 * smooth(T, FLEET, FLEET + 3))
  return { haze: lerp(sun, 0.46, far), to: mixHex(SUN, HAZE, far) }
}
function castleAt(T: number): CastleNow {
  const step = castleStep(T)
  // Going, it shrinks as a thing walking away does; coming back it wades to the middle of the lake on two strides,
  // and comes the last of the way as it kneels, while the camera closes on her.
  const sc = T < COME[0][0] ? 1 / (1 + Z_FAR * smooth(step, 0, 3.4)) : comeScale(T)
  // Into the lake: the bottom falls away under it, so it wades deeper as it comes.
  const feet = step <= 5 ? GR : GR + DOOR_UP * smooth(step, 5.3, 8)
  const sit = castleSit(T)
  // The door: half open as they come through, banged wide on the hit; shut as it gets up; come ajar on the war's
  // light as it kneels for her; banged wide as she lands on the porch.
  let door: number
  if (T < BANG) door = lerp(0.72, 1, easeIn((T - (BANG - 0.12)) / 0.12))
  else if (T < SHUT[0]) door = 1 - Math.abs(ring(T - BANG, 0.07, 24, 0.12))
  else if (T < AJAR) door = 1 - smooth(T, SHUT[0], SHUT[1])
  else if (T < PORCH - 0.14) door = AJAR_OPEN * smooth(T, AJAR, AJAR + 0.6)
  else if (T < PORCH) door = lerp(AJAR_OPEN, 1, easeIn((T - (PORCH - 0.14)) / 0.14))
  else door = 1 - Math.abs(ring(T - PORCH, 0.06, 24, 0.12))
  // The dial, green to red, as it crouches for her.
  const dial = 2 * smooth(T, b(3, 2), b(4) - 0.1) + ring(T - (b(4) - 0.1), 0.06, 26, 0.1)
  // Smoke: a thread sitting, more walking, a great puff when the fleet comes.
  const walking = Math.min(1, Math.abs(castleStep(T + 0.2) - castleStep(T - 0.2)) * 2)
  const startle = T > FLEET ? Math.exp(-(T - FLEET) / 1.2) : 0
  const air = airOn(T, sc)
  const pose: CastlePose = {
    t: T,
    step,
    sit,
    travel,
    smoke: Math.min(1, 0.3 + 0.35 * walking + 0.6 * startle),
    // Its lamps come up window by window as it wades back for her: the war is where it is going.
    lights: smooth(T, b(2, 3), b(4) + 0.4),
    night: 0,
    door,
    dial,
    haze: air.haze,
    hazeTo: air.to,
    dust: 0,
  }
  return { x: X_C0 + travel(step), s: sc, feet, pose }
}

/* ------------------------------------------------------------------ the wheel */

const T_GO = BOARD + 0.12
const T_A = 1.1
/** Her tub reaches the top just before she is to drop into the flume. */
const T_TOP = TIP - 0.2
const OMEGA = ((3 * Math.PI) / 2 - TH_LOAD) / (T_TOP - T_GO - T_A / 2)
/** How far the wheel has turned: braked until her weight trips it, then the stream takes it up to speed. */
function turned(T: number): number {
  if (T <= T_GO) return 0
  const u = (T - T_GO) / T_A
  if (u < 1) return OMEGA * T_A * (u * u * u - (u * u * u * u) / 2)
  return OMEGA * (T_A / 2 + (T - T_GO - T_A))
}
const tubAngle = (i: number, T: number): number => TH_LOAD + (i * 2 * Math.PI) / NB + turned(T)
const pivotOf = (th: number): Pt => [NX + RW * Math.cos(th), AY + RW * Math.sin(th)]
/** The cam at the top tips each tub toward the flume's head, and lets it back. */
function tipOf(th: number): number {
  const d = ((((th * 180) / Math.PI) % 360) + 360) % 360
  return 1.15 * smooth(d, 246, 272) * (1 - smooth(d, 292, 318))
}
/** A tub's hang: swung by her landing in it (hers) and by the wheel's start (all), and tipped at the top. */
function tubTilt(i: number, T: number): number {
  let a = tipOf(tubAngle(i, T)) - ring(T - T_GO, 0.07, 4.4, 0.6)
  if (i === 0) a += ring(T - BOARD, 0.09, 4.6, 0.5)
  return a
}
/** Her centre in her tub: sitting in its bottom, and as the cam tips it at the top, rolling up to its mouth. */
function inTub(T: number): Pt {
  const [px, py] = pivotOf(tubAngle(0, T))
  const a = tubTilt(0, T)
  const d = lerp(SEAT, TUB_TOP - 0.03, smooth(tipOf(tubAngle(0, T)), 0.3, 1.05))
  return [px - Math.sin(a) * d, py + Math.cos(a) * d]
}
/** She leaves the tub when it has tipped enough to spill her. */
const T_LEAVE = (() => {
  let lo = BOARD
  let hi = TIP
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (tipOf(tubAngle(0, mid)) < 1.05) lo = mid
    else hi = mid
  }
  return Math.min(lo, TIP - 0.25)
})()
/** When the first tub pours: the flume's water starts from its head then. */
const T_POUR = (() => {
  for (let T = T_GO; T < TIP; T += 0.01) for (let i = 1; i < NB; i++) if (tipOf(tubAngle(i, T)) > 0.5) return T
  return T_GO + 1
})()

/* ------------------------------------------------------------------ the flume */

const T_SPOUT = TROUGH - 0.29
const V_F = (F_OUT - F_IN) / (T_SPOUT - TIP)
const inFlume = (T: number): Pt => {
  const x = F_IN + V_F * (T - TIP)
  return [x, floorAt(x) - FLOAT]
}
/** Each gate's paddle, where her leading edge meets it on its bar; its flap and bed a little upstream. */
const GATE_X = GATES.map((T) => inFlume(T)[0] + FLOOR + 0.03)
const BED_X = GATE_X.map((x) => x - 0.3)
const BED_COLORS = [FLOWERS.yellow, FLOWERS.coral, FLOWERS.pink]
const TRESTLES = [NX + 1.95, (GATE_X[0] + GATE_X[1]) / 2 - 0.1, (GATE_X[1] + GATE_X[2]) / 2 - 0.1, F_X1 - 1.1]

/* ------------------------------------------------------------------ the trough */

function troughAngle(T: number): number {
  if (T < TROUGH) return A_UP
  if (T < OUT) return lerp(A_UP, A_DOWN, easeIn((T - TROUGH) / (OUT - TROUGH)))
  const back = OUT + 0.3
  if (T < back) return A_DOWN - Math.abs(ring(T - OUT, 0.05, 20, 0.08))
  if (T < CLACK) return lerp(A_DOWN, A_UP, easeIn((T - back) / (CLACK - back)))
  return A_UP + Math.abs(ring(T - CLACK, 0.07, 22, 0.1))
}

/* ------------------------------------------------------------------ her way down, and Howl's */

/** The waltz down off the porch: the pair's middle goes down to the meadow, and he turns over her. */
const PAIR = 0.18
const MID0: Pt = [-0.5 + 0.6 * (STEP_OFF - BANG) + PAIR, 0]
const MID1: Pt = [1.72, M]
const midAt = (T: number): Pt => hermite(MID0, [0.6, 0], MID1, [0.55, 0.5], LAND - STEP_OFF, clamp01((T - STEP_OFF) / (LAND - STEP_OFF)))
const turnAt = (T: number): number => Math.PI * smooth(T, STEP_OFF, LAND)
const herDown = (T: number): Pt => {
  const [mx, my] = midAt(T)
  const a = turnAt(T)
  return [mx - PAIR * Math.cos(a), my + PAIR * Math.sin(a)]
}
const hisDown = (T: number): Pt => {
  const [mx, my] = midAt(T)
  const a = turnAt(T)
  return [mx + PAIR * Math.cos(a), my - PAIR * Math.sin(a)]
}
const X_LAND = MID1[0] + PAIR

/**
 * Howl on the meadow, always in her picture: behind her to the wheel, where he waits while it takes her up; over
 * the race on its plank as she nears the top; then along the bank under the flume at her pace, a step ahead of
 * her, so each bed opens behind him as she knocks its paddle; on to the see-saw's foot to hand her down; and on to
 * the water with her, a step ahead.
 */
const H_WAIT_WHEEL = X_LOAD - 1.25
const H_LEAD = 0.6
const howlWalk = eased([
  [LAND, X_LAND - 2 * PAIR],
  [BOARD - 0.2, H_WAIT_WHEEL],
  [BOARD + 1.4, H_WAIT_WHEEL],
  ...[TIP, ...GATES, T_SPOUT].map((T): [number, number] => [T, inFlume(T)[0] + H_LEAD]),
  [OUT, H_SEE],
  [CLACK + 1.3, H_SEE],
  [CLACK + 2.3, H_EDGE],
])
function howlAt(T: number, T0: number): Companion | null {
  if (T < STEP_OFF) return { x: -0.5 + 0.6 * (T - T0) + 2 * PAIR, y: 0 }
  if (T < LAND) {
    const [x, y] = hisDown(T)
    return { x, y }
  }
  if (T < FLEET) return { x: howlWalk(T), y: M }
  // He looks up at the fleet: a lift toward it, and back.
  const look = 0.08 * smooth(T, FLEET + 0.1, FLEET + 0.6) * (1 - smooth(T, WINGS - 0.5, WINGS - 0.1))
  const x0 = H_EDGE - look * 0.5
  const y0 = M - look
  if (T < WINGS) return { x: x0, y: y0 }
  // The climb: from rest, straight up off the edge at first (she runs out under him for the stones), then away to
  // the left toward the fleet, faster and faster, the bird coming over him.
  const u = T - WINGS
  const up = u < 1.3 ? 1.6 * u * u : 1.6 * 1.69 + 4.16 * (u - 1.3)
  const lean = Math.max(0, u - 0.4)
  const left = u < 1.5 ? 0.45 * lean * lean : 0.45 * 1.21 + 0.99 * (u - 1.5)
  return { x: x0 - left, y: y0 - up, color: mixHex(HOWL, HOWL_BIRD, smooth(T, WINGS, WINGS + 1.4)) }
}

/* ------------------------------------------------------------------ the part */

interface FieldState {
  begin: number
  /** Her lane, so the war's light out of the door can catch her. */
  lane: Lane
}

export const field = part<FieldState>(
  {
    name: 'field',
    flight: true,
    draw: (p, st, c) => drawField(p, c.k, c.weight, c.ink, st.begin + c.t, st.begin),
    over: (p, st, c) => {
      drawFlumeFront(p, c.k, c.weight, c.ink, st.begin + c.t)
      drawLightOnHer(p, c.k, st, st.begin + c.t)
    },
  },
  (slot) => {
    const T0 = slot.begin
    const at = (T: number) => T - T0
    const segs: Seg[] = []
    let last: Way = { at: 0, p: [-0.5, 0] }
    const push = (ways: Way[]) => {
      segs.push(...route([last, ...ways]))
      last = ways[ways.length - 1]
    }
    const ride = (fn: (T: number) => Pt, T1: number, n: number) => {
      segs.push(...carried((u) => fn(T0 + u), last.at, at(T1), n))
      last = { at: at(T1), p: fn(T1) }
    }
    // Out of the door along the porch, then the waltz down to the meadow.
    push([{ at: at(STEP_OFF), p: herDown(STEP_OFF) }])
    ride(herDown, LAND, 80)
    // Across the flowers to the wheel's bank, gathering pace, and up into the waiting tub.
    const hopFrom: Pt = [X_LOAD - 0.64, M]
    const vHop = (X_LOAD - hopFrom[0]) / (BOARD - HOP_UP)
    const v0 = 0.55
    const tWalk = HOP_UP - LAND
    const dWalk = hopFrom[0] - X_LAND
    // Two ramps: up from the landing's pace to a stroll, and easing to the hop's.
    const tA = tWalk * 0.7
    const vPeak = (2 * dWalk - v0 * tA - vHop * (tWalk - tA)) / tWalk
    const xA = X_LAND + ((v0 + vPeak) / 2) * tA
    push([
      { at: at(LAND + tA), p: [xA, M], ramp: [v0, vPeak] },
      { at: at(HOP_UP), p: hopFrom, ramp: [vPeak, vHop] },
    ])
    push([hop(last, inTub(BOARD), at(BOARD))])
    // Up the wheel in the tub, and spilled into the flume's head.
    ride(inTub, T_LEAVE, 180)
    push([hop(last, inFlume(TIP), at(TIP))])
    // Along the flume on the water, and off its spout into the trough's cup.
    push([{ at: at(T_SPOUT), p: inFlume(T_SPOUT) }])
    const seatAt = (T: number): Pt => seatOn(TP, troughAngle(T))
    push([hop(last, seatAt(TROUGH), at(TROUGH))])
    // The cup goes down with her; she rolls out onto the shore and comes to rest a step short of Howl.
    ride(seatAt, OUT, 30)
    push([{ at: at(OUT + 0.3), p: [X_OFF, M] }])
    const vOff = (X_OFF - seatAt(OUT)[0]) / 0.3
    const tRest = OUT + 0.3 + (X_REST - X_OFF) / (vOff / 2)
    push([{ at: at(tRest), p: [X_REST, M], ramp: [vOff, 0] }])
    // The silence: on to the water's edge with him.
    push([
      { at: at(CLACK + 1.3), p: [X_REST, M] },
      { at: at(CLACK + 2.3), p: [X_EDGE, M], ease: 'inout' },
    ])
    // The fleet: she looks up at it as he does, and is still looking up as his wings open over her.
    push([
      { at: at(FLEET + 0.45), p: [X_EDGE, M] },
      { at: at(FLEET + 1.05), p: [X_EDGE, M - 0.07], ease: 'inout' },
      { at: at(WINGS - 0.1), p: [X_EDGE, M - 0.07] },
      { at: at(WINGS + 0.16), p: [X_EDGE, M], ease: 'inout' },
    ])
    // The run for the door.
    for (const w of RUN.ways) {
      const way: Way = { at: at(w.T), p: w.p }
      if (w.arc) way.arc = w.arc
      if (w.ramp) way.ramp = w.ramp
      if (Math.abs(way.at - last.at) < 1e-9) continue
      push([way])
    }
    const company: Company[] = [{ who: 'howl', from: T0, to: slot.end, at: (T) => howlAt(T, T0) }]
    return {
      cells: box(-14, YH - 12, X_DOOR1 + 14, GR + 5, 2),
      exit: [RUN.door + 0.5, M] as Pt,
      lane: { segs, fire: 0 },
      state: { begin: T0, lane: { segs, fire: 0 } },
      company,
    }
  },
  () => {
    const keys: PartShot[] = [
      // The door bangs wide on the slow waltz's hit and the picture opens wide on it (the score's scale match cut,
      // `SEAMS.field.open`): the castle sat in the valley, the two of them small at its door, the wheel, the lake and
      // the mountains. The wide is the hit's alone: from it the camera settles straight in on the two of them as they
      // waltz down, close by the time they land, and stays close through her machine (the mechanism cropped, never
      // her), Howl in the picture with her all the way: below her at the wheel, walking the bank under the flume at
      // her pace, waiting at the see-saw's foot. Along the flume she rides a little above the middle, so the castle
      // walking off to sit across the lake is whole over her and the meadow at the foot is no more than it needs.
      { t: STEP_OFF + 1.5, cells: 6.9, off: [1.5, -0.9] },
      { t: LAND, cells: 6.8, off: [1.5, -0.9] },
      { t: HOP_UP, cells: 6.6, off: [1.2, -1.0] },
      { t: TIP, cells: 6.8, off: [1.6, 0.45] },
      { t: GATES[1], cells: 6.6, off: [1.4, 0.3] },
      { t: TROUGH, cells: 6.8, off: [1.2, -0.15] },
      { t: CLACK, cells: 7.2, hold: [X_REST + 2.0, GR - 2.1], w: 0.75 },
      { t: FLEET - 0.03, cells: 7.5, hold: [X_EDGE + 1.7, GR - 2.3], w: 0.75 },
      // The build: on its first note a cut out wide and up, the fleet coming out over the mountains (and into the
      // lake, in its reflection), the two of them small at the water's edge looking up at it, Howl rising off the
      // edge into the bird; on the bar's last strike a cut in to her, still looking up, as he climbs away over her;
      // and on with her running for the castle.
      { t: FLEET, cells: 10.5, hold: [X_REST + 2.6, GR - 3.25], w: 1, cut: true },
      { t: 201.189 - 0.03, cells: 10.8, hold: [X_REST + 2.6, GR - 3.4], w: 1 },
      { t: 201.189, cells: 6.9, off: [0.9, -1.4], cut: true },
      { t: STONES[0] + 0.2, cells: 6.6, off: [1.0, -1.3] },
      { t: STONES[1], cells: 6.4, off: [0.9, -0.6] },
      // The kneel: framed low, the lake and its reflection the bottom half and the hull's keel at the middle, the
      // door coming ajar on the war's red light over the water.
      { t: b(3, 3), cells: 6.2, off: [0.7, 0.2] },
      { t: b(4), cells: 6.0, off: [0.6, 0.25] },
      { t: PORCH, cells: 5.2, off: [0.8, -0.4] },
      { t: END, cells: 4.5, off: [0.9, -0.8] },
    ]
    return keys
  },
)

/* ------------------------------------------------------------------ drawing: the far things */

type Frame = ReturnType<typeof frame>

function drawSky(p: p5, k: number, f: Frame, T: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const war = smooth(T, FLEET, FLEET + 3)
  const g = ctx.createLinearGradient(0, (YH - 9) * k, 0, YH * k)
  g.addColorStop(0, mixHex(FLOWERS.skyHigh, FLOWERS.fleet, 0.18 * war))
  g.addColorStop(1, mixHex(mixHex(FLOWERS.sky, FLOWERS.white, 0.35), FLOWERS.fleet, 0.1 * war))
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (Math.max(f.y1, YH + 1) - f.y0) * k)
  // Clouds: long, flat-bottomed, soft, drifting; far off, so they hardly move with the camera.
  p.noStroke()
  for (let i = 0; i < 4; i++) {
    const wx = i * 23 - 8 + T * 0.12
    const cx = depthX(wx, 0.04, f.cx) + (i % 2 ? 6 : -3)
    const cy = YH - 5.8 - (i % 3) * 0.9
    const w = 3.2 + hash(i, 3) * 2.4
    p.fill(alpha(p, FLOWERS.white, 0.6 - 0.12 * war))
    for (let j = 0; j < 7; j++) {
      const u = j / 6 - 0.5
      const r = (0.55 + 0.35 * Math.cos(u * Math.PI)) * w * 0.34 * (0.8 + 0.4 * hash(i, j))
      p.ellipse((cx + u * w) * k, (cy - r * 0.35) * k, r * 1.7 * k, r * 0.9 * k)
    }
    p.ellipse(cx * k, cy * k, w * 1.15 * k, 0.5 * k)
  }
}

/** A range of mountains, as a silhouette over the horizon: far and snowy, or nearer and darker. */
interface Range {
  par: number
  step: number
  lo: number
  hi: number
  seed: number
  fill: string
  snow: number
}
const RANGES: Range[] = [
  { par: 0.05, step: 70, lo: 2.6, hi: 5.0, seed: 1, fill: FLOWERS.mountainFar, snow: 3.3 },
  { par: 0.12, step: 34, lo: 1.1, hi: 2.5, seed: 2, fill: FLOWERS.mountain, snow: 9 },
]
function ridge(r: Range, X: number, cx: number): number {
  const xm = (X - cx * (1 - r.par)) / r.par
  const i0 = Math.floor(xm / r.step)
  let h = 0
  for (let i = i0 - 2; i <= i0 + 2; i++) {
    const px = (i + 0.2 + 0.6 * hash(i, r.seed)) * r.step
    const ph = lerp(r.lo, r.hi, hash(i, r.seed, 1))
    const d = Math.abs(xm - px) / r.step
    const slope = 1.6 + hash(i, r.seed, 2)
    h = Math.max(h, ph * Math.max(0, 1 - d * slope * 0.9) ** 1.25)
  }
  return h + 0.12 * Math.sin(xm * 0.9 + r.seed) * Math.min(1, h)
}
function drawRanges(p: p5, k: number, f: Frame, T: number, flip: boolean, which: number[]): void {
  const sgn = flip ? -1 : 1
  const war = smooth(T, FLEET, FLEET + 3)
  for (const ri of which) {
    const r = RANGES[ri]
    const x0 = f.x0 - 0.5
    const x1 = f.x1 + 0.5
    const n = Math.ceil((x1 - x0) / 0.12)
    const pts: Pt[] = []
    for (let i = 0; i <= n; i++) {
      const X = x0 + ((x1 - x0) * i) / n
      pts.push([X, ridge(r, X, f.cx)])
    }
    // In the lake the ranges lie softer: toward the water's own blue, and their snow only a paler cap on them.
    const body = mixHex(r.fill, FLOWERS.fleet, 0.12 * war)
    p.noStroke()
    p.fill(flip ? mixHex(body, FLOWERS.lake, 0.5) : body)
    p.beginShape()
    p.vertex(x0 * k, (YH + sgn * 0.6) * k)
    for (const [X, h] of pts) p.vertex(X * k, (YH - sgn * h) * k)
    p.vertex(x1 * k, (YH + sgn * 0.6) * k)
    p.endShape(p.CLOSE)
    if (r.snow > 8) continue
    // The snow: the peaks above the snowline, with a ragged lower edge.
    p.fill(flip ? mixHex(mixHex(FLOWERS.snow, body, 0.45), FLOWERS.lake, 0.25) : FLOWERS.snow)
    let run: Pt[] = []
    const flush = () => {
      if (run.length > 2) {
        p.beginShape()
        for (const [X, h] of run) p.vertex(X * k, (YH - sgn * h) * k)
        for (let j = run.length - 1; j >= 0; j--) {
          const [X, h] = run[j]
          const edge = flip ? Math.max(r.snow, h - 0.45) : Math.max(r.snow, h - 0.5 - 0.35 * hash(Math.round(X * 8), 7))
          p.vertex(X * k, (YH - sgn * Math.min(h, edge)) * k)
        }
        p.endShape(p.CLOSE)
      }
      run = []
    }
    for (const q of pts) {
      if (q[1] > r.snow) run.push(q)
      else flush()
    }
    flush()
  }
}

/**
 * The fleet: three warships coming out from behind the far range at the left, small and pale, and crossing the sky
 * over the valley to the right in a line. So far off they move with the sky, not the ground.
 */
function fleetShips(T: number, cx: number): { x: number; y: number; sc: number; a: number }[] {
  const out: { x: number; y: number; sc: number; a: number }[] = []
  if (T < FLEET - 0.2) return out
  // Once the camera has gone in on her (202 →) they come on over the valley, higher and a little nearer: overhead,
  // out of her picture, where the near water under her reflects them.
  const over = smooth(T, 202.0, 205.6)
  for (let i = 0; i < 3; i++) {
    const u = T - FLEET - i * 0.7
    const y = YH - 3.3 + i * 0.55 + Math.sin(T * 0.8 + i) * 0.04 - (2.1 + 0.35 * i) * over
    out.push({ x: cx - 7.8 + i * 2.3 + u * 1.2 - 3.4 * over, y, sc: (0.34 - i * 0.04) * (1 + 0.3 * over), a: smooth(u, -0.3, 1.1) })
  }
  return out
}
function drawFleet(p: p5, k: number, W: number, ink: string, T: number, cx: number, flip: boolean, dark = false): void {
  for (const sh of fleetShips(T, cx)) {
    if (sh.a <= 0.01) continue
    p.push()
    p.translate(sh.x * k, (flip ? 2 * YH - sh.y : sh.y) * k)
    if (flip) p.scale(1, -1)
    // Seen against the bright sky overhead (in the near water) they are dark shapes, not pale ones.
    const body = dark ? mixHex(FLOWERS.fleet, WASTES.ironDark, 0.6) : mixHex(FLOWERS.fleet, FLOWERS.mountainFar, 0.2)
    drawWarship(p, k * sh.sc, W * 0.55, mixHex(ink, FLOWERS.mountainFar, dark ? 0.1 : 0.4), { t: T, face: 1, color: body, light: sh.a })
    p.pop()
  }
}

/* ------------------------------------------------------------------ drawing: the ground and the lake */

/** The lake's far shore (depth, by world x), and its left shore (world x, by depth). */
const S_SHORE = S_FAR + 0.02
const farShore = (x: number): number => S_SHORE + 0.018 * Math.sin(x * 0.31) + 0.01 * Math.sin(x * 0.83 + 1)
const leftShore = (sc: number): number => (sc >= 1 ? L0 + 2.4 * (sc - 1) : L0 - 12.5 * (1 - sc) ** 0.85)
/**
 * Its near shore. No 16:9 frame of this part sees the water this close (the deepest a frame's foot reaches with the
 * lake in it is 2.07, as she rolls out of the trough; the turn starts at 2.18), so it changes nothing there; a phone held upright, seeing on down below the 16:9 box, sees the left shore
 * round into it and the lake end in grass, not run on off the bottom of the picture as a thin blue wedge.
 */
const S_NEAR = 2.5
const S_TURN = 0.32
const X_TURN = leftShore(S_NEAR - S_TURN)
const R_TURN = 2.2
const nearShore = (x: number): number => S_NEAR + smooth(x, X_TURN + R_TURN, X_TURN + R_TURN + 4) * (0.035 * Math.sin(x * 0.23 + 0.7) + 0.015 * Math.sin(x * 0.61))
const inLake = (x: number, sc: number): boolean => sc >= farShore(x) && x > leftShore(sc) - 0.1 && sc <= nearShore(x)

/**
 * The lake's outline on the screen, for the camera where it is now: along the near shore from off the right of the
 * frame, round the turn into the left shore, up it to the far shore, and along that off the right again. Each point
 * carries how thick the bank's lip is there (`lip`).
 */
function lakeOutline(f: Frame): { pts: Pt[]; lip: number[] } {
  const cx = f.cx
  const pts: Pt[] = []
  const lip: number[] = []
  const at = (x: number, sc: number, t: number) => {
    pts.push([depthX(x, sc, cx), depthY(GW, sc)])
    lip.push(t)
  }
  const leftLip = (sc: number): number => Math.min(0.2, 0.06 + 0.14 * clamp01((sc - S_SHORE) / (1 - S_SHORE)))
  // The near shore, right to left.
  const x0 = X_TURN + R_TURN
  const xn = Math.max(x0 + 1, cx + (f.x1 + 1 - cx) / S_NEAR)
  for (let i = 0; i <= 30; i++) at(lerp(xn, x0, i / 30), nearShore(lerp(xn, x0, i / 30)), 0.08)
  // The turn: a quarter of an ellipse, from along the near shore to up the left one.
  for (let i = 1; i < 12; i++) {
    const a = ((1 - i / 12) * Math.PI) / 2
    const sc = S_NEAR - S_TURN + S_TURN * Math.sin(a)
    at(X_TURN + R_TURN * (1 - Math.cos(a)), sc, lerp(leftLip(sc), 0.08, Math.sin(a)))
  }
  // Up the left shore to the far one, finely enough that no chord cuts across its bend (a coarse one drew a thin blue
  // wedge down into the grass).
  for (let i = 0; i <= 72; i++) {
    const sc = lerp(S_NEAR - S_TURN, S_SHORE, i / 72)
    at(leftShore(sc), sc, leftLip(sc))
  }
  const xl = leftShore(S_SHORE)
  const xr = cx + (f.x1 + 1 - cx) / S_SHORE
  for (let i = 0; i <= 40; i++) {
    const x = lerp(xl, xr, i / 40)
    at(x, farShore(x), 0.06)
  }
  // Down the right, off the frame, to where it began.
  pts.push([Math.max(f.x1 + 1, pts[0][0]), pts[pts.length - 1][1]], [Math.max(f.x1 + 1, pts[0][0]), pts[0][1]])
  lip.push(0, 0)
  return { pts, lip }
}
function tracePath(ctx: CanvasRenderingContext2D, k: number, pts: Pt[]): void {
  ctx.moveTo(pts[0][0] * k, pts[0][1] * k)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * k, pts[i][1] * k)
  ctx.closePath()
}

/** The meadow: the ground from the horizon down, between two heights on the screen. */
function drawMeadow(p: p5, k: number, f: Frame, y0: number, y1: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, YH * k, 0, (GR + 2.2) * k)
  g.addColorStop(0, mixHex(FLOWERS.meadowFar, FLOWERS.mountainFar, 0.35))
  g.addColorStop(0.25, FLOWERS.meadowFar)
  g.addColorStop(0.75, FLOWERS.meadow)
  g.addColorStop(1, FLOWERS.meadowDeep)
  ctx.fillStyle = g
  const top = Math.max(y0, YH)
  ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (y1 - top) * k)
}

/**
 * The meadow's flower colours: warm ones and white only. Nothing lilac, blue or grey, which is the two of them
 * (Howl's cornflower, her lavender-grey going chestnut): a flower in their colours beside them reads as a third ball.
 */
const ROSE = mixHex(FLOWERS.pink, FLOWERS.coral, 0.45)
/** Drifts of flowers across the meadow: which colour grows thick where, by world x and depth. */
function drift(x: number, sc: number): { c: string; d: number } {
  const band = Math.sin(x * 0.21 + sc * 11) + Math.sin(x * 0.07 - sc * 5 + 2)
  const i = Math.floor(((band + 2) / 4) * 4.999)
  const cs = [FLOWERS.white, FLOWERS.yellow, FLOWERS.pink, ROSE, FLOWERS.yellow]
  return { c: cs[Math.max(0, Math.min(4, i))], d: 0.35 + 0.65 * Math.abs(Math.sin(x * 0.37 + sc * 7.3)) }
}
/** A flower head's eye: a warm dot in the middle of the petals. */
const EYE: Record<string, string> = {
  [FLOWERS.white]: FLOWERS.yellow,
  [FLOWERS.yellow]: mixHex(FLOWERS.yellow, FLOWERS.coral, 0.55),
  [FLOWERS.pink]: FLOWERS.yellow,
  [ROSE]: FLOWERS.yellow,
  [FLOWERS.coral]: mixHex(FLOWERS.yellow, FLOWERS.white, 0.3),
}
/** No head is bigger than a third of a ball across its middle, however near: never a round thing their size. */
const HEAD = FLOOR / 3

/**
 * Their way through the meadow, kept to plain grass: the waltz down off the porch (the two of them), and along her
 * plane from where they land to the water's edge (to the wheel, where Howl walks on under the flume, where she rolls
 * out of the trough, and where the two of them stand and wait at the lake). As polylines in (world x, screen y).
 */
const LANE: Pt[][] = (() => {
  const her: Pt[] = [[-0.5, 0]]
  const his: Pt[] = [[-0.5 + 2 * PAIR, 0]]
  for (let i = 0; i <= 16; i++) {
    const T = lerp(STEP_OFF, LAND, i / 16)
    her.push(herDown(T))
    his.push(hisDown(T))
  }
  return [her, his, [[X_LAND - 2 * PAIR, M], [H_EDGE + 0.3, M]]]
})()
const LANE_BOX = (() => {
  const all = LANE.flat()
  return {
    x0: Math.min(...all.map((q) => q[0])) - 1,
    x1: Math.max(...all.map((q) => q[0])) + 1,
    y0: Math.min(...all.map((q) => q[1])) - 1,
    y1: Math.max(...all.map((q) => q[1])) + 1,
  }
})()
/** How far a point of the meadow is from their way. */
function fromLane(x: number, y: number): number {
  if (x < LANE_BOX.x0 || x > LANE_BOX.x1 || y < LANE_BOX.y0 || y > LANE_BOX.y1) return Infinity
  let best = Infinity
  for (const line of LANE) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i]
      const [bx, by] = line[i + 1]
      const dx = bx - ax
      const dy = by - ay
      const u = clamp01(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))
      best = Math.min(best, Math.hypot(x - ax - u * dx, y - ay - u * dy))
    }
  }
  return best
}

/**
 * The meadow's flowers, in rows back to the horizon: small flat heads far off; near, on stems, each a little floret
 * of three to five petals round an eye, or an upright spike of buds; never one round dot. None along their way (a
 * ragged-edged lane about 0.8 cell each side, fixed to the ground so nothing comes or goes as the camera moves).
 * Every head of a colour goes in one path, so the field is a few fills, not thousands.
 */
function drawSpecks(p: p5, k: number, f: Frame, T: number, near: boolean): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const paths = new Map<string, Path2D>()
  const eyes = new Map<string, Path2D>()
  const stems = new Path2D()
  const add = (m: Map<string, Path2D>, c: string): Path2D => {
    let q = m.get(c)
    if (!q) {
      q = new Path2D()
      m.set(c, q)
    }
    return q
  }
  const blob = (q: Path2D, x: number, y: number, rx: number, ry: number, rot: number) => {
    q.moveTo((x + rx * Math.cos(rot)) * k, (y + rx * Math.sin(rot)) * k)
    q.ellipse(x * k, y * k, rx * k, ry * k, rot, 0, Math.PI * 2)
  }
  // A flower head at (hx, hy): an upright spike of three or four buds, smaller toward the top, or a floret of three
  // to five petals round a warm eye, tilted a little toward us.
  const head = (c: string, hx: number, hy: number, r: number, spike: boolean, n: number, rot: number) => {
    if (spike) {
      for (let q = 0; q < n; q++) {
        const br = r * 0.5 * (1 - 0.14 * q)
        blob(add(paths, c), hx, hy - q * r * 0.72, br * 0.8, br, 0)
      }
      return
    }
    for (let q = 0; q < n; q++) {
      const a = rot + (q * 2 * Math.PI) / n
      const ex = Math.cos(a)
      const ey = Math.sin(a) * 0.7
      blob(add(paths, c), hx + ex * r * 0.5, hy + ey * r * 0.5, r * 0.5, r * 0.26, Math.atan2(ey, ex))
    }
    blob(add(eyes, EYE[c] ?? FLOWERS.yellow), hx, hy, r * 0.24, r * 0.2, 0)
  }
  // Rows back to the horizon, closer together far off; many small heads, so the meadow is a carpet of colour
  // without any one of them being a thing her size.
  const rows = near
    ? [1.03, 1.07, 1.11, 1.16, 1.21, 1.27, 1.33, 1.4, 1.48, 1.58]
    : Array.from({ length: 22 }, (_, j) => 0.3 * (0.97 / 0.3) ** (j / 21))
  for (let j = 0; j < rows.length; j++) {
    const sc = rows[j]
    const Y = depthY(GR, sc)
    if (Y < f.y0 - 0.5 || Y > f.y1 + 1) continue
    const d = (near ? 0.36 : 0.3) / Math.max(0.45, sc)
    const xw0 = f.cx + (f.x0 - 1 - f.cx) / sc
    const xw1 = f.cx + (f.x1 + 1 - f.cx) / sc
    for (let i = Math.floor(xw0 / d); i <= Math.ceil(xw1 / d); i++) {
      const x = (i + hash(i, j, 11)) * d
      const dr = drift(x, sc)
      if (hash(i, j, 12) > dr.d) continue
      if (inLake(x, sc)) continue
      if (sc > 0.98 && sc < 1 + RACE_D / (GR - YH) + 0.05 && x > PIT[0] - 0.35 && x < PIT[1] + 0.35) continue
      const yy = Y + (hash(i, j, 13) - 0.5) * 0.12 * sc
      const stem = near ? (0.1 + 0.14 * hash(i, j, 17)) * sc : 0
      if (fromLane(x, yy - stem) < 0.6 + 0.4 * hash(i, j, 18)) continue
      const X = depthX(x, sc, f.cx)
      const c = hash(i, j, 14) < 0.72 ? dr.c : [FLOWERS.white, FLOWERS.coral, FLOWERS.yellow][Math.floor(hash(i, j, 15) * 3)]
      if (!near) {
        // Far off, a head is a fleck wider than it is tall: a flower seen from the side.
        const rf = (0.03 + 0.03 * hash(i, j, 16)) * sc
        blob(add(paths, c), X, yy, Math.min(HEAD, rf * 1.3), rf * 0.6, 0)
        continue
      }
      const r = Math.min(HEAD, (0.024 + 0.022 * hash(i, j, 16)) * sc)
      // Near, a plant: a stem to its head, and in a spray one or two more on shorter branches off it.
      const sway = Math.sin(T * 1.3 + x * 0.7) * 0.03 * sc
      const hx = X + sway
      const hy = yy - stem
      stems.moveTo(X * k, yy * k)
      stems.lineTo(hx * k, hy * k)
      const spike = hash(i, j, 19) < 0.3
      const n = spike ? (hash(i, j, 20) < 0.5 ? 3 : 4) : 3 + Math.floor(hash(i, j, 20) * 2.999)
      const rot = hash(i, j, 21) * Math.PI * 2 + T * 0.2 * (hash(i, j, 22) - 0.5)
      head(c, hx, hy, r, spike, n, rot)
      const more = spike ? 0 : Math.floor(hash(i, j, 23) * 2.6)
      for (let q = 0; q < more; q++) {
        const side = (q === 0) === hash(i, j, 24) < 0.5 ? 1 : -1
        const fx = X + (hx - X) * 0.55
        const fy = yy - stem * (0.45 + 0.15 * q)
        const bx = fx + side * (0.07 + 0.05 * hash(i, j, 25 + q)) * sc + sway * 0.6
        const by = fy - stem * (0.28 + 0.12 * hash(i, j, 27 + q))
        stems.moveTo(fx * k, fy * k)
        stems.lineTo(bx * k, by * k)
        head(c, bx, by, r * 0.78, false, n, rot + 1.1 * (q + 1))
      }
    }
  }
  if (near) {
    ctx.strokeStyle = FLOWERS.meadowDeep
    ctx.lineWidth = Math.max(0.6, k * 0.012)
    ctx.stroke(stems)
  }
  for (const m of [paths, eyes]) {
    for (const [c, q] of m) {
      ctx.fillStyle = c
      ctx.fill(q)
    }
  }
}

/** The lake's own colour at a height on the screen, below its far shore's pale band (as `drawLake`'s gradient has it). */
function lakeAt(y: number, war: number): string {
  const top = depthY(GW, S_SHORE)
  const y35 = top + 0.35 * (GR + 2.5 - top)
  return mixHex(FLOWERS.lake, mixHex(FLOWERS.lakeDeep, FLOWERS.fleet, 0.2 * war), clamp01((y - y35) / (GR + 2.5 - y35)))
}

/** The lake between two heights on the screen: the sky in it, the mountains and the fleet upside down, the castle's reflection. */
function drawLake(p: p5, k: number, W: number, ink: string, f: Frame, T: number, y0: number, y1: number, castle: CastleNow | null): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.push()
  ctx.save()
  ctx.beginPath()
  tracePath(ctx, k, lakeOutline(f).pts)
  ctx.clip()
  ctx.beginPath()
  ctx.rect(-1e5, y0 * k, 2e5, (y1 - y0) * k)
  ctx.clip()
  const war = smooth(T, FLEET, FLEET + 3)
  const g = ctx.createLinearGradient(0, depthY(GW, S_SHORE) * k, 0, (GR + 2.5) * k)
  g.addColorStop(0, mixHex(FLOWERS.sky, FLOWERS.white, 0.3))
  g.addColorStop(0.35, FLOWERS.lake)
  g.addColorStop(1, mixHex(FLOWERS.lakeDeep, FLOWERS.fleet, 0.2 * war))
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, y0 * k, (f.x1 - f.x0 + 2) * k, (y1 - y0) * k)
  // What it reflects, faint.
  ctx.globalAlpha = 0.22
  drawRanges(p, k, f, T, true, [0, 1])
  const near = y0 >= GW - 1e-6
  if (!near) {
    ctx.globalAlpha = 0.35
    drawFleet(p, k, W, ink, T, f.cx, true)
  }
  if (castle) {
    ctx.globalAlpha = 0.3
    const X = depthX(castle.x, castle.s, f.cx)
    const Y = depthY(castle.feet, castle.s)
    const waterline = depthY(GW, castle.s)
    p.push()
    p.translate(X * k, (2 * waterline - Y) * k)
    p.scale(1, -1)
    drawCastle(p, k * castle.s, W * Math.max(0.42, castle.s), ink, { ...castle.pose, smoke: 0 })
    p.pop()
  }
  ctx.globalAlpha = 1
  if (near) {
    // Close to us the water reflects the sky high over the castle, not the castle: its reflection is strongest at
    // its waterline and gone a couple of cells toward us, and there the fleet going over shows in the lake instead.
    if (castle) {
      const wl = depthY(GW, castle.s)
      const top = wl + 0.45
      const bot = Math.max(top + 2.6, y1)
      const fade = ctx.createLinearGradient(0, top * k, 0, bot * k)
      for (let i = 0; i <= 6; i++) {
        const u = i / 6
        const y = lerp(top, bot, u)
        const a = 0.9 * smooth(y, top, top + 2.1)
        fade.addColorStop(u, alpha(p, lakeAt(y, war), a).toString())
      }
      ctx.fillStyle = fade
      ctx.fillRect((f.x0 - 1) * k, top * k, (f.x1 - f.x0 + 2) * k, (bot - top) * k)
    }
    ctx.globalAlpha = 0.55
    drawFleet(p, k, W, ink, T, f.cx, true, true)
    ctx.globalAlpha = 1
  }
  // Ripples: fine lines of the water's own colour laid across what it reflects, breaking it up; closer together
  // far off, and drifting slowly.
  ctx.fillStyle = g
  const yTop = depthY(GW, S_SHORE)
  for (let j = 0; j < 46; j++) {
    const y = yTop + 0.05 + 0.028 * j ** 1.45
    if (y < y0 - 0.1 || y > y1 + 0.1) continue
    const th = 0.02 + 0.0006 * j
    // Close to us they are fainter: there the water is its own colour, and the lines must not become stripes.
    const near = 1 - 0.65 * smooth(j, 14, 34)
    const drift = Math.sin(T * 0.35 + j * 1.7) * 0.6
    for (let x = Math.floor(f.x0 / 1.3) * 1.3 - 1.3; x < f.x1 + 1.3; x += 1.3) {
      const q = Math.round(x / 1.3)
      const len = 0.5 + 0.9 * hash(q, j, 91)
      ctx.globalAlpha = (0.45 + 0.4 * hash(q, j, 92)) * near
      ctx.fillRect((x + drift + 0.4 * hash(q, j, 93)) * k, y * k, len * k, th * k)
    }
  }
  ctx.globalAlpha = 1
  // Light on the water: short strokes of shine, drifting.
  p.noStroke()
  for (let i = 0; i < 26; i++) {
    const sc = lerp(S_SHORE + 0.02, 1.4, hash(i, 31) ** 0.8)
    const x = f.cx + ((hash(i, 32) - 0.5) * 30) / sc + ((T * 0.3 + i) % 6) - 3
    p.fill(alpha(p, FLOWERS.white, 0.28 * (0.5 + 0.5 * Math.sin(T * 1.7 + i))))
    p.rect(depthX(x, sc, f.cx) * k, depthY(GW, sc) * k, (0.5 + hash(i, 33)) * sc * k, 0.035 * sc * k)
  }
  ctx.restore()
  p.pop()
}

/**
 * The lake's banks: a soft darker lip where the meadow meets the water, all round the shore (out to the left on the
 * left shore, up on the far one, down on the near one); never an inked line.
 */
function drawBanks(p: p5, k: number, f: Frame, y0: number, y1: number): void {
  const { pts, lip } = lakeOutline(f)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The shore only (the last two points close it off the frame). Out from the water is to the left of the way the
  // outline runs: (dy, -dx) on the screen.
  const n = pts.length - 2
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]
    const c = pts[Math.min(n - 1, i + 1)]
    const dx = c[0] - a[0]
    const dy = c[1] - a[1]
    const d = Math.hypot(dx, dy) || 1
    out.push([pts[i][0] + (dy / d) * lip[i], pts[i][1] - (dx / d) * lip[i]])
  }
  p.push()
  ctx.save()
  ctx.beginPath()
  ctx.rect(-1e5, y0 * k, 2e5, (y1 - y0) * k)
  ctx.clip()
  p.noStroke()
  p.fill(alpha(p, FLOWERS.meadowDeep, 0.8))
  p.beginShape()
  for (let i = 0; i < n; i++) p.vertex(pts[i][0] * k, pts[i][1] * k)
  for (let i = n - 1; i >= 0; i--) p.vertex(out[i][0] * k, out[i][1] * k)
  p.endShape(p.CLOSE)
  ctx.restore()
  p.pop()
}

/* ------------------------------------------------------------------ drawing: the castle */

function drawTheCastle(p: p5, k: number, W: number, ink: string, T: number, cx: number, c: CastleNow): void {
  const X = depthX(c.x, c.s, cx)
  const Y = depthY(c.feet, c.s)
  p.push()
  p.translate(X * k, Y * k)
  drawCastle(p, k * c.s, W * Math.max(0.42, c.s), ink, c.pose)
  // What is through its door: the room's warm dark as they come out; the hat shop's street on fire at the end.
  const open = c.pose.door ?? 0
  if (open > 0.02) {
    const [dx, dy] = doorAt(c.pose)
    const lw = DOOR.w * Math.cos(((open * Math.PI) / 2) * 0.96)
    const x0 = dx - DOOR.w / 2 + lw
    const x1 = dx + DOOR.w / 2
    const ks = k * c.s
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createLinearGradient(0, (dy - DOOR.h) * ks, 0, dy * ks)
    if (T > (FLEET + END) / 2) {
      const flick = 0.5 + 0.5 * Math.sin(T * 13) * Math.sin(T * 5.3)
      g.addColorStop(0, TOWN.nightHigh)
      g.addColorStop(0.6, mixHex(TOWN.night, TOWN.ember, 0.5 + 0.2 * flick))
      g.addColorStop(1, mixHex(TOWN.ember, TOWN.fire, 0.4 * flick))
    } else {
      g.addColorStop(0, mixHex(ROOM.woodDark, ROOM.night, 0.4))
      g.addColorStop(1, mixHex(ROOM.plasterShade, '#FFB464', 0.35))
    }
    ctx.fillStyle = g
    if (x1 > x0) ctx.fillRect(x0 * ks, (dy - DOOR.h) * ks, (x1 - x0) * ks, DOOR.h * ks)
  }
  p.pop()
}

/**
 * Where the castle's feet come down in the lake on its strides back, and where its belly meets the water on the
 * fourth bar: a burst of spray that rises and falls back, soft, no rings.
 */
function drawSplashes(p: p5, k: number, T: number, cx: number): void {
  const bursts: { at: number; xs: number[]; wide: number }[] = []
  for (const at of RETURN) {
    if (T < at || T > at + 1.2) continue
    const c = castleAt(at)
    bursts.push({ at, xs: feetAt(c.pose).filter((q) => q.down).map((q) => q.at[0]), wide: 0.5 })
  }
  const crouch = b(4)
  if (T > crouch && T < crouch + 1.4) bursts.push({ at: crouch, xs: [-7, -4, -1, 2, 5, 8], wide: 1 })
  if (!bursts.length) return
  p.push()
  p.noStroke()
  for (const bu of bursts) {
    const c = castleAt(bu.at)
    const X = depthX(c.x, c.s, cx)
    const Y = depthY(GW, c.s)
    const u = T - bu.at
    const fade = 1 - smooth(u, 0.5, bu.wide > 0.8 ? 1.4 : 1.1)
    bu.xs.forEach((fx, j) => {
      const x = X + fx * c.s
      p.fill(alpha(p, FLOWERS.white, 0.5 * fade))
      p.ellipse(x * k, Y * k, (0.9 + 1.2 * u) * bu.wide * c.s * 1.6 * k, 0.16 * c.s * k)
      // The spray: streaks of every length along the way each is going (never round beads), thinning as they fall.
      p.strokeCap(p.ROUND)
      for (let i = 0; i < 7; i++) {
        const dir = (hash(i, j, 61) - 0.5) * 1.6
        const v = (2.4 + 1.6 * hash(i, j, 62)) * c.s * (0.7 + bu.wide * 0.5)
        const dx = dir * v * u * 0.5
        const dy = -v * u + 0.5 * GRAVITY * c.s * u * u
        if (dy > 0.05) continue
        const vx = dir * v * 0.5
        const vy = -v + GRAVITY * c.s * u
        const len = 0.045 + 0.06 * hash(i, j, 64)
        const sp = Math.hypot(vx, vy) || 1
        p.stroke(alpha(p, FLOWERS.white, (0.45 + 0.25 * hash(i, j, 65)) * fade))
        p.strokeWeight((0.012 + 0.016 * hash(i, j, 63)) * c.s * 1.6 * k)
        p.line((x + dx) * k, (Y + dy) * k, (x + dx - (vx / sp) * len * c.s) * k, (Y + dy - (vy / sp) * len * c.s) * k)
      }
      p.noStroke()
    })
  }
  p.pop()
}

/** Where they come down in the flowers, a puff of petals rises and drifts off on the breeze. */
function drawPetals(p: p5, k: number, T: number): void {
  const u = T - LAND
  if (u < 0 || u > 2.4) return
  // Warm and white only (see `drift`): nothing in their colours flies up round them.
  const cols = [FLOWERS.white, FLOWERS.pink, FLOWERS.yellow, FLOWERS.coral]
  p.push()
  p.noStroke()
  for (const [x0, n] of [[X_LAND, 0], [X_LAND - 2 * PAIR, 1]] as [number, number][]) {
    for (let i = 0; i < 12; i++) {
      const h = hash(i, n, 71)
      const vx = (h - 0.4) * 1.1
      const vy = -(0.9 + 0.8 * hash(i, n, 72))
      const drag = 1 - Math.exp(-u / 0.35)
      const x = x0 + vx * 0.35 * drag + 0.25 * u * u
      const y = GR - 0.05 + vy * 0.35 * drag + 0.12 * u * u
      const a = 0.9 * (1 - smooth(u, 1.2, 2.4))
      p.fill(alpha(p, cols[i % 4], a))
      p.push()
      p.translate(x * k, y * k)
      p.rotate(u * (2 + 3 * h) + i)
      p.ellipse(0, 0, 0.1 * k, 0.05 * k)
      p.pop()
    }
  }
  p.pop()
}

/* ------------------------------------------------------------------ drawing: her machine */

function drawWheel(p: p5, k: number, W: number, ink: string, T: number): void {
  const th = turned(T)
  p.push()
  const post = (dx: number, shade: number) => {
    p.stroke(ink)
    p.strokeWeight(W * 0.9)
    p.fill(mixHex(FLOWERS.wheel, '#000000', shade))
    p.quad((NX - 0.08 + dx) * k, (AY - 0.1) * k, (NX + 0.08 + dx) * k, (AY - 0.1) * k, (NX + 1.1 + dx) * k, GR * k, (NX + 0.85 + dx) * k, GR * k)
    p.quad((NX - 0.08 + dx) * k, (AY - 0.1) * k, (NX + 0.08 + dx) * k, (AY - 0.1) * k, (NX - 0.85 + dx) * k, GR * k, (NX - 1.1 + dx) * k, GR * k)
  }
  // The far trestle, set back and darker.
  post(0.18, 0.28)
  // Rims, spokes and paddles.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(W * 2.4)
  p.circle(NX * k, AY * k, 2 * RW * k)
  p.stroke(FLOWERS.wheel)
  p.strokeWeight(W * 1.3)
  p.circle(NX * k, AY * k, 2 * RW * k)
  p.stroke(ink)
  p.strokeWeight(W * 0.7)
  p.circle(NX * k, AY * k, 2 * (RW - 0.22) * k)
  for (let i = 0; i < NB; i++) {
    const a = th + TH_LOAD + ((i + 0.5) * 2 * Math.PI) / NB
    p.stroke(ink)
    p.strokeWeight(W * 1.1)
    p.line(NX * k, AY * k, (NX + Math.cos(a) * (RW - 0.02)) * k, (AY + Math.sin(a) * (RW - 0.02)) * k)
    // A paddle on the rim between two tubs, to catch the stream.
    p.push()
    p.translate((NX + Math.cos(a) * RW) * k, (AY + Math.sin(a) * RW) * k)
    p.rotate(a)
    p.fill(mixHex(FLOWERS.wheel, FLOWERS.hut, 0.3))
    p.strokeWeight(W * 0.7)
    p.rectMode(p.CORNER)
    p.rect(-0.02 * k, -0.2 * k, 0.26 * k, 0.4 * k, 0.03 * k)
    p.pop()
  }
  // The hub.
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(FLOWERS.wheel)
  p.circle(NX * k, AY * k, 0.46 * k)
  p.fill(mixHex(FLOWERS.wheel, '#000000', 0.35))
  p.circle(NX * k, AY * k, 0.16 * k)
  // The tubs, hanging on their pivots.
  for (let i = 0; i < NB; i++) {
    const a = tubAngle(i, T)
    const [px, py] = pivotOf(a)
    const full = i !== 0 && Math.cos(a) < 0.3 && Math.sin(a) < 0.35 && T > T_GO
    tub(p, k, W, ink, px, py, tubTilt(i, T), full)
  }
  // The brake: a shoe on the rim at the bottom left, lifted off as her weight comes on.
  const off = smooth(T, BOARD - 0.02, BOARD + 0.14)
  const ba = TH_LOAD + 0.55
  p.push()
  p.translate((NX + Math.cos(ba) * (RW + 0.1)) * k, (AY + Math.sin(ba) * (RW + 0.1)) * k)
  p.rotate(ba + Math.PI / 2 - 0.5 * off)
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(mixHex(FLOWERS.wheel, '#000000', 0.25))
  p.rectMode(p.CENTER)
  p.rect(0, (0.06 + 0.1 * off) * k, 0.46 * k, 0.12 * k, 0.03 * k)
  p.line(0, (0.12 + 0.1 * off) * k, -0.5 * k, 0.8 * k)
  p.pop()
  // The near trestle.
  post(-0.05, 0)
  p.pop()
}

/** A tub: a little wooden bucket on a bail from its pivot, hooped in iron; a skin of water in it on the way up. */
function tub(p: p5, k: number, W: number, ink: string, px: number, py: number, tilt: number, full: boolean): void {
  p.push()
  p.translate(px * k, py * k)
  p.rotate(tilt)
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.noFill()
  p.line(0, 0, -TUB_W * 0.45 * k, TUB_TOP * k)
  p.line(0, 0, TUB_W * 0.45 * k, TUB_TOP * k)
  p.fill(mixHex(FLOWERS.wheel, FLOWERS.hut, 0.45))
  p.strokeWeight(W)
  p.quad((-TUB_W / 2) * k, TUB_TOP * k, (TUB_W / 2) * k, TUB_TOP * k, TUB_W * 0.42 * k, TUB_BOT * k, -TUB_W * 0.42 * k, TUB_BOT * k)
  if (full) {
    p.noStroke()
    p.fill(alpha(p, FLOWERS.lake, 0.9))
    p.rectMode(p.CORNER)
    p.rect(-TUB_W * 0.45 * k, (TUB_TOP + 0.04) * k, TUB_W * 0.9 * k, 0.06 * k)
  }
  p.stroke(ink)
  p.strokeWeight(W * 0.6)
  for (const y of [TUB_TOP + 0.1, TUB_BOT - 0.1]) {
    const w = lerp(TUB_W / 2, TUB_W * 0.42, (y - TUB_TOP) / (TUB_BOT - TUB_TOP))
    p.line(-w * k, y * k, w * k, y * k)
  }
  p.pop()
}

/** The water each tub pours into the flume's head as the cam tips it. */
function drawPours(p: p5, k: number, T: number): void {
  if (T < T_GO) return
  p.push()
  p.noStroke()
  for (let i = 1; i < NB; i++) {
    const a = tubAngle(i, T)
    const tl = tipOf(a)
    if (tl < 0.35) continue
    const [px, py] = pivotOf(a)
    const lx = px + Math.cos(tl) * TUB_W * 0.5 - Math.sin(tl) * TUB_TOP
    const ly = py + Math.sin(tl) * TUB_W * 0.5 + Math.cos(tl) * TUB_TOP
    const fall = Math.max(0.05, floorAt(lx) - ly)
    const amt = smooth(tl, 0.35, 0.9) * (1 - smooth(tl, 1.0, 1.15))
    p.fill(alpha(p, FLOWERS.lake, 0.55 * amt))
    p.beginShape()
    p.vertex((lx - 0.04) * k, ly * k)
    p.vertex((lx + 0.06) * k, ly * k)
    p.vertex((lx + 0.16) * k, (ly + fall) * k)
    p.vertex((lx - 0.02) * k, (ly + fall) * k)
    p.endShape(p.CLOSE)
  }
  p.pop()
}

/** A gate's paddle: knocked up by her on its bar, held up while the flap is open, then let down slowly. */
function paddleAngle(g: number, T: number): number {
  const u = T - GATES[g]
  if (u < 0) return 0.04 * Math.sin(T * 2 + g)
  const up = 1.15 * (1 - Math.exp(-u / 0.07))
  return up * (1 - smooth(u, 1.5, 2.6)) + ring(u - 2.6, 0.08, 7, 0.4)
}
const flapOpen = (g: number, T: number): number => smooth(T, GATES[g] + 0.02, GATES[g] + 0.2) * (1 - smooth(T, GATES[g] + 1.6, GATES[g] + 2.5))
const WOOD = mixHex(FLOWERS.hut, FLOWERS.wheel, 0.35)

/** The flume behind her: its trestles, floor and back wall, the water in it, and the gates. The front wall is drawn over her. */
function drawFlumeBack(p: p5, k: number, W: number, ink: string, T: number): void {
  p.push()
  p.stroke(ink)
  p.strokeWeight(W * 0.9)
  p.fill(FLOWERS.wheel)
  for (const x of TRESTLES) {
    const y = floorAt(x) + 0.08
    p.quad((x - 0.05) * k, y * k, (x + 0.05) * k, y * k, (x + 0.5) * k, GR * k, (x + 0.38) * k, GR * k)
    p.quad((x - 0.05) * k, y * k, (x + 0.05) * k, y * k, (x - 0.38) * k, GR * k, (x - 0.5) * k, GR * k)
    p.line((x - 0.3) * k, lerp(y, GR, 0.55) * k, (x + 0.3) * k, lerp(y, GR, 0.55) * k)
  }
  p.fill(mixHex(WOOD, '#000000', 0.12))
  p.beginShape()
  p.vertex(F_X0 * k, (F_Y0 - F_WALL - 0.04) * k)
  p.vertex(F_X1 * k, (F_Y1 - F_WALL) * k)
  p.vertex(F_X1 * k, (F_Y1 + 0.08) * k)
  p.vertex(F_X0 * k, (F_Y0 + 0.08) * k)
  p.endShape(p.CLOSE)
  // The water: a sheet with a lighter skin, running down the flume from the first pour.
  if (T > T_POUR) {
    const front = Math.min(F_X1, F_X0 + (T - T_POUR) * V_F * 1.25)
    p.noStroke()
    p.fill(alpha(p, FLOWERS.lake, 0.9))
    p.beginShape()
    p.vertex(F_X0 * k, (F_Y0 - F_WATER) * k)
    p.vertex(front * k, (floorAt(front) - F_WATER) * k)
    p.vertex((front + 0.15) * k, floorAt(front) * k)
    p.vertex(F_X0 * k, F_Y0 * k)
    p.endShape(p.CLOSE)
    p.fill(alpha(p, FLOWERS.white, 0.6))
    for (let i = 0; i < 18; i++) {
      const x = F_X0 + ((i * 0.63 + (T - T_POUR) * V_F) % (F_X1 - F_X0))
      if (x > front - 0.2) continue
      p.rect(x * k, (floorAt(x) - F_WATER + 0.005) * k, 0.2 * k, 0.025 * k)
    }
    // Off the spout into the trough once it has run the length.
    if (front >= F_X1) {
      p.fill(alpha(p, FLOWERS.lake, 0.6))
      p.quad(F_X1 * k, (F_Y1 - 0.1) * k, (F_X1 + 0.1) * k, (F_Y1 - 0.08) * k, (F_X1 + 0.3) * k, (F_Y1 + 0.35) * k, (F_X1 + 0.12) * k, (F_Y1 + 0.35) * k)
    }
  }
  // The gates: a flap under the floor, and a paddle hanging into the stream from a gallows on the back wall.
  for (let g = 0; g < 3; g++) {
    const x = GATE_X[g]
    const y = floorAt(x)
    const fx = BED_X[g] - 0.18
    const fy = floorAt(fx) + 0.08
    p.stroke(ink)
    p.strokeWeight(W * 0.8)
    p.fill(mixHex(WOOD, '#000000', 0.25))
    p.push()
    p.translate(fx * k, fy * k)
    p.rotate(flapOpen(g, T) * 1.2)
    p.rectMode(p.CORNER)
    p.rect(0, 0, 0.36 * k, 0.05 * k)
    p.pop()
    p.fill(FLOWERS.wheel)
    p.rectMode(p.CORNER)
    p.rect((x - 0.16) * k, (y - 0.74) * k, 0.07 * k, (0.74 - F_WALL + 0.04) * k)
    p.rect((x - 0.16) * k, (y - 0.78) * k, 0.26 * k, 0.07 * k)
    // The paddle: an arm from the gallows' beam and a broad blade in the water.
    p.fill(WOOD)
    p.push()
    p.translate(x * k, (y - 0.72) * k)
    p.rotate(-paddleAngle(g, T))
    p.strokeWeight(W * 1.1)
    p.line(0, 0, 0, 0.44 * k)
    p.strokeWeight(W * 0.8)
    p.rect(-0.05 * k, 0.4 * k, 0.1 * k, 0.3 * k, 0.02 * k)
    p.pop()
    // Water thrown up off the blade as she knocks it.
    const u = T - GATES[g]
    if (u > 0 && u < 0.7) {
      p.noStroke()
      for (let i = 0; i < 6; i++) {
        const vx = 0.4 + 0.9 * hash(i, g, 81)
        const vy = -(1.4 + 1.2 * hash(i, g, 82))
        const dy = vy * u + 6 * u * u
        if (dy > 0) continue
        p.fill(alpha(p, FLOWERS.white, 0.8 * (1 - u / 0.7)))
        p.circle((x + 0.05 + vx * u) * k, (y - F_WATER + dy) * k, 0.045 * k)
      }
      p.stroke(ink)
      p.strokeWeight(W * 0.8)
    }
    // Its crank to the flap.
    p.strokeWeight(W * 0.55)
    p.line((x - 0.13) * k, (y - 0.5) * k, (fx + 0.1) * k, (fy + 0.02) * k)
  }
  p.pop()
}

/** The flume's front lip, over her, and a skin of water over the bottom of her: she rides in it. */
function drawFlumeFront(p: p5, k: number, W: number, ink: string, T: number): void {
  p.push()
  if (T > T_POUR) {
    const front = Math.min(F_X1, F_X0 + (T - T_POUR) * V_F * 1.25)
    p.noStroke()
    p.fill(alpha(p, FLOWERS.lake, 0.4))
    p.beginShape()
    p.vertex(F_X0 * k, (F_Y0 - F_WATER + 0.03) * k)
    p.vertex(front * k, (floorAt(front) - F_WATER + 0.03) * k)
    p.vertex(front * k, floorAt(front) * k)
    p.vertex(F_X0 * k, F_Y0 * k)
    p.endShape(p.CLOSE)
  }
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(WOOD)
  p.beginShape()
  p.vertex(F_X0 * k, (F_Y0 - F_LIP) * k)
  p.vertex(F_X1 * k, (F_Y1 - F_LIP) * k)
  p.vertex(F_X1 * k, (F_Y1 + 0.1) * k)
  p.vertex(F_X0 * k, (F_Y0 + 0.1) * k)
  p.endShape(p.CLOSE)
  p.pop()
}

/**
 * The shower from a gate's flap: water let go under the flume's floor falls as a short sheet that breaks into
 * streaks and drops, spreading a little, and is gone into the flowers; a few drops bounce up where it lands. Every
 * drop falls as a drop does (from rest, under gravity), so the streaks stretch as they go and the shower keeps
 * falling for a moment after the flap has shut.
 */
function drawShower(p: p5, k: number, W: number, g: number, T: number): void {
  const x0 = BED_X[g]
  const top = floorAt(x0) + 0.1
  const H = GR - top
  const TF = Math.sqrt((2 * H) / GRAVITY)
  const flow = (t: number): number => flapOpen(g, t)
  if (T < GATES[g] || (flow(T) < 0.01 && flow(T - TF) < 0.01 && T > GATES[g] + 1)) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const falling = mixHex(FLOWERS.lake, FLOWERS.lakeDeep, 0.2)
  p.push()
  // The sheet, just under the flap: whole for a hand's breadth, thinning to nothing as it breaks up.
  const now = flow(T)
  const sheet = Math.min(0.55, 0.5 * GRAVITY * Math.max(0, T - GATES[g]) ** 2)
  if (now > 0.02 && sheet > 0.02) {
    const gr = ctx.createLinearGradient(0, top * k, 0, (top + sheet) * k)
    gr.addColorStop(0, alpha(p, falling, 0.8 * now).toString())
    gr.addColorStop(1, alpha(p, falling, 0).toString())
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.moveTo((x0 - 0.12) * k, top * k)
    ctx.lineTo((x0 + 0.12) * k, top * k)
    ctx.lineTo((x0 + 0.1) * k, (top + sheet) * k)
    ctx.lineTo((x0 - 0.1) * k, (top + sheet) * k)
    ctx.closePath()
    ctx.fill()
  }
  // The streaks and drops: each let go at its own moment, as much as the flap was letting through then.
  const N = 44
  p.strokeCap(p.ROUND)
  for (let i = 0; i < N; i++) {
    const a = (T + hash(i, g, 21) * TF) % TF
    const w = flow(T - a)
    if (w < 0.02) continue
    const vx = (hash(i, g, 22) - 0.5) * 0.55
    const x = x0 + (hash(i, g, 23) - 0.5) * 0.22 + vx * a
    const y = top + 0.5 * GRAVITY * a * a
    if (y < top + 0.12) continue
    const len = Math.min(0.32, 0.05 + GRAVITY * a * 0.028)
    const fade = w * (1 - smooth(y, GR - 0.55, GR - 0.04))
    if (fade < 0.02) continue
    if (i % 3 === 0) {
      p.noStroke()
      p.fill(alpha(p, mixHex(FLOWERS.lake, FLOWERS.white, 0.5), 0.9 * fade))
      p.circle((x + vx * 0.02) * k, y * k, 0.05 * k)
    } else {
      p.stroke(alpha(p, i % 3 === 1 ? falling : mixHex(FLOWERS.lake, FLOWERS.white, 0.45), 0.9 * fade))
      p.strokeWeight(W * (i % 3 === 1 ? 1.5 : 1.0))
      p.line((x - vx * len * 0.1) * k, (y - len) * k, x * k, y * k)
    }
  }
  // Where it comes down: a few drops thrown back up off the leaves.
  p.noStroke()
  for (let i = 0; i < 10; i++) {
    const P = 0.3
    const a = (T + hash(i, g, 24) * P) % P
    const w = flow(T - a - TF)
    if (w < 0.02) continue
    const v = 0.9 + 0.7 * hash(i, g, 25)
    const h = v * a - 0.5 * GRAVITY * a * a
    if (h < 0) continue
    const x = x0 + (hash(i, g, 26) - 0.5) * 0.6 + (hash(i, g, 27) - 0.5) * 0.4 * a
    p.fill(alpha(p, mixHex(FLOWERS.lake, FLOWERS.white, 0.6), 0.8 * w * (1 - a / P)))
    p.circle(x * k, (GR - 0.3 * (1 - Math.min(1, Math.abs(x - x0) * 2)) - h) * k, 0.035 * k)
  }
  p.pop()
}

/** The showers from the flaps, and the beds under them, opening. */
function drawBeds(p: p5, k: number, W: number, T: number): void {
  p.push()
  for (let g = 0; g < 3; g++) {
    const x0 = BED_X[g]
    drawShower(p, k, W, g, T)
    // The bed: stems with buds, bowed and closed until the water reaches them; then they lift and open, one after
    // another outward from where the shower falls.
    for (let j = 0; j < 11; j++) {
      const x = x0 - 0.9 + j * 0.18 + (hash(j, g, 5) - 0.5) * 0.07
      const hgt = 0.42 + 0.34 * hash(j, g, 6) - Math.abs(x - x0) * 0.12
      const when = GATES[g] + 0.3 + Math.abs(x - x0) * 0.42
      const o = smooth(T, when, when + 0.7)
      const bow = 0.14 * (1 - o) * (hash(j, g, 7) > 0.5 ? 1 : -1)
      const sway = Math.sin(T * 1.4 + j) * 0.02 + ring(T - when, 0.05, 9, 0.35)
      const hx = x + bow + sway
      const hy = GR - hgt * (0.86 + 0.14 * o)
      p.stroke(FLOWERS.meadowDeep)
      p.strokeWeight(W * 0.75)
      p.noFill()
      p.bezier(x * k, GR * k, x * k, (GR - hgt * 0.55) * k, hx * k, (hy + 0.14) * k, hx * k, hy * k)
      p.noStroke()
      p.fill(FLOWERS.meadowDeep)
      const ls = hash(j, g, 8) > 0.5 ? 1 : -1
      p.ellipse((x + ls * 0.07) * k, (GR - hgt * 0.3) * k, 0.16 * k, 0.06 * k)
      // Every other stem forks near the top into a second, smaller head: a spray, so the bed blooms as a mass of
      // small flowers, none of them near a ball's size (Howl waits among them).
      const heads: [number, number, number][] = [[hx, hy, 1]]
      if (j % 2 === 1) {
        const fx = lerp(x, hx, 0.7)
        const fy = GR - hgt * 0.62
        const side = hash(j, g, 10) > 0.5 ? 1 : -1
        const bx = fx + side * (0.1 + 0.04 * hash(j, g, 11)) + sway * 0.7
        const by = hy + 0.08 + 0.05 * hash(j, g, 12)
        p.stroke(FLOWERS.meadowDeep)
        p.strokeWeight(W * 0.6)
        p.line(fx * k, fy * k, bx * k, by * k)
        p.noStroke()
        heads.push([bx, by, 0.75])
      }
      const col = BED_COLORS[g]
      for (const [ux, uy, sz] of heads) {
        if (o < 0.02) {
          p.fill(mixHex(FLOWERS.meadowDeep, col, 0.4))
          p.ellipse(ux * k, uy * k, 0.06 * sz * k, 0.09 * sz * k)
          continue
        }
        const r = (0.045 + 0.03 * hash(j, g, 9)) * (0.35 + 0.65 * o) * sz
        p.fill(col)
        for (let q = 0; q < 5; q++) {
          const a = (q / 5) * Math.PI * 2 + j
          const ex = Math.cos(a)
          const ey = Math.sin(a) * 0.75
          p.push()
          p.translate((ux + ex * r * 0.55) * k, (uy + ey * r * 0.55) * k)
          p.rotate(Math.atan2(ey, ex))
          p.ellipse(0, 0, r * 1.05 * k, r * 0.55 * k)
          p.pop()
        }
        p.fill(g === 0 ? FLOWERS.coral : FLOWERS.yellow)
        p.circle(ux * k, uy * k, r * 0.5 * k)
      }
    }
  }
  p.pop()
}

/** The see-saw: its stand, the beam with the cup on the right and the stone on the left, over its stump. */
function drawTrough(p: p5, k: number, W: number, ink: string, T: number): void {
  const a = troughAngle(T)
  const [px, py] = TP
  p.push()
  p.stroke(ink)
  p.strokeWeight(W)
  p.fill(FLOWERS.wheel)
  p.triangle((px - 0.35) * k, GR * k, (px + 0.35) * k, GR * k, px * k, (py + 0.05) * k)
  const sx = px - LW * Math.cos(A_UP)
  const sy = py - LW * Math.sin(A_UP) + 0.28
  p.fill(mixHex(FLOWERS.wheel, '#000000', 0.2))
  p.rectMode(p.CORNER)
  p.rect((sx - 0.14) * k, sy * k, 0.28 * k, (GR - sy) * k, 0.03 * k)
  p.push()
  p.translate(px * k, py * k)
  p.rotate(a)
  p.fill(WOOD)
  p.rect(-LW * k, -0.05 * k, (LW + LC + 0.12) * k, 0.1 * k, 0.03 * k)
  p.fill(mixHex(WOOD, '#000000', 0.1))
  p.beginShape()
  p.vertex((LC - 0.34) * k, -0.05 * k)
  p.vertex((LC - 0.34) * k, -0.32 * k)
  p.vertex((LC - 0.28) * k, -0.32 * k)
  p.vertex((LC - 0.28) * k, -0.1 * k)
  p.vertex((LC + 0.2) * k, -0.1 * k)
  p.vertex((LC + 0.28) * k, -0.26 * k)
  p.vertex((LC + 0.32) * k, -0.24 * k)
  p.vertex((LC + 0.25) * k, -0.05 * k)
  p.endShape(p.CLOSE)
  // The counterweight: a squared block of stone lashed under the beam's end.
  p.fill(WASTES.rockDark)
  p.rect((-LW - 0.2) * k, 0.02 * k, 0.4 * k, 0.24 * k, 0.03 * k)
  p.stroke(alpha(p, ink, 0.5))
  p.strokeWeight(W * 0.6)
  p.line((-LW - 0.08) * k, 0.02 * k, (-LW - 0.08) * k, 0.26 * k)
  p.line((-LW + 0.08) * k, 0.02 * k, (-LW + 0.08) * k, 0.26 * k)
  p.pop()
  p.fill(FLOWERS.wheel)
  p.circle(px * k, py * k, 0.12 * k)
  p.pop()
}

/**
 * The stepping stones out to the castle: boulders standing out of the water, rounded, with a flat mossy top where a
 * foot goes; each rocks a little as she lands on it. Where they meet the water, a light line of wet.
 */
function drawStones(p: p5, k: number, W: number, ink: string, T: number): void {
  p.push()
  RUN.stones.forEach(([a0, a1], i) => {
    // Each its own boulder: wider or narrower than her footing, more or less rounded, a different grey.
    const x0 = a0 - 0.08 - 0.42 * hash(i, 61)
    const x1 = a1 + 0.04 + 0.3 * hash(i, 62)
    const w = (x1 - x0) / 2 + 0.06
    const h = GW - GR + 0.03 + 0.06 * hash(i, 63)
    p.push()
    p.translate(((x0 + x1) / 2) * k, GR * k)
    p.rotate(ring(T - STONES[i], 0.045, 15, 0.2))
    p.stroke(ink)
    p.strokeWeight(W)
    p.fill(mixHex(WASTES.rock, WASTES.rockDark, 0.3 * hash(i, 64)))
    const flat = 0.3 + 0.35 * hash(i, 65)
    const lean = 0.12 * (hash(i, 66) - 0.5)
    p.beginShape()
    p.vertex((-w - 0.1 - lean) * k, h * k)
    p.bezierVertex((-w - 0.16 - lean) * k, (h * 0.3) * k, (-w + 0.02) * k, (-0.04 * hash(i, 67)) * k, (-w * flat) * k, -0.02 * k)
    p.vertex((w * flat * 0.8) * k, -0.02 * k)
    p.bezierVertex((w - 0.02) * k, (-0.04 * hash(i, 68)) * k, (w + 0.18 + lean) * k, (h * 0.3) * k, (w + 0.1 + lean) * k, h * k)
    p.endShape(p.CLOSE)
    p.noStroke()
    p.fill(alpha(p, WASTES.rockDark, 0.5))
    p.beginShape()
    p.vertex((w * 0.2) * k, 0.02 * k)
    p.bezierVertex((w - 0.02) * k, 0.02 * k, (w + 0.1) * k, (h * 0.4) * k, (w + 0.07) * k, h * k)
    p.vertex((w * 0.35) * k, h * k)
    p.endShape(p.CLOSE)
    p.fill(alpha(p, FLOWERS.meadowDeep, 0.85))
    p.ellipse((-w * 0.15) * k, 0.01 * k, w * 1.1 * k, 0.07 * k)
    p.fill(alpha(p, FLOWERS.white, 0.55))
    p.rect((-w - 0.18) * k, (h - 0.035) * k, (2 * w + 0.36) * k, 0.035 * k, 0.02 * k)
    p.pop()
  })
  p.pop()
}

/**
 * The race the wheel turns in: a short stone-lined channel crossing under it, the stream running through it right
 * to left (the way its bottom goes round); the tubs dip into it.
 */
const RACE_D = 0.46
function drawRace(p: p5, k: number, W: number, ink: string, T: number): void {
  const [x0, x1] = PIT
  const y0 = GR + 0.02
  const y1 = GR + RACE_D
  p.push()
  p.noStroke()
  p.fill(mixHex(FLOWERS.lakeDeep, FLOWERS.meadowDeep, 0.3))
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
  p.fill(alpha(p, FLOWERS.lake, 0.9))
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, 0.07 * k)
  // The current: streaks sliding along under the wheel.
  p.fill(alpha(p, FLOWERS.white, 0.45))
  for (let i = 0; i < 9; i++) {
    const u = (((T * 0.45 + i / 9) % 1) + 1) % 1
    const x = x1 - 0.3 - u * (x1 - x0 - 0.3)
    const y = y0 + 0.1 + (y1 - y0 - 0.16) * hash(i, 41)
    p.rect(x * k, y * k, 0.28 * k, 0.025 * k)
  }
  // Its stone walls at either end, and the coping along its near side.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(WASTES.stone)
  p.rect((x0 - 0.26) * k, (GR - 0.03) * k, 0.26 * k, (RACE_D + 0.1) * k, 0.03 * k)
  p.rect(x1 * k, (GR - 0.03) * k, 0.26 * k, (RACE_D + 0.1) * k, 0.03 * k)
  p.fill(mixHex(WASTES.stone, FLOWERS.meadowDeep, 0.25))
  p.rect((x0 - 0.3) * k, y1 * k, (x1 - x0 + 0.6) * k, 0.1 * k, 0.03 * k)
  // A plank laid over it flush with the bank: the way Howl crosses to walk the flume with her.
  p.stroke(ink)
  p.strokeWeight(W * 0.8)
  p.fill(WOOD)
  p.rect((x0 - 0.5) * k, (GR - 0.005) * k, (x1 - x0 + 1.0) * k, 0.085 * k, 0.02 * k)
  p.stroke(alpha(p, ink, 0.45))
  p.strokeWeight(W * 0.5)
  for (const x of [x0 - 0.38, x0 + 0.9, x1 - 0.7, x1 + 0.38]) p.line(x * k, (GR + 0.02) * k, (x + 0.02) * k, (GR + 0.06) * k)
  p.pop()
}

/* ------------------------------------------------------------------ drawing: the castle close, and the war's light */

/** How much of the war's light is out of the door: from when it comes ajar, as it opens. */
function warLight(T: number, c: CastleNow): number {
  if (T < AJAR - 0.05) return 0
  return clamp01((c.pose.door ?? 0) / AJAR_OPEN) * (0.75 + 0.25 * clamp01(((c.pose.door ?? 0) - AJAR_OPEN) / (1 - AJAR_OPEN)))
}
/** The fire's flicker in the light (the town burning beyond the door). */
const flicker = (T: number): number => 0.5 + 0.5 * Math.sin(T * 13) * Math.sin(T * 5.3)
/** The door's opening on the screen: the gap between the swung leaf and the jamb, its sill, its height. */
function doorway(c: CastleNow, cx: number): { x0: number; x1: number; sill: number; h: number } {
  const [dx, dy] = doorAt(c.pose)
  const lw = DOOR.w * Math.cos((((c.pose.door ?? 0) * Math.PI) / 2) * 0.96)
  const X = depthX(c.x, c.s, cx)
  const Y = depthY(c.feet, c.s)
  return { x0: X + (dx - DOOR.w / 2 + lw) * c.s, x1: X + (dx + DOOR.w / 2) * c.s, sill: Y + dy * c.s, h: DOOR.h * c.s }
}

/** The hull's plates where they come apart: the vertical seams, the horizontal ones, and the rows between. */
const SEAMS_X = [-6.1, -3.7, -1.25, 1.35, 3.85, 5.65]
const SEAMS_Y = [-11.35, -10.05, -8.1]
const seamX = (x: number, y: number): number => x + Math.sin(((y + 12.6) / 7) * Math.PI) * x * 0.035
const seamY = (y: number, x: number): number => (y === -10.05 ? y + 0.18 * Math.sin(x * 0.4) : y + 0.05 * Math.sin(x * 0.7 + y))
/**
 * What is not iron plate on the hull's near side, standing, as boxes that never overlap (the clip cuts them out
 * even-odd): the door with its hood and the porch's rail, the porch and its brackets, the two windows, the fin, the
 * face.
 */
const NOT_PLATE: [number, number, number, number][] = [
  [CASTLE.door[0] - DOOR.w / 2 - 0.35, CASTLE.door[1] - DOOR.h - 0.75, CASTLE.porch[1] + 0.1, CASTLE.door[1] + 0.35],
  [CASTLE.porch[0] - 0.1, CASTLE.door[1] - 0.2, CASTLE.door[0] - DOOR.w / 2 - 0.35, CASTLE.door[1] + 0.9],
  [CASTLE.door[0] - DOOR.w / 2 - 0.35, CASTLE.door[1] + 0.35, CASTLE.porch[1] + 0.1, CASTLE.door[1] + 0.9],
  [-6.05, -9.84, -4.8, -8.95],
  [2.8, -9.65, 4.05, -8.75],
  [-7.5, -11.4, -2.6, -9.86],
  [5.6, -13, 9.5, -5],
]

/**
 * The castle close up, as it kneels for her: the hull's iron in plates, not one grey plane. Each plate its own tone
 * of iron, the seams between them, and a row of rivets along either side of each seam; the sun on the upper plates
 * and the wet dark along the waterline. Drawn over the castle, in the hull's own frame, only where it is plate.
 */
function drawHullClose(p: p5, k: number, W: number, ink: string, T: number, cx: number, c: CastleNow): void {
  const near = smooth(c.s, 0.55, 0.9)
  if (near <= 0.01 || c.pose.step <= 5) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const X = depthX(c.x, c.s, cx)
  const Y = depthY(c.feet, c.s)
  const o = onBody(c.pose, [0, 0])
  const e = onBody(c.pose, [1, 0])
  const ks = k * c.s
  p.push()
  ctx.save()
  p.translate(X * k, Y * k)
  p.translate(o[0] * ks, o[1] * ks)
  p.rotate(Math.atan2(e[1] - o[1], e[0] - o[0]))
  const Q = (v: number) => v * ks
  // Only on the plate: inside the hull, outside what is not plate.
  ctx.beginPath()
  HULL_OUTLINE.forEach(([x, y], i) => (i ? ctx.lineTo(Q(x), Q(y)) : ctx.moveTo(Q(x), Q(y))))
  ctx.closePath()
  for (const [a, b2, c2, d] of NOT_PLATE) {
    ctx.moveTo(Q(a), Q(b2))
    ctx.lineTo(Q(a), Q(d))
    ctx.lineTo(Q(c2), Q(d))
    ctx.lineTo(Q(c2), Q(b2))
    ctx.closePath()
  }
  ctx.clip('evenodd')
  ctx.globalAlpha *= near
  // The plates: each a little lighter or darker than the next.
  const xs = [-9.6, ...SEAMS_X, 7.0]
  const ys = [-12.7, ...SEAMS_Y, -5.8]
  p.noStroke()
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const h = hash(i, j, 131)
      p.fill(alpha(p, h < 0.5 ? '#FFFFFF' : '#000000', 0.035 + 0.06 * Math.abs(h - 0.5) * 2))
      p.beginShape()
      for (const [x, y] of [[xs[i], ys[j]], [xs[i + 1], ys[j]], [xs[i + 1], ys[j + 1]], [xs[i], ys[j + 1]]] as Pt[]) {
        p.vertex(Q(seamX(x, y)), Q(seamY(y, x)))
      }
      p.endShape(p.CLOSE)
    }
  }
  // The sun on the upper plates, and the wet dark along the waterline.
  const sun = ctx.createLinearGradient(0, Q(-12.6), 0, Q(-8.6))
  sun.addColorStop(0, alpha(p, SUN, 0.16).toString())
  sun.addColorStop(1, alpha(p, SUN, 0).toString())
  ctx.fillStyle = sun
  ctx.fillRect(Q(-10), Q(-12.8), Q(20), Q(4.3))
  const wet = ctx.createLinearGradient(0, Q(-6.9), 0, Q(-5.8))
  wet.addColorStop(0, 'rgba(20, 24, 34, 0)')
  wet.addColorStop(1, 'rgba(20, 24, 34, 0.32)')
  ctx.fillStyle = wet
  ctx.fillRect(Q(-10), Q(-6.9), Q(20), Q(1.2))
  // The new seams (the castle draws the long ones), a line of ink a little lighter than its own.
  p.noFill()
  p.stroke(alpha(p, ink, 0.4))
  p.strokeWeight(W * 0.55)
  for (const y of [-11.35, -8.1]) {
    p.beginShape()
    for (let i = 0; i <= 24; i++) {
      const x = -9.6 + (i / 24) * 16.6
      p.vertex(Q(x), Q(seamY(y, x)))
    }
    p.endShape()
  }
  // Rivets: a row down either side of every seam, each a dark head with a glint of the sky on its top.
  const heads = new Path2D()
  const glints = new Path2D()
  const R0 = 0.034
  const rivet = (x: number, y: number) => {
    heads.moveTo(Q(x + R0), Q(y))
    heads.arc(Q(x), Q(y), Q(R0), 0, Math.PI * 2)
    glints.moveTo(Q(x - 0.008 + R0 * 0.4), Q(y - 0.012))
    glints.arc(Q(x - 0.008), Q(y - 0.012), Q(R0 * 0.4), 0, Math.PI * 2)
  }
  const PITCH = 0.26
  for (const x0 of SEAMS_X) {
    for (let y = -12.45; y < -5.9; y += PITCH) for (const side of [-0.1, 0.1]) rivet(seamX(x0, y) + side, y)
  }
  for (const y0 of SEAMS_Y) {
    for (let x = -9.4; x < 6.9; x += PITCH) for (const side of [-0.1, 0.1]) rivet(x, seamY(y0, x) + side)
  }
  // Along the deck's edge and above the belly's dark band, one row each.
  for (let x = -7.5; x < 6.0; x += PITCH) rivet(x, -12.05)
  ctx.fillStyle = alpha(p, WASTES.ironDark, 0.85).toString()
  ctx.fill(heads)
  ctx.fillStyle = alpha(p, FLOWERS.white, 0.35).toString()
  ctx.fill(glints)
  ctx.restore()
  p.pop()
  // The war's light out of the door, on the plates round it and on the porch's boards.
  const L = warLight(T, c)
  if (L > 0.01) {
    const d = doorway(c, cx)
    const mx = (d.x0 + d.x1) / 2
    const my = d.sill - d.h * 0.35
    const g = ctx.createRadialGradient(mx * k, my * k, 0, mx * k, my * k, 2.6 * c.s * k)
    const warm = mixHex(TOWN.ember, TOWN.fire, 0.35 + 0.3 * flicker(T))
    g.addColorStop(0, alpha(p, warm, 0.34 * L).toString())
    g.addColorStop(0.45, alpha(p, warm, 0.12 * L).toString())
    g.addColorStop(1, alpha(p, warm, 0).toString())
    ctx.save()
    ctx.fillStyle = g
    ctx.fillRect((mx - 2.8) * k, (my - 2.8) * k, 5.6 * k, (d.sill + 0.25 - (my - 2.8)) * k)
    ctx.restore()
  }
}

/**
 * The war's light on the lake: out of the open door it falls across the porch and the water toward us, a warm fan
 * on the lake, and the doorway's own red lies in the water under it as a long broken column, the ripples breaking
 * it into bars, longer and further apart the nearer they are; the stones she runs over catch it.
 */
function drawWarOnWater(p: p5, k: number, f: Frame, T: number, c: CastleNow): void {
  const L = warLight(T, c)
  if (L <= 0.01) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const d = doorway(c, f.cx)
  const w = d.x1 - d.x0
  if (w <= 0.01) return
  const mx = (d.x0 + d.x1) / 2
  const wl = depthY(GW, c.s)
  const fl = flicker(T)
  const warm = mixHex(TOWN.ember, TOWN.fire, 0.3 + 0.3 * fl)
  const hot = mixHex(TOWN.fire, FLOWERS.yellow, 0.25 + 0.2 * fl)
  const bot = f.y1 + 0.5
  ctx.save()
  ctx.beginPath()
  tracePath(ctx, k, lakeOutline(f).pts)
  ctx.clip()
  ctx.beginPath()
  ctx.rect(-1e5, wl * k, 2e5, 1e5)
  ctx.clip()
  // The fan: from the doorway's width at the sill, spreading as it comes toward us, fading; feathered at its
  // sides (a few widening layers, each fainter), so it is light on water and never a beam with edges.
  const fanWarm = mixHex(TOWN.fire, FLOWERS.yellow, 0.15 + 0.15 * fl)
  for (let i = 0; i < 5; i++) {
    const spread = 1.2 + 0.55 * i
    const fan = ctx.createLinearGradient(0, wl * k, 0, (wl + 2.8) * k)
    fan.addColorStop(0, alpha(p, fanWarm, 0.17 * L).toString())
    fan.addColorStop(0.5, alpha(p, fanWarm, 0.07 * L).toString())
    fan.addColorStop(1, alpha(p, fanWarm, 0).toString())
    ctx.fillStyle = fan
    ctx.beginPath()
    ctx.moveTo((d.x0 - 0.1 - 0.12 * i) * k, wl * k)
    ctx.lineTo((d.x1 + 0.1 + 0.12 * i) * k, wl * k)
    ctx.lineTo((d.x1 + spread) * k, (wl + 2.9) * k)
    ctx.lineTo((d.x0 - spread) * k, (wl + 2.9) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'screen'
  // The column: the doorway's red lying in the water under it, a soft glow down the lake toward us, and on it the
  // ripples' glints, each its own length and offset, breaking up and scattering wider the nearer they are.
  const glow = ctx.createLinearGradient(0, wl * k, 0, bot * k)
  glow.addColorStop(0, alpha(p, hot, 0.75 * L).toString())
  glow.addColorStop(0.35, alpha(p, warm, 0.45 * L).toString())
  glow.addColorStop(1, alpha(p, warm, 0.15 * L).toString())
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.moveTo((d.x0 + 0.05) * k, wl * k)
  ctx.lineTo((d.x1 - 0.05) * k, wl * k)
  ctx.bezierCurveTo((d.x1 + 0.1) * k, (wl + 1) * k, (d.x1 + 0.35) * k, (bot - 1) * k, (d.x1 + 0.4) * k, bot * k)
  ctx.lineTo((d.x0 - 0.4) * k, bot * k)
  ctx.bezierCurveTo((d.x0 - 0.35) * k, (bot - 1) * k, (d.x0 - 0.1) * k, (wl + 1) * k, (d.x0 + 0.05) * k, wl * k)
  ctx.closePath()
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  for (let j = 0; j < 34; j++) {
    const y = wl + 0.05 + 0.06 * j + 0.0035 * j * j + 0.03 * hash(j, 144)
    if (y > bot) break
    const far = clamp01((y - wl) / 3.5)
    const th = 0.022 + 0.03 * far
    const spread = w * (0.5 + 0.9 * far)
    // Two or three glints to a ripple, apart.
    const n = 1 + Math.floor(hash(j, 145) * 2.99)
    for (let q = 0; q < n; q++) {
      const drift = Math.sin(T * (1.4 + 0.5 * hash(j, q, 146)) + j * 1.7 + q * 2.1)
      const x = mx + (hash(j, q, 147) - 0.5) * spread + drift * (0.04 + 0.12 * far)
      const len = w * (0.18 + 0.4 * hash(j, q, 148)) * (1 - 0.35 * far) * (0.85 + 0.15 * Math.sin(T * 2.3 + j + q))
      const a = L * (1 - 0.5 * far) * (0.55 + 0.45 * hash(j, q, 149))
      ctx.fillStyle = alpha(p, far < 0.12 ? hot : warm, a).toString()
      ctx.beginPath()
      ctx.ellipse(x * k, y * k, (len / 2) * k, (th / 2) * k, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
  // The stones' wet tops catch it.
  p.push()
  p.noStroke()
  RUN.stones.forEach(([a0, a1], i) => {
    const sx = (a0 + a1) / 2
    const reach = 1 - smooth(Math.abs(sx - mx), 0.5, 4.5)
    if (reach <= 0.01) return
    p.fill(alpha(p, hot, 0.35 * L * reach * (0.8 + 0.2 * hash(i, 143))))
    p.ellipse(sx * k, (GR + 0.005) * k, (a1 - a0 + 0.35) * k, 0.06 * k)
  })
  p.pop()
}

/** The war's light out of the door on her, as she runs for it: her side toward the door warm, the other side her own. */
function drawLightOnHer(p: p5, k: number, st: FieldState, T: number): void {
  if (T < AJAR - 0.05 || T > END) return
  const c = castleAt(T)
  const L = warLight(T, c)
  if (L <= 0.01) return
  const at = laneAt(st.lane, T - st.begin)
  if (at.hidden) return
  const d = doorway(c, 0)
  // (The doorway's x at the castle's own depth: the castle is on her plane now, so the camera's centre drops out.)
  const mx = (d.x0 + d.x1) / 2
  const my = d.sill - d.h * 0.4
  const a = Math.atan2(my - at.y, mx - at.x)
  const r = FLOOR * at.scale
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const reach = 1 - smooth(Math.hypot(mx - at.x, my - at.y), 1.5, 6)
  if (reach <= 0.01) return
  const warm = mixHex(TOWN.fire, FLOWERS.yellow, 0.2 + 0.2 * flicker(T))
  ctx.save()
  ctx.beginPath()
  ctx.arc(at.x * k, at.y * k, r * 0.97 * k, 0, Math.PI * 2)
  ctx.clip()
  const g = ctx.createLinearGradient((at.x - Math.cos(a) * r) * k, (at.y - Math.sin(a) * r) * k, (at.x + Math.cos(a) * r) * k, (at.y + Math.sin(a) * r) * k)
  g.addColorStop(0, alpha(p, warm, 0).toString())
  g.addColorStop(0.3, alpha(p, warm, 0).toString())
  g.addColorStop(1, alpha(p, warm, 0.85 * L * reach).toString())
  ctx.fillStyle = g
  ctx.fillRect((at.x - r) * k, (at.y - r) * k, 2 * r * k, 2 * r * k)
  ctx.restore()
}

/* ------------------------------------------------------------------ the whole picture */

function drawField(p: p5, k: number, W: number, ink: string, T: number, T0: number): void {
  const f = frame(p, k)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const castle = castleAt(T)
  p.push()
  p.rectMode(p.CORNER)
  drawSky(p, k, f, T)
  drawRanges(p, k, f, T, false, [0])
  drawFleet(p, k, W, ink, T, f.cx, false)
  drawRanges(p, k, f, T, false, [1])
  // The ground back to the horizon, down to her plane, and what it reflects.
  const reflect = castle.s < 0.999 || castle.pose.step > 5 ? castle : null
  // (Each pass runs a little past where the next begins, so no seam of sky shows along the ground between them.)
  drawMeadow(p, k, f, YH, GR + 0.12)
  drawLake(p, k, W, ink, f, T, YH, GW + 0.12, reflect && castle.s < 0.999 ? castle : null)
  drawBanks(p, k, f, YH, GR)
  drawSpecks(p, k, f, T, false)
  // The castle, where it is in the depth; if it is wading, the water over its legs.
  drawTheCastle(p, k, W, ink, T, f.cx, castle)
  drawHullClose(p, k, W, ink, T, f.cx, castle)
  if (castle.feet > GR + 0.01 && castle.s < 0.999) {
    const wl = depthY(GW, castle.s)
    if (wl < GW) drawLake(p, k, W, ink, f, T, wl, GW, castle)
  }
  drawSplashes(p, k, T, f.cx)
  // Her machine.
  drawWheel(p, k, W, ink, T)
  drawPours(p, k, T)
  drawFlumeBack(p, k, W, ink, T)
  drawBeds(p, k, W, T)
  drawTrough(p, k, W, ink, T)
  // The ground in front of her plane (the meadow round the lake, not over it).
  ctx.save()
  ctx.beginPath()
  ctx.rect(-1e5, GR * k, 2e5, 1e5)
  tracePath(ctx, k, lakeOutline(f).pts)
  ctx.clip('evenodd')
  drawMeadow(p, k, f, GR, f.y1 + 1)
  ctx.restore()
  drawLake(p, k, W, ink, f, T, GW, f.y1 + 1, castle.s >= 0.999 && castle.pose.step > 5 ? castle : null)
  drawBanks(p, k, f, GR, f.y1 + 1)
  drawStones(p, k, W, ink, T)
  drawWarOnWater(p, k, f, T, castle)
  drawRace(p, k, W, ink, T)
  drawSpecks(p, k, f, T, true)
  drawPetals(p, k, T)
  // Howl's wings, under his ball.
  const h = howlAt(T, T0)
  if (h && T > WINGS - 0.1) {
    const spread = smooth(T, WINGS, WINGS + 1.8)
    p.push()
    p.translate(h.x * k, h.y * k)
    drawWings(p, k, W, ink, { t: T, spread, flap: (T - WINGS) * 2 * Math.PI * 1.35, heading: -2.2 + 0.4 * (1 - spread) })
    p.pop()
  }
  p.pop()
}

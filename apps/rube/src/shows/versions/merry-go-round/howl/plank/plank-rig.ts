import { R, type Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { bar, CLIMAX, FINALE, HEART } from '../music'
import { CALCIFER_HELD } from '../seams'
import { CASTLE, FAR } from '../wastes/castle'

/**
 * The plank's clock and its body: where the plank is and how it holds itself at every show time from the climax
 * to the finale, and where everyone on it is. Pure numbers, no drawing: `plank.ts` draws from these and builds
 * Sophie's lane from the same functions, so she never slides off it.
 *
 * The plank is the castle's room floor: a long deck of boards on an iron keel, the four bird legs under it. Deck
 * cells: `u` along it from the castle's own x = 0 (so a castle point's x is its u), `v` down from the deck's top.
 * World cells are the part's frame (Sophie comes in at (-0.5, 0), at rest, holding Calcifer).
 */

export const c = (n: number, pos = 1): number => bar('climax', n, pos)

/* ------------------------------------------------------------------ the deck */

export const DECK = {
  back: -5.2,
  front: 4.8,
  /** The boards' thickness, and the keel's underside (the hips are in it). */
  boards: 0.22,
  keel: 0.75,
  /** Calcifer's grate (where the hearth was), Sophie's place beside it, and where Howl comes down. */
  grate: 0.6,
  sophie: 0.15,
  howl: 4.2,
  /** Where she carries him to (a little space between them); where she ends, and Howl [0.36, 0] from her. */
  sophieHeart: 3.45,
  sophieEnd: 3.7,
  howlEnd: 3.7 + 0.36,
}

/** The hips sit at the keel's underside, so the thighs' round tops stay under the boards. */
const HIP_V = DECK.keel + 0.1

/** The legs: each hip in deck cells (the far pair set back as the castle's are), which pair it steps with. */
export interface LegDef {
  u: number
  v: number
  far: boolean
  /** Pair A lands on the odd climax bars from 10, pair B on the others. */
  pair: 0 | 1
  /** Where its foot stands before the run, from its hip's x. */
  stand: number
}
export const LEGS: LegDef[] = [
  { u: CASTLE.hips[0][0], v: HIP_V, far: false, pair: 0, stand: 0.45 },
  { u: CASTLE.hips[1][0], v: HIP_V, far: false, pair: 1, stand: -0.35 },
  { u: CASTLE.hips[0][0] + FAR[0], v: HIP_V, far: true, pair: 1, stand: 0.7 },
  { u: CASTLE.hips[1][0] + FAR[0], v: HIP_V, far: true, pair: 0, stand: -0.05 },
]

/**
 * The deck's height over the ground: the castle's floor standing; crouched to run; sat on its folded legs; and
 * last on its own keel, when it has slid off its broken legs.
 */
const STAND_H = -CASTLE.door[1]
const RUN_H = 5.95
const SIT_H = 1.6
const KEEL_H = 0.92
/** Where a sat hip is over the ground: its foot is straight under it, the knee folded back along the ground. */
export const SIT_HIP = SIT_H - HIP_V

/* ------------------------------------------------------------------ the clock */

export const T0 = CLIMAX
export const T1 = FINALE
/** The collapse: the castle drops a piece on each of the first eight bars. */
export const CROUCH = c(8)
/** Calcifer set back in the grate on the plank; the first stroke; full stride. */
export const PUT_FROM = c(8, 2)
export const PUT = c(8, 3)
export const GO = c(9)
const FULL = c(10) + 0.55
/** Howl: in out of the sky, down on the prow on the loudest note, slumped. */
export const HOWL_IN = 262.75
export const HOWL_LAND = c(21)
export const SLUMP = c(21, 2)
/** She lifts Calcifer out of the grate (the legs falter), carries him to Howl, raises him, and gives him back. */
export const LIFT_OUT = c(23)
export const CARRY0 = c(23, 2)
export const CARRY1 = c(26)
export const RAISE = c(26, 2)
export { HEART }
/** Calcifer comes out of Howl's chest free, a small star. */
export const FREE = c(27, 2)
/** The plank loses its legs, sits down on them, and slides. */
export const BUCKLE = c(28)
export const DOWN = c(30)
/** It slides off its legs (they stay on the brow) and on down the slope on its keel. */
export const SLIDE0 = DOWN + 0.35
const CRUISE = c(32) + 0.45
const BRAKE = c(34) + 0.7
/** Turnip Head stops it at the edge. */
export const IMPACT = c(37)
/** The run stops at the brow. */
const EASE = LIFT_OUT
const STOP = c(26) + 0.35
/** Howl stirs, and she leans to him: the cadenza's notes. */
export const STIR = 287.364
export const GLANCE = 291.677
/** Her last step to him: from the cadenza's first high note. */
const NEAR0 = 286.383
const NEAR1 = 288.9

const V = 2.9
const VS = 3.3
const V_IMP = 0.62
/** The impact's give: a damped rock forward and back, starting at the speed it hit with. */
const IMP_W = (2 * Math.PI) / 0.62
const IMP_TAU = 0.3
const IMP_A = V_IMP / IMP_W

/** A hit that rings down: 0 at the hit, rising at once, a few damped swings. */
export const ring = (u: number, period: number, tau: number): number => (u <= 0 ? 0 : Math.sin((2 * Math.PI * u) / period) * Math.exp(-u / tau))
/** A pulse that rises from 0 and dies away (never negative): a jolt that comes back. */
const pulse = (u: number, rise: number): number => (u <= 0 ? 0 : (u / rise) * Math.exp(1 - u / rise))

/** The stumbles as it falters: the moments its weakening steps come down. */
const HITCH = [c(23, 2), c(24), c(25), c(26)]

function vRun(t: number): number {
  let v = V * smooth(t, GO, FULL) * (1 - smooth(t, EASE, STOP))
  for (const h of HITCH) v *= 1 - 0.45 * pulse(t - h, 0.12) * Math.exp(-1)
  return Math.max(0, v)
}
function vSlide(t: number): number {
  if (t <= SLIDE0 || t >= IMPACT) return 0
  if (t < BRAKE) return VS * smooth(t, SLIDE0, CRUISE)
  return VS + (V_IMP - VS) * smooth(t, BRAKE, IMPACT)
}

/* ------------------------------------------------------------------ the travel, integrated once */

const DT = 0.002
const N = Math.ceil((T1 + 1 - T0) / DT) + 2
const TRAVEL = new Float64Array(N)
{
  let x = 0
  let prev = vRun(T0) + vSlide(T0)
  TRAVEL[0] = 0
  for (let i = 1; i < N; i++) {
    const t = T0 + i * DT
    const v = vRun(t) + vSlide(t)
    x += ((prev + v) / 2) * DT
    TRAVEL[i] = x
    prev = v
  }
}
function travel(t: number): number {
  const f = (Math.max(T0, t) - T0) / DT
  const i = Math.min(N - 2, Math.floor(f))
  const u = Math.min(1, f - i)
  const base = TRAVEL[i] + (TRAVEL[i + 1] - TRAVEL[i]) * u
  return base + (t > IMPACT ? IMP_A * Math.sin(IMP_W * (t - IMPACT)) * Math.exp(-(t - IMPACT) / IMP_TAU) : 0)
}

/** The deck's middle at the start: Sophie at (-0.5, 0), her centre R over the boards. */
export const BX0 = -0.5 - DECK.sophie
export const BY0 = R
/** The ground under the castle, and the moor it runs across. */
export const YG = BY0 + STAND_H

/** Where the run stops (it sits there, at the brow), and where the slide ends against Turnip Head. */
export const BX_SIT = BX0 + travel(BUCKLE)
export const BX_IMP = BX0 + travel(IMPACT)

/* ------------------------------------------------------------------ the land */

/**
 * The land from the moor to the cliff: flat moor, a brow, a long slope down (a smoothstep, steepest in the middle,
 * about 22°), a flat ledge, and the edge with a low rocky lip on it where Turnip Head stands; then the drop.
 */
export const LAND = (() => {
  // It stops perched on the brow, its nose over the start of the slope; the slope ends under its tail at the end.
  const b0 = BX_SIT + 0.6
  const f1 = BX_IMP + DECK.back - 0.5
  const H = 0.3 * (f1 - b0)
  const th = BX_IMP + DECK.front + 0.32
  return { b0, f1, H, ledge: YG + H, th, edge: th + 0.5, lip: 0.14 }
})()

export function ground(x: number): number {
  if (x <= LAND.b0) return YG
  if (x >= LAND.f1) return LAND.ledge
  const u = (x - LAND.b0) / (LAND.f1 - LAND.b0)
  return YG + LAND.H * u * u * (3 - 2 * u)
}

/* ------------------------------------------------------------------ the body */

export interface Deck {
  x: number
  y: number
  rot: number
}

/** The collapse's shudders: [time, drop, tilt]. The first is the climax, the castle's back broken. */
const SHUDDERS: [number, number, number][] = [
  [T0, 0.16, 0.012],
  [c(1), 0.04, -0.006],
  [c(1, 2), 0.06, 0.008],
  [c(2), 0.07, -0.01],
  [c(3), 0.07, 0.01],
  [c(4), 0.08, -0.012],
  [c(5), 0.05, 0.008],
  [c(6), 0.07, 0.01],
  [c(7), 0.1, -0.012],
  [c(8), 0.08, 0.01],
]

/** Where the plank's deck is at `t`: its middle on the boards' top, and its tilt (nose down positive). */
export function deck(t: number): Deck {
  const x = BX0 + travel(t)
  let y = BY0
  let rot = 0
  // The collapse: every piece that breaks away shakes the rest.
  for (const [h, d, r] of SHUDDERS) {
    y += d * ring(t - h, 0.5, 0.3)
    rot += r * ring(t - h, 0.62, 0.4)
  }
  // Crouched to run, as the hull comes away.
  const crouch = t <= CROUCH ? 0 : 1 - (1 + (t - CROUCH) / 0.17) * Math.exp(-(t - CROUCH) / 0.17)
  y += (YG - RUN_H - BY0) * crouch
  // The run: down as each pair of feet lands, a forward lean with the pace.
  const pace = vRun(t) / V
  if (pace > 0) {
    const ph = phaseOfBar(t)
    y += 0.14 * pace * Math.cos(2 * Math.PI * (ph - 0.12))
    rot += pace * (0.022 + 0.01 * Math.sin(2 * Math.PI * ph))
  }
  // Howl comes down on the prow: it dips and rocks back.
  y += 0.12 * ring(t - HOWL_LAND, 0.55, 0.35)
  rot += 0.05 * ring(t - HOWL_LAND, 0.7, 0.45)
  // Faltering: each weak step comes down harder.
  HITCH.forEach((h, i) => {
    y += (0.1 + 0.05 * i) * ring(t - h, 0.6, 0.3)
    rot += (i % 2 ? -1 : 1) * 0.02 * ring(t - h, 0.7, 0.35)
  })
  // It sits: the knees give on the bar, it sinks on its folded legs, and settles with a bump.
  if (t > BUCKLE) {
    const u = Math.min(1, (t - BUCKLE) / (DOWN - BUCKLE))
    // A give on the bar (the knees go), then a sink that gathers, touching down on the bar two on.
    const f = 0.22 * (1 - Math.exp(-u / 0.06)) + 0.78 * u * u
    const h = SIT_H + (KEEL_H - SIT_H) * smooth(t, SLIDE0, SLIDE0 + 0.8)
    const target = sitY(x, h)
    y += (target - (YG - RUN_H)) * Math.min(1, f)
    rot += sitRot(x) * Math.min(1, f)
    y -= 0.14 * ring(t - DOWN, 0.5, 0.22)
  }
  // Sliding down: over the stones on each bar.
  for (let n = 31; n <= 36; n++) {
    const b = c(n)
    y -= 0.07 * Math.max(0, ring(t - b, 0.42, 0.16))
    rot += (n % 2 ? 0.018 : -0.014) * ring(t - b, 0.5, 0.25)
  }
  // Stopped against him: the nose dips toward the drop, and rocks back.
  rot += 0.045 * ring(t - IMPACT, 0.8, 0.5)
  return { x, y, rot }
}

/** Sat on its legs over x: resting on the ground under its two pairs of hips. */
function sitY(x: number, h: number): number {
  const a = ground(x + LEGS[0].u)
  const b = ground(x + LEGS[1].u)
  return (a + b) / 2 - h
}
function sitRot(x: number): number {
  return Math.atan2(ground(x + LEGS[0].u) - ground(x + LEGS[1].u), LEGS[0].u - LEGS[1].u)
}

/** A deck point (u along, v down from the boards' top) in the world at `t`. */
export function onDeck(t: number, u: number, v: number, d: Deck = deck(t)): Pt {
  const cs = Math.cos(d.rot)
  const sn = Math.sin(d.rot)
  return [d.x + u * cs - v * sn, d.y + u * sn + v * cs]
}

/** Where in its bar the climax is at `t`, 0..1 from the downbeat. */
export function phaseOfBar(t: number): number {
  for (let n = 1; n <= 38; n++) {
    const a = c(n)
    const b = c(n + 1)
    if (t >= a && t < b) return (t - a) / (b - a)
  }
  return 0
}

/* ------------------------------------------------------------------ the riders */

/** Sophie's place along the deck. */
export function sophieU(t: number): number {
  let u = DECK.sophie + (DECK.sophieHeart - DECK.sophie) * smooth(t, CARRY0, CARRY1)
  // In the cadenza she goes the last step to him.
  u += (DECK.sophieEnd - DECK.sophieHeart) * smooth(t, NEAR0, NEAR1)
  // Thrown forward a little when it stops against Turnip Head, and back.
  u += 0.06 * ring(t - IMPACT, 0.6, 0.3)
  return u
}

/** Howl's place along the deck once he is down: he stirs toward her in the cadenza. */
export function howlU(t: number): number {
  let u = DECK.howl + (DECK.howlEnd - DECK.howl) * smooth(t, STIR, STIR + 2.2)
  // He stirs on the note: a small start, then he rolls to her.
  u -= 0.035 * ring(t - STIR, 0.4, 0.3)
  u += 0.07 * ring(t - IMPACT, 0.6, 0.3)
  return u
}

export const sophieAt = (t: number): Pt => onDeck(t, sophieU(t), -R)

/**
 * Howl: out of the sky from high behind, beating down on the accents, a stall and a heavy landing on the prow on
 * the loudest note; then riding the deck.
 */
export function howlAt(t: number): Pt {
  const land = onDeck(t, howlU(t), -R)
  if (t >= HOWL_LAND) return land
  const s = Math.max(0, (t - HOWL_IN) / (HOWL_LAND - HOWL_IN))
  const x = -7.5 * Math.pow(1 - s, 1.5)
  let y = -8.5 * (1 - s) * (1 - 0.72 * s)
  // His wingbeats: each lifts him a little as he comes down.
  for (const b of [264.649, 265.044, 265.427]) y -= 0.22 * pulse(t - b, 0.1) * Math.exp(-(t - b) / 0.5) * 0.6
  return [land[0] + x, land[1] + y]
}

/** Howl's wingbeats as he comes down: the downstroke on each accent, the last one the landing. */
const STROKES = [263.581, 264.649, 265.044, 265.427, 265.834]

/** Howl's wings: how spread, their beat (-1..1, as `drawWings` reads `sin(flap)`), their heading. */
export function wingsAt(t: number): { spread: number; beat: number; heading: number } {
  const fold = 1 - smooth(t, HEART, HEART + 1.4)
  // The beat: gliding at first, then a heavy stroke on each accent.
  let ph = -Math.PI / 2 - 2 * Math.PI * Math.max(0, (STROKES[0] - t) / 1.2)
  for (let i = 0; i < STROKES.length - 1; i++) {
    if (t >= STROKES[i] && t < STROKES[i + 1]) ph = -Math.PI / 2 + 2 * Math.PI * (i + (t - STROKES[i]) / (STROKES[i + 1] - STROKES[i]))
  }
  if (t >= STROKES[STROKES.length - 1]) ph = -Math.PI / 2
  const flying = smooth(t, HOWL_IN + 0.2, STROKES[0] - 0.2)
  const beat = 0.15 * (1 - flying) + flying * Math.sin(ph)
  if (t < HOWL_LAND) {
    const [x0, y0] = howlAt(t - 0.06)
    const [x1, y1] = howlAt(t + 0.06)
    return { spread: 1, beat, heading: Math.atan2(y1 - y0, x1 - x0) }
  }
  // Down: he comes up to face us on the prow, the wings fallen open and drooping either side of him, the tail down
  // over the deck; they fold away when his heart is back.
  const droop = smooth(t, HOWL_LAND - 0.05, SLUMP + 0.35)
  const [x0, y0] = howlAt(HOWL_LAND - 0.12)
  const [x1, y1] = howlAt(HOWL_LAND - 0.02)
  const from = Math.atan2(y1 - y0, x1 - x0)
  const to = -Math.PI / 2
  return { spread: (1 - 0.34 * droop) * fold, beat: -1 + 2 * droop, heading: from + (to - from) * droop }
}

/**
 * Calcifer: where his base is and how he is, from the climax on. Held in her hands through the collapse; set back
 * in the grate to drive the plank; lifted out and carried to Howl; into his chest; out again, free, a small star
 * that flies up, and comes back to turn in the sky over them in the cadenza.
 */
export interface CalciferPose {
  at: Pt
  size: number
  weak: number
  look: Pt
  lean: number
  mouth: number
  shut: number
  /** Drawn at all (he is inside Howl for a moment). */
  shown: boolean
  /** A star now: how far (0..1). */
  star: number
}

export const HOVER_AT = (): Pt => {
  const d = deck(T1)
  const [x, y] = onDeck(T1, DECK.sophieEnd, -R, d)
  return [x + 1.9, y - 2.75]
}

export function calciferAt(t: number): CalciferPose {
  const her = sophieAt(t)
  const hands = (raise = 0): Pt => [her[0] + CALCIFER_HELD.at[0], her[1] + CALCIFER_HELD.at[1] - raise]
  const grate = onDeck(t, DECK.grate, -0.16)
  // How weak he is: he fades blue as the castle dies, and burns only a little brighter in the grate.
  const weak = 0.15 + 0.4 * smooth(t, T0, CROUCH) - 0.08 * smooth(t, PUT, PUT + 1) + 0.12 * smooth(t, LIFT_OUT, HEART)
  const base = { size: CALCIFER_HELD.size, weak, look: [0, -0.3] as Pt, lean: 0, mouth: 0.3, shut: 0, shown: true, star: 0 }
  if (t < PUT_FROM) {
    // Flaring at the break, then held, flinching at each piece that goes.
    const flare = 0.3 * pulse(t - T0, 0.08) * Math.exp(-(t - T0) / 0.6)
    return { ...base, at: hands(), size: CALCIFER_HELD.size * (1 + flare), mouth: 0.25 + 0.5 * pulse(t - T0, 0.1), look: [0, -0.8] }
  }
  if (t < LIFT_OUT) {
    const u = smooth(t, PUT_FROM, PUT)
    const [hx, hy] = hands()
    const at: Pt = [hx + (grate[0] - hx) * u, hy + (grate[1] - hy) * u - 0.25 * Math.sin(Math.PI * u)]
    const pace = vRun(t) / V
    // Back in his grate he flares, and burns on, leaning back into the wind of the run.
    const flare = 0.25 * pulse(t - PUT, 0.08) * Math.exp(-(t - PUT) / 0.5)
    return { ...base, at, size: (CALCIFER_HELD.size + 0.08 * u) * (1 + flare), lean: -0.7 * pace, mouth: 0.25 + 0.35 * pace + flare, look: [1, -0.2], shut: 0.3 * pace }
  }
  if (t < HEART - 0.28) {
    const u = smooth(t, LIFT_OUT, LIFT_OUT + 0.22)
    const [hx, hy] = hands(0.14 * smooth(t, RAISE, HEART - 0.35))
    const at: Pt = [grate[0] + (hx - grate[0]) * u, grate[1] + (hy - grate[1]) * u - 0.15 * Math.sin(Math.PI * u)]
    return { ...base, at, look: [1, 0], mouth: 0.2 }
  }
  if (t < HEART) {
    // Into Howl's chest: from her raised hands into him, going small as he goes in.
    const u = smooth(t, HEART - 0.28, HEART)
    const [hx, hy] = hands(0.14)
    const [wx, wy] = howlAt(t)
    return { ...base, at: [hx + (wx - hx) * u, hy + (wy + 0.12 - hy) * u], size: CALCIFER_HELD.size * (1 - 0.55 * u), look: [1, 0] }
  }
  if (t < FREE) return { ...base, at: howlAt(t), shown: false }
  // Free: out of him, orange again, small, spiralling up out of sight; later back, turning over them.
  const hv = HOVER_AT()
  if (t < 275.4) {
    const u = (t - FREE) / 2.6
    const w = howlAt(FREE)
    const at: Pt = [w[0] + 0.45 * Math.sin(u * 5) + 1.6 * u, w[1] - 0.25 - 7.5 * Math.pow(u, 1.35)]
    return { ...base, at, size: 0.3 - 0.06 * Math.min(1, u), weak: 0, lean: -0.4 * Math.cos(u * 5), mouth: 0.7, look: [0.5, -1], star: Math.min(1, u) * 0.5 }
  }
  const come = smooth(t, 284.4, 286.3)
  const fall = 1 - Math.pow(1 - come, 2)
  const spin = Math.max(0, t - 285.6)
  const loop = 0.26 * smooth(t, 285.6, 287)
  const at: Pt = [hv[0] + 0.3 * (1 - fall) + loop * Math.sin(spin * 2.2), hv[1] - 7 * (1 - fall) + loop * (1 - Math.cos(spin * 2.2)) * 0.6]
  return { ...base, at, size: 0.24, weak: 0, lean: 0.3 * Math.cos(spin * 2.2), mouth: 0.4, look: [-0.6, 0.8], star: 1, shown: t > 284.2 }
}

/* ------------------------------------------------------------------ the legs */

interface Plant {
  from: number
  to: number
  x: number
}

const hipX = (t: number, leg: LegDef): number => onDeck(t, leg.u, leg.v)[0]

/** Each leg's stances: planted before the run, then a landing on every other bar from 10 to 26. */
export const PLANTS: Plant[][] = LEGS.map((leg) => {
  const lands: number[] = []
  for (let n = 10 + leg.pair; n <= 26; n += 2) lands.push(c(n))
  const lifts = lands.map((L, i) => {
    if (i === 0 && leg.pair === 0) return GO
    const prev = i === 0 ? GO : lands[i - 1]
    return L - Math.min(0.8, 0.62 * (L - prev))
  })
  const plants: Plant[] = [{ from: -Infinity, to: lifts[0], x: hipX(T0, leg) + leg.stand }]
  lands.forEach((L, i) => {
    const to = i + 1 < lands.length ? lifts[i + 1] : Infinity
    const end = Number.isFinite(to) ? to : STOP + 0.5
    plants.push({ from: L, to, x: (hipX(L, leg) + hipX(end, leg)) / 2 + (leg.far ? 0.15 : 0) })
  })
  return plants
})

/** Every landing of a foot, for the dust and the steam. */
export const FOOTFALLS: { t: number; leg: number; x: number }[] = PLANTS.flatMap((plants, leg) => plants.slice(1).map((p) => ({ t: p.from, leg, x: p.x })))

/** Where a leg's hip and foot are at `t`, in the world, and how far the foot is off the ground (0..1). */
export function legAt(t: number, i: number, d: Deck = deck(t)): { hip: Pt; foot: Pt; air: number } {
  // Broken off: once it slides, the legs lie where it sat, folded, on the brow.
  if (t > SLIDE0) return legAt(SLIDE0, i)
  const leg = LEGS[i]
  const hip = onDeck(t, leg.u, leg.v, d)
  const plants = PLANTS[i]
  let foot: Pt = [plants[0].x, ground(plants[0].x)]
  let air = 0
  for (let j = 0; j < plants.length; j++) {
    const p = plants[j]
    if (t >= p.from && t <= p.to) {
      foot = [p.x, ground(p.x)]
      break
    }
    const q = plants[j + 1]
    if (q && t > p.to && t < q.from) {
      const s = (t - p.to) / (q.from - p.to)
      const e = s * s * (3 - 2 * s)
      const x = p.x + (q.x - p.x) * e
      const lift = Math.max(0.25, Math.min(1.25, 0.24 * Math.abs(q.x - p.x)))
      foot = [x, ground(x) - lift * Math.sin(Math.PI * s)]
      air = Math.sin(Math.PI * s)
      break
    }
  }
  // Sitting: the feet slide in under the hips and stay there, the knees folding back along the ground.
  const sit = smooth(t, BUCKLE, DOWN - 0.15)
  if (sit > 0) {
    const under = onDeck(t, leg.u, leg.v + SIT_HIP, d)
    foot = [foot[0] + (under[0] - foot[0]) * sit, foot[1] + (under[1] - foot[1]) * sit]
  }
  return { hip, foot, air }
}

/** How hard Calcifer is driving the engine, 0..1: from the first stroke until he is lifted out. */
export function drive(t: number): number {
  return smooth(t, PUT, GO + 0.2) * (1 - smooth(t, LIFT_OUT, LIFT_OUT + 0.9))
}

/* ------------------------------------------------------------------ Turnip Head */

/** Turnip Head at the edge: hopping in place as it comes, bracing on his pole, stopping it, holding. */
export function turnipAt(t: number): { at: Pt; hop: number; height: number; lean: number } {
  const at: Pt = [LAND.th, LAND.ledge - LAND.lip]
  let hop = 0
  for (const n of [33, 34, 35, 36]) {
    const a = c(n)
    const b = c(n, 3)
    if (t >= a && t < b) hop = (t - a) / (b - a)
  }
  // Down from his last hop he plants his pole and braces into it (leaning toward the plank), is pushed back over
  // the brink by it, and holds.
  const brace = -0.3 * smooth(t, c(36, 3), IMPACT)
  const push = 0.52 * smooth(t, IMPACT, IMPACT + 0.12) * (1 - smooth(t, IMPACT + 0.12, IMPACT + 1.6) * 0.6)
  const wobble = 0.05 * ring(t - IMPACT, 0.7, 0.45)
  return { at, hop, height: 0.3, lean: brace + (t > IMPACT ? push + wobble : 0) }
}

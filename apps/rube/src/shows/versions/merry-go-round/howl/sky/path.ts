import type { Pt } from '../../../../../parts'
import { bar, SEAM } from '../music'

/**
 * The sky builder's clock and paths: when everything in the alley and on the walk over the town happens, and where
 * Sophie and Howl are at every moment. Pure numbers, shared by `alley.ts` and `skywalk.ts` (and `set.ts`, which puts
 * the chimneys, the tower and the café under the footholds these give).
 *
 * Coordinates are the alley's own frame (`A`): the town world's (26, 0) is its origin, x right, y down, a ball on the
 * flagstones has its centre at y = 0. The skywalk's frame is this one moved by `ALLEY_EXIT`.
 */

export const BEGIN = SEAM.alley
export const LIFT = SEAM.skywalk
export const END = SEAM.curse

/** The waltz's downbeats: W[0] is the lift (49.035), W[1] bar 1 (50.132) … W[33] (85.804). */
export const W: number[] = [LIFT, ...Array.from({ length: 33 }, (_, i) => bar('waltz', i + 1))]

/* ------------------------------------------------------------------ the alley's moments (all measured onsets) */

/** The held D's first note: a soldier strikes a match on the wall. */
export const MATCH = 38.278
/** The two soldiers push off the wall and step into her way. */
export const BLOCK = 41.378
/** Howl's flick: the soldiers jerk stiff. */
export const FLICK = 42.94
/** The soldiers' stiff march into the side passage, a step a note. */
export const MARCH = [43.166, 43.474, 43.77, 44.124, 44.35]
/** A blob man oozes out of the wall behind them. */
export const OOZE = 44.722
/** Two more ooze out ahead: cornered. */
export const OOZE2 = 45.946
/** The blob men's lurching steps as they close in. */
export const SQUELCH = [46.643, 47.177, 47.671]

/* ------------------------------------------------------------------ helpers */

/**
 * A run from a speed profile: the speed is linear between `[t, v]` keys (so the position is smooth, with no jump in
 * pace), held at the last key's after it and the first's before it.
 */
export function profile(keys: [number, number][], x0: number): (t: number) => number {
  const xs = [x0]
  for (let i = 1; i < keys.length; i++) {
    const [ta, va] = keys[i - 1]
    const [tb, vb] = keys[i]
    xs.push(xs[i - 1] + ((va + vb) / 2) * (tb - ta))
  }
  return (t: number) => {
    if (t <= keys[0][0]) return x0 + keys[0][1] * (t - keys[0][0])
    for (let i = 1; i < keys.length; i++) {
      const [ta, va] = keys[i - 1]
      const [tb, vb] = keys[i]
      if (t <= tb) {
        const d = t - ta
        const a = (vb - va) / Math.max(1e-9, tb - ta)
        return xs[i - 1] + va * d + (a * d * d) / 2
      }
    }
    const n = keys.length - 1
    return xs[n] + keys[n][1] * (t - keys[n][0])
  }
}

/**
 * A monotone cubic through `[t, y]` keys (Fritsch-Carlson): no overshoot, a key at a turn is a stop. The first and
 * last keys have the slopes given (0 by default: from rest, to rest).
 */
export function pchip(keys: [number, number][], s0 = 0, s1 = 0): (t: number) => number {
  const n = keys.length
  const ts = keys.map((k) => k[0])
  const ys = keys.map((k) => k[1])
  const h = (i: number) => ts[i + 1] - ts[i]
  const d = (i: number) => (ys[i + 1] - ys[i]) / h(i)
  const m: number[] = new Array(n).fill(0)
  m[0] = s0
  m[n - 1] = s1
  for (let i = 1; i < n - 1; i++) {
    const a = d(i - 1)
    const b = d(i)
    if (a * b <= 0) continue
    const w1 = 2 * h(i) + h(i - 1)
    const w2 = h(i) + 2 * h(i - 1)
    m[i] = (w1 + w2) / (w1 / a + w2 / b)
  }
  return (t: number) => {
    if (t <= ts[0]) return ys[0] + s0 * (t - ts[0])
    if (t >= ts[n - 1]) return ys[n - 1] + s1 * (t - ts[n - 1])
    let i = 0
    while (i < n - 2 && t > ts[i + 1]) i++
    const H = h(i)
    const u = (t - ts[i]) / H
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * H * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * H * m[i + 1]
  }
}

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
/** 0 until `a`, 1 from `b`, smooth between (zero speed at both ends). */
export const ease = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/** Which bar of the waltz `t` is in (from W[0]), and how far through it. */
export function barAt(t: number): { i: number; u: number; T: number } {
  if (t <= W[0]) return { i: 0, u: 0, T: W[1] - W[0] }
  for (let i = 0; i < W.length - 1; i++) if (t < W[i + 1]) return { i, u: (t - W[i]) / (W[i + 1] - W[i]), T: W[i + 1] - W[i] }
  const i = W.length - 1
  return { i, u: 0, T: W[i] - W[i - 1] }
}

/* ------------------------------------------------------------------ the alley */

/** Where the soldiers lean, and where they step to on the block. */
export const SOLDIER_A = { lean: 2.72, block: 2.45 }
export const SOLDIER_B = { lean: 3.26, block: 3.0 }
/** The side passage they march into (x0, x1, the arch's top). */
export const PASSAGE: [number, number, number] = [3.66, 4.56, -2.25]
/** The blob men: where each oozes out of the wall, when, and their steps in. */
export const BLOBS = [
  { x: 0.95, at: OOZE, steps: [0.95, 1.5, 2.05, 2.6], rest: 3.08, face: 1 as const },
  { x: 6.78, at: OOZE2, steps: [6.78, 6.5, 6.24, 5.98], rest: 5.9, face: -1 as const },
  { x: 7.52, at: OOZE2 + 0.08, steps: [7.52, 7.24, 6.98, 6.72], rest: 6.62, face: -1 as const },
]

/** Sophie in the alley: in at 0.9 c/s, slowing as she sees them, stopped, a shrink back, then on with Howl, faster when the first blob man comes, stopped by the others. */
const sophieAlleyX = profile(
  [
    [BEGIN, 0.9],
    [40.2, 0.9],
    [41.7, 0],
    [41.75, 0],
    [42.05, -0.35],
    [42.4, 0],
    [43.75, 0],
    [44.55, 1.15],
    [OOZE, 1.15],
    [45.3, 1.45],
    [OOZE2, 1.45],
    [47.0, 0],
    [47.6, 0],
    [47.9, -0.12],
    [48.3, 0],
  ],
  -0.5,
)

/** Howl in the alley: in from out of shot behind her, fast, easing to a stop at her side; then with her. */
const HOWL_IN = 39.3
const howlAlleyX = profile(
  [
    [HOWL_IN, 1.8],
    [41.6, 1.8],
    [42.5, 0],
    [43.75, 0],
    [44.55, 1.15],
    [OOZE, 1.15],
    [45.3, 1.45],
    [OOZE2, 1.45],
    [47.0, 0],
  ],
  -3.55,
)
/** Howl's flick: a quick nod up on the note, settling. */
const flick = (t: number): number => (t < FLICK ? 0 : -0.07 * (1 - Math.exp(-(t - FLICK) / 0.03)) * Math.exp(-(t - FLICK) / 0.22))

/** Where she is at the lift: the alley's lane ends here, the skywalk's starts. */
export const LIFT_AT: Pt = [sophieAlleyX(LIFT), 0]
/** The alley part's exit (the skywalk's origin in the alley's frame). */
export const ALLEY_EXIT: Pt = [LIFT_AT[0] + 0.5, 0]
/** Howl beside her at the lift (on her left: he came up behind her). */
export const HOWL_LIFT: Pt = [howlAlleyX(LIFT), 0]

export function sophieAlley(t: number): Pt {
  return [sophieAlleyX(t), 0]
}
export function howlAlley(t: number): Pt | null {
  if (t < HOWL_IN) return null
  return [howlAlleyX(t), flick(t)]
}

/* ------------------------------------------------------------------ the walk on the air */

/**
 * The way over the town, at the downbeats: a smooth base (speed keys for x, a monotone cubic for y), and on it a
 * step a bar: a lift after each downbeat and a landing on the next. While they climb, the step settles at its top
 * on the downbeat and pushes off again (stairs of air); over the roofs it is a lilt; coming down to the balcony the
 * last step is small and soft.
 */
const baseX = profile(
  [
    [W[0], 0],
    [W[1], 0.52],
    [W[2], 0.6],
    [W[3], 0.66],
    [W[4], 0.76],
    [W[5], 0.9],
    [W[6], 1.05],
    [W[7], 1.2],
    [W[8], 1.32],
    [W[9], 1.38],
    [W[19], 1.4],
    [W[22], 1.38],
    [W[24], 1.3],
    [W[26], 1.18],
    [W[27], 1.02],
    [W[28], 0.72],
    [W[29], 0],
  ],
  LIFT_AT[0],
)

/** The apex of the walk, over the square; and the balcony's deck (a ball on it has its centre 0.13 above). */
export const APEX_Y = -15.75
export const DECK_Y = -3.3
export const LAND_Y = DECK_Y - 0.13

const descent = (k: number) => {
  // A smooth S from the apex (W22) to the balcony (W29): small steps at both ends, the biggest in the middle.
  const u = k / 7
  return APEX_Y + (LAND_Y - APEX_Y) * (u * u * (3 - 2 * u))
}
const baseY = pchip(
  [
    [W[0], 0],
    [W[1], -2.3],
    [W[2], -4.55],
    [W[3], -6.7],
    [W[4], -8.65],
    [W[5], -10.3],
    [W[6], -11.6],
    [W[7], -12.45],
    [W[8], -12.95],
    [W[10], -13.15],
    [W[13], -13.25],
    [W[16], -13.55],
    [W[17], -14.1],
    [W[18], -14.85],
    [W[19], -15.55],
    [W[20], -15.66],
    [W[21], -15.73],
    [W[22], APEX_Y],
    [W[23], descent(1)],
    [W[24], descent(2)],
    [W[25], descent(3)],
    [W[26], descent(4)],
    [W[27], descent(5)],
    [W[28], descent(6)],
    [W[29], LAND_Y],
  ],
  0,
  0,
)

/** The base path's slope in y at `t` (for the stairs' settle). */
const baseVy = (t: number) => (baseY(t + 0.002) - baseY(t - 0.002)) / 0.004

/** Sophie's step on bar i: how high each step lifts. Stiff and small at first over the roofs; free by bar 12. */
function sophieLift(i: number): number {
  const T = W[i + 1] - W[i]
  if (i <= 6) return Math.max(0.12, (-baseVy(W[i + 1]) * T) / 4)
  if (i <= 18) return 0.1 + 0.16 * Math.min(1, (i - 7) / 5)
  if (i <= 23) return 0.12
  if (i <= 27) return 0.16
  if (i === 28) return 0.1
  return 0
}
/** Howl's: the same stairs going up, then an easy lilt from the first bar over the roofs. */
function howlLift(i: number): number {
  if (i <= 6 || i >= 19) return sophieLift(i)
  return 0.24
}

/** The lift of a step `u` of the way through its bar: up quickly after the downbeat, down onto the next. */
const bump = (u: number) => 4 * u * (1 - u) * (1 - 0.18 * (u - 0.5))
/** The waltz's lilt in x: a touch quicker after the one, slower into the next. */
const lilt = (u: number, dx: number) => (dx * 0.16 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI)

/** Where the base path is at `t` (no step), in the alley's frame. */
export const walkBase = (t: number): Pt => [baseX(t), baseY(t)]

/** A foothold: where the base path is on downbeat `i`. */
export const foot = (i: number): Pt => walkBase(W[i])

/** The landing on the balcony, and her small steps there to watch him go. */
export const LAND = W[29]
export const LAND_AT: Pt = foot(29)
const WATCH: [number, number] = [83.7, 84.8]
export const WATCH_DX = 0.36

export function sophieWalk(t: number): Pt {
  if (t >= LAND) return [LAND_AT[0] + WATCH_DX * ease(t, WATCH[0], WATCH[1]), LAND_AT[1]]
  const { i, u, T } = barAt(t)
  const [x, y] = walkBase(t)
  const dx = baseX(W[i + 1]) - baseX(W[i])
  void T
  return [x + lilt(u, dx), y - sophieLift(i) * bump(u)]
}

/* ------------------------------------------------------------------ Howl on the walk */

/** Where he is from her: on her left in the alley; he goes up over her in the first two bars and leads on her right. */
const HOWL_R = 0.37
function howlOffset(t: number): Pt {
  const r = Math.abs(HOWL_LIFT[0] - LIFT_AT[0]) + (HOWL_R - Math.abs(HOWL_LIFT[0] - LIFT_AT[0])) * ease(t, W[0], W[2])
  const th = Math.PI + Math.PI * ease(t, W[0] + 0.05, W[2] - 0.1)
  return [r * Math.cos(th), r * Math.sin(th)]
}

/** His bow on the balcony, his hop onto the rail's end, and his walk away up the air over the roofs. */
export const BOW: [number, number] = [81.62, 82.0]
export const HOP_OFF = 82.088
export const ON_RAIL = W[30]
export const RAIL_X = LAND_AT[0] + 1.06
export const RAIL_TOP = DECK_Y - 0.95
const HOWL_RAIL: Pt = [RAIL_X, RAIL_TOP - 0.13]
const HOWL_STEPS: Pt[] = [HOWL_RAIL, [RAIL_X + 1.15, RAIL_TOP - 1.75], [RAIL_X + 2.35, RAIL_TOP - 3.55], [RAIL_X + 3.5, RAIL_TOP - 5.2]]
/** He is out of shot by here; his span ends. */
export const HOWL_GONE = END

export function howlWalk(t: number): Pt {
  if (t < LAND) {
    const { i, u } = barAt(t)
    const [x, y] = walkBase(t)
    const dx = baseX(W[i + 1]) - baseX(W[i])
    const [ox, oy] = howlOffset(t)
    return [x + ox + lilt(u, dx), y + oy - howlLift(i) * bump(u)]
  }
  const at: Pt = [LAND_AT[0] + HOWL_R, LAND_AT[1]]
  if (t < HOP_OFF) {
    // The bow: a slow dip and up again.
    const u = Math.max(0, Math.min(1, (t - BOW[0]) / (BOW[1] - BOW[0])))
    return [at[0], at[1] + 0.07 * (1 - Math.cos(2 * Math.PI * u)) / 2]
  }
  if (t < ON_RAIL) {
    // A light hop up onto the rail's end, landing on the downbeat.
    const T = ON_RAIL - HOP_OFF
    const u = (t - HOP_OFF) / T
    const arc = (20 * T * T) / 8
    return [at[0] + (HOWL_RAIL[0] - at[0]) * u, at[1] + (HOWL_RAIL[1] - at[1]) * u - arc * 4 * u * (1 - u)]
  }
  // On the rail for a bar, then stairs up the air: a push on each downbeat, settling at the top of each step.
  const beats = [ON_RAIL, W[31], W[32], W[33]]
  if (t < beats[1]) return [HOWL_RAIL[0], HOWL_RAIL[1] - 0.02 * Math.sin(((t - ON_RAIL) / (beats[1] - ON_RAIL)) * Math.PI)]
  for (let j = 1; j < beats.length - 1; j++) {
    if (t < beats[j + 1]) {
      const u = (t - beats[j]) / (beats[j + 1] - beats[j])
      const a = HOWL_STEPS[j - 1 + 0]
      const b = HOWL_STEPS[j]
      const e = 1 - (1 - u) * (1 - u)
      return [a[0] + (b[0] - a[0]) * (u * 0.6 + e * 0.4), a[1] + (b[1] - a[1]) * e]
    }
  }
  const a = HOWL_STEPS[2]
  const b = HOWL_STEPS[3]
  const u = Math.min(1.5, (t - beats[3]) / 1.1)
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
}

/* ------------------------------------------------------------------ what the town does, and when */

/** The chimneys they pass over: each under a foothold, puffing on it. */
export const PUFF_BARS = [8, 10, 12, 14, 16]
/** The tower's weathercock is under the foothold of bar 19, the swell: noon. */
export const NOON_BAR = 19
/** Twelve strokes of noon: bars 19 to 30. */
export const STROKES = W.slice(19, 31)
/** The tower's axis (the weathercock right under her step on the first stroke). */
export const TOWER_X = foot(NOON_BAR)[0]
/** Where she lands: the café's balcony is built round this. */
export const BALCONY: [number, number] = [LAND_AT[0] - 1.95, LAND_AT[0] + 1.12]

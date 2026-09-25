import { clamp } from '../../../../../../../../src/core/ease'
import { R, type Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { JUMPS } from '../music'
import { G } from '../physics'
import { SEAMS } from '../seams'

/**
 * The premiere's clock and its ground: every strike in show seconds, and every place the ball touches, worked out
 * once from the seams and the strikes. The lane (`premiere.ts`) and the drawings (`premiere-carpet.ts`,
 * `premiere-alley.ts`) read the same numbers, so a post falls where she clipped it and a step is under her landing.
 *
 * The frame: the ball comes in at (-0.5, 0), mid-flight out of the dryer. The carpet is where that flight lands on
 * the first loud onset after the jump. Along it, then down the stone steps at its end into the alley, where the
 * ground is lower by six risers.
 */

export const BEGIN = JUMPS.premiere
export const END = JUMPS.dojo

/* ------------------------------------------------------------------ strikes, show seconds */

/** The press: a flash on the jump, one at the top of her flight, a volley in the spotlight, one after. */
export const FLASH_JUMP = 57.945
export const FLASH_APEX = 58.259
export const VOLLEY = 61.742
export const FLASH_LATE = 62.833
/** The theatre's doors, as she passes them: the latch goes, and they swing wide on the hit, the lobby's light out over her. */
export const DOORS_CRACK = 66.061
export const DOORS_WIDE = 66.212
/** Down onto the carpet, and a bounce. */
export const LAND = 58.63
export const BOUNCE = 59.072
/** The spotlight finds her. */
export const SPOT = 61.057
/** The rope line, first run: she clips a post; it takes the next, which takes the next, which comes down. */
export const RUN1 = [63.135, 63.518, 63.936, 64.308] as const
/** Second run, past the doors, faster: the clip, two posts taken, the last one down. */
export const RUN2 = [66.595, 66.897, 67.303, 67.675] as const
/** Down the steps at the carpet's end: two quick ones, then the rain, and three slow floats and the landing. */
export const STEPS = [68.696, 69.01, 69.997, 71.239, 72.737, 73.932] as const
/** The laundromat's neon stutters on as she hangs at the top of a float. */
export const NEON_ON = 71.947
/** She reaches him. */
export const TOUCH = 76.463
/** The sign flickers twice after it, like a pulse. */
export const HEART = [76.754, 76.904] as const
/** The drain's cover rocks under the flood, four times, and gives. */
export const RATTLE = [80.956, 81.131, 81.502, 82.001] as const
export const DROP = 82.129
/** She comes down in the drain's race below. */
export const SPLASH = 83.035
/** The race's last bend, and out of its mouth on the jump. */
export const LIP = 86.169

export const PREMIERE_STRIKES: number[] = [
  FLASH_JUMP,
  FLASH_APEX,
  LAND,
  BOUNCE,
  SPOT,
  VOLLEY,
  FLASH_LATE,
  ...RUN1,
  DOORS_CRACK,
  DOORS_WIDE,
  ...RUN2,
  ...STEPS,
  NEON_ON,
  TOUCH,
  ...HEART,
  ...RATTLE,
  DROP,
  SPLASH,
  LIP,
].sort((a, b) => a - b)

/* ------------------------------------------------------------------ time in the alley */

/**
 * How fast time runs in the alley, 1 for real: it slows as the rain begins, hangs while she comes down to him and
 * while they are together, and runs again when the flood comes.
 */
export const timeRate = (t: number): number => 1 - 0.72 * smooth(t, 69.1, 70.4) * (1 - smooth(t, 81.4, 83.1))

/* ------------------------------------------------------------------ the flight in, and the carpet */

/** The seam's throw, carried on: where she is `T` seconds after the jump, under home gravity. */
const V_IN = SEAMS.premiere.v
export const flightIn = (T: number): Pt => [-0.5 + V_IN[0] * T, V_IN[1] * T + 0.5 * G * T * T]

/** The ball's centre rolling on the carpet, and the carpet's face (a ball resting on it has its centre R above). */
export const YC = flightIn(LAND - BEGIN)[1]
export const CARPET = YC + R
/** Where she lands, and where the bounce comes down. */
export const LAND_AT: Pt = [flightIn(LAND - BEGIN)[0], YC]
const V_BOUNCE = 2.2
export const BOUNCE_AT: Pt = [LAND_AT[0] + V_BOUNCE * (BOUNCE - LAND), YC]

/** Her pace along the carpet at show time `t`: the flight's own, hardly easing, and a little less after each clip. */
export function carpetPace(t: number): number {
  return V_BOUNCE * Math.exp(-(t - BOUNCE) / 60) * (t >= RUN1[0] ? 0.97 : 1) * (t >= RUN2[0] ? 0.97 : 1)
}

/** Each step's rise. */
export const RISER = 0.34
/** She rolls off the carpet's end the time a riser takes to fall before the first step. */
const FALL1 = Math.sqrt((2 * RISER) / G)
export const EDGE_T = STEPS[0] - FALL1

const DT = 1 / 1000
const TABLE = (() => {
  const n = Math.ceil((EDGE_T - BOUNCE) / DT) + 2
  const out = new Float64Array(n)
  out[0] = BOUNCE_AT[0]
  for (let i = 1; i < n; i++) {
    const a = BOUNCE + (i - 1) * DT
    out[i] = out[i - 1] + (DT / 6) * (carpetPace(a + 1e-9) + 4 * carpetPace(a + DT / 2) + carpetPace(a + DT - 1e-9))
  }
  return out
})()

/** Her x on the carpet at show time `t` (from the bounce to the edge). */
export function carpetX(t: number): number {
  const f = clamp((t - BOUNCE) / DT, 0, TABLE.length - 1.0001)
  const i = Math.floor(f)
  return TABLE[i] + (TABLE[i + 1] - TABLE[i]) * (f - i)
}

/** The carpet's end: the top of the steps down into the alley. */
export const EDGE_X = carpetX(EDGE_T)
const V_EDGE = carpetPace(EDGE_T)

/* ------------------------------------------------------------------ the steps */

/**
 * Where she comes down on each step (ball centre), and how high each float goes over its chord. The first two are
 * quick, at home gravity; from the second the rain begins and the world slows round the two of them, so the floats
 * hang (their gravity is what the arc makes it).
 */
export const STEP_LAND: Pt[] = (() => {
  const out: Pt[] = []
  const s1: Pt = [EDGE_X + V_EDGE * FALL1, YC + RISER]
  out.push(s1)
  const s2: Pt = [s1[0] + V_EDGE * 0.9 * (STEPS[1] - STEPS[0]), YC + 2 * RISER]
  out.push(s2)
  const reach = [0.8, 0.84, 0.86, 0.74]
  let p = s2
  for (let i = 0; i < reach.length; i++) {
    p = [p[0] + reach[i], p[1] + RISER]
    out.push(p)
  }
  return out
})()
/** The floats' arcs (the first two are real throws). */
export const STEP_ARC = [0, (G * (STEPS[1] - STEPS[0]) ** 2) / 8, 0.36, 0.46, 0.52, 0.4]

/**
 * Each step's nosing: the step down from the one before. Step 0 is the carpet; step 6 is the landing. A nosing
 * stands a share of the way along the float that crosses it, where the ball is still well clear of it.
 */
export const NOSING: number[] = (() => {
  const out = [EDGE_X]
  const share = [0.42, 0.55, 0.58, 0.6, 0.62]
  for (let i = 0; i < 5; i++) out.push(STEP_LAND[i][0] + share[i] * (STEP_LAND[i + 1][0] - STEP_LAND[i][0]))
  return out
})()
/** The face of step `i` (0 is the carpet, 6 the landing). */
export const stepFace = (i: number): number => CARPET + RISER * i

/* ------------------------------------------------------------------ the landing, the drain, him */

/** The landing's ball line and face. */
export const YL = YC + 6 * RISER
export const LANDING = YL + R
/** Where she comes to him: the middle of the drain's cover. He waits just right of it, where she will touch him. */
export const MEET_X = STEP_LAND[5][0] + 0.96
export const WAYMOND_X = MEET_X + 2 * R
/** The cover: its free edge (left) and its hinge (right), and how far it swings open. */
export const COVER_L = MEET_X - 0.23
export const COVER_R = MEET_X + 0.22
export const COVER_OPEN = 1.02

/** The approach from the landing to him: slowing all the way, and just moving when they touch. */
const V_OFF_STEPS = 0.62
const V_AT_TOUCH = 0.1
export function approachX(t: number): number {
  const T = TOUCH - STEPS[5]
  const u = clamp((t - STEPS[5]) / T)
  const D = MEET_X - STEP_LAND[5][0]
  const h10 = u * u * u - 2 * u * u + u
  const h01 = -2 * u * u * u + 3 * u * u
  const h11 = u * u * u - u * u
  return STEP_LAND[5][0] + h10 * V_OFF_STEPS * T + h01 * D + h11 * V_AT_TOUCH * T
}

/** The cover's swing at show time `t`: radians, its free edge down. Four knocks, then open, then shut again slowly. */
export function coverAt(t: number): number {
  let a = 0
  RATTLE.forEach((r, i) => {
    const s = t - r
    if (s > 0 && s < 0.6) a += (0.05 + 0.02 * i) * (s / 0.045) * Math.exp(1 - s / 0.045)
  })
  const d = t - DROP
  if (d > 0) {
    // Open over a fifth of a second, a little past, hold while she goes, and back up on its weight, settling.
    const open = COVER_OPEN * (1 - Math.exp(-d / 0.07)) * (1 + 0.08 * Math.exp(-d / 0.18) * Math.sin(d * 14))
    const back = smooth(d, 0.62, 1.25)
    const ring = d > 1.25 ? 0.05 * Math.exp(-(d - 1.25) / 0.2) * Math.sin((d - 1.25) * 22) : 0
    a += open * (1 - back) + Math.abs(ring)
  }
  return a
}

/** A point on the cover at `d` along it from the hinge, lifted `up` off its face, at show time `t`. */
export function onCover(t: number, d: number, up: number): Pt {
  const a = coverAt(t)
  return [COVER_R - d * Math.cos(a) - up * Math.sin(a), LANDING + d * Math.sin(a) - up * Math.cos(a)]
}

/**
 * The drop, worked out once: she rolls down the opening cover to its free edge, and falls clear into the shaft. When
 * she leaves the edge, where, and how fast.
 */
const COVER_LEN = COVER_R - COVER_L
const SLIDE_H = 1 / 2000
const SLIDE: number[] = []
export const OFF = (() => {
  let d = COVER_R - MEET_X
  let v = 0
  let t = DROP
  const h = SLIDE_H
  SLIDE.push(d)
  while (t < DROP + 1 && d < COVER_LEN) {
    v += (5 / 7) * G * timeRate(t) ** 2 * Math.sin(coverAt(t)) * h
    d += v * h
    t += h
    SLIDE.push(Math.min(d, COVER_LEN))
  }
  const a = coverAt(t)
  const p = onCover(t, COVER_LEN, R)
  // Along the cover, and what its swing carries her by (it is still opening under her).
  const w = (coverAt(t + 0.001) - coverAt(t - 0.001)) / 0.002
  const vel: Pt = [-v * Math.cos(a) + d * w * Math.sin(a), v * Math.sin(a) + d * w * Math.cos(a)]
  return { t, d, p, v: vel }
})()
/** Her centre as she rolls down the opening cover, from the drop until she leaves its edge. */
export function slideAt(t: number): Pt {
  const f = clamp((t - DROP) / SLIDE_H, 0, SLIDE.length - 1.0001)
  const i = Math.floor(f)
  return onCover(t, SLIDE[i] + (SLIDE[i + 1] - SLIDE[i]) * (f - i), R)
}

/** Her centre where she comes down in the race below, and so the water's line there. */
export const SPLASH_AT: Pt = fallAt(SPLASH)

/**
 * The fall down the shaft from the cover's edge, in the alley's slowed time as it runs back up to real: her centre at
 * show time `t`. Her sideways drift dies away against the shaft's far side (a graze, not a knock).
 */
export function fallAt(t: number): Pt {
  let x = OFF.p[0]
  let y = OFF.p[1]
  let vx = OFF.v[0]
  let vy = OFF.v[1]
  const h = 1 / 1000
  for (let s = OFF.t; s < t - 1e-9; s += h) {
    const step = Math.min(h, t - s)
    vy += G * timeRate(s) ** 2 * step
    vx *= Math.exp(-step / 0.12)
    x += vx * step
    y += vy * step
  }
  return [x, y]
}
export const WATER = SPLASH_AT[1] + 0.02
/** The shaft under the cover, down to the race. */
export const SHAFT_L = Math.min(COVER_L, SPLASH_AT[0] - R - 0.1)
export const SHAFT_R = COVER_R

/* ------------------------------------------------------------------ the race and its mouth */

/** How fast the race carries her at the bend: then the lip turns her up, out of the mouth at the seam's velocity. */
const V_OUT = SEAMS.dojo.v
const V_RACE = Math.hypot(V_OUT[0], V_OUT[1])
const RACE_T = LIP - SPLASH
/**
 * Her x along the race `s` seconds after the splash: the fall's sideways drift taken off her, and the current, slow
 * at first and gathering, to the race's pace at the bend. (The speed is -0.35·e^(-s/0.18) + V·(0.25 + 0.75u²); this
 * is its integral.)
 */
function raceDX(s: number): number {
  const u = clamp(s / RACE_T)
  return -0.35 * 0.18 * (1 - Math.exp(-s / 0.18)) + V_RACE * RACE_T * (0.25 * u + 0.25 * u * u * u)
}
const RACE_END = raceDX(RACE_T)
/** Her bob on the water: the plunge from the fall, and a slow roll on the current. */
function raceBob(s: number): number {
  const plunge = 0.11 * (s / 0.07) * Math.exp(1 - s / 0.07)
  const roll = 0.012 * Math.sin(s * 7.5) * smooth(s, 0.3, 0.8) * (1 - smooth(s, RACE_T - 0.5, RACE_T - 0.1))
  return plunge + roll
}
export function raceAt(t: number): Pt {
  const s = Math.max(0, t - SPLASH)
  return [SPLASH_AT[0] + raceDX(s), SPLASH_AT[1] + raceBob(s)]
}
export const BEND_AT: Pt = [SPLASH_AT[0] + RACE_END, SPLASH_AT[1]]
/** The mouth: where the lane ends, on the jump. */
export const MOUTH: Pt = [BEND_AT[0] + V_OUT[0] * (END - LIP), BEND_AT[1] + V_OUT[1] * (END - LIP)]
/** The terrace's end wall, which the race's pipe comes out through. */
export const TERRACE_R = MOUTH[0] - 0.42

/* ------------------------------------------------------------------ the alley's clock */

const RATE_T0 = 60
const RATE = (() => {
  const n = Math.ceil((END + 2 - RATE_T0) / DT)
  const out = new Float64Array(n + 1)
  for (let i = 1; i <= n; i++) out[i] = out[i - 1] + timeRate(RATE_T0 + (i - 0.5) * DT) * DT
  return out
})()
/** The alley's own clock at show time `t`: what the rain falls by. */
export function alleyTime(t: number): number {
  if (t <= RATE_T0) return t - RATE_T0
  const f = Math.min(RATE.length - 1.0001, (t - RATE_T0) / DT)
  const i = Math.floor(f)
  return RATE[i] + (RATE[i + 1] - RATE[i]) * (f - i)
}

/* ------------------------------------------------------------------ him */

/**
 * Waymond, waiting under the lamp at the drain's edge. When she lands he comes the last little way to meet her. Her
 * touch rolls him a little way off and he rolls back to her;
 * the cover dropping under his side jolts him toward it; and when it has shut again he goes, slowly, to where she
 * was, and stops there. He never goes further.
 */
export function waymondAt(t: number): Pt {
  // A little way off while she comes down the steps; as she lands, he rolls to meet her the last of the way.
  let x = WAYMOND_X + 0.07 * (1 - smooth(t, STEPS[5] + 0.15, STEPS[5] + 1.6))
  const s = t - TOUCH
  if (s > 0) x += 0.05 * (s / 0.24) * Math.exp(1 - s / 0.24)
  const d = t - DROP
  if (d > 0) x -= 0.022 * (d / 0.12) * Math.exp(1 - d / 0.12)
  x -= (WAYMOND_X - (MEET_X + 0.03)) * smooth(t, DROP + 1.6, DROP + 3.4)
  return [x, YL]
}
/** From when he is in the alley (well before the camera comes round the corner), and to the jump. */
export const WAYMOND_FROM = 64

import { FLOOR, R, type Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { G_FLOAT } from '../physics'

/**
 * The waltz, from the iris on painted Paris to the lights going out among the
 * stars: one clock and one pair of dancers for both parts of the night.
 *
 * Everything here is in the NIGHT frame: the painted part's own cells (its
 * entry cell's centre is 0,0; the ball rests on the floor at y = 0). The
 * stars part is laid at the painted part's exit and moves these into its own
 * frame by that one offset.
 *
 * The two of them turn round each other about a centre that travels: on the
 * cobbles the circle lies flat on the floor (seen from a little above, so the
 * one upstage is higher in the picture), and once they leave the floor it
 * stands up to face us. Seb is on one side of the circle, Mia on the other.
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

/** The stage is painted Paris from here (the score's `SWITCH.night`), under the closed iris. */
export const NIGHT_FROM = 269
/** The iris opens on him, from nothing. */
export const IRIS: [number, number] = [269.677, 272.6]
/** The orchestra comes in under the choir and they begin to turn: the waltz's first ONE. */
export const WALTZ = 272.625
/** Five umbrellas open behind them, one on each of the waltz's first five ONEs, as they pass. */
export const UMBRELLA_HITS = [272.625, 274.112, 275.598, 277.06, 278.709]
/** The open umbrellas curtsy together, closer and closer, as the pair nears the clock. */
export const CURTSY_HITS = [282.308, 286.534, 289.448, 291.062]
/** Midnight: the street clock's bell, three strokes. */
export const CHIME_HITS = [292.374, 293.291, 293.721]
/** The balloons shaken loose by the strokes go up. */
export const RELEASE = 294.812
/** The painted sky flies out; then the rest of Paris after it. The score's stars begin at FLY_SKY. */
export const FLY_SKY = 297.332
export const FLY_SET = 298.852
/** They leave the floor; the top of the float, where the first star is lit. */
export const LIFT = 300.954
export const APEX = 304.17
/** The melody's notes, each lighting a star round them. */
export const KINDLE_HITS = [304.17, 305.528, 306.875, 309.626, 310.938, 313.864, 316.488, 317.788, 321.91, 323.675, 324.429]
/** The quiet before the last swell. */
export const QUIET: [number, number] = [327.4, 331.3]
/** The top of the swell: he dips her, and the sky stops with them. */
export const DIP = 336.62
/** The cue's last note: she comes up out of the dip to him, and they touch. */
export const LAST = 338.709
/** The lights go (the cover), and the night's end. */
export const DARK: [number, number] = [338.9, 340.0]
export const NIGHT_END = 340.5
/** Mia is in the night from under the closed iris to under the full dark. */
export const MIA_SPAN: [number, number] = [269.0, 340.2]

/* ------------------------------------------------------------------ the set (NIGHT frame) */

/** The floor's far edge: where the quay's parapet stands, and later the horizon of the dark floor. */
export const UPSTAGE = -0.62
/** How much a depth on the floor is foreshortened in the picture (the floor is seen from a little above). */
export const FORESHORTEN = 0.5
/** The lamp they start under, and the one on the way to the clock. */
export const LAMPS = [-1.3, 6.95]
/** The street clock's post, and the balloon seller's cart beside it. */
export const CLOCK_X = 9.05
export const CART_X = 10.75

/* ------------------------------------------------------------------ helpers */

/** A monotone cubic through keys (Fritsch-Carlson): speed carried through a key that goes on the same way, a stop on a hold. */
export function pchip(keys: [number, number][]): (t: number) => number {
  const n = keys.length
  const xs = keys.map((k) => k[0])
  const ys = keys.map((k) => k[1])
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  const m: number[] = new Array(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) continue
    const h0 = xs[i] - xs[i - 1]
    const h1 = xs[i + 1] - xs[i]
    const w1 = 2 * h1 + h0
    const w2 = h1 + 2 * h0
    m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
  }
  return (t) => {
    if (t <= xs[0]) return ys[0]
    if (t >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (i < n - 2 && t > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const u = (t - xs[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u))

/* ------------------------------------------------------------------ where the pair goes */

/**
 * The centre of the pair along the quay: still under the first lamp while the
 * iris opens, off on the first ONE, a travelling waltz past the umbrellas
 * (about a cell and a quarter a bar), then slower, turning, under the second
 * lamp to the clock, and hardly moving once the stars have them.
 */
const CX = pchip([
  [NIGHT_FROM, -0.29],
  [WALTZ, -0.29],
  [274.112, 0.5],
  [275.598, 1.72],
  [277.06, 2.94],
  [278.709, 4.22],
  [282.308, 5.95],
  [286.534, 7.0],
  [289.448, 7.85],
  [292.374, 8.62],
  [297.332, 9.2],
  [LIFT, 9.45],
  [316, 9.95],
  [DIP, 10.35],
  [NIGHT_END, 10.4],
])

/** The float: off the floor on LIFT with just the speed that G_FLOAT spends by APEX, and held there by the dream. */
const V0 = G_FLOAT * (APEX - LIFT)
export const FLOAT_H = 0.5 * G_FLOAT * (APEX - LIFT) ** 2
function height(t: number): number {
  if (t <= LIFT) return 0
  if (t <= APEX) {
    const s = t - LIFT
    return V0 * s - 0.5 * G_FLOAT * s * s
  }
  let h = FLOAT_H
  // A slow climb while the waltz grows, a sinking breath in the quiet, and the swell that lifts them to the top of the sky.
  h += 0.75 * smooth(t, APEX + 0.6, 316.5)
  h -= 0.55 * smooth(t, QUIET[0], QUIET[0] + 3.2)
  h += 2.7 * smooth(t, QUIET[1] - 0.3, DIP - 0.25)
  h -= 0.12 * smooth(t, LAST, NIGHT_END)
  // Afloat: a long slow breath, which comes in only once the float has settled.
  h += 0.1 * Math.sin(((t - APEX) * 2 * Math.PI) / 7.5) * smooth(t, APEX, APEX + 3) * (1 - smooth(t, QUIET[1], QUIET[1] + 2))
  return h
}

/** The waltz's bars on the floor (its ONEs), for the rise and fall of the step; rubato, read off the bass. */
export const BARS = [272.625, 274.112, 275.598, 277.06, 278.709, 280.1, 281.546, 282.8, 284.22, 285.4, 286.534, 287.85, 289.19, 290.59, 291.94, 293.291, 294.68, 296.02, 297.332, 298.678, 300.02, 301.4]
/** Where in its bar `t` is, 0 on the ONE, and whether the waltz is under way. */
export function barPhase(t: number): number {
  if (t < BARS[0]) return 0
  for (let i = 0; i < BARS.length - 1; i++) if (t < BARS[i + 1]) return (t - BARS[i]) / (BARS[i + 1] - BARS[i])
  return ((t - BARS[BARS.length - 1]) / 1.36) % 1
}
/** The step's rise: down on the ONE, up through two and three. Only on the floor. */
function lilt(t: number): number {
  const u = barPhase(t)
  const on = smooth(t, WALTZ, WALTZ + 1.2) * (1 - smooth(t, LIFT - 0.8, LIFT))
  return 0.045 * Math.sin(Math.PI * u) ** 2 * on
}

/* ------------------------------------------------------------------ how fast they turn */

/** Seconds per turn is 2π over this: a half turn a bar on the cobbles; slower afloat; faster and faster up the swell. */
const V_ARR = 2.3
function omegaBase(t: number): number {
  let w = 2.1 * smooth(t, WALTZ, WALTZ + 0.9)
  w -= 0.55 * smooth(t, LIFT - 0.3, APEX)
  w += 0.85 * smooth(t, APEX + 0.8, 316.5)
  w += 0.45 * smooth(t, 318, 325)
  w -= 1.75 * smooth(t, QUIET[0], QUIET[0] + 2.4)
  w += 4.3 * smooth(t, QUIET[1], DIP - 0.35)
  // Into the dip: the whirl gathered in to arrive, still turning, on the note.
  w -= (w - V_ARR) * smooth(t, DIP - 0.34, DIP)
  return w
}

/** Where Seb is on the circle at the dip: upper left, so she is down to his lower right. */
const DIP_SEB = 0.61 + Math.PI
/** After the dip: the arrival's overshoot, settled heavy. */
const DIP_HZ = 1.0
const DIP_DECAY = 0.22

const DT = 1 / 200
const T_A = NIGHT_FROM - 1
const T_B = NIGHT_END + 1
/** The circle's angle, integrated once from the speeds, and bent (over the long middle) to arrive at the dip exactly. */
const THETA: Float64Array = (() => {
  const n = Math.ceil((T_B - T_A) / DT) + 1
  const raw = new Float64Array(n)
  raw[0] = Math.PI
  for (let i = 1; i < n; i++) {
    const t = T_A + i * DT
    raw[i] = raw[i - 1] + 0.5 * (omegaBase(t - DT) + omegaBase(t)) * DT
  }
  const at = (t: number) => raw[Math.round((t - T_A) / DT)]
  const miss = DIP_SEB - at(DIP)
  const delta = miss - 2 * Math.PI * Math.round(miss / (2 * Math.PI))
  for (let i = 0; i < n; i++) raw[i] += delta * smooth(T_A + i * DT, 314, DIP - 0.36)
  return raw
})()

function table(t: number): number {
  const u = (Math.max(T_A, t) - T_A) / DT
  const i = Math.min(THETA.length - 2, Math.floor(u))
  return lerp(THETA[i], THETA[i + 1], u - i)
}
/** The angle on the dip's note, unwound (DIP_SEB plus whole turns). */
const THETA_DIP = table(DIP)

/** The circle's angle at `t`, unwound (it only grows, but for the dip's settle): the sky is geared to it. */
export function theta(t: number): number {
  if (t <= DIP) return table(t)
  const s = t - DIP
  return THETA_DIP + (V_ARR / (2 * Math.PI * DIP_HZ)) * Math.exp(-s / DIP_DECAY) * Math.sin(2 * Math.PI * DIP_HZ * s)
}

/** 0 on the floor, 1 once they are afloat and the circle faces us. */
export const air = (t: number): number => smooth(t, LIFT, APEX)

/** Half the distance between them: arm's length on the floor, wider afloat, closer in the quiet, widest at the top of the swell. */
function radius(t: number): number {
  let r = 0.28 + 0.08 * air(t)
  r -= 0.06 * smooth(t, QUIET[0], QUIET[0] + 2.4) * (1 - smooth(t, QUIET[1], QUIET[1] + 1.6))
  r += 0.1 * smooth(t, QUIET[1], DIP - 0.4)
  return r
}

/** How flat the circle is in the picture: foreshortened on the floor, round afloat. */
const tilt = (t: number): number => lerp(FORESHORTEN, 1, air(t))

/* ------------------------------------------------------------------ the two of them */

/** The centre of the pair, in the picture (y up is negative). */
export function centre(t: number): Pt {
  return [CX(t), -height(t) - lilt(t)]
}

/** Seb's offset from the centre, and Mia's (opposite), on the circle. */
function onCircle(t: number, a: number): Pt {
  const r = radius(t)
  return [r * Math.cos(a), r * tilt(t) * Math.sin(a)]
}

/** Seb, the thread. */
export function sebAt(t: number): Pt {
  const c = centre(t)
  const o = onCircle(t, theta(t))
  return [c[0] + o[0], c[1] + o[1]]
}

/** The dip: she goes further back and down, held; then up out of it to touch him on the last note. */
const DIP_IN: [number, number] = [DIP - 0.3, DIP + 0.12]
const DIP_HOLD = DIP + 1.05
const TOUCH_ANGLE = 0.24
const TOUCH_LEN = 2 * R + 0.004

/** Where Mia is, seen from Seb: across the circle from him, but her own in the dip and the touch. */
function miaFromSeb(t: number): Pt {
  const a = theta(t) + Math.PI
  const r = radius(t)
  const e = tilt(t)
  let rel: Pt = [2 * r * Math.cos(a), 2 * r * e * Math.sin(a)]
  if (t < DIP_IN[0]) return rel
  // Into the dip: turned on down past the circle, and reaching back a little further.
  const dip = smooth(t, DIP_IN[0], DIP_IN[1])
  const len0 = Math.hypot(rel[0], rel[1])
  const ang0 = Math.atan2(rel[1], rel[0])
  let ang = ang0 + 0.36 * dip
  let len = len0 + 0.07 * dip
  if (t > DIP_HOLD) {
    // Up out of it: gathering speed toward him, and stopped by him on the note.
    const s = clamp01((t - DIP_HOLD) / (LAST - DIP_HOLD))
    const u = s * s * (2 - s)
    ang = lerp(ang, TOUCH_ANGLE, u)
    len = lerp(len, TOUCH_LEN, u)
    if (t > LAST) {
      const k = t - LAST
      len += 0.018 * Math.exp(-k / 0.2) * Math.sin(2 * Math.PI * 1.2 * k)
      ang = TOUCH_ANGLE - 0.05 * smooth(t, LAST + 0.2, LAST + 1.6)
    }
  }
  rel = [len * Math.cos(ang), len * Math.sin(ang)]
  return rel
}

/** Before the waltz she leans in to him once, as the choir holds; that is all. */
function lean(t: number): number {
  return -0.05 * smooth(t, 270.9, 271.9) * (1 - smooth(t, 272.1, WALTZ + 0.4))
}

/** Mia, company. */
export function miaAt(t: number): Pt {
  const s = sebAt(t)
  const d = miaFromSeb(t)
  return [s[0] + d[0] + lean(t), s[1] + d[1]]
}

/**
 * The line of the floor under a ball, for its reflection: on the cobbles each
 * of them stands at their own depth on the flat circle; afloat the circle
 * faces us and the floor under both is the stage's own front line.
 */
export function groundUnder(t: number, who: 'seb' | 'mia'): number {
  const a = theta(t) + (who === 'mia' ? Math.PI : 0)
  const depth = radius(t) * FORESHORTEN * Math.sin(a) * (1 - air(t))
  return FLOOR + depth
}

/* ------------------------------------------------------------------ the sky, geared to them */

/** The sky turns one part in this many of their turning, the same way. */
export const SKY_GEAR = 1 / 20
/** The sky's own angle at `t`, measured from the moment the painted sky flew. */
export const skyAngle = (t: number): number => (theta(t) - theta(FLY_SKY)) * SKY_GEAR
/** The pole the sky turns round: where the two of them are at the top of the swell. */
export const POLE: Pt = centre(DIP)

/** A scatter in [0, 1) for this part of the show. */
export const scatter = (i: number, j = 0): number => hash(i, j, 269)

import { R, type Pt } from '../../../../../parts'
import { BEATS, HALF, LAST, SEAM, SWELL, TONIC } from '../music'

/**
 * The lake house's clock: everything in the room that moves or changes, as pure functions of show time, so the room's
 * drawing, Louise's lane and Hannah's place all read the same numbers.
 *
 * World cells (the house's), y down. Louise's floor place at dawn and at the end is (0, 0): a ball resting on the
 * floor there has its centre at y = 0 and the floor is at y = R.
 */

export const FLOOR = R

/* ------------------------------------------------------------------ easing */

export const clamp01 = (u: number): number => (u <= 0 ? 0 : u >= 1 ? 1 : u)
/** Smoothstep of `t` from `a` to `b`. */
export const ss = (t: number, a: number, b: number): number => {
  const u = clamp01((t - a) / (b - a))
  return u * u * (3 - 2 * u)
}
/** Smootherstep: no jerk at either end. */
export const s5 = (u: number): number => {
  const v = clamp01(u)
  return v * v * v * (v * (v * 6 - 15) + 10)
}
/** A cubic from (0, x0, v0) to (d, x1, v1): position at `u` seconds in. */
export function hermite(u: number, d: number, x0: number, v0: number, x1: number, v1: number): number {
  const s = clamp01(u / d)
  const s2 = s * s
  const s3 = s2 * s
  return (2 * s3 - 3 * s2 + 1) * x0 + (s3 - 2 * s2 + s) * d * v0 + (-2 * s3 + 3 * s2) * x1 + (s3 - s2) * d * v1
}

/* ------------------------------------------------------------------ the eras */

/** The house's four times: when the room is what. */
export const ERA = {
  dawn: [0, SEAM.swing] as const,
  bed: [SEAM.bed, SEAM.news] as const,
  news: [SEAM.news, SEAM.arrival] as const,
  home: [SEAM.home, 409] as const,
}
/** The last scene's chords before the cut: the two of them turn to the empty cradle (TURN) and step toward it (NEAR);
 * then the cut onto the cradle at dawn, the baby in it (BEGIN), where Ian leaves the picture. */
export const TURN = 341.618
export const NEAR = 345.49
export const BEGIN = 349.495
/** Before the cut the empty cradle stands this far to the right of its dawn place, clear of Ian, whole in the frame. */
export const EMPTY_DX = 1.3

export type Era = 'dawn' | 'bed' | 'news' | 'home' | 'none'
export function eraOf(T: number): Era {
  if (T < ERA.dawn[1]) return 'dawn'
  if (T >= ERA.bed[0] && T < ERA.bed[1]) return 'bed'
  if (T >= ERA.news[0] && T < ERA.news[1]) return 'news'
  if (T >= ERA.home[0]) return 'home'
  return 'none'
}

/* ------------------------------------------------------------------ the cradle */

/**
 * The cradle: a deep basket with a hood at its head, on a pair of curved rockers, each an arc of radius `RR` rolling on
 * the floor. At rest the arcs touch the floor at `CX0`. Tilted by θ (clockwise, rolling right, positive), every point of
 * it goes round the arc's centre, which has rolled RR·θ along. Its foot end stands a hair to Louise's right, where
 * her push lands.
 */
export const RR = 1.1
/** How far each rocker runs up from the floor either side (radians of its arc). */
export const ALPHA_L = 0.62
export const ALPHA_R = 0.6
/** Where Hannah lies in the cradle at rest (on Louise's right, a little above: HANNAH_BY from (0, 0)). */
export const BABY0: Pt = [1.0, -0.35]

/** The cradle's shape at rest, before it is set down: x from its own zero, and where the rockers touch the floor. */
const CX_RAW = 0.82
/** Its left side where Louise can touch it (the rocker's end and the foot post's face), at rest, before it is set down. */
function leftProfileRaw(): Pt[] {
  const pts: Pt[] = []
  const o: Pt = [CX_RAW, FLOOR - RR]
  // The rocker's underside, from a little in toward its tip, and round the tip's end.
  for (let i = 0; i <= 24; i++) {
    const phi = -ALPHA_L + 0.28 * (1 - i / 24)
    pts.push([o[0] + RR * Math.sin(phi), o[1] + RR * Math.cos(phi)])
  }
  const tip: Pt = [o[0] - RR * Math.sin(ALPHA_L), o[1] + RR * Math.cos(ALPHA_L)]
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / 10
    pts.push([tip[0] + 0.024 * Math.cos(a) + 0.004, tip[1] - 0.024 + 0.024 * Math.sin(a) * -1])
  }
  // The foot post's face, from the rocker up past her top.
  for (let i = 0; i <= 12; i++) pts.push([FOOT_X_RAW, tip[1] - 0.03 - (0.2 * i) / 12])
  return pts
}
/** The foot post's left face (before the cradle is set down). */
const FOOT_X_RAW = CX_RAW - RR * Math.sin(ALPHA_L) + 0.035
/** How far the cradle is moved along so that at rest its foot is `GAP` from Louise at (0, 0). */
const GAP = 0.02
const SHIFT = (() => {
  let best = Infinity
  for (const [x, y] of leftProfileRaw()) if (Math.abs(y) < R) best = Math.min(best, x - Math.sqrt(R * R - y * y))
  return GAP - best
})()
export const CX0 = CX_RAW + SHIFT
/** The cradle's own x, set down: everything drawn of it is offset by this. */
export const CRADLE_SHIFT = SHIFT
export const FOOT_X = FOOT_X_RAW + SHIFT
const LEFT_PROFILE: Pt[] = leftProfileRaw().map(([x, y]) => [x + SHIFT, y])
/** The arc's centre at rest. */
export const O0: Pt = [CX0, FLOOR - RR]

/** A point of the cradle (world cells, at rest) where it is when the cradle is tilted by θ. */
export function pose(theta: number, p: Pt): Pt {
  const dx = p[0] - O0[0]
  const dy = p[1] - O0[1]
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  return [O0[0] + RR * theta + dx * c - dy * s, O0[1] + dx * s + dy * c]
}

/** How far right Louise's centre can be (she is on the floor, y = 0) with the cradle tilted by θ: where she touches it. */
export function contactX(theta: number): number {
  let best = Infinity
  for (const q of LEFT_PROFILE) {
    const [x, y] = pose(theta, q)
    if (Math.abs(y) < R) best = Math.min(best, x - Math.sqrt(R * R - y * y))
  }
  return best
}

/** Her pushes on the cradle: when, and how far it swings for it (radians). */
export interface Push {
  t: number
  a: number
  /** How far she draws back before it. */
  w: number
}
export const DAWN_PUSHES: Push[] = [
  { t: 1.625, a: 0.2, w: 0.13 },
  { t: 6.095, a: 0.19, w: 0.13 },
  { t: 10.095, a: 0.2, w: 0.14 },
  { t: 14.362, a: 0.19, w: 0.13 },
  { t: 19.127, a: 0.15, w: 0.11 },
]
/**
 * At the end: the empty cradle when she comes to it, then with Hannah in it from the cut, dying away with the music.
 * From the last B-flat on she barely moves (the check holds her place and Hannah's to 1% of the frame).
 */
export const HOME_PUSHES: Push[] = [
  { t: 349.495, a: 0.15, w: 0.07 },
  { t: 354.383, a: 0.13, w: 0.07 },
  { t: TONIC, a: 0.09, w: 0.05 },
  { t: 362.585, a: 0.045, w: 0.022 },
  { t: 367.996, a: 0.036, w: 0.018 },
  { t: LAST, a: 0.028, w: 0.015 },
]

/** The cradle's natural swing: a period of about two beats, damped so a push has mostly died by the next chord. */
const PERIOD = 1.95
const OMEGA = (2 * Math.PI) / PERIOD
const TAU = 2.3
function swing(pushes: Push[], T: number): number {
  let th = 0
  for (const p of pushes) {
    const u = T - p.t
    if (u <= 0) continue
    const ramp = ss(u, 0, 0.16)
    th += p.a * Math.exp(-u / TAU) * Math.sin(OMEGA * u) * ramp
  }
  return th
}
/** The cradle's tilt at show time T (0 outside its times). It is still at the dawn's end (the swing seam). */
export function cradleTheta(T: number): number {
  if (T < ERA.dawn[1]) return swing(DAWN_PUSHES, T) * (1 - ss(T, 19.9, 22.0))
  if (T >= ERA.home[0]) return swing(HOME_PUSHES, T)
  return 0
}
export const babyAt = (T: number): Pt => pose(cradleTheta(T), BABY0)


/* ------------------------------------------------------------------ the bed */

/** Where Hannah lies in the bed (the same place in the room as the cradle's baby). */
export const PATIENT: Pt = [1.0, -0.35]
/** She goes on the swell: her ball fades into the bed between these show times. */
export const GONE: [number, number] = [SWELL, 96.595]
/** Louise comes to the bed's side on this chord and stays there: she ends the scene against the empty bed. */
export const BEDSIDE_T = 80.376
export const BEDSIDE_X = 0.27

/* ------------------------------------------------------------------ the clock (the bed's machine) */

/** The beats as a continuous count: an integer on every beat, between them the share of the way. */
export function beatPhase(T: number): number {
  let lo = 0
  let hi = BEATS.length - 1
  if (T <= BEATS[0].t) return (T - BEATS[0].t) / 1
  if (T >= BEATS[hi].t) return hi + (T - BEATS[hi].t) / 1
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (BEATS[m].t <= T) lo = m
    else hi = m
  }
  return lo + (T - BEATS[lo].t) / (BEATS[hi].t - BEATS[lo].t)
}
/** The clock's pendulum: out to one side on each beat, back through the middle between them. It stops being kept on
 * the swell (the weights have run down) and dies away. */
export function pendulum(T: number): number {
  const A = 0.085
  const run = T < SWELL ? 1 : Math.exp(-(T - SWELL) / 0.6)
  // Coming in from the lawn it is already going; the first swing is a whole one.
  return A * run * Math.cos(Math.PI * beatPhase(T))
}
/** The clock strikes on these (the hammer falls on its bell; the striking weight drops a notch). */
export const CLOCK_STRIKES = [SEAM.bed, 76.185, 80.376, 85.31, 89.281, SWELL]
/** How far down the going weight has come (0 at the top, 1 on the floor of the case), and the striking weight. */
export function goingWeight(T: number): number {
  const a = beatPhase(SEAM.bed)
  const b = beatPhase(SWELL)
  const p = Math.min(beatPhase(T), b)
  // A notch on every tick: most of it in a quick drop just after the beat.
  const whole = Math.floor(p)
  const f = p - whole
  const stepped = whole + ss(f, 0, 0.18)
  return 0.28 + 0.72 * clamp01((stepped - a) / (b - a))
}
export function strikingWeight(T: number): number {
  let n = 0
  for (const t of CLOCK_STRIKES) n += ss(T, t, t + 0.25)
  return 0.1 + 0.8 * (n / CLOCK_STRIKES.length)
}
/** The hammer's lift (0 resting on the bell, 1 raised): it rises slowly before each strike and falls on it. */
export function hammer(T: number): { lift: number; ring: number } {
  let lift = 0
  let ring = 0
  for (const t of CLOCK_STRIKES) {
    const u = T - t
    if (u > -0.9 && u < 0) lift = Math.max(lift, ss(u, -0.9, -0.25))
    if (u >= 0 && u < 0.12) lift = Math.max(lift, 1 - ss(u, 0, 0.07))
    if (u >= 0) ring = Math.max(ring, Math.exp(-u / 0.5) * (u < 3 ? 1 : 0))
  }
  return { lift, ring }
}

/* ------------------------------------------------------------------ the television */

/** The television's glass, in world cells: its top-left corner, width and height (16:9). */
export const TV = { x: 1.27, y: -1.735, w: 2.45, h: (2.45 * 9) / 16 }
export const TV_ON = HALF
export function tvOn(T: number): number {
  if (T < TV_ON) return 0
  const u = T - TV_ON
  // It comes on with a flicker: a first flash, a dip, then up.
  const up = ss(u, 0.05, 0.45)
  const dip = u < 0.18 ? 0.55 * Math.exp(-((u - 0.05) ** 2) / 0.002) : 0
  return clamp01(Math.max(up, dip))
}

/* ------------------------------------------------------------------ the light */

/**
 * The light in the room, by show time, as a blend of four moods (they add up to 1):
 *  - `pre`: the blue hour before dawn, the room dark and the window luminous (the show's first frame, and its last);
 *  - `morn`: the morning, the sun coming low through the glass;
 *  - `grey`: an overcast day, flat and cool (the bed);
 *  - `night`: the room dark but for what glows in it (the news).
 * And `sun`, the direct light through the glass onto the floor; `fog`, how thick the fog is over the lake; `amb`, how
 * lit the room is overall (derived), for what stands in it.
 */
export interface Light {
  pre: number
  morn: number
  grey: number
  night: number
  sun: number
  fog: number
  amb: number
  warm: number
}
function light(pre: number, morn: number, grey: number, night: number, sun: number, fog: number): Light {
  const sum = pre + morn + grey + night || 1
  const w = [pre / sum, morn / sum, grey / sum, night / sum]
  return { pre: w[0], morn: w[1], grey: w[2], night: w[3], sun, fog, amb: 0.2 * w[0] + 0.85 * w[1] + 0.62 * w[2] + 0.04 * w[3], warm: w[1] }
}
const DAWN_STEPS = [1.625, 6.095, 10.095, 14.362, 19.127]
/** The first frame's light: the blue hour. The last scene comes back to exactly this. */
const FIRST_LIGHT = light(1, 0, 0, 0, 0, 0.85)
export function lightAt(T: number): Light {
  if (T < ERA.dawn[1] + 1) {
    // The morning comes up a chord at a time.
    let n = 0
    for (const t of DAWN_STEPS) n += ss(T, t, t + 2.8)
    const u = n / DAWN_STEPS.length
    if (u <= 0) return FIRST_LIGHT
    return light(1 - 0.78 * u, 0.78 * u, 0, 0, 0.8 * u ** 1.3, 0.85 - 0.35 * u)
  }
  if (T < ERA.news[0]) {
    // A grey day. On the swell the room greys and the light goes out of it.
    const g = ss(T, SWELL, SWELL + 3.6)
    return light(0.12 * g, 0, 1 - 0.3 * g, 0.18 * g, 0, 0.8 + 0.2 * g)
  }
  if (T < ERA.news[1] + 1) return light(0, 0, 0, 1, 0, 0.2)
  if (T < BEGIN) {
    // The morning after: the sun comes through the glass.
    const u = ss(T, SEAM.home, SEAM.home + 2.4)
    return light(0, 1, 0, 0, 0.45 + 0.55 * u, 0.3)
  }
  // The choice: the morning carries across the cut to the cradle, and cools to the blue hour over the pull-back, so the
  // circle closes on the first frame's light by the last attack.
  const u = ss(T, BEGIN + 1.5, LAST - 1)
  if (u < 1) return light(u, 1 - u, 0, 0, 1 - u, 0.3 + 0.55 * u)
  return FIRST_LIGHT
}

/* ------------------------------------------------------------------ Louise */

/**
 * Louise's place on the floor (x; she is always resting on it) at show time T, in world cells, for each of the house's
 * times. Everything she does in the room is a small push: she draws back, rolls into the cradle's rocker on the chord,
 * follows it the moment it goes, and eases back to her place.
 */
function pushPath(T: number, rest: number, pushes: Push[]): number {
  let x = rest
  for (const p of pushes) {
    const u = T - p.t
    if (u < -1.3 || u > 1.6) continue
    const xc = contactX(cradleTheta(p.t - 1e-6)) - rest
    const back = -p.w
    const follow = Math.min(0.012, p.w * 0.25)
    const vHit = Math.max(0.12, (xc - back) / 0.45) * 1.25
    let d: number
    if (u < -0.5) d = back * s5((u + 1.3) / 0.8)
    else if (u < 0) d = hermite(u + 0.5, 0.5, back, 0, xc, vHit)
    else if (u < 0.2) {
      // Following through while the rocker goes from her: never into it.
      const want = hermite(u, 0.2, xc, vHit, xc + follow, 0)
      d = Math.min(want, contactX(cradleTheta(p.t + u)) - rest)
    } else {
      const from = Math.min(xc + follow, contactX(cradleTheta(p.t + 0.2)) - rest)
      d = from * (1 - s5((u - 0.2) / 1.4))
    }
    x = rest + d
  }
  return x
}
/** Nothing she does goes into the cradle: when it rocks back to her it nudges her. */
const clear = (T: number, x: number): number => Math.min(x, contactX(cradleTheta(T)))
export const dawnX = (T: number): number => clear(T, pushPath(T, 0, DAWN_PUSHES))

/** The bed: at rest beside it; on the chord she comes to its side, and stays. */
export function bedX(T: number): number {
  const u = T - BEDSIDE_T
  if (u <= -1.1) return 0
  if (u < 0) return hermite(u + 1.1, 1.1, 0, 0, BEDSIDE_X - 0.02, 0.05)
  if (u < 0.6) return hermite(u, 0.6, BEDSIDE_X - 0.02, 0.05, BEDSIDE_X, 0)
  return BEDSIDE_X
}
export const NEWS_X = BEDSIDE_X

/**
 * Home: by the long window beside Ian, the empty cradle a little way off on their right. On the chords she rolls into
 * him (the touch), and the two of them turn to the cradle and go toward it a step at a time. On the cut (BEGIN) the
 * cradle is at its dawn place beside her, where Ian stood, the baby in it; she rocks it, and settles at her dawn place.
 */
export const HOME_X = -0.35
export const IAN_X = HOME_X + 0.36
export const HUG_T = 337.85
const STEP = 0.0925
/** Their steps toward the cradle: each begins on its chord and takes a long breath. */
const steps = (T: number, step = STEP): number => step * (s5((T - TURN + 0.1) / 1.3) + s5((T - NEAR + 0.1) / 1.3))
/** Ian beside her: when she rolls into him he gives a little with it and comes back against her; then they step
 * together. He looks at her, and from the turn at the cradle. */
export function ianX(T: number): number {
  const u = T - HUG_T
  const give = u <= 0 ? 0 : 0.045 * Math.sin((Math.min(u, 1.9) * Math.PI) / 1.9) * Math.exp(-u / 1.6)
  // He goes a little ahead of her toward it.
  return IAN_X + give + steps(T - 0.08, 0.14)
}
export const ianLook = (T: number): number => Math.PI + 0.35 - (Math.PI + 0.6) * ss(T, TURN - 0.1, TURN + 1.2)
export function homeX(T: number): number {
  if (T < BEGIN - 0.5) return HOME_X + 0.095 * s5((T - (HUG_T - 0.55)) / 0.9) + steps(T)
  // From her last step she is drawn back just as far as her first push on the cradle wants: the push takes it on.
  return clear(T, pushPath(T, 0, HOME_PUSHES))
}

import { laneAt, type Pt, type Seg } from '../../../../../parts'
import { carried, route, smooth, type Way } from '../kit'
import { a, at, BEATS, SEAM, WIN } from '../music'
import { G } from '../physics'

/**
 * Tokyo's clock and ground (176.689 → 202.391, bars 83 to 94), in the place's own cells. The ball comes in at
 * (-0.5, 0): on the near corner of the one table, his end, under the lamp.
 *
 * Left to right: the judge's table on the floor, Marty's sprung bat clamped to his end of the table, the table (5.5
 * cells, its top 1.3 over the floor), the net under the lamp, Endo beyond the far end, the barrier boards behind him.
 * Behind all of it the stands rise into the dark.
 */

export const T0 = SEAM.tokyo
export const T1 = SEAM.hospital

/* ------------------------------------------------------------------ the ground */

export const R = 0.13
/** The table: its top (the ball rests at y 0 on it), its two ends, the net. */
export const TOP = R
export const FLOOR = TOP + 1.3
export const XL = -0.9
export const XR = 4.6
export const NET_X = (XL + XR) / 2
export const NET_TOP = TOP - 0.3
/** How high the ball's centre must be over the net. */
const NET_CLEAR = NET_TOP - R - 0.05
/** The lamp, hung over the net. */
export const LAMP: Pt = [NET_X, -3.35]
/** Marty's end: where his sprung bat meets the ball, and the pan he serves from (the same place). */
export const CM: Pt = [-1.25, -0.45]
/** The pivot of the sprung arm, on the bracket clamped under the table's end. */
export const PIVOT: Pt = [-0.98, 0.45]
/** His bat's centre as it meets the ball. */
export const BAT_STRIKE: Pt = [CM[0] - 0.2, CM[1]]
/** Where he starts: the near corner. Where he ends: on the far end line. */
export const P0: Pt = [-0.5, 0]
export const END: Pt = [XR - R, 0]
/** The barrier boards behind Endo, and the judge's table. */
export const BOARD: [number, number] = [7.45, 7.62]
export const BOARD_TOP = FLOOR - 0.85
export const JUDGE: [number, number] = [-4.1, -2.35]
/** Where the ball comes to rest on the floor behind Endo. */
export const REST: Pt = [6.95, FLOOR - R]

/* ------------------------------------------------------------------ the clock */

/** One flash bulb in the dark stands as he comes in, on the broken-off line. */
export const FLASH_IN = at(83, 1)
/** The umpire's hand-bell: the exhibition. */
export const BELL = at(83, 3)
/** Endo bows to him (the bottom of the bow). */
export const BOW1 = at(83, 4)
/** Marty refuses: three stomps on the table, and the hop back into his pan. Each brings a section's lights up. */
export const STOMPS = [at(84, 1), at(84, 2), at(84, 3)]
export const IN_PAN = at(84, 4)
export const STOMP_FROM = STOMPS[0] - 0.32
/** The sprung bat cocks. */
export const COCK = at(84, 2)
/** The house lights up, section pair by pair (inner pair first), and down again (outer pair first). */
export const LIGHTS_UP = [at(84, 1), at(84, 2), at(84, 3), at(84, 4)]
export const LIGHTS_DOWN = [at(93, 1), at(93, 2), at(93, 3), at(93, 4)]

/** The real match: every beat of bars 85 to 88 is a bat, every shuffle a bounce. Marty serves on 85.1. */
export const RALLY = BEATS.filter((b) => b.bar >= 85 && b.bar <= 88).map((b) => b.t)
export const RALLY_A = BEATS.filter((b) => b.bar >= 85 && b.bar <= 88).map((b) => a(b.bar, b.pos))
export const SERVE = RALLY[0]
/** Marty's hits (the even ones, and the smash), Endo's (the odd ones). */
export const MARTY_HITS = [...RALLY.filter((_, i) => i % 2 === 0), WIN]
export const ENDO_HITS = RALLY.filter((_, i) => i % 2 === 1)

/** The smash, its bounce, Endo's lunge (a foot down), the boards, and the bounces on the floor. */
export const SMASH_BOUNCE = a(89, 1)
export const LUNGE = at(89, 2)
export const BOARDS = a(89, 2)
export const FLOOR_HITS = [at(89, 3), at(89, 4), a(89, 4), at(90, 1)]
export const STILL = at(90, 3)
/** The arena erupts: flash bulbs on the beats and the shuffles. */
export const FLASH_WIN = [at(89, 2), at(89, 3), a(89, 3), at(89, 4), at(90, 1), a(90, 1), at(90, 2), a(90, 2), at(90, 3), at(90, 4)]
/** The GIs' caps go up. */
export const CAPS = [WIN, at(89, 3), at(90, 1), at(90, 3)]

/** The quiet: Endo turns, steps, picks him up, carries him to the table and sets him on its end line. */
export const TURN = at(91, 1)
export const STEP1 = at(91, 2)
export const PICK = at(91, 3)
export const RISE = at(91, 4)
export const STEP2 = at(92, 1)
export const STEP3 = at(92, 2)
export const SET = at(92, 3)
export const BACK1 = at(92, 4)
export const BACK2 = at(93, 1)
/** He bows to him; the lights go down to the one lamp; he walks off into the dark. */
export const BOW2 = at(93, 3)
export const BOW2_UP = at(94, 1)
export const LEAVE = [at(94, 2), at(94, 3), at(94, 4)]

/* ------------------------------------------------------------------ keyframes */

/** A track through timed keys, eased between each pair; held at the ends. */
export function track(keys: [number, number][], t: number): number {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]
      return v0 + (v1 - v0) * smooth(t, t0, t1)
    }
  }
  return keys[keys.length - 1][1]
}
export function track2(keys: [number, Pt][], t: number): Pt {
  return [track(keys.map(([s, p]) => [s, p[0]]), t), track(keys.map(([s, p]) => [s, p[1]]), t)]
}

/* ------------------------------------------------------------------ the rally */

/** Where each of Marty's shots bounces on Endo's side, and Endo's on his. Endo's contact points. */
const ON_ENDO = [3.3, 3.9, 2.9, 4.05, 3.5, 3.05, 3.8, 3.4]
const ON_MARTY = [0.5, 0.0, 0.9, -0.2, 0.65, 0.2, 1.0, 0.3]
const ENDO_AT: Pt[] = [
  [5.15, -0.5],
  [5.25, -0.62],
  [5.1, -0.42],
  [5.3, -0.58],
  [5.15, -0.48],
  [5.2, -0.66],
  [5.1, -0.44],
  [5.2, -0.55],
]
export const ENDO_CONTACTS = ENDO_AT

/** The lift a flight needs to clear the net, or gravity's own if that is more. */
function flight(from: Pt, to: Pt, T: number): number {
  const g = (G * T * T) / 8
  const s = (NET_X - from[0]) / (to[0] - from[0])
  if (!(s > 0 && s < 1)) return g
  const yc = from[1] + s * (to[1] - from[1])
  return Math.max(g, (yc - NET_CLEAR) / (4 * s * (1 - s)))
}

const SMASH_AT: Pt = [3.7, 0]
const BOARD_HIT: Pt = [BOARD[0] - R, FLOOR - 0.48]
const FLOOR_AT = [7.15, 7.05, 7.0, 6.97]

/** Endo's hand, carrying him: from the floor to the end line. */
export function carryHand(t: number): Pt {
  return track2(
    [
      [PICK, REST],
      [RISE, [6.5, -0.3]],
      [STEP2, [5.05, -0.42]],
      [STEP3, [4.7, -0.22]],
      [SET, END],
    ],
    t,
  )
}

function tokyoWay(): { segs: Seg[]; at: (t: number) => Pt } {
  const w: Way[] = [
    { at: T0, p: P0 },
    { at: STOMP_FROM, p: P0 },
  ]
  const hopTo = (p: Pt, t: number, arc?: number) => {
    const prev = w[w.length - 1]
    const T = t - prev.at
    w.push({ at: t, p, arc: arc ?? (G * T * T) / 8 })
  }
  for (const s of STOMPS) hopTo(P0, s)
  hopTo(CM, IN_PAN)
  w.push({ at: SERVE, p: CM })
  // The rally: a bat on every beat, a bounce on every shuffle.
  for (let i = 0; i < RALLY.length; i++) {
    const from = w[w.length - 1].p
    const marty = i % 2 === 0
    const bounce: Pt = marty ? [ON_ENDO[i >> 1], 0] : [ON_MARTY[i >> 1], 0]
    w.push({ at: RALLY_A[i], p: bounce, arc: flight(from, bounce, RALLY_A[i] - w[w.length - 1].at) })
    const next = i + 1 < RALLY.length ? RALLY[i + 1] : WIN
    const contact: Pt = marty ? ENDO_AT[i >> 1] : CM
    hopTo(contact, next)
  }
  // The smash: off his bat with everything, a bounce, past Endo, into the boards, down to the floor.
  w.push({ at: SMASH_BOUNCE, p: SMASH_AT, arc: flight(CM, SMASH_AT, SMASH_BOUNCE - WIN) })
  hopTo(BOARD_HIT, BOARDS)
  FLOOR_AT.forEach((x, i) => hopTo([x, REST[1]], FLOOR_HITS[i]))
  const d = FLOOR_AT[FLOOR_AT.length - 1] - REST[0]
  w.push({ at: STILL, p: REST, ramp: [(2 * d) / (STILL - FLOOR_HITS[FLOOR_HITS.length - 1]), 0] })
  w.push({ at: PICK, p: REST })
  const segs = [...route(w), ...carried(carryHand, PICK, SET, 48), { from: END, to: END, dur: T1 - SET }]
  return {
    segs,
    at: (t) => {
      const q = laneAt({ segs, fire: 0 }, t - T0)
      return [q.x, q.y]
    },
  }
}
export const WAY = tokyoWay()

/* ------------------------------------------------------------------ Marty's sprung bat */

/**
 * The arm's angle off its strike pose, radians (negative is cocked back, away from the table; positive is through
 * toward the net). Slack until it cocks, cocked between strikes, a snap through each strike, and spent after the smash.
 */
export function armAngle(t: number): number {
  const COCKED = -0.62
  if (t < COCK) return 0.32
  if (t < COCK + 0.12) return 0.32 + (COCKED - 0.32) * smooth(t, COCK, COCK + 0.07) + 0.05 * Math.sin((t - COCK) * 60) * Math.exp(-(t - COCK) / 0.05)
  let v = COCKED
  for (const h of MARTY_HITS) {
    const u = t - h
    const big = h === WIN
    if (u < -0.07 || u > 0.6) continue
    if (u < 0) return COCKED * (1 - smooth(t, h - 0.07, h)) // the snap
    if (big) {
      // Everything: through and past, and it stays there, quivering.
      return 0.95 * smooth(t, h, h + 0.08) + 0.12 * Math.sin(u * 40) * Math.exp(-u / 0.15) - 0.45 * smooth(t, h + 0.25, h + 0.6)
    }
    if (u < 0.09) return 0.55 * smooth(t, h, h + 0.09)
    v = 0.55 + (COCKED - 0.55) * smooth(t, h + 0.09, h + 0.4) + 0.06 * Math.sin((u - 0.4) * 50) * (u > 0.4 ? Math.exp(-(u - 0.4) / 0.06) : 0)
    return v
  }
  if (t > WIN) return 0.5
  return v
}

/* ------------------------------------------------------------------ Endo */

/** Where he stands (his hips' x). */
export function endoX(t: number): number {
  return track(
    [
      [WIN, 5.75],
      [SMASH_BOUNCE, 5.75],
      [LUNGE, 5.5],
      [FLOOR_HITS[1], 5.75],
      [TURN, 5.75],
      [STEP1, 5.95],
      [RISE, 5.95],
      [STEP2, 5.6],
      [STEP3, 5.3],
      [SET, 5.3],
      [BACK1, 5.55],
      [BACK2, 5.8],
      [BOW2_UP, 5.8],
      [LEAVE[0], 6.3],
      [LEAVE[1], 6.95],
      [LEAVE[2], 7.6],
      [T1, 8.3],
    ],
    t,
  )
}
/** Which way he faces: -1 toward the table (left), 1 away. He turns on his steps. */
export const endoFace = (t: number): number => ((t >= TURN && t < RISE) || t >= LEAVE[0] - 0.3 ? 1 : -1)
/** How far forward he leans, radians. */
export function endoLean(t: number): number {
  return track(
    [
      [at(83, 3), 0],
      [BOW1, 0.62],
      [STOMPS[0], 0],
      [SERVE - 0.4, 0],
      [SERVE, 0.18],
      [WIN, 0.18],
      [LUNGE, 0.38],
      [FLOOR_HITS[1], 0.04],
      [STEP1, 0.04],
      [PICK, 0.78],
      [RISE, 0.08],
      [STEP3, 0.1],
      [SET, 0.42],
      [BACK1, 0.04],
      [BACK2 + 0.25, 0.04],
      [BOW2, 0.72],
      [BOW2 + 0.35, 0.72],
      [BOW2_UP, 0.02],
    ],
    t,
  )
}
/** How deep he crouches, 0 standing to 1 squatting at the floor. */
export function endoSquat(t: number): number {
  return track(
    [
      [SERVE - 0.4, 0],
      [SERVE, 0.14],
      [WIN, 0.14],
      [LUNGE, 0.3],
      [FLOOR_HITS[1], 0],
      [STEP1, 0],
      [PICK, 1],
      [RISE, 0],
      [STEP3, 0],
      [SET, 0.16],
      [BACK1, 0],
    ],
    t,
  )
}
/** The times his feet go down, and which (0 the back, 1 the front, in his facing). */
export const ENDO_STEPS = [LUNGE, TURN, STEP1, RISE, STEP2, STEP3, BACK1, BACK2, ...LEAVE]

/** His bat's centre: lowered at his side before the match, then every stroke, then let fall after the point. */
export function endoBat(t: number): Pt | null {
  if (t > LUNGE + 0.5) return null
  const keys: [number, Pt][] = [
    [T0, [5.55, 0.25]],
    [SERVE - 0.55, [5.55, 0.25]],
    [SERVE - 0.05, [5.4, -0.35]],
  ]
  ENDO_HITS.forEach((h, i) => {
    const c = ENDO_AT[i]
    keys.push([h - 0.2, [c[0] + 0.45, c[1] + 0.3]])
    keys.push([h, [c[0] + 0.2, c[1]]])
    keys.push([h + 0.12, [c[0] - 0.12, c[1] - 0.4]])
    keys.push([h + 0.42, [5.4, -0.35]])
  })
  // The smash: he reads it high, and it goes under.
  keys.push([SMASH_BOUNCE - 0.05, [5.7, -0.1]])
  keys.push([LUNGE, [5.2, -0.85]])
  keys.push([LUNGE + 0.5, [5.45, 0.2]])
  return track2(keys, t)
}

/* ------------------------------------------------------------------ the lights */

/** The house lights on section `i` (0 to 7, left to right; 3 and 4 over the table), 0 dark to 1. */
export function houseLight(i: number, t: number): number {
  const ring = Math.min(Math.abs(i - 3.5) - 0.5, 3)
  const up = LIGHTS_UP[ring]
  const down = LIGHTS_DOWN[3 - ring]
  if (t < up) return 0
  const on = Math.min(1, (t - up) / 0.06)
  const flare = 0.25 * Math.exp(-(t - up) / 0.12)
  if (t < down) return on + flare
  return Math.max(0, 1 - (t - down) / 0.12) * 1
}
/** The stands' sections, by their x edges. */
export const SECTIONS = [-17, -11.5, -6.5, -1.8, 2.6, 7.2, 11.5, 16, 21]
export const GI: [number, number, number] = [3.0, 7.0, 7]

/* ------------------------------------------------------------------ strikes */

export const TOKYO_STRIKES: number[] = [
  FLASH_IN,
  BELL,
  BOW1,
  ...STOMPS,
  IN_PAN,
  ...RALLY,
  ...RALLY_A,
  WIN,
  SMASH_BOUNCE,
  LUNGE,
  BOARDS,
  ...FLOOR_HITS,
  ...FLASH_WIN,
  TURN,
  STEP1,
  PICK,
  RISE,
  STEP2,
  STEP3,
  SET,
  BACK1,
  ...LIGHTS_DOWN,
  BOW2,
  ...LEAVE,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((x, y) => x - y)

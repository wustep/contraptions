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

/**
 * The real match: bars 85 to 88, every beat struck. Marty serves on 85.1; the rally is the film's final point, and it
 * turns: drives at the table, Endo pushed off it, a lob from deep (it lands on the next beat and kicks up for Marty's
 * smash), a desperate dig off the floor, Endo's counter from deep, and four flat drives coming in hard to the winner
 * on 89.1. Bats are on the beats; a bounce is on the shuffle's "a", or on the beat itself after a lob.
 */
export const RALLY = BEATS.filter((b) => b.bar >= 85 && b.bar <= 88).map((b) => b.t)
const RALLY_A = BEATS.filter((b) => b.bar >= 85 && b.bar <= 88).map((b) => a(b.bar, b.pos))
export const SERVE = RALLY[0]

export type StrokeKind = 'drive' | 'flat' | 'loop' | 'lob' | 'dig' | 'smash' | 'counter'
/** A stroke of the rally: on beat `i` of it, by whom, where the ball is on the bat, and where it lands. */
export interface Stroke {
  i: number
  t: number
  who: 'marty' | 'endo'
  kind: StrokeKind
  at: Pt
  bounce: Pt
  /** When it lands: on the "a", or, for a lob, on the next beat. */
  lands: number
  /** How hard it is struck: 0 a push, 1 everything. */
  power: number
}
const M = (i: number, kind: StrokeKind, bx: number, power = 0.35): Omit<Stroke, 't' | 'lands'> => ({ i, who: 'marty', kind, at: CM, bounce: [bx, 0], power })
const E = (i: number, kind: StrokeKind, at: Pt, bx: number, power = 0.3): Omit<Stroke, 't' | 'lands'> => ({ i, who: 'endo', kind, at, bounce: [bx, 0], power })
export const STROKES: Stroke[] = [
  M(0, 'drive', 3.3, 0.25),
  E(1, 'drive', [5.2, -0.5], 0.5),
  M(2, 'drive', 3.95),
  E(3, 'drive', [5.75, -0.55], -0.2),
  M(4, 'loop', 4.3, 0.5),
  E(5, 'lob', [6.2, -0.3], 0.8, 0.2),
  M(7, 'smash', 4.2, 0.85),
  E(8, 'dig', [6.85, 0.3], 0.45, 0.35),
  M(10, 'smash', 4.35, 0.9),
  E(11, 'counter', [6.6, -0.35], -0.5, 0.7),
  M(12, 'flat', 3.6, 0.5),
  E(13, 'flat', [6.1, -0.55], 0.3, 0.5),
  M(14, 'flat', 4.05, 0.6),
  E(15, 'flat', [5.25, -0.5], 0.0, 0.5),
].map((s) => ({ ...s, t: RALLY[s.i], lands: s.kind === 'lob' || s.kind === 'dig' ? RALLY[s.i + 1] : RALLY_A[s.i] }))
/** The bounces, in order. */
export const LANDS = STROKES.map((s) => s.lands)
/** Marty's hits (and the winner), Endo's strokes and hits, and Marty's power shots, which the camera punches in on. */
export const MARTY_HITS = [...STROKES.filter((s) => s.who === 'marty').map((s) => s.t), WIN]
export const ENDO_STROKES = STROKES.filter((s) => s.who === 'endo')
export const ENDO_HITS = ENDO_STROKES.map((s) => s.t)
export const POWER = STROKES.filter((s) => s.who === 'marty' && s.power >= 0.8).map((s) => s.t)
/** Where Endo's hips are for a stroke: a little behind the ball, and nearer it for the dig. */
const hipFor = (s: Stroke): number => s.at[0] + (s.kind === 'dig' ? 0.38 : 0.55)

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

/** The lift a flight needs to clear the net, or gravity's own if that is more. */
function flight(from: Pt, to: Pt, T: number): number {
  const g = (G * T * T) / 8
  const s = (NET_X - from[0]) / (to[0] - from[0])
  if (!(s > 0 && s < 1)) return g
  const yc = from[1] + s * (to[1] - from[1])
  return Math.max(g, (yc - NET_CLEAR) / (4 * s * (1 - s)))
}
/** How much higher than it must a stroke goes: the lobs high, the loops over, the flat ones not at all. */
const LIFT: Record<StrokeKind, number> = { drive: 0.1, flat: 0, loop: 0.3, lob: 1.35, dig: 2.0, smash: 0, counter: 0.02 }

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
  STROKES.forEach((s, j) => {
    const from = w[w.length - 1].p
    w.push({ at: s.lands, p: s.bounce, arc: flight(from, s.bounce, s.lands - s.t) + LIFT[s.kind] })
    const next = STROKES[j + 1]
    if (next && next.t <= s.lands + 1e-6) throw new Error('tokyo: a stroke before its ball has landed')
    // Off a lob's bounce the ball kicks up high and sits up for the smash.
    hopTo(next ? next.at : CM, next ? next.t : WIN, s.kind === 'lob' || s.kind === 'dig' ? 0.75 : undefined)
  })
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

/** What the drawing lights up: every bat on the ball and every bounce, with how hard. */
export interface Impact {
  t: number
  p: Pt
  bat: boolean
  power: number
}
export const IMPACTS: Impact[] = [
  ...STROKES.map((s) => ({ t: s.t, p: s.at, bat: true, power: s.power })),
  ...STROKES.map((s) => ({ t: s.lands, p: s.bounce, bat: false, power: s.power })),
  { t: WIN, p: CM, bat: true, power: 1.2 },
  { t: SMASH_BOUNCE, p: SMASH_AT, bat: false, power: 1.2 },
].sort((x, y) => x.t - y.t)

/* ------------------------------------------------------------------ Marty's sprung bat */

/**
 * The arm's angle off its strike pose, radians (negative is cocked back, away from the table; positive is through
 * toward the net). Slack until it cocks, cocked between strikes, a snap through each strike, and spent after the smash.
 * Before a power shot it winds further back, trembling, and goes further through.
 */
export function armAngle(t: number): number {
  const COCKED = -0.62
  const WOUND = -0.95
  if (t < COCK) return 0.32
  if (t < COCK + 0.12) return 0.32 + (COCKED - 0.32) * smooth(t, COCK, COCK + 0.07) + 0.05 * Math.sin((t - COCK) * 60) * Math.exp(-(t - COCK) / 0.05)
  let v = COCKED
  for (const h of MARTY_HITS) {
    const u = t - h
    const big = h === WIN
    const power = big || POWER.includes(h)
    if (power && u >= -0.45 && u < -0.07) return COCKED + (WOUND - COCKED) * smooth(t, h - 0.45, h - 0.12) + 0.03 * Math.sin(u * 70) * smooth(t, h - 0.3, h - 0.12)
    if (u < -0.07 || u > 0.6) continue
    if (u < 0) return (power ? WOUND : COCKED) * (1 - smooth(t, h - 0.07, h)) // the snap
    if (big) {
      // Everything: through and past, and it stays there, quivering.
      return 0.95 * smooth(t, h, h + 0.08) + 0.12 * Math.sin(u * 40) * Math.exp(-u / 0.15) - 0.45 * smooth(t, h + 0.25, h + 0.6)
    }
    const through = power ? 0.85 : 0.55
    if (u < 0.09) return through * smooth(t, h, h + 0.09)
    v = through + (COCKED - through) * smooth(t, h + 0.09, h + 0.4) + 0.06 * Math.sin((u - 0.4) * 50) * (u > 0.4 ? Math.exp(-(u - 0.4) / 0.06) : 0)
    return v
  }
  if (t > WIN) return 0.5
  return v
}

/* ------------------------------------------------------------------ Endo */

/** Where he stands (his hips' x): at the table, pushed back off it, scrambling, and coming in again. */
const ENDO_X: [number, number][] = [
  [SERVE - 0.4, 5.75],
  ...ENDO_STROKES.flatMap((s): [number, number][] => [
    [s.t - 0.14, hipFor(s)],
    [s.t + 0.1, hipFor(s) + (s.kind === 'dig' ? 0.12 : 0)],
  ]),
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
]
export const endoX = (t: number): number => track(ENDO_X, t)
/** Which way he faces: -1 toward the table (left), 1 away. He turns on his steps. */
export const endoFace = (t: number): number => ((t >= TURN && t < RISE) || t >= LEAVE[0] - 0.3 ? 1 : -1)
const LEAN: Record<StrokeKind, number> = { drive: 0.3, flat: 0.36, loop: 0.3, lob: 0.1, dig: 0.72, smash: 0.3, counter: 0.42 }
const SQUAT: Record<StrokeKind, number> = { drive: 0.22, flat: 0.28, loop: 0.22, lob: 0.34, dig: 0.88, smash: 0.2, counter: 0.3 }
/** How far forward he leans, radians. */
const ENDO_LEAN: [number, number][] = [
  [at(83, 3), 0],
  [BOW1, 0.62],
  [STOMPS[0], 0],
  [SERVE - 0.4, 0],
  [SERVE, 0.18],
  ...ENDO_STROKES.flatMap((s): [number, number][] => [
    [s.t - 0.16, LEAN[s.kind] * 0.6],
    [s.t, LEAN[s.kind]],
    [s.t + 0.3, 0.2],
  ]),
  [WIN, 0.2],
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
]
export const endoLean = (t: number): number => track(ENDO_LEAN, t)
/** How deep he crouches, 0 standing to 1 squatting at the floor. */
const ENDO_SQUAT: [number, number][] = [
  [SERVE - 0.4, 0],
  [SERVE, 0.14],
  ...ENDO_STROKES.flatMap((s): [number, number][] => [
    [s.t - 0.1, SQUAT[s.kind]],
    [s.t + (s.kind === 'dig' ? 0.35 : 0.22), 0.18],
  ]),
  [WIN, 0.16],
  [LUNGE, 0.3],
  [FLOOR_HITS[1], 0],
  [STEP1, 0],
  [PICK, 1],
  [RISE, 0],
  [STEP3, 0],
  [SET, 0.16],
  [BACK1, 0],
]
export const endoSquat = (t: number): number => track(ENDO_SQUAT, t)
/** His lunges: at the dig, wide and low for the smash, and at the winner, which goes under him. */
const DIG = ENDO_STROKES.find((s) => s.kind === 'dig')!.t
export const endoLunge = (t: number): number =>
  Math.max(smooth(t, DIG - 0.22, DIG - 0.03) * (1 - smooth(t, DIG + 0.2, DIG + 0.65)), smooth(t, LUNGE - 0.18, LUNGE) * (1 - smooth(t, LUNGE + 0.2, LUNGE + 0.9)))
/** The times his feet go down, and which (0 the back, 1 the front, in his facing): quick steps into each stroke. */
const MOVES = ENDO_STROKES.slice(1).flatMap((s, i) => {
  const prev = ENDO_STROKES[i]
  if (Math.abs(hipFor(s) - hipFor(prev)) < 0.1) return [s.t - 0.14]
  return [prev.t + 0.42, s.t - 0.14]
})
export const ENDO_STEPS = [SERVE - 0.1, ...MOVES, LUNGE, TURN, STEP1, RISE, STEP2, STEP3, BACK1, BACK2, ...LEAVE]

/** His bat's centre: lowered at his side before the match, then every stroke, then let fall after the point. */
const ENDO_BAT: [number, Pt][] = (() => {
  const keys: [number, Pt][] = [
    [T0, [5.55, 0.25]],
    [SERVE - 0.55, [5.55, 0.25]],
    [SERVE - 0.05, [5.4, -0.35]],
  ]
  for (const s of ENDO_STROKES) {
    const [cx, cy] = s.at
    const under = s.kind === 'lob' || s.kind === 'dig'
    keys.push([s.t - 0.2, under ? [cx + 0.35, cy + 0.4] : [cx + 0.5, cy + 0.32]])
    keys.push([s.t, [cx + 0.2, cy]])
    keys.push([s.t + 0.12, under ? [cx - 0.25, cy - 0.85] : [cx - 0.16, cy - 0.45]])
    keys.push([s.t + 0.42, [hipFor(s) - 0.4, -0.35]])
  }
  // The smash: he reads it high, and it goes under.
  keys.push([SMASH_BOUNCE - 0.05, [5.7, -0.1]])
  keys.push([LUNGE, [5.2, -0.85]])
  keys.push([LUNGE + 0.5, [5.45, 0.2]])
  return keys
})()
export function endoBat(t: number): Pt | null {
  if (t > LUNGE + 0.5) return null
  return track2(ENDO_BAT, t)
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
  ...LANDS,
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

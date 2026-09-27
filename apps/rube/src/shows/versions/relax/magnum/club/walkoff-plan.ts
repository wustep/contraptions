import { FLOOR, R, type Pt } from '../../../../../parts'
import type { Way } from '../kit'
import { bar, beat, half, SEAM } from '../music'
import { G } from '../physics'

/**
 * The walk-off's fixed geometry and its clock (the CLUB builder's): where the two of them stand, where the floor's
 * machines are, and when every move goes. Everything is in the part's own frame: the ball comes in at (-0.5, 0)
 * rolling right, the floor's surface is y = FLOOR, and the frame's origin is `CLUB_AT` in the club's cells.
 *
 * Staged side on, symmetric about the middle of the floor (`MID`): Derek works in from the left, Hansel from the
 * right, each through his own half of the floor's machine (a kick plate at his mark, a laser gate, a second plate),
 * until they are face to face across the middle, where the grid comes down between them.
 */

/* ------------------------------------------------------------------ the room */

/** The ceiling's underside (low: about nine feet). */
export const CEIL = -4.1
/** The middle of the floor: the grid comes down here. */
export const MID = 4.8
/** The lit runway in the floor, end to end. */
export const RUN_X0 = 0.05
export const RUN_X1 = 2 * MID - RUN_X0
/** The grid: its half-width, the bar it hangs from (stowed under the ceiling, and down), its beams' feet. */
export const GRID_HALF = 1.0
export const BAR_UP = CEIL + 0.5
export const BAR_DOWN = -2.85
/** The judge's lamp: hung from the ceiling on Hansel's side, its pivot. */
export const LAMP: Pt = [MID + 2.35, -3.5]
/** The ceiling's laser rigs (the roaming beams), their lenses. */
export const RIGS: Pt[] = [
  [-2.4, CEIL + 0.36],
  [2.3, CEIL + 0.36],
  [9.5, CEIL + 0.36],
  [13.6, CEIL + 0.36],
]

/* ------------------------------------------------------------------ the marks */

/** Derek's plate (where he comes to rest), and Hansel's, mirrored about the middle. */
export const D_MARK = 1.3
export const H_MARK = 2 * MID - D_MARK
/** The second pair of plates, nearer the middle: where they trade the call and answer. */
export const D_PLATE2 = 3.4
export const H_PLATE2 = 2 * MID - D_PLATE2
/** Derek's lunge on the last line: right up to the middle, his nose at the grid's edge. */
export const D_LUNGE = MID - GRID_HALF - 0.05
/** Hansel inside the grid (dead centre), and out of it on Derek's side. */
export const H_IN = MID
export const H_OUT = MID - GRID_HALF - 0.28

/** The laser gates: two posts that rise out of the floor, a beam (Derek's) or two (Hansel's) between them. */
export const D_GATE: [number, number] = [1.78, 2.28]
export const H_GATE: [number, number] = [2 * MID - 2.28, 2 * MID - 1.78]
export const GATE_BEAMS = { derek: [0.42], hansel: [0.42, 0.84] }

/* ------------------------------------------------------------------ the clock */

/** In from the spa's door, in the flash; out on the count-in. */
export const IN = SEAM.club
export const OUT = SEAM.derelicte

/** Round one, the pop: Derek on bar 41, Hansel on bar 42. */
export const D_ON = bar(41)
export const D_POP = beat(165)
export const D_POP_TOP = beat(166)
export const D_POP_LAND = beat(167)
export const H_ON = bar(42)
export const H_POP = beat(169)
export const H_POP_TOP = half(170)
export const H_POP_LAND = bar(43)

/** Round two, the gate: Derek on bar 43 (the posts rise on its downbeat, the beam on beat 173), Hansel on bar 44. */
export const D_GATE_UP = bar(43)
export const D_GATE_ON = beat(173)
export const D_JUMP = half(173)
export const D_JUMP_LAND = beat(175)
export const D_GATE_DONE = bar(44)
export const H_GATE_UP = bar(44)
export const H_GATE_ON = beat(177)
export const H_JUMP = half(177)
export const H_JUMP_TOP = half(178)
export const H_JUMP_LAND = half(179)

/** Bar 45, the walk: Derek struts up to his second plate, then Hansel, quicker, to his. */
export const D_WALK = bar(45)
export const D_WALK_STOP = beat(182)
export const H_WALK = beat(182)
export const H_WALK_STOP = beat(183)

/** The call and answer (bars 46-48): Derek on each line, Hansel on its echo; the lasers converge on the last. */
export const LINES = [bar(46), bar(47), bar(48)] as const
export const ECHOES = [beat(186), beat(190), beat(194)] as const
export const D_LINE_LAND = [beat(185), beat(189), beat(193)] as const
export const H_ECHO_LAND = [half(187), half(191)] as const
/** The lasers swing to the middle on the last line's answer, and the grid's bar drops. */
export const CONVERGE = ECHOES[2]
export const BAR_DROP = beat(195)

/** The bridge: the grid comes down (bar 49) on Derek's nose and knocks him back (a hop back, landing on the off-beat). */
export const GRID_ON = bar(49)
export const D_FLINCH = beat(197)
export const D_FLINCH_STOP = beat(199)
/** Hansel's move that cannot be done: in (off-beat 197), dead centre on the hardest beats, out on beat 202. */
export const H_GO = half(197)
/** The grid pulses on the bridge's hard beats while it is lit (and he is in it, unbroken). */
export const H_HUM: readonly number[] = [beat(197), beat(199), half(200), half(205)]
/** The lasers, back on after the grid, flare on the bridge's hardest hits. */
export const FLARES: readonly number[] = [half(212), half(213), beat(215), beat(219), half(220), half(221)]
export const H_CENTRE = beat(200)
export const H_LEAVE = beat(202)
export const H_CLEAR = bar(51)
/** The judge's lamp settles on him; the press fire; the crowd goes up. Derek, deflated, rolls off into the dark. */
export const WIN = H_CLEAR
export const D_SAG = beat(205)
export const D_SAG_STOP = beat(209)
/** The grid goes off, and its bar goes back up. */
export const GRID_OFF = bar(52)
/** Hansel comes to Derek (bar 53); they touch (bar 54); side by side. */
export const H_COME = bar(53)
export const TOUCH = bar(54)
export const H_SETTLE = beat(218)
export const H_SETTLED = bar(55)

/** The grid throws Derek back off its edge: a hop back through the air, and a roll on back that slows. */
const KNOCK = 0.85
export const D_BACK = D_LUNGE - KNOCK - (KNOCK / (D_FLINCH - GRID_ON) / 2) * (D_FLINCH_STOP - D_FLINCH)
/** Where he goes to be alone, beaten; and Hansel touching him, and beside him at the end. */
export const D_ALONE = D_BACK - 0.45
export const H_TOUCH = D_ALONE + 2 * R + 0.012
export const H_END = D_ALONE + 0.42

/* ------------------------------------------------------------------ tracks */

/**
 * A stretch of a track, to `until` (show time):
 * - `v`: along x, the speed changing linearly from the current one to `v` (cells a second, signed; `from` kicks it
 *   to that first, on a strike), with a model's lilt of `lilt` cells over it;
 * - `to`: eased from rest to rest (the floor carrying him, or a roll that starts and ends still);
 * - `hop`: a flight under gravity to the point, x linear in time;
 * - `hold`: still.
 */
type Step =
  | { until: number; hold: true }
  | { until: number; v: number; from?: number; lilt?: number }
  | { until: number; to: Pt }
  | { until: number; hop: Pt }

interface Piece {
  t0: number
  t1: number
  p0: Pt
  p1: Pt
  kind: 'hold' | 'ramp' | 'ease' | 'hop'
  v0: number
  v1: number
  arc: number
}

export interface Track {
  at(t: number): Pt
  /** The waypoints, for `route`: `at` in seconds from `t0`. */
  ways(t0: number): Way[]
  end: Pt
  pieces: readonly Piece[]
}

function track(t: number, p: Pt, v: number, steps: Step[]): Track {
  const pieces: Piece[] = []
  let ct = t
  let cp: Pt = [p[0], p[1]]
  let cv = v
  for (const s of steps) {
    const d = s.until - ct
    if (d <= 1e-9) continue
    if ('hold' in s) {
      pieces.push({ t0: ct, t1: s.until, p0: cp, p1: cp, kind: 'hold', v0: 0, v1: 0, arc: 0 })
      cv = 0
    } else if ('v' in s) {
      const v0 = s.from ?? cv
      const x1 = cp[0] + ((v0 + s.v) / 2) * d
      const p1: Pt = [x1, cp[1]]
      pieces.push({ t0: ct, t1: s.until, p0: cp, p1, kind: 'ramp', v0, v1: s.v, arc: s.lilt ?? 0 })
      cp = p1
      cv = s.v
    } else if ('to' in s) {
      pieces.push({ t0: ct, t1: s.until, p0: cp, p1: s.to, kind: 'ease', v0: 0, v1: 0, arc: 0 })
      cp = s.to
      cv = 0
    } else {
      pieces.push({ t0: ct, t1: s.until, p0: cp, p1: s.hop, kind: 'hop', v0: 0, v1: 0, arc: (G * d * d) / 8 })
      cv = (s.hop[0] - cp[0]) / d
      cp = s.hop
    }
    ct = s.until
  }
  const at = (q: number): Pt => {
    if (!pieces.length) return p
    if (q <= pieces[0].t0) return [pieces[0].p0[0] + v * (q - pieces[0].t0), pieces[0].p0[1]]
    for (const pc of pieces) {
      if (q > pc.t1) continue
      const d = pc.t1 - pc.t0
      const u = (q - pc.t0) / d
      const [x0, y0] = pc.p0
      const [x1, y1] = pc.p1
      if (pc.kind === 'hold') return [x0, y0]
      if (pc.kind === 'ease') {
        const e = (1 - Math.cos(Math.PI * u)) / 2
        return [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e]
      }
      if (pc.kind === 'hop') return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - pc.arc * 4 * u * (1 - u)]
      // A ramp: the distance covered so far over the whole, which is what the lane's `ramp` uses for its lift too.
      const s = q - pc.t0
      const x = x0 + pc.v0 * s + ((pc.v1 - pc.v0) / (2 * d)) * s * s
      const f = Math.abs(x1 - x0) > 1e-9 ? (x - x0) / (x1 - x0) : 0
      return [x, y0 - pc.arc * 4 * f * (1 - f)]
    }
    return pieces[pieces.length - 1].p1
  }
  return {
    at,
    pieces,
    end: cp,
    ways: (t0) => {
      const out: Way[] = [{ at: pieces[0].t0 - t0, p: pieces[0].p0 }]
      for (const pc of pieces) {
        const w: Way = { at: pc.t1 - t0, p: pc.p1 }
        if (pc.kind === 'ease') w.ease = 'inout'
        else if (pc.kind === 'hop') w.arc = pc.arc
        else if (pc.kind === 'ramp') {
          w.ramp = [Math.abs(pc.v0), Math.abs(pc.v1)]
          if (pc.arc) w.arc = pc.arc
        }
        out.push(w)
      }
      return out
    },
  }
}

/* ------------------------------------------------------------------ Derek */

/** He comes in at 1.2 a second and keeps it up until he has to ease off to stop on his plate on bar 41's downbeat. */
const ARRIVE = D_ON - IN
const CRUISE = (D_MARK + 0.5 - 0.6 * ARRIVE) / 0.6
const EASE_OFF = IN + CRUISE

/** The gate: a short run at it, the jump, and the stop on the next downbeat. */
const D_RUN = 1.4
const D_TAKEOFF = D_MARK + (D_RUN / 2) * (D_JUMP - D_GATE_ON)
const D_TOUCHDOWN = D_TAKEOFF + D_RUN * (D_JUMP_LAND - D_JUMP)
export const D_GATE_STOP = D_TOUCHDOWN + (D_RUN / 2) * (D_GATE_DONE - D_JUMP_LAND)

/** The walk: a strut with a lilt, from the gate's stop to the second plate, the speed peaking on the beat between. */
const D_STRUT = (D_PLATE2 - D_GATE_STOP) / ((D_WALK_STOP - D_WALK) / 2)

export const DEREK_PATH = track(IN, [-0.5, 0], 1.2, [
  { until: EASE_OFF, v: 1.2 },
  { until: D_ON, v: 0 },
  // His weight on the plate, and the plate loading under him.
  { until: D_ON + 0.3, to: [D_MARK, 0.06] },
  { until: D_POP, hold: true },
  // The pop: straight up, the look at the top, down on the plate; it gives, and comes back.
  { until: D_POP_LAND, hop: [D_MARK, 0] },
  { until: D_POP_LAND + 0.2, to: [D_MARK, 0.045] },
  { until: D_POP_LAND + 0.62, to: [D_MARK, 0] },
  // The gate.
  { until: D_GATE_ON, hold: true },
  { until: D_JUMP, v: D_RUN },
  { until: D_JUMP_LAND, hop: [D_TOUCHDOWN, 0] },
  { until: D_GATE_DONE, v: 0 },
  // The walk.
  { until: D_WALK, hold: true },
  { until: beat(181), v: D_STRUT, lilt: 0.028 },
  { until: D_WALK_STOP, v: 0, lilt: 0.028 },
  // The call and answer: a pop on his plate on the first two lines, and on the third the lunge, right up to the middle.
  { until: LINES[0], hold: true },
  { until: D_LINE_LAND[0], hop: [D_PLATE2, 0] },
  { until: LINES[1], hold: true },
  { until: D_LINE_LAND[1], hop: [D_PLATE2, 0] },
  { until: LINES[2], hold: true },
  { until: D_LINE_LAND[2], hop: [D_LUNGE, 0] },
  // The grid comes down on his nose and knocks him back: a hop back off it, and a roll on back that slows.
  { until: GRID_ON, hold: true },
  { until: D_FLINCH, hop: [D_LUNGE - KNOCK, 0] },
  { until: D_FLINCH_STOP, v: 0 },
  // Beaten: off out of the light, slowly.
  { until: D_SAG, hold: true },
  { until: D_SAG_STOP, to: [D_ALONE, 0] },
  { until: OUT, hold: true },
])

/** Derek's place at the cut: where the part's lane ends. */
export const D_END = DEREK_PATH.end

/* ------------------------------------------------------------------ Hansel */

const H_RUN = 1.3
const H_TAKEOFF = H_MARK - (H_RUN / 2) * (H_JUMP - H_GATE_ON)
const H_TOUCHDOWN = H_TAKEOFF - H_RUN * (H_JUMP_LAND - H_JUMP)
export const H_GATE_STOP = H_TOUCHDOWN - (H_RUN / 2) * (D_WALK - H_JUMP_LAND)
const H_STRUT = (H_GATE_STOP - H_PLATE2) / ((H_WALK_STOP - H_WALK) / 2)

export const HANSEL_PATH = track(IN - 2, [H_MARK, 0], 0, [
  { until: H_ON, hold: true },
  { until: H_ON + 0.3, to: [H_MARK, 0.06] },
  { until: H_POP, hold: true },
  // Higher, a double somersault, and the look at the very top.
  { until: H_POP_LAND, hop: [H_MARK, 0] },
  { until: H_POP_LAND + 0.2, to: [H_MARK, 0.05] },
  { until: H_POP_LAND + 0.62, to: [H_MARK, 0] },
  // Two beams, higher, with a somersault; he sticks the landing.
  { until: H_GATE_ON, hold: true },
  { until: H_JUMP, v: -H_RUN },
  { until: H_JUMP_LAND, hop: [H_TOUCHDOWN, 0] },
  { until: D_WALK, v: 0 },
  // The walk, quicker.
  { until: H_WALK, hold: true },
  { until: half(182), v: -H_STRUT, lilt: 0.03 },
  { until: H_WALK_STOP, v: 0, lilt: 0.03 },
  // The echoes: higher, turning over in the air, landing on the off-beat.
  { until: ECHOES[0], hold: true },
  { until: H_ECHO_LAND[0], hop: [H_PLATE2, 0] },
  { until: ECHOES[1], hold: true },
  { until: H_ECHO_LAND[1], hop: [H_PLATE2, 0] },
  // Into the grid, stopping dead in the middle of it; held there in the vocal's silence; out the far side.
  { until: H_GO, hold: true },
  { until: H_CENTRE, to: [H_IN, 0] },
  { until: H_LEAVE, hold: true },
  { until: H_CLEAR, to: [H_OUT, 0] },
  // To Derek; the touch; a little back, side by side.
  { until: H_COME, hold: true },
  { until: TOUCH, to: [H_TOUCH, 0] },
  { until: H_SETTLE, hold: true },
  { until: H_SETTLED, to: [H_END, 0] },
  { until: OUT + 1, hold: true },
])

/** Hansel's somersaults: extra turns of his mark over a flight, eased, on top of his roll. */
const FLIPS: { t0: number; t1: number; turns: number }[] = [
  { t0: H_POP, t1: H_POP_LAND, turns: -2 },
  { t0: H_JUMP, t1: H_JUMP_LAND, turns: -1 },
  { t0: ECHOES[0], t1: H_ECHO_LAND[0], turns: -1 },
  { t0: ECHOES[1], t1: H_ECHO_LAND[1], turns: -1 },
]

/** Where Hansel's mark sits at `t`: rolled with his travel (world x over R, as every ball's is), plus his somersaults. */
export function hanselSpin(t: number, worldX: number): number {
  let a = worldX / R
  for (const f of FLIPS) {
    const u = Math.max(0, Math.min(1, (t - f.t0) / (f.t1 - f.t0)))
    a += f.turns * 2 * Math.PI * (u * u * (3 - 2 * u))
  }
  return a
}

export const hanselAt = (t: number): Pt => HANSEL_PATH.at(t)

/* ------------------------------------------------------------------ the floor's clocks */

/**
 * A kick plate in the runway: loaded under his weight (it sinks with him, as his lane does), fired (it kicks up
 * behind him as he leaves it, and rings back to flush), and catching him (a dip with him, as his lane has it).
 */
export interface Plate {
  x: number
  load?: { at: number; depth: number }
  fires: { at: number; kick: number; land: number; dip: number }[]
}

export const PLATES: Plate[] = [
  { x: D_MARK, load: { at: D_ON, depth: 0.06 }, fires: [{ at: D_POP, kick: 0.16, land: D_POP_LAND, dip: 0.045 }] },
  { x: H_MARK, load: { at: H_ON, depth: 0.06 }, fires: [{ at: H_POP, kick: 0.18, land: H_POP_LAND, dip: 0.05 }] },
  {
    x: D_PLATE2,
    fires: [
      { at: LINES[0], kick: 0.09, land: D_LINE_LAND[0], dip: 0 },
      { at: LINES[1], kick: 0.09, land: D_LINE_LAND[1], dip: 0 },
      { at: LINES[2], kick: 0.1, land: Infinity, dip: 0 },
    ],
  },
  {
    x: H_PLATE2,
    fires: [
      { at: ECHOES[0], kick: 0.12, land: H_ECHO_LAND[0], dip: 0 },
      { at: ECHOES[1], kick: 0.12, land: H_ECHO_LAND[1], dip: 0 },
    ],
  },
]

/** How far a plate's top is below flush at `t` (negative: above it). */
export function plateAt(pl: Plate, t: number): number {
  const ease = (u: number) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, u)))) / 2
  let y = 0
  if (pl.load && t >= pl.load.at) y = pl.load.depth * ease((t - pl.load.at) / 0.3)
  for (const f of pl.fires) {
    if (t < f.at) break
    const s = t - f.at
    const from = pl.load && f === pl.fires[0] ? pl.load.depth : 0
    if (s < 0.06) {
      const u = s / 0.06
      y = from + (-f.kick - from) * (1 - (1 - u) * (1 - u))
    } else {
      const q = s - 0.06
      y = -f.kick * Math.exp(-q / 0.09) * Math.cos(q * 2 * Math.PI * 2.4)
    }
    if (t >= f.land && f.dip > 0) {
      const d = t - f.land
      y += d < 0.2 ? f.dip * ease(d / 0.2) : f.dip * (1 - ease((d - 0.2) / 0.42))
    }
  }
  return y
}

/** A gate's posts: up from `up` (0 to 1 over 0.4 s), the beam(s) on from `on`, and down again from `down`. */
export interface Gate {
  x: [number, number]
  beams: number[]
  up: number
  on: number
  down: number
  /** How tall its posts stand. */
  tall: number
}
export const GATES: Gate[] = [
  { x: D_GATE, beams: GATE_BEAMS.derek, up: D_GATE_UP, on: D_GATE_ON, down: D_GATE_DONE + 0.1, tall: 0.56 },
  { x: H_GATE, beams: GATE_BEAMS.hansel, up: H_GATE_UP, on: H_GATE_ON, down: D_WALK + 0.1, tall: 0.98 },
]

/** The grid's bar: how far down it is at `t`, 0 stowed to 1 down, with a damped bounce on its cables as it lands. */
export function barDown(t: number): number {
  if (t < BAR_DROP) return 0
  if (t < GRID_ON) {
    // Let go on beat 195: it falls, gathering speed, and lands on the downbeat.
    const u = (t - BAR_DROP) / (GRID_ON - BAR_DROP)
    return u * u
  }
  if (t < GRID_OFF + 0.35) {
    const s = t - GRID_ON
    return 1 + 0.06 * Math.exp(-s / 0.16) * Math.sin(s * 2 * Math.PI * 3.2)
  }
  // Wound back up after the grid goes off.
  const u = Math.min(1, (t - GRID_OFF - 0.35) / 1.4)
  return 1 - u * u * (3 - 2 * u)
}
export const barY = (t: number): number => BAR_UP + (BAR_DOWN - BAR_UP) * barDown(t)

/** How much the grid is lit, 0 to 1. */
export function gridOn(t: number): number {
  if (t < GRID_ON) return 0
  if (t < GRID_OFF) return 1
  return Math.max(0, 1 - (t - GRID_OFF) / 0.35)
}

/** The grid's beams, from the bar's underside to the floor: verticals every 0.2, and a lattice of diagonals. */
export function gridBeams(t: number): { a: Pt; b: Pt; red: boolean }[] {
  const y = barY(t) + 0.08
  const out: { a: Pt; b: Pt; red: boolean }[] = []
  const n = 10
  for (let i = 0; i <= n; i++) {
    const x = MID - GRID_HALF + (2 * GRID_HALF * i) / n
    out.push({ a: [x, y], b: [x, FLOOR], red: i % 2 === 1 })
  }
  for (let i = 0; i <= n / 2; i++) {
    const x = MID - GRID_HALF + (2 * GRID_HALF * i) / n
    out.push({ a: [x, y], b: [x + GRID_HALF, FLOOR], red: true })
    const x2 = MID + GRID_HALF - (2 * GRID_HALF * i) / n
    out.push({ a: [x2, y], b: [x2 - GRID_HALF, FLOOR], red: false })
  }
  return out
}

/* ------------------------------------------------------------------ the judge's lamp */

type Aim = 'derek' | 'hansel' | 'between' | number
/** Where the lamp is sent, and when it gets there. */
const CUES: { at: number; aim: Aim }[] = [
  { at: IN - 5, aim: 'hansel' },
  { at: D_ON, aim: 'derek' },
  { at: H_ON, aim: 'hansel' },
  { at: D_GATE_ON, aim: 'derek' },
  { at: H_GATE_ON, aim: 'hansel' },
  { at: D_WALK, aim: 'derek' },
  { at: H_WALK, aim: 'hansel' },
  { at: LINES[0], aim: 'derek' },
  { at: ECHOES[0], aim: 'hansel' },
  { at: LINES[1], aim: 'derek' },
  { at: ECHOES[1], aim: 'hansel' },
  { at: LINES[2], aim: 'derek' },
  { at: CONVERGE + 0.5, aim: MID },
  { at: H_LEAVE + 0.4, aim: 'hansel' },
  { at: TOUCH, aim: 'between' },
]
const SWING = 0.42

function aimAt(aim: Aim, t: number, derek: Pt): Pt {
  if (aim === 'derek') return derek
  if (aim === 'hansel') return hanselAt(t)
  if (aim === 'between') {
    const h = hanselAt(t)
    return [(derek[0] + h[0]) / 2, Math.max(derek[1], h[1])]
  }
  return [aim, 0]
}

/**
 * The judge's lamp at `t`: the point it is aimed at (whoever is on: it follows them up into the air, as a follow spot
 * does), and how wide its light is. It swings to whoever is on, arriving on the beat with a little overshoot that
 * settles, and follows them while they move.
 */
export function lampAt(t: number, derek: Pt): { x: number; y: number; wide: number } {
  let i = 0
  while (i + 1 < CUES.length && CUES[i + 1].at - SWING <= t) i++
  const cur = CUES[i]
  const prev = CUES[Math.max(0, i - 1)]
  const to = aimAt(cur.aim, t, derek)
  const from = aimAt(prev.aim, t, derek)
  const u = Math.max(0, Math.min(1, (t - (cur.at - SWING)) / SWING))
  const e = u * u * (3 - 2 * u)
  let x = from[0] + (to[0] - from[0]) * e
  // It can tilt up only so far: near the ceiling it loses him.
  const y = Math.max(LAMP[1] + 1.1, from[1] + (to[1] - from[1]) * e)
  if (t > cur.at) {
    const s = t - cur.at
    x += (to[0] - from[0]) * 0.07 * Math.exp(-s / 0.22) * Math.sin((s / 0.5) * 2 * Math.PI)
  }
  // Tight on the winner; opened out over the two of them once they touch.
  const u2 = (q: number) => q * q * (3 - 2 * q)
  const tight = u2(Math.max(0, Math.min(1, (t - (WIN - 0.3)) / 0.5)))
  const open = u2(Math.max(0, Math.min(1, (t - TOUCH) / 1.6)))
  const wide = 0.42 - 0.18 * tight + 0.56 * open
  return { x, y, wide }
}

/* ------------------------------------------------------------------ the crowd */

/** What the crowd goes up for, and how much: the bigger the move, the bigger the cheer. */
export const CHEERS: [number, number][] = [
  [D_POP_LAND, 0.45],
  [H_POP_LAND, 0.75],
  [D_JUMP_LAND, 0.5],
  [H_JUMP_LAND, 0.8],
  [D_WALK_STOP, 0.35],
  [H_WALK_STOP, 0.55],
  [D_LINE_LAND[0], 0.4],
  [H_ECHO_LAND[0], 0.6],
  [D_LINE_LAND[1], 0.45],
  [H_ECHO_LAND[1], 0.65],
  [D_LINE_LAND[2], 0.55],
  [GRID_ON, 0.5],
  [WIN, 1.25],
  [TOUCH, 0.55],
  [H_SETTLED, 0.35],
  [half(221), 0.55],
]

/** The crowd's lift at `t`: each cheer comes up quickly and goes down slowly. */
export function cheer(t: number): number {
  let v = 0
  for (const [at, a] of CHEERS) {
    const s = t - at
    if (s < -0.12 || s > 4) continue
    const up = s < 0 ? (s + 0.12) / 0.12 : 1
    v += a * up * Math.exp(-Math.max(0, s) / 0.9)
  }
  return Math.min(1.4, v)
}

/** The crowd holds its breath while Hansel is in the grid: arms down, still. */
export const hush = (t: number): number => {
  const a = Math.max(0, Math.min(1, (t - H_GO) / 0.5))
  const b = Math.max(0, Math.min(1, (WIN - t) / 0.25))
  return Math.min(a, b)
}

/** The press: the flash that the cut into the club comes out of, and the volley on Hansel's win. */
export const PRESS: { at: number; x: number; y: number }[] = [
  { at: IN, x: -1.05, y: 0.95 },
  { at: WIN, x: 6.1, y: 1.0 },
  { at: half(204), x: 1.2, y: 1.05 },
  { at: beat(205), x: 7.3, y: 0.98 },
]

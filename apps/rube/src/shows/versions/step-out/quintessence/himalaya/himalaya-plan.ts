import type { Pt, Seg } from '../../../../../parts'
import { route, type Way } from '../kit'
import { at, SEAM } from '../music'
import { G } from '../physics'

/**
 * The Himalayas' clock and ground (146.519 → 191.409, bars 83 to 109): the build. The place's frame is the part's: he
 * comes in at (-0.5, 0), at rest in the snow at the foot of the climb; a ball's radius under him is the ground.
 *
 * The climb is a path of steps up the face, three legs of a switchback: right, back left above it, and right again to
 * the ledge at the top where Sean is waiting behind his lens, the valley falling away beyond it and, across it, the
 * rocks where the snow leopard will be.
 */

export const T0 = SEAM.himalaya
export const T1 = SEAM.press
export const R = 0.13

/* ------------------------------------------------------------------ the climb */

/** The wind comes as the build does: snow torn off the rock above him on the downbeat. */
export const GUST = at(83, 1)

/** The first stretch: a step every other beat, a pause between (he looks up; he goes on). */
const SLOW: [number, number][] = []
for (let b = 83; b <= 91; b++) for (const q of [1, 3]) if (!(b === 83 && q === 1)) SLOW.push([b, q])
/** The second: a step on every beat, bounding, as the choir comes up. */
const FAST: [number, number][] = []
for (let b = 92; b <= 95; b++) for (let q = 1; q <= 4; q++) FAST.push([b, q])

/** The step before a beat. */
const before = (b: number, q: number): [number, number] => (q > 1 ? [b, q - 1] : [b - 1, 4])

export interface Step {
  /** When he leaves the step before, and when he lands on this one. */
  go: number
  land: number
  /** Where he lands (his centre). */
  p: Pt
}

/** Every step, from the foot to Sean's ledge. */
export const STEPS: Step[] = (() => {
  const out: Step[] = []
  let p: Pt = [-0.5, 0]
  const push = (go: number, land: number, dx: number, dy: number) => {
    p = [p[0] + dx, p[1] + dy]
    out.push({ go, land, p })
  }
  SLOW.forEach(([b, q], i) => {
    const go = at(...before(b, q))
    const land = at(b, q)
    if (i < 9) push(go, land, 0.42, -0.3)
    else if (i === 9) push(go, land, -0.12, -0.42)
    else push(go, land, -0.42, -0.3)
  })
  FAST.forEach(([b, q], i) => {
    const go = at(...before(b, q))
    const land = at(b, q)
    if (i === 0) push(go, land, 0.1, -0.38)
    else push(go, land, 0.44, -0.24)
  })
  // Onto the ledge, on the downbeat of bar 96.
  push(at(95, 4), at(96, 1), 0.5, -0.2)
  return out
})()

/** Onto Sean's ledge; rolled to a stop beside him. */
export const ON_LEDGE = at(96, 1)
export const SETTLE = at(96, 4)
const LEDGE_IN = STEPS[STEPS.length - 1].p
export const REST: Pt = [LEDGE_IN[0] + 0.45, LEDGE_IN[1]]
/** The ledge's top (the ground under them). */
export const LEDGE_Y = REST[1] + R
/** Sean, at rest beside him on his right, as the seam has it; leaning into the eyepiece until he lifts his eye. */
export const SEAN_AT: Pt = [REST[0] + 0.55, REST[1]]
export const LEAN = 0.05
/** How far he comes back off the eyepiece when he lifts his eye: near enough to Walter to be with him. */
export const BACK = 0.19

/* ------------------------------------------------------------------ the wait */

/** The snow leopard: out from behind a rock across the valley, a few steps, still; later, away behind another. */
export const CAT_STEPS_IN = [at(100, 2), at(100, 3), at(100, 4), at(101, 1), at(101, 2)]
export const CAT_IN = at(100, 1)
export const CAT_STILL = at(101, 2)
/** It turns its head to them. */
export const CAT_LOOK = at(102, 2)
/** Sean lifts his eye from the camera and looks; the shutter never fires. */
export const LIFT = at(102, 3)
export const CAT_LOOK_AWAY = at(105, 4)
export const CAT_STEPS_OUT = [at(106, 3), at(106, 4), at(107, 1), at(107, 2), at(107, 3), at(107, 4), at(108, 1), at(108, 2), at(108, 3)]
export const CAT_GO = at(106, 2)
export const CAT_GONE = at(108, 3)

/** Where it walks: the far ridge's top, across the valley. */
export const CAT_FROM = 12.2
export const CAT_STOP = 13.25
export const CAT_TO = 15.05
export const FAR_Y = -9.32

/** Its body's centre at `t`, and how far through a stride it is (0..1 per step), or null while it is not there. */
export function catAt(t: number): { x: number; stride: number; walking: boolean; dir: number } | null {
  if (t < CAT_IN || t > CAT_GONE + 0.6) return null
  const walk = (steps: number[], start: number, x0: number, x1: number) => {
    const ts = [start, ...steps]
    let i = 0
    while (i + 1 < ts.length && ts[i + 1] <= t) i++
    if (i >= ts.length - 1) return { x: x1, stride: 0, walking: false, dir: 1 }
    const f = (t - ts[i]) / (ts[i + 1] - ts[i])
    const n = ts.length - 1
    // Each step carries it an even share, eased so it moves as a cat does: a reach, then the weight.
    const g = f - Math.sin(f * Math.PI * 2) / (Math.PI * 2) * 0.6
    return { x: x0 + ((x1 - x0) * (i + g)) / n, stride: f + i, walking: true, dir: 1 }
  }
  if (t < CAT_STILL) return walk(CAT_STEPS_IN, CAT_IN, CAT_FROM, CAT_STOP)
  if (t < CAT_GO) return { x: CAT_STOP, stride: 0, walking: false, dir: 1 }
  return walk(CAT_STEPS_OUT, CAT_GO, CAT_STOP, CAT_TO + 0.5)
}

/** Snow sifting off the rock above them, landing on the ledge on these beats. */
export const SIFTS = [at(97, 2), at(99, 2), at(103, 2), at(105, 2), at(107, 2), at(109, 1)]
export const SIFT_X = REST[0] - 0.42
/** The camera's strap, swung by the wind, its buckle knocking the tripod's leg. */
export const TICKS = [at(98, 4), at(101, 4), at(104, 3), at(106, 1), at(109, 3)]

/* ------------------------------------------------------------------ his way */

export function himalayaLane(begin: number, end: number): Seg[] {
  const r = (t: number) => t - begin
  const ways: Way[] = [{ at: 0, p: [-0.5, 0] }]
  let last: Pt = [-0.5, 0]
  for (const s of STEPS) {
    // At rest on the step until he goes (the slow stretch); straight off it on the beat (the fast).
    if (r(s.go) > ways[ways.length - 1].at + 1e-9) ways.push({ at: r(s.go), p: last })
    const T = s.land - s.go
    ways.push({ at: r(s.land), p: s.p, arc: (G * T * T) / 8 })
    last = s.p
  }
  const v0 = (2 * (REST[0] - last[0])) / (SETTLE - ON_LEDGE)
  ways.push({ at: r(SETTLE), p: REST, ramp: [v0, 0] })
  ways.push({ at: r(end), p: REST })
  return route(ways)
}

/** Every landing on the climb. */
export const LANDINGS = STEPS.map((s) => s.land)

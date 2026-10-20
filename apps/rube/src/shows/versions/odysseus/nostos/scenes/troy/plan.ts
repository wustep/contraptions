import { lerp, lerpPt, smooth, smoother } from '../../draw'
import { M, ONSETS } from '../../music'
import { fallTime, fly, ride, roll, type Move, type Pt } from '../../path'
import type { ShipPart } from '../../scene'
import { HELM, glide, seat } from '../../voyage'
import { DECK, floatAt, onShip, type Pose } from '../../world/ship'
import { drainExit } from './city'
import { DRAIN, FORECOURT, HEAD, HEAD_R, NECK, SHAFT, STEPS, STREET, ground, step } from './geo'
import { BUCKET, HE_LANDS, rimAt, setMenLand } from './gate'
import { BU, FLOOR_END, ROPE_TOP, horseAt, slosh, slot, toWorld, type HorsePose } from './horse'

/**
 * Who goes where in Troy, and when: the men and he in the horse's belly through the hauling and the night, out of its
 * hatch and down the rope one by one on the melody's notes, down the temple steps, into the bucket, out of the drain
 * and down the hill to the ships; the head; the ships.
 */

const R_HERO = 0.13
const R_MAN = 0.13 * 0.86

/** The order they come out of the horse (and go into the bucket, and come out of it, and board): men 5 to 0, then him. */
export const ORDER = [5, 4, 3, 2, 1, 0, -1] as const
const radius = (who: number) => (who < 0 ? R_HERO : R_MAN)

/* ------------------------------------------------------------------ out of the horse */

/** Their landings on the forecourt, on the melody's notes, and when each starts for the hatch. */
const MEN_LAND = [78.55, 79.52, 80.52, 81.61, 82.76, 83.87]
export const HATCH_OPENS = 72.99
export const ROPE_THROWN = 75.97
export const ROPE_SET = 76.95
/** He drops onto the rope, slides till his weight stops him, hangs; her neck gives and the rope slips; her head falls. */
export const HE_DROPS = 85.07
export const HE_STOPS = 87.32
export const SLIPS = 96.33
export const HEAD_FALLS = M.breath1
export const HE_GOES = 100.81
/** He goes down the temple steps a step a note. */
const STEP_NOTES = [102.77, 103.27, 103.86, 105.75, 106.02, 106.68, 107.59, 107.84]

const TO_EDGE = 0.3
const THROUGH = 0.12
const SLIDE = 0.75
const LET_GO = 0.85

/** When each one (by place in ORDER) starts for the hatch. */
const START: number[] = [...MEN_LAND.map((l) => l - (0.21 + SLIDE + THROUGH + TO_EDGE)), HE_DROPS - THROUGH - TO_EDGE]

/** The horse standing at the temple that night. */
const NIGHT: HorsePose = horseAt(M.answer + 1)
const ROPE_A: Pt = toWorld(NIGHT, ROPE_TOP)
/** Where the rope is made fast: Athena's neck. */
export const ROPE_B: Pt = NECK

/** A ball of radius r riding the rope a share u of the way down it, the rope dipping under its weight. */
export function onRope(u: number, r: number, sag: number): Pt {
  const p = lerpPt(ROPE_A, ROPE_B, u)
  return [p[0], p[1] + sag * 4 * u * (1 - u) - r]
}
/** How far the rope dips under him, hanging. */
export const HE_SAG = 0.16
const MEN_SAG = 0.07
export const HE_AT = 0.56

/** Where one of them is inside the horse at `t`: their place, moving one on each time the one ahead goes. */
function inHorse(k: number, hero: boolean, t: number): Pt {
  let place = k
  let frac = 0
  for (let j = 0; j < k; j++) {
    const a = smooth(t, START[j] + TO_EDGE, START[j] + TO_EDGE + 0.5)
    if (a >= 1) place -= 1
    else if (a > 0) {
      frac = a
      break
    } else break
  }
  const here = slot(place, hero)
  const next = slot(Math.max(0, place - 1), hero)
  const p = lerpPt(here, next, frac)
  // The heaves at dusk throw them about a little, the upper row more.
  const s = slosh(t) * 0.8 * (p[1] < -6.2 ? 1.3 : 1)
  return [p[0] + s, p[1]]
}

/* ------------------------------------------------------------------ down the steps and along the street */

/** Down the eight steps: on each, roll to its edge, and drop to the next, landing at the times given. */
function stepsDown(r: number, lands: number[], fromX: number, fromT: number, ease: 'inout' | 'in' | 'none'): Move[] {
  const out: Move[] = []
  const flight = fallTime(STEPS.rise)
  const edge0: Pt = [STEPS.x0, FORECOURT.y - r]
  out.push(roll([[fromX, FORECOURT.y - r], edge0], fromT, lands[0] - flight, ease))
  for (let i = 0; i < STEPS.n; i++) {
    const s = step(i)
    const from: Pt = i === 0 ? edge0 : [step(i - 1).x1, step(i - 1).y - r]
    const land: Pt = [s.x0 + 0.13, s.y - r]
    out.push(fly(from, land, lands[i] - flight, lands[i]))
    if (i < STEPS.n - 1) out.push(roll([land, [s.x1, s.y - r]], lands[i], lands[i + 1] - flight, 'inout'))
  }
  return out
}

/* ------------------------------------------------------------------ the bucket */

/** Their places in the bucket, from the rim's middle: four on its floor, three on them; he is on top, by the street. */
export function inBucket(who: number, rim: Pt): Pt {
  const floor = rim[1] + BUCKET.depth - BUCKET.wall
  const lower = floor - R_MAN
  const upper = lower - Math.sqrt((2 * R_MAN) ** 2 - R_MAN ** 2)
  const hero = lower - Math.sqrt((R_MAN + R_HERO) ** 2 - R_MAN ** 2)
  const at: Record<number, Pt> = {
    5: [0.336, lower],
    4: [0.112, lower],
    3: [-0.112, lower],
    2: [-0.336, lower],
    1: [0.224, upper],
    0: [0, upper],
    [-1]: [-0.224, hero],
  }
  const [dx, y] = at[who]
  return [rim[0] + dx, y]
}

/** When each lands in the bucket. */
const IN_BUCKET: Record<number, number> = {}

/* ------------------------------------------------------------------ out of the drain and down to the ships */

/** His ship drawn up at the water's edge, its stern on the sand: where they board. */
export const BEACHED: Pose = { x: -2.6, y: -0.03, a: 0.035 }
const PLANK_FOOT_X = -6.35
export const PLANK_TOP: Pt = onShip(BEACHED, [-1.42, DECK])
export const PLANK_FOOT: Pt = [PLANK_FOOT_X, ground(PLANK_FOOT_X)]

/** When the bucket empties: men 5 to 0, then him. */
const BUCKET_OUT = [116.98, 117.2, 117.42, 117.64, 117.88, 118.1, 118.24]

/** A route along a line of points, at the arc-length `s(t)` a glide through [t, s, speed] keys gives. */
function along(pts: Pt[], keys: [number, number, number][]): Move {
  const lens: number[] = [0]
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const s = glide(keys)
  const total = lens[lens.length - 1]
  const t0 = keys[0][0]
  const t1 = keys[keys.length - 1][0]
  return {
    t0,
    t1,
    kind: 'roll',
    at: (t) => {
      const d = Math.max(0, Math.min(total, s(Math.max(t0, Math.min(t1, t)))))
      let i = 1
      while (i < lens.length - 1 && lens[i] < d) i++
      const f = (d - lens[i - 1]) / Math.max(1e-9, lens[i] - lens[i - 1])
      return lerpPt(pts[i - 1], pts[i], f)
    },
  }
}

const lengthOf = (pts: Pt[]) => pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0)

/** The nearest onset at least `s` strong at or after `t`, no later than `t + tol`; `t` itself if none. */
function noteAfter(t: number, s = 0.55, tol = 0.6): number {
  const o = ONSETS.find((n) => n.t >= t - 0.05 && n.t <= t + tol && n.s >= s)
  return o ? o.t : t
}

/** The way out for one of them: from the bucket's floor, along the drain, down the hill, up the plank, along the deck. */
function wayOut(who: number, leave: number, minArrive: number): { move: Move; arrive: number } {
  const r = radius(who)
  const rim = rimAt(leave)
  const start = inBucket(who, rim)
  const floorY = rim[1] + BUCKET.depth - BUCKET.wall - r
  const [ex] = drainExit()
  const drainPts: Pt[] = [
    start,
    [start[0], floorY],
    [SHAFT.x1, DRAIN.from[1] - r],
    [ex, ground(ex) - r],
  ]
  const hill: Pt[] = []
  for (let x = ex + 0.25; x < PLANK_FOOT_X; x += 0.25) hill.push([x, ground(x) - r])
  hill.push([PLANK_FOOT[0], PLANK_FOOT[1] - r])
  const place = who < 0 ? HELM : seat(who)
  const top: Pt = [PLANK_TOP[0], PLANK_TOP[1] - r]
  const deck: Pt[] = [top, onShip(BEACHED, [place[0], DECK - r])]
  const pts = [...drainPts, ...hill, ...deck]
  const sDrain = lengthOf(drainPts)
  const sFoot = sDrain + lengthOf([drainPts[drainPts.length - 1], ...hill])
  const sTotal = lengthOf(pts)
  const d1 = sDrain / 2.5
  const d3 = (sTotal - sFoot) / 1.9
  const natural = leave + d1 + (sFoot - sDrain) / 4.0 + d3
  const arrive = noteAfter(Math.max(natural, minArrive))
  const d2 = arrive - leave - d1 - d3
  const v2 = Math.max(1.6, Math.min(5.2, 2 * ((sFoot - sDrain) / d2) - 4.2))
  const move = along(pts, [
    [leave, 0, 0.5],
    [leave + d1, sDrain, 4.2],
    [leave + d1 + d2, sFoot, v2],
    [arrive, sTotal, 0],
  ])
  return { move, arrive }
}

/* ------------------------------------------------------------------ the moves */

export interface TroyPlan {
  hero: Move[]
  men: Record<number, Move[]>
  /** When each boards (lands at his place). */
  aboard: Record<number, number>
  /** When he comes out of the drain, for the camera and the check. */
  outOfDrain: number
}

function build(): TroyPlan {
  const hero: Move[] = []
  const men: Record<number, Move[]> = {}
  const aboard: Record<number, number> = {}
  // First the bucket landings, so the bucket knows them when the ways out are worked out.
  ORDER.forEach((who, k) => {
    if (who >= 0) IN_BUCKET[who] = MEN_LAND[k] + 4.65
  })
  IN_BUCKET[-1] = HE_LANDS
  setMenLand(ORDER.filter((w) => w >= 0).map((w) => IN_BUCKET[w]))

  let lastArrive = 0
  let outOfDrain = 0
  ORDER.forEach((who, k) => {
    const isHero = who < 0
    const r = radius(who)
    const moves: Move[] = []
    const t0 = START[k]
    // In the horse, from the first frame, until they start for the hatch.
    moves.push(ride((t) => toWorld(horseAt(t), inHorse(k, isHero, t)), 0, t0, (t) => horseAt(t).a))
    // Along the floor to its end by the hatch, and down through it onto the rope.
    const front = toWorld(NIGHT, [FLOOR_END[0], FLOOR_END[1] - r / BU])
    moves.push(roll([toWorld(NIGHT, inHorse(0, isHero, t0)), front], t0, t0 + TO_EDGE, 'in'))
    moves.push(fly(front, onRope(0.02, r, isHero ? 0 : MEN_SAG), t0 + TO_EDGE, t0 + TO_EDGE + THROUGH))
    const onAt = t0 + TO_EDGE + THROUGH
    if (!isHero) {
      // Down the rope and off it beside Athena, onto the forecourt, on his note.
      const sag = MEN_SAG
      moves.push({ t0: onAt, t1: onAt + SLIDE, kind: 'roll', at: (t) => onRope(0.02 + (LET_GO - 0.02) * ((t - onAt) / SLIDE) ** 2, r, sag) })
      const land: Pt = [onRope(LET_GO, r, 0)[0] - 0.12, FORECOURT.y - r]
      moves.push(fly(onRope(LET_GO, r, sag), land, onAt + SLIDE, MEN_LAND[k]))
      // Across the forecourt and down the steps at a run, along the street and over the edge into the bucket.
      const lands: number[] = []
      const startSteps = MEN_LAND[k] + 1.55
      for (let i = 0; i < STEPS.n; i++) lands.push(startSteps + 0.21 * i)
      moves.push(...stepsDown(r, lands, land[0], MEN_LAND[k], 'none'))
      const last = step(STEPS.n - 1)
      const bottom: Pt = [last.x0 + 0.13, last.y - r]
      const edge: Pt = [SHAFT.x0, STREET.y - r]
      const inAt = IN_BUCKET[who]
      const fall = 0.17
      moves.push(roll([bottom, edge], lands[STEPS.n - 1], inAt - fall, 'none'))
      const spot = inBucket(who, rimAt(inAt))
      const upper = who === 1 || who === 0
      const firstLand: Pt = upper ? spot : [SHAFT.x0 + 0.38, spot[1]]
      moves.push(fly(edge, firstLand, inAt - fall, inAt))
      if (!upper) {
        // Along the bucket's floor to his place, then riding it.
        moves.push({ t0: inAt, t1: inAt + 0.45, kind: 'roll', at: (t) => {
          const u = smoother(t, inAt, inAt + 0.45)
          const p = inBucket(who, rimAt(t))
          return [lerp(SHAFT.x0 + 0.38, p[0], u), p[1]]
        } })
      }
      const settled = upper ? inAt : inAt + 0.45
      moves.push(ride((t) => inBucket(who, rimAt(t)), settled, BUCKET_OUT[k]))
    } else {
      // He comes down slowly, the rope dipping more under him, till it holds him still: hanging over the forecourt.
      moves.push({ t0: onAt, t1: HE_STOPS, kind: 'roll', at: (t) => {
        const u = smoother(t, onAt, HE_STOPS)
        const along = 0.02 + (HE_AT - 0.02) * u
        return onRope(along, r, HE_SAG * u)
      } })
      moves.push({ t0: HE_STOPS, t1: SLIPS, kind: 'ride', at: (t) => {
        // The rope creaks down a little more on each of the notes in between, as her neck gives.
        const give = 0.025 * (smooth(t, 88.96, 89.4) + smooth(t, 91.57, 92) + smooth(t, 93.67, 94.1) + smooth(t, 94.86, 95.3))
        return onRope(HE_AT, r, HE_SAG + give)
      } })
      const hang = onRope(HE_AT, r, HE_SAG + 0.1)
      const land: Pt = [hang[0], FORECOURT.y - r]
      const drop = fallTime(land[1] - hang[1])
      moves.push(fly(hang, land, SLIPS, SLIPS + drop))
      // A small give as he lands, then still: the head comes to him.
      moves.push(roll([land, [land[0] - 0.015, land[1]], land], SLIPS + drop, HE_GOES, 'inout'))
      moves.push(...stepsDown(r, STEP_NOTES, land[0], HE_GOES, 'inout'))
      const last = step(STEPS.n - 1)
      const bottom: Pt = [last.x0 + 0.13, last.y - r]
      const edge: Pt = [SHAFT.x0, STREET.y - r]
      const fall = 0.152
      moves.push(roll([bottom, edge], STEP_NOTES[STEPS.n - 1], HE_LANDS - fall, 'in'))
      moves.push(fly(edge, inBucket(-1, rimAt(HE_LANDS)), HE_LANDS - fall, HE_LANDS))
      moves.push(ride((t) => inBucket(-1, rimAt(t)), HE_LANDS, BUCKET_OUT[k]))
    }
    // Out of the bucket, the drain, down the hill and aboard.
    const { move, arrive } = wayOut(who, BUCKET_OUT[k], lastArrive + 0.26)
    moves.push(move)
    lastArrive = arrive
    aboard[who] = arrive
    if (isHero) {
      hero.push(...moves)
      outOfDrain = BUCKET_OUT[k]
    } else men[who] = moves
  })
  return { hero, men, aboard, outOfDrain }
}

export const PLAN = build()

/* ------------------------------------------------------------------ her head */

const HEAD_LAND = HEAD_FALLS + fallTime(FORECOURT.y - HEAD_R - HEAD[1])
const HEAD_HOP = HEAD_LAND + 0.2
const HEAD_REST = 100.55

/** Athena's head at `t`: on her shoulders, falling, a hop, and a short roll to rest against him. */
export function headAt(t: number): { at: Pt; turn: number } {
  const floor = FORECOURT.y - HEAD_R
  const heroX = onRope(HE_AT, R_HERO, HE_SAG + 0.1)[0]
  const restX = heroX + R_HERO + HEAD_R + 0.004
  const landX = HEAD[0] - 0.06
  const hopX = landX - 0.1
  if (t <= HEAD_FALLS) return { at: HEAD, turn: 0 }
  if (t <= HEAD_LAND) {
    const u = (t - HEAD_FALLS) / (HEAD_LAND - HEAD_FALLS)
    const T = HEAD_LAND - HEAD_FALLS
    const s = u * T
    return { at: [lerp(HEAD[0], landX, u), HEAD[1] + 0.5 * 26 * s * s], turn: -0.9 * u }
  }
  if (t <= HEAD_HOP) {
    const u = (t - HEAD_LAND) / (HEAD_HOP - HEAD_LAND)
    return { at: [lerp(landX, hopX, u), floor - 0.04 * 4 * u * (1 - u)], turn: -0.9 - 1.0 * u }
  }
  const u = smoother(t, HEAD_HOP, HEAD_REST)
  const x = lerp(hopX, restX, u)
  return { at: [x, floor], turn: -1.9 - (hopX - x) / HEAD_R }
}

/** How far she leans towards the horse while the rope pulls at her neck (radians), and how she rocks when it lets go. */
export function statueTilt(t: number): number {
  if (t < ROPE_SET) return 0
  const pull = 0.03 * smooth(t, ROPE_SET, ROPE_SET + 0.3) + 0.05 * smooth(t, HE_DROPS, HE_STOPS)
  const give = 0.012 * (smooth(t, 88.96, 89.4) + smooth(t, 91.57, 92) + smooth(t, 93.67, 94.1) + smooth(t, 94.86, 95.3))
  const held = t < SLIPS ? -(pull + give) : 0
  const rock = t >= SLIPS ? -(0.03 + 0.08 + 0.048) * Math.exp(-(t - SLIPS) / 0.35) * Math.cos((t - SLIPS) * 11) : 0
  return held + rock
}

/** The rope: thrown from the hatch, made fast round her neck, carrying them, slipping off when her neck gives. */
export function ropeState(t: number): { thrown: number; slipped: number } {
  return { thrown: smooth(t, ROPE_THROWN, ROPE_SET), slipped: smooth(t, SLIPS, SLIPS + 0.5) }
}

/** Who is on the rope at `t`, how far down it, and how far it dips under them; null while no one is. */
export function ropeLoad(t: number): { u: number; sag: number } | null {
  for (let k = 0; k < MEN_LAND.length; k++) {
    const onAt = START[k] + TO_EDGE + THROUGH
    if (t >= onAt && t <= onAt + SLIDE) return { u: 0.02 + (LET_GO - 0.02) * ((t - onAt) / SLIDE) ** 2, sag: MEN_SAG }
  }
  const heOn = START[MEN_LAND.length] + TO_EDGE + THROUGH
  if (t >= heOn && t < SLIPS) {
    const u = smoother(t, heOn, HE_STOPS)
    const give = t > HE_STOPS ? 0.025 * (smooth(t, 88.96, 89.4) + smooth(t, 91.57, 92) + smooth(t, 93.67, 94.1) + smooth(t, 94.86, 95.3)) : 0
    return { u: 0.02 + (HE_AT - 0.02) * u, sag: HE_SAG * u + give }
  }
  return null
}

/** The rope's ends, for drawing it. */
export const ROPE_ENDS = { a: ROPE_A, b: ROPE_B }

/* ------------------------------------------------------------------ the ships */

/** He is aboard last; then his ship is pushed off the sand, and the others follow. */
const LAUNCH = 129.1
const blendPose = (a: Pose, b: Pose, u: number): Pose => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), a: lerp(a.a, b.a, u) })

/** His ship: away (out of sight) until it comes back to the beach in the night, drawn up, and put out at first light. */
export const SHIP0: ShipPart = {
  pose: (t) => {
    if (t < 117.5) {
      const x = glide([[100, 55, 0], [117.5, BEACHED.x, 0]])(Math.max(100, t))
      return blendPose(floatAt(x, t), BEACHED, smoother(t, 115.5, 117.5))
    }
    if (t < LAUNCH) return BEACHED
    const x = glide([[LAUNCH, BEACHED.x, 0], [140, 30, 4]])(t)
    return blendPose(BEACHED, floatAt(x, t), smoother(t, LAUNCH, LAUNCH + 2.4))
  },
  look: (t) => ({ sail: smoother(t, 131, 134.5), belly: 0.5 * smooth(t, 134, 137.5) }),
}

function consort(i: 1 | 2): ShipPart {
  const at = i === 1 ? 1.2 : 4.4
  const lift = i === 1 ? -0.5 : -0.95
  const go = i === 1 ? 130.0 : 130.8
  const end = i === 1 ? 24 : 18
  const far = i === 1 ? 0.32 : 0.48
  const x = (t: number): number => {
    if (t < 117) return glide([[100, i === 1 ? 60 : 66, 0], [117, at, 0]])(Math.max(100, t))
    if (t < go) return at
    return glide([[go, at, 0], [140, end, 4]])(t)
  }
  const depth = (t: number) => 1 - smoother(t, go + 1.5, 139.6)
  return {
    pose: (t) => floatAt(x(t), t, lift * depth(t)),
    look: (t) => ({ sail: smoother(t, go + 2, go + 5.5), belly: 0.5 * smooth(t, go + 4, 137.6), far: far * depth(t), air: '#8C8F8E' }),
  }
}

export const SHIP1 = consort(1)
export const SHIP2 = consort(2)

/** For the men of ships 1 and 2, smaller while their ships are far: their moves ride their ships at their places. */
export const consortDepth = (i: 1 | 2, t: number): number => {
  const go = i === 1 ? 130.0 : 130.8
  return 1 - smoother(t, go + 1.5, 139.6)
}

export { IN_BUCKET, LAUNCH }

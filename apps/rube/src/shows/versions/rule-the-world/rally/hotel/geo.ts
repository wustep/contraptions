import { laneAt, type Pt, type Seg } from '../../../../../parts'
import { carried, route, type PartShot, type Way } from '../kit'
import { a, at, CRASH, SEAM } from '../music'
import { G } from '../physics'
import { SEAMS } from '../seams'

/**
 * The hotel's clock and ground (91.016 → 121.018, bars 43 to 56), in the place's own cells. The building is drawn in
 * section: Marty's room on top (its floor at y 0.13, the ball coming in at (-0.5, 0) just inside its door), Mishkin's
 * room under it, the second floor and the street under that; the outer wall at x 7.4 to 7.8, and outside it the fire
 * escape's landings, its stair and its last, counterweighted ladder, over the pavement.
 */

export const T0 = SEAM.hotel
export const T1 = SEAM.alley

/* ------------------------------------------------------------------ the building */

/** A storey, floor to floor, and a floor's thickness (boards, joists, the plaster of the ceiling under). */
export const STOREY = 4.1
export const SLAB = 0.47
/** Floor surfaces: Marty's room, Mishkin's under it, the second floor, the street. */
export const F_MARTY = 0.13
export const F_MISH = F_MARTY + STOREY
export const F_SECOND = F_MISH + STOREY
export const F_STREET = F_SECOND + STOREY
/** The ceiling over a floor surface `f`. */
export const ceilOf = (f: number): number => f - STOREY + SLAB
/** The party wall on the left (the hall past it), the outer wall on the right. */
export const WALL_L: [number, number] = [-2.0, -1.6]
export const WALL_R: [number, number] = [7.4, 7.8]
/** A window's sill and head over a floor surface `f`: the fire escape's landing is at its sill. */
export const sillOf = (f: number): number => f - 1.0
export const headOf = (f: number): number => f - 3.03

/* ------------------------------------------------------------------ Marty's room */

export const DOOR: [number, number] = [-1.25, -0.05]
export const DOOR_TOP = F_MARTY - 2.6
export const RADIATOR: [number, number] = [0.08, 0.98]
export const RADIATOR_TOP = F_MARTY - 0.85
/** The iron bed: foot (low rail) on the left, head (tall) on the right; its mattress top. */
export const BED: [number, number] = [1.2, 3.9]
export const MATTRESS = F_MARTY - 0.88
/** The bulb's cord hangs from here. */
export const BULB_HANG: Pt = [3.0, ceilOf(F_MARTY)]
export const CORD = 1.25

/** The tub: its middle, and its shape about (0, feet on the floor). */
export const TUB_X = 5.6
export const TUB_HALF = 1.32
/** The ball's centre in the tub, above its feet: on the enamel of the bottom. */
export const IN_TUB = -0.45
export const TUB_RIM = -1.13

/* ------------------------------------------------------------------ Mishkin's room */

export const NIGHTSTAND: [number, number] = [2.35, 3.2]
export const STAND_TOP = F_MISH - 1.0
export const M_BED: [number, number] = [3.4, 7.0]
/** His mattress top before the tub, and after: the legs give under it. */
export const M_MATTRESS = F_MISH - 0.63
export const COLLAPSE = 0.3
export const M_DOOR: [number, number] = [-1.0, 0.2]

/* ------------------------------------------------------------------ the fire escape */

/** The landings, each at its window's sill: outside Marty's, Mishkin's, the second floor's. */
export const L_MARTY = sillOf(F_MARTY)
export const L_MISH = sillOf(F_MISH)
export const L_SECOND = sillOf(F_SECOND)
export const LANDING: [number, number] = [WALL_R[1], 12.85]
/** The stair from Mishkin's landing down to the second floor's: from its top at x0 down to the right. */
export const STAIR_X0 = 8.6
export const STAIR_X1 = 11.9
export const RISERS = 13
export const RUN = (STAIR_X1 - STAIR_X0) / RISERS
export const RISE = (L_SECOND - L_MISH) / RISERS
/** Tread n (1 to 12): the middle of its top. Tread 13 is the second floor's landing. */
export const tread = (n: number): Pt => [STAIR_X0 + RUN * n, L_MISH + RISE * n]
/** The last ladder: its middle, its length, its rungs, and how far it slides. */
export const LADDER_X = 13.1
export const LADDER_LEN = 5.4
export const LADDER_TOP0 = L_SECOND - 2.5
export const RUNG = 0.5
export const DROP = F_STREET - (LADDER_TOP0 + LADDER_LEN)
/** The street: the kerb, the streetlight. */
export const KERB = 18.2
export const LAMP_X = 16.7

/* ------------------------------------------------------------------ the clock */

/** The radiator knocks, from the cut through bar 44. */
export const KNOCKS = [at(43, 1), at(43, 2), at(43, 4), at(44, 2), at(44, 3), at(44, 4)]
/** The bridge: the bulb goes, comes back for a moment, and goes for good. */
export const BULB_POP = at(45, 1)
export const BULB_BACK = at(45, 2)
export const BULB_OUT = at(45, 3)
/** The floor under the tub: a creak, then the cracks on every beat through bars 46 and 47. */
export const CREAK = at(45, 4)
export const CRACKS = [at(46, 1), at(46, 2), at(46, 3), at(46, 4), at(47, 1), at(47, 2), at(47, 3), at(47, 4)]
/** Flakes of the ceiling land on Mishkin's paper, on the "a"s. */
export const FLAKES = [a(46, 4), a(47, 2), a(47, 4)]
/** He looks up. */
export const LOOK_UP = at(47, 4)
/** Through the floor; onto his bed (a measured onset); the bed's legs go. */
export const BREAK = CRASH
export const FALL_SAG = 0.16
export const LAND = 102.476
/** A board left hanging at the hole's edge lets go and smacks the floor. */
export const BOARD_DROP = a(48, 2)
/** Marty comes down in the tub again; Mishkin comes up out of the plaster. */
export const SETTLE = at(48, 3)
export const RISE_UP = at(48, 4)
/** Out of the tub, onto his head; his own hand on his own head; onto the rim, the sill. */
export const OUT_OF_TUB = at(49, 1)
export const BONK = at(49, 2)
export const SLAP = at(49, 3)
export const ON_SILL = at(49, 4)
/** He stands; he lunges for the window; his hands close on nothing. */
export const STANDS = at(50, 1)
export const LUNGE = at(50, 2)
export const CLAP = at(50, 4)
/** The treads, one a beat, from bar 51; the second floor's landing on bar 54. */
export const TREADS = [
  at(51, 1), at(51, 2), at(51, 3), at(51, 4),
  at(52, 1), at(52, 2), at(52, 3), at(52, 4),
  at(53, 1), at(53, 2), at(53, 3), at(53, 4),
]
export const DOWN = at(54, 1)
/** Along the landing; onto the ladder; its catch gives; it slides (bar 55) and its feet hit the pavement. */
export const TO_END = at(54, 2)
export const ON_LADDER = at(54, 3)
export const CATCH = at(54, 4)
export const SLIDE = at(55, 1)
export const FOOT = at(55, 2)
export const LET_GO = at(55, 3)
/** The pavement, and the bounces dying. */
export const PAVE = at(56, 1)
export const BOUNCES = [at(56, 2), a(56, 2), at(56, 3)]
/** The streetlight buzzes. */
export const BUZZ = at(56, 4)

/* ------------------------------------------------------------------ what moves */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const smoothU = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}

/** How far the tub has gone down from where it stands in Marty's room (its feet on his floor). */
export function tubDrop(t: number): number {
  if (t < CRACKS[0]) return 0
  if (t < BREAK) {
    // A step down on every crack, settling in a tenth of a second.
    let s = 0
    for (const c of CRACKS) if (t > c) s += (FALL_SAG / CRACKS.length) * smoothU((t - c) / 0.1)
    return s
  }
  const sag = FALL_SAG
  if (t < LAND) {
    const u = t - BREAK
    return sag + 0.5 * G * u * u
  }
  const landed = sag + 0.5 * G * (LAND - BREAK) ** 2
  const u = clamp01((t - LAND) / 0.14)
  return landed + COLLAPSE * (1 - (1 - u) * (1 - u))
}
/** Where the tub has landed (its drop), and so how high Mishkin's mattress is before the legs go. */
export const LANDED = FALL_SAG + 0.5 * G * (LAND - BREAK) ** 2
export const MISH_MATTRESS_TOP = F_MARTY + LANDED
/** How much his bed has given, 0 to 1. */
export const bedGive = (t: number): number => (t < LAND ? 0 : 1 - (1 - clamp01((t - LAND) / 0.14)) ** 2)

/** How far the ladder has come down. */
export function ladderDrop(t: number): number {
  if (t < CATCH) return 0
  if (t < SLIDE) return 0.06 * Math.min(1, (t - CATCH) / 0.05) - 0.02 * smoothU((t - CATCH - 0.05) / 0.2)
  const start = 0.04
  if (t < FOOT) {
    const u = (t - SLIDE) / (FOOT - SLIDE)
    return start + (DROP - start) * u * u
  }
  // It rebounds off the pavement a little and settles.
  const s = t - FOOT
  return DROP - 0.05 * Math.exp(-s / 0.08) * Math.abs(Math.sin(s * 22))
}

/** The bulb: 1 lit, 0 out. */
export function bulbLevel(t: number): number {
  if (t < BULB_POP) return 1
  if (t < BULB_BACK) return 0.12 * Math.max(0, Math.sin((t - BULB_POP) * 41)) * Math.exp(-(t - BULB_POP) / 0.2)
  if (t < BULB_OUT) {
    const s = t - BULB_BACK
    return 0.75 * Math.exp(-s / 0.35) * (0.7 + 0.3 * Math.sin(s * 57))
  }
  return 0
}

/* ------------------------------------------------------------------ the way */

const B = (x: number, f: number): Pt => [x, f - 0.13]
/** Where the ball sits in the tub, as the tub goes. */
const inTub = (t: number): Pt => [TUB_X, F_MARTY + IN_TUB + tubDrop(t)]
/** On the ladder's rung, as it goes. */
const RUNG_Y = L_SECOND
const onLadder = (t: number): Pt => [LADDER_X, RUNG_Y - 0.13 + ladderDrop(t)]

/** A hop gravity draws, from one way to the next point, landing at `t`. */
const hop = (from: Way, p: Pt, t: number): Way => ({ at: t, p, arc: (G * (t - from.at) ** 2) / 8 })
const rest = (p: Pt, t: number): Way => ({ at: t, p })

/** Mishkin's head, sitting up furious in his collapsed bed: where Marty lands on it. */
export const SIT_HIP: Pt = [4.05, F_MARTY + LANDED + COLLAPSE - 0.08]
export const HEAD_R = 0.36
export const sitHead = (hip: Pt): Pt => [hip[0] - 0.02, hip[1] - 1.55]
export const BONK_AT: Pt = [sitHead(SIT_HIP)[0], sitHead(SIT_HIP)[1] - HEAD_R - 0.13]
/** The tub's far rim, once it has landed. */
const RIM_AT: Pt = [TUB_X + TUB_HALF - 0.12, F_MARTY + LANDED + COLLAPSE + TUB_RIM - 0.06 - 0.13]
const SILL_AT: Pt = B((WALL_R[0] + WALL_R[1]) / 2, L_MISH)
/** Where he rests at the cut. */
export const END: Pt = B(14.2, F_STREET)

export function hotelWay(): { segs: Seg[]; at: (t: number) => Pt } {
  const w: Way[] = []
  const push = (x: Way) => w.push(x)
  const last = () => w[w.length - 1]
  push(rest([-0.5, 0], T0))
  push(rest([-0.5, 0], KNOCKS[1]))
  // Across the floorboards and onto the bed, which throws him on into the tub.
  push(hop(last(), B(-0.05, F_MARTY), at(43, 3)))
  push(hop(last(), B(1.95, MATTRESS + 0.0), at(44, 1)))
  push(hop(last(), B(2.7, MATTRESS + 0.0), at(44, 2)))
  push(hop(last(), inTub(0).map((v, i) => (i ? v : TUB_X - 0.08)) as Pt, at(44, 4)))
  push(hop(last(), inTub(0), a(44, 4)))
  push(rest(inTub(0), CRACKS[0] - 0.01))
  // The tub sags, and goes through the floor with him in it.
  const segs = route(w)
  segs.push(...carried(inTub, CRACKS[0] - 0.01, LAND, 260))
  const v: Way[] = [{ at: LAND, p: inTub(LAND) }]
  const add = (x: Way) => v.push(x)
  const tail = () => v[v.length - 1]
  add(hop(tail(), [TUB_X + 0.04, F_MARTY + IN_TUB + LANDED + COLLAPSE], SETTLE))
  add(rest(tail().p, OUT_OF_TUB))
  add(hop(tail(), BONK_AT, BONK))
  add(hop(tail(), RIM_AT, SLAP))
  add(hop(tail(), SILL_AT, ON_SILL))
  add(hop(tail(), [SILL_AT[0] + 0.04, SILL_AT[1]], STANDS))
  add(hop(tail(), B(8.05, L_MISH), LUNGE))
  add(hop(tail(), B(8.15, L_MISH), at(50, 3)))
  add(hop(tail(), B(8.27, L_MISH), CLAP))
  TREADS.forEach((t, i) => add(hop(tail(), B(...(tread(i + 1) as [number, number])), t)))
  add(hop(tail(), B(tread(13)[0], L_SECOND), DOWN))
  add(hop(tail(), B(12.4, L_SECOND), TO_END))
  add(hop(tail(), onLadder(ON_LADDER), ON_LADDER))
  add(rest(onLadder(CATCH), CATCH))
  const segs2 = route(v)
  segs.push(...segs2)
  segs.push(...carried(onLadder, CATCH, LET_GO, 120))
  const u: Way[] = [{ at: LET_GO, p: onLadder(LET_GO) }]
  u.push(hop(u[0], B(13.75, F_STREET), PAVE))
  u.push(hop(u[1], B(14.0, F_STREET), BOUNCES[0]))
  u.push(hop(u[2], B(14.12, F_STREET), BOUNCES[1]))
  u.push(hop(u[3], B(14.18, F_STREET), BOUNCES[2]))
  u.push({ at: BOUNCES[2] + 0.35, p: END, ease: 'out' })
  u.push(rest(END, T1))
  segs.push(...route(u))
  return {
    segs,
    at: (t) => {
      const q = laneAt({ segs, fire: 0 }, t - T0)
      return [q.x, q.y]
    },
  }
}
export const WAY = hotelWay()

/* ------------------------------------------------------------------ Mishkin */

/** A pose of the man downstairs: his joints, in cells. */
export interface Pose {
  hip: Pt
  neck: Pt
  head: Pt
  /** Elbow and hand, near arm then far arm. */
  arms: [Pt, Pt, Pt, Pt]
  /** Knee and foot, both legs; null in bed (under the blanket). */
  legs: [Pt, Pt, Pt, Pt] | null
  /** Where he looks, radians (0 is to the right, negative up). */
  look: number
  /** 0 calm, 1 shouting. */
  rage: number
  paper: number
}

const sitPose = (hip: Pt, o: Partial<Pose> = {}): Pose => {
  const head = sitHead(hip)
  return {
    hip,
    neck: [hip[0] - 0.05, hip[1] - 1.05],
    head,
    arms: [[hip[0] + 0.25, hip[1] - 0.55], [hip[0] + 0.62, hip[1] - 0.85], [hip[0] + 0.32, hip[1] - 0.5], [hip[0] + 0.7, hip[1] - 0.7]],
    legs: null,
    look: 0.15,
    rage: 0,
    paper: 1,
    ...o,
  }
}
const READ_HIP: Pt = [4.05, M_MATTRESS - 0.08]
const READ = sitPose(READ_HIP)
const LOOKING = sitPose(READ_HIP, { look: -1.2, paper: 0.6 })
const FURY: Pose = sitPose(SIT_HIP, {
  arms: [[SIT_HIP[0] - 0.42, SIT_HIP[1] - 0.95], [SIT_HIP[0] - 0.42, SIT_HIP[1] - 1.55], [SIT_HIP[0] + 0.45, SIT_HIP[1] - 0.95], [SIT_HIP[0] + 0.55, SIT_HIP[1] - 1.55]],
  look: -0.3,
  rage: 1,
  paper: 0,
})
/** Under the rubble: bowed over, his head down. */
const SLUMP: Pose = {
  ...sitPose(SIT_HIP, { paper: 0, rage: 0.3, look: 0.9 }),
  neck: [SIT_HIP[0] + 0.25, SIT_HIP[1] - 0.85],
  head: [SIT_HIP[0] + 0.45, SIT_HIP[1] - 1.1],
  arms: [[SIT_HIP[0] + 0.3, SIT_HIP[1] - 0.4], [SIT_HIP[0] + 0.7, SIT_HIP[1] - 0.2], [SIT_HIP[0] + 0.35, SIT_HIP[1] - 0.45], [SIT_HIP[0] + 0.75, SIT_HIP[1] - 0.25]],
}
const SLAPPING: Pose = {
  ...FURY,
  arms: [[SIT_HIP[0] - 0.42, SIT_HIP[1] - 0.95], [SIT_HIP[0] - 0.42, SIT_HIP[1] - 1.5], [SIT_HIP[0] + 0.5, SIT_HIP[1] - 1.45], [SIT_HIP[0] + 0.12, SIT_HIP[1] - 2.0]],
  look: 0.5,
}
const TURNING: Pose = { ...FURY, look: 0.2, arms: [[SIT_HIP[0] + 0.3, SIT_HIP[1] - 0.6], [SIT_HIP[0] + 0.8, SIT_HIP[1] - 0.5], [SIT_HIP[0] + 0.5, SIT_HIP[1] - 0.7], [SIT_HIP[0] + 1.0, SIT_HIP[1] - 0.8]] }
const SH = F_MISH - 1.42
const STAND: Pose = {
  hip: [5.9, SH],
  neck: [6.0, SH - 1.05],
  head: [6.05, SH - 1.52],
  arms: [[6.3, SH - 0.6], [6.75, SH - 0.85], [6.15, SH - 0.5], [6.55, SH - 0.65]],
  legs: [[5.95, SH + 0.72], [5.85, F_MISH - 0.05], [6.2, SH + 0.7], [6.3, F_MISH - 0.05]],
  look: 0.1,
  rage: 1,
  paper: 0,
}
const LH = F_MISH - 1.3
const LUNGING: Pose = {
  hip: [6.75, LH],
  neck: [7.55, LH - 0.75],
  head: [7.98, LH - 1.0],
  arms: [[7.95, LH - 0.45], [8.1, LH - 0.2], [8.15, LH - 0.6], [8.45, LH - 0.3]],
  legs: [[6.45, LH + 0.7], [6.0, F_MISH - 0.05], [6.85, LH + 0.75], [6.6, F_MISH - 0.05]],
  look: 1.0,
  rage: 1,
  paper: 0,
}
const GRAB: Pose = { ...LUNGING, arms: [[7.95, LH - 0.35], [8.2, LH - 0.2], [8.2, LH - 0.45], [8.36, LH - 0.2]], look: 1.25 }
/** Out of the window: one hand on the sill, the other a fist, up (1) or down on the landing's rail (0). */
const RAIL_HIT: Pt = [8.45, L_MISH - 1.0 - 0.12]
const SHOUT = (fist: number): Pose => ({
  ...LUNGING,
  arms: [
    [8.2 + 0.15 * fist, LH - 0.7 - 0.35 * fist],
    [RAIL_HIT[0] + 0.15 * fist, RAIL_HIT[1] - 0.75 * fist],
    [7.85, LH - 0.35],
    [7.95, LH - 0.05],
  ],
  look: 0.85,
})
/** His fist on the rail, on the shuffle's "a"s. */
export const POUNDS = [a(51, 2), a(51, 4), a(52, 2), a(52, 4)]
export { RAIL_HIT }

/** His keys: [show time, pose]; between them he moves, eased. */
const KEYS: [number, Pose][] = [
  [T0 - 1, READ],
  [LOOK_UP - 0.02, READ],
  [LOOK_UP + 0.2, LOOKING],
  [BREAK, LOOKING],
  [BREAK + 0.3, { ...LOOKING, paper: 0, look: -1.4, rage: 0.6 }],
  [LAND - 0.03, { ...LOOKING, paper: 0, look: -1.4, rage: 0.6 }],
  [LAND + 0.12, SLUMP],
  [RISE_UP - 0.02, SLUMP],
  [RISE_UP + 0.16, FURY],
  [SLAP - 0.25, FURY],
  [SLAP, SLAPPING],
  [SLAP + 0.18, SLAPPING],
  [ON_SILL, TURNING],
  [STANDS - 0.05, STAND],
  [LUNGE - 0.12, LUNGING],
  [CLAP - 0.2, LUNGING],
  [CLAP, GRAB],
  [CLAP + 0.25, GRAB],
  [at(51, 1), SHOUT(0)],
]
const lerp = (p: Pt, q: Pt, u: number): Pt => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]
function blend(a: Pose, b: Pose, u: number): Pose {
  return {
    hip: lerp(a.hip, b.hip, u),
    neck: lerp(a.neck, b.neck, u),
    head: lerp(a.head, b.head, u),
    arms: a.arms.map((p, i) => lerp(p, b.arms[i], u)) as Pose['arms'],
    legs: u < 0.5 ? a.legs ?? (b.legs ? standUp(b.legs, a.hip) : null) : b.legs ?? null,
    look: a.look + (b.look - a.look) * u,
    rage: a.rage + (b.rage - a.rage) * u,
    paper: a.paper + (b.paper - a.paper) * u,
  }
}
const standUp = (_legs: [Pt, Pt, Pt, Pt], hip: Pt): [Pt, Pt, Pt, Pt] => [[hip[0] + 0.5, hip[1] - 0.1], [hip[0] + 1.0, hip[1] + 0.2], [hip[0] + 0.55, hip[1]], [hip[0] + 1.05, hip[1] + 0.25]]
/** Mishkin at `t`. */
export function mishkin(t: number): Pose {
  if (t >= at(51, 1)) {
    // Out of the window, his fist coming down on the rail on the "a"s, and shaking after.
    const marks = [at(51, 1), ...POUNDS]
    let j = 0
    while (j + 1 < marks.length && marks[j + 1] <= t) j++
    if (j + 1 < marks.length) {
      const u = (t - marks[j]) / (marks[j + 1] - marks[j])
      return SHOUT(Math.pow(Math.sin(u * Math.PI), 0.7) * (j === 0 ? Math.min(1, u * 2) : 1))
    }
    const s = t - marks[marks.length - 1]
    return SHOUT(Math.min(1, s * 4) * (0.8 + 0.2 * Math.sin(s * 18)))
  }
  let i = 0
  while (i + 1 < KEYS.length && KEYS[i + 1][0] <= t) i++
  if (i >= KEYS.length - 1) return KEYS[KEYS.length - 1][1]
  const [ta, pa] = KEYS[i]
  const [tb, pb] = KEYS[i + 1]
  return blend(pa, pb, smoothU((t - ta) / (tb - ta)))
}
/** Whether he is buried under the plaster. */
export const buried = (t: number): number => (t < LAND - 0.02 ? 0 : t < RISE_UP ? 1 : Math.max(0, 1 - (t - RISE_UP) / 0.25))

/* ------------------------------------------------------------------ strikes */

export const HOTEL_STRIKES: number[] = [
  ...KNOCKS,
  at(43, 3), at(44, 1), at(44, 2), at(44, 4), a(44, 4),
  BULB_POP, BULB_BACK, BULB_OUT,
  CREAK, ...CRACKS, ...FLAKES,
  BREAK, LAND, SETTLE, RISE_UP,
  OUT_OF_TUB, BONK, SLAP, ON_SILL, STANDS, LUNGE, at(50, 3), CLAP,
  ...POUNDS, BOARD_DROP,
  ...TREADS, DOWN, TO_END, ON_LADDER, CATCH, SLIDE, FOOT, LET_GO, PAVE, ...BOUNCES, BUZZ,
]
  .filter((t, i, all) => all.findIndex((u) => Math.abs(u - t) < 1e-6) === i)
  .sort((x, y) => x - y)

/* ------------------------------------------------------------------ the camera */

const hold = (t: number, cells: number, p: Pt, cut = false): PartShot => ({ t, cells, hold: p, w: 1, ...(cut ? { cut } : {}) })

/**
 * Close on him inside the door; out to the room as he crosses it; in on him in the tub in the moonlight; out again to
 * both rooms, the floor between them cracking; through the fall held still on the two (the score punches in on the
 * crash); in on Mishkin and the tub; along with him to the window and down the stair; out for the ladder and the drop;
 * and in to the seam's framing on the pavement.
 */
export function hotelShots(): PartShot[] {
  const seam = SEAMS.alley
  return [
    hold(T0 + 0.6, 3.45, [0.12, -0.58]),
    hold(at(44, 1), 4.8, [1.9, -1.15]),
    hold(at(44, 4), 4.8, [4.1, -1.2]),
    hold(BULB_OUT + 0.3, 4.3, [4.9, -1.05]),
    hold(at(46, 3), 7.0, [5.0, 1.2]),
    hold(at(47, 3), 7.6, [5.0, 1.6]),
    hold(LAND + 0.3, 7.6, [5.0, 1.6]),
    hold(OUT_OF_TUB + 0.1, 5.5, [5.2, 2.4]),
    hold(STANDS, 5.5, [6.3, 2.5]),
    hold(at(51, 1), 6.4, [8.4, 3.3]),
    hold(at(52, 2), 14.5, [6.8, 5.3]),
    hold(at(53, 1), 14.5, [6.9, 5.3]),
    hold(DOWN, 9.0, [11.0, 6.5]),
    hold(SLIDE, 9.2, [12.0, 8.3]),
    hold(LET_GO + 0.2, 8.6, [12.7, 9.3]),
    hold(T1, seam.cells, [END[0] + seam.frame[0], END[1] + seam.frame[1]]),
  ]
}

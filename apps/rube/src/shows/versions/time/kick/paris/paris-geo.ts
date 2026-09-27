import { laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { carried, route, type Way } from '../kit'
import { bar, beat, half, SEAM } from '../music'
import { G, hop } from '../physics'

/**
 * Paris (the PARIS builder's): its fixed geometry and its clock. The world's own cells (PARIS_AT is [0, 0]): the ball
 * comes in at (-0.5, 0) on a café chair, and the set and the part draw in the same cells.
 *
 * The street runs left to right at `Y_S`. The café is on it at x 0; a small square beyond; and at `H` the quai's end,
 * where the Bir-Hakeim bridge sets off across the Seine. **The hinge** is a slot across the street there. Under it, in
 * a pit in the quai's wall, a great gear on a drum wound with a strip of hinged paving slabs (the tambour); a
 * counterweight on the drum's chain; an escapement's anchor that lets it go a step on each strike; and on the square,
 * Ariadne's lever, which lets the anchor go. When it goes, the drum pays the tambour out through the slot, and the
 * slabs lock one to the next into a curve of radius `R` about `C`, pushing the far street (the bridge, the river under
 * it, the far bank: **the leaf**) up round the curve and over, until it hangs upside down `2R` over the café.
 *
 * The leaf is drawn in its own cells, which are the world's as they were before it moved (its deck on `Y_S`, starting
 * at `H`), and turned into the world by `leafAt(θ)`: at the end (θ = π) a point reflection through `(H, Y_S - R)`.
 */

/* ------------------------------------------------------------------ the clock */

export const T0 = SEAM.paris
export const T1 = SEAM.plane
/** Bar n's downbeat; the eighth after it (the strings' second attack, as hard as the first here); the eighth after beat 2. */
export const D = (n: number): number => bar(n)
export const A = (n: number): number => half(4 * n)
export const E = (n: number): number => half(4 * n + 1)

/** The cut in, on the strings: the pigeons go up off the cobbles. */
export const CUT = D(8)
/** Bar 9: the café blows apart in slow motion, and hangs: its window, the fruit stand, the kiosk. */
export const BLASTS = [D(9), A(9), E(9)] as const
/** Ariadne slips off her chair on the last blast; Cobb after her. */
export const ARI_OFF = E(9)
export const COBB_OFF = beat(38)
/** Bar 10: she lands in the lever's pan; her weight carries it home onto its stop, and the anchor lets go. */
export const LEVER_ON = D(10)
export const LEVER_HOME = A(10)
/** The drum's surges: the counterweight drops a step and the slabs go out through the slot. */
export const SURGES: readonly [number, number, number][] = [
  // [when, how far (turns of half a turn), how long it takes to glide to rest]
  [A(10), 0.28, 0.75],
  [E(10), 0.15, 0.9],
  [D(11), 0.2, 0.8],
  [A(11), 0.14, 0.8],
  [E(11), 0.12, 1.0],
]
/** Bar 12: the anchor lets the last of it go; the leaf falls over by its own weight, and slams onto its latches. */
export const RELEASE = D(12)
export const LOCK = A(12)
/** Ariadne goes up the curve on bar 11's downbeat; Cobb on its eighth. */
export const ARI_GO = D(11)
export const COBB_GO = A(11)
/** Bar 13: she swings the great mirror behind him (it comes onto its stop), and the one in front shuts on them. */
export const MIRROR_B = D(13)
export const B_HOME = A(13)
export const MIRROR_A = E(13)
export const COBB_THERE = beat(53)
/** Bar 14: she touches it, and it shatters; the glass comes down on the deck. */
export const SHATTER = D(14)
export const SHARDS = A(14)
export const LAST_SHARD = E(14)
/** Bar 15: the projections turn to stare, and step in; Mal comes out of them, and strikes; she turns to him. */
export const STARE = D(15)
export const STEP = A(15)
export const STRIKE = E(15)
export const MAL_TURN = half(62)

/* ------------------------------------------------------------------ the geometry */

/** The ball's radius. */
export const BR = 0.13
/** The street's surface (the pavement, the square, the bridge's deck). A ball on it has its centre BR above. */
export const Y_S = 0.35
export const ON = Y_S - BR
/** The hinge's slot, at the quai's end. */
export const H = 9
/** The curve the slabs lock into, and its middle. */
export const R = 5.5
export const C: Pt = [H, Y_S - R]
/** The path of a ball's centre round the inside of the curve. */
export const RP = R - BR
/** The café: his chair, hers, and their table between. Seats' tops at BR (the ball's centre on 0). */
export const COBB_SEAT: Pt = [-0.5, 0]
export const ARI_SEAT: Pt = [1.0, 0]
export const TABLE_X = 0.25
/** The lever: its pivot on the square, its arm's length, its angle from upright (clockwise positive) before and home. */
export const LEVER: { at: Pt; arm: number; from: number; home: number } = { at: [6.4, Y_S - 0.17], arm: 1.2, from: -0.36, home: 1.1 }
/** Where Cobb watches from, and where Ariadne waits by the slot. */
export const COBB_WATCH = 7.75
export const ARI_WAIT = 8.55
/** On the bridge (leaf cells: s is how far from its start at H): the great mirror behind him, his place in front of it, hers. */
export const MIRROR: { s0: number; s1: number; top: number } = { s0: 4.32, s1: 6.68, top: 2.55 }
export const COBB_S = 5.5
export const ARI_S = 3.72
/** After the glass: on along the bridge, toward the crowd. */
export const COBB_END_S = 8.35
export const ARI_END_S = 10.1

const PI = Math.PI
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
export const smooth01 = (u: number): number => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
export const smoother01 = (u: number): number => {
  const v = clamp01(u)
  return v * v * v * (v * (6 * v - 15) + 10)
}

/* ------------------------------------------------------------------ the fold */

const SLACK = 0.02
/** How far the leaf has turned before the release (radians), from the surges. */
function driven(t: number): number {
  if (t <= LEVER_ON) return 0
  let v = SLACK * PI * smooth01((t - LEVER_ON) / (LEVER_HOME - LEVER_ON))
  for (const [at, d, tau] of SURGES) if (t > at) v += d * PI * (1 - Math.exp(-(t - at) / tau))
  return v
}
const AT_RELEASE = driven(RELEASE)
/** How the leaf falls from the release onto its latches: going on at the speed the anchor lets it, gathering. */
const FALL_KICK = 0.35

/**
 * The leaf's turn (radians, anticlockwise on the screen): 0 flat, π overhead. A lurch on every strike of the anchor
 * and a long glide after it; from the release it falls over under its own weight and slams onto its latches (LOCK),
 * where it shudders to rest.
 */
export function theta(t: number): number {
  if (t < RELEASE) return driven(t)
  if (t < LOCK) {
    const u = (t - RELEASE) / (LOCK - RELEASE)
    return AT_RELEASE + (PI - AT_RELEASE) * (FALL_KICK * u + (1 - FALL_KICK) * u * u)
  }
  const u = t - LOCK
  return PI - 0.035 * Math.exp(-u / 0.22) * Math.abs(Math.sin((PI * u) / 0.17))
}
/** How fast the leaf is turning (radians a second), for what shakes with it. */
export const thetaRate = (t: number): number => (theta(t + 0.005) - theta(t - 0.005)) / 0.01
/** How much of the slab strip is out through the slot (cells along the curve). */
export const paidOut = (t: number): number => R * theta(t)

/** Where the tip of the curve is (the leaf's start), and which way the leaf runs from it. */
export function tip(th: number): { at: Pt; dir: Pt; up: Pt } {
  return {
    at: [H + R * Math.sin(th), Y_S - R + R * Math.cos(th)],
    dir: [Math.cos(th), -Math.sin(th)],
    up: [-Math.sin(th), -Math.cos(th)],
  }
}

/** A point of the leaf (its own cells: the world's as they were before it moved) where it is when turned `th`. */
export function leafAt(p: Pt, th: number): Pt {
  const { at } = tip(th)
  const dx = p[0] - H
  const dy = p[1] - Y_S
  const c = Math.cos(th)
  const s = Math.sin(th)
  return [at[0] + dx * c + dy * s, at[1] - dx * s + dy * c]
}
/** A point of the leaf once it hangs overhead (θ = π): a point reflection. */
export const over = (p: Pt): Pt => [2 * H - p[0], 2 * Y_S - 2 * R - p[1]]
/** Back from the world to the leaf's own cells, once it hangs overhead. */
export const unover = over
/** A point on the bridge's deck, s from its start, a ball's centre over it (leaf cells). */
export const deck = (s: number, above = BR): Pt => [H + s, Y_S - above]

/* ------------------------------------------------------------------ moving along the way */

/**
 * The way up: along the street from `x0` to the slot, round the inside of the curve, and on along the bridge's deck
 * (which hangs overhead by then). A ball's centre `l` cells along it, in the world's cells.
 */
export function wayAt(x0: number, l: number): Pt {
  const l1 = H - x0
  if (l <= l1) return [x0 + l, ON]
  const l2 = l1 + PI * RP
  if (l <= l2) {
    const phi = (l - l1) / RP
    return [C[0] + RP * Math.sin(phi), C[1] + RP * Math.cos(phi)]
  }
  return over(deck(l - l2))
}
export const wayLength = (x0: number, s: number): number => H - x0 + PI * RP + s
/** How far round the curve a ball `l` along the way from `x0` is (0 on the street, π on the bridge). */
export function wayAngle(x0: number, l: number): number {
  const l1 = H - x0
  return Math.max(0, Math.min(PI, (l - l1) / RP))
}

/**
 * A move of `len` cells from rest to rest over [t0, t1]: a raised-cosine run-up over `ta` seconds, a steady pace, and
 * a raised-cosine slowing over `td` (so neither the speed nor the push ever jumps). Cells gone at `t`.
 */
export function move(t: number, t0: number, t1: number, len: number, ta: number, td: number): number {
  const T = t1 - t0
  const v = len / (T - (ta + td) / 2)
  const u = Math.max(0, Math.min(T, t - t0))
  if (u <= ta) return v * (u / 2 - (ta / (2 * PI)) * Math.sin((PI * u) / ta))
  const d1 = (v * ta) / 2
  if (u <= T - td) return d1 + v * (u - ta)
  const w = u - (T - td)
  return d1 + v * (T - td - ta) + v * (w / 2 + (td / (2 * PI)) * Math.sin((PI * w) / td))
}

/* ------------------------------------------------------------------ the lever */

/** The lever's angle from upright (radians, clockwise): at rest leaning back; her weight carries it home. */
export function leverAngle(t: number): number {
  const { from, home } = LEVER
  if (t <= LEVER_ON) return from
  if (t < LEVER_HOME) {
    const u = (t - LEVER_ON) / (LEVER_HOME - LEVER_ON)
    return from + (home - from) * (0.3 * u + 0.7 * u * u)
  }
  const u = t - LEVER_HOME
  return home - 0.07 * Math.exp(-u / 0.14) * Math.abs(Math.sin((PI * u) / 0.13))
}
/** The end of the lever's arm, where its pan hangs. */
export function leverEnd(t: number): Pt {
  const a = leverAngle(t)
  return [LEVER.at[0] + LEVER.arm * Math.sin(a), LEVER.at[1] - LEVER.arm * Math.cos(a)]
}
/** A ball riding in the pan (it hangs level under the arm's end). */
export const PAN_DROP = 0.1
export const inPan = (t: number): Pt => {
  const e = leverEnd(t)
  return [e[0], e[1] + PAN_DROP - BR - 0.02]
}

/* ------------------------------------------------------------------ Cobb */

/** His way up, and when he is where on it. */
const COBB_LEN = wayLength(COBB_WATCH, COBB_S)
export const cobbWay = (t: number): Pt => wayAt(COBB_WATCH, move(t, COBB_GO, COBB_THERE, COBB_LEN, 1.1, 1.3))
/** How far round the curve he is (0..π), the camera's roll follows it. */
export const cobbAngle = (t: number): number => wayAngle(COBB_WATCH, move(t, COBB_GO, COBB_THERE, COBB_LEN, 1.1, 1.3))

/** After the glass: on along the deck toward the crowd, and still. */
const COBB_ON0 = half(58) - 0.35
const COBB_ON1 = STARE - 0.15

/** Build his lane over his slot [T0, T1]: seconds into the slot, world cells. */
export function cobbLane(): { segs: Seg[]; fire: number } {
  const w = (t: number, p: Pt, extra: Partial<Way> = {}): Way => ({ at: t - T0, p, ...extra })
  const seat = COBB_SEAT
  const off = w(COBB_OFF, seat)
  const segs: Seg[] = route([w(T0, seat), off])
  // Off the chair's edge (rolling off it and down onto the pavement in one smooth run) and along the pavement to
  // where he watches the fold from.
  const r0 = COBB_OFF
  const r1 = LEVER_HOME + 1.25
  const edge = seat[0] + 0.1
  const offChair = (x: number): number => {
    const u = Math.max(0, Math.min(1, (x - edge) / 0.6))
    return seat[1] + (ON - seat[1]) * u * u * (3 - 2 * u)
  }
  segs.push(
    ...carried(
      (s) => {
        const x = seat[0] + move(s + T0, r0, r1, COBB_WATCH - seat[0], 0.9, 1.2)
        return [x, offChair(x)]
      },
      r0 - T0,
      r1 - T0,
      220,
    ),
  )
  // Watching.
  segs.push({ from: [COBB_WATCH, ON], to: [COBB_WATCH, ON], dur: COBB_GO - r1 })
  // Up the curve and along the upturned bridge to the mirror.
  segs.push(...carried((s) => cobbWay(s + T0), COBB_GO - T0, COBB_THERE - T0, 260))
  // In front of the mirror, through the corridor and the shattering.
  const there = over(deck(COBB_S))
  segs.push({ from: there, to: there, dur: COBB_ON0 - COBB_THERE })
  // On a little way, toward the crowd, and still.
  segs.push(...carried((s) => over(deck(COBB_S + move(s + T0, COBB_ON0, COBB_ON1, COBB_END_S - COBB_S, 0.7, 0.9))), COBB_ON0 - T0, COBB_ON1 - T0, 40))
  const end = over(deck(COBB_END_S))
  segs.push({ from: end, to: end, dur: T1 - COBB_ON1 })
  return { segs, fire: LEVER_ON - T0 }
}
export const COBB_END: Pt = over(deck(COBB_END_S))

/* ------------------------------------------------------------------ Ariadne */

const ARI_LEN = wayLength(ARI_WAIT, ARI_S)
export const ariWay = (t: number): Pt => wayAt(ARI_WAIT, move(t, ARI_GO, MIRROR_B - 0.55, ARI_LEN, 0.9, 1.2))
export const ariAngle = (t: number): number => wayAngle(ARI_WAIT, move(t, ARI_GO, MIRROR_B - 0.55, ARI_LEN, 0.9, 1.2))

/** Ariadne's own lane over [T0, WAKE_END], in world cells: the same making as his, so she moves as a ball moves. */
export const ARI_HOP = LEVER_ON - 0.56
export const ARI_OUT = half(40) + 0.12
export const ARI_TOUCH_A = beat(53)
/** After the glass she goes on ahead of him: a hop over him (she is quick), and on toward the crowd. */
export const ARI_HOP_OVER = half(57)
export const ARI_LAND = ARI_HOP_OVER + 0.55
const HOP_FROM_S = COBB_S - 0.62
const HOP_TO_S = COBB_S + 0.85
/** Where Mal meets her, and she is thrown up out of the dream. */
export const ARI_THROWN: Pt = [0.9, -7.5]
export const WAKE_END = STRIKE + 1.2

function ariLane(): Lane {
  const w = (t: number, p: Pt, extra: Partial<Way> = {}): Way => ({ at: t - T0, p, ...extra })
  const seat = ARI_SEAT
  const off = w(ARI_OFF, seat)
  const down = hop(off, [seat[0] + 0.14, ON], ARI_OFF + 0.3 - T0, G)
  const segs: Seg[] = route([w(T0, seat), off, down])
  // Quick and sure, along the pavement to the lever's foot.
  const x1 = seat[0] + 0.14
  const r0 = ARI_OFF + 0.3
  const foot = LEVER.at[0] - 1.02
  segs.push(...carried((s) => [x1 + move(s + T0, r0, ARI_HOP, foot - x1, 0.45, 0.35), ON], r0 - T0, ARI_HOP - T0, 24))
  // Up into the pan, on the downbeat.
  const up = hop(w(ARI_HOP, [foot, ON]), inPan(LEVER_ON), LEVER_ON - T0, G)
  segs.push(...route([w(ARI_HOP, [foot, ON]), up]))
  // Riding the arm home.
  segs.push(...carried((s) => inPan(s + T0), LEVER_ON - T0, ARI_OUT - T0, 24))
  // Out of the pan onto the street by the slot, and waiting there.
  const out = w(ARI_OUT, inPan(ARI_OUT))
  const land = hop(out, [ARI_WAIT, ON], ARI_OUT + 0.42 - T0, G)
  segs.push(...route([out, land]))
  segs.push({ from: [ARI_WAIT, ON], to: [ARI_WAIT, ON], dur: ARI_GO - (ARI_OUT + 0.42) })
  // Up the curve ahead of him, and along the bridge to the great mirror.
  segs.push(...carried((s) => ariWay(s + T0), ARI_GO - T0, MIRROR_B - 0.55 - T0, 220))
  const q = (t: number, s: number, ease?: Seg['ease']): Way => ({ at: t - T0, p: over(deck(s)), ...(ease ? { ease } : {}) })
  segs.push(
    ...route([
      q(MIRROR_B - 0.55, ARI_S),
      q(MIRROR_B - 0.25, ARI_S),
      // She swings it: in against its edge by the hinge, on the downbeat, and back.
      q(MIRROR_B, MIRROR.s0 - 0.09, 'in'),
      q(MIRROR_B + 0.5, ARI_S, 'out'),
      // The near one: to its post (on the same column), a touch, and back out of the glass's way.
      q(ARI_TOUCH_A - 0.28, ARI_S),
      q(ARI_TOUCH_A, MIRROR.s0 - 0.26, 'in'),
      q(ARI_TOUCH_A + 0.55, ARI_S - 0.1, 'out'),
      // Outside the glass while the corridor holds; then a touch, on bar 14.
      q(SHATTER - 0.42, ARI_S - 0.1),
      q(SHATTER, MIRROR.s0 + 0.24, 'inout'),
      q(SHATTER + 0.7, ARI_S, 'out'),
      q(ARI_HOP_OVER - 0.55, ARI_S),
      q(ARI_HOP_OVER, HOP_FROM_S, 'inout'),
    ]),
  )
  // Over him, on along the bridge ahead of him (a hop: she is quick), and on toward the crowd, slowing.
  const hopT = ARI_LAND - ARI_HOP_OVER
  segs.push({ from: over(deck(HOP_FROM_S)), to: over(deck(HOP_TO_S)), dur: hopT, arc: -(G * hopT * hopT) / 8 })
  const v0 = (HOP_TO_S - HOP_FROM_S) / hopT
  const mid = ARI_END_S - 0.55
  const d1 = (mid - HOP_TO_S) / ((v0 + 1.0) / 2)
  const d2 = (ARI_END_S - mid) / 0.5
  segs.push({ from: over(deck(HOP_TO_S)), to: over(deck(mid)), dur: d1, ramp: [v0, 1.0] })
  segs.push({ from: over(deck(mid)), to: over(deck(ARI_END_S)), dur: d2, ramp: [1.0, 0] })
  const end = over(deck(ARI_END_S))
  segs.push({ from: end, to: end, dur: STRIKE - (ARI_LAND + d1 + d2) })
  // Struck: thrown up out of the dream (up the screen: in the world, away from the deck she hangs under), gathering.
  const flung = (u: number): Pt => over([H + ARI_END_S + 0.9 * u, Y_S - BR - (5.5 * u + 9 * u * u)])
  segs.push(...carried((s) => flung(s + T0 - STRIKE), STRIKE - T0, WAKE_END - T0, 30))
  return { segs, fire: 0 }
}
export const ARI_LANE = ariLane()
export const ariAt = (t: number): Pt => {
  const q = laneAt(ARI_LANE, t - T0)
  return [q.x, q.y]
}

/* ------------------------------------------------------------------ Mal */

/** Mal: out of the crowd ahead (leaf cells), gliding, to Ariadne; the blow; and round to him, and still. */
export const MAL_FROM = 54.9
export const MAL_S0 = 13.6
/** She stands in the crowd, too still, until they turn; then she comes out of it. */
export const MAL_GO = STARE - 0.25
const MAL_HIT_S = ARI_END_S + 0.3
const MAL_STOP_S = COBB_END_S + 0.95
export function malS(t: number): number {
  if (t <= MAL_GO) return MAL_S0
  if (t <= STRIKE) {
    // A glide, steady, and a dart at the end.
    const u = (t - MAL_GO) / (STRIKE - MAL_GO)
    return MAL_S0 - (MAL_S0 - MAL_HIT_S) * (0.55 * u + 0.45 * u * u * u)
  }
  // After the blow she hangs a moment where she struck; then turns to him and glides to a stand, too still.
  if (t <= MAL_TURN) return MAL_HIT_S + 0.12 * Math.sin(PI * clamp01((t - STRIKE) / (MAL_TURN - STRIKE)))
  return MAL_HIT_S - (MAL_HIT_S - MAL_STOP_S) * smoother01((t - MAL_TURN) / 1.0)
}
export const malAt = (t: number): Pt => over(deck(malS(t)))

/* ------------------------------------------------------------------ the camera's roll */

/**
 * The roll follows him round the curve: how far round he is, blurred over a little under half a second either side
 * (a symmetric window, so it neither lags nor leads him in the middle, and eases in and out where he comes onto the
 * curve and leaves it). π from when he is on the bridge to the cut; 0 before, and outside Paris.
 */
const ROLL_DT = 0.004
const ROLL_SIGMA = 0.45
const ROLL_FROM = COBB_GO - 1.5
const ROLL_TO = COBB_THERE + 1.5
const ROLL: number[] = (() => {
  const n = Math.ceil((ROLL_TO - ROLL_FROM) / ROLL_DT) + 1
  const raw: number[] = []
  const pad = Math.ceil((3 * ROLL_SIGMA) / ROLL_DT)
  for (let i = -pad; i < n + pad; i++) raw.push(cobbAngle(ROLL_FROM + i * ROLL_DT))
  const w: number[] = []
  let sum = 0
  for (let j = -pad; j <= pad; j++) {
    const g = Math.exp(-0.5 * ((j * ROLL_DT) / ROLL_SIGMA) ** 2)
    w.push(g)
    sum += g
  }
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    let v = 0
    for (let j = -pad; j <= pad; j++) v += raw[i + pad + j] * w[j + pad]
    out.push(v / sum)
  }
  // Exactly square before and exactly over after (the blur's far tails are a hair off both).
  const a = out[0]
  const b = out[n - 1]
  return out.map((v) => (PI * (v - a)) / (b - a))
})()
export function parisRoll(t: number): number {
  if (t < ROLL_FROM || t >= T1) return 0
  if (t >= ROLL_TO) return PI
  const i = (t - ROLL_FROM) / ROLL_DT
  const j = Math.min(ROLL.length - 2, Math.floor(i))
  return ROLL[j] + (ROLL[j + 1] - ROLL[j]) * (i - j)
}

/* ------------------------------------------------------------------ rolling */

/**
 * Where a ball's mark is (radians) as it rolls along its lane: it turns by the distance it rolls over its radius,
 * clockwise going forward over whatever it rests on (the street, the inside of the curve, the underside of the bridge
 * it hangs from), and not at all in the air. `up(p)` is the way from what it rests on to it, or null in flight.
 */
export function spinTable(at: (t: number) => Pt, up: (t: number, p: Pt) => Pt | null, t0: number, t1: number, dt = 1 / 240): (t: number) => number {
  const n = Math.ceil((t1 - t0) / dt) + 1
  const out: number[] = [0]
  let prev = at(t0)
  let a = 0
  for (let i = 1; i < n; i++) {
    const t = t0 + i * dt
    const p = at(t)
    const nrm = up(t - dt / 2, [(p[0] + prev[0]) / 2, (p[1] + prev[1]) / 2])
    if (nrm) a += ((p[0] - prev[0]) * -nrm[1] + (p[1] - prev[1]) * nrm[0]) / BR
    out.push(a)
    prev = p
  }
  return (t: number) => {
    const i = Math.max(0, Math.min(n - 1, (t - t0) / dt))
    const j = Math.min(n - 2, Math.floor(i))
    return out[j] + (out[j + 1] - out[j]) * (i - j)
  }
}
/** What a ball at `p` on the way rests on: the street (up), the curve (toward its middle), the bridge overhead (down). */
export function restsOn(p: Pt): Pt {
  if (p[0] > H + 1e-6 && p[1] < ON - 1e-6 && p[1] > Y_S - 2 * R + BR + 1e-6) {
    const dx = C[0] - p[0]
    const dy = C[1] - p[1]
    const d = Math.hypot(dx, dy) || 1
    return [dx / d, dy / d]
  }
  if (p[1] < Y_S - R) return [0, 1]
  return [0, -1]
}

/* ------------------------------------------------------------------ the corridor */

/** The corridor: how many of him the mirrors hold, and each one's place, size and paleness (leaf cells). */
export const VANISH: Pt = [H + 6.12, Y_S - 1.12]
export const DEEP = 14
export function reflections(t: number, here: Pt = deck(COBB_S)): { at: Pt; scale: number; fade: number }[] {
  if (t < B_HOME || t >= SHATTER) return []
  // Only while he is before the glass.
  if (here[0] < H + MIRROR.s0 + 0.12 || here[0] > H + MIRROR.s1 - 0.12) return []
  // One honest reflection once the great mirror is home and he is before it; the endless run once the near one shuts.
  const n = t >= MIRROR_A ? DEEP : 1
  const out: { at: Pt; scale: number; fade: number }[] = []
  for (let i = 1; i <= n; i++) {
    const s = 1 / (1 + 0.46 * i)
    out.push({ at: [VANISH[0] + (here[0] - VANISH[0]) * s, VANISH[1] + (here[1] - VANISH[1]) * s], scale: s, fade: 1 - Math.pow(0.83, i) })
  }
  return out
}

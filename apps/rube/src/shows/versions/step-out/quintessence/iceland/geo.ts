import type { Pt } from '../../../../../parts'
import { LAST_HIT, ONSETS, SEAM, at, beats } from '../music'
import { G } from '../physics'

/**
 * Iceland's clock and its ground (95.226 → 133.278, bars 52 to 74): where Walter is at every instant, worked out from
 * the beats he has to be somewhere on. Everything here is in the place's own cells (ICELAND_AT is [0, 0], so the part
 * and the set draw in the same frame), y down, and every time is show seconds.
 *
 * The ground: one road. It runs along the top of a ridge from the summit where he starts, gently down past a road sign
 * and three kids, to the edge of a drop; there it turns back on itself in four hairpins down the face of the mountain
 * to the shore of the fjord, and runs out level along the water. The bicycle rides the ridge; the longboard rides the
 * rest. Each tier is as long as the music makes it: the turns' apexes fall on the downbeats of bars 60, 62, 64 and 66
 * at a speed held from bar 59, so the road is laid from the clock and not the other way round.
 */

export const R = 0.13
/** How high the ball's centre rides over the road: rolling on it, on the saddle, on the board's deck. */
export const ON_GROUND = R
export const ON_SADDLE = 0.62
export const ON_BOARD = 0.235

/* ------------------------------------------------------------------ the clock */

export const T0 = SEAM.iceland
export const T1 = SEAM.home
/** He hops up off the road onto the saddle (52.1) and lands on it (52.2). */
export const HOP = at(52, 1)
export const SADDLE = at(52, 2)
/** The bicycle's crests along the ridge, each with a post's reflector catching the light. */
export const BIKE_CRESTS = [at(53), at(54), at(55)]
/** The front wheel into the sign's post (56.1); he comes down past it (56.3), and so does the toy, at the kids' feet. */
export const CRASH = at(56)
export const LANDS = at(56, 3)
/** The trade: the toy held up and stretched (57.1); the board slapped down on the road (57.3); he lands on its deck (58.1). */
export const STRETCH = at(57)
export const BOARD_DOWN = at(57, 3)
export const ABOARD = at(58)
/** The longboard: a hairpin's apex on 59, 61, 63, 65; a crest on 60, 62, 64, and on 66 out along the shore. */
export const APEX = [at(59), at(61), at(63), at(65)]
export const CRESTS = [at(60), at(62), at(64), at(66)]
/** The band's last hit: the volcano goes. */
export const ERUPT = LAST_HIT
/** The hush (bar 67). */
export const HUSH = at(67)

/* ------------------------------------------------------------------ the ridge */

/** The bicycle: its speed along the ridge once it is going, and how long it takes to get there. */
const VB = 2.6
const ACC_B = 1.6
/** The bicycle's centre where it stands propped at the summit, and along the ridge after. */
export const BIKE_X0 = 0.25
export function bikeX(t: number): number {
  if (t <= SADDLE) return BIKE_X0
  const u = Math.min(t, CRASH) - SADDLE
  return u < ACC_B ? BIKE_X0 + (0.5 * VB * u * u) / ACC_B : BIKE_X0 + 0.5 * VB * ACC_B + VB * (u - ACC_B)
}
export const CRASH_X = bikeX(CRASH)
/** Where the ball sits on the bicycle, from its centre. */
export const SADDLE_DX = -0.08

/** The ridge road before its bumps: up to the summit behind him, then gently down. */
const SLOPE0 = 0.038
const ridgeBase = (x: number): number => (x >= -0.5 ? 0.13 + SLOPE0 * (x + 0.5) : 0.13 + 0.1 * (x + 0.5) - 0.012 * (x + 0.5) * (x + 0.5))

/** The flight over the handlebars, and the roll after it to a stop short of the kids. */
const FLY_VX = 0.9 * VB
export const LAND_X = CRASH_X + SADDLE_DX + FLY_VX * (LANDS - CRASH)
const ROLL_V = 1.5
const ROLL_T = 1.05
export const REST_X = LAND_X + 0.5 * ROLL_V * ROLL_T
/** The board's centre where it is slapped down, just ahead of him. */
export const BOARD_X = REST_X + 0.43
/** The kids, standing at the road's far edge: the one with the board, the one the toy lands by, the little one. */
export const KIDS: { x: number; h: number }[] = [
  { x: REST_X + 0.8, h: 0.66 },
  { x: REST_X + 1.22, h: 0.72 },
  { x: REST_X + 1.56, h: 0.54 },
]
export const TOY_LAND_X = KIDS[1].x - 0.2

/* ------------------------------------------------------------------ the longboard's clock */

/** Off the board's tail, the speed he pushes off with; the speed he holds from bar 59. */
const VA = 1.2
export const V = 3.55
const TA = APEX[0] - ABOARD
/** How long he takes to roll to a stop in the hush, and how the speed goes (1 would be a constant drag). */
const TD = 5.7
const EASE = 1.2
/** How far along the road he is at `t`, from where the board was slapped down. */
export function boardS(t: number): number {
  if (t <= ABOARD) return 0
  if (t <= APEX[0]) {
    const u = t - ABOARD
    return VA * u + (0.5 * (V - VA) * u * u) / TA
  }
  const sA = ((VA + V) / 2) * TA
  if (t <= ERUPT) return sA + V * (t - APEX[0])
  const sE = sA + V * (ERUPT - APEX[0])
  const u = Math.min(1, (t - ERUPT) / TD)
  return sE + ((V * TD) / (EASE + 1)) * (1 - Math.pow(1 - u, EASE + 1))
}
/** When he comes to rest on the shore. */
export const STOPS = ERUPT + TD

/* ------------------------------------------------------------------ the road */

const BUMP_H = 0.13
const BUMP_W = 0.75
const bump = (d: number): number => BUMP_H * Math.exp(-(d / BUMP_W) * (d / BUMP_W))
/** The ridge's bumps: where the bicycle's centre is on its crests. */
const RIDGE_BUMPS: number[] = BIKE_CRESTS.map(bikeX)
/** The ridge road's surface at `x`. */
export function ridgeY(x: number): number {
  let y = ridgeBase(x)
  for (const b of RIDGE_BUMPS) y -= bump(x - b)
  return y
}

/** A hairpin: half an ellipse. */
export const RX = 0.95
export const RY = 0.72
const QUARTER = (() => {
  let s = 0
  let prev: Pt = [0, -RY]
  for (let i = 1; i <= 400; i++) {
    const th = -Math.PI / 2 + (i / 400) * (Math.PI / 2)
    const q: Pt = [RX * Math.cos(th), RY * Math.sin(th)]
    s += Math.hypot(q[0] - prev[0], q[1] - prev[1])
    prev = q
  }
  return s
})()
/** Arc length along the half-ellipse to angle th (from -π/2), by table. */
const ARC_TABLE: number[] = (() => {
  const out = [0]
  let prev: Pt = [0, -RY]
  for (let i = 1; i <= 400; i++) {
    const th = -Math.PI / 2 + (i / 400) * Math.PI
    const q: Pt = [RX * Math.cos(th), RY * Math.sin(th)]
    out.push(out[i - 1] + Math.hypot(q[0] - prev[0], q[1] - prev[1]))
    prev = q
  }
  return out
})()
const HALF = ARC_TABLE[400]
function thetaAt(s: number): number {
  let lo = 0
  let hi = 400
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1
    if (ARC_TABLE[m] <= s) lo = m
    else hi = m
  }
  const f = (s - ARC_TABLE[lo]) / Math.max(1e-9, ARC_TABLE[hi] - ARC_TABLE[lo])
  return -Math.PI / 2 + ((lo + f) / 400) * Math.PI
}

/** The slope of a tier on the face, cells down per cell along. */
const TIER_SLOPE = 0.036

type Piece =
  | { kind: 'ridge'; s0: number; len: number; x0: number }
  | { kind: 'tier'; s0: number; len: number; x0: number; y0: number; dir: 1 | -1; crest: number | null; slope: number }
  | { kind: 'pin'; s0: number; len: number; cx: number; cy: number; dir: 1 | -1 }

const PIECES: Piece[] = (() => {
  const out: Piece[] = []
  const sOf = boardS
  // The ridge, from where the board went down, to the first hairpin.
  const ridgeLen = sOf(APEX[0]) - QUARTER
  out.push({ kind: 'ridge', s0: 0, len: ridgeLen, x0: BOARD_X })
  let x = BOARD_X + ridgeLen
  let y = ridgeY(x)
  let dir: 1 | -1 = 1
  for (let i = 0; i < APEX.length; i++) {
    const s0 = sOf(APEX[i]) - QUARTER
    out.push({ kind: 'pin', s0, len: HALF, cx: x, cy: y + RY, dir })
    y += 2 * RY
    dir = dir === 1 ? -1 : 1
    const t0 = s0 + HALF
    if (i + 1 < APEX.length) {
      const len = sOf(APEX[i + 1]) - QUARTER - t0
      const crest = sOf(CRESTS[i]) - t0
      out.push({ kind: 'tier', s0: t0, len, x0: x, y0: y, dir, crest, slope: TIER_SLOPE })
      x += dir * len
      y += TIER_SLOPE * len
    } else {
      // The shore: level, along the water, as far as anyone will go.
      out.push({ kind: 'tier', s0: t0, len: 40, x0: x, y0: y, dir, crest: sOf(CRESTS[i]) - t0, slope: 0 })
    }
  }
  return out
})()

/** The road's surface (where a wheel touches it) at `s` along it from the board's place, and which way it runs there (radians). */
export function roadAt(s: number): { p: Pt; dir: number } {
  let pc = PIECES[0]
  for (const q of PIECES) if (q.s0 <= s) pc = q
  const d = s - pc.s0
  if (pc.kind === 'ridge') {
    const x = pc.x0 + d
    const dy = (ridgeY(x + 0.01) - ridgeY(x - 0.01)) / 0.02
    return { p: [x, ridgeY(x)], dir: Math.atan2(dy, 1) }
  }
  if (pc.kind === 'tier') {
    const x = pc.x0 + pc.dir * d
    const b = pc.crest === null ? 0 : bump(d - pc.crest)
    const db = pc.crest === null ? 0 : (bump(d + 0.01 - pc.crest) - bump(d - 0.01 - pc.crest)) / 0.02
    const y = pc.y0 + pc.slope * d - b
    return { p: [x, y], dir: Math.atan2(pc.slope - db, pc.dir) }
  }
  const th = thetaAt(Math.max(0, Math.min(HALF, d)))
  const x = pc.cx + pc.dir * RX * Math.cos(th)
  const y = pc.cy + RY * Math.sin(th)
  return { p: [x, y], dir: Math.atan2(RY * Math.cos(th), -pc.dir * RX * Math.sin(th)) }
}

/** The whole road down the face as a polyline of surface points, ridge to shore (for the set to lay). */
export function roadLine(step = 0.08): Pt[] {
  const out: Pt[] = []
  const end = PIECES[PIECES.length - 1].s0 + 38
  for (let s = -BOARD_X - 40; s < 0; s += 0.25) out.push([BOARD_X + s, ridgeY(BOARD_X + s)])
  for (let s = 0; s <= end; s += step) out.push(roadAt(s).p)
  return out
}

/** The hairpins: their centres and which way each turns (for the set's posts and walls). */
export const PINS = PIECES.filter((q): q is Extract<Piece, { kind: 'pin' }> => q.kind === 'pin')
/** The shore road's surface height. */
export const SHORE_Y = (PIECES[PIECES.length - 1] as Extract<Piece, { kind: 'tier' }>).y0
/** The cliff the hairpins hang off on the right, and the left end of the zigzag. */
export const RIGHT_X = Math.max(...PINS.map((q) => q.cx)) + RX
export const LEFT_X = Math.min(...PINS.map((q) => q.cx)) - RX

/* ------------------------------------------------------------------ Walter */

const hopFrom = (a: Pt, b: Pt, t0: number, t1: number, t: number): Pt => {
  const T = t1 - t0
  const u = t - t0
  const vy0 = (b[1] - a[1]) / T - 0.5 * G * T
  return [a[0] + ((b[0] - a[0]) * u) / T, a[1] + vy0 * u + 0.5 * G * u * u]
}

export const START: Pt = [-0.5, 0]
const saddleAt = (t: number): Pt => {
  const x = bikeX(t)
  return [x + SADDLE_DX, bikeLevel(x) - ON_SADDLE]
}
/** The bicycle's level: the mean of where its two wheels touch. */
export const bikeLevel = (x: number): number => (ridgeY(x - 0.31) + ridgeY(x + 0.31)) / 2
const FLY_FROM = saddleAt(CRASH)
const FLY_TO: Pt = [LAND_X, ridgeY(LAND_X) - ON_GROUND]
const HOP2_T = ABOARD - 0.38
const ONTO: Pt = [BOARD_X, ridgeY(BOARD_X) - ON_BOARD]

/** Where the road has him while he rides the board. */
export function riding(t: number): Pt {
  const r = roadAt(boardS(t))
  return [r.p[0], r.p[1] - ON_BOARD]
}

/** Walter's centre at show time `t`. */
export function walter(t: number): Pt {
  if (t <= HOP) return START
  if (t <= SADDLE) return hopFrom(START, saddleAt(SADDLE), HOP, SADDLE, t)
  if (t <= CRASH) return saddleAt(t)
  if (t <= LANDS) return hopFrom(FLY_FROM, FLY_TO, CRASH, LANDS, t)
  if (t <= HOP2_T) {
    const u = Math.min(ROLL_T, t - LANDS)
    const x = LAND_X + ROLL_V * (u - (u * u) / (2 * ROLL_T))
    return [x, ridgeY(x) - ON_GROUND]
  }
  if (t <= ABOARD) return hopFrom([REST_X, ridgeY(REST_X) - ON_GROUND], ONTO, HOP2_T, ABOARD, t)
  return riding(t)
}
export const FINAL: Pt = walter(T1)

/**
 * Where his mark is (radians): fixed, looking ahead, while he rides; turning with the road when he rolls; tumbling
 * over the handlebars.
 */
export function walterSpin(t: number): number {
  const look = -0.35
  if (t <= HOP) return look
  if (t <= CRASH) return look
  if (t <= LANDS) return look + (2 * Math.PI * (t - CRASH)) / (LANDS - CRASH)
  if (t <= HOP2_T) return look + (walter(t)[0] - LAND_X) / R
  if (t <= ABOARD) {
    // Over the hop onto the board his look comes round to the way he is going.
    const a = look + (REST_X - LAND_X) / R
    const turn = ((((look - a) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI
    const u = (t - HOP2_T) / (ABOARD - HOP2_T)
    return a + turn * u * u * (3 - 2 * u)
  }
  // On the board: ahead and a little up, coming round over the top of him at each hairpin.
  const dir = roadAt(boardS(t)).dir
  return -Math.PI / 2 + (Math.PI / 2 - 0.35) * Math.cos(dir)
}

/* ------------------------------------------------------------------ the posts */

/** The reflector posts: one passed on every second beat along the ridge, every beat down the face. Each glints as he goes by. */
export const POSTS: { t: number; p: Pt }[] = (() => {
  const out: { t: number; p: Pt }[] = []
  for (const t of beats([52, 4], [55, 4]).filter((_, i) => i % 2 === 0)) {
    const x = bikeX(t) + SADDLE_DX
    out.push({ t, p: [x, ridgeY(x)] })
  }
  for (const t of beats([58, 3], [66, 4])) out.push({ t, p: roadAt(boardS(t)).p })
  return out
})()

/* ------------------------------------------------------------------ the ash */

/** The flakes that land where he can see them, each on a soft onset of the guitar: on the road round him, then on him. */
export const FLAKES: { t: number; p: Pt; onHim: boolean }[] = (() => {
  const out: { t: number; p: Pt; onHim: boolean }[] = []
  const soft = ONSETS.filter((o) => o.t >= 122.3 && o.t <= T1 - 0.05 && o.s >= 0.6)
  soft.forEach((o, i) => {
    const onHim = o.t > 127 && i % 3 === 1
    const dx = onHim ? (i % 2 ? 0.05 : -0.06) : (((i * 7) % 11) / 10 - 0.5) * 2.4 + (i % 2 ? 0.28 : -0.28)
    const dy = onHim ? -R * 0.92 : ON_BOARD - 0.04 - ((i * 5) % 7) * 0.035
    out.push({ t: o.t, p: [FINAL[0] + dx, FINAL[1] + dy], onHim })
  })
  return out
})()

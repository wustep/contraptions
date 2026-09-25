import { R, type Pt } from '../../../../../parts'
import { fall, JUMPS, strength } from '../music'
import { HOME_CIRCLE, SEAMS } from '../seams'
import { BAGEL, bagelTurn, scaleForHole, SWALLOWED, type Thing } from './bagel'

/**
 * The peak's clock and its machine, worked out once: where everything is at every show time. The drawing
 * (`peak.ts`) and the lane both read these, so the ball never slides off what carries it.
 *
 * Positions here are "rel": the dark's own cells, from the bagel's resting centre (`BAGEL.at`). The part's frame is
 * rel + (0, 2) (see `PEAK_AT`).
 *
 * The machine. A clothesline is wound round the bagel's rim, and runs up off its left side to a pulley above it,
 * over it, and down to Waymond, who sits on top of the pulley with his side of the line hanging slack. When he hops
 * off he falls, the slack is taken up, and the line snaps taut (beat 118). His weight and the bagel's pull hold each other a moment; Evelyn tugs her daughter back (118½),
 * and the balance tips (119): he goes down as the counterweight, the line runs off the rim, and the bagel turns
 * backwards, a lurch a beat. It hangs from the line like a yo-yo, so it climbs it as it turns, and it shrinks a
 * notch with everything it gives back, so it climbs toward the line: up and left, heave by heave, with the two of
 * them in its hole. The line runs out on 151 and its clothespin flies off; the bagel coasts, still climbing and
 * giving back, and comes to rest at the jump, its hole a washer's window.
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

export const T_IN = JUMPS.brink
export const T_OUT = JUMPS.home
/** Joy reaches the lip of the hole first, and starts to sink into it; Evelyn lands, rolls to her, and holds her. */
export const JOY_LAND = 242.755
export const EVE_LAND = 243.45
export const CATCH = 243.8
/** Waymond lets go of the pulley and falls; the slack in his line runs out on beat 118. */
export const LET_GO = 246.2
export const TAUT = fall(118)
/** Evelyn pulls Joy back, and the balance tips: the bagel turns backwards from beat 119. */
export const TUG = fall(118.5)
export const TURN = fall(119)
/** The bagel gives Joy back first: she stirs (120), is half out (121), and pops free on the peak's greatest hit. */
export const JOY_OUT = fall(122)
/** She lands beside her mother. */
export const JOY_DOWN = fall(124)
/** A googly eye comes up out of the hole on 134, and lands on her on 136. */
export const EYE_UP = fall(134)
export const JOY_EYE = fall(136)
/** The line runs out, and its clothespin flies off the rim. */
export const RELEASE = fall(151)

/** The beats the bagel lurches back on while the line drives it, and the ones it shrinks a notch on. */
const TICKS: number[] = []
for (let k = 119; k <= 159; k++) TICKS.push(k)

/* ------------------------------------------------------------------ the machine's geometry (rel cells) */

export const RO1 = BAGEL.r
export const RH1 = BAGEL.hole
export const S_END = scaleForHole(HOME_CIRCLE.r)
/** Its size in this leg before it starts to give things back (an outer radius of about 4 cells): smaller than the pull's, so the whole machine fits a frame. */
export const S0 = 3.97 / BAGEL.r
/** The line runs up off the bagel's left side: this x, always (the bagel shrinks toward it, and hangs under it). */
export const X_ROPE = -RO1 * S0
/** The pulley: its radius, and its axle. Waymond's side of the line hangs down its left. */
export const RP = 0.42
export const PULLEY: Pt = [X_ROPE - RP, -4.6]
export const WAY_X = X_ROPE - 2 * RP
/** How far the bagel climbs its line, all told. */
export const RISE = 2.4

/* ------------------------------------------------------------------ helpers */

const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
export const ss = (u: number) => {
  const v = clamp01(u)
  return v * v * (3 - 2 * v)
}
const lerp = (a: number, b: number, u: number) => a + (b - a) * u
/** A cubic Hermite from p0 (velocity v0) to p1 (velocity v1) over T seconds, at u in 0..1. */
function hermite(p0: Pt, v0: Pt, p1: Pt, v1: Pt, T: number, u: number): Pt {
  const u2 = u * u
  const u3 = u2 * u
  const h00 = 2 * u3 - 3 * u2 + 1
  const h10 = u3 - 2 * u2 + u
  const h01 = -2 * u3 + 3 * u2
  const h11 = u3 - u2
  return [h00 * p0[0] + h10 * T * v0[0] + h01 * p1[0] + h11 * T * v1[0], h00 * p0[1] + h10 * T * v0[1] + h01 * p1[1] + h11 * T * v1[1]]
}
/** A notch: 0 before, up to 1 in about a fifth of a second with a small overshoot, exactly 1 from 0.34 s on. */
function notch(x: number): number {
  if (x <= 0) return 0
  if (x >= 0.34) return 1
  const b = clamp01((x - 0.1) / 0.24)
  return ss(x / 0.22) + 0.06 * Math.sin(Math.PI * b) ** 2
}

/* ------------------------------------------------------------------ the shrink and the climb */

/** How much each beat's notch is of the whole: the loud beats more, and more toward the end, where the camera is close. */
const NOTCH_W = TICKS.filter((k) => k >= 120).map((k) => {
  const s = strength('fall', k)
  const late = (k - 120) / 39
  return { t: fall(k), w: (0.35 + Math.min(1.6, s)) * (0.6 + 0.9 * late) }
})
const NOTCH_SUM = NOTCH_W.reduce((a, b) => a + b.w, 0)

/** How far through its shrinking and climbing the bagel is, 0 (colossal, at rest) to 1 (a washer's window). */
export function progress(t: number): number {
  if (t <= TURN) return 0
  let g = 0
  for (const n of NOTCH_W) {
    if (t <= n.t) break
    g += n.w * notch(t - n.t)
  }
  return g / NOTCH_SUM
}

/** Its scale: S0 until the turn, then a notch smaller on each beat, to a washer's window at the jump. */
export const scaleAt = (t: number): number => S0 * Math.exp(Math.log(S_END / S0) * progress(t))

/** Its centre (rel): hanging under the line, so its left side stays on the line's x as it shrinks, and climbing. */
export function centreAt(t: number): Pt {
  const g = progress(t)
  return [X_ROPE + RO1 * S0 * Math.exp(Math.log(S_END / S0) * g), -RISE * g]
}

/* ------------------------------------------------------------------ the turn */

/** Its forward crawl in the breath (the pull still taking), faster toward the line's catch. Radians, the pull's way. */
function crawl(t: number): number {
  const L = TAUT - T_IN
  const u = clamp01((t - T_IN) / L)
  return 0.012 * (Math.min(t, TAUT) - T_IN) + 0.07 * L * (u * u * u - (u * u * u * u) / 2)
}
/**
 * The backward turn. While the line drives it, it goes round in lurches, one a beat (a heavy ratchet: most of each
 * beat's turn in the first sixth of a second, a small overshoot, settled well before the next), with a creep between
 * them, so it never quite stops. Each lurch is as hard as its beat, and they grow as it shrinks (it spins up as it
 * pulls in). The line runs out exactly on the release; after that it coasts, slowing to a stop at the jump.
 */
const LURCHES: { t: number; a: number }[] = []
for (let k = 119; k <= 150; k++) LURCHES.push({ t: fall(k), a: 0.3 + Math.min(1.8, strength('fall', k)) })
// The one strong eighth in the opening (120½): a second kick, before the bagel settles into a lurch a beat.
LURCHES.push({ t: fall(120.5), a: 0.6 * (0.3 + strength('fall', 120.5)) })
LURCHES.sort((a, b) => a.t - b.t)
const LURCH_SUM = LURCHES.reduce((a, b) => a + b.a, 0)
function lurch(x: number): number {
  if (x <= 0) return 0
  if (x >= 0.4) return 1
  return ss(x / 0.16) + 0.08 * Math.sin(Math.PI * clamp01((x - 0.06) / 0.34)) ** 2
}
const creepRate = (t: number): number => (t <= TURN ? 0 : ss((t - TURN) / 0.5) * Math.pow(scaleAt(t) / S0, -0.5))
/** How much of the turn is lurch, and how much creep. */
const LURCH_PART = 0.86
/** How much line is wound on the rim when it goes taut (radians of rim): once round and more than half again. */
export const WOUND = 9
/** The whole turn table, and Waymond's line: sampled once. */
const DT = 1 / 480
const T0 = T_IN - 1.5
const T1 = T_OUT + 0.6
const N = Math.ceil((T1 - T0) / DT) + 2
const BACK = new Float64Array(N)
const ROPE = new Float64Array(N)
;(() => {
  // The creep, integrated, and its whole up to the release.
  const creep = new Float64Array(N)
  for (let i = 1; i < N; i++) {
    const t = T0 + i * DT
    creep[i] = creep[i - 1] + creepRate(Math.min(t, RELEASE) - DT / 2) * (t - DT / 2 < RELEASE ? DT : 0)
  }
  const iRel = Math.round((RELEASE - T0) / DT)
  const creepAll = creep[iRel]
  const driven = (i: number): number => {
    const t = T0 + i * DT
    let l = 0
    for (const L of LURCHES) {
      if (t <= L.t) break
      l += L.a * lurch(t - L.t)
    }
    return WOUND * (LURCH_PART * (l / LURCH_SUM) + (1 - LURCH_PART) * (creep[i] / creepAll))
  }
  // Its rate just as the line goes: the mean over the last beat, what it coasts on.
  const beatN = Math.round(0.4 / DT)
  const coast0 = (driven(iRel) - driven(iRel - beatN)) / 0.4
  let rope = 0
  let prevRise = 0
  for (let i = 0; i < N; i++) {
    const t = T0 + i * DT
    if (t <= RELEASE) BACK[i] = driven(i)
    else {
      const u = clamp01((t - RELEASE) / (T_OUT - RELEASE))
      // Integral of coast0 * cos^2(u pi / 2) over the time since the release.
      const L = T_OUT - RELEASE
      const integral = coast0 * L * (u / 2 + Math.sin(Math.PI * u) / (2 * Math.PI))
      BACK[i] = WOUND + integral
    }
    const rise = RISE * progress(t)
    if (i > 0 && t > TURN && t <= RELEASE) rope += RO1 * scaleAt(t - DT / 2) * (BACK[i] - BACK[i - 1]) + (rise - prevRise)
    prevRise = rise
    ROPE[i] = rope
  }
})()
const table = (a: Float64Array, t: number): number => {
  const i = Math.max(0, Math.min(N - 2, (t - T0) / DT))
  const j = Math.floor(i)
  return a[j] + (a[j + 1] - a[j]) * (i - j)
}
/** How far the bagel has turned backwards since beat 119 (radians). */
export const backTurned = (t: number): number => table(BACK, t)
/** How much line has run off the bagel since beat 119 (cells). */
export const ropeRun = (t: number): number => table(ROPE, t)

/** The THUNK: the forward crawl stopped dead and knocked back as the line catches, ringing out by the turn. */
function thunk(t: number): number {
  const x = t - TAUT
  if (x <= 0) return 0
  return -0.03 * Math.exp(-x / 0.15) * Math.sin((2 * Math.PI * x) / 0.3)
}

/** Its turn (radians, the pull's way, as `BagelPose.turn`) at `t`. */
export function turnAt(t: number): number {
  const base = bagelTurn(T_IN)
  return base + crawl(t) + thunk(t) - backTurned(t)
}

/** How much line is wound on the rim at `t` (radians of rim): the forward crawl winds a little on, the turn pays it all out. */
export function woundAt(t: number): number {
  if (t < TAUT) return WOUND - (crawl(TAUT) - crawl(t))
  return Math.max(0, WOUND - backTurned(t))
}

/* ------------------------------------------------------------------ Waymond */

/**
 * Before he goes he sits on top of the pulley, his line hanging slack in a loop under it. On LET_GO he hops off to
 * the left and falls; the loop straightens, and on beat 118 the line takes him (the THUNK), stretches, and bobs.
 */
export const WAY_PERCH: Pt = [PULLEY[0] - 0.2, PULLEY[1] - RP - R + 0.03]
/** How hard he falls in the slack (a bit more than the dark's drift: he jumps), and how fast he hops off. */
const G_JUMP = 5
const HOP_V = 0.9
const fallFor = (x: number) => -HOP_V * x + 0.5 * G_JUMP * x * x
export const WAY_TAUT = WAY_PERCH[1] + fallFor(TAUT - LET_GO)
const V_TAUT = -HOP_V + G_JUMP * (TAUT - LET_GO)
/** The line's length from the pulley's side to him: what it is when it takes him. */
export const WAY_LINE = WAY_TAUT - PULLEY[1]
/** The bob of the line's stretch when it catches him: down first, at the speed he was falling, and rung out by the turn. */
function bob(x: number): number {
  if (x <= 0) return 0
  const w = (2 * Math.PI) / 0.4
  return (V_TAUT / w) * Math.exp(-x / 0.18) * Math.sin(w * x)
}
const WAY_REL = (() => {
  // Where he is, and how fast he is going, when the line runs out.
  const y = WAY_TAUT + bob(RELEASE - TAUT) + ropeRun(RELEASE)
  const v = (ropeRun(RELEASE) - ropeRun(RELEASE - 0.01)) / 0.01
  return { y, v }
})()

/** Waymond's height (rel y) at `t`. */
export function waymondY(t: number): number {
  if (t < LET_GO) return WAY_PERCH[1]
  if (t < TAUT) return WAY_PERCH[1] + fallFor(t - LET_GO)
  if (t < RELEASE) return WAY_TAUT + bob(t - TAUT) + ropeRun(t)
  // Let go of by the line, he falls away, faster than the dark's drift (out of sight by now).
  const x = t - RELEASE
  return WAY_REL.y + WAY_REL.v * x + 0.5 * 7 * x * x
}
/** Waymond (rel) at `t`: on the pulley, hopping off it to the left, and down his line. */
export function waymondAt(t: number): Pt {
  const u = ss((t - LET_GO) / 0.45)
  return [WAY_PERCH[0] + (WAY_X - WAY_PERCH[0]) * u, waymondY(t)]
}

/** The slack in the line (cells over its straight length) before it goes taut. */
export function slackAt(t: number): number {
  if (t >= TAUT) return 0
  const [x, y] = waymondAt(t)
  const d = Math.hypot(x - WAY_X, y - PULLEY[1])
  return Math.max(0, WAY_LINE - d)
}

/* ------------------------------------------------------------------ Evelyn and Joy */

/** The two of them at the entry: Evelyn at the leg's entry (rel), and Joy just ahead of her on the same fall, where the rocks hand her over. */
export const E0: Pt = [-0.5, -2]
const V0 = SEAMS.brink.v
const JOY_AHEAD: Pt = [0.16, 1.22]
export const J0: Pt = [E0[0] + JOY_AHEAD[0], E0[1] + JOY_AHEAD[1]]
/** The lip under them: how far a ball resting on the hole's edge is from its centre. */
export const lipAt = (scale: number) => RH1 * scale - R - 0.008
/** Where on the lip each lands and rests (radians from the bottom, + to the right). */
const E_LAND_A = -0.2
const J_LAND_A = 0.02
const onLip = (c: Pt, d: number, a: number): Pt => [c[0] + d * Math.sin(a), c[1] + d * Math.cos(a)]
const TOUCH = (d: number) => Math.asin(Math.min(0.99, (R + 0.004) / d))

/**
 * How far into the hole the dark has drawn Joy: 0 on the lip, up to about 0.65. She goes in toward its heart, so she
 * gets smaller and dimmer as she goes. Faster and faster until her mother has her; held, with the pull pulsing; drawn
 * further as Waymond falls; jolted by the catch; pulled back by the tug; given back a little on each of 119 to 121.
 */
export function depthAt(t: number): number {
  const s0 = JOY_LAND + 0.2
  if (t < s0) return 0
  if (t < CATCH) return 0.42 * Math.pow((t - s0) / (CATCH - s0), 1.5)
  let z = 0.42 + 0.035 * Math.sin((t - CATCH) * 4.2) * ss((t - CATCH) / 0.5)
  z += 0.22 * ss((t - LET_GO) / (TAUT - LET_GO))
  z += 0.05 * ss((t - TAUT) / 0.04) * Math.exp(-Math.max(0, t - TAUT - 0.04) / 0.12)
  z -= 0.28 * ss((t - TUG - 0.02) / 0.12)
  z -= 0.05 * notch(t - TURN) + 0.08 * notch(t - fall(120)) + 0.1 * notch(t - fall(121))
  return Math.max(0, z)
}
/** Joy's size (1 on the lip) and how far her colour has gone toward the dark (0..1), as the ball draws her. */
export function joyLook(t: number): { scale: number; dim: number } {
  if (t < JOY_OUT) {
    const z = depthAt(t)
    return { scale: 1 - 0.52 * z, dim: Math.min(1, z / 0.66) * 0.7 }
  }
  // Popped out of the dark: past full size toward us, and back.
  const x = t - JOY_OUT
  const z0 = depthAt(JOY_OUT - 1e-6)
  const pop = 1 - 0.52 * z0 + (0.52 * z0 + 0.16) * ss(x / 0.1)
  const back = 0.16 * ss((x - 0.1) / 0.45)
  return { scale: pop - back, dim: Math.min(1, z0 / 0.66) * 0.7 * (1 - ss(x / 0.12)) }
}

/** The jostle of the two of them in the hole: each lurch of the rim drags them a little (left, as it turns back) and they swing back. */
function jostle(t: number): number {
  let a = 0
  for (const k of TICKS) {
    const x = t - fall(k)
    if (x <= 0) break
    if (x > 1.6) continue
    // The close (156 to 159): the drum rocks them gently, a beat at a time; bigger in angle as the hole gets small.
    const late = k >= 156 ? 2.2 : 1
    const amp = 0.05 * late * Math.min(1.3, 0.3 + strength('fall', k))
    a -= amp * Math.exp(-x / 0.3) * Math.sin((2 * Math.PI * x) / 0.62)
  }
  // The THUNK throws them the other way (the crawl stopped under them).
  const x = t - TAUT
  if (x > 0) a += 0.06 * Math.exp(-x / 0.3) * Math.sin((2 * Math.PI * x) / 0.62)
  return a
}

/** Where they end, exactly as home takes them. */
export function ends(): { eve: Pt; joy: Pt; centre: Pt } {
  const c = centreAt(T_OUT + 1)
  const eve: Pt = [c[0] - HOME_CIRCLE.fromBall[0], c[1] - HOME_CIRCLE.fromBall[1]]
  return { centre: c, eve, joy: [eve[0] + HOME_CIRCLE.joy[0], eve[1] + HOME_CIRCLE.joy[1]] }
}
const END = ends()
const settle = (t: number) => ss((t - (T_OUT - 1.3)) / 1.3)

/** Joy's place on the lip before she is drawn in (radians from the bottom). */
const J_LIP_A = 0.05
/** Joy while the dark has her: from her place on the lip toward the hole's heart, as deep as it has drawn her. */
function joyHeld(t: number): Pt {
  const c = centreAt(t)
  const d = lipAt(scaleAt(t))
  const a = J_LAND_A + (J_LIP_A - J_LAND_A) * ss((t - JOY_LAND) / 0.3)
  const lip = onLip(c, d, a + jostle(t) * 0.6)
  const u = 1 - 0.46 * depthAt(t)
  return [c[0] + (lip[0] - c[0]) * u, c[1] + (lip[1] - c[1]) * u]
}
/** Evelyn holding her: on the lip where she caught her, leaning in (off it) as far as she must to keep hold, and the tug. */
function eveHolding(t: number): Pt {
  const c = centreAt(t)
  const d = lipAt(scaleAt(t))
  const anchor = onLip(c, d, -2 * TOUCH(d) + jostle(t))
  const j = joyHeld(t)
  const reach = R * (1 + joyLook(t).scale) + 0.004
  const dx = anchor[0] - j[0]
  const dy = anchor[1] - j[1]
  const m = Math.hypot(dx, dy) || 1
  // Always against her, on the side toward where she caught her.
  const p: Pt = [j[0] + (dx / m) * reach, j[1] + (dy / m) * reach]
  // The tug: she gathers herself in toward Joy, then heaves back out (and Joy comes with her, `depthAt`).
  const wind = Math.sin(Math.PI * clamp01((t - (TUG - 0.14)) / 0.14)) ** 2
  const heave = Math.sin(Math.PI * clamp01((t - TUG) / 0.3)) ** 2
  const ux = dx / m
  const uy = dy / m
  const off = -0.025 * wind + 0.035 * heave
  return [p[0] + ux * off, p[1] + uy * off]
}

/** Evelyn (rel) at show time `t`. */
export function evelynAt(t: number): Pt {
  const c = centreAt(t)
  const d0 = lipAt(S0)
  if (t <= EVE_LAND) {
    const land = onLip([0, 0], d0, E_LAND_A)
    return hermite(E0, V0, land, [0.1, 0.2], EVE_LAND - T_IN, clamp01((t - T_IN) / (EVE_LAND - T_IN)))
  }
  if (t <= CATCH) {
    // She rolls down the lip to her daughter, and takes hold of her.
    const u = (t - EVE_LAND) / (CATCH - EVE_LAND)
    const e = 1 - (1 - u) * (1 - u)
    const land = onLip([0, 0], d0, E_LAND_A)
    const to = eveHolding(CATCH)
    return [lerp(land[0], to[0], e), lerp(land[1], to[1], e)]
  }
  if (t <= JOY_OUT) return eveHolding(t)
  const d = lipAt(scaleAt(t))
  const catchA = -2 * TOUCH(d)
  if (t <= JOY_DOWN) {
    // Let go of as Joy pops free, she settles back onto the lip.
    const from = eveHolding(JOY_OUT)
    const c0 = centreAt(JOY_OUT)
    const rel: Pt = [from[0] - c0[0], from[1] - c0[1]]
    const to = onLip(c, d, catchA + jostle(t))
    const u = ss((t - JOY_OUT) / 0.35)
    return [lerp(c[0] + rel[0], to[0], u), lerp(c[1] + rel[1], to[1], u)]
  }
  // Riding: Joy has come down beside her, and the two of them settle either side of the bottom.
  const a = -TOUCH(d)
  const shift = ss((t - JOY_DOWN) / 0.35)
  const p = onLip(c, d, lerp(catchA, a, shift) + jostle(t))
  const f = settle(t)
  return f > 0 ? [lerp(p[0], END.eve[0], f), lerp(p[1], END.eve[1], f)] : p
}

/** Joy (rel) at show time `t`: falling (just ahead), on the lip and drawn in, popped free, and riding beside her mother. */
export function joyAt(t: number): Pt {
  const d0 = lipAt(S0)
  if (t <= T_IN) return [J0[0] + V0[0] * (t - T_IN), J0[1] + V0[1] * (t - T_IN)]
  if (t <= JOY_LAND) {
    const land = onLip([0, 0], d0, J_LAND_A)
    return hermite(J0, V0, land, [0.08, 0.25], JOY_LAND - T_IN, clamp01((t - T_IN) / (JOY_LAND - T_IN)))
  }
  if (t <= JOY_OUT) return joyHeld(t)
  const c = centreAt(t)
  const rest = (s: number): Pt => onLip(centreAt(s), lipAt(scaleAt(s)), TOUCH(lipAt(scaleAt(s))) + jostle(s))
  if (t <= JOY_DOWN) {
    // Popped free: up out of the dark and down beside her mother, landing on 124.
    const T = JOY_DOWN - JOY_OUT
    const u = (t - JOY_OUT) / T
    const from = joyHeld(JOY_OUT)
    const c0 = centreAt(JOY_OUT)
    const rel0: Pt = [from[0] - c0[0], from[1] - c0[1]]
    const to = rest(t)
    const rel1: Pt = [to[0] - c[0], to[1] - c[1]]
    const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65
    const H = 0.95
    return [c[0] + lerp(rel0[0], rel1[0], e), c[1] + lerp(rel0[1], rel1[1], e) - H * 4 * u * (1 - u)]
  }
  // Riding, with a small bounce after the landing.
  const p = rest(t)
  const x = t - JOY_DOWN
  const bounce = 0.06 * Math.exp(-x / 0.12) * Math.abs(Math.sin((Math.PI * x) / 0.2))
  const q: Pt = [p[0], p[1] - bounce]
  const f = settle(t)
  return f > 0 ? [lerp(q[0], END.joy[0], f), lerp(q[1], END.joy[1], f)] : q
}

/* ------------------------------------------------------------------ what it gives back */

export interface Given {
  thing: Thing
  /** Show time it comes out of the hole: on a beat. */
  at: number
  size: number
  variant: number
  /** The way it flies (screen radians), how fast, how it curls and turns. */
  dir: number
  speed: number
  spin: number
  turn0: number
}

/** The beats something comes out on: after Joy (122), one a beat, but for Joy's landing (124), the eye (134, 136), the line's release (151) and the close (156 on). */
const OUT_BEATS = [123, 125, 126, 127, 128, 129, 130, 131, 132, 133, 135, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 152, 153, 154, 155]

/**
 * Everything it swallowed, given back last in, first out: the trophy first (her hopes and dreams, the last thing
 * down) and the receipt last (the first). Each flies out of the hole's depth toward us and away, never down across
 * the two of them at the bottom.
 */
/** A direction out of the hole (screen radians) turned aside if it would cross the pulley and Waymond's line. */
function clearOfMachine(dir: number, at: number): number {
  const c = centreAt(at)
  const toPulley = Math.atan2(PULLEY[1] - c[1], PULLEY[0] - c[0])
  // Where it heads on average (it curls a little clockwise as it goes).
  let d = dir + 0.2 - toPulley
  d = Math.atan2(Math.sin(d), Math.cos(d))
  if (Math.abs(d) >= 0.42) return dir
  return dir + (d >= 0 ? 0.42 - d : -0.42 - d)
}

export const GIVEN: Given[] = (() => {
  const back = [...SWALLOWED].reverse()
  const n = Math.min(back.length, OUT_BEATS.length)
  const out: Given[] = []
  // Allowed directions: all but a wedge round straight down. A golden step round the allowed arc.
  const lo = Math.PI / 2 + 0.95
  const span = 2 * Math.PI - 2 * 0.95 - 0.55
  for (let i = 0; i < n; i++) {
    const w = back[i]
    const f = (0.37 + i * 0.618034) % 1
    const at = fall(OUT_BEATS[i])
    out.push({
      thing: w.thing,
      at,
      size: w.size,
      variant: w.variant,
      dir: clearOfMachine(lo + span * f, at),
      speed: 12 + 4 * ((i * 0.381966) % 1),
      spin: (((i * 0.7548) % 1) < 0.5 ? -1 : 1) * (2.2 + 2.6 * ((i * 0.2887) % 1)),
      turn0: ((i * 2.399) % (2 * Math.PI)),
    })
  }
  return out
})()

/** How much bigger than it went in each thing comes out: it is coming toward us. */
const BIG = 1.7

/** Every beat something comes out on (for the glow in the hole). */
export const OUT_TIMES = GIVEN.map((g) => g.at)

/** Where a given thing is `x` seconds after it came out (rel), how big, how turned, and how dark (still in the hole). */
export function givenAt(g: Given, x: number): { p: Pt; size: number; angle: number; dark: number } {
  const c = centreAt(g.at)
  // Burst out of the hole's heart: thrown hard, dragged, and still coming (toward us: it grows as it comes).
  const r = g.speed * 0.3 * (1 - Math.exp(-x / 0.3)) + 4.2 * x
  const a = g.dir + 0.45 * (1 - Math.exp(-x / 0.5))
  const grow = 0.08 + 0.92 * ss(x / 0.22)
  return {
    p: [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a) - 0.1 * x * x],
    size: g.size * BIG * grow * (1 + 0.35 * x),
    angle: g.turn0 + g.spin * x,
    dark: 0.6 * (1 - ss(x / 0.18)),
  }
}

/** The googly eye that comes up for Joy: out of the hole's depth on 134, lobbed over, onto her on 136. */
export function joyEyeAt(t: number): { p: Pt; grow: number } | null {
  if (t < EYE_UP || t >= JOY_EYE) return null
  const u = (t - EYE_UP) / (JOY_EYE - EYE_UP)
  const c = centreAt(EYE_UP)
  const j = joyAt(JOY_EYE)
  const to: Pt = [j[0], j[1] - 0.3 * R]
  const e = ss(u) * 0.6 + u * 0.4
  return { p: [lerp(c[0], to[0], e), lerp(c[1], to[1], e) - 0.55 * Math.sin(Math.PI * u)], grow: 0.2 + 0.8 * ss(u / 0.45) }
}

/* ------------------------------------------------------------------ the glow in the hole */

/** How the hole's cold glow goes: steady in the breath, swelling as it takes Joy, a flare on everything it gives back, and out by the jump. */
export function gulpAt(t: number): number {
  let g = 0.3 + 0.25 * ss((t - JOY_LAND) / 1) + 0.35 * ss((t - LET_GO) / (TAUT - LET_GO))
  g += 0.6 * Math.exp(-Math.max(0, t - TAUT) / 0.25) * (t > TAUT ? 1 : 0)
  g += 1.6 * Math.exp(-Math.max(0, t - JOY_OUT) / 0.35) * (t > JOY_OUT ? 1 : 0)
  for (const at of [...OUT_TIMES, EYE_UP]) {
    const x = t - at
    if (x > 0 && x < 2) g += 0.9 * Math.exp(-x / 0.28)
  }
  return g * (1 - ss((t - (T_OUT - 3.2)) / 2.8))
}

/* ------------------------------------------------------------------ the window */

/** The beats the hole fills with the washer window's light, one step each, as home comes through. */
export const WINDOW_BEATS = [156, 157, 158, 159].map((k) => fall(k))

/** How much of the washer window's light is in the hole (0..about 0.6): nothing until the close, a step on each of its beats, a flare on each that settles. */
export function windowAt(t: number): number {
  let a = 0.1 * ss((t - (WINDOW_BEATS[0] - 0.8)) / 0.8)
  WINDOW_BEATS.forEach((b, i) => {
    const x = t - b
    if (x <= 0) return
    a += 0.11 * notch(x) + 0.16 * Math.exp(-x / 0.22) * ss(x / 0.04) * (1 - i * 0.12)
  })
  return a
}

/* ------------------------------------------------------------------ the seeds, on the eighths */

export interface Seed {
  dir: number
  speed: number
  size: number
  kind: 0 | 1 | 2
  spin: number
}
export interface Spray {
  at: number
  seeds: Seed[]
}
/** A spray of seeds out of the hole on each eighth the music has (122½ to 150½), and a smaller one with each thing it gives back. */
export const SPRAYS: Spray[] = (() => {
  const out: Spray[] = []
  let n = 0
  const at: { t: number; count: number }[] = []
  for (let k = 120; k <= 150; k++) {
    const st = strength('fall', k + 0.5)
    if (st >= 0.4) at.push({ t: fall(k + 0.5), count: 15 + Math.round(12 * Math.min(1.2, st)) })
  }
  for (const b of OUT_BEATS) at.push({ t: fall(b), count: 8 })
  at.sort((x, y) => x.t - y.t)
  for (const { t, count } of at) {
    const seeds: Seed[] = []
    for (let i = 0; i < count; i++) {
      n++
      const h = (v: number) => ((Math.sin(n * 12.9898 + v * 78.233) * 43758.5453) % 1 + 1) % 1
      // A fan over the top, never down across the two of them.
      seeds.push({ dir: Math.PI / 2 + 1.0 + (2 * Math.PI - 2.0) * h(1), speed: 5 + 6 * h(2), size: 0.16 + 0.14 * h(3), kind: (Math.floor(h(4) * 3) % 3) as 0 | 1 | 2, spin: (h(5) - 0.5) * 12 })
    }
    out.push({ at: t, seeds })
  }
  return out
})()
/** The eighths the sprays are on (the beats' sprays go with the things, already struck). */
export const SPRAY_TIMES = SPRAYS.map((s) => s.at).filter((t) => !OUT_BEATS.some((b) => Math.abs(fall(b) - t) < 1e-6))

/** Where a seed of a spray is `x` seconds after it (rel), how big, how turned, and how faded. */
export function seedAt(sp: Spray, sd: Seed, x: number): { p: Pt; size: number; angle: number; fade: number } {
  const c = centreAt(sp.at)
  const r = sd.speed * 0.35 * (1 - Math.exp(-x / 0.35)) + 2 * x
  return {
    p: [c[0] + r * Math.cos(sd.dir), c[1] + r * Math.sin(sd.dir)],
    size: sd.size * (0.3 + 0.7 * ss(x / 0.15)) * (1 + 0.6 * x),
    angle: sd.dir + sd.spin * x,
    fade: 1 - ss((x - 0.55) / 0.5),
  }
}

/* ------------------------------------------------------------------ the fountain's lesser pieces */

export interface Chunk {
  at: number
  dir: number
  speed: number
  size: number
  spin: number
  turn0: number
  /** A lump of the bagel's own crust, or a small thing it swallowed (then it wears an eye). */
  thing: Thing | null
  seed: number
}
/** On the loudest beats (1.4 and up) the big thing comes out with company: two lumps of crust and a small thing, fanned round it. */
export const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = []
  const small: Thing[] = ['coin', 'pebble', 'receipt', 'onion', 'coin', 'pebble', 'sock']
  let n = 0
  for (const g of GIVEN) {
    const k = Math.round((g.at - fall(0)) / (fall(1) - fall(0)))
    if (strength('fall', k) < 1.4) continue
    for (let i = 0; i < 3; i++) {
      n++
      const side = i === 0 ? -1 : i === 1 ? 1 : (n % 2 ? 1 : -1)
      const spread = i === 2 ? 1.05 : 0.55
      out.push({
        at: g.at + 0.02 * i,
        dir: clearOfMachine(g.dir + side * spread, g.at),
        speed: 9 + 4 * ((n * 0.618) % 1),
        size: i === 2 ? 0.5 : 0.3 + 0.14 * ((n * 0.382) % 1),
        spin: (n % 2 ? 1 : -1) * (3 + 3 * ((n * 0.7548) % 1)),
        turn0: (n * 2.399) % (2 * Math.PI),
        thing: i === 2 ? small[n % small.length] : null,
        seed: n,
      })
    }
  }
  return out
})()

/** Where a lesser piece is `x` seconds after it came out (rel), how big, how turned, and how dark. */
export function chunkAt(ch: Chunk, x: number): { p: Pt; size: number; angle: number; dark: number } {
  const c = centreAt(ch.at)
  const r = ch.speed * 0.3 * (1 - Math.exp(-x / 0.3)) + 3.8 * x
  const a = ch.dir + 0.45 * (1 - Math.exp(-x / 0.5))
  return {
    p: [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a) - 0.1 * x * x],
    size: ch.size * (0.1 + 0.9 * ss(x / 0.2)) * (1 + 0.35 * x),
    angle: ch.turn0 + ch.spin * x,
    dark: 0.6 * (1 - ss(x / 0.18)),
  }
}

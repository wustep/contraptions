import { laneAt, R, type Lane, type Pt, type Seg } from '../../../../../parts'
import { carried, knock, smooth } from '../kit'
import { BEATS, FIRST_BEAT, PERIOD, PHASE, SEAM, SURGE, beat, level } from '../music'
import { G } from '../physics'
import { BAND, FLOOR_Y, HANSEL_MEET, HANSEL_PLAN, MAGNUM, MEET, NEEDLE, PLUG, PULLED, TOWER, TURNTABLE } from './geo'

/**
 * The DJ's tower at Derelicte (the tower builder's): its measures, its moments, everything on it that moves, and
 * Hansel's way up it and down. The drawing (`tower-draw.ts`) and Hansel's span (`tower.ts`) read these same functions,
 * so what carries him and what is drawn are one thing.
 *
 * Cells, y down, in the runway's frame (Derelicte's world). A ball on the floor has its centre at y 2.
 *
 * The tower is a two-bay scaffold (x 26 to 29) with the booth on top (deck at y -6). Its left bay is boarded at every
 * lift; its right bay is an open shaft from the floor to the booth, with a sub (a bass bin lying on its back) at the
 * bottom and only a pair of guard rails at the third lift. The booth: a stack of speakers, a turntable and a mixer on
 * a flight case, a lamp on a boom, and the power: a plug in a box at its right end, its heavy lead up to the rig in
 * the roof. A gin wheel on a davit off the booth's left end, a bucket on one fall and a bin bag of sand on the other.
 *
 * Hansel (gold): in from the right on the surge; at the tower's foot on the ride; up on the last hook, on the sub's
 * kick (the song throws him), up the rails; the top rail he waits on gives, and he falls the whole shaft back onto the
 * sub, which throws him again; up again on the rock's hard beats; into the booth; he pulls the plug on the stop; he
 * rides the bucket down on the band's return, the bag clanging into the wheel; to Derek, for the press.
 */

/* ------------------------------------------------------------------ the scaffold */

/** The standards (the uprights of the front face). */
export const X0 = TOWER.x0
export const XM = (TOWER.x0 + TOWER.x1) / 2
export const X1 = TOWER.x1
/** The boards' ends (they overhang the standards a little). */
export const BX0 = X0 - 0.08
export const BX1 = X1 + 0.15
/** Board surfaces: the three lifts and the booth's deck. */
export const L1 = 0.13
export const L2 = -1.92
export const L3 = -3.96
export const DECK = TOWER.deck
export const LIFTS = [L1, L2, L3]
/** The guard rails over a lift: their tubes' centres, this far over its boards. */
export const MID = 0.62
export const TOP = 1.25
/** A tube's radius. */
export const TUBE = 0.035
/** Where a ball resting on a board, or on a tube, has its centre. */
export const onBoard = (surface: number): number => surface - R
export const onTube = (y: number): number => y - TUBE - R

/** The sub: a bass bin on its back in the shaft's foot, its cone looking up. */
export const SUB = { x0: 27.66, x1: 28.84, top: 1.35 }
export const SUB_X = (SUB.x0 + SUB.x1) / 2
export const ON_SUB = SUB.top - R

/** The booth, on the deck. */
export const SPK = { x0: 26.05, x1: 26.78, mid: -6.74, top: -7.42 }
export const CASE = { x0: 26.78, x1: 28.1, top: -6.14 }
export const PLINTH = { x0: 26.82, x1: 27.42, top: -6.2 }
export const PLATTER = { at: TURNTABLE, rx: 0.26, ry: 0.075 }
export const ARM_PIVOT: Pt = [27.37, -6.265]
export const MIXER = { x0: 27.52, x1: 27.98, top: -6.25 }
export const LAMP = { post: 28.04, top: -7.42, head: [27.42, -7.28] as Pt }
export const BOX = { x0: 28.2, x1: 28.46, top: -6.52 }
/** The plug: its body from the socket in the box's right face to its tail, where the lead comes out. */
export const PLUG_LEN = 0.18
export const PLUG_H = 0.13
export const RAIL_Y = -6.8
/** The skirt of bin bags round the booth's deck, down to here. */
export const SKIRT = -5.52

/** The rig in the roof the booth's lead hangs from (its box on the truss's low chord). */
export const RIG: Pt = [30.35, -9.25]

/**
 * The gin wheel on a short davit at the top of the booth's left standard: the bucket hangs on its outer fall, off the
 * booth's left end. Its other fall runs down behind the standard, along under the booth, and down the back of the
 * shaft to a running block on the bag of sand, which sits on the floor behind the sub (out of the front row). The
 * block halves its travel: the bag goes up half as far as the bucket comes down.
 */
export const WHEEL: Pt = [25.8, -7.2]
export const WHEEL_R = 0.2
export const BUCKET_X = WHEEL[0] - WHEEL_R
export const BAG_X = 28.72
/** Where the bag's two falls go up out of sight, behind the booth's skirt. */
export const BAG_TOP = SKIRT - 0.1
export const DAVIT_Y = -7.5
/** The bucket: its rim at the top of its travel and at the bottom (standing on the floor), and its measures. */
export const BUCKET = { rimW: 0.42, botW: 0.33, h: 0.36, top: -6.3, bottom: FLOOR_Y - 0.36 }
/** The bag of sand: its knot (the rope's end) on the floor and at the wheel, its body under the knot. */
export const BAG = { w: 0.3, h: 0.46, neck: 0.12 }
const KNOT_FLOOR = FLOOR_Y - BAG.h - BAG.neck

/* ------------------------------------------------------------------ the moments */

/** Hansel comes in out of shot from the right, on the surge. */
export const ENTER = SURGE
export const ARRIVE = HANSEL_PLAN.arrives.t
/** He sees Derek marching: a start. */
export const START = beat(271)
export const GO = HANSEL_PLAN.climbs.t
/** On the sub, and its kick up the shaft. */
export const ON_SUB_T = beat(302)
export const KICK1 = beat(308)
export const ON_L2 = beat(310)
/** The top rail he waits on gives; he falls the shaft onto the sub, and it throws him again on the rock's downbeat. */
export const GIVE = beat(324)
export const FALLEN = beat(326)
export const KICK2 = beat(328)
/** The dart into the booth. */
export const ON_DECK = HANSEL_PLAN.booth.t
/** He tugs on the plug on the rock's last hard beats, winds back on the shout, and it comes out on the stop. */
export const TUGS = [beat(346), beat(347), beat(348), beat(349)]
export const WIND = beat(350)
/** The bucket: in on bar 92's downbeat, down, and on the floor as the bag hits the wheel; out and on the floor. */
export const INTO_BUCKET = beat(368)
export const THUD = beat(371)
export const DOWN = HANSEL_PLAN.down.t

/**
 * Magnum stops the world: from the look to the band's return every clock but Derek's and the star's holds. The same
 * world clock as the runway's: show time, held at `MAGNUM` for the half-second, then running on behind.
 */
export const W = (t: number): number => (t < MAGNUM ? t : t < BAND ? MAGNUM : t - (BAND - MAGNUM))

/* ------------------------------------------------------------------ the music in the machine */

/** The beat at or before `t`, and how long ago. */
function lastBeat(t: number): { k: number; ago: number } {
  const k = Math.floor((t - PHASE) / PERIOD + 0.02)
  for (let j = k; j >= k - 1; j--) {
    const at = beat(j)
    if (at <= t) return { k: j, ago: t - at }
  }
  return { k: k - 2, ago: t - beat(k - 2) }
}
/** How hard beat `k` is struck (its `s`), 0.5 where it has none. */
const strength = (k: number): number => BEATS[k - FIRST_BEAT]?.s ?? 0.5

/**
 * The light the tower's lit edges catch: the show's, until the plug takes it out with a flicker; the dark of the drop
 * (fire and window spill only); the house's work lamps from the band's return, flat and cold. `cold` 0..1.
 */
export function ambient(t: number): { a: number; cold: number } {
  if (t < PULLED) return { a: 1, cold: 0 }
  if (t < BAND) {
    const u = t - PULLED
    const out = 1 - smooth(u, 0, 0.25)
    return { a: 0.28 + 0.72 * out * (0.55 + 0.45 * Math.cos(u * 70)), cold: 0 }
  }
  const up = smooth(t, BAND, BAND + 0.35)
  return { a: 0.28 + 0.62 * up, cold: up }
}

/** Whether the booth has power: from the needle to the plug. */
export const powered = (t: number): boolean => t >= NEEDLE - 0.02 && t < PULLED

/**
 * The speakers' cones: out with the kick on every beat, a punch on the downbeats, breathing with the loudness; still
 * without power. 0 at rest, about 1 at a hard downbeat.
 */
export function cone(t: number): number {
  if (!powered(t)) return 0
  const { k, ago } = lastBeat(t)
  const s = Math.min(1.3, strength(k))
  const kick = knock(ago, 0.085) * (k % 4 === 0 ? 1 : 0.6) * (0.55 + 0.45 * s)
  return 0.25 * level(t) + 0.75 * kick
}

/** The sub's cone: the kick, and the two big throws. Cells it stands up out of its rest (positive is up). */
export function subLift(t: number): number {
  let v = 0.05 * cone(t)
  for (const at of [KICK1, KICK2]) {
    const u = t - at
    if (u > -0.06 && u < 0.6) v += u < 0 ? 0.07 * smooth(u, -0.06, 0) : 0.07 * Math.exp(-u / 0.07)
  }
  // Under his landings it gives, and springs back.
  for (const at of SUB_LANDINGS) {
    const u = t - at
    if (u > 0 && u < 0.5) v -= 0.05 * Math.exp(-u / 0.06) * Math.cos(u * 30)
  }
  return v
}

/** The booth's lamp: up on the needle with a flicker, out on the plug with an ember in its filament. */
export function lamp(t: number): { on: number; ember: number } {
  if (t < NEEDLE) return { on: 0, ember: 0 }
  if (t < PULLED) {
    const u = t - NEEDLE
    const up = smooth(u, 0, 0.09) * (1 - 0.45 * Math.exp(-Math.pow((u - 0.16) / 0.04, 2)))
    return { on: up, ember: 0 }
  }
  const u = W(t) - PULLED
  return { on: Math.max(0, 1 - u / 0.04), ember: Math.exp(-u / 0.35) * (u < 1.6 ? 1 : 0) }
}

/** The record's turn, radians: 33 and a third a minute from before the needle, running down after the plug. */
export function platterTurn(t: number): number {
  const w0 = (2 * Math.PI * 100) / 3 / 60
  const t0 = NEEDLE - 2
  if (t < t0) return 0
  if (t < PULLED) return w0 * (t - t0)
  const tau = 0.9
  const u = W(t) - PULLED
  return w0 * (PULLED - t0) + w0 * tau * (1 - Math.exp(-u / tau))
}

/**
 * The tonearm: 0 parked off the record, 1 over its first groove; `lift` 1 raised, 0 down in the groove. It lifts, swings
 * over and comes down, and the needle is in the groove on the count-in's downbeat.
 */
export function arm(t: number): { swing: number; lift: number } {
  const lift = smooth(t, NEEDLE - 1.3, NEEDLE - 1.1) * (1 - smooth(t, NEEDLE - 0.22, NEEDLE))
  const swing = smooth(t, NEEDLE - 1.0, NEEDLE - 0.35) + (t > NEEDLE ? Math.min(0.2, (t - NEEDLE) * 0.0022) : 0)
  return { swing, lift }
}

/* ------------------------------------------------------------------ the rail that gives */

/**
 * The top rail of the shaft's lift: its coupler at the left lets go as he gathers to leap from it, and it swings down
 * on its right one, hangs, and settles. Its angle from level, down and round (0 level, pi/2 hanging).
 */
export const GIVE_PIVOT: Pt = [X1, L3 - TOP]
export const GIVE_LEN = X1 - XM
const RAIL_SWING: number[] = (() => {
  // A rod swinging on one end: theta'' = (3g / 2L) cos(theta) less a little damping, from level at rest.
  const dt = 1 / 240
  const out: number[] = []
  let th = 0
  let w = 0
  for (let i = 0; i <= 240 * 14; i++) {
    out.push(th)
    const a = ((3 * G) / (2 * GIVE_LEN)) * Math.cos(th) - 1.7 * w
    w += a * dt
    th += w * dt
  }
  return out
})()
export function railAngle(t: number): number {
  const u = W(t) - GIVE
  if (u <= 0) return 0
  const f = u * 240
  const i = Math.min(RAIL_SWING.length - 2, Math.floor(f))
  return RAIL_SWING[i] + (RAIL_SWING[i + 1] - RAIL_SWING[i]) * (f - i)
}

/* ------------------------------------------------------------------ the bucket */

/** The plunge: in with his weight on 368, down, and the bucket on the floor as the bag's knot hits the wheel. */
const PLUNGE_V0 = 1.2
const PLUNGE_T = THUD - INTO_BUCKET
const PLUNGE_A = (2 * (BUCKET.bottom - BUCKET.top - PLUNGE_V0 * PLUNGE_T)) / (PLUNGE_T * PLUNGE_T)
/** The bucket's rim, the bag's knot, and how far the wheel has turned (radians). */
export function bucket(t: number): { rim: number; knot: number; turn: number; tilt: number } {
  const tw = W(t)
  let rim = BUCKET.top + 0.015 * Math.sin(tw * 1.3) * (t < INTO_BUCKET ? 1 : 0)
  let tilt = 0.02 * Math.sin(tw * 0.9 + 1) * (t < INTO_BUCKET ? 1 : 0)
  if (t >= INTO_BUCKET) {
    const u = Math.min(PLUNGE_T, t - INTO_BUCKET)
    rim = BUCKET.top + PLUNGE_V0 * u + 0.5 * PLUNGE_A * u * u
  }
  if (t >= THUD) {
    // On the floor: a jolt and a rock as he pops out, settling.
    const u = t - THUD
    rim = BUCKET.bottom - 0.05 * Math.exp(-u / 0.08) * Math.abs(Math.sin(u * 25))
    tilt = 0.16 * Math.exp(-u / 0.35) * Math.sin(u * 11)
  }
  const travel = rim - BUCKET.top
  // The bag goes up the back of the shaft as the bucket comes down, half as far, on its block.
  const knot = KNOT_FLOOR - travel / 2
  return { rim, knot, turn: travel / WHEEL_R, tilt }
}
/** How far down the bucket's rim is, where Hansel rides in it. */
const rimAt = (t: number): number => bucket(t).rim

/* ------------------------------------------------------------------ the plug and its lead */

/** How far the plug has been drawn out of its socket (cells), by the tugs, until it comes out on the stop. */
export function plugOut(t: number): number {
  const steps = [0, 0.012, 0.03, 0.055, 0.09]
  let v = 0
  TUGS.forEach((at, i) => {
    if (t > at) v = steps[i] + (steps[i + 1] - steps[i]) * smooth(t, at, at + 0.1)
  })
  return v
}
/**
 * The power box jolts on each tug, toward him, and rocks back: how far it has slid (cells) and tipped (radians,
 * its top toward him, about its foot on his side).
 */
export function boxJolt(t: number): { dx: number; tilt: number } {
  let dx = 0
  let tilt = 0
  const pulls: [number, number][] = [...TUGS.map((at, i): [number, number] => [at, 0.7 + 0.15 * i]), [PULLED, 1.4]]
  for (const [at, s] of pulls) {
    const u = W(t) - at
    if (u <= 0 || u > 1.2) continue
    const j = s * Math.exp(-u / 0.13) * Math.sin(u * 16)
    dx += 0.035 * j
    tilt += 0.09 * j
  }
  return { dx, tilt }
}
/** The plug's tail (where the lead comes out) while it is in the socket. */
export const plugTail = (t: number): Pt => [PLUG[0] + PLUG_LEN / 2 + plugOut(t) + boxJolt(t).dx, PLUG[1]]
/**
 * How taut he has the lead, 0 hanging to 1 a straight line from the rig: taken up as he gets it, snapped straight
 * on each tug and easing a little after, and straight from the wind-up to the stop.
 */
export function tension(t: number): number {
  if (t < GRIP_FROM || t > PULLED) return 0
  let v = 0.45 * smooth(t, GRIP_FROM, GRIP_FROM + 0.3)
  for (const at of TUGS) {
    const u = t - at
    if (u >= 0 && u < 1) v = Math.max(v, u < 0.08 ? 0.45 + 0.55 * (u / 0.08) : 0.55 + 0.45 * Math.exp(-(u - 0.08) / 0.25))
  }
  if (t >= WIND + 0.1) v = Math.max(v, smooth(t, WIND + 0.1, WIND + 0.3))
  return Math.min(1, v)
}

/** When he has the lead in his grip: from his reaching the plug to the stop. */
export const GRIP_FROM = beat(345) + 0.2
const GRIP_IN = 0.25
/** His grip on the lead, just up and behind his middle, or null while he has not got it. */
const gripAt = (t: number): Pt | null => {
  if (t < GRIP_FROM || t > PULLED) return null
  const h = hanselAt(t)
  return [h.x - 0.05, h.y - 0.1]
}

/**
 * The lead, plugged in: a heavy cable hanging from the rig to the plug's tail, out of the plug level and up, in `n`
 * points from the rig down. A curve, not a line: its weight sags it. While he has it, it runs through his grip, and
 * the length from his grip to the plug goes taut as he pulls.
 */
export function leadIn(t: number, n: number): Pt[] {
  const [ax, ay] = RIG
  const tail = plugTail(t)
  const grip = gripAt(t)
  // How far his grip has taken the lead's low end from where it hangs: in over a quarter second.
  const g = grip ? smooth(t, GRIP_FROM, GRIP_FROM + GRIP_IN) : 0
  const m = grip && g > 0 ? 3 : 0
  const [bx, by]: Pt = g > 0 && grip ? [tail[0] + (grip[0] - tail[0]) * g, tail[1] + (grip[1] - tail[1]) * g] : tail
  // A cubic from the rig straight down a little, to the low end coming in level; pulled toward a straight line as
  // he takes the weight on it.
  const tau = tension(t)
  const c1: Pt = [ax - 0.1 + (bx - ax) / 3 * tau + 0.1 * tau, ay + 1.1 + ((by - ay) / 3 - 1.1) * tau]
  const c2: Pt = [bx + 0.55 + ((ax - bx) / 3 - 0.55) * tau, by - 0.05 + ((ay - by) / 3 + 0.05) * tau]
  const out: Pt[] = []
  const k = n - m
  for (let i = 0; i < k; i++) {
    const u = i / (k - 1)
    const v = 1 - u
    out.push([
      v * v * v * ax + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * bx,
      v * v * v * ay + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * by,
    ])
  }
  // The taut length from his grip down to the plug's tail.
  for (let i = 1; i <= m; i++) out.push([bx + ((tail[0] - bx) * i) / m, by + ((tail[1] - by) * i) / m])
  return out
}

/**
 * The lead, pulled: a chain of points from the rig (fixed) to the plug (heavy), let go on the stop with the yank's
 * speed in it; it whips, swings out over the front, and swings slower and slower till it hangs. Simulated once, on the
 * world clock, and read back by time.
 */
const LEAD_N = 16
const LEAD_DT = 1 / 240
const LEAD_FOR = 20
let LEAD: Float32Array | null = null
function simulateLead(): Float32Array {
  const n = LEAD_N
  const start = leadIn(PULLED, n)
  // The segments keep the lengths the plugged-in curve has.
  const rest: number[] = []
  for (let i = 1; i < n; i++) rest.push(Math.hypot(start[i][0] - start[i - 1][0], start[i][1] - start[i - 1][1]))
  const x = start.map((q) => q[0])
  const y = start.map((q) => q[1])
  // Its last speed: the yank's, out and up, taken up along the lead toward the rig.
  const px = x.map((v, i) => v - LEAD_DT * 2.6 * Math.pow(i / (n - 1), 2))
  const py = y.map((v, i) => v + LEAD_DT * 1.4 * Math.pow(i / (n - 1), 2))
  const inv = x.map((_, i) => (i === 0 ? 0 : i === n - 1 ? 0.25 : 1))
  const frames = Math.round(LEAD_FOR / LEAD_DT)
  const store = Math.round(LEAD_FOR * 120)
  const out = new Float32Array((store + 1) * n * 2)
  const save = (j: number) => {
    for (let i = 0; i < n; i++) {
      out[(j * n + i) * 2] = x[i]
      out[(j * n + i) * 2 + 1] = y[i]
    }
  }
  save(0)
  let saved = 1
  for (let f = 1; f <= frames; f++) {
    const drag = 1 - 0.55 * LEAD_DT
    for (let i = 1; i < n; i++) {
      const vx = (x[i] - px[i]) * drag
      const vy = (y[i] - py[i]) * drag
      px[i] = x[i]
      py[i] = y[i]
      x[i] += vx
      y[i] += vy + G * LEAD_DT * LEAD_DT
    }
    for (let it = 0; it < 30; it++) {
      for (let i = 1; i < n; i++) {
        const dx = x[i] - x[i - 1]
        const dy = y[i] - y[i - 1]
        const d = Math.hypot(dx, dy) || 1e-9
        const diff = (d - rest[i - 1]) / d
        const wa = inv[i - 1]
        const wb = inv[i]
        const s = wa + wb
        if (s <= 0) continue
        x[i - 1] += dx * diff * (wa / s)
        y[i - 1] += dy * diff * (wa / s)
        x[i] -= dx * diff * (wb / s)
        y[i] -= dy * diff * (wb / s)
      }
    }
    if (f % 2 === 0 && saved <= store) save(saved++)
  }
  return out
}
/** The pulled lead's points at show time `t` (on the world clock), rig first. */
export function leadOut(t: number): Pt[] {
  if (!LEAD) LEAD = simulateLead()
  const u = Math.max(0, Math.min(LEAD_FOR - 0.01, W(t) - PULLED)) * 120
  const j = Math.floor(u)
  const f = u - j
  const n = LEAD_N
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = (j * n + i) * 2
    const b = ((j + 1) * n + i) * 2
    out.push([LEAD[a] + (LEAD[b] - LEAD[a]) * f, LEAD[a + 1] + (LEAD[b + 1] - LEAD[a + 1]) * f])
  }
  return out
}
/** The lead at any time: plugged in until the stop, pulled after. */
export const lead = (t: number): Pt[] => (t < PULLED ? leadIn(t, LEAD_N) : leadOut(t))

/* ------------------------------------------------------------------ Hansel */

/** A path laid in show seconds: rests, runs, hops under gravity, and what carries him. */
class Path {
  segs: Seg[] = []
  constructor(public at: Pt, public t: number) {}
  rest(t1: number): this {
    if (t1 > this.t + 1e-9) this.segs.push({ from: this.at, to: this.at, dur: t1 - this.t })
    this.t = Math.max(this.t, t1)
    return this
  }
  go(to: Pt, t1: number, ease?: Seg['ease']): this {
    this.segs.push({ from: this.at, to, dur: Math.max(0, t1 - this.t), ...(ease ? { ease } : {}) })
    this.at = to
    this.t = t1
    return this
  }
  hop(to: Pt, t1: number): this {
    const T = t1 - this.t
    this.segs.push({ from: this.at, to, dur: T, arc: (G * T * T) / 8 })
    this.at = to
    this.t = t1
    return this
  }
  /** Rolling to `to` by `t1`, speed `v0` to `v1` through one middle speed (two even changes of pace). */
  roll(to: Pt, t1: number, v0: number, v1: number, f = 0.5): this {
    const T = t1 - this.t
    const D = Math.hypot(to[0] - this.at[0], to[1] - this.at[1])
    if (D < 1e-9) return this.rest(t1)
    const ta = T * f
    const tb = T - ta
    const vm = Math.max(0, (2 * D - v0 * ta - v1 * tb) / T)
    const d1 = ((v0 + vm) / 2) * ta
    const mid: Pt = [this.at[0] + ((to[0] - this.at[0]) * d1) / D, this.at[1] + ((to[1] - this.at[1]) * d1) / D]
    const seg = (a: Pt, b: Pt, dur: number, r0: number, r1: number): Seg => (r0 + r1 > 1e-6 ? { from: a, to: b, dur, ramp: [r0, r1] } : { from: a, to: b, dur })
    this.segs.push(seg(this.at, mid, ta, v0, vm), seg(mid, to, tb, vm, v1))
    this.at = to
    this.t = t1
    return this
  }
  ride(fn: (t: number) => Pt, t1: number, n: number): this {
    this.segs.push(...carried(fn, this.t, t1, n))
    this.at = fn(t1)
    this.t = t1
    return this
  }
}

/** Where he stands at each rung of his way (ball centres). */
const FLOOR_C = FLOOR_Y - R
const AT = {
  sub: [SUB_X, ON_SUB] as Pt,
  l2: [26.95, onBoard(L2)] as Pt,
  l2mid: [26.74, onTube(L2 - MID)] as Pt,
  l2top: [26.86, onTube(L2 - TOP)] as Pt,
  l3: [26.96, onBoard(L3)] as Pt,
  l3mid: [26.78, onTube(L3 - MID)] as Pt,
  l3top: [26.9, onTube(L3 - TOP)] as Pt,
  shaftTop: [28.3, onTube(L3 - TOP)] as Pt,
  booth: HANSEL_PLAN.booth.at,
}

/** Every landing, and how hard: what squashes him. */
const LANDINGS: [number, number][] = []
/** His landings on the sub: what makes its cone give. */
const SUB_LANDINGS: number[] = []
/** Where he gathers before a jump: a crouch from `a`, let go on `b`. */
const CROUCHES: [number, number, number][] = []
/** Hansel's strikes (the tower's own are added in `tower.ts`). */
export const HANSEL_HITS: number[] = []

const hansel = (() => {
  const P = new Path([36.2, FLOOR_C], ENTER)
  const land = (t: number, s: number, hit = true) => {
    LANDINGS.push([t, s])
    if (hit) HANSEL_HITS.push(t)
  }
  // In from the right on the surge, past the fire in the corner, to the tower's foot on the ride's downbeat.
  P.roll(HANSEL_PLAN.arrives.at, ARRIVE, 1.9, 0, 0.62)
  land(ARRIVE, 0.25)
  // Derek marching the runway: a start, back on his heels.
  P.rest(START)
  HANSEL_HITS.push(START)
  P.hop([HANSEL_PLAN.arrives.at[0] + 0.14, FLOOR_C], beat(272))
  land(beat(272), 0.3)
  // He edges in under the tower, watching.
  P.rest(beat(273))
  P.go([29.86, FLOOR_C], beat(276), 'inout')
  // Derek at the runway's end, turning to the Prime Minister: he goes to the shaft's foot.
  P.rest(beat(296))
  P.go(HANSEL_PLAN.climbs.at, beat(298), 'inout')
  CROUCHES.push([beat(299), GO, 0.1])
  P.rest(GO)
  HANSEL_HITS.push(GO)
  // Into the shaft's foot and up onto the sub.
  P.roll([29.0, FLOOR_C], beat(301), 0, 1.8, 0.6)
  HANSEL_HITS.push(beat(301))
  P.hop(AT.sub, ON_SUB_T)
  land(ON_SUB_T, 0.35)
  SUB_LANDINGS.push(ON_SUB_T)
  // The song bounces him, a beat a bounce.
  for (let k = 302; k < 308; k++) {
    P.hop(AT.sub, beat(k + 1))
    land(beat(k + 1), 0.2)
    SUB_LANDINGS.push(beat(k + 1))
  }
  // The kick: up the shaft and in under the second lift's rail.
  P.hop(AT.l2, ON_L2)
  land(ON_L2, 0.3)
  // Up the rails, a hop on every other beat, and across to the shaft's rails.
  const up = (to: Pt, k: number, s = 0.22) => {
    P.rest(beat(k))
    HANSEL_HITS.push(beat(k))
    P.hop(to, beat(k + 1))
    land(beat(k + 1), s)
  }
  up(AT.l2mid, 311)
  up(AT.l2top, 313)
  up(AT.l3, 315, 0.3)
  up(AT.shaftTop, 319, 0.3)
  // He gathers to leap for the booth; the rail gives under him.
  CROUCHES.push([beat(322) + 0.2, GIVE, 0.12])
  P.rest(GIVE)
  HANSEL_HITS.push(GIVE)
  // The whole shaft, back onto the sub.
  P.hop([AT.sub[0], AT.sub[1]], FALLEN)
  land(FALLEN, 0.34)
  SUB_LANDINGS.push(FALLEN)
  for (const k of [327, 328]) {
    P.hop(AT.sub, beat(k))
    land(beat(k), 0.25)
    SUB_LANDINGS.push(beat(k))
  }
  // It throws him again, on the rock's downbeat.
  P.hop(AT.l2, beat(330))
  land(beat(330), 0.3)
  // Up again, on the rock's hard beats.
  const quick = (to: Pt, k: number, s = 0.2) => {
    P.rest(beat(k))
    HANSEL_HITS.push(beat(k))
    P.hop(to, beat(k + 1))
    land(beat(k + 1), s)
  }
  quick(AT.l2mid, 331)
  quick(AT.l2top, 332)
  quick(AT.l3, 333, 0.28)
  quick(AT.l3mid, 338)
  quick(AT.l3top, 339)
  // A gather, and the dart into the booth.
  CROUCHES.push([beat(342), beat(343), 0.14])
  P.rest(beat(343))
  HANSEL_HITS.push(beat(343))
  P.hop(AT.booth, ON_DECK)
  land(ON_DECK, 0.35)
  // To the plug, and the tugs.
  const hold = PLUG[0] + PLUG_LEN / 2 + R
  P.go([hold, AT.booth[1]], beat(345) + 0.32, 'inout')
  TUGS.forEach((at, i) => {
    const out = plugOut(at + 0.2)
    P.rest(at)
    HANSEL_HITS.push(at)
    P.go([hold + out + 0.13 + 0.025 * i, AT.booth[1]], at + 0.1, 'out')
    P.go([hold + plugOut(at + 0.45) + 0.005, AT.booth[1]], at + 0.42, 'inout')
  })
  // The shout: he winds back into it, and heaves; it comes out on the stop.
  P.rest(WIND)
  HANSEL_HITS.push(WIND)
  P.go([hold + plugOut(WIND) - 0.08, AT.booth[1]], WIND + 0.2, 'out')
  P.go([hold + plugOut(WIND) + 0.12, AT.booth[1]], PULLED, 'in')
  HANSEL_HITS.push(PULLED)
  // Thrown back by it to the edge of the deck; he teeters there, and gets his balance back.
  const edge = BX1 - 0.03
  P.go([edge, AT.booth[1]], PULLED + 0.3, 'out')
  P.go([edge + 0.08, AT.booth[1]], PULLED + 0.66, 'inout')
  P.go([edge - 0.06, AT.booth[1]], PULLED + 1.04, 'inout')
  P.go([edge + 0.04, AT.booth[1]], PULLED + 1.42, 'inout')
  P.go([edge - 0.02, AT.booth[1]], PULLED + 1.78, 'inout')
  P.go([28.94, AT.booth[1]], PULLED + 2.6, 'inout')
  // The band back: along the booth to its left end, in front of its dead gear; into the bucket on bar 92.
  P.rest(beat(362))
  P.roll([26.24, AT.booth[1]], beat(366), 0, 0, 0.5)
  CROUCHES.push([beat(366) + 0.25, beat(367), 0.1])
  P.rest(beat(367))
  HANSEL_HITS.push(beat(367))
  P.hop([BUCKET_X, BUCKET.top + 0.03], INTO_BUCKET)
  land(INTO_BUCKET, 0.3)
  // Down with it.
  P.ride((t) => [BUCKET_X, rimAt(t) + 0.03], THUD, 30)
  land(THUD, 0.3)
  // Out of it, onto the floor.
  P.hop(HANSEL_PLAN.down.at, DOWN)
  land(DOWN, 0.3)
  // To Derek, once he has made room, and beside him for the press.
  P.rest(beat(376))
  HANSEL_HITS.push(beat(376))
  P.roll(HANSEL_MEET, MEET, 0, 0, 0.4)
  P.rest(SEAM.center + 1)
  const lane: Lane = { segs: P.segs, fire: 0 }
  return lane
})()

/** Hansel's clock starts when he comes in. */
export const HANSEL_FROM = ENTER
export const HANSEL_TO = SEAM.center

/** Hansel at show time `t`: where he is, and how squashed (a landing, a crouch). */
export function hanselAt(t: number): { x: number; y: number; stretch: number; angle: number } {
  const q = laneAt(hansel, t - ENTER)
  let squash = 0
  for (const [at, s] of LANDINGS) {
    const u = t - at
    if (u >= 0 && u < 0.6) squash = Math.max(squash, s * knock(u, 0.075))
  }
  for (const [a, b, s] of CROUCHES) {
    if (t >= a - 0.3 && t <= b + 0.1) squash = Math.max(squash, s * smooth(t, a, b) * (t > b ? 1 - (t - b) / 0.1 : 1))
  }
  const stretch = 1 - squash
  return { x: q.x, y: q.y + R * squash, stretch, angle: Math.PI / 2 }
}

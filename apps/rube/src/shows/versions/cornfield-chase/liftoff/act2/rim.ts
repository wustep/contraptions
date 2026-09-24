import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { FLOOR, R, type Pt } from '../../../../../parts'
import { alpha, carried, hash, knock, part, smooth, type Ctx, type PartShot } from '../kit'
import { CUE2_ORIGIN, CUE2_PERIOD, cue } from '../music'
import { G_EARTH } from '../physics'
import { DUST } from '../worlds'
import { stalk } from '../earth/corn'
import { RIM_R, SEAM, angleOf, fromRim, standOnRim, stationFrame } from './station'

/**
 * The working ring: a farm in the sky, a stretch of Cooper Station's land
 * that climbs from the museum plinth round to where the ground stands on
 * end. Four machines, one bar each, on the organ's steady beat.
 *
 *   116  Off the museum's plinth, the ball knocks down the paddle of a sluice
 *        standing on the ground; the pipe under it fills the noria's sump.
 *   117  The noria. The water wheel stands idle over its sump until the ball
 *        rolls into the scoop at the bottom; the weight drops the clutch in,
 *        and from then on a Geneva drive turns it a quarter a beat.
 *   118  a quarter: the scoop, ball and water, swings up the back.
 *   119  a quarter: over the top, and the lock throws the ball out into the
 *        flume with the water.
 *   120  The stepped channel. The ball floats down against a flap gate; it
 *   121  gives, falls flat on the beat and the pool pours over it into the
 *   122  next. Three steps. The last flap is the spout.
 *   122½ the ball drops off the spout into the lifeguard tray on the front
 *        of the harvest tram, parked under the channel,
 *   123  and the tram goes, up the ring.
 *   124  Under the corn bins: each one's gate is tripped by the tram's roof
 *   125  and lets a gush of corn into the hatch; the level behind the
 *   126  windows goes up a bin at a time.
 *   127  The tram stops at the end of the line, the tray's gate drops and the
 *        ball rolls out ahead.
 *   128  The sunlight louvres over the seed beds, where the ground stands
 *   129  nearly on end. The ball pushes the paddle under each shade, and the
 *   130  shade flips up on the beat: the station's light falls through onto
 *   131  the seedlings, a bay at a time. Out of the last bay, on to the ballpark.
 *
 * The part's frame: the ball comes in at (-0.5, 0) rolling on the ring's
 * ground; every machine stands upright on the curved ground (`standOnRim`),
 * drawn in its own cells, x along the ring, y down into it.
 */

/* ------------------------------------------------------------------ the ring */

const SF = stationFrame(SEAM.replicaOut)
const AX = SF.axis
const A_IN = angleOf(SEAM.replicaOut)
const A_OUT = angleOf(SEAM.ballparkIn)
/** Ground arc from the entry to the exit. */
const S_END = (A_IN - A_OUT) * RIM_R
const ang = (s: number): number => A_IN - s / RIM_R
/** A point `h` in from the ground, `s` along it from the entry, in the part's cells. */
function at(s: number, h: number): Pt {
  const a = ang(s)
  return [AX[0] + (RIM_R - h) * Math.cos(a), AX[1] + (RIM_R - h) * Math.sin(a)]
}
/** A point of a machine standing at `s0`, given in its own upright cells. */
const up = (s0: number, x: number, y: number): Pt => fromRim(AX, ang(s0), x, y)
/** The other way: a point of the part, in the upright cells of a machine standing at `s0`. */
function local(s0: number, q: Pt): Pt {
  const g = at(s0, 0)
  const r = ang(s0) - Math.PI / 2
  const dx = q[0] - g[0]
  const dy = q[1] - g[1]
  return [dx * Math.cos(r) + dy * Math.sin(r), -dx * Math.sin(r) + dy * Math.cos(r)]
}
/** Where the ground is, in a machine's own cells, `x` along from where it stands: the ring curves up to meet its ends. */
const gy = (x: number): number => Math.sqrt(RIM_R * RIM_R - x * x) - RIM_R

const beatOf = (T: number): number => (T - CUE2_ORIGIN) / CUE2_PERIOD
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u
const mix = (a: Pt, b: Pt, u: number): Pt => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]
const dist = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1])

/* ------------------------------------------------------------------ the noria */

/** Where it stands, the axle's height, the scoops' radius. */
const S_N = 1.24
const HN = 1.39
const RN = 1.24
/** A scoop: inside depth (closed end to mouth) and width, and how far its mouth is turned past square. */
const POT_D = 0.44
const POT_W = 0.4
const TILT = 0.2
/** The Geneva drive's index, as a fraction of a beat; it ends on the beat. */
const WI = 0.4
/** The beat the ball drops the clutch in. The wheel stands still until then. */
const CLUTCH = 117

function geneva(q: number): number {
  const a = -Math.PI / 4 + clamp01(q) * (Math.PI / 2)
  const b = Math.atan2(Math.sin(a), Math.SQRT2 - Math.cos(a))
  return (b + Math.PI / 4) / (Math.PI / 2)
}
/** Quarter turns the wheel has made at beat number `kb`. */
function turnsAt(kb: number): number {
  const m = kb - CLUTCH
  if (m <= 0) return 0
  const n = Math.floor(m)
  const f = m - n
  return n + (f > 1 - WI ? geneva((f - (1 - WI)) / WI) : 0)
}
/** The driver's pin: where it is round its disc (from the line of centres), and whether it runs. */
function driverAt(kb: number): number {
  const m = kb - CLUTCH
  if (m <= 0) return Math.PI / 4
  const f = m - Math.floor(m)
  // In the slot for the index, round the back of the disc for the dwell.
  return f > 1 - WI ? -Math.PI / 4 + ((f - (1 - WI)) / WI) * (Math.PI / 2) : Math.PI / 4 + (f / (1 - WI)) * (Math.PI * 1.5)
}

interface Pose {
  c: Pt
  u: Pt
  v: Pt
}
/** Scoop `k` when the wheel has made `turns`: its centre, its mouth direction (u) and inward (v), in the noria's cells. */
function potPose(turns: number, k: number): Pose {
  const phi = Math.PI / 2 + (Math.PI / 2) * (turns + k)
  const mu = phi + Math.PI / 2 + TILT
  return { c: [RN * Math.cos(phi), -HN + RN * Math.sin(phi)], u: [Math.cos(mu), Math.sin(mu)], v: [-Math.sin(mu), Math.cos(mu)] }
}
const inPot = (P: Pose, u: number, v: number): Pt => [P.c[0] + P.u[0] * u + P.v[0] * v, P.c[1] + P.u[1] * u + P.v[1] * v]
/** The ball at rest in a scoop: against the closed end, on the outer wall or the inner. */
const UO = -POT_D / 2 + R
const VO = -POT_W / 2 + R
const VI = POT_W / 2 - R

/* ------------------------------------------------------------------ the channel */

/** Three pools down a stepped trough, each held by a flap hinged at its floor. */
const STEP = 0.38
const DEPTH = 0.3
const FLAP_H = 0.32
const FLAP_T = 0.065
const POOL = 0.85
const FLOOR1 = 1.72
/** The flume from the noria's top to the first pool: where the first pool's back wall stands, clear of the wheel. */
const FLUME_X = 1.42
const S_C = S_N + FLUME_X + 1.5 * POOL
/** Pool k, in the channel's cells: back wall, flap hinge, floor. */
const POOLS = [0, 1, 2].map((k) => ({ x0: -1.5 * POOL + k * POOL, x1: -0.5 * POOL + k * POOL, floor: -(FLOOR1 - k * STEP) }))
const surfaceOf = (k: number): number => POOLS[k].floor - DEPTH
/** The ball floating: its centre a little over the surface. */
const FLOAT = 0.04

/* ------------------------------------------------------------------ the tram */

/** The car, in its own cells: x from its middle along the rail, y down. */
const TRAM_L = 0.78
const TRAM_FLOOR = -0.24
const TRAM_EAVE = -0.64
const TRAM_ROOF = -0.73
const WHEEL_R = 0.12
const WHEELS = [-0.46, 0.46]
/** The lifeguard tray on its front: hinged at the bumper, a gate at its lip. */
const TRAY_HINGE: Pt = [TRAM_L + 0.02, -0.17]
const TRAY_LIP = 1.24
const TRAY_BALL: Pt = [1.08, -0.225]
/** The hatch in its roof, where the corn goes in. */
const HATCH_X = -0.2

/* ------------------------------------------------------------------ the louvres */

const SHADE_H = 0.72
const PANEL = 1.2
const PADDLE_T = 0.04

/* ------------------------------------------------------------------ the plan */

interface Plan {
  begin: number
  /** Slot seconds of cue beat k. */
  b: (k: number) => number
  ball: (t: number) => Pt
  /** Where the tram stands at slot time t (its middle, along the ring). */
  tram: (t: number) => number
  tram0: number
  tram1: number
  /** Arc of each corn bin and each louvre hinge. */
  bins: number[]
  hinges: number[]
  /** The corn along the line: where each stalk stands, how tall, and when the tram's nose goes by it. */
  corn: { s: number; h: number; seed: number; pass: number }[]
  /** The ball's arc along the last stretch. */
  outS: number
  outT: number
  end: number
}

/** A throw under the ring's gravity (local down, in a machine's frame), from p0 at t0 to p1 at t1. */
function throwIn(s0: number, p0: Pt, p1: Pt, t0: number, t1: number): (t: number) => Pt {
  // Solved in the machine's upright cells, where down is +y.
  const T = t1 - t0
  const vx = (p1[0] - p0[0]) / T
  const vy = (p1[1] - p0[1] - 0.5 * G_EARTH * T * T) / T
  return (t) => {
    const u = Math.max(0, Math.min(T, t - t0))
    return up(s0, p0[0] + vx * u, p0[1] + vy * u + 0.5 * G_EARTH * u * u)
  }
}

/** A roll along a straight run whose speed changes linearly: progress 0..1 at time u of `dur`. */
const rampU = (u: number, dur: number, v0: number, v1: number, len: number): number => {
  const x = Math.max(0, Math.min(dur, u))
  return (v0 * x + (0.5 * (v1 - v0) * x * x) / dur) / len
}

const plans = new Map<string, Plan>()

function plan(begin: number, end: number): Plan {
  const key = `${begin}:${end}`
  const cached = plans.get(key)
  if (cached) return cached
  const b = (k: number) => cue(k) - begin
  const T_END = end - begin

  // --- A: in from the plinth, into the waiting scoop, stopped against its end on 117.
  const P0 = potPose(0, 0)
  const lipLocal = inPot(P0, POT_D / 2, VO)
  const restLocal = inPot(P0, UO, VO)
  const sLip = S_N + lipLocal[0]
  const V_IN = 1.5
  const tLip = sLip / V_IN
  const lipP = at(sLip, FLOOR)
  const restP = up(S_N, restLocal[0], restLocal[1])
  const potRun = b(117) - tLip
  const potLen = dist(lipP, restP)
  const vStop = Math.max(0.2, (2 * potLen) / potRun - V_IN)

  // --- B: carried by the wheel, 117 → 119.
  const inWheel = (t: number): Pt => {
    const turns = turnsAt(beatOf(t + begin))
    const P = potPose(turns, 0)
    let u = UO
    const v = VO + (VI - VO) * smooth(t, b(118) + 0.08, b(118) + 0.5)
    // Thrown out of the mouth as the lock stops the scoop dead.
    const out = smooth(t, b(119) - 0.07, b(119) + 0.1)
    u = UO + (POT_D / 2 - UO) * out
    const [x, y] = inPot(P, u, v)
    return up(S_N, x, y)
  }
  const tOut = b(119) + 0.1

  // --- C: down the flume, into the first pool, drifting to its flap.
  const Ptop = potPose(2, 0)
  const flume0Local = inPot(Ptop, POT_D / 2, POT_W / 2)
  const flume0 = up(S_N, flume0Local[0], flume0Local[1])
  const flume1 = up(S_C, POOLS[0].x0, POOLS[0].floor - 0.34 - 0.02)
  const fd: Pt = [(flume1[0] - flume0[0]) / dist(flume0, flume1), (flume1[1] - flume0[1]) / dist(flume0, flume1)]
  let fn: Pt = [-fd[1], fd[0]]
  if (fn[0] * (AX[0] - flume0[0]) + fn[1] * (AX[1] - flume0[1]) < 0) fn = [fd[1], -fd[0]]
  const fb0: Pt = [flume0[0] + fn[0] * R, flume0[1] + fn[1] * R]
  const fb1: Pt = [flume1[0] + fn[0] * (R + 0.01), flume1[1] + fn[1] * (R + 0.01)]
  const tFlume = tOut + dist(inWheel(tOut), fb0) / 2.0
  const flumeLen = dist(fb0, fb1)
  const tFlumeEnd = tFlume + flumeLen / ((2.0 + 3.3) / 2)
  const land1Local: Pt = [POOLS[0].x0 + 0.34, surfaceOf(0) - FLOAT]
  const tLand1 = tFlumeEnd + 0.07
  const touchLocal = (k: number): Pt => [POOLS[k].x1 - FLAP_T / 2 - R - 0.01, surfaceOf(k) - FLOAT]
  const flapBeat = (k: number) => b(120 + k)
  const tTouch = (k: number) => flapBeat(k) - 0.25
  const onFlapLocal = (k: number): Pt => [POOLS[k].x1 + 0.08, POOLS[k].floor - FLAP_T - R]
  const tipLocal = (k: number): Pt => [POOLS[k].x1 + FLAP_H - 0.02, POOLS[k].floor - FLAP_T - R]
  const tTip = (k: number) => flapBeat(k) + 0.13
  const landLocal = (k: number): Pt => [POOLS[k].x1 + FLAP_H + 0.24, surfaceOf(k + 1) - FLOAT]
  const tLand = (k: number) => flapBeat(k) + 0.32

  // --- E: the tram, parked with its tray where the spout drops the ball.
  const tTray = b(122.5)
  const spoutTip = up(S_C, tipLocal(2)[0], tipLocal(2)[1])
  // The ball leaves the spout going about 1.2 a second: where it comes down is where the tray waits.
  const sTip = S_C + tipLocal(2)[0]
  const trayS = sTip + 1.15 * (tTray - tTip(2))
  const tram0 = trayS - TRAY_BALL[0]
  const tGo = b(123)
  const tStop = b(127)
  const tRoll = tStop + 0.3
  // The last stretch: an even roll from the tray to the exit, through the louvres.
  const V_OUT = 1.45
  const outS = S_END - V_OUT * (T_END - tRoll)
  const tram1 = outS - 1.42
  const tramAt = (t: number): number => {
    if (t <= tGo) return tram0
    if (t >= tStop) return tram1
    // Trapezoid speed with soft corners: away on 123, easing to a stop on 127.
    const D = tram1 - tram0
    const Tt = tStop - tGo
    const ta = 0.9
    // The soft ramp at each end covers (1/2 - 1/π²) of vmax·ta; cruise makes up the rest.
    const ramp = 0.5 - 1 / (Math.PI * Math.PI)
    const vmax = D / (Tt - 2 * ta + 2 * ramp * ta)
    const u = t - tGo
    const accel = (x: number) => (vmax / ta) * (x * x * 0.5 - (ta * ta / (2 * Math.PI * Math.PI)) * (1 - Math.cos((Math.PI * x) / ta)))
    if (u < ta) return tram0 + accel(u)
    const s1 = accel(ta)
    if (u < Tt - ta) return tram0 + s1 + vmax * (u - ta)
    const w = Tt - u
    return tram1 - accel(w)
  }
  const bins = [124, 125, 126].map((k) => tramAt(b(k)) + HATCH_X)

  // --- G: the louvres. The paddle is where the ball is a fifth of a beat before its shade flips.
  const groundS = (t: number): number => outS + V_OUT * (t - tRoll)
  const hinges = [128, 129, 130, 131].map((k) => groundS(b(k) - 0.2) + R + PADDLE_T)

  const ballAt = (t: number): Pt => {
    // A: rolling in, and into the scoop.
    if (t <= tLip) return at(V_IN * t, FLOOR)
    if (t <= b(117)) {
      const u = rampU(t - tLip, potRun, V_IN, vStop, potLen)
      return mix(lipP, restP, u)
    }
    // B: the wheel.
    if (t <= tOut) return inWheel(t)
    // C: onto the flume and down it.
    if (t <= tFlume) return mix(inWheel(tOut), fb0, (t - tOut) / (tFlume - tOut))
    if (t <= tFlumeEnd) return mix(fb0, fb1, rampU(t - tFlume, tFlumeEnd - tFlume, 2.0, 3.3, flumeLen))
    if (t <= tLand1) {
      const e = fb1
      const l = up(S_C, land1Local[0], land1Local[1])
      const u = (t - tFlumeEnd) / (tLand1 - tFlumeEnd)
      return mix(e, l, u * u)
    }
    // D: the pools and flaps.
    for (let k = 0; k < 3; k++) {
      const landed = k === 0 ? tLand1 : tLand(k - 1)
      const from = k === 0 ? land1Local : landLocal(k - 1)
      if (t <= tTouch(k)) {
        const u = (t - landed) / (tTouch(k) - landed)
        const e = 1 - (1 - u) * (1 - u)
        const [x, y] = mix(from, touchLocal(k), e)
        return up(S_C, x, y + 0.012 * Math.sin((t - landed) * 9) * (1 - e))
      }
      if (t <= flapBeat(k)) {
        // Over the top of the falling flap as the pool goes over with it.
        const u = (t - tTouch(k)) / 0.25
        const [x0, y0] = touchLocal(k)
        const [x1, y1] = onFlapLocal(k)
        const lift = 0.06 * Math.sin(Math.PI * u)
        return up(S_C, lerp(x0, x1, u * u * (3 - 2 * u)), lerp(y0, y1, u * u) - lift)
      }
      if (t <= tTip(k)) {
        const [x, y] = mix(onFlapLocal(k), tipLocal(k), (t - flapBeat(k)) / (tTip(k) - flapBeat(k)))
        return up(S_C, x, y)
      }
      if (k < 2 && t <= tLand(k)) return throwIn(S_C, tipLocal(k), landLocal(k), tTip(k), tLand(k))(t)
    }
    // E: off the spout into the tray; and away with the tram.
    const trayBall = (tt: number): Pt => {
      const s = tramAt(tt)
      // Settles after the drop; rocks back as the car pulls away, and forward into the gate as it stops.
      const settle = 0.05 * knock(tt - tTray, 0.09) * Math.abs(Math.sin((tt - tTray) * 30))
      const go = tt > tGo ? -0.05 * Math.sin(Math.min(1, (tt - tGo) / 0.35) * Math.PI) : 0
      return up(s, TRAY_BALL[0] + go, TRAY_BALL[1] - settle)
    }
    if (t <= tTray) {
      return throwIn(tram0, local(tram0, spoutTip), TRAY_BALL, tTip(2), tTray)(t)
    }
    if (t <= tStop) return trayBall(t)
    // F: the gate drops and the ball rolls out ahead.
    if (t <= tRoll) {
      const from = trayBall(tStop)
      const to = at(outS, FLOOR)
      const u = (t - tStop) / (tRoll - tStop)
      // It gathers speed down the tipped tray: slow out of the gate, even by the ground.
      const e = u * u * (1.5 - 0.5 * u)
      return mix(from, to, e)
    }
    // G: the louvres, and on.
    if (t >= T_END) return at(S_END, FLOOR)
    return at(groundS(t), FLOOR)
  }

  // The station's corn, behind the line from the channel to the end of it: the tram brushes by every stalk.
  const corn: Plan['corn'] = []
  const passOf = (x: number): number => {
    let lo = tGo
    let hi = tStop
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (tramAt(mid) + TRAM_L < x) lo = mid
      else hi = mid
    }
    return hi
  }
  let i = 0
  for (let x = tram0 + 1.75; x < tram1 + 0.4; x += 0.36 + 0.12 * hash(i, 41), i++) {
    corn.push({ s: x, h: 1.0 + 0.3 * hash(i, 42), seed: 700 + i, pass: tramAt(tStop) + TRAM_L < x ? Infinity : passOf(x) })
  }

  const out: Plan = { begin, b, ball: ballAt, tram: tramAt, tram0, tram1, bins, hinges, corn, outS, outT: tRoll, end: T_END }
  plans.set(key, out)
  return out
}

/* ------------------------------------------------------------------ the part */

const HIT_BEATS = [116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131]
export const RIM_HITS = HIT_BEATS.map((k) => cue(k))

function cellsOf(): Pt[] {
  const seen = new Set<string>()
  const out: Pt[] = []
  for (let s = -1.8; s <= S_END + 1.2; s += 0.4) {
    for (let h = -0.8; h <= 3.2; h += 0.4) {
      const [x, y] = at(s, h)
      const c: Pt = [Math.round(x), Math.round(y)]
      const key = `${c[0]},${c[1]}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(c)
    }
  }
  return out
}

export const rim = part<Plan>(
  {
    name: 'rim',
    flight: true,
    draw: (p, s, c) => drawRim(p, s, c),
    over: (p, s, c) => overRim(p, s, c),
  },
  (slot) => {
    const pl = plan(slot.begin, slot.end)
    const T = slot.end - slot.begin
    const n = Math.ceil(T * 120)
    const segs = carried(pl.ball, 0, T, n)
    const exit = SF.exit(SEAM.ballparkIn)
    return {
      cells: cellsOf(),
      exit,
      lane: { segs, fire: pl.b(117) },
      state: pl,
    }
  },
  (slot, built) => {
    const pl = built.state
    // Framing ahead of the ball and in toward the axis, where the machines stand.
    const sOf = (t: number) => {
      const [x, y] = pl.ball(t)
      return RIM_R * (A_IN - Math.atan2(y - AX[1], x - AX[0]))
    }
    const lead = (t: number, ahead: number, inward: number): Pt => {
      const a = ang(sOf(t))
      return [Math.sin(a) * ahead - Math.cos(a) * inward, -Math.cos(a) * ahead - Math.sin(a) * inward]
    }
    const B = (k: number) => slot.begin + pl.b(k)
    const keys: PartShot[] = [
      { t: slot.begin, cells: 5.0, off: lead(0, 0.5, 0.5) },
      { t: B(116.8), cells: 5.3, hold: at(S_N + 0.15, 1.3), w: 0.75 },
      { t: B(119), cells: 5.4, hold: at(S_N + 1.35, 1.5), w: 0.7 },
      { t: B(121), cells: 5.1, hold: at(S_C + 0.35, 1.0), w: 0.7 },
      { t: B(122.6), cells: 4.9, hold: at(pl.tram0 + 0.6, 0.75), w: 0.6 },
      { t: B(123.6), cells: 5.0, off: lead(pl.b(123.6), 0.8, 0.55), w: 0 },
      { t: B(126.5), cells: 5.0, off: lead(pl.b(126.5), 0.8, 0.55), w: 0 },
      { t: B(127.8), cells: 4.3, off: lead(pl.b(127.8), 0.35, 0.95), w: 0 },
      { t: B(130.5), cells: 4.3, off: lead(pl.b(130.5), 0.35, 0.95), w: 0 },
      { t: slot.end, cells: 5.0, off: lead(pl.end, 0.5, 0.5), w: 0 },
    ]
    return keys
  },
)

/* ------------------------------------------------------------------ drawing */

const WATER = DUST.teal
/** The surface of water, catching the station's light. */
const SHEEN = '#CFE3DF'

function poly(p: p5, k: number, pts: Pt[], close = true): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  if (close) p.endShape(p.CLOSE)
  else p.endShape()
}

/** Everything of `poly` below the level `y` (y down), for water in a turning scoop. */
function clipBelow(pts: Pt[], y: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const ina = a[1] >= y
    const inb = b[1] >= y
    if (ina) out.push(a)
    if (ina !== inb) {
      const u = (y - a[1]) / (b[1] - a[1])
      out.push([a[0] + (b[0] - a[0]) * u, y])
    }
  }
  return out
}
function areaOf(pts: Pt[]): number {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(s) / 2
}
/** The water in a scoop: a level that keeps its share, and never stands over the lip of the mouth. */
function waterIn(P: Pose, fill: number): { pts: Pt[]; level: number } {
  const quad = [inPot(P, -POT_D / 2, -POT_W / 2), inPot(P, -POT_D / 2, POT_W / 2), inPot(P, POT_D / 2, POT_W / 2), inPot(P, POT_D / 2, -POT_W / 2)]
  const ys = quad.map((q) => q[1])
  let lo = Math.min(...ys)
  let hi = Math.max(...ys)
  const want = fill * POT_D * POT_W
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (areaOf(clipBelow(quad, mid)) > want) lo = mid
    else hi = mid
  }
  const lip = Math.max(quad[2][1], quad[3][1])
  const level = Math.max(lo, lip)
  if (level >= Math.max(...ys) - 0.01) return { pts: [], level }
  return { pts: clipBelow(quad, level), level }
}

/** Draw in a machine's own upright cells at arc `s0`. */
const standing = (p: p5, k: number, s0: number, fn: () => void) => standOnRim(p, k, AX, ang(s0), fn)

function drawRim(p: p5, s: Plan, c: Ctx): void {
  const t = c.t
  const kb = beatOf(t + s.begin)
  drawCorn(p, s, c, t)
  drawTrack(p, s, c)
  drawBins(p, s, c, t)
  drawLouvres(p, s, c, t)
  drawChannel(p, s, c, t)
  drawTram(p, s, c, t)
  drawNoria(p, s, c, t, kb)
}

function overRim(p: p5, s: Plan, c: Ctx): void {
  const t = c.t
  const kb = beatOf(t + s.begin)
  overNoria(p, s, c, t, kb)
  overChannel(p, s, c, t)
  overTram(p, s, c, t)
}

/* ---------------------------------------------------------------- the corn */

/** A row of the station's corn behind the line, swaying; each stalk leans after the tram as it goes by. */
function drawCorn(p: p5, s: Plan, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  for (const st of s.corn) {
    const since = t - st.pass
    const wake = since > 0 ? 0.28 * Math.exp(-since / 0.45) * Math.sin(Math.min(Math.PI / 2, since * 9)) - 0.05 * Math.exp(-since / 0.6) * Math.sin(since * 7) : 0
    standing(p, k, st.s, () => {
      stalk(p, k, ink, weight * 0.9, { x: 0, foot: 0, h: st.h, seed: st.seed, sway: 0.04 * Math.sin(t * 0.8 + st.s * 1.3) + wake, shake: since > 0 ? Math.exp(-since / 0.5) : 0, far: true })
    })
  }
}

/* ---------------------------------------------------------------- the track */

/** The tram's rail, from under the channel to the end of the line. */
function drawTrack(p: p5, s: Plan, c: Ctx): void {
  const { k, ink, weight } = c
  const a = s.tram0 - 1.1
  const b = s.tram1 + 1.0
  outline(p, ink, weight * 0.9)
  const rail: Pt[] = []
  for (let x = a; x <= b + 1e-9; x += 0.25) rail.push(at(x, 0.035))
  poly(p, k, rail, false)
  p.strokeWeight(weight * 0.55)
  for (let x = a + 0.1; x < b; x += 0.3) {
    const [x0, y0] = at(x, 0.012)
    const [x1, y1] = at(x + 0.12, 0.012)
    p.line(x0 * k, y0 * k, x1 * k, y1 * k)
  }
  // The end of the line: a short stop post beside the rail, its lamp lit while the tram is out.
  const out = smooth(c.t, s.b(123), s.b(123) + 0.1) * (1 - smooth(c.t, s.b(127), s.b(127) + 0.1))
  standing(p, k, b + 0.1, () => {
    solid(p, ink, weight * 0.8, DUST.wood)
    p.rect(0, -0.3 * k, 0.06 * k, 0.6 * k)
    solid(p, ink, weight * 0.7, out > 0.5 ? DUST.light : DUST.bone)
    p.circle(0, -0.62 * k, 0.12 * k)
  })
}

/* ---------------------------------------------------------------- the noria */

/** A scoop, as a bucket: rounded where it closes, straight sides, a rolled lip at the mouth. */
function scoopShape(P: Pose): Pt[] {
  const e = 0.05
  const hd = POT_D / 2
  const hw = POT_W / 2
  const r = 0.1
  const arc = (cu: number, cv: number, rr: number, a0: number, a1: number): Pt[] => {
    const pts: Pt[] = []
    for (let i = 0; i <= 5; i++) {
      const a = a0 + ((a1 - a0) * i) / 5
      pts.push(inPot(P, cu + Math.cos(a) * rr, cv + Math.sin(a) * rr))
    }
    return pts
  }
  return [
    // Outside: the lip, down one side, round the bottom, up the other side, the lip.
    inPot(P, hd + 0.03, -hw - e - 0.03),
    ...arc(-hd + r, -hw + r, r + e, -Math.PI / 2, -Math.PI),
    ...arc(-hd + r, hw - r, r + e, Math.PI, Math.PI / 2),
    inPot(P, hd + 0.03, hw + e + 0.03),
    // Inside, back the other way.
    inPot(P, hd, hw),
    ...arc(-hd + r, hw - r, r, Math.PI / 2, Math.PI),
    ...arc(-hd + r, -hw + r, r, Math.PI, Math.PI * 1.5),
    inPot(P, hd, -hw),
  ]
}
const scoopInside = (P: Pose): Pt[] => scoopShape(P).slice(14)

/** The sluice's paddle stands on the ground where the ball comes off the museum's plinth: it meets it on 116. */
const S_V = R + 0.035
/** Which way along a machine's own x the ball is going. */
const AHEAD = Math.sign(local(S_V, at(S_V + 0.3, 0))[0]) || 1

/** Knocked flat by the ball on 116 (a little bounce as it lands), the sluice under the ground opened with it. */
function drawSluice(p: p5, c: Ctx, kb: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  // The pipe, just under the ground, from the valve to the sump.
  const pts: Pt[] = []
  for (let i = 0; i <= 12; i++) pts.push(at(S_V + ((S_N - 0.28 - S_V) * i) / 12, -0.34))
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(X(0.09) + weight * 1.6)
  p.beginShape()
  for (const q of pts) p.vertex(X(q[0]), X(q[1]))
  p.endShape()
  p.stroke(DUST.tin)
  p.strokeWeight(X(0.09))
  p.beginShape()
  for (const q of pts) p.vertex(X(q[0]), X(q[1]))
  p.endShape()
  const hit = smooth(kb, 115.97, 116.13)
  const bounce = kb > 116.13 ? 0.12 * Math.exp(-(kb - 116.13) / 0.08) * Math.sin((kb - 116.13) * 40) : 0
  const lean = (Math.PI / 2 - 0.08) * hit - bounce
  standing(p, k, S_V, () => {
    // The valve box in the ground, its wheel turned by the paddle's shaft.
    solid(p, ink, weight * 0.8, DUST.tin)
    p.rect(0, X(0.2), X(0.2), X(0.24), X(0.02))
    solid(p, ink, weight * 0.7, DUST.rust)
    p.push()
    p.translate(0, X(0.2))
    p.rotate(lean * 1.5)
    p.circle(0, 0, X(0.13))
    p.line(X(-0.065), 0, X(0.065), 0)
    p.pop()
    // The paddle: a board on the shaft, standing in the ball's way until it is knocked down ahead of it.
    p.push()
    p.translate(0, X(0.06))
    p.rotate(AHEAD * lean)
    solid(p, ink, weight * 0.9, DUST.corn)
    p.rect(0, X(-0.2), X(0.06), X(0.34), X(0.015))
    solid(p, ink, weight * 0.6, DUST.bone)
    p.circle(0, 0, X(0.06))
    p.pop()
  })
}

function drawNoria(p: p5, s: Plan, c: Ctx, t: number, kb: number): void {
  const { k, ink, weight } = c
  const turns = turnsAt(kb)
  const X = (x: number) => x * k
  drawSluice(p, c, kb)
  // The flume, behind the wheel: from the top scoop's lip down to the first pool.
  const Ptop = potPose(2, 0)
  const f0 = up(S_N, ...inPot(Ptop, POT_D / 2, POT_W / 2))
  const f1 = up(S_C, POOLS[0].x0, POOLS[0].floor - 0.36)
  const d: Pt = [(f1[0] - f0[0]) / dist(f0, f1), (f1[1] - f0[1]) / dist(f0, f1)]
  let n: Pt = [-d[1], d[0]]
  if (n[0] * (AX[0] - f0[0]) + n[1] * (AX[1] - f0[1]) < 0) n = [d[1], -d[0]]
  const off = (q: Pt, by: number): Pt => [q[0] + n[0] * by, q[1] + n[1] * by]
  // Its prop, from the ground up under its lower end.
  const mid = mix(f0, f1, 0.8)
  const foot = at(S_N + FLUME_X * 0.8, 0)
  solid(p, ink, weight * 0.8, DUST.wood)
  p.push()
  p.translate(X(foot[0]), X(foot[1]))
  p.rotate(Math.atan2(mid[1] - foot[1], mid[0] - foot[0]))
  p.rect(X(dist(foot, mid) / 2), 0, X(dist(foot, mid)), X(0.07))
  p.pop()
  // The far wall, then the water running on the floor once the wheel turns, then the floor plank.
  p.noStroke()
  p.fill(DUST.shade)
  poly(p, k, [off(f0, 0), off(f1, 0), off(f1, 0.17), off(f0, 0.17)])
  const wet = smooth(kb, 117.95, 118.35)
  if (wet > 0) {
    p.fill(WATER)
    poly(p, k, [off(f0, 0), off(f1, 0), off(f1, 0.03 + 0.02 * wet), off(f0, 0.03 + 0.02 * wet)])
  }
  solid(p, ink, weight, DUST.wood)
  poly(p, k, [off(f0, -0.06), off(f1, -0.06), off(f1, 0), off(f0, 0)])
  outline(p, ink, weight * 0.8)
  p.line(X(off(f0, 0.17)[0]), X(off(f0, 0.17)[1]), X(off(f1, 0.17)[0]), X(off(f1, 0.17)[1]))

  standing(p, k, S_N, () => {
    // The sump under the wheel: a cut in the ground with water in it.
    p.noStroke()
    p.fill(DUST.shade)
    p.rect(X(0.08), X(0.2), X(0.72), X(0.4))
    // Low until the ball knocks the sluice's paddle on 116; then the pipe fills it, just in time for the scoop.
    const fill = 0.3 + 0.7 * smooth(kb, 116.05, 116.85)
    const top = 0.4 - 0.28 * fill
    p.fill(WATER)
    p.rect(X(0.08), X((top + 0.4) / 2), X(0.7), X(0.4 - top))
    p.stroke(SHEEN)
    p.strokeWeight(weight * 0.6)
    p.line(X(-0.24), X(top), X(0.4), X(top))
    // The pipe's mouth in the sump's near wall, and the water out of it while the sluice is open.
    const flow = smooth(kb, 116.02, 116.12) * (1 - smooth(kb, 116.75, 117.0))
    if (flow > 0.01) {
      p.noFill()
      p.stroke(alpha(p, WATER, 0.9 * flow))
      p.strokeWeight(Math.max(1.5, X(0.07) * flow))
      p.beginShape()
      for (let i = 0; i <= 8; i++) {
        const u = i / 8
        p.vertex(X(-0.24 + 0.34 * u), X(0.34 - 0.16 * Math.sin(Math.PI * u * 0.9) + 0.1 * u * u))
      }
      p.endShape()
    }
    solid(p, ink, weight * 0.7, DUST.tin)
    p.rect(X(-0.25), X(0.34), X(0.08), X(0.09))
    outline(p, ink, weight * 0.9)
    p.beginShape()
    p.vertex(X(-0.28), 0)
    p.vertex(X(-0.28), X(0.4))
    p.vertex(X(0.44), X(0.4))
    p.vertex(X(0.44), 0)
    p.endShape()

    // The frame: an A from the ground to the axle, a tie across it.
    solid(p, ink, weight, DUST.wood)
    for (const lx of [-0.95, 0.95]) {
      const ly = gy(lx)
      const dx = -lx
      const dy = -HN - ly
      const L = Math.hypot(dx, dy)
      p.push()
      p.translate(X(lx), X(ly))
      p.rotate(Math.atan2(dy, dx))
      p.rect(X(L / 2), 0, X(L), X(0.09))
      p.pop()
    }
    solid(p, ink, weight * 0.8, DUST.wood)
    p.rect(0, X(-0.5), X(1.25), X(0.06))

    // The wheel: two rims, eight spokes, four arms with their scoops; it turns as one.
    const base = (Math.PI / 2) * turns
    outline(p, ink, weight * 0.8)
    p.circle(0, X(-HN), X(2 * (RN - 0.25)))
    p.circle(0, X(-HN), X(2 * (RN - 0.33)))
    p.strokeWeight(weight * 0.6)
    for (let i = 0; i < 8; i++) {
      const a = base + (i * Math.PI) / 4 + Math.PI / 8
      p.line(X(Math.cos(a) * 0.32), X(-HN + Math.sin(a) * 0.32), X(Math.cos(a) * (RN - 0.29)), X(-HN + Math.sin(a) * (RN - 0.29)))
    }
    for (let j = 0; j < 4; j++) {
      const P = potPose(turns, j)
      const a = Math.atan2(P.c[1] + HN, P.c[0])
      solid(p, ink, weight * 0.9, DUST.wood)
      p.push()
      p.translate(0, X(-HN))
      p.rotate(a)
      p.rect(X((RN - 0.2) / 2 + 0.06), 0, X(RN - 0.2 - 0.02), X(0.08))
      p.pop()
      // The scoop: pale inside, so what it carries shows; tin walls round it.
      p.noStroke()
      p.fill(DUST.bone)
      poly(p, k, scoopInside(P))
      solid(p, ink, weight * 0.9, DUST.tin)
      poly(p, k, scoopShape(P))
    }

    // The Geneva drive at the hub: the star turns with the wheel; the driver's pin walks it a quarter a beat.
    const RS = 0.3
    solid(p, ink, weight * 0.9, DUST.bone)
    p.push()
    p.translate(0, X(-HN))
    p.rotate(base)
    p.beginShape()
    for (let i = 0; i < 4; i++) {
      const a0 = (i * Math.PI) / 2
      const cx = Math.cos(a0)
      const cy = Math.sin(a0)
      const nx = -cy
      const ny = cx
      const w = 0.12
      p.vertex(X(cx * RS - nx * w), X(cy * RS - ny * w))
      p.vertex(X(cx * RS - nx * 0.04), X(cy * RS - ny * 0.04))
      p.vertex(X(cx * 0.12 - nx * 0.04), X(cy * 0.12 - ny * 0.04))
      p.vertex(X(cx * 0.12 + nx * 0.04), X(cy * 0.12 + ny * 0.04))
      p.vertex(X(cx * RS + nx * 0.04), X(cy * RS + ny * 0.04))
      p.vertex(X(cx * RS + nx * w), X(cy * RS + ny * w))
      // The hollow the locking disc turns in, between this arm and the next.
      for (let j = 1; j < 7; j++) {
        const ang2 = a0 + Math.atan2(w, RS) + (j / 7) * (Math.PI / 2 - 2 * Math.atan2(w, RS))
        const r = RS * 1.02 - 0.11 * Math.sin((j / 7) * Math.PI)
        p.vertex(X(Math.cos(ang2) * r), X(Math.sin(ang2) * r))
      }
    }
    p.endShape(p.CLOSE)
    p.pop()
    // The driver below it, with its locking disc and pin.
    const dc: Pt = [RS, -HN + RS]
    const lineA = Math.atan2(-HN - dc[1], -dc[0])
    const pinA = lineA - driverAt(kb)
    solid(p, ink, weight * 0.8, DUST.tin)
    p.circle(X(dc[0]), X(dc[1]), X(0.3))
    const px = dc[0] + Math.cos(pinA) * RS
    const py = dc[1] + Math.sin(pinA) * RS
    outline(p, ink, weight * 1.1)
    p.line(X(dc[0]), X(dc[1]), X(px), X(py))
    solid(p, ink, weight * 0.7, DUST.rust)
    p.circle(X(px), X(py), X(0.075))
    solid(p, ink, weight * 0.8, DUST.bone)
    p.circle(0, X(-HN), X(0.12))

    // The clutch: a weighted lever by the sump. Up while the wheel waits; the scoop takes the ball's weight and it drops.
    const drop = smooth(kb, CLUTCH - 0.02, CLUTCH + 0.1)
    const la = -1.05 + 0.85 * drop
    const bounce = drop > 0.99 ? 0.06 * knock(t - s.b(CLUTCH) - 0.1, 0.1) : 0
    outline(p, ink, weight * 1.1)
    const lx = -0.62
    const tip: Pt = [lx - Math.cos(la - bounce) * 0.4, -0.02 + Math.sin(la - bounce) * 0.4]
    p.line(X(lx), X(-0.02), X(tip[0]), X(tip[1]))
    solid(p, ink, weight * 0.7, DUST.rust)
    p.circle(X(tip[0]), X(tip[1]), X(0.09))
    solid(p, ink, weight * 0.6, DUST.wood)
    p.rect(X(lx), X(-0.04), X(0.08), X(0.08))
  })
}

function overNoria(p: p5, s: Plan, c: Ctx, t: number, kb: number): void {
  const { k, weight } = c
  const turns = turnsAt(kb)
  standing(p, k, S_N, () => {
    // The water in each scoop, over whatever else is in it.
    for (let j = 0; j < 4; j++) {
      const P = potPose(turns, j)
      const w = waterIn(P, 0.4)
      if (w.pts.length < 3) continue
      p.noStroke()
      p.fill(alpha(p, WATER, 0.6))
      poly(p, k, w.pts)
      // The surface.
      const top = w.pts.filter((q) => Math.abs(q[1] - w.level) < 1e-6)
      if (top.length >= 2) {
        p.stroke(SHEEN)
        p.strokeWeight(weight * 0.6)
        p.line(k * top[0][0], k * top[0][1], k * top[top.length - 1][0], k * top[top.length - 1][1])
      }
    }
    // A pour off the top every beat the wheel turns: what the top scoop lets go, from its lip into the flume.
    if (kb > CLUTCH + 0.9) {
      const age = kb - Math.round(kb)
      if (age > -0.06 && age < 0.45) {
        const u = clamp01((age + 0.06) / 0.5)
        const lip = inPot(potPose(2, 0), POT_D / 2, POT_W / 2)
        const w = 0.06 * (1 - u) + 0.012
        p.noStroke()
        p.fill(alpha(p, WATER, 0.85 * (1 - u * u)))
        p.beginShape()
        for (let j = 0; j <= 6; j++) {
          const v = j / 6
          p.vertex(k * (lip[0] + 0.24 * v), k * (lip[1] - w + 0.1 * v * v))
        }
        for (let j = 6; j >= 0; j--) {
          const v = j / 6
          p.vertex(k * (lip[0] + 0.24 * v), k * (lip[1] + w * 0.4 + 0.1 * v * v))
        }
        p.endShape(p.CLOSE)
      }
    }
    // The splash on 117, as the ball goes into the scoop in the sump.
    const sp = t - s.b(117)
    if (sp > 0 && sp < 0.45) {
      const u = sp / 0.45
      const rest = inPot(potPose(0, 0), UO, VO)
      p.stroke(alpha(p, SHEEN, 1 - u))
      p.strokeWeight(weight * 0.9)
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.45
        const r0 = 0.17 + u * 0.22
        const r1 = r0 + 0.12 * (1 - u)
        p.line(k * (rest[0] + Math.cos(a) * r0), k * (rest[1] + Math.sin(a) * r0), k * (rest[0] + Math.cos(a) * r1), k * (rest[1] + Math.sin(a) * r1))
      }
    }
  })
}

/* ---------------------------------------------------------------- the channel */

function flapAngle(s: Plan, k: number, t: number): number {
  const at0 = s.b(120 + k) - 0.25
  if (t <= at0) return 0
  const u = (t - at0) / 0.25
  if (u < 1) return (Math.PI / 2) * u * u
  const since = t - s.b(120 + k)
  return Math.PI / 2 - 0.1 * Math.exp(-since / 0.07) * Math.abs(Math.sin(since * 38))
}

/** The level in pool k: full until its flap goes, then drained to a running skim. */
function levelOf(s: Plan, k: number, t: number): number {
  const full = surfaceOf(k)
  const run = POOLS[k].floor - 0.07
  const go = s.b(120 + k)
  let y = lerp(full, run, smooth(t, go - 0.2, go + 0.45))
  // The pool above pours in: a swell as it arrives.
  if (k > 0) {
    const a = t - (s.b(119 + k) + 0.1)
    if (a > 0) y -= 0.04 * Math.sin(Math.min(Math.PI, a * 5)) * Math.exp(-a / 0.5)
  }
  return y
}

/** Where the water ends at a pool's front: at its flap while the flap stands. */
const PLANK = 0.07

function drawChannel(p: p5, s: Plan, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  standing(p, k, S_C, () => {
    // Two trestles, behind what they carry.
    solid(p, ink, weight * 0.85, DUST.wood)
    const legs: [number, number][] = [
      [POOLS[0].x0 + 0.1, POOLS[0].floor],
      [POOLS[2].x0 + 0.12, POOLS[2].floor],
    ]
    for (const [lx, ly] of legs) {
      const g = gy(lx)
      p.rect(X(lx), X((ly + g) / 2), X(0.08), X(g - ly))
    }
    outline(p, ink, weight * 0.7)
    p.line(X(legs[0][0]), X(gy(legs[0][0]) - 0.35), X(POOLS[1].x0 + 0.1), X(POOLS[1].floor + PLANK))
    p.line(X(legs[1][0]), X(gy(legs[1][0]) - 0.3), X(legs[1][0] + 0.45), X(POOLS[2].floor + PLANK))
    // The water, standing in each pool.
    for (let i = 0; i < 3; i++) {
      const P = POOLS[i]
      const y = levelOf(s, i, t)
      p.noStroke()
      p.fill(WATER)
      p.rect(X((P.x0 + P.x1) / 2), X((y + P.floor) / 2), X(P.x1 - P.x0), X(P.floor - y))
    }
    // The trough: each pool's floor plank and back wall, the steps between.
    solid(p, ink, weight, DUST.wood)
    for (let i = 0; i < 3; i++) {
      const P = POOLS[i]
      const rim = P.floor - (FLAP_H + 0.02)
      p.rect(X((P.x0 + P.x1) / 2 - 0.02), X(P.floor + PLANK / 2), X(P.x1 - P.x0 + 0.04), X(PLANK))
      p.rect(X(P.x0 - 0.025), X((rim + P.floor + PLANK) / 2), X(0.05), X(P.floor + PLANK - rim))
    }
    // The flaps, hinged at each pool's lip: pale plates, a pin at the foot.
    for (let i = 0; i < 3; i++) {
      const P = POOLS[i]
      const a = flapAngle(s, i, t)
      p.push()
      p.translate(X(P.x1), X(P.floor))
      p.rotate(a)
      solid(p, ink, weight, DUST.bone)
      p.rect(X(FLAP_T / 2), X(-FLAP_H / 2), X(FLAP_T), X(FLAP_H))
      outline(p, ink, weight * 0.6)
      p.line(X(FLAP_T / 2), X(-FLAP_H + 0.06), X(FLAP_T / 2), X(-0.06))
      p.pop()
      solid(p, ink, weight * 0.7, DUST.rust)
      p.circle(X(P.x1 + FLAP_T / 2), X(P.floor), X(0.06))
    }
    // Over each fallen flap, the pool goes on down into the next (the last, off the spout).
    for (let i = 0; i < 3; i++) {
      const go = s.b(120 + i)
      const on = smooth(t, go - 0.2, go - 0.02)
      if (on <= 0) continue
      const surge = 1 + 1.4 * knock(t - go, 0.3)
      const w = 0.032 * surge * on
      const P = POOLS[i]
      const a = flapAngle(s, i, t)
      const x0 = P.x1 + (FLAP_H - 0.02) * Math.sin(a) + FLAP_T * Math.cos(a)
      const y0 = P.floor - (FLAP_H - 0.02) * Math.cos(a) - 0.02
      const yEnd = i < 2 ? levelOf(s, i + 1, t) : gy(x0 + 0.3) - 0.01
      const reach = 0.08 + 0.1 * surge
      p.noStroke()
      p.fill(WATER)
      p.beginShape()
      for (let j = 0; j <= 8; j++) {
        const u = j / 8
        p.vertex(X(x0 + reach * Math.sqrt(u) - w), X(y0 + (yEnd - y0) * u))
      }
      for (let j = 8; j >= 0; j--) {
        const u = j / 8
        p.vertex(X(x0 + reach * Math.sqrt(u) + w), X(y0 + (yEnd - y0) * u))
      }
      p.endShape(p.CLOSE)
      // Where it lands, a little white.
      const kick = knock(t - go - 0.1, 0.25)
      if (kick > 0.05) {
        p.stroke(alpha(p, SHEEN, kick))
        p.strokeWeight(weight * 0.8)
        const lx = x0 + reach
        for (let j = -1; j <= 1; j++) p.line(X(lx + j * 0.07), X(yEnd - 0.02), X(lx + j * 0.13), X(yEnd - 0.1 - 0.06 * (1 - kick)))
      }
    }
  })
}

function overChannel(p: p5, s: Plan, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  standing(p, k, S_C, () => {
    for (let i = 0; i < 3; i++) {
      const P = POOLS[i]
      const y = levelOf(s, i, t)
      // The water over the ball's lower half, and a bright line at the surface.
      p.noStroke()
      p.fill(alpha(p, WATER, 0.55))
      p.rect(X((P.x0 + P.x1) / 2 + 0.01), X((y + P.floor) / 2), X(P.x1 - P.x0 - 0.02), X(P.floor - y))
      p.stroke(SHEEN)
      p.strokeWeight(weight * 0.7)
      p.line(X(P.x0 + 0.03), X(y), X(P.x1 - 0.03), X(y))
      // The trough's near side, cut low so what floats in it shows.
      solid(p, ink, weight * 0.9, DUST.wood)
      p.rect(X((P.x0 + P.x1) / 2 - 0.02), X(P.floor - 0.035), X(P.x1 - P.x0 + 0.04), X(0.07))
    }
  })
}

/* ---------------------------------------------------------------- the tram */

/** How far the tray's gate has dropped, and how much corn is in the car (0..3). */
function trayGate(s: Plan, t: number): number {
  return smooth(t, s.b(127) - 0.02, s.b(127) + 0.1)
}
function cornIn(s: Plan, t: number): number {
  let n = 0
  for (let i = 0; i < 3; i++) n += smooth(t, s.b(124 + i), s.b(124 + i) + 0.3)
  return n
}

function tramPitch(s: Plan, t: number): number {
  // Squats back as it pulls away on 123, dips forward as it stops on 127, a shiver at each bin.
  let a = 0
  const go = t - s.b(123)
  if (go > 0) a -= 0.035 * Math.exp(-go / 0.35) * Math.sin(Math.min(Math.PI, go * 9))
  const st = t - s.b(127)
  if (st > -0.3) a += 0.045 * Math.exp(-Math.max(0, st) / 0.25) * (st < 0 ? (st + 0.3) / 0.3 : Math.cos(st * 14))
  for (let i = 0; i < 3; i++) {
    const g = t - s.b(124 + i)
    if (g > 0 && g < 0.6) a += 0.012 * Math.exp(-g / 0.12) * Math.sin(g * 40)
  }
  return a
}

function drawTram(p: p5, s: Plan, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const at0 = s.tram(t)
  const moved = at0 - s.tram0
  standing(p, k, at0, () => {
    // Wheels on the rail.
    for (const wx of WHEELS) {
      solid(p, ink, weight, ink)
      p.circle(X(wx), X(-WHEEL_R), X(2 * WHEEL_R))
      solid(p, ink, weight * 0.6, DUST.tin)
      p.circle(X(wx), X(-WHEEL_R), X(WHEEL_R))
      outline(p, ink, weight * 0.5)
      const a = moved / WHEEL_R
      p.line(X(wx), X(-WHEEL_R), X(wx + Math.cos(a) * WHEEL_R * 0.8), X(-WHEEL_R + Math.sin(a) * WHEEL_R * 0.8))
    }
    // The body rocks on its springs about the middle of the floor.
    p.push()
    p.translate(0, X(TRAM_FLOOR))
    p.rotate(tramPitch(s, t))
    p.translate(0, -X(TRAM_FLOOR))
    solid(p, ink, weight * 0.8, DUST.denim)
    p.rect(0, X(-0.2), X(1.2), X(0.07))
    // Body.
    solid(p, ink, weight, DUST.corn)
    p.rect(0, X((TRAM_FLOOR + TRAM_EAVE) / 2), X(2 * TRAM_L), X(TRAM_FLOOR - TRAM_EAVE), X(0.05))
    // The corn inside, behind the windows, higher a bin at a time.
    const n = cornIn(s, t)
    const wy0 = -0.36
    const wy1 = -0.62
    const panes = [-0.5, -0.17, 0.16]
    for (const px of panes) {
      solid(p, ink, weight * 0.7, DUST.sky)
      p.rect(X(px), X((wy0 + wy1) / 2), X(0.25), X(wy0 - wy1))
      if (n > 0.01) {
        const top = wy0 - (wy0 - wy1) * 0.3 * n
        p.noStroke()
        p.fill(DUST.husk)
        p.rect(X(px), X((wy0 + top) / 2), X(0.25 - weight / k), X(wy0 - top))
      }
    }
    // The driver's end: a tall window and the lamp.
    solid(p, ink, weight * 0.7, DUST.sky)
    p.rect(X(0.54), X((wy0 + wy1) / 2), X(0.2), X(wy0 - wy1))
    outline(p, ink, weight * 0.6)
    p.line(X(-TRAM_L), X(-0.3), X(TRAM_L), X(-0.3))
    // The roof.
    solid(p, ink, weight, DUST.tin)
    p.beginShape()
    p.vertex(X(-TRAM_L - 0.03), X(TRAM_EAVE))
    p.quadraticVertex(0, X(TRAM_ROOF - 0.06), X(TRAM_L + 0.03), X(TRAM_EAVE))
    p.endShape(p.CLOSE)
    // The roof hatch, open, and the trip bar that knocks the bins' gates.
    solid(p, ink, weight * 0.8, DUST.corn)
    p.rect(X(HATCH_X - 0.15), X(TRAM_ROOF - 0.03), X(0.04), X(0.1))
    outline(p, ink, weight * 1.1)
    p.line(X(0.3), X(TRAM_ROOF + 0.02), X(0.44), X(TRAM_ROOF - 0.1))
    // Headlamp, lit while it runs; bumpers.
    const lit = smooth(t, s.b(123) - 0.05, s.b(123) + 0.05) * (1 - smooth(t, s.b(127) + 0.4, s.b(127) + 1.2))
    solid(p, ink, weight * 0.8, lit > 0.5 ? DUST.light : DUST.bone)
    p.circle(X(TRAM_L + 0.01), X(-0.44), X(0.1))
    solid(p, ink, weight * 0.8, DUST.rust)
    p.rect(X(TRAM_L), X(-0.21), X(0.07), X(0.08))
    p.rect(X(-TRAM_L), X(-0.21), X(0.07), X(0.08))
    // The lifeguard tray: on its hinge at the bumper; its lip is a gate that drops at the end of the line.
    const g = trayGate(s, t)
    solid(p, ink, weight * 0.9, DUST.wood)
    const [hx, hy] = TRAY_HINGE
    p.beginShape()
    p.vertex(X(hx), X(hy))
    p.vertex(X(TRAY_LIP), X(-0.05))
    p.vertex(X(TRAY_LIP), X(-0.01))
    p.vertex(X(hx), X(hy + 0.05))
    p.endShape(p.CLOSE)
    p.push()
    p.translate(X(TRAY_LIP), X(-0.03))
    p.rotate((Math.PI / 2) * 0.9 * g)
    solid(p, ink, weight * 0.9, DUST.rust)
    p.rect(X(0.02), X(-0.09), X(0.045), X(0.18))
    p.pop()
    p.pop()
    // The bell, struck on 123 as it goes.
    const ring = knock(t - s.b(123), 0.25)
    if (ring > 0.05) {
      p.stroke(alpha(p, ink, ring))
      p.strokeWeight(weight * 0.7)
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 - 0.5 + i * 0.5
        const r0 = 0.12 + (1 - ring) * 0.15
        p.line(X(TRAM_L + 0.02 + Math.cos(a) * r0), X(TRAM_ROOF + Math.sin(a) * r0), X(TRAM_L + 0.02 + Math.cos(a) * (r0 + 0.08)), X(TRAM_ROOF + Math.sin(a) * (r0 + 0.08)))
      }
    }
  })
}

function overTram(p: p5, s: Plan, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  standing(p, k, s.tram(t), () => {
    p.push()
    p.translate(0, X(TRAM_FLOOR))
    p.rotate(tramPitch(s, t))
    p.translate(0, -X(TRAM_FLOOR))
    // The tray's near rail, low, so the ball rides in it.
    outline(p, ink, weight * 0.9)
    p.line(X(TRAY_HINGE[0]), X(-0.13), X(TRAY_LIP - 0.04), X(-0.1))
    p.pop()
  })
}

/* ---------------------------------------------------------------- the corn bins */

function drawBins(p: p5, s: Plan, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  for (let i = 0; i < 3; i++) {
    const s0 = s.bins[i]
    const go = s.b(124 + i)
    const open = smooth(t, go - 0.06, go) * (1 - smooth(t, go + 0.26, go + 0.34))
    const left = 1 - 0.35 * smooth(t, go, go + 0.3)
    standing(p, k, s0, () => {
      const top = -1.95
      const shoulder = -1.45
      const mouth = -1.18
      // Legs astride the track.
      solid(p, ink, weight * 0.8, DUST.wood)
      for (const lx of [-0.33, 0.33]) p.rect(X(lx), X((shoulder + gy(lx)) / 2), X(0.06), X(gy(lx) - shoulder))
      outline(p, ink, weight * 0.6)
      p.line(X(-0.33), X(-1.05), X(0.33), X(-1.05))
      // The hopper, with its corn, tapering to the chute.
      solid(p, ink, weight, DUST.bone)
      poly(p, k, [
        [-0.36, top],
        [0.36, top],
        [0.36, shoulder],
        [0.1, mouth],
        [-0.1, mouth],
        [-0.36, shoulder],
      ])
      const level = lerp(shoulder, top + 0.08, 0.75 * left)
      p.noStroke()
      p.fill(DUST.corn)
      poly(p, k, [
        [-0.34, level],
        [0.34, level],
        [0.34, shoulder + 0.01],
        [0.09, mouth + 0.02],
        [-0.09, mouth + 0.02],
        [-0.34, shoulder + 0.01],
      ])
      p.fill(alpha(p, ink, 0.2))
      for (let j = 0; j < 5; j++) p.circle(X(-0.26 + j * 0.13), X(level + 0.035), X(0.035))
      // The roof over it.
      solid(p, ink, weight * 0.9, DUST.rust)
      poly(p, k, [
        [-0.44, top],
        [0, top - 0.24],
        [0.44, top],
      ])
      // The gate under the chute, and its trip lever hanging where the tram's roof bar will knock it.
      p.push()
      p.translate(X(-0.1), X(mouth))
      p.rotate(-open * 1.1)
      solid(p, ink, weight * 0.9, DUST.tin)
      p.rect(X(0.1), X(0.02), X(0.22), X(0.045))
      p.pop()
      outline(p, ink, weight * 0.9)
      const la = 0.3 + open * 0.9
      const lt: Pt = [0.12 + Math.sin(la) * 0.26, mouth + 0.03 + Math.cos(la) * 0.26]
      p.line(X(0.12), X(mouth + 0.03), X(lt[0]), X(lt[1]))
      solid(p, ink, weight * 0.6, DUST.rust)
      p.circle(X(lt[0]), X(lt[1]), X(0.05))
      // The gush, into the hatch.
      if (open > 0.02) {
        const floorY = TRAM_ROOF + 0.02
        p.noStroke()
        p.fill(DUST.corn)
        const w = 0.13 * open
        poly(p, k, [
          [-w / 2, mouth + 0.02],
          [w / 2, mouth + 0.02],
          [w / 2 + 0.02, floorY],
          [-w / 2 - 0.02, floorY],
        ])
        p.fill(alpha(p, ink, 0.4))
        for (let j = 0; j < 7; j++) {
          const yy = mouth + ((t * 3.4 + j / 7) % 1) * (floorY - mouth)
          p.circle(X((hash(j, i) - 0.5) * 0.1 * open), X(yy), X(0.026))
        }
      }
    })
  }
}

/* ---------------------------------------------------------------- the louvres */

/** Each bay's shade: slats in section, turning about their middles on a tie bar. */
const SLATS = 7
const SLAT_W = 0.17

function slatAngle(s: Plan, i: number, t: number): number {
  const beat = s.b(128 + i)
  const t0 = beat - 0.2
  if (t <= t0) return 0
  if (t < beat) {
    const u = (t - t0) / 0.2
    // Nudged by the paddle to start, then the spring throws them over to their stop.
    return (Math.PI / 2) * (0.25 * u + 0.75 * u * u * u)
  }
  const since = t - beat
  return Math.PI / 2 - 0.12 * Math.exp(-since / 0.08) * Math.abs(Math.sin(since * 34))
}
/** The paddle hanging in the ball's way: turned by the ball's own push, then swung up clear. */
function paddleAngle(s: Plan, i: number, t: number): number {
  const beat = s.b(128 + i)
  const t0 = beat - 0.2
  if (t <= t0) return 0
  const L = SHADE_H - 0.14
  const u = Math.min(0.24, t - t0)
  return Math.min(1.2, (1.45 / L) * u + 14 * u * u)
}

function drawLouvres(p: p5, s: Plan, c: Ctx, t: number): void {
  const { k, ink, weight } = c
  const X = (x: number) => x * k
  const hs = s.hinges
  const last = hs[hs.length - 1] + PANEL
  const ctx = p.drawingContext as CanvasRenderingContext2D
  for (let i = 0; i < hs.length; i++) {
    const s0 = hs[i]
    const a = slatAngle(s, i, t)
    const open = smooth(a, 0.35, Math.PI / 2)
    standing(p, k, s0, () => {
      // Shade in a closed bay; the station's light straight down through an open one.
      p.noStroke()
      p.fill(alpha(p, DUST.shade, 0.55 * (1 - open)))
      p.rect(X(PANEL / 2), X(-SHADE_H / 2), X(PANEL), X(SHADE_H))
      if (open > 0) {
        // Down from the spindle, through the slats, onto the tray.
        const reach = 4.6
        const g = ctx.createLinearGradient(0, X(-reach), 0, 0)
        g.addColorStop(0, 'rgba(255, 244, 214, 0)')
        g.addColorStop(0.45, `rgba(255, 244, 214, ${0.38 * open})`)
        g.addColorStop(0.84, `rgba(255, 244, 214, ${0.62 * open})`)
        g.addColorStop(1, `rgba(255, 246, 220, ${0.9 * open})`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(X(0.06), 0)
        ctx.lineTo(X(PANEL - 0.02), 0)
        ctx.lineTo(X(PANEL + 0.18), X(-reach))
        ctx.lineTo(X(-0.14), X(-reach))
        ctx.closePath()
        ctx.fill()
      }
      // The seed tray along the bay's floor, and its seedlings: they droop in the shade and lift to the light.
      solid(p, ink, weight * 0.7, DUST.wood)
      p.rect(X(PANEL / 2), X(-0.035), X(PANEL - 0.08), X(0.07))
      const lift = open * smooth(t, s.b(128 + i), s.b(128 + i) + 1.1)
      for (let j = 0; j < 6; j++) {
        const x = 0.14 + j * ((PANEL - 0.28) / 5)
        const h = 0.07 + 0.13 * lift + 0.02 * hash(j, i, 3)
        outline(p, ink, weight * 0.6)
        p.line(X(x), X(-0.07), X(x), X(-0.07 - h))
        solid(p, ink, weight * 0.5, DUST.leaf)
        for (const side of [-1, 1]) {
          const droop = 0.95 * (1 - lift)
          const aa = side > 0 ? -0.55 + droop : Math.PI + 0.55 - droop
          const size = 1 + 0.45 * lift
          p.push()
          p.translate(X(x), X(-0.07 - h))
          p.rotate(aa)
          p.ellipse(X(0.05 * size), 0, X(0.1 * size), X(0.045 * size))
          p.pop()
        }
      }
      // The post at the bay's back.
      solid(p, ink, weight * 0.85, DUST.wood)
      p.rect(X(-0.03), X(-SHADE_H / 2 - 0.06), X(0.06), X(SHADE_H + 0.12))
      // The slats, in section, all turning together.
      for (let j = 0; j < SLATS; j++) {
        const cx = 0.14 + (j * (PANEL - 0.22)) / (SLATS - 1)
        p.push()
        p.translate(X(cx), X(-SHADE_H))
        p.rotate(-a)
        solid(p, ink, weight * 0.8, DUST.wood)
        p.rect(0, 0, X(SLAT_W), X(0.045))
        p.pop()
      }
      // The paddle, from the post into the ball's way.
      const pa = paddleAngle(s, i, t)
      const L = SHADE_H - 0.14
      p.push()
      p.translate(X(0.01), X(-SHADE_H + 0.05))
      p.rotate(-pa)
      outline(p, ink, weight * 0.9)
      p.line(0, 0, 0, X(L - 0.08))
      solid(p, ink, weight * 0.8, DUST.rust)
      p.rect(0, X(L - 0.06), X(0.07), X(0.13), X(0.02))
      p.pop()
    })
  }
  // The rail along the post tops, bay to bay, and the last post.
  outline(p, ink, weight * 0.75)
  for (let i = 0; i < hs.length; i++) {
    const a0 = at(hs[i], SHADE_H + 0.06)
    const a1 = at(i + 1 < hs.length ? hs[i + 1] : last, SHADE_H + 0.06)
    p.line(X(a0[0]), X(a0[1]), X(a1[0]), X(a1[1]))
  }
  standing(p, k, last, () => {
    solid(p, ink, weight * 0.85, DUST.wood)
    p.rect(0, X(-SHADE_H / 2 - 0.06), X(0.06), X(SHADE_H + 0.12))
  })
}

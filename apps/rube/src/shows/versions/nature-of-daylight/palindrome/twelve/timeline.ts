import { BEATS, nearestBeat } from '../music'

/**
 * The ring's clock: when each of the twelve screens goes over and comes back, when each link lets go and latches
 * again, and when the sat phone's keys are pressed. Pure time, no drawing; the ring, the phone and the two parts all
 * read it, so a screen lands where the lane says Louise is and where the music is.
 *
 * The ring is a clock face with Montana (0) at the bottom, just over Louise's head, and the others clockwise from it:
 * 1 at seven o'clock, 6 at the top, 11 at five o'clock. Link j joins screen j to screen j + 1; it is hinged at j + 1
 * and latched at j.
 *
 * The fall (the bass drops out): link 0 lets go of Montana, and the light drains out of it toward screen 1, which dies,
 * slips back a notch on each beat and goes over flat. As each screen lands it knocks the next link's latch: the light
 * drains along that link to the next screen, which dies and goes over in its turn, a beat each: clockwise up the left
 * side, over the top, down the right, until screen 11 lands beside Montana and knocks link 11 off, and only Montana is
 * lit. The rise (the call) is the fall played backwards: the call goes up the cable into Montana and link 11 swings up
 * lit and latches, kicking screen 11 up; each screen as it clicks home and lights lifts its link to the next, which
 * latches and kicks it; counter-clockwise back round the ring, the last hauled up notch by notch on the loudest beats,
 * and link 0 closes the ring at Montana on the loudest bar.
 */

const B = (t: number) => nearestBeat(t)

/** F[1..12]: at F[i] link i - 1 lets go and screen i is let go (i < 12); screen i lands at F[i + 1]. */
const F = [NaN, ...[200.626, 203.581, 204.568, 205.531, 206.466, 207.482, 208.451, 209.461, 210.448, 211.482, 212.503, 213.595].map(B)]
/** S[1..12]: at S[i] screen i clicks home (i < 12) and link i - 1 latches, kicking screen i - 1 up. S[12]: link 11 latches. */
const S = [NaN, ...[303.827, 300.025, 299.085, 298.156, 297.227, 296.304, 295.346, 294.441, 293.541, 292.502, 291.486, 289.524].map(B)]

/** The first to go slips back a notch on each beat before it goes over; the last to come back is hauled up a notch a beat. */
export const SLIPS: Record<number, number[]> = { 1: [201.625, 202.582].map(B) }
export const STEPS: Record<number, number[]> = { 11: [290.511].map(B), 1: [300.96, 301.842, 302.817].map(B) }

export const release = (i: number) => F[i]
export const land = (i: number) => F[i + 1]
export const kick = (i: number) => S[i + 1]
export const lock = (i: number) => S[i]
/** Link j lets go at F[j + 1] (knocked by screen j landing; link 0 by the world breaking) and latches at S[j + 1]. */
export const snap = (j: number) => F[j + 1]
export const latch = (j: number) => S[j + 1]

export const BREAK = F[1]
export const WHOLE = S[1]

/** How long the light takes to drain out along a link that has let go, from its latch to its hinge. */
export const WIPE = 0.3
/** How long a link takes to swing up into its latch, the light running along it as it comes. */
const LIFT = 0.42
/** How long the call (and each word after it) takes to go up the cable from the phone to Montana. */
export const CALL_UP = 0.42

/** The call: the phone wakes, ten keys, the call key; the call goes up the cable into Montana. */
export const WAKE = B(277.647)
export const PRESSES = [278.639, 279.661, 280.654, 281.612, 282.523, 283.458, 284.491, 285.495, 286.546, 287.556].map(B)
export const CALL_KEY = B(288.554)
/** The number Shang gave her, as keys of the phone's row (0..5), one a beat. */
export const NUMBER = [1, 4, 2, 2, 5, 0, 3, 3, 1, 4]
/** She speaks: from the call on, her voice goes up the cable on each beat to the ring. */
export const VOICE = [CALL_KEY, ...BEATS.filter((b) => b.t > CALL_KEY + 0.5 && b.t < 311).map((b) => b.t)]

/** The falls and rises, as the check reads them: the eleven screens in the order they went, and came back. */
export const FALLS: { screen: number; t: number }[] = Array.from({ length: 11 }, (_, n) => ({ screen: n + 1, t: release(n + 1) }))
export const RISES: { screen: number; t: number }[] = Array.from({ length: 11 }, (_, n) => ({ screen: 11 - n, t: lock(11 - n) }))

/** Every strike of the tent: each on a beat (the dark strikes all fourteen of its beats; the call every beat from the wake). */
export const DARK_HITS: number[] = [...F.slice(1), ...SLIPS[1]].sort((a, b) => a - b)
export const CALL_HITS: number[] = [WAKE, ...PRESSES, CALL_KEY, ...S.slice(1), ...STEPS[11], ...STEPS[1], ...VOICE.filter((v) => v > WHOLE)].sort((a, b) => a - b)

/* ------------------------------------------------------------------ motion */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * A screen falls back about its bottom hinge like a domino: θ from 0 (upright, face to us) to π/2 (lying flat on its
 * back on the stop behind it), under gravity: θ'' = K sin θ.
 */
const K = 16
const FLAT = Math.PI / 2

/** A fall from θ0 at speed w0 to flat, tabulated: `at(τ)` for τ in [0, T]. */
function fallFrom(th0: number, w0: number): { T: number; at: (tau: number) => number } {
  const N = 700
  const span = FLAT - th0
  const th: number[] = []
  const tau: number[] = []
  let acc = 0
  let prev = 0
  for (let n = 0; n <= N; n++) {
    const s = n / N
    const a = th0 + span * s * s
    const w = Math.sqrt(Math.max(1e-12, w0 * w0 + 2 * K * (Math.cos(th0) - Math.cos(a))))
    // dτ = dθ / ω, θ = th0 + span·s², so dτ = 2·span·s ds / ω: finite where it starts from rest.
    const f = s === 0 ? (w0 > 0 ? 0 : (2 * span) / Math.sqrt(2 * K * Math.sin(Math.max(1e-6, th0)) * span)) : (2 * span * s) / w
    if (n > 0) acc += ((prev + f) / 2) * (1 / N)
    prev = f
    th.push(a)
    tau.push(acc)
  }
  const T = acc
  const at = (x: number): number => {
    if (x <= 0) return th0
    if (x >= T) return FLAT
    let lo = 0
    let hi = N
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (tau[mid] <= x) lo = mid
      else hi = mid
    }
    const u = (x - tau[lo]) / Math.max(1e-12, tau[hi] - tau[lo])
    return th[lo] + (th[hi] - th[lo]) * u
  }
  return { T, at }
}

/** The fall from upright that takes exactly D: the kick it needs off its stop, found by halving. */
function fallFor(D: number): (tau: number) => number {
  let lo = 1e-5
  let hi = 60
  for (let n = 0; n < 60; n++) {
    const mid = Math.sqrt(lo * hi)
    if (fallFrom(0, mid).T > D) lo = mid
    else hi = mid
  }
  return fallFrom(0, Math.sqrt(lo * hi)).at
}

/** A settle after an impact: out past where it stopped and back, damped. */
const settle = (tau: number, amp: number, period = 0.2, decay = 0.12) => (tau < 0 ? 0 : amp * Math.exp(-tau / decay) * Math.abs(Math.sin((Math.PI * tau) / period)))

/** How long a ratchet step takes, from letting go of one notch to the next. */
const STEP = 0.2

interface Track {
  /** The panel's angle at show time t. */
  at: (t: number) => number
}

/** A notch as a height of the face (1 upright, 0 edge on), into an angle. */
const notch = (h: number) => Math.acos(Math.max(-1, Math.min(1, h)))

function track(i: number): Track {
  const r0 = release(i)
  const l0 = land(i)
  const k0 = kick(i)
  const c0 = lock(i)
  // The fall: straight over in a beat, or (the first) a notch a beat and then over.
  const slips = SLIPS[i] ?? []
  const slipTh = slips.map((_, n) => notch(1 - (0.34 * (n + 1)) / slips.length))
  let over: (tau: number) => number
  let overFrom: number
  if (slips.length) {
    const last = slipTh[slipTh.length - 1]
    const free = fallFrom(last, 0)
    over = free.at
    overFrom = l0 - free.T
  } else {
    over = fallFor(l0 - r0)
    overFrom = r0
  }
  // The rise: the fall backwards: kicked up off the stop behind, it slows into the stop in front (or, hauled
  // up a notch a beat, it swings up to the pawl and is pulled home from there).
  const steps = STEPS[i] ?? []
  const stepTh = steps.map((_, n) => notch(0.2 + (0.8 * (n + 1)) / (steps.length + 1)))
  let up: (tau: number) => number
  let upFor: number
  if (steps.length) {
    const caught = notch(0.2)
    const free = fallFrom(caught, 0)
    upFor = free.T
    up = (tau) => free.at(upFor - tau)
  } else {
    upFor = c0 - k0
    const f = fallFor(upFor)
    up = (tau) => f(upFor - tau)
  }
  const stepTo = (from: number, to: number, end: number, t: number) => {
    const u = clamp01((t - (end - STEP)) / STEP)
    return from + (to - from) * u * u
  }
  return {
    at: (t) => {
      if (t < r0) return 0
      if (t < l0) {
        // Let go: a shudder as its link drops, then the notches, then over.
        let th = settle(t - r0, 0.035, 0.16, 0.14)
        let from = 0
        for (let n = 0; n < slips.length; n++) {
          if (t >= slips[n] - STEP) th = stepTo(from, slipTh[n], slips[n], t) + settle(t - slips[n], 0.07, 0.18, 0.1)
          from = slipTh[n]
        }
        if (t >= overFrom) th = over(t - overFrom)
        return Math.min(FLAT, th)
      }
      if (t < k0) {
        // Landed flat on its stop: it bounces up off it, and settles.
        return FLAT - settle(t - l0, 0.32, 0.26, 0.17)
      }
      if (t < c0) {
        const tau = t - k0
        if (tau < upFor) return up(tau)
        let th = steps.length ? notch(0.2) : 0
        let from = th
        for (let n = 0; n < steps.length; n++) {
          if (t >= steps[n] - STEP) th = stepTo(from, stepTh[n], steps[n], t) - settle(t - steps[n], 0.06, 0.18, 0.1)
          from = stepTh[n]
        }
        if (steps.length && t >= c0 - STEP) th = stepTo(from, 0, c0, t)
        return Math.max(0, th)
      }
      // Home: it knocks against its stop and settles.
      return settle(t - c0, 0.05, 0.16, 0.1)
    },
  }
}

const TRACKS: (Track | null)[] = Array.from({ length: 12 }, (_, i) => (i === 0 ? null : track(i)))

/** Screen i's angle about its hinge at show time t: 0 upright, π/2 flat. Montana (0) never goes: it shudders and holds. */
export function panelAngle(i: number, t: number): number {
  if (i === 0) return settle(t - BREAK, 0.03, 0.2, 0.2) + settle(t - land(11), 0.05, 0.2, 0.2)
  return TRACKS[i]!.at(t)
}

/** How much of the drop a link has made: 0 in place, 1 hanging on its stop. */
export function linkDrop(j: number, t: number): number {
  const a = snap(j)
  const b = latch(j)
  if (t < a) return 0
  if (t < b) {
    const tau = t - a
    const fall = 0.24
    let v = tau < fall ? (tau / fall) ** 2 : 1 - settle(tau - fall, 0.22, 0.2, 0.12)
    // Lifted home: it rises into its latch, faster as it comes (the call lifts link 11 from the moment it reaches Montana).
    const lift = j === 11 ? b - CALL_UP - CALL_KEY : LIFT
    if (t > b - lift) {
      const u = (t - (b - lift)) / lift
      v = Math.min(v, 1 - u * u)
    }
    return Math.max(0, v)
  }
  return settle(t - b, 0.08, 0.14, 0.08)
}

/** A flicker as a light dies, or comes up: 1 to 0 (or 0 to 1) over `dur`, stuttering. */
function flicker(tau: number, dur: number, seed: number): number {
  const u = clamp01(tau / dur)
  const jit = Math.sin(seed * 12.9 + u * 37) * Math.sin(seed * 4.1 + u * 23)
  return clamp01(u + u * (1 - u) * 2.2 * jit)
}

/** How lit screen i's picture is: 1 on, 0 dark. Montana stays on, dipping as the world breaks round it. */
export function screenOn(i: number, t: number): number {
  if (i === 0) {
    const dip = (at: number) => (t >= at && t < at + 0.5 ? 0.35 * (1 - (t - at) / 0.5) * (0.6 + 0.4 * Math.sin((t - at) * 60)) : 0)
    return 1 - dip(BREAK) - dip(land(11))
  }
  // It dies as the dark coming along its link reaches it.
  const a = release(i) + WIPE * 0.7
  const b = lock(i)
  if (t < a) return 1
  if (t < b) return 1 - flicker(t - a, 0.3, i)
  return 1
}

/** The flash of a screen's picture coming on as it clicks home (and of every screen as the ring closes). */
export function screenFlash(i: number, t: number): number {
  // Montana flares as the call reaches it up the cable.
  const through = CALL_KEY + CALL_UP
  const home = i === 0 ? (t >= through ? 0.8 * Math.exp(-(t - through) / 0.35) : 0) : t >= lock(i) ? Math.exp(-(t - lock(i)) / 0.2) : 0
  return Math.min(1, home + 0.45 * closeFlare(t))
}

/** How bright link j's light is where it is lit: 1, and above 1 as it flares on latching and as the ring closes. */
export function linkLit(j: number, t: number): number {
  const b = latch(j)
  const tau = t - b
  const flare = tau < 0 ? 0 : Math.exp(-tau / 0.28)
  return 1 + 0.9 * flare + 1.3 * closeFlare(t)
}

/**
 * Which part of link j is lit, as shares of it from its latch end (0) to its hinge end (1), and where the moving edge
 * of the light is, if it is moving. Let go, the light drains out of it from the latch toward the hinge (toward the next
 * screen, which dies as the dark reaches it); lifted home, the light runs back along it from the hinge and reaches the
 * latch as it latches.
 */
export function linkSpan(j: number, t: number): { from: number; to: number; front: number | null } | null {
  const a = snap(j)
  const b = latch(j)
  if (t < a || t >= b) return { from: 0, to: 1, front: null }
  if (t < a + WIPE) {
    const u = (t - a) / WIPE
    return { from: u, to: 1, front: u }
  }
  const lift = j === 11 ? b - CALL_UP - CALL_KEY : LIFT
  if (t > b - lift) {
    const u = ((t - (b - lift)) / lift) ** 1.4
    return { from: 1 - u, to: 1, front: 1 - u }
  }
  return null
}

/** The flare of the ring closing on the loudest bar: 1 on it, dying away over a couple of seconds. */
export const closeFlare = (t: number): number => (t >= WHOLE ? Math.exp(-(t - WHOLE) / 1.1) : 0)

/** The lights going up the cable from the phone to Montana: each 0..1 of the way, and how bright (the call's the most). */
export function cablePulses(t: number): { u: number; a: number }[] {
  const out: { u: number; a: number }[] = []
  for (const at of VOICE) {
    const tau = t - at
    if (tau < 0 || tau > CALL_UP) continue
    out.push({ u: tau / CALL_UP, a: at === CALL_KEY ? 1 : 0.7 })
  }
  return out
}

/** How much the phone's display flares as she speaks: on each beat of the call. */
export function voiceFlash(t: number): number {
  let v = 0
  for (const at of VOICE) if (t >= at && t < at + 0.6) v = Math.max(v, Math.exp(-(t - at) / 0.18))
  return v
}

/** How lit the tent is: the share of its screens alight. */
export function roomLight(t: number): number {
  let v = 0
  for (let i = 0; i < 12; i++) v += screenOn(i, t)
  return v / 12
}

/**
 * The alarm lamp over the tent's door: the world about to go to war. It comes on red as the first link lets go and
 * pulses on every beat the links fall, burns steady red through the dialing and the relight, and goes out on the
 * loudest bar, when the ring is whole.
 */
export function alarm(t: number): number {
  if (t < BREAK) return 0
  if (t >= WHOLE) return Math.max(0, 1 - (t - WHOLE) / 0.25) * 0.75
  let last = -Infinity
  for (const at of DARK_HITS) if (at <= t) last = at
  const pulse = t - last < 1.2 ? Math.exp(-(t - last) / 0.28) : 0
  // Through the fall it pulses; after it (the call), it burns steady.
  return t < land(11) + 1.2 ? 0.45 + 0.55 * pulse : 0.75
}

/** Shang on the line: the first screen to come back, China's, lights red as it rises, then settles to its own picture. */
export const CHINA = 11
export function redCast(i: number, t: number): number {
  if (i !== CHINA) return 0
  const a = kick(i)
  const b = lock(i)
  if (t < a) return 0
  if (t < b) return Math.min(1, (t - a) / 0.35)
  return Math.max(0, 1 - (t - b) / 0.8)
}

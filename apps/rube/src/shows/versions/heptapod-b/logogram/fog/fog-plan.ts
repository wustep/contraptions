import type { Pt } from '../../../../../parts'
import { hardPulses, PULSES, SEAM } from '../music'
import {
  clamp01,
  flight,
  flightVel,
  g,
  integrate,
  kick,
  mono,
  onInk,
  onRing,
  Path,
  placeRing,
  ride,
  rideR,
  sstep,
  tangentAngle,
  type Mark,
  type Ring,
} from './fog-path'

/**
 * Beyond the glass: the plan. Four stretches of Louise among the heptapods' ink, between the three visions of the
 * lake house, all in the fog's own cells and show seconds.
 *
 *   fog1 130.409  At rest in the cup of Abbott's palm (the glass is gone). Costello's jet writes a ring beside her
 *                 (from its bottom, both ways round); the palm lets her go and she drops onto its end as it arrives
 *                 (133.573), and rocks in it, the ink's drag settling her, while it closes over her (136.499) and puts
 *                 out its tendrils a step on each swelling pulse. Out gliding right along its bottom at 0.9 (139.476).
 *   fog2 142.582  Gliding right in another ring: it whips round (142.582, 143.302) and flings her. Ring to ring, each
 *                 written where she will come down (its end meets her the moment she touches, tangent to her arc),
 *                 long slow arcs in the low gravity, each ring whipping her on and closing behind her; the last flings
 *                 her straight up (154.262) into a ring written round her from its top down, its arms surging on the
 *                 strong onsets and meeting beneath her (155.115); she stops at its top (156.177).
 *   fog3 160.015  At rest at the tip of a crescent of ink. Costello's limb pushes its tail round on three hard pulses
 *                 and it carries her once round, pinned by its turn, stopping firmly with her at its bottom (162.894).
 *   fog4 166.243  The push. The crescent whips her a quarter round and stops dead: she flies straight up and stops at
 *                 the top of her rise (168.136) where the great ring begins under her. It turns; she is its pen at
 *                 the bottom, Costello's limb its pen at the top: each writes half of it as it turns, her half with
 *                 a blot on every hard pulse. The halves meet on 183.182 and the ring puts out its tendrils; its
 *                 turn slows and she comes to rest in it.
 */

const TAU = Math.PI * 2
const T1 = SEAM.fog1
const T1E = SEAM.v1
const T2 = SEAM.fog2
const T2E = SEAM.v2
const T3 = SEAM.fog3
const T3E = SEAM.v3
const T4 = SEAM.fog4
const T4E = SEAM.after

const tanLen = (ring: Ring, a: number, t: number): number => {
  const e = 1e-3
  const p = onRing(ring, a - e, t)
  const q = onRing(ring, a + e, t)
  return Math.hypot(q[0] - p[0], q[1] - p[1]) / (2 * e)
}
const velOn = (ring: Ring, a: (t: number) => number, t: number): Pt => {
  const h = 1e-4
  const p = onRing(ring, a(t - h), t - h)
  const q = onRing(ring, a(t + h), t + h)
  return [(q[0] - p[0]) / (2 * h), (q[1] - p[1]) / (2 * h)]
}
/** The nearest angle to `near` that is `a` modulo a turn. */
const wrapNear = (a: number, near: number): number => a + TAU * Math.round((near - a) / TAU)

/** A ring not yet placed or timed: its identity and its turn. */
function blank(key: string, seed: number, r: number, spin: (t: number) => number, extra: Partial<Ring> = {}): Ring {
  return { key, seed, r, c: [0, 0], born: 0, closed: 1e9, whole: 1e9, lo: () => 0, hi: () => 0, spin, marks: [], taper: 0.45, depth: 1, light: 1, fade: 1e9, ...extra }
}
/** A slow turn, counter-clockwise on the screen, with a whip on each of `whips` (the pulses its turn quickens on). */
const turning = (base: number, whips: [number, number][] = []) => {
  const omega = (t: number) => -base - whips.reduce((s, [at, w]) => s + w * kick(t - at, 0.16), 0)
  return integrate(omega, 120, 200, 0)
}

/**
 * Time a ring's two ends round her ride: it begins at `born` at screen angle `start` and grows both ways; the end
 * she lands on reaches her at `tc` (and grows on behind her), the end she leaves by is where she leaves at `tx` (it
 * gets there early and waits for her); both then run on round to meet on `close`, at screen angle `meet`.
 */
function timeRing(ring: Ring, o: { born: number; start: number; tc: number; ac: number; tx: number; ax: number; close: number; meet: number; whole: number; early?: number }): Ring {
  const s = ring.spin
  const aS = o.start - s(o.born)
  const hiC = wrapNear(o.ac - s(o.tc), aS + 0.5)
  const loX = wrapNear(o.ax - s(o.tx), aS - 0.5)
  let hiM = wrapNear(o.meet - s(o.close), hiC + Math.PI)
  if (hiM < hiC + 0.3) hiM += TAU
  const loM = hiM - TAU
  const early = o.early ?? 0.12
  const lo = mono([[o.born, aS], [Math.min(o.tc, o.tx) - early, loX], [o.tx + 0.35, loX], [o.close, loM]])
  const hi = mono([[o.born, aS], [o.tc, hiC], [o.close, hiM]])
  return { ...ring, born: o.born, closed: o.close, whole: o.whole, lo, hi, fade: o.close + 12 }
}

export const PATH = new Path()
export const RINGS: Ring[] = []
/** Every strike the fog makes (show seconds). */
const hits: number[] = []

/* ================================================================== fog1: the palm, the first ring */

/** Where she is at the cut, in the fog's cells: the fog's origin. */
export const P0: Pt = [0, 0]
export const F1 = { spray: 132.226, born: 132.95, land: 133.573, close: 136.499, whole: 139.3, swell: [138.286, 138.762, 139.0, 139.244] }
const R1_SPIN = (t: number) => -0.07 * (t - F1.born)
const r1Blank = blank('R1', 71, 1.6, R1_SPIN, { by: { who: 'costello', limb: 1, t0: F1.spray } })

/** Where on the first ring's left side its inner edge is upright: where a straight drop meets it tangent. */
const R1_LAND = tangentAngle(r1Blank, [0, 1], F1.land)
function fog1Ride(h: number, d: number) {
  const ring = placeRing(r1Blank, [P0[0], P0[1] + h], R1_LAND, F1.land)
  const v0 = Math.sqrt(2 * g * h)
  const r = ride(ring, F1.land, T1E + 0.02, R1_LAND, -v0 / tanLen(ring, R1_LAND, F1.land), () => 0, d)
  return { ring, r }
}
/** The drop and the ink's drag: solved so that she passes the bottom going right at 0.9 exactly on the cut. */
export const FOG1 = (() => {
  // (Started from the answer, so it is confirmed in a step or two at load; it still finds its own if the ink changes.)
  let h = 0.258547
  let d = 0.412729
  // At the cut she is at the lowest point of the ink's actual edge (moving level), going right at 0.9.
  const bottom = tangentAngle(r1Blank, [1, 0], T1E)
  const err = (h: number, d: number): [number, number] => {
    const { ring, r } = fog1Ride(h, d)
    const a = r.a(T1E)
    return [a - bottom, -r.w(T1E) * tanLen(ring, a, T1E) - 0.9]
  }
  for (let it = 0; it < 40; it++) {
    const F = err(h, d)
    if (Math.abs(F[0]) < 1e-7 && Math.abs(F[1]) < 1e-7) break
    const e = 1e-5
    const Fh = err(h + e, d)
    const Fd = err(h, d + e)
    const J = [[(Fh[0] - F[0]) / e, (Fd[0] - F[0]) / e], [(Fh[1] - F[1]) / e, (Fd[1] - F[1]) / e]]
    const det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
    const sh = (J[1][1] * F[0] - J[0][1] * F[1]) / det
    const sd = (-J[1][0] * F[0] + J[0][0] * F[1]) / det
    const k = Math.min(1, 0.05 / Math.max(Math.abs(sh), Math.abs(sd)))
    h = Math.max(0.03, h - sh * k)
    d = Math.max(0, d - sd * k)
  }
  const { ring, r } = fog1Ride(h, d)
  return { h, d, release: F1.land - Math.sqrt((2 * h) / g), ring, r }
})()
{
  const ring = timeRing(FOG1.ring, {
    born: F1.born,
    start: Math.PI / 2,
    tc: F1.land,
    ac: Math.PI,
    tx: F1.land,
    ax: 0,
    close: F1.close,
    meet: -Math.PI / 2,
    whole: F1.whole,
    early: 0,
  })
  // Symmetric, the canonical way: its far end reaches the rightmost point as she lands on the leftmost.
  const aS = Math.PI / 2 - ring.spin(F1.born)
  const hiC = R1_LAND - ring.spin(F1.land)
  let hiM = wrapNear(-Math.PI / 2 - ring.spin(F1.close), hiC + Math.PI)
  if (hiM < hiC + 0.3) hiM += TAU
  ring.hi = mono([[F1.born, aS], [F1.land, hiC], [F1.close, hiM]])
  ring.lo = mono([[F1.born, aS], [F1.land, 2 * aS - hiC], [F1.close, hiM - TAU]])
  ring.fade = F1.close + 20
  // Closed over her, it puts out its tendrils: slowly at first, then a step on each pulse as the voices swell into
  // the cut (each quick in, easing out).
  ring.grow = (t: number) => {
    let f = 0.7 + 0.12 * sstep((t - F1.close) / 1.7)
    for (const at of F1.swell) f += 0.045 * (t <= at ? 0 : 1 - Math.pow(1 - clamp01((t - at) / 0.16), 3))
    return f
  }
  RINGS.push(ring)
  const { release, h } = FOG1
  PATH.add({ t0: T1, t1: release, at: () => P0, what: 'held' })
  PATH.add({ t0: release, t1: F1.land, at: flight(P0, [0, 0], release), what: 'fall' })
  const rr = FOG1.r
  PATH.add({ t0: F1.land, t1: T1E, at: (t) => onRing(ring, rr.a(t), t), what: 'ride', ring })
  void h
  hits.push(F1.land, F1.close, ...F1.swell)
}

/* ================================================================== fog2: ring to ring */

/** Where fog2 begins: her at the bottom of the ring she glides in, fog cells. */
export const E2: Pt = [9.5, -0.6]
/**
 * Each ring of fog2: when she comes down into it (`tc`), the pulses its turn whips on (`whips`), when she leaves it
 * (`tx`), the angle she leaves it at (degrees: 0 is its rightmost point, 90 its bottom), how much higher the next ring
 * catches her than this one lets her go (`climb`), when its first ink lands (`born`) and when it closes (`close`).
 */
export const F2 = [
  { key: 'R2', seed: 61, tc: T2, whips: [T2, 143.302], tx: 143.679, leave: 27, climb: 0.35, born: 139.9, close: 146.431, guess: [3.208033, 7.280508], turn: 0 },
  { key: 'R3', seed: 67, tc: 146.193, whips: [146.431], tx: 147.151, leave: 27, climb: 1.0, born: 145.223, close: 148.294, guess: [2.041178, 1.01769], turn: 1.74 },
  { key: 'R4', seed: 73, tc: 149.728, whips: [149.728], tx: 150.773, leave: 25, climb: 0.8, born: 147.859, close: 152.961, guess: [2.286952, 1.705343], turn: 0.79 },
  { key: 'R5', seed: 83, tc: 153.316, whips: [153.913], tx: 154.262, leave: 0, climb: 0, born: 151.859, close: 155.585, guess: [1.656268, 7.382691], turn: 1.79 },
]
export const FV = { born: 153.913, surge: [154.627, 154.877], close: 155.115, top: T2E }

interface Leg2 {
  ring: Ring
  a: (t: number) => number
  tc: number
  tx: number
  ac: number
  ax: number
  A: number
  px: Pt
  vx: Pt
}
export const FOG2 = (() => {
  const legs: Leg2[] = []
  // Her arrival at the next ring: where, how fast; for the first, the cut (the bottom, going right at 0.9).
  let arrive: { p: Pt; v: Pt } | null = null
  F2.forEach((s, i) => {
    const next = F2[i + 1]
    const T = next ? next.tc - s.tx : 0
    const last = !next
    const build = (r: number, A: number) => {
      // (Each is turned so that none of its own blots lies on the stretch she rides: she would be thrown by it.)
      const turn = turning(0.12, s.whips.map((w) => [w, A * 0.05] as [number, number]))
      const spin = (t: number) => turn(t) + s.turn
      let ring = blank(s.key, s.seed, r, spin)
      let ac = Math.PI / 2
      let w0: number
      if (arrive) {
        ac = tangentAngle(ring, arrive.v, s.tc)
        ring = placeRing(ring, arrive.p, ac, s.tc)
        w0 = -Math.hypot(arrive.v[0], arrive.v[1]) / tanLen(ring, ac, s.tc)
      } else {
        // Gliding level at the ink's lowest point on the cut.
        ac = tangentAngle(ring, [1, 0], s.tc)
        ring = placeRing(ring, E2, ac, s.tc)
        w0 = -0.9 / tanLen(ring, ac, s.tc)
      }
      const push = (t: number) => s.whips.reduce((sum, w) => sum + A * kick(t - w, 0.12), 0)
      const rr = ride(ring, s.tc, s.tx + 0.01, ac, w0, push)
      const vx = velOn(ring, rr.a, s.tx)
      return { ring, rr, ac, vx, ax: rr.a(s.tx) }
    }
    // Two things to meet, two things to choose: the ring's size and its whip. She leaves at the angle asked; and
    // the next ring catches her `climb` higher (or, for the last, she leaves it straight up, fast enough to stop at
    // the top of the ring written over her).
    const want = (s.leave * Math.PI) / 180
    const err = (r: number, A: number): [number, number] => {
      const b = build(r, A)
      // (The ink is not a circle: straight up is where its edge is upright, a little off its rightmost point.)
      if (last) return [b.vx[0], b.vx[1] + g * (FV.top - s.tx)]
      return [b.ax - want, b.vx[1] - (-s.climb - 0.5 * g * T * T) / T]
    }
    // (Started from the answer; see fog1's.)
    let [r, A] = s.guess
    for (let it = 0; it < 40; it++) {
      const F = err(r, A)
      if (Math.abs(F[0]) < 1e-8 && Math.abs(F[1]) < 1e-8) break
      const e = 1e-5
      const Fr = err(r + e, A)
      const Fa = err(r, A + e)
      const J = [[(Fr[0] - F[0]) / e, (Fa[0] - F[0]) / e], [(Fr[1] - F[1]) / e, (Fa[1] - F[1]) / e]]
      const det = J[0][0] * J[1][1] - J[0][1] * J[1][0]
      const sr = (J[1][1] * F[0] - J[0][1] * F[1]) / det
      const sa = (-J[1][0] * F[0] + J[0][0] * F[1]) / det
      const k = Math.min(1, 0.08 / Math.max(Math.abs(sr), Math.abs(sa) / 8))
      r = Math.max(1.5, Math.min(3.4, r - sr * k))
      A = Math.max(0, Math.min(40, A - sa * k))
    }
    const b = build(r, A)
    const px = onRing(b.ring, b.ax, s.tx)
    legs.push({ ring: b.ring, a: b.rr.a, tc: s.tc, tx: s.tx, ac: b.ac, ax: b.ax, A, px, vx: b.vx })
    if (next) arrive = { p: flight(px, b.vx, s.tx)(next.tc), v: flightVel(b.vx, s.tx, next.tc) }
  })
  return legs
})()
{
  FOG2.forEach((l, i) => {
    const s = F2[i]
    let ring: Ring
    if (i === 0) {
      // She came into the first before the cut (off the picture): it has been written round from its upper left, and
      // its end ahead of her already waits where she will leave it.
      const sp = l.ring.spin
      const behind = wrapNear(3.35 - sp(T2), 0)
      const loX = wrapNear(l.ax - sp(l.tx), behind - 1.5)
      let hiM = wrapNear(-Math.PI / 2 - 0.3 - sp(s.close), behind + 1.2)
      if (hiM < behind + 0.3) hiM += TAU
      ring = {
        ...l.ring,
        born: s.born,
        closed: s.close,
        whole: s.close + 2.5,
        fade: s.close + 12,
        hi: mono([[s.born, behind - 1.2], [T2 - 0.6, behind], [s.close, hiM]]),
        lo: mono([[s.born, behind - 1.2], [T2 - 0.1, loX], [l.tx + 0.35, loX], [s.close, hiM - TAU]]),
        by: { who: 'costello', limb: 1, t0: s.born - 0.7 },
      }
    } else {
      ring = timeRing({ ...l.ring, by: { who: 'costello', limb: [1, 2, 4, 5][i], t0: s.born - 0.7 } }, {
        born: s.born,
        start: (l.ac + l.ax) / 2,
        tc: l.tc,
        ac: l.ac,
        tx: l.tx,
        ax: l.ax,
        close: s.close,
        meet: -Math.PI / 2 - 0.3,
        whole: s.close + 2.4,
      })
      hits.push(s.born, l.tc)
    }
    RINGS.push(ring)
    PATH.add({ t0: l.tc, t1: l.tx, at: (t) => onRing(ring, l.a(t), t), what: 'ride', ring })
    const next = FOG2[i + 1]
    const t1 = next ? next.tc : FV.top
    PATH.add({ t0: l.tx, t1, at: flight(l.px, l.vx, l.tx), what: 'fly' })
    // (A ring's close counts as a strike only where it is in the picture: the others close behind her, off it.)
    hits.push(...s.whips)
    if (s.key === 'R3') hits.push(s.close)
  })
  // The toss: straight up into the ring written round her from its top down, to stop at its top.
  const last = FOG2[FOG2.length - 1]
  const apex = flight(last.px, last.vx, last.tx)(FV.top)
  let V = placeRing(blank('V', 89, 1.55, turning(0.05), { by: { who: 'costello', limb: 6, t0: FV.born - 0.75 } }), apex, -Math.PI / 2, FV.top)
  const aTop = -Math.PI / 2 - V.spin(FV.born)
  // Its arms run down from its top round her rise, surging on the two strong onsets, and meet under her on the third.
  const span = mono([[FV.born, 0], [154.5, 0.32 * Math.PI], [FV.surge[0] + 0.14, 0.6 * Math.PI], [FV.surge[1] + 0.12, 0.84 * Math.PI], [FV.close, Math.PI]])
  V = { ...V, born: FV.born, closed: FV.close, whole: FV.close + 1.4, fade: FV.close + 16, lo: (t) => aTop - span(t), hi: (t) => aTop + span(t) }
  RINGS.push(V)
  hits.push(FV.born, ...FV.surge, FV.close, FV.top)
}

/* ================================================================== fog3 and fog4: the crescent, and the great ring */

/** Where fog3 (and fog4) begin: her at rest at the bottom of the crescent, fog cells. */
export const E3: Pt = [49, 1.0]
export const F3 = { taps: [T3, 160.253, 160.496] as number[], settle: 162.894 }
export const F4 = { kick: T4, stop: 166.725, top: 168.136, closeW: 172.431, close: SEAM.after - 2.148, still: 184.9 }

/** The crescent's turn: at rest; once round on the three taps (fog3); a quarter round on the kick, stopping dead (fog4). */
const W_SPIN = (() => {
  // fog3: three pushes that build its turn, then a long slowing to rest: one whole turn, counter-clockwise.
  const shape3 = (t: number) => {
    const build = 0.35 * sstep((t - F3.taps[0]) / 0.1) + 0.3 * sstep((t - F3.taps[1]) / 0.1) + 0.35 * sstep((t - F3.taps[2]) / 0.1)
    // Slowing all the way round, and stopping firmly on 162.894 (the last of its turn goes out of it at once).
    const u = clamp01((t - (F3.taps[2] + 0.05)) / (F3.settle - F3.taps[2] - 0.05))
    const fall = (1 - sstep(u * 0.8) / sstep(0.8) * 0.55) * Math.sqrt(Math.max(0, 1 - u))
    return t < F3.taps[0] || t > F3.settle ? 0 : build * fall
  }
  const unit3 = integrate(shape3, F3.taps[0] - 0.01, F3.settle + 0.01)
  const k3 = TAU / unit3(F3.settle + 0.01)
  // fog4: a whip to speed at once and a little more, a quarter turn by the stop, then stopped dead.
  const up = g * (F4.top - F4.stop)
  return { k3, shape3, up }
})()
function wOmega(rho: number) {
  const { k3, shape3, up } = W_SPIN
  // Solve the whip's two terms (a step and a slope) for a quarter turn by the stop, at her rise's speed there.
  const T = F4.stop - F4.kick
  const tau = 0.07
  // ∫ step ≈ T - tau/2 ; ∫ slope = T²/2 ; end: W + B T = up / rho
  const I1 = T - tau / 2
  const I2 = (T * T) / 2
  const end = up / rho
  const B = (Math.PI / 2 - end * I1) / (I2 - T * I1)
  const W = end - B * T
  return (t: number): number => {
    if (t >= F3.taps[0] - 0.01 && t <= F3.settle + 0.01) return -k3 * shape3(t)
    if (t >= F4.kick && t <= F4.stop) return -(W * sstep((t - F4.kick) / tau) + B * (t - F4.kick))
    if (t > F4.stop && t < F4.stop + 0.12) return -end * (1 - sstep((t - F4.stop) / 0.1))
    return 0
  }
}
const W_R = 1.5
export const FOG34 = (() => {
  // Her place on the crescent (its own turn) is fixed: pinned by its turn, she goes round with it.
  const probe = blank('W', 330, W_R, () => 0)
  const rho = rideR(probe, Math.PI / 2, T3)
  const spin = integrate(wOmega(rho), 120, 200, 0, 1 / 960)
  const alpha0 = Math.PI / 2 - spin(T3)
  const W0 = placeRing(blank('W', 330, W_R, spin), E3, Math.PI / 2, T3)
  const onW = (t: number): Pt => onRing(W0, alpha0 + W0.spin(t), t)
  // Exactly where and how fast she leaves it (the rightmost point, straight up), from its own turn.
  const px = onW(F4.stop)
  const before = onW(F4.stop - 1e-4)
  const vx: Pt = [(px[0] - before[0]) / 1e-4, (px[1] - before[1]) / 1e-4]
  const rise = flight(px, vx, F4.stop)
  const apex = rise(F4.top)
  return { rho, alpha0, W0, onW, rise, apex, vx }
})()
{
  const { W0, alpha0, onW, rise } = FOG34
  // The crescent: written before (off the picture), from her place back round its left side; she sits at its tip.
  const L = 1.95
  const W: Ring = {
    ...W0,
    born: 157.2,
    closed: F4.closeW,
    whole: F4.closeW + 2.5,
    // It hangs under the great ring as that begins, then goes back into the white, so the great ring is written alone.
    fade: F4.closeW + 0.8,
    fadeFor: 3.5,
    lo: mono([[157.2, alpha0 + L - 0.3], [158.4, alpha0 - 0.1], [F4.stop + 0.3, alpha0 - 0.1], [F4.closeW, alpha0 + L - TAU]]),
    hi: mono([[157.2, alpha0 + L - 0.3], [158.4, alpha0 + L], [F4.stop + 0.3, alpha0 + L], [F4.closeW, alpha0 + L]]),
    by: { who: 'costello', limb: 2, t0: 156.5 },
  }
  RINGS.push(W)
  PATH.add({ t0: T3, t1: T3E, at: onW, what: 'carried', ring: W })
  PATH.add({ t0: T4, t1: F4.stop, at: onW, what: 'carried', ring: W })
  PATH.add({ t0: F4.stop, t1: F4.top, at: rise, what: 'fly' })
  hits.push(...F3.taps, F3.settle, F4.kick)
}

/* ------------------------------------------------------------------ the great ring */

/** The push's hard pulses: where she presses a blot into her half. */
export const PUSH_HITS = hardPulses(F4.top - 0.01, 183.7)
export const G_R = 4.2
/**
 * Her ride in the great ring as it turns (a ball in a turning drum, under G_LOW): the ink's grip carries her up its
 * rising wall at the turn's speed, as far as the grip will hold (its friction angle, `hold`, where she hangs while the
 * ring slides on under her); on the first hard pulse of each group the ink flicks her off (a push back down the wall,
 * as big as how high she is) and lets go, and she swings back down as a free pendulum, through the rest of the group
 * and on through the bottom, until the grip takes her again and carries her up once more. Three rides: a short one
 * into the first hard run, another, and the longest, up through the quiet middle to a hang, let go on 179.368 into a
 * long swing through the bottom and up the far side, settling at the bottom as the halves meet. Returns how far up the
 * wall she is (radians from the bottom).
 */
const RELEASES: [number, number][] = [
  [170.051, 0.9],
  [173.383, 0.9],
  [179.368, 1.9],
]
const FLICK = 0.35
const HOLD = mono([[168, 0.35], [170, 0.35], [172.3, 0.25], [173.3, 0.2], [174.2, 0.75], [179.37, 0.75], [179.5, 0], [186, 0]])
function drumRide(t0: number, omega: (t: number) => number, rho: number): (t: number) => number {
  const grip = (t: number) => {
    let gr = 1
    for (const [p, letGo] of RELEASES) {
      const s = t - p
      if (s < 0 || s > letGo + 0.7) continue
      const w = s < 0.05 ? s / 0.05 : s < letGo ? 1 : 1 - sstep((s - letGo) / 0.6)
      gr = Math.min(gr, 1 - 0.97 * w)
    }
    return 6 * gr
  }
  const dt = 1 / 960
  const n = Math.ceil((200 - t0) / dt)
  const tab = new Float64Array(n + 1)
  let phi = 0
  let v = 0
  for (let i = 0; i < n; i++) {
    const t = t0 + i * dt
    const Om = -omega(t)
    // Toward the ring's own speed while below the friction angle, braked to rest as she reaches it.
    const w = clamp01((HOLD(t) - phi) / 0.08)
    v += (-(g / rho) * Math.sin(phi) + grip(t) * (Om * w * w * (3 - 2 * w) - v)) * dt
    // The flick, on the pulse.
    for (const [p] of RELEASES) if (t < p && t + dt >= p) v -= FLICK * clamp01(phi / 0.3)
    phi += v * dt
    tab[i + 1] = phi
  }
  return (t: number) => {
    const f = Math.max(0, Math.min(n, (t - t0) / dt))
    const i = Math.min(n - 1, Math.floor(f))
    return tab[i] + (tab[i + 1] - tab[i]) * (f - i)
  }
}
export const GREAT = (() => {
  const t0 = F4.top
  const ramp = 0.45
  const slow = F4.still - F4.close
  // Its turn: from rest, easing up to a steady rate, so that it has turned exactly the half a turn (less her first
  // splash, and wherever she is on its wall then) by the close; then slowing to rest.
  const shape = (t: number) => (t < t0 ? 0 : t < F4.close ? sstep((t - t0) / ramp) : 1 - sstep((t - F4.close) / slow))
  const unit = integrate(shape, t0, F4.close)
  // Her first splash reaches a little way both sides of her; the rest is written by the turn and her slips, so the
  // halves meet on the close exactly.
  const SPLASH = [0.45, 0.3]
  const RHO = G_R - 0.33
  let rate = (Math.PI - SPLASH[0] - SPLASH[1]) / unit(F4.close)
  let ride = drumRide(t0, (t) => -rate * shape(t), RHO)
  for (let i = 0; i < 3; i++) {
    rate = (Math.PI - SPLASH[0] - SPLASH[1] + ride(F4.close)) / unit(F4.close)
    ride = drumRide(t0, (t) => -rate * shape(t), RHO)
  }
  const omega = (t: number) => -rate * shape(t)
  // Turned so that she begins on the thinnest stretch of its ink (seed 310, round its own angle 0.25), and so that
  // where she comes to rest, the join, is on a light one.
  const spin = integrate(omega, t0 - 1, 200, Math.PI / 2 - 0.253)
  const runs = (t: number) => 1 - Math.pow(1 - clamp01((t - t0) / 0.75), 2.5)
  const her = (t: number) => Math.PI / 2 - ride(t)
  // Where on the ring (its own turn) she is: while carried she keeps her place on it, while she slips she runs back
  // over it and the ink is laid under her; the written end is the furthest she has come.
  const ownRaw = (t: number) => her(t) - spin(t)
  const own = (() => {
    const dt = 1 / 240
    const n = Math.ceil((200 - t0) / dt)
    const tab = new Float64Array(n + 1)
    let m = ownRaw(t0)
    for (let i = 0; i <= n; i++) {
      m = Math.max(m, ownRaw(t0 + i * dt))
      tab[i] = m
    }
    return (t: number) => {
      if (t <= t0) return tab[0]
      const f = Math.min(n, (t - t0) / dt)
      const i = Math.min(n - 1, Math.floor(f))
      return tab[i] + (tab[i + 1] - tab[i]) * (f - i)
    }
  })()
  // Her blots, one pressed on every hard pulse, as big as the pulse is hard, so each reads as a press (and lifts her
  // a little as she rides over it): small while the ring is just begun (so its first arc reads as an arc), full in
  // the push, and small again at the join, where the ink is already twice laid.
  const marks: Mark[] = PUSH_HITS.map((at) => {
    const p = PULSES.find((q) => Math.abs(q.t - at) < 1e-6)
    const s = p ? p.g : 1
    const scale = (0.45 + 0.55 * sstep((at - t0) / 3.2)) * (at > 181.5 ? 0.45 : 1)
    return { a: ownRaw(at), size: (0.022 + 0.03 * clamp01((s - 0.8) / 0.5)) * scale, width: 0.055, at }
  })
  const probe = blank('G', 310, G_R, spin, { marks })
  const rho = rideR(probe, her(t0), t0)
  const c: Pt = [FOG34.apex[0] - Math.cos(her(t0)) * rho, FOG34.apex[1] - Math.sin(her(t0)) * rho]
  const ring: Ring = {
    ...probe,
    c,
    taper: 0.14,
    born: t0,
    closed: F4.close,
    whole: F4.close + 1.3,
    fade: 1e9,
    // Her first ink splashes a little way back under her as she comes down on it; then it runs from her pen.
    // Her first ink runs out along the ring's line both ways from under her as she comes down on it (fast, slowing),
    // a little further behind than ahead; from then on the turn writes it, the ink running just ahead of her.
    lo: (t) => own(t0) - SPLASH[0] * runs(t),
    hi: (t) => own(Math.min(t, F4.close)) + SPLASH[1] * runs(t),
  }
  return { ring, spin, her, own, rate, marks }
})()
{
  const { ring, her } = GREAT
  RINGS.push(ring)
  // Where she is on it: the bottom, a little up its rising side while it turns, riding its ink (her blots lift her).
  const at = (t: number) => onRing(ring, her(t), t)
  PATH.add({ t0: F4.top, t1: T4E, at, what: 'pen', ring })
  hits.push(...PUSH_HITS)
}

/** Her whole way through the fog, by show time (fog cells). */
export const herAt = (t: number): Pt => PATH.at(t)

/** Every strike of the four stretches. */
export const FOG_STRIKES: number[] = [...new Set(hits.map((t) => Math.round(t * 1000) / 1000))].sort((a, b) => a - b)

/** Where the great ring's second pen (Costello's) touches it at `t`: diametrically across from her. */
export function costelloNib(t: number): Pt {
  const { ring, her } = GREAT
  return onInk(ring, her(t) - Math.PI, t)
}

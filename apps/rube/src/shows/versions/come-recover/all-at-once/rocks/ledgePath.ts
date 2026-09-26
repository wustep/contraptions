import { R, type Pt, type Seg } from '../../../../../parts'
import { fall, JUMPS } from '../music'
import { G } from '../physics'

/**
 * The two rocks' ways down, and the canyon wall they come down, worked out together.
 *
 * Every landing is on a beat of the fall's comb. The wall is not drawn first and then fallen down: each ledge is
 * laid where the flight before it lands, at the angle the roll after it needs (a roll that gathers speed is on a
 * slope steep enough to give it that speed, one that loses it is on sand nearly flat), and each cliff drops from
 * the edge a rock rolls off to the ledge it lands on. So the landings are on the music by construction, and the
 * wall is exactly what the flights say it is.
 *
 * Joy goes first. Evelyn's way down to the bench is Joy's own, fourteen beats later (so each of Joy's landings far
 * below is heard up on the rim, and Evelyn answers it); on the bench they meet; and down the gorge Evelyn keeps one
 * beat behind her daughter, landing where she landed.
 */

/* ------------------------------------------------------------------ the clock (show seconds) */

export const BEGIN = JUMPS.rocks
export const END = JUMPS.brink
/** Three pebbles go off the lip, the last the biggest. */
export const PEBBLE_AT = [fall(2.5), fall(4.5), fall(8.5)]
/** Joy rocks, and again, leans out over the edge, and goes. */
export const ROCK_AT = [fall(18.5), fall(20.5)]
export const LEAN = fall(24.5)
export const OVER = fall(34.5)
/** Evelyn rolls out to where Joy was, flinches back from the edge, and goes after her. */
export const E_LEAN = fall(36.5)
export const E_BALK = fall(40.5)
export const E_GO = fall(48.5)
/** Evelyn's way down is Joy's, this much later: fourteen beats. */
export const LAG = E_GO - OVER
/** Down on the bench, Evelyn comes to rest against Joy; Joy goes on, and Evelyn goes with her. */
export const MEET = fall(66)
/** How fast she is still rolling when she touches her, and how far Joy gives. */
const TOUCH_SPEED = 0.2
const TOUCH = 0.022
export const ON = fall(69)
/** Their colour starts coming back when they meet, and is all back by here. */
export const RECOVER = [MEET, fall(86)] as const

/* ------------------------------------------------------------------ the rim */

/** The rim's lip (the corner the rocks go over), and where each sits. */
export const LIP = 0.32
export const TOP = R
export const BRINK = LIP - 0.028
/** The rim is a slab of caprock jutting out over the drop: how thick it is, and how far in under it the cliff goes. */
export const SLAB = 0.9
/** How far Evelyn rolls back from the edge when she balks. */
export const BALK = 0.2
export const SLAB_BACK = 1.25
export const JOY_SEAT = -0.16
/**
 * Joy's teeter: on each of her two notes she tips forward on the front edge of her flat underside, falls back onto
 * it, tips back a little on its back edge, and settles, a heavy stone rocking. How far she is tipped at `t`
 * (radians, forward positive), and where that puts her centre. Her stone is drawn at this tilt.
 */
const TEETER_EDGE = 0.5 * R
const TEETER_END = ROCK_AT[1] + 1.5
export function joyTilt(t: number): number {
  if (t <= ROCK_AT[0] || t >= TEETER_END) return 0
  const one = (s: number, amp: number) => (s <= 0 ? 0 : amp * Math.exp(-s / 0.36) * Math.sin((2 * Math.PI * s) / 0.6))
  const fade = t > TEETER_END - 0.3 ? (TEETER_END - t) / 0.3 : 1
  const phi = (one(t - ROCK_AT[0], 0.5) + one(t - ROCK_AT[1], 0.76)) * fade
  // Back onto her face and a little past it: she rebounds less than she tipped.
  return phi < 0 ? phi * 0.5 : phi
}
/** The centre of a stone at rest at (x0, 0) tipped by `phi` about the edge of its underside it is tipping onto. */
export function tipped(x0: number, phi: number): Pt {
  const side = phi >= 0 ? 1 : -1
  const a = Math.abs(phi)
  return [x0 + side * (TEETER_EDGE * (1 - Math.cos(a)) + R * Math.sin(a)), TOP - TEETER_EDGE * Math.sin(a) - R * Math.cos(a)]
}
export const EVELYN_SEAT = -0.5

/** The dark ring in the sand: its hole's radius and its outer radius (on the ground), and how high its rim stands. */
export const RI = 0.62
export const RO = 1.28
export const RIM = 0.13
/** How much the ring's round is squashed: it lies on the sand and the camera looks a little down on it. */
export const Q = 0.3
/** How Evelyn is falling as she goes in, on the jump (SEAMS.brink). */
export const SEAM_V: Pt = [0.4, 3.0]

/* ------------------------------------------------------------------ pieces of a way */

export type Piece =
  | { kind: 'rest'; t0: number; t1: number; p: Pt }
  | { kind: 'ramp'; t0: number; t1: number; a: Pt; b: Pt; v0: number; v1: number }
  | { kind: 'fly'; t0: number; t1: number; a: Pt; b: Pt; arc: number }
  | { kind: 'fn'; t0: number; t1: number; f: (t: number) => Pt; n: number }

const lerp = (a: number, b: number, u: number) => a + (b - a) * u

export function pieceAt(q: Piece, t: number): Pt {
  const T = q.t1 - q.t0
  const raw = T <= 0 ? 1 : Math.max(0, Math.min(1, (t - q.t0) / T))
  switch (q.kind) {
    case 'rest':
      return q.p
    case 'ramp': {
      const s = (raw * (2 * q.v0 + (q.v1 - q.v0) * raw)) / (q.v0 + q.v1)
      return [lerp(q.a[0], q.b[0], s), lerp(q.a[1], q.b[1], s)]
    }
    case 'fly':
      return [lerp(q.a[0], q.b[0], raw), lerp(q.a[1], q.b[1], raw) - q.arc * 4 * raw * (1 - raw)]
    case 'fn':
      return q.f(Math.max(q.t0, Math.min(q.t1, t)))
  }
}

/** Where a way is at `t`: held at its ends outside it. */
export function wayAt(way: Piece[], t: number): Pt {
  if (t <= way[0].t0) return pieceAt(way[0], way[0].t0)
  let lo = 0
  let hi = way.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (way[mid].t0 <= t) lo = mid
    else hi = mid - 1
  }
  return pieceAt(way[lo], t)
}

/** A way's velocity at `t` (cells a second), from its piece's own clock. */
export function wayVel(way: Piece[], t: number): Pt {
  const h = 1e-4
  const a = wayAt(way, t - h)
  const b = wayAt(way, t + h)
  return [(b[0] - a[0]) / (2 * h), (b[1] - a[1]) / (2 * h)]
}

/** The same pieces, `dt` later. */
export function shifted(way: Piece[], dt: number): Piece[] {
  return way.map((q) => (q.kind === 'fn' ? { ...q, t0: q.t0 + dt, t1: q.t1 + dt, f: (t: number) => q.f(t - dt) } : { ...q, t0: q.t0 + dt, t1: q.t1 + dt }))
}

/** A way as lane segments, from `begin` (show time) on. */
export function segsOf(way: Piece[]): Seg[] {
  const out: Seg[] = []
  for (const q of way) {
    const dur = q.t1 - q.t0
    if (dur <= 0) continue
    if (q.kind === 'rest') out.push({ from: q.p, to: q.p, dur })
    else if (q.kind === 'ramp') out.push({ from: q.a, to: q.b, dur, ramp: [q.v0, q.v1] })
    else if (q.kind === 'fly') out.push({ from: q.a, to: q.b, dur, arc: q.arc })
    else {
      for (let i = 0; i < q.n; i++) {
        const s0 = q.t0 + (dur * i) / q.n
        const s1 = q.t0 + (dur * (i + 1)) / q.n
        out.push({ from: q.f(s0), to: q.f(s1), dur: s1 - s0 })
      }
    }
  }
  return out
}

/* ------------------------------------------------------------------ the wall */

/**
 * A ledge: a straight piece of ground, from `a` to `b` (the ground itself, not the ball's centre), and whether the
 * sand lies on it. A rock on it has its centre R off the ground along the normal.
 */
export interface Ledge {
  a: Pt
  b: Pt
  sand?: boolean
}

/** The ground's height under `x` on a ledge's line. */
export const groundAt = (l: Ledge, x: number): number => l.a[1] + ((x - l.a[0]) * (l.b[1] - l.a[1])) / (l.b[0] - l.a[0])

/* ------------------------------------------------------------------ a rock going over an edge */

/**
 * A rock rolling over a square corner at `speed`: it turns about the corner until the ground can no longer hold it
 * (R·ω² = g·cos θ), and leaves. What it does in that turn, worked out once.
 */
function overTheCorner(corner: Pt, speed: number): { T: number; at: (tau: number) => Pt; p: Pt; v: Pt } {
  const k = ((5 / 7) * G) / R
  let th = 0
  let w = speed / R
  const dt = 0.0005
  const samples: number[] = [0]
  let tau = 0
  while (R * w * w < G * Math.cos(th) && tau < 2) {
    w += k * Math.sin(th) * dt
    th += w * dt
    tau += dt
    samples.push(th)
  }
  const pos = (a: number): Pt => [corner[0] + R * Math.sin(a), corner[1] - R * Math.cos(a)]
  const at = (s: number): Pt => {
    const i = Math.max(0, Math.min(samples.length - 1, s / dt))
    const j = Math.floor(i)
    const a = samples[Math.min(samples.length - 1, j)] + (samples[Math.min(samples.length - 1, j + 1)] - samples[Math.min(samples.length - 1, j)]) * (i - j)
    return pos(a)
  }
  return { T: tau, at, p: pos(th), v: [R * w * Math.cos(th), R * w * Math.sin(th)] }
}

/* ------------------------------------------------------------------ a way, walked */

class Walker {
  way: Piece[] = []
  constructor(
    public t: number,
    public p: Pt,
  ) {}
  /** Where the last piece left the rock moving. */
  v: Pt = [0, 0]
  rest(until: number): this {
    if (until > this.t + 1e-9) this.way.push({ kind: 'rest', t0: this.t, t1: until, p: this.p })
    this.t = Math.max(this.t, until)
    this.v = [0, 0]
    return this
  }
  ramp(to: Pt, t1: number, v0: number, v1: number): this {
    this.way.push({ kind: 'ramp', t0: this.t, t1, a: this.p, b: to, v0, v1 })
    const d = Math.hypot(to[0] - this.p[0], to[1] - this.p[1]) || 1
    this.v = [((to[0] - this.p[0]) / d) * v1, ((to[1] - this.p[1]) / d) * v1]
    this.p = to
    this.t = t1
    return this
  }
  fn(f: (t: number) => Pt, t1: number, n: number): this {
    this.way.push({ kind: 'fn', t0: this.t, t1, f, n })
    const h = 1e-4
    const a = f(t1 - h)
    const b = f(t1)
    this.v = [(b[0] - a[0]) / h, (b[1] - a[1]) / h]
    this.p = b
    this.t = t1
    return this
  }
  /** Carry on as thrown, under gravity, until `t1`. */
  flyOn(t1: number): this {
    const T = t1 - this.t
    const [vx, vy] = this.v
    const to: Pt = [this.p[0] + vx * T, this.p[1] + vy * T + 0.5 * G * T * T]
    this.way.push({ kind: 'fly', t0: this.t, t1, a: this.p, b: to, arc: (G * T * T) / 8 })
    this.v = [vx, vy + G * T]
    this.p = to
    this.t = t1
    return this
  }
  /** A bound from here to `to`, landing at `t1`. */
  hop(to: Pt, t1: number): this {
    const T = t1 - this.t
    this.way.push({ kind: 'fly', t0: this.t, t1, a: this.p, b: to, arc: (G * T * T) / 8 })
    this.v = [(to[0] - this.p[0]) / T, (to[1] - this.p[1]) / T + (G * T) / 2]
    this.p = to
    this.t = t1
    return this
  }
}

/* ------------------------------------------------------------------ the plan */

export interface Plan {
  joy: Piece[]
  evelyn: Piece[]
  /** The near wall, left to right: the rim, each ledge, the gorge, the floor. */
  ledges: Ledge[]
  /** The canyon's floor, and the dark ring lying in it: its centre on the sand, its radii, and its rim's top. */
  floor: number
  ring: { x: number; top: number }
  /** Every landing of each, show seconds, and where. */
  landings: { t: number; p: Pt; who: 'joy' | 'evelyn'; hard: number }[]
}

/** Sand's drag on a rolling rock, cells a second a second. */
const DRAG = 0.5
/** What slope a roll that goes from speed u0 to u1 in time T needs (radians, down to the right). */
const slopeFor = (u0: number, u1: number, T: number, drag = DRAG): number => Math.asin(Math.max(-0.9, Math.min(0.9, ((u1 - u0) / T + drag) / ((5 / 7) * G))))

export function plan(): Plan {
  const ledges: Ledge[] = []
  const landings: Plan['landings'] = []
  /** Lay a ledge through the ground under a rock whose centre is at `c`, at angle `a`, from `x0` to `x1` (ground x). */
  const lay = (c: Pt, a: number, x0: number, x1: number, sand = false): Ledge => {
    const g: Pt = [c[0] - R * Math.sin(a), c[1] + R * Math.cos(a)]
    // Its foot is under the edge of the ledge before, a little undercut, so the cliff between drops clear of the flight.
    const prev = ledges[ledges.length - 1]
    if (prev) x0 = Math.min(x0, prev.b[0] - 0.08 - 0.1 * ((ledges.length * 0.37) % 1))
    const t = Math.tan(a)
    const l: Ledge = { a: [x0, g[1] + (x0 - g[0]) * t], b: [x1, g[1] + (x1 - g[0]) * t], sand }
    ledges.push(l)
    return l
  }

  // The rim: the plateau, flat to the lip.
  const rim: Ledge = { a: [-80, TOP], b: [LIP, TOP] }
  ledges.push(rim)

  /* ---- Joy, on the rim */
  const J = new Walker(BEGIN, [JOY_SEAT, 0])
  // She teeters, twice: tipped forward on the front edge of her underside, back onto it, a little back, settling.
  {
    const x0 = J.p[0]
    J.rest(ROCK_AT[0])
    J.fn((t) => tipped(x0, joyTilt(t)), TEETER_END, 110)
    J.p = [x0, 0]
  }
  // She leans: out to the brink, over-running it a hair, and back onto it.
  J.rest(LEAN)
  {
    const x0 = J.p[0]
    const d = BRINK - x0
    const T = 1.1
    J.fn((t) => {
      const s = (t - LEAN) / T
      // An ease that leaves fast and settles with a small overshoot.
      const u = 1 - Math.exp(-5.2 * s) * (1 + 5.2 * s * 0.35) * Math.cos(2.4 * s)
      return [x0 + d * Math.min(1.012, u + (1 - u) * s * s * s), 0]
    }, LEAN + T, 50)
    J.p = [BRINK, 0]
  }
  // Over: from the brink, a slow roll to the corner, the turn about it, and off on the strongest note.
  const GO_SPEED = 0.36
  const corner: Pt = [LIP, TOP]
  const turn = overTheCorner(corner, GO_SPEED)
  const toCorner = (2 * (LIP - BRINK)) / GO_SPEED
  const goFrom = OVER - turn.T - toCorner
  J.rest(goFrom)
  J.ramp([LIP, 0], goFrom + toCorner, 0, GO_SPEED)
  const turnStart = J.t
  const turnFrom = J.way.length
  J.fn((t) => turn.at(t - turnStart), OVER, 16)
  J.v = turn.v

  /* ---- the upper wall: cliff, talus, cliff, ledge, step, ledge, the long drop */
  const hard = (w: Walker) => Math.hypot(w.v[0], w.v[1])
  const land = (w: Walker, who: 'joy' | 'evelyn') => landings.push({ t: w.t, p: w.p, who, hard: hard(w) })

  // Down the rim's cliff to the first talus.
  J.flyOn(fall(36.5))
  land(J, 'joy')
  /**
   * Land on a new ledge, roll down it, and go off its edge to land at `next` after `fly` seconds in the air. The ledge
   * is laid through the landing at the slope the roll needs.
   */
  const rollOff = (w: Walker, u0: number, uEdge: number, fly: number, next: number, back: number, sand = false, drag = DRAG) => {
    const tEdge = next - fly
    const T = tEdge - w.t
    const a = slopeFor(u0, uEdge, T, drag)
    const d = ((u0 + uEdge) / 2) * T
    const c = w.p
    const l = lay(c, a, c[0] - back, c[0] + d * Math.cos(a) - R * Math.sin(a), sand)
    const e: Pt = [c[0] + d * Math.cos(a), c[1] + d * Math.sin(a)]
    w.ramp(e, tEdge, u0, uEdge)
    w.flyOn(next)
    return l
  }
  // The first talus, steep: down it and off the second cliff.
  rollOff(J, 0.9, 2.45, 0.62, fall(40.5), 2.0)
  land(J, 'joy')
  // A ledge, nearly flat: along it and off a step.
  rollOff(J, 1.6, 1.9, 0.42, fall(43.5), 0.25)
  land(J, 'joy')
  // The last ledge above the drop, then the long way down to the bench.
  rollOff(J, 1.4, 1.55, 1.02, fall(50), 0.3)
  land(J, 'joy')
  const bench = J.p
  const wayDownTo = J.way.length

  /* ---- the bench: Joy rolls to rest, and waits */
  const JOY_REST = bench[0] + 0.8
  // Their stones are bigger than the balls under them: she stops with the stones just touching.
  const EVE_REST = JOY_REST - 2.36 * R
  {
    const u = 1.3
    const T = (2 * (JOY_REST - bench[0])) / u
    J.ramp([JOY_REST, bench[1]], J.t + T, u, 0)
  }
  const benchY = bench[1]
  // Evelyn comes to rest against her, and she gives a little with it.
  J.rest(MEET)
  J.fn((t) => {
    const s = t - MEET
    return [JOY_REST + (TOUCH / 0.326) * (Math.exp(-s / 0.2) - Math.exp(-s / 0.08)), benchY]
  }, MEET + 1.1, 44)
  J.p = [JOY_REST, benchY]
  J.rest(ON)

  /* ---- the gorge: off the bench's edge, down the steps, the long talus, the last steps, the ring */
  const EDGE_ROLL = 0.8
  const EDGE_SPEED = 1.6
  const EDGE_FLY = 0.6
  const edgeX = JOY_REST + EDGE_ROLL
  const benchLedge = lay(bench, 0, bench[0] - 1.35, edgeX, true)
  void benchLedge
  const g1 = fall(73)
  const tEdgeJ = g1 - EDGE_FLY
  J.ramp([edgeX, benchY], tEdgeJ, 0, EDGE_SPEED)
  const gorgeFrom = J.way.length
  J.flyOn(g1)
  land(J, 'joy')
  lay(J.p, 0.05, J.p[0] - 0.7, J.p[0] + 0.55)
  // Bounds down the steps, each landing on a ledge laid for it.
  const bound = (w: Walker, dx: number, dy: number, t: number, a: number, back: number, ahead: number, sand = false) => {
    const to: Pt = [w.p[0] + dx, w.p[1] + dy]
    w.hop(to, t)
    land(w, 'joy')
    lay(to, a, to[0] - back, to[0] + ahead, sand)
  }
  bound(J, 2.0, 2.9, fall(76), 0.06, 0.9, 0.5)
  bound(J, 1.35, 1.3, fall(78), 0.04, 0.6, 0.45)
  // The last of these lands at the head of the long talus.
  {
    const to: Pt = [J.p[0] + 1.3, J.p[1] + 1.1]
    J.hop(to, fall(80))
    land(J, 'joy')
  }
  // The long talus: a slow roll down the scree, then off its foot.
  rollOff(J, 1.1, 2.0, 0.66, fall(92), 0.7, true, 2.4)
  land(J, 'joy')
  lay(J.p, 0.05, J.p[0] - 0.6, J.p[0] + 0.55)
  bound(J, 1.8, 2.3, fall(95), 0.03, 0.7, 0.5)
  bound(J, 1.7, 1.9, fall(98), 0.05, 0.7, 0.45)
  bound(J, 1.3, 1.0, fall(100), 0.02, 0.6, 0.45)

  /* ---- the floor and the ring */
  // The last bound is onto the sand at the foot of the wall; from there onto the ring's rim, and in.
  {
    const to: Pt = [J.p[0] + 1.6, J.p[1] + 0.9]
    J.hop(to, fall(102))
    land(J, 'joy')
  }
  // The ring's rim: the last landing is on its inner edge (its top, RIM over the sand), so the hop in drops into the hole.
  const rimTop = J.p[1] + R
  const floor = rimTop + RIM + RO * Q
  const lastRim: Pt = J.p
  const ringX = lastRim[0] + RI - 0.02
  // Into the hole: the seam's fall, and on down in the dark at that pace (the ring's front hides it).
  const intoFrom = J.way.length
  J.v = [SEAM_V[0], SEAM_V[1] - G * (fall(103) - fall(102))]
  J.flyOn(fall(103))
  J.ramp([J.p[0] + SEAM_V[0] * (END - J.t), J.p[1] + SEAM_V[1] * (END - J.t)], END + 1e-6, Math.hypot(...SEAM_V), Math.hypot(...SEAM_V))
  // The floor as a ledge (the ring is drawn on it), from the foot of the wall to the far side.
  ledges.push({ a: [ledges[ledges.length - 1].b[0] - 0.12, floor], b: [ringX + 5.5, floor], sand: true })

  /* ---- Evelyn */
  const E = new Walker(BEGIN, [EVELYN_SEAT, 0])
  // She leans after her: out to the brink where Joy was, and a little past, and back.
  E.rest(E_LEAN)
  {
    const x0 = E.p[0]
    const d = BRINK - x0
    const T = 1.5
    E.fn((t) => {
      const s = (t - E_LEAN) / T
      const u = 1 - Math.exp(-3 * s) * (1 + 3 * s * 0.3) * Math.cos(2 * s)
      return [x0 + d * Math.min(1.01, u + (1 - u) * s * s * s), 0]
    }, E_LEAN + T, 60)
    E.p = [BRINK, 0]
  }
  // She flinches back from the edge, and stays back from it: a heavy roll back that dies away.
  E.rest(E_BALK)
  const back = BRINK - BALK
  E.ramp([back, 0], E_BALK + (2 * BALK) / 0.62, 0.62, 0)
  // Then she rolls forward, slowly, and does not stop: over the corner as Joy went, and on down after her, the
  // way she went, fourteen beats later, to the bench.
  const eTurn = turnStart + LAG
  const creep = (2 * (LIP - back)) / GO_SPEED
  E.rest(eTurn - creep)
  E.ramp([LIP, 0], eTurn, 0, GO_SPEED)
  const eDown = shifted(J.way.slice(turnFrom, wayDownTo), LAG)
  E.way.push(...eDown)
  E.t = eDown[eDown.length - 1].t1
  E.p = wayAt(eDown, E.t)
  for (const l of landings.filter((x) => x.who === 'joy' && x.t > OVER && x.t <= fall(50) + 1e-6)) landings.push({ ...l, t: l.t + LAG, who: 'evelyn' })
  // On the bench she rolls up against Joy, and stops there.
  {
    const u0 = (2 * (EVE_REST - bench[0])) / (MEET - E.t) - TOUCH_SPEED
    E.ramp([EVE_REST, benchY], MEET, u0, TOUCH_SPEED)
  }
  // Joy goes on, and she goes with her: from rest, to the edge, one beat behind.
  {
    const d = edgeX - EVE_REST
    const T = (2 * d) / EDGE_SPEED
    const tEdge = tEdgeJ + fall(1) - fall(0)
    E.rest(tEdge - T)
    E.ramp([edgeX, benchY], tEdge, 0, EDGE_SPEED)
  }
  // Down the gorge where she went, a beat behind, to the ring's rim; and in, on the jump, falling as the seam says.
  const beat = fall(1) - fall(0)
  const eGorge = shifted(J.way.slice(gorgeFrom, intoFrom), beat)
  E.way.push(...eGorge)
  E.t = eGorge[eGorge.length - 1].t1
  E.p = wayAt(eGorge, E.t)
  E.v = [SEAM_V[0], SEAM_V[1] - G * (END - E.t)]
  E.flyOn(END)
  for (const l of landings.filter((x) => x.who === 'joy' && x.t >= g1 - 1e-6)) landings.push({ ...l, t: l.t + beat, who: 'evelyn' })

  landings.sort((a, b) => a.t - b.t)
  return { joy: J.way, evelyn: E.way, ledges, floor, ring: { x: ringX, top: rimTop }, landings }
}

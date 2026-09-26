import { laneAt, type Lane, type Pt, type Seg } from '../../../../../parts'
import { carried } from '../kit'
import { beat, beatAt, eighth, note, onset, THEME } from '../music'
import { G_EARTH } from '../physics'

/**
 * The tunnels' plan: where everything stands (the part's own frame: the gate's threshold is (-0.5, 0), the hall's
 * west door is the exit, (17.5, 12)), when everything happens (the measured eighths of phrases 2 and 3), and how
 * each mechanism moves as a pure function of show time. `deep-set.ts` draws from these; `deep.ts` builds the lanes.
 *
 * The chain, top to bottom:
 *
 * 1. **The drip xylophone.** Nine stone bars on a shelf over the upper gallery, a stalactite over each; drips land
 *    on the theme's notes, each on the bar of its pitch.
 * 2. **The drip-cup lever.** A stone beam on a post, a cup at its far end filling from its own stalactite. Peer
 *    rolls out along the beam and drops into the cup on the phrase's loudest note: the last drop. It tips, slams
 *    down onto the flint in the floor below, sparks fly up into the oil gutter and the lanterns catch, back up the
 *    gallery behind him.
 * 3. **The waterwheel.** The cup's water runs along a runnel and a wooden flume onto an overshot wheel of stone
 *    buckets: the wheel starts. She rides it first; he follows her down the flume into the next bucket, on the
 *    phrase's first note.
 * 4. **The trip hammer.** Each bucket going past presses the tail of a great stone hammer; it falls on a stone bar
 *    on every half bar: the xylophone grown. Its sparks light the gutter down the stair, and the flame chases him
 *    down to the hall's door, a lantern at a time.
 */

/* ------------------------------------------------------------------ the clock */

/** Eighth `i` of phrase 2 (22.32 …) and of phrase 3 (31.19 …). */
export const E = (i: number): number => eighth(64 + i)
export const F = (i: number): number => eighth(96 + i)
export const BEGIN = E(0)
export const END = F(32)

/** He drops into the cup; the lever slams onto the flint on the loudest accent of the stretch (26.57, s 3.8). */
export const T_CUP = E(12)
export const T_SLAM = onset(26.57, 3)
/** The water reaches the wheel, which starts; she drops into a bucket; he does, on phrase 3's first note. */
export const T_WHEEL = E(24)
export const T_HER_BUCKET = E(28)
export const T_HIS_BUCKET = F(0)
/** Onto the landing below the wheel, him and her. */
export const T_HIS_LAND = F(10)
export const T_HER_LAND = F(6)

/* ------------------------------------------------------------------ the rock */

/** Ball-centre heights of the floors (a floor's top is R lower down the page). */
export const Y_TOP = 0
export const Y_T2 = 2.7
export const Y_T3 = 6.3
export const Y_DOOR = 12
/** The upper gallery: flat from the threshold, then a ramp down to the lever's beam. */
export const RAMP0: Pt = [0.8, 0]
export const RAMP1: Pt = [2.7, 1.1]
/** The terraces' ends. */
export const T2_X0 = 2.75
export const T2_X1 = 7.3
export const T3_X0 = 11.0
export const T3_X1 = 12.2
/** The stair from the landing to the door: five treads and the door's floor. */
export const STEPS = 6
export const TREAD = 0.76
export const RISE = (Y_DOOR - Y_T3) / STEPS
export const tread = (i: number): { x0: number; x1: number; y: number; mid: number } => {
  const x0 = T3_X1 + TREAD * (i - 1)
  return { x0, x1: x0 + TREAD, y: Y_T3 + RISE * i, mid: x0 + TREAD / 2 }
}
export const DOOR_X0 = T3_X1 + TREAD * (STEPS - 1)

/* ------------------------------------------------------------------ the lever */

/** The beam's pivot (on its centre line), its ends and thickness, the cup at its far end (beam frame, x along it). */
export const PIVOT: Pt = [3.8, 1.34]
export const BEAM = { l: -1.1, r: 2.42, half: 0.11 }
export const CUP = { x0: 1.8, x1: 2.32, floor: -0.02, seat: [2.06, -0.15] as Pt }
/** How far it tips before the cup meets the floor of the terrace below. */
export const TIP = (43.5 * Math.PI) / 180

/** A point of the beam's frame, in the part's, with the beam turned by `a`. */
export const onBeam = (q: Pt, a: number): Pt => [PIVOT[0] + q[0] * Math.cos(a) - q[1] * Math.sin(a), PIVOT[1] + q[0] * Math.sin(a) + q[1] * Math.cos(a)]

/** The beam's angle: level until he drops into the cup, then the tip, a gravity fall onto the flint, and a small rebound. */
export function leverAngle(t: number): number {
  if (t <= T_CUP) return 0
  if (t < T_SLAM) {
    const u = (t - T_CUP) / (T_SLAM - T_CUP)
    // His weight lands in it: the beam gives a little at once, and then it goes.
    const d = t - T_CUP
    const give = 0.04 * (1 - Math.exp(-d / 0.04)) * Math.exp(-d / 0.28) * (1 - u)
    return TIP * u * u + give
  }
  const d = t - T_SLAM
  return TIP - 0.05 * Math.exp(-d / 0.16) * Math.sin(Math.min(1, d / 0.22) * Math.PI)
}
export const cupSeat = (t: number): Pt => onBeam(CUP.seat, leverAngle(t))

/* ------------------------------------------------------------------ the wheel */

/** The wheel's hub, the radius a rider sits at, the rim and the buckets' outer lips; eight buckets. */
export const WHEEL = { c: [8.9, 5.3] as Pt, seat: 1.7, rim: 1.5, lip: 2.02, n: 8 }
/** A bucket every two beats once it is up to speed; it comes up over two beats from the water's arrival. */
const W_RATE = Math.PI / 8
const W_B0 = 44
const W_SPIN = 2
/** It runs down after the hammer's last blow (the drips go quiet as the tune moves into the hall). */
const W_RUN = 18
const A0 = (-142.5 * Math.PI) / 180

export function wheelTurn(t: number): number {
  const u = beatAt(t) - W_B0
  if (u <= 0) return 0
  if (u < W_SPIN) return (W_RATE * u * u) / (2 * W_SPIN)
  if (u < W_RUN) return W_RATE * (u - W_SPIN / 2)
  return W_RATE * (W_RUN - W_SPIN / 2 + 1.2 * (1 - Math.exp(-(u - W_RUN) / 1.2)))
}
/** Bucket k's angle (0 is east, the page's y down) and the seat in it. */
export const bucketAngle = (k: number, t: number): number => A0 + wheelTurn(t) + (k * 2 * Math.PI) / WHEEL.n
export const bucketSeat = (k: number, t: number): Pt => {
  const a = bucketAngle(k, t)
  return [WHEEL.c[0] + WHEEL.seat * Math.cos(a), WHEEL.c[1] + WHEEL.seat * Math.sin(a)]
}
/** He rides bucket 0, she the one ahead of it. Each is tipped out a little past the level, on the wheel's right. */
export const HIS_K = 0
export const HER_K = 1
/** The hammer's blows jolt the wheel: the first throws her out of her bucket, the third him out of his (both at 15°, past the level). */
export const T_HER_OUT = F(4)
export const T_HIS_OUT = F(8)
/** The gravity of the tumble out onto the landing: a low, short fall. */
const G_OUT = 7

/** The flume: from the terrace's end over the wheel's top; its floor, and where a rider in it rolls. */
export const FLUME = { x0: T2_X1, x1: 9.12, y0: 2.86, y1: 3.02 }
export const flumeY = (x: number): number => FLUME.y0 + ((FLUME.y1 - FLUME.y0) * (x - FLUME.x0)) / (FLUME.x1 - FLUME.x0)

/* ------------------------------------------------------------------ the hammer */

/** The trip hammer: pivot hung from the roof, the tail the buckets press, the head over the stone bar. */
export const HAMMER = { pivot: [11.55, 3.72] as Pt, tail: [-0.86, 0.5] as Pt, head: [2.05, -0.18] as Pt, lift: 0.34, w: 0.8, h: 0.6 }
/** It falls on every half bar from phrase 3's second beat (a bucket going past each time). */
export const BLOWS: number[] = [50, 52, 54, 56, 58, 60, 62].map((b) => beat(b))
const FALL_S = 0.13

/** How far the head is raised, 0 on the bar to 1 at the top of its lift: pressed up slowly, dropped, a small bounce. */
export function hammerLift(t: number): number {
  let prev = -Infinity
  for (let i = 0; i < BLOWS.length; i++) {
    const b = BLOWS[i]
    const from = i === 0 ? beat(W_B0 + 4.4) : prev + 0.3
    if (t < from) break
    if (t <= b) {
      const rel = b - FALL_S
      if (t < rel) {
        const u = (t - from) / (rel - from)
        return u * u * (3 - 2 * u)
      }
      const u = (t - rel) / FALL_S
      return 1 - u * u
    }
    prev = b
  }
  if (prev === -Infinity) return 0
  const d = t - prev
  return 0.07 * Math.exp(-d / 0.1) * Math.abs(Math.sin((d / 0.13) * Math.PI))
}

/* ------------------------------------------------------------------ the drips */

/** The theme's pitches as scored, in order: which bar of the xylophone each is (low on the left). */
const PITCHES = [0, 1, 2, 3, 5, 6, 7, 10, 12]
export const BARS = PITCHES.length
/** The xylophone's shelf: bars from x0, `step` apart, their tops at `top`; the stalactites' tips over them. */
/**
 * The xylophone: nine slabs of stone standing on a shelf in the gallery's wall, tallest (lowest) on the left, like
 * a lithophone; a stalactite over each. Its shelf's lip is the oil gutter, so when the fire comes back up the
 * gallery it runs along under the slabs.
 */
export const XYLO = { x0: 0.08, step: 0.37, shelf: -0.8, w: 0.2 }
export const barX = (i: number): number => XYLO.x0 + i * XYLO.step
/** Slab i's height, and its top (where its drips land). */
export const barH = (i: number): number => 0.95 - (0.5 * i) / 8
export const barTop = (i: number): number => XYLO.shelf - barH(i)
export const tipY = (i: number): number => -2.18 - 0.1 * Math.sin(i * 1.9 + 0.4) - 0.06 * (i % 2)

export interface Drop {
  at: number
  bar: number
}
/** Every drip on the xylophone: each sounded note of phrases 2 and 3, on the bar of its pitch (the B phrases' shape is the A's). */
export const DRIPS: Drop[] = (() => {
  const out: Drop[] = []
  for (let j = 64; j < 128; j++) {
    const n = note(j)
    if (n.sounded) out.push({ at: eighth(j), bar: Math.max(0, PITCHES.indexOf(THEME[n.at])) })
  }
  return out
})()

/** The cup's own stalactite drips on the half bars while it fills, and on through every quarter after (its water runs to the wheel). */
export const CUP_TIP: Pt = [PIVOT[0] + CUP.seat[0], -0.72]
export const CUP_DRIPS: number[] = [E(0), E(4), E(8), E(16), E(20), E(24), E(28), F(0), F(4), F(8), F(12), F(16), F(20), F(24), F(28)]
/** How full the cup is, 0..1 (six drips fill it to the brim with him in it). */
export const cupFill = (t: number): number => {
  if (t >= T_SLAM) return Math.max(0, 1 - (t - T_SLAM) / 0.5) * 0.9
  let n = 0
  for (const d of CUP_DRIPS) if (d <= t && d < T_CUP) n++
  return Math.min(1, n / 3.3)
}

/* ------------------------------------------------------------------ the fire */

export interface Gutter {
  pts: Pt[]
  /** Arc length at each point. */
  s: number[]
}
const gutter = (pts: Pt[]): Gutter => {
  const s = [0]
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { pts, s }
}
export const gutterAt = (g: Gutter, s: number): Pt => {
  const L = g.s[g.s.length - 1]
  const u = Math.max(0, Math.min(L, s))
  let i = 1
  while (i < g.pts.length - 1 && g.s[i] < u) i++
  const f = (u - g.s[i - 1]) / Math.max(1e-9, g.s[i] - g.s[i - 1])
  return [g.pts[i - 1][0] + (g.pts[i][0] - g.pts[i - 1][0]) * f, g.pts[i - 1][1] + (g.pts[i][1] - g.pts[i - 1][1]) * f]
}
/** Arc length of the gutter's point nearest x (its points run left to right). */
export const gutterS = (g: Gutter, x: number): number => {
  for (let i = 1; i < g.pts.length; i++) {
    if (x <= g.pts[i][0] || i === g.pts.length - 1) {
      const f = (x - g.pts[i - 1][0]) / Math.max(1e-9, g.pts[i][0] - g.pts[i - 1][0])
      return g.s[i - 1] + Math.max(0, Math.min(1, f)) * (g.s[i] - g.s[i - 1])
    }
  }
  return 0
}

/** The upper gutter: along the gallery's wall from the threshold, down past the lever to the flume. */
export const G1 = gutter([[-0.5, XYLO.shelf], [3.5, XYLO.shelf], [4.3, 0.75], [7.25, 0.75]])
/** The stair's gutter: from the hammer's ledge down along the stair wall to the door. */
export const G2 = gutter([[11.95, 5.84], [12.45, 5.84], [16.1, 10.4], [17.8, 10.4]])

export interface Lamp {
  at: Pt
  /** When it catches: a strike. */
  catch: number
  /** Standing in a gutter (0) or hung on a chain. */
  hang: number
  seed: number
}
/** Where the upper gutter first takes fire: a spark from the lever's slam, settling in it. */
export const G1_SPARK = { x: 5.45, t: T_SLAM + 0.45 }
export const LAMPS: Lamp[] = [
  { at: [-0.3, XYLO.shelf], catch: E(28), hang: 0, seed: 1 },
  { at: [3.32, XYLO.shelf], catch: E(24), hang: 0, seed: 2 },
  { at: [4.85, 0.75], catch: E(20), hang: 0, seed: 3 },
  { at: [7.0, 0.75], catch: E(24), hang: 0, seed: 4 },
  // The hammer's lantern, over the bar: its first blow's sparks light it.
  { at: [12.75, 1.6], catch: BLOWS[0], hang: 0.45, seed: 5 },
  // Down the stair: the blow on 34.55 sets the gutter alight; the flame chases him down, a torch at each tread he leaves.
  { at: [12.25, 5.84], catch: F(14), hang: 0, seed: 6 },
  // (On the accent the orchestra leans on, 36.10, a little before his step.)
  { at: [14.2, 8.03], catch: onset(36.1, 2), hang: 0, seed: 7 },
  { at: [15.75, 9.96], catch: F(22), hang: 0, seed: 8 },
  { at: [17.45, 10.4], catch: F(26), hang: 0, seed: 9 },
]
export const litOf = (l: Lamp, t: number): number => {
  const u = Math.max(0, Math.min(1, (t - l.catch) / 0.35))
  return u * u * (3 - 2 * u)
}

/** The flame's fronts along a gutter: [time, arc length] keys, both ways from where it took. */
export interface Front {
  g: Gutter
  keys: [number, number][]
}
const s1 = (x: number) => gutterS(G1, x)
const s2 = (x: number) => gutterS(G2, x)
export const FRONTS: Front[] = [
  { g: G1, keys: [[G1_SPARK.t, s1(G1_SPARK.x)], [LAMPS[2].catch, s1(LAMPS[2].at[0])], [LAMPS[1].catch, s1(LAMPS[1].at[0])], [LAMPS[0].catch, s1(LAMPS[0].at[0])], [LAMPS[0].catch + 0.4, 0]] },
  { g: G1, keys: [[G1_SPARK.t, s1(G1_SPARK.x)], [LAMPS[3].catch, s1(LAMPS[3].at[0])], [LAMPS[3].catch + 0.2, s1(7.25)]] },
  { g: G2, keys: [[LAMPS[5].catch, s2(LAMPS[5].at[0])], [LAMPS[6].catch, s2(LAMPS[6].at[0])], [LAMPS[7].catch, s2(LAMPS[7].at[0])], [LAMPS[8].catch, s2(LAMPS[8].at[0])], [LAMPS[8].catch + 0.4, s2(17.9)]] },
  { g: G2, keys: [[LAMPS[5].catch, s2(LAMPS[5].at[0])], [LAMPS[5].catch + 0.3, 0]] },
]
/** When the flame reaches arc length s along a front (Infinity if it never does), for the burn along the gutter. */
export function reached(f: Front, s: number): number {
  const k = f.keys
  const lo = Math.min(k[0][1], k[k.length - 1][1])
  const hi = Math.max(k[0][1], k[k.length - 1][1])
  if (s < lo - 1e-6 || s > hi + 1e-6) return Infinity
  for (let i = 1; i < k.length; i++) {
    const [t0, a] = k[i - 1]
    const [t1, b] = k[i]
    if ((s - a) * (s - b) <= 0) return Math.abs(b - a) < 1e-9 ? t0 : t0 + ((t1 - t0) * (s - a)) / (b - a)
  }
  return Infinity
}

/** The water's front along the runnel and the flume, x at show time t (it reaches the wheel on T_WHEEL). */
export const RUNNEL_X0 = 5.55
export const waterX = (t: number): number => {
  if (t < T_SLAM + 0.15) return -Infinity
  const u = Math.min(1, (t - T_SLAM - 0.15) / (T_WHEEL - T_SLAM - 0.15))
  return RUNNEL_X0 + (FLUME.x1 - RUNNEL_X0) * (0.35 * u + 0.65 * u * u)
}

/** Sparks: when and where a shower goes up (the lever's slam, every hammer blow). */
export interface Shower {
  at: number
  p: Pt
  up: number
  n: number
  seed: number
}
export const SHOWERS: Shower[] = [
  { at: T_SLAM, p: [5.62, 2.83], up: 6.2, n: 24, seed: 11 },
  ...BLOWS.map((b, i) => ({ at: b, p: [HAMMER.pivot[0] + HAMMER.head[0] - 0.42, HAMMER.pivot[1] + HAMMER.head[1] + HAMMER.h / 2] as Pt, up: 2.6, n: 16, seed: 20 + i })),
]

/* ------------------------------------------------------------------ the lanes */

/** A path with rounded corners: each inner corner replaced by a short arc of radius r. */
export function fillet(pts: Pt[], r = 0.45, n = 5): Pt[] {
  const out: Pt[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]]
    const la = Math.hypot(b[0] - a[0], b[1] - a[1])
    const lc = Math.hypot(c[0] - b[0], c[1] - b[1])
    const d = Math.min(r, la / 2, lc / 2)
    const p0: Pt = [b[0] + ((a[0] - b[0]) * d) / la, b[1] + ((a[1] - b[1]) * d) / la]
    const p1: Pt = [b[0] + ((c[0] - b[0]) * d) / lc, b[1] + ((c[1] - b[1]) * d) / lc]
    for (let j = 0; j <= n; j++) {
      const u = j / n
      // A quadratic Bezier through the corner: tangent to both runs.
      out.push([(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * b[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * b[1] + u * u * p1[1]])
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

/**
 * A glide along a path from speed v0 to v1 in exactly `dur` seconds: it picks up (or slows) over the first `acc`
 * cells, cruises, and comes to v1 over the last `dec`, every piece a linear change of speed so nothing jumps.
 */
export function glide(pts: Pt[], dur: number, v0: number, v1: number, acc = 0.8, dec = 0.8): Seg[] {
  const lens: number[] = []
  for (let i = 1; i < pts.length; i++) lens.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const L = lens.reduce((a, b) => a + b, 0)
  const dA = Math.min(acc, L * 0.45)
  const dD = Math.min(dec, L * 0.45)
  const timeFor = (V: number) => (2 * dA) / (v0 + V) + (L - dA - dD) / V + (2 * dD) / (V + v1)
  let lo = 1e-3
  let hi = 60
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2
    if (timeFor(mid) > dur) lo = mid
    else hi = mid
  }
  const V = (lo + hi) / 2
  const vAt = (s: number): number => {
    if (s <= dA) return Math.sqrt(Math.max(0, v0 * v0 + ((V * V - v0 * v0) * s) / dA))
    if (s >= L - dD) return Math.sqrt(Math.max(0, V * V + ((v1 * v1 - V * V) * (s - (L - dD))) / dD))
    return V
  }
  const cuts = [0, dA, L - dD, L]
  const segs: Seg[] = []
  let s = 0
  for (let i = 0; i < lens.length; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const bounds = [s, ...cuts.filter((c) => c > s + 1e-9 && c < s + lens[i] - 1e-9), s + lens[i]]
    for (let j = 1; j < bounds.length; j++) {
      const f0 = (bounds[j - 1] - s) / lens[i]
      const f1 = (bounds[j] - s) / lens[i]
      const from: Pt = [a[0] + (b[0] - a[0]) * f0, a[1] + (b[1] - a[1]) * f0]
      const to: Pt = [a[0] + (b[0] - a[0]) * f1, a[1] + (b[1] - a[1]) * f1]
      const va = vAt(bounds[j - 1])
      const vb = vAt(bounds[j])
      segs.push({ from, to, dur: (2 * (bounds[j] - bounds[j - 1])) / Math.max(1e-6, va + vb), ramp: [va, vb] })
    }
    s += lens[i]
  }
  // The pieces' times add to dur up to the solve's precision; the last takes up the rest exactly.
  const sum = segs.reduce((a, g) => a + g.dur, 0)
  segs[segs.length - 1].dur += dur - sum
  return segs
}

/** A true flight from `a` to `b` landing `T` later under gravity g (the parabola g·T²/8 over the chord). */
export const flight = (a: Pt, b: Pt, T: number, g = G_EARTH, extra: Partial<Seg> = {}): Seg => ({ from: a, to: b, dur: T, arc: (g * T * T) / 8, ...extra })

/** Hops down the stair, one a tread, landing on each of `times` (from the landing's edge, `from` at `t0`). */
export function stairHops(from: Pt, t0: number, times: number[], g = 14): Seg[] {
  const segs: Seg[] = []
  let a = from
  let ta = t0
  times.forEach((tb, i) => {
    const b: Pt = i < STEPS - 1 ? [tread(i + 1).mid, tread(i + 1).y] : [DOOR_X0 + 0.35, Y_DOOR]
    segs.push(flight(a, b, tb - ta, g))
    a = b
    ta = tb
  })
  return segs
}

/** Seconds into the slot. */
export const rel = (t: number): number => t - BEGIN

/** Peer's lane, slot seconds (the ball enters at (-0.5, 0) at rest on the phrase's first note). */
export function peerLane(): Lane {
  const segs: Seg[] = []
  const add = (s: Seg | Seg[]) => segs.push(...(Array.isArray(s) ? s : [s]))
  // Out along the gallery under the xylophone, down the ramp, out along the beam, and over the cup's lip into it.
  // Up over the cup's lip (rolling over its round top), and a short fall into the water on the note.
  const onBeamEnd: Pt = [PIVOT[0] + 1.6, 1.1]
  const lipTop = onBeam([CUP.x0 - 0.01, -BEAM.half - 0.24], 0)
  const tFall = 0.18
  add(glide(fillet([[-0.5, 0], RAMP0, RAMP1, onBeamEnd]).concat([lipTop]), rel(T_CUP - tFall), 0, 1.5, 0.9, 0.9))
  add(flight(lipTop, cupSeat(T_CUP), tFall))
  // The cup tips with him in it and slams on the flint.
  add(carried((τ) => cupSeat(BEGIN + τ), rel(T_CUP), rel(T_SLAM), 24))
  // Poured out over its lip with the water, and rolling to a stop by the runnel.
  const out: Pt = [5.95, Y_T2]
  add(flight(cupSeat(T_SLAM), out, 0.3, 4))
  add({ from: out, to: [6.35, Y_T2], dur: 0.62, ease: 'out' })
  // He creeps after the water toward the flume while she goes first.
  const tFlume = T_HIS_BUCKET - 0.35 - 1.3
  add({ from: [6.35, Y_T2], to: [6.55, Y_T2], dur: tFlume - (T_SLAM + 0.92), ease: 'inout' })
  // Down the flume with the water, and off its end into the bucket as it comes round.
  const flumeEnd: Pt = [FLUME.x1 - 0.05, flumeY(FLUME.x1 - 0.05) - 0.13]
  add(glide([[6.55, Y_T2], [FLUME.x0, flumeY(FLUME.x0) - 0.13], flumeEnd], 1.3, 0, 0.9, 0.6, 0.5))
  add(flight(flumeEnd, bucketSeat(HIS_K, T_HIS_BUCKET), 0.35))
  // Round with the wheel, tipped out past the level, onto the landing.
  add(carried((τ) => bucketSeat(HIS_K, BEGIN + τ), rel(T_HIS_BUCKET), rel(T_HIS_OUT), 30))
  const land: Pt = [T3_X0 + 0.45, Y_T3]
  add(flight(bucketSeat(HIS_K, T_HIS_OUT), land, T_HIS_LAND - T_HIS_OUT, G_OUT))
  // Along the landing to the stair's edge, and down it a tread a beat.
  const edge: Pt = [T3_X1 - 0.35, Y_T3]
  add({ from: land, to: edge, dur: F(12) - T_HIS_LAND, ease: 'out' })
  add(stairHops(edge, F(12), [F(14), F(16), F(18), F(20), F(22), F(24)]))
  // Along the door's floor, slowing, and a last tiptoe to rest on the threshold.
  const door: Pt = [DOOR_X0 + 0.35, Y_DOOR]
  add({ from: door, to: [17.22, Y_DOOR], dur: F(30) - F(24), ease: 'out' })
  add({ from: [17.22, Y_DOOR], to: [17.5, Y_DOOR], dur: END - F(30), ease: 'inout', arc: 0.07 })
  return { segs, fire: rel(T_CUP) }
}

/** The Woman in Green's path, the same way (slot seconds): she goes first at every turn. */
export function womanLane(): Lane {
  const segs: Seg[] = []
  const add = (s: Seg | Seg[]) => segs.push(...(Array.isArray(s) ? s : [s]))
  const t1 = E(8) - 0.5
  const offBeam: Pt = [PIVOT[0] + 0.45, 1.1]
  add(glide(fillet([[0.5, 0], RAMP0, RAMP1, offBeam]), t1 - BEGIN, 0, 0.5, 0.9, 0.5))
  // Off the beam beside its post, down onto the terrace.
  const down: Pt = [PIVOT[0] + 1.05, Y_T2]
  const t2 = t1 + 0.5
  add(flight(offBeam, down, 0.5))
  add(glide([down, [6.55, Y_T2]], T_SLAM - 0.45 - t2, 0.8, 0, 0.3, 0.7))
  // A step on from the crash, then waiting at the flume's head for the water.
  add({ from: [6.55, Y_T2], to: [6.55, Y_T2], dur: 0.35 })
  add({ from: [6.55, Y_T2], to: [7.02, Y_T2], dur: 0.75, ease: 'inout' })
  add({ from: [7.02, Y_T2], to: [7.02, Y_T2], dur: T_WHEEL - (T_SLAM + 0.65) })
  const flumeEnd: Pt = [FLUME.x1 - 0.05, flumeY(FLUME.x1 - 0.05) - 0.13]
  add(glide([[7.02, Y_T2], [FLUME.x0, flumeY(FLUME.x0) - 0.13], flumeEnd], T_HER_BUCKET - 0.35 - T_WHEEL, 0, 0.9, 0.5, 0.5))
  add(flight(flumeEnd, bucketSeat(HER_K, T_HER_BUCKET), 0.35))
  add(carried((τ) => bucketSeat(HER_K, BEGIN + τ), rel(T_HER_BUCKET), rel(T_HER_OUT), 30))
  const land: Pt = [T3_X0 + 0.45, Y_T3]
  add(flight(bucketSeat(HER_K, T_HER_OUT), land, T_HER_LAND - T_HER_OUT, G_OUT))
  const edge: Pt = [T3_X1 - 0.35, Y_T3]
  add({ from: land, to: edge, dur: F(8) - T_HER_LAND, ease: 'out' })
  add(stairHops(edge, F(8), [F(10), F(12), F(14), F(16), F(18), F(20)]))
  add({ from: [DOOR_X0 + 0.35, Y_DOOR], to: [18.5, Y_DOOR], dur: END - F(20), ease: 'out' })
  return { segs, fire: 0 }
}

/** Where a lane has a ball at show time t (clamped to its ends). */
export const onLane = (lane: Lane, t: number): Pt => {
  const q = laneAt(lane, t - BEGIN)
  return [q.x, q.y]
}


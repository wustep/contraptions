import { R } from '../../../../../parts'
import { G } from '../physics'

/**
 * The dojo's choreography, worked out once: where the wooden men stand, where the ball meets each of them, and
 * how every limb, the hanging staff and the gong move. The lane and the drawing both read these functions, so
 * the ball is always exactly on the arm it is striking.
 *
 * Everything here is in the hall's own frame: x to the right, h up from the floor. The part turns it into its
 * cells (y down) at the end.
 *
 * A ricochet is solved, not placed. Each strike names the limb it lands on and the onset it lands on; the ball's
 * flights between strikes are parabolas under G, and where on the rounded end of the limb the ball touches is
 * chosen so the limb's surface faces exactly the way the ball's velocity turns (a real bounce: the change of
 * velocity along the surface normal). A few rounds of that settle every contact.
 */

export type V = [number, number]
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]]
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]]
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k]
const len = (a: V): number => Math.hypot(a[0], a[1])
const norm = (a: V): V => {
  const l = len(a) || 1
  return [a[0] / l, a[1] / l]
}
const rot = (a: V, r: number): V => [a[0] * Math.cos(r) - a[1] * Math.sin(r), a[0] * Math.sin(r) + a[1] * Math.cos(r)]
export const deg = (d: number): number => (d * Math.PI) / 180

/* ------------------------------------------------------------------ the wooden man */

/** The post: its width, its top, its foot block. */
export const POST = { w: 0.62, top: 4.15, base: 0.24, baseW: 0.96 }
/** The arms: round sticks in sockets through the post, each with a rounded end the ball strikes. */
export const ARM = {
  r: 0.062,
  off: 0.24,
  up: { root: 3.0, ang: deg(22), len: 0.85 },
  mid: { root: 2.3, ang: deg(-2), len: 0.82 },
}
/** The leg: a thigh from a hip socket low on the post, and a shin from the knee. Angles are up from level, toward the man's front. */
export const LEG = {
  hip: 1.45,
  off: 0.24,
  thigh: 1.12,
  shin: 0.5,
  r: 0.085,
  rest: deg(-30),
  chamber: deg(4),
  /** Where along the thigh the ball sits when it is caught. */
  seat: 1.03,
}

export interface Man {
  /** The post's centre on the floor, and which way the man faces: +1 his arms point right. */
  x: number
  s: 1 | -1
}

/** Every blow a limb takes: when (show seconds), and the surface normal at the contact (from the limb toward the ball). */
export interface Blow {
  t: number
  n: V
  limb: 'up' | 'mid' | 'knee' | 'seat'
  /** How hard, 0..1.5 (the onset's strength, roughly). */
  w: number
}

/** A leg's work: raised to meet the ball (a knee strike), or raised to catch it, wound, and kicked. */
export type LegAct =
  | { kind: 'knee'; t: number }
  | {
      kind: 'kick'
      tc: number
      tr: number
      th: number
      dip: number
      omega: number
      /** Seconds before the release the snap begins, from rest: the kick is then smooth, and she leaves at its speed. 0 is a blow at the release. */
      pre: number
    }

export interface ManPlan extends Man {
  blows: Blow[]
  acts: LegAct[]
}

/* ------------------------------------------------------------------ small motion helpers */

/** An impulse response: 0 at the blow, a quick peak, a ring, settled. `f` Hz, `d` s decay. */
export const ring = (u: number, f: number, d: number): number => (u <= 0 ? 0 : Math.exp(-u / d) * Math.sin(2 * Math.PI * f * u))
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))
const easeInOut = (u: number) => {
  const x = clamp01(u)
  return x * x * (3 - 2 * x)
}

/** How far a man's post has rocked on its foot (radians, anticlockwise with h up) at `t`. */
export function rockOf(m: ManPlan, t: number): number {
  let r = 0
  // Winding a kick, he leans back from it (held still through the snap itself), and throws forward as it goes.
  for (const a of m.acts) {
    if (a.kind !== 'kick') continue
    const span = a.tr - a.pre - a.tc
    if (t < a.tc || t > a.tr + 1.2) continue
    const back = 0.032 * m.s * easeInOut((t - a.tc - span * 0.25) / (span * 0.75))
    if (t <= a.tr) r += back
    else r += 0.032 * m.s * (Math.exp(-(t - a.tr) / 0.09) - 0.4 * Math.sin((t - a.tr) * 9) * Math.exp(-(t - a.tr) / 0.3))
  }
  for (const b of m.blows) {
    const u = t - b.t
    if (u <= 0 || u > 3) continue
    // The ball pushes on the post against n: its top goes that way, and rings back on its foot.
    r += 0.046 * b.w * b.n[0] * ring(u, 2.6, 0.42)
  }
  return r
}

/** How far an arm has been knocked in its socket (radians, up is positive) at `t`. */
export function armOf(m: ManPlan, limb: 'up' | 'mid', t: number): number {
  const a = ARM[limb].ang
  // The way the arm's end moves as it turns up: across the arm.
  const perp: V = [-m.s * Math.sin(a), Math.cos(a)]
  let d = 0
  for (const b of m.blows) {
    if (b.limb !== limb) continue
    const u = t - b.t
    if (u <= -0.14 || u > 2) continue
    const push = -(b.n[0] * perp[0] + b.n[1] * perp[1])
    // The man strikes: the arm draws back from her and swings into her, level again at the contact (so it meets
    // her where the path was worked out), then a hard wooden clack as she knocks it back, and a quick ring.
    if (u <= 0) d += 0.14 * b.w * push * Math.sin((Math.PI * (u + 0.14)) / 0.14)
    else d += 0.22 * b.w * push * ring(u, 7.5, 0.11)
  }
  return d
}

/** The bend at the knee for a thigh angle: slack at rest, a right angle chambered, near straight in a kick. */
export function bendOf(th: number): number {
  if (th <= LEG.rest) return deg(46)
  if (th <= LEG.chamber) return deg(46) + ((th - LEG.rest) / (LEG.chamber - LEG.rest)) * deg(44)
  if (th <= deg(40)) return deg(90) - ((th - LEG.chamber) / (deg(40) - LEG.chamber)) * deg(72)
  return deg(18)
}

/** The thigh's angle at `t`, from the leg's acts in turn. */
export function thighOf(m: ManPlan, t: number): number {
  let from = LEG.rest
  let th = LEG.rest
  for (let i = 0; i < m.acts.length; i++) {
    const a = m.acts[i]
    const start = (a.kind === 'knee' ? a.t : a.tc) - 0.42
    if (t < start) break
    th = actAngle(a, t, from)
    // The next act starts from wherever this one has the leg by then.
    const next = m.acts[i + 1]
    if (next) from = actAngle(a, (next.kind === 'knee' ? next.t : next.tc) - 0.42, from)
  }
  return th
}

function actAngle(a: LegAct, t: number, from: number): number {
  if (a.kind === 'knee') {
    // Up into the guard, the knee driven up into the ball (at its height as she meets it), and down again, heavy.
    const up = a.t - 0.42
    const u = t - a.t
    const pop = 0.13 * Math.exp(-(u / 0.07) * (u / 0.07))
    if (t < a.t - 0.07) return from + (LEG.chamber - from) * easeInOut((t - up) / 0.35) + pop
    if (t < a.t) return LEG.chamber + pop
    const down = easeInOut((u - 0.28) / 0.55)
    const settle = u > 0.83 ? -0.06 * Math.exp(-(u - 0.83) / 0.25) * Math.sin((u - 0.83) * 11) : 0
    return LEG.chamber + pop + (LEG.rest - LEG.chamber) * down + settle
  }
  const up = a.tc - 0.42
  if (t < a.tc - 0.07) return from + (LEG.chamber - from) * easeInOut((t - up) / 0.35)
  if (t < a.tc) return LEG.chamber
  if (t <= a.tr) {
    const u = t - a.tc
    // The ball lands: the leg gives under it and comes back, then winds down to where the kick starts.
    const span = a.tr - a.pre - a.tc
    const w0 = a.tc + Math.max(0.1, span - Math.min(0.9, span * 0.85))
    const wind = easeInOut((t - w0) / (a.tr - a.pre - w0))
    const dip = -a.dip * (u / 0.07) * Math.exp(1 - u / 0.07) * (1 - wind)
    // Wound to where the snap starts; the snap (if any) accelerates evenly to the kick's speed at the release.
    const low = a.th - (a.omega * a.pre) / 2
    if (t <= a.tr - a.pre) return LEG.chamber + dip + (low - LEG.chamber) * wind
    const v = t - (a.tr - a.pre)
    return low + (a.omega * v * v) / (2 * a.pre)
  }
  // The kick: the thigh leaves at the ball's speed and slows as it rises, then falls back to rest, overshoots and settles.
  const u = t - a.tr
  const rise = 1.55
  const tau = rise / a.omega
  const top = a.th + rise * (1 - Math.exp(-Math.min(u, 0.34) / tau))
  if (u < 0.34) return top
  const v = u - 0.34
  const back = easeInOut(v / 0.5)
  const over = v > 0.5 ? -0.12 * Math.exp(-(v - 0.5) / 0.3) * Math.sin((v - 0.5) * 9) : 0
  return top + (LEG.rest - top) * back + over
}

/* ------------------------------------------------------------------ where things are on a man */

/** The pivot a man's post rocks about: the top of its foot block. */
const footOf = (m: Man): V => [m.x, POST.base]
/** A point of a man (in his own upright frame) moved by his rock. */
const rocked = (m: ManPlan, p: V, t: number): V => add(footOf(m), rot(sub(p, footOf(m)), rockOf(m, t)))

/** An arm's root and its end (the centre of the rounded tip) at `t`. */
export function armAt(m: ManPlan, limb: 'up' | 'mid', t: number): { root: V; tip: V } {
  const spec = ARM[limb]
  const a = spec.ang + armOf(m, limb, t)
  const root: V = [m.x + m.s * ARM.off, spec.root]
  const tip: V = [root[0] + m.s * spec.len * Math.cos(a), root[1] + spec.len * Math.sin(a)]
  return { root: rocked(m, root, t), tip: rocked(m, tip, t) }
}

/** The leg's hip, knee and foot at `t`, and the thigh's angle. */
export function legAt(m: ManPlan, t: number): { hip: V; knee: V; foot: V; th: number } {
  const th = thighOf(m, t)
  const hip: V = [m.x + m.s * LEG.off, LEG.hip]
  const knee: V = [hip[0] + m.s * LEG.thigh * Math.cos(th), hip[1] + LEG.thigh * Math.sin(th)]
  const sh = th - bendOf(th)
  const foot: V = [knee[0] + m.s * LEG.shin * Math.cos(sh), knee[1] + LEG.shin * Math.sin(sh)]
  return { hip: rocked(m, hip, t), knee: rocked(m, knee, t), foot: rocked(m, foot, t), th }
}

/** Where the ball sits on the thigh (its centre) at `t`, the leg at whatever angle it has then. */
export function seatAt(m: ManPlan, t: number, th = thighOf(m, t)): V {
  const hip: V = [m.x + m.s * LEG.off, LEG.hip]
  const u: V = [m.s * Math.cos(th), Math.sin(th)]
  const up: V = [-m.s * Math.sin(th), Math.cos(th)]
  return rocked(m, add(add(hip, mul(u, LEG.seat)), mul(up, LEG.r + R)), t)
}

/* ------------------------------------------------------------------ the staff and the gong */

/** The bo staff, hung on a rope from the beam: its pivot, the rope and staff together, its radius. */
export const STAFF = { hp: 8.0, rope: 0.4, len: 3.2, r: 0.058 }
export interface StaffPlan {
  x: number
  /** Show times: the ball strikes it (it swings away up to the left), and it comes back through and bats her. `a1` is
   * how far it swings away (radians), `a2` the share of its speed it keeps through the bat. */
  t1: number
  t2: number
  a1: number
  a2: number
}
const STAFF_L = STAFF.rope + STAFF.len
/** The staff's swing (radians, its foot to the right is positive) at show time `t`. */
export function staffAngle(s: StaffPlan, t: number): number {
  // It swings away up to the left and comes back through the bottom a moment before the bat, so it meets her rising.
  const w = Math.PI / (s.t2 - STAFF_LEAD - s.t1)
  // At rest it sways a hair, in time with its own swing.
  if (t < s.t1) return 0.012 * Math.sin(w * (t - s.t1))
  const swing = (x: number) => -(s.a1 + 0.012) * Math.sin(w * (x - s.t1))
  if (t < s.t2) return swing(t)
  // The bat takes most of its way: it carries on with what is left, a damped swing from where it was.
  const a0 = swing(s.t2)
  const v0 = -(s.a1 + 0.012) * w * Math.cos(w * (s.t2 - s.t1)) * s.a2
  const u = t - s.t2
  const tau = 3.2
  return Math.exp(-u / tau) * (a0 * Math.cos(w * u) + ((v0 + a0 / tau) / w) * Math.sin(w * u))
}
/** How long before the bat the staff passes the bottom of its swing. */
const STAFF_LEAD = 0.2
/** The staff's foot (the end the ball meets) at `t`. */
export function staffFoot(s: StaffPlan, t: number, along = STAFF_L): V {
  const a = staffAngle(s, t)
  return [s.x + along * Math.sin(a), STAFF.hp - along * Math.cos(a)]
}

/** The gong: its centre, its face (an ellipse seen three-quarters on), and the blow. */
export const GONG = { rx: 0.58, ry: 1.2 }
export interface GongPlan {
  c: V
  t: number
  n: V
}
/** Where on the gong's face the ball touches for a surface normal `n`, and the ball's centre there. */
function gongContact(c: V, n: V): V {
  const a2 = GONG.rx * GONG.rx
  const b2 = GONG.ry * GONG.ry
  const d = Math.sqrt(a2 * n[0] * n[0] + b2 * n[1] * n[1])
  const p: V = [c[0] + (a2 * n[0]) / d, c[1] + (b2 * n[1]) / d]
  return add(p, mul(n, R))
}

/* ------------------------------------------------------------------ the fight */

type Anchor = { man: number; limb: 'up' | 'mid' | 'knee' } | { staff: true } | { gong: true }
type Ev =
  | { t: number; kind: 'bounce'; at: Anchor; w: number }
  | { t: number; kind: 'catch'; man: number; w: number }
  | { t: number; kind: 'kick'; man: number; w: number; v?: V; pre?: number }

/** The four wooden men in a row, two pairs facing each other; x before the hall is placed. */
const MEN: Man[] = [
  { x: 0, s: 1 },
  { x: 3.2, s: -1 },
  { x: 4.65, s: 1 },
  { x: 7.45, s: -1 },
]
const STAFF_X = 1.6
const GONG_C: V = [MEN[2].x + 2.2, 6.15]

/**
 * Every strike, on the flurry's onsets. The first pair trade her down their arms, up-up, middle-middle, knee and
 * catch; the second man kicks her into the hanging staff, which swings away and comes back through to bat her
 * over their heads to the second pair. They trade her down again, the third man's high kick puts her into the
 * gong, and she comes back down onto him to be caught, wound, and kicked on the jump.
 */
const EVENTS: Ev[] = [
  { t: 87.052, kind: 'bounce', at: { man: 0, limb: 'up' }, w: 0.8 },
  { t: 87.493, kind: 'bounce', at: { man: 1, limb: 'up' }, w: 0.7 },
  { t: 87.922, kind: 'bounce', at: { man: 0, limb: 'mid' }, w: 1.1 },
  { t: 88.468, kind: 'bounce', at: { man: 1, limb: 'mid' }, w: 1.3 },
  { t: 88.781, kind: 'bounce', at: { man: 0, limb: 'knee' }, w: 1.3 },
  { t: 89.223, kind: 'catch', man: 1, w: 0.6 },
  { t: 89.652, kind: 'kick', man: 1, w: 1.3 },
  { t: 90.198, kind: 'bounce', at: { staff: true }, w: 1.2 },
  { t: 90.523, kind: 'bounce', at: { man: 1, limb: 'up' }, w: 1.0 },
  { t: 91.069, kind: 'bounce', at: { man: 0, limb: 'up' }, w: 0.7 },
  { t: 91.614, kind: 'bounce', at: { man: 1, limb: 'up' }, w: 0.5 },
  { t: 91.951, kind: 'bounce', at: { staff: true }, w: 1.0 },
  { t: 92.706, kind: 'bounce', at: { man: 2, limb: 'up' }, w: 1.0 },
  { t: 93.031, kind: 'bounce', at: { man: 3, limb: 'up' }, w: 1.3 },
  { t: 93.24, kind: 'bounce', at: { man: 2, limb: 'mid' }, w: 1.2 },
  { t: 93.669, kind: 'bounce', at: { man: 3, limb: 'mid' }, w: 1.3 },
  { t: 94.006, kind: 'bounce', at: { man: 2, limb: 'knee' }, w: 1.0 },
  { t: 94.447, kind: 'catch', man: 2, w: 0.8 },
  { t: 94.877, kind: 'kick', man: 2, w: 1.1 },
  { t: 95.422, kind: 'bounce', at: { gong: true }, w: 1.5 },
  { t: 95.747, kind: 'bounce', at: { man: 2, limb: 'up' }, w: 1.2 },
  { t: 95.968, kind: 'bounce', at: { man: 3, limb: 'mid' }, w: 0.8 },
  { t: 96.189, kind: 'catch', man: 2, w: 0.8 },
  // The last kick is the jump: she leaves the leg as the seam says, up and to the right.
  { t: 97.152, kind: 'kick', man: 2, w: 1.5, v: [2.0, 2.2], pre: 0.09 },
]

/** The show time the ball comes in, where (the hall is placed so the entry is exactly the seam's), and its velocity. */
export const ENTRY = { t: 86.297, v: [2.4, 0.6] as V }

export interface FightPlan {
  men: ManPlan[]
  staff: StaffPlan
  gong: GongPlan
  /** The ball at every strike, in order, and what it does there. */
  path: { t: number; p: V; kind: Ev['kind']; man?: number; n: V; w: number }[]
  /** Every strike's show time. */
  hits: number[]
}

/** A flight from `a` at `ta` to `b` at `tb` under G: the velocity it leaves with and the one it lands with. */
export function flight(a: V, ta: number, b: V, tb: number): { out: V; in: V } {
  const T = tb - ta
  const vx = (b[0] - a[0]) / T
  const vh = (b[1] - a[1]) / T + 0.5 * G * T
  return { out: [vx, vh], in: [vx, vh - G * T] }
}

/** Work the fight out: the contact on every limb, every leg's wind and kick, the staff's swing and the gong. */
export function fight(): FightPlan {
  const men: ManPlan[] = MEN.map((m) => ({ ...m, blows: [], acts: [] }))
  const staff: StaffPlan = { x: STAFF_X, t1: 90.198, t2: 91.951, a1: deg(38), a2: 0.45 }
  const gong: GongPlan = { c: GONG_C, t: 95.422, n: [-0.6, -0.8] }
  const ev = EVENTS
  const n = ev.length
  let ns: V[] = ev.map(() => [0, 1])
  let ths: number[] = ev.map(() => LEG.chamber)
  let pts: V[] = []
  const vIn: V[] = ev.map(() => [0, 0])
  const vOut: V[] = ev.map(() => [0, 0])
  // The first strike's incoming velocity is the seam's flight, carried on under G to the first onset.
  const T0 = ev[0].t - ENTRY.t
  const in0: V = [ENTRY.v[0], ENTRY.v[1] - G * T0]

  const rebuild = () => {
    // The limbs' blows and acts from the current guess, so every pose below sees the others' rocking.
    for (const m of men) {
      m.blows = []
      m.acts = []
    }
    ev.forEach((e, i) => {
      if (e.kind === 'bounce' && 'man' in e.at) men[e.at.man].blows.push({ t: e.t, n: ns[i], limb: e.at.limb, w: e.w })
      if (e.kind === 'bounce' && 'gong' in e.at) gong.n = ns[i]
      if (e.kind === 'catch') men[e.man].blows.push({ t: e.t, n: [0, 1], limb: 'seat', w: e.w * 0.6 })
      if (e.kind === 'catch') {
        const k = ev[i + 1]
        const vin = vIn[i]
        const r = Math.hypot(LEG.seat, LEG.r + R)
        const speed = len(vOut[i + 1]) || 6
        // The leg gives at the speed she lands with, and leaves at the speed she is kicked with.
        const dip = Math.min(0.3, (Math.max(0, -vin[1]) * 0.07) / (Math.E * r))
        const pre = k.kind === 'kick' ? k.pre ?? 0 : 0
        men[e.man].acts.push({ kind: 'kick', tc: e.t, tr: k.t, th: ths[i + 1], dip, omega: speed / r, pre })
      }
      if (e.kind === 'bounce' && 'man' in e.at && e.at.limb === 'knee') men[e.at.man].acts.push({ kind: 'knee', t: e.t })
    })
    for (const m of men) {
      m.blows.sort((a, b) => a.t - b.t)
      m.acts.sort((a, b) => (a.kind === 'knee' ? a.t : a.tc) - (b.kind === 'knee' ? b.t : b.tc))
    }
  }

  const position = (i: number): V => {
    const e = ev[i]
    if (e.kind === 'catch') return seatAt(men[e.man], e.t, LEG.chamber)
    if (e.kind === 'kick') return seatAt(men[e.man], e.t, ths[i])
    const at = e.at
    if ('staff' in at) return add(staffFoot(staff, e.t), mul(ns[i], R + STAFF.r))
    if ('gong' in at) return gongContact(gong.c, ns[i])
    // A limb's rounded end, as the man stands at that instant (its own blow has not moved it yet).
    const m = men[at.man]
    const c = at.limb === 'knee' ? legAt(m, e.t).knee : armAt(m, at.limb, e.t).tip
    const r = at.limb === 'knee' ? LEG.r : ARM.r
    return add(c, mul(ns[i], R + r))
  }

  for (let it = 0; it < 120; it++) {
    rebuild()
    pts = ev.map((_, i) => position(i))
    for (let i = 0; i < n; i++) {
      const e = ev[i]
      vIn[i] = i === 0 ? in0 : e.kind === 'kick' ? [0, 0] : flight(pts[i - 1], ev[i - 1].t, pts[i], e.t).in
      if (e.kind === 'catch') vOut[i] = [0, 0]
      else if (e.kind === 'kick' && e.v) vOut[i] = e.v
      else vOut[i] = flight(pts[i], e.t, pts[i + 1], ev[i + 1].t).out
    }
    let moved = 0
    for (let i = 0; i < n; i++) {
      const e = ev[i]
      if (e.kind === 'bounce') {
        const want = norm(sub(vOut[i], vIn[i]))
        moved = Math.max(moved, len(sub(want, ns[i])))
        // Relax toward it, so the contacts settle together.
        ns[i] = norm(add(mul(ns[i], 0.5), mul(want, 0.5)))
      } else if (e.kind === 'kick') {
        const m = men[e.man]
        const v = vOut[i]
        // She sits up off the thigh's line, so she moves square to the line from the hip to her, not to the thigh.
        const want = Math.atan2(-m.s * v[0], v[1]) - Math.atan2(LEG.r + R, LEG.seat)
        moved = Math.max(moved, Math.abs(want - ths[i]))
        ths[i] = ths[i] * 0.5 + want * 0.5
      }
    }
    if (moved < 1e-7 && it > 10) break
  }
  rebuild()
  pts = ev.map((_, i) => position(i))
  return {
    men,
    staff,
    gong,
    path: ev.map((e, i) => ({
      t: e.t,
      p: pts[i],
      kind: e.kind,
      man: e.kind === 'bounce' ? ('man' in e.at ? e.at.man : undefined) : e.man,
      n: e.kind === 'bounce' ? ns[i] : [0, 1],
      w: e.w,
    })),
    hits: ev.map((e) => e.t),
  }
}

/** Every strike the dojo makes, in show seconds: the flurry's onsets, and the jump. */
export const FIGHT_HITS = EVENTS.map((e) => e.t)

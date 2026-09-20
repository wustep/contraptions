import type p5 from 'p5'
import { outline, solid } from '../../../../../../src/core/draw'
import { clamp } from '../../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, post, rail, ramp, rankBy, roll, trace, type Lane, type Pt } from '../../../parts'

/**
 * A slinky at the head of two wide stairs. The rail ends at the rim of its
 * top coil and the ball drops in, a snug fit, like an egg into a cup; the
 * stack sinks under it, comes back, and tips: the top goes over in an arc
 * to the stair below with the ball in its end, lands mouth down, and the
 * coils pour over after it, one stack emptying as the other fills. The last
 * of them goes straight on over, to the next stair down, and this time the
 * ball's end is the tail: it is drawn up off the tread last of all, over
 * the top, and comes down on the new stack mouth up, and with the way it
 * still has on it nods over till its rim meets the end of the rail, where
 * the ball rolls out of it. Let go of the weight it springs back, sways,
 * and stands. The stairs are half a floor each, or a whole one, and then
 * the slinky stretches to twice its reach.
 *
 * Every coil goes over the same arch, each a moment after the one before,
 * so at any instant the slinky is what is left of one stack, the arch, and
 * what there is yet of the other. The ball's lane is its own coil's.
 */
type Floors = 1 | 2

/** The coils: how many, how far apart stacked, how wide, and how far the band runs on past its end coils. */
const N = 11
const PITCH = 0.032
const WIDE = 0.31
const WIRE = 0.03
/** Where the ball sits from its end coil, along the slinky: half out of the cup, and flush with the rim once a tread has pushed it home. */
const PROUD = WIRE
const HOME = R - WIRE

/** The three places it stands: two treads and the ground at the stairs' foot. The ball rests this far under the rail in the cup; the last stack's top is this far under the rail out, and the nod brings its mouth up level with it, this far on. */
const STAND = [-0.06, 0.5, 1.04]
const STACK = WIRE + (N - 1) * PITCH
const CUP_Y = 0.1
const DIP = 0.5 - STACK
const MOUTH = STAND[2] + 0.23
/** How high the arch stands over the stack it leaves; the nod is the first half of a lower one. */
const ARCH = 0.3
const REACH = DIP / 0.75
/** How many coils the nod takes with it. */
const NODDERS = 6

/** The clock. Off the rail's lip into the cup; the stack's sink and return; the wait between coils; the nod, and how long its mouth stays down on the rail. */
const LIP = STAND[0] - WIDE / 2 - 0.01
const T_LIP = (LIP + 0.5) / ROLL
const DROP = 0.085
const T_CUP = T_LIP + DROP
const SINK = 0.2
const T1 = T_CUP + SINK
const NEXT = 0.05
const NOD = 0.22
const HELD = 0.16
/** The nod is a swing cut short: the rail stops it with this much of a quarter turn done. */
const SHORT = 0.8 * (Math.PI / 2)

interface Plan {
  floors: Floors
  /** What it stands on at each of the three: two treads, and the ground. */
  tread: number[]
  /** Seconds a coil takes over the arch: longer for the longer fall. */
  over: number
  /** The second going-over begins; the ball's end lands on the last stack; the mouth meets the rail and the ball rolls out. */
  t2: number
  t3: number
  out: number
  lane: Lane
  cells: Pt[]
  exit: Pt
}

/** A cubic from `s`, straight up out of it, over, and straight down into `e`. */
function arch(s: Pt, e: Pt, lift: number, u: number): Pt {
  const v = 1 - u
  const a = v * v * v
  const b = 3 * v * v * u
  const c = 3 * v * u * u
  const d = u * u * u
  return [(a + b) * s[0] + (c + d) * e[0], a * s[1] + b * (s[1] - lift) + c * (e[1] - lift) + d * e[1]]
}

/** A going-over starts slowly and lands with its way on. */
const going = (v: number) => 1 - Math.cos((clamp(v) * Math.PI) / 2)

/** The top stack sinks under the ball and comes back. */
const sunk = (t: number) => (t < T_CUP ? 1 : 1 - 0.16 * Math.exp(-(t - T_CUP) * 9) * Math.sin((t - T_CUP) * 24))

/** How far over the nod is: on from the landing and slowing, stopped short by the rail, held there while the ball rolls out, then swaying less and less either side of upright. */
function nodAt(plan: Plan, t: number): number {
  const u = t - plan.t3
  if (u <= 0) return 0
  if (u < NOD) return Math.sin((u / NOD) * SHORT) / Math.sin(SHORT)
  if (u < NOD + HELD) return 1
  const w = u - NOD - HELD
  return Math.exp(-w * 2.6) * Math.cos(w * 7.5)
}

/** Coil `i` (0 is the ball's end; fractions fall between coils), `t` seconds in. */
function coilAt(plan: Plan, i: number, t: number): Pt {
  const { tread, over, t2, t3 } = plan
  const inA: Pt = [STAND[0], tread[0] - WIRE - (N - 1 - i) * PITCH * sunk(t)]
  const inB: Pt = [STAND[1], tread[1] - WIRE - i * PITCH]
  const inC: Pt = [STAND[2], tread[2] - WIRE - (N - 1 - i) * PITCH]
  if (t < t2 + (N - 1 - i) * NEXT) return arch(inA, inB, ARCH, going((t - T1 - i * NEXT) / over))
  if (t < t3 || i >= NODDERS) return arch(inB, inC, ARCH, going((t - t2 - (N - 1 - i) * NEXT) / over))
  // The nod: the top coils lean over, the end coil as far as the top of an arch, the rest in proportion.
  const nod = nodAt(plan, t)
  const to = STAND[2] + 2 * (MOUTH - STAND[2]) * Math.sign(nod)
  return arch(inC, [to, inC[1]], REACH, 0.5 * (1 - i / NODDERS) * Math.abs(nod))
}

/** The way along the slinky at coil `i`, from the ball's end on. */
function alongAt(plan: Plan, i: number, t: number): Pt {
  const a = coilAt(plan, Math.max(0, i - 0.2), t)
  const b = coilAt(plan, Math.min(N - 1, i + 0.2), t)
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d]
}

/** The ball: in its end coil, proud of it until the first tread pushes it home, and never through a tread. */
function ballAt(plan: Plan, t: number): Pt {
  const [x, y] = coilAt(plan, 0, t)
  const [ax, ay] = alongAt(plan, 0, t)
  if (t <= T1 + plan.over) return [x - ax * PROUD, Math.min(y - ay * PROUD, plan.tread[1] - R)]
  return [x + ax * HOME, y + ay * HOME]
}

function planFor(floors: Floors): Plan {
  const top = CUP_Y + PROUD + STACK
  const foot = floors + 0.5
  const over = floors === 1 ? 0.42 : 0.5
  const t2 = T1 + (N - 1) * NEXT + over
  const t3 = t2 + (N - 1) * NEXT + over
  const out = t3 + NOD
  const cells: Pt[] = []
  for (let y = 0; y <= floors; y++) cells.push([0, y], [1, y])
  const plan: Plan = { floors, tread: [top, (top + foot) / 2, foot], over, t2, t3, out, cells, exit: [2, floors], lane: { segs: [], fire: T1 } }
  // Out of the mouth along the rail, at the pace the nod still had when the rail stopped it.
  const at = (t: number) => ballAt(plan, t)
  const [a, b] = [at(out - 0.002), at(out)]
  const pace = Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.002
  plan.lane = {
    segs: [roll([-0.5, 0], [LIP, 0], ROLL), fly([LIP, 0], at(T_CUP), DROP, CUP_Y / 4), ...trace(at, T_CUP, out, 180), ramp(b, [1.5, floors], pace, ROLL)],
    fire: T1,
  }
  return plan
}

const PLANS: Record<Floors, Plan> = { 1: planFor(1), 2: planFor(2) }

/** The coils' lines across the band, from coil 0 to coil `n - 1`. */
function coils(p: p5, k: number, plan: Plan, t: number, n = N): void {
  for (let i = 0; i < n; i++) {
    const [x, y] = coilAt(plan, i, t)
    const [ax, ay] = alongAt(plan, i, t)
    p.line((x - (ay * WIDE) / 2) * k, (y + (ax * WIDE) / 2) * k, (x + (ay * WIDE) / 2) * k, (y - (ax * WIDE) / 2) * k)
  }
}

export const slinky = definePiece<{ color: string; floors: Floors }>({
  name: 'slinky',
  weight: 0.8,
  flight: true,
  place: ({ rng, color, fits }) => {
    for (const floors of rankBy(rng, [1, 2] as const, () => 1)) {
      const plan = PLANS[floors]
      if (!fits(plan.cells, plan.exit)) continue
      return { cells: plan.cells, exit: { at: plan.exit, dir: 1 }, lane: plan.lane, state: { color, floors } }
    }
    return null
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const plan = PLANS[s.floors]
    const { tread, floors } = plan
    // The stairs: one block, two treads, and the ground at its foot; the rail in on a post off the top tread, the rail out on its own.
    const risers = [STAND[0] + 0.28, STAND[1] + 0.28]
    solid(p, ink, weight, bg)
    p.beginShape()
    p.vertex(-0.32 * k, tread[0] * k)
    p.vertex(risers[0] * k, tread[0] * k)
    p.vertex(risers[0] * k, tread[1] * k)
    p.vertex(risers[1] * k, tread[1] * k)
    p.vertex(risers[1] * k, tread[2] * k)
    p.vertex(-0.32 * k, tread[2] * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight)
    p.line(risers[1] * k, tread[2] * k, (STAND[2] + 0.22) * k, tread[2] * k)
    rail(p, k, ink, weight, -0.5, LIP)
    post(p, k, ink, weight, -0.28, FLOOR, tread[0])
    rail(p, k, ink, weight, MOUTH + WIRE, 1.5, floors + FLOOR)
    post(p, k, ink, weight, 1.43, floors + FLOOR, floors + 0.5)

    // The slinky: one band along the coils, run on a wire's width past each end, and a line across it at each coil.
    const left: Pt[] = []
    const right: Pt[] = []
    const edge = (x: number, y: number, ax: number, ay: number) => {
      left.push([x - (ay * WIDE) / 2, y + (ax * WIDE) / 2])
      right.push([x + (ay * WIDE) / 2, y - (ax * WIDE) / 2])
    }
    for (let j = 0; j <= (N - 1) * 4; j++) {
      const i = j / 4
      const [x, y] = coilAt(plan, i, t)
      const [ax, ay] = alongAt(plan, i, t)
      if (j === 0) edge(x - ax * WIRE, y - ay * WIRE, ax, ay)
      edge(x, y, ax, ay)
      if (j === (N - 1) * 4) edge(x + ax * WIRE, y + ay * WIRE, ax, ay)
    }
    solid(p, ink, weight, s.color)
    p.beginShape()
    for (const [x, y] of left) p.vertex(x * k, y * k)
    for (const [x, y] of right.reverse()) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)
    outline(p, ink, weight * 0.6)
    coils(p, k, plan, t)
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The near half of every coil the ball is inside: the cup's rim alone while it rides proud, and all of them once it is home.
    const plan = PLANS[s.floors]
    outline(p, ink, weight * 0.6)
    coils(p, k, plan, t, t <= T1 + plan.over ? 1 : N)
  },
})

import type p5 from 'p5'
import { outline, solid } from '../../../../../src/core/draw'
import { easeInOutSine, easeOutCubic } from '../../../../../src/core/ease'
import { FLOOR, R, ROLL, definePiece, fly, mixHex, over, post, rail, ramp, roll, wait, type Lane, type Pt } from '../../parts'
import { glow, score, tube } from './neon'

/**
 * A popcorn cart. A glass case with an open top stands on a cart on two
 * spoked wheels; inside it a kettle sits on its element. The rail runs in
 * through the case's side onto a chute that climbs to a tip over the
 * kettle's lip; the ball slows up the chute, rolls off the tip and drops
 * into the kettle, out of sight. The element lights, the kettle shakes,
 * and kernels burst up out of it, white, slowly and then faster and
 * faster, and the case fills with them from the floor up, a hollow kept
 * open over the kettle; then the ball comes up through the heap, out of
 * the kettle and out of the open top in a spray of popcorn, high over the
 * case and down onto the shelf a floor up, where it lands and rolls on.
 * The heap stands over the top of the case, and some of it has gone over
 * the sides onto the floor by the cart. Later it is served out again from
 * the top down, and the floor is swept.
 *
 * The popcorn is behind the ball, always: a kernel in front of it sat on
 * it like a wart.
 */
export interface PopcornState {
  color: string
  kernels: Kernel[]
}
/** A kernel: where it pops from, how fast forward and up, when, and where it comes to lie. */
interface Kernel {
  x0: number
  vx: number
  vy: number
  at: number
  landX: number
  landY: number
}

/** The case, and the cart under it. */
const CASE = { x0: -0.34, x1: 0.34, top: -0.42, bottom: 0.38 }
/** The case's uprights, in the colour, like a bezel. */
const POST_W = 0.05
const CART = { y0: 0.38, y1: 0.44 }
const WHEEL = 0.085
const AXLES = [-0.25, 0.25]
/** The chute: from the case's wall up to its tip over the kettle. */
const WALL: Pt = [CASE.x0 + POST_W, 0]
const TIP: Pt = [-0.14, -0.08]
const V_TIP = 0.8
/** The kettle: its rim, its bottom, how wide; the element under it. */
const RIM = 0.06
const KETTLE_BOTTOM = 0.36
const KETTLE_W = 0.32
const ELEMENT_Y = KETTLE_BOTTOM + 0.012
/** The shelf a floor up, and where the ball comes down on it. */
const SHELF0 = 0.2
const LAND: Pt = [0.32, -1]
const HEAT = 0.7637
/** Show gravity for the pop, and how high it goes: the top of the cell above, less the ball. */
const G = 12
const POP_ARC = 0.85
const POP = Math.sqrt((8 * POP_ARC) / G)
/** Off the tip at the chute's pace, falling into the kettle: where it lands is where the kettle is. */
const DROP = Math.sqrt((2 * (KETTLE_BOTTOM - 0.02 - R - TIP[1])) / 10)
const SEAT: Pt = [TIP[0] + V_TIP * DROP, KETTLE_BOTTOM - 0.02 - R]
const KX = SEAT[0]
const T_WALL = (WALL[0] + 0.5) / ROLL
const CLIMB = ramp(WALL, TIP, ROLL, V_TIP)
const T_SEAT = T_WALL + CLIMB.dur + DROP
const T_POP = T_SEAT + HEAT
const LANE: Lane = {
  segs: [
    roll([-0.5, 0], WALL, ROLL),
    CLIMB,
    fly(TIP, SEAT, DROP, (SEAT[1] - TIP[1]) / 4),
    wait(SEAT, HEAT, { hidden: true }),
    fly(SEAT, LAND, POP, POP_ARC),
    fly(LAND, [LAND[0] + 0.05, -1], 0.04, 0.01),
    ramp([LAND[0] + 0.05, -1], [0.5, -1], 1.2, ROLL),
  ],
  fire: T_POP,
}
const KG = 10
const KERNEL = 0.024

/** Where the kernels leave from, down in the kettle. */
const MOUTH = SEAT[1] - 0.04

/**
 * A popped piece: fat, this far from its middle to the ends of its lobes,
 * and the three lobes it is made of, each along, down and how far across in
 * its own size. They are laid one on another with their outlines on, so the
 * creases between them show.
 */
const CORN = 0.08
const LOBES: [number, number, number][] = [
  [-0.42, 0.24, 1.08],
  [0.46, 0.18, 1.0],
  [0.02, -0.34, 1.16],
]
/** The same scatter every time: 0 to 1 from an index and a salt. */
const hash = (i: number, salt: number): number => {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/** The heap's rows: how far apart the pieces lie in one, and one row above the next. */
const PITCH = 0.116
const ROW = 0.1
/** The hollow the popping keeps open in the heap over the kettle: how deep, how wide. */
const HOLLOW = 0.12
const hollow = (x: number): number => HOLLOW * Math.exp(-(((x - KX) / 0.13) ** 2))

/** A piece lying in the heap: where, how big, how it leans, which shade of pale, and how high the heap has to stand to have it. */
interface Piled {
  x: number
  y: number
  r: number
  lean: number
  shade: number
  level: number
}
/**
 * The heap: every piece that comes to lie in the case, in rows from its
 * floor to a crown standing proud of the open top and out over the
 * uprights. The ones the kettle's front would hide are left out. They are
 * in the order the heap takes them: from the bottom up, and over the kettle
 * last, where the popping keeps the hollow open until the end.
 */
const HEAP: Piled[] = (() => {
  const out: Piled[] = []
  for (let row = 0; row < 16; row++) {
    const y0 = CASE.bottom - 0.07 - row * ROW
    const proud = Math.max(0, CASE.top + CORN - y0)
    if (proud > 0.3) break
    const half = 0.335 * Math.sqrt(1 - (proud / 0.3) ** 2)
    for (let a = row % 2 ? 0 : PITCH / 2; a <= (proud > 0 ? half : 0.27); a += PITCH) {
      for (const side of a > 0 ? [-1, 1] : [1]) {
        const n = row * 16 + Math.round(a / PITCH) * 2 + (side > 0 ? 1 : 0)
        const x = side * a + (hash(n, 1) - 0.5) * 0.03
        const y = y0 + (hash(n, 2) - 0.5) * 0.03
        const r = CORN * (0.88 + 0.24 * hash(n, 3))
        const behind = x - 0.3 * r > KX - KETTLE_W / 2 && x + 0.3 * r < KX + KETTLE_W / 2 && y - 0.5 * r > RIM + 0.03
        if (!behind) out.push({ x, y, r, lean: (hash(n, 4) - 0.5) * 1.2, shade: Math.floor(hash(n, 5) * 3), level: y - hollow(x) })
      }
    }
  }
  return out.sort((a, b) => b.level - a.level)
})()

/** When the heap is full, when it starts to be served out again, and when the case is empty. */
const T_FULL = T_POP + 0.8
const T_SERVE = T_POP + 1.2
const T_EMPTY = T_POP + 2.4
/**
 * How much of the heap is there: none until the kettle is hot, more and
 * faster while it pops, over the top once the ball has gone up through it,
 * and served out again afterwards from the top down.
 */
function heaped(t: number): number {
  if (t <= T_SEAT) return 0
  if (t < T_POP) return 0.7 * Math.pow(over(t, T_SEAT + 0.06, T_POP), 1.8)
  if (t < T_SERVE) return 0.7 + 0.3 * easeOutCubic(over(t, T_POP, T_FULL))
  return 1 - easeInOutSine(over(t, T_SERVE, T_EMPTY))
}
/** The heap's top at `x`: where a piece coming down is lost in it. */
function surface(x: number, t: number): number {
  const n = Math.floor(heaped(t) * HEAP.length)
  return (n > 0 ? HEAP[n - 1].level : CASE.bottom) + hollow(x) - CORN * 0.5
}

/** One hop of a piece through the air: from where, how fast along and up, for how long. */
interface Hop {
  x: number
  y: number
  vx: number
  vy: number
  dur: number
}
/** A piece thrown up out of the kettle: when, its hops one after another, whether it lies where the last one ends or is lost in the heap, and how it tumbles. */
interface Flier {
  at: number
  hops: Hop[]
  air: number
  lies: boolean
  r: number
  turn: number
  spin: number
}
/** How long a piece is in the air from `y0` to `y1`, leaving upward at `vy`. */
const airtime = (y0: number, y1: number, vy: number): number => (-vy + Math.sqrt(vy * vy + 2 * KG * (y1 - y0))) / KG
/** A hop from `from` to `to`, leaving upward at `vy`. */
function hop(from: Pt, to: Pt, vy: number): Hop {
  const dur = airtime(from[1], to[1], vy)
  return { x: from[0], y: from[1], vx: (to[0] - from[0]) / dur, vy, dur }
}
/** A hop that leaves at `at` and comes down over `toX` on the heap, wherever its top has got to by then. */
function ontoHeap(at: number, from: Pt, toX: number, vy: number): Hop {
  let dur = -vy / KG
  while (from[1] + vy * dur + (KG / 2) * dur * dur < surface(toX, at + dur)) dur += 1 / 240
  return { x: from[0], y: from[1], vx: (toX - from[0]) / dur, vy, dur }
}
const flier = (i: number, at: number, hops: Hop[], lies: boolean): Flier => ({
  at,
  hops,
  air: hops.reduce((sum, h) => sum + h.dur, 0),
  lies,
  r: CORN * (0.95 + 0.25 * hash(i, 6)),
  turn: hash(i, 7) * 6.28,
  spin: (hash(i, 8) - 0.5) * 16,
})

/**
 * What pops while the kettle heats: slowly at first, then faster and
 * faster and higher and higher, each one up out of the kettle's mouth and
 * down onto the heap.
 */
const POPPING = 18
const POPS: Flier[] = Array.from({ length: POPPING }, (_, i) => {
  const u = i / (POPPING - 1)
  const at = T_SEAT + 0.1 + (HEAT - 0.13) * Math.pow(u, 0.62)
  const from: Pt = [KX + (hash(i, 1) - 0.5) * 0.2, MOUTH]
  return flier(i, at, [ontoHeap(at, from, (hash(i, 3) - 0.5) * 0.48, -(2.3 + 1.7 * u + 0.9 * hash(i, 2)))], false)
})

/** Where a piece comes to lie outside the case: on the floor off either end of the cart, and on the cart's ledge against either upright. */
const FLOOR_Y = 0.5 - CORN * 0.8
const LEDGE_Y = CART.y0 - CORN * 0.8
const TOP_Y = CASE.top - CORN * 0.8
/** How fast a piece skips up off an upright's top. */
const SKIP = -1.8
/**
 * The spray that goes up with the ball: most of it up out of the open top
 * and back down onto the heap; the rest over the sides, onto an upright's
 * top or the cart's ledge and off it again, down to the floor. On the far
 * side none goes as high as the shelf.
 */
const SPRAY: Flier[] = (() => {
  const out: Flier[] = []
  const from = (i: number): Pt => [KX + (hash(i, 9) - 0.5) * 0.18, MOUTH]
  const back: [number, number][] = [
    [-0.2, -4.9],
    [-0.1, -5.3],
    [0.02, -4.5],
    [0.13, -3.9],
    [0.22, -3.6],
    [-0.24, -4.2],
    [-0.04, -5.05],
    [0.08, -3.4],
    [-0.15, -3.7],
    [0.17, -4.1],
  ]
  back.forEach(([toX, vy], i) => out.push(flier(40 + i, T_POP, [ontoHeap(T_POP, from(i), toX, vy)], false)))
  // Off the ledge on the near side and onto the floor, with a last skip.
  out.push(flier(51, T_POP, [hop(from(11), [-0.372, LEDGE_Y], -5.25), hop([-0.372, LEDGE_Y], [-0.425, FLOOR_Y], -1.7), hop([-0.425, FLOOR_Y], [-0.44, FLOOR_Y], -0.9)], true))
  // Onto the near upright's top, and off it down to the ledge.
  out.push(flier(52, T_POP, [hop(from(12), [-0.315, TOP_Y], -4.7), hop([-0.315, TOP_Y], [-0.374, LEDGE_Y], -1.4)], true))
  // Onto the far upright's top, and off it to the floor.
  out.push(flier(53, T_POP, [hop(from(13), [0.315, TOP_Y], -4.2), hop([0.315, TOP_Y], [0.42, FLOOR_Y], -2), hop([0.42, FLOOR_Y], [0.438, FLOOR_Y], -0.9)], true))
  // And one more the same way, that stays on the ledge.
  out.push(flier(54, T_POP, [hop(from(14), [0.315, TOP_Y], -3.8), hop([0.315, TOP_Y], [0.374, LEDGE_Y], -1.2)], true))
  return out
})()

/** A popped piece at (x, y): `lobes` of its three, turned by `turn`. The fill and the line are the caller's. */
function corn(p: p5, k: number, x: number, y: number, r: number, turn: number, lobes = 3): void {
  const c = Math.cos(turn) * r * k
  const s = Math.sin(turn) * r * k
  for (let i = 0; i < lobes; i++) {
    const [u, v, d] = LOBES[i]
    p.circle(x * k + u * c - v * s, y * k + u * s + v * c, d * r * k)
  }
}

/** A flier at `t`: bursting fat as it leaves, tumbling through its hops, then lying where it lit until it is swept up, or gone into the heap. */
function fling(p: p5, k: number, f: Flier, t: number, swept: number): void {
  let age = t - f.at
  if (age <= 0) return
  const grown = over(age, 0, 0.1)
  const size = f.r * (0.3 + 0.7 * grown + 0.3 * Math.sin(Math.PI * grown))
  const turn = f.turn + f.spin * Math.min(age, f.air)
  for (const h of f.hops) {
    if (age < h.dur) {
      corn(p, k, h.x + h.vx * age, h.y + h.vy * age + (KG / 2) * age * age, size, turn)
      return
    }
    age -= h.dur
  }
  if (!f.lies) return
  const left = 1 - over(t, swept, swept + 0.2)
  if (left <= 0) return
  const last = f.hops[f.hops.length - 1]
  corn(p, k, last.x + last.vx * last.dur, last.y + last.vy * last.dur + (KG / 2) * last.dur * last.dur + f.r * (1 - left), f.r * left, turn)
}

/**
 * One of the cart's own kernels at `t`, as fat as the rest. The ones that
 * stay in the case go up and come down into the heap, and are lost in it.
 * The ones that go over the side come down on that side's upright, skip off
 * its top and fall to the floor by the cart's end, no nearer the cell's
 * edge than their size lets them, and lie there until they are swept up.
 */
function kernel(p: p5, k: number, q: Kernel, t: number, swept: number): void {
  let age = t - q.at
  if (age <= 0) return
  const grown = over(age, 0, 0.1)
  const size = CORN * (0.3 + 0.7 * grown + 0.3 * Math.sin(Math.PI * grown))
  const turn = q.x0 * 90 + q.vx * 6 * age
  if (q.landY < CASE.bottom) {
    const x = q.x0 + (q.landX - q.x0) * (age / airtime(MOUTH, q.landY, q.vy))
    const y = MOUTH + q.vy * age + (KG / 2) * age * age
    if (q.vy + KG * age < 0 || y < surface(x, t)) corn(p, k, x, y, size, turn)
    return
  }
  const side = q.landX < 0 ? -1 : 1
  const topX = side * (0.305 + 0.2 * Math.abs(q.x0 - KX))
  const vy = side > 0 ? Math.max(q.vy, -4.2) : q.vy
  const up = airtime(MOUTH, TOP_Y, vy)
  if (age < up) {
    corn(p, k, q.x0 + (topX - q.x0) * (age / up), MOUTH + vy * age + (KG / 2) * age * age, size, turn)
    return
  }
  age -= up
  const restX = side * Math.min(0.44, Math.abs(q.landX))
  const down = airtime(TOP_Y, FLOOR_Y, SKIP)
  if (age < down) {
    corn(p, k, topX + (restX - topX) * (age / down), TOP_Y + SKIP * age + (KG / 2) * age * age, size, turn)
    return
  }
  const left = 1 - over(t, swept, swept + 0.2)
  if (left > 0) corn(p, k, restX, FLOOR_Y + CORN * (1 - left), CORN * left, q.x0 * 90 + q.vx * 6 * (up + down))
}

/** The kettle's front: a pot in the colour, round in the bottom, under a pale lip a shade wider. */
function kettle(p: p5, k: number, ink: string, weight: number, color: string, shake: number): void {
  solid(p, ink, weight, color)
  p.rect((KX + shake) * k, ((RIM + KETTLE_BOTTOM) / 2) * k, KETTLE_W * k, (KETTLE_BOTTOM - RIM) * k, 0.01 * k, 0.01 * k, 0.1 * k, 0.1 * k)
  solid(p, ink, weight, ink)
  p.rect((KX + shake) * k, (RIM + 0.015) * k, (KETTLE_W + 0.04) * k, 0.03 * k, 0.015 * k)
}

export const popcorn = definePiece<PopcornState>({
  name: 'popcorn',
  points: 100,
  weight: 0.9,
  flight: true,
  place: ({ rng, color, fits }) => {
    const cells: Pt[] = [
      [0, 0],
      [0, -1],
    ]
    if (!fits(cells, [1, -1])) return null
    const kernels: Kernel[] = []
    const inside = (x: number) => Math.max(CASE.x0 + 0.05, Math.min(CASE.x1 - 0.05, x))
    // The ones that burst while it heats stay in the case.
    for (let i = 0; i < 9; i++) {
      const vx = (rng.next() - 0.5) * 1.6
      const vy = -(1.5 + 1.3 * rng.next())
      const x0 = KX + (rng.next() - 0.5) * 0.16
      const landY = CASE.bottom - KERNEL
      const T = (-vy + Math.sqrt(vy * vy + 2 * KG * (landY - SEAT[1] + 0.04))) / KG
      kernels.push({ x0, vx, vy, at: T_SEAT + 0.1 + i * 0.06, landX: inside(x0 + vx * T), landY })
    }
    // The spray that comes up with the ball goes out of the top and comes down round the cart.
    for (let i = 0; i < 6; i++) {
      const vx = (rng.next() - 0.5) * 2.6
      const vy = -(3.6 + 1.4 * rng.next())
      const x0 = KX + (rng.next() - 0.5) * 0.16
      let landY = 0.5 - KERNEL
      let T = (-vy + Math.sqrt(vy * vy + 2 * KG * (landY - SEAT[1] + 0.04))) / KG
      let landX = x0 + vx * T
      if (Math.abs(landX) < CASE.x1 + 0.04) {
        landY = CASE.bottom - KERNEL
        T = (-vy + Math.sqrt(vy * vy + 2 * KG * (landY - SEAT[1] + 0.04))) / KG
        landX = inside(x0 + vx * T)
      }
      kernels.push({ x0, vx, vy, at: T_POP, landX: Math.max(-0.47, Math.min(0.47, landX)), landY })
    }
    return { cells, exit: { at: [1, -1], dir: 1 }, lane: LANE, state: { color, kernels } }
  },
  draw: (p, s, { k, t, ink, bg, weight }) => {
    const heat = t < T_SEAT ? 0 : 1 - over(t, T_POP + 0.3, T_POP + 1.2)

    // The rail in, and the shelf a floor up on its post, clear of the cart.
    rail(p, k, ink, weight, -0.5, CASE.x0 + POST_W)
    rail(p, k, ink, weight, SHELF0, 0.5, -1 + FLOOR)
    post(p, k, ink, weight, 0.44, -1 + FLOOR, 0.5)
    // The case: a pane of glass, a shade off the night, between two uprights in the colour; open at the top, the lane's doorway cut in the near upright.
    p.noStroke()
    p.fill(mixHex(bg, ink, 0.08))
    p.rect(0, ((CASE.top + CASE.bottom) / 2) * k, (CASE.x1 - CASE.x0 - POST_W) * k, (CASE.bottom - CASE.top) * k)
    // The chute: a tray up from the wall to its tip on the kettle's lip, a radius under the ball's line.
    const under = R * Math.hypot(1, (TIP[1] - WALL[1]) / (TIP[0] - WALL[0]))
    solid(p, ink, weight, ink)
    p.quad(WALL[0] * k, FLOOR * k, TIP[0] * k, (TIP[1] + under) * k, TIP[0] * k, (TIP[1] + under + 0.025) * k, WALL[0] * k, (FLOOR + 0.025) * k)
    // The kettle's heat on the glass behind.
    glow(p, k, s.color, KX, 0.22, 0.24, heat)
    // The heap: pale, in three shades of it, creased in a line half way to the night; each piece drops in as the heap comes up to it and sinks out as it is served. Behind the ball, behind the kettle's front, and buried chute and all.
    const pale = [ink, mixHex(ink, bg, 0.07), mixHex(ink, bg, 0.14)]
    p.stroke(mixHex(ink, bg, 0.5))
    p.strokeWeight(weight * 0.4)
    const have = heaped(t) * HEAP.length
    for (let i = 0; i < have && i < HEAP.length; i++) {
      const q = HEAP[i]
      const g = Math.min(1, (have - i) / 1.5)
      p.fill(pale[q.shade])
      corn(p, k, q.x, q.y + (t < T_SERVE ? -0.06 : 0.04) * (1 - g), q.r * g, q.lean)
    }
    // The uprights stand in front of the heap, and the element under the kettle is lit while it works.
    solid(p, ink, weight, s.color)
    p.rect((CASE.x0 + POST_W / 2) * k, ((CASE.top - 0.19) / 2) * k, POST_W * k, (-0.19 - CASE.top) * k, 0.01 * k)
    p.rect((CASE.x0 + POST_W / 2) * k, ((FLOOR + 0.02 + CASE.bottom) / 2) * k, POST_W * k, (CASE.bottom - FLOOR - 0.02) * k, 0.01 * k)
    p.rect((CASE.x1 - POST_W / 2) * k, ((CASE.top + CASE.bottom) / 2) * k, POST_W * k, (CASE.bottom - CASE.top) * k, 0.01 * k)
    tube(p, k, ink, weight, s.color, KX - 0.15, ELEMENT_Y, KX + 0.15, ELEMENT_Y, heat)
    // What is in the air, and what has come down outside the case: in front of the heap and the uprights, behind the ball and the wheels.
    p.stroke(mixHex(ink, bg, 0.5))
    p.strokeWeight(weight * 0.4)
    p.fill(ink)
    for (const f of POPS) fling(p, k, f, t, 0)
    SPRAY.forEach((f, i) => fling(p, k, f, t, T_SERVE + 0.15 * (i % 4)))
    s.kernels.forEach((q, i) => kernel(p, k, q, t, T_SERVE + 0.3 + 0.12 * (i % 6)))
    // The cart: a body on two spoked wheels, with the case standing on it.
    solid(p, ink, weight, s.color)
    p.rect(0, ((CART.y0 + CART.y1) / 2) * k, 0.78 * k, (CART.y1 - CART.y0) * k, 0.01 * k)
    for (const x of AXLES) {
      solid(p, ink, weight, bg)
      p.circle(x * k, (0.5 - WHEEL) * k, WHEEL * 2 * k)
      outline(p, ink, weight * 0.6)
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6
        p.line((x - Math.cos(a) * WHEEL) * k, (0.5 - WHEEL - Math.sin(a) * WHEEL) * k, (x + Math.cos(a) * WHEEL) * k, (0.5 - WHEEL + Math.sin(a) * WHEEL) * k)
      }
      solid(p, ink, weight, ink)
      p.circle(x * k, (0.5 - WHEEL) * k, 0.035 * k)
    }
  },
  over: (p, s, { k, t, ink, weight }) => {
    // The kettle stands in front of the ball: it goes in, and comes out of the top.
    const heating = t > T_SEAT && t < T_POP
    kettle(p, k, ink, weight, s.color, heating ? 0.008 * Math.sin(t * 55) : 0)
  },
  // Beside the pop, over the cart's near end and clear of the ball going up the far side.
  scores: (p, s, { k, since, bg }) => score(p, k, s.color, bg, -0.26, -0.5, '+100', since, 1),
})

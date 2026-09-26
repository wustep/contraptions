import type p5 from 'p5'
import { mixHex, R, type Pt } from '../../../../../parts'
import { alpha, box, frame, hash, part, route, smooth, type Company, type Pose, type Way } from '../kit'
import { bar, beat, BEATS, CUT } from '../music'
import { CUTS } from '../seams'
import { CHURCH, HILL, HOME, INK } from '../worlds'
import { TREE_X } from './hill'

/**
 * CLOUDS (49.644 to 63.251, waltz bars 32 to 45): the picnic on the hill, a summer afternoon when they were young.
 *
 * They lie side by side on the blanket on the crest by the tree, looking up. Beside them on the grass stands Carl's
 * toy steam engine: a brass boiler on a little firebox, a chimney, and a flywheel that turns once a bar, steadily,
 * on the waltz. On every downbeat its crank comes round, the valve opens, the chimney's flap lifts and it chuffs one
 * puff of steam. The engine makes the clouds: each puff shoots up out of the chimney along one clear line, a knot of
 * steam with its trail behind it, and on the NEXT downbeat it arrives and joins the shape being built, which swells by
 * it (so every downbeat both launches a puff and grows the shape). The shapes are what the two of them dream of:
 *
 * -  bars 32 to 35: three puffs make an airship (body, tail fins, the gondola slung under it), whole on bar 35; it
 *    sails off left, climbing, behind the tree;
 * -  bars 35 to 39, the loudest of the phrase (a double chuff on 36): Paradise Falls, her tepui in cloud, as tall as it
 *    is wide, the sun on its left; the fifth puff reaches its lip on bar 39 and three falls pour; then a gust takes it
 *    off right, out of the frame by bar 41, while the camera comes down to the two of them;
 * -  bars 39 to 45: low over the two of them, big and whole in the frame, a baby sitting up on a cushion of cloud: its
 *    body (bar 40), its leg out in front (41), its head (42: now it is a baby), its arm reaching up and out (43), the
 *    cloud it sits on (44, 45). He starts; she rolls close to him.
 *
 * At the cut they lie close, at rest, looking up at it (`CUTS.nursery`: Ellie at +0.36), whole over them, and it
 * becomes the mobile over the crib.
 *
 * The camera rises with the first puff to a frame of the sky over them (5.5 cells at most, so the two of them stay
 * figures, not specks), drifts right as the falls come, and comes down again with the baby onto the two of them.
 */

/** Cells to pixels. */
const X = (v: number, k: number): number => v * k

/** Where this part's entry cell is, in its world's cells (the score starts its leg here): Carl lies at the world's (0, 0). */
export const CLOUDS_AT: Pt = [0.5, 0]

const BEGIN = CUT.hill
const END = CUT.nursery
const LEN = END - BEGIN

/** The two of them, in this part's cells: Carl on the blanket; Ellie beside him as she came from the chairs, and at the end. */
const CARL: Pt = [-0.5, 0]
const ELLIE_FROM = CARL[0] + CUTS.hill.ellie![0]
const ELLIE_TO = CARL[0] + CUTS.nursery.ellie![0]

/** The blanket, from x0 to x1 on the grass (the ground's surface is at `R`). */
const BLANKET = { x0: -1.2, x1: 1.0 }
/** The engine: the middle of its base board on the grass right of the blanket, and how big it is drawn. */
const ENGINE = { x: 1.62, scale: 0.82 }
/** A point of the engine as drawn at full size, where it is at its drawn size. */
const sized = (x: number, y: number): Pt => [ENGINE.x + (x - ENGINE.x) * ENGINE.scale, R + (y - R) * ENGINE.scale]
/** The chimney's mouth at full size, and where the steam comes out. */
const MOUTH_FULL: Pt = [ENGINE.x - 0.28, -0.84]
const MOUTH = sized(MOUTH_FULL[0], MOUTH_FULL[1])
/** The flywheel's axle, and its radius (full size). */
const AXLE: Pt = [ENGINE.x + 0.3, -0.33]
const WHEEL = 0.2

/* ------------------------------------------------------------------ the music */

/** Every downbeat of the phrase, one chuff each: bar 32 is the cut itself. */
const DOWNS = Array.from({ length: 14 }, (_, i) => bar('waltz', 32 + i))
/** Bar 36 is the loudest of the phrase, its second beat as strong: a second chuff on it. */
const DOUBLE = beat('waltz', 36, 2)
/** How strong each chuff is: the beat's own strength, so the legato bars chuff softly. */
const strength = (t: number): number => {
  const b = BEATS.find((x) => Math.abs(x.t - t) < 1e-6)
  return Math.max(0.3, Math.min(1, (b?.s ?? 0.5) / 0.8))
}

/** The downbeats the flywheel keeps: one turn a bar, steady within each bar, its crank at the bottom on every one. */
const WHEEL_BARS = Array.from({ length: 19 }, (_, i) => bar('waltz', 30 + i))
function turns(t: number): number {
  const b = WHEEL_BARS
  if (t <= b[0]) return (t - b[0]) / (b[1] - b[0])
  for (let i = 0; i + 1 < b.length; i++) if (t < b[i + 1]) return i + (t - b[i]) / (b[i + 1] - b[i])
  const n = b.length - 1
  return n + (t - b[n]) / (b[n] - b[n - 1])
}

/* ------------------------------------------------------------------ the clouds */

/** One billow of a cloud: a soft disc, or an oval `w` times as wide as tall, turned `a`. */
interface Billow {
  x: number
  y: number
  r: number
  w?: number
  a?: number
}

type ShapeKey = 'airship' | 'falls' | 'baby'

/** A cloud: its billows in its own cells about its middle, the puffs that bring them, and the order they are drawn in. */
interface Shape {
  /** Where its middle is at show time `t`, in this part's cells: each drifts on the breeze. */
  at(t: number): Pt
  /** How big it is drawn: its billows are given at 1. */
  size: number
  billows: Billow[]
  /** For each puff, in order, which billows it carries. */
  puffs: number[][]
  /** The billows by mass, back to front: each drawn whole over the one behind, so a head reads in front of a body. */
  groups: { of: number[]; tone?: number; face?: boolean }[]
  /** Drawn as one smooth mass (the airship, the baby), or billowed (the falls' cliff). */
  smooth: boolean
}

const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i)

/** How far a cloud has gone on a gust from `t0`: from rest, speeding up evenly to `v` cells a second by `t1`, then on at it. */
function glide(t: number, t0: number, t1: number, v: number): number {
  if (t <= t0) return 0
  if (t < t1) return (0.5 * v * (t - t0) * (t - t0)) / (t1 - t0)
  return 0.5 * v * (t1 - t0) + v * (t - t1)
}

/**
 * The airship: one long smooth body, its nose round and full (heading left), its tail tapering into a cross of fins,
 * and a gondola slung under its belly on two struts, with sky between. Smooth, not billowed: a billowed back made it
 * one more long cloud. Whole on bar 35; it sails off left, climbing, and is gone behind the tree before the baby.
 */
const AIRSHIP: Shape = {
  at: (t) => [0.3 - 0.04 * (t - BEGIN) - glide(t, 52.9, 54.2, 2.4), -2.5 - 0.15 * smooth(t, 53, 56) + 0.03 * Math.sin(t * 0.7)],
  size: 1,
  smooth: true,
  billows: [
    // 0-2: the body; its full nose (left); its tapering tail.
    { x: 0, y: 0, r: 0.3, w: 3.4 },
    { x: -0.62, y: 0.01, r: 0.3, w: 1.45 },
    { x: 0.92, y: 0, r: 0.19, w: 2.3 },
    // 3-4: the fins, swept back.
    { x: 1.2, y: -0.23, r: 0.095, w: 2.5, a: -0.62 },
    { x: 1.2, y: 0.23, r: 0.095, w: 2.5, a: 0.62 },
    // 5-7: the gondola, and the two struts it hangs from.
    { x: -0.15, y: 0.52, r: 0.075, w: 3.1 },
    { x: -0.33, y: 0.39, r: 0.085, w: 0.3 },
    { x: 0.03, y: 0.39, r: 0.085, w: 0.3 },
  ],
  puffs: [[0, 1, 2], [3, 4], [5, 6, 7]],
  groups: [{ of: [3, 4] }, { of: [5, 6, 7] }, { of: [0, 1, 2] }],
}

/**
 * Paradise Falls, in cloud: Ellie's tepui (`props/falls.ts`), as tall as it is wide, about 1.35 cells by 1.4 drawn. A
 * core, then its sheer sides stacked out of small billows, a little ragged, narrowing to the top as her cliff does; a
 * flat top of five small puffs along the lip in full sun; a narrow bank of mist at its foot that curls up where the
 * water lands. Its face is a cloud in light, not a block: lit on the left, falling into shadow on the right (`cliff`).
 * On bar 39 three ribbons pour off the lip; then a gust takes it off right.
 */
const FALLS_CLOUD: Shape = {
  at: (t) => [3.4 + 0.03 * (t - BEGIN) + glide(t, 57.6, 58.6, 2.8), -2.35 + 0.03 * Math.sin(t * 0.5 + 1)],
  size: 1.1,
  smooth: false,
  billows: [
    // 0-2: the cliff's core, already a mesa when it comes: a body, broad shoulders under the lip, a broader foot.
    { x: 0, y: 0.02, r: 0.42 },
    { x: 0, y: -0.27, r: 0.25, w: 1.5 },
    { x: 0, y: 0.31, r: 0.3, w: 1.6 },
    // 3-7: its left side, stacked from the lip down, stepping out a little as it falls.
    { x: -0.36, y: -0.32, r: 0.11 },
    { x: -0.4, y: -0.14, r: 0.16, w: 0.85 },
    { x: -0.5, y: 0.05, r: 0.1 },
    { x: -0.47, y: 0.24, r: 0.17, w: 0.85 },
    { x: -0.53, y: 0.47, r: 0.13, w: 1.1 },
    // 8-12: its right side, the same fall of billows but not a mirror (a cliff is ragged).
    { x: 0.37, y: -0.26, r: 0.14, w: 0.85 },
    { x: 0.46, y: -0.06, r: 0.1 },
    { x: 0.46, y: 0.13, r: 0.16, w: 0.85 },
    { x: 0.53, y: 0.35, r: 0.11 },
    { x: 0.49, y: 0.52, r: 0.15, w: 1.05 },
    // 13-17: its flat top, five small puffs along the lip, lit.
    { x: -0.34, y: -0.45, r: 0.105, w: 1.3 },
    { x: -0.17, y: -0.47, r: 0.115, w: 1.3 },
    { x: 0.0, y: -0.48, r: 0.12, w: 1.3 },
    { x: 0.17, y: -0.47, r: 0.115, w: 1.3 },
    { x: 0.34, y: -0.45, r: 0.1, w: 1.3 },
    // 18-20: the mist at its foot, a low bank little wider than the cliff.
    { x: -0.38, y: 0.66, r: 0.15, w: 1.5 },
    { x: -0.02, y: 0.7, r: 0.17, w: 1.6 },
    { x: 0.34, y: 0.67, r: 0.15, w: 1.5 },
    // 21-23: where each ribbon lands, the mist curling up (`CURLS`: small until the water reaches it).
    { x: -0.19, y: 0.55, r: 0.075, w: 1.35 },
    { x: 0.02, y: 0.54, r: 0.1, w: 1.3 },
    { x: 0.21, y: 0.56, r: 0.07, w: 1.35 },
  ],
  puffs: [[0, 1, 2], range(3, 10), range(13, 5), range(18, 6)],
  groups: [{ of: range(0, 13), tone: 0.45, face: true }, { of: range(13, 5) }, { of: range(18, 6), tone: 0.25 }],
}

/** Where the falls pour from, on the cliff's lip, in its own cells (before its size): the last puff goes here. */
const LIP: Pt = [0.02, -0.5]

/** The falls, three ribbons off the lip on bar 39: where each leaves the lip (its own cells), how wide, how late after the first. */
const RIBBONS = [
  { x: 0.02, w: 0.12, late: 0 },
  { x: -0.19, w: 0.065, late: 0.09 },
  { x: 0.21, w: 0.055, late: 0.17 },
]
/** The mist's curls, one under each ribbon (the billows' indices, in the ribbons' order). */
const CURLS = [22, 21, 23]
/** Where the ribbons start (under the lip's puffs, drawn over them) and where they end (inside the mist). */
const FALL_TOP = -0.45
const FALL_FOOT = 0.58

/**
 * The baby: a little one sitting up on a cushion of cloud, facing right, as a baby sits. A big round head (a round
 * cheek and a button of a nose in profile) on a short neck, a round tummy on a round bottom, one chubby leg out in
 * front with its foot turned up, and one arm reaching up and out, a fist at its end, drawn over the rest. About a
 * third of the frame tall at the cut, low and whole over the two of them. The neck is the pinch between the head's
 * circle and the body's: head over body over bottom, three masses, is what makes it a baby and not a ghost.
 */
const BABY: Shape = {
  at: (t) => [-0.3 + 0.008 * (t - 57.9), -1.8 + 0.015 * Math.sin(t * 0.9)],
  size: 0.8,
  smooth: true,
  billows: [
    // 0-2: its bottom, its middle, and its round tummy in front.
    { x: -0.12, y: 0.36, r: 0.22, w: 1.45 },
    { x: -0.06, y: 0.06, r: 0.27, w: 0.88 },
    { x: 0.1, y: 0.14, r: 0.19 },
    // 3-4: its leg out in front, and its foot turned up.
    { x: 0.26, y: 0.46, r: 0.12, w: 2.1, a: -0.08 },
    { x: 0.52, y: 0.37, r: 0.085, w: 0.8, a: 0.35 },
    // 5-7: its head, big for its body as a baby's is; its cheek; its nose. (A curl on its crown read as an ear.)
    { x: 0.03, y: -0.47, r: 0.31 },
    { x: 0.2, y: -0.34, r: 0.14 },
    { x: 0.35, y: -0.45, r: 0.065 },
    // 8-9: its arm reaching up and out, and its fist.
    { x: 0.32, y: -0.14, r: 0.075, w: 3.1, a: -0.37 },
    { x: 0.56, y: -0.24, r: 0.095 },
    // 10-12: the cushion of cloud it sits on, long, low and overlapping, the baby sitting in it, so it reads as the cloud and not one more tier.
    { x: -0.35, y: 0.6, r: 0.13, w: 1.9 },
    { x: 0.1, y: 0.64, r: 0.12, w: 2.4 },
    { x: 0.55, y: 0.6, r: 0.1, w: 1.9 },
  ],
  puffs: [[0, 1, 2], [3, 4], [5, 6, 7], [8, 9], [10, 11], [12]],
  groups: [{ of: [10, 11, 12] }, { of: [0, 1, 2, 3, 4] }, { of: [5, 6, 7] }, { of: [8, 9] }],
}

const SHAPES: Record<ShapeKey, Shape> = { airship: AIRSHIP, falls: FALLS_CLOUD, baby: BABY }

interface Puff {
  /** Its chuff (a strike), and when it arrives and joins its shape (the next downbeat, or for the double its beat). */
  t0: number
  join: number
  shape: ShapeKey
  /** The billows it brings, or (none) the point of its shape it goes to: the falls' lip, where it becomes the water. */
  billows: number[]
  to?: Pt
  amp: number
}

/** Every chuff, where its puff goes, and when it gets there: each arrives on the next downbeat. */
const PUFFS: Puff[] = (() => {
  const next = (t: number) => bar('waltz', 32 + DOWNS.findIndex((d) => Math.abs(d - t) < 1e-6) + 1)
  const plan: [number, number, ShapeKey, number | Pt][] = [
    [DOWNS[0], next(DOWNS[0]), 'airship', 0],
    [DOWNS[1], next(DOWNS[1]), 'airship', 1],
    [DOWNS[2], next(DOWNS[2]), 'airship', 2],
    [DOWNS[3], next(DOWNS[3]), 'falls', 0],
    [DOWNS[4], next(DOWNS[4]), 'falls', 1],
    [DOUBLE, beat('waltz', 37, 2), 'falls', 2],
    [DOWNS[5], next(DOWNS[5]), 'falls', 3],
    [DOWNS[6], next(DOWNS[6]), 'falls', LIP],
    [DOWNS[7], next(DOWNS[7]), 'baby', 0],
    [DOWNS[8], next(DOWNS[8]), 'baby', 1],
    [DOWNS[9], next(DOWNS[9]), 'baby', 2],
    [DOWNS[10], next(DOWNS[10]), 'baby', 3],
    [DOWNS[11], next(DOWNS[11]), 'baby', 4],
    [DOWNS[12], next(DOWNS[12]), 'baby', 5],
    // Bar 45, just before the cut: the last chuff, still rising into the cushion as the scene becomes the nursery.
    [DOWNS[13], next(DOWNS[13]), 'baby', [0.1, 0.62]],
  ]
  return plan.map(([t0, join, shape, what]) => ({
    t0,
    join,
    shape,
    billows: typeof what === 'number' ? SHAPES[shape].puffs[what] : [],
    to: typeof what === 'number' ? undefined : what,
    amp: strength(t0),
  }))
})()

/** When the falls pour: their puff reaches the lip. */
const POUR = PUFFS.find((p) => p.to === LIP)!.join

/** The ease of a puff along its line: shot out fast, slowing, and still moving a little as it joins (the hit). */
const along = (u: number): number => u + 0.7 * u * (1 - u)

/** The line a puff flies along to `goal`: straight up out of the chimney, over, and up into its place from below. */
function line(goal: Pt, e: number): Pt {
  const H = Math.max(0.4, MOUTH[1] - goal[1])
  const a = MOUTH
  const b: Pt = [MOUTH[0], MOUTH[1] - 0.5 * H]
  const c: Pt = [goal[0], goal[1] + 0.35 * H]
  const q = 1 - e
  return [
    q * q * q * a[0] + 3 * q * q * e * b[0] + 3 * q * e * e * c[0] + e * e * e * goal[0],
    q * q * q * a[1] + 3 * q * q * e * b[1] + 3 * q * e * e * c[1] + e * e * e * goal[1],
  ]
}

/** Where a puff is going at show time `t`: the middle of its billows in their place, or its point. */
function goalOf(puff: Puff, t: number): Pt {
  const shape = SHAPES[puff.shape]
  const S = shape.size
  const [sx, sy] = shape.at(t)
  if (!puff.billows.length) return [sx + (puff.to?.[0] ?? 0) * S, sy + (puff.to?.[1] ?? 0) * S]
  const own = puff.billows.map((i) => shape.billows[i])
  return [sx + (own.reduce((a, b) => a + b.x, 0) / own.length) * S, sy + (own.reduce((a, b) => a + b.y, 0) / own.length) * S]
}

/**
 * A puff at show time `t`: its billows (in flight a tumbling knot of steam round its heart, opening into its place as
 * it arrives; then in its place, swelling a little as it joins and settling), and a knot with no place (the water, the
 * last chuff) that thins as it arrives.
 */
function flight(puff: Puff, t: number): { billows: Map<number, Billow>; loose: Billow[] } {
  const billows = new Map<number, Billow>()
  const loose: Billow[] = []
  const age = t - puff.t0
  if (age < 0) return { billows, loose }
  const shape = SHAPES[puff.shape]
  const S = shape.size
  const rise = puff.join - puff.t0
  const u = Math.min(1, age / rise)
  const goal = goalOf(puff, t)
  const [px, py] = line(goal, along(u))
  const m = smooth(u, 0.45, 1)
  const seed = Math.round(puff.t0 * 1000)
  // Steam grows as it rises; a louder chuff makes a bigger knot.
  const grow = (0.55 + 0.45 * smooth(u, 0, 0.5)) * (0.75 + 0.3 * puff.amp)
  // The swell when it joins: quick to come, slow to settle.
  const late = age - rise
  const swell = late > 0 ? 1 + 0.09 * puff.amp * smooth(late, 0, 0.07) * Math.exp(-late / 0.35) : 1
  const breathe = (i: number) => 1 + 0.025 * Math.sin(t * 0.8 + i * 1.7)
  const knot = (j: number, n: number) => {
    const ang = (j / n) * Math.PI * 2 + hash(seed, j) * 1.5 + age * 1.6
    const d = n > 1 ? (0.06 + 0.04 * hash(seed, j, 2)) * grow : 0
    return { x: Math.cos(ang) * d, y: Math.sin(ang) * d, r: (0.1 + 0.04 * hash(seed, j, 3)) * grow }
  }
  if (!puff.billows.length) {
    const fade = 1 - smooth(u, 0.7, 1)
    if (fade <= 0) return { billows, loose }
    for (let j = 0; j < 3; j++) {
      const kb = knot(j, 3)
      loose.push({ x: px + kb.x, y: py + kb.y, r: kb.r * fade })
    }
    return { billows, loose }
  }
  const [sx, sy] = shape.at(t)
  const n = puff.billows.length
  const [gx, gy] = goal
  puff.billows.forEach((i, j) => {
    const b = shape.billows[i]
    const kb = knot(j, n)
    // In flight about the heart; in place about its shape's middle (the heart has arrived at the goal by then).
    const hx = px + (gx - px) * m
    const hy = py + (gy - py) * m
    billows.set(i, {
      x: hx + kb.x * (1 - m) + (sx + b.x * S - gx) * m,
      y: hy + kb.y * (1 - m) + (sy + b.y * S - gy) * m,
      r: (kb.r + (b.r * S - kb.r) * m) * swell * breathe(i),
      w: 1 + ((b.w ?? 1) - 1) * m,
      a: (b.a ?? 0) * m,
    })
  })
  return { billows, loose }
}

/** Every billow of a cloud that has come so far, by index; and the loose knots flying to it. */
function billowsOf(key: ShapeKey, t: number): { got: Map<number, Billow>; loose: Billow[] } {
  const got = new Map<number, Billow>()
  const loose: Billow[] = []
  for (const puff of PUFFS) {
    if (puff.shape !== key) continue
    const f = flight(puff, t)
    for (const [i, b] of f.billows) got.set(i, b)
    loose.push(...f.loose)
  }
  return { got, loose }
}

/** An oval billow, grown by `g` and moved by (dx, dy) of its own radius. */
function oval(p: p5, k: number, b: Billow, g: number, dx = 0, dy = 0): void {
  p.push()
  p.translate(X(b.x + dx * b.r, k), X(b.y + dy * b.r, k))
  p.rotate(b.a ?? 0)
  p.ellipse(0, 0, X(2 * b.r * g * (b.w ?? 1), k), X(2 * b.r * g, k))
  p.pop()
}

/** Clip the canvas to the union of the billows (the caller restores). */
function clipTo(p: p5, k: number, billows: Billow[]): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  for (const b of billows) {
    const rx = X(b.r * (b.w ?? 1), k)
    const ry = X(b.r, k)
    ctx.moveTo(X(b.x, k) + rx * Math.cos(b.a ?? 0), X(b.y, k) + rx * Math.sin(b.a ?? 0))
    ctx.ellipse(X(b.x, k), X(b.y, k), rx, ry, b.a ?? 0, 0, Math.PI * 2)
  }
  ctx.clip()
}

/**
 * A soft cloud from its billows, as one mass: a halo, then the whole of it in shade, then (inside it only) the body
 * lifted off the shade so the shade shows along its underside alone, and the light across its top. No ink. One
 * silhouette, not a heap of bubbles. `tone` darkens it into shadow (the falls' cliff face).
 */
function cloud(p: p5, k: number, billows: Billow[], tone = 0): void {
  if (!billows.length) return
  const shadeC = mixHex(mixHex(HILL.cloudShade, CHURCH.glassBlue, 0.16), mixHex(HILL.cloudShade, CHURCH.glassBlue, 0.38), tone)
  const bodyC = mixHex(mixHex(HILL.cloud, HILL.cloudShade, 0.3), mixHex(HILL.cloudShade, CHURCH.glassBlue, 0.2), tone)
  const litC = mixHex(HILL.cloud, mixHex(HILL.cloudShade, CHURCH.glassBlue, 0.08), tone)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.noStroke()
  p.fill(alpha(p, HILL.cloud, 0.22))
  for (const b of billows) oval(p, k, b, 1.09)
  p.fill(shadeC)
  for (const b of billows) oval(p, k, b, 1)
  clipTo(p, k, billows)
  p.fill(bodyC)
  for (const b of billows) oval(p, k, b, 1.02, -0.04, -0.2)
  p.fill(litC)
  for (const b of billows) oval(p, k, b, 0.9, -0.1, -0.42)
  ctx.restore()
}

/**
 * The falls' cliff face: a cloud with the sun on its left. A halo; the whole of it in its shadow colour; then (inside
 * it only) the body shifted left and up, so the shadow shows down its right side and under each billow that stands out
 * of the side; the light shifted further left, so each billow of its left side is lit; and last a soft wash across the
 * whole mass, light on the left, shadow on the right, so it turns from the sun as one form. `tone` is how deep in shade
 * the body is (0 a white cloud).
 */
function cliff(p: p5, k: number, billows: Billow[], tone: number): void {
  if (!billows.length) return
  const deep = mixHex(HILL.cloudShade, CHURCH.glassBlue, 0.5)
  const bodyC = mixHex(mixHex(HILL.cloud, HILL.cloudShade, 0.6), deep, tone)
  const shadeC = mixHex(bodyC, deep, 0.55)
  const litC = mixHex(HILL.cloud, HILL.cloudShade, 0.08)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.noStroke()
  p.fill(alpha(p, HILL.cloud, 0.22))
  for (const b of billows) oval(p, k, b, 1.09)
  p.fill(shadeC)
  for (const b of billows) oval(p, k, b, 1)
  clipTo(p, k, billows)
  p.fill(bodyC)
  for (const b of billows) oval(p, k, b, 1.0, -0.12, -0.1)
  // The small billows stand out of it, top to bottom, each over a soft shade of its own below and right of it: the
  // sides read as heaped cloud, not a wall.
  const small = billows.filter((b) => b.r < 0.2).sort((a, b) => a.y - b.y)
  for (const b of small) {
    p.fill(alpha(p, shadeC, 0.85))
    oval(p, k, b, 0.98, 0.18, 0.22)
    p.fill(bodyC)
    oval(p, k, b, 0.96, -0.04, -0.05)
  }
  // The sun on the left side's small billows: each a little lit on its upper left.
  let mid = 0
  for (const b of billows) mid += b.x / billows.length
  p.fill(alpha(p, litC, 0.38))
  for (const b of small) if (b.x < mid) oval(p, k, b, 0.8, -0.3, -0.26)
  // The mass turning from the sun: across its whole width, light on the left, clear, then shadow on the right.
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const b of billows) {
    const rx = b.r * (b.w ?? 1)
    x0 = Math.min(x0, b.x - rx)
    x1 = Math.max(x1, b.x + rx)
    y0 = Math.min(y0, b.y - b.r)
    y1 = Math.max(y1, b.y + b.r)
  }
  const g = ctx.createLinearGradient(X(x0, k), 0, X(x1, k), 0)
  const rgb = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
  }
  g.addColorStop(0, rgb(litC, 0.6))
  g.addColorStop(0.38, rgb(litC, 0))
  g.addColorStop(0.58, rgb(deep, 0))
  g.addColorStop(1, rgb(deep, 0.7))
  ctx.fillStyle = g
  ctx.fillRect(X(x0, k), X(y0, k), X(x1 - x0, k), X(y1 - y0, k))
  ctx.restore()
}

/**
 * A cloud drawn as ONE smooth mass (the airship, the baby): a halo, the whole of it in shade, then (inside it only)
 * the whole of it again lifted a fixed small way, and the light lifted further, so the shade and the body show only
 * as a band along its underside and under whatever stands out of it, never round each billow: no inner seams, one
 * silhouette.
 */
function mass(p: p5, k: number, billows: Billow[]): void {
  if (!billows.length) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.noStroke()
  p.fill(alpha(p, HILL.cloud, 0.22))
  for (const b of billows) oval(p, k, b, 1.07)
  p.fill(mixHex(HILL.cloudShade, CHURCH.glassBlue, 0.14))
  for (const b of billows) oval(p, k, b, 1)
  clipTo(p, k, billows)
  const lift = (d: number, c: string) => {
    p.fill(c)
    for (const b of billows) oval(p, k, { ...b, y: b.y - d }, 1.0)
  }
  lift(0.035, mixHex(HILL.cloud, HILL.cloudShade, 0.45))
  lift(0.085, HILL.cloud)
  ctx.restore()
}

function drawShape(p: p5, k: number, key: ShapeKey, t: number): void {
  const shape = SHAPES[key]
  const { got, loose } = billowsOf(key, t)
  if (!got.size && !loose.length) return
  if (key === 'falls') {
    // Each curl of the mist is small until its ribbon reaches it, then rises and swells where the water lands.
    CURLS.forEach((i, j) => {
      const b = got.get(i)
      if (!b) return
      const land = smooth(t, POUR + RIBBONS[j].late + 0.35, POUR + RIBBONS[j].late + 1.05)
      got.set(i, { ...b, r: b.r * (0.55 + 0.6 * land), y: b.y - 0.05 * FALLS_CLOUD.size * land })
    })
  }
  for (const g of shape.groups) {
    const list = g.of.map((i) => got.get(i)).filter((b): b is Billow => !!b)
    if (shape.smooth) mass(p, k, list)
    else if (g.face) cliff(p, k, list, g.tone ?? 0)
    else cloud(p, k, list, g.tone ?? 0)
    // The falls pour from under the lit lip (its puffs drawn over their heads) down the face, into the mist at its foot.
    if (key === 'falls' && g === shape.groups[0]) drawPour(p, k, t)
  }
  for (const b of loose) mass(p, k, [b])
}

/**
 * The falls: when the last puff reaches the lip, three ribbons pour off it (the widest first, the two thin ones a
 * moment after), each out from under the lit lip, running down the face, its front a soft knot of spray, until it
 * reaches the mist, a little wider as it falls, lit down its left edge and in shade down its right, as the cliff is.
 */
function drawPour(p: p5, k: number, t: number): void {
  const [fx, fy] = FALLS_CLOUD.at(t)
  const S = FALLS_CLOUD.size
  const Q = (dx: number, dy: number): Pt => [X(fx + dx * S, k), X(fy + dy * S, k)]
  const V = (dx: number, dy: number) => p.vertex(...Q(dx, dy))
  const shade = alpha(p, mixHex(HILL.cloudShade, CHURCH.glassBlue, 0.22), 0.85)
  p.noStroke()
  for (const r of RIBBONS) {
    const pour = smooth(t, POUR + r.late - 0.05, POUR + r.late + 0.75)
    if (pour <= 0) continue
    const y0 = FALL_TOP
    const y1 = y0 + (FALL_FOOT - y0) * pour
    // Its half-width at depth `y`: a little wider as it falls.
    const half = (y: number) => (r.w / 2) * (1 + 0.35 * ((y - y0) / (FALL_FOOT - y0)))
    // A band of it from `left` to `right` (fractions of its half-width) between two depths.
    const band = (left: number, right: number, ya: number, yb: number, grow = 0) => {
      p.beginShape()
      V(r.x + left * half(ya) - grow, ya)
      V(r.x + right * half(ya) + grow, ya)
      V(r.x + right * half(yb) + grow, yb)
      V(r.x + left * half(yb) - grow, yb)
      p.endShape(p.CLOSE)
    }
    // The spray about it, the water, and its shaded right side. While it runs, its front is a soft knot of spray, not
    // a hard end: the water thins into it.
    const running = pour < 1
    const front = running ? y1 - 0.9 * half(y1) : y1
    p.fill(alpha(p, HILL.cloud, 0.4))
    band(-1, 1, y0, y1, 0.025)
    p.fill(HILL.cloud)
    band(-1, 1, y0, front)
    if (front - y0 > 0.1) {
      p.fill(shade)
      band(0.25, 1, y0, front)
    }
    if (running) {
      const [cx, cy] = Q(r.x, front)
      p.fill(alpha(p, HILL.cloud, 0.55))
      p.ellipse(cx, cy, X(2.5 * half(y1) * S, k), X(2.6 * half(y1) * S, k))
      p.fill(alpha(p, HILL.cloud, 0.8))
      p.ellipse(cx, cy - X(0.2 * half(y1) * S, k), X(1.7 * half(y1) * S, k), X(1.6 * half(y1) * S, k))
    }
  }
}

/**
 * The trail of every puff in flight: the steam it leaves along its line, from the chimney's mouth up to the knot, a
 * soft column thinnest at its tail. Its tail follows the knot a moment behind, so when the knot joins its shape the
 * trail is drawn up into it after it and is gone.
 */
function drawTrails(p: p5, k: number, t: number): void {
  p.noStroke()
  for (const puff of PUFFS) {
    const age = t - puff.t0
    const rise = puff.join - puff.t0
    const LAG = 0.4
    if (age < 0 || age > rise + LAG) continue
    const goal = goalOf(puff, t)
    const head = along(Math.min(1, age / rise))
    const tail = along(Math.max(0, Math.min(1, (age - LAG) / rise)))
    if (head - tail < 1e-3) continue
    const size = 0.75 + 0.3 * puff.amp
    // Sample the line densely enough that it is one column, never a row of beads.
    const [ax, ay] = line(goal, tail)
    const [bx, by] = line(goal, head)
    const n = Math.max(6, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.025))
    for (let i = 0; i <= n; i++) {
      const s = i / n
      const e = tail + (head - tail) * s
      const [x, y] = line(goal, e)
      const r = (0.03 + 0.055 * s) * size * (0.8 + 0.5 * e)
      p.fill(alpha(p, HILL.cloud, 0.1 + 0.2 * s))
      p.circle(X(x, k), X(y, k), X(2 * r, k))
    }
  }
}

/* ------------------------------------------------------------------ the engine */

/** How hard the last chuff was, and how long ago: what the valve's flap and the engine's shudder read. */
function lastChuff(t: number): { ago: number; amp: number } {
  let ago = Infinity
  let amp = 0
  for (const puff of PUFFS) if (puff.t0 <= t && t - puff.t0 < ago) { ago = t - puff.t0; amp = puff.amp }
  return { ago, amp }
}

function drawEngine(p: p5, k: number, weight: number, t: number): void {
  const E = ENGINE.x
  const g = R
  const P = (v: number) => X(v, k)
  const { ago, amp } = lastChuff(t)
  // The engine gives a small shudder on each chuff, its boiler lifting on its bed and settling.
  const kick = ago < 0.6 ? Math.exp(-ago / 0.07) * amp : 0
  p.push()
  p.translate(P(E), P(g))
  p.scale(ENGINE.scale)
  p.translate(-P(E), -P(g))
  p.rectMode(p.CORNER)
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  // The base board.
  p.fill(HOME.wood)
  p.rect(P(E - 0.52), P(g - 0.06), P(1.04), P(0.06), P(0.015))
  p.push()
  p.translate(0, P(-0.012 * kick))
  // The firebox, and the fire in it.
  p.fill(mixHex(INK, HILL.bark, 0.35))
  p.rect(P(E - 0.46), P(g - 0.24), P(0.44), P(0.18), P(0.02))
  const flick = 0.55 + 0.2 * Math.sin(t * 17) + 0.15 * Math.sin(t * 29 + 1)
  p.noStroke()
  p.fill(alpha(p, HOME.lamp, 0.7 * flick))
  p.arc(P(E - 0.24), P(g - 0.07), P(0.16), P(0.18), Math.PI, Math.PI * 2)
  p.fill(alpha(p, HOME.yellow, 0.75 * flick))
  p.arc(P(E - 0.24), P(g - 0.07), P(0.08), P(0.08), Math.PI, Math.PI * 2)
  // The boiler: a brass drum on its side, two bands round it.
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.fill(HOME.brass)
  p.rect(P(E - 0.5), P(g - 0.52), P(0.52), P(0.28), P(0.12))
  p.noStroke()
  p.fill(alpha(p, HOME.shine, 0.55))
  p.rect(P(E - 0.42), P(g - 0.49), P(0.36), P(0.05), P(0.025))
  p.stroke(mixHex(HOME.brass, INK, 0.45))
  p.strokeWeight(weight * 0.6)
  for (const bx of [E - 0.36, E - 0.12]) p.line(P(bx), P(g - 0.51), P(bx), P(g - 0.25))
  // Its steam dome and the little valve on top.
  p.stroke(INK)
  p.strokeWeight(weight * 0.8)
  p.fill(mixHex(HOME.brass, HOME.shine, 0.2))
  p.arc(P(E - 0.2), P(g - 0.515), P(0.13), P(0.12), Math.PI, Math.PI * 2, p.CHORD)
  p.fill(mixHex(HOME.brass, INK, 0.3))
  p.rect(P(E - 0.215), P(g - 0.63), P(0.03), P(0.06))
  // The steam pipe from the boiler's crown over to the cylinder.
  const pivot: Pt = [E + 0.1, g - 0.43]
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.bezier(P(E - 0.02), P(g - 0.5), P(E + 0.04), P(g - 0.62), P(E + 0.1), P(g - 0.6), P(pivot[0]), P(pivot[1]))
  // The chimney, and its flap: it lifts on every chuff and settles back, damped.
  const [cx, cy] = MOUTH_FULL
  p.fill(mixHex(HOME.brass, INK, 0.25))
  p.rect(P(cx - 0.035), P(cy + 0.07), P(0.07), P(g - 0.52 - cy - 0.07))
  p.beginShape()
  p.vertex(P(cx - 0.035), P(cy + 0.08))
  p.vertex(P(cx + 0.035), P(cy + 0.08))
  p.vertex(P(cx + 0.065), P(cy))
  p.vertex(P(cx - 0.065), P(cy))
  p.endShape(p.CLOSE)
  const lift = ago < 2 ? amp * 1.0 * (smooth(ago, 0, 0.04) * Math.exp(-ago / 0.3)) : 0
  p.push()
  p.translate(P(cx - 0.065), P(cy))
  p.rotate(-lift)
  p.fill(mixHex(HOME.brass, INK, 0.1))
  p.rect(0, P(-0.025), P(0.13), P(0.025), P(0.01))
  p.pop()
  p.pop()
  // The standard that carries the flywheel's axle.
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.fill(mixHex(HOME.woodDark, INK, 0.2))
  p.beginShape()
  p.vertex(P(AXLE[0] - 0.13), P(g - 0.06))
  p.vertex(P(AXLE[0] - 0.03), P(AXLE[1]))
  p.vertex(P(AXLE[0] + 0.03), P(AXLE[1]))
  p.vertex(P(AXLE[0] + 0.13), P(g - 0.06))
  p.vertex(P(AXLE[0] + 0.07), P(g - 0.06))
  p.vertex(P(AXLE[0]), P(AXLE[1] + 0.12))
  p.vertex(P(AXLE[0] - 0.07), P(g - 0.06))
  p.endShape(p.CLOSE)
  // The flywheel: once round a bar; its crank pin at the bottom on every downbeat.
  const a = turns(t) * Math.PI * 2
  p.push()
  p.translate(P(AXLE[0]), P(AXLE[1]))
  p.noFill()
  p.stroke(INK)
  p.strokeWeight(weight * 0.9)
  p.circle(0, 0, P(2 * WHEEL))
  p.stroke(mixHex(HOME.woodDark, INK, 0.3))
  p.strokeWeight(P(0.035))
  p.circle(0, 0, P(2 * WHEEL - 0.05))
  p.stroke(INK)
  p.strokeWeight(weight * 0.65)
  for (let i = 0; i < 5; i++) {
    const s = a + (i / 5) * Math.PI * 2
    p.line(P(Math.sin(s) * 0.04), P(Math.cos(s) * 0.04), P(Math.sin(s) * (WHEEL - 0.035)), P(Math.cos(s) * (WHEEL - 0.035)))
  }
  p.fill(HOME.brass)
  p.circle(0, 0, P(0.06))
  p.pop()
  // The crank pin, the rod, and the rocking cylinder that drives it.
  const pin: Pt = [AXLE[0] + Math.sin(a) * 0.1, AXLE[1] + Math.cos(a) * 0.1]
  const dx = pin[0] - pivot[0]
  const dy = pin[1] - pivot[1]
  const l = Math.hypot(dx, dy)
  const ux = dx / l
  const uy = dy / l
  const mouth: Pt = [pivot[0] + ux * 0.13, pivot[1] + uy * 0.13]
  p.stroke(INK)
  p.strokeWeight(weight * 1.0)
  p.line(P(mouth[0]), P(mouth[1]), P(pin[0]), P(pin[1]))
  p.strokeWeight(weight * 0.8)
  p.fill(HOME.brass)
  p.beginShape()
  const nx = -uy * 0.045
  const ny = ux * 0.045
  p.vertex(P(pivot[0] - ux * 0.03 + nx), P(pivot[1] - uy * 0.03 + ny))
  p.vertex(P(mouth[0] + nx), P(mouth[1] + ny))
  p.vertex(P(mouth[0] - nx), P(mouth[1] - ny))
  p.vertex(P(pivot[0] - ux * 0.03 - nx), P(pivot[1] - uy * 0.03 - ny))
  p.endShape(p.CLOSE)
  p.fill(INK)
  p.circle(P(pin[0]), P(pin[1]), P(0.035))
  p.pop()
}

/**
 * The blanket, lying on the grass: a solid red field, its fold at the far end in shade. Seen this nearly edge on, a
 * check is a row of dashes, so it comes up only when near (a cell 150 px and more on the screen), and faintly, as a
 * weave in the red rather than stripes on it.
 */
function drawBlanket(p: p5, k: number, weight: number): void {
  const P = (v: number) => X(v, k)
  const { x0, x1 } = BLANKET
  const top = R - 0.012
  const bottom = R + 0.05
  const edge = () => {
    p.beginShape()
    p.vertex(P(x0 + 0.03), P(top))
    p.vertex(P(x1 - 0.04), P(top))
    p.quadraticVertex(P(x1 + 0.05), P(top + 0.01), P(x1 + 0.03), P(bottom))
    p.vertex(P(x0 - 0.02), P(bottom))
    p.quadraticVertex(P(x0 - 0.04), P(top + 0.02), P(x0 + 0.03), P(top))
    p.endShape(p.CLOSE)
  }
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.fill(HILL.blanket)
  edge()
  p.noStroke()
  // The fold at its far end, a little darker.
  p.fill(alpha(p, INK, 0.14))
  p.rect(P(x1 - 0.16), P(top + 0.006), P(0.17), P(bottom - top - 0.012))
  // The check: cream bands across it and one along it, only when near.
  const near = smooth(k, 150, 260)
  if (near > 0) {
    p.fill(alpha(p, HOME.trim, 0.28 * near))
    const w = 0.11
    for (let i = 1; x0 + i * w < x1 - 0.18; i += 2) p.rect(P(x0 + i * w), P(top + 0.006), P(w), P(bottom - top - 0.012))
    p.fill(alpha(p, HOME.trim, 0.2 * near))
    p.rect(P(x0 + 0.02), P(top + (bottom - top) * 0.4), P(x1 - x0 - 0.2), P((bottom - top) * 0.22))
  }
  p.pop()
}

/* ------------------------------------------------------------------ the two of them */

/** Ellie's one bounce of delight, as the falls stand whole: up on the last beat of bar 37, down on bar 38 (their mist). */
const HOP = { up: beat('waltz', 37, 3), down: bar('waltz', 38) }
/** His start when the baby has its head: a small lift, down on the waltz. */
const START = { up: beat('waltz', 43, 3) - 0.26, down: beat('waltz', 43, 3) }
/** When she rolls to him: after his start, to the cut. */
const ROLL = { from: START.down + 0.2, to: END - 0.12 }

/** She leans toward the falls as they pour: a little way right on the grass, and back. */
const LEAN = { from: bar('waltz', 40), mid: bar('waltz', 40) + 0.7, to: bar('waltz', 41) + 0.4 }

function ellieAt(t: number): { x: number; y: number } {
  let x = ELLIE_FROM
  let y = 0
  if (t > LEAN.from && t < LEAN.to) x += 0.07 * (t < LEAN.mid ? smooth(t, LEAN.from, LEAN.mid) : 1 - smooth(t, LEAN.mid, LEAN.to))
  if (t >= HOP.up && t <= HOP.down) {
    const u = (t - HOP.up) / (HOP.down - HOP.up)
    y = -0.16 * 4 * u * (1 - u)
  }
  if (t > ROLL.from) {
    const u = smooth(t, ROLL.from, ROLL.to)
    x = ELLIE_FROM + (ELLIE_TO - ELLIE_FROM) * u
  }
  return { x, y }
}

export interface CloudsState {
  begin: number
}

export const clouds = part<CloudsState>(
  {
    name: 'clouds',
    draw: (p, s, c) => {
      const { k, weight } = c
      const t = s.begin + c.t
      // Only that afternoon: years later, on the same hill, none of this is there.
      if (c.t < -1 || c.t > LEN + 1) return
      const f = frame(p, k)
      p.push()
      // Farthest first: the airship, the falls, then the baby, low and near.
      drawShape(p, k, 'airship', t)
      if (f.x1 > 2.4) drawShape(p, k, 'falls', t)
      drawShape(p, k, 'baby', t)
      drawBlanket(p, k, weight)
      drawEngine(p, k, weight, t)
      drawTrails(p, k, t)
      p.pop()
    },
  },
  (slot) => {
    const at = (t: number) => t - slot.begin
    // Carl lies still; when the baby has its head he starts, a small lift and down again, and lies still with her.
    const ways: Way[] = [
      { at: 0, p: CARL },
      { at: at(START.up), p: CARL },
      { at: at(START.up) + (START.down - START.up) / 2, p: [CARL[0], -0.06], ease: 'out' },
      { at: at(START.down), p: CARL, ease: 'in' },
      { at: slot.end - slot.begin, p: CARL },
    ]
    const company: Company[] = [{ from: slot.begin, to: slot.end, at: (t) => ellieAt(t) }]
    const pose: Pose[] = [
      {
        from: START.down,
        to: START.down + 0.8,
        at: (t) => ({ squash: 0.1 * Math.exp(-(t - START.down) / 0.12) * Math.max(0, Math.cos((t - START.down) * 9)) }),
      },
    ]
    return {
      cells: [...box(-2, -7, 10, 1), ...box(TREE_X - 2.5, -4, 0, 0)],
      exit: [CARL[0] + 0.5, CARL[1]],
      lane: { segs: route(ways), fire: 0 },
      state: { begin: slot.begin },
      company,
      pose,
    }
  },
  (slot) => {
    // Up with the first puff to the sky over them, never so wide that the two of them are specks (the dreams are built
    // into a frame of 5.5 cells at most, the two of them and the engine along its foot, so each puff's line from the
    // chimney to its shape is in the frame; inside Zoom's frame: dy under a third of the cells less his half); a slow
    // drift right as the falls come (the airship sailing off left), and down again as the gust takes the falls, onto
    // the baby whole over the two of them, closing in on it to the cut (`CUTS.nursery`).
    const c = (dx: number, dy: number): Pt => [CARL[0] + dx, CARL[1] + dy]
    return [
      { t: slot.begin + 1.6, cells: 4.4, hold: c(0.6, -1.25) },
      { t: slot.begin + 3.65, cells: 5.2, hold: c(1.4, -1.5) },
      { t: slot.begin + 7.55, cells: 5.5, hold: c(2.2, -1.62) },
      { t: slot.begin + 9.45, cells: 4.6, hold: c(0.4, -1.3) },
      { t: slot.begin + 11.35, cells: 4.0, hold: c(0.25, -1.08) },
      { t: slot.end, cells: CUTS.nursery.cells, hold: c(CUTS.nursery.frame[0], CUTS.nursery.frame[1]) },
    ]
  },
)

/** Every strike of this part, in show seconds (check:shows holds each to the music): every chuff, one a bar, and the double; and his start, down on a beat. */
export const CLOUDS_HITS: number[] = [...PUFFS.map((p) => p.t0), START.down].sort((a, b) => a - b)

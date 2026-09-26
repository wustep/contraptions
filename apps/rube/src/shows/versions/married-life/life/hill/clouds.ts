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
 * puff of steam. The puffs rise, grow, and are carried off on the breeze into the sky, where they gather into
 * clouds, soft and uninked, and the clouds take the shapes of what the two of them dream of:
 *
 * -  bars 32 to 35: four puffs make an airship, the adventurer's airship, and it drifts off over the valley;
 * -  bars 36 to 39, the loudest of the phrase (a double chuff on 36): Paradise Falls, a flat-topped cliff of cloud
 *    in shadow with its falls pouring bright off the lip, where they always meant to go;
 * -  bars 40 to 45, the crescendo: the puffs stay low and near, over the two of them, and the head that comes on bar
 *    42 makes it a sleeping baby, curled on its side, a fist at its cheek. He starts; she rolls close to him.
 *
 * At the cut they lie close, at rest, looking up at it (`CUTS.nursery`: Ellie at +0.36), and it becomes the mobile
 * over the crib.
 *
 * The camera rises with the first puffs to the whole sky, holds the two dreams, and comes down again with the baby
 * onto the two of them.
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
  /** Seconds a puff takes from the chimney to its place. */
  rise: number
  /** How big it is drawn: its billows are given at 1. */
  size: number
  billows: Billow[]
  /** For each puff, in order, which billows it carries (none: a chuff that thins into the air). */
  puffs: number[][]
  /** The billows by mass, back to front: each drawn whole over the one behind, so a head reads in front of a body. */
  groups: { of: number[]; tone?: number }[]
}

const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i)

/** Billows turned `a` about their middle: a figure curled a little, its head down. */
function curled(a: number, billows: Billow[]): Billow[] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return billows.map((b) => ({ ...b, x: b.x * c - b.y * s, y: b.x * s + b.y * c, a: (b.a ?? 0) + a }))
}

/**
 * The airship: one long soft body, fuller at the nose, a fin above and below at its tail, and a small gondola slung
 * under its belly. Heading right, off over the valley.
 */
const AIRSHIP: Shape = {
  at: (t) => [1.9 + 0.12 * (t - BEGIN), -4.35 + 0.05 * Math.sin(t * 0.7)],
  rise: 2.3,
  size: 1.55,
  billows: [
    // 0: the body.
    { x: 0.02, y: 0.02, r: 0.33, w: 3.1 },
    // 1-4: its back, and a round nose.
    { x: -0.45, y: -0.14, r: 0.22, w: 1.4 },
    { x: 0.08, y: -0.2, r: 0.24, w: 1.35 },
    { x: 0.55, y: -0.12, r: 0.22, w: 1.3 },
    { x: 0.82, y: 0.02, r: 0.27 },
    // 5-6: the fins.
    { x: -0.9, y: -0.22, r: 0.13, w: 2.0, a: -0.75 },
    { x: -0.9, y: 0.24, r: 0.12, w: 2.0, a: 0.75 },
    // 7: the gondola.
    { x: 0.18, y: 0.44, r: 0.085, w: 2.8 },
  ],
  puffs: [[0], [1, 2, 3, 4], [5, 6], [7]],
  groups: [{ of: [5, 6] }, { of: [0, 1, 2, 3, 4] }, { of: [7] }],
}

/**
 * Paradise Falls, in cloud (the shape of Ellie's painting, `props/falls.ts`): a flat-topped cliff standing out of a
 * bank of mist, its face in shadow, and the falls pouring bright off the middle of its lip.
 */
const FALLS_CLOUD: Shape = {
  at: (t) => [6.2 + 0.03 * (t - BEGIN), -3.2 + 0.04 * Math.sin(t * 0.5 + 1)],
  rise: 2.6,
  size: 1.45,
  billows: [
    // 0-2: the cliff's mass.
    { x: 0, y: 0.02, r: 0.46, w: 1.95 },
    { x: -0.48, y: 0.32, r: 0.3, w: 1.3 },
    { x: 0.48, y: 0.33, r: 0.3, w: 1.3 },
    // 3-6: its steep sides.
    { x: -0.86, y: -0.14, r: 0.2, w: 0.9 },
    { x: -0.92, y: 0.22, r: 0.24, w: 0.9 },
    { x: 0.87, y: -0.14, r: 0.2, w: 0.9 },
    { x: 0.94, y: 0.24, r: 0.24, w: 0.9 },
    // 7-11: its flat top, lit.
    { x: -0.68, y: -0.36, r: 0.19, w: 1.5 },
    { x: -0.34, y: -0.39, r: 0.2, w: 1.5 },
    { x: 0.02, y: -0.4, r: 0.21, w: 1.5 },
    { x: 0.38, y: -0.39, r: 0.2, w: 1.5 },
    { x: 0.7, y: -0.36, r: 0.18, w: 1.5 },
    // 12-15: the mist at its foot, one low bank.
    { x: -1.05, y: 0.64, r: 0.2, w: 2.4 },
    { x: -0.35, y: 0.7, r: 0.25, w: 2.3 },
    { x: 0.4, y: 0.69, r: 0.26, w: 2.2 },
    { x: 1.1, y: 0.63, r: 0.19, w: 2.4 },
  ],
  puffs: [[0, 1, 2], [3, 4, 5, 6], range(7, 5), [], range(12, 4)],
  groups: [{ of: range(0, 7), tone: 1 }, { of: range(7, 5) }, { of: range(12, 4), tone: 0.3 }],
}

/**
 * The sleeping baby: curled on its side, its big round head on the right, its back rounded, its knees drawn up
 * under it, a fist at its cheek and a curl of hair on top. Low and near, over the two of them.
 */
const BABY: Shape = {
  at: (t) => [-0.44 + 0.02 * (t - BEGIN), -1.97 + 0.025 * Math.sin(t * 0.9)],
  rise: 1.45,
  size: 1.22,
  billows: curled(0.12, [
    // 0-4: its body lying long and low (a baby's head is the biggest thing about it), its round bottom, a billow
    // along its back, its leg drawn up under it, its foot.
    { x: -0.2, y: 0.12, r: 0.26, w: 1.55 },
    { x: -0.6, y: 0.1, r: 0.22 },
    { x: -0.28, y: -0.06, r: 0.15, w: 1.7, a: -0.15 },
    { x: -0.1, y: 0.33, r: 0.12, w: 2.3, a: -0.12 },
    { x: 0.17, y: 0.37, r: 0.085, w: 1.6, a: 0.2 },
    // 5-7: its head, big and set a little high; its round cheek; the one curl of hair on its crown.
    { x: 0.47, y: -0.12, r: 0.39 },
    { x: 0.73, y: 0.07, r: 0.15 },
    { x: 0.52, y: -0.54, r: 0.06, w: 2.2, a: -0.35 },
    // 8: its hand under its chin.
    { x: 0.33, y: 0.2, r: 0.1, w: 1.5, a: -0.3 },
  ]),
  puffs: [[0, 1, 2], [3, 4], [5, 6, 7], [8], [], []],
  groups: [{ of: [0, 1, 2, 3, 4] }, { of: [5, 6, 7] }, { of: [8] }],
}

const SHAPES: Record<ShapeKey, Shape> = { airship: AIRSHIP, falls: FALLS_CLOUD, baby: BABY }

interface Puff {
  t0: number
  shape: ShapeKey
  billows: number[]
  amp: number
}

/** Every chuff, and what its puff becomes. */
const PUFFS: Puff[] = (() => {
  const plan: [number, ShapeKey, number][] = [
    [DOWNS[0], 'airship', 0],
    [DOWNS[1], 'airship', 1],
    [DOWNS[2], 'airship', 2],
    [DOWNS[3], 'airship', 3],
    [DOWNS[4], 'falls', 0],
    [DOUBLE, 'falls', 1],
    [DOWNS[5], 'falls', 2],
    [DOWNS[6], 'falls', 3],
    [DOWNS[7], 'falls', 4],
    [DOWNS[8], 'baby', 0],
    [DOWNS[9], 'baby', 1],
    [DOWNS[10], 'baby', 2],
    [DOWNS[11], 'baby', 3],
    [DOWNS[12], 'baby', 4],
    [DOWNS[13], 'baby', 5],
  ]
  return plan.map(([t0, shape, i]) => ({ t0, shape, billows: SHAPES[shape].puffs[i], amp: strength(t0) }))
})()

/** When the falls pour (their puff's chuff). */
const POUR = DOWNS[6]

/** Where each billow of a puff is at show time `t`, in this part's cells; nothing before its chuff. */
function place(puff: Puff, t: number): Map<number, Billow> {
  return flight(puff, t).billows
}

/**
 * A puff in flight at show time `t`: its billows, and the loose wisps of vapour round it while it is young. Young
 * steam is a ragged tumbling knot, thin at its edges; it opens into its shape only as it nears its place, and the
 * wisps thin into the air.
 */
function flight(puff: Puff, t: number): { billows: Map<number, Billow>; wisps: Billow[]; heart: Pt | null } {
  const billows = new Map<number, Billow>()
  const wisps: Billow[] = []
  const age = t - puff.t0
  if (age < 0 || !puff.billows.length) return { billows, wisps, heart: null }
  const shape = SHAPES[puff.shape]
  const u = Math.min(1, age / shape.rise)
  const e = 1 - Math.pow(1 - u, 2.4)
  const S = shape.size
  const own = puff.billows.map((i) => shape.billows[i])
  const cx = (own.reduce((a, b) => a + b.x, 0) / own.length) * S
  const cy = (own.reduce((a, b) => a + b.y, 0) / own.length) * S
  const [sx, sy] = shape.at(t)
  const goal: Pt = [sx + cx, sy + cy]
  // Up out of the chimney first, then bending off on the breeze toward its place: a quadratic curve.
  const ctrl: Pt = [MOUTH[0] + 0.08 * (goal[0] - MOUTH[0]), goal[1] + 0.3 * (MOUTH[1] - goal[1])]
  const q = (a: number, b: number, c: number) => (1 - e) * (1 - e) * a + 2 * (1 - e) * e * b + e * e * c
  const px = q(MOUTH[0], ctrl[0], goal[0])
  const py = q(MOUTH[1], ctrl[1], goal[1])
  const m = smooth(u, 0.2, 0.95)
  const young = 0.35 + 0.65 * Math.min(1, u * 2.5)
  const seed = Math.round(puff.t0 * 1000)
  const n = puff.billows.length
  puff.billows.forEach((i, j) => {
    const b = shape.billows[i]
    // The knot: each billow round the puff's heart, tumbling.
    const ang = (j / n) * Math.PI * 2 + hash(seed, j) * 1.5 + age * 1.8
    const d = n > 1 ? 0.07 + 0.05 * hash(seed, j, 2) : 0
    const yx = Math.cos(ang) * d * young
    const yy = Math.sin(ang) * d * young
    const yr = (0.085 + 0.045 * hash(seed, j, 3)) * young
    const breathe = 1 + 0.03 * Math.sin(t * 0.8 + i * 1.7)
    billows.set(i, {
      x: px + yx + (b.x * S - cx - yx) * m,
      y: py + yy + (b.y * S - cy - yy) * m,
      r: (yr + (b.r * S - yr) * m) * breathe,
      w: 1 + ((b.w ?? 1) - 1) * m,
      a: (b.a ?? 0) * m,
    })
  })
  const thin = 1 - smooth(u, 0.2, 0.85)
  if (thin > 0) {
    for (let j = 0; j < 4; j++) {
      const ang = hash(seed, j, 5) * Math.PI * 2 + age * (1.6 + j * 0.4)
      const d = (0.1 + 0.06 * hash(seed, j, 6)) * (0.6 + 0.8 * u)
      wisps.push({ x: px + Math.cos(ang) * d, y: py + Math.sin(ang) * d * 0.8, r: (0.05 + 0.04 * hash(seed, j, 7)) * (0.7 + u) * thin })
    }
  }
  return { billows, wisps, heart: [px, py] }
}

/** Every billow of a cloud that has come so far, by index. */
function billowsOf(key: ShapeKey, t: number): Map<number, Billow> {
  const out = new Map<number, Billow>()
  for (const puff of PUFFS) if (puff.shape === key) for (const [i, b] of place(puff, t)) out.set(i, b)
  return out
}

/** The wisps round every young puff of a cloud: thin vapour, no shade. */
function drawWisps(p: p5, k: number, key: ShapeKey, t: number): void {
  p.noStroke()
  for (const puff of PUFFS) {
    if (puff.shape !== key) continue
    for (const w of flight(puff, t).wisps) {
      p.fill(alpha(p, HILL.cloud, 0.55))
      p.circle(X(w.x, k), X(w.y, k), X(2 * w.r, k))
    }
  }
}

/** An oval billow, grown by `g` and moved by (dx, dy) of its own radius. */
function oval(p: p5, k: number, b: Billow, g: number, dx = 0, dy = 0): void {
  p.push()
  p.translate(X(b.x + dx * b.r, k), X(b.y + dy * b.r, k))
  p.rotate(b.a ?? 0)
  p.ellipse(0, 0, X(2 * b.r * g * (b.w ?? 1), k), X(2 * b.r * g, k))
  p.pop()
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
  ctx.save()
  ctx.beginPath()
  for (const b of billows) {
    const rx = X(b.r * (b.w ?? 1), k)
    const ry = X(b.r, k)
    ctx.moveTo(X(b.x, k) + rx * Math.cos(b.a ?? 0), X(b.y, k) + rx * Math.sin(b.a ?? 0))
    ctx.ellipse(X(b.x, k), X(b.y, k), rx, ry, b.a ?? 0, 0, Math.PI * 2)
  }
  ctx.clip()
  p.fill(bodyC)
  for (const b of billows) oval(p, k, b, 1.02, -0.04, -0.2)
  p.fill(litC)
  for (const b of billows) oval(p, k, b, 0.9, -0.1, -0.42)
  ctx.restore()
}

function drawShape(p: p5, k: number, key: ShapeKey, t: number): void {
  const shape = SHAPES[key]
  const got = billowsOf(key, t)
  if (!got.size) return
  drawWisps(p, k, key, t)
  for (const g of shape.groups) {
    const list = g.of.map((i) => got.get(i)).filter((b): b is Billow => !!b)
    cloud(p, k, list, g.tone ?? 0)
    // The falls pour between the cliff and the mist at its foot: a bright ribbon off the middle of the lip.
    if (key === 'falls' && g === shape.groups[1]) drawPour(p, k, t)
  }
}

/** The falls: they begin at the lip when their chuff's steam gets there, and pour down to the mist. */
function drawPour(p: p5, k: number, t: number): void {
  const pour = smooth(t, POUR + 1.1, POUR + 2.6)
  if (pour <= 0) return
  const [fx, fy] = FALLS_CLOUD.at(t)
  const S = FALLS_CLOUD.size
  const P = (dx: number, dy: number) => p.vertex(X(fx + dx * S, k), X(fy + dy * S, k))
  const y0 = -0.42
  const y1 = y0 + 1.12 * pour
  p.noStroke()
  p.fill(alpha(p, HILL.cloud, 0.45))
  p.beginShape()
  P(0.0, y0)
  P(0.2, y0)
  P(0.26, y1)
  P(-0.04, y1)
  p.endShape(p.CLOSE)
  p.fill(HILL.cloud)
  p.beginShape()
  P(0.03, y0 - 0.02)
  P(0.17, y0 - 0.02)
  P(0.21, y1)
  P(0.0, y1)
  p.endShape(p.CLOSE)
  // The water's fall, a little shade down one side of the ribbon.
  p.fill(alpha(p, mixHex(HILL.cloudShade, HILL.sky, 0.35), 0.8))
  p.beginShape()
  P(0.12, y0 + 0.08)
  P(0.17, y0 + 0.08)
  P(0.21, y1)
  P(0.15, y1)
  p.endShape(p.CLOSE)
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
 * The plume of each fresh chuff: a spurt of vapour out of the chimney's mouth, drawn out upward, then a thinning
 * wisp from the mouth up to the young puff as it lifts away. A chuff that becomes nothing rises as the wisp alone.
 */
function drawPlumes(p: p5, k: number, t: number): void {
  p.noStroke()
  for (const puff of PUFFS) {
    const age = t - puff.t0
    const life = puff.billows.length ? 0.9 : 2.2
    if (age < 0 || age > life) continue
    const fade = 1 - smooth(age, life * 0.2, life)
    // Where the wisp reaches: the young puff's heart, or (with no puff) a rising end of its own.
    const heart = flight(puff, t).heart
    let top: Pt
    if (heart) top = heart
    else {
      const rise = 0.15 + 1.0 * (1 - Math.pow(1 - Math.min(1, age / 2.2), 2))
      top = [MOUTH[0] + 0.1 * rise, MOUTH[1] - rise]
    }
    // Its foot lets go of the mouth as the valve closes.
    const let_ = smooth(age, 0.12, 0.6)
    const from: Pt = [MOUTH[0] + (top[0] - MOUTH[0]) * let_ * 0.75, MOUTH[1] + (top[1] - MOUTH[1]) * let_ * 0.75]
    const size = (0.55 + 0.45 * puff.amp) * (0.7 + 0.5 * smooth(age, 0, 0.3))
    const n = 12
    for (let i = 0; i <= n; i++) {
      const s = i / n
      const x = from[0] + (top[0] - from[0]) * s + 0.012 * Math.sin(age * 8 + i * 0.9)
      const y = from[1] + (top[1] - from[1]) * s
      const r = (0.035 + 0.06 * s) * size
      p.fill(alpha(p, HILL.cloud, 0.42 * fade * (0.5 + 0.5 * s)))
      p.ellipse(X(x, k), X(y - r * 0.3, k), X(2 * r * 0.8, k), X(2 * r * 1.35, k))
    }
  }
}

/** The blanket: red and cream check, lying on the grass, a fold at its far end. */
function drawBlanket(p: p5, k: number, weight: number): void {
  const P = (v: number) => X(v, k)
  const { x0, x1 } = BLANKET
  const top = R - 0.012
  const bottom = R + 0.05
  p.push()
  p.rectMode(p.CORNER)
  p.stroke(INK)
  p.strokeWeight(weight * 0.7)
  p.fill(HOME.trim)
  p.beginShape()
  p.vertex(P(x0 + 0.03), P(top))
  p.vertex(P(x1 - 0.04), P(top))
  p.quadraticVertex(P(x1 + 0.05), P(top + 0.01), P(x1 + 0.03), P(bottom))
  p.vertex(P(x0 - 0.02), P(bottom))
  p.quadraticVertex(P(x0 - 0.04), P(top + 0.02), P(x0 + 0.03), P(top))
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(alpha(p, HILL.blanket, 0.9))
  const w = 0.11
  for (let i = 0; x0 + i * w < x1; i++) {
    if (i % 2) continue
    const a = x0 + i * w
    p.rect(P(a), P(top + 0.004), P(Math.min(w, x1 - a)), P(bottom - top - 0.008))
  }
  p.fill(alpha(p, HILL.blanket, 0.35))
  p.rect(P(x0), P(top + (bottom - top) * 0.35), P(x1 - x0), P((bottom - top) * 0.3))
  p.pop()
}

/* ------------------------------------------------------------------ the two of them */

/** Ellie's one bounce of delight, when the airship is whole: up on the last beat of bar 37, down on bar 38. */
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
      if (f.x1 > 4) drawShape(p, k, 'falls', t)
      drawShape(p, k, 'baby', t)
      drawBlanket(p, k, weight)
      drawEngine(p, k, weight, t)
      drawPlumes(p, k, t)
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
    // Up with the first puffs to the whole sky, the two dreams held wide, and down again with the baby onto the two of
    // them, looking up at it (`CUTS.nursery`).
    const c = (dx: number, dy: number): Pt => [CARL[0] + dx, CARL[1] + dy]
    return [
      { t: slot.begin + 2.0, cells: 6.0, hold: c(1.6, -1.9) },
      { t: slot.begin + 4.2, cells: 7.6, hold: c(2.6, -2.15) },
      { t: slot.begin + 7.6, cells: 8.0, hold: c(3.05, -2.25) },
      { t: slot.begin + 10.4, cells: 6.0, hold: c(1.3, -1.75) },
      { t: slot.end, cells: CUTS.nursery.cells, hold: c(CUTS.nursery.frame[0], CUTS.nursery.frame[1]) },
    ]
  },
)

/** Every strike of this part, in show seconds (check:shows holds each to the music): every chuff, one a bar, and the double; and his start, down on a beat. */
export const CLOUDS_HITS: number[] = [...PUFFS.map((p) => p.t0), START.down].sort((a, b) => a - b)

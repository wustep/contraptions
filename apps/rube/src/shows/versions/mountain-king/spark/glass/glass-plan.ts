import { R, type Pt } from '../../../../../parts'
import { smooth } from '../kit'
import { DOORS, inPhrase } from '../music'
import { SEAMS } from '../seams'

/**
 * GLASS's plan: where everything in the glasshouse is, and how it moves, as functions of show time. The lane and the
 * drawing both read these, so the spark never slides off what carries it.
 *
 * The part's frame is the glassworks' world cells (the leg is laid at [0, 0]): the spark comes out of the glory
 * hole's mouth at (-0.5, 0). West to east:
 *
 *   the glory hole     a round mouth in a brick oven, always roaring (the dash home goes back through it)
 *   the blowing cart   a little iron cart on a gently sloping rail, the blowpipe in its yokes, a bellows on its bed
 *                      pumped by a crank on its front wheel: as it rolls east the pipe turns and the bellows blows,
 *                      a puff a strong note
 *   the mould          an iron mould at the head of the lehr's belt, its two halves hung like a pair of doors on an
 *                      iron back plate: open flat, they show the bottle's shape inside them; shut, they are a block
 *   the lehr           a slow belt over a brick bed, three fires under it, hot to cool
 *   the bottle organ   seven finished bottles up a stepped rack, tuned with water, toward the furnace's port
 *   the furnace        the great beehive at the east end; its working port breathes flame, and draws the spark up
 */

/* ------------------------------------------------------------------ the music */

const e = (n: number, j: number) => inPhrase(n, j)

/** The door in, and the door out. */
export const S0 = DOORS.glass
export const S1 = DOORS.regatta
/** Off the pipe (a tink), then into the gather (a plop that tips the cart off its rest). */
export const TINK = e(6, 2)
export const PLOP = e(6, 4)
/** The bellows bottoms out: a puff, and the bubble swells. Bar 2's two figures, and bar 3's downbeat. */
export const PUFFS = [e(6, 8), e(6, 12), e(6, 16)] as const
/** The cart comes to rest at the rail's end, over the mould. */
export const STOP = e(6, 20)
/** The glass comes down into the mould; its halves slam shut round it. The phrase's big note. */
export const CLAP = e(6, 24)
/** The wet mould hisses. */
export const HISS = [e(6, 26), e(6, 28)] as const
/** Phrase 7's first note: the mould unlatches and swings open on a glowing bottle, its halves clanking onto their stops. */
export const OPEN = e(7, 0)
export const OPENED = e(7, 2)
/** The belt takes up; the neck, still on the pipe, draws out into a thread and cracks off. */
export const BELT_GO = e(7, 4)
export const SNAP = e(7, 10)
/** The bottle crosses into each cooler part of the lehr, and pings as it cools. */
export const PINGS = [e(7, 18), e(7, 22), e(7, 26)] as const
/** The belt comes to rest at its end; the spark hops off onto the organ. */
export const BELT_STOP = e(8, 0)
export const HOP_OFF = e(8, 2)
/** Seven bottles rung, one a note of the B phrase (its big ones, and bar 3's quieter downbeat); a spring off each a quarter later. */
export const RINGS = [e(8, 4), e(8, 8), e(8, 12), e(8, 16), e(8, 20), e(8, 24), e(8, 28)] as const
export const SPRINGS = [e(8, 6), e(8, 10), e(8, 14), e(8, 18), e(8, 22), e(8, 26)] as const
/** The last, the great demijohn under the furnace's port, flings it up into the draught. */
export const DRAW = RINGS[6]

/* ------------------------------------------------------------------ the shop */

/** The glory hole's mouth: the spark comes out of it, and goes back through it on the way home. */
export const GLORY: { x: number; y: number; r: number } = { x: -0.5, y: 0, r: 0.8 }
/** The glory hole's oven: its brick block. */
export const OVEN = { x0: -3.7, x1: 0.42, top: -1.9 }

/* ------------------------------------------------------------------ the flight out, and the gather */

/** The spark's gravity here (`G` in `physics.ts`). */
const GRAV = 12
const V_IN = SEAMS.glass.v
/** Where the spark ticks off the pipe (the parabola it came out of the fire on, at TINK). */
const T1 = TINK - S0
export const AT_TINK: Pt = [-0.5 + V_IN[0] * T1, V_IN[1] * T1 + 0.5 * GRAV * T1 * T1]
/** The pipe's radius, and the gather's radius as it comes out of the fire. */
export const PIPE_R = 0.055
export const R0 = 0.44
/** How far the spark sinks into molten glass, or into a bottle's mouth. */
export const SINK = 0.035
/** The pipe's axis at the start: its top is where the spark ticks off it. */
export const PIPE0 = AT_TINK[1] + R + PIPE_R
/** The gather hangs a little under the pipe's axis. */
const HANG = 0.04
/** The pipe's tip, where the gather sits on it. */
export const TIP0 = AT_TINK[0] + 0.5

/* ------------------------------------------------------------------ the cart */

/** The rail falls this much a cell to the east: the cart rolls by itself, governed by the bellows it works. */
export const SLOPE = 0.04
/** How long the pipe is, tip to mouthpiece. */
export const PIPE_LEN = 4.75
/** Where the cart's wheels and yokes are, back from the tip. */
export const CART = { front: 2.3, rear: 3.9, yokeF: 2.05, yokeR: 4.05 }
/** Where the tip comes to rest, over the mould. */
export const MOULD_X = 4.6

/**
 * The bellows' pump phase: 0.5 at rest (its board up, full), an integer when the board is down (a puff). It starts
 * from rest on PLOP (the spark's weight in the gather tips the cart off its rest), runs a turn a puff, and comes to
 * rest a half turn after the last.
 */
const P_STOP = (() => {
  const v = 1 / (PUFFS[2] - PUFFS[1])
  return 3 + (v * (STOP - PUFFS[2])) / 2
})()
export function pumpPhase(t: number): number {
  if (t <= PLOP) return 0.5
  if (t <= PUFFS[0]) {
    const s = (t - PLOP) / (PUFFS[0] - PLOP)
    return 0.5 + 0.5 * s * s
  }
  if (t <= PUFFS[1]) return 1 + (t - PUFFS[0]) / (PUFFS[1] - PUFFS[0])
  if (t <= PUFFS[2]) return 2 + (t - PUFFS[1]) / (PUFFS[2] - PUFFS[1])
  if (t <= STOP) {
    const v = 1 / (PUFFS[2] - PUFFS[1])
    const D = STOP - PUFFS[2]
    const u = t - PUFFS[2]
    return 3 + v * u - (0.5 * v * u * u) / D
  }
  return P_STOP
}
/** Cells the cart goes a turn: the crank is on its front wheel, so a turn of the wheel is a pump. */
export const LAMBDA = (MOULD_X - TIP0) / (P_STOP - 0.5)
/** The cart's wheels' radius. */
export const WHEEL_R = LAMBDA / (2 * Math.PI)
/** How far the cart has rolled east. */
export const travel = (t: number): number => LAMBDA * (pumpPhase(t) - 0.5)
/** The pipe's axis where the cart comes to rest. */
export const PIPE_STOP = PIPE0 + SLOPE * (MOULD_X - TIP0)

/** The spark's tick sets the pipe humming; the mould's slam shakes its tip; when the neck cracks off, the tip springs. */
function pipeShake(t: number): number {
  let y = 0
  if (t > TINK) {
    const u = t - TINK
    y += 0.03 * Math.exp(-u / 0.12) * Math.sin(u * 48)
  }
  if (t > CLAP) {
    const u = t - CLAP
    y += 0.03 * Math.exp(-u / 0.16) * Math.sin(u * 44)
  }
  if (t > SNAP) {
    const u = t - SNAP
    y -= 0.05 * Math.exp(-u / 0.16) * Math.sin(u * 34)
  }
  return y
}
/** The pipe's tip (world cells): it rides the cart down the rail. */
export const tipAt = (t: number): Pt => {
  const u = travel(t)
  return [TIP0 + u, PIPE0 + SLOPE * u + pipeShake(t)]
}
/** The rail's top at `x`: the wheels sit on it, the pipe level above. */
export const PIPE_UP = 1.02
export const railAt = (x: number): number => PIPE0 + PIPE_UP + SLOPE * (x - TIP0)
/** Where the rail runs, from its rest to its buffer. */
export const RAIL = { x0: TIP0 - CART.rear - 0.55, x1: MOULD_X - CART.front + 0.42 }
/** The wheels' turn (radians): they roll. */
export const wheelTurn = (t: number): number => travel(t) / WHEEL_R
/** The pipe's turn (radians): geared from the wheels, so the gather keeps round as it goes. */
export const pipeTurn = (t: number): number => 0.6 * wheelTurn(t)
/** The bellows: 1 full (the board up), 0 pressed (the board down, on a puff). */
export const bellowsOpen = (t: number): number => 0.5 + 0.5 * Math.cos(2 * Math.PI * (pumpPhase(t) - 0.5))

/* ------------------------------------------------------------------ the glass on the pipe */

/** How much each puff swells the bubble. */
const SWELL = [0.12, 0.1, 0.08]
export const R_MAX = R0 + SWELL[0] + SWELL[1] + SWELL[2]

/** The bubble's radius: each puff swells it as the board comes down, most of it at the end of the stroke. */
export function radiusAt(t: number): number {
  let r = R0
  for (let i = 0; i < 3; i++) {
    const end = PUFFS[i]
    const begin = i === 0 ? PLOP + 0.3 : PUFFS[i] - (PUFFS[i] - PUFFS[i - 1]) / 2
    const u = Math.max(0, Math.min(1, (t - begin) / (end - begin)))
    r += SWELL[i] * u * u * u
  }
  return r
}

/** How much of the gather is a blown bubble (0 a solid gather, 1 a thin-walled bubble). */
export const hollowAt = (t: number): number => smooth(t, PUFFS[0] - 0.45, PUFFS[2])

/** A soft glass wobble after the plop or a puff: squash (positive, wider and lower) and stretch, damped. */
export function wobbleAt(t: number): number {
  let w = 0
  for (const [at, a] of [[PLOP, 0.09], [PUFFS[0], 0.05], [PUFFS[1], 0.045], [PUFFS[2], 0.04]] as const) {
    const u = t - at
    if (u < 0 || u > 1.6) continue
    w += a * Math.exp(-u / 0.22) * Math.sin(u * 2 * Math.PI * 3.1)
  }
  return w
}

/**
 * The gather's sag: molten glass left still runs down. It hangs heavy as it comes out of the fire, gives a little
 * more under the spark's weight on the plop, and is turned back round as the pipe starts to turn.
 */
export function sagAt(t: number): number {
  const out = 0.1 * (1 - smooth(t, PLOP + 0.15, PLOP + 1.3))
  if (t < PLOP) return out
  const u = t - PLOP
  return out + 0.1 * (1 - Math.exp(-u / 0.14)) * (1 - smooth(u, 0.2, 1.2))
}

/** The droop into the mould: 0 round on the pipe, 1 hanging from the tip a bottle's length, into the mould. */
export const DROOP_FROM = STOP - 0.6
export function droopAt(t: number): number {
  const u = Math.max(0, Math.min(1, (t - DROOP_FROM) / (CLAP - 0.04 - DROOP_FROM)))
  // Viscous: it gives slowly, then runs.
  return u * u * (3 - 2 * u) * (0.3 + 0.7 * u)
}

/** The gather on the tip: centre and radii. A pear on the pipe's end, longer than it is tall; blown, it rounds out. */
export function bubbleAt(t: number): { cx: number; cy: number; rx: number; ry: number } {
  const [tx, ty] = tipAt(t)
  const r = radiusAt(t)
  const w = wobbleAt(t)
  const sag = sagAt(t)
  const long = 1.16 - 0.1 * hollowAt(t)
  return { cx: tx + 0.72 * r * long, cy: ty + HANG + sag * 0.5, rx: r * long * (1 + w) - sag * 0.2, ry: r * (1 - w) * 0.9 + sag * 0.4 }
}

/* ------------------------------------------------------------------ the mould and the bottle */

/** The collar of glass round the pipe's tip: its top is the bottle's mouth, where the spark sits. */
export const COLLAR = 0.075
export const MOUTH_Y = PIPE_STOP - PIPE_R - COLLAR
/** The bottle, hanging from the tip into the mould: its long neck, its shoulder, its body, its base on the sand. */
export const NECK_W = 0.12
export const BODY_W = 0.37
export const SHOULDER_Y = PIPE_STOP + 0.8
export const BODY_Y = SHOULDER_Y + 0.22
export const BASE_Y = BODY_Y + 1.12
export const BOTTLE_H = BASE_Y - MOUTH_Y
/** The mould: two halves, each `HALF` wide, from `JAW_TOP` down to the sand, hung on hinges at their outer edges. */
export const HALF = 0.5
export const JAW_TOP = SHOULDER_Y - 0.12
export const JAW_LEN = BASE_Y - JAW_TOP
/** The lehr's belt: sand on iron slats, over a brick bed; the shop's floor. */
export const SAND_Y = BASE_Y
export const BELT_Y = SAND_Y + 0.07
export const BED_Y = BELT_Y + 0.16
export const FLOOR_Y = BED_Y + 1.05

/**
 * How far the mould's halves are swung open (radians): π lying open flat against the back plate, 0 shut. Slammed shut
 * on CLAP (they gather speed all the way in), a little bounce; swung open on OPEN, easing onto their stops.
 */
export function doorAngle(t: number): number {
  const slam = 0.22
  if (t < CLAP - slam) return Math.PI
  if (t < CLAP) {
    const u = (t - (CLAP - slam)) / slam
    return Math.PI * (1 - u * u * u)
  }
  if (t < OPEN) {
    const u = t - CLAP
    return 0.09 * Math.exp(-u / 0.07) * Math.abs(Math.sin(u * 36))
  }
  const swing = OPENED - OPEN
  const u = t - OPEN
  if (u < swing) {
    // Eased off the latch, gathering speed as they fall open onto their stops.
    const s = u / swing
    return Math.PI * s * s * (1.6 - 0.6 * s)
  }
  const v = u - swing
  return Math.PI - 0.08 * Math.exp(-v / 0.12) * Math.abs(Math.sin(v * 20))
}

/** The belt's run: it takes up from rest on BELT_GO, slowly, and eases to a stop at its end on BELT_STOP. */
export const BELT_LEN = 5.4
const UP = 1.1
const DOWN = 1.1
export function beltAt(t: number): number {
  if (t <= BELT_GO) return 0
  const D = BELT_STOP - BELT_GO
  const v = BELT_LEN / (D - (UP + DOWN) / 2)
  const u = Math.min(t, BELT_STOP) - BELT_GO
  if (u < UP) return (0.5 * v * u * u) / UP
  if (u < D - DOWN) return 0.5 * v * UP + v * (u - UP)
  const w = D - u
  return BELT_LEN - (0.5 * v * w * w) / DOWN
}
/** The belt's end, where the bottle comes to rest. */
export const END_X = MOULD_X + BELT_LEN

/** The bottle's lean (radians, positive top west): held back by its neck as the belt takes it, rocking when freed. */
export function bottleLean(t: number): number {
  if (t < BELT_GO) return 0
  if (t < SNAP) return 0.1 * smooth(t, BELT_GO, SNAP)
  const u = t - SNAP
  let a = 0.1 * Math.exp(-u / 0.3) * Math.cos(u * 10.5)
  if (t > BELT_STOP - 0.3) a -= 0.035 * smooth(t, BELT_STOP - 0.3, BELT_STOP) * Math.exp(-Math.max(0, t - BELT_STOP) / 0.35) * Math.cos(Math.max(0, t - BELT_STOP) * 11)
  // A cooling ping: the glass shivers.
  for (const at of PINGS) {
    const v = t - at
    if (v > 0 && v < 0.8) a += 0.012 * Math.exp(-v / 0.12) * Math.sin(v * 62)
  }
  return a
}

/** Where the bottle's base stands, and its lean. */
export function bottleAt(t: number): { x: number; y: number; lean: number } {
  return { x: MOULD_X + beltAt(t), y: BASE_Y, lean: bottleLean(t) }
}

/** A point `h` up the bottle's axis from its base, leant. */
export const upBottle = (b: { x: number; y: number; lean: number }, h: number): Pt => [b.x - h * Math.sin(b.lean), b.y - h * Math.cos(b.lean)]

/** How hot the bottle is: 1 glowing, 0 cold glass. It cools in the lehr in steps, a ping in each cooler part. */
export function bottleHeat(t: number): number {
  if (t < OPEN) return 1
  let h = 1 - 0.1 * smooth(t, OPEN, BELT_GO + 1.5)
  for (let i = 0; i < 3; i++) h -= 0.3 * smooth(t, PINGS[i] - 0.04, PINGS[i] + 0.45)
  return Math.max(0, h)
}

/** Where the bottle is at each ping: the lehr's parts meet there. */
export const ZONES = PINGS.map((at) => MOULD_X + beltAt(at))
/** The lehr's bed, from under the mould to past the belt's end. */
export const LEHR = { x0: MOULD_X - 1.45, x1: END_X + 0.9 }

/* ------------------------------------------------------------------ the bottle organ */

/** The seven tuned bottles: where each stands (its base's middle), its size and glass. Bigger to the east. */
export interface Tuned {
  x: number
  base: number
  h: number
  w: number
  neck: number
  glass: 'glass' | 'glassDeep' | 'cobalt' | 'amber'
  /** How full of water (0..1 of the body). */
  water: number
}
/** Where the spark sits in the lehr's bottle's mouth. */
export const LEHR_SEAT = MOUTH_Y - R + SINK
/** The spark's height sitting in each bottle's mouth: a rising line up the rack toward the furnace's port. */
const SEATS = [0, 1, 2, 3, 4, 5, 6].map((i) => LEHR_SEAT - 0.3 - 0.29 * i)
const SIZES: [number, number, number][] = [
  // height, half width, neck
  [1.3, 0.25, 0.1],
  [1.42, 0.31, 0.105],
  [1.52, 0.27, 0.11],
  [1.64, 0.35, 0.115],
  [1.78, 0.31, 0.12],
  [1.95, 0.4, 0.13],
  [2.3, 0.62, 0.14],
]
const GLASSES: Tuned['glass'][] = ['glass', 'cobalt', 'amber', 'glassDeep', 'glass', 'cobalt', 'glassDeep']
const WATER = [0.8, 0.65, 0.7, 0.5, 0.55, 0.45, 0.35]
export const ORGAN: Tuned[] = SIZES.map(([h, w, neck], i) => {
  const x = END_X + 1.2 + 0.98 * i + (i === 6 ? 0.2 : 0)
  const mouth = SEATS[i] + R - SINK
  return { x, base: mouth + h, h, w, neck, glass: GLASSES[i], water: WATER[i] }
})
/** Where the spark sits in bottle `i`'s mouth. */
export const mouthOf = (i: number): Pt => [ORGAN[i].x, SEATS[i]]

/** How hard bottle `i` is ringing at `t`: 1 as it is struck, dying away. The last rings longest. */
export function ringOf(i: number, t: number): number {
  const u = t - RINGS[i]
  if (u < 0) return 0
  return Math.exp(-u / (i === 6 ? 1.1 : 0.55))
}

/* ------------------------------------------------------------------ the furnace, and the draught out */

/**
 * The last climb: the demijohn's ring flings the spark up off its mouth, and the furnace's draught takes it, faster
 * and faster, to the seam's velocity at the door.
 */
const V_OUT = SEAMS.regatta.v
export const RISE = S1 - DRAW
const V_FLING: Pt = [V_OUT[0], -1.25]
const A_UP = (V_OUT[1] - V_FLING[1]) / RISE
export function riseAt(t: number): Pt {
  const [x, y] = mouthOf(6)
  const u = Math.max(0, Math.min(RISE, t - DRAW))
  return [x + V_FLING[0] * u, y + V_FLING[1] * u + 0.5 * A_UP * u * u]
}
/** Where the spark is at the door out. */
export const OUT: Pt = riseAt(S1)
/** The great furnace's working port: an arch, its heart where the spark goes in. */
export const PORT = { x: OUT[0] + 0.05, y: OUT[1] - 0.05, w: 2.1, h: 2.6 }
/** The furnace's brick: its west face, its east end, the top of its wall (its crown rises over it). */
export const FURNACE = { x0: PORT.x - 2.2, x1: PORT.x + 5.4, top: PORT.y - PORT.h / 2 - 1.3 }
/** The stepped rack the organ stands on: a step under each bottle, up to the furnace's face. */
export const RACK = { x0: ORGAN[0].x - 0.5, x1: ORGAN[6].x + 0.78 }

/* ------------------------------------------------------------------ the shape of the glass on the pipe */

/** A closed outline resampled to `n` points evenly along its length, from its first point on. */
export function resample(poly: Pt[], n: number): Pt[] {
  const seg: number[] = []
  let total = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const d = Math.hypot(b[0] - a[0], b[1] - a[1])
    seg.push(d)
    total += d
  }
  const out: Pt[] = []
  let j = 0
  let acc = 0
  for (let i = 0; i < n; i++) {
    const want = (total * i) / n
    while (acc + seg[j] < want && j < seg.length - 1) {
      acc += seg[j]
      j++
    }
    const a = poly[j]
    const b = poly[(j + 1) % poly.length]
    const f = seg[j] > 0 ? (want - acc) / seg[j] : 0
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
  }
  return out
}

/**
 * A bottle's outline standing on its axis at `x`: from the middle of its mouth (`top`) clockwise, a neck `neck` wide
 * (half), a shoulder rounding out from `shoulder` into the body at `body`, straight down to the base. The pendant, the
 * bottle on the lehr and the tuned bottles are all drawn from it, so glass keeps its shape as it goes.
 */
export function bottleOutline(x: number, top: number, shoulder: number, body: number, base: number, neck: number, half: number): Pt[] {
  const east: Pt[] = []
  // The rounded lip.
  const cap = Math.min(neck * 0.7, 0.07)
  for (let i = 0; i <= 4; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / 4)
    east.push([x + (neck - cap) + cap * Math.cos(a), top + cap + cap * Math.sin(a)])
  }
  // Down the neck; the shoulder rounds out into the body.
  east.push([x + neck, shoulder])
  for (let i = 1; i <= 8; i++) {
    const u = i / 8
    const s = Math.sin((u * Math.PI) / 2)
    east.push([x + neck + (half - neck) * s, shoulder + (body - shoulder) * (1 - Math.cos((u * Math.PI) / 2))])
  }
  // The body, and its rounded foot.
  const foot = Math.min(0.08, half * 0.3)
  east.push([x + half, base - foot])
  for (let i = 1; i <= 3; i++) {
    const a = (Math.PI / 2) * (i / 3)
    east.push([x + half - foot + foot * Math.cos(a), base - foot + foot * Math.sin(a)])
  }
  const west: Pt[] = east.map(([px, py]) => [2 * x - px, py] as Pt).reverse()
  // From the middle of the mouth, so the first point is the top of the glass: where the spark sits.
  return [[x, top], ...east.slice(0, -1), [x, base], ...west.slice(1)]
}

/** The bottle as it hangs from the tip into the mould. */
export const PENDANT: Pt[] = bottleOutline(MOULD_X, MOUTH_Y, SHOULDER_Y, BODY_Y, BASE_Y, NECK_W, BODY_W)

/** The droop's middle: the bubble swung down under the tip, hanging as a pear, before it runs down a bottle's length. */
function hanging(i: number, n: number, t: number): Pt {
  const [tx, ty] = tipAt(t)
  const ry = 0.7
  const rx = 0.46
  const cy = ty - PIPE_R - COLLAR + ry
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n
  const s = Math.sin(a)
  // Heavier at the bottom: a pear, not an egg.
  const belly = 1 + 0.2 * s
  return [tx + rx * Math.cos(a) * belly, cy + ry * s]
}

/** How many points the glass's outline has, round from its crown. */
export const GLASS_N = 72
const PENDANT_N = resample(PENDANT, GLASS_N)

/** The glass on the pipe at `t`, round from its crown clockwise: a gather, a bubble, drooping into the bottle. */
export function glassOutline(t: number): Pt[] {
  const b = bubbleAt(t)
  const sag = sagAt(t)
  const d = droopAt(t)
  const [, ty] = tipAt(t)
  const dy = ty - PIPE_STOP
  const neckIn = 1 - hollowAt(t) * 0.5
  const out: Pt[] = []
  for (let i = 0; i < GLASS_N; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / GLASS_N
    const s = Math.sin(a)
    const c = Math.cos(a)
    // The gather's west end draws in round the pipe: a pear on its tip.
    const pinch = c < 0 ? 1 - 0.45 * c * c * neckIn : 1
    const round: Pt = [b.cx + b.rx * c, b.cy + b.ry * s * pinch + sag * 0.9 * Math.max(0, s) ** 2]
    if (d <= 0) {
      out.push(round)
      continue
    }
    // Round, swung under the tip; then run down into the bottle's length.
    const hang = hanging(i, GLASS_N, t)
    const f = Math.min(1, d * 2)
    const g = Math.max(0, d * 2 - 1)
    const ef = f * f * (3 - 2 * f)
    const eg = g * g * (3 - 2 * g)
    const mid: Pt = [round[0] + (hang[0] - round[0]) * ef, round[1] + (hang[1] - round[1]) * ef]
    const pend = PENDANT_N[i]
    out.push([mid[0] + (pend[0] - mid[0]) * eg, mid[1] + (pend[1] + dy - mid[1]) * eg])
  }
  return out
}

/** Where the spark sits on the glass on the pipe: on its crown, sunk in a little. */
export function onGlass(t: number): Pt {
  const [x, y] = glassOutline(t)[0]
  // The plop: it sinks in, and the glass gives under it and comes back.
  const u = t - PLOP
  const dent = u > 0 ? 0.05 * (u / 0.07) * Math.exp(1 - u / 0.07) : 0
  return [x, y - R + SINK + dent]
}

/** Where the spark sits on the bottle's mouth: on the collar round the tip while the mould works, then on the belt. */
export function inBottle(t: number): Pt {
  const [x, y] = upBottle(bottleAt(t), BOTTLE_H)
  const [, ty] = tipAt(t)
  // Until the belt takes it, the mouth is the collar on the pipe's tip, and shakes with it.
  const shake = t < BELT_GO ? ty - PIPE_STOP : 0
  return [x, y - R + SINK + shake]
}

/** A rung bottle shivers side to side, a little, dying fast. */
export function shiverOf(i: number, t: number): number {
  const u = t - RINGS[i]
  if (u < 0) return 0
  return 0.014 * Math.exp(-u / 0.18) * Math.sin(u * 70)
}

/** Where the spark sits in bottle `i`'s mouth, the bottle ringing under it. */
export function onTuned(i: number, t: number): Pt {
  const [x, y] = mouthOf(i)
  const u = t - RINGS[i]
  const dip = u > 0 ? 0.045 * (u / 0.06) * Math.exp(1 - u / 0.06) : 0
  return [x + shiverOf(i, t), y + dip]
}

/** Where the spark lands in the gather: on its crown as the cart sits on its rest. */
export const AT_PLOP: Pt = onGlass(PLOP)

import { blob, clamp01, fill, mix, poly, ring, rgba, smoother, type Paint } from '../../draw'
import { M } from '../../music'
import type { Pt } from '../../path'
import { FORECOURT, HORSE_AT_TEMPLE, SHORE, ground } from './geo'
import { strokeIn } from './ink'

/**
 * The horse: black, rearing on its hind legs, facing the sea it was left for. It is built on a timber sledge, and is
 * drawn in its own units, a man high (BU cells), from the sledge's foot: x forward (towards the sea), y up negative.
 *
 * At dusk it stands half sunk in the surf, listing, and the Trojans haul it up the beach over a road of logs by ropes
 * made fast to the sledge: four heaves, on the theme's four strongest notes, each a lurch and a slow settle. That night
 * it stands on Athena's forecourt. Inside it, cut open on our side, his men and he are packed on a floor in its belly.
 */

export const BU = 0.3

/** The four heaves up the beach: when each starts, how far it hauls the horse (cells), and how long it takes. */
export const HEAVES: [number, number, number][] = [
  [5.71, 1.7, 3.4],
  [16.2, 2.0, 2.8],
  [26.97, 2.1, 3.4],
  [31.58, 2.4, 3.6],
]
/** Between the second heave and the third, the Trojans test it with their spears: a thrust on each of these notes. */
export const THRUSTS = [19.78, 20.23, 20.65, 25.2]
/** Where it stands at dusk before the first heave (in the surf), and where the last leaves it. */
export const HORSE_START = -1.6
const HAULED = HEAVES.reduce((s, h) => s + h[1], 0)
export const HORSE_END = HORSE_START - HAULED
/** The ropes go taut on this note, a moment before the first heave. */
export const TAUT = 4.53

/** The logs laid up the beach for it to ride on: their resting places at dusk, and their radius. */
export const LOG_R = 0.08
export const LOGS: number[] = Array.from({ length: 12 }, (_, i) => SHORE - 0.25 - i * 0.72)
/** Half the sledge's length, in cells. */
export const SLEDGE = 2.7 * BU

/** How far it has been hauled by `t` (cells, along the beach). */
export function hauled(t: number): number {
  let d = 0
  for (const [at, by, dur] of HEAVES) d += by * smoother(t, at, at + dur)
  // The ropes taking the strain: a few hundredths, and back.
  d += 0.04 * Math.max(0, ring(t, TAUT, 0.7, 0.5))
  return d
}

/** How far up off the sand the sledge rides (on the logs once it has reached them). */
function lift(x: number): number {
  return 2 * LOG_R * smoother(-x, -(SHORE + 0.1) - 0.4, -(SHORE + 0.1) + 0.5)
}

export interface HorsePose {
  /** The sledge's foot, in the world. */
  x: number
  y: number
  /** Turned, radians, clockwise on the screen. */
  a: number
}

/** The horse at dusk on the beach at `t`. */
function onBeach(t: number): HorsePose {
  const x = HORSE_START - hauled(t)
  // It lists in the surf, and rights itself as the logs take it; each heave rocks it, and it settles.
  const list = 0.13 * (1 - smoother(-x, 2.2, 5.6))
  const slope = Math.atan2(ground(x + SLEDGE) - ground(x - SLEDGE), 2 * SLEDGE)
  let rock = 0
  for (const [at] of HEAVES) rock += -0.035 * ring(t, at + 0.15, 0.55, 0.9)
  const y = ground(x) - lift(x)
  return { x, y, a: list + slope * 0.8 + rock }
}

/** Where it stands at night: on the forecourt, square. */
const TEMPLE_POSE: HorsePose = { x: HORSE_AT_TEMPLE, y: FORECOURT.y, a: 0 }

/** The horse at `t`: on the beach until the cut away to Ithaca, then (unseen) brought up to the temple. */
export function horseAt(t: number): HorsePose {
  if (t <= M.second + 1) return onBeach(t)
  const from = onBeach(M.second + 1)
  const u = smoother(t, M.second + 2, M.answer - 3)
  return { x: from.x + (TEMPLE_POSE.x - from.x) * u, y: from.y + (TEMPLE_POSE.y - from.y) * u, a: from.a * (1 - u) }
}

/** A point in the horse's own units, in the world, for a pose. */
export function toWorld(p: HorsePose, local: Pt): Pt {
  const lx = local[0] * BU
  const ly = local[1] * BU
  const c = Math.cos(p.a)
  const s = Math.sin(p.a)
  return [p.x + lx * c - ly * s, p.y + lx * s + ly * c]
}

/* ------------------------------------------------------------------ inside */

/** The floor in its belly, and the places on it, nearest the hatch first: four along the floor, three on them. */
export const FLOOR_Y = -5.5
const MAN_R = 0.112 / BU
const HERO_R = 0.13 / BU
const ROW1 = FLOOR_Y - MAN_R
const ROW2_MAN = ROW1 - Math.sqrt((2 * MAN_R) ** 2 - MAN_R ** 2)
const ROW2_HERO = ROW1 - Math.sqrt((MAN_R + HERO_R) ** 2 - MAN_R ** 2)
/**
 * Places, in the order they empty towards the hatch: a zigzag along the floor and over it, so that when the man nearest
 * the hatch goes, each of the others moves one place on, down into the gap or along to it, never through another.
 * The hero is in the last place, on top at the back: the last out.
 */
const PLACES: [number, 1 | 2][] = [
  [0.86, 1],
  [0.485, 2],
  [0.11, 1],
  [-0.265, 2],
  [-0.64, 1],
  [-1.39, 1],
  [-1.015, 2],
]
export const PLACE_COUNT = PLACES.length
export function slot(k: number, hero: boolean): Pt {
  const [x, row] = PLACES[Math.max(0, Math.min(PLACES.length - 1, k))]
  if (row === 1) return [x, ROW1 + (hero ? MAN_R - HERO_R : 0)]
  return [x, hero ? ROW2_HERO : ROW2_MAN]
}
/** The floor's end by the hatch, and the hatch's hinge, where the rope is made fast. */
export const FLOOR_END: Pt = [1.25, FLOOR_Y]
export const HATCH_HINGE: Pt = [1.12, -5.22]
export const HATCH_TIP: Pt = [1.72, -5.82]
export const ROPE_TOP: Pt = [1.45, -5.42]

/** How the packed men are thrown about by the heaves, and pressed forward from the spears: a share of a man's width. */
export function slosh(t: number): number {
  let s = 0
  for (const [at] of HEAVES) s += 0.35 * ring(t, at + 0.1, 0.6, 0.8)
  for (const at of THRUSTS) s += 0.09 * smoother(t, at, at + 0.2) * (1 - smoother(t, at + 1.0, at + 1.9))
  return s
}

/* ------------------------------------------------------------------ drawing */

const BODY: Pt[] = [
  [-2.55, -4.95],
  [-2.65, -6.0],
  [-2.15, -6.85],
  [-1.2, -7.45],
  [-0.15, -7.95],
  [0.4, -8.55],
  [0.72, -9.15],
  [0.98, -9.55],
  [1.42, -9.62],
  [1.95, -9.2],
  [2.38, -8.72],
  [2.52, -8.4],
  [2.3, -8.18],
  [1.85, -8.3],
  [1.55, -8.5],
  [1.72, -7.9],
  [2.05, -7.2],
  [2.2, -6.55],
  [1.95, -5.85],
  [1.15, -5.05],
  [0.35, -4.3],
  [-0.15, -3.55],
  [-0.4, -2.95],
  [-1.45, -2.7],
  [-2.45, -3.15],
  [-2.85, -4.05],
]
const EARS: Pt[] = [
  [0.86, -9.42],
  [0.84, -10.0],
  [1.08, -9.55],
  [1.06, -9.52],
  [1.18, -10.05],
  [1.36, -9.58],
]
/** The far legs (drawn first, darker) and the near ones: each a line of joints and its widths. */
const LEGS: { pts: Pt[]; w: number[]; far: boolean }[] = [
  { pts: [[-1.55, -3.3], [-2.1, -1.75], [-1.3, -0.45]], w: [1.45, 0.6, 0.46], far: true },
  { pts: [[1.55, -6.1], [2.45, -6.6], [2.5, -5.45]], w: [0.82, 0.46, 0.38], far: true },
  { pts: [[-0.95, -3.1], [-1.55, -1.55], [-0.4, -0.45]], w: [1.55, 0.64, 0.5], far: false },
  { pts: [[1.75, -6.4], [2.8, -7.05], [2.95, -5.85]], w: [0.88, 0.48, 0.4], far: false },
]
const TAIL: Pt[] = [
  [-2.55, -5.2],
  [-3.15, -4.75],
  [-3.45, -3.6],
  [-3.25, -2.1],
  [-2.95, -2.15],
  [-3.05, -3.5],
  [-2.8, -4.45],
  [-2.4, -4.95],
]
const MANE: Pt[] = [
  [-0.3, -7.9],
  [0.2, -8.65],
  [0.6, -9.3],
  [0.95, -9.6],
  [0.85, -9.1],
  [0.5, -8.45],
  [0.05, -7.75],
]
/** The edge the light catches when it comes from the sea's side: the breast and the front of the neck. */
const RIM: Pt[] = [
  [1.95, -5.85],
  [2.2, -6.55],
  [2.05, -7.2],
  [1.72, -7.9],
  [1.55, -8.5],
]
/** And the croup, the back and the crest, when it comes from behind. */
const RIM_BACK: Pt[] = [
  [-2.65, -6.0],
  [-2.15, -6.85],
  [-1.2, -7.45],
  [-0.15, -7.95],
  [0.4, -8.55],
  [0.72, -9.15],
]
/** Its belly, cut open on our side: the hollow the men are packed in. */
const HOLLOW: Pt[] = [
  [-2.2, FLOOR_Y],
  [1.25, FLOOR_Y],
  [1.62, -6.05],
  [1.5, -6.95],
  [0.6, -7.5],
  [-0.7, -7.25],
  [-1.95, -6.65],
  [-2.3, -6.0],
]

export interface HorseLook {
  ink: string
  /** The hide (tarred timber), and the timber inside. */
  hide: string
  inner: string
  /** Where the light comes from (+1 right, -1 left), its colour, and how much of it falls on the horse. */
  lightDir: number
  light: string
  lit: number
  /** How wet it still is from the sea (the waterline mark on its legs), 0 to 1. */
  wet: number
  /** The hatch: 0 shut, 1 hanging open. */
  hatch: number
  /** The slivers of light through its seams, inside: 0 to 1. */
  slivers: number
  /** Anything that comes into the hollow from outside, drawn over its timber: given the way from the world to its units. */
  inside?: (toLocal: (p: Pt) => Pt) => void
}

/** Draw the horse at `p`. */
export function drawHorse(g: Paint, p: HorsePose, look: HorseLook): void {
  const { ctx } = g
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.a)
  ctx.scale(BU, BU)
  const ink = look.ink
  const far = mix(look.hide, '#000000', 0.35)
  // The sledge it was built on.
  poly(ctx, [[-2.75, -0.45], [2.75, -0.45], [2.9, -0.12], [2.75, 0], [-2.75, 0], [-2.9, -0.12]])
  fill(ctx, mix(look.hide, '#3A2A1E', 0.55))
  strokeIn(g, ink, 1.8, BU)
  for (const leg of LEGS.filter((l) => l.far)) drawLeg(g, leg.pts, leg.w, far, ink)
  // The tail behind the body.
  blob(ctx, TAIL)
  fill(ctx, far)
  strokeIn(g, ink, 1.6, BU)
  // The body, in one shape.
  blob(ctx, BODY)
  fill(ctx, look.hide)
  strokeIn(g, ink, 2, BU)
  blob(ctx, EARS.slice(0, 3))
  fill(ctx, look.hide)
  strokeIn(g, ink, 1.6, BU)
  blob(ctx, EARS.slice(3))
  fill(ctx, look.hide)
  strokeIn(g, ink, 1.6, BU)
  blob(ctx, MANE)
  fill(ctx, mix(look.hide, '#000000', 0.45))
  // The light on the edge that faces it: a band along the outline, inside it, never a glow round it.
  if (look.lit > 0.01) {
    ctx.save()
    blob(ctx, BODY)
    ctx.clip()
    ctx.beginPath()
    const rim = look.lightDir > 0 ? RIM : RIM_BACK
    rim.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    strokeIn(g, rgba(look.light, 0.5 * look.lit), 6, BU)
    ctx.restore()
  }
  for (const leg of LEGS.filter((l) => !l.far)) drawLeg(g, leg.pts, leg.w, look.hide, ink)
  // The sea's mark on its hind legs: darker where it stood in the water.
  if (look.wet > 0.01) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(-4, -2.3, 8, 2.3)
    ctx.clip()
    ctx.fillStyle = rgba('#000000', 0.32 * look.wet)
    for (const leg of LEGS.filter((l) => !l.far && l.pts[0][1] > -4)) {
      legShape(ctx, leg.pts, leg.w)
      ctx.fill()
    }
    ctx.restore()
  }
  // The hollow, cut open: the timber inside, and the day (or the dark) in thin slivers through its seams.
  blob(ctx, HOLLOW)
  fill(ctx, look.inner)
  if (look.slivers > 0.01) {
    ctx.save()
    blob(ctx, HOLLOW)
    ctx.clip()
    ctx.fillStyle = rgba(look.light, 0.22 * look.slivers)
    for (const [x0, x1] of [[-1.6, -1.45], [-0.3, -0.18], [0.85, 0.95]]) {
      poly(ctx, [[x0, -7.9], [x1, -7.9], [x1 + 0.9, FLOOR_Y], [x0 + 0.9, FLOOR_Y]])
      ctx.fill()
    }
    ctx.restore()
  }
  if (look.inside) {
    ctx.save()
    blob(ctx, HOLLOW)
    ctx.clip()
    const c = Math.cos(p.a)
    const s = Math.sin(p.a)
    look.inside(([wx, wy]) => {
      const dx = wx - p.x
      const dy = wy - p.y
      return [(dx * c + dy * s) / BU, (-dx * s + dy * c) / BU]
    })
    ctx.restore()
  }
  blob(ctx, HOLLOW)
  strokeIn(g, ink, 1.6, BU)
  // The floor they sit on.
  ctx.beginPath()
  ctx.moveTo(-2.0, FLOOR_Y)
  ctx.lineTo(1.42, FLOOR_Y)
  strokeIn(g, ink, 2, BU)
  // The hatch, hinged at its back edge: shut, it is a line in the belly; open, it hangs down.
  const h = clamp01(look.hatch)
  const ang0 = Math.atan2(HATCH_TIP[1] - HATCH_HINGE[1], HATCH_TIP[0] - HATCH_HINGE[0])
  const ang = ang0 + (Math.PI / 2 - ang0 + 0.25) * h
  const L = Math.hypot(HATCH_TIP[0] - HATCH_HINGE[0], HATCH_TIP[1] - HATCH_HINGE[1])
  if (h > 0.01) {
    // The opening it leaves.
    poly(ctx, [HATCH_HINGE, [HATCH_HINGE[0] + 0.05, HATCH_HINGE[1] - 0.25], [HATCH_TIP[0] - 0.05, HATCH_TIP[1] - 0.25], HATCH_TIP])
    fill(ctx, mix(look.inner, '#000000', 0.5))
  }
  ctx.beginPath()
  ctx.moveTo(HATCH_HINGE[0], HATCH_HINGE[1])
  ctx.lineTo(HATCH_HINGE[0] + Math.cos(ang) * L, HATCH_HINGE[1] + Math.sin(ang) * L)
  strokeIn(g, ink, 2.6, BU)
  ctx.restore()
}

function legShape(ctx: CanvasRenderingContext2D, pts: Pt[], w: number[]): void {
  // A tapered limb through its joints: the two edges, offset by half the width square to each segment.
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const d = Math.hypot(dx, dy) || 1
    const nx = (-dy / d) * w[i] * 0.5
    const ny = (dx / d) * w[i] * 0.5
    left.push([pts[i][0] + nx, pts[i][1] + ny])
    right.push([pts[i][0] - nx, pts[i][1] - ny])
  }
  const end = pts[pts.length - 1]
  const hoof: Pt = [end[0], end[1] + 0.08]
  blob(ctx, [...left, hoof, ...right.reverse()])
}

function drawLeg(g: Paint, pts: Pt[], w: number[], color: string, ink: string): void {
  legShape(g.ctx, pts, w)
  fill(g.ctx, color)
  strokeIn(g, ink, 1.8, BU)
}

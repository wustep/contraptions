import type p5 from 'p5'
import { outline, solid } from '../../../../../../../../src/core/draw'
import { clamp } from '../../../../../../../../src/core/ease'
import { FLOOR, mixHex, type Pt } from '../../../../../parts'
import { alpha, frame, hash, knock, scenery, smooth } from '../kit'
import { GREAT, HOME_HITS, home } from '../music'
import { HOME_CIRCLE } from '../seams'
import { KNOTS, WIRE_A, WIRE_B, lanternAt } from './set-garland'
import { EYE_PUPIL, EYE_WHITE, HOME, LAUNDROMAT } from '../worlds'

/**
 * The Wang family laundromat: the room every home leg happens in, and the canonical drawings of its fixtures.
 *
 * The room is one long shop seen side-on, cut open like a dollhouse. Its cells are the laundromat leg's own (the
 * score places `room` at 0, 0): the floor is the line y = FLOOR (a ball on it has its centre at y = 0), the ceiling
 * is y = -4.6. Left to right:
 *
 *   x -8.0          the storefront's end wall (the dark street is beyond it)
 *   x -7.75..-5.05  the storefront window, onto the street at night, a red neon washer hung in it
 *   x -4.9..-3.65   the glass front door, and the bell over it (`DOOR`)
 *   x -2.95..-1.55  the washer by the door (`WASHERS[0]`, the laundromat part's: it has a foot lever)
 *   x 0.3..2.8      the service counter (`COUNTER`)
 *   x 3.1..7.5      the first bank of washers, three (`WASHERS[1..3]`)
 *   x 7.75..10.35   the big dryer (`BIG_DRYER`)
 *   x 10.6..16.5    the second bank of washers, four (`WASHERS[4..7]`)
 *   x 16.8..21.2    stacked dryers, three stacks of two
 *   x 21.8..25.0    the folding table
 *   x 26..38        the party corner (HOME-B draws its own props there; the room only runs its walls through it)
 *   x 38.5          the far end wall
 *
 * Fluorescent tubes hang under the ceiling the whole length (`TUBES`). At 0 the room is dark but for the neon and the
 * street; the tubes blink and catch one by one on the chord (0.66 to 1.85: over the ball first, then over the counter,
 * then the rest), and by default they go out on 295.01 in the reverse order (`LIGHTS.off`).
 *
 * What the room looks like after the laundromat legs (what HOME-B inherits): WASHERS[0] by the door has run its
 * wash and stopped (lamp off from 70 s), its foot lever flipped up in front of it; the adding machine's paper tape
 * lies in loops on the floor at the counter's left end; the audit letter is spiked over the receipts at the counter's
 * right end; the lantern string hangs across the shop from over the counter to past the big dryer, its hanger and
 * basket parked at the wire's low point (x about 6.5); the big dryer's door hangs wide open (it opens to the right).
 * WASHERS[2] and [5] run someone's washing all night. The googly-eyed bags sit on WASHERS[2], [5], [7] and a denim
 * one on the floor under the counter (x 1.4). For the finale's washer, WASHERS[1] (x 3.8) or [2] are clear of all of
 * this and in sight of the storefront.
 *
 * API for the other home parts (HOME-B):
 *
 * - Layout constants: `ROOM`, `STOREFRONT`, `DOOR`, `COUNTER`, `WASHER` (a washer's shape: its porthole's centre
 *   height `WASHER.port`, its glass radius `WASHER.glass`, which is `HOME_CIRCLE.r`, and its rim `WASHER.rim`),
 *   `WASHERS` (their centres, and `port`: each porthole's centre), `BIG_DRYER`, `DRYER`, `TUBES`, `GARLAND` (the
 *   lantern string; `lanternAt(i, t)` is where lantern i hangs).
 * - Fixture drawings, all in the room's cells, all taking a `Pen` (`penOf(p, c)`):
 *   `washer` (= `washerBody` + `washerDoor`; draw the door in your `over` when a ball is inside the drum), `dryer`
 *   (= `dryerBody` + `dryerDoor`), `drum` (a porthole's inside: turning, water, washing, a lamp, a spin's blur),
 *   `portDoor` (a porthole's door, shut or swung on either hinge), `cart`, `bag` (a laundry bag with Waymond's googly
 *   eyes), `propEye` (one googly eye on a prop), `counterFront`, `lantern` (folded or open, lit or not), `tube`,
 *   `stool`, `table`.
 * - The room draws the idle fixtures itself: every washer but `WASHERS[0]` (the laundromat part's), the stacked
 *   dryers, the table and stools, the bags on the washers, the tubes. Not the big dryer or the lantern string (the
 *   dryer part's), nor the counter's things (the laundromat part's). A part that animates one of the room's washers
 *   draws over it, whole (a washer is opaque, so the room's idle one does not show through).
 * - Light. `tubeLevel(i, t)` and `lightAt(x, y, t)` say how lit the room is. The room's `over` multiplies everything
 *   drawn before it (every part's `draw`, and the balls) by a light map whenever any tube in view is not fully lit:
 *   the night's colour, with pools of light from the tubes, the street lamp, the neon and every glow. Your own `over`
 *   is drawn after it, so shade what you draw there with `shade(hex, x, y, t)`, or add a glow for it.
 *   `LIGHTS` is the schedule; the other parts set it from their own modules at load:
 *     - `LIGHTS.off[i]`: show time tube i goes out. Default: 295.01 for all but tubes 2 (295.21) and 1 (295.41),
 *       the reverse of the opening, on home's comb (`home(42)`, `home(42.5)`, `home(43)`). Put them in your hits.
 *     - `LIGHTS.glows.push(fn)`: more light in the dark, `fn(t) => Glow[]` (a washer window's glow).
 *     - `LIGHTS.lanterns`: show times the garland's lanterns light, one each (default `home(20)`, `home(22..25)`);
 *       lit, each is a glow of its own.
 *     - `LIGHTS.dim.push(fn)`: a share of the tubes' light (the dryer's brown-out uses it, 54.5 to 58.4).
 *     - `LIGHTS.neonOff`: when the red neon in the window goes out (default never).
 *     - `LIGHTS.lanternsOff`: when the lanterns go down to an ember (default never; `lanternLit(i, t)` says how lit).
 * - The street. `STREET.push(fn)` paints into the storefront's glass (and the door's), over the night street and
 *   under the frames: `fn(p, k, t)` in the room's cells (fireworks on 290.99).
 * - The door. `DOOR_OPENS.push({ at, shut })` swings the front door open from `at` to `shut` (show seconds); the
 *   bell rings each time it opens (a strike: put `at` in your hits). The laundromat uses 20.19 and 29.37.
 */

/* ------------------------------------------------------------------ layout */

export const ROOM = {
  /** The inner faces of the two end walls. */
  x0: -8,
  x1: 38.5,
  floor: FLOOR,
  ceiling: -4.6,
  /** The top of the tiled wainscot. */
  wainscot: -1.85,
}

/** The storefront window, onto the street: its glass, the sill under it and the head over it; a transom above. */
export const STOREFRONT = { x0: -7.75, x1: -5.05, mullion: -6.4, sill: FLOOR - 0.07, head: -3.55, transom: -4.25 }

/** The front door (glass, hinged on its left), and the bell on its bracket over its latch side. */
export const DOOR = { x0: -4.9, x1: -3.65, top: -3.55, bell: [-3.9, -3.5] as Pt }

/** The service counter: its ends and its top surface (a ball on it has its centre at top - R). */
export const COUNTER = { x0: 0.3, x1: 2.8, top: -1.2 }

/** A front-loading washer: its size, its porthole's centre (height), its glass (`HOME_CIRCLE.r`) and rim. */
export const WASHER = { w: 1.4, h: 1.6, port: -0.59, glass: HOME_CIRCLE.r, rim: 0.54, top: FLOOR - 1.6 }

/** Every washer in the room, by its centre: [0] by the door (the laundromat part's), [1..3] the first bank, [4..7] the second. */
export const WASHERS: { x: number; port: Pt }[] = [-2.25, 3.8, 5.3, 6.8, 11.3, 12.8, 14.3, 15.8].map((x) => ({ x, port: [x, WASHER.port] as Pt }))

/** The big dryer, where the ball tumbles: its centre, size, and its window's centre, glass and rim. */
export const BIG_DRYER = { x: 9.05, w: 2.6, h: 3.9, top: FLOOR - 3.9, port: [9.05, -2.12] as Pt, glass: 1.0, rim: 1.18 }

/** A small dryer, stacked two high. */
export const DRYER = { w: 1.4, h: 1.5, glass: 0.4, rim: 0.5 }
const STACKS = [17.5, 19.0, 20.5]

/** The fluorescent tubes under the ceiling, left to right. */
export const TUBES: { x: number }[] = Array.from({ length: 12 }, (_, i) => ({ x: -4.3 + 3.8 * i }))
const TUBE_Y = ROOM.ceiling + 0.3
const TUBE_L = 2.5

/**
 * The lantern string the laundromat leg hangs for the party (`set-garland.ts`): a wire from high over the counter to
 * the wall past the big dryer, and the five paper lanterns along it (their knots' x), which open as the ball rides
 * the wire (31.9 to 34.1) and hang there after. The dryer part draws it; `lanternAt(i, t)` says where lantern i is;
 * HOME-B lights them (`LIGHTS.lanterns`), and once lit they glow in the dark by themselves.
 */
export const GARLAND = { from: WIRE_A, to: WIRE_B, lanterns: KNOTS }
export { lanternAt }

/* ------------------------------------------------------------------ light */

export interface Glow {
  x: number
  y: number
  /** Radius, cells. */
  r: number
  /** 0..1. */
  a: number
  color?: string
}

/** When each tube comes on, on the chord: a fluorescent tube blinks before it catches. */
const TUBE_ON: { flicks: number[]; on: number }[] = TUBES.map((_, i) => {
  // Over the ball first, then over the counter and the washers, then over the door and the rest of the room.
  if (i === 1) return { flicks: [0.662], on: 0.72 }
  if (i === 2) return { flicks: [1.219, 1.335], on: 1.474 }
  return { flicks: [1.591, 1.718], on: 1.846 + (i >= 3 ? 0.02 * (i - 3) : 0) }
})

/** The strikes the room makes itself: the tubes' blinks and catches on the chord. */
export const ROOM_HITS = [0.662, 0.72, 1.219, 1.335, 1.474, 1.591, 1.718, 1.846]

export const LIGHTS = {
  /** Show time each tube goes out. The finale's last hit; the far ones (last on) first. */
  off: TUBES.map((_, i) => (i === 1 ? HOME_HITS[2] + 0.4 : i === 2 ? HOME_HITS[2] + 0.2 : HOME_HITS[2])) as number[],
  /** More light in the dark, from other parts. */
  glows: [] as ((t: number) => Glow[])[],
  /** A share of the tubes' light (a brown-out), from other parts: all multiplied. */
  dim: [] as ((t: number) => number)[],
  /** When the garland's lanterns light, one each. */
  lanterns: [home(20), home(22), home(23), home(24), home(25)] as number[],
  /** When the red neon in the window goes out. */
  neonOff: Infinity,
  /** When the garland's lanterns go down to an ember (the finale sets it: with the tubes, on the last hit). */
  lanternsOff: Infinity,
}

/** How lit the garland's lantern `i` is at `t`, 0..1: lit on its time, and down to an ember from `LIGHTS.lanternsOff`. */
export function lanternLit(i: number, t: number): number {
  const at = LIGHTS.lanterns[i] ?? Infinity
  if (!Number.isFinite(at) || t < at) return 0
  const on = smooth(t, at, at + 0.18)
  const off = LIGHTS.lanternsOff
  return Number.isFinite(off) ? on * (1 - 0.86 * smooth(t, off, off + 0.35)) : on
}

/** How lit tube `i` is at show time `t`, 0..1: dark, a blink, catching with a flutter, on, out. */
export function tubeLevel(i: number, t: number): number {
  const s = TUBE_ON[i]
  if (!s) return 0
  const off = LIGHTS.off[i] ?? Infinity
  let v = 0
  if (t >= s.on) {
    const u = t - s.on
    // Caught: a flutter that settles within a quarter second.
    v = 1 - 0.35 * Math.exp(-u / 0.09) * (0.5 + 0.5 * Math.cos(u * 70))
  } else {
    for (const f of s.flicks) if (t >= f) v = Math.max(v, 0.9 * Math.exp(-(t - f) / 0.04) + 0.12 * Math.exp(-(t - f) / 0.35))
  }
  if (t >= off) {
    const u = t - off
    // Out: gone at once but for a moment's afterglow.
    v *= 0.18 * Math.exp(-u / 0.25)
  }
  let d = 1
  for (const f of LIGHTS.dim) d *= f(t)
  // The great hit: the washer by the door slams into its spin and the whole shop's lights dip and flutter back.
  const u = t - GREAT
  if (u >= 0 && u < 0.6) d *= 1 - 0.6 * Math.exp(-u / 0.07) - 0.12 * Math.exp(-u / 0.2) * Math.abs(Math.sin(u * 45))
  return clamp(v * d)
}

/** The night outside, and the room with no light on. */
const NIGHT = HOME.night
const AMBIENT = mixHex(HOME.night, HOME.glassDeep, 0.5)
const STREET_LIGHT = mixHex(HOME.light, HOME.glass, 0.35)

/** The glows the room itself has in the dark: the street lamp through the glass, and the neon. */
function roomGlows(t: number): Glow[] {
  const neon = t < LIGHTS.neonOff ? 1 : 0
  const out: Glow[] = [
    { x: -6.2, y: -1.4, r: 3.4, a: 0.42, color: STREET_LIGHT },
    { x: -4.3, y: -1.6, r: 2.0, a: 0.2, color: STREET_LIGHT },
  ]
  if (neon) out.push({ x: NEON_AT[0], y: NEON_AT[1], r: 2.4, a: 0.5, color: HOME.rose })
  return out
}

/** The garland's lanterns, once lit, are a warm light of their own in the dark. */
LIGHTS.glows.push((t) => {
  const out: Glow[] = []
  LIGHTS.lanterns.forEach((_at, i) => {
    const a = lanternLit(i, t)
    if (a <= 0 || i >= KNOTS.length) return
    const [x, y] = lanternAt(i, t).middle
    out.push({ x, y, r: 1.6, a: 0.75 * a, color: HOME.gold })
  })
  return out
})

/** How lit the room is at (x, y) at `t`, 0 (night) .. 1 (the tubes on). */
export function lightAt(x: number, y: number, t: number): number {
  let v = 0
  TUBES.forEach((tb, i) => {
    const l = tubeLevel(i, t)
    if (l <= 0) return
    const dx = (x - tb.x) / 3.1
    const dy = (y - (TUBE_Y + 1.6)) / 4.2
    v += l * Math.max(0, 1.25 - Math.hypot(dx, dy))
  })
  return clamp(v)
}

/** A colour as the light at (x, y) leaves it: for what a part draws in its `over`, after the room's light map. */
export function shade(hex: string, x: number, y: number, t: number): string {
  const l = lightAt(x, y, t)
  if (l >= 0.999) return hex
  return mixHex(hex, mixHex(hex, AMBIENT, 0.78), 1 - l)
}

/** True when every tube is fully on and nothing dims them: the light map would change nothing. */
function allLit(t: number, x0: number, x1: number): boolean {
  for (let i = 0; i < TUBES.length; i++) {
    const x = TUBES[i].x
    if (x < x0 - 5 || x > x1 + 5) continue
    if (tubeLevel(i, t) < 0.999) return false
  }
  return true
}

/* ------------------------------------------------------------------ the door */

/** When the front door swings open and when it is shut again, show seconds. The laundromat part fills this. */
export const DOOR_OPENS: { at: number; shut: number }[] = []

/** How far open the door is at `t`, 0..1: pushed open, held, and swinging to on its closer with a small rebound. */
export function doorAt(t: number): number {
  let v = 0
  for (const d of DOOR_OPENS) {
    if (t < d.at) continue
    const open = smooth(t, d.at - 0.02, d.at + 0.32)
    const u = t - d.shut
    const closing = u <= 0 ? 1 : u < 0.55 ? 1 - smooth(u, 0, 0.55) : 0.05 * Math.exp(-(u - 0.55) / 0.12) * Math.abs(Math.sin((u - 0.55) * 14))
    v = Math.max(v, open * closing)
  }
  return v
}

/** The bell's swing at `t` (radians): struck by the door's top each time it opens, ringing down. The door closes softly. */
export function bellAt(t: number): number {
  let a = 0
  for (const d of DOOR_OPENS) {
    const u = t - d.at
    if (u < 0 || u > 3) continue
    a += 0.55 * Math.exp(-u / 0.55) * Math.sin(u * 17)
  }
  return a
}

/* ------------------------------------------------------------------ pens */

/** What every fixture drawing takes: the p5 instance, cells to pixels, the ink and the line weight. */
export interface Pen {
  p: p5
  k: number
  ink: string
  w: number
}

export const penOf = (p: p5, c: { k: number; ink: string; weight: number }): Pen => ({ p, k: c.k, ink: c.ink, w: c.weight })

const ENAMEL = HOME.enamel
const CONSOLE = mixHex(HOME.enamel, HOME.steel, 0.38)
const DRUM_BACK = mixHex(HOME.steelDark, HOME.night, 0.35)
const DRUM_STEEL = mixHex(HOME.steel, HOME.steelDark, 0.4)
const GASKET = mixHex(HOME.steelDark, HOME.night, 0.55)
const WALL = LAUNDROMAT.bg
const CEILING_FILL = mixHex(LAUNDROMAT.bg, HOME.steel, 0.35)
const SECTION = mixHex(LAUNDROMAT.ink, HOME.night, 0.4)

/* ------------------------------------------------------------------ googly eyes on things */

/**
 * One googly eye on a prop at (x, y), radius `r`: a white disc, an ink ring and a loose black pupil hanging in
 * it. `swing` turns the pupil off straight down (radians), `lift` (0..1) throws it up the white.
 */
export function propEye(pen: Pen, x: number, y: number, r: number, swing = 0, lift = 0): void {
  const { p, k, ink, w } = pen
  solid(p, ink, w * 0.7, EYE_WHITE)
  p.circle(x * k, y * k, 2 * r * k)
  const reach = r * 0.45
  const a = Math.PI / 2 + swing
  const d = reach * (1 - 1.6 * clamp(lift))
  p.noStroke()
  p.fill(EYE_PUPIL)
  p.circle((x + Math.cos(a) * d) * k, (y + Math.sin(a) * d) * k, r * 1.05 * k)
}

/* ------------------------------------------------------------------ porthole: the drum inside, the door in front */

export interface DrumLook {
  /** The drum's turn, radians. */
  turn?: number
  /** Water in it, 0..1 of the window, and its slosh (radians of tilt). */
  water?: number
  slosh?: number
  /** Laundry tumbling in it: colours of the pieces. */
  load?: string[]
  /** A lamp inside (a dryer's), 0..1. */
  lamp?: number
  /** How much the laundry is flung out to the wall (a spin), 0..1. */
  fling?: number
  /** A spin too fast to see: the washing as a smear round the drum, 0..1. */
  blur?: number
}

/** A piece of washing, `size` across, centred on the origin: 0 a shirt, 1 a sock, 2 a towel. */
function garment(pen: Pen, kind: number, size: number, col: string): void {
  const { p, k, ink, w } = pen
  const S = (x: number, y: number) => p.vertex(x * size * k, y * size * k)
  solid(p, ink, w * 0.55, col)
  p.beginShape()
  if (kind === 0) {
    // A shirt: body, sleeves, a neck.
    for (const [x, y] of [[-0.18, -0.42], [-0.06, -0.34], [0.06, -0.34], [0.18, -0.42], [0.5, -0.24], [0.4, -0.04], [0.27, -0.12], [0.27, 0.42], [-0.27, 0.42], [-0.27, -0.12], [-0.4, -0.04], [-0.5, -0.24]] as Pt[]) S(x, y)
  } else if (kind === 1) {
    // A sock, its heel turned.
    for (const [x, y] of [[-0.14, -0.45], [0.12, -0.45], [0.12, 0.12], [0.44, 0.18], [0.46, 0.4], [-0.06, 0.42], [-0.14, 0.3]] as Pt[]) S(x, y)
  } else {
    // A towel, folded over.
    for (const [x, y] of [[-0.46, -0.26], [0.46, -0.26], [0.46, 0.26], [-0.46, 0.26]] as Pt[]) S(x, y)
  }
  p.endShape(p.CLOSE)
  outline(p, ink, w * 0.35)
  if (kind === 1) p.line(-0.14 * size * k, -0.3 * size * k, 0.12 * size * k, -0.3 * size * k)
  if (kind === 2) for (const y of [-0.12, 0.12]) p.line(-0.46 * size * k, y * size * k, 0.46 * size * k, y * size * k)
}

/**
 * A porthole's inside at (cx, cy), glass radius `r`: the drum's dark back, its perforations and lifters turning,
 * any laundry and water, clipped to the glass. What goes behind a ball in the drum.
 */
export function drum(pen: Pen, cx: number, cy: number, r: number, look: DrumLook = {}): void {
  const { p, k, ink, w } = pen
  const turn = look.turn ?? 0
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // The opening in the machine's face: a dark gasket ring.
  solid(p, ink, w * 0.8, GASKET)
  p.circle(cx * k, cy * k, 2 * (r + 0.05) * k)
  p.push()
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx * k, cy * k, r * k, 0, Math.PI * 2)
  ctx.clip()
  p.noStroke()
  p.fill(DRUM_BACK)
  p.circle(cx * k, cy * k, 2 * r * k)
  // The drum's lamp (a dryer's), warm on its back.
  if ((look.lamp ?? 0) > 0) {
    const g = ctx.createRadialGradient(cx * k, (cy - r * 0.2) * k, 0, cx * k, cy * k, r * 1.1 * k)
    g.addColorStop(0, `rgba(255, 238, 190, ${0.55 * (look.lamp ?? 0)})`)
    g.addColorStop(1, 'rgba(255, 238, 190, 0)')
    ctx.fillStyle = g
    ctx.fillRect((cx - r) * k, (cy - r) * k, 2 * r * k, 2 * r * k)
  }
  // The back plate: a ring of perforations on two circles, turning with the drum.
  p.fill(alpha(p, DRUM_STEEL, 0.9))
  for (const [rr, n] of [[0.42, 10], [0.7, 16]] as [number, number][]) {
    for (let i = 0; i < n; i++) {
      const a = turn + (i / n) * Math.PI * 2
      p.circle((cx + Math.cos(a) * rr * r) * k, (cy + Math.sin(a) * rr * r) * k, r * 0.07 * k)
    }
  }
  p.fill(alpha(p, DRUM_STEEL, 0.9))
  p.circle(cx * k, cy * k, r * 0.22 * k)
  // Three lifters on the drum's wall, turning.
  solid(p, ink, w * 0.6, DRUM_STEEL)
  for (let i = 0; i < 3; i++) {
    const a = turn + (i / 3) * Math.PI * 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const tx = -sa
    const ty = ca
    p.beginShape()
    p.vertex((cx + ca * r * 1.02 + tx * 0.13 * r) * k, (cy + sa * r * 1.02 + ty * 0.13 * r) * k)
    p.vertex((cx + ca * r * 0.8) * k, (cy + sa * r * 0.8) * k)
    p.vertex((cx + ca * r * 1.02 - tx * 0.13 * r) * k, (cy + sa * r * 1.02 - ty * 0.13 * r) * k)
    p.endShape(p.CLOSE)
  }
  // Laundry: soft pieces tumbling with the drum, flung out to the wall in a spin; at full spin, a blur round it.
  const load = look.load ?? []
  const fling = clamp(look.fling ?? 0)
  const blur = clamp(look.blur ?? 0)
  if (blur > 0) {
    load.forEach((col, i) => {
      const a = turn * 0.02 + (i / Math.max(1, load.length)) * Math.PI * 2
      p.noFill()
      p.stroke(alpha(p, col, 0.8 * blur))
      p.strokeWeight(r * 0.26 * k)
      p.arc(cx * k, cy * k, 2 * r * 0.8 * k, 2 * r * 0.8 * k, a, a + (Math.PI * 2) / Math.max(1, load.length) - 0.25)
    })
  }
  load.forEach((col, i) => {
    if (blur >= 0.99) return
    const phase = (i / Math.max(1, load.length)) * Math.PI * 2 + i * 0.7
    // Tumbling: carried up the wall with the drum, falling back through the middle; in a spin, pinned to the wall.
    const a = turn * (0.55 + 0.45 * fling) + phase
    const tumble = 0.5 + 0.5 * Math.sin(a)
    const rad = r * (0.25 + 0.5 * (fling + (1 - fling) * tumble))
    const px = cx + Math.cos(a) * rad
    const py = cy + Math.sin(a) * rad + (1 - fling) * r * 0.25
    p.push()
    p.translate(px * k, py * k)
    p.rotate(a * 1.3 + i)
    garment(pen, i % 3, r * (0.5 + 0.1 * hash(i, 5)), col)
    p.pop()
  })
  // Water, with a slosh, and a line of suds on it.
  const water = clamp(look.water ?? 0)
  if (water > 0) {
    const level = cy + r - 2 * r * water
    const tilt = look.slosh ?? 0
    p.noStroke()
    p.fill(alpha(p, HOME.glass, 0.55))
    p.beginShape()
    p.vertex((cx - r * 1.2) * k, (level + tilt * 1.2 * r) * k)
    p.vertex((cx + r * 1.2) * k, (level - tilt * 1.2 * r) * k)
    p.vertex((cx + r * 1.2) * k, (cy + r * 1.2) * k)
    p.vertex((cx - r * 1.2) * k, (cy + r * 1.2) * k)
    p.endShape(p.CLOSE)
    p.fill(alpha(p, HOME.paper, 0.85))
    for (let i = 0; i < 9; i++) {
      const u = -1 + (2 * i) / 8
      const bx = cx + u * r * 0.95
      const by = level - tilt * u * r - 0.01
      p.circle(bx * k, by * k, r * (0.1 + 0.07 * hash(i, 11)) * k)
    }
  }
  ctx.restore()
  p.pop()
}

/**
 * A porthole's door at (cx, cy): the steel rim, the glass with its sheen, the handle. `open` swings it on its
 * hinge out towards us: 0 shut, 1 wide open (seen from behind, past the hinge). `side` is the hinge's side: -1 the
 * left (the washers'), 1 the right (the big dryer's). Drawn over a ball inside.
 */
export function portDoor(pen: Pen, cx: number, cy: number, glass: number, rim: number, open = 0, tint = 0.22, side: -1 | 1 = -1): void {
  const { p, k, ink, w } = pen
  const a = clamp(open) * 1.95
  const sx = Math.cos(a)
  const hinge = cx + side * rim
  const ccx = hinge - side * rim * sx
  // Past side-on the door shows its back: its steel pan, not its glass.
  const back = sx < 0
  const rx = Math.max(0.02, Math.abs(sx)) * rim
  p.push()
  // The hinge block.
  solid(p, ink, w * 0.7, HOME.steelDark)
  p.rect((hinge + side * 0.02) * k, cy * k, 0.1 * k, rim * 0.55 * k, 0.02 * k)
  // The rim: a steel ring round the glass (or, seen from behind, the door's steel pan).
  if (back || sx <= 0.05) {
    solid(p, ink, w, back ? HOME.steelDark : HOME.steel)
    p.ellipse(ccx * k, cy * k, 2 * rx * k, 2 * rim * k)
  } else {
    const gx0 = Math.abs(sx) * glass
    p.noFill()
    p.stroke(HOME.steel)
    p.strokeWeight((rim - glass) * k)
    p.ellipse(ccx * k, cy * k, (rx + gx0) * k, (rim + glass) * k)
    outline(p, ink, w)
    p.ellipse(ccx * k, cy * k, 2 * rx * k, 2 * rim * k)
  }
  if (!back && sx > 0.05) {
    const gx = Math.abs(sx) * glass
    // The glass: the drum shows through it, a little tinted and with a curved glint.
    p.noStroke()
    p.fill(alpha(p, HOME.glass, tint))
    p.ellipse(ccx * k, cy * k, 2 * gx * k, 2 * glass * k)
    outline(p, ink, w * 0.7)
    p.ellipse(ccx * k, cy * k, 2 * gx * k, 2 * glass * k)
    p.noFill()
    p.stroke(alpha(p, EYE_WHITE, 0.75))
    p.strokeWeight(Math.max(1, glass * k * 0.07))
    p.arc(ccx * k, cy * k, 2 * gx * 0.74 * k, 2 * glass * 0.74 * k, Math.PI * 1.08, Math.PI * 1.42)
    p.stroke(alpha(p, EYE_WHITE, 0.45))
    p.strokeWeight(Math.max(1, glass * k * 0.035))
    p.arc(ccx * k, cy * k, 2 * gx * 0.74 * k, 2 * glass * 0.74 * k, Math.PI * 1.52, Math.PI * 1.6)
    // The handle, on the far side from the hinge.
    solid(p, ink, w * 0.7, HOME.steelDark)
    p.rect((ccx - side * rx * 0.97) * k, cy * k, Math.max(0.03, 0.07 * sx) * k, rim * 0.42 * k, 0.02 * k)
  } else if (back) {
    solid(p, ink, w * 0.7, mixHex(HOME.steelDark, HOME.steel, 0.4))
    p.ellipse(ccx * k, cy * k, 2 * rx * 0.72 * k, 2 * rim * 0.72 * k)
  }
  p.pop()
}

/* ------------------------------------------------------------------ the washer */

export interface WasherLook extends DrumLook {
  /** The door: 0 shut, 1 open. */
  door?: number
  /** Its start lamp, 0..1. */
  lamp2?: number
  /** Shaken off its place (a spin that walks it): dx, dy, and a rock (radians) about its feet. */
  dx?: number
  dy?: number
  rock?: number
}

/** A front-loading washer standing on the floor at centre `x`: body, console, kick panel, feet, and its drum. */
export function washerBody(pen: Pen, x: number, look: WasherLook = {}): void {
  const { p, k, ink, w } = pen
  const W = WASHER.w
  const top = WASHER.top
  p.push()
  p.translate((look.dx ?? 0) * k, (look.dy ?? 0) * k)
  if (look.rock) {
    p.translate(x * k, FLOOR * k)
    p.rotate(look.rock)
    p.translate(-x * k, -FLOOR * k)
  }
  // Feet.
  solid(p, ink, w * 0.7, HOME.steelDark)
  for (const s of [-1, 1]) p.rect((x + s * (W / 2 - 0.16)) * k, (FLOOR - 0.03) * k, 0.16 * k, 0.07 * k, 0.02 * k)
  // The body.
  solid(p, ink, w, ENAMEL)
  p.rect(x * k, ((top + FLOOR - 0.05) / 2) * k, W * k, (FLOOR - 0.05 - top) * k, 0.07 * k)
  // The console across the top, with its coin slide and lamp.
  solid(p, ink, w * 0.8, CONSOLE)
  p.rect(x * k, (top + 0.15) * k, (W - 0.1) * k, 0.22 * k, 0.04 * k)
  solid(p, ink, w * 0.6, HOME.steel)
  p.rect((x + 0.28) * k, (top + 0.15) * k, 0.42 * k, 0.1 * k, 0.02 * k)
  outline(p, ink, w * 0.45)
  for (let i = 0; i < 3; i++) p.line((x + 0.15 + i * 0.13) * k, (top + 0.12) * k, (x + 0.15 + i * 0.13) * k, (top + 0.18) * k)
  const lamp = clamp(look.lamp2 ?? 0)
  solid(p, ink, w * 0.6, lamp > 0.02 ? mixHex(HOME.steelDark, HOME.gold, lamp) : HOME.steelDark)
  p.circle((x - 0.42) * k, (top + 0.15) * k, 0.08 * k)
  if (lamp > 0.02) {
    p.noStroke()
    p.fill(alpha(p, HOME.gold, 0.3 * lamp))
    p.circle((x - 0.42) * k, (top + 0.15) * k, 0.2 * k)
  }
  // The kick panel's seam.
  outline(p, ink, w * 0.5)
  p.line((x - W / 2 + 0.08) * k, (FLOOR - 0.17) * k, (x + W / 2 - 0.08) * k, (FLOOR - 0.17) * k)
  drum(pen, x, WASHER.port, WASHER.glass, look)
  p.pop()
}

/** The washer's door, shut or swung (`look.door`), shaken with the body. What goes over a ball in its drum. */
export function washerDoor(pen: Pen, x: number, look: WasherLook = {}): void {
  const { p, k } = pen
  p.push()
  p.translate((look.dx ?? 0) * k, (look.dy ?? 0) * k)
  if (look.rock) {
    p.translate(x * k, FLOOR * k)
    p.rotate(look.rock)
    p.translate(-x * k, -FLOOR * k)
  }
  portDoor(pen, x, WASHER.port, WASHER.glass, WASHER.rim, look.door ?? 0)
  p.pop()
}

/** A whole washer. */
export function washer(pen: Pen, x: number, look: WasherLook = {}): void {
  washerBody(pen, x, look)
  washerDoor(pen, x, look)
}

/* ------------------------------------------------------------------ dryers */

export interface DryerLook extends DrumLook {
  door?: number
  /** Its running lamp, 0..1. */
  lamp2?: number
  dx?: number
  dy?: number
}

/**
 * A dryer: `big` is the tall one the ball tumbles in (`BIG_DRYER`, standing at `x`); otherwise a small one of a
 * stack with its foot at `foot` (FLOOR for the lower, FLOOR - DRYER.h for the upper).
 */
export function dryerBody(pen: Pen, x: number, big: boolean, look: DryerLook = {}, foot = FLOOR): void {
  const { p, k, ink, w } = pen
  const W = big ? BIG_DRYER.w : DRYER.w
  const H = big ? BIG_DRYER.h : DRYER.h
  const top = foot - H
  const port: Pt = big ? BIG_DRYER.port : [x, top + 0.2 + DRYER.rim + 0.06]
  const glass = big ? BIG_DRYER.glass : DRYER.glass
  p.push()
  p.translate((look.dx ?? 0) * k, (look.dy ?? 0) * k)
  if (foot >= FLOOR - 1e-6) {
    solid(p, ink, w * 0.7, HOME.steelDark)
    for (const s of [-1, 1]) p.rect((x + s * (W / 2 - 0.18)) * k, (FLOOR - 0.03) * k, 0.2 * k, 0.07 * k, 0.02 * k)
  }
  solid(p, ink, w, ENAMEL)
  p.rect(x * k, ((top + foot - 0.05) / 2) * k, W * k, (foot - 0.05 - top) * k, (big ? 0.1 : 0.06) * k)
  // The console: a coin slot, a dial, a lamp.
  const ch = big ? 0.42 : 0.2
  solid(p, ink, w * 0.8, CONSOLE)
  p.rect(x * k, (top + ch / 2 + 0.05) * k, (W - 0.12) * k, ch * k, 0.05 * k)
  solid(p, ink, w * 0.6, HOME.steel)
  p.rect((x + W * 0.22) * k, (top + ch / 2 + 0.05) * k, W * 0.26 * k, ch * 0.42 * k, 0.02 * k)
  if (big) {
    solid(p, ink, w * 0.7, HOME.steel)
    p.circle((x - W * 0.2) * k, (top + ch / 2 + 0.05) * k, ch * 0.62 * k)
    outline(p, ink, w * 0.6)
    p.line((x - W * 0.2) * k, (top + ch / 2 + 0.05) * k, (x - W * 0.2) * k, (top + 0.1) * k)
  }
  const lamp = clamp(look.lamp2 ?? 0)
  solid(p, ink, w * 0.6, lamp > 0.02 ? mixHex(HOME.steelDark, HOME.gold, lamp) : HOME.steelDark)
  p.circle((x - W * 0.4) * k, (top + ch / 2 + 0.05) * k, (big ? 0.1 : 0.07) * k)
  // The lint drawer under the big one's door.
  if (big) {
    solid(p, ink, w * 0.7, CONSOLE)
    p.rect(x * k, (FLOOR - 0.5) * k, (W - 0.5) * k, 0.5 * k, 0.05 * k)
    outline(p, ink, w * 0.6)
    p.line((x - 0.25) * k, (FLOOR - 0.5) * k, (x + 0.25) * k, (FLOOR - 0.5) * k)
  }
  drum(pen, port[0], port[1], glass, look)
  p.pop()
}

export function dryerDoor(pen: Pen, x: number, big: boolean, look: DryerLook = {}, foot = FLOOR): void {
  const { p, k } = pen
  const top = foot - (big ? BIG_DRYER.h : DRYER.h)
  const port: Pt = big ? BIG_DRYER.port : [x, top + 0.2 + DRYER.rim + 0.06]
  p.push()
  p.translate((look.dx ?? 0) * k, (look.dy ?? 0) * k)
  portDoor(pen, port[0], port[1], big ? BIG_DRYER.glass : DRYER.glass, big ? BIG_DRYER.rim : DRYER.rim, look.door ?? 0, 0.22, big ? 1 : -1)
  p.pop()
}

export function dryer(pen: Pen, x: number, big: boolean, look: DryerLook = {}, foot = FLOOR): void {
  dryerBody(pen, x, big, look, foot)
  dryerDoor(pen, x, big, look, foot)
}

/* ------------------------------------------------------------------ the laundry bag, the cart */

export interface BagLook {
  color?: string
  /** Its size: 1 is a big bag of washing, about 0.8 cells tall. */
  size?: number
  /** Tipped about its foot (radians), and squashed (a landing: >0 flatter). */
  tilt?: number
  squash?: number
  /** The googly eyes' pupils: swing off straight down (radians) and lift (0..1, thrown up the white). */
  swing?: number
  lift?: number
  /** No eyes (a bag Waymond has not got to yet). */
  plain?: boolean
}

/** A laundry bag sitting at (x, foot), cinched at the top, with two googly eyes on it (Waymond's). */
export function bag(pen: Pen, x: number, foot: number, look: BagLook = {}): void {
  const { p, k, ink, w } = pen
  const s = look.size ?? 1
  const sq = look.squash ?? 0
  const hw = 0.38 * s * (1 + 0.5 * sq)
  const h = 0.72 * s * (1 - 0.6 * sq)
  const col = look.color ?? HOME.denim
  p.push()
  p.translate(x * k, foot * k)
  p.rotate(look.tilt ?? 0)
  solid(p, ink, w * 0.9, col)
  p.beginShape()
  p.vertex(-hw * 0.9 * k, 0)
  p.bezierVertex(-hw * 1.15 * k, -h * 0.45 * k, -hw * 0.75 * k, -h * 0.92 * k, -hw * 0.18 * k, -h * k)
  p.vertex(hw * 0.18 * k, -h * k)
  p.bezierVertex(hw * 0.75 * k, -h * 0.92 * k, hw * 1.15 * k, -h * 0.45 * k, hw * 0.9 * k, 0)
  p.endShape(p.CLOSE)
  // The cinched neck and its tuft.
  p.beginShape()
  p.vertex(-hw * 0.2 * k, -h * k)
  p.vertex(-hw * 0.34 * k, -(h + 0.13 * s) * k)
  p.vertex(0, -(h + 0.07 * s) * k)
  p.vertex(hw * 0.34 * k, -(h + 0.15 * s) * k)
  p.vertex(hw * 0.2 * k, -h * k)
  p.endShape(p.CLOSE)
  solid(p, ink, w * 0.6, HOME.paper)
  p.rect(0, -(h + 0.005) * k, hw * 0.52 * k, 0.05 * s * k, 0.02 * k)
  // A fold line down its side.
  outline(p, ink, w * 0.45)
  p.noFill()
  p.beginShape()
  p.vertex(hw * 0.35 * k, -h * 0.82 * k)
  p.bezierVertex(hw * 0.55 * k, -h * 0.5 * k, hw * 0.5 * k, -h * 0.25 * k, hw * 0.62 * k, -h * 0.05 * k)
  p.endShape()
  p.pop()
  if (look.plain) return
  // The eyes: a bigger and a smaller, a little skew, as he sticks them.
  const t = look.tilt ?? 0
  const at = (u: number, v: number): Pt => [x + u * Math.cos(t) - v * Math.sin(t), foot + u * Math.sin(t) + v * Math.cos(t)]
  const [ax, ay] = at(-hw * 0.3, -h * 0.62)
  const [bx, by] = at(hw * 0.28, -h * 0.66)
  propEye(pen, ax, ay, 0.085 * s, (look.swing ?? 0) - t, look.lift ?? 0)
  propEye(pen, bx, by, 0.07 * s, (look.swing ?? 0) * 1.2 - t, look.lift ?? 0)
}

/** A wire laundry cart on castors, standing at `x`, with what is in its basket. */
export function cart(pen: Pen, x: number, load: { color: string; size?: number }[] = [], dx = 0): void {
  const { p, k, ink, w } = pen
  const cx = x + dx
  const top = FLOOR - 1.05
  const bot = FLOOR - 0.5
  p.push()
  // Castors.
  for (const s of [-1, 1]) {
    solid(p, ink, w * 0.7, HOME.steelDark)
    p.circle((cx + s * 0.45) * k, (FLOOR - 0.07) * k, 0.14 * k)
  }
  // The frame: legs and the handle rail.
  outline(p, ink, w * 1.3)
  p.stroke(ink)
  for (const s of [-1, 1]) p.line((cx + s * 0.45) * k, (FLOOR - 0.12) * k, (cx + s * 0.52) * k, top * k)
  // What is in it, showing through the wire.
  load.forEach((b, i) => bag(pen, cx - 0.22 + i * 0.42, bot + 0.04, { color: b.color, size: b.size ?? 0.62, plain: true }))
  // The basket's wire: a frame and a grid.
  p.noFill()
  p.stroke(ink)
  p.strokeWeight(w * 0.8)
  p.beginShape()
  p.vertex((cx - 0.58) * k, top * k)
  p.vertex((cx - 0.48) * k, bot * k)
  p.vertex((cx + 0.48) * k, bot * k)
  p.vertex((cx + 0.58) * k, top * k)
  p.endShape()
  p.stroke(alpha(p, HOME.steelDark, 0.9))
  p.strokeWeight(Math.max(1, w * 0.4))
  for (let i = 1; i < 8; i++) {
    const u = i / 8
    p.line((cx - 0.58 + 1.16 * u) * k, top * k, (cx - 0.48 + 0.96 * u) * k, bot * k)
  }
  p.line((cx - 0.53) * k, ((top + bot) / 2) * k, (cx + 0.53) * k, ((top + bot) / 2) * k)
  p.stroke(ink)
  p.strokeWeight(w * 1.2)
  p.line((cx - 0.6) * k, top * k, (cx + 0.6) * k, top * k)
  p.pop()
}

/* ------------------------------------------------------------------ the counter, the table, stools */

/** The service counter's front: a wood top on an enamel front with a red kick band. */
export function counterFront(pen: Pen): void {
  const { p, k, ink, w } = pen
  const { x0, x1, top } = COUNTER
  const mid = (x0 + x1) / 2
  solid(p, ink, w, ENAMEL)
  p.rect(mid * k, ((top + FLOOR) / 2) * k, (x1 - x0 - 0.08) * k, (FLOOR - top) * k)
  // Panels.
  outline(p, ink, w * 0.5)
  const n = 3
  for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    p.line(x * k, (top + 0.14) * k, x * k, (FLOOR - 0.2) * k)
  }
  solid(p, ink, w * 0.8, HOME.red)
  p.rect(mid * k, (FLOOR - 0.1) * k, (x1 - x0 - 0.08) * k, 0.2 * k)
  solid(p, ink, w, HOME.wood)
  p.rect(mid * k, (top + 0.05) * k, (x1 - x0 + 0.12) * k, 0.1 * k, 0.02 * k)
}

/** A folding table standing on the floor from x0 to x1, its top at `top`. */
export function table(pen: Pen, x0: number, x1: number, top: number): void {
  const { p, k, ink, w } = pen
  outline(p, ink, w)
  for (const x of [x0 + 0.25, x1 - 0.25]) {
    p.line(x * k, (top + 0.06) * k, (x - 0.12) * k, FLOOR * k)
    p.line(x * k, (top + 0.06) * k, (x + 0.12) * k, FLOOR * k)
  }
  solid(p, ink, w, HOME.wood)
  p.rect(((x0 + x1) / 2) * k, (top + 0.04) * k, (x1 - x0) * k, 0.08 * k, 0.02 * k)
}

/** A plastic stool (the laundromat's): its seat at `seat`. */
export function stool(pen: Pen, x: number, seat = FLOOR - 0.75, color: string = HOME.red): void {
  const { p, k, ink, w } = pen
  solid(p, ink, w * 0.9, color)
  p.beginShape()
  p.vertex((x - 0.22) * k, seat * k)
  p.vertex((x + 0.22) * k, seat * k)
  p.vertex((x + 0.28) * k, FLOOR * k)
  p.vertex((x + 0.16) * k, FLOOR * k)
  p.vertex((x + 0.1) * k, (seat + 0.14) * k)
  p.vertex((x - 0.1) * k, (seat + 0.14) * k)
  p.vertex((x - 0.16) * k, FLOOR * k)
  p.vertex((x - 0.28) * k, FLOOR * k)
  p.endShape(p.CLOSE)
  p.rect(x * k, (seat - 0.03) * k, 0.52 * k, 0.07 * k, 0.03 * k)
}

/* ------------------------------------------------------------------ lanterns and tubes */

export interface LanternLook {
  /** 0 folded flat (an accordion shut) .. 1 open. Past 1 it overshoots. */
  open?: number
  /** 0..1: a candle in it. */
  lit?: number
  /** Swing about its hook, radians. */
  sway?: number
  size?: number
}

/** A new year paper lantern hanging from (x, y): cord, gold caps, ribbed red paper, a tassel. */
export function lantern(pen: Pen, x: number, y: number, look: LanternLook = {}): void {
  const { p, k, ink, w } = pen
  const s = look.size ?? 1
  const open = look.open ?? 1
  const shut = clamp(1 - open)
  const lit = clamp(look.lit ?? 0)
  // Folded it is a squat drum of pleats with small caps; open, a round paper lantern.
  const bw = (0.5 - 0.1 * shut) * s
  const bh = (0.12 + 0.32 * Math.max(0, open)) * s
  const cap = (0.03 + 0.025 * clamp(open)) * s
  const cord = 0.12 * s
  p.push()
  p.translate(x * k, y * k)
  p.rotate(look.sway ?? 0)
  const cy = cord + cap + bh / 2
  if (lit > 0) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(0, cy * k, 0, 0, cy * k, 0.9 * s * k)
    g.addColorStop(0, `rgba(255, 214, 140, ${0.5 * lit})`)
    g.addColorStop(1, 'rgba(255, 214, 140, 0)')
    ctx.fillStyle = g
    ctx.fillRect(-0.9 * s * k, (cy - 0.9 * s) * k, 1.8 * s * k, 1.8 * s * k)
  }
  outline(p, ink, w * 0.6)
  p.line(0, 0, 0, cord * k)
  const paper = lit > 0 ? mixHex(HOME.red, HOME.gold, 0.45 * lit) : HOME.red
  solid(p, ink, w * 0.8, paper)
  if (shut > 0.5) {
    p.rect(0, cy * k, bw * k, bh * k, bh * 0.35 * k)
    outline(p, ink, w * 0.4)
    for (const f of [-0.25, 0, 0.25]) p.line(-bw * 0.46 * k, (cy + f * bh) * k, bw * 0.46 * k, (cy + f * bh) * k)
  } else {
    p.ellipse(0, cy * k, bw * k, bh * k)
    // Ribs: the paper's folds.
    outline(p, ink, w * 0.4)
    for (const f of [-0.62, -0.25, 0.25, 0.62]) p.ellipse(0, cy * k, bw * Math.abs(f) * k, bh * k)
  }
  // Caps.
  solid(p, ink, w * 0.7, HOME.gold)
  p.rect(0, (cy - bh / 2) * k, 0.2 * s * k, cap * k, 0.01 * k)
  p.rect(0, (cy + bh / 2) * k, 0.2 * s * k, cap * k, 0.01 * k)
  // The tassel, which hangs free once it is open.
  const tl = (0.04 + 0.12 * clamp(open)) * s
  p.stroke(HOME.gold)
  p.strokeWeight(Math.max(1, w * 0.9))
  const ty = cy + bh / 2 + cap / 2
  for (const d of [-0.03, 0, 0.03]) p.line(d * s * k, ty * k, d * 1.4 * s * k, (ty + tl) * k)
  p.pop()
}

/** A fluorescent fixture hanging under the ceiling at `x`, its two tubes lit `level` (0..1). */
export function tube(pen: Pen, x: number, level: number): void {
  const { p, k, ink, w } = pen
  const y = TUBE_Y
  // The rods it hangs by.
  outline(p, ink, w * 0.5)
  for (const s of [-1, 1]) p.line((x + s * TUBE_L * 0.35) * k, ROOM.ceiling * k, (x + s * TUBE_L * 0.35) * k, (y - 0.06) * k)
  if (level > 0.02) {
    const ctx = p.drawingContext as CanvasRenderingContext2D
    const g = ctx.createRadialGradient(x * k, (y + 0.08) * k, 0, x * k, (y + 0.08) * k, TUBE_L * 0.75 * k)
    g.addColorStop(0, `rgba(255, 247, 220, ${0.5 * level})`)
    g.addColorStop(1, 'rgba(255, 247, 220, 0)')
    ctx.save()
    ctx.translate(x * k, (y + 0.08) * k)
    ctx.scale(1, 0.32)
    ctx.translate(-x * k, -(y + 0.08) * k)
    ctx.fillStyle = g
    ctx.fillRect((x - TUBE_L) * k, (y + 0.08 - TUBE_L) * k, 2 * TUBE_L * k, 2 * TUBE_L * k)
    ctx.restore()
  }
  solid(p, ink, w * 0.8, HOME.steel)
  p.rect(x * k, (y - 0.03) * k, TUBE_L * k, 0.08 * k, 0.02 * k)
  const glow = mixHex(mixHex(HOME.steel, HOME.paper, 0.4), HOME.light, level)
  solid(p, ink, w * 0.5, glow)
  p.rect(x * k, (y + 0.045) * k, (TUBE_L - 0.12) * k, 0.05 * k, 0.025 * k)
  p.rect(x * k, (y + 0.1) * k, (TUBE_L - 0.12) * k, 0.05 * k, 0.025 * k)
}

/* ------------------------------------------------------------------ the storefront */

/** Where the neon washer hangs in the window. */
const NEON_AT: Pt = [-5.72, -2.55]

function street(pen: Pen, t: number, x0: number, x1: number, y0: number, y1: number): void {
  const { p, k } = pen
  const ctx = p.drawingContext as CanvasRenderingContext2D
  p.noStroke()
  p.fill(NIGHT)
  p.rect(((x0 + x1) / 2) * k, ((y0 + y1) / 2) * k, (x1 - x0) * k, (y1 - y0) * k)
  // The block across the street: building fronts in two night tones, each with a grid of windows, a few lit warm.
  const fronts: [number, number, number][] = [
    [-9.6, -8.2, -3.9],
    [-8.2, -6.9, -3.3],
    [-6.9, -5.6, -4.2],
    [-5.6, -4.3, -3.6],
    [-4.3, -2.9, -4.0],
  ]
  fronts.forEach(([a0, a1, roof], i) => {
    p.fill(mixHex(HOME.night, HOME.steelDark, i % 2 ? 0.22 : 0.34))
    p.rect(((a0 + a1) / 2) * k, ((roof + FLOOR - 0.6) / 2) * k, (a1 - a0) * k, (FLOOR - 0.6 - roof) * k)
    p.fill(mixHex(HOME.night, HOME.steelDark, 0.5))
    p.rect(((a0 + a1) / 2) * k, roof * k, (a1 - a0 + 0.06) * k, 0.08 * k)
    for (let r = 0; r < 4; r++) {
      const wy = roof + 0.45 + r * 0.62
      if (wy > -1.3) break
      for (let c = 0; c < 3; c++) {
        const wx = a0 + 0.25 + c * ((a1 - a0 - 0.5) / 2)
        const on = hash(i * 7 + r, c, 3) < 0.34
        if (on) p.fill(alpha(p, HOME.gold, 0.62))
        else p.fill(mixHex(HOME.night, HOME.steelDark, 0.12))
        p.rect(wx * k, wy * k, 0.2 * k, 0.3 * k, 0.02 * k)
      }
    }
  })
  // A shop across the way, still lit: its window's warm light, behind the door.
  p.fill(alpha(p, HOME.gold, 0.3))
  p.rect(-4.2 * k, -1.2 * k, 1.1 * k, 0.9 * k)
  p.fill(alpha(p, HOME.light, 0.38))
  p.rect(-4.2 * k, -1.2 * k, 0.9 * k, 0.7 * k)
  // The pavement and the kerb.
  p.fill(mixHex(HOME.night, HOME.steelDark, 0.45))
  p.rect(((x0 + x1) / 2) * k, (FLOOR - 0.3) * k, (x1 - x0) * k, 0.62 * k)
  // A street lamp outside, and its light.
  const lx = -6.9
  const g = ctx.createRadialGradient(lx * k, -3.05 * k, 0, lx * k, -3.05 * k, 2.3 * k)
  g.addColorStop(0, 'rgba(255, 247, 220, 0.55)')
  g.addColorStop(0.35, 'rgba(255, 247, 220, 0.14)')
  g.addColorStop(1, 'rgba(255, 247, 220, 0)')
  ctx.fillStyle = g
  ctx.fillRect((lx - 2.4) * k, (-3.05 - 2.4) * k, 4.8 * k, 4.8 * k)
  p.fill(mixHex(HOME.night, HOME.steelDark, 0.6))
  p.rect(lx * k, ((-3.1 + FLOOR - 0.5) / 2) * k, 0.07 * k, (FLOOR - 0.5 + 3.1) * k)
  p.rect((lx + 0.18) * k, -3.1 * k, 0.4 * k, 0.05 * k)
  p.fill(HOME.light)
  p.ellipse((lx + 0.36) * k, -3.02 * k, 0.22 * k, 0.08 * k)
  // A string of new year lanterns across the street, small and far, on their line.
  p.noFill()
  p.stroke(alpha(p, HOME.steelDark, 0.9))
  p.strokeWeight(Math.max(1, k * 0.01))
  p.beginShape()
  for (let i = 0; i <= 16; i++) {
    const sx = -9.4 + (i / 16) * 6.4
    p.vertex(sx * k, (-3.86 + 0.22 * Math.sin(((sx + 9.4) / 6.4) * Math.PI)) * k)
  }
  p.endShape()
  p.noStroke()
  for (let i = 0; i < 6; i++) {
    const sx = -8.9 + i * 1.08
    const sy = -3.86 + 0.22 * Math.sin(((sx + 9.4) / 6.4) * Math.PI) + 0.1
    p.fill(alpha(p, HOME.red, 0.85))
    p.ellipse(sx * k, sy * k, 0.17 * k, 0.14 * k)
    p.fill(alpha(p, HOME.gold, 0.7))
    p.rect(sx * k, (sy - 0.075) * k, 0.07 * k, 0.025 * k)
  }
  for (const f of STREET) f(pen.p, k, t)
}

/** Painters for the storefront's glass (fireworks), over the street and under the window's frames. */
export const STREET: ((p: p5, k: number, t: number) => void)[] = []

function neonWasher(pen: Pen, t: number): void {
  const { p, k } = pen
  const on = t < LIGHTS.neonOff ? 1 : 0
  const [cx, cy] = NEON_AT
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Its chains.
  p.stroke(alpha(p, HOME.steel, 0.7))
  p.strokeWeight(Math.max(1, k * 0.012))
  for (const s of [-1, 1]) p.line((cx + s * 0.32) * k, STOREFRONT.head * k, (cx + s * 0.32) * k, (cy - 0.42) * k)
  if (on) {
    const g = ctx.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, 1.0 * k)
    g.addColorStop(0, 'rgba(231, 162, 166, 0.5)')
    g.addColorStop(1, 'rgba(231, 162, 166, 0)')
    ctx.fillStyle = g
    ctx.fillRect((cx - 1) * k, (cy - 1) * k, 2 * k, 2 * k)
  }
  const tubeCol = on ? mixHex(HOME.rose, HOME.paper, 0.35) : mixHex(HOME.red, HOME.night, 0.5)
  const passes: [p5.Color, number][] = [[alpha(p, HOME.red, on ? 0.85 : 0), 0.07], [p.color(tubeCol), 0.028]]
  for (const [col, wgt] of passes) {
    p.noFill()
    p.stroke(col)
    p.strokeWeight(Math.max(1, wgt * k))
    p.rect(cx * k, cy * k, 0.7 * k, 0.8 * k, 0.08 * k)
    p.line((cx - 0.35) * k, (cy - 0.22) * k, (cx + 0.35) * k, (cy - 0.22) * k)
    p.circle(cx * k, (cy + 0.1) * k, 0.4 * k)
    p.point((cx - 0.2) * k, (cy - 0.3) * k)
  }
}

function storefront(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const S = STOREFRONT
  const D = DOOR
  const ctx = p.drawingContext as CanvasRenderingContext2D
  // Everything that is glass, onto the street: the window, the transom over it and the door.
  ctx.save()
  ctx.beginPath()
  ctx.rect(S.x0 * k, S.transom * k, (D.x1 - S.x0) * k, (S.sill - S.transom) * k)
  ctx.rect(D.x0 * k, D.top * k, (D.x1 - D.x0) * k, (FLOOR - D.top) * k)
  ctx.clip()
  street(pen, t, S.x0 - 0.2, D.x1 + 0.2, S.transom - 0.2, FLOOR + 0.2)
  ctx.restore()
  // The window's frames: steel, dark.
  const frameCol = HOME.steelDark
  solid(p, ink, w, frameCol)
  const bar = (x: number, y: number, bw: number, bh: number) => p.rect(x * k, y * k, bw * k, bh * k)
  bar((S.x0 + D.x1) / 2, S.transom - 0.05, D.x1 - S.x0 + 0.1, 0.1)
  bar((S.x0 + S.x1) / 2, S.head, S.x1 - S.x0 + 0.1, 0.1)
  bar(S.x0, (S.transom + S.sill) / 2, 0.1, S.sill - S.transom)
  bar(S.x1, (S.transom + S.sill) / 2, 0.1, S.sill - S.transom)
  bar(S.mullion, (S.head + S.sill) / 2, 0.07, S.sill - S.head)
  // The sill and the kick plate under it.
  solid(p, ink, w, HOME.steel)
  bar((S.x0 + S.x1) / 2, (S.sill + FLOOR) / 2, S.x1 - S.x0 + 0.1, FLOOR - S.sill)
  // The door's frame and head.
  solid(p, ink, w, frameCol)
  bar((D.x0 + D.x1) / 2, D.top - 0.05, D.x1 - D.x0 + 0.1, 0.1)
  bar(D.x0 - 0.05, (D.top + FLOOR) / 2, 0.1, FLOOR - D.top)
  bar(D.x1 + 0.05, (D.top + FLOOR) / 2, 0.1, FLOOR - D.top)
  bar((S.x1 + D.x0) / 2, (S.transom + FLOOR) / 2, D.x0 - S.x1, FLOOR - S.transom)
  neonWasher(pen, t)
}

/** The front door's leaf, swung on its hinge (left) towards us by `open`, and the bell over it. */
function frontDoor(pen: Pen, t: number): void {
  const { p, k, ink, w } = pen
  const D = DOOR
  const open = doorAt(t)
  const sx = Math.cos(open * 1.35)
  const W = D.x1 - D.x0
  const x1 = D.x0 + W * sx
  // Opening, it also comes towards us: a hair taller.
  const grow = 0.06 * Math.sin(open * 1.35)
  const top = D.top - grow
  const bot = FLOOR + grow * 0.5
  solid(p, ink, w, HOME.steelDark)
  p.beginShape()
  p.vertex(D.x0 * k, D.top * k)
  p.vertex(x1 * k, top * k)
  p.vertex(x1 * k, bot * k)
  p.vertex(D.x0 * k, FLOOR * k)
  p.endShape(p.CLOSE)
  // Its glass (the street shows through), inset.
  const inset = 0.09 * sx
  if (sx > 0.12) {
    p.noStroke()
    p.fill(alpha(p, HOME.glass, 0.14))
    p.beginShape()
    p.vertex((D.x0 + inset) * k, (D.top + 0.1) * k)
    p.vertex((x1 - inset) * k, (top + 0.1) * k)
    p.vertex((x1 - inset) * k, (bot - 0.1) * k)
    p.vertex((D.x0 + inset) * k, (FLOOR - 0.1) * k)
    p.endShape(p.CLOSE)
    // The glass is a hole in the leaf: redraw the street inside it.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.save()
    ctx.beginPath()
    ctx.moveTo((D.x0 + inset) * k, (D.top + 0.1) * k)
    ctx.lineTo((x1 - inset) * k, (top + 0.1) * k)
    ctx.lineTo((x1 - inset) * k, (bot - 0.1) * k)
    ctx.lineTo((D.x0 + inset) * k, (FLOOR - 0.1) * k)
    ctx.closePath()
    ctx.clip()
    street(pen, t, D.x0 - 0.2, D.x1 + 0.2, D.top - 0.3, FLOOR + 0.3)
    ctx.restore()
    outline(p, ink, w * 0.7)
    p.beginShape()
    p.vertex((D.x0 + inset) * k, (D.top + 0.1) * k)
    p.vertex((x1 - inset) * k, (top + 0.1) * k)
    p.vertex((x1 - inset) * k, (bot - 0.1) * k)
    p.vertex((D.x0 + inset) * k, (FLOOR - 0.1) * k)
    p.endShape(p.CLOSE)
    // The push bar across it.
    solid(p, ink, w * 0.7, HOME.steel)
    const by = -1.25
    p.rect(((D.x0 + x1) / 2) * k, by * k, (x1 - D.x0 - 2 * inset) * k, 0.07 * k, 0.03 * k)
  }
  // The bell on its curled bracket, over the latch side.
  const [bx, by] = D.bell
  const swing = bellAt(t)
  outline(p, ink, w * 0.7)
  p.noFill()
  p.beginShape()
  p.vertex(bx * k, (D.top - 0.1) * k)
  p.bezierVertex((bx + 0.12) * k, (D.top - 0.1) * k, (bx + 0.12) * k, (by - 0.05) * k, bx * k, (by - 0.08) * k)
  p.endShape()
  p.push()
  p.translate(bx * k, (by - 0.08) * k)
  p.rotate(swing)
  solid(p, ink, w * 0.7, HOME.gold)
  p.beginShape()
  p.vertex(-0.025 * k, 0)
  p.vertex(0.025 * k, 0)
  p.vertex(0.075 * k, 0.15 * k)
  p.vertex(-0.075 * k, 0.15 * k)
  p.endShape(p.CLOSE)
  p.circle(0, 0.17 * k, 0.045 * k)
  p.pop()
}

/* ------------------------------------------------------------------ the room */

/** The idle washers' laundry bags on top, and how they sit. */
const TOP_BAGS: { x: number; color: string; size: number }[] = [
  { x: 5.45, color: HOME.rose, size: 0.62 },
  { x: 12.6, color: HOME.denim, size: 0.6 },
  { x: 15.6, color: HOME.rose, size: 0.55 },
]

/** The washers that are running someone's washing all night. */
const RUNNING = [2, 5]

/** The great hit shakes the room: everything loose hops, and settles. */
const jolt = (t: number): number => knock(t - GREAT, 0.12) * Math.sin(Math.max(0, t - GREAT) * 38)

function drawRoom(pen: Pen, t: number, f: { x0: number; x1: number; y0: number; y1: number }): void {
  const { p, k, ink, w } = pen
  const R0 = ROOM.x0
  const R1 = ROOM.x1
  const C = ROOM.ceiling
  const see = (a: number, b: number) => b >= f.x0 - 0.5 && a <= f.x1 + 0.5
  // The night round the building, wherever the frame goes past it.
  p.noStroke()
  p.fill(NIGHT)
  p.rect(((f.x0 + f.x1) / 2) * k, ((f.y0 + f.y1) / 2) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  // The back wall, and its tiled wainscot.
  const wx0 = Math.max(R0, f.x0 - 1)
  const wx1 = Math.min(R1, f.x1 + 1)
  if (wx1 > wx0) {
    p.fill(WALL)
    p.rect(((wx0 + wx1) / 2) * k, ((C + FLOOR) / 2) * k, (wx1 - wx0) * k, (FLOOR - C) * k)
    p.fill(HOME.tile)
    p.rect(((wx0 + wx1) / 2) * k, ((ROOM.wainscot + FLOOR) / 2) * k, (wx1 - wx0) * k, (FLOOR - ROOM.wainscot) * k)
    p.stroke(alpha(p, HOME.tileDeep, 0.8))
    p.strokeWeight(Math.max(1, k * 0.012))
    const tile = 0.3
    for (let y = ROOM.wainscot + tile; y < FLOOR - 0.01; y += tile) p.line(wx0 * k, y * k, wx1 * k, y * k)
    for (let x = Math.ceil(wx0 / tile) * tile; x < wx1; x += tile) p.line(x * k, ROOM.wainscot * k, x * k, FLOOR * k)
    // The wainscot's cap.
    solid(p, ink, w * 0.7, HOME.tileDeep)
    p.rect(((wx0 + wx1) / 2) * k, ROOM.wainscot * k, (wx1 - wx0) * k, 0.07 * k)
  }
  // The storefront and the door, at the left end.
  if (see(STOREFRONT.x0 - 1, DOOR.x1 + 1)) {
    storefront(pen, t)
    frontDoor(pen, t)
  }
  // The ceiling and the floor, cut.
  solid(p, ink, w, CEILING_FILL)
  p.rect(((R0 + R1) / 2) * k, (C - 0.2) * k, (R1 - R0 + 0.6) * k, 0.4 * k)
  outline(p, ink, w * 0.4)
  for (let x = Math.ceil(Math.max(R0, f.x0) / 1.2) * 1.2; x < Math.min(R1, f.x1); x += 1.2) p.line(x * k, (C - 0.4) * k, x * k, C * k)
  // The ground the building stands on, cut, under the floor's slab: earth, not the night, so a low camera sees
  // what the shop stands on rather than a black band.
  if (f.y1 > FLOOR + 0.44) {
    const gx0 = Math.max(R0 - 0.3, f.x0 - 1)
    const gx1 = Math.min(R1 + 0.3, f.x1 + 1)
    if (gx1 > gx0) {
      p.noStroke()
      p.fill(mixHex(HOME.floor, HOME.night, 0.62))
      p.rect(((gx0 + gx1) / 2) * k, ((FLOOR + 0.44 + f.y1 + 1) / 2) * k, (gx1 - gx0) * k, (f.y1 + 1 - FLOOR - 0.44) * k)
      p.stroke(alpha(p, mixHex(HOME.floor, HOME.night, 0.45), 0.5))
      p.strokeWeight(Math.max(1, k * 0.01))
      for (let i = 0; i < 4; i++) {
        const y = FLOOR + 0.75 + i * (0.42 + 0.08 * i)
        if (y > f.y1 + 0.5) break
        p.line(gx0 * k, y * k, gx1 * k, y * k)
      }
    }
  }
  solid(p, ink, w, HOME.floor)
  p.rect(((R0 + R1) / 2) * k, (FLOOR + 0.22) * k, (R1 - R0 + 0.6) * k, 0.44 * k)
  // The end walls, in section.
  for (const [a, b] of [[R0 - 0.3, R0], [R1, R1 + 0.3]]) {
    if (!see(a, b)) continue
    solid(p, ink, w, SECTION)
    p.rect(((a + b) / 2) * k, ((C - 0.4 + FLOOR + 0.44) / 2) * k, (b - a) * k, (FLOOR + 0.44 - C + 0.4) * k)
  }
  // The pavement outside the storefront's end, where the frame looks past it.
  if (f.x0 < R0 - 0.3) {
    p.noStroke()
    p.fill(mixHex(HOME.night, HOME.steelDark, 0.45))
    p.rect(((f.x0 - 1 + R0 - 0.3) / 2) * k, (FLOOR + 0.22) * k, (R0 - 0.3 - f.x0 + 1) * k, 0.44 * k)
  }

  // The fixtures. The counter.
  if (see(COUNTER.x0, COUNTER.x1)) counterFront(pen)
  // The washers (all but the laundromat part's, the first).
  const j = jolt(t)
  WASHERS.forEach((wa, i) => {
    if (i === 0 || !see(wa.x - 0.8, wa.x + 0.8)) return
    const near = Math.abs(wa.x - WASHERS[0].x) < 9
    // Two of them are running: someone's washing, turning slowly all night.
    const running = RUNNING.includes(i)
    washer(pen, wa.x, {
      turn: 0.4 + i + (running ? t * 0.9 : 0),
      load: running ? [HOME.denim, HOME.butter, HOME.paper] : [],
      water: running ? 0.18 : 0,
      slosh: running ? 0.12 * Math.sin(t * 1.3 + i) : 0,
      lamp2: running ? 1 : 0,
      dy: near ? -Math.abs(j) * 0.03 * (1 - Math.abs(wa.x - WASHERS[0].x) / 9) : 0,
    })
  })
  // The stacked dryers.
  STACKS.forEach((x, i) => {
    if (!see(x - 0.8, x + 0.8)) return
    dryer(pen, x, false, { turn: i * 1.3 }, FLOOR)
    dryer(pen, x, false, { turn: i * 0.7 + 2 }, FLOOR - DRYER.h)
  })
  // The folding table, a stack of folded laundry on it, two stools by it.
  if (see(21.4, 25.4)) {
    table(pen, 21.8, 25.0, -1.0)
    const folded = [HOME.denim, HOME.paper, HOME.rose, HOME.butter]
    folded.forEach((col, i) => {
      solid(p, ink, w * 0.7, col)
      p.rect(22.6 * k, (-1.1 - i * 0.1) * k, 0.8 * k, 0.1 * k, 0.03 * k)
    })
    folded.slice(1).forEach((col, i) => {
      solid(p, ink, w * 0.7, col)
      p.rect(24.1 * k, (-1.1 - i * 0.1) * k, 0.7 * k, 0.1 * k, 0.03 * k)
    })
    stool(pen, 21.4)
    stool(pen, 25.4)
  }
  // Laundry bags waiting on the washers, googly-eyed (Waymond's work): they hop on the great hit.
  for (const b of TOP_BAGS) {
    if (!see(b.x - 0.5, b.x + 0.5)) continue
    const near = clamp(1 - Math.abs(b.x - WASHERS[0].x) / 10)
    const hop = Math.max(0, j) * 0.08 * near
    bag(pen, b.x, WASHER.top - hop, { color: b.color, size: b.size, swing: 0.8 * j * near, lift: clamp(j * 1.5) * near })
  }
  // The tubes, over all of it.
  TUBES.forEach((tb, i) => {
    if (!see(tb.x - TUBE_L, tb.x + TUBE_L)) return
    tube(pen, tb.x, tubeLevel(i, t))
  })
}

/* ------------------------------------------------------------------ the light map */

let lightCanvas: HTMLCanvasElement | null = null

/**
 * The room's light: everything drawn so far multiplied by a map of how lit it is. The map is the night's colour,
 * with the tubes' pools, the street lamp, the neon and any other part's glows laid on it in light. Where it is
 * white the room is as drawn; at 0 it is the room at night.
 */
function lightMap(p: p5, k: number, t: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  if (typeof document === 'undefined') return
  if (!lightCanvas) lightCanvas = document.createElement('canvas')
  if (lightCanvas.width !== cw || lightCanvas.height !== ch) {
    lightCanvas.width = cw
    lightCanvas.height = ch
  }
  const g = lightCanvas.getContext('2d')
  if (!g) return
  g.save()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.fillStyle = AMBIENT
  g.fillRect(0, 0, cw, ch)
  g.setTransform(ctx.getTransform())
  g.globalCompositeOperation = 'lighter'
  const pool = (x: number, y: number, rx: number, ry: number, a: number, color = '#FFF7DC') => {
    if (a <= 0.003) return
    const c = p.color(color)
    const rgb = `${p.red(c)}, ${p.green(c)}, ${p.blue(c)}`
    g.save()
    g.translate(x * k, y * k)
    g.scale(1, ry / rx)
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx * k)
    grad.addColorStop(0, `rgba(${rgb}, ${Math.min(1, a)})`)
    grad.addColorStop(0.55, `rgba(${rgb}, ${Math.min(1, a) * 0.75})`)
    grad.addColorStop(1, `rgba(${rgb}, 0)`)
    g.fillStyle = grad
    g.fillRect(-rx * k, -rx * k, 2 * rx * k, 2 * rx * k)
    g.restore()
  }
  TUBES.forEach((tb, i) => {
    const l = tubeLevel(i, t)
    // A pool of light under the tube, down to the floor; and the tube itself.
    // The pools saturate when the tube is fully on, so a lit room is exactly as drawn; dimmed, they fall off fast.
    const a = 2.0 * l * Math.sqrt(l)
    pool(tb.x, TUBE_Y + 1.9, 4.2, 4.0, a)
    pool(tb.x, TUBE_Y + 0.05, 1.8, 0.4, 1.4 * l)
  })
  for (const gl of roomGlows(t)) pool(gl.x, gl.y, gl.r, gl.r, gl.a, gl.color)
  for (const fn of LIGHTS.glows) for (const gl of fn(t)) pool(gl.x, gl.y, gl.r, gl.r, gl.a, gl.color)
  g.restore()
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(lightCanvas, 0, 0)
  ctx.restore()
}

/**
 * The room: scenery drawn from show time. Its `draw` is the shop and every idle fixture in it; its `over` is the
 * light, over every part's `draw` and the balls.
 */
export const room = scenery<null>({
  name: 'room',
  draw: (p, _s, c) => {
    const f = frame(p, c.k)
    drawRoom(penOf(p, c), c.t, f)
  },
  over: (p, _s, c) => {
    const f = frame(p, c.k)
    if (allLit(c.t, f.x0, f.x1)) return
    lightMap(p, c.k, c.t)
  },
})

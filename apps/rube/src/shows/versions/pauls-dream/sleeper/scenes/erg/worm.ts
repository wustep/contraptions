import { blob, clamp01, ellipse, fill, mix, poly, rgba, smooth, vgrad, type Paint, type Pt } from '../../paint'
import { G } from '../../path'
import { T, WORM, curve } from './geo'

/**
 * The first worm. It comes up out of the sand beside the harvester like a tower, sand pouring off it, its head shut in
 * three petals; it stands over everything as the petals peel open on its maw; it bends over in one arch, and comes down
 * on the harvester mouth first; and the rest of it follows its head down into the sand the way a train follows its
 * rails: every part of the body goes where the head went.
 *
 * The rails: from under the sand at the worm's base straight up, a half circle over to the west, and straight down
 * through the harvester into the sand. The body is the `LENGTH` cells of rail behind the head; nothing under the sand
 * is drawn. It is armoured in rings of plates, each overlapping the next toward the tail, so its outline steps out at
 * every ring and a shadow lies under each plate's edge. It is lit from the sun, up and to the east: the side that
 * faces it sand-pale, the side away in its own shade.
 */

const UP = 38
const R_ARC = (WORM.base - WORM.plunge) / 2
const ARC = Math.PI * R_ARC
const TOP = 3 - UP
const LENGTH = 82
/** The body's radius, and the maw's when it is wide open. */
export const RADIUS = 8.6
const MAW = 14.5
/** A ring of plates every so many cells back from the head. */
const PLATE = 6.4

/**
 * How far its standing column sways east (+) or west at `t`, at its top: it rises a little crooked, sways as it stands
 * over them, and draws back before it bends over. Nothing by the time the arch begins, so the arch lands where it must.
 */
function sway(t: number): number {
  const up = smooth(t, T.rise, T.rise + 1.6) * (1 - smooth(t, 178.2, T.arch))
  return up * (1.4 * Math.sin((2 * Math.PI * (t - T.rise)) / 4.6 + 0.6) + 1.1 * smooth(t, 177.2, 178.6))
}

/** Where the rail is at length `s` from its start under the sand at `t`, and which way it runs there. */
export function rail(s: number, t = 0): { p: Pt; d: Pt } {
  if (s <= UP) {
    const a = sway(t)
    const u = s / UP
    const dx = (2 * a * u) / UP
    const l = Math.hypot(dx, 1)
    return { p: [WORM.base + a * u * u, 3 - s], d: [dx / l, -1 / l] }
  }
  if (s <= UP + ARC) {
    const a = (s - UP) / R_ARC
    return { p: [WORM.plunge + R_ARC + R_ARC * Math.cos(a), TOP - R_ARC * Math.sin(a)], d: [-Math.sin(a), -Math.cos(a)] }
  }
  return { p: [WORM.plunge, TOP + (s - UP - ARC)], d: [0, 1] }
}
/** Where the rail comes out of the sand on the way up, and goes back in on the way down. */
const S_OUT = 3
const S_IN = UP + ARC - TOP

/** How far along its rail the head is. */
const head = curve([
  [T.rise - 0.4, 0], [T.rise, S_OUT], [172.0, 25], [173.2, 32.5], [176.0, 35.2], [T.arch, 37], [T.over, UP + ARC / 2], [T.down, UP + ARC],
  [185.6, UP + ARC + 17], [T.swallow, UP + ARC + 34.6], [188.6, S_IN + 14], [191.6, S_IN + LENGTH + 4],
])

/** How far open the maw is: its petals peel back as it stands, and it goes down open over what it takes. */
const openAt = (t: number): number => smooth(t, 171.4, 175.2)

/** Whether any of it is out of the sand at `t`. */
export const out = (t: number): boolean => head(t) > S_OUT && head(t) - LENGTH < S_IN

/** How high its top stands at `t` (cells over the sand; 0 when none of it is up). */
export function height(t: number): number {
  const s = head(t)
  if (s <= S_OUT) return 0
  if (s <= UP) return s - S_OUT + RADIUS * 0.6
  return UP - S_OUT + R_ARC + RADIUS
}

/** Where the middle of its maw is at `t`, and its radius: the harvester rides it down. */
export function maw(t: number): { p: Pt; r: number } {
  const { p, d } = rail(head(t), t)
  return { p: [p[0] + d[0] * 0.4, p[1] + d[1] * 0.4], r: RADIUS + (MAW - RADIUS) * openAt(t) }
}

const BODY = '#806A53'
const LIT = '#BFA27B'
const SHADE = '#4B3C2E'
const GAP = '#33271E'
const LIP = '#A88D69'
const THROAT = '#1E130C'
const BALEEN = '#D8C6A6'
const SAND = '#CDA472'

/**
 * The body's radius `back` cells behind the head: the maw's flare at the front, each plate stepping out a little toward
 * its edge (the plates overlap toward the tail), and a little taper at the tail.
 */
function radiusAt(back: number, t: number): number {
  const open = openAt(t)
  const flare = (MAW - RADIUS) * open * Math.max(0, 1 - back / 6) ** 2
  // Shut, its head is a bud: the body drawn to a blunt point over its last cells, its three petals closed.
  const bud = (1 - open) * RADIUS * 1.5
  const budK = back < bud ? 0.2 + 0.8 * Math.sqrt(Math.max(0, back) / bud) : 1
  const into = (back - 3.6) / PLATE
  const step = back > 3.6 ? 0.05 * (into - Math.floor(into)) : 0
  const tail = RADIUS * 0.32 * smooth(back, LENGTH - 12, LENGTH)
  // A little narrower just behind the head, a little fuller down the body.
  const neck = 0.9 + 0.1 * smooth(back, 3, 16) + 0.06 * smooth(back, 16, 40)
  return (RADIUS * neck * (1 + step) - tail) * budK + flare
}

/** Toward the sun (up and east), for the light on it. */
const SUN: Pt = [0.78, -0.62]

export function drawWorm(g: Paint, t: number, ground: number): void {
  if (!out(t)) return
  const ctx = g.ctx
  const s1 = head(t)
  const lo = Math.max(S_OUT - 1, s1 - LENGTH)
  const hi = Math.min(s1, S_IN + 1)
  if (hi <= lo) return
  ctx.save()
  // Nothing of it under the sand.
  ctx.beginPath()
  ctx.rect(g.view.x0 - 1, g.view.y0 - 1, g.view.w + 2, ground + 1 - g.view.y0)
  ctx.clip()
  const n = Math.max(4, Math.ceil((hi - lo) / 0.3))
  // Each edge of the body, and on each a band of light as wide as that side turns toward the sun and a band of shade as
  // wide as it turns away: never jumping from one side to the other where the arch turns.
  const left: Pt[] = []
  const right: Pt[] = []
  const bands = { leftLit: [] as Pt[], leftDark: [] as Pt[], rightLit: [] as Pt[], rightDark: [] as Pt[] }
  for (let i = 0; i <= n; i++) {
    const s = hi - ((hi - lo) * i) / n
    const { p, d } = rail(s, t)
    const r = radiusAt(s1 - s, t)
    const nx = -d[1]
    const ny = d[0]
    const toward = nx * SUN[0] + ny * SUN[1]
    const lit = clamp01(toward) * 0.55
    const dark = clamp01(-toward) * 0.62
    const at = (k: number): Pt => [p[0] + nx * r * k, p[1] + ny * r * k]
    left.push(at(1))
    right.push(at(-1))
    bands.leftLit.push(at(1 - lit))
    bands.leftDark.push(at(1 - dark))
    bands.rightLit.push(at(-(1 - dark)))
    bands.rightDark.push(at(-(1 - lit * 1.1)))
  }
  const band = (outer: Pt[], inner: Pt[], color: string) => {
    poly(ctx, [...outer, ...[...inner].reverse()])
    fill(ctx, color)
  }
  poly(ctx, [...left, ...[...right].reverse()])
  fill(ctx, vgrad(ctx, -50, 0, [[0, mix(BODY, SAND, 0.18)], [0.6, BODY], [1, mix(BODY, SHADE, 0.45)]]))
  band(left, bands.leftLit, LIT)
  band(right, bands.rightLit, LIT)
  band(left, bands.leftDark, SHADE)
  band(right, bands.rightDark, SHADE)
  // The plates' edges: under each, toward the tail, a band of shadow; on it, toward the head, a lip catching the light
  // on the sunny side. Bowed toward the head, as rings round a body seen side on are.
  for (let k = 0; ; k++) {
    const s = s1 - 3.6 - k * PLATE
    if (s < lo) break
    if (s > hi) continue
    const { p, d } = rail(s, t)
    const r = radiusAt(s1 - s + 0.01, t) * 0.99
    const nx = -d[1]
    const ny = d[0]
    const bow = r * 0.3
    const arc = (off: number) => {
      ctx.beginPath()
      ctx.moveTo(p[0] + nx * r - d[0] * off, p[1] + ny * r - d[1] * off)
      ctx.quadraticCurveTo(p[0] + d[0] * (bow - off), p[1] + d[1] * (bow - off), p[0] - nx * r - d[0] * off, p[1] - ny * r - d[1] * off)
    }
    arc(0.32)
    ctx.lineWidth = Math.max(1.25 * g.px, 0.62)
    ctx.strokeStyle = rgba(GAP, 0.85)
    ctx.stroke()
    // The lip: pale where the side it is on faces the sun, nothing on the shaded side.
    const toward = nx * SUN[0] + ny * SUN[1]
    const lip = ctx.createLinearGradient(p[0] + nx * r, p[1] + ny * r, p[0] - nx * r, p[1] - ny * r)
    lip.addColorStop(0, rgba(SAND, 0.75 * clamp01(0.3 + toward)))
    lip.addColorStop(0.5, rgba(SAND, 0.2))
    lip.addColorStop(1, rgba(SAND, 0.75 * clamp01(0.3 - toward)))
    arc(-0.05)
    ctx.lineWidth = Math.max(1.25 * g.px, 0.2)
    ctx.strokeStyle = lip
    ctx.stroke()
  }
  if (s1 <= S_IN + 0.6) drawMaw(g, t, s1)
  drawCurtains(g, t)
  ctx.restore()
}

/**
 * The head. Shut, it is a bud: the body drawn to a blunt point, the seams of its three petals meeting there. As it opens
 * the bud parts and the body flares out like a trumpet's bell into a pale lip round a dark throat, set with two rings of
 * baleen.
 */
function drawMaw(g: Paint, t: number, s1: number): void {
  const ctx = g.ctx
  const { p, d } = rail(s1, t)
  const open = openAt(t)
  const r = RADIUS + (MAW - RADIUS) * open
  const nx = -d[1]
  const ny = d[0]
  const rot = Math.atan2(ny, nx)
  // The seams of the shut petals, from the bud's foot to its point, fading as it opens.
  const bud = (1 - open) * RADIUS * 1.5
  if (bud > 0.3) {
    const tip = p
    for (const k of [0.62, 0, -0.62]) {
      const footR = RADIUS * 0.96
      const foot: Pt = [p[0] - d[0] * bud + nx * footR * k, p[1] - d[1] * bud + ny * footR * k]
      ctx.beginPath()
      ctx.moveTo(foot[0], foot[1])
      ctx.quadraticCurveTo(p[0] - d[0] * bud * 0.35 + nx * footR * k * 0.6, p[1] - d[1] * bud * 0.35 + ny * footR * k * 0.6, tip[0], tip[1])
      ctx.lineWidth = Math.max(1.25 * g.px, 0.3)
      ctx.strokeStyle = rgba(GAP, 0.85 * (1 - open))
      ctx.stroke()
    }
  }
  if (open < 0.02) return
  // The lip, and the throat inside it. Turned side on (the arch) or raised over them it is seen a little from the open
  // side, the throat and its baleen showing; coming down it is seen nearly edge on, a bell's rim going over the harvester.
  const depth = (d[1] < 0 ? 0.42 : 0.14 + 0.36 * Math.abs(d[0])) * open
  ellipse(ctx, p[0], p[1], r, r * Math.max(0.04, depth), rot)
  fill(ctx, LIP)
  ellipse(ctx, p[0] + d[0] * 0.15, p[1] + d[1] * 0.15, r * 0.84, r * depth * 0.78, rot)
  fill(ctx, THROAT)
  // Two rings of baleen round the inside of the lip, long pale blades pointing in, the outer ring longer.
  for (const [ring, count, long, wide] of [[0.84, 26, 0.24, 0.07], [0.58, 20, 0.2, 0.06]] as [number, number, number, number][]) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + ring
      const ax = r * ring * Math.cos(a)
      const ay = r * ring * Math.sin(a) * depth
      const rim: Pt = [p[0] + nx * ax + d[0] * ay, p[1] + ny * ax + d[1] * ay]
      const len = long * open
      const tip: Pt = [p[0] + (nx * ax + d[0] * ay) * (1 - len), p[1] + (ny * ax + d[1] * ay) * (1 - len)]
      const tx = -nx * Math.sin(a) + d[0] * Math.cos(a) * depth
      const ty = -ny * Math.sin(a) + d[1] * Math.cos(a) * depth
      const tl = Math.hypot(tx, ty) || 1
      const w = wide * r
      poly(ctx, [[rim[0] + (tx / tl) * w, rim[1] + (ty / tl) * w], tip, [rim[0] - (tx / tl) * w, rim[1] - (ty / tl) * w]])
      fill(ctx, rgba(BALEEN, ring > 0.7 ? 0.92 : 0.6))
    }
  }
}

/** Sand pouring off it as it comes up: curtains let go from its sides at a height, falling, thinning as they go. */
const CURTAINS: { at: number; h: number; side: 1 | -1 }[] = [
  { at: 171.0, h: 12, side: 1 },
  { at: 171.5, h: 19, side: -1 },
  { at: 172.1, h: 25, side: 1 },
  { at: 172.8, h: 29, side: -1 },
  { at: 173.5, h: 31, side: 1 },
]
function drawCurtains(g: Paint, t: number): void {
  const ctx = g.ctx
  for (const c of CURTAINS) {
    const s = t - c.at
    const fall = Math.sqrt((2 * c.h) / G)
    if (s <= 0 || s > fall + 0.8) continue
    const top = -c.h + 0.5 * G * s * s * 0.55
    if (top >= 0) continue
    const x = WORM.base + c.side * (RADIUS * 1.02)
    const a = 0.5 * smooth(s, 0, 0.2) * (1 - smooth(s, fall * 0.5, fall + 0.8))
    const wTop = 0.5
    const wFoot = 2.2 + 0.6 * s
    poly(ctx, [
      [x + c.side * 0.1, top],
      [x + c.side * (0.1 + wTop), top + 0.6],
      [x + c.side * (0.4 + wFoot), 0.3],
      [x - c.side * 0.4, 0.3],
    ])
    const gr = ctx.createLinearGradient(0, top, 0, 0.3)
    gr.addColorStop(0, rgba(SAND, 0))
    gr.addColorStop(0.25, rgba(SAND, a))
    gr.addColorStop(1, rgba(SAND, a * 0.8))
    fill(ctx, gr)
  }
}

/** Sand thrown up where it breaks the surface and where it goes back in: great flat sheets that rise and fall. */
interface Sheet {
  at: number
  x: number
  /** Which way it is thrown (radians from straight up, + east), how fast, and how wide its foot. */
  lean: number
  v: number
  foot: number
}
const SHEETS: Sheet[] = [
  { at: T.rise - 0.05, x: WORM.base - 10, lean: -0.42, v: 21, foot: 8 },
  { at: T.rise, x: WORM.base + 10, lean: 0.4, v: 22, foot: 8.5 },
  { at: T.rise + 0.2, x: WORM.base - 14, lean: -0.75, v: 15, foot: 6 },
  { at: T.rise + 0.3, x: WORM.base + 14, lean: 0.8, v: 14, foot: 6 },
  { at: 186.1, x: WORM.plunge - 11, lean: -0.55, v: 17, foot: 8 },
  { at: T.swallow, x: WORM.plunge + 11, lean: 0.5, v: 18, foot: 8 },
  { at: T.swallow + 0.3, x: WORM.plunge - 15, lean: -0.9, v: 12, foot: 6 },
  { at: T.swallow + 0.5, x: WORM.plunge + 15, lean: 0.85, v: 12.5, foot: 6 },
]

export function drawSheets(g: Paint, t: number, sand: string): void {
  const ctx = g.ctx
  for (const sh of SHEETS) {
    const s = t - sh.at
    const life = (2 * sh.v * Math.cos(sh.lean)) / G + 1.0
    if (s <= 0 || s > life) continue
    // Its crest goes up and out along a throw, under the show's gravity, and its sand thins as it falls.
    const vx = sh.v * Math.sin(sh.lean)
    const vy = -sh.v * Math.cos(sh.lean)
    const cx = sh.x + vx * s
    const cy = Math.min(0, vy * s + 0.5 * G * s * s)
    const a = 0.62 * smooth(s, 0, 0.15) * (1 - smooth(s, life * 0.45, life))
    if (a <= 0.003) continue
    const half = sh.foot * (0.5 + 0.5 * smooth(s, 0, 0.6))
    const top: Pt = [cx, cy]
    blob(ctx, [
      [sh.x - half, 0.4],
      [sh.x - half * 0.55 + (cx - sh.x) * 0.35, cy * 0.45],
      [top[0] - half * 0.25, top[1]],
      [top[0] + half * 0.25, top[1] - 0.4],
      [sh.x + half * 0.55 + (cx - sh.x) * 0.35, cy * 0.5],
      [sh.x + half, 0.4],
    ])
    fill(ctx, rgba(sand, a))
  }
}

/** How much sand is heaped round the worm's base while it stands, and round the hole it goes down into after. */
export function heap(t: number, x: number): number {
  const up = smooth(t, T.rise, T.rise + 0.8) * (1 - smooth(t, T.over, 183.5))
  const atBase = up * 2.0 * Math.exp(-(((x - WORM.base) / 12) ** 2))
  const sink = smooth(t, 186.0, 189.0) * (1 - 0.7 * smooth(t, 190, 197))
  const hole = sink * 2.8 * Math.exp(-(((x - WORM.plunge) / 12) ** 2))
  return -atBase + hole
}

/**
 * How far the harvester has gone down (cells): nothing until the maw's rim is down round it on the sand, then down with
 * the head, inside the worm, out of sight.
 */
export function swallowed(t: number): number {
  if (head(t) < UP + ARC) return 0
  return Math.max(0, maw(t).p[1])
}

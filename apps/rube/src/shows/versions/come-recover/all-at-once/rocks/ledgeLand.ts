import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { hash, type frame } from '../kit'
import { ROCKS, ROCKS_THEME, VOID, VOID_THEME } from '../worlds'
import { NOON, type Light } from './ledgeLight'
import { groundAt, LIP, LIP_OVER, Q, RI, RO, SLAB, SLAB_BACK, TOP, type Ledge, type Plan } from './ledgePath'

/**
 * The canyon, as it is painted: the sky, the canyon going away into the distance in slices that pale as they go,
 * the near wall the two rocks come down (cut side-on, its strata in bands, the tops of its ledges lit and the faces
 * of its cliffs in shade), and the everything bagel in the sand at the bottom.
 *
 * The far slices are drawn in perspective about the frame's middle, which is where the eye is: a slice `D` cells
 * behind the stage is drawn `Z / (Z + D)` of its size, `Z` being how far back the camera stands (the frame's height
 * in cells). So when the camera draws back from the rocks, the near wall shrinks and the far canyon hardly does,
 * which is what makes it vast.
 */

type Frame = ReturnType<typeof frame>
type Ctx2D = CanvasRenderingContext2D

export const INK = ROCKS_THEME.ink
export const PAPER = ROCKS_THEME.bg
/** The haze everything goes to with distance: the far sand, half gone to sky. */
export const HAZE = mixHex(ROCKS.far, ROCKS.sky, 0.45)
export const rgba = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/* ------------------------------------------------------------------ the rock */

/** The canyon's strata, top down: the height each band starts at, and its stone. The rim is a pale caprock. */
export const STRATA: { y: number; c: string }[] = [
  { y: -40, c: mixHex(ROCKS.stone, ROCKS.far, 0.25) },
  { y: 1.0, c: mixHex(ROCKS.canyon, ROCKS.stone, 0.45) },
  { y: 2.2, c: mixHex(ROCKS.sand, ROCKS.canyon, 0.55) },
  { y: 4.3, c: mixHex(ROCKS.canyon, ROCKS.sand, 0.25) },
  { y: 5.2, c: mixHex(ROCKS.canyonShade, ROCKS.canyon, 0.35) },
  { y: 7.6, c: ROCKS.canyon },
  { y: 9.3, c: mixHex(ROCKS.canyon, ROCKS.canyonShade, 0.4) },
  { y: 10.9, c: mixHex(ROCKS.canyon, ROCKS.sand, 0.2) },
  { y: 12.4, c: mixHex(ROCKS.stone, ROCKS.canyon, 0.45) },
  { y: 15.7, c: mixHex(ROCKS.canyonShade, ROCKS.canyon, 0.3) },
  { y: 17.9, c: ROCKS.canyon },
  { y: 20.5, c: mixHex(ROCKS.canyonShade, ROCKS.stoneDeep, 0.35) },
  { y: 22.9, c: mixHex(ROCKS.canyon, ROCKS.stone, 0.4) },
  { y: 25.1, c: ROCKS.stone },
  { y: 27.8, c: mixHex(ROCKS.stoneDeep, ROCKS.stone, 0.3) },
  { y: 30.2, c: mixHex(ROCKS.stoneDeep, ROCKS.canyonShade, 0.4) },
  { y: 32.3, c: ROCKS.stoneDeep },
  { y: 34.9, c: mixHex(ROCKS.stoneDeep, ROCKS.sand, 0.25) },
]
const DEEP = 90
/** How deep the sand lies on a ledge that holds it. */
const SAND = 0.15
/** A band's top edge is not ruled: it wanders a little, as bedding does. */
const bedding = (i: number, x: number): number => STRATA[i].y + 0.055 * Math.sin(0.5 * x + i * 1.7) + 0.028 * Math.sin(1.7 * x + i * 0.9)

/* ------------------------------------------------------------------ the land, worked out once */

export interface Slice {
  /** How far behind the stage, in cells. */
  D: number
  pts: Pt[]
  fill: string
  /** Buttes standing on its floor. */
  buttes: Pt[][]
  /** How far its strata are gone to haze (1: no bands at all). */
  haze: number
  line: number
}

export interface Land {
  /** The near wall's top edge, left to right: the rim, the ledges and cliffs, the floor, and the far wall up to its rim. */
  edge: Pt[]
  /** The cliffs, top to foot, for their shade; the ledges' tops, for their light; and where sand lies. */
  faces: Pt[][]
  tops: [Pt, Pt][]
  sand: [Pt, Pt][]
  /** The rim slab's front and underside, whose shade is on the rock above them. */
  overhangs: Pt[][]
  slices: Slice[]
  floor: number
  ring: { x: number; y: number }
}

/**
 * A wall going down to the right, from (x0, y0) to (x1, y1): cliff and slope, `n` times, each cliff a different
 * height, the slopes at their own angles, a bench here and there.
 */
function wall(seed: number, x0: number, y0: number, x1: number, y1: number, n: number): Pt[] {
  const hs: number[] = []
  const ws: number[] = []
  for (let i = 0; i < n; i++) {
    hs.push(0.35 + 1.2 * hash(i, seed, 1) ** 1.5)
    ws.push(0.3 + 1.1 * hash(i, seed, 2))
  }
  const H = hs.reduce((a, b) => a + b, 0)
  const W = ws.reduce((a, b) => a + b, 0)
  const out: Pt[] = [[x0, y0]]
  let x = x0
  let y = y0
  for (let i = 0; i < n; i++) {
    const h = ((y1 - y0) * hs[i]) / H
    const w = ((x1 - x0) * ws[i]) / W
    const cliff = 0.45 + 0.45 * hash(i, seed, 3)
    const j = hash(i, seed, 4)
    // The cliff: sheer, with a notch in it.
    out.push([x + w * 0.02, y + h * cliff * (0.3 + 0.2 * j)])
    out.push([x - w * 0.015, y + h * cliff * (0.45 + 0.2 * j)])
    out.push([x + w * 0.05, y + h * cliff])
    // The slope under it, easing out onto the next edge.
    const bench = hash(i, seed, 5) > 0.6
    out.push([x + w * (bench ? 0.25 : 0.5), y + h * (cliff + (1 - cliff) * (bench ? 0.2 : 0.75))])
    x += w
    y += h
    out.push([x, y])
  }
  return out
}

/** A slice of the canyon farther off: plateau, a wall down, the floor, a wall up, plateau; closed below. */
function canyon(seed: number, left: number, floorL: number, floorR: number, right: number, depth: number, nl: number, nr: number): Pt[] {
  const down = wall(seed, left, 0, floorL, depth, nl)
  const up = wall(seed + 17, -right, 0, -floorR, depth, nr)
    .map(([x, y]) => [-x, y] as Pt)
    .reverse()
  return [[-6000, 0], ...down, ...up, [6000, 0], [6000, 400], [-6000, 400]]
}

/** A butte standing on a canyon's floor: a flat top, a cliff down, a skirt of scree. */
function butte(x: number, base: number, top: number, w: number, seed: number): Pt[] {
  const h = base - top
  const j = hash(seed, 1)
  return [
    [x - w * 1.1, base],
    [x - w * 0.72, base - h * 0.28],
    [x - w * 0.55, base - h * 0.34],
    [x - w * 0.5, base - h * (0.72 + 0.1 * j)],
    [x - w * 0.46, top + h * 0.02],
    [x - w * 0.42, top],
    [x + w * 0.38, top],
    [x + w * 0.45, top + h * 0.05],
    [x + w * 0.47, base - h * 0.5],
    [x + w * 0.6, base - h * (0.38 + 0.08 * j)],
    [x + w * 0.66, base - h * 0.3],
    [x + w * 1.05, base],
  ]
}

/** The horizon: the far plateau, flat, with a few mesas stood on it. */
function horizon(): Pt[] {
  const out: Pt[] = [[-9000, 0]]
  const mesas = [
    [-1400, 380, 70],
    [-700, 160, 110],
    [-220, 90, 55],
    [260, 240, 85],
    [900, 120, 140],
    [1500, 420, 60],
  ]
  for (const [x, w, h] of mesas) {
    out.push([x - w / 2 - h * 0.8, 0], [x - w / 2 - h * 0.1, -h * 0.66], [x - w / 2, -h], [x + w / 2, -h], [x + w / 2 + h * 0.12, -h * 0.7], [x + w / 2 + h * 0.9, 0])
  }
  out.push([9000, 0], [9000, 900], [-9000, 900])
  return out
}

/**
 * The scree at a cliff's foot: from a little way up the face, curving out onto the ledge below. Returns the points
 * after the face (the last on the ledge) and where the ledge's own top starts.
 */
function skirt(cur: Ledge, foot: Pt, h: number, seed: number): { pts: Pt[]; from: Pt } {
  const sh = Math.min(0.62, 0.12 + h * 0.09) * (0.8 + 0.4 * hash(seed, 7))
  const sw = sh * (1.2 + 0.5 * hash(seed, 8))
  const fx = foot[0]
  const pts: Pt[] = [[fx + 0.01, groundAt(cur, fx) - sh]]
  for (const u of [0.2, 0.45, 0.72]) {
    const x = fx + sw * u
    pts.push([x, groundAt(cur, x) - sh * (1 - u) * (1 - u) * (1 + 0.1 * u)])
  }
  const end: Pt = [fx + sw, groundAt(cur, fx + sw)]
  pts.push(end)
  return { pts, from: end }
}

export function buildLand(plan: Plan): Land {
  const { ledges } = plan
  const edge: Pt[] = []
  const faces: Pt[][] = []
  const tops: [Pt, Pt][] = []
  const sand: [Pt, Pt][] = []
  const overhangs: Pt[][] = []
  // The rim, flat to the lip, its corner a little worn.
  const lip: Pt = [LIP, TOP + 0.04]
  edge.push([ledges[0].a[0], TOP], [LIP - 0.035, TOP], [LIP - 0.008, TOP + 0.01], lip)
  tops.push([[ledges[0].a[0], TOP], [LIP - 0.02, TOP]])
  // Each ledge, and the cliff down to it from the one before: a sheer drop, undercut a little, with a notch or two.
  for (let i = 1; i < ledges.length; i++) {
    const prev = ledges[i - 1]
    const cur = ledges[i]
    const top: Pt = i === 1 ? lip : prev.b
    const foot = cur.a
    const h = foot[1] - top[1]
    const u = top[0] - foot[0]
    const j = hash(i, 5, 9)
    const face: Pt[] = [top]
    if (i === 1) {
      // The rim's slab: its worn front, its underside running back in, and the cliff under it in shade.
      face.push([LIP - 0.02, TOP + SLAB * 0.55], [LIP - 0.07, TOP + SLAB - 0.03], [LIP - 0.2, TOP + SLAB + 0.02], [LIP - SLAB_BACK * 0.55, TOP + SLAB + 0.1], [LIP - SLAB_BACK, TOP + SLAB + 0.2])
      const sk = skirt(cur, foot, h, i)
      face.push([foot[0] + 0.1, top[1] + h * 0.45], [foot[0] + 0.02, top[1] + h * 0.5], [foot[0] + 0.07, top[1] + h * 0.8], ...sk.pts)
      edge.push(...face.slice(1))
      edge.push(cur.b)
      faces.push(face.slice(5))
      overhangs.push(face.slice(0, 6))
      tops.push([sk.from, cur.b])
      continue
    }
    face.push([top[0] - 0.02, top[1] + 0.04])
    face.push([top[0] - u * (0.3 + 0.3 * j), top[1] + h * 0.18])
    face.push([top[0] - u * (0.12 + 0.2 * j), top[1] + h * 0.42])
    face.push([top[0] - u * (0.6 + 0.2 * j), top[1] + h * 0.47])
    face.push([top[0] - u * (0.7 + 0.3 * j), top[1] + h * 0.82])
    const sk = skirt(cur, foot, h, i)
    face.push(...sk.pts)
    edge.push(...face.slice(1))
    edge.push(cur.b)
    faces.push(face)
    tops.push([sk.from, cur.b])
    if (cur.sand) sand.push([sk.from, cur.b])
  }
  // The far wall of this slice, from the floor's end up to its own rim: steeper, the outside of the bend.
  const floorEnd = ledges[ledges.length - 1].b
  const far = wall(31, -(floorEnd[0] + 12), TOP, -floorEnd[0], floorEnd[1], 5)
    .map(([x, y]) => [-x, y] as Pt)
    .reverse()
  edge.push(...far.slice(1), [6000, TOP])

  const slices: Slice[] = [
    { D: 1000, pts: horizon(), fill: mixHex(ROCKS.far, ROCKS.sky, 0.62), buttes: [], haze: 1, line: 0 },
    { D: 320, pts: canyon(7, 50, 104, 122, 178, 36, 5, 5), fill: mixHex(ROCKS.far, HAZE, 0.35), buttes: [butte(150, 36, 11, 9, 4)], haze: 1, line: 0 },
    { D: 110, pts: canyon(3, 16, 50, 66, 112, 35, 5, 4), fill: mixHex(ROCKS.canyon, HAZE, 0.72), buttes: [butte(78, 35, 7, 7, 2), butte(40, 35.5, 20, 4, 5)], haze: 0.9, line: 0.05 },
    { D: 34, pts: canyon(1, -4, 28, 40, 70, 34.4, 6, 4), fill: mixHex(ROCKS.canyon, HAZE, 0.46), buttes: [], haze: 0.62, line: 0.12 },
  ]
  return { edge, faces, overhangs, tops, sand, slices, floor: plan.floor, ring: { x: plan.ring.x, y: plan.ring.top } }
}

/* ------------------------------------------------------------------ painting */

const path = (ctx: Ctx2D, pts: Pt[], k: number, close = true, map?: (p: Pt) => Pt) => {
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = map ? map(pts[i]) : pts[i]
    if (i === 0) ctx.moveTo(x * k, y * k)
    else ctx.lineTo(x * k, y * k)
  }
  if (close) ctx.closePath()
}

/** The sky: pale at the top, warm with haze down at the eye's height (the frame's middle); graded by the hour (`light`). */
export function paintSky(p: p5, k: number, f: Frame, light: Light = NOON): void {
  const ctx = p.drawingContext as Ctx2D
  const H = f.y1 - f.y0
  const g = ctx.createLinearGradient(0, (f.cy - H * 0.75) * k, 0, f.cy * k)
  g.addColorStop(0, light.sky[0])
  g.addColorStop(0.65, light.sky[1])
  g.addColorStop(1, light.sky[2])
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
  paintSun(ctx, k, f, light)
}

/**
 * The sun: over the far canyon, a disc gone soft in the haze, and the sky warm round it. So far off it keeps its place
 * in the frame however the camera moves, as the cloud does; the walls come up over it. High and white at noon, it
 * goes down the frame and warms with the hour (`light.sun`).
 */
function paintSun(ctx: Ctx2D, k: number, f: Frame, light: Light): void {
  const W = f.x1 - f.x0
  const H = f.y1 - f.y0
  // Sized to the frame's height on a 16:9 stage (read off its width), so a taller stage does not grow it.
  const S = Math.min(H, (W * 9) / 16)
  const sun = light.sun
  const cx = (f.x0 + W * sun.u) * k
  const cy = (f.cy - S * sun.v) * k
  const r = S * sun.r * k
  // The haze warm close round it, and no further: a sun in a haze, not a bloom.
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4)
  glow.addColorStop(0, rgba(sun.warm, sun.glow * 0.55))
  glow.addColorStop(0.4, rgba(sun.warm, sun.glow * 0.2))
  glow.addColorStop(1, rgba(sun.warm, 0))
  ctx.fillStyle = glow
  ctx.fillRect(cx - r * 4, cy - r * 4, r * 8, r * 8)
  const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.25)
  disc.addColorStop(0, rgba(sun.disc, 0.95))
  disc.addColorStop(0.78, rgba(sun.disc, 0.85))
  disc.addColorStop(1, rgba(sun.warm, 0))
  ctx.fillStyle = disc
  ctx.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6)
}

/**
 * High cloud: a few long thin streaks, so far off they keep their place in the frame however the camera moves, and
 * drift on the wind, slowly. The one thing in the sky, and the wind's only mark on it.
 */
export function paintCloud(p: p5, k: number, f: Frame, t: number, light: Light = NOON): void {
  const ctx = p.drawingContext as Ctx2D
  const W = f.x1 - f.x0
  const H = f.y1 - f.y0
  const streaks = [
    { u: 0.12, v: 0.1, l: 0.42, h: 0.016, a: 0.5 },
    { u: 0.63, v: 0.16, l: 0.3, h: 0.011, a: 0.42 },
    { u: 0.4, v: 0.25, l: 0.24, h: 0.009, a: 0.34 },
    { u: 0.9, v: 0.07, l: 0.2, h: 0.008, a: 0.36 },
  ]
  for (const [i, c] of streaks.entries()) {
    const u = ((((c.u + t * (0.0045 + 0.001 * i)) % 1.4) + 1.4) % 1.4) - 0.2
    const cx = f.x0 + W * u
    const cy = f.y0 + H * c.v
    const L = W * c.l
    const h = H * c.h
    ctx.fillStyle = rgba(light.cloud, c.a)
    ctx.beginPath()
    // A long lens, fuller at its head, its underside flat.
    const n = 24
    for (let j = 0; j <= n; j++) {
      const s = j / n
      const x = cx - L / 2 + L * s
      const y = cy - h * Math.pow(Math.sin(Math.PI * s), 0.8) * (1.25 - 0.5 * s) * (1 + 0.2 * Math.sin(s * 9 + i))
      if (j === 0) ctx.moveTo(x * k, y * k)
      else ctx.lineTo(x * k, y * k)
    }
    for (let j = n; j >= 0; j--) {
      const s = j / n
      ctx.lineTo((cx - L / 2 + L * s) * k, (cy + h * 0.3 * Math.sin(Math.PI * s)) * k)
    }
    ctx.closePath()
    ctx.fill()
  }
}

/** Strata bands between `y0` and `y1` across `x0..x1`, each band's top wandering as bedding does; `tint` hazes them. */
/** How finely bedding is drawn for a frame: every painting of the rock in one frame samples it on the same grid, so they meet exactly. */
export const beddingStep = (f: Frame): number => Math.max(0.2, (f.x1 - f.x0) / 90)

function paintBands(ctx: Ctx2D, k: number, x0: number, x1: number, y0: number, y1: number, step: number, map?: (p: Pt) => Pt, tint?: { c: string; f: number }, lines = 0, grade?: (hex: string) => string): void {
  const first = Math.floor(x0 / step)
  const last = Math.ceil(x1 / step) + 1
  // Each band's top, on the grid; the band itself is the strip down to the next one's top, so no two bands ever
  // paint the same place (two painted over each other would bleed at a clipped edge).
  const topOf = (i: number): [number, number][] => {
    const line: [number, number][] = []
    for (let n = first; n <= last; n++) {
      const x = n * step
      const [px, py] = map ? map([x, i < STRATA.length ? bedding(i, x) : DEEP]) : [x, i < STRATA.length ? bedding(i, x) : DEEP]
      line.push([px * k, py * k])
    }
    return line
  }
  const drawn: [number, number][][] = []
  let below: [number, number][] | null = null
  for (let i = STRATA.length - 1; i >= 1; i--) {
    const top = STRATA[i].y
    const bottom = STRATA[i + 1]?.y ?? DEEP
    if (bottom < y0 - 0.2 || top > y1 + 0.2) {
      below = null
      continue
    }
    const line = topOf(i)
    const under = below ?? topOf(i + 1)
    ctx.beginPath()
    line.forEach(([px, py], j) => (j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)))
    for (let j = under.length - 1; j >= 0; j--) ctx.lineTo(under[j][0], under[j][1])
    ctx.closePath()
    const c = grade ? grade(STRATA[i].c) : STRATA[i].c
    ctx.fillStyle = tint ? mixHex(c, tint.c, tint.f) : c
    ctx.fill()
    drawn.push(line)
    below = line
  }
  // The bedding planes between the bands: a faint line of ink where one stone lies on another.
  if (lines > 0) {
    ctx.strokeStyle = rgba(INK, 0.16)
    ctx.lineWidth = lines
    for (const line of drawn) {
      ctx.beginPath()
      line.forEach(([px, py], j) => (j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)))
      ctx.stroke()
    }
  }
}

/**
 * The far slices, back to front, each in its own perspective about the eye, with the haze pooled in their depths, and
 * graded by the hour: warmed in the gold, and at dusk each one a silhouette against the light, the farther the paler.
 * `shade(i, s, map)` paints on slice `i`'s rock, clipped to it and under its haze (the cloud's shadows);
 * `between(i, s, map)` paints whatever stands just in front of it (the dust off a far rim), in that slice's
 * perspective.
 */
export function paintSlices(
  p: p5,
  k: number,
  f: Frame,
  land: Land,
  light: Light = NOON,
  between?: (i: number, s: number, map: (q: Pt) => Pt) => void,
  shade?: (i: number, s: number, map: (q: Pt) => Pt) => void,
): void {
  const ctx = p.drawingContext as Ctx2D
  const Z = f.y1 - f.y0
  land.slices.forEach((sl, i) => {
    const s = Z / (Z + sl.D)
    const map = ([x, y]: Pt): Pt => [f.cx + (x - f.cx) * s, f.cy + (y - f.cy) * s]
    // How near it is, for its grade: the horizon none, the nearest slice most.
    const near = Math.min(1, 12 / (12 + sl.D)) * 2.2
    const fill = light.far(sl.fill, near)
    // What of the slice's own cells is in the frame: the frame taken back through the perspective.
    const lx0 = f.cx + (f.x0 - f.cx) / s
    const lx1 = f.cx + (f.x1 - f.cx) / s
    const ly0 = f.cy + (f.y0 - f.cy) / s
    const ly1 = f.cy + (f.y1 - f.cy) / s
    path(ctx, sl.pts, k, true, map)
    ctx.fillStyle = fill
    ctx.fill()
    if (sl.haze < 1) {
      ctx.save()
      ctx.clip()
      paintBands(ctx, k, lx0, lx1, ly0, ly1, Math.max(0.2, (lx1 - lx0) / 90), map, { c: fill, f: sl.haze }, 0, (c) => light.far(c, near))
      ctx.restore()
    }
    for (const b of sl.buttes) {
      path(ctx, b, k, true, map)
      ctx.fillStyle = mixHex(fill, ROCKS.canyonShade, 0.12)
      ctx.fill()
    }
    if (sl.line > 0) {
      path(ctx, sl.pts.slice(0, -2), k, false, map)
      ctx.strokeStyle = rgba(INK, sl.line)
      ctx.lineWidth = Math.max(0.6, k * 0.012)
      ctx.lineJoin = 'round'
      ctx.stroke()
      for (const b of sl.buttes) {
        path(ctx, b, k, false, map)
        ctx.stroke()
      }
    }
    if (shade) {
      // One clip for the slice and the buttes on its floor together (all wound the same way, so they add).
      ctx.save()
      ctx.beginPath()
      for (const shape of [sl.pts, ...sl.buttes]) {
        shape.forEach((q, j) => {
          const [x, y] = map(q)
          if (j === 0) ctx.moveTo(x * k, y * k)
          else ctx.lineTo(x * k, y * k)
        })
        ctx.closePath()
      }
      ctx.clip()
      shade(i, s, map)
      ctx.restore()
    }
    // The haze pooled down in its depths: light, so a gradient.
    const topY = f.cy + (4 - f.cy) * s
    const floorY = f.cy + (36 - f.cy) * s
    if (floorY > f.y0 && topY < f.y1) {
      const g = ctx.createLinearGradient(0, topY * k, 0, floorY * k)
      g.addColorStop(0, rgba(light.haze, 0))
      g.addColorStop(1, rgba(light.haze, 0.42))
      ctx.fillStyle = g
      ctx.fillRect((f.x0 - 1) * k, topY * k, (f.x1 - f.x0 + 2) * k, (floorY - topY) * k)
    }
    between?.(i, s, map)
  })
}

/** The near wall: its rock in strata, the shade under each cliff and the light on each ledge, sand where it lies, and one ink line along its edge. */
export function paintWall(p: p5, k: number, f: Frame, land: Land, weight: number, light: Light = NOON): void {
  const ctx = p.drawingContext as Ctx2D
  const body: Pt[] = [...land.edge, [6000, DEEP], [land.edge[0][0], DEEP]]
  path(ctx, body, k)
  ctx.fillStyle = light.lit(STRATA[0].c)
  ctx.fill()
  ctx.save()
  ctx.clip()
  paintBands(ctx, k, f.x0 - 0.5, f.x1 + 0.5, f.y0, f.y1, beddingStep(f), undefined, undefined, Math.max(0.6, weight * 0.4), light.lit)
  // At dusk the far wall across the floor, facing us with the sun behind it, goes into its own shade.
  if (light.dusk > 0.01) {
    const fx = land.ring.x + 6
    if (f.x1 > fx - 3) {
      const g = ctx.createLinearGradient((fx - 3) * k, 0, (fx + 2) * k, 0)
      g.addColorStop(0, rgba(ROCKS.stoneDeep, 0))
      g.addColorStop(1, rgba(mixHex(ROCKS.stoneDeep, '#5E5566', 0.5), 0.34 * light.dusk))
      ctx.fillStyle = g
      ctx.fillRect((fx - 3) * k, (f.y0 - 1) * k, (Math.max(f.x1, fx) - fx + 4) * k, (f.y1 - f.y0 + 2) * k)
    }
  }
  // The shade in under each cliff: a band of it down the face, and a wedge under the lip where it overhangs. Deeper
  // as the sun goes down.
  ctx.fillStyle = rgba(ROCKS.stoneDeep, 0.3 + 0.12 * light.dusk)
  for (const face of land.faces) {
    const top = face[0]
    const foot = face[face.length - 1]
    if (foot[1] < f.y0 - 1 || top[1] > f.y1 + 1 || top[0] < f.x0 - 3 || top[0] > f.x1 + 3) continue
    const w = Math.min(0.42, 0.1 + (foot[1] - top[1]) * 0.05)
    ctx.beginPath()
    face.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * k, y * k) : ctx.lineTo(x * k, y * k)))
    for (let i = face.length - 1; i >= 0; i--) {
      const [x, y] = face[i]
      const u = i / (face.length - 1)
      ctx.lineTo((x - w * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.3)))) * k, (y + (i === 0 ? 0.06 : 0)) * k)
    }
    ctx.closePath()
    ctx.fill()
  }
  // The slab's underside is in its own shade.
  ctx.fillStyle = rgba(ROCKS.stoneDeep, 0.26)
  for (const o of land.overhangs) {
    ctx.beginPath()
    o.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * k, y * k) : ctx.lineTo(x * k, y * k)))
    for (let i = o.length - 1; i >= 0; i--) {
      const [x, y] = o[i]
      ctx.lineTo((x - 0.14) * k, (y - (i === 0 ? 0 : 0.22)) * k)
    }
    ctx.closePath()
    ctx.fill()
  }
  // The light along the top of each ledge, and sand lying on the ones that hold it.
  for (const [a, b] of land.tops) {
    if (b[0] < f.x0 - 1 || a[0] > f.x1 + 1) continue
    ctx.fillStyle = rgba(light.ledgeTop, 0.75 + 0.1 * light.dusk)
    ctx.beginPath()
    ctx.moveTo(a[0] * k, a[1] * k)
    ctx.lineTo(b[0] * k, b[1] * k)
    ctx.lineTo(b[0] * k, (b[1] + 0.07) * k)
    ctx.lineTo(a[0] * k, (a[1] + 0.07) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = light.lit(ROCKS.sand)
  for (const [a, b] of land.sand) {
    if (b[0] < f.x0 - 1 || a[0] > f.x1 + 1) continue
    ctx.beginPath()
    ctx.moveTo(a[0] * k, a[1] * k)
    ctx.lineTo(b[0] * k, b[1] * k)
    ctx.lineTo(b[0] * k, (b[1] + SAND) * k)
    ctx.lineTo(a[0] * k, (a[1] + SAND) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  path(ctx, land.edge, k, false)
  ctx.strokeStyle = INK
  ctx.lineWidth = weight
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()
}

/* ------------------------------------------------------------------ the bagel */

/** The bagel's body: a fat round of crust, the tube of it `BODY_X` across and `BODY_Y` deep from its middle. */
const BODY_X = 0.3
const BODY_Y = 0.28
/** The round through the middle of its tube. */
const CORE = RO - BODY_X
/** How far the upper and lower rounds of its tube sit under the lip: the lower comes out a little under the floor's edge, settled in the sand. */
const UPPER = 0.1
const LOWER = 0.16

/** A risen round: its upper and lower rounds (`rx` across, `ry` deep, at `y0` and `y1`), and its shoulders (`ax` × `ay`). */
type Pill = { x: number; y0: number; y1: number; rx: number; ry: number; ax: number; ay: number }

/** A risen round seen a little from above: the hull of its two rounds, rounded out by its shoulders, and grown by `grow`. */
function pillPath(ctx: Ctx2D, k: number, s: Pill, grow = 0): void {
  const n = 72
  const ax = s.ax + grow
  const ay = s.ay + grow
  // The point of the outline whose outward normal is at angle `a`, on the round at `y`.
  const at = (a: number, y: number): [number, number] => {
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    const d = Math.hypot(s.rx * ux, s.ry * uy)
    const e = Math.hypot(ax * ux, ay * uy)
    // Rolled by hand: a little fuller here and there round it.
    const lump = 1 + 0.009 * Math.sin(3 * a + 1.1) + 0.006 * Math.sin(5 * a + 2.3)
    const px = ((s.rx * s.rx * ux) / d + (ax * ax * ux) / e) * lump
    const py = (s.ry * s.ry * uy) / d + (ay * ay * uy) / e
    return [(s.x + px) * k, (y + py * lump) * k]
  }
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n
    // Down the right side from the upper round to the lower, and up the left.
    const pts = i === 0 ? [at(a, s.y0), at(a, s.y1)] : i === n / 2 ? [at(a, s.y1), at(a, s.y0)] : [at(a, Math.sin(a) > 0 ? s.y1 : s.y0)]
    for (const [px, py] of pts) {
      if (i === 0 && px === pts[0][0] && py === pts[0][1]) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
  }
  ctx.closePath()
}

function ellipsePath(ctx: Ctx2D, k: number, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath()
  ctx.ellipse(x * k, y * k, rx * k, ry * k, 0, 0, Math.PI * 2)
}

/**
 * The bagel's shapes about the middle of its hole's lip `(x, y)`: its body, and its crust's shade turning up to the
 * light, a round inside a round, each a little higher and narrower than the last.
 */
function bagelOf(x: number, y: number) {
  const ry = CORE * Q
  const round = (lift: number, f: number, g: number): Pill => ({ x, y0: y + UPPER - lift, y1: y + UPPER - lift, rx: CORE, ry, ax: BODY_X * f, ay: BODY_Y * g })
  return {
    body: { x, y0: y + UPPER, y1: y + LOWER, rx: CORE, ry, ax: BODY_X, ay: BODY_Y },
    shoulder: round(0.06, 0.9, 0.78),
    top: round(0.12, 0.72, 0.5),
  }
}

/** The seasoning on its crust, worked out once: where on the crust (radius and angle) each one lies, and what it is. */
const SEASONING = Array.from({ length: 170 }, (_, i) => {
  const kind = hash(i, 2, 13)
  // Thickest along the crest, thinning toward the hole and down the sides.
  const across = hash(i, 3, 13) + hash(i, 7, 13) - 1
  return {
    r: Math.max(RI + 0.06, Math.min(CORE + 0.2, CORE - 0.04 + across * 0.36)),
    a: Math.PI * 2 * hash(i, 4, 13),
    turn: Math.PI * hash(i, 5, 13),
    size: 0.8 + 0.4 * hash(i, 6, 13),
    // Mostly sesame; then poppy, dried onion, garlic and salt.
    kind: kind < 0.5 ? 'sesame' : kind < 0.7 ? 'poppy' : kind < 0.82 ? 'onion' : kind < 0.92 ? 'garlic' : 'salt',
  } as const
})

/** The bagel drawn once a frame, to be laid down whole behind the stones and again, in part, over them. */
let held: HTMLCanvasElement | null = null
let heldAt: [number, number] = [0, 0]

/** The device pixel the drawing's point `(x, y)` (in cells) falls on, whole. */
const deviceOf = (ctx: Ctx2D, k: number, x: number, y: number): [number, number] => {
  const m = ctx.getTransform()
  return [Math.round(m.a * x * k + m.c * y * k + m.e), Math.round(m.b * x * k + m.d * y * k + m.f)]
}

/** Clip to a rectangle given in cells, its edges on whole device pixels, so what is painted again inside it meets what was there exactly. */
function clipWhole(ctx: Ctx2D, k: number, x0: number, y0: number, x1: number, y1: number): void {
  const [a, b] = deviceOf(ctx, k, x0, y0)
  const [c, d] = deviceOf(ctx, k, x1, y1)
  const m = ctx.getTransform()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.beginPath()
  ctx.rect(Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b))
  ctx.clip()
  ctx.setTransform(m)
}

/** Lay down the bagel as drawn this frame, on the same device pixels it was drawn for. */
function layHeld(ctx: Ctx2D): void {
  if (!held) return
  const m = ctx.getTransform()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(held, heldAt[0], heldAt[1])
  ctx.setTransform(m)
}

/**
 * The everything bagel, lying in the sand at the bottom of the canyon: Jobu's, come through into a world with nothing
 * in it, in the same black crust and seeds as in her dark. A fat, risen round seen a little from above and settled a
 * little into the sand: its crust turning up from its own shade to the sky's light on its top, a warm streak along
 * its far crest from the low sun behind the far wall, and its everything (sesame, poppy, onion, garlic and salt)
 * over the top. In its hole the far inner wall goes down into the dark. No glow comes up out of it.
 *
 * It is drawn once a frame and laid down whole behind the stones (`front` false). Over them (`front` true), the part
 * of it nearer than its hole's lip is laid down again from the same drawing, and the ground under it is painted
 * again by the wall's own painter, so what drops in goes down behind its near lip and under the sand, and nothing
 * shows where the two meet.
 */
export function paintRing(p: p5, k: number, f: Frame, land: Land, weight: number, front: boolean, light: Light, edgeWeight = weight): void {
  const ctx = p.drawingContext as Ctx2D
  const { x, y } = land.ring
  const floor = land.floor
  if (x + RO + 1.5 < f.x0 || x - RO - 1.5 > f.x1 || y - 1 > f.y1 || floor + 0.5 < f.y0) return
  if (!front) {
    hold(ctx, k, x, y, weight, light)
    paintShadow(ctx, k, x, floor, light)
    ctx.save()
    clipWhole(ctx, k, x - RO - 1, y - 2, x + RO + 1, floor)
    layHeld(ctx)
    ctx.restore()
    return
  }
  // The ground under it, as the wall has it, and its shadow on the sand.
  ctx.save()
  clipWhole(ctx, k, x - RO - 0.3, floor, x + RO + 0.3, floor + 4)
  paintWall(p, k, f, land, edgeWeight, light)
  paintShadow(ctx, k, x, floor, light)
  ctx.restore()
  // Its near part: inside its outline (and the inner half of the line round it), under the lip of its hole and level
  // with it out to either side, down to the floor's edge.
  ctx.save()
  clipWhole(ctx, k, x - RO - 1, y, x + RO + 1, floor)
  pillPath(ctx, k, bagelOf(x, y).body, (weight * 0.3) / k)
  ctx.clip()
  ctx.beginPath()
  ctx.moveTo((x - RO - 1) * k, (y - 1) * k)
  ctx.lineTo((x - RI) * k, (y - 1) * k)
  ctx.lineTo((x - RI) * k, y * k)
  ctx.ellipse(x * k, y * k, RI * k, RI * Q * k, 0, Math.PI, 0, true)
  ctx.lineTo((x + RI) * k, (y - 1) * k)
  ctx.lineTo((x + RO + 1) * k, (y - 1) * k)
  ctx.lineTo((x + RO + 1) * k, (floor + 1) * k)
  ctx.lineTo((x - RO - 1) * k, (floor + 1) * k)
  ctx.closePath()
  ctx.clip()
  layHeld(ctx)
  ctx.restore()
}

/** Draw the bagel for this frame into its own canvas, on the device pixels the stage will lay it on. */
function hold(ctx: Ctx2D, k: number, x: number, y: number, weight: number, light: Light): void {
  if (typeof document === 'undefined') return
  const W = ctx.canvas.width
  const H = ctx.canvas.height
  const [a, b] = deviceOf(ctx, k, x - RO - 0.2, y - 0.8)
  const [c, d] = deviceOf(ctx, k, x + RO + 0.2, y + LIP_OVER + 0.5)
  const x0 = Math.max(0, Math.min(a, c))
  const y0 = Math.max(0, Math.min(b, d))
  const w = Math.min(W, Math.max(a, c)) - x0
  const h = Math.min(H, Math.max(b, d)) - y0
  if (w <= 0 || h <= 0) {
    if (held) held.width = 0
    return
  }
  held ??= document.createElement('canvas')
  if (held.width !== w || held.height !== h) {
    held.width = w
    held.height = h
  }
  heldAt = [x0, y0]
  const g = held.getContext('2d')
  if (!g) return
  const m = ctx.getTransform()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, w, h)
  g.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0)
  paintBagel(g, k, x, y, weight, light)
}

/** Its shadow on the sand at its foot, thrown back from the low sun as the stones' are, flat. */
function paintShadow(ctx: Ctx2D, k: number, x: number, floor: number, light: Light): void {
  const sh = light.shadow
  const stretch = 1 + 0.35 * (sh.stretch - 1)
  const w = RO * 1.02 * stretch
  ctx.fillStyle = rgba(ROCKS.stoneDeep, 0.42 * sh.a)
  ctx.beginPath()
  ctx.ellipse((x - (w - RO) * 0.85 + sh.dx) * k, floor * k, w * k, 0.075 * k, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** The bagel itself, whole. */
function paintBagel(ctx: Ctx2D, k: number, x: number, y: number, weight: number, light: Light): void {
  const shape = bagelOf(x, y)
  const ri = RI * Q
  // The crust: Jobu's black, baked, warmed by the evening; its sides in their own shade, turning up to the sky's light
  // on its top.
  const crust = mixHex(VOID.bagel, ROCKS.canyonShade, 0.16)
  pillPath(ctx, k, shape.body)
  ctx.fillStyle = mixHex(crust, light.sky[2], 0.04)
  ctx.fill()
  pillPath(ctx, k, shape.shoulder)
  ctx.fillStyle = mixHex(mixHex(crust, VOID.bagelRim, 0.5), light.sky[2], 0.12)
  ctx.fill()
  pillPath(ctx, k, shape.top)
  ctx.fillStyle = mixHex(mixHex(crust, VOID.bagelRim, 0.5), light.sky[1], 0.24)
  ctx.fill()
  // The low sun, behind the far wall, along the far crest: a warm streak, as the light lies along it in Jobu's dark.
  ctx.beginPath()
  ctx.ellipse(x * k, (y + UPPER - 0.2) * k, CORE * k, CORE * Q * k, 0, Math.PI * 1.55, Math.PI * 1.88)
  ctx.strokeStyle = rgba(mixHex(VOID.rimLight, light.sun.warm, 0.5), 0.5)
  ctx.lineWidth = 0.03 * k
  ctx.lineCap = 'round'
  ctx.stroke()
  // The hole: its far inner wall going down, darker as it goes, and under it Jobu's dark.
  ctx.save()
  ellipsePath(ctx, k, x, y, RI, ri)
  ctx.clip()
  ctx.fillStyle = mixHex(crust, light.sky[1], 0.1)
  ctx.fill()
  ellipsePath(ctx, k, x, y + 0.05, RI * 0.94, ri * 0.82)
  ctx.fillStyle = mixHex(crust, VOID_THEME.bg, 0.5)
  ctx.fill()
  ellipsePath(ctx, k, x, y + 0.1, RI * 0.84, ri * 0.66)
  ctx.fillStyle = VOID_THEME.bg
  ctx.fill()
  ctx.restore()
  // The everything, on the crust and not in the hole.
  ctx.save()
  pillPath(ctx, k, shape.body)
  ctx.ellipse(x * k, y * k, (RI + 0.02) * k, (ri + 0.02) * k, 0, 0, Math.PI * 2)
  ctx.clip('evenodd')
  paintSeasoning(ctx, k, x, y, light)
  ctx.restore()
  // Its lines: the round of it, and the lip of its hole.
  ctx.lineJoin = 'round'
  ctx.strokeStyle = INK
  ctx.lineWidth = weight
  pillPath(ctx, k, shape.body)
  ctx.stroke()
  ellipsePath(ctx, k, x, y, RI, ri)
  ctx.lineWidth = weight * 0.85
  ctx.stroke()
}

/** The seasoning: each seed or flake lying on the crust, turned its own way, foreshortened as the crust is. */
function paintSeasoning(ctx: Ctx2D, k: number, x: number, y: number, light: Light): void {
  const colors = {
    sesame: light.lit(VOID.sesame),
    poppy: mixHex(VOID.poppy, light.sky[0], 0.3),
    onion: light.lit(VOID.onion),
    garlic: light.lit(VOID.garlic),
    salt: light.lit(VOID.salt),
  }
  const sizes = { sesame: [0.034, 0.015], poppy: [0.016, 0.014], onion: [0.032, 0.02], garlic: [0.022, 0.017], salt: [0.012, 0.011] }
  for (const kind of Object.keys(colors) as (keyof typeof colors)[]) {
    ctx.beginPath()
    for (const s of SEASONING) {
      if (s.kind !== kind) continue
      // On the crust's round: up on its crest, and squashed as the round is.
      const crest = Math.max(0, 1 - ((s.r - CORE) / BODY_X) ** 2)
      const cx = x + s.r * Math.cos(s.a)
      const cy = y + UPPER + s.r * Math.sin(s.a) * Q - (BODY_Y * 0.62 + 0.04) * crest
      const [l, w] = sizes[kind]
      const c = Math.cos(s.turn)
      const sn = Math.sin(s.turn)
      for (let j = 0; j < 8; j++) {
        const u = (Math.PI * 2 * j) / 8
        // A flake of onion is ragged; the rest are round.
        const rough = kind === 'onion' ? 0.75 + 0.5 * hash(j, Math.round(s.turn * 100), 5) : 1
        const lx = l * s.size * rough * Math.cos(u)
        const ly = w * s.size * rough * Math.sin(u)
        const px = (cx + lx * c - ly * sn) * k
        const py = (cy + (lx * sn + ly * c) * 0.55) * k
        if (j === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    }
    ctx.fillStyle = colors[kind]
    ctx.fill()
  }
}

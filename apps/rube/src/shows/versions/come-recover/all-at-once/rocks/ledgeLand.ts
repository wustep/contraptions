import type p5 from 'p5'
import { mixHex, type Pt } from '../../../../../parts'
import { hash, type frame } from '../kit'
import { EYE_WHITE, ROCKS, ROCKS_THEME, VOID, VOID_THEME } from '../worlds'
import { groundAt, LIP, Q, RI, RIM, RO, SLAB, SLAB_BACK, TOP, type Ledge, type Plan } from './ledgePath'

/**
 * The canyon, as it is painted: the sky, the canyon going away into the distance in slices that pale as they go,
 * the near wall the two rocks come down (cut side-on, its strata in bands, the tops of its ledges lit and the faces
 * of its cliffs in shade), and the dark ring in the sand at the bottom.
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

/** The sky: pale at the top, warm with haze down at the eye's height (the frame's middle). */
export function paintSky(p: p5, k: number, f: Frame): void {
  const ctx = p.drawingContext as Ctx2D
  const H = f.y1 - f.y0
  const g = ctx.createLinearGradient(0, (f.cy - H * 0.75) * k, 0, f.cy * k)
  g.addColorStop(0, ROCKS.sky)
  g.addColorStop(0.65, mixHex(ROCKS.sky, HAZE, 0.5))
  g.addColorStop(1, HAZE)
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, (f.y0 - 1) * k, (f.x1 - f.x0 + 2) * k, (f.y1 - f.y0 + 2) * k)
}

/**
 * High cloud: a few long thin streaks, so far off they keep their place in the frame however the camera moves, and
 * drift on the wind, slowly. The one thing in the sky, and the wind's only mark on it.
 */
export function paintCloud(p: p5, k: number, f: Frame, t: number): void {
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
    ctx.fillStyle = rgba(mixHex(ROCKS.sky, EYE_WHITE, 0.7), c.a)
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

function paintBands(ctx: Ctx2D, k: number, x0: number, x1: number, y0: number, y1: number, step: number, map?: (p: Pt) => Pt, tint?: { c: string; f: number }, lines = 0): void {
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
    ctx.fillStyle = tint ? mixHex(STRATA[i].c, tint.c, tint.f) : STRATA[i].c
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

/** The far slices, back to front, each in its own perspective about the eye, with the haze pooled in their depths. */
export function paintSlices(p: p5, k: number, f: Frame, land: Land): void {
  const ctx = p.drawingContext as Ctx2D
  const Z = f.y1 - f.y0
  for (const sl of land.slices) {
    const s = Z / (Z + sl.D)
    const map = ([x, y]: Pt): Pt => [f.cx + (x - f.cx) * s, f.cy + (y - f.cy) * s]
    // What of the slice's own cells is in the frame: the frame taken back through the perspective.
    const lx0 = f.cx + (f.x0 - f.cx) / s
    const lx1 = f.cx + (f.x1 - f.cx) / s
    const ly0 = f.cy + (f.y0 - f.cy) / s
    const ly1 = f.cy + (f.y1 - f.cy) / s
    path(ctx, sl.pts, k, true, map)
    ctx.fillStyle = sl.fill
    ctx.fill()
    if (sl.haze < 1) {
      ctx.save()
      ctx.clip()
      paintBands(ctx, k, lx0, lx1, ly0, ly1, Math.max(0.2, (lx1 - lx0) / 90), map, { c: sl.fill, f: sl.haze })
      ctx.restore()
    }
    for (const b of sl.buttes) {
      path(ctx, b, k, true, map)
      ctx.fillStyle = mixHex(sl.fill, ROCKS.canyonShade, 0.12)
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
    // The haze pooled down in its depths: light, so a gradient.
    const topY = f.cy + (4 - f.cy) * s
    const floorY = f.cy + (36 - f.cy) * s
    if (floorY > f.y0 && topY < f.y1) {
      const g = ctx.createLinearGradient(0, topY * k, 0, floorY * k)
      g.addColorStop(0, rgba(HAZE, 0))
      g.addColorStop(1, rgba(HAZE, 0.42))
      ctx.fillStyle = g
      ctx.fillRect((f.x0 - 1) * k, topY * k, (f.x1 - f.x0 + 2) * k, (floorY - topY) * k)
    }
  }
}

/** The near wall: its rock in strata, the shade under each cliff and the light on each ledge, sand where it lies, and one ink line along its edge. */
export function paintWall(p: p5, k: number, f: Frame, land: Land, weight: number): void {
  const ctx = p.drawingContext as Ctx2D
  const body: Pt[] = [...land.edge, [6000, DEEP], [land.edge[0][0], DEEP]]
  path(ctx, body, k)
  ctx.fillStyle = STRATA[0].c
  ctx.fill()
  ctx.save()
  ctx.clip()
  paintBands(ctx, k, f.x0 - 0.5, f.x1 + 0.5, f.y0, f.y1, beddingStep(f), undefined, undefined, Math.max(0.6, weight * 0.4))
  // The shade in under each cliff: a band of it down the face, and a wedge under the lip where it overhangs.
  ctx.fillStyle = rgba(ROCKS.stoneDeep, 0.3)
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
    ctx.fillStyle = rgba(mixHex(ROCKS.sand, ROCKS.far, 0.4), 0.75)
    ctx.beginPath()
    ctx.moveTo(a[0] * k, a[1] * k)
    ctx.lineTo(b[0] * k, b[1] * k)
    ctx.lineTo(b[0] * k, (b[1] + 0.07) * k)
    ctx.lineTo(a[0] * k, (a[1] + 0.07) * k)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = ROCKS.sand
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

/* ------------------------------------------------------------------ the ring */

/**
 * The dark ring lying in the sand: the everything bagel, come through into a world with nothing in it. Its far half
 * and its hole behind the rocks; its near half (`front`) over them, so what falls in goes down behind its lip and
 * under the sand.
 */
export function paintRing(p: p5, k: number, f: Frame, land: Land, weight: number, front: boolean, t: number, edgeWeight = weight): void {
  const ctx = p.drawingContext as Ctx2D
  const { x, y } = land.ring
  const floor = land.floor
  const qo = RO * Q
  const qi = RI * Q
  const X = (v: number) => v * k
  ctx.lineWidth = weight
  ctx.strokeStyle = INK
  ctx.lineJoin = 'round'
  if (!front) {
    // Its top, all round, and the hole.
    ctx.beginPath()
    ctx.ellipse(X(x), X(y), X(RO), X(qo), 0, 0, Math.PI * 2)
    ctx.fillStyle = VOID.bagel
    ctx.fill()
    ctx.stroke()
    // The sky's light on its far crust.
    ctx.beginPath()
    ctx.ellipse(X(x), X(y), X(RO - 0.06), X(qo - 0.03), 0, Math.PI * 1.08, Math.PI * 1.92)
    ctx.strokeStyle = rgba(VOID.rimLight, 0.28)
    ctx.lineWidth = Math.max(1, weight * 0.9)
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.lineWidth = weight
    ctx.beginPath()
    ctx.ellipse(X(x), X(y), X(RI), X(qi), 0, 0, Math.PI * 2)
    ctx.fillStyle = VOID_THEME.bg
    ctx.fill()
    // The cold light down in the hole, breathing slowly.
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.8)
    const g = ctx.createRadialGradient(X(x), X(y + qi * 0.35), 0, X(x), X(y + qi * 0.35), X(RI * 0.95))
    g.addColorStop(0, rgba(VOID.glow, 0.34 + 0.12 * breathe))
    g.addColorStop(1, rgba(VOID.glow, 0))
    ctx.fillStyle = g
    ctx.fill()
    ctx.stroke()
    seeds(ctx, k, x, y, false)
    return
  }
  // The near half: the ground under it (so what went in is under the sand), then its outer side down to the sand,
  // then the near half of its top, between the outer round and the hole.
  ctx.save()
  ctx.beginPath()
  ctx.rect(X(x - RO - 0.1), X(floor), X(2 * RO + 0.2), X(4))
  ctx.clip()
  paintBands(ctx, k, x - RO - 0.3, x + RO + 0.3, floor, floor + 4, beddingStep(f), undefined, undefined, Math.max(0.6, weight * 0.4))
  const sandFrom = Math.max(x - RO - 0.3, land.sand[land.sand.length - 1][0][0])
  ctx.fillStyle = ROCKS.sand
  ctx.fillRect(X(sandFrom), X(floor), X(x + RO + 0.3 - sandFrom), X(SAND))
  ctx.restore()
  // The floor's own line, which the ground just painted over by half.
  ctx.beginPath()
  ctx.moveTo(X(x - RO - 0.1), X(floor))
  ctx.lineTo(X(x + RO + 0.1), X(floor))
  ctx.lineWidth = edgeWeight
  ctx.lineCap = 'butt'
  ctx.stroke()
  ctx.lineCap = 'round'
  ctx.lineWidth = weight
  ctx.beginPath()
  ctx.moveTo(X(x - RO), X(y))
  ctx.lineTo(X(x - RO), X(y + RIM))
  ctx.ellipse(X(x), X(y + RIM), X(RO), X(qo), 0, Math.PI, 0, true)
  ctx.lineTo(X(x + RO), X(y))
  ctx.ellipse(X(x), X(y), X(RO), X(qo), 0, 0, Math.PI, false)
  ctx.closePath()
  ctx.fillStyle = mixHex(VOID.bagel, VOID.bagelRim, 0.7)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(X(x - RO), X(y))
  ctx.ellipse(X(x), X(y), X(RO), X(qo), 0, Math.PI, 0, true)
  ctx.lineTo(X(x + RI), X(y))
  ctx.ellipse(X(x), X(y), X(RI), X(qi), 0, 0, Math.PI, false)
  ctx.closePath()
  ctx.fillStyle = VOID.bagel
  ctx.fill()
  // Its lines: the near edge of the hole only (the outer round was drawn with the side).
  ctx.beginPath()
  ctx.ellipse(X(x), X(y), X(RI), X(qi), 0, 0, Math.PI, false)
  ctx.stroke()
  seeds(ctx, k, x, y, true)
}

/** Seeds on its crust, the far half's or the near half's: sesame, and a fleck or two of salt. */
function seeds(ctx: Ctx2D, k: number, x: number, y: number, near: boolean): void {
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * 2 * hash(i, 3, 3)
    const isNear = Math.sin(a) > 0
    if (isNear !== near) continue
    const r = RI + (RO - RI) * (0.2 + 0.6 * hash(i, 4, 4))
    const sx = x + Math.cos(a) * r
    const sy = y + Math.sin(a) * r * Q
    ctx.fillStyle = i % 5 === 0 ? VOID.salt : VOID.sesame
    ctx.beginPath()
    ctx.ellipse(sx * k, sy * k, (i % 5 === 0 ? 0.018 : 0.034) * k, 0.014 * k, Math.cos(a) * 0.5 + 0.3 * (hash(i, 5) - 0.5), 0, Math.PI * 2)
    ctx.fill()
  }
}

import type p5 from 'p5'
import { FLOOR, mixHex, type Pt } from '../../../../../parts'
import { frame, hash } from '../kit'
import { drawTurnip } from '../cast'
import { WASTES } from '../worlds'
import { CASTLE, puff, spline } from './castle'
import { wastesNight } from './sky'
import { fogAt, fogFront, ground, hazeAt, MIST, onCastle, POP, ROAR, turnipAt } from './walk-plan'

/**
 * The castle builder's drawings of the wastes round the castle (the hills and the walk share them): the land in
 * layers under the director's sky, the hedge Turnip Head is stuck in, Turnip Head himself, the fog that the castle
 * comes out of, and the smoke Calcifer's chimney leaves on the air. All in world cells (the hills part's frame).
 */

const sm = (u: number) => {
  const v = Math.max(0, Math.min(1, u))
  return v * v * (3 - 2 * v)
}

/** The land's colour at show time T: a warm cast at dusk, then the dark; far things (depth near 0) keep more of the sky's light. */
export function landTone(c: string, T: number, depth: number): string {
  const dusk = sm((T - 133) / 7) * (1 - sm((T - 143) / 6))
  const night = wastesNight(T)
  const warm = mixHex(c, WASTES.dusk, 0.24 * dusk * (1 - 0.3 * depth))
  return mixHex(warm, WASTES.night, night * (0.55 + 0.25 * depth))
}

/* ------------------------------------------------------------------ the land */

/**
 * A far layer. It moves `d` of the way with the camera (0 at the horizon, 1 the near ground) and grows with the
 * frame less than the near ground does, so a close shot keeps its mountains low behind her and a wide one keeps them
 * in scale behind the castle.
 */
interface Layer {
  d: number
  ridge: (u: number) => number
  color: string
}
const CREF = 22

const LAYERS: Layer[] = [
  {
    d: 0.05,
    color: mixHex(WASTES.hillFar, WASTES.sky, 0.55),
    ridge: (u) => -2.8 - 1.7 * Math.pow(Math.max(0, Math.sin(u * 0.045 + 0.7)), 1.5) - 0.9 * Math.sin(u * 0.13 + 2.1) - 0.35 * Math.sin(u * 0.37 + 0.3),
  },
  {
    d: 0.18,
    color: mixHex(WASTES.hillFar, WASTES.sky, 0.22),
    ridge: (u) => -0.6 - 0.8 * Math.sin(u * 0.09 + 1.4) - 0.4 * Math.sin(u * 0.23 + 0.2) - 0.15 * Math.sin(u * 0.71),
  },
  {
    d: 0.4,
    color: mixHex(WASTES.hill, WASTES.hillFar, 0.45),
    ridge: (u) => 2.0 - 0.9 * Math.sin(u * 0.12 + 3.1) - 0.45 * Math.sin(u * 0.31 + 1.7) - 0.12 * Math.sin(u * 0.9 + 0.4),
  },
  {
    // The heather hills she is going up into: rising behind the knoll, falling away again past it.
    d: 0.68,
    color: mixHex(WASTES.hill, WASTES.heather, 0.3),
    ridge: (u) => 1.8 - 2.6 * Math.exp(-((u - 7) * (u - 7)) / 60) - 0.9 * Math.exp(-((u + 14) * (u + 14)) / 90) - 0.25 * Math.sin(u * 0.4 + 0.8),
  },
]

function drawLayer(p: p5, k: number, f: ReturnType<typeof frame>, layer: Layer, T: number, fog: number): void {
  const C = f.y1 - f.y0
  const s = Math.pow(C / CREF, 1 - layer.d)
  const n = 90
  const pts: Pt[] = []
  let mean = 0
  for (let i = 0; i <= n; i++) {
    const x = f.x0 - 1 + ((f.x1 - f.x0 + 2) * i) / n
    const u = (x - f.cx) / s + layer.d * f.cx
    const y = f.cy + s * (layer.ridge(u) - layer.d * f.cy)
    pts.push([x, y])
    mean += y / (n + 1)
  }
  const color = mixHex(landTone(layer.color, T, layer.d), MIST, fog * (1 - layer.d))
  p.noStroke()
  p.fill(color)
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.vertex((f.x1 + 1) * k, (f.y1 + 1) * k)
  p.vertex((f.x0 - 1) * k, (f.y1 + 1) * k)
  p.endShape(p.CLOSE)
  // Mist at its foot, between it and the next: the air between the ranges.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const mist = landTone(WASTES.mist, T, 0.1)
  const c = p.color(mist)
  const rgb = `${Math.round(p.red(c))}, ${Math.round(p.green(c))}, ${Math.round(p.blue(c))}`
  const y0 = mean - 0.4 * s
  const y1 = mean + 2.2 * s
  const g = ctx.createLinearGradient(0, y0 * k, 0, y1 * k)
  g.addColorStop(0, `rgba(${rgb}, 0)`)
  g.addColorStop(1, `rgba(${rgb}, ${0.5 * (1 - wastesNight(T) * 0.6)})`)
  ctx.fillStyle = g
  ctx.fillRect((f.x0 - 1) * k, y0 * k, (f.x1 - f.x0 + 2) * k, (y1 - y0) * k)
}

/** A heather clump, a rock, or nothing, for every stretch of ground (by index). */
function scatter(i: number): { x: number; kind: 'heather' | 'rock' | 'none'; w: number; h: number; c: string } {
  const x = i * 1.3 + hash(i, 1, 3) * 0.9
  const r = hash(i, 2, 3)
  const w = 0.45 + hash(i, 3, 3) * 0.85
  if (r < 0.1) return { x, kind: 'rock', w: w * 0.9, h: w * 0.5, c: WASTES.rock }
  if (r < 0.46) return { x, kind: 'heather', w: w * 1.3, h: 0.12 + hash(i, 4, 3) * 0.2, c: hash(i, 5, 3) < 0.5 ? WASTES.heather : hash(i, 6, 3) < 0.5 ? WASTES.heatherDeep : WASTES.moss }
  return { x, kind: 'none', w, h: 0, c: WASTES.moss }
}

/** Where the one tree on the moor stands (a wind-bent thorn: the walk's milestone), and the standing stone. */
const TREE = 47
const STONE = 29

/** Fill with a colour at an alpha (0..1). */
function fillA(p: p5, hex: string, a: number): void {
  const c = p.color(hex)
  c.setAlpha(Math.max(0, Math.min(1, a)) * 255)
  p.fill(c)
}

/** A band hung under the ground's edge: from `d0(x)` to `d1(x)` below it (cells, y down). */
function band(p: p5, k: number, pts: Pt[], d0: (x: number) => number, d1: (x: number) => number): void {
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, (y + d0(x)) * k)
  for (let i = pts.length - 1; i >= 0; i--) p.vertex(pts[i][0] * k, (pts[i][1] + d1(pts[i][0])) * k)
  p.endShape(p.CLOSE)
}

/**
 * The knoll she climbs: a broad round rise just behind the lane, swelling up from the level ground well before the
 * hedge and cresting a little over the hilltop, so the lane's own short climb reads as a path going up its flank.
 * It sinks back under the near ground on both sides (it is only ever seen above the lane).
 */
const KNOLL = { x: 3.4, w: 3.0, h: 1.3 }
const knollTop = (x: number): number => FLOOR - KNOLL.h * Math.exp(-(((x - KNOLL.x) / KNOLL.w) ** 2))

/** A lumpy round volume (foliage, a cushion of heather): its edge wanders by `seed`, never a clean ellipse. */
function blob(p: p5, k: number, x: number, y: number, rx: number, ry: number, seed: number): void {
  const n = 40
  p.beginShape()
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2
    const r = 1 + 0.06 * Math.sin(3 * th + seed * 1.7) + 0.035 * Math.sin(5 * th + seed * 3.1)
    p.vertex((x + Math.cos(th) * rx * r) * k, (y + Math.sin(th) * ry * r) * k)
  }
  p.endShape(p.CLOSE)
}

/** A heather clump: a mound of uneven cushions, a dark mass under muted tops and a few lit sprigs. No ink. */
function drawHeather(p: p5, k: number, x: number, y: number, w: number, h: number, seed: number, c: string, T: number): void {
  const base = mixHex(c, WASTES.moss, 0.3)
  const deep = landTone(mixHex(mixHex(c, WASTES.heatherDeep, 0.55), WASTES.moss, 0.25), T, 1)
  const body = landTone(base, T, 1)
  const lit = landTone(mixHex(base, WASTES.mist, 0.3), T, 1)
  const sway = 0.012 * Math.sin(T * 0.9 + x * 0.7)
  p.noStroke()
  // Its shadow on the ground.
  fillA(p, landTone(mixHex(WASTES.moss, WASTES.rockDark, 0.45), T, 1), 0.3)
  p.ellipse(x * k, (y + 0.03) * k, w * 1.05 * k, 0.09 * k)
  // The cushions: a count and sizes of their own, the biggest and tallest a little off the middle.
  const n = 5 + Math.floor(hash(seed, 1, 71) * 4)
  const peak = 0.3 + hash(seed, 2, 71) * 0.4
  const lumps: [number, number, number, number][] = []
  for (let j = 0; j < n; j++) {
    const u = (j + 0.15 + hash(seed, j + 3, 71) * 0.7) / n
    const near = Math.exp(-((u - peak) ** 2) / 0.05)
    const rx = w * (0.07 + 0.13 * near + 0.05 * hash(seed, j + 11, 71))
    const ry = rx * (0.7 + 0.25 * hash(seed, j + 27, 71))
    const tall = h * (0.3 + 0.7 * near) * (0.8 + 0.3 * hash(seed, j + 19, 71))
    const lx = x - w / 2 + u * w
    lumps.push([lx + (sway * tall) / h, y + 0.03 - Math.max(tall - ry, ry * 0.4), rx, ry])
  }
  // The mass, from the ground up to each cushion (no gap under them).
  p.fill(deep)
  p.beginShape()
  p.vertex((x - w * 0.5) * k, (y + 0.05) * k)
  for (const [lx, ly] of lumps) p.vertex(lx * k, ly * k)
  p.vertex((x + w * 0.5) * k, (y + 0.05) * k)
  p.endShape(p.CLOSE)
  for (const [j, [lx, ly, rx, ry]] of lumps.entries()) blob(p, k, lx, ly, rx, ry, seed + j)
  // Their tops, lit from the upper left, smaller and off-centre so the dark shows under them.
  p.fill(body)
  for (const [j, [lx, ly, rx, ry]] of lumps.entries()) blob(p, k, lx - rx * 0.1, ly - ry * 0.18, rx * 0.8, ry * 0.72, seed + j + 7)
  p.fill(lit)
  for (const [j, [lx, ly, rx, ry]] of lumps.entries()) {
    if (hash(seed, j + 35, 71) < 0.4) continue
    blob(p, k, lx - rx * 0.3, ly - ry * 0.45, rx * 0.36, ry * 0.26, seed + j + 13)
  }
}

/** The land: far ranges with mist between, then the near ground (heather, moss, rock) along `ground`. */
export function drawLand(p: p5, k: number, weight: number, ink: string, T: number): void {
  const f = frame(p, k)
  const fog = fogAt(T) * 0.6
  p.push()
  p.rectMode(p.CORNER)
  for (const layer of LAYERS) drawLayer(p, k, f, layer, T, fog)
  const C = f.y1 - f.y0
  const step = Math.max(0.05, C / 200)
  const inkT = landTone(ink, T, 1)
  p.noStroke()
  // The knoll behind the lane, where it shows.
  const kx0 = Math.max(f.x0 - 1, KNOLL.x - 3 * KNOLL.w)
  const kx1 = Math.min(f.x1 + 1, KNOLL.x + 2.5 * KNOLL.w)
  if (kx1 > kx0) {
    p.fill(mixHex(landTone(mixHex(WASTES.hill, WASTES.hillFar, 0.4), T, 0.9), MIST, fog * 0.15))
    p.beginShape()
    for (let x = kx0; x <= kx1 + step; x += step) p.vertex(x * k, knollTop(x) * k)
    p.vertex(kx1 * k, (FLOOR + 1) * k)
    p.vertex(kx0 * k, (FLOOR + 1) * k)
    p.endShape(p.CLOSE)
  }
  // The near ground: a filled slope whose top edge is the lane itself. No stroke.
  const pts: Pt[] = []
  for (let x = f.x0 - 1; x <= f.x1 + 1 + step; x += step) pts.push([x, ground(x)])
  p.fill(landTone(WASTES.hill, T, 1))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.vertex((f.x1 + 1) * k, (f.y1 + 2) * k)
  p.vertex((f.x0 - 1) * k, (f.y1 + 2) * k)
  p.endShape(p.CLOSE)
  // Its body deepens toward us in soft steps of moss, their edges wandering, so there is no band to see.
  const deepen = landTone(mixHex(WASTES.hill, WASTES.moss, 0.75), T, 1)
  const bottom = f.y1 + 2
  for (let i = 0; i < 6; i++) {
    fillA(p, deepen, 0.1)
    band(p, k, pts, (x) => 0.3 + i * 0.22 + 0.09 * Math.sin(x * 0.37 + i * 1.7) + 0.05 * Math.sin(x * 1.1 + i), (x) => bottom - ground(x))
  }
  // Drifts of heather in the ground's body: soft uneven patches of overlapping cushions, no ink.
  const drift = landTone(mixHex(WASTES.hill, WASTES.heather, 0.3), T, 1)
  const j0 = Math.floor((f.x0 - 6) / 4.3)
  const j1 = Math.ceil((f.x1 + 6) / 4.3)
  for (let j = j0; j <= j1; j++) {
    if (hash(j, 1, 61) < 0.35) continue
    const cx = j * 4.3 + hash(j, 2, 61) * 2.5
    const w = 1.6 + hash(j, 3, 61) * 2.8
    const d = 0.35 + hash(j, 4, 61) * 1.1
    for (let m = 0; m < 7; m++) {
      const ex = cx + (hash(j, m + 5, 62) - 0.5) * w * 0.8
      const rx = w * (0.1 + 0.16 * hash(j, m + 13, 62))
      const ry = rx * (0.22 + 0.12 * hash(j, m + 21, 62))
      fillA(p, drift, 0.28)
      p.ellipse(ex * k, (ground(ex) + d + (hash(j, m + 29, 62) - 0.5) * 0.16) * k, 2 * rx * k, 2 * ry * k)
    }
  }
  // The lip: the edge darkens softly just under the lane (turf over the bank), thicker in a wide so it still reads.
  const lipW = Math.max(1, Math.sqrt(C / 6))
  const lip = landTone(mixHex(WASTES.moss, WASTES.rockDark, 0.32), T, 1)
  for (const [h, a] of [[0.03, 0.3], [0.07, 0.24], [0.13, 0.18], [0.22, 0.12]] as Pt[]) {
    fillA(p, lip, a)
    band(p, k, pts, () => 0, (x) => h * lipW * (1 + 0.25 * Math.sin(x * 2.3 + h * 40)))
  }
  // The tree and the stone on the moor, behind the edge.
  drawTree(p, k, weight, inkT, T)
  drawStone(p, k, weight, inkT, T)
  // Heather and rocks sitting on the edge.
  const i0 = Math.floor((f.x0 - 2) / 1.3)
  const i1 = Math.ceil((f.x1 + 2) / 1.3)
  for (let i = i0; i <= i1; i++) {
    const q = scatter(i)
    if (q.kind === 'none') continue
    // Keep her lane clear by the hedge and on the hilltop, where the story is.
    if (q.x > -1.8 && q.x < 3.4) continue
    const y = ground(q.x)
    if (q.kind === 'rock') {
      p.stroke(inkT)
      p.strokeWeight(weight * 0.7)
      p.fill(landTone(q.c, T, 1))
      const pts2: Pt[] = []
      for (let j = 0; j < 7; j++) {
        const a = Math.PI + (j / 6) * Math.PI
        const rr = 1 + (hash(i, j, 9) - 0.5) * 0.3
        pts2.push([q.x + Math.cos(a) * q.w * 0.5 * rr, y + 0.12 + Math.sin(a) * q.h * rr])
      }
      p.beginShape()
      for (const [x, yy] of pts2) p.vertex(x * k, yy * k)
      p.endShape(p.CLOSE)
      p.noStroke()
      p.fill(landTone(WASTES.rockDark, T, 1))
      p.beginShape()
      for (const [x, yy] of pts2.slice(3)) p.vertex(x * k, yy * k)
      p.vertex((q.x + q.w * 0.15) * k, (y + 0.1) * k)
      p.endShape(p.CLOSE)
    } else {
      drawHeather(p, k, q.x, y, q.w * 0.85, q.h * 1.2 + 0.1, i, q.c, T)
    }
  }
  p.pop()
}

/** The thorn tree on the moor, bent over by the wind off the hills: a leaning trunk, its crown swept one way. */
function drawTree(p: p5, k: number, weight: number, ink: string, T: number): void {
  const y = ground(TREE)
  const trunk = landTone(WASTES.wood, T, 1)
  const leaf = landTone(mixHex(WASTES.moss, WASTES.heatherDeep, 0.3), T, 1)
  const sway = Math.sin(T * 0.8) * 0.06
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(trunk)
  const bark = spline([[TREE + 0.3, y + 0.1], [TREE + 0.2, y - 1.0], [TREE - 0.3, y - 2.0], [TREE - 1.2, y - 2.7], [TREE - 1.05, y - 2.9], [TREE - 0.05, y - 2.25], [TREE + 0.5, y - 1.1], [TREE + 0.65, y + 0.1]], 4)
  p.beginShape()
  for (const [x, yy] of bark) p.vertex(x * k, yy * k)
  p.endShape(p.CLOSE)
  // The crown: one lumpy mass, long and low, streaming away from the wind.
  p.fill(leaf)
  const cx = TREE - 1.3
  const cy = y - 3.05
  const pts: Pt[] = []
  for (let i = 0; i < 40; i++) {
    const th = (i / 40) * Math.PI * 2
    const lump = 1 + 0.12 * Math.sin(6 * th + 0.7) + 0.05 * Math.sin(11 * th)
    const flat = Math.sin(th) > 0 ? 0.55 : 1
    pts.push([cx + Math.cos(th) * 2.0 * lump + sway * (1 - Math.sin(th)), cy + Math.sin(th) * 0.95 * lump * flat])
  }
  p.beginShape()
  for (const [x, yy] of pts) p.vertex(x * k, yy * k)
  p.endShape(p.CLOSE)
}

/** A standing stone, taller than the castle's foot. */
function drawStone(p: p5, k: number, weight: number, ink: string, T: number): void {
  const y = ground(STONE)
  p.stroke(ink)
  p.strokeWeight(weight)
  p.fill(landTone(WASTES.rock, T, 1))
  p.beginShape()
  for (const [x, yy] of [[STONE - 0.55, y + 0.1], [STONE - 0.45, y - 1.9], [STONE - 0.1, y - 2.35], [STONE + 0.35, y - 2.1], [STONE + 0.5, y + 0.1]] as Pt[]) p.vertex(x * k, yy * k)
  p.endShape(p.CLOSE)
  p.noStroke()
  p.fill(landTone(WASTES.rockDark, T, 1))
  p.beginShape()
  for (const [x, yy] of [[STONE + 0.1, y + 0.1], [STONE + 0.12, y - 2.2], [STONE + 0.35, y - 2.1], [STONE + 0.5, y + 0.1]] as Pt[]) p.vertex(x * k, yy * k)
  p.endShape(p.CLOSE)
}

/* ------------------------------------------------------------------ the hedge */

/** The hedge the stick pokes out of: gorse and heather, on the lane's far side at the foot of the knoll. */
export const HEDGE = { x0: 0.78, x1: 2.2, h: 0.95 }

/** How much the hedge is shaking at T: a shiver on each tug, a thrash as he comes free, settling. */
function shake(T: number): number {
  let v = 0
  for (const [at, s] of [[110.138, 0.5], [110.515, 0.6], [POP, 1.4]] as Pt[]) {
    const e = T - at
    if (e >= 0) v += s * Math.exp(-e / 0.35) * Math.sin(e * 26)
  }
  return v
}

/** The hedge's own ground at world x: it sits on the knoll's foot, its roots a little into the bank. */
const hedgeFoot = (x: number): number => ground(x) + 0.1

/** The hedge's height (0..1 of `HEDGE.h`) at u (-1 at its left end, 1 at its right): a full round dome. */
const dome = (u: number): number => Math.pow(Math.max(0, 1 - u * u), 0.6)

/** Its silhouette at T: a scalloped dome over its own sloping ground, thrashing about its root when shaken. */
function hedgeShape(T: number, back: boolean): Pt[] {
  const { x0, x1, h } = HEDGE
  const cx = (x0 + x1) / 2
  const rx = ((x1 - x0) / 2) * (back ? 0.97 : 1)
  const tall = h * (back ? 0.9 : 0.84)
  const sh = shake(T)
  const top: Pt[] = []
  const n = 44
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n
    const th = Math.PI * (1 + i / n)
    const v = dome(u)
    const lump = 1 + 0.05 * Math.sin(7 * th + (back ? 2.6 : 0.4) + sh * 0.25) + 0.025 * Math.sin(13 * th + 1.1)
    const x = cx + u * rx + sh * 0.05 * v * v
    top.push([x, hedgeFoot(cx + u * rx) - tall * v * lump])
  }
  const pts: Pt[] = [...top]
  for (let i = n; i >= 0; i--) {
    const x = cx - rx + (2 * rx * i) / n
    pts.push([x, hedgeFoot(x) + 0.04])
  }
  return pts
}

/** The foliage volumes over the front: where (u across, v up), how big (of `HEDGE.h`), and whether heather. Top first. */
const CLUMPS: [number, number, number, boolean][] = [
  [-0.12, 0.86, 0.3, false],
  [0.38, 0.8, 0.27, false],
  [0.66, 0.52, 0.2, true],
  [-0.55, 0.56, 0.3, false],
  [0.22, 0.5, 0.4, false],
  [-0.78, 0.2, 0.18, true],
  [-0.3, 0.2, 0.36, false],
  [0.66, 0.2, 0.26, false],
]

/** The hedge: its back (dark foliage behind what is in it) or its front (layered volumes over it). No outline. */
export function drawHedge(p: p5, k: number, _weight: number, _ink: string, T: number, back: boolean): void {
  const pts = hedgeShape(T, back)
  const { x0, x1, h } = HEDGE
  const cx = (x0 + x1) / 2
  const rx = (x1 - x0) / 2
  const sh = shake(T)
  p.push()
  p.noStroke()
  p.fill(back ? mixHex(WASTES.moss, WASTES.heatherDeep, 0.48) : mixHex(WASTES.moss, WASTES.heatherDeep, 0.36))
  p.beginShape()
  for (const [x, y] of pts) p.vertex(x * k, y * k)
  p.endShape(p.CLOSE)
  if (back) {
    p.pop()
    return
  }
  // Each volume: a body, a lit top up and to the left (the afternoon light), and a sprig of light on it.
  for (const [i, [u, v, r, heather]] of CLUMPS.entries()) {
    const rr = r * h
    const lift = v * dome(u) + 0.015 * Math.sin(T * 1.3 + i * 2.1) * v
    const x = cx + u * rx + sh * 0.05 * lift * lift
    const y = hedgeFoot(cx + u * rx) - h * lift + rr * 0.5
    const body = heather ? mixHex(mixHex(WASTES.moss, WASTES.heather, 0.45), WASTES.heatherDeep, 0.15) : mixHex(WASTES.moss, WASTES.hill, 0.1 * hash(i, 2, 23))
    const cap = heather ? mixHex(mixHex(WASTES.moss, WASTES.heather, 0.6), WASTES.mist, 0.18) : mixHex(WASTES.moss, WASTES.hill, 0.5)
    const glint = heather ? mixHex(WASTES.heather, WASTES.mist, 0.35) : mixHex(WASTES.hill, WASTES.mist, 0.25)
    p.fill(body)
    blob(p, k, x, y, 1.15 * rr, 0.9 * rr, i * 3 + 1)
    p.fill(cap)
    blob(p, k, x - rr * 0.22, y - rr * 0.3, 0.78 * rr, 0.52 * rr, i * 3 + 2)
    p.fill(glint)
    blob(p, k, x - rr * 0.42, y - rr * 0.5, 0.3 * rr, 0.17 * rr, i * 3 + 3)
  }
  p.pop()
}

/* ------------------------------------------------------------------ Turnip Head */

/** How thick the fog bank is at world x (0 ahead of it, 1 deep in it). */
function inFog(T: number, x: number): number {
  return fogAt(T) * sm((fogFront(T) - x) / 5)
}

/** Turnip Head at T, where the plan has him, fading into the fog when he goes into it. */
export function drawTurnipAt(p: p5, k: number, weight: number, ink: string, T: number): void {
  const tu = turnipAt(T)
  const light = 1 - 0.85 * inFog(T, tu.foot[0])
  if (light < 0.03) return
  p.push()
  p.translate(tu.foot[0] * k, tu.foot[1] * k)
  drawTurnip(p, k, weight, mixHex(ink, MIST, 1 - light), { t: T, hop: 0.5, height: 0, lean: tu.lean, light })
  p.pop()
}

/* ------------------------------------------------------------------ fog and smoke */

/** The fog: a bank rolling in from the left, soft and deep, a veil over everything it has reached. Never outlined. */
export function drawFog(p: p5, k: number, T: number): void {
  const fog = fogAt(T)
  if (fog < 0.01) return
  const f = frame(p, k)
  const front = fogFront(T)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const c = p.color(MIST)
  const rgb = `${Math.round(p.red(c))}, ${Math.round(p.green(c))}, ${Math.round(p.blue(c))}`
  // The veil: thick behind the front, thin ahead of it.
  const g = ctx.createLinearGradient((front - 7) * k, 0, (front + 4) * k, 0)
  g.addColorStop(0, `rgba(${rgb}, ${0.62 * fog})`)
  g.addColorStop(0.6, `rgba(${rgb}, ${0.34 * fog})`)
  g.addColorStop(1, `rgba(${rgb}, ${0.1 * fog})`)
  ctx.fillStyle = g
  ctx.fillRect(f.x0 * k, f.y0 * k, (f.x1 - f.x0) * k, (f.y1 - f.y0) * k)
  // The bank's billows, drifting slowly the way it comes, low along the ground and up the air.
  for (let i = 0; i < 26; i++) {
    const drift = (T - 115) * (0.35 + hash(i, 1, 41) * 0.3)
    const bx = front + 1.5 - hash(i, 2, 41) * 30 + drift * 0.4
    const lift = hash(i, 3, 41)
    const by = ground(bx) - 0.4 - lift * lift * 16
    const r = 2 + hash(i, 4, 41) * 4 + lift * 3
    const a = 0.3 * fog * sm((front + 2 - bx) / 4)
    puff(p, k, bx, by, r, MIST, a, 0.55)
  }
}

/** The chimney's plume in the air behind the walking castle (left where it was made), and the two bursts of the roar. */
export function drawPlume(p: p5, k: number, T: number): void {
  const haze = hazeAt(T)
  if (haze > 0.97) return
  const night = wastesNight(T)
  const base = mixHex(mixHex(WASTES.steam, WASTES.rock, 0.22), WASTES.night, night * 0.5)
  const col = mixHex(base, MIST, haze)
  const every = 0.17
  const life = 4.6
  const last = Math.floor(T / every) * every
  for (let j = Math.ceil(life / every); j >= 0; j--) {
    const tau = last - j * every
    const age = T - tau
    if (age < 0 || age > life) continue
    const [ex, ey] = onCastle(tau, [CASTLE.chimney[0] - 0.05, CASTLE.chimney[1] + 0.1])
    const x = ex - 0.45 * age + Math.sin(tau * 3.1) * 0.25 * age
    const y = ey - 1.35 * age + 0.07 * age * age
    const r = 0.42 + 0.72 * age
    const a = 0.46 * (1 - age / life) * Math.min(1, age * 5)
    puff(p, k, x, y, r, col, a, 0.9)
  }
  // The roar: two great bursts out of the chimney, billowing up and spreading, soft, dark at their hearts.
  const dark = mixHex(mixHex(WASTES.rockDark, WASTES.steam, 0.25), MIST, haze)
  for (const [n, at] of ROAR.entries()) {
    const age = T - at
    if (age < 0 || age > 3.6) continue
    const [ex, ey] = onCastle(at, CASTLE.chimney)
    for (let i = 0; i < 16; i++) {
      const a0 = hash(i, n, 51) * Math.PI * 2
      const out = 0.5 + hash(i, n + 3, 51) * 1.8
      const grow = 1 - Math.exp(-age / 0.6)
      const rise = (4.2 + 3.0 * hash(i, n + 5, 51)) * grow + 0.6 * age
      const x = ex + Math.cos(a0) * out * grow * 1.8 - 1.3 * age
      const y = ey - 0.4 - rise + Math.sin(a0) * out * grow * 0.9
      const r = 0.8 + 2.7 * grow + 0.7 * age
      const a = 0.24 * Math.exp(-age / 1.2) * (n ? 0.8 : 1)
      puff(p, k, x, y, r, dark, a, 0.85)
    }
  }
}

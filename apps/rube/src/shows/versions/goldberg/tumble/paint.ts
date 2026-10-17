import { DEPTH, FLOOR, FOOT, LIGHT, PLANK, POCKET, ROWS, THICK, VIEW, W, screen, type V3 } from './geo'
import { INK, PAINT, WOOD, lit } from './look'
import { CUBES, STEP, type CubeName, type CubeState, type Dir, type Machine, type PlankState } from './machine'

/**
 * The toy, drawn: an orthographic view from the south-east, everything a box with flat faces, each face lit by how
 * it turns to the one light and outlined in ink. Painted back to front: the tray and the planks lying in it first
 * (they never stand in front of one another), then what stands up off them (the cubes, and a plank being turned
 * over), row by row from the far side and, in a row, from the west.
 */

type G = CanvasRenderingContext2D

/** How a face is lit: the top as painted, the south a little down, the east in shade. */
function shade(n: V3): number {
  const d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]
  return 0.6 + 0.5 * Math.max(0, d)
}

const seen = (n: V3): boolean => n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] > 1e-4

function trace(g: G, pts: V3[]): void {
  g.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = screen(pts[i][0], pts[i][1], pts[i][2])
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  }
  g.closePath()
}

function face(g: G, pts: V3[], fill: string): void {
  trace(g, pts)
  g.fillStyle = fill
  g.fill()
  g.stroke()
}

/* ------------------------------------------------------------------ boxes */

/** A box's corners: bit 1 is x's far side, bit 2 y's, bit 4 z's. */
function corners(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): V3[] {
  const out: V3[] = []
  for (let i = 0; i < 8; i++) out.push([i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0])
  return out
}

/** Its faces, by corner, and their outward normals: top, bottom, north, south, west, east. */
const FACES: { c: [number, number, number, number]; n: V3 }[] = [
  { c: [4, 5, 7, 6], n: [0, 0, 1] },
  { c: [0, 2, 3, 1], n: [0, 0, -1] },
  { c: [0, 1, 5, 4], n: [0, -1, 0] },
  { c: [2, 6, 7, 3], n: [0, 1, 0] },
  { c: [0, 4, 6, 2], n: [-1, 0, 0] },
  { c: [1, 3, 7, 5], n: [1, 0, 0] },
]

/** A box turned however it is: its corners and its face normals, already moved. */
interface Solid {
  pts: V3[]
  normals: V3[]
}

function drawSolid(g: G, s: Solid, color: string): void {
  for (let f = 0; f < 6; f++) {
    const n = s.normals[f]
    if (!seen(n)) continue
    face(g, FACES[f].c.map((i) => s.pts[i]), lit(color, shade(n)))
  }
}

/* ------------------------------------------------------------------ the cubes */

/** How far over a cube is, 0 to 1, `u` through its flop: from rest, gathering, landing with some speed. */
function overStep(u: number): number {
  const v = Math.max(0, Math.min(1, u))
  return 0.5 * v * v * (3 - 2 * v) + 0.5 * v * v
}
/** Struck: it leaves already moving. */
function overStruck(u: number): number {
  const v = Math.max(0, Math.min(1, u))
  return 0.4 * v + 0.6 * v * v
}
/** Into a pocket: over the edge in the first part; it starts down a little before it is over, already moving. */
const OVER = 0.62
const DOWN = 0.5

/** After it lands: the face that slapped down comes up a hair and settles, twice, in a sixth of a second. */
const SETTLE = 0.17
function settle(since: number): number {
  if (since < 0 || since > SETTLE) return 0
  return 0.06 * Math.exp(-since / 0.05) * Math.abs(Math.sin((Math.PI * since) / 0.085))
}

/** Turn `p` by `a` about the edge through `pivot` that a cube tipping toward `dir` turns on. */
function tip(p: V3, pivot: V3, dir: Dir, a: number): V3 {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const [sx, sy] = STEP[dir]
  if (sx) {
    const dx = (p[0] - pivot[0]) * sx
    const dz = p[2] - pivot[2]
    return [pivot[0] + sx * (dx * c + dz * s), p[1], pivot[2] - dx * s + dz * c]
  }
  const dy = (p[1] - pivot[1]) * sy
  const dz = p[2] - pivot[2]
  return [p[0], pivot[1] + sy * (dy * c + dz * s), pivot[2] - dy * s + dz * c]
}

/** A cube in cell `x, y` turned `a` toward `dir` over its leading bottom edge, and dropped `fall`. */
function tipped(x: number, y: number, dir: Dir, a: number, fall: number): Solid {
  const [sx, sy] = STEP[dir]
  const pivot: V3 = [x + (sx > 0 ? 1 : 0), y + (sy > 0 ? 1 : 0), 0]
  const pts = corners(x, y, 0, x + 1, y + 1, 1).map((p) => {
    const q = tip(p, pivot, dir, a)
    return [q[0], q[1], q[2] + fall] as V3
  })
  return { pts, normals: FACES.map((fc) => tip(fc.n, [0, 0, 0], dir, a)) }
}

/** A cube's box at `t`, and where it stands for the painter's order. */
function cubeSolid(m: Machine, c: CubeState, t: number): { solid: Solid; row: number; x: number; sinking: { row: number; at: number } | null } {
  if (!c.flop) {
    const [x, y] = m.cellNow(c.spot, t)
    const z = c.spot.on === 'pocket' ? -DEPTH : 0
    const last = c.spot.on === 'pocket' ? null : m.landed(c.name, t, SETTLE)
    const e = last ? settle(last.since) : 0
    if (last && e > 1e-4) {
      // Turned back by `e` over the edge it came over, from the cell it came from.
      const [sx, sy] = STEP[last.move.dir]
      return { solid: tipped(x - sx, y - sy, last.move.dir, Math.PI / 2 - e, 0), row: y, x, sinking: null }
    }
    return { solid: { pts: corners(x, y, z, x + 1, y + 1, z + 1), normals: FACES.map((f) => f.n) }, row: y, x, sinking: null }
  }
  const f = c.flop.move
  const u = c.flop.u
  const [x, y] = m.cellNow(f.from, t)
  const [sx, sy] = STEP[f.dir]
  const drop = f.to.on === 'pocket'
  const over = drop ? Math.min(1, u / OVER) : u
  const a = (Math.PI / 2) * (f.how === 'struck' ? overStruck(over) : overStep(over))
  const w = drop ? Math.max(0, (u - DOWN) / (1 - DOWN)) : 0
  const fall = -DEPTH * (0.3 * w + 0.7 * w * w)
  const half = u < 0.5 ? 0 : 1
  return {
    solid: tipped(x, y, f.dir, a, fall),
    row: y + sy * half,
    x: x + sx * u,
    sinking: drop && fall < 0 && f.to.on === 'pocket' ? { row: f.to.row, at: m.plankAt(f.to.row, t) } : null,
  }
}

/** Keep to one side of the line through `a` and `b` on the picture: the side `n` points to. */
function clipSide(g: G, a: [number, number], b: [number, number], n: [number, number]): void {
  const far = 200
  g.beginPath()
  g.moveTo(a[0], a[1])
  g.lineTo(b[0], b[1])
  g.lineTo(b[0] + n[0] * far, b[1] + n[1] * far)
  g.lineTo(a[0] + n[0] * far, a[1] + n[1] * far)
  g.closePath()
  g.clip()
}

/** Only what is above the pocket's near rims: the rest of a cube going down into it is behind the plank. */
function clipToPocket(g: G, row: number, at: number): void {
  const x0 = at + POCKET
  const x1 = x0 + 1
  const sw = screen(x0, row + 1, 0)
  const se = screen(x1, row + 1, 0)
  const ne = screen(x1, row, 0)
  g.beginPath()
  g.moveTo(sw[0] - 3, sw[1])
  g.lineTo(sw[0], sw[1])
  g.lineTo(se[0], se[1])
  g.lineTo(ne[0], ne[1])
  g.lineTo(ne[0] + 3, ne[1])
  g.lineTo(ne[0] + 3, ne[1] - 40)
  g.lineTo(sw[0] - 3, sw[1] - 40)
  g.closePath()
  g.clip()
}

/** Only what is above the board's top round a plank's slot: below it, the next row and the east rim stand in front. */
function clipToSlot(g: G, row: number): void {
  // Up the picture from the slot's south edge, and up and west of the east rim's inner edge.
  clipSide(g, screen(-20, row + 1, 0), screen(30, row + 1, 0), up(VIEW_NORTH))
  clipSide(g, screen(W, -20, 0), screen(W, 30, 0), up(VIEW_WEST))
}

/** On the picture, which way world north and world west go from a point. */
const VIEW_NORTH = (() => {
  const a = screen(0, 0, 0)
  const b = screen(0, -1, 0)
  return [b[0] - a[0], b[1] - a[1]] as [number, number]
})()
const VIEW_WEST = (() => {
  const a = screen(0, 0, 0)
  const b = screen(-1, 0, 0)
  return [b[0] - a[0], b[1] - a[1]] as [number, number]
})()
/** Lean a direction upward on the picture so the clip's far side takes in everything above the board too. */
const up = (d: [number, number]): [number, number] => [d[0], d[1] - 0.5]

/* ------------------------------------------------------------------ the tray and planks */

function quadX(x: number, y0: number, y1: number, z0: number, z1: number): V3[] {
  return [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]]
}
function quadY(y: number, x0: number, x1: number, z0: number, z1: number): V3[] {
  return [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]]
}
function quadZ(z: number, x0: number, y0: number, x1: number, y1: number): V3[] {
  return [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]
}

const TOP = shade([0, 0, 1])
const SOUTH = shade([0, 1, 0])
const EAST = shade([1, 0, 0])

function drawTrayBack(g: G): void {
  face(g, quadZ(0, -1, -1, W + 1, 0), lit(WOOD.rim, TOP))
  face(g, quadZ(0, -1, 0, 0, ROWS), lit(WOOD.rim, TOP))
  face(g, quadZ(FLOOR, 0, 0, W, ROWS), lit(WOOD.floor, TOP))
  face(g, quadY(0, 0, W, FLOOR, 0), lit(WOOD.rim, SOUTH * 0.8))
  face(g, quadX(0, 0, ROWS, FLOOR, 0), lit(WOOD.rim, EAST * 0.85))
}

function drawTrayFront(g: G): void {
  face(g, quadZ(0, W, 0, W + 1, ROWS), lit(WOOD.rim, TOP))
  face(g, quadZ(0, -1, ROWS, W + 1, ROWS + 1), lit(WOOD.rim, TOP))
  face(g, quadY(ROWS + 1, -1, W + 1, FOOT, 0), lit(WOOD.rim, SOUTH))
  face(g, quadX(W + 1, -1, ROWS + 1, FOOT, 0), lit(WOOD.rim, EAST))
}

/** A pocket seen from above: lined in its cube's paint, its floor and the two far walls a little in shade. */
function drawPocket(g: G, x0: number, row: number, home: CubeName): void {
  const paint = PAINT[home]
  g.save()
  trace(g, quadZ(0, x0, row, x0 + 1, row + 1))
  g.clip()
  face(g, quadZ(-DEPTH, x0, row, x0 + 1, row + 1), lit(paint, TOP * 0.8))
  face(g, quadX(x0, row, row + 1, -DEPTH, 0), lit(paint, EAST * 0.92))
  face(g, quadY(row, x0, x0 + 1, -DEPTH, 0), lit(paint, SOUTH * 0.92))
  g.restore()
  trace(g, quadZ(0, x0, row, x0 + 1, row + 1))
  g.stroke()
}

function drawPlank(g: G, p: PlankState, home: CubeName): void {
  const wood = WOOD.plank[p.row % 2]
  const x0 = p.at
  const x1 = x0 + PLANK
  const y0 = p.row
  const y1 = y0 + 1
  face(g, quadY(y1, x0, x1, -THICK, 0), lit(wood, SOUTH))
  face(g, quadX(x1, y0, y1, -THICK, 0), lit(wood, EAST))
  face(g, quadZ(0, x0, y0, x1, y1), lit(wood, TOP))
  if (!p.up) return
  const px = x0 + POCKET
  if (p.seated) face(g, quadZ(0, px, y0, px + 1, y1), lit(PAINT[p.seated], TOP))
  else drawPocket(g, px, y0, home)
}

/** A plank lifted out of its row, turned over and set back: up, over toward the viewer, down. */
function flipSolid(p: PlankState): { solid: Solid; pocketFace: number } {
  const u = p.flip!.u
  const ease = (v: number) => {
    const w = Math.max(0, Math.min(1, v))
    return w * w * (3 - 2 * w)
  }
  const h = p.flip!.lift * (u < 0.5 ? ease(u / 0.3) : ease((1 - u) / 0.3))
  const a = Math.PI * ease((u - 0.3) / 0.4)
  const cy = p.row + 0.5
  const cz = -THICK / 2
  const c = Math.cos(a)
  const s = Math.sin(a)
  const turn = (q: V3): V3 => [q[0], cy + (q[1] - cy) * c - (q[2] - cz) * s, cz + (q[1] - cy) * s + (q[2] - cz) * c + h]
  const pts = corners(p.at, p.row, -THICK, p.at + PLANK, p.row + 1, 0).map(turn)
  const normals = FACES.map((f) => {
    const [x, y, z] = f.n
    return [x, y * c - z * s, y * s + z * c] as V3
  })
  return { solid: { pts, normals }, pocketFace: p.flip!.wasUp ? 0 : 1 }
}

function drawFlipping(g: G, p: PlankState, home: CubeName): void {
  g.save()
  clipToSlot(g, p.row)
  drawFlipped(g, p, home)
  g.restore()
}

function drawFlipped(g: G, p: PlankState, home: CubeName): void {
  const { solid, pocketFace } = flipSolid(p)
  const wood = WOOD.plank[p.row % 2]
  drawSolid(g, solid, wood)
  const n = solid.normals[pocketFace]
  if (!seen(n)) return
  // The pocket on its face: the opening, dark, between the corners of its cell along the face.
  const [a, b, c, d] = FACES[pocketFace].c.map((i) => solid.pts[i])
  const along = (u: number, v: number): V3 => {
    // Bilinear across the face: u along x (a→b), v across (a→d).
    const p0: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
    const p1: V3 = [d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u, d[2] + (c[2] - d[2]) * u]
    return [p0[0] + (p1[0] - p0[0]) * v, p0[1] + (p1[1] - p0[1]) * v, p0[2] + (p1[2] - p0[2]) * v]
  }
  // Top's corners run x then y; the bottom's y then x.
  const u0 = POCKET / PLANK
  const u1 = (POCKET + 1) / PLANK
  const quad = pocketFace === 0 ? [along(u0, 0), along(u1, 0), along(u1, 1), along(u0, 1)] : [along(0, u0), along(0, u1), along(1, u1), along(1, u0)]
  face(g, quad, lit(PAINT[home], 0.7))
}

/* ------------------------------------------------------------------ the frame */

export function paintToy(g: G, m: Machine, t: number, line: number): void {
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.lineWidth = line
  g.strokeStyle = INK
  drawTrayBack(g)
  const planks = Array.from({ length: ROWS }, (_, r) => m.plank(r, t))
  for (const p of planks) if (!p.flip) drawPlank(g, p, m.setup.homes[p.row])
  drawTrayFront(g)

  // What stands up off the board, far rows first, and in a row from the west.
  const items: { row: number; x: number; draw: () => void }[] = []
  for (const p of planks) {
    if (p.flip) items.push({ row: p.row, x: p.at + PLANK / 2, draw: () => drawFlipping(g, p, m.setup.homes[p.row]) })
  }
  for (const name of CUBES) {
    const c = m.cubeAt(name, t)
    if (!c.flop && c.spot.on === 'pocket') continue
    const s = cubeSolid(m, c, t)
    items.push({
      row: s.row,
      x: s.x,
      draw: () => {
        if (s.sinking) {
          g.save()
          clipToPocket(g, s.sinking.row, s.sinking.at)
          drawSolid(g, s.solid, PAINT[name])
          g.restore()
        } else drawSolid(g, s.solid, PAINT[name])
      },
    })
  }
  items.sort((a, b) => a.row - b.row || a.x - b.x)
  for (const it of items) it.draw()
  g.restore()
}

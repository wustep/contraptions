import type { Pt } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { level } from '../music'
import { ellipse, fillPoly, line, mix, rgba, type Pen } from '../home/pen'
import { litY, tone, wind, type Tone } from './dawn'
import { DECK, drawChoughs, plumes, type Plume } from './far'
import { along, bands, billow, cut, ROWS, rowOutline, SAMPLES, sunOn } from './paint'
import {
  CAT_LOOK,
  CAT_LOOK_AWAY,
  catAt,
  CAT_STEPS_IN,
  CAT_STEPS_OUT,
  FAR_Y,
  GUST,
  LANDINGS,
  LEDGE_Y,
  R,
  SEAN_AT,
  SIFTS,
  SIFT_X,
  STEPS,
  TICKS,
} from './himalaya-plan'

/**
 * The Himalayas, drawn on the machine's plane: the face he climbs, its snow wind-rippled and its rock in bands, its
 * steps capped with snow; the ledge at the top with Sean's tripod and long lens on it; across the valley, the far
 * spur and the mountain behind it, and on the spur, if you look, the snow leopard; and the sea of cloud filling the
 * valley between them, the spur standing out of it. Beyond the valley is `far.ts`.
 *
 * All of it is in the hour's light (`dawn.ts`): blue-grey through the climb, and lit from the right once the sun is
 * up, the light coming down the face from its summit ridge to the ledge, and on down past it.
 */

export const C = {
  lens: '#3E423E',
  lensBand: '#D8D6CC',
  tripod: '#2F3338',
  strap: '#6B5A3E',
}

type Frame = { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }
type C2 = CanvasRenderingContext2D

/** Fill or stroke paths made in cells. */
function inCells(pen: Pen, fn: (c: C2) => void): void {
  const { c, k } = pen
  c.save()
  c.scale(k, k)
  fn(c)
  c.restore()
}

/** Where the light is on the machine's plane: the colour of snow at height `y` (its own colour in shadow). */
function litSnow(tn: Tone, t: number, y: number, shadow: string): string {
  const ly = litY(t, 'world')
  return mix(shadow, tn.faceLit, smooth(ly - y, -0.15, 0.35) * 0.92)
}

/* ------------------------------------------------------------------ the mountain he climbs */

/** The snow the climb starts in: its edge drifted in long low waves, level where he waits at the foot. */
const FOOT: Pt[] = [
  ...Array.from({ length: 58 }, (_, i): Pt => {
    const x = -22 + i * 0.35
    return [x, R + 0.02 - 0.08 * (0.5 + 0.5 * Math.sin(x * 1.7 + 0.6)) * (0.6 + 0.4 * Math.sin(x * 0.53)) * smooth(-x, 1.6, 2.6)]
  }),
  [-1.6, R - 0.02],
  [-0.2, R],
  [0.5, R + 0.06],
  [1.6, R + 0.45],
  [3.2, R + 1.3],
  [5.5, R + 2.4],
  [5.5, 9],
  [-22, 9],
]

/** The boulder over the foot, up to his left: the gust takes the snow off its top. */
const BOULDER: Pt = [-1.6, -1.75]

/** The face's outline: off to the left and down, its right flank down into the cloud, the ledge's lip, the summit ridge. */
const FACE: Pt[] = [
  [-22, 9],
  [11.6, 9],
  [11.3, 5.5],
  [11.45, 3],
  [11.15, 0.4],
  [11.25, -1.4],
  [10.95, -3.2],
  [11.05, -4.6],
  [10.7, -5.9],
  [10.75, -6.7],
  [10.42, -7.4],
  [10.3, -8.0],
  [10.0, -8.4],
  [9.75, LEDGE_Y + 0.05],
  [9.9, LEDGE_Y],
  [9.95, LEDGE_Y - 0.08],
  [9.35, LEDGE_Y - 0.6],
  [9.1, LEDGE_Y - 1.4],
  [8.5, -11.25],
  [7.6, -11.6],
  [6.3, -12.2],
  [5.1, -12.9],
  [4.2, -13.3],
  [3.0, -12.6],
  [1.3, -12.8],
  [-0.6, -11.8],
  [-3.2, -12.3],
  [-6, -10.8],
  [-9.5, -11.4],
  [-13, -10.2],
  [-17, -10.9],
  [-22, -9.6],
]
/** The summit ridge's high points the spindrift streams off: a few, the summit first. */
const CRESTS: Pt[] = [[4.2, -13.3], [1.3, -12.8], [-3.2, -12.3], [8.5, -11.25]]

/** Each polygon's bounding box, for a quick no. */
const boxes = new WeakMap<readonly Pt[], [number, number, number, number]>()
/** Whether a point is inside a polygon. */
function inside(poly: readonly Pt[], x: number, y: number): boolean {
  let b = boxes.get(poly)
  if (!b) {
    b = [Math.min(...poly.map((p) => p[0])), Math.min(...poly.map((p) => p[1])), Math.max(...poly.map((p) => p[0])), Math.max(...poly.map((p) => p[1]))]
    boxes.set(poly, b)
  }
  if (x < b[0] || y < b[1] || x > b[2] || y > b[3]) return false
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/** A snowfield: its outline, and its rock in bands (made once); the stones and ripples on it are made as they come into view. */
interface Field {
  spec: FieldSpec
  outline: Path2D
  /** The rock in bands: each band, its snow-lit top, the snow's lip along it, and the blue drift-shadow under it. */
  rock: Path2D
  tops: Path2D
  lips: Path2D
  under: Path2D
}

interface FieldSpec {
  outline: Pt[]
  x0: number
  y0: number
  x1: number
  y1: number
  seed: number
  /** How the strata tilt: y per x. */
  tilt: number
  rows: number
  /** How thick the stones and ripples lie, 1 for the face. */
  density: number
}

function field(fs: FieldSpec): Field {
  const outline = new Path2D()
  fs.outline.forEach(([x, y], i) => (i ? outline.lineTo(x, y) : outline.moveTo(x, y)))
  outline.closePath()
  const rock = new Path2D()
  const tops = new Path2D()
  const lips = new Path2D()
  const under = new Path2D()
  const poly = (path: Path2D, pts: Pt[]) => {
    pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)))
    path.closePath()
  }
  const h = (a: number, b: number, c = 0) => hash(a * 31 + c, b, fs.seed)
  const W = fs.x1 - fs.x0
  const H = fs.y1 - fs.y0
  // The rock showing through the snow in bands, tilted with the strata, ragged along their tops where the snow lies.
  const cols = Math.ceil(W / 3.9)
  for (let j = 0; j < fs.rows; j++) {
    const y0 = fs.y0 + (j + h(j, 41) * 0.4) * (H / fs.rows)
    for (let q = 0; q < cols; q++) {
      if (h(j, q, 46) < 0.18) continue
      const xa = fs.x0 + q * 3.9 + h(j, q, 42) * 2.6 + (j % 2) * 1.7 - 1
      const len = 0.7 + h(j, q, 43) ** 1.5 * 3.2
      if (!inside(fs.outline, xa + len / 2, y0 + (xa + len / 2 - fs.x0) * fs.tilt)) continue
      const th = 0.12 + h(j, q, 44) * 0.32
      const top: Pt[] = []
      const low: Pt[] = []
      const n = Math.max(4, Math.round(len / 0.25))
      for (let i = 0; i <= n; i++) {
        const u = i / n
        const x = xa + len * u
        const tilt = (x - fs.x0) * fs.tilt
        const taper = Math.sin(Math.PI * u) ** 0.6
        top.push([x, y0 + tilt - th * taper * (0.55 + 0.45 * h(j, q, i + 100))])
        low.push([x, y0 + tilt + th * 0.25 * taper])
      }
      poly(rock, [...top, ...[...low].reverse()])
      poly(tops, [...top, ...top.map(([x, y], i): Pt => [x, y + th * 0.3 * Math.sin((Math.PI * i) / n) ** 0.6]).reverse()])
      top.forEach(([x, y], i) => (i ? lips.lineTo(x, y) : lips.moveTo(x, y)))
      // The drift's shadow in the lee of the band.
      const sh = 0.12 + 0.16 * h(j, q, 45)
      poly(under, [...low, ...[...low].reverse().map(([x, y], i): Pt => [x - 0.2, y + sh * Math.sin((Math.PI * (n - i)) / n) ** 0.8])])
    }
  }
  return { spec: fs, outline, rock, tops, lips, under }
}

let faceGeo: Field | null = null
const faceOf = (): Field => (faceGeo ??= field({ outline: FACE, x0: -21, y0: -13.4, x1: 11.6, y1: 8, seed: 41, tilt: -0.09, rows: 24, density: 1 }))

/**
 * The stones and the wind's ripples on a snowfield, made for what is in view: on a grid that is finer the closer the
 * camera is (each finer grid fading in as it comes), so the snow has grain at every distance and only what is seen is
 * drawn. Each grid square's ripples and stone are its own, by hash, so they stay put.
 */
const LEVELS = [2, 1, 0.5, 0.25, 0.125]
/** Grid squares to a tile: the grain is made a tile at a time, the first time the tile is seen, and kept. */
const TILE = 8
const tiles = new Map<string, { ripples: Path2D; stones: Path2D }>()
function tileOf(fs: FieldSpec, li: number, g: number, tx: number, ty: number): { ripples: Path2D; stones: Path2D } {
  const key = `${fs.seed}:${li}:${tx}:${ty}`
  let tile = tiles.get(key)
  if (tile) return tile
  tile = { ripples: new Path2D(), stones: new Path2D() }
  for (let gx = tx * TILE; gx < (tx + 1) * TILE; gx++) {
    for (let gy = ty * TILE; gy < (ty + 1) * TILE; gy++) {
      if (!inside(fs.outline, (gx + 0.5) * g, (gy + 0.5) * g)) continue
      const h = (i: number) => hash(gx * 7 + li, gy * 13 + i, fs.seed)
      for (let i = 0; i < 2; i++) {
        const x = (gx + h(i * 3)) * g
        const y = (gy + h(i * 3 + 1)) * g
        const len = g * 0.75 * (0.5 + h(i * 3 + 2))
        const bow = (h(i + 9) - 0.5) * 0.12 * len
        tile.ripples.moveTo(x, y)
        tile.ripples.lineTo(x + len / 2, y + (fs.tilt * len) / 2 + bow)
        tile.ripples.lineTo(x + len, y + fs.tilt * len)
      }
      if (li < 4 && h(20) < 0.35) {
        const x = (gx + h(21)) * g
        const y = (gy + h(22)) * g
        const r = g * 0.07 * (0.4 + h(23))
        tile.stones.moveTo(x - r, y + r * 0.3)
        tile.stones.lineTo(x - r * 0.3, y - r * 0.5)
        tile.stones.lineTo(x + r * 0.6, y - r * 0.35)
        tile.stones.lineTo(x + r, y + r * 0.3)
        tile.stones.closePath()
      }
    }
  }
  tiles.set(key, tile)
  return tile
}

function grain(c: C2, fs: FieldSpec, f: Frame, tn: Tone, rock: string): void {
  const x0 = Math.max(fs.x0, f.x0 - 0.5)
  const x1 = Math.min(fs.x1, f.x1 + 0.5)
  const y0 = Math.max(fs.y0, f.y0 - 0.5)
  const y1 = Math.min(fs.y1, f.y1 + 0.5)
  if (x1 <= x0 || y1 <= y0) return
  // How far apart a level's grid squares are on the screen: each level is drawn while that is between 18 and 28
  // pixels or more, fading in over that, so the grain on the snow is about as fine wherever the camera is.
  const kpx = c.getTransform().d
  c.lineWidth = 1 / c.getTransform().a
  c.lineCap = 'butt'
  LEVELS.forEach((lv, li) => {
    const g = lv / Math.max(0.35, fs.density)
    const a = smooth(g * kpx, 18, 28)
    if (a < 0.05 || g * kpx > 260) return
    const ripples = new Path2D()
    const stones = new Path2D()
    const span = g * TILE
    for (let tx = Math.floor(x0 / span); tx <= Math.floor(x1 / span); tx++) {
      for (let ty = Math.floor(y0 / span); ty <= Math.floor(y1 / span); ty++) {
        const tile = tileOf(fs, li, g, tx, ty)
        ripples.addPath(tile.ripples)
        stones.addPath(tile.stones)
      }
    }
    // Hairlines: one pixel wide, which the canvas draws fastest.
    c.strokeStyle = rgba(tn.faceShade, 0.5 * a)
    c.stroke(ripples)
    c.fillStyle = rgba(rock, 0.8 * a)
    c.fill(stones)
  })
}

/**
 * What is on a snowfield, in the hour's light: the wind's ripples and the stones, the drift-shadows, the rock in bands
 * (a value lighter than the steps' slabs, so the climb reads against them), and the snow's lip along each band, which
 * catches the sun where it has reached.
 */
function paintField(c: C2, g: Field, tn: Tone, t: number, f: Frame, rock: string): void {
  const ly = litY(t, 'world')
  grain(c, g.spec, f, tn, rock)
  c.fillStyle = rgba(tn.faceShade, 0.4)
  c.fill(g.under)
  c.fillStyle = rock
  c.fill(g.rock)
  c.fillStyle = rgba(mix(rock, tn.faceRockTop, 0.4), 0.85)
  c.fill(g.tops)
  c.strokeStyle = rgba(tn.faceRockTop, 0.75)
  c.lineWidth = 0.025
  c.stroke(g.lips)
  if (ly > -14) {
    const rg = c.createLinearGradient(8.1, ly - 0.6, 7.95, ly + 0.4)
    rg.addColorStop(0, rgba(tn.faceLit, 0.9))
    rg.addColorStop(1, rgba(tn.faceLit, 0))
    c.strokeStyle = rg
    c.lineWidth = 0.03
    c.stroke(g.lips)
  }
}

export function drawFace(pen: Pen, f: Frame, t: number): void {
  const tn = tone(t)
  const g = faceOf()
  const ly = litY(t, 'world')
  inCells(pen, (c) => {
    // Snow over all of it, bluer low down, and the sun on it down to where the light has reached.
    bands(c, f.x0 - 1, f.x1 + 1, -14, 10, (y) => mix(tn.faceSnow, tn.faceLow, Math.max(0, Math.min(1, (y + 13.5) / 22.5))), g.outline)
    if (ly > -14.5) sunOn(c, FACE, ly, mix(tn.faceSnow, tn.faceLit, 0.95))
    paintField(c, g, tn, t, f, mix(tn.faceRock, tn.faceShade, 0.42))
    // The snow the climb starts in, along the foot.
    if (f.y1 > R - 0.5) {
      const foot = new Path2D()
      FOOT.forEach(([x, y], i) => (i ? foot.lineTo(x, y) : foot.moveTo(x, y)))
      foot.closePath()
      const top = mix(tn.faceSnow, '#FFFFFF', 0.25)
      bands(c, f.x0 - 1, f.x1 + 1, R - 0.1, 9, (y) => mix(top, tn.faceLow, Math.max(0, Math.min(1, (y - R) / 3))), foot)
    }
    // Spindrift streaming off the summit ridge, downwind.
    const w = wind(t)
    const list: Plume[] = CRESTS.map(([x, y], i) => ({ x: x - 0.05, y: y + 0.06, len: (1.0 + 2.2 * w) * (1 - i * 0.06), thick: (0.12 + 0.12 * w) * (1 - i * 0.05), seed: i * 5 + 3 }))
    plumes(c, list, mix('#FFFFFF', tn.faceLit, smooth(ly, -13.6, -12.5) * 0.6), 0.6, t)
  })
  // The boulder over the foot, whose snow the gust tears off.
  fillPoly(pen, [[BOULDER[0] - 0.8, BOULDER[1] + 0.05], [BOULDER[0], BOULDER[1] - 0.25], [BOULDER[0] + 0.65, BOULDER[1] - 0.05], [BOULDER[0] + 0.8, BOULDER[1] + 0.4], [BOULDER[0] - 0.9, BOULDER[1] + 0.45]], tn.faceRock)
  fillPoly(pen, [[BOULDER[0] - 0.84, BOULDER[1] + 0.06], [BOULDER[0], BOULDER[1] - 0.3], [BOULDER[0] + 0.68, BOULDER[1] - 0.06], [BOULDER[0] + 0.1, BOULDER[1] - 0.12], [BOULDER[0] - 0.5, BOULDER[1] + 0.12]], mix(tn.faceSnow, '#FFFFFF', 0.4))
  // The band of rock over the ledge, its lip of snow, from which it sifts down by them.
  const by = LEDGE_Y - 1.2
  fillPoly(pen, [[SIFT_X - 2.6, by - 0.2], [SIFT_X - 1.2, by - 0.36], [SIFT_X - 0.1, by - 0.42], [SIFT_X + 0.12, by - 0.08], [SIFT_X + 0.05, by + 0.02], [SIFT_X - 0.8, by + 0.1], [SIFT_X - 2.5, by + 0.15]], tn.faceRock)
  fillPoly(pen, [[SIFT_X - 2.65, by - 0.2], [SIFT_X - 1.2, by - 0.4], [SIFT_X - 0.1, by - 0.47], [SIFT_X + 0.16, by - 0.08], [SIFT_X + 0.02, by - 0.15], [SIFT_X - 0.15, by - 0.32], [SIFT_X - 1.2, by - 0.28], [SIFT_X - 2.5, by - 0.12]], litSnow(tn, t, by - 0.4, mix(tn.faceSnow, '#FFFFFF', 0.45)))
}

/** The steps: a slab of rock under every landing, capped with snow; the ledge at the top. */
export function drawSteps(pen: Pen, f: Frame, t: number): void {
  const tn = tone(t)
  // The trail: a shelf worn along each leg of the switchback, the steps on it, its ends tapering into the snow.
  const ext = (a: Pt, b: Pt, u: number): Pt => [a[0] + (a[0] - b[0]) * u, a[1] + (a[1] - b[1]) * u]
  for (const [a, b] of [[0, 9], [9, 17], [17, STEPS.length]] as [number, number][]) {
    const leg = STEPS.slice(a, b).map((s) => s.p).sort((p, q) => p[0] - q[0])
    const n = leg.length
    const top = [ext(leg[0], leg[1], 0.8), ...leg, ext(leg[n - 1], leg[n - 2], 0.8)].map(([x, y]): Pt => [x, y + R + 0.1])
    const low = [ext(leg[0], leg[1], 0.3), ...leg, ext(leg[n - 1], leg[n - 2], 0.3)].map(([x, y]): Pt => [x, y + R + 0.42]).reverse()
    fillPoly(pen, [...top, ...low], rgba(tn.faceRock, 0.22))
  }
  const cap = mix(tn.faceSnow, '#FFFFFF', 0.5)
  for (const s of STEPS) {
    const [x, y] = s.p
    if (x < f.x0 - 1 || x > f.x1 + 1 || y < f.y0 - 1 || y > f.y1 + 1) continue
    const top = y + R
    const h = (i: number) => hash(Math.round(x * 100), Math.round(y * 100), i)
    fillPoly(pen, [[x - 0.3, top], [x + 0.3, top], [x + 0.26 + h(1) * 0.05, top + 0.2], [x + 0.05, top + 0.3 + h(2) * 0.08], [x - 0.24, top + 0.22]], tn.faceRock)
    fillPoly(pen, [[x - 0.32, top + 0.02], [x - 0.2, top - 0.035], [x + 0.18, top - 0.04], [x + 0.32, top + 0.02], [x + 0.25, top + 0.06], [x - 0.26, top + 0.06]], litSnow(tn, t, top, cap))
  }
  // The ledge: a long shelf out over the valley.
  const y = LEDGE_Y
  const a = STEPS[STEPS.length - 1].p[0] - 0.4
  fillPoly(pen, [[a, y], [9.95, y], [9.9, y + 0.12], [9.4, y + 0.32], [8.2, y + 0.45], [a + 0.2, y + 0.4]], tn.faceRock)
  fillPoly(pen, [[a - 0.05, y + 0.02], [a + 0.3, y - 0.05], [9.0, y - 0.05], [9.98, y + 0.01], [9.8, y + 0.07], [a + 0.1, y + 0.07]], litSnow(tn, t, y, cap))
  // The ledge's underside: a few ribs of rock, the snow's lip over them.
  line(pen, [[a + 0.5, y + 0.2], [a + 0.9, y + 0.38]], rgba(tn.ink, 0.35), 0.02)
  line(pen, [[8.6, y + 0.12], [8.9, y + 0.36]], rgba(tn.ink, 0.35), 0.02)
  line(pen, [[9.3, y + 0.1], [9.5, y + 0.26]], rgba(tn.ink, 0.35), 0.02)
  drawRope(pen, f, t, tn)
}

/** The old fixed rope up the last pitch: pitons in the rock above every fourth step, clear of his leaps, and one over the ledge. */
const PITONS: Pt[] = [...[18, 22, 26, 30].map((k): Pt => [STEPS[k].p[0] - 0.12, STEPS[k].p[1] - 0.68]), [STEPS[STEPS.length - 1].p[0] - 0.3, LEDGE_Y - 0.62]]

/**
 * An old fixed rope, weathered dark, up the last pitch to the ledge from some earlier party: clipped to a piton above
 * every fourth step, sagging between them and stirring in the wind, its loose end lying in the snow below the first.
 */
function drawRope(pen: Pen, f: Frame, t: number, tn: Tone): void {
  if (f.x1 < PITONS[0][0] - 1 || f.x0 > PITONS[PITONS.length - 1][0] + 1 || f.y1 < PITONS[PITONS.length - 1][1] - 1 || f.y0 > PITONS[0][1] + 1) return
  const { c, k } = pen
  const w = wind(t)
  const rope = mix(tn.ink, C.strap, 0.4)
  c.save()
  c.beginPath()
  const [x0, y0] = PITONS[0]
  c.moveTo((x0 - 0.35) * k, (y0 + 0.42) * k)
  c.quadraticCurveTo((x0 - 0.05) * k, (y0 + 0.3) * k, x0 * k, y0 * k)
  for (let i = 1; i < PITONS.length; i++) {
    const [ax, ay] = PITONS[i - 1]
    const [bx, by] = PITONS[i]
    const sag = 0.1 + 0.03 * w * Math.sin(t * 1.9 + i * 1.3)
    c.quadraticCurveTo(((ax + bx) / 2 - 0.02 * w) * k, ((ay + by) / 2 + sag) * k, bx * k, by * k)
  }
  c.strokeStyle = rope
  c.lineWidth = 0.022 * k
  c.lineCap = 'round'
  c.stroke()
  c.restore()
  // The pitons: a blade in the rock, an eye, the rope through it.
  for (const [px, py] of PITONS) {
    fillPoly(pen, [[px - 0.07, py - 0.015], [px + 0.02, py - 0.03], [px + 0.02, py + 0.015]], tn.faceRock)
    ellipse(pen, px + 0.03, py, 0.028, 0.028, null, mix(tn.ink, '#8B8F92', 0.4), 0.012)
  }
}

/* ------------------------------------------------------------------ across the valley */

/** The far spur's top, and the two rocks the cat comes from behind and goes behind. */
const ROCK_A: Pt[] = [[11.75, FAR_Y + 0.2], [11.95, FAR_Y - 0.42], [12.35, FAR_Y - 0.55], [12.62, FAR_Y - 0.3], [12.7, FAR_Y + 0.2]]
const ROCK_B: Pt[] = [[14.7, FAR_Y + 0.2], [14.85, FAR_Y - 0.36], [15.3, FAR_Y - 0.58], [15.75, FAR_Y - 0.4], [16.0, FAR_Y + 0.2]]

const FY = FAR_Y + 0.1
/**
 * The mountain behind the spur: the cat is against it, pale on pale, not against the sky. Low enough for the sun to
 * come up over the range beyond it. It rises from behind the spur's top, so no edge of it shows below.
 */
const BEHIND: Pt[] = [[12.0, FY - 0.05], [12.4, FY - 0.66], [12.9, FY - 1.05], [13.5, FY - 0.95], [14.2, FY - 1.15], [14.9, FY - 1.55], [15.5, FY - 1.35], [16.3, FY - 1.95], [17.1, FY - 1.6], [17.9, FY - 1.1], [19.0, FY - 0.6], [20.4, FY + 0.2], [22.0, FY + 1.4], [24.0, FY + 3.0], [26.5, 4], [12.6, 4], [12.6, FY + 0.3]]
/**
 * The spur: its top where the cat walks, its flank stepping down in broken rock into the cloud, and its ridge going
 * down to the right into the cloud.
 */
const SPUR: Pt[] = [[11.2, 2], [11.5, -3.6], [11.66, -7.4], [11.6, -7.75], [11.8, -8.1], [11.72, -8.42], [11.9, -8.72], [11.85, -8.98], [12.0, FY - 0.05], [13.1, FY - 0.1], [14.4, FY], [16.2, FY - 0.25], [16.9, FY + 0.1], [18.0, FY + 0.55], [19.4, FY + 1.3], [20.8, FY + 2.3], [22.6, FY + 3.8], [24.6, FY + 5.6], [26.5, 2]]

let farGeo: { behind: Field; spur: Field; snowTop: Path2D } | null = null
function farOf() {
  if (farGeo) return farGeo
  const snowTop = new Path2D()
  ;([[11.95, FY + 0.02], [12.0, FY - 0.06], [13.1, FY - 0.12], [14.4, FY - 0.03], [16.2, FY - 0.28], [16.9, FY + 0.08], [18.0, FY + 0.52], [17.9, FY + 0.62], [16.8, FY + 0.2], [16.2, FY - 0.15], [14.4, FY + 0.06], [12.6, FY + 0.05]] as Pt[]).forEach(([x, y], i) => (i ? snowTop.lineTo(x, y) : snowTop.moveTo(x, y)))
  snowTop.closePath()
  farGeo = {
    behind: field({ outline: BEHIND, x0: 11.6, y0: FY - 2, x1: 26.5, y1: FY - 1.2, seed: 43, tilt: 0.03, rows: 2, density: 0.3 }),
    spur: field({ outline: SPUR, x0: 11.2, y0: FY + 0.4, x1: 26.5, y1: 2, seed: 47, tilt: 0.05, rows: 13, density: 0.9 }),
    snowTop,
  }
  return farGeo
}

/**
 * What of the frame the mountains on the machine's plane leave open, sampled on a grid: the rows of it the sky and the
 * ranges beyond can be seen through (a clip, in cells, a little generous), or null where the face and the spur fill
 * the frame; and whether anything but the face is in view at all. Nothing is drawn where it cannot be seen.
 */
export function openings(f: Frame): { beyond: Path2D | null; far: boolean } {
  const cols = 32
  const rows = 18
  const dx = (f.x1 - f.x0) / cols
  const dy = (f.y1 - f.y0) / rows
  const lo: number[] = []
  const hi: number[] = []
  let far = false
  for (let j = 0; j <= rows; j++) {
    const y = f.y0 + j * dy
    lo.push(Infinity)
    hi.push(-Infinity)
    for (let i = 0; i <= cols; i++) {
      const x = f.x0 + i * dx
      if (inside(FACE, x, y)) continue
      far = true
      if (inside(SPUR, x, y) || inside(BEHIND, x, y)) continue
      lo[j] = Math.min(lo[j], x)
      hi[j] = Math.max(hi[j], x)
    }
  }
  // One rectangle round all of it: a plain rectangle is the one clip the canvas does for nothing.
  let a = Infinity
  let b = -Infinity
  let top = Infinity
  let bottom = -Infinity
  for (let j = 0; j <= rows; j++) {
    if (lo[j] > hi[j]) continue
    a = Math.min(a, lo[j])
    b = Math.max(b, hi[j])
    top = Math.min(top, f.y0 + (j - 1) * dy)
    bottom = Math.max(bottom, f.y0 + (j + 1) * dy)
  }
  // It runs on down to the sea of cloud, which covers everything below its top that the face does not.
  let path: Path2D | null = null
  const foot = Math.min(Math.max(bottom, f.y1 + 0.1), DECK + 0.1)
  if (a <= b && foot > top) {
    path = new Path2D()
    path.rect(a - dx, top, b - a + 2 * dx, foot - top)
  }
  return { beyond: path, far }
}

export function drawFarSide(pen: Pen, f: Frame, t: number): void {
  const tn = tone(t)
  const g = farOf()
  const ly = litY(t, 'world')
  const lit = (y: number, shadow: string) => mix(shadow, tn.faceLit, smooth(ly - y, -0.2, 0.4) * 0.85)
  // Only what stands out of the sea of cloud is drawn.
  const low = Math.min(f.y1, DECK + 0.3)
  const above = { ...f, y1: low }
  inCells(pen, (c) => {
    // The mountain behind the spur, a little paler for the air between.
    const hi = mix(tn.faceSnow, tn.haze, 0.3)
    const lo = mix(tn.faceLow, tn.haze, 0.3)
    bands(c, Math.max(11.5, f.x0 - 1), f.x1 + 1, FY - 2.2, low, (y) => mix(hi, lo, Math.max(0, Math.min(1, (y - FY + 2) / 4))), g.behind.outline)
    if (ly > FY - 2.5) sunOn(c, cut(BEHIND, [0, 1], DECK + 0.3), ly, mix(hi, tn.faceLit, 0.85))
    paintField(c, g.behind, tn, t, above, mix(mix(tn.faceRock, tn.faceShade, 0.6), tn.haze, 0.3))
    // The spur, its flank in its own shadow going down into the cloud, the sun coming down it.
    const flank: [number, string][] = [[0, mix(tn.faceSnow, tn.faceShade, 0.25)], [0.12, mix(tn.faceSnow, tn.faceShade, 0.5)], [1, mix(tn.faceShade, tn.cloud, 0.45)]]
    bands(c, Math.max(11, f.x0 - 1), f.x1 + 1, FY - 0.5, low, (y) => along(flank, (y - FY + 0.5) / 9.5), g.spur.outline)
    if (ly > FY - 0.5) sunOn(c, cut(SPUR, [0, 1], DECK + 0.3), ly, mix(flank[0][1], tn.faceLit, 0.85))
    paintField(c, g.spur, tn, t, above, mix(tn.faceRock, tn.faceShade, 0.3))
    // Snow along its top, where the cat will walk.
    c.fillStyle = lit(FY - 0.1, mix(tn.faceSnow, '#FFFFFF', 0.35))
    c.fill(g.snowTop)
  })
}

export function drawFarRocks(pen: Pen, t: number): void {
  const tn = tone(t)
  const rock = mix(tn.faceRock, tn.faceShade, 0.45)
  const cap = litSnow(tn, t, FAR_Y - 0.5, mix(tn.faceSnow, '#FFFFFF', 0.35))
  fillPoly(pen, ROCK_A, rock)
  fillPoly(pen, [[11.93, FAR_Y - 0.38], [12.35, FAR_Y - 0.57], [12.6, FAR_Y - 0.32], [12.3, FAR_Y - 0.42]], cap)
  fillPoly(pen, ROCK_B, rock)
  fillPoly(pen, [[14.84, FAR_Y - 0.34], [15.3, FAR_Y - 0.6], [15.75, FAR_Y - 0.41], [15.3, FAR_Y - 0.48]], cap)
}

/**
 * The sea of cloud filling the valley, on the machine's plane, its far edge a little under the ledge: the spur and the
 * mountain behind it stand out of it, and the face goes down into it. Seen from above, it is a surface of billows
 * coming toward the lens, larger and further apart the nearer they are, each lit on its top and blue under, drifting
 * with the wind (the near ones faster). It is lit when the light is down to it. Lesser summits stand out of it here
 * and there, catching the sun on their tops and throwing long shadows across it, shorter as the sun climbs. The pair
 * of choughs wheel over it.
 */
/** The summits standing out of the cloud: x, how far into the sea (below its far edge), width, height. */
const ISLANDS: [number, number, number, number][] = [[22.6, 0.25, 2.6, 0.9], [30.2, 0.62, 3.4, 1.1], [16.6, 1.1, 2.6, 0.85], [26.0, 1.3, 4.4, 1.5], [13.3, 2.5, 3.6, 1.2]]
export function drawDeck(pen: Pen, f: Frame, t: number): void {
  if (f.y1 < DECK - 0.4 || f.x1 < 9.5) return
  const tn = tone(t)
  const sea = smooth(litY(t, 'low'), -8.4, -7.4)
  const top = mix(tn.cloud, tn.lit, 0.6 * sea)
  const shade = mix(top, tn.cloudUnder, 0.85)
  const floor = mix(top, shade, 0.3)
  // Only what the face's flank leaves open is drawn: it runs from about (10, -8.4) down to (11.1, -2.5).
  const flank = (y: number) => 10.0 + Math.max(0, Math.min(5.9, y + 8.4)) * 0.18
  const lo = Math.max(9.7, f.x0) - 0.6
  const hi = f.x1 + 1
  const ly = litY(t, 'world')
  const reach = 2 + 9 * (1 - smooth(t, 182, 191.4)) ** 1.5
  const island = (c: C2, [x, d, w, h]: [number, number, number, number], n: number) => {
    if (x + w < lo || x - w - reach * h > hi) return
    const base = DECK + d + 0.12
    const hz = Math.max(0.1, 0.42 - 0.12 * d)
    const q = (i: number) => hash(n, i, 91)
    const sx = x + (q(1) - 0.4) * 0.2 * w
    const pts: Pt[] = [
      [x - w / 2, base],
      [x - w * 0.36, base - h * (0.3 + 0.1 * q(2))],
      [x - w * 0.22, base - h * 0.5],
      [x - w * 0.1, base - h * (0.66 + 0.1 * q(3))],
      [sx, base - h],
      [sx + w * 0.1, base - h * 0.82],
      [x + w * 0.18, base - h * (0.7 + 0.1 * q(4))],
      [x + w * 0.3, base - h * 0.45],
      [x + w / 2, base],
    ]
    // Its long shadow over the sea, away from the sun.
    if (sea > 0.02) {
      const L = reach * h
      c.fillStyle = rgba(shade, 0.7 * sea)
      c.beginPath()
      c.moveTo(x + w * 0.3, base - 0.1)
      c.lineTo(x - w / 2 - L, base - 0.1 + 0.05 * h)
      c.lineTo(x - w / 2 - L * 0.9, base - 0.1 + 0.16 * h)
      c.lineTo(x - w * 0.2, base)
      c.closePath()
      c.fill()
    }
    // Snow in the shade on the flank away from the sun, then the flank toward it, lit as the light comes down to it.
    c.fillStyle = mix(mix(tn.faceShade, tn.faceSnow, 0.25), tn.haze, hz)
    c.beginPath()
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)))
    c.closePath()
    c.fill()
    const on = smooth(ly - (base - h), -0.2, 0.5)
    c.fillStyle = mix(mix(tn.faceSnow, tn.faceLit, 0.9 * on), tn.haze, hz)
    c.beginPath()
    c.moveTo(sx, base - h)
    c.lineTo(sx + w * 0.1, base - h * 0.82)
    c.lineTo(x + w * 0.18, base - h * (0.7 + 0.1 * q(4)))
    c.lineTo(x + w * 0.3, base - h * 0.45)
    c.lineTo(x + w / 2, base)
    c.lineTo(sx + w * 0.06, base)
    c.lineTo(sx - w * 0.03, base - h * 0.5)
    c.closePath()
    c.fill()
  }
  inCells(pen, (c) => {
    bands(c, lo, hi, DECK, f.y1 + 0.5, (y) => mix(top, floor, smooth(y, DECK, DECK + 0.8)), undefined, 8)
    let next = 0
    for (let j = 0; j < 22; j++) {
      const d = 0.12 * j + 0.035 * j * j
      // The summits further off than this row, before it, so its billows lie over their feet.
      for (; next < ISLANDS.length && ISLANDS[next][1] < d; next++) island(c, ISLANDS[next], next)
      const sc = 0.7 + 0.35 * d
      if (DECK + d - 0.5 * sc > f.y1 + 0.2) break
      const step = 0.8 * sc
      const go = t * 0.2 * (1 + 0.6 * d)
      const shift = go % step
      const base = Math.floor(go / step)
      const from = Math.max(lo, flank(DECK + d) - 0.2) - step
      const i0 = Math.floor((from - shift) / step)
      const i1 = Math.ceil((hi - shift) / step) + 1
      // The row traced as one outline: its billows sampled across, the tops and the undersides of their union.
      const dx = step * 0.12
      const x0 = i0 * step + shift - step
      const n = Math.min(SAMPLES, Math.ceil(((i1 - i0 + 2) * step) / dx) + 1)
      const [lt, lb, st, sb] = ROWS
      lt.fill(Infinity, 0, n)
      lb.fill(-Infinity, 0, n)
      st.fill(Infinity, 0, n)
      sb.fill(-Infinity, 0, n)
      for (let i = i0; i <= i1; i++) {
        const id = i - base
        const h = (k: number) => hash(id, k, 70 + j)
        const bx = i * step + shift + (h(61) - 0.5) * 0.4 * step
        const rx = step * (0.5 + 0.45 * h(62))
        // Flattened, seen from above; the far rows heaped up here and there against what stands out of them.
        const ry = rx * (0.2 + 0.1 * h(63)) * (j < 2 ? 1 + 2.4 * h(65) ** 3 : 1)
        // Each row rolls a little, so the sea is not ruled.
        const by = DECK + d + (h(64) - 0.5) * 0.1 * sc + (j ? 0.12 * sc * Math.sin(((bx - go) * 0.55) / sc + j * 1.7) : 0)
        billow(lt, lb, x0, dx, n, bx, by, rx * 0.94, ry * 0.88)
        if (j) billow(st, sb, x0, dx, n, bx - rx * 0.06, by + ry * 0.75, rx * 0.96, ry * 0.85)
      }
      // The row's undersides in shadow, then its tops in the light over them; nearer rows over farther ones. The
      // shadow is only drawn where the tops will not cover it.
      if (j) {
        for (let k = 0; k < n; k++) if (lt[k] !== Infinity && st[k] !== Infinity) st[k] = Math.max(st[k], Math.min(lb[k] - 0.01, sb[k]))
        c.fillStyle = shade
        c.fill(rowOutline(st, sb, x0, dx, n))
      }
      c.fillStyle = top
      c.fill(rowOutline(lt, lb, x0, dx, n))
    }
    for (; next < ISLANDS.length; next++) island(c, ISLANDS[next], next)
  })
  drawChoughs(pen.c, pen.k, t)
}

/** The snow leopard: pale on pale, long and low, its tail as long again. Barely there, in whatever light there is. */
export function drawCat(pen: Pen, t: number): void {
  const at = catAt(t)
  if (!at) return
  const tn = tone(t)
  const back = litSnow(tn, t, FAR_Y - 0.4, mix(tn.faceSnow, tn.haze, 0.25))
  const coat = mix(back, '#E9E3D6', 0.55)
  const shade = mix(mix(tn.faceShade, tn.haze, 0.2), '#C9C2B4', 0.45)
  const spot = mix(tn.faceRock, '#9E998F', 0.55)
  const { c } = pen
  c.save()
  const s = 0.62
  const x = at.x
  const ground = FAR_Y + 0.1
  const a = 0.92
  const bob = at.walking ? Math.abs(Math.sin(at.stride * Math.PI)) * 0.012 : 0
  const body = ground - 0.2 * s - bob
  // Head: toward them (left) while it looks; otherwise along its way.
  const look = t >= CAT_LOOK && t < CAT_LOOK_AWAY ? Math.min(1, (t - CAT_LOOK) / 0.5) * (1 - Math.max(0, Math.min(1, (t - (CAT_LOOK_AWAY - 0.5)) / 0.5))) : 0
  const leg = (hx: number, phase: number) => {
    const sw = at.walking ? Math.sin((at.stride + phase) * Math.PI * 2) * 0.07 * s : 0
    line(pen, [[x + hx * s, body + 0.04 * s], [x + hx * s + sw, ground]], rgba(shade, a), 0.05 * s)
  }
  leg(-0.32, 0.5)
  leg(0.3, 0)
  // The tail: thick, long, low, curling up at its end.
  const sway = Math.sin(t * 1.1) * 0.04
  const tail: Pt[] = []
  for (let i = 0; i <= 14; i++) {
    const u = i / 14
    tail.push([x - 0.42 * s - u * 0.75 * s, body + 0.02 * s + Math.sin(u * Math.PI * 0.9) * 0.1 * s - u * u * u * 0.32 * s + sway * u])
  }
  line(pen, tail, rgba(shade, a), 0.11 * s)
  line(pen, tail, rgba(coat, a), 0.075 * s)
  // The body, long and low.
  ellipse(pen, x, body, 0.46 * s, 0.15 * s, rgba(coat, a))
  ellipse(pen, x, body + 0.05 * s, 0.4 * s, 0.08 * s, rgba(shade, a * 0.6))
  leg(-0.22, 0)
  leg(0.38, 0.5)
  // Its rosettes: faint.
  for (let i = 0; i < 9; i++) {
    const ux = (hash(i, 71) - 0.5) * 0.7 * s
    const uy = (hash(i, 72) - 0.5) * 0.16 * s
    ellipse(pen, x + ux, body + uy, 0.03 * s, 0.022 * s, rgba(spot, 0.55 * a))
  }
  // The head, small, on a short neck; turned to them while it looks.
  const hx = x + 0.5 * s - look * 0.05 * s
  const hy = body - 0.1 * s
  ellipse(pen, hx, hy, 0.12 * s, 0.1 * s, rgba(coat, a))
  fillPoly(pen, [[hx - 0.07 * s, hy - 0.07 * s], [hx - 0.04 * s, hy - 0.15 * s], [hx - 0.01 * s, hy - 0.08 * s]], rgba(shade, a))
  fillPoly(pen, [[hx + 0.02 * s, hy - 0.08 * s], [hx + 0.05 * s, hy - 0.15 * s], [hx + 0.08 * s, hy - 0.06 * s]], rgba(shade, a))
  // Its eye: the one thing on it that is not pale, and only a little; on the side it looks.
  ellipse(pen, hx + (look > 0.5 ? -0.05 : 0.06) * s, hy - 0.01 * s, 0.016 * s, 0.012 * s, rgba('#6A6F66', 0.8 * a))
  // Its feet in the snow: a little puff on each step.
  for (const st of [...CAT_STEPS_IN, ...CAT_STEPS_OUT]) {
    const g = t - st
    if (g < 0 || g > 0.5) continue
    ellipse(pen, x + 0.2 * s, ground + 0.01, 0.05 + g * 0.1, 0.012, rgba('#FFFFFF', 0.7 * (1 - g / 0.5)))
  }
  c.restore()
}

/* ------------------------------------------------------------------ Sean's tripod */

/** The tripod's shadow on the ledge, once the sun is on it: long and to the left, shortening and swinging as it climbs. */
export function drawTripodShadow(pen: Pen, t: number): void {
  const tn = tone(t)
  const on = smooth(litY(t, 'world') - LEDGE_Y, -0.1, 0.5)
  if (on <= 0.01) return
  const [sx] = SEAN_AT
  const y = LEDGE_Y - 0.01
  const len = 1.6 - 0.9 * smooth(t, 183, 191.4)
  const lift = 0.05 + 0.04 * smooth(t, 183, 191.4)
  const head: Pt = [sx + 0.36 - len * 0.55, y - lift * 0.4]
  const feet: Pt[] = [[sx + 0.12, y], [sx + 0.66, y], [sx + 0.4, y + 0.02]]
  const col = rgba(mix(tn.faceShade, tn.ink, 0.25), 0.45 * on)
  for (const ft of feet) line(pen, [ft, head], col, 0.025)
  // The lens's shadow: a long bar off the head.
  fillPoly(pen, [[head[0] - 0.05, head[1] - 0.012], [head[0] - len * 0.6, head[1] - 0.01], [head[0] - len * 0.62, head[1] + 0.035], [head[0] - 0.04, head[1] + 0.03]], col)
}

/** The tripod, the camera on it, and the long lens out over the valley. Sean's eye is at its left end. */
export function drawTripod(pen: Pen, t: number): void {
  const [sx, sy0] = SEAN_AT
  // The eyepiece is at his eye's height, a little under his middle: he is bent to it.
  const sy = sy0 + 0.07
  const head: Pt = [sx + 0.36, sy - 0.04]
  const feet: Pt[] = [[sx + 0.12, LEDGE_Y], [sx + 0.66, LEDGE_Y], [sx + 0.4, LEDGE_Y + 0.02]]
  for (const ft of feet) line(pen, [head, ft], C.tripod, 0.03)
  // The strap under the lens, swung by the wind; its buckle knocks the near leg on the ticks.
  const swing = strapSwing(t)
  const top: Pt = [sx + 0.62, sy - 0.12]
  const low: Pt = [sx + 0.56 + swing * 0.12, sy - 0.0 - Math.abs(swing) * 0.02]
  line(pen, [top, [(top[0] + low[0]) / 2 + 0.03 + swing * 0.02, (top[1] + low[1]) / 2 + 0.03], low], C.strap, 0.022)
  ellipse(pen, low[0], low[1], 0.022, 0.018, '#8B8F92')
  // On each tick the buckle knocks the leg and shakes a few grains of rime off it, which fall to the ledge.
  for (const k of TICKS) {
    const g = t - k
    if (g < 0 || g > 0.45) continue
    for (let j = 0; j < 4; j++) {
      const vx = (j - 1.5) * 0.2
      const vy = -0.5 - 0.3 * hash(j, 5, 93)
      ellipse(pen, low[0] + vx * g, Math.min(LEDGE_Y - 0.02, low[1] + vy * g + 5 * g * g), 0.012, 0.012, rgba('#FFFFFF', 0.9 * (1 - g / 0.45)))
    }
  }
  // The camera body, and the lens: long, with a pale band, its hood toward the cat.
  fillPoly(pen, [[sx + 0.16, sy - 0.24], [sx + 0.42, sy - 0.24], [sx + 0.42, sy - 0.04], [sx + 0.16, sy - 0.04]], C.tripod)
  ellipse(pen, sx + 0.15, sy - 0.12, 0.025, 0.04, '#1E2124')
  fillPoly(pen, [[sx + 0.4, sy - 0.2], [sx + 1.1, sy - 0.22], [sx + 1.1, sy - 0.04], [sx + 0.4, sy - 0.06]], C.lens)
  fillPoly(pen, [[sx + 0.66, sy - 0.21], [sx + 0.76, sy - 0.21], [sx + 0.76, sy - 0.05], [sx + 0.66, sy - 0.05]], C.lensBand)
  fillPoly(pen, [[sx + 1.1, sy - 0.24], [sx + 1.3, sy - 0.25], [sx + 1.3, sy - 0.01], [sx + 1.1, sy - 0.02]], mix(C.lens, '#000000', 0.2))
  // The light along the top of the lens: cold at first, warm once the sun is up.
  const tn = tone(t)
  line(pen, [[sx + 0.42, sy - 0.2], [sx + 1.1, sy - 0.215]], rgba(mix('#FFFFFF', tn.faceLit, tn.light), 0.18 + 0.3 * tn.light), 0.012)
}

/** The strap's swing, -1..1: the wind lifts it away, and it falls back against the leg on each tick. */
function strapSwing(t: number): number {
  let last = -Infinity
  let next = Infinity
  for (const k of TICKS) {
    if (k <= t) last = k
    else if (k < next) next = k
  }
  const w = 0.25 + 0.5 * level(t)
  if (next < Infinity && next - t < 0.5) {
    // Lifted, and falling to the leg: it meets it on the tick.
    const u = (next - t) / 0.5
    return -w * Math.sin(u * Math.PI * 0.5)
  }
  // After a knock it rebounds a little and then rides the wind, which gusts it about.
  const g = t - last
  if (g >= 0 && g < 0.6) return w * 0.3 * Math.sin(g * 9) * Math.exp(-g / 0.25)
  return -w * (0.15 + 0.25 * Math.min(1, wind(t) - 0.4)) * Math.sin(t * 2.3) - 0.08 * Math.sin(t * 5.1)
}

/* ------------------------------------------------------------------ what moves on the beats */

/** His landings: a small kick of snow off each step. The gust off the boulder on the downbeat of the build. */
export function drawKicks(pen: Pen, t: number): void {
  for (let i = 0; i < STEPS.length; i++) {
    const g = t - LANDINGS[i]
    if (g < 0 || g > 0.55) continue
    const [x, y] = STEPS[i].p
    const fade = 1 - g / 0.55
    for (let j = -2; j <= 2; j++) {
      if (j === 0) continue
      const vx = j * 0.35
      const vy = -0.55 - Math.abs(j) * 0.1
      ellipse(pen, x + vx * g, Math.min(y + R - 0.01, y + R + vy * g + 3 * g * g), 0.022, 0.022, rgba('#FFFFFF', 0.9 * fade))
    }
  }
  const gg = t - GUST
  if (gg > -0.05 && gg < 3.5) {
    // The plume: torn off the boulder's top and streamed away right, thinning.
    const path = new Path2D()
    const k = pen.k
    for (let i = 0; i < 70; i++) {
      const delay = hash(i, 81) * 0.5
      const g = gg - delay
      if (g < 0 || g > 1.6 + hash(i, 86)) continue
      const x = BOULDER[0] - 0.6 + hash(i, 82) * 1.2 + g * (2.0 + hash(i, 83) * 1.6)
      const y = BOULDER[1] - 0.15 - hash(i, 84) * 0.15 - g * (0.3 + hash(i, 85) * 0.2) + Math.sin(g * 4 + i) * 0.05
      const r = (0.02 + g * 0.01) * k
      path.moveTo(x * k + r, y * k)
      path.ellipse(x * k, y * k, r, 0.016 * k, 0, 0, Math.PI * 2)
    }
    pen.c.fillStyle = rgba('#FFFFFF', 0.6 * (1 - smooth(gg, 1, 3.5)))
    pen.c.fill(path)
  }
}

/** Snow sifting from the rock over them: a thin fall, its front landing on the ledge on the beat. */
const SIFT_FALL = 1.5
export function drawSifts(pen: Pen, t: number): void {
  const top = LEDGE_Y - 1.2 + 0.02
  const h = LEDGE_Y - top
  const dur = h / SIFT_FALL
  const k = pen.k
  const path = new Path2D()
  for (const s of SIFTS) {
    const g = t - (s - dur)
    if (g < 0 || g > dur + 1.2) continue
    for (let i = 0; i < 40; i++) {
      const lag = i * 0.028
      const gi = g - lag
      if (gi < 0) continue
      const y = top + gi * SIFT_FALL
      if (y > LEDGE_Y) continue
      const x = SIFT_X + (hash(i, 91) - 0.5) * 0.12 + Math.sin(gi * 3 + i) * 0.025 + gi * 0.14
      const r = (0.01 + 0.008 * hash(i, 92)) * k
      path.moveTo(x * k + r, y * k)
      path.arc(x * k, y * k, r, 0, Math.PI * 2)
    }
    const land = t - s
    if (land >= 0 && land < 0.6) ellipse(pen, SIFT_X + 0.1, LEDGE_Y - 0.01, 0.06 + land * 0.25, 0.022, rgba('#FFFFFF', 0.8 * (1 - land / 0.6)))
  }
  pen.c.fillStyle = rgba('#FFFFFF', 0.88)
  pen.c.fill(path)
}

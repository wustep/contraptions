import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { alpha, frame, hash, scenery, smooth } from '../kit'
import { along, birds, clouds, wobble, type Flight, type Frame } from '../depth'
import { AGE, AT, CUT, PIANO } from '../music'
import { HOME, INK } from '../worlds'
import { farRow, type Lot } from '../house/far'
import { BOARDS, FLASH1, stormAt } from './jar-clock'
import { drawPapers } from './papers'

/**
 * The house, inside (the director's set): the house cut open like a doll's house, from the back yard on the left to
 * the porch on the right, two floors and the roof. Carl and Ellie live here from the nursery to the tickets: the
 * nursery upstairs (the home builder), the yard and the back door (the home builder), the living room with its
 * mantle and the jar (the jar builder), the hall with the stairs and the front door (the ties builder).
 *
 * This file draws only the house itself: the sky, the ground, the rooms' papered walls, the walls and floors cut
 * through, the windows, the fireplace and its mantle, the stairs, the roof and the chimney. Everything that moves or
 * is used (doors' leaves, furniture, the machines) is the part's whose room it is. Its papers age with the years.
 *
 * Coordinates are cells from the set's origin, which the score puts at `INSIDE_AT` in the house world. A ball (or
 * Carl) standing on the ground floor has its centre at y = 0; upstairs at y = `INSIDE.up`.
 */
export const INSIDE = {
  /** Ball centres on the ground floor and upstairs; the surfaces they stand on. */
  floor: 0,
  ground: 0.13,
  up: -3.85,
  groundUp: -3.72,
  /** Undersides of the ceilings. */
  ceil: -3.6,
  ceilUp: -7.0,
  /** The yard, left of the back wall. */
  yard: [-17, -1.2] as [number, number],
  /** The back wall (in section) and the back door's opening in it, up from the ground to `backDoorTop`. */
  backWall: [-1.2, -0.9] as [number, number],
  backDoorTop: -2.1,
  /** The living room; its fireplace on the far wall, and the mantle's top (where the jar stands). */
  living: [-0.9, 12.9] as [number, number],
  fireplace: 6.0,
  mantle: -1.35,
  /** The wall between the living room and the hall, open below `doorway`. */
  partition: [12.9, 13.2] as [number, number],
  doorway: -2.5,
  /** The hall, and the stairs on its far wall (from the ground at x0 up to the upstairs floor at x1). */
  hall: [13.2, 21.8] as [number, number],
  stairs: [14.2, 19.4] as [number, number],
  /** The front wall and the front door's opening, and the porch outside it. */
  frontWall: [21.8, 22.1] as [number, number],
  frontDoorTop: -2.2,
  porch: [22.1, 25.5] as [number, number],
  /** Upstairs: the nursery over the living room, the landing over the hall. */
  nursery: [-0.9, 12.9] as [number, number],
  landing: [13.2, 21.8] as [number, number],
  /** The roof: its eaves and its ridge; the chimney over the fireplace. */
  eaves: [-1.9, 22.8] as [number, number],
  eavesY: -6.9,
  ridge: [10.45, -10.7] as [number, number],
  chimney: [5.4, 6.6, -11.8] as [number, number, number],
  /** The windows on the far walls, [x0, x1, y0, y1]. */
  windows: [
    [1.4, 3.8, -2.7, -0.95],
    [8.6, 11.0, -2.7, -0.95],
    [4.4, 7.6, -6.2, -4.6],
  ] as [number, number, number, number][],
}

/** How far round the house its sky and earth are painted: [x0, x1, y0, y1] from its origin. High enough for a phone
 * held upright at the storm, the widest look at the house, which sees far above the roof (held by `check:shows`). */
export const INSIDE_SPAN = [-70, 70, -160, 30]

/** The cells the set claims, [x0, y0, x1, y1] from its origin. */
export const INSIDE_BOX: [number, number, number, number] = [-18, -13, 27, 3]

/**
 * How far the yard's grey has cleared, 0 to 1. The yard opens grey (the doctor's office ends cold, and the cut
 * carries its light across); it lifts a third of the way as he goes out to her with the book, and the rest breaks on
 * the waltz's return (`AT.book`), as the book opens: the light comes back with the music, not before it.
 */
export const clearAt = (t: number): number => 0.35 * smooth(t, 90, 99.6) + 0.65 * smooth(t, AT.book - 0.5, AT.book + 0.6)

/** The sky over the yard and the roof: grey through the loss, clear with the book, warm with the late years. */
function skyAt(t: number): string {
  const grey = '#C6CDD0'
  if (t < CUT.doctor) return HOME.sky
  if (t < 101) return mixHex(grey, HOME.sky, clearAt(t))
  // The late years go pale; and on the evening of the tickets the sky past the front door warms to dusk, so the
  // porch is an evening outside, not a pale wall.
  const late = mixHex(HOME.sky, '#D9D3C4', Math.max(0, Math.min(1, (t - 140) / 12)))
  return mixHex(late, mixHex(HOME.dusk, '#D9A38C', 0.35), Math.max(0, Math.min(1, (t - 156) / 6)))
}

/** The gardens behind the house: the street's far side again, a row of its own, farther off and smaller. */
const BEHIND = farRow(-150, 150, 0.5, 0.55, 16)

function rect(p: p5, k: number, x0: number, y0: number, x1: number, y1: number): void {
  p.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
}

/* ------------------------------------------------------------------ the ground under it */

/** The yard tree's trunk and her stump (the yard's, in this set's cells): where their roots go down from. */
const ROOTED: { x: number; reach: number; n: number; seed: number }[] = [
  { x: -4.4, reach: 2.1, n: 5, seed: 3 },
  { x: -2.77, reach: 0.9, n: 3, seed: 7 },
]

/**
 * The ground cut through with the house, as a doll's house is cut: dark topsoil under the grass, the subsoil, a
 * deeper band; stones in it; the yard tree's roots and the old stump's spreading under the yard; and the house's
 * stone footings under its walls and its chimney, the porch's piers. All of it still: the one thing that changes is
 * the rain, soaking the topsoil dark through the storm and drying out after it. Only round the house, and only
 * where the frame looks below the ground.
 */
function underground(p: p5, k: number, weight: number, t: number, X0: number, X1: number, Y1: number, earth: string): void {
  const H = INSIDE
  const g = H.ground
  if (Y1 <= g + 0.05) return
  const wet = smooth(t, FLASH1 - 1, FLASH1 + 4) * (1 - smooth(t, BOARDS[1] + 2, BOARDS[1] + 16))
  const top = mixHex(earth, '#6B4A36', 0.32 + 0.22 * wet)
  const deep = mixHex(earth, '#7A6150', 0.22)
  const ink = alpha(p, INK, 0.35)
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const slab: [number, number] = [H.backWall[0], H.frontWall[1]]
  p.noStroke()
  // The deeper band, its top wavering.
  const deepAt = (x: number) => g + 1.55 + 0.08 * Math.sin(x * 0.7 + 2) + 0.04 * Math.sin(x * 2.3)
  if (Y1 > g + 1.4) {
    p.fill(deep)
    p.beginShape()
    p.vertex((X0 - 0.2) * k, (Y1 + 0.2) * k)
    for (let x = X0 - 0.2; x <= X1 + 0.2; x += 0.2) p.vertex(x * k, deepAt(x) * k)
    p.vertex((X1 + 0.2) * k, (Y1 + 0.2) * k)
    p.endShape(p.CLOSE)
  }
  // The topsoil, where the ground is open (not under the slab): its foot wavering.
  const soilAt = (x: number) => g + 0.36 + 0.05 * Math.sin(x * 1.3) + 0.03 * Math.sin(x * 3.1 + 1)
  p.fill(top)
  for (const [a, b] of [
    [X0 - 0.2, Math.min(X1 + 0.2, slab[0])],
    [Math.max(X0 - 0.2, slab[1]), X1 + 0.2],
  ]) {
    if (b <= a) continue
    p.beginShape()
    p.vertex(a * k, g * k)
    for (let x = a; x <= b; x += 0.2) p.vertex(x * k, soilAt(x) * k)
    p.vertex(b * k, soilAt(b) * k)
    p.vertex(b * k, g * k)
    p.endShape(p.CLOSE)
  }
  // Stones: a scatter, a few in each stretch of ground, rounded, a shade off the earth round them.
  const stone = mixHex(HOME.stone, earth, 0.35)
  p.stroke(ink)
  p.strokeWeight(weight * 0.45)
  for (let i = Math.floor(X0 / 1.3) - 1; i <= Math.ceil(X1 / 1.3) + 1; i++) {
    for (let j = 0; j < 4; j++) {
      if (hash(i, j, 81) > 0.45) continue
      const x = i * 1.3 + hash(i, j, 82) * 1.3
      const y = g + 0.55 + j * 0.6 + hash(i, j, 83) * 0.45
      if (y > Y1 + 0.2 || x < X0 - 0.3 || x > X1 + 0.3) continue
      if (x > slab[0] - 0.3 && x < slab[1] + 0.3 && y < g + 0.6) continue
      const w = 0.1 + hash(i, j, 84) * 0.14
      p.fill(mixHex(stone, earth, hash(i, j, 85) * 0.4))
      p.ellipse(x * k, y * k, w * k, w * (0.55 + 0.25 * hash(i, j, 86)) * k)
    }
  }
  // Roots: from the trunk's foot down and out under the yard, each a curve tapering to a point.
  p.noStroke()
  p.fill(mixHex(HOME.bark, earth, 0.3))
  for (const r of ROOTED) {
    if (r.x + r.reach < X0 || r.x - r.reach > X1) continue
    for (let i = 0; i < r.n; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const u = (i + 0.5) / r.n
      const ex = r.x + side * r.reach * (0.35 + 0.65 * hash(i, r.seed, 87)) * (0.5 + u * 0.5)
      const ey = g + 0.35 + r.reach * 0.45 * (0.4 + 0.6 * hash(i, r.seed, 88))
      // Down steeply from the trunk, then out along the ground: a quadratic through a bend under the trunk's edge.
      const [ax, ay] = [r.x + side * 0.1, g]
      const [bx, by] = [r.x + (ex - r.x) * 0.25, ey - 0.05]
      const w0 = (r.reach > 1.5 ? 0.075 : 0.05) * (0.8 + 0.4 * hash(i, r.seed, 89))
      const left: [number, number][] = []
      const right: [number, number][] = []
      for (let j = 0; j <= 8; j++) {
        const s = j / 8
        const x = (1 - s) * (1 - s) * ax + 2 * (1 - s) * s * bx + s * s * ex
        const y = (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * by + s * s * ey
        const dx = 2 * (1 - s) * (bx - ax) + 2 * s * (ex - bx)
        const dy = 2 * (1 - s) * (by - ay) + 2 * s * (ey - by)
        const len = Math.hypot(dx, dy) || 1
        const w = w0 * (1 - s) ** 1.3
        left.push([x - (dy / len) * w, y + (dx / len) * w])
        right.push([x + (dy / len) * w, y - (dx / len) * w])
      }
      p.beginShape()
      for (const [x, y] of left) p.vertex(x * k, y * k)
      for (let j = right.length - 1; j >= 0; j--) p.vertex(right[j][0] * k, right[j][1] * k)
      p.endShape(p.CLOSE)
    }
  }
  // The footings: stone courses under the back wall, the partition, the chimney and the front wall, below the slab
  // and a little wider than what they carry; the porch's piers at its outer end.
  const foot = g + 1.05
  const courses = (x0: number, x1: number, y0: number, y1: number) => {
    if (x1 < X0 || x0 > X1 || y0 > Y1) return
    p.stroke(alpha(p, INK, 0.7))
    p.strokeWeight(weight * 0.7)
    p.fill(mixHex(HOME.stone, '#9C8F7C', 0.45))
    rect(p, k, x0, y0, x1, y1)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 * k, y0 * k, (x1 - x0) * k, (y1 - y0) * k)
    ctx.clip()
    p.stroke(ink)
    p.strokeWeight(weight * 0.45)
    const h = 0.18
    for (let y = y0 + h, row = 0; y < y1 + h; y += h, row++) {
      p.line(x0 * k, y * k, x1 * k, y * k)
      for (let x = x0 + (row % 2 ? 0.14 : 0.3); x < x1; x += 0.32) p.line(x * k, (y - h) * k, x * k, y * k)
    }
    ctx.restore()
  }
  courses(H.backWall[0] - 0.14, H.backWall[1] + 0.14, g + 0.3, foot)
  courses(H.partition[0] - 0.1, H.partition[1] + 0.1, g + 0.3, foot - 0.2)
  courses(H.fireplace - 0.75, H.fireplace + 0.75, g + 0.3, foot + 0.15)
  courses(H.frontWall[0] - 0.14, H.frontWall[1] + 0.14, g + 0.3, foot)
  courses(H.porch[1] - 0.38, H.porch[1] - 0.04, g + 0.2, g + 0.8)
}

/* ------------------------------------------------------------------ the world round the house */

/** The piano's stronger notes through the loss: each is a breath of wind in the yard (`yardWind`). */
export const GUSTS = PIANO.filter((n) => n.t > 84 && n.t < 100.5 && n.s >= 0.45)

/**
 * The wind in the yard, blowing out from the house (to the left): it gusts with the piano through the loss. Each of
 * its stronger notes is a breath of wind that follows the note (gathering over half a second, dying away over two),
 * so the sheet, the grass, the tree and the gardens behind move with the music and nothing strikes; it falls away as
 * the waltz comes back.
 */
export function yardWind(T: number): number {
  let g = 0
  for (const n of GUSTS) {
    const u = (T - n.t) / 0.55
    if (u > 0) g += Math.min(1.3, n.s) * u * u * Math.exp(2 * (1 - u))
  }
  return (0.4 + 0.32 * Math.min(1.6, g)) * (1 - 0.6 * smooth(T, 98.5, 101.5))
}

/** The wind over the gardens: the yard's through the loss, the storm's, and otherwise a light breeze that comes and goes. */
function windAt(t: number): number {
  const yard = smooth(t, 83, 84.4) * (1 - smooth(t, 102.5, 104.5))
  const calm = 0.18 + 0.1 * wobble(t, 5, 3)
  return calm + (yardWind(t) - calm) * yard + stormAt(t).storm * (0.8 + 0.3 * wobble(t, 9, 0.9))
}

/** How far the gardens keep with the frame as it moves (they are farther off than the yard), and where they stand true. */
const GARDENS = { depth: 0.25, anchor: -2 }

/**
 * The gardens (`BEHIND`), drawn as `house/far.ts` draws a far side but bowing to the wind: each tree's crown carried
 * over from its foot, its top the most, each on its own breath; the houses stand. Between `x0` and `x1` on the
 * screen, slid by `shift` for their depth.
 */
function gardens(p: p5, k: number, G: number, x0: number, x1: number, shift: number, wind: number, t: number, tree: string, house: string, pane: string): void {
  p.noStroke()
  p.fill(tree)
  p.rect((x0 - 1) * k, (G - 0.18) * k, (x1 - x0 + 2) * k, 0.2 * k)
  const drawHouse = (b: Lot, x: number): void => {
    const l = x - b.w / 2
    const r = x + b.w / 2
    const eave = G - b.h
    const ridge = eave - b.roof
    const s = b.s
    p.fill(house)
    p.rect(l * k, eave * k, b.w * k, (G - eave) * k)
    p.triangle((l - 0.12 * s) * k, (eave + 0.02 * s) * k, x * k, ridge * k, (r + 0.12 * s) * k, (eave + 0.02 * s) * k)
    if (b.chimney > 0) p.rect((x + b.w * 0.18) * k, (ridge + b.roof * 0.25 - b.chimney) * k, 0.18 * s * k, (b.chimney + b.roof * 0.4) * k)
    p.fill(pane)
    const ww = Math.min(0.32 * s, b.w * 0.17)
    for (const u of [-0.27, 0.27]) p.rect((x + u * b.w - ww / 2) * k, (eave + b.h * 0.22) * k, ww * k, b.h * 0.26 * k)
    p.rect((x - 0.12 * s) * k, (G - b.h * 0.42) * k, 0.24 * s * k, b.h * 0.42 * k)
  }
  for (const b of BEHIND) {
    const x = b.x + shift
    if (x + b.w < x0 - 1 || x - b.w > x1 + 1) continue
    if (!b.tree) {
      drawHouse(b, x)
      continue
    }
    // Leaning out from the house with the wind (to the left), more at the top.
    const lean = -wind * b.h * (0.12 + 0.04 * Math.sin(t * 1.7 + b.x * 2.3))
    p.fill(tree)
    p.ellipse((x + lean * 0.4) * k, (G - b.h * 0.42) * k, b.w * k, b.h * k)
    p.ellipse((x + b.w * 0.28 + lean * 0.3) * k, (G - b.h * 0.3) * k, b.w * 0.7 * k, b.h * 0.7 * k)
    p.ellipse((x - b.w * 0.08 + lean) * k, (G - b.h * 0.74) * k, b.w * 0.62 * k, b.h * 0.5 * k)
  }
}

/**
 * The far country past the gardens: a low line of hills in the haze, keeping with the frame most of the way. On it,
 * seen from the yard, their hill with its tree, out where she is looking; and seen past the porch, the church's
 * spire among a few roofs. Their places, in sight of the house, small and pale.
 */
const COUNTRY = { depth: 0.72, hill: -2.4, church: 8.2 }
const ridgeAt = (u: number): number => 0.4 + 0.16 * Math.sin(u * 0.29 + 0.6) + 0.1 * Math.sin(u * 0.77 + 2.1) + 0.42 * Math.exp(-(((u - COUNTRY.hill) / 1.1) ** 2))

function country(p: p5, k: number, f: Frame, G: number, x0: number, x1: number, sky: string): void {
  const shift = along(f, COUNTRY.depth)
  p.noStroke()
  p.fill(mixHex(sky, '#7E9282', 0.17))
  p.beginShape()
  p.vertex((x0 - 0.5) * k, (G + 0.05) * k)
  for (let x = x0 - 0.5; x < x1 + 0.9; x += 0.35) p.vertex(x * k, (G - ridgeAt(x - shift)) * k)
  p.vertex((x1 + 0.9) * k, (G + 0.05) * k)
  p.endShape(p.CLOSE)
  // Their tree on the hill's crest: a trunk and a round crown, a speck.
  const hx = COUNTRY.hill + shift
  if (hx > x0 - 1 && hx < x1 + 1) {
    const top = G - ridgeAt(COUNTRY.hill) + 0.02
    p.fill(mixHex(sky, '#5E7458', 0.24))
    p.rect((hx - 0.011) * k, (top - 0.1) * k, 0.022 * k, 0.11 * k)
    p.ellipse(hx * k, (top - 0.13) * k, 0.2 * k, 0.11 * k)
    p.ellipse((hx + 0.055) * k, (top - 0.1) * k, 0.12 * k, 0.07 * k)
  }
  // The church: its nave's roof, its tower and the spire, a roof or two by it.
  const sx = COUNTRY.church + shift
  if (sx > x0 - 2 && sx < x1 + 1) {
    const base = G - ridgeAt(COUNTRY.church) + 0.1
    const q = 0.75
    p.fill(mixHex(sky, '#76808C', 0.2))
    p.rect((sx + 0.05 * q) * k, (base - 0.3 * q) * k, 0.56 * q * k, 0.3 * q * k)
    p.triangle((sx + 0.03 * q) * k, (base - 0.29 * q) * k, (sx + 0.33 * q) * k, (base - 0.45 * q) * k, (sx + 0.63 * q) * k, (base - 0.29 * q) * k)
    p.rect((sx - 0.075 * q) * k, (base - 0.5 * q) * k, 0.15 * q * k, 0.5 * q * k)
    p.triangle((sx - 0.09 * q) * k, (base - 0.49 * q) * k, sx * k, (base - 0.95 * q) * k, (sx + 0.09 * q) * k, (base - 0.49 * q) * k)
    for (const [dx, w, hh] of [[-0.6, 0.38, 0.2], [1.0, 0.44, 0.24]]) {
      const cx = sx + dx * q
      p.rect((cx - (w * q) / 2) * k, (base - hh * q) * k, w * q * k, hh * q * k)
      p.triangle((cx - (w * q) / 2 - 0.02) * k, (base - hh * q) * k, cx * k, (base - (hh + 0.14) * q) * k, (cx + (w * q) / 2 + 0.02) * k, (base - hh * q) * k)
    }
  }
}

/**
 * The doll's house's sky: clouds at depth, keeping with the frame most of the way and drifting on the wind, in the
 * sky's own light (white by day, peach at dusk). Through the loss an overcast hangs low and grey over the yard, darker
 * than its sky; it breaks as the book opens: its own clouds go, and the ones that stay whiten into a fair sky. Small
 * and flat near the horizon, heaped overhead (a phone held upright sees them). The storm brings its own (the jar's,
 * `jar-storm.ts`), and these go under them.
 */
function weather(p: p5, k: number, f: Frame, t: number, sky: string): void {
  if (f.y0 > INSIDE.ground) return
  const grey = t > CUT.doctor && t < AT.book + 2 ? 1 - clearAt(t) : 0
  const { storm } = stormAt(t)
  if (storm > 0.99) return
  const dull = mixHex(sky, '#A1A9AD', 0.42)
  const dullShade = mixHex(sky, '#8A9398', 0.5)
  const body = mixHex(mixHex(mixHex(sky, '#FFFFFF', 0.62), dull, grey), sky, storm)
  const shade = mixHex(mixHex(mixHex(sky, '#8C98AC', 0.3), dullShade, grey), sky, storm)
  if (grey > 0.01) {
    // The overcast's own, which go as it breaks: drawn first, so the clouds that stay pass over them.
    const b = mixHex(sky, dull, grey)
    const s = mixHex(sky, dullShade, grey)
    clouds(p, k, f, t, { y0: -16, y1: -3.6, per: 46, size: 4.6, speed: -0.13, depth: 0.85, body: b, shade: s, heap: 0.95, seed: 62 })
    clouds(p, k, f, t, { y0: -3.4, y1: -1.5, per: 80, size: 1.9, speed: -0.1, depth: 0.9, body: mixHex(b, sky, 0.15), shade: mixHex(s, sky, 0.15), heap: 0.85, seed: 61 })
  }
  clouds(p, k, f, t, { y0: -17, y1: -4.2, per: 30, size: 3.6, speed: -0.11, depth: 0.85, body, shade, heap: 0.95, seed: 64 })
  clouds(p, k, f, t, { y0: -3.2, y1: -1.6, per: 34, size: 1.35, speed: -0.07, depth: 0.92, body: mixHex(body, sky, 0.3), shade: mixHex(shade, sky, 0.3), heap: 0.6, seed: 63 })
  // At dusk, on the evening of the tickets, long thin streaks low in the west, their undersides lit by the low sun.
  const dusk = smooth(t, 152, 158)
  if (dusk > 0.01) {
    const lit = mixHex(sky, mixHex('#F6D2AE', sky, 1 - dusk), 0.7)
    const under = mixHex(sky, mixHex('#B98990', sky, 1 - dusk), 0.55)
    clouds(p, k, f, t, { y0: -3.6, y1: -1.5, per: 70, size: 2.1, speed: -0.05, depth: 0.9, body: under, shade: lit, heap: 0.32, seed: 65 })
  }
}

/**
 * Birds by day, where the sky is seen: back over the yard as the grey breaks; over the house when the storm has
 * gone; a few going home past the porch at dusk. None through the loss but the one on the line (`yard.ts`).
 */
const FLIGHTS: Omit<Flight, 'color'>[] = [
  { t0: 100.9, from: [-6.9, -1.42], v: [1.6, -0.07], dur: 8, n: 4, span: 0.12, beat: 2.6, seed: 3, depth: 0.5, anchor: -3.1 },
  { t0: 64.5, from: [-2, -9.5], v: [1.3, -0.05], dur: 16, n: 5, span: 0.22, beat: 2.2, seed: 5, depth: 0.6, anchor: 7 },
  { t0: 136.6, from: [-6, -10], v: [2.1, -0.12], dur: 14, n: 6, span: 0.3, beat: 2.4, seed: 7, depth: 0.5, anchor: 10 },
  { t0: 160.6, from: [20.4, -2.9], v: [0.75, -0.06], dur: 10, n: 3, span: 0.11, beat: 2.2, seed: 9, depth: 0.5, anchor: 19.5 },
]

/** A small cloud seen through a window: three soft lobes on a flat, shaded base. */
function puff(p: p5, k: number, x: number, y: number, w: number, body: string, shade: string): void {
  p.fill(shade)
  p.ellipse(x * k, (y + w * 0.05) * k, w * 0.9 * k, w * 0.2 * k)
  p.fill(body)
  for (const [u, v, r] of [[-0.27, -0.02, 0.25], [0.02, -0.07, 0.33], [0.28, -0.01, 0.22]]) p.ellipse((x + u * w) * k, (y + v * w) * k, r * 2 * w * k, r * 1.15 * w * k)
}

/** A line of far trees on the horizon `base`, their tops about `h` over it: soft lumps in the haze, slid by `shift`. */
function treeline(p: p5, k: number, x0: number, x1: number, base: number, h: number, shift: number, tone: string): void {
  p.fill(tone)
  p.beginShape()
  p.vertex(x0 * k, (base + 0.4) * k)
  for (let x = x0; x <= x1 + 0.08; x += 0.08) {
    const u = x - shift
    p.vertex(x * k, (base - h * (0.55 + 0.22 * Math.sin(u * 2.3) + 0.23 * Math.abs(Math.sin(u * 6.1 + 1)))) * k)
  }
  p.vertex(x1 * k, (base + 0.4) * k)
  p.endShape(p.CLOSE)
}

/**
 * The view through a window on a far wall: its sky, a cloud or two crossing on the wind, and its far side (a line of
 * trees in the haze; through the nursery's, the hills behind the house, and on the farther one their tree), each at
 * its own depth, so that as the camera moves the view slides against the wall: a room with a world outside it. The
 * living room's two go on under what the jar builder paints in them (the drive and the car, the garden tree): only
 * their skies and horizons are these.
 */
function view(p: p5, k: number, f: Frame, t: number, i: number, win: [number, number, number, number], sky: string): void {
  const [x0, x1, y0, y1] = win
  const w = x1 - x0
  const h = y1 - y0
  // Where the view stands true: the nursery's from the crib, where the camera keeps; the living room's from in front.
  const mid = i === 2 ? 7.0 : (x0 + x1) / 2
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 * k, y0 * k, w * k, h * k)
  ctx.clip()
  p.noStroke()
  p.fill(sky)
  rect(p, k, x0, y0, x1, y1)
  // Clouds, far off: they keep with the frame nearly all the way, and cross the glass slowly on the wind.
  const far = along(f, 0.85, mid)
  const body = mixHex(sky, '#FFFFFF', 0.66)
  const shade = mixHex(sky, '#8C98AC', 0.28)
  if (i === 2) {
    // Over the hills, on the left of the glass, clear of the mobile in front of its right half: one a little nearer,
    // one small and low on the horizon, drifting slower.
    puff(p, k, x0 + 0.95 - 0.06 * (t - 68) + far, y0 + h * 0.24, 0.88, body, shade)
    puff(p, k, x0 + 0.3 - 0.03 * (t - 68) + far, y0 + h * 0.5, 0.46, mixHex(body, sky, 0.35), mixHex(shade, sky, 0.35))
  } else {
    const span = w + 3
    for (let j = 0; j < 2; j++) {
      const cw = 0.62 + 0.3 * hash(i, j, 72)
      const x = x0 - 1.5 + ((((hash(i, j, 71) * span - 0.05 * (1 + 0.6 * j) * t + far - x0) % span) + span) % span)
      puff(p, k, x, y0 + h * (0.2 + 0.16 * j + 0.08 * hash(i, j, 73)), cw, body, shade)
    }
  }
  if (i === 2) {
    // The nursery's: the hills behind the house, the farther one with their tree on it (the clouds' hill, which the
    // mural paints), the nearer one's hedges, a pair of birds crossing once while the room is made.
    const backShift = along(f, 0.5, mid)
    const frontShift = along(f, 0.25, mid)
    const backY = (x: number): number => {
      const u = x - backShift - x0
      return y1 - h * (0.3 + 0.09 * Math.sin(u * 1.5 + 0.4) + 0.12 * Math.exp(-(((u - 0.95) / 0.7) ** 2)))
    }
    p.fill(mixHex(HOME.grass, sky, 0.55))
    p.beginShape()
    p.vertex((x0 - 0.1) * k, y1 * k)
    for (let x = x0 - 0.1; x <= x1 + 0.2; x += 0.1) p.vertex(x * k, backY(x) * k)
    p.vertex((x1 + 0.2) * k, y1 * k)
    p.endShape(p.CLOSE)
    const tx = x0 + 0.95 + backShift
    const sway = 0.012 * wobble(t, 31, 1.4)
    p.fill(mixHex(HOME.leaf, sky, 0.5))
    p.rect((tx - 0.014) * k, (backY(tx) - 0.12) * k, 0.028 * k, 0.14 * k)
    p.ellipse((tx + sway) * k, (backY(tx) - 0.17) * k, 0.26 * k, 0.15 * k)
    p.ellipse((tx + 0.07 + sway) * k, (backY(tx) - 0.13) * k, 0.15 * k, 0.1 * k)
    p.fill(mixHex(HOME.grass, sky, 0.3))
    p.beginShape()
    p.vertex((x0 - 0.1) * k, y1 * k)
    for (let x = x0 - 0.1; x <= x1 + 0.2; x += 0.1) {
      const u = x - frontShift - x0
      p.vertex(x * k, (y1 - h * (0.15 + 0.06 * Math.sin(u * 1.9 + 2.2) + 0.03 * Math.sin(u * 4.3))) * k)
    }
    p.vertex((x1 + 0.2) * k, y1 * k)
    p.endShape(p.CLOSE)
    birds(p, k, f, t, { t0: 66.2, from: [x0 - 0.25, y0 + h * 0.62], v: [0.34, -0.15], dur: 7.5, n: 2, span: 0.09, beat: 2.4, seed: 11, depth: 0.6, anchor: mid, color: mixHex(INK, sky, 0.45) }, 1.4)
  } else {
    // The living room's: a line of trees on the far side, over the hedge (the drive's window) and the lawn (the
    // garden's), in the haze.
    treeline(p, k, x0 - 0.1, x1 + 0.1, i === 0 ? -1.4 : -1.18, 0.42, along(f, 0.5, mid), mixHex(sky, mixHex(HOME.leaf, '#7D8A86', 0.3), 0.32))
  }
  ctx.restore()
}

export const inside = scenery<null>({
  name: 'inside',
  draw: (p, _s, c) => {
    const { k, weight } = c
    const t = c.t
    const age = AGE(t)
    const H = INSIDE
    const f = frame(p, k)
    const ink = INK
    p.push()
    // The stage draws with rectMode(CENTER) (engine.ts `drawingModes`); this set thinks in corners.
    p.rectMode(p.CORNER)

    // The sky, wherever the frame shows it over the yard and the roof, and the earth under everything: only round
    // the house, so a wide look at the whole world (Overview) still sees the street side and the rest.
    const X0 = Math.max(f.x0, INSIDE_SPAN[0])
    const X1 = Math.min(f.x1, INSIDE_SPAN[1])
    const Y0 = Math.max(f.y0, INSIDE_SPAN[2])
    const Y1 = Math.min(f.y1, INSIDE_SPAN[3])
    if (X1 > X0 && Y1 > Y0) {
      p.noStroke()
      const sky = skyAt(t)
      p.fill(sky)
      if (H.ground > Y0) p.rect(X0 * k, Y0 * k, (X1 - X0) * k, (Math.min(H.ground, Y1) - Y0) * k)
      // Its clouds, at depth (only round the house: they are the doll's house's weather).
      if (H.ground > Y0) weather(p, k, { ...f, x0: X0, x1: X1, y0: Y0, y1: Y1 }, t, sky)
      // Beyond the yard's end and past the porch, the far country and the gardens behind: the neighbours' trees and a
      // roof or two, lower and hazier than the street's, in the sky's own light (grey through the loss, dusk on the
      // evening of the tickets), so Ellie on her stump has distance behind her and not a wall of grey. Each keeps with
      // the frame by its depth as the camera moves, and the gardens' trees bow to the wind.
      if (H.ground > Y0 && Y1 > H.ground - 2.2) {
        const tree = mixHex(sky, mixHex(HOME.leaf, '#7D8A86', 0.35), 0.2)
        const house = mixHex(sky, '#8E9BA8', 0.2)
        const pane = mixHex(house, '#F4F6F4', 0.14)
        const shift = along(f, GARDENS.depth, GARDENS.anchor)
        const wind = windAt(t)
        for (const [a, b] of [[X0, Math.min(X1, H.backWall[0])], [Math.max(X0, H.frontWall[1]), X1]]) {
          if (b <= a) continue
          country(p, k, f, H.ground, a, b, sky)
          gardens(p, k, H.ground, a, b, shift, wind, t, tree, house, pane)
        }
      }
      // Birds by day, crossing the sky (behind the house: it hides them as they pass it).
      for (const b of FLIGHTS) birds(p, k, f, t, { ...b, color: mixHex(INK, sky, 0.4) }, weight)
      const earth = mixHex('#B09878', '#A08E78', age)
      p.fill(earth)
      if (Y1 > H.ground) p.rect(X0 * k, H.ground * k, (X1 - X0) * k, (Y1 - H.ground) * k)
      underground(p, k, weight, t, X0, X1, Y1, earth)
      p.noStroke()
      // The yard's grass: a band on the earth, and the lawn beyond the porch.
      p.fill(mixHex(HOME.grass, '#9DAA78', age * 0.6))
      if (H.backWall[0] > X0) p.rect(X0 * k, H.ground * k, (H.backWall[0] - X0) * k, 0.28 * k)
      if (X1 > H.porch[1]) p.rect(H.porch[1] * k, H.ground * k, (X1 - H.porch[1]) * k, 0.28 * k)
    }
    p.stroke(alpha(p, ink, 0.55))
    p.strokeWeight(weight * 0.7)
    if (H.backWall[0] > X0) p.line(X0 * k, H.ground * k, H.backWall[0] * k, H.ground * k)
    if (X1 > H.porch[1]) p.line(H.porch[1] * k, H.ground * k, X1 * k, H.ground * k)

    // The rooms' walls: papered, yellowing with the years.
    const paper = mixHex(HOME.paper, '#D9C39C', age * 0.8)
    const hallPaper = mixHex(HOME.paperHall, '#CBB793', age * 0.8)
    const nurseryPaper = mixHex(HOME.nursery, '#D3D8D2', Math.max(0, Math.min(1, (t - CUT.doctor) / 30)) * 0.7)
    p.noStroke()
    // The far wall runs on behind the partition: each room's paper meets the next's at the partition's middle.
    const mid = (H.partition[0] + H.partition[1]) / 2
    p.fill(paper)
    rect(p, k, H.living[0], H.ceil, mid, H.ground)
    p.fill(hallPaper)
    rect(p, k, mid, H.ceil, H.hall[1], H.ground)
    rect(p, k, mid, H.ceilUp, H.landing[1], H.groundUp)
    p.fill(nurseryPaper)
    rect(p, k, H.nursery[0], H.ceilUp, mid, H.groundUp)
    // Their patterns, and the panelling to the chair rail round the living room and the hall (`papers.ts`); then the
    // skirting.
    drawPapers(p.drawingContext as CanvasRenderingContext2D, k, f, {
      living: { x0: H.living[0], x1: mid, y0: H.ceil, y1: H.ground },
      hall: { x0: mid, x1: H.hall[1], y0: H.ceil, y1: H.ground },
      landing: { x0: mid, x1: H.landing[1], y0: H.ceilUp, y1: H.groundUp },
      nursery: { x0: H.nursery[0], x1: mid, y0: H.ceilUp, y1: H.groundUp },
      paper,
      hallPaper,
      nurseryPaper,
      age,
      nurseryFade: Math.max(0, Math.min(1, (t - CUT.doctor) / 30)),
    })
    p.noStroke()
    p.fill(mixHex(HOME.woodDark, '#6A5040', age))
    rect(p, k, H.living[0], H.ground - 0.12, H.living[1], H.ground)
    rect(p, k, H.hall[0], H.ground - 0.12, H.hall[1], H.ground)
    rect(p, k, H.nursery[0], H.groundUp - 0.1, H.landing[1], H.groundUp)

    // The windows on the far walls: frames, glass with the view in it (`view`), a sill.
    for (const [i, [x0, x1, y0, y1]] of H.windows.entries()) {
      if (x1 < f.x0 - 0.2 || x0 > f.x1 + 0.2 || y1 < f.y0 - 0.2 || y0 > f.y1 + 0.2) continue
      view(p, k, f, t, i, H.windows[i], skyAt(t))
      p.stroke(ink)
      p.strokeWeight(weight * 0.8)
      p.fill(HOME.trim)
      // The frame as a band round the glass, and the bars.
      p.noFill()
      p.stroke(HOME.trim)
      p.strokeWeight(0.1 * k)
      rect(p, k, x0, y0, x1, y1)
      p.line(((x0 + x1) / 2) * k, y0 * k, ((x0 + x1) / 2) * k, y1 * k)
      p.line(x0 * k, ((y0 + y1) / 2) * k, x1 * k, ((y0 + y1) / 2) * k)
      p.stroke(alpha(p, ink, 0.8))
      p.strokeWeight(weight * 0.7)
      rect(p, k, x0 - 0.05, y0 - 0.05, x1 + 0.05, y1 + 0.05)
      p.fill(HOME.trim)
      rect(p, k, x0 - 0.15, y1, x1 + 0.15, y1 + 0.1)
    }

    // The fireplace on the living room's far wall: the chimney breast, brick round a dark firebox, the mantle.
    const fx = H.fireplace
    p.noStroke()
    p.fill(mixHex('#B8836A', '#A07C6C', age))
    rect(p, k, fx - 1.0, H.ceil, fx + 1.0, H.ground)
    p.fill('#3A2E2A')
    p.beginShape()
    p.vertex((fx - 0.55) * k, H.ground * k)
    p.vertex((fx - 0.55) * k, -0.55 * k)
    p.bezierVertex((fx - 0.55) * k, -0.85 * k, (fx + 0.55) * k, -0.85 * k, (fx + 0.55) * k, -0.55 * k)
    p.vertex((fx + 0.55) * k, H.ground * k)
    p.endShape(p.CLOSE)
    p.stroke(alpha(p, ink, 0.85))
    p.strokeWeight(weight * 0.8)
    p.fill(mixHex(HOME.wood, HOME.woodDark, 0.25 + age * 0.3))
    rect(p, k, fx - 1.35, H.mantle, fx + 1.35, H.mantle + 0.14)
    p.noFill()
    rect(p, k, fx - 1.0, H.ceil, fx + 1.0, H.ground)

    // The stairs on the hall's far wall: a stringer and its treads, climbing to the landing.
    const [s0, s1] = H.stairs
    const steps = 12
    p.stroke(alpha(p, ink, 0.6))
    p.strokeWeight(weight * 0.7)
    p.fill(mixHex(HOME.wood, '#A88C70', age))
    p.beginShape()
    p.vertex(s0 * k, H.ground * k)
    for (let i = 0; i < steps; i++) {
      const x = s0 + ((s1 - s0) * i) / steps
      const y = H.ground + ((H.groundUp - H.ground) * (i + 1)) / steps
      p.vertex(x * k, y * k)
      p.vertex((x + (s1 - s0) / steps) * k, y * k)
    }
    p.vertex(s1 * k, (H.groundUp + 0.25) * k)
    p.vertex((s0 + 0.6) * k, H.ground * k)
    p.endShape(p.CLOSE)

    // The walls and floors, cut through: the house's section, one warm dark with the clapboard's colour on its
    // outer faces.
    const section = HOME.section
    const siding = mixHex(HOME.siding, HOME.sidingOld, age)
    p.stroke(ink)
    p.strokeWeight(weight)
    p.fill(section)
    // Back wall, with the back door's opening.
    rect(p, k, H.backWall[0], H.eavesY, H.backWall[1], H.backDoorTop)
    // Front wall, with the front door's opening.
    rect(p, k, H.frontWall[0], H.eavesY, H.frontWall[1], H.frontDoorTop)
    // The partition, above the doorway downstairs; upstairs, whole but for a door's width.
    rect(p, k, H.partition[0], H.ceil, H.partition[1], H.doorway)
    rect(p, k, H.partition[0], H.ceilUp, H.partition[1], H.groundUp - 2.1)
    // Under each, the doorway: the partition's far part seen end on through the opening (its papered reveal), cased
    // in trim with a lintel like the other doors, so the stub reads as the wall over a door, not a beam hanging.
    p.push()
    p.noStroke()
    for (const [head, foot, a, b] of [[H.doorway, H.ground, paper, hallPaper], [H.groundUp - 2.1, H.groundUp, nurseryPaper, hallPaper]]) {
      p.fill(mixHex(mixHex(a as string, b as string, 0.5), section, 0.16))
      rect(p, k, H.partition[0], head as number, H.partition[1], foot as number)
      p.fill(HOME.trim)
      rect(p, k, H.partition[0] - 0.06, head as number, H.partition[0] + 0.02, (foot as number) - 0.1)
      rect(p, k, H.partition[1] - 0.02, head as number, H.partition[1] + 0.06, (foot as number) - 0.1)
      rect(p, k, H.partition[0] - 0.09, head as number, H.partition[1] + 0.09, (head as number) + 0.08)
      p.stroke(alpha(p, ink, 0.35))
      p.strokeWeight(weight * 0.5)
      p.line((H.partition[0] - 0.09) * k, ((head as number) + 0.08) * k, (H.partition[1] + 0.09) * k, ((head as number) + 0.08) * k)
      p.noStroke()
    }
    p.pop()
    // The upstairs floor and the ceiling over it; the ground floor's slab on its foundation.
    rect(p, k, H.backWall[0], H.ceil, H.frontWall[1], H.groundUp)
    rect(p, k, H.backWall[0], H.ceilUp - 0.12, H.frontWall[1], H.ceilUp)
    rect(p, k, H.backWall[0], H.ground, H.frontWall[1], H.ground + 0.32)
    // The clapboard's colour on the outer faces, the trim at the corners.
    p.noStroke()
    p.fill(siding)
    rect(p, k, H.backWall[0] - 0.08, H.eavesY, H.backWall[0], H.backDoorTop)
    rect(p, k, H.frontWall[1], H.eavesY, H.frontWall[1] + 0.08, H.frontDoorTop)
    // The door frames: trim round the two openings.
    p.fill(HOME.trim)
    rect(p, k, H.backWall[0] - 0.08, H.backDoorTop - 0.1, H.backWall[1] + 0.02, H.backDoorTop)
    rect(p, k, H.frontWall[0] - 0.02, H.frontDoorTop - 0.1, H.frontWall[1] + 0.08, H.frontDoorTop)

    // The porch: its boards, a post, and its rail along the far side (a top rail, a bottom rail, the balusters
    // between), out past the front door.
    p.stroke(ink)
    p.strokeWeight(weight * 0.8)
    const porchWood = mixHex(HOME.trim, '#E6DCC8', age)
    p.fill(porchWood)
    rect(p, k, H.frontWall[1], H.ground, H.porch[1], H.ground + 0.22)
    if (f.x1 > H.frontWall[1] && f.x0 < H.porch[1]) {
      const r0 = H.frontWall[1] + 0.08
      const r1 = H.porch[1] - 0.25
      p.strokeWeight(weight * 0.6)
      p.fill(mixHex(porchWood, '#CFC3AE', 0.35))
      for (let bx = r0 + 0.12; bx < r1 - 0.06; bx += 0.2) rect(p, k, bx - 0.028, H.ground - 0.78, bx + 0.028, H.ground - 0.1)
      p.strokeWeight(weight * 0.8)
      p.fill(porchWood)
      rect(p, k, r0, H.ground - 0.86, r1, H.ground - 0.76)
      rect(p, k, r0, H.ground - 0.12, r1, H.ground - 0.06)
    }
    rect(p, k, H.porch[1] - 0.25, H.eavesY + 3.2, H.porch[1] - 0.12, H.ground)
    p.fill(mixHex(HOME.roof, HOME.roofOld, age))
    p.quad(H.frontWall[1] * k, (H.eavesY + 3.1) * k, (H.porch[1] + 0.2) * k, (H.eavesY + 3.4) * k, (H.porch[1] + 0.2) * k, (H.eavesY + 3.6) * k, H.frontWall[1] * k, (H.eavesY + 3.3) * k)

    // The attic under the roof, then the roof itself in section: a thick band of shingles over a dark rafter line.
    const [rx, ry] = H.ridge
    p.noStroke()
    p.fill(mixHex('#7C6250', '#6D5A4E', age))
    p.triangle(H.eaves[0] * k, H.eavesY * k, rx * k, ry * k, H.eaves[1] * k, H.eavesY * k)
    // The chimney, up out of the roof. Its stack is drawn from just under the roof's band, not down through the attic:
    // the flue has no way down through the nursery (its window is where it would run), and drawn to the nursery's
    // ceiling it stood in every close of the nursery as a brick block floating over the room.
    const [c0, c1, ctop] = H.chimney
    // Its foot is the roof band's underside where the roof is highest under it, so the band covers it on both sides.
    const bandFoot = (x: number) => H.eavesY + 0.12 + 0.42 + ((x - (H.eaves[0] - 0.3)) / (rx - (H.eaves[0] - 0.3))) * (ry - (H.eavesY + 0.12 + 0.42))
    p.stroke(ink)
    p.strokeWeight(weight)
    p.fill(mixHex('#A8604A', '#8E6656', age))
    rect(p, k, c0, ctop, c1, bandFoot(c1))
    rect(p, k, c0 - 0.12, ctop - 0.2, c1 + 0.12, ctop)
    const roof = mixHex(HOME.roof, HOME.roofOld, age)
    p.fill(roof)
    const th = 0.42
    p.beginShape()
    p.vertex((H.eaves[0] - 0.3) * k, (H.eavesY + 0.12) * k)
    p.vertex(rx * k, (ry - th) * k)
    p.vertex((H.eaves[1] + 0.3) * k, (H.eavesY + 0.12) * k)
    p.vertex((H.eaves[1] + 0.3) * k, (H.eavesY + 0.12 + th) * k)
    p.vertex(rx * k, ry * k)
    p.vertex((H.eaves[0] - 0.3) * k, (H.eavesY + 0.12 + th) * k)
    p.endShape(p.CLOSE)
    p.pop()
  },
})

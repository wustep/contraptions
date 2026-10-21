import type p5 from 'p5'
import { mixHex } from '../../../../../parts'
import { hash, smooth } from '../kit'
import { gust } from '../depth'

/**
 * A far side along a horizon: neighbours' roofs among their trees, soft and unlined like the church's far trees, so a
 * set stands in a town and not on a stage. The street's (`front.ts`) and the yard's behind the house cut open
 * (`inside.ts`) are two rows of it, each its own run of lots.
 */
export interface Lot {
  x: number
  w: number
  h: number
  roof: number
  tree: boolean
  chimney: number
  /** The row's scale, for its trim. */
  s: number
}

/** A row of lots from `from` to `to` (in lots, `step` cells apart), each `scale` of the street's; `seed` picks the row. */
export function farRow(from: number, to: number, step = 0.85, scale = 1, seed = 0): Lot[] {
  const out: Lot[] = []
  for (let i = from; i <= to; i++) {
    const x = i * step + hash(i, 81, seed) * 0.4 * scale
    // A neighbour's house now and then, and here and there an old tree standing over the rest.
    const house = hash(i, 82, seed) < 0.36 && i % 2 === 0
    const tall = !house && hash(i, 80, seed) < 0.2
    out.push({
      x,
      w: scale * (house ? 1.7 + hash(i, 83, seed) * 0.9 : tall ? 1.0 + hash(i, 84, seed) * 0.35 : 1.0 + hash(i, 84, seed) * 0.7),
      h: scale * (house ? 1.05 + hash(i, 85, seed) * 0.6 : tall ? 2.1 + hash(i, 86, seed) * 0.9 : 0.8 + hash(i, 86, seed) * 0.8),
      roof: scale * (0.55 + hash(i, 87, seed) * 0.35),
      tree: !house,
      chimney: hash(i, 88, seed) < 0.5 ? scale * (0.25 + hash(i, 89, seed) * 0.4) : -1,
      s: scale,
    })
  }
  // Trees first, so each house stands whole in front of them (behind a tall tree a house was a chimney poking up
  // beside it, a stray post in a close).
  return out.sort((a, b) => Number(b.tree) - Number(a.tree))
}

/**
 * The row on the horizon `G`, as much of it as lies between `x0` and `x1`: the hedges and gardens they stand in, one
 * low band under all of them so no sky shows between their feet; the trees; the houses, gabled end-on, with a
 * chimney, and their windows and door in `pane`. Given the show time `t`, the trees stir in the wind, each crown
 * leaning on the gust as it travels along the row.
 */
export function drawFar(p: p5, k: number, row: Lot[], G: number, x0: number, x1: number, tree: string, house: string, pane: string, band = 0.32, t?: number, snow?: { a: number; color: string }): void {
  p.noStroke()
  p.fill(tree)
  p.rect((x0 - 1) * k, (G - band) * k, (x1 - x0 + 2) * k, (band + 0.02) * k)
  for (const b of row) {
    if (b.x + b.w < x0 - 1 || b.x - b.w > x1 + 1) continue
    if (b.tree) {
      // Its lean on the gust as it travels along the row, a slow breath, and in the strong gusts a quicker shiver.
      const g = t === undefined ? 0 : gust(t - b.x * 0.15, 3)
      const lean = t === undefined ? 0 : b.h * ((g - 0.55) * 0.06 + 0.012 * Math.sin(t * 1.4 + b.x * 2.3) + 0.05 * Math.max(0, g - 0.38) * Math.sin(t * 5.5 + b.x * 2.9))
      p.fill(tree)
      p.ellipse((b.x + lean * 0.6) * k, (G - b.h * 0.42) * k, b.w * k, b.h * k)
      p.ellipse((b.x + b.w * 0.28 + lean) * k, (G - b.h * 0.3) * k, b.w * 0.7 * k, b.h * 0.7 * k)
    } else {
      const l = b.x - b.w / 2
      const r = b.x + b.w / 2
      const eave = G - b.h
      const ridge = eave - b.roof
      const s = b.s
      p.fill(house)
      p.rect(l * k, eave * k, b.w * k, (G - eave) * k)
      p.triangle((l - 0.12 * s) * k, (eave + 0.02 * s) * k, b.x * k, ridge * k, (r + 0.12 * s) * k, (eave + 0.02 * s) * k)
      if (b.chimney > 0) p.rect((b.x + b.w * 0.18) * k, (ridge + b.roof * 0.25 - b.chimney) * k, 0.18 * s * k, (b.chimney + b.roof * 0.4) * k)
      if (snow && snow.a > 0) {
        // The first snow on its roof: a cap from the ridge down, deepening as it settles.
        const u = 0.18 + 0.5 * snow.a
        p.fill(snow.color)
        p.triangle((b.x - (b.w / 2 + 0.12 * s) * u) * k, (ridge + b.roof * u) * k, b.x * k, (ridge - 0.02 * s) * k, (b.x + (b.w / 2 + 0.12 * s) * u) * k, (ridge + b.roof * u) * k)
        p.fill(house)
      }
      // Its windows and door, faint in the haze (a close sees a neighbour's wall, not a grey slab).
      p.fill(pane)
      const ww = Math.min(0.32 * s, b.w * 0.17)
      for (const u of [-0.27, 0.27]) p.rect((b.x + u * b.w - ww / 2) * k, (eave + b.h * 0.22) * k, ww * k, b.h * 0.26 * k)
      p.rect((b.x - 0.12 * s) * k, (G - b.h * 0.42) * k, 0.24 * s * k, b.h * 0.42 * k)
    }
  }
}

/* ------------------------------------------------------------------ beyond the street */

/**
 * Beyond the street, along the horizon behind the neighbours: a long low ridge, and on it the places of their whole
 * life, small: the church on its rise (its square tower and spire), the picnic hill with its one tree, the hospital (a
 * plain block, rows of windows), and between them a town on the slopes, a road and a railway on a viaduct over a
 * valley. By day it is faint in the haze over the neighbours' roofs; at dusk it goes to one silhouette against the
 * afterglow, the places of their life dark and the town's windows lighting one by one, its traffic and a late train
 * going by: other people's evenings, far off.
 *
 * It is drawn in the cells of the show's last frame (27 cells high round `LAST`): `x` along the street, `h` up from the
 * horizon. A camera drawing back from the house leaves a far ridge behind more slowly than the house, and a pan slides
 * it by less (`beyondAt`): through the long draw-back of the credits the house grows small and the world past his
 * street comes up round it, each of the places coming into the frame as it widens.
 */

/** The show's last frame: its middle along the street, and its height in cells. */
const LAST = { cx: 4.25, H: 27 }
/** How far beyond the street the ridge is, in the set's frame heights: the farther, the less a draw-back shrinks it. */
const DEEP = 12

/** Where the ridge stands for a frame `H` cells high round `cx`: drawn at x' = a + q x, y' = G - q h. */
export function beyondAt(H: number, cx: number): { a: number; q: number } {
  const r = H / (H + DEEP)
  const q = r / (LAST.H / (LAST.H + DEEP))
  return { a: cx + (LAST.cx - cx) * r - LAST.cx * q, q }
}

/** The places of their life along it (x in the last frame's cells). */
/**
 * The places of their life along it (x in the last frame's cells): the picnic hill between the left street lamp and
 * the house, the church between the house and the right lamp (each clear of the lamps at every width the camera
 * takes, by day and through the draw-back), the hospital out past the left lamp and the valley past the right one,
 * which come into the frame only as it widens through the credits.
 */
export const PLACES = { hospital: -15, hill: -4.4, church: 12.8, valley: 21.5 }

const bump = (x: number, at: number, half: number): number => {
  const u = (x - at) / half
  return Math.abs(u) >= 1 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * u)
}
const shelf = (x: number, at: number, flat: number, fall: number): number => 1 - smooth(Math.abs(x - at), flat, flat + fall)

/** The ridge's height over the horizon at x: a long roll of hills, the picnic hill, the church's rise, the hospital's shelf, the valley. */
function ridgeH(x: number): number {
  let h = 2.95 + 0.38 * Math.sin(x * 0.19 + 1.1) + 0.22 * Math.sin(x * 0.47 + 0.4) + 0.1 * Math.sin(x * 1.13 + 2)
  h += 1.5 * bump(x, PLACES.hill, 3.4) + 0.9 * bump(x, PLACES.church, 2.5)
  h -= 1.7 * bump(x, PLACES.valley, 3.2)
  const s = shelf(x, PLACES.hospital, 1.9, 1.4)
  return h + (3.2 - h) * s
}

/** The railway's height: along the ridge's face, and across the valley on its viaduct. */
const RAIL = 2.8
/** The road along the slope under it. */
const roadH = (x: number): number => 2.15 + 0.18 * Math.sin(x * 0.29 + 0.6)

const SPAN: [number, number] = [-48, 56]
const STEP = 0.5
/** The ridge's outline, precomputed. */
const RIDGE: number[] = Array.from({ length: Math.round((SPAN[1] - SPAN[0]) / STEP) + 1 }, (_, i) => ridgeH(SPAN[0] + i * STEP))

/** The viaduct: where the ground falls away under the railway, and its arches' piers. */
const VIADUCT = { x0: PLACES.valley - 2.6, x1: PLACES.valley + 2.6, piers: 6 }

interface Home {
  x: number
  y: number
  w: number
  wall: number
  roof: number
  /** Its windows: where along it, and when each is lit (show seconds; Infinity: never). */
  win: { u: number; on: number; off: number }[]
  /** 0 above the railway, 1 between it and the road, 2 below the road: the order they stand in, back to front. */
  tier: number
}

/** The town on the slopes: small houses, gable to the street, here and there, never on the places of their life. */
const TOWN: Home[] = (() => {
  const out: Home[] = []
  for (let i = 0; i < 96; i++) {
    const x = -30 + i * 0.66 + hash(i, 61) * 0.45
    if (Math.abs(x - PLACES.hill) < 2.9 || Math.abs(x - PLACES.church) < 1.9 || Math.abs(x - PLACES.hospital) < 2.5) continue
    if (x > VIADUCT.x0 - 0.3 && x < VIADUCT.x1 + 0.3) continue
    const top = ridgeH(x) - 0.42
    if (top < 2.0) continue
    const y = 1.9 + hash(i, 62) * (top - 1.9)
    const w = 0.34 + hash(i, 63) * 0.26
    const win = (w > 0.48 ? [-0.24, 0.24] : [0]).map((u, j) => {
      const r = hash(i, 64 + j)
      // Most come on as the dusk deepens, through the draw-back; some never; a few go out again late.
      const on = r < 0.2 ? Infinity : 223 + hash(i, 66 + j) * 30
      const off = hash(i, 68 + j) < 0.14 ? on + 5 + hash(i, 70 + j) * 9 : Infinity
      return { u, on, off }
    })
    out.push({ x, y, w, wall: 0.22 + hash(i, 72) * 0.09, roof: 0.15 + hash(i, 73) * 0.07, win, tier: y >= RAIL ? 0 : y >= roadH(x) ? 1 : 2 })
  }
  return out.sort((a, b) => b.y - a.y)
})()
/** The town by tier, back to front. */
const TIERS: Home[][] = [0, 1, 2].map((t) => TOWN.filter((b) => b.tier === t).sort((a, b) => a.x - b.x))

/** Trees on the ridge: soft blobs along its crest and here and there on its face. */
const COPSE: { x: number; y: number; w: number; h: number }[] = Array.from({ length: 70 }, (_, i) => {
  const x = SPAN[0] + 2 + hash(i, 75) * (SPAN[1] - SPAN[0] - 4)
  const crest = hash(i, 76) < 0.6
  const w = 0.35 + hash(i, 77) * 0.45
  return { x, y: crest ? ridgeH(x) - 0.12 : 2.0 + hash(i, 78) * (ridgeH(x) - 2.4), w, h: w * (0.7 + hash(i, 79) * 0.4) }
}).filter((b) => Math.abs(b.x - PLACES.hill) > 1.4 && Math.abs(b.x - PLACES.church) > 1.2 && Math.abs(b.x - PLACES.hospital) > 2.2)

/**
 * The trains along the ridge, one each way on the double track (the down train on the near one): when each sets off,
 * from where, how fast (cells a second; minus, to the left), and its carriages.
 */
const TRAINS: { t0: number; x0: number; v: number; cars: number; y: number }[] = [
  { t0: 228.5, x0: 36, v: -2.3, cars: 4, y: RAIL },
  { t0: 235, x0: -25, v: 2.5, cars: 6, y: RAIL - 0.12 },
]
const CAR = { len: 0.92, gap: 0.08, loco: 0.85 }

/** Cars along the road at dusk: their lights, a pair each way now and then. When, from where, how fast. */
const TRAFFIC: { t0: number; x0: number; v: number }[] = Array.from({ length: 40 }, (_, i) => {
  const left = hash(i, 81) < 0.5
  const v = (1.4 + hash(i, 82) * 0.9) * (left ? -1 : 1)
  return { t0: 205 + i * 1.35 + hash(i, 83) * 1.1, x0: left ? 33 : -24, v }
})

export interface BeyondLook {
  /** The ridge, its trees, the walls of what stands on it, the roofs and the spire, a window unlit. */
  land: string
  wood: string
  wall: string
  roof: string
  pane: string
  /** The railway, the viaduct, the train's and the cars' bodies. */
  iron: string
  /** 0 by day .. 1 at night: how far a lit window, a lit carriage or a car's lamps show. */
  lit: number
  T: number
}

/** The ridge and all on it, as much as the frame shows. `H` is the frame's height in cells (the show's 16:9 frame). */
export function drawBeyond(p: p5, k: number, f: { x0: number; x1: number; y0: number; y1: number; cx: number }, G: number, H: number, L: BeyondLook): void {
  const { a, q } = beyondAt(H, f.cx)
  if (f.y0 > G || f.y1 < G - 7 * q) return
  const xa = (f.x0 - a) / q - 1
  const xb = (f.x1 - a) / q + 1
  const T = L.T
  const R = (x0: number, h0: number, x1: number, h1: number) => p.rect(x0 * k, -h1 * k, (x1 - x0) * k, (h1 - h0) * k)
  // The many small flat shapes (the ridge's outline, its trees, the town) go straight onto the canvas, a path to a
  // colour, under the same transform.
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const box = (x0: number, h0: number, x1: number, h1: number) => ctx.rect(x0 * k, -h1 * k, (x1 - x0) * k, (h1 - h0) * k)
  const paint = (color: string) => {
    ctx.fillStyle = color
    ctx.fill()
  }
  p.push()
  p.translate(a * k, G * k)
  p.scale(q)
  p.noStroke()

  // The ridge, one soft shape down behind the neighbours' gardens, and its trees.
  const i0 = Math.max(0, Math.floor((xa - SPAN[0]) / STEP))
  const i1 = Math.min(RIDGE.length - 1, Math.ceil((xb - SPAN[0]) / STEP))
  ctx.beginPath()
  ctx.moveTo((SPAN[0] + i0 * STEP) * k, 0.4 * k)
  for (let i = i0; i <= i1; i++) ctx.lineTo((SPAN[0] + i * STEP) * k, -RIDGE[i] * k)
  ctx.lineTo((SPAN[0] + i1 * STEP) * k, 0.4 * k)
  ctx.closePath()
  paint(L.land)
  ctx.beginPath()
  for (const b of COPSE) {
    if (b.x < xa - 1 || b.x > xb + 1) continue
    ctx.moveTo((b.x + b.w / 2) * k, -(b.y + b.h * 0.4) * k)
    ctx.ellipse(b.x * k, -(b.y + b.h * 0.4) * k, (b.w / 2) * k, (b.h / 2) * k, 0, 0, Math.PI * 2)
  }
  paint(L.wood)

  if (PLACES.church > xa - 2 && PLACES.church < xb + 2) church(p, k, R, L, PLACES.church, ridgeH(PLACES.church) - 0.06)
  if (PLACES.hospital > xa - 3 && PLACES.hospital < xb + 3) hospital(p, R, L, PLACES.hospital, 3.15)
  if (PLACES.hill > xa - 2 && PLACES.hill < xb + 2) hillTree(p, k, L, PLACES.hill, ridgeH(PLACES.hill) - 0.05)

  const lamp = (on: number, off: number) => L.lit * smooth(T, on, on + 0.15) * (1 - smooth(T, off, off + 0.15))
  const homes = (tier: number) => {
    const all = TIERS[tier]
    let i0 = 0
    while (i0 < all.length && all[i0].x < xa - 1) i0++
    let i1 = all.length
    while (i1 > i0 && all[i1 - 1].x > xb + 1) i1--
    const shown = all.slice(i0, i1)
    ctx.beginPath()
    for (const b of shown) box(b.x - b.w / 2, b.y - 0.05, b.x + b.w / 2, b.y + b.wall)
    paint(L.wall)
    ctx.beginPath()
    for (const b of shown) {
      const l = b.x - b.w / 2 - 0.05
      ctx.moveTo(l * k, -(b.y + b.wall) * k)
      ctx.lineTo(b.x * k, -(b.y + b.wall + b.roof) * k)
      ctx.lineTo((l + b.w + 0.1) * k, -(b.y + b.wall) * k)
      ctx.closePath()
    }
    paint(L.roof)
    // Their windows: all dark first, then each lit one in the lamp's colour, as far as it has come on.
    ctx.beginPath()
    for (const b of shown) for (const w of b.win) box(b.x + w.u * b.w - 0.045, b.y + b.wall * 0.3, b.x + w.u * b.w + 0.045, b.y + b.wall * 0.3 + 0.085)
    paint(L.pane)
    if (L.lit <= 0.01) return
    ctx.fillStyle = '#FFE3A6'
    for (const b of shown) {
      for (const w of b.win) {
        const on = lamp(w.on, w.off)
        if (on <= 0.01) continue
        ctx.globalAlpha = on
        const wx = b.x + w.u * b.w - 0.045
        ctx.fillRect(wx * k, -(b.y + b.wall * 0.3 + 0.085) * k, 0.09 * k, 0.085 * k)
      }
    }
    ctx.globalAlpha = 1
  }
  homes(0)

  // The railway, cut along the ridge's face (too far off to see but for what runs on it), and over the valley its
  // viaduct, arch on arch.
  p.fill(L.iron)
  if (VIADUCT.x1 > xa && VIADUCT.x0 < xb) viaduct(p, k, R)
  for (const run of TRAINS) train(p, k, R, L, run, T, xa, xb)
  homes(1)

  // The road along the slope under it, and the cars' lamps on it: white ahead, red behind.
  if (L.lit > 0.02) {
    const cars: [number, number, number][] = []
    for (const c of TRAFFIC) {
      const s = T - c.t0
      if (s < 0) continue
      const x = c.x0 + c.v * s
      if (x < xa || x > xb || (c.v > 0 && x > 34) || (c.v < 0 && x < -25)) continue
      if (x > VIADUCT.x0 - 0.2 && x < VIADUCT.x1 + 0.2) continue
      cars.push([x, roadH(x), Math.sign(c.v)])
    }
    ctx.beginPath()
    for (const [x, y] of cars) box(x - 0.2, y, x + 0.2, y + 0.11)
    paint(L.iron)
    ctx.globalAlpha = L.lit
    for (const [color, ahead, r] of [
      ['#FFF0CC', 0.22, 0.043],
      ['#C9574B', -0.21, 0.03],
    ] as [string, number, number][]) {
      ctx.beginPath()
      for (const [x, y, dir] of cars) {
        ctx.moveTo((x + dir * ahead + r) * k, -(y + 0.05) * k)
        ctx.arc((x + dir * ahead) * k, -(y + 0.05) * k, r * k, 0, Math.PI * 2)
      }
      paint(color)
    }
    ctx.globalAlpha = 1
  }
  homes(2)
  p.pop()
}

type Box = (x0: number, h0: number, x1: number, h1: number) => void

/** The church on its rise, side on: the nave and its roof, three tall windows, the square tower and its spire. */
function church(p: p5, k: number, R: Box, L: BeyondLook, cx: number, y: number): void {
  const nave: [number, number] = [cx - 1.25, cx + 0.12]
  p.fill(L.wall)
  R(nave[0], y - 0.1, nave[1], y + 0.72)
  p.fill(L.roof)
  p.quad((nave[0] - 0.08) * k, -(y + 0.72) * k, (nave[1] + 0.02) * k, -(y + 0.72) * k, (nave[1] + 0.02) * k, -(y + 1.12) * k, (nave[0] + 0.2) * k, -(y + 1.12) * k)
  p.fill(L.pane)
  for (const u of [0.25, 0.6, 0.95]) R(nave[0] + u, y + 0.18, nave[0] + u + 0.11, y + 0.52)
  // The tower, the belfry's opening and cornice, the spire.
  const t0 = cx + 0.12
  const t1 = cx + 0.6
  p.fill(L.wall)
  R(t0, y - 0.1, t1, y + 1.75)
  p.fill(L.roof)
  R(t0 - 0.05, y + 1.75, t1 + 0.05, y + 1.83)
  p.triangle((t0 - 0.02) * k, -(y + 1.83) * k, (t1 + 0.02) * k, -(y + 1.83) * k, ((t0 + t1) / 2) * k, -(y + 3.05) * k)
  p.fill(L.pane)
  R(t0 + 0.14, y + 1.32, t1 - 0.14, y + 1.62)
  R(t0 + 0.17, y + 0.25, t1 - 0.17, y + 0.75)
}

/** The hospital on its shelf: a plain block and a lower wing, rows of windows, a small plant room on its flat roof. */
function hospital(p: p5, R: Box, L: BeyondLook, cx: number, y: number): void {
  const b0 = cx - 1.35
  const b1 = cx + 1.05
  p.fill(L.wall)
  R(b0, y - 0.15, b1, y + 1.75)
  R(b1, y - 0.15, b1 + 1.0, y + 1.0)
  p.fill(L.roof)
  R(b0 - 0.04, y + 1.75, b1 + 0.04, y + 1.83)
  R(b1, y + 1.0, b1 + 1.03, y + 1.07)
  R(cx - 0.75, y + 1.83, cx - 0.2, y + 2.07)
  p.fill(L.pane)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) R(b0 + 0.13 + c * 0.29, y + 0.18 + r * 0.38, b0 + 0.25 + c * 0.29, y + 0.33 + r * 0.38)
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) R(b1 + 0.14 + c * 0.29, y + 0.18 + r * 0.38, b1 + 0.26 + c * 0.29, y + 0.33 + r * 0.38)
}

/** Their tree on the picnic hill's crown: a short trunk forking, a broad crown of five soft clumps. */
function hillTree(p: p5, k: number, L: BeyondLook, x: number, y: number): void {
  p.fill(L.roof)
  p.quad((x - 0.07) * k, -y * k, (x + 0.08) * k, -y * k, (x + 0.02) * k, -(y + 0.75) * k, (x - 0.1) * k, -(y + 0.72) * k)
  p.fill(L.wood)
  for (const [dx, dy, w, h] of [
    [-0.55, 0.95, 0.8, 0.58],
    [0.5, 0.97, 0.8, 0.56],
    [-0.2, 1.3, 0.9, 0.62],
    [0.32, 1.28, 0.82, 0.6],
    [0.0, 1.05, 1.1, 0.6],
  ] as [number, number, number, number][]) p.ellipse((x + dx) * k, -(y + dy) * k, w * k, h * k)
}

/** The viaduct over the valley: its deck at the railway, piers down into the valley, an arch between each pair. */
function viaduct(p: p5, k: number, R: Box): void {
  const { x0, x1, piers } = VIADUCT
  const span = (x1 - x0) / piers
  R(x0, RAIL - 0.22, x1, RAIL)
  for (let i = 0; i < piers; i++) {
    const l = x0 + i * span
    const r = l + span
    const spring = RAIL - 0.22 - span * 0.45
    // The spandrel over the arch, and the pier under its left end.
    p.beginShape()
    p.vertex(l * k, -(RAIL - 0.2) * k)
    p.vertex(r * k, -(RAIL - 0.2) * k)
    p.vertex(r * k, -spring * k)
    for (let j = 1; j < 8; j++) {
      const ang = (j / 8) * Math.PI
      p.vertex(((l + r) / 2 + Math.cos(ang) * (span / 2 - 0.06)) * k, -(spring + Math.sin(ang) * span * 0.42) * k)
    }
    p.vertex(l * k, -spring * k)
    p.endShape(p.CLOSE)
    R(l - 0.07, 0, l + 0.07, spring)
  }
  R(x1 - 0.07, 0, x1 + 0.07, RAIL - 0.22 - span * 0.45)
}

/** The train on the railway: a locomotive and its carriages, their windows lit after dark. */
function train(p: p5, k: number, R: Box, L: BeyondLook, run: (typeof TRAINS)[number], T: number, xa: number, xb: number): void {
  if (T < run.t0) return
  const dir = Math.sign(run.v)
  const head = run.x0 + run.v * (T - run.t0)
  const y = run.y
  for (let i = 0; i <= run.cars; i++) {
    const behind = i === 0 ? 0 : CAR.loco + CAR.gap + (i - 1) * (CAR.len + CAR.gap)
    const len = i === 0 ? CAR.loco : CAR.len
    // Each car's left end, whichever way the train runs.
    const back = dir > 0 ? head - behind - len : head + behind
    const front = back + len
    if (front < xa || back > xb) continue
    p.fill(L.iron)
    p.rect(back * k, -(y + 0.3) * k, len * k, 0.28 * k, (i === 0 ? 0.1 : 0.03) * k)
    if (i === 0) continue
    p.fill(L.lit > 0.01 ? mixHex(L.pane, '#FFE3A6', L.lit) : L.pane)
    for (let w = 0; w < 5; w++) R(back + 0.08 + w * 0.17, y + 0.12, back + 0.17 + w * 0.17, y + 0.22)
  }
}

/**
 * The pixel look: Liftoff's frame, painted as it always is, then brought down to a coarse grid, snapped to a short
 * palette of Voyage's own colours through an ordered dither, and laid back over itself in hard blocks.
 *
 * - **The grid** is fixed to the 16:9 composition: `ROWS` blocks top to bottom, whatever the canvas's size, so a ball
 *   is the same handful of blocks across live, in a 1080p file and on the share card, and the cast keep their size.
 * - **The palette** (`PAINTS`) is measured from the Voyage take's own frames, with the cast's and the inks' colours
 *   kept exactly, then dulled a little: the farm's dust, the dark's navies, Edmunds' violet dusk, Miller's water.
 * - **The dither** pairs paints: each colour is the two paints that mix nearest to it and how much of the second, and
 *   a 4×4 Bayer matrix, anchored to the screen, says which a block takes. A fill that is a paint stays flat; a glow, a
 *   sky or an edge comes out in stepped bands with a checker between them, never a gradient.
 * - **The grain** is a sparse scatter of blocks nudged a step lighter or darker, re-dealt `SHIMMER` times a second and
 *   held in between, so sand, water, the dark and Gargantua's disc fizz in steps rather than glide.
 *
 * It reads the frame back at the grid's size only, so its cost is the same at any resolution.
 */

/** Blocks from the top of the 16:9 composition to its bottom. */
export const ROWS = 144
/** Times a second the grain is dealt again. */
export const SHIMMER = 8
/** Out of 256: the share of blocks the grain touches at one deal. */
const GRAIN = 18
/** How far, per channel, the grain moves a block it touches. */
const GRAIN_STEP = 18
/** How much of each paint's colour is kept: the rest goes to its own grey. */
const MUTE = 0.95
/** How far a paint's shade and light steps go, toward the darkest and lightest paints. */
const STEP = 0.14
/** Two paints nearer than this (in redmean distance) are one. */
const MERGE = 20
/** What mixing two paints costs, for how far apart they are: high, and a dusk is two neighbours, not black and white. */
const SPREAD = 1.1

/**
 * Voyage's paints, darkest to lightest: a median cut and a coverage cut of sixty stills across the whole take, with
 * Cooper, Brand, both Murphs, the years' grey, the inks and the worlds' named colours kept exactly, near twins merged.
 */
const PAINTS = [
  '#070914', '#101628', '#1C1F3A', '#2A1F17', '#2E2831', '#40251A', '#1B3A62', '#303654', '#46394A', '#6A2F1F',
  '#34506F', '#4D505B', '#1F5E98', '#665331', '#5C4D73', '#63534F', '#A0412A', '#447272', '#B4492F', '#7E5E58',
  '#8E594B', '#866628', '#4577A3', '#6E63C9', '#B9583E', '#4E8A8C', '#768151', '#E0533D', '#976E7A', '#658C82',
  '#A37E30', '#8C806C', '#A87C58', '#7C8C9C', '#8B967E', '#CC8345', '#8E9E62', '#9A958A', '#BA8C65', '#A8929A',
  '#7AA8A7', '#A3A262', '#9FA179', '#DB8776', '#8FA8C4', '#F09340', '#D9A441', '#E2AE3C', '#D8B36D', '#AEBABE',
  '#BBC08D', '#8FC6E6', '#C3BA9E', '#E8AB97', '#D4BE88', '#D3C6AF', '#F0C987', '#DECEAC', '#FBCF69', '#D9D4C6',
  '#CCDBDA', '#F5DEAD', '#ECE5D3', '#F7F1DC', '#FCF9F1',
]

/** The order a 4×4 block's cells take the second paint in: 0 first, 15 last. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Points a block is read at, across and down. */
const SUB = 3
/**
 * How far (summed over the channels) a sample of a block may stand from the block's average before the block is that
 * sample instead: an ink line, a star, a ball's edge stays a solid block rather than a smudge of it and the paper.
 */
const EDGE = 110

/** Paints considered for a colour's pair: its nearest few. */
const NEAR = 6

let palette: Uint8Array | null = null
/** By 15-bit colour: the first paint, the second, and sixteenths of the second (0 to 16). */
let first: Uint8Array | null = null
let second: Uint8Array | null = null
let share: Uint8Array | null = null

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Redmean: a cheap distance that weighs green and the reds as the eye does. */
function distance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rm = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)
}

/** The palette, dulled, and for every 15-bit colour the pair of paints and the mix that comes nearest it. Made once. */
function build(): void {
  const dark = hex(PAINTS[0])
  const light = hex(PAINTS[PAINTS.length - 1])
  const pal: number[][] = []
  for (const c of PAINTS) {
    const at = hex(c)
    // Each paint, and a step of it into the shade and into the light, so a grain or an edge stays in its own hue.
    for (const [to, f] of [[at, 0], [dark, STEP], [light, STEP]] as const) {
      const [r, g, b] = at.map((v, i) => v + (to[i] - v) * f)
      const grey = 0.3 * r + 0.59 * g + 0.11 * b
      const m = [r, g, b].map((v) => Math.round(grey + (v - grey) * MUTE))
      if (pal.some((k) => distance(k[0], k[1], k[2], m[0], m[1], m[2]) < MERGE)) continue
      pal.push(m)
    }
  }
  palette = new Uint8Array(pal.flat())
  first = new Uint8Array(32768)
  second = new Uint8Array(32768)
  share = new Uint8Array(32768)
  const order = pal.map((_, i) => i)
  const near = new Float64Array(pal.length)
  for (let key = 0; key < 32768; key++) {
    const R = ((key >> 10) << 3) + 4
    const G = (((key >> 5) & 31) << 3) + 4
    const B = ((key & 31) << 3) + 4
    for (let i = 0; i < pal.length; i++) near[i] = distance(R, G, B, pal[i][0], pal[i][1], pal[i][2])
    order.sort((a, b) => near[a] - near[b])
    let best = near[order[0]]
    let a0 = order[0]
    let b0 = order[0]
    let k0 = 0
    for (let i = 0; i < NEAR; i++) {
      for (let j = i + 1; j < NEAR; j++) {
        const a = pal[order[i]]
        const b = pal[order[j]]
        const apart = distance(a[0], a[1], a[2], b[0], b[1], b[2]) * SPREAD
        for (let k = 1; k < 16; k++) {
          const f = k / 16
          const err = distance(R, G, B, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f) + apart * f * (1 - f)
          if (err < best) {
            best = err
            a0 = order[i]
            b0 = order[j]
            k0 = k
          }
        }
      }
    }
    first[key] = a0
    second[key] = b0
    share[key] = k0
  }
}

/** The same 32 bits for the same block in the same deal, and others in the next. */
function hash(x: number, y: number, n: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(n, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

const clamp = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v)

let grid: HTMLCanvasElement | null = null

/** `Performance.finish`: the painted frame in `box`, its 16:9 composition `frame` pixels high, made pixels. */
export function pixelate(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, frame: number, t: number): void {
  if (!palette) build()
  const pal = palette!
  const one = first!
  const two = second!
  const mix = share!
  const block = Math.max(2, Math.round(frame / ROWS))
  const w = Math.ceil(box.w / block)
  const h = Math.ceil(box.h / block)
  if (!grid) grid = document.createElement('canvas')
  if (grid.width !== SUB * w || grid.height !== SUB * h) {
    grid.width = SUB * w
    grid.height = SUB * h
  }
  const g = grid.getContext('2d')!
  // Down, to `SUB`×`SUB` points a block, each exactly what was painted there: a line as thin as the points are apart
  // cannot pass between them, and is a whole sample somewhere rather than a tint on every one.
  g.imageSmoothingEnabled = false
  const sw = Math.min(w * block, ctx.canvas.width - box.x)
  const sh = Math.min(h * block, ctx.canvas.height - box.y)
  g.drawImage(ctx.canvas, box.x, box.y, sw, sh, 0, 0, SUB * w, SUB * h)
  const q = g.getImageData(0, 0, SUB * w, SUB * h).data
  const img = g.createImageData(w, h)
  const d = img.data
  const deal = Math.floor(t * SHIMMER)
  const at: number[] = []
  for (let v = 0; v < SUB; v++) for (let u = 0; u < SUB; u++) at.push((v * SUB * w + u) * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      // A block is its samples' average, unless one of them stands well out of it: then it is that one.
      const j = (SUB * y * SUB * w + SUB * x) * 4
      let r = 0
      let gg = 0
      let b = 0
      for (const o of at) {
        r += q[j + o]
        gg += q[j + o + 1]
        b += q[j + o + 2]
      }
      r /= at.length
      gg /= at.length
      b /= at.length
      let far = EDGE
      let pick = -1
      for (const o of at) {
        const off = Math.abs(q[j + o] - r) + Math.abs(q[j + o + 1] - gg) + Math.abs(q[j + o + 2] - b)
        if (off > far) {
          far = off
          pick = o
        }
      }
      if (pick >= 0) {
        r = q[j + pick]
        gg = q[j + pick + 1]
        b = q[j + pick + 2]
      }
      const n = hash(x, y, deal)
      const push = (n & 255) < GRAIN ? (n & 256 ? GRAIN_STEP : -GRAIN_STEP) : 0
      const key = ((clamp(r + push) >> 3) << 10) | ((clamp(gg + push) >> 3) << 5) | (clamp(b + push) >> 3)
      const p = (mix[key] > BAYER[((y & 3) << 2) | (x & 3)] ? two[key] : one[key]) * 3
      d[i] = pal[p]
      d[i + 1] = pal[p + 1]
      d[i + 2] = pal[p + 2]
      d[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  // Up: hard blocks, from the frame's top left corner, clipped to it.
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(grid, 0, 0, w, h, box.x, box.y, w * block, h * block)
  ctx.restore()
}

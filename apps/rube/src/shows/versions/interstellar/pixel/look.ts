import { areaAt, paintsOf, type Area } from './palette'

/**
 * The pixel look: Liftoff's frame, painted as it always is (with the pixel take's own skies, `sky.ts`), then read
 * back as a coarse grid of blocks, each block snapped to one paint of the area's ramps (`palette.ts`), and laid back
 * over the frame as hard squares at a whole number of the canvas's pixels each.
 *
 * - **The grid** is fixed to the 16:9 composition, `ROWS` blocks top to bottom whatever the canvas's size, so the cast
 *   are the size they are in Voyage, drawn in fewer, bigger pixels. A block is `block` device pixels square, a whole
 *   number, and the grid is drawn up from a canvas of one pixel a block with no smoothing: no block is ever split or
 *   blended with its neighbour.
 * - **A block is one paint, never an average.** It is read at `SUB`×`SUB` points, each graded and snapped to a paint
 *   on its own, and the block takes the paint most of them landed on. So a fill stays flat, an edge stays hard, and a
 *   gradient comes out in three or four bands of the ramp. A line of ink that crosses a block wins it if it holds a
 *   few of its points, so the drawing's ink comes out as a one-block outline; a star on the dark does the same.
 * - **Nothing moves that the show does not move.** No grain, no noise and no dither: a block changes only when what
 *   is under it does.
 */

/** Blocks from the top of the 16:9 composition to its bottom: a handheld's chunk, not a fine screen's. */
export const ROWS = 108
/** Points a block is read at, across and down. */
const SUB = 4
/** How much darker than the block's paint (in luminance) a point must be to count as ink. */
const INK = 60
/** How many points of a block ink needs to take it (a light on the dark needs two). */
const VOTES = 2
/** What a block was read as: a fill (taken whole), or a line of ink (taken by its ink). */
const FLAT = 1
const LINE = 2
/** A block whose points span less luminance than this is a fill or a gradient, and is taken whole. */
const SMOOTH = 24
/** Below this luminance a block is the dark, and a light in it (a star, a window) is kept. */
const DARK = 70
/** How much brighter than the dark a point must be to count as a light in it. */
const LIGHT = 80
/** How much lighter a neighbouring block must be for this one to be drawn as the edge of a shape against it. */
const EDGE = 75

/** The size of a block, in the canvas's own pixels, for a 16:9 composition `frame` of them high. */
export const blockOf = (frame: number): number => Math.max(2, Math.round(frame / ROWS))

/**
 * Where the last frame's grid started and how big its blocks were, in the canvas's own pixels: what the skies snap
 * their stars to, so that a star is exactly one block.
 */
export const grid = { x: 0, y: 0, block: 0 }

/** A set of ramps, ready: its paints, their luminance, and the nearest paint to every 15-bit colour. */
interface Paints {
  rgb: Uint8Array
  lum: Float32Array
  near: Uint8Array
  /** For each paint, the paint it takes as an outline. */
  outline: Uint8Array
}

const sets = new Map<Area['ramps'], Paints>()

/** Redmean: a cheap distance that weighs green and the reds as the eye does. */
function distance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rm = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db
}

function paints(ramps: Area['ramps']): Paints {
  const have = sets.get(ramps)
  if (have) return have
  const { rgb: pal, outline } = paintsOf(ramps)
  const rgb = new Uint8Array(pal.flat())
  const lum = new Float32Array(pal.map(([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b))
  const near = new Uint8Array(32768)
  for (let key = 0; key < 32768; key++) {
    const R = ((key >> 10) << 3) + 4
    const G = (((key >> 5) & 31) << 3) + 4
    const B = ((key & 31) << 3) + 4
    let best = Infinity
    let at = 0
    for (let i = 0; i < pal.length; i++) {
      const d = distance(R, G, B, pal[i][0], pal[i][1], pal[i][2])
      if (d < best) {
        best = d
        at = i
      }
    }
    near[key] = at
  }
  const made = { rgb, lum, near, outline: new Uint8Array(outline) }
  sets.set(ramps, made)
  return made
}

const clamp = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v)

let reader: HTMLCanvasElement | null = null
let blocks: HTMLCanvasElement | null = null

/** `Performance.finish`: the painted frame in `box`, its 16:9 composition `frame` pixels high, made pixels. */
export function pixelate(ctx: CanvasRenderingContext2D, box: { x: number; y: number; w: number; h: number }, frame: number, t: number): void {
  const { area, was, u } = areaAt(t)
  const set = paints(area.ramps)
  const { rgb, lum, near, outline } = set
  const mix = (a: number, b: number) => a + (b - a) * u
  const [tr, tg, tb] = [0, 1, 2].map((i) => mix(was.tint[i], area.tint[i]))
  const sat = mix(was.sat, area.sat)
  const con = mix(was.contrast, area.contrast)

  const block = blockOf(frame)
  Object.assign(grid, { x: box.x, y: box.y, block })
  const w = Math.ceil(box.w / block)
  const h = Math.ceil(box.h / block)
  if (!reader) reader = document.createElement('canvas')
  if (!blocks) blocks = document.createElement('canvas')
  if (reader.width !== SUB * w || reader.height !== SUB * h) {
    reader.width = SUB * w
    reader.height = SUB * h
  }
  if (blocks.width !== w || blocks.height !== h) {
    blocks.width = w
    blocks.height = h
  }
  const r = reader.getContext('2d', { willReadFrequently: true })!
  // Down to `SUB`×`SUB` points a block, each exactly one pixel of what was painted (no smoothing, so no averaging).
  // The last row and column of blocks may hang off the canvas: their points there are left empty and not counted.
  r.clearRect(0, 0, reader.width, reader.height)
  r.imageSmoothingEnabled = false
  const sw = Math.min(w * block, ctx.canvas.width - box.x)
  const sh = Math.min(h * block, ctx.canvas.height - box.y)
  r.drawImage(ctx.canvas, box.x, box.y, sw, sh, 0, 0, (SUB * sw) / block, (SUB * sh) / block)
  const q = r.getImageData(0, 0, SUB * w, SUB * h).data

  const b = blocks.getContext('2d')!
  const img = b.createImageData(w, h)
  const out = img.data
  const votes = new Uint8Array(rgb.length / 3)
  const at = new Uint8Array(SUB * SUB)
  const cell = new Uint8Array(w * h)
  const kind = new Uint8Array(w * h)
  const row = SUB * w * 4
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = 0
      let sr = 0
      let sg = 0
      let sb = 0
      let lo = 255
      let hi = 0
      for (let v = 0; v < SUB; v++) {
        let j = (SUB * y + v) * row + SUB * x * 4
        for (let s = 0; s < SUB; s++, j += 4) {
          if (q[j + 3] === 0) continue
          // The area's grade: a tint, then saturation round the grey, then contrast round the middle.
          let R = q[j] * tr
          let G = q[j + 1] * tg
          let B = q[j + 2] * tb
          const l = 0.299 * R + 0.587 * G + 0.114 * B
          R = clamp(128 + (l + (R - l) * sat - 128) * con)
          G = clamp(128 + (l + (G - l) * sat - 128) * con)
          B = clamp(128 + (l + (B - l) * sat - 128) * con)
          sr += R
          sg += G
          sb += B
          const L = 0.299 * R + 0.587 * G + 0.114 * B
          if (L < lo) lo = L
          if (L > hi) hi = L
          at[n++] = near[((R >> 3) << 10) | ((G >> 3) << 5) | (B >> 3)]
        }
      }
      if (!n) continue
      // A block with nothing in it but a sky, a glow or a fill is its own colour, snapped: so a gradient steps in
      // straight bands, and never in a ragged row of whichever paint its points happened to land on.
      if (hi - lo < SMOOTH) {
        cell[y * w + x] = near[(((sr / n) >> 3) << 10) | (((sg / n) >> 3) << 5) | ((sb / n) >> 3)]
        kind[y * w + x] = FLAT
        continue
      }
      // Otherwise the paint most of the block's points landed on,
      let mode = at[0]
      for (let i = 0; i < n; i++) votes[at[i]]++
      for (let i = 0; i < n; i++) if (votes[at[i]] > votes[mode]) mode = at[i]
      // unless a line of ink crosses it (the commonest ink of it wins), or a light stands in the dark (the brightest).
      const base = lum[mode]
      let ink = 0
      let dark = -1
      let lit = 0
      let light = mode
      for (let i = 0; i < n; i++) {
        const L = lum[at[i]]
        if (L <= base - INK) {
          ink++
          if (dark < 0 || votes[at[i]] > votes[dark] || (votes[at[i]] === votes[dark] && L < lum[dark])) dark = at[i]
        } else if (base < DARK && L >= base + LIGHT) {
          lit++
          if (L > lum[light]) light = at[i]
        }
      }
      for (let i = 0; i < n; i++) votes[at[i]] = 0
      cell[y * w + x] = ink >= VOTES ? dark : lit >= 2 ? light : mode
      kind[y * w + x] = ink >= VOTES ? LINE : 0
    }
  }
  // Tidying, as a pixel artist would: a one-block tooth on the edge of a band joins the band it sticks out of, and a
  // fleck of ink with no ink beside it (a line too thin to hold) is dropped for what is under it.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (kind[i] === FLAT) {
        if (cell[i - 1] === cell[i + 1] && cell[i - 1] !== cell[i] && kind[i - 1] === FLAT) cell[i] = cell[i - 1]
        else if (cell[i - w] === cell[i + w] && cell[i - w] !== cell[i] && kind[i - w] === FLAT) cell[i] = cell[i - w]
      } else if (kind[i] === LINE) {
        let alone = true
        for (const o of [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1]) if (kind[i + o] === LINE) alone = false
        if (alone) {
          const a = cell[i - 1]
          cell[i] = a === cell[i + 1] || a === cell[i - w] ? a : cell[i + 1]
          kind[i] = 0
        }
      }
    }
  }
  // Outlines: a block on the dark side of a hard edge takes the darkest paint of its own ramp, so every shape that
  // stands against something lighter is ringed in its own shade, as a sprite is.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      let me = cell[i]
      const L = lum[me] + EDGE
      if ((x > 0 && lum[cell[i - 1]] > L) || (x + 1 < w && lum[cell[i + 1]] > L) || (y > 0 && lum[cell[i - w]] > L) || (y + 1 < h && lum[cell[i + w]] > L)) {
        me = outline[me]
      }
      const o = i * 4
      out[o] = rgb[me * 3]
      out[o + 1] = rgb[me * 3 + 1]
      out[o + 2] = rgb[me * 3 + 2]
      out[o + 3] = 255
    }
  }
  b.putImageData(img, 0, 0)
  // Up: one block for each pixel of the small canvas, a whole number of the canvas's pixels square, clipped to the frame.
  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(blocks, 0, 0, w, h, box.x, box.y, w * block, h * block)
  ctx.restore()
}

import { mixHex } from '../../../../parts'
import { STONES, since, type Stone } from './path'
import { hash, osc, smooth, type Sky } from './world'
import type { Ctx2D } from './frame'

/**
 * Bougainvillea on the colonnade, as on the far shore's islands: on twenty of its stones, a vine climbs one column
 * from the sea and spills over the slab in a cascade of magenta, the one strong colour in the morning's pale picture.
 * And it answers the melody: as the ball comes down on a flowering stone, on its note, a few petals shake loose and
 * drift down to the water, and float there a while.
 */

/** Which stones flower: some of the Gymnopédie's, never two side by side, not those with a gull on them. Which column. */
export const BLOSSOM = new Map<number, { side: number; size: number }>()

/** Set from `stones.ts`, which knows where the gulls perch. */
export function plant(perched: Set<number>): void {
  BLOSSOM.clear()
  // Never two side by side.
  let last = -10
  for (const s of STONES) {
    if (s.piece !== 0 || perched.has(s.index) || hash(s.index, 601) > 0.32 || s.index - last < 3) continue
    last = s.index
    BLOSSOM.set(s.index, { side: hash(s.index, 602) < 0.5 ? 0 : 1, size: 0.75 + 0.5 * hash(s.index, 603) })
  }
}

interface Spray {
  /** Florets: centre (cells across from the segment's front foot, and down from its top), radius, shade 0..2. */
  flowers: [number, number, number, number][]
  leaves: [number, number, number, number][]
  /** Where its column is across, and which way the cascade spills. */
  x0: number
  toward: number
  capH: number
  /** Its blossoms and leaves, one path to a colour (`GREENS`, then `PINKS`), made on first use. */
  paths?: Path2D[]
}

const sprays = new Map<string, Spray>()

/** A stone's cascade, for a segment `w` wide: worked out once. */
function sprayOf(stone: Stone, w: number): Spray {
  const key = `${stone.index}|${w.toFixed(3)}`
  const got = sprays.get(key)
  if (got) return got
  const b = BLOSSOM.get(stone.index)!
  const seed = stone.index
  const lintel = w > 0.62
  const shafts = lintel ? [0.14, w - 0.14] : [w / 2]
  const x0 = shafts[Math.min(shafts.length - 1, b.side)]
  const capH = lintel ? 0.09 : 0.06
  // It spills along the slab from over its column, towards the middle, hanging longest by the column.
  const toward = x0 < w / 2 ? 1 : -1
  const span = (lintel ? Math.min(0.55, w * 0.45) : 0.22) * b.size
  const hang = 0.42 * b.size
  const flowers: Spray['flowers'] = []
  const leaves: Spray['leaves'] = []
  const n = Math.round(72 * b.size)
  for (let i = 0; i < n; i++) {
    const a = hash(seed, i, 611)
    const x = x0 - 0.06 + toward * a * span + (hash(seed, i, 612) - 0.5) * 0.05
    const reach = hang * (1 - a) ** 1.4 * (0.25 + 0.75 * hash(seed, i, 613))
    const y = capH + 0.01 + reach + (hash(seed, i, 614) - 0.5) * 0.03
    const r = 0.02 + 0.02 * hash(seed, i, 615) * (1 - 0.4 * reach / hang)
    if (hash(seed, i, 616) < 0.32) leaves.push([x + 0.01, y - 0.015, r * 1.15, hash(seed, i, 617) < 0.5 ? 0 : 1])
    else flowers.push([x, y, r, Math.floor(hash(seed, i, 618) * 3)])
  }
  // Over the slab's top edge a little too, but never on it: the ball rolls there.
  for (let i = 0; i < 8; i++) {
    const a = hash(seed, i, 621)
    flowers.push([x0 + toward * a * span * 0.7, capH * 0.35 + 0.02 * hash(seed, i, 622), 0.014 + 0.01 * hash(seed, i, 623), Math.floor(hash(seed, i, 624) * 3)])
  }
  const out = { flowers, leaves, x0, toward, capH }
  sprays.set(key, out)
  return out
}

const PINKS = ['#C2306F', '#D9478A', '#E978AE']
const GREENS = ['#3F6A47', '#5C8452']

/** The day's light on a colour: full by day, greyed in the shower, gone to dusk colours as the light goes. */
const dimmed = (hex: string, day: Sky) => mixHex(mixHex(hex, day.lit, 0.12), mixHex(day.top, day.sea, 0.5), 0.15 + 0.7 * day.night)

/** The greens and the pinks under the day's light, worked out once a frame. */
let coloursFor: Sky | null = null
let colourList: string[] = []
function coloursAt(day: Sky): string[] {
  if (day !== coloursFor) {
    coloursFor = day
    colourList = [...GREENS, ...PINKS].map((c) => dimmed(c, day))
  }
  return colourList
}

/** Round blobs of one shade, as one path. */
function blobs(list: [number, number, number, number][], shade: number): Path2D {
  const path = new Path2D()
  for (const [x, y, r, s] of list) {
    if (s !== shade) continue
    path.moveTo(x + r, y)
    path.arc(x, y, r, 0, Math.PI * 2)
  }
  return path
}

/**
 * A flowering stone's bougainvillea, in a segment's frame (its front foot at the origin, up the frame's up, `k` pixels
 * a cell), `h` tall and `w` wide; and the petals the ball's landing shook loose.
 */
export function drawBlossom(ctx: Ctx2D, k: number, stone: Stone, w: number, h: number, day: Sky, t: number): void {
  const spray = sprayOf(stone, w)
  const { x0, toward, capH } = spray
  ctx.save()
  ctx.scale(k, k)
  ctx.translate(0, -h)
  // The vine, from the sea up the column's side, winding, a leaf here and there (as tall as the stone stands now).
  const vineLeaves: [number, number, number, number][] = []
  ctx.strokeStyle = dimmed('#4A5A3A', day)
  ctx.lineWidth = 0.012
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i <= 24; i++) {
    const q = i / 24
    const x = x0 - toward * 0.05 + 0.035 * Math.sin(q * 11 + stone.index)
    const y = h * (1 - q) + capH * q
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
    if (i % 3 === 1) vineLeaves.push([x + 0.025 * (i % 2 ? 1 : -1), y, 0.018, 1])
  }
  ctx.stroke()
  spray.paths ??= [
    ...GREENS.map((_, i) => blobs(spray.leaves, i)),
    ...PINKS.map((_, i) => blobs(spray.flowers, i)),
  ]
  const colours = coloursAt(day)
  spray.paths.forEach((path, i) => {
    ctx.fillStyle = colours[i]
    ctx.fill(path)
  })
  // The vine's own leaves, which go with its height.
  ctx.fillStyle = colours[1]
  ctx.fill(blobs(vineLeaves, 1))
  ctx.restore()
  // Petals shaken loose by the ball's landing, on its note: drifting down to the sea and floating there.
  const s = since(t, stone.touches[0])
  if (s < 0 || s > 11) return
  ctx.save()
  ctx.scale(k, k)
  // Within whatever the stones are faded by (as the camera crosses to their far-off drawing).
  const base = ctx.globalAlpha
  for (let i = 0; i < 10; i++) {
    const [fx, fy] = spray.flowers[Math.floor(hash(stone.index, i, 631) * spray.flowers.length)]
    const delay = 0.15 * hash(stone.index, i, 632)
    const q = Math.max(0, s - delay)
    // Falling slowly, fluttering side to side, carried a little back the way the ball came.
    const y0 = fy - h
    const fall = 0.3 * q + 0.06 * q * q
    const y = Math.min(0, y0 + fall)
    const landed = y0 + fall >= 0
    const x = fx - 0.04 * q + 0.06 * Math.sin(2.2 * q + 6.28 * hash(stone.index, i, 633)) * (landed ? 0.3 : 1)
    const turn = landed ? 0.2 : Math.sin(3.1 * q + i) * 1.2
    const a = smooth(q, 0, 0.1) * (1 - smooth(s, 8, 11))
    if (a < 0.01) continue
    ctx.globalAlpha = base * a
    ctx.fillStyle = mixHex(PINKS[i % 3], day.lit, 0.15 + 0.3 * day.night)
    ctx.beginPath()
    ctx.ellipse(x, landed ? -0.004 + 0.004 * osc(t, 0.2, i) : y, 0.03, landed ? 0.009 : 0.016, turn, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

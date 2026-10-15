import { mixHex } from '../../../../../parts'
import { HOME, INK } from '../worlds'

/**
 * The house's papers and panelling, inside (the director's, drawn by `inside.ts` over each room's plain paper and under
 * everything else): a home, not a set. Each room has its own paper, chosen once and lived with:
 *
 * - the living room a faint warm stripe with a small rosebud down each pale band, over painted panelling to the chair
 *   rail;
 * - the hall and the landing a dusty-rose trellis with a dot at each crossing, over the same panelling;
 * - the nursery a scatter of small white stars on its pale yellow.
 *
 * All of it is quiet: a pattern only a few percent off its paper, so the machines, the two of them and the light read
 * over it as they did over the plain paper. It fades with the years (`age`), as old paper does, and in the nursery
 * once the nursery is given up (`nurseryFade`).
 *
 * Drawn straight onto the canvas (one path per colour, clipped to the room and the frame): the storm's wide sees every
 * room at once.
 */

export type Box = { x0: number; x1: number; y0: number; y1: number }

/** The chair rail's height (the windows' sills sit on it), and the skirting's top. */
export const RAIL = -0.95
const SKIRT = 0.01

const SAGE = '#86B5A1'
const ROSE = '#C98A86'

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`
}

/** The part of `room` the frame sees (a little past it), or null. */
function seen(room: Box, f: Box): Box | null {
  const b = { x0: Math.max(room.x0, f.x0 - 0.5), x1: Math.min(room.x1, f.x1 + 0.5), y0: Math.max(room.y0, f.y0 - 0.5), y1: Math.min(room.y1, f.y1 + 0.5) }
  return b.x1 > b.x0 && b.y1 > b.y0 ? b : null
}

function clipTo(ctx: CanvasRenderingContext2D, k: number, b: Box): void {
  ctx.beginPath()
  ctx.rect(b.x0 * k, b.y0 * k, (b.x1 - b.x0) * k, (b.y1 - b.y0) * k)
  ctx.clip()
}

/**
 * The living room's paper: a faint warm stripe, a shade of the paper itself (a green one, or hairlines either side,
 * read as drapes hung down the wall), and a rosebud on two leaves down each pale band.
 */
export function stripe(ctx: CanvasRenderingContext2D, k: number, room: Box, b: Box, paper: string, fade: number): void {
  const period = 0.44
  const band = 0.13
  const n0 = Math.floor((b.x0 - room.x0) / period) - 1
  const n1 = Math.ceil((b.x1 - room.x0) / period) + 1
  ctx.fillStyle = mixHex(paper, HOME.wood, 0.075 * fade)
  for (let i = n0; i <= n1; i++) {
    const x = room.x0 + i * period
    ctx.fillRect(x * k, b.y0 * k, band * k, (b.y1 - b.y0) * k)
  }
  // The rosebuds: a leaf, then the bud on it; every other band half a step down, so they lie on a diagonal.
  const step = 0.5
  const r = 0.03
  const leaves = new Path2D()
  const buds = new Path2D()
  for (let i = n0; i <= n1; i++) {
    const x = room.x0 + i * period + band + (period - band) / 2
    const off = (((i % 2) + 2) % 2) * step * 0.5
    const j0 = Math.floor((b.y0 - room.y0 - off) / step) - 1
    const j1 = Math.ceil((b.y1 - room.y0 - off) / step) + 1
    for (let j = j0; j <= j1; j++) {
      const y = room.y0 + off + j * step + 0.18
      // Each leaf its own closed shape (an ellipse joins the last point with a line unless moved to its start).
      for (const side of [-1, 1]) {
        const lx = x + side * 0.03
        const ly = y + 0.035
        const turn = side * 0.5
        leaves.moveTo((lx + 0.038 * Math.cos(turn)) * k, (ly + 0.038 * Math.sin(turn)) * k)
        leaves.ellipse(lx * k, ly * k, 0.038 * k, 0.016 * k, turn, 0, Math.PI * 2)
      }
      buds.moveTo((x + r) * k, y * k)
      buds.arc(x * k, y * k, r * k, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = mixHex(paper, SAGE, 0.3 * fade)
  ctx.fill(leaves)
  ctx.fillStyle = mixHex(paper, ROSE, 0.3 * fade)
  ctx.fill(buds)
}

/** The hall's paper: a fine dusty-rose trellis of diamonds, a dot where the lines cross. */
function trellis(ctx: CanvasRenderingContext2D, k: number, room: Box, b: Box, paper: string, fade: number): void {
  const w = 0.4
  const h = 0.52
  const slope = h / w
  ctx.strokeStyle = mixHex(paper, ROSE, 0.26 * fade)
  ctx.lineWidth = Math.max(0.6, 0.014 * k)
  ctx.beginPath()
  // Lines one way and the other, through every crossing of the lattice (x0 + i·w, y0 + j·h) and its half-steps.
  const span = b.y1 - b.y0
  const i0 = Math.floor((b.x0 - room.x0 - span / slope) / w) - 1
  const i1 = Math.ceil((b.x1 - room.x0 + span / slope) / w) + 1
  for (let i = i0; i <= i1; i++) {
    const x = room.x0 + i * w
    // Through (x, room.y0): down to the right, and down to the left.
    const ya = b.y0
    const yb = b.y1
    ctx.moveTo((x + (ya - room.y0) / slope) * k, ya * k)
    ctx.lineTo((x + (yb - room.y0) / slope) * k, yb * k)
    ctx.moveTo((x - (ya - room.y0) / slope) * k, ya * k)
    ctx.lineTo((x - (yb - room.y0) / slope) * k, yb * k)
  }
  ctx.stroke()
  const dots = new Path2D()
  const r = 0.026
  const ci0 = Math.floor((b.x0 - room.x0) / w) - 1
  const ci1 = Math.ceil((b.x1 - room.x0) / w) + 1
  const cj0 = Math.floor((b.y0 - room.y0) / (h / 2)) - 1
  const cj1 = Math.ceil((b.y1 - room.y0) / (h / 2)) + 1
  for (let j = cj0; j <= cj1; j++) {
    const y = room.y0 + (j * h) / 2
    const odd = ((j % 2) + 2) % 2
    for (let i = ci0; i <= ci1; i++) {
      const x = room.x0 + i * w + (odd * w) / 2
      dots.moveTo((x + r) * k, y * k)
      dots.arc(x * k, y * k, r * k, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = mixHex(paper, ROSE, 0.42 * fade)
  ctx.fill(dots)
}

/** The nursery's paper: small five-pointed white stars on an offset grid, each a little turned. */
function stars(ctx: CanvasRenderingContext2D, k: number, room: Box, b: Box, paper: string, fade: number): void {
  const w = 0.42
  const h = 0.42
  const path = new Path2D()
  const i0 = Math.floor((b.x0 - room.x0) / w) - 1
  const i1 = Math.ceil((b.x1 - room.x0) / w) + 1
  const j0 = Math.floor((b.y0 - room.y0) / h) - 1
  const j1 = Math.ceil((b.y1 - room.y0) / h) + 1
  for (let j = j0; j <= j1; j++) {
    const odd = ((j % 2) + 2) % 2
    for (let i = i0; i <= i1; i++) {
      const cx = room.x0 + i * w + (odd * w) / 2 + 0.1
      const cy = room.y0 + j * h + 0.14
      const big = ((i + j) % 3 + 3) % 3 === 0
      const R = (big ? 0.06 : 0.042) * k
      const turn = ((i * 7 + j * 3) % 5) * 0.25
      for (let v = 0; v < 10; v++) {
        const a = turn - Math.PI / 2 + (v * Math.PI) / 5
        const rr = v % 2 === 0 ? R : R * 0.45
        const px = cx * k + Math.cos(a) * rr
        const py = cy * k + Math.sin(a) * rr
        if (v === 0) path.moveTo(px, py)
        else path.lineTo(px, py)
      }
      path.closePath()
    }
  }
  ctx.fillStyle = mixHex(paper, '#FFFDF4', 0.55 * fade)
  ctx.fill(path)
}

/**
 * The panelling under the chair rail: a painted dado, a shade creamier than the paper, in long raised panels between
 * stiles, and the rail itself a moulding with a highlight along its top.
 */
function dado(ctx: CanvasRenderingContext2D, k: number, room: Box, b: Box, paper: string, fade: number): void {
  const y0 = RAIL
  const y1 = SKIRT
  if (b.y1 <= y0 || b.y0 >= y1) return
  const paint = mixHex(mixHex(paper, HOME.trim, 0.42), paper, 1 - fade)
  ctx.fillStyle = paint
  ctx.fillRect(b.x0 * k, y0 * k, (b.x1 - b.x0) * k, (y1 - y0) * k)
  // The panels: a stile every `pitch`, each panel's field set in a little, its edges a shade under the paint.
  const pitch = 0.92
  const stile = 0.11
  const n = Math.max(1, Math.round((room.x1 - room.x0) / pitch))
  const step = (room.x1 - room.x0) / n
  const i0 = Math.max(0, Math.floor((b.x0 - room.x0) / step) - 1)
  const i1 = Math.min(n - 1, Math.ceil((b.x1 - room.x0) / step) + 1)
  const line = Math.max(0.6, 0.012 * k)
  ctx.lineWidth = line
  ctx.strokeStyle = rgba(INK, 0.11 * fade)
  ctx.beginPath()
  for (let i = i0; i <= i1; i++) {
    const px0 = room.x0 + i * step + stile
    const px1 = room.x0 + (i + 1) * step - stile
    ctx.rect(px0 * k, (y0 + 0.16) * k, (px1 - px0) * k, (y1 - 0.14 - (y0 + 0.16)) * k)
  }
  ctx.stroke()
  // The field's light edge (its top and left), so it reads raised.
  ctx.strokeStyle = rgba('#FFFFFF', 0.32 * fade)
  ctx.beginPath()
  for (let i = i0; i <= i1; i++) {
    const px0 = room.x0 + i * step + stile + 0.025
    const px1 = room.x0 + (i + 1) * step - stile - 0.025
    ctx.moveTo(px0 * k, (y1 - 0.165) * k)
    ctx.lineTo(px0 * k, (y0 + 0.185) * k)
    ctx.lineTo(px1 * k, (y0 + 0.185) * k)
  }
  ctx.stroke()
  // The rail: a moulding, cream, an inked line under it and a highlight on its top.
  ctx.fillStyle = mixHex(HOME.trim, paper, 0.25)
  ctx.fillRect(b.x0 * k, (y0 - 0.035) * k, (b.x1 - b.x0) * k, 0.07 * k)
  ctx.fillStyle = rgba(INK, 0.3)
  ctx.fillRect(b.x0 * k, (y0 + 0.035) * k, (b.x1 - b.x0) * k, line)
  ctx.fillStyle = rgba(INK, 0.16)
  ctx.fillRect(b.x0 * k, (y0 - 0.035) * k, (b.x1 - b.x0) * k, line)
}

export interface Papers {
  living: Box
  hall: Box
  landing: Box
  nursery: Box
  paper: string
  hallPaper: string
  nurseryPaper: string
  /** The years on the house, 0..1, and how far the nursery has been given up, 0..1. */
  age: number
  nurseryFade: number
}

/** Every room's pattern and panelling, where the frame sees it. */
export function drawPapers(ctx: CanvasRenderingContext2D, k: number, f: Box, s: Papers): void {
  // Old paper loses its print before its ground: the pattern a third fainter by the last years.
  const fade = 1 - 0.35 * s.age
  const rooms: [Box, (ctx: CanvasRenderingContext2D, k: number, room: Box, b: Box, paper: string, fade: number) => void, string, number, boolean][] = [
    [s.living, stripe, s.paper, fade, true],
    [s.hall, trellis, s.hallPaper, fade, true],
    [s.landing, trellis, s.hallPaper, fade, false],
    [s.nursery, stars, s.nurseryPaper, 1 - 0.6 * s.nurseryFade, false],
  ]
  for (const [room, print, paper, a, panelled] of rooms) {
    const b = seen(room, f)
    if (!b) continue
    ctx.save()
    clipTo(ctx, k, b)
    const above = panelled ? { ...b, y1: Math.min(b.y1, RAIL) } : b
    if (above.y1 > above.y0) {
      ctx.save()
      clipTo(ctx, k, above)
      print(ctx, k, room, above, paper, a)
      ctx.restore()
    }
    if (panelled) dado(ctx, k, room, b, paper, a)
    ctx.restore()
  }
}

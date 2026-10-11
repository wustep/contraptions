import { at, beam, circle, ellipse, glow, hash, line, mix, poly, rect, rgba, round, type Pen, type Pt } from './skins-pen'
import { flashOf, PL, ring, TH, WEIGHT_H, type Skin } from './skins-kit'

/**
 * Lives made of things: worlds where everything is one material, or one game. A run of dominoes waiting to fall, a
 * chessboard as big as a plain, a house of cards on the felt, a jigsaw with one piece gone from its sky, a knitted
 * country, the inside of a church window, a comic panel in loud dots, a circuit board, a candy land, the inside of a
 * snow globe, and a classroom after the bell. Each is one big silhouette at the side or up high, a wall and a floor of
 * its own colours, and a weight made of the same stuff; the same machine works in front of every one.
 *
 * Patterned floors are laid in `front()`, under the ground's top edge, because the shared ground paints over anything
 * `back()` draws below y = 0. The few big repeating patterns (the jigsaw's seams, the knit, the dots) are built once,
 * the first time they are drawn, and stroked or filled in one go after that.
 */

/** Rects (or any subpaths) of one colour in one path, filled once. */
function fillRects(pen: Pen, fill: string, add: (ctx: CanvasRenderingContext2D) => void): void {
  const { ctx } = pen
  ctx.beginPath()
  add(ctx)
  ctx.fillStyle = fill
  ctx.fill()
}

/** Lines of one colour in one path, stroked once. */
function strokeLines(pen: Pen, colour: string, w: number, add: (ctx: CanvasRenderingContext2D) => void): void {
  const { ctx } = pen
  ctx.beginPath()
  add(ctx)
  ctx.strokeStyle = colour
  ctx.lineWidth = w
  ctx.stroke()
}

/** Fill the current path, and ink it from `lod` 1 down. */
function shape(pen: Pen, fill: string | null, ink = 1): void {
  const { ctx } = pen
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (ink > 0 && pen.lod <= 1) {
    ctx.strokeStyle = pen.ink
    ctx.lineWidth = pen.lw * ink
    ctx.stroke()
  }
}

/** An outline given a unit tall, its foot at x, y and `h` tall, as one path. */
function outline(pen: Pen, pts: readonly Pt[], x: number, y: number, h: number): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.moveTo(x + pts[0][0] * h, y + pts[0][1] * h)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(x + pts[i][0] * h, y + pts[i][1] * h)
  ctx.closePath()
}

/* ------------------------------------------------------------------ a run of dominoes */

const DOMINO = {
  wall: '#D9A33E',
  table: '#4A2E22',
  tableEdge: '#62402E',
  grain: '#3C251B',
  tile: '#1F1E24',
  pip: '#F4EEDF',
  ink: '#1A1410',
}

/** Where a face's pips sit, for none to six, on a three-by-three grid. */
const PIPS: readonly (readonly Pt[])[] = [
  [],
  [[0, 0]],
  [[-1, -1], [1, 1]],
  [[-1, -1], [0, 0], [1, 1]],
  [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
]

/** A domino face on, its top left at x, y, `w` wide and twice that tall: `a` pips over `b`. */
function domino(pen: Pen, x: number, y: number, w: number, a: number, b: number): void {
  const h = w * 2
  round(pen, x, y, w, h, w * 0.12, DOMINO.tile)
  if (pen.lod > 1 && w < 0.5) return
  const { ctx } = pen
  const d = w * 0.26
  const r = w * 0.085
  ctx.beginPath()
  ctx.rect(x + w * 0.14, y + h / 2 - w * 0.025, w * 0.72, w * 0.05)
  for (let half = 0; half < 2; half++) {
    const cy = half ? y + h - w / 2 : y + w / 2
    for (const [u, k] of PIPS[half ? b : a]) {
      ctx.moveTo(x + w / 2 + u * d + r, cy + k * d)
      ctx.arc(x + w / 2 + u * d, cy + k * d, r, 0, Math.PI * 2)
    }
  }
  ctx.fillStyle = DOMINO.pip
  ctx.fill()
}

const dominoes: Skin = {
  key: 'dominoes',
  bg: DOMINO.wall,
  ink: DOMINO.ink,
  floor: DOMINO.table,
  edge: DOMINO.tableEdge,
  plank: DOMINO.tile,
  fulcrum: DOMINO.tableEdge,
  back(pen, m, _v) {
    // One big domino stood on its end on the left, five over three, rocking a little when the table is struck.
    at(pen, -2.3, 0, ring(m, 0.4, 0.35) * 0.025, 1, () => domino(pen, -0.44, -1.76, 0.88, 5, 3))
    // The run on the right, side on: the near ones topple on the slam, one after another, and stand back up.
    const A = 0.5 * Math.min(1, (m.s + 0.3) / 1.5)
    for (let i = 0; i < 7; i++) {
      const u = m.since - i * 0.06
      const a = u < 0 || !Number.isFinite(u) ? 0 : A * Math.sin(Math.PI * Math.min(1, u / 0.55)) * (1 - i * 0.1)
      at(pen, 1.82 + i * 0.21, 0, a, 1, () => {
        round(pen, -0.11, -0.62, 0.11, 0.62, 0.025, DOMINO.tile, 0.8)
        if (pen.lod === 0) {
          fillRects(pen, DOMINO.pip, (ctx) => {
            ctx.rect(-0.08, -0.315, 0.05, 0.012)
            ctx.moveTo(-0.03, -0.47)
            ctx.arc(-0.055, -0.47, 0.025, 0, Math.PI * 2)
            ctx.moveTo(-0.03, -0.16)
            ctx.arc(-0.055, -0.16, 0.025, 0, Math.PI * 2)
          })
        }
      })
    }
  },
  front(pen, _m, v) {
    // The table's grain.
    if (pen.lod > 0) return
    strokeLines(pen, DOMINO.grain, pen.lw * 0.7, (ctx) => {
      for (let y = 0.2; y < v.y1; y += 0.17) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
    })
  },
  board(pen) {
    // A long domino: its middle line and its pips along.
    round(pen, -PL, -TH / 2, 2 * PL, TH, 0.03, DOMINO.tile)
    if (pen.lod > 0) return
    fillRects(pen, DOMINO.pip, (ctx) => {
      ctx.rect(-0.006, -TH * 0.35, 0.012, TH * 0.7)
      for (let i = 0; i < 4; i++) {
        for (const s of [-1, 1]) {
          const x = s * (0.22 + i * 0.25)
          ctx.moveTo(x + 0.016, 0)
          ctx.arc(x, 0, 0.016, 0, Math.PI * 2)
        }
      }
    })
  },
  weight(pen) {
    // A domino, stood on its end: three over one.
    domino(pen, -0.085, -WEIGHT_H, 0.17, 3, 1)
  },
}

/* ------------------------------------------------------------------ a chessboard as big as a plain */

const CHESS = {
  sky: '#9895BC',
  haze: '#B4B1D3',
  maple: '#E6CF9E',
  walnut: '#6B4430',
  ivory: '#F2EADA',
  ivoryShade: '#D3C5A8',
  ebony: '#232027',
  ebonyLight: '#4A4552',
  ink: '#1C1820',
}

/** A rook, a unit tall, its foot at 0,0. */
const ROOK: readonly Pt[] = [[-0.42, 0], [0.42, 0], [0.42, -0.09], [0.34, -0.13], [0.34, -0.19], [0.26, -0.24], [0.22, -0.7], [0.31, -0.74], [0.31, -0.8], [0.33, -0.8], [0.33, -1], [0.2, -1], [0.2, -0.91], [0.07, -0.91], [0.07, -1], [-0.07, -1], [-0.07, -0.91], [-0.2, -0.91], [-0.2, -1], [-0.33, -1], [-0.33, -0.8], [-0.31, -0.8], [-0.31, -0.74], [-0.22, -0.7], [-0.26, -0.24], [-0.34, -0.19], [-0.34, -0.13], [-0.42, -0.09]]
/** A knight, facing left, a unit tall. */
const KNIGHT: readonly Pt[] = [[-0.45, 0], [0.45, 0], [0.45, -0.08], [0.36, -0.12], [0.36, -0.18], [0.28, -0.22], [0.31, -0.45], [0.34, -0.7], [0.29, -0.88], [0.17, -0.99], [0.07, -1.04], [0.03, -1.13], [-0.05, -1.01], [-0.2, -0.92], [-0.4, -0.72], [-0.43, -0.62], [-0.33, -0.57], [-0.15, -0.62], [-0.19, -0.45], [-0.28, -0.22], [-0.36, -0.18], [-0.36, -0.12], [-0.45, -0.08]]
/** A pawn's body, a unit tall; its head is a ball on top. */
const PAWN: readonly Pt[] = [[-0.4, 0], [0.4, 0], [0.4, -0.1], [0.3, -0.15], [0.3, -0.2], [0.18, -0.25], [0.13, -0.52], [0.26, -0.57], [0.26, -0.62], [0.1, -0.65], [-0.1, -0.65], [-0.26, -0.62], [-0.26, -0.57], [-0.13, -0.52], [-0.18, -0.25], [-0.3, -0.2], [-0.3, -0.15], [-0.4, -0.1]]

/** The board's rows on the ground, near and far: closer rows are deeper. */
const RANKS = [0, 0.13, 0.29, 0.49, 0.74, 1.05]
/** How wide the board is at a depth y, against the near edge: it narrows to a point far off. */
const spread = (y: number): number => (y + 2.6) / 2.6

const chess: Skin = {
  key: 'chess',
  bg: CHESS.sky,
  ink: CHESS.ink,
  floor: CHESS.maple,
  plank: CHESS.walnut,
  fulcrum: CHESS.ebony,
  back(pen, m, v) {
    // A haze along the far edge of the board.
    rect(pen, v.x0 - 0.1, -0.45, v.x1 - v.x0 + 0.2, 0.45, CHESS.haze, 0)
    // A white rook on the left, as tall as a house.
    outline(pen, ROOK, -2.25, 0, 1.7)
    shape(pen, CHESS.ivory, 1.2)
    if (pen.lod <= 1) {
      fillRects(pen, CHESS.ivoryShade, (ctx) => {
        ctx.rect(-2.25 + 0.22 * 1.7, -1.7 * 0.7, -0.07 * 1.7, 1.7 * 0.46)
        ctx.rect(-2.25 - 0.4 * 1.7, -0.09 * 1.7, 0.8 * 1.7, 0.05)
      })
    }
    // A black knight on the right, rocking on its base when the board is struck.
    at(pen, 2.3, 0, ring(m, 0.42, 0.4) * 0.06, 1, () => {
      outline(pen, KNIGHT, 0, 0, 1.75)
      shape(pen, CHESS.ebony, 1.2)
      if (pen.lod <= 1) {
        fillRects(pen, CHESS.ebonyLight, (ctx) => {
          ctx.moveTo(0.2 * 1.75, -0.95 * 1.75)
          ctx.lineTo(0.29 * 1.75, -0.86 * 1.75)
          ctx.lineTo(0.33 * 1.75, -0.7 * 1.75)
          ctx.lineTo(0.3 * 1.75, -0.45 * 1.75)
          ctx.lineTo(0.22 * 1.75, -0.45 * 1.75)
          ctx.lineTo(0.24 * 1.75, -0.72 * 1.75)
          ctx.closePath()
        })
        circle(pen, -0.1 * 1.75, -0.84 * 1.75, 0.045, CHESS.ivory, 0)
      }
    })
  },
  front(pen, _m, v) {
    // The board, its squares running away to the horizon.
    const rows = pen.lod === 0 ? 5 : pen.lod === 1 ? 3 : 2
    const s = pen.lod === 2 ? 0.9 : 0.6
    const far = spread(v.y1)
    const i0 = Math.floor(v.x0 / (s * far)) - 1
    const i1 = Math.ceil(v.x1 / (s * far)) + 1
    fillRects(pen, CHESS.walnut, (ctx) => {
      for (let r = 0; r < rows; r++) {
        const ya = RANKS[r]
        if (ya > v.y1) break
        const yb = RANKS[r + 1]
        const ka = spread(ya) * s
        const kb = spread(yb) * s
        for (let i = i0 + ((i0 + r) & 1 ? 0 : 1); i < i1; i += 2) {
          ctx.moveTo(i * ka, ya)
          ctx.lineTo((i + 1) * ka, ya)
          ctx.lineTo((i + 1) * kb, yb)
          ctx.lineTo(i * kb, yb)
          ctx.closePath()
        }
      }
    })
  },
  weight(pen) {
    // A black pawn.
    const h = WEIGHT_H
    outline(pen, PAWN, 0, 0, h)
    shape(pen, CHESS.ebony)
    circle(pen, 0, -h * 0.78, h * 0.19, CHESS.ebony)
    if (pen.lod === 0) circle(pen, -h * 0.06, -h * 0.84, h * 0.05, CHESS.ebonyLight, 0)
  },
}

/* ------------------------------------------------------------------ a house of cards */

const CARDS = {
  felt: '#1D4F5E',
  rail: '#5A3424',
  railLight: '#7A4A30',
  face: '#F8F4EA',
  back: '#A3263A',
  backDeep: '#7E1B2C',
  black: '#1E1E24',
  ink: '#16141A',
}

/** A spade, its middle at x, y and `s` from its middle to its tip, as subpaths. */
function spade(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.moveTo(x, y - s)
  ctx.bezierCurveTo(x + s * 0.25, y - s * 0.55, x + s * 0.95, y - s * 0.25, x + s * 0.9, y + s * 0.25)
  ctx.bezierCurveTo(x + s * 0.85, y + s * 0.65, x + s * 0.3, y + s * 0.7, x + s * 0.08, y + s * 0.35)
  ctx.lineTo(x + s * 0.3, y + s)
  ctx.lineTo(x - s * 0.3, y + s)
  ctx.lineTo(x - s * 0.08, y + s * 0.35)
  ctx.bezierCurveTo(x - s * 0.3, y + s * 0.7, x - s * 0.85, y + s * 0.65, x - s * 0.9, y + s * 0.25)
  ctx.bezierCurveTo(x - s * 0.95, y - s * 0.25, x - s * 0.25, y - s * 0.55, x, y - s)
  ctx.closePath()
}

/** The house's cards: each level's leaning pairs, their foot half-span and their height. */
const CARD_HALF = 0.52 * Math.sin(0.3)
const CARD_H = 0.52 * Math.cos(0.3)

/** The house, as lines: its backs (the left card of each pair) or its faces (the right ones and the flat ones). */
function house(ctx: CanvasRenderingContext2D, x: number, backs: boolean, sway: number): void {
  for (let l = 0; l < 3; l++) {
    const y0 = -l * (CARD_H + 0.025)
    const n = 3 - l
    const dx = l === 2 ? sway : 0
    for (let k = 0; k < n; k++) {
      const cx = x + (k - (n - 1) / 2) * 0.4
      if (backs) {
        ctx.moveTo(cx - CARD_HALF, y0)
        ctx.lineTo(cx + dx, y0 - CARD_H)
      } else {
        ctx.moveTo(cx + CARD_HALF, y0)
        ctx.lineTo(cx + dx, y0 - CARD_H)
      }
    }
    if (!backs && n > 1) {
      ctx.moveTo(x - (n - 1) * 0.2 - 0.06, y0 - CARD_H - 0.012)
      ctx.lineTo(x + (n - 1) * 0.2 + 0.06, y0 - CARD_H - 0.012)
    }
  }
}

const cards: Skin = {
  key: 'cards',
  bg: CARDS.felt,
  ink: CARDS.ink,
  floor: CARDS.rail,
  edge: CARDS.railLight,
  plank: CARDS.railLight,
  fulcrum: CARDS.rail,
  back(pen, m, _v) {
    const { ctx } = pen
    // The house of cards on the left, three storeys; its top pair trembles when the table is struck.
    const x = -2.05
    const sway = ring(m, 0.3, 0.3) * 0.035
    const w = pen.lod <= 1 ? 0.045 : 0.08
    ctx.lineCap = 'butt'
    if (pen.lod <= 1) {
      ctx.beginPath()
      house(ctx, x, true, sway)
      house(ctx, x, false, sway)
      ctx.strokeStyle = CARDS.ink
      ctx.lineWidth = w + pen.lw * 1.6
      ctx.stroke()
    }
    ctx.beginPath()
    house(ctx, x, true, sway)
    ctx.strokeStyle = CARDS.back
    ctx.lineWidth = w
    ctx.stroke()
    ctx.beginPath()
    house(ctx, x, false, sway)
    ctx.strokeStyle = CARDS.face
    ctx.stroke()
    // On the right, a card face down leaning one way and the ace of spades leaning the other.
    at(pen, 1.98, 0, -0.16, 1, () => {
      round(pen, -0.37, -1.05, 0.74, 1.05, 0.06, CARDS.back)
      if (pen.lod <= 1) round(pen, -0.3, -0.98, 0.6, 0.91, 0.03, CARDS.backDeep, 0)
      if (pen.lod === 0) {
        strokeLines(pen, rgba(CARDS.face, 0.35), pen.lw * 0.7, (c) => {
          for (let i = -3; i <= 3; i++) {
            c.moveTo(i * 0.2 - 0.3, -0.98)
            c.lineTo(i * 0.2 + 0.3, -0.07)
          }
        })
      }
    })
    at(pen, 2.32, 0, 0.1, 1, () => {
      round(pen, -0.39, -1.12, 0.78, 1.12, 0.06, CARDS.face)
      fillRects(pen, CARDS.black, (c) => {
        spade(c, 0, -0.58, 0.26)
        if (pen.lod === 0) {
          spade(c, -0.27, -0.96, 0.06)
          spade(c, 0.27, -0.16, 0.06)
        }
      })
    })
  },
  front(pen, _m, v) {
    // The rail's padding, buttoned.
    if (pen.lod > 0) return
    fillRects(pen, CARDS.backDeep, (ctx) => {
      for (let x = Math.floor(v.x0 / 0.5) * 0.5; x < v.x1; x += 0.5) {
        ctx.moveTo(x + 0.025, 0.3)
        ctx.arc(x, 0.3, 0.025, 0, Math.PI * 2)
      }
    })
  },
  weight(pen) {
    // A deck of cards on its end, its back to us, the edges of the cards showing at the side.
    const h = WEIGHT_H
    const w = 0.24
    rect(pen, -w / 2 + 0.04, -h + 0.01, w, h - 0.01, CARDS.face, 0.7)
    if (pen.lod === 0) {
      strokeLines(pen, rgba(CARDS.ink, 0.35), pen.lw * 0.5, (ctx) => {
        for (const y of [-0.08, -0.16, -0.24]) {
          ctx.moveTo(w / 2, y)
          ctx.lineTo(w / 2 + 0.04, y)
        }
      })
    }
    round(pen, -w / 2, -h, w, h, 0.025, CARDS.back)
    if (pen.lod <= 1) round(pen, -w / 2 + 0.03, -h + 0.03, w - 0.06, h - 0.06, 0.015, CARDS.backDeep, 0)
    if (pen.lod === 0) poly(pen, [[0, -h + 0.07], [0.06, -h / 2], [0, -0.07], [-0.06, -h / 2]], CARDS.face, 0)
  },
}

/* ------------------------------------------------------------------ a jigsaw, one piece missing */

const JIG = {
  sky: '#BDB3E4',
  sun: '#F6D564',
  hill: '#9BC968',
  hillDeep: '#7BAA52',
  meadow: '#6E9C4B',
  hole: '#3A3040',
  edge: '#8E84BC',
  ink: '#2E2638',
}

/** The puzzle's grid: its columns' and rows' lines, in cells. */
const CELL = 0.75
const gx = (i: number): number => -0.375 + i * CELL
const gy = (j: number): number => -j * CELL
/** Which way each edge's tab points, fixed for the puzzle. */
const sH = (i: number, j: number): number => (hash(i + 20, j + 20, 71) < 0.5 ? 1 : -1)
const sV = (i: number, j: number): number => (hash(i + 20, j + 20, 72) < 0.5 ? 1 : -1)

/** A cut from a to b with a tab bulging along n (a unit normal, signed), from the current point at a. */
function tab(c: CanvasPath, ax: number, ay: number, bx: number, by: number, nx: number, ny: number): void {
  const dx = bx - ax
  const dy = by - ay
  const L = Math.hypot(dx, dy)
  const X = (t: number, o: number): number => ax + dx * t + nx * o * L
  const Y = (t: number, o: number): number => ay + dy * t + ny * o * L
  c.lineTo(X(0.4, 0), Y(0.4, 0))
  c.bezierCurveTo(X(0.44, 0.1), Y(0.44, 0.1), X(0.3, 0.25), Y(0.3, 0.25), X(0.5, 0.25), Y(0.5, 0.25))
  c.bezierCurveTo(X(0.7, 0.25), Y(0.7, 0.25), X(0.56, 0.1), Y(0.56, 0.1), X(0.6, 0), Y(0.6, 0))
  c.lineTo(bx, by)
}

/** One piece's outline, the cell at column i, row j (rows counted up from the ground). */
function piece(c: CanvasPath, i: number, j: number): void {
  const x0 = gx(i)
  const x1 = gx(i + 1)
  const yt = gy(j + 1)
  const yb = gy(j)
  c.moveTo(x0, yt)
  tab(c, x0, yt, x1, yt, 0, sH(i, j + 1))
  tab(c, x1, yt, x1, yb, sV(i + 1, j), 0)
  tab(c, x1, yb, x0, yb, 0, sH(i, j))
  tab(c, x0, yb, x0, yt, sV(i, j), 0)
  c.closePath()
}

/** The seams over the sky and over the meadow, built the first time they are drawn. */
let JIG_SKY: Path2D | null = null
let JIG_FLOOR: Path2D | null = null
function seams(): [Path2D, Path2D] {
  if (!JIG_SKY || !JIG_FLOOR) {
    const s = new Path2D()
    for (let j = 1; j <= 4; j++) {
      for (let i = -6; i <= 5; i++) {
        s.moveTo(gx(i), gy(j))
        tab(s, gx(i), gy(j), gx(i + 1), gy(j), 0, sH(i, j))
      }
    }
    for (let i = -5; i <= 6; i++) {
      for (let j = 0; j <= 3; j++) {
        s.moveTo(gx(i), gy(j))
        tab(s, gx(i), gy(j), gx(i), gy(j + 1), sV(i, j), 0)
      }
    }
    const f = new Path2D()
    for (let i = -5; i <= 6; i++) {
      f.moveTo(gx(i), 0)
      tab(f, gx(i), 0, gx(i), gy(-1), sV(i, -1), 0)
    }
    for (let i = -6; i <= 5; i++) {
      f.moveTo(gx(i), gy(-1))
      tab(f, gx(i), gy(-1), gx(i + 1), gy(-1), 0, sH(i, -1))
    }
    JIG_SKY = s
    JIG_FLOOR = f
  }
  return [JIG_SKY, JIG_FLOOR]
}

/** The picture on the puzzle: the sun and two hills (the sky is the paper, unless asked for). */
function picture(pen: Pen, sky: boolean): void {
  const { ctx } = pen
  if (sky) rect(pen, -3.6, -3.2, 7.2, 3.2, JIG.sky, 0)
  circle(pen, -2.0, -2.35, 0.42, JIG.sun, 0)
  ctx.beginPath()
  ctx.moveTo(3.6, 0.05)
  ctx.lineTo(3.6, -1.25)
  ctx.quadraticCurveTo(2.3, -1.75, 0.9, 0.05)
  ctx.closePath()
  ctx.fillStyle = JIG.hillDeep
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-3.6, 0.05)
  ctx.lineTo(-3.6, -0.95)
  ctx.quadraticCurveTo(-2.5, -1.55, -0.9, 0.05)
  ctx.closePath()
  ctx.fillStyle = JIG.hill
  ctx.fill()
}

const jigsaw: Skin = {
  key: 'jigsaw',
  bg: JIG.sky,
  ink: JIG.ink,
  floor: JIG.meadow,
  plank: JIG.edge,
  fulcrum: JIG.hole,
  back(pen, m, _v) {
    const { ctx } = pen
    picture(pen, false)
    // The piece that is missing, high in the sky by the sun: the dark of the table through the gap.
    ctx.beginPath()
    piece(ctx, 2, 2)
    shape(pen, JIG.hole, 1.2)
    if (pen.lod > 1) return
    // The cuts between the pieces.
    const [sky] = seams()
    ctx.strokeStyle = rgba(JIG.ink, 0.4)
    ctx.lineWidth = pen.lw * (pen.lod === 0 ? 0.9 : 1.2)
    ctx.stroke(sky)
    // One piece not quite pressed home on the left: it lifts a little more when the table is struck.
    ctx.beginPath()
    piece(ctx, -3, 1)
    ctx.fillStyle = JIG.hole
    ctx.fill()
    const cx = gx(-3) + CELL / 2
    const cy = gy(1) - CELL / 2
    const k = Math.min(1, m.s / 1.5)
    ctx.save()
    ctx.translate(cx + 0.03, cy - 0.05 - 0.05 * k * Math.exp(-Math.max(0, m.since) / 0.25))
    ctx.rotate(-0.06 + ring(m, 0.3, 0.3) * 0.06 * k)
    ctx.translate(-cx, -cy)
    ctx.beginPath()
    piece(ctx, -3, 1)
    ctx.save()
    ctx.clip()
    picture(pen, true)
    ctx.restore()
    ctx.beginPath()
    piece(ctx, -3, 1)
    ctx.strokeStyle = JIG.ink
    ctx.lineWidth = pen.lw
    ctx.stroke()
    ctx.restore()
  },
  front(pen, _m, _v) {
    if (pen.lod > 1) return
    const [, floor] = seams()
    pen.ctx.strokeStyle = rgba(JIG.ink, 0.35)
    pen.ctx.lineWidth = pen.lw * 0.9
    pen.ctx.stroke(floor)
  },
  weight(pen) {
    // A piece from somewhere else in the box, stood on its edge, its cardboard showing behind it.
    const { ctx } = pen
    const s = 0.26
    const draw = (dx: number): void => {
      ctx.beginPath()
      ctx.moveTo(-s / 2 + dx, -s)
      tab(ctx, -s / 2 + dx, -s, s / 2 + dx, -s, 0, -1)
      tab(ctx, s / 2 + dx, -s, s / 2 + dx, 0, 1, 0)
      ctx.lineTo(-s / 2 + dx, 0)
      tab(ctx, -s / 2 + dx, 0, -s / 2 + dx, -s, 1, 0)
      ctx.closePath()
    }
    draw(0.03)
    shape(pen, JIG.hole, 0.7)
    draw(0)
    shape(pen, JIG.sun, 0.8)
  },
}

/* ------------------------------------------------------------------ a knitted country */

const YARN = {
  sky: '#A8B7E0',
  sun: '#F5D96A',
  sunDeep: '#D8B646',
  hill: '#D6A13F',
  hillB: '#8E5C8C',
  ball: '#E07FA2',
  ballDeep: '#B85C80',
  wool: '#E9D7B2',
  woolDeep: '#CDB58A',
  needle: '#C99558',
  knob: '#5B4A9A',
  blue: '#5A86C2',
  blueDeep: '#3F6AA4',
  ink: '#3A2E3E',
}

/** Rows of knit stitches (a row of V's is a zigzag) over the whole world, fine and coarse, built when first drawn. */
const KNIT: (Path2D | null)[] = [null, null]
function knit(coarse: boolean): Path2D {
  const k = coarse ? 1 : 0
  let p = KNIT[k]
  if (!p) {
    p = new Path2D()
    const w = coarse ? 0.26 : 0.15
    const h = coarse ? 0.2 : 0.12
    for (let y = -2.4; y < 1.0; y += h) {
      p.moveTo(-3.7, y)
      for (let i = 1, x = -3.7; x < 3.7; i++) {
        x = -3.7 + i * (w / 2)
        p.lineTo(x, i % 2 ? y + h : y)
      }
    }
    KNIT[k] = p
  }
  return p
}

/** A ball of yarn at x, y, its wraps turned by `a`. */
function yarnBall(pen: Pen, x: number, y: number, r: number, fill: string, deep: string, a: number): void {
  circle(pen, x, y, r, fill)
  if (pen.lod > 1) return
  const { ctx } = pen
  ctx.beginPath()
  for (let k = 0; k < (pen.lod === 0 ? 4 : 2); k++) {
    const t = a + k * 0.8
    ctx.moveTo(x + Math.cos(t) * r * 0.92, y + Math.sin(t) * r * 0.92)
    ctx.ellipse(x, y, r * 0.92, r * (0.25 + 0.15 * k), t, 0, Math.PI)
  }
  ctx.strokeStyle = deep
  ctx.lineWidth = r * 0.07
  ctx.stroke()
}

const yarn: Skin = {
  key: 'yarn',
  bg: YARN.sky,
  ink: YARN.ink,
  floor: YARN.wool,
  edge: YARN.woolDeep,
  plank: YARN.needle,
  fulcrum: YARN.hillB,
  back(pen, m, _v) {
    const { ctx } = pen
    // The sun, a ball of yellow wool turning slowly, and its loose end trailing down to the hills.
    if (pen.lod <= 1) {
      ctx.beginPath()
      ctx.moveTo(-2.3, -1.9)
      ctx.bezierCurveTo(-2.7, -1.6, -2.4, -1.35, -2.95, -0.95)
      ctx.strokeStyle = YARN.sunDeep
      ctx.lineWidth = 0.03
      ctx.stroke()
    }
    yarnBall(pen, -2.0, -2.12, 0.36, YARN.sun, YARN.sunDeep, m.t * 0.15)
    // Two knitted hills, mustard and plum, in rows of stitches.
    ellipse(pen, 2.75, 0.05, 1.45, 0.8, YARN.hillB, 0.8)
    ellipse(pen, -2.5, 0.05, 1.3, 1.05, YARN.hill, 0.8)
    if (pen.lod <= 1) {
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(2.75, 0.05, 1.45, 0.8, 0, 0, Math.PI * 2)
      ctx.moveTo(-1.2, 0.05)
      ctx.ellipse(-2.5, 0.05, 1.3, 1.05, 0, 0, Math.PI * 2)
      ctx.clip()
      ctx.strokeStyle = rgba(YARN.ink, 0.22)
      ctx.lineWidth = pen.lw * 0.8
      ctx.stroke(knit(pen.lod === 1))
      ctx.restore()
    }
    // A great ball of pink wool on the right with a pair of needles stuck through it; they sway on the slam.
    const bx = 2.15
    const by = -0.52
    const sw = ring(m, 0.45, 0.45) * 0.07
    at(pen, bx, by, sw, 1, () => {
      for (const [x1, y1] of [[-0.6, -1.4], [0.55, -1.32]] as const) {
        line(pen, -x1 * 0.4, -y1 * 0.25, x1, y1, pen.lod <= 1 ? YARN.ink : YARN.needle, 0.07 + (pen.lod <= 1 ? pen.lw * 1.6 : 0))
        if (pen.lod <= 1) line(pen, -x1 * 0.4, -y1 * 0.25, x1, y1, YARN.needle, 0.07)
        circle(pen, x1, y1, 0.075, YARN.knob, 0.8)
      }
    })
    if (pen.lod <= 1) {
      ctx.beginPath()
      ctx.moveTo(bx - 0.4, by + 0.3)
      ctx.quadraticCurveTo(bx - 0.7, by + 0.55, bx - 1.05, 0)
      ctx.strokeStyle = YARN.ballDeep
      ctx.lineWidth = 0.03
      ctx.stroke()
    }
    yarnBall(pen, bx, by, 0.52, YARN.ball, YARN.ballDeep, 0.5)
  },
  front(pen, _m, v) {
    // The ground, knitted too.
    if (pen.lod > 1) return
    const { ctx } = pen
    ctx.save()
    ctx.beginPath()
    ctx.rect(v.x0 - 0.1, 0.07, v.x1 - v.x0 + 0.2, v.y1)
    ctx.clip()
    ctx.strokeStyle = YARN.woolDeep
    ctx.lineWidth = pen.lw * 0.8
    ctx.stroke(knit(pen.lod === 1))
    ctx.restore()
  },
  weight(pen) {
    // A ball of blue yarn, its end hanging.
    const r = WEIGHT_H * 0.48
    if (pen.lod <= 1) line(pen, r * 0.6, -r * 0.4, r * 1.1, 0, YARN.blueDeep, 0.02)
    yarnBall(pen, 0, -r, r, YARN.blue, YARN.blueDeep, 0.9)
  },
}

/* ------------------------------------------------------------------ inside a church window */

const GLASS = {
  stone: '#3D3747',
  stoneDeep: '#2F2A38',
  lead: '#15121A',
  jewels: ['#2D5DB8', '#B3264A', '#E3A62A', '#3E9A55', '#7A4BB2', '#8FC0E8'],
  floor: '#5E5865',
  edge: '#4B4553',
  wax: '#F1E6C8',
  brass: '#C99F45',
  flame: '#FFD670',
}

/** A lancet: half its width, its sill, where its arch springs, and its point. */
const LANCET = { hw: 0.45, sill: -0.5, spring: -1.95, apex: -2.5 }
/** Its panes, three across and five up, by colour: blue and pale up the sides, the jewels up the middle. */
const PANES: readonly (readonly Pt[])[] = GLASS.jewels.map((_, k) => {
  const out: Pt[] = []
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      const col = c === 1 ? [1, 2, 4, 3, 1][r] : (r + c) % 2 ? 0 : 5
      if (col === k) out.push([c, r])
    }
  }
  return out
})

function lancetPath(ctx: CanvasRenderingContext2D, cx: number): void {
  const { hw, sill, spring, apex } = LANCET
  ctx.moveTo(cx - hw, sill)
  ctx.lineTo(cx - hw, spring)
  ctx.quadraticCurveTo(cx - hw, apex + 0.15, cx, apex)
  ctx.quadraticCurveTo(cx + hw, apex + 0.15, cx + hw, spring)
  ctx.lineTo(cx + hw, sill)
  ctx.closePath()
}

/** A lancet window at cx, its panes brightened by `f`. */
function lancet(pen: Pen, cx: number, f: number): void {
  const { ctx } = pen
  const { hw, sill } = LANCET
  const pw = (2 * hw) / 3
  const ph = 0.4
  // Its stone surround.
  ctx.beginPath()
  ctx.moveTo(cx - hw - 0.1, sill + 0.08)
  ctx.lineTo(cx - hw - 0.1, LANCET.spring)
  ctx.quadraticCurveTo(cx - hw - 0.1, LANCET.apex + 0.05, cx, LANCET.apex - 0.12)
  ctx.quadraticCurveTo(cx + hw + 0.1, LANCET.apex + 0.05, cx + hw + 0.1, LANCET.spring)
  ctx.lineTo(cx + hw + 0.1, sill + 0.08)
  ctx.closePath()
  ctx.fillStyle = GLASS.stoneDeep
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  lancetPath(ctx, cx)
  ctx.clip()
  if (pen.lod > 1) {
    rect(pen, cx - hw, -3, 2 * hw, 3, mix(GLASS.jewels[0], '#FFFFFF', f * 0.3), 0)
    rect(pen, cx - pw / 2, -3, pw, 3, mix(GLASS.jewels[2], '#FFFFFF', f * 0.3), 0)
  } else {
    for (let k = 0; k < PANES.length; k++) {
      fillRects(pen, mix(GLASS.jewels[k], '#FFFFFF', f * 0.3), (c) => {
        for (const [col, r] of PANES[k]) c.rect(cx - hw + col * pw, sill - (r + 1) * ph, pw, ph)
      })
    }
  }
  ctx.restore()
  if (pen.lod > 1) return
  // The leads.
  ctx.beginPath()
  lancetPath(ctx, cx)
  for (let c = 1; c < 3; c++) {
    ctx.moveTo(cx - hw + c * pw, sill)
    ctx.lineTo(cx - hw + c * pw, LANCET.apex)
  }
  for (let r = 1; r < 5; r++) {
    ctx.moveTo(cx - hw, sill - r * ph)
    ctx.lineTo(cx + hw, sill - r * ph)
  }
  ctx.strokeStyle = GLASS.lead
  ctx.lineWidth = pen.lod === 0 ? 0.035 : 0.05
  ctx.stroke()
}

const stainedglass: Skin = {
  key: 'stainedglass',
  bg: GLASS.stone,
  ink: GLASS.lead,
  floor: GLASS.floor,
  edge: GLASS.edge,
  plank: '#6A4A36',
  fulcrum: GLASS.stoneDeep,
  back(pen, m, v) {
    // The wall's blocks.
    if (pen.lod === 0) {
      strokeLines(pen, GLASS.stoneDeep, pen.lw, (ctx) => {
        for (let r = 1; r < 8; r++) {
          const y = -r * 0.42
          if (y < v.y0) break
          ctx.moveTo(v.x0, y)
          ctx.lineTo(v.x1, y)
          for (let x = Math.floor(v.x0 / 0.9) * 0.9 + (r % 2) * 0.45; x < v.x1; x += 0.9) {
            ctx.moveTo(x, y)
            ctx.lineTo(x, y + 0.42)
          }
        }
      })
    }
    // A tall window either side; the light through them flares when the floor is struck.
    const f = flashOf(m, 0.9, 0.3)
    lancet(pen, -2.15, f)
    lancet(pen, 2.15, f)
    beam(pen, -2.15, -1.5, -0.9, 0.25, 0.8, 1.3, GLASS.jewels[2], 0.1 + 0.16 * f)
    beam(pen, 2.15, -1.5, 0.9, 0.25, 0.8, 1.3, GLASS.jewels[5], 0.1 + 0.16 * f)
  },
  front(pen, m, _v) {
    // Where the light lands on the flags: pools of the windows' colours.
    if (pen.lod > 1) return
    const f = flashOf(m, 0.9, 0.3)
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const x = s * (0.55 + k * 0.28)
        poly(pen, [[x, 0.08], [x + s * 0.26, 0.08], [x + s * 0.36, 0.42], [x + s * 0.08, 0.42]], rgba(GLASS.jewels[[1, 2, 0][k]], 0.22 + 0.15 * f), 0)
      }
    }
  },
  weight(pen) {
    // A candle in a brass holder, lit.
    ellipse(pen, 0, -0.025, 0.14, 0.03, GLASS.brass, 0.7)
    rect(pen, -0.06, -0.09, 0.12, 0.065, GLASS.brass, 0.7)
    rect(pen, -0.045, -0.26, 0.09, 0.17, GLASS.wax, 0.7)
    if (pen.lod <= 1) line(pen, 0, -0.26, 0, -0.285, GLASS.lead, 0.012)
    ellipse(pen, 0, -0.31, 0.03, 0.05, GLASS.flame, 0)
  },
}

/* ------------------------------------------------------------------ a comic panel, in dots */

const POP = {
  cyan: '#3CB6E6',
  dot: '#2397CF',
  yellow: '#FFD620',
  red: '#E3253B',
  blue: '#2148C6',
  white: '#FFFFFF',
  silver: '#C9CDD2',
  gold: '#E8B83A',
  floorDot: '#F29A1A',
  black: '#141414',
}

/** A burst: fourteen jagged points, a unit out at most. */
const BURST: readonly Pt[] = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2 - Math.PI / 2
  const r = i % 2 ? 0.58 + 0.08 * hash(i, 3, 5) : 0.85 + 0.15 * hash(i, 4, 5)
  return [Math.cos(a) * r, Math.sin(a) * r] as Pt
})

/** Ben-Day dots over a stretch, fine and coarse, built when first drawn. */
const DOTS: Record<string, Path2D> = {}
function dots(key: string, y0: number, y1: number, s: number, r: number): Path2D {
  let p = DOTS[key]
  if (!p) {
    p = new Path2D()
    let row = 0
    for (let y = y0; y < y1; y += s * 0.866, row++) {
      for (let x = -3.6 + (row % 2) * s * 0.5; x < 3.6; x += s) {
        p.moveTo(x + r, y)
        p.arc(x, y, r, 0, Math.PI * 2)
      }
    }
    DOTS[key] = p
  }
  return p
}

const popart: Skin = {
  key: 'popart',
  bg: POP.cyan,
  ink: POP.black,
  floor: POP.yellow,
  edge: POP.black,
  plank: POP.blue,
  fulcrum: POP.black,
  back(pen, m, _v) {
    const { ctx } = pen
    // The dots.
    if (pen.lod <= 1) {
      ctx.fillStyle = POP.dot
      ctx.fill(pen.lod === 0 ? dots('sky0', -3.0, 0, 0.16, 0.045) : dots('sky1', -3.0, 0, 0.28, 0.075))
    }
    // The burst on the left, jumping on the slam.
    const k = 1 + 0.14 * Math.exp(-Math.max(0, m.since) / 0.15) * Math.min(1, m.s / 1.4) * (Number.isFinite(m.since) ? 1 : 0)
    at(pen, -2.15, -1.75, 0.05, k * 0.78, () => {
      poly(pen, BURST, POP.yellow, 2.2)
      at(pen, 0, 0, 0.1, 0.6, () => poly(pen, BURST, POP.red, 0))
      if (pen.lod <= 1) at(pen, 0, 0, 0.2, 0.3, () => poly(pen, BURST, POP.white, 0))
    })
    // A speech balloon on the right, with nothing in it but a pause.
    poly(pen, [[1.95, -1.55], [2.25, -1.5], [1.62, -1.08]], POP.white, 2)
    ellipse(pen, 2.2, -1.85, 0.66, 0.42, POP.white, 2)
    poly(pen, [[1.97, -1.52], [2.22, -1.49], [2.1, -1.42]], POP.white, 0)
    if (pen.lod <= 1) {
      fillRects(pen, POP.black, (c) => {
        for (let i = 0; i < 3; i++) {
          c.moveTo(1.98 + i * 0.22 + 0.05, -1.85)
          c.arc(1.98 + i * 0.22, -1.85, 0.05, 0, Math.PI * 2)
        }
      })
    }
  },
  front(pen, _m, _v) {
    // The ground in dots of its own.
    if (pen.lod > 1) return
    pen.ctx.fillStyle = POP.floorDot
    pen.ctx.fill(pen.lod === 0 ? dots('floor0', 0.16, 1.0, 0.16, 0.045) : dots('floor1', 0.2, 1.0, 0.28, 0.075))
  },
  weight(pen) {
    // A tin of soup, red over white, its gold seal, and no words on it.
    const h = WEIGHT_H
    const w = 0.24
    rect(pen, -w / 2, -h * 0.5, w, h * 0.5, POP.white, 0)
    rect(pen, -w / 2, -h + 0.03, w, h * 0.5 - 0.03, POP.red, 0)
    rect(pen, -w / 2, -h + 0.03, w, h - 0.03, null, 1.2)
    circle(pen, 0, -h * 0.32, 0.045, POP.gold, 0.8)
    ellipse(pen, 0, -h + 0.03, w / 2, 0.03, POP.silver, 1.2)
  },
}

/* ------------------------------------------------------------------ a circuit board */

const PCB = {
  board: '#1F5C37',
  boardDeep: '#14432A',
  trace: '#CFA64A',
  spark: '#FFF2B8',
  pad: '#DAD6C8',
  chip: '#1C1C21',
  pin: '#B8BCC4',
  silk: '#E6EEE6',
  led: '#FFC53A',
  ledDim: '#8A6A22',
  cap: '#2C3F7E',
  capStripe: '#9DB5E6',
  resistor: '#D9C29A',
  band: '#B8323A',
  bandDeep: '#7A4A2A',
  gold: '#D8B04E',
  ink: '#0E1A12',
}

/** The traces, as runs of straight lines and forty-five degree bends. */
const TRACES: readonly (readonly Pt[])[] = [
  [[-2.0, -1.92], [-2.0, -2.0], [-1.7, -2.3], [1.6, -2.3], [1.85, -2.05], [1.85, -1.55]],
  [[-1.38, -1.35], [-1.2, -1.35], [-1.05, -1.5], [-1.05, -1.95], [-0.85, -2.12], [-0.1, -2.12]],
  [[-2.62, -0.95], [-3.1, -0.95], [-3.3, -1.15], [-3.3, -2.6]],
  [[-1.38, -0.85], [-1.3, -0.85], [-1.3, -0.25]],
  [[2.55, -1.1], [2.9, -1.45], [2.9, -2.55]],
  [[-2.3, -1.92], [-2.3, -2.3], [-2.05, -2.52], [0.6, -2.52]],
  [[1.85, -1.55], [1.55, -1.25], [1.55, -0.9]],
]
/** The long trace over the top, its length, for the pulse running along it. */
const MAIN = TRACES[0]
const MAIN_LEN = MAIN.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - MAIN[i - 1][0], p[1] - MAIN[i - 1][1]) : 0), 0)

const circuit: Skin = {
  key: 'circuit',
  bg: PCB.board,
  ink: PCB.ink,
  floor: PCB.boardDeep,
  edge: PCB.gold,
  plank: PCB.chip,
  fulcrum: PCB.chip,
  back(pen, m, _v) {
    const { ctx } = pen
    // The traces, and their pads.
    ctx.lineJoin = 'round'
    strokeLines(pen, PCB.trace, pen.lod <= 1 ? 0.045 : 0.08, (c) => {
      for (let t = 0; t < (pen.lod <= 1 ? TRACES.length : 1); t++) {
        const tr = TRACES[t]
        c.moveTo(tr[0][0], tr[0][1])
        for (let i = 1; i < tr.length; i++) c.lineTo(tr[i][0], tr[i][1])
      }
    })
    ctx.lineJoin = 'miter'
    if (pen.lod <= 1) {
      fillRects(pen, PCB.trace, (c) => {
        for (const tr of TRACES) {
          const [x, y] = tr[tr.length - 1]
          c.moveTo(x + 0.075, y)
          c.arc(x, y, 0.075, 0, Math.PI * 2)
        }
      })
      if (pen.lod === 0) {
        fillRects(pen, PCB.boardDeep, (c) => {
          for (const tr of TRACES) {
            const [x, y] = tr[tr.length - 1]
            c.moveTo(x + 0.03, y)
            c.arc(x, y, 0.03, 0, Math.PI * 2)
          }
        })
        // A resistor on the top trace, its bands.
        round(pen, -0.35, -2.36, 0.4, 0.12, 0.05, PCB.resistor, 0.7)
        fillRects(pen, PCB.bandDeep, (c) => {
          c.rect(-0.27, -2.36, 0.04, 0.12)
          c.rect(-0.17, -2.36, 0.04, 0.12)
        })
        rect(pen, -0.07, -2.36, 0.04, 0.12, PCB.band, 0)
      }
      // A spark of current running along the top trace.
      let d = (m.t * 1.1) % MAIN_LEN
      for (let i = 1; i < MAIN.length; i++) {
        const [x0, y0] = MAIN[i - 1]
        const [x1, y1] = MAIN[i]
        const L = Math.hypot(x1 - x0, y1 - y0)
        if (d <= L) {
          circle(pen, x0 + ((x1 - x0) * d) / L, y0 + ((y1 - y0) * d) / L, 0.045, PCB.spark, 0)
          break
        }
        d -= L
      }
    }
    // The chip on the left: its legs all round, its body, the dot by its first leg.
    const cx = -2.0
    const cy = -1.3
    const hs = 0.5
    fillRects(pen, PCB.pin, (c) => {
      for (let i = 0; i < 5; i++) {
        const o = -hs + 0.1 + i * 0.2 - 0.04
        c.rect(cx - hs - 0.12, cy + o, 0.12, 0.08)
        c.rect(cx + hs, cy + o, 0.12, 0.08)
        c.rect(cx + o, cy - hs - 0.12, 0.08, 0.12)
        c.rect(cx + o, cy + hs, 0.08, 0.12)
      }
    })
    round(pen, cx - hs, cy - hs, 2 * hs, 2 * hs, 0.05, PCB.chip)
    if (pen.lod <= 1) circle(pen, cx - hs + 0.15, cy - hs + 0.15, 0.05, PCB.pin, 0)
    if (pen.lod === 0) {
      ctx.strokeStyle = PCB.silk
      ctx.lineWidth = pen.lw * 0.8
      ctx.strokeRect(cx - hs - 0.2, cy - hs - 0.2, 2 * hs + 0.4, 2 * hs + 0.4)
    }
    // A big LED standing on its legs on the right, blinking on the beat.
    const b = 0.2 + 0.8 * flashOf(m, 0.5, 0.2)
    const lx = 2.2
    glow(pen, lx, -0.95, 1.1, PCB.led, 0.5 * b)
    fillRects(pen, PCB.pin, (c) => {
      c.rect(lx - 0.13, -0.6, 0.04, 0.6)
      c.rect(lx + 0.09, -0.6, 0.04, 0.45)
      c.rect(lx + 0.09, -0.15, 0.1, 0.04)
      c.rect(lx + 0.15, -0.15, 0.04, 0.15)
    })
    rect(pen, lx - 0.21, -0.68, 0.42, 0.08, mix(PCB.ledDim, PCB.led, b * 0.8), 0.8)
    round(pen, lx - 0.17, -1.32, 0.34, 0.66, 0.17, mix(PCB.ledDim, PCB.led, b))
    if (pen.lod <= 1) round(pen, lx - 0.11, -1.24, 0.07, 0.4, 0.035, rgba(PCB.spark, 0.5 + 0.4 * b), 0)
  },
  front(pen, _m, v) {
    // The edge connector's gold fingers.
    if (pen.lod > 1) return
    fillRects(pen, PCB.gold, (ctx) => {
      for (let x = Math.floor(v.x0 / 0.2) * 0.2; x < v.x1; x += 0.2) ctx.rect(x + 0.04, 0.12, 0.12, 0.3)
    })
  },
  board(pen) {
    // A pin header: black plastic, the gold pins along it.
    rect(pen, -PL, -TH / 2, 2 * PL, TH, PCB.chip)
    if (pen.lod > 0) return
    fillRects(pen, PCB.gold, (ctx) => {
      for (let i = 0; i < 11; i++) ctx.rect(-PL + 0.08 + i * 0.21, -0.012, 0.024, 0.024)
    })
  },
  weight(pen) {
    // A capacitor, standing on its legs: its can, the stripe down its side and the cross in its top.
    const h = WEIGHT_H
    if (pen.lod <= 1) {
      fillRects(pen, PCB.pin, (ctx) => {
        ctx.rect(-0.06, -0.05, 0.025, 0.05)
        ctx.rect(0.035, -0.05, 0.025, 0.05)
      })
    }
    round(pen, -0.11, -h, 0.22, h - 0.04, 0.035, PCB.cap)
    rect(pen, 0.04, -h + 0.03, 0.045, h - 0.1, PCB.capStripe, 0)
    if (pen.lod <= 1) {
      ellipse(pen, 0, -h + 0.005, 0.1, 0.022, PCB.pin, 0.6)
      if (pen.lod === 0) {
        strokeLines(pen, PCB.cap, pen.lw * 0.8, (ctx) => {
          ctx.moveTo(-0.05, -h + 0.005)
          ctx.lineTo(0.05, -h + 0.005)
        })
      }
    }
  },
}

/* ------------------------------------------------------------------ a candy land */

const CANDY = {
  sky: '#F8CDE0',
  lemon: '#F6D851',
  lime: '#9DD45E',
  grape: '#9C6CCB',
  mint: '#7FD3C6',
  pink: '#EC5A93',
  white: '#FFFAF5',
  stick: '#FBF4EA',
  cane: '#D6305F',
  choc: '#6B3B27',
  frost: '#FFF1F4',
  ink: '#4A2A36',
}

/** A swirl, two and a half turns out from the middle, a unit out at its end. */
const SWIRL: readonly Pt[] = Array.from({ length: 34 }, (_, i) => {
  const t = i / 33
  const a = t * Math.PI * 5
  return [Math.cos(a) * t * 0.9, Math.sin(a) * t * 0.9] as Pt
})

/** A lollipop at x: its stick from the ground, its disc at cy, `r` round, the swirl turned by `a`. */
function lollipop(pen: Pen, x: number, cy: number, r: number, fill: string, a: number): void {
  if (pen.lod <= 1) line(pen, x, 0, x, cy, CANDY.ink, 0.07 + pen.lw * 1.6)
  line(pen, x, 0, x, cy, CANDY.stick, pen.lod <= 1 ? 0.07 : 0.1)
  circle(pen, x, cy, r, fill, 1.2)
  if (pen.lod > 1) return
  at(pen, x, cy, a, r, () => {
    poly(pen, SWIRL, null, 0, false)
    pen.ctx.strokeStyle = CANDY.white
    pen.ctx.lineWidth = 0.17
    pen.ctx.lineCap = 'round'
    pen.ctx.stroke()
    pen.ctx.lineCap = 'butt'
  })
}

/** A gumdrop, its foot on the ground at x, `w` wide and `h` tall, squashed by `sq`. */
function gumdrop(pen: Pen, x: number, w: number, h: number, fill: string, sq: number): void {
  const { ctx } = pen
  ctx.beginPath()
  ctx.ellipse(x, 0.02, w / 2 * (2 - sq), h * sq, 0, Math.PI, Math.PI * 2)
  ctx.closePath()
  shape(pen, fill)
  if (pen.lod === 0) {
    fillRects(pen, rgba(CANDY.white, 0.75), (c) => {
      for (let i = 0; i < 4; i++) {
        const px0 = x + (hash(i, Math.round(x * 10), 31) - 0.5) * w * 0.6
        const py0 = -h * sq * (0.25 + 0.5 * hash(i, Math.round(x * 10), 32))
        c.rect(px0, py0, 0.03, 0.03)
      }
    })
  }
}

const candy: Skin = {
  key: 'candy',
  bg: CANDY.sky,
  ink: CANDY.ink,
  floor: CANDY.choc,
  edge: CANDY.frost,
  plank: CANDY.pink,
  fulcrum: CANDY.choc,
  back(pen, m, _v) {
    const { ctx } = pen
    // A fence of candy canes either side.
    if (pen.lod <= 1) {
      ctx.beginPath()
      for (const s of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const x = s * (1.65 + i * 0.32)
          ctx.moveTo(x, 0)
          ctx.lineTo(x, -0.42)
          ctx.arc(x - s * 0.08, -0.42, 0.08, 0, Math.PI, true)
        }
      }
      ctx.lineCap = 'butt'
      ctx.strokeStyle = CANDY.ink
      ctx.lineWidth = 0.06 + pen.lw * 1.6
      ctx.stroke()
      ctx.strokeStyle = CANDY.white
      ctx.lineWidth = 0.06
      ctx.stroke()
      ctx.setLineDash([0.045, 0.045])
      ctx.strokeStyle = CANDY.cane
      ctx.stroke()
      ctx.setLineDash([])
    }
    // Two lollipop trees, their swirls turning slowly.
    lollipop(pen, -2.15, -1.9, 0.55, CANDY.pink, m.t * 0.5)
    lollipop(pen, 2.3, -1.6, 0.42, CANDY.mint, -m.t * 0.6 + 1)
    // Gumdrop hills round their feet, squashing on the slam.
    const sq = 1 - 0.14 * Math.exp(-Math.max(0, m.since) / 0.2) * Math.min(1, m.s / 1.4) * (Number.isFinite(m.since) ? 1 : 0)
    gumdrop(pen, -2.8, 0.85, 0.7, CANDY.grape, sq)
    gumdrop(pen, -1.75, 0.55, 0.42, CANDY.lemon, sq)
    gumdrop(pen, 2.85, 0.75, 0.6, CANDY.lemon, sq)
    gumdrop(pen, 1.95, 0.5, 0.38, CANDY.lime, sq)
  },
  front(pen, _m, v) {
    // The frosting dripping over the chocolate's edge.
    if (pen.lod > 1) return
    fillRects(pen, CANDY.frost, (ctx) => {
      for (let i = Math.floor(v.x0 / 0.35); i * 0.35 < v.x1; i++) {
        const x = i * 0.35 + 0.1 * hash(i, 1, 41)
        const d = 0.06 + 0.14 * hash(i, 2, 41)
        ctx.rect(x - 0.035, 0.05, 0.07, d)
        ctx.moveTo(x + 0.035, 0.05 + d)
        ctx.arc(x, 0.05 + d, 0.035, 0, Math.PI)
      }
    })
  },
  weight(pen) {
    // A wrapped sweet on its end: the wrapper twisted at both ends.
    const h = WEIGHT_H
    poly(pen, [[-0.03, -0.075], [0.03, -0.075], [0.1, 0], [-0.1, 0]], CANDY.lemon, 0.8)
    poly(pen, [[-0.03, -h + 0.075], [0.03, -h + 0.075], [0.1, -h], [-0.1, -h]], CANDY.lemon, 0.8)
    ellipse(pen, 0, -h / 2, 0.1, 0.11, CANDY.grape)
    if (pen.lod <= 1) ellipse(pen, -0.035, -h / 2 - 0.035, 0.025, 0.04, rgba(CANDY.white, 0.7), 0, 0.4)
  },
}

/* ------------------------------------------------------------------ inside a snow globe */

const GLOBE = {
  water: '#A3C3E3',
  room: '#3A2638',
  rim: '#F2F8FD',
  snow: '#FBFCFE',
  snowShade: '#D4E0EE',
  wallA: '#E8B868',
  wallB: '#C98060',
  roof: '#6E4A6A',
  window: '#FFE29C',
  fir: '#3C6E3E',
  trunk: '#6B4630',
  base: '#6B4630',
  band: '#D6AA4C',
  ink: '#2A2034',
}

/** The globe's glass: its middle and its radius. */
const BALL = { x: 0, y: -0.5, r: 2.6 }
/** The snow: where each flake starts across, where in its fall it is, how fast it falls and how big it is. */
const FLAKES: readonly (readonly [number, number, number, number])[] = Array.from({ length: 36 }, (_, i) => [
  (hash(i, 1, 51) - 0.5) * 4.8,
  hash(i, 2, 51),
  0.04 + 0.04 * hash(i, 3, 51),
  0.022 + 0.022 * hash(i, 4, 51),
] as const)

/** A little house, its middle at x: walls `w` wide and `h` tall, a snowy roof and a lit window. */
function cottage(pen: Pen, x: number, w: number, h: number, wall: string): void {
  rect(pen, x - w / 2, -h, w, h, wall, 0.8)
  poly(pen, [[x - w / 2 - 0.07, -h], [x, -h - w * 0.6], [x + w / 2 + 0.07, -h]], GLOBE.roof, 0.8)
  if (pen.lod > 1) return
  poly(pen, [[x - w / 2 - 0.07, -h], [x, -h - w * 0.6], [x + w / 2 + 0.07, -h], [x + w / 2 - 0.02, -h - 0.05], [x, -h - w * 0.6 + 0.05], [x - w / 2 + 0.02, -h - 0.05]], GLOBE.snow, 0)
  rect(pen, x - w * 0.14, -h * 0.65, w * 0.28, h * 0.3, GLOBE.window, 0.6)
}

/** A fir tree, its foot at x, y and `h` tall, its tiers capped with snow. */
function fir(pen: Pen, x: number, y: number, h: number): void {
  rect(pen, x - h * 0.06, y - h * 0.16, h * 0.12, h * 0.16, GLOBE.trunk, 0)
  for (let k = 0; k < 3; k++) {
    const b = y - h * (0.12 + k * 0.26)
    const w = h * (0.42 - k * 0.1)
    poly(pen, [[x - w, b], [x, b - h * 0.46], [x + w, b]], GLOBE.fir, 0.7)
    if (pen.lod === 0) poly(pen, [[x - w * 0.35, b - h * 0.3], [x, b - h * 0.46], [x + w * 0.35, b - h * 0.3]], GLOBE.snow, 0)
  }
}

const snowglobe: Skin = {
  key: 'snowglobe',
  bg: GLOBE.water,
  ink: GLOBE.ink,
  floor: GLOBE.snow,
  edge: GLOBE.snowShade,
  plank: '#8A5E3E',
  fulcrum: GLOBE.roof,
  back(pen, _m, _v) {
    // The village: two cottages and a fir on the left, a chapel and its spire on the right, on banks of snow.
    fir(pen, -2.6, -0.1, 1.0)
    cottage(pen, -2.05, 0.5, 0.42, GLOBE.wallA)
    cottage(pen, -1.55, 0.34, 0.28, GLOBE.wallB)
    rect(pen, 2.2, -1.05, 0.2, 1.05, GLOBE.wallB, 0.8)
    poly(pen, [[2.17, -1.05], [2.3, -1.55], [2.43, -1.05]], GLOBE.roof, 0.8)
    cottage(pen, 1.95, 0.46, 0.5, GLOBE.wallA)
    ellipse(pen, -2.1, 0.06, 1.1, 0.24, GLOBE.snow, 0.8)
    ellipse(pen, 2.15, 0.06, 0.95, 0.2, GLOBE.snow, 0.8)
  },
  front(pen, m, v) {
    const { ctx } = pen
    // The snow, falling, and thrown up through the water when the globe is struck.
    const n = pen.lod === 0 ? 36 : pen.lod === 1 ? 20 : 10
    const lift = Number.isFinite(m.since) && m.since >= 0 ? 1.1 * Math.min(1, (m.s + 0.3) / 1.6) * Math.exp(-m.since / 1.4) * (1 - Math.exp(-m.since / 0.15)) : 0
    const r2 = (BALL.r - 0.08) ** 2
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const [x0, ph, sp, sz] = FLAKES[i]
      const x = x0 + 0.08 * Math.sin(m.t * 0.8 + ph * 9)
      const y = -2.75 + ((ph + m.t * sp) % 1) * 2.8 - lift * (0.5 + hash(i, 5, 51))
      if ((x - BALL.x) ** 2 + (y - BALL.y) ** 2 > r2 || y > -0.02) continue
      const s = pen.lod === 2 ? sz * 1.6 : sz
      ctx.moveTo(x + s, y)
      ctx.arc(x, y, s, 0, Math.PI * 2)
    }
    ctx.fillStyle = GLOBE.snow
    ctx.fill()
    // The room outside the glass, and the globe's wooden base.
    ctx.beginPath()
    ctx.rect(v.x0 - 0.1, v.y0 - 0.1, v.x1 - v.x0 + 0.2, v.y1 - v.y0 + 0.2)
    ctx.moveTo(BALL.x + BALL.r, BALL.y)
    ctx.arc(BALL.x, BALL.y, BALL.r, 0, Math.PI * 2, true)
    ctx.fillStyle = GLOBE.room
    ctx.fill('evenodd')
    poly(pen, [[-2.45, 0.42], [2.45, 0.42], [2.75, 1.2], [-2.75, 1.2]], GLOBE.base, 1.2)
    rect(pen, -2.47, 0.42, 4.94, 0.07, GLOBE.band, pen.lod <= 1 ? 0.8 : 0)
    if (pen.lod > 1) return
    // The glass: its edge, and the window's light on it.
    circle(pen, BALL.x, BALL.y, BALL.r, null, 1.4)
    ctx.beginPath()
    ctx.arc(BALL.x, BALL.y, BALL.r - 0.14, Math.PI * 1.08, Math.PI * 1.36)
    ctx.strokeStyle = rgba(GLOBE.rim, 0.6)
    ctx.lineWidth = 0.08
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(BALL.x, BALL.y, BALL.r - 0.14, Math.PI * 1.41, Math.PI * 1.46)
    ctx.stroke()
    ctx.lineCap = 'butt'
  },
  weight(pen) {
    // A little fir tree.
    fir(pen, 0, 0, WEIGHT_H)
  },
}

/* ------------------------------------------------------------------ a classroom */

const CLASS = {
  wall: '#E4D08C',
  dado: '#7F9AA8',
  board: '#2F4D3D',
  frame: '#9C6B42',
  chalk: '#EEEDE4',
  desk: '#C99A60',
  deskDeep: '#A87C48',
  steel: '#6E757C',
  seat: '#3E6A9C',
  ocean: '#3F7DBA',
  land: '#82B65A',
  brass: '#B98A38',
  lino: '#A99C86',
  linoDeep: '#978A74',
  apple: '#C52F3A',
  leaf: '#5D9A3A',
  bookA: '#3D5B8C',
  bookB: '#8C4A38',
  page: '#F2EAD6',
  ink: '#2A2622',
}

/** A school desk at x: its top, its box and its steel legs. */
function desk(pen: Pen, x: number): void {
  fillRects(pen, CLASS.steel, (ctx) => {
    ctx.rect(x - 0.4, -0.6, 0.04, 0.6)
    ctx.rect(x + 0.36, -0.6, 0.04, 0.6)
  })
  rect(pen, x - 0.4, -0.66, 0.8, 0.16, CLASS.deskDeep, 0.8)
  rect(pen, x - 0.46, -0.72, 0.92, 0.07, CLASS.desk, 0.8)
}

const classroom: Skin = {
  key: 'classroom',
  bg: CLASS.wall,
  ink: CLASS.ink,
  floor: CLASS.lino,
  edge: CLASS.linoDeep,
  plank: CLASS.desk,
  fulcrum: CLASS.steel,
  back(pen, m, v) {
    const { ctx } = pen
    // Painted blue to the waist.
    rect(pen, v.x0 - 0.1, -0.8, v.x1 - v.x0 + 0.2, 0.8, CLASS.dado, 0)
    if (pen.lod <= 1) line(pen, v.x0, -0.8, v.x1, -0.8, CLASS.frame, 0.04)
    // The blackboard, high across the wall, and its chalk tray.
    rect(pen, -2.8, -2.6, 5.6, 0.81, CLASS.frame, 0.8)
    rect(pen, -2.72, -2.52, 5.44, 0.65, CLASS.board, 0)
    rect(pen, -2.85, -1.82, 5.7, 0.06, CLASS.frame, pen.lod <= 1 ? 0.8 : 0)
    if (pen.lod <= 1) {
      // On it, in chalk: a circle, a triangle, a throw and its landing, and a little chart.
      ctx.beginPath()
      ctx.moveTo(-1.8, -2.18)
      ctx.arc(-2.0, -2.18, 0.2, 0, Math.PI * 2)
      ctx.moveTo(-1.4, -1.98)
      ctx.lineTo(-0.85, -1.98)
      ctx.lineTo(-1.12, -2.38)
      ctx.closePath()
      ctx.moveTo(-0.3, -2.0)
      ctx.quadraticCurveTo(0.5, -2.8, 1.3, -2.0)
      ctx.moveTo(-0.45, -1.98)
      ctx.lineTo(1.45, -1.98)
      for (let i = 0; i < 3; i++) {
        ctx.rect(1.75 + i * 0.24, -1.98 - (i + 1) * 0.13, 0.14, (i + 1) * 0.13)
      }
      ctx.strokeStyle = rgba(CLASS.chalk, 0.85)
      ctx.lineWidth = pen.lod === 0 ? 0.025 : 0.04
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.lineCap = 'butt'
      circle(pen, -0.3, -2.06, 0.06, rgba(CLASS.chalk, 0.85), 0)
      rect(pen, 0.4, -1.86, 0.18, 0.035, CLASS.chalk, 0)
    }
    // A puff of chalk dust off the tray when the floor is struck.
    if (pen.lod <= 1 && Number.isFinite(m.since) && m.since >= 0 && m.since < 1.2 && m.s > 0.9) {
      const a = Math.exp(-m.since / 0.4)
      fillRects(pen, rgba(CLASS.chalk, 0.7 * a), (c) => {
        for (let i = 0; i < 5; i++) {
          const x = 0.3 + i * 0.08 + m.since * 0.2 * (i - 2)
          const y = -1.88 - m.since * (0.25 + 0.06 * i)
          c.moveTo(x + 0.03, y)
          c.arc(x, y, 0.03 + m.since * 0.03, 0, Math.PI * 2)
        }
      })
    }
    // A desk either side; a globe on the left one, turning, and a chair tucked in at the right one.
    desk(pen, -2.2)
    desk(pen, 2.25)
    const gx0 = -2.2
    const gy0 = -1.12
    const gr = 0.27
    if (pen.lod <= 1) line(pen, gx0, -0.74, gx0, gy0, CLASS.brass, 0.03)
    ellipse(pen, gx0, -0.75, 0.13, 0.035, CLASS.brass, 0.7)
    circle(pen, gx0, gy0, gr, CLASS.ocean)
    if (pen.lod <= 1) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(gx0, gy0, gr, 0, Math.PI * 2)
      ctx.clip()
      fillRects(pen, CLASS.land, (c) => {
        for (let k = 0; k < 3; k++) {
          const x = gx0 - 0.45 + (((m.t * 0.08 + k / 3) % 1) * 0.9)
          c.moveTo(x + 0.11, gy0 - 0.08 + k * 0.08)
          c.ellipse(x, gy0 - 0.08 + k * 0.08, 0.11, 0.07 + 0.03 * k, 0.3 * k, 0, Math.PI * 2)
        }
      })
      ctx.restore()
      circle(pen, gx0, gy0, gr, null, 0.8)
      ctx.beginPath()
      ctx.arc(gx0, gy0, gr + 0.05, Math.PI * 0.6, Math.PI * 1.55)
      ctx.strokeStyle = CLASS.brass
      ctx.lineWidth = 0.03
      ctx.stroke()
    }
    // The chair: its seat, its back and its legs, in front of the desk.
    const cx = 2.4
    fillRects(pen, CLASS.steel, (c) => {
      c.rect(cx - 0.22, -0.4, 0.035, 0.4)
      c.rect(cx + 0.19, -0.75, 0.035, 0.75)
    })
    rect(pen, cx - 0.25, -0.44, 0.5, 0.06, CLASS.seat, 0.8)
    rect(pen, cx + 0.13, -0.98, 0.14, 0.32, CLASS.seat, 0.8)
  },
  front(pen, _m, v) {
    // The lino's tiles.
    if (pen.lod > 1) return
    strokeLines(pen, CLASS.linoDeep, pen.lw * 0.8, (ctx) => {
      for (let y = 0.4; y < v.y1; y += 0.33) {
        ctx.moveTo(v.x0, y)
        ctx.lineTo(v.x1, y)
      }
      if (pen.lod > 0) return
      for (let x = Math.floor(v.x0 / 0.5) * 0.5; x < v.x1; x += 0.5) {
        ctx.moveTo(x, 0.07)
        ctx.lineTo(x, v.y1)
      }
    })
  },
  weight(pen) {
    // An apple on two books.
    rect(pen, -0.15, -0.08, 0.3, 0.08, CLASS.bookA, 0.7)
    rect(pen, -0.13, -0.16, 0.27, 0.08, CLASS.bookB, 0.7)
    if (pen.lod <= 1) {
      fillRects(pen, CLASS.page, (ctx) => {
        ctx.rect(0.11, -0.07, 0.03, 0.06)
        ctx.rect(-0.12, -0.15, 0.03, 0.06)
      })
    }
    circle(pen, 0, -0.245, 0.09, CLASS.apple)
    if (pen.lod <= 1) {
      line(pen, 0, -0.33, 0.015, -0.36, CLASS.ink, 0.015)
      ellipse(pen, 0.045, -0.35, 0.035, 0.016, CLASS.leaf, 0, -0.4)
    }
  },
}

/* ------------------------------------------------------------------ the table */

export const TOY_SKINS = { dominoes, chess, cards, jigsaw, yarn, stainedglass, popart, circuit, candy, snowglobe, classroom } as const satisfies Record<string, Skin>

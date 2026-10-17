import type p5 from 'p5'
import { ballAt, laneAt, laneTime, type BallChange, type BallState, type Lane, type Piece, type PieceCtx, type Pt, type Seg } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { ShowBall } from '../../../../show'

/**
 * The kit Amber is built from, the same shape as Kick's: a part draws from the seconds since the ball came in, and
 * answers a slot with a lane that lasts exactly that long. The score lays the parts; the planner never sees them.
 */

/** When a part has the ball. Show seconds. */
export interface Slot {
  begin: number
  end: number
  hits: number[]
}

/** What a part answers a slot with. */
export interface Built<S> {
  cells: Pt[]
  exit: Pt
  lane: Lane
  state: S
  changes?: BallChange[]
  /** Ellie, while this part has her. Positions are in the part's frame; the score moves them. */
  company?: Company[]
}

/** The ball's own fields but its id and, unless it has changed, its colour. */
export type Companion = Omit<ShowBall, 'id' | 'color'> & { color?: string }

export type Who = 'ellie'

/** A stretch of show time in which a part has Ellie. */
export interface Company {
  from: number
  to: number
  at: (t: number) => Companion | null
  who: Who
}

/** A camera key in the part's own cells. The score moves `hold` into the world. */
export interface PartShot {
  t: number
  cells: number
  hold?: Pt
  w?: number
  off?: Pt
}

export interface Part<S = any> {
  piece: Piece<S>
  build(slot: Slot): Built<S>
  shots?(slot: Slot, built: Built<S>): PartShot[]
}

type Drawing<S> = Pick<Piece<S>, 'name' | 'draw' | 'over'>

type Styled = {
  drawingContext: CanvasRenderingContext2D
  _cachedFillStyle?: unknown
  _cachedStrokeStyle?: unknown
  _setFill?: (f: unknown) => void
  _setStroke?: (s: unknown) => void
  amberHonest?: boolean
}

/**
 * p5 skips a fill it thinks it already set. Gradients written straight to the canvas fool that note, so the next
 * flat fill would come out as the gradient. This renderer always sets the style it is given.
 */
function honest(p: p5): void {
  const r = (p as unknown as { _renderer?: Styled })._renderer
  if (!r || r.amberHonest || !r._setFill || !r._setStroke) return
  r.amberHonest = true
  r._setFill = function (this: Styled, f: unknown) {
    this.drawingContext.fillStyle = f as string
    this._cachedFillStyle = f
  }
  r._setStroke = function (this: Styled, v: unknown) {
    this.drawingContext.strokeStyle = v as string
    this._cachedStrokeStyle = v
  }
}

const honestly = <S>(drawing: Drawing<S>): Drawing<S> => ({
  ...drawing,
  draw: (p, s, c) => {
    honest(p)
    drawing.draw?.(p, s, c)
  },
  over: drawing.over
    ? (p, s, c) => {
        honest(p)
        drawing.over?.(p, s, c)
      }
    : undefined,
})

/** The show time a part was entered at, so a drawing can ask for the recording's clock. */
export interface Clock {
  t0: number
}

/**
 * A lane sampled from the same function the drawing uses. `at` is in show seconds. The lane lasts the slot, and
 * leaves from wherever `at` says the ball is at the end of it.
 */
export function sample(slot: Slot, at: (show: number) => Pt, cells: Pt[], company?: Company[]): Built<Clock> {
  const span = slot.end - slot.begin
  const n = Math.max(8, Math.ceil(span / 0.18))
  const local = (s: number) => at(slot.begin + s)
  const end = local(span)
  return {
    cells,
    exit: [end[0] + 0.5, end[1]],
    lane: { segs: carried(local, 0, span, n), fire: 0 },
    state: { t0: slot.begin },
    company,
  }
}

/** A part: a drawing and the lane it builds for a slot. */
export const part = <S>(drawing: Drawing<S>, build: (slot: Slot) => Built<S>, shots?: (slot: Slot, built: Built<S>) => PartShot[]): Part<S> => ({
  piece: { weight: 0, place: () => null, ...honestly(drawing) },
  build,
  shots,
})

/** A waypoint: where the ball is at `at` (seconds into the slot). */
export interface Way {
  at: number
  p: Pt
  ease?: Seg['ease']
}

/** Straight runs and pauses through timed waypoints. A segment takes exactly the gap between its ends. */
export function route(ways: Way[]): Seg[] {
  const segs: Seg[] = []
  for (let i = 1; i < ways.length; i++) {
    const a = ways[i - 1]
    const b = ways[i]
    const seg: Seg = { from: a.p, to: b.p, dur: Math.max(0, b.at - a.at) }
    if (b.ease) seg.ease = b.ease
    segs.push(seg)
  }
  return segs
}

/**
 * The ball carried by something that moves on its own clock: sampled from `at(t)` between `t0` and `t1`. The lane and
 * the drawing read the same function, so the ball never slides off what carries it.
 */
export function carried(at: (t: number) => Pt, t0: number, t1: number, n: number): Seg[] {
  const out: Seg[] = []
  if (t1 <= t0) return out
  const dt = (t1 - t0) / n
  for (let i = 0; i < n; i++) out.push({ from: at(t0 + i * dt), to: at(t0 + (i + 1) * dt), dur: dt })
  return out
}

/** Every cell of a box, inclusive, so a large drawing is on stage whenever any of it is in view. */
export function box(x0: number, y0: number, x1: number, y1: number, step = 2): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x += step) for (let y = Math.floor(y0); y <= Math.ceil(y1); y += step) out.push([x, y])
  return out
}

export interface Link {
  part: Part
  end: number
  hits?: number[]
}

export interface Chain {
  placed: Placed[]
  shots: { t: number; cells: number; hold?: Pt; w?: number; off?: Pt }[]
  company: Company[]
  next: { col: number; row: number; begin: number; ball: BallState }
}

/** Lay the links end to end from an entry cell. A lane that misses its slot or its exit is said at once. */
export function lay(start: { col: number; row: number; begin: number; ball: BallState }, links: Link[]): Chain {
  let { col, row, begin, ball } = start
  const placed: Placed[] = []
  const shots: Chain['shots'] = []
  const company: Company[] = []
  for (const link of links) {
    const slot: Slot = { begin, end: link.end, hits: link.hits ?? [] }
    const built = link.part.build(slot)
    const span = link.end - begin
    const time = laneTime(built.lane)
    if (Math.abs(time - span) > 1e-6) console.warn(`amber: ${link.part.piece.name} lasts ${time.toFixed(4)}s of a ${span.toFixed(4)}s slot`)
    const end = laneAt(built.lane, time)
    if (Math.hypot(end.x - (built.exit[0] - 0.5), end.y - built.exit[1]) > 1e-6) console.warn(`amber: ${link.part.piece.name} ends at ${end.x.toFixed(3)},${end.y.toFixed(3)}, not at its exit`)
    const changes = [...(built.changes ?? [])].sort((a, b) => a.at - b.at)
    placed.push({
      piece: link.part.piece,
      state: built.state,
      col,
      row,
      mirror: 1,
      cells: built.cells.map(([dx, dy]) => [col + dx, row + dy] as Pt),
      lane: built.lane,
      start: begin,
      span,
      ballIn: ball,
      changes,
      points: 0,
    })
    for (const span of built.company ?? []) {
      const ox = col
      const oy = row
      company.push({
        from: span.from,
        to: span.to,
        who: span.who,
        at: (t) => {
          const b = span.at(t)
          return b ? { ...b, x: b.x + ox, y: b.y + oy } : null
        },
      })
    }
    for (const k of link.part.shots?.(slot, built) ?? []) shots.push({ ...k, hold: k.hold ? [col + k.hold[0], row + k.hold[1]] : undefined })
    ball = ballAt(ball, changes, span)
    col += built.exit[0]
    row += built.exit[1]
    begin = link.end
  }
  return { placed, shots, company, next: { col, row, begin, ball } }
}

/**
 * Where the stage's frame is, in this drawing's own cells: the camera, read back from the canvas transform. A sky
 * fills the frame from it, and a far hill moves slower than the ground.
 */
export function frame(p: p5, k: number): { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number } {
  const m = (p.drawingContext as CanvasRenderingContext2D).getTransform().inverse()
  const d = p.pixelDensity()
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [px, py] of [
    [0, 0],
    [p.width * d, 0],
    [0, p.height * d],
    [p.width * d, p.height * d],
  ]) {
    const x = (m.a * px + m.c * py + m.e) / k
    const y = (m.b * px + m.d * py + m.f) / k
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}

/** A stable hash in [0, 1). */
export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export type Ctx = PieceCtx

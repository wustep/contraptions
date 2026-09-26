import type p5 from 'p5'
import { ballAt, laneAt, laneTime, type BallChange, type BallState, type Lane, type Piece, type PieceCtx, type Pt, type Seg } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { ShowBall } from '../../../../show'

/**
 * The kit every part of Seb's is built from.
 *
 * A part is a stock-shaped piece (it draws from `t`, the seconds since the
 * ball came in, and never draws the ball) that is not placed by the planner.
 * The score hands it a slot instead: the show time the ball arrives, the show
 * time it must leave, and the measured onsets it may strike in between. The
 * part answers with a lane whose segments add up to exactly that slot, so a
 * strike is where the music is by construction and not by nudging.
 *
 * The thread is Sebastian, the blue ball. Everyone else (Mia, and in the
 * room at the start and the end, David; in the home movie, their son) is
 * company: a part says where they are, over any stretch of show time, in its
 * own cells, and the show moves them into the world.
 */

/** When a part has the ball, and what it has to hit. Show seconds. */
export interface Slot {
  begin: number
  end: number
  hits: number[]
}

/** What a part answers a slot with: canonical cells from its entry cell, the next entry cell, its lane and its drawing state. */
export interface Built<S> {
  cells: Pt[]
  exit: Pt
  lane: Lane
  state: S
  changes?: BallChange[]
  /**
   * The company, wherever this part shows them. Each span is in show seconds
   * and may run past the part's own slot (Mia can be seen on the stage while
   * he is still up in the flies); at any time at most one span in the show
   * has each of them. Positions are in the part's frame; null while one is
   * out of sight, and only while out of shot.
   */
  company?: Company[]
}

/** Where one of them is: the ball's own fields but its id and, unless it has changed, its colour. */
export type Companion = Omit<ShowBall, 'id' | 'color'> & { color?: string }

/** Who keeps him company: Mia, David (only in the room, in the life she has), or their son (only in the home movie). */
export type Who = 'mia' | 'david' | 'son'

/** A stretch of show time in which a part has one of them. */
export interface Company {
  from: number
  to: number
  who: Who
  at: (t: number) => Companion | null
}

/**
 * A camera key a part asks for, in its own cells: `hold` is a point of the
 * part's frame (the entry cell's centre is 0,0), which the score moves to
 * the world. `off` and `cells` need no moving.
 */
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
  /** The camera keys this part wants while it has the ball (show times inside its slot). */
  shots?(slot: Slot, built: Built<S>): PartShot[]
}

type Drawing<S> = Pick<Piece<S>, 'name' | 'draw' | 'over' | 'flight' | 'dynamic'>

type Styled = { drawingContext: CanvasRenderingContext2D; _cachedFillStyle?: unknown; _cachedStrokeStyle?: unknown; _setFill?: (f: unknown) => void; _setStroke?: (s: unknown) => void; sebsHonest?: boolean }
/**
 * p5 keeps a note of the fill and stroke it last set, and does not set the same again. The parts here also paint
 * gradients and glows straight onto the canvas, which p5 never hears of, so a later `fill` of the noted colour would
 * be skipped and paint with the gradient instead. So the renderer Seb's draws with always sets the style it is given.
 */
function honest(p: p5): void {
  const r = (p as unknown as { _renderer?: Styled })._renderer
  if (!r || r.sebsHonest || !r._setFill || !r._setStroke) return
  r.sebsHonest = true
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
    drawing.draw(p, s, c)
  },
  over: drawing.over
    ? (p, s, c) => {
        honest(p)
        drawing.over!(p, s, c)
      }
    : undefined,
})

/** A part: a drawing and the lane it builds for a slot. The planner never draws it (weight 0, no placement). */
export const part = <S>(drawing: Drawing<S>, build: (slot: Slot) => Built<S>, shots?: (slot: Slot, built: Built<S>) => PartShot[]): Part<S> => ({
  piece: { weight: 0, place: () => null, ...honestly(drawing) },
  build,
  shots,
})

/** A drawing with no ball of its own: a room, a sky, a light. It is handed show time as `t`. */
export const scenery = <S>(drawing: Drawing<S>): Piece<S> => ({ weight: 0, place: () => null, ...honestly(drawing) })

/** A waypoint: where the ball is at `at` (seconds into the slot), and how it got there from the one before. */
export interface Way {
  at: number
  p: Pt
  arc?: number
  ease?: Seg['ease']
  ramp?: [number, number]
  hidden?: boolean
}

/** Straight runs, pauses and flights through timed waypoints. The time a segment takes is the gap between its ends, exactly. */
export function route(ways: Way[]): Seg[] {
  const segs: Seg[] = []
  for (let i = 1; i < ways.length; i++) {
    const a = ways[i - 1]
    const b = ways[i]
    const seg: Seg = { from: a.p, to: b.p, dur: Math.max(0, b.at - a.at) }
    if (b.arc) seg.arc = b.arc
    if (b.ease) seg.ease = b.ease
    if (b.ramp) seg.ramp = b.ramp
    if (b.hidden) seg.hidden = true
    segs.push(seg)
  }
  return segs
}

/**
 * The ball carried by something that moves on its own clock: sampled from
 * `at(t)` between `t0` and `t1`, `n` straight pieces of equal time. The lane
 * and the drawing then read the same function, so the ball never slides off
 * what carries it.
 */
export function carried(at: (t: number) => Pt, t0: number, t1: number, n: number, hidden = false): Seg[] {
  const out: Seg[] = []
  if (t1 <= t0) return out
  const dt = (t1 - t0) / n
  for (let i = 0; i < n; i++) {
    const seg: Seg = { from: at(t0 + i * dt), to: at(t0 + (i + 1) * dt), dur: dt }
    if (hidden) seg.hidden = true
    out.push(seg)
  }
  return out
}

/** Every cell of a box, inclusive: what a large drawing claims so the stage draws it whenever any of it is in view. */
export function box(x0: number, y0: number, x1: number, y1: number, step = 1): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x += step) for (let y = Math.floor(y0); y <= Math.ceil(y1); y += step) out.push([x, y])
  return out
}

/** One link of a chain: the part, the show time the ball leaves it, the onsets it strikes. */
export interface Link {
  part: Part
  end: number
  hits?: number[]
}

export interface Chain {
  placed: Placed[]
  /** The camera keys the parts asked for, moved into the world. */
  shots: { t: number; cells: number; hold?: Pt; w?: number; off?: Pt }[]
  /** The parts' spans of the company, in world cells. */
  company: Company[]
  /** Where the next link would enter, and when: for a chain carried on in another universe. */
  next: { col: number; row: number; begin: number; ball: BallState }
}

/**
 * Lay the links end to end from an entry cell. Each part is told its slot,
 * builds its lane, and is placed where the one before it said the ball
 * would be. The seams are checked: a lane that does not end where the next
 * begins, or that does not last its slot, is said at once.
 */
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
    if (Math.abs(time - span) > 1e-6) console.warn(`sebs: ${link.part.piece.name} lasts ${time.toFixed(4)}s of a ${span.toFixed(4)}s slot`)
    const end = laneAt(built.lane, time)
    if (Math.hypot(end.x - (built.exit[0] - 0.5), end.y - built.exit[1]) > 1e-6) console.warn(`sebs: ${link.part.piece.name} ends at ${end.x.toFixed(3)},${end.y.toFixed(3)}, not at its exit`)
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
    for (const s of built.company ?? []) {
      const ox = col
      const oy = row
      company.push({ from: s.from, to: s.to, who: s.who, at: (t) => { const b = s.at(t); return b ? { ...b, x: b.x + ox, y: b.y + oy } : null } })
    }
    for (const k of link.part.shots?.(slot, built) ?? []) shots.push({ ...k, hold: k.hold ? [col + k.hold[0], row + k.hold[1]] : undefined })
    ball = ballAt(ball, changes, span)
    col += built.exit[0]
    row += built.exit[1]
    begin = link.end
  }
  return { placed, shots, company, next: { col, row, begin, ball } }
}

/** A drawing that stands for the whole show at `col, row`, claiming `cells` (absolute). It is told show time. */
export function standing<S>(piece: Piece<S>, col: number, row: number, cells: Pt[], state: S, duration: number): Placed {
  return {
    piece,
    state,
    col,
    row,
    mirror: 1,
    cells,
    lane: { segs: [{ from: [0, 0], to: [0, 0], dur: duration }], fire: 0 },
    start: 0,
    span: duration,
    ballIn: { color: '#000000', ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

/* ------------------------------------------------------------------ drawing */

/**
 * Where the stage's frame is, in this drawing's own cell units: the camera
 * the stage is using, read back from the canvas transform. What lets a sky
 * fill the frame, or a far wall move slower than the near ones, without the
 * part being told about the camera.
 */
export function frame(p: p5, k: number): { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number } {
  const m = (p.drawingContext as CanvasRenderingContext2D).getTransform().inverse()
  const d = p.pixelDensity()
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [px, py] of [[0, 0], [p.width * d, 0], [0, p.height * d], [p.width * d, p.height * d]]) {
    const x = (m.a * px + m.c * py + m.e) / k
    const y = (m.b * px + m.d * py + m.f) / k
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }
}

/** A colour with an alpha, 0..1. */
export function alpha(p: p5, hex: string, a: number): p5.Color {
  const c = p.color(hex)
  c.setAlpha(Math.max(0, Math.min(255, a * 255)))
  return c
}

/** `#rrggbb` with an alpha, 0..1, as a CSS string: for gradients painted on the canvas itself. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`
}

/**
 * A soft pool of light: a radial gradient from `color` at `a` in the middle to nothing at radius `r` (cells). What a
 * lamp, a spotlight's floor or a window throws. Drawn with the canvas's own gradient, so no ink.
 */
export function glow(p: p5, k: number, x: number, y: number, r: number, color: string, a: number, rx = 1, ry = 1): void {
  if (a <= 0.003 || r <= 0) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  ctx.save()
  ctx.translate(x * k, y * k)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * k)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(0.45, rgba(color, a * 0.45))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r * k, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * A beam: a soft cone from a lamp at (x0, y0) to a pool at (x1, y1), `w0` wide at the lamp and `w1` at the far end,
 * fading along its length. A spotlight's shaft, a projector's throw.
 */
export function beam(p: p5, k: number, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, color: string, a: number): void {
  if (a <= 0.003) return
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dx = x1 - x0
  const dy = y1 - y0
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  ctx.save()
  const g = ctx.createLinearGradient(x0 * k, y0 * k, x1 * k, y1 * k)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(1, rgba(color, a * 0.25))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo((x0 + (nx * w0) / 2) * k, (y0 + (ny * w0) / 2) * k)
  ctx.lineTo((x1 + (nx * w1) / 2) * k, (y1 + (ny * w1) / 2) * k)
  ctx.lineTo((x1 - (nx * w1) / 2) * k, (y1 - (ny * w1) / 2) * k)
  ctx.lineTo((x0 - (nx * w0) / 2) * k, (y0 - (ny * w0) / 2) * k)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** A stable hash in [0, 1) for scattering stars and bulbs by index. */
export const hash = (a: number, b = 0, s = 0): number => {
  let h = (a * 374761393 + b * 668265263 + s * 1013904223) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** 0 until `a`, 1 from `b`, smooth between. */
export const smooth = (t: number, a: number, b: number): number => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return u * u * (3 - 2 * u)
}

/** A knock: 1 at the moment `since` crosses zero, decaying. 0 before. */
export const knock = (since: number, decay = 0.18): number => (since < 0 ? 0 : Math.exp(-since / decay))

/**
 * A damped ring after a hit at `since` = 0: what a struck thing does as it settles (a lamp on its cord, a flat on
 * its lines). 0 before, 1 at the hit going to 0, with `hz` swings a second.
 */
export const ring = (since: number, hz = 1.6, decay = 0.35): number => (since < 0 ? 0 : Math.exp(-since / decay) * Math.cos(2 * Math.PI * hz * since))

/** The most recent of `times` at or before `t`, and how long ago; -1 and Infinity when none has come. */
export function lastOf(times: readonly number[], t: number): { i: number; ago: number } {
  let i = -1
  for (let j = 0; j < times.length; j++) if (times[j] <= t) i = j
  return { i, ago: i < 0 ? Infinity : t - times[i] }
}

export type Ctx = PieceCtx

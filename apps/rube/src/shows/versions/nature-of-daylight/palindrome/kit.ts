import type p5 from 'p5'
import { ballAt, laneAt, laneTime, type BallChange, type BallState, type Lane, type Piece, type PieceCtx, type Pt, type Seg } from '../../../../parts'
import type { Placed } from '../../../../plan'
import type { ShowBall } from '../../../../show'

/**
 * The kit every part of Palindrome is built from (after Liftoff's, All at Once's, Merry-Go-Round's and Logogram's).
 *
 * A part is a stock-shaped piece (it draws from `t`, the seconds since the
 * ball came in, and never draws the ball) that is not placed by the planner.
 * The score hands it a slot instead: the show time the ball arrives, the show
 * time it must leave, and the measured onsets it has to strike in between.
 * The part answers with a lane whose segments add up to exactly that slot,
 * so a strike is where the music is by construction and not by nudging.
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
   * Balls besides the thread, while this part has it. Given show time and the
   * thread's ball (in world cells), return every ball the stage is to draw —
   * the thread's own included, as it is or changed — or null for the thread
   * alone. Positions here are in the part's own frame; the score moves them.
   */
  riders?: Riders
  /**
   * Ian (`worlds.ts`, IAN), Hannah (HANNAH) and Shang (SHANG), wherever this part
   * shows them. Each span is in show seconds and may run past the part's own
   * slot; at any time at most one part in the show has each of them. Positions
   * are in the part's frame; null while they are out of sight (and only when
   * they are out of shot, or at a cut, when the whole place changes). A span may
   * set `scale`: Hannah grows (`hannahScale` in worlds.ts).
   */
  company?: Company[]
}

/** See `Built.riders`. */
export type Riders = (t: number, hero: ShowBall) => ShowBall[] | null

/** Where they are: the ball's own fields but its id and, unless they have changed, its colour. */
export type Companion = Omit<ShowBall, 'id' | 'color'> & { color?: string }

/** Who keeps the hero company. */
export type Who = 'ian' | 'hannah' | 'shang'

/** A stretch of show time in which a part has one of them. */
export interface Company {
  from: number
  to: number
  at: (t: number) => Companion | null
  who: Who
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
  /** A cut on this key, on one of the part's strikes (`Shot.cut`). */
  cut?: boolean
}

export interface Part<S = any> {
  piece: Piece<S>
  build(slot: Slot): Built<S>
  /** The camera keys this part wants while it has the ball (show times inside its slot). */
  shots?(slot: Slot, built: Built<S>): PartShot[]
}

type Drawing<S> = Pick<Piece<S>, 'name' | 'draw' | 'over' | 'flight' | 'dynamic'>

type Styled = { drawingContext: CanvasRenderingContext2D; _cachedFillStyle?: unknown; _cachedStrokeStyle?: unknown; _setFill?: (f: unknown) => void; _setStroke?: (s: unknown) => void; palindromeHonest?: boolean }
/**
 * p5 keeps a note of the fill and stroke it last set, and does not set the same again. The parts here also paint
 * gradients straight onto the canvas, which p5 never hears of, so a later `fill` of the noted colour would be skipped
 * and paint with the gradient instead (a dark that came out beige). So the renderer this show draws with always sets
 * the style it is given.
 */
function honest(p: p5): void {
  const r = (p as unknown as { _renderer?: Styled })._renderer
  if (!r || r.palindromeHonest || !r._setFill || !r._setStroke) return
  r.palindromeHonest = true
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

/** A drawing with no ball of its own: a sky, a house front, a drone. It is handed show time as `t`. */
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
  shots: { t: number; cells: number; hold?: Pt; w?: number; off?: Pt; cut?: boolean }[]
  /** The parts' riders, each over its own slot, in world cells. */
  riders: { from: number; to: number; fn: Riders }[]
  /** The parts' spans of Ian, Hannah and Shang, in world cells. */
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
  const riders: Chain['riders'] = []
  const company: Company[] = []
  for (const link of links) {
    const slot: Slot = { begin, end: link.end, hits: link.hits ?? [] }
    const built = link.part.build(slot)
    const span = link.end - begin
    const time = laneTime(built.lane)
    if (Math.abs(time - span) > 1e-6) console.warn(`palindrome: ${link.part.piece.name} lasts ${time.toFixed(4)}s of a ${span.toFixed(4)}s slot`)
    const end = laneAt(built.lane, time)
    if (Math.hypot(end.x - (built.exit[0] - 0.5), end.y - built.exit[1]) > 1e-6) console.warn(`palindrome: ${link.part.piece.name} ends at ${end.x.toFixed(3)},${end.y.toFixed(3)}, not at its exit`)
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
    if (built.riders) {
      const fn = built.riders
      const ox = col
      const oy = row
      // The part thinks in its own frame: the hero goes in moved there, and every ball comes out moved back.
      riders.push({
        from: begin,
        to: link.end,
        fn: (t, hero) => fn(t, { ...hero, x: hero.x - ox, y: hero.y - oy })?.map((b) => ({ ...b, x: b.x + ox, y: b.y + oy })) ?? null,
      })
    }
    for (const span of built.company ?? []) {
      const ox = col
      const oy = row
      company.push({ from: span.from, to: span.to, who: span.who, at: (t) => { const b = span.at(t); return b ? { ...b, x: b.x + ox, y: b.y + oy } : null } })
    }
    for (const k of link.part.shots?.(slot, built) ?? []) shots.push({ ...k, hold: k.hold ? [col + k.hold[0], row + k.hold[1]] : undefined })
    ball = ballAt(ball, changes, span)
    col += built.exit[0]
    row += built.exit[1]
    begin = link.end
  }
  return { placed, shots, riders, company, next: { col, row, begin, ball } }
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
 * fill the frame, or a far hill move slower than the near ones, without the
 * part being told about the camera.
 */
export function frame(p: p5, k: number): { x0: number; y0: number; x1: number; y1: number; cx: number; cy: number } {
  // The canvas's corners taken back through the transform (which may be turned, when the camera rolls): the box
  // round them, in cells.
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

/** A stable hash in [0, 1) for scattering stars and stalks by index. */
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

/** The most recent of `times` at or before `t`, and how long ago; -1 and Infinity when none has come. */
export function lastOf(times: readonly number[], t: number): { i: number; ago: number } {
  let i = -1
  for (let j = 0; j < times.length; j++) if (times[j] <= t) i = j
  return { i, ago: i < 0 ? Infinity : t - times[i] }
}

export type Ctx = PieceCtx

let scratch: [HTMLCanvasElement, HTMLCanvasElement] | null = null

/**
 * Two scratch canvases at least w by h, shared by everything soft drawn small. Callers ask a little more than they use
 * and clear it: scaled up, a canvas is read a pixel past the part drawn from, and what an earlier, larger use left there
 * stood in the frame as a faint line along the edge.
 */
export function scratchPair(w: number, h: number): [HTMLCanvasElement, HTMLCanvasElement] {
  if (!scratch) scratch = [document.createElement('canvas'), document.createElement('canvas')]
  for (const c of scratch) {
    if (c.width < w) c.width = w
    if (c.height < h) c.height = h
  }
  return scratch
}

/**
 * Soft things laid on the frame: drawn into a scratch canvas at `scale` of full size (half, unless told), blurred there
 * once if `blur` (in pixels) asks it, and laid on whole. `box` is the region it may cover, in the frame's own units
 * (px, under the current transform). For what is soft already, the fog's far lobes, a small canvas costs a fraction.
 */
export function softLayer(
  ctx: CanvasRenderingContext2D,
  box: [number, number, number, number],
  blur: number,
  draw: (c: CanvasRenderingContext2D) => void,
  scale = 0.5,
): void {
  const m = ctx.getTransform()
  const S = scale
  const pad = Math.ceil(3 * blur * S) + 2
  const cw = ctx.canvas.width
  const ch = ctx.canvas.height
  const ax = Math.max(0, Math.floor(m.a * box[0] + m.e))
  const ay = Math.max(0, Math.floor(m.d * box[1] + m.f))
  const bx = Math.min(cw, Math.ceil(m.a * box[2] + m.e))
  const by = Math.min(ch, Math.ceil(m.d * box[3] + m.f))
  if (bx - ax < 2 || by - ay < 2) return
  const w = Math.ceil((bx - ax) * S) + 2 * pad
  const h = Math.ceil((by - ay) * S) + 2 * pad
  const pair = scratchPair(w + 4, h + 4)
  const [A, B] = pair.map((c) => c.getContext('2d') as CanvasRenderingContext2D)
  A.setTransform(1, 0, 0, 1, 0, 0)
  A.clearRect(0, 0, w + 4, h + 4)
  A.setTransform(m.a * S, m.b * S, m.c * S, m.d * S, (m.e - ax) * S + pad, (m.f - ay) * S + pad)
  draw(A)
  if (blur > 0) {
    B.setTransform(1, 0, 0, 1, 0, 0)
    B.clearRect(0, 0, w + 4, h + 4)
    B.filter = `blur(${(blur * S).toFixed(2)}px)`
    B.drawImage(pair[0], 0, 0, w, h, 0, 0, w, h)
    B.filter = 'none'
  }
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(pair[blur > 0 ? 1 : 0], 0, 0, w, h, ax - pad / S, ay - pad / S, w / S, h / S)
  ctx.restore()
}

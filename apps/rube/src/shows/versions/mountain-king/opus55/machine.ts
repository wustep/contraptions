import type { Theme } from '../../../../../../../src/core/themes'
import { R, ballAt, laneAt, laneTime, type BallState, type Lane, type LanePoint, type Piece, type PieceCtx, type Placement, type Pt, type Seg } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { worldCells } from '../../../../plan'
import type { Universe, UniversePoint } from '../../../../universe'
import type { Backdrop, World } from '../../../../worlds'
import { isTimed, type TempoCtx, type TimedPiece } from '../../../../playground/pieces/dovre/tempo'
import { beatAt, beatTime } from './grid'

/**
 * The machinery under the show: how a piece is put on the music's clock.
 *
 * Every troll piece is written in beats (`tempo.ts`), so the show plans
 * each one at a beat of 1: its lane's seconds are beats. Then it **warps**
 * the piece's clock onto the measured grid: a piece that comes in on beat
 * `b` is told, at show time `t`, that `beatAt(t) − b` of its beats have
 * gone. So every blow a piece strikes lands on the recording's own beat,
 * however the orchestra pushes the tempo, and nothing drifts; the ball's
 * pace rises and falls with the music, because its pace is a cell a beat.
 *
 * Positions are world cells; a universe is one palette, one set of pieces,
 * and a stretch of the show's time. The riders who are not the ball (the
 * trolls) are drawn by the cast (`cast.ts`) from tracks in the same beats.
 */

/** A placed piece that keeps the music's time: where it comes in (beat `b`), and how many beats it lasts. */
export interface Timed extends Placed {
  /** The beat the rider comes in on. */
  b: number
  /** Beats it lasts, entry to exit. */
  n: number
}

/**
 * A piece whose drawing is told the music's beats instead of seconds. The
 * stage hands a piece `c.t`, seconds since its start; this turns that back
 * into show time, and show time into beats since the piece's own entry.
 */
function onTheBeat<S>(inner: Piece<S>, b: number, fire: number): Piece<S> {
  const at = beatTime(b)
  const warp = (c: PieceCtx): PieceCtx => {
    const tau = beatAt(at + c.t) - b
    return { ...c, t: tau, since: tau - fire }
  }
  const out: Piece<S> = { ...inner, draw: (p, s, c) => inner.draw(p, s, warp(c)) }
  if (inner.over) out.over = (p, s, c) => inner.over!(p, s, warp(c))
  if (inner.scores) out.scores = (p, s, c) => inner.scores!(p, s, warp(c))
  return out
}

/** Put a placement on the clock: in beats `b` to `b + n`, entry cell (col, row), facing `mirror`, in a universe whose zero is show time `origin`. */
export function place<S>(piece: Piece<S>, placement: Placement<S>, b: number, col: number, row: number, mirror: 1 | -1, origin: number, ball: BallState): Timed {
  const n = laneTime(placement.lane)
  const wrapped = onTheBeat(piece, b, placement.lane.fire)
  const changes = [...(placement.changes ?? [])].sort((a, c) => a.at - c.at)
  return {
    piece: wrapped,
    state: placement.state,
    col,
    row,
    mirror,
    cells: worldCells(placement.cells, col, row, mirror),
    lane: placement.lane,
    start: beatTime(b) - origin,
    span: beatTime(b + n) - beatTime(b),
    ballIn: ball,
    changes,
    points: 0,
    b,
    n,
  }
}

/** Where a rider on a timed piece is at beat `beat`, in world cells. */
export function timedAt(t: Timed, beat: number): UniversePoint {
  const into = Math.max(0, Math.min(t.n, beat - t.b))
  const local: LanePoint = laneAt(t.lane, into)
  return {
    ...local,
    x: t.col + t.mirror * local.x,
    y: t.row + local.y,
    placed: t,
    ball: ballAt(t.ballIn, t.changes, into),
  }
}

/**
 * A route: the pieces one rider goes through, end to end, each on the
 * beat. The cursor is the next entry cell, the heading, and the beat the
 * rider will come in on.
 */
export class Route {
  readonly legs: Timed[] = []

  constructor(
    public col: number,
    public row: number,
    public beat: number,
    public ball: BallState,
    readonly origin: number,
    readonly theme: Theme,
    public dir: 1 | -1 = 1,
  ) {}

  /** The colour the planner would hand a piece: the palette's, never the ball's. */
  paint(i: number): string {
    const colors = this.theme.colors.filter((c) => c !== this.ball.color)
    return colors[((i % colors.length) + colors.length) % colors.length]
  }

  /** A troll piece, in variant `v`, planned at a beat of one and put on the clock. */
  add<S, V>(piece: TimedPiece<any, V>, v: V, color = this.paint(this.legs.length)): Timed {
    const ctx: TempoCtx = { color, theme: this.theme, ball: this.ball }
    return this.put(piece as Piece<S>, piece.tempo.plan(v, 1, ctx) as Placement<S>)
  }

  /** Any placement whose lane is already in beats. */
  put<S>(piece: Piece<S>, placement: Placement<S>): Timed {
    const t = place(piece, placement, this.beat, this.col, this.row, this.dir, this.origin, this.ball)
    this.legs.push(t)
    this.ball = ballAt(t.ballIn, t.changes, Infinity)
    this.col += this.dir * placement.exit.at[0]
    this.row += placement.exit.at[1]
    if (placement.exit.dir === -1) this.dir = this.dir === 1 ? -1 : 1
    this.beat += t.n
    return t
  }

  /** Where the rider is at show time `t`. Before its first piece it waits at the first entry; after the last, at the last exit. */
  at(t: number): UniversePoint {
    const beat = beatAt(t)
    const legs = this.legs
    let lo = 0
    let hi = legs.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (legs[mid].b <= beat) lo = mid
      else hi = mid - 1
    }
    return timedAt(legs[lo], beat)
  }

  get end(): number {
    return this.beat
  }
}

/* ------------------------------------------------------------------ lanes for the show's own moves */

/** A lane in beats from segments, firing at `fire`. */
export const lane = (segs: Seg[], fire = 0): Lane => ({ segs, fire })

/** Straight segments through points, in `n` beats shared by length. */
export function through(pts: Pt[], n: number, ease?: Seg['ease']): Seg[] {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  const total = lens.reduce((a, b) => a + b, 0) || 1
  return lens.map((l, i) => ({ from: pts[i], to: pts[i + 1], dur: (n * l) / total, ease }))
}

/** A piece that draws nothing: the air a rider crosses on a move of the show's own. */
export const air: Piece<null> = { name: 'air', weight: 0, place: () => null, draw: () => {} }

/** A move of the show's own, as a placement: the lane in beats, from its entry (0, 0) to `exit`, on `cells`. */
export function move(segs: Seg[], exit: Pt, cells: Pt[] = [[0, 0]], fire = 0): Placement<null> {
  return { cells, exit: { at: exit, dir: 1 }, lane: lane(segs, fire), state: null }
}

/* ------------------------------------------------------------------ universes */

export function universe(index: number, seed: string, world: World, theme: Theme, backdrop: Backdrop, ballColor: string, pieces: Placed[], journey: number): Universe {
  const box: Box = pieces.reduce<Box>(
    (b, placed) => {
      for (const [c, r] of placed.cells) {
        b.x0 = Math.min(b.x0, c)
        b.x1 = Math.max(b.x1, c)
        b.y0 = Math.min(b.y0, r)
        b.y1 = Math.max(b.y1, r)
      }
      return b
    },
    { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
  )
  return { index, seed, world, theme, taste: 'arranged', ballColor, backdrop, pieces, box, journey, bounds: box }
}

/** Cells along a stretch, every other column, over rows [r0, r1]: what keeps a piece that draws everywhere in view. */
export function everywhere(x0: number, x1: number, r0: number, r1: number): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(x0); x <= Math.ceil(x1); x += 2) for (let r = r0; r <= r1; r += 2) out.push([x, r])
  return out
}

/** A piece the show draws itself, over a whole universe, from universe time. */
export function scenery<S>(name: string, state: S, cells: Pt[], draw: Piece<S>['draw'], over?: Piece<S>['over']): Placed {
  const piece: Piece<S> = { name, weight: 0, place: () => null, draw, over }
  return {
    piece,
    state,
    col: 0,
    row: 0,
    mirror: 1,
    cells,
    lane: lane([{ from: [0, 0], to: [0, 0], dur: 1 }]),
    start: 0,
    span: 1,
    ballIn: { color: '#000000', ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

export { R, isTimed }

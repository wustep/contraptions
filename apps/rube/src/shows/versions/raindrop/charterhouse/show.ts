import type p5 from 'p5'
import { R as BALL_R, type Piece, type PieceCtx, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import { paint, type Brush } from './brush'
import { DUSK, THEME, WORLD } from './look'
import type { BallPath } from './path'

/**
 * Raindrop as a `Show`: one place (the charterhouse, its garden and terraces, the gully and the road below), one
 * ball on one path from the eave to the gate, and every drawing told show time. The camera cuts, but the place
 * never changes under it, so there is no portal and no universe but the one.
 */

/** A drawing that stands for the whole show and is told show time (its `t` is show time, since it starts at 0). */
export function standing(piece: Piece<null>, cells: Pt[], duration: number): Placed {
  return {
    piece,
    state: null,
    col: 0,
    row: 0,
    mirror: 1,
    cells,
    lane: { segs: [{ from: [0, 0], to: [0, 0], dur: duration }], fire: 0 },
    start: 0,
    span: duration,
    ballIn: { color: DUSK.ball, ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

/** A piece that draws in cells with the show's brush: `draw` behind the ball, `over` in front of it. */
export function drawing(name: string, draw: ((b: Brush, t: number, c: PieceCtx) => void) | null, over?: (b: Brush, t: number, c: PieceCtx) => void): Piece<null> {
  return {
    name,
    weight: 0,
    place: () => null,
    draw: (p: p5, _s, c) => {
      if (draw) paint(p, c.k, (b) => draw(b, c.t, c))
    },
    over: over ? (p: p5, _s, c) => paint(p, c.k, (b) => over(b, c.t, c)) : undefined,
  }
}

/** Every cell of a box at `step`, so the stage draws a large drawing whenever any of it is in view. */
export function cover(x0: number, y0: number, x1: number, y1: number, step = 3): Pt[] {
  const out: Pt[] = []
  for (let x = Math.floor(x0); x <= Math.ceil(x1) + step - 1; x += step) for (let y = Math.floor(y0); y <= Math.ceil(y1) + step - 1; y += step) out.push([Math.min(x, Math.ceil(x1)), Math.min(y, Math.ceil(y1))])
  return out
}

/** Where the camera last looked, in cells: what a drawing that fills the whole frame claims, so it is always drawn. */
export const LOOK = { x: 0, y: 0 }

/** A drawing that claims the cell the camera is on: the sky, the rain, anything that fills the frame wherever it is. */
export function everywhere(piece: Piece<null>, duration: number): Placed {
  const placed = standing(piece, [], duration)
  Object.defineProperty(placed, 'cells', { get: () => [[LOOK.x, LOOK.y]] })
  return placed
}

/**
 * What the stage turns the ball by: it spins a ball by how far it is along x from the first piece's column. The
 * first piece is a stand-in whose column is wherever makes that come out to how far the ball has really rolled.
 */
class Spin {
  x = 0
  turned = 0
  get col(): number {
    return this.x - this.turned * BALL_R
  }
}

export class RaindropShow extends Show {
  override readonly trail = 'smear' as const
  private readonly world: Universe
  private readonly spin = new Spin()

  constructor(
    scenery: Placed[],
    readonly path: BallPath,
    readonly duration: number,
    bounds: Box,
    /** How big the ball looks, 1 as it is, 0 not at all (going away into the doorway at the end). */
    private readonly size: (t: number) => number = () => 1,
  ) {
    super('raindrop')
    const anchor = scenery[0]
    const spin = this.spin
    Object.defineProperty(anchor, 'col', { get: () => spin.col })
    this.world = {
      index: 0,
      seed: 'raindrop',
      world: WORLD as World,
      theme: THEME,
      taste: 'arranged',
      ballColor: DUSK.ball,
      backdrop: 'plain',
      pieces: scenery,
      box: bounds,
      bounds,
      journey: duration,
    }
  }

  override indexAt(): number {
    return 0
  }
  override universe(): Universe {
    return this.world
  }
  override begin(): number {
    return 0
  }
  override worldAt(): World {
    return this.world.world
  }

  clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
  }

  /** Where the ball is at `t`, in cells. */
  where(t: number): Pt {
    const b = this.path.at(this.clamp(t))
    return [b.x, b.y]
  }

  override trailOff(t: number): boolean {
    // No streak behind it while it is carried or still: only a fall or a flight leaves one.
    const m = this.path.moves[this.path.index(this.clamp(t))]
    return m.kind !== 'fly'
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const b = this.path.at(time)
    this.spin.x = b.x
    this.spin.turned = this.path.turned(time)
    const placed = this.world.pieces[0]
    const size = this.size(time)
    const hidden = b.hidden || size <= 0
    return {
      x: b.x,
      y: b.y,
      scale: hidden ? 0 : size,
      stretch: 1,
      angle: b.angle,
      hidden,
      seg: 0,
      s: 0,
      raw: 0,
      placed,
      ball: { color: DUSK.ball, ghost: false, id: 0 },
      universe: this.world,
      local: time,
      begin: 0,
    }
  }
}

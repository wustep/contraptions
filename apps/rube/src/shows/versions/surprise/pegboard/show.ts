import type p5 from 'p5'
import type { Piece, Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import { paint, type Brush } from './brush'
import { RED, THEME, WORLD } from './look'

/**
 * Composure as a `Show`: one place, the board and the launcher, drawn by one piece told show time. There is no ball for
 * the stage to draw (`balls` is empty): what flies is the launcher's pellets, which the piece draws itself.
 */

/** A drawing that stands for the whole show and claims the cell the camera is on, so it is always drawn. */
function standing(name: string, draw: (b: Brush, t: number) => void, duration: number, look: () => Pt): Placed {
  const piece: Piece<null> = {
    name,
    weight: 0,
    place: () => null,
    draw: (p: p5, _s, c) => paint(p, c.k, (b) => draw(b, c.t)),
  }
  const placed: Placed = {
    piece,
    state: null,
    col: 0,
    row: 0,
    mirror: 1,
    cells: [],
    lane: { segs: [{ from: [0, 0], to: [0, 0], dur: duration }], fire: 0 },
    start: 0,
    span: duration,
    ballIn: { color: RED, ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
  Object.defineProperty(placed, 'cells', { get: () => [look()] })
  return placed
}

export class ComposureShow extends Show {
  private readonly world: Universe

  constructor(
    draw: (b: Brush, t: number) => void,
    readonly duration: number,
    bounds: Box,
    look: () => Pt,
  ) {
    super('composure')
    this.world = {
      index: 0,
      seed: 'composure',
      world: WORLD as World,
      theme: THEME,
      taste: 'arranged',
      ballColor: RED,
      backdrop: 'plain',
      pieces: [standing('board', draw, duration, look)],
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

  override at(t: number): ShowPoint {
    const local = Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
    return {
      x: 0,
      y: 0,
      scale: 0,
      stretch: 1,
      angle: 0,
      hidden: true,
      seg: 0,
      s: 0,
      raw: 0,
      placed: this.world.pieces[0],
      ball: { color: RED, ghost: false, id: 0 },
      universe: this.world,
      local,
      begin: 0,
      balls: [],
    }
  }
}

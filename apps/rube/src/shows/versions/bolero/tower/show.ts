import { R as BALL_R, type Piece, type PieceCtx, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import { where } from './ball'
import { BALL, THEME, WORLD, honest } from './look'
import { FALL_FROM } from './finale'
import { place, sway } from './pose'
import { TOWER } from './plan'

/**
 * Ostinato as a `Show`: one universe (the tower, on the ground, under the sky), one ball on one continuous path,
 * no portal and no cut: the camera is one take. The universe runs on show time, so every drawing is told `t`.
 */

/** A drawing that stands for the whole show and is told show time. */
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
    ballIn: { color: BALL, ghost: false, id: 0 },
    changes: [],
    points: 0,
  }
}

/** A piece that draws with `fn(p, ctx, t)`, in the show's honest renderer. */
export function drawing(name: string, draw: (p: import('p5'), c: PieceCtx) => void, over?: (p: import('p5'), c: PieceCtx) => void): Piece<null> {
  return {
    name,
    weight: 0,
    place: () => null,
    draw: (p, _s, c) => {
      honest(p)
      p.push()
      draw(p, c)
      p.pop()
    },
    over: over
      ? (p, _s, c) => {
          honest(p)
          p.push()
          over(p, c)
          p.pop()
        }
      : undefined,
  }
}

/**
 * What the stage turns the ball by: it spins a ball by how far it is along x from the first piece's column, which
 * suits a machine laid left to right. Here the ball goes round and round, so the first piece is a stand-in whose
 * column is wherever makes that come out to how far the ball has really rolled (`Where.turned`).
 */
class Spin {
  x = 0
  turned = 0
  get col(): number {
    return this.x - this.turned * BALL_R
  }
}

export class OstinatoShow extends Show {
  override readonly trail = 'smear' as const
  private readonly world: Universe
  private readonly spin = new Spin()

  constructor(scenery: Placed[], readonly duration: number) {
    super('ostinato')
    const anchor = scenery[0]
    const spin = this.spin
    Object.defineProperty(anchor, 'col', { get: () => spin.col })
    const top = TOWER[TOWER.length - 1]
    const bounds: Box = { x0: -top.w / 2 - 1, y0: top.top - 4, x1: top.w / 2 + 1, y1: 0 }
    this.world = {
      index: 0,
      seed: 'ostinato',
      world: WORLD as World,
      theme: THEME,
      taste: 'arranged',
      ballColor: BALL,
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

  private clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
  }

  /** Where the ball is at `t` in the world: on the tower (which sways), or falling free at the end. */
  where(t: number): Pt {
    const time = this.clamp(t)
    const w = where(time)
    if (time >= FALL_FROM) return w.p
    return place(w.p, 0, -1, time)
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const w = where(time)
    const [x, y] = time >= FALL_FROM ? w.p : place(w.p, 0, -1, time)
    this.spin.x = x
    this.spin.turned = w.turned
    const placed = this.world.pieces[0]
    return {
      x,
      y,
      scale: w.scale ?? 1,
      stretch: 1,
      angle: w.angle + (time >= FALL_FROM ? 0 : sway(time)),
      hidden: false,
      seg: 0,
      s: 0,
      raw: 0,
      placed,
      ball: { color: BALL, ghost: false, id: 0 },
      universe: this.world,
      local: time,
      begin: 0,
    }
  }
}

import type p5 from 'p5'
import type { Piece, Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import { MIDDLE } from './geo'
import { PAINT, THEME, WORLD } from './look'
import type { Machine } from './machine'
import { paintToy } from './paint'

/**
 * Quarter Turn as a `Show`: one place (the toy on its table), no ball (the stage is handed an empty list of riders),
 * and one drawing that paints the whole toy at show time. The camera holds the toy whole.
 */

/** The cells round the toy's picture, so the stage draws it whenever any of it is in view. */
function around(): Pt[] {
  const out: Pt[] = []
  const x0 = Math.floor(MIDDLE.x - MIDDLE.w / 2) - 1
  const x1 = Math.ceil(MIDDLE.x + MIDDLE.w / 2) + 1
  const y0 = Math.floor(MIDDLE.y - MIDDLE.h / 2) - 1
  const y1 = Math.ceil(MIDDLE.y + MIDDLE.h / 2) + 1
  for (let x = x0; x <= x1; x += 2) for (let y = y0; y <= y1; y += 2) out.push([x, y])
  return out
}

export class QuarterTurnShow extends Show {
  private readonly world: Universe
  private readonly toy: Placed

  constructor(
    readonly machine: Machine,
    readonly duration: number,
  ) {
    super('quarter-turn')
    const piece: Piece<null> = {
      name: 'toy',
      weight: 0,
      place: () => null,
      draw: (p: p5, _s, c) => {
        const g = p.drawingContext as CanvasRenderingContext2D
        g.save()
        g.scale(c.k, c.k)
        // A line a little over a pixel at 1080p, and never exactly one: at one device pixel the canvas switches between
        // two ways of drawing a hairline as the scale wavers in its last digits, and every outline shimmers.
        paintToy(g, machine, this.clamp(c.t), Math.max(1.25 / c.k, 0.011))
        g.restore()
      },
    }
    this.toy = {
      piece,
      state: null,
      col: 0,
      row: 0,
      mirror: 1,
      cells: around(),
      lane: { segs: [{ from: [0, 0], to: [0, 0], dur: duration }], fire: 0 },
      start: 0,
      span: duration,
      ballIn: { color: PAINT.black, ghost: false, id: 0 },
      changes: [],
      points: 0,
    }
    const bounds: Box = { x0: MIDDLE.x - MIDDLE.w / 2, y0: MIDDLE.y - MIDDLE.h / 2, x1: MIDDLE.x + MIDDLE.w / 2, y1: MIDDLE.y + MIDDLE.h / 2 }
    this.world = {
      index: 0,
      seed: 'quarter-turn',
      world: WORLD as World,
      theme: THEME,
      taste: 'arranged',
      ballColor: PAINT.black,
      backdrop: 'plain',
      pieces: [this.toy],
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

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    return {
      x: MIDDLE.x,
      y: MIDDLE.y,
      scale: 0,
      stretch: 1,
      angle: 0,
      hidden: true,
      seg: 0,
      s: 0,
      raw: 0,
      placed: this.toy,
      ball: { color: PAINT.black, ghost: false, id: 0 },
      universe: this.world,
      local: time,
      begin: 0,
      balls: [],
    }
  }
}

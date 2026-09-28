import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import { PERIOD, wrap } from './music'
import { ridersAt } from './path'
import { BALL_COLOR, THEME, WORLD } from './world'

/**
 * The Goldberg Variations as a `Show`: one universe, the colonnade, and the ball going round it once to a variation.
 * Every time it is asked about is taken round the circle first, so a moment a period on is the same moment.
 */

export class GoldbergShow extends Show {
  private readonly world: Universe

  constructor(scenery: Placed[]) {
    super('goldberg-variations')
    const bounds: Box = { x0: -16, y0: -12, x1: 16, y1: 8 }
    this.world = {
      index: 0,
      seed: 'goldberg-variations',
      world: WORLD as World,
      theme: THEME,
      taste: 'arranged',
      ballColor: BALL_COLOR,
      backdrop: 'plain',
      pieces: scenery,
      box: bounds,
      bounds,
      journey: PERIOD,
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
    const time = wrap(t)
    const riders = ridersAt(time)
    const lead = riders.find((r) => r.id === 0)!
    return {
      x: lead.x,
      y: lead.y,
      scale: lead.scale ?? 1,
      stretch: 1,
      angle: 0,
      hidden: false,
      seg: 0,
      s: 0,
      raw: 0,
      placed: this.world.pieces[0],
      ball: { color: lead.color, ghost: false, id: 0 },
      universe: this.world,
      local: time,
      begin: 0,
      balls: riders.map(({ z: _z, ...ball }) => ball),
    }
  }
}

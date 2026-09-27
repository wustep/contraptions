import { R as BALL_R, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import { GLASS } from './layout'
import { PERIOD, wrap } from './music'
import { spin, squash, where } from './route'
import { BALL, THEME, WORLD } from './world'

/**
 * Windowlight as a `Show`: one universe, the window and the machine on its sill, and one ball going round the machine
 * once a period. Every time it is asked about is taken round the circle first, so a moment a period on is the same
 * moment, and a trail that looks a little back from the top of the period looks at its end.
 */

/**
 * What the stage turns the ball by. It spins the ball by how far it is along x from the first piece's column
 * (`engine.ts`), which suits a machine laid out left to right. Here the ball rolls where it rolls and rides where it
 * rides (`route.ts` keeps the count), so the first piece is a stand-in whose column is wherever makes the stage's
 * arithmetic come out to that, for the moment last asked about.
 */
class Spin {
  x = 0
  turned = 0
  get col(): number {
    return this.x - this.turned * BALL_R
  }
}

export class WindowlightShow extends Show {
  private readonly world: Universe
  private readonly spin = new Spin()

  constructor(scenery: Placed[], readonly duration: number) {
    super('windowlight')
    const anchor = scenery[0]
    const turning = this.spin
    // The stand-in has no cells, so it is never drawn; the stage only reads its column.
    Object.defineProperty(anchor, 'col', { get: () => turning.col })
    const bounds: Box = { x0: GLASS.x0 - 2, y0: GLASS.y0 - 2, x1: GLASS.x1 + 2, y1: 2 }
    this.world = {
      index: 0,
      seed: 'windowlight',
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

  /** Where the ball is at `t`, in world cells. */
  where(t: number): Pt {
    return where(t).p
  }

  override at(t: number): ShowPoint {
    const time = wrap(t)
    const here = where(time)
    // Caught, it gives a little of its height and gets it back: its foot stays in the cup, so its middle goes down.
    const q = squash(time)
    const [x, y] = [here.p[0], here.p[1] + BALL_R * q]
    this.spin.x = x
    this.spin.turned = spin(time)
    const placed = this.world.pieces[0]
    return {
      x,
      y,
      // Squashed flat: as wide again as it is shorter.
      scale: 1 - q,
      stretch: (1 + q) / (1 - q),
      angle: 0,
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

/** One period, as the player is told it. */
export const DURATION = PERIOD

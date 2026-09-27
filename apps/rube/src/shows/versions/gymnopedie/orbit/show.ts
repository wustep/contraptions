import { R as BALL_R, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import { PERIOD, wrap } from './music'
import { LENGTH, RADIUS, along, ballLocal, squash } from './path'
import { BALL, THEME, WORLD, polar } from './world'

/**
 * Gymnopédie as a `Show`: one universe, the planet, and one ball going round
 * it once a period. Every time it is asked about is taken round the circle
 * first, so a moment a period on is the same moment, and a camera or a trail
 * that looks a little back from the top of the period looks at its end.
 */

/**
 * What the stage turns the ball by. It spins the ball by how far it is along x from the first piece's column
 * (`engine.ts`), which suits a machine laid out left to right. Here the ball goes round a planet under a camera
 * that turns with it, and a ball rolling round a circle turns by its distance over its own radius plus the angle it
 * has gone round. So the first piece is a stand-in whose column is wherever makes the stage's arithmetic come out
 * to that, for the moment last asked about.
 */
class Spin {
  x = 0
  turned = 0
  get col(): number {
    return this.x - this.turned * BALL_R
  }
}

const TURN = (2 * Math.PI * Math.round((LENGTH / BALL_R + 2 * Math.PI) / (2 * Math.PI))) / LENGTH

export class GymnopedieShow extends Show {
  private readonly world: Universe
  private readonly spin = new Spin()

  constructor(scenery: Placed[], readonly duration: number) {
    super('gymnopedie')
    const anchor = scenery[0]
    const spin = this.spin
    // The stand-in has no cells, so it is never drawn; the stage only reads its column.
    Object.defineProperty(anchor, 'col', { get: () => spin.col })
    const r = RADIUS + 6
    const bounds: Box = { x0: -r, y0: -r, x1: r, y1: r }
    this.world = {
      index: 0,
      seed: 'gymnopedie',
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
    const b = ballLocal(t)
    return polar(b.u, b.h)
  }

  override at(t: number): ShowPoint {
    const time = wrap(t)
    const b = ballLocal(time)
    // Coming down on a note it gives a little of its height, as far as the note was played, and gets it back: its
    // foot stays on the stone, so its middle goes down with it.
    const q = squash(time)
    const [x, y] = polar(b.u, b.h - BALL_R * q)
    const u = along(time)
    this.spin.x = x
    // Rolling: its distance along the sea over its radius, and the angle it has gone round; rounded to whole turns a
    // period, so the dot on it is where it was when the period comes round.
    this.spin.turned = u * TURN
    const placed = this.world.pieces[0]
    return {
      x,
      y,
      // Squashed along the sea: as wide again as it is shorter.
      scale: 1 - q,
      stretch: (1 + q) / (1 - q),
      angle: b.u / RADIUS,
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

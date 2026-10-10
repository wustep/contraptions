import { R as BALL_R, mixHex } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import { ballAt, squashAt } from './route'
import { BALL, THEME, WORLD, lampAt, lightAt } from './world'

/**
 * Soft Lamp as a `Show`: one universe, the desk, and one ball going round it once a track. The stage draws the ball
 * where `at` puts it, squashed as it lands, and coloured by the lamp: cream in its light, greyer out along the sill.
 * It is a plain ping-pong ball, with no mark on it; the scene shades it from the light.
 */
export class SoftLampShow extends Show {
  private readonly world: Universe
  /** A lobbed ball's trail is one faint streak, not a string of balls. */
  override readonly trail = 'smear' as const

  constructor(scenery: Placed[], readonly duration: number) {
    super('soft-lamp')
    const bounds: Box = { x0: -6, y0: -7, x1: 7, y1: 1 }
    this.world = {
      index: 0,
      seed: 'soft-lamp',
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

  override at(t: number): ShowPoint {
    const time = Math.max(0, Math.min(this.duration, t))
    const b = ballAt(time)
    const q = squashAt(time)
    // Squashed along what it lands on: as wide again as it is shorter, its foot where it was.
    const y = b.y + BALL_R * q
    const l = lightAt(b.x, b.y) * lampAt(time)
    const color = mixHex('#B9B6AE', BALL, Math.min(1, 0.25 + l))
    const placed = this.world.pieces[0]
    return {
      x: b.x,
      y,
      scale: 1 - q,
      stretch: (1 + q) / (1 - q),
      angle: 0,
      hidden: false,
      seg: 0,
      s: 0,
      raw: 0,
      placed,
      ball: { color, ghost: false, id: 0 },
      // The one ball, drawn as a rider without the stage's ink mark: a dot on a ball sitting still in the cup read as
      // an eye looking out of it. Its shading is the scene's (\`ballShine\`), from the lamp's side.
      balls: [{ id: 0, x: b.x, y, color, scale: 1 - q, stretch: (1 + q) / (1 - q), angle: 0, spin: null }],
      universe: this.world,
      local: time,
      begin: 0,
    }
  }
}

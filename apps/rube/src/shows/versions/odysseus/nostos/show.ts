import type { Theme } from '../../../../../../../src/core/themes'
import type { Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Path } from './path'

/**
 * Nostos as a `Show`: one world, the whole sea between Troy and home, and the balls in it.
 *
 * Everything is in one universe on one clock, laid out along the sea: Troy at its east end, the islands of the voyage
 * along it, Ithaca at its west, the dead under it. Nothing is placed by the planner; the scenery is standing drawings
 * told show time, and the balls are the cast (`cast.ts`), each on a path of its own (`path.ts`). The stage draws the
 * balls the show lists (`ShowPoint.balls`), so the hero is never drawn by the thread's default and his mark turns only
 * as he rolls.
 */

/** A ball of the cast while it is on the stage: its path, how it is drawn, and when it is there at all. */
export interface Actor {
  id: number
  color: string
  /** Its outline: a darker shade of its own colour reads as a person, the ink as a thing. */
  rim?: string
  /** Its size against the hero's. */
  size: number
  path: Path
  /** Whether it is on the stage at `t` (default: within its path's span). */
  on?(t: number): boolean
  /** Its colour at `t`, where it changes (the shades in the dark). */
  colorAt?(t: number): string
  /** How much of it is seen at `t`, 0 to 1 (a shade fading). Scales the ball. */
  fade?(t: number): number
  /** A mark that does not roll (a head, not a wheel): its fixed angle, or null for none. */
  mark?: number | null
  /** Where its mark starts, radians: which way it is facing before it has rolled at all (a crowd does not all look one way). */
  turn?: number
  /** Whether it lies under the rest at `t` (the dead, drawn first so the living pass over them). */
  under?(t: number): boolean
}

export class NostosShow extends Show {
  private readonly u: Universe
  private readonly anchor: Placed
  /** A slow fall is no streak; a fast one is one tapered streak, not a string of discs. */
  override readonly trail = 'smear' as const
  /** The camera's cuts (keys marked `cut`), show seconds: the score fills it; the checks hold each to the music. */
  cameraCuts: number[] = []

  constructor(
    world: World,
    theme: Theme,
    pieces: Placed[],
    readonly duration: number,
    readonly hero: Actor,
    readonly cast: Actor[],
  ) {
    super('odysseus')
    this.anchor = pieces[0]
    this.u = {
      index: 0,
      seed: 'odysseus',
      world,
      theme,
      taste: 'arranged',
      ballColor: hero.color,
      backdrop: 'plain',
      pieces,
      box: { x0: -1, y0: -1, x1: 1, y1: 1 },
      bounds: { x0: -1, y0: -1, x1: 1, y1: 1 },
      journey: duration,
    }
  }

  clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
  }

  override indexAt(): number {
    return 0
  }

  override universe(): Universe {
    return this.u
  }

  override begin(): number {
    return 0
  }

  override worldAt() {
    return this.u.world
  }

  /** Where the hero is at `t`. */
  where(t: number): [number, number] {
    return this.hero.path.where(this.clamp(t))
  }

  /** One of the cast at `t`, as the stage is to draw it, or null while it is not on the stage. */
  ball(a: Actor, t: number): ShowBall | null {
    const time = this.clamp(t)
    const on = a.on ? a.on(time) : time >= a.path.t0 && time <= a.path.t1
    if (!on) return null
    const p = a.path.at(time)
    const fade = a.fade ? a.fade(time) : 1
    const scale = p.hidden ? 0 : a.size * p.scale * fade
    return {
      id: a.id,
      x: p.x,
      y: p.y,
      color: a.colorAt ? a.colorAt(time) : a.color,
      rim: a.rim,
      scale,
      stretch: 1,
      angle: 0,
      spin: a.mark === undefined ? a.path.spin(time, 0.13 * a.size) + (a.turn ?? 0) : a.mark,
    }
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const h = this.hero.path.at(time)
    const balls: ShowBall[] = []
    const under: ShowBall[] = []
    for (const a of this.cast) {
      const b = this.ball(a, time)
      if (b && (b.scale ?? 1) > 0.001) (a.under?.(time) ? under : balls).push(b)
    }
    balls.unshift(...under)
    const hero = this.ball(this.hero, time)
    if (hero && (hero.scale ?? 1) > 0.001) balls.push(hero)
    return {
      x: h.x,
      y: h.y,
      scale: h.hidden ? 0 : h.scale,
      stretch: 1,
      angle: 0,
      hidden: h.hidden,
      seg: 0,
      s: 0,
      raw: 0,
      placed: this.anchor,
      ball: { color: this.hero.color, ghost: false, id: this.hero.id },
      universe: this.u,
      local: time,
      begin: 0,
      balls,
    }
  }
}

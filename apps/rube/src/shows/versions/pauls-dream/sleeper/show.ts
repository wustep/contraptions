import type { Theme } from '../../../../../../../src/core/themes'
import type { Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Pt } from './paint'
import type { Run } from './path'

/**
 * Sleeper as a `Show`: one world on one clock, Caladan and Arrakis laid out side by side in it, and the balls in it.
 *
 * Nothing is placed by the planner. The scenery is standing drawings told show time (`paint.ts`), and the balls are the
 * cast (`cast.ts`), each on a run of its own (`path.ts`). The stage draws the balls the show lists (`ShowPoint.balls`),
 * so the hero's mark turns only as he rolls.
 */

/** A ball while it is on the stage: its run, how it is drawn, and anything that changes it. */
export interface Actor {
  id: number
  color: string
  rim: string
  size: number
  run: Run
  /** On the stage at `t` (default: while its run has a segment there). */
  on?(t: number): boolean
  /** Its colour at `t`, where it changes (the colour going out of the dead). */
  colorAt?(t: number): string
  /** How much of it is seen, 0 to 1 (it scales the ball). */
  fade?(t: number): number
  /** A mark that does not roll (a head that looks, not a wheel): its fixed angle, or null for none. */
  mark?: number | null
  /** Where its mark starts (radians): which way it faces before it has rolled. */
  turn?: number
}

export class SleeperShow extends Show {
  private readonly u: Universe
  private readonly anchor: Placed
  /** A fast fall is one tapered streak, not a string of discs. */
  override readonly trail = 'smear' as const
  /** The camera's cuts, show seconds (the score fills it; the checks hold each to the music). */
  cuts: number[] = []

  constructor(
    world: World,
    theme: Theme,
    pieces: Placed[],
    readonly duration: number,
    readonly hero: Actor,
    readonly cast: Actor[],
  ) {
    super('sleeper')
    this.anchor = pieces[0]
    this.u = {
      index: 0,
      seed: 'sleeper',
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

  override worldAt(): World {
    return this.u.world
  }

  /** Where the hero is at `t`. */
  where(t: number): Pt {
    return this.hero.run.where(this.clamp(t))
  }

  /** One of the cast at `t` as the stage draws it, or null while it is off the stage. */
  ball(a: Actor, t: number): ShowBall | null {
    const time = this.clamp(t)
    const on = a.on ? a.on(time) : a.run.covers(time)
    if (!on) return null
    const p = a.run.at(time)
    if (p.hidden) return null
    const scale = a.size * p.size * (a.fade ? a.fade(time) : 1)
    if (scale <= 0.001) return null
    return {
      id: a.id,
      x: p.x,
      y: p.y,
      color: a.colorAt ? a.colorAt(time) : a.color,
      rim: a.rim,
      scale,
      stretch: 1,
      angle: 0,
      spin: a.mark === undefined ? a.run.spin(time, 0.13 * a.size) + (a.turn ?? 0) : a.mark,
    }
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const h = this.hero.run.at(time)
    const balls: ShowBall[] = []
    for (const a of this.cast) {
      const b = this.ball(a, time)
      if (b) balls.push(b)
    }
    const hero = this.ball(this.hero, time)
    if (hero) balls.push(hero)
    return {
      x: h.x,
      y: h.y,
      scale: h.hidden ? 0 : h.size,
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

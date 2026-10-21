import type { Theme } from '../../../../../../../src/core/themes'
import type { Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Path } from './path'

/**
 * Kohaku as a `Show`: one world, the spirit town and its sea, and the balls in it.
 *
 * Everything is in one universe on one clock. Nothing is placed by the planner: the scenery is standing drawings told
 * show time (`paint.ts`), and the balls are the cast (`cast.ts`), each on a path of its own (`path.ts`). The stage
 * draws the balls the show lists (`ShowPoint.balls`), so Chihiro is never drawn by the thread's default, and her mark
 * turns only as she rolls.
 */

export interface Actor {
  id: number
  color: string
  /** Its outline: a darker shade of its own colour, for a person. */
  rim?: string
  /** Its size against hers. */
  size: number
  path: Path
  /** Whether it is on the stage at `t` (default: within its path's span). */
  on?(t: number): boolean
  /** How much of it is seen at `t`, 0 to 1. Scales the ball. */
  fade?(t: number): number
  /** A mark that does not roll (a face, not a wheel): its fixed angle, or null for none. */
  mark?: number | null
  /** Where its mark starts, radians. */
  turn?: number
}

/**
 * A look: from `from` to `to`, the ball `id`'s mark turns to face `at` (a point, or another of the cast by id), easing
 * round over a little under half a second at each end and back to wherever its rolling has it. The mark is where a
 * ball faces; a look is how the cast see one another without a face. Only ever on a ball that is still or carried.
 */
export interface Look {
  id: number
  from: number
  to: number
  at: ((t: number) => [number, number]) | number
}

const EASE = 0.45
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export class KohakuShow extends Show {
  private readonly u: Universe
  private readonly anchor: Placed
  override readonly trail = 'smear' as const
  /** The camera's cuts, show seconds (`score.ts` fills it; the checks hold each to the music). */
  cameraCuts: number[] = []
  /** Spans where nobody should leave a streak: across a dissolve or a cut, where a ball changes place in one frame. */
  quiet: [number, number][] = []
  /** Who looks at what, and when. */
  looks: Look[] = []

  constructor(
    world: World,
    theme: Theme,
    pieces: Placed[],
    readonly duration: number,
    readonly hero: Actor,
    readonly cast: Actor[],
  ) {
    super('kohaku')
    this.anchor = pieces[0]
    this.u = {
      index: 0,
      seed: 'kohaku',
      world,
      theme,
      taste: 'arranged',
      ballColor: hero.color,
      backdrop: 'plain',
      pieces,
      box: { x0: -40, y0: -40, x1: 300, y1: 20 },
      bounds: { x0: -40, y0: -40, x1: 300, y1: 20 },
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

  override trailOff(t: number): boolean {
    return this.quiet.some(([a, b]) => t >= a - 0.1 && t <= b + 0.1)
  }

  /** Where Chihiro is at `t`. */
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
    let spin: number | null = a.mark === undefined ? a.path.spin(time, 0.13 * a.size) + (a.turn ?? 0) : a.mark
    if (spin !== null) spin = this.look(a.id, time, p.x, p.y, spin)
    return {
      id: a.id,
      x: p.x,
      y: p.y,
      color: a.color,
      rim: a.rim,
      scale: a.size * p.scale * fade,
      stretch: 1,
      angle: 0,
      spin,
    }
  }

  /**
   * The mark's angle for ball `id` at `t`, turned toward whatever it is looking at, eased in and out. Looks that
   * overlap are laid on in the order they begin, so a look that starts while another holds takes the mark over from
   * it smoothly, without letting it fall back between.
   */
  private look(id: number, t: number, x: number, y: number, spin: number): number {
    let a = spin
    const on = this.looks.filter((l) => l.id === id && t >= l.from && t <= l.to).sort((p, q) => p.from - q.from)
    for (const l of on) {
      const u = Math.min(1, (t - l.from) / EASE, (l.to - t) / EASE)
      const w = u * u * (3 - 2 * u)
      const [tx, ty] = typeof l.at === 'number' ? this.whereIs(l.at, t) : l.at(t)
      a += wrap(Math.atan2(ty - y, tx - x) - a) * w
    }
    return a
  }

  /** Where one of the cast is at `t`, by id. */
  whereIs(id: number, t: number): [number, number] {
    const a = id === this.hero.id ? this.hero : this.cast.find((c) => c.id === id)
    return a ? a.path.where(this.clamp(t)) : [0, 0]
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const h = this.hero.path.at(time)
    const balls: ShowBall[] = []
    for (const a of this.cast) {
      const b = this.ball(a, time)
      if (b && (b.scale ?? 1) > 0.001) balls.push(b)
    }
    const hero = this.ball(this.hero, time)
    if (hero && (hero.scale ?? 1) > 0.001) balls.push(hero)
    return {
      x: h.x,
      y: h.y,
      scale: h.scale,
      stretch: 1,
      angle: 0,
      hidden: false,
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

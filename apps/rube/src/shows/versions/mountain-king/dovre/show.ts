import { ballAt, laneAt, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Theme } from '../../../../../../../src/core/themes'
import type { Company, Who } from './kit'
import { PEER, WOMAN, WOMAN_ID } from './worlds'

/**
 * Mountain King as a `Show` (after Liftoff's, Epilogue's and Caravan's `show.ts`): one universe, the Dovre
 * mountain in cross-section, and one chain of parts laid through it on one continuous path, from the flank outside
 * the troll gate down through the tunnels, the hall, the mines, the drum and the heart, and up and out at dawn.
 * No portal and no cut: the camera is one take.
 *
 * The universe runs on show time (`local` is `t`, `begin` is 0), so a part's `t` is always seconds since the ball
 * reached it, and a piece of scenery's `t` is the show's own. The stage list is kept (as in the earlier shows) in
 * case a later pass wants a second place; today there is one.
 */

export interface Stage {
  world: World
  theme: Theme
  /** What stands behind and around the chain, drawn first, in order: the sky, the far valley, the mountain. */
  scenery: Placed[]
  /** The ball's parts, in order of time. */
  chain: Placed[]
  /** What is laid over everything, the ball included: dust, the collapse, the dawn's light, drawn in their `over`. */
  after?: Placed[]
  /** Show time from which this universe is on the stage. */
  from: number
}

/** Riders besides the thread, for the stretches of the show that have them (`kit.ts`). */
export type Riders = { from: number; to: number; fn: (t: number, hero: ShowBall) => ShowBall[] | null }[]

function boundsOf(pieces: Placed[]): Box {
  const b: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
  for (const p of pieces) {
    for (const [c, r] of p.cells) {
      b.x0 = Math.min(b.x0, c)
      b.x1 = Math.max(b.x1, c)
      b.y0 = Math.min(b.y0, r)
      b.y1 = Math.max(b.y1, r)
    }
  }
  return b
}

const PEOPLE: Record<Who, { id: number; color: string }> = {
  woman: { id: WOMAN_ID, color: WOMAN },
}

export class MountainShow extends Show {
  /** Peer's trail is one streak, not four discs: at the fast drops and the geyser's surges the discs read as more balls. */
  override readonly trail = 'smear' as const
  private readonly stages: Stage[]
  private readonly worlds: Universe[]

  constructor(stages: Stage[], readonly duration: number, private readonly riders: Riders = [], private readonly company: Company[] = []) {
    super('mountain-king')
    this.stages = stages
    this.worlds = stages.map((s, index) => {
      const bounds = boundsOf(s.chain)
      return {
        index,
        seed: 'mountain-king',
        world: s.world,
        theme: s.theme,
        taste: 'arranged',
        ballColor: PEER,
        backdrop: 'plain',
        pieces: [...s.scenery, ...s.chain, ...(s.after ?? [])],
        box: bounds,
        bounds,
        journey: duration,
      }
    })
  }

  clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
  }

  override indexAt(t: number): number {
    const time = this.clamp(t)
    let i = 0
    while (i + 1 < this.stages.length && time >= this.stages[i + 1].from) i++
    return i
  }

  override universe(i: number): Universe {
    return this.worlds[Math.max(0, Math.min(this.worlds.length - 1, i))]
  }

  override begin(): number {
    return 0
  }

  override worldAt(i: number): World {
    return this.universe(i).world
  }

  /** The part that has the ball at `t`. */
  holder(t: number): Placed {
    const chain = this.stages[this.indexAt(t)].chain
    const time = this.clamp(t)
    let lo = 0
    let hi = chain.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (chain[mid].start <= time) lo = mid
      else hi = mid - 1
    }
    return chain[lo]
  }

  /** Where the ball is at `t`, in cells. Cheap: what the camera samples. */
  where(t: number): Pt {
    const placed = this.holder(t)
    const at = laneAt(placed.lane, this.clamp(t) - placed.start)
    return [placed.col + placed.mirror * at.x, placed.row + at.y]
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const index = this.indexAt(time)
    const universe = this.worlds[index]
    const placed = this.holder(time)
    const into = time - placed.start
    const point = laneAt(placed.lane, into)
    const ball = ballAt(placed.ballIn, placed.changes, into)
    const here: ShowPoint = {
      ...point,
      x: placed.col + placed.mirror * point.x,
      y: placed.row + point.y,
      placed,
      ball,
      universe,
      local: time,
      begin: 0,
    }
    const ride = this.riders.find((r) => time >= r.from && time < r.to)
    const company = (['woman'] as const).map((w) => this.person(w, time)).filter((b): b is ShowBall => !!b)
    if (ride || company.length) {
      const hero: ShowBall = {
        id: ball.id,
        x: here.x,
        y: here.y,
        color: ball.color,
        ghost: ball.ghost,
        scale: point.hidden ? 0 : point.scale,
        stretch: point.stretch,
        angle: point.angle,
      }
      const balls = ride ? ride.fn(time, hero) : null
      here.balls = company.length ? [...(balls ?? [hero]), ...company] : balls ?? undefined
    }
    return here
  }

  /** The Woman in Green at `t`, in world cells, or null while no part has her in sight. */
  woman(t: number): ShowBall | null {
    return this.person('woman', t)
  }

  person(who: Who, t: number): ShowBall | null {
    const time = this.clamp(t)
    const span = this.company.find((s) => s.who === who && time >= s.from && time < s.to)
    const b = span?.at(time)
    const { id, color } = PEOPLE[who]
    return b ? { ...b, id, color: b.color ?? color } : null
  }
}

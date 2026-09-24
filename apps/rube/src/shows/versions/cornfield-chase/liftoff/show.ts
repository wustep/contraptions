import { ballAt, laneAt, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Theme } from '../../../../../../../src/core/themes'
import { BALL, GOLD, GOLD_ID } from './worlds'

/**
 * Liftoff as a `Show`: two universes on one clock, and no portal between
 * them. The farm and the dark share one set of cells — the dark is simply
 * above the farm — and the rocket that carries the ball from one to the
 * other is placed in both. The show hands the stage the farm until the
 * rocket is inside the cloud deck, and the dark from then on; the cloud
 * fills the frame at that moment in both, so the change of ink is never
 * seen.
 *
 * Every universe runs on show time (`local` is `t`, `begin` is 0), so a
 * part's `t` is always seconds since the ball reached it, and a piece of
 * scenery's `t` is the show's own.
 */

export interface Stage {
  world: World
  theme: Theme
  /** What stands behind and around the chain, drawn first, in order. */
  scenery: Placed[]
  /** The ball's parts, in order of time. */
  chain: Placed[]
  /** What is laid over everything, the ball included: light and weather, drawn in their `over`. */
  after?: Placed[]
  /** Show time from which this universe is on the stage. */
  from: number
}

/** Riders besides the thread, for the stretches of the show that have them (`kit.ts`). */
export type Riders = { from: number; to: number; fn: (t: number, hero: ShowBall) => ShowBall[] | null }[]

/** The gold ball's spans, in world cells (`kit.ts`, `Company`). */
export type Spans = { from: number; to: number; at: (t: number) => (Omit<ShowBall, 'id' | 'color'> & { color?: string }) | null }[]

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

export class LiftoffShow extends Show {
  private readonly stages: Stage[]
  private readonly worlds: Universe[]

  constructor(stages: Stage[], readonly duration: number, private readonly riders: Riders = [], private readonly company: Spans = []) {
    super('liftoff')
    this.stages = stages
    this.worlds = stages.map((s, index) => {
      const bounds = boundsOf(s.chain)
      return {
        index,
        seed: 'liftoff',
        world: s.world,
        theme: s.theme,
        taste: 'arranged',
        ballColor: BALL,
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

  /** The part that has the ball at `t`, in the universe on the stage. */
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
    const gold = this.gold(time)
    if (ride || gold) {
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
      here.balls = gold ? [...(balls ?? [hero]), gold] : balls ?? undefined
    }
    return here
  }

  /** The gold ball at `t`, in world cells, or null while no part has her in sight. */
  gold(t: number): ShowBall | null {
    const time = this.clamp(t)
    const span = this.company.find((s) => time >= s.from && time < s.to)
    const b = span?.at(time)
    return b ? { ...b, id: GOLD_ID, color: b.color ?? GOLD } : null
  }
}

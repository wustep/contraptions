import { ballAt, laneAt, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { Riders as PartRiders } from './kit'
import { SPARK, WORLDS, type WorldKey } from './worlds'

/**
 * Spark as a `Show`: one ball on one path through four worlds, joined by fire-doors (after All at Once's
 * multiverse).
 *
 * The path is cut into legs. A leg is a stretch of show time spent in one world, its parts laid end to end from an
 * entry cell the score chooses. Between two legs is a fire-door: the world changes at once, and so does the ball's
 * place in cells, since each world has its own ground. But the camera moves by exactly the same amount at the same
 * instant (`score.ts`), so on the screen the spark holds still while the fire round it becomes another fire,
 * somewhere else. A door is a match cut on the spark, inside a veil of flame (`fx.ts`).
 *
 * Legs in the same world share its cells: the loft is one room, and the spark comes home to it at the end.
 */

export interface Leg {
  /** A name for the leg: what the check and the camera call it. */
  key: string
  world: WorldKey
  /** Show time the spark comes in, and when it goes out. */
  from: number
  to: number
  /** Its parts, in order. */
  placed: Placed[]
  /** Where the spark is (world cells) as it comes in and as it goes out. */
  entry: Pt
  exit: Pt
}

/** What stands in a world besides the legs' parts: its sky and walls, drawn first; its light and weather, drawn over. */
export interface WorldSet {
  scenery: Placed[]
  after: Placed[]
}

/** Extra balls from a part, over its slot, in world cells. None in this show so far. */
export type Riders = { from: number; to: number; leg: number; fn: PartRiders }[]

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
  if (!Number.isFinite(b.x0)) return { x0: 0, y0: 0, x1: 1, y1: 1 }
  return b
}

export class SparkShow extends Show {
  private readonly keys: WorldKey[]
  private readonly worlds: Universe[]

  constructor(
    readonly legs: Leg[],
    sets: Partial<Record<WorldKey, WorldSet>>,
    readonly duration: number,
    private readonly riders: Riders = [],
  ) {
    super('spark')
    this.keys = [...new Set(legs.map((l) => l.world))]
    this.worlds = this.keys.map((key, index) => {
      const set = sets[key] ?? { scenery: [], after: [] }
      const chain = legs.filter((l) => l.world === key).flatMap((l) => l.placed)
      const bounds = boundsOf(chain)
      const world = WORLDS[key]
      return {
        index,
        seed: 'spark',
        world,
        theme: world.themes[0],
        taste: 'arranged',
        ballColor: SPARK,
        backdrop: 'plain',
        pieces: [...set.scenery, ...chain, ...set.after],
        box: bounds,
        bounds,
        journey: duration,
      }
    })
  }

  clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
  }

  /** The leg that has the spark at `t`. */
  owner(t: number): number {
    const time = this.clamp(t)
    let i = 0
    while (i + 1 < this.legs.length && time >= this.legs[i + 1].from) i++
    return i
  }

  /** What carries a point from leg `a`'s cells into leg `b`'s, for two legs side by side in time: the door between them. */
  shift(a: number, b: number): Pt {
    if (a === b) return [0, 0]
    if (b === a + 1) return [this.legs[b].entry[0] - this.legs[a].exit[0], this.legs[b].entry[1] - this.legs[a].exit[1]]
    if (b === a - 1) return [this.legs[b].exit[0] - this.legs[a].entry[0], this.legs[b].exit[1] - this.legs[a].entry[1]]
    return [0, 0]
  }

  override indexAt(t: number): number {
    return this.keys.indexOf(this.legs[this.owner(t)].world)
  }

  override universe(i: number): Universe {
    return this.worlds[Math.max(0, Math.min(this.worlds.length - 1, i))]
  }

  /** The universe of a world, by its key. */
  universeOf(key: WorldKey): Universe | undefined {
    const i = this.keys.indexOf(key)
    return i < 0 ? undefined : this.worlds[i]
  }

  /** The world on the stage at `t`. */
  worldKey(t: number): WorldKey {
    return this.legs[this.owner(t)].world
  }

  override begin(): number {
    return 0
  }

  override worldAt(i: number) {
    return this.universe(i).world
  }

  /** The part that has the spark at `t`. */
  holder(t: number): Placed {
    const chain = this.legs[this.owner(t)].placed
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

  /** Where the spark is at `t`, in its own leg's cells. Cheap: what the camera and the flame sample. */
  where(t: number): Pt {
    const placed = this.holder(t)
    const at = laneAt(placed.lane, this.clamp(t) - placed.start)
    return [placed.col + placed.mirror * at.x, placed.row + at.y]
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const owner = this.owner(time)
    const universe = this.worlds[this.keys.indexOf(this.legs[owner].world)]
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
    // Through a door the spark draws out along its way for a few frames, as if it went through something.
    const streak = this.streak(time)
    if (streak) {
      here.stretch = Math.max(here.stretch, streak.stretch)
      here.angle = streak.angle
    }
    const ride = this.riders.find((r) => r.leg === owner && time >= r.from && time < r.to)
    if (ride) {
      const hero: ShowBall = {
        id: ball.id,
        x: here.x,
        y: here.y,
        color: ball.color,
        ghost: ball.ghost,
        scale: point.hidden ? 0 : point.scale,
        stretch: here.stretch,
        angle: here.angle,
      }
      here.balls = ride.fn(time, hero) ?? undefined
    }
    return here
  }

  /**
   * The streak at a door: within 80 ms of one, a spark that is moving (faster than half a cell a second) is drawn out
   * along its way, most at the cut itself. Null elsewhere, and for a spark at rest at the cut.
   */
  private streak(t: number): { stretch: number; angle: number } | null {
    for (let i = 1; i < this.legs.length; i++) {
      const dt = t - this.legs[i].from
      if (Math.abs(dt) > 0.08) continue
      const a = dt < 0 ? Math.max(this.legs[i - 1].from, t - 0.012) : t
      const b = dt < 0 ? t : Math.min(this.legs[i].to, t + 0.012)
      if (b - a < 0.004) return null
      const p = this.where(a)
      const q = this.where(b)
      const v = Math.hypot(q[0] - p[0], q[1] - p[1]) / (b - a)
      if (v < 0.5) return null
      return { stretch: 1 + Math.min(1.4, 0.35 * v) * Math.exp(-Math.abs(dt) / 0.028), angle: Math.atan2(q[1] - p[1], q[0] - p[0]) }
    }
    return null
  }
}

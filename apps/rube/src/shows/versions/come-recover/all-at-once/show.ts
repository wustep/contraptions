import { ballAt, laneAt, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { Company, Riders as PartRiders } from './kit'
import { EVELYN, JOY, JOY_ID, WAYMOND, WAYMOND_ID, WORLDS, type WorldKey } from './worlds'

/**
 * All at Once as a `Show`: one ball on one path through many worlds.
 *
 * The path is cut into legs. A leg is a stretch of show time spent in one world, its parts laid end to end from
 * an entry cell the score chooses. Between two legs is a verse-jump: the world changes at once, and so does the
 * ball's place in cells, since each world has its own ground. But the camera moves by exactly the same amount at
 * the same instant (`score.ts`), so on the screen the ball holds still while everything round it becomes
 * somewhere else. A jump is a match cut on the ball.
 *
 * Just before some jumps the next world flickers in for a frame or two, the way a jump starts to bleed through in
 * the film. For those frames the stage shows the next leg's world with the ball carried into its cells by the
 * same offset as at the jump, so the flicker is the jump itself, early and brief.
 *
 * Legs in the same world share its cells: the laundromat is one room, and the ball comes back into it twice.
 */

export interface Leg {
  /** A name for the leg: what the check and the camera call it. */
  key: string
  world: WorldKey
  /** Show time the ball jumps in, and when it jumps out. */
  from: number
  to: number
  /** Its parts, in order. */
  placed: Placed[]
  /** Where the ball is (world cells) as it jumps in and as it jumps out. */
  entry: Pt
  exit: Pt
}

/** What stands in a world besides the legs' parts: its sky and walls, drawn first; its light and weather, drawn over. */
export interface WorldSet {
  scenery: Placed[]
  after: Placed[]
}

/** A flicker: from `from` to `to` the stage shows leg `leg`'s world (the next one, or the one just left). */
export interface Flicker {
  from: number
  to: number
  leg: number
}

/** The family's spans, in world cells, each tied to the world it happens in. */
export type Spans = (Company & { world: WorldKey })[]
/** Extra balls from a part, over its slot, in world cells. */
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

export class MultiverseShow extends Show {
  private readonly keys: WorldKey[]
  private readonly worlds: Universe[]

  constructor(
    readonly legs: Leg[],
    sets: Partial<Record<WorldKey, WorldSet>>,
    readonly flickers: Flicker[],
    readonly duration: number,
    private readonly riders: Riders = [],
    private readonly company: Spans = [],
  ) {
    super('all-at-once')
    this.keys = [...new Set(legs.map((l) => l.world))]
    this.worlds = this.keys.map((key, index) => {
      const set = sets[key] ?? { scenery: [], after: [] }
      const chain = legs.filter((l) => l.world === key).flatMap((l) => l.placed)
      const bounds = boundsOf(chain)
      const world = WORLDS[key]
      return {
        index,
        seed: 'all-at-once',
        world,
        theme: world.themes[0],
        taste: 'arranged',
        ballColor: EVELYN,
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

  /** The leg that has the ball at `t`. */
  owner(t: number): number {
    const time = this.clamp(t)
    let i = 0
    while (i + 1 < this.legs.length && time >= this.legs[i + 1].from) i++
    return i
  }

  /** The leg whose world is on the stage at `t`: the owner's, or the next one's (or the last one's) in a flicker. */
  presented(t: number): number {
    const time = this.clamp(t)
    const f = this.flickers.find((x) => time >= x.from && time < x.to)
    return f ? f.leg : this.owner(time)
  }

  /**
   * What carries a point from leg `a`'s cells into leg `b`'s, for two legs side by side in time: the jump between
   * them. Nothing for the same leg.
   */
  shift(a: number, b: number): Pt {
    if (a === b) return [0, 0]
    if (b === a + 1) return [this.legs[b].entry[0] - this.legs[a].exit[0], this.legs[b].entry[1] - this.legs[a].exit[1]]
    if (b === a - 1) return [this.legs[b].exit[0] - this.legs[a].entry[0], this.legs[b].exit[1] - this.legs[a].entry[1]]
    return [0, 0]
  }

  /** The offset the stage adds at `t` to the ball and the camera, both: nothing except in a flicker. */
  offset(t: number): Pt {
    return this.shift(this.owner(t), this.presented(t))
  }

  override indexAt(t: number): number {
    return this.keys.indexOf(this.legs[this.presented(t)].world)
  }

  override universe(i: number): Universe {
    return this.worlds[Math.max(0, Math.min(this.worlds.length - 1, i))]
  }

  /** The universe of a world, by its key. */
  universeOf(key: WorldKey): Universe | undefined {
    const i = this.keys.indexOf(key)
    return i < 0 ? undefined : this.worlds[i]
  }

  override begin(): number {
    return 0
  }

  override worldAt(i: number) {
    return this.universe(i).world
  }

  /** The part that has the ball at `t`. */
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

  /** Where the ball is at `t`, in its own leg's cells. Cheap: what the camera samples. */
  where(t: number): Pt {
    const placed = this.holder(t)
    const at = laneAt(placed.lane, this.clamp(t) - placed.start)
    return [placed.col + placed.mirror * at.x, placed.row + at.y]
  }

  override at(t: number): ShowPoint {
    const time = this.clamp(t)
    const owner = this.owner(time)
    const shown = this.presented(time)
    const [ox, oy] = this.shift(owner, shown)
    const universe = this.worlds[this.keys.indexOf(this.legs[shown].world)]
    const placed = this.holder(time)
    const into = time - placed.start
    const point = laneAt(placed.lane, into)
    const ball = ballAt(placed.ballIn, placed.changes, into)
    const here: ShowPoint = {
      ...point,
      x: placed.col + placed.mirror * point.x + ox,
      y: placed.row + point.y + oy,
      placed,
      ball,
      universe,
      local: time,
      begin: 0,
    }
    const ride = shown === owner ? this.riders.find((r) => r.leg === owner && time >= r.from && time < r.to) : undefined
    const world = this.legs[shown].world
    const company = [this.family(time, 'joy', world), this.family(time, 'waymond', world)].filter((b): b is ShowBall => !!b)
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

  /** Joy at `t`, in world cells, or null while no part in the world on the stage has her in sight. */
  joy(t: number): ShowBall | null {
    return this.family(t, 'joy', this.legs[this.presented(t)].world)
  }

  /** Waymond at `t`, in world cells, or null. */
  waymond(t: number): ShowBall | null {
    return this.family(t, 'waymond', this.legs[this.presented(t)].world)
  }

  private family(t: number, who: 'joy' | 'waymond', world: WorldKey): ShowBall | null {
    const time = this.clamp(t)
    const span = this.company.find((s) => s.who === who && s.world === world && time >= s.from && time < s.to)
    const b = span?.at(time)
    if (!b) return null
    return who === 'joy' ? { ...b, id: JOY_ID, color: b.color ?? JOY } : { ...b, id: WAYMOND_ID, color: b.color ?? WAYMOND }
  }
}

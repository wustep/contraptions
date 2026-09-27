import { ballAt, laneAt, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { Company, Riders as PartRiders, Who } from './kit'
import { HANNAH, HANNAH_ID, HANNAH_SCALE, IAN, IAN_ID, LOUISE, WORLDS, type WorldKey } from './worlds'

/**
 * Logogram as a `Show`: one ball (Louise) on one path through four places.
 *
 * The path is cut into legs. A leg is a stretch of show time spent in one place, its parts laid end to end from an
 * entry cell the score chooses. Between two legs is a cut: the place changes at once, and so does the ball's place in
 * cells, since each place has its own ground. But the camera moves by exactly the same amount at the same instant
 * (`score.ts`), so on the screen the ball holds still while everything round it becomes somewhere else: a match cut
 * on Louise. The film cuts to Hannah the same way, in the middle of the language: the lake house is the future.
 *
 * Legs in the same place share its cells: the lake house at dawn, in the visions and at the end is one house.
 */

export interface Leg {
  /** A name for the leg: what the check and the camera call it. */
  key: string
  world: WorldKey
  /** Show time the ball comes in, and when it goes. */
  from: number
  to: number
  /** Its parts, in order. */
  placed: Placed[]
  /** Where the ball is (world cells) as it comes in and as it goes. */
  entry: Pt
  exit: Pt
}

/** What stands in a place besides the legs' parts: its sky and walls, drawn first; its light and weather, drawn over. */
export interface WorldSet {
  scenery: Placed[]
  after: Placed[]
}

/** Ian's and Hannah's spans, in world cells, each tied to the place it happens in. */
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

export class LogogramShow extends Show {
  private readonly keys: WorldKey[]
  private readonly worlds: Universe[]
  /** The camera's cuts inside a place (`Shot.cut`), in show seconds: the score fills it; the checks read it. */
  cameraCuts: number[] = []
  /** A fast fall is one tapered streak, not a string of discs that read as other balls. */
  override readonly trail = 'smear' as const

  constructor(
    readonly legs: Leg[],
    sets: Partial<Record<WorldKey, WorldSet>>,
    readonly duration: number,
    private readonly riders: Riders = [],
    private readonly company: Spans = [],
  ) {
    super('heptapod-b')
    this.keys = [...new Set(legs.map((l) => l.world))]
    this.worlds = this.keys.map((key, index) => {
      const set = sets[key] ?? { scenery: [], after: [] }
      const chain = legs.filter((l) => l.world === key).flatMap((l) => l.placed)
      const bounds = boundsOf(chain)
      const world = WORLDS[key]
      return {
        index,
        seed: 'heptapod-b',
        world,
        theme: world.themes[0],
        taste: 'arranged',
        ballColor: LOUISE,
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

  /** What carries a point from leg `a`'s cells into leg `b`'s, for two legs side by side in time: the cut between them. */
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

  /** The universe of a place, by its key. */
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
    const ride = this.riders.find((r) => r.leg === owner && time >= r.from && time < r.to)
    const world = this.legs[owner].world
    const company = [this.companion(time, 'ian', world), this.companion(time, 'hannah', world)].filter((b): b is ShowBall => !!b)
    if (ride || company.length) {
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
      const balls = ride ? ride.fn(time, hero) : null
      here.balls = company.length ? [...(balls ?? [hero]), ...company] : balls ?? undefined
    }
    return here
  }

  /** Ian at `t`, in world cells, or null while no part in the place on the stage has him in sight. */
  ian(t: number): ShowBall | null {
    return this.companion(t, 'ian', this.legs[this.owner(t)].world)
  }

  /** Hannah at `t`, in world cells, or null. */
  hannah(t: number): ShowBall | null {
    return this.companion(t, 'hannah', this.legs[this.owner(t)].world)
  }

  private companion(t: number, who: Who, world: WorldKey): ShowBall | null {
    const time = this.clamp(t)
    const span = this.company.find((s) => s.who === who && s.world === world && time >= s.from && time < s.to)
    const b = span?.at(time)
    if (!b) return null
    return who === 'ian' ? { ...b, id: IAN_ID, color: b.color ?? IAN } : { scale: HANNAH_SCALE, ...b, id: HANNAH_ID, color: b.color ?? HANNAH }
  }
}

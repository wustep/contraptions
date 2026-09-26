import { ballAt, laneAt, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { Company, Pose } from './kit'
import { CARL, ELLIE_ID, ellieAt, WORLDS, type WorldKey } from './worlds'

/**
 * Married Life as a `Show`: one life, cut the way the film cuts it (after Everything's `MultiverseShow`).
 *
 * The path is cut into legs. A leg is a stretch of show time in one place (a world, and a spot in it), its parts laid
 * end to end from an entry cell the score chooses. Between two legs is a cut: the place changes at once, and so does
 * the ball's place in cells. But the camera moves by exactly the same amount at the same instant (`score.ts`), so on
 * the screen Carl holds still while everything round him becomes another place and another year: a match cut on
 * him. The same places come back (the church, the house, the hill, the clinic), and legs in one world share its
 * cells, so a place is one set however many times it is visited.
 *
 * The stage draws no ball: every `at` hands it an empty list of riders, and `cast.ts` (a scenery piece in every
 * world) draws Carl, square, and Ellie, round, from `carl` and `ellie` here, between the parts' drawings and their
 * fronts, where the stage would have drawn a ball.
 */

export interface Leg {
  /** A name for the leg: what the check and the camera call it. */
  key: string
  world: WorldKey
  /** Show time the cut comes in, and the next cut. */
  from: number
  to: number
  /** Its parts, in order. */
  placed: Placed[]
  /** Where the ball is (world cells) as the leg is cut in, and as it is cut out. */
  entry: Pt
  exit: Pt
}

/** What stands in a world besides the legs' parts: its sets and sky, drawn first; its light and weather, drawn over. */
export interface WorldSet {
  scenery: Placed[]
  after: Placed[]
}

/**
 * A span where the balloon's string is tied somewhere other than his top corner: the knot is carried across from him
 * over `from` to `arrive`, and stays there until `to` (or the end of the leg it starts in, whichever is first).
 */
export interface Tie {
  from: number
  arrive: number
  to: number
  /** Where it is tied at show time `s`, in the world cells of the leg it happens in. */
  at: (s: number) => Pt
}

/** Ellie's spans, in world cells, each tied to the world it happens in. */
export type Spans = (Company & { world: WorldKey })[]

/** Carl as the cast draws him: where, how big, how he holds himself, what colour. */
export interface Figure {
  x: number
  y: number
  scale: number
  tilt: number
  squash: number
  color: string
}

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

export class LifeShow extends Show {
  private readonly keys: WorldKey[]
  private readonly worlds: Universe[]
  /**
   * Where the balloon's string is tied when it is not his: at her bedside (he gives it to her), and at the end (to
   * her chair). Each span is tied to the leg it starts in; out of it, the balloon is his again.
   */
  ties: Tie[] = []

  constructor(
    readonly legs: Leg[],
    sets: Partial<Record<WorldKey, WorldSet>>,
    readonly duration: number,
    private readonly company: Spans = [],
    private readonly poses: Pose[] = [],
  ) {
    super('married-life')
    this.keys = [...new Set(legs.map((l) => l.world))]
    this.worlds = this.keys.map((key, index) => {
      const set = sets[key] ?? { scenery: [], after: [] }
      const chain = legs.filter((l) => l.world === key).flatMap((l) => l.placed)
      const bounds = boundsOf(chain)
      const world = WORLDS[key]
      return {
        index,
        seed: 'married-life',
        world,
        theme: world.themes[0],
        taste: 'arranged',
        ballColor: CARL,
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

  /** Where Carl is at `t`, in his own leg's cells. Cheap: what the camera samples. */
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
    return {
      ...point,
      x: placed.col + placed.mirror * point.x,
      y: placed.row + point.y,
      placed,
      ball,
      universe,
      local: time,
      begin: 0,
      // The stage draws no one: the cast does (`cast.ts`).
      balls: [],
    }
  }

  /** Ellie at `t`, in world cells, or null while no part in the world on the stage has her in sight. */
  ellie(t: number): ShowBall | null {
    const time = this.clamp(t)
    const world = this.legs[this.owner(time)].world
    const span = this.company.find((s) => s.world === world && time >= s.from && time < s.to)
    const b = span?.at(time)
    if (!b) return null
    return { ...b, id: ELLIE_ID, color: b.color ?? ellieAt(time) }
  }

  /** A part's word on how Carl holds himself at `t`, if any part has one. */
  pose(t: number): { tilt?: number; squash?: number } | null {
    const time = this.clamp(t)
    const span = this.poses.find((p) => time >= p.from && time < p.to)
    return span ? span.at(time) : null
  }
}

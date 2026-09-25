import { ballAt, laneAt, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { World } from '../../../../worlds'
import type { Theme } from '../../../../../../../src/core/themes'
import type { Company, Who } from './kit'
import { DAVID, DAVID_ID, MIA, MIA_ID, SEB, SON, SON_ID, SON_SCALE } from './worlds'

/**
 * Seb's as a `Show`: one thread through ten places on one clock, and no
 * portal anywhere. The places share one set of cells, laid out left to right
 * in the order the dream visits them, and the stage changes place only while
 * the frame is covered: a blackout, an iris, a curtain, a doorway filling
 * the frame. The club at the end is the club at the start, built again
 * where the thread comes back to it.
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
  /** What is laid over everything, the ball included: light, and the covers the stage changes under. */
  after?: Placed[]
  /** Show time from which this universe is on the stage. */
  from: number
}

const IDS: Record<Who, number> = { mia: MIA_ID, david: DAVID_ID, son: SON_ID }
const COLORS: Record<Who, string> = { mia: MIA, david: DAVID, son: SON }

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

export class SebsShow extends Show {
  private readonly stages: Stage[]
  private readonly worlds: Universe[]
  /** Every part of the thread, in order of time, whichever universe it was laid in. */
  private readonly thread: Placed[]

  constructor(stages: Stage[], readonly duration: number, private readonly company: Company[] = []) {
    super('sebs')
    this.stages = stages
    this.worlds = stages.map((s, index) => {
      const bounds = boundsOf(s.chain.length ? s.chain : s.scenery)
      return {
        index,
        seed: 'sebs',
        world: s.world,
        theme: s.theme,
        taste: 'arranged',
        ballColor: SEB,
        backdrop: 'plain',
        pieces: [...s.scenery, ...s.chain, ...(s.after ?? [])],
        box: bounds,
        bounds,
        journey: duration,
      }
    })
    const seen = new Set<Placed>()
    this.thread = stages.flatMap((s) => s.chain).filter((p) => (seen.has(p) ? false : (seen.add(p), true))).sort((a, b) => a.start - b.start)
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
    const chain = this.thread
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
    const company = (['mia', 'david', 'son'] as Who[]).map((who) => this.companion(time, who)).filter((b): b is ShowBall => !!b)
    if (company.length) {
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
      here.balls = [hero, ...company]
    }
    return here
  }

  /** Mia at `t`, in world cells, or null while no part has her in sight. */
  mia(t: number): ShowBall | null {
    return this.companion(t, 'mia')
  }

  /** David at `t` (only in the club, now), or null. */
  david(t: number): ShowBall | null {
    return this.companion(t, 'david')
  }

  /** Their son at `t` (only in the home movie), or null. */
  son(t: number): ShowBall | null {
    return this.companion(t, 'son')
  }

  companion(t: number, who: Who): ShowBall | null {
    const time = this.clamp(t)
    const span = this.company.find((s) => s.who === who && time >= s.from && time < s.to)
    const b = span?.at(time)
    if (!b) return null
    const scale = who === 'son' ? (b.scale ?? 1) * SON_SCALE : b.scale
    return { ...b, id: IDS[who], color: b.color ?? COLORS[who], scale }
  }
}

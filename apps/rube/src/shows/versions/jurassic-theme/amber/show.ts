import { ballAt, laneAt, type Pt } from '../../../../parts'
import type { Box, Placed } from '../../../../plan'
import { Show, type ShowBall, type ShowPoint } from '../../../../show'
import type { Universe } from '../../../../universe'
import type { Company, Who } from './kit'
import { ELLIE, ELLIE_ID, GRANT, WORLDS, type WorldKey } from './worlds'

/**
 * Amber as a `Show`: one ball through four worlds. Between two worlds the ball's place in cells changes, and the
 * camera moves by the same amount at the same instant, so on the screen he holds still. Ellie is company. She is
 * absent in the dig and present after, and she changes places only at a cut.
 */

export interface Leg {
  key: string
  world: WorldKey
  from: number
  to: number
  placed: Placed[]
  entry: Pt
  exit: Pt
}

export type Spans = (Company & { world: WorldKey })[]

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

export class AmberShow extends Show {
  private readonly keys: WorldKey[]
  private readonly worlds: Universe[]
  override readonly trail = 'smear' as const

  constructor(
    readonly legs: Leg[],
    readonly duration: number,
    private readonly company: Spans = [],
  ) {
    super('jurassic-theme')
    this.keys = [...new Set(legs.map((l) => l.world))]
    this.worlds = this.keys.map((key, index) => {
      const chain = legs.filter((l) => l.world === key).flatMap((l) => l.placed)
      const bounds = boundsOf(chain)
      const world = WORLDS[key]
      return {
        index,
        seed: 'jurassic-theme',
        world,
        theme: world.themes[0],
        taste: 'arranged',
        ballColor: GRANT,
        backdrop: 'plain',
        pieces: chain,
        box: bounds,
        bounds,
        journey: duration,
      }
    })
  }

  clamp(t: number): number {
    return Math.max(0, Math.min(this.duration, Number.isFinite(t) ? t : 0))
  }

  owner(t: number): number {
    const time = this.clamp(t)
    let i = 0
    while (i + 1 < this.legs.length && time >= this.legs[i + 1].from) i++
    return i
  }

  override indexAt(t: number): number {
    return this.keys.indexOf(this.legs[this.owner(t)].world)
  }

  override universe(i: number): Universe {
    return this.worlds[Math.max(0, Math.min(this.worlds.length - 1, i))]
  }

  override begin(): number {
    return 0
  }

  override worldAt(i: number) {
    return this.universe(i).world
  }

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
    const world = this.legs[owner].world
    const company = (['ellie'] as Who[]).map((who) => this.companion(time, who, world)).filter((b): b is ShowBall => !!b)
    if (company.length) {
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
      here.balls = [hero, ...company]
    }
    return here
  }

  who(t: number, who: Who): ShowBall | null {
    return this.companion(t, who, this.legs[this.owner(t)].world)
  }

  private companion(t: number, who: Who, world: WorldKey): ShowBall | null {
    const time = this.clamp(t)
    const span = this.company.find((s) => s.who === who && s.world === world && time >= s.from && time < s.to)
    const b = span?.at(time)
    if (!b) return null
    return { ...b, id: ELLIE_ID, color: b.color ?? ELLIE }
  }
}

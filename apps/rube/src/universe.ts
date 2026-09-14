import { makeRng, type Rng } from '../../../src/core/rng'
import type { Theme } from '../../../src/core/themes'
import { ballAt, laneAt, type BallState, type LanePoint, type Taste } from './parts'
import { beatCount, isDynamic, planChain, type Box, type Placed } from './plan'
import type { Backdrop, World } from './worlds'

/**
 * A universe: one visit to one world. A palette from the world's own, a
 * taste from the world's own, one map, one chain from a portal to a
 * portal, one ball colour to start with. Built from a seed, an index and
 * the world the loop has reached, and nothing else, so the show can build
 * the same one again at any time and get the same machine to the frame.
 */

export interface Universe {
  index: number
  seed: string
  world: World
  theme: Theme
  taste: string
  /** The colour the ball has when it comes out of the first portal. */
  ballColor: string
  backdrop: Backdrop
  pieces: Placed[]
  /** The box the map was carved in. */
  box: Box
  /** Seconds from the first portal to the last. */
  journey: number
  /** Cells the whole thing spans. */
  bounds: Box
}

export interface UniversePoint extends LanePoint {
  placed: Placed
  /** The ball as it is at this moment. */
  ball: BallState
}

/** What the last visit to this world looked like, so this one can look different. */
export interface Avoid {
  /** The palette the world was painted in last time. Not picked again while the world has others. */
  theme: string | null
  /** The taste the planner leaned on last time. */
  taste: string | null
  /** Whether the world just before this one had a piece that changed the ball. */
  dynamicsLast: boolean
}

export function buildUniverse(seed: string, index: number, world: World, avoid: Avoid, solo: string | null = null): Universe {
  const rng = makeRng(`${seed}#${index}`)
  // Two visits to the same world never look alike back to back: a
  // different palette and a different taste from the last time, whenever
  // the world has more than one to choose from.
  const themePool = world.themes.filter((t) => t.name !== avoid.theme)
  const theme = rng.fork('theme').pick(themePool.length ? themePool : world.themes)
  const tasteNames = Object.keys(world.tastes)
  const tastePool = tasteNames.filter((name) => name !== avoid.taste)
  const tasteName = rng.fork('taste').pick(tastePool.length ? tastePool : tasteNames)
  const taste: Taste = { weights: world.tastes[tasteName] }
  const ballColor = rng.fork('ball').pick(theme.colors)
  const colors = theme.colors.length > 3 ? theme.colors.filter((c) => c !== ballColor) : theme.colors
  const portalColor = rng.fork('portal').pick(colors)
  const backdrop = rng.fork('backdrop').pick(world.backdrops)

  // Solo: the piece under the glass, with rail to breathe, and portals.
  const pool = solo ? world.pieces.filter((c) => c.name === solo || c.name === 'rail' || c.name === 'portal') : world.pieces
  // One map: a box wide enough for a long walk, tall enough to climb and fall in.
  const w = rng.int(14, 21)
  const h = rng.int(6, 10)
  const box: Box = { x0: 0, y0: 0, x1: w - 1, y1: h - 1 }
  const beats = rng.int(11, 17)
  const ball: BallState = { color: ballColor, ghost: false, id: 0 }
  // The pieces that change the ball stay special: at most two a map, keen
  // when the last world had none, shy when it had one.
  const dynamics = { boost: avoid.dynamicsLast ? 0.5 : 3, cap: 2 }
  const pieces = bestOf(rng.fork('map'), 6, (attempt) =>
    planChain({ rng: attempt, theme, taste, catalog: pool, colors, portalColor, ball, dynamics }, { box, beats }),
  )

  let acc = 0
  for (const placed of pieces) {
    placed.start = acc
    acc += placed.span
  }

  const bounds = pieces.reduce<Box>(
    (b, placed) => {
      for (const [c, r] of placed.cells) {
        b.x0 = Math.min(b.x0, c)
        b.x1 = Math.max(b.x1, c)
        b.y0 = Math.min(b.y0, r)
        b.y1 = Math.max(b.y1, r)
      }
      return b
    },
    { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
  )

  return { index, seed, world, theme, taste: tasteName, ballColor, backdrop, pieces, box, journey: acc, bounds }
}

/** Plan the map a few times and keep the walk with the most beats. */
function bestOf(rng: Rng, tries: number, plan: (rng: Rng) => Placed[]): Placed[] {
  let best: Placed[] = []
  for (let i = 0; i < tries; i++) {
    const attempt = plan(rng.fork(`try:${i}`))
    if (!best.length || beatCount(attempt) > beatCount(best)) best = attempt
  }
  return best
}

/** Whether a world has a piece that changes the ball. */
export const hasDynamics = (u: Universe): boolean => u.pieces.some((p) => isDynamic(p.piece))

/** Where the ball is `t` seconds into a universe. Clamped to its ends. */
export function universeAt(u: Universe, t: number): UniversePoint {
  const { pieces } = u
  const clamped = Math.max(0, Math.min(u.journey, t))
  let lo = 0
  let hi = pieces.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (pieces[mid].start <= clamped) lo = mid
    else hi = mid - 1
  }
  const placed = pieces[lo]
  const into = clamped - placed.start
  const local = laneAt(placed.lane, into)
  return {
    ...local,
    x: placed.col + placed.mirror * local.x,
    y: placed.row + local.y,
    placed,
    ball: ballAt(placed.ballIn, placed.changes, into),
  }
}

import { makeRng, type Rng } from '../../../src/core/rng'
import { themes, type Theme } from '../../../src/core/themes'
import { ballAt, laneAt, type BallState, type LanePoint, type Taste } from './parts'
import { catalog } from './pieces'
import { beatCount, planChain, type Box, type Placed } from './plan'

/**
 * A universe: one theme, one taste, one map, one chain from a portal to a
 * portal, one ball colour to start with. Built from a seed and nothing
 * else, so the show can build the same one again at any time and get the
 * same machine to the frame.
 */

export type Backdrop = 'plain' | 'dots' | 'rules' | 'stars'

export interface Universe {
  index: number
  seed: string
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

/** What each universe favours. The names are the pieces'; the extras steer their variants. */
const TASTES: Record<string, Taste['weights']> = {
  mixed: {},
  workshop: {
    hammer: 1.7, dominoes: 1.6, bellows: 1.6, seesaw: 1.3, bell: 1.2, pendulum: 1.6, conveyor: 1.5, paddle: 1.4,
    drawbridge: 1.5, tipper: 1.4, gears: 1.7, cannon: 0.5, loop: 0.5, toaster: 0.7, rocket: 0.5, crane: 0.8,
  },
  vertical: {
    drop: 1.6, lift: 1.5, toaster: 1.4, scoop: 1.4, trapdoor: 1.6, funnel: 1.6, balloon: 1.5, trampoline: 1.3,
    stairs: 1.5, switchback: 1.6, zipline: 1.4, tipper: 1.3, screw: 1.5, flipper: 1.3, 'drop-deep': 2.2, 'lift-tall': 2.2, loop: 0.6, rocket: 0.6, plunger: 0.6,
  },
  ballistic: {
    cannon: 2, loop: 1.8, toaster: 1.3, seesaw: 1.3, hammer: 1.1, plunger: 1.9, rocket: 1.8, trampoline: 1.6, crane: 1.3,
    zipline: 1.3, trapeze: 1.6, trebuchet: 1.9, flipper: 1.5, dominoes: 0.6, bellows: 0.6, conveyor: 0.5,
  },
}

const DARK = new Set(['blueprint', 'noir', 'deepsea', 'ember', 'dusk', 'neon', 'plum'])

/** What the worlds before this one looked like, so this one can look different. */
export interface Avoid {
  /** Theme names of the last few worlds. None of them is picked again. */
  themes: string[]
  /** The previous world's taste. */
  taste: string | null
}

/** How many worlds back a theme is barred. With twenty palettes there is always room. */
export const THEME_MEMORY = 3

export function buildUniverse(seed: string, index: number, avoid: Avoid, solo: string | null = null): Universe {
  const rng = makeRng(`${seed}#${index}`)
  // A hop always lands somewhere that looks different: never the theme of
  // any of the last THEME_MEMORY worlds, never the taste of the last one.
  const barred = new Set(avoid.themes.slice(-THEME_MEMORY))
  const themePool = themes.filter((t) => !barred.has(t.name))
  const theme = rng.fork('theme').pick(themePool.length ? themePool : themes)
  const tastePool = Object.keys(TASTES).filter((name) => name !== avoid.taste)
  const tasteName = rng.fork('taste').pick(tastePool)
  const taste: Taste = { weights: TASTES[tasteName] }
  const ballColor = rng.fork('ball').pick(theme.colors)
  const colors = theme.colors.length > 3 ? theme.colors.filter((c) => c !== ballColor) : theme.colors
  const portalColor = rng.fork('portal').pick(colors)
  const backdrop: Backdrop = DARK.has(theme.name) ? 'stars' : rng.fork('backdrop').pick(['plain', 'dots', 'rules', 'plain'])

  // Solo: the piece under the glass, with rail to breathe, and portals.
  const pool = solo ? catalog.filter((c) => c.name === solo || c.name === 'rail' || c.name === 'portal') : catalog
  // One map: a box wide enough for a long walk, tall enough to climb and fall in.
  const w = rng.int(14, 21)
  const h = rng.int(6, 10)
  const box: Box = { x0: 0, y0: 0, x1: w - 1, y1: h - 1 }
  const beats = rng.int(11, 17)
  const ball: BallState = { color: ballColor, ghost: false, id: 0 }
  const pieces = bestOf(rng.fork('map'), 6, (attempt) =>
    planChain({ rng: attempt, theme, taste, catalog: pool, colors, portalColor, ball }, { box, beats }),
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

  return { index, seed, theme, taste: tasteName, ballColor, backdrop, pieces, box, journey: acc, bounds }
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

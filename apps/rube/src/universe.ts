import { makeRng, type Rng } from '../../../src/core/rng'
import { themes, type Theme } from '../../../src/core/themes'
import { laneAt, type LanePoint, type Taste } from './parts'
import { catalog } from './pieces'
import { beatCount, planSection, type Box, type Placed } from './plan'

/**
 * A universe: one theme, one taste, one chain of sections, one ball colour.
 * Built from a seed and nothing else, so the show can build the same one
 * again at any time and get the same machine to the frame.
 */

export type Backdrop = 'plain' | 'dots' | 'rules' | 'stars'

export interface Universe {
  index: number
  seed: string
  theme: Theme
  taste: string
  ballColor: string
  backdrop: Backdrop
  pieces: Placed[]
  sections: Box[]
  /** Seconds from the first portal to the last. */
  journey: number
  /** Cells the whole thing spans. */
  bounds: Box
}

export interface UniversePoint extends LanePoint {
  placed: Placed
  section: number
}

/** What each universe favours. The names are the pieces'; the extras steer their variants. */
const TASTES: Record<string, Taste['weights']> = {
  mixed: {},
  workshop: { hammer: 1.7, dominoes: 1.6, bellows: 1.6, seesaw: 1.3, bell: 1.2, cannon: 0.5, loop: 0.5, toaster: 0.7 },
  vertical: { drop: 1.7, lift: 1.6, toaster: 1.5, scoop: 1.4, 'drop-deep': 2.2, 'lift-tall': 2.2, loop: 0.6 },
  ballistic: { cannon: 2.2, loop: 2, toaster: 1.4, seesaw: 1.4, hammer: 1.2, dominoes: 0.6, bellows: 0.6 },
}

const DARK = new Set(['blueprint', 'noir', 'deepsea', 'ember', 'dusk'])

/** Each section is its own room, laid in a row with a gap the camera never crosses. */
const GAP = 5

export function buildUniverse(seed: string, index: number, previousTheme: string | null, solo: string | null = null): Universe {
  const rng = makeRng(`${seed}#${index}`)
  const themePool = themes.filter((t) => t.name !== previousTheme)
  const theme = rng.fork('theme').pick(themePool)
  const tasteName = rng.fork('taste').pick(Object.keys(TASTES))
  const taste: Taste = { weights: TASTES[tasteName] }
  const ballColor = rng.fork('ball').pick(theme.colors)
  const colors = theme.colors.length > 3 ? theme.colors.filter((c) => c !== ballColor) : theme.colors
  const portalColor = rng.fork('portal').pick(colors)
  const backdrop: Backdrop = DARK.has(theme.name) ? 'stars' : rng.fork('backdrop').pick(['plain', 'dots', 'rules', 'plain'])

  // Solo: the piece under the glass, with rail to breathe, and portals.
  const pool = solo ? catalog.filter((c) => c.name === solo || c.name === 'rail' || c.name === 'portal') : catalog
  const sectionsWanted = rng.int(2, 5)
  const pieces: Placed[] = []
  const sections: Box[] = []
  let x = 0
  for (let s = 0; s < sectionsWanted; s++) {
    const w = rng.int(8, 13)
    const h = rng.int(4, 7)
    const box: Box = { x0: x, y0: 0, x1: x + w - 1, y1: h - 1 }
    const beats = rng.int(6, 11)
    const section = bestOf(rng.fork(`section:${s}`), 4, (attempt) =>
      planSection(
        { rng: attempt, theme, taste, catalog: pool, colors, portalColor },
        { index: s, box, beats, hopIn: s === 0, hopOut: s === sectionsWanted - 1 },
      ),
    )
    pieces.push(...section)
    sections.push(box)
    x += w + GAP
  }

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

  return { index, seed, theme, taste: tasteName, ballColor, backdrop, pieces, sections, journey: acc, bounds }
}

/** Plan a section a few times and keep the one with the most beats. */
function bestOf(rng: Rng, tries: number, plan: (rng: Rng) => Placed[]): Placed[] {
  let best: Placed[] = []
  for (let i = 0; i < tries; i++) {
    const attempt = plan(rng.fork(`try:${i}`))
    if (beatCount(attempt) > beatCount(best)) best = attempt
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
  const local = laneAt(placed.lane, clamped - placed.start)
  return {
    ...local,
    x: placed.col + placed.mirror * local.x,
    y: placed.row + local.y,
    placed,
    section: placed.section,
  }
}

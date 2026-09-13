import type { Rng } from '../../../src/core/rng'
import type { Theme } from '../../../src/core/themes'
import type { Lane, Piece, Placement, Pt, Taste } from './parts'
import { portalPlacement } from './pieces/portal'

/**
 * The planner: one section of the chain, carved into a box of cells.
 *
 * A section is a self-avoiding walk of pieces. Each piece proposes its own
 * footprint and hand-off, the planner checks the cells are free and inside
 * the box, and the ball's heading is carried along — a piece that reverses
 * (a scoop, a drop that turns back) flips it, and the next piece is mirrored
 * to match. When nothing fits, or the section has had its beats, the walk
 * ends in a portal; the next section starts from another portal, somewhere
 * else. Dead ends are what portals are for.
 */

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** One placed piece, in world cells, with its lane still in the canonical hand. */
export interface Placed {
  piece: Piece<any>
  state: unknown
  /** The entry cell. */
  col: number
  row: number
  /** 1 eastbound, -1 westbound. The piece draws canonically either way. */
  mirror: 1 | -1
  /** World cells occupied. */
  cells: Pt[]
  lane: Lane
  /** Seconds from the universe's start at which the ball enters. Set by the universe. */
  start: number
  span: number
  section: number
}

export interface PlanCtx {
  rng: Rng
  theme: Theme
  taste: Taste
  catalog: Piece<any>[]
  /** Colours a piece may take. */
  colors: string[]
  /** Colour of the portals. */
  portalColor: string
}

export interface SectionSpec {
  index: number
  box: Box
  /** Beats to aim for; the box may cut it short. */
  beats: number
  /** Whether the portal in and the portal out are gates between universes. */
  hopIn: boolean
  hopOut: boolean
}

const key = (c: number, r: number) => `${c}:${r}`

/** Turn a canonical placement into world cells for a heading. */
export const worldCells = (cells: Pt[], col: number, row: number, mirror: 1 | -1): Pt[] =>
  cells.map(([dx, dy]) => [col + mirror * dx, row + dy])

function placeOne(
  placement: Placement<unknown>,
  piece: Piece<any>,
  col: number,
  row: number,
  mirror: 1 | -1,
  section: number,
): Placed {
  return {
    piece,
    state: placement.state,
    col,
    row,
    mirror,
    cells: worldCells(placement.cells, col, row, mirror),
    lane: placement.lane,
    start: 0,
    span: placement.lane.segs.reduce((sum, s) => sum + s.dur, 0),
    section,
  }
}

/** Plan one section. Returns its pieces in order, or fewer than asked if the box ran out. */
export function planSection(ctx: PlanCtx, spec: SectionSpec): Placed[] {
  const { rng, box, beats } = { ...ctx, ...spec }
  const occupied = new Set<string>()
  const inBox = (c: number, r: number) => c >= box.x0 && c <= box.x1 && r >= box.y0 && r <= box.y1
  const free = (c: number, r: number) => inBox(c, r) && !occupied.has(key(c, r))

  let col = box.x0 + rng.int(0, 2)
  let row = rng.int(box.y0 + 1, box.y1 + 1)
  let mirror: 1 | -1 = 1
  const out: Placed[] = []

  const commit = (piece: Piece<any>, placement: Placement<unknown>) => {
    const placed = placeOne(placement, piece, col, row, mirror, spec.index)
    for (const [c, r] of placed.cells) occupied.add(key(c, r))
    out.push(placed)
    const [ex, ey] = placement.exit.at
    col += mirror * ex
    row += ey
    mirror = (mirror * placement.exit.dir) as 1 | -1
  }

  const portalPiece = ctx.catalog.find((c) => c.name === 'portal')!
  commit(portalPiece, portalPlacement('in', spec.hopIn, ctx.portalColor))

  const pool = ctx.catalog.filter((c) => c.weight > 0)
  let prev = ''
  let rails = 0
  let placed = 0
  while (placed < beats) {
    const fits = (cells: Pt[], exit: Pt) => {
      const world = worldCells(cells, col, row, mirror)
      if (!world.every(([c, r]) => free(c, r))) return false
      const ec = col + mirror * exit[0]
      const er = row + exit[1]
      return free(ec, er)
    }
    const candidates = pool.filter((c) => c.name !== prev && !(c.name === 'rail' && rails >= 2))
    let chosen: { piece: Piece<any>; placement: Placement<unknown> } | null = null
    const tried = new Set<string>()
    while (tried.size < candidates.length) {
      const untried = candidates.filter((c) => !tried.has(c.name))
      const piece = rng.weighted(untried, (c) => c.weight * (ctx.taste.weights[c.name] ?? 1))
      tried.add(piece.name)
      const placement = piece.place({
        rng: rng.fork(`${spec.index}:${placed}:${piece.name}`),
        color: rng.pick(ctx.colors),
        theme: ctx.theme,
        taste: ctx.taste,
        fits,
      })
      if (placement) {
        chosen = { piece, placement }
        break
      }
    }
    if (!chosen) break
    commit(chosen.piece, chosen.placement)
    rails = chosen.piece.name === 'rail' ? rails + 1 : 0
    prev = chosen.piece.name
    if (chosen.piece.name !== 'rail') placed++
  }

  // A section should not end on plain rail; a portal after a beat reads as
  // the beat's consequence.
  while (out.length > 1 && out[out.length - 1].piece.name === 'rail') {
    const last = out.pop()!
    for (const [c, r] of last.cells) occupied.delete(key(c, r))
    col = last.col
    row = last.row
    mirror = last.mirror
  }
  commit(portalPiece, portalPlacement('out', spec.hopOut, ctx.portalColor))
  return out
}

/** Beats in a section that are neither rail nor portal. */
export const beatCount = (pieces: Placed[]): number =>
  pieces.filter((p) => p.piece.name !== 'rail' && p.piece.name !== 'portal').length

import type { Theme } from '../../../src/core/themes'
import type { Piece, Taste } from './parts'
import { arcade } from './pieces/arcade'
import { garden } from './pieces/garden'
import { harbor } from './pieces/harbor'
import { workshop } from './pieces/workshop'

/**
 * The four worlds, and the order the show visits them in.
 *
 * A world is not a palette. It is a place with its own vocabulary of
 * pieces — a harbor has buoys and crabs and a lighthouse where a workshop
 * has hammers and gears — its own palettes to be painted in, its own
 * backdrops, and its own tastes for the planner to lean on. The show goes
 * round them in a fixed order, workshop → harbor → garden → arcade → and
 * back to the workshop, the way a climb goes through its biomes; the seed
 * decides everything *inside* a visit — the palette, the taste, the map —
 * and never which world comes next.
 */
export type Backdrop = 'plain' | 'dots' | 'rules' | 'stars' | 'waves' | 'sprigs' | 'grid'

export interface World {
  name: string
  label: string
  /** One line about the place. */
  note: string
  /** The palettes this world is painted in. A visit picks one; the next visit picks another. */
  themes: Theme[]
  /** What the paper behind the pieces looks like here. Picked per visit; repeats weight the pick. */
  backdrops: Backdrop[]
  /** Every piece the planner may draw from here — its rail and the portal included. */
  pieces: Piece<any>[]
  /** What a visit may favour. The names are the pieces'; the extras steer their variants. */
  tastes: Record<string, Taste['weights']>
}

/** The loop, in order. */
export const WORLDS: World[] = [workshop, harbor, garden, arcade]

/** The world the show is in at universe `index`. */
export const worldAt = (index: number): World => WORLDS[((index % WORLDS.length) + WORLDS.length) % WORLDS.length]

/** The world after `world` in the loop. */
export const nextWorld = (world: World): World => WORLDS[(WORLDS.indexOf(world) + 1) % WORLDS.length]

export const worldByName = (name: string): World | null => WORLDS.find((w) => w.name === name) ?? null

/**
 * The world a piece belongs to: the first whose vocabulary has it. Rail and
 * the portal are in every world, so they resolve to the first.
 */
export const worldOf = (pieceName: string): World | null => WORLDS.find((w) => w.pieces.some((c) => c.name === pieceName)) ?? null

/** No world's vocabulary grows past this; polishing a set beats adding to it. */
export const CATALOG_LIMIT = 45

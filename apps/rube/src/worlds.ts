import type { Theme } from '../../../src/core/themes'
import type { Piece, Placement, Taste } from './parts'
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
 * round them in a fixed order, workshop → garden → harbor → arcade → and
 * back to the workshop, the way a climb goes through its biomes; the seed
 * decides everything *inside* a visit — the palette, the taste, the map —
 * and never which world comes next.
 *
 * A world has two names. `name` is the code's and the URL's (`?world=harbor`)
 * and does not change; `label` is what the panel and the catalog call it:
 * the workshop is Regular, the garden Forest, the harbor Aqua, and the
 * arcade is the Arcade. So the loop reads Regular → Forest → Aqua → Arcade.
 */
export type Backdrop = 'plain' | 'dots' | 'rules' | 'stars' | 'waves' | 'sprigs' | 'grid' | 'flakes'

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
  /** A staged world can supply its own entrance and exit geometry. */
  portalPlacement?: (kind: 'in' | 'out', color: string) => Placement<any>
  /** What a visit may favour. The names are the pieces'; the extras steer their variants. */
  tastes: Record<string, Taste['weights']>
  /** Whether a visit opens on two or three cells of rail out of the entry portal, a breath before the first beat. */
  leadIn?: boolean
  /**
   * Set on a world made in the Builder: the names of the pieces it brought
   * with it, as against the rail and the cast it borrows from the stock
   * worlds. The catalog shows a build by these.
   */
  own?: string[]
  /**
   * Set on a world the Playground stages: one waiting to be let into the
   * loop, or a stock world's name over the pieces waiting to join it. Like a
   * build it stands beside the loop and is shown by its `own`; this is what
   * the sheet says of where it stands.
   */
  staged?: string
}

/** The loop, in order. */
export const WORLDS: World[] = [workshop, garden, harbor, arcade]

/** The world the show is in at universe `index`. */
export const worldAt = (index: number): World => WORLDS[((index % WORLDS.length) + WORLDS.length) % WORLDS.length]

/** The world after `world` in the loop. */
export const nextWorld = (world: World): World => WORLDS[(WORLDS.indexOf(world) + 1) % WORLDS.length]

/**
 * The builds: worlds made in the Builder and registered at runtime, from
 * the browser's own store and from `apps/rube/builds/`. They stand beside
 * the loop and never in it — the loop is the four stock worlds in their
 * fixed order, so a seed is the same show for everyone — and the show
 * visits one only when it is pinned there (`?world=<name>`), or for a solo
 * of one of its pieces.
 */
const builds: World[] = []

/** Register a built world, in place of any other of its name. A stock world's name is refused. */
export function registerWorld(world: World): boolean {
  if (WORLDS.some((w) => w.name === world.name)) return false
  unregisterWorld(world.name)
  builds.push(world)
  return true
}

export function unregisterWorld(name: string): void {
  const i = builds.findIndex((w) => w.name === name)
  if (i >= 0) builds.splice(i, 1)
}

export const builtWorlds = (): readonly World[] => builds

export const worldByName = (name: string): World | null => WORLDS.find((w) => w.name === name) ?? builds.find((w) => w.name === name) ?? null

/**
 * The world a piece belongs to: the first whose vocabulary has it, the
 * stock worlds before the builds, and a build by the pieces it brought
 * rather than the ones it borrows. Rail and the portal are in every world,
 * so they resolve to the first.
 */
export const worldOf = (pieceName: string): World | null =>
  WORLDS.find((w) => w.pieces.some((c) => c.name === pieceName)) ?? builds.find((w) => w.own?.includes(pieceName)) ?? null

/** No world's vocabulary grows past this; polishing a set beats adding to it. */
export const CATALOG_LIMIT = 45

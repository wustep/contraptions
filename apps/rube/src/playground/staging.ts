import type { Piece } from '../parts'
import { registerWorld, type World } from '../worlds'

/**
 * The Playground's shelves. Everything here is waiting: pieces made for one
 * of the four worlds and not yet let into it, pieces a craft pass took out
 * of Machine and that are kept where they can still be watched, and whole
 * worlds that are not yet in the loop. Nothing on these shelves is in
 * Machine's pool, in a Show's plan or in the Builder's cast, and none of it
 * is fetched by any page but the Playground's.
 *
 * A shelf is a `World` like any other, registered beside the loop the way a
 * build is, so the stage, the sheet and a solo need no code of their own.
 * A stock world's shelf borrows that world's rail, palettes and portal and
 * holds only the pieces waiting to join it; a new world's shelf is the
 * world whole, rail and tastes and all, ready to be moved into
 * `src/pieces/` and added to `WORLDS` the day it is approved.
 *
 * Each shelf is its own chunk behind a dynamic `import()`, so a link to
 * one piece fetches one world's code and the sheet fetches them all, side
 * by side.
 */

/** Where a staged piece came from. */
export type Status = 'new' | 'restored'

export interface Staged {
  status: Status
  /** One line: what the piece is, or for a restored one what it was and why it went. */
  note: string
}

export interface Shelf {
  world: World
  /** Every piece the shelf stages, by name. The world's rail too, when the world is new. */
  staged: Record<string, Staged>
}

export interface ShelfEntry {
  /** The world's name once loaded, and in the URL. */
  name: string
  label: string
  /** A stock world's waiting room, or a world of its own. */
  kind: 'additions' | 'world'
  load(): Promise<Shelf>
}

export const SHELVES: readonly ShelfEntry[] = [
  { name: 'staged-workshop', label: 'Regular', kind: 'additions', load: () => import('./pieces/workshop').then((m) => m.shelf) },
  { name: 'staged-garden', label: 'Forest', kind: 'additions', load: () => import('./pieces/garden').then((m) => m.shelf) },
  { name: 'staged-harbor', label: 'Aqua', kind: 'additions', load: () => import('./pieces/harbor').then((m) => m.shelf) },
  { name: 'staged-arcade', label: 'Arcade', kind: 'additions', load: () => import('./pieces/arcade').then((m) => m.shelf) },
  { name: 'alpine', label: 'Snow', kind: 'world', load: () => import('./pieces/alpine').then((m) => m.shelf) },
  { name: 'orchestra', label: 'Music', kind: 'world', load: () => import('./pieces/orchestra').then((m) => m.shelf) },
  { name: 'underhill-cavern', label: 'Cavern', kind: 'world', load: () => import('./pieces/underhill').then((m) => m.cavernShelf) },
  { name: 'underhill-boiler', label: 'Boiler', kind: 'world', load: () => import('./pieces/underhill').then((m) => m.boilerShelf) },
  { name: 'underhill-throne', label: 'Throne', kind: 'world', load: () => import('./pieces/underhill').then((m) => m.throneShelf) },
]

const loaded = new Map<string, Promise<Shelf>>()

/** A shelf, fetched once and registered beside the loop. */
export function loadShelf(name: string): Promise<Shelf> | null {
  const entry = SHELVES.find((s) => s.name === name)
  if (!entry) return null
  let pending = loaded.get(name)
  if (!pending) {
    pending = entry.load().then((shelf) => {
      registerWorld(shelf.world)
      return shelf
    })
    loaded.set(name, pending)
  }
  return pending
}

/** Every shelf, in the sheet's order. */
export const loadShelves = (): Promise<Shelf[]> => Promise.all(SHELVES.map((s) => loadShelf(s.name)!))

/** One staged piece with what is said of it. */
export type Entry = [piece: Piece<any>, status: Status, note: string]

/** One beat of a new world, with the line said of it. Every one is new. */
export type Beat = [piece: Piece<any>, note: string]

/**
 * A stock world's shelf: its rail, its palettes, its backdrops and the
 * portal, its finale if it pays one out, and between them only the pieces
 * waiting to join it. One taste, even-handed, since every piece here is to
 * be seen.
 */
export function additions(stock: World, entries: readonly Entry[]): Shelf {
  const borrowed = (name: string) => stock.pieces.find((c) => c.name === name)!
  const finale = stock.pieces.filter((c) => c.finale)
  return {
    world: {
      name: `staged-${stock.name}`,
      label: stock.label,
      note: stock.note,
      themes: stock.themes,
      backdrops: stock.backdrops,
      tastes: { even: {} },
      pieces: [borrowed('rail'), ...entries.map(([piece]) => piece), ...finale, borrowed('portal')],
      own: entries.map(([piece]) => piece.name),
      staged: `waiting to join ${stock.label}`,
    },
    staged: Object.fromEntries(entries.map(([piece, status, note]) => [piece.name, { status, note }])),
  }
}

/** A new world's shelf: the world as it would stand in the loop, shown whole, rail and all. */
export function newWorld(world: World, notes: Record<string, string>): Shelf {
  const own = world.pieces.filter((c) => c.name !== 'portal').map((c) => c.name)
  return {
    world: { ...world, own, staged: 'a world not yet in the loop' },
    staged: Object.fromEntries(own.map((name) => [name, { status: 'new' as const, note: notes[name] ?? '' }])),
  }
}

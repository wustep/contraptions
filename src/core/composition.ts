import type p5 from 'p5'
import { ART_INSET, CANVAS, LOOP } from './constants'
import { layoutByName } from './layouts'
import { registry as classicRegistry } from '../contraptions'
import { registry as cascadeRegistry } from '../contraptions/cascade'
import { registry as workshopRegistry } from '../contraptions/workshop'
import { registry as circusRegistry } from '../contraptions/circus'
import { makeRng } from './rng'
import { themeByName, type Theme } from './themes'
import type { Cell, Contraption, Instance, Wire } from './types'
import { chainPaths, wireChain } from './wiring'
import { buildCascade } from '../worlds/goldberg/cascade'
import { buildWorkshop } from '../worlds/goldberg/workshop'
import { buildPorts, portsCatalog } from '../worlds/ports/build'
import { buildTracks, tracksCatalog } from '../worlds/tracks/build'

/**
 * A mode picks a catalog and a composer. That is the whole idea: three
 * Goldberg catalogs can share names (hopper, bell, lamp) because each lives
 * in its own folder, and each composer is the thesis of that catalog.
 *
 *   classic  — the original toys; independent machines, abstract wires
 *   ports    — tokens handed across typed edges (own world, own catalog)
 *   tracks   — balls circulating on a carved loop (own world, own catalog)
 *   cascade  — complete sentences that always end; leftovers stay closed
 *   workshop — shop lines that run east into a bin; leftovers do not emit
 *   circus   — looping acts that come back round; wire is the drumroll
 */
export type Mode = 'classic' | 'ports' | 'tracks' | 'cascade' | 'workshop' | 'circus'

/** How the grid of a catalog-mode is staffed and wired. */
export type Composer = 'classic' | 'cascade' | 'workshop' | 'circus'

export interface ModeInfo {
  name: Mode
  label: string
  note: string
  /** Which machine list the mode draws from. */
  catalog: 'classic' | 'ports' | 'tracks' | 'cascade' | 'workshop' | 'circus'
  /**
   * How the piece is composed. Ports, tracks, cascade and workshop are
   * their own worlds. Circus is a classic-like grid composer.
   */
  composer: 'ports' | 'tracks' | Composer
  /** Panel controls this mode actually uses. Hidden otherwise. */
  dials: { layout: boolean; spans: boolean; chains: boolean; pool: boolean }
}

const GRID_DIALS = { layout: true, spans: true, chains: true, pool: true } as const

export const MODES: ModeInfo[] = [
  {
    name: 'classic',
    label: 'Classic',
    note: 'independent machines, wired',
    catalog: 'classic',
    composer: 'classic',
    dials: GRID_DIALS,
  },
  {
    name: 'ports',
    label: 'Ports',
    note: 'tokens handed across edges',
    catalog: 'ports',
    composer: 'ports',
    dials: { layout: false, spans: false, chains: true, pool: false },
  },
  {
    name: 'tracks',
    label: 'Tracks',
    note: 'balls circulating on a track',
    catalog: 'tracks',
    composer: 'tracks',
    dials: { layout: false, spans: false, chains: false, pool: false },
  },
  {
    name: 'cascade',
    label: 'Cascade',
    note: 'sentences that always end; leftovers stay closed',
    catalog: 'cascade',
    composer: 'cascade',
    dials: GRID_DIALS,
  },
  {
    name: 'workshop',
    label: 'Workshop',
    note: 'shop lines east to a bin; leftovers do not emit',
    catalog: 'workshop',
    composer: 'workshop',
    dials: GRID_DIALS,
  },
  {
    name: 'circus',
    label: 'Circus',
    note: 'looping acts that come back round',
    catalog: 'circus',
    composer: 'circus',
    dials: GRID_DIALS,
  },
]

export const modeInfo = (mode: Mode): ModeInfo => MODES.find((m) => m.name === mode) ?? MODES[0]

/** The contraption list a catalog-mode composes from. Ports/tracks return []. */
export function catalogFor(mode: Mode): Contraption<unknown>[] {
  switch (mode) {
    case 'cascade':
      return cascadeRegistry
    case 'workshop':
      return workshopRegistry
    case 'circus':
      return circusRegistry
    case 'classic':
      return classicRegistry
    default:
      return []
  }
}

export const tagsFor = (mode: Mode): string[] =>
  [...new Set(catalogFor(mode).flatMap((c) => c.tags ?? []))].sort()

/** Something drawn over the whole piece, after the machines. */
export type Overlay = (p: p5, loopFrame: number, ctx: { theme: Theme; weight: (size: number) => number }) => void

/** One machine on the catalog sheet. Each mode lists its own. */
export interface CatalogEntry {
  contraption: Contraption<unknown>
  label: string
  sub: string
  /** Period in frames. Defaults to the contraption's, or the loop. */
  period?: number
  /** Phase in frames, on top of the sheet's stagger. */
  phase?: number
  /** Finish the state after `setup` — worlds attach their links here. */
  state?: (state: Record<string, unknown>, ctx: { color: string; theme: Theme }) => void
  /** Drawn over the sheet, for worlds whose balls are not drawn by the machine. */
  overlay?: (cell: Cell, ctx: { color: string }) => Overlay
}

export interface Options {
  seed: string
  theme: string
  layout: string
  mode: Mode
  /** Cells across the art area. */
  res: number
  /** Multiplier on the computed stroke weight. */
  stroke: number
  /** Restrict the piece to a single contraption, for inspection. */
  solo: string | null
  /** Restrict the pool to contraptions carrying this tag. */
  tag: string | null
  /** Show one labelled instance of every contraption instead of a composition. */
  catalog: boolean
  /** How eagerly to place multi-cell machines, 0..1. */
  spans: number
  /** How much of the grid to wire into firing chains, 0..1. */
  chains: number
}

export const defaultOptions: Options = {
  seed: '',
  theme: 'okazz',
  layout: 'grid',
  mode: 'classic',
  res: 15,
  stroke: 1,
  solo: null,
  tag: null,
  catalog: false,
  spans: 0.5,
  chains: 0.5,
}

export interface Caption {
  x: number
  /** Baseline of the name. The shelf rule sits just above it. */
  y: number
  text: string
  /** Second line: footprint and role. */
  sub: string
  size: number
  /** Width of the shelf rule the machine sits on. */
  rule: number
}

export interface Composition {
  options: Options
  theme: Theme
  cells: Cell[]
  instances: Instance[]
  /** Frames for the whole piece to return to its starting state. */
  loop: number
  /** Distinct contraptions actually used, by name. */
  used: string[]
  /** Captions under each machine, populated in catalog mode. */
  captions: Caption[]
  /** Single line across the top of the sheet, in catalog mode. */
  header: string | null
  /** Visible links between machines that fire in sequence. */
  wires: Wire[]
  /** Layers drawn over every machine — the circulating balls in tracks mode. */
  overlays: Overlay[]
}

/**
 * Base stroke weight for a cell. Tuned so a 15x15 grid on a 900px canvas lands
 * on 2px, matching the reference sketch, and stays legible as cells shrink.
 */
const strokeFor = (size: number, theme: Theme, mult: number): number =>
  Math.max(0.75, size * 0.037) * (theme.weight ?? 1) * mult

function pool(options: Options, catalog: Contraption<unknown>[]): Contraption<unknown>[] {
  if (options.solo) {
    const one = catalog.find((c) => c.name === options.solo)
    if (one) return [one]
  }
  if (options.tag) {
    const tagged = catalog.filter((c) => c.tags?.includes(options.tag!))
    if (tagged.length) return tagged
  }
  return catalog
}

/** One labelled instance of every machine in a grid catalog. */
const gridCatalog = (catalog: Contraption<unknown>[], mode: Mode): CatalogEntry[] =>
  catalog.map((c) => {
    const [w, h] = c.span ?? [1, 1]
    const footprint = w === 1 && h === 1 ? '' : `${w}×${h}`
    const unit = w === 1 && h === 1
    return {
      contraption: c,
      label: c.label ?? c.name,
      sub: [footprint, c.role].filter(Boolean).join(' · '),
      state:
        unit && mode === 'cascade'
          ? (state, { color }) => {
              state.flow = { in: null, out: null, color }
            }
          : unit && mode === 'workshop'
            ? (state, { color }) => {
                state.line = { in: false, out: false, color }
              }
            : undefined,
    }
  })

export function build(options: Options, canvas: number = CANVAS): Composition {
  const info = modeInfo(options.mode)
  if (options.catalog) {
    const entries =
      options.mode === 'ports'
        ? portsCatalog()
        : options.mode === 'tracks'
          ? tracksCatalog()
          : gridCatalog(catalogFor(options.mode), options.mode)
    return buildCatalog(options, canvas, entries, info.label)
  }
  if (options.mode === 'ports') return buildPorts(options, canvas)
  if (options.mode === 'tracks') return buildTracks(options, canvas)
  if (options.mode === 'cascade') return buildCascade(options, canvas)
  if (options.mode === 'workshop') return buildWorkshop(options, canvas)
  return buildGrid(options, canvas, catalogFor(options.mode), info.composer as Composer)
}

/**
 * Shared grid composer for Classic and Circus. Cascade and workshop have
 * their own worlds — leftover cells there must close, not sprinkle.
 */
function buildGrid(
  options: Options,
  canvas: number,
  catalog: Contraption<unknown>[],
  composer: Composer,
): Composition {
  const theme = themeByName(options.theme)
  const layout = layoutByName(options.layout)
  const rng = makeRng(options.seed)

  // Snap the art area to a whole number of cells so every cell edge, and so
  // every rail drawn on one, lands on a whole pixel. Fractional cell sizes are
  // what make a 2px line smear across three pixels.
  const area = Math.floor((canvas * ART_INSET) / options.res) * options.res
  const origin = Math.round((canvas - area) / 2)
  const cells = layout.build({
    x: origin,
    y: origin,
    area,
    res: options.res,
    rng: rng.fork('layout'),
  })

  const candidates = pool(options, catalog)
  const singles = candidates.filter((c) => !c.span || (c.span[0] === 1 && c.span[1] === 1))
  const spanning = candidates.filter((c) => c.span && (c.span[0] > 1 || c.span[1] > 1))

  const at = new Map<string, Cell>()
  const posKey = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`
  for (const cell of cells) at.set(posKey(cell.x, cell.y), cell)

  const claimed = new Set<Cell>()
  const instances: Instance[] = []

  const place = (contraption: Contraption<unknown>, cell: Cell, seed: string): Instance => {
    const cellRng = rng.fork(seed)
    const rotations = contraption.rotations ?? (cell.w === cell.h ? [0, 1, 2, 3] : [0, 2])
    const period = contraption.period ?? LOOP
    const phase = cellRng.int(0, period)
    const instance: Instance = {
      contraption,
      state: contraption.setup({
        rng: cellRng,
        size: cell.size,
        w: cell.w,
        h: cell.h,
        theme,
        cell,
        color: cellRng.pick(theme.colors),
      }),
      cell,
      angle: (cellRng.pick(rotations) * Math.PI) / 2,
      mirror: contraption.mirror === false ? 1 : cellRng.sign(),
      phase,
      period,
      fireFrame: Math.round(((contraption.fireAt ?? 0) * period - phase + LOOP * 4) % LOOP),
    }
    instances.push(instance)
    return instance
  }

  /**
   * Try to claim a w x h block of same-sized free cells with `anchor` at its
   * top-left. Layouts whose rows do not line up (bricks) simply fail here and
   * fall back to single-cell machines.
   */
  const claimBlock = (anchor: Cell, w: number, h: number): Cell[] | null => {
    const block: Cell[] = []
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const found = at.get(posKey(anchor.x + dx * anchor.size, anchor.y + dy * anchor.size))
        if (!found || found.size !== anchor.size || claimed.has(found)) return null
        block.push(found)
      }
    }
    return block
  }

  // Soloing a multi-cell machine leaves nothing for the second pass, so pack
  // the grid with it instead of sprinkling.
  // Circus lives in its multi-cell acts (cannon, ferris, big-top); give them
  // a little more room on the floor so the looping pieces actually show.
  const spanChance = singles.length === 0 ? 1 : options.spans * (composer === 'circus' ? 0.28 : 0.16)

  // Pass one: multi-cell machines, which need contiguous room.
  if (spanning.length) {
    for (const anchor of rng.fork('spans').shuffle(cells)) {
      if (claimed.has(anchor)) continue
      const spanRng = rng.fork(`span:${anchor.index}`)
      if (!spanRng.bool(spanChance)) continue
      const contraption = spanRng.weighted(spanning, (c) => c.weight ?? 1)
      const [w, h] = contraption.span!
      const block = claimBlock(anchor, w, h)
      if (!block) continue
      for (const c of block) claimed.add(c)
      const merged: Cell = {
        x: anchor.x + ((w - 1) * anchor.size) / 2,
        y: anchor.y + ((h - 1) * anchor.size) / 2,
        size: anchor.size,
        w: w * anchor.size,
        h: h * anchor.size,
        col: anchor.col,
        row: anchor.row,
        index: anchor.index,
        depth: anchor.depth,
      }
      place(contraption, merged, `cell:${anchor.index}`)
    }
  }

  // Pass two: reserve runs and staff them by role, so a chain reads as
  // source -> relay -> sink rather than as a line through whatever was next to
  // what. Roles are picked from the filtered pool, falling back to the whole
  // pool when a filter has emptied one (soloing a single machine, say).
  const wires: Wire[] = []
  const roleRng = rng.fork('roles')
  const byRole = (role: Contraption<unknown>['role']) => {
    const matching = singles.filter((c) => c.role === role && (c.period ?? LOOP) === LOOP)
    if (matching.length) return matching
    const anyRole = singles.filter((c) => c.role && (c.period ?? LOOP) === LOOP)
    return anyRole.length ? anyRole : singles
  }

  if (options.chains > 0 && singles.length) {
    const paths = chainPaths(cells, claimed, rng.fork('paths'), options.chains, 'any')
    for (const path of paths) {
      const members = path.map((cell, k) => {
        const role = k === 0 ? 'source' : k === path.length - 1 ? 'sink' : 'relay'
        const contraption = roleRng.weighted(byRole(role), (c) => c.weight ?? 1)
        return place(contraption, cell, `cell:${cell.index}`)
      })
      wires.push(...wireChain(members, rng.fork(`chain:${path[0].index}`)))
    }
  }

  // Pass three: everything else fills the leftovers.
  for (const cell of singles.length ? cells : []) {
    if (claimed.has(cell)) continue
    const cellRng = rng.fork(`pick:${cell.index}`)
    const contraption =
      singles.length === 1 ? singles[0] : cellRng.weighted(singles, (c) => c.weight ?? 1)
    place(contraption, cell, `cell:${cell.index}`)
  }

  return {
    options,
    theme,
    cells,
    instances,
    loop: LOOP,
    used: [...new Set(instances.map((i) => i.contraption.name))].sort(),
    captions: [],
    header: null,
    wires,
    overlays: [],
  }
}

/**
 * One labelled instance of every contraption, at rest orientation and zero
 * phase. This is the working view when you are building a new machine, and the
 * fastest way to see whether the set still hangs together as one language.
 */
/** Cell columns the catalog packs into. */
const CATALOG_COLS = 10

function buildCatalog(options: Options, canvas: number, entries: CatalogEntry[], modeLabel: string): Composition {
  const theme = themeByName(options.theme)
  const rng = makeRng(options.seed)

  // Shelf-pack the machines by footprint rather than dropping each into an
  // identical slot. A 2x2 shown at half scale so it fits a single-cell slot is
  // the one thing a catalog must not do — you cannot judge a machine you are
  // being shown smaller than it is drawn. Every machine here is at true
  // relative scale, and the big ones simply take the room they need. The
  // classic set sorts by size then name; a world's list is already in the
  // order its author wants it read.
  const areaOf = (e: CatalogEntry) => {
    const [w, h] = e.contraption.span ?? [1, 1]
    return w * h
  }
  const roleRank = (e: CatalogEntry) =>
    e.contraption.role === 'source' ? 0 : e.contraption.role === 'relay' ? 1 : e.contraption.role === 'sink' ? 2 : 3
  const ordered = [...entries].sort((a, b) => {
    const area = areaOf(b) - areaOf(a)
    if (area) return area
    if (options.mode === 'classic') return a.label.localeCompare(b.label)
    if (options.mode === 'ports' || options.mode === 'tracks') return 0
    return roleRank(a) - roleRank(b) || a.label.localeCompare(b.label)
  })

  type Shelf = { items: CatalogEntry[]; used: number; height: number }
  const shelves: Shelf[] = []
  let shelf: Shelf = { items: [], used: 0, height: 1 }
  for (const entry of ordered) {
    const [cw, ch] = entry.contraption.span ?? [1, 1]
    if (shelf.used + cw > CATALOG_COLS && shelf.items.length) {
      shelves.push(shelf)
      shelf = { items: [], used: 0, height: 1 }
    }
    shelf.items.push(entry)
    shelf.used += cw
    shelf.height = Math.max(shelf.height, ch)
  }
  if (shelf.items.length) shelves.push(shelf)

  const unitRows = shelves.reduce((sum, s) => sum + s.height, 0)
  const area = canvas * ART_INSET
  const headroom = canvas * 0.055
  // Caption block under every shelf, sized off the column width so it tracks
  // the drawing rather than the canvas. It has to clear two lines of type plus
  // its offset, or a tall machine on the next shelf grows up through it — a
  // 1x2 reaches a full two units above its own shelf line.
  const byWidth = area / CATALOG_COLS
  const capBlock = byWidth * 0.62
  const byHeight = (canvas - headroom - canvas * 0.03 - shelves.length * capBlock) / unitRows
  const unit = Math.min(byWidth, byHeight)
  const cap = Math.min(capBlock, unit * 0.68)
  const type = Math.max(7.5, unit * 0.125)

  const blockH = unitRows * unit + shelves.length * cap
  const originY = headroom + (canvas - headroom - blockH) / 2

  const cells: Cell[] = []
  const captions: Caption[] = []
  const instances: Instance[] = []
  const overlays: Overlay[] = []
  let index = 0
  let y = originY

  for (const [row, current] of shelves.entries()) {
    const usedWidth = current.items.reduce((sum, e) => sum + (e.contraption.span ?? [1, 1])[0], 0)
    // Centre each shelf so a short last row does not hang off to one side.
    let x = (canvas - usedWidth * unit) / 2
    const shelfLine = y + current.height * unit

    for (const [col, entry] of current.items.entries()) {
      const { contraption } = entry
      const [cw, ch] = contraption.span ?? [1, 1]
      const w = cw * unit
      const h = ch * unit
      // Machines stand on the shelf line whatever their height.
      const cell: Cell = {
        x: x + w / 2,
        y: shelfLine - h / 2,
        size: unit,
        w,
        h,
        col,
        row,
        index,
        depth: 0,
      }
      cells.push(cell)

      captions.push({
        x: cell.x,
        y: shelfLine + cap * 0.28,
        text: entry.label,
        sub: entry.sub,
        size: type,
        rule: w * 0.9,
      })

      const period = entry.period ?? contraption.period ?? LOOP
      const cellRng = rng.fork(`catalog:${entry.label}`)
      const color = cellRng.pick(theme.colors)
      const state = contraption.setup({ rng: cellRng, size: unit, w, h, theme, cell, color }) as Record<string, unknown>
      entry.state?.(state, { color, theme })
      // Stagger the phases. At phase 0 most machines sit at a turning point
      // and the whole sheet reads as frozen, which is the opposite of useful.
      // Worlds whose balls are drawn by an overlay keep phase 0, so the
      // machine and its ball agree on the clock.
      const stagger = entry.overlay ? 0 : Math.round((index * 0.137 + 0.21) * period)
      instances.push({
        contraption,
        state,
        cell,
        angle: 0,
        mirror: 1,
        phase: (((stagger + (entry.phase ?? 0)) % period) + period) % period,
        period,
        fireFrame: 0,
      })
      if (entry.overlay) overlays.push(entry.overlay(cell, { color }))

      x += w
      index++
    }

    y = shelfLine + cap
  }

  // The sheet's loop must hold every period on it.
  const loop = instances.reduce((l, i) => lcm(l, i.period), 1)

  return {
    options,
    theme,
    cells,
    instances,
    loop,
    used: [...new Set(entries.map((e) => e.contraption.name))].sort(),
    captions,
    header: `${entries.length} contraptions · ${modeLabel} · ${theme.label}`,
    wires: [],
    overlays,
  }
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const lcm = (a: number, b: number) => (a * b) / gcd(a, b)

export const strokeWeight = strokeFor

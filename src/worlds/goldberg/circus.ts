import { registry as circusRegistry } from '../../contraptions/circus'
import { clampRes, type Composition, type Options } from '../../core/composition'
import { ART_INSET, LOOP } from '../../core/constants'
import { makeRng } from '../../core/rng'
import { themeByName } from '../../core/themes'
import type { Cell, Contraption, Instance, Wire } from '../../core/types'
import { chainPaths, wireChain } from '../../core/wiring'

/**
 * The circus world. Every cell is an act, and every act is a closed loop: a
 * performer that leaves a tower comes back to it before the loop is out, so
 * nothing is ever handed across a cell edge. That is what lets the programme
 * fill the frame instead of threading a one-cell-wide snake through it.
 *
 * The floor is the composer's own uniform grid — the layout dial is hidden for
 * this mode — built at `clampRes('circus', res)` so a cell is never smaller
 * than an act can be read at. Big acts claim their blocks first, every
 * remaining cell gets a small act, and then the drumroll is wired through the
 * small ones: source -> relay* -> sink, `LINK_DELAY` apart. Acts left out of a
 * chain free-run on their own phase, which is what `chains` trades away.
 */

const key = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`

const isUnit = (c: Contraption<unknown>): boolean => !c.span || (c.span[0] === 1 && c.span[1] === 1)

/** Solo and tag narrow the programme; an empty result falls back to the whole set. */
function billing(options: Options): Contraption<unknown>[] {
  if (options.solo) {
    const one = circusRegistry.find((c) => c.name === options.solo)
    if (one) return [one]
  }
  if (options.tag) {
    const tagged = circusRegistry.filter((c) => c.tags?.includes(options.tag!))
    if (tagged.length) return tagged
  }
  return circusRegistry
}

export function buildCircus(options: Options, canvas: number): Composition {
  const theme = themeByName(options.theme)
  const rng = makeRng(options.seed)
  const across = clampRes('circus', options.res)

  // Snap the art area to a whole number of cells so every cell edge, and so
  // every ground line drawn on one, lands on a whole pixel. One unit for the
  // whole ring: `Composition.unit` gives the piece a single pen.
  const area = Math.floor((canvas * ART_INSET) / across) * across
  const unit = area / across
  const origin = Math.round((canvas - area) / 2)

  const cells: Cell[] = []
  const at = new Map<string, Cell>()
  for (let col = 0; col < across; col++) {
    for (let row = 0; row < across; row++) {
      const cell: Cell = {
        x: origin + col * unit + unit / 2,
        y: origin + row * unit + unit / 2,
        size: unit,
        w: unit,
        h: unit,
        col,
        row,
        index: col * across + row,
        depth: 0,
      }
      cells.push(cell)
      at.set(key(cell.x, cell.y), cell)
    }
  }

  const pool = billing(options)
  const singles = pool.filter(isUnit)
  const spanning = pool.filter((c) => !isUnit(c))
  const claimed = new Set<Cell>()
  const instances: Instance[] = []

  const place = (contraption: Contraption<unknown>, cell: Cell, seed: string): Instance => {
    const cellRng = rng.fork(seed)
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
      // Gravity points the same way in every cell, so acts declare
      // `rotations: [0]` and stand up; the default here is upright too.
      angle: (cellRng.pick(contraption.rotations ?? [0]) * Math.PI) / 2,
      mirror: contraption.mirror === false ? 1 : cellRng.sign(),
      phase,
      period,
      fireFrame: Math.round(((contraption.fireAt ?? 0) * period - phase + LOOP * 4) % LOOP),
    }
    instances.push(instance)
    return instance
  }

  /** A w x h block of free cells with `anchor` at its top-left, or nothing. */
  const claimBlock = (anchor: Cell, w: number, h: number): Cell[] | null => {
    const block: Cell[] = []
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const found = at.get(key(anchor.x + dx * unit, anchor.y + dy * unit))
        if (!found || claimed.has(found)) return null
        block.push(found)
      }
    }
    return block
  }

  // Pass one: the big acts, which need contiguous room. `spans` is a budget in
  // cells rather than a coin flip per cell, so the dial means the same thing at
  // res 4 as at res 7 — how much of the floor the big acts take. Soloing a big
  // act leaves nothing for the small pass, so it packs the grid instead.
  const total = across * across
  const budget = singles.length
    ? Math.round(total * Math.min(0.85, 0.1 + 0.45 * Math.max(0, options.spans)))
    : total
  let taken = 0
  if (spanning.length) {
    for (const anchor of rng.fork('spans').shuffle(cells)) {
      if (taken >= budget) break
      if (claimed.has(anchor)) continue
      const spanRng = rng.fork(`span:${anchor.index}`)
      const contraption = spanRng.weighted(spanning, (c) => c.weight ?? 1)
      const [w, h] = contraption.span!
      const block = claimBlock(anchor, w, h)
      if (!block) continue
      for (const cell of block) claimed.add(cell)
      taken += w * h
      place(
        contraption,
        {
          x: anchor.x + ((w - 1) * unit) / 2,
          y: anchor.y + ((h - 1) * unit) / 2,
          size: unit,
          w: w * unit,
          h: h * unit,
          col: anchor.col,
          row: anchor.row,
          index: anchor.index,
          depth: 0,
        },
        `cell:${anchor.index}`,
      )
    }
  }

  // Pass two: the drumroll. Runs of free cells are reserved and staffed by
  // role, so a chain reads as source -> relay* -> sink rather than as a line
  // drawn through whatever happened to be next to what.
  const wires: Wire[] = []
  const roleRng = rng.fork('roles')
  const byRole = (role: Contraption<unknown>['role']) => {
    const matching = singles.filter((c) => c.role === role && (c.period ?? LOOP) === LOOP)
    if (matching.length) return matching
    const anyRole = singles.filter((c) => c.role && (c.period ?? LOOP) === LOOP)
    return anyRole.length ? anyRole : singles
  }

  if (options.chains > 0 && singles.length) {
    for (const path of chainPaths(cells, claimed, rng.fork('paths'), options.chains, 'any')) {
      const members = path.map((cell, k) => {
        const role = k === 0 ? 'source' : k === path.length - 1 ? 'sink' : 'relay'
        const contraption = roleRng.weighted(byRole(role), (c) => c.weight ?? 1)
        return place(contraption, cell, `cell:${cell.index}`)
      })
      wires.push(...wireChain(members, rng.fork(`chain:${path[0].index}`)))
    }
  }

  // Pass three: every cell that is left gets a small act of its own, running
  // on its own phase. No leftovers and no rim — an empty cell in a programme
  // is a gap in the bill.
  if (singles.length) {
    for (const cell of cells) {
      if (claimed.has(cell)) continue
      claimed.add(cell)
      const cellRng = rng.fork(`pick:${cell.index}`)
      const contraption =
        singles.length === 1 ? singles[0] : cellRng.weighted(singles, (c) => c.weight ?? 1)
      place(contraption, cell, `cell:${cell.index}`)
    }
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
    // The conduit is a centre-to-centre line; on a floor this full it runs
    // straight through the act it is meant to be cueing. The drumroll reads
    // from the acts themselves, firing a beat apart along the chain.
    showWires: false,
    unit,
  }
}

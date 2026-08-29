import { registry as cascadeRegistry } from '../../contraptions/cascade'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Contraption, Instance, Side } from '../../core/types'
import { sideOf, wireCascade } from '../../core/wiring'
import { budgetRuns, coverRuns, finish, leftoverCells, openFloor, placeSpans } from './staff'

/** Leftover cells that still draw a travelling token or a nozzle to the edge. */
const QUIET = new Set(['bell', 'lamp', 'flag'])

/**
 * Cascade world. The classic sprinkle composer left most cells unchained, and
 * an unchained cascade machine draws its own token rolling off the cell edge.
 * That is the leak: leftovers dump, and a cup on the rim dumps off-frame.
 *
 * Here every leftover cell is either on a complete sentence (source → relay*
 * → sink, never climbing) or sealed with a closed `flow` so `rollOut` /
 * `rollIn` / `fallIn` hide the token. The cup only dumps when the run
 * actually continues south.
 */
export function buildCascade(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, cascadeRegistry)
  // Spans punch holes that leftover flags then fill. Sentences take the
  // whole floor; strip / switchback / cradle stay on the catalog sheet.
  if (floor.singles.length === 0) placeSpans(floor, 1)

  const leftover = leftoverCells(floor)
  const runs = coverRuns(leftover, floor.rng.fork('paths'), true)
  const { keep, singles } = budgetRuns(runs, leftover.length, options.chains)
  const roleRng = floor.rng.fork('roles')
  const wires = []

  const pick = (role: Contraption<unknown>['role'], inSide: Side | null, outSide: Side | null) => {
    const chainable = floor.singles.filter((c) => c.role && (c.period ?? LOOP) === LOOP)
    const fits = (c: Contraption<unknown>) =>
      (!inSide || !c.inlets || c.inlets.includes(inSide)) &&
      (!outSide || !c.outlets || c.outlets.includes(outSide))
    for (const next of [
      chainable.filter((c) => c.role === role && fits(c)),
      chainable.filter((c) => c.role === role),
      chainable.filter(fits),
      chainable,
    ]) {
      if (next.length) return roleRng.weighted(next, (c) => c.weight ?? 1)
    }
    return roleRng.weighted(floor.singles, (c) => c.weight ?? 1)
  }

  for (const path of keep) {
    for (const cell of path) floor.claimed.add(cell)
    const members: Instance[] = path.map((cell, k) => {
      const role = k === 0 ? 'source' : k === path.length - 1 ? 'sink' : 'relay'
      const inSide = k > 0 ? sideOf(cell, path[k - 1]) : null
      const outSide = k < path.length - 1 ? sideOf(cell, path[k + 1]) : null
      return floor.place(pick(role, inSide, outSide), cell, `cell:${cell.index}`)
    })
    wires.push(...wireCascade(members, floor.rng.fork(`chain:${path[0].index}`)))
  }

  const closed = floor.singles.filter((c) => c.role === 'sink')
  const notSource = floor.singles.filter((c) => c.role !== 'source')
  const quiet = floor.singles.filter((c) => QUIET.has(c.name))
  const leftoverPool = quiet.length ? quiet : closed.length ? closed : notSource.length ? notSource : floor.singles

  for (const cell of singles) {
    floor.claimed.add(cell)
    const cellRng = floor.rng.fork(`pick:${cell.index}`)
    const contraption = leftoverPool.length === 1 ? leftoverPool[0] : cellRng.weighted(leftoverPool, (c) => c.weight ?? 1)
    const inst = floor.place(contraption, cell, `cell:${cell.index}`)
    inst.angle = 0
    inst.mirror = 1
    const color = (inst.state as { color?: string }).color ?? cellRng.pick(floor.theme.colors)
    if (inst.state && typeof inst.state === 'object') {
      ;(inst.state as { flow?: { in: null; out: null; color: string } }).flow = { in: null, out: null, color }
    }
  }

  for (const inst of floor.instances) {
    const [w, h] = inst.contraption.span ?? [1, 1]
    if (w !== 1 || h !== 1) continue
    if (!(inst.state as { flow?: unknown }).flow && inst.state && typeof inst.state === 'object') {
      const color = (inst.state as { color?: string }).color ?? floor.theme.ink
      ;(inst.state as { flow?: { in: null; out: null; color: string } }).flow = { in: null, out: null, color }
    }
  }

  return finish(options, floor, wires)
}

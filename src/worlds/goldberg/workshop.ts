import { registry as workshopRegistry } from '../../contraptions/workshop'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Line } from '../../contraptions/workshop/shop'
import type { Cell, Contraption } from '../../core/types'
import { budgetRuns, finish, leftoverCells, openFloor, placeSpans } from './staff'

/**
 * Workshop world. The classic composer staffed leftovers at random and treated
 * press / punch / saw as sinks, so a "line" often ended by rolling a part off
 * the east rim. Machines never read `flow`, and every hopper independently
 * sent a blank east past the cell edge.
 *
 * Here leftover cells are grouped into eastbound rows of equal-size neighbours.
 * A shop line is feeder → stations → a real ending (bin, bell, lamp). Every
 * 1×1 bench gets a `line` so a part holds at centre when there is no east
 * neighbour and never enters from the west when there is no west neighbour.
 * Classic wires are not used: travel times do not match `fireAt` beads.
 */

const ENDINGS = new Set(['bin', 'bell', 'lamp'])
/** Feeders that actually put a blank on the bench and send it east. */
const FEEDERS = new Set(['hopper', 'hoist', 'tipper'])
/**
 * Stations that keep the part on the bench. Lift / auger / chute change
 * height; divert dumps through the floor; an arm opens a gap. Any of those
 * on a shop line reads as a dead end even when `line.out` is true.
 */
const STATIONS = new Set(['belt', 'mill', 'press', 'punch', 'saw', 'scale', 'dip', 'latch', 'counter'])

function eastRows(cells: Cell[]): Cell[][] {
  const groups = new Map<string, Cell[]>()
  for (const cell of cells) {
    const key = `${Math.round(cell.y)}|${Math.round(cell.size * 1000)}`
    const g = groups.get(key) ?? []
    g.push(cell)
    groups.set(key, g)
  }
  const rows: Cell[][] = []
  for (const group of groups.values()) {
    group.sort((a, b) => a.x - b.x)
    let cur: Cell[] = [group[0]]
    for (let i = 1; i < group.length; i++) {
      if (Math.abs(group[i].x - cur[cur.length - 1].x - group[i].size) < 1) cur.push(group[i])
      else {
        rows.push(cur)
        cur = [group[i]]
      }
    }
    rows.push(cur)
  }
  return rows
}

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

export function buildWorkshop(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, workshopRegistry, { mirror: false })
  // Spans punch holes in eastbound rows. A line / gantry on the rim also
  // dumps a part off the art. Shop lines take the whole floor; spans stay
  // on the catalog sheet.
  if (floor.singles.length === 0) placeSpans(floor, 1)

  const leftover = leftoverCells(floor)
  const { keep, singles } = budgetRuns(eastRows(leftover), leftover.length, options.chains)
  const roleRng = floor.rng.fork('roles')

  const feeders = named(floor.singles, FEEDERS)
  const endings = named(floor.singles, ENDINGS)
  const stations = named(floor.singles, STATIONS)

  const from = (want: Contraption<unknown>[], fallback: Contraption<unknown>[]) => {
    if (want.length) return want
    if (fallback.length) return fallback
    return floor.singles
  }

  const staff = (cells: Cell[]) => {
    if (!floor.singles.length) return
    const color = floor.rng.fork(`line:${cells[0].index}`).pick(floor.theme.colors)
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      floor.claimed.add(cell)
      const first = i === 0
      const last = i === cells.length - 1
      const pool =
        last || cells.length === 1
          ? from(endings, floor.singles.filter((c) => c.role === 'sink'))
          : first
            ? from(feeders, floor.singles)
            : from(stations, floor.singles)
      const contraption = roleRng.weighted(pool, (c) => c.weight ?? 1)
      const line: Line = { in: !first && cells.length > 1, out: !last, color }
      const inst = floor.place(contraption, cell, `cell:${cell.index}`, { line })
      inst.mirror = 1
      inst.angle = 0
      inst.phase = 0
      inst.fireFrame = Math.round(((contraption.fireAt ?? 0) * inst.period + LOOP * 4) % LOOP)
    }
  }

  for (const row of keep) staff(row)
  for (const cell of singles) staff([cell])

  for (const inst of floor.instances) {
    const [w, h] = inst.contraption.span ?? [1, 1]
    if (w !== 1 || h !== 1) continue
    if ((inst.state as { line?: Line }).line) continue
    if (inst.state && typeof inst.state === 'object') {
      const color = (inst.state as { color?: string }).color ?? floor.theme.ink
      ;(inst.state as { line?: Line }).line = { in: false, out: false, color }
    }
  }

  return finish(options, floor, [])
}

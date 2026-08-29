import { registry as workshopRegistry } from '../../contraptions/workshop'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Line } from '../../contraptions/workshop/shop'
import type { Contraption } from '../../core/types'
import { finish, leftoverCells, openFloor, placeSpans, snakeRows, staffedBlock } from './staff'

const ENDINGS = new Set(['bin', 'bell', 'lamp'])
const FEEDERS = new Set(['hopper', 'hoist', 'tipper'])
const DROPS = new Set(['spill'])
const CATCHES = new Set(['hopper'])
const STATIONS = new Set(['belt', 'mill', 'punch', 'saw', 'latch', 'counter'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

/**
 * Workshop world. Parallel shop lines with skip-row bands read as five
 * unfinished benches. Here a contiguous block is snaked: east, spill south,
 * west, spill, east, into one bin / bell / lamp. One colour, one pulse.
 * Unused cells stay empty.
 */
export function buildWorkshop(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, workshopRegistry, { mirror: false })
  if (floor.singles.length === 0) placeSpans(floor, 1)

  const density = Math.max(0, Math.min(1, options.chains))
  const rows = staffedBlock(leftoverCells(floor), options, density)
  const path = snakeRows(rows)

  const roleRng = floor.rng.fork('roles')
  const feeders = named(floor.singles, FEEDERS)
  const endings = named(floor.singles, ENDINGS)
  const drops = named(floor.singles, DROPS)
  const catches = named(floor.singles, CATCHES)
  const stations = named(floor.singles, STATIONS)

  const from = (want: Contraption<unknown>[], fallback: Contraption<unknown>[]) => {
    if (want.length) return want
    if (fallback.length) return fallback
    return floor.singles
  }

  if (!path.length) return finish(options, floor, [])

  const color = floor.rng.fork(`line:${path[0].index}`).pick(floor.theme.colors)

  for (let i = 0; i < path.length; i++) {
    const cell = path[i]
    floor.claimed.add(cell)
    const prev = path[i - 1]
    const next = path[i + 1]
    const dropping = !!next && next.y > cell.y + cell.size * 0.4
    const catching = !!prev && prev.y < cell.y - cell.size * 0.4
    const first = i === 0
    const last = i === path.length - 1
    const along = next && Math.abs(next.y - cell.y) < 1 ? (next.x > cell.x ? 1 : -1) : prev && Math.abs(prev.y - cell.y) < 1 ? (cell.x > prev.x ? 1 : -1) : 1
    const pool = last
      ? from(endings, floor.singles.filter((c) => c.role === 'sink'))
      : first
        ? from(feeders, floor.singles)
        : dropping
          ? from(drops, endings)
          : catching
            ? from(catches, feeders)
            : from(stations, floor.singles)
    const contraption = roleRng.weighted(pool, (c) => c.weight ?? 1)
    const line: Line = {
      in: !first || catching,
      out: !last,
      color,
      along,
      drop: dropping,
      catch: catching,
    }
    const inst = floor.place(contraption, cell, `cell:${cell.index}`, { line })
    inst.mirror = along
    inst.angle = 0
    inst.phase = 0
    inst.fireFrame = Math.round(((contraption.fireAt ?? 0) * inst.period + i * 8 + LOOP * 4) % LOOP)
  }

  return finish(options, floor, [])
}

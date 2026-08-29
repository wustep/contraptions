import { registry as workshopRegistry } from '../../contraptions/workshop'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Line } from '../../contraptions/workshop/shop'
import type { Contraption } from '../../core/types'
import { finish, leftoverCells, openFloor, placeSpans, staffedRows } from './staff'

/**
 * Workshop world. Staffing every leftover cell packed the floor with floating
 * bells and lamps, and every row ran to the art edge. A bin still received
 * on a high shelf while the belt arrived on the bench, so the handoff was a
 * gap.
 *
 * High res keeps a one-cell inset and skips a row. Low res uses the whole
 * leftover grid but still skips a row, so mill gears and bells do not
 * crowd the belt above. Interior equal-size neighbours become eastbound
 * shop lines: feeder → bench stations → a real ending. Unused cells get
 * no machine. Terminator drawings (bin / bell / lamp) sit on the bench
 * and stop it; they do not hang between rows.
 */

const ENDINGS = new Set(['bin', 'bell', 'lamp'])
/** Feeders that put a blank on the bench and send it east. */
const FEEDERS = new Set(['hopper', 'hoist', 'tipper'])
/**
 * Stations that keep the part on the bench and stay inside the cell.
 * Press / scale / dip reach the row above; lift / auger / chute / divert /
 * arm change height or open a gap.
 */
const STATIONS = new Set(['belt', 'mill', 'punch', 'saw', 'latch', 'counter'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

export function buildWorkshop(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, workshopRegistry, { mirror: false })
  if (floor.singles.length === 0) placeSpans(floor, 1)

  const density = Math.max(0, Math.min(1, options.chains))
  // Skip a row even at low res: bells and mill gears were crowding the belt
  // of the line above when every leftover row was staffed.
  const keep = staffedRows(leftoverCells(floor), options, density, { skipFrom: 8 })

  const roleRng = floor.rng.fork('roles')
  const feeders = named(floor.singles, FEEDERS)
  const endings = named(floor.singles, ENDINGS)
  const stations = named(floor.singles, STATIONS)

  const from = (want: Contraption<unknown>[], fallback: Contraption<unknown>[]) => {
    if (want.length) return want
    if (fallback.length) return fallback
    return floor.singles
  }

  for (const cells of keep) {
    const color = floor.rng.fork(`line:${cells[0].index}`).pick(floor.theme.colors)
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      floor.claimed.add(cell)
      const first = i === 0
      const last = i === cells.length - 1
      const pool = last
        ? from(endings, floor.singles.filter((c) => c.role === 'sink'))
        : first
          ? from(feeders, floor.singles)
          : from(stations, floor.singles)
      const contraption = roleRng.weighted(pool, (c) => c.weight ?? 1)
      const line: Line = { in: !first, out: !last, color }
      const inst = floor.place(contraption, cell, `cell:${cell.index}`, { line })
      inst.mirror = 1
      inst.angle = 0
      inst.phase = 0
      inst.fireFrame = Math.round(((contraption.fireAt ?? 0) * inst.period + LOOP * 4) % LOOP)
    }
  }

  return finish(options, floor, [])
}

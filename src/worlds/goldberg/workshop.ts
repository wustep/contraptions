import { registry as workshopRegistry } from '../../contraptions/workshop'
import type { Line } from '../../contraptions/workshop/shop'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Contraption } from '../../core/types'
import { finish, leftoverCells, openFloor, placeSpans, snakeRows, staffedBlock } from './staff'

const ENDINGS = new Set(['bin', 'bell', 'lamp'])
const FEEDERS = new Set(['hopper', 'hoist', 'tipper'])
const DROPS = new Set(['elevator'])
const CATCHES = new Set(['well'])
const STATIONS = new Set(['belt', 'mill', 'punch', 'saw', 'latch', 'counter'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

const south = (a: { y: number; size: number; x: number }, b: { y: number; size: number; x: number }) =>
  b.y > a.y + a.size * 0.4 && Math.abs(b.x - a.x) < 1

/**
 * Workshop world. A contiguous block is snaked: east, elevator south, west,
 * elevator, east, into one bin / bell / lamp. Starts, turns, and ends sit
 * inset from the art edge so a part is always in a machine, never gone
 * because the canvas ended. One colour, one pulse. Unused cells stay empty.
 */
export function buildWorkshop(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, workshopRegistry, { mirror: false })
  if (floor.singles.length === 0) placeSpans(floor, 1)

  const density = Math.max(0, Math.min(1, options.chains))
  const rows = staffedBlock(leftoverCells(floor), options, density, { inset: true })
  const path = snakeRows(rows)

  const roleRng = floor.rng.fork('roles')
  const feeders = named(floor.singles, FEEDERS)
  const endings = named(floor.singles, ENDINGS)
  const drops = named(floor.singles, DROPS)
  const catches = named(floor.singles, CATCHES)
  const stations = named(floor.singles, STATIONS)
  const bins = named(floor.singles, new Set(['bin']))

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
    const along =
      next && Math.abs(next.y - cell.y) < 1
        ? next.x > cell.x
          ? 1
          : -1
        : prev && Math.abs(prev.y - cell.y) < 1
          ? cell.x > prev.x
            ? 1
            : -1
          : 1
    const pool = last
      ? from(catching ? bins : endings, floor.singles.filter((c) => c.role === 'sink'))
      : dropping && !first
        ? from(drops, endings)
        : first
          ? from(feeders, floor.singles)
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

  for (let i = 0; i < path.length; i++) {
    let end = i
    while (end + 1 < path.length && south(path[end], path[end + 1])) end++
    if (end > i) {
      const floors = end - i
      for (let k = i; k <= end; k++) {
        const inst = floor.instances.find((m) => m.cell === path[k])
        const line = inst && (inst.state as { line?: Line }).line
        if (line) line.ride = { index: k - i, floors }
      }
    }
    i = end
  }

  return finish(options, floor, [])
}

import { registry as workshopRegistry } from '../../contraptions/workshop'
import type { Line } from '../../contraptions/workshop/shop'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Cell, Contraption } from '../../core/types'
import { finish, openFloor, placeSpans, programmeBand, snakeRows, type Floor } from './staff'

const ENDINGS = new Set(['bin', 'bell', 'lamp'])
const FEEDERS = new Set(['hopper', 'hoist', 'tipper'])
const DROPS = new Set(['elevator'])
const CATCHES = new Set(['well'])
/**
 * What can stand mid-line. Six benches over thirteen courses read as
 * wallpaper — the same belt, the same square, thirteen times. Everything
 * here works on a part where it stands and hands it on. The machines that
 * move a part somewhere else — the lift, the elevator, the chute, the auger,
 * the well, the arm, the divert, the spill — belong only where the line
 * actually steps; mid-line they reach into the course below and put the part
 * down on nothing.
 */
const STATIONS = new Set([
  'belt', 'mill', 'punch', 'saw', 'latch', 'counter',
  'press', 'dip', 'scale', 'geneva',
])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

const south = (a: Cell, b: Cell) => b.y > a.y + a.size * 0.4 && Math.abs(b.x - a.x) < 1

/**
 * Staff one shop line: a feeder, benches along the belt, an elevator wherever
 * the line steps south, and an ending that stops it. Every placed bench gets
 * a `line`, so a part is always in a machine — never gone because the run ran
 * out of floor.
 */
function staffLine(floor: Floor, path: Cell[], seed: string): void {
  if (path.length < 2) return
  const roleRng = floor.rng.fork(`roles:${seed}`)
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

  const color = floor.rng.fork(`line:${seed}`).pick(floor.theme.colors)

  for (let i = 0; i < path.length; i++) {
    const cell = path[i]
    floor.claimed.add(cell)
    const prev = path[i - 1]
    const next = path[i + 1]
    const dropping = !!next && south(cell, next)
    const catching = !!prev && south(prev, cell)
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

  // Tell each cell of a shaft which floor it is, so the car is one car.
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
}

/**
 * Workshop world. One shop floor, every course of it working. The `chains`
 * dial says how much of the floor is a single line: a centred band is snaked
 * — east, elevator south, west, elevator, east — into one bin, bell or lamp,
 * and every course outside the band is its own line with its own feeder and
 * its own ending. One colour per line, one pulse. Machines never mirror
 * except along their line, and classic wires are not used: travel times do
 * not match `fireAt` beads.
 */
export function buildWorkshop(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, workshopRegistry, { mirror: false })
  if (floor.singles.length === 0) {
    placeSpans(floor, 1)
    return finish(options, floor, [])
  }

  const { band, rest } = programmeBand(floor.rows, options.chains)
  if (band.length) staffLine(floor, snakeRows(band), `line:${band[0][0].index}`)
  for (const row of rest) staffLine(floor, row, `row:${row[0].index}`)

  return finish(options, floor, [])
}

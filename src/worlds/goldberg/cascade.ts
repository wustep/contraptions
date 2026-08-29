import { registry as cascadeRegistry } from '../../contraptions/cascade'
import { FLOOR, SHAFT } from '../../contraptions/cascade/parts'
import type { Composition, Options, Overlay } from '../../core/composition'
import type { Contraption, Instance } from '../../core/types'
import { wireCascade } from '../../core/wiring'
import { finish, leftoverCells, openFloor, placeSpans, snakeRows, staffedBlock } from './staff'

const ENDINGS = new Set(['bell', 'lamp', 'flag', 'toaster', 'balloon', 'jack'])
const FEEDERS = new Set(['hopper', 'knocker', 'tipper', 'fuse'])
const DROPS = new Set(['cup'])
const CATCHES = new Set(['bellows'])
const STATIONS = new Set(['belt', 'bellows', 'counter', 'dominoes', 'flap', 'paddle', 'seesaw'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

/**
 * Cascade world. Parallel eastbound rows read as five machines. Here a
 * contiguous block is staffed and snaked: east, drop south, west, drop,
 * east, into one sink. Unused cells stay empty. Wires set fire times
 * but are not drawn — each machine draws its own rail so ports meet.
 */
export function buildCascade(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, cascadeRegistry)
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

  const pick = (pool: Contraption<unknown>[]) => roleRng.weighted(from(pool, floor.singles), (c) => c.weight ?? 1)

  if (!path.length) return finish(options, floor, [], [], { showWires: false })

  for (const cell of path) floor.claimed.add(cell)

  const members: Instance[] = path.map((cell, k) => {
    const prev = path[k - 1]
    const next = path[k + 1]
    const dropping = !!next && next.y > cell.y + cell.size * 0.4
    const catching = !!prev && prev.y < cell.y - cell.size * 0.4
    const first = k === 0
    const last = k === path.length - 1
    const pool = last
      ? from(endings, floor.singles.filter((c) => c.role === 'sink'))
      : first
        ? from(feeders, floor.singles.filter((c) => c.role === 'source'))
        : dropping
          ? from(drops, from(endings, floor.singles))
          : catching
            ? from(catches, stations)
            : from(stations, floor.singles.filter((c) => c.role === 'relay'))
    return floor.place(pick(pool), cell, `cell:${cell.index}`)
  })

  const wires = wireCascade(members, floor.rng.fork(`chain:${path[0].index}`))
  const color = (members[0].state as { flow?: { color?: string } }).flow?.color ?? floor.theme.colors[0]
  const shafts: Overlay = (p, _, { theme, weight }) => {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]
      const b = path[i + 1]
      if (b.y <= a.y + a.size * 0.4 || Math.abs(b.x - a.x) > 1) continue
      const top = a.y + FLOOR * a.size
      const bot = b.y + FLOOR * b.size
      const mid = (top + bot) / 2
      p.push()
      p.rectMode(p.CENTER)
      p.noStroke()
      p.fill(color)
      p.rect(a.x, mid, a.size * SHAFT * 1.6, bot - top)
      p.stroke(theme.ink)
      p.strokeWeight(weight(a.size))
      p.noFill()
      p.line(a.x - SHAFT * a.size, top, a.x - SHAFT * a.size, bot)
      p.line(a.x + SHAFT * a.size, top, a.x + SHAFT * a.size, bot)
      p.pop()
    }
  }
  return finish(options, floor, wires, [shafts], { showWires: false })
}

import { registry as cascadeRegistry } from '../../contraptions/cascade'
import type { Composition, Options } from '../../core/composition'
import type { Contraption, Instance } from '../../core/types'
import { wireCascade } from '../../core/wiring'
import { eastRows, finish, insetRing, leftoverCells, openFloor, placeSpans } from './staff'

/**
 * Sinks that actually receive the ball. A flag / bell / cup at the end of an
 * inset row is the terminator; leftover bells scattered in empty cells were
 * the pile-of-parts read.
 */
const ENDINGS = new Set(['bell', 'lamp', 'flag', 'cup', 'toaster', 'balloon', 'jack'])
/** Feeders that put a ball on the bench and send it east. */
const FEEDERS = new Set(['hopper', 'knocker', 'tipper', 'fuse'])
/**
 * Stations that keep the ball on the bench. A south outlet is allowed on the
 * machine but the composer never writes one — cups then cannot pour into an
 * empty cell below.
 */
const STATIONS = new Set(['belt', 'bellows', 'counter', 'dominoes', 'flap', 'paddle', 'seesaw'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

function pickEven<T>(list: T[], n: number): T[] {
  if (n <= 0) return []
  if (n >= list.length) return list
  if (n === 1) return [list[Math.floor(list.length / 2)]]
  const out: T[] = []
  for (let i = 0; i < n; i++) {
    out.push(list[Math.round((i * (list.length - 1)) / (n - 1))])
  }
  return out
}

/**
 * Cascade world. Covering every leftover cell packed the floor with leftover
 * ornaments and ran a centre-to-centre conduit off the rim. The wires were
 * the rails Stephen saw: they hugged the border, punched through paddles,
 * and ended in a bare node with no sink.
 *
 * Here the outer ring of cells stays empty (an inset, not a one-pixel nudge).
 * Interior equal-size neighbours become eastbound sentences: feeder →
 * stations → a real ending. Unused cells get no machine. Wires still set
 * fire times but are not drawn — each machine draws its own rail so ports
 * meet at the shared edge.
 */
export function buildCascade(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, cascadeRegistry)
  if (floor.singles.length === 0) placeSpans(floor, 1)

  const interior = insetRing(leftoverCells(floor))
  const rows = eastRows(interior).filter((row) => row.length >= 3)
  const density = Math.max(0, Math.min(1, options.chains))
  const stride = options.res >= 12 ? 2 : 1
  const spaced = rows.filter((_, i) => i % stride === 0)
  const frac = density <= 0 ? 0 : options.res >= 12 ? 0.45 + 0.55 * density : 0.8 + 0.2 * density
  const keep = density <= 0 ? [] : pickEven(spaced, Math.max(1, Math.round(spaced.length * frac)))

  const roleRng = floor.rng.fork('roles')
  const feeders = named(floor.singles, FEEDERS)
  const endings = named(floor.singles, ENDINGS)
  const stations = named(floor.singles, STATIONS)
  const wires = []

  const from = (want: Contraption<unknown>[], fallback: Contraption<unknown>[]) => {
    if (want.length) return want
    if (fallback.length) return fallback
    return floor.singles
  }

  const pick = (role: Contraption<unknown>['role']) => {
    if (role === 'source') return roleRng.weighted(from(feeders, floor.singles.filter((c) => c.role === 'source')), (c) => c.weight ?? 1)
    if (role === 'sink') return roleRng.weighted(from(endings, floor.singles.filter((c) => c.role === 'sink')), (c) => c.weight ?? 1)
    return roleRng.weighted(from(stations, floor.singles.filter((c) => c.role === 'relay')), (c) => c.weight ?? 1)
  }

  for (const path of keep) {
    for (const cell of path) floor.claimed.add(cell)
    const members: Instance[] = path.map((cell, k) => {
      const role = k === 0 ? 'source' : k === path.length - 1 ? 'sink' : 'relay'
      return floor.place(pick(role), cell, `cell:${cell.index}`)
    })
    wires.push(...wireCascade(members, floor.rng.fork(`chain:${path[0].index}`)))
  }

  return finish(options, floor, wires, [], { showWires: false })
}

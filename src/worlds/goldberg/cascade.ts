import { registry as cascadeRegistry } from '../../contraptions/cascade'
import type { Beat, Ride } from '../../contraptions/cascade/parts'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Cell, Contraption, Instance, Wire } from '../../core/types'
import { LINK_DELAY, wireCascade } from '../../core/wiring'
import { CLEAR } from './elevator'
import { finish, openFloor, placeSpans, programmeBand, snakeRows, type Floor } from './staff'

const ENDINGS = new Set(['bell', 'lamp', 'flag', 'toaster', 'balloon', 'jack'])
const FEEDERS = new Set(['hopper', 'knocker', 'tipper', 'fuse'])
const DROPS = new Set(['lift'])
const CATCHES = new Set(['well'])
const STATIONS = new Set(['belt', 'bellows', 'counter', 'dominoes', 'flap', 'paddle', 'seesaw'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

const south = (a: Instance, b: Instance) =>
  b.cell.y > a.cell.y + a.cell.size * 0.4 && Math.abs(b.cell.x - a.cell.x) < 1

/**
 * One clock for every cell on a stack, then a pause long enough for the
 * car to land before the next machine on the rail fires.
 */
function timeStacks(chain: Instance[]): void {
  if (!chain.length) return
  let frame = chain[0].fireFrame
  let k = 0
  while (k < chain.length) {
    let end = k
    while (end + 1 < chain.length && south(chain[end], chain[end + 1])) end++
    const top = chain[k]
    const at = top.contraption.fireAt ?? 0
    const phase = Math.round(at * top.period - frame)
    const floors = end - k
    for (let i = k; i <= end; i++) {
      chain[i].fireFrame = ((frame % LOOP) + LOOP) % LOOP
      chain[i].phase = phase
      if (floors > 0 && chain[i].state && typeof chain[i].state === 'object') {
        const ride: Ride = { index: i - k, floors, at }
        ;(chain[i].state as Beat).ride = ride
      }
    }
    if (k === end) {
      if (k + 1 < chain.length) frame = (frame + LINK_DELAY) % LOOP
    } else {
      frame = (frame + Math.round((CLEAR + 0.06) * LOOP)) % LOOP
    }
    k = end + 1
  }
}

/**
 * Staff one run: a feeder, stations along the rail, an elevator wherever the
 * path steps south, and a real ending. Every run is a whole sentence, so a
 * floor of them reads as a shop of chain reactions rather than as leftovers.
 */
function staffRun(floor: Floor, path: Cell[], seed: string): Wire[] {
  if (path.length < 2) return []
  const roleRng = floor.rng.fork(`roles:${seed}`)
  const feeders = named(floor.singles, FEEDERS)
  const endings = named(floor.singles, ENDINGS)
  const drops = named(floor.singles, DROPS)
  const catches = named(floor.singles, CATCHES)
  const stations = named(floor.singles, STATIONS)
  const northEndings = endings.filter((c) => !c.inlets || c.inlets.includes('N'))

  const from = (want: Contraption<unknown>[], fallback: Contraption<unknown>[]) => {
    if (want.length) return want
    if (fallback.length) return fallback
    return floor.singles
  }
  const pick = (pool: Contraption<unknown>[]) => roleRng.weighted(from(pool, floor.singles), (c) => c.weight ?? 1)

  for (const cell of path) floor.claimed.add(cell)

  const members: Instance[] = path.map((cell, k) => {
    const prev = path[k - 1]
    const next = path[k + 1]
    const dropping = !!next && next.y > cell.y + cell.size * 0.4
    const catching = !!prev && prev.y < cell.y - cell.size * 0.4
    const first = k === 0
    const last = k === path.length - 1
    const pool = last
      ? from(catching ? northEndings : endings, floor.singles.filter((c) => c.role === 'sink'))
      : dropping && !first
        ? from(drops, from(endings, floor.singles))
        : first
          ? from(feeders, floor.singles.filter((c) => c.role === 'source'))
          : catching
            ? from(catches, stations)
            : from(stations, floor.singles.filter((c) => c.role === 'relay'))
    return floor.place(pick(pool), cell, `cell:${cell.index}`)
  })

  const wires = wireCascade(members, floor.rng.fork(seed))
  timeStacks(members)
  return wires
}

/**
 * Cascade world. The `chains` dial says how much of the floor is one machine:
 * a centred band of courses is snaked into a single drop-chain — east,
 * elevator south, west, elevator, east, into one sink — and every course
 * outside the band is its own eastbound sentence. Nothing is left as paper,
 * because a floor of empty cells is what made the piece read as a scrap
 * adrift on the page.
 *
 * Wires set fire times but are not drawn: each machine draws its own rail so
 * the ports actually meet.
 */
export function buildCascade(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, cascadeRegistry)
  if (floor.singles.length === 0) {
    placeSpans(floor, 1)
    return finish(options, floor, [], [], { showWires: false })
  }

  const { band, rest } = programmeBand(floor.rows, options.chains)
  const wires: Wire[] = []
  if (band.length) wires.push(...staffRun(floor, snakeRows(band), `chain:${band[0][0].index}`))
  for (const row of rest) wires.push(...staffRun(floor, row, `row:${row[0].index}`))

  return finish(options, floor, wires, [], { showWires: false })
}

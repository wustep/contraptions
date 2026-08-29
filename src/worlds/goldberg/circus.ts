import { registry as circusRegistry } from '../../contraptions/circus'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Contraption, Instance } from '../../core/types'
import { LINK_DELAY, wireChain } from '../../core/wiring'
import { CLEAR } from './elevator'
import { finish, leftoverCells, openFloor, snakeRows, staffedBlock, takeBlock } from './staff'

/** Acts that belong on the floor. Bunting and marquee are wallpaper. */
const SOURCES = new Set(['trampoline', 'hoop', 'catapult', 'balloon', 'jack-in-the-box'])
const RELAYS = new Set(['juggler', 'globe', 'carousel', 'monkey-bars'])
const DROPS = new Set(['lift'])
const CATCHES = new Set(['well'])
const SINKS = new Set(['spotlight', 'cymbals', 'curtain', 'dunk-tank', 'confetti', 'drumroll', 'gong'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

const south = (a: { y: number; size: number; x: number }, b: { y: number; size: number; x: number }) =>
  b.y > a.y + a.size * 0.4 && Math.abs(b.x - a.x) < 1

/**
 * A short centred cut of the aligned block. Filling the inset with every
 * leftover cell is how Circus became a sheet of icons.
 */
function showBlock(cells: ReturnType<typeof leftoverCells>, options: Options, density: number) {
  const block = staffedBlock(cells, options, 1, { inset: true })
  if (!block.length) return []
  const low = options.res < 12
  const rowsN = Math.min(block.length, Math.max(2, Math.round((low ? 3 : 4) * (0.45 + 0.55 * density))))
  const colsN = Math.min(block[0].length, Math.max(3, Math.round((low ? 5 : 6) * (0.45 + 0.55 * density))))
  return takeBlock(block, rowsN).map((row) => takeBlock(row, colsN))
}

function timeStacks(chain: Instance[]): void {
  if (!chain.length) return
  let frame = chain[0].fireFrame
  let k = 0
  while (k < chain.length) {
    let end = k
    while (end + 1 < chain.length && south(chain[end].cell, chain[end + 1].cell)) end++
    const top = chain[k]
    const at = top.contraption.fireAt ?? 0
    const phase = Math.round(at * top.period - frame)
    const floors = end - k
    for (let i = k; i <= end; i++) {
      chain[i].fireFrame = ((frame % LOOP) + LOOP) % LOOP
      chain[i].phase = phase
      if (floors > 0 && chain[i].state && typeof chain[i].state === 'object') {
        ;(chain[i].state as { ride?: { index: number; floors: number; at: number } }).ride = {
          index: i - k,
          floors,
          at,
        }
      }
    }
    if (k === end) {
      if (k + 1 < chain.length) frame = (frame + LINK_DELAY) % LOOP
    } else {
      frame = (frame + Math.round((CLEAR + 0.08) * LOOP)) % LOOP
    }
    k = end + 1
  }
}

/**
 * Circus world. A short snake is the programme: source → acts → a bow,
 * with an elevator at each south step so the ring is one machine, not
 * three shelves. Leftovers empty. Decorative leftover stays off the floor.
 */
export function buildCircus(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, circusRegistry)
  const density = Math.max(0, Math.min(1, options.chains))

  const rows = showBlock(leftoverCells(floor), options, density)
  const path = snakeRows(rows)
  const roleRng = floor.rng.fork('roles')

  const from = (want: Contraption<unknown>[], fallback: Contraption<unknown>[]) => {
    if (want.length) return want
    if (fallback.length) return fallback
    return floor.singles
  }

  if (!path.length) return finish(options, floor, [])

  for (const cell of path) floor.claimed.add(cell)
  const members: Instance[] = path.map((cell, k) => {
    const prev = path[k - 1]
    const next = path[k + 1]
    const dropping = !!next && next.y > cell.y + cell.size * 0.4
    const catching = !!prev && prev.y < cell.y - cell.size * 0.4
    const first = k === 0
    const last = k === path.length - 1
    const pool = last
      ? from(named(floor.singles, SINKS), floor.singles.filter((c) => c.role === 'sink'))
      : dropping && !first
        ? from(named(floor.singles, DROPS), named(floor.singles, RELAYS))
        : first
          ? from(named(floor.singles, SOURCES), floor.singles.filter((c) => c.role === 'source'))
          : catching
            ? from(named(floor.singles, CATCHES), named(floor.singles, RELAYS))
            : from(named(floor.singles, RELAYS), floor.singles.filter((c) => c.role === 'relay'))
    const contraption = roleRng.weighted(pool, (c) => c.weight ?? 1)
    const inst = floor.place(contraption, cell, `cell:${cell.index}`)
    inst.angle = 0
    inst.mirror = 1
    return inst
  })
  const wires = wireChain(members, floor.rng.fork(`ring:${path[0].index}`))
  timeStacks(members)
  return finish(options, floor, wires, [], { showWires: false })
}

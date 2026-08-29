import { registry as circusRegistry } from '../../contraptions/circus'
import type { Composition, Options } from '../../core/composition'
import type { Contraption, Instance } from '../../core/types'
import { wireChain } from '../../core/wiring'
import { finish, leftoverCells, openFloor, snakeRows, staffedBlock, takeBlock } from './staff'

/** Acts that belong on the floor. Bunting and marquee are wallpaper. */
const SOURCES = new Set(['trampoline', 'hoop', 'catapult', 'balloon', 'jack-in-the-box'])
const RELAYS = new Set(['juggler', 'globe', 'carousel', 'monkey-bars'])
const SINKS = new Set(['spotlight', 'cymbals', 'curtain', 'dunk-tank', 'confetti', 'drumroll', 'gong'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

/**
 * A short centred cut of the aligned block. Filling the inset with every
 * leftover cell is how Circus became a sheet of icons.
 */
function showBlock(cells: ReturnType<typeof leftoverCells>, options: Options, density: number) {
  const block = staffedBlock(cells, options, 1)
  if (!block.length) return []
  const low = options.res < 12
  const rowsN = Math.min(block.length, Math.max(2, Math.round((low ? 3 : 4) * (0.45 + 0.55 * density))))
  const colsN = Math.min(block[0].length, Math.max(3, Math.round((low ? 5 : 6) * (0.45 + 0.55 * density))))
  return takeBlock(block, rowsN).map((row) => takeBlock(row, colsN))
}

/**
 * Circus world. Classic leftover-fill packed the ring with every act at
 * once. Here a short snake is the programme: source → acts → a bow,
 * leftovers empty. Decorative leftover (bunting, marquee) stays off the floor.
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
    const pool =
      k === 0
        ? from(named(floor.singles, SOURCES), floor.singles.filter((c) => c.role === 'source'))
        : k === path.length - 1
          ? from(named(floor.singles, SINKS), floor.singles.filter((c) => c.role === 'sink'))
          : from(named(floor.singles, RELAYS), floor.singles.filter((c) => c.role === 'relay'))
    const contraption = roleRng.weighted(pool, (c) => c.weight ?? 1)
    const inst = floor.place(contraption, cell, `cell:${cell.index}`)
    inst.angle = 0
    inst.mirror = 1
    return inst
  })
  const wires = wireChain(members, floor.rng.fork(`ring:${path[0].index}`))
  return finish(options, floor, wires, [], { showWires: false })
}

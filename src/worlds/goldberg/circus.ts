import { registry as circusRegistry } from '../../contraptions/circus'
import type { Composition, Options } from '../../core/composition'
import type { Contraption, Instance } from '../../core/types'
import { wireChain } from '../../core/wiring'
import { finish, leftoverCells, openFloor, snakeRows, staffedBlock } from './staff'

/**
 * Circus world. The classic leftover-fill packed the ring with every act at
 * once — a pile of parts, tokens off the frame, dead zones around a random
 * ferris. Here a contiguous inset block is snaked into one programme:
 * source → acts → a sink, leftovers empty. Multi-cell acts (cannon, ferris,
 * big-top) still land when there is a hole; they do not wallpaper the rest.
 */
export function buildCircus(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, circusRegistry)
  const density = Math.max(0, Math.min(1, options.chains))

  const rows = staffedBlock(leftoverCells(floor), options, density)
  const path = snakeRows(rows)
  const roleRng = floor.rng.fork('roles')

  const byRole = (role: Contraption<unknown>['role']) => {
    const matching = floor.singles.filter((c) => c.role === role)
    if (matching.length) return matching
    return floor.singles
  }

  if (!path.length) return finish(options, floor, [])

  for (const cell of path) floor.claimed.add(cell)
  const members: Instance[] = path.map((cell, k) => {
    const role = k === 0 ? 'source' : k === path.length - 1 ? 'sink' : 'relay'
    const contraption = roleRng.weighted(byRole(role), (c) => c.weight ?? 1)
    const inst = floor.place(contraption, cell, `cell:${cell.index}`)
    inst.angle = 0
    inst.mirror = 1
    return inst
  })
  const wires = wireChain(members, floor.rng.fork(`ring:${path[0].index}`))
  return finish(options, floor, wires, [], { showWires: false })
}

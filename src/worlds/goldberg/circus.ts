import { registry as circusRegistry } from '../../contraptions/circus'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Contraption, Instance, Wire } from '../../core/types'
import { chainPaths, wireChain } from '../../core/wiring'
import { finish, leftoverCells, openFloor, placeSpans, posKey, type Floor } from './staff'

/** The shaft and its pit only make sense as a pair, with a car between them. */
const RIGGING = new Set(['lift', 'well'])
/** Bunting and a marquee dress the ring; they are never the act being watched. */
const DRESSING = new Set(['bunting', 'marquee'])

const withRole = (pool: Contraption<unknown>[], role: string) =>
  pool.filter((c) => c.role === role && (c.period ?? LOOP) === LOOP && !RIGGING.has(c.name))

/**
 * A rigging tower: the shaft in the upper cell, the pit in the lower one, one
 * car travelling between them. They share a clock, so the two halves draw the
 * same car in the same place and the seam never cuts it.
 */
function placeTowers(floor: Floor, chance: number): void {
  const lift = floor.singles.find((c) => c.name === 'lift')
  const well = floor.singles.find((c) => c.name === 'well')
  if (!lift || !well || chance <= 0) return
  for (const top of floor.rng.fork('towers').shuffle(floor.cells)) {
    if (floor.claimed.has(top)) continue
    const bottom = floor.at.get(posKey(top.x, top.y + top.size))
    if (!bottom || floor.claimed.has(bottom)) continue
    const rng = floor.rng.fork(`tower:${top.index}`)
    if (!rng.bool(chance)) continue
    floor.claimed.add(top)
    floor.claimed.add(bottom)
    const color = rng.pick(floor.theme.colors)
    const pair: [Contraption<unknown>, number][] = [
      [lift, 0],
      [well, 1],
    ]
    pair.forEach(([contraption, index], k) => {
      const cell = k === 0 ? top : bottom
      const inst = floor.place(contraption, cell, `cell:${cell.index}`, {
        color,
        ride: { index, floors: 1, at: 0 },
      })
      inst.angle = 0
      inst.mirror = 1
      inst.phase = 0
      inst.fireFrame = 0
      inst.reach = 0.5
    })
  }
}

/**
 * Circus world. Every cell is a looping act: a performer leaves its tower and
 * is back by the end of the loop, and the stunt on the way happens again next
 * lap. The composition is classic-like, which is what the set was drawn for —
 * independent acts filling the ring, the big showpieces taking the two or
 * three cells they need, rigging towers here and there, and short runs wired
 * into a programme, the drumroll between one act and the next.
 *
 * The old composer cut a four-by-six block out of the middle and left the
 * rest as paper; snaking half the floor into one chain replaced that with a
 * band of the same four relays repeated a hundred times. A programme is a few
 * acts in a row, not a wallpaper.
 */
export function buildCircus(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, circusRegistry)
  if (floor.singles.length === 0) {
    placeSpans(floor, 1)
    return finish(options, floor, [])
  }

  const spans = Math.max(0, Math.min(1, options.spans))
  placeSpans(floor, spans * 0.28)
  placeTowers(floor, spans * 0.1)

  // Short runs, staffed by role, exactly as classic does it. Each has its own
  // source and its own bow, so a floor of them stays varied.
  const wires: Wire[] = []
  const roleRng = floor.rng.fork('roles')
  const byRole = (role: string) => {
    const matching = withRole(floor.singles, role)
    if (matching.length) return matching
    const any = floor.singles.filter((c) => c.role && !RIGGING.has(c.name))
    return any.length ? any : floor.singles
  }
  if (options.chains > 0) {
    for (const path of chainPaths(floor.cells, floor.claimed, floor.rng.fork('paths'), options.chains, 'any')) {
      const members: Instance[] = path.map((cell, k) => {
        const role = k === 0 ? 'source' : k === path.length - 1 ? 'sink' : 'relay'
        const inst = floor.place(
          roleRng.weighted(byRole(role), (c) => c.weight ?? 1),
          cell,
          `cell:${cell.index}`,
        )
        inst.angle = 0
        inst.mirror = 1
        return inst
      })
      wires.push(...wireChain(members, floor.rng.fork(`ring:${path[0].index}`)))
    }
  }

  // Everything the programme and the showpieces left over is its own act.
  const solo = floor.singles.filter((c) => !RIGGING.has(c.name))
  const acts = solo.length ? solo : floor.singles
  const plain = acts.filter((c) => !DRESSING.has(c.name))
  for (const cell of leftoverCells(floor)) {
    floor.claimed.add(cell)
    const rng = floor.rng.fork(`act:${cell.index}`)
    // Dressing is the paper the ring is printed on: a little of it, spread out.
    const pool = plain.length && !rng.bool(0.12) ? plain : acts
    const inst = floor.place(rng.weighted(pool, (c) => c.weight ?? 1), cell, `cell:${cell.index}`)
    inst.angle = 0
  }

  return finish(options, floor, wires)
}

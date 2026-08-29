import { registry as circusRegistry } from '../../contraptions/circus'
import { LOOP } from '../../core/constants'
import type { Composition, Options } from '../../core/composition'
import type { Cell, Contraption, Instance } from '../../core/types'
import { LINK_DELAY, wireChain } from '../../core/wiring'
import { CLEAR } from './elevator'
import { finish, leftoverCells, openFloor, placeSpans, programmeBand, snakeRows, type Floor } from './staff'

/** Acts that belong on the programme. Elevator furniture goes nowhere else. */
const SOURCES = new Set(['trampoline', 'hoop', 'catapult', 'balloon', 'jack-in-the-box'])
const RELAYS = new Set(['juggler', 'globe', 'carousel', 'monkey-bars'])
const DROPS = new Set(['lift'])
const CATCHES = new Set(['well'])
const SINKS = new Set(['spotlight', 'cymbals', 'curtain', 'dunk-tank', 'confetti', 'drumroll', 'gong'])
/** The shaft and its catch basin only make sense with a car between them. */
const RIGGING = new Set(['lift', 'well'])

const named = (pool: Contraption<unknown>[], names: Set<string>) => pool.filter((c) => names.has(c.name))

const south = (a: Cell, b: Cell) => b.y > a.y + a.size * 0.4 && Math.abs(b.x - a.x) < 1

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

/** The wired programme: a source, acts, an elevator at every south step, a bow. */
function staffProgramme(floor: Floor, path: Cell[], color: string): Instance[] {
  const roleRng = floor.rng.fork(`roles:${path[0].index}`)
  const from = (want: Contraption<unknown>[], fallback: Contraption<unknown>[]) => {
    if (want.length) return want
    if (fallback.length) return fallback
    return floor.singles
  }
  return path.map((cell, k) => {
    const prev = path[k - 1]
    const next = path[k + 1]
    const dropping = !!next && south(cell, next)
    const catching = !!prev && south(prev, cell)
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
    // One prop colour down the whole programme, so the drumroll reads as one
    // sequence against a floor of acts that pick their own.
    const inst = floor.place(contraption, cell, `cell:${cell.index}`, { color })
    inst.angle = 0
    inst.mirror = 1
    return inst
  })
}

/**
 * Circus world. Every cell is a looping act: a performer leaves its tower and
 * is back by the end of the loop, and the stunt on the way happens again next
 * lap. One centred band of the floor is wired into a programme — source, acts,
 * a bow, with an elevator at each south step — and the rest of the ring is
 * independent acts and the big showpieces that need two cells or three.
 *
 * The old composer cut a four-by-six block out of the middle and left the
 * rest as paper, which is how a ring of acts became a postage stamp.
 */
export function buildCircus(options: Options, canvas: number): Composition {
  const floor = openFloor(options, canvas, circusRegistry)
  if (floor.singles.length === 0) {
    placeSpans(floor, 1)
    return finish(options, floor, [])
  }

  // Reserve the programme before anything else, so a showpiece cannot land
  // across it and a snake cannot be asked to step through a big top.
  const { band } = programmeBand(floor.rows, options.chains)
  const path = band.length ? snakeRows(band) : []
  for (const cell of path) floor.claimed.add(cell)

  placeSpans(floor, Math.max(0, Math.min(1, options.spans)) * 0.28)

  const color = floor.rng.fork('programme').pick(floor.theme.colors)
  const members = path.length >= 2 ? staffProgramme(floor, path, color) : []
  const wires = members.length ? wireChain(members, floor.rng.fork(`ring:${path[0].index}`)) : []
  timeStacks(members)

  // Every cell the programme and the showpieces left over is its own act.
  const solo = floor.singles.filter((c) => !RIGGING.has(c.name))
  const fill = solo.length ? solo : floor.singles
  for (const cell of leftoverCells(floor)) {
    floor.claimed.add(cell)
    const inst = floor.place(
      floor.rng.fork(`act:${cell.index}`).weighted(fill, (c) => c.weight ?? 1),
      cell,
      `cell:${cell.index}`,
    )
    inst.angle = 0
  }

  return finish(options, floor, wires, [], { showWires: false })
}

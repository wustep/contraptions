import { LOOP } from './constants'
import type { Rng } from './rng'
import type { Cell, Instance, Side, Wire } from './types'

/** Frames between one machine firing and the next along a chain. */
export const LINK_DELAY = 24

/** How long `fired` takes to decay back to 0, in frames. */
export const FIRE_DECAY = 16

/** Shorter than this and it reads as a pair, not a cascade. */
const MIN_CHAIN = 3
const MAX_CHAIN = 5

/**
 * A chained cascade machine's place in the run: the side the token comes in
 * on, the side it leaves by, and the token's colour. `wireCascade` attaches
 * this to the machine's state. Absent on a machine that is not chained, which
 * then runs self-contained. Classic wiring never writes this.
 */
export interface Flow {
  in: Side | null
  out: Side | null
  color: string
}

const key = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`

/** Which side of `from` faces `to`. Chain links only ever join neighbours. */
export const sideOf = (from: Cell, to: Cell): Side => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'E' : 'W'
  return dy > 0 ? 'S' : 'N'
}

/**
 * How a run may grow.
 *
 *   any   — classic: four ways, including up
 *   down  — cascade: never up; sideways twice as often as a drop
 *   along — workshop: a shop line, mostly east, never up
 */
export type PathStyle = 'any' | 'down' | 'along'

const STEPS_ANY: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const STEPS_DOWN: [number, number][] = [
  [1, 0],
  [-1, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
]

const STEPS_ALONG: [number, number][] = [
  [1, 0],
  [1, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
]

const stepsFor = (style: PathStyle): [number, number][] =>
  style === 'down' ? STEPS_DOWN : style === 'along' ? STEPS_ALONG : STEPS_ANY

/**
 * Reserve runs of free cells to build chains along.
 *
 * Paths are grown in a mostly straight line with at most one turn. A random
 * walk produces paths that double back and cross themselves, which reads as
 * tangle rather than as a signal going somewhere; a straight run with one
 * corner reads as plumbing.
 *
 * Cells returned here are marked in `taken` so the caller does not fill them
 * with unrelated machines.
 */
export function chainPaths(
  cells: Cell[],
  taken: Set<Cell>,
  rng: Rng,
  density: number,
  style: PathStyle = 'any',
): Cell[][] {
  if (density <= 0) return []

  const STEPS = stepsFor(style)
  const byPos = new Map<string, Cell>()
  for (const cell of cells) {
    if (cell.w === cell.size && cell.h === cell.size) byPos.set(key(cell.x, cell.y), cell)
  }

  const paths: Cell[][] = []
  const budget = Math.max(1, Math.round((byPos.size / 26) * density * 2))

  for (const start of rng.shuffle([...byPos.values()])) {
    if (paths.length >= budget) break
    if (taken.has(start)) continue

    const target = rng.int(MIN_CHAIN, MAX_CHAIN + 1)
    const path = [start]
    const claimed = new Set([start])
    let [dx, dy] = rng.pick(STEPS)
    let turns = 0

    while (path.length < target) {
      const head = path[path.length - 1]
      const step = (sx: number, sy: number): Cell | undefined => {
        const next = byPos.get(key(head.x + sx * head.size, head.y + sy * head.size))
        if (!next || taken.has(next) || claimed.has(next) || next.size !== head.size) return undefined
        return next
      }

      let next = step(dx, dy)
      if (!next && turns < 1) {
        // One corner is allowed, and only to get out of a dead end.
        const turn = rng.shuffle(STEPS.filter(([sx, sy]) => sx !== dx || sy !== dy))
        for (const [sx, sy] of turn) {
          const candidate = step(sx, sy)
          if (candidate) {
            next = candidate
            dx = sx
            dy = sy
            turns++
            break
          }
        }
      }
      if (!next) break
      claimed.add(next)
      path.push(next)
    }

    if (path.length < MIN_CHAIN) continue
    for (const cell of path) taken.add(cell)
    paths.push(path)
  }

  return paths
}

const colorOf = (inst: Instance): string =>
  (inst.state as { color?: string } | null)?.color ?? '#000000'

/**
 * Space a chain's firing moments `LINK_DELAY` apart and return the links.
 *
 * Nothing here is evaluated at draw time. A chain is purely a phase assignment:
 * each machine's phase is chosen so its own firing moment lands on the frame the
 * cascade needs it to, which is how the piece can show causality while every
 * contraption stays a pure function of its own `u`.
 */
export function wireChain(chain: Instance[], rng: Rng): Wire[] {
  const base = rng.int(0, LOOP)
  chain.forEach((inst, k) => {
    const fireFrame = (base + k * LINK_DELAY) % LOOP
    inst.fireFrame = fireFrame
    inst.phase = Math.round((inst.contraption.fireAt ?? 0) * inst.period - fireFrame)
  })

  const wires: Wire[] = []
  for (let k = 0; k < chain.length - 1; k++) {
    wires.push({
      from: chain[k].cell,
      to: chain[k + 1].cell,
      start: chain[k].fireFrame,
      end: chain[k].fireFrame + LINK_DELAY,
      color: colorOf(chain[k]),
      last: k === chain.length - 2,
    })
  }
  return wires
}

/**
 * Cascade wiring. Same phase arithmetic as `wireChain`, then the run stands
 * upright, every machine is told which way the token travels, and one colour
 * rides the whole chain. Classic `wireChain` is left alone so a random
 * quarter-turn on a pendulum still reads as a pendulum.
 */
export function wireCascade(chain: Instance[], rng: Rng): Wire[] {
  const wires = wireChain(chain, rng)
  const color = colorOf(chain[0])
  chain.forEach((inst, k) => {
    inst.angle = 0
    inst.mirror = 1
    if (inst.state && typeof inst.state === 'object') {
      const flow: Flow = {
        in: k > 0 ? sideOf(inst.cell, chain[k - 1].cell) : null,
        out: k < chain.length - 1 ? sideOf(inst.cell, chain[k + 1].cell) : null,
        color,
      }
      ;(inst.state as { flow?: Flow }).flow = flow
    }
  })
  for (const w of wires) w.color = color
  return wires
}

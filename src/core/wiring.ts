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
 * A chained machine's place in the run: the side the token comes in on, the
 * side it leaves by, and the token's colour. `wireChain` attaches this to the
 * machine's state, so a machine can face its inlet and outlet, and draw its
 * own copy of the token in the right colour on either side of the hand-off.
 * Absent on a machine that is not chained, which then runs self-contained.
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
 * Directions a run may grow in, which is the direction its token travels.
 * Never up: the machines are built under gravity, and a ball that climbs a
 * column with nothing lifting it is the one thing a Goldberg machine may not
 * do. Sideways twice as often as down, so most runs read left to right like a
 * strip and a drop is the punctuation.
 */
const STEPS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
]

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
): Cell[][] {
  if (density <= 0) return []

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
  // One token runs the whole chain, so every link carries the source's colour.
  const color = colorOf(chain[0])
  chain.forEach((inst, k) => {
    const fireFrame = (base + k * LINK_DELAY) % LOOP
    inst.fireFrame = fireFrame
    inst.phase = Math.round((inst.contraption.fireAt ?? 0) * inst.period - fireFrame)
    // A chained machine stands upright and is told which way the run goes, so
    // its inlet faces the machine before it and its outlet the one after. A
    // random quarter-turn here would point a chute at a wall.
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

  const wires: Wire[] = []
  for (let k = 0; k < chain.length - 1; k++) {
    wires.push({
      from: chain[k].cell,
      to: chain[k + 1].cell,
      start: chain[k].fireFrame,
      end: chain[k].fireFrame + LINK_DELAY,
      color,
      last: k === chain.length - 2,
    })
  }
  return wires
}

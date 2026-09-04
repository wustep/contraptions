import { registry as rubeRegistry } from '../../contraptions/rube'
import type { CatalogEntry, Composition, Options } from '../../core/composition'
import { themeByName, type Theme } from '../../core/themes'
import { CASCADE } from './cascade'
import { buildLaneWorld, laneCatalog, type CellRole, type PathStep, type Plan, type WorldSpec } from './laneworld'

/**
 * Rube Goldberg: one machine, drawn on the wall.
 *
 * The cascade fills its grid with a snake; this mode carves a path instead.
 * A ball leaves a feeder somewhere along the top, rolls a way, and goes down
 * — by elevator, or by simply falling down a chute — one, two or three floors
 * at a time, then rolls on, the same way or back, until it reaches an ending
 * on the bottom row. Cells the path does not visit stay paper. Every machine
 * on the piece is on the path, so nothing free-runs: the whole frame is one
 * connected contraption, and the seed decides its shape.
 *
 * The ball is the world's, drawn once along the joined lane of every cell on
 * the path, exactly as in cascade. See `laneworld.ts`. **Wander** (the spans
 * dial) is how far the path strays from a snake: at 0 every run crosses the
 * frame and every drop is one floor; at 1 runs are short and drops are deep.
 * **Stations** (chains) is how much of the path is machinery.
 */
export const RUBE: WorldSpec = {
  ...CASCADE,
  catalog: rubeRegistry,
  names: {
    ...CASCADE.names,
    shaft: 'shaft',
    chute: 'chute',
    tube: 'tube',
    catch: 'catch',
  },
}

/**
 * Deepest a descent goes, in cells. An elevator's cycle — board, descend,
 * clear, hand off, climb back empty — has to fit between two balls, and at
 * three floors it just does. A fall could go deeper, but the two kinds of
 * descent share a range so the dial means one thing.
 */
export const MAX_DROP = 3

/** Shortest a horizontal run can be: the cell it lands in and the cell it leaves from. */
const MIN_RUN = 2

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/**
 * The wandering path. Runs alternate with descents; every step is east, west
 * or south, never north, so the walk can never cross itself: each row is
 * visited by at most one run, and a descent only passes through rows the
 * runs have not reached yet.
 */
export const rubePlan: Plan = ({ at, across, rng, options }) => {
  const wander = clamp01(options.spans)
  const walk = rng.fork('path')
  const steps: PathStep[] = []
  const push = (col: number, row: number, step: Omit<PathStep, 'cell'>) => {
    const cell = at(col, row)
    if (cell) steps.push({ cell, ...step })
  }

  let row = 0
  let dir: 1 | -1 = walk.sign() > 0 ? 1 : -1
  // The feeder sits within the first two-fifths of the top row, on the side
  // the run sets off from, so the first run has room to be a run.
  const lead = walk.int(0, Math.max(1, Math.floor(across * 0.4)))
  let col = dir > 0 ? lead : across - 1 - lead
  let entry: CellRole = 'feeder'
  let floors = 0

  for (;;) {
    const last = row === across - 1
    let room = dir > 0 ? across - col : col + 1
    if (room < MIN_RUN) {
      dir = dir > 0 ? -1 : 1
      room = dir > 0 ? across - col : col + 1
    }
    // Run length: the whole room at wander 0, anything from MIN_RUN at 1.
    const len = Math.max(MIN_RUN, Math.min(room, Math.round(room - (room - MIN_RUN) * wander * walk.next())))

    // The descent after this run, decided now so the run's last cell knows
    // whether it is a lift or a chute.
    let drop = 0
    let kind: 'car' | 'fall' = 'car'
    if (!last) {
      const left = across - 1 - row
      drop = 1
      if (drop < left && walk.bool(wander * 0.6)) drop++
      if (drop < left && walk.bool(wander * 0.45)) drop++
      drop = Math.min(drop, MAX_DROP, left)
      kind = walk.bool(0.5) ? 'car' : 'fall'
    }

    for (let i = 0; i < len; i++) {
      const first = i === 0
      const end = i === len - 1
      const role: CellRole = first ? entry : end ? (last ? 'sink' : kind === 'car' ? 'lift' : 'chute') : 'filler'
      const ride =
        first && entry === 'well'
          ? { index: floors, floors }
          : end && !last && kind === 'car'
            ? { index: 0, floors: drop }
            : undefined
      push(col + dir * i, row, {
        role,
        mirror: dir,
        in: first ? (entry === 'feeder' ? null : 'N') : 'W',
        out: end ? (last ? null : 'S') : 'E',
        ride,
      })
    }
    if (last) break

    col += dir * (len - 1)
    for (let k = 1; k < drop; k++) {
      push(col, row + k, {
        role: kind === 'car' ? 'shaft' : 'tube',
        mirror: dir,
        in: 'N',
        out: 'S',
        ride: kind === 'car' ? { index: k, floors: drop } : undefined,
      })
    }
    row += drop
    entry = kind === 'car' ? 'well' : 'catch'
    floors = drop

    // The next run mostly heads back the other way, sometimes carries on.
    const onward = dir > 0 ? across - col : col + 1
    if (onward < MIN_RUN || !walk.bool(0.35)) dir = dir > 0 ? -1 : 1
  }

  // `chains` says how many of the through-cells are working stations.
  const through = steps.flatMap((s, i) => (s.role === 'filler' ? [i] : []))
  const density = clamp01(options.chains)
  const working = rng.fork('stations').shuffle(through).slice(0, Math.round(through.length * density))
  for (const i of working) steps[i].role = 'station'
  return steps
}

export const buildRube = (options: Options, canvas: number): Composition =>
  buildLaneWorld(options, canvas, RUBE, rubePlan)

export const rubeCatalog = (theme: Theme | string): CatalogEntry[] =>
  laneCatalog(RUBE, typeof theme === 'string' ? themeByName(theme) : theme)

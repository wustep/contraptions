import type p5 from 'p5'
import { ART_INSET, LOOP } from '../../core/constants'
import { clampRes, type CatalogEntry, type Composition, type Options, type Overlay } from '../../core/composition'
import { clipBox } from '../../core/draw'
import { mod } from '../../core/ease'
import {
  hold,
  laneAt,
  laneFire,
  laneTime,
  mirrorLane,
  pieceTime,
  roll,
  stopLane,
  type Lane,
  type LaneCtx,
  type Pt,
} from '../../core/lane'
import { layoutByName } from '../../core/layouts'
import { makeRng, type Rng } from '../../core/rng'
import { themeByName, type Theme } from '../../core/themes'
import type { Cell, Contraption, Instance } from '../../core/types'
import { carCycle, carRig, carTravel, type RideTiming } from './elevator'
import { filteredPool, isUnit } from './staff'

/**
 * The lane world, shared by cascade and workshop.
 *
 * One uniform grid, one snake through every cell of it — east along a row,
 * down an elevator at the end, west along the next — and one token journey
 * made by concatenating the lane each machine declares for itself. The world
 * draws every token and every moving elevator part in a single overlay, so:
 *
 *   - a token cannot vanish at a seam or be drawn twice, because there is one
 *     drawing of it on one path;
 *   - a car cannot disagree with its passenger, because both come off the
 *     same number;
 *   - hand-offs are structural rather than a convention two machines have to
 *     keep in step by hand.
 *
 * Machines are drawn in their canonical hand (west → east) and the world
 * mirrors the westbound half of the snake, so no machine ever asks which way
 * it is facing.
 */

export type CellRole = 'feeder' | 'station' | 'filler' | 'lift' | 'well' | 'sink'

/** What a lane world is: a catalog, a pace, a floor, and a pool per role. */
export interface WorldSpec {
  catalog: Contraption<unknown>[]
  /** Loop fraction between consecutive tokens. Cascade 1, workshop 1/2. */
  emit: number
  /** Height of a token's centre when it rolls on this catalog's floor. */
  floorY: number
  /** Cells per loop on a plain run: the world's default lane speed. */
  rollV: number
  /** Height of the sheave in an elevator's top cell. */
  sheaveY: number
  /** A token's width in cells: the ball's diameter, the part's edge. */
  tokenSize: number
  ride: RideTiming
  /** Frames one machine's own clock takes. A world that runs two tokens a loop uses LOOP/2. */
  period: number
  names: {
    feeders: string[]
    endings: string[]
    /** Plain conveyance for the cells `chains` leaves alone. */
    filler: string
    lift: string
    well: string
  }
  /** The state this world stamps on a cell: cascade writes `flow`, workshop `line`. */
  state(role: CellRole, ctx: LaneCtx, color: string): Record<string, unknown>
  /**
   * What a station does to a part that has already fired here. Cascade
   * leaves this off — a ball is a ball. Workshop writes marks, a split, a dye.
   */
  work?(name: string, state: Record<string, unknown>): Partial<TokenLook> | undefined
  /** One token, in canvas pixels. `look` is the work accumulated so far. */
  token(p: p5, size: number, ink: string, weight: number, color: string, x: number, y: number, look?: TokenLook): void
}

/** How a token looks after the stations it has already passed. */
export type TokenLook = {
  color: string
  mark?: 'blank' | 'dot' | 'hole'
  split?: boolean
  slim?: boolean
  bg?: string
}

/** One staffed cell of the snake, with its lane already in the cell's hand. */
export interface LaneCell {
  name: string
  role: CellRole
  cell: Cell
  /** 1 eastbound, -1 westbound. The machine draws canonically either way. */
  mirror: number
  lane: Lane
  /** Journey time at the start of this lane, in loop fractions. */
  start: number
  span: number
  /** Frame the token reaches this machine's fire point. */
  arrival: number
  /** Machine state, so work() can read dye / tray colour. */
  state: Record<string, unknown>
}

/** An elevator stack: two cells, one car. */
export interface LaneStack {
  /** The top cell. The car is drawn in its frame. */
  cell: Cell
  mirror: number
  /** Journey time at which a token starts boarding. The car's clock zero. */
  board: number
}

/** Everything the overlay draws and the checks measure. */
export interface LaneRun {
  size: number
  emit: number
  /** Loop fractions from the feeder's throat to the sink's rest. */
  journey: number
  /** Tokens in flight: the journey divided by the gap between them. */
  tokens: number
  /** Colour of each token, in emit order. The feeder randomises; nothing locks one colour. */
  colors: string[]
  cells: LaneCell[]
  stacks: LaneStack[]
  /** The art area in canvas pixels: x0, y0, x1, y1. */
  frame: [number, number, number, number]
  /** Where a token is `t` loop fractions into the journey, in canvas pixels. */
  at(t: number): { x: number; y: number; ride: boolean }
}

/**
 * The world's default lane for a machine that declares none: a straight roll
 * along the catalog floor, with the feeder's wait and the sink's rest built in.
 */
export const defaultLane = (ctx: LaneCtx, v: number): Lane => stopLane(ctx, v)

/** Where the snake hands a token into and out of a cell, in cell units. */
const entryPt = (ctx: LaneCtx): Pt | null =>
  ctx.in === 'W' ? [-0.5, ctx.floorY] : ctx.in === 'N' ? [0, -0.5] : null
const exitPt = (ctx: LaneCtx): Pt | null =>
  ctx.out === 'E' ? [0.5, ctx.floorY] : ctx.out === 'S' ? [0, 0.5] : null

const far = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6

/**
 * Bolt a machine's lane onto the snake. A lane that does not start and end
 * where the world hands the token over gets a connector, so a machine with a
 * lane one cell-unit out of true reads as a visible detour rather than as a
 * token that teleports at the seam.
 */
function connect(lane: Lane, ctx: LaneCtx, v: number): Lane {
  const pieces = [...lane.pieces]
  let fire = lane.fire ?? laneFire(lane)
  if (!pieces.length) pieces.push(hold([0, ctx.floorY], ctx.emit))
  const enter = entryPt(ctx)
  const leave = exitPt(ctx)
  const first = pieces[0].from
  const last = pieces[pieces.length - 1]
  const end: Pt = last.hold !== undefined ? last.from : last.to
  if (enter && far(enter, first)) {
    const lead = roll(enter, first, v)
    pieces.unshift(lead)
    fire += Math.hypot(first[0] - enter[0], first[1] - enter[1]) / v
  }
  if (leave && far(leave, end)) pieces.push(roll(end, leave, v))
  return { pieces, fire }
}

/** East along a row, down at its end, west along the next. Every cell, once. */
function snakePath(at: (col: number, row: number) => Cell | undefined, across: number): Cell[] {
  const path: Cell[] = []
  for (let row = 0; row < across; row++) {
    for (let i = 0; i < across; i++) {
      const cell = at(row % 2 === 0 ? i : across - 1 - i, row)
      if (cell) path.push(cell)
    }
  }
  return path
}

export function buildLaneWorld(options: Options, canvas: number, world: WorldSpec): Composition {
  const theme = themeByName(options.theme)
  const rng = makeRng(options.seed)
  const across = clampRes(options.mode, options.res)
  // Snap the art area to a whole number of cells so every cell edge, and every
  // rail drawn on one, lands on a whole pixel.
  const area = Math.floor((canvas * ART_INSET) / across) * across
  const origin = Math.round((canvas - area) / 2)
  const cells = layoutByName('grid').build({
    x: origin,
    y: origin,
    area,
    res: across,
    rng: rng.fork('layout'),
  })
  const size = area / across
  const byPos = new Map<string, Cell>()
  for (const cell of cells) byPos.set(`${cell.col}:${cell.row}`, cell)
  const at = (col: number, row: number) => byPos.get(`${col}:${row}`)

  const candidates = filteredPool(options, world.catalog).filter(isUnit)
  const instances: Instance[] = []
  const bare = (): Composition => ({
    options,
    theme,
    cells,
    instances,
    loop: LOOP,
    used: [...new Set(instances.map((i) => i.contraption.name))].sort(),
    captions: [],
    header: null,
    wires: [],
    overlays: [],
    showWires: false,
    unit: size,
  })
  if (!candidates.length) return bare()

  const path = snakePath(at, across)
  const { names } = world
  const named = (want: string[]) => candidates.filter((c) => want.includes(c.name))
  const feeders = named(names.feeders)
  const endings = named(names.endings)
  const lifts = named([names.lift])
  const wells = named([names.well])
  const fillers = named([names.filler])
  const special = new Set([...names.feeders, ...names.endings, names.filler, names.lift, names.well])
  const stations = candidates.filter((c) => !special.has(c.name))

  const roleRng = rng.fork('roles')
  const pick = (want: Contraption<unknown>[], fallback: Contraption<unknown>[] = stations) => {
    const pool = want.length ? want : fallback.length ? fallback : candidates
    return roleRng.weighted(pool, (c) => c.weight ?? 1)
  }

  // A cell is a lift when the snake turns south out of it, a well when it
  // turned south into it. Everything else between the feeder and the sink is a
  // through-cell, and `chains` says how many of those are working stations
  // rather than plain conveyance.
  const roles: CellRole[] = path.map((cell, i) => {
    if (i === 0) return 'feeder'
    if (i === path.length - 1) return 'sink'
    const next = path[i + 1]
    const prev = path[i - 1]
    if (next.col === cell.col && next.row === cell.row + 1) return 'lift'
    if (prev.col === cell.col && prev.row === cell.row - 1) return 'well'
    return 'filler'
  })
  const through = roles.flatMap((r, i) => (r === 'filler' ? [i] : []))
  const density = Math.max(0, Math.min(1, options.chains))
  const working = rng.fork('stations').shuffle(through).slice(0, Math.round(through.length * density))
  for (const i of working) roles[i] = 'station'

  const color = rng.fork('chrome').pick(theme.colors)
  const laneCells: LaneCell[] = []
  const stacks: LaneStack[] = []
  let acc = 0

  for (const [i, cell] of path.entries()) {
    const role = roles[i]
    const mirror = cell.row % 2 === 0 ? 1 : -1
    const contraption =
      role === 'feeder'
        ? pick(feeders, candidates.filter((c) => c.role === 'source'))
        : role === 'sink'
          ? pick(endings, candidates.filter((c) => c.role === 'sink'))
          : role === 'lift'
            ? pick(lifts, fillers)
            : role === 'well'
              ? pick(wells, fillers)
              : role === 'filler'
                ? pick(fillers)
                : pick(stations, fillers)

    const ctx: LaneCtx = {
      in: role === 'feeder' ? null : role === 'well' ? 'N' : 'W',
      out: role === 'sink' ? null : role === 'lift' ? 'S' : 'E',
      emit: world.emit,
      floorY: world.floorY,
      ride:
        role === 'lift'
          ? { index: 0, floors: 1 }
          : role === 'well'
            ? { index: 1, floors: 1 }
            : undefined,
    }

    const cellRng = rng.fork(`cell:${cell.index}`)
    const state = contraption.setup({
      rng: cellRng,
      size: cell.size,
      w: cell.w,
      h: cell.h,
      theme,
      cell,
      color: cellRng.pick(theme.colors),
    }) as Record<string, unknown>
    Object.assign(state, world.state(role, ctx, color))

    const declared = contraption.lane ? contraption.lane(ctx, state) : defaultLane(ctx, world.rollV)
    const joined = connect(declared, ctx, world.rollV)
    const lane = mirror < 0 ? mirrorLane(joined) : joined
    const span = laneTime(lane)
    const arrival = (acc + laneFire(lane)) * LOOP
    const period = world.period
    const phase = Math.round((contraption.fireAt ?? 0) * period - arrival)

    instances.push({
      contraption,
      state,
      cell,
      angle: 0,
      mirror,
      phase: mod(phase, period),
      period,
      fireFrame: mod(Math.round(arrival), LOOP),
    })
    laneCells.push({ name: contraption.name, role, cell, mirror, lane, start: acc, span, arrival, state })
    // A car is drawn for a turn whose machine actually rides one. Solo a rail
    // onto the whole grid and the token drops down the turn on its own rather
    // than a cage appearing around a machine that never asked for one.
    if (role === 'lift' && lane.pieces.some((piece) => piece.ride)) {
      stacks.push({ cell, mirror, board: acc + laneFire(lane) })
    }
    acc += span
  }

  const journey = acc
  const tokens = Math.max(1, Math.ceil(journey / world.emit))
  const colors = emitColors(rng, theme.colors, tokens)
  const run: LaneRun = {
    size,
    emit: world.emit,
    journey,
    tokens,
    colors,
    cells: laneCells,
    stacks,
    frame: [origin, origin, origin + area, origin + area],
    at(t) {
      const clamped = Math.max(0, Math.min(journey, t))
      let lo = 0
      let hi = laneCells.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (laneCells[mid].start <= clamped) lo = mid
        else hi = mid - 1
      }
      const here = laneCells[lo]
      const point = laneAt(here.lane, clamped - here.start)
      return {
        x: here.cell.x + point.x * size,
        y: here.cell.y + point.y * size,
        ride: point.ride,
      }
    },
  }

  return { ...bare(), overlays: [drawRun(run, world)], lanes: run }
}

/**
 * The one drawing of everything that moves: every car (loaded or climbing back
 * empty) and then every token, from the same clock.
 */
function emitColors(rng: Rng, palette: string[], n: number): string[] {
  const pick = rng.fork('emit')
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const pool = palette.filter((c) => c !== out[i - 1])
    out.push(pick.pick(pool.length ? pool : palette))
  }
  return out
}

function lookAt(run: LaneRun, world: WorldSpec, t: number, color: string): TokenLook {
  const look: TokenLook = { color }
  for (const cell of run.cells) {
    if (t + 1e-6 < cell.start + laneFire(cell.lane)) break
    const patch = world.work?.(cell.name, cell.state)
    if (patch) Object.assign(look, patch)
  }
  return look
}

function riderColor(run: LaneRun, u: number, stack: LaneStack): string {
  const { emit, journey, colors } = run
  for (let j = 0; j < run.tokens; j++) {
    const t = mod(u, emit) + j * emit
    if (t > journey) continue
    const here = run.at(t)
    if (!here.ride) continue
    if (Math.abs(here.x - stack.cell.x) < run.size * 0.8 && Math.abs(here.y - stack.cell.y) < run.size * 1.4) {
      return colors[j] ?? colors[0]
    }
  }
  return colors[0]
}

function drawRun(run: LaneRun, world: WorldSpec): Overlay {
  const { size, emit, journey, colors } = run
  return (p: p5, loopFrame: number, { theme, weight }: { theme: Theme; weight: (size: number) => number }) => {
    const u = loopFrame / LOOP
    const w = weight(size)

    for (const stack of run.stacks) {
      const travel = carTravel(world.ride, mod(u - stack.board, emit))
      p.push()
      p.translate(stack.cell.x, stack.cell.y)
      p.scale(stack.mirror, 1)
      carRig(p, size, theme.ink, w, riderColor(run, u, stack), {
        floorY: world.floorY,
        sheaveY: world.sheaveY,
        travel,
        seat: world.tokenSize / 2,
      })
      p.pop()
    }

    for (let j = 0; j < run.tokens; j++) {
      const t = mod(u, emit) + j * emit
      if (t > journey) continue
      const { x, y } = run.at(t)
      const look = lookAt(run, world, t, colors[j] ?? colors[0])
      world.token(p, size, theme.ink, w, look.color, x, y, look)
    }
  }
}

/** A demo lane for the catalog sheet: the machine's own, in the hand it is drawn. */
function demoLane(
  contraption: Contraption<unknown>,
  state: Record<string, unknown>,
  ctx: LaneCtx,
  rollV: number,
): Lane {
  const declared = contraption.lane ? contraption.lane(ctx, state) : defaultLane(ctx, rollV)
  return connect(declared, ctx, rollV)
}

/* ---------------------------------------------------------------- catalog */

/** Slot lengths a demo may take. Divisors of LOOP, so the sheet's loop is LOOP. */
const SLOTS = [240, 120, 80, 60, 48, 40, 30, 24, 20]
const nearestSlot = (frames: number) =>
  SLOTS.reduce((best, d) => (Math.abs(d - frames) < Math.abs(best - frames) ? d : best), SLOTS[0])

const roleOf = (world: WorldSpec, name: string): CellRole =>
  world.names.feeders.includes(name)
    ? 'feeder'
    : world.names.endings.includes(name)
      ? 'sink'
      : name === world.names.lift
        ? 'lift'
        : name === world.names.well
          ? 'well'
          : 'station'

const ctxFor = (world: WorldSpec, role: CellRole, emit: number): LaneCtx => ({
  in: role === 'feeder' ? null : role === 'well' ? 'N' : 'W',
  out: role === 'sink' ? null : role === 'lift' ? 'S' : 'E',
  emit,
  floorY: world.floorY,
  ride: role === 'lift' ? { index: 0, floors: 1 } : role === 'well' ? { index: 1, floors: 1 } : undefined,
})

/** The loop offset that turns a lane time into this stack's car cycle time. */
function carOffset(world: WorldSpec, lane: Lane, below: boolean): number | null {
  let acc = 0
  for (const piece of lane.pieces) {
    if (piece.ride) {
      const travel0 = piece.from[1] - world.floorY + (below ? 1 : 0)
      return world.ride.board + travel0 / world.ride.v - acc
    }
    acc += pieceTime(piece)
  }
  return null
}

const DEMO_CELL: Cell = { x: 0, y: 0, size: 1, w: 1, h: 1, col: 0, row: 0, index: 0, depth: 0 }

/**
 * The catalog sheet for a lane world: every machine with a token running
 * through it, on its own lane, at its own tempo, with the elevator cells
 * showing their car. Same idea as the tracks sheet — the machine and the token
 * come off one clock, so what you see on the sheet is what the piece does.
 *
 * A machine that has not declared a lane yet is listed without a token: it is
 * still drawing its own, and two would be worse than none.
 */
export function laneCatalog(world: WorldSpec, theme: Theme): CatalogEntry[] {
  // A demo emit far shorter than the world's, or a feeder's throat would hold
  // its ball for the whole sheet and nothing would ever move.
  const emit = Math.min(world.emit, 0.22)
  const rng = makeRng('lane-catalog')
  return world.catalog.map((contraption, index) => {
    const [w, h] = contraption.span ?? [1, 1]
    const entry: CatalogEntry = {
      contraption,
      label: contraption.label ?? contraption.name,
      sub: [w === 1 && h === 1 ? '' : `${w}×${h}`, contraption.role].filter(Boolean).join(' · '),
    }
    if (w !== 1 || h !== 1) return entry

    const role = roleOf(world, contraption.name)
    const ctx = ctxFor(world, role, emit)
    entry.state = (state, { color }) => Object.assign(state, world.state(role, ctx, color))
    if (!contraption.lane) return entry

    // A scratch build of the same machine, only to size the slot: the sheet
    // needs a period before it has a state to ask.
    const cellRng = rng.fork(contraption.name)
    const scratch = contraption.setup({
      rng: cellRng,
      size: 1,
      w: 1,
      h: 1,
      theme,
      cell: DEMO_CELL,
      color: theme.colors[0],
    }) as Record<string, unknown>
    Object.assign(scratch, world.state(role, ctx, theme.colors[0]))
    const model = demoLane(contraption, scratch, ctx, world.rollV)
    const span = laneTime(model)
    const total = carOffset(world, model, role === 'well') !== null ? Math.max(span, carCycle(world.ride)) : span
    const frames = nearestSlot(total * LOOP)
    // Stagger the demos, or every machine on the sheet whose slot divides the
    // sample frame is caught at the same instant of its own little story.
    const lead = Math.round(frames * ((index * 0.31) % 1))
    entry.period = frames
    entry.phase = Math.round(frames * ((contraption.fireAt ?? 0) - laneFire(model) / total) + lead)
    entry.overlay = (cell, { color, state }) => {
      const lane = demoLane(contraption, state, ctx, world.rollV)
      const offset = carOffset(world, lane, role === 'well')
      const laneSpan = laneTime(lane)
      return (p, loopFrame, { theme: sheet, weight }) => {
        const t = (mod(loopFrame + lead, frames) / frames) * total
        const pen = weight(cell.size)
        p.push()
        p.translate(cell.x, cell.y)
        clipBox(p, cell.w, cell.h, () => {
          if (offset !== null) {
            carRig(p, cell.size, sheet.ink, pen, color, {
              floorY: world.floorY,
              sheaveY: world.sheaveY,
              travel: carTravel(world.ride, mod(t + offset, total)),
              seat: world.tokenSize / 2,
            })
          }
          if (t <= laneSpan) {
            const point = laneAt(lane, t)
            const look: TokenLook = { color }
            if (t >= laneFire(lane) && world.work) Object.assign(look, world.work(contraption.name, state) ?? {})
            world.token(p, cell.size, sheet.ink, pen, look.color, point.x * cell.size, point.y * cell.size, look)
          }
        })
        p.pop()
      }
    }
    return entry
  })
}

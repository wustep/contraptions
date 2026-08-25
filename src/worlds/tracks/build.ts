import type p5 from 'p5'
import { ART_INSET } from '../../core/constants'
import { solid } from '../../core/draw'
import { easeInQuad, mod } from '../../core/ease'
import { layoutByName } from '../../core/layouts'
import { makeRng, type Rng } from '../../core/rng'
import { themeByName, type Theme } from '../../core/themes'
import type { Cell, Contraption, Instance } from '../../core/types'
import type { Composition, Options, Overlay } from '../../core/composition'
import { BY, D } from '../lanes'
import { reactors, type Face, type ReactorState } from './reactors'
import { LAND_R, dropoff, fall, flat, landing, liftBottom, liftShaft, liftTop, type SegState } from './segments'

/**
 * Framework B: tracks.
 *
 * Built from what framework A taught:
 *
 *  - Local edge contracts make continuity every machine's job. Fifteen
 *    machines each drew their own ball and agreed on a seam by convention; one
 *    bad constant and the ball would jump. Here the ball is drawn once, by the
 *    world, along a path that is the primary object. Machines never draw it.
 *  - A chain grown by search ends wherever the search happens to fail; it
 *    cannot close. A track is carved as a loop before anything is placed, so
 *    the ball is lifted back to the top and goes round for ever — the piece
 *    is a perpetual machine by construction, and the loop closes without a
 *    cup swallowing anything.
 *  - Timing fell out of transit sums and had no global shape. Here the
 *    circuit is the loop: N balls spaced evenly means every machine on the
 *    track sees a ball every 1/N of the loop, which is exactly the period the
 *    contract wants.
 *  - Causality needs contact. Reactors reach a feeler into the track and are
 *    knocked by the ball, rather than being told by a phase that it passed.
 */
export const TRACKS_LOOP = 720

type Side = 'N' | 'E' | 'S' | 'W'

interface Region {
  c0: number
  r0: number
  c1: number
  r1: number
}

interface TrackCell {
  col: number
  row: number
  in: Side
  out: Side
}

/** A point on the ball's path, in cell units from the cell centre. */
type Pt = [number, number]

interface Segment {
  cell: Cell
  track: TrackCell
  /** Polyline of the ball centre, in cell units, entry to exit. */
  path: Pt[]
  /** Fraction of the circuit spent here. */
  duration: number
  /** Circuit fraction at which the ball enters. */
  start: number
  /** True where the ball rides a bucket. */
  lift: boolean
}

const OPP: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' }
const DELTA: Record<Side, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }

/** Cut the grid into a few regions, each of which gets its own loop. */
function regions(res: number, rng: Rng): Region[] {
  const out: Region[] = [{ c0: 0, r0: 0, c1: res - 1, r1: res - 1 }]
  for (let i = 0; i < 3; i++) {
    out.sort((a, b) => (b.c1 - b.c0) * (b.r1 - b.r0) - (a.c1 - a.c0) * (a.r1 - a.r0))
    const big = out[0]
    const w = big.c1 - big.c0 + 1
    const h = big.r1 - big.r0 + 1
    if (w >= 9 && (w >= h || h < 7) && rng.bool(0.85)) {
      const at = rng.int(big.c0 + 4, big.c1 - 3)
      out.splice(0, 1, { ...big, c1: at }, { ...big, c0: at + 1 })
    } else if (h >= 7 && rng.bool(0.85)) {
      const at = rng.int(big.r0 + 3, big.r1 - 2)
      out.splice(0, 1, { ...big, r1: at }, { ...big, r0: at + 1 })
    } else break
  }
  return out
}

/**
 * Carve one closed loop: a lift up one side, and an even number of runs
 * zig-zagging down the rest, joined by drops. Returns the cells in circuit
 * order starting from the lift's top.
 */
function carve(region: Region, rng: Rng): TrackCell[] | null {
  const w = region.c1 - region.c0 + 1
  const h = region.r1 - region.r0 + 1
  if (w < 3 || h < 3) return null

  // Work with the lift on the left, then mirror if the coin says so.
  const onRight = rng.bool()
  const col = (c: number) => (onRight ? region.c1 - (c - region.c0) : c)
  const side = (s: Side): Side => (onRight ? (s === 'E' ? 'W' : s === 'W' ? 'E' : s) : s)

  const lift = region.c0
  const near = region.c0 + 1
  const far = region.c1
  const maxRuns = Math.min(6, 2 * Math.floor(h / 2))
  const runOptions = [2, 4, 6].filter((n) => n <= maxRuns)
  const runs = rng.weighted(runOptions, (n) => n * n)
  const interior: number[] = []
  const pool = rng.shuffle(Array.from({ length: h - 2 }, (_, i) => region.r0 + 1 + i))
  for (let i = 0; i < runs - 2; i++) interior.push(pool[i])
  const rows = [region.r0, ...interior.sort((a, b) => a - b), region.r1]

  const cells: TrackCell[] = []
  const push = (c: number, r: number, i: Side, o: Side) => cells.push({ col: col(c), row: r, in: side(i), out: side(o) })

  push(lift, region.r0, 'S', 'E')
  for (let i = 0; i < runs; i++) {
    const row = rows[i]
    const last = i === runs - 1
    if (i % 2 === 0) {
      // Eastward. Run 0 arrives from the lift; later even runs land from above.
      if (i > 0) push(near, row, 'N', 'E')
      for (let c = i > 0 ? near + 1 : near; c < far; c++) push(c, row, 'W', 'E')
      push(far, row, 'W', 'S')
      for (let r = row + 1; r < rows[i + 1]; r++) push(far, r, 'N', 'S')
    } else {
      push(far, row, 'N', 'W')
      for (let c = far - 1; c > near; c--) push(c, row, 'E', 'W')
      if (last) {
        push(near, row, 'E', 'W')
      } else {
        push(near, row, 'E', 'S')
        for (let r = row + 1; r < rows[i + 1]; r++) push(near, r, 'N', 'S')
      }
    }
  }
  push(lift, region.r1, 'E', 'N')
  for (let r = region.r1 - 1; r > region.r0; r--) push(lift, r, 'S', 'N')
  return cells
}

/** The ball's path through one cell and how long it takes, in canonical hand. */
function geometry(t: TrackCell): { path: Pt[]; weight: number; lift: boolean } {
  const horizontalIn = t.in === 'W' || t.in === 'E'
  const sx = (x: number) => (t.in === 'E' || t.out === 'W' ? -x : x)
  const arc = (from: number, to: number, n = 6): Pt[] =>
    Array.from({ length: n }, (_, i) => {
      const a = from + ((to - from) * (i + 1)) / n
      return [LAND_R + LAND_R * Math.cos(a), LAND_R * Math.sin(a)] as Pt
    })

  if (horizontalIn && (t.out === 'E' || t.out === 'W')) {
    return { path: [[sx(-0.5), BY], [sx(0.5), BY]], weight: 1, lift: false }
  }
  if (t.in === 'N' && (t.out === 'E' || t.out === 'W')) {
    const flipX = t.out === 'W'
    const path: Pt[] = [[0, -0.5], [0, 0], ...arc(Math.PI, Math.PI / 2), [0.5, BY]]
    return { path: path.map(([x, y]) => [flipX ? -x : x, y]), weight: 0.85, lift: false }
  }
  if (horizontalIn && t.out === 'S') {
    const flipX = t.in === 'E'
    const path: Pt[] = [[-0.5, BY], [-0.06, BY], [-0.03, BY + 0.06], [0, 0.5]]
    return { path: path.map(([x, y]) => [flipX ? -x : x, y]), weight: 0.8, lift: false }
  }
  if (t.in === 'N' && t.out === 'S') return { path: [[0, -0.5], [0, 0.5]], weight: 0.55, lift: false }
  if (t.in === 'S' && t.out === 'N') return { path: [[0, 0.5], [0, -0.5]], weight: 1.8, lift: true }
  if (horizontalIn && t.out === 'N') {
    const flipX = t.in === 'W'
    const path: Pt[] = [[0.5, BY], [0, BY], [0, -0.5]]
    return { path: path.map(([x, y]) => [flipX ? -x : x, y]), weight: 1.6, lift: true }
  }
  // S -> E / W: the lift's top.
  const flipX = t.out === 'W'
  const path: Pt[] = [[0, 0.5], [0, BY], [0.5, BY]]
  return { path: path.map(([x, y]) => [flipX ? -x : x, y]), weight: 1.4, lift: true }
}

/** Length of a polyline. */
const length = (path: Pt[]) =>
  path.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot(x - path[i][0], y - path[i][1]), 0)

/** Point at fraction `f` of a polyline's length. */
function along(path: Pt[], f: number): Pt {
  const total = length(path)
  let want = f * total
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1]
    const [x1, y1] = path[i]
    const d = Math.hypot(x1 - x0, y1 - y0)
    if (want <= d || i === path.length - 1) {
      const t = d === 0 ? 0 : Math.min(1, want / d)
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
    }
    want -= d
  }
  return path[path.length - 1]
}

/** Which contraption draws a track cell, and whether it is the mirrored hand. */
function segmentFor(t: TrackCell): { contraption: Contraption<SegState>; mirror: boolean } {
  if ((t.in === 'W' || t.in === 'E') && (t.out === 'E' || t.out === 'W')) return { contraption: flat, mirror: t.in === 'E' }
  if (t.in === 'N' && (t.out === 'E' || t.out === 'W')) return { contraption: landing, mirror: t.out === 'W' }
  if ((t.in === 'W' || t.in === 'E') && t.out === 'S') return { contraption: dropoff, mirror: t.in === 'E' }
  if (t.in === 'N' && t.out === 'S') return { contraption: fall, mirror: false }
  if (t.in === 'S' && t.out === 'N') return { contraption: liftShaft, mirror: false }
  if (t.out === 'N') return { contraption: liftBottom, mirror: t.in === 'W' }
  return { contraption: liftTop, mirror: t.out === 'W' }
}

export function buildTracks(options: Options, canvas: number): Composition {
  const theme = themeByName(options.theme)
  const rng = makeRng(`${options.seed}::tracks`)
  const area = Math.floor((canvas * ART_INSET) / options.res) * options.res
  const origin = Math.round((canvas - area) / 2)
  const cells = layoutByName('grid').build({ x: origin, y: origin, area, res: options.res, rng: rng.fork('layout') })
  const size = cells[0]?.size ?? 1
  const at = new Map<string, Cell>()
  for (const cell of cells) at.set(`${cell.col}:${cell.row}`, cell)
  const cellAt = (col: number, row: number) => at.get(`${col}:${row}`)

  const instances: Instance[] = []
  const overlays: Overlay[] = []
  const taken = new Set<Cell>()

  for (const [ri, region] of regions(options.res, rng.fork('regions')).entries()) {
    const regionRng = rng.fork(`region:${ri}`)
    const track = carve(region, regionRng)
    if (!track) continue
    const color = regionRng.pick(theme.colors)
    const balls = regionRng.pick([2, 2, 3, 3, 4])

    // Schedule: the circuit is one loop, split by segment weight.
    const segments: Segment[] = track.map((t) => {
      const g = geometry(t)
      return { cell: cellAt(t.col, t.row)!, track: t, path: g.path, duration: g.weight, start: 0, lift: g.lift }
    })
    const total = segments.reduce((sum, s) => sum + s.duration, 0)
    let acc = 0
    for (const s of segments) {
      s.duration /= total
      s.start = acc
      acc += s.duration
    }

    // Track cells.
    for (const s of segments) {
      const { contraption, mirror } = segmentFor(s.track)
      const cellRng = regionRng.fork(`cell:${s.cell.index}`)
      const state = contraption.setup({ rng: cellRng, size, w: size, h: size, theme, cell: s.cell, color: cellRng.pick(theme.colors) })
      let period = TRACKS_LOOP
      let phase = 0
      if (contraption === flat) {
        state.variant = cellRng.weighted(['rail', 'conveyor', 'gate'] as const, (v) => (v === 'rail' ? 3 : v === 'conveyor' ? 1.4 : 1))
        if (state.variant === 'gate') {
          // Local clock: a ball every 1/balls of the loop, u = 0 as it reaches the flap.
          period = TRACKS_LOOP / balls
          phase = mod(-Math.round((s.start + s.duration * 0.5) * TRACKS_LOOP), period)
        }
      }
      instances.push({
        contraption: contraption as Contraption<unknown>,
        state,
        cell: s.cell,
        angle: 0,
        mirror: mirror ? -1 : 1,
        phase,
        period,
        fireFrame: 0,
      })
      taken.add(s.cell)
    }

    // Reactors in the free cells alongside, touched off as the ball passes.
    const trackAt = new Map(segments.map((s) => [`${s.track.col}:${s.track.row}`, s]))
    for (const s of regionRng.shuffle(segments)) {
      if (s.lift) continue
      for (const face of regionRng.shuffle(['N', 'E', 'S', 'W'] as Side[])) {
        const [dx, dy] = DELTA[face]
        const col = s.track.col + dx
        const row = s.track.row + dy
        if (col < region.c0 || col > region.c1 || row < region.r0 || row > region.r1) continue
        const cell = cellAt(col, row)
        if (!cell || taken.has(cell) || trackAt.has(`${col}:${row}`)) continue
        // The reactor's feeler must reach the ball: above a run, beside a fall, below a run.
        const runs = s.track.in !== 'N' && s.track.out !== 'S'
        const falls = s.track.in === 'N' && s.track.out === 'S'
        const reactorFace = OPP[face] as Face
        const pool = reactors.filter((r) => r.faces.includes(reactorFace) && ((reactorFace === 'S' || reactorFace === 'N') ? runs : falls))
        if (!pool.length || !regionRng.bool(0.55)) continue
        const reactor = regionRng.pick(pool)
        const cellRng = regionRng.fork(`react:${cell.index}`)
        const state = reactor.setup({ rng: cellRng, size, w: size, h: size, theme, cell, color: cellRng.pick(theme.colors) }) as ReactorState
        state.face = reactorFace
        const period = TRACKS_LOOP / balls
        const pass = Math.round((s.start + s.duration * 0.5) * TRACKS_LOOP)
        instances.push({
          contraption: reactor as Contraption<unknown>,
          state,
          cell,
          angle: 0,
          mirror: 1,
          phase: mod(-pass, period),
          period,
          fireFrame: mod(pass, TRACKS_LOOP),
        })
        taken.add(cell)
        break
      }
    }

    // The balls, and the buckets that carry them up the lift.
    overlays.push(drawBalls(segments, balls, color, size))
  }

  return {
    options,
    theme,
    cells,
    instances,
    loop: TRACKS_LOOP,
    used: [...new Set(instances.map((i) => i.contraption.name))].sort(),
    captions: [],
    header: null,
    wires: [],
    overlays,
  }
}

function drawBalls(segments: Segment[], balls: number, color: string, size: number): Overlay {
  const locate = (t: number): { x: number; y: number; lift: boolean } => {
    const seg = segments.find((s) => t >= s.start && t < s.start + s.duration) ?? segments[segments.length - 1]
    let f = (t - seg.start) / seg.duration
    // Gravity: falls speed up, so the ball enters the next cell fast.
    if (seg.track.in === 'N' && seg.track.out === 'S') f = easeInQuad(f)
    const [px, py] = along(seg.path, f)
    return { x: seg.cell.x + px * size, y: seg.cell.y + py * size, lift: seg.lift && Math.abs(px) < 0.01 }
  }
  return (p: p5, loopFrame: number, { theme, weight }: { theme: Theme; weight: (size: number) => number }) => {
    const w = weight(size)
    for (let j = 0; j < balls; j++) {
      const t = mod(loopFrame / TRACKS_LOOP + j / balls, 1)
      const { x, y, lift } = locate(t)
      if (lift) {
        // A bucket under the ball while it rides the elevator.
        solid(p, theme.ink, w, theme.bg)
        p.rect(x, y + D * size * 0.62, D * size * 1.3, D * size * 0.3)
      }
      solid(p, theme.ink, w, color)
      p.circle(x, y, D * size)
    }
  }
}

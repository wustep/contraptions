import type p5 from 'p5'
import { ART_INSET } from '../../core/constants'
import { solid } from '../../core/draw'
import { mod } from '../../core/ease'
import { layoutByName } from '../../core/layouts'
import { makeRng, type Rng } from '../../core/rng'
import { themeByName, type Theme } from '../../core/themes'
import type { Cell, Contraption, Instance } from '../../core/types'
import { clampRes, type CatalogEntry, type Composition, type Options, type Overlay } from '../../core/composition'
import { D } from '../lanes'
import { reactors, type Face, type Reactor, type ReactorState } from './reactors'
import {
  along,
  bucket,
  drawTrack,
  duration,
  kindOf,
  pieces,
  type Kind,
  type Piece,
  type SegState,
  type Side,
  type TrackCell,
  type Variant,
} from './track'

/**
 * Framework B: tracks.
 *
 * Built from what framework A taught:
 *
 *  - Local edge contracts make continuity every machine's job. Fifteen
 *    machines each drew their own ball and agreed on a seam by convention; one
 *    bad constant and the ball would jump. Here the ball is drawn once, by the
 *    world, along a path that is the primary object. Machines never draw it,
 *    and the track cells draw *themselves* from the same path.
 *  - A chain grown by search ends wherever the search happens to fail; it
 *    cannot close. A track is carved as a loop before anything is placed, so
 *    the ball is lifted back to the top and goes round for ever — the piece
 *    is a perpetual machine by construction, and the loop closes without a
 *    cup swallowing anything.
 *  - Timing fell out of transit sums and had no global shape. Here the
 *    circuit is the clock: with N balls evenly spaced going round m/N times
 *    per loop, every machine on the track sees a ball every 1/m of the loop,
 *    which is exactly the period the contract wants.
 *  - Causality needs contact. Reactors reach a feeler into the track and are
 *    knocked by the ball, rather than being told by a phase that it passed.
 */
export const TRACKS_LOOP = 720

interface Region {
  c0: number
  r0: number
  c1: number
  r1: number
}

interface Segment {
  cell: Cell
  track: TrackCell
  kind: Kind
  mirror: boolean
  path: Piece[]
  /** Circuit fraction at which the ball enters, and how long it stays. */
  start: number
  span: number
}

const OPP: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' }
const DELTA: Record<Side, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }

/** Frames a ball spends crossing one plain run cell. Sets the absolute pace. */
const FRAMES_PER_CELL = 22

/** Divisors of the loop, so a reactor period always closes. */
const DIVISORS = Array.from({ length: TRACKS_LOOP }, (_, i) => i + 1).filter((d) => TRACKS_LOOP % d === 0)

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
  // Runs on every second row, so each pair has a free row between for the
  // reactors that hang under one and stand on the other. The count has to be
  // even to come back to the lift, so the last interior row goes if it must.
  const interior: number[] = []
  for (let row = region.r0 + 2; row <= region.r1 - 1; row += 2) interior.push(row)
  if (interior.length % 2 === 1) interior.pop()
  const runs = interior.length + 2
  if (h < 3) return carveFallback(region, rng, onRight)
  const rows = [region.r0, ...interior, region.r1]

  const cells: TrackCell[] = []
  const push = (c: number, r: number, i: Side, o: Side) => cells.push({ col: col(c), row: r, in: side(i), out: side(o) })

  push(lift, region.r0, 'S', 'E')
  for (let i = 0; i < runs; i++) {
    const row = rows[i]
    const last = i === runs - 1
    if (i % 2 === 0) {
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

/** Two runs only — always fits. */
function carveFallback(region: Region, rng: Rng, onRight: boolean): TrackCell[] {
  void rng
  const col = (c: number) => (onRight ? region.c1 - (c - region.c0) : c)
  const side = (s: Side): Side => (onRight ? (s === 'E' ? 'W' : s === 'W' ? 'E' : s) : s)
  const lift = region.c0
  const near = region.c0 + 1
  const far = region.c1
  const cells: TrackCell[] = []
  const push = (c: number, r: number, i: Side, o: Side) => cells.push({ col: col(c), row: r, in: side(i), out: side(o) })
  push(lift, region.r0, 'S', 'E')
  for (let c = near; c < far; c++) push(c, region.r0, 'W', 'E')
  push(far, region.r0, 'W', 'S')
  for (let r = region.r0 + 1; r < region.r1; r++) push(far, r, 'N', 'S')
  push(far, region.r1, 'N', 'W')
  for (let c = far - 1; c > near; c--) push(c, region.r1, 'E', 'W')
  push(near, region.r1, 'E', 'W')
  push(lift, region.r1, 'E', 'N')
  for (let r = region.r1 - 1; r > region.r0; r--) push(lift, r, 'S', 'N')
  return cells
}

/** Flip a canonical-hand path for a mirrored cell. */
const handed = (path: Piece[], mirror: boolean): Piece[] =>
  mirror ? path.map((piece) => ({ ...piece, from: [-piece.from[0], piece.from[1]], to: [-piece.to[0], piece.to[1]] })) : path

const trackContraption: Contraption<SegState> = {
  name: 'track',
  label: 'Track',
  rotations: [0],
  setup: ({ color }) => ({ color, kind: 'run', variant: 'rail' }),
  draw: (p, s, { size, u, ink, weight }) => drawTrack(p, s, size, u, ink, weight),
}

export function buildTracks(options: Options, canvas: number): Composition {
  const theme = themeByName(options.theme)
  const rng = makeRng(`${options.seed}::tracks`)
  // Never the raw dial: a cell has a legible range and the mode owns it.
  const res = clampRes(options.mode, options.res)
  const area = Math.floor((canvas * ART_INSET) / res) * res
  const origin = Math.round((canvas - area) / 2)
  const cells = layoutByName('grid').build({ x: origin, y: origin, area, res, rng: rng.fork('layout') })
  const size = cells[0]?.size ?? 1
  const at = new Map<string, Cell>()
  for (const cell of cells) at.set(`${cell.col}:${cell.row}`, cell)
  const cellAt = (col: number, row: number) => at.get(`${col}:${row}`)

  const instances: Instance[] = []
  const overlays: Overlay[] = []
  const taken = new Set<Cell>()

  for (const [ri, region] of regions(res, rng.fork('regions')).entries()) {
    const regionRng = rng.fork(`region:${ri}`)
    const track = carve(region, regionRng)
    if (!track) continue
    const color = regionRng.pick(theme.colors)

    // The circuit, timed by its geometry, then fitted to the loop: with N
    // balls going round m/N times per loop the piece repeats every loop and
    // a ball passes any point every LOOP/m frames.
    const segments: Segment[] = track.map((t) => {
      const { kind, mirror } = kindOf(t)
      return { cell: cellAt(t.col, t.row)!, track: t, kind, mirror, path: handed(pieces(kind), mirror), start: 0, span: 0 }
    })
    const unit = duration(pieces('run'))
    const total = segments.reduce((sum, s) => sum + duration(s.path), 0)
    const circuitFrames = (total / unit) * FRAMES_PER_CELL
    // Enough balls that a reactor is passed at least twice a loop however
    // long the circuit is, and never so many they crowd.
    const balls = Math.min(6, Math.max(regionRng.pick([2, 3, 3, 4]), Math.ceil((2 * circuitFrames) / TRACKS_LOOP)))
    const wantM = (TRACKS_LOOP / circuitFrames) * balls
    const m = DIVISORS.reduce((best, d) => (Math.abs(d - wantM) < Math.abs(best - wantM) ? d : best), 1)
    const period = TRACKS_LOOP / m
    let acc = 0
    for (const s of segments) {
      s.span = duration(s.path) / total
      s.start = acc
      acc += s.span
    }
    /** Frame at which ball 0 reaches circuit fraction f. */
    const passFrame = (f: number) => (f * balls * TRACKS_LOOP) / m

    // Track cells.
    for (const s of segments) {
      const cellRng = regionRng.fork(`cell:${s.cell.index}`)
      const state = trackContraption.setup({ rng: cellRng, size, w: size, h: size, theme, cell: s.cell, color: cellRng.pick(theme.colors) })
      state.kind = s.kind
      let phase = 0
      let instPeriod = TRACKS_LOOP
      if (s.kind === 'run') {
        state.variant = cellRng.weighted(['rail', 'conveyor', 'gate'] as Variant[], (v) => (v === 'rail' ? 3.2 : v === 'conveyor' ? 1.2 : 1))
        if (state.variant === 'gate') {
          instPeriod = period
          phase = mod(-Math.round(passFrame(s.start + s.span * 0.4)), period)
        }
      }
      instances.push({
        contraption: trackContraption as Contraption<unknown>,
        state,
        cell: s.cell,
        angle: 0,
        mirror: s.mirror ? -1 : 1,
        phase,
        period: instPeriod,
        fireFrame: 0,
      })
      taken.add(s.cell)
    }

    // Reactors in the free cells alongside, touched off as the ball passes.
    // Each is picked to differ from any reactor already in a neighbouring
    // cell, so a run does not end up lined with five of the same counter.
    const placed = new Map<string, string>()
    for (const s of regionRng.shuffle(segments)) {
      if (s.kind !== 'run' && s.kind !== 'fall') continue
      for (const face of regionRng.shuffle(['N', 'E', 'S', 'W'] as Side[])) {
        const [dx, dy] = DELTA[face]
        const col = s.track.col + dx
        const row = s.track.row + dy
        if (col < region.c0 || col > region.c1 || row < region.r0 || row > region.r1) continue
        const cell = cellAt(col, row)
        if (!cell || taken.has(cell)) continue
        const reactorFace = OPP[face] as Face
        const vertical = reactorFace === 'N' || reactorFace === 'S'
        if (vertical !== (s.kind === 'run')) continue
        const around = [placed.get(`${col - 1}:${row}`), placed.get(`${col + 1}:${row}`), placed.get(`${col}:${row - 1}`), placed.get(`${col}:${row + 1}`)]
        const pool = reactors.filter((r) => r.faces.includes(reactorFace) && !around.includes(r.name))
        if (!pool.length || !regionRng.bool(0.6)) continue
        const reactor = regionRng.pick(pool)
        const cellRng = regionRng.fork(`react:${cell.index}`)
        const state = reactor.setup({ rng: cellRng, size, w: size, h: size, theme, cell, color: cellRng.pick(theme.colors) }) as ReactorState
        state.face = reactorFace
        state.dir = s.track.out === 'E' || s.track.out === 'S' ? 1 : -1
        // Contact: a hanging feeler or pedal meets the ball mid-cell; a side
        // arm meets it a third of the way down the tube.
        const contact = s.start + s.span * (s.kind === 'run' ? 0.5 : 0.3)
        const pass = passFrame(contact)
        instances.push({
          contraption: reactor as Contraption<unknown>,
          state,
          cell,
          angle: 0,
          mirror: 1,
          phase: mod(-Math.round(pass), period),
          period,
          fireFrame: mod(Math.round(pass), TRACKS_LOOP),
        })
        taken.add(cell)
        placed.set(`${col}:${row}`, reactor.name)
        break
      }
    }

    overlays.push(drawBalls(segments, balls, m, color, size))
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
    unit: size,
  }
}

/** The balls of one region, and the buckets that carry them up the lift. */
function drawBalls(segments: Segment[], balls: number, m: number, color: string, size: number): Overlay {
  const locate = (t: number) => {
    const seg = segments.find((s) => t >= s.start && t < s.start + s.span) ?? segments[segments.length - 1]
    const f = (t - seg.start) / seg.span
    const { x, y, lift } = along(seg.path, f)
    return { x: seg.cell.x + x * size, y: seg.cell.y + y * size, lift }
  }
  return (p: p5, loopFrame: number, { theme, weight }: { theme: Theme; weight: (size: number) => number }) => {
    const w = weight(size)
    for (let j = 0; j < balls; j++) {
      const t = mod((loopFrame / TRACKS_LOOP) * (m / balls) + j / balls, 1)
      const { x, y, lift } = locate(t)
      if (lift) bucket(p, size, theme.ink, w, theme.bg, x, y)
      solid(p, theme.ink, w, color)
      p.circle(x, y, D * size)
    }
  }
}

/** Every track shape with a ball running through it, then every reactor. */
export function tracksCatalog(): CatalogEntry[] {
  const shapes: { kind: Kind; variant: Variant; label: string }[] = [
    { kind: 'run', variant: 'rail', label: 'Run' },
    { kind: 'run', variant: 'conveyor', label: 'Conveyor' },
    { kind: 'run', variant: 'gate', label: 'Gate' },
    { kind: 'landing', variant: 'rail', label: 'Landing' },
    { kind: 'drop', variant: 'rail', label: 'Drop' },
    { kind: 'fall', variant: 'rail', label: 'Tube' },
    { kind: 'liftIn', variant: 'rail', label: 'Lift In' },
    { kind: 'shaft', variant: 'rail', label: 'Lift' },
    { kind: 'liftOut', variant: 'rail', label: 'Lift Out' },
  ]
  const period = TRACKS_LOOP / 4
  const entries: CatalogEntry[] = shapes.map((shape) => ({
    contraption: trackContraption as Contraption<unknown>,
    label: shape.label,
    sub: 'track',
    period,
    state: (state) => {
      state.kind = shape.kind
      state.variant = shape.variant
    },
    overlay: (cell, { color }) => {
      const path = pieces(shape.kind)
      // The ball takes as long as it would on a real track, then the cell rests.
      const frames = (duration(path) / duration(pieces('run'))) * FRAMES_PER_CELL
      return (p, loopFrame, { theme, weight }) => {
        const f = mod(loopFrame, period) / frames
        if (f > 1) return
        const { x, y, lift } = along(path, f)
        const px = cell.x + x * cell.size
        const py = cell.y + y * cell.size
        const w = weight(cell.size)
        if (lift) bucket(p, cell.size, theme.ink, w, theme.bg, px, py)
        solid(p, theme.ink, w, color)
        p.circle(px, py, D * cell.size)
      }
    },
    // A gate's clock starts as the ball reaches the flap, 40% of the way across.
    phase: shape.variant === 'gate' ? -Math.round(FRAMES_PER_CELL * 0.4) : 0,
  }))
  for (const reactor of reactors) entries.push(reactorDemo(reactor, period))
  return entries
}

/**
 * A reactor shown with the piece of track it reacts to, and a ball going by:
 * a two-cell composite, the reactor on the side its face says.
 */
function reactorDemo(reactor: Reactor, period: number): CatalogEntry {
  const face = reactor.faces[0]
  const vertical = face === 'N' || face === 'S'
  const kind: Kind = vertical ? 'run' : 'fall'
  const path = pieces(kind)
  const contact = vertical ? 0.5 : 0.3
  const frames = (duration(path) / duration(pieces('run'))) * FRAMES_PER_CELL
  // Offsets of the reactor and the track cell from the composite's centre.
  const r: [number, number] = face === 'S' ? [0, -0.5] : face === 'N' ? [0, 0.5] : face === 'W' ? [0.5, 0] : [-0.5, 0]
  const t: [number, number] = [-r[0], -r[1]]

  const demo: Contraption<ReactorState> = {
    name: `demo-${reactor.name}`,
    label: reactor.label,
    span: vertical ? [1, 2] : [2, 1],
    rotations: [0],
    setup: (ctx) => {
      const s = reactor.setup({ ...ctx, w: ctx.size, h: ctx.size })
      s.face = face
      s.dir = 1
      return s
    },
    draw: (p, s, ctx) => {
      const k = ctx.size
      p.push()
      p.translate(t[0] * k, t[1] * k)
      drawTrack(p, { color: s.color, kind, variant: 'rail' }, k, ctx.u, ctx.ink, ctx.weight)
      p.pop()
      p.push()
      p.translate(r[0] * k, r[1] * k)
      reactor.draw(p, s, { ...ctx, w: k, h: k })
      p.pop()
    },
  }

  return {
    contraption: demo as Contraption<unknown>,
    label: reactor.label ?? reactor.name,
    sub: 'reactor',
    period,
    overlay: (cell, { color }) => (p, loopFrame, { theme, weight }) => {
      // The reactor's clock starts at contact, so the ball is at the contact
      // point on frame 0 and approaches it from just before.
      let local = mod(loopFrame, period)
      if (local > period / 2) local -= period
      const f = contact + local / frames
      if (f < 0 || f > 1) return
      const { x, y } = along(path, f)
      solid(p, theme.ink, weight(cell.size), color)
      p.circle(cell.x + (t[0] + x) * cell.size, cell.y + (t[1] + y) * cell.size, D * cell.size)
    },
  }
}

import type p5 from 'p5'
import { byName as classicByName } from '../../contraptions'
import { ART_INSET, LOOP } from '../../core/constants'
import type { Overlay } from '../../core/composition'
import { solid } from '../../core/draw'
import { mod } from '../../core/ease'
import { layoutByName } from '../../core/layouts'
import type { Rng } from '../../core/rng'
import type { Theme } from '../../core/themes'
import type { Cell, Contraption, Instance, Wire } from '../../core/types'
import { LINK_DELAY } from '../../core/wiring'
import { D } from '../lanes'
import { asContraption, PORTS_LOOP } from '../ports/build'
import { GN, portMachines } from '../ports/machines'
import type { Link, Port, PortMachine, Side } from '../ports/types'
import { reactors, type Face, type ReactorState } from '../tracks/reactors'
import {
  along,
  bucket,
  drawTrack,
  duration,
  kindOf,
  pieces,
  type Piece,
  type SegState,
  type Side as TrackSide,
  type TrackCell,
  type Variant,
} from '../tracks/track'

/**
 * A hand-placed world: the same three languages as the scatter modes, but
 * every machine, wire, and ball is put there on purpose.
 *
 *   port tree  — typed edge handoffs, converters, cups and bells
 *   track      — a closed loop, balls drawn by the world, reactors knocked
 *   classic    — independent machines, wired source-relay-sink chains
 */

export const PIECE_LOOP = 720

const DELTA: Record<Side, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
const OPPOSITE: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' }
const flip = (side: Side, mirror: boolean): Side =>
  mirror ? (side === 'E' ? 'W' : side === 'W' ? 'E' : side) : side

interface VPort {
  port: Port
  side: Side
  cell: [number, number]
}

function vports(machine: PortMachine<any>, mirror: boolean, which: 'ins' | 'outs'): VPort[] {
  const [sw] = machine.span ?? [1, 1]
  return machine[which].map((port) => {
    const [ox, oy] = port.cell ?? [0, 0]
    return {
      port,
      side: flip(port.side, mirror),
      cell: [mirror ? sw - 1 - ox : ox, oy] as [number, number],
    }
  })
}

const resolveT = (port: Port, state: unknown): number =>
  typeof port.t === 'function' ? port.t(state) : port.t

const portsByName = new Map(portMachines.map((m) => [m.name, m]))
const reactorsByName = new Map(reactors.map((r) => [r.name, r]))

const trackContraption: Contraption<SegState> = {
  name: 'track',
  label: 'Track',
  rotations: [0],
  setup: ({ color }) => ({ color, kind: 'run', variant: 'rail' }),
  draw: (p, s, { size, u, ink, weight }) => drawTrack(p, s, size, u, ink, weight),
}

const handed = (path: Piece[], mirror: boolean): Piece[] =>
  mirror
    ? path.map((piece) => ({
        ...piece,
        from: [-piece.from[0], piece.from[1]],
        to: [-piece.to[0], piece.to[1]],
      }))
    : path

/** A rectangle of track with a lift up one side. Circuit starts at the lift top. */
export function boxLoop(c0: number, r0: number, c1: number, r1: number, onRight = false): TrackCell[] {
  const col = (c: number) => (onRight ? c1 - (c - c0) : c)
  const side = (s: TrackSide): TrackSide => (onRight ? (s === 'E' ? 'W' : s === 'W' ? 'E' : s) : s)
  const cells: TrackCell[] = []
  const push = (c: number, r: number, i: TrackSide, o: TrackSide) =>
    cells.push({ col: col(c), row: r, in: side(i), out: side(o) })
  const lift = c0
  const far = c1
  push(lift, r0, 'S', 'E')
  for (let c = c0 + 1; c < far; c++) push(c, r0, 'W', 'E')
  push(far, r0, 'W', 'S')
  for (let r = r0 + 1; r < r1; r++) push(far, r, 'N', 'S')
  push(far, r1, 'N', 'W')
  for (let c = far - 1; c > lift; c--) push(c, r1, 'E', 'W')
  push(lift, r1, 'E', 'N')
  for (let r = r1 - 1; r > r0; r--) push(lift, r, 'S', 'N')
  return cells
}

/**
 * A lift plus zig-zag runs, the same grammar as tracks mode, with the lift
 * side chosen rather than rolled.
 */
export function zigLoop(c0: number, r0: number, c1: number, r1: number, onRight = false): TrackCell[] {
  const col = (c: number) => (onRight ? c1 - (c - c0) : c)
  const side = (s: TrackSide): TrackSide => (onRight ? (s === 'E' ? 'W' : s === 'W' ? 'E' : s) : s)
  const lift = c0
  const near = c0 + 1
  const far = c1
  const interior: number[] = []
  for (let row = r0 + 2; row <= r1 - 1; row += 2) interior.push(row)
  if (interior.length % 2 === 1) interior.pop()
  const rows = [r0, ...interior, r1]
  const cells: TrackCell[] = []
  const push = (c: number, r: number, i: TrackSide, o: TrackSide) =>
    cells.push({ col: col(c), row: r, in: side(i), out: side(o) })

  push(lift, r0, 'S', 'E')
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const last = i === rows.length - 1
    if (i % 2 === 0) {
      if (i > 0) push(near, row, 'N', 'E')
      for (let c = i > 0 ? near + 1 : near; c < far; c++) push(c, row, 'W', 'E')
      push(far, row, 'W', 'S')
      if (!last) for (let r = row + 1; r < rows[i + 1]; r++) push(far, r, 'N', 'S')
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
  push(lift, r1, 'E', 'N')
  for (let r = r1 - 1; r > r0; r--) push(lift, r, 'S', 'N')
  return cells
}

export interface PortNode {
  name: string
  col: number
  row: number
  /** Fill colour of the machine itself. */
  color?: string
  /** Token colour. Inherited down the tree; a latch can start a new one. */
  ball?: string
  /** Force a hand. Omit to pick the one that faces every child. */
  mirror?: boolean
  spin?: number
  kids?: PortNode[]
}

export interface ClassicOpts {
  color?: string
  phase?: number
  angle?: number
  mirror?: number
}

export interface FillOpts extends ClassicOpts {
  /** Inclusive column range to fill. */
  cols?: [number, number]
  /** Inclusive row range to fill. */
  rows?: [number, number]
}

export interface ReactorSpec {
  name: string
  col: number
  row: number
  face: Face
  color?: string
}

export interface TrackOpts {
  balls: number
  /** Circuits the set of balls complete per piece loop. Period is loop/m. */
  m: number
  color: string
  variants?: Record<string, Variant>
  reactors?: ReactorSpec[]
}

export interface PieceDef {
  name: string
  label: string
  story: string
  theme: string
  res: number
  stroke?: number
  place: (world: World) => void
}

export interface World {
  theme: Theme
  rng: Rng
  size: number
  res: number
  loop: number
  cells: Cell[]
  instances: Instance[]
  wires: Wire[]
  overlays: Overlay[]
  palette: string[]
  at(col: number, row: number): Cell
  claimed(col: number, row: number): boolean
  ports(root: PortNode, opts?: { arrive?: number; ball?: string }): Instance[]
  classic(name: string, col: number, row: number, opts?: ClassicOpts): Instance
  wire(members: Instance[], startFrame?: number, period?: number): Wire[]
  track(path: TrackCell[], opts: TrackOpts): void
  fill(name: string, opts?: FillOpts): Instance[]
}

export function createWorld(
  theme: Theme,
  rng: Rng,
  canvas: number,
  res: number,
  loop: number,
): World {
  const area = Math.floor((canvas * ART_INSET) / res) * res
  const origin = Math.round((canvas - area) / 2)
  const cells = layoutByName('grid').build({
    x: origin,
    y: origin,
    area,
    res,
    rng: rng.fork('layout'),
  })
  const size = cells[0]?.size ?? 1
  const byPos = new Map<string, Cell>()
  for (const cell of cells) byPos.set(`${cell.col}:${cell.row}`, cell)

  const taken = new Set<Cell>()
  const instances: Instance[] = []
  const wires: Wire[] = []
  const overlays: Overlay[] = []
  const palette = rng.fork('palette').shuffle(theme.colors)

  const at = (col: number, row: number): Cell => {
    const cell = byPos.get(`${col}:${row}`)
    if (!cell) throw new Error(`piece: no cell ${col},${row} on a ${res}×${res}`)
    return cell
  }

  const claim = (block: Cell[], label: string) => {
    for (const cell of block) {
      if (taken.has(cell)) throw new Error(`piece: ${label} overlaps ${cell.col},${cell.row}`)
      taken.add(cell)
    }
  }

  const merged = (col: number, row: number, w: number, h: number): { cell: Cell; block: Cell[] } => {
    const block: Cell[] = []
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) block.push(at(col + dx, row + dy))
    }
    const anchor = block[0]
    return {
      block,
      cell: {
        x: anchor.x + ((w - 1) * size) / 2,
        y: anchor.y + ((h - 1) * size) / 2,
        size,
        w: w * size,
        h: h * size,
        col,
        row,
        index: anchor.index,
        depth: 0,
      },
    }
  }

  const colorOf = (inst: Instance): string =>
    (inst.state as { color?: string } | null)?.color ?? palette[0]

  const world: World = {
    theme,
    rng,
    size,
    res,
    loop,
    cells,
    instances,
    wires,
    overlays,
    palette,
    at,
    claimed: (col, row) => taken.has(at(col, row)),

    ports(root, opts = {}) {
      const placed: Instance[] = []
      const arrive0 = opts.arrive ?? 0
      const ball0 = opts.ball ?? palette[0]

      const connect = (
        parent: { machine: PortMachine<any>; col: number; row: number; mirror: boolean; state: unknown },
        child: PortNode,
        childMirror: boolean,
      ): { out: VPort; inn: VPort } | null => {
        const childM = portsByName.get(child.name)
        if (!childM) return null
        for (const out of vports(parent.machine, parent.mirror, 'outs')) {
          const px = parent.col + out.cell[0] + DELTA[out.side][0]
          const py = parent.row + out.cell[1] + DELTA[out.side][1]
          for (const inn of vports(childM, childMirror, 'ins')) {
            const cx = child.col + inn.cell[0]
            const cy = child.row + inn.cell[1]
            if (
              px === cx &&
              py === cy &&
              out.port.kind === inn.port.kind &&
              inn.side === OPPOSITE[out.side]
            ) {
              return { out, inn }
            }
          }
        }
        return null
      }

      const chooseMirror = (
        node: PortNode,
        parent: { machine: PortMachine<any>; col: number; row: number; mirror: boolean; state: unknown } | null,
      ): boolean => {
        if (node.mirror !== undefined) return node.mirror
        const machine = portsByName.get(node.name)
        if (!machine) throw new Error(`piece: unknown port machine ${node.name}`)
        const tryMirror = (mirror: boolean) => {
          if (parent && !connect(parent, node, mirror)) return false
          for (const kid of node.kids ?? []) {
            const self = { machine, col: node.col, row: node.row, mirror, state: null }
            if (!connect(self, kid, kid.mirror ?? false) && !connect(self, kid, kid.mirror ?? true)) return false
          }
          return true
        }
        if (tryMirror(false)) return false
        if (tryMirror(true)) return true
        throw new Error(
          `piece: ${node.name}@${node.col},${node.row} has no facing that meets its neighbours`,
        )
      }

      const walk = (
        node: PortNode,
        arrival: number,
        parent: { machine: PortMachine<any>; col: number; row: number; mirror: boolean; state: unknown; link: Link } | null,
        chainBall: string,
      ): Instance => {
        const machine = portsByName.get(node.name)
        if (!machine) throw new Error(`piece: unknown port machine ${node.name}`)
        const [sw, sh] = machine.span ?? [1, 1]
        const mirror = chooseMirror(node, parent)
        const { cell, block } = merged(node.col, node.row, sw, sh)
        claim(block, `${node.name}@${node.col},${node.row}`)

        const cellRng = rng.fork(`port:${node.col}:${node.row}`)
        const fill = node.color ?? cellRng.pick(theme.colors)
        const state = machine.setup({
          rng: cellRng,
          size,
          w: cell.w,
          h: cell.h,
          theme,
          cell,
          color: fill,
        }) as Record<string, unknown>

        const inn = parent ? connect(parent, node, mirror) : null
        if (parent && !inn) {
          throw new Error(
            `piece: ${parent.machine.name}@${parent.col},${parent.row} does not meet ${node.name}@${node.col},${node.row}`,
          )
        }

        const kids = node.kids ?? []
        const childLinks: { kid: PortNode; out: VPort }[] = []
        const self = { machine, col: node.col, row: node.row, mirror, state }
        for (const kid of kids) {
          const kidMirror = kid.mirror ?? chooseMirror(kid, self)
          const joined = connect(self, kid, kidMirror)
          if (!joined) {
            throw new Error(
              `piece: ${node.name}@${node.col},${node.row} does not meet ${kid.name}@${kid.col},${kid.row}`,
            )
          }
          childLinks.push({ kid, out: joined.out })
        }

        const fromShaft = inn?.inn.port.kind === 'shaft' && parent?.link.drive ? parent.link : null
        const link: Link = {
          inSide: inn?.inn.side ?? null,
          outSides: childLinks.map((c) => c.out.side),
          ball: node.ball ?? chainBall,
          drive: machine.driver ? machine.driver.drive : fromShaft?.drive ?? null,
          spin: machine.driver ? (node.spin ?? 1) : fromShaft ? -fromShaft.spin : 0,
          camAt: machine.driver ? machine.driver.camAt : fromShaft?.camAt ?? 0,
          mesh: ((node.col + node.row) % 2) * (Math.PI / GN),
        }
        state.link = link

        const tIn = inn ? resolveT(inn.inn.port, state) : 0
        const phase = mod(Math.round(tIn * PORTS_LOOP - arrival), PORTS_LOOP)
        const inst: Instance = {
          contraption: asContraption(machine),
          state,
          cell,
          angle: 0,
          mirror: mirror ? -1 : 1,
          phase,
          period: PORTS_LOOP,
          fireFrame: mod(Math.round(arrival), loop),
        }
        instances.push(inst)
        placed.push(inst)

        for (const { kid, out } of childLinks) {
          const tOut = resolveT(out.port, state)
          walk(
            kid,
            arrival + (tOut - tIn) * PORTS_LOOP,
            { machine, col: node.col, row: node.row, mirror, state, link },
            kid.ball ?? link.ball,
          )
        }
        return inst
      }

      walk(root, arrive0, null, root.ball ?? ball0)
      return placed
    },

    classic(name, col, row, opts = {}) {
      const contraption = classicByName(name)
      if (!contraption) throw new Error(`piece: unknown classic machine ${name}`)
      const [sw, sh] = contraption.span ?? [1, 1]
      const { cell, block } = merged(col, row, sw, sh)
      claim(block, `${name}@${col},${row}`)
      const cellRng = rng.fork(`classic:${col}:${row}`)
      const period = contraption.period ?? LOOP
      const phase = opts.phase ?? (col * 19 + row * 37) % period
      const inst: Instance = {
        contraption,
        state: contraption.setup({
          rng: cellRng,
          size,
          w: cell.w,
          h: cell.h,
          theme,
          cell,
          color: opts.color ?? cellRng.pick(theme.colors),
        }),
        cell,
        angle: opts.angle ?? 0,
        mirror: opts.mirror ?? 1,
        phase,
        period,
        fireFrame: 0,
      }
      instances.push(inst)
      return inst
    },

    wire(members, startFrame = 0, period = LOOP) {
      members.forEach((inst, k) => {
        const fireFrame = (startFrame + k * LINK_DELAY) % period
        inst.fireFrame = fireFrame
        inst.phase = Math.round((inst.contraption.fireAt ?? 0) * inst.period - fireFrame)
      })
      const added: Wire[] = []
      for (let k = 0; k < members.length - 1; k++) {
        const w: Wire = {
          from: members[k].cell,
          to: members[k + 1].cell,
          start: members[k].fireFrame,
          end: members[k].fireFrame + LINK_DELAY,
          color: colorOf(members[k]),
          last: k === members.length - 2,
          period,
        }
        wires.push(w)
        added.push(w)
      }
      return added
    },

    track(path, opts) {
      const segments = path.map((t) => {
        const { kind, mirror } = kindOf(t)
        return {
          cell: at(t.col, t.row),
          track: t,
          kind,
          mirror,
          path: handed(pieces(kind), mirror),
          start: 0,
          span: 0,
        }
      })
      const total = segments.reduce((sum, s) => sum + duration(s.path), 0)
      let acc = 0
      for (const s of segments) {
        s.span = duration(s.path) / total
        s.start = acc
        acc += s.span
      }
      const { balls, m, color } = opts
      const period = loop / m
      if (loop % m !== 0) throw new Error(`piece: m=${m} must divide the loop ${loop}`)
      const passFrame = (f: number) => (f * balls * loop) / m

      for (const s of segments) {
        const cellRng = rng.fork(`track:${s.cell.col}:${s.cell.row}`)
        const state = trackContraption.setup({
          rng: cellRng,
          size,
          w: size,
          h: size,
          theme,
          cell: s.cell,
          color: cellRng.pick(theme.colors),
        })
        state.kind = s.kind
        const key = `${s.track.col},${s.track.row}`
        state.variant = opts.variants?.[key] ?? (s.kind === 'run' ? 'rail' : 'rail')
        let phase = 0
        let instPeriod = loop
        if (s.kind === 'run' && state.variant === 'gate') {
          instPeriod = period
          phase = mod(-Math.round(passFrame(s.start + s.span * 0.4)), period)
        }
        claim([s.cell], `track@${s.track.col},${s.track.row}`)
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
      }

      for (const spec of opts.reactors ?? []) {
        const reactor = reactorsByName.get(spec.name)
        if (!reactor) throw new Error(`piece: unknown reactor ${spec.name}`)
        const face = spec.face
        const [dx, dy] = DELTA[face as Side]
        const neighbour = segments.find((s) => s.track.col === spec.col + dx && s.track.row === spec.row + dy)
        if (!neighbour) throw new Error(`piece: reactor ${spec.name}@${spec.col},${spec.row} has no track on face ${face}`)
        const cell = at(spec.col, spec.row)
        const cellRng = rng.fork(`react:${spec.col}:${spec.row}`)
        const state = reactor.setup({
          rng: cellRng,
          size,
          w: size,
          h: size,
          theme,
          cell,
          color: spec.color ?? cellRng.pick(theme.colors),
        }) as ReactorState
        state.face = face
        state.dir = neighbour.track.out === 'E' || neighbour.track.out === 'S' ? 1 : -1
        const contact = neighbour.start + neighbour.span * (neighbour.kind === 'run' ? 0.5 : 0.3)
        const pass = passFrame(contact)
        claim([cell], `${spec.name}@${spec.col},${spec.row}`)
        instances.push({
          contraption: reactor as Contraption<unknown>,
          state,
          cell,
          angle: 0,
          mirror: 1,
          phase: mod(-Math.round(pass), period),
          period,
          fireFrame: mod(Math.round(pass), loop),
        })
      }

      overlays.push(drawBalls(segments, balls, m, color, size, loop))
    },

    fill(name, opts = {}) {
      const added: Instance[] = []
      for (const cell of cells) {
        if (taken.has(cell)) continue
        if (opts.cols && (cell.col < opts.cols[0] || cell.col > opts.cols[1])) continue
        if (opts.rows && (cell.row < opts.rows[0] || cell.row > opts.rows[1])) continue
        added.push(
          world.classic(name, cell.col, cell.row, {
            color: opts.color ?? palette[(cell.col + 2 * cell.row) % palette.length],
            phase: opts.phase,
            angle: opts.angle ?? ((cell.col + cell.row) % 2) * (Math.PI / 2),
            mirror: opts.mirror,
          }),
        )
      }
      return added
    },
  }

  return world
}

interface Seg {
  cell: Cell
  path: Piece[]
  start: number
  span: number
}

function drawBalls(segments: Seg[], balls: number, m: number, color: string, size: number, loop: number): Overlay {
  const locate = (t: number) => {
    const seg = segments.find((s) => t >= s.start && t < s.start + s.span) ?? segments[segments.length - 1]
    const f = (t - seg.start) / seg.span
    const { x, y, lift } = along(seg.path, f)
    return { x: seg.cell.x + x * size, y: seg.cell.y + y * size, lift }
  }
  return (p: p5, loopFrame: number, { theme, weight }) => {
    const w = weight(size)
    for (let j = 0; j < balls; j++) {
      const t = mod((loopFrame / loop) * (m / balls) + j / balls, 1)
      const { x, y, lift } = locate(t)
      if (lift) bucket(p, size, theme.ink, w, theme.bg, x, y)
      solid(p, theme.ink, w, color)
      p.circle(x, y, D * size)
    }
  }
}


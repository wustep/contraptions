import { ART_INSET, LOOP } from '../../core/constants'
import { layoutByName } from '../../core/layouts'
import { makeRng, type Rng } from '../../core/rng'
import { themeByName } from '../../core/themes'
import type { Cell, Contraption, Instance } from '../../core/types'
import type { CatalogEntry, Composition, Options } from '../../core/composition'
import { mod } from '../../core/ease'
import { GN, STEADY, portMachines } from './machines'
import type { Link, Port, PortMachine, Side } from './types'

/**
 * Framework A's composer.
 *
 * Chains are grown by depth-first search from a source. At every step the
 * machine's out-ports name what must be on the far side of each edge, and a
 * neighbour is chosen from the variants that accept exactly that. A machine is
 * kept only if every one of its out-ports can be satisfied in turn, so no chain
 * ever runs off into nothing: it ends in a cup or a bell.
 *
 * Timing is assigned afterwards, exactly as classic chains do it: each
 * machine's phase is chosen so the token crosses each edge at the frame the
 * neighbour expects it. A shaft train shares one phase and one drive function
 * down its whole length, with the spin alternating at each mesh.
 */
const DELTA: Record<Side, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }
const OPPOSITE: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' }

interface Variant {
  machine: PortMachine<any>
  mirror: boolean
}

interface VPort {
  port: Port
  side: Side
  cell: [number, number]
}

interface Node {
  variant: Variant
  anchor: Cell
  block: Cell[]
  inPort: VPort | null
  children: { out: VPort; node: Node }[]
}

const flip = (side: Side, mirror: boolean): Side =>
  mirror ? (side === 'E' ? 'W' : side === 'W' ? 'E' : side) : side

function vports(variant: Variant, ports: Port[]): VPort[] {
  const [sw] = variant.machine.span ?? [1, 1]
  return ports.map((port) => {
    const [ox, oy] = port.cell ?? [0, 0]
    return {
      port,
      side: flip(port.side, variant.mirror),
      cell: [variant.mirror ? sw - 1 - ox : ox, oy],
    }
  })
}

const variants: Variant[] = portMachines.flatMap((machine) =>
  machine.mirror === false
    ? [{ machine, mirror: false }]
    : [
        { machine, mirror: false },
        { machine, mirror: true },
      ],
)

const isSink = (m: PortMachine<any>) => m.outs.length === 0

/** Cache the engine-facing adapter per machine, so `used` and solo stay by name. */
const adapters = new Map<PortMachine<any>, Contraption<unknown>>()
export function asContraption(machine: PortMachine<any>): Contraption<unknown> {
  let c = adapters.get(machine)
  if (!c) {
    c = {
      name: machine.name,
      label: machine.label,
      span: machine.span,
      rotations: [0],
      setup: machine.setup,
      draw: machine.draw as Contraption<unknown>['draw'],
    }
    adapters.set(machine, c)
  }
  return c
}

const resolveT = (port: Port, state: unknown): number =>
  typeof port.t === 'function' ? port.t(state) : port.t

export function buildPorts(options: Options, canvas: number): Composition {
  const theme = themeByName(options.theme)
  const rng = makeRng(`${options.seed}::ports`)
  const area = Math.floor((canvas * ART_INSET) / options.res) * options.res
  const origin = Math.round((canvas - area) / 2)
  // Tokens cross edges, so the cells have to share them: always a plain grid.
  const cells = layoutByName('grid').build({
    x: origin,
    y: origin,
    area,
    res: options.res,
    rng: rng.fork('layout'),
  })
  const size = cells[0]?.size ?? 1

  const at = new Map<string, Cell>()
  const key = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`
  for (const cell of cells) at.set(key(cell.x, cell.y), cell)
  const neighbour = (cell: Cell, dx: number, dy: number) =>
    at.get(key(cell.x + dx * size, cell.y + dy * size))

  const claimed = new Set<Cell>()

  const claimBlock = (anchor: Cell, variant: Variant): Cell[] | null => {
    const [w, h] = variant.machine.span ?? [1, 1]
    const block: Cell[] = []
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const found = neighbour(anchor, dx, dy)
        if (!found || claimed.has(found)) return null
        block.push(found)
      }
    }
    return block
  }

  const release = (node: Node) => {
    for (const cell of node.block) claimed.delete(cell)
    for (const child of node.children) release(child.node)
  }

  /** Weighted shuffle: draw without replacement, heavier items tending to come first. */
  const order = <T,>(items: T[], weight: (item: T) => number, r: Rng): T[] =>
    items
      .map((item) => ({ item, k: Math.pow(r.next(), 1 / Math.max(1e-6, weight(item))) }))
      .filter((e) => weight(e.item) > 0)
      .sort((a, b) => b.k - a.k)
      .map((e) => e.item)

  /**
   * How much a machine wants to be next. `depth` is the chain so far and
   * `gears` the run of plain gears just behind this slot: a gear train is
   * padding, so it is allowed to be short and then must turn into something.
   */
  const candidateWeight = (variant: Variant, depth: number, gears: number): number => {
    const m = variant.machine
    if (isSink(m)) return depth < 4 ? 0.02 : depth < 7 ? 0.4 : depth < 10 ? 1.2 : 5
    if (depth >= 16) return 0
    if (m.pickOne) return gears >= 3 ? 0 : 0.8 * Math.pow(0.5, gears)
    if (m.name === 'cam') return 1.2 + gears * 0.6
    if (m.span) return 0.7
    return 1
  }

  function growFrom(out: VPort, fromAnchor: Cell, depth: number, gears: number, r: Rng): Node | null {
    const [dx, dy] = DELTA[out.side]
    const target = neighbour(fromAnchor, out.cell[0] + dx, out.cell[1] + dy)
    if (!target || claimed.has(target)) return null
    const want = OPPOSITE[out.side]

    type Choice = { variant: Variant; inPort: VPort }
    const choices: Choice[] = []
    for (const variant of variants) {
      for (const inPort of vports(variant, variant.machine.ins)) {
        if (inPort.side === want && inPort.port.kind === out.port.kind) choices.push({ variant, inPort })
      }
    }
    for (const choice of order(choices, (c) => candidateWeight(c.variant, depth, gears), r)) {
      const anchor = neighbour(target, -choice.inPort.cell[0], -choice.inPort.cell[1])
      if (!anchor) continue
      const node = grow(anchor, choice.variant, choice.inPort, depth, gears, r)
      if (node) return node
    }
    return null
  }

  function grow(anchor: Cell, variant: Variant, inPort: VPort | null, depth: number, gears: number, r: Rng): Node | null {
    const block = claimBlock(anchor, variant)
    if (!block) return null
    for (const cell of block) claimed.add(cell)
    const node: Node = { variant, anchor, block, inPort, children: [] }
    const nextGears = variant.machine.pickOne ? gears + 1 : 0

    const outs = vports(variant, variant.machine.outs).filter((o) => o.side !== inPort?.side)
    if (variant.machine.pickOne) {
      for (const out of r.shuffle(outs)) {
        const child = growFrom(out, anchor, depth + 1, nextGears, r)
        if (child) {
          node.children.push({ out, node: child })
          return node
        }
      }
      release(node)
      return null
    }
    for (const out of r.shuffle(outs)) {
      const child = growFrom(out, anchor, depth + 1, nextGears, r)
      if (!child) {
        release(node)
        return null
      }
      node.children.push({ out, node: child })
    }
    return node
  }

  const count = (node: Node): number => 1 + node.children.reduce((n, c) => n + count(c.node), 0)

  // Grow the chains.
  const roots: Node[] = []
  const sources = variants.filter((v) => v.machine.source)
  const target = Math.max(1, Math.round((cells.length / 16) * (0.3 + options.chains * 1.4)))
  const growRng = rng.fork('grow')
  for (const start of growRng.shuffle(cells)) {
    if (roots.length >= target) break
    if (claimed.has(start)) continue
    const source = growRng.weighted(sources, (v) => v.machine.source ?? 0)
    const root = grow(start, source, null, 0, 0, growRng.fork(`chain:${start.index}`))
    if (!root) continue
    if (count(root) < 4) {
      release(root)
      continue
    }
    roots.push(root)
  }

  // Assign phases and build instances.
  const instances: Instance[] = []

  function realize(node: Node, arrival: number, parent: Link | null, chainBall: string, r: Rng): void {
    const { machine } = node.variant
    const [w, h] = machine.span ?? [1, 1]
    const { anchor } = node
    const cell: Cell = {
      x: anchor.x + ((w - 1) * size) / 2,
      y: anchor.y + ((h - 1) * size) / 2,
      size,
      w: w * size,
      h: h * size,
      col: anchor.col,
      row: anchor.row,
      index: anchor.index,
      depth: anchor.depth,
    }
    const cellRng = r.fork(`cell:${anchor.index}`)
    const state = machine.setup({
      rng: cellRng,
      size,
      w: cell.w,
      h: cell.h,
      theme,
      cell,
      color: cellRng.pick(theme.colors),
    }) as Record<string, unknown>

    const fromShaft = node.inPort?.port.kind === 'shaft' && parent?.drive ? parent : null
    const link: Link = {
      inSide: node.inPort?.side ?? null,
      outSides: node.children.map((c) => c.out.side),
      ball: chainBall,
      drive: machine.driver ? machine.driver.drive : fromShaft?.drive ?? null,
      spin: machine.driver ? cellRng.sign() : fromShaft ? -fromShaft.spin : 0,
      camAt: machine.driver ? machine.driver.camAt : fromShaft?.camAt ?? 0,
      mesh: ((anchor.col + anchor.row) % 2) * (Math.PI / GN),
    }
    state.link = link

    const tIn = node.inPort ? resolveT(node.inPort.port, state) : 0
    const phase = mod(Math.round(tIn * LOOP - arrival), LOOP)
    instances.push({
      contraption: asContraption(machine),
      state,
      cell,
      angle: 0,
      mirror: node.variant.mirror ? -1 : 1,
      phase,
      period: LOOP,
      fireFrame: mod(Math.round(arrival), LOOP),
    })

    for (const child of node.children) {
      const tOut = resolveT(child.out.port, state)
      realize(child.node, arrival + (tOut - tIn) * LOOP, link, chainBall, r)
    }
  }

  const timeRng = rng.fork('time')
  for (const root of roots) {
    realize(root, timeRng.int(0, LOOP), null, timeRng.pick(theme.colors), timeRng.fork(`chain:${root.anchor.index}`))
  }

  return {
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
  }
}

/**
 * One of everything, wired as if it sat in the middle of a chain. Shown at
 * double speed so the ball comes round often enough to catch.
 */
export function portsCatalog(): CatalogEntry[] {
  return portMachines.map((machine) => {
    // What the machine turns its input into, in a word or two: a converter
    // names its output, a carrier names what it carries.
    const name = (k: string) => (k === 'shaft' ? 'gear' : k)
    const inKind = machine.ins[0]?.kind
    const outKind = machine.outs[0]?.kind
    const sub = !inKind ? 'source' : !outKind ? 'sink' : inKind === outKind ? name(inKind) : `to ${name(outKind)}`
    return {
      contraption: asContraption(machine),
      label: machine.label,
      sub,
      period: LOOP / 2,
      state: (state, { color }) => {
        const inPort = machine.ins[0] ?? null
        const shaft = machine.driver ?? (inPort?.kind === 'shaft' ? STEADY : null)
        const link: Link = {
          inSide: inPort?.side ?? null,
          outSides: machine.pickOne ? ['E'] : machine.outs.map((o) => o.side),
          ball: color,
          drive: shaft?.drive ?? null,
          spin: 1,
          camAt: shaft?.camAt ?? 0,
          mesh: 0,
        }
        state.link = link
      },
    }
  })
}

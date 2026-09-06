import { build, catalogFor, defaultOptions, type Mode } from '../src/core/composition'
import { LOOP } from '../src/core/constants'
import { mod } from '../src/core/ease'
import { laneAt, laneFire } from '../src/core/lane'
import { beltTravel } from '../src/contraptions/workshop/shop'
import { CASCADE } from '../src/worlds/goldberg/cascade'
import { lookAt, tokensAt, type WorldSpec } from '../src/worlds/goldberg/laneworld'
import { cuePath, sharedEdge } from '../src/worlds/goldberg/programme'
import { RUBE } from '../src/worlds/goldberg/rube'
import { WORKSHOP } from '../src/worlds/goldberg/workshop'
import { portMachines } from '../src/worlds/ports/machines'
import type { Link, Port, Side } from '../src/worlds/ports/types'

type Check = (name: string, ok: boolean, detail?: string) => void
const close = (a: number, b: number) => Math.abs(a - b) < 1e-7
const worlds: [Mode, WorldSpec][] = [['cascade', CASCADE], ['workshop', WORKSHOP], ['rube', RUBE]]

export function checkConnectivity(check: Check): void {
  console.log('\nidentity and physical connections')
  for (const [mode, world] of worlds) {
    const comp = build({ ...defaultOptions, mode, seed: 'identity', res: 6, chains: 1 }, 900)
    const run = comp.lanes!
    let stable = true, continuous = true, periodic = true, seen = 0
    const gap = run.emit * LOOP
    for (const frame of [-gap, 0, gap, LOOP, LOOP * 2]) {
      const before = tokensAt(run, frame - 1e-5)
      const after = tokensAt(run, frame + 1e-5)
      for (const a of before) {
        const b = after.find((b) => a.id === b.id)
        if (!b) continue
        seen++
        stable &&= a.color === b.color
        continuous &&= Math.hypot(a.x - b.x, a.y - b.y) < 0.001
      }
      const now = tokensAt(run, frame)
      const next = tokensAt(run, frame + LOOP)
      periodic &&= now.length === next.length && now.every((a, i) =>
        close(a.x, next[i].x) && close(a.y, next[i].y) && a.color === next[i].color)
    }
    check(`${mode}: emission identity and colour survive clock wraps`, stable && seen > 0)
    check(`${mode}: existing tokens move continuously through emission resets`, continuous)
    check(`${mode}: token geometry and colour close in the export loop`, periodic)

    // Follow one identified token across every machine boundary, including lifts.
    check(`${mode}: one token keeps its identity across every handoff`, run.cells.slice(1).every((cell) => {
      const a = tokensAt(run, cell.start * LOOP - 1e-5).find((token) => token.id === 0)
      const b = tokensAt(run, cell.start * LOOP + 1e-5).find((token) => token.id === 0)
      return !!a && !!b && a.color === b.color && Math.hypot(a.x - b.x, a.y - b.y) < 0.001
    }))

    const filters = [
      ...catalogFor(mode).map((c) => ({ solo: c.name, tag: null })),
      ...[...new Set(catalogFor(mode).flatMap((c) => c.tags ?? []))].map((tag) => ({ tag, solo: null })),
    ]
    let supported = true, joined = true, complete = true
    for (const filter of filters) {
      const filtered = build({ ...defaultOptions, mode, seed: 'filtered-transport', res: 6, chains: 1, ...filter }, 900).lanes!
      complete &&= !!filtered && filtered.cells.length > 2
      if (!filtered) continue
      for (let i = 0; i < filtered.cells.length; i++) {
        const here = filtered.cells[i]
        const expected = here.role === 'feeder' ? world.names.feeders
          : here.role === 'sink' ? world.names.endings
          : here.role === 'station' || here.role === 'filler' ? null : [world.names[here.role]]
        if (expected) supported &&= expected.includes(here.name)
        if (!i) continue
        const prev = filtered.cells[i - 1]
        const end = laneAt(prev.lane, prev.span)
        const start = laneAt(here.lane, 0)
        joined &&= close(prev.cell.x + end.x * filtered.size, here.cell.x + start.x * filtered.size)
          && close(prev.cell.y + end.y * filtered.size, here.cell.y + start.y * filtered.size)
      }
    }
    check(`${mode}: every Solo and Tag preserves real feeder, transport and ending`, supported && complete)
    check(`${mode}: every filtered handoff meets geometrically`, joined)

    if (mode === 'workshop') {
      check('workshop: every bench shares the conveyor clock', [0, 13.25, 119.99, 120, 239.99].every((frame) =>
        comp.instances.every((instance) => close(
          beltTravel(instance.state, mod(frame + instance.phase, instance.period) / instance.period),
          mod(frame / instance.period, 1),
        ))))
      const worked = build({ ...defaultOptions, mode, seed: 'work', res: 6, chains: 1, solo: 'dip' }, 900).lanes!
      const dip = worked.cells.find((cell) => cell.name === 'dip')!
      const fire = dip.start + laneFire(dip.lane)
      const before = lookAt(worked, world, fire - 1e-4, '#unchanged')
      const after = lookAt(worked, world, fire + 1e-4, '#unchanged')
      check('workshop: dye changes only when the dip works the part', before.color === '#unchanged' && after.color === dip.state.dye)
    }
  }

  // Verify the actual paired ports, including mirrored and multi-cell ones.
  const flip = (s: Side, mirror: number): Side => mirror > 0 ? s : s === 'E' ? 'W' : s === 'W' ? 'E' : s
  const opposite: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' }
  const offset: Record<Side, [number, number]> = { N: [0, -0.5], S: [0, 0.5], E: [0.5, 0], W: [-0.5, 0] }
  let seamCount = 0, aligned = true
  for (const seed of ['ports', 'mirror', 'arcs', 'handoff', 'astra-feel']) {
    const comp = build({ ...defaultOptions, mode: 'ports', seed, res: 14, chains: 1 }, 900)
    const placed = comp.instances.map((instance) => ({ instance, machine: portMachines.find((m) => m.name === instance.contraption.name)! }))
    const edge = ({ instance, machine }: typeof placed[number], port: Port) => {
      const [w, h] = machine.span ?? [1, 1]
      const [col, row] = port.cell ?? [0, 0]
      const [dx, dy] = offset[port.side]
      return [instance.cell.x + instance.mirror * (col + 0.5 - w / 2 + dx) * instance.cell.size,
        instance.cell.y + (row + 0.5 - h / 2 + dy) * instance.cell.size]
    }
    const crossing = (item: typeof placed[number], port: Port) =>
      (typeof port.t === 'function' ? port.t(item.instance.state) : port.t) * LOOP - item.instance.phase
    for (const from of placed) for (const out of from.machine.outs) {
      const side = flip(out.side, from.instance.mirror)
      const link = (from.instance.state as { link: Link }).link
      if (!link.outSides.includes(side)) continue
      const point = edge(from, out)
      const receivers = placed.flatMap((to) => to.machine.ins.flatMap((input) => {
        const state = to.instance.state as { link: Link }
        const there = edge(to, input)
        return input.kind === out.kind && state.link.inSide === opposite[side]
          && flip(input.side, to.instance.mirror) === opposite[side]
          && close(point[0], there[0]) && close(point[1], there[1]) ? [{ to, input }] : []
      }))
      aligned &&= receivers.length === 1
      for (const { to, input } of receivers) {
        const error = mod(crossing(from, out) - crossing(to, input), LOOP)
        aligned &&= Math.min(error, LOOP - error) < 1e-7
        seamCount++
      }
    }
  }
  check('ports: paired edge drawings cross on exactly the same fractional frame', aligned && seamCount > 20, `${seamCount} seams`)

  for (const res of [3, 6, 12]) {
    const comp = build({ ...defaultOptions, mode: 'circus', seed: 'connected-bill', res, chains: 1, spans: 0.8 }, 900)
    const reached = new Set(comp.wires.flatMap((wire) => [wire.from, wire.to]))
    const incoming = new Set(comp.wires.map((wire) => wire.to))
    const root = [...reached].filter((cell) => !incoming.has(cell))
    const walked = new Set(root)
    for (const wire of comp.wires) if (walked.has(wire.from)) walked.add(wire.to)
    check(`circus@${res}: one drive reaches all acts including spans`, root.length === 1 && walked.size === comp.instances.length && comp.wires.length === comp.instances.length - 1)
    check(`circus@${res}: drive routes stay on the connected acts' perimeters`, comp.wires.every((wire) => {
      if (!sharedEdge(wire.from, wire.to)) return false
      const path = cuePath(wire.from, wire.to)
      return path.every(([x, y]) => [wire.from, wire.to].some((c) =>
        x >= c.x - c.w / 2 - 1e-7 && x <= c.x + c.w / 2 + 1e-7 && y >= c.y - c.h / 2 - 1e-7 && y <= c.y + c.h / 2 + 1e-7
        && (close(Math.abs(x - c.x), c.w / 2) || close(Math.abs(y - c.y), c.h / 2))))
        && path.slice(1).every((p, i) => close(p[0], path[i][0]) || close(p[1], path[i][1]))
    }))
  }
}

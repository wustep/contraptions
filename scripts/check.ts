/**
 * Headless smoke test for the parts of the generator that are pure logic.
 *
 * Everything here runs without a browser, which is the point: composition,
 * phasing and the chain grammar are exactly the kind of thing that typechecks
 * cleanly and is still wrong, and none of it needs a canvas to be wrong on.
 *
 *   npm run check
 */
import { build, catalogFor, defaultOptions, MODES } from '../src/core/composition'
import { LOOP } from '../src/core/constants'
import { pendulum, swing } from '../src/core/physics'
import { registry } from '../src/contraptions'
import type { Contraption, Instance } from '../src/core/types'
import type { Flow } from '../src/core/wiring'
import type { Line } from '../src/contraptions/workshop/shop'
import { portMachines } from '../src/worlds/ports/machines'
import type { Link } from '../src/worlds/ports/types'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok   ${name}`)
    return
  }
  failures++
  console.log(`  FAIL ${name}${detail ? `   ${detail}` : ''}`)
}

console.log('\nphysics')
const amplitude = 0.8
const table = pendulum(amplitude)
check('peaks at the amplitude', Math.abs(swing(table, 0) - amplitude) < 1e-6)
check('crosses zero at the quarter', Math.abs(swing(table, 0.25)) < 1e-6)
check('is antisymmetric across the half', Math.abs(swing(table, 0.1) + swing(table, 0.6)) < 1e-3)
check('closes the loop exactly', Math.abs(swing(table, 0) - swing(table, 1)) < 1e-6)

let maxStep = 0
for (let i = 1; i <= 2000; i++) {
  maxStep = Math.max(maxStep, Math.abs(swing(table, i / 2000) - swing(table, (i - 1) / 2000)))
}
check('has no discontinuity', maxStep < 0.02, `max step ${maxStep.toFixed(4)}`)

// The whole reason for integrating rather than reaching for Math.sin: a real
// pendulum covers less of its arc near the turning point than a sine does.
const sineFraction = 1 - Math.cos(Math.PI / 4)
const realFraction = (amplitude - swing(table, 0.125)) / amplitude
check(
  'dwells at the turn, unlike a sine',
  realFraction < sineFraction,
  `${realFraction.toFixed(3)} vs sine ${sineFraction.toFixed(3)}`,
)

function checkRegistry(label: string, list: Contraption<unknown>[]): void {
  console.log(`\nregistry · ${label}`)
  check(`${label}: every period divides the loop`, list.every((c) => LOOP % (c.period ?? LOOP) === 0))
  check(`${label}: every fireAt is in [0, 1)`, list.every((c) => (c.fireAt ?? 0) >= 0 && (c.fireAt ?? 0) < 1))
  check(`${label}: every name is unique`, new Set(list.map((c) => c.name)).size === list.length)
  check(
    `${label}: every chainable machine runs the full loop`,
    list.every((c) => !c.role || (c.period ?? LOOP) === LOOP),
  )
  for (const role of ['source', 'relay', 'sink'] as const) {
    check(`${label}: the ${role} pool is not empty`, list.some((c) => c.role === role))
  }
}

checkRegistry('classic', registry)
for (const mode of ['cascade', 'workshop', 'circus'] as const) {
  checkRegistry(mode, catalogFor(mode))
}

/**
 * Every machine owns its footprint outright; a span must not land on a cell
 * another machine already claimed.
 */
function overlaps(comp: ReturnType<typeof build>): boolean {
  const occupied = new Set<string>()
  for (const inst of comp.instances) {
    const { cell } = inst
    for (let a = 0; a < Math.round(cell.w / cell.size); a++) {
      for (let b = 0; b < Math.round(cell.h / cell.size); b++) {
        const k = `${Math.round(cell.x - cell.w / 2 + (a + 0.5) * cell.size)}:${Math.round(cell.y - cell.h / 2 + (b + 0.5) * cell.size)}`
        if (occupied.has(k)) return true
        occupied.add(k)
      }
    }
  }
  return false
}

const fingerprint = (c: ReturnType<typeof build>) =>
  JSON.stringify(c.instances.map((i) => [i.contraption.name, i.phase, i.angle, i.cell.x, i.cell.y]))

console.log('\ncomposition')
for (const layout of ['grid', 'bricks', 'quads', 'bands']) {
  for (const res of [8, 12, 15, 20]) {
    const options = { ...defaultOptions, seed: `${layout}-${res}`, layout, res, spans: 0.8, chains: 1 }
    const comp = build(options, 900)
    const label = `${layout}@${res}`
    check(`${label} places machines`, comp.instances.length > 0)
    check(`${label} has no overlapping machines`, !overlaps(comp))
    check(`${label} rebuilds identically from its seed`, fingerprint(comp) === fingerprint(build(options, 900)))
  }
}

console.log('\nextremes')
for (const { name: mode } of MODES) {
  for (const res of [1, 2, 50]) {
    let ok = true
    let count = 0
    try {
      count = build({ ...defaultOptions, seed: 'edge', mode, res, spans: 3, chains: 3 }, 900).instances.length
    } catch {
      ok = false
    }
    check(`${mode}@${res} with the dials at full builds`, ok, `${count} machines`)
  }
}

console.log('\nworlds')
for (const mode of ['ports', 'tracks'] as const) {
  for (const res of [8, 12, 16]) {
    const options = { ...defaultOptions, seed: `${mode}-${res}`, mode, res, chains: 0.8 }
    const comp = build(options, 900)
    const label = `${mode}@${res}`
    check(`${label} places machines`, comp.instances.length > 0)
    check(`${label} has no overlapping machines`, !overlaps(comp))
    check(`${label} rebuilds identically from its seed`, fingerprint(comp) === fingerprint(build(options, 900)))
    check(`${label} keeps every period a divisor of the loop`, comp.instances.every((i) => comp.loop % i.period === 0))
  }
}

// In ports mode nothing may run into nothing: every out-port a machine
// insists on has a neighbour wired to it, and every ball chain ends in a sink.
const ports = build({ ...defaultOptions, seed: 'ports', mode: 'ports', res: 14, chains: 1 }, 900)
const byName = new Map(portMachines.map((m) => [m.name, m]))
check(
  'ports: every required out-port is wired',
  ports.instances.every((i) => {
    const m = byName.get(i.contraption.name)!
    const link = (i.state as { link: Link }).link
    return m.pickOne ? link.outSides.length === 1 : link.outSides.length === m.outs.length
  }),
)
check('ports: chains reach converters', ['paddle', 'cam', 'latch'].some((n) => ports.used.includes(n)), ports.used.join(','))
check('ports: chains end in sinks', ['cup', 'bell'].every((n) => ports.used.includes(n)))
// A gear train is padding: never more than three plain gears in a row.
{
  const gearAt = new Map(ports.instances.filter((i) => i.contraption.name === 'gear').map((i) => [`${i.cell.col}:${i.cell.row}`, i]))
  let longest = 0
  for (const i of gearAt.values()) {
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      let run = 1
      let c = i.cell.col + dx
      let r = i.cell.row + dy
      while (gearAt.has(`${c}:${r}`)) {
        run++
        c += dx
        r += dy
      }
      longest = Math.max(longest, run)
    }
  }
  check('ports: gear trains stay short', longest <= 3, `longest ${longest}`)
}

console.log('\nmode catalogs')
for (const { name: mode } of MODES) {
  const sheet = build({ ...defaultOptions, seed: 'sheet', mode, catalog: true }, 900)
  check(`${mode} catalog has machines`, sheet.instances.length > 0)
  check(`${mode} catalog captions every machine`, sheet.captions.length === sheet.instances.length)
  check(`${mode} catalog loop holds every period`, sheet.instances.every((i) => sheet.loop % i.period === 0))
}
check('ports catalog differs from classic', build({ ...defaultOptions, seed: 'sheet', mode: 'ports', catalog: true }, 900).used[0] !== build({ ...defaultOptions, seed: 'sheet', mode: 'classic', catalog: true }, 900).used[0])
check('cascade catalog differs from classic', build({ ...defaultOptions, seed: 'sheet', mode: 'cascade', catalog: true }, 900).used.includes('hopper'))
check('workshop catalog differs from circus', !build({ ...defaultOptions, seed: 'sheet', mode: 'workshop', catalog: true }, 900).used.includes('trampoline'))
check('shared names stay in their catalog', catalogFor('cascade').some((c) => c.name === 'hopper') && catalogFor('workshop').some((c) => c.name === 'hopper'))

console.log('\ngrid modes')
for (const mode of ['cascade', 'workshop', 'circus'] as const) {
  for (const res of [8, 12, 15]) {
    const options = { ...defaultOptions, seed: `${mode}-${res}`, mode, res, spans: 0.8, chains: 1 }
    const comp = build(options, 900)
    const label = `${mode}@${res}`
    check(`${label} places machines`, comp.instances.length > 0)
    check(`${label} has no overlapping machines`, !overlaps(comp))
    check(`${label} rebuilds identically from its seed`, fingerprint(comp) === fingerprint(build(options, 900)))
  }
}

// In tracks mode every region's loop closes: one lift top per region, and the
// balls are drawn by exactly one overlay per region.
const tracks = build({ ...defaultOptions, seed: 'tracks', mode: 'tracks', res: 14 }, 900)
const liftTops = tracks.instances.filter((i) => (i.state as { kind?: string }).kind === 'liftOut').length
check('tracks: one closed loop per region', liftTops === tracks.overlays.length && liftTops > 0, `${liftTops} lifts, ${tracks.overlays.length} overlays`)
check(
  'tracks: every reactor fires at least twice a loop',
  tracks.instances.filter((i) => i.contraption.name.startsWith('react-')).every((i) => i.period <= tracks.loop / 2),
)

console.log('\nchains')
const wired = build({ ...defaultOptions, seed: 'chains', layout: 'grid', res: 14, spans: 0.4, chains: 1 }, 900)
check('builds chains at all', wired.wires.length > 0, `${wired.wires.length} links`)

const byPos = new Map<string, Instance>(
  wired.instances.map((i) => [`${Math.round(i.cell.x)}:${Math.round(i.cell.y)}`, i]),
)
const roleAt = (x: number, y: number) => byPos.get(`${Math.round(x)}:${Math.round(y)}`)?.contraption.role
const heads = wired.wires.filter((w) => !wired.wires.some((other) => other.to === w.from))
const grammarErrors: string[] = []

for (const head of heads) {
  const chain = [head]
  for (;;) {
    const next = wired.wires.find((w) => w.from === chain[chain.length - 1].to)
    if (!next) break
    chain.push(next)
  }
  const roles = [chain[0].from, ...chain.map((w) => w.to)].map((c) => roleAt(c.x, c.y))
  if (roles[0] !== 'source') grammarErrors.push(`head is ${roles[0]}`)
  if (roles[roles.length - 1] !== 'sink') grammarErrors.push(`tail is ${roles[roles.length - 1]}`)
  if (roles.slice(1, -1).some((r) => r !== 'relay')) grammarErrors.push(`middle has ${roles.slice(1, -1).join(',')}`)
}

check('every chain runs source -> relay* -> sink', grammarErrors.length === 0, grammarErrors.slice(0, 3).join(' | '))
check('every chain has one end terminal', heads.length === wired.wires.filter((w) => w.last).length)
check(
  'every link joins equal-sized neighbours',
  wired.wires.every(
    (w) =>
      w.from.size === w.to.size &&
      Math.abs(Math.hypot(w.to.x - w.from.x, w.to.y - w.from.y) - w.from.size) < 1,
  ),
)
check(
  'every phase lands its firing moment on its frame',
  wired.instances.every((i) => {
    const u = ((((i.fireFrame + i.phase) % i.period) + i.period) % i.period) / i.period
    const want = i.contraption.fireAt ?? 0
    return Math.abs(u - want) < 0.02 || Math.abs(u - want) > 0.98
  }),
)

function chainGrammar(comp: ReturnType<typeof build>): string[] {
  const at = new Map<string, Instance>(
    comp.instances.map((i) => [`${Math.round(i.cell.x)}:${Math.round(i.cell.y)}`, i]),
  )
  const roleAt = (x: number, y: number) => at.get(`${Math.round(x)}:${Math.round(y)}`)?.contraption.role
  const starts = comp.wires.filter((w) => !comp.wires.some((other) => other.to === w.from))
  const errors: string[] = []
  for (const head of starts) {
    const chain = [head]
    for (;;) {
      const next = comp.wires.find((w) => w.from === chain[chain.length - 1].to)
      if (!next) break
      chain.push(next)
    }
    const roles = [chain[0].from, ...chain.map((w) => w.to)].map((c) => roleAt(c.x, c.y))
    if (roles[0] !== 'source') errors.push(`head is ${roles[0]}`)
    if (roles[roles.length - 1] !== 'sink') errors.push(`tail is ${roles[roles.length - 1]}`)
    if (roles.slice(1, -1).some((r) => r !== 'relay')) errors.push(`middle has ${roles.slice(1, -1).join(',')}`)
  }
  return errors
}

{
  const circus = build({ ...defaultOptions, seed: 'chains', mode: 'circus', layout: 'grid', res: 14, spans: 0.4, chains: 1 }, 900)
  check('circus: builds chains', circus.wires.length > 0, `${circus.wires.length} links`)
  check('circus: chain grammar', chainGrammar(circus).length === 0, chainGrammar(circus).slice(0, 3).join(' | '))
}

const unitOf = (i: Instance) => {
  const [w, h] = i.contraption.span ?? [1, 1]
  return w === 1 && h === 1
}
const ENDINGS = new Set(['bin', 'bell', 'lamp'])
const CASCADE_ENDINGS = new Set(['bell', 'lamp', 'flag', 'toaster', 'balloon', 'jack'])

function workshopLineErrors(comp: ReturnType<typeof build>): string[] {
  const errors: string[] = []
  const units = comp.instances.filter(unitOf)
  const at = new Map(units.map((i) => [`${Math.round(i.cell.x)}:${Math.round(i.cell.y)}`, i]))
  const key = (x: number, y: number) => `${Math.round(x)}:${Math.round(y)}`
  for (const inst of units) {
    const line = (inst.state as { line?: Line }).line
    if (!line) {
      errors.push(`${inst.contraption.name} has no line`)
      continue
    }
    if (!line.out) continue
    const along = line.along ?? 1
    const nextCell = line.drop
      ? at.get(key(inst.cell.x, inst.cell.y + inst.cell.size))
      : at.get(key(inst.cell.x + along * inst.cell.size, inst.cell.y))
    const next = nextCell && (nextCell.state as { line?: Line }).line
    if (!nextCell || !next?.in) errors.push(`${inst.contraption.name} dumps into nothing`)
    else if (next.color !== line.color) errors.push(`${inst.contraption.name} colour break`)
  }
  if (!comp.options.solo && !comp.options.tag) {
    for (const inst of units) {
      const line = (inst.state as { line?: Line }).line
      if (line && !line.out && !ENDINGS.has(inst.contraption.name)) {
        errors.push(`terminus is ${inst.contraption.name}`)
      }
      if (line && !line.out && inst.contraption.role === 'source') {
        errors.push(`source leftover ${inst.contraption.name}`)
      }
    }
  }
  return errors
}

console.log('\nworkshop floor')
for (const seed of ['first-look', 'chains', 'workshop-12', 'rim', 'candid-gasket-468']) {
  for (const layout of ['grid', 'bricks', 'quads', 'bands']) {
    const shop = build(
      { ...defaultOptions, seed, mode: 'workshop', layout, res: 12, spans: 0.3, chains: 0.7 },
      900,
    )
    const label = `workshop ${seed} ${layout}`
    const errors = workshopLineErrors(shop)
    const isolated = shop.instances.filter((i) => {
      const line = (i.state as { line?: Line }).line
      return unitOf(i) && line && !line.in && !line.out
    })
    check(`${label}: every placed cell has a line`, shop.instances.filter(unitOf).every((i) => (i.state as { line?: Line }).line))
    check(`${label}: every placed cell is on a run`, shop.instances.filter(unitOf).every((i) => {
      const line = (i.state as { line?: Line }).line
      return !!line && (line.in || line.out)
    }))
    check(`${label}: no leftover machines`, isolated.length === 0, `${isolated.length} leftovers`)
    check(`${label}: outlets meet an inlet`, errors.length === 0, errors.slice(0, 3).join(' | '))
    check(`${label}: no classic wires`, shop.wires.length === 0)
    if (layout === 'grid') {
      const onBorder = shop.instances.some(
        (i) => i.cell.col === 0 || i.cell.col === 11 || i.cell.row === 0 || i.cell.row === 11,
      )
      check(`${label}: rim stays empty`, !onBorder)
    }
  }
}

// Cascade: inset eastbound sentences that end in a real sink. Unused cells
// stay empty. Wires exist for timing but are not drawn.
console.log('\ncascade')
const cascadeWired = build({ ...defaultOptions, seed: 'chains', mode: 'cascade', layout: 'grid', res: 14, spans: 0.4, chains: 1 }, 900)
check('cascade: builds chains', cascadeWired.wires.length > 0, `${cascadeWired.wires.length} links`)
check('cascade: chain grammar', chainGrammar(cascadeWired).length === 0, chainGrammar(cascadeWired).slice(0, 3).join(' | '))
const flowOf = (i: Instance) => (i.state as { flow?: Flow }).flow
const onRun = (f: Flow | undefined) => !!f && (f.in !== null || f.out !== null)
const cascadeByPos = new Map<string, Instance>(
  cascadeWired.instances.map((i) => [`${Math.round(i.cell.x)}:${Math.round(i.cell.y)}`, i]),
)
const chained = cascadeWired.instances.filter((i) => onRun(flowOf(i)))
const leftovers = cascadeWired.instances.filter((i) => unitOf(i) && flowOf(i) && !onRun(flowOf(i)))
const onWires = new Set(cascadeWired.wires.flatMap((w) => [w.from, w.to]))
const cascadeHeads = cascadeWired.wires.filter((w) => !cascadeWired.wires.some((other) => other.to === w.from))
check('every placed cascade cell is on a run', cascadeWired.instances.filter(unitOf).every((i) => onRun(flowOf(i))))
check('no leftover cascade machines', leftovers.length === 0, `${leftovers.length} leftovers`)
check('cascade hides the conduit', cascadeWired.showWires === false)
check('every wired machine knows its run', chained.length === onWires.size && chained.every((i) => onWires.has(i.cell)))
check('every wired machine stands upright', chained.every((i) => i.angle === 0 && i.mirror === 1))
check(
  'every run enters and leaves by edges its machines allow',
  chained.every((i) => {
    const f = flowOf(i)!
    const c = i.contraption
    return (!f.in || !c.inlets || c.inlets.includes(f.in)) && (!f.out || !c.outlets || c.outlets.includes(f.out))
  }),
)
check(
  'every run has a source with no inlet',
  cascadeHeads.every((w) => flowOf(cascadeByPos.get(`${Math.round(w.from.x)}:${Math.round(w.from.y)}`)!)!.in === null),
)
check(
  'cascade is one snake',
  cascadeHeads.length === 1,
  `${cascadeHeads.length} heads`,
)
check(
  'cascade steps to neighbours',
  cascadeWired.wires.every(
    (w) => Math.abs(Math.hypot(w.to.x - w.from.x, w.to.y - w.from.y) - w.from.size) < 1,
  ),
)
check(
  'cascade only drops south',
  cascadeWired.wires.every((w) => w.to.y >= w.from.y - 1),
)
check(
  'every run ends in a receiver',
  cascadeHeads.every((head) => {
    let w = head
    for (;;) {
      const next = cascadeWired.wires.find((o) => o.from === w.to)
      if (!next) {
        const tail = cascadeByPos.get(`${Math.round(w.to.x)}:${Math.round(w.to.y)}`)
        return !!tail && CASCADE_ENDINGS.has(tail.contraption.name)
      }
      w = next
    }
  }),
)
check(
  'every run carries one colour',
  cascadeHeads.every((head) => {
    let w = head
    for (;;) {
      const next = cascadeWired.wires.find((o) => o.from === w.to)
      if (!next) return true
      if (next.color !== head.color) return false
      w = next
    }
  }),
)
check(
  'classic wiring does not write flow',
  wired.instances.every((i) => !flowOf(i)),
)
{
  const res = 14
  const onBorder = cascadeWired.instances.some(
    (i) => i.cell.col === 0 || i.cell.col === res - 1 || i.cell.row === 0 || i.cell.row === res - 1,
  )
  check('regular grid leaves the rim empty', !onBorder)
}

for (const seed of ['first-look', 'cascade-8', 'rim', 'obtuse-plunger-408']) {
  for (const layout of ['grid', 'bricks', 'bands']) {
    const piece = build(
      { ...defaultOptions, seed, mode: 'cascade', layout, res: 12, spans: 0.25, chains: 0.7 },
      900,
    )
    const label = `cascade ${seed} ${layout}`
    const leftover = piece.instances.filter((i) => unitOf(i) && flowOf(i) && !onRun(flowOf(i)))
    check(`${label}: every placed cell is on a run`, piece.instances.filter(unitOf).every((i) => onRun(flowOf(i))))
    check(`${label}: no leftover machines`, leftover.length === 0, `${leftover.length} leftovers`)
    check(`${label}: chain grammar`, chainGrammar(piece).length === 0, chainGrammar(piece).slice(0, 3).join(' | '))
    check(`${label}: hides the conduit`, piece.showWires === false)
    if (layout === 'grid') {
      const onBorder = piece.instances.some(
        (i) => i.cell.col === 0 || i.cell.col === 11 || i.cell.row === 0 || i.cell.row === 11,
      )
      check(`${label}: rim stays empty`, !onBorder)
    }
  }
}

{
  const packed = build(
    { ...defaultOptions, seed: 'first-look', mode: 'cascade', layout: 'grid', res: 8, spans: 0.2, chains: 0.3 },
    900,
  )
  const cols = packed.instances.map((i) => i.cell.col)
  const rows = packed.instances.map((i) => i.cell.row)
  check('cascade res=8 fills the width', cols.length > 0 && Math.min(...cols) <= 1 && Math.max(...cols) >= 6)
  check('cascade res=8 fills the height', rows.length > 0 && Math.min(...rows) <= 1 && Math.max(...rows) >= 6)
}

console.log('\ncatalog')
const catalog = build({ ...defaultOptions, seed: 'catalog', catalog: true }, 900)
check('shows every machine', catalog.instances.length === registry.length)
check('captions every machine', catalog.captions.length === registry.length)
// At phase 0 most machines sit at a turning point and the sheet reads as frozen.
check('staggers phases', new Set(catalog.instances.map((i) => i.phase)).size > registry.length * 0.7)

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`)
process.exit(failures === 0 ? 0 : 1)

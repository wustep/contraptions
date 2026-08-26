/**
 * Headless smoke test for the parts of the generator that are pure logic.
 *
 * Everything here runs without a browser, which is the point: composition,
 * phasing and the chain grammar are exactly the kind of thing that typechecks
 * cleanly and is still wrong, and none of it needs a canvas to be wrong on.
 *
 *   npm run check
 */
import { build, defaultOptions } from '../src/core/composition'
import { LOOP } from '../src/core/constants'
import { pendulum, swing } from '../src/core/physics'
import { registry } from '../src/contraptions'
import type { Instance } from '../src/core/types'
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

console.log('\nregistry')
check('every period divides the loop', registry.every((c) => LOOP % (c.period ?? LOOP) === 0))
check('every fireAt is in [0, 1)', registry.every((c) => (c.fireAt ?? 0) >= 0 && (c.fireAt ?? 0) < 1))
check('every name is unique', new Set(registry.map((c) => c.name)).size === registry.length)
check(
  'every chainable machine runs the full loop',
  registry.every((c) => !c.role || (c.period ?? LOOP) === LOOP),
)
for (const role of ['source', 'relay', 'sink'] as const) {
  check(`the ${role} pool is not empty`, registry.some((c) => c.role === role))
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
for (const mode of ['classic', 'ports', 'tracks'] as const) {
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
for (const mode of ['classic', 'ports', 'tracks'] as const) {
  const sheet = build({ ...defaultOptions, seed: 'sheet', mode, catalog: true }, 900)
  check(`${mode} catalog has machines`, sheet.instances.length > 0)
  check(`${mode} catalog captions every machine`, sheet.captions.length === sheet.instances.length)
  check(`${mode} catalog loop holds every period`, sheet.instances.every((i) => sheet.loop % i.period === 0))
}
check('ports catalog differs from classic', build({ ...defaultOptions, seed: 'sheet', mode: 'ports', catalog: true }, 900).used[0] !== build({ ...defaultOptions, seed: 'sheet', mode: 'classic', catalog: true }, 900).used[0])

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

console.log('\ncatalog')
const catalog = build({ ...defaultOptions, seed: 'catalog', catalog: true }, 900)
check('shows every machine', catalog.instances.length === registry.length)
check('captions every machine', catalog.captions.length === registry.length)
// At phase 0 most machines sit at a turning point and the sheet reads as frozen.
check('staggers phases', new Set(catalog.instances.map((i) => i.phase)).size > registry.length * 0.7)

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`)
process.exit(failures === 0 ? 0 : 1)

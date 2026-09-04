/**
 * Headless smoke test for the parts of the generator that are pure logic.
 *
 * Everything here runs without a browser, which is the point: composition,
 * phasing and the chain grammar are exactly the kind of thing that typechecks
 * cleanly and is still wrong, and none of it needs a canvas to be wrong on.
 *
 *   npm run check
 */
import type p5 from 'p5'
import { build, catalogFor, clampRes, defaultOptions, modeInfo, MODES } from '../src/core/composition'
import { LOOP } from '../src/core/constants'
import { mod } from '../src/core/ease'
import { pendulum, swing } from '../src/core/physics'
import { makeRng } from '../src/core/rng'
import { parseOptions, rollOptions, serializeOptions } from '../src/core/seed'
import { themeByName } from '../src/core/themes'
import { registry } from '../src/contraptions'
import type { Contraption, DrawCtx, Instance } from '../src/core/types'
import { LINK_DELAY } from '../src/core/wiring'
import { portsCatalog } from '../src/worlds/ports/build'
import { portMachines, STEADY } from '../src/worlds/ports/machines'
import type { Link } from '../src/worlds/ports/types'
import { CASCADE } from '../src/worlds/goldberg/cascade'
import { carCycle } from '../src/worlds/goldberg/elevator'
import type { LaneCell } from '../src/worlds/goldberg/laneworld'
import { WORKSHOP } from '../src/worlds/goldberg/workshop'
import { MAX_DROP, RUBE } from '../src/worlds/goldberg/rube'
import { tracksCatalog } from '../src/worlds/tracks/build'
import { reactors } from '../src/worlds/tracks/reactors'
import { drawTrack, type Kind } from '../src/worlds/tracks/track'

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
for (const mode of ['cascade', 'workshop', 'circus', 'rube'] as const) {
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

const isSingle = (c: Contraption<unknown>) => {
  const [w, h] = c.span ?? [1, 1]
  return w === 1 && h === 1
}

/** The rectangle the cells cover, in canvas pixels. */
const bboxOf = (comp: ReturnType<typeof build>) => {
  const left = Math.min(...comp.cells.map((c) => c.x - c.w / 2))
  const right = Math.max(...comp.cells.map((c) => c.x + c.w / 2))
  const top = Math.min(...comp.cells.map((c) => c.y - c.h / 2))
  const bottom = Math.max(...comp.cells.map((c) => c.y + c.h / 2))
  return { left, right, top, bottom, w: right - left, h: bottom - top }
}

/** Three seeds, so a check is about the composer and not about one draw. */
const GOLDBERG_SEEDS = ['obtuse-plunger-408', 'first-look', 'paper-gantry-552']

console.log('\ncomposition')
{
  const base = { ...defaultOptions, seed: 'stroke-draw', res: 12, spans: 0.8, chains: 1 }
  check(
    'stroke does not change placement',
    fingerprint(build({ ...base, stroke: 0.4 }, 900)) === fingerprint(build({ ...base, stroke: 2.4 }, 900)),
  )
  for (const { name: mode } of MODES) {
    const a = { ...base, mode, chains: 0.8 }
    check(
      `stroke does not rebuild ${mode}`,
      fingerprint(build({ ...a, stroke: 0.4 }, 900)) === fingerprint(build({ ...a, stroke: 2.4 }, 900)),
    )
  }
}
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
  check(`${mode} catalog sets one pen for the sheet`, !!sheet.unit && sheet.unit > 0)
}
check('ports catalog differs from classic', build({ ...defaultOptions, seed: 'sheet', mode: 'ports', catalog: true }, 900).used[0] !== build({ ...defaultOptions, seed: 'sheet', mode: 'classic', catalog: true }, 900).used[0])
check('cascade catalog differs from classic', build({ ...defaultOptions, seed: 'sheet', mode: 'cascade', catalog: true }, 900).used.includes('hopper'))
check('workshop catalog differs from circus', !build({ ...defaultOptions, seed: 'sheet', mode: 'workshop', catalog: true }, 900).used.includes('trampoline'))
check('shared names stay in their catalog', catalogFor('cascade').some((c) => c.name === 'hopper') && catalogFor('workshop').some((c) => c.name === 'hopper'))
check('ports catalog lists every port machine', portsCatalog().length === portMachines.length)
{
  const entries = tracksCatalog()
  const kinds: Kind[] = ['run', 'landing', 'drop', 'fall', 'shaft', 'liftIn', 'liftOut']
  const seen = new Set<string>()
  const theme = themeByName('okazz')
  for (const entry of entries) {
    const state: Record<string, unknown> = {}
    entry.state?.(state, { color: theme.colors[0], theme })
    if (typeof state.kind === 'string') seen.add(state.kind)
  }
  check('tracks catalog covers the seven kinds', kinds.every((k) => seen.has(k)), [...seen].join(','))
  check(
    'tracks catalog covers every reactor',
    reactors.every((r) => entries.some((e) => e.contraption.name === `demo-${r.name}`)),
  )
}

// The lane sheets run a token through every machine that has declared a lane,
// the way the tracks sheet runs a ball through every track shape. A machine
// that has not been converted yet is listed without one, because it is still
// drawing its own and two would be worse than none.
for (const mode of ['cascade', 'workshop', 'rube'] as const) {
  const sheet = build({ ...defaultOptions, seed: 'sheet', mode, catalog: true }, 900)
  const laned = catalogFor(mode).filter((c) => c.lane && isSingle(c))
  check(
    `${mode} sheet runs a token through every lane machine`,
    sheet.overlays.length === laned.length && laned.length > 0,
    `${sheet.overlays.length} overlays, ${laned.length} lanes`,
  )
  check(`${mode} sheet closes inside the master loop`, sheet.loop <= LOOP, `${sheet.loop}`)
}

console.log('\ngrid modes')
for (const mode of ['cascade', 'workshop', 'circus', 'rube'] as const) {
  const { min, max } = modeInfo(mode).res
  // Past the top of the range as well: the dial is clamped, not obeyed.
  for (const res of [min, Math.round((min + max) / 2), max, max + 8]) {
    for (const seed of GOLDBERG_SEEDS) {
      const options = { ...defaultOptions, seed, mode, res, spans: 0.8, chains: 1 }
      const comp = build(options, 900)
      const label = `${mode} ${seed}@${res}`
      const across = clampRes(mode, res)
      check(`${label} places machines`, comp.instances.length > 0)
      check(`${label} has no overlapping machines`, !overlaps(comp))
      check(`${label} rebuilds identically from its seed`, fingerprint(comp) === fingerprint(build(options, 900)))
      check(`${label} sets one pen for the piece`, comp.unit === comp.cells[0].size)
      // A cell is never smaller than the mode can be read at, and the grid
      // fills the art area rather than floating in it.
      const box = bboxOf(comp)
      check(`${label} builds a ${across}-across grid`, comp.cells.length === across * across)
      check(`${label} fills the frame`, box.w >= 900 * 0.86 && Math.abs(box.w - box.h) < 1, `${box.w}×${box.h}`)
      check(`${label} keeps its cells legible`, comp.cells.every((c) => c.size >= box.w / modeInfo(mode).res.max - 1e-6))
    }
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

// ---------------------------------------------------------------- circus ---
// The whole frame is the programme: the composer builds its own uniform grid
// at clampRes('circus', res) and every cell of it carries exactly one act, big
// acts included. Acts are closed loops, so nothing is handed across a cell
// edge; the only thing the wires do is space the drumroll, and the conduit is
// not drawn. Everything between this banner and the next one is circus.
console.log('\ncircus')

/** One key per grid cell an instance's footprint covers. */
function circusCover(comp: ReturnType<typeof build>): string[] {
  const keys: string[] = []
  for (const { cell } of comp.instances) {
    for (let a = 0; a < Math.round(cell.w / cell.size); a++) {
      for (let b = 0; b < Math.round(cell.h / cell.size); b++) {
        keys.push(
          `${Math.round(cell.x - cell.w / 2 + (a + 0.5) * cell.size)}:${Math.round(cell.y - cell.h / 2 + (b + 0.5) * cell.size)}`,
        )
      }
    }
  }
  return keys
}

const CIRCUS_SEEDS = ['first-look', 'obtuse-plunger-408', 'velvet-lever-559']
const circusActs = catalogFor('circus')

check('circus: no lift or well in the catalog', !circusActs.some((c) => c.name === 'lift' || c.name === 'well'))
check(
  'circus: the elevator is one closed two-cell act',
  circusActs.some((c) => c.name === 'elevator' && c.span?.[0] === 1 && c.span?.[1] === 2),
)
// Gravity points the same way in every cell, so no act may be turned on its
// side; mirroring is left free because every act is a left-right composition.
check('circus: every act stands upright', circusActs.every((c) => c.rotations?.length === 1 && c.rotations[0] === 0))

let spanned = 0
for (const res of [4, 5, 7]) {
  for (const seed of CIRCUS_SEEDS) {
    const options = { ...defaultOptions, seed, mode: 'circus' as const, res, spans: 0.8, chains: 0.8 }
    const comp = build(options, 900)
    const label = `circus ${seed}@${res}`
    const cover = circusCover(comp)
    const cells = new Set(comp.cells.map((c) => `${Math.round(c.x)}:${Math.round(c.y)}`))

    check(`${label}: builds its own ${res}x${res} grid`, comp.cells.length === res * res)
    check(`${label}: sets the piece's unit`, !!comp.unit && Math.abs(comp.unit - comp.cells[0].size) < 1e-6)
    check(`${label}: every cell carries an act`, cover.length === comp.cells.length, `${cover.length} of ${comp.cells.length}`)
    check(`${label}: no cell carries two`, new Set(cover).size === cover.length)
    check(`${label}: nothing is placed off the grid`, cover.every((k) => cells.has(k)))
    check(`${label}: rebuilds identically from its seed`, fingerprint(comp) === fingerprint(build(options, 900)))
    check(`${label}: hides the drumroll conduit`, comp.showWires === false)
    check(`${label}: no lift or well is placed`, !comp.used.includes('lift') && !comp.used.includes('well'))
    check(`${label}: drumroll grammar`, chainGrammar(comp).length === 0, chainGrammar(comp).slice(0, 3).join(' | '))
    check(
      `${label}: every act's phase lands its own beat`,
      comp.instances.every((i) => {
        const u = ((((i.fireFrame + i.phase) % i.period) + i.period) % i.period) / i.period
        const want = i.contraption.fireAt ?? 0
        return Math.abs(u - want) < 0.02 || Math.abs(u - want) > 0.98
      }),
    )
    if (comp.instances.some((i) => i.cell.w > i.cell.size || i.cell.h > i.cell.size)) spanned++
  }
}
check('circus: the big acts get placed when spans is up', spanned > 0, `${spanned} of 9 pieces`)

// The drumroll itself: chains exist, and a chain that fires in sequence is
// what `chains` buys. res 14 is deliberately out of range — the composer must
// clamp it rather than build a wall of specks.
{
  const circus = build({ ...defaultOptions, seed: 'chains', mode: 'circus', res: 14, spans: 0.4, chains: 1 }, 900)
  check('circus: builds chains', circus.wires.length > 0, `${circus.wires.length} links`)
  check('circus: chain grammar', chainGrammar(circus).length === 0, chainGrammar(circus).slice(0, 3).join(' | '))
  check('circus: clamps res into its own range', circus.cells.length === 12 * 12, `${circus.cells.length} cells`)
  check(
    'circus: chains fire a beat apart',
    circus.wires.every((w) => ((w.end - w.start) + LOOP) % LOOP === LINK_DELAY || w.end - w.start === LINK_DELAY),
  )
  const quiet = build({ ...defaultOptions, seed: 'chains', mode: 'circus', res: 5, spans: 0.4, chains: 0 }, 900)
  check('circus: chains 0 leaves every act free-running', quiet.wires.length === 0 && quiet.instances.length > 0)
}
// -------------------------------------------------------------- end circus --

// ----------------------------------------------------------------- lanes ---
/**
 * Cascade and workshop are one composer: a uniform grid, a snake through every
 * cell of it, and one token journey made by concatenating the lane each
 * machine declares. Everything a viewer could catch — a ball cut in half at a
 * seam, a car that arrives without its passenger, a part sliding off the paper
 * — is a property of that single path, so these checks measure the path rather
 * than trusting 27 machines to agree about it.
 */
console.log('\nlanes')

const LANE_WORLDS = { cascade: CASCADE, workshop: WORKSHOP } as const

/** Where a lane starts and ends, in canvas pixels. A hold ends where it began. */
const laneEnds = (lc: LaneCell, size: number) => {
  const first = lc.lane.pieces[0]
  const last = lc.lane.pieces[lc.lane.pieces.length - 1]
  const tail = last.hold !== undefined ? last.from : last.to
  return {
    from: [lc.cell.x + first.from[0] * size, lc.cell.y + first.from[1] * size] as const,
    to: [lc.cell.x + tail[0] * size, lc.cell.y + tail[1] * size] as const,
  }
}

const PROPS = [
  'every cell of the grid is on the snake, once',
  'the snake steps to a neighbour every time',
  'lanes meet exactly at every seam',
  'the joined path never leaves the art frame',
  'the joined path never jumps',
  'every phase lands its machine on the token',
  'elevators are a lift over a well, at the row turns only',
  'a ride is one speed across the seam',
  'the token count is the journey over the gap',
  'it rebuilds identically from its seed',
  'every cell stands upright, mirrored by its row',
  'the run ends in a real ending',
]

for (const mode of ['cascade', 'workshop'] as const) {
  const world = LANE_WORLDS[mode]
  const cycle = carCycle(world.ride)
  check(
    `${mode}: a car cycle fits between two tokens`,
    cycle < world.emit,
    `${cycle.toFixed(3)} of ${world.emit}`,
  )

  const fails: Record<string, string[]> = {}
  const fail = (prop: string, detail: string) => (fails[prop] ??= []).push(detail)

  for (const res of [5, 8, 15]) {
    for (const seed of GOLDBERG_SEEDS) {
      for (const chains of [0, 0.5, 1]) {
        const options = { ...defaultOptions, seed, mode, res, chains }
        const comp = build(options, 900)
        const label = `${seed}@${res}/${chains}`
        const run = comp.lanes
        if (!run) {
          fail(PROPS[0], `${label}: no lanes`)
          continue
        }
        const across = clampRes(mode, res)
        const size = run.size

        // One snake, every cell, once.
        const grid = new Set(comp.cells.map((c) => `${c.col}:${c.row}`))
        const walked = new Set(run.cells.map((lc) => `${lc.cell.col}:${lc.cell.row}`))
        if (run.cells.length !== comp.cells.length || walked.size !== run.cells.length) {
          fail(PROPS[0], `${label}: ${walked.size} of ${comp.cells.length}`)
        }
        for (const k of walked) if (!grid.has(k)) fail(PROPS[0], `${label}: ${k} is off the grid`)

        for (let i = 1; i < run.cells.length; i++) {
          const a = run.cells[i - 1].cell
          const b = run.cells[i].cell
          if (Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - a.size) > 1) {
            fail(PROPS[1], `${label}: ${a.col},${a.row} to ${b.col},${b.row}`)
          }
        }

        // Seams. Inside a lane every piece starts where the last one stopped;
        // across a seam the two cells' lanes meet on the same canvas pixel.
        for (const lc of run.cells) {
          for (let i = 1; i < lc.lane.pieces.length; i++) {
            const prev = lc.lane.pieces[i - 1]
            const tail = prev.hold !== undefined ? prev.from : prev.to
            const head = lc.lane.pieces[i].from
            if (Math.hypot(tail[0] - head[0], tail[1] - head[1]) > 1e-6) {
              fail(PROPS[2], `${label}: ${lc.name} piece ${i}`)
            }
          }
        }
        for (let i = 1; i < run.cells.length; i++) {
          const a = laneEnds(run.cells[i - 1], size).to
          const b = laneEnds(run.cells[i], size).from
          if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6) {
            fail(PROPS[2], `${label}: ${run.cells[i - 1].name} to ${run.cells[i].name}`)
          }
        }

        // The frame test. Sampling the joined path is the honest form of
        // "no token ever leaves the art area": it is the same path the
        // overlay draws, and the token's own body is allowed for.
        const r = (world.tokenSize / 2) * size
        const [x0, y0, x1, y1] = run.frame
        let last: { x: number; y: number } | null = null
        let jumped = 0
        // Dense enough that a hoist (v=12) cannot skip half a cell between
        // samples on a long high-res snake.
        const samples = Math.max(2000, Math.ceil(run.journey / 0.035))
        for (let s = 0; s <= samples; s++) {
          const at = run.at((s / samples) * run.journey)
          if (at.x - r < x0 - 0.5 || at.x + r > x1 + 0.5 || at.y - r < y0 - 0.5 || at.y + r > y1 + 0.5) {
            fail(PROPS[3], `${label}: ${Math.round(at.x)},${Math.round(at.y)} outside ${x0}..${x1}`)
            break
          }
          if (last) jumped = Math.max(jumped, Math.hypot(at.x - last.x, at.y - last.y))
          last = at
        }
        if (jumped > size * 0.5) fail(PROPS[4], `${label}: ${jumped.toFixed(1)}px step`)

        // A machine's own clock reads `fireAt` at the frame the token reaches
        // its fire point, to within the frame the phase was rounded to.
        const instAt = new Map(comp.instances.map((i) => [i.cell, i]))
        for (const lc of run.cells) {
          const inst = instAt.get(lc.cell)
          if (!inst) continue
          const u = mod(lc.arrival + inst.phase, inst.period) / inst.period
          const want = inst.contraption.fireAt ?? 0
          const off = Math.abs(u - want)
          if (Math.min(off, 1 - off) > 1 / inst.period) {
            fail(PROPS[5], `${label}: ${lc.name} at ${u.toFixed(3)} wants ${want}`)
          }
        }

        // Elevators: exactly one stack per row turn, always a lift over a
        // well, and the two halves of the descent at one speed so the car and
        // its passenger cross the seam as one object.
        if (run.stacks.length !== across - 1) {
          fail(PROPS[6], `${label}: ${run.stacks.length} stacks for ${across} rows`)
        }
        for (const stack of run.stacks) {
          const i = run.cells.findIndex((lc) => lc.cell === stack.cell)
          const top = run.cells[i]
          const bot = run.cells[i + 1]
          if (!bot || top.role !== 'lift' || bot.role !== 'well') {
            fail(PROPS[6], `${label}: stack at ${top.cell.col},${top.cell.row} is ${top.role}/${bot?.role}`)
            continue
          }
          if (bot.cell.col !== top.cell.col || bot.cell.row !== top.cell.row + 1) {
            fail(PROPS[6], `${label}: stack is not stacked`)
          }
          const turn = top.cell.row % 2 === 0 ? across - 1 : 0
          if (top.cell.col !== turn) fail(PROPS[6], `${label}: a lift away from the row turn`)
          if (top.name !== world.names.lift || bot.name !== world.names.well) {
            fail(PROPS[6], `${label}: stack is ${top.name}/${bot.name}`)
          }
          const speeds = [...top.lane.pieces, ...bot.lane.pieces].filter((pc) => pc.ride).map((pc) => pc.v)
          if (speeds.length < 2 || speeds.some((v) => Math.abs(v - speeds[0]) > 1e-9)) {
            fail(PROPS[7], `${label}: ${speeds.join(',')}`)
          }
        }
        for (const lc of run.cells) {
          const shaft = lc.role === 'lift' || lc.role === 'well'
          const named = lc.name === world.names.lift || lc.name === world.names.well
          if (named !== shaft) fail(PROPS[6], `${label}: ${lc.name} as ${lc.role}`)
        }

        const want = Math.max(1, Math.ceil(run.journey / run.emit))
        if (run.tokens !== want || run.tokens < 1) fail(PROPS[8], `${label}: ${run.tokens} of ${want}`)

        if (fingerprint(comp) !== fingerprint(build(options, 900))) fail(PROPS[9], label)

        for (const inst of comp.instances) {
          if (inst.angle !== 0) fail(PROPS[10], `${label}: ${inst.contraption.name} turned`)
          if (inst.mirror !== (inst.cell.row % 2 === 0 ? 1 : -1)) {
            fail(PROPS[10], `${label}: ${inst.contraption.name} faces the wrong way`)
          }
        }

        const head = run.cells[0]
        const tail = run.cells[run.cells.length - 1]
        if (head.role !== 'feeder' || !world.names.feeders.includes(head.name)) {
          fail(PROPS[11], `${label}: starts with ${head.name}`)
        }
        if (tail.role !== 'sink' || !world.names.endings.includes(tail.name)) {
          fail(PROPS[11], `${label}: ends with ${tail.name}`)
        }
      }
    }
  }

  for (const prop of PROPS) {
    check(`${mode}: ${prop}`, !fails[prop], (fails[prop] ?? []).slice(0, 2).join(' | '))
  }

  // `chains` is the station dial: none of the snake, half of it, all of it.
  const at = (chains: number) =>
    build({ ...defaultOptions, seed: 'first-look', mode, res: 8, chains }, 900)
  const plain = at(0)
  const busy = at(1)
  const filler = (c: ReturnType<typeof build>) =>
    c.instances.filter((i) => i.contraption.name === world.names.filler).length
  check(`${mode}: chains 0 is all conveyance`, filler(plain) > filler(busy), `${filler(plain)} vs ${filler(busy)}`)
  check(`${mode}: chains 1 leaves no filler between the machines`, filler(busy) === 0, `${filler(busy)} left`)
  check(`${mode}: the conduit stays hidden`, plain.showWires === false && plain.wires.length === 0)

  // Narrowing the pool must not break the snake: a soloed machine staffs every
  // role, and the lanes still join.
  const one = build({ ...defaultOptions, seed: 'first-look', mode, res: 6, solo: world.names.filler }, 900)
  check(`${mode}: solo still builds one snake`, !!one.lanes && one.lanes.cells.length === one.cells.length)
  check(`${mode}: solo keeps the path joined`, !!one.lanes && one.lanes.journey > 0)
}

// ------------------------------------------------------------------ rube ---
/**
 * Rube Goldberg is the lane world with a wandering plan: one path from a
 * feeder on the top row to an ending on the bottom, going east, west or down
 * and never up, by elevator or by free fall, one to MAX_DROP floors at a
 * time. Cells off the path stay paper. The path is the whole machine, so the
 * things worth checking are that every machine is on it, that it is one
 * unbroken run of neighbours, that its descents are the pieces they claim to
 * be, and that the seed and the two dials actually change its shape.
 */
console.log('\nrube')
{
  const world = RUBE
  const fails: Record<string, string[]> = {}
  const fail = (prop: string, detail: string) => (fails[prop] ??= []).push(detail)
  const RUBE_PROPS = [
    'every machine is on the path, and the path is one run of neighbours',
    'the path never goes up and never visits a cell twice',
    'lanes meet exactly at every seam',
    'the joined path never leaves the art frame',
    'the joined path never jumps',
    'every phase lands its machine on the token',
    'descents are lift, shaft, well or chute, tube, catch — straight down, at most MAX_DROP',
    'every elevator gets one car, at one speed, for its whole depth',
    'the token count is the journey over the gap',
    'it rebuilds identically from its seed',
    'every cell stands upright, mirrored by its run',
    'the path starts with a feeder on the top row and ends with an ending on the bottom',
  ]
  const lifts = new Set([world.names.lift, world.names.shaft, world.names.well])
  const falls = new Set([world.names.chute, world.names.tube, world.names.catch])

  check(
    'rube: a car cycle at the deepest drop fits between two balls',
    carCycle(world.ride, MAX_DROP) < world.emit,
    `${carCycle(world.ride, MAX_DROP).toFixed(3)} of ${world.emit}`,
  )
  check('rube: the catalog carries the descent pieces', [...lifts, ...falls].every((n) => catalogFor('rube').some((c) => c.name === n)))

  let cars = 0
  let drops = 0
  const shapes = new Set<string>()
  for (const res of [5, 8, 14]) {
    for (const seed of GOLDBERG_SEEDS) {
      for (const [spans, chains] of [[0, 0.5], [0.5, 1], [1, 0]] as const) {
        const options = { ...defaultOptions, seed, mode: 'rube' as const, res, spans, chains }
        const comp = build(options, 900)
        const label = `${seed}@${res}/${spans}/${chains}`
        const run = comp.lanes
        if (!run) {
          fail(RUBE_PROPS[0], `${label}: no lanes`)
          continue
        }
        const across = clampRes('rube', res)
        const size = run.size
        if (res === 8 && spans === 0.5) shapes.add(run.cells.map((lc) => `${lc.cell.col}:${lc.cell.row}`).join(' '))

        // Every instance is a cell of the path and the path is one run.
        const onPath = new Set(run.cells.map((lc) => lc.cell))
        if (comp.instances.length !== run.cells.length || comp.instances.some((i) => !onPath.has(i.cell))) {
          fail(RUBE_PROPS[0], `${label}: ${comp.instances.length} machines, ${run.cells.length} on the path`)
        }
        for (let i = 1; i < run.cells.length; i++) {
          const a = run.cells[i - 1].cell
          const b = run.cells[i].cell
          if (Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - a.size) > 1) fail(RUBE_PROPS[0], `${label}: ${a.col},${a.row} to ${b.col},${b.row}`)
          if (b.row < a.row) fail(RUBE_PROPS[1], `${label}: up from ${a.col},${a.row}`)
        }
        const visited = new Set(run.cells.map((lc) => `${lc.cell.col}:${lc.cell.row}`))
        if (visited.size !== run.cells.length) fail(RUBE_PROPS[1], `${label}: a cell twice`)

        for (const lc of run.cells) {
          for (let i = 1; i < lc.lane.pieces.length; i++) {
            const prev = lc.lane.pieces[i - 1]
            const tail = prev.hold !== undefined ? prev.from : prev.to
            const head = lc.lane.pieces[i].from
            if (Math.hypot(tail[0] - head[0], tail[1] - head[1]) > 1e-6) fail(RUBE_PROPS[2], `${label}: ${lc.name} piece ${i}`)
          }
        }
        for (let i = 1; i < run.cells.length; i++) {
          const a = laneEnds(run.cells[i - 1], size).to
          const b = laneEnds(run.cells[i], size).from
          if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-6) fail(RUBE_PROPS[2], `${label}: ${run.cells[i - 1].name} to ${run.cells[i].name}`)
        }

        const r = (world.tokenSize / 2) * size
        const [x0, y0, x1, y1] = run.frame
        let last: { x: number; y: number } | null = null
        let jumped = 0
        const samples = Math.max(2000, Math.ceil(run.journey / 0.035))
        for (let s = 0; s <= samples; s++) {
          const at = run.at((s / samples) * run.journey)
          if (at.x - r < x0 - 0.5 || at.x + r > x1 + 0.5 || at.y - r < y0 - 0.5 || at.y + r > y1 + 0.5) {
            fail(RUBE_PROPS[3], `${label}: ${Math.round(at.x)},${Math.round(at.y)} outside ${x0}..${x1}`)
            break
          }
          if (last) jumped = Math.max(jumped, Math.hypot(at.x - last.x, at.y - last.y))
          last = at
        }
        if (jumped > size * 0.5) fail(RUBE_PROPS[4], `${label}: ${jumped.toFixed(1)}px step`)

        const instAt = new Map(comp.instances.map((i) => [i.cell, i]))
        for (const lc of run.cells) {
          const inst = instAt.get(lc.cell)
          if (!inst) continue
          const u = mod(lc.arrival + inst.phase, inst.period) / inst.period
          const want = inst.contraption.fireAt ?? 0
          const off = Math.abs(u - want)
          if (Math.min(off, 1 - off) > 1 / inst.period) fail(RUBE_PROPS[5], `${label}: ${lc.name} at ${u.toFixed(3)} wants ${want}`)
        }

        // Descents: from the cell that turns south to the cell that turns
        // back, one column, consecutive rows, one family of pieces.
        let elevators = 0
        for (let i = 0; i < run.cells.length; i++) {
          if (run.cells[i].out !== 'S') continue
          const top = run.cells[i]
          const chain = [top]
          let j = i + 1
          while (j < run.cells.length && run.cells[j].in === 'N') {
            chain.push(run.cells[j])
            if (run.cells[j].out !== 'S') break
            j++
          }
          const bottom = chain[chain.length - 1]
          const depth = chain.length - 1
          if (bottom.out === 'S' || depth < 1) fail(RUBE_PROPS[6], `${label}: descent at ${top.cell.col},${top.cell.row} never lands`)
          if (depth > MAX_DROP) fail(RUBE_PROPS[6], `${label}: ${depth} floors`)
          for (let k = 1; k < chain.length; k++) {
            if (chain[k].cell.col !== top.cell.col || chain[k].cell.row !== chain[k - 1].cell.row + 1) {
              fail(RUBE_PROPS[6], `${label}: descent at ${top.cell.col},${top.cell.row} is not straight down`)
            }
          }
          const family = lifts.has(top.name) ? lifts : falls.has(top.name) ? falls : null
          const want = family === lifts ? [world.names.lift, world.names.shaft, world.names.well] : [world.names.chute, world.names.tube, world.names.catch]
          const names = chain.map((_lc, k) => (k === 0 ? want[0] : k === chain.length - 1 ? want[2] : want[1]))
          if (!family || chain.some((lc, k) => lc.name !== names[k])) {
            fail(RUBE_PROPS[6], `${label}: ${chain.map((lc) => lc.name).join(' → ')}`)
          }
          if (family === lifts) {
            elevators++
            const stack = run.stacks.find((st) => st.cell === top.cell)
            if (!stack) fail(RUBE_PROPS[7], `${label}: no car at ${top.cell.col},${top.cell.row}`)
            else if (stack.floors !== depth) fail(RUBE_PROPS[7], `${label}: car for ${stack.floors} floors on a ${depth} drop`)
            const speeds = chain.flatMap((lc) => lc.lane.pieces.filter((pc) => pc.ride).map((pc) => pc.v))
            if (speeds.length < chain.length || speeds.some((v) => Math.abs(v - speeds[0]) > 1e-9)) fail(RUBE_PROPS[7], `${label}: ${speeds.join(',')}`)
          }
          // Skip past the chain so a descent is counted once.
          i = j - 1
        }
        if (run.stacks.length !== elevators) fail(RUBE_PROPS[7], `${label}: ${run.stacks.length} cars for ${elevators} elevators`)
        cars += elevators
        drops += run.cells.filter((lc) => lc.name === world.names.chute).length
        for (const lc of run.cells) {
          const shaft = lifts.has(lc.name) || falls.has(lc.name)
          const vertical = lc.in === 'N' || lc.out === 'S'
          if (shaft !== vertical) fail(RUBE_PROPS[6], `${label}: ${lc.name} as ${lc.role}`)
        }

        const wantTokens = Math.max(1, Math.ceil(run.journey / run.emit))
        if (run.tokens !== wantTokens || run.tokens < 1) fail(RUBE_PROPS[8], `${label}: ${run.tokens} of ${wantTokens}`)

        if (fingerprint(comp) !== fingerprint(build(options, 900))) fail(RUBE_PROPS[9], label)

        for (let i = 0; i < run.cells.length; i++) {
          const lc = run.cells[i]
          const inst = instAt.get(lc.cell)
          if (inst && inst.angle !== 0) fail(RUBE_PROPS[10], `${label}: ${lc.name} turned`)
          const next = run.cells[i + 1]
          if (lc.out === 'E' && next && next.cell.col - lc.cell.col !== lc.mirror) {
            fail(RUBE_PROPS[10], `${label}: ${lc.name} faces the wrong way`)
          }
        }

        const head = run.cells[0]
        const tail = run.cells[run.cells.length - 1]
        if (head.role !== 'feeder' || !world.names.feeders.includes(head.name) || head.cell.row !== 0) {
          fail(RUBE_PROPS[11], `${label}: starts with ${head.name} on row ${head.cell.row}`)
        }
        if (tail.role !== 'sink' || !world.names.endings.includes(tail.name) || tail.cell.row !== across - 1) {
          fail(RUBE_PROPS[11], `${label}: ends with ${tail.name} on row ${tail.cell.row}`)
        }
      }
    }
  }
  for (const prop of RUBE_PROPS) check(`rube: ${prop}`, !fails[prop], (fails[prop] ?? []).slice(0, 2).join(' | '))
  check('rube: both elevators and falls get built', cars > 0 && drops > 0, `${cars} cars, ${drops} chutes`)
  check('rube: seeds change the shape of the machine', shapes.size === GOLDBERG_SEEDS.length, `${shapes.size} shapes`)

  // Wander: at 0 the path is a snake with a start; at 1 it strays and the
  // paper shows. Stations: none of the path, all of it.
  const at = (spans: number, chains = 0.5, seed = 'first-look', res = 9) =>
    build({ ...defaultOptions, seed, mode: 'rube', res, spans, chains }, 900)
  for (const seed of GOLDBERG_SEEDS) {
    const snake = at(0, 0.5, seed)
    const strayed = at(1, 0.5, seed)
    check(
      `rube ${seed}: wander 0 covers the grid`,
      snake.instances.length >= 81 - Math.floor(9 * 0.4),
      `${snake.instances.length} of 81`,
    )
    check(
      `rube ${seed}: wander 0 drops one floor at a time`,
      snake.lanes!.stacks.every((st) => st.floors === 1) && !snake.used.includes('tube') && !snake.used.includes('shaft'),
    )
    check(
      `rube ${seed}: wander 1 leaves paper`,
      strayed.instances.length < snake.instances.length,
      `${strayed.instances.length} vs ${snake.instances.length}`,
    )
  }
  const filler = (c: ReturnType<typeof build>) => c.instances.filter((i) => i.contraption.name === world.names.filler).length
  const stations = (c: ReturnType<typeof build>) =>
    c.instances.filter((i) => i.contraption.role !== undefined && i.contraption.name !== world.names.filler && !lifts.has(i.contraption.name) && !falls.has(i.contraption.name)).length
  check('rube: chains 0 is all rail between the turns', filler(at(0.5, 0)) > 0 && stations(at(0.5, 0)) === 2, `${filler(at(0.5, 0))} rail, ${stations(at(0.5, 0))} machines`)
  check('rube: chains 1 leaves no rail', filler(at(0.5, 1)) === 0, `${filler(at(0.5, 1))} left`)
  check('rube: the conduit stays hidden', at(0.5).showWires === false && at(0.5).wires.length === 0)
  check('rube: off-path cells stay paper', at(0.5).cells.length === 81 && at(0.5).instances.length < 81)

  const one = build({ ...defaultOptions, seed: 'first-look', mode: 'rube', res: 6, solo: world.names.filler }, 900)
  check('rube: solo still builds one path', !!one.lanes && one.lanes.cells.length === one.instances.length && one.instances.length > 0)
  check('rube: solo keeps the path joined', !!one.lanes && one.lanes.journey > 0)
}
// -------------------------------------------------------------- end rube --

console.log('\ncatalog')
const catalog = build({ ...defaultOptions, seed: 'catalog', catalog: true }, 900)
check('shows every machine', catalog.instances.length === registry.length)
check('captions every machine', catalog.captions.length === registry.length)
// At phase 0 most machines sit at a turning point and the sheet reads as frozen.
check('staggers phases', new Set(catalog.instances.map((i) => i.phase)).size > registry.length * 0.7)

/**
 * Layouts and scale.
 *
 * One pen draws the whole piece, so a cell four times the size of its
 * neighbour is also four times the ink: every layout is held to two cell sizes
 * at most, differing by exactly 2. And every composer builds at
 * `clampRes(mode, res)`, so a cell is never smaller than the mode's machines
 * can be read at and a piece never floats as a speck inside an empty frame.
 */
console.log('\nlayouts / scale')

type Comp = ReturnType<typeof build>

/** The rectangle the cells occupy, in canvas pixels. */
function frameOf(comp: Comp) {
  return {
    left: Math.min(...comp.cells.map((c) => c.x - c.w / 2)),
    right: Math.max(...comp.cells.map((c) => c.x + c.w / 2)),
    top: Math.min(...comp.cells.map((c) => c.y - c.h / 2)),
    bottom: Math.max(...comp.cells.map((c) => c.y + c.h / 2)),
  }
}

const cellSizes = (comp: Comp) =>
  [...new Set(comp.cells.map((c) => Math.round(c.size * 1e6) / 1e6))].sort((a, b) => a - b)

/**
 * Exact tiling: every unit square of the res grid is inside exactly one cell.
 * Sums of areas would pass with a gap and an overlap that cancel.
 */
function tilingError(comp: Comp, res: number): string {
  const { left, top, right } = frameOf(comp)
  const unit = (right - left) / res
  for (let col = 0; col < res; col++) {
    for (let row = 0; row < res; row++) {
      const x = left + (col + 0.5) * unit
      const y = top + (row + 0.5) * unit
      const over = comp.cells.filter(
        (c) => Math.abs(c.x - x) < c.w / 2 && Math.abs(c.y - y) < c.h / 2,
      ).length
      if (over !== 1) return `unit ${col}:${row} covered ${over}x`
    }
  }
  return ''
}

for (const seed of ['first-look', 'obtuse-plunger-408', 'paper-gantry-552', 'velvet-lever-559']) {
  for (const res of [8, 12, 15, 21]) {
    const grid = build({ ...defaultOptions, seed, layout: 'grid', res }, 900)
    const bounds = frameOf(grid)
    const unit = (bounds.right - bounds.left) / res

    for (const layout of ['bricks', 'quads', 'bands']) {
      const comp = build({ ...defaultOptions, seed, layout, res }, 900)
      const label = `${layout} ${seed}@${res}`
      const sizes = cellSizes(comp)
      check(
        `${label}: at most two cell sizes`,
        sizes.length <= 2,
        sizes.map((s) => s.toFixed(1)).join(','),
      )
      check(
        `${label}: the two sizes differ by exactly 2`,
        sizes.length < 2 || Math.abs(sizes[1] / sizes[0] - 2) < 1e-9,
        sizes.map((s) => s.toFixed(1)).join(','),
      )
      check(
        `${label}: every cell is inside the art area`,
        comp.cells.every(
          (c) =>
            c.x - c.w / 2 >= bounds.left - 1e-6 &&
            c.x + c.w / 2 <= bounds.right + 1e-6 &&
            c.y - c.h / 2 >= bounds.top - 1e-6 &&
            c.y + c.h / 2 <= bounds.bottom + 1e-6,
        ),
      )
      if (layout !== 'bricks') {
        // Bricks is a running bond: its offset courses are meant to be short.
        check(`${label}: tiles the area exactly`, tilingError(comp, res) === '', tilingError(comp, res))
      }
    }

    // Bands: columns one or two units wide, each filled to the bottom.
    const bands = build({ ...defaultOptions, seed, layout: 'bands', res }, 900)
    const widths = [...new Set(bands.cells.map((c) => Math.round(c.w / unit)))].sort()
    check(`bands ${seed}@${res}: widths are 1 or 2 units`, widths.every((k) => k === 1 || k === 2), widths.join(','))
    const byBand = new Map<number, number>()
    for (const c of bands.cells) byBand.set(c.col, (byBand.get(c.col) ?? 0) + c.w * c.h)
    const bandWidth = new Map<number, number>()
    for (const c of bands.cells) bandWidth.set(c.col, Math.max(bandWidth.get(c.col) ?? 0, Math.round(c.w / unit)))
    check(
      `bands ${seed}@${res}: every band fills its column`,
      [...byBand].every(([col, area]) => Math.abs(area - bandWidth.get(col)! * unit * res * unit) < 1e-3),
    )
  }
}

// Every mode builds inside its own res range, whatever the dial says.
for (const { name: mode, res: range } of MODES) {
  for (const dial of [1, 8, 15, 50]) {
    const comp = build({ ...defaultOptions, seed: 'scale', mode, res: dial }, 900)
    const label = `${mode}@${dial}`
    if (!comp.cells.length) {
      check(`${label} lays out cells`, false)
      continue
    }
    const { left, right } = frameOf(comp)
    const span = right - left
    const sizes = comp.cells.map((c) => c.size)
    check(
      `${label}: no cell finer than ${range.max} across`,
      Math.min(...sizes) >= span / range.max - 0.5,
      `${Math.min(...sizes).toFixed(1)} vs ${(span / range.max).toFixed(1)}`,
    )
    check(
      `${label}: no cell coarser than ${range.min} across`,
      Math.max(...sizes) <= span / range.min + 0.5,
      `${Math.max(...sizes).toFixed(1)} vs ${(span / range.min).toFixed(1)}`,
    )
    check(`${label}: sets one pen for the piece`, (comp.unit ?? 0) > 0)
  }
}

// The roll never lands outside the range the composer would clamp it into.
for (const { name: mode, res: range } of MODES) {
  const rolled = Array.from({ length: 200 }, () => rollOptions({ ...defaultOptions, mode }).res)
  check(
    `${mode}: a full roll picks a res in range`,
    rolled.every((r) => r >= range.min && r <= range.max),
    `${Math.min(...rolled)}..${Math.max(...rolled)}`,
  )
}

console.log('\nurl codec')
const seeded = { ...defaultOptions, seed: 'amber-flywheel-812' }
check('omits default dials', serializeOptions(seeded) === 'seed=amber-flywheel-812')
{
  const params = new URLSearchParams(serializeOptions({ ...seeded, catalog: true, mode: 'ports' }))
  check('writes catalog', params.get('catalog') === '1')
  check('writes non-default mode', params.get('mode') === 'ports')
  check('still omits default res', params.get('res') === null)
}
check('invalid mode falls back to classic', parseOptions('?mode=nope&seed=s').mode === 'classic')
for (const { name: mode } of MODES) {
  check(`rollOptions keeps ${mode}`, rollOptions({ ...defaultOptions, mode }).mode === mode)
}
check('res=0 clamps to the mode minimum', parseOptions('?res=0').res === modeInfo('classic').res.min)
check('res=99 clamps to the mode maximum', parseOptions('?res=99').res === modeInfo('classic').res.max)
check('res is integerized', parseOptions('?res=12.7').res === 13)
check('circus res=99 clamps to circus max', parseOptions('?mode=circus&res=99').res === modeInfo('circus').res.max)
check('mode=rube parses', parseOptions('?mode=rube&seed=s').mode === 'rube')
check('rube res=99 clamps to rube max', parseOptions('?mode=rube&res=99').res === modeInfo('rube').res.max)
check('rube serializes its mode', new URLSearchParams(serializeOptions({ ...seeded, mode: 'rube' })).get('mode') === 'rube')
check('stroke clamps to the slider floor', parseOptions('?stroke=0').stroke === 0.4)
check('spans clamp to the slider ceiling', parseOptions('?spans=9').spans === 3)
check('build clamps res=0', build({ ...defaultOptions, seed: 'z', res: 0 }, 900).options.res === modeInfo('classic').res.min)
check('unknown URL keys are ignored', parseOptions('?seed=s&goldberg=1&foo=bar').seed === 's')

/**
 * A no-op p5 so `draw` can run without a canvas. Machines only call drawing
 * methods and read a couple of constants / `drawingContext` for clips.
 */
function stubP5(): p5 {
  const ctx = {
    beginPath() {},
    rect() {},
    arc() {},
    clip() {},
    letterSpacing: '0px',
  }
  const stub: Record<string, unknown> = {
    CLOSE: 'close',
    PIE: 'pie',
    CENTER: 'center',
    TOP: 'top',
    LEFT: 'left',
    RIGHT: 'right',
    BOTTOM: 'bottom',
    CORNER: 'corner',
    RADIUS: 'radius',
    ROUND: 'round',
    SQUARE: 'square',
    PROJECT: 'project',
    MITER: 'miter',
    BEVEL: 'bevel',
    RADIANS: 'radians',
    DEGREES: 'degrees',
    PI: Math.PI,
    TWO_PI: Math.PI * 2,
    HALF_PI: Math.PI / 2,
    QUARTER_PI: Math.PI / 4,
    TAU: Math.PI * 2,
    width: 900,
    height: 900,
    drawingContext: ctx,
    color: () => ({ setAlpha() {} }),
  }
  const p = new Proxy(stub, {
    get(target, prop) {
      if (typeof prop === 'string' && prop in target) return target[prop]
      return () => p
    },
  })
  return p as unknown as p5
}

const snapshot = (value: unknown): string =>
  JSON.stringify(value, (_k, v) => (typeof v === 'function' ? '[fn]' : v))

const DRAW_U = [0, 0.25, 0.5, 0.75, 1 - 1e-9]
const drawTheme = themeByName('okazz')
const drawRng = makeRng('draw-check')

function drawCtx(u: number, size: number, w: number, h: number): DrawCtx {
  return { size, theme: drawTheme, t: u * LOOP, u, weight: 2, ink: drawTheme.ink, w, h, fired: 0 }
}

function setupOf<S>(contraption: Contraption<S>) {
  const [cw, ch] = contraption.span ?? [1, 1]
  const size = 60
  const w = size * cw
  const h = size * ch
  return {
    state: contraption.setup({
      rng: drawRng.fork(contraption.name),
      size,
      w,
      h,
      theme: drawTheme,
      cell: { x: 0, y: 0, size, w, h, col: 0, row: 0, index: 0, depth: 0 },
      color: drawTheme.colors[0],
    }),
    size,
    w,
    h,
  }
}

function runDraw(name: string, state: unknown, draw: (p: p5, u: number) => void): void {
  const p = stubP5()
  const before = snapshot(state)
  try {
    for (const u of DRAW_U) draw(p, u)
  } catch (err) {
    check(`draw ${name}`, false, err instanceof Error ? err.message : String(err))
    return
  }
  check(`draw ${name}`, snapshot(state) === before)
}

console.log('\ndraw')
for (const { name: mode } of MODES) {
  const list = catalogFor(mode)
  if (!list.length) continue
  for (const contraption of list) {
    const { state, size, w, h } = setupOf(contraption)
    runDraw(`${mode}:${contraption.name}`, state, (p, u) => {
      const ctx = drawCtx(u, size, w, h)
      contraption.draw(p, state, ctx)
      contraption.over?.(p, state, ctx)
    })
  }
}
for (const machine of portMachines) {
  const [cw, ch] = machine.span ?? [1, 1]
  const size = 60
  const w = size * cw
  const h = size * ch
  const state = machine.setup({
    rng: drawRng.fork(`port:${machine.name}`),
    size,
    w,
    h,
    theme: drawTheme,
    cell: { x: 0, y: 0, size, w, h, col: 0, row: 0, index: 0, depth: 0 },
    color: drawTheme.colors[0],
  }) as Record<string, unknown>
  const inPort = machine.ins[0] ?? null
  const shaft = machine.driver ?? (inPort?.kind === 'shaft' ? STEADY : null)
  state.link = {
    inSide: inPort?.side ?? null,
    outSides: machine.pickOne ? ['E'] : machine.outs.map((o) => o.side),
    ball: drawTheme.colors[0],
    drive: shaft?.drive ?? null,
    spin: 1,
    camAt: shaft?.camAt ?? 0,
    mesh: 0,
  }
  runDraw(`port:${machine.name}`, state, (p, u) => machine.draw(p, state as never, drawCtx(u, size, w, h)))
}
const TRACK_KINDS: Kind[] = ['run', 'landing', 'drop', 'fall', 'shaft', 'liftIn', 'liftOut']
for (const kind of TRACK_KINDS) {
  const state = { color: drawTheme.colors[0], kind, variant: 'rail' as const }
  runDraw(`track:${kind}`, state, (p, u) => drawTrack(p, state, 60, u, drawTheme.ink, 2))
}
for (const reactor of reactors) {
  const { state, size, w, h } = setupOf(reactor)
  runDraw(`reactor:${reactor.name}`, state, (p, u) => reactor.draw(p, state, drawCtx(u, size, w, h)))
}

console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`)
process.exit(failures === 0 ? 0 : 1)

/**
 * Headless checks for the Builder: that a prompt scaffolds a piece the show
 * can play, that a build survives the trip out to a file and back, that a
 * bad file is refused with its reasons, and that none of it touches the
 * stock worlds.
 *
 *   npm run check:builder
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type p5 from 'p5'
import { R, ballAt, type PieceCtx, type Pt } from './src/parts'
import { beatCount } from './src/plan'
import { Show } from './src/show'
import { compileBuild, compilePiece, stockNames } from './src/builder/compile'
import { install, installedBuilds, uninstall } from './src/builder/registry'
import { ARCHETYPES, archetypeFor, scaffoldPiece, scaffoldWorld } from './src/builder/scaffold'
import { BUILD_EXTENSION, BUILD_FORMAT, BUILD_VERSION, parseBuild, serializeBuild, type Build } from './src/builder/spec'
import { PROVIDERS, PROVIDER_INFO, defaultSettings, modelsFor, readSettings, resolveModel, stillServed } from './src/builder/providers'
import { makeRng } from '../../src/core/rng'
import { themeByName } from '../../src/core/themes'
import { UNLOCK_GAP_MS, UNLOCK_PRESSES, pressCounter } from '../../src/ui/unlock'
import { WORLDS, builtWorlds, registerWorld, worldAt, worldByName, worldOf } from './src/worlds'

let failures = 0
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ok   ${name}`)
    return
  }
  failures++
  console.log(`  FAIL ${name}${detail ? `   ${detail}` : ''}`)
}

const eq = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6

/** A p5 that draws nothing: every member is a function that returns the same, so any drawing call is legal. */
const blank: p5 = new Proxy(function () {}, { get: (_t, prop) => (prop === Symbol.toPrimitive ? () => 0 : blank), apply: () => blank }) as unknown as p5

/* ------------------------------------------------------------------ the stock show, before anything is registered */

const SEED = 'amber-gasket'
const mapOf = (show: Show, i: number) => show.universe(i).pieces.map((p) => `${p.piece.name}@${p.col},${p.row}`).join()
const before = [0, 1, 2, 3].map((i) => mapOf(new Show(SEED), i))

/* ------------------------------------------------------------------ scaffolds */

const PROMPTS: Record<string, string> = {
  striker: 'a mallet that whacks the ball',
  chime: 'a gong that rings when the ball brushes it',
  bouncer: 'a mushroom the ball bounces off',
  lifter: 'a geyser that lifts the ball',
  chute: 'a slide down a hill',
  painter: 'a bucket of honey that pours over the ball',
  spinner: 'a windmill the ball turns',
  launcher: 'a catapult that flings the ball',
}

console.log('\nscaffolds')
check('there is a prompt here for every mechanism', ARCHETYPES.every((a) => a.key in PROMPTS))
const taken = new Set(stockNames())
const build: Build = { format: BUILD_FORMAT, version: BUILD_VERSION, name: 'check-yard', label: 'Check Yard', pieces: [], world: scaffoldWorld('a volcano island', 0) }
for (const a of ARCHETYPES) {
  const prompt = PROMPTS[a.key]
  check(`"${prompt}" asks for the ${a.key}`, archetypeFor(prompt, makeRng('x')).key === a.key)
  const spec = scaffoldPiece(prompt, 0, taken)
  taken.add(spec.name)
  build.pieces.push(spec)
  const again = scaffoldPiece(prompt, 0, new Set(stockNames()))
  check(`${a.key}: the same prompt and variant make the same piece`, JSON.stringify({ ...again, name: spec.name }) === JSON.stringify(spec))
}
check('a prompt that names no mechanism still makes a piece', parseBuild({ ...build, pieces: [scaffoldPiece('zzz qqq', 3, taken)], world: undefined }).errors.length === 0)
check('no scaffold takes a stock piece\'s name', build.pieces.every((p) => !stockNames().has(p.name)))
check('a name already taken is numbered', scaffoldPiece(PROMPTS.chime, 0, new Set([...stockNames(), 'gong'])).name === 'gong-2')

const parsed = parseBuild(build)
check('the scaffolded build validates', parsed.errors.length === 0, parsed.errors.slice(0, 3).join(' · '))

/* ------------------------------------------------------------------ the round trip */

console.log('\nround trip')
const file = serializeBuild(build)
const back = parseBuild(file)
check('a build written to a file reads back', back.build !== null, back.errors.slice(0, 3).join(' · '))
check('and is the same build', back.build !== null && serializeBuild(back.build) === file)
check('its file is named for it', `${build.name}${BUILD_EXTENSION}` === 'check-yard.contraptions.json')
check('nothing is shared with what was parsed', back.build !== null && back.build !== build && back.build.pieces[0] !== build.pieces[0])

const problems = back.build ? install(back.build, 'browser') : ['no build']
check('the build read back installs', problems.length === 0, problems.join(' · '))
const world = worldByName('check-yard')
check('its world is found by name', world !== null && builtWorlds().includes(world))
check('its pieces resolve to it', !!world && build.pieces.every((p) => worldOf(p.name) === world))
check('a borrowed piece still resolves to its stock world', !!world && (build.world?.borrow ?? []).every((n) => WORLDS.includes(worldOf(n)!)))
check('it has a rail, a portal, its own pieces and its cast', !!world && world.pieces.length === 2 + build.pieces.length + (build.world?.borrow.length ?? 0))

/* ------------------------------------------------------------------ playing it */

function checkWorld(name: string, own: string[]): void {
  const w = worldByName(name)!
  const NUDGE = R / 2
  const lonely: string[] = []
  let broken: string[] = []
  const long: string[] = []
  for (const piece of own) {
    const u = new Show(SEED, { solo: piece, world: name }).universe(0)
    const seq = u.pieces.map((p) => p.piece.name)
    if (seq[0] !== 'portal' || seq[seq.length - 1] !== 'portal' || !seq.slice(1, -1).includes(piece) || u.world !== w) lonely.push(piece)
    if (!(u.journey < 8)) long.push(piece)
    for (const placed of u.pieces) {
      const { segs } = placed.lane
      for (let i = 1; i < segs.length; i++) {
        if (segs[i].hidden || segs[i - 1].hidden) continue
        const [ax, ay] = segs[i - 1].to
        const [bx, by] = segs[i].from
        if (Math.hypot(ax - bx, ay - by) > NUDGE) broken.push(`${placed.piece.name}@${i}`)
      }
      if (placed.piece.name === 'portal') continue
      if (!eq(segs[0].from, [-0.5, 0])) broken.push(`${placed.piece.name}:entry`)
      const [ex, ey] = segs[segs.length - 1].to
      if (Math.abs(Math.abs(ex % 1) - 0.5) > 1e-6 || Math.abs(ey - Math.round(ey)) > 1e-6) broken.push(`${placed.piece.name}:exit`)
      if (segs.some((s) => !(s.dur > 0))) broken.push(`${placed.piece.name}:dur`)
    }
  }
  broken = [...new Set(broken)]
  check(`${name}: every piece has a solo world with itself between two portals`, lonely.length === 0, lonely.join(','))
  check(`${name}: a solo world is short`, long.length === 0, long.join(','))
  check(`${name}: every lane joins up, enters on the rail line and leaves on it`, broken.length === 0, broken.join(','))

  // Pinned, the show stays in the build and its maps hold together like any other.
  const show = new Show('paper-valve-077', { world: name })
  const used = new Set<string>()
  let ok = true
  let detail = ''
  for (let i = 0; i < 6; i++) {
    const u = show.universe(i)
    if (u.world !== w) (ok = false), (detail = 'left its world')
    const seen = new Set<string>()
    for (const placed of u.pieces) {
      used.add(placed.piece.name)
      for (const [c, r] of placed.cells) {
        const key = `${c}:${r}`
        if (seen.has(key)) (ok = false), (detail = `two pieces share ${key}`)
        seen.add(key)
        if (c < u.box.x0 || c > u.box.x1 || r < u.box.y0 || r > u.box.y1) (ok = false), (detail = `${placed.piece.name} is outside the box`)
      }
    }
    for (let j = 0; j + 1 < u.pieces.length; j++) {
      const a = u.pieces[j]
      const b = u.pieces[j + 1]
      const end = a.lane.segs[a.lane.segs.length - 1].to
      const start = b.lane.segs[0].from
      if (!eq([a.col + a.mirror * end[0], a.row + end[1]], [b.col + b.mirror * start[0], b.row + start[1]])) (ok = false), (detail = `${a.piece.name} does not hand off to ${b.piece.name}`)
      const left = ballAt(a.ballIn, a.changes, Infinity)
      if (left.color !== b.ballIn.color || left.id !== b.ballIn.id) (ok = false), (detail = 'the ball\'s state is not carried')
    }
    // No part of a built piece is the colour the ball arrives in, and a repaint is always a change.
    for (const placed of u.pieces) {
      if (!own.includes(placed.piece.name)) continue
      const s = placed.state as { color: string; accent: string; paint: string }
      if (s.color === placed.ballIn.color || s.accent === placed.ballIn.color) (ok = false), (detail = `${placed.piece.name} wears the ball's colour`)
      if (placed.changes.length && ballAt(placed.ballIn, placed.changes, Infinity).color === placed.ballIn.color) (ok = false), (detail = `${placed.piece.name} repaints the ball its own colour`)
      if (placed.changes.some((c) => c.at < 0 || c.at > placed.span)) (ok = false), (detail = `${placed.piece.name} changes the ball outside itself`)
    }
    if (u.pieces[0].piece.name !== 'portal' || u.pieces[u.pieces.length - 1].piece.name !== 'portal' || beatCount(u.pieces) < 1) (ok = false), (detail = 'not a map from a portal to a portal')
  }
  check(`${name}: six maps hold together: no overlaps, exact hand-offs, the ball carried, no body in the ball's colour`, ok, detail)
  const unplayed = own.filter((n) => !used.has(n))
  check(`${name}: every piece of its own turns up in them`, unplayed.length === 0, unplayed.join(','))
  const again = new Show('paper-valve-077', { world: name })
  check(`${name}: the same seed builds the same map again`, mapOf(show, 0) === mapOf(again, 0))
}
checkWorld('check-yard', build.pieces.map((p) => p.name))

/* ------------------------------------------------------------------ drawing */

console.log('\ndrawing')
{
  const theme = themeByName('okazz')
  let drawn = 0
  let threw = ''
  for (const spec of build.pieces) {
    const piece = compilePiece(spec)
    const state = { color: theme.colors[0], accent: theme.colors[1], paint: theme.colors[2] }
    for (let t = -1; t < 6; t += 0.05) {
      const c: PieceCtx = { k: 100, t, since: t - 0.5, ink: theme.ink, bg: theme.bg, weight: 3, color: theme.colors[3], theme, spin: () => 0 }
      try {
        piece.draw(blank, state, c)
        piece.over?.(blank, state, c)
        drawn++
      } catch (err) {
        threw = `${spec.name} at t=${t.toFixed(2)}: ${(err as Error).message}`
      }
    }
  }
  check('every piece draws at every moment, before the ball, as it passes and long after', !threw && drawn > 0, threw)
}

/* ------------------------------------------------------------------ what is refused */

console.log('\nrefusals')
const gong = build.pieces.find((p) => p.name === 'gong')!
const broken = (change: (b: any) => void): string[] => {
  const copy = JSON.parse(file)
  change(copy)
  return parseBuild(copy).errors
}
check('not JSON', parseBuild('{nope').errors.length > 0)
check('some other JSON', parseBuild({ hello: 'world' }).errors.length > 0)
check('a version from the future', broken((b) => (b.version = 2)).some((e) => e.includes('version')))
check('a lane that stops short of its exit', broken((b) => b.pieces[1].lane.pop()).some((e) => e.includes('must end at')))
check('a lane that leaves its cells', broken((b) => (b.pieces[1].lane[0].to = [0, 3])).some((e) => e.includes('outside the cells')))
check('a footprint without its entry cell', broken((b) => (b.pieces[1].cells = [[0, -1]])).some((e) => e.includes('entry cell')))
check('an exit into its own footprint', broken((b) => (b.pieces[1].exit.at = [0, -1])).some((e) => e.includes('own cells')))
check('two pieces of one name', broken((b) => (b.pieces[2].name = b.pieces[1].name)).some((e) => e.includes('share a name')))
check('a shape that is not one', broken((b) => (b.pieces[1].shapes[0].kind = 'script')).some((e) => e.includes('kind')))
check('a number that is not one', broken((b) => (b.pieces[1].weight = 'heavy')).some((e) => e.includes('weight')))
check('a piece called rail', broken((b) => (b.pieces[1].name = 'rail')).some((e) => e.includes('rail')))
check('ink that does not read on its paper', broken((b) => (b.world.themes[0].ink = b.world.themes[0].bg)).some((e) => e.includes('does not read')))
check('a build named for a stock world', broken((b) => (b.name = 'harbor')).some((e) => e.includes('stock world')))
check('a piece named for a stock piece compiles to nothing', compileBuild({ ...build, pieces: [{ ...gong, name: 'hammer' }] }).world === null)
check('a cast member nobody has heard of', compileBuild({ ...build, world: { ...build.world!, borrow: ['no-such-piece'] } }).world === null)
check('a stock world\'s name cannot be registered over', !registerWorld({ ...worldByName('check-yard')!, name: 'garden' }))

/* ------------------------------------------------------------------ the builds folder */

console.log('\nshipped builds')
// The Builder's samples, and whatever has been dropped in the builds folder (which ships empty).
const shipped = [
  { dir: 'apps/rube/src/builder/samples', source: 'sample' as const },
  { dir: 'apps/rube/builds', source: 'folder' as const },
]
const sampleCount = readdirSync(join(process.cwd(), shipped[0].dir)).filter((f) => f.endsWith(BUILD_EXTENSION)).length
check('the Builder ships a sample for its bench', sampleCount > 0)
for (const { dir, source } of shipped) {
  const folder = join(process.cwd(), dir)
  for (const name of readdirSync(folder).filter((f) => f.endsWith(BUILD_EXTENSION))) {
    const text = readFileSync(join(folder, name), 'utf8')
    const read = parseBuild(text)
    check(`${name}: validates`, read.build !== null, read.errors.slice(0, 3).join(' · '))
    if (!read.build) continue
    check(`${name}: is named for its build`, name === `${read.build.name}${BUILD_EXTENSION}`)
    check(`${name}: is written the way the Builder writes it`, serializeBuild(read.build) === text)
    const errors = install(read.build, source)
    check(`${name}: installs`, errors.length === 0, errors.join(' · '))
    if (!errors.length) checkWorld(read.build.name, read.build.pieces.map((p) => p.name))
  }
}

/* ------------------------------------------------------------------ the lock */

console.log('\nthe lock')
{
  const quick = UNLOCK_GAP_MS * 0.6
  const run = (times: number[]) => {
    const press = pressCounter()
    return times.map((t) => press(t))
  }
  const at = (n: number, gap: number, from = 0) => Array.from({ length: n }, (_, i) => from + i * gap)
  check('five quick presses unlock, on the fifth and not before', UNLOCK_PRESSES === 5 && run(at(5, quick)).join() === 'false,false,false,false,true')
  check('four are not enough', run(at(4, quick)).every((fired) => !fired))
  check('five slow ones are five separate presses', run(at(5, UNLOCK_GAP_MS + 50)).every((fired) => !fired))
  check('a pause in the middle starts the count over', run([...at(3, quick), ...at(4, quick, 5000)]).every((fired) => !fired))
  check('and five after the pause still count', run([...at(3, quick), ...at(5, quick, 5000)]).pop() === true)
  check('a sixth press does not fire again: the next run needs its own five', run(at(9, quick)).filter(Boolean).length === 1 && run(at(10, quick)).filter(Boolean).length === 2)
}

/* ------------------------------------------------------------------ who writes it */

console.log('\nproviders')
{
  check('three ways to make a piece, offline first', PROVIDERS.join() === 'offline,claude,gateway' && defaultSettings().provider === 'offline')
  check('offline has no models to pick', modelsFor('offline').length === 0)
  const claude = modelsFor('claude').map((m) => m.id)
  const gateway = modelsFor('gateway').map((m) => m.id)
  check('the Claude list is the Anthropic API\'s own ids', claude.length > 1 && claude.every((id) => /^claude-[a-z0-9-]+$/.test(id)))
  check('the gateway list is provider/model ids', gateway.length > 1 && gateway.every((id) => /^[a-z0-9-]+\/[a-z0-9.-]+$/.test(id)))
  check('no id is on both lists', claude.every((id) => !gateway.includes(id)))
  check('each provider\'s default is on its own list', claude.includes(PROVIDER_INFO.claude.defaultModel) && gateway.includes(PROVIDER_INFO.gateway.defaultModel))
  check('a saved choice is kept while its provider offers it', resolveModel('claude', claude[1]) === claude[1] && resolveModel('gateway', gateway[3]) === gateway[3])
  check('a model never crosses providers: the other\'s id becomes this one\'s default', resolveModel('gateway', claude[1]) === PROVIDER_INFO.gateway.defaultModel && resolveModel('claude', gateway[3]) === PROVIDER_INFO.claude.defaultModel)
  check('nothing saved is the default', resolveModel('claude', null) === PROVIDER_INFO.claude.defaultModel)
  const live = [gateway[1], gateway[4], 'someone/else']
  const served = stillServed(modelsFor('gateway'), live).map((m) => m.id)
  check('the gateway list drops what the gateway no longer serves', served.join() === [gateway[1], gateway[4]].join())
  check('and a choice that was dropped falls to the first that is left', resolveModel('gateway', gateway[0], stillServed(modelsFor('gateway'), live)) === gateway[1])
  check('an unreachable or empty gateway list changes nothing', stillServed(modelsFor('gateway'), null).length === gateway.length && stillServed(modelsFor('gateway'), ['x/y']).length === gateway.length)
  const read = readSettings({ provider: 'gateway', models: { claude: 'nope', gateway: gateway[2], other: 'x' } })
  check('stored settings are read with suspicion', read.provider === 'gateway' && read.models.gateway === gateway[2] && read.models.claude === PROVIDER_INFO.claude.defaultModel && Object.keys(read.models).length === 2)
  check('and junk is the defaults', readSettings('junk').provider === 'offline' && readSettings({ provider: 'skynet' }).provider === 'offline')
}

/* ------------------------------------------------------------------ the stock show, after */

console.log('\nthe stock show')
check('there are still exactly four worlds in the loop', WORLDS.length === 4 && [0, 1, 2, 3, 4, 5, 6, 7].every((i) => WORLDS.includes(worldAt(i))))
check('a stock name still finds the stock world', WORLDS.every((w) => worldByName(w.name) === w))
check('the same seed builds the same four stock maps as before any build was installed', [0, 1, 2, 3].every((i) => mapOf(new Show(SEED), i) === before[i]))
const count = installedBuilds().length
uninstall('check-yard')
check('a build can be taken out again', installedBuilds().length === count - 1 && worldByName('check-yard') === null)

console.log(failures ? `\n${failures} failure(s)` : '\nall good')
process.exit(failures ? 1 : 0)

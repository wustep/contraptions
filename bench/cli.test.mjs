import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { makeSuite } from './suite.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'construct-bench-test-'))
const owned = []
function cli(args, status = 0, workspaceHome = home) {
  const result = spawnSync(process.execPath, ['bench/cli.mjs', ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, CONTRAPTIONS_BENCH_HOME: workspaceHome },
  })
  assert.equal(result.status, status, result.stderr || result.stdout)
  return result.stdout ? JSON.parse(result.stdout) : result.stderr
}
function start() {
  const run = cli(['start', 'starter', 'smoke-test-model'])
  owned.push(path.join(root, 'bench/runs', run.run))
  return run
}
// Deliberately plain fixtures test gates, not craft; they are never candidate inputs.
function fixture(name) {
  return {
    format: 'contraptions-build', version: 1, name,
    pieces: Array.from({ length: 10 }, (_, i) => ({ name: `${name}-test-${i}`, weight: 1, cells: [[0, 0]], exit: { at: [1, 0], dir: 1 }, lane: [{ op: 'roll', to: [0.5, 0] }], shapes: [{ kind: 'rail', x0: -0.5, x1: 0.5 }] })),
    world: { themes: [{ name: 'test', label: 'Test', bg: '#ffffff', ink: '#111111', colors: ['#aa3300', '#0066aa', '#339900', '#9944aa', '#bb8800'] }], backdrops: ['plain'], rail: 'workshop', borrow: [] },
  }
}
function deliver(run) {
  for (let n = 1; n <= 3; n++) fs.writeFileSync(path.join(run.workspace, `builds/world-${n}.contraptions.json`), JSON.stringify(fixture(`world-${n}`)))
  fs.writeFileSync(path.join(run.workspace, 'HONESTY.md'), 'Synthetic gate fixtures; no rendered inspection.\n')
}
function fillAssessment(archive, overrides = {}) {
  const rubric = JSON.parse(fs.readFileSync(path.join(archive, 'rubric.json'), 'utf8'))
  const assessment = {
    version: 1,
    evaluatorModel: rubric.evaluator.model,
    evaluatorKind: 'model',
    status: 'rated',
    score: null,
    rationale: 'Suite-level judgment from sealed JSON only.',
    axes: Object.fromEntries(rubric.axes.map(a => [a.id, { rating: 3, evidence: `${a.id}: world-1-test-0 handoff readable` }])),
    issues: [],
    ...overrides,
  }
  if (overrides.axes) assessment.axes = overrides.axes
  fs.writeFileSync(path.join(archive, 'assessment.json'), JSON.stringify(assessment, null, 2) + '\n')
  return assessment
}
test.after(() => {
  for (const dir of owned) fs.rmSync(dir, { recursive: true, force: true })
  fs.rmSync(home, { recursive: true, force: true })
})

test('seeded briefs are reproducible, new mints fresh IDs, and CLI rejects unsafe paths', () => {
  assert.deepEqual(makeSuite('same', 'x'), makeSuite('same', 'x'))
  assert.notDeepEqual(makeSuite('same', 'x').worlds, makeSuite('different', 'x').worlds)
  const a = cli(['new', 'smoke-seed'])
  owned.push(path.join(root, 'bench/suites', a.suite))
  const b = cli(['new', 'smoke-seed'])
  owned.push(path.join(root, 'bench/suites', b.suite))
  assert.notEqual(a.suite, b.suite)
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(owned[0], 'suite.json'))).worlds, JSON.parse(fs.readFileSync(path.join(owned[1], 'suite.json'))).worlds)
  assert.match(cli(['start', '../starter', 'test'], 1), /simple suite\/run id/)
  assert.match(cli(['start', 'starter'], 1), /model id/)
  assert.match(cli(['start', 'starter', 'test'], 1, root), /outside the repository/)
  const alias = path.join(home, 'repo-alias')
  fs.symlinkSync(root, alias)
  assert.match(cli(['start', 'starter', 'test'], 1, path.join(alias, 'work')), /outside the repository/)
})

test('candidate inputs exclude solutions; check, seal, score preserve exact bytes and detect tampering', () => {
  const run = start()
  assert.ok(run.workspace.startsWith(home + path.sep))
  const list = fs.readdirSync(run.workspace, { recursive: true }).map(String)
  for (const excluded of ['rubric', 'compile', 'caldera', 'scaffold', 'assessment', 'run.json', 'gates', 'pieces/']) assert.ok(!list.some(p => p.includes(excluded)), excluded)
  assert.ok(list.includes('specs/build-spec.ts'))
  assert.ok(list.includes('specs/theme.ts'))
  deliver(run)
  assert.equal(cli(['check', run.run]).gates.passed, true)
  const source = path.join(run.workspace, 'builds/world-1.contraptions.json')
  const before = fs.readFileSync(source)
  const sealed = cli(['seal', run.run])
  assert.equal(sealed.gates.passed, true)
  const archive = path.join(root, 'bench/runs', run.run)
  const file = path.join(archive, 'builds/world-1.contraptions.json')
  assert.deepEqual(fs.readFileSync(file), before)
  fs.writeFileSync(source, 'changed after sealing')
  const prepared = cli(['score', run.run])
  assert.equal(prepared.status, 'awaiting-assessment')
  assert.equal(prepared.score, null)
  assert.equal(prepared.evaluator, 'claude-opus-5')
  assert.ok(fs.existsSync(path.join(archive, 'EVAL_PROMPT.md')))
  assert.match(fs.readFileSync(path.join(archive, 'EVAL_PROMPT.md'), 'utf8'), /claude-opus-5/)
  assert.match(cli(['seal', run.run], 1), /already sealed/)
  const assessment = JSON.parse(fs.readFileSync(path.join(archive, 'assessment.json')))
  assert.equal(assessment.axes['theme-and-variety'].rating, null)
  assert.equal(assessment.axes['chain-readability'].rating, null)
  assert.equal(assessment.axes['honesty-and-guidelines'].rating, null)
  assert.equal(assessment.worlds, undefined)
  fs.appendFileSync(file, '\n')
  assert.match(cli(['score', run.run], 1), /Sealed artifacts changed/)
})

test('score registers a filled Opus 5 assessment and rejects substitute models', () => {
  const run = start()
  deliver(run)
  cli(['seal', run.run])
  const archive = path.join(root, 'bench/runs', run.run)
  assert.equal(cli(['score', run.run]).status, 'awaiting-assessment')
  fillAssessment(archive)
  const scored = cli(['score', run.run, '--assess'])
  assert.equal(scored.status, 'scored')
  assert.equal(scored.score, 75)
  assert.equal(scored.evaluator, 'claude-opus-5')
  const assessment = JSON.parse(fs.readFileSync(path.join(archive, 'assessment.json')))
  assert.equal(assessment.score, 75)
  assert.equal(assessment.status, 'scored')
  const seal = JSON.parse(fs.readFileSync(path.join(archive, 'seal.json')))
  assert.equal(seal.score, 75)
  assert.equal(seal.evaluatorModel, 'claude-opus-5')
  fillAssessment(archive, { evaluatorModel: 'claude-sonnet-4' })
  assert.match(cli(['score', run.run, '--assess'], 1), /evaluatorModel must be exactly "claude-opus-5"/)
})

test('real schema/compile gates reject malformed builds and invalid delivery without executing code', () => {
  const run = start()
  deliver(run)
  const file = path.join(run.workspace, 'builds/world-1.contraptions.json')
  const variants = [
    ['{', 'schema'],
    [{ ...fixture('world-1'), format: 'wrong' }, 'schema'],
    [{ ...fixture('world-1'), version: 2 }, 'schema'],
    [{ ...fixture('world-1'), pieces: [] }, 'contract'],
    [{ ...fixture('world-1'), world: undefined }, 'contract'],
  ]
  const mutate = (fn, gate = 'schema') => { const b = fixture('world-1'); fn(b); variants.push([b, gate]) }
  mutate(b => { b.pieces[1].name = b.pieces[0].name })
  mutate(b => { b.pieces[0].cells = [[1, 0]] })
  mutate(b => { b.pieces[0].lane[0].to = [0.3, 0] })
  mutate(b => { b.pieces[0].lane = [{ op: 'wait', dur: -1 }] })
  mutate(b => { b.pieces[0].name = 'hammer' }, 'compile')
  mutate(b => { b.world.borrow = ['hammer'] }, 'contract')
  mutate(b => { b.pieces[0].cells = [[0,0],[-1,0],[-2,0],[-3,0],[0,-1],[-1,-1],[-2,-1]] }, 'contract')
  for (const [value, gate] of variants) {
    fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value))
    const result = cli(['check', run.run], 1)
    assert.ok(result.gates.worlds[0][gate].length, `${gate}: ${JSON.stringify(value).slice(0, 100)}`)
  }
  fs.unlinkSync(file)
  assert.match(cli(['seal', run.run], 1), /exactly/)
  fs.symlinkSync(path.join(run.workspace, 'builds/world-2.contraptions.json'), file)
  assert.match(cli(['seal', run.run], 1), /no symlinks/)
  fs.unlinkSync(file)
  fs.writeFileSync(file, 'x'.repeat(524289))
  assert.match(cli(['seal', run.run], 1), /regular file/)
  fs.writeFileSync(file, '{')
  assert.equal(cli(['seal', run.run], 1).sealed, true)
  assert.equal(cli(['score', run.run], 1).status, 'ineligible')
})

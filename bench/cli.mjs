#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { makeSuite } from './suite.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bench = path.join(root, 'bench')
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'))
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' })
const hash = value => createHash('sha256').update(value).digest('hex')
const id = value => {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(value ?? '')) throw Error('Expected a simple suite/run id (letters, digits, hyphens)')
  return value
}
const token = () => randomUUID().slice(0, 8)
const suiteDir = value => path.join(bench, 'suites', id(value))
const runDir = value => path.join(bench, 'runs', id(value))
function regular(file, max = 512 * 1024) {
  const stat = fs.lstatSync(file)
  if (!stat.isFile() || stat.size > max) throw Error(`${path.basename(file)}: expected a regular file <= ${max} bytes (no symlinks)`)
  return fs.readFileSync(file)
}
function directory(dir) {
  if (!fs.lstatSync(dir).isDirectory()) throw Error(`${dir}: expected a directory (no symlinks)`)
}
function outsideHome() {
  const requested = path.resolve(process.env.CONTRAPTIONS_BENCH_HOME || path.join(os.homedir(), '.contraptions-bench'))
  // Resolve existing ancestors before mkdir, so symlink aliases cannot put work inside the repository.
  let ancestor = requested
  const suffix = []
  while (!fs.existsSync(ancestor)) { suffix.unshift(path.basename(ancestor)); ancestor = path.dirname(ancestor) }
  const real = path.join(fs.realpathSync(ancestor), ...suffix)
  const repo = fs.realpathSync(root)
  if (real === repo || real.startsWith(repo + path.sep)) throw Error('Workspace home must be outside the repository')
  fs.mkdirSync(real, { recursive: true })
  return real
}
function readSuite(value) {
  const suite = json(path.join(suiteDir(value), 'suite.json'))
  if (suite.version !== 1 || suite.id !== value || suite.worlds?.length !== 3 ||
      suite.worlds.some((w, i) => w.name !== `world-${i + 1}` || w.pieces !== 10)) throw Error('Invalid v1 suite')
  return suite
}
function inputs(suite) {
  const files = { 'suite.json': Buffer.from(JSON.stringify(suite, null, 2) + '\n') }
  for (const name of ['TASK.md', 'prompts/construct.md', 'guidelines/construction.md', 'specs/contract.json', 'specs/FORMAT.md']) files[name] = fs.readFileSync(path.join(bench, name))
  // Type declarations and validator only; no examples, scaffold, compiler, palettes or catalog.
  files['specs/build-spec.ts'] = fs.readFileSync(path.join(root, 'apps/rube/src/builder/spec.ts'))
  const theme = fs.readFileSync(path.join(root, 'src/core/themes.ts'), 'utf8').split('\n/**\n * Twenty palettes')[0]
  files['specs/theme.ts'] = Buffer.from(theme)
  return files
}
function saveFiles(dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, bytes] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
    fs.writeFileSync(path.join(dir, name), bytes, { flag: 'wx' })
  }
}
const digest = files => hash(JSON.stringify(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([name, bytes]) => [name, hash(bytes)])))
async function checker() {
  const bundle = await build({ entryPoints: [path.join(bench, 'gates.ts')], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
  const code = bundle.outputFiles[0].text
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  return { check: module.checkBuild, compilerDigest: hash(code) }
}
function artifacts(dir, suite) {
  directory(dir)
  const expected = suite.worlds.map(w => `${w.name}.contraptions.json`).sort()
  if (JSON.stringify(fs.readdirSync(dir).sort()) !== JSON.stringify(expected)) throw Error(`builds/ must contain exactly: ${expected.join(', ')}`)
  return Object.fromEntries(expected.map(name => [name, regular(path.join(dir, name))]))
}
async function gates(files, suite) {
  const { check, compilerDigest } = await checker()
  const worlds = suite.worlds.map(w => {
    const result = check(files[`${w.name}.contraptions.json`].toString('utf8'), w.name)
    // The benchmark's small-world constraint is stricter than the portable format.
    if (result.schema.length === 0) {
      const b = JSON.parse(files[`${w.name}.contraptions.json`])
      for (const p of b.pieces) if (p.cells.length > 6) result.contract.push(`${p.name}: at most six cells`)
    }
    return { name: w.name, ...result, passed: result.passed && !result.contract.length }
  })
  return { passed: worlds.every(w => w.passed), compilerDigest, worlds }
}
export async function main(args) {
  const [command, value, model, ...extra] = args
  if (extra.length || (model !== undefined && command !== 'start')) throw Error('Unexpected arguments; see help')
  if (!command || command === 'help') return { usage: ['new [seed]', 'start <suite-id> <model-id>', 'check <run-id>', 'seal <run-id>', 'score <run-id>'], note: 'Run via node bench/cli.mjs. score verifies the seal and prints the manual evaluation path.' }
  if (command === 'new') {
    const seed = value ?? randomUUID()
    const suiteId = `suite-${hash(seed).slice(0, 10)}-${token()}`
    const dir = suiteDir(suiteId)
    fs.mkdirSync(dir)
    write(path.join(dir, 'suite.json'), makeSuite(seed, suiteId))
    return { suite: suiteId, seed, next: `node bench/cli.mjs start ${suiteId} <model-id>` }
  }
  if (command === 'start') {
    if (!model?.trim()) throw Error('start requires the candidate model id')
    const suite = readSuite(id(value))
    const home = outsideHome()
    const runId = `run-${token()}-${token()}`
    const workspace = path.join(home, runId)
    const dir = runDir(runId)
    fs.mkdirSync(workspace)
    fs.mkdirSync(dir)
    const supplied = inputs(suite)
    saveFiles(workspace, supplied)
    saveFiles(path.join(dir, 'inputs'), supplied)
    fs.mkdirSync(path.join(workspace, 'builds'))
    write(path.join(dir, 'rubric.json'), json(path.join(bench, 'rubric.json')))
    const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
    const dirty = !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
    write(path.join(dir, 'run.json'), { version: 1, id: runId, suite: suite.id, model, workspace, startedAt: new Date().toISOString(), revision, dirty, inputDigest: digest(supplied) })
    return { run: runId, workspace, next: 'Start a fresh candidate here; read TASK.md. Operator: check, then seal this run.' }
  }
  if (!['check', 'seal', 'score'].includes(command)) throw Error('Unknown command; see help')
  const dir = runDir(value)
  const run = json(path.join(dir, 'run.json'))
  const suite = json(path.join(dir, 'inputs/suite.json'))
  if (command === 'score') {
    const sealed = json(path.join(dir, 'seal.json'))
    const files = artifacts(path.join(dir, 'builds'), suite)
    if (digest(files) !== sealed.artifactDigest) throw Error('Sealed artifacts changed')
    const result = await gates(files, suite)
    if (result.compilerDigest !== sealed.gates.compilerDigest) throw Error('Compiler changed; evaluate with the recorded revision')
    return { run: value, gates: result, assessment: path.join(dir, 'assessment.json'), protocol: path.join(bench, 'EVAL.md'), status: result.passed ? 'awaiting-manual-evaluation' : 'ineligible', score: null }
  }
  if (fs.existsSync(path.join(dir, 'seal.json'))) throw Error('Run already sealed; start a fresh run for another attempt')
  directory(run.workspace)
  const files = artifacts(path.join(run.workspace, 'builds'), suite)
  const result = await gates(files, suite)
  if (command === 'check') return { run: value, gates: result }
  // Snapshot bytes first; gates evaluated those exact bytes, never candidate executable code.
  saveFiles(path.join(dir, 'builds'), files)
  let honesty
  try { honesty = regular(path.join(run.workspace, 'HONESTY.md'), 32 * 1024) } catch { honesty = Buffer.from('MISSING: operator must mark honesty unverified.\n') }
  fs.writeFileSync(path.join(dir, 'HONESTY.md'), honesty, { flag: 'wx' })
  const rubric = json(path.join(dir, 'rubric.json'))
  write(path.join(dir, 'assessment.json'), { evaluatorModel: rubric.evaluator.model, evaluatorKind: null, evidenceMode: null, status: 'unrated', score: null, worlds: suite.worlds.map(w => ({ name: w.name, axes: Object.fromEntries(rubric.axes.map(a => [a.id, { rating: null, evidence: '' }])) })) })
  write(path.join(dir, 'seal.json'), { sealedAt: new Date().toISOString(), artifactDigest: digest(files), honestyDigest: hash(honesty), gates: result, status: result.passed ? 'awaiting-manual-evaluation' : 'ineligible', score: null })
  return { run: value, gates: result, sealed: true, next: `node bench/cli.mjs score ${value}` }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await main(process.argv.slice(2))
    console.log(JSON.stringify(result, null, 2))
    if (result.gates && !result.gates.passed) process.exitCode = 1
  } catch (error) { console.error(`bench: ${error.message}`); process.exitCode = 1 }
}

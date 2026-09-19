import '../../../../src/ui/styles.css'
import { downloadBlob } from '../../../../src/core/capture'
import { makeRng } from '../../../../src/core/rng'
import { randomSeed } from '../../../../src/core/seed'
import { ICON, copyButton, createShell, el, field, icon, section } from '../../../../src/ui/shell'
import { createCatalog } from '../catalog'
import { createStage } from '../engine'
import { Show } from '../show'
import { worldByName } from '../worlds'
import { defaultWorldSpec, mendBuild, stockNames } from './compile'
import { folderBuilds, sampleBuilds } from './discover'
import { Stopped, gatewayModelIds, generatePiece, generateWorld, type Generator } from './generate'
import { PROVIDERS, PROVIDER_INFO, loadKey, loadSettings, modelsFor, providerLabel, resolveModel, saveKey, saveSettings, stillServed, type Keyed } from './providers'
import { deleteBuild, forgetUnreadable, install, installBuilds, installShipped, installedBuilds, saveBuild, storeKept, unreadable } from './registry'
import { ARCHETYPES, castFrom, scaffoldPiece, scaffoldWorld } from './scaffold'
import { BACKDROPS, BUILD_EXTENSION, BUILD_FORMAT, LIMITS, STOCK_WORLDS, emptyBuild, parseBuild, prettyJson, serializeBuild, slug, uniqueName, type Build, type PieceSpec, type WorldSpec } from './spec'

/**
 * The entry: the Builder. A prompt makes a piece — by a model when one is
 * chosen and its key is set, by the offline scaffolds when not — and the piece is on the stage at
 * once, alone between two portals exactly as the catalog shows a stock one,
 * because it *is* one by then: a `Piece` in a registered world. A second
 * prompt makes the place it plays in. Everything made is a build: kept in
 * this browser as it changes, exported as one JSON file, imported from one,
 * and played in Machine by pinning the show to it.
 *
 * The stage has three views of the build in hand: a piece alone, the sheet
 * of all its pieces, and its world as the show would run it. The panel is
 * the workbench, and unlike the other two modes it opens with it out.
 *
 * Every change to a build can be taken back (Undo, ⌘Z), a delete and a
 * rename included, and a model can be stopped while it writes.
 */

const stage = document.getElementById('stage')!
const panelRoot = document.getElementById('panel')!

installBuilds(folderBuilds(), sampleBuilds())

/* ------------------------------------------------------------------ state */

type ViewMode = 'piece' | 'sheet' | 'world'
const VIEW_MODES: ViewMode[] = ['piece', 'sheet', 'world']

const params = new URLSearchParams(location.search)
let seed = params.get('seed') || randomSeed()
let mode: ViewMode = VIEW_MODES.includes(params.get('view') as ViewMode) ? (params.get('view') as ViewMode) : 'piece'

/** The build on the bench: the one the link names, else the last one worked on here, else the sample, else a new one. */
function firstBuild(): Build {
  const all = installedBuilds()
  const named = all.find((i) => i.build.name === params.get('build'))
  const mine = [...all].reverse().find((i) => i.source === 'browser')
  return structuredClone((named ?? mine ?? all[0])?.build ?? emptyBuild('my-build'))
}

let build = firstBuild()
let selected: string | null = build.pieces.find((p) => p.name === params.get('piece'))?.name ?? build.pieces[0]?.name ?? null

/** How many times each prompt has been made, so making it again makes another. */
const variants = new Map<string, number>()
/** The next way to make this prompt: the first the first time, then each time another; never below `from`. */
function nextVariant(key: string, from = 0): number {
  const v = Math.max(variants.get(key) ?? from, from)
  variants.set(key, v + 1)
  return v
}

/** What a model is writing, while one is: the button that asked for it is its Stop button meanwhile. */
type Making = 'piece' | 'world' | 'again'
let making: Making | null = null
let stopper: AbortController | null = null

/* ------------------------------------------------------------------ clock */

let paused = false
let base = 0
let origin = performance.now()
const now = () => (paused ? base : base + (performance.now() - origin) / 1000)
const seek = (t: number) => {
  base = Math.max(0, t)
  origin = performance.now()
}
const setPaused = (next: boolean) => {
  if (next === paused) return
  base = now()
  origin = performance.now()
  paused = next
  sync()
}

/* ------------------------------------------------------------------ stage */

interface View {
  destroy(): void
}

let show: Show | null = null
let view: View | null = null

/** What is actually on the stage: a piece alone needs a piece, and a sheet needs at least one. */
const shownMode = (): ViewMode => (build.pieces.length ? (mode === 'piece' && !selected ? 'world' : mode) : 'world')

function mount(): void {
  view?.destroy()
  show = null
  const world = worldByName(build.name)
  if (!world) {
    view = null
    return
  }
  const m = shownMode()
  if (m === 'sheet') {
    view = createCatalog(stage, seed, { time: now }, (name) => select(name, 'piece'), { worlds: [world], hints: ['click a piece to watch it alone'] })
    stage.style.setProperty('--paper', world.themes[0].bg)
    return
  }
  show = new Show(seed, m === 'piece' ? { solo: selected, world: build.name } : { world: build.name })
  view = createStage(stage, show, { time: now })
}

function writeUrl(): void {
  const q = new URLSearchParams({ seed, build: build.name, view: mode })
  if (selected) q.set('piece', selected)
  history.replaceState(null, '', `?${q.toString()}`)
}

/** The build changed: keep it, put it in the show, and show it. The reasons, when it would not go in; nothing is touched then. */
function commit(): string[] {
  const { build: checked, errors } = parseBuild(build)
  const problems = checked ? saveBuild(checked) : errors
  if (problems.length) return problems
  if (selected && !build.pieces.some((p) => p.name === selected)) selected = build.pieces[0]?.name ?? null
  mount()
  seek(0)
  writeUrl()
  sync()
  return []
}

function select(name: string | null, to: ViewMode = mode): void {
  selected = name
  mode = to
  mount()
  seek(0)
  writeUrl()
  sync()
}

function setMode(next: ViewMode): void {
  mode = next
  mount()
  seek(0)
  writeUrl()
  sync()
}

function reroll(): void {
  seed = randomSeed()
  mount()
  seek(0)
  writeUrl()
  sync()
}

/** Put another build on the bench. */
function open(next: Build): void {
  build = structuredClone(next)
  selected = build.pieces[0]?.name ?? null
  if (!installedBuilds().some((i) => i.build.name === build.name)) install(build, 'browser')
  mount()
  seek(0)
  writeUrl()
  sync()
}

/** Every name a new piece may not take: the stock pieces', and the build's. */
const takenNames = (): Set<string> => new Set([...stockNames(), ...build.pieces.map((p) => p.name)])

/** What this browser keeps that this version cannot read: shown, offered back as files, and never saved over. */
const lost = unreadable()

/** Every build name in use here, the ones kept but unreadable included, so that nothing new is saved over one of them. */
const buildNames = (): string[] => [...installedBuilds().map((i) => i.build.name), ...lost.map((l) => l.name)]

/** A name no build here has yet, and no stock world. */
const freshBuildName = (stem: string): string => uniqueName(stem, new Set([...buildNames(), ...STOCK_WORLDS]))

const selectedSpec = (): PieceSpec | undefined => build.pieces.find((p) => p.name === selected)

/** The copy of a build that shipped with the site, as it is installed (the folder's over the samples'), or null. */
function shippedCopy(name: string): Build | null {
  for (const raw of [...folderBuilds(), ...sampleBuilds()]) {
    const found = parseBuild(raw).build
    if (found?.name === name) return mendBuild(found).build
  }
  return null
}

/* ------------------------------------------------------------------ undo */

interface Snapshot {
  build: Build
  selected: string | null
  mode: ViewMode
}

interface Step extends Snapshot {
  /** What undoing it takes back, in a few words: "remove gong". */
  label: string
  /** A build the change brought in under a name of its own (a rename, a new build, an import), taken out again by the undo. */
  drop?: string
}

const UNDO_LIMIT = 50
const undoSteps: Step[] = []
const snapshot = (): Snapshot => ({ build: structuredClone(build), selected, mode })

function remember(before: Snapshot, label: string, drop?: string): void {
  undoSteps.push({ ...before, label, drop })
  if (undoSteps.length > UNDO_LIMIT) undoSteps.shift()
  sync()
}

/**
 * Change the build on the bench with `edit`, keep it and show it, and
 * remember how it was so the change can be undone. What would not go in is
 * refused: the build is put back as it was, and the reasons come back.
 */
function change(label: string, edit: () => void): string[] {
  const before = snapshot()
  edit()
  const problems = commit()
  if (problems.length) {
    ;({ build, selected, mode } = before)
    sync()
    return problems
  }
  remember(before, label)
  return []
}

/** Take back the last change: the build as it was before it, on the bench again and kept again. */
function undo(): void {
  if (making) return
  const step = undoSteps.pop()
  if (!step) return
  build = structuredClone(step.build)
  selected = step.selected
  mode = step.mode
  // Kept again only if it differs from what is kept, and back to the shipped copy if it is that again:
  // undoing past a sample leaves the sample a sample, and no copy of it in this browser.
  const kept = installedBuilds().find((i) => i.build.name === build.name)
  const ship = shippedCopy(build.name)
  if (ship && serializeBuild(ship) === serializeBuild(build)) {
    if (kept?.source === 'browser') forget(build.name)
    mount()
    seek(0)
    writeUrl()
  } else if (kept && serializeBuild(kept.build) === serializeBuild(build)) {
    mount()
    seek(0)
    writeUrl()
  } else {
    const problems = commit()
    if (problems.length) {
      say(buildStatus, `Could not undo ${step.label}: ${problems[0]}`, 'bad')
      return sync()
    }
  }
  if (step.drop && step.drop !== build.name) forget(step.drop)
  say(buildStatus, `Undid ${step.label}.`)
  sync()
}

/* ------------------------------------------------------------------ panel */

const shell = createShell(panelRoot, 'builder')
shell.setSeed(seed)

/** Where the outcome of an action is said: under the prompt, the build, and the file controls. One at a time. */
const outcomes: HTMLElement[] = []
const say = (node: HTMLElement, text: string, tone: 'plain' | 'ok' | 'bad' = 'plain') => {
  node.textContent = text
  node.dataset.tone = tone
  if (!text || !outcomes.includes(node)) return
  // What an action says replaces what the last one said elsewhere; under the prompt, that is the Generator's note again.
  for (const other of outcomes) {
    if (other === node || (other === promptStatus && making)) continue
    other.textContent = other === promptStatus ? idleStatus() : ''
    other.dataset.tone = 'plain'
  }
}

/** A list of reasons, as the validator gives them. */
function problemsList(node: HTMLElement, problems: string[]): void {
  node.replaceChildren(...problems.slice(0, 8).map((p) => el('li', {}, [p])))
  node.hidden = !problems.length
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Why a control that changes which build is on the bench is waiting. */
const WAIT = 'A model is still writing; wait for it, or press Stop.'

// Prompt — the one control the Builder leads with.
const promptInput = el('textarea', {
  class: 'prompt',
  rows: '3',
  spellcheck: 'false',
  maxlength: String(LIMITS.text),
  placeholder: 'a gong that rings when the ball brushes it',
  'aria-label': 'Describe a piece, or a place',
})
const makePieceBtn = el('button', { class: 'primary', title: 'Make a piece from the prompt (⌘↵)' })
const makeWorldBtn = el('button', { title: 'Make the place the pieces play in from the prompt: palettes, backdrop, rail and a borrowed cast (⇧⌘↵)' })
const promptStatus = el('div', { class: 'status', role: 'status' })
// A few prompts to start from, while the prompt is empty: one for each of four of the mechanisms.
const examples = el('div', { class: 'examples', 'aria-label': 'Prompts to try' })
function dealExamples(): void {
  const picks = makeRng(`examples:${seed}`).shuffle([...ARCHETYPES]).slice(0, 4)
  examples.replaceChildren(
    el('span', {}, ['try']),
    ...picks.map((a) => {
      const b = el('button', { type: 'button', class: 'chip', title: `Offline, this makes a piece that will ${a.label} the ball` }, [a.example])
      b.addEventListener('click', () => {
        promptInput.value = a.example
        promptInput.focus()
        sync()
      })
      return b
    }),
  )
}
promptInput.addEventListener('input', () => (examples.hidden = !!promptInput.value.trim()))
panelRoot.append(
  el('section', { class: 'seed-card' }, [el('div', { class: 'section-title' }, ['Prompt']), promptInput, examples, el('div', { class: 'row seed-actions' }, [makePieceBtn, makeWorldBtn]), promptStatus]),
)

// Who writes what is made: the scaffolds, Claude, or the AI Gateway (`providers.ts`).
let settings = loadSettings()
/** What the gateway says it serves today, once it has been asked. */
let gatewayLive: string[] | null = null
const offered = (name: Keyed) => (name === 'gateway' ? stillServed(modelsFor(name), gatewayLive) : modelsFor(name))
const chosenModel = (name: Keyed) => resolveModel(name, settings.models[name], offered(name))
/** The model to ask, if one is chosen and has its key. */
function generator(): Generator | null {
  const { provider } = settings
  if (provider === 'offline') return null
  const key = loadKey(provider)
  return key ? { provider, key, model: chosenModel(provider) } : null
}

const MECHANISMS = ARCHETYPES.map((a) => a.label).join(', ')
function idleStatus(): string {
  const { provider } = settings
  if (provider === 'offline') return `Offline: it reads the prompt for one of ${ARCHETYPES.length} mechanisms (${MECHANISMS}) and names the piece for its noun. Choose a model under Generator to have one write it instead.`
  if (!loadKey(provider)) return `No ${providerLabel(provider)} key yet, so this scaffolds offline. Paste one under Generator.`
  return `${chosenModel(provider)} writes it; the offline scaffolds stand in if it cannot.`
}
/** Say what the Generator is set to, unless a make is under way and its progress is what is said. */
const sayIdle = () => {
  if (!making) say(promptStatus, idleStatus())
}
/** Why a thing was scaffolded when a model was asked for, or nothing if none was. */
const noKeyNote = (): string => (settings.provider !== 'offline' && !loadKey(settings.provider) ? `no ${providerLabel(settings.provider)} key, so scaffolded offline` : 'scaffolded offline')

interface Made<T> {
  value: T
  note: string
  tone: 'ok' | 'bad'
  /** Whether a model wrote it, or the scaffolds. */
  byModel: boolean
}

/**
 * Run a make with its button as a Stop button until it is done. What it
 * made, or null when it was stopped or failed, having said so.
 */
async function run<T>(what: Making, work: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
  if (making) return null
  const own = new AbortController()
  making = what
  stopper = own
  sync()
  try {
    return await work(own.signal)
  } catch (err) {
    if (err instanceof Stopped) say(promptStatus, 'Stopped. Nothing was changed.')
    else say(promptStatus, `That did not work: ${(err as Error).message}`, 'bad')
    return null
  } finally {
    making = null
    stopper = null
    sync()
  }
}

/** A piece for a prompt: by the model when one is chosen and has its key, else, or when the model could not, from the scaffolds. */
async function pieceFor(prompt: string, taken: ReadonlySet<string>, variant: number, signal: AbortSignal, instead?: string): Promise<Made<PieceSpec>> {
  const gen = generator()
  let failed = ''
  if (gen) {
    try {
      const value = await generatePiece(prompt, gen, taken, (text) => say(promptStatus, text), signal, instead)
      return { value, note: `by ${gen.model}`, tone: 'ok', byModel: true }
    } catch (err) {
      // Whatever it failed with, a request that was stopped was stopped: nothing stands in for it.
      if (err instanceof Stopped || signal.aborted) throw new Stopped()
      failed = `${(err as Error).message} Scaffolded instead`
    }
  }
  return { value: scaffoldPiece(prompt, variant, taken), note: failed || noKeyNote(), tone: failed ? 'bad' : 'ok', byModel: false }
}

async function worldFor(prompt: string, variant: number, signal: AbortSignal): Promise<Made<WorldSpec>> {
  const gen = generator()
  let failed = ''
  if (gen) {
    try {
      return { value: await generateWorld(prompt, gen, (text) => say(promptStatus, text), signal), note: `by ${gen.model}`, tone: 'ok', byModel: true }
    } catch (err) {
      if (err instanceof Stopped || signal.aborted) throw new Stopped()
      failed = `${(err as Error).message} Scaffolded instead`
    }
  }
  return { value: scaffoldWorld(prompt, variant), note: failed || noKeyNote(), tone: failed ? 'bad' : 'ok', byModel: false }
}

async function makePiece(): Promise<void> {
  if (making) return
  const prompt = promptInput.value.trim() || promptInput.placeholder
  if (build.pieces.length >= LIMITS.pieces) return say(promptStatus, `A build holds ${LIMITS.pieces} pieces; remove one first.`, 'bad')
  const made = await run('piece', (signal) => pieceFor(prompt, takenNames(), nextVariant(prompt), signal))
  if (!made) return
  // The build may have changed while a model wrote it: the name is checked again as it goes in.
  const spec = { ...made.value, name: uniqueName(made.value.name, takenNames()) }
  // Edits typed into the pane and not applied are not thrown away by moving to the new piece.
  const stay = piecePane.edited() && !!selectedSpec()
  const problems = change(`make ${spec.name}`, () => {
    build.pieces.push(spec)
    if (stay) return
    selected = spec.name
    mode = 'piece'
  })
  if (problems.length) say(promptStatus, `That piece would not go in: ${problems[0]}`, 'bad')
  else say(promptStatus, `${spec.name}: ${made.note}.${stay ? ` It is in the list; ${selected} stays in hand, with your edits.` : ''}`, made.tone)
}

/** Everything about a piece but what it is called and what it says of itself: whether two makes came out the same. */
const bodyOf = (p: PieceSpec) => JSON.stringify([p.cells, p.exit, p.lane, p.shapes, p.paint ?? null, p.flight ?? false])

/** Make the piece in hand again from its prompt, another way, in its place. */
async function makeAgain(): Promise<void> {
  const spec = selectedSpec()
  if (!spec?.prompt || making) return
  const { name, prompt } = spec
  const others = () => {
    const taken = takenNames()
    taken.delete(name)
    return taken
  }
  const made = await run('again', async (signal) => {
    let next = await pieceFor(prompt, others(), nextVariant(prompt, 1), signal, spec.note)
    // Offline, a prompt that names the look leaves little to vary; a few more tries before saying so.
    for (let tries = 0; !next.byModel && bodyOf(next.value) === bodyOf(spec) && tries < 3; tries++) next = { ...next, value: scaffoldPiece(prompt, nextVariant(prompt, 1), others()) }
    return next
  })
  if (!made) return
  if (bodyOf(made.value) === bodyOf(spec)) {
    return say(
      promptStatus,
      made.byModel
        ? `${name} came back the same, ${made.note}. Try again, or say more in the prompt.`
        : `Offline, "${prompt}" always makes this ${name}. Say more in the prompt, or choose a model under Generator.`,
    )
  }
  const at = build.pieces.findIndex((p) => p.name === name)
  const next = { ...made.value, name: uniqueName(made.value.name, others()) }
  // Unapplied edits to another piece keep that piece in hand.
  const stay = piecePane.edited() && !!selectedSpec() && selected !== name
  const problems = change(`make ${name} again`, () => {
    if (at >= 0) build.pieces[at] = next
    else build.pieces.push(next)
    if (stay) return
    selected = next.name
    mode = 'piece'
  })
  if (problems.length) say(promptStatus, `That piece would not go in: ${problems[0]}`, 'bad')
  else say(promptStatus, `${next.name}: made again, ${made.note}.`, made.tone)
}

async function makeWorld(): Promise<void> {
  if (making) return
  const prompt = promptInput.value.trim()
  if (!prompt) return say(promptStatus, 'Say what the place is: "a volcano island", "a midnight diner".', 'bad')
  const made = await run('world', (signal) => worldFor(prompt, nextVariant(`world:${prompt}`), signal))
  if (!made) return
  const world = made.value
  const problems = change(`make the world ${world.label ?? ''}`.trim(), () => {
    build.world = world
    mode = 'world'
  })
  if (problems.length) say(promptStatus, `That world would not go in: ${problems[0]}`, 'bad')
  else say(promptStatus, `${world.label ?? 'The world'}: ${made.note}.`, made.tone)
}

// The prompt's own button stops a Make again too: the Piece section, and its Stop, may not be in view.
makePieceBtn.addEventListener('click', () => (making === 'piece' || making === 'again' ? stopper?.abort() : void makePiece()))
makeWorldBtn.addEventListener('click', () => (making === 'world' ? stopper?.abort() : void makeWorld()))
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    void (e.shiftKey ? makeWorld() : makePiece())
  }
})

// Generator — who writes it. Each provider keeps its own key and its own choice of model.
const genSec = section(panelRoot, 'Generator')
const providerSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Who writes the piece' })
const providerBtns = PROVIDERS.map((name) => {
  const title = name === 'offline' ? 'The offline scaffolds: no key, no network' : `${PROVIDER_INFO[name].label}: your own key, sent only to ${PROVIDER_INFO[name].host}`
  const b = el('button', { type: 'button', title }, [providerLabel(name)])
  b.addEventListener('click', () => {
    settings = { ...settings, provider: name }
    saveSettings(settings)
    say(keyStatus, '')
    sayIdle()
    sync()
    refreshGateway()
  })
  providerSeg.append(b)
  return { name, b }
})
/** The gateway's own list, asked for once it is the provider: an id it has retired drops out of the picker. */
function refreshGateway(): void {
  if (settings.provider !== 'gateway' || gatewayLive) return
  void gatewayModelIds().then((ids) => {
    gatewayLive = ids
    sync()
  })
}
const modelSelect = el('select', { 'aria-label': 'Model' })
modelSelect.addEventListener('change', () => {
  if (settings.provider === 'offline') return
  settings = { ...settings, models: { ...settings.models, [settings.provider]: modelSelect.value } }
  saveSettings(settings)
  sayIdle()
  sync()
})
const modelField = field('Model', modelSelect)
const keyInput = el('input', { type: 'password', class: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'API key' })
const keyBtn = el('button', {}, ['Save key'])
const forgetBtn = el('button', {}, ['Forget'])
const keyStatus = el('div', { class: 'status', role: 'status' })
/** A word on a key that looks like it belongs to the other provider. It is kept all the same: the provider has the last word. */
function keyWarning(provider: Keyed, key: string): string {
  const anthropic = key.startsWith('sk-ant-')
  if (provider === 'claude' && !anthropic) return 'That does not look like an Anthropic key (they start sk-ant-); saved anyway.'
  if (provider === 'gateway' && anthropic) return 'That looks like an Anthropic key; the AI Gateway takes a key of its own. Saved anyway.'
  return ''
}
keyBtn.addEventListener('click', () => {
  if (settings.provider === 'offline') return
  const key = keyInput.value.trim()
  saveKey(settings.provider, key)
  const warning = key ? keyWarning(settings.provider, key) : ''
  say(keyStatus, warning, 'bad')
  sayIdle()
  sync()
})
keyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') keyBtn.click()
})
forgetBtn.addEventListener('click', () => {
  if (settings.provider === 'offline') return
  saveKey(settings.provider, '')
  keyInput.value = ''
  say(keyStatus, '')
  sayIdle()
  sync()
})
const keyField = field('Key', keyInput)
const keyRow = el('div', { class: 'row' }, [keyBtn, forgetBtn])
const genNote = el('div', { class: 'status' })
genSec.append(providerSeg, modelField, keyField, keyRow, keyStatus, genNote)

// Build — which one is on the bench, what it is called, and what is in it.
const buildSec = section(panelRoot, 'Build')
const buildCount = el('span', { class: 'dims' })
buildSec.querySelector('.section-title')!.append(buildCount)
const buildSelect = el('select', { 'aria-label': 'The build on the bench' })
buildSelect.addEventListener('change', () => {
  const next = installedBuilds().find((i) => i.build.name === buildSelect.value)
  if (next) open(next.build)
})
const newBtn = el('button', { class: 'chip', title: 'Start an empty build' }, ['New'])
newBtn.addEventListener('click', () => {
  if (making) return say(buildStatus, WAIT, 'bad')
  const before = snapshot()
  build = emptyBuild(freshBuildName('my-build'))
  selected = null
  commit()
  remember(before, 'new build', build.name)
  say(buildStatus, `Started ${build.name}.`)
})
/** Take a build out of this browser. One that shipped with the site is still there under the browser's copy of it, and comes back. */
function forget(name: string): void {
  deleteBuild(name)
  const named = (files: unknown[]) => files.filter((raw) => (raw as { name?: unknown } | null)?.name === name)
  installShipped(named(sampleBuilds()), 'sample')
  installShipped(named(folderBuilds()), 'folder')
}
const deleteBtn = el('button', { class: 'chip', title: 'Remove this build from this browser (Undo brings it back)' }, ['Delete'])
deleteBtn.addEventListener('click', () => {
  if (making) return say(buildStatus, WAIT, 'bad')
  const before = snapshot()
  const name = build.name
  forget(name)
  const left = installedBuilds()
  const next = left.find((i) => i.build.name === name) ?? left[left.length - 1]
  if (next) open(next.build)
  else {
    build = emptyBuild('my-build')
    selected = null
    commit()
  }
  remember(before, `delete ${name}`)
  say(buildStatus, `Deleted ${name}.${next?.build.name === name ? ' The copy that shipped with the site is back.' : ''} Undo brings it back.`)
})
const undoBtn = el('button', { class: 'chip', title: 'Undo (⌘Z)' }, ['Undo'])
undoBtn.addEventListener('click', undo)
const nameInput = el('input', { type: 'text', class: 'text', spellcheck: 'false', autocomplete: 'off', maxlength: String(LIMITS.name), 'aria-label': 'Build name' })
const buildStatus = el('div', { class: 'status', role: 'status' })
nameInput.addEventListener('change', () => {
  const next = slug(nameInput.value, 'my-build')
  if (next === build.name) return sync()
  if (making) {
    say(buildStatus, WAIT, 'bad')
    return sync()
  }
  if (buildNames().includes(next) || (STOCK_WORLDS as readonly string[]).includes(next)) {
    say(buildStatus, `"${next}" is taken.`, 'bad')
    return sync()
  }
  const before = snapshot()
  const old = build.name
  build.name = next
  const problems = commit()
  if (problems.length) {
    build = before.build
    say(buildStatus, problems[0], 'bad')
    return sync()
  }
  forget(old)
  remember(before, `rename to ${next}`, next)
  say(buildStatus, '')
  sync()
})
// Builds kept here that this version cannot read: said once, with a way to have them back as files to mend by hand.
const lostNote = el('div', { class: 'status', 'data-tone': 'bad' })
const lostBtn = el('button', { class: 'chip', title: 'Save each as it was kept, to fix and import' }, ['Download'])
const lostForget = el('button', { class: 'chip', title: 'Take them out of this browser; download them first', disabled: '' }, ['Forget'])
lostBtn.addEventListener('click', () => {
  // Each to a file of its own, even two of one name, or none.
  const files = new Set<string>()
  for (const l of lost) {
    const name = uniqueName(l.name, files)
    files.add(name)
    downloadBlob(new Blob([`${prettyJson(l.raw)}\n`], { type: 'application/json' }), `${name}${BUILD_EXTENSION}`)
  }
  lostForget.disabled = false
})
lostForget.addEventListener('click', () => {
  forgetUnreadable()
  lost.splice(0)
  lostRow.hidden = true
})
const lostRow = el('div', { class: 'row lost' }, [lostNote, lostBtn, lostForget])
lostRow.hidden = !lost.length
if (lost.length) {
  lostNote.textContent = `${lost.length === 1 ? 'A build' : `${lost.length} builds`} kept here cannot be read by this version: ${lost.map((l) => `${l.name} (${l.errors[0]})`).join('; ')}. ${lost.length === 1 ? 'It is' : 'They are'} kept as ${lost.length === 1 ? 'it was' : 'they were'}.`
}
const pieceList = el('div', { class: 'pieces', role: 'listbox', 'aria-label': 'Pieces in this build' })
buildSec.querySelector('.section-title')!.append(undoBtn)
buildSec.append(el('div', { class: 'row deck' }, [buildSelect, newBtn, deleteBtn]), lostRow, field('Name', nameInput), buildStatus, pieceList)

// Piece — the one in hand: what it is, and the whole of it as JSON.
const pieceSec = section(panelRoot, 'Piece')
const pieceNote = el('div', { class: 'readout' })
const againBtn = el('button', { title: 'Make this piece again from its prompt, another way' })
againBtn.addEventListener('click', () => (making === 'again' ? stopper?.abort() : void makeAgain()))
const removeBtn = el('button', { title: 'Take this piece out of the build (Undo puts it back)' }, ['Remove'])
removeBtn.addEventListener('click', () => {
  const name = selected
  if (!name) return
  // A piece being made again is not taken away from under its make.
  if (making === 'again') return say(buildStatus, WAIT, 'bad')
  change(`remove ${name}`, () => {
    build.pieces = build.pieces.filter((p) => p.name !== name)
    selected = build.pieces[0]?.name ?? null
  })
})
const copyPieceBtn = copyButton(() => navigator.clipboard.writeText(prettyJson(selectedSpec() ?? null)), 'Copy this piece as JSON, to paste into another build')

/**
 * A pane of JSON with Apply and Revert: what is typed is validated as a file
 * would be before it touches the build. What is typed stays until it is
 * applied or reverted, unless the thing it shows changes under it.
 */
function jsonPane(label: string, key: () => string, read: () => unknown, write: (value: unknown) => string[]): { node: HTMLElement; refresh(): void; edited(): boolean } {
  const area = el('textarea', { class: 'json', rows: '12', spellcheck: 'false', 'aria-label': label })
  const problems = el('ul', { class: 'problems' })
  problems.hidden = true
  const apply = el('button', { title: 'Check it and put it in the build' }, ['Apply'])
  const revert = el('button', { title: 'Put back what is in the build' }, ['Revert'])
  /** The text the pane last showed, of what, and whether it has been typed over since. */
  let shown = ''
  let shownKey = ''
  let edited = false
  const mark = () => {
    apply.classList.toggle('primary', edited)
    revert.disabled = !edited
  }
  area.addEventListener('input', () => {
    edited = area.value !== shown
    mark()
  })
  const refresh = () => {
    const text = prettyJson(read())
    // What is typed stays while the pane still shows the same thing, as it was.
    if (edited && text === shown && key() === shownKey) return
    shownKey = key()
    shown = area.value = text
    edited = false
    problemsList(problems, [])
    mark()
  }
  apply.addEventListener('click', () => {
    let value: unknown
    try {
      value = JSON.parse(area.value)
    } catch (err) {
      return problemsList(problems, [`not JSON: ${(err as Error).message}`])
    }
    const found = write(value)
    problemsList(problems, found)
    if (!found.length) {
      edited = false
      refresh()
    }
  })
  revert.addEventListener('click', () => {
    edited = false
    refresh()
  })
  return { node: el('div', { class: 'group' }, [area, el('div', { class: 'row' }, [apply, revert]), problems]), refresh, edited: () => edited }
}

const piecePane = jsonPane(
  'The piece as JSON',
  () => `${build.name}/${selected}`,
  () => selectedSpec() ?? null,
  (value) => {
    const at = build.pieces.findIndex((p) => p.name === selected)
    if (at < 0) return ['no piece selected']
    if (making === 'again') return [WAIT]
    const name = build.pieces[at].name
    return change(`edit ${name}`, () => {
      build.pieces[at] = value as PieceSpec
      selected = (value as { name?: unknown } | null)?.name as string
    })
  },
)
pieceSec.append(pieceNote, el('div', { class: 'row' }, [againBtn, removeBtn, copyPieceBtn]), piecePane.node)

// World — the place: its palettes, its paper, its rail and its cast.
const worldSec = section(panelRoot, 'World')
const worldNote = el('div', { class: 'readout' })
const swatches = el('div', { class: 'swatches' })
const railSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Rail' })
const railBtns = STOCK_WORLDS.map((name) => {
  const b = el('button', { type: 'button', title: `Run the ${name}'s rail between the beats` }, [name])
  b.addEventListener('click', () => {
    change(`the ${name} rail`, () => {
      build.world = { ...(build.world ?? defaultWorldSpec()), rail: name }
    })
  })
  railSeg.append(b)
  return { name, b }
})
const backdropSeg = el('div', { class: 'seg wrap', role: 'group', 'aria-label': 'Backdrops' })
const backdropBtns = BACKDROPS.map((name) => {
  const b = el('button', { type: 'button', title: `A visit may be on ${name} paper` }, [name])
  b.addEventListener('click', () => {
    const world = build.world ?? defaultWorldSpec()
    const has = world.backdrops.includes(name)
    const next = has ? world.backdrops.filter((x) => x !== name) : [...world.backdrops, name]
    if (!next.length) return
    change(`${has ? 'drop' : 'add'} the ${name} backdrop`, () => {
      build.world = { ...world, backdrops: next }
    })
  })
  backdropSeg.append(b)
  return { name, b }
})
const castNote = el('div', { class: 'readout' })
const recastBtn = el('button', { title: 'Borrow another six pieces from the stock world whose rail this is' }, ['Recast'])
let recasts = 0
recastBtn.addEventListener('click', () => {
  const world = build.world ?? defaultWorldSpec()
  change('recast', () => {
    build.world = { ...world, borrow: castFrom(world.rail, `${seed}:${++recasts}`) }
  })
})
const noCastBtn = el('button', { title: 'Play the build’s own pieces alone' }, ['No cast'])
noCastBtn.addEventListener('click', () => {
  change('no cast', () => {
    build.world = { ...(build.world ?? defaultWorldSpec()), borrow: [] }
  })
})
const plainBtn = el('button', { title: 'Drop the world: the pieces play on the workshop’s paper' }, ['Reset'])
plainBtn.addEventListener('click', () => {
  change('reset the world', () => {
    delete build.world
  })
})
const worldPane = jsonPane(
  'The world as JSON',
  () => build.name,
  () => build.world ?? defaultWorldSpec(),
  (value) =>
    change('edit the world', () => {
      build.world = value as WorldSpec
    }),
)
const worldFold = el('details', { class: 'fold' }, [el('summary', {}, ['World as JSON']), worldPane.node])
worldSec.append(worldNote, swatches, field('Rail', railSeg), field('Backdrops', backdropSeg), field('Cast', castNote), el('div', { class: 'row' }, [recastBtn, noCastBtn, plainBtn]), worldFold)

// Preview — three views of the build, and the clock.
const previewSec = section(panelRoot, 'Preview', 'transport')
const seedNote = el('span', { class: 'time' })
previewSec.querySelector('.section-title')!.append(seedNote)
const modeSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'View' })
const modeBtns = VIEW_MODES.map((m) => {
  const label = m === 'piece' ? 'Piece' : m === 'sheet' ? 'Sheet' : 'World'
  const b = el('button', { type: 'button', title: m === 'piece' ? 'The piece in hand, alone between two portals' : m === 'sheet' ? 'Every piece in the build, as the catalog shows them' : 'The build’s world as the show runs it' }, [label])
  b.addEventListener('click', () => setMode(m))
  modeSeg.append(b)
  return { m, b }
})
const play = el('button', { class: 'tbtn play', title: 'Play / pause (space)', 'aria-label': 'Play or pause' }, [icon(ICON.pause)])
play.addEventListener('click', () => setPaused(!paused))
const rerollBtn = el('button', { title: 'Another seed: another palette, another map (R)' }, ['Reroll', el('kbd', {}, ['R'])])
rerollBtn.addEventListener('click', reroll)
previewSec.append(modeSeg, el('div', { class: 'row deck' }, [play, rerollBtn]))

// File — out to one file, and back in from one.
const fileSec = section(panelRoot, 'File')
const fileStatus = el('div', { class: 'status', role: 'status' })
outcomes.push(promptStatus, buildStatus, fileStatus)
const storeWarn = el('div', { class: 'status', role: 'alert', 'data-tone': 'bad' }, [
  'This browser is not keeping builds: its storage is full or turned off. Export this one to keep it; Machine will not find it until it is kept.',
])
const exportBtn = el('button', { class: 'primary', title: 'Save the build as one JSON file' }, ['Export'])
exportBtn.addEventListener('click', () => {
  const name = `${build.name}${BUILD_EXTENSION}`
  downloadBlob(new Blob([serializeBuild(build)], { type: 'application/json' }), name)
  say(fileStatus, `Saved ${name}: ${plural(build.pieces.length, 'piece')}${build.world ? ' and a world' : ''}.`, 'ok')
})
const filePick = el('input', { type: 'file', accept: '.json,application/json', hidden: '' })
const importBtn = el('button', { title: `Open a ${BUILD_EXTENSION} file, drop one on the stage, or paste one (⌘V)` }, ['Import'])
importBtn.addEventListener('click', () => filePick.click())
const copyBtn = copyButton(() => navigator.clipboard.writeText(serializeBuild(build)), 'Copy the build as JSON, to paste into another Builder')

/**
 * A build brought in from outside: mended to fit today's stock pieces,
 * kept, and put on the bench. A build of the same name already kept here
 * is never replaced by a different one: the new one comes in under a name
 * of its own, and both are kept.
 */
function importBuild(read: Build, from: string): void {
  if (making) return say(fileStatus, WAIT, 'bad')
  const { build: mended, notes } = mendBuild(read)
  const here = installedBuilds().find((i) => i.build.name === mended.name)
  const mine = here?.source === 'browser'
  if (mine && serializeBuild(here.build) === serializeBuild(mended)) {
    open(here.build)
    return say(fileStatus, `${mended.name} is already here, as it is in ${from}.`, 'ok')
  }
  // A different build of this name kept here, readable or not, is never saved over.
  const incoming = mine || lost.some((l) => l.name === mended.name) ? { ...mended, name: freshBuildName(mended.name) } : mended
  const before = snapshot()
  const problems = saveBuild(incoming)
  if (problems.length) return say(fileStatus, `${from} would not go in: ${problems[0]}`, 'bad')
  open(incoming)
  remember(before, `import ${incoming.name}`, incoming.name)
  const what = `${plural(incoming.pieces.length, 'piece')}${incoming.world ? ' and a world' : ''}`
  const how = incoming.name === mended.name ? `Imported ${incoming.name}: ${what}.` : `Imported as ${incoming.name} (${what}): this browser already has a different ${mended.name}, and keeps it.`
  say(fileStatus, notes.length ? `${how} Mended: ${notes.join('; ')}.` : how, notes.length ? 'plain' : 'ok')
}

/** A build from a file's text: validated, then brought in. */
function importText(text: string, from: string): void {
  const { build: read, errors } = parseBuild(text)
  if (!read) return say(fileStatus, `${from} is not a build: ${errors[0]}${errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''}`, 'bad')
  importBuild(read, from)
}
async function importFile(file: File): Promise<void> {
  if (file.size > LIMITS.bytes) return say(fileStatus, `${file.name} is larger than ${LIMITS.bytes / 1024} KB.`, 'bad')
  importText(await file.text(), file.name)
}
filePick.addEventListener('change', () => {
  const file = filePick.files?.[0]
  if (file) void importFile(file)
  filePick.value = ''
})
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', (e) => {
  e.preventDefault()
  const file = e.dataTransfer?.files[0]
  if (file) void importFile(file)
})

/**
 * What was pasted on the page, outside a text field: a whole build comes in
 * as an import; a piece joins the build on the bench; a world becomes its
 * world. The same JSON the Copy buttons put on the clipboard.
 */
function pasteText(text: string): void {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return say(fileStatus, 'What was pasted is not JSON.', 'bad')
  }
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  if (obj.format === BUILD_FORMAT) return importText(text, 'What was pasted')
  if (Array.isArray(obj.lane) && Array.isArray(obj.shapes)) {
    if (build.pieces.length >= LIMITS.pieces) return say(fileStatus, `A build holds ${LIMITS.pieces} pieces; remove one first.`, 'bad')
    const spec = { weight: 1, ...obj } as PieceSpec
    spec.name = uniqueName(slug(typeof obj.name === 'string' ? obj.name : '', 'piece'), takenNames())
    const problems = change(`paste ${spec.name}`, () => {
      build.pieces.push(spec)
      selected = spec.name
      mode = 'piece'
    })
    return say(fileStatus, problems.length ? `That piece would not go in: ${problems[0]}` : `Pasted ${spec.name} into ${build.name}.`, problems.length ? 'bad' : 'ok')
  }
  if (Array.isArray(obj.themes) && Array.isArray(obj.backdrops)) {
    const problems = change('paste a world', () => {
      build.world = obj as unknown as WorldSpec
      mode = 'world'
    })
    return say(fileStatus, problems.length ? `That world would not go in: ${problems[0]}` : `Pasted a world into ${build.name}.`, problems.length ? 'bad' : 'ok')
  }
  say(fileStatus, 'What was pasted is not a build, a piece or a world.', 'bad')
}
window.addEventListener('paste', (e) => {
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text.trim().startsWith('{')) return
  e.preventDefault()
  if (making) return say(fileStatus, WAIT, 'bad')
  pasteText(text)
})

const machineLink = el('a', { class: 'more', href: '/' }, ['Play it in Machine →'])
// Machine knows the builds folder and this browser's builds. A sample not yet touched is in neither, so it is kept on the way out.
machineLink.addEventListener('click', () => void saveBuild(structuredClone(build)))
fileSec.append(storeWarn, el('div', { class: 'row' }, [exportBtn, importBtn, copyBtn]), filePick, fileStatus, machineLink)

/* ------------------------------------------------------------------ sync */

const playIcon = icon(ICON.play)
const pauseIcon = icon(ICON.pause)

/** A make button: its label, or Stop while it is one making. */
function labelButton(b: HTMLButtonElement, what: Making | Making[], label: string, key?: string): void {
  const stopping = !!making && ([] as Making[]).concat(what).includes(making)
  b.replaceChildren(stopping ? 'Stop' : label, ...(key && !stopping ? [el('kbd', {}, [key])] : []))
  b.classList.toggle('stop', stopping)
  b.disabled = !!making && !stopping
}

function sync(): void {
  const all = installedBuilds()
  // By name, which is what the Name field edits and what no two builds share.
  buildSelect.replaceChildren(...all.map((i) => el('option', { value: i.build.name, title: i.build.world?.label ?? i.build.label ?? '' }, [`${i.build.name}${i.source === 'browser' ? '' : ` · ${i.source}`}`])))
  buildSelect.value = build.name
  const here = all.find((i) => i.build.name === build.name)
  deleteBtn.disabled = here?.source !== 'browser'
  // What would put another build on the bench waits for a model that is writing into this one.
  buildSelect.disabled = newBtn.disabled = nameInput.disabled = importBtn.disabled = !!making
  if (making) deleteBtn.disabled = true
  const last = undoSteps[undoSteps.length - 1]
  undoBtn.disabled = !last || !!making
  undoBtn.title = last ? `Undo ${last.label} (⌘Z)` : 'Nothing to undo'
  if (document.activeElement !== nameInput) nameInput.value = build.name
  buildCount.textContent = plural(build.pieces.length, 'piece')

  pieceList.replaceChildren(
    ...build.pieces.map((p) => {
      const row = el('button', { type: 'button', class: `piece${p.name === selected ? ' on' : ''}`, role: 'option', 'aria-selected': String(p.name === selected) }, [
        el('b', {}, [p.name]),
        el('span', {}, [[p.flight ? 'flight' : '', p.paint ? 'paints' : '', plural(p.cells.length, 'cell')].filter(Boolean).join(' · ')]),
      ])
      row.addEventListener('click', () => select(p.name, 'piece'))
      return row
    }),
  )
  if (!build.pieces.length) pieceList.replaceChildren(el('div', { class: 'status' }, ['Nothing here yet. Describe a piece above and press Make piece, or paste one.']))

  const spec = selectedSpec()
  pieceSec.hidden = !spec
  if (spec) {
    pieceNote.replaceChildren(el('b', {}, [spec.name]), el('br'), spec.note ?? '')
    labelButton(againBtn, 'again', 'Make again')
    if (!making) againBtn.disabled = !spec.prompt
    removeBtn.disabled = making === 'again'
    againBtn.title = spec.prompt ? `Make this piece again from its prompt, another way: "${spec.prompt}"` : 'This piece has no prompt to make it from'
    piecePane.refresh()
  }

  const world = build.world ?? defaultWorldSpec()
  worldNote.replaceChildren(el('b', {}, [world.label ?? build.label ?? build.name]), el('br'), build.world ? (world.note ?? '') : 'no world of its own yet: the workshop’s paper and rail')
  swatches.replaceChildren(
    ...world.themes.map((t) => {
      const chip = el('div', { class: 'swatch', title: `${t.label}${t.note ? `: ${t.note}` : ''}` }, t.colors.map((c) => el('i', { style: `background:${c}` })))
      chip.style.background = t.bg
      chip.style.borderColor = t.ink
      return chip
    }),
  )
  for (const { name, b } of railBtns) b.classList.toggle('on', world.rail === name)
  for (const { name, b } of backdropBtns) b.classList.toggle('on', world.backdrops.includes(name))
  castNote.textContent = world.borrow.length ? world.borrow.join(' · ') : 'none: the build’s own pieces alone'
  plainBtn.disabled = !build.world
  worldPane.refresh()

  const { provider } = settings
  for (const { name, b } of providerBtns) b.classList.toggle('on', name === provider)
  modelField.hidden = keyField.hidden = keyRow.hidden = provider === 'offline'
  if (provider === 'offline') say(genNote, `No key, no network. The prompt picks one of ${ARCHETYPES.length} mechanisms.`)
  else {
    const info = PROVIDER_INFO[provider]
    // The list is the provider's own, and the choice is the one last made for it, or its default.
    modelSelect.replaceChildren(...offered(provider).map((m) => el('option', { value: m.id, title: m.note }, [`${m.label} · ${m.id}`])))
    modelSelect.value = chosenModel(provider)
    const saved = loadKey(provider)
    keyInput.placeholder = info.keyHint
    if (document.activeElement !== keyInput) keyInput.value = saved
    forgetBtn.disabled = !saved
    say(genNote, `${saved ? 'Key saved in this browser.' : `Paste a key from ${info.keysAt}.`} It is sent only to ${info.host}. The site has no server and no key of its own.`, saved ? 'ok' : 'plain')
  }

  labelButton(makePieceBtn, ['piece', 'again'], 'Make piece', '⌘↵')
  labelButton(makeWorldBtn, 'world', 'Make world')
  examples.hidden = !!promptInput.value.trim()

  const shown = shownMode()
  for (const { m, b } of modeBtns) {
    b.classList.toggle('on', m === shown)
    b.disabled = m !== 'world' && !build.pieces.length
  }
  play.replaceChildren(paused ? playIcon : pauseIcon)
  play.classList.toggle('paused', paused)
  seedNote.textContent = seed
  shell.setSeed(seed)
  storeWarn.hidden = storeKept()
  machineLink.href = `/?seed=${encodeURIComponent(seed)}&world=${encodeURIComponent(build.name)}`
  document.title = `${build.name} · builder · contraptions`
}

// The stage behind the canvas is the paper of the world on it.
let lastPaper = ''
function tick(): void {
  if (show) {
    const bg = show.at(now()).universe.theme.bg
    if (bg !== lastPaper) {
      lastPaper = bg
      stage.style.setProperty('--paper', bg)
    }
  } else lastPaper = ''
  requestAnimationFrame(tick)
}

/* ------------------------------------------------------------------ keys */

const typing = (t: EventTarget | null) => t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement

window.addEventListener('keydown', (e) => {
  // ⌘Z takes back the last change to the build; in a text field it is the field's own.
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
    if (typing(e.target)) return
    e.preventDefault()
    undo()
    return
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  if (typing(t)) return
  if (t instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
  const at = build.pieces.findIndex((p) => p.name === selected)
  switch (e.key) {
    case ' ':
      e.preventDefault()
      setPaused(!paused)
      break
    case 'r':
      reroll()
      dealExamples()
      break
    case 'p':
      shell.toggle()
      break
    case '[':
    case ']':
      if (build.pieces.length) select(build.pieces[(Math.max(0, at) + (e.key === ']' ? 1 : -1) + build.pieces.length) % build.pieces.length].name, 'piece')
      break
  }
})
rerollBtn.addEventListener('click', dealExamples)

// The bench starts with its build in the show: the sample is already there, a new one is not.
if (!installedBuilds().some((i) => i.build.name === build.name)) commit()
else {
  mount()
  writeUrl()
}
dealExamples()
say(promptStatus, idleStatus())
sync()
refreshGateway()
requestAnimationFrame(tick)

// Dev handle for scripted capture.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).builder = {
    seek,
    now,
    setPaused,
    select,
    setMode,
    importText,
    pasteText,
    undo,
    build: () => build,
    exportText: () => serializeBuild(build),
    canvas: () => stage.querySelector('canvas') as HTMLCanvasElement,
  }
}

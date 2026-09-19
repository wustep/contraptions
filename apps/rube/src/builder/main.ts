import '../../../../src/ui/styles.css'
import { downloadBlob } from '../../../../src/core/capture'
import { randomSeed } from '../../../../src/core/seed'
import { ICON, copyButton, createShell, credit, el, field, icon, section } from '../../../../src/ui/shell'
import { createCatalog } from '../catalog'
import { createStage } from '../engine'
import { Show } from '../show'
import { worldByName } from '../worlds'
import { defaultWorldSpec, stockNames } from './compile'
import { folderBuilds, sampleBuilds } from './discover'
import { gatewayModelIds, generatePiece, generateWorld, type Generator } from './generate'
import { PROVIDERS, PROVIDER_INFO, loadKey, loadSettings, modelsFor, providerLabel, resolveModel, saveKey, saveSettings, stillServed, type Keyed } from './providers'
import { deleteBuild, install, installBuilds, installShipped, installedBuilds, saveBuild } from './registry'
import { ARCHETYPES, castFrom, scaffoldPiece, scaffoldWorld } from './scaffold'
import { BACKDROPS, BUILD_EXTENSION, LIMITS, STOCK_WORLDS, emptyBuild, parseBuild, serializeBuild, slug, type Build, type PieceSpec, type WorldSpec } from './spec'

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
/** How many times each prompt has been scaffolded, so making it again makes another. */
const variants = new Map<string, number>()

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

/** The build changed: keep it, put it in the show, and show it. The reasons, when it would not go in. */
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

const buildNames = (): string[] => installedBuilds().map((i) => i.build.name)

/** A name no build here has yet. */
function freshBuildName(stem: string): string {
  const names = new Set([...buildNames(), ...STOCK_WORLDS])
  if (!names.has(stem)) return stem
  for (let i = 2; ; i++) if (!names.has(`${stem}-${i}`)) return `${stem}-${i}`
}

/* ------------------------------------------------------------------ panel */

const shell = createShell(panelRoot, 'builder')
shell.setSeed(seed)

const say = (node: HTMLElement, text: string, tone: 'plain' | 'ok' | 'bad' = 'plain') => {
  node.textContent = text
  node.dataset.tone = tone
}

/** A list of reasons, as the validator gives them. */
function problemsList(node: HTMLElement, problems: string[]): void {
  node.replaceChildren(...problems.slice(0, 8).map((p) => el('li', {}, [p])))
  node.hidden = !problems.length
}

// Prompt — the one control the Builder leads with.
const promptInput = el('textarea', {
  class: 'prompt',
  rows: '3',
  spellcheck: 'false',
  maxlength: String(LIMITS.text),
  placeholder: 'a gong that rings when the ball brushes it',
  'aria-label': 'Describe a piece, or a place',
})
const makePieceBtn = el('button', { class: 'primary', title: 'Make a piece from the prompt (⌘↵)' }, ['Make piece', el('kbd', {}, ['⌘↵'])])
const makeWorldBtn = el('button', { title: 'Make the place the pieces play in from the prompt: palettes, backdrop, rail and a borrowed cast' }, ['Make world'])
const promptStatus = el('div', { class: 'status', role: 'status' })
panelRoot.append(
  el('section', { class: 'seed-card' }, [el('div', { class: 'section-title' }, ['Prompt']), promptInput, el('div', { class: 'row seed-actions' }, [makePieceBtn, makeWorldBtn]), promptStatus]),
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

const MECHANISMS = 'strike, ring, bounce, lift, slide, paint, spin, launch'
function idleStatus(): string {
  const { provider } = settings
  if (provider === 'offline') return `Offline: it reads the prompt for one of ${ARCHETYPES.length} mechanisms (${MECHANISMS}) and names the piece for its noun. Choose a model under Generator to have one write it instead.`
  if (!loadKey(provider)) return `No ${providerLabel(provider)} key yet, so this scaffolds offline. Paste one under Generator.`
  return `${chosenModel(provider)} writes it; the offline scaffolds stand in if it cannot.`
}
/** Why a thing was scaffolded when a model was asked for, or nothing if none was. */
const noKeyNote = (): string => (settings.provider !== 'offline' && !loadKey(settings.provider) ? `no ${providerLabel(settings.provider)} key, so scaffolded offline` : 'scaffolded offline')

let busy = false
async function makePiece(): Promise<void> {
  const prompt = promptInput.value.trim() || promptInput.placeholder
  if (busy) return
  if (build.pieces.length >= LIMITS.pieces) return say(promptStatus, `A build holds ${LIMITS.pieces} pieces; remove one first.`, 'bad')
  busy = true
  sync()
  let spec: PieceSpec | null = null
  let note = ''
  const gen = generator()
  if (gen) {
    try {
      spec = await generatePiece(prompt, gen, takenNames(), (text) => say(promptStatus, text))
      note = `by ${gen.model}`
    } catch (err) {
      note = `${(err as Error).message} Scaffolded instead`
    }
  }
  if (!spec) {
    const variant = variants.get(prompt) ?? 0
    variants.set(prompt, variant + 1)
    spec = scaffoldPiece(prompt, variant, takenNames())
    note = note || noKeyNote()
  }
  build.pieces.push(spec)
  selected = spec.name
  mode = 'piece'
  const problems = commit()
  busy = false
  if (problems.length) {
    build.pieces.pop()
    commit()
    say(promptStatus, `That piece would not go in: ${problems[0]}`, 'bad')
  } else say(promptStatus, `${spec.name}: ${note}.`, note.includes('instead') ? 'bad' : 'ok')
  sync()
}

async function makeWorld(): Promise<void> {
  const prompt = promptInput.value.trim()
  if (busy) return
  if (!prompt) return say(promptStatus, 'Say what the place is: "a volcano island", "a midnight diner".', 'bad')
  busy = true
  sync()
  let world: WorldSpec | null = null
  let note = ''
  const gen = generator()
  if (gen) {
    try {
      world = await generateWorld(prompt, gen, (text) => say(promptStatus, text))
      note = `by ${gen.model}`
    } catch (err) {
      note = `${(err as Error).message} Scaffolded instead`
    }
  }
  if (!world) {
    const variant = variants.get(`world:${prompt}`) ?? 0
    variants.set(`world:${prompt}`, variant + 1)
    world = scaffoldWorld(prompt, variant)
    note = note || noKeyNote()
  }
  const was = build.world
  build.world = world
  mode = 'world'
  const problems = commit()
  busy = false
  if (problems.length) {
    build.world = was
    commit()
    say(promptStatus, `That world would not go in: ${problems[0]}`, 'bad')
  } else say(promptStatus, `${world.label ?? 'The world'}: ${note}.`, note.includes('instead') ? 'bad' : 'ok')
  sync()
}

makePieceBtn.addEventListener('click', () => void makePiece())
makeWorldBtn.addEventListener('click', () => void makeWorld())
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    void makePiece()
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
    say(promptStatus, idleStatus())
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
  say(promptStatus, idleStatus())
  sync()
})
const modelField = field('Model', modelSelect)
const keyInput = el('input', { type: 'password', class: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'API key' })
const keyBtn = el('button', {}, ['Save key'])
const forgetBtn = el('button', {}, ['Forget'])
keyBtn.addEventListener('click', () => {
  if (settings.provider === 'offline') return
  saveKey(settings.provider, keyInput.value.trim())
  say(promptStatus, idleStatus())
  sync()
})
keyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') keyBtn.click()
})
forgetBtn.addEventListener('click', () => {
  if (settings.provider === 'offline') return
  saveKey(settings.provider, '')
  keyInput.value = ''
  say(promptStatus, idleStatus())
  sync()
})
const keyField = field('Key', keyInput)
const keyRow = el('div', { class: 'row' }, [keyBtn, forgetBtn])
const genNote = el('div', { class: 'status' })
genSec.append(providerSeg, modelField, keyField, keyRow, genNote)

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
  build = emptyBuild(freshBuildName('my-build'))
  selected = null
  commit()
})
/** Take a build out of this browser. One that shipped with the site is still there under the browser's copy of it, and comes back. */
function forget(name: string): void {
  deleteBuild(name)
  const named = (files: unknown[]) => files.filter((raw) => (raw as { name?: unknown } | null)?.name === name)
  installShipped(named(sampleBuilds()), 'sample')
  installShipped(named(folderBuilds()), 'folder')
}
const deleteBtn = el('button', { class: 'chip', title: 'Remove this build from this browser' }, ['Delete'])
deleteBtn.addEventListener('click', () => {
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
})
const nameInput = el('input', { type: 'text', class: 'text', spellcheck: 'false', autocomplete: 'off', maxlength: String(LIMITS.name), 'aria-label': 'Build name' })
const nameStatus = el('div', { class: 'status', role: 'status' })
nameInput.addEventListener('change', () => {
  const next = slug(nameInput.value, 'my-build')
  if (next === build.name) return sync()
  if (buildNames().includes(next) || (STOCK_WORLDS as readonly string[]).includes(next)) {
    say(nameStatus, `"${next}" is taken.`, 'bad')
    return sync()
  }
  const old = build.name
  build.name = next
  const problems = commit()
  if (problems.length) {
    build.name = old
    say(nameStatus, problems[0], 'bad')
    return sync()
  }
  forget(old)
  say(nameStatus, '')
  sync()
})
const pieceList = el('div', { class: 'pieces', role: 'listbox', 'aria-label': 'Pieces in this build' })
buildSec.append(el('div', { class: 'row deck' }, [buildSelect, newBtn, deleteBtn]), field('Name', nameInput), nameStatus, pieceList)

// Piece — the one in hand: what it is, and the whole of it as JSON.
const pieceSec = section(panelRoot, 'Piece')
const pieceNote = el('div', { class: 'readout' })
const againBtn = el('button', { title: 'Make this piece again from its prompt, another way' }, ['Make again'])
againBtn.addEventListener('click', () => {
  const spec = build.pieces.find((p) => p.name === selected)
  if (!spec?.prompt || busy) return
  const at = build.pieces.indexOf(spec)
  const prompt = spec.prompt
  const variant = (variants.get(prompt) ?? 0) + 1
  variants.set(prompt, variant + 1)
  const taken = takenNames()
  taken.delete(spec.name)
  build.pieces[at] = scaffoldPiece(prompt, variant, taken)
  selected = build.pieces[at].name
  commit()
  say(promptStatus, `${selected}: scaffolded again.`, 'ok')
})
const removeBtn = el('button', { title: 'Take this piece out of the build' }, ['Remove'])
removeBtn.addEventListener('click', () => {
  build.pieces = build.pieces.filter((p) => p.name !== selected)
  selected = build.pieces[0]?.name ?? null
  commit()
})

/** A pane of JSON with Apply and Revert: what is typed is validated as a file would be before it touches the build. */
function jsonPane(label: string, read: () => unknown, write: (value: unknown) => string[]): { node: HTMLElement; refresh(): void } {
  const area = el('textarea', { class: 'json', rows: '12', spellcheck: 'false', 'aria-label': label })
  const problems = el('ul', { class: 'problems' })
  problems.hidden = true
  const apply = el('button', {}, ['Apply'])
  const revert = el('button', {}, ['Revert'])
  const refresh = () => {
    if (document.activeElement !== area) area.value = JSON.stringify(read(), null, 2) ?? ''
    problemsList(problems, [])
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
      area.blur()
      refresh()
    }
  })
  revert.addEventListener('click', () => {
    area.blur()
    refresh()
  })
  return { node: el('div', { class: 'group' }, [area, el('div', { class: 'row' }, [apply, revert]), problems]), refresh }
}

const piecePane = jsonPane(
  'The piece as JSON',
  () => build.pieces.find((p) => p.name === selected) ?? null,
  (value) => {
    const at = build.pieces.findIndex((p) => p.name === selected)
    if (at < 0) return ['no piece selected']
    const was = build.pieces[at]
    build.pieces[at] = value as PieceSpec
    let problems = parseBuild(build).errors
    if (!problems.length) {
      selected = build.pieces[at].name
      problems = commit()
    }
    if (problems.length) {
      // As it was: what is typed stays in the pane to be fixed, and the build is untouched.
      build.pieces[at] = was
      selected = was.name
      commit()
    }
    return problems
  },
)
pieceSec.append(pieceNote, el('div', { class: 'row' }, [againBtn, removeBtn]), piecePane.node)

// World — the place: its palettes, its paper, its rail and its cast.
const worldSec = section(panelRoot, 'World')
const worldNote = el('div', { class: 'readout' })
const swatches = el('div', { class: 'swatches' })
const railSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Rail' })
const railBtns = STOCK_WORLDS.map((name) => {
  const b = el('button', { type: 'button', title: `Run the ${name}'s rail between the beats` }, [name])
  b.addEventListener('click', () => {
    build.world = { ...(build.world ?? defaultWorldSpec()), rail: name }
    commit()
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
    build.world = { ...world, backdrops: next }
    commit()
  })
  backdropSeg.append(b)
  return { name, b }
})
const castNote = el('div', { class: 'readout' })
const recastBtn = el('button', { title: 'Borrow another six pieces from the stock world whose rail this is' }, ['Recast'])
let recasts = 0
recastBtn.addEventListener('click', () => {
  const world = build.world ?? defaultWorldSpec()
  build.world = { ...world, borrow: castFrom(world.rail, `${seed}:${++recasts}`) }
  commit()
})
const noCastBtn = el('button', { title: 'Play the build’s own pieces alone' }, ['No cast'])
noCastBtn.addEventListener('click', () => {
  build.world = { ...(build.world ?? defaultWorldSpec()), borrow: [] }
  commit()
})
const plainBtn = el('button', { title: 'Drop the world: the pieces play on the workshop’s paper' }, ['Reset'])
plainBtn.addEventListener('click', () => {
  delete build.world
  commit()
})
const worldPane = jsonPane(
  'The world as JSON',
  () => build.world ?? defaultWorldSpec(),
  (value) => {
    const was = build.world
    build.world = value as WorldSpec
    let problems = parseBuild(build).errors
    if (!problems.length) problems = commit()
    if (problems.length) {
      build.world = was
      commit()
    }
    return problems
  },
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
const exportBtn = el('button', { class: 'primary', title: 'Save the build as one JSON file' }, ['Export'])
exportBtn.addEventListener('click', () => {
  const name = `${build.name}${BUILD_EXTENSION}`
  downloadBlob(new Blob([serializeBuild(build)], { type: 'application/json' }), name)
  say(fileStatus, `Saved ${name}: ${build.pieces.length} ${build.pieces.length === 1 ? 'piece' : 'pieces'}${build.world ? ' and a world' : ''}.`, 'ok')
})
const filePick = el('input', { type: 'file', accept: '.json,application/json', hidden: '' })
const importBtn = el('button', { title: `Open a ${BUILD_EXTENSION} file, or drop one on the stage` }, ['Import'])
importBtn.addEventListener('click', () => filePick.click())
const copyBtn = copyButton(() => navigator.clipboard.writeText(serializeBuild(build)), 'Copy the build as JSON')

/** A build from a file's text: validated, installed, kept, and put on the bench. */
function importText(text: string, from: string): void {
  const { build: read, errors } = parseBuild(text)
  if (!read) return say(fileStatus, `${from} is not a build: ${errors[0]}${errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''}`, 'bad')
  const replaced = installedBuilds().some((i) => i.build.name === read.name && i.source === 'browser')
  const problems = saveBuild(read)
  if (problems.length) return say(fileStatus, `${from} would not go in: ${problems[0]}`, 'bad')
  open(read)
  say(fileStatus, `${replaced ? 'Replaced' : 'Imported'} ${read.name}: ${read.pieces.length} ${read.pieces.length === 1 ? 'piece' : 'pieces'}${read.world ? ' and a world' : ''}.`, 'ok')
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
const machineLink = el('a', { class: 'more', href: '/' }, ['Play it in Machine →'])
// Machine knows the builds folder and this browser's builds. A sample not yet touched is in neither, so it is kept on the way out.
machineLink.addEventListener('click', () => void saveBuild(structuredClone(build)))
fileSec.append(el('div', { class: 'row' }, [exportBtn, importBtn, copyBtn]), filePick, fileStatus, machineLink)

credit(panelRoot)

/* ------------------------------------------------------------------ sync */

const playIcon = icon(ICON.play)
const pauseIcon = icon(ICON.pause)

function sync(): void {
  const all = installedBuilds()
  buildSelect.replaceChildren(...all.map((i) => el('option', { value: i.build.name }, [`${i.build.label ?? i.build.name}${i.source === 'browser' ? '' : ` · ${i.source}`}`])))
  buildSelect.value = build.name
  const here = all.find((i) => i.build.name === build.name)
  deleteBtn.disabled = here?.source !== 'browser'
  if (document.activeElement !== nameInput) nameInput.value = build.name
  buildCount.textContent = `${build.pieces.length} ${build.pieces.length === 1 ? 'piece' : 'pieces'}`

  pieceList.replaceChildren(
    ...build.pieces.map((p) => {
      const row = el('button', { type: 'button', class: `piece${p.name === selected ? ' on' : ''}`, role: 'option', 'aria-selected': String(p.name === selected) }, [
        el('b', {}, [p.name]),
        el('span', {}, [[p.flight ? 'flight' : '', p.paint ? 'paints' : '', `${p.cells.length} ${p.cells.length === 1 ? 'cell' : 'cells'}`].filter(Boolean).join(' · ')]),
      ])
      row.addEventListener('click', () => select(p.name, 'piece'))
      return row
    }),
  )
  if (!build.pieces.length) pieceList.replaceChildren(el('div', { class: 'status' }, ['Nothing here yet. Describe a piece above and press Make piece.']))

  const spec = build.pieces.find((p) => p.name === selected)
  pieceSec.hidden = !spec
  if (spec) {
    pieceNote.replaceChildren(el('b', {}, [spec.name]), el('br'), spec.note ?? '')
    againBtn.disabled = busy || !spec.prompt
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
  if (provider === 'offline') say(genNote, 'No key, no network. The prompt picks one of eight mechanisms.')
  else {
    const info = PROVIDER_INFO[provider]
    // The list is the provider's own, and the choice is the one last made for it, or its default.
    modelSelect.replaceChildren(...offered(provider).map((m) => el('option', { value: m.id, title: m.note }, [`${m.label} \u00b7 ${m.id}`])))
    modelSelect.value = chosenModel(provider)
    const saved = loadKey(provider)
    keyInput.placeholder = info.keyHint
    if (document.activeElement !== keyInput) keyInput.value = saved
    forgetBtn.disabled = !saved
    say(genNote, `${saved ? 'Key saved in this browser.' : `Paste a key from ${info.keysAt}.`} It is sent only to ${info.host}. The site has no server and no key of its own.`, saved ? 'ok' : 'plain')
  }

  const shown = shownMode()
  for (const { m, b } of modeBtns) {
    b.classList.toggle('on', m === shown)
    b.disabled = m !== 'world' && !build.pieces.length
  }
  play.replaceChildren(paused ? playIcon : pauseIcon)
  play.classList.toggle('paused', paused)
  seedNote.textContent = seed
  shell.setSeed(seed)
  makePieceBtn.disabled = makeWorldBtn.disabled = busy
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

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
  if (t instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
  const at = build.pieces.findIndex((p) => p.name === selected)
  switch (e.key) {
    case ' ':
      e.preventDefault()
      setPaused(!paused)
      break
    case 'r':
      reroll()
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

// The bench starts with its build in the show: the sample is already there, a new one is not.
if (!installedBuilds().some((i) => i.build.name === build.name)) commit()
else {
  mount()
  writeUrl()
}
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
    build: () => build,
    exportText: () => serializeBuild(build),
    canvas: () => stage.querySelector('canvas') as HTMLCanvasElement,
  }
}

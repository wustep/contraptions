import '../../../../src/ui/styles.css'
import { webmMime } from '../../../../src/core/capture'
import { randomSeed } from '../../../../src/core/seed'
import { registerMode } from '../../../../src/ui/mode-host'
import { modeFromPath } from '../../../../src/ui/mode-path'
import { ICON, copyButton, el, guardWheel, icon, section, seedCard, segmented, type Shell } from '../../../../src/ui/shell'
import { EXPORT_SCALES, SPEEDS, loadView, saveView, speedLabel } from '../../../../src/ui/view'
import { catalogOrder, createCatalog, type Entry } from '../catalog'
import { createStage } from '../engine'
import { Show } from '../show'
import { SHELVES, loadShelf, loadShelves, type Shelf } from './staging'

/**
 * The entry: the Playground. Where pieces and worlds wait to be let into
 * Machine: new pieces for the four worlds, pieces a craft pass took out and
 * that are kept where they can still be watched, and worlds that are not in
 * the loop yet. It is Machine's own stage and sheet over a different set of
 * worlds, so whatever is approved here looks in Machine exactly as it did
 * here.
 *
 * Three views, and the sheet is the ground floor: the **sheet** of every
 * staged piece, a band a shelf; a **piece** alone between two portals
 * (`?solo=<piece>&world=<shelf>`); and a shelf run as a **world**, the
 * camera on the ball, a machine built from nothing but what is staged
 * there (`?world=<shelf>`). Escape, the way-back button, the panel's
 * button and the browser's Back all come back down to the sheet.
 *
 * Nothing staged is fetched until it is asked for. Each shelf is a chunk of
 * its own: a link to one piece or one world loads that shelf and mounts it,
 * and the rest follow behind it; the sheet waits for them all.
 */

/** One visit. The chrome is already up; this fills the stage and the panel, and the return stops it. */
export function start(shell: Shell): () => void {
  const stage = document.getElementById('stage')!
  const panelRoot = shell.body
  let alive = true


type ViewName = 'sheet' | 'piece' | 'world'

let seed = randomSeed()
let solo: string | null = null
let world: string | null = null

function readUrl(): void {
  const params = new URLSearchParams(location.search)
  seed = params.get('seed') || randomSeed()
  const pin = params.get('world')
  world = pin && SHELVES.some((s) => s.name === pin) ? pin : null
  // A piece is watched on its shelf; without the shelf's name it is looked for once every shelf is in.
  solo = params.get('solo')
}
readUrl()

const viewName = (): ViewName => (solo ? 'piece' : world ? 'world' : 'sheet')

/** Where the sheet was scrolled to when it was last left, and the piece it was left for. */
let sheetScroll = 0
let lastPick: Entry | null = null

/* ------------------------------------------------------------------ shelves */

/** The shelves that are in, by name. */
const shelves = new Map<string, Shelf>()
let allIn = false
const everything = loadShelves().then((all) => {
  for (const s of all) shelves.set(s.world.name, s)
  allIn = true
  return all
})
/** The worlds on the sheet, in its order. */
const sheetWorlds = () => SHELVES.flatMap((s) => (shelves.has(s.name) ? [shelves.get(s.name)!.world] : []))
/** What is said of a staged piece. */
const stagedAs = (shelf: string | null, piece: string | null) => (shelf && piece ? shelves.get(shelf)?.staged[piece] ?? null : null)

/* ------------------------------------------------------------------ clock */

let speed = 1
let paused = false
let base = 0
let origin = performance.now()

const now = () => (paused ? base : base + ((performance.now() - origin) / 1000) * speed)
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
const setSpeed = (next: number) => {
  base = now()
  origin = performance.now()
  speed = next
  sync()
}

/* ------------------------------------------------------------------ url */

/** What a history entry remembers: whether it was opened from the sheet, so that Back is the way back. */
interface Step {
  opened: boolean
}
type Write = 'push' | 'replace' | 'keep'

function writeUrl(how: Write): void {
  const q = new URLSearchParams()
  q.set('seed', seed)
  if (solo) q.set('solo', solo)
  if (world) q.set('world', world)
  const url = `?${q.toString()}`
  if (how === 'push') history.pushState({ opened: true } satisfies Step, '', url)
  else history.replaceState(how === 'keep' ? history.state : ({ opened: false } satisfies Step), '', url)
}

/* ------------------------------------------------------------------ stage */

interface View {
  setOverview?(on: boolean): void
  scroll?(): number
  savePng(filename: string, scale: number): void
  saveLoop?(filename: string, progress?: (done: number) => void): Promise<void>
  exportSize(scale: number): [number, number]
  destroy(): void
}

let overview = false
let show: Show | null = null
let view: View | null = null
/** Counts mounts, so a shelf that arrives after the view has moved on does not take the stage back. */
let mounting = 0

function mountNow(): void {
  view?.destroy()
  if (viewName() === 'sheet') {
    show = null
    const focus = lastPick
    lastPick = null
    view = createCatalog(stage, seed, { time: now }, (name, from) => pick(name, from), {
      worlds: sheetWorlds(),
      scroll: sheetScroll,
      focus,
      scope: 'THE PLAYGROUND · STAGED, NOT YET IN MACHINE',
      hints: ['click a piece to watch it alone · scroll for the other shelves · W runs a shelf as a world', 'click a piece to watch it alone'],
    })
    return
  }
  show = new Show(seed, { solo, world })
  const s = createStage(stage, show, { time: now })
  s.setOverview(overview && !solo)
  view = s
}

/** Put the right thing on the stage, once the code it needs is in. */
function mount(): void {
  const ticket = ++mounting
  const go = (): void => {
    if (!alive || ticket !== mounting) return
    // A piece named without its shelf, or on the wrong one: every shelf is in by now, so look for it.
    if (solo && !stagedAs(world, solo)) {
      const home = [...shelves.values()].find((s) => s.staged[solo!])
      if (home) world = home.world.name
      else solo = null
      writeUrl('keep')
    }
    mountNow()
    sync()
  }
  // A piece or a world on a named shelf needs that shelf and no other; the sheet needs them all.
  const named = viewName() !== 'sheet' && world ? loadShelf(world) : null
  if (!named) {
    void everything.then(go)
    return
  }
  void named.then((s) => {
    shelves.set(s.world.name, s)
    if (!solo || s.staged[solo]) go()
    else void everything.then(go)
  })
}

function rebuild(how: Write = 'keep', at = 0): void {
  if (view?.scroll) sheetScroll = view.scroll()
  seek(at)
  writeUrl(how)
  mount()
}

function reroll(next = randomSeed()): void {
  seed = next
  rebuild()
}

/** From the sheet into one piece's world. */
function pick(name: string, from: string): void {
  const up = viewName() === 'sheet'
  solo = name
  world = from
  rebuild(up ? 'push' : 'keep')
}

/** A shelf run as a world: a machine built from what is staged there. */
function run(name: string): void {
  const up = viewName() === 'sheet'
  solo = null
  world = name
  rebuild(up ? 'push' : 'keep')
}

/** The piece being watched alone, as the sheet knows it. */
const soloEntry = (): Entry | null => (solo && world ? { name: solo, world } : null)

/** From one piece alone to the one before or after it on the sheet. */
function step(dir: 1 | -1): void {
  if (viewName() !== 'piece') return
  void everything.then(() => {
    if (!alive) return
    const order = catalogOrder(sheetWorlds())
    const here = soloEntry()
    const i = order.findIndex((e) => e.name === here?.name && e.world === here?.world)
    const next = order[(Math.max(0, i) + dir + order.length) % order.length]
    solo = next.name
    world = next.world
    rebuild()
  })
}

/** The way back, to the sheet: the browser's Back when this view was opened from it, its place taken when not. */
function back(): void {
  if (viewName() === 'sheet') return
  if ((history.state as Step | null)?.opened) {
    history.back()
    return
  }
  lastPick = soloEntry()
  solo = null
  world = null
  rebuild('replace')
}

function setOverview(on: boolean): void {
  overview = on
  view?.setOverview?.(on && !solo)
  sync()
}

const onPop = () => {
  // A tab change is the host's. This listener only walks the sheet, and only while this visit is up.
  if (!alive || modeFromPath(location.pathname) !== 'playground') return
  const left = soloEntry()
  const current = seed
  const from = viewName()
  readUrl()
  // Coming back down to the sheet keeps the seed in hand, as in Machine.
  if (viewName() === 'sheet' && from !== 'sheet') {
    seed = current
    lastPick = left
  }
  rebuild('keep')
}
window.addEventListener('popstate', onPop)

/* ------------------------------------------------------------------ panel */

const seedInput = el('input', { type: 'text', class: 'seed', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Seed', value: seed })
seedInput.addEventListener('change', () => {
  const next = seedInput.value.trim()
  if (next && next !== seed) reroll(next)
})
const rerollBtn = el('button', { class: 'primary', title: 'A new seed: new variants, new maps (R)' }, ['Reroll', el('kbd', {}, ['R'])])
rerollBtn.addEventListener('click', () => reroll())
const copyBtn = copyButton(() => navigator.clipboard.writeText(location.href), 'Copy a link to this view')
seedCard(panelRoot, seedInput, [rerollBtn, copyBtn])

// Staged — what is on the stage and what is said of it, the shelves, and the steps between pieces.
const stagedSec = section(panelRoot, 'Staged')
const stagedTitle = stagedSec.querySelector('.section-title')!
const readout = el('div', { class: 'readout' })
// A chip a shelf: run it as a world. The one on the stage is lit.
const chips = SHELVES.map((s) => {
  const b = el('button', { type: 'button', title: s.kind === 'world' ? `Run ${s.label}, a world not yet in the loop` : `Run a machine built only from what is waiting to join ${s.label}` }, [s.label])
  b.addEventListener('click', () => run(s.name))
  return { s, b }
})
const shelfRow = el('div', { class: 'field' }, [
  el('label', {}, [el('span', {}, ['Run a shelf as a world'])]),
  el('div', { class: 'seg wrap', role: 'group', 'aria-label': 'Shelves' }, chips.map((c) => c.b)),
])
const prevPieceBtn = el('button', { title: 'The piece before this one on the sheet ([)' }, ['← piece', el('kbd', {}, ['['])])
prevPieceBtn.addEventListener('click', () => step(-1))
const nextPieceBtn = el('button', { title: 'The piece after this one on the sheet (])' }, ['piece →', el('kbd', {}, [']'])])
nextPieceBtn.addEventListener('click', () => step(1))
const prevWorld = () => {
  if (!show) return
  const here = show.at(now())
  const i = here.universe.index
  seek(show.begin(here.local > 2 ? i : Math.max(0, i - 1)))
}
const nextWorldNow = () => show && seek(show.begin(show.indexAt(now()) + 1))
const prevMapBtn = el('button', { title: 'Back to the top of this map, then to the one before it (⇧N)' }, ['← map'])
prevMapBtn.addEventListener('click', prevWorld)
const nextMapBtn = el('button', { title: 'Another map of the same shelf (N)' }, ['map →', el('kbd', {}, ['N'])])
nextMapBtn.addEventListener('click', nextWorldNow)
const sheetBtn = el('button')
sheetBtn.addEventListener('click', back)
const overviewBtn = el('button', { title: 'Zoom out to the whole map (O)' }, ['Overview', el('kbd', {}, ['O'])])
overviewBtn.addEventListener('click', () => setOverview(!overview))
const steps = el('div', { class: 'row' }, [prevPieceBtn, nextPieceBtn])
const maps = el('div', { class: 'row' }, [prevMapBtn, nextMapBtn])
const views = el('div', { class: 'row' }, [sheetBtn, overviewBtn])
stagedSec.append(readout, shelfRow, steps, maps, views)

// The way back, on the stage itself, as in Machine: the panel starts hidden.
const crumbBack = el('button', { type: 'button' })
crumbBack.addEventListener('click', back)
const crumbHere = el('span', { class: 'crumb-here' })
const crumbPrev = el('button', { type: 'button', class: 'crumb-step', title: 'The piece before ([)', 'aria-label': 'Previous piece' }, ['‹'])
crumbPrev.addEventListener('click', () => step(-1))
const crumbNext = el('button', { type: 'button', class: 'crumb-step', title: 'The piece after (])', 'aria-label': 'Next piece' }, ['›'])
crumbNext.addEventListener('click', () => step(1))
const crumb = el('nav', { class: 'crumb', 'aria-label': 'The way back' }, [crumbBack, crumbHere, crumbPrev, crumbNext])
crumb.addEventListener('click', (e) => {
  if (e.detail > 0) (e.target as Element).closest('button')?.blur()
})
stage.append(crumb)

// Transport — the clock, over the map on the stage.
const transport = section(panelRoot, 'Transport', 'transport')
const time = el('span', { class: 'time' }, ['0.0s'])
transport.querySelector('.section-title')!.append(time)
const scrub = el('input', { type: 'range', class: 'scrub', min: '0', max: '1000', step: '1', value: '0', 'aria-label': 'Position in this map' })
scrub.addEventListener('input', () => {
  if (!show) return
  const i = show.indexAt(now())
  const u = show.universe(i)
  setPaused(true)
  scrub.style.setProperty('--p', `${Number(scrub.value) / 10}%`)
  seek(show.begin(i) + (Number(scrub.value) / 1000) * u.journey)
})
guardWheel(shell.root, scrub)
let scrubbing = false
scrub.addEventListener('pointerdown', () => { scrubbing = true })
const endScrub = () => { scrubbing = false }
window.addEventListener('pointerup', endScrub)
const play = el('button', { class: 'tbtn play', title: 'Play / pause (space)', 'aria-label': 'Play or pause' }, [icon(ICON.pause)])
play.addEventListener('click', () => setPaused(!paused))
const speedSeg = segmented(SPEEDS, speedLabel, setSpeed)
transport.append(scrub, el('div', { class: 'row deck' }, [play, speedSeg.node]))

// Export — the same pair as Machine: the frame, and the map from cut to cut.
const exportSec = section(panelRoot, 'Export')
const dims = el('span', { class: 'dims' }, ['—'])
exportSec.querySelector('.section-title')!.append(dims)
let exportScale = loadView().exportScale
const scaleSeg = segmented(EXPORT_SCALES, (v) => `${v}×`, (v) => {
  exportScale = v
  saveView({ ...loadView(), exportScale })
  sync()
})
const exportName = (): string => (solo ? `contraptions-playground-${solo}-${seed}` : world ? `contraptions-playground-${world}-${seed}` : `contraptions-playground-${seed}`)
const saveBtn = el('button', {}, ['Save PNG'])
saveBtn.addEventListener('click', () => {
  if (!view) return
  view.savePng(exportName(), exportScale)
  saveBtn.classList.add('ok')
  saveBtn.textContent = 'Saved'
  window.setTimeout(() => {
    saveBtn.textContent = 'Save PNG'
    saveBtn.classList.remove('ok')
  }, 1200)
})
const saveLoopBtn = el('button', {}, ['Save loop'])
const canWebm = webmMime() !== null
let recording = false
saveLoopBtn.addEventListener('click', () => {
  const recorded = view
  if (recording || !recorded?.saveLoop) return
  void (async () => {
    const wasPaused = paused
    const from = now()
    recording = true
    setPaused(true)
    saveLoopBtn.textContent = 'Saving 0%'
    try {
      await recorded.saveLoop!(exportName(), (done) => {
        saveLoopBtn.textContent = `Saving ${Math.round(done * 100)}%`
      })
      saveLoopBtn.textContent = 'Save loop'
    } catch (err) {
      console.error(err)
      saveLoopBtn.textContent = 'Failed'
      window.setTimeout(() => {
        if (!recording) saveLoopBtn.textContent = 'Save loop'
      }, 1600)
    } finally {
      recording = false
      if (view === recorded) {
        seek(from)
        setPaused(wasPaused)
      }
      sync()
    }
  })()
})
exportSec.append(el('div', { class: 'row export-row' }, [scaleSeg.node, saveBtn, saveLoopBtn]))

const playIcon = icon(ICON.play)
const pauseIcon = icon(ICON.pause)

function sync(): void {
  if (document.activeElement !== seedInput) seedInput.value = seed
  shell.setSeed(seed)
  play.replaceChildren(paused ? playIcon : pauseIcon)
  play.classList.toggle('paused', paused)
  speedSeg.set(speed)
  overviewBtn.classList.toggle('on', overview)
  const v = viewName()
  stagedTitle.textContent = v === 'sheet' ? 'Staged' : v === 'piece' ? 'Piece' : 'World'
  document.title = v === 'sheet' ? 'contraptions · playground' : `${solo ?? shelves.get(world!)?.world.label.toLowerCase() ?? world} · playground`
  sheetBtn.replaceChildren('← Sheet', el('kbd', {}, ['esc']))
  sheetBtn.title = 'Back to the sheet of everything staged (esc)'
  sheetBtn.hidden = v === 'sheet'
  crumb.hidden = v === 'sheet'
  crumbBack.replaceChildren('← Sheet', el('kbd', {}, ['esc']))
  crumbBack.title = 'Back to the sheet (esc)'
  crumbHere.textContent = solo ?? shelves.get(world ?? '')?.world.label ?? ''
  crumbPrev.hidden = crumbNext.hidden = v !== 'piece'
  for (const { s, b } of chips) b.classList.toggle('on', v === 'world' && world === s.name)
  steps.hidden = v !== 'piece'
  maps.hidden = v !== 'world'
  overviewBtn.hidden = v !== 'world'
  views.hidden = v === 'sheet'
  scrub.hidden = v === 'sheet'
  scaleSeg.set(exportScale)
  saveBtn.disabled = recording
  saveLoopBtn.hidden = v === 'sheet'
  saveLoopBtn.disabled = recording || !canWebm
}

let lastReadout = ''
let lastTime = ''
let lastPaper = ''
let lastDims = ''
let raf = 0
function tick(): void {
  if (!alive) return
  const t = now()
  const v = viewName()
  const here = show && v !== 'sheet' ? show.at(t) : null
  const u = here?.universe ?? null
  let text: string
  if (v === 'sheet') {
    const counts = [...shelves.values()].reduce((sum, s) => sum + Object.keys(s.staged).length, 0)
    text = allIn ? `${counts} staged on ${shelves.size} shelves\nnone of it is in Machine, or fetched by it` : 'fetching the shelves…'
  } else if (v === 'piece') {
    const said = stagedAs(world, solo)
    text = `${solo} · ${said?.status ?? '…'} · ${(u?.world.label ?? '').toLowerCase()}\n${said?.note ?? ''}`
  } else {
    text = u ? `${u.world.label.toLowerCase()} · map ${u.index + 1} · ${here!.placed.piece.name}\n${u.theme.label} · ${u.taste} · ${u.world.note}` : 'fetching the shelf…'
  }
  if (text !== lastReadout) {
    lastReadout = text
    const [head, tail] = text.split('\n')
    readout.replaceChildren(el('b', {}, [head]), ...(tail ? [el('br'), tail] : []))
  }
  const clock = u && here ? `${here.local.toFixed(1)} / ${u.journey.toFixed(0)}s` : `${t.toFixed(1)}s`
  if (clock !== lastTime) {
    lastTime = clock
    time.textContent = clock
  }
  if (view) {
    const [ew, eh] = view.exportSize(exportScale)
    const size = `${ew} × ${eh}px${u ? ` · ${u.journey.toFixed(1)}s` : ''}`
    if (size !== lastDims) {
      lastDims = size
      dims.textContent = size
      saveLoopBtn.title = canWebm ? 'WebM of this map, cut to cut, at the current canvas size. Scale is for PNG only.' : 'WebM export needs a browser that can record the canvas.'
    }
  }
  if (u && here && !scrubbing) {
    const p = here.local / u.journey
    scrub.value = String(Math.round(p * 1000))
    scrub.style.setProperty('--p', `${p * 100}%`)
  }
  const paper = u?.theme.bg ?? sheetWorlds()[0]?.themes[0].bg
  if (paper && paper !== lastPaper) {
    lastPaper = paper
    stage.style.setProperty('--paper', paper)
  }
  raf = requestAnimationFrame(tick)
}
raf = requestAnimationFrame(tick)

/* ------------------------------------------------------------------ keys */

const onKey = (e: KeyboardEvent) => {
  if (!alive) return
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
  if (t instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
  switch (e.key) {
    case ' ':
      e.preventDefault()
      setPaused(!paused)
      break
    case 'Escape':
    case 'c':
      back()
      break
    case 'r':
      reroll()
      break
    case 'w':
      // The shelf in hand as a world: the piece's own shelf, or the first.
      run(world ?? SHELVES[0].name)
      break
    case 'n':
      if (viewName() === 'world') nextWorldNow()
      break
    case 'N':
      if (viewName() === 'world') prevWorld()
      break
    case 'o':
      if (viewName() === 'world') setOverview(!overview)
      break
    case '[':
      step(-1)
      break
    case ']':
      step(1)
      break
    case 'p':
      shell.toggle()
      break
    case 'ArrowRight':
      setPaused(true)
      seek(now() + (e.shiftKey ? 1 : 1 / 60))
      break
    case 'ArrowLeft':
      setPaused(true)
      seek(now() - (e.shiftKey ? 1 : 1 / 60))
      break
  }
}
window.addEventListener('keydown', onKey)

writeUrl('keep')
mount()
sync()

// Dev handle for scripted capture, as Machine's.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).rube = {
    seek,
    now,
    setPaused,
    reroll,
    pick,
    run,
    step,
    back,
    togglePanel: () => shell.toggle(),
    show: () => show,
    shelves: () => shelves,
    canvas: () => stage.querySelector('canvas') as HTMLCanvasElement,
    setOverview,
  }
}

  return () => {
    alive = false
    cancelAnimationFrame(raf)
    window.removeEventListener('popstate', onPop)
    window.removeEventListener('pointerup', endScrub)
    window.removeEventListener('keydown', onKey)
    view?.destroy()
    if (import.meta.env.DEV) delete (window as unknown as Record<string, unknown>).rube
  }
}

registerMode('playground', start)

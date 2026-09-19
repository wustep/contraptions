import '../../../src/ui/styles.css'
import { randomSeed } from '../../../src/core/seed'
import { ICON, copyButton, createShell, credit, el, guardWheel, icon, section, seedCard, segmented } from '../../../src/ui/shell'
import { webmMime } from '../../../src/core/capture'
import { EXPORT_SCALES, SPEEDS, loadView, saveView, speedLabel } from '../../../src/ui/view'
import { catalogOrder, createCatalog, type Entry } from './catalog'
import { createStage } from './engine'
import { Show } from './show'
import { WORLDS, nextWorld, worldByName } from './worlds'

/**
 * The entry: Machine mode. A seed in the URL, the canvas filling everything
 * the panel leaves, and the panel itself: the same chrome as Explorations —
 * brand, mode switch, seed card, transport — with the show's own sections in
 * between: a readout of where the ball is and which world comes next, the
 * loop as four chips with the current one lit, world-to-world jumps, the
 * catalog and the overview, and the same Export at the foot: the frame as a
 * PNG, or the world the ball is in as a WebM. `P` hides the panel for the
 * show alone.
 * `?catalog=1` opens the sheet of every piece instead of the show;
 * `?solo=<piece>` shows one piece's worlds; `?world=<name>` keeps the show
 * in one world instead of going round the loop.
 *
 * The three views are a stack — the machine, the catalog over it, a piece
 * alone over that — and there is one way back down it, which every door
 * shares: Escape, the way-back button in the stage's corner, the panel's
 * button and the browser's own Back all do the same thing and land in the
 * same place. Going up is a step in the history; the way back down is going
 * back in it. And a view is left the way it will be found again: the show
 * picks up where the ball was, the sheet opens where it was scrolled to with
 * the piece just watched lit.
 */

const stage = document.getElementById('stage')!
const panelRoot = document.getElementById('panel')!

let seed = randomSeed()
let solo: string | null = null
let world: string | null = null
let catalogOn = false

function readUrl(): void {
  const params = new URLSearchParams(location.search)
  seed = params.get('seed') || randomSeed()
  catalogOn = params.get('catalog') === '1'
  // The catalog is a sheet of every piece; it never narrows to one.
  solo = catalogOn ? null : params.get('solo')
  const pin = params.get('world')
  world = pin && worldByName(pin) ? pin : null
}
readUrl()

let show = new Show(seed, { solo, world })

/** The stack, bottom to top. */
const VIEWS = ['show', 'catalog', 'solo'] as const
type ViewName = (typeof VIEWS)[number]
const viewName = (): ViewName => (catalogOn ? 'catalog' : solo ? 'solo' : 'show')

/** Where the show was when the catalog was opened over it, so the way back lands there and not at the top. */
let resume: { seed: string; world: string | null; t: number } | null = null
/** Where the sheet was scrolled to when it was last left, and the piece it was left for. */
let sheetScroll = 0
let lastPick: Entry | null = null

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

/**
 * What a history entry remembers: whether it was opened from the view under
 * it, so that the entry under it in the history is that view. When it was,
 * the way back is the browser's own Back; when it was not — a link straight
 * to the sheet or to a solo — the view under it takes this entry's place
 * instead, and nothing is left behind it.
 */
interface Step {
  opened: boolean
}

/**
 * `push` is a step up the stack; `replace` is a change of view with no
 * step under it; `keep` is the same view with something else in it — a new
 * seed, a pin, the next piece — and leaves what the entry remembers alone.
 */
type Write = 'push' | 'replace' | 'keep'

function writeUrl(how: Write): void {
  const q = new URLSearchParams()
  q.set('seed', seed)
  if (solo) q.set('solo', solo)
  if (world) q.set('world', world)
  if (catalogOn) q.set('catalog', '1')
  const url = `?${q.toString()}`
  if (how === 'push') history.pushState({ opened: true } satisfies Step, '', url)
  else history.replaceState(how === 'keep' ? history.state : ({ opened: false } satisfies Step), '', url)
}

/* ------------------------------------------------------------------ stage */

interface View {
  setOverview?(on: boolean): void
  scroll?(): number
  savePng(filename: string, scale: number): void
  /** The show's and a solo's; the sheet of every piece has no one loop to save. */
  saveLoop?(filename: string, progress?: (done: number) => void): Promise<void>
  exportSize(scale: number): [number, number]
  destroy(): void
}

let overview = false
let view: View = mount()
writeUrl('keep')

/** The right thing on the canvas for the mode: the show, or the sheet of every piece. */
function mount(): View {
  if (catalogOn) {
    // The sheet opens where it was left, on the piece it was left for; the
    // piece is lit once, not again on every reroll.
    const focus = lastPick
    lastPick = null
    return createCatalog(stage, seed, { time: now }, (name, from) => pick(name, from), { scroll: sheetScroll, focus })
  }
  const s = createStage(stage, show, { time: now })
  // A solo has its own steady frame; the overview is the show's.
  s.setOverview(overview && !solo)
  return s
}

/** Rebuild everything from the seed and the mode, from `at` on the clock: the top, unless a view is being come back to. */
function rebuild(how: Write = 'keep', at = 0): void {
  show = new Show(seed, { solo, world })
  if (view.scroll) sheetScroll = view.scroll()
  view.destroy()
  view = mount()
  seek(at)
  writeUrl(how)
  sync()
}

function reroll(next = randomSeed()): void {
  seed = next
  rebuild()
}

/** Where the show was left, if this is still the show that was left. */
const resumeAt = (): number => (resume && resume.seed === seed && resume.world === world && !solo && !catalogOn ? resume.t : 0)

/** The piece being watched alone, as the sheet knows it. */
const soloEntry = (): Entry | null => (solo ? { name: solo, world: show.pinned?.name ?? '' } : null)

/** From the show up to the sheet of every piece: a step in the history, so back is the show, where it was. */
function openCatalog(): void {
  resume = { seed, world, t: now() }
  solo = null
  world = null
  catalogOn = true
  rebuild('push')
}

/** From the catalog into one piece's worlds, in the world it belongs to; a step in the history, so back is the sheet. */
function pick(name: string, from: string): void {
  solo = name
  world = from
  catalogOn = false
  rebuild('push')
}

/** From one piece alone to the one before or after it on the sheet, without going back to the sheet between. */
function step(dir: 1 | -1): void {
  if (viewName() !== 'solo') return
  const order = catalogOrder()
  const here = soloEntry()
  const i = order.findIndex((e) => e.name === here?.name && e.world === here?.world)
  const next = order[(Math.max(0, i) + dir + order.length) % order.length]
  solo = next.name
  world = next.world
  rebuild()
}

/** Stay in one world, or go round the loop again. */
function pinWorld(name: string | null): void {
  world = name
  rebuild()
}

/**
 * The way back: out of a solo to the catalog, out of the catalog to the
 * show. When this view was opened from the one under it, that is the
 * browser's Back, and `popstate` does the rest; when it was linked to
 * directly, the view under it takes its place.
 */
function back(): void {
  const from = viewName()
  if (from === 'show') return
  if ((history.state as Step | null)?.opened) {
    history.back()
    return
  }
  if (from === 'solo') {
    lastPick = soloEntry()
    solo = null
    world = null
    catalogOn = true
    rebuild('replace')
  } else {
    catalogOn = false
    world = resume?.seed === seed ? resume.world : null
    rebuild('replace', resumeAt())
  }
}

function setOverview(on: boolean): void {
  overview = on
  view.setOverview?.(on && !solo)
  sync()
}

window.addEventListener('popstate', () => {
  const from = viewName()
  const left = soloEntry()
  const current = seed
  readUrl()
  // Coming back down the stack keeps the seed in hand: a reroll up there
  // was a reroll of the whole thing, not of one view of it.
  if (VIEWS.indexOf(viewName()) < VIEWS.indexOf(from)) seed = current
  if (from === 'solo' && catalogOn) lastPick = left
  rebuild('keep', resumeAt())
})

/* ------------------------------------------------------------------ panel */

const shell = createShell(panelRoot, 'machine')

// Seed — one string fixes the whole future, so it leads.
const seedInput = el('input', {
  type: 'text',
  class: 'seed',
  spellcheck: 'false',
  autocomplete: 'off',
  'aria-label': 'Seed',
  value: seed,
})
seedInput.addEventListener('change', () => {
  const next = seedInput.value.trim()
  if (next && next !== seed) reroll(next)
})
const rerollBtn = el('button', { class: 'primary', title: 'A new seed, a new show (R)' }, ['Reroll', el('kbd', {}, ['R'])])
rerollBtn.addEventListener('click', () => reroll())
const copyBtn = copyButton(() => navigator.clipboard.writeText(location.href), 'Copy a link to this show')
seedCard(panelRoot, seedInput, [rerollBtn, copyBtn])

// World — where the ball is, the loop, and the jumps.
const worldSec = section(panelRoot, 'World')
const worldTitle = worldSec.querySelector('.section-title')!
const readout = el('div', { class: 'readout' })
// The loop: one chip a world, in order, the current one lit. A chip jumps
// to the next visit to that world; Pin keeps the show there.
const chips = WORLDS.map((w) => {
  const b = el('button', { type: 'button', title: `Skip to the next visit to the ${w.label.toLowerCase()}` }, [w.label])
  b.addEventListener('click', () => {
    if (show.pinned && show.pinned !== w) return
    seek(show.begin(show.nextVisit(show.indexAt(now()), w)))
  })
  return b
})
const loopSeg = el('div', { class: 'seg', role: 'group', 'aria-label': 'The loop' }, chips)
const pinBtn = el('button', { class: 'chip', title: 'Stay in this world instead of going round the loop' }, ['Pin'])
pinBtn.addEventListener('click', () => pinWorld(world ? null : show.at(now()).universe.world.name))
const loop = el('div', { class: 'row deck' }, [loopSeg, pinBtn])
// Back is a player's back: to the top of this world first, and only from
// there to the world before it, so one press never loses the place.
const prevWorld = () => {
  const here = show.at(now())
  const i = here.universe.index
  seek(show.begin(here.local > 2 ? i : Math.max(0, i - 1)))
}
const nextWorldNow = () => seek(show.begin(show.indexAt(now()) + 1))
const prevBtn = el('button', { title: 'Back to the top of this world, then to the world before it (\u21e7N)' }, ['\u2190 world'])
prevBtn.addEventListener('click', prevWorld)
const nextBtn = el('button', { title: 'Skip to the next world (N)' }, ['world \u2192', el('kbd', {}, ['N'])])
nextBtn.addEventListener('click', nextWorldNow)
const restartBtn = el('button', { title: 'Back to the top of the show' }, ['Restart'])
restartBtn.addEventListener('click', () => seek(0))
// A piece alone steps piece to piece where the show steps world to world.
const prevPieceBtn = el('button', { title: 'The piece before this one on the sheet ([)' }, ['\u2190 piece', el('kbd', {}, ['['])])
prevPieceBtn.addEventListener('click', () => step(-1))
const nextPieceBtn = el('button', { title: 'The piece after this one on the sheet (])' }, ['piece \u2192', el('kbd', {}, [']'])])
nextPieceBtn.addEventListener('click', () => step(1))
// One button, one door: into the catalog from the show, and the way back from anywhere above it.
const catalogBtn = el('button')
catalogBtn.addEventListener('click', () => (viewName() === 'show' ? openCatalog() : back()))
const overviewBtn = el('button', { title: 'Zoom out to the whole world (O)' }, ['Overview', el('kbd', {}, ['O'])])
overviewBtn.addEventListener('click', () => setOverview(!overview))
const jumps = el('div', { class: 'row' }, [prevBtn, nextBtn, restartBtn])
const steps = el('div', { class: 'row' }, [prevPieceBtn, nextPieceBtn])
const views = el('div', { class: 'row' }, [catalogBtn, overviewBtn])
worldSec.append(readout, loop, jumps, steps, views)

// The way back, on the stage itself. Both modes open with the panel away,
// so a view that can only be left from the panel, or by a key nobody was
// told about, is a view that cannot be left.
const crumbBack = el('button', { type: 'button' })
crumbBack.addEventListener('click', back)
const crumbHere = el('span', { class: 'crumb-here' })
const crumbPrev = el('button', { type: 'button', class: 'crumb-step', title: 'The piece before ([)', 'aria-label': 'Previous piece' }, ['\u2039'])
crumbPrev.addEventListener('click', () => step(-1))
const crumbNext = el('button', { type: 'button', class: 'crumb-step', title: 'The piece after (])', 'aria-label': 'Next piece' }, ['\u203a'])
crumbNext.addEventListener('click', () => step(1))
const crumb = el('nav', { class: 'crumb', 'aria-label': 'The way back' }, [crumbBack, crumbHere, crumbPrev, crumbNext])
// As in the panel: a clicked button must not keep the focus, or it swallows space.
crumb.addEventListener('click', (e) => {
  if (e.detail > 0) (e.target as Element).closest('button')?.blur()
})
stage.append(crumb)

// Transport — the clock, over the current world.
const transport = section(panelRoot, 'Transport', 'transport')
const time = el('span', { class: 'time' }, ['0.0 / 0s'])
transport.querySelector('.section-title')!.append(time)
const scrub = el('input', {
  type: 'range',
  class: 'scrub',
  min: '0',
  max: '1000',
  step: '1',
  value: '0',
  'aria-label': 'Position in this world',
})
scrub.addEventListener('input', () => {
  const i = show.indexAt(now())
  const u = show.universe(i)
  setPaused(true)
  scrub.style.setProperty('--p', `${Number(scrub.value) / 10}%`)
  seek(show.begin(i) + (Number(scrub.value) / 1000) * u.journey)
})
guardWheel(panelRoot, scrub)
let scrubbing = false
scrub.addEventListener('pointerdown', () => { scrubbing = true })
window.addEventListener('pointerup', () => { scrubbing = false })
const play = el('button', { class: 'tbtn play', title: 'Play / pause (space)', 'aria-label': 'Play or pause' }, [icon(ICON.pause)])
play.addEventListener('click', () => setPaused(!paused))
// The same five stops as Explorations; the clock is continuous, so any rate is fine.
const speedSeg = segmented(SPEEDS, speedLabel, setSpeed)
transport.append(scrub, el('div', { class: 'row deck' }, [play, speedSeg.node]))

// Export — the same two as Explorations: the frame, and the loop. The
// loop here is a world, from the cut that opens it to the cut that closes it.
const exportSec = section(panelRoot, 'Export')
const dims = el('span', { class: 'dims' }, ['\u2014'])
exportSec.querySelector('.section-title')!.append(dims)
// The scale is one preference across both modes, kept where Explorations keeps it.
let exportScale = loadView().exportScale
const scaleSeg = segmented(EXPORT_SCALES, (v) => `${v}\u00d7`, (v) => {
  exportScale = v
  saveView({ ...loadView(), exportScale })
  sync()
})
/** What a file is called: the view, the seed, and for the show the world it is a visit to. */
const exportName = (): string => {
  if (catalogOn) return `contraptions-catalog-${seed}`
  if (solo) return `contraptions-${solo}-${seed}`
  const u = show.at(now()).universe
  return `contraptions-machine-${seed}-${u.index}-${u.world.name}`
}
const saveBtn = el('button', {}, ['Save PNG'])
saveBtn.addEventListener('click', () => {
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
  const stage = view
  if (recording || !stage.saveLoop) return
  void (async () => {
    // The clock is held for the encode and put back after it, so the show
    // picks up where it was and the readout does not run on under the recording.
    const wasPaused = paused
    const from = now()
    recording = true
    setPaused(true)
    saveLoopBtn.textContent = 'Saving 0%'
    try {
      await stage.saveLoop!(exportName(), (done) => {
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
      // Only if the stage recorded is still the stage: a reroll mid-way has its own clock.
      if (view === stage) {
        seek(from)
        setPaused(wasPaused)
      }
      sync()
    }
  })()
})
exportSec.append(el('div', { class: 'row export-row' }, [scaleSeg.node, saveBtn, saveLoopBtn]))

credit(panelRoot)

const playIcon = icon(ICON.play)
const pauseIcon = icon(ICON.pause)

function sync(): void {
  if (document.activeElement !== seedInput) seedInput.value = seed
  shell.setSeed(seed)
  play.replaceChildren(paused ? playIcon : pauseIcon)
  play.classList.toggle('paused', paused)
  speedSeg.set(speed)
  overviewBtn.classList.toggle('on', overview)
  pinBtn.textContent = world ? 'Unpin' : 'Pin'
  pinBtn.classList.toggle('on', !!world)
  // The way back says where it goes, the same words in the panel and on the stage.
  const v = viewName()
  const under = v === 'solo' ? 'Catalog' : 'Machine'
  if (v === 'show') {
    catalogBtn.replaceChildren('Catalog', el('kbd', {}, ['C']))
    catalogBtn.title = 'The sheet of every piece (C)'
  } else {
    catalogBtn.replaceChildren(`\u2190 ${under}`, el('kbd', {}, ['esc']))
    catalogBtn.title = `Back to the ${under.toLowerCase()} (esc)`
  }
  // The section is named for what is on the stage, and so is the tab: the
  // views are steps in the history, and a history of three entries all
  // called the same thing is no help in getting back.
  worldTitle.textContent = v === 'show' ? 'World' : v === 'catalog' ? 'Catalog' : 'Piece'
  document.title = v === 'show' ? 'contraptions' : `${v === 'catalog' ? 'catalog' : solo} \u00b7 contraptions`
  crumb.hidden = v === 'show'
  crumbBack.replaceChildren(`\u2190 ${under}`, el('kbd', {}, ['esc']))
  crumbBack.title = `Back to the ${under.toLowerCase()} (esc)`
  crumbHere.textContent = solo ?? ''
  crumbHere.hidden = crumbPrev.hidden = crumbNext.hidden = v !== 'solo'
  // The loop, its jumps and the overview are the show's; a piece alone steps
  // through pieces instead; the sheet has no world to jump between or scrub.
  loop.hidden = v !== 'show'
  jumps.hidden = v !== 'show'
  overviewBtn.hidden = v !== 'show'
  steps.hidden = v !== 'solo'
  scrub.hidden = v === 'catalog'
  scaleSeg.set(exportScale)
  saveBtn.disabled = recording
  saveLoopBtn.hidden = v === 'catalog'
  saveLoopBtn.disabled = recording || !canWebm
}

// The readout and the clock print tenths of a second; writing them on every
// frame is wasted work, so skip until the text would change.
let lastReadout = ''
let lastTime = ''
let lastPaper = ''
let lastDims = ''
function tick(): void {
  const t = now()
  const here = show.at(t)
  const u = here.universe
  // Which world, and which comes next (or that the show is pinned here).
  const next = show.pinned ? null : nextWorld(u.world)
  const text = catalogOn
    ? `catalog · ${WORLDS.map((w) => w.label.toLowerCase()).join(' → ')}`
    : solo
      ? `${solo} · alone · ${u.world.label.toLowerCase()}\n${u.theme.label} · take ${u.index + 1}`
      : `world ${u.index} · ${u.world.label.toLowerCase()}${next ? ` → ${next.label.toLowerCase()}` : ' · pinned'}\n${u.theme.label} · ${u.taste} · ${here.placed.piece.name}`
  if (text !== lastReadout) {
    lastReadout = text
    const [head, tail] = text.split('\n')
    readout.replaceChildren(el('b', {}, [head]), ...(tail ? [el('br'), tail] : []))
    chips.forEach((chip, i) => chip.classList.toggle('on', WORLDS[i] === u.world))
  }
  const clock = catalogOn ? `${t.toFixed(1)}s` : `${here.local.toFixed(1)} / ${u.journey.toFixed(0)}s`
  if (clock !== lastTime) {
    lastTime = clock
    time.textContent = clock
  }
  // What Export would write: the PNG's pixels and, where there is one, the loop's length.
  const [ew, eh] = view.exportSize(exportScale)
  const size = `${ew} \u00d7 ${eh}px${catalogOn ? '' : ` \u00b7 ${u.journey.toFixed(1)}s`}`
  if (size !== lastDims) {
    lastDims = size
    dims.textContent = size
    saveLoopBtn.title = canWebm
      ? `WebM of this world, cut to cut: ${u.journey.toFixed(1)}s at the current canvas size. Scale is for PNG only.`
      : 'WebM export needs a browser that can record the canvas.'
  }
  if (!catalogOn && !scrubbing) {
    const p = here.local / u.journey
    scrub.value = String(Math.round(p * 1000))
    scrub.style.setProperty('--p', `${p * 100}%`)
  }
  // The stage behind the canvas is this world's paper, so a resize never
  // flashes the panel's dark behind the picture.
  if (u.theme.bg !== lastPaper) {
    lastPaper = u.theme.bg
    stage.style.setProperty('--paper', u.theme.bg)
  }
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

/* ------------------------------------------------------------------ keys */

window.addEventListener('keydown', (e) => {
  // Never shadow browser chrome (cmd+S, ctrl+R, ...).
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  // Typing in a field or nudging a slider owns the keyboard outright; a
  // focused button keeps only its activation keys, so the rest still work.
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
  if (t instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
  switch (e.key) {
    case ' ':
      e.preventDefault()
      setPaused(!paused)
      break
    case 'Escape':
      back()
      break
    case 'r':
      reroll()
      break
    case 'n':
      if (!catalogOn) nextWorldNow()
      break
    case 'N':
      if (!catalogOn) prevWorld()
      break
    case 'o':
      if (viewName() === 'show') setOverview(!overview)
      break
    case 'c':
      catalogBtn.click()
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
})

sync()

// Dev handle for scripted capture.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).rube = {
    seek,
    now,
    setPaused,
    reroll,
    pick,
    step,
    back,
    pinWorld,
    setCatalog: (on: boolean) => (on ? viewName() === 'show' && openCatalog() : viewName() === 'catalog' && back()),
    togglePanel: () => shell.toggle(),
    show: () => show,
    canvas: () => stage.querySelector('canvas') as HTMLCanvasElement,
    setOverview,
  }
}

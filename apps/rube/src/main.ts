import '../../../src/ui/styles.css'
import { randomSeed } from '../../../src/core/seed'
import { ICON, copyButton, createShell, credit, el, guardWheel, icon, section, seedCard, segmented } from '../../../src/ui/shell'
import { SPEEDS, speedLabel } from '../../../src/ui/view'
import { createCatalog } from './catalog'
import { createStage } from './engine'
import { Show } from './show'

/**
 * The entry: Machine mode. A seed in the URL, the canvas filling everything
 * the panel leaves, and the panel itself: the same chrome as Explorations —
 * brand, mode switch, seed card, transport — with the show's own sections in
 * between: a readout of where the ball is, world-to-world jumps, the catalog
 * and the overview. `P` hides the panel for the show alone. `?catalog=1`
 * opens the sheet of every piece instead of the show; `?solo=<piece>` shows
 * one piece's worlds. Escape steps back out: from a solo to the catalog,
 * from the catalog to the show.
 */

const stage = document.getElementById('stage')!
const panelRoot = document.getElementById('panel')!

let seed = randomSeed()
let solo: string | null = null
let catalogOn = false

function readUrl(): void {
  const params = new URLSearchParams(location.search)
  seed = params.get('seed') || randomSeed()
  catalogOn = params.get('catalog') === '1'
  // The catalog is a sheet of every piece; it never narrows to one.
  solo = catalogOn ? null : params.get('solo')
}
readUrl()

let show = new Show(seed, solo)

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

function writeUrl(push = false): void {
  const q = new URLSearchParams()
  q.set('seed', seed)
  if (solo) q.set('solo', solo)
  if (catalogOn) q.set('catalog', '1')
  const url = `?${q.toString()}`
  if (push) history.pushState(null, '', url)
  else history.replaceState(null, '', url)
}

/* ------------------------------------------------------------------ stage */

interface View {
  setOverview?(on: boolean): void
  destroy(): void
}

let overview = false
let view: View = mount()
writeUrl()

/** The right thing on the canvas for the mode: the show, or the sheet of every piece. */
function mount(): View {
  if (catalogOn) return createCatalog(stage, seed, { time: now }, (name) => pick(name))
  const s = createStage(stage, show, { time: now })
  s.setOverview(overview)
  return s
}

/** Rebuild everything from the seed and the mode, from the top of the clock. */
function rebuild(push = false): void {
  show = new Show(seed, solo)
  view.destroy()
  view = mount()
  seek(0)
  writeUrl(push)
  sync()
}

function reroll(next = randomSeed()): void {
  seed = next
  rebuild()
}

function openCatalog(): void {
  solo = null
  catalogOn = true
  rebuild()
}

function closeCatalog(): void {
  catalogOn = false
  rebuild()
}

/** From the catalog into one piece's worlds; a step in the history, so back is the sheet. */
function pick(name: string): void {
  solo = name
  catalogOn = false
  rebuild(true)
}

/** Escape: out of a solo to the catalog, out of the catalog to the show. */
function back(): void {
  if (catalogOn) closeCatalog()
  else if (solo) openCatalog()
}

function setOverview(on: boolean): void {
  overview = on
  view.setOverview?.(on)
  sync()
}

window.addEventListener('popstate', () => {
  readUrl()
  rebuild()
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

// World — where the ball is, and the jumps.
const world = section(panelRoot, 'World')
const readout = el('div', { class: 'readout' })
const prevBtn = el('button', { title: 'Back to the start of the previous world' }, ['\u2190 world'])
prevBtn.addEventListener('click', () => seek(show.begin(Math.max(0, show.indexAt(now()) - 1))))
const nextBtn = el('button', { title: 'Skip to the next world (N)' }, ['world \u2192', el('kbd', {}, ['N'])])
nextBtn.addEventListener('click', () => seek(show.begin(show.indexAt(now()) + 1)))
const restartBtn = el('button', { title: 'Back to the top of the show' }, ['Restart'])
restartBtn.addEventListener('click', () => seek(0))
const catalogBtn = el('button', { title: 'The sheet of every piece (C)' }, ['Catalog', el('kbd', {}, ['C'])])
catalogBtn.addEventListener('click', () => (catalogOn ? closeCatalog() : openCatalog()))
const overviewBtn = el('button', { title: 'Zoom out to the whole world (O)' }, ['Overview', el('kbd', {}, ['O'])])
overviewBtn.addEventListener('click', () => setOverview(!overview))
const jumps = el('div', { class: 'row' }, [prevBtn, nextBtn, restartBtn])
const views = el('div', { class: 'row' }, [catalogBtn, overviewBtn])
world.append(readout, jumps, views)

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
  catalogBtn.textContent = catalogOn ? 'Exit catalog' : 'Catalog'
  if (!catalogOn) catalogBtn.append(el('kbd', {}, ['C']))
  catalogBtn.classList.toggle('on', catalogOn)
  // The sheet has no worlds to jump between and no world to scrub.
  jumps.hidden = catalogOn
  overviewBtn.hidden = catalogOn
  scrub.hidden = catalogOn
}

// The readout and the clock print tenths of a second; writing them on every
// frame is wasted work, so skip until the text would change.
let lastReadout = ''
let lastTime = ''
let lastPaper = ''
function tick(): void {
  const t = now()
  const here = show.at(t)
  const u = here.universe
  const text = catalogOn
    ? `catalog · ${u.theme.label}${solo ? ` · ${solo}` : ''}`
    : `world ${u.index} · ${u.theme.label} · ${u.taste} · ${here.placed.piece.name}${solo ? ` · solo` : ''}`
  if (text !== lastReadout) {
    lastReadout = text
    readout.textContent = text
  }
  const clock = catalogOn ? `${t.toFixed(1)}s` : `${here.local.toFixed(1)} / ${u.journey.toFixed(0)}s`
  if (clock !== lastTime) {
    lastTime = clock
    time.textContent = clock
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
      if (!catalogOn) seek(show.begin(show.indexAt(now()) + 1))
      break
    case 'o':
      if (!catalogOn) setOverview(!overview)
      break
    case 'c':
      catalogBtn.click()
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
    setCatalog: (on: boolean) => (on ? openCatalog() : closeCatalog()),
    togglePanel: () => shell.toggle(),
    show: () => show,
    canvas: () => stage.querySelector('canvas') as HTMLCanvasElement,
    setOverview,
  }
}

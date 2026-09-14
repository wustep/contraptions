import { randomSeed } from '../../../src/core/seed'
import { createCatalog } from './catalog'
import { createStage } from './engine'
import { Show } from './show'

/**
 * The entry. No chrome: a canvas and a seed in the URL. The debug panel is
 * for working on the show — `?debug=1` or the backtick key — and is the
 * only UI there is. `?catalog=1` opens the sheet of every piece instead of
 * the show; `?solo=<piece>` shows one piece's worlds. Escape steps back
 * out: from a solo to the catalog, from the catalog to the show.
 */

const stage = document.getElementById('stage')!
const panel = document.getElementById('debug')!

let seed = randomSeed()
let debugOn = false
let solo: string | null = null
let catalogOn = false

function readUrl(): void {
  const params = new URLSearchParams(location.search)
  seed = params.get('seed') || randomSeed()
  debugOn = params.get('debug') === '1'
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
  if (debugOn) q.set('debug', '1')
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

window.addEventListener('popstate', () => {
  readUrl()
  rebuild()
})

/* ------------------------------------------------------------------ debug */

const el = (tag: string, cls = '', text = '') => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}
const button = (label: string, onClick: () => void) => {
  const b = el('button', '', label) as HTMLButtonElement
  b.addEventListener('click', onClick)
  return b
}

const seedInput = el('input') as HTMLInputElement
seedInput.type = 'text'
seedInput.value = seed
seedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') reroll(seedInput.value.trim() || randomSeed())
  e.stopPropagation()
})
const readout = el('div', 'dim')
const scrub = el('input') as HTMLInputElement
scrub.type = 'range'
scrub.min = '0'
scrub.max = '1000'
scrub.addEventListener('input', () => {
  const i = show.indexAt(now())
  const u = show.universe(i)
  setPaused(true)
  seek(show.begin(i) + (Number(scrub.value) / 1000) * u.journey)
})
const pauseBtn = button('pause', () => setPaused(!paused))
const overviewBtn = button('overview', () => {
  overview = !overview
  view.setOverview?.(overview)
  sync()
})
const catalogBtn = button('catalog', () => (catalogOn ? closeCatalog() : openCatalog()))
const speeds = [0.5, 1, 2].map((s) => button(`${s}×`, () => setSpeed(s)))

panel.append(
  row([seedInput, button('reroll', () => reroll()), button('copy', () => navigator.clipboard.writeText(location.href))]),
  readout,
  row([scrub]),
  row([pauseBtn, ...speeds, overviewBtn]),
  row([button('← world', () => seek(show.begin(Math.max(0, show.indexAt(now()) - 1)))), button('world →', () => seek(show.begin(show.indexAt(now()) + 1))), button('restart', () => seek(0)), catalogBtn]),
  el('div', 'dim', '` toggles this panel · space pauses · r rerolls · n next world · c catalog'),
)

function row(children: HTMLElement[]): HTMLElement {
  const r = el('div', 'row')
  r.append(...children)
  return r
}

function sync(): void {
  panel.classList.toggle('on', debugOn)
  pauseBtn.textContent = paused ? 'play' : 'pause'
  pauseBtn.classList.toggle('active', paused)
  overviewBtn.classList.toggle('active', overview)
  catalogBtn.textContent = catalogOn ? 'exit catalog' : 'catalog'
  catalogBtn.classList.toggle('active', catalogOn)
  speeds.forEach((b, i) => b.classList.toggle('active', [0.5, 1, 2][i] === speed))
  seedInput.value = seed
}

function tick(): void {
  if (debugOn) {
    const t = now()
    const here = show.at(t)
    const u = here.universe
    readout.textContent = catalogOn
      ? `catalog · ${u.theme.label} · ${t.toFixed(1)}s`
      : `world ${u.index} · ${u.theme.label} · ${u.taste} · ${here.placed.piece.name} · ${here.local.toFixed(1)}s / ${u.journey.toFixed(0)}s`
    scrub.value = String(Math.round((here.local / u.journey) * 1000))
  }
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (e.target instanceof HTMLInputElement) return
  switch (e.key) {
    case '`':
      debugOn = !debugOn
      writeUrl()
      sync()
      break
    case ' ':
      e.preventDefault()
      setPaused(!paused)
      break
    case 'Escape':
      back()
      break
    case 'r':
      if (debugOn) reroll()
      break
    case 'n':
      if (debugOn) seek(show.begin(show.indexAt(now()) + 1))
      break
    case 'o':
      if (debugOn) overviewBtn.click()
      break
    case 'c':
      if (debugOn) catalogBtn.click()
      break
    case 'ArrowRight':
      if (debugOn) {
        setPaused(true)
        seek(now() + (e.shiftKey ? 1 : 1 / 60))
      }
      break
    case 'ArrowLeft':
      if (debugOn) {
        setPaused(true)
        seek(now() - (e.shiftKey ? 1 : 1 / 60))
      }
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
    show: () => show,
    canvas: () => stage.querySelector('canvas') as HTMLCanvasElement,
    setOverview: (on: boolean) => {
      overview = on
      view.setOverview?.(on)
      sync()
    },
  }
}

import './ui/styles.css'
import { build, type Options } from './core/composition'
import { FPS, MIN_CANVAS } from './core/constants'
import { createEngine } from './core/engine'
import { randomSeed, readUrl, rollOptions, writeUrl } from './core/seed'
import { createPanel } from './ui/panel'
import { loadView, saveView, type ViewState } from './ui/view'

const stage = document.getElementById('stage')!
const host = document.getElementById('canvas-host')!
const panelRoot = document.getElementById('panel')!

/** Stage padding, kept in step with `#stage { padding }` in styles.css. */
const STAGE_PAD = 24

/**
 * The canvas is built at exactly the size it will be displayed, so the browser
 * never resamples it. Composition geometry is all proportional, so changing
 * this changes the resolution of the piece rather than its design.
 */
function measure(): number {
  const w = stage.clientWidth - STAGE_PAD * 2
  const h = stage.clientHeight - STAGE_PAD * 2
  return Math.max(MIN_CANVAS, Math.floor(Math.min(w, h)))
}

let options: Options = readUrl()
let view: ViewState = loadView()
let canvasSize = measure()
let comp = build(options, canvasSize)

const engine = createEngine(host, comp, canvasSize)
engine.setSpeed(view.speed)

/** Composition changes rebuild the piece and land in the URL. */
function apply(patch: Partial<Options>) {
  options = { ...options, ...patch }
  // Stroke is a draw-time multiplier on ink weight. Rebuilding would
  // re-place every machine and recarve ports/tracks for a value the next
  // frame already reads off options.
  const keys = Object.keys(patch) as (keyof Options)[]
  if (keys.length === 1 && keys[0] === 'stroke') {
    comp = { ...comp, options }
  } else {
    comp = build(options, canvasSize)
  }
  engine.setComposition(comp)
  writeUrl(options)
  panel.sync(comp, view)
}

/** View changes only touch the engine's clock and dials; the piece survives. */
function applyView(patch: Partial<ViewState>) {
  view = { ...view, ...patch }
  engine.setPaused(view.paused)
  engine.setSpeed(view.speed)
  engine.setGrid(view.grid)
  saveView(view)
  panel.sync(comp, view)
}

function step(dir: number) {
  if (!view.paused) applyView({ paused: true })
  engine.setProgress(engine.progress() + dir / comp.loop)
}

/**
 * The skip buttons jump a beat — an eighth of the loop, snapped to the beat
 * grid. A single frame out of 240 is invisible; half a second is a legible
 * hop, and snapping makes repeated taps land on the same eight stations.
 */
const BEATS = 8

function stepBeat(dir: number) {
  if (!view.paused) applyView({ paused: true })
  engine.setProgress((Math.round(engine.progress() * BEATS) + dir) / BEATS)
}

function save() {
  engine.savePng(`contraptions-${options.seed}`, view.exportScale)
}

let resizeTimer = 0
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    const next = measure()
    if (next === canvasSize) return
    canvasSize = next
    engine.resize(next)
    comp = build(options, canvasSize)
    engine.setComposition(comp)
    panel.sync(comp, view)
  }, 120)
})

const panel = createPanel(panelRoot, options, view, {
  onChange: apply,
  onView: applyView,
  onReroll: () => apply({ seed: randomSeed() }),
  onRollAll: () => apply(rollOptions(options)),
  onSave: save,
  onScrub: (u) => engine.setProgress(u),
  onStep: step,
  onBeat: stepBeat,
  onCopy: () => {
    void navigator.clipboard.writeText(location.href)
  },
  exportSize: (scale) => Math.round(canvasSize * (window.devicePixelRatio || 1) * scale),
})

panel.sync(comp, view)
writeUrl(options)

window.addEventListener('keydown', (e) => {
  // Never shadow browser chrome (cmd+S, ctrl+R, ...).
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target
  // Typing in a field or nudging a slider owns the keyboard outright; a
  // focused button keeps only its activation keys, so the rest still work.
  if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
  if (t instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter')) return
  // A focused listbox owns its keys outright (it also stops propagation on
  // the ones it handles; this is the belt to that suspender).
  if (t instanceof HTMLElement && t.closest('.lb')) return
  switch (e.key.toLowerCase()) {
    case ' ':
    case 'enter':
      e.preventDefault()
      if (e.shiftKey) apply(rollOptions(options))
      else apply({ seed: randomSeed() })
      break
    case 'p':
      applyView({ paused: !view.paused })
      break
    case 'g':
      applyView({ grid: !view.grid })
      break
    case 's':
      save()
      break
    case 'h':
      panel.toggle()
      break
    case 'arrowright':
      if (e.shiftKey) stepBeat(1)
      else step(1)
      break
    case 'arrowleft':
      if (e.shiftKey) stepBeat(-1)
      else step(-1)
      break
  }
})

// Dev handle for scripted capture: set options and read frames without
// reloading the page. Used by the montage/export scripts.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).contraptions = {
    apply,
    applyView,
    engine,
    options: () => options,
    view: () => view,
    comp: () => comp,
    canvas: () => host.querySelector('canvas') as HTMLCanvasElement,
  }
}

// The scrubber is a 0–1000 range and the clock prints tenths of a second.
// Writing both on every rAF is wasted work — especially while paused, when
// neither value can change. Skip until the displayed digit would move.
let lastScrub = -1
let lastTenth = ''
const tick = () => {
  const u = engine.progress()
  const scrub = Math.round(u * 1000)
  const tenth = (u * (comp.loop / FPS)).toFixed(1)
  if (scrub !== lastScrub || tenth !== lastTenth) {
    lastScrub = scrub
    lastTenth = tenth
    panel.setProgress(u)
  }
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

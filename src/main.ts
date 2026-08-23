import './ui/styles.css'
import { build, type Options } from './core/composition'
import { MIN_CANVAS } from './core/constants'
import { createEngine } from './core/engine'
import { randomSeed, readUrl, writeUrl } from './core/seed'
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
  comp = build(options, canvasSize)
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
  onSave: save,
  onScrub: (u) => engine.setProgress(u),
  onStep: step,
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
  switch (e.key.toLowerCase()) {
    case ' ':
    case 'enter':
      e.preventDefault()
      apply({ seed: randomSeed() })
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
      step(1)
      break
    case 'arrowleft':
      step(-1)
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
    canvas: () => host.querySelector('canvas') as HTMLCanvasElement,
  }
}

const tick = () => {
  panel.setProgress(engine.progress())
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

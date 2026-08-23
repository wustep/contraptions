import './ui/styles.css'
import { build, type Options } from './core/composition'
import { MIN_CANVAS } from './core/constants'
import { createEngine } from './core/engine'
import { randomSeed, readUrl, writeUrl } from './core/seed'
import { createPanel } from './ui/panel'

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
let canvasSize = measure()
let comp = build(options, canvasSize)

const engine = createEngine(host, comp, canvasSize)

function apply(patch: Partial<Options>) {
  options = { ...options, ...patch }
  comp = build(options, canvasSize)
  engine.setComposition(comp)
  writeUrl(options)
  panel.sync(comp, engine.paused())
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
    panel.sync(comp, engine.paused())
  }, 120)
})

const panel = createPanel(panelRoot, options, {
  onChange: apply,
  onReroll: () => apply({ seed: randomSeed() }),
  onTogglePause: () => {
    engine.setPaused(!engine.paused())
    panel.sync(comp, engine.paused())
  },
  onSave: () => engine.savePng(`contraptions-${options.seed}`, 2),
  onScrub: (u) => engine.setProgress(u),
  onCopy: () => {
    void navigator.clipboard.writeText(location.href)
  },
})

panel.sync(comp, engine.paused())
writeUrl(options)

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
  switch (e.key.toLowerCase()) {
    case ' ':
    case 'enter':
      e.preventDefault()
      apply({ seed: randomSeed() })
      break
    case 'p':
      engine.setPaused(!engine.paused())
      panel.sync(comp, engine.paused())
      break
    case 's':
      engine.savePng(`contraptions-${options.seed}`, 2)
      break
    case 'h':
      panel.toggle()
      break
    case 'arrowright':
      engine.setPaused(true)
      engine.setProgress(engine.progress() + 1 / comp.loop)
      panel.sync(comp, true)
      break
    case 'arrowleft':
      engine.setPaused(true)
      engine.setProgress(engine.progress() - 1 / comp.loop)
      panel.sync(comp, true)
      break
  }
})

// Dev handle for scripted capture: set options and read frames without
// reloading the page. Used by the montage/export scripts.
if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).contraptions = {
    apply,
    engine,
    options: () => options,
    canvas: () => host.querySelector('canvas') as HTMLCanvasElement,
  }
}

const tick = () => {
  panel.setProgress(engine.progress())
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

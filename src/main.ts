import './ui/styles.css'
import { build, type Options } from './core/composition'
import { createEngine } from './core/engine'
import { randomSeed, readUrl, writeUrl } from './core/seed'
import { createPanel } from './ui/panel'

const host = document.getElementById('canvas-host')!
const panelRoot = document.getElementById('panel')!

let options: Options = readUrl()
let comp = build(options)

const engine = createEngine(host, comp)

function apply(patch: Partial<Options>) {
  options = { ...options, ...patch }
  comp = build(options)
  engine.setComposition(comp)
  writeUrl(options)
  panel.sync(comp, engine.paused())
}

const panel = createPanel(panelRoot, options, {
  onChange: apply,
  onReroll: () => apply({ seed: randomSeed() }),
  onTogglePause: () => {
    engine.setPaused(!engine.paused())
    panel.sync(comp, engine.paused())
  },
  onSave: () => engine.savePng(`contraptions-${options.seed}`),
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
      engine.savePng(`contraptions-${options.seed}`)
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

const tick = () => {
  panel.setProgress(engine.progress())
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

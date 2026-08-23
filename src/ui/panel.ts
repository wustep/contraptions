import { registry, allTags } from '../contraptions'
import { FPS } from '../core/constants'
import { layouts } from '../core/layouts'
import { themes } from '../core/themes'
import type { Composition, Options } from '../core/composition'

export interface PanelHandlers {
  onChange(patch: Partial<Options>): void
  onReroll(): void
  onTogglePause(): void
  onSave(): void
  onScrub(u: number): void
  onCopy(): void
}

export interface Panel {
  sync(comp: Composition, paused: boolean): void
  setProgress(u: number): void
  toggle(): void
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v
    else node.setAttribute(k, v)
  }
  for (const c of children) node.append(c)
  return node
}

function field(labelText: string, control: HTMLElement, valueNode?: HTMLElement): HTMLElement {
  const label = el('label', {}, [labelText])
  if (valueNode) label.append(valueNode)
  return el('div', { class: 'field' }, [label, control])
}

function options(items: { value: string; label: string }[], selected: string): HTMLOptionElement[] {
  return items.map((i) => {
    const o = el('option', { value: i.value }, [i.label])
    if (i.value === selected) o.selected = true
    return o
  })
}

export function createPanel(root: HTMLElement, initial: Options, handlers: PanelHandlers): Panel {
  const count = el('span', {}, ['—'])
  root.append(el('div', { class: 'brand' }, [el('h1', {}, ['contraptions']), count]))

  // Seed
  const seedInput = el('input', { type: 'text', spellcheck: 'false', value: initial.seed })
  seedInput.addEventListener('change', () => handlers.onChange({ seed: seedInput.value.trim() }))
  const reroll = el('button', { class: 'primary' }, ['Reroll ⏎'])
  reroll.addEventListener('click', () => handlers.onReroll())
  const copy = el('button', {}, ['Copy link'])
  copy.addEventListener('click', () => handlers.onCopy())
  root.append(field('Seed', seedInput))
  root.append(el('div', { class: 'row' }, [reroll, copy]))

  // Theme
  const themeSelect = el('select', {}, options(themes.map((t) => ({ value: t.name, label: t.label })), initial.theme))
  const themeNote = el('p', { class: 'note' }, [''])
  themeSelect.addEventListener('change', () => handlers.onChange({ theme: themeSelect.value }))
  root.append(field('Theme', themeSelect), themeNote)

  // Layout
  const layoutSelect = el('select', {}, options(layouts.map((l) => ({ value: l.name, label: l.label })), initial.layout))
  const layoutNote = el('p', { class: 'note' }, [''])
  layoutSelect.addEventListener('change', () => handlers.onChange({ layout: layoutSelect.value }))
  root.append(field('Layout', layoutSelect), layoutNote)

  // Resolution
  const resValue = el('b', {}, [String(initial.res)])
  const res = el('input', { type: 'range', min: '4', max: '30', step: '1', value: String(initial.res) })
  res.addEventListener('input', () => {
    resValue.textContent = res.value
    handlers.onChange({ res: Number(res.value) })
  })
  root.append(field('Resolution', res, resValue))

  // Stroke
  const strokeValue = el('b', {}, [initial.stroke.toFixed(2)])
  const stroke = el('input', { type: 'range', min: '0.4', max: '2.4', step: '0.05', value: String(initial.stroke) })
  stroke.addEventListener('input', () => {
    strokeValue.textContent = Number(stroke.value).toFixed(2)
    handlers.onChange({ stroke: Number(stroke.value) })
  })
  root.append(field('Stroke', stroke, strokeValue))

  // Spans
  const spansValue = el('b', {}, [initial.spans.toFixed(2)])
  const spans = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(initial.spans) })
  spans.addEventListener('input', () => {
    spansValue.textContent = Number(spans.value).toFixed(2)
    handlers.onChange({ spans: Number(spans.value) })
  })
  root.append(field('Multi-cell', spans, spansValue))

  // Chains
  const chainsValue = el('b', {}, [initial.chains.toFixed(2)])
  const chains = el('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(initial.chains) })
  chains.addEventListener('input', () => {
    chainsValue.textContent = Number(chains.value).toFixed(2)
    handlers.onChange({ chains: Number(chains.value) })
  })
  root.append(field('Wired chains', chains, chainsValue))

  // Pool filters
  const tagSelect = el('select', {}, options(
    [{ value: '', label: 'Every tag' }, ...allTags().map((t) => ({ value: t, label: t }))],
    initial.tag ?? '',
  ))
  tagSelect.addEventListener('change', () => handlers.onChange({ tag: tagSelect.value || null, solo: null }))
  root.append(field('Tag filter', tagSelect))

  const soloSelect = el('select', {}, options(
    [
      { value: '', label: 'All contraptions' },
      ...registry.map((c) => ({ value: c.name, label: c.label ?? c.name })),
    ],
    initial.solo ?? '',
  ))
  soloSelect.addEventListener('change', () => handlers.onChange({ solo: soloSelect.value || null }))
  root.append(field('Solo', soloSelect))

  const catalog = el('button', {}, ['Catalog'])
  catalog.addEventListener('click', () => handlers.onChange({ catalog: !catalogOn }))
  root.append(el('div', { class: 'row' }, [catalog]))

  // Transport
  const scrub = el('input', { type: 'range', min: '0', max: '1000', step: '1', value: '0' })
  scrub.addEventListener('input', () => handlers.onScrub(Number(scrub.value) / 1000))
  root.append(field('Loop position', scrub))

  const pause = el('button', {}, ['Pause'])
  pause.addEventListener('click', () => handlers.onTogglePause())
  const save = el('button', {}, ['Save PNG'])
  save.addEventListener('click', () => handlers.onSave())
  root.append(el('div', { class: 'row' }, [pause, save]))

  // Readouts
  const statCells = el('b', {}, ['—'])
  const statKinds = el('b', {}, ['—'])
  const statLoop = el('b', {}, ['—'])
  const statWires = el('b', {}, ['—'])
  root.append(
    el('div', { class: 'stats' }, [
      el('span', {}, ['cells']), statCells,
      el('span', {}, ['kinds']), statKinds,
      el('span', {}, ['loop']), statLoop,
      el('span', {}, ['wires']), statWires,
    ]),
  )

  const keys: [string, string][] = [
    ['space', 'reroll seed'],
    ['P', 'pause / play'],
    ['S', 'save png'],
    ['H', 'hide panel'],
    ['← →', 'step a frame'],
  ]
  root.append(
    el('div', { class: 'keys' }, keys.flatMap(([k, v]) => [el('kbd', {}, [k]), el('span', {}, [v])])),
  )

  let catalogOn = initial.catalog
  let scrubbing = false
  scrub.addEventListener('pointerdown', () => { scrubbing = true })
  window.addEventListener('pointerup', () => { scrubbing = false })

  return {
    sync(comp, paused) {
      seedInput.value = comp.options.seed
      themeSelect.value = comp.options.theme
      layoutSelect.value = comp.options.layout
      soloSelect.value = comp.options.solo ?? ''
      tagSelect.value = comp.options.tag ?? ''
      res.value = String(comp.options.res)
      resValue.textContent = String(comp.options.res)
      stroke.value = String(comp.options.stroke)
      strokeValue.textContent = comp.options.stroke.toFixed(2)
      themeNote.textContent = themes.find((t) => t.name === comp.options.theme)?.note ?? ''
      layoutNote.textContent = layouts.find((l) => l.name === comp.options.layout)?.note ?? ''
      count.textContent = `${registry.length} kinds · ${themes.length} themes`
      statCells.textContent = String(comp.instances.length)
      statKinds.textContent = String(comp.used.length)
      statLoop.textContent = `${(comp.loop / FPS).toFixed(1)}s`
      statWires.textContent = String(comp.wires.length)
      spans.value = String(comp.options.spans)
      spansValue.textContent = comp.options.spans.toFixed(2)
      chains.value = String(comp.options.chains)
      chainsValue.textContent = comp.options.chains.toFixed(2)
      pause.textContent = paused ? 'Play' : 'Pause'
      catalogOn = comp.options.catalog
      catalog.textContent = catalogOn ? 'Back to composition' : 'Catalog'
      catalog.className = catalogOn ? 'primary' : ''
    },
    setProgress(u) {
      if (!scrubbing) scrub.value = String(Math.round(u * 1000))
    },
    toggle() {
      document.body.classList.toggle('hide-panel')
    },
  }
}

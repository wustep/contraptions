import { registry, allTags } from '../contraptions'
import { FPS } from '../core/constants'
import { layouts } from '../core/layouts'
import { themes } from '../core/themes'
import type { Composition, Options } from '../core/composition'
import { EXPORT_SCALES, SPEEDS, type ViewState } from './view'

export interface PanelHandlers {
  onChange(patch: Partial<Options>): void
  onView(patch: Partial<ViewState>): void
  onReroll(): void
  onSave(): void
  onScrub(u: number): void
  onStep(dir: number): void
  onCopy(): void
  /** Pixel edge of a PNG exported at `scale`, for the export readout. */
  exportSize(scale: number): number
}

export interface Panel {
  sync(comp: Composition, view: ViewState): void
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
  const label = el('label', {}, [el('span', {}, [labelText])])
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

function icon(paths: string[]): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    svg.append(path)
  }
  return svg
}

const ICON = {
  play: ['M8 5l11 7-11 7z'],
  pause: ['M7 5h3.4v14H7z', 'M13.6 5H17v14h-3.4z'],
  back: ['M7 5h2.2v14H7z', 'M18 5l-7.5 7L18 19z'],
  fwd: ['M14.8 5H17v14h-2.2z', 'M6 5l7.5 7L6 19z'],
}

/**
 * A one-hot row of buttons. Cheaper to reason about than a select for a dial
 * with three to five known stops, and it reads at a glance.
 */
function segmented(
  values: number[],
  format: (v: number) => string,
  onPick: (v: number) => void,
): { node: HTMLElement; set(current: number): void } {
  const node = el('div', { class: 'seg', role: 'group' })
  const buttons = values.map((v) => {
    const b = el('button', { type: 'button' }, [format(v)])
    b.addEventListener('click', () => onPick(v))
    node.append(b)
    return { v, b }
  })
  return {
    node,
    set(current) {
      for (const { v, b } of buttons) b.classList.toggle('on', v === current)
    },
  }
}

export function createPanel(
  root: HTMLElement,
  initial: Options,
  initialView: ViewState,
  handlers: PanelHandlers,
): Panel {
  let lastView = initialView
  let lastComp: Composition | null = null

  // A wheel over a slider must scroll the panel, never nudge the value —
  // browsers that edit ranges on wheel silently wreck a composition you were
  // only scrolling past. The scroll is forwarded by hand because preventing
  // the default suppresses it along with the edit.
  const guardWheel = (input: HTMLInputElement) => {
    input.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        if (root.scrollHeight > root.clientHeight) root.scrollBy({ top: e.deltaY })
        else window.scrollBy({ top: e.deltaY })
      },
      { passive: false },
    )
  }

  // Mouse clicks leave a button focused, and a focused button swallows the
  // space shortcut. Keyboard activation reports detail 0 and keeps focus.
  root.addEventListener('click', (e) => {
    if (e.detail > 0 && e.target instanceof HTMLButtonElement) e.target.blur()
  })

  const section = (title: string, cls = ''): HTMLElement => {
    const head = el('div', { class: 'section-title' }, [title])
    const node = el('section', { class: `group${cls ? ` ${cls}` : ''}` }, [head])
    root.append(node)
    return node
  }

  const slider = (
    labelText: string,
    min: number,
    max: number,
    step: number,
    value: number,
    fmt: (v: number) => string,
    apply: (v: number) => void,
  ) => {
    const readout = el('b', {}, [fmt(value)])
    const input = el('input', {
      type: 'range',
      min: String(min),
      max: String(max),
      step: String(step),
      value: String(value),
      'aria-label': labelText,
    })
    input.addEventListener('input', () => {
      readout.textContent = fmt(Number(input.value))
      apply(Number(input.value))
    })
    guardWheel(input)
    return {
      node: field(labelText, input, readout),
      set(v: number) {
        input.value = String(v)
        readout.textContent = fmt(v)
      },
    }
  }

  // Header
  const count = el('span', {}, ['—'])
  root.append(el('header', { class: 'brand' }, [el('h1', {}, ['contraptions']), count]))

  // Seed — the one control users actually play, so it gets the hero card.
  const seedInput = el('input', {
    type: 'text',
    class: 'seed',
    spellcheck: 'false',
    autocomplete: 'off',
    'aria-label': 'Seed',
    value: initial.seed,
  })
  seedInput.addEventListener('change', () => handlers.onChange({ seed: seedInput.value.trim() }))
  const reroll = el('button', { class: 'primary' }, ['Reroll', el('kbd', {}, ['space'])])
  reroll.addEventListener('click', () => handlers.onReroll())
  const copy = el('button', {}, ['Copy link'])
  copy.addEventListener('click', () => {
    handlers.onCopy()
    copy.textContent = 'Copied'
    copy.classList.add('ok')
    window.setTimeout(() => {
      copy.textContent = 'Copy link'
      copy.classList.remove('ok')
    }, 1200)
  })
  root.append(
    el('section', { class: 'seed-card' }, [
      el('div', { class: 'section-title' }, ['Seed']),
      seedInput,
      el('div', { class: 'row' }, [reroll, copy]),
    ]),
  )

  // Composition
  const composition = section('Composition')
  const themeSelect = el('select', { 'aria-label': 'Theme' }, options(themes.map((t) => ({ value: t.name, label: t.label })), initial.theme))
  const themeNote = el('p', { class: 'note' }, [''])
  themeSelect.addEventListener('change', () => handlers.onChange({ theme: themeSelect.value }))
  const layoutSelect = el('select', { 'aria-label': 'Layout' }, options(layouts.map((l) => ({ value: l.name, label: l.label })), initial.layout))
  const layoutNote = el('p', { class: 'note' }, [''])
  layoutSelect.addEventListener('change', () => handlers.onChange({ layout: layoutSelect.value }))
  const res = slider('Resolution', 4, 30, 1, initial.res, String, (v) => handlers.onChange({ res: v }))
  const stroke = slider('Stroke', 0.4, 2.4, 0.05, initial.stroke, (v) => v.toFixed(2), (v) => handlers.onChange({ stroke: v }))
  const spans = slider('Multi-cell', 0, 1, 0.05, initial.spans, (v) => v.toFixed(2), (v) => handlers.onChange({ spans: v }))
  const chains = slider('Wired chains', 0, 1, 0.05, initial.chains, (v) => v.toFixed(2), (v) => handlers.onChange({ chains: v }))
  composition.append(
    field('Theme', themeSelect), themeNote,
    field('Layout', layoutSelect), layoutNote,
    res.node, stroke.node, spans.node, chains.node,
  )

  // Explore
  const explore = section('Explore')
  const tagSelect = el('select', { 'aria-label': 'Tag filter' }, options(
    [{ value: '', label: 'Every tag' }, ...allTags().map((t) => ({ value: t, label: t }))],
    initial.tag ?? '',
  ))
  tagSelect.addEventListener('change', () => handlers.onChange({ tag: tagSelect.value || null, solo: null }))
  const soloSelect = el('select', { 'aria-label': 'Solo contraption' }, options(
    [
      { value: '', label: 'All contraptions' },
      ...registry.map((c) => ({ value: c.name, label: c.label ?? c.name })),
    ],
    initial.solo ?? '',
  ))
  soloSelect.addEventListener('change', () => handlers.onChange({ solo: soloSelect.value || null }))
  const catalog = el('button', {}, ['Catalog'])
  catalog.addEventListener('click', () => handlers.onChange({ catalog: !(lastComp?.options.catalog ?? initial.catalog) }))
  const gridBtn = el('button', {}, ['Grid'])
  gridBtn.addEventListener('click', () => handlers.onView({ grid: !lastView.grid }))
  explore.append(
    el('div', { class: 'row' }, [field('Tag', tagSelect), field('Solo', soloSelect)]),
    el('div', { class: 'row' }, [catalog, gridBtn]),
  )

  // Transport
  const transport = section('Transport', 'transport')
  const time = el('span', { class: 'time' }, ['0.0 / 4.0s'])
  transport.querySelector('.section-title')!.append(time)
  const scrub = el('input', {
    type: 'range',
    class: 'scrub',
    min: '0',
    max: '1000',
    step: '1',
    value: '0',
    'aria-label': 'Loop position',
  })
  scrub.addEventListener('input', () => {
    scrub.style.setProperty('--p', `${Number(scrub.value) / 10}%`)
    handlers.onScrub(Number(scrub.value) / 1000)
  })
  guardWheel(scrub)
  const back = el('button', { class: 'tbtn', title: 'Step back one frame (←)', 'aria-label': 'Step back one frame' }, [icon(ICON.back)])
  back.addEventListener('click', () => handlers.onStep(-1))
  const play = el('button', { class: 'tbtn play', title: 'Play / pause (P)', 'aria-label': 'Play or pause' }, [icon(ICON.pause)])
  play.addEventListener('click', () => handlers.onView({ paused: !lastView.paused }))
  const fwd = el('button', { class: 'tbtn', title: 'Step forward one frame (→)', 'aria-label': 'Step forward one frame' }, [icon(ICON.fwd)])
  fwd.addEventListener('click', () => handlers.onStep(1))
  const speedSeg = segmented(SPEEDS, (v) => (v === 0.25 ? '¼' : v === 0.5 ? '½' : `${v}×`), (v) => handlers.onView({ speed: v }))
  transport.append(
    scrub,
    el('div', { class: 'deck' }, [back, play, fwd]),
    field('Speed', speedSeg.node),
  )

  // Export
  const exportSec = section('Export')
  const dims = el('span', { class: 'dims' }, ['—'])
  exportSec.querySelector('.section-title')!.append(dims)
  const scaleSeg = segmented(EXPORT_SCALES, (v) => `${v}×`, (v) => handlers.onView({ exportScale: v }))
  const save = el('button', {}, ['Save PNG', el('kbd', {}, ['S'])])
  save.addEventListener('click', () => handlers.onSave())
  exportSec.append(scaleSeg.node, save)

  // Readouts
  const stat = (label: string) => {
    const value = el('b', {}, ['—'])
    return { value, node: el('div', { class: 'stat' }, [value, el('span', {}, [label])]) }
  }
  const statCells = stat('cells')
  const statKinds = stat('kinds')
  const statWires = stat('wires')
  const statLoop = stat('loop')
  root.append(el('div', { class: 'stats' }, [statCells.node, statKinds.node, statWires.node, statLoop.node]))

  const keys: [string, string][] = [
    ['space', 'reroll seed'],
    ['P', 'pause / play'],
    ['← →', 'step a frame'],
    ['G', 'grid overlay'],
    ['S', 'save png'],
    ['H', 'hide panel'],
  ]
  root.append(
    el('details', { class: 'keys' }, [
      el('summary', {}, ['Shortcuts']),
      el('div', { class: 'keys-grid' }, keys.flatMap(([k, v]) => [el('kbd', {}, [k]), el('span', {}, [v])])),
    ]),
  )

  let scrubbing = false
  scrub.addEventListener('pointerdown', () => { scrubbing = true })
  window.addEventListener('pointerup', () => { scrubbing = false })

  const playIcon = icon(ICON.play)
  const pauseIcon = icon(ICON.pause)

  return {
    sync(comp, view) {
      lastComp = comp
      lastView = view
      seedInput.value = comp.options.seed
      themeSelect.value = comp.options.theme
      layoutSelect.value = comp.options.layout
      soloSelect.value = comp.options.solo ?? ''
      tagSelect.value = comp.options.tag ?? ''
      res.set(comp.options.res)
      stroke.set(comp.options.stroke)
      spans.set(comp.options.spans)
      chains.set(comp.options.chains)
      themeNote.textContent = themes.find((t) => t.name === comp.options.theme)?.note ?? ''
      layoutNote.textContent = layouts.find((l) => l.name === comp.options.layout)?.note ?? ''
      count.textContent = `${registry.length} kinds · ${themes.length} themes`
      statCells.value.textContent = String(comp.instances.length)
      statKinds.value.textContent = String(comp.used.length)
      statLoop.value.textContent = `${(comp.loop / FPS).toFixed(0)}s`
      statWires.value.textContent = String(comp.wires.length)
      catalog.textContent = comp.options.catalog ? 'Exit catalog' : 'Catalog'
      catalog.classList.toggle('on', comp.options.catalog)
      gridBtn.classList.toggle('on', view.grid)
      play.replaceChildren(view.paused ? playIcon : pauseIcon)
      play.classList.toggle('paused', view.paused)
      speedSeg.set(view.speed)
      scaleSeg.set(view.exportScale)
      const edge = handlers.exportSize(view.exportScale)
      dims.textContent = `${edge} × ${edge}px`
    },
    setProgress(u) {
      if (!scrubbing) {
        scrub.value = String(Math.round(u * 1000))
        scrub.style.setProperty('--p', `${u * 100}%`)
      }
      if (lastComp) {
        const total = lastComp.loop / FPS
        time.textContent = `${(u * total).toFixed(1)} / ${total.toFixed(1)}s`
      }
    },
    toggle() {
      document.body.classList.toggle('hide-panel')
    },
  }
}

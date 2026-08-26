import { registry, allTags } from '../contraptions'
import { FPS } from '../core/constants'
import { layouts } from '../core/layouts'
import { themes } from '../core/themes'
import { MODES, type Composition, type Mode, type Options } from '../core/composition'
import { createListbox } from './listbox'
import { EXPORT_SCALES, SPEEDS, type ViewState } from './view'

export interface PanelHandlers {
  onChange(patch: Partial<Options>): void
  onView(patch: Partial<ViewState>): void
  onReroll(): void
  /** Roll the whole configuration — theme, layout, dials, and the seed. */
  onRollAll(): void
  onSave(): void
  onScrub(u: number): void
  /** Nudge the clock a single frame. */
  onStep(dir: number): void
  /** Jump a beat — an eighth of the loop, snapped to the beat grid. */
  onBeat(dir: number): void
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

/** Mini diagrams for the layout picker, one rect list per layout name. */
const LAYOUT_GLYPHS: Record<string, [number, number, number, number][]> = {
  grid: [[3, 3, 8, 8], [13, 3, 8, 8], [3, 13, 8, 8], [13, 13, 8, 8]],
  bricks: [[3, 3, 10, 5], [15, 3, 6, 5], [3, 10, 5, 5], [10, 10, 11, 5], [3, 17, 10, 4], [15, 17, 6, 4]],
  quads: [[3, 3, 18, 18], [12, 3, 9, 9], [16.5, 3, 4.5, 4.5]],
  bands: [[3, 3, 4, 18], [9, 3, 8, 18], [19, 3, 2, 18]],
}

function layoutGlyph(name: string): SVGSVGElement | undefined {
  const rects = LAYOUT_GLYPHS[name]
  if (!rects) return undefined
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add('lb-glyph')
  for (const [x, y, w, h] of rects) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    r.setAttribute('x', String(x))
    r.setAttribute('y', String(y))
    r.setAttribute('width', String(w))
    r.setAttribute('height', String(h))
    svg.append(r)
  }
  return svg
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
    hint = '',
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
    const node = field(labelText, input, readout)
    if (hint) node.title = hint
    return {
      node,
      set(v: number) {
        input.value = String(v)
        readout.textContent = fmt(v)
      },
    }
  }

  // Header
  root.append(el('header', { class: 'brand' }, [el('h1', {}, ['contraptions'])]))

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
  const rollAll = el('button', { title: 'Roll theme, layout and every dial along with the seed (shift+space)' }, ['Roll all', el('kbd', {}, ['⇧'])])
  rollAll.addEventListener('click', () => handlers.onRollAll())
  const copy = el('button', { title: 'Copy a link to this exact composition' }, ['Copy'])
  copy.addEventListener('click', () => {
    handlers.onCopy()
    copy.textContent = 'Copied'
    copy.classList.add('ok')
    window.setTimeout(() => {
      copy.textContent = 'Copy'
      copy.classList.remove('ok')
    }, 1200)
  })
  root.append(
    el('section', { class: 'seed-card' }, [
      el('div', { class: 'section-title' }, ['Seed']),
      seedInput,
      // One row: the three things you do to a seed, in the order you do them.
      el('div', { class: 'row seed-actions' }, [reroll, rollAll, copy]),
    ]),
  )

  // Composition
  const composition = section('Composition')
  const modeBox = createListbox({
    items: MODES.map((m) => ({ value: m.name, label: m.label })),
    value: initial.mode,
    label: 'Mode',
    onChange: (v) => handlers.onChange({ mode: v as Mode }),
  })
  const themeBox = createListbox({
    items: themes.map((t) => ({
      value: t.name,
      label: t.label,
      swatches: { colors: t.colors, bg: t.bg, ink: t.ink },
    })),
    value: initial.theme,
    label: 'Theme',
    onChange: (v) => handlers.onChange({ theme: v }),
  })
  const layoutBox = createListbox({
    items: layouts.map((l) => ({ value: l.name, label: l.label, glyph: layoutGlyph(l.name) })),
    value: initial.layout,
    label: 'Layout',
    onChange: (v) => handlers.onChange({ layout: v }),
  })
  const res = slider('Resolution', 4, 30, 1, initial.res, String, (v) => handlers.onChange({ res: v }),
    'Cells across the piece')
  const stroke = slider('Stroke', 0.4, 2.4, 0.05, initial.stroke, (v) => v.toFixed(2), (v) => handlers.onChange({ stroke: v }),
    'Multiplier on the ink weight')
  const spans = slider('Multi-cell', 0, 1, 0.05, initial.spans, (v) => v.toFixed(2), (v) => handlers.onChange({ spans: v }),
    'How eagerly machines larger than one cell are placed')
  const chains = slider('Wired chains', 0, 1, 0.05, initial.chains, (v) => v.toFixed(2), (v) => handlers.onChange({ chains: v }),
    'How much of the grid is wired into runs that fire in sequence')
  const layoutField = field('Layout', layoutBox.node)
  composition.append(
    field('Mode', modeBox.node),
    field('Theme', themeBox.node),
    layoutField,
    res.node, stroke.node, spans.node, chains.node,
  )

  // Explore
  const explore = section('Explore')
  const tagBox = createListbox({
    items: [{ value: '', label: 'Every tag' }, ...allTags().map((t) => ({ value: t, label: t }))],
    value: initial.tag ?? '',
    label: 'Tag filter',
    onChange: (v) => handlers.onChange({ tag: v || null, solo: null }),
  })
  const soloBox = createListbox({
    items: [
      { value: '', label: 'All contraptions' },
      ...registry.map((c) => ({ value: c.name, label: c.label ?? c.name })),
    ],
    value: initial.solo ?? '',
    label: 'Solo contraption',
    onChange: (v) => handlers.onChange({ solo: v || null }),
  })
  const catalog = el('button', {}, ['Catalog'])
  catalog.addEventListener('click', () => handlers.onChange({ catalog: !(lastComp?.options.catalog ?? initial.catalog) }))
  const gridBtn = el('button', {}, ['Grid'])
  gridBtn.addEventListener('click', () => handlers.onView({ grid: !lastView.grid }))
  const poolRow = el('div', { class: 'row' }, [field('Tag', tagBox.node), field('Solo', soloBox.node)])
  explore.append(poolRow, el('div', { class: 'row' }, [catalog, gridBtn]))

  /**
   * The worlds build on a plain grid, place no multi-cell machines from the
   * classic set, and have their own machine lists — so the controls for those
   * things are hidden rather than left to do nothing. Ports keeps the chains
   * dial, which sets how many chains it grows.
   */
  const showFor = (mode: Mode) => {
    const classic = mode === 'classic'
    layoutField.hidden = !classic
    spans.node.hidden = !classic
    chains.node.hidden = mode === 'tracks'
    poolRow.hidden = !classic
  }

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
  const back = el('button', { class: 'tbtn', title: 'Back a beat — 1/8 loop (shift+←)', 'aria-label': 'Back one beat' }, [icon(ICON.back)])
  back.addEventListener('click', () => handlers.onBeat(-1))
  const play = el('button', { class: 'tbtn play', title: 'Play / pause (P)', 'aria-label': 'Play or pause' }, [icon(ICON.pause)])
  play.addEventListener('click', () => handlers.onView({ paused: !lastView.paused }))
  const fwd = el('button', { class: 'tbtn', title: 'Forward a beat — 1/8 loop (shift+→)', 'aria-label': 'Forward one beat' }, [icon(ICON.fwd)])
  fwd.addEventListener('click', () => handlers.onBeat(1))
  const speedSeg = segmented(SPEEDS, (v) => (v === 0.25 ? '¼' : v === 0.5 ? '½' : `${v}×`), (v) => handlers.onView({ speed: v }))
  transport.append(
    scrub,
    el('div', { class: 'deck' }, [back, play, fwd]),
    speedSeg.node,
  )

  // Export
  const exportSec = section('Export')
  const dims = el('span', { class: 'dims' }, ['—'])
  exportSec.querySelector('.section-title')!.append(dims)
  const scaleSeg = segmented(EXPORT_SCALES, (v) => `${v}×`, (v) => handlers.onView({ exportScale: v }))
  const save = el('button', {}, ['Save PNG', el('kbd', {}, ['S'])])
  save.addEventListener('click', () => handlers.onSave())
  exportSec.append(el('div', { class: 'row export-row' }, [scaleSeg.node, save]))


  const credit = el('a', {
    class: 'credit',
    href: 'https://x.com/okazz_/status/2090999902805393607',
    target: '_blank',
    rel: 'noreferrer',
  }, ['Heavily inspired by Okazz'])
  root.append(credit)

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
      modeBox.set(comp.options.mode)
      showFor(comp.options.mode)
      themeBox.set(comp.options.theme)
      layoutBox.set(comp.options.layout)
      soloBox.set(comp.options.solo ?? '')
      tagBox.set(comp.options.tag ?? '')
      res.set(comp.options.res)
      stroke.set(comp.options.stroke)
      spans.set(comp.options.spans)
      chains.set(comp.options.chains)
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

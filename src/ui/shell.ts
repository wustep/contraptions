/**
 * The chrome the two modes share. One panel down the right edge, the full
 * height of the window, with the brand and the mode switch at its head and
 * the credit at its foot; the stage takes whatever the panel leaves. The show
 * and the sandbox fill the middle with their own sections, built from the
 * same helpers, so the two read as siblings — one frame, different dials —
 * and moving between them is a switch at the top of the panel that carries
 * the seed across. `H` hides the panel; the peek tab on the edge brings it
 * back.
 */

export type ShellMode = 'show' | 'sandbox'

interface ModeLink {
  mode: ShellMode
  label: string
  path: string
  note: string
}

const MODE_LINKS: ModeLink[] = [
  { mode: 'show', label: 'The show', path: '/', note: 'one ball, one thread, a new map behind every portal' },
  { mode: 'sandbox', label: 'Sandbox', path: '/sandbox/', note: 'seven modes of tiny machines on a grid, every dial exposed' },
]

export interface Shell {
  /** Refresh the mode links so a switch carries the current seed along. */
  setSeed(seed: string): void
  /** Hide the panel, or bring it back. */
  toggle(): void
  hidden(): boolean
}

export function el<K extends keyof HTMLElementTagNameMap>(
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

export function field(labelText: string, control: HTMLElement, valueNode?: HTMLElement): HTMLElement {
  const label = el('label', {}, [el('span', {}, [labelText])])
  if (valueNode) label.append(valueNode)
  return el('div', { class: 'field' }, [label, control])
}

export function icon(paths: string[]): SVGSVGElement {
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

export const ICON = {
  play: ['M8 5l11 7-11 7z'],
  pause: ['M7 5h3.4v14H7z', 'M13.6 5H17v14h-3.4z'],
}

/** A titled section appended to the panel. The title row takes readouts on its right. */
export function section(root: HTMLElement, title: string, cls = ''): HTMLElement {
  const head = el('div', { class: 'section-title' }, [title])
  const node = el('section', { class: `group${cls ? ` ${cls}` : ''}` }, [head])
  root.append(node)
  return node
}

/**
 * A one-hot row of buttons. Cheaper to reason about than a select for a dial
 * with three to five known stops, and it reads at a glance.
 */
export function segmented(
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

/**
 * A wheel over a slider must scroll the panel, never nudge the value —
 * browsers that edit ranges on wheel silently wreck a piece you were only
 * scrolling past. The scroll is forwarded by hand because preventing the
 * default suppresses it along with the edit.
 */
export function guardWheel(root: HTMLElement, input: HTMLInputElement): void {
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

/** A Copy button that says so for a moment once the link is on the clipboard. */
export function copyButton(onCopy: () => void | Promise<void>, title = 'Copy a link to this exact piece'): HTMLButtonElement {
  const copy = el('button', { type: 'button', title }, ['Copy'])
  copy.addEventListener('click', () => {
    void Promise.resolve(onCopy())
      .then(() => {
        copy.textContent = 'Copied'
        copy.classList.add('ok')
        window.setTimeout(() => {
          copy.textContent = 'Copy'
          copy.classList.remove('ok')
        }, 1200)
      })
      .catch(() => {})
  })
  return copy
}

/** The seed card: the one control both modes lead with, so it sits first and raised. */
export function seedCard(root: HTMLElement, input: HTMLInputElement, actions: HTMLElement[]): void {
  root.append(
    el('section', { class: 'seed-card' }, [
      el('div', { class: 'section-title' }, ['Seed']),
      input,
      // One row: the things you do to a seed, in the order you do them.
      el('div', { class: 'row seed-actions' }, actions),
    ]),
  )
}

/** Credit sits at the foot of the tool: present, never competing. */
export function credit(root: HTMLElement): void {
  root.append(
    el('a', {
      class: 'credit',
      href: 'https://x.com/okazz_/status/2090999902805393607',
      target: '_blank',
      rel: 'noreferrer',
    }, ['Heavily inspired by Okazz']),
  )
}

export function createShell(root: HTMLElement, mode: ShellMode): Shell {
  // Mouse clicks leave a button focused, and a focused button swallows the
  // space shortcut. Keyboard activation reports detail 0 and keeps focus.
  root.addEventListener('click', (e) => {
    if (e.detail > 0 && e.target instanceof HTMLButtonElement) e.target.blur()
  })

  // Header — Hide lives here so H is not a one-way trap. Peek stays a target
  // after `#panel { display: none }`.
  const hideBtn = el('button', {
    type: 'button',
    class: 'chip',
    title: 'Hide the panel (H)',
    'aria-label': 'Hide panel',
  }, ['Hide', el('kbd', {}, ['H'])])

  // The mode switch: two tabs, the one you are on lit. Real links, so a
  // switch is a navigation and the back button undoes it.
  const links = MODE_LINKS.map((m) => {
    const a = el('a', { href: m.path, class: `mode-tab${m.mode === mode ? ' on' : ''}` }, [m.label])
    if (m.mode === mode) {
      a.setAttribute('aria-current', 'page')
      // The tab you are on is a label, not a reload.
      a.addEventListener('click', (e) => e.preventDefault())
    }
    return { m, a }
  })
  const current = MODE_LINKS.find((m) => m.mode === mode) ?? MODE_LINKS[0]
  root.append(
    el('header', { class: 'brand' }, [
      el('div', { class: 'brand-row' }, [el('h1', {}, ['contraptions']), hideBtn]),
      el('nav', { class: 'seg mode-switch', 'aria-label': 'Mode' }, links.map((l) => l.a)),
      el('p', { class: 'mode-note' }, [current.note]),
    ]),
  )

  const peek = el('button', {
    type: 'button',
    class: 'panel-peek',
    title: 'Show the panel (H)',
    'aria-label': 'Show panel',
  }, ['Panel', el('kbd', {}, ['H'])])
  document.body.append(peek)

  const toggle = () => {
    const hide = !document.body.classList.contains('hide-panel')
    document.body.classList.toggle('hide-panel', hide)
    if (hide) peek.focus()
    else hideBtn.focus()
  }
  hideBtn.addEventListener('click', toggle)
  peek.addEventListener('click', toggle)

  return {
    setSeed(seed) {
      for (const { m, a } of links) {
        a.href = seed ? `${m.path}?seed=${encodeURIComponent(seed)}` : m.path
      }
    },
    toggle,
    hidden: () => document.body.classList.contains('hide-panel'),
  }
}

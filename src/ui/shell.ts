/**
 * The chrome the modes share. One panel down the right edge, the full
 * height of the window, with the brand and the mode switch at its head and
 * a byline at its foot (Explorations keeps the Okazz credit just above it);
 * the stage takes whatever the panel leaves. Machine
 * (the show, in the code), Explorations (the sandbox), Shows (Machine set
 * to music), the Builder and the Playground (where pieces and worlds wait
 * to be let into Machine) fill the middle with their own sections, built
 * from the same helpers, so they read as siblings — one frame, different
 * dials — and moving between them is a switch at the top of the panel. A
 * switch starts the mode afresh: it does not carry a seed across. On those four, a tab click stays in this
 * document: the address changes and the stage is swapped, and the brand,
 * the switch and the panel's open or closed state are not built again.
 * The links stay real addresses, so a deep link, a modified click and the
 * back button land where they always did. The Builder is still its own
 * page. Machine, Explorations, Shows and the Playground
 * start with the panel hidden, since there the piece leads; the Builder is
 * worked from its panel and starts with it out. Once the panel has been opened or closed,
 * that choice is kept for the session, so a switch of mode does not slam
 * it.
 *
 * The panel has one handle, on its own edge: a tab that rides with the panel as it slides, and points the way a
 * press will send it. It is the only control for bringing the panel out and putting it away (`P` does the same), so
 * the thing pressed to open is the thing pressed to close, and it is where the eye already is. The panel does not
 * cut in: the stage gives up its room as the panel comes, on one damped curve, so the picture is never yanked.
 * At a desk the closed handle keeps off the piece: it greets a page just opened, tucks into the edge, and comes out
 * when the pointer nears it.
 * The backtick clears the stage of all of it — the panel, its handle,
 * anything else standing on the stage — for the piece alone, and the
 * backtick again puts back exactly what was there. The switch is four
 * icon-only buttons beside the brand, each named on hover. The Builder is off it for now.
 * Theater (every show, shuffled, one after another) is a fifth that is not
 * on the switch until it has been visited: once `/theater/` has been open
 * in this session, it sits at the end of the switch in every mode.
 */

import { createListbox } from './listbox'
import { SPEEDS, speedLabel } from './view'

export type ShellMode = 'machine' | 'explorations' | 'shows' | 'builder' | 'playground' | 'theater'

interface ModeLink {
  mode: ShellMode
  label: string
  path: string
}

export const MODE_LINKS: readonly ModeLink[] = [
  { mode: 'explorations', label: 'Explorations', path: '/explorations/' },
  { mode: 'machine', label: 'Machine', path: '/machine/' },
  // TODO: Builder is rough — re-enable when ready
  // { mode: 'builder', label: 'Builder', path: '/builder/' },
  { mode: 'playground', label: 'Playground', path: '/playground/' },
  { mode: 'shows', label: 'Shows', path: '/shows/' },
]

/** Tabs that are only on the switch once they have been visited this session: found by their address, not by looking. */
export const HIDDEN_LINKS: readonly ModeLink[] = [
  { mode: 'theater', label: 'Theater', path: '/theater/' },
]

/** The switch: the four, and after them each hidden tab that has been visited. */
export function switchLinks(visited: ReadonlySet<ShellMode>): ModeLink[] {
  return [...MODE_LINKS, ...HIDDEN_LINKS.filter((m) => visited.has(m.mode))]
}

/** Which hidden tabs this session has visited. */
const VISITED_STORE = 'contraptions:visited'

function visitedModes(): Set<ShellMode> {
  try {
    const v = sessionStorage.getItem(VISITED_STORE)
    return new Set(v ? (v.split(',') as ShellMode[]) : [])
  } catch {
    return new Set()
  }
}

function rememberVisit(visited: Set<ShellMode>, mode: ShellMode): void {
  if (!HIDDEN_LINKS.some((m) => m.mode === mode) || visited.has(mode)) return
  visited.add(mode)
  try {
    sessionStorage.setItem(VISITED_STORE, [...visited].join(','))
  } catch {
    // Best effort: this page still shows the tab, since it is on it.
  }
}

export interface Shell {
  /** Light the tab for `mode`. The chrome stays; only the mark moves. */
  setMode(mode: ShellMode): void
  /** The panel's scrolling column, inside the frame that slides and carries the handle. */
  root: HTMLElement
  /** Where a mode puts its sections. A switch clears this and leaves the brand and the byline. */
  body: HTMLElement
  /** Hide the panel, or bring it back. */
  toggle(): void
  hidden(): boolean
  /**
   * Put the panel out or away for the mode's own reasons (Shows on a phone: away while a show plays), without
   * taking the keyboard and without writing it into the session's choice.
   */
  setPanel(open: boolean): void
  /** Keep the panel's handle standing on the edge rather than tucked in (Shows at a desk, while a show is paused). */
  holdHandle(on: boolean): void
  /** Clear the stage of every piece of chrome, or put it all back as it was. */
  toggleBare(): void
}

/**
 * When set, a plain click on a mode tab stays on this document. The host
 * swaps the mode and the address; the chrome is not built again. A modified
 * click still opens the link. Unset, on the Builder, a click is a new page.
 */
let clientGo: ((mode: ShellMode, href: string) => void) | null = null

export function clientNavigation(go: (mode: ShellMode, href: string) => void): void {
  clientGo = go
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
  // Filled silhouettes at 14px: a gear, a varied grid, paired notes, a hammer, and a ball on a seesaw.
  machine: ['M9.5 2h5l.5 3 2 .9 2.6-1.5 2.5 4.3-2.4 1.8v2.3l2.4 1.8-2.5 4.3-2.6-1.5-2 .9-.5 3h-5l-.5-3-2-.9-2.6 1.5-2.5-4.3 2.4-1.8v-2.3L1.9 8.7l2.5-4.3L7 5.9l2-.9z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'],
  explorations: ['M3 3h7v7H3z', 'M17.5 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z', 'M6.5 13 11 21H2z', 'M17.5 12.5 22 17l-4.5 4.5L13 17z'],
  shows: ['M9 4.5 21 2v14.5a3.5 2.8 0 1 1-2.5-2.7V7L11.5 8.5v10a3.5 2.8 0 1 1-2.5-2.7z'],
  builder: ['M3 3h11l6 5-3 3-4-3H3z', 'M7 10h4v11H7z'],
  playground: ['M6.5 3a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z', 'M1.6 12.4 2.4 10l20 6.6-.8 2.4z', 'M12 15.5 17 22H7z'],
  // A proscenium: the valance, and a curtain drawn back to either side.
  theater: ['M2 3h20v3.5H2z', 'M3 7.5h5.5c-.3 5.5-2.2 10.5-5.5 13.5z', 'M21 7.5h-5.5c.3 5.5 2.2 10.5 5.5 13.5z'],
  next: ['M5 5l9 7-9 7z', 'M15.5 5H19v14h-3.5z'],
  // Four corners going out to the edges, and the same four drawn back in.
  fullscreen: ['M3 3h7v3H6v4H3z', 'M14 3h7v7h-3V6h-4z', 'M3 14h3v4h4v3H3z', 'M18 14h3v7h-7v-3h4z'],
  windowed: ['M7 3h3v7H3V7h4z', 'M14 3h3v4h4v3h-7z', 'M3 14h7v7H7v-4H3z', 'M14 14h7v3h-4v4h-3z'],
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
 * The transport's speed, as a dropdown beside Play. Six stops are too many
 * for a segmented row to read at a glance, and every mode shares them.
 */
export function speedPicker(onPick: (v: number) => void): {
  node: HTMLElement
  set(current: number): void
  setDisabled(off: boolean): void
} {
  const box = createListbox({
    items: SPEEDS.map((v) => ({ value: String(v), label: speedLabel(v) })),
    value: '1',
    label: 'Speed',
    onChange: (v) => onPick(Number(v)),
  })
  box.node.classList.add('speed')
  const trigger = box.node.querySelector<HTMLElement>('.lb-trigger')!
  trigger.title = 'Playback speed'
  return {
    node: box.node,
    set: (current) => box.set(String(current)),
    setDisabled(off) {
      box.node.classList.toggle('disabled', off)
      trigger.tabIndex = off ? -1 : 0
      trigger.setAttribute('aria-disabled', String(off))
      if (off && document.activeElement === trigger) trigger.blur()
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

/** Credit sits at the foot of Explorations, whose grids are the ones it is owed for: present, never competing. Machine and the Builder do not carry it. It stays above the byline. */
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

/**
 * A quiet byline at the foot of every panel, with the source beside it. It
 * sits after the slot a mode fills, so it stays last when that slot is
 * cleared and filled again. External, so it leaves the page the way the
 * Okazz credit does.
 */
function byline(root: HTMLElement): void {
  root.append(el('footer', { class: 'byline' }, [
    'Built by ',
    el('a', {
      href: 'https://wustep.me',
      target: '_blank',
      rel: 'noreferrer',
    }, ['Stephen Wu']),
    ' · ',
    el('a', {
      href: 'https://github.com/wustep/contraptions',
      target: '_blank',
      rel: 'noreferrer',
    }, ['GitHub']),
  ]))
}

/**
 * Where the closed panel's handle tucks away: a window wide enough for the
 * panel to sit beside the stage (the stylesheet stacks it at 820px), worked
 * with a pointer that can hover.
 */
const HANDLE_TUCKS = '(min-width: 821px) and (hover: hover) and (pointer: fine)'
/** How near the panel's edge the pointer comes, in px, before the handle comes out to meet it. */
const HANDLE_REACH = 128
/** How long the handle stands on the edge of a page just opened before it tucks away, in ms. */
const HANDLE_GREETING_MS = 3200

/** The panel's slide, in ms: the stylesheet's `--glide`, which is the one place it is set. */
function glideMs(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--glide')) || 0
}
/** Open or closed, kept for the session so a mode switch does not slam the panel. */
const PANEL_STORE = 'contraptions:panel'

function panelPref(): boolean | null {
  try {
    const v = sessionStorage.getItem(PANEL_STORE)
    if (v === '1') return true
    if (v === '0') return false
  } catch {
    // Private mode, or a host without sessionStorage.
  }
  return null
}

function rememberPanel(open: boolean): void {
  try {
    sessionStorage.setItem(PANEL_STORE, open ? '1' : '0')
  } catch {
    // Best effort: a missing store still leaves this page as the user set it.
  }
}

export function createShell(root: HTMLElement, mode: ShellMode): Shell {
  // Mouse clicks leave a button focused, and a focused button swallows the
  // space shortcut. Keyboard activation reports detail 0 and keeps focus.
  // The click may land on a key cap or an icon inside the button.
  root.addEventListener('click', (e) => {
    if (e.detail > 0 && e.target instanceof Element) e.target.closest('button')?.blur()
  })
  // A finger focusing a control scrolls the visual viewport to it — on a
  // phone that pans the whole frame, so the panel appears to jump. Mouse
  // already blurs on click; keep that path. Keyboard still tabs in. The
  // handle is inside the frame, so this covers it too.
  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return
    if (!(e.target instanceof Element)) return
    if (e.target.closest('button, a.mode-tab, .lb-trigger')) e.preventDefault()
  })

  // The mode switch: a tab a mode, the one you are on lit. Real links, so
  // the address is the mode and the back button undoes a switch. On the four
  // tabs a plain click is handled here and the page does not reload; a
  // modified click still navigates. Four marks, each named on hover and for
  // a screen reader. Native title waits a beat and is easy to miss on a 32px
  // icon; the name is a small label we place ourselves (`mode-tip`).
  const tip = el('div', { class: 'mode-tip', hidden: '' })
  document.body.append(tip)
  let slidAt = 0
  const hideTip = () => {
    tip.hidden = true
  }
  // A tab slid under a pointer that did not move has not been pointed at: no name for it while the panel moves.
  const showTip = (a: HTMLAnchorElement, label: string, e?: Event) => {
    if (e?.type === 'pointerenter' && performance.now() - slidAt < glideMs()) return
    tip.textContent = label
    tip.hidden = false
    const r = a.getBoundingClientRect()
    tip.style.left = `${r.left + r.width / 2}px`
    const below = r.bottom + 6
    if (below + 28 < window.innerHeight) {
      tip.style.top = `${below}px`
      tip.style.transform = 'translateX(-50%)'
    } else {
      tip.style.top = `${r.top - 6}px`
      tip.style.transform = 'translate(-50%, -100%)'
    }
  }
  const dress = (a: HTMLAnchorElement, m: ModeLink) => {
    a.classList.add('icon')
    a.replaceChildren(icon(ICON[m.mode]))
    a.setAttribute('aria-label', m.label)
    a.removeAttribute('title')
    hideTip()
  }
  let currentMode = mode
  const visited = visitedModes()
  rememberVisit(visited, mode)
  const makeLink = (m: ModeLink) => {
    const a = el('a', { href: m.path, class: `mode-tab${m.mode === mode ? ' on' : ''}` })
    dress(a, m)
    a.addEventListener('pointerenter', (e) => showTip(a, m.label, e))
    a.addEventListener('pointerleave', hideTip)
    a.addEventListener('focus', () => showTip(a, m.label))
    a.addEventListener('blur', hideTip)
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      // Remember before the page changes, so a real navigation opens as this one stood.
      rememberPanel(!document.body.classList.contains('hide-panel'))
      // The tab you are on is a label, not a reload.
      if (m.mode === currentMode) {
        e.preventDefault()
        return
      }
      if (!clientGo) return
      e.preventDefault()
      hideTip()
      clientGo(m.mode, a.href)
    })
    if (m.mode === mode) a.setAttribute('aria-current', 'page')
    return { m, a }
  }
  const links = switchLinks(visited).map(makeLink)
  const setMode = (next: ShellMode) => {
    currentMode = next
    // A hidden tab arrived at by the back button, having been visited in this document: it joins the switch.
    rememberVisit(visited, next)
    for (const m of switchLinks(visited)) {
      if (links.some((l) => l.m === m)) continue
      const link = makeLink(m)
      links.push(link)
      switcher.append(link.a)
    }
    for (const { m, a } of links) {
      const on = m.mode === next
      a.classList.toggle('on', on)
      if (on) a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    }
  }
  const switcher = el('nav', { class: 'seg mode-switch icons', 'aria-label': 'Mode' }, links.map((l) => l.a))

  // The handle: the panel's one way in and out, on the panel's own edge so it travels with it. Its chevron points
  // where a press will send the panel. First in the frame, so Tab goes from it into the panel it opened.
  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  chevron.setAttribute('viewBox', '0 0 24 24')
  chevron.setAttribute('aria-hidden', 'true')
  const chev = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  chev.setAttribute('d', 'M14.5 5.5 8 12l6.5 6.5')
  chevron.append(chev)
  const handle = el('button', { type: 'button', class: 'panel-handle', 'aria-label': 'Panel' }, [chevron])
  if (root.id) handle.setAttribute('aria-controls', root.id)

  // The frame slides; the column inside it scrolls. The brand and the switch share the head: one line of chrome.
  const scroll = el('div', { class: 'panel-scroll' })
  const body = el('div', { class: 'panel-body' })
  scroll.append(el('header', { class: 'brand' }, [el('h1', {}, ['contraptions']), switcher]), body)
  byline(scroll)
  root.append(handle, scroll)

  const isOpen = () => !document.body.classList.contains('hide-panel')
  const syncHandle = () => {
    slidAt = performance.now()
    const open = isOpen()
    handle.setAttribute('aria-expanded', String(open))
    handle.title = open ? 'Put the panel away (P)' : 'Bring out the panel (P)'
  }

  // At a desk the closed panel's handle keeps off the piece: it comes out when
  // the pointer nears the edge and tucks back in when the pointer goes. Only
  // where there is a pointer to near it with — a touch screen, or the stacked
  // layout, keeps it out. The class says which; the stylesheet does the rest.
  const desk = window.matchMedia(HANDLE_TUCKS)
  // Tracked with the panel out as well, measured from wherever the panel's
  // edge is, so a panel closed from under the pointer leaves its handle there
  // to be met until the pointer moves off.
  let near = false
  const setNear = (on: boolean) => {
    if (on === near) return
    near = on
    document.body.classList.toggle('handle-near', on)
  }
  const syncDesk = () => {
    document.body.classList.toggle('handle-tucks', desk.matches)
    // Reach is a desk hover; a stacked or coarse pointer must not keep a
    // leftover near-state, or a tap in the panel can look like a slide.
    if (!desk.matches) setNear(false)
    // A window widened past the stack with the handle holding the keyboard: a
    // handle that tucks does not keep it (see toggle), whichever way it got there.
    if (desk.matches && !isOpen() && document.activeElement === handle) handle.blur()
  }
  desk.addEventListener('change', syncDesk)
  syncDesk()
  const reach = (e: PointerEvent) => {
    if (!desk.matches) return
    const edge = window.innerWidth - (isOpen() && !document.body.classList.contains('bare') ? root.offsetWidth : 0)
    setNear(e.clientX >= edge - HANDLE_REACH)
  }
  window.addEventListener('pointermove', reach)
  // A finger arrives without having moved — only consulted at a desk.
  window.addEventListener('pointerdown', reach)
  // Only a mouse leaves the window: a finger lifting is not the pointer going away.
  document.documentElement.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') setNear(false)
  })

  const toggle = (e?: Event) => {
    // Asking for the panel from a bare stage is asking for the panel.
    const bare = document.body.classList.contains('bare')
    document.body.classList.remove('bare', 'handle-greet')
    const hide = !bare && isOpen()
    document.body.classList.toggle('hide-panel', hide)
    rememberPanel(!hide)
    syncHandle()
    hideTip()
    // A tap already has a place; focusing the handle would pan the visual
    // viewport on a phone and the panel would appear to jump. P and a
    // keyboard activation (detail 0) still land on it.
    const fromPointer = e instanceof MouseEvent && e.detail > 0
    if (fromPointer) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      return
    }
    // A focused handle stands out on the edge for as long as it holds the
    // keyboard, so one that is about to tuck is not handed it. Tab still finds it.
    if (!hide || !desk.matches) handle.focus({ preventScroll: true })
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }
  handle.addEventListener('click', toggle)
  scroll.addEventListener('scroll', hideTip, { passive: true })
  window.addEventListener('scroll', hideTip, { passive: true })

  // Bare is laid over the panel's own state rather than written into it, so
  // leaving it lands where it was entered from: panel out, or handle on the edge.
  const toggleBare = () => {
    const bare = document.body.classList.toggle('bare')
    // Nothing that has just left the screen keeps the keyboard.
    if (bare && document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }
  // Here and not in each mode's key map: the key means the same thing in all of them.
  window.addEventListener('keydown', (e) => {
    // A held key is one press: it does not strobe the chrome.
    if (e.key !== '`' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
    const t = e.target
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
    e.preventDefault()
    toggleBare()
  })

  // The piece leads: Machine, Explorations, Shows and the Playground open with the panel away
  // and the handle on the edge, unless this session already chose. Set here
  // rather than through toggle so nothing is focused on load. The pages set
  // the class in their markup too, so the first paint is already panel-less;
  // this covers any host that did not. The Builder is nothing without its
  // panel, and opens with it out until the session says otherwise. A page
  // opens as it stands: the slide is for a change, not for arriving.
  document.body.classList.add('panel-still')
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('panel-still')))
  const pref = panelPref()
  const hide = pref === null ? mode !== 'builder' : !pref
  if (hide) {
    document.body.classList.add('hide-panel')
    // A handle that tucks has to be seen once to be looked for: it stands on
    // the edge as the page opens, and going in shows where it lives. The count
    // starts when the page is looked at, not when a background tab loads it.
    document.body.classList.add('handle-greet')
    const tuck = () => window.setTimeout(() => document.body.classList.remove('handle-greet'), HANDLE_GREETING_MS)
    if (document.visibilityState === 'visible') tuck()
    else document.addEventListener('visibilitychange', tuck, { once: true })
  } else {
    document.body.classList.remove('hide-panel')
  }
  syncHandle()

  return {
    root: scroll,
    body,
    setMode,
    toggle,
    hidden: () => !isOpen(),
    setPanel(open) {
      if (document.body.classList.contains('bare')) return
      document.body.classList.remove('handle-greet')
      document.body.classList.toggle('hide-panel', !open)
      syncHandle()
      hideTip()
    },
    holdHandle(on) {
      document.body.classList.toggle('handle-hold', on)
    },
    toggleBare,
  }
}

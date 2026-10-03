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
 * backtick again puts back exactly what was there. Fullscreen (the button at
 * the head's end, or F) is in every mode, and takes the whole page rather
 * than the stage alone: the panel, its handle and whatever stands on the
 * stage stay where they are, so the panel away or ` leaves the picture on its
 * own. The switch is four
 * icon-only buttons beside the brand, each named on hover. The Builder is off it for now.
 * Theater (every show, shuffled, one after another) is not a tab: it is a way
 * of watching Shows, so its door is on the Shows player, and while it is on
 * the Shows tab stays lit.
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

/** Modes with an address of their own and no tab: each is reached from inside another, whose tab it lights. */
export const HIDDEN_LINKS: readonly (ModeLink & { under: ShellMode })[] = [
  { mode: 'theater', label: 'Theater', path: '/theater/', under: 'shows' },
]

/** The tab that is lit for a mode: its own, or the one it is reached from. */
export function tabOf(mode: ShellMode): ShellMode {
  return HIDDEN_LINKS.find((m) => m.mode === mode)?.under ?? mode
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
  /** Go to another mode from inside this one (Shows into Theater, and back), as a tab click would. */
  go(mode: ShellMode, href: string): void
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
  // Back to the top: the bar the show starts at, and the way to it.
  restart: ['M5 5h3.4v14H5z', 'M19.5 5v14L9.5 12z'],
  // A speaker with its sound, and the same speaker struck quiet.
  sound: ['M3 9h4l5.5-4.5v15L7 15H3z', 'M15.3 8.6a5 5 0 0 1 0 6.8l-1.5-1.4a3 3 0 0 0 0-4z', 'M18 5.8a9 9 0 0 1 0 12.4l-1.5-1.4a7 7 0 0 0 0-9.6z'],
  muted: ['M3 9h4l5.5-4.5v15L7 15H3z', 'M15 9.4l1.4-1.4 2.3 2.3 2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3-1.4 1.4-2.3-2.3-2.3 2.3-1.4-1.4 2.3-2.3z'],
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
 * The transport's speed, as a dropdown beside Play. Seven stops are too many
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

/** Safari before 16.4 has element fullscreen only under its own prefix. */
type Prefixed = { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void; webkitRequestFullscreen?: () => void }

const fullscreenOn = (): boolean => !!(document.fullscreenElement ?? (document as Prefixed).webkitFullscreenElement)

/** False on an iPhone, which lets only a video go fullscreen: there is no button to offer. */
const canFullscreen = (): boolean => !!(document.fullscreenEnabled || (document.documentElement as Prefixed).webkitRequestFullscreen)

function toggleFullscreen(): void {
  const doc = document as Prefixed
  const page = document.documentElement as Prefixed
  if (fullscreenOn()) {
    if (document.exitFullscreen) void document.exitFullscreen().catch(() => {})
    else doc.webkitExitFullscreen?.()
    return
  }
  // Refused (not from a gesture, or a frame that does not allow it): the page stays as it is.
  if (document.documentElement.requestFullscreen) void document.documentElement.requestFullscreen().catch(() => {})
  else page.webkitRequestFullscreen?.()
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
    delete tip.dataset.for
  }
  // A tab slid under a pointer that did not move has not been pointed at: no name for it while the panel moves.
  const showTip = (a: HTMLElement, label: string, e?: Event) => {
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
  const makeLink = (m: ModeLink) => {
    const a = el('a', { href: m.path, class: `mode-tab${m.mode === tabOf(mode) ? ' on' : ''}${m.mode === tabOf(mode) && m.mode !== mode ? ' back' : ''}` })
    dress(a, m)
    a.addEventListener('pointerenter', (e) => showTip(a, m.label, e))
    a.addEventListener('pointerleave', hideTip)
    a.addEventListener('focus', () => showTip(a, m.label))
    a.addEventListener('blur', hideTip)
    a.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      // Remember before the page changes, so a real navigation opens as this one stood.
      rememberPanel(!document.body.classList.contains('hide-panel'))
      // The tab you are on is a label, not a reload. Lit for a mode reached from it (Theater), it is the way back.
      if (m.mode === currentMode) {
        e.preventDefault()
        return
      }
      if (!clientGo) return
      e.preventDefault()
      hideTip()
      clientGo(m.mode, a.href)
    })
    if (m.mode === tabOf(mode)) a.setAttribute('aria-current', 'page')
    return { m, a }
  }
  const links = MODE_LINKS.map(makeLink)
  const setMode = (next: ShellMode) => {
    currentMode = next
    for (const { m, a } of links) {
      const on = m.mode === tabOf(next)
      a.classList.toggle('on', on)
      a.classList.toggle('back', on && m.mode !== next)
      if (on) a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    }
  }
  const switcher = el('nav', { class: 'seg mode-switch icons', 'aria-label': 'Mode' }, links.map((l) => l.a))

  // Fullscreen, at the head's end: the same in every mode, so it is the chrome's and not a mode's. Named on hover as
  // the tabs are. It follows whatever changed it — the button, F, Esc, or the browser's own exit.
  const fsBtn = el('button', { type: 'button', class: 'head-btn fullscreen', 'aria-pressed': 'false' })
  const fsLabel = () => (fullscreenOn() ? 'Leave fullscreen (F)' : 'Fullscreen (F)')
  const syncFullscreen = () => {
    const on = fullscreenOn()
    fsBtn.classList.toggle('on', on)
    fsBtn.setAttribute('aria-pressed', String(on))
    fsBtn.setAttribute('aria-label', on ? 'Leave fullscreen' : 'Fullscreen')
    fsBtn.replaceChildren(icon(on ? ICON.windowed : ICON.fullscreen))
    if (!tip.hidden && tip.dataset.for === 'fullscreen') tip.textContent = fsLabel()
  }
  fsBtn.addEventListener('click', toggleFullscreen)
  fsBtn.addEventListener('pointerenter', (e) => {
    showTip(fsBtn, fsLabel(), e)
    tip.dataset.for = 'fullscreen'
  })
  fsBtn.addEventListener('focus', () => {
    showTip(fsBtn, fsLabel())
    tip.dataset.for = 'fullscreen'
  })
  fsBtn.addEventListener('pointerleave', hideTip)
  fsBtn.addEventListener('blur', hideTip)
  document.addEventListener('fullscreenchange', syncFullscreen)
  document.addEventListener('webkitfullscreenchange', syncFullscreen)
  fsBtn.hidden = !canFullscreen()
  syncFullscreen()

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
  scroll.append(el('header', { class: 'brand' }, [el('h1', {}, ['contraptions']), el('div', { class: 'head-controls' }, [switcher, fsBtn])]), body)
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

  const toggle = () => {
    // Asking for the panel from a bare stage is asking for the panel.
    const bare = document.body.classList.contains('bare')
    document.body.classList.remove('bare', 'handle-greet')
    const hide = !bare && isOpen()
    document.body.classList.toggle('hide-panel', hide)
    rememberPanel(!hide)
    syncHandle()
    hideTip()
    // The keyboard stays where it was. P is a shortcut, not a trip to the
    // handle: handed to it, the Space that follows would press the handle and
    // put the panel away, not play the show. A handle reached with Tab keeps
    // the keyboard, and stands out on the edge while it does. Only what has
    // just left the screen gives it up.
    const focused = document.activeElement
    if (hide && focused instanceof HTMLElement && scroll.contains(focused)) focused.blur()
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
  // Here and not in each mode's key map: the keys mean the same thing in all of them.
  window.addEventListener('keydown', (e) => {
    // A held key is one press: it does not strobe the chrome.
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
    const t = e.target
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
    if (e.key === '`') {
      e.preventDefault()
      toggleBare()
    } else if ((e.key === 'f' || e.key === 'F') && canFullscreen()) {
      e.preventDefault()
      toggleFullscreen()
    }
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
    go(next, href) {
      rememberPanel(isOpen())
      hideTip()
      if (clientGo) clientGo(next, href)
      else location.assign(href)
    },
  }
}

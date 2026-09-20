/**
 * The chrome the modes share. One panel down the right edge, the full
 * height of the window, with the brand and the mode switch at its head (and,
 * in Explorations, the credit at its foot); the stage takes whatever the panel leaves. Machine
 * (the show, in the code), Explorations (the sandbox), Shows (Machine set
 * to music), the Builder and the Playground (where pieces and worlds wait
 * to be let into Machine) fill the middle with their own sections, built
 * from the same helpers, so they read as siblings — one frame, different
 * dials — and moving between them is a switch at the top of the panel that
 * carries the seed across. Machine, Explorations, Shows and the Playground
 * start with the panel hidden, since there the piece leads; the Builder is
 * worked from its panel and starts with it out. Once the panel has been opened or closed,
 * that choice is kept for the session, so a switch of mode does not slam
 * it. `P` or the peek tab on the edge brings it out, and `P` puts it away again.
 * At a desk the tab itself keeps off the piece: it greets a page just
 * opened, tucks into the edge, and comes out when the pointer nears it.
 * The backtick clears the stage of all of it — the panel, the peek tab,
 * anything else standing on the stage — for the piece alone, and the
 * backtick again puts back exactly what was there.
 *
 * Shows, the Builder and the Playground are not on the switch until they
 * are unlocked: five backticks in quick succession, in any mode
 * (`unlock.ts`). The same five lock them again. While they are out the
 * switch is five icon-only buttons, each named on hover; locked, it is
 * Machine and Explorations with their words. Only the first of a quick run clears the stage, so the
 * chrome does not flicker on the way.
 */
import { UNLOCK_EVENT, UNLOCK_GAP_MS, pressCounter, setUnlocked, unlocked } from './unlock'

export type ShellMode = 'machine' | 'explorations' | 'shows' | 'builder' | 'playground'

interface ModeLink {
  mode: ShellMode
  label: string
  path: string
}

/** Tabs that stay off the switch, and off their own pages, until unlocked. */
export const GATED: ReadonlySet<ShellMode> = new Set(['shows', 'builder', 'playground'])

export const MODE_LINKS: readonly ModeLink[] = [
  { mode: 'machine', label: 'Machine', path: '/' },
  { mode: 'explorations', label: 'Explorations', path: '/explorations/' },
  { mode: 'shows', label: 'Shows', path: '/shows/' },
  { mode: 'builder', label: 'Builder', path: '/builder/' },
  { mode: 'playground', label: 'Playground', path: '/playground/' },
]

export interface Shell {
  /** Refresh the mode links so a switch carries the current seed along. */
  setSeed(seed: string): void
  /** Hide the panel, or bring it back. */
  toggle(): void
  hidden(): boolean
  /** Clear the stage of every piece of chrome, or put it all back as it was. */
  toggleBare(): void
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

/** Credit sits at the foot of Explorations, whose grids are the ones it is owed for: present, never competing. Machine and the Builder do not carry it. */
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
 * Where the peek tab tucks away: a window wide enough for the panel to sit
 * beside the stage (the stylesheet stacks it at 820px), worked with a pointer
 * that can hover.
 */
const PEEK_TUCKS = '(min-width: 821px) and (hover: hover) and (pointer: fine)'
/** How near the panel's edge the pointer comes, in px, before the tab comes out to meet it. */
const PEEK_REACH = 128
/** How long the tab stands on the edge of a page just opened before it tucks away, in ms. */
const PEEK_GREETING_MS = 3200
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
  // already blurs on click; keep that path. Keyboard still tabs in.
  root.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return
    if (!(e.target instanceof Element)) return
    if (e.target.closest('button, a.mode-tab, .lb-trigger')) e.preventDefault()
  })

  // Header — Hide lives here so P is not a one-way trap. Peek stays a target
  // after `#panel { display: none }`.
  const hideBtn = el('button', {
    type: 'button',
    class: 'chip',
    title: 'Hide the panel (P)',
    'aria-label': 'Hide panel',
  }, ['Hide', el('kbd', {}, ['P'])])

  // The mode switch: a tab a mode, the one you are on lit. Real links, so a
  // switch is a navigation and the back button undoes it. Locked it is two
  // words; unlocked it is five marks, each named on hover and for a screen reader.
  // Native title waits a beat and is easy to miss on a 32px icon; the name is
  // a small label we place ourselves (`mode-tip`).
  const tip = el('div', { class: 'mode-tip', hidden: '' })
  document.body.append(tip)
  const hideTip = () => {
    tip.hidden = true
  }
  const showTip = (a: HTMLAnchorElement, label: string) => {
    if (!a.classList.contains('icon') || a.hidden) return
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
  const dress = (a: HTMLAnchorElement, m: ModeLink, open: boolean) => {
    a.hidden = GATED.has(m.mode) && !open
    a.classList.toggle('icon', open)
    if (open) {
      a.replaceChildren(icon(ICON[m.mode]))
      a.setAttribute('aria-label', m.label)
      a.removeAttribute('title')
    } else {
      a.replaceChildren(m.label)
      a.removeAttribute('aria-label')
      a.removeAttribute('title')
    }
    hideTip()
  }
  const links = MODE_LINKS.map((m) => {
    const a = el('a', { href: m.path, class: `mode-tab${m.mode === mode ? ' on' : ''}` })
    dress(a, m, unlocked())
    a.addEventListener('pointerenter', () => showTip(a, m.label))
    a.addEventListener('pointerleave', hideTip)
    a.addEventListener('focus', () => showTip(a, m.label))
    a.addEventListener('blur', hideTip)
    a.addEventListener('click', () => {
      // A switch is a new page: remember the panel so the next mode opens as this one stood.
      rememberPanel(!document.body.classList.contains('hide-panel'))
    })
    if (m.mode === mode) {
      a.setAttribute('aria-current', 'page')
      // The tab you are on is a label, not a reload.
      a.addEventListener('click', (e) => e.preventDefault())
    }
    return { m, a }
  })
  const switcher = el('nav', { class: 'seg mode-switch', 'aria-label': 'Mode' }, links.map((l) => l.a))
  switcher.classList.toggle('icons', unlocked())
  root.append(
    el('header', { class: 'brand' }, [
      el('div', { class: 'brand-row' }, [el('h1', {}, ['contraptions']), hideBtn]),
      switcher,
    ]),
  )

  const peek = el('button', {
    type: 'button',
    class: 'panel-peek',
    title: 'Show the panel (P)',
    'aria-label': 'Show panel',
  }, ['Panel', el('kbd', {}, ['P'])])
  document.body.append(peek)

  // At a desk the tab keeps off the piece: it comes out when the pointer
  // nears the panel's edge and tucks back in when the pointer goes. Only
  // where there is a pointer to near it with — a touch screen, or the stacked
  // layout, keeps the tab out. The class says which; the stylesheet does the rest.
  const desk = window.matchMedia(PEEK_TUCKS)
  // Tracked with the panel out as well, so that a panel closed from under the
  // pointer — Hide sits in the tab's corner — leaves the tab there to be met.
  let near = false
  const setNear = (on: boolean) => {
    if (on === near) return
    near = on
    document.body.classList.toggle('peek-near', on)
  }
  const syncDesk = () => {
    document.body.classList.toggle('peek-tucks', desk.matches)
    // Reach is a desk hover; a stacked or coarse pointer must not keep a
    // leftover near-state, or a tap in the panel can look like a slide.
    if (!desk.matches) setNear(false)
    // A window widened past the stack with the tab holding the keyboard: a
    // tab that tucks does not keep it (see toggle), whichever way it got there.
    if (desk.matches && document.activeElement === peek) peek.blur()
  }
  desk.addEventListener('change', syncDesk)
  syncDesk()
  const reach = (e: PointerEvent) => {
    if (!desk.matches) return
    setNear(e.clientX >= window.innerWidth - PEEK_REACH)
  }
  window.addEventListener('pointermove', reach)
  // A finger arrives without having moved — only consulted at a desk.
  window.addEventListener('pointerdown', reach)
  // Only a mouse leaves the window: a finger lifting is not the pointer going away.
  document.documentElement.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') setNear(false)
  })

  const focusChrome = (node: HTMLElement) => {
    node.focus({ preventScroll: true })
  }

  const toggle = (e?: Event) => {
    // Asking for the panel from a bare stage is asking for the panel.
    const bare = document.body.classList.contains('bare')
    document.body.classList.remove('bare', 'peek-greet')
    const hide = !bare && !document.body.classList.contains('hide-panel')
    document.body.classList.toggle('hide-panel', hide)
    rememberPanel(!hide)
    hideTip()
    // A tap already has a place; focusing Hide or the tab would pan the
    // visual viewport on a phone and the panel would appear to jump. P and
    // a keyboard activation (detail 0) still land on the chrome.
    const fromPointer = e instanceof MouseEvent && e.detail > 0
    if (fromPointer) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
      return
    }
    if (!hide) focusChrome(hideBtn)
    // A focused tab would stand out on the edge for as long as it held the
    // keyboard, so a tab that tucks is not handed it. Tab still finds it.
    else if (!desk.matches) focusChrome(peek)
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }
  hideBtn.addEventListener('click', toggle)
  peek.addEventListener('click', toggle)
  // Peek lives on the body, not in the panel, so the panel's pointerdown
  // guard does not cover it. Same rule: a tap must not focus and pan.
  peek.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') e.preventDefault()
  })
  root.addEventListener('scroll', hideTip, { passive: true })
  window.addEventListener('scroll', hideTip, { passive: true })

  // Bare is laid over the panel's own state rather than written into it, so
  // leaving it lands where it was entered from: panel out, or tab on the edge.
  const toggleBare = () => {
    const bare = document.body.classList.toggle('bare')
    // Nothing that has just left the screen keeps the keyboard.
    if (bare && document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }
  // Five backticks on each other's heels lock or unlock Shows, the Builder
  // and the Playground together. Only the first press of a quick run clears the stage
  // (or puts it back): the rest of the run are counted and not shown, so
  // five for the lock do not strobe the chrome. The fifth settles it: the
  // panel out for tabs just unlocked, so that the new marks are seen, and
  // as it was before the run for a lock. No flash on the new tabs.
  const run = pressCounter()
  let bareBefore = false
  let lastPress = -Infinity
  let presses = 0
  const toggleLock = () => {
    const on = !unlocked()
    setUnlocked(on)
    window.dispatchEvent(new CustomEvent(UNLOCK_EVENT, { detail: on }))
    if (!on && GATED.has(mode)) {
      // A gated mode is put away with its door: back to the front of the house.
      location.replace(links.find((l) => l.m.mode === 'machine')!.a.href)
      return
    }
    switcher.classList.toggle('icons', on)
    for (const { m, a } of links) dress(a, m, on)
    document.body.classList.toggle('bare', on ? false : bareBefore)
    if (!on) return
    document.body.classList.remove('hide-panel')
    rememberPanel(true)
  }
  // Here and not in each mode's key map: the key means the same thing in all of them.
  window.addEventListener('keydown', (e) => {
    // A held key is one press: it neither strobes the chrome nor counts five.
    if (e.key !== '`' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
    const t = e.target
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return
    e.preventDefault()
    const at = performance.now()
    // The first press of a run remembers how the stage stood before it.
    if (at - lastPress > UNLOCK_GAP_MS) {
      bareBefore = document.body.classList.contains('bare')
      presses = 0
    }
    lastPress = at
    presses++
    if (run(at)) {
      toggleLock()
      // The counter starts over after a run; so does this.
      lastPress = -Infinity
    } else if (presses === 1) toggleBare()
  })

  // The piece leads: Machine, Explorations, Shows and the Playground open with the panel away
  // and the peek tab on the edge, unless this session already chose. Set here
  // rather than through toggle so nothing is focused on load. The pages set
  // the class in their markup too, so the first paint is already panel-less;
  // this covers any host that did not. The Builder is nothing without its
  // panel, and opens with it out until the session says otherwise.
  const pref = panelPref()
  const hide = pref === null ? mode !== 'builder' : !pref
  if (hide) {
    document.body.classList.add('hide-panel')
    // A tab that tucks has to be seen once to be looked for: it stands on the
    // edge as the page opens, and going in shows where it lives. The count
    // starts when the page is looked at, not when a background tab loads it.
    document.body.classList.add('peek-greet')
    const tuck = () => window.setTimeout(() => document.body.classList.remove('peek-greet'), PEEK_GREETING_MS)
    if (document.visibilityState === 'visible') tuck()
    else document.addEventListener('visibilitychange', tuck, { once: true })
  } else {
    document.body.classList.remove('hide-panel')
  }

  return {
    setSeed(seed) {
      for (const { m, a } of links) {
        a.href = seed ? `${m.path}?seed=${encodeURIComponent(seed)}` : m.path
      }
    },
    toggle,
    hidden: () => document.body.classList.contains('hide-panel'),
    toggleBare,
  }
}

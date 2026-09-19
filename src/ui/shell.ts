/**
 * The chrome the modes share. One panel down the right edge, the full
 * height of the window, with the brand and the mode switch at its head (and,
 * in Explorations, the credit at its foot); the stage takes whatever the panel leaves. Machine
 * (the show, in the code), Explorations (the sandbox) and the Builder fill
 * the middle with their own sections, built from the same helpers, so they
 * read as siblings — one frame, different dials — and moving between them
 * is a switch at the top of the panel that carries the seed across. Machine
 * and Explorations start with the panel hidden, since there the piece
 * leads; the Builder is worked from its panel and starts with it out. `P`
 * or the peek tab on the edge brings it out, and `P` puts it away again.
 * At a desk the tab itself keeps off the piece: it greets a page just
 * opened, tucks into the edge, and comes out when the pointer nears it.
 * The backtick clears the stage of all of it — the panel, the peek tab,
 * anything else standing on the stage — for the piece alone, and the
 * backtick again puts back exactly what was there.
 *
 * The Builder's tab is not on the switch until it is unlocked: five
 * backticks in quick succession, in any mode (`unlock.ts`). The same five
 * lock it again. Only the first of a quick run clears the stage, so the
 * chrome does not flicker on the way.
 */
import { UNLOCK_EVENT, UNLOCK_GAP_MS, builderUnlocked, pressCounter, setBuilderUnlocked } from './unlock'

export type ShellMode = 'machine' | 'explorations' | 'builder'

interface ModeLink {
  mode: ShellMode
  label: string
  path: string
}

const MODE_LINKS: ModeLink[] = [
  { mode: 'machine', label: 'Machine', path: '/' },
  { mode: 'explorations', label: 'Explorations', path: '/explorations/' },
  { mode: 'builder', label: 'Builder', path: '/builder/' },
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

export function createShell(root: HTMLElement, mode: ShellMode): Shell {
  // Mouse clicks leave a button focused, and a focused button swallows the
  // space shortcut. Keyboard activation reports detail 0 and keeps focus.
  // The click may land on a key cap or an icon inside the button.
  root.addEventListener('click', (e) => {
    if (e.detail > 0 && e.target instanceof Element) e.target.closest('button')?.blur()
  })

  // Header — Hide lives here so P is not a one-way trap. Peek stays a target
  // after `#panel { display: none }`.
  const hideBtn = el('button', {
    type: 'button',
    class: 'chip',
    title: 'Hide the panel (P)',
    'aria-label': 'Hide panel',
  }, ['Hide', el('kbd', {}, ['P'])])

  // The mode switch: two tabs, the one you are on lit. Real links, so a
  // switch is a navigation and the back button undoes it.
  const links = MODE_LINKS.map((m) => {
    const a = el('a', { href: m.path, class: `mode-tab${m.mode === mode ? ' on' : ''}` }, [m.label])
    if (m.mode === 'builder') a.hidden = !builderUnlocked()
    if (m.mode === mode) {
      a.setAttribute('aria-current', 'page')
      // The tab you are on is a label, not a reload.
      a.addEventListener('click', (e) => e.preventDefault())
    }
    return { m, a }
  })
  root.append(
    el('header', { class: 'brand' }, [
      el('div', { class: 'brand-row' }, [el('h1', {}, ['contraptions']), hideBtn]),
      el('nav', { class: 'seg mode-switch', 'aria-label': 'Mode' }, links.map((l) => l.a)),
    ]),
  )
  const builderTab = links.find((l) => l.m.mode === 'builder')!.a

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
  const syncDesk = () => {
    document.body.classList.toggle('peek-tucks', desk.matches)
    // A window widened past the stack with the tab holding the keyboard: a
    // tab that tucks does not keep it (see toggle), whichever way it got there.
    if (desk.matches && document.activeElement === peek) peek.blur()
  }
  desk.addEventListener('change', syncDesk)
  syncDesk()
  // Tracked with the panel out as well, so that a panel closed from under the
  // pointer — Hide sits in the tab's corner — leaves the tab there to be met.
  let near = false
  const setNear = (on: boolean) => {
    if (on === near) return
    near = on
    document.body.classList.toggle('peek-near', on)
  }
  const reach = (e: PointerEvent) => setNear(e.clientX >= window.innerWidth - PEEK_REACH)
  window.addEventListener('pointermove', reach)
  // A finger arrives without having moved.
  window.addEventListener('pointerdown', reach)
  // Only a mouse leaves the window: a finger lifting is not the pointer going away.
  document.documentElement.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') setNear(false)
  })

  const toggle = () => {
    // Asking for the panel from a bare stage is asking for the panel.
    const bare = document.body.classList.contains('bare')
    document.body.classList.remove('bare', 'peek-greet')
    const hide = !bare && !document.body.classList.contains('hide-panel')
    document.body.classList.toggle('hide-panel', hide)
    if (!hide) hideBtn.focus()
    // A focused tab would stand out on the edge for as long as it held the
    // keyboard, so a tab that tucks is not handed it. Tab still finds it.
    else if (!desk.matches) peek.focus()
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }
  hideBtn.addEventListener('click', toggle)
  peek.addEventListener('click', toggle)

  // Bare is laid over the panel's own state rather than written into it, so
  // leaving it lands where it was entered from: panel out, or tab on the edge.
  const toggleBare = () => {
    const bare = document.body.classList.toggle('bare')
    // Nothing that has just left the screen keeps the keyboard.
    if (bare && document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }
  // Five backticks on each other's heels lock or unlock the Builder. Only
  // the first press of a quick run clears the stage (or puts it back): the
  // rest of the run are counted and not shown, so five for the lock do not
  // strobe the chrome. The fifth settles it: out for a Builder just
  // unlocked, so that the new tab is seen, and as it was before the run for
  // one just locked.
  const run = pressCounter()
  let bareBefore = false
  let lastPress = -Infinity
  let presses = 0
  const toggleLock = () => {
    const on = !builderUnlocked()
    setBuilderUnlocked(on)
    window.dispatchEvent(new CustomEvent(UNLOCK_EVENT, { detail: on }))
    if (!on && mode === 'builder') {
      // The workbench is put away with its door: back to the front of the house.
      location.replace(links.find((l) => l.m.mode === 'machine')!.a.href)
      return
    }
    builderTab.hidden = !on
    document.body.classList.toggle('bare', on ? false : bareBefore)
    if (!on) return
    document.body.classList.remove('hide-panel')
    // Lit for a moment, so the eye finds what the hand just did.
    builderTab.classList.remove('unlocked')
    void builderTab.offsetWidth
    builderTab.classList.add('unlocked')
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

  // The piece leads: Machine and Explorations open with the panel away and
  // the peek tab on the edge. Set here rather than through toggle so nothing
  // is focused on load. The pages set the class in their markup too, so the
  // first paint is already panel-less; this covers any host that did not.
  // The Builder is nothing without its panel, and opens with it out.
  if (mode !== 'builder') {
    document.body.classList.add('hide-panel')
    // A tab that tucks has to be seen once to be looked for: it stands on the
    // edge as the page opens, and going in shows where it lives. The count
    // starts when the page is looked at, not when a background tab loads it.
    document.body.classList.add('peek-greet')
    const tuck = () => window.setTimeout(() => document.body.classList.remove('peek-greet'), PEEK_GREETING_MS)
    if (document.visibilityState === 'visible') tuck()
    else document.addEventListener('visibilitychange', tuck, { once: true })
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

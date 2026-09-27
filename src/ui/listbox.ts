/**
 * A select-only combobox, after the APG pattern: focus stays on the trigger,
 * the active option is conveyed through aria-activedescendant, and the popup
 * is fixed-positioned so it never fights the panel's own scrolling.
 *
 * Native <select> can only render text, which is a poor way to choose a
 * palette. Options here can carry a swatch pill or a leading glyph, so the
 * user picks by looking rather than by name.
 */

export interface ListboxSwatches {
  /** Fill palette, drawn as dots. */
  colors: string[]
  /** Paper color, drawn as the pill behind the dots. */
  bg: string
  /** Ink color, drawn as the pill's border. */
  ink: string
}

export interface ListboxItem {
  value: string
  label: string
  /** Secondary line, used by Mode to say what the composer actually does. */
  note?: string
  swatches?: ListboxSwatches
  /** Small leading glyph, e.g. a mini layout diagram. Cloned per use. */
  glyph?: SVGSVGElement
}

export interface Listbox {
  node: HTMLElement
  set(value: string): void
  /** Replace the option list, e.g. when Mode swaps catalogs. */
  setItems(next: ListboxItem[], value?: string): void
}

let uid = 0

/** Clear of the viewport's edges, and the least room a list is squeezed into before it would sooner flip. */
const EDGE = 8
const GAP = 4
const MIN_ROOM = 120

/**
 * Where the popup goes for a trigger at `top`..`bottom` in a viewport `viewport` tall: below it, or above it when
 * there is more room there and not enough below, and never taller than the room on its side, so it scrolls inside
 * itself rather than running off the screen. On a phone the panel is a short strip at the foot of the screen, and a
 * list that only flipped would still overhang the top.
 */
export function fitPopup(top: number, bottom: number, height: number, viewport: number): { top: number; maxHeight: number } {
  const below = viewport - bottom - GAP - EDGE
  const above = top - GAP - EDGE
  const down = below >= height || below >= above
  const room = Math.max(Math.min(MIN_ROOM, height), down ? below : above)
  const h = Math.min(height, room)
  return { top: Math.round(Math.max(EDGE, down ? bottom + GAP : top - GAP - h)), maxHeight: Math.floor(h) }
}

function make(tag: string, cls: string): HTMLElement {
  const n = document.createElement(tag)
  n.className = cls
  return n
}

function swatchPill(s: ListboxSwatches): HTMLElement {
  const pill = make('span', 'lb-swatch')
  pill.style.background = s.bg
  pill.style.borderColor = s.ink
  for (const c of s.colors.slice(0, 5)) {
    const dot = make('i', '')
    dot.style.background = c
    pill.append(dot)
  }
  return pill
}

/** Trigger and options share a renderer. Notes only belong on the option. */
function renderContent(target: HTMLElement, item: ListboxItem, withNote = false): void {
  target.replaceChildren()
  if (item.glyph) target.append(item.glyph.cloneNode(true))
  const text = make('span', 'lb-text')
  const label = make('span', 'lb-label')
  label.textContent = item.label
  text.append(label)
  if (withNote && item.note) {
    const note = make('span', 'lb-note')
    note.textContent = item.note
    text.append(note)
  }
  target.append(text)
  if (item.swatches) target.append(swatchPill(item.swatches))
}

export function createListbox(config: {
  items: ListboxItem[]
  value: string
  /** Accessible name for the control. */
  label: string
  onChange(value: string): void
}): Listbox {
  let items = config.items
  const id = `lb-${uid++}`
  let value = config.value
  let open = false
  let active = Math.max(0, items.findIndex((i) => i.value === value))
  let typed = ''
  let typedAt = 0

  const node = make('div', 'lb')
  const trigger = make('div', 'lb-trigger')
  trigger.tabIndex = 0
  trigger.setAttribute('role', 'combobox')
  trigger.setAttribute('aria-haspopup', 'listbox')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.setAttribute('aria-label', config.label)
  trigger.setAttribute('aria-controls', id)
  const triggerContent = make('span', 'lb-value')
  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  chevron.setAttribute('viewBox', '0 0 24 24')
  chevron.setAttribute('aria-hidden', 'true')
  chevron.classList.add('lb-chevron')
  const chev = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  chev.setAttribute('d', 'M6 9.5l6 6 6-6')
  chevron.append(chev)
  trigger.append(triggerContent, chevron)

  const pop = make('div', 'lb-pop')
  pop.id = id
  pop.setAttribute('role', 'listbox')
  pop.setAttribute('aria-label', config.label)

  let optionEls: HTMLElement[] = []

  /** A finger down on an option: it is chosen on lifting, unless the finger scrolled the list instead. */
  let touched: { i: number; y: number } | null = null

  const bindOption = (item: ListboxItem, i: number): HTMLElement => {
    const opt = make('div', 'lb-opt')
    opt.id = `${id}-${i}`
    opt.setAttribute('role', 'option')
    renderContent(opt, item, true)
    opt.addEventListener('pointerenter', () => setActive(i, false))
    // A mouse chooses on pointerdown, not click: it wins the race against the
    // outside-click closer, and feels as immediate as a native select. A
    // finger going down is as likely the start of a scroll through the list,
    // so a touch chooses on lifting, and not at all if the list moved.
    opt.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      if (e.pointerType === 'mouse') choose(i)
      else touched = { i, y: e.clientY }
    })
    opt.addEventListener('pointerup', (e) => {
      const t = touched
      touched = null
      if (t && t.i === i && Math.abs(e.clientY - t.y) < 10) choose(i)
    })
    pop.append(opt)
    return opt
  }

  const rebuildOptions = () => {
    pop.replaceChildren()
    optionEls = items.map(bindOption)
  }

  rebuildOptions()

  // Grabbing the popup's scrollbar must not steal focus from the trigger —
  // the blur handler would close the list mid-drag.
  pop.addEventListener('pointerdown', (e) => e.preventDefault())
  // The browser took the finger for a scroll.
  pop.addEventListener('pointercancel', () => (touched = null))
  pop.addEventListener('scroll', () => (touched = null), { passive: true })

  node.append(trigger, pop)

  const paint = () => {
    const current = items.find((i) => i.value === value) ?? items[0]
    if (current) renderContent(triggerContent, current)
    optionEls.forEach((opt, i) => {
      opt.setAttribute('aria-selected', String(items[i].value === value))
      opt.classList.toggle('sel', items[i].value === value)
      opt.classList.toggle('act', open && i === active)
    })
    trigger.setAttribute('aria-expanded', String(open))
    if (open) trigger.setAttribute('aria-activedescendant', `${id}-${active}`)
    else trigger.removeAttribute('aria-activedescendant')
  }

  /** `reveal` scrolls it into view: for the keys, never under a pointer, where it would jump the list mid-gesture. */
  const setActive = (i: number, reveal = true) => {
    active = Math.max(0, Math.min(items.length - 1, i))
    paint()
    if (reveal) optionEls[active]?.scrollIntoView({ block: 'nearest' })
  }

  const place = () => {
    const r = trigger.getBoundingClientRect()
    pop.style.minWidth = `${r.width}px`
    // Measure invisibly at full height, then drop below the trigger or flip
    // above it, cut to the room on that side (`fitPopup`).
    pop.style.visibility = 'hidden'
    pop.style.display = 'block'
    pop.style.maxHeight = ''
    const scrolled = pop.scrollTop
    const fit = fitPopup(r.top, r.bottom, pop.offsetHeight, window.innerHeight)
    pop.style.maxHeight = `${fit.maxHeight}px`
    pop.style.top = `${fit.top}px`
    pop.style.left = `${Math.round(Math.max(EDGE, Math.min(r.left, window.innerWidth - pop.offsetWidth - EDGE)))}px`
    pop.scrollTop = scrolled
    pop.style.visibility = ''
  }

  /** Where the trigger can be seen: the window, cut to each scrolling box it sits in (the panel). */
  const sight = (): { top: number; bottom: number } => {
    let top = 0
    let bottom = window.innerHeight
    for (let n = node.parentElement; n; n = n.parentElement) {
      if (!/auto|scroll/.test(getComputedStyle(n).overflowY)) continue
      const r = n.getBoundingClientRect()
      top = Math.max(top, r.top)
      bottom = Math.min(bottom, r.bottom)
    }
    return { top, bottom }
  }

  // A scroll outside the list (the panel, the page) or a resize (a phone's
  // toolbar folding away as the finger moves) would leave the fixed popup
  // behind its trigger. It follows the trigger instead, and closes only once
  // the trigger has gone out of sight: closing on any scroll shut the list
  // mid-gesture on a phone.
  let follow = 0
  const onMove = () => {
    if (follow) return
    follow = requestAnimationFrame(() => {
      follow = 0
      if (!open) return
      const r = trigger.getBoundingClientRect()
      const seen = sight()
      if (r.bottom <= seen.top || r.top >= seen.bottom) close()
      else place()
    })
  }

  const onOutside = (e: PointerEvent) => {
    if (e.target instanceof Node && node.contains(e.target)) return
    close()
  }
  const onScroll = (e: Event) => {
    if (e.target instanceof Node && pop.contains(e.target)) return
    onMove()
  }

  const show = () => {
    if (open) return
    open = true
    active = Math.max(0, items.findIndex((i) => i.value === value))
    place()
    paint()
    optionEls[active]?.scrollIntoView({ block: 'nearest' })
    document.addEventListener('pointerdown', onOutside, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onMove)
    window.addEventListener('blur', close)
  }

  function close() {
    if (!open) return
    open = false
    pop.style.display = ''
    paint()
    document.removeEventListener('pointerdown', onOutside, true)
    touched = null
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onMove)
    window.removeEventListener('blur', close)
  }

  const choose = (i: number) => {
    const next = items[i]?.value
    close()
    if (next === undefined || next === value) return
    value = next
    paint()
    config.onChange(next)
  }

  const typeahead = (ch: string) => {
    const now = Date.now()
    typed = now - typedAt > 500 ? ch : typed + ch
    typedAt = now
    const from = typed.length === 1 ? active + 1 : active
    for (let step = 0; step < items.length; step++) {
      const i = (from + step) % items.length
      if (items[i].label.toLowerCase().startsWith(typed)) {
        if (!open) show()
        setActive(i)
        return
      }
    }
  }

  trigger.addEventListener('click', () => (open ? close() : show()))
  trigger.addEventListener('blur', close)
  trigger.addEventListener('keydown', (e) => {
    const handled = () => {
      // The app's global shortcuts (space rerolls!) must not fire underneath.
      e.preventDefault()
      e.stopPropagation()
    }
    switch (e.key) {
      case 'Enter':
      case ' ':
        handled()
        if (open) choose(active)
        else show()
        break
      case 'ArrowDown':
        handled()
        if (open) setActive(active + 1)
        else show()
        break
      case 'ArrowUp':
        handled()
        if (open) setActive(active - 1)
        else show()
        break
      case 'Home':
        if (open) {
          handled()
          setActive(0)
        }
        break
      case 'End':
        if (open) {
          handled()
          setActive(items.length - 1)
        }
        break
      case 'Escape':
        if (open) {
          handled()
          close()
        }
        break
      case 'Tab':
        close()
        break
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          handled()
          typeahead(e.key.toLowerCase())
        }
    }
  })

  paint()

  return {
    node,
    set(next) {
      value = next
      paint()
    },
    setItems(next, nextValue) {
      items = next
      if (nextValue !== undefined) value = nextValue
      if (!items.some((i) => i.value === value)) value = items[0]?.value ?? ''
      active = Math.max(0, items.findIndex((i) => i.value === value))
      rebuildOptions()
      paint()
    },
  }
}

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
  swatches?: ListboxSwatches
  /** Small leading glyph, e.g. a mini layout diagram. Cloned per use. */
  glyph?: SVGSVGElement
}

export interface Listbox {
  node: HTMLElement
  set(value: string): void
}

let uid = 0

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

/** The trigger and every option share one renderer, so they cannot drift. */
function renderContent(target: HTMLElement, item: ListboxItem): void {
  target.replaceChildren()
  if (item.glyph) target.append(item.glyph.cloneNode(true))
  const label = make('span', 'lb-label')
  label.textContent = item.label
  target.append(label)
  if (item.swatches) target.append(swatchPill(item.swatches))
}

export function createListbox(config: {
  items: ListboxItem[]
  value: string
  /** Accessible name for the control. */
  label: string
  onChange(value: string): void
}): Listbox {
  const { items } = config
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

  const optionEls = items.map((item, i) => {
    const opt = make('div', 'lb-opt')
    opt.id = `${id}-${i}`
    opt.setAttribute('role', 'option')
    renderContent(opt, item)
    opt.addEventListener('pointerenter', () => setActive(i))
    // pointerdown, not click: it wins the race against the outside-click
    // closer, and feels as immediate as a native select.
    opt.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      choose(i)
    })
    pop.append(opt)
    return opt
  })

  // Grabbing the popup's scrollbar must not steal focus from the trigger —
  // the blur handler would close the list mid-drag.
  pop.addEventListener('pointerdown', (e) => e.preventDefault())

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

  const setActive = (i: number) => {
    active = Math.max(0, Math.min(items.length - 1, i))
    paint()
    optionEls[active]?.scrollIntoView({ block: 'nearest' })
  }

  const place = () => {
    const r = trigger.getBoundingClientRect()
    pop.style.minWidth = `${r.width}px`
    pop.style.left = `${Math.round(r.left)}px`
    // Measure invisibly, then drop below the trigger — or flip above when the
    // viewport bottom would clip the list.
    pop.style.visibility = 'hidden'
    pop.style.display = 'block'
    const ph = pop.offsetHeight
    const below = window.innerHeight - r.bottom - 8
    const top = below >= ph || below >= r.top - 8 ? r.bottom + 4 : r.top - ph - 4
    pop.style.top = `${Math.round(Math.max(8, top))}px`
    pop.style.visibility = ''
  }

  const onOutside = (e: PointerEvent) => {
    if (e.target instanceof Node && node.contains(e.target)) return
    close()
  }
  // A scroll anywhere outside the list (the panel, the page) would drag the
  // fixed-position popup away from its trigger; closing is what native menus do.
  const onScroll = (e: Event) => {
    if (e.target instanceof Node && pop.contains(e.target)) return
    close()
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
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
  }

  function close() {
    if (!open) return
    open = false
    pop.style.display = ''
    paint()
    document.removeEventListener('pointerdown', onOutside, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', close)
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
  }
}

import p5 from 'p5'
import { savePng } from '../../../src/core/capture'
import { clamp } from '../../../src/core/ease'
import type { Theme } from '../../../src/core/themes'
import { drawWorld, exportScale, exportSize, setupCanvas, type Clock, type Viewport } from './engine'
import { Show } from './show'
import { extentOf, type Universe } from './universe'
import { WORLDS, builtWorlds, worldByName, type World } from './worlds'

/**
 * The catalog: a sheet of every piece, grouped by world, each looping on
 * its own between two portals in the show's own hand. The sheet has four
 * bands, one a world, in the loop's order, each painted in that world's
 * own paper with its pieces in its own ink; every cell is the solo world
 * for one piece — the same `Show(seed, { solo, world })` that `?solo=`
 * builds — drawn small with a fixed camera that fits the piece and
 * wherever the ball goes, and stood on a shelf with its name under it.
 * The ball is out of sight at both ends of a solo world, so the loop has
 * no seam. When the four bands are taller than the screen the sheet
 * scrolls. Click a piece to watch it alone. Builds — worlds made in the
 * Builder — get a band each after the four, showing the pieces they
 * brought and not the cast they borrow, which is on the sheet already.
 *
 * The sheet is a place you come back to: it opens where it was left, with
 * the piece you were just watching in view and lit for a moment, so the
 * eye lands where it set off from.
 */

export interface Catalog {
  /** How far down the sheet is scrolled, so it can be opened there again. */
  scroll(): number
  /** The sheet as it stands as a PNG, supersampled by `scale`. */
  savePng(filename: string, scale: number): void
  exportSize(scale: number): [number, number]
  destroy(): void
}

/** One piece on the sheet: its name, and the world whose band it stands in. */
export interface Entry {
  name: string
  world: string
}

export interface CatalogOptions {
  /** Where the sheet was scrolled to when it was last left. */
  scroll?: number
  /** The piece just come back from: brought into view, and lit for a moment. */
  focus?: Entry | null
  /** The worlds on the sheet, when not all of them: the Builder shows one build alone. */
  worlds?: readonly World[]
  /** What the foot of the sheet says, longest first; the first that fits is used. The machine's own, when unset. */
  hints?: readonly string[]
  /** What the head of the sheet says it is a sheet of. Counted from the bands, when unset. */
  scope?: string
}

interface Cell {
  name: string
  world: World
  show: Show
  u: Universe
  /** The extent to fit, in cells: the footprint, plus wherever the ball flies. */
  x0: number
  y0: number
  x1: number
  y1: number
  /** Where in its loop this cell starts, so the sheet does not move in step. */
  offset: number
}

interface Group {
  world: World
  theme: Theme
  cells: Cell[]
}

interface Slot {
  /** In sheet coordinates: y grows down the whole sheet, before scrolling. */
  x: number
  y: number
  w: number
  h: number
  /** Room for the world, above the shelf. */
  box: Viewport
  /** The shelf the piece stands on, and where its name goes. */
  shelf: number
  label: number
}

interface Band {
  group: Group
  /** Sheet coordinates. */
  y0: number
  y1: number
  /** Where the world's name goes. */
  title: number
  slots: Slot[]
}

interface Sheet {
  bands: Band[]
  font: number
  /** The fixed header and footer, in screen coordinates. */
  header: number
  footer: number
  /** Where the scrolling part of the sheet begins and ends on screen. */
  top: number
  bottom: number
  /** How tall the scrolling part is, in total. */
  height: number
}

/** The explorer's type stack for its catalog sheet. This is the only text in the show. */
const FONT = 'Inter, "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'

/** Cells of breathing room around a piece: at the sides, and above. */
const SIDE = 0.15
const ABOVE = 0.2
/** A cell is never narrower than this; the sheet scrolls instead. */
const MIN_CELL = 150
/** Pixels of the top left corner the way back takes up: across, and down. */
const CORNER = 150
const CORNER_H = 60
/** The stylesheet's breakpoint: at or under this the panel stacks below the stage. */
const NARROW = 820

const ORDINAL = ['first', 'second', 'third', 'fourth']

/** Seconds a piece stays lit after the sheet opens on it. */
const LIT = 1.8

function buildCell(seed: string, world: World, name: string, i: number): Cell {
  const show = new Show(seed, { solo: name, world: world.name })
  const u = show.universe(0)
  return { name, world, show, u, ...extentOf(u), offset: (i * 0.618 * u.journey) % u.journey }
}

/** Every world with a band on the sheet: the loop, then the builds. */
const sheetWorlds = (): World[] => [...WORLDS, ...builtWorlds()]

/**
 * Every piece on the sheet, in the sheet's order: world by world round the
 * loop, then build by build. The portal is the same door everywhere, so it
 * is shown once; a build is shown by the pieces it brought. This is also
 * the order a solo steps through the pieces in.
 */
export function catalogOrder(worlds: readonly World[] = sheetWorlds()): Entry[] {
  return worlds.flatMap((world) =>
    world.pieces
      .filter((piece) => (world.own ? world.own.includes(piece.name) : world === WORLDS[0] || piece.name !== 'portal'))
      .map((piece) => ({ name: piece.name, world: world.name })),
  )
}

function buildGroups(seed: string, worlds: readonly World[]): Group[] {
  const cells = catalogOrder(worlds).map((entry, i) => buildCell(seed, worldByName(entry.world)!, entry.name, i))
  return worlds.flatMap((world) => {
    const own = cells.filter((cell) => cell.world === world)
    // A build with nothing in it yet has no band.
    return own.length ? [{ world, theme: own[0].u.theme, cells: own }] : []
  })
}

function layout(W: number, H: number, groups: Group[]): Sheet {
  const short = Math.min(W, H)
  const font = Math.max(10, Math.min(13, short * 0.018))
  const pad = Math.max(12, Math.min(28, short * 0.035))
  const header = pad
  const footer = H - pad - font
  // The sheet starts below the way back in the corner, however small the screen.
  const top = Math.max(header + font * 2.4, CORNER_H)
  const bottom = footer - font * 1.6
  const area = { x: pad, w: W - 2 * pad, h: bottom - top }
  const title = font * 2.6
  const rowsFor = (cols: number) => groups.reduce((sum, g) => sum + Math.ceil(g.cells.length / cols), 0)
  // Cells about five by four, in however many columns keep them biggest
  // while the whole sheet still fits; failing that, as many columns as
  // keep a cell readable, and the sheet scrolls.
  let cols = 1
  let best = 0
  const most = Math.max(...groups.map((g) => g.cells.length))
  for (let c = 1; c <= most; c++) {
    const size = Math.min(area.w / c / 1.25, (area.h - groups.length * title) / rowsFor(c))
    if (size > best) {
      best = size
      cols = c
    }
  }
  let cw = area.w / cols
  let ch = (area.h - groups.length * title) / rowsFor(cols)
  if (cw < MIN_CELL) {
    cols = Math.max(1, Math.floor(area.w / MIN_CELL))
    cw = area.w / cols
    ch = cw * 0.8
  }
  const gap = Math.max(5, Math.min(14, cw * 0.045))
  const band = font * 2

  const bands: Band[] = []
  let y = 0
  for (const group of groups) {
    const n = group.cells.length
    const rows = Math.ceil(n / cols)
    const y0 = y
    const slots: Slot[] = []
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols)
      const inRow = Math.min(cols, n - row * cols)
      // A short last row sits centred.
      const x = area.x + ((cols - inRow) * cw) / 2 + (i - row * cols) * cw
      const sy = y0 + title + row * ch
      const box = { x: x + gap, y: sy + gap, w: cw - 2 * gap, h: ch - 2 * gap - band }
      const shelf = box.y + box.h
      slots.push({ x, y: sy, w: cw, h: ch, box, shelf, label: shelf + font * 0.7 })
    }
    y = y0 + title + rows * ch
    bands.push({ group, y0, y1: y, title: y0 + title * 0.42, slots })
  }
  return { bands, font, header, footer, top, bottom, height: y }
}

export function createCatalog(
  host: HTMLElement,
  seed: string,
  clock: Clock,
  onPick: (name: string, world: string) => void,
  options: CatalogOptions = {},
): Catalog {
  const groups = buildGroups(seed, options.worlds ?? sheetWorlds())
  const total = groups.reduce((sum, g) => sum + g.cells.length, 0)
  // What the sheet is a sheet of: the four worlds, and however many builds stand beside them.
  const built = groups.filter((g) => g.world.own).length
  const stock = groups.length - built
  const scope = options.scope ?? [stock === WORLDS.length ? 'FOUR WORLDS' : stock ? `${stock} WORLDS` : '', built ? `${built} ${built === 1 ? 'BUILD' : 'BUILDS'}` : ''].filter(Boolean).join(' · ')
  let sheet: Sheet | null = null
  let hover: Cell | null = null
  let scroll = options.scroll ?? 0
  let instance: p5 | null = null
  let release = () => {}
  // The piece the sheet opens on. Lit by the wall clock, not the show's:
  // the show may well be paused.
  const focus = options.focus ? groups.flatMap((g) => g.cells).find((c) => c.name === options.focus!.name && c.world.name === options.focus!.world) ?? null : null
  let landed = false
  const opened = performance.now()

  const maxScroll = () => (sheet ? Math.max(0, sheet.height - (sheet.bottom - sheet.top)) : 0)
  const hit = (x: number, y: number): Cell | null => {
    if (!sheet || y < sheet.top || y > sheet.bottom) return null
    const sy = y - sheet.top + scroll
    for (const band of sheet.bands) {
      const i = band.slots.findIndex((s) => x >= s.x && x < s.x + s.w && sy >= s.y && sy < s.y + s.h)
      if (i >= 0) return band.group.cells[i]
    }
    return null
  }

  const sketch = (p: p5) => {
    p.setup = () => {
      const { canvas: c, release: stop } = setupCanvas(p, host)
      release = stop
      // The canvas takes the clicks, not the window: the panel sits beside it.
      c.elt.addEventListener('mousemove', (e: MouseEvent) => {
        hover = hit(e.offsetX, e.offsetY)
        c.elt.style.cursor = hover ? 'pointer' : 'default'
      })
      c.elt.addEventListener('mouseleave', () => {
        hover = null
      })
      c.elt.addEventListener('click', (e: MouseEvent) => {
        const cell = hit(e.offsetX, e.offsetY)
        if (cell) onPick(cell.name, cell.world.name)
      })
      c.elt.addEventListener(
        'wheel',
        (e: WheelEvent) => {
          e.preventDefault()
          scroll = clamp(scroll + e.deltaY, 0, maxScroll())
        },
        { passive: false },
      )
      let touchY: number | null = null
      c.elt.addEventListener('touchstart', (e: TouchEvent) => {
        touchY = e.touches[0]?.clientY ?? null
      })
      c.elt.addEventListener(
        'touchmove',
        (e: TouchEvent) => {
          if (touchY === null) return
          e.preventDefault()
          const y = e.touches[0].clientY
          scroll = clamp(scroll + (touchY - y), 0, maxScroll())
          touchY = y
        },
        { passive: false },
      )
    }

    p.draw = () => {
      const t = clock.time()
      if (!groups.length) {
        p.background(getComputedStyle(host).getPropertyValue('--paper') || '#EBF1F4')
        return
      }
      sheet = layout(p.width, p.height, groups)
      // The first frame: if the piece come back from is off screen where the
      // sheet was left, bring its row to the middle.
      if (!landed && focus) {
        const visible = sheet.bottom - sheet.top
        for (const band of sheet.bands) {
          const slot = band.slots[band.group.cells.indexOf(focus)]
          if (slot && (slot.y < scroll || slot.y + slot.h > scroll + visible)) scroll = slot.y + slot.h / 2 - visible / 2
        }
      }
      landed = true
      scroll = clamp(scroll, 0, maxScroll())
      const lit = focus ? clamp(1 - (performance.now() - opened) / 1000 / LIT) : 0
      drawSheet(p, sheet, scroll, t, hover, lit > 0 ? { cell: focus!, lit } : null, `${total} ${total === 1 ? 'PIECE' : 'PIECES'} · ${scope} · ${seed}`, options.hints ?? HINTS)
    }
  }

  instance = new p5(sketch)

  return {
    scroll: () => scroll,
    savePng(filename, scale) {
      if (instance) savePng(instance, filename, exportScale(instance, scale))
    },
    exportSize: (scale) => (instance ? exportSize(instance, scale) : [0, 0]),
    destroy() {
      release()
      instance?.remove()
      instance = null
    },
  }
}

/** As much of the hint as the sheet is wide enough for. */
const HINTS = ['click a piece to watch it alone · scroll for the other worlds · esc for the machine', 'click a piece to watch it alone']

/** The piece the sheet opened on, and how lit it still is, 1 to 0. */
interface Lit {
  cell: Cell
  lit: number
}

function drawSheet(
  p: p5,
  sheet: Sheet,
  scroll: number,
  t: number,
  hover: Cell | null,
  lit: Lit | null,
  title: string,
  hints: readonly string[],
): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const W = p.width
  const H = p.height
  // The fixed header and footer stand on whichever band runs under them, so
  // they read as the sheet's own margin wherever it is scrolled to, rather
  // than as a bar of another world's paper laid over this one.
  const under = (y: number) => (sheet.bands.find((b) => y - sheet.top + scroll < b.y1) ?? sheet.bands[sheet.bands.length - 1]).group.theme
  const first = under(sheet.top)
  const last = under(sheet.bottom)
  p.background(first.bg)

  // The bands, each in its world's paper, with its pieces standing on shelves in its ink.
  p.push()
  ctx.beginPath()
  ctx.rect(0, sheet.top, W, sheet.bottom - sheet.top)
  ctx.clip()
  const shift = sheet.top - scroll
  for (const band of sheet.bands) {
    const { theme } = band.group
    const y0 = band.y0 + shift
    const y1 = band.y1 + shift
    if (y1 < sheet.top || y0 > sheet.bottom) continue
    p.noStroke()
    p.fill(theme.bg)
    p.rect(W / 2, (y0 + y1) / 2, W, y1 - y0)
    band.group.cells.forEach((cell, i) => {
      const slot = band.slots[i]
      if (slot.y + shift > sheet.bottom || slot.y + slot.h + shift < sheet.top) return
      drawCell(p, cell, slot, shift, t)
      // A wash of ink over the piece in hand: the one the pointer is on,
      // and for a moment the one the sheet opened on. Over the cell and not
      // under it, since a cell paints its own paper.
      const held = cell === hover ? 1 : cell === lit?.cell ? lit.lit : 0
      if (held > 0) {
        const wash = p.color(theme.ink)
        wash.setAlpha(16 * held)
        p.noStroke()
        p.fill(wash)
        p.rect(slot.x + slot.w / 2, slot.y + slot.h / 2 + shift, slot.w - 6, slot.h - 6, 8)
      }
    })
    drawBandCaptions(p, band, shift, hover ?? lit?.cell ?? null)
  }
  p.pop()

  // A scrollbar when there is more sheet than screen.
  const visible = sheet.bottom - sheet.top
  if (sheet.height > visible) {
    const track = visible - 8
    const thumb = Math.max(24, (track * visible) / sheet.height)
    const at = sheet.top + 4 + ((track - thumb) * scroll) / (sheet.height - visible)
    const bar = p.color(first.ink)
    bar.setAlpha(70)
    p.noStroke()
    p.fill(bar)
    p.rect(W - 5, at + thumb / 2, 3, thumb, 1.5)
  }

  // The fixed header and footer, on the first and last worlds' paper.
  p.push()
  p.textFont(FONT)
  p.textAlign(p.CENTER, p.TOP)
  p.noStroke()
  const dim = p.color(first.ink)
  dim.setAlpha(120)
  p.fill(dim)
  p.textSize(sheet.font * 0.9)
  ctx.letterSpacing = '0.14em'
  // The way back sits in the top left corner; on a narrow sheet the title
  // would run under it, and the way back matters more.
  const heading = title.toUpperCase()
  if ((W - p.textWidth(heading)) / 2 > CORNER) p.text(heading, W / 2, sheet.header)
  p.noStroke()
  p.fill(last.bg)
  p.rect(W / 2, (sheet.bottom + H) / 2, W, H - sheet.bottom)
  const foot = p.color(last.ink)
  foot.setAlpha(120)
  p.fill(foot)
  ctx.letterSpacing = '0.04em'
  // As much of the hint as the sheet is wide enough for; none on a narrow
  // screen, where the panel's tab sits at the bottom centre, over it.
  const hint = W > NARROW ? hints.find((h) => p.textWidth(h) < W - 2 * CORNER) : null
  if (hint) p.text(hint, W / 2, sheet.footer)
  ctx.letterSpacing = '0px'
  p.pop()
}

/** One piece's world, fitted into its slot and stood on the shelf. */
function drawCell(p: p5, cell: Cell, slot: Slot, shift: number, t: number): void {
  const { u } = cell
  const local = (t + cell.offset) % u.journey
  const here = cell.show.at(local)
  const bw = cell.x1 - cell.x0 + 2 * SIDE
  const bh = cell.y1 - cell.y0 + ABOVE
  // Fit the extent, but never blow a small piece up past the sheet's scale.
  const k = Math.min(slot.box.w / bw, slot.box.h / bh, slot.box.h / 2.2)
  const w = bw * k
  const h = bh * k
  const view = { x: slot.box.x + (slot.box.w - w) / 2, y: slot.shelf + shift - h, w, h }
  // The lowest cell's ground line lands on the shelf.
  const cam = { x: (cell.x0 + cell.x1) / 2, y: cell.y1 - bh / 2 }
  drawWorld(p, cell.show, local, here, cam, k, view, false)
}

function drawBandCaptions(p: p5, band: Band, shift: number, hover: Cell | null): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const { theme, world, cells } = band.group
  const ink = p.color(theme.ink)
  const dim = p.color(theme.ink)
  dim.setAlpha(120)
  const rule = p.color(theme.ink)
  rule.setAlpha(60)
  const font = band.slots.length ? (band.slots[0].label - band.slots[0].shelf) / 0.7 : 12

  p.push()
  p.textFont(FONT)
  p.textAlign(p.CENTER, p.TOP)

  // A shelf under each piece, so they all stand on a line rather than float.
  p.strokeWeight(1)
  band.slots.forEach((s, i) => {
    p.stroke(cells[i] === hover ? ink : rule)
    p.line(s.box.x + s.box.w * 0.08, s.shelf + shift, s.box.x + s.box.w * 0.92, s.shelf + shift)
  })

  p.noStroke()
  p.textSize(font)
  ctx.letterSpacing = '0.01em'
  band.slots.forEach((s, i) => {
    p.fill(cells[i] === hover ? ink : dim)
    p.text(cells[i].name, s.x + s.w / 2, s.label + shift)
  })

  // The world's name, and where it comes in the loop.
  p.fill(ink)
  p.textAlign(p.LEFT, p.CENTER)
  p.textSize(font * 0.95)
  ctx.letterSpacing = '0.14em'
  const x = band.slots.length ? Math.min(...band.slots.map((s) => s.x)) + 6 : 20
  const order = WORLDS.indexOf(world)
  // As much of the caption as the band is wide enough for: the name first.
  const clauses = [world.label, `${cells.length} ${cells.length === 1 ? 'piece' : 'pieces'}`, order >= 0 ? `${ORDINAL[order]} in the loop` : world.staged ?? 'a build, beside the loop', world.note]
  let caption = ''
  for (let n = clauses.length; n > 0 && !caption; n--) {
    const text = clauses.slice(0, n).join(' · ').toUpperCase()
    if (n === 1 || x + p.textWidth(text) < p.width - x) caption = text
  }
  p.text(caption, x, band.title + shift)
  ctx.letterSpacing = '0px'
  p.pop()
}

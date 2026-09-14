import p5 from 'p5'
import { clamp } from '../../../src/core/ease'
import type { Theme } from '../../../src/core/themes'
import { drawWorld, setupCanvas, type Clock, type Viewport } from './engine'
import { R } from './parts'
import { Show } from './show'
import { universeAt, type Universe } from './universe'
import { WORLDS, type World } from './worlds'

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
 * scrolls. Click a piece to watch it alone.
 */

export interface Catalog {
  destroy(): void
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

const ORDINAL = ['first', 'second', 'third', 'fourth']

function buildCell(seed: string, world: World, name: string, i: number): Cell {
  const show = new Show(seed, { solo: name, world: world.name })
  const u = show.universe(0)
  let x0 = u.bounds.x0 - 0.5
  let x1 = u.bounds.x1 + 0.5
  let y0 = u.bounds.y0 - 0.5
  const y1 = u.bounds.y1 + 0.5
  // A flight can peak above every cell it crosses.
  const n = Math.ceil(u.journey * 30)
  for (let j = 0; j <= n; j++) {
    const at = universeAt(u, (u.journey * j) / n)
    x0 = Math.min(x0, at.x - R)
    x1 = Math.max(x1, at.x + R)
    y0 = Math.min(y0, at.y - R)
  }
  return { name, world, show, u, x0, y0, x1, y1, offset: (i * 0.618 * u.journey) % u.journey }
}

/** Every world's pieces, in the loop's order. The portal is the same door everywhere, so it is shown once. */
function buildGroups(seed: string): Group[] {
  let i = 0
  return WORLDS.map((world, w) => {
    const names = world.pieces.filter((piece) => w === 0 || piece.name !== 'portal').map((piece) => piece.name)
    const cells = names.map((name) => buildCell(seed, world, name, i++))
    return { world, theme: cells[0].u.theme, cells }
  })
}

function layout(W: number, H: number, groups: Group[]): Sheet {
  const short = Math.min(W, H)
  const font = Math.max(10, Math.min(13, short * 0.018))
  const pad = Math.max(12, Math.min(28, short * 0.035))
  const header = pad
  const footer = H - pad - font
  const top = header + font * 2.4
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

export function createCatalog(host: HTMLElement, seed: string, clock: Clock, onPick: (name: string, world: string) => void): Catalog {
  const groups = buildGroups(seed)
  const total = groups.reduce((sum, g) => sum + g.cells.length, 0)
  let sheet: Sheet | null = null
  let hover: Cell | null = null
  let scroll = 0
  let instance: p5 | null = null
  let release = () => {}

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
      sheet = layout(p.width, p.height, groups)
      scroll = clamp(scroll, 0, maxScroll())
      drawSheet(p, sheet, groups, scroll, t, hover, seed, total)
    }
  }

  instance = new p5(sketch)

  return {
    destroy() {
      release()
      instance?.remove()
      instance = null
    },
  }
}

function drawSheet(p: p5, sheet: Sheet, groups: Group[], scroll: number, t: number, hover: Cell | null, seed: string, total: number): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const W = p.width
  const H = p.height
  const first = groups[0].theme
  const last = groups[groups.length - 1].theme
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
    })
    drawBandCaptions(p, band, shift, hover)
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
  p.text(`${total} PIECES · FOUR WORLDS · ${seed}`.toUpperCase(), W / 2, sheet.header)
  p.noStroke()
  p.fill(last.bg)
  p.rect(W / 2, (sheet.bottom + H) / 2, W, H - sheet.bottom)
  const foot = p.color(last.ink)
  foot.setAlpha(120)
  p.fill(foot)
  ctx.letterSpacing = '0.04em'
  p.text('click a piece to watch it alone · scroll for the other worlds · esc for the machine', W / 2, sheet.footer)
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
  p.text(`${world.label} · ${cells.length} pieces · ${ORDINAL[order]} in the loop · ${world.note}`.toUpperCase(), x, band.title + shift)
  ctx.letterSpacing = '0px'
  p.pop()
}

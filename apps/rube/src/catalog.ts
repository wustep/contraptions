import p5 from 'p5'
import type { Theme } from '../../../src/core/themes'
import { drawWorld, setupCanvas, type Clock, type Viewport } from './engine'
import { R } from './parts'
import { catalog } from './pieces'
import { Show } from './show'
import { universeAt, type Universe } from './universe'

/**
 * The catalog: a sheet of every piece, each looping on its own between two
 * portals, in the show's own hand. Every cell is the solo world for one
 * piece — the same `Show(seed, solo)` that `?solo=` builds — drawn small
 * with a fixed camera that fits the piece and wherever the ball goes, and
 * stood on a shelf with its name under it. The ball is out of sight at both
 * ends of a solo world, so the loop has no seam. Click a piece to watch it
 * alone.
 */

export interface Catalog {
  destroy(): void
}

interface Cell {
  name: string
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

interface Slot {
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

interface Sheet {
  slots: Slot[]
  font: number
  header: number
  footer: number
}

/** The explorer's type stack for its catalog sheet. This is the only text in the show. */
const FONT = 'Inter, "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'

/** Cells of breathing room around a piece: at the sides, and above. */
const SIDE = 0.15
const ABOVE = 0.2

function buildCell(seed: string, name: string, i: number): Cell {
  const show = new Show(seed, name)
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
  return { name, show, u, x0, y0, x1, y1, offset: (i * 0.618 * u.journey) % u.journey }
}

function layout(W: number, H: number, n: number): Sheet {
  const short = Math.min(W, H)
  const font = Math.max(10, Math.min(13, short * 0.018))
  const pad = Math.max(12, Math.min(28, short * 0.035))
  const header = pad
  const footer = H - pad - font
  const area = { x: pad, y: header + font * 2.4, w: W - 2 * pad, h: footer - font * 1.6 - (header + font * 2.4) }
  // Cells about five by four, in however many columns keep them biggest.
  let cols = 1
  let best = 0
  for (let c = 1; c <= n; c++) {
    const size = Math.min(area.w / c / 1.25, area.h / Math.ceil(n / c))
    if (size > best) {
      best = size
      cols = c
    }
  }
  const cw = area.w / cols
  const ch = area.h / Math.ceil(n / cols)
  const gap = Math.max(5, Math.min(14, cw * 0.045))
  const band = font * 2
  const slots: Slot[] = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols)
    const inRow = Math.min(cols, n - row * cols)
    // A short last row sits centred.
    const x = area.x + ((cols - inRow) * cw) / 2 + (i - row * cols) * cw
    const y = area.y + row * ch
    const box = { x: x + gap, y: y + gap, w: cw - 2 * gap, h: ch - 2 * gap - band }
    const shelf = box.y + box.h
    slots.push({ x, y, w: cw, h: ch, box, shelf, label: shelf + font * 0.7 })
  }
  return { slots, font, header, footer }
}

export function createCatalog(host: HTMLElement, seed: string, clock: Clock, onPick: (name: string) => void): Catalog {
  const cells = catalog.map((piece, i) => buildCell(seed, piece.name, i))
  const theme = cells[0].u.theme
  let sheet: Sheet | null = null
  let hover = -1
  let instance: p5 | null = null
  let release = () => {}

  const hit = (x: number, y: number): number =>
    sheet ? sheet.slots.findIndex((s) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h) : -1

  const sketch = (p: p5) => {
    p.setup = () => {
      const { canvas: c, release: stop } = setupCanvas(p, host)
      release = stop
      // The canvas takes the clicks, not the window: the panel sits beside it.
      c.elt.addEventListener('mousemove', (e: MouseEvent) => {
        hover = hit(e.offsetX, e.offsetY)
        c.elt.style.cursor = hover >= 0 ? 'pointer' : 'default'
      })
      c.elt.addEventListener('mouseleave', () => {
        hover = -1
      })
      c.elt.addEventListener('click', (e: MouseEvent) => {
        const i = hit(e.offsetX, e.offsetY)
        if (i >= 0) onPick(cells[i].name)
      })
    }

    p.draw = () => {
      const t = clock.time()
      sheet = layout(p.width, p.height, cells.length)
      p.background(theme.bg)
      cells.forEach((cell, i) => drawCell(p, cell, sheet!.slots[i], t))
      drawCaptions(p, theme, sheet, cells, hover, seed)
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

/** One piece's world, fitted into its slot and stood on the shelf. */
function drawCell(p: p5, cell: Cell, slot: Slot, t: number): void {
  const { u } = cell
  const local = (t + cell.offset) % u.journey
  const here = cell.show.at(local)
  const bw = cell.x1 - cell.x0 + 2 * SIDE
  const bh = cell.y1 - cell.y0 + ABOVE
  // Fit the extent, but never blow a small piece up past the sheet's scale.
  const k = Math.min(slot.box.w / bw, slot.box.h / bh, slot.box.h / 2.2)
  const w = bw * k
  const h = bh * k
  const view = { x: slot.box.x + (slot.box.w - w) / 2, y: slot.shelf - h, w, h }
  // The lowest cell's ground line lands on the shelf.
  const cam = { x: (cell.x0 + cell.x1) / 2, y: cell.y1 - bh / 2 }
  drawWorld(p, cell.show, local, here, cam, k, view, false)
}

function drawCaptions(p: p5, theme: Theme, sheet: Sheet, cells: Cell[], hover: number, seed: string): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const ink = p.color(theme.ink)
  const dim = p.color(theme.ink)
  dim.setAlpha(120)
  const rule = p.color(theme.ink)
  rule.setAlpha(60)

  p.push()
  p.textFont(FONT)
  p.textAlign(p.CENTER, p.TOP)

  // A shelf under each piece, so they all stand on a line rather than float.
  p.strokeWeight(1)
  sheet.slots.forEach((s, i) => {
    p.stroke(i === hover ? ink : rule)
    p.line(s.box.x + s.box.w * 0.08, s.shelf, s.box.x + s.box.w * 0.92, s.shelf)
  })

  p.noStroke()
  p.textSize(sheet.font)
  ctx.letterSpacing = '0.01em'
  sheet.slots.forEach((s, i) => {
    p.fill(i === hover ? ink : dim)
    p.text(cells[i].name, s.x + s.w / 2, s.label)
  })

  p.fill(dim)
  p.textSize(sheet.font * 0.9)
  ctx.letterSpacing = '0.14em'
  p.text(`${cells.length} PIECES · ${seed}`.toUpperCase(), p.width / 2, sheet.header)
  ctx.letterSpacing = '0.04em'
  p.text('click a piece to watch it alone · esc for the machine', p.width / 2, sheet.footer)
  ctx.letterSpacing = '0px'
  p.pop()
}

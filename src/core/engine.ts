import p5 from 'p5'
import { CANVAS } from './constants'
import { mod } from './ease'
import { strokeWeight, type Composition } from './composition'
import { FIRE_DECAY } from './wiring'

export interface Engine {
  setComposition(next: Composition): void
  /** Resize the canvas in place. The caller rebuilds the composition to match. */
  resize(size: number): void
  setPaused(paused: boolean): void
  paused(): boolean
  setSpeed(speed: number): void
  /** Overlay faint cell outlines, for judging layouts and span placement. */
  setGrid(on: boolean): void
  /** Position within the master loop, 0..1. */
  progress(): number
  setProgress(u: number): void
  /**
   * Save a PNG. `scale` supersamples: the canvas is redrawn at that pixel
   * density for one frame, captured, and put back. 1 is what you see, 4 is
   * print-sized.
   */
  savePng(filename: string, scale?: number): void
  destroy(): void
}

/**
 * Wiring is drawn in two passes. The conduit runs under the machines, so it
 * reads as plumbing behind the panels; the terminals and the travelling bead go
 * on top, so the causal link stays legible however busy the cell is.
 */
function drawConduits(p: p5, comp: Composition): void {
  if (!comp.wires.length) return
  // One pen for the piece: see Composition.unit.
  const base = strokeWeight(comp.unit ?? comp.wires[0].from.size, comp.theme, comp.options.stroke)

  p.push()
  p.noFill()
  for (const w of comp.wires) {
    p.stroke(comp.theme.ink)
    p.strokeWeight(base * 3.2)
    p.line(w.from.x, w.from.y, w.to.x, w.to.y)
    p.stroke(comp.theme.bg)
    p.strokeWeight(base * 1.6)
    p.line(w.from.x, w.from.y, w.to.x, w.to.y)
  }
  p.pop()
}

function drawSignals(p: p5, comp: Composition, loopFrame: number): void {
  if (!comp.wires.length) return
  const base = strokeWeight(comp.unit ?? comp.wires[0].from.size, comp.theme, comp.options.stroke)

  p.push()
  p.stroke(comp.theme.ink)
  p.strokeWeight(base)

  // Junctions sit where the conduit crosses between two cells, not on the cell
  // centres — a terminal drawn on a centre punches a hole through the machine
  // it is supposed to be feeding. A link only ever joins equal-sized cells, so
  // its own cell size is what a junction and a bead are drawn against.
  for (const w of comp.wires) {
    const unit = w.from.size
    p.fill(comp.theme.bg)
    p.circle((w.from.x + w.to.x) / 2, (w.from.y + w.to.y) / 2, unit * 0.17)
    if (w.last) {
      // A bar across the far end, so a run visibly terminates somewhere.
      const dx = Math.sign(w.to.x - w.from.x)
      const dy = Math.sign(w.to.y - w.from.y)
      const at = 0.68
      const cx = w.from.x + (w.to.x - w.from.x) * at
      const cy = w.from.y + (w.to.y - w.from.y) * at
      p.line(cx - dy * unit * 0.12, cy - dx * unit * 0.12, cx + dy * unit * 0.12, cy + dx * unit * 0.12)
    }
  }

  for (const w of comp.wires) {
    const travel = mod(loopFrame - w.start, comp.loop) / (w.end - w.start)
    if (travel > 1) continue
    p.fill(w.color)
    p.circle(
      w.from.x + (w.to.x - w.from.x) * travel,
      w.from.y + (w.to.y - w.from.y) * travel,
      w.from.size * 0.26,
    )
  }
  p.pop()
}

/** Type stack for the catalog sheet. Nothing else in the app draws text. */
const CAPTION_FONT =
  'Inter, "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'

function drawCaptions(p: p5, comp: Composition): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  const dim = p.color(comp.theme.ink)
  dim.setAlpha(120)
  const rule = p.color(comp.theme.ink)
  rule.setAlpha(60)

  p.push()
  p.textFont(CAPTION_FONT)
  p.textAlign(p.CENTER, p.TOP)

  p.stroke(rule)
  p.strokeWeight(1)
  for (const c of comp.captions) {
    // A shelf under each machine, so they all sit on the same ground line
    // instead of floating at whatever height their drawing happens to end.
    p.line(c.x - c.rule / 2, c.y - c.size * 0.55, c.x + c.rule / 2, c.y - c.size * 0.55)
  }

  p.noStroke()
  for (const c of comp.captions) {
    p.fill(comp.theme.ink)
    p.textSize(c.size)
    ctx.letterSpacing = '0.01em'
    p.text(c.text, c.x, c.y)
    if (!c.sub) continue
    p.fill(dim)
    p.textSize(c.size * 0.78)
    ctx.letterSpacing = '0.07em'
    p.text(c.sub.toUpperCase(), c.x, c.y + c.size * 1.25)
  }

  if (comp.header) {
    p.fill(dim)
    p.textSize(comp.captions[0].size * 0.9)
    ctx.letterSpacing = '0.14em'
    p.textAlign(p.CENTER, p.TOP)
    p.text(comp.header.toUpperCase(), p.width / 2, p.height * 0.032)
  }
  ctx.letterSpacing = '0px'
  p.pop()
}

function drawGrid(p: p5, comp: Composition): void {
  const c = p.color(comp.theme.ink)
  c.setAlpha(36)
  p.push()
  p.noFill()
  p.stroke(c)
  p.strokeWeight(1)
  for (const cell of comp.cells) p.rect(cell.x, cell.y, cell.w, cell.h)
  p.pop()
}

/**
 * Wraps a p5 instance. The engine owns the clock; every contraption is a pure
 * function of it, so pausing, scrubbing, and exporting all fall out for free.
 */
export function createEngine(host: HTMLElement, initial: Composition, size = CANVAS): Engine {
  let comp = initial
  let frame = 0
  let speed = 1
  let paused = false
  let grid = false
  let instance: p5 | null = null
  let edge = size

  /**
   * One canvas pixel per device pixel. Anything else means the browser
   * resamples the canvas on its way to the screen, which is what makes crisp
   * 2px ink look like 3px of grey.
   */
  const density = () => window.devicePixelRatio || 1

  const sketch = (p: p5) => {
    p.setup = () => {
      const canvas = p.createCanvas(edge, edge)
      canvas.parent(host)
      p.pixelDensity(density())
      p.rectMode(p.CENTER)
      p.angleMode(p.RADIANS)
      p.strokeCap(p.ROUND)
      p.strokeJoin(p.ROUND)
    }

    p.draw = () => {
      const { theme } = comp
      p.background(theme.bg)
      const loopFrame = mod(frame, comp.loop)

      if (grid) drawGrid(p, comp)
      if (comp.showWires !== false) drawConduits(p, comp)

      // One pen for the piece: see Composition.unit.
      const pen = comp.unit ? strokeWeight(comp.unit, theme, comp.options.stroke) : null

      const each = (pass: 'draw' | 'over') => {
        for (const inst of comp.instances) {
          const { cell, contraption } = inst
          const fn = pass === 'draw' ? contraption.draw : contraption.over
          if (!fn) continue
          const t = frame + inst.phase
          const u = mod(t, inst.period) / inst.period
          p.push()
          p.translate(cell.x, cell.y)
          p.rotate(inst.angle)
          p.scale(inst.mirror, 1)
          fn.call(contraption, p, inst.state, {
            size: cell.size,
            w: cell.w,
            h: cell.h,
            theme,
            t,
            u,
            weight: pen ?? strokeWeight(cell.size, theme, comp.options.stroke),
            ink: theme.ink,
            fired: Math.max(0, 1 - mod(loopFrame - inst.fireFrame, comp.loop) / FIRE_DECAY),
          })
          p.pop()
        }
      }

      each('draw')

      if (comp.showWires !== false) drawSignals(p, comp, loopFrame)

      for (const overlay of comp.overlays) {
        overlay(p, loopFrame, {
          theme,
          weight: (size) => (pen ?? strokeWeight(size, theme, comp.options.stroke)),
        })
      }

      // Parts that stand in front of the tokens: a tote wall, a cup lip, a hoop band.
      each('over')

      if (comp.captions.length) drawCaptions(p, comp)

      if (!paused) frame += speed
    }
  }

  instance = new p5(sketch)

  /** Paint one frame when the loop is stopped; a no-op while it is running. */
  const paintIfIdle = () => {
    if (paused) instance?.redraw()
  }

  return {
    setComposition(next) {
      comp = next
      paintIfIdle()
    },
    resize(next) {
      edge = next
      instance?.resizeCanvas(next, next)
      instance?.pixelDensity(density())
      paintIfIdle()
    },
    setPaused(next) {
      paused = next
      if (next) instance?.noLoop()
      else instance?.loop()
    },
    paused: () => paused,
    setSpeed(next) {
      speed = next
    },
    setGrid(next) {
      grid = next
      paintIfIdle()
    },
    progress: () => mod(frame, comp.loop) / comp.loop,
    setProgress(u) {
      frame = u * comp.loop
      paintIfIdle()
    },
    savePng(filename, scale = 1) {
      if (!instance) return
      // p5 exposes the element but @types/p5 does not declare it.
      const el = (instance as unknown as { canvas: HTMLCanvasElement }).canvas
      const wasPaused = paused
      const before = density()
      // Hold the clock so the capture matches what is on screen, redraw one
      // frame at the requested density, then put everything back. toBlob
      // snapshots the bitmap synchronously at call time — only the PNG
      // encoding is async — so the canvas can be restored immediately.
      paused = true
      if (scale !== 1) instance.pixelDensity(before * scale)
      // noLoop leaves the last frame on the canvas; still redraw so a
      // paused capture (or a density change) is painted, not stale.
      if (scale !== 1 || wasPaused) instance.redraw()
      el.toBlob((blob) => {
        if (!blob) return
        // A data: anchor is silently dropped by Chromium once the URL grows
        // past a couple of MB, which every scaled export does. A Blob URL has
        // no such cap. The anchor joins the document for Firefox's sake.
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${filename}.png`
        document.body.append(link)
        link.click()
        link.remove()
        // Leave the URL alive long enough for the download to begin.
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }, 'image/png')
      if (scale !== 1) {
        instance.pixelDensity(before)
        instance.redraw()
      }
      paused = wasPaused
    },
    destroy() {
      instance?.remove()
      instance = null
    },
  }
}

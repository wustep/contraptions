import p5 from 'p5'
import { CANVAS, FPS, LOOP_EXPORT_MAX_SECONDS } from './constants'
import { mod } from './ease'
import { strokeWeight, type Composition } from './composition'
import { FIRE_DECAY } from './wiring'

function canvasOf(instance: p5): HTMLCanvasElement {
  // p5 exposes the element but @types/p5 does not declare it.
  return (instance as unknown as { canvas: HTMLCanvasElement }).canvas
}

function downloadBlob(blob: Blob, filename: string): void {
  // A data: anchor is silently dropped by Chromium once the URL grows
  // past a couple of MB, which every scaled export does. A Blob URL has
  // no such cap. The anchor joins the document for Firefox's sake.
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Leave the URL alive long enough for the download to begin.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function webmMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

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
  /**
   * Save one seamless loop as WebM. Walks frame 0 .. loop (capped at 12s)
   * via the same clock `setProgress` owns, at the current canvas size — no
   * supersample. Holds the clock the way `savePng` does, then restores
   * progress. Progress never enters the URL; that stays a view-only dial.
   */
  saveLoop(filename: string): Promise<void>
  destroy(): void
}

/**
 * Wiring is drawn in two passes. The conduit runs under the machines, so it
 * reads as plumbing behind the panels; the terminals and the travelling bead go
 * on top, so the causal link stays legible however busy the cell is.
 */
function drawConduits(p: p5, comp: Composition): void {
  if (!comp.wires.length) return
  const unit = comp.wires[0].from.size
  const base = strokeWeight(unit, comp.theme, comp.options.stroke)

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
  const unit = comp.wires[0].from.size
  const base = strokeWeight(unit, comp.theme, comp.options.stroke)

  p.push()
  p.stroke(comp.theme.ink)
  p.strokeWeight(base)

  // Junctions sit where the conduit crosses between two cells, not on the cell
  // centres — a terminal drawn on a centre punches a hole through the machine
  // it is supposed to be feeding.
  for (const w of comp.wires) {
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
      unit * 0.26,
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
      drawConduits(p, comp)

      for (const inst of comp.instances) {
        const { cell, contraption } = inst
        const t = frame + inst.phase
        const u = mod(t, inst.period) / inst.period
        p.push()
        p.translate(cell.x, cell.y)
        p.rotate(inst.angle)
        p.scale(inst.mirror, 1)
        contraption.draw(p, inst.state, {
          size: cell.size,
          w: cell.w,
          h: cell.h,
          theme,
          t,
          u,
          weight: strokeWeight(cell.size, theme, comp.options.stroke),
          ink: theme.ink,
          fired: Math.max(0, 1 - mod(loopFrame - inst.fireFrame, comp.loop) / FIRE_DECAY),
        })
        p.pop()
      }

      drawSignals(p, comp, loopFrame)

      for (const overlay of comp.overlays) {
        overlay(p, loopFrame, {
          theme,
          weight: (size) => strokeWeight(size, theme, comp.options.stroke),
        })
      }

      if (comp.captions.length) drawCaptions(p, comp)

      if (!paused) frame += speed
    }
  }

  instance = new p5(sketch)

  return {
    setComposition(next) {
      comp = next
    },
    resize(next) {
      edge = next
      instance?.resizeCanvas(next, next)
      instance?.pixelDensity(density())
    },
    setPaused(next) {
      paused = next
    },
    paused: () => paused,
    setSpeed(next) {
      speed = next
    },
    setGrid(next) {
      grid = next
    },
    progress: () => mod(frame, comp.loop) / comp.loop,
    setProgress(u) {
      frame = u * comp.loop
    },
    savePng(filename, scale = 1) {
      if (!instance) return
      const el = canvasOf(instance)
      const wasPaused = paused
      const before = density()
      // Hold the clock so the capture matches what is on screen, redraw one
      // frame at the requested density, then put everything back. toBlob
      // snapshots the bitmap synchronously at call time — only the PNG
      // encoding is async — so the canvas can be restored immediately.
      paused = true
      if (scale !== 1) {
        instance.pixelDensity(before * scale)
        instance.redraw()
      }
      el.toBlob((blob) => {
        if (!blob) return
        downloadBlob(blob, `${filename}.png`)
      }, 'image/png')
      if (scale !== 1) {
        instance.pixelDensity(before)
        instance.redraw()
      }
      paused = wasPaused
    },
    async saveLoop(filename) {
      if (!instance) return
      const mime = webmMime()
      if (!mime) throw new Error('This browser cannot record a WebM from the canvas.')

      const el = canvasOf(instance)
      const wasPaused = paused
      const saved = frame
      // Same hold as savePng: freeze the clock. noLoop so p5's own tick
      // cannot paint extra frames into the capture stream while we walk.
      paused = true
      instance.noLoop()

      try {
        const frames = Math.min(comp.loop, FPS * LOOP_EXPORT_MAX_SECONDS)
        // captureStream(fps) timestamps from the live clock. Walking with
        // requestFrame(0) is faster but Chrome writes a 0-duration file, which
        // is a still by another name. Pace the walk at FPS so the WebM is a
        // real 4s / 12s loop of what you see.
        const stream = el.captureStream(FPS)

        const chunks: Blob[] = []
        const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }
        const stopped = new Promise<void>((resolve, reject) => {
          recorder.addEventListener('stop', () => resolve(), { once: true })
          recorder.addEventListener('error', () => reject(new Error('WebM recording failed')), { once: true })
        })

        recorder.start()
        await waitFrame()
        const origin = performance.now()
        for (let i = 0; i < frames; i++) {
          // setProgress(i / comp.loop) — same clock, walked from the start
          // of the loop so the file closes on the same frame it opens.
          frame = i
          instance.redraw()
          const target = origin + ((i + 1) * 1000) / FPS
          const delay = target - performance.now()
          if (delay > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, delay))
        }
        await new Promise<void>((resolve) => window.setTimeout(resolve, 1000 / FPS))
        if (recorder.state === 'recording') recorder.requestData()
        recorder.stop()
        await stopped
        for (const t of stream.getTracks()) t.stop()

        if (!chunks.length) throw new Error('WebM recording produced no data.')
        downloadBlob(new Blob(chunks, { type: 'video/webm' }), `${filename}.webm`)
      } finally {
        frame = saved
        instance.redraw()
        paused = wasPaused
        instance.loop()
      }
    },
    destroy() {
      instance?.remove()
      instance = null
    },
  }
}

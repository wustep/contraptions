import p5 from 'p5'
import { canvasOf, downloadBlob } from '../../../../src/core/capture'
import { drawWorld, drawingModes, followCamera, setupCanvas } from '../engine'
import { overviewCamera } from '../overview'
import { recordShow } from './record'
import { zoomFrame, type Framing, type Performance } from './registry'
import { wordPainter } from './words'

/**
 * A show's stage. The live canvas fills whatever the panel leaves, as
 * Machine's does; a file is a frame of its own at a size that was asked for
 * (16:9, or Shorts' 9:16 with the 16:9 show letterboxed), painted by the
 * same one function.
 *
 * The rule of this stage is that **the canvas is the picture and nothing
 * else**. The title, the credit, the clock, the play button: all of it is
 * the page's, in the panel or standing on the stage as DOM. And the rule is
 * kept by more than good manners: a show's canvas cannot set type at all
 * (`refuseType`), so a version that tried to letter its frame would find
 * nothing there, live or in the file.
 *
 * One exception, and only in a video: a show's end credits
 * (`Performance.titles`). Live they are DOM over the stage; a recording takes
 * the canvas alone, so the video's frame has the same cards painted over the
 * picture (`words.ts`), set on a canvas of their own and laid on as an image.
 * A PNG is still the picture alone.
 */

/** The frame a show is composed for. A camera's `cells` is how many of them this frame shows top to bottom. */
const ASPECT = 16 / 9
/** How much closer Zoom sits than the follow camera. */
export const FOLLOW_ZOOM = 1.5

export interface FrameSize {
  label: string
  w: number
  h: number
  /**
   * How a canvas that is not 16:9 is filled when a file is made.
   * `expand` (default): the live stage's rule — see more world around the
   * composed frame, never less of it.
   * `letterbox`: keep the 16:9 composition whole and pad the rest black.
   * Shorts use letterbox: shows are staged for 16:9, so inventing vertical
   * FOV or cropping the sides would break framing; black bars are honest.
   */
  fit?: 'expand' | 'letterbox'
}

/** The sizes a show is saved at. Default in the panel is 1080p. */
export const FRAME_SIZES: FrameSize[] = [
  { label: '720p', w: 1280, h: 720 },
  { label: '1080p', w: 1920, h: 1080 },
  // YouTube Shorts: 1080×1920 (9:16). Letterbox the 16:9 show — see FrameSize.fit.
  { label: 'Shorts', w: 1080, h: 1920, fit: 'letterbox' },
]

/** Where the 16:9 composition sits inside a saved frame. */
export function contentRect(size: FrameSize): { x: number; y: number; w: number; h: number } {
  if (size.fit !== 'letterbox') return { x: 0, y: 0, w: size.w, h: size.h }
  const w = size.w
  const h = Math.round(size.w / ASPECT)
  return { x: 0, y: Math.floor((size.h - h) / 2), w, h }
}

/** One frame of a show into `dest` (defaults to the whole of `p`). */
export function paintShow(
  p: p5,
  perf: Performance,
  t: number,
  overview = false,
  zoom = false,
  dest?: { x: number; y: number; w: number; h: number },
): void {
  const time = Math.max(0, Math.min(perf.duration, t))
  const here = perf.show.at(time)
  const cam: Framing = perf.camera?.(time) ?? followCamera(perf.show, time, here)
  // Zoom is a tighter follow. Overview is the whole world and wins if both are asked.
  let follow = zoom && !overview ? zoomFrame(cam, FOLLOW_ZOOM) : cam
  const x = dest?.x ?? 0
  const y = dest?.y ?? 0
  const W = dest?.w ?? p.width
  const H = dest?.h ?? p.height
  // The composed frame is always whole: a stage wider or taller than 16:9 sees more world around it, never less of it.
  const k = Math.min(W / ASPECT, H) / follow.cells
  // A stage taller than 16:9 sets the composed frame where the show says (`Performance.tall`), not always midway.
  const below = overview || perf.tall === undefined ? 0 : (perf.tall - 0.5) * Math.max(0, H - W / ASPECT)
  if (below) follow = { ...follow, y: follow.y - below / k }
  const full = overview ? overviewCamera(perf.overview?.(time) ?? here.universe.bounds, W, H) : null
  drawWorld(p, perf.show, time, here, full ?? follow, full?.scale ?? k, { x, y, w: W, h: H }, perf.cuts ? perf.cuts(time) : true)
}

/** No glyph reaches this canvas. The arcade's digits are drawn as pixels and are picture; lettering is not. */
function refuseType(p: p5): void {
  const ctx = p.drawingContext as CanvasRenderingContext2D
  let told = false
  const refuse = () => {
    if (told || !import.meta.env.DEV) return
    told = true
    console.warn('A show’s canvas sets no type: words belong to the page, so that a saved frame has none. The text was not drawn.')
  }
  ctx.fillText = refuse
  ctx.strokeText = refuse
}

export interface ShowStage {
  setOverview(on: boolean): void
  setZoom(on: boolean): void
  /** Put a version on the stage, or clear it. */
  set(perf: Performance | null): void
  /** The frame at `t` as a PNG at `size`: the picture alone, no credits. */
  savePng(filename: string, size: FrameSize, t: number): Promise<void>
  /** The same PNG, handed back rather than saved: for share cards (`scripts/shows/show-cards.mjs`). */
  png(size: FrameSize, t: number): Promise<Blob | null>
  /**
   * The whole show as a video at `size`, picture and music, played through
   * once at `speed`. Resolves true when a file was saved, false when
   * `signal` stopped it. The frame being recorded stands over the stage
   * while it is made. The show's credits are painted into it, since the
   * page's words are not in a canvas's stream; Overview's file has none, as
   * Overview live has none.
   */
  saveVideo(filename: string, size: FrameSize, speed: number, monitor: boolean, signal: AbortSignal, progress?: (done: number) => void): Promise<boolean>
  destroy(): void
}

export function createShowStage(host: HTMLElement, clock: { time(): number }): ShowStage {
  let overview = false
  let zoom = false
  let perf: Performance | null = null
  let release = () => {}
  let lastPaper = ''

  const live = new p5((p: p5) => {
    p.setup = () => {
      release = setupCanvas(p, host).release
      refuseType(p)
    }
    p.draw = () => {
      if (!perf) {
        p.clear()
        return
      }
      paintShow(p, perf, clock.time(), overview, zoom)
      // The stage behind the canvas is the world's paper, so a resize never flashes the panel's dark.
      const paper = perf.show.at(Math.min(perf.duration, Math.max(0, clock.time()))).universe.theme.bg
      if (paper !== lastPaper) {
        lastPaper = paper
        host.style.setProperty('--paper', paper)
      }
    }
  })

  /**
   * A canvas of exactly `size`, at one density, that paints a frame when it is
   * asked for one and at no other time. A video's stands over the stage while
   * it is made, fitted to it, so what is being saved is what is being looked
   * at; a still's is never seen. Only a video's has the credits painted over it.
   */
  function frame(size: FrameSize, showing: Performance, shown: boolean): { canvas: HTMLCanvasElement; paint(t: number): void; remove(): void } {
    const full = overview
    const tight = zoom
    const holder = document.createElement('div')
    holder.className = 'show-frame'
    holder.hidden = !shown
    host.append(holder)
    let at = 0
    const box = contentRect(size)
    // Credits sit on the 16:9 composition, not on the letterbox bars.
    const words = shown && !full && showing.titles ? wordPainter(box.w, box.h, box.x, box.y) : null
    const p = new p5((s: p5) => {
      s.setup = () => {
        s.pixelDensity(1)
        s.createCanvas(size.w, size.h).parent(holder)
        drawingModes(s)
        refuseType(s)
        s.noLoop()
      }
      s.draw = () => {
        if (size.fit === 'letterbox') s.background(0)
        paintShow(s, showing, at, full, tight, size.fit === 'letterbox' ? box : undefined)
        if (words) words(s.drawingContext as CanvasRenderingContext2D, showing.titles!(Math.max(0, Math.min(showing.duration, at))))
      }
    })
    return {
      canvas: canvasOf(p),
      paint(t) {
        at = t
        p.redraw()
      },
      remove() {
        p.remove()
        holder.remove()
      },
    }
  }

  return {
    setOverview(on) { overview = on },
    setZoom(on) { zoom = on },
    set(next) {
      perf = next
      if (!next) {
        lastPaper = ''
        host.style.removeProperty('--paper')
      }
    },
    async png(size, t) {
      if (!perf) return null
      const f = frame(size, perf, false)
      try {
        f.paint(t)
        return await new Promise<Blob | null>((resolve) => f.canvas.toBlob(resolve, 'image/png'))
      } finally {
        f.remove()
      }
    },
    async savePng(filename, size, t) {
      const blob = await this.png(size, t)
      if (!blob) throw new Error('The frame could not be encoded.')
      downloadBlob(blob, `${filename}.png`)
    },
    async saveVideo(filename, size, speed, monitor, signal, progress) {
      const showing = perf
      if (!showing) return false
      const f = frame(size, showing, true)
      try {
        return await recordShow({
          canvas: f.canvas,
          filename,
          duration: showing.duration,
          speed,
          soundtrack: showing.soundtrack,
          monitor,
          paint: f.paint,
          progress,
          signal,
        })
      } finally {
        f.remove()
      }
    },
    destroy() {
      release()
      live.remove()
    },
  }
}

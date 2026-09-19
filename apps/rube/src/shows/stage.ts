import p5 from 'p5'
import { canvasOf, downloadBlob } from '../../../../src/core/capture'
import { drawWorld, drawingModes, followCamera, setupCanvas } from '../engine'
import { recordShow } from './record'
import type { Performance } from './registry'

/**
 * A show's stage. The live canvas fills whatever the panel leaves, as
 * Machine's does; a file is a frame of its own, 16:9 at a size that was
 * asked for, painted by the same one function.
 *
 * The rule of this stage is that **the canvas is the picture and nothing
 * else**. The title, the credit, the clock, the play button: all of it is
 * the page's, in the panel or standing on the stage as DOM, and none of it
 * is ever painted. So a file is clean because there is nothing to leave
 * out. And the rule is kept by more than good manners: a show's canvas
 * cannot set type at all (`refuseType`), so a version that tried to letter
 * its frame would find nothing there, live or in the file.
 */

/** The frame a show is composed for. A camera's `cells` is how many of them this frame shows top to bottom. */
const ASPECT = 16 / 9

export interface FrameSize {
  label: string
  w: number
  h: number
}

/** The sizes a show is saved at. */
export const FRAME_SIZES: FrameSize[] = [
  { label: '720p', w: 1280, h: 720 },
  { label: '1080p', w: 1920, h: 1080 },
]

/** One frame of a show, into the whole of whatever canvas `p` has. */
export function paintShow(p: p5, perf: Performance, t: number): void {
  const time = Math.max(0, Math.min(perf.duration, t))
  const here = perf.show.at(time)
  const cam = perf.camera?.(time) ?? followCamera(perf.show, time, here)
  const W = p.width
  const H = p.height
  // The composed frame is always whole: a stage wider or taller than 16:9 sees more world around it, never less of it.
  const k = Math.min(W / ASPECT, H) / cam.cells
  drawWorld(p, perf.show, time, here, cam, k, { x: 0, y: 0, w: W, h: H }, perf.cuts ? perf.cuts(time) : true)
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
  /** Put a version on the stage, or clear it. */
  set(perf: Performance | null): void
  /** The frame at `t` as a PNG at `size`: the picture alone. */
  savePng(filename: string, size: FrameSize, t: number): Promise<void>
  /**
   * The whole show as a video at `size`, picture and music, played through
   * once at `speed`. Resolves true when a file was saved, false when
   * `signal` stopped it. The frame being recorded stands over the stage
   * while it is made.
   */
  saveVideo(filename: string, size: FrameSize, speed: number, monitor: boolean, signal: AbortSignal, progress?: (done: number) => void): Promise<boolean>
  destroy(): void
}

export function createShowStage(host: HTMLElement, clock: { time(): number }): ShowStage {
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
      paintShow(p, perf, clock.time())
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
   * at; a still's is never seen.
   */
  function frame(size: FrameSize, showing: Performance, shown: boolean): { canvas: HTMLCanvasElement; paint(t: number): void; remove(): void } {
    const holder = document.createElement('div')
    holder.className = 'show-frame'
    holder.hidden = !shown
    host.append(holder)
    let at = 0
    const p = new p5((s: p5) => {
      s.setup = () => {
        s.pixelDensity(1)
        s.createCanvas(size.w, size.h).parent(holder)
        drawingModes(s)
        refuseType(s)
        s.noLoop()
      }
      s.draw = () => paintShow(s, showing, at)
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
    set(next) {
      perf = next
      if (!next) {
        lastPaper = ''
        host.style.removeProperty('--paper')
      }
    },
    async savePng(filename, size, t) {
      if (!perf) return
      const f = frame(size, perf, false)
      try {
        f.paint(t)
        const blob = await new Promise<Blob | null>((resolve) => f.canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('The frame could not be encoded.')
        downloadBlob(blob, `${filename}.png`)
      } finally {
        f.remove()
      }
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

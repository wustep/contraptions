import p5 from 'p5'
import { drawWorld, setupCanvas } from '../../engine'
import { drawParcel } from './art'
import { GiftAudio } from './audio'
import { GiftPerformance, GREEN, INK, PAPER } from './performance'

export interface Frame {
  time: number
  progress: number
  department: number
  caption: string
  finale: boolean
}

export class GiftStage {
  private sketch: p5
  private release = () => {}
  private elapsed = 0
  private origin = 0
  private hit = new Set<number>()
  private completed = false
  private ready = false
  running = false
  paused = false
  sealed = false
  preview = false
  selected = 0
  onFrame: (frame: Frame) => void = () => {}
  onDone: () => void = () => {}

  constructor(
    private host: HTMLElement,
    public performance: GiftPerformance,
    private audio: GiftAudio,
  ) {
    this.sketch = new p5((p) => {
      p.setup = () => {
        const setup = setupCanvas(p, host)
        this.release = setup.release
        p.pixelDensity(Math.min(2, window.devicePixelRatio || 1))
        const element = setup.canvas.elt as HTMLCanvasElement
        element.setAttribute('aria-hidden', 'true')
        if (!this.running) p.noLoop()
        this.ready = true
      }
      p.draw = () => this.draw(p)
    })
  }

  setPerformance(performance: GiftPerformance): void {
    this.stop()
    this.performance = performance
    this.redraw()
  }
  redraw(): void {
    if (this.ready) this.sketch.redraw()
  }
  start(): void {
    this.sealed = false
    this.elapsed = 0
    this.origin = window.performance.now()
    this.running = true
    this.paused = false
    this.completed = false
    this.hit.clear()
    this.audio.unlock()
    this.sketch.loop()
  }
  pause(): void {
    if (!this.running) return
    if (this.paused) {
      this.origin = window.performance.now()
      this.paused = false
      this.sketch.loop()
    } else {
      this.elapsed = this.time()
      this.paused = true
      this.sketch.noLoop()
    }
  }
  stop(): void {
    this.running = false
    this.paused = false
    this.elapsed = 0
    this.completed = false
    this.sketch.noLoop()
  }
  reveal(): void {
    this.elapsed = this.performance.duration
    this.complete()
  }
  private time(): number {
    return this.elapsed + (this.running && !this.paused ? (window.performance.now() - this.origin) / 1000 : 0)
  }
  private complete(): void {
    if (this.completed) return
    this.completed = true
    this.running = false
    this.paused = false
    this.sketch.noLoop()
    this.audio.finish()
    this.onDone()
  }

  private draw(p: p5): void {
    p.background(PAPER)
    if (this.sealed) {
      drawParcel(
        p,
        p.width / 2,
        p.height * 0.53,
        Math.min(p.width * 0.36, 180),
        -1,
        'fanfare',
        this.performance.recipe.hop,
      )
      return
    }
    const t = this.time()
    if (this.running && t >= this.performance.duration) {
      this.complete()
      return
    }
    if (this.running && !this.paused) {
      for (const [i, d] of this.performance.departments.entries()) {
        if (t >= d.fire && !this.hit.has(i)) {
          this.hit.add(i)
          this.audio.hit(d.id)
        }
      }
    }
    const active = this.performance.departmentAt(t)
    const finale = this.running && t >= this.performance.finaleStart
    if (finale)
      drawParcel(
        p,
        p.width / 2,
        p.height * 0.58,
        Math.min(p.width * 0.3, 160),
        this.preview ? -1 : t - this.performance.finaleStart,
        this.performance.recipe.finale,
        this.performance.recipe.hop,
      )
    else {
      const overview = !this.running
      const count = overview && p.width >= 520 ? 3 : 1
      for (let slot = 0; slot < count; slot++) {
        const i = overview ? (count === 1 ? this.selected : slot) : active
        const department = this.performance.departments[i]
        const e = department.extent
        const view = { x: (slot * p.width) / count, y: 0, w: p.width / count, h: p.height - (overview ? 38 : 0) }
        const k = Math.min(
          (view.w - 24) / (e.x1 - e.x0 + 0.3),
          (view.h - 54) / (e.y1 - e.y0 + 0.45),
          overview && count === 3 ? 100 : 200,
        )
        const frame = this.performance.atDepartment(i, overview ? department.start : t)
        if (overview) frame.hidden = true
        drawWorld(p, this.performance, t, frame, { x: (e.x0 + e.x1) / 2, y: (e.y0 + e.y1) / 2 }, k, view, false)
        p.noStroke()
        p.fill(INK)
        p.textFont('monospace')
        p.textSize(overview ? 11 : 12)
        p.textAlign(p.CENTER, p.CENTER)
        if (overview) {
          p.text(`0${i + 1} / ${department.title.toUpperCase()}`, view.x + view.w / 2, p.height - 23)
          if (slot < count - 1) {
            p.stroke('#d4d4c9')
            p.strokeWeight(1)
            p.line(view.x + view.w, 25, view.x + view.w, p.height - 50)
          }
        }
      }
    }
    if (!this.running) {
      p.noStroke()
      p.fill(GREEN)
      p.circle(18, 18, 5)
      p.fill(INK)
      p.textAlign(p.LEFT, p.CENTER)
      p.textFont('monospace')
      p.textSize(10)
      p.text('ALL SYSTEMS UNNECESSARY', 29, 18)
    }
    if (this.running)
      this.onFrame({
        time: t,
        progress: Math.min(1, t / this.performance.duration),
        department: active,
        caption: finale
          ? this.preview
            ? 'Delivery checked. Secret ending still sealed.'
            : 'All that, just to say…'
          : this.performance.departments[active].caption,
        finale,
      })
  }

  destroy(): void {
    this.release()
    this.sketch.remove()
    this.host.replaceChildren()
  }
}

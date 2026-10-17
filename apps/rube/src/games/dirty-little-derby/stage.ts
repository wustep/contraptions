import p5 from 'p5'
import { drawingModes, drawWorld } from '../../engine'
import { DerbyShow, drawTrackFurniture, PAPER, ROWS } from './race'
import type { Result } from './model'

export interface StageState {
  show: DerbyShow
  time: number
  playing: boolean
  demo: boolean
  photo: boolean
  names: [string, string]
}

export class DerbyStage {
  readonly state: StageState
  private readonly sketch: p5
  private readonly resize: ResizeObserver
  private demoStart = performance.now()

  constructor(
    host: HTMLElement,
    result: Result,
    readonly onFrame: () => void,
  ) {
    this.state = { show: new DerbyShow(result), time: -1, playing: false, demo: true, photo: false, names: ['Dot', 'Pip'] }
    this.sketch = new p5((p) => {
      p.setup = () => {
        const canvas = p.createCanvas(host.clientWidth, host.clientHeight)
        canvas.parent(host)
        canvas.elt.setAttribute('aria-hidden', 'true')
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2))
        drawingModes(p)
        p.frameRate(60)
      }
      p.draw = () => {
        if (!host.clientWidth || !host.clientHeight || document.hidden) return
        this.onFrame()
        const { show, names } = this.state
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const time = this.state.demo
          ? reduced
            ? -1
            : (((performance.now() - this.demoStart) / 1000) % (show.duration + 2.5)) - 1.5
          : this.state.time
        const mobile = p.width < 640
        if (this.state.photo) {
          const photoTime = Math.min(...show.runners.map((r) => r.finish))
          for (const racer of [0, 1] as const) {
            const view = {
              x: mobile ? 0 : (racer * p.width) / 2,
              y: mobile ? (racer * p.height) / 2 : 0,
              w: mobile ? p.width : p.width / 2,
              h: mobile ? p.height / 2 : p.height,
            }
            const zoom = Math.min(view.w / 5.9, view.h / 2.8)
            const camera = { x: 10.1, y: ROWS[racer] + 0.05 }
            drawWorld(p, show, photoTime, show.at(photoTime), camera, zoom, view, false)
            p.push()
            const ctx = p.drawingContext as CanvasRenderingContext2D
            ctx.beginPath()
            ctx.rect(view.x, view.y, view.w, view.h)
            ctx.clip()
            p.translate(view.x, view.y)
            drawTrackFurniture(p, show, photoTime, camera, zoom, view.w, view.h, names, false)
            p.noStroke()
            p.fill('#282c27')
            p.textFont('Arial')
            p.textSize(12)
            p.textAlign(p.LEFT, p.TOP)
            const behind = show.runners[racer].finish - photoTime
            p.text(names[racer], 18, 16)
            p.textSize(9)
            p.fill('#636c5e')
            p.text(behind < 0.005 ? 'ON THE LINE' : `+${behind.toFixed(2)}s BEHIND`, 18, 34)
            p.pop()
          }
          p.stroke('#bec6b2')
          p.strokeWeight(1)
          if (mobile) p.line(0, p.height / 2, p.width, p.height / 2)
          else p.line(p.width / 2, 0, p.width / 2, p.height)
          return
        }
        const k = mobile ? Math.min(p.width / 7.4, p.height / 6.4) : Math.min(p.width / 14.5, p.height / 6.4)
        // A common moving camera keeps both lanes together on narrow screens.
        const mean = (show.position(0, time).point.x + show.position(1, time).point.x) / 2
        const camera = { x: mobile ? Math.max(2.4, Math.min(9.7, mean + 0.65)) : 5.95, y: 2.85 }
        p.background(PAPER)
        drawWorld(p, show, time, show.at(time), camera, k, { x: 0, y: 0, w: p.width, h: p.height }, false)
        drawTrackFurniture(p, show, time, camera, k, p.width, p.height, names)
      }
    })
    this.resize = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return
      if (this.sketch.width !== host.clientWidth || this.sketch.height !== host.clientHeight)
        this.sketch.resizeCanvas(host.clientWidth, host.clientHeight)
    })
    this.resize.observe(host)
  }

  setRace(result: Result, names: [string, string]): void {
    this.state.show = new DerbyShow(result)
    this.state.names = names
    this.state.time = -1
    this.state.demo = false
    this.state.photo = false
  }

  setDemo(): void {
    this.state.demo = true
    this.demoStart = performance.now()
  }

  destroy(): void {
    this.resize.disconnect()
    this.sketch.remove()
  }
}

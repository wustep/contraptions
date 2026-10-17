import p5 from 'p5'
import { drawingModes, drawWorld } from '../../engine'
import { DerbyShow, drawTrackFurniture, PAPER } from './race'
import type { Result } from './model'

export interface StageState {
  show: DerbyShow
  time: number
  playing: boolean
  demo: boolean
  names: [string, string]
}

export class DerbyStage {
  readonly state: StageState
  private readonly sketch: p5
  private readonly resize: ResizeObserver
  private demoStart = performance.now()

  constructor(host: HTMLElement, result: Result, readonly onFrame: () => void) {
    this.state = { show: new DerbyShow(result), time: -1, playing: false, demo: true, names: ['Dot', 'Pip'] }
    this.sketch = new p5(p => {
      p.setup = () => {
        const canvas = p.createCanvas(host.clientWidth, host.clientHeight)
        canvas.parent(host)
        canvas.elt.setAttribute('aria-hidden', 'true')
        p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2))
        drawingModes(p)
        p.frameRate(60)
      }
      p.draw = () => {
        this.onFrame()
        const { show, names } = this.state
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const time = this.state.demo ? (reduced ? -1 : ((performance.now() - this.demoStart) / 1000) % (show.duration + 2.5) - 1.5) : this.state.time
        const mobile = p.width < 640
        const k = mobile ? Math.min(p.width / 7.4, p.height / 8.8) : Math.min(p.width / 14.5, p.height / 8.4)
        // A common moving camera keeps both lanes together on narrow screens.
        const mean = (show.position(0, time).point.x + show.position(1, time).point.x) / 2
        const camera = { x: mobile ? Math.max(2.4, Math.min(9.7, mean + 0.65)) : 5.95, y: 3.35 }
        p.background(PAPER)
        drawWorld(p, show, time, show.at(time), camera, k, { x: 0, y: 0, w: p.width, h: p.height }, false)
        drawTrackFurniture(p, show, time, camera, k, p.width, p.height, names)
      }
    })
    this.resize = new ResizeObserver(() => {
      if (this.sketch.width !== host.clientWidth || this.sketch.height !== host.clientHeight) this.sketch.resizeCanvas(host.clientWidth, host.clientHeight)
    })
    this.resize.observe(host)
  }

  setRace(result: Result, names: [string, string]): void {
    this.state.show = new DerbyShow(result)
    this.state.names = names
    this.state.time = -1
    this.state.demo = false
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

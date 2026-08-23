import p5 from 'p5'
import { CANVAS } from './constants'
import { mod } from './ease'
import { strokeWeight, type Composition } from './composition'

export interface Engine {
  setComposition(next: Composition): void
  setPaused(paused: boolean): void
  paused(): boolean
  setSpeed(speed: number): void
  /** Position within the master loop, 0..1. */
  progress(): number
  setProgress(u: number): void
  savePng(filename: string): void
  destroy(): void
}

/**
 * Wraps a p5 instance. The engine owns the clock; every contraption is a pure
 * function of it, so pausing, scrubbing, and exporting all fall out for free.
 */
export function createEngine(host: HTMLElement, initial: Composition): Engine {
  let comp = initial
  let frame = 0
  let speed = 1
  let paused = false
  let instance: p5 | null = null

  const sketch = (p: p5) => {
    p.setup = () => {
      const canvas = p.createCanvas(CANVAS, CANVAS)
      canvas.parent(host)
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1))
      p.rectMode(p.CENTER)
      p.angleMode(p.RADIANS)
      p.strokeCap(p.ROUND)
      p.strokeJoin(p.ROUND)
    }

    p.draw = () => {
      const { theme } = comp
      p.background(theme.bg)

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
          theme,
          t,
          u,
          weight: strokeWeight(cell.size, theme, comp.options.stroke),
          ink: theme.ink,
        })
        p.pop()
      }

      if (!paused) frame += speed
    }
  }

  instance = new p5(sketch)

  return {
    setComposition(next) {
      comp = next
    },
    setPaused(next) {
      paused = next
    },
    paused: () => paused,
    setSpeed(next) {
      speed = next
    },
    progress: () => mod(frame, comp.loop) / comp.loop,
    setProgress(u) {
      frame = u * comp.loop
    },
    savePng(filename) {
      instance?.saveCanvas(filename, 'png')
    },
    destroy() {
      instance?.remove()
      instance = null
    },
  }
}

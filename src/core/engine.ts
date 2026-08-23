import p5 from 'p5'
import { CANVAS } from './constants'
import { mod } from './ease'
import { strokeWeight, type Composition } from './composition'
import { FIRE_DECAY } from './wiring'

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
  for (const w of comp.wires) {
    p.fill(comp.theme.bg)
    p.circle(w.from.x, w.from.y, unit * 0.16)
    p.circle(w.to.x, w.to.y, unit * 0.16)
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
      const loopFrame = mod(frame, comp.loop)

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

      if (comp.labels.length) {
        p.push()
        p.noStroke()
        p.fill(theme.ink)
        p.textAlign(p.CENTER, p.TOP)
        p.textSize(Math.max(9, CANVAS * 0.0125))
        p.textFont('ui-monospace, SFMono-Regular, Menlo, monospace')
        for (const label of comp.labels) p.text(label.text, label.x, label.y)
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

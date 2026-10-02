import { alpha, frame, hash, scenery, smooth } from '../kit'
import { COPPER, INK, PAPER, SAGE, paper } from '../print'

export const HORIZON = 1.13
export const CLOUD_BASE = -26

/** The road occupies the bottom register. Everything above it is unprinted distance. */
export const sky = scenery<{ cloud: number }>({
  name: 'sky',
  draw(p, _s, c) {
    const { k, t } = c
    const f = frame(p, k)
    paper(p, k, f)
    const hy = f.cy + (HORIZON - f.cy) * 0.3
    if (hy > f.y1 + 1) return
    const X = (n: number) => n * k
    const ctx = p.drawingContext as CanvasRenderingContext2D
    // A solid printed field, cut into long furrows. A clear margin belongs to the route.
    ctx.fillStyle = INK
    ctx.fillRect(X(f.x0 - 1), X(hy + 0.34), X(f.x1 - f.x0 + 2), X(Math.max(0, f.y1 - hy + 1)))
    p.noFill()
    for (let i = 0; i < 19; i++) {
      const y = hy + 0.4 + i * i * 0.012
      p.stroke(i % 4 === 0 ? COPPER : PAPER)
      p.strokeWeight(Math.max(0.7, k * 0.012))
      p.beginShape()
      for (let x = Math.floor(f.x0) - 1; x <= f.x1 + 1; x += 0.2) {
        p.vertex(X(x), X(y + 0.027 * Math.sin(x * 1.2 + i * 2)))
      }
      p.endShape()
    }
    p.stroke(SAGE)
    p.strokeWeight(Math.max(0.7, k * 0.012))
    p.line(X(f.x0), X(hy), X(f.x1), X(hy))
    const shift = f.cx * 0.78
    const start = Math.floor((f.x0 - shift) / 6)
    for (let i = start; i < start + Math.ceil((f.x1 - f.x0) / 6) + 2; i++) {
      const x = i * 6 + shift
      p.stroke(alpha(p, INK, 0.5))
      p.line(X(x), X(hy), X(x), X(hy - 0.7))
      p.line(X(x - 0.1), X(hy - 0.61), X(x + 0.1), X(hy - 0.61))
      // Broken horizontal marks accumulate with the dust years; no particles over the cast.
      p.stroke(alpha(p, COPPER, 0.18 + 0.14 * smooth(t, 30, 80)))
      for (let j = 0; j < 6; j++) {
        const y = hy - 0.08 - hash(i, j) * 0.22
        p.line(X(x + j * 0.61), X(y), X(x + j * 0.61 + 0.2), X(y))
      }
    }
  },
})

/** The room's scored dawn is now ink lifting off the page, with no colored wash over Murph. */
export const dawn = scenery<null>({ name: 'dawn', draw() {}, over() {} })

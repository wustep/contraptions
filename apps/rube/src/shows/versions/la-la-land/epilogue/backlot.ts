import type p5 from 'p5'
import { frame, scenery, type Ctx } from './kit'
import { PAINT } from './worlds'

/**
 * The dream's stage floor: the dark boards every set stands on, from the
 * kiss to the moment the set is struck. A faint line of boards under the
 * whole dream, and nothing else: each part brings its own flats, lights and
 * rigging (`rig.ts`).
 */
export interface BacklotState {
  /** The stage's floor, in world cells: the boards run along it. */
  floorAt: (x: number) => number
}

export const backlot = scenery<BacklotState>({
  name: 'backlot',
  draw: (p: p5, s: BacklotState, c: Ctx) => {
    const { k, ink, weight } = c
    const f = frame(p, k)
    p.push()
    p.stroke(ink)
    p.strokeWeight(weight * 0.4)
    // Boards: a line every cell and a half along the floor where it is in view, faint.
    const ctx = p.drawingContext as CanvasRenderingContext2D
    ctx.globalAlpha = 0.22
    const x0 = Math.floor(f.x0 / 1.5) * 1.5
    for (let x = x0; x <= f.x1; x += 1.5) {
      const y = s.floorAt(x)
      if (y < f.y0 - 1 || y > f.y1 + 1) continue
      p.line(x * k, y * k, x * k, (y + 0.35) * k)
    }
    ctx.globalAlpha = 1
    p.noStroke()
    p.fill(PAINT.deep)
    p.pop()
  },
})

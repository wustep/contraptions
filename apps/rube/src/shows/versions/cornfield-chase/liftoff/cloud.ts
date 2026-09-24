import type p5 from 'p5'
import { alpha, frame, hash, scenery, smooth } from './kit'

/**
 * The cloud deck the rocket goes through: the one seam between the farm and
 * the dark. It is drawn the same in both universes, over everything, the
 * rocket included — the farm sees its flat grey underside, the dark its
 * lit tops — and at the moment the rocket is inside it the frame is cloud,
 * one flat white, in both. That is when the stage changes universe, so the
 * change of ink never shows.
 */
export interface CloudState {
  /** The middle of the deck, in world cells. */
  deck: number
  /** Show time the rocket is inside it. */
  punch: number
  /** The rocket's base and lean, in world cells, and its length: its shadow in the cloud is drawn from this. */
  rocket: (t: number) => { base: [number, number]; lean: number }
  length: number
}

export const WHITE = '#F1EDE3'
const DEPTH = 1.1

export const cloud = scenery<CloudState>({
  name: 'cloud',
  draw: () => {},
  over: (p: p5, s, c) => {
    const { k, t, ink, weight } = c
    const f = frame(p, k)
    const X = (x: number) => x * k
    const near = f.y1 > s.deck - DEPTH - 1 && f.y0 < s.deck + DEPTH + 1
    if (near) {
      // The deck: a band, lumpy on both faces. From below the underside shows grey-white; from above the tops show lit.
      const lump = (x: number, side: number) => {
        const i = Math.floor(x / 0.7)
        const u = x / 0.7 - i
        const a = 0.2 + hash(i, side > 0 ? 3 : 4) * 0.35
        const b = 0.2 + hash(i + 1, side > 0 ? 3 : 4) * 0.35
        return (a + (b - a) * u) * Math.sin(u * Math.PI) ** 0.6
      }
      const x0 = Math.floor(f.x0) - 1
      const x1 = Math.ceil(f.x1) + 1
      p.push()
      p.stroke(alpha(p, ink, 0.55))
      p.strokeWeight(weight * 0.8)
      p.fill(WHITE)
      p.beginShape()
      for (let x = x0; x <= x1; x += 0.1) p.vertex(X(x), X(s.deck - DEPTH - lump(x, 1)))
      for (let x = x1; x >= x0; x -= 0.1) p.vertex(X(x), X(s.deck + DEPTH + lump(x + 0.35, -1) * 0.5))
      p.endShape(p.CLOSE)
      p.pop()
    }
    // Inside it: the frame is cloud for a moment (full only for an instant, which is when the stage changes
    // universe), with the rocket's shadow going up through it and the glow of its flame under it, drawn the
    // same in both universes so nothing jumps.
    const d = t - s.punch
    const white = d < 0 ? 1 - smooth(-d, 0.025, 0.26) : 1 - smooth(d, 0.025, 0.34)
    if (white > 0) {
      p.push()
      p.noStroke()
      p.fill(alpha(p, WHITE, white))
      p.rect(X(f.cx), X(f.cy), X(f.x1 - f.x0 + 2), X(f.y1 - f.y0 + 2))
      const { base, lean } = s.rocket(t)
      const ux = Math.sin(lean)
      const uy = -Math.cos(lean)
      const ctx = p.drawingContext as CanvasRenderingContext2D
      const g = ctx.createRadialGradient(X(base[0]), X(base[1]), 0, X(base[0]), X(base[1]), X(1.6))
      g.addColorStop(0, `rgba(244, 178, 74, ${0.55 * white})`)
      g.addColorStop(1, 'rgba(244, 178, 74, 0)')
      ctx.fillStyle = g
      ctx.fillRect(X(base[0] - 1.6), X(base[1] - 1.6), X(3.2), X(3.2))
      p.stroke(alpha(p, '#8E8A80', 0.42 * white))
      p.strokeWeight(X(0.62))
      p.strokeCap(p.ROUND)
      p.line(X(base[0] + ux * 0.35), X(base[1] + uy * 0.35), X(base[0] + ux * (s.length - 0.45)), X(base[1] + uy * (s.length - 0.45)))
      p.pop()
    }
  },
})

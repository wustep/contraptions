import { alpha, frame, scenery, smooth } from '../kit'
import { INK, PAPER, SAGE, paper } from '../print'
export interface VoidState { deck: number; leave: number }

/** Space is the unprinted sheet. The planet is a receding engraved limb, without a starfield. */
export const voidSky = scenery<VoidState>({
  name: 'void',
  draw(p, s, c) {
    const f = frame(p, c.k)
    paper(p, c.k, f)
    const gone = smooth(c.t, s.leave, s.leave + 6)
    if (gone >= 1) return
    const k = c.k
    const settle = smooth(s.deck - f.cy, 2, 22)
    const r = 70 - 56 * settle
    const x = f.cx - (f.x1 - f.x0) * 0.31 * settle - r * 0.35 * settle
    const y = f.cy + (f.y1 - f.y0) * (0.42 + gone * 0.6) + r * (1 - 0.1 * settle)
    p.push()
    p.drawingContext.globalAlpha *= 1 - gone
    p.noStroke()
    p.fill(INK)
    p.circle(x * k, y * k, r * 2 * k)
    p.noFill()
    for (let i = 0; i < 22; i++) {
      p.stroke(i % 4 === 0 ? SAGE : PAPER)
      p.strokeWeight(Math.max(0.6, k * 0.009))
      const rr = r - 0.08 - i * 0.065
      p.arc(x * k, y * k, rr * 2 * k, rr * 2 * k, Math.PI * 1.08, Math.PI * 1.92)
    }
    p.stroke(alpha(p, INK, 0.45))
    p.circle(x * k, y * k, (r + 0.07) * 2 * k)
    p.pop()
  },
})

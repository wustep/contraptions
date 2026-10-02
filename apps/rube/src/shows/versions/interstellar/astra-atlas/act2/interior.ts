import type { Pt } from '../../../../../parts'
import { frame, hash, scenery } from '../kit'
import { COPPER, INK, PAPER, SAGE, paper } from '../print'
import { RIM_R } from './station'
export interface InteriorState { axis: Pt; lights: number }

/** A precise circular engraving enclosing the domestic impressions. Most of its interior is left blank. */
export const interior = scenery<InteriorState>({
  name: 'interior',
  draw(p, s, c) {
    const { k } = c
    paper(p, k, frame(p, k))
    p.push()
    p.translate(s.axis[0] * k, s.axis[1] * k)
    p.noFill()
    for (let i = 0; i < 18; i++) {
      p.stroke(i < 5 ? INK : i % 3 === 0 ? COPPER : SAGE)
      p.strokeWeight(Math.max(0.7, k * (i === 0 ? 0.045 : 0.012)))
      p.circle(0, 0, (RIM_R + i * 0.06) * 2 * k)
    }
    // Radial cuts describe the hull's material, not extra routes or actors.
    p.stroke(INK)
    p.strokeWeight(Math.max(0.6, k * 0.009))
    for (let i = 0; i < 288; i++) {
      const a = i * Math.PI * 2 / 288
      const inner = RIM_R + 0.38 + hash(i, 4) * 0.12
      const outer = RIM_R + 0.92
      p.line(Math.cos(a) * inner * k, Math.sin(a) * inner * k, Math.cos(a) * outer * k, Math.sin(a) * outer * k)
    }
    for (const a of [Math.PI * 1.18, Math.PI * 1.18 + Math.PI * 2 / 3, Math.PI * 1.18 - Math.PI * 2 / 3]) {
      p.stroke(SAGE)
      for (const d of [-0.055, 0.055]) p.line((Math.cos(a) - Math.sin(a) * d) * k, (Math.sin(a) + Math.cos(a) * d) * k, (Math.cos(a) * RIM_R - Math.sin(a) * d) * k, (Math.sin(a) * RIM_R + Math.cos(a) * d) * k)
    }
    // Sparse familiar gables, separated by broad unprinted parcels.
    for (let i = 0; i < 24; i++) {
      if (i % 3 === 0) continue
      const a = i * Math.PI * 2 / 24
      p.push()
      p.translate(Math.cos(a) * (RIM_R - 0.08) * k, Math.sin(a) * (RIM_R - 0.08) * k)
      p.rotate(a - Math.PI / 2)
      p.stroke(INK)
      p.fill(PAPER)
      p.rect(0, -0.2 * k, 0.45 * k, 0.4 * k)
      p.fill(i % 2 ? INK : SAGE)
      p.triangle(-0.28 * k, -0.4 * k, 0, -0.63 * k, 0.28 * k, -0.4 * k)
      p.pop()
    }
    p.stroke(INK)
    p.fill(PAPER)
    p.circle(0, 0, 1.1 * k)
    p.noFill()
    p.stroke(COPPER)
    p.circle(0, 0, 0.62 * k)
    p.pop()
  },
})

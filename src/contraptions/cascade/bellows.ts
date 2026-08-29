import { defineContraption } from '../../core/define'
import { clipCell, floorRail, outline, solid } from '../../core/draw'
import { easeInOutCubic, easeOutCubic, seg } from '../../core/ease'
import { FLOOR, floor, heading, fallIn, rollIn, rollOut, since, token, tokenColor, type Beat } from './parts'

/**
 * A bellows under the line: the ball's weight squashes it going over, and the
 * puff out of the nozzle is what carries on into the next cell.
 */
const FIRE = 0.4
const TOP = FLOOR
const BOTTOM = 0.44
const PLEATS = 4
const HALF_W = 0.2

export const bellows = defineContraption<Beat>({
  name: 'bellows',
  label: 'Bellows',
  tags: ['ball', 'pop'],
  role: 'relay',
  inlets: ['E', 'W', 'N'],
  outlets: ['E', 'W'],
  rotations: [0],
  fireAt: FIRE,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const t = since(u, FIRE)
    const squash = easeOutCubic(seg(t, 0, 0.05)) - easeInOutCubic(seg(t, 0.12, 0.5))
    const top = TOP + squash * 0.16
    const fromAbove = s.flow?.in === 'N'

    floor(p, k, ink, weight, s, HALF_W + 0.02)

    p.push()
    p.scale(heading(s.flow), 1)
    outline(p, ink, weight)
    floorRail(p, k)
    // The nozzle, from the top board out to the edge.
    p.line(HALF_W * k, (top + 0.06) * k, 0.5 * k, (top + 0.02) * k)
    p.line(HALF_W * k, (top + 0.12) * k, 0.5 * k, (top + 0.1) * k)

    // The pleats between the two boards.
    p.push()
    p.noStroke()
    p.fill(s.color)
    p.beginShape()
    for (let i = 0; i <= PLEATS * 2; i++) {
      const y = top + 0.04 + ((BOTTOM - 0.02 - top - 0.04) * i) / (PLEATS * 2)
      p.vertex((i % 2 === 0 ? HALF_W - 0.04 : HALF_W) * k, y * k)
    }
    for (let i = PLEATS * 2; i >= 0; i--) {
      const y = top + 0.04 + ((BOTTOM - 0.02 - top - 0.04) * i) / (PLEATS * 2)
      p.vertex((i % 2 === 0 ? -HALF_W + 0.04 : -HALF_W) * k, y * k)
    }
    p.endShape(p.CLOSE)
    p.pop()
    outline(p, ink, weight)
    for (const side of [-1, 1]) {
      p.beginShape()
      for (let i = 0; i <= PLEATS * 2; i++) {
        const y = top + 0.04 + ((BOTTOM - 0.02 - top - 0.04) * i) / (PLEATS * 2)
        p.vertex(side * (i % 2 === 0 ? HALF_W - 0.04 : HALF_W) * k, y * k)
      }
      p.endShape()
    }
    // The boards.
    solid(p, ink, weight, s.color)
    p.rect(0, (top + 0.02) * k, (HALF_W * 2 + 0.04) * k, 0.05 * k)
    p.rect(0, (BOTTOM + 0.02) * k, (HALF_W * 2 + 0.04) * k, 0.05 * k)

    // The puff: three arcs racing out of the nozzle and thinning.
    if (t > 0.01 && t < 0.2) {
      const f = seg(t, 0.01, 0.2)
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight)
      p.noFill()
      for (let i = 0; i < 3; i++) {
        const x = 0.52 + 0.3 * f + i * 0.05
        const r = (0.08 + 0.2 * f) * (1 - i * 0.2)
        p.arc(x * k, (top + 0.06) * k, r * k, r * k, -0.5, 0.5)
      }
      p.pop()
    }
    p.pop()

    clipCell(p, k, () => {
      const at = (fromAbove ? null : rollIn(s, u, FIRE)) ?? fallIn(s, u, FIRE) ?? rollOut(s, u, FIRE)
      if (at) token(p, k, ink, weight, tokenColor(s), at)
    })
  },
})

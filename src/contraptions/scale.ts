import { defineContraption } from '../core/define'
import { clipCell, outline, solid } from '../core/draw'
import { easeInOutCubic, easeOutBack, lerp, seg } from '../core/ease'
import { BELT_V, BENCH, DEPART, HIT, PART_Y, bench, part, rollers, shuttle } from './shop'

/**
 * The part rolls onto the platform, the platform sinks and the needle swings
 * round and settles on its weight, then the rollers take it on.
 */
const DIAL: [number, number] = [0, -0.22]
const DIAL_R = 0.18
const REST = (3 * Math.PI) / 4
const SWEEP = 1.5 * Math.PI
const READING = 0.62

export const scale = defineContraption({
  name: 'scale',
  label: 'Scale',
  tags: ['signal'],
  role: 'sink',
  rotations: [0],
  fireAt: HIT,
  setup: ({ color }) => ({ color }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const x = shuttle(u)
    const sit = easeOutBack(seg(u, 0.31, 0.44)) - easeInOutCubic(seg(u, DEPART, DEPART + 0.08))
    const f = seg(u, 0.32, 0.5)
    // A swing that overshoots and rings down onto the reading.
    const swing = (1 - Math.cos(f * Math.PI * 2.5) * Math.pow(1 - f, 2)) * (1 - easeInOutCubic(seg(u, DEPART, DEPART + 0.15)))
    const needle = REST + SWEEP * READING * swing
    const dy = sit * 0.03

    clipCell(p, k, () => {
      bench(p, k, ink, weight)
      rollers(p, k, ink, weight, s.color, -0.5, -0.2, u * BELT_V)
      rollers(p, k, ink, weight, s.color, 0.2, 0.5, u * BELT_V)

      // Column and dial, ticks along the sweep.
      outline(p, ink, weight)
      p.line(0, BENCH * k, 0, (DIAL[1] + DIAL_R) * k)
      p.circle(DIAL[0] * k, DIAL[1] * k, DIAL_R * 2 * k)
      for (let i = 0; i <= 8; i++) {
        const a = REST + (SWEEP * i) / 8
        const r0 = i % 4 === 0 ? DIAL_R - 0.05 : DIAL_R - 0.03
        p.line((DIAL[0] + Math.cos(a) * r0) * k, (DIAL[1] + Math.sin(a) * r0) * k, (DIAL[0] + Math.cos(a) * DIAL_R) * k, (DIAL[1] + Math.sin(a) * DIAL_R) * k)
      }
      p.push()
      p.stroke(s.color)
      p.strokeWeight(weight * 1.4)
      p.line(DIAL[0] * k, DIAL[1] * k, (DIAL[0] + Math.cos(needle) * (DIAL_R - 0.04)) * k, (DIAL[1] + Math.sin(needle) * (DIAL_R - 0.04)) * k)
      p.pop()
      solid(p, ink, weight, s.color)
      p.circle(DIAL[0] * k, DIAL[1] * k, 0.06 * k)

      // The platform gives under the part.
      solid(p, ink, weight, s.color)
      p.rect(0, (BENCH - 0.025 + dy) * k, 0.36 * k, 0.05 * k)
      if (x !== null) part(p, k, ink, weight, s.color, x, PART_Y - 0.05 + lerp(0.05, dy, Math.abs(x) < 0.16 ? 1 : 0))
    })
  },
})

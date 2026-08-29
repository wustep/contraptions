import { defineContraption } from '../../core/define'
import { clipCell, outline, solid } from '../../core/draw'
import { block, ground, knob, performer, second, stroke } from './circus'

/**
 * The platform turns once a loop and the horses on it rise and fall as they
 * come round, the ones at the back passing behind the pole and the ones at
 * the front passing in front of it — one turn, and everyone is back where
 * they started.
 */
const R = 0.34
const TOP = -0.22
const DECK = 0.38
const HORSES = 4

export const carousel = defineContraption({
  name: 'carousel',
  label: 'Carousel',
  tags: ['parade'],
  role: 'relay',
  rotations: [0],
  fireAt: 0,
  setup: ({ color, rng, theme }) => ({ color, alt: second(rng, theme, color), dir: rng.sign() }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    const horses = Array.from({ length: HORSES }, (_, i) => {
      const a = Math.PI * 2 * (u * s.dir + i / HORSES)
      return {
        x: R * Math.cos(a),
        depth: Math.sin(a),
        y: 0.1 + 0.07 * Math.sin(2 * a),
        color: i % 2 === 0 ? s.color : s.alt,
      }
    }).sort((a, b) => a.depth - b.depth)

    clipCell(p, k, () => {
    outline(p, ink, weight)
    ground(p, k, 1)
    // Legs, deck, and the canopy overhead.
    stroke(p, k, -0.3, 0.5, -0.3, DECK)
    stroke(p, k, 0.3, 0.5, 0.3, DECK)
    block(p, k, ink, weight, s.color, 0, DECK + 0.03, 0.9, 0.06)
    solid(p, ink, weight, s.color)
    p.triangle(-0.46 * k, TOP * k, 0.46 * k, TOP * k, 0, -0.48 * k)
    knob(p, k, ink, weight, s.alt, 0, -0.48, 0.07)

    const horse = (h: (typeof horses)[number]) => {
      const d = 0.15 * (1 + 0.24 * h.depth)
      outline(p, ink, weight)
      stroke(p, k, h.x, TOP, h.x, DECK)
      performer(p, k, ink, weight, h.color, h.x, h.y, d)
    }
    for (const h of horses) if (h.depth < 0) horse(h)
    outline(p, ink, weight)
    p.strokeWeight(weight * 1.6)
    stroke(p, k, 0, TOP, 0, DECK)
    for (const h of horses) if (h.depth >= 0) horse(h)
    })
  },
})

import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { second } from './circus'

/**
 * A string of pennants slung across the top of the cell, and a gust running
 * along it twice a loop so each flag lifts a little after the one before —
 * the drumroll made visible.
 */
const A: [number, number] = [-0.5, -0.44]
const B: [number, number] = [0.5, -0.44]
const C: [number, number] = [0, -0.04]
const FLAGS = 7
const FLAG_W = 0.065
const FLAG_L = 0.2

const along = (t: number): [number, number] => [
  (1 - t) * (1 - t) * A[0] + 2 * t * (1 - t) * C[0] + t * t * B[0],
  (1 - t) * (1 - t) * A[1] + 2 * t * (1 - t) * C[1] + t * t * B[1],
]

export const bunting = defineContraption({
  name: 'bunting',
  label: 'Bunting',
  tags: ['parade'],
  role: 'relay',
  rotations: [0],
  fireAt: 0,
  setup: ({ color, rng, theme }) => ({ color, alt: second(rng, theme, color) }),
  draw: (p, s, { size: k, u, ink, weight }) => {
    outline(p, ink, weight)
    p.beginShape()
    p.vertex(A[0] * k, A[1] * k)
    p.quadraticVertex(C[0] * k, C[1] * k, B[0] * k, B[1] * k)
    p.endShape()

    for (let i = 0; i < FLAGS; i++) {
      const t = (i + 0.5) / FLAGS
      const [x, y] = along(t)
      const [x1, y1] = along(t + 0.01)
      const dx = x1 - x
      const dy = y1 - y
      const len = Math.hypot(dx, dy) || 1
      const tx = (dx / len) * FLAG_W
      const ty = (dy / len) * FLAG_W
      // The wave runs left to right along the string, twice a loop.
      const sway = 0.08 * Math.sin(Math.PI * 2 * (2 * u) - i * 1.1)
      const tip: [number, number] = [x + sway, y + FLAG_L - 0.25 * Math.abs(sway)]
      solid(p, ink, weight, i % 2 === 0 ? s.color : s.alt)
      p.triangle((x - tx) * k, (y - ty) * k, (x + tx) * k, (y + ty) * k, tip[0] * k, tip[1] * k)
    }
  },
})

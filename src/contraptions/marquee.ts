import { defineContraption } from '../core/define'
import { outline, solid } from '../core/draw'
import { mod } from '../core/ease'
import { knob, second } from './circus'

/**
 * An arrow sign rimmed with bulbs, every third one lit, the lit ones chasing
 * round the rim toward the point; when the signal reaches it every bulb comes
 * on at once.
 */
const ARROW: [number, number][] = [
  [-0.42, -0.13],
  [0.06, -0.13],
  [0.06, -0.31],
  [0.44, 0],
  [0.06, 0.31],
  [0.06, 0.13],
  [-0.42, 0.13],
]
const BULBS = 16
/** Chase steps per loop: eight frames a step, three steps a cycle. */
const STEPS = 30

/** Points spaced evenly around the arrow's perimeter, starting at its tail. */
function rim(): [number, number][] {
  const edges = ARROW.map((a, i) => [a, ARROW[(i + 1) % ARROW.length]] as const)
  const lengths = edges.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]))
  const total = lengths.reduce((s, l) => s + l, 0)
  const out: [number, number][] = []
  for (let j = 0; j < BULBS; j++) {
    let want = ((j + 0.5) / BULBS) * total
    for (const [i, [a, b]] of edges.entries()) {
      if (want <= lengths[i]) {
        const t = want / lengths[i]
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
        break
      }
      want -= lengths[i]
    }
  }
  return out
}

const BULB_AT = rim()

export const marquee = defineContraption({
  name: 'marquee',
  label: 'Marquee',
  tags: ['lights'],
  role: 'relay',
  fireAt: 0,
  setup: ({ color, rng, theme }) => ({ color, alt: second(rng, theme, color) }),
  draw: (p, s, { size: k, u, ink, weight, fired }) => {
    const step = Math.floor(u * STEPS)
    const all = fired > 0.35

    solid(p, ink, weight, s.color)
    p.beginShape()
    for (const [x, y] of ARROW) p.vertex(x * k, y * k)
    p.endShape(p.CLOSE)

    for (const [j, [x, y]] of BULB_AT.entries()) {
      const lit = all || mod(j - step, 3) === 0
      if (lit) knob(p, k, ink, weight, s.alt, x, y, 0.085)
      else {
        outline(p, ink, weight)
        p.fill(ink)
        p.circle(x * k, y * k, 0.035 * k)
      }
    }
  },
})

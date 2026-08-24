import { defineContraption } from '../core/define'
import { floorRail, outline } from '../core/draw'
import { clamp, easeInOutCubic, easeInQuad, seg } from '../core/ease'

/**
 * A row of bars going over in sequence, then rewinding.
 *
 * Two things make the cascade read as physics rather than as a stagger.
 *
 * A toppling bar accelerates: the torque on it grows with sin(theta), so it
 * creeps off vertical and arrives fast. An ease-out — which is what this used
 * to do — plays that backwards, and the row looked like it was being lowered
 * rather than knocked over.
 *
 * And a bar does not wait a fixed interval before starting the next one; it
 * starts it at the instant it touches, when h·sin(theta) covers the gap. That
 * angle comes out of the geometry, and inverting the fall curve turns it into
 * the moment the next bar lets go — so changing the count or the spacing
 * retimes the whole run for free.
 *
 * Bars stop leaning on each other rather than flat, which is where real
 * dominoes come to rest. The last one has nothing to lean on and goes further.
 * The run is sized so even that one stays inside the cell.
 */
const SPAN = 0.44
const HEIGHT = 0.3
const WIDTH = 0.08
/** Where a bar comes to rest against the next. */
const REST = 0.85
/** The last bar, with nothing to catch it. */
const LAST = 1
/** Fraction of the loop one bar takes to go over. */
const FALL = 0.13

export const dominoes = defineContraption({
  name: 'dominoes',
  label: 'Dominoes',
  tags: ['sequence', 'step'],
  role: 'source',
  // The first bar going over.
  fireAt: 0.02,
  // Gravity gives this one an up.
  rotations: [0],
  setup: ({ color, rng }) => ({ color, count: rng.pick([4, 4, 5]) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const floorY = size * 0.46
    const h = size * HEIGHT
    const w = size * WIDTH
    const span = size * SPAN
    const gap = span / (s.count - 1)

    // The angle at which a falling bar reaches the next one, and — inverting
    // the fall curve — how far into its own fall that happens.
    const contact = Math.asin(clamp(gap / h, 0, 1))
    const lead = Math.sqrt(clamp(contact / REST, 0, 1))

    outline(p, ink, weight)
    floorRail(p, size)

    for (let i = 0; i < s.count; i++) {
      const x = -span / 2 + gap * i - size * 0.06
      const last = i === s.count - 1
      const start = i * lead * FALL
      const drop = easeInQuad(seg(u, start, start + FALL))
      // Stand back up in reverse, the last bar to fall being the first to rise.
      const riseAt = 0.72 + (s.count - 1 - i) * 0.035
      const rise = easeInOutCubic(seg(u, riseAt, riseAt + 0.11))

      p.push()
      p.translate(x, floorY)
      p.rotate((last ? LAST : REST) * drop * (1 - rise))
      outline(p, ink, weight)
      p.fill(s.color)
      p.rect(0, -h / 2, w, h)
      p.pop()
    }
  },
})

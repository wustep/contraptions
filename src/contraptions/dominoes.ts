import { defineContraption } from '../core/define'
import { floorRail, outline } from '../core/draw'
import { easeInOutCubic, easeOutQuad, seg } from '../core/ease'

/**
 * A row of bars going over in sequence, then rewinding.
 *
 * The geometry is sized so the fallen run fits inside the cell: the last bar's
 * pivot sits at `SPAN/2` and it lies down across `HEIGHT * sin(FALLEN)`, and
 * those have to add up to less than half a cell or the end of the run gets
 * clipped off — which looked like a bug rather than a machine.
 *
 * Bars stop at 0.9rad rather than flat, because real dominoes come to rest
 * leaning on each other, and the reset runs backwards down the line so the
 * rewind reads as deliberate instead of as a snap.
 */
const SPAN = 0.44
const HEIGHT = 0.3
const WIDTH = 0.08
const FALLEN = 0.9

export const dominoes = defineContraption({
  name: 'dominoes',
  label: 'Dominoes',
  tags: ['sequence', 'step'],
  role: 'source',
  // The first bar going over.
  fireAt: 0.02,
  rotations: [0, 2],
  setup: ({ color, rng }) => ({ color, count: rng.pick([4, 4, 5]) }),
  draw: (p, s, { size, u, ink, weight }) => {
    const floorY = size * 0.46
    const h = size * HEIGHT
    const w = size * WIDTH
    const span = size * SPAN

    outline(p, ink, weight)
    floorRail(p, size)

    for (let i = 0; i < s.count; i++) {
      const n = i / (s.count - 1)
      // Nudge the row left so it is centred once fallen as well as standing.
      const x = -span / 2 + span * n - size * 0.06
      // Fall down the line, hold, then stand back up in reverse — the last bar
      // to go over is the first to come back up. Both windows have to close
      // before u = 1 or the loop does not join.
      const drop = easeOutQuad(seg(u, n * 0.42, n * 0.42 + 0.18))
      const rise = easeInOutCubic(seg(u, 0.72 + (1 - n) * 0.12, 0.86 + (1 - n) * 0.12))

      p.push()
      p.translate(x, floorY)
      p.rotate(FALLEN * drop * (1 - rise))
      outline(p, ink, weight)
      p.fill(s.color)
      p.rect(0, -h / 2, w, h)
      p.pop()
    }
  },
})

import type { Pt } from '../../../../parts'
import { box, part, type Part } from './kit'

/**
 * A part not yet built: it takes the ball across its footprint in its slot, in
 * a straight line, and draws a faint frame where it will stand. The score
 * runs end to end from the first day, and each builder replaces one of these.
 */
export function stub(name: string, width: number, rise = 0): Part<{ begin: number }> {
  return part<{ begin: number }>(
    {
      name,
      draw: (p, _s, c) => {
        const { k, ink, weight } = c
        p.push()
        p.stroke(ink)
        p.strokeWeight(weight * 0.5)
        p.noFill()
        p.rect((-0.5 + width / 2) * k, -1 * k, width * k, 3 * k)
        p.line(-0.5 * k, 0.5 * k, (width - 0.5) * k, (rise + 0.5) * k)
        p.pop()
      },
    },
    (slot) => ({
      cells: box(-1, -3, width, 1),
      exit: [width, rise] as Pt,
      lane: { segs: [{ from: [-0.5, 0], to: [width - 0.5, rise], dur: slot.end - slot.begin }], fire: (slot.end - slot.begin) / 2 },
      state: { begin: slot.begin },
    }),
    (slot) => [{ t: slot.begin, cells: 6 }],
  )
}

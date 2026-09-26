import type { Pt } from '../../../../parts'
import { alpha, box, part, type Part } from './kit'
import { SEAM_ELLIE } from './seams'

/**
 * A part not yet built: it takes Carl across its footprint in its slot, in a straight line, with Ellie a step ahead
 * of him if she is in it, and draws a faint frame where it will stand. The score runs end to end from the first
 * day, and each builder replaces one of these.
 */
export function stub(name: string, width: number, rise = 0, opts: { ellie?: boolean } = {}): Part<{ begin: number }> {
  return part<{ begin: number }>(
    {
      name,
      draw: (p, _s, c) => {
        const { k, ink, weight } = c
        p.push()
        p.rectMode(p.CORNER)
        p.stroke(alpha(p, ink, 0.35))
        p.strokeWeight(weight * 0.5)
        p.noFill()
        p.rect(-0.5 * k, -2.5 * k, width * k, 3 * k)
        p.line(-0.5 * k, 0.13 * k, (width - 0.5) * k, (rise + 0.13) * k)
        p.pop()
      },
    },
    (slot) => {
      const dur = slot.end - slot.begin
      const at = (t: number): Pt => {
        const u = Math.max(0, Math.min(1, (t - slot.begin) / dur))
        return [-0.5 + width * u, rise * u]
      }
      return {
        cells: box(-1, -3, width, 1),
        exit: [width, rise] as Pt,
        lane: { segs: [{ from: [-0.5, 0], to: [width - 0.5, rise], dur }], fire: dur / 2 },
        state: { begin: slot.begin },
        company: opts.ellie
          ? [{ from: slot.begin, to: slot.end, at: (t: number) => { const [x, y] = at(t); return { x: x + SEAM_ELLIE[0], y: y + SEAM_ELLIE[1] } } }]
          : undefined,
      }
    },
    (slot) => [{ t: slot.begin + Math.min(1.5, (slot.end - slot.begin) / 3), cells: 5 }],
  )
}

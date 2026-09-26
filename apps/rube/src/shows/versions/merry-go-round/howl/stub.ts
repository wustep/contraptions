import type { Pt } from '../../../../parts'
import { alpha, box, part, type Company, type Part } from './kit'

/**
 * A part not yet built: it takes Sophie across its footprint in its slot, in a straight line, with Howl or Markl
 * beside her if they are in it, and draws a faint frame where it will stand. The score runs end to end from the
 * first day, and each builder replaces one of these (keep the export names the score imports).
 */
export function stub(name: string, width: number, rise = 0, opts: { howl?: Pt; markl?: Pt; cells?: number } = {}): Part<{ begin: number }> {
  return part<{ begin: number }>(
    {
      name,
      draw: (p, _s, c) => {
        const { k, ink, weight } = c
        p.push()
        p.rectMode(p.CORNER)
        p.stroke(alpha(p, ink, 0.3))
        p.strokeWeight(weight * 0.5)
        p.noFill()
        p.rect(-0.5 * k, (Math.min(0, rise) - 2.5) * k, width * k, (Math.abs(rise) + 3) * k)
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
      const company: Company[] = []
      for (const who of ['howl', 'markl'] as const) {
        const off = opts[who]
        if (!off) continue
        company.push({ who, from: slot.begin, to: slot.end, at: (t: number) => { const [x, y] = at(t); return { x: x + off[0], y: y + off[1] } } })
      }
      return {
        cells: box(-1, Math.min(0, rise) - 3, width, Math.max(0, rise) + 1),
        exit: [width, rise] as Pt,
        lane: { segs: [{ from: [-0.5, 0], to: [width - 0.5, rise], dur }], fire: dur / 2 },
        state: { begin: slot.begin },
        company: company.length ? company : undefined,
      }
    },
    (slot) => [{ t: slot.begin + Math.min(1.5, (slot.end - slot.begin) / 3), cells: opts.cells ?? 5 }],
  )
}

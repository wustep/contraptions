import type { Pt } from '../../../../parts'
import { alpha, box, frame, part, scenery, type Company, type Part, type Who } from './kit'
import { BAND, type Level } from './stack'
import { LIMBO, RAIN, HOTEL, SNOW } from './worlds'

/**
 * A part not yet built: it takes Cobb from its entry to `exit` (in its own frame: the next part's entry is at
 * `exit - [0.5, 0]`) in its slot, in a straight line, with Ariadne, Fischer or Mal beside him if they are in it, and
 * draws a faint frame where it will stand. The score runs end to end from the first day, and each builder replaces
 * one of these (keep the export names the score imports).
 */
export function stub(name: string, exit: Pt, opts: Partial<Record<Who, Pt>> & { cells?: number } = {}): Part<{ begin: number }> {
  const [ex, ey] = exit
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
        p.rect((Math.min(0, ex) - 0.5) * k, (Math.min(0, ey) - 2.5) * k, (Math.abs(ex) + 1) * k, (Math.abs(ey) + 3) * k)
        p.line(-0.5 * k, 0.13 * k, (ex - 0.5) * k, (ey + 0.13) * k)
        p.pop()
      },
    },
    (slot) => {
      const dur = slot.end - slot.begin
      const at = (t: number): Pt => {
        const u = Math.max(0, Math.min(1, (t - slot.begin) / dur))
        return [-0.5 + ex * u, ey * u]
      }
      const company: Company[] = []
      for (const who of ['ariadne', 'fischer', 'mal'] as const) {
        const off = opts[who]
        if (!off) continue
        company.push({ who, from: slot.begin, to: slot.end, at: (t: number) => { const [x, y] = at(t); return { x: x + off[0], y: y + off[1] } } })
      }
      return {
        cells: box(Math.min(0, ex) - 1, Math.min(0, ey) - 3, Math.max(0, ex), Math.max(0, ey) + 1),
        exit,
        lane: { segs: [{ from: [-0.5, 0], to: [ex - 0.5, ey], dur }], fire: dur / 2 },
        state: { begin: slot.begin },
        company: company.length ? company : undefined,
      }
    },
    (slot) => [{ t: slot.begin + Math.min(1.5, (slot.end - slot.begin) / 3), cells: opts.cells ?? 5 }],
  )
}

/** A level's band as a flat wash, sky over ground, until its builder draws it: so the stack reads from the first day. */
export function stubBand(level: Level): { piece: ReturnType<typeof scenery<null>>; cells: Pt[] } {
  const { top, bottom } = BAND[level]
  const [sky, ground] = { rain: [RAIN.sky, RAIN.street], hotel: [HOTEL.wall, HOTEL.carpet], snow: [SNOW.sky, SNOW.snow], limbo: [LIMBO.sky, LIMBO.sea] }[level]
  const piece = scenery<null>({
    name: `stub-${level}`,
    draw: (p, _s, c) => {
      const f = frame(p, c.k)
      const y0 = Math.max(top, f.y0 - 1)
      const y1 = Math.min(bottom, f.y1 + 1)
      if (y1 <= y0) return
      const mid = top + (bottom - top) * 0.62
      p.push()
      p.noStroke()
      p.rectMode(p.CORNER)
      p.fill(sky)
      p.rect((f.x0 - 1) * c.k, top * c.k, (f.x1 - f.x0 + 2) * c.k, (mid - top) * c.k)
      p.fill(ground)
      p.rect((f.x0 - 1) * c.k, mid * c.k, (f.x1 - f.x0 + 2) * c.k, (bottom - mid) * c.k)
      p.pop()
    },
  })
  return { piece, cells: box(-60, top, 70, bottom, 3) }
}

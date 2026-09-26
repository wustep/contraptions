import type { Pt } from '../../../../parts'
import { box, part, route, type Part, type Way } from './kit'

/**
 * A part not yet built: it takes the spark across its footprint in its slot, hopping on the strikes it was handed,
 * and draws a faint frame where it will stand. The score runs end to end from the first day, and each builder
 * replaces one of these with the real thing, keeping the export names the score imports.
 */
export interface StubSpec {
  /** Where the next part's entry cell is from this one's: the lane ends at `exit - [0.5, 0]`. */
  exit: Pt
  /** Show times the spark lands on (the strikes). */
  hits?: readonly number[]
  /** How close the camera is. */
  cells?: number
  /** How high a hop between two strikes may rise, at most. */
  lift?: number
}

export function stub(name: string, spec: StubSpec): Part<{ begin: number; end: number }> {
  const [ex, ey] = spec.exit
  const lift = spec.lift ?? 0.8
  const w = Math.max(1, Math.abs(ex))
  return part<{ begin: number; end: number }>(
    {
      name,
      draw: (p, s, c) => {
        const { k, ink, weight } = c
        p.push()
        p.noFill()
        p.stroke(ink)
        p.strokeWeight(weight * 0.4)
        const x0 = Math.min(-0.5, ex - 0.5)
        const y0 = Math.min(0, ey)
        // The footprint, and the line the spark keeps to.
        p.rect((x0 + w / 2) * k, (y0 + (Math.abs(ey) + 3) / 2 - 2) * k, w * k, (Math.abs(ey) + 3) * k)
        p.line(-0.5 * k, 0.13 * k, (ex - 0.5) * k, (ey + 0.13) * k)
        // A tick where each strike lands, lit as it is struck.
        const span = s.end - s.begin
        for (const h of spec.hits ?? []) {
          const f = (h - s.begin) / span
          const x = -0.5 + (ex) * f
          const y = ey * f + 0.13
          const since = c.t - (h - s.begin)
          const lit = since >= 0 && since < 0.25 ? 1 - since / 0.25 : 0
          p.strokeWeight(weight * (0.5 + 1.5 * lit))
          p.line(x * k, (y + 0.05) * k, x * k, (y + 0.3) * k)
        }
        p.pop()
      },
    },
    (slot) => {
      const span = slot.end - slot.begin
      const at = (t: number): Pt => {
        const f = Math.max(0, Math.min(1, t / span))
        return [-0.5 + ex * f, ey * f]
      }
      const times = [...(spec.hits ?? [])].map((h) => h - slot.begin).filter((t) => t > 0.02 && t < span - 0.02).sort((a, b) => a - b)
      const ways: Way[] = [{ at: 0, p: at(0) }]
      for (const t of [...times, span]) {
        const prev = ways[ways.length - 1]
        const T = t - prev.at
        ways.push({ at: t, p: at(t), arc: Math.min(lift, (12 * T * T) / 8) })
      }
      return {
        cells: box(Math.min(-1, ex - 1), Math.min(-3, ey - 3), Math.max(1, ex + 1), Math.max(1, ey + 1)),
        exit: spec.exit,
        lane: { segs: route(ways), fire: times[0] ?? span / 2 },
        state: { begin: slot.begin, end: slot.end },
      }
    },
    (slot) => [{ t: Math.min(slot.end, slot.begin + 0.6), cells: spec.cells ?? 6 }],
  )
}

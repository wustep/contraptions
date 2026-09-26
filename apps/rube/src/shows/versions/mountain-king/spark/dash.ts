import type { Pt } from '../../../../parts'
import { box, part, type Part } from './kit'
import { DASH_V, SEAMS } from './seams'

/**
 * The director's: a leg of the dash home, on the roll. The spark comes out of a fire it came by (a balloon burner,
 * the glory hole), up and to the left, for a quarter of a second, and into the next on the roll's next stroke. The
 * world's own part draws the fire there; this draws nothing. The camera rides with it, drawing back a little so the
 * fire and what it belongs to (the balloon's basket and mouth, the glory hole's arch) are seen.
 */
export function dash(name: string, cells: number): Part<null> {
  return part<null>(
    { name, draw: () => {} },
    (slot) => {
      const T = slot.end - slot.begin
      const end: Pt = [-0.5 + DASH_V[0] * T, DASH_V[1] * T]
      return {
        cells: box(-3, -3, 2, 2),
        exit: [end[0] + 0.5, end[1]],
        lane: { segs: [{ from: [-0.5, 0], to: end, dur: T }], fire: 0 },
        state: null,
      }
    },
    // The camera carries the door's framing and moves with the spark, drawing back to `cells` by the next door.
    (slot, built) => [{ t: slot.end, cells, hold: [built.exit[0] - 0.5, built.exit[1]], w: 1 }],
  )
}

export const dashRegatta = dash('dash-regatta', SEAMS.back2.cells)
export const dashGlass = dash('dash-glass', SEAMS.back3.cells)

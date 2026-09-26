import type { Pt } from '../../../../parts'
import { box, part, type Part } from './kit'
import { HOME_LEAP } from './seams'

/**
 * The director's: a leg of the dash home, on the roll. The spark streaks through a fire it came by (a balloon
 * burner, the glory hole), up and to the left at the last leap's speed, for a twelfth of a second, inside the veil of
 * flame (`fx.ts`). The world's own part draws the fire there; this draws nothing. The camera rides with it.
 */
export function dash(name: string): Part<null> {
  return part<null>(
    { name, draw: () => {} },
    (slot) => {
      const T = slot.end - slot.begin
      const end: Pt = [-0.5 + HOME_LEAP[0] * T, HOME_LEAP[1] * T]
      return {
        cells: box(-3, -3, 2, 2),
        exit: [end[0] + 0.5, end[1]],
        lane: { segs: [{ from: [-0.5, 0], to: end, dur: T }], fire: 0 },
        state: null,
      }
    },
    // The camera carries the door's framing and moves with the spark, at the same distance, to the next door.
    (slot, built) => [{ t: slot.end, cells: 2.4, hold: [built.exit[0] - 0.5, built.exit[1]], w: 1 }],
  )
}

export const dashRegatta = dash('dash-regatta')
export const dashGlass = dash('dash-glass')

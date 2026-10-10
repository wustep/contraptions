import { R, type Pt } from '../../../../../parts'
import { box, carried, part, scenery, type PartShot, type Slot } from '../kit'
import { drawGala } from './gala-draw'
import { GALA_SHOTS, GALA_STRIKES, herAt, P0, shangAt } from './gala-plan'

/**
 * The gala, years on (the FOG builder's): champagne light, a crowd, and General Shang, who has come to thank her and
 * tells her what she needs to say. She sets the tower of coupes pouring; he crosses the room to her while it fills;
 * she goes to meet him, and he leans in and tells her. The plan is `gala-plan.ts`; the set (`gala-draw.ts`) draws it
 * all by show time.
 */

const SHANG_SCALE = 1.12
const SHANG_BRAID = '#C9A24A'

export const GALA_CELLS: Pt[] = box(-14, -9, 16, 4, 2)

export const galaSet = scenery<null>({
  name: 'gala-set',
  draw: (p, _s, c) => drawGala(p, c.k, c.t),
})

/** She comes into the gala at rest where the plan has her. */
export const GALA_AT: Pt = [P0[0] + 0.5, P0[1]]

export const gala = part<{ begin: number }>(
  { name: 'gala', draw: () => {} },
  (slot: Slot) => {
    const local = (t: number): Pt => {
      const h = herAt(t)
      return [h[0] - GALA_AT[0], h[1] - GALA_AT[1]]
    }
    const n = Math.max(1, Math.round((slot.end - slot.begin) * 40))
    const end = local(slot.end)
    return {
      cells: box(-4, -4, 9, 2, 2),
      exit: [end[0] + 0.5, end[1]] as Pt,
      lane: { segs: carried(local, slot.begin, slot.end, n), fire: 0 },
      state: { begin: slot.begin },
      company: [
        {
          who: 'shang',
          from: slot.begin,
          to: slot.end,
          at: (t: number) => {
            const [x, y] = shangAt(t)
            // A general: a little the larger, and his outline in a dress uniform's brass braid. (In his red alone, close to
            // Hannah's rose, six fresh readers in fourteen could not say who he was: her grown, a stranger, a lover.)
            // Standing on the floor at his size, and touching her side at it (he is on her right).
            return { x: x - GALA_AT[0] + (SHANG_SCALE - 1) * R, y: y - GALA_AT[1] - (SHANG_SCALE - 1) * R, scale: SHANG_SCALE, rim: SHANG_BRAID }
          },
        },
      ],
    }
  },
  (slot: Slot): PartShot[] =>
    GALA_SHOTS.filter((s) => s.t > slot.begin + 1e-6 && s.t <= slot.end + 1e-6).map((s) => ({ t: s.t, cells: s.cells, hold: [s.hold[0] - GALA_AT[0], s.hold[1] - GALA_AT[1]] as Pt, w: 1 })),
)

export const GALA_HITS: number[] = GALA_STRIKES

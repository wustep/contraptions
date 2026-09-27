import type { Pt } from '../../../../../parts'
import { box, carried, part, scenery, type PartShot, type Slot } from '../kit'
import { drawFog } from './draw'
import { FOG1_SHOTS, FOG2_SHOTS, FOG_STRIKES, herAt, P0, P_SEES, type WorldShot } from './plan'

/**
 * Beyond the glass (the FOG builder's): alone with Costello in the white, written round by their ink, and shown what
 * is to come. The plan (`plan.ts`) says where everything is at every show time; the set (`draw.ts`) draws it all by
 * show time, the ink included, and the two parts only carry her along the plan.
 */

/** All of the fog she can be seen in, and the heptapods' heights over it. */
export const FOG_CELLS: Pt[] = box(-16, -16, 22, 10, 2)

export const fogSet = scenery<null>({
  name: 'fog-set',
  draw: (p, _s, c) => drawFog(p, c.k, c.t),
})

/** Where fog1 takes her in (she comes out of the white at P0), and where fog2 does: where fog1 left her. */
export const FOG_AT: Pt = [P0[0] + 0.5, P0[1]]
export const FOG2_AT: Pt = [P_SEES[0] + 0.5, P_SEES[1]]

/** A part that carries her along the plan from its slot's start to its end, sampled finely. */
function along(name: string, at: Pt, shots: WorldShot[]) {
  return part<{ begin: number }>(
    { name, draw: () => {} },
    (slot: Slot) => {
      const local = (t: number): Pt => {
        const h = herAt(t)
        return [h[0] - at[0], h[1] - at[1]]
      }
      const n = Math.max(1, Math.round((slot.end - slot.begin) * 40))
      const segs = carried(local, slot.begin, slot.end, n)
      const end = local(slot.end)
      return {
        cells: box(-6, -6, 8, 4, 2),
        exit: [end[0] + 0.5, end[1]] as Pt,
        lane: { segs, fire: 0 },
        state: { begin: slot.begin },
      }
    },
    (slot: Slot): PartShot[] =>
      shots.filter((s) => s.t > slot.begin + 1e-6 && s.t <= slot.end + 1e-6).map((s) => ({ t: s.t, cells: s.cells, hold: [s.hold[0] - at[0], s.hold[1] - at[1]] as Pt, w: 1 })),
  )
}

export const fog1 = along('fog1', FOG_AT, FOG1_SHOTS)
export const fog2 = along('fog2', FOG2_AT, FOG2_SHOTS)

export const FOG_HITS: number[] = FOG_STRIKES

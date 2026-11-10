import type { Performance } from '../../../registry'
import { camera } from './camera'
import { makeDrawing } from './draw'
import { DURATION } from './layout'
import { liveMusic } from './live'
import { canRender, renderSoundtrack } from './render'
import { strikes } from './score'
import { StruckShow } from './show'

/**
 * Struck, put together: the machine laid out from the score (`layout.ts`), drawn (`draw.ts`), and its contacts played
 * live by the physical models as the show reaches each one (`score.ts`, `engine.ts`, `live.ts`), or rendered to a file
 * from the same contacts where a file is wanted (`render.ts`). Where there is no audio context at all (the headless
 * checks), the show is the same, silent.
 */
export const show = new StruckShow(makeDrawing())

export async function load(): Promise<Performance> {
  const notes = strikes()
  const live = canRender() ? liveMusic(notes, async () => (await renderSoundtrack(notes, DURATION)).url) : null
  return {
    show,
    duration: DURATION,
    camera,
    // One place, no portals: nothing to iris.
    cuts: () => false,
    overview: (t) => {
      const c = camera(t)
      return { x0: c.x - 40, y0: c.y - 22, x1: c.x + 40, y1: c.y + 22 }
    },
    soundtrack: live
      ? {
          live,
          offset: 0,
          credit: 'J. S. Bach, Prelude in C major, BWV 846 · no recording: every note is a physical model, sounding in your browser as a ball strikes it',
        }
      : undefined,
  }
}

import type { Performance as ShowPerformance } from '../../../registry'
import { makeCamera } from './camera'
import { makeDrawing } from './draw'
import { liveMusic } from './live'
import { canRender, renderSoundtrack } from './render'
import { perform } from './run'
import { notes, strikes } from './score'
import { OrchestrionShow } from './show'

/**
 * Orchestrion, put together: the simulation run once, its log read as a score, the instrument drawn from both, and the
 * score played live by the engine as the show reaches each note (`live.ts`), or rendered to a file from the same log
 * where a file is wanted (`render.ts`). Where there is no audio context at all (the headless checks), the show is the
 * same, silent.
 */
export const run = perform()
export const score = notes(run)
export const show = new OrchestrionShow(makeDrawing(run, score), run.duration, run.machine.box)
export const camera = makeCamera(run, score)

export async function load(): Promise<ShowPerformance> {
  const live = canRender() ? liveMusic(strikes(run, score), async () => (await renderSoundtrack(run)).url) : null
  return {
    show,
    duration: run.duration,
    camera,
    // One place, no portals: nothing to iris.
    cuts: () => false,
    overview: () => run.machine.box,
    soundtrack: live
      ? {
          live,
          offset: 0,
          credit: 'No recording: every sound is the machine’s, synthesized live in your browser from its collisions',
        }
      : undefined,
  }
}

import type { Performance as ShowPerformance } from '../../../registry'
import { makeCamera } from './camera'
import { makeDrawing } from './draw'
import { canRender, renderSoundtrack } from './render'
import { perform } from './run'
import { notes } from './score'
import { OrchestrionShow } from './show'

/**
 * Orchestrion, put together: the simulation run once, its log read as a score, the instrument drawn from both, and the
 * soundtrack rendered from the same log in the page (`render.ts`). Where there is no audio context to render with (the
 * headless checks), the show is the same, silent.
 */
export const run = perform()
export const score = notes(run)
export const show = new OrchestrionShow(makeDrawing(run, score), run.duration, run.machine.box)
export const camera = makeCamera(run, score)

export async function load(): Promise<ShowPerformance> {
  const sound = canRender() ? await renderSoundtrack(run) : null
  return {
    show,
    duration: run.duration,
    camera,
    // One place, no portals: nothing to iris.
    cuts: () => false,
    overview: () => run.machine.box,
    soundtrack: sound
      ? {
          src: sound.url,
          offset: 0,
          credit: 'No recording: every sound is the machine’s, synthesized in your browser from its collisions',
        }
      : undefined,
  }
}

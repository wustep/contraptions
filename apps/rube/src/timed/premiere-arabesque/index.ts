import { renderFrame } from './render'
import { at, cameraAt, score } from './show'

/**
 * A named take for the future Shows registry. The host owns playback, audio,
 * speed, and export; every frame receives absolute show seconds. No review UI
 * or transport state is required to render this take, including at 2× speed.
 */
export const premiereArabesque = {
  id: score.id,
  title: score.title,
  performer: score.performer,
  version: score.revision,
  checkpoint: false,
  duration: score.duration,
  audio: {
    src: new URL('../../../../../docs/promo/premiere-arabesque-prati.mp3', import.meta.url).href,
    offset: score.audioOffset,
  },
  phrases: score.phrases,
  maps: score.maps,
  at,
  cameraAt,
  renderFrame,
} as const

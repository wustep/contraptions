import recording from '../../../../../../docs/promo/premiere-arabesque-prati.mp3'
import type { Performance } from '../../registry'
import { cameraAt, score, show } from '../../../timed/premiere-arabesque/show'

/**
 * The Shows performance for the already-authored Prati journey: PremiereShow,
 * its duration and camera, and the approved recording. Authored `visible` is
 * the vertical span in cells, which the stage calls `cells`. Credit lives
 * here, in the panel fields, never on the frame.
 *
 * Import the timed show module, not `./index`: that path pulls the preview
 * renderer and p5, which the headless Shows check cannot load. The recording
 * is imported as a file URL so the check's mp3 loader and Vite agree.
 */
export const loadPrati = (): Performance => ({
  show,
  duration: score.duration,
  camera: (t) => {
    const { x, y, visible } = cameraAt(t)
    return { x, y, cells: visible }
  },
  soundtrack: {
    src: recording,
    offset: score.audioOffset,
    credit: 'Performed by Patrizia Prati · CC BY-SA 4.0',
    href: 'https://commons.wikimedia.org/wiki/File:Claude_Debussy_-_Première_Arabesque_-_Patrizia_Prati.ogg',
  },
})

import type { Performance } from '../../registry'
import { premiereArabesque } from '../../../timed/premiere-arabesque'

/**
 * The Shows performance for the already-authored Prati journey: PremiereShow,
 * its duration and camera, and the approved recording. Authored `visible` is
 * the vertical span in cells, which the stage calls `cells`. Credit lives
 * here, in the panel fields, never on the frame.
 */
export const loadPrati = (): Performance => ({
  show: premiereArabesque.show,
  duration: premiereArabesque.duration,
  camera: (t) => {
    const { x, y, visible } = premiereArabesque.cameraAt(t)
    return { x, y, cells: visible }
  },
  soundtrack: {
    src: premiereArabesque.audio.src,
    offset: premiereArabesque.audio.offset,
    credit: 'Performed by Patrizia Prati · CC BY-SA 4.0',
    href: 'https://commons.wikimedia.org/wiki/File:Claude_Debussy_-_Première_Arabesque_-_Patrizia_Prati.ogg',
  },
})

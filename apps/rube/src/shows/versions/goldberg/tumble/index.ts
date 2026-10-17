import recording from '../bach-goldberg-1-ishizaka.mp3'
import type { Performance } from '../../../registry'
import { cameraAt } from './camera'
import { RECORDING } from './music'
import { MACHINE } from './score'
import { QuarterTurnShow } from './show'

/** The whole recording, and the last chord's ring, and the toy held still a moment after it. */
export const DURATION = RECORDING + 1.5

export const show = new QuarterTurnShow(MACHINE, DURATION)

export const performance: Performance = {
  show,
  duration: DURATION,
  camera: cameraAt,
  cuts: () => false,
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'J. S. Bach · Goldberg Variations, BWV 988 · Variatio 1 · played by Kimiko Ishizaka · CC0',
    href: 'https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_J.S._Bach-_-Open-_Goldberg_Variations,_BWV_988_(Piano)_-_02_Variatio_1_a_1_Clav.mp3',
  },
}

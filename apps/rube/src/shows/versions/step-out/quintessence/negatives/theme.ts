import type { Theme } from '../../../../../../../../src/core/themes'
import { INK, WEIGHT } from './hand'

/**
 * The Negatives: this place's theme (the B1 builder's). The street's hand (`hand.ts`): one graphite ink and one weight
 * for both bookends. Here it is the dark round the one light, so a ball shows its colour and the ink only where it
 * crosses the glass.
 */
export const NEGATIVES_THEME: Theme = {
  name: 'negatives',
  label: 'The Negatives',
  bg: '#121517',
  ink: INK,
  colors: ['#1C2023', '#3A4246', '#E4ECE8', '#B7C3C4', '#5E676C', '#2C2A27'],
  weight: WEIGHT,
  note: 'The negative assets room under the Life building: a dark basement, the one light the light table under the film.',
}

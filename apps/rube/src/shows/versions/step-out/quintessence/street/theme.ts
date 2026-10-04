import type { Theme } from '../../../../../../../../src/core/themes'
import { INK, WEIGHT } from '../negatives/hand'

/**
 * The Street: this place's theme (the B1 builder's). The negatives room's hand (`negatives/hand.ts`) in daylight: the
 * same graphite ink, the same weight, over a pale morning.
 */
export const STREET_THEME: Theme = {
  name: 'street',
  label: 'The Street',
  bg: '#E9ECEA',
  ink: INK,
  colors: ['#DEDAD1', '#D8D2C5', '#BFB3A3', '#55635D', '#D23A2E', '#F1EEE6'],
  weight: WEIGHT,
  note: 'A New York street in the morning: a newsstand, and the last issue of Life on it.',
}

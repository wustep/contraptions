import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The two worlds of Liftoff. Neither is in Machine's loop and neither is
 * registered anywhere: they exist for this show. A world here is a palette
 * and a name for the panel; the pieces are laid by the score, not drawn from
 * a pool, so `pieces` stays empty.
 */

/** The ball, the same in both worlds: a farm-rust orange that reads on dust and on the dark. */
export const BALL = '#D6602D'

/**
 * The gold ball: Amelia Brand. Cooper (the hero, `BALL`) has the farm and drives; she is NASA's, and joins him
 * at the base. She rides, where he makes things go. A gold that reads on the dust and on the dark. Her id is the
 * same wherever she is.
 */
export const GOLD = '#E2AE3C'
export const GOLD_ID = 99
/** What gold goes to with the years. */
export const GREY = '#9A958A'
/** The gold ball after the years in orbit: grey, with the gold still in it. Where Miller leaves her, and how he finds her. */
export const AGED = '#CDBF97'

export const FARM: Theme = {
  name: 'dust-bowl',
  label: 'Dust Bowl',
  bg: '#EEE3CB',
  ink: '#2A1F17',
  // corn, rust, faded teal, sage, denim, bone
  colors: ['#E2AE3C', '#B4492F', '#4E8A8C', '#8E9E62', '#34506F', '#F5EDDA'],
  weight: 0.78,
  note: 'Paper gone the colour of dust, and a brown-black ink.',
}

export const VOID: Theme = {
  name: 'far-side',
  label: 'Far Side',
  bg: '#0B0F1D',
  ink: '#ECE5D3',
  // foil gold, ice, hull, accretion amber, signal red, deep violet
  colors: ['#D9A441', '#8FC6E6', '#D9D4C6', '#F09340', '#E0533D', '#6E63C9'],
  weight: 0.8,
  note: 'The ink turned inside out: bone lines on the dark.',
}

/** The farm's materials, by name, so every part paints the same wood and the same corn. */
export const DUST = {
  corn: '#E2AE3C',
  rust: '#B4492F',
  teal: '#4E8A8C',
  sage: '#8E9E62',
  denim: '#34506F',
  bone: '#F5EDDA',
  wood: '#C4975F',
  /** The inside of the house: plaster gone warm. */
  wall: '#E5D4B3',
  /** Shadow on plaster and under things. */
  shade: '#D2BD96',
  /** Stalk and leaf. */
  leaf: '#7F9152',
  /** Dry leaf and husk. */
  husk: '#D9C27A',
  /** The sky at noon, as dust lets it be. */
  sky: '#D9DCD2',
  /** Light through a window. */
  light: '#FFF4D6',
  /** Tin: a toy's grey. */
  tin: '#ABA596',
}

/** The dark's materials. */
export const DARK = {
  gold: '#D9A441',
  ice: '#8FC6E6',
  hull: '#D9D4C6',
  amber: '#F09340',
  red: '#E0533D',
  violet: '#6E63C9',
  /** Panels in shadow. */
  slate: '#3A4257',
  /** The deep, a shade up from the paper. */
  deep: '#141A2E',
}

export const EARTH: World = {
  name: 'cornfield',
  label: 'Cornfield',
  note: 'A farm in the dust years: the house, the corn, the truck and the pad beyond the fence.',
  themes: [FARM],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

export const STATION: World = {
  name: 'station',
  label: 'Cooper Station',
  note: 'The farm again, rebuilt in the sky: a ring of land round a spinning axis, the old house kept as a museum.',
  themes: [FARM],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

export const SPACE: World = {
  name: 'endurance',
  label: 'Endurance',
  note: 'Orbit, the ring, the sphere past Saturn, a water world and the thing it circles.',
  themes: [VOID],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

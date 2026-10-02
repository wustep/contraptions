import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The two worlds of Liftoff. Neither is in Machine's loop and neither is
 * registered anywhere: they exist for this show. A world here is a palette
 * and a name for the panel; the pieces are laid by the score, not drawn from
 * a pool, so `pieces` stays empty.
 */

/**
 * Joseph Cooper, the hero: a warm sand, a pale ball with an ink edge. It reads
 * on the dark of space, and on the farm's paper by its edge and its warmth.
 */
export const BALL = '#F0C987'

/**
 * Dr. Amelia Brand: a deep blue. Cooper has the farm and drives; she is
 * NASA's, and joins him at the base. She rides, where he makes things go.
 * Her id is the same wherever she is.
 */
export const BRAND = '#1F5E98'
export const BRAND_ID = 99
/** What years do to a colour: grey. */
export const GREY = '#9A958A'
/**
 * Murph, old: Cooper's daughter, whom he finds again on Cooper Station at the
 * end, in the far-side house, a lifetime older than he is. A slate grey. She
 * is the one who sends him on, to Brand.
 */
export const MURPH = '#7C8C9C'
export const MURPH_ID = 98
/**
 * Murph, young: the same slate, before the years: lighter and bluer, and smaller (a child). She rocks on the porch
 * while he goes, sneaks into the truck's bed, follows him to the base, and is kept back at the tower by TARS.
 */
export const MURPH_YOUNG = '#8FA8C4'
export const MURPH_SMALL = 0.8

export const FARM: Theme = {
  name: 'painted-stage',
  label: 'Painted Stage',
  bg: '#263F78',
  ink: '#302B36',
  // corn, rust, faded teal, sage, denim, bone
  colors: ['#E9B67B', '#AE493E', '#C76850', '#73866B', '#263F78', '#EEE0C1'],
  weight: 0.66,
  note: 'Cream card, coral plywood and an ultramarine cyclorama.',
}

export const VOID: Theme = {
  name: 'far-side',
  label: 'Far Side',
  bg: '#17284E',
  ink: '#EEE0C1',
  // foil gold, ice, hull, accretion amber, signal red, deep violet
  colors: ['#E9B67B', '#EEE0C1', '#EEE0C1', '#C76850', '#AE493E', '#263F78'],
  weight: 0.8,
  note: 'Suspended cream forms against an ultramarine stage.',
}

/** The farm's materials, by name, so every part paints the same wood and the same corn. */
export const DUST = {
  corn: '#E9B67B',
  rust: '#AE493E',
  teal: '#C76850',
  sage: '#73866B',
  denim: '#263F78',
  bone: '#EEE0C1',
  wood: '#D7986A',
  /** The inside of the house: plaster gone warm. */
  wall: '#EEE0C1',
  /** Shadow on plaster and under things. */
  shade: '#C76850',
  /** Stalk and leaf. */
  leaf: '#526D5B',
  /** Dry leaf and husk. */
  husk: '#E9B67B',
  /** The sky at noon, as dust lets it be. */
  sky: '#263F78',
  /** Light through a window. */
  light: '#FFF1CE',
  /** Tin: a toy's grey. */
  tin: '#B9ACA0',
}

/** The dark's materials. */
export const DARK = {
  gold: '#E9B67B',
  ice: '#EEE0C1',
  hull: '#EEE0C1',
  amber: '#C76850',
  red: '#AE493E',
  violet: '#263F78',
  /** Panels in shadow. */
  slate: '#65596A',
  /** The deep, a shade up from the paper. */
  deep: '#203563',
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

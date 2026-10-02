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

/** One sheet of paper through all four worlds; light is paper left unprinted. */
export const FARM: Theme = {
  name: 'atlas-earth', label: 'Printed earth', bg: '#E9DFCB', ink: '#20221E',
  colors: ['#20221E', '#A35B3E', '#748174', '#A7A38C', '#D5C9AF', '#E9DFCB'],
  weight: 0.92, note: 'Carved ink, copper and sage on warm paper.',
}
export const VOID: Theme = {
  ...FARM, name: 'atlas-absence', label: 'Unprinted distance',
  note: 'The distance between impressions, on the same sheet of paper.',
}
export const DUST = {
  corn: '#A7A38C', rust: '#A35B3E', teal: '#748174', sage: '#748174',
  denim: '#555A4D', bone: '#E9DFCB', wood: '#A7A38C', wall: '#E9DFCB',
  shade: '#D5C9AF', leaf: '#20221E', husk: '#C6C6B3', sky: '#E9DFCB',
  light: '#E9DFCB', tin: '#748174',
}
export const DARK = {
  gold: '#A35B3E', ice: '#748174', hull: '#E9DFCB', amber: '#A35B3E',
  red: '#A35B3E', violet: '#748174', slate: '#555A4D', deep: '#20221E',
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

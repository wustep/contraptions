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
  name: 'dust-bowl',
  label: 'Dust Bowl',
  bg: '#B7A58A',
  ink: '#24241F',
  // corn, rust, faded teal, sage, denim, bone
  colors: ['#A58B57', '#77503C', '#697366', '#68715A', '#505A59', '#D8D0BE'],
  weight: 0.65,
  note: 'Paper gone the colour of dust, and a brown-black ink.',
}

export const VOID: Theme = {
  name: 'far-side',
  label: 'Far Side',
  bg: '#10151A',
  ink: '#D8D0BE',
  // foil gold, ice, hull, accretion amber, signal red, deep violet
  colors: ['#D9AA68', '#A6B8B7', '#D8D0BE', '#C58F56', '#86604B', '#545955'],
  weight: 0.65,
  note: 'The ink turned inside out: bone lines on the dark.',
}

/** The farm's materials, by name, so every part paints the same wood and the same corn. */
export const DUST = {
  corn: '#A58B57',
  rust: '#77503C',
  teal: '#697366',
  sage: '#68715A',
  denim: '#505A59',
  bone: '#D8D0BE',
  wood: '#76523C',
  /** The inside of the house: plaster gone warm. */
  wall: '#9D8B72',
  /** Shadow on plaster and under things. */
  shade: '#665C4C',
  /** Stalk and leaf. */
  leaf: '#555D44',
  /** Dry leaf and husk. */
  husk: '#A39169',
  /** The sky at noon, as dust lets it be. */
  sky: '#424C4C',
  /** Light through a window. */
  light: '#F5D9A6',
  /** Tin: a toy's grey. */
  tin: '#A7A597',
}

/** The dark's materials. */
export const DARK = {
  gold: '#D9AA68',
  ice: '#A6B8B7',
  hull: '#D8D0BE',
  amber: '#C58F56',
  red: '#86604B',
  violet: '#545955',
  /** Panels in shadow. */
  slate: '#484E4C',
  /** The deep, a shade up from the paper. */
  deep: '#171C22',
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

import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The worlds of Epilogue. Neither is in Machine's loop and neither is
 * registered anywhere: they exist for this show. A world here is a palette
 * and a name for the panel; the pieces are laid by the score, not drawn
 * from a pool, so `pieces` stays empty.
 *
 * Two places. The club is real: Seb's, late, one lamp, a dark room, the
 * piano. The dream is the club's own stage dressed as everywhere they could
 * have gone: painted flats on a dark stage, each lit in its own colour, with
 * the rigging showing where it wants to. When the set is struck, the club
 * is what is left.
 */

/**
 * Sebastian, the thread: the blue of the film's nights, a shade lighter so it
 * reads on the dark. He is the one at the piano, and every machine's beat is
 * his.
 */
export const SEB = '#5B8DD6'
/**
 * Mia: the yellow dress. She sits at her table in the club, and in the dream
 * she is with him everywhere. Her id is the same wherever she is.
 */
export const MIA = '#F2C94C'
export const MIA_ID = 99
/** Mia's husband, at the end: grey, a step behind her, a ball with no beat of his own. */
export const HUSBAND = '#8C8F96'
export const HUSBAND_ID = 98

export const CLUB: Theme = {
  name: 'sebs',
  label: "Seb's",
  bg: '#12141C',
  ink: '#E9DFC8',
  // brass, oxblood, lamp cream, a deep bottle green, the piano's black, smoke
  colors: ['#C9A14A', '#7A2E2E', '#FFE9B8', '#2E5A4E', '#07080B', '#6E7280'],
  weight: 0.8,
  note: 'A dark room after hours: bone lines on a blue-black paper, one warm lamp.',
}

export const DREAM: Theme = {
  name: 'backlot',
  label: 'Backlot',
  bg: '#221F3D',
  ink: '#F4EAD5',
  // Mia yellow, Seb blue, the Buick's red, sunset pink, sea green, the lights' gold
  colors: ['#F2C94C', '#5B8DD6', '#D9413A', '#E88C9A', '#2E8C8A', '#E8B74B'],
  weight: 0.8,
  note: 'A dark stage with painted flats lit in their own colours: the Technicolor of a dream.',
}

/** The club's materials, by name, so every part paints the same brass and the same lamp. */
export const BAR = {
  brass: '#C9A14A',
  oxblood: '#7A2E2E',
  lamp: '#FFE9B8',
  green: '#2E5A4E',
  black: '#07080B',
  smoke: '#6E7280',
  /** Wood: the piano's case in the lamp, the floor. */
  wood: '#3A2A22',
  /** The felt of a hammer, the cloth of a table. */
  felt: '#B8402E',
  /** A string, a wire: bright bone. */
  wire: '#F1E9D2',
  /** Shadow on the dark: a shade up from the paper. */
  deep: '#1B1E29',
}

/** The dream's materials: what the flats are painted with, and what the rigging is made of. */
export const PAINT = {
  yellow: '#F2C94C',
  blue: '#5B8DD6',
  red: '#D9413A',
  pink: '#E88C9A',
  sea: '#2E8C8A',
  gold: '#E8B74B',
  /** The magic-hour sky of a painted flat: violet to rose. */
  violet: '#5B4B9E',
  rose: '#F0A9A0',
  /** Painted foliage, a palm's fronds. */
  leaf: '#4E9E6A',
  /** A painted cloud, a plaster moon: cream. */
  cream: '#FBF2DC',
  /** Rigging: batten, rope, a flat's back. */
  timber: '#7A5A3A',
  /** A spotlight's beam on the dark. */
  beam: '#FFF1C2',
  /** Shadow on the stage: a shade up from the paper. */
  deep: '#2C2850',
}

export const SEBS: World = {
  name: 'sebs',
  label: "Seb's",
  note: 'A jazz club after hours: the piano, the tables, one lamp.',
  themes: [CLUB],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

export const BACKLOT: World = {
  name: 'backlot',
  label: 'Backlot',
  note: 'The club dressed as everywhere they could have gone: painted flats on a dark stage.',
  themes: [DREAM],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

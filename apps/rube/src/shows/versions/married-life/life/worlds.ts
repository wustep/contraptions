import type { Theme } from '../../../../../../../src/core/themes'
import { mixHex } from '../../../../parts'
import type { World } from '../../../../worlds'
import { AGE } from './music'

/**
 * The places of Married Life, and what everything in them is painted with. None of them is in Machine's loop or
 * registered anywhere: they exist for this show. A world here is a palette and a name for the panel; the parts are
 * laid by the score.
 *
 * Four places, each come back to: the church (the wedding, and the funeral), the house (built, lived in for years,
 * patched, and left idle), the hill (the clouds, and the fall), the clinic (the doctor's office, and the hospital).
 * The house has two sets far apart in its cells: FRONT (the street side, where the fixing-up and the end happen) and
 * INSIDE (the house cut open like a doll's house: the yard, the living room, the hall, the nursery upstairs).
 *
 * Use only these colours (plus alpha, and light), so every part paints the same house.
 */

/* ------------------------------------------------------------------ the two of them */

/**
 * Carl: the thread. Square (a rounded square, drawn by `cast.ts`): stiff, steady, a step behind her. A clear blue
 * when young; he greys with the years. The balloon he brings her at the end is this young blue, the one saturated
 * thing left in the frame.
 */
export const CARL = '#4E79B8'
export const CARL_OLD = '#8A929C'
/**
 * Ellie: company, round. Warm coral, the adventurer, a step ahead of him. Dusty rose when old. Her id is the same
 * wherever she is.
 */
export const ELLIE = '#E9785B'
export const ELLIE_OLD = '#CFA092'
export const ELLIE_ID = 99
/** The balloon: Carl's young blue. */
export const BALLOON = '#4E86D0'

/** Carl's colour at show time `t`: his blue greying with the years. */
export const carlAt = (t: number): string => mixHex(CARL, CARL_OLD, AGE(t))
/** Ellie's colour at `t`. */
export const ellieAt = (t: number): string => mixHex(ELLIE, ELLIE_OLD, AGE(t))

/* ------------------------------------------------------------------ the ink and the papers */

/** One ink for the whole show: a warm charcoal, never black. */
export const INK = '#2E2A28'

/** The house's materials, by name: siding, trim, roof, rooms, garden. */
export const HOME = {
  /** The clapboard: a soft sea-green. The film's house is many pastels; this one keeps three. */
  siding: '#A9CFBF',
  sidingOld: '#A7B8AE',
  /** Trim, window frames, the porch rail: cream. */
  trim: '#FBF3E4',
  /** Accents: shutters, the door. */
  pink: '#E7A3AE',
  yellow: '#EFC65C',
  /** The roof's shingles: a warm terracotta brown. */
  roof: '#9B5C46',
  roofOld: '#7E5E52',
  /** Wood: floors, the mantle, furniture. */
  wood: '#B78A5F',
  woodDark: '#7A5238',
  /** A wall cut through, in section. */
  section: '#5B4638',
  /** The living room's wallpaper, the hall's, the nursery's. */
  paper: '#EBD5B5',
  paperHall: '#DCC9A6',
  nursery: '#F2E4B8',
  /** The garden: grass, a tree's leaves, its bark, a path's stones. */
  grass: '#8DB36B',
  leaf: '#6E9E58',
  bark: '#6B4A36',
  stone: '#C8BBA6',
  /** The sky by day, at dusk, at night. */
  sky: '#BFDDEB',
  dusk: '#E8B99A',
  night: '#2B3448',
  /** Window light at night; a lamp. */
  lamp: '#FFE3A6',
  /** Glass, and the sky in it. */
  glass: '#DCEEF3',
  /** Coins: brass, and their shine. */
  brass: '#D8A93E',
  shine: '#FFF3C4',
}

/** The church's: plaster, pews, the altar's cloth, stained glass, candles. */
export const CHURCH = {
  plaster: '#EFE3CC',
  stone: '#C9BBA3',
  pew: '#6E4630',
  pewLight: '#8C5E42',
  cloth: '#F8F1E2',
  glassRed: '#C9574B',
  glassBlue: '#5A86B8',
  glassGold: '#E6B64E',
  glassGreen: '#6FA07A',
  candle: '#F4E7C8',
  flame: '#F2B84B',
  flowers: '#E7A3AE',
  /** Ellie's side of the church: bright, many; Carl's: grey, few. */
  herSide: ['#E9785B', '#EFC65C', '#6FA07A', '#E7A3AE', '#5A86B8'],
  hisSide: ['#6F6A66', '#8A847E', '#55504C'],
}

/** The hill's: grass by season, the tree, the sky, clouds. */
export const HILL = {
  grass: '#8DB36B',
  grassAutumn: '#B69A5B',
  leaf: '#6E9E58',
  leafAutumn: '#C9803F',
  bark: '#6B4A36',
  sky: '#BFDDEB',
  skyGrey: '#C3C7CB',
  cloud: '#FBF8F1',
  cloudShade: '#DCE4EA',
  /** The picnic blanket: red and cream check. */
  blanket: '#C9574B',
}

/** The clinic's: cold plaster, steel, blinds, the light through them. */
export const CLINIC = {
  wall: '#C9D3D1',
  floor: '#AEB9B7',
  steel: '#8E9A9C',
  blind: '#E8EDEC',
  light: '#F4F7F2',
  sheet: '#F2F4F1',
  chair: '#7F8C8A',
}

/* ------------------------------------------------------------------ themes: the paper under each place */

export const CHURCH_THEME: Theme = {
  name: 'church',
  label: 'Church',
  bg: '#EFE3CC',
  ink: INK,
  colors: [CHURCH.pew, CHURCH.glassRed, CHURCH.glassBlue, CHURCH.glassGold, CHURCH.stone, CHURCH.flowers],
  weight: 0.8,
  note: 'Warm plaster, dark pews, coloured glass: a small church in the morning.',
}

export const HOUSE_THEME: Theme = {
  name: 'house',
  label: 'The house',
  bg: '#F2E6D0',
  ink: INK,
  colors: [HOME.siding, HOME.pink, HOME.yellow, HOME.roof, HOME.wood, HOME.grass],
  weight: 0.8,
  note: 'A cream paper, sea-green clapboard, a terracotta roof: the house they fixed up and grew old in.',
}

export const HILL_THEME: Theme = {
  name: 'hill',
  label: 'The hill',
  bg: '#DCEBEF',
  ink: INK,
  colors: [HILL.grass, HILL.leaf, HILL.bark, HILL.blanket, HILL.cloud, HILL.sky],
  weight: 0.8,
  note: 'A green hill under a big sky: their picnic place.',
}

export const CLINIC_THEME: Theme = {
  name: 'clinic',
  label: 'The clinic',
  bg: '#DCE3E1',
  ink: '#2F3638',
  colors: [CLINIC.wall, CLINIC.floor, CLINIC.steel, CLINIC.blind, CLINIC.sheet, CLINIC.chair],
  weight: 0.8,
  note: 'Cold plaster and steel, blinds, a pale light: a doctor\'s office, and a hospital room.',
}

const world = (name: string, label: string, note: string, theme: Theme): World => ({
  name,
  label,
  note,
  themes: [theme],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
})

export type WorldKey = 'church' | 'house' | 'hill' | 'clinic'

export const WORLDS: Record<WorldKey, World> = {
  church: world('church', 'Church', 'Where they marry, and where he sits alone.', CHURCH_THEME),
  house: world('house', 'The house', 'The house they fix up, live in for years, patch, and leave idle.', HOUSE_THEME),
  hill: world('hill', 'The hill', 'Their picnic hill: clouds, and years later the climb.', HILL_THEME),
  clinic: world('clinic', 'The clinic', 'The doctor\'s office, and the hospital room.', CLINIC_THEME),
}

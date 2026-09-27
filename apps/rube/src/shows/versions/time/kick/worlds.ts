import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The places of Kick and the people in them. None of these worlds is in Machine's loop or registered anywhere: they
 * exist for this show. A world is a palette and a name for the panel; the pieces are laid by the score, so `pieces`
 * stays empty. **Use only these colours** (plus alpha, plus shades mixed from two of them with `mixHex`).
 *
 * Four worlds. **The dream** is the job, one world stacked in four levels, each a band of its own under the one above
 * it (the rain city, the hotel, the snow fortress, limbo), with the dark of sleep between them (`stack.ts`); limbo's
 * shore is also where the show opens. **Paris** is the architect's lesson, a dream of its own. **The plane** and
 * **home** are waking life.
 */

/* ------------------------------------------------------------------ the people */

/**
 * Dom Cobb: the thread, the one ball through every machine. Orange, the one warm thing in a cool dream; nothing else in
 * the show is this colour.
 */
export const COBB = '#E4863B'

/** Mal: wine. His guilt, in every dream he goes down into (never in waking life): she breaks the machines. */
export const MAL = '#8E2C49'
export const MAL_ID = 91

/** Ariadne: teal. The architect: she folds Paris, and goes down every level with him, and back up. */
export const ARIADNE = '#3E9E98'
export const ARIADNE_ID = 92

/** Robert Fischer: pale steel. The mark: taken down through the levels to his father's vault. */
export const FISCHER = '#AEB9C9'
export const FISCHER_ID = 93

/**
 * James and Phillipa, his children: two small balls. In his memory (limbo's garden) they are only ever seen from
 * behind, dark against the light (`KID_DARK`, with a dim rim); at home, at the end, in their own colours.
 */
export const KIDS = ['#F2C45A', '#7FB3DE'] as const
export const KID_DARK = '#2A2A33'
export const KID_SCALE = 0.62
export const KID_ID = 100

/* ------------------------------------------------------------------ the dream: the stack */

export const DREAM_THEME: Theme = {
  name: 'dream',
  label: 'The Dream',
  // The dark of sleep between the levels: what is seen where no level is.
  bg: '#14162A',
  ink: '#24262E',
  colors: ['#5E6874', '#3A4452', '#7A5A3E', '#E9EDF1', '#9DB0BE', '#C9BFA8'],
  weight: 0.8,
  note: 'A dream within a dream within a dream: four levels stacked, the dark of sleep between them.',
}

/** The dark of sleep between two levels (the director's; `stack.ts` draws it). */
export const SLEEP = {
  deep: '#14162A',
  mid: '#1D2038',
  mote: '#8F97C4',
}

/** Level 1, Yusuf's dream: a city in rain, a river under a bridge, a van, a freight train. */
export const RAIN = {
  sky: '#8C98A4',
  skyLow: '#A7B1BA',
  cloud: '#76828F',
  far: '#6E7985',
  building: '#5E6874',
  buildingDark: '#4A535D',
  window: '#C9CFC9',
  windowLit: '#E8D9A6',
  street: '#3A4047',
  streetWet: '#525A63',
  kerb: '#7C858D',
  rain: '#C9D3DC',
  river: '#3F5563',
  riverLight: '#6C8795',
  bridge: '#59626B',
  steel: '#434A52',
  van: '#D8D4C8',
  vanShade: '#A9A497',
  train: '#23262B',
  trainRust: '#6E3F2A',
  lamp: '#F2D48A',
}

/** Level 2, Arthur's dream: a grand hotel of the sixties: walnut, olive carpet, brass, milk glass. */
export const HOTEL = {
  wall: '#C9BFA8',
  wallShade: '#A89D86',
  wood: '#5A3E2B',
  woodLight: '#7A5A3E',
  carpet: '#56613F',
  carpetDark: '#434C31',
  brass: '#C19A55',
  glass: '#EDE7D6',
  lamp: '#FFE2A8',
  marble: '#E6E0D2',
  shaft: '#2E2A26',
  cable: '#1E1C1A',
  night: '#1B2130',
}

/** Level 3, Eames's dream: a mountain in snow, a fortress of concrete on it, and its vault. */
export const SNOW = {
  sky: '#C5D2DC',
  skyHigh: '#A7BCCB',
  snow: '#F3F6F8',
  snowShade: '#CBD8E2',
  snowDeep: '#9DB0BE',
  rock: '#6D747B',
  rockDark: '#4D535A',
  pine: '#3C4A45',
  concrete: '#8E949A',
  concreteDark: '#5F656B',
  vault: '#2A2E33',
  bed: '#E9E4DA',
  pinwheel: '#D9C27A',
  flash: '#FFF4DC',
}

/** Level 4, limbo: an endless shore, a grey sea, and a city of their own, crumbling into the water; their house. */
export const LIMBO = {
  sky: '#B7C1C4',
  skyWarm: '#D8CDB8',
  sea: '#6F8790',
  seaDeep: '#4B626C',
  foam: '#E7ECEA',
  sand: '#CFC4AE',
  sandWet: '#A99E88',
  concrete: '#9A9A95',
  concreteDark: '#6F706C',
  glass: '#AFC0C4',
  house: '#E2D6C0',
  roof: '#6A5F58',
  garden: '#8FA67A',
  gardenDark: '#6F8660',
  table: '#5B4636',
  lamp: '#F3DDA4',
}

/* ------------------------------------------------------------------ Paris */

export const PARIS_THEME: Theme = {
  name: 'paris',
  label: 'Paris',
  bg: '#C9D6DE',
  ink: '#2C2A2A',
  colors: ['#E3D6BF', '#C6B498', '#56606B', '#39443F', '#8B3A34', '#D9E3E8'],
  weight: 0.8,
  note: 'The architect\'s lesson: a street in Paris that folds up over itself, and a bridge of mirrors.',
}

export const PARIS = {
  sky: '#C9D6DE',
  skyHigh: '#AEC1CD',
  stone: '#E3D6BF',
  stoneShade: '#C6B498',
  slate: '#56606B',
  zinc: '#8A949C',
  iron: '#39443F',
  awning: '#3F5F58',
  cafe: '#2F3A36',
  cobble: '#9C9486',
  cobbleDark: '#7E776B',
  seine: '#6F8A94',
  glass: '#D9E3E8',
  mirror: '#E8EEF1',
  lamp: '#FFE7B5',
  crowd: '#2A2A30',
}

/* ------------------------------------------------------------------ waking life */

export const PLANE_THEME: Theme = {
  name: 'plane',
  label: 'The Plane',
  bg: '#141B2B',
  ink: '#E6E1D6',
  colors: ['#1F2940', '#2B3550', '#D8CFBD', '#F2DDAA', '#9FB3C8', '#3A4560'],
  weight: 0.8,
  note: 'A night flight from Sydney to Los Angeles: first class asleep, and a silver case open between the seats.',
}

export const PLANE = {
  night: '#141B2B',
  cabin: '#1F2940',
  cabinLit: '#2B3550',
  seat: '#D8CFBD',
  seatShade: '#B3A994',
  lamp: '#F2DDAA',
  window: '#3A4560',
  dawn: '#F0C8A0',
  dawnHigh: '#9FB3C8',
  hull: '#E3E6EA',
  case: '#B9BFC6',
  caseDark: '#7E858D',
  drip: '#DDE8F0',
  tube: '#E9EEF2',
}

export const HOME_THEME: Theme = {
  name: 'home',
  label: 'Home',
  bg: '#F3E9D6',
  ink: '#2E2A25',
  colors: ['#F3E9D6', '#D9C7A8', '#8FB36B', '#5E8A4B', '#B8894F', '#FFF6E2'],
  weight: 0.8,
  note: 'Los Angeles, a bright morning: the kitchen, the table, the garden, and the children.',
}

export const HOME = {
  wall: '#F3E9D6',
  wallShade: '#D9C7A8',
  floor: '#B8894F',
  floorShade: '#96703F',
  table: '#8A6040',
  lawn: '#8FB36B',
  lawnDark: '#6E9552',
  tree: '#5E8A4B',
  sky: '#CFE3F0',
  sun: '#FFF6E2',
  glass: '#DCEBF2',
}

/** The totem: a small spinning top of pewter (`cast.ts`, `top`). */
export const TOP = {
  pewter: '#9A9DA3',
  shine: '#E9ECEF',
  shade: '#5C6066',
}

/* ------------------------------------------------------------------ worlds */

const world = (name: string, label: string, note: string, theme: Theme): World => ({
  name,
  label,
  note,
  themes: [theme],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
})

export const WORLDS = {
  dream: world('dream', 'The Dream', 'Four levels down: the rain, the hotel, the snow, and limbo.', DREAM_THEME),
  paris: world('paris', 'Paris', 'The architect\'s lesson.', PARIS_THEME),
  plane: world('plane', 'The Plane', 'Sydney to Los Angeles, asleep.', PLANE_THEME),
  home: world('home', 'Home', 'The children, and the top.', HOME_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

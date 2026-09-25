import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The worlds of All at Once, one for every universe Evelyn jumps to. None is in Machine's loop and none is
 * registered anywhere: they exist for this show. A world here is a palette and a name for the panel; the pieces
 * are laid by the score, not drawn from a pool, so `pieces` stays empty.
 *
 * Every world keeps to its own paper, ink and materials, so a jump reads at once: the ball holds its place on the
 * screen and everything round it changes colour, line and matter.
 */

/* ------------------------------------------------------------------ the family */

/**
 * Evelyn Quan Wang, the hero: a vermilion ball. She has the laundromat, the taxes and the party, and every machine
 * is hers to make go. She is the one ball in every world.
 */
export const EVELYN = '#E4572E'
/** Joy, her daughter, who is also Jobu Tupaki: a violet ball. */
export const JOY = '#8A63D2'
export const JOY_ID = 97
/** Waymond, her husband, who is kind: a jade ball. */
export const WAYMOND = '#3F9A82'
export const WAYMOND_ID = 96

/** The googly eye: white, an ink ring, a black pupil that swings. */
export const EYE_WHITE = '#FFFFFF'
export const EYE_PUPIL = '#141414'

/* ------------------------------------------------------------------ home: the Wang family laundromat */

export const LAUNDROMAT: Theme = {
  name: 'laundromat',
  label: 'Laundromat',
  bg: '#E4E9DC',
  ink: '#23302C',
  colors: ['#C63D2F', '#E2A83A', '#9FC9C8', '#44628A', '#E7A2A6', '#F6F3EA'],
  weight: 0.8,
  note: 'Mint tile under fluorescent tubes, enamel and steel, and the red of the new year.',
}

/** The laundromat's materials, by name, so every part paints the same enamel and the same red. */
export const HOME = {
  /** Washer and dryer enamel. */
  enamel: '#F6F3EA',
  /** Brushed steel: a porthole's rim, a cart's frame, a coin slot. */
  steel: '#AEB6B1',
  steelDark: '#7E8883',
  /** A porthole's glass, and the water behind it. */
  glass: '#9FC9C8',
  glassDeep: '#5E8C8E',
  /** New year red: lanterns, the counter's trim. */
  red: '#C63D2F',
  /** Lantern gold, a coin. */
  gold: '#E2A83A',
  /** The wall's tile, and its grout shade. */
  tile: '#C7DCCB',
  tileDeep: '#9DBFAA',
  /** The floor. */
  floor: '#D3C7B1',
  wood: '#B5875A',
  /** A receipt, a form. */
  paper: '#FBF7EC',
  /** Fluorescent light. */
  light: '#FFF7DC',
  /** Laundry. */
  denim: '#44628A',
  rose: '#E7A2A6',
  butter: '#EDC766',
  /** The street and the room with its lights off. */
  night: '#1B2426',
}

/* ------------------------------------------------------------------ the premiere: Evelyn the movie star */

export const PREMIERE: Theme = {
  name: 'premiere',
  label: 'Premiere',
  bg: '#160E13',
  ink: '#F2E4CC',
  colors: ['#9E1B2A', '#E1B24C', '#C79A3E', '#FF5FA2', '#3FE0D0', '#8FA3C9'],
  weight: 0.8,
  note: 'A red carpet at night, flashbulbs and brass, and an alley in the rain behind it.',
}

export const STAR = {
  carpet: '#9E1B2A',
  carpetDeep: '#6E1220',
  gold: '#E1B24C',
  brass: '#C79A3E',
  velvet: '#5C0F1C',
  flash: '#FFFFFF',
  spot: '#FFF1C9',
  neonPink: '#FF5FA2',
  neonTeal: '#3FE0D0',
  rain: '#8FA3C9',
  wet: '#2A2F45',
  cream: '#F2E4CC',
}

/* ------------------------------------------------------------------ the dojo: a kung fu picture */

export const DOJO_THEME: Theme = {
  name: 'dojo',
  label: 'Dojo',
  bg: '#EFDDB7',
  ink: '#2B1B12',
  colors: ['#A86E3B', '#B12E26', '#4E8B69', '#D7A23B', '#7A4A26', '#F5EBD2'],
  weight: 0.85,
  note: 'An old kung fu picture: lacquer, wood and paper screens, drawn in a brush-black ink.',
}

export const DOJO = {
  wood: '#A86E3B',
  woodDeep: '#7A4A26',
  lacquer: '#B12E26',
  jade: '#4E8B69',
  gold: '#D7A23B',
  screen: '#F5EBD2',
  wash: '#5B4A3E',
}

/* ------------------------------------------------------------------ hot dog fingers */

export const HOTDOG_THEME: Theme = {
  name: 'hotdog',
  label: 'Hot Dog Fingers',
  bg: '#F7D8D0',
  ink: '#4A2622',
  colors: ['#D9785A', '#EFC98F', '#E8B630', '#C63A2B', '#7DA44B', '#C9A7D6'],
  weight: 0.8,
  note: 'A pink world where everything is floppy, and a piano is played with the feet.',
}

export const HOTDOG = {
  sausage: '#D9785A',
  sausageDeep: '#B25A40',
  bun: '#EFC98F',
  mustard: '#E8B630',
  ketchup: '#C63A2B',
  relish: '#7DA44B',
  piano: '#2E2430',
  ivory: '#FFF7E8',
  lilac: '#C9A7D6',
}

/* ------------------------------------------------------------------ Raccacoonie's kitchen */

export const HIBACHI_THEME: Theme = {
  name: 'hibachi',
  label: 'Raccacoonie',
  bg: '#20262A',
  ink: '#EEE6D6',
  colors: ['#8E989E', '#F28C28', '#FFD166', '#F4EAD0', '#F4A07E', '#8A847C'],
  weight: 0.8,
  note: 'A teppanyaki kitchen after dark: a steel griddle, flame, and a raccoon under the chef\'s hat.',
}

export const HIBACHI = {
  steel: '#8E989E',
  steelDeep: '#5A6268',
  flame: '#F28C28',
  flameHot: '#FFD166',
  onion: '#F4EAD0',
  shrimp: '#F4A07E',
  raccoon: '#8A847C',
  raccoonDeep: '#4A4541',
  hat: '#F7F4EE',
  soy: '#6B3F22',
  greens: '#6FA35A',
}

/* ------------------------------------------------------------------ the dark, where Jobu keeps the bagel */

export const VOID_THEME: Theme = {
  name: 'void',
  label: 'Jobu Tupaki',
  bg: '#0A090C',
  ink: '#EDE7DB',
  colors: ['#141216', '#E8D6A6', '#3A3440', '#EFE0BE', '#C98B5A', '#7A5CC8'],
  weight: 0.8,
  note: 'The dark round the everything bagel, and everything drifting into it.',
}

export const VOID = {
  /** The bagel's own black, a shade up from the paper so it reads as a thing. */
  bagel: '#17141A',
  bagelRim: '#2A2530',
  sesame: '#E8D6A6',
  poppy: '#3A3440',
  salt: '#FFFFFF',
  garlic: '#EFE0BE',
  onion: '#C98B5A',
  /** The light round its rim, warm, and the cold glow of its hole. */
  rimLight: '#F3D38A',
  glow: '#7A5CC8',
}

/* ------------------------------------------------------------------ the rocks */

export const ROCKS_THEME: Theme = {
  name: 'rocks',
  label: 'Rocks',
  bg: '#E8E1D2',
  ink: '#3A342D',
  colors: ['#B9A88F', '#8F7F69', '#C69C74', '#9E7759', '#D9C8AE', '#DCE3E4'],
  weight: 0.75,
  note: 'A canyon with nobody in it, and no sound but the wind: two rocks on a ledge.',
}

export const ROCKS = {
  stone: '#B9A88F',
  stoneDeep: '#8F7F69',
  canyon: '#C69C74',
  canyonShade: '#9E7759',
  far: '#D9C8AE',
  sky: '#DCE3E4',
  sand: '#E6D2AE',
}

/* ------------------------------------------------------------------ everywhere at once */

/** The frame the surf and the mosaic are drawn in: their parts paint every world themselves. */
export const MULTI_THEME: Theme = {
  name: 'multi',
  label: 'Everywhere',
  bg: '#0E0D10',
  ink: '#F0EADF',
  colors: ['#E4572E', '#8A63D2', '#3F9A82', '#E1B24C', '#9FC9C8', '#F7D8D0'],
  weight: 0.8,
  note: 'Every world at once.',
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
  home: world('laundromat', 'Laundromat', 'The Wang family laundromat, the taxes and the party.', LAUNDROMAT),
  premiere: world('premiere', 'Premiere', 'Evelyn the movie star: the red carpet, and the alley behind it.', PREMIERE),
  dojo: world('dojo', 'Dojo', 'Evelyn who learned kung fu.', DOJO_THEME),
  hotdog: world('hotdog', 'Hot Dog Fingers', 'Evelyn with hot dogs for fingers.', HOTDOG_THEME),
  hibachi: world('hibachi', 'Raccacoonie', 'Evelyn the teppanyaki chef, and the raccoon under the hat.', HIBACHI_THEME),
  void: world('void', 'Jobu Tupaki', 'The dark, and the everything bagel.', VOID_THEME),
  multi: world('multi', 'Everywhere', 'Every world at once.', MULTI_THEME),
  rocks: world('rocks', 'Rocks', 'The universe where there was no life: two rocks on a ledge.', ROCKS_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

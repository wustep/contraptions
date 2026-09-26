import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The worlds of Caravan and the people in them. None is in Machine's loop or registered anywhere: they exist for
 * this show. A world here is a palette and a name for the panel; the pieces are laid by the score, not drawn from a
 * pool, so `pieces` stays empty.
 *
 * Three places, as the film goes: Shaffer, the conservatory (a practice room at night, the studio band's room); the
 * road (a competition's backstage, the drive, the crash); and Carnegie Hall. The film is shot in tungsten amber and
 * deep black, with red only for blood and the hall's velvet. So are these.
 *
 * **Use only these colours** (plus alpha, plus shades mixed from two of them with `mixHex` in `parts.ts`).
 */

/* ------------------------------------------------------------------ the people */

/**
 * Andrew Neiman, the drummer: the thread. Every strike in the show is his. The yellow of the film's poster, a
 * shade warm so it reads on the dark and never against the brass (which is duller and darker).
 */
export const ANDREW = '#F2B233'
/** Terence Fletcher, the conductor: black, like his shirt, with the ink's rim. His hands are drawn by `fletcher.ts`. */
export const FLETCHER = '#1E1C1B'
export const FLETCHER_ID = 99
/** Fletcher's hands, the pale ends of his black rig: the instrument he plays the band with. */
export const HANDS = '#D8C3A3'
/** Jim Neiman, Andrew's father: a soft blue-grey, gentle. Only at Carnegie: at the stage door, and in the wings. */
export const JIM = '#8FA7BD'
export const JIM_ID = 98
/** Carl Tanner, the core drummer Andrew replaces: a dull olive. Only in the band room and at the competition. */
export const TANNER = '#8C8F66'
export const TANNER_ID = 97
/** Blood: one dab on one snare head, in the practice room at night. Nowhere else, ever. */
export const BLOOD = '#A3231F'

/* ------------------------------------------------------------------ the kit */

/** The drums, in every place: the kit is the one prop the whole film is about. */
export const KIT = {
  /** A drum's coated head, in light. */
  head: '#E9E1CF',
  /** The shell of the practice room's old kit: worn oxblood lacquer. */
  oxblood: '#6B2A24',
  /** The shell of the band's kit (the studio band, the competitions, Carnegie): black lacquer. */
  lacquer: '#0F0E0D',
  /** Stands, hoops, lugs, the throne's post. */
  chrome: '#B7B2A7',
  /** A cymbal: bronze, darker than the ball. */
  bronze: '#A9843F',
  /** A cymbal's lathe-lines and a hoop's shadow. */
  shade: '#3B3128',
  /** A stick: pale hickory. */
  hickory: '#D8C29A',
}

/* ------------------------------------------------------------------ Shaffer */

export const SHAFFER_THEME: Theme = {
  name: 'shaffer',
  label: 'Shaffer',
  bg: '#16130F',
  ink: '#EDE2CB',
  // tungsten, wood, acoustic panel, oxblood, chrome, bronze
  colors: ['#F0B35A', '#5A3F2A', '#3A3430', '#6B2A24', '#B7B2A7', '#A9843F'],
  weight: 0.8,
  note: 'A conservatory after dark: bone lines on a warm black, one tungsten lamp at a time.',
}

/** Shaffer's materials: the practice rooms, the corridor, the studio band's room. */
export const SHOP = {
  /** A bare bulb's light, a lamp's pool: tungsten. */
  tungsten: '#F0B35A',
  /** The walls' wood, a music stand's, a chair's. */
  wood: '#5A3F2A',
  /** Acoustic panels, the corridor's carpet: a warm grey a step up from the paper. */
  panel: '#3A3430',
  /** A door's small window, lit from inside. */
  window: '#F6D9A0',
  /** The band's chairs and stands: black. */
  black: '#0B0A09',
  /** Ice water: a pale blue, the only cool thing in the building. */
  ice: '#BFD6DE',
  /** Shadow on the dark: a shade up from the paper. */
  deep: '#221D18',
}

/* ------------------------------------------------------------------ the road */

export const ROAD_THEME: Theme = {
  name: 'road',
  label: 'The road',
  bg: '#1A1F26',
  ink: '#E6E2D8',
  // sodium, asphalt, the rental car, the truck, brake red, backstage curtain
  colors: ['#E8A64A', '#2B2F36', '#7C93A6', '#C9C2B0', '#B8362B', '#3E2A2E'],
  weight: 0.8,
  note: 'The competitions and the road between them: cool slate, sodium light, one red for the brakes.',
}

/** The road's materials. */
export const ROAD = {
  sodium: '#E8A64A',
  asphalt: '#2B2F36',
  /** The rental car Andrew races in: a pale steel blue. */
  car: '#7C93A6',
  /** The truck that hits it: dirty cream. */
  truck: '#C9C2B0',
  /** Brake lights, a stop light: never ball-sized, never round near him. */
  brake: '#B8362B',
  /** A backstage curtain, the competition's wings. */
  curtain: '#3E2A2E',
  /** A chart folder: manila. */
  folder: '#D9B878',
  /** Road markings, a lamp post's glass. */
  paint: '#E6E2D8',
  deep: '#232932',
}

/* ------------------------------------------------------------------ Carnegie Hall */

export const CARNEGIE_THEME: Theme = {
  name: 'carnegie',
  label: 'Carnegie Hall',
  bg: '#0C0A09',
  ink: '#F1E6CE',
  // stage gold, velvet, gilt, black lacquer, stage wood, spotlight cream
  colors: ['#E3B05B', '#6E1C22', '#B8903E', '#050505', '#4A3424', '#FFF1CF'],
  weight: 0.8,
  note: 'The hall at night: a black stage under gold light, the red velvet house in the dark.',
}

/** The hall's materials. */
export const HALL = {
  /** The stage lights, as light: gold. */
  gold: '#E3B05B',
  /** The house's seats and the curtain: red velvet. */
  velvet: '#6E1C22',
  /** The proscenium's gilt, the brass of the horns (duller than the ball, on purpose). */
  gilt: '#B8903E',
  /** The band's stands and chairs, the piano: black. */
  black: '#050505',
  /** The stage floor: dark wood. */
  floor: '#4A3424',
  /** A spotlight's beam, a lamp's core: cream. */
  beam: '#FFF1CF',
  /** The house in the dark. */
  deep: '#1A1411',
}

export const SHAFFER: World = {
  name: 'shaffer',
  label: 'Shaffer',
  note: 'The conservatory: a practice room at night, the studio band.',
  themes: [SHAFFER_THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

export const ROADS: World = {
  name: 'road',
  label: 'The road',
  note: 'The competitions, and the drive between them.',
  themes: [ROAD_THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

export const CARNEGIE_HALL: World = {
  name: 'carnegie',
  label: 'Carnegie Hall',
  note: 'The festival, the band on stage, the drummer.',
  themes: [CARNEGIE_THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

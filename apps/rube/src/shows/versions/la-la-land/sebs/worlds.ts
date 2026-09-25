import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The places of Seb's, and who is in them. None of them is in Machine's loop
 * or registered anywhere: they exist for this show. A world here is a
 * palette and a name for the panel; the parts are laid by the score, not
 * drawn from a pool, so `pieces` stays empty.
 *
 * Every part paints from its own place's materials below, plus alpha, and
 * nothing else: that is what makes nine sets one film.
 */

/* ------------------------------------------------------------------ the company */

/**
 * Sebastian, the thread: the blue of his club's light. He makes things go: he
 * plays, he pulls the lines, he follows her to Paris.
 */
export const SEB = '#4C7FD9'
/** Mia: the yellow of the dress she danced in above the city. Her id is the same wherever she is. */
export const MIA = '#F2C230'
export const MIA_ID = 91
/** David, whom she married: a warm grey. Only in the room, at the start and the end, never in the dream. */
export const DAVID = '#8E8579'
export const DAVID_ID = 92
/** Their son, who is only in the home movie: yellow and blue together. A small ball. */
export const SON = '#72AE5E'
export const SON_ID = 93
/** How big he is, against a grown ball. */
export const SON_SCALE = 0.62

/* ------------------------------------------------------------------ the places */

const theme = (name: string, label: string, bg: string, ink: string, colors: string[], note: string, weight = 0.8): Theme => ({ name, label, bg, ink, colors, weight, note })
const world = (name: string, label: string, note: string, t: Theme): World => ({ name, label, note, themes: [t], backdrops: ['plain'], pieces: [], tastes: { arranged: {} } })

/** Seb's, the club, now: indigo dark, a blue light on the stage, candles on the tables. */
export const SEBS_INK = theme('sebs', "Seb's", '#110F24', '#EDE4D0', ['#2E4FB8', '#E9A94B', '#7A2E3B', '#EDE4D0'], 'The club, now: indigo dark, one blue light, candles.')
export const SEBS_MAT = {
  /** The stage light, and the club's walls where it falls. */
  blue: '#2E4FB8',
  /** Deep of the room. */
  deep: '#1A1733',
  /** Walls in shadow. */
  wall: '#231F3F',
  /** Velvet: the curtain behind the stage. */
  velvet: '#5B2437',
  /** A candle's flame and what it lights. */
  candle: '#E9A94B',
  /** Warm table tops, brass. */
  brass: '#C99A52',
  /** The piano's black, a shade up from the dark so it has an edge. */
  lacquer: '#0B0A14',
  /** Ivory keys. */
  ivory: '#F1EADB',
  /** Felt of the hammers. */
  felt: '#C9B8A0',
  /** The pink the dream leaves in the room. */
  rose: '#C8628E',
}

/** Lipton's, at Christmas, in the dream: dark oxblood, lamps and garland. */
export const LIPTONS_INK = theme('liptons', "Lipton's", '#24120F', '#F2E3C8', ['#E9A94B', '#A8322D', '#3E6B4A', '#F2E3C8'], 'A supper club at Christmas: red shades, garland, a tree.')
export const LIPTONS_MAT = {
  wood: '#5A2C1D',
  panel: '#3A1C15',
  shade: '#A8322D',
  lamp: '#F2B65A',
  garland: '#3E6B4A',
  pine: '#2F5A3C',
  gold: '#D6A64A',
  cloth: '#EFE3CF',
  bulbs: ['#F2B65A', '#E0533D', '#6FAE8B', '#6D8FD6', '#F2E3C8'],
}

/** The theatre where her one-woman show plays to a full house. */
export const THEATRE_INK = theme('theatre', 'The Theatre', '#1A0E14', '#F2E3C8', ['#9E2433', '#D6A64A', '#F2E3C8'], 'A small house, red velvet, a marquee of bulbs.')
export const THEATRE_MAT = {
  velvet: '#9E2433',
  velvetDeep: '#5E1420',
  gold: '#D6A64A',
  bulb: '#FFE3A1',
  boards: '#6B4A33',
  seat: '#7A1D29',
  spot: '#FFF1CF',
  rose: '#D2404F',
}

/** The white studio, and the Hollywood set painted on it: paper-white flats, then colour. */
export const STUDIO_INK = theme('studio', 'The Studio', '#F4EFE6', '#26202E', ['#D8392F', '#7B4FA0', '#F2C230', '#3F6FC9'], 'A white sound stage; then a painted Hollywood in full colour.')
export const STUDIO_MAT = {
  paper: '#F4EFE6',
  flat: '#FBF8F2',
  shadow: '#E3DCCF',
  door: '#D8392F',
  purple: '#7B4FA0',
  /** The painted sky of the Hollywood number: violet to rose. */
  skyTop: '#4B2E86',
  skyLow: '#E0689A',
  bush: '#E9C53A',
  bushShade: '#C99E22',
  palm: '#3E7B57',
  road: '#3F57B8',
  star: '#F4D35E',
  lamp: '#FFE7A8',
  hill: '#8A5AA8',
  sign: '#FBF8F2',
  costume: ['#D8392F', '#F2C230', '#3F6FC9', '#3E9B6B', '#E8739E', '#F08A3C'],
}

/** The audition, in shadow play: a lit screen, black shapes. Only the two of them keep their colour. */
export const SHADOW_INK = theme('shadow', 'The Audition', '#F1ECE0', '#15131A', ['#15131A', '#F1ECE0'], 'A backlit screen; everything but the two of them is a shadow.')
export const SHADOW_MAT = {
  screen: '#F1ECE0',
  warm: '#F7EBCB',
  shadow: '#15131A',
  soft: '#3A3640',
}

/** The globe in the dark, and Paris at night beyond it. */
export const GLOBE_INK = theme('globe', 'Over the Sea', '#0E1022', '#EDE4D0', ['#D9C7A0', '#6E9FB5', '#C9A45C'], 'An old globe in the dark, a toy plane, Paris at night.')
export const GLOBE_MAT = {
  parchment: '#D9C7A0',
  sea: '#6E9FB5',
  land: '#C9A45C',
  brass: '#B8914A',
  wing: '#EDE4D0',
  city: '#F2C46B',
  night: '#141A3A',
}

/** The Paris club: a red room, a band, and then one trumpet in the dark. */
export const CLUB_INK = theme('club', 'Paris', '#2A0E10', '#F2E3C8', ['#B3262B', '#D6A64A', '#1C1C24'], 'A red jazz room in Paris; then a trumpet alone in the dark.')
export const CLUB_MAT = {
  red: '#B3262B',
  redDeep: '#6E1418',
  brass: '#D6A64A',
  black: '#141217',
  skin: '#EFE3CF',
  spot: '#FFF1CF',
  bulb: '#FFE3A1',
}

/** Painted Paris, and the stars: the dream's night, ultramarine and gold. */
export const NIGHT_INK = theme('night', 'Painted Paris', '#0B1030', '#EDE4D0', ['#2346A8', '#F2C46B', '#D2404F', '#EDE4D0'], 'A painted Paris in blue brushwork; then only stars.')
export const NIGHT_MAT = {
  ultramarine: '#2346A8',
  cobalt: '#1B3380',
  deep: '#0B1030',
  swirl: '#4C74D0',
  gold: '#F2C46B',
  petal: '#D2404F',
  white: '#F4F1EA',
  star: '#DCE6FF',
  balloon: ['#D2404F', '#F2C46B', '#4C9ED9', '#E8739E'],
}

/** The home movie: Kodachrome gone warm, a projector's light. */
export const MOVIE_INK = theme('movie', 'Home Movie', '#E9D9B6', '#4B3526', ['#E08A3C', '#4F9C9A', '#E8739E', '#F2C230'], 'Their life together on eight-millimetre film, gone warm.', 0.7)
export const MOVIE_MAT = {
  cream: '#F2E5C6',
  warm: '#E9D9B6',
  orange: '#E08A3C',
  teal: '#4F9C9A',
  pink: '#E8739E',
  sun: '#F2C230',
  grass: '#9DB36A',
  sky: '#BFD8D6',
  pool: '#5FB3C4',
  /** The dark room the projector stands in. */
  room: '#141018',
  beam: '#FFF2D0',
}

/** The drive, and the walk to the club: night, headlights, a blue neon arrow. */
export const DRIVE_INK = theme('drive', 'The Drive', '#0D1124', '#EDE4D0', ['#E0533D', '#F2D08A', '#3F7BFF'], 'Night traffic, an exit, a street, a blue neon arrow.')
export const DRIVE_MAT = {
  asphalt: '#1B1F33',
  tail: '#E0533D',
  head: '#F2D08A',
  neon: '#3F7BFF',
  neonCore: '#CFE0FF',
  brick: '#3A2A3A',
  sodium: '#E9A94B',
  car: ['#6F2B34', '#2F4C6E', '#8A8F99', '#3B5B45', '#C9B48A'],
}

export const SEBS: World = world('sebs', "Seb's", 'The club, now.', SEBS_INK)
export const LIPTONS: World = world('liptons', "Lipton's", 'Where he first played it for her.', LIPTONS_INK)
export const THEATRE: World = world('theatre', 'The Theatre', 'Her show, and a full house.', THEATRE_INK)
export const STUDIO: World = world('studio', 'The Studio', 'A white stage, and a painted Hollywood.', STUDIO_INK)
export const SHADOW: World = world('shadow', 'The Audition', 'In shadow.', SHADOW_INK)
export const GLOBE: World = world('globe', 'Over the Sea', 'To Paris.', GLOBE_INK)
export const CLUB: World = world('club', 'Paris', 'A jazz room, and a trumpet.', CLUB_INK)
export const NIGHT: World = world('night', 'Painted Paris', 'A waltz, and the stars.', NIGHT_INK)
export const MOVIE: World = world('movie', 'Home Movie', 'The life.', MOVIE_INK)
export const DRIVE: World = world('drive', 'The Drive', 'Home, and out again.', DRIVE_INK)

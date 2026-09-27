import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The places of Magnum and the people in them. None of these worlds is in Machine's loop or registered anywhere: they
 * exist for this show. A world is a palette and a name for the panel; the pieces are laid by the score, so `pieces`
 * stays empty. **Use only these colours** (plus alpha, plus shades mixed from two of them with `mixHex`).
 *
 * Five places, in the film's order: the awards night Derek loses to Hansel; Mugatu's day spa, where he is pampered and
 * then taught to strike on a song; the underground walk-off; the Derelicte show, where the song is played; and the
 * Derek Zoolander Center for Kids Who Can't Read Good.
 */

/* ------------------------------------------------------------------ the people */

/**
 * Derek Zoolander: the thread, the one ball through every machine. Steel blue: Blue Steel, his look, and nothing else
 * in the show is this colour.
 */
export const DEREK = '#4C88C2'

/** Hansel: gold, so hot right now. Derek's rival at the awards and the walk-off, his friend after, and at Derelicte the one who pulls the plug. */
export const HANSEL = '#E3A83B'
export const HANSEL_ID = 91

/** Jacobim Mugatu: ivory, his hair. Runs the spa's machine, plays the song at Derelicte, throws the star. */
export const MUGATU = '#F2ECDF'
export const MUGATU_ID = 92

/** The Prime Minister of Malaysia: crimson. In the front row at Derelicte; in the spa, the target is his colour. */
export const PM = '#C0392F'
export const PM_ID = 93

/** The kids at the Center: small balls, soft colours none of the cast has. `KID_SCALE` of a ball. Ids from `KID_ID`. */
export const KIDS = ['#8FD6B0', '#C4A6E3', '#F4A58F', '#7FCFD0', '#F2C6DE'] as const
export const KID_SCALE = 0.62
export const KID_ID = 100

/* ------------------------------------------------------------------ the awards */

export const AWARDS_THEME: Theme = {
  name: 'awards',
  label: 'The Awards',
  bg: '#17142A',
  // Bone lines on the dark: the ink turned inside out.
  ink: '#EDE6D6',
  colors: ['#221F36', '#3A3558', '#4A1F3D', '#C8A04E', '#FFE7B0', '#0E0C1B'],
  weight: 0.8,
  note: 'A theatre at night: a black stage and its runway out into the dark, a wall of bulbs, the spotlights.',
}

export const AWARDS = {
  /** The house: the dark over the seats, deeper at the back. */
  house: '#17142A',
  houseDeep: '#0E0C1B',
  /** The stage and its runway, black and glossy; their lit edges. */
  stage: '#221F36',
  stageEdge: '#3A3558',
  runway: '#0F0E18',
  runwayLit: '#2E2A48',
  /** The curtain, plum velvet, and its folds' shade. */
  curtain: '#4A1F3D',
  curtainShade: '#2E1428',
  /** Trim, the trophy, the bulbs, the spots. */
  gold: '#C8A04E',
  trophy: '#D9B25C',
  bulb: '#FFE7B0',
  spot: '#FFF3D9',
  warm: '#FFCF8A',
  /** The audience in the dark: shapes, never balls. */
  crowd: '#0A0914',
  crowdRim: '#2B2745',
}

/* ------------------------------------------------------------------ the spa */

export const SPA_THEME: Theme = {
  name: 'spa',
  label: 'The Day Spa',
  bg: '#1B1D1F',
  ink: '#E7E2D7',
  colors: ['#23282A', '#2F7F7B', '#EEEBE3', '#B8925A', '#A7CDB9', '#8D949A'],
  weight: 0.8,
  note: 'Mugatu\'s day spa: black marble, teal water, white towels and brass; and behind the steam, a machine.',
}

export const SPA = {
  marble: '#1B1D1F',
  marbleVein: '#34383B',
  tile: '#23282A',
  water: '#2F7F7B',
  waterLight: '#8ED3CB',
  towel: '#EEEBE3',
  towelShade: '#CFCAC0',
  mint: '#A7CDB9',
  brass: '#B8925A',
  candle: '#FFC977',
  steam: '#DCE5E2',
  mud: '#6B4E3A',
  cucumber: '#7FB069',
  cucumberPale: '#D6E8B8',
  /** The conditioning rig: steel, and the target in the Prime Minister's crimson (`PM`). */
  steel: '#8D949A',
  steelDark: '#5C6368',
  horn: '#B8925A',
}

/* ------------------------------------------------------------------ the club */

export const CLUB_THEME: Theme = {
  name: 'club',
  label: 'The Walk-Off',
  bg: '#111215',
  ink: '#E6E6EA',
  colors: ['#26272B', '#1B1C20', '#34363C', '#FF4057', '#46F29A', '#5A5E66'],
  weight: 0.8,
  note: 'Underground: raw concrete, a crowd in the dark, smoke, and lasers across the floor.',
}

export const CLUB = {
  dark: '#111215',
  concrete: '#26272B',
  concreteLit: '#3A3C42',
  floor: '#1B1C20',
  floorLit: '#34363C',
  pipe: '#3E4046',
  smoke: '#5A5E66',
  laserRed: '#FF4057',
  laserGreen: '#46F29A',
  spot: '#F4F2EC',
  crowd: '#08090B',
  crowdRim: '#2A2C33',
}

/* ------------------------------------------------------------------ Derelicte */

export const DERELICTE_THEME: Theme = {
  name: 'derelicte',
  label: 'Derelicte',
  bg: '#2B2522',
  ink: '#ECE4D2',
  colors: ['#4F352C', '#4A4845', '#8B4A2B', '#7D8287', '#1D1E21', '#D2CBBB'],
  weight: 0.8,
  note: 'Mugatu\'s show in a raw warehouse: brick, rust and steel, a runway of pallets and scaffold, fire in the barrels, trash worn as couture.',
}

export const DERELICTE = {
  /** The warehouse: brick, its shade, the concrete floor, the dark up in the roof. */
  brick: '#4F352C',
  brickDark: '#3A2620',
  concrete: '#4A4845',
  concreteDark: '#34322F',
  roof: '#1E1A18',
  /** Its steel: scaffold, corrugated sheet, chain-link, rust. */
  steel: '#7D8287',
  steelDark: '#50555A',
  corrugated: '#6A6F74',
  chain: '#8A8F94',
  rust: '#8B4A2B',
  /** The collection's stuff: bin bags and their sheen, newspaper, cardboard. */
  bag: '#1D1E21',
  bagSheen: '#3E4148',
  paper: '#D2CBBB',
  paperShade: '#A9A293',
  cardboard: '#A57F57',
  /** Fire in the barrels; the spots. */
  fire: '#FF9E3D',
  fireCore: '#FFE08A',
  spot: '#FFF5DD',
  /** The runway, and its lit edge. */
  runway: '#2A2826',
  runwayEdge: '#E9E1CF',
  /** The DJ's booth, the record. */
  booth: '#2C2E33',
  vinyl: '#121214',
  /** The audience: shapes in the dark, never balls. */
  crowd: '#0D0D0F',
  crowdRim: '#3A3430',
  /** The throwing star. */
  star: '#C9CED3',
}

/* ------------------------------------------------------------------ the Center */

export const CENTER_THEME: Theme = {
  name: 'center',
  label: 'The Center',
  bg: '#BCD6EA',
  ink: '#2B2D31',
  colors: ['#E9E2D3', '#CBBFA9', '#5F7384', '#8CB866', '#4E7D43', '#F1EDE4'],
  weight: 0.8,
  note: 'The Derek Zoolander Center for Kids Who Can\'t Read Good, on a bright morning: pale stone, lawn and trees.',
}

export const CENTER = {
  sky: '#BCD6EA',
  skyHigh: '#9DC2E0',
  cloud: '#F4F7F9',
  stone: '#E9E2D3',
  stoneShade: '#CBBFA9',
  roof: '#5F7384',
  glass: '#9FC3D9',
  lawn: '#8CB866',
  lawnDark: '#6E9A4F',
  tree: '#4E7D43',
  treeDark: '#3B6634',
  path: '#D9C3A5',
  plinth: '#F1EDE4',
  sheet: '#FBFAF6',
  brass: '#B8925A',
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
  awards: world('awards', 'The Awards', 'Male Model of the Year: Derek is sure it is his.', AWARDS_THEME),
  spa: world('spa', 'The Day Spa', 'Mugatu\'s spa: pampered, then taught.', SPA_THEME),
  club: world('club', 'The Walk-Off', 'Derek and Hansel, underground, under the lasers.', CLUB_THEME),
  derelicte: world('derelicte', 'Derelicte', 'The show, the song, the plug, the star.', DERELICTE_THEME),
  center: world('center', 'The Center', 'For Kids Who Can\'t Read Good.', CENTER_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

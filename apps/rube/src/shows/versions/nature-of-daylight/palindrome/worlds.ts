import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The places of Palindrome and the people in them. None of these worlds is in Machine's loop or registered anywhere:
 * they exist for this show. A world is a palette and a name for the panel; the pieces are laid by the score, so
 * `pieces` stays empty. **Use only these colours** (plus alpha, plus shades mixed from two of them with `mixHex`).
 *
 * Six places: the lake house (Louise's, where Hannah is: her life, which the film lets us take for the past), the
 * valley in Montana where the shell comes down out of the cloud, the inside of the shell (the chamber and the glass),
 * the fog beyond the glass where the heptapods are, the command tent at the camp (the twelve screens: the world), and
 * the gala in the future where General Shang tells her what to say.
 *
 * The show's one warm, saturated colour is Louise's gold. Nothing else is that colour: lamps are paler, wood is
 * greyer, the gala's lights are champagne.
 */

/* ------------------------------------------------------------------ the people */

/**
 * Louise Banks, the linguist: the thread, the one ball through every machine. Gold: the daylight of the cue, the
 * warm thing in every frame.
 */
export const LOUISE = '#E9A93A'

/** Ian Donnelly, the physicist: a clear blue ball, with her from the camp to the chamber, and on the meadow at the end. */
export const IAN = '#4E7FB5'
export const IAN_ID = 91

/**
 * Hannah, her daughter: a rose ball that grows (`HANNAH_AGE`), seen only at the lake house (and in what Louise sees in
 * the fog, which is the lake house).
 */
export const HANNAH = '#DE6F86'
export const HANNAH_ID = 92
/**
 * Hannah's size as she grows: a scale on the ball. A ladder a viewer can read across the cuts: a baby, a small child on
 * the swing, a girl near Louise's height by the leap, a young woman nearly her size. (Child 0.58 to girl 0.72, she read
 * as the same small ball from the swing to the bed.)
 */
export const HANNAH_AGE = { baby: 0.42, child: 0.5, girl: 0.8, young: 0.92 } as const

/** General Shang: a deep red ball, only at the gala (the future), where he tells her what to say. */
export const SHANG = '#A8322D'
export const SHANG_ID = 93

/* ------------------------------------------------------------------ the lake house */

export const HOUSE_THEME: Theme = {
  name: 'house',
  label: 'The Lake House',
  bg: '#DCDDD8',
  ink: '#2B2F32',
  colors: ['#D9DAD5', '#B9A78F', '#93A7AE', '#2F3E3A', '#EEF1EF', '#8A9E78'],
  weight: 0.8,
  note: 'A long room of glass and concrete over a grey lake, pines, the fog on the water, and a lawn down to it.',
}

export const HOUSE = {
  /** The room: pale concrete and plaster, pale oak, the long window's black mullions. */
  wall: '#D9DAD5',
  wallShade: '#BEC0BA',
  concrete: '#A9ABA6',
  floor: '#B9A78F',
  floorDark: '#8F7F6C',
  wood: '#7D6A58',
  woodDark: '#5E5044',
  linen: '#EDEAE3',
  linenShade: '#CFCBC2',
  mullion: '#2E3134',
  /** Through the glass: the lake, the far shore's pines and hills, the fog on the water. */
  glass: '#E9EEEE',
  lake: '#93A7AE',
  lakeDeep: '#687E86',
  lakeLight: '#CBD7D8',
  pines: '#2F3E3A',
  pinesFar: '#6B7C78',
  hills: '#8A9897',
  fog: '#EEF1EF',
  /** Outside: the lawn down to the water, and the dock. */
  grass: '#8A9E78',
  grassDark: '#66785A',
  dock: '#6F665C',
  /** The light: dawn, day, dusk, night, and a lamp (paler than her gold). */
  dawn: '#E4E6E2',
  day: '#DDE5E8',
  dusk: '#B9ADA7',
  night: '#262C33',
  lamp: '#F2D7A0',
  /** A television's glow at night. */
  tv: '#BFD3DC',
}

/* ------------------------------------------------------------------ the valley */

export const VALLEY_THEME: Theme = {
  name: 'valley',
  label: 'Montana',
  bg: '#C9CFCE',
  ink: '#25292B',
  colors: ['#7A8F63', '#2A2D30', '#E8EBE9', '#5B6150', '#8C9297', '#FFF1C9'],
  weight: 0.8,
  note: 'A green valley under low cloud, fog on the ridges, the camp, and the shell come down out of the cloud.',
}

export const VALLEY = {
  /** The sky: low, overcast, the cloud's underside and its shade. */
  sky: '#C9CFCE',
  skyHigh: '#B2BBBD',
  cloud: '#E8EBE9',
  cloudShade: '#C3C9C8',
  fog: '#E4E8E6',
  /** The land: far ridges, the near hills, the wet meadow, rock. */
  ridgeFar: '#9DA8A5',
  ridge: '#7A8A80',
  hill: '#66795C',
  meadow: '#7A8F63',
  meadowDark: '#5A6D4C',
  grass: '#96A97A',
  rock: '#878883',
  /** The shell: graphite, its rim catching the sky, its belly darker. */
  shell: '#2A2D30',
  shellRim: '#474D51',
  shellDark: '#1B1D1F',
  /** The camp: olive drab, white tent canvas, steel, the floodlights and their lamps. */
  olive: '#5B6150',
  oliveDark: '#444938',
  canvas: '#C9C6B6',
  canvasShade: '#A6A393',
  steel: '#8C9297',
  steelDark: '#5E6468',
  floodlight: '#FFF1C9',
  lamp: '#FFE3A6',
  road: '#9A9586',
}

/* ------------------------------------------------------------------ inside the shell */

export const SHELL_THEME: Theme = {
  name: 'shell',
  label: 'The Shell',
  bg: '#15171A',
  ink: '#D8D5CB',
  colors: ['#212428', '#373C41', '#F3F4F0', '#DADFDC', '#41474C', '#0F1113'],
  weight: 0.8,
  note: 'Dark stone, and at the end of it a wall of white light: the glass, and the heptapods behind it.',
}

export const SHELL = {
  dark: '#0F1113',
  wall: '#212428',
  wallLit: '#373C41',
  floor: '#1A1D20',
  /** The glass: a wall of white, the fog lit behind it. */
  glow: '#F3F4F0',
  screen: '#F6F7F3',
  screenEdge: '#C8CDCA',
  fogLit: '#DADFDC',
  mist: '#9CA4A4',
  /** The heptapods, as the glass shows them: grey in the white. */
  heptapod: '#41474C',
  heptapodDark: '#2A2F33',
  /** Their ink, and her marker's (the whiteboard). */
  ink: '#131517',
  board: '#E9EAE6',
  marker: '#2C3136',
  /** The team's suits (hazmat, pale) and the canary. */
  suit: '#C9CBC3',
  canary: '#E7D46A',
}

/* ------------------------------------------------------------------ the fog */

export const FOG_THEME: Theme = {
  name: 'fog',
  label: 'Beyond the Glass',
  bg: '#ECEEEB',
  ink: '#24292C',
  colors: ['#F1F3F0', '#DADFDC', '#C1C8C6', '#A7B0AF', '#495156', '#14171A'],
  weight: 0.8,
  note: 'White fog, soft light from nowhere, the heptapods near, and their ink hanging in the air.',
}

export const FOG = {
  white: '#F1F3F0',
  grey: '#DADFDC',
  deep: '#C1C8C6',
  shadow: '#A7B0AF',
  heptapod: '#495156',
  heptapodFar: '#8B9597',
  ink: '#14171A',
  inkSoft: '#3B4246',
}

/* ------------------------------------------------------------------ the command tent */

export const TENT_THEME: Theme = {
  name: 'tent',
  label: 'The Command Tent',
  bg: '#23272A',
  ink: '#C9D2D2',
  colors: ['#2B2F2C', '#3E4440', '#CFE0E6', '#9FC3CF', '#15181B', '#8FD1C1'],
  weight: 0.8,
  note: 'Night in the command tent: canvas, cables, and twelve screens in a ring, one for every shell on Earth.',
}

export const TENT = {
  canvas: '#2B2F2C',
  canvasLit: '#3E4440',
  frame: '#1D201E',
  floor: '#252826',
  desk: '#3A3F3C',
  cable: '#101214',
  /** A screen off, on, and its glow. */
  screenOff: '#15181B',
  screenOn: '#CFE0E6',
  screenGlow: '#9FC3CF',
  /** A link's signal light (teal, never her gold). */
  signal: '#8FD1C1',
  /** The sat phone: black plastic and a green lit keypad. */
  phone: '#1A1C1E',
  keypad: '#A9D8B8',
}

/* ------------------------------------------------------------------ the gala */

export const GALA_THEME: Theme = {
  name: 'gala',
  label: 'The Gala',
  bg: '#1E2A30',
  ink: '#E6E2D8',
  colors: ['#1E2A30', '#2F4049', '#F6EBD2', '#EBD3A0', '#E6E2D8', '#121A1E'],
  weight: 0.8,
  note: 'Years later: an evening reception, champagne light, and a man who has come to thank her.',
}

export const GALA = {
  room: '#1E2A30',
  roomLit: '#2F4049',
  light: '#F6EBD2',
  lightWarm: '#EBD3A0',
  cloth: '#E6E2D8',
  guests: '#121A1E',
  glass: '#D9E4E6',
  floor: '#2A353B',
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
  house: world('house', 'The Lake House', 'Louise and Hannah: the cradle, the swing, the bed by the window.', HOUSE_THEME),
  valley: world('valley', 'Montana', 'The shell comes down out of the cloud over the meadow, and goes back up into it.', VALLEY_THEME),
  shell: world('shell', 'The Shell', 'The chamber and the glass: contact, and the language.', SHELL_THEME),
  fog: world('fog', 'Beyond the Glass', 'The heptapods, and what they show her.', FOG_THEME),
  tent: world('tent', 'The Command Tent', 'Twelve screens, one for every shell: the world.', TENT_THEME),
  gala: world('gala', 'The Gala', 'The future: General Shang.', GALA_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

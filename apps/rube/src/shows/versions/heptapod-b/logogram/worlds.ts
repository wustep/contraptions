import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The places of Logogram and the people in them. None of these worlds is in Machine's loop or registered anywhere:
 * they exist for this show. A world is a palette and a name for the panel; the pieces are laid by the score, so
 * `pieces` stays empty. **Use only these colours** (plus alpha, plus shades mixed from two of them with `mixHex`).
 *
 * Four places: the lake house (the future, Louise's, where Hannah is), the valley in Montana where the shell hangs
 * over the meadow, the inside of the shell (the shaft and the chamber, dark, with the glass at its end), and the fog
 * beyond the glass, where the heptapods are and where they write.
 */

/* ------------------------------------------------------------------ the people */

/**
 * Louise Banks, the linguist: the thread, the one ball through every machine. Hazmat orange, the suit the team wears
 * into the shell, and the warm thing in every frame: nothing else in the show is this colour.
 */
export const LOUISE = '#E2672C'

/** Ian Donnelly, the physicist: a steel-blue ball, with her from the helicopter to the glass, and at the end. */
export const IAN = '#5B84B1'
export const IAN_ID = 91

/**
 * Hannah, her daughter: a little peach ball (a paler Louise), seen only at the lake house, which is the future. Her
 * scale is `HANNAH_SCALE` (a small child) or `HANNAH_OLDER` (the second vision).
 */
export const HANNAH = '#F4A582'
export const HANNAH_ID = 92
export const HANNAH_SCALE = 0.62
export const HANNAH_OLDER = 0.82

/* ------------------------------------------------------------------ the lake house */

export const LAKE_THEME: Theme = {
  name: 'lake',
  label: 'The Lake House',
  bg: '#E6E8E4',
  ink: '#2A2F31',
  colors: ['#DCDDD6', '#A88F76', '#9FB1B6', '#34443F', '#F1F3F0', '#8FA37A'],
  weight: 0.8,
  note: 'A long room of glass over a grey lake, pines, and the fog on the water.',
}

export const LAKE = {
  /** The room: pale plaster, oak floor, a low bench under the long window, the window's dark mullions. */
  wall: '#DCDDD6',
  wallShade: '#C6C7BF',
  floor: '#A88F76',
  floorDark: '#86705C',
  bench: '#8E7560',
  mullion: '#3A3F41',
  rug: '#8D8F86',
  /** Through the glass: the lake, the far shore's pines and hills, the fog on the water. */
  glass: '#EEF1EE',
  lake: '#9FB1B6',
  lakeDeep: '#71868D',
  lakeLight: '#D2DCDC',
  pines: '#34443F',
  pinesFar: '#6E807B',
  hills: '#8E9C9B',
  fog: '#F1F3F0',
  /** Outside: the grass down to the shore. */
  grass: '#8FA37A',
  grassDark: '#6D8260',
  /** The light: dawn, day, dusk, night, and a lamp. */
  dawn: '#E9E4DA',
  day: '#D8E2E6',
  dusk: '#C9B5A6',
  night: '#2A3036',
  lamp: '#F6D9A3',
}

/* ------------------------------------------------------------------ the valley */

export const VALLEY_THEME: Theme = {
  name: 'valley',
  label: 'Montana',
  bg: '#D5DAD8',
  ink: '#262B2D',
  colors: ['#7E9466', '#2B2F32', '#E9ECEA', '#5E6450', '#8E9499', '#FFF2C6'],
  weight: 0.8,
  note: 'A green valley under low cloud, fog pouring over its ridges, and the shell hanging over the meadow.',
}

export const VALLEY = {
  /** The sky: low, overcast, the cloud's underside and its shade. */
  sky: '#CDD3D2',
  skyHigh: '#B7C0C1',
  cloud: '#EEF0EE',
  cloudShade: '#C9CECD',
  fog: '#E9ECEA',
  /** The land: far ridges, the near hills, the wet meadow, rock. */
  ridgeFar: '#A2ADA9',
  ridge: '#7F8F84',
  hill: '#6A7E60',
  meadow: '#7E9466',
  meadowDark: '#5E7350',
  grass: '#9AAE7E',
  rock: '#8B8C86',
  /** The shell: a dark stone-grey, its rim catching the sky, its belly darker; the slot in it, and the slot's light. */
  shell: '#2B2F32',
  shellRim: '#4B5155',
  shellLight: '#687075',
  shellDark: '#1D2022',
  slot: '#0E1011',
  slotLight: '#F3F1E6',
  /** The camp: olive drab, canvas, steel, the floodlights and their warm lamps. */
  olive: '#5E6450',
  oliveDark: '#474C3C',
  canvas: '#8E8B70',
  steel: '#8E9499',
  steelDark: '#5F6569',
  floodlight: '#FFF2C6',
  lamp: '#FFD98A',
  pad: '#6F7271',
  road: '#9C9788',
}

/* ------------------------------------------------------------------ inside the shell */

export const SHELL_THEME: Theme = {
  name: 'shell',
  label: 'The Shell',
  bg: '#15171A',
  // Bone lines on the dark: the ink turned inside out.
  ink: '#D9D6CC',
  colors: ['#23272A', '#3A3F43', '#F4F5F1', '#DFE3E1', '#434A4E', '#101214'],
  weight: 0.8,
  note: 'A shaft of dark stone that turns gravity, and a chamber at its end with a wall of white light: the glass.',
}

export const SHELL = {
  dark: '#101214',
  wall: '#23272A',
  wallLit: '#3A3F43',
  ridge: '#2E3337',
  floor: '#1B1E21',
  /** The light at the shaft's end, and the glass: a wall of white, the fog lit behind it. */
  glow: '#F4F5F1',
  glowWarm: '#EDEBE3',
  screen: '#F7F8F4',
  screenEdge: '#C9CECB',
  fogLit: '#DFE3E1',
  mist: '#9EA6A6',
  /** The heptapods, as the glass shows them: grey in the white. */
  heptapod: '#434A4E',
  heptapodDark: '#2C3236',
  /** Their ink. */
  ink: '#141618',
}

/* ------------------------------------------------------------------ the fog */

export const FOG_THEME: Theme = {
  name: 'fog',
  label: 'Beyond the Glass',
  bg: '#ECEEEB',
  ink: '#24292C',
  colors: ['#F2F4F1', '#DCE0DD', '#C3C9C7', '#A9B1B0', '#4A5256', '#15181A'],
  weight: 0.8,
  note: 'White fog, soft light from nowhere, the heptapods near, and their ink hanging in the air.',
}

export const FOG = {
  white: '#F2F4F1',
  grey: '#DCE0DD',
  deep: '#C3C9C7',
  shadow: '#A9B1B0',
  heptapod: '#4A5256',
  heptapodFar: '#8A9496',
  ink: '#15181A',
  inkSoft: '#3C4347',
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
  lake: world('lake', 'The Lake House', 'Louise and Hannah by the long window over the lake.', LAKE_THEME),
  valley: world('valley', 'Montana', 'The shell over the meadow, the camp, the lift.', VALLEY_THEME),
  shell: world('shell', 'The Shell', 'The shaft where gravity turns, and the chamber with the glass.', SHELL_THEME),
  fog: world('fog', 'Beyond the Glass', 'The heptapods and their ink.', FOG_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

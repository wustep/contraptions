import type { Theme } from '../../../../../../../src/core/themes'
import { mixHex } from '../../../../parts'
import type { World } from '../../../../worlds'

/**
 * The places of Merry-Go-Round and the people in them. None of these worlds is in Machine's loop or registered
 * anywhere: they exist for this show. A world is a palette and a name for the panel; the pieces are laid by the
 * score, so `pieces` stays empty. **Use only these colours** (plus alpha, plus shades mixed from two of them with
 * `mixHex`).
 *
 * Four places, each one set however often it is visited: the hatter's town (the hat shop, its street and its sky;
 * dawn, then day, then night, then the war), the wastes (the hills, the castle walking, the collapse, the flight),
 * the castle's one room (the hearth and the door; morning, then the war), and the flower fields by the lake.
 */

/* ------------------------------------------------------------------ the people */

/**
 * Sophie, the hatter: the thread, the one ball through every machine. Her colour is her age (`sophie(age)`): chestnut
 * when she is young (her braid), a dull silver when the curse has her, and at the end, the curse broken, a bright
 * silver: young, with her hair gone silver, as in the film. Never text: the colour is the only telling.
 */
export const SOPHIE_YOUNG = '#A85A3A'
export const SOPHIE_OLD = '#9D99AA'
export const SOPHIE_SILVER = '#E4E1EE'
/** Sophie's colour at an age from 0 (young) to 1 (old). */
export const sophie = (age: number): string => mixHex(SOPHIE_YOUNG, SOPHIE_OLD, age)

/** Howl, the wizard: a cornflower ball (his earring, the blue of his coat). As the bird he goes to ink. */
export const HOWL = '#4D7FD4'
export const HOWL_BIRD = '#2C2E46'
export const HOWL_ID = 91
/** Markl, Howl's apprentice: a small sage ball (scale `MARKL_SCALE`). */
export const MARKL = '#6DAA78'
export const MARKL_SCALE = 0.72
export const MARKL_ID = 92

/**
 * Calcifer, the fire demon: never a ball, always a flame (`cast.ts` draws him). His size is the show's energy. Blue
 * when he is weak (the water, the plank's last steps).
 */
export const CALCIFER = {
  body: '#F58A2E',
  core: '#FFD35C',
  edge: '#D8462A',
  weak: '#5F8FE0',
  weakCore: '#BFD6FF',
  eye: '#FFF4D6',
  pupil: '#3A1F14',
}

/** Turnip Head, the hopping scarecrow: a turnip for a head, a pole for a leg, a coat on a crossbar, a hat. */
export const TURNIP = {
  turnip: '#EFE6D2',
  top: '#9A5E9E',
  leaf: '#6E9A58',
  hat: '#3F3530',
  coat: '#8A7560',
  pole: '#7A5A3E',
}

/** Heen, Suliman's wheezing dog: fawn and grey, long ears. */
export const HEEN = { coat: '#C9BCA5', ear: '#8A7F72', nose: '#2B2626' }

/** The Witch of the Waste: vast in her furs. */
export const WITCH = { fur: '#3B2F3C', furLight: '#5A4A5C', face: '#EEDFD0', lip: '#9A2E3A', pearl: '#F1ECE0' }

/** The colour dial over the door: where it opens. Green where the castle stands, blue Porthaven, red Kingsbury, black Howl's war. */
export const DIAL = { green: '#4E9A5E', blue: '#3E74C2', red: '#C23B3B', black: '#1A1A1E', brass: '#C49A4A' }

/* ------------------------------------------------------------------ the hatter's town */

export const TOWN_THEME: Theme = {
  name: 'town',
  label: 'The Hatter\'s Town',
  bg: '#EFE6D5',
  ink: '#2E2A33',
  colors: ['#F3E9D6', '#5E7187', '#7FA69A', '#D9A7A0', '#E6B85C', '#8FB4C4'],
  weight: 0.8,
  note: 'Plaster and timber, slate roofs and mint shutters, a canal: the town the hat shop is in.',
}

export const TOWN = {
  plaster: '#F3E9D6',
  plasterShade: '#DCCDB3',
  timber: '#6E5140',
  timberDark: '#4E3A2F',
  /** Roofs are slate and moss, never terracotta: Sophie is the warm thing in the frame. */
  slate: '#5E7187',
  slateDark: '#46566A',
  moss: '#7F9A6E',
  shutter: '#7FA69A',
  rose: '#D9A7A0',
  gold: '#E6B85C',
  glow: '#FFE7A8',
  canal: '#8FB4C4',
  cobble: '#B8AA96',
  cobbleDark: '#978A78',
  /** The hats: felt, straw, ribbon. */
  felt: '#6B7F9A',
  straw: '#E4CF8E',
  ribbon: '#C9707A',
  /** Skies: dawn, day, dusk, night. */
  dawn: '#F4D9C0',
  day: '#BFD9E8',
  dusk: '#E8B99A',
  night: '#1E2436',
  nightHigh: '#101422',
  /** The war: fire and its smoke. */
  fire: '#F08A3A',
  fireHot: '#FFD27A',
  ember: '#B8432A',
  smoke: '#4A4550',
  /** The soldiers' blue, the Witch's blob men's black. */
  soldier: '#44557A',
  blob: '#2A2528',
}

/* ------------------------------------------------------------------ the wastes */

export const WASTES_THEME: Theme = {
  name: 'wastes',
  label: 'The Wastes',
  bg: '#D9E2DA',
  ink: '#2A2A31',
  colors: ['#8E6A9A', '#7A9A62', '#A7B98A', '#9A958C', '#5C6475', '#C39A4A'],
  weight: 0.8,
  note: 'Heather and moss, rock and mist, and the castle walking over it.',
}

export const WASTES = {
  heather: '#8E6A9A',
  heatherDeep: '#6C4E78',
  moss: '#7A9A62',
  hill: '#A7B98A',
  hillFar: '#BCC9B2',
  rock: '#9A958C',
  rockDark: '#6F6B64',
  mist: '#EEF1EC',
  /** Skies: afternoon, dusk, night, the grey morning after the war, the last blue. */
  sky: '#C9D9E3',
  skyHigh: '#9FBCD2',
  dusk: '#E9C3A0',
  night: '#1C2233',
  grey: '#B9C0C4',
  blue: '#8EC0E6',
  gold: '#F1C27E',
  cloud: '#F7F5F0',
  /** The castle: iron, rust, brass, slate, stone, wood, and its steam. */
  iron: '#4A4A52',
  ironDark: '#34343B',
  rust: '#9A5A3A',
  brass: '#C39A4A',
  slate: '#5C6475',
  stone: '#B7AFA2',
  stoneDark: '#8F877B',
  wood: '#7A5A3E',
  window: '#FFE3A3',
  steam: '#F4F1EA',
  /** The bombers and the warships: dull iron, never the castle's. */
  warship: '#5A5F66',
}

/* ------------------------------------------------------------------ the castle's room */

export const ROOM_THEME: Theme = {
  name: 'room',
  label: 'Howl\'s Castle',
  bg: '#E6D6BE',
  ink: '#2A1E17',
  colors: ['#8A6242', '#5A3E2A', '#A5553E', '#C27A45', '#CFE3E8', '#3B3330'],
  weight: 0.8,
  note: 'One room: the hearth where Calcifer burns, a table, a sink, a stair, and a door with a colour dial.',
}

export const ROOM = {
  plaster: '#E6D6BE',
  plasterShade: '#CDB999',
  wood: '#8A6242',
  woodDark: '#5A3E2A',
  brick: '#A5553E',
  brickDark: '#7C3E2E',
  hearth: '#2A1D17',
  soot: '#3B3330',
  copper: '#C27A45',
  window: '#CFE3E8',
  cloth: '#A8B7A0',
  /** Morning light through the window, and the war's red through it. */
  sun: '#FFF1CF',
  warLight: '#D8643A',
  night: '#241C1A',
}

/* ------------------------------------------------------------------ the flower fields */

export const FLOWERS_THEME: Theme = {
  name: 'flowers',
  label: 'The Flower Fields',
  bg: '#E4EEF2',
  ink: '#27383A',
  colors: ['#8DBF63', '#F4D35E', '#E8766A', '#FFFDF4', '#F2A3B5', '#6FAFCF'],
  weight: 0.75,
  note: 'A valley of flowers under the mountains, a lake, and the little hut Howl had as a boy.',
}

export const FLOWERS = {
  meadow: '#8DBF63',
  meadowDeep: '#5E9A4A',
  meadowFar: '#B5D39A',
  /** Flowers: small, many, in clusters and sprays, never a round ball-sized blob in anyone's colour. */
  yellow: '#F4D35E',
  coral: '#E8766A',
  white: '#FFFDF4',
  pink: '#F2A3B5',
  lilac: '#B7A3D9',
  lake: '#6FAFCF',
  lakeDeep: '#3E7FA6',
  mountain: '#8EA3B5',
  mountainFar: '#B8C6D2',
  snow: '#F5F7F8',
  sky: '#BFDDF0',
  skyHigh: '#8FC0E3',
  hut: '#C9A77A',
  hutRoof: '#6F7F5A',
  wheel: '#8A6A4A',
  /** The war's fleet on the far sky, late. */
  fleet: '#6B6F78',
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
  town: world('town', 'The Hatter\'s Town', 'The hat shop, its street, the sky over the roofs, and the war.', TOWN_THEME),
  wastes: world('wastes', 'The Wastes', 'The hills, the castle walking, falling apart, and flying.', WASTES_THEME),
  room: world('room', 'Howl\'s Castle', 'The room inside the castle: the hearth and the door.', ROOM_THEME),
  flowers: world('flowers', 'The Flower Fields', 'The valley of flowers and the lake.', FLOWERS_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

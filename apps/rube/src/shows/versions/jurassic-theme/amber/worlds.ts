import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The places of Amber, and the two people in them. None of these worlds is in Machine's loop. A world is a palette
 * and a name; the pieces are laid by the score. **Use only these colours** (plus alpha, plus shades mixed from two
 * of them). Grant's sandstone is his alone.
 */

/** Dr Grant: the thread. Sandstone. Nothing else in the show is this colour. */
export const GRANT = '#C4A15A'

/** Dr Sattler. She waits by the egg, rides with him after, and does nothing of her own. */
export const ELLIE = '#3E7A48'
export const ELLIE_ID = 91

/* ------------------------------------------------------------------ the dig */

export const DIG_THEME: Theme = {
  name: 'dig',
  label: 'The Dig',
  bg: '#C9B59A',
  ink: '#3A2C22',
  colors: ['#A07850', '#8C6844', '#E6D5C0', '#8A6240', '#7A5A3C', '#C4A078'],
  weight: 0.85,
  note: 'Montana, a badlands cut: dust, a bone, a crate.',
}

export const DIG = {
  sky: '#C9B59A',
  skyLow: '#B09778',
  mesa: '#A07850',
  mesaFar: '#B89270',
  mesaDark: '#7A5A3C',
  ground: '#8C6844',
  groundDark: '#5C4632',
  dust: '#C4A078',
  bone: '#E6D5C0',
  boneDark: '#C2AD92',
  wood: '#8A6240',
  woodDark: '#5E422C',
  ink: '#3A2C22',
}

/* ------------------------------------------------------------------ the lab */

export const LAB_THEME: Theme = {
  name: 'lab',
  label: 'The Lab',
  bg: '#E4E0D6',
  ink: '#3C403C',
  colors: ['#E4E0D6', '#B7B1A4', '#E09A32', '#F4F0E6', '#8E969C', '#D5E0E2'],
  weight: 0.8,
  note: 'A bench, a cane, a rack of pipettes, an egg.',
}

export const LAB = {
  wall: '#E4E0D6',
  wallShade: '#C9C3B6',
  bench: '#B7B1A4',
  benchEdge: '#8E887C',
  steel: '#8E969C',
  glass: '#D5E0E2',
  amber: '#E09A32',
  amberDeep: '#B56A18',
  cane: '#F0E6D4',
  egg: '#F4F0E6',
  eggShade: '#D9D0C0',
  ink: '#3C403C',
}

/* ------------------------------------------------------------------ the valley */

export const VALLEY_THEME: Theme = {
  name: 'valley',
  label: 'The Valley',
  bg: '#9EC4D2',
  ink: '#243028',
  colors: ['#9EC4D2', '#2C5A3C', '#6B5A40', '#5C6B45', '#5E6B42', '#6A726C'],
  weight: 0.85,
  note: 'The gate, the road, and a giant in the grass.',
}

export const VALLEY = {
  sky: '#9EC4D2',
  skyHigh: '#D5E6EC',
  haze: '#A9C3B4',
  hill: '#6E8F78',
  hillFar: '#8AA890',
  canopy: '#2C5A3C',
  canopyDeep: '#1C3C28',
  grass: '#4E7344',
  ground: '#6B5A40',
  groundDark: '#4A3E2E',
  road: '#8A7D68',
  steel: '#6A726C',
  steelDark: '#454C48',
  steelEdge: '#8B948C',
  hide: '#5C6B45',
  hideDark: '#3A4830',
  hideLight: '#7C8B62',
  jeep: '#5E6B42',
  jeepDark: '#3E4A2E',
  tire: '#2A2C28',
  tree: '#234833',
  ink: '#243028',
}

/* ------------------------------------------------------------------ the dawn */

export const DAWN_THEME: Theme = {
  name: 'dawn',
  label: 'Dawn',
  bg: '#E7C8A4',
  ink: '#2C2A28',
  colors: ['#E7C8A4', '#7E9AA4', '#3E5344', '#4A5560', '#6A655C', '#3A4046'],
  weight: 0.8,
  note: 'A pad above the sea, an island, a helicopter.',
}

export const DAWN = {
  skyHigh: '#F3E2C4',
  sky: '#E7C8A4',
  skyDeep: '#C9A0A0',
  sea: '#7E9AA4',
  seaDeep: '#5C7E8A',
  island: '#3E5344',
  hull: '#4A5560',
  hullLight: '#6A7580',
  glass: '#D5E4EA',
  rotor: '#3A4046',
  bird: '#2C2A28',
  pad: '#6A655C',
  ink: '#2C2A28',
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

export const WORLDS = {
  dig: world('dig', 'The Dig', 'Dust, a bone, a crate.', DIG_THEME),
  lab: world('lab', 'The Lab', 'A cane, a rack, an egg.', LAB_THEME),
  valley: world('valley', 'The Valley', 'The gate, and what it opens on.', VALLEY_THEME),
  dawn: world('dawn', 'Dawn', 'The island, leaving.', DAWN_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

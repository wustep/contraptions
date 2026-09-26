import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The world of Mountain King and the people in it. It is in no machine loop and registered nowhere: it exists for
 * this show. A world here is a palette and a name for the panel; the pieces are laid by the score, so `pieces` stays
 * empty.
 *
 * One place: the Dovre mountain in cross-section, on a summer night in Norway. Outside, the flank, the path and the
 * sky (night, then dawn at the very end). Inside, the rock, lit only where a lantern or a torch is burning; the
 * tunnels, the Mountain King's hall, the mines under it, the trolls' drum and the mountain's heart. The paper is the
 * rock: anything not drawn is solid mountain.
 *
 * **Use only these colours** (plus alpha, plus shades mixed from two of them with `mixHex` in `parts.ts`).
 */

/* ------------------------------------------------------------------ the people */

/**
 * Peer Gynt: the thread. Every strike in the show is his. A warm red, like the red of a Norwegian waistcoat: the
 * only red in the mountain, so he reads against the grey rock, the amber light and the trolls' moss.
 */
export const PEER = '#E0533D'
/**
 * The Woman in Green, the Mountain King's daughter: a clear leaf green, brighter and cooler than any troll's moss.
 * She brings Peer into the mountain and goes to her father's side. A ball, like him (she looks human; she is a troll).
 */
export const WOMAN = '#6DBE5A'
export const WOMAN_ID = 98

/* ------------------------------------------------------------------ the trolls */

/** The trolls: drawn, never balls (`troll.ts`). Hide, moss and the pale of an eye or a tusk. */
export const TROLL = {
  /** The common troll's hide: a grey-olive, like lichened stone. */
  hide: '#6E6F52',
  /** An older, bigger troll: darker, browner. */
  old: '#54503E',
  /** Moss and tufts growing on them. */
  moss: '#7F8B45',
  /** The underside, the lip, the inside of an ear: a shade lighter. */
  pale: '#9C9774',
  /** An eye's glint, a tusk, a claw: bone. Small, never round and ball-sized. */
  bone: '#E6DDC0',
  /** The deep shadow in a troll's mouth and under its brow. */
  shade: '#2A2A22',
}

/** The Mountain King's gold: his crown, the throne's studs, the court's treasure. Duller than any light. */
export const GOLD = '#C9A13E'

/* ------------------------------------------------------------------ the mountain */

export const MOUNTAIN_THEME: Theme = {
  name: 'dovre',
  label: 'The Dovre mountain',
  // The rock itself: a blue-black granite. Everything not drawn is mountain.
  bg: '#15181D',
  ink: '#E4DDCB',
  // stone, lantern amber, troll hide, moss, iron, gold
  colors: ['#4A515B', '#F0A64B', '#6E6F52', '#7F8B45', '#3B3632', '#C9A13E'],
  weight: 0.8,
  note: 'A mountain in cross-section at night: blue-black granite, amber lanterns, trolls the colour of lichen.',
}

/** The rock: granite in four steps from the paper up, for walls, floors, strata and fallen stone. */
export const STONE = {
  /** The paper: solid mountain. */
  deep: '#15181D',
  /** A cave's back wall, far from any light. */
  dark: '#232830',
  /** A wall or floor in lantern light. */
  mid: '#3A414B',
  /** A lit edge, a ledge's lip, a fallen block's face. */
  light: '#5F6773',
  /** Wet rock and ice: a stalactite's tip, a drip. */
  wet: '#8FA3B3',
}

/** Light inside the mountain: lanterns and torches. */
export const LAMP = {
  /** A lantern's glass, a torch's flame: amber. */
  flame: '#F0A64B',
  /** The hot core of a flame (small, never round near Peer). */
  core: '#FFD58A',
  /** The pool of light a lantern throws, as a soft glow (alpha only). */
  glow: '#F7B866',
}

/** The trolls' works: iron, timber, leather and drumskin. */
export const WORKS = {
  /** Wrought iron: lantern cages, rails, gears, chains. */
  iron: '#3B3632',
  /** Iron in light, a worn edge. */
  steel: '#77716A',
  /** Old timber: carts, beams, the drum's shell. */
  wood: '#5C4128',
  /** Timber in light. */
  timber: '#86633F',
  /** Rope and leather. */
  rope: '#9B7F57',
  /** A drumskin, stretched hide. */
  skin: '#CDB58A',
  /** Rust, and the forge's red glow in the heart (never ball-sized near Peer). */
  rust: '#A3542B',
}

/** Outside: the sky over the mountain, the far valley, and the dawn at the end. */
export const SKY = {
  /** The summer night: deep blue, never black (it is Norway in summer: it never gets quite dark). */
  night: '#1B2440',
  /** Low on the horizon at night: a paler blue. */
  dusk: '#33406A',
  /** Stars: small, few. */
  star: '#E8E6F0',
  /** Far mountains and the valley at night. */
  far: '#11172A',
  /** Dawn: the sky low over the far ridge. */
  dawn: '#F2C48D',
  /** Dawn: high sky. */
  morning: '#8FB4D8',
  /** The sun's rim (never round and ball-sized near Peer: it is a rim on the ridge, then a disc far away). */
  sun: '#FFE3A6',
  /** Grass on the flank, in dawn light; at night the same grass is `mixHex(grass, night, 0.7)`. */
  grass: '#6F8F4A',
  /** The stave church's tarred wood and its bell. */
  tar: '#3A2A20',
  bell: '#B08A45',
}

export const DOVRE: World = {
  name: 'dovre',
  label: 'The Dovre mountain',
  note: 'The Mountain King’s hall under the mountain, and the mountain round it.',
  themes: [MOUNTAIN_THEME],
  backdrops: ['plain'],
  pieces: [],
  tastes: { arranged: {} },
}

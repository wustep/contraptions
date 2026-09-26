import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'

/**
 * The worlds of Spark. Every fire is a door: a spark that goes into one fire can come out of any other, in any
 * world. None of these is in Machine's loop and none is registered anywhere; they exist for this show. A world here
 * is a palette, its materials and a name for the panel; the pieces are laid by the score, so `pieces` stays empty.
 *
 * Each world keeps to its own paper, ink, materials and feel, so a fire-door reads at once: the spark holds its place
 * on the screen and everything round it becomes somewhere else.
 *
 *   loft        the chandler's loft at night: beeswax, pewter, oak, moonlight. Still and careful.
 *   glassworks  a glasshouse by day: sea-glass, brick, molten gold. Viscous, then brittle and ringing.
 *   regatta     a balloon regatta at sunset: silk envelopes, wicker, burners. Floaty; a spark rides hot air.
 *   railway     a night express, and the festival at the end of its line: iron, brass, steam, fireworks. Ballistic.
 */

/* ------------------------------------------------------------------ the spark */

/**
 * Spark, the hero: a candle's flame that slips off its wick while the cat sleeps. The ball is its bright heart; the
 * flame over it is drawn for every part by `fx.ts` and grows with the music. Nothing else round and this colour is
 * ever near it.
 */
export const SPARK = '#F2A33A'
/** Its flame: the pale gold core and the orange rim. */
export const FLAME_CORE = '#FFE2A0'
export const FLAME_RIM = '#E8672B'
/** The spark nearly out, in the silence: an ember gone to ash. */
export const ASH = '#6B5E55'

/* ------------------------------------------------------------------ the loft */

export const LOFT_THEME: Theme = {
  name: 'loft',
  label: 'Chandlery',
  bg: '#15131A',
  ink: '#2A1F18',
  colors: ['#E8B24A', '#F0E2C0', '#7A5234', '#8F959B', '#9FB3D9', '#6F7483'],
  weight: 0.85,
  note: "A candle-maker's loft at night: beeswax, pewter and oak by one candle and the moon.",
}

/** The loft's materials. The room is dark: a thing is its `…Lit` colour in the spark's light, and near `night` out of it. */
export const LOFT = {
  night: '#15131A',
  /** Plaster and the roof's boards, in the dark and lit. */
  wall: '#2E2630',
  wallLit: '#8C6B52',
  beam: '#3A2A20',
  beamLit: '#7A5234',
  /** Oak: the bench, the shelves, the rack. */
  wood: '#5C3E28',
  woodLit: '#B07A48',
  /** Beeswax (gold) and tallow (ivory): candles, blocks, the vat. */
  beeswax: '#E8B24A',
  tallow: '#F0E2C0',
  /** Wick: cotton string. */
  wick: '#D8CDB4',
  /** Pewter and brass: the chamberstick, the molds, the snuffer. */
  pewter: '#8F959B',
  brass: '#C9973E',
  /** Cast iron: the stove. */
  iron: '#2C2829',
  ironLit: '#5A5250',
  /** The stove's banked fire, and its hot heart. */
  ember: '#D9542A',
  emberHot: '#FFB347',
  /** Moonlight through the window, and its shadow side. */
  moon: '#9FB3D9',
  moonDeep: '#3E4A6E',
  /** The warm light a flame throws. */
  glow: '#FFD9A0',
  soot: '#100E13',
  /** The cat: a grey tabby, its stripes, the light on its fur, and its eye (amber, a slit). */
  cat: '#6F7483',
  catDeep: '#4C5160',
  catLit: '#A6ABB8',
  catEye: '#E3B447',
}

/* ------------------------------------------------------------------ the glassworks */

export const GLASS_THEME: Theme = {
  name: 'glassworks',
  label: 'Glassworks',
  bg: '#D9E4E1',
  ink: '#1E292B',
  colors: ['#7CC2B8', '#2F8078', '#2D5BA6', '#D8912E', '#A9573C', '#8C979C'],
  weight: 0.85,
  note: 'A glasshouse by day: sea-glass, brick and iron, and glass as hot as the sun on the end of a pipe.',
}

export const GLASS = {
  /** The shop: whitewashed walls, and daylight from the roof. */
  wall: '#C9D6D2',
  wallShade: '#AFC1BC',
  light: '#F6FAF6',
  /** The furnace: fire brick and its shade, iron bands. */
  brick: '#A9573C',
  brickDeep: '#7A3C29',
  iron: '#3B4245',
  steel: '#8C979C',
  /** The bench and the floor boards. */
  wood: '#A57C57',
  woodDeep: '#7A5A3E',
  /** Glass, cold: sea-glass, bottle green, cobalt, amber. */
  glass: '#7CC2B8',
  glassDeep: '#2F8078',
  cobalt: '#2D5BA6',
  amber: '#D8912E',
  /** Glass, hot: the gather, and the furnace's white heart. */
  molten: '#FF8C2E',
  moltenHot: '#FFD57A',
  furnace: '#FFB04A',
  /** The sand the crack-offs fall into, and the water of the quench. */
  sand: '#E2CFA6',
  water: '#9CCFD0',
}

/* ------------------------------------------------------------------ the regatta */

export const REGATTA_THEME: Theme = {
  name: 'regatta',
  label: 'Balloon Regatta',
  bg: '#F3C9A6',
  ink: '#3A2430',
  colors: ['#E4655A', '#F2B43E', '#3F9C96', '#F8EEDC', '#3E4C8C', '#B38652'],
  weight: 0.85,
  note: 'A balloon regatta at sunset: silk envelopes, wicker and roaring burners over a patchwork of fields.',
}

export const REGATTA = {
  /** The sky, top to horizon, and the low sun. */
  skyTop: '#9C7BB8',
  skyMid: '#F08E7A',
  skyLow: '#FFD39A',
  sun: '#FFE3A8',
  cloud: '#FBE3D2',
  cloudShade: '#D9A7A8',
  haze: '#F7DCC4',
  /** Envelope silk. */
  coral: '#E4655A',
  saffron: '#F2B43E',
  teal: '#3F9C96',
  ivory: '#F8EEDC',
  indigo: '#3E4C8C',
  /** Baskets, ropes, ballast. */
  wicker: '#B38652',
  wickerDeep: '#7E5A34',
  rope: '#8C6A48',
  sandbag: '#CDB48A',
  /** The burner: its steel, its blue jet and the jet's gold tip. */
  steel: '#7F868C',
  propane: '#5FA9EE',
  propaneTip: '#FFE38A',
  /** The land far below. */
  fieldA: '#A7B06C',
  fieldB: '#CDBB72',
  fieldC: '#8E9E62',
  river: '#9CC3CF',
}

/* ------------------------------------------------------------------ the railway */

export const RAILWAY_THEME: Theme = {
  name: 'railway',
  label: 'Night Express',
  bg: '#121829',
  ink: '#E4DAC6',
  colors: ['#17181E', '#D5A64C', '#A83A2F', '#E9ECF1', '#8A5A36', '#58D18F'],
  weight: 0.85,
  note: 'A night express loaded with fireworks, the moon over the plain, and the festival at the end of the line.',
}

export const RAILWAY = {
  /** The night: the sky, its low band, the moon. */
  sky: '#1A2240',
  skyLow: '#2B3358',
  moon: '#E6ECF6',
  moonHalo: '#8D9CC6',
  /** The plain and the river under the moon. */
  plain: '#1C2236',
  river: '#27325A',
  /** The engine: iron, its lit edge, brass, and its red wheels. */
  iron: '#17181E',
  ironLit: '#3B3F4C',
  brass: '#D5A64C',
  wheel: '#A83A2F',
  /** Steam, smoke, the firebox's coal and its white-hot heart. */
  steam: '#E9ECF1',
  smoke: '#5E6272',
  coal: '#FF6B2C',
  coalHot: '#FFC24C',
  /** The line: rails, sleepers, signals, lamps. */
  rail: '#8A90A0',
  sleeper: '#3A2E28',
  signalRed: '#E5463B',
  signalGreen: '#58D18F',
  lamp: '#F6C96E',
  /** The festival's cargo: crates, quick-match fuse, mortar tubes. */
  crate: '#8A5A36',
  crateLit: '#B77E4E',
  fuse: '#C9B48A',
  tube: '#5B4636',
  /** The fireworks. Never a round ball-sized blob: bursts are streaks and falling trails. */
  fwGold: '#FFD36B',
  fwRed: '#FF5566',
  fwGreen: '#4FE3A6',
  fwViolet: '#B98CFF',
  fwBlue: '#6CC0FF',
  fwWhite: '#FFF6E0',
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
  loft: world('loft', 'Chandlery', "The candle-maker's loft, where the spark lives on its wick and the cat sleeps by the stove.", LOFT_THEME),
  glassworks: world('glassworks', 'Glassworks', 'A glasshouse by day.', GLASS_THEME),
  regatta: world('regatta', 'Balloon Regatta', 'A balloon regatta at sunset.', REGATTA_THEME),
  railway: world('railway', 'Night Express', 'A night express, and the festival at the end of its line.', RAILWAY_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

/** What every world's fire-door looks like from inside: its flame, rim to heart. The veil at a door crossfades two. */
export const FIRES: Record<WorldKey, { rim: string; body: string; heart: string }> = {
  loft: { rim: '#7A2A18', body: LOFT.ember, heart: LOFT.emberHot },
  glassworks: { rim: '#B0441E', body: GLASS.furnace, heart: '#FFF1C8' },
  regatta: { rim: '#2F5FA8', body: REGATTA.propane, heart: REGATTA.propaneTip },
  railway: { rim: '#8E2A18', body: RAILWAY.coal, heart: RAILWAY.coalHot },
}

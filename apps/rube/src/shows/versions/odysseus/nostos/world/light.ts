import { M } from '../music'
import type { SkyKey } from './sky'

/**
 * The light over the voyage, the base plan (scenes lay their own keys over it inside their windows). The film's palette
 * is "beige and green, with an occasional pop of blue or dull red", "burnt, bleached vistas of sand, scrub and sea",
 * and a sea kept off its postcard blue: so the sea here is slate and green-grey for most of the way, turquoise only at
 * Ogygia, and gold only in the west at the end.
 */

type Sea = Pick<SkyKey, 'far' | 'near' | 'body' | 'deep' | 'lit' | 'edge'>

const SEA_DUSK: Sea = { far: '#9C9384', near: '#4F5A58', body: '#334140', deep: '#0F1716', lit: '#E2C9A2', edge: '#1D2626' }
const SEA_NIGHT: Sea = { far: '#2F3946', near: '#1A2430', body: '#141E28', deep: '#05080C', lit: '#73839A', edge: '#0A1016' }
const SEA_FIRE: Sea = { far: '#4A3A34', near: '#1F2226', body: '#161C22', deep: '#05080B', lit: '#C08A5A', edge: '#0B0F13' }
const SEA_GREY: Sea = { far: '#9AA39E', near: '#4A5856', body: '#33413F', deep: '#0E1615', lit: '#C9D0C7', edge: '#1B2423' }
const SEA_FOG: Sea = { far: '#AEB3AD', near: '#5D6865', body: '#3B4846', deep: '#111918', lit: '#D3D6CE', edge: '#222B2A' }
const SEA_DEAD: Sea = { far: '#6E6A62', near: '#2E302E', body: '#232726', deep: '#08090A', lit: '#A69C88', edge: '#121414' }
const SEA_NOON: Sea = { far: '#B7C3BE', near: '#5F7774', body: '#3E5654', deep: '#10201F', lit: '#F1EEDF', edge: '#223231' }
const SEA_GOLD: Sea = { far: '#C9B07E', near: '#5E6153', body: '#3B4339', deep: '#101511', lit: '#F0DCA8', edge: '#1F241E' }
const SEA_STORM: Sea = { far: '#3B4446', near: '#1E2729', body: '#172022', deep: '#040607', lit: '#7E898A', edge: '#0B1011' }
const SEA_TURQ: Sea = { far: '#9FD3CC', near: '#3E9C99', body: '#2A7E84', deep: '#0B2A35', lit: '#E8F4EC', edge: '#185A60' }
const SEA_DAWN: Sea = { far: '#B9AE9C', near: '#4B5A5E', body: '#30404A', deep: '#0C1419', lit: '#EAD3AE', edge: '#1A262C' }
const SEA_EVE: Sea = { far: '#7E6E6A', near: '#2B3440', body: '#1E2833', deep: '#06090D', lit: '#C48F6E', edge: '#0E141B' }
const SEA_WEST: Sea = { far: '#E2B67A', near: '#5A5A55', body: '#363C3C', deep: '#0C1012', lit: '#F6D9A0', edge: '#1C2122' }

const key = (t: number, top: string, low: string, cloud: string, cover: number, sea: Sea, disc?: SkyKey['disc']): SkyKey => ({ t, top, low, cloud, cover, disc, ...sea })

export const BASE_SKY: SkyKey[] = [
  // Troy's beach in the last of the day: the horse hauled up out of the surf.
  key(0, '#5C6670', '#D8B285', '#B79C82', 0.35, SEA_DUSK, { x: 0.82, y: 0.6, r: 0.045, color: '#F1DDB4', a: 1 }),
  key(30, '#3A4250', '#9C7C68', '#6F6670', 0.3, SEA_DUSK, { x: 0.86, y: 0.72, r: 0.045, color: '#E7B88A', a: 0.6 }),
  // Ithaca that night.
  key(M.second, '#0E1420', '#27303F', '#38425A', 0.25, SEA_NIGHT, { x: 0.76, y: 0.18, r: 0.026, color: '#E6E1D2', a: 1 }),
  key(M.answer - 1, '#0E1420', '#27303F', '#38425A', 0.25, SEA_NIGHT, { x: 0.74, y: 0.17, r: 0.026, color: '#E6E1D2', a: 1 }),
  // Troy burning.
  key(M.answer, '#120E10', '#3B2A24', '#2B2224', 0.3, SEA_FIRE),
  key(126, '#1A1618', '#5A3A2C', '#3A2C2A', 0.3, SEA_FIRE),
  // Away at first light.
  key(140, '#6B7680', '#D6C6AA', '#A39E95', 0.35, SEA_DAWN, { x: 0.15, y: 0.62, r: 0.04, color: '#F3E2BE', a: 0.8 }),
  // The Cyclops' island under grey cloud.
  key(152, '#7A8584', '#C7C5B4', '#8E9590', 0.7, SEA_GREY),
  key(M.pulse - 2, '#5E6868', '#9EA19A', '#6D7472', 0.8, SEA_GREY),
  // Fog at Telepylus.
  key(M.pulse + 3, '#8E9592', '#B7B9B1', '#9EA39F', 0.2, SEA_FOG),
  key(M.tutti - 3, '#7D8582', '#A5A8A0', '#8A8F8B', 0.3, SEA_FOG),
  // The dead's shore: a low sun in haze that never sets.
  key(M.tutti + 2, '#383C41', '#8A8376', '#4C4D4E', 0.25, SEA_DEAD, { x: 0.5, y: 0.7, r: 0.035, color: '#D8D0BD', a: 0.55 }),
  key(249, '#3E4247', '#958C7D', '#55565A', 0.25, SEA_DEAD, { x: 0.52, y: 0.69, r: 0.035, color: '#D8D0BD', a: 0.55 }),
  // White noon at the Sirens' rocks.
  key(254, '#A8B7BB', '#ECE5D4', '#E6E2D6', 0.15, SEA_NOON, { x: 0.62, y: 0.1, r: 0.03, color: '#FBF5E4', a: 1 }),
  key(276, '#AFB5AA', '#EAD9B2', '#E2D8C2', 0.15, SEA_NOON, { x: 0.68, y: 0.12, r: 0.03, color: '#FBF1D6', a: 1 }),
  // Apollo's island, gold; then the storm.
  key(281, '#B39A6C', '#E9D3A0', '#D6BE8E', 0.2, SEA_GOLD, { x: 0.7, y: 0.14, r: 0.034, color: '#FFF0C8', a: 1 }),
  key(292, '#6E6A5E', '#A99E84', '#5C5B55', 0.6, SEA_STORM),
  key(300, '#1E2224', '#3C4245', '#2B3032', 0.95, SEA_STORM),
  key(M.lowGone, '#2C3336', '#545C5D', '#3C4446', 0.8, SEA_STORM),
  key(349, '#8A9596', '#C9CCC2', '#A6ABA6', 0.4, SEA_GREY),
  // Ogygia: white light, turquoise water.
  key(M.hush + 2, '#9FC7CE', '#F1EEE4', '#F3F1EA', 0.15, SEA_TURQ, { x: 0.7, y: 0.12, r: 0.03, color: '#FFFBEF', a: 1 }),
  key(M.return - 3, '#9FC7CE', '#F1EEE4', '#F3F1EA', 0.15, SEA_TURQ, { x: 0.7, y: 0.12, r: 0.03, color: '#FFFBEF', a: 1 }),
  // The raft, given to the storm.
  key(M.return + 2, '#2A3236', '#4F585A', '#384043', 0.9, SEA_STORM),
  key(412, '#4C5860', '#A0998A', '#6A7272', 0.6, SEA_DAWN),
  // Ithaca at dawn.
  key(420, '#7A8A98', '#E8C9A0', '#C9B39A', 0.3, SEA_DAWN, { x: 0.2, y: 0.66, r: 0.04, color: '#F6E2BC', a: 1 }),
  // The hall at evening; the bow at night.
  key(M.quiet + 6, '#2A3142', '#A86E58', '#5A4A4C', 0.3, SEA_EVE, { x: 0.86, y: 0.74, r: 0.04, color: '#E9A27A', a: 0.7 }),
  key(M.last - 2, '#151A24', '#40323A', '#2E2A34', 0.25, SEA_NIGHT),
  // The west: the sun going down ahead of them.
  key(M.fade, '#3E4A63', '#EDB574', '#C9946E', 0.25, SEA_WEST, { x: 0.74, y: 0.66, r: 0.055, color: '#F7DCA6', a: 1 }),
  key(549, '#2E3650', '#D9925E', '#A87458', 0.25, SEA_WEST, { x: 0.74, y: 0.72, r: 0.055, color: '#F2C48E', a: 1 }),
]

import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'
import { STORE_THEME } from './store/theme'
import { LONDON_THEME } from './london/theme'
import { HOTEL_THEME } from './hotel/theme'
import { ALLEY_THEME } from './alley/theme'
import { JERSEY_THEME } from './jersey/theme'
import { TOKYO_THEME } from './tokyo/theme'
import { HOSPITAL_THEME } from './hospital/theme'

/**
 * The places of Rally and the people in them. None of these worlds is in Machine's loop or registered anywhere: they
 * exist for this show. A world is a palette and a name for the panel; the pieces are laid by the score, so `pieces`
 * stays empty. Each place's theme lives in its own folder (`<place>/theme.ts`), owned by whoever builds it.
 */

/* ------------------------------------------------------------------ the people */

/**
 * Marty Mauser: the thread, the one ball through every machine, and a table-tennis ball: the orange of the ball he
 * means to put his name on. Nothing else in the show is that orange but his son.
 */
export const MARTY = '#F26A1B'

/** Rachel Mizler: a deep teal, the colour of her coat. In the shoe store, in the night in New Jersey, and in the ward. */
export const RACHEL = '#2E9C95'
export const RACHEL_ID = 91

/** Their son: Marty's own orange, and half his size. Only in the nursery, behind the glass. */
export const BABY = MARTY
export const BABY_ID = 92
export const BABY_SCALE = 0.55

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
  store: world('store', 'The Shoe Store', "Uncle Murray's shoe store on the Lower East Side, 1952: walls of boxes to the ceiling, the stockroom, and the safe in the back office.", STORE_THEME),
  london: world('london', 'London', 'The British Open, London: green tables under hanging lamps in a cold hall, the gallery, the players in white.', LONDON_THEME),
  hotel: world('hotel', 'The Hotel', 'A run-down hotel on the Upper West Side at night: a room with a clawfoot tub, the room under it, and the fire escape.', HOTEL_THEME),
  alley: world('alley', 'The Bowling Alley', 'A bowling alley in Queens after midnight: the lanes, the pins, and a table-tennis table in the back for the hustle.', ALLEY_THEME),
  jersey: world('jersey', 'New Jersey', "The dark past the city: Wally's cab on a country road, a farmhouse, a barn on fire, and the airfield.", JERSEY_THEME),
  tokyo: world('tokyo', 'Tokyo', 'The exhibition in Tokyo: one table under the lights, the crowd, the American soldiers in the stands.', TOKYO_THEME),
  hospital: world('hospital', 'The Ward', 'A maternity ward in New York at dawn: the bed by the window, the corridor, and the nursery behind its glass.', HOSPITAL_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

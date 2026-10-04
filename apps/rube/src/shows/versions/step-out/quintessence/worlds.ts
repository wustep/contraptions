import type { Theme } from '../../../../../../../src/core/themes'
import type { World } from '../../../../worlds'
import { NEGATIVES_THEME } from './negatives/theme'
import { DREAM_THEME } from './dream/theme'
import { NUUK_THEME } from './nuuk/theme'
import { SKY_THEME } from './sky/theme'
import { SEA_THEME } from './sea/theme'
import { ICELAND_THEME } from './iceland/theme'
import { HOME_THEME } from './home/theme'
import { HIMALAYA_THEME } from './himalaya/theme'
import { PRESS_THEME } from './press/theme'
import { STREET_THEME } from './street/theme'

/**
 * The places of Quintessence and the people in them. None of these worlds is in Machine's loop or registered anywhere:
 * they exist for this show. A world is a palette and a name for the panel; the pieces are laid by the score, so
 * `pieces` stays empty. Each place's theme lives in its own folder (`<place>/theme.ts`), owned by whoever builds it.
 */

/* ------------------------------------------------------------------ the people */

/**
 * Walter Mitty: the thread, the one ball through every machine. He starts slate (`WALTER`), the grey-blue of the
 * basement and the office, the colour of a man who daydreams; at the hinge in Nuuk, when he runs out after the Cheryl
 * he has imagined and gets on the helicopter for real, he warms over two seconds to Life's red (`WALTER_WARM`), and
 * stays it. Nothing else in the show is that red but the Life logo's box, which is the point.
 */
export const WALTER = '#7D8FA3'
export const WALTER_WARM = '#D23A2E'
/** The red of the Life logo's box, the same as Walter's: drawn only where the magazine is. */
export const LIFE_RED = WALTER_WARM

/** Cheryl Melhoff: marigold. In the office, in his daydreams, on the little stage at Nuuk, and on the street at the end. */
export const CHERYL = '#E8B04A'
export const CHERYL_ID = 91

/** Sean O'Connell: weathered khaki, the colour of a field jacket. Only in the mountains, and still. */
export const SEAN = '#9C8F6A'
export const SEAN_ID = 92

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
  negatives: world('negatives', 'The Negatives', 'The negative assets room under the Life building: a dark basement, the one light the light table under the film.', NEGATIVES_THEME),
  dream: world('dream', 'The Daydream', 'A daydream: the grey drained out and the colour turned up past true, a night street and a building on fire.', DREAM_THEME),
  nuuk: world('nuuk', 'Nuuk', 'A bar on the harbour at Nuuk, Greenland: dark wood, a small stage, a window on the grey water.', NUUK_THEME),
  sky: world('sky', 'Over the Sea', 'Greenland from the air: an overcast sky, the grey-green sea, ice, and the fishing boat far below.', SKY_THEME),
  sea: world('sea', 'The Sea', 'Under the North Atlantic: cold, dark, and the light from the surface above.', SEA_THEME),
  iceland: world('iceland', 'Iceland', 'East Iceland: moss on black rock, a road down to a fjord, a pale sky, and the volcano.', ICELAND_THEME),
  home: world('home', 'Home', 'His mother\'s new apartment at evening: a lamp, boxes not yet opened, and her piano.', HOME_THEME),
  himalaya: world('himalaya', 'The Himalayas', 'The mountains of Afghanistan at eighteen thousand feet: snow, rock and a great deal of sky.', HIMALAYA_THEME),
  press: world('press', 'Life', 'The Life building: the conference table, and below it the presses running the last issue.', PRESS_THEME),
  street: world('street', 'The Street', 'A New York street in the morning: a newsstand, and the last issue of Life on it.', STREET_THEME),
} as const

export type WorldKey = keyof typeof WORLDS

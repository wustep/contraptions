import type { Scene } from '../scene'
import { END, WINDOWS } from '../voyage'

/** Placeholder: home, the hall, the bow, the west. */
export const home: Scene = {
  key: 'home',
  from: WINDOWS.home[0],
  to: END,
  shots: [],
}

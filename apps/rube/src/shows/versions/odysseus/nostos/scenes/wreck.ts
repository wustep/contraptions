import type { Scene } from '../scene'
import { WINDOWS } from '../voyage'

/** Placeholder: the ship sails on. */
export const wreck: Scene = {
  key: 'wreck',
  from: WINDOWS.wreck[0],
  to: WINDOWS.wreck[1],
  shots: [],
}

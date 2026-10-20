import type { Scene } from '../scene'
import { WINDOWS } from '../voyage'

/** Placeholder: the ship sails on. */
export const sirens: Scene = {
  key: 'sirens',
  from: WINDOWS.sirens[0],
  to: WINDOWS.sirens[1],
  shots: [],
}

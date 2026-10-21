import { OPENING, WINDOWS } from '../plan'
import type { Scene } from '../scene'
import { stub } from './stub'

export const arrival: Scene = {
  ...stub('arrival', WINDOWS.arrival[0], WINDOWS.arrival[1], '#C9955C', [20, 0]),
  scope: [[OPENING.from, 1], [OPENING.to, 0]],
}

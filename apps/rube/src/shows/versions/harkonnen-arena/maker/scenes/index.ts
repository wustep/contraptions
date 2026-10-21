import type { Scene } from '../scene'
import { arena } from './arena'
import { charge } from './charge'
import { desert } from './desert'
import { ride } from './ride'

/**
 * The scenes, in order, end to end (`timeline.ts`): the deep desert and the harvester; the thumper, the first ride and
 * the eclipse; Giedi Prime's arena; the charge out of the storm and the evening after it.
 */
export const SCENES: Scene[] = [desert, ride, arena, charge]

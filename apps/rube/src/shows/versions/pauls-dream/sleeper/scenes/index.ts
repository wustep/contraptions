import type { Scene } from '../scene'
import { arrival } from './arrival'
import { attack } from './attack'
import { caladan } from './caladan'
import { erg } from './erg'
import { fremen } from './fremen'
import { storm } from './storm'

/** The scenes in order. Each owns its window (`plan.ts`). */
export const SCENES: Scene[] = [caladan, arrival, erg, attack, storm, fremen]

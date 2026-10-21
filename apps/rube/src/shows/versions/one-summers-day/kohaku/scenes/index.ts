import type { Scene } from '../scene'
import { M } from '../music'
import { SEA_Y, SWAMP } from '../geo'
import { way } from './way'
import { bathhouse } from './bathhouse'
import { stub } from './stub'
import { name } from './name'
import { home } from './home'
import { dragonScene } from './dragon'

/** Every scene, in the order the film meets them. */
export const SCENES: Scene[] = [
  way,
  bathhouse,
  dragonScene,
  stub('train', M.high, M.summit, [SWAMP.x0, SEA_Y - 0.3]),
  name,
  home,
]

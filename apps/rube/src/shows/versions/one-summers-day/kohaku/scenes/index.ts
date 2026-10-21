import type { Scene } from '../scene'
import { M } from '../music'
import { BATH, SEA_Y, SWAMP } from '../geo'
import { way } from './way'
import { bathhouse } from './bathhouse'
import { stub } from './stub'
import { name } from './name'
import { home } from './home'

/** Every scene, in the order the film meets them. */
export const SCENES: Scene[] = [
  way,
  bathhouse,
  stub('dragon', M.breath, M.high, [BATH.balcony.x0 + 1, BATH.balcony.y]),
  stub('train', M.high, M.summit, [SWAMP.x0, SEA_Y - 0.3]),
  name,
  home,
]

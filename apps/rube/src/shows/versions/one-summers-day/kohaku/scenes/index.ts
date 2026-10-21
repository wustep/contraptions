import type { Scene } from '../scene'
import { M } from '../music'
import { END } from '../credits'
import { BATH, SEA_Y, SWAMP } from '../geo'
import { way } from './way'
import { bathhouse } from './bathhouse'
import { stub } from './stub'

/** Every scene, in the order the film meets them. */
export const SCENES: Scene[] = [
  way,
  bathhouse,
  stub('dragon', M.breath, M.high, [BATH.balcony.x0 + 1, BATH.balcony.y]),
  stub('train', M.high, M.summit, [SWAMP.x0, SEA_Y - 0.3]),
  stub('name', M.summit, M.home, [30, -20]),
  stub('home', M.home, END, [-1.5, 0]),
]

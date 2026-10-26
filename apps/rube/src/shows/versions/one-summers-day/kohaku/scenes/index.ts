import type { Scene } from '../scene'
import { way } from './way'
import { bathhouse } from './bathhouse'
import { name } from './name'
import { home } from './home'
import { dragonScene } from './dragon'
import { train } from './train'

/** Every scene, in the order the film meets them. */
export const SCENES: Scene[] = [
  way,
  bathhouse,
  dragonScene,
  train,
  name,
  home,
]

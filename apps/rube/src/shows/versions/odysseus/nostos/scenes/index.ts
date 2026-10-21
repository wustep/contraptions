import type { Scene } from '../scene'
import { horse } from './horse'
import { ithaca } from './ithaca'
import { troy } from './troy'
import { cyclops } from './cyclops'
import { giants } from './giants'
import { hades } from './hades'
import { sirens } from './sirens'
import { storm } from './storm'
import { wreck } from './wreck'
import { ogygia } from './ogygia'
import { raft } from './raft'
import { home } from './home'

/** Every scene, in the order the voyage meets them (`voyage.ts`, WINDOWS). */
export const SCENES: Scene[] = [horse, ithaca, troy, cyclops, giants, hades, sirens, storm, wreck, ogygia, raft, home]

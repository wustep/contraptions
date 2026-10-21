import { WINDOWS } from '../plan'
import type { Scene } from '../scene'
import { stub } from './stub'

export const attack: Scene = stub('attack', WINDOWS.attack[0], WINDOWS.attack[1], '#1A2233', [40, 0])

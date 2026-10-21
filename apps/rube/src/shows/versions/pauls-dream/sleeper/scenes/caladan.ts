import { WINDOWS } from '../plan'
import type { Scene } from '../scene'
import { stub } from './stub'

export const caladan: Scene = { ...stub('caladan', WINDOWS.caladan[0], WINDOWS.caladan[1], '#3F4D47', [-560, 0]), scope: [[0, 1]] }

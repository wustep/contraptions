import type { Performance } from '../../../registry'
import { creditsAt } from './credits'
import { DURATION, MUSIC_END } from './motion'
import { BurdenShow, cameraAt, overviewAt } from './show'

export const performance: Performance = {
  show: new BurdenShow(),
  duration: DURATION,
  camera: cameraAt,
  overview: overviewAt,
  cuts: () => false,
  titles: creditsAt,
  tall: 0.65,
  soundtrack: {
    credit: 'Howard Shore · The Bridge of Khazad Dum · The Fellowship of the Ring (2001) · demo, YouTube only',
    href: 'https://www.youtube.com/watch?v=vbKy6FuACKg',
    youtube: [{ id: 'vbKy6FuACKg', until: MUSIC_END }],
  },
}

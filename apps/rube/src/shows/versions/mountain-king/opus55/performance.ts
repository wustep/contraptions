import recording from '../../../../../../../docs/promo/mountain-king-musopen.mp3'
import type { Performance } from '../../../registry'
import { DURATION, build } from './arrangement'

const show = build()

export const performance: Performance = {
  show,
  duration: DURATION,
  camera: (t) => show.cameraAt(t),
  soundtrack: {
    src: recording,
    offset: 0,
    credit: 'Edvard Grieg · In the Hall of the Mountain King · Musopen Symphony Orchestra · public domain',
    href: 'https://commons.wikimedia.org/wiki/File:Grieg_-_Peer_Gynt_Suite_No._1,_Op._46_-_IV._In_the_Hall_of_the_Mountain_King_(Musopen_Symphony).flac',
  },
}

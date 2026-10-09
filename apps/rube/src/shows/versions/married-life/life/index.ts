import type { Performance } from '../../../registry'
import { creditsAt } from './credits'
import { zoomDropAt } from './house/alone'
import { hospitalZoomDrop } from './clinic/hospital'
import { fixupZoomDrop } from './house/fixup'
import { DURATION } from './music'
import { compose } from './score'

const { show, camera } = compose()

export { show }

export const performance: Performance = {
  show,
  duration: DURATION,
  // Under Zoom: lower while he pushes the cart, higher through her touch at her bedside, lower through the credits.
  camera: (t) => {
    const f = camera(t)
    const drop = zoomDropAt(t) + hospitalZoomDrop(t) + fixupZoomDrop(t)
    return drop ? { ...f, zoomDrop: drop } : f
  },
  // No portal anywhere: every change of place is a match cut on Carl.
  cuts: () => false,
  // Every set stands on a floor or the ground, with sky, a roof or the storey above over it and only earth under it:
  // on a phone held upright most of the extra picture goes above the frame, not a slab of ground below it.
  tall: 0.85,
  // The end credits' words, which the page sets over the house.
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'Michael Giacchino · Married Life · Up (2009)',
    href: 'https://www.youtube.com/watch?v=2rn-vMbFglI',
    // The label's upload the file was fetched from, whole: the same clock, sample for sample.
    youtube: [{ id: '2rn-vMbFglI' }],
  },
}

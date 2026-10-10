import type { Framing, Performance } from '../../../registry'
import { creditsAt } from './credits'
import { zoomDropAt, zoomFullAt } from './house/alone'
import { hospitalZoomDrop } from './clinic/hospital'
import { fixupZoomDrop } from './house/fixup'
import { setbacksZoomFull } from './inside/jar'
import { DURATION } from './music'
import { compose } from './score'
import { zoomHold } from './zoom'

const { show, camera } = compose()

export { show }

/** The parts' own holds under Zoom. */
function held(t: number): Framing {
  const f = camera(t)
  const drop = zoomDropAt(t) + hospitalZoomDrop(t) + fixupZoomDrop(t)
  const full = Math.min(zoomFullAt(t), setbacksZoomFull(t))
  return drop || full < 1 ? { ...f, ...(drop ? { zoomDrop: drop } : {}), ...(full < 1 ? { zoomFull: full } : {}) } : f
}
function framed(t: number): Framing {
  const f = held(t)
  const z = zoomHold(show, held, t)
  if (!z.drop && !z.slide) return f
  return { ...f, zoomDrop: (f.zoomDrop ?? 0) + z.drop, zoomSlide: z.slide }
}

export const performance: Performance = {
  show,
  duration: DURATION,
  // Under Zoom: the parts' own holds (lower while he pushes the cart, higher through her touch at her bedside, lower
  // through the credits; out to the show's own frame for the tyre, the jar's taking and the lamp he climbs to), and Zoom's own (`zoom.ts`), which keeps the two of them off the Zoom frame's edges.
  camera: framed,
  // No portal anywhere: every change of place is a match cut on Carl.
  cuts: () => false,
  // Overview frames the place in play: the house's world holds the street and the doll's house far apart, the clinic's
  // the office and the ward, and the whole of either is mostly the empty ground between them.
  overview: (t) => show.place(t),
  // Every set stands on a floor or the ground, with sky, a roof or the storey above over it and only earth under it:
  // on a phone held upright most of the extra picture goes above the frame, not a slab of ground below it.
  tall: 0.85,
  // The end credits' words, which the page sets over the house.
  titles: creditsAt,
  soundtrack: {
    offset: 0,
    credit: 'Michael Giacchino · Married Life · Up (2009)',
    href: 'https://www.youtube.com/watch?v=2rn-vMbFglI',
    // The label's upload, whole: the recording the onsets were measured on, the same clock sample for sample.
    youtube: [{ id: '2rn-vMbFglI' }],
  },
}

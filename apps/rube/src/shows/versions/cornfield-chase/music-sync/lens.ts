import { DROP, ORGAN, beatAt } from './music'
import { smooth } from './screen'

/**
 * The camera's own moves over the stock follow, shared by the camera and the scenery so the land moves with it.
 *
 * - **The opening.** The show opens on the sky, the corn's tassels along the foot of the frame, and tilts down into
 *   the field as the piano's first notes come in: the land and the machine come up together, as one picture.
 * - **The piano.** A push-in so slow it is felt rather than seen, from 8.6 cells to 7.9 over the half-minute.
 * - **The organ.** A deliberate push on its entry, to 6.6 over two seconds and a half, as the crows go up.
 * - **The drop.** Under the night's iris the frame is the gather's; it opens and pushes in to the chase's 4.8 on the
 *   drop itself.
 * - **The full organ.** On beat 132 the house lights come up and the camera draws back over two bars to 6.2, so the
 *   climax shows more of the fair at once, the midway lit behind it, than any frame before it.
 */

/** How far the camera looks up from the machine, in frame heights: the land comes up from under the frame. */
const RISE = 0.55
export const tiltAt = (t: number): number => RISE * (1 - smooth(t, 0.3, 4.6))

/** The full organ, beat 132. */
export const FULL = beatAt(132)

/** The frame's height in cells at show time `t`, up to the photograph's (which the take then frames on its own). */
export function lensAt(t: number): number {
  if (t < ORGAN) return 8.6 - 0.7 * smooth(t, 5, ORGAN)
  // The night's iris shuts at 40.4 s and opens at 41.5 s; the push to the chase starts as it opens and lands on the drop.
  if (t < 41.52) return 7.9 - 1.3 * smooth(t, ORGAN, ORGAN + 2.6)
  if (t < FULL) return 6.6 - 1.8 * smooth(t, 41.52, DROP + 0.05)
  // And back again to the photograph's 7.5 as the booth comes up, before the take eases onto it.
  return 4.8 + 1.4 * smooth(t, FULL, FULL + 8 * 0.625) + 1.3 * smooth(t, 116.2, 117.8)
}

/** How much of Zoom's closeness the frame takes: none while the camera is tilted up, all of it once it is down. */
export const zoomAt = (t: number): number => (1 - tiltAt(t) / RISE) ** 2

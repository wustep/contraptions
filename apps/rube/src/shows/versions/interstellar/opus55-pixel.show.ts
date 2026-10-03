import { defineShow } from '../../registry'

/**
 * Voyage in pixels: the Voyage take's machine, camera, cuts, credits and soundtrack, every frame painted as it is and
 * then brought down to a coarse grid, a short palette of its own colours and an ordered dither (`pixel/look.ts`).
 */
export default defineShow({
  title: 'Voyage',
  label: 'Pixel',
  about: "Hans Zimmer's Cornfield Chase, then No Time for Caution, from Interstellar, as one Rube Goldberg machine that leaves the farm for space, in pixels.",
  still: 240.4,
  async load() { return (await import('./pixel')).performance },
})

import { defineShow } from '../../registry'

/**
 * Voyage as a pixel game: the Voyage take's machine, camera, cuts, credits and soundtrack, under its own pixel skies,
 * every frame read back as a coarse grid of hard blocks in a game palette with outlines (`pixel/`, `PIXEL.md`).
 */
export default defineShow({
  title: 'Voyage',
  label: 'Pixel',
  about: "Hans Zimmer's Cornfield Chase, then No Time for Caution, from Interstellar, as one Rube Goldberg machine that leaves the farm for space, in pixels.",
  still: 240.4,
  async load() { return (await import('./pixel')).performance },
})

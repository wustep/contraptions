import { defineShow } from '../../registry'

/**
 * Soft Lamp, held still: the same half hour as the first take, its camera kept on the one room from start to end, the
 * way the streams it takes after never move. It leads the work (`PREFERRED_TAKES`), so `/shows/soft-lamp/` opens it.
 * The moving take is hidden for now (`opus55.ts`), so this is the work's one take, and its label names who made it.
 */
export default defineShow({
  title: 'Soft Lamp',
  label: 'Opus 5.5',
  about: "Half an hour of Lofi Girl's lofi hip hop in one held frame: a study desk from dusk into a rainy night, a kitten, a lamp, and a small machine that keeps time with the music.",
  still: 99.9,
  async load() {
    return (await import('./lamp')).stillPerformance
  },
})

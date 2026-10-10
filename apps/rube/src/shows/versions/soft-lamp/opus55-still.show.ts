import { defineShow } from '../../registry'

/**
 * Soft Lamp, held still: the same half hour as the first take, its camera kept on the one room from start to end, the
 * way the streams it takes after never move. Its label names who made it and how it differs.
 */
export default defineShow({
  title: 'Soft Lamp',
  label: 'Opus 5.5 (Still)',
  about: "Half an hour of Lofi Girl's lofi hip hop in one held frame: a study desk from dusk into a rainy night, a kitten, a lamp, and a small machine that keeps time with the music.",
  still: 99.9,
  async load() {
    return (await import('./lamp')).stillPerformance
  },
})

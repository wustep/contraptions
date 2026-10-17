import { defineShow } from '../../registry'

/**
 * Composure: the Andante of Haydn's "Surprise" Symphony, set on a still board of pegs and a launcher at its foot that
 * fires a pellet of colour on each of the music's accents, the surprise first. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Composure',
  label: 'Opus 5.5',
  about: "Haydn's Surprise Symphony as a still board of pegs: on every accent a launcher fires a burst of colour through it, and the board settles back as if nothing had happened.",
  still: 31.2,
  async load() {
    return (await import('./pegboard')).performance
  },
})

import { defineShow } from '../../registry'

/**
 * Gymnopédie: Satie's Gymnopédie No. 1 and Gnossiennes Nos. 1 and 3, played for the show and round a small sea planet
 * once a period, as a loop with no seam. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Gymnopédie',
  label: 'Opus 5.5',
  about: "Satie's Gymnopédie No. 1 and two Gnossiennes, as a Rube Goldberg machine going round a small sea planet, forever.",
  still: 211.6,
  async load() { return (await import('./orbit')).performance },
})

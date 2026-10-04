import { defineShow } from '../../registry'

/**
 * Quintessence · after The Secret Life of Walter Mitty: José González's "Step Out" as a Rube Goldberg machine that
 * daydreams in a basement under the Life building, and then goes: Greenland, the sea, Iceland, the Himalayas, and
 * back with negative 25. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Quintessence',
  label: 'Opus 5.5',
  about: "José González's Step Out, from The Secret Life of Walter Mitty, as a Rube Goldberg machine that stops daydreaming and goes.",
  still: 113,
  async load() { return (await import('./quintessence')).performance },
})

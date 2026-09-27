import { defineShow } from '../../registry'

/**
 * Palindrome: Max Richter's "On the Nature of Daylight", the music Arrival opens and closes on, as a Rube Goldberg
 * machine that tells the whole film and ends where it began.
 */
export default defineShow({
  title: 'Palindrome',
  label: 'Opus 5.5',
  about: "Max Richter's On the Nature of Daylight, the music Arrival opens and closes on, as a Rube Goldberg machine that tells the whole film and ends where it began.",
  still: 105.5,
  async load() { return (await import('./palindrome')).performance },
})

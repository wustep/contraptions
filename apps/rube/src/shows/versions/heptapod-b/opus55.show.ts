import { defineShow } from '../../registry'

/**
 * Logogram: Jóhann Jóhannsson's "Heptapod B", from Arrival, as a Rube Goldberg machine that goes up into the shell,
 * learns the heptapods' writing, and comes back round to where it began.
 */
export default defineShow({
  title: 'Logogram',
  label: 'Opus 5.5',
  about: "Jóhann Jóhannsson's Heptapod B, from Arrival, as a Rube Goldberg machine that goes up into the shell and learns to write in circles.",
  still: 121,
  async load() { return (await import('./logogram')).performance },
})

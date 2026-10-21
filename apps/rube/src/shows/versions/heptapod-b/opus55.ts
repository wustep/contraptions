// Logogram: hidden from the picker for now (Stephen, Oct 14); Palindrome is Arrival's one take.
// The picker, Theater and the build list every `versions/<work>/<take>.show.ts`, so this file was renamed from
// `opus55.show.ts` to take it off the list; everything else in `heptapod-b/` is untouched. To bring Logogram back,
// rename it to `opus55.show.ts` and uncomment its lines in `checks/shows.ts`.
import { defineShow } from '../../registry'

/**
 * Logogram: Jóhann Jóhannsson's "Heptapod B", from Arrival, as a Rube Goldberg machine that goes up into the shell,
 * learns the heptapods' writing, and comes back round to where it began.
 */
export default defineShow({
  title: 'Logogram',
  label: 'Opus 5.5',
  about: "Jóhann Jóhannsson's Heptapod B, from Arrival, as a Rube Goldberg machine that goes up into the shell and learns to write in circles.",
  still: 16.4,
  async load() { return (await import('./logogram')).performance },
})

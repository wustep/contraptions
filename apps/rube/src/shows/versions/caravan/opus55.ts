// Caravan: hidden from the picker for now (Stephen, Oct 10).
// The picker, Theater and the build list every `versions/<work>/<take>.show.ts`, so this file was renamed from
// `opus55.show.ts` to take it off the list; everything else in `caravan/` is untouched. To bring Caravan back, rename
// it to `opus55.show.ts` and uncomment its lines in `checks/shows.ts`.
import { defineShow } from '../../registry'

export default defineShow({
  title: 'Caravan',
  label: 'Opus 5.5',
  film: 'Whiplash',
  about: "Caravan, the finale of Whiplash, as a Rube Goldberg machine: a drummer, a conductor, and a tempo that won't hold still.",
  still: 528.4,
  async load() { return (await import('./whiplash')).performance },
})

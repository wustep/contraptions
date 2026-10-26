// Cornfield Chase's Grok 4.7 take: hidden for now (Stephen, Oct 15), so the work is its Opus 5.5 take alone.
// The picker, Theater and the build list every `versions/<work>/<take>.show.ts`, so this file was renamed from
// `grok47.show.ts` to take it off the list; its code (`tech-demo.ts`) and card are untouched. To bring it back, rename
// it to `grok47.show.ts`, restore its checks in `checks/shows.ts` (commented out beside the Opus-only ones) and its
// old name in `RENAMED_TAKES` (`registry.ts`).
import { defineShow } from '../../registry'

export default defineShow({
  title: 'Cornfield Chase',
  label: 'Grok 4.7',
  film: 'Interstellar',
  about: "Hans Zimmer's Cornfield Chase, from Interstellar, with a Rube Goldberg machine on its beat.",
  still: 50.8,
  async load() { return (await import('./tech-demo')).performance },
})

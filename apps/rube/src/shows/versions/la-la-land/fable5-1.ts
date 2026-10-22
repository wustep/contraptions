// Epilogue's Fable 5.1 take: hidden for now (Stephen, Oct 15), so the work is its Opus 5.5 take alone.
// The picker, Theater and the build list every `versions/<work>/<take>.show.ts`, so this file was renamed from
// `fable5-1.show.ts` to take it off the list; its code (`epilogue/`) and card are untouched. To bring it back, rename
// it to `fable5-1.show.ts`, restore its checks in `checks/shows.ts` (commented out beside the Opus-only ones, with the
// imports they use), its old name in `RENAMED_TAKES` (`registry.ts`) and its place on the Shows page's card
// (`FOUR` in `scripts/shows/show-cards.mjs`).
import { defineShow } from '../../registry'

export default defineShow({
  title: 'Epilogue',
  label: 'Fable 5.1',
  film: 'La La Land',
  about: "Justin Hurwitz's Epilogue, from La La Land, as a Rube Goldberg machine: the club, the dream, and the club again.",
  still: 152.0,
  async load() { return (await import('./epilogue')).performance },
})

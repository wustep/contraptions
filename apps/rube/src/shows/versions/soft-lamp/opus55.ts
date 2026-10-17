// Soft Lamp's moving take: hidden for now (Stephen, Oct 15), so the work is its still take alone.
// The picker, Theater and the build list every `versions/<work>/<take>.show.ts`, so this file was renamed from
// `opus55.show.ts` to take it off the list; its code (`performance` in `lamp/index.ts`) and card are untouched, and
// `check:shows` still runs its checks on that code. To bring it back, rename it to `opus55.show.ts`, give the still
// take back its label `Opus 5.5 (Still)` (two takes of a work may not share one), restore the lines commented out
// beside the still-only ones in `checks/shows.ts` and `checks/soft-lamp.ts`, and drop the still take's run of
// `checkSoftLamp` on this take's code in `checks/shows.ts`.
import { defineShow } from '../../registry'

/**
 * Soft Lamp: half an hour of Lofi Girl's "Best of lofi hip hop 2021", as a small machine on a study desk by a window
 * from dusk into a rainy night, a kitten watching: a ball that walks the sill, steps down a stair of books as the drums come in, and sits nodding in
 * the headphones' cup until the drums leave and the cup lobs it back. This is the moving take, second to the still one
 * (`opus55-still.show.ts`), which leads the work; its label names who made it.
 */
export default defineShow({
  title: 'Soft Lamp',
  label: 'Opus 5.5',
  about: "Half an hour of Lofi Girl's lofi hip hop, as a Rube Goldberg machine on a study desk from dusk into a rainy night: a ball that walks the sill, steps down the books when the drums come in, and nods in the headphones, while the cat watches.",
  still: 99.9,
  async load() { return (await import('./lamp')).performance },
})

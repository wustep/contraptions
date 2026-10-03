import { defineShow } from '../../registry'

/**
 * Soft Lamp: half an hour of Lofi Girl's "Best of lofi hip hop 2021", as a small machine on a study desk by a rainy
 * window at night: a ball that walks the sill, steps down a stair of books as the drums come in, and sits nodding in
 * the headphones' cup until the drums leave and the cup lobs it back. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Soft Lamp',
  label: 'Opus 5.5',
  about: "Half an hour of Lofi Girl's lofi hip hop, as a Rube Goldberg machine on a study desk by a rainy window: a ball that walks the sill, steps down the books when the drums come in, and nods in the headphones.",
  still: 99.9,
  async load() { return (await import('./lamp')).performance },
})

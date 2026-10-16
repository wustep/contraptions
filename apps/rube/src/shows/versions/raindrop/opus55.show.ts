import { defineShow } from '../../registry'

/**
 * Raindrop: Chopin's "Raindrop" Prelude, finished at the charterhouse of Valldemossa in the winter of 1838, as a
 * machine the rain runs: from a jar under a monk's cell's eave down the garden, the cistern and the olive terraces
 * to the gate, where a lamp and a bell bring two people home up the road in the storm. Its one take is labelled by
 * who made it.
 */
export default defineShow({
  title: 'Raindrop',
  label: 'Opus 5.5',
  about: "Chopin's Raindrop Prelude as a Rube Goldberg machine the rain runs, on a stormy night at the charterhouse of Valldemossa where he finished it.",
  still: 172,
  async load() {
    return (await import('./charterhouse')).performance
  },
})

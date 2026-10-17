import { defineShow } from '../../registry'

/**
 * Quarter Turn: Bach's first Goldberg variation, played by a wooden toy. Five painted cubes tumble a quarter turn at a
 * time across planks that slide and turn over at the phrases, until every cube is home. Its one take is labelled by
 * who made it.
 */
export default defineShow({
  title: 'Quarter Turn',
  label: 'Opus 5.5',
  about: "Bach's first Goldberg variation as a wooden toy machine: painted cubes tumbling a quarter turn to the beat until every one is home.",
  still: 60,
  async load() {
    return (await import('./tumble')).performance
  },
})

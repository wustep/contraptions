import { defineShow } from '../../registry'

/**
 * Maker · after Dune: Part Two: Hans Zimmer's "Harkonnen Arena", from Denis Villeneuve's film, as a machine of sand and
 * a blue ball for its hero: the harvester taken in the deep desert, the thumper and the first ride, the black sun over
 * Giedi Prime's arena, and the charge out of the storm. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Maker',
  label: 'Opus 5.5',
  about: "Hans Zimmer's Harkonnen Arena, from Denis Villeneuve's Dune: Part Two, as a machine of sand with a blue ball for its hero: the harvester taken, the first worm ride, the black sun over the arena, and the charge out of the storm.",
  still: 91,
  async load() { return (await import('./maker')).performance },
})

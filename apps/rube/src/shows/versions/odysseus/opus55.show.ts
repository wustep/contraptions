import { defineShow } from '../../registry'

/**
 * Nostos · after The Odyssey: Ludwig Göransson's "Odysseus", from Christopher Nolan's film, as a Rube Goldberg machine
 * with a bronze ball for its hero: the fall of Troy, the long way home through the trials of the sea, seven years on
 * Ogygia, and Ithaca, the bow, the twelve axes, and Penelope. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Nostos',
  label: 'Opus 5.5',
  film: 'The Odyssey',
  about: "Ludwig Göransson's Odysseus, from Christopher Nolan's The Odyssey, as a Rube Goldberg machine with a bronze ball for its hero: from the fall of Troy, through the trials of the sea, home to the bow and Penelope.",
  still: 24,
  async load() { return (await import('./nostos')).performance },
})

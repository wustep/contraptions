import { defineShow } from '../../registry'

/**
 * Sleeper · after Dune: Hans Zimmer's "Paul's Dream", from Denis Villeneuve's film, as a Rube Goldberg machine with a
 * sea-green ball for its hero: a boy asleep on Caladan dreams of a desert and a girl in it, and wakes there. Its one
 * take is labelled by who made it.
 */
export default defineShow({
  title: 'Sleeper',
  label: 'Opus 5.5',
  about: "Hans Zimmer's Paul's Dream, from Denis Villeneuve's Dune, as a Rube Goldberg machine with a sea-green ball for its hero: asleep on Caladan he dreams of the desert, and wakes on Arrakis, from the Gom Jabbar to the first worm, the night of the Harkonnens, the storm, and Chani.",
  still: 40,
  async load() { return (await import('./sleeper')).performance },
})

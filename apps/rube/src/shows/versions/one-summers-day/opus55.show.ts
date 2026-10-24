import { defineShow } from '../../registry'

/**
 * Kohaku · after Spirited Away: Joe Hisaishi's "One Summer's Day", from Hayao Miyazaki's film, as a Rube Goldberg
 * machine with a rose ball for Chihiro: through the tunnel and over the river of stones at dusk, the bathhouse's night
 * and the river's spirit, the white dragon and the paper birds, the train over the water, and his name, given back to
 * him under the moon. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Kohaku',
  label: 'Opus 5.5',
  about: "Joe Hisaishi's One Summer's Day, from Hayao Miyazaki's Spirited Away, as a Rube Goldberg machine: the tunnel, the bathhouse at night, the train over the water, and the white dragon whose name she gives back.",
  still: 154.5,
  async load() { return (await import('./kohaku')).performance },
})

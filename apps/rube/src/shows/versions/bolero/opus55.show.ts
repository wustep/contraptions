import { defineShow } from '../../registry'

/**
 * Ostinato: Ravel's Boléro, whole, as one machine that grows with it: a tower of storeys on a side drum, a storey
 * for each turn of the tune. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Ostinato',
  label: 'Opus 5.5',
  about: "Ravel's Boléro as a Rube Goldberg machine: a tower that grows a storey for every turn of the tune, all of it standing on one snare drum.",
  still: 600,
  async load() {
    return (await import('./tower')).performance
  },
})

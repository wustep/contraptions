import { defineShow } from '../../registry'

export default defineShow({
  title: 'Caravan',
  label: 'Opus 5.5',
  about: "Caravan, the finale of Whiplash, as a Rube Goldberg machine: a drummer, a conductor, and a tempo that won't hold still.",
  still: 338.5,
  async load() { return (await import('./whiplash')).performance },
})

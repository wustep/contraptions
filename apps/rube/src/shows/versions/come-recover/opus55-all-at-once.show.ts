import { defineShow } from '../../registry'

export default defineShow({
  title: 'Everything',
  label: 'Opus 5.5',
  about: "Son Lux's Come Recover, from Everything Everywhere All at Once, as a Rube Goldberg machine that jumps between universes.",
  still: 243.5,
  async load() { return (await import('./all-at-once')).performance },
})

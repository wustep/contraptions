import { defineShow } from '../../registry'

/**
 * Windowlight: Ólafur Arnalds' Near Light, round a small machine on a winter windowsill at night, as a loop with no
 * seam. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Windowlight',
  label: 'Opus 5.5',
  about: "Ólafur Arnalds' Near Light, as a small machine on a winter windowsill that goes round by lamplight under the aurora, forever.",
  still: 172.4,
  async load() { return (await import('./windowlight')).performance },
})

import { defineShow } from '../../registry'

/**
 * Struck: Bach's Prelude in C, played by steel balls on the insides of instruments. Nothing is recorded: every note
 * is a physical model sounding at the moment a ball lands on a tine, a hammer or a bellows, or carries a bow across a
 * cello. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Struck',
  label: 'Fable 5.2',
  about: 'Bach’s Prelude in C, played by steel balls on tines, hammers, pipes and a bow: every note is a physical model sounding at the moment of contact.',
  still: 96,
  async load() {
    return (await import('./works')).load()
  },
})

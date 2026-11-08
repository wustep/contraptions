import { defineShow } from '../../registry'

/**
 * Orchestrion: a show whose physics is its soundtrack. Balls fall through an instrument of tuned bars, harp strings and
 * brass pipes, and every collision, pluck and breath of air is synthesized from the simulation as it happens; there is
 * no recording. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Orchestrion',
  label: 'Opus 5.5',
  about: 'A machine that plays itself: balls fall through tuned bars, harp strings and brass pipes, and every sound is synthesized from the physics.',
  still: 92.4,
  async load() {
    return (await import('./instrument')).load()
  },
})

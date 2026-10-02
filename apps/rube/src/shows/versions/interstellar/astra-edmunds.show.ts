import { defineShow } from '../../registry'

/** Direction 05: a standalone redesign cloned from opus55. No score or cast rewrite. */
export default defineShow({
  title: 'Voyage',
  label: 'The Small Light',
  about: "The Weight of Light · Edmunds. A voyage through wood, enamel, and stone, ending with two lives in one small pool of light. Redesign study.",
  still: 258.8,
  async load() { return (await import('./edmunds')).performance },
})

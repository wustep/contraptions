import { defineShow } from '../../registry'

/**
 * Amber: John Williams's Theme from Jurassic Park, as a Rube Goldberg machine that finds a bone in the dust and a
 * giant in the valley.
 */
export default defineShow({
  title: 'Amber',
  label: 'Grok 4.7',
  about: "John Williams's Theme from Jurassic Park, after Jurassic Park, as a Rube Goldberg machine that finds a bone in the dust and a giant in the valley.",
  still: 124,
  async load() {
    return (await import('./amber')).performance
  },
})

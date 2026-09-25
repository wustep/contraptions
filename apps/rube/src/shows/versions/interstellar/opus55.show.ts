import { defineShow } from '../../registry'

/**
 * Interstellar: two cues from Hans Zimmer's score (Cornfield Chase, then No Time for Caution) as one show. Its own
 * work, not a take of Cornfield Chase, since it is both. The take is the work: no subtitle (the page shows the title
 * alone when the label repeats it).
 */
export default defineShow({
  title: 'Interstellar',
  label: 'Interstellar',
  director: { name: 'wustep', href: 'https://x.com/wustep' },
  async load() { return (await import('./liftoff')).performance },
})

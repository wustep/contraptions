import { defineShow } from '../../registry'

/**
 * Voyage: two cues from Hans Zimmer's score (Cornfield Chase, then No Time for Caution) as one show. Its own
 * work, not a take of Cornfield Chase, since it is both. The take is the work: no subtitle (the page shows the title
 * alone when the label repeats it).
 */
export default defineShow({
  title: 'Voyage',
  label: 'Voyage',
  about: "Hans Zimmer's Cornfield Chase, then No Time for Caution, from Interstellar, as one Rube Goldberg machine that leaves the farm for space.",
  still: 240.4,
  async load() { return (await import('./liftoff')).performance },
})

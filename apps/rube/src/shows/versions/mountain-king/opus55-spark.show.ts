import { defineShow } from '../../registry'

/**
 * Mountain King, the second take: a candle's flame slips off its wick while the cat sleeps, and every fire is a door.
 * Its one word is its hero.
 */
export default defineShow({
  title: 'Mountain King',
  label: 'Spark',
  about: "Grieg's In the Hall of the Mountain King as a Rube Goldberg machine: a candle's flame slips out through the fire, runs away across four worlds, and makes it home by the last chord.",
  still: 131,
  async load() {
    return (await import('./spark')).performance
  },
})

import { defineShow } from '../../registry'

/**
 * Rally · after Marty Supreme: Tears for Fears' "Everybody Wants to Rule the World", the song the film ends on, as a
 * Rube Goldberg machine with a table-tennis ball for its hero: Marty Mauser from his uncle's shoe store on the Lower
 * East Side to London, a hotel tub through a floor, a bowling alley, a night in New Jersey, Tokyo, and the nursery's
 * glass. Its one take is labelled by who made it.
 */
export default defineShow({
  title: 'Rally',
  label: 'Opus 5.5',
  about: "Tears for Fears' Everybody Wants to Rule the World, the song Marty Supreme ends on, as a Rube Goldberg machine with a table-tennis ball for its hero.",
  still: 189.8,
  async load() { return (await import('./rally')).performance },
})

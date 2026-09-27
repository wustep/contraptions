import { defineShow } from '../../registry'

/**
 * Kick: Hans Zimmer's "Time", the last cue of Inception, as a Rube Goldberg machine that goes down through four dreams,
 * one under the other, and is kicked back up through all of them.
 */
export default defineShow({
  title: 'Kick',
  label: 'Opus 5.5',
  about: "Hans Zimmer's Time, after Inception, as a Rube Goldberg machine that goes down four dreams deep and is kicked back up through all of them.",
  still: 186.0,
  async load() { return (await import('./kick')).performance },
})
